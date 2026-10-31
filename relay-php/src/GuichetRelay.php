<?php
/* GUICHET RELAY for PHP (protocol v1, see the engine's PROTOCOL.md). Mounted in a website: the site
 * says who the visitor is; one thread per person; engines poll it from wherever they run. Several
 * guichets side by side, each with its own folder, settings, limits and engine tokens. Plain files
 * (no database), each change under a lock. No dependency beyond PHP 8.1's defaults (no mbstring).
 *
 *   require 'GuichetRelay.php';
 *   $relay = new GuichetRelay([
 *       'dir'      => '/var/lib/guichet',                       // outside the web root
 *       'guichets' => ['help' => ['name' => 'Help desk']],      // or fn (string $id): ?array
 *       'identify' => fn (string $guichet) => isset($_SESSION['user']) ? ['id' => $_SESSION['user']['id']] : null,
 *   ]);
 *   $relay->handle($_SERVER['REQUEST_METHOD'], $pathAfterBase);  // '/help/messages', '/help/engine/poll'…
 *   $relay->createToken('help', 'main server');                  // the engine's token, shown once
 *
 * Single-guichet mode (as in 0.1): 'guichet' => 'main' and 'token' => a shared secret; the paths are
 * then '/messages', '/engine/poll'… without the id.
 *
 * Options: dir (required), guichets, identify (for handle(); respond() is given `who` instead),
 * ip (fn: the visitor's address, REMOTE_ADDR by default), timezone (of the hour/day windows),
 * pollSeconds (25: lower it where a PHP worker held that long is costly), journal (callable, one
 * array per event), now. A guichet's settings: see DEFAULTS. */
final class GuichetRelay
{
    public const VERSION = '0.2.1';
    private const OPEN_SECONDS = 60;
    private const SEEN_SECONDS = 10;
    private const ID = '/^[a-z0-9][a-z0-9-]{0,62}$/';
    /* A limit: per window (hour|day), what is counted (questions|chars), the most allowed per visitor
     * address (ip), per account (account: what identify() said) and for the whole guichet (total).
     * null or '' = no limit for that scope. */
    public const DEFAULTS = [
        'lang' => 'fr',
        'limits' => [
            ['what' => 'questions', 'window' => 'hour', 'ip' => 10, 'account' => 30, 'total' => 300],
            ['what' => 'questions', 'window' => 'day', 'ip' => 40, 'account' => 100, 'total' => 500],
            ['what' => 'chars', 'window' => 'day', 'ip' => 60000, 'account' => 150000, 'total' => 2000000],
        ],
        'maxQuestion' => 2000, 'maxAnswer' => 8000, 'answerSeconds' => 180, 'oneAtATime' => true,
        'historyKept' => 50, 'historySent' => 6,
        'journal' => false, 'journalText' => false,   // journal.jsonl in the guichet's folder; the text of questions only if asked
        'tone' => '',   // the answers' writing style in free text (engine 0.2.0+), sent with each question; '' = the engine's own
    ];
    private const SAID = [
        'fr' => ['late' => "Le Guichet n'a pas pu répondre à temps. Réessayez.", 'cut' => '*(Réponse coupée : trop longue.)*', 'sources' => 'Sources :'],
        'en' => ['late' => 'The Guichet could not answer in time. Try again.', 'cut' => '*(Answer cut: too long.)*', 'sources' => 'Sources:'],
    ];
    private array $o;

    public function __construct(array $options)
    {
        $this->o = $options + ['guichets' => [], 'guichet' => null, 'token' => null, 'identify' => null, 'ip' => null, 'timezone' => null, 'pollSeconds' => 25, 'journal' => null, 'now' => null];
        if (empty($this->o['dir'])) throw new InvalidArgumentException('guichet-relay: dir is needed (where threads are kept)');
        if ($this->o['token'] !== null && strlen((string) $this->o['token']) < 24) throw new InvalidArgumentException('guichet-relay: a token of 24 characters at least is needed');
        if ($this->o['guichet'] !== null && !preg_match(self::ID, (string) $this->o['guichet'])) throw new InvalidArgumentException('guichet-relay: a guichet id is a-z, 0-9 and -');
        if (!is_dir($this->o['dir'])) mkdir($this->o['dir'], 0700, true);
    }

