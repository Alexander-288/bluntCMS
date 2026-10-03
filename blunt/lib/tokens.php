<?php
declare(strict_types=1);

/** Replaces CSS comments with spaces so offsets stay identical. */
function blunt_mask_css_comments(string $css): string
{
    return (string) preg_replace_callback('#/\*.*?\*/#s', fn (array $m) => str_repeat(' ', strlen($m[0])), $css);
}

/** Offset where a declaration value ends: the next ';' or '}' outside quotes/parens, minus trailing space. */
function blunt_css_value_end(string $css, int $from): int
{
    $depth = 0;
    $quote = '';
    $n = strlen($css);
    $i = $from;
    for (; $i < $n; $i++) {
        $c = $css[$i];
        if ($quote !== '') {
            if ($c === $quote) {
                $quote = '';
            }
            continue;
        }
        if ($c === '"' || $c === "'") {
            $quote = $c;
        } elseif ($c === '(') {
            $depth++;
        } elseif ($c === ')') {
            $depth = max(0, $depth - 1);
        } elseif (($c === ';' || $c === '}') && $depth === 0) {
            break;
        }
    }
    while ($i > $from && ctype_space($css[$i - 1])) {
        $i--;
    }
    return $i;
}

/** Selector of the rule block that contains offset $off, or null at top level. */
function blunt_enclosing_selector(string $css, int $off): ?string
{
    $depth = 0;
    for ($i = $off - 1; $i >= 0; $i--) {
        $c = $css[$i];
        if ($c === '}') {
            $depth++;
        } elseif ($c === '{') {
            if ($depth === 0) {
                $j = $i - 1;
                while ($j >= 0 && !in_array($css[$j], ['}', '{', ';'], true)) {
                    $j--;
                }
                return trim(substr($css, $j + 1, $i - $j - 1));
            }
            $depth--;
        }
    }
    return null;
}

/** [valueStart, valueEnd] of the token's declaration — first one in :root, else the first one. */
function blunt_find_token(string $css, string $name): ?array
{
    $masked = blunt_mask_css_comments($css);
    $re = '/(?<![\w-])' . preg_quote($name, '/') . '\s*:\s*/';
    if (preg_match_all($re, $masked, $matches, PREG_OFFSET_CAPTURE) === 0) {
        return null;
    }
    $first = null;
    foreach ($matches[0] as [$text, $offset]) {
        $start = $offset + strlen($text);
        $range = [$start, blunt_css_value_end($masked, $start)];
        if (blunt_enclosing_selector($masked, $offset) === ':root') {
            return $range;
        }
        $first ??= $range;
    }
    return $first;
}

function blunt_set_token(string $css, string $name, string $value): string
{
    $range = blunt_find_token($css, $name);
    if ($range === null) {
        throw new BluntError("Token $name is not in the token file.");
    }
    return substr($css, 0, $range[0]) . $value . substr($css, $range[1]);
}

/** Unique custom property names declared in the file, in order of first appearance. */
function blunt_token_names(string $css): array
{
    preg_match_all('/(?<![\w-])(--[a-zA-Z0-9-]+)\s*:/', blunt_mask_css_comments($css), $m);
    return array_values(array_unique($m[1]));
}
