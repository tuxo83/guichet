/* Several guichets in one relay (0.2): each its own threads, tokens, limits, open or closed -- driven
   over HTTP through `php -S`, and the real engine (../engine) answering through a guichet's URL. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const HERE = join(import.meta.dirname, '..', 'example');
const ENGINE = join(import.meta.dirname, '..', '..', 'engine', 'bin', 'guichet.mjs');
const noPhp = spawnSync('php', ['-v']).status !== 0 && 'php is not installed';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const GUICHETS = {
    help: {},
    sales: { lang: 'en', tone: 'sober\nand   warm' },
    tight: { oneAtATime: false, limits: [{ what: 'questions', window: 'hour', ip: 2, account: 5, total: 100 }, { what: 'chars', window: 'day', account: 30 }] },
    short: { maxAnswer: 10, answerSeconds: 1 },
};

async function site() {
    const port = 20000 + Math.floor(Math.random() * 20000);
    const dir = mkdtempSync(join(tmpdir(), 'guichet-relay-php-'));
    const env = { ...process.env, PHP_CLI_SERVER_WORKERS: '4', GUICHET_GUICHETS: JSON.stringify(GUICHETS), GUICHET_RELAY_DIR: dir, GUICHET_POLL_SECONDS: '1', GUICHET_TIMEZONE: 'UTC' };
    delete env.GUICHET_TOKEN;
    const php = spawn('php', ['-S', `127.0.0.1:${port}`, join(HERE, 'index.php')], { env, stdio: 'ignore' });
    const base = `http://127.0.0.1:${port}/guichet`;
    for (let i = 0; i < 50; i++) { try { await fetch(`${base}/help/messages`); break; } catch { await sleep(100); } }
    const call = async (path, { who, body, token, header, ip } = {}) => {
        const headers = { 'content-type': 'application/json', ...(who ? { cookie: `who=${who}` } : {}), ...(ip ? { 'x-test-ip': ip } : {}),
            ...(token ? (header ? { 'x-guichet-token': token } : { authorization: `Bearer ${token}` }) : {}) };
        const r = await fetch(`${base}${path}`, { method: body ? 'POST' : 'GET', headers, ...(body ? { body: JSON.stringify(body) } : {}) });
        return { status: r.status, body: await r.json().catch(() => null) };
    };
    const token = (g, label = 'engine') => JSON.parse(spawnSync('php', [join(HERE, 'token.php'), g, label], { env, encoding: 'utf8' }).stdout);
    const revoke = (g, id) => spawnSync('php', [join(HERE, 'token.php'), '--revoke', g, id], { env, encoding: 'utf8' }).stdout.trim();
    return { base, dir, call, token, revoke, close: () => php.kill() };
}

test('two guichets are kept apart: threads, queues, tokens, open or closed', { skip: noPhp, timeout: 30_000 }, async () => {
    const s = await site();
    try {
        const help = s.token('help', 'main'); const help2 = s.token('help', 'spare'); const sales = s.token('sales');
        assert.match(help.token, /^gch_[A-Za-z0-9]{32}$/);
        assert.equal((await s.call('/nowhere/messages', { who: 'ana' })).status, 404, 'an unknown guichet is not ours');
        assert.equal((await s.call('/help/engine/poll', { body: {}, token: sales.token })).status, 401, "a token opens its own guichet only");
        assert.equal((await s.call('/help/engine/poll', { body: { engine: 'guichet', version: '9.9' }, token: help.token })).status, 200);
        assert.equal((await s.call('/help/messages', { who: 'ana' })).body.open, true);
        assert.equal((await s.call('/sales/messages', { who: 'ana' })).body.open, false, 'help polled, sales still closed');
        assert.equal((await s.call('/sales/say', { who: 'ana', body: { text: 'hi' } })).status, 503);
        assert.equal((await s.call('/help/say', { who: 'ana', body: { text: 'Où est le guide ?' } })).status, 200);
        assert.equal((await s.call('/help/say', { who: 'ana', body: { text: 'encore' } })).status, 429, 'one at a time');
        assert.equal((await s.call('/sales/engine/poll', { body: {}, token: sales.token })).body.questions.length, 0, "help's question is not in sales' queue");
        assert.deepEqual((await s.call('/sales/messages', { who: 'ana' })).body.messages, [], "ana's help thread is not her sales thread");
        const got = (await s.call('/help/engine/poll', { body: {}, token: help2.token, header: true })).body.questions;
        assert.equal(got.length, 1, 'a second token of the same guichet, in X-Guichet-Token');
        assert.equal(got[0].tone, undefined, 'no tone set: none sent');
        assert.equal((await s.call('/help/engine/answer', { body: { id: got[0].id, text: 'Dans docs.' }, token: help.token })).status, 200);
        assert.deepEqual((await s.call('/help/messages', { who: 'ana' })).body.messages.map((m) => m.from), ['person', 'agent']);
        /* Only hashes on disk; seen, engine and version noted. */
        const kept = readFileSync(join(s.dir, 'guichets', 'help', 'tokens.json'), 'utf8');
        assert.ok(!kept.includes(help.token) && !kept.includes(help2.token));
        const main = JSON.parse(kept).find((t) => t.id === help.id);
        assert.equal(main.engine, 'guichet'); assert.equal(main.version, '9.9'); assert.ok(main.lastSeen);
        /* Revoked: refused at once. */
        assert.equal(s.revoke('help', help.id), 'revoked');
        assert.equal((await s.call('/help/engine/poll', { body: {}, token: help.token })).status, 401);
        assert.equal((await s.call('/help/engine/poll', { body: {}, token: help2.token })).status, 200, 'the other token still works');
    } finally { s.close(); }
});

