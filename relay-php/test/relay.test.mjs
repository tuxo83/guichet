/* The PHP relay, served by `php -S`, driven over HTTP -- and the real engine (../guichet, when it
   sits beside this repo) against it, with a fake OpenAI-compatible model. Needs `php` 8.1+. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const TOKEN = 'a-long-test-token-of-the-engine-0123456789';
const ENGINE = join(import.meta.dirname, '..', '..', 'engine', 'bin', 'guichet.mjs');
const noPhp = spawnSync('php', ['-v']).status !== 0 && 'php is not installed';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function phpSite(env = {}) {
    const port = 20000 + Math.floor(Math.random() * 20000);
    const dir = mkdtempSync(join(tmpdir(), 'guichet-relay-php-'));
    const php = spawn('php', ['-S', `127.0.0.1:${port}`, join(import.meta.dirname, '..', 'example', 'index.php')], {
        env: { ...process.env, PHP_CLI_SERVER_WORKERS: '4', GUICHET_TOKEN: TOKEN, GUICHET_RELAY_DIR: dir, GUICHET_POLL_SECONDS: '2', ...env }, stdio: 'ignore',
    });
    const base = `http://127.0.0.1:${port}/guichet`;
    for (let i = 0; i < 50; i++) { try { await fetch(`${base}/messages`); break; } catch { await sleep(100); } }
    const call = async (path, { who, body, token } = {}) => {
        const r = await fetch(`${base}${path}`, { method: body ? 'POST' : 'GET', headers: { 'content-type': 'application/json', ...(who ? { cookie: `who=${who}` } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
        return { status: r.status, body: await r.json().catch(() => null) };
    };
    return { base, call, close: () => php.kill() };
}

test('the PHP relay keeps the protocol', { skip: noPhp, timeout: 30_000 }, async () => {
    const s = await phpSite();
    try {
        assert.equal((await s.call('/messages')).status, 401);
        assert.equal((await s.call('/messages', { who: 'ana' })).body.open, false);
        assert.equal((await s.call('/say', { who: 'ana', body: { text: 'hello' } })).status, 503);
        assert.equal((await s.call('/engine/poll', { body: {}, token: 'wrong-token-wrong-token-wrong' })).status, 401);
        assert.deepEqual((await s.call('/engine/poll', { body: {}, token: TOKEN })).body.questions, [], 'nothing came in 2 s');
        assert.equal((await s.call('/messages', { who: 'ana' })).body.open, true);
        assert.equal((await s.call('/say', { who: 'ana', body: { text: ' ' } })).status, 400);
        assert.equal((await s.call('/say', { who: 'ana', body: { text: 'é'.repeat(2001) } })).status, 400);
        assert.equal((await s.call('/say', { who: 'ana', body: { text: 'Où est le guide ?' } })).status, 200);
        assert.equal((await s.call('/say', { who: 'ana', body: { text: 'encore' } })).status, 429, 'one at a time');
        const got = (await s.call('/engine/poll', { body: {}, token: TOKEN })).body.questions;
        assert.equal(got.length, 1);
        assert.equal(got[0].text, 'Où est le guide ?');
        await s.call('/engine/doing', { body: { id: got[0].id, text: 'Je cherche…' }, token: TOKEN });
        const busy = (await s.call('/messages', { who: 'ana' })).body;
        assert.equal(busy.status.state, 'working');
        assert.equal(busy.steps[0].note, 'Je cherche…');
        assert.equal((await s.call('/engine/answer', { body: { id: got[0].id, text: 'Dans **docs/**.' }, token: TOKEN })).status, 200);
        assert.equal((await s.call('/engine/answer', { body: { id: got[0].id, text: 'again' }, token: TOKEN })).status, 404);
        const ana = (await s.call('/messages', { who: 'ana' })).body;
        assert.deepEqual(ana.messages.map((m) => [m.from, m.text]), [['person', 'Où est le guide ?'], ['agent', 'Dans **docs/**.']]);
        assert.deepEqual((await s.call('/messages', { who: 'bob' })).body.messages, []);
        await s.call('/say', { who: 'ana', body: { text: 'Et le second ?' } });
        assert.deepEqual((await s.call('/engine/poll', { body: {}, token: TOKEN })).body.questions[0].history, [{ q: 'Où est le guide ?', a: 'Dans **docs/**.' }]);
    } finally { s.close(); }
});

test('the engine answers through the PHP relay', { skip: noPhp || (!existsSync(ENGINE) && 'no engine beside this repo'), timeout: 30_000 }, async () => {
    const docs = mkdtempSync(join(tmpdir(), 'guichet-docs-'));
    writeFileSync(join(docs, 'conges.md'), '# Congés\nLes demandes de congés se font dans l\'outil RH, onglet Absences.\n');
    const model = createServer((req, res) => {
        let raw = ''; req.on('data', (c) => { raw += c; });
        req.on('end', () => {
            const prompt = JSON.parse(raw).messages.at(-1).content;
            const text = /RÉPONSE PROPOSÉE/.test(prompt) ? '{"complete": true}' : 'Onglet **Absences**.\n\nSources : conges.md';
            res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ choices: [{ message: { content: text } }] }));
        });
    });
    await new Promise((r) => model.listen(0, '127.0.0.1', r));
    const s = await phpSite();
    const engine = spawn(process.execPath, [ENGINE, '--relay', s.base], {
        env: { PATH: process.env.PATH, GUICHET_TOKEN: TOKEN, GUICHET_DOCS: docs, GUICHET_PROVIDER: 'compatible', GUICHET_BASE_URL: `http://127.0.0.1:${model.address().port}/v1`, GUICHET_MODEL: 'fake' }, stdio: 'ignore',
    });
    try {
        for (let i = 0; i < 50 && !(await s.call('/messages', { who: 'ana' })).body.open; i++) await sleep(100);
        assert.equal((await s.call('/say', { who: 'ana', body: { text: 'Comment poser des congés ?' } })).status, 200);
        let d;
        for (let i = 0; i < 100; i++) { d = (await s.call('/messages', { who: 'ana' })).body; if (d.messages.length === 2) break; await sleep(100); }
        assert.match(d.messages[1]?.text ?? '', /Absences/);
    } finally { engine.kill(); s.close(); model.close(); }
});
