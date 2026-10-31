<?php
/* An example site with Guichets: the relay under /guichet, a page with Parley's display.
 *   GUICHET_GUICHETS='{"help":{}}' GUICHET_RELAY_DIR=/tmp/guichet php -S 127.0.0.1:4300 example/index.php
 *   php example/token.php help "my engine"        # the engine's token, then:
 *   GUICHET_TOKEN=gch_… guichet --relay http://127.0.0.1:4300/guichet/help
 * Parley's display (parley-ui.js, parley-icons.js, parley-ui.css, texts/) is copied under example/parley/. */
require __DIR__ . '/relay.php';

$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
if (str_starts_with($path, '/guichet/')) {
    if (example_relay()->handle($_SERVER['REQUEST_METHOD'], substr($path, strlen('/guichet')))) return true;
    http_response_code(404); return true;
}
if (str_starts_with($path, '/parley/')) {
    $file = realpath(__DIR__ . $path);
    if ($file && str_starts_with($file, realpath(__DIR__ . '/parley') ?: "\0")) {
        $types = ['js' => 'text/javascript', 'css' => 'text/css', 'json' => 'application/json', 'woff2' => 'font/woff2'];
        header('content-type: ' . ($types[pathinfo($file, PATHINFO_EXTENSION)] ?? 'application/octet-stream'));
        readfile($file); return true;
    }
    http_response_code(404); return true;
}
if ($path === '/') { header('content-type: text/html; charset=utf-8'); readfile(__DIR__ . '/page.html'); return true; }
http_response_code(404); return true;
