#!/usr/bin/env node
/* THE GUICHET ENGINE. It answers questions from its documents, with a model that has no tool, and
 * can do nothing else. Two ways to reach it:
 *
 *   guichet --relay https://intranet.example/guichet     answers the questions a relay queues
 *                                                       (GUICHET_TOKEN shared with the relay)
 *   guichet --parley /work/.parley                       answers in a Clavarium conversation's chat
 *
 * Environment: GUICHET_DOCS (the documents, /work/guichet by default), GUICHET_PROVIDER,
 * GUICHET_MODEL, GUICHET_API_KEY, GUICHET_BASE_URL, GUICHET_EMBED_* (see src/providers.mjs),
 * GUICHET_INDEX (see src/store.mjs), GUICHET_LANG (fr|en), GUICHET_TONE (a writing style; a relay
 * may send its own with each question), GUICHET_TOKEN (relay mode). */
import { readFileSync, writeFileSync, appendFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { answer, HISTORY } from '../src/core.mjs';
import { provider, embedder } from '../src/providers.mjs';
import { openIndex } from '../src/store.mjs';

export const VERSION = '0.2.0';
const env = process.env;
const arg = (name) => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : undefined; };
const DOCS = arg('--docs') || env.GUICHET_DOCS || '/work/guichet';
const LANG = (env.GUICHET_LANG || 'fr').toLowerCase().startsWith('en') ? 'en' : 'fr';
const TONE = env.GUICHET_TONE || '';
const STATE = env.GUICHET_STATE || join(env.HOME || '/tmp', '.guichet-state.json');
const INDEX = env.GUICHET_INDEX || join(dirname(STATE), '.guichet-index');
const REINDEX_MS = 3 * 60_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* The documents' index, updated in the background from the start: questions are answered from
   what is ready meanwhile. The function returned gives what answer() needs besides the question. */
function library(model) {
    let emb = null;
    try { emb = embedder(env); } catch (e) { console.error(`embeddings: ${e.message}`); }
    console.log(emb ? `Search by words and meaning (${emb.name}), index in ${INDEX}`
        : `Search by words only: no embedding model (GUICHET_EMBED_MODEL${String(env.GUICHET_PROVIDER || 'anthropic') === 'anthropic' ? '; Anthropic has no embeddings API' : ''})`);
    const store = openIndex({ docs: DOCS, dir: INDEX, embedder: emb, log: (t) => console.log(t) }).start(REINDEX_MS);
    return (tone) => ({ index: store.snapshot(), indexing: store.status(), embed: emb?.embed, ask: model.ask, lang: LANG, tone: tone || TONE });
}

/* ---------- relay mode: poll, answer, say where it is ---------- */
async function relayMode(base, model) {
    const token = String(env.GUICHET_TOKEN || '').trim();
    if (!token) throw new Error('GUICHET_TOKEN is missing (relay mode)');
    const url = (p) => `${base.replace(/\/+$/, '')}/engine/${p}`;
    /* The token goes twice: some hosts (Apache + PHP-FPM, WordPress security plugins) drop or take
       over Authorization before the relay sees it; X-Guichet-Token reaches it anyway. */
    const call = async (p, body) => {
        const r = await fetch(url(p), { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}`, 'x-guichet-token': token }, body: JSON.stringify(body) });
        if (r.status === 401) throw new Error('the relay refused the token');
        if (!r.ok) throw new Error(`the relay answered ${r.status}`);
        return r.json();
    };
    console.log(`Guichet ${VERSION} — ${model.name} — relay ${base}`);
    const lib = library(model);
    let backoff = 1000;
    for (;;) {
        let got;
        try { got = await call('poll', { engine: 'guichet', version: VERSION }); backoff = 1000; }
        catch (e) { console.error(`poll: ${e.message}`); await sleep(backoff); backoff = Math.min(backoff * 2, 60_000); continue; }
        for (const q of got.questions ?? []) {
            /* A relay may send the guichet's own tone with each question: it wins over GUICHET_TONE. */
            const r = await answer({ ...lib(typeof q.tone === 'string' ? q.tone.trim() : ''), question: String(q.text ?? ''), history: Array.isArray(q.history) ? q.history.slice(-HISTORY) : [],
                doing: (text) => call('doing', { id: q.id, text }).catch(() => {}) });
            await call('answer', { id: q.id, text: r.text, sources: r.sources }).catch((e) => console.error(`answer: ${e.message}`));
        }
    }
}

/* ---------- Clavarium chat mode: the conversation's own thread is its memory ---------- */
async function parleyMode(dir, model) {
    const lines = (f) => { try { return readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean); } catch { return []; } };
    const post = (entry) => { mkdirSync(dir, { recursive: true }); appendFileSync(join(dir, 'from-agent.jsonl'), `${JSON.stringify({ id: randomUUID(), at: new Date().toISOString(), ...entry })}\n`); };
    const seen = () => { try { return JSON.parse(readFileSync(STATE, 'utf8')).seen ?? null; } catch { return null; } };
    const keep = (id) => { try { mkdirSync(dirname(STATE), { recursive: true }); writeFileSync(STATE, JSON.stringify({ seen: id })); } catch { /* asked again */ } };
    console.log(`Guichet ${VERSION} — ${model.name} — chat ${dir}`);
    const lib = library(model);
    post({ kind: 'status', state: 'waiting', text: LANG === 'en' ? 'The Guichet waits for your questions' : 'Le Guichet attend vos questions' });
    for (;;) {
        const inbox = lines(join(dir, 'to-agent.jsonl')).filter((m) => typeof m.text === 'string' && m.text.trim());
        const last = seen();
        const start = last ? inbox.findIndex((m) => m.id === last) + 1 : Math.max(0, inbox.length - 1);
        const fresh = inbox.slice(start);
        if (fresh.length) {
            const said = lines(join(dir, 'from-agent.jsonl')).filter((m) => m.kind === 'say');
            const asked = inbox.slice(0, start);
            const history = asked.slice(-HISTORY).map((q, i) => ({ q: q.text, a: said[said.length - Math.min(HISTORY, asked.length) + i]?.text ?? '' }));
            for (const m of fresh) {
                const r = await answer({ ...lib(), question: m.text, history, doing: (text) => post({ kind: 'doing', text }) });
                const files = Array.isArray(m.files) && m.files.length ? (LANG === 'en' ? '\n\n(Attached files are not read by the Guichet.)' : '\n\n(Les fichiers joints ne sont pas lus par le Guichet.)') : '';
                post({ kind: 'say', text: `${r.text}${files}` });
                history.push({ q: m.text, a: r.text });
                keep(m.id);
            }
            post({ kind: 'status', state: 'waiting', text: LANG === 'en' ? 'The Guichet waits for your questions' : 'Le Guichet attend vos questions' });
        }
        await sleep(2000);
    }
}

async function main() {
    if (process.argv.includes('--version')) { console.log(VERSION); return; }
    let model;
    try { model = provider(env); } catch (e) { console.error(`Guichet: ${e.message}`); process.exit(2); }
    const relay = arg('--relay') || env.GUICHET_RELAY;
    if (relay) return relayMode(relay, model);
    return parleyMode(arg('--parley') || env.PARLEY_DIR || '/work/.parley', model);
}
if (process.argv[1] && /guichet(\.mjs)?$/.test(process.argv[1])) main().catch((e) => { console.error(`Guichet: ${e.message}`); process.exit(1); });
