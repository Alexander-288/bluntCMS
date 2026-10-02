<?php
declare(strict_types=1);

function temp_lock_path(): string
{
    return sys_get_temp_dir() . '/blunt-lock-' . bin2hex(random_bytes(4)) . '/lockout.json';
}

function test_auth_lockout_after_five_failures(): void
{
    $lock = temp_lock_path();
    $hash = password_hash('secret123', PASSWORD_DEFAULT);
    $now = 1_000_000;
    for ($i = 0; $i < 5; $i++) {
        assert_same('Wrong password.', blunt_attempt_login('nope', $hash, $lock, $now));
    }
    assert_true(str_contains((string) blunt_attempt_login('secret123', $hash, $lock, $now + 10), 'Too many'));
    assert_same(null, blunt_attempt_login('secret123', $hash, $lock, $now + 301));
}

function test_auth_success_resets_failure_count(): void
{
    $lock = temp_lock_path();
    $hash = password_hash('secret123', PASSWORD_DEFAULT);
    for ($i = 0; $i < 4; $i++) {
        blunt_attempt_login('nope', $hash, $lock, 100);
    }
    assert_same(null, blunt_attempt_login('secret123', $hash, $lock, 100));
    for ($i = 0; $i < 4; $i++) {
        blunt_attempt_login('nope', $hash, $lock, 100);
    }
    assert_same(null, blunt_attempt_login('secret123', $hash, $lock, 100));
}

function test_auth_config_roundtrip(): void
{
    $path = sys_get_temp_dir() . '/blunt-config-' . bin2hex(random_bytes(4)) . '.php';
    assert_same([], blunt_read_config($path));
    $config = ['password_hash' => '$2y$10$abc', 'token_css' => "css/it's.css"];
    blunt_write_config($path, $config);
    assert_same($config, blunt_read_config($path));
}
