<?php
declare(strict_types=1);

// BluntCMS Thick: the page list and a page's history.
// GET ?action=pages · GET ?action=history&page=… · POST {action: "restore", page, id, csrf}

require __DIR__ . '/../lib.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

try {
    if (!blunt_logged_in()) {
        throw new BluntError('You are logged out. Log in again in another tab.', 401);
    }
    $config = blunt_config();
    if (blunt_tier($config, blunt_cms_dir()) !== 'thick') {
        throw new BluntError('Pages and history come with BluntCMS Thick.', 403);
    }
    $root = blunt_site_root();
    $backups = blunt_cms_dir() . '/backups';
    $post = $_SERVER['REQUEST_METHOD'] === 'POST';
    $input = $post ? json_decode((string) file_get_contents('php://input'), true) : $_GET;
    if (!is_array($input)) {
        throw new BluntError('Bad request.');
    }
    $action = (string) ($input['action'] ?? '');
    $page = function () use ($root, $input): string {
        $file = blunt_resolve($root, (string) ($input['page'] ?? ''), 'html');
        if ($file === null) {
            throw new BluntError("That page can't be edited.", 404);
        }
        return $file;
    };

    if ($action === 'pages' && !$post) {
        $pages = array_map(function (string $rel) use ($root) {
            $head = (string) file_get_contents("$root/$rel", false, null, 0, 8192); // the title is near the top
            return ['path' => $rel, 'title' => blunt_page_title($head)];
        }, blunt_list_pages($root));
        echo json_encode(['ok' => true, 'pages' => $pages]);
    } elseif ($action === 'history' && !$post) {
        $file = $page();
        $current = (string) file_get_contents($file);
        $list = array_map(function (array $b) use ($backups, $current) {
            return $b + ['changed' => blunt_lines_changed((string) file_get_contents("$backups/{$b['id']}"), $current)];
        }, blunt_list_backups($backups, blunt_relpath($root, $file)));
        echo json_encode(['ok' => true, 'backups' => $list]);
    } elseif ($action === 'restore' && $post) {
        if (!blunt_check_csrf((string) ($input['csrf'] ?? ''))) {
            throw new BluntError('Your session expired. Reload the page.', 403);
        }
        blunt_restore_backup($root, $page(), $backups, (string) ($input['id'] ?? ''));
        echo json_encode(['ok' => true]);
    } else {
        throw new BluntError('Unknown request.', 400);
    }
} catch (BluntError $e) {
    http_response_code($e->status);
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Something went wrong on the server. Nothing was changed.']);
}
