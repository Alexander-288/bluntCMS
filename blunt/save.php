<?php
declare(strict_types=1);

require __DIR__ . '/lib.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new BluntError('Use POST.', 405);
    }
    if (!blunt_logged_in()) {
        throw new BluntError('You are logged out. Log in again in another tab, then save.', 401);
    }
    $input = json_decode((string) file_get_contents('php://input'), true);
    if (!is_array($input)) {
        throw new BluntError('Bad request.');
    }
    if (!blunt_check_csrf((string) ($input['csrf'] ?? ''))) {
        throw new BluntError('Your session expired. Reload the page.', 403);
    }

    $root = blunt_site_root();
    $config = blunt_config();
    $file = blunt_resolve($root, (string) ($input['page'] ?? ''), 'html');
    if ($file === null) {
        throw new BluntError("That page can't be edited.", 404);
    }
    $html = (string) file_get_contents($file);
    if (!hash_equals(hash('sha256', $html), (string) ($input['hash'] ?? ''))) {
        throw new BluntError('This page changed since you opened it. Reload to continue.', 409);
    }

    $changes = $input['changes'] ?? null;
    if (!is_array($changes)) {
        throw new BluntError('Bad request.');
    }

    $tokenFile = ($config['token_css'] ?? '') !== '' ? blunt_resolve($root, (string) $config['token_css'], 'css') : null;
    $css = $tokenFile !== null ? (string) file_get_contents($tokenFile) : null;
    $touchesTokens = in_array('token', array_map(fn ($c) => is_array($c) ? ($c['type'] ?? '') : '', $changes), true);
    if ($touchesTokens && $css !== null && !hash_equals(hash('sha256', $css), (string) ($input['tokenHash'] ?? ''))) {
        throw new BluntError('The token file changed since you opened this page. Reload to continue.', 409);
    }

    $out = blunt_apply_changes($html, $css, $changes, blunt_tier($config, blunt_cms_dir()));

    $backups = blunt_cms_dir() . '/backups';
    if ($out['html'] !== $html) {
        blunt_backup($file, $root, $backups);
        blunt_write_atomic($file, $out['html']);
    }
    if ($tokenFile !== null && $out['css'] !== $css) {
        blunt_backup($tokenFile, $root, $backups);
        blunt_write_atomic($tokenFile, (string) $out['css']);
    }

    echo json_encode([
        'ok' => true,
        'hash' => hash('sha256', $out['html']),
        'tokenHash' => $out['css'] !== null ? hash('sha256', $out['css']) : null,
        // Formatted text can add or remove tags, which shifts the element numbers the editor uses.
        'reload' => count(blunt_scan($out['html'])) !== count(blunt_scan($html)),
    ]);
} catch (BluntError $e) {
    http_response_code($e->status);
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Something went wrong on the server. Nothing was saved.']);
}
