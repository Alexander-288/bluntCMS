<?php
declare(strict_types=1);

const TINY_PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const TINY_GIF = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

function image_fixture(string $bytes): string
{
    $path = sys_get_temp_dir() . '/blunt-img-' . bin2hex(random_bytes(4));
    file_put_contents($path, $bytes);
    return $path;
}

function test_images_reads_real_images_by_content(): void
{
    assert_same(['ext' => 'png', 'width' => 1, 'height' => 1], blunt_image_info(image_fixture(base64_decode(TINY_PNG))));
    assert_same('gif', blunt_image_info(image_fixture(base64_decode(TINY_GIF)))['ext']);
    assert_throws(fn () => blunt_image_info(image_fixture('<?php echo 1;')), 'not an image');
    assert_throws(fn () => blunt_image_info(image_fixture('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')), 'not an image');
    assert_throws(fn () => blunt_image_info(image_fixture(base64_decode(TINY_PNG)), 10), 'too big');
}

function test_images_upload_names_are_safe_and_unique(): void
{
    assert_same('hero-photo-ab12cd34.jpg', blunt_upload_name('Hero Photo.JPG', 'jpg', 'ab12cd34ef'));
    assert_same('image-ab12cd34.png', blunt_upload_name('../../.htaccess', 'png', 'ab12cd34ef'));
    assert_same('evil-php-ab12cd34.png', blunt_upload_name('evil.php.png', 'png', 'ab12cd34ef'));
    assert_same(40, strlen(explode('-ab12cd34', blunt_upload_name(str_repeat('a', 90) . '.gif', 'gif', 'ab12cd34'))[0]));
}

function test_images_upload_dir_setting(): void
{
    assert_same('uploads', blunt_upload_dir([]));
    assert_same('assets/img', blunt_upload_dir(['upload_dir' => 'assets/img/']));
    assert_same('abs', blunt_upload_dir(['upload_dir' => '/abs']));
    foreach (['../outside', 'blunt/x', 'a/../b', '.hidden', 'sp ace'] as $bad) {
        assert_same('uploads', blunt_upload_dir(['upload_dir' => $bad]), $bad);
    }
}

function test_images_relative_url_from_the_page(): void
{
    assert_same('uploads/a.jpg', blunt_relative_url('', 'uploads/a.jpg'));
    assert_same('../uploads/a.jpg', blunt_relative_url('demo', 'uploads/a.jpg'));
    assert_same('../../uploads/a.jpg', blunt_relative_url('a/b', 'uploads/a.jpg'));
    assert_same('a.jpg', blunt_relative_url('uploads', 'uploads/a.jpg'));
    assert_same('../uploads/a.jpg', blunt_relative_url('demo/', 'uploads/a.jpg'));
}

function test_images_valid_urls(): void
{
    foreach (['uploads/a.jpg', '../img/b.png', '/img/c.webp', 'https://cdn.example.com/x.jpg', 'a-b_c.d.gif?v=2'] as $ok) {
        assert_true(blunt_valid_image_url($ok), $ok);
    }
    foreach (['', 'javascript:alert(1)', 'data:image/png;base64,xx', 'a b.jpg', 'a"b.jpg', "a'b.jpg", 'a(b).jpg', 'a\\b.jpg', str_repeat('a', 2049)] as $bad) {
        assert_same(false, blunt_valid_image_url($bad), $bad);
    }
}

const IMG_PAGE = '<!doctype html><body><img src="old.jpg" alt="Old" width="400" height="300"><img src="a.jpg" srcset="a2.jpg 2x"><p>x</p></body>';

function test_images_attr_changes_on_img(): void
{
    $out = blunt_apply_changes(IMG_PAGE, null, [
        ['type' => 'attr', 'id' => 1, 'name' => 'src', 'value' => 'uploads/new-1a2b3c4d.jpg'],
        ['type' => 'attr', 'id' => 1, 'name' => 'alt', 'value' => 'A "new" photo & more'],
        ['type' => 'attr', 'id' => 1, 'name' => 'height', 'value' => '225'],
    ], 'thick');
    assert_same(str_replace('<img src="old.jpg" alt="Old" width="400" height="300">', '<img src="uploads/new-1a2b3c4d.jpg" alt="A &quot;new&quot; photo &amp; more" width="400" height="225">', IMG_PAGE), $out['html']);
}

function test_images_attr_changes_are_checked(): void
{
    $one = fn (array $c, string $tier = 'thick') => blunt_apply_changes(IMG_PAGE, null, [$c + ['type' => 'attr']], $tier);
    assert_throws(fn () => $one(['id' => 1, 'name' => 'src', 'value' => 'x.jpg'], 'light'), 'not allowed');
    assert_throws(fn () => $one(['id' => 1, 'name' => 'onerror', 'value' => 'x']), 'not allowed');
    assert_throws(fn () => $one(['id' => 1, 'name' => 'src', 'value' => 'javascript:x']), 'not allowed');
    assert_throws(fn () => $one(['id' => 3, 'name' => 'src', 'value' => 'x.jpg']), 'only on images');
    assert_throws(fn () => $one(['id' => 2, 'name' => 'src', 'value' => 'x.jpg']), 'srcset');
    assert_throws(fn () => $one(['id' => 1, 'name' => 'width', 'value' => '40%']), 'not allowed');
    assert_throws(fn () => $one(['id' => 1, 'name' => 'alt', 'value' => str_repeat('a', 1001)]), 'not allowed');
    assert_throws(fn () => $one(['id' => 99, 'name' => 'alt', 'value' => 'x']), "doesn't exist");
}

function test_images_background_styles(): void
{
    foreach (["url('uploads/a.jpg')", 'url("../img/b.png")', 'url(uploads/c-1a2b.webp)', 'none'] as $ok) {
        assert_true(blunt_valid_style('background-image', $ok, 'thick'), $ok);
        assert_same(false, blunt_valid_style('background-image', $ok), "light: $ok");
    }
    foreach (['url(javascript:alert(1))', "url('a.jpg') , url('b.jpg')", 'url(a b.jpg)', 'url(a.jpg) x', "url('a.jpg\")", 'linear-gradient(red, blue)', "url('data:image/png;base64,x')"] as $bad) {
        assert_same(false, blunt_valid_style('background-image', $bad, 'thick'), $bad);
    }
    assert_true(blunt_valid_style('background-size', 'cover', 'thick'));
    assert_true(blunt_valid_style('background-position', 'center', 'thick'));
    assert_true(blunt_valid_style('background-repeat', 'no-repeat', 'thick'));
    assert_same(false, blunt_valid_style('background-size', '50% 50%', 'thick'));
}
