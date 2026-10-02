<?php
declare(strict_types=1);

function style_on_first_tag(string $h, array $set, array $unset = []): string
{
    $tag = blunt_scan($h)[0];
    $edit = blunt_style_edit($h, $tag, $set, $unset);
    return $edit === null ? $h : blunt_apply_edits($h, [$edit]);
}

function test_apply_edits_splices_from_the_end(): void
{
    assert_same('aXcYe', blunt_apply_edits('abcde', [[1, 2, 'X'], [3, 4, 'Y']]));
    assert_same('aXcYe', blunt_apply_edits('abcde', [[3, 4, 'Y'], [1, 2, 'X']]));
    assert_same('aXYb', blunt_apply_edits('ab', [[1, 1, 'X'], [1, 1, 'Y']]));
}

function test_apply_edits_rejects_overlap(): void
{
    assert_throws(fn () => blunt_apply_edits('abcdef', [[1, 4, 'X'], [3, 5, 'Y']]), 'same part');
}

function test_parse_style_keeps_order_and_parens(): void
{
    assert_same(
        [['color', 'red'], ['background', 'url("a;b.png")'], ['padding-top', '4px']],
        blunt_parse_style('color: red; background: url("a;b.png");padding-top:4px;')
    );
    assert_same([], blunt_parse_style('  ;  '));
}

function test_serialize_style(): void
{
    assert_same('color: red; padding-top: 4px', blunt_serialize_style([['color', 'red'], ['padding-top', '4px']]));
}

function test_style_edit_updates_existing_attribute_only(): void
{
    assert_same(
        '<div id="x" style="color: red; padding-top: 8px">a</div>',
        style_on_first_tag('<div id="x" style="color: red; padding-top: 4px">a</div>', ['padding-top' => '8px'])
    );
}

function test_style_edit_inserts_attribute_when_missing(): void
{
    assert_same('<div class="c" style="border-radius: 12px">a</div>', style_on_first_tag('<div class="c">a</div>', ['border-radius' => '12px']));
    assert_same('<div style="color: #000">a</div>', style_on_first_tag('<div>a</div>', ['color' => '#000']));
    assert_same('<img src="a.png" style="border-radius: 4px" />', style_on_first_tag('<img src="a.png" />', ['border-radius' => '4px']));
}

function test_style_edit_removes_attribute_when_empty(): void
{
    assert_same('<p class="a">x</p>', style_on_first_tag('<p class="a" style="color: #fff">x</p>', [], ['color']));
    assert_same('<p>x</p>', style_on_first_tag('<p>x</p>', [], ['color']));
}

function test_style_edit_quotes_unquoted_and_keeps_entities(): void
{
    assert_same('<p style="color: red; padding-top: 2px">x</p>', style_on_first_tag('<p style=color:red>x</p>', ['padding-top' => '2px']));
    assert_same(
        '<p style="font-family: &quot;A&quot;; color: #000">x</p>',
        style_on_first_tag('<p style="font-family: &quot;A&quot;">x</p>', ['color' => '#000'])
    );
}

function test_style_edit_moves_set_property_to_the_end(): void
{
    assert_same(
        '<p style="border-radius: 4px; border-top-left-radius: 9px">x</p>',
        style_on_first_tag('<p style="border-top-left-radius: 1px; border-radius: 4px">x</p>', ['border-top-left-radius' => '9px'])
    );
}

function test_style_edit_writes_radius_shorthand_before_corners(): void
{
    assert_same(
        '<p style="border-radius: 4px; border-bottom-right-radius: 9px">x</p>',
        style_on_first_tag('<p>x</p>', ['border-bottom-right-radius' => '9px', 'border-radius' => '4px'])
    );
}

function test_set_attr_edit_replaces_inserts_and_fills_valueless(): void
{
    $h = '<a href="/old" download>x</a>';
    $t = blunt_scan($h)[0];
    assert_same('<a href="/new" download>x</a>', blunt_apply_edits($h, [blunt_set_attr_edit($h, $t, 'href', '/new')]));
    assert_same('<a href="/old" download="a&amp;b">x</a>', blunt_apply_edits($h, [blunt_set_attr_edit($h, $t, 'download', 'a&b')]));
    assert_same('<a href="/old" download title="t">x</a>', blunt_apply_edits($h, [blunt_set_attr_edit($h, $t, 'title', 't')]));
}
