/* THE EXCHANGE, SHOWN. One file, no framework, for any page.
 *
 *   import { mount } from './parley-ui.js';
 *   mount(element, { load, send, words, open, terminal, remind, view, onView, locale,
 *                    voice, autoSend, onAutoSend, replies, enter, touch, attach, act,
 *                    markdown, picture, diagram, highlight, math, refs, agentName, agentTool, react, reactions, back,
 *                    window, search, side });
 *
 *   load(options)          resolves with what parley-host.mjs read(options) gives;
 *                          the application may add lines of its own to its
 *                          messages: { from: 'system', id, at, text, level,
 *                          tone, topic, brief, actions: [{ id, label }] } (see
 *                          LINES OF THE APPLICATION, below). `options` asks
 *                          for A PART OF THE THREAD: { last } or { days } at
 *                          first; { since: cursor } at each look, once it gave
 *                          a cursor (only what changed comes); { before } for
 *                          the page before what is shown ("Earlier
 *                          messages"); { before, from } up to a message
 *                          found. An application that ignores them gives it
 *                          all at each look, as before.
 *   window                 { messages: N } or { days: D }: what is shown at
 *                          first (the newest 200 messages by default); the
 *                          rest on demand, a page at a time
 *                          The handle's reveal(id) shows one message (its id, or
 *                          its first 8 characters or more): the pages before
 *                          what is shown are brought until it is there, then
 *                          the thread scrolls to it and marks it a moment;
 *                          resolves true when shown, false when not found.
 *   search(text)           optional: resolves with what the host's search()
 *                          gives: the whole thread searched, however little
 *                          of it is shown; a message found further back is
 *                          opened at its place, the part up to it brought
 *   send(text, answers, files, { via, picked })
 *                          the person wrote; `answers` is the id of the
 *                          question it answers (a choice, or a text written
 *                          in reply); `files`, what `attach` gave back for
 *                          the files they attached; `picked`, the choices
 *                          ticked of a question that lets several be ticked
 *                          (the text says them too, one per line); `replies`,
 *                          the answers to questions asked together, one per
 *                          question: { id, picked } or { id, text } (the text
 *                          says them all, one line each)
 *   words                  the words of the screen: texts(lang, own) of
 *                          parley-host.mjs, or any object with those keys
 *   open(file)             optional: opens a file the agent showed or cited
 *                          (`file` is { path, open }: `open` is the
 *                          application's own reference, null when it cannot
 *                          be opened)
 *   terminal()             optional: shows the agent's terminal
 *   remind()               optional: tells the agent again that a message waits
 *   view                   'simple' or 'detailed'; onView(view) when changed
 *   back                   what Back does to what Parley opens over the
 *                          thread (the large picture, the media, the
 *                          reactions, the search, the menu of settings):
 *                          true (the default): each one opened takes a step
 *                          of the page's history, and Back closes the one on
 *                          top; closed by its own button or Escape, its step
 *                          is taken back. false: the history is not touched.
 *                          Or the page's own steps, { open(name, close) =>
 *                          token, closed(token) }: open() when one shows
 *                          (close() closes it), closed() when it closed by
 *                          itself
 *   locale                 optional: how times and days are written (the
 *                          device's own way when not given)
 *   agentName              optional: the agent's name, said above its messages
 *                          (default: the neutral word of the dictionary)
 *   agentTool              optional: which tool it is, said small beside its
 *                          name in the detailed view
 *   card(message)          optional: the host's own way to attach a message to
 *                          something of its own (a card of its binders): offered
 *                          in the message's menu, beside Reply ({ id, text, short })
 *   react(to, reaction)    optional: puts a reaction of the set on a message
 *                          of the agent (null: takes it back); `reactions`
 *                          replaces the set, [{ id, icon }] (REACTIONS)
 *   (data.about)           optional, given with the data: [{ label, text,
 *                          tone }], its machine, on the side of the detailed
 *                          view
 *
 * WHAT THE AGENT WRITES, RENDERED (`markdown: true`; without it, plain text).
 * Its Markdown is read into plain data (markdown(), below), then the page is
 * built from that data node by node: never a string of markup, from the
 * agent or from anywhere. Headings, lists, tasks, emphasis, ==highlight==,
 * tables (wide ones scroll in their message), quotes, the alerts of GitHub
 * (> [!IMPORTANT] ... as coloured boxes), badges ([ok] [todo] [blocked]
 * [warn]), code blocks with a Copy button. A link opens only when it is
 * http or https (in a new tab, sending nothing of this page), or a path the
 * application can open (`open`); any other is its text. A picture is shown
 * only from a path the application can open (`picture`): never from
 * anywhere else, since loading it would tell that place who reads. Slots of
 * the application, each optional:
 *   picture(file)          the address of a picture the person may see
 *                          (`file` as for open), or null; pictures the agent
 *                          showed, cited, or the person attached are shown
 *                          in the thread, a click opens them large, to zoom
 *   diagram(code)          resolves with the SVG text of a ```mermaid block,
 *                          drawn by the application's own renderer; it is
 *                          shown as a picture (an <img>: a picture runs
 *                          nothing and loads nothing); no slot, or a
 *                          failure: the block is shown as code
 *   highlight(code, lang)  resolves with a token tree (strings, and
 *                          { type, alias, content } as Prism.tokenize
 *                          gives) to colour a code block; spans are made
 *                          here from it, never its markup
 *   math                   { url, css }: another copy of KaTeX for formulas
 *                          ($...$, $$...$$, \(...\), \[...\]); default:
 *                          Parley's own, ui/vendor/katex/, loaded on the first
 *                          formula; false: formulas shown as written
 *   refs                   { label(ref), open(ref) }: a person of a ```family
 *                          or a zone of a ```picture may carry a ref, as the
 *                          agent wrote it ([Anna](app:people/12)); label names
 *                          the button of its card (null: none), open opens it.
 *                          Parley reads nothing in a ref.
 *
 * A PANEL BESIDE THE THREAD (`side`), optional: a list the application
 * keeps -- its tasks, its batches -- shown on the right of the thread, never
 * over it. Parley knows nothing of where the list comes from:
 *   side                   { title, items, tick(id, on), open(id), folded,
 *                          onFold(folded), count, action: { label, run } }
 *                          items: [{ id, title, text, state, done, checked, owner,
 *                          tone ('active' | 'attention'), tick: false }];
 *                          `text`: what it is, for a person, under its title (two lines shown);
 *                          those not done first, as given; those done
 *                          folded under "Done (n)". What is set is said (a
 *                          state, an owner), what is empty is not. `tick`
 *                          gives each item not done a box to tick (its
 *                          promise refused: said in one line, the box as it
 *                          was); `open`, a click on its title. `count`: the
 *                          number on the bar's button (default: those not
 *                          done; 0: none). `action`: one button under the
 *                          list ("Start the list"). Given again with
 *                          `handle.side = {...}` (null: no panel).
 *                          Wide (PANEL_PX and more): beside the thread,
 *                          folded and unfolded from the bar; `folded` is
 *                          its first state, the person's choice is told to
 *                          onFold for the application to keep (per
 *                          conversation, say), and `handle.folded = v`
 *                          sets it. Narrow: a sheet over the thread, opened
 *                          from the bar, closed by Back, Escape or a tap
 *                          elsewhere.
 *
 * TWO VERSIONS OF A MESSAGE. An agent may give a long message a short one
 * (`short`: a title of one or two lines). The simple view shows the short
 * one, and "See the details" unfolds the rest (kept unfolded for that
 * message); a long message without one is folded after about twelve lines.
 * Either way its > [!IMPORTANT] boxes stay in sight. A question is never
 * folded. The detailed view unfolds everything.
 *
 * SLOTS THE APPLICATION FILLS, each optional; without them, none is shown:
 *   voice                  { listen(on) }: dictation. listen opens the
 *                          microphone and resolves with a function that
 *                          closes it; it calls on.phrase(text) for each
 *                          phrase understood, on.state(word) with
 *                          calibrating, listening, hearing or transcribing,
 *                          on.speech() when speech begins, on.error(message).
 *                          A button beside Send; what is said goes into the
 *                          box. Changed later with `handle.voice = ...`.
 *                          Dictating moves nothing on the screen: what the
 *                          microphone does is said inside the box (its
 *                          placeholder, and a small label on its frame that
 *                          takes no room), never on a line of its own.
 *   autoSend, onAutoSend   "send when I stop": what was said is sent once the
 *                          person stops talking. A choice of the device, not
 *                          of the moment: it is in the small menu of settings
 *                          beside the view, shown only with `voice`, and the
 *                          microphone wears a dot while it is on. The
 *                          person's choice is told to onAutoSend(on), for the
 *                          application to keep.
 *   replies                [{ label, text, send }]: ready answers, above the
 *                          box, after the choices of the question the agent
 *                          asks now. `send: true` sends the text at once,
 *                          otherwise it is put in the box to be completed.
 *                          Changed later with `handle.replies = [...]`.
 *   enter                  'auto' (default: Enter sends where there is a fine
 *                          pointer, a new line on a touch screen), 'send' or
 *                          'newline'. Shift+Enter is always a new line, and
 *                          Ctrl+Enter always sends.
 *   attach                 { upload(file, name) }: files the person attaches
 *                          to a message: picked with a button beside the
 *                          box, pasted into it, or dropped on the chat. Each
 *                          is shown above the box until it is sent (a
 *                          picture as a picture), and on Send each is given
 *                          to upload (a File), which resolves with
 *                          { path, name, size }: where the agent will find
 *                          it. Then the message goes, with them. A message
 *                          may be files alone.
 *   act(id, line)          a button of a line of the application was pressed
 *   touch                  true on a touch screen (default: any coarse
 *                          pointer). The box is then never focused by the
 *                          page, only by the person's finger, so that the
 *                          keyboard never comes up by itself; and a tap on a
 *                          button of the box leaves it open.
 *
 * WHILE IT WORKS, WHAT IT DOES NOW. The agent says in one line what it is
 * doing (`parley doing`); the newest line is shown at the end of the thread,
 * moving, until ITS next message comes (a message of the person does not
 * take it away): then it goes, and the steps that led there are one click
 * away: on that message in the simple view, unfolded above it in the
 * detailed one. When it waits for the person, that is said once, at the end
 * of the thread, until the person writes: a state is not a step.
 *
 * EACH MESSAGE OF THE PERSON says where it is, by a small sign in its corner
 * (its words on hover): sent, not read yet; read; being worked on; handled
 * (the agent answered after reading it, or said it was done). The simple
 * view signs only what is not handled yet; the detailed one signs all.
 *
 * TIMES, as a chat shows them: the day when it changes, the time when long
 * passed between two messages, and the time of each message on hover (a long
 * press on a touch screen).
 *
 * TWO VIEWS OF ONE EXCHANGE. Simple: the agent's messages across a reading
 * column, the person's in bubbles on the right, the one line of what it does
 * now, the choices to answer with, the files that can be opened, times on
 * hover, steps folded into the message they led to (a click on it opens
 * them) -- nothing the person cannot act on. Detailed: every step unfolded
 * between the messages with its time and state, the time of every message,
 * where the agent says it is, every file it showed with its path (one that
 * cannot be opened is said so), and a way to its terminal.
 *
 * LINES OF THE APPLICATION. What happens around the agent (its machine short
 * of memory, restarted, its work sent somewhere) is said in the thread where
 * it happened, as a grey line across with its time and the application's
 * buttons, not as a bubble of either side. The application keeps them, gives
 * them with the messages, and gives each a neutral LEVEL; nothing else is
 * decided here: 'needs-you' is shown in both views; 'news' in both, as a
 * compact line in the simple one where a run of lines of one `topic` is one
 * line ("Sent (3): dev, preprod, dev", each `brief`); 'trace' in the
 * detailed view only. ('warn' and 'bad' read as needs-you, 'info' as news.)
 *
 * EVERYTHING AN AGENT WROTE, AND EVERY WORD OF THE DICTIONARY, IS PUT ON THE
 * PAGE AS TEXT, never as markup: the first is chosen by a program, the
 * second by whoever wrote the dictionary.
 */
import { icon, fileIcon } from './parley-icons.js';

export const VIEWS = Object.freeze(['simple', 'detailed']);
/* The words this screen uses: a dictionary needs these keys. */
export const KEYS = Object.freeze(['send', 'placeholder', 'empty', 'view', 'simple', 'detailed', 'working', 'waiting', 'done', 'no-status', 'asks', 'open', 'outside',
    'not-read', 'read', 'remind', 'reminded', 'steps', 'no-steps', 'files', 'no-files', 'terminal', 'not-sent', 'step-one', 'steps-many', 'today', 'yesterday', 'quiet', 'stopped',
    'mic', 'mic-stop', 'auto-send', 'auto-on', 'settings', 'voice-placeholder', 'voice-calibrating', 'voice-listening', 'voice-hearing', 'voice-transcribing', 'voice-wait', 'voice-off', 'replies', 'replies-more', 'replies-less',
    'recommended', 'recommended-value', 'recommended-order', 'suggestion', 'suggest-take',
    'attach', 'remove-file', 'sending-files', 'attach-where', 'draw-open', 'draw-again', 'drawn-from', 'draw-marked', 'draw-colour', 'draw-undo', 'draw-clear', 'draw-cancel', 'draw-done', 'draw-note', 'draw-hint',
    'copy', 'copied', 'see-details', 'see-more', 'see-less', 'note', 'tip', 'important', 'warning', 'caution', 'badge-ok', 'badge-todo', 'badge-blocked', 'badge-warn',
    'waits-you', 'waits-you-note', 'busy', 'pulse', 'state-sent', 'state-read', 'state-working', 'state-done', 'sent-at', 'read-at', 'done-at',
    'reply', 'to-card', 'other-answer', 'group-count', 'group-step', 'group-next', 'group-back', 'group-review', 'group-check', 'group-modify', 'group-send', 'group-several', 'group-own', 'group-missing',
    'replying', 'not-a-reply', 'in-reply', 'closed', 'you', 'agent', 'drop', 'picture', 'diagram', 'not-shown', 'grouped',
    'zoom-in', 'zoom-out', 'zoom-actual', 'zoom-fit', 'zoom-actual-short', 'zoom-fit-short', 'close', 'previous', 'next', 'search', 'found', 'newest', 'dictation', 'auto-send-off',
    'react', 'react-remove', 'react-agree', 'react-go', 'react-disagree', 'react-unclear', 'react-stop', 'react-redo', 'react-later', 'react-love',
    'react-agree-hint', 'react-go-hint', 'react-disagree-hint', 'react-unclear-hint', 'react-stop-hint', 'react-redo-hint', 'react-later-hint', 'react-love-hint',
    'decide', 'media', 'media-pictures', 'media-files', 'media-none', 'see-in-thread', 'done-end', 'done-end-note', 'dictated', 'side-now', 'side-machine', 'side-nothing', 'history-changed',
    'earlier', 'media-earlier', 'panel', 'panel-show', 'panel-hide', 'panel-empty', 'panel-done', 'panel-not-saved']);
/* THE REACTIONS offered by default, each with its Lucide icon; their words
   are "react-<id>" (shown under the icon) and "react-<id>-hint" (on hover).
   The same ids as REACTIONS of parley-host.mjs, which says which wake. */
export const REACTIONS = Object.freeze([
    { id: 'agree', icon: 'thumbs-up' }, { id: 'go', icon: 'circle-check' }, { id: 'disagree', icon: 'thumbs-down' }, { id: 'unclear', icon: 'circle-question-mark' },
    { id: 'stop', icon: 'octagon-x' }, { id: 'redo', icon: 'refresh-ccw' }, { id: 'later', icon: 'hourglass' }, { id: 'love', icon: 'heart' },
].map(Object.freeze));
/* The order of the reactions in their choice: "Go ahead" first, "Stop" always last, far from it. */
const PICKER_ORDER = Object.freeze(['go', 'agree', 'unclear', 'love', 'later', 'redo', 'disagree']);
/* Narrower than this, the choice of reactions is a panel that rises from the bottom. */
export const SHEET_PX = 600;
/* Narrower than this, the detailed view folds its files into one line. */
export const NARROW_PX = 736;
/* Between two messages further apart than this, the time is said. */
export const GAP_MS = 60 * 60 * 1000;
/* What it does now stops moving when nothing came for this long: it may have stopped. */
export const STALE_MS = 15 * 60 * 1000;
/* "Remind it" is offered only for a message not read this long, when the agent did nothing for as long. */
export const IDLE_MS = 2 * 60 * 1000;
/* The agent read the person's message and said nothing yet: "Received, thinking..." after this long (at once by default),
   and "No answer yet" after the second. Parley says it was received, never what the agent does. */
export const RECEIVED_MS = 0;
/* So many characters of a message's id at least point to it (`reveal`), as `parley read` shows them. */
const ID_LEAST = 8;
/* What is shown at first, unless the application says otherwise (`window`): the newest so many messages. */
export const WINDOW = 200;
export const NO_ANSWER_MS = 5 * 60 * 1000;
/* The pulse of the agent's tool (its hooks: it acts, its turn ended) is a sign of life this long after its last beat:
   "Working..." where nothing would be said, and what it does now does not go still. Older: as if there were none. */
export const PULSE_MS = 20 * 60 * 1000;
/* A press this long on a touch screen shows a message's time. */
export const PRESS_MS = 450;
/* Dictating with "send when I stop": sent this long after the last phrase was written, unless the person speaks again. */
export const AUTO_SEND_MS = 1200;
/* Send pressed while a phrase is still being written: sent once it is, or after this long with what is there. */
export const WRITE_WAIT_MS = 15_000;
/* Questions asked together: so many at most. */
export const GROUP_MAX = 5;
/* Ready answers: so many at most, each label so long. */
export const REPLIES_MAX = 40;
export const LABEL_MAX = 40;
export const TEXT_MAX = 4000;
/* Files attached to one message, at most; buttons on a line of the application. */
export const FILES_MAX = 10;
export const ACTIONS_MAX = 4;
/* Words of a line of the application that are buttons (a commit it names). */
export const LINKS_MAX = 8;
/* A message without a short version is folded beyond about so many lines (simple view). */
export const FOLD_LINES = 12;
/* Read no deeper than this: quotes in lists in quotes... */
const DEPTH_MAX = 8;
export const LEVELS = Object.freeze(['needs-you', 'news', 'trace']);
export const ALERTS = Object.freeze(['note', 'tip', 'important', 'warning', 'caution']);
export const BADGES = Object.freeze(['ok', 'todo', 'blocked', 'warn']);
const PICTURE = /\.(png|jpe?g|gif|webp)$/i;
/* A file's name as a title, when it was given none: no extension, no dashes. */
export const titleOf = (name) => { const t = String(name ?? '').split('/').pop().replace(/\.[a-z0-9]{1,8}$/i, '').replace(/[-_.]+/g, ' ').replace(/\s+/g, ' ').trim(); return t ? t[0].toUpperCase() + t.slice(1) : String(name ?? ''); };

