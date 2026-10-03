<?php
declare(strict_types=1);

// Usage: php tests/run.php            all tests
//        php tests/run.php scanner    only tests/test_scanner*.php

require __DIR__ . '/../blunt/lib.php';
require __DIR__ . '/helpers.php';

$filter = $argv[1] ?? '';
foreach (glob(__DIR__ . "/test_{$filter}*.php") ?: [] as $file) {
    require $file;
}

$passed = 0;
$failed = 0;
foreach (get_defined_functions()['user'] as $fn) {
    if (!str_starts_with($fn, 'test_')) {
        continue;
    }
    try {
        $fn();
        $passed++;
        echo '.';
    } catch (Throwable $e) {
        $failed++;
        echo "\nFAIL $fn\n  " . str_replace("\n", "\n  ", $e->getMessage()) . "\n";
    }
}
echo "\n$passed passed, $failed failed\n";
exit($failed > 0 ? 1 : 0);
