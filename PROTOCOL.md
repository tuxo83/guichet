# Guichet — engine ↔ relay protocol (v1)

Three pieces:

- **Engine** (`guichet`): answers questions from its documents with a model that has **no tool at all**.
  It runs anywhere (a Clavarium conversation, a server). It connects **out** to the relay; nothing
  connects in to it.
- **Relay** (`guichet-relay-node`, `guichet-relay-php`): a small library mounted in a website. It
  knows who the visitor is (the site's own login), keeps one thread per visitor, and is the only
  thing the browser talks to. It says whether the guichet is **open** (an engine polled recently) or
  **closed**.
- **Display**: Parley's chat UI (`parley-ui.js`), mounted in a page with `load` and `send` pointing
  at the relay.

Everything is plain HTTP + JSON, so a PHP host without WebSockets can serve it.

## Addresses: one guichet, or several

`{base}` below is a guichet's address. A relay may hold **one** guichet (`https://site.example/guichet`)
or **several**, each under its id (`https://site.example/guichet/<id>`, e.g.
`https://site.example/wp-json/guichet/v1/help`; an id is `a-z`, `0-9` and `-`). The engine is
simply given that address (`--relay`); nothing else changes for it.

## Engine side (tokens)

Header on every call: `Authorization: Bearer <GUICHET_TOKEN>`. Some hosts drop `Authorization`
before the relay sees it (Apache + PHP-FPM, security plugins), so the engine also sends the same
token as `X-Guichet-Token`; a relay accepts either. A guichet may have **several tokens** (one per
engine, each revocable); the relay keeps only their SHA-256, and a token opens its own guichet
only. Any other request to these paths is refused (401).

| Call | Body | Answer |
|---|---|---|
| `POST {base}/engine/poll` | `{ "engine": "name", "version": "x.y" }` | Waits up to 25 s. `{ "questions": [ { "id", "thread", "text", "history": [ {"q","a"} ], "tone"? } ] }` — empty list when nothing came. Marks the guichet **open** for 60 s. `tone` (optional, engine 0.2.0+): the guichet's writing style in free text (300 characters at most), which wins over the engine's `GUICHET_TONE`; left out or empty, the engine's own applies. |
| `POST {base}/engine/doing` | `{ "id", "text" }` | `{ "ok": true }` — a short progress line shown under the question ("searching…"). |
| `POST {base}/engine/answer` | `{ "id", "text", "sources": ["file.md"] }` | `{ "ok": true }` — the answer, Markdown. A question is answered once. Longer than the guichet's answer size (8000 characters by default): cut, with a line saying so (`"cut": true`). The sources are kept on the message (`sources`), and added as a last line (`Sources : \`file.md\``) when the text does not already name them. |

A question not answered within 3 minutes (the guichet's answer timeout) is answered by the relay itself: "The guichet could not
answer in time; try again." A question taken by a poll and not answered goes back to the queue
after 3 minutes.

## Browser side (the site's session)

The relay calls the host site's `identify(request)` to get `{ id, name }` or `null` (not signed in
→ 401). Each person has their own thread; nobody reads another's.

| Call | Body | Answer |
|---|---|---|
| `GET {base}/messages` | – | `{ "open", "messages", "steps", "status", "quota" }` in Parley's shape (what `parley-host` `read()` gives): messages `{ id, at, from: "person" \| "agent", kind: "say", text }`; while an answer is prepared, `status: { state: "working", note }` and its last progress line in `steps: [{ id, kind: "doing", note, at }]`; otherwise `status.state` is `"waiting"`. `quota` (or null): the question limit with the least left for this visitor, `{ used, max, what, window: "hour" \| "day", scope: "ip" \| "account" \| "total", retryAt }` — `retryAt` set once a limit is reached. |
| `POST {base}/say` | `{ "text" }` | `{ "ok": true, "id", "quota" }` — refused when closed (503), empty or longer than the question size (400, 2000 characters by default), while the same person's previous question waits (429 `one question at a time`), or over a limit (429 `{ error, retryAt, used, max, what, window, scope }`). |

Limits are counted per fixed window (the clock's hour, the site's day: "next question at 15:00"),
for what is asked (`questions`) and its size (`chars`), per visitor address (`ip`), per account (what
the site says the visitor is) and for the whole guichet (`total`). The PHP relay's defaults, per
address / account / guichet: 10 / 30 / 300 questions an hour, 40 / 100 / 500 a day, 60 000 /
150 000 / 2 000 000 characters a day. The Node.js relay (0.1) keeps its single limit of 30
questions per person per hour.

The relay keeps the last 50 exchanges of a thread and sends the last 6 as `history`.

## Limits and safety

- The engine never receives anything but a question's text, its thread's recent history and the
  guichet's tone. The tone is a style only: the engine puts it after its rules, which it never overrides.
- Files are not accepted from the browser.
- Text in either direction is plain Markdown; the display escapes HTML.
- The relay's journal (off unless the site turns it on): who asked, when, how long it took, answered or not (not the full text unless
  the host site asks for it).
