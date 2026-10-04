/* BluntCMS Light — hover hint: outlines what the active tool would act on, labels it, and sets the cursor. */
(() => {
  'use strict';

  const B = window.Blunt;

  const cursor = (body, x, y, fallback) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">${body}</svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${x} ${y}, ${fallback}`;
  };
  const CURSORS = {
    fill: cursor('<g fill="#1a1a1a" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"><path d="M10.3 4.6l7.1 7.1-6.2 6.2a2.2 2.2 0 0 1-3.1 0l-4-4a2.2 2.2 0 0 1 0-3.1z"/><path d="M19.5 14s-2 2.4-2 3.8a2 2 0 0 0 4 0c0-1.4-2-3.8-2-3.8z"/></g>', 19, 21, 'crosshair'),
    pick: cursor('<g fill="#1a1a1a" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"><path d="M12.6 6.2l2.6-2.6a2.5 2.5 0 0 1 3.5 3.5l-2.6 2.6z"/><path d="M15.2 9.8L7 18l-3 1 1-3 8.2-8.2z"/></g>', 4, 19, 'crosshair'),
    reset: cursor('<path fill="#1a1a1a" stroke="#fff" stroke-width="1.2" stroke-linejoin="round" d="M14.3 3.6a2 2 0 0 1 2.8 0l3.3 3.3a2 2 0 0 1 0 2.8L12 18.1H7.8l-3.4-3.4a2 2 0 0 1 0-2.8z"/>', 6, 17, 'crosshair'),
  };

  const layer = B.mk('div', 'blunt-ui blunt-hover-layer', document.body);
  const box = B.mk('div', 'blunt-hover', layer);
  const tag = B.mk('div', 'blunt-tag', layer);
  layer.hidden = true;

  let pointer = null; // { target, mod }
  document.addEventListener('pointermove', (e) => {
    pointer = { target: e.target, mod: e.ctrlKey || e.metaKey, alt: e.altKey, shift: e.shiftKey };
  }, { passive: true });
  document.documentElement.addEventListener('mouseleave', () => {
    pointer = null;
  });
  const trackMod = (e) => {
    if (!pointer) return;
    pointer.mod = e.ctrlKey || e.metaKey;
    pointer.alt = e.altKey;
    pointer.shift = e.shiftKey;
  };
  document.addEventListener('keydown', trackMod);
  document.addEventListener('keyup', trackMod);

  /** What the active tool would do with the element under the pointer. */
  function hint(p) {
    const t = p.target;
    if (!t || !t.closest || B.isUi(t) || B.dragging) return null;

    const link = t.closest('a[href]');
    if (link && p.mod) return { el: link, text: 'Open link', cursor: 'pointer' };

    if (B.tool === 'text') {
      const el = t.closest('[data-blunt]');
      if (!el) return { el: null, cursor: 'default' };
      const name = el.dataset.blunt;
      if (B.cfg.duplicates.includes(name)) return { el, text: `${name} · name used twice`, blocked: true, cursor: 'not-allowed' };
      const rich = B.richText && el.tagName !== 'A' && B.richEditable(el);
      if (el.children.length && !rich) return { el, text: `${name} · has tags, can't edit`, blocked: true, cursor: 'not-allowed' };
      if (rich) return { el, text: `Formatted text · ${name}`, cursor: 'text' };
      return { el, text: `${el.tagName === 'A' ? 'Link' : 'Text'} · ${name}`, cursor: 'text' };
    }

    const el = t.closest('[data-blunt-id]');
    if (!el) return { el: null, cursor: 'default' };
    if (B.tool === 'fill') {
      const action = p.alt ? 'Pick colour' : p.shift ? 'Paint token' : `Paint ${B.paint.color}`;
      return { el, text: `${action} · ${B.describe(el)}`, cursor: CURSORS.fill };
    }
    if (B.tool === 'pick') {
      return { el, text: `Pick colour · ${B.describe(el)}`, cursor: CURSORS.pick };
    }
    if (B.tool === 'reset') {
      const n = B.overrideCount(el);
      return n
        ? { el, text: `Reset ${n} style${n > 1 ? 's' : ''} · ${B.describe(el)}`, cursor: CURSORS.reset }
        : { el, text: `Nothing to reset · ${B.describe(el)}`, blocked: true, cursor: CURSORS.reset };
    }
    return { el, text: B.describe(el), cursor: 'default' };
  }

  let lastCursor = '';
  function frame() {
    const h = pointer && hint(pointer);
    const nextCursor = h ? h.cursor : 'default';
    if (nextCursor !== lastCursor) {
      document.documentElement.style.setProperty('--blunt-cursor', nextCursor);
      lastCursor = nextCursor;
    }
    const el = h && h.el;
    const show = !!el && el.isConnected && !(el === B.selected && B.tool === 'select');
    layer.hidden = !show;
    if (show) {
      const r = el.getBoundingClientRect();
      Object.assign(box.style, {
        left: `${r.left}px`,
        top: `${r.top}px`,
        width: `${r.width}px`,
        height: `${r.height}px`,
        borderRadius: getComputedStyle(el).borderRadius,
      });
      tag.classList.toggle('is-blocked', !!h.blocked);
      B.placeTag(tag, r, h.text);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
