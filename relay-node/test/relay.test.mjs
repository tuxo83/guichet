import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { guichetRelay } from '../index.mjs';

const TOKEN = 'a-long-test-token-of-the-engine-0123456789';
async function site(opts = {}) {
    let clock = Date.now();
    const relay = guichetRelay({ token: TOKEN, identify: (req) => (req.headers['x-who'] ? { id: req.headers['x-who'] } : null), now: () => clock, ...opts });
    const server = createServer(async (req, res) => { if (!(await relay.handle(req, res, '/guichet'))) { res.statusCode = 404; res.end(); } });
    await new Promise((r) => server.listen(0, '127.0.0.1', r));
    const base = `http://127.0.0.1:${server.address().port}/guichet`;
    const call = async (path, { who, body, token, method } = {}) => {
        const r = await fetch(`${base}${path}`, { method: method ?? (body ? 'POST' : 'GET'), headers: { 'content-type': 'application/json', ...(who ? { 'x-who': who } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
        return { status: r.status, body: await r.json().catch(() => null) };
    };
    return { call, tick: (ms) => { clock += ms; }, close: () => { relay.close(); server.close(); } };
}

test('refuses a short token or no identify', () => {
    assert.throws(() => guichetRelay({ token: 'short', identify: () => null }));
    assert.throws(() => guichetRelay({ token: TOKEN }));
});

test('closed until an engine polls; the engine needs the token', async () => {
    const s = await site();
    try {
        assert.equal((await s.call('/messages')).status, 401);
        assert.equal((await s.call('/messages', { who: 'ana' })).body.open, false);
        assert.equal((await s.call('/say', { who: 'ana', body: { text: 'hello' } })).status, 503);
        assert.equal((await s.call('/engine/poll', { body: {}, token: 'wrong-token-wrong-token-wrong' })).status, 401);
        assert.equal((await s.call('/engine/poll', { body: {} })).status, 401);
    } finally { s.close(); }
});

test('a question goes to the engine and its answer to that person only', async () => {
    const s = await site();
    try {
        const first = s.call('/engine/poll', { body: { engine: 't' }, token: TOKEN });   // waits
        await new Promise((r) => setTimeout(r, 50));
        assert.equal((await s.call('/messages', { who: 'ana' })).body.open, true);
        const said = await s.call('/say', { who: 'ana', body: { text: 'Où est le guide ?' } });
        assert.equal(said.status, 200);
        const got = (await first).body.questions;
        assert.equal(got.length, 1);
        assert.equal(got[0].text, 'Où est le guide ?');
        assert.deepEqual(got[0].history, []);
        assert.equal((await s.call('/say', { who: 'ana', body: { text: 'encore' } })).status, 429, 'one at a time');
        await s.call('/engine/doing', { body: { id: got[0].id, text: 'Je cherche…' }, token: TOKEN });
        const busy = (await s.call('/messages', { who: 'ana' })).body;
        assert.equal(busy.status.state, 'working');
        assert.equal(busy.steps[0].note, 'Je cherche…');
        assert.equal((await s.call('/engine/answer', { body: { id: got[0].id, text: 'Dans **docs/**.', sources: ['guide.md'] }, token: TOKEN })).status, 200);
        assert.equal((await s.call('/engine/answer', { body: { id: got[0].id, text: 'again' }, token: TOKEN })).status, 404, 'answered once');
        const ana = (await s.call('/messages', { who: 'ana' })).body;
        assert.deepEqual(ana.messages.map((m) => [m.from, m.text]), [['person', 'Où est le guide ?'], ['agent', 'Dans **docs/**.\n\nSources : `guide.md`']]);
        assert.deepEqual(ana.messages[1].sources, ['guide.md']);
        assert.equal(ana.status.state, 'waiting');
        assert.deepEqual((await s.call('/messages', { who: 'bob' })).body.messages, [], 'nobody reads another thread');
        /* The next question carries the history. */
        await s.call('/say', { who: 'ana', body: { text: 'Et le second ?' } });
        const next = (await s.call('/engine/poll', { body: {}, token: TOKEN })).body.questions;
        assert.deepEqual(next[0].history, [{ q: 'Où est le guide ?', a: 'Dans **docs/**.\n\nSources : `guide.md`' }]);
    } finally { s.close(); }
});

test('limits: empty, too long, per hour; a question left too long is answered by the relay', async () => {
    const s = await site({ perHour: 2, answerMs: 1000 });
    try {
        const p = s.call('/engine/poll', { body: {}, token: TOKEN });
        await new Promise((r) => setTimeout(r, 50));
        assert.equal((await s.call('/say', { who: 'ana', body: { text: '  ' } })).status, 400);
        assert.equal((await s.call('/say', { who: 'ana', body: { text: 'x'.repeat(2001) } })).status, 400);
        assert.equal((await s.call('/say', { who: 'ana', body: { text: 'one' } })).status, 200);
        assert.equal((await p).body.questions.length, 1);
        s.tick(1500);
        assert.match((await s.call('/messages', { who: 'ana' })).body.messages.at(-1).text, /pas pu répondre/);
        assert.equal((await s.call('/say', { who: 'ana', body: { text: 'two' } })).status, 200);
        s.tick(1500);
        await s.call('/messages', { who: 'ana' });
        const no = await s.call('/say', { who: 'ana', body: { text: 'three' } });
        assert.equal(no.status, 429, 'two per hour');
        assert.deepEqual([no.body.used, no.body.max, no.body.window], [2, 2, 'hour']);
        assert.ok(Date.parse(no.body.retryAt) > Date.now(), 'when the next question is possible');
        assert.equal((await s.call('/messages', { who: 'ana' })).body.quota.retryAt, no.body.retryAt);
        s.tick(61_000);
        assert.equal((await s.call('/messages', { who: 'ana' })).body.open, false, 'no poll for a minute: closed');
    } finally { s.close(); }
});
