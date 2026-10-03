<?php
declare(strict_types=1);

/** Absolute path of the blunt/ folder. */
function blunt_cms_dir(): string
{
    return dirname(__DIR__);
}

/** The site root is the folder that contains blunt/. */
function blunt_site_root(): string
{
    return dirname(blunt_cms_dir());
}

/**
 * Resolves a site-relative path to an absolute file path, or null if it is
 * missing, outside the root, inside the CMS folder, hidden, or the wrong type.
 */
function blunt_resolve(string $root, string $rel, string $ext, string $cmsDirName = 'blunt'): ?string
{
    if ($rel === '' || str_contains($rel, "\0")) {
        return null;
    }
    if (strtolower(pathinfo($rel, PATHINFO_EXTENSION)) !== $ext) {
        return null;
    }
    $rootReal = realpath($root);
    if ($rootReal === false) {
        return null;
    }
    $full = realpath($rootReal . DIRECTORY_SEPARATOR . ltrim($rel, '/\\'));
    if ($full === false || !is_file($full)) {
        return null;
    }
    $prefix = $rootReal . DIRECTORY_SEPARATOR;
    if (!str_starts_with($full, $prefix)) {
        return null;
    }
    $segments = preg_split('#[\\\\/]#', substr($full, strlen($prefix))) ?: [];
    if (strcasecmp($segments[0] ?? '', $cmsDirName) === 0) {
        return null;
    }
    foreach ($segments as $segment) {
        if (str_starts_with($segment, '.')) {
            return null;
        }
    }
    return $full;
}

/** Site-relative path with forward slashes, e.g. "sub/page.html". */
function blunt_relpath(string $root, string $full): string
{
    $rootReal = (string) realpath($root);
    return str_replace('\\', '/', substr($full, strlen($rootReal) + 1));
}
