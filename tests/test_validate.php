<?php
declare(strict_types=1);

function test_validate_lengths(): void
{
    assert_true(blunt_valid_style('padding-top', '12px'));
    assert_true(blunt_valid_style('padding-top', '1.5rem'));
    assert_true(blunt_valid_style('padding-top', '2em'));
    assert_true(blunt_valid_style('padding-top', '10%'));
    assert_true(blunt_valid_style('padding-top', '0'));
    assert_same(false, blunt_valid_style('padding-top', '-4px'));
    assert_true(blunt_valid_style('margin-top', '-4px'));
    assert_same(false, blunt_valid_style('padding-top', '12'));
    assert_same(false, blunt_valid_style('padding-top', 'calc(1px + 2px)'));
    assert_same(false, blunt_valid_style('padding-top', '12px; color: red'));
}

function test_validate_radius_shorthand_allows_up_to_four_lengths(): void
{
    assert_true(blunt_valid_style('border-radius', '4px'));
    assert_true(blunt_valid_style('border-radius', '4px 8px'));
    assert_true(blunt_valid_style('border-radius', '1px 2px 3px 4px'));
    assert_same(false, blunt_valid_style('border-radius', '1px 2px 3px 4px 5px'));
    assert_same(false, blunt_valid_style('border-radius', '-1px'));
    assert_same(false, blunt_valid_style('border-top-left-radius', '4px 8px'));
    assert_true(blunt_valid_style('border-bottom-right-radius', '30px'));
}

function test_validate_colors(): void
{
    assert_true(blunt_valid_style('color', '#fff'));
    assert_true(blunt_valid_style('background-color', '#A1B2C3'));
    assert_true(blunt_valid_style('border-color', '#11223344'));
    assert_same(false, blunt_valid_style('color', 'red'));
    assert_same(false, blunt_valid_style('color', '#12'));
    assert_same(false, blunt_valid_style('color', 'rgb(0,0,0)'));
    assert_same(false, blunt_valid_style('color', '12px'));
}

function test_validate_unknown_property_rejected(): void
{
    assert_same(false, blunt_valid_style('position', 'absolute'));
    assert_same(false, blunt_valid_style('background', '#fff'));
    assert_same(false, blunt_valid_style('padding', '4px'));
}

function test_validate_href(): void
{
    foreach (['/contact', 'about.html', 'https://example.com', 'mailto:a@b.c', '#top', ''] as $ok) {
        assert_true(blunt_valid_href($ok), $ok);
    }
    foreach (['javascript:alert(1)', ' JaVaScRiPt:x', "java\tscript:x", 'data:text/html,x', 'vbscript:x', str_repeat('a', 2049)] as $bad) {
        assert_same(false, blunt_valid_href($bad), $bad);
    }
}

function test_validate_token_name_and_value(): void
{
    assert_true(blunt_valid_token_name('--card-radius'));
    assert_same(false, blunt_valid_token_name('card'));
    assert_same(false, blunt_valid_token_name('--a b'));
    assert_same(false, blunt_valid_token_name('--a;}'));
    assert_true(blunt_valid_token_value('16px'));
    assert_true(blunt_valid_token_value('#000'));
    assert_true(blunt_valid_token_value('-2px'));
    assert_same(false, blunt_valid_token_value('red'));
    assert_same(false, blunt_valid_token_value('1px; }'));
}

function test_validate_text(): void
{
    assert_true(blunt_valid_text(''));
    assert_true(blunt_valid_text("Zażółć gęślą jaźń\nline two"));
    assert_true(blunt_valid_text(str_repeat('a', 10000)));
    assert_same(false, blunt_valid_text(str_repeat('a', 10001)));
    assert_same(false, blunt_valid_text("\xff\xfe"));
}
