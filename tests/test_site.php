<?php
declare(strict_types=1);

function site_fixture(): string
{
    $root = sys_get_temp_dir() . '/blunt-site-' . bin2hex(random_bytes(4));
    $files = [
        'index.html' => '<title>Home &amp; more</title>',
        'about.html' => '<html><head><title>
            About us </title></head></html>',
        'sub/deep/page.html' => '<p>no title</p>',
        'notes.txt' => 'x',
        'old.htm' => 'x',
        'blunt/edit.html' => 'x',
        '.hidden/secret.html' => 'x',
        'sub/.drafts/draft.html' => 'x',
    ];
    foreach ($files as $rel => $content) {
        @mkdir(dirname("$root/$rel"), 0777, true);
        file_put_contents("$root/$rel", $content);
    }
    return $root;
}

function test_site_lists_editable_pages(): void
{
    assert_same(['about.html', 'index.html', 'sub/deep/page.html'], blunt_list_pages(site_fixture()));
}

function test_site_page_titles(): void
{
    assert_same('Home & more', blunt_page_title('<title>Home &amp; more</title>'));
    assert_same('About us', blunt_page_title("<TITLE>\n  About us </TITLE>"));
    assert_same(null, blunt_page_title('<p>none</p>'));
}

function test_site_backup_slug_matches_backups(): void
{
    assert_same('demo_index_html', blunt_backup_slug('demo/index.html'));
    $root = site_fixture();
    $dir = "$root/blunt/backups";
    blunt_backup("$root/sub/deep/page.html", $root, $dir);
    $files = glob("$dir/*.bak");
    assert_same(1, count($files));
    assert_true(str_starts_with(basename($files[0]), blunt_backup_slug('sub/deep/page.html') . '.'));
}

function test_site_lists_backups_newest_first(): void
{
    $dir = sys_get_temp_dir() . '/blunt-bak-' . bin2hex(random_bytes(4));
    mkdir($dir);
    foreach (['index_html.20261003-064453-197678.bak', 'index_html.20261004-120000-000001.bak', 'index_html.20261004-120000-000001-1.bak', 'about_html.20261005-000000-000000.bak', 'index_html.junk.bak'] as $f) {
        file_put_contents("$dir/$f", 'x');
    }
    $list = blunt_list_backups($dir, 'index.html');
    assert_same(['index_html.20261004-120000-000001-1.bak', 'index_html.20261004-120000-000001.bak', 'index_html.20261003-064453-197678.bak'], array_column($list, 'id'));
    assert_same('2026-10-04T12:00:00', $list[1]['time']);
}

function test_site_backup_ids_are_checked(): void
{
    $dir = sys_get_temp_dir() . '/blunt-bak-' . bin2hex(random_bytes(4));
    mkdir($dir);
    file_put_contents("$dir/index_html.20261004-120000-000001.bak", 'old');
    file_put_contents("$dir/about_html.20261004-120000-000001.bak", 'other');
    assert_same("$dir/index_html.20261004-120000-000001.bak", blunt_backup_path($dir, 'index.html', 'index_html.20261004-120000-000001.bak'));
    foreach (['about_html.20261004-120000-000001.bak', '../index_html.20261004-120000-000001.bak', 'index_html.20261004-120000-000002.bak', 'index_html.x.bak', ''] as $bad) {
        assert_same(null, blunt_backup_path($dir, 'index.html', $bad), $bad);
    }
}

function test_site_restore_backs_up_first(): void
{
    $root = site_fixture();
    $dir = "$root/blunt/backups";
    mkdir($dir);
    file_put_contents("$dir/index_html.20261001-000000-000000.bak", '<title>Old</title>');
    blunt_restore_backup($root, "$root/index.html", $dir, 'index_html.20261001-000000-000000.bak');
    assert_same('<title>Old</title>', file_get_contents("$root/index.html"));
    $saved = array_values(array_filter(glob("$dir/index_html.*.bak"), fn ($f) => file_get_contents($f) === '<title>Home &amp; more</title>'));
    assert_same(1, count($saved), 'the current version was kept as a backup');
    assert_throws(fn () => blunt_restore_backup($root, "$root/index.html", $dir, 'nope.bak'), 'not found');
}

function test_site_lines_changed(): void
{
    assert_same(0, blunt_lines_changed("a\nb\nc", "a\nb\nc"));
    assert_same(2, blunt_lines_changed("a\nb\nc", "a\nB\nc"));
    assert_same(1, blunt_lines_changed("a\nb", "a\nb\nc"));
}
