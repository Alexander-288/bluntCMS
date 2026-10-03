<?php
declare(strict_types=1);

require __DIR__ . '/lib.php';

$config = blunt_config();
if (empty($config['password_hash'])) {
    header('Location: setup.php');
    exit;
}

$page = (string) ($_GET['page'] ?? 'index.html');
if (!blunt_logged_in()) {
    header('Location: login.php?return=' . rawurlencode('edit.php?page=' . $page));
    exit;
}

$root = blunt_site_root();
$file = blunt_resolve($root, $page, 'html');
if ($file === null) {
    http_response_code(404);
    blunt_render('Page not found', '<p>That page can\'t be edited. Only <code>.html</code> files inside the site folder can.</p><p><a href="edit.php">Edit index.html</a></p>');
    exit;
}

$html = (string) file_get_contents($file);
$pageRel = blunt_relpath($root, $file);
$cmsUrl = rtrim(str_replace('\\', '/', dirname((string) $_SERVER['SCRIPT_NAME'])), '/');
$siteBase = rtrim(str_replace('\\', '/', dirname($cmsUrl)), '/');

$tokenFile = ($config['token_css'] ?? '') !== '' ? blunt_resolve($root, (string) $config['token_css'], 'css') : null;
$css = $tokenFile !== null ? (string) file_get_contents($tokenFile) : null;

$duplicates = array_keys(array_filter(blunt_named($html, blunt_scan($html)), fn (array $ids) => count($ids) > 1));

$boot = [
    'page' => $pageRel,
    'hash' => hash('sha256', $html),
    'tokenHash' => $css !== null ? hash('sha256', $css) : null,
    'csrf' => blunt_csrf(),
    'tokens' => $css !== null ? blunt_token_names($css) : [],
    'duplicates' => array_map('strval', $duplicates),
    'saveUrl' => $cmsUrl . '/save.php',
    'viewUrl' => $siteBase . '/' . $pageRel,
];

header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-store');
echo blunt_prepare_page($html, $pageRel, ['siteBase' => $siteBase, 'cmsUrl' => $cmsUrl, 'boot' => $boot]);
