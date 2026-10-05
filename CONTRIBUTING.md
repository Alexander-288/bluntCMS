# Contributing

Thanks for wanting to help. BluntCMS has one rule above all others: **keep it blunt.**

## The golden rule

BluntCMS Light is a few PHP and JS files you drop into a site. Before adding something, ask: *does this make it harder to understand, install or delete?* If yes, it probably belongs in a later tier — **Thick**, **Co-op** or **FattCMS** (see the README). Open an issue to discuss it first.

What fits Light:

- Bug fixes
- Making existing tools clearer or more reliable
- Docs, the tutorial and the demo

What doesn't:

- Dependencies — no Composer, no npm, no build step
- A database
- Features that need a separate admin dashboard

## Reporting a bug

Open an issue with the **Bug report** template. The most useful things to include:

- What you did, step by step
- What you expected, and what happened instead
- Your PHP version (`php -v`) and browser
- If a save went wrong: the relevant part of `git diff`, or the `.bak` file from `blunt/backups/`

## Working on the code

You need **PHP 8.1 or newer** and nothing else.

```bash
php -S localhost:8000
```

Then follow the tutorial's first part to set up the demo.

### Layout

- `blunt/*.php` — the four entry points: setup, login, edit, save
- `blunt/lib/` — small PHP files, one job each (scanner, edits, tokens, validation…)
- `blunt/js/` — the shared editor core, split by feature, sharing a `window.Blunt` object
- `blunt/editor.css` — editor styles shared by every tier, prefixed `.blunt-`
- `blunt/light/` — Light's toolbar and inspector panel, plus `manifest.php` listing the files to load
- `blunt/thick/` — Thick's docked toolbar, sidebar and tools (images, blocks, pages, formatting), its two endpoints (`upload.php`, `site.php`) and its own `manifest.php`
- `tools/build.php` — makes a release zip for one tier
- `tests/` — the PHP test runner and tests
- `demo/` — the demo site

### Code style

- **PHP** — `declare(strict_types=1);`, functions prefixed `blunt_`, user-facing failures throw `BluntError`
- **JS** — plain ES2020 in an IIFE per file, no libraries
- **CSS** — every selector starts with `.blunt-` so it can't clash with the site being edited
- Match the style of the file you're in

### Tests

```bash
php tests/run.php
```

- Anything that touches how files are read or written needs a test in `tests/`. The core promise — *only the changed bytes change* — must always hold
- Editor changes are checked by hand with the checklist in `docs/testing.md`
- CI runs the tests on PHP 8.1 and 8.4 for every push and pull request

### Pull requests

- One topic per pull request
- Explain *why*, not just what
- Update the docs in `docs/` if behaviour changes
- Add a line to `CHANGELOG.md` under *Unreleased*

## Docs style

Docs use plain Markdown: headings, lists, **bold**, *italics*, `inline code` and code blocks. No tables, no HTML.
