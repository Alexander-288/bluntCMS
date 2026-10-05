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

/** Extra properties only the Thick tier may write: these can move or resize things. */
const BLUNT_THICK_STYLE_PROPS = [
    'display', 'position', 'top', 'right', 'bottom', 'left', 'z-index', 'overflow',
    'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height', 'opacity',
    'font-size', 'font-weight', 'line-height', 'letter-spacing', 'font-style', 'text-decoration-line', 'text-transform',
    'background-image', 'background-size', 'background-position', 'background-repeat',
];

/** The style properties a tier may write. */
function blunt_style_props(string $tier): array
{
    return $tier === 'thick' ? array_merge(BLUNT_STYLE_PROPS, BLUNT_THICK_STYLE_PROPS) : BLUNT_STYLE_PROPS;
}

const BLUNT_COLOR_PROPS = ['color', 'background-color', 'border-color'];

/** Properties that only accept one of a fixed set of keywords. */
const BLUNT_KEYWORD_PROPS = [
    'border-style' => ['none', 'solid', 'dashed', 'dotted'],
    'text-align' => ['left', 'center', 'right', 'justify'],
    'justify-content' => ['flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'space-evenly'],
    'align-items' => ['flex-start', 'center', 'flex-end', 'stretch', 'baseline'],
    'display' => ['block', 'inline', 'inline-block', 'flex', 'inline-flex', 'grid', 'none'],
    'position' => ['static', 'relative', 'absolute', 'fixed', 'sticky'],
    'overflow' => ['visible', 'hidden', 'scroll', 'auto'],
    'font-style' => ['normal', 'italic'],
    'text-decoration-line' => ['none', 'underline', 'line-through'],
    'text-transform' => ['none', 'uppercase', 'lowercase', 'capitalize'],
    'background-size' => ['auto', 'cover', 'contain'],
    'background-position' => ['center', 'top', 'bottom', 'left', 'right'],
    'background-repeat' => ['no-repeat', 'repeat'],
];

/** Length properties that also take one keyword. */
const BLUNT_LENGTH_KEYWORDS = [
    'top' => 'auto', 'right' => 'auto', 'bottom' => 'auto', 'left' => 'auto',
    'width' => 'auto', 'height' => 'auto', 'min-width' => 'auto', 'min-height' => 'auto',
    'max-width' => 'none', 'max-height' => 'none',
    'line-height' => 'normal', 'letter-spacing' => 'normal',
    'margin-left' => 'auto', 'margin-right' => 'auto',
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

function blunt_valid_style(string $prop, string $value, string $tier = 'light'): bool
{
    if (!in_array($prop, blunt_style_props($tier), true)) {
        return false;
    }
    if (in_array($prop, BLUNT_COLOR_PROPS, true)) {
        return blunt_is_color($value);
    }
    if (isset(BLUNT_KEYWORD_PROPS[$prop])) {
        return in_array($value, BLUNT_KEYWORD_PROPS[$prop], true);
    }
    if ((BLUNT_LENGTH_KEYWORDS[$prop] ?? null) === $value) {
        return true;
    }
    if ($prop === 'background-image') {
        // One image: url(uploads/a.jpg), quotes optional. blunt_valid_image_url keeps quotes, brackets, spaces and script schemes out.
        return $value === 'none'
            || (preg_match('#^url\(([\'"]?)(.+)\1\)$#', $value, $m) === 1 && blunt_valid_image_url($m[2]));
    }
    if ($prop === 'z-index') {
        return $value === 'auto' || preg_match('/^-?\d{1,4}$/', $value) === 1;
    }
    if ($prop === 'opacity') {
        return preg_match('/^(0?\.\d+|0|1|1\.0+)$/', $value) === 1;
    }
    if ($prop === 'font-weight') {
        return in_array($value, ['normal', 'bold'], true) || preg_match('/^[1-9]00$/', $value) === 1;
    }
    if ($prop === 'line-height' && preg_match('/^\d+(\.\d+)?$/', $value) === 1) {
        return (float) $value <= 10; // a plain multiplier of the font size
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
    return blunt_is_length($value, str_starts_with($prop, 'margin-') || in_array($prop, ['top', 'right', 'bottom', 'left', 'letter-spacing'], true));
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
