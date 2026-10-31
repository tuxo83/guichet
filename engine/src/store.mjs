/* THE INDEX ON DISK: each document's passages and their vectors, kept between runs so that only
 * what changed is read and embedded again (embedding a whole folder costs time and money).
 *
 * One JSON file per documents folder, in GUICHET_INDEX (never inside the documents): per file its
 * name, size, mtime, SHA-256, passages (secrets already masked: nothing unmasked is ever stored nor
 * embedded) and their vectors (Float32, base64), with the embedding model's name. A file whose size
 * and mtime did not change is not read again; one whose bytes did not change is not embedded again;
 * another embedding model, or another passage size, starts over. Written to a temporary file then
 * renamed, so a crash never leaves half an index.
 *
 * Without embeddings nothing is stored: reading text files again is quick, and words are all the
 * search has then. While an update runs, questions are answered from what is ready (`status()`). */
import { readFileSync, writeFileSync, renameSync, mkdirSync, watch } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve, relative, isAbsolute } from 'node:path';
import { listFiles, readDoc, split, counted, indexOf, unit, PASSAGE } from './core.mjs';

const FORMAT = 1;
const SAVE_MS = 30_000;      /* during a long first build, saved at least this often */
const LOG_MS = 5_000;        /* progress in the log at most this often */
const BATCH = 32;            /* passages gathered across small files before asking for vectors */
const tick = () => new Promise((r) => setImmediate(r));
const toB64 = (vecs) => { const dims = vecs[0]?.length ?? 0; const f = new Float32Array(vecs.length * dims); vecs.forEach((v, i) => f.set(v, i * dims)); return Buffer.from(f.buffer).toString('base64'); };
const fromB64 = (b64, n) => {
    const b = Buffer.from(b64, 'base64'); const f = new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.length));
    const dims = n ? f.length / n : 0;
    return Number.isInteger(dims) && dims > 0 ? Array.from({ length: n }, (_, i) => f.subarray(i * dims, (i + 1) * dims)) : null;
};

