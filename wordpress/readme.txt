=== Guichet ===
Contributors: tuxo83
Tags: assistant, chat, ai, documentation, support
Requires at least: 6.5
Tested up to: 7.1
Requires PHP: 8.1
Stable tag: 0.1.2
License: MIT
License URI: https://opensource.org/licenses/MIT

An assistant that answers your visitors from your documents, and can do nothing else.

== Description ==

A **guichet** is a chat on your site where people ask questions; a Guichet engine answers from its
documents, with a model that has no tool at all. The engine runs anywhere (a Clavarium conversation,
a server) and connects **out** to your site: your site never calls it, nothing has to reach it.

* Several guichets, each with its audience: administrators only (by default), signed-in members of
  chosen roles, or everyone (visitors known by IP address + cookie).
* Limits per hour and per day, per IP address, per account and for the whole guichet: questions and
  total characters; question and answer sizes; an answer timeout; one question at a time.
* Engine tokens per guichet, one per engine, shown once, revocable; only their hash is kept.
* Open or closed: open while an engine is connected (it polled in the last minute); on the site,
  asking is turned off while closed.
* An optional journal: who, when, how long, answered or not; the text of questions only if you ask.
* The shortcode `[guichet id="…"]` (options `hauteur="520"`, `titre="non"`) or the **Guichet** block.
* No database table: threads, tokens and counters are JSON files in a folder of their own.

The chat is Parley's display (clavarium-parley 0.17.30-next.1, MIT, in `assets/parley/`).

== Installation ==

1. Upload the `guichet` folder to `wp-content/plugins/` and activate it.
2. Settings › Guichet › Add a guichet: its name, identifier, audience and limits.
3. Tokens tab: create a token for the engine (copy it at once: it is not shown again).
4. Start the engine with the guichet's address and that token (Integration tab):

    GUICHET_RELAY=https://site.example/wp-json/guichet/v1/<id> GUICHET_TOKEN=gch_… guichet

5. Put `[guichet id="<id>"]` or the Guichet block on a page.

= Where the files go =

Best outside the web root: add `define( 'GUICHET_DATA_DIR', '/var/lib/guichet' );` to
`wp-config.php` (a folder PHP can write). Otherwise they go under `wp-content/uploads/guichet-<random>/`
with deny rules (`.htaccess`, `index.php`). nginx ignores `.htaccess`: there, the folder's random
name is what keeps it unknown; prefer GUICHET_DATA_DIR, or add a `location` that denies it.

= Hosts that drop the Authorization header =

Apache with PHP-FPM, and some security plugins, drop or take over `Authorization` before WordPress
sees it. The engine (0.1.1 or later) also sends its token as `X-Guichet-Token`, which the plugin
accepts. With older engines: `CGIPassAuth On`, or `SetEnvIf Authorization "(.*)" HTTP_AUTHORIZATION=$1`.

= Long polling =

The engine's poll holds a PHP worker up to 20 seconds while it waits for a question. On a host with
very few workers, lower it: `add_filter( 'guichet_poll_seconds', fn () => 10 );`.

= Behind a proxy =

Per-IP limits read `REMOTE_ADDR`. Behind a reverse proxy or a CDN, say how to read the visitor's
address with the `guichet_client_ip` filter (only from a header your proxy sets).

== Frequently Asked Questions ==

= Does the site send my documents anywhere? =

No. The documents stay with the engine. The site only passes questions and answers.

= What does the engine receive? =

A question's text and its thread's last exchanges. Nothing about the visitor but a thread id.

== Testing ==

`tests/run.sh`: every PHP file parses, then the settings and limits test (no WordPress needed).
The relay itself is tested in ../relay-php. The end-to-end path (admin screens, a token, the
real engine through `/wp-json/guichet/v1/<id>`, a member asking in a browser) was checked in a
WordPress 7.1 with SQLite.

== Changelog ==

= 0.1.2 =
* A **Tone** per guichet (General tab): the answers' style in free text, e.g. "sober and warm"; empty, the answers stay neutral and sober. Needs the Guichet engine 0.2.0. Relay: guichet-relay-php 0.2.1.

= 0.1.1 =
* Limits per IP apply to visitors who are not signed in only: members are counted per account (an office or a home behind one address no longer shares one limit).

= 0.1.0 =
* First version: several guichets, access by role, windowed limits, tokens, journal, shortcode and
  block, French translation. Relay: guichet-relay-php 0.2.0.
