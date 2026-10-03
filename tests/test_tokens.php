<?php
declare(strict_types=1);

const TOKEN_CSS = "/* --accent: #fff; */\n.card { --accent: #111; }\n:root {\n  --accent: #000;\n  --card-radius: 12px;\n  --gap: calc(var(--x) * 2);\n}\n";

function test_tokens_set_prefers_root_declaration(): void
{
    assert_same(
        str_replace('  --accent: #000;', '  --accent: #ff0000;', TOKEN_CSS),
        blunt_set_token(TOKEN_CSS, '--accent', '#ff0000')
    );
}

function test_tokens_set_replaces_only_the_value(): void
{
    assert_same(
        str_replace('--card-radius: 12px;', '--card-radius: 16px;', TOKEN_CSS),
        blunt_set_token(TOKEN_CSS, '--card-radius', '16px')
    );
}

function test_tokens_find_value_with_parentheses(): void
{
    $r = blunt_find_token(TOKEN_CSS, '--gap');
    assert_same('calc(var(--x) * 2)', substr(TOKEN_CSS, $r[0], $r[1] - $r[0]));
}

function test_tokens_falls_back_to_first_non_root_and_closing_brace(): void
{
    assert_same('.a { --b: 2px }', blunt_set_token('.a { --b: 1px }', '--b', '2px'));
}

function test_tokens_names_skip_comments_and_var_uses(): void
{
    assert_same(['--accent', '--card-radius', '--gap'], blunt_token_names(TOKEN_CSS));
}

function test_tokens_missing_throws(): void
{
    assert_throws(fn () => blunt_set_token(TOKEN_CSS, '--nope', '1px'), 'not in the token file');
}
