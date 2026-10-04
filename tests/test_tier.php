<?php
declare(strict_types=1);

function tier_fixture(array $tiers): string
{
    $dir = sys_get_temp_dir() . '/blunt-tier-' . bin2hex(random_bytes(4));
    foreach ($tiers as $name => $manifest) {
        mkdir("$dir/$name", 0777, true);
        file_put_contents("$dir/$name/manifest.php", $manifest);
    }
    return $dir;
}

function test_tier_defaults_to_light(): void
{
    assert_same('light', blunt_tier([], blunt_cms_dir()));
}

function test_tier_falls_back_when_missing_or_unsafe(): void
{
    $dir = tier_fixture(['light' => '<?php return [];']);
    foreach (['nope', '../light', 'Light', '', 5] as $tier) {
        assert_same('light', blunt_tier(['tier' => $tier], $dir), var_export($tier, true));
    }
}

function test_tier_picks_existing_folder(): void
{
    $dir = tier_fixture(['light' => '<?php return [];', 'thick' => '<?php return [];']);
    assert_same('thick', blunt_tier(['tier' => 'thick'], $dir));
}

function test_tier_assets_light_keeps_load_order(): void
{
    $assets = blunt_tier_assets(blunt_cms_dir(), 'light');
    assert_same(['editor.css', 'light/light.css'], $assets['css']);
    assert_same([
        'js/core.js', 'js/tokens.js', 'light/toolbar.js', 'js/overlay.js', 'js/hover.js',
        'js/text.js', 'js/fill.js', 'js/picker.js', 'js/tooltip.js', 'js/fields.js', 'js/sections.js',
        'light/panel.js', 'js/main.js',
    ], $assets['js']);
    foreach (array_merge($assets['css'], $assets['js']) as $file) {
        assert_true(is_file(blunt_cms_dir() . '/' . $file), $file);
    }
}

function test_tier_assets_rejects_bad_manifest(): void
{
    $dir = tier_fixture(['bad' => '<?php return ["js" => "core.js"];']);
    assert_throws(fn () => blunt_tier_assets($dir, 'bad'), 'manifest');
}
