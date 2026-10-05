<?php
declare(strict_types=1);

// BluntCMS Thick: receives one image, stores it in the uploads folder and answers with its address relative to the page.

require __DIR__ . '/../lib.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new BluntError('Use POST.', 405);
    }
    if (!blunt_logged_in()) {
        throw new BluntError('You are logged out. Log in again in another tab, then try again.', 401);
    }
    if (!blunt_check_csrf((string) ($_POST['csrf'] ?? ''))) {
        throw new BluntError('Your session expired. Reload the page.', 403);
    }
    $config = blunt_config();
    if (blunt_tier($config, blunt_cms_dir()) !== 'thick') {
        throw new BluntError('Image uploads come with BluntCMS Thick.', 403);
    }

    $root = blunt_site_root();
    $page = blunt_resolve($root, (string) ($_POST['page'] ?? ''), 'html');
    if ($page === null) {
        throw new BluntError("That page can't be edited.", 404);
    }

    $file = $_FILES['image'] ?? null;
    $error = is_array($file) ? (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE) : UPLOAD_ERR_NO_FILE;
    if ($error === UPLOAD_ERR_INI_SIZE || $error === UPLOAD_ERR_FORM_SIZE) {
        throw new BluntError("That image is bigger than this server accepts (PHP's upload_max_filesize).", 413);
    }
    if ($error !== UPLOAD_ERR_OK || !is_uploaded_file((string) $file['tmp_name'])) {
        throw new BluntError('No image arrived. Try again.');
    }
    $tmp = (string) $file['tmp_name'];
    $info = blunt_image_info($tmp);

    $dir = blunt_upload_dir($config);
    $abs = $root . '/' . $dir;
    if (!is_dir($abs) && !mkdir($abs, 0755, true) && !is_dir($abs)) {
        throw new BluntError("Could not create the uploads folder \"$dir\". Check folder permissions.", 500);
    }
    $name = blunt_upload_name((string) ($file['name'] ?? ''), $info['ext'], (string) hash_file('sha256', $tmp));
    $target = "$abs/$name";
    // Same name means same content (the hash is in it), so an existing file is simply reused.
    if (!is_file($target) && !move_uploaded_file($tmp, $target)) {
        throw new BluntError('Could not store the image. Check folder permissions.', 500);
    }

    $pageDir = dirname(blunt_relpath($root, $page));
    echo json_encode([
        'ok' => true,
        'url' => blunt_relative_url($pageDir === '.' ? '' : $pageDir, "$dir/$name"),
        'width' => $info['width'],
        'height' => $info['height'],
        'name' => $name,
    ]);
} catch (BluntError $e) {
    http_response_code($e->status);
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Something went wrong on the server. Nothing was uploaded.']);
}
