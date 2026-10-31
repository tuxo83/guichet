/* GUICHET RELAY for Node.js (protocol v1, see the engine's PROTOCOL.md). Mounted in a website: the
 * site says who the visitor is; the relay keeps one thread per person, queues their questions for
 * the engine (which polls it, from wherever it runs), and hands back the answers. The browser talks
 * only to the relay; the engine only to the relay. No dependency.
 *
 *   import { guichetRelay } from 'guichet-relay';
 *   const relay = guichetRelay({ token: process.env.GUICHET_TOKEN, identify: (req) => req.user ? { id: req.user.id, name: req.user.name } : null });
 *   app.use('/guichet', relay.handler);              // Express, or any (req, res, next) server
 *   // or: http.createServer((req, res) => relay.handle(req, res, '/guichet') || notFound(res));
 *
 * Options: token (required), identify(req) → { id, name } | null, dir (where threads are kept as
 * JSON, in memory otherwise), perHour (30), maxText (2000), historyKept (50), historySent (6),
 * answerMs (180 000), journal(line) (what was asked: who, when, how long -- not the text). */
import { readFileSync, writeFileSync, mkdirSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID, timingSafeEqual, createHash } from 'node:crypto';

const POLL_MS = 25_000;
const OPEN_MS = 60_000;

