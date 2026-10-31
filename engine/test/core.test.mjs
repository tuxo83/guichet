import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { mask, passagesOf, search, answer, ROUNDS } from '../src/core.mjs';
import { provider } from '../src/providers.mjs';

const docs = () => {
    const d = mkdtempSync(join(tmpdir(), 'guichet-'));
    writeFileSync(join(d, 'conges.md'), '# Congés\nLes congés se demandent dans l\'outil RH, onglet Absences, deux semaines avant.\n');
    writeFileSync(join(d, 'wifi.md'), '# Wi-Fi\nLe réseau invité est Visiteurs.\npassword: hunter2-secret-value\n');
    mkdirSync(join(d, 'node_modules')); writeFileSync(join(d, 'node_modules', 'x.md'), 'congés ignorés');
    writeFileSync(join(d, '.env'), 'TOKEN=abcdef123456');
    return d;
};

test('secrets are masked', () => {
    assert.equal(mask('password: hunter2-secret').text, 'password: [secret masked]');
    assert.equal(mask('git clone https://bob:s3cretpass@example.com/r.git').masked, 1);
    assert.equal(mask('key sk-ant-abcdefghijklmnopqrstuvwxyz').text, 'key [secret masked]');
    assert.match(mask('-----BEGIN RSA PRIVATE KEY-----\nAAA\n-----END RSA PRIVATE KEY-----').text, /^\[secret masked\]$/);
    assert.equal(mask('nothing here').masked, 0);
});

test('documents become passages, secrets masked, hidden and vendored folders left out', () => {
    const index = passagesOf(docs());
    assert.deepEqual([...new Set(index.list.map((p) => p.name))].sort(), ['conges.md', 'wifi.md']);
    assert.ok(!index.list.some((p) => p.body.includes('hunter2')));
    assert.equal(search(index, 'Comment demander des congés ?')[0].name, 'conges.md');
    assert.equal(search(index, 'réseau wifi invité')[0].name, 'wifi.md');
    assert.deepEqual(search(index, 'zzz'), []);
});

test('an answer: passages to the model, judged, searched again for what is missing', async () => {
    const index = passagesOf(docs());
    const prompts = []; const steps = [];
    let n = 0;
    const ask = async (system, prompt) => {
        prompts.push(prompt); n++;
        if (/RÉPONSE PROPOSÉE/.test(prompt)) return n < 3 ? '{"complete": false, "search": "réseau invité wifi"}' : '{"complete": true}';
        return n === 1 ? 'Dans l\'outil RH.' : 'Dans l\'outil RH ; le Wi-Fi invité est Visiteurs.\n\nSources : conges.md, wifi.md';
    };
    const r = await answer({ question: 'Et les congés ?', index, ask, doing: (t) => steps.push(t) });
    assert.match(r.text, /Visiteurs/);
    assert.deepEqual(r.sources.sort(), ['conges.md', 'wifi.md']);
    assert.equal(steps.length, 2, 'one line per round');
    assert.ok(prompts.length <= ROUNDS * 2);
    assert.ok(!prompts.join('').includes('hunter2'));
    const only = await answer({ question: 'Et les congés ?', index, ask: async (sys, p) => (/RÉPONSE PROPOSÉE/.test(p) ? '{"complete":true}' : 'Outil RH.\n\nSources : conges.md') });
    assert.deepEqual(only.sources, ['conges.md'], 'only what the answer cites');
});

test('a secret in the answer is masked and said; a failing model is said plainly', async () => {
    const index = passagesOf(docs());
    const r = await answer({ question: 'mot de passe ?', index, ask: async (s, p) => (/RÉPONSE/.test(p) ? '{"complete":true}' : 'password: abcdef123456') });
    assert.match(r.text, /\[secret masked\]/);
    assert.match(r.text, /WARNING/);
    const f = await answer({ question: 'x', index, ask: async () => { throw new Error('anthropic answered 529'); } });
    assert.match(f.text, /pas pu répondre.*529/);
});

test('providers: the right request, no tool, keys checked', async () => {
    const seen = [];
    const fetch = async (url, init) => { seen.push({ url, init: { ...init, body: JSON.parse(init.body) } }); return new Response(JSON.stringify(url.includes('anthropic') ? { content: [{ type: 'text', text: 'ok-a' }] } : { choices: [{ message: { content: 'ok-o' } }] })); };
    assert.equal(await provider({ GUICHET_API_KEY: 'k1' }, { fetch }).ask('sys', 'q'), 'ok-a');
    assert.equal(seen[0].init.headers['x-api-key'], 'k1');
    assert.equal(seen[0].init.body.model, 'claude-sonnet-5-5');
    assert.equal(seen[0].init.body.tools, undefined);
    assert.equal(await provider({ GUICHET_PROVIDER: 'mistral', GUICHET_API_KEY: 'k2' }, { fetch }).ask('sys', 'q'), 'ok-o');
    assert.equal(seen[1].url, 'https://api.mistral.ai/v1/chat/completions');
    assert.equal(seen[1].init.headers.authorization, 'Bearer k2');
    await provider({ GUICHET_PROVIDER: 'compatible', GUICHET_BASE_URL: 'http://127.0.0.1:11434/v1/', GUICHET_MODEL: 'llama' }, { fetch }).ask('s', 'q');
    assert.equal(seen[2].url, 'http://127.0.0.1:11434/v1/chat/completions');
    assert.equal(seen[2].init.headers.authorization, undefined);
    assert.throws(() => provider({ GUICHET_PROVIDER: 'openai' }), /API_KEY/);
    assert.throws(() => provider({ GUICHET_PROVIDER: 'compatible', GUICHET_MODEL: 'x' }), /BASE_URL/);
    assert.throws(() => provider({ GUICHET_PROVIDER: 'nope' }), /one of/);
    const bad = async () => new Response('{"error":"invalid x-api-key"}', { status: 401 });
    await assert.rejects(provider({ GUICHET_API_KEY: 'k' }, { fetch: bad }).ask('s', 'q'), /401 \(check the API key\)/);
});
