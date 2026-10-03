<?php
declare(strict_types=1);

function test_paths_resolves_pages_inside_root(): void
{
    $root = make_site();
    assert_same(realpath("$root/index.html"), blunt_resolve($root, 'index.html', 'html'));
    assert_same(realpath("$root/sub/page.html"), blunt_resolve($root, 'sub/page.html', 'html'));
    assert_same(realpath("$root/sub/page.html"), blunt_resolve($root, '/sub/page.html', 'html'));
    assert_same(realpath("$root/css/tokens.css"), blunt_resolve($root, 'css/tokens.css', 'css'));
}

function test_paths_rejects_unsafe_or_missing(): void
{
    $root = make_site();
    $bad = [
        '../blunt-outside.html',
        'sub/../../blunt-outside.html',
        '.hidden/x.html',
        'blunt/x.html',
        'BLUNT/x.html',
        'notes.txt',
        'missing.html',
        '',
        "index.html\0",
        'sub',
    ];
    foreach ($bad as $rel) {
        assert_same(null, blunt_resolve($root, $rel, 'html'), var_export($rel, true));
    }
    assert_same(null, blunt_resolve($root, 'index.html', 'css'));
}

function test_paths_relpath_uses_forward_slashes(): void
{
    $root = make_site();
    $full = blunt_resolve($root, 'sub/page.html', 'html');
    assert_same('sub/page.html', blunt_relpath($root, $full));
}
