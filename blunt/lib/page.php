<?php
declare(strict_types=1);

const BLUNT_EDITOR_SCRIPTS = ['core.js', 'tokens.js', 'toolbar.js', 'overlay.js', 'hover.js', 'text.js', 'fill.js', 'panel.js', 'main.js'];

/**
 * Resolves an href found on $pageRel to a site-relative .html path.
 * Returns ['path' => ..., 'fragment' => '#...'|''] or null for anything that
 * is not an internal page link.
 */
function blunt_resolve_link(string $href, string $pageRel, string $siteBase): ?array
{
    $href = trim($href);
    if ($href === '' || $href[0] === '#' || str_starts_with($href, '//') || preg_match('/^[a-z][a-z0-9+.-]*:/i', $href) === 1) {
        return null;
    }
    $fragment = '';
    $hash = strpos($href, '#');
    if ($hash !== false) {
        $fragment = substr($href, $hash);
        $href = substr($href, 0, $hash);
    }
    $query = strpos($href, '?');
    if ($query !== false) {
        $href = substr($href, 0, $query);
    }
    if ($href === '') {
        return ['path' => $pageRel, 'fragment' => $fragment];
    }
    if ($href[0] === '/') {
        if ($siteBase !== '') {
            if ($href !== $siteBase && !str_starts_with($href, $siteBase . '/')) {
                return null;
            }
            $href = substr($href, strlen($siteBase));
        }
        $path = ltrim($href, '/');
    } else {
        $dir = dirname($pageRel);
        $path = ($dir === '.' ? '' : $dir . '/') . $href;
    }
    if ($path === '' || str_ends_with($path, '/')) {
        $path .= 'index.html';
    }
    $parts = [];
    foreach (explode('/', $path) as $segment) {
        if ($segment === '' || $segment === '.') {
            continue;
        }
        if ($segment === '..') {
            if ($parts === []) {
                return null;
            }
            array_pop($parts);
            continue;
        }
        $parts[] = $segment;
    }
    $path = rawurldecode(implode('/', $parts));
    if (!str_ends_with(strtolower($path), '.html')) {
        return null;
    }
    return ['path' => $path, 'fragment' => $fragment];
}

function blunt_edit_url(string $cmsUrl, string $path, string $fragment = ''): string
{
    return $cmsUrl . '/edit.php?page=' . str_replace('%2F', '/', rawurlencode($path)) . $fragment;
}

/**
 * Returns the page as served inside the editor: every start tag gets a
 * data-blunt-id, internal links point back into edit.php (original kept in
 * data-blunt-href), a <base> makes relative assets work, and the editor is
 * injected before </body>. The file on disk is never changed.
 *
 * $opts: siteBase (URL path of the site root, '' at domain root),
 *        cmsUrl (URL path of blunt/), boot (array passed to window.BLUNT)
 */
function blunt_prepare_page(string $html, string $pageRel, array $opts): string
{
    $tags = blunt_scan($html);
    $edits = [];
    $head = null;

    foreach ($tags as $tag) {
        $insert = ' data-blunt-id="' . $tag['index'] . '"';
        if ($tag['name'] === 'a') {
            $href = blunt_attr($tag, 'href');
            $value = blunt_attr_value($html, $href);
            $link = $value === null ? null : blunt_resolve_link($value, $pageRel, $opts['siteBase']);
            if ($link !== null) {
                $insert .= ' data-blunt-href="' . blunt_escape_attr((string) $value) . '"';
                $edits[] = blunt_set_attr_edit($html, $tag, 'href', blunt_edit_url($opts['cmsUrl'], $link['path'], $link['fragment']));
            }
        }
        if ($tag['name'] === 'head' && $head === null) {
            $head = $tag;
        }
        $at = $tag['start'] + 1 + strlen($tag['name']);
        $edits[] = [$at, $at, $insert];
    }

    $dir = dirname($pageRel);
    $base = '<base href="' . blunt_escape_attr($opts['siteBase'] . '/' . ($dir === '.' ? '' : $dir . '/')) . '">';
    $baseAt = $head !== null ? $head['end'] : ($tags[0]['start'] ?? 0);
    $edits[] = [$baseAt, $baseAt, $base];

    $cms = blunt_escape_attr($opts['cmsUrl']);
    $json = json_encode($opts['boot'], JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    $boot = "\n<link rel=\"stylesheet\" href=\"$cms/editor.css\">\n<script>window.BLUNT = $json;</script>\n";
    foreach (BLUNT_EDITOR_SCRIPTS as $script) {
        $boot .= "<script src=\"$cms/js/$script\"></script>\n";
    }
    $bodyEnd = strripos($html, '</body');
    $bodyAt = $bodyEnd === false ? strlen($html) : $bodyEnd;
    $edits[] = [$bodyAt, $bodyAt, $boot];

    return blunt_apply_edits($html, $edits);
}