const fill = (word, values = {}) => String(word ?? '').replace(/\{([a-z]+)\}/g, (all, key) => (Object.hasOwn(values, key) ? String(values[key]) : all));
const said = (words, key, values) => fill(typeof words?.[key] === 'string' ? words[key] : key, values);
const nameOf = (path) => String(path ?? '').split('/').pop();
/* A size, as a person reads it. */
export const sizeText = (n) => (!Number.isInteger(n) || n < 0 ? '' : n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : n >= 1024 ? `${Math.round(n / 1024)} KB` : `${n} B`);
const stamp = (at) => { const t = Date.parse(at); return Number.isNaN(t) ? null : t; };
/* Written the device's way, or the given locale's; a locale that is not one is the device's. */
const format = (t, locale, options) => { if (t === null) return ''; const d = new Date(t); try { return d.toLocaleString(locale, options); } catch { return d.toLocaleString(undefined, options); } };
const clock = (t, locale) => format(t, locale, { timeStyle: 'short' });
const whole = (t, locale) => format(t, locale, { dateStyle: 'full', timeStyle: 'short' });
const dayKey = (t) => { const d = new Date(t); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };
function dayText(t, now, words, locale) {
    if (dayKey(t) === dayKey(now)) return said(words, 'today');
    const before = new Date(now); before.setDate(before.getDate() - 1);
    if (dayKey(t) === dayKey(before.getTime())) return said(words, 'yesterday');
    return format(t, locale, new Date(t).getFullYear() === new Date(now).getFullYear() ? { weekday: 'long', day: 'numeric', month: 'long' } : { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
/* One line of at most n characters: cut at the end of a word (never inside one, unless it is
   the only word), and "…" says that more follows. */
const cut = (text, n) => {
    const one = String(text ?? '').replace(/\s+/g, ' ').trim();
    if (one.length <= n) return one;
    const head = one.slice(0, n - 1);
    const space = head.lastIndexOf(' ');
    return `${(space > n / 2 ? head.slice(0, space) : head).replace(/[\s,;:.\-–—]+$/, '')}…`;
};

/* ---- MARKDOWN, READ INTO PLAIN DATA ----
   Blocks: { t: 'p'|'h'|'hr'|'code'|'quote'|'alert'|'list'|'table', ... }.
   Inlines: { t: 'text'|'br'|'code'|'em'|'strong'|'del'|'mark'|'link'|'img'|'badge', ... }.
   Nothing here is markup: an HTML tag the agent wrote is text, and is shown as such. */

/* A link the page may follow: http or https only, made whole by the URL parser
   (so that "jav&#x61;script:", " javascript:", "JaVaScRiPt:" and the like are
   what they are: not http). Anything else: null. */
export function safeLink(href) {
    const raw = String(href ?? '').trim();
    if (!/^https?:\/\//i.test(raw)) return null;
    try { const u = new URL(raw); return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : null; } catch { return null; }
}

const ESCAPABLE = /[\\`*_{}[\]()#+\-.!|~=<>"'$]/;
/* A formula is read as it was written, up to this many characters; a longer one stays text. */
export const MATH_MAX = 4000;
const URL_AT = /^https?:\/\/[^\s<>()[\]"'`]+(?:\([^\s<>()]*\)[^\s<>()[\]"'`]*)*/i;
const PAIRS = [['**', 'strong'], ['__', 'strong'], ['~~', 'del'], ['==', 'mark'], ['*', 'em'], ['_', 'em']];
/* A secret the host lifted out of a message (secret-scan.mjs): the message keeps only this marker, shown
   here as stars and never as the value. The angle brackets (U+27E8/27E9) are vanishingly rare in real text. */
const SECRET_REF = /^⟨secret:(SECRET_[0-9A-F]{10})(?:@\d+)?⟩/;
const SECRET_REF_G = /⟨secret:(SECRET_[0-9A-F]{10})(?:@\d+)?⟩/g;
export const maskSecrets = (text) => String(text ?? '').replace(SECRET_REF_G, '•••••');

/* The stars chip for a lifted secret, drawn the same wherever a message carries one -- the agent's rendered
   Markdown (inlines) and the person's own plain bubble. Shows its time left and a way to forget it when the
   application gave the live map and a forget callback; otherwise plain stars. Never the value. */
function secretChipEl(name, words, liveSecrets, forget) {
    const chip = el('span', 'parley-secret'); chip.title = said(words, 'secret-hint');
    chip.append(el('span', 'parley-secret-dots', '•••••'));
    const live = (typeof liveSecrets === 'function' ? liveSecrets() : liveSecrets)?.[name];
    const mins = live ? Math.max(1, Math.round(live.expiresInMs / 60_000)) : 0;
    chip.append(el('span', 'parley-secret-label', live ? said(words, 'secret-left', { mins }) : said(words, 'secret')));
    if (live && forget) { const x = el('button', 'parley-secret-forget'); x.type = 'button'; x.append(sign('trash')); x.title = said(words, 'secret-forget'); x.setAttribute('aria-label', said(words, 'secret-forget')); x.addEventListener('click', (e) => { e.stopPropagation(); forget(name); }); chip.append(x); }
    return chip;
}
/* Plain text (the person's own words), with any lifted-secret marker turned into the chip -- not Markdown. */
function textWithSecrets(text, into, words, liveSecrets, forget) {
    const s = String(text ?? ''); let last = 0;
    for (const m of s.matchAll(SECRET_REF_G)) {
        if (m.index > last) into.append(s.slice(last, m.index));
        into.append(secretChipEl(m[1], words, liveSecrets, forget));
        last = m.index + m[0].length;
    }
    if (last < s.length) into.append(s.slice(last));
}

export function inline(text, depth = 0) {
    const s = String(text ?? '');
    const out = [];
    let buffer = '';
    const flush = () => { if (buffer) { out.push({ t: 'text', v: buffer }); buffer = ''; } };
    const word = (ch) => /[\p{L}\p{N}]/u.test(ch ?? '');
    let i = 0;
    while (i < s.length) {
        const c = s[i];
        /* A secret lifted out by the host: one node, shown as stars; its value is never in the thread. */
        if (c === '⟨') { const m = SECRET_REF.exec(s.slice(i)); if (m) { flush(); out.push({ t: 'secret', name: m[1] }); i += m[0].length; continue; } }
        /* A formula, \( ... \) or \[ ... \]: read before an escaped bracket, when it closes. */
        if (c === '\\' && (s[i + 1] === '(' || s[i + 1] === '[')) {
            const end = s.indexOf(s[i + 1] === '(' ? '\\)' : '\\]', i + 2);
            const tex = end > 0 ? s.slice(i + 2, end).trim() : '';
            if (tex && tex.length <= MATH_MAX) { flush(); out.push({ t: 'math', tex, display: s[i + 1] === '[' }); i = end + 2; continue; }
        }
        if (c === '\\' && ESCAPABLE.test(s[i + 1] ?? '')) { buffer += s[i + 1]; i += 2; continue; }
        /* $...$ and $$...$$: not "$ 5", nor "5 $", nor before a digit, so that a price stays text. */
        if (c === '$') {
            const two = s[i + 1] === '$';
            const m = (two ? /^\$\$([^$]+?)\$\$/ : /^\$(?![\s$])([^$\n]+?)(?<![\s\\])\$(?!\d)/).exec(s.slice(i));
            if (m && m[1].trim() && m[1].length <= MATH_MAX) { flush(); out.push({ t: 'math', tex: m[1].trim(), display: two }); i += m[0].length; continue; }
            buffer += two ? '$$' : '$'; i += two ? 2 : 1; continue;
        }
        if (c === '\n') { flush(); out.push({ t: 'br' }); i += 1; continue; }
        if (c === '`') {
            const run = /^`+/.exec(s.slice(i))[0];
            const end = s.indexOf(run, i + run.length);
            if (end > 0) { flush(); let v = s.slice(i + run.length, end).replace(/\n/g, ' '); if (/^ .* $/.test(v)) v = v.slice(1, -1); out.push({ t: 'code', v }); i = end + run.length; continue; }
            buffer += run; i += run.length; continue;
        }
        if (c === '!' && s[i + 1] === '[') {
            const m = /^!\[([^\]\n]{0,300})\]\(\s*<?([^\s()<>]{1,2000})>?(?:\s+"[^"\n]*")?\s*\)/.exec(s.slice(i));
            if (m) { flush(); out.push({ t: 'img', alt: m[1], src: m[2] }); i += m[0].length; continue; }
        }
        if (c === '[') {
            const badge = /^\[(ok|todo|blocked|warn)\]/i.exec(s.slice(i));
            if (badge && s[i + badge[0].length] !== '(') { flush(); out.push({ t: 'badge', kind: badge[1].toLowerCase() }); i += badge[0].length; continue; }
            const m = /^\[((?:[^[\]\n]|\[[^[\]\n]*\]){0,500})\]\(\s*<?((?:[^\s()<>]|\([^\s()<>]*\)){1,2000})>?(?:\s+"[^"\n]*")?\s*\)/.exec(s.slice(i));
            if (m && depth < DEPTH_MAX) { flush(); out.push({ t: 'link', href: m[2], c: inline(m[1], depth + 1) }); i += m[0].length; continue; }
        }
        if (c === '<') {
            const m = /^<(https?:\/\/[^\s<>]{1,2000})>/i.exec(s.slice(i));
            if (m) { flush(); out.push({ t: 'link', href: m[1], c: [{ t: 'text', v: m[1] }] }); i += m[0].length; continue; }
        }
        /* A bare address, not one given to an attribute of a tag written as text. */
        if ((c === 'h' || c === 'H') && !word(s[i - 1]) && s[i - 1] !== '=' && !(/["']/.test(s[i - 1] ?? '') && s[i - 2] === '=')) {
            const m = URL_AT.exec(s.slice(i));
            if (m) { const url = m[0].replace(/[.,;:!?]+$/, ''); flush(); out.push({ t: 'link', href: url, c: [{ t: 'text', v: url }] }); i += url.length; continue; }
        }
        const pair = depth < DEPTH_MAX && PAIRS.find(([d]) => s.startsWith(d, i));
        if (pair) {
            const [d, t] = pair;
            const after = s[i + d.length];
            /* Opens only before a non-space; "_" only at the start of a word; "*" not doubled into the next. */
            const opens = after && !/\s/.test(after) && !(d.length === 1 && after === d) && !(d.length === 1 && word(s[i - 1]));
            if (opens) {
                let end = -1;
                for (let j = i + d.length + 1; j <= s.length - d.length; j += 1) {
                    if (s[j] === '\\') { j += 1; continue; }
                    if (s[j] === '`') { const run = /^`+/.exec(s.slice(j))[0]; const close = s.indexOf(run, j + run.length); if (close > 0) { j = close + run.length - 1; continue; } }
                    if (s.startsWith(d, j) && !/\s/.test(s[j - 1]) && !(d.length === 1 && (s[j + 1] === d || s[j - 1] === d)) && !(d.length === 1 && word(s[j + d.length]))) { end = j; break; }
                }
                if (end > 0) { flush(); out.push({ t, c: inline(s.slice(i + d.length, end), depth + 1) }); i = end + d.length; continue; }
            }
            buffer += d; i += d.length; continue;
        }
        buffer += c; i += 1;
    }
    flush();
    return out;
}

const FENCE = /^ {0,3}(`{3,}|~{3,})\s*([^\s`]*)[^`]*$/;
const HEADING = /^ {0,3}(#{1,6})(?:\s+(.*?))?\s*#*\s*$/;
const RULE = /^ {0,3}([-*_])(?:\s*\1){2,}\s*$/;
const QUOTE = /^ {0,3}> ?(.*)$/;
const ITEM = /^( {0,12})([-*+]|\d{1,9}[.)])(?:\s+(.*)|$)/;
const DELIMITER = /^\s*\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)*\|?\s*$/;
/* The cells of a row of a table: a "|" in a code span, or written "\|", is text. */
function cells(line) {
    let l = line.trim();
    if (l.startsWith('|')) l = l.slice(1);
    const out = [];
    let cell = '';
    for (let k = 0; k < l.length; k += 1) {
        const ch = l[k];
        if (ch === '\\' && l[k + 1] === '|') { cell += '\\|'; k += 1; continue; }
        if (ch === '`') { const run = /^`+/.exec(l.slice(k))[0]; const end = l.indexOf(run, k + run.length); if (end > 0) { cell += l.slice(k, end + run.length); k = end + run.length - 1; continue; } }
        if (ch === '|') { out.push(cell); cell = ''; continue; }
        cell += ch;
    }
    if (cell.trim() || !l.endsWith('|')) out.push(cell);
    return out.map((x) => x.trim());
}
/* A formula on lines of its own: $$ ... $$ or \[ ... \], opened at the start of a line. */
const MATH_OPEN = /^ {0,3}(\$\$|\\\[)/;
const startsBlock = (line, next) => MATH_OPEN.test(line) || FENCE.test(line) || HEADING.test(line) || RULE.test(line) || QUOTE.test(line) || ITEM.test(line) || (line.includes('|') && next !== undefined && DELIMITER.test(next) && next.includes('-'));

/* The blocks of a text; each top block says on which line it starts (`line`). */
export function markdown(text, depth = 0) {
    const lines = String(text ?? '').replace(/\r\n?/g, '\n').replace(/\t/g, '    ').split('\n');
    const blocks = [];
    let i = 0;
    while (i < lines.length) {
        const line = lines[i];
        const at = i;
        if (!line.trim()) { i += 1; continue; }
        let m = FENCE.exec(line);
        if (m) {
            const fence = m[1];
            const body = [];
            i += 1;
            while (i < lines.length && !(new RegExp(`^ {0,3}${fence[0] === '`' ? '`' : '~'}{${fence.length},}\\s*$`).test(lines[i]))) body.push(lines[i++]);
            i += 1;
            blocks.push({ t: 'code', lang: m[2].toLowerCase().replace(/[^a-z0-9+#.-]/g, '').slice(0, 30), text: body.join('\n'), line: at });
            continue;
        }
        if ((m = MATH_OPEN.exec(line))) {
            const close = m[1] === '$$' ? '$$' : '\\]';
            const first = line.trim().slice(2);
            const body = [];
            let rest = '';
            let k = i;
            let done = false;
            for (let piece = first; k < lines.length && k - i < 200; piece = lines[++k]?.trim() ?? '') {
                const end = piece.indexOf(close);
                if (end >= 0) { body.push(piece.slice(0, end)); rest = piece.slice(end + 2).trim(); done = true; break; }
                body.push(piece);
            }
            const tex = body.join('\n').trim();
            /* Closed, alone on its lines, not too long: a formula; otherwise the lines are read as text. */
            if (done && !rest && tex && tex.length <= MATH_MAX) { blocks.push({ t: 'math', tex, display: true, line: at }); i = k + 1; continue; }
        }
        if ((m = HEADING.exec(line))) { blocks.push({ t: 'h', level: m[1].length, c: inline(m[2] ?? '', depth), line: at }); i += 1; continue; }
        if (RULE.test(line) && !ITEM.exec(line)?.[3]) { blocks.push({ t: 'hr', line: at }); i += 1; continue; }
        if (QUOTE.test(line)) {
            const inner = [];
            while (i < lines.length && QUOTE.test(lines[i])) inner.push(QUOTE.exec(lines[i++])[1]);
            const alert = /^\s*\[!(note|tip|important|warning|caution)\]\s*(.*)$/i.exec(inner[0] ?? '');
            if (depth >= DEPTH_MAX) { blocks.push({ t: 'p', c: [{ t: 'text', v: inner.join(' ') }], line: at }); continue; }
            if (alert) blocks.push({ t: 'alert', kind: alert[1].toLowerCase(), c: markdown([alert[2], ...inner.slice(1)].join('\n'), depth + 1), line: at });
            else blocks.push({ t: 'quote', c: markdown(inner.join('\n'), depth + 1), line: at });
            continue;
        }
        if (line.includes('|') && i + 1 < lines.length && DELIMITER.test(lines[i + 1]) && lines[i + 1].includes('-')) {
            const head = cells(line);
            const align = cells(lines[i + 1]).map((d) => (d.startsWith(':') && d.endsWith(':') ? 'center' : d.endsWith(':') ? 'right' : d.startsWith(':') ? 'left' : ''));
            i += 2;
            const rows = [];
            while (i < lines.length && lines[i].trim() && lines[i].includes('|') && rows.length < 500) rows.push(cells(lines[i++]));
            const width = Math.min(30, head.length);
            blocks.push({ t: 'table', align: align.slice(0, width), head: head.slice(0, width).map((x) => inline(x, depth)), rows: rows.map((r) => Array.from({ length: width }, (_, k) => inline(r[k] ?? '', depth))), line: at });
            continue;
        }
        if ((m = ITEM.exec(line)) && depth < DEPTH_MAX) {
            const ordered = /\d/.test(m[2]);
            const indent = m[1].length;
            const items = [];
            const start = ordered ? Number.parseInt(m[2], 10) : undefined;
            while (i < lines.length) {
                const it = ITEM.exec(lines[i]);
                if (!it || it[1].length !== indent || /\d/.test(it[2]) !== ordered) break;
                const pad = indent + it[2].length + 1;
                const body = [it[3] ?? ''];
                i += 1;
                while (i < lines.length) {
                    const l = lines[i];
                    if (!l.trim()) {
                        /* A blank line stays in the item only when what follows is indented under it. */
                        const next = lines.slice(i + 1).find((x) => x.trim());
                        if (next !== undefined && /^\s*/.exec(next)[0].length >= pad) { body.push(''); i += 1; continue; }
                        break;
                    }
                    const lead = /^\s*/.exec(l)[0].length;
                    if (lead >= pad || (lead > indent && ITEM.test(l))) { body.push(l.slice(Math.min(lead, pad))); i += 1; continue; }
                    if (lead <= indent && (ITEM.test(l) || startsBlock(l, lines[i + 1]))) break;
                    /* A line that just goes on: the same paragraph. */
                    body.push(l.trim()); i += 1;
                }
                const task = /^\[([ xX])\]\s+/.exec(body[0]);
                if (task) body[0] = body[0].slice(task[0].length);
                items.push({ task: task ? task[1] !== ' ' : null, c: markdown(body.join('\n'), depth + 1) });
                while (i < lines.length && !lines[i].trim()) {
                    const next = lines.slice(i).find((x) => x.trim());
                    const it2 = next === undefined ? null : ITEM.exec(next);
                    if (it2 && it2[1].length === indent && /\d/.test(it2[2]) === ordered) i += 1; else break;
                }
            }
            blocks.push({ t: 'list', ordered, ...(ordered && start !== 1 ? { start } : {}), items, line: at });
            continue;
        }
        const para = [];
        while (i < lines.length && lines[i].trim() && !(para.length && startsBlock(lines[i], lines[i + 1]))) para.push(lines[i++].trim());
        blocks.push({ t: 'p', c: inline(para.join('\n'), depth), line: at });
    }
    return blocks;
}
/* All the text of a run of inlines, as it reads. */
export const plainOf = (nodes) => (nodes ?? []).map((n) => (n.t === 'math' ? n.tex : n.t === 'text' || n.t === 'code' ? n.v : n.t === 'br' ? '\n' : n.t === 'img' ? n.alt : n.t === 'badge' ? `[${n.kind}]` : n.t === 'secret' ? '•••••' : plainOf(n.c))).join('');
/* About how many lines a text takes in a reading column. */
export const linesOf = (text) => String(text ?? '').split('\n').reduce((n, l) => n + Math.max(1, Math.ceil(l.length / 90)), 0);

/* A level of a line of the application, as given or as it was once said. */
const levelOf = (level) => (LEVELS.includes(level) ? level : level === 'warn' || level === 'bad' ? 'needs-you' : 'news');
/* A question still open: neither answered nor closed. */
const openQuestion = (m, answered) => m.kind === 'ask' && m.from !== 'person' && m.from !== 'system' && !answered.has(m.id) && !m.closed;

/* WHAT IS SHOWN, as plain data: the page is built from this and from nothing
   else, so it can be checked without a page. `rows`, in order: `day` and
   `gap` (a divider), `message` (in the simple view with `trail`: the steps
   that led to it, folded), `steps` (a group of steps, unfolded in the
   detailed view; in the simple one only those after its last message when
   it stopped), `group` (lines of the application of one topic, in the simple
   view), `now` (what it does now, with the steps of this turn before it),
   `waits` (it waits for the person). `items`: the messages alone. */
export function view(data, { words = {}, view: as = 'simple', now = Date.now(), locale, agentName, agentTool, receivedAfter = RECEIVED_MS, noAnswerAfter = NO_ANSWER_MS } = {}) {
    const detailed = as === 'detailed';
    const all = Array.isArray(data?.messages) ? data.messages.filter((m) => m && typeof m === 'object') : [];
    const answered = new Set(all.filter((m) => m.from === 'person').map((m) => m.answers).filter(Boolean));
    /* Simple shows nothing the person cannot act on: a file that cannot be opened, a trace, are in the detailed view only. */
    const messages = all.filter((m) => detailed || !((m.kind === 'show' && (Array.isArray(m.files) && m.files.length ? !m.files.some((f) => f && typeof f.open === 'string') : typeof m.open !== 'string')) || (m.from === 'system' && levelOf(m.level) === 'trace')));
    /* WHAT CHANGED IN THE BRIDGE FOLDER after the application kept it (read().altered): the copy
       kept is what is shown, and one line says so where it happened -- two changes side by side, one line. */
    for (const a of (Array.isArray(data?.altered) ? data.altered : []).filter((x) => x && typeof x === 'object')) {
        const t = stamp(a.was) ?? stamp(a.at);
        if (t === null) continue;
        let i = messages.findIndex((m) => (stamp(m.at) ?? -Infinity) > t);
        if (i < 0) i = messages.length;
        if (messages[i - 1]?.altered || messages[i]?.altered) continue;
        messages.splice(i, 0, { from: 'system', kind: 'system', altered: true, id: `altered:${String(a.side ?? '')}:${String(a.line ?? a.was ?? '')}`, at: new Date(t).toISOString(), text: said(words, 'history-changed'), level: 'news', tone: 'warn', actions: [] });
    }
    const status = data?.status ?? null;
    const state = (s) => said(words, ['working', 'waiting', 'done'].includes(s) ? s : 'working');
    /* A state of waiting, or done, is not a step: it is said once, at the end. */
    const allSteps = (Array.isArray(data?.steps) ? data.steps : []).filter((s) => s && typeof s === 'object');
    const steps = allSteps.filter((s) => !(s.kind === 'status' && (s.state === 'waiting' || s.state === 'done')));
    const files = Array.isArray(data?.files) ? data.files : [];
    const agentSaid = (m) => m.from !== 'person' && m.from !== 'system';
    /* What the agent did after a time: its messages and its steps. */
    const agentTimes = [...all.filter(agentSaid).map((m) => stamp(m.at)), ...steps.map((s) => stamp(s.at))].filter((t) => t !== null).sort((a, b) => a - b);
    const lastAgent = agentTimes.at(-1) ?? null;
    const firstAfter = (list, t) => list.find((x) => x >= t) ?? null;
    const replies = all.filter(agentSaid).map((m) => stamp(m.at)).filter((t) => t !== null).sort((a, b) => a - b);
    const doneAt = allSteps.filter((s) => s.kind === 'status' && s.state === 'done').map((s) => stamp(s.at)).filter((t) => t !== null);
    const stepTimes = steps.map((s) => stamp(s.at)).filter((t) => t !== null);
    const unreadIds = all.filter((m) => m.from === 'person' && m.seen === false).map((m) => m.id);
    const lastUnread = unreadIds.at(-1);
    const agentName2 = String(agentName || said(words, 'agent'));
    /* It said it is done: said once, at the end, while it is the last thing that happened (a message of either side, or a step, after it: gone). */
    const doneStatus = status?.state === 'done' ? stamp(status.at) : null;
    const lastEvent = Math.max(-Infinity, ...all.filter((m) => m.from !== 'system').map((m) => stamp(m.at) ?? -Infinity), ...allSteps.filter((s) => !(s.kind === 'status' && s.state === 'done')).map((s) => stamp(s.at) ?? -Infinity));
    const doneEnd = doneStatus !== null && lastEvent <= doneStatus;
    /* The newest message of the agent: never folded, so that nothing seems left below it. */
    const newestAgent = [...messages].reverse().find((m) => m.from !== 'person' && m.from !== 'system')?.id;
    const items = messages.map((m) => {
        const t = stamp(m.at);
        if (m.from === 'system') {
            return { type: 'message', key: `y:${String(m.id ?? '')}`, id: String(m.id ?? ''), from: 'system', kind: 'system', level: levelOf(m.level), tone: ['warn', 'bad'].includes(m.tone) ? m.tone : ['warn', 'bad'].includes(m.level) ? m.level : '',
                topic: cut(m.topic, 40), brief: cut(m.brief, 60),
                text: String(m.text ?? ''), time: clock(t, locale), when: whole(t, locale), at: t, label: '', file: null, files: [], outside: '', choices: [], open: false, mark: '',
                actions: (Array.isArray(m.actions) ? m.actions : []).filter((a) => a && typeof a.id === 'string' && typeof a.label === 'string' && a.label.trim()).slice(0, ACTIONS_MAX).map((a) => ({ id: a.id, label: a.label.trim().slice(0, LABEL_MAX) })),
                links: (Array.isArray(m.links) ? m.links : []).filter((a) => a && typeof a.id === 'string' && typeof a.text === 'string' && a.text && a.text.length <= 80).slice(0, LINKS_MAX).map((a) => ({ id: a.id, text: a.text })) };
        }
        const show = m.kind === 'show';
        const open = openQuestion(m, answered);
        const reach = typeof m.open === 'string' ? m.open : null;
        const person = m.from === 'person';
        const item = {
            type: 'message', key: `m:${String(m.id ?? '')}`,
            id: String(m.id ?? ''), from: person ? 'person' : 'agent', kind: String(m.kind ?? 'say'),
            text: show ? String(m.text || nameOf(m.path)) : String(m.text ?? ''),
            /* Whole, as the agent wrote it; `shortCut` is what a folded message shows. */
            short: !person && typeof m.short === 'string' ? String(m.short).replace(/\s+/g, ' ').trim() : '',
            shortCut: !person && typeof m.short === 'string' ? cut(m.short, 200) : '',
            refs: (Array.isArray(m.refs) ? m.refs : []).filter((r) => r && typeof r.path === 'string' && typeof r.open === 'string').slice(0, 20).map((r) => ({ path: r.path, open: r.open })),
            time: clock(t, locale), when: whole(t, locale), at: t,
            label: open ? (m.kind === 'ask' && Array.isArray(m.questions) && m.questions.length > 1 ? `${said(words, 'asks')} · ${said(words, 'group-count', { count: Math.min(m.questions.length, GROUP_MAX) })}` : said(words, 'asks')) : '',
            file: show && !(Array.isArray(m.files) && m.files.length) ? { path: String(m.path ?? ''), open: reach, name: nameOf(m.path), shown: detailed ? String(m.path ?? '') : (m.text ? nameOf(m.path) : ''), picture: PICTURE.test(String(m.path ?? '')) } : null,
            /* Several files shown at once (or one with a title): one gallery, each with its title; simple shows those that open. */
            gallery: show && Array.isArray(m.files) ? m.files.slice(0, 12).filter((f) => f && typeof f.path === 'string' && (detailed || typeof f.open === 'string')).map((f) => ({ path: f.path, open: typeof f.open === 'string' ? f.open : null, name: nameOf(f.path), title: String(f.title || '') || titleOf(f.path), picture: PICTURE.test(f.path), shown: detailed ? f.path : '' })) : [],
            reaction: !person && m.reaction && typeof m.reaction.id === 'string' ? m.reaction.id : '',
            last: !person && m.id === newestAgent,
            decide: false,
            dictated: person && m.via === 'voice',
            tool: detailed && !person && agentTool ? String(agentTool) : '',
            /* What the person attached: by name, opened the application's way; its whole path in the detailed view. */
            files: (person && Array.isArray(m.files) ? m.files : []).slice(0, FILES_MAX).filter((f) => f && typeof f === 'object').map((f) => ({ path: String(f.path ?? ''), name: String(f.name || nameOf(f.path)), open: typeof f.open === 'string' ? f.open : null, shown: detailed ? String(f.path ?? '') : '', size: sizeText(f.size), picture: PICTURE.test(String(f.name || f.path || '')), ...(String(f.note ?? '').trim() ? { note: cut(String(f.note).replace(/\s+/g, ' ').trim(), 500) } : {}) })),
            actions: [],
            outside: show && !(Array.isArray(m.files) && m.files.length) && reach === null ? said(words, 'outside', { path: String(m.path ?? '') }) : show && Array.isArray(m.files) && m.files.some((f) => f && typeof f.open !== 'string') && detailed ? said(words, 'outside', { path: m.files.filter((f) => f && typeof f.open !== 'string').map((f) => f.path).join(', ') }) : '',
            choices: m.kind === 'ask' && !answered.has(m.id) ? (m.choices ?? []).map(String) : [],
            /* Several of its choices may be ticked, then sent together. */
            many: m.kind === 'ask' && m.many === true && Array.isArray(m.choices) && m.choices.length > 1,
            /* What the agent recommends among its choices (#198): marked, never picked for them. */
            recommended: m.kind === 'ask' && Array.isArray(m.recommended) ? m.recommended.map(String).filter((x) => (m.choices ?? []).includes(x)) : [],
            /* Several questions asked together, while not answered: one card, a step each. */
            questions: m.kind === 'ask' && !answered.has(m.id) && Array.isArray(m.questions) ? m.questions.filter((q) => q && typeof q.id === 'string' && typeof q.question === 'string' && q.question.trim()).slice(0, GROUP_MAX)
                .map((q) => ({ id: q.id, label: cut(String(q.label ?? ''), 40), question: q.question, choices: (Array.isArray(q.choices) ? q.choices : []).map(String).slice(0, 8), many: q.many === true && Array.isArray(q.choices) && q.choices.length > 1, recommended: Array.isArray(q.recommended) ? q.recommended.map(String) : [], ...(q.input && typeof q.input === 'object' && typeof q.input.kind === 'string' ? { input: q.input } : {}) })) : [],
            /* Long questions: one at a time, with tabs (#195); else all on one card. */
            steps: m.steps === true,
            open,
            closed: m.kind === 'ask' && m.closed && !answered.has(m.id) ? said(words, 'closed', { answer: cut(m.closed.text, 300) }) : '',
            reply: person && (m.answers || m.re) ? said(words, 'in-reply', { question: cut(m.question || m.quote, 90) }) : '',
            mark: '',
        };
        if (item.questions.length < 2 && !item.questions.some((q) => q.input)) item.questions = [];
        else item.text = String(m.intro ?? '');
        if (person) {
            /* Where it is: sent; read; worked on; handled -- each with its time. */
            const seenAt = m.seen === false ? null : stamp(m.seenAt) ?? t;
            const handled = seenAt === null ? null : [firstAfter(replies, Math.max(seenAt, t ?? 0)), firstAfter(doneAt, seenAt)].filter((x) => x !== null).sort((a, b) => a - b)[0] ?? null;
            const working = seenAt !== null && handled === null && firstAfter(stepTimes, seenAt) !== null && status?.state !== 'done';
            item.state = seenAt === null ? 'sent' : handled !== null ? 'done' : working ? 'working' : 'read';
            item.sign = detailed || item.state !== 'done' ? item.state : '';
            item.signText = [said(words, `state-${item.state}`), said(words, 'sent-at', { time: item.time }), seenAt !== null ? said(words, 'read-at', { time: clock(seenAt, locale) }) : '', handled !== null ? said(words, 'done-at', { time: clock(handled, locale) }) : ''].filter(Boolean).join(' · ');
            /* "Remind it": only for the newest message not read, long unread, while the agent seems idle. */
            item.remind = m.id === lastUnread && t !== null && now - t >= IDLE_MS && (lastAgent === null || now - lastAgent >= IDLE_MS);
        }
        return item;
    });
    /* Who says it: once above each run of messages of one side. */
    let side = '';
    for (const item of items) {
        const who = item.from === 'system' ? '' : item.from;
        item.name = who && who !== side ? (who === 'person' ? said(words, 'you') : agentName2) : '';
        side = who;
    }
    /* It waits, its last word a message that is not a question with choices: a
       decision on that message, offered under it (Go ahead / Disagree) until
       the person reacts or writes. */
    const waitsSince = status?.state === 'waiting' ? stamp(status.at) : null;
    const lastTalk = items.filter((x) => x.from !== 'system').at(-1);
    if (waitsSince !== null && lastTalk?.from === 'agent' && (lastTalk.kind === 'say' || lastTalk.kind === 'show') && !lastTalk.reaction
        && !all.some((m) => m.from === 'person' && (stamp(m.at) ?? 0) >= waitsSince)) lastTalk.decide = true;
    /* A step, as shown: a state is said with its word, what it does with its own words. */
    const step = (s) => {
        const t = stamp(s.at);
        const doing = s.kind === 'doing';
        const note = String(s.note ?? '');
        return { kind: doing ? 'doing' : 'status', state: ['working', 'waiting', 'done'].includes(s.state) ? s.state : 'working',
            text: doing ? note : `${state(s.state)}${note ? ` - ${note}` : ''}`, time: clock(t, locale), when: whole(t, locale), at: t };
    };
    const count = (n) => (n === 1 ? said(words, 'step-one') : said(words, 'steps-many', { count: n }));
    const group = (list, i) => ({ type: 'steps', key: `s:${String(list[0].id ?? i)}`, label: count(list.length), open: detailed, steps: list.map(step), at: stamp(list[0].at), end: stamp(list.at(-1).at) });
    /* The newest step, when it says what it does now: the line at the end. */
    const newest = allSteps.at(-1);
    const lastAgentMessage = Math.max(-Infinity, ...items.filter((x) => x.from === 'agent' && x.at !== null).map((x) => x.at));
    const live = newest && (newest.kind === 'doing' || (newest.kind === 'status' && newest.state === 'working')) && (stamp(newest.at) ?? 0) > lastAgentMessage ? newest : null;
    /* The state at the top, in the detailed view, is not said again at the end. */
    const topState = detailed && status && !live && status.state !== 'waiting' && !(status.state === 'done' && doneEnd) ? status : null;
    const kept = steps.filter((s) => s !== live && !(topState && s === steps.filter((x) => x.kind === 'status').at(-1) && s.at === status.at));
    /* The steps go to the next message of the AGENT; in the detailed view, between the messages, as they came. */
    const rows = [];
    let next = 0;
    items.forEach((item, i) => {
        if (item.from === 'system' || (item.from === 'person' && !detailed)) { rows.push({ ...item, trail: null, end: item.at }); return; }
        const before = [];
        while (item.at !== null && next < kept.length && (stamp(kept[next].at) ?? 0) <= item.at) before.push(kept[next++]);
        /* Simple: on the message they led to, no line of their own; detailed: unfolded above it. */
        if (before.length && detailed) rows.push(group(before, i));
        const trail = before.length && !detailed ? (({ type, at: a, end, ...g }) => g)(group(before, i)) : null;
        rows.push({ ...item, trail, end: item.at });
    });
    const turn = kept.slice(next);
    const busy = unreadIds.length > 0;
    /* Its tool says it acts (the agent itself may say nothing for long). */
    const beat = data?.pulse?.busy === true ? stamp(data.pulse.at) : null;
    const pulsing = beat !== null && now - beat < PULSE_MS;
    if (live) {
        const t = stamp(live.at);
        /* It declared it is working: the line stays live while it is recent or its tool still beats, even once
           the turn ended -- a job may still run in the background. It goes still only after a long silence,
           and then says "nothing new since", never "stopped" (which would contradict "working"). */
        const fresh = t !== null && (now - t < STALE_MS || pulsing);
        const doing = String(live.note ?? '') || state('working');
        rows.push({ type: 'now', key: `n:${String((turn[0] ?? live).id ?? '')}`, ...step(live), text: busy && fresh ? said(words, 'busy', { doing }) : doing, busy: busy && fresh, live: fresh,
            quiet: fresh ? '' : said(words, 'quiet', { time: clock(t, locale) }),
            label: turn.length ? count(turn.length) : '', open: detailed, steps: turn.map(step), at: stamp((turn[0] ?? live).at), end: t });
    } else if (pulsing) {
        rows.push({ type: 'now', key: `n:${String(turn[0]?.id ?? 'pulse')}`, kind: 'doing', state: 'working', text: said(words, 'pulse'), time: clock(beat, locale), when: whole(beat, locale),
            busy: false, live: true, quiet: '', label: turn.length ? count(turn.length) : '', open: detailed, steps: turn.map(step), at: turn.length ? stamp(turn[0].at) : beat, end: beat });
    } else if (turn.length) rows.push(group(turn, items.length));
    /* It waits for the person: said once, at the end, until they write; not when its last word is a question, which says so. */
    const lastSaid = items.filter((x) => x.from !== 'system').at(-1);
    const waitsAt = status?.state === 'waiting' ? stamp(status.at) : null;
    if (waitsAt !== null && !all.some((m) => m.from === 'person' && (stamp(m.at) ?? 0) >= waitsAt) && !(lastSaid?.open)) {
        const note = String(status.note ?? '').trim();
        rows.push({ type: 'waits', key: 'w', text: note ? said(words, 'waits-you-note', { note }) : said(words, 'waits-you'), time: clock(waitsAt, locale), when: whole(waitsAt, locale), at: null, end: null });
    }
    /* Its newest message was read and the agent posted nothing since, not even a step: received, and nothing more is claimed.
       The first status or message of the agent replaces it. Null for receivedAfter: never said. */
    const lastWord = all.filter((m) => m.from !== 'system').at(-1);
    const readAt = lastWord?.from === 'person' && lastWord.seen === true ? stamp(lastWord.seenAt) ?? stamp(lastWord.at) : null;
    const after = Number.isFinite(receivedAfter) ? Math.max(0, receivedAfter) : null;
    if (readAt !== null && after !== null && !live && !pulsing && now - readAt >= after
        && ![...replies, ...allSteps.map((s) => stamp(s.at))].some((x) => x !== null && x >= readAt)) {
        const long = now - readAt >= (Number.isFinite(noAnswerAfter) ? noAnswerAfter : NO_ANSWER_MS);
        rows.push({ type: 'received', key: 'r', long, text: long ? said(words, 'no-answer', { time: clock(readAt, locale) }) : said(words, 'received'), time: clock(readAt, locale), when: whole(readAt, locale), at: null, end: null });
    }
    if (doneEnd) {
        const note = String(status.note ?? '').trim();
        rows.push({ type: 'done', key: 'D', text: note ? said(words, 'done-end-note', { note }) : said(words, 'done-end'), time: clock(doneStatus, locale), when: whole(doneStatus, locale), at: null, end: null });
    }
    /* Simple: a run of news of one topic is one compact line. */
    const packed = [];
    for (const row of rows) {
        const prev = packed.at(-1);
        if (!detailed && row.from === 'system' && row.level === 'news' && row.topic) {
            if (prev?.type === 'group' && prev.topic === row.topic) { prev.lines.push(row); prev.end = row.at; continue; }
            if (prev?.from === 'system' && prev.level === 'news' && prev.topic === row.topic && prev.type === 'message') { packed[packed.length - 1] = { type: 'group', key: `G:${prev.id}`, topic: row.topic, lines: [prev, row], at: prev.at, end: row.at }; continue; }
        }
        packed.push(row);
    }
    for (const row of packed) if (row.type === 'group') { row.text = said(words, 'grouped', { topic: row.topic, count: row.lines.length, briefs: row.lines.map((l) => l.brief || l.text).join(', ') }); row.time = row.lines.at(-1).time; row.lines = row.lines.map(({ at, end, trail, ...l }) => l); }
    /* The day when it changes, the time when long passed. */
    const shown = [];
    let previous = null;
    for (const row of packed) {
        if (row.at !== null && row.at !== undefined) {
            if (previous === null || dayKey(row.at) !== dayKey(previous)) shown.push({ type: 'day', key: `d:${dayKey(row.at)}`, text: dayText(row.at, now, words, locale) });
            else if (row.at - previous > GAP_MS) shown.push({ type: 'gap', key: `g:${row.key}`, text: clock(row.at, locale) });
        }
        shown.push(row);
        if (row.end !== null && row.end !== undefined) previous = row.end;
    }
    const doingNow = live ? String(live.note ?? '') : '';
    return {
        view: detailed ? 'detailed' : 'simple',
        /* Detailed only, and only what the end of the thread does not say already. */
        status: !detailed ? null
            : topState ? { state: topState.state, text: `${state(topState.state)}${topState.note ? ` - ${topState.note}` : ''}`, when: whole(stamp(topState.at), locale) }
                : live ? { state: 'working', text: `${state('working')}${doingNow ? ` - ${doingNow}` : ''}`, when: whole(stamp(live.at), locale) }
                    : status ? null : { state: 'none', text: said(words, 'no-status'), when: '' },
        empty: messages.length === 0 && shown.length === 0 ? said(words, 'empty') : null,
        rows: shown.map(({ at, end, ...row }) => row),
        items: items.map(({ at, type, key, ...item }) => item),
        unread: Number(data?.unread) || 0,
        /* The one question that waits, for what is typed to answer by default. */
        /* The one question still open, that the box answers by itself -- not a card (several questions,
           or a selector): it has its own fields and its own Send, and a message typed beside it is a message. */
        asking: (() => { const open = all.filter((m) => openQuestion(m, answered)); const card = (m) => Array.isArray(m.questions) && (m.questions.length > 1 || m.questions.some((q) => q && q.input)); return open.length === 1 && !card(open[0]) ? { id: String(open[0].id ?? ''), text: cut(open[0].short || (Array.isArray(open[0].questions) && open[0].questions.length > 1 ? open[0].intro || said(words, 'group-count', { count: open[0].questions.length }) : open[0].text), 90) } : null; })(),
        files: detailed ? files.map((f) => ({ path: String(f.path ?? ''), name: nameOf(f.path), note: String(f.note ?? ''), open: typeof f.open === 'string' ? f.open : null, when: whole(stamp(f.at), locale) })) : [],
        summary: detailed ? `${said(words, 'files')} (${files.length})` : '',
        /* Detailed, on the side: what it does now and the steps of this turn; what the application says of its machine. */
        side: detailed ? { now: live ? { text: String(live.note ?? '') || state('working'), steps: turn.map(step) } : pulsing ? { text: said(words, 'pulse'), steps: turn.map(step) } : null,
            about: (Array.isArray(data?.about) ? data.about : []).filter((a) => a && typeof a.label === 'string' && typeof a.text === 'string').slice(0, 8).map((a) => ({ label: cut(a.label, 40), text: cut(a.text, 200), tone: ['warn', 'bad', 'ok'].includes(a.tone) ? a.tone : '' })) } : null,
    };
}

/* THE MEDIA OF THE THREAD, as plain data: every picture and every other file
   the person can open -- shown by the agent, placed or cited in its messages,
   attached by the person --, once each (where it came last), newest first.
   Each says the message it came with (`id`), to find it in the thread. */
export function media(data, { locale } = {}) {
    const all = (Array.isArray(data?.messages) ? data.messages : []).filter((m) => m && typeof m === 'object' && m.from !== 'system');
    const found = new Map();
    const put = (f, m, title) => {
        if (!f || typeof f.path !== 'string' || typeof f.open !== 'string') return;
        const t = stamp(m.at);
        found.delete(f.path);
        found.set(f.path, { path: f.path, open: f.open, name: nameOf(f.path), title: String(title || '') || titleOf(f.path), picture: PICTURE.test(f.path), id: String(m.id ?? ''), when: whole(t, locale), at: t });
    };
    for (const m of [...all].sort((a, b) => String(a.at).localeCompare(String(b.at)))) {
        if (m.kind === 'show') { if (Array.isArray(m.files) && m.files.length) for (const f of m.files) put(f, m, f?.title); else put({ path: m.path, open: m.open }, m, ''); }
        /* A picture placed in a message: its caption is its title. */
        const alts = new Map([...String(m.text ?? '').matchAll(/!\[([^\]\n]{0,300})\]\(\s*<?([^\s()<>]{1,2000})/g)].map((x) => [x[2], x[1]]));
        for (const r of Array.isArray(m.refs) ? m.refs : []) put(r, m, alts.get(r?.path));
        for (const f of Array.isArray(m.files) && m.from === 'person' ? m.files : []) put(f, m, '');
    }
    /* Newest message first; within one, in the order it gave them. */
    const list = [...found.values()].map((x, i) => ({ x, i })).sort((a, b) => (b.x.at ?? 0) - (a.x.at ?? 0) || a.i - b.i).map(({ x: { at, ...x } }) => x);
    return { pictures: list.filter((x) => x.picture), files: list.filter((x) => !x.picture) };
}

/* A PART OF THE THREAD (see read() of the host, and WINDOW in the protocol). The
   screen is given the end of the thread, and asks for the rest when it is wanted:
   the page before it ("Earlier messages"), the part up to a message found. Then,
   at each look, only what changed since its cursor. Two pure functions put them
   together; what the application gives without a cursor is taken whole, as before. */
const keyOf = (m) => `${m?.from === 'system' ? 'y' : 'm'}:${String(m?.id ?? '')}`;
const byAt = (a, b) => String(a.at ?? '').localeCompare(String(b.at ?? ''));
const union = (a, b) => { const all = new Map((Array.isArray(a) ? a : []).filter((x) => x && typeof x === 'object').map((x) => [keyOf(x), x])); for (const x of Array.isArray(b) ? b : []) if (x && typeof x === 'object') all.set(keyOf(x), x); return [...all.values()].sort(byAt); };
/* What changed since the cursor, put into what is shown: a message again replaces itself;
   a new one comes in, unless it is older than what is shown (the part before is not here). */
export function since(base, delta) {
    if (!delta || typeof delta !== 'object' || delta.since !== true || !base || typeof base !== 'object') return delta;
    const oldest = Number(base.window?.more) > 0 && typeof base.window?.from === 'string' ? base.window.from : null;
    const known = new Set((Array.isArray(base.messages) ? base.messages : []).map(keyOf));
    const fresh = (Array.isArray(delta.messages) ? delta.messages : []).filter((m) => m && (known.has(keyOf(m)) || oldest === null || String(m.at ?? '') >= oldest));
    const out = { ...base, messages: union(base.messages, fresh), steps: union(base.steps, delta.steps) };
    for (const k of ['waiting', 'status', 'unread', 'pulse', 'files', 'altered', 'about', 'cursor']) if (Object.hasOwn(delta, k)) out[k] = delta[k];
    return out;
}
/* An earlier part of the thread, put before what is shown: what is shown stays as it is
   (its cursor too: what changed in it is asked for from there). */
export function earlier(base, page) {
    if (!page || typeof page !== 'object' || !Array.isArray(page.messages)) return base;
    if (!base || typeof base !== 'object') return page;
    const w = page.window && typeof page.window === 'object' ? page.window : {};
    return { ...base, messages: union(page.messages, base.messages), steps: union(page.steps, base.steps),
        window: { ...(base.window ?? {}), before: w.before ?? null, more: Number(w.more) || 0, from: w.from ?? base.window?.from ?? null } };
}
/* `window` of mount: { messages: N } or { days: D }, as asked of load(). */
export const windowOf = (w) => (w && Number.isInteger(w.days) && w.days > 0 ? { days: w.days } : { last: w && Number.isInteger(w.messages) && w.messages > 0 ? w.messages : WINDOW });

/* THE QUICK ANSWERS ABOVE THE BOX, as plain data: the choices of the
   question the agent asks now (the newest one not answered nor closed),
   first; then the application's ready answers, as many as are well formed. */
export function quick(data, replies = []) {
    const all = Array.isArray(data?.messages) ? data.messages : [];
    const answered = new Set(all.map((m) => m?.answers).filter(Boolean));
    const asks = [...all].reverse().find((m) => m && openQuestion(m, answered) && Array.isArray(m.choices) && m.choices.length > 0);
    /* Choices to tick are ticked in the question itself: one tap above the box would send one alone. */
    const out = asks && asks.many !== true ? asks.choices.map((c) => ({ kind: 'choice', label: String(c), text: String(c), send: true, answers: String(asks.id ?? '') })) : [];
    for (const r of Array.isArray(replies) ? replies.slice(0, REPLIES_MAX) : []) {
        if (!r || typeof r.label !== 'string' || typeof r.text !== 'string' || !r.label.trim() || !r.text.trim()) continue;
        out.push({ kind: 'reply', label: r.label.trim().slice(0, LABEL_MAX), text: r.text.slice(0, TEXT_MAX), send: r.send === true });
    }
    return out;
}

/* THE PANEL BESIDE THE THREAD, as plain data: what the application gave
   (`side`), kept to what is well formed. Parley knows nothing of where the
   items come from: a title, a state, ticked or not, done or not, an owner.
   Those not done first, in the order given; those done after. */
export const PANEL_MAX = 100;
export const PANEL_TITLE_MAX = 200;
export const PANEL_PX = 860;
export const PANEL_WAIT_MS = 8000;
export const PANEL_TEXT_MAX = 300;
export const PANEL_TONES = Object.freeze(['active', 'attention']);
export function panelOf(given) {
    if (!given || typeof given !== 'object') return null;
    const line = (v, most) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, most) : '');
    const seen = new Set();
    const items = [];
    for (const it of Array.isArray(given.items) ? given.items : []) {
        if (items.length >= PANEL_MAX) break;
        const id = typeof it?.id === 'string' || Number.isInteger(it?.id) ? String(it.id) : '';
        const title = line(it?.title, PANEL_TITLE_MAX);
        if (!id || !title || seen.has(id)) continue;
        seen.add(id);
        items.push({ id, title, text: line(it.text, PANEL_TEXT_MAX), state: line(it.state, 60), owner: line(it.owner, 80), done: it.done === true, checked: it.checked === true,
            tickable: it.tick !== false && it.done !== true, tone: PANEL_TONES.includes(it.tone) ? it.tone : '' });
    }
    const open = items.filter((x) => !x.done);
    const done = items.filter((x) => x.done);
    const count = Number.isInteger(given.count) && given.count >= 0 ? given.count : open.length;
    return { title: line(given.title, 60), open, done, count, action: given.action && typeof given.action.run === 'function' && line(given.action.label, 40) ? { label: line(given.action.label, 40), run: given.action.run } : null };
}

/* Does this key, pressed in the box, send? Shift+Enter is a new line and
   Ctrl+Enter sends, always; Enter alone as `enter` says ('auto': where there
   is a fine pointer, a keyboard is likely). A key that composes a character
   (an accent, a syllable) is the composer's. */
export function sends(event, enter = 'auto', fine = false) {
    if (event?.key !== 'Enter' || event.isComposing || event.keyCode === 229) return false;
    if (event.shiftKey || event.altKey) return false;
    if (event.ctrlKey || event.metaKey) return true;
    return enter === 'send' || (enter !== 'newline' && fine);
}

/* What dictation said joins what is in the box, with one space. */
export const joined = (before, said2) => {
    const add = String(said2 ?? '').replace(/\s+/g, ' ').trim();
    if (!add) return String(before ?? '');
    const was = String(before ?? '');
    return was === '' || /\s$/.test(was) ? `${was}${add}` : `${was} ${add}`;
};

/* A picture pasted without a name of its own is named by its time. */
/* ↑ / ↓ in the box: which message sent before it brings back, or null to leave the key alone. `at`:
   where it is in `sent` (-1: writing its own); the answer's `at` -1 is back to what was being written. */
export function recalled(event, box, at, sent) {
    if (event.isComposing || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return null;
    if (box.selectionStart !== box.selectionEnd) return null;
    const value = String(box.value ?? '');
    /* A message brought back and not changed: the arrows go on through the messages, whatever line the caret is on. */
    const browsing = at >= 0 && value === sent[at];
    if (event.key === 'ArrowUp') {
        if (!browsing && value.slice(0, box.selectionStart).includes('\n')) return null;
        const next = at < 0 ? sent.length - 1 : at - 1;
        return next >= 0 ? { at: next, text: sent[next] } : null;
    }
    if (event.key === 'ArrowDown') {
        if (at < 0 || (!browsing && value.slice(box.selectionEnd).includes('\n'))) return null;
        return at + 1 < sent.length ? { at: at + 1, text: sent[at + 1] } : { at: -1, text: '' };
    }
    return null;
}

export function pastedName(file, now = new Date()) {
    const name = String(file?.name ?? '');
    if (name && !/^image\.(png|jpe?g|gif|webp)$/i.test(name)) return name;
    const p = (n) => String(n).padStart(2, '0');
    const ext = /\/(png|jpeg|gif|webp)$/.exec(String(file?.type ?? ''))?.[1]?.replace('jpeg', 'jpg') ?? 'png';
    return `screenshot-${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}.${ext}`;
}

const el = (tag, className, text) => { const e = document.createElement(tag); if (className) e.className = className; if (text !== undefined) e.textContent = text; return e; };
const button = (text, className, act) => { const b = el('button', className, text); b.type = 'button'; b.addEventListener('click', act); return b; };

const SVG = 'http://www.w3.org/2000/svg';
/* The drawn signs, made here: never markup from anywhere. */
const SIGNS = {
    mic: [['rect', { x: 9, y: 3, width: 6, height: 11, rx: 3 }], ['path', { d: 'M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7' }]],
    prefs: [['path', { d: 'M4 7h9M17 7h3M4 17h3M11 17h9' }], ['circle', { cx: 15, cy: 7, r: 2 }], ['circle', { cx: 9, cy: 17, r: 2 }]],
    clip: [['path', { d: 'M20 11.5l-7.8 7.8a5 5 0 0 1-7.1-7.1l8.5-8.5a3.4 3.4 0 0 1 4.8 4.8l-8.4 8.4a1.7 1.7 0 0 1-2.4-2.4l7.6-7.6' }]],
    stop: [['rect', { x: 6, y: 6, width: 12, height: 12, rx: 2.5 }]],
    send: [['path', { d: 'M12 19V5M5.5 11.5L12 5l6.5 6.5' }]],
    copy: [['rect', { x: 8, y: 8, width: 12, height: 12, rx: 2 }], ['path', { d: 'M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8' }]],
    sent: [['circle', { cx: 12, cy: 12, r: 8 }], ['path', { d: 'M12 12V7.5', class: 'parley-hand' }], ['path', { d: 'M12 12h3' }]],
    read: [['path', { d: 'M5 12.5l4.5 4.5L19 7.5' }]],
    working: [['path', { d: 'M12 4a8 8 0 1 1-8 8', class: 'parley-turn' }]],
    done: [['path', { d: 'M2.5 12.5L7 17l9.5-9.5M11.5 16l1 1L22 7.5' }]],
    note: [['circle', { cx: 12, cy: 12, r: 9 }], ['path', { d: 'M12 11v6M12 7.5v.5' }]],
    tip: [['path', { d: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z' }]],
    important: [['path', { d: 'M4 5h16v11H9l-5 4z' }], ['path', { d: 'M12 8v4M12 14.5v.5' }]],
    warning: [['path', { d: 'M12 3.5l9.5 16.5h-19z' }], ['path', { d: 'M12 10v4.5M12 17v.5' }]],
    caution: [['path', { d: 'M8 3h8l5 5v8l-5 5H8l-5-5V8z' }], ['path', { d: 'M12 8v5M12 15.5v.5' }]],
    down: [['path', { d: 'M12 5v14M6 13l6 6 6-6' }]],
    search: [['circle', { cx: 11, cy: 11, r: 6.5 }], ['path', { d: 'M16 16l4.5 4.5' }]],
    close: [['path', { d: 'M6 6l12 12M18 6L6 18' }]],
    plus: [['path', { d: 'M12 5v14M5 12h14' }]],
    minus: [['path', { d: 'M5 12h14' }]],
    left: [['path', { d: 'M15 5l-7 7 7 7' }]],
    right: [['path', { d: 'M9 5l7 7-7 7' }]],
    up: [['path', { d: 'M6 15l6-6 6 6' }]],
    file: [['path', { d: 'M6 3h8l5 5v13H6z' }], ['path', { d: 'M14 3v5h5' }]],
    tasks: [['path', { d: 'M3.5 6.5l1.5 1.5 3-3M3.5 12.5l1.5 1.5 3-3M3.5 18.5l1.5 1.5 3-3M11 6.5h9.5M11 12.5h9.5M11 18.5h9.5' }]],
    trash: [['path', { d: 'M4 7h16' }], ['path', { d: 'M9.5 7V5.6A1.6 1.6 0 0 1 11.1 4h1.8A1.6 1.6 0 0 1 14.5 5.6V7' }], ['path', { d: 'M6.5 7l.9 12.3A1.7 1.7 0 0 0 9.1 21h5.8a1.7 1.7 0 0 0 1.7-1.7L17.5 7' }], ['path', { d: 'M10 11v6M14 11v6' }]],
};
function sign(kind) {
    const svg = document.createElementNS(SVG, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('class', `parley-sign parley-sign-${kind}`);
    for (const [tag, attributes] of SIGNS[kind] ?? SIGNS.stop) {
        const shape = document.createElementNS(SVG, tag);
        for (const [k, v] of Object.entries(attributes)) shape.setAttribute(k, String(v));
        svg.append(shape);
    }
    return svg;
}

/* Puts a text in the clipboard, within the click that asked: said "Copied" a
   moment. Refused: what was to be copied is selected, for the person to copy. */
function copying(b, text, words, select) {
    const done = () => { const was = b.dataset.label ?? b.textContent; b.dataset.label = was; b.dataset.copied = 'true'; b.lastChild.textContent = said(words, 'copied'); setTimeout(() => { b.lastChild.textContent = said(words, 'copy'); delete b.dataset.copied; }, 1500); };
    const fallback = () => { try { const range = document.createRange(); range.selectNodeContents(select); const s = globalThis.getSelection(); s.removeAllRanges(); s.addRange(range); } catch { /* nothing more to do */ } };
    try {
        const w = globalThis.navigator?.clipboard?.writeText?.(text);
        if (w && typeof w.then === 'function') w.then(done, fallback); else fallback();
    } catch { fallback(); }
}

/* THE PAGE, MADE FROM THE DATA OF markdown(): element by element, text as text. */
/* RICHER BLOCKS, each only when the topic calls for it, each read here and
   drawn here: a formula (KaTeX, loaded on the first one), a family (```family),
   zones on a picture (```picture). Nothing of the agent's text becomes markup:
   names, words and lines are text in nodes made one by one. */

/* A name, plain or as a link to what the application can open ([Jeanne](ref)), and its dates in brackets. */
const NAMED = /^(?:\[([^[\]\n]{1,80})\]\(\s*([^\s()<>]{1,300})\s*\)|([^()[\]\n]{1,80}?))\s*(?:\(([^()\n]{1,40})\))?$/;
const named = (text) => {
    const m = NAMED.exec(String(text ?? '').trim());
    if (!m) return null;
    const name = (m[1] ?? m[3] ?? '').trim();
    return name ? { name, ref: m[2] ?? null, dates: (m[4] ?? '').trim() } : null;
};
export const FAMILY_MAX = 60;
export const FAMILY_LINKS_MAX = 6;
export const ZONES_MAX = 20;

/* A FAMILY: one line per person or couple ("A + B"); their children indented
   under them, two spaces a generation; "(dates)"; ", note" (a couple's: about
   their marriage). "# A | B | C" names the generations, top to bottom.
   "A ~ B : word" is a link of another kind (brothers, a godmother, friends),
   six at most. Null when a line cannot be read: the block is then shown as
   it was written. */
export function familyOf(text) {
    const roots = [];
    const stack = [];
    const links = [];
    let bands = [];
    let count = 0;
    for (const raw of String(text ?? '').replace(/\t/g, '  ').split('\n')) {
        if (!raw.trim()) continue;
        const head = /^\s*#\s*(.*)$/.exec(raw);
        if (head) { bands = head[1].split('|').map((s) => s.trim().slice(0, 40)).slice(0, 12); continue; }
        const link = /^\s*(.+?)\s+~\s+(.+?)\s*:\s*(.+)$/.exec(raw);
        if (link) {
            const a = named(link[1]); const b = named(link[2]);
            if (!a || !b) return null;
            if (links.length < FAMILY_LINKS_MAX) links.push({ a: a.name, b: b.name, word: link[3].trim().slice(0, 30) });
            continue;
        }
        const depth = Math.floor(/^ */.exec(raw)[0].length / 2);
        let line = raw.trim();
        let note = '';
        const comma = line.search(/,\s(?![^(]*\))/);
        if (comma > 0) { note = line.slice(comma + 1).trim().slice(0, 120); line = line.slice(0, comma); }
        const people = line.split(/\s\+\s/).map(named);
        if (people.length > 2 || people.some((p) => !p)) return null;
        while (stack.length > depth) stack.pop();
        if (depth > stack.length) return null;
        const node = { people: people.map((p, k) => ({ ...p, inlaw: depth > 0 && k === 1 })), note, children: [], depth };
        (stack.length ? stack.at(-1).children : roots).push(node);
        stack.push(node);
        count += people.length;
        if (count > FAMILY_MAX) return null;
    }
    return roots.length ? { roots, links, bands } : null;
}

/* ZONES ON A PICTURE: its first line a picture as Markdown writes it, then
   one line per zone: a label (plain, [label](ref), or "?" for what the agent
   asks about), x y w h as fractions of the picture from its top left, and a
   line about it. A ref is the application's: shown nowhere, opened by it. */
const ZONE = /^(.+?)\s+(0|1|0?\.\d+|1\.0+)\s+(0|1|0?\.\d+|1\.0+)\s+(0|1|0?\.\d+|1\.0+)\s+(0|1|0?\.\d+|1\.0+)(?:\s+(.*))?$/;
export function zonesOf(text) {
    const [first, ...rest] = String(text ?? '').split('\n').filter((l) => l.trim());
    const pic = /^!\[([^\]\n]{0,300})\]\(\s*<?([^\s()<>]{1,2000})>?\s*\)$/.exec(first?.trim() ?? '');
    if (!pic) return null;
    const zones = [];
    for (const l of rest) {
        const m = ZONE.exec(l.trim());
        if (!m) return null;
        const [x, y, w, h] = m.slice(2, 6).map(Number);
        if (!(w > 0 && h > 0) || x + w > 1.001 || y + h > 1.001) return null;
        const unknown = m[1].trim() === '?';
        const who = unknown ? { name: '?', ref: null } : named(m[1]);
        if (!who) return null;
        zones.push({ label: who.name, ref: who.ref, unknown, box: [x, y, w, h], line: (m[6] ?? '').trim().slice(0, 160) });
        if (zones.length >= ZONES_MAX) break;
    }
    return { alt: pic[1], src: pic[2], zones };
}
/* The one zone a question asks about ("?"), when it has exactly one: its answer goes back with it. */
export function askedZone(text) {
    const found = [];
    for (const b of markdown(text)) {
        if (b.t !== 'code' || b.lang !== 'picture') continue;
        const z = zonesOf(b.text);
        for (const one of z?.zones ?? []) if (one.unknown) found.push({ label: '?', picture: z.src, box: one.box });
    }
    return found.length === 1 ? found[0] : null;
}

/* A FORMULA, AS KATEX DREW IT, COPIED INTO THE PAGE through a list of what it
   may hold: its spans, the MathML that says it to a screen reader, the SVG of
   stretched brackets; class, style without addresses, and the attributes of
   MathML and SVG that place things. Anything else is left out, so that a
   formula cannot carry a link, a script or an address to load. */
const MATHML = 'http://www.w3.org/1998/Math/MathML';
const SVGNS = 'http://www.w3.org/2000/svg';
const MATH_TAGS = new Set(['math', 'semantics', 'annotation', 'mrow', 'mi', 'mo', 'mn', 'ms', 'mtext', 'mspace', 'msup', 'msub', 'msubsup', 'mfrac', 'msqrt', 'mroot', 'mover', 'munder', 'munderover', 'mtable', 'mtr', 'mtd', 'mlabeledtr', 'mpadded', 'mphantom', 'mstyle', 'menclose', 'merror']);
const SVG_TAGS = new Set(['svg', 'path', 'line', 'g', 'rect']);
const KEPT = new Set(['class', 'style', 'aria-hidden', 'encoding', 'mathvariant', 'stretchy', 'fence', 'separator', 'lspace', 'rspace', 'width', 'height', 'viewbox', 'preserveaspectratio', 'd', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'stroke-width', 'displaystyle', 'scriptlevel', 'columnalign', 'rowalign', 'rowspacing', 'columnspacing', 'columnlines', 'rowlines', 'frame', 'minsize', 'maxsize', 'accent', 'accentunder', 'linethickness', 'depth', 'voffset', 'notation', 'mathcolor', 'mathbackground', 'symmetric', 'largeop', 'movablelimits', 'form', 'display']);
const UNSAFE = /url\s*\(|expression|javascript:|data:|@import|[<>\\]/i;
export function mathCopy(node, budget = { left: 20000 }) {
    if (budget.left-- <= 0) return null;
    if (node.nodeType === 3) return String(node.data ?? node.textContent ?? '');
    if (node.nodeType !== 1) return null;
    const tag = String(node.localName ?? node.tagName ?? '').toLowerCase();
    const ns = MATH_TAGS.has(tag) ? MATHML : SVG_TAGS.has(tag) ? SVGNS : tag === 'span' ? null : undefined;
    if (ns === undefined) return null;
    const out = ns ? document.createElementNS(ns, tag) : document.createElement('span');
    const names = typeof node.getAttributeNames === 'function' ? node.getAttributeNames() : [];
    for (const name of names) {
        const value = String(node.getAttribute(name) ?? '');
        if (!KEPT.has(name.toLowerCase()) || value.length > 2000 || UNSAFE.test(value)) continue;
        out.setAttribute(name, value);
    }
    for (const child of node.childNodes ?? []) { const c = mathCopy(child, budget); if (c !== null) out.append(c); }
    return out;
}

/* KATEX, LOADED ON THE FIRST FORMULA: Parley's own copy (ui/vendor/katex/),
   or the one the application names ({ url, css }); false: formulas stay as
   they were written. Its style sheet is added once to the page. It draws into
   a node of its own, with no trust (no links, no classes or styles of the
   agent's, no pictures) and limits on sizes and macros; what it drew is then
   copied through mathCopy. A formula it cannot read: its source, as code. */
export const KATEX = 'vendor/katex/katex.mjs';
const MATH_DRAWN_MAX = 500;
export const MATH_OPTIONS = Object.freeze({ throwOnError: true, trust: false, strict: 'ignore', maxSize: 50, maxExpand: 500, output: 'htmlAndMathml' });
export function mathFrom(given) {
    if (given === false || typeof document === 'undefined') return null;
    let url;
    try { url = String(given?.url ?? new URL(`./${KATEX}`, import.meta.url).href); } catch { return null; }
    const css = String(given?.css ?? url.replace(/[^/]*$/, 'katex.min.css'));
    let loading = null;
    const drawn = new Map();
    return async (tex, display) => {
        loading ??= import(url).then((m) => {
            if (!document.querySelector?.('link[data-parley-katex]')) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = css; l.setAttribute('data-parley-katex', ''); document.head?.append(l); }
            const k = m?.default ?? m;
            if (typeof k?.render !== 'function') throw new Error('not KaTeX');
            return k;
        });
        const katex = await loading;
        const key = `${display ? 'D' : 'i'}${tex}`;
        let raw = drawn.get(key);
        if (!raw) {
            raw = document.createElement('span');
            katex.render(String(tex).slice(0, MATH_MAX), raw, { ...MATH_OPTIONS, displayMode: display });
            if (drawn.size >= MATH_DRAWN_MAX) drawn.clear();
            drawn.set(key, raw);
        }
        const copy = el('span', 'parley-math-drawn');
        for (const child of raw.childNodes) { const c = mathCopy(child); if (c !== null) copy.append(c); }
        return copy;
    };
}

/* A drawing as a picture needs a size of its own: Mermaid gives width="100%"
   and its size only in viewBox, and a picture without one is drawn 0 by 0 in
   a box that fits its content. Its root is given the size of its viewBox. */
export function sized(svg) {
    return String(svg).replace(/<svg\b[^>]*>/i, (tag) => {
        const box = /\bviewBox\s*=\s*"\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)\s*"/i.exec(tag);
        const width = /\swidth\s*=\s*"([^"]*)"/i.exec(tag)?.[1];
        if (!box || (width && !/%$/.test(width.trim()))) return tag;
        const w = Math.round(Number(box[1])); const h = Math.round(Number(box[2]));
        if (!(w > 0 && h > 0)) return tag;
        const bare = tag.replace(/\s(width|height)\s*=\s*"[^"]*"/gi, '');
        return bare.replace(/^<svg\b/i, `<svg width="${w}" height="${h}"`);
    });
}

/* THE FAMILY, LAID OUT: each couple over its children, the generations in bands. */
const FW = 124, FH = 58, FGAP = 36, FSIB = 22, FROOT = 44, FBAND = FH + 32, FROW = FBAND + 40, FPAD = 12;
const ownWidth = (n) => n.people.length * FW + (n.people.length - 1) * FGAP;
function widthOf(n) { const kids = n.children.reduce((s, c) => s + widthOf(c), 0) + FSIB * Math.max(0, n.children.length - 1); n.w = Math.max(ownWidth(n), kids); return n.w; }
function placeAt(n, left) {
    n.x = left + (n.w - ownWidth(n)) / 2;
    const kids = n.children.reduce((s, c) => s + c.w, 0) + FSIB * Math.max(0, n.children.length - 1);
    let x = left + (n.w - kids) / 2;
    for (const c of n.children) { placeAt(c, x); x += c.w + FSIB; }
}

function painter(ctx) {
    const { words, refs, open, picture, diagram, highlight, cache, secrets: liveSecrets = {}, forget } = ctx;
    const fileOf = (path) => (refs.has(path) ? { path, open: refs.get(path) } : null);
    const pathLink = (file, text) => { const b = button('', 'parley-pathlink', () => open?.(file)); b.append(text ?? file.path); b.title = file.path; return b; };
    function inlines(nodes, into) {
        for (const n of nodes) {
            if (n.t === 'text') into.append(...splitPaths(n.v));
            else if (n.t === 'br') into.append(el('br'));
            else if (n.t === 'code') { const f = fileOf(n.v.trim()); const c = el('code', '', n.v); into.append(f && open ? pathLink(f, c) : c); }
            else if (n.t === 'em' || n.t === 'strong' || n.t === 'del' || n.t === 'mark') { const e = el(n.t === 'del' ? 's' : n.t); inlines(n.c, e); into.append(e); }
            else if (n.t === 'badge') { const b = el('span', 'parley-badge', said(words, `badge-${n.kind}`)); b.dataset.kind = n.kind; into.append(b); }
            else if (n.t === 'secret') into.append(secretChipEl(n.name, words, liveSecrets, forget));
            else if (n.t === 'link') {
                const href = safeLink(n.href);
                const f = n.href.startsWith('/') ? fileOf(n.href) : null;
                if (href) { const a = el('a', 'parley-link'); a.href = href; a.target = '_blank'; a.rel = 'noopener noreferrer nofollow'; a.title = href; inlines(n.c, a); into.append(a); }
                else if (f && open) { const holder = el('span'); inlines(n.c, holder); into.append(pathLink(f, holder)); }
                else inlines(n.c, into);
            } else if (n.t === 'img') into.append(imageOf(n));
            else if (n.t === 'math') into.append(formula(n));
        }
        return into;
    }
    /* The paths it cited that can be opened, in a run of text: each a link. */
    function splitPaths(text) {
        if (!refs.size || !open) return [text];
        const out = [];
        let rest = text;
        for (;;) {
            let best = null;
            for (const path of refs.keys()) { const at = rest.indexOf(path); if (at >= 0 && (best === null || at < best.at || (at === best.at && path.length > best.path.length))) best = { at, path }; }
            if (!best) break;
            const end = best.at + best.path.length;
            /* A path is whole: not the start of a longer one. */
            if (/[^\s.,;:!?)\]'"]/.test(rest[end] ?? ' ')) { out.push(rest.slice(0, end)); rest = rest.slice(end); continue; }
            if (best.at) out.push(rest.slice(0, best.at));
            out.push(pathLink({ path: best.path, open: refs.get(best.path) }));
            rest = rest.slice(end);
        }
        if (rest) out.push(rest);
        return out;
    }
    function imageOf(n) {
        const f = n.src.startsWith('/') ? fileOf(n.src) : null;
        const url = f && picture && PICTURE.test(n.src) ? ctx.pictureUrl(f) : null;
        if (url) return thumb(f, url, n.alt);
        /* Never loaded from anywhere else: its caption, said not shown. */
        const off = el('span', 'parley-noimg', n.alt || nameOf(n.src)); off.title = said(words, 'not-shown');
        return off;
    }
    /* A picture, its title under it (the caption it was given), its file's name on hover. */
    function thumb(file, url, alt) {
        const b = el('button', 'parley-thumb'); b.type = 'button';
        const name = file.path.split('/').pop();
        const img = el('img'); img.src = url; img.alt = alt || name; img.loading = 'lazy'; img.decoding = 'async'; img.dataset.zoom = url; img.dataset.name = name; img.dataset.title = alt || '';
        b.title = alt ? `${alt} - ${name}` : file.path; b.append(img);
        b.addEventListener('click', () => ctx.zoom(img));
        if (alt) { const fig = el('span', 'parley-figure'); fig.append(b, el('span', 'parley-caption', alt)); return fig; }
        return b;
    }
    function code(block) {
        const holder = el('div', 'parley-code');
        const bar = el('div', 'parley-code-bar');
        bar.append(el('span', 'parley-code-lang', block.lang));
        const pre = el('pre');
        const c = el('code', '', block.text);
        pre.append(c);
        const b = el('button', 'parley-copy'); b.type = 'button'; b.append(sign('copy'), el('span', '', said(words, 'copy')));
        b.addEventListener('click', () => copying(b, block.text, words, c));
        bar.append(b);
        holder.append(bar, pre);
        if (highlight && block.lang && block.text.length <= 40_000) {
            const key = `h:${block.lang}:${block.text}`;
            const paint = (tree) => { if (Array.isArray(tree)) c.replaceChildren(...tokens(tree, 0)); };
            if (cache.has(key)) paint(cache.get(key));
            else Promise.resolve().then(() => highlight(block.text, block.lang)).then((tree) => { if (Array.isArray(tree)) { cache.set(key, tree); paint(tree); } }, () => {});
        }
        return holder;
    }
    /* A token tree, as spans: its type a class, its text text. */
    function tokens(list, depth) {
        const out = [];
        for (const t of list) {
            if (typeof t === 'string') { out.push(t); continue; }
            if (!t || typeof t !== 'object' || depth > 12) continue;
            const span = el('span', 'parley-tok');
            for (const name of [t.type, ...(Array.isArray(t.alias) ? t.alias : [t.alias])]) if (typeof name === 'string' && /^[a-z][a-z-]{0,30}$/.test(name)) span.classList.add(`parley-tok-${name}`);
            span.append(...(Array.isArray(t.content) ? tokens(t.content, depth + 1) : [String(t.content ?? '')]));
            out.push(span);
        }
        return out;
    }
    function drawing(block) {
        if (!diagram || block.text.length > 20_000) return code(block);
        const fig = el('figure', 'parley-diagram');
        fig.append(el('span', 'parley-diagram-wait', said(words, 'diagram')));
        const key = `d:${block.text}`;
        const show = (url) => { const img = el('img'); img.src = url; img.alt = said(words, 'diagram'); img.dataset.zoom = url; img.dataset.name = said(words, 'diagram'); img.dataset.title = said(words, 'diagram'); const b = el('button', 'parley-thumb'); b.type = 'button'; b.append(img); b.addEventListener('click', () => ctx.zoom(img)); fig.replaceChildren(b); };
        const failed = () => fig.replaceWith(code({ ...block, lang: block.lang }));
        if (cache.has(key)) { const u = cache.get(key); if (u) show(u); else return code(block); }
        else {
            Promise.resolve().then(() => diagram(block.text)).then((svg) => {
                if (typeof svg !== 'string' || !/^\s*(<\?xml[^>]*>\s*)?<svg[\s>]/i.test(svg)) throw new Error('not a drawing');
                /* A picture runs nothing and loads nothing: the drawing is shown as one. */
                const url = URL.createObjectURL(new Blob([sized(svg)], { type: 'image/svg+xml' }));
                cache.set(key, url); ctx.urls.add(url); show(url);
            }).catch(() => { cache.set(key, null); failed(); });
        }
        return fig;
    }
    /* A FORMULA: its source first, in case KaTeX is not there or cannot read it; drawn once it is. */
    function formula(n) {
        const holder = el(n.display ? 'div' : 'span', 'parley-math');
        holder.dataset.display = String(Boolean(n.display));
        holder.title = n.tex;
        holder.append(el('code', 'parley-math-source', n.tex));
        if (!ctx.math) return holder;
        Promise.resolve().then(() => ctx.math(n.tex, Boolean(n.display))).then((drawn) => { if (drawn) { holder.replaceChildren(drawn); holder.dataset.drawn = 'true'; } else holder.dataset.failed = 'true'; }, () => { holder.dataset.failed = 'true'; });
        return holder;
    }
    /* THE SMALL CARD of a person or a zone: its name, a line, the application's
       button for its ref (only when the application names one), and "Talk
       about it" -- or, for what the agent asks about, the question and Reply. */
    function card(z, about, at) {
        const c = el('div', 'parley-zone-card'); c.setAttribute('role', 'dialog'); c.setAttribute('aria-label', z.unknown ? said(words, 'what-is-it') : z.label);
        c.append(el('p', 'parley-zone-card-name', z.unknown ? said(words, 'what-is-it') : z.label));
        if (z.line) c.append(el('p', 'parley-zone-card-line', z.line));
        const row = el('div', 'parley-zone-card-acts');
        if (z.unknown) { if (ctx.answer) row.append(button(said(words, 'reply'), 'parley-zone-card-main', () => ctx.answer(about))); }
        else {
            let word = null;
            try { word = z.ref && ctx.targets?.label ? ctx.targets.label(z.ref) : null; } catch { word = null; }
            if (typeof word === 'string' && word.trim()) row.append(button(word.trim().slice(0, 40), 'parley-zone-card-main', () => { try { ctx.targets.open?.(z.ref); } catch { /* the application's business */ } }));
            if (ctx.talk) row.append(button(said(words, 'talk-about'), 'parley-zone-card-talk', () => ctx.talk(about)));
        }
        if (row.childNodes.length) c.append(row);
        c.style.left = `${at.x}%`; c.style.top = `${at.y}%`;
        c.dataset.side = at.x > 62 ? 'end' : at.x < 38 ? 'start' : 'middle';
        return c;
    }
    /* One card open at a time, in a block; a second tap on the same closes it. */
    function picker(holder, items) {
        let open2 = null;
        const show = (key) => {
            const was = holder.querySelector('.parley-zone-card'); was?.parentNode?.removeChild(was);
            for (const it of items.values()) it.node.removeAttribute('data-picked');
            if (open2 === key || !items.has(key)) { open2 = null; return; }
            const it = items.get(key);
            it.node.dataset.picked = 'true';
            /* Where it is drawn now (a tree scrolled sideways), else where it was laid out. */
            let at = it.at;
            const r = it.node.getBoundingClientRect?.(); const h = holder.getBoundingClientRect?.();
            if (r && h && h.width > 0 && h.height > 0) at = { x: ((r.left + r.width / 2 - h.left) / h.width) * 100, y: ((r.bottom - h.top) / h.height) * 100 };
            const c = card(it.z, it.about, at);
            /* Once its button did what it says, the card has done its work. */
            for (const b of c.querySelectorAll('button')) b.addEventListener('click', () => { if (open2 === key) show(key); });
            holder.append(c);
            open2 = key;
        };
        return show;
    }
    const sv = (tag, attrs = {}, text) => { const e = document.createElementNS(SVGNS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v)); if (text !== undefined) e.textContent = text; return e; };
    /* A FAMILY, drawn: the generations in bands, couples joined by two rings,
       children under them, links of another kind dashed with their word. */
    function family(block) {
        const tree = block.text.length <= 20_000 ? familyOf(block.text) : null;
        if (!tree) return code(block);
        const { roots, links, bands } = tree;
        const all = [];
        let total = FPAD;
        let depth = 0;
        const walk = (n) => { depth = Math.max(depth, n.depth); n.people.forEach((p, k) => all.push({ p, n, k })); n.children.forEach(walk); };
        for (const r of roots) { widthOf(r); placeAt(r, total); total += r.w + FROOT; walk(r); }
        const W = total - FROOT + FPAD;
        const byName = new Map();
        for (const o of all) if (!byName.has(o.p.name)) byName.set(o.p.name, o);
        const cx = (o) => o.n.x + o.k * (FW + FGAP) + FW / 2;
        const drawn = links.map((l) => ({ ...l, A: byName.get(l.a), B: byName.get(l.b) })).filter((l) => l.A && l.B && l.A !== l.B);
        const lift = (l) => 22 + Math.min(58, Math.abs(cx(l.A) - cx(l.B)) * 0.09);
        const TOP = Math.max(12, ...drawn.filter((l) => l.A.n.depth === 0 && l.B.n.depth === 0).map((l) => lift(l) - 6));
        const bandTop = (d) => TOP + d * FROW;
        const cardTop = (d) => bandTop(d) + 24;
        const H = bandTop(depth) + FBAND + 6;
        const fig = el('figure', 'parley-family');
        const svg = sv('svg', { viewBox: `0 0 ${W} ${H}`, role: 'group' });
        svg.setAttribute('aria-label', said(words, 'family'));
        fig.style.setProperty?.('--parley-family-width', `${W}px`);
        const back = sv('g'); const names = sv('g'); const lines = sv('g', { class: 'parley-family-lines' }); const people = sv('g'); const extra = sv('g', { class: 'parley-family-links' });
        for (let d = 0; d <= depth; d += 1) {
            back.append(sv('rect', { x: 2, y: bandTop(d), width: W - 4, height: FBAND, rx: 14, class: 'parley-family-band' }));
            if (bands[d]) names.append(sv('text', { x: 16, y: bandTop(d) + 15, class: 'parley-family-gen' }, bands[d]));
        }
        const items = new Map();
        for (const n of new Set(all.map((o) => o.n))) {
            const top = cardTop(n.depth); const mid = top + FH / 2;
            n.people.forEach((p, k) => {
                const x = n.x + k * (FW + FGAP);
                const g = sv('g', { class: 'parley-family-person', tabindex: 0, role: 'button' });
                g.setAttribute('aria-label', p.dates ? `${p.name}, ${p.dates}` : p.name);
                if (p.inlaw) g.dataset.inlaw = 'true';
                g.append(sv('rect', { x, y: top, width: FW, height: FH, rx: 12, class: 'parley-family-card' }));
                g.append(sv('rect', { x: x + 10, y: top, width: FW - 20, height: 4, rx: 2, class: 'parley-family-bar' }));
                g.append(sv('text', { x: x + FW / 2, y: top + (p.dates ? 27 : 35), class: 'parley-family-name' }, p.name.length > 16 ? `${p.name.slice(0, 15)}…` : p.name));
                if (p.dates) g.append(sv('text', { x: x + FW / 2, y: top + 45, class: 'parley-family-dates' }, p.dates));
                people.append(g);
                const others = drawn.filter((l) => l.A.p === p || l.B.p === p).map((l) => `${l.word} : ${(l.A.p === p ? l.B : l.A).p.name}`);
                const key = `${n.depth}:${x}`;
                items.set(key, { node: g, z: { label: p.name, ref: p.ref, line: [p.dates, n.note, ...others].filter(Boolean).join(' · ') }, about: { label: p.name, ...(p.ref ? { ref: p.ref } : {}) }, at: { x: ((x + FW / 2) / W) * 100, y: ((top + FH + 6) / H) * 100 } });
                g.addEventListener('click', () => show(key));
                g.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); show(key); } });
            });
            if (n.people.length === 2) {
                const x1 = n.x + FW; const x2 = x1 + FGAP; const c = (x1 + x2) / 2;
                lines.append(sv('line', { x1, y1: mid, x2, y2: mid }));
                people.append(sv('circle', { cx: c - 4, cy: mid, r: 6, class: 'parley-family-ring parley-family-ring-first' }), sv('circle', { cx: c + 4, cy: mid, r: 6, class: 'parley-family-ring' }));
                const year = /\b(1[0-9]\d\d|20\d\d)\b/.exec(n.note)?.[1];
                if (year) people.append(sv('text', { x: c, y: mid + 22, class: 'parley-family-word' }, year));
            }
            const from = n.people.length === 2 ? n.x + FW + FGAP / 2 : n.x + FW / 2;
            const start = n.people.length === 2 ? mid + (/\b(1[0-9]\d\d|20\d\d)\b/.test(n.note) ? 28 : 8) : top + FH;
            const bus = top + FH + (FROW - FH) / 2 + 2;
            for (const c of n.children) {
                const to = c.x + FW / 2; const r = Math.min(12, Math.abs(to - from) / 2); const sgn = Math.sign(to - from);
                lines.append(sv('path', { d: sgn ? `M${from} ${start} V${bus - r} Q${from} ${bus} ${from + sgn * r} ${bus} H${to - sgn * r} Q${to} ${bus} ${to} ${bus + r} V${cardTop(c.depth)}` : `M${from} ${start} V${cardTop(c.depth)}` }));
            }
        }
        for (const l of drawn) {
            let A = l.A; let B = l.B;
            if (A.n.depth > B.n.depth) [A, B] = [B, A];
            const ax = cx(A); const bx = cx(B);
            let d; let lx; let ly;
            if (A.n.depth === B.n.depth) { const y = cardTop(A.n.depth); const h = lift(l); d = `M${ax} ${y} C${ax} ${y - h * 1.3} ${bx} ${y - h * 1.3} ${bx} ${y}`; lx = (ax + bx) / 2; ly = y - h + 2; }
            else { const y1 = cardTop(A.n.depth) + FH; const y2 = cardTop(B.n.depth); const my = (y1 + y2) / 2; d = `M${ax} ${y1} C${ax} ${my + 30} ${bx} ${my - 30} ${bx} ${y2}`; lx = (ax + bx) / 2 + (bx > ax ? 26 : -26); ly = my + 4; }
            extra.append(sv('path', { d }), sv('text', { x: lx, y: ly, class: 'parley-family-word' }, l.word));
        }
        svg.append(back, lines, extra, names, people);
        const scroller = el('div', 'parley-family-scroll'); scroller.append(svg);
        fig.append(scroller);
        const show = picker(fig, items);
        return fig;
    }
    /* A PICTURE WITH ZONES: shown only from a path the application opens, as any picture; the zones over it. */
    function zoned(block) {
        const z = block.text.length <= 20_000 ? zonesOf(block.text) : null;
        const f = z && z.src.startsWith('/') ? fileOf(z.src) : null;
        const url = f && picture && PICTURE.test(z.src) ? ctx.pictureUrl(f) : null;
        if (!url) return code(block);
        const fig = el('figure', 'parley-zoned');
        const frame = el('div', 'parley-zoned-frame');
        const img = el('img'); img.src = url; img.alt = z.alt || nameOf(z.src); img.decoding = 'async'; img.dataset.zoom = url; img.dataset.name = nameOf(z.src); img.dataset.title = z.alt || '';
        img.addEventListener('click', () => ctx.zoom(img));
        frame.append(img);
        const items = new Map();
        z.zones.forEach((one, k) => {
            const [x, y, w, h] = one.box;
            const b = el('button', 'parley-zone'); b.type = 'button';
            b.style.left = `${x * 100}%`; b.style.top = `${y * 100}%`; b.style.width = `${w * 100}%`; b.style.height = `${h * 100}%`;
            b.setAttribute('aria-label', one.unknown ? said(words, 'what-is-it') : one.label);
            if (one.unknown) { b.dataset.unknown = 'true'; b.append(el('span', 'parley-zone-ask', '?')); }
            const key = String(k);
            items.set(key, { node: b, z: one, about: { label: one.label, ...(one.ref ? { ref: one.ref } : {}), picture: z.src, box: one.box }, at: { x: (x + w / 2) * 100, y: Math.min(100, (y + h) * 100) } });
            b.addEventListener('click', (event) => { event.stopPropagation(); show(key); });
            frame.append(b);
        });
        fig.append(frame);
        if (z.alt) fig.append(el('figcaption', 'parley-caption', z.alt));
        const show = picker(frame, items);
        return fig;
    }
    function blocks(list, into) {
        for (const b of list) into.append(block(b));
        return into;
    }
    function block(b) {
        if (b.t === 'p') {
            const p = inlines(b.c, el('p'));
            /* Pictures alone on a line: side by side. */
            if (b.c.some((n) => n.t === 'img') && b.c.every((n) => n.t === 'img' || n.t === 'br' || (n.t === 'text' && !n.v.trim()))) p.className = 'parley-pictures';
            return p;
        }
        if (b.t === 'h') { const h = el(`h${Math.min(6, b.level + 2)}`, `parley-h parley-h${b.level}`); return inlines(b.c, h); }
        if (b.t === 'hr') return el('hr');
        if (b.t === 'math') return formula(b);
        if (b.t === 'code') return b.lang === 'mermaid' ? drawing(b) : b.lang === 'family' ? family(b) : b.lang === 'picture' ? zoned(b) : code(b);
        if (b.t === 'quote') return blocks(b.c, el('blockquote'));
        if (b.t === 'alert') {
            const box = el('div', 'parley-callout'); box.dataset.kind = b.kind; box.setAttribute('role', 'note');
            const head = el('p', 'parley-callout-head'); head.append(sign(b.kind), el('span', '', said(words, b.kind)));
            box.append(head);
            return blocks(b.c, box);
        }
        if (b.t === 'list') {
            const list = el(b.ordered ? 'ol' : 'ul');
            if (b.start !== undefined && Number.isInteger(b.start)) list.start = b.start;
            for (const item of b.items) {
                const li = el('li');
                if (item.task !== null) { li.className = 'parley-task'; const box = el('span', 'parley-check', item.task ? '☑' : '☐'); box.dataset.done = String(item.task); li.append(box); }
                /* A list of single lines stays tight. */
                if (item.c.length === 1 && item.c[0].t === 'p') inlines(item.c[0].c, li); else blocks(item.c, li);
                list.append(li);
            }
            return list;
        }
        if (b.t === 'table') {
            const wrap = el('div', 'parley-table'); wrap.tabIndex = 0;
            const table = el('table');
            const head = el('thead'); const tr = el('tr');
            b.head.forEach((cell, k) => { const th = el('th'); if (b.align[k]) th.style.textAlign = b.align[k]; tr.append(inlines(cell, th)); });
            head.append(tr);
            const body = el('tbody');
            for (const row of b.rows) { const r = el('tr'); row.forEach((cell, k) => { const td = el('td'); if (b.align[k]) td.style.textAlign = b.align[k]; r.append(inlines(cell, td)); }); body.append(r); }
            table.append(head, body); wrap.append(table);
            return wrap;
        }
        return el('span');
    }
    return { blocks, inlines, thumb };
}

/* A PICTURE, LARGE, as a chat app shows it: it grows out of its thumbnail
   (briefly; not at all for whoever asked for less motion); zoomed with a
   pinch, a double tap, the wheel, + and - (up to ZOOM_MAX times the fitted
   size), moved when zoomed (drag); the previous or next picture with the
   arrows, a swipe, or the strip of small pictures at the bottom; closed
   simply: a tap on the picture not zoomed, or on the ground around it, a
   swipe down on a touch screen, Escape, or its button. A pinch on it
   zooms the picture alone, never the page: two fingers on the stage are
   kept from the browser (touch events not passive, as touch-action is not
   always obeyed: a browser set to "force zoom" ignores it); and if the
   page is zoomed all the same while it is open, the viewer is sized back
   to the screen (visualViewport), its bars keeping their size. */
const ZOOM_MAX = 8;
/* WHAT IS OPEN OVER THE THREAD, AND BACK. Each layer says when it opens and
   when it closes; the steps are the page's history (the default), the page's
   own (an object), or none. A layer closed and another opened at once (the
   menu, then the search) share one step: the step is given back a moment
   later only if nothing took it. */
export function stepper(back = true) {
    const host = back && typeof back === 'object' && typeof back.open === 'function' ? back : null;
    const own = !host && back !== false && typeof history !== 'undefined' && typeof addEventListener === 'function';
    const open = [];
    let owed = 0; let ignore = 0; let later = null;
    const level = () => { const v = history.state?.parley; return Number.isInteger(v) && v > 0 ? v : 0; };
    const steps = () => open.filter((x) => x.step).length;
    const giveBack = () => { later = null; const n = owed; owed = 0; if (n > 0) { ignore += 1; history.go(-n); } };
    const popped = () => {
        if (ignore > 0) { ignore -= 1; return; }
        const at = level();
        while (steps() > at) { const i = open.findLastIndex((x) => x.step); const [x] = open.splice(i, 1); try { x.close(); } catch { /* gone */ } }
    };
    if (own) addEventListener('popstate', popped);
    return {
        opened(name, close) {
            const there = open.find((x) => x.name === name);
            if (there) { there.close = close; return; }
            const x = { name, close, step: false, token: undefined };
            open.push(x);
            if (host) { try { x.token = host.open(name, () => { const i = open.indexOf(x); if (i >= 0) open.splice(i, 1); close(); }); } catch { /* the page's business */ } }
            else if (own) {
                x.step = true;
                if (owed > 0) owed -= 1;
                else { try { history.pushState({ ...(history.state ?? {}), parley: steps() }, '', location.href); } catch { x.step = false; } }
            }
        },
        closed(name) {
            const i = open.findIndex((x) => x.name === name);
            if (i < 0) return;
            const [x] = open.splice(i, 1);
            if (host) { try { host.closed?.(x.token); } catch { /* the page's business */ } }
            else if (x.step) { owed += 1; later ??= setTimeout(giveBack, 0); }
        },
        get open() { return open.map((x) => x.name); },
        destroy() { if (own) removeEventListener('popstate', popped); clearTimeout(later); later = null; open.length = 0; },
    };
}
const OPEN_MS = 220;
function zoomer(root, words, steps) {
    const box = el('div', 'parley-zoom'); box.hidden = true; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.tabIndex = -1;
    const bar = el('div', 'parley-zoom-bar');
    const title = el('span', 'parley-zoom-name');
    /* Each button says what it does: an icon only where it is plain (- + < >), and
       its word next to it where there is room; "1:1" and "Fit" in words; Close
       apart, at the end, with its word always. */
    const tool = (kind, key, act, short) => {
        const b = el('button', `parley-zoom-${kind}`); b.type = 'button'; b.title = said(words, key); b.setAttribute('aria-label', b.title);
        if (kind === 'left') b.append(icon('chevron-left', 'parley-sign'));
        else if (kind === 'right') b.append(icon('chevron-right', 'parley-sign'));
        else if (kind === 'close') b.append(icon('x', 'parley-sign'));
        else if (kind === 'draw') b.append(icon('pencil', 'parley-sign'));
        else if (kind === 'minus' || kind === 'plus') b.append(sign(kind));
        b.append(el('span', short ? 'parley-zoom-short' : 'parley-zoom-word', short ? said(words, short) : said(words, key)));
        b.addEventListener('click', act); return b;
    };
    const stage = el('div', 'parley-zoom-stage');
    const img = el('img'); img.alt = ''; img.draggable = false;
    stage.append(img);
    const strip = el('div', 'parley-zoom-strip'); strip.setAttribute('role', 'group');
    let list = [];
    let at = 0;
    let s = 1; let tx = 0; let ty = 0; let fit = 1;
    let back = null;
    let from = null;
    const still = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    /* Sizes in the stage's own pixels; `k`, screen pixels per stage pixel (other than 1 only while the page is zoomed). */
    const size = () => ({ w: stage.offsetWidth || stage.getBoundingClientRect().width || 1, h: stage.offsetHeight || stage.getBoundingClientRect().height || 1 });
    const k = () => { const w = stage.offsetWidth; const r = stage.getBoundingClientRect().width; return w && r ? r / w : 1; };
    const natural = () => ({ w: img.naturalWidth || 1, h: img.naturalHeight || 1 });
    const max = () => Math.max(fit * ZOOM_MAX, 2);
    const apply = () => { img.style.transform = `translate(${tx}px, ${ty}px) scale(${s})`; box.dataset.zoomed = String(s > fit * 1.01); };
    const clamp = () => {
        const { w, h } = size(); const n = natural();
        const iw = n.w * s; const ih = n.h * s;
        tx = iw <= w ? (w - iw) / 2 : Math.min(0, Math.max(w - iw, tx));
        ty = ih <= h ? (h - ih) / 2 : Math.min(0, Math.max(h - ih, ty));
    };
    const zoomTo = (next, px, py) => {
        const { w, h } = size();
        const x = px ?? w / 2; const y = py ?? h / 2;
        const to = Math.min(max(), Math.max(fit * 0.5, next));
        tx = x - (x - tx) * (to / s); ty = y - (y - ty) * (to / s); s = to;
        clamp(); apply();
    };
    const fitIn = () => { const { w, h } = size(); const n = natural(); fit = Math.min(1, w / n.w, h / n.h); s = fit; tx = 0; ty = 0; clamp(); apply(); };
    /* Grows out of the thumbnail it was opened from: from its place and size to the fitted ones. */
    const grow = () => {
        const r = from; from = null;
        if (!r || still() || !r.width) return;
        const st = stage.getBoundingClientRect(); const n = natural();
        const q = k(); const g = r.width / q / (n.w * s);
        const fx = tx; const fy = ty; const fs = s;
        img.style.transition = 'none';
        img.style.transform = `translate(${(r.left - st.left) / q}px, ${(r.top - st.top) / q}px) scale(${fs * g})`;
        box.dataset.opening = 'true';
        void img.getBoundingClientRect();
        img.style.transition = `transform ${OPEN_MS}ms cubic-bezier(.2,.8,.2,1)`;
        img.style.transform = `translate(${fx}px, ${fy}px) scale(${fs})`;
        setTimeout(() => { img.style.transition = ''; delete box.dataset.opening; }, OPEN_MS + 30);
    };
    /* The next or previous picture comes in from its side, as the last one went out: never a jump. */
    let slide = 0;
    const slideIn = () => {
        const d = slide; slide = 0;
        if (!d || still()) return;
        const { w } = size();
        img.style.transition = 'none'; img.style.opacity = '0';
        img.style.transform = `translate(${tx + d * w * 0.4}px, ${ty}px) scale(${s})`;
        void img.getBoundingClientRect();
        img.style.transition = `transform ${OPEN_MS}ms cubic-bezier(.2,.8,.2,1), opacity ${OPEN_MS}ms ease-out`;
        img.style.opacity = ''; apply();
        setTimeout(() => { img.style.transition = ''; }, OPEN_MS + 30);
    };
    const enter = () => { if (slide) { from = null; slideIn(); } else grow(); };
    img.addEventListener('load', () => { fitIn(); enter(); });
    const go = (step) => { if (list.length < 2) return; at = (at + step + list.length) % list.length; slide = step; load(); };
    const prev = tool('left', 'previous', () => go(-1));
    const next = tool('right', 'next', () => go(1));
    const tools = el('div', 'parley-zoom-tools'); tools.setAttribute('role', 'group');
    tools.append(tool('minus', 'zoom-out', () => zoomTo(s / 1.5)), tool('plus', 'zoom-in', () => zoomTo(s * 1.5)), tool('actual', 'zoom-actual', () => zoomTo(1), 'zoom-actual-short'), tool('fit', 'zoom-fit', fitIn, 'zoom-fit-short'), prev, next);
    /* Drawn on, and sent again: the picture shown, taken into the box with its source (the chat says where). */
    let annotate = null;
    const redraw = tool('draw', 'draw-again', () => { const item = list[at]; if (!item || !annotate) return; close(); void annotate(item); });
    redraw.hidden = true;
    tools.append(redraw);
    const shut = tool('close', 'close', () => close(), 'close');
    bar.append(title, tools, shut);
    box.append(bar, stage, strip);
    function paintStrip() {
        strip.hidden = list.length < 2;
        if (strip.hidden) { strip.replaceChildren(); return; }
        strip.replaceChildren(...list.map((item, i) => {
            const b = el('button', 'parley-zoom-thumb'); b.type = 'button'; b.title = item.title || item.name; b.setAttribute('aria-label', b.title);
            if (i === at) b.setAttribute('aria-current', 'true');
            const small = el('img'); small.src = item.url; small.alt = ''; small.loading = 'lazy'; b.append(small);
            b.addEventListener('click', () => { if (i === at) return; slide = i > at ? 1 : -1; at = i; load(); });
            return b;
        }));
        strip.querySelector('[aria-current]')?.scrollIntoView?.({ block: 'nearest', inline: 'center' });
    }
    function load() {
        const item = list[at];
        title.textContent = `${item.title || item.name}${list.length > 1 ? ` (${at + 1}/${list.length})` : ''}`;
        title.title = item.name;
        prev.hidden = next.hidden = list.length < 2;
        redraw.hidden = !annotate;
        img.style.transition = ''; img.style.opacity = ''; box.style.opacity = ''; delete box.dataset.dragging; delete box.dataset.sliding;
        const same = img.getAttribute('src') === item.url;
        img.src = item.url; img.alt = item.title || item.name;
        paintStrip();
        if (same || (img.complete && img.naturalWidth)) { fitIn(); enter(); }
    }
    /* The page zoomed while it is open: the viewer covers the screen at its own size again. */
    const view = () => (typeof window !== 'undefined' ? window.visualViewport : null);
    const keep = () => {
        const v = view();
        if (box.hidden || !v || Math.abs(v.scale - 1) < 0.01) { box.style.transform = ''; box.style.transformOrigin = ''; box.style.width = ''; box.style.height = ''; box.style.right = ''; box.style.bottom = ''; box.dataset.kept = 'false'; }
        else {
            box.style.transformOrigin = '0 0'; box.style.right = 'auto'; box.style.bottom = 'auto';
            box.style.width = `${v.width * v.scale}px`; box.style.height = `${v.height * v.scale}px`;
            box.style.transform = `translate(${v.offsetLeft}px, ${v.offsetTop}px) scale(${1 / v.scale})`;
            box.dataset.kept = 'true';
        }
        if (!box.hidden && img.naturalWidth) { if (s <= fit * 1.01) fitIn(); else { clamp(); apply(); } }
    };
    const watch = (on) => { const v = view(); if (!v) return; for (const type of ['resize', 'scroll']) (on ? v.addEventListener : v.removeEventListener).call(v, type, keep); };
    function close() { steps?.closed('zoom'); clearTimeout(tapping); watch(false); box.hidden = true; keep(); box.style.opacity = ''; img.removeAttribute('src'); try { back?.focus?.({ preventScroll: true }); } catch { /* gone */ } }
    box.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') { event.preventDefault(); close(); }
        else if (event.key === 'ArrowLeft') go(-1);
        else if (event.key === 'ArrowRight') go(1);
        else if (event.key === '+' || event.key === '=') zoomTo(s * 1.5);
        else if (event.key === '-') zoomTo(s / 1.5);
        else if (event.key === '0') fitIn();
    });
    stage.addEventListener('wheel', (event) => { event.preventDefault(); const r = stage.getBoundingClientRect(); const q = k(); zoomTo(s * Math.exp(-event.deltaY * 0.0015), (event.clientX - r.left) / q, (event.clientY - r.top) / q); }, { passive: false });
    /* Two fingers on the picture are the picture's: the browser does not zoom the page with them. */
    const mine = (event) => { if (event.touches && event.touches.length >= 2 && event.cancelable) event.preventDefault(); };
    stage.addEventListener('touchstart', mine, { passive: false });
    stage.addEventListener('touchmove', mine, { passive: false });
    stage.addEventListener('gesturestart', (event) => event.preventDefault?.(), { passive: false });
    /* Fingers and a mouse: one moves (or swipes), two pinch, a double tap zooms, one tap closes. */
    const pointers = new Map();
    let pinch = null; let start = null; let lastTap = 0; let tapping;
    stage.addEventListener('pointerdown', (event) => {
        stage.setPointerCapture?.(event.pointerId);
        pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (pointers.size === 1) start = { x: event.clientX, y: event.clientY, tx, ty, t: Date.now(), touch: event.pointerType !== 'mouse' };
        if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, s }; start = null; }
    });
    stage.addEventListener('pointermove', (event) => {
        if (!pointers.has(event.pointerId)) return;
        pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        const r = stage.getBoundingClientRect(); const q = k();
        if (pointers.size === 2 && pinch) { const [a, b] = [...pointers.values()]; zoomTo(pinch.s * (Math.hypot(a.x - b.x, a.y - b.y) / pinch.d), ((a.x + b.x) / 2 - r.left) / q, ((a.y + b.y) / 2 - r.top) / q); return; }
        if (pointers.size !== 1 || !start) return;
        if (s > fit * 1.01) { tx = start.tx + (event.clientX - start.x) / q; ty = start.ty + (event.clientY - start.y) / q; clamp(); apply(); return; }
        /* Not zoomed, pulled sideways: it follows, toward the next or the previous one. */
        const dx = event.clientX - start.x;
        const dy = event.clientY - start.y;
        if (list.length > 1 && !box.dataset.dragging && (box.dataset.sliding || (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)))) { box.dataset.sliding = 'true'; img.style.transition = 'none'; img.style.transform = `translate(${start.tx + dx / q}px, ${start.ty}px) scale(${s})`; return; }
        /* Not zoomed, pulled down by a finger: it follows, and fades. */
        if (start.touch && dy > 10 && Math.abs(dy) > Math.abs(event.clientX - start.x)) { box.dataset.dragging = 'true'; img.style.transform = `translate(${start.tx}px, ${start.ty + dy / q}px) scale(${s})`; box.style.opacity = String(Math.max(0.35, 1 - dy / 600)); }
    });
    const up = (event) => {
        if (!pointers.has(event.pointerId)) return;
        pointers.delete(event.pointerId);
        if (pointers.size < 2) pinch = null;
        if (pointers.size > 0 || !start) return;
        const dx = event.clientX - start.x; const dy = event.clientY - start.y;
        const was = start; start = null;
        if (box.dataset.dragging) { delete box.dataset.dragging; if (dy > 90) { close(); return; } box.style.opacity = ''; apply(); return; }
        if (box.dataset.sliding) {
            delete box.dataset.sliding;
            if (Math.abs(dx) > 60) { go(dx < 0 ? 1 : -1); return; }
            /* Not far enough: back where it was. */
            img.style.transition = still() ? '' : `transform ${OPEN_MS}ms ease-out`; apply();
            setTimeout(() => { img.style.transition = ''; }, OPEN_MS + 30);
            return;
        }
        if (s <= fit * 1.01 && Math.abs(dx) > 60 && Math.abs(dy) < 80) { go(dx < 0 ? 1 : -1); return; }
        if (Math.hypot(dx, dy) >= 10 || Date.now() - was.t >= 300) return;
        const now = Date.now();
        const r = stage.getBoundingClientRect();
        if (now - lastTap < 320) {
            clearTimeout(tapping); lastTap = 0;
            if (s > fit * 1.01) fitIn(); else zoomTo(Math.max(fit * 2.5, 1), (event.clientX - r.left) / k(), (event.clientY - r.top) / k());
            return;
        }
        lastTap = now;
        /* One tap closes it, zoomed in or not, on the picture or beside it -- once it is sure no second tap
           follows (two zoom). What moves it (a finger or the mouse dragged, two fingers) never closes it. */
        clearTimeout(tapping); tapping = setTimeout(() => { if (!box.hidden) close(); }, 330);
    };
    stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', (event) => { pointers.delete(event.pointerId); start = null; pinch = null; delete box.dataset.dragging; delete box.dataset.sliding; box.style.opacity = ''; img.style.transition = ''; apply(); });
    return {
        box,
        /* `all`: [{ url, name, title }]; `thumb`: the element it was opened from, to grow out of. */
        show(all, index, thumb) {
            if (!all.length) return;
            back = document.activeElement; list = all; at = Math.max(0, Math.min(all.length - 1, index));
            try { from = thumb?.getBoundingClientRect?.() ?? null; } catch { from = null; }
            box.hidden = false; watch(true); keep(); load(); box.focus?.({ preventScroll: true });
            steps?.opened('zoom', close);
        },
        get open() { return !box.hidden; },
        close,
        /* `fn(item)`: what "draw on it and send it" does; none: not offered. */
        set annotate(fn) { annotate = typeof fn === 'function' ? fn : null; },
    };
}

