/* BluntCMS Thick — images: upload, replace an <img>, alt text, background images, double-click and drop to replace. */
(() => {
  'use strict';

  const B = window.Blunt;
  const ACCEPT = 'image/jpeg,image/png,image/gif,image/webp,image/avif';
  const uploadUrl = B.cfg.saveUrl.replace(/save\.php$/, 'thick/upload.php');

  // ---- Upload ----
  B.uploadImage = async (file) => {
    const form = new FormData();
    form.append('csrf', B.cfg.csrf);
    form.append('page', B.cfg.page);
    form.append('image', file);
    B.toast(`Uploading ${file.name}…`);
    let data;
    try {
      const res = await fetch(uploadUrl, { method: 'POST', credentials: 'same-origin', body: form });
      data = await res.json();
    } catch {
      data = { ok: false, error: 'Could not reach the server. Nothing was uploaded.' };
    }
    if (!data.ok) throw new Error(data.error || 'Upload failed.');
    return data; // { url (relative to the page), width, height, name }
  };

  const chooser = B.mk('input', 'blunt-ui', document.body);
  chooser.type = 'file';
  chooser.accept = ACCEPT;
  chooser.hidden = true;
  /** Opens the file picker; resolves with the chosen file (or never, if cancelled). */
  B.pickImageFile = () => new Promise((resolve) => {
    chooser.value = '';
    chooser.onchange = () => chooser.files[0] && resolve(chooser.files[0]);
    chooser.click();
  });

  /** Why an <img> can't be replaced yet, or null. */
  B.imageBlocked = (el) => {
    if (el.hasAttribute('srcset') || el.closest('picture')) return 'This image has several sizes (srcset or <picture>), so it can’t be replaced here yet.';
    return null;
  };

  const attrRec = (el, attr, after) => ({ kind: 'attr', el, id: Number(el.dataset.bluntId), attr, before: el.getAttribute(attr) ?? '', after });
  const fail = (e) => B.toast(e.message, 'error');

  /** Uploads a file and puts it in the <img>. A fixed width/height pair keeps its width and takes the new shape. */
  B.replaceImage = async (el, file) => {
    const blocked = B.imageBlocked(el);
    if (blocked) {
      B.toast(blocked, 'error');
      return;
    }
    let up;
    try {
      up = await B.uploadImage(file);
    } catch (e) {
      fail(e);
      return;
    }
    const group = [attrRec(el, 'src', up.url)];
    const w = el.getAttribute('width');
    if (/^\d+$/.test(w || '') && /^\d+$/.test(el.getAttribute('height') || '') && up.width) {
      group.push(attrRec(el, 'height', String(Math.round((Number(w) * up.height) / up.width))));
    }
    group.forEach((r) => B.applyValue(r, r.after));
    B.commit(group);
    B.toast(`Replaced with ${up.name}`);
  };

  /** Uploads a file as the element's background. A first background also gets cover + centre. */
  B.setBackgroundImage = async (el, file) => {
    let up;
    try {
      up = await B.uploadImage(file);
    } catch (e) {
      fail(e);
      return;
    }
    const first = getComputedStyle(el).backgroundImage === 'none';
    // No quotes needed: upload names never contain spaces, quotes or brackets (and the server checks).
    const values = { 'background-image': `url(${up.url})` };
    if (first) Object.assign(values, { 'background-size': 'cover', 'background-position': 'center', 'background-repeat': 'no-repeat' });
    const group = Object.entries(values).map(([p, v]) => B.styleRec(el, p, B.currentStyle(el, p), v));
    group.forEach((r) => B.applyValue(r, r.after));
    B.commit(group);
  };

  // ---- Double-click an image with Select to replace it ----
  document.addEventListener('dblclick', (e) => {
    const img = e.target.closest && e.target.closest('img[data-blunt-id]');
    if (!img || B.isUi(img) || B.tool !== 'select') return;
    e.preventDefault();
    B.pickImageFile().then((file) => B.replaceImage(img, file));
  }, true);

  // ---- Drop an image file on a picture to replace it; never let a dropped file open in the tab ----
  const hasFiles = (e) => e.dataTransfer && [...e.dataTransfer.types].includes('Files');
  document.addEventListener('dragover', (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    const img = e.target.closest && e.target.closest('img[data-blunt-id]');
    e.dataTransfer.dropEffect = img && !B.isUi(img) ? 'copy' : 'none';
  });
  document.addEventListener('drop', (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    const img = e.target.closest && e.target.closest('img[data-blunt-id]');
    const file = e.dataTransfer.files[0];
    if (img && !B.isUi(img) && file) B.replaceImage(img, file);
  });

  // ---- Image tab section ----
  const cssUrl = (v) => {
    const m = /url\(["']?(.*?)["']?\)/.exec(v || '');
    return m ? m[1] : '';
  };

  B.sections.image = (body, el, f) => {
    if (!el) {
      f.note(body, 'Select an image to replace it or edit its description. Select anything else to give it a background image.');
      return;
    }
    if (el.tagName === 'IMG') {
      const preview = B.mk('div', 'blunt-imgpreview', body);
      const thumb = B.mk('img', '', preview);
      thumb.alt = '';
      thumb.src = el.currentSrc || el.src; // set now, so the preview never shows an empty image
      const info = B.mk('p', 'blunt-note', body);
      f.watch(() => {
        thumb.src = el.currentSrc || el.src;
        const file = (el.getAttribute('src') || '').split('/').pop();
        info.textContent = `${file} · ${el.naturalWidth} × ${el.naturalHeight}`;
      });
      const blocked = B.imageBlocked(el);
      const replace = B.mk('button', 'blunt-pill', body);
      replace.type = 'button';
      replace.textContent = 'Replace image…';
      replace.disabled = !!blocked;
      replace.dataset.tip = 'Or double-click the image, or drop a file on it';
      replace.addEventListener('click', () => B.pickImageFile().then((file) => B.replaceImage(el, file)));
      if (blocked) f.note(body, blocked);

      const alt = B.mk('input', 'blunt-input', f.row(body, 'Description (alt text)'));
      alt.type = 'text';
      alt.maxLength = 1000;
      alt.placeholder = 'What the image shows';
      f.watch(() => {
        if (document.activeElement !== alt) alt.value = el.getAttribute('alt') ?? '';
      });
      const commitAlt = () => {
        const r = attrRec(el, 'alt', alt.value.trim());
        if (r.before === r.after) return;
        B.applyValue(r, r.after);
        B.commit([r]);
      };
      alt.addEventListener('change', commitAlt);
      alt.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') alt.blur();
      });
      f.note(body, 'Describe the image for people who can’t see it. Leave it empty if it’s only decoration.');
      return;
    }

    // Any other element: background image
    const preview = B.mk('div', 'blunt-imgpreview is-bg', body);
    const line = B.mk('div', 'blunt-pair', body);
    const choose = B.mk('button', 'blunt-pill', line);
    choose.type = 'button';
    const remove = B.mk('button', 'blunt-pill', line);
    remove.type = 'button';
    remove.textContent = 'Remove';
    choose.addEventListener('click', () => B.pickImageFile().then((file) => B.setBackgroundImage(el, file)));
    remove.addEventListener('click', () => f.setStyles(el, { 'background-image': B.currentStyle(el, 'background-image') ? '' : 'none' }, null));
    f.watch(() => {
      const url = cssUrl(f.computed(el, 'background-image'));
      preview.style.backgroundImage = url ? `url("${url}")` : '';
      preview.classList.toggle('is-empty', !url);
      choose.textContent = url ? 'Change background…' : 'Add background image…';
      remove.disabled = !url;
    });
    f.textSeg(f.row(body, 'Size'), el, { prop: 'background-size', options: [['auto', 'auto'], ['cover', 'cover', 'Fills the box, may crop'], ['contain', 'contain', 'Whole image, may leave space']] });
    f.textSeg(f.row(body, 'Position'), el, { prop: 'background-position', options: [['center', 'centre'], ['top', 'top'], ['bottom', 'bottom'], ['left', 'left'], ['right', 'right']] });
    f.textSeg(f.row(body, 'Repeat'), el, { prop: 'background-repeat', options: [['no-repeat', 'once'], ['repeat', 'tile']] });
  };
})();