/* The index of `docs`. `dir`: where it is kept; `embedder`: { model, embed } or null (words only). */
export function openIndex({ docs, dir = null, embedder = null, log = () => {} }) {
    const root = resolve(docs);
    if (dir && embedder) {
        const rel = relative(root, resolve(dir));
        if (!rel || (!rel.startsWith('..') && !isAbsolute(rel))) throw new Error('GUICHET_INDEX must not be inside GUICHET_DOCS (the index would be read as a document)');
    }
    const model = embedder?.model ?? null;
    const file = embedder && dir ? join(resolve(dir), `${createHash('sha256').update(root).digest('hex').slice(0, 16)}.json`) : null;
    const files = new Map();   /* name -> { name, size, mtime, sha256, model, passages } */
    let view = null; let progress = null; let running = null; let again = false; let savedAt = 0; let loggedAt = 0;

    /* What was kept: vectors reused only when made by the same model with the same passage size. */
    if (file) {
        try {
            const kept = JSON.parse(readFileSync(file, 'utf8'));
            if (kept.format === FORMAT && kept.passage === PASSAGE && kept.docs === root) {
                for (const f of kept.files ?? []) {
                    const passages = (f.passages ?? []).map((body) => counted({ name: f.name, body, vec: null }));
                    const vecs = f.model === model && f.vectors ? fromB64(f.vectors, passages.length) : null;
                    if (vecs) passages.forEach((p, i) => { p.vec = vecs[i]; });
                    files.set(f.name, { name: f.name, size: f.size, mtime: f.mtime, sha256: f.sha256, model: vecs ? model : null, passages });
                }
                log(`index: ${files.size} documents kept in ${file}${kept.model !== model ? ` (made with ${kept.model}: embedded again with ${model})` : ''}`);
            }
        } catch { /* none yet, or unreadable: built again */ }
    }
    function save() {
        if (!file) return;
        try {
            mkdirSync(resolve(dir), { recursive: true, mode: 0o700 });
            const out = { format: FORMAT, docs: root, model, passage: PASSAGE, files: [...files.values()].map((e) => ({ name: e.name, size: e.size, mtime: e.mtime, sha256: e.sha256, model: e.model,
                passages: e.passages.map((p) => p.body), vectors: e.model && e.passages.length && e.passages.every((p) => p.vec) ? toB64(e.passages.map((p) => p.vec)) : null })) };
            writeFileSync(`${file}.tmp`, JSON.stringify(out), { mode: 0o600 });
            renameSync(`${file}.tmp`, file);
            savedAt = Date.now();
        } catch (e) { log(`index: not saved (${e.message})`); }
    }

    /* One update: removed files dropped, new and changed ones read, split and embedded. */
    async function run() {
        const t0 = Date.now();
        const seen = listFiles(root, { note: log });
        const names = new Set(seen.map((f) => f.name));
        let removed = 0;
        for (const n of [...files.keys()]) if (!names.has(n)) { files.delete(n); removed++; }
        const ready = (e) => e && e.model === model;
        const todo = seen.filter((f) => { const e = files.get(f.name); return !(ready(e) && e.size === f.size && e.mtime === f.mtime); });
        if (removed) view = null;
        if (!todo.length) { if (removed) { save(); log(`index: ${removed} removed`); } return; }
        progress = { done: 0, total: todo.length };
        let pending = []; let embedded = 0; let failed = false; let read = 0;
        let said = '';
        const say = (force) => { const t = `indexing: ${progress.done}/${progress.total} files`; if (t !== said && (force || Date.now() - loggedAt > LOG_MS)) { loggedAt = Date.now(); said = t; log(t); } };
        const flush = async () => {
            const ps = pending.flatMap((e) => e.passages);
            if (ps.length && !failed) {
                try {
                    const v = await embedder.embed(ps.map((p) => `${p.name}\n${p.body}`));
                    ps.forEach((p, i) => { p.vec = unit(v[i]); });
                    for (const e of pending) e.model = model;
                    embedded += pending.length;
                } catch (e) { failed = true; log(`index: embeddings failed (${e.message}); by words for now, tried again at the next update`); }
            }
            progress.done += pending.length; pending = []; view = null;
            if (Date.now() - savedAt > SAVE_MS) save();
            say(false);
        };
        for (const f of todo) {
            const old = files.get(f.name);
            const d = readDoc(f.path);
            if (!d) { if (old) { files.delete(f.name); view = null; } progress.done++; continue; }
            /* Touched but the same bytes, vectors from this model: only the stat changes. */
            if (ready(old) && old.sha256 === d.sha256) { Object.assign(old, { size: f.size, mtime: f.mtime }); progress.done++; continue; }
            const e = { name: f.name, size: f.size, mtime: f.mtime, sha256: d.sha256, model: embedder ? null : model, passages: split(f.name, d.text) };
            files.set(f.name, e); view = null; read++;
            if (!embedder) { progress.done++; continue; }
            pending.push(e);
            if (pending.reduce((n, x) => n + x.passages.length, 0) >= BATCH) await flush();
            else await tick();   /* let a question through between files */
        }
        if (pending.length) await flush();
        save();
        const all = indexOf([...files.values()].flatMap((e) => e.passages));
        say(true);
        log(`index: ${all.list.length} passages from ${files.size} documents in ${root}; ${read} read${embedder ? `, ${embedded} embedded (${model})` : ''}, ${removed} removed, ${((Date.now() - t0) / 1000).toFixed(1)} s`);
        progress = null;
    }

    let timer = null; let watcher = null;
    const index = {
        file,
        /* The searchable whole, as it stands (rebuilt only after a change). */
        snapshot: () => (view ??= indexOf([...files.values()].flatMap((e) => e.passages))),
        /* { done, total } while an update runs, null otherwise. */
        status: () => (progress && progress.done < progress.total ? { ...progress } : null),
        /* One update at a time; a call during one asks for another right after it (a change may
           have come after its scan), and waits for both. */
        refresh() {
            if (running) { again = true; return running; }
            running = (async () => { do { again = false; await run().catch((e) => log(`index: ${e.message}`)); } while (again); })().finally(() => { running = null; progress = null; });
            return running;
        },
        /* Updates every `every` ms, and soon after a change in the folder when the system tells. */
        start(every = 3 * 60_000) {
            index.refresh();
            timer = setInterval(() => index.refresh(), every); timer.unref?.();
            let soon = null;
            try {
                watcher = watch(root, { recursive: true }, () => { clearTimeout(soon); soon = setTimeout(() => index.refresh(), 3000); soon.unref?.(); });
                watcher.on('error', () => {}); watcher.unref?.();
            } catch { /* the timer alone */ }
            return index;
        },
        stop() { clearInterval(timer); watcher?.close(); },
    };
    return index;
}
