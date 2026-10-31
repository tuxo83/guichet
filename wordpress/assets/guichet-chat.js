/* The chat of a guichet on the site: Parley's display (assets/parley/), its load() and send() wired to
 * the plugin's REST routes, and around it what the mockup shows: open or closed, "8 / 30 this hour",
 * the line that says when the next question is possible. Every box with data-guichet is one chat. */
import { mount } from './parley/parley-ui.js';

const fill = (s, ...v) => String(s).replace(/%(\d)\$s/g, (_, i) => String(v[i - 1] ?? ''));

for (const box of document.querySelectorAll('.guichet[data-guichet]')) start(box).catch((e) => console.error('guichet', e));

async function start(box) {
    const c = JSON.parse(box.dataset.guichet);
    const t = c.t;
    const words = { ...(await fetch(`${c.parley}/texts/${c.words}.json`).then((r) => r.json()).catch(() => ({}))), placeholder: t.placeholder };
    const headers = c.nonce ? { 'X-WP-Nonce': c.nonce } : {};
    const pill = box.querySelector('.guichet-pill');
    const count = box.querySelector('.guichet-count');
    const chat = box.querySelector('.guichet-chat');
    /* What the relay last said: open or not, the quota; a refusal (429) until its retryAt. */
    let open = null; let quota = null; let refused = null; let since = new Date().toISOString();
    const at = (iso) => {
        const d = new Date(iso); const today = d.toDateString() === new Date().toDateString();
        return d.toLocaleString(c.locale, today ? { hour: '2-digit', minute: '2-digit' } : { weekday: 'long', hour: '2-digit', minute: '2-digit' });
    };
    const limit = () => {
        const q = refused && Date.parse(refused.retryAt) > Date.now() ? refused : quota?.retryAt && Date.parse(quota.retryAt) > Date.now() ? quota : null;
        if (!q) return null;
        const first = q.scope === 'total' ? t.limitTotal : q.what === 'chars' ? t.limitChars : fill(q.window === 'day' ? t.limitDay : t.limitHour, q.used);
        return `${first} ${fill(t.next, at(q.retryAt))}`;
    };
    /* The state around the chat, drawn again at each look. */
    const paint = () => {
        const blocked = open === false ? 'closed' : limit() ? 'limit' : '';
        if (pill) {
            pill.dataset.state = open === false ? 'closed' : blocked ? 'limit' : 'open';
            pill.lastElementChild.textContent = open === false ? t.closed : t.open;
        }
        if (count) count.textContent = quota ? fill(quota.window === 'day' ? t.countDay : t.countHour, quota.used, quota.max) : '';
        const input = chat.querySelector('.parley-box');
        if (input) {
            input.disabled = Boolean(blocked);
            input.placeholder = blocked === 'closed' ? t.closedBox : blocked === 'limit' ? t.limitBox : t.placeholder;
        }
        box.dataset.blocked = blocked;
    };
    /* Closed, or a limit reached: said in the thread as one of the application's lines, at the end. */
    const lines = () => {
        const text = open === false ? t.closedLine : limit();
        if (!text) { since = new Date().toISOString(); return []; }
        return [{ from: 'system', id: `guichet-${open === false ? 'closed' : 'limit'}`, at: since, level: 'needs-you', tone: 'warn', text }];
    };
    mount(chat, {
        words, locale: c.locale, agentName: c.name, markdown: true, math: false, back: false, every: 3000, draft: `guichet:${c.rest}`,
        async load() {
            const r = await fetch(`${c.rest}/messages`, { credentials: 'same-origin', headers });
            if (r.status === 401) throw new Error(t.signIn);
            if (!r.ok) throw new Error(`${r.status}`);
            const d = await r.json();
            open = d.open; quota = d.quota ?? null;
            queueMicrotask(paint);
            return { ...d, messages: [...d.messages, ...lines()] };
        },
        async send(text) {
            if (text.length > c.max) throw new Error(fill(t.tooLong, c.max));
            const r = await fetch(`${c.rest}/say`, { method: 'POST', credentials: 'same-origin', headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify({ text }) });
            const b = await r.json().catch(() => ({}));
            if (b.quota) quota = b.quota;
            if (r.status === 429 && b.retryAt) { refused = b; paint(); throw new Error(limit()); }
            if (r.status === 429) throw new Error(t.oneAtATime);
            if (r.status === 503) { open = false; paint(); throw new Error(t.closedNow); }
            if (!r.ok) throw new Error(b.message || b.error || `${r.status}`);
            paint();
        },
    });
    paint();
}
