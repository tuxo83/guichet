#!/bin/sh
# The plugin's checks without WordPress: every PHP file parses (PHP 8.1+), then the settings and
# limits test. The end-to-end check in a real WordPress is described in readme.txt (Testing).
set -e
cd "$(dirname "$0")/.."
for f in $(find . -name '*.php' -not -path './.git/*'); do php -l "$f" >/dev/null || { echo "parse error: $f"; exit 1; }; done
echo "php -l: $(find . -name '*.php' -not -path './.git/*' | wc -l) files parse"
php tests/store-test.php