/* DRAWING ON A PICTURE before it is sent, and a note about it alone: what the person
   means ("this button", "here") is where they point. Lines are kept in the picture's own
   pixels, so they stay where they were drawn whatever the screen; sent as one picture. */
/* The colours of the pen: seen on light and dark pictures alike. */
export const PEN_COLOURS = Object.freeze(['#e53935', '#fdd835', '#1e88e5', '#43a047', '#ffffff', '#111111']);
/* A picture drawn on is sent no larger than this on its longest side. */
export const DRAWN_MAX_PX = 2048;
/* How thick a line is, in the picture's pixels: seen on a large picture, not a blot on a small one. */
export const penWidth = (w, h) => Math.max(3, Math.round(Math.max(w, h) / 150));
/* The name it is sent under: what it was, and that it was drawn on. */
export const drawnName = (name, type) => `${String(name ?? '').replace(/\.[A-Za-z0-9]{1,5}$/, '') || 'picture'}-annotated.${type === 'image/jpeg' ? 'jpg' : 'png'}`;
/* The size it is drawn at: its own, made smaller only past the most. */
export const drawnSize = (w, h, most = DRAWN_MAX_PX) => { const k = Math.min(1, most / Math.max(w, h, 1)); return { w: Math.max(1, Math.round(w * k)), h: Math.max(1, Math.round(h * k)) }; };
function annotator(words, steps) {
    const box = el('div', 'parley-zoom parley-draw'); box.hidden = true; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.tabIndex = -1;
    const bar = el('div', 'parley-zoom-bar');
    const title = el('span', 'parley-zoom-name');
    const tool = (kind, key, name, act) => {
        const b = el('button', `parley-zoom-${kind}`); b.type = 'button'; b.title = said(words, key); b.setAttribute('aria-label', b.title);
        b.append(icon(name, 'parley-sign'), el('span', 'parley-zoom-word', said(words, key)));
        b.addEventListener('click', act); return b;
    };
    const stage = el('div', 'parley-draw-stage');
    const canvas = el('canvas', 'parley-draw-canvas');
    stage.append(canvas);
    const colours = el('div', 'parley-draw-colours'); colours.setAttribute('role', 'radiogroup'); colours.setAttribute('aria-label', said(words, 'draw-colour'));
    let colour = PEN_COLOURS[0];
    const swatches = PEN_COLOURS.map((c) => {
        const b = el('button', 'parley-draw-colour'); b.type = 'button'; b.style.backgroundColor = c; b.dataset.colour = c;
        b.setAttribute('role', 'radio'); b.setAttribute('aria-label', `${said(words, 'draw-colour')} ${c}`);
        b.addEventListener('click', () => { colour = c; paintSwatches(); });
        return b;
    });
    const paintSwatches = () => { for (const b of swatches) b.setAttribute('aria-checked', String(b.dataset.colour === colour)); };
    colours.append(...swatches); paintSwatches();
    const undo = tool('undo', 'draw-undo', 'undo-2', () => { strokes.pop(); paint(); });
    const clear = tool('clear', 'draw-clear', 'eraser', () => { strokes = []; paint(); });
    const cancel = tool('close', 'draw-cancel', 'x', () => close(null));
    const done = tool('done', 'draw-done', 'check', () => { void finish(); });
    bar.append(title, colours, undo, clear, cancel, done);
    const foot = el('div', 'parley-draw-foot');
    const note = el('textarea', 'parley-draw-note'); note.rows = 2; note.maxLength = 500; note.placeholder = said(words, 'draw-note'); note.setAttribute('aria-label', said(words, 'draw-note'));
    const hint = el('p', 'parley-draw-hint', said(words, 'draw-hint'));
    foot.append(hint, note);
    box.append(bar, stage, foot);
    const img = el('img');
    let strokes = []; let drawing = null; let file = null; let done2 = null; let back = null;
    const pen = () => penWidth(canvas.width, canvas.height);
    const line = (ctx, st) => {
        ctx.strokeStyle = st.colour; ctx.lineWidth = st.width; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath(); const [x0, y0] = st.points[0]; ctx.moveTo(x0, y0);
        if (st.points.length === 1) ctx.lineTo(x0 + 0.01, y0); else for (const [x, y] of st.points.slice(1)) ctx.lineTo(x, y);
        ctx.stroke();
    };
    function paint() {
        const ctx = canvas.getContext('2d'); if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        for (const st of strokes) line(ctx, st);
        undo.disabled = clear.disabled = strokes.length === 0;
    }
    /* The canvas fills what room there is, keeping the picture's shape. */
    const fit = () => {
        const w = stage.clientWidth || 1; const h = stage.clientHeight || 1;
        const k = Math.min(w / canvas.width, h / canvas.height);
        canvas.style.width = `${Math.floor(canvas.width * k)}px`; canvas.style.height = `${Math.floor(canvas.height * k)}px`;
    };
    const at = (event) => { const r = canvas.getBoundingClientRect(); return [(event.clientX - r.left) * (canvas.width / (r.width || 1)), (event.clientY - r.top) * (canvas.height / (r.height || 1))]; };
    canvas.addEventListener('pointerdown', (event) => {
        if (event.button !== undefined && event.button !== 0) return;
        event.preventDefault();
        try { canvas.setPointerCapture(event.pointerId); } catch { /* not given */ }
        drawing = { id: event.pointerId, colour, width: pen(), points: [at(event)] };
        strokes.push(drawing); paint();
    });
    canvas.addEventListener('pointermove', (event) => {
        if (!drawing || event.pointerId !== drawing.id) return;
        drawing.points.push(at(event));
        const ctx = canvas.getContext('2d'); if (ctx) line(ctx, { ...drawing, points: drawing.points.slice(-2) });
    });
    const lift = (event) => { if (drawing && event.pointerId === drawing.id) { drawing = null; paint(); } };
    canvas.addEventListener('pointerup', lift); canvas.addEventListener('pointercancel', lift);
    box.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') { event.preventDefault(); close(null); }
        else if ((event.ctrlKey || event.metaKey) && event.key === 'z' && event.target !== note) { event.preventDefault(); strokes.pop(); paint(); }
    });
    const onResize = () => { if (!box.hidden) fit(); };
    function close(result) {
        if (box.hidden) return;
        box.hidden = true; removeEventListener('resize', onResize);
        steps?.closed('draw');
        try { back?.focus?.({ preventScroll: true }); } catch { /* gone */ }
        const r = done2; done2 = null; r?.(result);
    }
    async function finish() {
        const kept = { strokes: strokes.map((st) => ({ ...st, points: [...st.points] })), note: note.value.replace(/\s+/g, ' ').trim().slice(0, 500), drawn: null };
        if (strokes.length) {
            const type = file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png';
            const blob = await new Promise((resolve) => { try { canvas.toBlob(resolve, type, 0.9); } catch { resolve(null); } });
            if (blob) kept.drawn = new File([blob], drawnName(file.name, type), { type });
        }
        close(kept);
    }
    return {
        box,
        get open() { return !box.hidden; },
        /* Opens `picture` (a File) at `url`, with what was drawn and noted on it before. Resolves with
           { strokes, note, drawn } (drawn: the picture to send, or null when nothing is drawn), or null when given up. */
        edit(picture, url, before = {}) {
            close(null);
            return new Promise((resolve) => {
                file = picture; done2 = resolve; back = document.activeElement;
                title.textContent = picture.name;
                strokes = (before.strokes ?? []).map((st) => ({ ...st, points: [...st.points] }));
                note.value = before.note ?? '';
                img.onload = () => {
                    const { w, h } = drawnSize(img.naturalWidth, img.naturalHeight);
                    canvas.width = w; canvas.height = h; paint(); fit();
                };
                img.onerror = () => close(null);
                img.src = url;
                box.hidden = false; addEventListener('resize', onResize);
                box.focus?.({ preventScroll: true });
                steps?.opened('draw', () => close(null));
            });
        },
        close: () => close(null),
    };
}

