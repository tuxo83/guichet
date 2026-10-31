# Guichet

An AI that answers questions from **its documents** and can do **nothing else**: no tool, no
action, secrets masked on the way in and out. It searches its documents by meaning and by
keywords, cites its sources, says plainly when they do not hold the answer, and speaks in the
tone it is given (neutral by default).

One repository, four parts, one protocol ([PROTOCOL.md](PROTOCOL.md)):

| Folder | What |
|---|---|
| [`engine/`](engine) | The Guichet itself (Node.js, no dependency): indexing, search, the model, the answers. Runs in a Clavarium conversation or anywhere. |
| [`relay-node/`](relay-node) | Puts a Guichet on a Node.js website: the site's login says who asks. |
| [`relay-php/`](relay-php) | The same for PHP sites, several guichets and tokens per site, no database. |
| [`wordpress/`](wordpress) | A WordPress plugin built on the PHP relay: settings, access by role, limits, tokens, shortcode and block. |

The engine always connects **out** to a relay; a website never reaches the engine.

`engine/examples/brumeterre/` is a small knowledge base of an invented community, used by the
tests and handy to try a guichet.

## Tests

```sh
npm test          # every part (the PHP relay's tests need php 8.1+)
npm run check     # the repository's guards, then the tests
```

MIT licence.
