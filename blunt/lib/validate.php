<?php
declare(strict_types=1);

const BLUNT_STYLE_PROPS = [
    'border-radius',
    'border-top-left-radius', 'border-top-right-radius',
    'border-bottom-right-radius', 'border-bottom-left-radius',
    'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
    'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
    'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
    'gap',
    'color', 'background-color', 'border-color',
    'border-style', 'text-align', 'justify-content', 'align-items',
];

const BLUNT_COLOR_PROPS = ['color', 'background-color', 'border-color'];

/** Properties that only accept one of a fixed set of keywords. */
const BLUNT_KEYWORD_PROPS = [
    'border-style' => ['none', 'solid', 'dashed', 'dotted'],
    'text-align' => ['left', 'center', 'right', 'justify'],
    'justify-content' => ['flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'space-evenly'],
    'align-items' => ['flex-start', 'center', 'flex-end', 'stretch', 'baseline'],
];

function blunt_is_length(string $v, bool $allowNegative): bool
{
    if ($v === '0') {
        return true;
    }
    $sign = $allowNegative ? '-?' : '';
    return preg_match('/^' . $sign . '\d+(\.\d+)?(px|rem|em|%)$/', $v) === 1;
}

function blunt_is_color(string $v): bool
{
    return preg_match('/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i', $v) === 1;
}

function blunt_valid_style(string $prop, string $value): bool
{
    if (!in_array($prop, BLUNT_STYLE_PROPS, true)) {
        return false;
    }
    if (in_array($prop, BLUNT_COLOR_PROPS, true)) {
        return blunt_is_color($value);
    }
    if (isset(BLUNT_KEYWORD_PROPS[$prop])) {
        return in_array($value, BLUNT_KEYWORD_PROPS[$prop], true);
    }
    if (($prop === 'margin-left' || $prop === 'margin-right') && $value === 'auto') {
        return true;
    }
    if ($prop === 'border-radius') {
        $parts = preg_split('/\s+/', trim($value)) ?: [];
        if (count($parts) < 1 || count($parts) > 4) {
            return false;
        }
        foreach ($parts as $part) {
            if (!blunt_is_length($part, false)) {
                return false;
            }
        }
        return true;
    }
    return blunt_is_length($value, str_starts_with($prop, 'margin-'));
}

function blunt_valid_token_name(string $name): bool
{
    return preg_match('/^--[a-zA-Z0-9-]+$/', $name) === 1;
}

function blunt_valid_token_value(string $value): bool
{
    return blunt_is_color($value) || blunt_is_length($value, true);
}

function blunt_valid_href(string $href): bool
{
    if (strlen($href) > 2048) {
        return false;
    }
    $clean = strtolower((string) preg_replace('/[\x00-\x20]+/', '', $href));
    foreach (['javascript:', 'data:', 'vbscript:'] as $bad) {
        if (str_starts_with($clean, $bad)) {
            return false;
        }
    }
    return true;
}

/** Valid UTF-8, at most 10,000 characters. */
function blunt_valid_text(string $text): bool
{
    return preg_match('/^.{0,10000}$/su', $text) === 1;
}
