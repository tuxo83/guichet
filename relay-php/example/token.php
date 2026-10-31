<?php
/* A new engine token for a guichet, printed once:  php example/token.php <guichet> [label]
 * (with the same GUICHET_GUICHETS and GUICHET_RELAY_DIR as the site). Revoke: --revoke <guichet> <token id>. */
require __DIR__ . '/relay.php';
$relay = example_relay();
if (($argv[1] ?? '') === '--revoke') { echo $relay->revokeToken($argv[2] ?? '', $argv[3] ?? '') ? "revoked\n" : "no such token\n"; exit; }
$t = $relay->createToken($argv[1] ?? '', $argv[2] ?? 'engine');
echo json_encode(['id' => $t['id'], 'token' => $t['token']]), "\n";
