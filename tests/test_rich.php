<?php
declare(strict_types=1);

function test_rich_builds_html_from_a_tree(): void
{
    $html = blunt_rich_html([
        'Hi & <you> ',
        ['tag' => 'strong', 'children' => ['bold ', ['tag' => 'em', 'children' => ['both']]]],
        ['tag' => 'br'],
        ['tag' => 'a', 'href' => '/contact?a=1&b="2"', 'children' => ['link']],
        ['tag' => 's', 'children' => ['old']],
    ]);
    assert_same('Hi &amp; &lt;you&gt; <strong>bold <em>both</em></strong><br><a href="/contact?a=1&amp;b=&quot;2&quot;">link</a><s>old</s>', $html);
}

function test_rich_rejects_anything_outside_the_small_set(): void
{
    $bad = [
        'unknown tag' => [['tag' => 'span', 'children' => ['x']]],
        'script' => [['tag' => 'script', 'children' => ['x']]],
        'bad href' => [['tag' => 'a', 'href' => 'javascript:alert(1)', 'children' => ['x']]],
        'missing href' => [['tag' => 'a', 'children' => ['x']]],
        'link in link' => [['tag' => 'a', 'href' => '/a', 'children' => [['tag' => 'a', 'href' => '/b', 'children' => ['x']]]]],
        'br with children' => [['tag' => 'br', 'children' => ['x']]],
        'number' => [42],
        'children not a list' => [['tag' => 'em', 'children' => 'x']],
        'too deep' => [['tag' => 'em', 'children' => [['tag' => 'em', 'children' => [['tag' => 'em', 'children' => [['tag' => 'em', 'children' => [['tag' => 'em', 'children' => [['tag' => 'em', 'children' => [['tag' => 'em', 'children' => ['x']]]]]]]]]]]]]]],
        'too long' => [str_repeat('x', 10001)],
        'bad utf-8' => ["\xff"],
    ];
    foreach ($bad as $why => $nodes) {
        try {
            blunt_rich_html($nodes);
        } catch (BluntError $e) {
            continue;
        }
        throw new AssertionFailed("accepted: $why");
    }
}

function test_rich_editable_content(): void
{
    foreach (['plain text', 'a <b>b</b>', 'x <strong>y</strong> <em>z</em> <i>i</i> <u>u</u> <s>s</s>', 'line<br>two<br/>', 'go <a href="/x">here</a>', "go <a href='/x'>here</a>", 'Tom &amp; Jerry'] as $ok) {
        assert_true(blunt_rich_editable($ok), $ok);
    }
    foreach (['<span>x</span>', '<b class="x">x</b>', '<a href="/x" class="btn">x</a>', '<img src="x.png">', 'a <!-- note --> b', '<em data-x="1">x</em>', 'broken <b'] as $no) {
        assert_same(false, blunt_rich_editable($no), $no);
    }
}

function test_rich_change_is_thick_only_and_minimal(): void
{
    $change = [['type' => 'rich', 'name' => 'rich', 'value' => ['a ', ['tag' => 'b', 'children' => ['b']], ' and ', ['tag' => 'em', 'children' => ['more']]]]];
    assert_throws(fn () => blunt_apply_changes(PAGE, null, $change), 'not allowed');
    $out = blunt_apply_changes(PAGE, null, $change, 'thick');
    assert_same(str_replace('a <b>b</b></p>', 'a <b>b</b> and <em>more</em></p>', PAGE), $out['html']);
}

function test_rich_change_refuses_blocks_with_other_markup(): void
{
    $html = '<p data-blunt="x">a <span class="hl">b</span></p>';
    $change = [['type' => 'rich', 'name' => 'x', 'value' => ['a b']]];
    assert_throws(fn () => blunt_apply_changes($html, null, $change, 'thick'), "can't be edited");
    assert_throws(fn () => blunt_apply_changes(PAGE, null, [['type' => 'rich', 'name' => 'rich', 'value' => 'a <b>b</b>']], 'thick'), 'malformed');
}

function test_rich_and_text_on_one_block_are_refused(): void
{
    $html = '<p data-blunt="x">plain</p>';
    $both = [['type' => 'text', 'name' => 'x', 'value' => 'a'], ['type' => 'rich', 'name' => 'x', 'value' => [['tag' => 'b', 'children' => ['a']]]]];
    assert_throws(fn () => blunt_apply_changes($html, null, $both, 'thick'), 'same part');
}
