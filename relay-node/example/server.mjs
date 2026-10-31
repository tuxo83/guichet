/* An example site with a Guichet: one page, the relay at /guichet, Parley's display.
 *   GUICHET_TOKEN=... PARLEY_UI=/path/to/clavarium-parley/ui node example/server.mjs
 * "Signing in" here is a name in a cookie: your site uses its own session instead. */
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { join, normalize } from 'node:path';
import { guichetRelay } from '../index.mjs';

const PORT = Number(process.env.PORT || 4300);
const UI = process.env.PARLEY_UI || join(import.meta.dirname, '..', 'node_modules', 'clavarium-parley', 'ui');
const cookie = (req, name) => (String(req.headers.cookie ?? '').split(/;\s*/).find((c) => c.startsWith(`${name}=`)) ?? '').slice(name.length + 1);
const relay = guichetRelay({
    token: process.env.GUICHET_TOKEN,
    identify: (req) => { const who = decodeURIComponent(cookie(req, 'who')); return who ? { id: who, name: who } : null; },
    dir: process.env.GUICHET_RELAY_DIR || null,
    journal: (line) => console.log(JSON.stringify(line)),
});
const TYPES = { '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.html': 'text/html; charset=utf-8', '.woff2': 'font/woff2' };

createServer(async (req, res) => {
    if (await relay.handle(req, res, '/guichet')) return;
    const path = req.url.split('?')[0];
    if (path.startsWith('/parley/')) {
        const file = normalize(join(UI, path.slice('/parley/'.length)));
        if (!file.startsWith(normalize(UI))) { res.statusCode = 403; return res.end(); }
        try { const ext = file.slice(file.lastIndexOf('.')); res.setHeader('content-type', TYPES[ext] ?? 'application/octet-stream'); return res.end(readFileSync(file)); } catch { res.statusCode = 404; return res.end(); }
    }
    if (path === '/') { res.setHeader('content-type', 'text/html; charset=utf-8'); return res.end(readFileSync(join(import.meta.dirname, 'page.html'))); }
    res.statusCode = 404; res.end();
}).listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/`));
