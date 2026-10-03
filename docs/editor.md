# The editor

*BluntCMS Light*

## Opening the editor

Go to `/blunt/edit.php?page=about.html` and log in. The page loads with the editor on top of it.

- Your `.html` files never contain any CMS code
- Visitors never load the editor
- **Ctrl + click** (or **Cmd + click** on Mac) a link to follow it and stay in edit mode — a plain click selects or edits it instead

## Toolbar

A black pill with white icons floats over the page.

- The active tool sits in a **white circle**
- Hovering a tool shows a small label
- It sits at the bottom centre by default
- **Drag** it to move it
- **Double-click** it to flip between horizontal and vertical

Tools, left to right:

- **Select**
- **Text**
- **Fill**
- **Reset**
- *divider*
- **Save** — shows a dot when there are unsaved changes
- **Exit**

Icons are inline SVG. No icon fonts or libraries.

## Hover hint

Before you click, the editor shows what the active tool would act on.

- A **dashed outline** follows the shape of the element under the cursor
- A **black tag** names it, like `article.card` or `Text · hero-title`
- A **red tag** means the tool can't act there, like *has tags, can't edit* or *nothing to reset*
- The **cursor** changes per tool — text cursor for Text, a paint bucket for Fill, an eraser for Reset
- Hold `Ctrl` over a link and the tag says *Open link*

## Select

Click **any** element to get a bounding box with handles, like shapes in Illustrator. A **white tag** above it shows the element and its size.

- **Ring dots** inside the corners — drag to change `border-radius` on all four corners
- **Alt + corner drag** — change *only that corner*, like `border-top-left-radius`
- **Square handles** on the edges — drag to change `padding` on that side
- **Alt + edge drag** — change `margin` instead

### Element vs token

- A normal drag changes **only that element**. It is saved as an inline `style=""`.
- **Shift + drag** changes the **shared token** the element uses, for example `--card-radius`. Every element using that token updates live.

While `Shift` is held, a small label shows which token you are editing. If the element has no token for that property, the label says *no token* and nothing changes.

Tokens are found automatically. If a CSS rule for the element says `border-radius: var(--card-radius)`, then `--card-radius` is the linked token.

## Text

Only elements marked with `data-blunt` are editable.

```html
<h1 data-blunt="hero-title">Hello world</h1>
```

- Hovering a marked element shows its name; unmarked elements show nothing
- Click to edit the text in place
- `Enter` or click outside to finish, `Esc` to cancel
- Plain text only — no bold or italics inside blocks
- A block that already contains tags, like `<strong>`, can't be edited in Light

### Links

A marked link also shows a small popover with an `href` field.

```html
<a data-blunt="cta-link" href="/contact">Get in touch</a>
```

## Inspector panel

A dark panel in the same style as the toolbar. It is always open and always shows the same layout — fields that don't apply are dimmed instead of hidden.

- The **icon bar** at the top switches tabs: *Box*, *Border*, *Colour*, *Layout*. Hover an icon for its name
- A **dimmed tab icon** means the selected element has nothing set in that tab yet — you can still open it and add something
- The **diamond** button edits shared tokens instead of the element. Holding `Shift` does the same for one drag or click
- Under the icons: the selected element's name and size
- **Drag** the icon bar or name to move the panel, **double-click** to collapse it — it remembers both. It always stays on screen; dragged low, it gets shorter and scrolls
- A **white ring** on a field means the value is set on this element itself
- A **dotted underline** means the value comes from a token you can edit

### Colours

Colour dots open the colour picker:

- Drag in the shade area and along the hue slider, or type a hex value
- Dots below are your token colours and recent picks — click one to use it
- Click outside to apply, `Esc` to cancel

### Number fields

- **Drag** sideways to scrub the value
- **Click** to type — `12`, `12px`, `1.5rem` or `50%`
- `↑` / `↓` change by 1, with `Shift` by 10
- **Empty** the field to clear the value from the element

### Tabs

- **Box** — a margin, border and padding diagram with all four sides of each
- **Border** — style (none, solid, dashed, dotted), width for all sides or each side, colour, radius for all corners or each corner
- **Colour** — text, background and border colour
- **Layout** — text alignment, *Centre in parent*, and justify, align and gap — those three only work on flex and grid containers

Position, size, z-index and display are not in Light. They are planned for **BluntCMS Thick**.

## Fill

A paint bucket. While Fill is active, a small popup above the toolbar shows the **paint colour** dot and a target: *Background*, *Text* or *Border*.

- **Click** an element to paint it
- **Alt + click** picks up an element's colour
- **Shift + click** paints the linked token instead

## Reset

Click an element to remove every inline style BluntCMS manages on it. Token values are not touched.

## Undo

- `Ctrl+Z` — undo
- `Ctrl+Shift+Z` — redo

Undo history lives in memory until you save.

## Keyboard

- `V` — Select
- `T` — Text
- `F` — Fill
- `R` — Reset
- `Ctrl+S` — Save
- `Esc` — deselect

## Browser support

Current versions of Chrome, Edge, Firefox and Safari.