/* The kind of a file, as a short tag on its card. */
const extOf = (name) => { const m = /\.([a-z0-9]{1,5})$/i.exec(String(name ?? '')); return m ? m[1].toUpperCase() : ''; };
/* The icon of a file's kind, and its kind and size in a word under its name. */
const fileGlyph = (name) => { const holder = el('span', 'parley-card-icon'); holder.dataset.kind = fileIcon(name); holder.append(icon(fileIcon(name), 'parley-sign')); return holder; };
const kindLine = (name, size) => el('span', 'parley-size', [extOf(name), size].filter(Boolean).join(' · '));
/* A file, as one card: its kind's icon, its name, its kind and size. One that can be opened IS the button:
   a tap anywhere on it opens it, no "Open" beside it to aim for. */
function card(file, words, open, size, title) {
    const opens = Boolean(open && file.open !== null);
    const c = opens ? button('', 'parley-card parley-open', () => open(file)) : el('span', 'parley-card');
    const about = el('span', 'parley-card-about'); about.append(el('span', 'parley-name', title || file.name));
    if (title && title !== file.name) c.title = file.name;
    about.append(kindLine(file.name, size));
    c.append(fileGlyph(file.name), about);
    if (opens) { c.setAttribute('aria-label', `${said(words, 'open')}: ${title || file.name}`); c.dataset.opens = 'true'; }
    return c;
}

