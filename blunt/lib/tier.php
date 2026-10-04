<?php
declare(strict_types=1);

/** The editor tier from config: a folder in blunt/ with a manifest.php. Falls back to light. */
function blunt_tier(array $config, string $cmsDir): string
{
    $tier = $config['tier'] ?? 'light';
    if (is_string($tier) && preg_match('/^[a-z]+$/', $tier) && is_file("$cmsDir/$tier/manifest.php")) {
        return $tier;
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
