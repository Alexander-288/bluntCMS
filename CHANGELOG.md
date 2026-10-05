# Changelog

All notable changes to BluntCMS. Versions are named `MAJOR.MINOR.PATCH-Tier`.

## Unreleased

Nothing yet.

## 2.0.0-Thick — 2026-10-05

The first release of **BluntCMS Thick**: everything in Light, plus the heavier editing that doesn't belong there, in a layout of its own.

### Added

- **New layout** — a toolbar docked to the bottom edge and a sidebar docked to the right; the page makes room for both. Tab hides the editor so you can see the page clean
- **Sidebar** — page bar, the selected element with clickable parents, and Box, Position, Layout, Style, Type and Image tabs with foldable sections
- **Position and size** — display, position mode, offsets, z-index with bring forward / send backward, overflow, width and height with min and max, opacity
- **Typography** — font size, weight, line height, letter spacing, bold / italic / underline / strikethrough for the whole element, letter case
- **Formatted text** — the Text tool edits blocks with bold, italic, underline, strikethrough, links and line breaks, with a formatting bar. The browser sends a small tree; the server builds the HTML from a short list of tags
- **Images** — upload and replace pictures (double-click, drop a file, or the Image tab), edit alt text, set background images with size, position and repeat. Files are checked by content (JPG, PNG, GIF, WebP, AVIF; no SVG) and stored in `uploads/`
- **Repeat blocks** — the Move tool drags cards and list items to reorder them, and duplicates or deletes them. Whole blocks move with their indentation; copies get fresh names
- **Pages and history** — switch pages from the sidebar; list a page's backups and restore one (the current file is backed up first)
- **Eyedropper** tool (`I`) and undo / redo buttons

### Changed

- The code is split into a shared engine and one folder per tier (`blunt/light/`, `blunt/thick/`). `'tier'` in `config.php` picks one; a release zip holds just one
- The server's list of allowed styles depends on the tier, so Light still can't move or resize anything
- `tools/build.php <tier>` makes the release zip for a tier

## 1.0.0-Light — 2026-10-03

The first release: **BluntCMS Light**.

### Editing

- On-page editor opened through `blunt/edit.php` — your HTML files never contain CMS code
- Pill toolbar: **Select**, **Text**, **Fill**, **Reset**, **Save**, **Exit**, with a liquid blob marking the active tool. Draggable, and double-click flips it vertical
- **Select** — Illustrator-style bounding box with ring dots for corner radius (`Alt` for one corner) and square handles for padding (`Alt` for margin)
- **Text** — plain-text editing of `data-blunt` blocks and link addresses. Blocks containing tags are protected
- **Fill** — paint bucket with a paint popup above the toolbar; `Alt`-click picks a colour, `Shift`-click paints the token
- **Reset** — clears an element's inline styles
- **Hover hint** — outline, tag and cursor show what the active tool would do; red when it can't
- **Inspector panel** — Box, Border, Colour and Layout tabs with scrubbable number fields, always-visible skeleton layout, clip-path transitions
- **Colour picker** — shade area, hue slider, hex field, token and recent swatches
- **Design tokens** — `Shift` or the inspector's diamond button edits CSS variables in your token file, so every element using them updates together
- Undo and redo, keyboard shortcuts, `Ctrl` + click to follow links

### Saving

- Surgical edits: only the changed characters are rewritten; everything else stays byte-for-byte identical
- Changed-file check refuses to save over a file that changed since it was opened
- Backups of the last 10 versions of every file, atomic writes

### Security

- Single admin password with `password_hash`, 5-try lockout, CSRF tokens, strict session cookies
- Allowlisted style properties and values only; position, size, z-index and display are rejected
- Text is escaped; `javascript:` links are rejected; paths can't leave the site folder

### Docs

- README, tutorial, install guide, editor reference, architecture notes and testing checklist
- Guided demo site
