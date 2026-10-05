<?php
declare(strict_types=1);

// Usage: php tools/build.php thick   → dist/bluntcms-2.0.0-thick.zip (version from the tier manifest)
// Zips blunt/ with only the chosen tier's UI folder, without config, data or backups.

require __DIR__ . '/../blunt/lib.php';

$tier = $argv[1] ?? '';
$src = blunt_cms_dir();
if (!preg_match('/^[a-z]+$/', $tier) || !is_file("$src/$tier/manifest.php")) {
    fwrite(STDERR, "Usage: php tools/build.php <tier>  (a folder in blunt/ with manifest.php)\n");
    exit(1);
}

$tiers = array_map(fn ($m) => basename(dirname($m)), glob("$src/*/manifest.php") ?: []);
$skip = function (string $rel) use ($tiers, $tier): bool {
    $top = explode('/', $rel)[0];
    return $rel === 'config.php'
        || (in_array($top, ['data', 'backups'], true) && basename($rel) !== '.htaccess')
        || (in_array($top, $tiers, true) && $top !== $tier);
};

$dist = dirname(__DIR__) . '/dist';
if (!is_dir($dist)) {
    mkdir($dist);
}
$out = "$dist/bluntcms-" . strtolower(blunt_tier_version($src, $tier) ?: $tier) . '.zip';
if (is_file($out)) {
    unlink($out);
}
$zip = new PharData($out, 0, null, Phar::ZIP);

// Only files git tracks, so local and ignored files never ship.
$tracked = shell_exec('git -C ' . escapeshellarg(dirname(__DIR__)) . ' ls-files -z blunt');
if (!is_string($tracked) || $tracked === '') {
    fwrite(STDERR, "Could not list files with git. Run this from a git checkout.\n");
    exit(1);
}
$count = 0;
foreach (array_filter(explode("\0", $tracked)) as $path) {
    $rel = substr($path, strlen('blunt/'));
    if ($skip($rel) || !is_file("$src/$rel")) {
        continue;
    }
    $zip->addFile("$src/$rel", "blunt/$rel");
    $count++;
}
echo "$count files → $out\n";
