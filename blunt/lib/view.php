<?php
declare(strict_types=1);

function e(string $s): string
{
    return htmlspecialchars($s, ENT_QUOTES | ENT_HTML5, 'UTF-8');
}

/** Renders a small standalone page (setup, login, errors). $body is trusted HTML. */
function blunt_render(string $title, string $body): void
{
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: no-store');
    echo '<!doctype html><html lang="en"><head><meta charset="utf-8">'
        . '<meta name="viewport" content="width=device-width, initial-scale=1">'
        . '<title>' . e($title) . ' · BluntCMS</title><style>'
        . '*{box-sizing:border-box}'
        . 'body{margin:0;min-height:100vh;display:grid;place-items:center;padding:16px;background:#e8e8e8;color:#1a1a1a;font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}'
        . 'main{width:100%;max-width:360px;padding:28px;border-radius:24px;background:#fff}'
        . 'h1{margin:0 0 16px;font-size:20px}'
        . 'label{display:block;margin:0 0 12px;font-weight:600;font-size:13px}'
        . 'input{display:block;width:100%;margin-top:6px;padding:10px 14px;border:1px solid #ccc;border-radius:12px;font:inherit}'
        . 'button{width:100%;margin-top:8px;padding:12px;border:0;border-radius:999px;background:#1a1a1a;color:#fff;font:inherit;font-weight:600;cursor:pointer}'
        . '.error{padding:10px 14px;border-radius:12px;background:#fde8e6;color:#8c1d14}'
        . '.hint{color:#666;font-size:13px;font-weight:400}'
        . 'code{padding:1px 5px;border-radius:6px;background:#f0f0f0}'
        . '</style></head><body><main><h1>' . e($title) . '</h1>' . $body . '</main></body></html>';
}
