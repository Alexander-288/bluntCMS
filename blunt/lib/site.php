<?php
declare(strict_types=1);

// Pages and history (Thick): which pages exist, and the backups of each.

/** Site-relative paths of every editable .html page (not in blunt/ or hidden folders), sorted. */
function blunt_list_pages(string $root, string $cmsDirName = 'blunt', int $limit = 500): array
{
    $rootReal = realpath($root);
    if ($rootReal === false) {
        return [];
    }
    $skip = function (SplFileInfo $f) use ($rootReal, $cmsDirName): bool {
        $rel = substr($f->getPathname(), strlen($rootReal) + 1);
        $first = preg_split('#[\\\\/]#', $rel)[0];
        return str_starts_with($f->getFilename(), '.') || ($f->isDir() && strcasecmp($first, $cmsDirName) === 0 && $rel === $first);
    };
    $dirs = new RecursiveCallbackFilterIterator(
        new RecursiveDirectoryIterator($rootReal, FilesystemIterator::SKIP_DOTS),
        fn (SplFileInfo $f) => !$skip($f),
    );
    $pages = [];
    foreach (new RecursiveIteratorIterator($dirs) as $file) {
        if (strtolower($file->getExtension()) === 'html') {
            $pages[] = str_replace('\\', '/', substr($file->getPathname(), strlen($rootReal) + 1));
            if (count($pages) >= $limit) {
                break;
            }
        }
    }
    sort($pages);
    return $pages;
}

/** The text of a page's <title>, or null. */
function blunt_page_title(string $html): ?string
{
    if (preg_match('#<title[^>]*>(.*?)</title>#is', $html, $m) !== 1) {
        return null;
    }
    $title = trim((string) preg_replace('/\s+/', ' ', html_entity_decode($m[1], ENT_QUOTES | ENT_HTML5, 'UTF-8')));
    return $title !== '' ? $title : null;
}

/** "demo/index.html" → "demo_index_html", the prefix of that file's backups. */
function blunt_backup_slug(string $rel): string
{
    return (string) preg_replace('/[^a-zA-Z0-9]+/', '_', $rel);
}

/** A page's backups, newest first: [['id' => file name, 'time' => '2026-10-04T12:00:00', 'size' => bytes]]. */
function blunt_list_backups(string $dir, string $rel): array
{
    $slug = blunt_backup_slug($rel);
    $out = [];
    foreach (glob($dir . '/' . $slug . '.*.bak') ?: [] as $path) {
        $id = basename($path);
        if (!preg_match('/^' . preg_quote($slug, '/') . '\.(\d{8})-(\d{6})-\d{6}(-\d+)?\.bak$/', $id, $m)) {
            continue;
        }
        $t = DateTimeImmutable::createFromFormat('Ymd His', "$m[1] $m[2]");
        // Sort key: the stamp, then the "-1", "-2"… counter blunt_backup adds within the same microsecond.
        $key = substr($id, strlen($slug) + 1, 22) . sprintf('%06d', (int) ltrim($m[3] ?? '', '-'));
        $out[] = ['id' => $id, 'time' => $t ? $t->format('Y-m-d\TH:i:s') : '', 'size' => (int) filesize($path), 'key' => $key];
    }
    usort($out, fn ($a, $b) => strcmp($b['key'], $a['key']));
    return array_map(function ($b) {
        unset($b['key']);
        return $b;
    }, $out);
}

/** The full path of one of this page's backups, or null if the id is not one of them. */
function blunt_backup_path(string $dir, string $rel, string $id): ?string
{
    foreach (blunt_list_backups($dir, $rel) as $backup) {
        if ($backup['id'] === $id) {
            return $dir . '/' . $id;
        }
    }
    return null;
}

/** Puts a backup back. The current file is backed up first, so a restore can be undone the same way. */
function blunt_restore_backup(string $root, string $file, string $dir, string $id): void
{
    $path = blunt_backup_path($dir, blunt_relpath($root, (string) realpath($file)), $id);
    if ($path === null) {
        throw new BluntError('That version was not found. It may have been cleaned up.', 404);
    }
    $content = (string) file_get_contents($path);
    blunt_backup($file, $root, $dir);
    blunt_write_atomic($file, $content);
}

/** Roughly how many lines differ between two versions (lines only in one of them). */
function blunt_lines_changed(string $a, string $b): int
{
    $count = fn (string $s) => array_count_values(preg_split('/\r\n|\n/', $s) ?: []);
    $x = $count($a);
    $y = $count($b);
    $n = 0;
    foreach ($x + $y as $line => $_) {
        $n += abs(($x[$line] ?? 0) - ($y[$line] ?? 0));
    }
    return $n;
}
