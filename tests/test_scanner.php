<?php
declare(strict_types=1);

function names(array $tags): array
{
    return array_column($tags, 'name');
}

function test_scan_basic_tags_and_offsets(): void
{
    $h = '<div class="a"><p>Hi</p></div>';
    $t = blunt_scan($h);
    assert_same(['div', 'p'], names($t));
    assert_same([0, 1], array_column($t, 'index'));
    assert_same(0, $t[0]['start']);
    assert_same(15, $t[0]['end']);
    assert_same(15, $t[1]['start']);
    assert_same(18, $t[1]['end']);
}

function test_scan_attributes_quoted_unquoted_valueless(): void
{
    $h = "<input type=text value='a>b' disabled data-x=\"1\">";
    $t = blunt_scan($h)[0];
    assert_same(['type', 'value', 'disabled', 'data-x'], array_column($t['attrs'], 'name'));
    $v = $t['attrs'][1];
    assert_same('a>b', substr($h, $v['valueStart'], $v['valueEnd'] - $v['valueStart']));
    assert_same("'", $v['quote']);
    assert_same('', $t['attrs'][0]['quote']);
    assert_same(null, $t['attrs'][2]['valueStart']);
    assert_same(strlen($h), $t['end']);
}

function test_scan_skips_comments_doctype_and_raw_text(): void
{
    $h = "<!doctype html><!-- <p> --><script>if (a<b) { x = '<div>'; }</script>"
        . "<style>p>a{}</style><span></span>";
    assert_same(['script', 'style', 'span'], names(blunt_scan($h)));
}

function test_scan_self_closing_and_void(): void
{
    $t = blunt_scan('<br/><img src="a.png" /><hr>');
    assert_same(['br', 'img', 'hr'], names($t));
    assert_true($t[0]['selfClosing']);
    assert_true($t[1]['selfClosing']);
    assert_same(false, $t[2]['selfClosing']);
}

function test_scan_ignores_stray_less_than_and_lowercases(): void
{
    assert_same(['p'], names(blunt_scan('a < b <p>x</p>')));
    assert_same(['div'], names(blunt_scan('<DIV></DIV>')));
}

function test_attr_value_decodes_entities(): void
{
    $h = '<a data-blunt="a&amp;b" href="/x">y</a>';
    $t = blunt_scan($h)[0];
    assert_same('a&b', blunt_attr_value($h, blunt_attr($t, 'data-blunt')));
    assert_same(null, blunt_attr($t, 'title'));
}

function test_content_range_simple_and_nested(): void
{
    $h = '<h1 data-blunt="t">Hello</h1>';
    $r = blunt_content_range($h, blunt_scan($h), 0);
    assert_same('Hello', substr($h, $r['start'], $r['end'] - $r['start']));

    $h = '<div><div>in</div>out</div>';
    $r = blunt_content_range($h, blunt_scan($h), 0);
    assert_same('<div>in</div>out', substr($h, $r['start'], $r['end'] - $r['start']));
}

function test_content_range_void_or_unclosed_is_null(): void
{
    $h = '<img src=x>';
    assert_same(null, blunt_content_range($h, blunt_scan($h), 0));
    $h = '<p>never closed';
    assert_same(null, blunt_content_range($h, blunt_scan($h), 0));
}

function test_named_blocks(): void
{
    $h = '<h1 data-blunt="a">1</h1><p data-blunt="b">2</p><p data-blunt="a">3</p><p>4</p>';
    assert_same(['a' => [0, 2], 'b' => [1]], blunt_named($h, blunt_scan($h)));
}