test('limits per window: per address, per account, in characters; 429 says when to come back', { skip: noPhp, timeout: 30_000 }, async () => {
    const s = await site();
    try {
        const t = s.token('tight');
        await s.call('/tight/engine/poll', { body: {}, token: t.token });
        assert.equal((await s.call('/tight/say', { who: 'ana', ip: '127.0.0.1', body: { text: 'one' } })).status, 200);
        const second = await s.call('/tight/say', { who: 'ana', ip: '127.0.0.1', body: { text: 'two' } });
        assert.equal(second.status, 200);
        assert.deepEqual([second.body.quota.used, second.body.quota.max, second.body.quota.scope], [2, 2, 'ip']);
        const no = await s.call('/tight/say', { who: 'bob', ip: '127.0.0.1', body: { text: 'three' } });
        assert.equal(no.status, 429, 'two per hour from one address, whoever asks');
        const next = new Date(); next.setUTCMinutes(60, 0, 0);
        assert.deepEqual([no.body.used, no.body.max, no.body.what, no.body.window, no.body.scope, Date.parse(no.body.retryAt)], [2, 2, 'questions', 'hour', 'ip', next.getTime()]);
        const q = (await s.call('/tight/messages', { who: 'ana', ip: '127.0.0.1' })).body.quota;
        assert.deepEqual([q.used, q.max, q.window, Date.parse(q.retryAt)], [2, 2, 'hour', next.getTime()], 'the chat can say "2 / 2" and "next question at …"');
        /* Characters: 30 a day per account; ana has used 6. */
        assert.equal((await s.call('/tight/say', { who: 'ana', ip: 'address-b', body: { text: 'x'.repeat(24) } })).status, 200);
        const chars = await s.call('/tight/say', { who: 'ana', ip: 'address-c', body: { text: 'y' } });
        assert.equal(chars.status, 429);
        assert.deepEqual([chars.body.what, chars.body.used, chars.body.max, chars.body.window], ['chars', 30, 30, 'day']);
        assert.equal((await s.call('/tight/say', { who: 'cyd', ip: 'address-d', body: { text: 'y' } })).status, 200, 'others go on');
    } finally { s.close(); }
});

