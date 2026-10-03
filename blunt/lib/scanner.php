<?php
declare(strict_types=1);

const BLUNT_VOID_TAGS = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr'];
const BLUNT_RAW_TEXT_TAGS = ['script', 'style', 'textarea', 'title'];

/**
 * Forward-only scan of raw HTML. Returns every start tag in document order:
 * [index, name, start, end (offset after '>'), selfClosing,
 *  attrs => [[name, start, valueStart|null, valueEnd|null, quote, end], ...]]
 */
function blunt_scan(string $html): array
{
    $tags = [];
    $n = strlen($html);
    $i = 0;
    while ($i < $n) {
        $lt = strpos($html, '<', $i);
        if ($lt === false) {
            break;
        }
        if (substr_compare($html, '<!--', $lt, 4) === 0) {
            $close = strpos($html, '-->', $lt + 4);
            $i = $close === false ? $n : $close + 3;
            continue;
        }
        $next = $html[$lt + 1] ?? '';
        if ($next === '!' || $next === '?' || $next === '/') {
            $close = strpos($html, '>', $lt);
            $i = $close === false ? $n : $close + 1;
            continue;
        }
        if (!ctype_alpha($next)) {
            $i = $lt + 1;
            continue;
        }

        $j = $lt + 1;
        while ($j < $n && !ctype_space($html[$j]) && $html[$j] !== '>' && $html[$j] !== '/') {
            $j++;
        }
        $name = strtolower(substr($html, $lt + 1, $j - $lt - 1));
        $attrs = [];
        $selfClosing = false;

        while ($j < $n) {
            while ($j < $n && ctype_space($html[$j])) {
                $j++;
            }
            if ($j >= $n) {
                break;
            }
            if ($html[$j] === '>') {
                $j++;
                break;
            }
            if ($html[$j] === '/') {
                if (($html[$j + 1] ?? '') === '>') {
                    $selfClosing = true;
                    $j += 2;
                    break;
                }
                $j++;
                continue;
            }
            $nameStart = $j;
            while ($j < $n && !ctype_space($html[$j]) && !in_array($html[$j], ['=', '>', '/'], true)) {
                $j++;
            }
            $attrName = strtolower(substr($html, $nameStart, $j - $nameStart));
            if ($attrName === '') {
                $j++;
                continue;
            }
            $k = $j;
            while ($k < $n && ctype_space($html[$k])) {
                $k++;
            }
            if (($html[$k] ?? '') !== '=') {
                $attrs[] = ['name' => $attrName, 'start' => $nameStart, 'valueStart' => null, 'valueEnd' => null, 'quote' => '', 'end' => $j];
                continue;
            }
            $k++;
            while ($k < $n && ctype_space($html[$k])) {
                $k++;
            }
            $quote = $html[$k] ?? '';
            if ($quote === '"' || $quote === "'") {
                $valueStart = $k + 1;
                $valueEnd = strpos($html, $quote, $valueStart);
                if ($valueEnd === false) {
                    $valueEnd = $n;
                }
                $end = min($valueEnd + 1, $n);
                $attrs[] = ['name' => $attrName, 'start' => $nameStart, 'valueStart' => $valueStart, 'valueEnd' => $valueEnd, 'quote' => $quote, 'end' => $end];
                $j = $end;
            } else {
                $valueStart = $k;
                while ($k < $n && !ctype_space($html[$k]) && $html[$k] !== '>') {
                    $k++;
                }
                $attrs[] = ['name' => $attrName, 'start' => $nameStart, 'valueStart' => $valueStart, 'valueEnd' => $k, 'quote' => '', 'end' => $k];
                $j = $k;
            }
        }

        $tags[] = ['index' => count($tags), 'name' => $name, 'start' => $lt, 'end' => $j, 'selfClosing' => $selfClosing, 'attrs' => $attrs];
        $i = $j;

        if (!$selfClosing && in_array($name, BLUNT_RAW_TEXT_TAGS, true)) {
            $close = stripos($html, '</' . $name, $i);
            $i = $close === false ? $n : $close;
        }
    }
    return $tags;
}

function blunt_attr(array $tag, string $name): ?array
{
    foreach ($tag['attrs'] as $attr) {
        if ($attr['name'] === $name) {
            return $attr;
        }
    }
    return null;
}

/** Decoded attribute value; '' for valueless attributes; null for no attribute. */
function blunt_attr_value(string $html, ?array $attr): ?string
{
    if ($attr === null) {
        return null;
    }
    if ($attr['valueStart'] === null) {
        return '';
    }
    $raw = substr($html, $attr['valueStart'], $attr['valueEnd'] - $attr['valueStart']);
    return html_entity_decode($raw, ENT_QUOTES | ENT_HTML5, 'UTF-8');
}

/** Byte range of an element's content (between its start tag and matching close tag), or null. */
function blunt_content_range(string $html, array $tags, int $index): ?array
{
    $tag = $tags[$index];
    $name = $tag['name'];
    if ($tag['selfClosing'] || in_array($name, BLUNT_VOID_TAGS, true)) {
        return null;
    }
    $closeRe = '#</' . preg_quote($name, '#') . '\s*>#i';
    $depth = 1;
    $pos = $tag['end'];
    $nextOpen = $index + 1;
    $count = count($tags);
    while (preg_match($closeRe, $html, $m, PREG_OFFSET_CAPTURE, $pos) === 1) {
        $closeAt = $m[0][1];
        while ($nextOpen < $count && $tags[$nextOpen]['start'] < $closeAt) {
            if ($tags[$nextOpen]['name'] === $name && !$tags[$nextOpen]['selfClosing']) {
                $depth++;
            }
            $nextOpen++;
        }
        $depth--;
        if ($depth === 0) {
            return ['start' => $tag['end'], 'end' => $closeAt];
        }
        $pos = $closeAt + strlen($m[0][0]);
    }
    return null;
}

/** Map of data-blunt name => list of tag indices. */
function blunt_named(string $html, array $tags): array
{
    $out = [];
    foreach ($tags as $tag) {
        $value = blunt_attr_value($html, blunt_attr($tag, 'data-blunt'));
        if ($value !== null && $value !== '') {
            $out[$value][] = $tag['index'];
        }
    }
    return $out;
}
