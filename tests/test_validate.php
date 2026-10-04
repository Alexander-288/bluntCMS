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

function test_validate_border_widths_and_gap(): void
{
    assert_true(blunt_valid_style('border-top-width', '2px'));
    assert_true(blunt_valid_style('border-left-width', '0'));
    assert_same(false, blunt_valid_style('border-top-width', '-1px'));
    assert_true(blunt_valid_style('gap', '12px'));
    assert_same(false, blunt_valid_style('gap', '-2px'));
}

function test_validate_keyword_props(): void
{
    $ok = [
        'border-style' => ['none', 'solid', 'dashed', 'dotted'],
        'text-align' => ['left', 'center', 'right', 'justify'],
        'justify-content' => ['flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'space-evenly'],
        'align-items' => ['flex-start', 'center', 'flex-end', 'stretch', 'baseline'],
    ];
    foreach ($ok as $prop => $values) {
        foreach ($values as $v) {
            assert_true(blunt_valid_style($prop, $v), "$prop: $v");
        }
    }
    assert_same(false, blunt_valid_style('border-style', 'double'));
    assert_same(false, blunt_valid_style('text-align', 'start'));
    assert_same(false, blunt_valid_style('justify-content', 'stretch'));
    assert_same(false, blunt_valid_style('align-items', 'space-between'));
    assert_same(false, blunt_valid_style('text-align', 'center; color: red'));
}

function test_validate_auto_side_margins_only(): void
{
    assert_true(blunt_valid_style('margin-left', 'auto'));
    assert_true(blunt_valid_style('margin-right', 'auto'));
    assert_same(false, blunt_valid_style('margin-top', 'auto'));
    assert_same(false, blunt_valid_style('padding-left', 'auto'));
}

function test_validate_layout_breaking_props_stay_out(): void
{
    foreach (['position' => 'absolute', 'top' => '0', 'z-index' => '10', 'display' => 'flex', 'width' => '10px'] as $prop => $v) {
        assert_same(false, blunt_valid_style($prop, $v), $prop);
    }
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

function test_validate_layout_keywords(): void
{
    foreach (['block', 'inline', 'inline-block', 'flex', 'inline-flex', 'grid', 'none'] as $v) {
        assert_true(blunt_valid_style('display', $v, 'thick'), $v);
    }
    foreach (['static', 'relative', 'absolute', 'fixed', 'sticky'] as $v) {
        assert_true(blunt_valid_style('position', $v, 'thick'), $v);
    }
    foreach (['visible', 'hidden', 'scroll', 'auto'] as $v) {
        assert_true(blunt_valid_style('overflow', $v, 'thick'), $v);
    }
    assert_same(false, blunt_valid_style('display', 'table', 'thick'));
    assert_same(false, blunt_valid_style('position', 'absolute; color: red', 'thick'));
    assert_same(false, blunt_valid_style('overflow', 'clip', 'thick'));
}

function test_validate_offsets_allow_negative_and_auto(): void
{
    foreach (['top', 'right', 'bottom', 'left'] as $side) {
        assert_true(blunt_valid_style($side, '12px', 'thick'), $side);
        assert_true(blunt_valid_style($side, '-8px', 'thick'), $side);
        assert_true(blunt_valid_style($side, 'auto', 'thick'), $side);
        assert_true(blunt_valid_style($side, '50%', 'thick'), $side);
        assert_same(false, blunt_valid_style($side, 'none', 'thick'), $side);
    }
}

function test_validate_sizes(): void
{
    foreach (['width', 'height'] as $p) {
        assert_true(blunt_valid_style($p, '320px', 'thick'));
        assert_true(blunt_valid_style($p, '100%', 'thick'));
        assert_true(blunt_valid_style($p, 'auto', 'thick'));
        assert_same(false, blunt_valid_style($p, '-1px', 'thick'));
        assert_same(false, blunt_valid_style($p, 'none', 'thick'));
    }
    foreach (['min-width', 'min-height'] as $p) {
        assert_true(blunt_valid_style($p, '0', 'thick'));
        assert_true(blunt_valid_style($p, '10rem', 'thick'));
        assert_true(blunt_valid_style($p, 'auto', 'thick'));
        assert_same(false, blunt_valid_style($p, 'none', 'thick'));
    }
    foreach (['max-width', 'max-height'] as $p) {
        assert_true(blunt_valid_style($p, '960px', 'thick'));
        assert_true(blunt_valid_style($p, 'none', 'thick'));
        assert_same(false, blunt_valid_style($p, 'auto', 'thick'));
    }
}

function test_validate_z_index_and_opacity(): void
{
    assert_true(blunt_valid_style('z-index', '0', 'thick'));
    assert_true(blunt_valid_style('z-index', '10', 'thick'));
    assert_true(blunt_valid_style('z-index', '-1', 'thick'));
    assert_true(blunt_valid_style('z-index', 'auto', 'thick'));
    assert_true(blunt_valid_style('z-index', '9999', 'thick'));
    assert_same(false, blunt_valid_style('z-index', '10000', 'thick'));
    assert_same(false, blunt_valid_style('z-index', '1.5', 'thick'));
    assert_same(false, blunt_valid_style('z-index', '2px', 'thick'));

    assert_true(blunt_valid_style('opacity', '0', 'thick'));
    assert_true(blunt_valid_style('opacity', '1', 'thick'));
    assert_true(blunt_valid_style('opacity', '0.35', 'thick'));
    assert_true(blunt_valid_style('opacity', '.5', 'thick'));
    assert_same(false, blunt_valid_style('opacity', '1.2', 'thick'));
    assert_same(false, blunt_valid_style('opacity', '-0.1', 'thick'));
    assert_same(false, blunt_valid_style('opacity', '50%', 'thick'));
}

function test_validate_thick_props_are_thick_only(): void
{
    foreach (BLUNT_THICK_STYLE_PROPS as $prop) {
        assert_same(false, blunt_valid_style($prop, '0'), "light: $prop");
        assert_true(in_array($prop, blunt_style_props('thick'), true), "thick: $prop");
    }
    assert_same(BLUNT_STYLE_PROPS, blunt_style_props('light'));
    assert_same(BLUNT_STYLE_PROPS, blunt_style_props('anything-else'));
}

function test_validate_typography(): void
{
    $ok = [
        'font-size' => ['16px', '1.25rem', '0'],
        'font-weight' => ['100', '400', '700', '900', 'normal', 'bold'],
        'line-height' => ['1', '1.55', '0.9', '24px', '1.5em', 'normal'],
        'letter-spacing' => ['0', '1px', '-0.5px', '0.06em', 'normal'],
        'font-style' => ['normal', 'italic'],
        'text-decoration-line' => ['none', 'underline', 'line-through'],
        'text-transform' => ['none', 'uppercase', 'lowercase', 'capitalize'],
    ];
    foreach ($ok as $prop => $values) {
        foreach ($values as $v) {
            assert_true(blunt_valid_style($prop, $v, 'thick'), "$prop: $v");
            assert_same(false, blunt_valid_style($prop, $v), "light rejects $prop");
        }
    }
    $bad = [
        'font-size' => ['-2px', '16', 'large'],
        'font-weight' => ['450', '1000', '0', 'bolder'],
        'line-height' => ['-1', '11', '1.5.5'],
        'letter-spacing' => ['2', 'wide'],
        'font-style' => ['oblique'],
        'text-decoration-line' => ['overline', 'underline red'],
        'text-transform' => ['full-width'],
    ];
    foreach ($bad as $prop => $values) {
        foreach ($values as $v) {
            assert_same(false, blunt_valid_style($prop, $v, 'thick'), "$prop: $v");
        }
    }
}
