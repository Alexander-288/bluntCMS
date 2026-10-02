<?php
declare(strict_types=1);

/**
 * Applies [start, end, replacement] byte edits to $s. Edits must not overlap
 * (two insertions at the same point are fine).
 */
function blunt_apply_edits(string $s, array $edits): string
{
    usort($edits, fn (array $a, array $b) => [$a[0], $a[1]] <=> [$b[0], $b[1]]);
    for ($i = 1, $n = count($edits); $i < $n; $i++) {
        if ($edits[$i][0] < $edits[$i - 1][1]) {
            throw new BluntError('Two changes touch the same part of the file.');
        }
    }
    foreach (array_reverse($edits) as [$start, $end, $replacement]) {
        $s = substr($s, 0, $start) . $replacement . substr($s, $end);
    }
    return $s;
}

function blunt_escape_attr(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_HTML5, 'UTF-8');
}

/** Where a new attribute goes: after the last attribute, or right after the tag name. */
function blunt_attr_insert_point(array $tag): int
{
    if ($tag['attrs'] !== []) {
        return $tag['attrs'][count($tag['attrs']) - 1]['end'];
    }
    return $tag['start'] + 1 + strlen($tag['name']);
}

/** Edit that sets attribute $name to $value (decoded text) on $tag. */
function blunt_set_attr_edit(string $html, array $tag, string $name, string $value): array
{
    $escaped = blunt_escape_attr($value);
    $attr = blunt_attr($tag, $name);
    if ($attr === null) {
        $at = blunt_attr_insert_point($tag);
        return [$at, $at, ' ' . $name . '="' . $escaped . '"'];
    }
    if ($attr['valueStart'] === null) {
        return [$attr['start'], $attr['end'], $name . '="' . $escaped . '"'];
    }
    if ($attr['quote'] === '') {
        return [$attr['valueStart'], $attr['valueEnd'], '"' . $escaped . '"'];
    }
    return [$attr['valueStart'], $attr['valueEnd'], $escaped];
}

/** Edit that removes an attribute and the whitespace before it. */
function blunt_remove_attr_edit(string $html, array $attr): array
{
    $start = $attr['start'];
    while ($start > 0 && ctype_space($html[$start - 1])) {
        $start--;
    }
    return [$start, $attr['end'], ''];
}

/** Splits a style attribute into [[prop, value], ...], respecting quotes and parentheses. */
function blunt_parse_style(string $style): array
{
    $parts = [];
    $buf = '';
    $depth = 0;
    $quote = '';
    for ($i = 0, $n = strlen($style); $i < $n; $i++) {
        $c = $style[$i];
        if ($quote !== '') {
            $buf .= $c;
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
        } elseif ($c === ';' && $depth === 0) {
            $parts[] = $buf;
            $buf = '';
            continue;
        }
        $buf .= $c;
    }
    $parts[] = $buf;

    $decls = [];
    foreach ($parts as $part) {
        $colon = strpos($part, ':');
        if ($colon === false) {
            continue;
        }
        $decls[] = [strtolower(trim(substr($part, 0, $colon))), trim(substr($part, $colon + 1))];
    }
    return $decls;
}

function blunt_serialize_style(array $decls): string
{
    return implode('; ', array_map(fn (array $d) => $d[0] . ': ' . $d[1], $decls));
}

/**
 * Edit for the style attribute of $tag: removes $unset props, then (re)appends
 * each $set prop at the end so it wins over earlier shorthands. Null if nothing to do.
 */
function blunt_style_edit(string $html, array $tag, array $set, array $unset): ?array
{
    $attr = blunt_attr($tag, 'style');
    $decls = $attr === null ? [] : blunt_parse_style((string) blunt_attr_value($html, $attr));
    $drop = array_merge($unset, array_keys($set));
    $decls = array_values(array_filter($decls, fn (array $d) => !in_array($d[0], $drop, true)));
    foreach ($set as $prop => $value) {
        $decls[] = [$prop, $value];
    }
    $value = blunt_serialize_style($decls);
    if ($value === '') {
        return $attr === null ? null : blunt_remove_attr_edit($html, $attr);
    }
    return blunt_set_attr_edit($html, $tag, 'style', $value);
}
