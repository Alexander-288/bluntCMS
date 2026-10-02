<?php
declare(strict_types=1);

require __DIR__ . '/lib.php';

if (!empty(blunt_config()['password_hash'])) {
    http_response_code(403);
    blunt_render('Already set up', '<p>BluntCMS is already set up.</p><p class="hint">To reset the password, delete <code>blunt/config.php</code> and open this page again.</p>');
    exit;
}

blunt_session();
$error = null;
$tokenCss = trim((string) ($_POST['token_css'] ?? 'css/tokens.css'));

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $password = (string) ($_POST['password'] ?? '');
    if (!blunt_check_csrf((string) ($_POST['csrf'] ?? ''))) {
        $error = 'Your session expired. Try again.';
    } elseif (strlen($password) < 8) {
        $error = 'Use at least 8 characters.';
    } elseif ($password !== (string) ($_POST['confirm'] ?? '')) {
        $error = "The passwords don't match.";
    } elseif ($tokenCss !== '' && blunt_resolve(blunt_site_root(), $tokenCss, 'css') === null) {
        $error = 'Token file not found. Leave it empty if you have none.';
    } else {
        blunt_write_config(blunt_config_path(), [
            'password_hash' => password_hash($password, PASSWORD_DEFAULT),
            'token_css' => $tokenCss,
        ]);
        header('Location: login.php');
        exit;
    }
}

blunt_render('Set up BluntCMS', ($error !== null ? '<p class="error">' . e($error) . '</p>' : '')
    . '<form method="post">'
    . '<input type="hidden" name="csrf" value="' . e(blunt_csrf()) . '">'
    . '<label>Password<input type="password" name="password" autocomplete="new-password" required minlength="8"></label>'
    . '<label>Confirm password<input type="password" name="confirm" autocomplete="new-password" required minlength="8"></label>'
    . '<label>Token CSS file <span class="hint">(optional, path from site root)</span><input type="text" name="token_css" value="' . e($tokenCss) . '"></label>'
    . '<button type="submit">Save</button></form>');
