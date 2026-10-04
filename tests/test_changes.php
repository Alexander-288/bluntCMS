<?php
declare(strict_types=1);

// Tag indices: html 0, head 1, body 2, h1 3, a 4, div 5, p 6, b 7
const PAGE = '<!doctype html><html><head></head><body>'
    . '<h1 data-blunt="title">Old</h1>'
    . '<a data-blunt="cta" href="/old">Go</a>'
    . '<div class="card">x</div>'
    . '<p data-blunt="rich">a <b>b</b></p>'
    . '</body></html>';

function apply_page(array $changes, ?string $css = null): array
{
    return blunt_apply_changes(PAGE, $css, $changes);
}

function test_changes_text_is_escaped_and_minimal(): void
{
    $out = apply_page([['type' => 'text', 'name' => 'title', 'value' => 'New & <improved> "x"']]);
    assert_same(str_replace('>Old</h1>', '>New &amp; &lt;improved&gt; "x"</h1>', PAGE), $out['html']);
}

function test_changes_href(): void
{
    $out = apply_page([['type' => 'href', 'name' => 'cta', 'value' => ' /contact ']]);
    assert_same(str_replace('href="/old"', 'href="/contact"', PAGE), $out['html']);
}

function test_changes_style_merges_per_element(): void
{
    $out = apply_page([
        ['type' => 'style', 'id' => 5, 'set' => ['border-radius' => '20px'], 'unset' => []],
        ['type' => 'style', 'id' => 5, 'set' => ['padding-top' => '8px'], 'unset' => ['color']],
    ]);
    assert_same(str_replace('<div class="card">', '<div class="card" style="border-radius: 20px; padding-top: 8px">', PAGE), $out['html']);
}

function test_changes_token(): void
{
    $out = apply_page([['type' => 'token', 'name' => '--r', 'value' => '9px']], ':root { --r: 4px; }');
    assert_same(PAGE, $out['html']);
    assert_same(':root { --r: 9px; }', $out['css']);
}

function test_changes_all_types_together(): void
{
    $out = apply_page([
        ['type' => 'text', 'name' => 'cta', 'value' => 'Contact'],
        ['type' => 'href', 'name' => 'cta', 'value' => '/contact'],
        ['type' => 'style', 'id' => 4, 'set' => ['color' => '#fff'], 'unset' => []],
    ]);
    assert_same(
        str_replace('<a data-blunt="cta" href="/old">Go</a>', '<a data-blunt="cta" href="/contact" style="color: #fff">Contact</a>', PAGE),
        $out['html']
    );
}

function test_changes_rejections(): void
{
    assert_throws(fn () => apply_page([['type' => 'text', 'name' => 'rich', 'value' => 'x']]), 'contains HTML tags');
    assert_throws(fn () => apply_page([['type' => 'text', 'name' => 'nope', 'value' => 'x']]), 'No block named');
    assert_throws(fn () => apply_page([['type' => 'text', 'name' => 'title']]), 'has no value');
    assert_throws(fn () => apply_page([['type' => 'href', 'name' => 'title', 'value' => '/x']]), 'not a link');
    assert_throws(fn () => apply_page([['type' => 'href', 'name' => 'cta', 'value' => 'javascript:alert(1)']]), 'not allowed');
    assert_throws(fn () => apply_page([['type' => 'style', 'id' => 99, 'set' => ['color' => '#fff']]]), "doesn't exist");
    assert_throws(fn () => apply_page([['type' => 'style', 'id' => 5, 'set' => ['position' => 'fixed']]]), 'not allowed');
    assert_throws(fn () => apply_page([['type' => 'style', 'id' => 5, 'unset' => ['position']]]), 'not allowed');
    assert_throws(fn () => apply_page([['type' => 'token', 'name' => '--r', 'value' => '1px']]), 'No token file');
    assert_throws(fn () => apply_page([['type' => 'token', 'name' => '--r', 'value' => 'red']], ':root{--r:1px}'), 'not allowed');
    assert_throws(fn () => apply_page([['type' => 'boom']]), 'unknown type');
    assert_throws(fn () => apply_page(['nope']), 'malformed');
}

function test_changes_duplicate_names_rejected(): void
{
    $html = '<p data-blunt="a">1</p><p data-blunt="a">2</p>';
    assert_throws(fn () => blunt_apply_changes($html, null, [['type' => 'text', 'name' => 'a', 'value' => 'x']]), 'more than once');
}

function test_changes_thick_tier_writes_layout_styles(): void
{
    $change = [['type' => 'style', 'id' => 5, 'set' => ['position' => 'relative', 'z-index' => '2', 'opacity' => '0.5']]];
    assert_throws(fn () => apply_page($change), 'not allowed');
    $out = blunt_apply_changes(PAGE, null, $change, 'thick');
    assert_true(str_contains($out['html'], 'style="position: relative; z-index: 2; opacity: 0.5"'), $out['html']);
    $unset = blunt_apply_changes($out['html'], null, [['type' => 'style', 'id' => 5, 'unset' => ['position', 'z-index', 'opacity']]], 'thick');
    assert_same(PAGE, $unset['html']);
}
