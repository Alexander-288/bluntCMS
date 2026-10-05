<?php
declare(strict_types=1);

/**
 * The editor tier: a folder in blunt/ with a manifest.php, picked by 'tier' in config.
 * Without a valid setting: Light if it's installed, otherwise whichever tier is (a release zip holds just one).
 */
function blunt_tier(array $config, string $cmsDir): string
{
    $tier = $config['tier'] ?? 'light';
    if (is_string($tier) && preg_match('/^[a-z]+$/', $tier) && is_file("$cmsDir/$tier/manifest.php")) {
        return $tier;
    }
    if (is_file("$cmsDir/light/manifest.php")) {
        return 'light';
    }
    foreach (glob("$cmsDir/*/manifest.php") ?: [] as $manifest) {
        $name = basename(dirname($manifest));
        if (preg_match('/^[a-z]+$/', $name)) {
            return $name;
        }
    }
    return 'light';
}

/** The tier's CSS and JS files, in load order, relative to blunt/. */
function blunt_tier_assets(string $cmsDir, string $tier): array
{
    $manifest = require "$cmsDir/$tier/manifest.php";
    $assets = [];
    foreach (['css', 'js'] as $kind) {
        $list = $manifest[$kind] ?? null;
        if (!is_array($list) || !array_is_list($list) || array_filter($list, fn ($f) => !is_string($f))) {
            throw new BluntError("The $tier manifest needs a list of $kind files.", 500);
        }
        $assets[$kind] = $list;
    }
    return $assets;
}

/** The installed tier's version, shown on the login and setup pages. */
function blunt_version(): string
{
    $dir = blunt_cms_dir();
    return blunt_tier_version($dir, blunt_tier(blunt_config(), $dir));
}

/** The tier's version, e.g. "2.0.0-Thick" ('' if its manifest has none). */
function blunt_tier_version(string $cmsDir, string $tier): string
{
    $manifest = require "$cmsDir/$tier/manifest.php";
    return is_string($manifest['version'] ?? null) ? $manifest['version'] : '';
}
