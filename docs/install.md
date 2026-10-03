# Install

*BluntCMS Light*

The short version. For a guided walkthrough, see the **[tutorial](tutorial.md)**.

## Requirements

- **PHP 8.1 or newer**
- A static HTML site you can upload files to

## Steps

1. Copy the `blunt/` folder into your site's root folder, next to your `index.html`.
2. Make sure PHP can write to your `.html` files, your token CSS file, and the `blunt/` folder.
3. Open `https://your-site.com/blunt/setup.php` **right away** and set a password.
   - *Token CSS file* is the path to the CSS file with your shared variables, for example `css/tokens.css`. Leave it empty if you don't have one.
4. Log in at `https://your-site.com/blunt/login.php`.
5. Edit any page at `https://your-site.com/blunt/edit.php?page=about.html`.

## Mark up your pages

Text you want to edit gets a unique `data-blunt` name:

```html
<h1 data-blunt="hero-title">Hello world</h1>
<a data-blunt="cta" href="/contact">Get in touch</a>
```

Shared styles are CSS variables in your token file, used with `var()`:

```css
:root {
  --card-radius: 16px;
}

.card {
  border-radius: var(--card-radius);
}
```

## Resetting the password

Delete `blunt/config.php` and open `blunt/setup.php` again.

## nginx

The `.htaccess` files only work on Apache. On nginx, block these yourself:

- `blunt/config.php`
- `blunt/lib/`
- `blunt/data/`
- `blunt/backups/`

## Trying it locally

```bash
php -S localhost:8000
```

Then open `http://localhost:8000/blunt/setup.php` and use `demo/css/tokens.css` as the token file. The demo pages are at `edit.php?page=demo/index.html`.
