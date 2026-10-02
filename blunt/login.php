<?php
declare(strict_types=1);

require __DIR__ . '/lib.php';

$config = blunt_config();
if (empty($config['password_hash'])) {
    header('Location: setup.php');
    exit;
}

blunt_session();

if (isset($_GET['logout'])) {
    $_SESSION = [];
    session_destroy();
    header('Location: login.php');
    exit;
}

$return = (string) ($_POST['return'] ?? $_GET['return'] ?? 'edit.php');
if (preg_match('#^edit\.php(\?[^\s<>"]*)?$#', $return) !== 1) {
    $return = 'edit.php';
}

$error = null;
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!blunt_check_csrf((string) ($_POST['csrf'] ?? ''))) {
        $error = 'Your session expired. Try again.';
    } else {
        $error = blunt_attempt_login((string) ($_POST['password'] ?? ''), (string) $config['password_hash'], blunt_lockout_path(), time());
        if ($error === null) {
            session_regenerate_id(true);
            $_SESSION['blunt_auth'] = true;
            header('Location: ' . $return);
            exit;
        }
    }
}

blunt_render('Log in', ($error !== null ? '<p class="error">' . e($error) . '</p>' : '')
    . '<form method="post">'
    . '<input type="hidden" name="csrf" value="' . e(blunt_csrf()) . '">'
    . '<input type="hidden" name="return" value="' . e($return) . '">'
    . '<label>Password<input type="password" name="password" autocomplete="current-password" required autofocus></label>'
    . '<button type="submit">Log in</button></form>');
