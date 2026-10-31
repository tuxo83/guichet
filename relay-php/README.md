# guichet-relay-php

The **Guichet** relay for PHP sites (8.1 or later, no extension beyond the defaults, no database):
the same protocol as the Node.js relay (see the engine's `PROTOCOL.md`). One relay holds **several
guichets**, each with its own folder, settings, limits and engine tokens; plain JSON files, each
change under a lock.

```php
require 'src/GuichetRelay.php';

$relay = new GuichetRelay([
    'dir'      => '/var/lib/guichet',                                   // outside the web root
    'guichets' => ['help' => ['lang' => 'fr'], 'sales' => ['lang' => 'en', 'maxAnswer' => 4000]],
    'identify' => fn (string $guichet) => isset($_SESSION['user']) ? ['id' => $_SESSION['user']['id']] : null,
    'timezone' => 'Europe/Paris',                                       // when "a day" starts
    'pollSeconds' => 25,                                                // lower it where a PHP worker held that long is costly
]);

// In the front controller, for the paths under /guichet:
$relay->handle($_SERVER['REQUEST_METHOD'], $pathAfterGuichet);   // '/help/messages', '/help/say', '/help/engine/poll'…
```

`guichets` may also be a function `fn (string $id): ?array` (settings read from the site's own
storage). A framework that has its own request object calls
`$relay->respond($method, $path, ['who' => …, 'ip' => …, 'token' => …, 'body' => …])` and gets
`[status, body]` back instead.

## Engine tokens

Each guichet has its own tokens, one per engine, revocable; only their SHA-256 is kept
(`guichets/<id>/tokens.json`), with when each was last seen and which engine version used it.

```php
$t = $relay->createToken('help', 'main server');   // $t['token'] (gch_…): shown once, never again
$relay->revokeToken('help', $t['id']);
$relay->tokens('help');                            // the list, without hashes
```

The engine is then pointed at the guichet's address:
`GUICHET_TOKEN=gch_… guichet --relay https://site.example/guichet/help`. The token arrives in
`Authorization` and, since engine 0.1.1, in `X-Guichet-Token` as well: with Apache + PHP-FPM,
`Authorization` may be dropped unless passed on (`CGIPassAuth On`, or
`SetEnvIf Authorization "(.*)" HTTP_AUTHORIZATION=$1`); the second header gets through anyway.

## A guichet's settings

| Setting | Default | What |
|---|---|---|
| `lang` | `fr` | The relay's own lines (late answer, answer cut): `fr` or `en` |
| `limits` | see below | `[{ what: questions\|chars, window: hour\|day, ip, account, total }]`; a scope left out or `''` has no limit |
| `maxQuestion` | 2000 | Characters in a question (400 above) |
| `maxAnswer` | 8000 | Characters in an answer: cut above, and said |
| `answerSeconds` | 180 | Not answered by then: the relay says so and drops it |
| `oneAtATime` | true | A person's next question waits for the answer to the previous one |
| `historyKept`, `historySent` | 50, 6 | Exchanges kept in a thread, and sent to the engine with a question |
| `journal`, `journalText` | false, false | `journal.jsonl` in the guichet's folder: who, when, how long, answered or not; the text of questions only with `journalText` |
| `tone` | `''` | The answers' writing style in free text (« sobre et chaleureux », « à la manière de Yoda »…), 300 characters at most, sent to the engine with each question (`questions[].tone`, engine 0.2.0+); empty: the engine's own (`GUICHET_TONE`, neutral by default) |

Default limits, per address / per account / for the guichet: 10 / 30 / 300 questions an hour,
40 / 100 / 500 a day, 60 000 / 150 000 / 2 000 000 characters a day. Windows are fixed (the clock's
hour, the site's day), so a refusal (429) says when the next question is possible:
`{ error, retryAt, used, max, what, window, scope }`; `GET …/messages` gives the same as `quota`,
for the chat's "8 / 30 this hour".

For the site's screens: `status($id)` (open, last poll, waiting, today's numbers, active tokens),
`journalLines($id)`, `forget($id)` (a guichet removed: its files go).

## One guichet (as in 0.1)

`'guichet' => 'main', 'token' => getenv('GUICHET_TOKEN')` (24 characters at least): the paths are
then `/messages`, `/say`, `/engine/…` without an id, and the shared token works beside any token
made with `createToken('main', …)`. 0.1's `perHour`, `maxText`, `answerSeconds` still apply.

## Example

```sh
GUICHET_GUICHETS='{"help":{}}' GUICHET_RELAY_DIR=/tmp/guichet php -S 127.0.0.1:4300 example/index.php
php example/token.php help "my engine"          # with the same two variables: prints the token
# then http://127.0.0.1:4300/?g=help
```
(Parley's display files go under `example/parley/`.)

## Tests

They drive the relay over HTTP through `php -S`, and the real engine against it when `../engine`
sits beside this folder (Node.js runs them):

```sh
npm test
```
