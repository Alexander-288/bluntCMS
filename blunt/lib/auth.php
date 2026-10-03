<?php
declare(strict_types=1);

function blunt_config_path(): string
{
    return blunt_cms_dir() . '/config.php';
}

function blunt_read_config(string $path): array
{
    if (!is_file($path)) {
        return [];
    }
    $config = require $path;
    return is_array($config) ? $config : [];
}

function blunt_write_config(string $path, array $config): void
{
    blunt_write_atomic($path, "<?php\nreturn " . var_export($config, true) . ";\n");
}

function blunt_config(): array
{
    return blunt_read_config(blunt_config_path());
}

function blunt_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    $https = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
    session_name('blunt_session');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'httponly' => true,
        'samesite' => 'Strict',
        'secure' => $https,
    ]);
    session_start();
    if (empty($_SESSION['blunt_csrf'])) {
        $_SESSION['blunt_csrf'] = bin2hex(random_bytes(32));
    }
}

function blunt_logged_in(): bool
{
    blunt_session();
    return ($_SESSION['blunt_auth'] ?? false) === true;
}

function blunt_csrf(): string
{
    blunt_session();
    return (string) $_SESSION['blunt_csrf'];
}

function blunt_check_csrf(string $token): bool
{
    return hash_equals(blunt_csrf(), $token);
}

function blunt_lockout_path(): string
{
    return blunt_cms_dir() . '/data/lockout.json';
}

/** Unix time the lockout ends, or 0 when not locked. */
function blunt_locked_until(string $path, int $now): int
{
    $data = is_file($path) ? json_decode((string) file_get_contents($path), true) : null;
    $until = is_array($data) ? (int) ($data['until'] ?? 0) : 0;
    return $until > $now ? $until : 0;
}

function blunt_record_login(string $path, bool $ok, int $now): void
{
    $dir = dirname($path);
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    $fh = fopen($path, 'c+');
    if ($fh === false) {
        throw new BluntError('Could not write the login lockout file.', 500);
    }
    flock($fh, LOCK_EX);
    $data = json_decode((string) stream_get_contents($fh), true);
    $data = is_array($data) ? $data : [];
    if ($ok) {
        $data = ['fails' => 0, 'until' => 0];
    } else {
        $data['fails'] = (int) ($data['fails'] ?? 0) + 1;
        if ($data['fails'] >= 5) {
            $data = ['fails' => 0, 'until' => $now + 300];
        }
    }
    ftruncate($fh, 0);
    rewind($fh);
    fwrite($fh, (string) json_encode($data));
    fflush($fh);
    flock($fh, LOCK_UN);
    fclose($fh);
}

/** Null on success, otherwise a message for the login form. */
function blunt_attempt_login(string $password, string $hash, string $lockPath, int $now): ?string
{
    if (blunt_locked_until($lockPath, $now) > 0) {
        return 'Too many wrong passwords. Try again in a few minutes.';
    }
    $ok = password_verify($password, $hash);
    blunt_record_login($lockPath, $ok, $now);
    return $ok ? null : 'Wrong password.';
}
