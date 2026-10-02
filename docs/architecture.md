# Architecture

*Status: planned for BluntCMS Light. Not built yet.*

## Principles

- **Plain PHP and plain JS.** No Composer, no npm, no build step. Upload the folder and it works.
- **The browser edits, PHP writes.** The editor collects changes in memory and sends them in one go on save.
- **The site stays static.** Changes are written straight into your `.html` and `.css` files.

## Requirements

- **PHP 8.1 or newer** on the server. Works on 8.2, 8.3 and 8.4 too.
- No extra PHP extensions beyond the defaults.

## Files

```
blunt/
  config.php      password hash, editable pages, token CSS file path
  setup.php       first run: set the password, then it locks itself
  login.php       login form and session start
  edit.php        auth check, loads the page, injects the editor, rewrites links
  save.php        receives changes as JSON, writes them into the files
  lib.php         shared helpers: auth check, safe paths, CSRF
  editor.js       toolbar, selection box, drag handles, text editing
  editor.css      toolbar and handle styling
  backups/        previous versions of each file
```

## Where changes are saved

- **Text and links** — written into the marked element in the `.html` file
- **Element styles** — written as an inline `style=""` on the element
- **Token styles** — the `--name: value;` line is updated in the token CSS file set in `config.php`

HTML is edited with PHP's `DOMDocument`, not regex, so the markup is not mangled.

## Backups

Before every save, the old file is copied into `blunt/backups/` with a timestamp. The last **10** versions of each file are kept.
