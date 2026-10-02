# BluntCMS

A **stupid simple** flat-file CMS. Drop a few PHP and JS files into an existing HTML site, log in, and edit the page right where it lives.

No database. No build step. No admin dashboard to learn.

## What it does

- **Log in** with a single admin password
- **Edit text** on marked elements directly on the page
- **Edit links** — change the text and `href` of marked links
- **Edit styles** visually — corner radius, colours, spacing
- **Save** writes your changes straight back into the `.html` files

The site stays plain static HTML. Delete the CMS and everything still works.

## How editing works

Once logged in, a small pill-shaped toolbar floats over your page:

- **Select** — click an element to get a bounding box with drag handles, like shapes in Illustrator
  - drag the *corner dots* to change corner radius
  - drag the *edges* to change spacing
- **Text** — click a marked block and type
- **Fill** — pick a colour for the selected element
- **Reset** — clear an element's style overrides

A normal drag changes **only that element**. Hold `Shift` to change the **shared token** instead, and every element using it updates together.

## Marking up your site

Mark editable elements with a `data-blunt` attribute:

```html
<h1 data-blunt="hero-title">Hello world</h1>
<a data-blunt="cta-link" href="/contact">Get in touch</a>
```

Shared style tokens live as CSS variables:

```css
:root {
  --card-radius: 12px;
  --accent: #111111;
  --gap: 24px;
}
```

## Release naming

BluntCMS ships in tiers. Each tier builds on the one before it.

- **BluntCMS Light** — *the base of everything.* Text, links and style editing. Single admin. **This is what is being built now.**
- **BluntCMS Thick** — Light plus *image uploads and swapping*.
- **BluntCMS Co-op** — *idea stage.* Possibly multiple users.
- **FattCMS** — *the fat cousin.* A separate, heavier project for everything that doesn't belong in Blunt.

Names beyond Light are not final.

## Status

Early planning. Nothing to install yet.
