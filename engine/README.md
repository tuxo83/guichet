# Guichet

An AI that answers questions from **its documents** and can do **nothing else**: no tool, no
network but its model, secrets masked on the way in and on the way out.

- Answers from the passages it finds in its documents, cites them, and says so plainly when they
  do not hold the answer.
- Finds them by words and, with an embedding model, by meaning ("how do I sign up?" finds
  "Registration"); an index on disk means only new or changed files are read and embedded again.
- Checks its own answer and searches again for what is missing (four rounds at most), saying where
  it is while it works.
- Any model: Anthropic, Mistral, OpenAI, or any OpenAI-compatible server (Ollama, vLLM, LM Studio…).
- No dependency: Node.js 20.11 or later.

## Two ways to use it

**In a Clavarium conversation**: install it as the conversation's tool (see
`clavarium-tool.json`); people talk to it in the conversation's chat.

**On a website**: mount a relay in the site (`guichet-relay` for Node.js, `guichet-relay-php` for
PHP); the site's own login says who asks, each person has their own thread; the engine connects
**out** to the relay, so nothing has to reach the machine where it runs.

```sh
GUICHET_TOKEN=<a long random secret shared with the relay> \
GUICHET_PROVIDER=mistral GUICHET_API_KEY=... GUICHET_DOCS=/srv/docs \
node bin/guichet.mjs --relay https://intranet.example/guichet
```

## Settings (environment)

| Variable | What |
|---|---|
| `GUICHET_DOCS` | The folder of the documents (`/work/guichet` by default). Text files: Markdown, text, HTML, code, CSV, JSON, YAML…; Word (`.docx`); PDF when `pdftotext` (poppler-utils) is installed |
| `GUICHET_PROVIDER` | `anthropic` (default), `mistral`, `openai`, `compatible` |
| `GUICHET_MODEL` | The model; a sensible default per provider |
| `GUICHET_API_KEY` | The provider's key (optional for `compatible`) |
| `GUICHET_BASE_URL` | For `compatible`: the server's address, e.g. `http://127.0.0.1:11434/v1` |
| `GUICHET_EMBED_MODEL` | The embedding model, for the search by meaning: `bge-m3` by default on OVH AI Endpoints, none elsewhere (`none` turns it off). Without one, the search goes by words only |
| `GUICHET_EMBED_BASE_URL`, `GUICHET_EMBED_API_KEY` | An OpenAI-compatible `/embeddings` server, if not the chat one (Anthropic has no embeddings API: with it, give one here) |
| `GUICHET_INDEX` | Where the index is kept (`.guichet-index` beside `GUICHET_STATE`, i.e. in the home folder by default); never inside `GUICHET_DOCS` |
| `GUICHET_LANG` | `fr` (default) or `en` |
| `GUICHET_TONE` | A writing style in free text: « sobre et chaleureux », « vocabulaire de chevalerie, parchemins », « à la manière de Yoda »… Empty: neutral and sober. A relay may send each guichet's own with its questions (it wins) |
| `GUICHET_RELAY`, `GUICHET_TOKEN` | Relay mode: the guichet's address on the relay (`…/guichet/<id>` when the relay holds several), and its token (sent as `Authorization: Bearer` and as `X-Guichet-Token`) |

The protocol between the engine and a relay is in [PROTOCOL.md](../PROTOCOL.md).

## Search and index

Each document is cut into passages of 900 characters (overlapping by 150), secrets masked first.
A question finds its 6 passages by **BM25** (its words, rarer words weighing more) and, with an
embedding model, by **cosine similarity** of its vector to the passages'; both rankings are fused by
reciprocal rank. The check-and-search-again rounds use the same search.

The index (`GUICHET_INDEX`, one JSON file per documents folder) keeps per file its size, mtime,
SHA-256, passages and their vectors (Float32, base64) with the model's name. It is updated at start,
every 3 minutes and soon after a change in the folder: new and changed files are read and embedded
again, removed ones dropped; another embedding model rebuilds it all. Writes are atomic. Without
embeddings nothing is stored. While an update runs, questions are answered from what is ready: a
progress line says so, and the answer ends with one line saying it may be incomplete.

## Tone

`GUICHET_TONE` (or a relay's per-guichet `tone`) goes into the model's instructions as a style,
after the rules, which it never overrides. Without one the guichet is neutral and sober, fit for a
professional setting or a funeral service alike.

## Safety

- The model is asked with **no tool at all**: it can only write an answer.
- Passwords, keys and tokens found in the documents are masked before anything reaches the model,
  the embedding model or the index on disk; an answer that still holds one is masked and says so.
- What the documents and the messages say is treated as data, never as instructions.
- A relay only ever hands the engine a question's text and its thread's recent history.

## An example: Brumeterre

`examples/brumeterre/` is the knowledge base of an invented community of map-makers, in French
(events, a beginner's guide, mounts, rules, and a server page holding a fake password that must
never come out). It is what the tests ask, and a quick way to try a guichet.

## Tests

```sh
npm test                      # offline: a stand-in model and a stand-in embedder
GUICHET_LIVE=1 GUICHET_PROVIDER=compatible GUICHET_BASE_URL=https://oai.endpoints.kepler.ai.cloud.ovh.net/v1 \
GUICHET_MODEL=Mistral-Small-3.2-24B-Instruct-2506 GUICHET_API_KEY=... npm test   # also asks a real model
```

The real-model test asks Brumeterre's questions -- a date, a follow-up that needs the previous
exchange, a question the documents do not answer, a request for the password, and one that only
works by meaning (« m'enregistrer pour la veillée mensuelle » where the documents say
« Inscription ») -- and checks the answers loosely (no secret, nothing invented). It uses the
provider's embeddings when there are (bge-m3 on OVH), and `GUICHET_TONE` when set.