export function guichetRelay({ token, identify, dir = null, perHour = 30, maxText = 2000, historyKept = 50, historySent = 6, answerMs = 180_000, journal = () => {}, now = () => Date.now() } = {}) {
    if (!token || String(token).length < 24) throw new Error('guichet-relay: a token of 24 characters at least is needed');
    if (typeof identify !== 'function') throw new Error('guichet-relay: identify(req) is needed (who is the visitor?)');
    const tokenHash = createHash('sha256').update(String(token)).digest();
    const threads = new Map();   // person id -> { messages: [], asked: [timestamps] }
    const queue = [];            // { id, thread, text, history, at, takenAt }
    const waiting = new Map();   // question id -> { thread, at }
    let lastPoll = 0;
    const pollers = new Set();

    /* ---------- threads, kept in memory and, with `dir`, on disk ---------- */
    const fileOf = (who) => join(dir, `${createHash('sha256').update(String(who)).digest('hex').slice(0, 32)}.json`);
    const threadOf = (who) => {
        if (threads.has(who)) return threads.get(who);
        let t = { messages: [], asked: [] };
        if (dir) { try { t = JSON.parse(readFileSync(fileOf(who), 'utf8')); } catch { /* new */ } }
        threads.set(who, t);
        return t;
    };
    const keep = (who) => {
        if (!dir) return;
        try { mkdirSync(dir, { recursive: true }); const f = fileOf(who); writeFileSync(`${f}.tmp`, JSON.stringify(threads.get(who))); renameSync(`${f}.tmp`, f); } catch { /* kept in memory */ }
    };
    const add = (who, m) => { const t = threadOf(who); t.messages.push(m); t.messages = t.messages.slice(-historyKept * 2); keep(who); return m; };
    const isOpen = () => now() - lastPoll < OPEN_MS;
    /* The protocol's quota: one limit here, per person over the last hour (a sliding hour: the oldest question leaving it frees one). */
    const quotaOf = (t) => {
        const asked = (t.asked ?? []).filter((x) => now() - x < 3_600_000);
        return { used: asked.length, max: perHour, what: 'questions', window: 'hour', scope: 'account', retryAt: asked.length >= perHour ? new Date(Math.min(...asked) + 3_600_000).toISOString() : null };
    };

    /* A question unanswered too long: said so, and dropped. One taken but not answered goes back. */
    const sweep = () => {
        for (const [id, w] of waiting) {
            if (now() - w.at > answerMs) {
                waiting.delete(id);
                const i = queue.findIndex((q) => q.id === id); if (i >= 0) queue.splice(i, 1);
                add(w.thread, { id: randomUUID(), at: new Date(now()).toISOString(), from: 'agent', kind: 'say', text: 'Le Guichet n\'a pas pu répondre à temps. Réessayez.' });
                journal({ at: new Date(now()).toISOString(), who: w.thread, question: id, outcome: 'timeout' });
            }
        }
        for (const q of queue) if (q.takenAt && now() - q.takenAt > answerMs) q.takenAt = 0;
    };
    const wake = () => { for (const f of [...pollers]) f(); };

    /* ---------- HTTP ---------- */
    const send = (res, code, body) => { res.statusCode = code; res.setHeader('content-type', 'application/json; charset=utf-8'); res.setHeader('cache-control', 'no-store'); res.end(JSON.stringify(body)); };
    const bodyOf = (req) => new Promise((resolve) => {
        if (req.body && typeof req.body === 'object') return resolve(req.body);
        let raw = ''; req.on('data', (c) => { raw += c; if (raw.length > 64 * 1024) req.destroy(); });
        req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { resolve(null); } });
    });
    const engineOk = (req) => {
        /* Some hosts drop Authorization on the way: X-Guichet-Token says the same. */
        const m = /^Bearer\s+(.+)$/i.exec(String(req.headers?.authorization ?? ''));
        const given = m ? m[1] : String(req.headers?.['x-guichet-token'] ?? '');
        return Boolean(given.trim()) && timingSafeEqual(createHash('sha256').update(given.trim()).digest(), tokenHash);
    };

    async function handle(req, res, base = '') {
        let path = String(req.url ?? '').split('?')[0];
        if (base) { if (!path.startsWith(`${base}/`)) return false; path = path.slice(base.length); }
        sweep();
        /* The engine's side. */
        if (path.startsWith('/engine/')) {
            if (req.method !== 'POST') return send(res, 405, { error: 'POST only' }), true;
            if (!engineOk(req)) return send(res, 401, { error: 'not the engine' }), true;
            const body = await bodyOf(req);
            if (!body) return send(res, 400, { error: 'not JSON' }), true;
            if (path === '/engine/poll') {
                lastPoll = now();
                const take = () => { const ready = queue.filter((q) => !q.takenAt); for (const q of ready) q.takenAt = now(); return ready.map(({ id, thread, text, history }) => ({ id, thread, text, history })); };
                let got = take();
                if (!got.length) {
                    await new Promise((resolve) => { const done = () => { pollers.delete(done); clearTimeout(t); resolve(); }; const t = setTimeout(done, POLL_MS); pollers.add(done); });
                    lastPoll = now(); got = take();
                }
                return send(res, 200, { questions: got }), true;
            }
            const w = waiting.get(String(body.id ?? ''));
            if (!w) return send(res, 404, { error: 'no such question waiting' }), true;
            if (path === '/engine/doing') { w.doing = String(body.text ?? '').slice(0, 200); w.doingAt = now(); return send(res, 200, { ok: true }), true; }
            if (path === '/engine/answer') {
                waiting.delete(String(body.id));
                const i = queue.findIndex((q) => q.id === body.id); if (i >= 0) queue.splice(i, 1);
                /* The sources kept on the message, and said in a last line when the text does not name them (as the PHP relay). */
                const sources = (Array.isArray(body.sources) ? body.sources : []).filter((x) => ['string', 'number'].includes(typeof x)).slice(0, 20).map((x) => String(x).slice(0, 200));
                let text = String(body.text ?? '').slice(0, 20_000);
                if (sources.length && !/\bsources?\s*:/iu.test(text)) text += `\n\nSources : ${sources.map((x) => `\`${x.replaceAll('`', "'")}\``).join(' · ')}`;
                add(w.thread, { id: randomUUID(), at: new Date(now()).toISOString(), from: 'agent', kind: 'say', text, sources });
                journal({ at: new Date(now()).toISOString(), who: w.thread, question: body.id, outcome: 'answered', ms: now() - w.at });
                return send(res, 200, { ok: true }), true;
            }
            return send(res, 404, { error: 'unknown' }), true;
        }
        /* The browser's side: the site's own session says who it is. */
        if (path === '/messages' || path === '/say') {
            let who;
            try { who = await identify(req); } catch { who = null; }
            if (!who || !who.id) return send(res, 401, { error: 'sign in first' }), true;
            const id = String(who.id);
            if (path === '/messages') {
                if (req.method !== 'GET') return send(res, 405, { error: 'GET only' }), true;
                const t = threadOf(id);
                const busy = [...waiting.values()].find((w) => w.thread === id);
                /* Parley's shape (what parley-host's read() gives): the messages, the steps, the state. */
                const at = busy ? new Date(busy.doingAt ?? busy.at).toISOString() : t.messages.at(-1)?.at ?? new Date(now()).toISOString();
                return send(res, 200, {
                    open: isOpen(),
                    messages: t.messages,
                    steps: busy?.doing ? [{ id: `doing:${busy.doingAt}`, kind: 'doing', note: busy.doing, at }] : [],
                    status: busy ? { state: 'working', note: busy.doing || '', at } : { state: 'waiting', note: '', at },
                    quota: quotaOf(t),
                }), true;
            }
            if (req.method !== 'POST') return send(res, 405, { error: 'POST only' }), true;
            if (!isOpen()) return send(res, 503, { error: 'the guichet is closed' }), true;
            const body = await bodyOf(req);
            const text = String(body?.text ?? '').trim();
            if (!text) return send(res, 400, { error: 'empty' }), true;
            if (text.length > maxText) return send(res, 400, { error: `${maxText} characters at most` }), true;
            const t = threadOf(id);
            t.asked = (t.asked ?? []).filter((x) => now() - x < 3_600_000);
            if (t.asked.length >= perHour) return send(res, 429, { error: `${perHour} questions per hour at most`, ...quotaOf(t) }), true;
            if ([...waiting.values()].some((w) => w.thread === id)) return send(res, 429, { error: 'one question at a time' }), true;
            t.asked.push(now());
            const pairs = []; const msgs = t.messages.filter((m) => m.kind === 'say');
            for (let i = 0; i < msgs.length - 1; i++) if (msgs[i].from === 'person' && msgs[i + 1].from === 'agent') pairs.push({ q: msgs[i].text, a: msgs[i + 1].text });
            const q = add(id, { id: randomUUID(), at: new Date(now()).toISOString(), from: 'person', kind: 'say', text });
            queue.push({ id: q.id, thread: id, text, history: pairs.slice(-historySent), at: now(), takenAt: 0 });
            waiting.set(q.id, { thread: id, at: now(), doing: '' });
            journal({ at: q.at, who: id, question: q.id, outcome: 'asked' });
            wake();
            return send(res, 200, { ok: true, id: q.id }), true;
        }
        return false;
    }
    return {
        handle,
        /* Express-style middleware, mounted at its base path. */
        handler: (req, res, next) => { handle(req, res, '').then((done) => { if (!done) next?.(); }, (e) => next?.(e)); },
        isOpen,
        close() { wake(); },
    };
}
