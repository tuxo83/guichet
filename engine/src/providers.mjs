/* THE MODEL, WHOEVER PROVIDES IT -- asked with no tool, ever: a system text and one message in,
 * one text out. Chosen by GUICHET_PROVIDER; the key and the model come from the environment
 * (in Clavarium, from the variables linked to your secrets).
 *
 *   anthropic   https://api.anthropic.com/v1/messages             GUICHET_API_KEY, GUICHET_MODEL
 *   mistral     https://api.mistral.ai/v1/chat/completions        GUICHET_API_KEY, GUICHET_MODEL
 *   openai      https://api.openai.com/v1/chat/completions        GUICHET_API_KEY, GUICHET_MODEL
 *   compatible  GUICHET_BASE_URL/chat/completions (Ollama, vLLM, LM Studio…), key optional
 *   claude-cli  the `claude` command, -p with no tool (the prototype's way; needs it signed in)
 *
 * EMBEDDINGS (for a search by meaning) come from an OpenAI-compatible `/embeddings` endpoint:
 * GUICHET_EMBED_MODEL, with GUICHET_EMBED_BASE_URL and GUICHET_EMBED_API_KEY defaulting to the
 * chat ones. Anthropic has no such endpoint: without an embedding model the search stays lexical.
 */
import { spawnSync } from 'node:child_process';

const DEFAULT_MODEL = { anthropic: 'claude-sonnet-5-5', mistral: 'mistral-large-latest', openai: 'gpt-4.1-mini' };
const BASE = { mistral: 'https://api.mistral.ai/v1', openai: 'https://api.openai.com/v1' };
const MAX_TOKENS = 1500;
const TIMEOUT_MS = 120_000;
const EMBED_BATCH = 32;         /* texts per /embeddings request: small enough for any server's limit */
const EMBED_TIMEOUT_MS = 60_000;
/* Known servers whose embedding model is worth using without being asked: OVH AI Endpoints. */
const EMBED_DEFAULT = { 'https://oai.endpoints.kepler.ai.cloud.ovh.net/v1': 'bge-m3' };

export function provider(env = process.env, { fetch: fetchImpl = globalThis.fetch } = {}) {
    const kind = String(env.GUICHET_PROVIDER || 'anthropic').toLowerCase();
    const key = String(env.GUICHET_API_KEY || '').trim();
    const model = String(env.GUICHET_MODEL || DEFAULT_MODEL[kind] || '').trim();
    const timed = async (url, init) => {
        const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
        try {
            const r = await fetchImpl(url, { ...init, signal: ctl.signal });
            const body = await r.text();
            if (!r.ok) throw new Error(`${kind} answered ${r.status}${/key|auth/i.test(body) ? ' (check the API key)' : ''}`);
            return JSON.parse(body);
        } finally { clearTimeout(t); }
    };
    if (kind === 'anthropic') {
        if (!key) throw new Error('GUICHET_API_KEY is missing (anthropic)');
        return {
            name: `anthropic/${model}`,
            async ask(system, prompt) {
                const j = await timed('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
                    body: JSON.stringify({ model, max_tokens: MAX_TOKENS, system, messages: [{ role: 'user', content: prompt }] }) });
                return (j.content ?? []).filter((c) => c.type === 'text').map((c) => c.text).join('').trim();
            },
        };
    }
    if (kind === 'mistral' || kind === 'openai' || kind === 'compatible') {
        const base = String(env.GUICHET_BASE_URL || BASE[kind] || '').replace(/\/+$/, '');
        if (!base) throw new Error('GUICHET_BASE_URL is missing (compatible)');
        if (!key && kind !== 'compatible') throw new Error(`GUICHET_API_KEY is missing (${kind})`);
        if (!model) throw new Error('GUICHET_MODEL is missing');
        return {
            name: `${kind}/${model}`,
            async ask(system, prompt) {
                const j = await timed(`${base}/chat/completions`, { method: 'POST', headers: { 'content-type': 'application/json', ...(key ? { authorization: `Bearer ${key}` } : {}) },
                    body: JSON.stringify({ model, max_tokens: MAX_TOKENS, messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }] }) });
                return String(j.choices?.[0]?.message?.content ?? '').trim();
            },
        };
    }
    if (kind === 'claude-cli') {
        return {
            name: 'claude-cli',
            async ask(system, prompt) {
                const r = spawnSync('claude', ['-p', '--tools', '', '--strict-mcp-config', '--setting-sources', '', '--no-session-persistence', '--system-prompt', system], { input: prompt, encoding: 'utf8', timeout: TIMEOUT_MS, maxBuffer: 4 * 1024 * 1024, cwd: '/tmp' });
                if (r.error || r.status !== 0) throw new Error((r.stderr || r.stdout || String(r.error ?? '')).trim().split('\n')[0] || `exit ${r.status}`);
                return r.stdout.trim();
            },
        };
    }
    throw new Error(`GUICHET_PROVIDER is one of anthropic, mistral, openai, compatible, claude-cli (not ${kind})`);
}

