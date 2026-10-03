# Changelog

All notable changes to BluntCMS. Versions are named `MAJOR.MINOR.PATCH-Tier`.

## Unreleased

Nothing yet.

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
