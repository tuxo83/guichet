<?php
/* The example's relay, shared by the site (index.php) and the command line (token.php).
 *   GUICHET_GUICHETS='{"help":{},"sales":{"lang":"en"}}'   several guichets, under /guichet/<id>/…
 *   GUICHET_TOKEN=…                                       or one guichet, under /guichet/…, with a shared token (as in 0.1)
 * GUICHET_RELAY_DIR: where the files go; GUICHET_POLL_SECONDS: how long a poll waits.
 * "Signing in" here is a name in a cookie: your site uses its own session instead. */
require __DIR__ . '/../src/GuichetRelay.php';

function example_relay(): GuichetRelay
{
    $common = [
        'dir' => getenv('GUICHET_RELAY_DIR') ?: sys_get_temp_dir() . '/guichet-relay',
        'identify' => fn () => isset($_COOKIE['who']) && $_COOKIE['who'] !== '' ? ['id' => $_COOKIE['who']] : null,
        /* The tests speak for several visitors from one address. */
        'ip' => fn () => $_SERVER['HTTP_X_TEST_IP'] ?? $_SERVER['REMOTE_ADDR'] ?? null,
        'timezone' => getenv('GUICHET_TIMEZONE') ?: 'UTC',
        'pollSeconds' => (int) (getenv('GUICHET_POLL_SECONDS') ?: 25),
        'journal' => fn ($line) => error_log(json_encode($line)),
    ];
    $many = json_decode((string) getenv('GUICHET_GUICHETS'), true);
    if (is_array($many)) return new GuichetRelay($common + ['guichets' => $many]);
    return new GuichetRelay($common + ['guichet' => 'main', 'token' => getenv('GUICHET_TOKEN')]);
}
