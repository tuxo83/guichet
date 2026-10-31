/* The real engine (../engine) against the relay, with a fake
   OpenAI-compatible model: a question asked on the site comes back answered from the documents. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { guichetRelay } from '../index.mjs';

const ENGINE = join(import.meta.dirname, '..', '..', 'engine', 'bin', 'guichet.mjs');
const TOKEN = 'a-long-test-token-of-the-engine-0123456789';
const listen = (server) => new Promise((r) => server.listen(0, '127.0.0.1', () => r(server.address().port)));

test('engine and relay, end to end', { skip: !existsSync(ENGINE) && 'no engine beside this repo', timeout: 30_000 }, async () => {
    const docs = mkdtempSync(join(tmpdir(), 'guichet-docs-'));
    writeFileSync(join(docs, 'conges.md'), '# Congés\nLes demandes de congés se font dans l\'outil RH, onglet Absences, deux semaines avant.\n');
    writeFileSync(join(docs, 'wifi.md'), '# Wi-Fi\nLe réseau invité est Visiteurs. password: hunter2-secret-value\n');
    const prompts = [];
    const model = createServer((req, res) => {
        let raw = ''; req.on('data', (c) => { raw += c; });
        req.on('end', () => {
            const body = JSON.parse(raw); const prompt = body.messages.at(-1).content; prompts.push(prompt);
            const text = /RÉPONSE PROPOSÉE/.test(prompt) ? '{"complete": true}' : 'Dans l\'outil RH, onglet **Absences**.\n\nSources : conges.md';
            res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ choices: [{ message: { content: text } }] }));
        });
    });
    const relay = guichetRelay({ token: TOKEN, identify: (req) => (req.headers['x-who'] ? { id: req.headers['x-who'] } : null) });
    const site = createServer(async (req, res) => { if (!(await relay.handle(req, res, '/guichet'))) { res.statusCode = 404; res.end(); } });
    const [mPort, sPort] = [await listen(model), await listen(site)];
    const engine = spawn(process.execPath, [ENGINE, '--relay', `http://127.0.0.1:${sPort}/guichet`], {
        env: { PATH: process.env.PATH, GUICHET_TOKEN: TOKEN, GUICHET_DOCS: docs, GUICHET_PROVIDER: 'compatible', GUICHET_BASE_URL: `http://127.0.0.1:${mPort}/v1`, GUICHET_MODEL: 'fake' },
        stdio: ['ignore', 'pipe', 'pipe'],
    });
    let log = ''; engine.stdout.on('data', (c) => { log += c; }); engine.stderr.on('data', (c) => { log += c; });
    const call = async (path, body) => (await fetch(`http://127.0.0.1:${sPort}/guichet${path}`, { method: body ? 'POST' : 'GET', headers: { 'content-type': 'application/json', 'x-who': 'ana' }, ...(body ? { body: JSON.stringify(body) } : {}) })).json();
    const until = async (check, what) => { for (let i = 0; i < 100; i++) { const v = await check(); if (v) return v; await new Promise((r) => setTimeout(r, 100)); } throw new Error(`${what} never came\n${log}`); };
    try {
        await until(async () => (await call('/messages')).open, 'the guichet opening');
        assert.equal((await call('/say', { text: 'Comment poser des congés ?' })).ok, true);
        const done = await until(async () => { const d = await call('/messages'); return d.messages.length === 2 && d; }, 'the answer');
        assert.match(done.messages[1].text, /Absences/);
        assert.equal(done.status.state, 'waiting');
        assert.match(prompts[0], /conges\.md/, 'the passages found went to the model');
        assert.ok(!prompts.join('\n').includes('hunter2'), 'no secret ever reaches the model');
    } finally { engine.kill(); relay.close(); site.close(); model.close(); }
});
