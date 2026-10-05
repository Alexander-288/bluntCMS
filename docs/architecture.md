# Architecture

*BluntCMS Light*

## Principles

- **Plain PHP and plain JS.** No Composer, no npm, no build step. Upload the folder and it works.
- **The browser edits, PHP writes.** The editor collects changes in memory and sends them in one go on save.
- **The site stays static.** Changes are written straight into your `.html` and `.css` files.

## Requirements

- **PHP 8.1 or newer** on the server. Written for 8.1, tested on 8.5.
- No extra PHP extensions beyond the defaults.

## Files

```
blunt/
  config.php      password hash and token CSS file path (made by setup.php)
  setup.php       first run: set the password, then it locks itself
  login.php       login form, lockout, logout
  edit.php        auth check, loads the page, injects the editor, rewrites links
  save.php        receives changes as JSON, writes them into the files
  lib.php         loads everything in lib/
  lib/            scanner, edits, tokens, validation, paths, auth, backups
  editor.css      styles shared by every tier: handles, tags, controls, picker
  js/             shared editor core: core, tokens, overlay, hover, text, fill, picker, tooltip, fields, sections, main
  light/          Light UI: toolbar, inspector panel, light.css, manifest.php
  thick/          Thick UI: docked toolbar, sidebar, thick.css, manifest.php
  backups/        previous versions of each file
  data/           runtime state, like the login lockout
  .htaccess       blocks direct access to config, lib, data and backups
```

## Tiers

Each tier is a folder in `blunt/` with its own UI and a `manifest.php`. The manifest lists the tier's CSS and JS files in load order, shared files included. `edit.php` loads whatever the manifest lists.

- `light/` — floating toolbar and inspector panel
- `thick/` — toolbar docked to the bottom edge, sidebar docked to the right (work in progress)
- The inspector's controls (`js/fields.js`) and tab contents (`js/sections.js`) are shared, so both tiers edit styles the same way
- `'tier' => 'light'` (or `'thick'`) in `config.php` picks the tier. If it's missing or unknown, Light is used.
- `php tools/build.php <tier>` makes `dist/bluntcms-<tier>-<version>.zip`. It contains `blunt/` with only that tier's folder, and no config, data or backups.

## Where changes are saved

- **Text and links** — written into the marked element in the `.html` file
- **Rearranged blocks** (Thick) — the editor sends a container's final list of children (`{id}` to keep, `{copy}` to duplicate; missing ones are deleted). The server (`lib/structure.php`) cuts the container into chunks, each child plus the whitespace before it, and joins them in the new order, so indentation stays and only whole blocks move. Other edits in the same save are applied first, and copies get free `-2`, `-3` names
- **Images** (Thick) — `thick/upload.php` checks the file by its content (`getimagesize`, no SVG), names it `<slug>-<hash>.<ext>` in the uploads folder, and answers with the path relative to the page. Saving then writes the `<img>`'s `src` (and `alt`, `width`, `height`) as attribute edits, or a `background-image: url(...)` style
- **Formatted text** (Thick) — the editor sends a small tree of text and inline tags, never HTML. The server (`lib/rich.php`) builds the HTML itself from `strong b em i u s a br`, with links limited to an `href`. It only does this for blocks whose current content already fits that set. If the save adds or removes tags, it replies `reload`, because the editor's element numbers have shifted
- **Element styles** — written as an inline `style=""` on the element. The server only accepts a fixed list of properties (`lib/validate.php`). Light's list can't move or resize anything; the Thick tier adds display, position, offsets, z-index, overflow, sizes, opacity and typography
- **Token styles** — the `--name: value;` line is updated in the token CSS file set in `config.php`

### Surgical edits

Only the changed characters are rewritten. Everything else in your file stays **byte-for-byte identical** — indentation, quotes, comments, line breaks. A one-word change is a one-word diff.

A small scanner in `lib/scanner.php` finds the exact position of each element's opening tag and text in the file and replaces just those characters. PHP's `DOMDocument` is *not* used for writing, because it re-outputs and reformats the whole file.

### How elements are matched

- `edit.php` gives every element a temporary ID based on its order in the source file. These IDs only exist in the editor and are never saved.
- On save, the editor sends a list of changes by ID, by `data-blunt` name, and by token name.
- `save.php` scans the file again, counts elements the same way, and applies the changes.
- Elements created by the page's own JavaScript are not in the source file, so they cannot be selected.

### Changed-file check

The editor sends a fingerprint of the file as it was when opened. If the file changed since then — an FTP upload, another tab — the save is refused with *"this page changed since you opened it, reload"*. Nothing is written to the wrong place.

## Security

### Login

- Password stored with `password_hash`, never in plain text
- Session cookie is `HttpOnly`, `SameSite=Strict`, and `Secure` on HTTPS
- Session ID is renewed on login
- **Lockout** — 5 wrong passwords blocks login for 5 minutes
- `setup.php` refuses to run once a password exists

### Saving

- Every save needs a **CSRF token** from the session
- Any `.html` file inside the site folder can be edited — nothing outside it, nothing inside `blunt/`, no `../` tricks
- **Allowlisted styles only** — radius (all or per corner), `padding-*`, `margin-*` (`auto` allowed on left and right), border widths, `border-style`, colours, `text-align`, `justify-content`, `align-items` and `gap`. Values must be plain sizes like `12px` or `1.5rem`, hex colours like `#ff0000`, or one of a fixed list of keywords
- Position, size, z-index and display are rejected — they belong to BluntCMS Thick
- **Text is escaped** — typing `<script>` saves as literal text
- Links starting with `javascript:` are rejected
- Files are written to a temp file first, then swapped in, so a crash can't leave half a file

## Errors

- `save.php` always answers with JSON. On error the editor shows a short message and *keeps your unsaved changes*
- Closing the tab with unsaved changes shows the browser's *leave page?* warning
- A marked element that contains other tags, like `<p data-blunt="x">Hi <b>there</b></p>`, can't be text-edited — plain-text editing would erase the `<b>`

## Testing

- **PHP** — `php tests/run.php`. A plain test script, no PHPUnit, no Composer
- **Demo site** — `demo/` has a few marked-up pages and a token CSS file. It is the example for new users and the place to test the editor by hand
- **Editor JS** — tested by hand against the demo with a short checklist

## Backups

Before every save, the old file is copied into `blunt/backups/` with a timestamp. The last **10** versions of each file are kept.