test('an answer too long is cut and says so; sources are kept; a late one is said', { skip: noPhp, timeout: 30_000 }, async () => {
    const s = await site();
    try {
        const t = s.token('short'); const h = s.token('help');
        await s.call('/short/engine/poll', { body: {}, token: t.token });
        await s.call('/short/say', { who: 'ana', body: { text: 'Long ?' } });
        let q = (await s.call('/short/engine/poll', { body: {}, token: t.token })).body.questions[0];
        await s.call('/short/engine/answer', { body: { id: q.id, text: 'é'.repeat(50), sources: ['a.md', 'dir/b.md'] }, token: t.token });
        const m = (await s.call('/short/messages', { who: 'ana' })).body.messages[1];
        assert.equal(m.text, `${'é'.repeat(10)}\n\n*(Réponse coupée : trop longue.)*\n\nSources : \`a.md\` · \`dir/b.md\``);
        assert.deepEqual(m.sources, ['a.md', 'dir/b.md']);
        assert.equal(m.cut, true);
        /* The model already named its sources: not twice. */
        await s.call('/help/engine/poll', { body: {}, token: h.token });
        await s.call('/help/say', { who: 'ana', body: { text: 'Court ?' } });
        q = (await s.call('/help/engine/poll', { body: {}, token: h.token })).body.questions[0];
        await s.call('/help/engine/answer', { body: { id: q.id, text: 'Oui.\n\nSources : a.md', sources: ['a.md'] }, token: h.token });
        assert.equal((await s.call('/help/messages', { who: 'ana' })).body.messages[1].text, 'Oui.\n\nSources : a.md');
        /* Not answered within answerSeconds (1 s here). */
        await s.call('/short/engine/poll', { body: {}, token: t.token });
        await s.call('/short/say', { who: 'bob', body: { text: 'Vite ?' } });
        await sleep(1600);
        const late = (await s.call('/short/messages', { who: 'bob' })).body;
        assert.equal(late.messages.at(-1).text, "Le Guichet n'a pas pu répondre à temps. Réessayez.");
        assert.equal(late.status.state, 'waiting');
    } finally { s.close(); }
});

test('the engine answers through a guichet URL with its own token', { skip: noPhp || (!existsSync(ENGINE) && 'no engine beside this repo'), timeout: 30_000 }, async () => {
    const docs = mkdtempSync(join(tmpdir(), 'guichet-docs-'));
    writeFileSync(join(docs, 'conges.md'), '# Congés\nLes demandes de congés se font dans l\'outil RH, onglet Absences.\n');
    const model = createServer((req, res) => {
        let raw = ''; req.on('data', (c) => { raw += c; });
        req.on('end', () => {
            const prompt = JSON.parse(raw).messages.at(-1).content; systems.push(JSON.parse(raw).messages[0].content);
            const text = /RÉPONSE PROPOSÉE/.test(prompt) ? '{"complete": true}' : 'Onglet **Absences** (voir conges.md).';
            res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ choices: [{ message: { content: text } }] }));
        });
    });
    const systems = [];
    await new Promise((r) => model.listen(0, '127.0.0.1', r));
    const s = await site();
    const t = s.token('sales', 'test engine');
    const engine = spawn(process.execPath, [ENGINE, '--relay', `${s.base}/sales`], {
        env: { PATH: process.env.PATH, GUICHET_TOKEN: t.token, GUICHET_DOCS: docs, GUICHET_PROVIDER: 'compatible', GUICHET_BASE_URL: `http://127.0.0.1:${model.address().port}/v1`, GUICHET_MODEL: 'fake' }, stdio: 'ignore',
    });
    try {
        for (let i = 0; i < 50 && !(await s.call('/sales/messages', { who: 'ana' })).body.open; i++) await sleep(100);
        assert.equal((await s.call('/help/messages', { who: 'ana' })).body.open, false, 'only its own guichet opens');
        assert.equal((await s.call('/sales/say', { who: 'ana', body: { text: 'Comment poser des congés ?' } })).status, 200);
        let d;
        for (let i = 0; i < 100; i++) { d = (await s.call('/sales/messages', { who: 'ana' })).body; if (d.messages.length === 2) break; await sleep(100); }
        assert.match(d.messages[1]?.text ?? '', /Absences/);
        assert.deepEqual(d.messages[1].sources, ['conges.md'], 'the sources the engine cited, kept');
        assert.match(d.messages[1].text, /Sources: `conges\.md`$/, "said in the guichet's language");
        assert.match(systems[0], /« sober and warm »/, "the guichet's tone, on one line, reached the engine");
    } finally { engine.kill(); s.close(); model.close(); }
});
