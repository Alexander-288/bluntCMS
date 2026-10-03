<?php
declare(strict_types=1);

function test_files_atomic_write_leaves_no_temp_file(): void
{
    $root = make_site();
    blunt_write_atomic("$root/index.html", 'new');
    assert_same('new', file_get_contents("$root/index.html"));
    assert_same(false, file_exists("$root/index.html.blunt-tmp"));
}

function test_files_backup_keeps_newest_ten(): void
{
    $root = make_site();
    $dir = "$root/blunt/backups";
    for ($i = 1; $i <= 12; $i++) {
        file_put_contents("$root/index.html", "v$i");
        blunt_backup("$root/index.html", $root, $dir);
    }
    $files = glob("$dir/index_html.*.bak");
    sort($files);
    assert_same(10, count($files));
    assert_same('v3', file_get_contents($files[0]));
    assert_same('v12', file_get_contents($files[9]));
}

function test_files_backup_slugs_keep_pages_apart(): void
{
    $root = make_site();
    $dir = "$root/blunt/backups";
    blunt_backup("$root/index.html", $root, $dir);
    blunt_backup("$root/sub/page.html", $root, $dir);
    assert_same(1, count(glob("$dir/index_html.*.bak")));
    assert_same(1, count(glob("$dir/sub_page_html.*.bak")));
}
