# guichet-relay (Node.js)

Puts a **Guichet** on a website: the site's visitors ask, a Guichet engine answers from its
documents. The relay sits in the site and is the only thing the browser talks to; the engine
connects **out** to it from wherever it runs. Protocol v1: see the engine's `PROTOCOL.md`.

- The site's own login says who asks (`identify`); each person has their own thread, nobody reads
  another's.
- "Open" while an engine polls, "closed" otherwise; a question not answered in 3 minutes is said so.
- Limits: 2000 characters a question, 30 questions per person per hour, one at a time.
- The engine's token in `Authorization: Bearer` or `X-Guichet-Token` (for hosts that drop the first).
- The sources an answer cites are kept on its message and said in a last line.
- Plain HTTP + JSON, no dependency, Node.js 20.11 or later.
- One guichet per relay, one shared token. Several guichets, several revocable tokens and windowed
  limits per address / account / guichet are in the PHP relay (0.2); not here yet.

```js
import { guichetRelay } from 'guichet-relay';

const relay = guichetRelay({
    token: process.env.GUICHET_TOKEN,                       // 24 characters at least, shared with the engine
    identify: (req) => (req.user ? { id: req.user.id, name: req.user.name } : null),
    dir: '/var/lib/guichet',                                // optional: threads kept on disk
    journal: (line) => console.log(JSON.stringify(line)),   // who asked, when, how long -- not the text
});

app.use('/guichet', relay.handler);                         // Express
// or, with node:http: if (await relay.handle(req, res, '/guichet')) return;
```

The display is Parley's chat (`parley-ui.js` from `clavarium-parley`), mounted with `load` reading
`GET /guichet/messages` and `send` posting to `/guichet/say` — see `example/page.html`.

## Example

```sh
GUICHET_TOKEN=... PARLEY_UI=/path/to/clavarium-parley/ui node example/server.mjs
```

## Tests

```sh
npm test      # the relay; and the engine against it with the engine in ../engine
```
