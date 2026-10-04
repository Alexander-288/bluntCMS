<?php
declare(strict_types=1);

/** Inline tags rich text may use (Thick). Links carry only an href. */
const BLUNT_RICH_TAGS = ['strong', 'b', 'em', 'i', 'u', 's', 'a', 'br'];
const BLUNT_RICH_MAX_DEPTH = 6;

/**
 * Builds HTML from a rich-text tree sent by the editor. The browser never sends HTML.
 * A node is a string (text) or ['tag' => one of BLUNT_RICH_TAGS, 'href' => for a, 'children' => [nodes]].
 * Throws BluntError on anything else.
 */
function blunt_rich_html(array $nodes): string
{
    $budget = 10000; // characters of text, same limit as plain text
    return blunt_rich_nodes($nodes, 0, false, $budget);
}

function blunt_rich_nodes(array $nodes, int $depth, bool $inLink, int &$budget): string
{
    if (!array_is_list($nodes) || $depth > BLUNT_RICH_MAX_DEPTH) {
        throw new BluntError('The formatted text is malformed or nested too deeply.');
    }
    $out = '';
    foreach ($nodes as $node) {
        if (is_string($node)) {
            if (preg_match('//u', $node) !== 1) {
                throw new BluntError('The formatted text is not valid text.');
            }
            $budget -= (int) preg_match_all('/./su', $node); // characters, without needing mbstring
            if ($budget < 0) {
                throw new BluntError('The formatted text is too long.');
            }
            $out .= htmlspecialchars($node, ENT_NOQUOTES | ENT_HTML5, 'UTF-8');
            continue;
        }
        $tag = is_array($node) ? ($node['tag'] ?? null) : null;
        if (!is_string($tag) || !in_array($tag, BLUNT_RICH_TAGS, true)) {
            throw new BluntError('The formatted text uses something that is not allowed.');
        }
        $children = $node['children'] ?? [];
        if (!is_array($children)) {
            throw new BluntError('The formatted text is malformed.');
        }
        if ($tag === 'br') {
            if ($children !== []) {
                throw new BluntError('The formatted text is malformed.');
            }
            $out .= '<br>';
            continue;
        }
        $open = "<$tag>";
        if ($tag === 'a') {
            $href = $node['href'] ?? null;
            if ($inLink || !is_string($href) || trim($href) === '' || !blunt_valid_href($href)) {
                throw new BluntError('A link in the formatted text is not allowed.');
            }
            $open = '<a href="' . blunt_escape_attr(trim($href)) . '">';
        }
        $out .= $open . blunt_rich_nodes($children, $depth + 1, $inLink || $tag === 'a', $budget) . "</$tag>";
    }
    return $out;
}

/** Whether an element's current content is plain text plus the rich tags (no other attributes, comments or tags). */
function blunt_rich_editable(string $content): bool
{
    if (preg_match_all('/<[^>]*>?/', $content, $m) === false) {
        return false;
    }
    foreach ($m[0] as $tag) {
        $ok = preg_match('#^</?(strong|b|em|i|u|s)>$#i', $tag)
            || preg_match('#^<br\s*/?>$#i', $tag)
            || preg_match('#^<a\s+href\s*=\s*("[^"<]*"|\'[^\'<]*\')\s*>$#i', $tag)
            || preg_match('#^</a>$#i', $tag);
        if (!$ok) {
            return false;
        }
    }
    return true;
}
