<?php
declare(strict_types=1);

function prep(string $html, string $page = 'index.html', string $siteBase = ''): string
{
    $opts = ['siteBase' => $siteBase, 'cmsUrl' => $siteBase . '/blunt', 'boot' => ['x' => 1]];
    return blunt_prepare_page($html, $page, $opts + ['assets' => blunt_tier_assets(blunt_cms_dir(), 'light')]);
}

function test_page_resolve_link(): void
{
    assert_same(['path' => 'about.html', 'fragment' => '#team'], blunt_resolve_link('../about.html#team', 'sub/page.html', ''));
    assert_same(['path' => 'docs/index.html', 'fragment' => ''], blunt_resolve_link('docs/', 'index.html', ''));
    assert_same(['path' => 'index.html', 'fragment' => ''], blunt_resolve_link('/', 'sub/page.html', ''));
    assert_same(['path' => 'about.html', 'fragment' => ''], blunt_resolve_link('/site/about.html', 'index.html', '/site'));
    assert_same(['path' => 'my page.html', 'fragment' => ''], blunt_resolve_link('my%20page.html?x=1', 'index.html', ''));
    assert_same(['path' => 'sub/page.html', 'fragment' => ''], blunt_resolve_link('?q=1', 'sub/page.html', ''));
    foreach (['/other/about.html', '../../x.html', 'style.css', 'https://x.com/a.html', '#top', 'mailto:a@b.c', '//cdn.x/a.html', ''] as $href) {
        $site = $href === '/other/about.html' ? '/site' : '';
        assert_same(null, blunt_resolve_link($href, 'sub/page.html', $site), $href);
    }
}

function test_page_adds_ids_in_source_order(): void
{
    $out = prep('<html><head></head><body><p>a</p><br/></body></html>');
    assert_true(str_contains($out, '<html data-blunt-id="0">'));
    assert_true(str_contains($out, '<head data-blunt-id="1">'));
    assert_true(str_contains($out, '<p data-blunt-id="3">a</p>'));
    assert_true(str_contains($out, '<br data-blunt-id="4"/>'));
}

function test_page_rewrites_internal_links_and_keeps_original(): void
{
    $out = prep('<a href="../about.html#team">t</a>', 'sub/page.html');
    assert_true(str_contains($out, '<a data-blunt-id="0" data-blunt-href="../about.html#team" href="/blunt/edit.php?page=about.html#team">'), $out);
    $out = prep('<a href="my%20page.html">t</a>');
    assert_true(str_contains($out, 'href="/blunt/edit.php?page=my%20page.html"'), $out);
}

function test_page_leaves_other_links_alone(): void
{
    foreach (['https://x.com/a.html', '#top', 'mailto:a@b.c', '//cdn.x/a.html', 'file.pdf'] as $href) {
        $out = prep('<a href="' . $href . '">t</a>');
        assert_true(str_contains($out, 'href="' . $href . '"'), $href);
        assert_same(false, str_contains($out, 'data-blunt-href'), $href);
    }
}

function test_page_injects_base_and_editor(): void
{
    $out = prep('<html><head><title>t</title></head><body><p>x</p></body></html>', 'sub/page.html');
    assert_true(str_contains($out, '<head data-blunt-id="1"><base href="/sub/">'), $out);
    assert_true(str_contains($out, 'window.BLUNT = {"x":1};'));
    assert_true(str_contains($out, '<link rel="stylesheet" href="/blunt/editor.css">'));
    assert_true(str_contains($out, '<link rel="stylesheet" href="/blunt/light/light.css">'));
    assert_true(str_contains($out, '<script src="/blunt/js/core.js"></script>'));
    assert_true(str_contains($out, '<script src="/blunt/light/toolbar.js"></script>'));
    assert_true(strpos($out, '/blunt/light/panel.js') < strpos($out, '/blunt/js/main.js'));
    assert_true(strpos($out, 'window.BLUNT') < strpos($out, '</body>'));
}

function test_page_without_head_or_body(): void
{
    $out = prep('<p>x</p>');
    assert_true(str_starts_with($out, '<base href="/"><p data-blunt-id="0">x</p>'), $out);
    assert_true(str_contains($out, '/blunt/js/main.js'));
}
