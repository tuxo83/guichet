/* THE ENGINE AS IT RUNS (bin/guichet.mjs), against a stand-in relay and a stand-in OpenAI-compatible
   model with embeddings: the tone a relay sends with a question wins over GUICHET_TONE, the search
   goes by meaning, and the index lands in GUICHET_INDEX. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fakeEmbedder } from './fake-embed.mjs';

const ENGINE = join(import.meta.dirname, '..', 'bin', 'guichet.mjs');
const listen = (server) => new Promise((r) => server.listen(0, '127.0.0.1', () => r(server.address().port)));
const json = (req) => new Promise((r) => { let raw = ''; req.on('data', (c) => { raw += c; }); req.on('end', () => r(raw ? JSON.parse(raw) : {})); });

test('the engine: the relay\'s tone wins over GUICHET_TONE; by meaning; the index kept outside the documents', { timeout: 30_000 }, async () => {
    const docs = mkdtempSync(join(tmpdir(), 'guichet-docs-'));
    const index = mkdtempSync(join(tmpdir(), 'guichet-index-'));
    writeFileSync(join(docs, 'evenements.md'), '# Événements\nInscription sur le salon #nuit-des-brumes, au plus tard le jeudi.\n');
    writeFileSync(join(docs, 'conges.md'), '# Congés\nLes congés se demandent dans l\'outil RH, onglet Absences.\n');
    const emb = fakeEmbedder('fake-embed-1');
    const chats = [];
    const model = createServer(async (req, res) => {
        const body = await json(req);
        res.setHeader('content-type', 'application/json');
        if (req.url.endsWith('/embeddings')) return res.end(JSON.stringify({ data: (await emb.embed(body.input)).map((embedding, index) => ({ index, embedding })) }));
        const [system, prompt] = [body.messages[0].content, body.messages.at(-1).content]; chats.push({ system, prompt });
        res.end(JSON.stringify({ choices: [{ message: { content: /RÉPONSE PROPOSÉE/.test(prompt) ? '{"complete": true}' : 'Sur le salon.\n\nSources : evenements.md' } }] }));
    });
    const queue = [{ id: 'q1', thread: 't', text: 'Comment je m\'enregistre ?', history: [], tone: 'à la manière de Yoda' }, { id: 'q2', thread: 't', text: 'Et les congés ?', history: [] }];
    const answers = [];
    const relay = createServer(async (req, res) => {
        const body = await json(req);
        res.setHeader('content-type', 'application/json');
        if (req.url.endsWith('/engine/poll')) { await new Promise((r) => setTimeout(r, queue.length ? 300 : 200)); return res.end(JSON.stringify({ questions: queue.splice(0, 1) })); }
        if (req.url.endsWith('/engine/answer')) answers.push(body);
        res.end('{"ok":true}');
    });
    const [mPort, rPort] = [await listen(model), await listen(relay)];
    const engine = spawn(process.execPath, [ENGINE, '--relay', `http://127.0.0.1:${rPort}/guichet`], {
        env: { PATH: process.env.PATH, HOME: index, GUICHET_TOKEN: 'a-long-test-token-0123456789', GUICHET_DOCS: docs, GUICHET_INDEX: index, GUICHET_TONE: 'sobre et chaleureux',
            GUICHET_PROVIDER: 'compatible', GUICHET_BASE_URL: `http://127.0.0.1:${mPort}/v1`, GUICHET_MODEL: 'fake', GUICHET_EMBED_MODEL: 'fake-embed-1' },
        stdio: ['ignore', 'pipe', 'pipe'],
    });
    let log = ''; engine.stdout.on('data', (c) => { log += c; }); engine.stderr.on('data', (c) => { log += c; });
    try {
        for (let i = 0; i < 150 && answers.length < 2; i++) await new Promise((r) => setTimeout(r, 100));
        assert.equal(answers.length, 2, log);
        const first = chats.find((c) => c.prompt.includes('enregistre'));
        assert.match(first.system, /Yoda/, "the relay's tone");
        assert.ok(!/chaleureux/.test(first.system));
        assert.match(chats.find((c) => /QUESTION\nEt les congés/.test(c.prompt)).system, /sobre et chaleureux/, 'GUICHET_TONE when the relay sends none');
        assert.match(first.prompt, /#nuit-des-brumes/, 'found by meaning');
        assert.match(log, /Search by words and meaning \(fake-embed-1/);
        const kept = readdirSync(index).filter((f) => f.endsWith('.json'));
        assert.equal(kept.length, 1);
        assert.equal(JSON.parse(readFileSync(join(index, kept[0]), 'utf8')).model, 'fake-embed-1');
    } finally { engine.kill(); relay.close(); model.close(); }
});
