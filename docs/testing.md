# Testing

*BluntCMS Light*

## Automated

```bash
php tests/run.php
```

Covers the HTML scanner, byte-exact edits, the token updater, value validation, safe paths, applying saved changes, backups and the login lockout.

Run one group with a filter, for example `php tests/run.php scanner`.

## By hand

Start a local server from the repo root:

```bash
php -S localhost:8000
```

Open `http://localhost:8000/blunt/setup.php`, set a password, and use `demo/css/tokens.css` as the token file. Log in, then open `http://localhost:8000/blunt/edit.php?page=demo/index.html`.

After each save, check the page **and** `git diff demo/`.

1. Toolbar shows at bottom centre; hover shows labels; `V` `T` `F` `R` switch tools. Hovering the page shows a dashed outline and a tag for what the tool would act on, and the cursor changes per tool.
2. Drag the toolbar and reload — position is kept. Double-click it — it flips vertical; reload — kept.
3. Select a card, drag a corner dot inward — all four corners round live and the label shows `radius Npx`. Save — the diff is only a `style="border-radius: Npx"` on that `<article>`.
4. **Alt** + drag one corner — only that corner changes. Save — the diff adds that corner's radius.
5. **Shift** + drag a card corner — every card changes and the label shows `--card-radius`. Save — the diff is one line in `demo/css/tokens.css`.
6. **Shift** + drag a heading corner — the label says *no token* and nothing changes.
7. Drag the top edge handle — padding changes. **Alt** + drag — margin changes. Save — inline styles only.
8. Text tool: hovering a marked block shows its name in a tag. Click the hero title, type, press `Enter`. Save — the diff is only the heading text.
9. Text tool on the *Rich text* card text — a red message, no editing.
10. Text tool on *Read more* — a link popover. Change it to `contact.html` and press `Enter`. Save — only the `href` changes.
11. Fill tool: a paint popup appears above the toolbar. Click a card — it gets painted. **Alt + click** another element — the paint colour picks up its colour. **Shift + click** the button with target *Background* — `--accent` changes everywhere.
12. Reset tool on a card you styled — its inline styles are removed. Save — the `style` attribute is gone from the file.
13. `Ctrl+Z` and `Ctrl+Shift+Z` step through changes; the dot on Save appears and disappears.
14. **Ctrl + click** *About* in the nav — you land on `edit.php?page=demo/about.html` (it asks first if there are unsaved changes).
15. With unsaved changes, close the tab — the browser asks before leaving.
16. Edit `demo/index.html` on disk while the editor is open, then save — a red *"This page changed since you opened it"* message, and nothing is written.
17. `blunt/backups/` holds `.bak` files, never more than 10 per page.
18. Inspector panel: select a card. On **Box**, drag a padding number sideways — the card changes live; type `40` in another — it applies on `Enter`; empty a field — the value is cleared. On **Border**, pick *Dashed* and set width `3`. On **Layout**, centre the text. Select the cards row — **Justify**, **Align** and **Gap** appear. Save — only allowlisted inline styles appear in the diff.
19. Drag the panel by its header and double-click it to collapse; reload — both are kept. Drag it to the bottom of the screen — it stops at the edge and gets shorter instead of going off screen.
20. **Exit** — you land on the plain page with no editor code in its source.

Undo the demo edits afterwards with `git checkout demo/`.
