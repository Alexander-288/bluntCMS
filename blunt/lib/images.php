<?php
declare(strict_types=1);

/** Image types Thick accepts, checked by content. No SVG: it can carry scripts. */
const BLUNT_IMAGE_TYPES = [
    IMAGETYPE_JPEG => 'jpg',
    IMAGETYPE_PNG => 'png',
    IMAGETYPE_GIF => 'gif',
    IMAGETYPE_WEBP => 'webp',
    IMAGETYPE_AVIF => 'avif',
];
const BLUNT_IMAGE_MAX_BYTES = 8 * 1024 * 1024;

/** Reads a file's real image type and size, or throws. */
function blunt_image_info(string $path, int $maxBytes = BLUNT_IMAGE_MAX_BYTES): array
{
    $size = @filesize($path);
    if ($size === false || $size === 0) {
        throw new BluntError('The upload is empty.');
    }
    if ($size > $maxBytes) {
        throw new BluntError('That image is too big. The limit is ' . round($maxBytes / 1048576) . ' MB.', 413);
    }
    $info = @getimagesize($path);
    if ($info === false || !isset(BLUNT_IMAGE_TYPES[$info[2]])) {
        throw new BluntError('That file is not an image BluntCMS accepts. Use JPG, PNG, GIF, WebP or AVIF.', 415);
    }
    return ['ext' => BLUNT_IMAGE_TYPES[$info[2]], 'width' => (int) $info[0], 'height' => (int) $info[1]];
}

/** "Hero Photo.JPG" → "hero-photo-<hash8>.jpg". The extension always comes from the content. */
function blunt_upload_name(string $original, string $ext, string $hash): string
{
    $base = strtolower(pathinfo(basename(str_replace('\\', '/', $original)), PATHINFO_FILENAME));
    $slug = trim((string) preg_replace('/[^a-z0-9]+/', '-', $base), '-');
    $slug = rtrim(substr($slug, 0, 40), '-');
    return ($slug !== '' ? $slug : 'image') . '-' . substr($hash, 0, 8) . '.' . $ext;
}

/** The site-relative uploads folder from config ('upload_dir'), default "uploads". Never outside the site or inside blunt/. */
function blunt_upload_dir(array $config): string
{
    $dir = trim((string) ($config['upload_dir'] ?? ''), '/');
    $ok = $dir !== ''
        && preg_match('#^[A-Za-z0-9_-]+(/[A-Za-z0-9_-]+)*$#', $dir) === 1
        && strcasecmp(explode('/', $dir)[0], 'blunt') !== 0;
    return $ok ? $dir : 'uploads';
}

/** Path from a page's folder ("demo", "" for the root) to a site-relative file. */
function blunt_relative_url(string $fromDir, string $toPath): string
{
    $from = array_values(array_filter(explode('/', trim($fromDir, '/')), fn ($s) => $s !== ''));
    $to = explode('/', trim($toPath, '/'));
    while ($from && count($to) > 1 && $from[0] === $to[0]) {
        array_shift($from);
        array_shift($to);
    }
    return str_repeat('../', count($from)) . implode('/', $to);
}

/** An image address that is safe in src="" and in url('') : no spaces, quotes, brackets or script schemes. */
function blunt_valid_image_url(string $url): bool
{
    return $url !== '' && strlen($url) <= 2048
        && preg_match('#^[^\s"\'()\\\\<>]+$#', $url) === 1
        && blunt_valid_href($url)
        && !preg_match('#^\s*data:#i', $url);
}