/* The embedder, or null when there is none: { name, model, embed(texts) -> number[][] }.
   GUICHET_EMBED_MODEL=none turns it off where a default would apply. */
export function embedder(env = process.env, { fetch: fetchImpl = globalThis.fetch, wait = (ms) => new Promise((r) => setTimeout(r, ms)) } = {}) {
    const kind = String(env.GUICHET_PROVIDER || 'anthropic').toLowerCase();
    const chatBase = kind === 'anthropic' || kind === 'claude-cli' ? '' : String(env.GUICHET_BASE_URL || BASE[kind] || '');
    const base = String(env.GUICHET_EMBED_BASE_URL || chatBase).replace(/\/+$/, '');
    const key = String(env.GUICHET_EMBED_API_KEY || (env.GUICHET_EMBED_BASE_URL && kind === 'anthropic' ? '' : env.GUICHET_API_KEY) || '').trim();
    const model = String(env.GUICHET_EMBED_MODEL ?? '').trim() || EMBED_DEFAULT[base] || '';
    if (!base || !model || /^(none|off|no)$/i.test(model)) return null;
    /* One request: retried once after a pause when the server is busy (429) or failing (5xx), as
       an index of a few hundred passages should not fail on one hiccup. */
    const post = async (input, retry = true) => {
        const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), EMBED_TIMEOUT_MS);
        let r, body;
        try {
            r = await fetchImpl(`${base}/embeddings`, { method: 'POST', signal: ctl.signal, headers: { 'content-type': 'application/json', ...(key ? { authorization: `Bearer ${key}` } : {}) }, body: JSON.stringify({ model, input }) });
            body = await r.text();
        } catch (e) { if (retry) { await wait(2000); return post(input, false); } throw new Error(`embeddings: ${e.name === 'AbortError' ? 'timed out' : e.message}`); }
        finally { clearTimeout(t); }
        if ((r.status === 429 || r.status >= 500) && retry) { await wait(r.status === 429 ? 5000 : 2000); return post(input, false); }
        if (!r.ok) throw new Error(`embeddings answered ${r.status}${/key|auth/i.test(body) ? ' (check the API key)' : ''}`);
        const data = JSON.parse(body).data;
        if (!Array.isArray(data) || data.length !== input.length) throw new Error('embeddings: not one vector per text');
        return [...data].sort((a, b) => (a.index ?? 0) - (b.index ?? 0)).map((d) => d.embedding);
    };
    return {
        name: `${model} (${base})`,
        model,
        async embed(texts) {
            const out = [];
            for (let i = 0; i < texts.length; i += EMBED_BATCH) out.push(...await post(texts.slice(i, i + EMBED_BATCH).map((t) => String(t).slice(0, 8000) || ' ')));
            return out;
        },
    };
}
