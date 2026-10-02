<?php
declare(strict_types=1);

class AssertionFailed extends Exception {}

function assert_same(mixed $expected, mixed $actual, string $msg = ''): void
{
    if ($expected !== $actual) {
        throw new AssertionFailed(($msg !== '' ? "$msg\n" : '')
            . 'expected: ' . var_export($expected, true) . "\n"
            . 'actual:   ' . var_export($actual, true));
    }
}

function assert_true(bool $cond, string $msg = ''): void
{
    assert_same(true, $cond, $msg);
}

function assert_throws(callable $fn, string $contains = ''): void
{
    try {
        $fn();
    } catch (BluntError $e) {
        if ($contains !== '' && !str_contains($e->getMessage(), $contains)) {
            throw new AssertionFailed("message '{$e->getMessage()}' does not contain '$contains'");
        }
        return;
    }
    throw new AssertionFailed('expected a BluntError');
}

/** Builds a throwaway site folder and returns its path. */
function make_site(): string
{
    $root = sys_get_temp_dir() . '/blunt-site-' . bin2hex(random_bytes(4));
    $files = [
        'index.html' => '<p>i</p>',
        'sub/page.html' => '<p>s</p>',
        '.hidden/x.html' => 'h',
        'blunt/x.html' => 'b',
        'css/tokens.css' => ':root { --a: 1px; }',
        'notes.txt' => 'n',
    ];
    foreach ($files as $rel => $content) {
        $path = "$root/$rel";
        if (!is_dir(dirname($path))) {
            mkdir(dirname($path), 0777, true);
        }
        file_put_contents($path, $content);
    }
    file_put_contents(dirname($root) . '/blunt-outside.html', 'o');
    return $root;
}