export function mount(root, { load, send, words = {}, open, terminal, remind, view: first = 'simple', onView, every = 3000, locale,
    voice: speaking, autoSend = false, onAutoSend, replies: ready = [], enter = 'auto', touch, attach, act,
    markdown: rich = false, picture, diagram, highlight, agentName, agentTool, react, reactions: offered = REACTIONS,
    secrets: liveSecrets = {}, forget,
    receivedAfter = RECEIVED_MS, noAnswerAfter = NO_ANSWER_MS, back = true, draft: draftKey = '', math: mathGiven, refs: zoneRefs,
    window: shownAtFirst, search: searchAll, side: sideGiven, card: toCard } = {}) {
    const steps = stepper(back);
    /* What is asked of load() at first, and for each page before it: { last } or { days }. */
    const span = windowOf(shownAtFirst);
    const formula = mathFrom(mathGiven);
    /* The set of reactions offered: well formed, each with an icon this file has. */
    const reactions = (Array.isArray(offered) ? offered : REACTIONS).filter((r) => r && /^[a-z][a-z0-9-]{0,29}$/.test(r.id) && typeof r.icon === 'string').slice(0, 12);
    let as = VIEWS.includes(first) ? first : 'simple';
    let shown = '';
    let count = 0;
    let latest;
    let folded = true;
    /* Steps the person opened or closed, by group; messages unfolded: kept while the page is drawn again. */
    const unfolded = new Map();
    const expanded = new Set();
    /* #87: a message the newest has just pushed up folds with a slow countdown the
       reader can cancel. `foldFrom` is the id that was newest at the last draw;
       `foldAt` maps an id to when its countdown began; `foldKept` were kept open by a
       tap; `foldDone` finished their countdown (now folded). Closure state, so it
       survives each redraw. `reduceMotion` is ours here (the zoom viewer has its own). */
    let foldFrom = null;
    const foldAt = new Map();
    const foldKept = new Set();
    const foldDone = new Set();
    const FOLD_MS = 15_000;
    const FOLD_FADE_MS = 320;
    /* #109: only fold a message tall enough to be worth it. A short one (a line
       or two) collapsing to a bar is just noise. The outgoing message is still
       on screen from the last draw when we decide, so measure it there. */
    const FOLD_MIN_PX = 160;
    /* True unless we can SEE it is short: only a real, positive height at or
       below the floor suppresses the fold. A missing element or a zero height
       (no layout yet, or a non-visual test env) keeps the old behaviour, so the
       fix never hides a fold it cannot measure. */
    const foldWorthIt = (id) => {
        try { const b = thread.querySelector(`.parley-said[data-id="${(typeof CSS !== 'undefined' && CSS.escape) ? CSS.escape(id) : id}"]`); const h = b ? b.offsetHeight : 0; return !(h > 0 && h <= FOLD_MIN_PX); } catch { return true; }
    };
    /* Only a message that will really look different once folded gets the countdown: one with
       a short version, or longer than the fold. Anything else would show "folds soon" and
       then stay as it was. */
    const foldsAway = (item) => Boolean(item.short) || linesOf(item.text) > FOLD_LINES + 2;
    const reduceMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    /* Drawings and coloured code, made once each; the addresses of drawings, let go at the end. */
    const cache = new Map();
    const urls = new Set();
    let revealed = '';
    /* Kept at the newest, as a chat is, until the reader scrolls up; and again once back down. */
    let sticky = true;
    let awayCount = 0;
    /* A page put before what is shown: how far from the bottom the reader was, kept. */
    let anchor = null;
    root.classList.add('parley');
    const top = el('div', 'parley-top');
    const status = el('p', 'parley-status'); status.setAttribute('role', 'status');
    const repaint = () => { shown = ''; if (latest) paint(latest); };
    /* ONE button of settings, beside the state: the view, "send when I stop", the search. */
    const prefs = el('div', 'parley-prefs');
    const prefsButton = el('button', 'parley-prefs-open'); prefsButton.type = 'button'; prefsButton.title = said(words, 'settings'); prefsButton.setAttribute('aria-label', prefsButton.title);
    prefsButton.setAttribute('aria-expanded', 'false'); prefsButton.setAttribute('aria-haspopup', 'true'); prefsButton.append(sign('prefs'));
    const prefsMenu = el('div', 'parley-prefs-menu'); prefsMenu.hidden = true; prefsMenu.setAttribute('role', 'group'); prefsMenu.setAttribute('aria-label', said(words, 'settings'));
    const showPrefs = (on) => {
        if (on && prefsMenu.hidden) steps.opened('prefs', () => showPrefs(false)); else if (!on && !prefsMenu.hidden) steps.closed('prefs');
        prefsMenu.hidden = !on; prefsButton.setAttribute('aria-expanded', String(on)); };
    const switcher = el('div', 'parley-views'); switcher.setAttribute('role', 'group'); switcher.setAttribute('aria-label', said(words, 'view'));
    const choose = (v) => { if (v === as) return; as = v; root.dataset.view = as; unfolded.clear(); seenKeys = null; try { onView?.(as); } catch { /* the page's business */ } repaint(); void refresh(); };
    const toggles = VIEWS.map((v) => { const b = button(said(words, v), '', () => { choose(v); showPrefs(false); }); b.dataset.view = v; return b; });
    switcher.append(...toggles);
    /* "Send when I stop", a switch: on, what is said is sent by itself. */
    const autoButton = el('button', 'parley-auto'); autoButton.type = 'button';
    const autoWord = el('span', 'parley-auto-word', said(words, 'auto-send'));
    const autoOff = el('span', 'parley-auto-off', said(words, 'auto-send-off'));
    autoButton.append(autoWord, autoOff);
    /* Under a heading of its own: it is about dictation. */
    const dictation = el('div', 'parley-dictation'); dictation.append(el('p', 'parley-menu-head', said(words, 'dictation')), autoButton);
    const searchButton = el('button', 'parley-search-open'); searchButton.type = 'button'; searchButton.append(sign('search'), el('span', '', said(words, 'search')));
    /* Every picture and file of the thread, as a gallery. */
    const mediaButton = el('button', 'parley-media-open'); mediaButton.type = 'button'; mediaButton.append(icon('images', 'parley-sign'), el('span', '', said(words, 'media')));
    prefsMenu.append(switcher, searchButton, mediaButton, dictation);
    prefs.append(prefsButton, prefsMenu);
    prefsButton.addEventListener('click', () => showPrefs(prefsMenu.hidden));
    prefs.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !prefsMenu.hidden) { event.preventDefault(); showPrefs(false); prefsButton.focus(); } });
    const away = (event) => { if (!prefsMenu.hidden && !(event.target instanceof Node && prefs.contains(event.target))) showPrefs(false); };
    document.addEventListener('pointerdown', away);
    /* THE PANEL BESIDE THE THREAD (`side`): a list the application gives, a
       tick and a click handed back to it. Wide: beside the thread, folded on
       demand (the application keeps that choice: folded, onFold). Narrow: a
       sheet over the thread, opened from the bar, never beside it. */
    let side = null; let panel = null;
    let panelFolded = false; let panelSheet = false; let panelDone = false; let panelProblem = '';
    /* A tick sent and not yet given back by the application: shown as asked meanwhile. */
    const ticking = new Map();
    const panelBox = el('aside', 'parley-panel'); panelBox.hidden = true;
    const panelButton = el('button', 'parley-panel-open'); panelButton.type = 'button'; panelButton.hidden = true;
    const panelCount = el('span', 'parley-panel-count');
    panelButton.append(sign('tasks'), panelCount);
    const beside = () => root.clientWidth === 0 || root.clientWidth >= PANEL_PX;
    const placePanel = () => {
        const shown = Boolean(panel);
        panelButton.hidden = !shown;
        if (!shown) { panelBox.hidden = true; delete root.dataset.panel; delete panelBox.dataset.sheet; return; }
        const wide = beside();
        if (wide && panelSheet) { panelSheet = false; steps.closed('panel'); }
        const open = wide ? !panelFolded : panelSheet;
        panelBox.hidden = !open;
        /* Written only when it changes: it is seen at every change of size (a keyboard that comes or goes),
           over the box being written in. */
        const placed = wide && open ? 'beside' : 'folded';
        if (root.dataset.panel !== placed) root.dataset.panel = placed;
        if (!wide && open) panelBox.dataset.sheet = 'true'; else delete panelBox.dataset.sheet;
        panelButton.setAttribute('aria-expanded', String(open));
        const word = panel.title || said(words, 'panel');
        panelButton.title = open ? said(words, 'panel-hide', { title: word }) : said(words, 'panel-show', { title: word });
        panelButton.setAttribute('aria-label', panelButton.title);
        panelBox.setAttribute('aria-label', word);
        panelCount.textContent = panel.count > 0 ? String(panel.count) : '';
        panelCount.hidden = panel.count === 0;
    };
    const showSheet = (on) => {
        if (on === panelSheet) return;
        panelSheet = on;
        if (on) steps.opened('panel', () => showSheet(false)); else steps.closed('panel');
        paintPanel();
    };
    const panelFold = (folded) => {
        if (!beside()) { showSheet(!folded); return; }
        if (panelFolded === folded) return;
        panelFolded = folded; placePanel();
        try { side?.onFold?.(folded); } catch { /* the application's business */ }
    };
    panelButton.addEventListener('click', () => panelFold(beside() ? !panelFolded : panelSheet));
    const awayFromSheet = (event) => { if (panelSheet && event.target instanceof Node && !panelBox.contains(event.target) && !panelButton.contains(event.target)) showSheet(false); };
    document.addEventListener('pointerdown', awayFromSheet);
    panelBox.addEventListener('keydown', (event) => { if (event.key === 'Escape' && panelSheet) { event.preventDefault(); showSheet(false); panelButton.focus(); } });
    const checkedNow = (item) => (ticking.has(item.id) ? ticking.get(item.id).on : item.checked);
    async function tickItem(item) {
        if (!side?.tick || ticking.has(item.id)) return;
        const on = !checkedNow(item);
        ticking.set(item.id, { on, at: Date.now(), sent: false });
        panelProblem = ''; paintPanel();
        try { await side.tick(item.id, on); const t = ticking.get(item.id); if (t) t.sent = true; } catch (error) {
            ticking.delete(item.id);
            panelProblem = said(words, 'panel-not-saved', { error: String(error?.message ?? error) });
        }
        paintPanel();
    }
    function panelRow(item) {
        const li = el('li', 'parley-panel-item'); li.dataset.id = item.id;
        if (item.done) li.dataset.done = 'true';
        if (item.tone) li.dataset.tone = item.tone;
        const on = checkedNow(item);
        li.dataset.checked = String(on);
        if (side?.tick && item.tickable) {
            const t = el('button', 'parley-panel-tick'); t.type = 'button'; t.setAttribute('role', 'checkbox'); t.setAttribute('aria-checked', String(on));
            t.setAttribute('aria-label', item.title);
            if (ticking.has(item.id) && !ticking.get(item.id).sent) t.dataset.busy = 'true';
            t.append(icon('check', 'parley-sign'));
            t.addEventListener('click', () => void tickItem(item));
            li.append(t);
        } else {
            const mark = el('span', 'parley-panel-mark'); mark.setAttribute('aria-hidden', 'true');
            if (item.done || on) mark.append(icon('check', 'parley-sign'));
            li.append(mark);
        }
        const body = el('div', 'parley-panel-what');
        const name = side?.open ? button(item.title, 'parley-panel-title', () => { if (panelSheet) showSheet(false); try { side.open(item.id); } catch { /* the application's business */ } }) : el('span', 'parley-panel-title', item.title);
        body.append(name);
        if (item.text) body.append(el('span', 'parley-panel-text', item.text));
        /* What is set, said; what is empty, not. */
        const meta = [item.state, item.owner].filter(Boolean);
        if (meta.length) body.append(el('span', 'parley-panel-meta', meta.join(' · ')));
        li.append(body);
        return li;
    }
    function paintPanel() {
        if (!panel) { panelBox.replaceChildren(); placePanel(); return; }
        const head = el('div', 'parley-panel-head');
        const word = panel.title || said(words, 'panel');
        const hide = el('button', 'parley-panel-fold'); hide.type = 'button'; hide.title = said(words, 'panel-hide', { title: word }); hide.setAttribute('aria-label', hide.title);
        hide.append(sign(panelSheet ? 'close' : 'right'));
        hide.addEventListener('click', () => panelFold(true));
        head.append(el('h2', 'parley-panel-name', word), hide);
        const parts = [head];
        if (!panel.open.length && !panel.done.length) parts.push(el('p', 'parley-panel-empty', said(words, 'panel-empty')));
        if (panel.open.length) { const ul = el('ul', 'parley-panel-list'); ul.append(...panel.open.map(panelRow)); parts.push(ul); }
        if (panel.done.length) {
            const opener = el('button', 'parley-panel-done'); opener.type = 'button'; opener.setAttribute('aria-expanded', String(panelDone));
            opener.append(sign(panelDone ? 'up' : 'down'), el('span', '', said(words, 'panel-done', { count: panel.done.length })));
            opener.addEventListener('click', () => { panelDone = !panelDone; paintPanel(); });
            parts.push(opener);
            if (panelDone) { const ul = el('ul', 'parley-panel-list'); ul.dataset.done = 'true'; ul.append(...panel.done.map(panelRow)); parts.push(ul); }
        }
        if (panel.action) parts.push(button(panel.action.label, 'parley-panel-action', () => { try { void Promise.resolve(panel.action.run()).catch(() => {}); } catch { /* the application's business */ } }));
        if (panelProblem) { const p = el('p', 'parley-panel-problem', panelProblem); p.setAttribute('role', 'alert'); parts.push(p); }
        panelBox.replaceChildren(...parts);
        placePanel();
    }
    const setSide = (given, first = false) => {
        const next = panelOf(given);
        if (!next) { side = null; panel = null; ticking.clear(); if (panelSheet) showSheet(false); paintPanel(); return; }
        side = given;
        /* Its first word on folding, when it comes; then the person's, through the bar (or `handle.folded`). */
        if (first || !panel) panelFolded = given.folded === true;
        /* What the application says now wins over a tick it has taken; one it never answered is let go after a while. */
        for (const item of [...next.open, ...next.done]) { const t = ticking.get(item.id); if (t && t.sent && (item.checked === t.on || Date.now() - t.at > PANEL_WAIT_MS)) ticking.delete(item.id); }
        for (const [id, t] of ticking) if (t.sent && Date.now() - t.at > PANEL_WAIT_MS) ticking.delete(id);
        panel = next; paintPanel();
    };
    top.append(status, panelButton, prefs);
    /* SEARCH IN THE THREAD: plain text, both sides; "n of m", previous, next. */
    const finder = el('div', 'parley-search'); finder.hidden = true; finder.setAttribute('role', 'search');
    const query = el('input', 'parley-search-box'); query.type = 'search'; query.placeholder = said(words, 'search'); query.setAttribute('aria-label', said(words, 'search'));
    const found = el('span', 'parley-search-count'); found.setAttribute('aria-live', 'polite');
    const findTool = (kind, key, act2) => { const b = el('button', `parley-search-${kind}`); b.type = 'button'; b.title = said(words, key); b.setAttribute('aria-label', b.title); b.append(sign(kind === 'prev' ? 'up' : kind === 'next' ? 'down' : 'close')); b.addEventListener('click', act2); return b; };
    let matches = [];
    let current = 0;
    finder.append(sign('search'), query, found, findTool('prev', 'previous', () => step(-1)), findTool('next', 'next', () => step(1)), findTool('close', 'close', () => closeSearch()));
    const main = el('div', 'parley-main');
    const thread = el('div', 'parley-thread'); thread.setAttribute('aria-live', 'polite'); thread.tabIndex = -1;
    const aside = el('aside', 'parley-aside');
    /* Back to the newest, when the reader scrolled up: with how many came meanwhile. */
    const jump = el('button', 'parley-jump'); jump.type = 'button'; jump.hidden = true; jump.title = said(words, 'newest'); jump.setAttribute('aria-label', jump.title);
    const jumpCount = el('span', 'parley-jump-count'); jump.append(sign('down'), jumpCount);
    const column = el('div', 'parley-column'); column.append(thread, jump);
    main.append(column, aside);
    /* Quick answers, above the box: one line, the rest one tap away. */
    const quickRow = el('div', 'parley-quick'); quickRow.hidden = true; quickRow.dataset.open = 'false';
    const chips = el('div', 'parley-replies'); chips.setAttribute('role', 'group'); chips.setAttribute('aria-label', said(words, 'replies'));
    const moreChips = el('button', 'parley-replies-more'); moreChips.type = 'button'; moreChips.hidden = true; moreChips.setAttribute('aria-expanded', 'false');
    quickRow.append(chips, moreChips);
    /* What is typed answers this question: said above the box, one click to take away. */
    const replyRow = el('div', 'parley-replying'); replyRow.hidden = true;
    let replyTo = null;
    const dismissed = new Set();
    const form = el('form', 'parley-form'); form.autocomplete = 'off';
    /* The box, and on its frame what the microphone does: over it, taking no room. */
    const field = el('div', 'parley-field');
    const box = el('textarea', 'parley-box'); box.rows = 1; box.maxLength = TEXT_MAX; box.placeholder = said(words, 'placeholder'); box.setAttribute('aria-label', said(words, 'placeholder'));
    /* How much room is left, shown only once the message is halfway to the limit;
       it warns (amber) past three quarters and presses (red) in the last tenth. */
    const countEl = el('span', 'parley-count'); countEl.hidden = true; countEl.setAttribute('aria-live', 'polite');
    const COUNT_FROM = Math.floor(TEXT_MAX / 2);
    const tellCount = () => {
        const n = box.value.length;
        if (n < COUNT_FROM) { countEl.hidden = true; return; }
        countEl.hidden = false;
        countEl.textContent = `${n} / ${TEXT_MAX}`;
        countEl.dataset.level = n >= TEXT_MAX * 0.9 ? 'high' : n >= TEXT_MAX * 0.75 ? 'mid' : 'low';
    };
    const mic = el('button', 'parley-mic'); mic.type = 'button'; mic.setAttribute('aria-pressed', 'false');
    /* Listening, it says in a word that a touch stops it. */
    /* Round buttons of one size, a sign each; their words are their title, for a hover and a reader. */
    /* "Send when I stop" is on: a dot on the microphone, said in its label. */
    const micAuto = el('span', 'parley-mic-auto'); micAuto.setAttribute('aria-hidden', 'true');
    mic.append(sign('mic'), sign('stop'), micAuto);
    const go = el('button', 'parley-send'); go.type = 'submit'; go.title = said(words, 'send'); go.setAttribute('aria-label', go.title); go.append(sign('send'));
    /* Files to attach: picked beside the box, pasted, dropped; shown above it until they are sent. */
    const clip = el('button', 'parley-attach'); clip.type = 'button'; clip.title = said(words, 'attach'); clip.setAttribute('aria-label', clip.title); clip.append(sign('clip'));
    clip.hidden = !attach?.upload;
    const picker = el('input'); picker.type = 'file'; picker.multiple = true; picker.hidden = true; picker.tabIndex = -1;
    const pendingRow = el('div', 'parley-attached'); pendingRow.hidden = true; pendingRow.setAttribute('aria-live', 'polite');
    let pending = [];
    let uploading = false;
    /* While dictating: how to stop listening (null when the microphone is off). */
    let stopping = null;
    /* Send is grey while there is nothing to send: no text, no file, no phrase being heard. */
    const paintGo = () => { go.disabled = uploading || (!box.value.trim() && pending.length === 0 && !stopping); };
    /* While dictating, what the microphone does: a label on the box's frame,
       seen; the same words in a status for whoever does not see it. */
    const heard = el('div', 'parley-voice'); heard.hidden = true; heard.setAttribute('aria-hidden', 'true');
    const heardText = el('span', 'parley-voice-text');
    heard.append(heardText);
    const heardSaid = el('span', 'parley-voice-said'); heardSaid.setAttribute('role', 'status');
    field.append(box, heard, heardSaid);
    const problem = el('p', 'parley-problem'); problem.hidden = true; problem.setAttribute('role', 'alert');
    /* One frame: the files to send on top, then the clip, the box, the microphone and Send. */
    form.append(pendingRow, clip, field, mic, go, picker);
    const dropZone = el('div', 'parley-drop', said(words, 'drop')); dropZone.hidden = true;
    const zoom = zoomer(root, words, steps);
    const drawer = annotator(words, steps);
    /* What floats over the chat first; then the chat, top to bottom. */
    /* The box and what goes with it: apart from the thread, by a line and some room. */
    const composer = el('div', 'parley-composer');
    /* THE REPLY THE AGENT SUGGESTS (#198), while their box is empty: one click, one touch or Tab makes it theirs. */
    const suggestRow = el('button', 'parley-suggest'); suggestRow.type = 'button'; suggestRow.hidden = true;
    let suggestion = '';
    composer.append(quickRow, replyRow, suggestRow, form, countEl, problem);
    const reacting = reactionPicker();
    const shelf = mediaShelf();
    root.replaceChildren(zoom.box, drawer.box, shelf.box, reacting.box, dropZone, top, finder, main, panelBox, composer);
    setSide(sideGiven, true);
    root.dataset.view = as;
    const narrow = () => root.clientWidth > 0 && root.clientWidth < NARROW_PX;
    let wasNarrow = narrow();
    const watch = typeof ResizeObserver === 'function' ? new ResizeObserver(() => { if (panel) placePanel(); if (narrow() !== wasNarrow) { wasNarrow = narrow(); repaint(); } }) : null;
    watch?.observe(root);
    /* Part of what is in the box was dictated: the message says so (via: voice), once. */
    let dictatedNow = false;
    const say = async (text, answers, files, via, given = {}) => {
        problem.hidden = true;
        /* An answer to a question about one zone of a picture goes back with that zone. */
        if (answers && !given.about) { const asked = latest?.messages?.find((m) => m.id === answers && m.from === 'agent'); const zone = asked?.kind === 'ask' ? askedZone(asked.text) : null; if (zone) given = { ...given, about: zone }; }
        const more = { ...(via ? { via } : {}), ...given };
        const extra = Object.keys(more).length > 0;
        try { await send(text, answers, ...(files?.length || extra ? [files?.length ? files : undefined] : []), ...(extra ? [more] : [])); await refresh(); return true; } catch (error) { problem.textContent = said(words, 'not-sent', { error: String(error?.message ?? error) }); problem.hidden = false; return false; }
    };
    const fileButton = (file) => (file.open === null || !open ? null : button(said(words, 'open'), 'parley-open', () => open(file)));
    const time = (text, when) => { const t = el('time', 'parley-time', text); if (when) t.title = when; return t; };
    const pictureUrl = (file) => { try { const u = picture?.(file); return typeof u === 'string' && u ? u : null; } catch { return null; } };
    /* The pictures of the thread, each once: one shown in a gallery and cited in a text is one picture, as in the media. */
    const zoomFrom = (img) => {
        const seen = new Map();
        for (const i of thread.querySelectorAll('img[data-zoom]')) if (!seen.has(i.dataset.zoom)) seen.set(i.dataset.zoom, { url: i.dataset.zoom, name: i.dataset.name || i.alt || '', title: i.dataset.title || '', from: i.closest('.parley-said')?.dataset.id ?? '' });
        const all = [...seen.values()];
        zoom.show(all, Math.max(0, all.findIndex((x) => x.url === img.dataset.zoom)), img);
    };
    /* A list of steps, each with its time. */
    function trail(list) {
        const ol = el('ol', 'parley-trail');
        for (const s of list) {
            const li = el('li'); li.dataset.kind = s.kind; li.dataset.state = s.state;
            li.append(el('span', 'parley-step', s.text), time(s.time, s.when));
            ol.append(li);
        }
        return ol;
    }
    const bottom = () => { thread.scrollTop = thread.scrollHeight; };
    /* Opened or folded with one click; remembered while the page is drawn
       again. What was in sight stays in sight: the newest, when the reader
       was there; else the line clicked. */
    function folding(row, holder, opener, list, { only = () => true } = {}) {
        const set = (on) => { holder.dataset.open = String(on); opener.setAttribute('aria-expanded', String(on)); list.hidden = !on; };
        set(unfolded.has(row.key) ? unfolded.get(row.key) : row.open);
        const flip = () => {
            const was = sticky;
            const on = holder.dataset.open !== 'true'; unfolded.set(row.key, on); set(on);
            if (was) bottom(); else opener.scrollIntoView?.({ block: 'nearest' });
        };
        opener.addEventListener('click', (event) => { if (only(event)) flip(); });
        if (opener.tagName !== 'BUTTON') opener.addEventListener('keydown', (event) => { if ((event.key === 'Enter' || event.key === ' ') && event.target === opener) { event.preventDefault(); flip(); } });
    }
    /* What the agent wrote: rendered, or as plain text. */
    /* WHAT THE PERSON STARTED ANSWERING, by question: kept while the thread is drawn again. */
    const drafts = new Map();
    /* `fields`: the box of each question answered in one's own words, made once and moved, never made again:
       a box made anew under the finger loses the focus, and folds a touch screen's keyboard. */
    const draftOf = (id) => { if (!drafts.has(id)) drafts.set(id, { step: 0, answers: new Map(), ticked: new Set(), fields: new Map() }); return drafts.get(id); };
    /* A SELECTOR (#195): its control, drawn from `q.input`, and what it answers in plain words.
       `a` is the question's draft: { value } for a selector. The control is made once per draft
       and kept (moved), never made again under the finger. */
    const fmt = (n) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100));
    const withUnit = (x, unit) => `${x}${unit ? (unit === '%' ? ' %' : ` ${unit}`) : ''}`;
    function inputAnswer(q, a) {
        const x = q.input; const v = a.value;
        if (v === undefined || v === null || v === '') return null;
        switch (x.kind) {
            case 'yesno': return { text: v ? said(words, 'input-yes') : said(words, 'input-no'), value: Boolean(v) };
            case 'slider': case 'number': return { text: withUnit(fmt(v), x.unit), value: v };
            case 'range': return { text: withUnit(`${fmt(v[0])}–${fmt(v[1])}`, x.unit), value: v };
            case 'scale': return { text: `${v} / ${x.max}`, value: v };
            case 'stars': return { text: `${'★'.repeat(v)}${'☆'.repeat(x.max - v)} (${v}/${x.max})`, value: v };
            case 'rank': return { text: v.join(' > '), value: v };
            case 'split': return { text: x.items.map((it, i) => `${it} ${withUnit(fmt(v[i]), x.unit)}`).join(' · '), value: v };
            case 'table': return { text: x.rows.map((r, i) => `${r}: ${x.columns.map((c, k) => `${c} ${v[i]?.[k] ?? ''}`).join(', ')}`).join(' ; '), value: v };
            case 'text': return String(v).trim() ? { text: String(v).trim() } : null;
            default: return { text: String(v), value: v };
        }
    }
    function inputControl(q, a, changed) {
        const x = q.input;
        const box = el('div', `parley-input parley-input-${x.kind}`);
        const valueOut = el('span', 'parley-input-value');
        /* What the agent recommends (#198): where it starts, and said above it whatever is chosen then. */
        if (x.recommended !== undefined && a.value === undefined) {
            if (x.kind === 'yesno') a.value = x.recommended === 'yes';
            else if (x.kind === 'scale' || x.kind === 'stars') a.value = x.recommended;
        }
        if (x.recommended !== undefined) {
            const r = x.kind === 'rank' ? null : inputAnswer(q, { value: x.kind === 'yesno' ? x.recommended === 'yes' : x.recommended });
            box.append(el('span', 'parley-recommended', r ? said(words, 'recommended-value', { value: r.text }) : said(words, 'recommended-order')));
        }
        const say2 = () => { const r = inputAnswer(q, a); valueOut.textContent = r ? r.text : ''; changed(); };
        const ends = (lo, hi) => { const e = el('div', 'parley-input-ends'); e.append(el('span', '', lo), valueOut, el('span', '', hi)); return e; };
        const pct = (v) => `${((v - x.min) / (x.max - x.min)) * 100}%`;
        const fill = (r) => r.style?.setProperty?.('--fill', pct(Number(r.value)));
        const range = (val, onInput) => { const r = el('input'); r.type = 'range'; r.min = String(x.min); r.max = String(x.max); r.step = String(x.step); r.value = String(val); fill(r); r.addEventListener('input', () => { fill(r); onInput(Number(r.value)); }); return r; };
        switch (x.kind) {
            case 'yesno': {
                const row = el('div', 'parley-pickrow');
                for (const [k, on] of [['input-yes', true], ['input-no', false]]) { const b = button(said(words, k), '', () => { a.value = on; for (const y of row.children) y.setAttribute('aria-pressed', String(y === b)); say2(); }); b.setAttribute('aria-pressed', String(a.value === on)); row.append(b); }
                box.append(row); break;
            }
            case 'slider': {
                if (a.value === undefined) a.value = x.value ?? x.min + Math.round((x.max - x.min) / 2 / x.step) * x.step;
                box.append(range(a.value, (n) => { a.value = n; say2(); }), ends(x.labels?.[0] ?? withUnit(fmt(x.min), x.unit), x.labels?.[1] ?? withUnit(fmt(x.max), x.unit))); break;
            }
            case 'range': {
                if (a.value === undefined) a.value = x.value ?? [x.min + (x.max - x.min) / 4, x.max - (x.max - x.min) / 4].map((n) => Math.round(n / x.step) * x.step);
                const two = el('div', 'parley-input-two');
                const lo = range(a.value[0], (n) => { a.value = [Math.min(n, a.value[1]), a.value[1]]; lo.value = String(a.value[0]); say2(); });
                const hi = range(a.value[1], (n) => { a.value = [a.value[0], Math.max(n, a.value[0])]; hi.value = String(a.value[1]); say2(); });
                const span2 = () => { two.style?.setProperty?.('--lo', pct(a.value[0])); two.style?.setProperty?.('--hi', pct(a.value[1])); };
                for (const r of [lo, hi]) r.addEventListener('input', span2);
                span2();
                two.append(lo, hi); box.append(two, ends(withUnit(fmt(x.min), x.unit), withUnit(fmt(x.max), x.unit))); break;
            }
            case 'scale': {
                const row = el('div', 'parley-input-scale');
                for (let n = x.min; n <= x.max; n++) { const b = button(String(n), '', () => { a.value = n; for (const y of row.children) y.setAttribute('aria-pressed', String(y === b)); say2(); }); b.setAttribute('aria-pressed', String(a.value === n)); row.append(b); }
                box.append(row);
                if (x.labels) { const e = el('div', 'parley-input-ends'); e.append(el('span', '', x.labels[0]), el('span', '', x.labels[1])); box.append(e); }
                break;
            }
            case 'stars': {
                const row = el('div', 'parley-input-stars');
                const paintStars = () => { [...row.children].forEach((b, i) => b.setAttribute('aria-pressed', String(i < (a.value ?? 0)))); };
                for (let n = 1; n <= x.max; n++) { const b = button('★', '', () => { a.value = n; paintStars(); say2(); }); b.setAttribute('aria-label', `${n} / ${x.max}`); row.append(b); }
                paintStars(); box.append(row, valueOut); break;
            }
            case 'number': {
                if (a.value === undefined) a.value = x.value ?? x.min;
                const field = el('input'); field.type = 'number'; field.min = String(x.min); field.max = String(x.max); field.step = String(x.step); field.value = String(a.value); field.inputMode = 'decimal';
                const set = (n) => { a.value = Math.min(x.max, Math.max(x.min, Math.round(n / x.step) * x.step)); field.value = String(a.value); say2(); };
                field.addEventListener('change', () => set(Number(field.value)));
                const row = el('div', 'parley-input-number');
                row.append(button('−', '', () => set(a.value - x.step)), field, button('+', '', () => set(a.value + x.step)));
                if (x.unit) row.append(el('span', 'parley-input-unit', x.unit));
                box.append(row); break;
            }
            case 'rank': {
                if (a.value === undefined) a.value = [...x.items];
                const list = el('ol', 'parley-input-rank');
                const paintRank = () => { list.replaceChildren(...a.value.map((it, i) => { const li = el('li'); const up = button('↑', '', () => { if (i) { a.value.splice(i - 1, 0, a.value.splice(i, 1)[0]); paintRank(); say2(); } }); up.setAttribute('aria-label', said(words, 'rank-up')); const down = button('↓', '', () => { if (i < a.value.length - 1) { a.value.splice(i + 1, 0, a.value.splice(i, 1)[0]); paintRank(); say2(); } }); down.setAttribute('aria-label', said(words, 'rank-down')); li.dataset.i = String(i); li.append(el('span', 'parley-input-rank-grip', '⋮⋮'), el('span', 'parley-input-rank-n', String(i + 1)), el('span', 'parley-input-rank-t', it), up, down); return li; })); };
                /* Dragged into place: by its grip with a finger, anywhere on it with a mouse; the others make room as it passes. */
                list.addEventListener('pointerdown', (e) => {
                    const li = e.target.closest?.('li'); if (!li || e.target.closest('button') || e.button > 0) return;
                    if (e.pointerType !== 'mouse' && !e.target.closest('.parley-input-rank-grip')) return;
                    e.preventDefault();
                    let moved = false;
                    li.setPointerCapture?.(e.pointerId); li.classList.add('parley-input-rank-dragging');
                    const move = (m) => {
                        moved = true;
                        for (const other of list.children) {
                            if (other === li) continue;
                            const r = other.getBoundingClientRect(); const mid = r.top + r.height / 2;
                            const before = other.compareDocumentPosition(li) & 4;   /* li after it */
                            if (before && m.clientY < mid) { list.insertBefore(li, other); break; }
                            if (!before && m.clientY > mid && other.nextSibling !== li) { list.insertBefore(li, other.nextSibling); break; }
                        }
                        li.style.transform = ''; const r = li.getBoundingClientRect(); li.style.transform = `translateY(${m.clientY - (r.top + r.height / 2)}px)`;
                    };
                    const drop = () => {
                        li.removeEventListener('pointermove', move); li.removeEventListener('pointerup', drop); li.removeEventListener('pointercancel', drop);
                        li.classList.remove('parley-input-rank-dragging'); li.style.transform = '';
                        const order = [...list.children].map((c) => a.value[Number(c.dataset.i)]);
                        if (moved && order.some((v, k) => v !== a.value[k])) { a.value = order; say2(); }
                        paintRank();
                    };
                    li.addEventListener('pointermove', move); li.addEventListener('pointerup', drop); li.addEventListener('pointercancel', drop);
                });
                paintRank(); box.append(list); break;
            }
            case 'split': {
                if (a.value === undefined) { const each = Math.floor(x.total / x.items.length); a.value = x.items.map((_, i) => (i === x.items.length - 1 ? x.total - each * (x.items.length - 1) : each)); }
                const rows = x.items.map((it, i) => {
                    const r = el('input'); r.type = 'range'; r.min = '0'; r.max = String(x.total); r.step = '1'; r.value = String(a.value[i]); r.style?.setProperty?.('--fill', `${a.value[i] / x.total * 100}%`);
                    const out = el('span', 'parley-input-value', withUnit(fmt(a.value[i]), x.unit));
                    r.addEventListener('input', () => {
                        /* The others give or take what this one took, so the total holds. */
                        const n = Number(r.value); const rest = x.total - n; const others = a.value.map((v, k) => (k === i ? 0 : v)); const sum = others.reduce((s2, v) => s2 + v, 0);
                        a.value = a.value.map((v, k) => (k === i ? n : sum ? Math.round(v * rest / sum) : Math.round(rest / (x.items.length - 1))));
                        const drift = x.total - a.value.reduce((s2, v) => s2 + v, 0); const j = a.value.findIndex((_, k) => k !== i); if (j >= 0) a.value[j] += drift;
                        rows.forEach((row2, k) => { row2.range.value = String(a.value[k]); row2.range.style?.setProperty?.('--fill', `${a.value[k] / x.total * 100}%`); row2.out.textContent = withUnit(fmt(a.value[k]), x.unit); });
                        say2();
                    });
                    const line = el('div', 'parley-input-split-row'); line.append(el('span', '', it), r, out);
                    return { line, range: r, out };
                });
                for (const r of rows) box.append(r.line);
                box.append(el('div', 'parley-input-ends', said(words, 'split-total', { total: withUnit(fmt(x.total), x.unit) })));
                break;
            }
            case 'table': {
                if (a.value === undefined) a.value = x.rows.map((_, i) => x.columns.map((_, k) => x.values?.[i]?.[k] ?? ''));
                const t = el('table', 'parley-input-table'); const head = el('tr'); head.append(el('th', '', ''));
                for (const c of x.columns) head.append(el('th', '', c));
                t.append(head);
                x.rows.forEach((r, i) => { const tr = el('tr'); tr.append(el('th', '', r)); x.columns.forEach((c, k) => { const td = el('td'); const f = el('input'); f.value = String(a.value[i][k]); f.setAttribute('aria-label', `${r} · ${c}`); f.addEventListener('input', () => { a.value[i][k] = f.value; changed(); }); td.append(f); tr.append(td); }); t.append(tr); });
                const wrap = el('div', 'parley-input-table-wrap'); wrap.append(t); box.append(wrap); break;
            }
            case 'date': case 'time': case 'datetime': {
                const f = el('input'); f.type = x.kind === 'datetime' ? 'datetime-local' : x.kind; if (a.value === undefined && x.value) a.value = x.value; f.value = a.value ?? '';
                f.addEventListener('input', () => { a.value = f.value; changed(); }); box.append(f); break;
            }
            default: {
                const f = el('textarea', 'parley-questions-free'); f.rows = x.lines ?? 3; f.value = a.value ?? ''; f.placeholder = said(words, 'group-own');
                f.addEventListener('input', () => { a.value = f.value; changed(); }); box.append(f);
            }
        }
        say2();
        return box;
    }
    /* QUESTIONS ON ONE CARD (#195), the default: each with its control -- choices, a selector, or
       its own words -- one under the other, one Send once all are answered. */
    /* A choice the agent recommends (#198): a small "Recommended" on it, its words unchanged. */
    function recommend(b) {
        b.dataset.recommended = 'true';
        b.append(el('span', 'parley-recommended', said(words, 'recommended')));
    }
    function seriesCard(item) {
        const qs = item.questions;
        const d = draftOf(item.id);
        const card = el('div', 'parley-questions parley-series'); card.dataset.draft = item.id;
        /* A card just drawn starts on what the agent recommends (#198): marked, and theirs to change. */
        const slot = (q) => { if (!d.answers.has(q.id)) d.answers.set(q.id, { picked: q.choices.length ? [...(q.recommended ?? [])] : [], own: !q.input && q.choices.length === 0, text: '' }); return d.answers.get(q.id); };
        const answerOf = (q) => { const a = slot(q); if (q.input) return inputAnswer(q, a); if (a.own) return a.text.trim() ? { text: a.text.trim() } : null; const picked = q.choices.filter((c) => a.picked.includes(c)); return picked.length ? { picked } : null; };
        const sendBtn = button(said(words, qs.length > 1 ? 'series-send' : 'series-send-one'), 'parley-questions-send', () => {
            const all = qs.map(answerOf);
            if (all.some((r) => r === null)) return;
            const replies = qs.map((q, i) => ({ id: q.id, ...(all[i].picked ? { picked: all[i].picked } : { text: all[i].text }), ...(all[i].value !== undefined ? { value: all[i].value } : {}) }));
            const text = qs.length === 1 ? (all[0].picked ? all[0].picked.join(', ') : all[0].text) : qs.map((q, i) => `${i + 1}. ${q.label || cut(q.question, 60)}: ${all[i].picked ? all[i].picked.join(', ') : all[i].text}`).join('\n');
            for (const b of card.querySelectorAll('button, input, textarea')) b.disabled = true;
            void say(text, item.id, undefined, undefined, { replies }).then((ok) => { if (ok) drafts.delete(item.id); else for (const b of card.querySelectorAll('button, input, textarea')) b.disabled = false; });
        });
        const left = el('span', 'parley-series-left');
        const check = () => { const missing = qs.filter((q) => answerOf(q) === null).length; sendBtn.disabled = missing > 0; left.textContent = missing ? said(words, 'series-left', { count: missing }) : ''; };
        const parts = [];
        for (const q of qs) {
            const a = slot(q);
            const row = el('div', 'parley-series-q');
            row.append(el('p', 'parley-questions-question', q.question));
            if (q.input) {
                let ctl = d.fields.get(q.id);
                if (!ctl) { ctl = inputControl(q, a, check); d.fields.set(q.id, ctl); }
                row.append(ctl);
            } else if (q.choices.length) {
                const chips = el('div', 'parley-pickrow');
                for (const c of q.choices) {
                    const b = button(c, '', () => { a.own = false; a.picked = q.many ? (a.picked.includes(c) ? a.picked.filter((y) => y !== c) : [...a.picked, c]) : [c]; for (const y of chips.children) y.setAttribute('aria-pressed', String(a.picked.includes(y.dataset.choice))); check(); });
                    b.dataset.choice = c;
                    b.setAttribute('aria-pressed', String(a.picked.includes(c)));
                    if (q.recommended.includes(c)) recommend(b);
                    chips.append(b);
                }
                row.append(chips);
            } else {
                let free = d.fields.get(q.id);
                if (!free) { free = el('textarea', 'parley-questions-free'); free.rows = 2; free.value = a.text; free.placeholder = said(words, 'group-own'); free.setAttribute('aria-label', q.question); free.addEventListener('input', () => { a.text = free.value; check(); }); d.fields.set(q.id, free); }
                row.append(free);
            }
            parts.push(row);
        }
        const nav = el('div', 'parley-questions-nav parley-series-nav'); nav.append(left, sendBtn);
        parts.push(nav);
        card.replaceChildren(...parts);
        check();
        return card;
    }
    /* QUESTIONS ASKED TOGETHER: one card, a step each (one choice, several to tick, or their own
       words), a summary where each can be changed, one Send. */
    function groupCard(item) {
        const qs = item.questions;
        const d = draftOf(item.id);
        const card = el('div', 'parley-questions'); card.dataset.draft = item.id;
        const answerOf = (q) => { const a = d.answers.get(q.id); if (!a) return null; if (q.input) return inputAnswer(q, a); if (a.own) return a.text.trim() ? { text: a.text.trim() } : null; const picked = q.choices.filter((c) => a.picked.includes(c)); return picked.length ? { picked } : null; };
        const slot = (q) => { if (!d.answers.has(q.id)) d.answers.set(q.id, { picked: [], own: !q.input && q.choices.length === 0, text: '' }); return d.answers.get(q.id); };
        const go = (step) => { d.step = Math.max(0, Math.min(qs.length, step)); paint2(); };
        /* Answered or not, said on its tab: a check, else its number. */
        const markTab = (t, i, done) => {
            t.dataset.done = String(done);
            const n = t.querySelector('.parley-questions-n');
            if (done) n.replaceChildren(icon('check', 'parley-sign')); else n.textContent = String(i + 1);
        };
        const paint2 = () => {
            const tabs = el('div', 'parley-questions-tabs'); tabs.setAttribute('role', 'tablist');
            qs.forEach((q, i) => {
                const t = el('button', 'parley-questions-tab'); t.type = 'button'; t.setAttribute('role', 'tab');
                const done = answerOf(q) !== null;
                t.setAttribute('aria-selected', String(d.step === i));
                t.append(el('span', 'parley-questions-n'), el('span', 'parley-questions-label', q.label || cut(q.question, 24)));
                markTab(t, i, done);
                t.title = q.question;
                t.addEventListener('click', () => go(i));
                tabs.append(t);
            });
            const sum = button(said(words, 'group-review'), 'parley-questions-tab', () => go(qs.length)); sum.setAttribute('role', 'tab'); sum.setAttribute('aria-selected', String(d.step === qs.length)); sum.dataset.summary = 'true';
            tabs.append(sum);
            const nav = el('div', 'parley-questions-nav');
            if (d.step > 0) nav.append(button(said(words, 'group-back'), 'parley-questions-back', () => go(d.step - 1)));
            const parts = [tabs];
            if (d.step < qs.length) {
                const q = qs[d.step];
                const a = slot(q);
                parts.push(el('p', 'parley-questions-step', said(words, 'group-step', { n: d.step + 1, count: qs.length })), el('p', 'parley-questions-question', q.question));
                if (q.input) {
                    /* A selector: its control, kept across steps; its tab says when it is answered. */
                    let ctl = d.fields.get(q.id);
                    if (!ctl) { ctl = inputControl(q, a, () => { const tab = ctl?.closest?.('.parley-questions')?.querySelector('.parley-questions-tabs')?.children[d.step]; const done = answerOf(q) !== null; if (tab && tab.dataset.done !== String(done)) markTab(tab, d.step, done); }); d.fields.set(q.id, ctl); }
                    parts.push(ctl);
                } else if (q.choices.length && q.many) {
                    parts.push(el('p', 'parley-questions-hint', said(words, 'group-several')));
                    const picks = el('div', 'parley-choices parley-picks'); picks.setAttribute('role', 'group');
                    for (const c of q.choices) {
                        const b = el('button', 'parley-pick'); b.type = 'button'; b.setAttribute('role', 'checkbox'); b.setAttribute('aria-checked', String(!a.own && a.picked.includes(c)));
                        const mark = el('span', 'parley-pick-box'); mark.setAttribute('aria-hidden', 'true'); mark.append(icon('check', 'parley-sign'));
                        b.append(mark, el('span', 'parley-pick-text', c));
                        if (q.recommended.includes(c)) recommend(b);
                        b.addEventListener('click', () => { if (a.own) { a.own = false; a.picked = []; } a.picked = a.picked.includes(c) ? a.picked.filter((x) => x !== c) : [...a.picked, c]; paint2(); });
                        picks.append(b);
                    }
                    parts.push(picks);
                } else if (q.choices.length) {
                    const row = el('div', 'parley-choices');
                    for (const c of q.choices) {
                        const b = button(c, '', () => { a.own = false; a.picked = [c]; go(d.step + 1); });
                        const on = !a.own && a.picked.includes(c);
                        b.setAttribute('aria-pressed', String(on));
                        if (on) b.replaceChildren(icon('check', 'parley-sign'), c);
                        if (q.recommended.includes(c)) recommend(b);
                        row.append(b);
                    }
                    parts.push(row);
                }
                if (q.input) { /* drawn above */ } else if (a.own) {
                    let free = d.fields.get(q.id);
                    if (!free) {
                        free = el('textarea', 'parley-questions-free'); free.rows = 3; free.value = a.text; free.placeholder = said(words, 'group-own'); free.dataset.draft = `${item.id}:${q.id}`;
                        free.setAttribute('aria-label', q.question);
                        /* Typed in: its tab says so, the box stays the one being written in. */
                        free.addEventListener('input', () => {
                            a.text = free.value;
                            const tab = free.closest('.parley-questions')?.querySelector('.parley-questions-tabs')?.children[d.step];
                            const done = answerOf(q) !== null;
                            if (tab && tab.dataset.done !== String(done)) markTab(tab, d.step, done);
                        });
                        d.fields.set(q.id, free);
                    }
                    parts.push(free);
                } else if (q.choices.length) parts.push(button(said(words, 'other-answer'), 'parley-reply-to parley-other', () => { a.own = true; paint2(); card.querySelector('.parley-questions-free')?.focus({ preventScroll: true }); }));
                nav.append(button(said(words, d.step === qs.length - 1 ? 'group-review' : 'group-next'), 'parley-questions-next', () => go(d.step + 1)));
            } else {
                parts.push(el('p', 'parley-questions-question', said(words, 'group-check')));
                const list = el('dl', 'parley-questions-summary');
                qs.forEach((q, i) => {
                    const r = answerOf(q);
                    const dd = el('dd', 'parley-questions-answer', r ? (r.picked ? r.picked.join(', ') : r.text) : said(words, 'group-missing'));
                    if (!r) dd.dataset.missing = 'true';
                    const edit = button(said(words, 'group-modify'), 'parley-questions-modify', () => go(i));
                    edit.setAttribute('aria-label', `${said(words, 'group-modify')}: ${q.label || q.question}`);
                    list.append(el('dt', 'parley-questions-asked', `${i + 1}. ${q.question}`), dd, edit);
                });
                parts.push(list);
                const all = qs.map(answerOf);
                const sendAll = button(said(words, 'group-send', { count: qs.length }), 'parley-questions-send', () => {
                    if (all.some((r) => r === null)) return;
                    const replies = qs.map((q, i) => ({ id: q.id, ...(all[i].picked ? { picked: all[i].picked } : { text: all[i].text }), ...(all[i].value !== undefined ? { value: all[i].value } : {}) }));
                    const text = qs.map((q, i) => `${i + 1}. ${q.label || cut(q.question, 60)}: ${all[i].picked ? all[i].picked.join(', ') : all[i].text}`).join('\n');
                    for (const b of card.querySelectorAll('button')) b.disabled = true;
                    void say(text, item.id, undefined, undefined, { replies }).then((ok) => { if (ok) drafts.delete(item.id); else paint2(); });
                });
                sendAll.disabled = all.some((r) => r === null);
                nav.append(sendAll);
            }
            parts.push(nav);
            card.replaceChildren(...parts);
        };
        paint2();
        return card;
    }
    /* #87: the slow "folding soon" bar under a message on its way out. A fill creeps
       across it (the countdown), resumed from where it was at each redraw via a
       negative delay; a tap keeps the message open; when the fill reaches the end the
       message folds. */
    function foldBar(id, elapsed) {
        const bar = el('button', `parley-fold${elapsed < 400 ? ' parley-fold-new' : ''}${elapsed >= FOLD_MS ? ' parley-fold-going' : ''}`); bar.type = 'button';
        bar.setAttribute('aria-label', said(words, 'fold-keep'));
        const fill = el('span', 'parley-fold-fill');
        fill.style.animationDuration = `${FOLD_MS}ms`;
        fill.style.animationDelay = `-${elapsed}ms`;
        bar.append(fill, el('span', 'parley-fold-label', said(words, 'fold-soon')));
        bar.addEventListener('click', (e) => { e.stopPropagation(); foldKept.add(id); foldAt.delete(id); repaint(); });
        /* Its end, in order (#183): the bar fades away; then the message is drawn folded, and its
           height eases from what it was to what the folded form really takes -- measured, never a
           guess -- so nothing hides, comes back and hides again. */
        fill.addEventListener('animationend', () => {
            if (!foldAt.has(id) || bar.dataset.ending) return;
            bar.dataset.ending = 'true';
            const bubble = bar.closest('.parley-said');
            const finish = () => { foldAt.delete(id); foldDone.add(id); repaint(); };
            if (!bubble || reduceMotion()) { finish(); return; }
            bar.classList.add('parley-fold-going');
            setTimeout(() => {
                const was = bubble.isConnected ? bubble.getBoundingClientRect().height : 0;
                finish();
                const sel = (typeof CSS !== 'undefined' && CSS.escape) ? CSS.escape(id) : id;
                const now = thread.querySelector(`.parley-said[data-id="${sel}"]`);
                if (!now || !was) return;
                const to = now.getBoundingClientRect().height;
                if (to >= was) return;
                now.style.overflow = 'hidden'; now.style.height = `${was}px`;
                now.getBoundingClientRect();
                now.style.transition = 'height .5s cubic-bezier(.2, .7, .2, 1)'; now.style.height = `${to}px`;
                const clear = () => { now.style.height = ''; now.style.transition = ''; now.style.overflow = ''; };
                now.addEventListener('transitionend', clear, { once: true }); setTimeout(clear, 900);
            }, FOLD_FADE_MS);
        });
        return bar;
    }
    function body(item, v) {
        if (!rich) return [el('p', 'parley-text', maskSecrets(item.text))];
        const refs = new Map(item.refs.map((r) => [r.path, r.open]));
        const paint2 = painter({ words, refs, open, picture: picture ? pictureUrl : null, pictureUrl, diagram, highlight, cache, urls, zoom: zoomFrom, math: formula, targets: zoneRefs, secrets: liveSecrets, forget,
            ...(send ? {
                /* "Talk about it": said at once, with what it is about. */
                talk: (about) => { void say(said(words, 'talk-text', { name: about.label }), undefined, undefined, undefined, { about }); },
                /* What the agent asks about: what is typed next answers it, with its zone. */
                answer: (about) => { replyTo = { id: item.id, text: said(words, 'what-is-it'), auto: false, about }; dismissed.delete(item.id); paintReply(); focusBox(); },
            } : {}) });
        const blocks = markdown(item.text);
        const whole2 = () => paint2.blocks(blocks, el('div', 'parley-md'));
        /* Folded: the short version cut to a title; opened: all of it, nothing lost. */
        const shortLine = (all = true) => paint2.inlines(inline(all ? item.short : item.shortCut || item.short), el('p', 'parley-short'));
        const important = (list) => list.filter((b) => b.t === 'alert' && b.kind === 'important');
        const more = (key, open2) => { const b = button(said(words, open2 ? 'see-less' : key), 'parley-unfold', () => { if (open2) expanded.delete(item.id); else expanded.add(item.id); repaint(); }); b.setAttribute('aria-expanded', String(open2)); return b; };
        /* A question is never folded; the detailed view and a search unfold everything. */
        /* Nor is the newest message of the agent: nothing seems left below it, nothing to scroll for. */
        if (item.kind === 'ask' || item.last || v.view === 'detailed' || searching || foldKept.has(item.id)) return item.short ? [shortLine(), whole2()] : [whole2()];
        /* #87: a message the newest just pushed up stays full, with a slow countdown bar, until the countdown ends -- then it folds. A tap on the bar keeps it open. */
        if (!reduceMotion() && foldAt.has(item.id)) {
            const elapsed = Date.now() - foldAt.get(item.id);
            /* Until its end has played (the bar fading, the height easing), it is drawn full: a redraw meanwhile changes nothing. */
            if (elapsed < FOLD_MS + FOLD_FADE_MS + 600) { const full = item.short ? [shortLine(), whole2()] : [whole2()]; return [...full, foldBar(item.id, elapsed)]; }
            foldAt.delete(item.id); foldDone.add(item.id);
        }
        const isOpen = expanded.has(item.id);
        if (item.short) {
            if (isOpen) return [shortLine(), whole2(), more('see-details', true)];
            return [shortLine(false), ...important(blocks).map((b) => paint2.blocks([b], el('div', 'parley-md'))), more('see-details', false)];
        }
        if (linesOf(item.text) > FOLD_LINES + 2) {
            if (isOpen) return [whole2(), more('see-more', true)];
            const md = whole2(); md.dataset.clip = 'true';
            /* Its IMPORTANT boxes below the fold stay in sight. */
            const below = important(blocks).filter((b) => b.line >= FOLD_LINES);
            return [md, ...below.map((b) => paint2.blocks([b], el('div', 'parley-md'))), more('see-more', false)];
        }
        return [whole2()];
    }
    /* A picture the person may see, large on a click; else a card. */
    function fileView(f, size) {
        const url = f.picture && f.open !== null ? pictureUrl(f) : null;
        if (url) return painter({ words, refs: new Map(), open, cache, urls, zoom: zoomFrom }).thumb(f, url, '');
        return card(f, words, open, size);
    }
    const item0 = (row) => (row.type === 'message' ? row : {});
    function systemLine(row) {
        const line = el('div', 'parley-system'); line.dataset.from = 'system'; line.dataset.level = row.level; if (row.tone) line.dataset.tone = row.tone; line.dataset.id = row.id;
        if (row.when) line.title = row.when;
        const text = el('p', 'parley-system-text');
        /* Its words that are buttons, each where it first stands in the text; the rest stays text. */
        let rest = row.text;
        for (const a of act ? row.links : []) {
            const at = rest.indexOf(a.text);
            if (at < 0) continue;
            text.append(rest.slice(0, at), button(a.text, 'parley-ref', () => { try { act(a.id, { id: row.id, text: row.text }); } catch { /* the application's business */ } }));
            text.lastChild.dataset.act = a.id;
            rest = rest.slice(at + a.text.length);
        }
        text.append(rest);
        line.append(text, time(row.time, row.when));
        if (row.actions.length && act) {
            const buttons = el('div', 'parley-system-actions');
            for (const a of row.actions) { const b = button(a.label, 'parley-act', () => { try { act(a.id, { id: row.id, text: row.text }); } catch { /* the application's business */ } }); b.dataset.act = a.id; buttons.append(b); }
            line.append(buttons);
        }
        return line;
    }
    function rowOf(row, v) {
        if (row.type === 'day' || row.type === 'gap') { const p = el('p', 'parley-divider'); p.dataset.kind = row.type; p.append(el('span', '', row.text)); return p; }
        if (row.type === 'steps') {
            const holder = el('div', 'parley-steps');
            const chip = button(row.label, 'parley-chip', () => {});
            const list = trail(row.steps);
            holder.append(chip, list);
            folding(row, holder, chip, list);
            return holder;
        }
        if (row.type === 'received') { const p = el('p', 'parley-received', row.text); p.title = row.when; p.dataset.long = String(row.long); p.setAttribute('role', 'status'); return p; }
        if (row.type === 'waits') { const p = el('p', 'parley-waits', row.text); p.title = row.when; p.setAttribute('role', 'status'); return p; }
        /* Done: said once, quietly, at the end. */
        if (row.type === 'done') { const p = el('p', 'parley-done', row.text); p.title = row.when; p.setAttribute('role', 'status'); return p; }
        if (row.type === 'group') {
            /* A run of news of one topic: one line, unfolded on a click. */
            const holder = el('div', 'parley-group'); holder.dataset.level = 'news';
            const line = button('', 'parley-group-line', () => {});
            line.append(el('span', 'parley-system-text', row.text), time(row.time, ''));
            const list = el('div', 'parley-group-lines');
            for (const l of row.lines) list.append(systemLine(l));
            holder.append(line, list);
            folding({ key: row.key, open: false }, holder, line, list);
            return holder;
        }
        if (item0(row).from === 'system') return systemLine(row);
        if (row.type === 'now') {
            const holder = el('div', 'parley-now'); holder.dataset.live = String(row.live); if (row.busy) holder.dataset.busy = 'true';
            const line = el(row.steps.length ? 'button' : 'p', 'parley-doing');
            if (row.steps.length) line.type = 'button';
            const dots = el('span', 'parley-dots'); dots.setAttribute('aria-hidden', 'true'); dots.append(el('i'), el('i'), el('i'));
            line.append(dots, el('span', 'parley-step', row.text));
            if (row.quiet) line.append(el('span', 'parley-quiet', row.quiet));
            else line.append(time(row.time, row.when));
            /* What came before, one click away: said by a mark, and in words to whoever does not see it. */
            if (row.label) { const more = el('span', 'parley-more'); more.title = row.label; more.append(el('span', 'parley-unseen', row.label)); line.append(more); }
            if (row.steps.length) { const list = trail(row.steps); holder.append(list, line); folding(row, holder, line, list); } else holder.append(line);
            return holder;
        }
        const item = row;
        const bubble = el('div', 'parley-said'); bubble.dataset.from = item.from; bubble.dataset.kind = item.kind; bubble.dataset.id = item.id; if (item.open) bubble.dataset.asking = 'true'; if (item.closed) bubble.dataset.closed = 'true';
        if (item.id && item.id === revealed) bubble.dataset.reveal = 'true';
        if (item.when) bubble.title = item.when;
        /* The person's own message: only the host's action (attach it to a card), by a clip in its corner. */
        if (item.from === 'person' && toCard && item.id) {
            const r = el('button', 'parley-react-open'); r.type = 'button'; r.title = said(words, 'to-card'); r.setAttribute('aria-label', r.title); r.setAttribute('aria-haspopup', 'true');
            r.append(icon('paperclip', 'parley-sign'));
            r.addEventListener('click', (event) => { event.stopPropagation(); reacting.open(item, bubble); });
            bubble.append(r);
        }
        if (item.from === 'agent') {
            const head = el('p', 'parley-who');
            if (item.name) head.append(el('span', 'parley-name', item.name));
            /* Which tool it is: small, in the detailed view only. */
            if (item.name && item.tool && item.tool !== item.name) head.append(el('span', 'parley-tool', item.tool));
            if (item.time) head.append(time(item.trail ? `${item.time} - ${item.trail.label}` : item.time, item.when));
            bubble.append(head);
            /* React to it: a button that shows on hover (a right click too); on a touch screen, a short tap on the message shows it a few seconds, in its corner. */
            if (react && reactions.length && ['say', 'ask', 'show'].includes(item.kind)) {
                const r = el('button', 'parley-react-open'); r.type = 'button'; r.title = said(words, 'react'); r.setAttribute('aria-label', r.title); r.setAttribute('aria-haspopup', 'true');
                r.append(icon('smile-plus', 'parley-sign'));
                r.addEventListener('click', (event) => { event.stopPropagation(); reacting.open(item, bubble); });
                bubble.append(r);
            }
        } else if (item.name) bubble.append(el('p', 'parley-who-person', item.name));
        if (item.label) bubble.append(el('p', 'parley-label', item.label));
        if (item.reply) bubble.append(el('p', 'parley-inreply', item.reply));
        if (item.closed) bubble.append(el('p', 'parley-closed', item.closed));
        if (item.from === 'agent') bubble.append(...body(item, v));
        else if (item.text) { const p = el('p', 'parley-text'); textWithSecrets(item.text, p, words, liveSecrets, forget); bubble.append(p); }
        if (item.file) {
            if (item.file.open !== null && item.file.picture && pictureUrl(item.file)) bubble.append(fileView(item.file));
            else {
                const row2 = el('div', 'parley-file');
                row2.append(card({ ...item.file, name: item.file.name }, words, open));
                if (item.file.shown && v.view === 'detailed') row2.append(el('span', 'parley-path', item.file.shown));
                bubble.append(row2);
            }
            if (item.outside) bubble.append(el('p', 'parley-outside', item.outside));
        }
        if (item.gallery?.length) {
            /* Shown together: one gallery, each its title under it; its pictures go large one after the other. */
            const gallery = el('div', 'parley-gallery'); gallery.dataset.count = String(item.gallery.length);
            for (const f of item.gallery) {
                const url = f.picture && f.open !== null ? pictureUrl(f) : null;
                const cell = el('figure', 'parley-gallery-item');
                if (url) cell.append(painter({ words, refs: new Map(), open, cache, urls, zoom: zoomFrom }).thumb(f, url, f.title));
                else { cell.append(card(f, words, open, '', f.title)); }
                if (f.shown) cell.append(el('span', 'parley-path', f.shown));
                gallery.append(cell);
            }
            bubble.append(gallery);
            if (item.outside) bubble.append(el('p', 'parley-outside', item.outside));
        }
        if (item.files?.length) {
            const pictures = el('div', 'parley-pictures');
            for (const f of item.files) {
                const url = f.picture && f.open !== null ? pictureUrl(f) : null;
                /* What they wrote about this file alone, under it. */
                if (url) { const v = fileView(f); if (f.note) { const fig = el('figure', 'parley-noted'); fig.append(v, el('figcaption', 'parley-file-note', f.note)); pictures.append(fig); } else pictures.append(v); continue; }
                const row2 = el('div', 'parley-file'); row2.dataset.attached = 'true';
                row2.append(card(f, words, open, f.size));
                if (f.shown) row2.append(el('span', 'parley-path', f.shown));
                if (f.note) row2.append(el('span', 'parley-file-note', f.note));
                bubble.append(row2);
            }
            if (pictures.childNodes.length) bubble.append(pictures);
        }
        if (item.choices.length > 0 && item.many) {
            /* Several to tick: each a box with its words, then Send, which waits for one ticked at least. */
            const choices = el('div', 'parley-choices parley-picks'); choices.setAttribute('role', 'group');
            /* What is ticked outlives the thread drawn again (a step of the agent, a minute passing). */
            const ticked = draftOf(item.id).ticked;
            const go = button(said(words, 'send'), 'parley-picks-send', () => {
                const picked = item.choices.filter((c) => ticked.has(c));
                if (picked.length === 0) return;
                for (const x of choices.querySelectorAll('button')) x.disabled = true;
                void say(picked.join('\n'), item.id, undefined, undefined, { picked }).then((ok) => { if (ok) drafts.delete(item.id); else for (const x of choices.querySelectorAll('button')) x.disabled = x === go && ticked.size === 0; });
            });
            go.disabled = ticked.size === 0;
            for (const choice of item.choices) {
                const b = el('button', 'parley-pick'); b.type = 'button'; b.setAttribute('role', 'checkbox'); b.setAttribute('aria-checked', String(ticked.has(choice)));
                const mark = el('span', 'parley-pick-box'); mark.setAttribute('aria-hidden', 'true'); mark.append(icon('check', 'parley-sign'));
                b.append(mark, el('span', 'parley-pick-text', choice));
                if (item.recommended.includes(choice)) recommend(b);
                b.addEventListener('click', () => {
                    if (ticked.has(choice)) ticked.delete(choice); else ticked.add(choice);
                    b.setAttribute('aria-checked', String(ticked.has(choice)));
                    go.disabled = ticked.size === 0;
                });
                choices.append(b);
            }
            choices.append(go);
            bubble.append(choices);
        } else if (item.questions.length > 0 && send) {
            bubble.append(item.steps ? groupCard(item) : seriesCard(item));
        } else if (item.choices.length > 0) {
            const choices = el('div', 'parley-choices');
            for (const choice of item.choices) {
                const b = button(choice, '', () => { for (const x of choices.children) x.disabled = true; void say(choice, item.id); });
                if (item.recommended.includes(choice)) recommend(b);
                choices.append(b);
            }
            bubble.append(choices);
        }
        /* A question: answered by what is typed, once Reply is pressed; under choices, a quiet
           "Other answer…": their own words instead of one of them. */
        if ((item.open || item.closed) && send && item.questions.length === 0) {
            const other = item.choices.length > 0;
            const r = button(said(words, other ? 'other-answer' : 'reply'), other ? 'parley-reply-to parley-other' : 'parley-reply-to', () => { replyTo = { id: item.id, text: cut(item.short || item.text, 90), auto: false }; dismissed.delete(item.id); paintReply(); focusBox(); });
            bubble.append(r);
        }
        if (item.sign) {
            const s = el('span', 'parley-sign-state'); s.dataset.state = item.sign; s.title = item.signText; s.setAttribute('role', 'img'); s.setAttribute('aria-label', item.signText);
            s.append(sign(item.sign));
            bubble.append(s);
        }
        if (item.remind && remind) {
            bubble.append(button(said(words, 'remind'), 'parley-remind', async (event) => { event.target.disabled = true; try { await remind(); event.target.textContent = said(words, 'reminded'); } catch { event.target.disabled = false; } }));
        }
        /* Its reaction: an icon and its word, under it; a click opens the choice again. */
        if (item.reaction) {
            const r = reactions.find((x) => x.id === item.reaction);
            const chip = el('button', 'parley-reaction'); chip.type = 'button'; chip.dataset.reaction = item.reaction;
            chip.title = said(words, `react-${item.reaction}-hint`);
            chip.append(icon(r?.icon ?? 'smile-plus', 'parley-sign'), el('span', '', said(words, `react-${item.reaction}`)));
            if (react) chip.addEventListener('click', (event) => { event.stopPropagation(); reacting.open(item, bubble); }); else chip.disabled = true;
            bubble.append(chip);
        }
        /* A decision it waits for on this message: the two answers in sight, under it. */
        if (item.decide && react) {
            const two = ['go', 'disagree'].map((id) => reactions.find((r) => r.id === id)).filter(Boolean);
            if (two.length === 2) {
                const row2 = el('div', 'parley-decide'); row2.setAttribute('role', 'group'); row2.setAttribute('aria-label', said(words, 'decide'));
                for (const r of two) {
                    const b = el('button', 'parley-decide-choice'); b.type = 'button'; b.dataset.reaction = r.id; b.title = said(words, `react-${r.id}-hint`);
                    b.append(icon(r.icon, 'parley-sign'), el('span', '', said(words, `react-${r.id}`)));
                    b.addEventListener('click', async (event) => {
                        event.stopPropagation();
                        for (const x of row2.querySelectorAll('button')) x.disabled = true;
                        problem.hidden = true;
                        try { await react(item.id, r.id); await refresh(); } catch (error) { for (const x of row2.querySelectorAll('button')) x.disabled = false; problem.textContent = said(words, 'not-sent', { error: String(error?.message ?? error) }); problem.hidden = false; }
                    });
                    row2.append(b);
                }
                bubble.append(row2);
            }
        }
        /* Dictated: a small microphone, said in words to whoever does not see it. */
        if (item.dictated) { const d = el('span', 'parley-dictated'); d.title = said(words, 'dictated'); d.setAttribute('role', 'img'); d.setAttribute('aria-label', d.title); d.append(icon('mic', 'parley-sign')); bubble.append(d); }
        if (item.from === 'person' && item.time) bubble.append(time(item.time, item.when));
        if (!item.trail) return bubble;
        /* The steps that led to it, opened by a click on it: above it, as they came. */
        const list = trail(item.trail.steps);
        list.dataset.for = item.id;
        bubble.dataset.steps = 'true'; bubble.tabIndex = 0;
        folding(item.trail, bubble, bubble, list, { only: (event) => !(event.target instanceof Element && event.target.closest('button, a, img, pre, table, .parley-md code, figure')) && !String(globalThis.getSelection?.() ?? '') });
        return [list, bubble];
    }
    /* REACTIONS: one choice over the page, near the message -- each icon with
       its word under it, its meaning on hover; the one standing is pressed,
       pressed again it is taken back. Reply is there too: what is typed next
       answers that message. Opened by the button on the message (always in
       sight on a touch screen), or a mouse's right click. A long press is left to the
       browser: it selects the text, to copy it. */
    function reactionPicker() {
        const box = el('div', 'parley-react'); box.hidden = true; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', said(words, 'react')); box.tabIndex = -1;
        const grid = el('div', 'parley-react-grid');
        const replyB = el('button', 'parley-react-reply'); replyB.type = 'button'; replyB.append(icon('reply', 'parley-sign'), el('span', '', said(words, 'reply')));
        /* The host's own: this message attached to a card of its binders (card(message), optional). */
        const cardB = el('button', 'parley-react-reply parley-react-card'); cardB.type = 'button'; cardB.append(icon('paperclip', 'parley-sign'), el('span', '', said(words, 'to-card')));
        box.append(grid, replyB, cardB);
        let target = null;
        let marked = null;
        const close = () => {
            steps.closed('react');
            box.hidden = true; target = null;
            if (marked) { delete marked.dataset.reacting; marked = null; }
            if (box.dataset.sheet === 'true') { thread.style.paddingBottom = ''; delete box.dataset.sheet; }
        };
        const choose2 = async (id) => {
            const t = target; close();
            if (!t || !react) return;
            problem.hidden = true;
            try { await react(t.id, id); await refresh(); } catch (error) { problem.textContent = said(words, 'not-sent', { error: String(error?.message ?? error) }); problem.hidden = false; }
        };
        cardB.addEventListener('click', () => { const t = target; close(); if (t && toCard) void toCard({ id: t.id, text: t.text, short: t.short }); });
        replyB.addEventListener('click', () => { const t = target; close(); if (!t) return; replyTo = { id: t.id, text: cut(t.short || t.text, 90), auto: false }; dismissed.delete(t.id); paintReply(); focusBox(); });
        box.addEventListener('keydown', (event) => { if (event.key === 'Escape') { event.preventDefault(); close(); } });
        document.addEventListener('pointerdown', (event) => { if (!box.hidden && !(event.target instanceof Node && box.contains(event.target)) && !(event.target instanceof Element && event.target.closest('.parley-react-open, .parley-reaction'))) close(); });
        return {
            box,
            open(item, bubble) {
                const reacts = Boolean(react && reactions.length && item.from !== 'person');
                if (!reacts && !toCard) return;
                if (marked) delete marked.dataset.reacting;
                target = item; marked = bubble; bubble.dataset.reacting = 'true';
                /* "Go ahead" first, "Stop" last: the two never side by side. */
                const rank = (r, i) => { const k = PICKER_ORDER.indexOf(r.id); return r.id === 'stop' ? 1e6 : k < 0 ? 100 + i : k; };
                const ordered = reactions.map((r, i) => ({ r, k: rank(r, i) })).sort((x, y) => x.k - y.k).map((x) => x.r);
                grid.hidden = !reacts;
                grid.replaceChildren(...(reacts ? ordered : []).map((r) => {
                    const b = el('button', 'parley-react-choice'); b.type = 'button'; b.dataset.reaction = r.id;
                    b.title = said(words, `react-${r.id}-hint`);
                    b.setAttribute('aria-pressed', String(item.reaction === r.id));
                    b.append(icon(r.icon, 'parley-sign'), el('span', 'parley-react-word', said(words, `react-${r.id}`)));
                    if (item.reaction === r.id) b.title = `${said(words, 'react-remove')} - ${b.title}`;
                    b.addEventListener('click', () => void choose2(item.reaction === r.id ? null : r.id));
                    return b;
                }));
                replyB.hidden = !send;
                cardB.hidden = !toCard;
                box.style.left = ''; box.style.top = '';
                /* On a narrow screen: a panel that rises from the bottom, the message kept in sight above it. */
                const sheet = root.getBoundingClientRect().width < SHEET_PX;
                if (sheet) box.dataset.sheet = 'true'; else delete box.dataset.sheet;
                box.hidden = false;
                steps.opened('react', close);
                if (sheet) {
                    /* Where it ends up, not where its rising starts. */
                    const top2 = root.getBoundingClientRect().bottom - box.offsetHeight; const area2 = thread.getBoundingClientRect();
                    thread.style.paddingBottom = `${Math.max(0, area2.bottom - top2) + 32}px`;
                    const at2 = bubble.getBoundingClientRect(); const room = top2 - 12 - area2.top;
                    const by = at2.height > room ? at2.top - area2.top - 8 : at2.bottom - (top2 - 12);
                    if (by > 0 || at2.height > room) thread.scrollTop += by;
                    box.focus?.({ preventScroll: true });
                    return;
                }
                /* Near the message, inside the chat. */
                const area = root.getBoundingClientRect(); const at = bubble.getBoundingClientRect(); const me = box.getBoundingClientRect();
                const left = Math.max(8, Math.min(area.width - me.width - 8, at.right - area.left - me.width));
                const below = at.top - area.top + 28;
                const top = below + me.height > area.height - 8 ? Math.max(8, at.top - area.top - me.height + 24) : below;
                box.style.left = `${left}px`; box.style.top = `${Math.max(8, Math.min(top, area.height - me.height - 8))}px`;
                /* The choice itself takes the keys (Tab goes through it), none looks chosen that is not. */
                box.focus?.({ preventScroll: true });
            },
            close,
            close,
            get open2() { return !box.hidden; },
        };
    }
    /* THE MEDIA OF THE THREAD: its pictures as a grid, newest first, and its
       other files as a list; a picture goes large, with all the others of the
       thread one after the other; "See in the thread" finds where it came. */
    function mediaShelf() {
        const box = el('div', 'parley-media'); box.hidden = true; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', said(words, 'media')); box.tabIndex = -1;
        const head = el('div', 'parley-media-head');
        const tabs = el('div', 'parley-media-tabs'); tabs.setAttribute('role', 'tablist');
        const tab = (key) => { const b = el('button', 'parley-media-tab', said(words, key)); b.type = 'button'; b.setAttribute('role', 'tab'); b.dataset.tab = key; return b; };
        const tPictures = tab('media-pictures'); const tFiles = tab('media-files');
        tabs.append(tPictures, tFiles);
        const shut = el('button', 'parley-media-close'); shut.type = 'button'; shut.title = said(words, 'close'); shut.setAttribute('aria-label', shut.title); shut.append(icon('x', 'parley-sign'));
        head.append(el('h3', '', said(words, 'media')), tabs, shut);
        const body2 = el('div', 'parley-media-body');
        box.append(head, body2);
        let on = 'media-pictures';
        const close = () => { steps.closed('media'); box.hidden = true; };
        const find = (id) => { close(); pointAt(id); };
        /* What is shown is the end of the thread: the pictures of the part before it come with it, on demand. */
        function paint3() {
            fill();
            if (!(Number(latest?.window?.more) > 0)) return;
            const more = button(said(words, 'media-earlier'), 'parley-media-earlier', async () => { more.disabled = true; await before(); if (!box.hidden) paint3(); });
            more.disabled = Boolean(fetching);
            body2.append(more);
        }
        function fill() {
            const m = media(latest, { locale });
            for (const b of [tPictures, tFiles]) b.setAttribute('aria-selected', String(b.dataset.tab === on));
            tPictures.textContent = `${said(words, 'media-pictures')} (${m.pictures.length})`; tFiles.textContent = `${said(words, 'media-files')} (${m.files.length})`;
            if (on === 'media-pictures') {
                const shown2 = m.pictures.map((f) => ({ f, url: picture ? pictureUrl(f) : null })).filter((x) => x.url);
                if (!shown2.length) { body2.replaceChildren(el('p', 'parley-empty', said(words, 'media-none'))); return; }
                /* Large: in the order of the thread, the oldest first. */
                const inOrder = [...shown2].reverse();
                const grid = el('div', 'parley-media-grid');
                for (const x of shown2) {
                    const cell = el('figure', 'parley-media-item');
                    const b = el('button', 'parley-media-thumb'); b.type = 'button'; b.title = `${x.f.title} - ${x.f.name}`;
                    const img = el('img'); img.src = x.url; img.alt = x.f.title; img.loading = 'lazy'; b.append(img);
                    b.addEventListener('click', () => zoom.show(inOrder.map((y) => ({ url: y.url, name: y.f.name, title: y.f.title, from: y.f.id ?? '' })), inOrder.indexOf(x), img));
                    const where = button(said(words, 'see-in-thread'), 'parley-media-where', () => find(x.f.id));
                    where.title = x.f.when;
                    cell.append(b, el('figcaption', '', x.f.title), where);
                    grid.append(cell);
                }
                body2.replaceChildren(grid);
            } else {
                if (!m.files.length) { body2.replaceChildren(el('p', 'parley-empty', said(words, 'media-none'))); return; }
                const list = el('ul', 'parley-media-files');
                for (const f of m.files) {
                    const li = el('li');
                    li.append(card(f, words, open, '', f.title));
                    li.append(button(said(words, 'see-in-thread'), 'parley-media-where', () => find(f.id)));
                    list.append(li);
                }
                body2.replaceChildren(list);
            }
        }
        tPictures.addEventListener('click', () => { on = 'media-pictures'; paint3(); });
        tFiles.addEventListener('click', () => { on = 'media-files'; paint3(); });
        shut.addEventListener('click', close);
        box.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !zoom.open) { event.preventDefault(); close(); } });
        return { box, show() { box.hidden = false; steps.opened('media', close); paint3(); box.focus?.({ preventScroll: true }); }, close, get open() { return !box.hidden; } };
    }
    /* The side of the detailed view: what it does now with the steps of this turn, its machine as the application says, its files. */
    function sideNow(v) {
        const out = [];
        const now = el('section', 'parley-side-now');
        now.append(el('h3', '', said(words, 'side-now')));
        if (v.side?.now) { now.append(el('p', 'parley-side-doing', v.side.now.text)); if (v.side.now.steps.length) now.append(trail(v.side.now.steps)); }
        else now.append(el('p', 'parley-empty', said(words, 'side-nothing')));
        out.push(now);
        if (v.side?.about?.length) {
            const about = el('section', 'parley-side-about');
            about.append(el('h3', '', said(words, 'side-machine')));
            const dl = el('dl');
            for (const a of v.side.about) { const dt = el('dt', '', a.label); const dd = el('dd', '', a.text); if (a.tone) dd.dataset.tone = a.tone; dl.append(dt, dd); }
            about.append(dl);
            out.push(about);
        }
        return out;
    }
    function sideOf(v) {
        const files = el('section', 'parley-files');
        files.append(el('h3', '', said(words, 'files')));
        if (v.files.length === 0) files.append(el('p', 'parley-empty', said(words, 'no-files')));
        else {
            const list = el('ul');
            for (const f of v.files) {
                const li = el('li'); li.append(el('span', 'parley-name', f.name));
                const b = fileButton(f); if (b) li.append(' ', b);
                li.append(el('span', 'parley-path', f.open === null ? said(words, 'outside', { path: f.path }) : f.note || f.path));
                if (f.open === null) li.dataset.outside = 'true';
                li.title = f.path;
                list.append(li);
            }
            files.append(list);
        }
        return files;
    }
    /* The rows already seen: null before the first look. */
    let seenKeys = null;
    const wrap = (row, made) => {
        const r = el('div', 'parley-row'); r.dataset.type = row.type; if (row.key) r.dataset.key = row.key;
        if (row.type === 'message') r.dataset.from = row.from;
        r.append(...(Array.isArray(made) ? made : [made]));
        return r;
    };
    function paint(data) {
        latest = data;
        paintQuick();
        paintSuggest();
        const v = view(data, { words, view: as, locale, agentName, agentTool, receivedAfter, noAnswerAfter });
        paintReply(v);
        const small = narrow();
        const older = Number(data?.window?.more) > 0 && typeof data?.window?.before === 'string' ? Number(data.window.more) : 0;
        const mark = JSON.stringify([v, small, [...expanded], searching ? query.value : '', older]);
        if (mark === shown) { anchor = null; return; }
        shown = mark;
        /* #87: did a newer agent message just push the previous newest up? Then that one folds, with a countdown. Not under reduced motion (it stays an instant fold). */
        if (!reduceMotion()) {
            const curLast = v.rows.find((r) => r.type === 'message' && r.last)?.id ?? null;
            if (foldFrom !== null && curLast !== null && curLast !== foldFrom
                && !foldKept.has(foldFrom) && !foldDone.has(foldFrom) && !foldAt.has(foldFrom)
                && v.rows.some((r) => r.id === foldFrom && r.type === 'message' && r.from === 'agent' && foldsAway(r))
                && foldWorthIt(foldFrom)) {
                foldAt.set(foldFrom, Date.now());
            }
            if (curLast !== null) foldFrom = curLast;
        }
        for (const b of toggles) b.setAttribute('aria-pressed', String(b.dataset.view === v.view));
        status.hidden = !v.status;
        if (v.status) { status.dataset.state = v.status.state; status.textContent = v.status.text; status.title = [v.status.text, v.status.when].filter(Boolean).join(' - '); }
        /* The newest is shown: when the reader was at the bottom already, or when they wrote -- not when what came is a page before. */
        const paging = anchor !== null;
        const wrote = !paging && v.items.length > count && v.items.at(-1)?.from === 'person';
        const atBottom = !paging && (sticky || wrote);
        const keep = atBottom ? 0 : thread.scrollTop;
        if (!atBottom && !paging && v.items.length > count) { awayCount += v.items.length - count; paintJump(); }
        count = v.items.length;
        /* Typing in a card when the thread is drawn again: seen before its rows are made, which move the box being written in. */
        const typing = document.activeElement?.dataset?.draft ? { key: document.activeElement.dataset.draft, from: document.activeElement.selectionStart, to: document.activeElement.selectionEnd } : null;
        /* What arrives while the thread is open comes in softly, and is marked a moment: never on the first look, nor what was there. */
        const made = v.rows.map((row) => { const r = wrap(row, rowOf(row, v)); if (!paging && seenKeys !== null && row.key && !seenKeys.has(row.key) && !['day', 'gap'].includes(row.type)) r.dataset.arrived = row.type === 'message' && row.from !== 'system' ? 'message' : 'line'; return r; });
        /* The thread goes further back: one button at its top asks for the page before. */
        if (older) { const b = button(said(words, 'earlier'), 'parley-earlier', () => { void before(); }); b.title = `${said(words, 'earlier')} (${older})`; b.disabled = Boolean(fetching); const r = el('div', 'parley-row'); r.dataset.type = 'earlier'; r.append(b); made.unshift(r); }
        const firstLook = seenKeys === null;
        seenKeys = new Set([...(seenKeys ?? []), ...v.rows.map((row) => row.key).filter(Boolean)]);
        if (firstLook && !v.rows.length) seenKeys = new Set();
        thread.replaceChildren(...made);
        /* The same box, moved: given the focus back at once, and its cursor (a NodeList has no find). */
        if (typing) { const back2 = [...thread.querySelectorAll('textarea')].find((x) => x.dataset.draft === typing.key); if (back2 && document.activeElement !== back2) { back2.focus({ preventScroll: true }); try { back2.setSelectionRange(typing.from, typing.to ?? typing.from); } catch { /* not a text field */ } } }
        for (const r of made) if (r.dataset.arrived) setTimeout(() => { delete r.dataset.arrived; }, 1700);
        watchChoices();
        if (v.empty) thread.append(el('p', 'parley-empty', v.empty));
        aside.hidden = v.view !== 'detailed';
        aside.dataset.narrow = String(small);
        if (v.view !== 'detailed') aside.replaceChildren();
        else {
            const way = terminal ? [button(said(words, 'terminal'), 'parley-terminal', () => terminal())] : [];
            if (small) {
                /* One line on a narrow screen, unfolded on demand; the way to the terminal stays in sight. */
                const fold = el('details', 'parley-fold'); fold.open = !folded;
                fold.addEventListener('toggle', () => { folded = !fold.open; });
                fold.append(el('summary', '', v.summary), ...sideNow(v), sideOf(v));
                aside.replaceChildren(fold, ...way);
            } else aside.replaceChildren(...sideNow(v), sideOf(v), ...way);
        }
        if (paging) { thread.scrollTop = Math.max(0, thread.scrollHeight - anchor); anchor = null; }
        if (searching) { mark2(moveToLast); moveToLast = false; }
        if (paging) { /* kept where it was, above */ } else if (atBottom && !searching) { bottom(); sticky = true; awayCount = 0; paintJump(); requestAnimationFrame(bottom); } else if (!searching) thread.scrollTop = keep;
    }
    const paintJump = () => { jump.hidden = sticky; jumpCount.textContent = awayCount > 0 ? String(awayCount) : ''; jumpCount.hidden = awayCount === 0; };
    jump.addEventListener('click', () => { sticky = true; awayCount = 0; bottom(); paintJump(); });
    thread.addEventListener('scroll', () => { const was = sticky; sticky = thread.scrollHeight - thread.scrollTop - thread.clientHeight < 40; if (sticky) awayCount = 0; if (was !== sticky || sticky) paintJump(); }, { passive: true });
    /* The page around it settles (fonts, a keyboard, a turned phone): the newest stays in sight. */
    const settle = typeof ResizeObserver === 'function' ? new ResizeObserver(() => { if (sticky) bottom(); }) : null;
    settle?.observe(thread);
    /* A picture that arrives after the page was drawn makes it taller: the newest stays in sight. */
    thread.addEventListener('load', () => { if (sticky) bottom(); }, true);
    /* A look: only what changed since the cursor the application gave, when it gives one; else all of it again, as before. */
    async function refresh() {
        try {
            const cursor = typeof latest?.cursor === 'string' && latest.cursor ? latest.cursor : null;
            const got = await load(cursor ? { ...span, since: cursor } : { ...span });
            paint(cursor ? since(latest, got) : got);
        } catch { /* shown again at the next look */ }
    }
    /* THE PART BEFORE what is shown: "Earlier messages", at the top; where the reader was stays in sight. */
    let fetching = null;
    function before(more = {}) {
        if (fetching) return fetching;
        const from = latest?.window?.before;
        if (typeof from !== 'string' || !from) return Promise.resolve(false);
        for (const b of root.querySelectorAll('.parley-earlier, .parley-media-earlier')) b.disabled = true;
        fetching = (async () => {
            try {
                const page = await load({ ...(more.from ? {} : span), before: from, ...more });
                if (gone || !page || !Array.isArray(page.messages)) return false;
                anchor = thread.scrollHeight - thread.scrollTop;
                paint(earlier(latest, page));
                return true;
            } catch { return false; } finally { fetching = null; for (const b of root.querySelectorAll('.parley-earlier, .parley-media-earlier')) b.disabled = false; }
        })();
        return fetching;
    }
    /* The messages as last drawn. */
    const latestItems = () => (latest ? view(latest, { words, view: as, locale, agentName, agentTool, receivedAfter, noAnswerAfter }).items : []);
    /* ONE MESSAGE SHOWN: the thread scrolled to it, and it marked a moment. */
    const rowFor = (id) => [...thread.querySelectorAll('.parley-said, .parley-system')].find((b) => b.dataset.id === id);
    function pointAt(id) {
        const row = rowFor(id);
        if (!row) return false;
        sticky = false; row.scrollIntoView?.({ block: 'center' });
        row.dataset.found = 'true'; setTimeout(() => { delete row.dataset.found; }, 1800);
        paintJump();
        /* The newest put in sight after a paint just made waits a frame: then it, again. */
        requestAnimationFrame(() => { if (!sticky) rowFor(id)?.scrollIntoView?.({ block: 'center' }); });
        return true;
    }
    /* The application points to a message (a card that links to it): by its id, or its first
       ID_LEAST characters or more, as `parley read` shows it. Older than what is shown: the pages
       before it are brought, one after the other, until it is there. */
    const known = (key) => (latest?.messages ?? []).find((m) => m && typeof m.id === 'string' && m.id && (m.id === key || m.id.startsWith(key)));
    async function reveal(id) {
        const key = typeof id === 'string' ? id.trim() : '';
        if (key.length < ID_LEAST) return false;
        await loaded;
        let found = known(key);
        while (!found && !gone) {
            const from = latest?.window?.before;
            if (!(Number(latest?.window?.more) > 0) || typeof from !== 'string' || !from) break;
            if (!(await before()) || latest?.window?.before === from) break;
            found = known(key);
        }
        if (!found || gone) return false;
        closeLayers();
        return pointAt(String(found.id));
    }
    /* What is open over the thread, closed. */
    function closeLayers() { for (const name of steps.open.reverse()) { if (name === 'zoom') zoom.close(); else if (name === 'media') shelf.close(); else if (name === 'react') reacting.close?.(); else if (name === 'search') closeSearch(); else if (name === 'prefs') showPrefs(false); else if (name === 'panel') showSheet(false); } }
    /* ---- the search ---- */
    let searching = false;
    let moveToLast = false;
    /* Every place the words sought are, in what was said: each marked. */
    function mark2(move) {
        const q = query.value.trim().toLowerCase();
        matches = [];
        if (q) {
            const walk = (node) => {
                for (const child of [...node.childNodes]) {
                    if (child.nodeType === 3 || (child.childNodes.length === 0 && typeof child.data === 'string')) {
                        const text = child.textContent; const low = text.toLowerCase();
                        if (!low.includes(q)) continue;
                        const parts = [];
                        let from = 0; let at;
                        while ((at = low.indexOf(q, from)) >= 0) { if (at > from) parts.push(text.slice(from, at)); const m = el('mark', 'parley-found', text.slice(at, at + q.length)); parts.push(m); matches.push(m); from = at + q.length; }
                        if (from < text.length) parts.push(text.slice(from));
                        const holder = document.createDocumentFragment ? document.createDocumentFragment() : null;
                        if (holder) { holder.append(...parts); child.replaceWith(holder); } else { const s = el('span'); s.append(...parts); child.replaceWith?.(s); }
                    } else if (child.nodeType === 1 && !['BUTTON', 'svg', 'SVG', 'TIME', 'MARK'].includes(child.tagName)) walk(child);
                }
            };
            for (const said2 of thread.querySelectorAll('.parley-said, .parley-system')) walk(said2);
        }
        if (move) current = matches.length ? matches.length - 1 : 0;
        current = Math.min(current, Math.max(0, matches.length - 1));
        counted();
        matches.forEach((m, i) => { if (i === current) m.dataset.now = 'true'; });
        matches[current]?.scrollIntoView?.({ block: 'center' });
    }
    /* THE WHOLE THREAD SEARCHED, by the application (`search`), when only its end is shown: what
       was found further back counts, and stepping back to it brings the part up to it. */
    let afar = { q: '', matches: [] };
    const notHere = () => {
        if (afar.q !== query.value.trim().toLowerCase()) return [];
        const here = new Set((latest?.messages ?? []).filter((m) => m && m.from !== 'system').map((m) => String(m.id ?? '')));
        return afar.matches.filter((m) => m && typeof m.id === 'string' && !here.has(m.id));
    };
    const counted = () => {
        const q = query.value.trim();
        const far = notHere().length;
        found.textContent = q ? said(words, 'found', { n: matches.length ? far + current + 1 : 0, m: far + matches.length }) : '';
    };
    /* The part of the thread up to a message found further back, then that message, its last word found. */
    async function reach(match) {
        if (!(await before({ from: match.id }))) return;
        const marks = matches.map((m, i) => ({ m, i })).filter(({ m }) => m.closest?.('.parley-said')?.dataset.id === match.id);
        if (!marks.length) return;
        for (const m of matches) m.dataset.now = 'false';
        current = marks.at(-1).i; matches[current].dataset.now = 'true'; counted(); matches[current].scrollIntoView?.({ block: 'center' });
    }
    const step = (n) => {
        const far = notHere();
        /* Back from the oldest found here: the next one further back, brought. */
        if (far.length && (!matches.length || (n < 0 && current === 0))) { void reach(far[0]); return; }
        if (!matches.length) return;
        matches[current].dataset.now = 'false'; current = (current + n + matches.length) % matches.length; matches[current].dataset.now = 'true'; counted(); matches[current].scrollIntoView?.({ block: 'center' });
    };
    let asked = 0;
    async function searchFar() {
        const q = query.value.trim();
        const mine = ++asked;
        if (!searchAll || q.length < 2) { afar = { q: '', matches: [] }; counted(); return; }
        try {
            const r = await searchAll(q);
            if (mine !== asked || gone || !searching) return;
            afar = { q: q.toLowerCase(), matches: Array.isArray(r?.matches) ? r.matches : [] };
            counted();
            /* Nothing found in what is shown: the newest found further back is brought at once. */
            if (!matches.length && notHere().length) void reach(notHere()[0]);
        } catch { /* the search of what is shown stays */ }
    }
    function openSearch() { steps.opened('search', closeSearch); searching = true; finder.hidden = false; showPrefs(false); query.focus(); query.select?.(); repaint(); }
    function closeSearch() { steps.closed('search'); searching = false; finder.hidden = true; query.value = ''; matches = []; afar = { q: '', matches: [] }; asked += 1; repaint(); sticky = true; bottom(); paintJump(); }
    searchButton.addEventListener('click', openSearch);
    mediaButton.addEventListener('click', () => { showPrefs(false); shelf.show(); });
    /* A FIELD BEING WRITTEN IN IS THE BROWSER'S: a right click or a press in it (a word underlined by the
       spellchecker, touched to be corrected) opens its own menu, and the keyboard stays where it is. The
       handlers of the thread never prevent it, never move the focus, never mark anything for it. */
    const typedIn = (target) => {
        const field = target instanceof Element ? target.closest('input, textarea, select, [contenteditable]') : null;
        return Boolean(field) && field.getAttribute('contenteditable') !== 'false';
    };
    /* A right click on a message of the agent: its reactions. A long press of a
       finger or a pen fires the same event (Android): it is left to the browser,
       that selects the text to copy it; the reactions are the button's. */
    let pointer = '';
    thread.addEventListener('pointerdown', (event) => { pointer = event.pointerType ?? ''; });
    thread.addEventListener('contextmenu', (event) => {
        if (!react || !reactions.length || typedIn(event.target)) return;
        const by = event.pointerType || pointer;
        if (by ? by !== 'mouse' : touching) return;
        const bubble = event.target instanceof Element ? event.target.closest('.parley-said[data-from="agent"]') : null;
        if (!bubble || (event.target instanceof Element && event.target.closest('a, img, pre, code')) || String(globalThis.getSelection?.() ?? '')) return;
        const item = latestItems().find((i) => i.id === bubble.dataset.id && ['say', 'ask', 'show'].includes(i.kind));
        if (!item) return;
        event.preventDefault(); reacting.open(item, bubble);
    });
    let typing2;
    query.addEventListener('input', () => { clearTimeout(typing2); typing2 = setTimeout(() => { moveToLast = true; repaint(); void searchFar(); }, 150); });
    query.addEventListener('keydown', (event) => { if (event.key === 'Escape') { event.preventDefault(); closeSearch(); } else if (event.key === 'Enter') { event.preventDefault(); step(event.shiftKey ? -1 : 1); } });
    root.addEventListener('keydown', (event) => {
        if ((event.ctrlKey || event.metaKey) && !event.altKey && String(event.key).toLowerCase() === 'f') { event.preventDefault(); openSearch(); }
        else if (event.key === 'Escape' && searching && !zoom.open) { event.preventDefault(); closeSearch(); }
    });
    /* A long press on a touch screen is the browser's: it selects the text, to copy it (#38). Nothing
       of the message shows then; a short tap shows its button and time (below). */
    let hiding;
    /* A short tap on a message, on a touch screen: its button and time shown a few seconds (a tap again, hidden). */
    let tapped = null;
    thread.addEventListener('pointerdown', (event) => { tapped = event.pointerType === 'mouse' ? null : { x: event.clientX, y: event.clientY, at: Date.now() }; }, { passive: true });
    thread.addEventListener('pointerup', (event) => {
        const was = tapped; tapped = null;
        if (!was || event.pointerType === 'mouse' || Date.now() - was.at >= PRESS_MS || Math.hypot(event.clientX - was.x, event.clientY - was.y) > 10) return;
        if (!(event.target instanceof Element) || event.target.closest('button, a, input, textarea, select, img, video, .parley-react')) return;
        const bubble = event.target.closest('.parley-said');
        if (!bubble || String(document.getSelection?.() ?? '').length > 0) return;
        const on = bubble.dataset.reveal === 'true';
        for (const other of thread.querySelectorAll('.parley-said[data-reveal]')) delete other.dataset.reveal;
        clearTimeout(hiding);
        if (on) { revealed = ''; return; }
        bubble.dataset.reveal = 'true'; revealed = bubble.dataset.id ?? '';
        hiding = setTimeout(() => { revealed = ''; for (const other of thread.querySelectorAll('.parley-said[data-reveal]')) delete other.dataset.reveal; }, 6000);
    }, { passive: true });
    /* ---- the reply to a question ---- */
    function paintReply(v) {
        if (v) {
            const asking = v.asking;
            if (replyTo?.auto && (!asking || asking.id !== replyTo.id)) replyTo = null;
            if (replyTo && !replyTo.auto && !v.items.some((i) => i.id === replyTo.id && i.from === 'agent')) replyTo = null;
            if (!replyTo && asking && !dismissed.has(asking.id) && send) replyTo = { ...asking, auto: true };
        }
        replyRow.hidden = !replyTo;
        if (!replyTo) { replyRow.replaceChildren(); return; }
        const x = button('×', 'parley-unreply', () => { dismissed.add(replyTo.id); replyTo = null; paintReply(); stayIn(); });
        x.title = said(words, 'not-a-reply'); x.setAttribute('aria-label', x.title);
        replyRow.replaceChildren(el('span', 'parley-replying-text', said(words, 'replying', { question: replyTo.text })), x);
    }
    /* ---- the box: the keyboard, the ready answers, the voice ---- */
    const mediaQuery = (q) => typeof matchMedia === 'function' && matchMedia(q).matches;
    const touching = typeof touch === 'boolean' ? touch : mediaQuery('(any-pointer: coarse)');
    /* With a keyboard, Enter sends and Shift+Enter is a new line, as in every
       chat; on a touch screen Enter is a new line and the button sends. */
    const keyboard = mediaQuery('(pointer: fine)');
    /* The box grows with what is in it, up to a few lines, then scrolls. */
    /* WHAT IS BEING WRITTEN, KEPT: with `draft` (a name for this thread), the box is kept on this device as
       it is typed, and found again when the thread is shown again -- another thread looked at meanwhile, or
       the page reloaded. Sent, it is let go. */
    const DRAFT = draftKey ? `parley-draft:${draftKey}` : '';
    const keepDraft = () => { if (!DRAFT) return; try { if (box.value.trim()) localStorage.setItem(DRAFT, box.value); else localStorage.removeItem(DRAFT); } catch { /* a private window: kept as long as the page */ } };
    /* THE BOX IS NEVER COLLAPSED TO BE MEASURED. A tap in a word makes a phone's keyboard take it up again
       to correct it (composition, then input): a box set to no height for a moment to be measured jumps
       under the finger, and the browser may drop the keyboard. Where the browser sizes a field by its
       content (field-sizing, in the style sheet), nothing is done here; elsewhere, a hidden copy with the
       same width and text is measured, and the box is given a height only when that height changes. */
    const sizedByCss = typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports('field-sizing', 'content');
    let mirror = null;
    const measured = { value: null, width: -1 };
    const grow = () => {
        keepDraft();
        tellCount();
        paintGo();
        if (sizedByCss) return;
        const width = box.getBoundingClientRect().width;
        if (box.value === measured.value && width === measured.width) return;
        if (!mirror) {
            mirror = el('textarea', 'parley-box-mirror'); mirror.rows = 1; mirror.tabIndex = -1; mirror.readOnly = true; mirror.setAttribute('aria-hidden', 'true');
            field.append(mirror);
        }
        measured.value = box.value; measured.width = width;
        if (width > 0) mirror.style.width = `${width}px`;
        mirror.value = box.value;
        /* Border to border, as the box is measured; its own min and max heights still apply. */
        const height = `${mirror.scrollHeight + 2}px`;
        if (box.style.height !== height) box.style.height = height;
    };
    if (DRAFT) { try { const kept = localStorage.getItem(DRAFT); if (kept) { box.value = kept.slice(0, TEXT_MAX); queueMicrotask(grow); } } catch { /* as above */ } }
    box.addEventListener('input', () => { grow(); if (!box.value.trim()) dictatedNow = false; });
    /* The page puts the cursor in the box only where no keyboard comes up
       with it; on a touch screen, only the person's finger does. */
    const focusBox = () => { if (!touching && document.activeElement !== box) box.focus({ preventScroll: true }); };
    /* A tap on a button of the box does not take the focus from it: the
       keyboard of a phone, open, stays open after sending; closed, it is not
       opened. Should a browser move the focus all the same, it is given back
       in the same gesture. */
    let typing = false;
    /* On a touch screen, the microphone and the buttons of the thread (an
       answer, a reaction) are said or tapped, not typed: the keyboard is not
       kept for them, and never brought back after them. */
    const spoken = (target) => touching && (target.closest('.parley-mic') || thread.contains(target));
    const keep = (event) => {
        if (!(event.target instanceof Element) || !event.target.closest('button')) return;
        if (spoken(event.target)) { typing = false; return; }
        typing = document.activeElement === box;
        if (typing) event.preventDefault();
    };
    for (const zone of [form, quickRow, prefs, thread, pendingRow, replyRow]) { zone.addEventListener('pointerdown', keep); zone.addEventListener('mousedown', keep); }
    const stayIn = () => { if (typing && document.activeElement !== box) box.focus({ preventScroll: true }); typing = false; };
    /* What is about to go with the message: pictures as pictures, other files as cards; each can be taken away. */
    const previews = new Map();
    const previewOf = (file) => {
        if (!previews.has(file)) { let url = null; try { if (/^image\/(png|jpeg|gif|webp)$/.test(file.type) && typeof URL?.createObjectURL === 'function') url = URL.createObjectURL(file); } catch { url = null; } previews.set(file, url); }
        return previews.get(file);
    };
    /* What was drawn on a picture about to go, and noted about it: { strokes, note, drawn }. */
    const marks = new Map();
    const letGo = (keep2) => {
        const kept = new Set([...keep2, ...keep2.map((f) => marks.get(f)?.drawn).filter(Boolean)]);
        for (const [file, url] of previews) if (!kept.has(file)) { if (url) try { URL.revokeObjectURL(url); } catch { /* gone */ } previews.delete(file); }
        for (const file of [...marks.keys()]) if (!keep2.includes(file)) marks.delete(file);
    };
    const paintPending = () => {
        letGo(pending);
        pendingRow.hidden = pending.length === 0;
        paintGo();
        /* Where they go, and who opens them: said where they are chosen. */
        const where = el('p', 'parley-where', said(words, 'attach-where'));
        pendingRow.replaceChildren(where, ...pending.map((file, i) => {
            const url = previewOf(file);
            const mark = marks.get(file);
            const chip = el('span', url ? 'parley-pending parley-pending-picture' : 'parley-pending');
            if (url) {
                /* A tap opens it large, to draw on it and say something about it alone. */
                const open2 = el('button', 'parley-pending-open'); open2.type = 'button';
                open2.title = said(words, 'draw-open', { name: file.name }); open2.setAttribute('aria-label', open2.title);
                const img = el('img'); img.src = (mark?.drawn && previewOf(mark.drawn)) || url; img.alt = file.name; open2.append(img);
                if (mark && (mark.drawn || mark.note)) { const badge = el('span', 'parley-pending-marked'); badge.append(icon('pencil', 'parley-sign')); badge.title = mark.note || said(words, 'draw-marked'); open2.append(badge); chip.dataset.marked = 'true'; }
                open2.addEventListener('click', async () => {
                    const got = await drawer.edit(file, url, mark ?? {});
                    if (got && pending.includes(file)) { if (got.drawn || got.note) marks.set(file, got); else marks.delete(file); paintPending(); }
                });
                chip.append(open2);
            }
            else { const about = el('span', 'parley-card-about'); about.append(el('span', 'parley-name', file.name), kindLine(file.name, sizeText(file.size))); chip.append(fileGlyph(file.name), about); }
            const x = button('\u00d7', 'parley-unattach', () => { pending = pending.filter((_, j) => j !== i); paintPending(); stayIn(); });
            x.title = said(words, 'remove-file', { name: file.name }); x.setAttribute('aria-label', x.title);
            chip.append(x);
            return chip;
        }));
    };
    /* Files from the button, pasted, or dropped: the same way, the same limits. */
    const add = (files) => { if (!attach?.upload) return; const list = [...files].filter((f) => f && typeof f.name === 'string'); if (!list.length) return; pending = [...pending, ...list].slice(0, FILES_MAX); paintPending(); };
    /* A PICTURE OF THE CHAT, DRAWN ON AND SENT AGAIN: taken from where it is shown, opened in the
       same drawing, then waiting in the box as any picture attached -- its note says where it came
       from, and the message answers the one it was in. Cancelled, nothing is attached. */
    const drawAgain = async (item) => {
        if (!attach?.upload || pending.length >= FILES_MAX) return;
        let blob;
        try { const r = await fetch(item.url); if (!r.ok) throw new Error(String(r.status)); blob = await r.blob(); } catch (error) { problem.textContent = said(words, 'not-sent', { error: String(error?.message ?? error) }); problem.hidden = false; return; }
        if (!/^image\/(png|jpeg|gif|webp)$/.test(blob.type)) return;
        const name = String(item.name || 'picture').replace(/[\\/]/g, '_') || 'picture';
        const file = new File([blob], /\.[A-Za-z0-9]{1,5}$/.test(name) ? name : `${name}.${blob.type === 'image/jpeg' ? 'jpg' : blob.type.slice(6)}`, { type: blob.type });
        pending = [...pending, file]; paintPending();
        const url = previewOf(file);
        const got = url ? await drawer.edit(file, url, {}) : null;
        if (!got || (!got.drawn && !got.note)) { pending = pending.filter((f) => f !== file); paintPending(); return; }
        const source = said(words, 'drawn-from', { name: item.title || item.name || name });
        marks.set(file, { ...got, note: cut(got.note ? `${got.note} (${source})` : source, 500) });
        const from = item.from ? latestItems().find((i) => i.id === item.from) : null;
        if (from && send) { replyTo = { id: from.id, text: cut(from.short || from.text || from.file?.name || name, 90), auto: false }; dismissed.delete(from.id); paintReply(); }
        paintPending(); focusBox();
    };
    zoom.annotate = attach?.upload ? drawAgain : null;

    /* Emptied once sent. A keyboard's own dictation (a tablet's, a phone's) may still be composing the words when
       Send is touched: it puts them back as it ends. What comes back within a moment and is what was sent (or
       begins with it) is taken out again -- once; anything typed after it stays. */
    const clearBox = (text) => {
        box.value = ''; grow();
        const until = Date.now() + 1500;
        const off = () => { box.removeEventListener('input', again); box.removeEventListener('compositionend', again); };
        function again() {
            if (Date.now() > until) { off(); return; }
            const now = box.value.trim();
            if (!now) return;
            if (now === text || text.startsWith(now)) { box.value = ''; grow(); off(); }
            else if (now.startsWith(text)) { box.value = now.slice(text.length).trimStart(); grow(); off(); }
        }
        box.addEventListener('input', again); box.addEventListener('compositionend', again);
        setTimeout(off, 1600);
    };
    const sendBox = async () => {
        const text = box.value.trim();
        if ((!text && pending.length === 0) || uploading) return;
        const answers = replyTo?.id;
        const about = replyTo?.about ? { about: replyTo.about } : {};
        const answered = () => { if (replyTo && replyTo.id === answers) { dismissed.add(answers); replyTo = null; paintReply(); } };
        const via = dictatedNow ? 'voice' : undefined;
        if (pending.length === 0) { clearBox(text); dictatedNow = false; if (await say(text, answers, undefined, via, about)) answered(); else dictatedNow = Boolean(via); return; }
        /* The files go first, one after the other; the message only once they all went. */
        uploading = true; go.disabled = clip.disabled = true;
        problem.hidden = false; problem.dataset.kind = 'sending'; problem.textContent = said(words, 'sending-files');
        const files = [];
        try {
            for (const file of pending) {
                const mark = marks.get(file); const sent2 = mark?.drawn ?? file;
                const up = await attach.upload(sent2, sent2.name);
                files.push(mark?.note ? { ...up, note: mark.note } : up);
            }
        } catch (error) {
            problem.dataset.kind = ''; problem.textContent = said(words, 'not-sent', { error: String(error?.message ?? error) });
            uploading = false; clip.disabled = false; paintGo();
            return;
        }
        problem.hidden = true; problem.dataset.kind = '';
        const sent = await say(text, answers, files, via, about);
        if (sent) dictatedNow = false;
        uploading = false; clip.disabled = false; paintGo();
        if (sent) { answered(); pending = []; paintPending(); if (box.value.trim() === text) clearBox(text); }
    };
    clip.addEventListener('click', () => { if (attach?.upload) picker.click(); });
    picker.addEventListener('change', () => { add(picker.files); picker.value = ''; });
    /* A picture pasted in the box (a screenshot) is attached, named by its time. */
    box.addEventListener('paste', (event) => {
        if (!attach?.upload) return;
        const data = event.clipboardData;
        const files = [...(data?.files ?? [])];
        if (!files.length) for (const item of data?.items ?? []) if (item.kind === 'file') { const f = item.getAsFile?.(); if (f) files.push(f); }
        if (!files.length) return;
        event.preventDefault();
        add(files.map((f) => { const name = pastedName(f); return name === f.name || typeof File !== 'function' ? f : new File([f], name, { type: f.type }); }));
    });
    /* Files dropped anywhere on the chat; where they can be dropped is said while they are carried. */
    let carried = 0;
    const carrying = (event) => attach?.upload && [...(event.dataTransfer?.types ?? [])].includes('Files');
    root.addEventListener('dragenter', (event) => { if (!carrying(event)) return; event.preventDefault(); carried += 1; dropZone.hidden = false; });
    root.addEventListener('dragover', (event) => { if (!carrying(event)) return; event.preventDefault(); if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'; });
    root.addEventListener('dragleave', (event) => { if (!carrying(event)) return; carried = Math.max(0, carried - 1); if (carried === 0) dropZone.hidden = true; });
    root.addEventListener('drop', (event) => { if (!carrying(event)) return; event.preventDefault(); carried = 0; dropZone.hidden = true; add(event.dataTransfer.files); });
    /* ---- dictation ---- */
    let voice = speaking?.listen ? speaking : null;
    let starting = false;
    let hearing = '';
    let auto = autoSend === true;
    let autoTimer;
    let writing = null;
    let hush;
    let gone = false;
    /* What the microphone does, said in the box: shown, and told. */
    const tell = (state, text) => { heard.hidden = false; heard.dataset.state = state; heardText.textContent = text; heardSaid.textContent = text; };
    const paintVoice = () => {
        const on = Boolean(stopping);
        mic.hidden = !voice;
        dictation.hidden = !voice;
        autoOff.hidden = auto;
        mic.setAttribute('aria-pressed', String(on));
        mic.dataset.state = on ? hearing || 'listening' : '';
        mic.dataset.auto = String(auto);
        const label = said(words, on ? 'mic-stop' : 'mic');
        mic.title = auto ? `${label} - ${said(words, 'auto-on')}` : label; mic.setAttribute('aria-label', mic.title);
        autoButton.setAttribute('aria-pressed', String(auto));
        field.dataset.voice = form.dataset.voice = on ? hearing || 'listening' : '';
        paintGo(); paintSuggest();
        box.placeholder = said(words, on ? 'voice-placeholder' : 'placeholder');
        if (on) tell(hearing || 'listening', writing ? said(words, 'voice-wait') : said(words, `voice-${hearing || 'listening'}`));
        else if (!hush) { heard.hidden = true; heard.dataset.state = ''; heardSaid.textContent = ''; }
    };
    const sendWritten = () => { clearTimeout(writing); writing = null; void sendBox(); paintVoice(); };
    const quiet = () => {
        const was = stopping; stopping = null;
        try { was?.(); } catch { /* the application's business */ }
        clearTimeout(autoTimer);
        if (writing) sendWritten();
        hearing = ''; paintVoice();
    };
    const listened = {
        phrase: (text) => {
            if (!stopping) return;
            box.value = joined(box.value, text).slice(0, TEXT_MAX); grow();
            dictatedNow = true;
            box.scrollTop = box.scrollHeight;
            if (writing) { sendWritten(); return; }
            if (auto) { clearTimeout(autoTimer); autoTimer = setTimeout(() => void sendBox(), AUTO_SEND_MS); }
        },
        state: (word) => {
            if (!stopping) return;
            hearing = ['calibrating', 'listening', 'hearing', 'transcribing'].includes(word) ? word : 'listening';
            /* Nothing more to write: what is there goes. */
            if (writing && hearing === 'listening') { sendWritten(); return; }
            paintVoice();
        },
        speech: () => clearTimeout(autoTimer),
        error: (message) => { if (stopping) tell('error', String(message ?? '')); },
    };
    mic.addEventListener('click', async () => {
        /* Speaking on a touch screen: the keyboard goes away, and stays away. */
        if (touching && document.activeElement === box) box.blur();
        if (stopping) { quiet(); stayIn(); return; }
        if (starting || !voice) return;
        starting = true;
        clearTimeout(hush); hush = undefined;
        try {
            const closing = await voice.listen(listened);
            /* Taken off the page while the microphone was opening: it is closed at once. */
            if (gone) { try { closing?.(); } catch { /* as above */ } return; }
            stopping = typeof closing === 'function' ? closing : () => {};
            hearing = hearing || 'calibrating';
        } catch {
            stopping = null;
            tell('error', said(words, 'voice-off'));
            hush = setTimeout(() => { hush = undefined; paintVoice(); }, 6000);
        }
        starting = false;
        paintVoice();
        stayIn();
    });
    autoButton.addEventListener('click', () => {
        auto = !auto;
        if (!auto) clearTimeout(autoTimer);
        try { onAutoSend?.(auto); } catch { /* the application's business */ }
        paintVoice(); stayIn();
    });
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        clearTimeout(autoTimer);
        /* Send pressed while a phrase is still being heard or written: it goes with it. */
        if (stopping && (hearing === 'hearing' || hearing === 'transcribing')) {
            if (!writing) writing = setTimeout(sendWritten, WRITE_WAIT_MS);
            paintVoice(); stayIn();
            return;
        }
        void sendBox();
        stayIn();
    });
    /* ---- what was sent, again: ↑ on the first line of the box brings back the messages sent before, ↓ on its
       last line comes back down to what was being written (as in a terminal) ---- */
    let recallAt = -1;
    let recallDraft = '';
    const recallTo = (text) => { box.value = text; box.selectionStart = box.selectionEnd = text.length; grow(); paintSuggest(); };
    box.addEventListener('input', (event) => { if (event.isTrusted) recallAt = -1; paintSuggest(); });
    /* The newest reply the agent suggested, if nothing was written to it since. */
    function paintSuggest() {
        const all = Array.isArray(latest?.messages) ? latest.messages : [];
        let offer = '';
        for (let i = all.length - 1; i >= 0; i--) {
            const m = all[i];
            if (!m || m.from === 'person') break;
            if (m.from === 'agent' && typeof m.suggest === 'string' && m.suggest.trim()) { offer = m.suggest.trim(); break; }
        }
        suggestion = offer;
        const show = Boolean(offer) && !box.value && !stopping && Boolean(send);
        if (suggestRow.hidden === !show && suggestRow.dataset.text === offer) return;
        suggestRow.hidden = !show; suggestRow.dataset.text = offer;
        suggestRow.replaceChildren(el('span', 'parley-suggest-label', said(words, 'suggestion')), el('span', 'parley-suggest-text', offer), el('kbd', 'parley-suggest-key', 'Tab'));
        suggestRow.title = said(words, 'suggest-take'); suggestRow.setAttribute('aria-label', `${said(words, 'suggestion')} : ${offer}. ${said(words, 'suggest-take')}`);
    }
    const takeSuggestion = () => { if (!suggestion) return; recallTo(suggestion); focusBox(); };
    suggestRow.addEventListener('click', takeSuggestion);
    box.addEventListener('keydown', (event) => {
        if (sends(event, enter, keyboard)) { event.preventDefault(); recallAt = -1; form.requestSubmit(); return; }
        if (event.key === 'Tab' && !event.shiftKey && !box.value && suggestion && !suggestRow.hidden) { event.preventDefault(); takeSuggestion(); return; }
        const r = recalled(event, box, recallAt, (latest?.messages ?? []).filter((m) => m && m.from === 'person' && typeof m.text === 'string' && m.text.trim()).map((m) => m.text));
        if (!r) return;
        event.preventDefault();
        if (recallAt < 0) recallDraft = box.value;
        recallAt = r.at;
        recallTo(r.at < 0 ? recallDraft : r.text);
    });
    /* ---- the quick answers ---- */
    let replies = Array.isArray(ready) ? ready : [];
    let quickShown = '';
    let quickOpen = false;
    const fold = () => {
        quickRow.dataset.open = String(quickOpen);
        chips.style.maxHeight = '';
        /* Those shown: the choices of the question are not, while its own buttons are in sight. */
        const kids = [...chips.children].filter((k) => !(quickRow.dataset.choices === 'seen' && k.classList.contains('parley-answer')));
        quickRow.dataset.empty = String(kids.length === 0);
        if (kids.length === 0) { moreChips.hidden = true; return; }
        const line = kids[0].getBoundingClientRect();
        const below = kids.filter((k) => k.getBoundingClientRect().top > line.top + line.height / 2).length;
        moreChips.hidden = below === 0 && !quickOpen;
        moreChips.setAttribute('aria-expanded', String(quickOpen));
        moreChips.textContent = quickOpen ? said(words, 'replies-less') : said(words, 'replies-more', { count: below });
        /* Folded: the first line alone, measured, so that it follows the size of the text. */
        if (!quickOpen && below > 0) chips.style.maxHeight = `${Math.ceil(line.height) + 2}px`;
    };
    moreChips.addEventListener('click', () => { quickOpen = !quickOpen; fold(); stayIn(); });
    const use = (q) => {
        if (q.send) {
            if (q.kind === 'choice') for (const b of chips.querySelectorAll('.parley-answer')) b.disabled = true;
            void say(q.text, q.kind === 'choice' ? q.answers : undefined);
        } else {
            box.value = joined(box.value, q.text).slice(0, TEXT_MAX); grow();
            focusBox();
            box.setSelectionRange?.(box.value.length, box.value.length);
        }
        stayIn();
    };
    function paintQuick() {
        const list = quick(latest, replies);
        const mark = JSON.stringify(list);
        if (mark === quickShown) return;
        quickShown = mark;
        chips.replaceChildren(...list.map((q) => {
            const b = button(q.label, q.kind === 'choice' ? 'parley-answer' : 'parley-reply', () => use(q));
            b.dataset.send = String(q.send);
            if (q.kind === 'reply' && q.text !== q.label) b.title = q.text;
            return b;
        }));
        quickRow.hidden = list.length === 0;
        if (!quickRow.hidden) fold();
    }
    const watchQuick = typeof ResizeObserver === 'function' ? new ResizeObserver(() => { if (!quickRow.hidden) fold(); }) : null;
    watchQuick?.observe(quickRow);
    /* The choices of the question it asks are near the thumb when its own
       buttons have scrolled away (or a keyboard took the room), and only then:
       never twice on the screen. */
    const seeing = typeof IntersectionObserver === 'function'
        ? new IntersectionObserver((entries) => { for (const e of entries) quickRow.dataset.choices = e.isIntersecting ? 'seen' : ''; if (!quickRow.hidden) fold(); }, { root: thread, threshold: 0.5 })
        : null;
    const watchChoices = () => {
        if (!seeing) return;
        seeing.disconnect();
        const asked = [...thread.querySelectorAll('.parley-choices')].at(-1);
        /* Until it is seen again, as it was: no flicker when the page is drawn again. */
        if (asked) seeing.observe(asked); else quickRow.dataset.choices = '';
    };
    paintVoice();
    paintQuick();
    /* What it does now stops moving once it is old: looked at again now and then, data or not. */
    const timer = every > 0 ? setInterval(() => { if (!document.hidden) void refresh(); }, every) : null;
    const loaded = refresh();
    return {
        refresh,
        get view() { return as; }, set view(v) { if (VIEWS.includes(v)) choose(v); },
        get voice() { return voice; }, set voice(v) { if (!v?.listen) quiet(); voice = v?.listen ? v : null; paintVoice(); },
        search: openSearch,
        get replies() { return replies; }, set replies(list) { replies = Array.isArray(list) ? list : []; paintQuick(); },
        get listening() { return Boolean(stopping); },
        get attach() { return attach; }, set attach(a) { attach = a?.upload ? a : undefined; clip.hidden = !attach; if (!attach) { pending = []; paintPending(); } },
        /* What is open over the thread, closed (the page shows something else now). */
        closeLayers,
        /* One message shown, at its place in the thread (brought when it is further back): true when shown. */
        reveal,
        /* The panel beside the thread: its list given again (null: no panel). */
        get side() { return side; }, set side(given) { setSide(given); },
        get folded() { return panel ? (beside() ? panelFolded : !panelSheet) : true; }, set folded(v) { panelFolded = Boolean(v); if (panelFolded && panelSheet) showSheet(false); placePanel(); },
        get layers() { return steps.open; },
        destroy() { steps.destroy(); gone = true; quiet(); letGo([]); for (const u of urls) try { URL.revokeObjectURL(u); } catch { /* gone */ } document.removeEventListener('pointerdown', away); document.removeEventListener('pointerdown', awayFromSheet); clearTimeout(hush); if (timer) clearInterval(timer); clearTimeout(hiding); watch?.disconnect(); settle?.disconnect(); watchQuick?.disconnect(); seeing?.disconnect(); root.replaceChildren(); root.classList.remove('parley'); delete root.dataset.view; delete root.dataset.panel; },
    };
}