    private function now(): float { return $this->o['now'] ? ($this->o['now'])() : microtime(true); }
    private function iso(float $t): string { return gmdate('Y-m-d\TH:i:s', (int) $t) . sprintf('.%03dZ', (int) (($t - floor($t)) * 1000)); }
    private static function uuid(): string { $b = random_bytes(16); $b[6] = chr(ord($b[6]) & 0x0f | 0x40); $b[8] = chr(ord($b[8]) & 0x3f | 0x80); return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($b), 4)); }
    /* Characters, not bytes, without the mbstring extension (not everywhere). */
    private static function chars(string $s): int { return (int) preg_match_all('/./su', $s); }
    private static function cut(string $s, int $n): string { return preg_match('/^.{0,' . $n . '}/su', $s, $m) ? $m[0] : ''; }
    private static function said(array $set, string $k): string { return (self::SAID[$set['lang']] ?? self::SAID['fr'])[$k]; }

    /* ---------- guichets: their settings (from the site), their folder (ours) ---------- */
    /* The settings of a guichet, over the defaults; null when the site does not know it. */
    public function settings(string $gid): ?array
    {
        if (!preg_match(self::ID, $gid)) return null;
        if ($this->o['guichet'] !== null) {
            if ($gid !== $this->o['guichet']) return null;
            /* 0.1's options still mean what they meant. */
            $old = array_intersect_key($this->o, array_flip(['historyKept', 'historySent', 'answerSeconds']));
            if (isset($this->o['maxText'])) $old['maxQuestion'] = (int) $this->o['maxText'];
            if (isset($this->o['perHour'])) $old['limits'] = [['what' => 'questions', 'window' => 'hour', 'account' => (int) $this->o['perHour']]];
            return ($this->o['settings'] ?? []) + $old + self::DEFAULTS;
        }
        $g = is_callable($this->o['guichets']) ? ($this->o['guichets'])($gid) : ($this->o['guichets'][$gid] ?? null);
        return is_array($g) ? $g + self::DEFAULTS : null;
    }
    private function dir(string $gid, string $sub = ''): string
    {
        $d = $this->o['dir'] . '/guichets/' . $gid;
        if (!is_dir("$d/threads")) mkdir("$d/threads", 0700, true);
        return $sub === '' ? $d : "$d/$sub";
    }
    /* A guichet removed by the site: its threads, tokens and counters go too. */
    public function forget(string $gid): void
    {
        if (!preg_match(self::ID, $gid)) return;
        $d = $this->o['dir'] . '/guichets/' . $gid;
        if (!is_dir($d)) return;
        foreach (new RecursiveIteratorIterator(new RecursiveDirectoryIterator($d, FilesystemIterator::SKIP_DOTS), RecursiveIteratorIterator::CHILD_FIRST) as $f) $f->isDir() ? rmdir($f->getPathname()) : unlink($f->getPathname());
        rmdir($d);
    }

    /* ---------- storage: a JSON file changed under an exclusive lock ---------- */
    /* Runs $fn on the file's data; what it returns is returned, the data it leaves is kept. */
    private static function locked(string $file, array $empty, callable $fn)
    {
        $f = fopen($file, 'c+');
        flock($f, LOCK_EX);
        try {
            $data = json_decode(stream_get_contents($f) ?: '', true) ?: $empty;
            $before = json_encode($data);
            $out = $fn($data);
            $after = json_encode($data);
            if ($after !== $before) { ftruncate($f, 0); rewind($f); fwrite($f, $after); fflush($f); }
            return $out;
        } finally { flock($f, LOCK_UN); fclose($f); }
    }
    private function state(string $gid, callable $fn) { return self::locked($this->dir($gid, 'state.json'), ['queue' => [], 'waiting' => [], 'lastPoll' => 0, 'counts' => [], 'days' => []], $fn); }
    private function threadFile(string $gid, string $who): string { return $this->dir($gid, 'threads/' . substr(hash('sha256', $who), 0, 32) . '.json'); }
    private function thread(string $gid, string $who): array { $raw = @file_get_contents($this->threadFile($gid, $who)); return json_decode($raw ?: '', true) ?: ['messages' => []]; }
    private function keep(string $gid, string $who, array $t): void { $f = $this->threadFile($gid, $who); file_put_contents("$f.tmp", json_encode($t), LOCK_EX); rename("$f.tmp", $f); }
    private function add(string $gid, array $set, string $who, array $m): void { $t = $this->thread($gid, $who); $t['messages'][] = $m; $t['messages'] = array_slice($t['messages'], -$set['historyKept'] * 2); $this->keep($gid, $who, $t); }

    /* Each event to the site's callable, and, when the guichet keeps a journal, to its journal.jsonl
     * (cut to its last 5000 lines past 2 MB, so it never fills a small host). */
    private function journal(string $gid, array $set, array $line): void
    {
        $line = ['guichet' => $gid] + $line;
        if (is_callable($this->o['journal'])) ($this->o['journal'])($line);
        if (!$set['journal']) return;
        $f = $this->dir($gid, 'journal.jsonl');
        file_put_contents($f, json_encode($line, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n", FILE_APPEND | LOCK_EX);
        if (@filesize($f) > 2_000_000) { $all = file($f); file_put_contents($f, implode('', array_slice($all, -5000)), LOCK_EX); }
    }
    /* The newest lines of the journal, newest first. */
    public function journalLines(string $gid, int $n = 200): array
    {
        if (!$this->settings($gid)) return [];
        $all = @file($this->dir($gid, 'journal.jsonl'), FILE_IGNORE_NEW_LINES) ?: [];
        return array_reverse(array_values(array_filter(array_map(fn ($l) => json_decode($l, true), array_slice($all, -$n)))));
    }

    /* A day's numbers, for the site's screens: asked, answered, late, seconds (summed). */
    private function count(array &$s, string $k, float $add = 1): void
    {
        $day = $this->clock($this->now())->format('Y-m-d');
        $s['days'][$day][$k] = ($s['days'][$day][$k] ?? 0) + $add;
        if (count($s['days']) > 31) $s['days'] = array_slice($s['days'], -31, null, true);
    }

    /* A question unanswered too long: said so, and dropped. One taken but not answered goes back. */
    private function sweep(string $gid, array $set, array &$s): void
    {
        $now = $this->now();
        foreach ($s['waiting'] as $id => $w) {
            if ($now - $w['at'] > $set['answerSeconds']) {
                unset($s['waiting'][$id]);
                $s['queue'] = array_values(array_filter($s['queue'], fn ($q) => $q['id'] !== $id));
                $this->add($gid, $set, $w['thread'], ['id' => self::uuid(), 'at' => $this->iso($now), 'from' => 'agent', 'kind' => 'say', 'text' => self::said($set, 'late')]);
                $this->count($s, 'late');
                $this->journal($gid, $set, ['at' => $this->iso($now), 'who' => $w['thread'], 'question' => $id, 'outcome' => 'timeout']);
            }
        }
        foreach ($s['queue'] as &$q) if ($q['takenAt'] && $now - $q['takenAt'] > $set['answerSeconds']) $q['takenAt'] = 0;
        foreach ($s['counts'] as $k => $c) if ($c[1] <= $now) unset($s['counts'][$k]);
    }

    /* ---------- limits: fixed windows (the clock's hour, the site's day), so "next question at 15:00" ---------- */
    private function clock(float $t): DateTimeImmutable { return (new DateTimeImmutable('@' . (int) $t))->setTimezone(new DateTimeZone($this->o['timezone'] ?: date_default_timezone_get())); }
    private function window(string $w): array
    {
        $now = $this->clock($this->now());
        $start = $w === 'day' ? $now->setTime(0, 0) : $now->setTime((int) $now->format('H'), 0);
        return [$start->getTimestamp(), $start->modify($w === 'day' ? '+1 day' : '+1 hour')->getTimestamp()];
    }
    /* Each limit that applies to this visitor: its counter's key, how much is used, the most, when it ends. */
    private function meters(array $set, array $s, string $who, ?string $ip): array
    {
        $out = [];
        foreach ($set['limits'] as $l) {
            if (!in_array($l['window'] ?? '', ['hour', 'day'], true) || !in_array($l['what'] ?? '', ['questions', 'chars'], true)) continue;
            [$start, $end] = $this->window($l['window']);
            foreach (['account' => $who, 'ip' => $ip, 'total' => ''] as $scope => $v) {
                if (!isset($l[$scope]) || $l[$scope] === '' || $v === null) continue;
                /* Hashed: the state file holds no address nor account. */
                $k = "{$l['what']}|{$l['window']}|$start|$scope|" . substr(hash('sha256', $v), 0, 16);
                $out[] = ['key' => $k, 'what' => $l['what'], 'window' => $l['window'], 'scope' => $scope, 'used' => $s['counts'][$k][0] ?? 0, 'max' => (int) $l[$scope], 'until' => $end];
            }
        }
        return $out;
    }
    /* What the chat shows ("8 / 30 cette heure"): the question limit with the least left. */
    private function quota(array $meters): ?array
    {
        $best = null;
        foreach ($meters as $m) if ($m['what'] === 'questions' && ($best === null || $m['max'] - $m['used'] < $best['max'] - $best['used'])) $best = $m;
        $blocked = array_values(array_filter($meters, fn ($m) => $m['used'] >= $m['max']));
        if ($blocked) $best = $blocked[0];
        return $best ? ['used' => $best['used'], 'max' => $best['max'], 'what' => $best['what'], 'window' => $best['window'], 'scope' => $best['scope'], 'retryAt' => $blocked ? $this->iso($best['until']) : null] : null;
    }

    /* ---------- engine tokens: several per guichet, only their hash kept ---------- */
    private function tokenFile(string $gid): string { return $this->dir($gid, 'tokens.json'); }
    /* A new token: returned once, never again. */
    public function createToken(string $gid, string $label): array
    {
        if (!$this->settings($gid)) throw new InvalidArgumentException('guichet-relay: unknown guichet');
        $abc = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
        $token = 'gch_'; for ($i = 0; $i < 32; $i++) $token .= $abc[random_int(0, strlen($abc) - 1)];
        $t = ['id' => substr(self::uuid(), 0, 8), 'label' => self::cut(trim($label), 80) ?: 'engine', 'sha256' => hash('sha256', $token), 'hint' => substr($token, -4),
            'created' => $this->iso($this->now()), 'lastSeen' => null, 'engine' => null, 'version' => null, 'revoked' => null];
        self::locked($this->tokenFile($gid), [], function (&$all) use ($t) { $all[] = $t; });
        return ['token' => $token] + $t;
    }
    public function revokeToken(string $gid, string $tid): bool
    {
        if (!$this->settings($gid)) return false;
        return self::locked($this->tokenFile($gid), [], function (&$all) use ($tid) {
            foreach ($all as &$t) if ($t['id'] === $tid && !$t['revoked']) { $t['revoked'] = $this->iso($this->now()); return true; }
            return false;
        });
    }
    /* The tokens, without their hash. */
    public function tokens(string $gid): array
    {
        if (!$this->settings($gid)) return [];
        return array_map(fn ($t) => array_diff_key($t, ['sha256' => 1]), json_decode(@file_get_contents($this->tokenFile($gid)) ?: '[]', true) ?: []);
    }
    /* Which token this is (its id; 'shared' for the single mode's), or null. Every hash is compared,
     * in constant time, so the answer's timing tells nothing. Seen, engine and version are noted at
     * most every 10 s, not at each poll. */
    private function engineOf(string $gid, ?string $token, array $body): ?string
    {
        $token = trim((string) $token);
        if ($token === '') return null;
        $h = hash('sha256', $token); $found = null;
        if ($this->o['token'] !== null && $gid === $this->o['guichet'] && hash_equals(hash('sha256', (string) $this->o['token']), $h)) $found = 'shared';
        foreach (json_decode(@file_get_contents($this->tokenFile($gid)) ?: '[]', true) ?: [] as $t) if (!$t['revoked'] && hash_equals($t['sha256'], $h)) $found = $t['id'];
        if ($found === null || $found === 'shared') return $found;
        $now = $this->now();
        self::locked($this->tokenFile($gid), [], function (&$all) use ($found, $now, $body) {
            foreach ($all as &$t) if ($t['id'] === $found && ($t['lastSeen'] === null || $now - strtotime($t['lastSeen']) >= self::SEEN_SECONDS)) {
                $t['lastSeen'] = $this->iso($now);
                $t['engine'] = isset($body['engine']) ? self::cut((string) $body['engine'], 40) : $t['engine'];
                $t['version'] = isset($body['version']) ? self::cut((string) $body['version'], 20) : $t['version'];
            }
        });
        return $found;
    }

    /* ---------- what the site's screens show ---------- */
    public function isOpen(?string $gid = null): bool { return $this->status($gid ?? (string) $this->o['guichet'])['open']; }
    /* Open or not, since when, today's numbers, what waits, the tokens that work. */
    public function status(string $gid): array
    {
        $set = $this->settings($gid);
        if (!$set) return ['open' => false, 'lastPoll' => null, 'waiting' => 0, 'today' => [], 'tokens' => 0];
        $s = $this->state($gid, function (&$s) use ($gid, $set) { $this->sweep($gid, $set, $s); return $s; });
        return ['open' => $this->now() - $s['lastPoll'] < self::OPEN_SECONDS, 'lastPoll' => $s['lastPoll'] ? $this->iso($s['lastPoll']) : null, 'waiting' => count($s['waiting']),
            'today' => ($s['days'][$this->clock($this->now())->format('Y-m-d')] ?? []) + ['asked' => 0, 'answered' => 0, 'late' => 0, 'seconds' => 0],
            'tokens' => count(array_filter($this->tokens($gid), fn ($t) => !$t['revoked']))];
    }

    /* ---------- HTTP ---------- */
    /* From PHP's own request: who (identify), the address, the token, the body; then the answer sent. */
    public function handle(string $method, string $path): bool
    {
        [$gid] = $this->route($path);
        if ($gid === null) return false;
        $who = null;
        if (!str_contains($path, '/engine/')) { try { $who = is_callable($this->o['identify']) ? ($this->o['identify'])($gid) : null; } catch (Throwable) { $who = null; } }
        $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
        $raw = $method === 'POST' ? file_get_contents('php://input', false, null, 0, 1024 * 1024) : '';
        $body = $raw === '' || $raw === false ? [] : json_decode($raw, true);
        $out = $this->respond($method, $path, [
            'who' => $who,
            'ip' => is_callable($this->o['ip']) ? ($this->o['ip'])() : ($_SERVER['REMOTE_ADDR'] ?? null),
            /* Some hosts drop Authorization before PHP sees it: X-Guichet-Token says the same. */
            'token' => preg_match('/^Bearer\s+(.+)$/i', $auth, $m) ? $m[1] : ($_SERVER['HTTP_X_GUICHET_TOKEN'] ?? null),
            'body' => is_array($body) ? $body : null,
        ]);
        if ($out === null) return false;
        http_response_code($out[0]);
        header('content-type: application/json; charset=utf-8');
        header('cache-control: no-store');
        echo json_encode($out[1], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        return true;
    }
    /* [guichet id, the rest of the path], or [null] when the path is not one of ours. */
    private function route(string $path): array
    {
        if ($this->o['guichet'] !== null) return [$this->o['guichet'], $path];
        if (!preg_match('#^/([a-z0-9][a-z0-9-]{0,62})(/.*)$#', $path, $m) || !$this->settings($m[1])) return [null];
        return [$m[1], $m[2]];
    }

    /* The relay without PHP's globals (a framework's own request, WordPress's REST…). $req: who
     * (['id' => …] or null), ip, token, body (the decoded JSON; null when it was not JSON).
     * Returns [status, body], or null when the path is not the relay's. */
    public function respond(string $method, string $path, array $req = []): ?array
    {
        [$gid, $rest] = $this->route($path) + [null, null];
        if ($gid === null) return null;
        $set = $this->settings($gid);
        $this->state($gid, fn (&$s) => $this->sweep($gid, $set, $s));
        $body = array_key_exists('body', $req) ? $req['body'] : [];
        if (str_starts_with($rest, '/engine/')) return $this->engine($gid, $set, $method, $rest, $req['token'] ?? null, $body);
        if ($rest !== '/messages' && $rest !== '/say') return null;
        $who = $req['who'] ?? null;
        if (!$who || !isset($who['id']) || $who['id'] === '') return [401, ['error' => 'sign in first']];
        $id = (string) $who['id'];
        $ip = isset($req['ip']) && $req['ip'] !== '' ? (string) $req['ip'] : null;
        if ($rest === '/messages') {
            if ($method !== 'GET') return [405, ['error' => 'GET only']];
            [$open, $busy, $quota] = $this->state($gid, function (&$s) use ($id, $ip, $set) {
                $busy = null;
                foreach ($s['waiting'] as $w) if ($w['thread'] === $id) $busy = $w;
                return [$this->now() - $s['lastPoll'] < self::OPEN_SECONDS, $busy, $this->quota($this->meters($set, $s, $id, $ip))];
            });
            $t = $this->thread($gid, $id);
            $at = $busy ? $this->iso($busy['doingAt'] ?? $busy['at']) : (end($t['messages'])['at'] ?? $this->iso($this->now()));
            return [200, [
                'open' => $open,
                'messages' => $t['messages'],
                'steps' => $busy && $busy['doing'] !== '' ? [['id' => 'doing:' . ($busy['doingAt'] ?? 0), 'kind' => 'doing', 'note' => $busy['doing'], 'at' => $at]] : [],
                'status' => $busy ? ['state' => 'working', 'note' => $busy['doing'], 'at' => $at] : ['state' => 'waiting', 'note' => '', 'at' => $at],
                'quota' => $quota,
            ]];
        }
        if ($method !== 'POST') return [405, ['error' => 'POST only']];
        $text = trim((string) ($body['text'] ?? ''));
        return $this->state($gid, function (&$s) use ($gid, $set, $id, $ip, $text) {
            $now = $this->now();
            if ($now - $s['lastPoll'] >= self::OPEN_SECONDS) return [503, ['error' => 'the guichet is closed']];
            if ($text === '') return [400, ['error' => 'empty']];
            $len = self::chars($text);
            if ($len > $set['maxQuestion']) return [400, ['error' => "{$set['maxQuestion']} characters at most", 'max' => (int) $set['maxQuestion']]];
            if ($set['oneAtATime']) foreach ($s['waiting'] as $w) if ($w['thread'] === $id) return [429, ['error' => 'one question at a time']];
            $meters = $this->meters($set, $s, $id, $ip);
            foreach ($meters as $m) {
                if ($m['used'] + ($m['what'] === 'chars' ? $len : 1) > $m['max']) {
                    $this->journal($gid, $set, ['at' => $this->iso($now), 'who' => $id, 'outcome' => 'limit', 'limit' => "{$m['what']}/{$m['window']}/{$m['scope']}"]);
                    return [429, ['error' => "limit reached: {$m['max']} {$m['what']} per {$m['window']} ({$m['scope']})", 'retryAt' => $this->iso($m['until']), 'used' => $m['used'], 'max' => $m['max'], 'what' => $m['what'], 'window' => $m['window'], 'scope' => $m['scope']]];
                }
            }
            foreach ($meters as $m) $s['counts'][$m['key']] = [$m['used'] + ($m['what'] === 'chars' ? $len : 1), $m['until']];
            $t = $this->thread($gid, $id);
            $pairs = []; $says = array_values(array_filter($t['messages'], fn ($m) => $m['kind'] === 'say'));
            for ($i = 0; $i < count($says) - 1; $i++) if ($says[$i]['from'] === 'person' && $says[$i + 1]['from'] === 'agent') $pairs[] = ['q' => $says[$i]['text'], 'a' => $says[$i + 1]['text']];
            $q = ['id' => self::uuid(), 'at' => $this->iso($now), 'from' => 'person', 'kind' => 'say', 'text' => $text];
            $t['messages'][] = $q; $t['messages'] = array_slice($t['messages'], -$set['historyKept'] * 2);
            $this->keep($gid, $id, $t);
            $s['queue'][] = ['id' => $q['id'], 'thread' => $id, 'text' => $text, 'history' => array_slice($pairs, -$set['historySent']), 'takenAt' => 0];
            $s['waiting'][$q['id']] = ['thread' => $id, 'at' => $now, 'doing' => ''];
            $this->count($s, 'asked');
            $this->journal($gid, $set, ['at' => $q['at'], 'who' => $id, 'question' => $q['id'], 'outcome' => 'asked', 'chars' => $len] + ($set['journalText'] ? ['text' => $text] : []));
            return [200, ['ok' => true, 'id' => $q['id'], 'quota' => $this->quota($this->meters($set, $s, $id, $ip))]];
        });
    }

    private function engine(string $gid, array $set, string $method, string $path, ?string $token, ?array $body): array
    {
        if ($method !== 'POST') return [405, ['error' => 'POST only']];
        if ($this->engineOf($gid, $token, $body ?? []) === null) return [401, ['error' => 'not the engine']];
        if ($body === null) return [400, ['error' => 'not JSON']];
        if ($path === '/engine/poll') {
            /* The tone as the settings say now (not when the question was asked): one line, 300 characters at most. */
            $tone = self::cut(trim((string) preg_replace('/[\x00-\x1f\x7f\s]+/u', ' ', (string) ($set['tone'] ?? ''))), 300);
            $take = fn () => $this->state($gid, function (&$s) use ($tone) {
                $s['lastPoll'] = $this->now(); $got = [];
                foreach ($s['queue'] as &$q) if (!$q['takenAt']) { $q['takenAt'] = $this->now(); $got[] = ['id' => $q['id'], 'thread' => $q['thread'], 'text' => $q['text'], 'history' => $q['history']] + ($tone !== '' ? ['tone' => $tone] : []); }
                return $got;
            });
            $until = microtime(true) + $this->o['pollSeconds'];
            $got = $take();
            while (!$got && microtime(true) < $until && !connection_aborted()) { usleep(500_000); $got = $take(); }
            return [200, ['questions' => $got]];
        }
        $qid = (string) ($body['id'] ?? '');
        return $this->state($gid, function (&$s) use ($gid, $set, $path, $qid, $body) {
            $w = $s['waiting'][$qid] ?? null;
            if (!$w) return [404, ['error' => 'no such question waiting']];
            if ($path === '/engine/doing') { $s['waiting'][$qid]['doing'] = self::cut((string) ($body['text'] ?? ''), 200); $s['waiting'][$qid]['doingAt'] = $this->now(); return [200, ['ok' => true]]; }
            if ($path !== '/engine/answer') return [404, ['error' => 'unknown']];
            unset($s['waiting'][$qid]);
            $s['queue'] = array_values(array_filter($s['queue'], fn ($q) => $q['id'] !== $qid));
            /* Too long: cut, and said. The sources are kept on the message, and said in a last line
             * when the answer does not already name them (Parley shows the `code` as small chips). */
            $text = (string) ($body['text'] ?? '');
            $cut = self::chars($text) > $set['maxAnswer'];
            if ($cut) $text = rtrim(self::cut($text, (int) $set['maxAnswer'])) . "\n\n" . self::said($set, 'cut');
            $sources = array_values(array_slice(array_map(fn ($x) => self::cut((string) $x, 200), array_filter((array) ($body['sources'] ?? []), 'is_scalar')), 0, 20));
            if ($sources && !preg_match('/\bsources?\s*:/iu', $text)) $text .= "\n\n" . self::said($set, 'sources') . ' ' . implode(' · ', array_map(fn ($x) => '`' . str_replace('`', "'", $x) . '`', $sources));
            $this->add($gid, $set, $w['thread'], ['id' => self::uuid(), 'at' => $this->iso($this->now()), 'from' => 'agent', 'kind' => 'say', 'text' => $text, 'sources' => $sources] + ($cut ? ['cut' => true] : []));
            $seconds = round($this->now() - $w['at'], 1);
            $this->count($s, 'answered'); $this->count($s, 'seconds', $seconds);
            $this->journal($gid, $set, ['at' => $this->iso($this->now()), 'who' => $w['thread'], 'question' => $qid, 'outcome' => 'answered', 'seconds' => $seconds] + ($cut ? ['cut' => true] : []));
            return [200, ['ok' => true] + ($cut ? ['cut' => true] : [])];
        });
    }
}
