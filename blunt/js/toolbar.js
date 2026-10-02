/* BluntCMS Light — the floating pill toolbar. */
(() => {
  'use strict';

  const B = window.Blunt;
  const svg = (body) => `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">${body}</svg>`;
  const ICONS = {
    select: svg('<path fill="currentColor" d="M5.5 2.8l13.4 8.4c.6.4.4 1.3-.3 1.4l-5.6 1-3 4.9c-.4.6-1.3.4-1.4-.3L5.5 2.8z"/>'),
    text: svg('<path fill="currentColor" d="M3.5 20.5l1.1-4.6L15.5 5a2 2 0 0 1 2.8 0l.7.7a2 2 0 0 1 0 2.8L8.1 19.4z"/>'),
    fill: svg('<path fill="currentColor" d="M10.3 4.6l7.1 7.1-6.2 6.2a2.2 2.2 0 0 1-3.1 0l-4-4a2.2 2.2 0 0 1 0-3.1z"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M7 2.5l4.2 4.2"/><path fill="currentColor" d="M19.5 14s-2 2.4-2 3.8a2 2 0 0 0 4 0c0-1.4-2-3.8-2-3.8z"/>'),
    reset: svg('<path fill="currentColor" d="M14.3 3.6a2 2 0 0 1 2.8 0l3.3 3.3a2 2 0 0 1 0 2.8L12 18.1H7.8l-3.4-3.4a2 2 0 0 1 0-2.8z"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M14 21h6.5"/>'),
    save: svg('<path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" d="M5 12.5l4.5 4.5L19 7.5"/>'),
    exit: svg('<path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>'),
  };
  const TOOLS = [
    ['select', 'Select', 'V'],
    ['text', 'Text', 'T'],
    ['fill', 'Fill', 'F'],
    ['reset', 'Reset', 'R'],
  ];

  const bar = B.mk('div', 'blunt-ui blunt-toolbar', document.body);
  bar.setAttribute('role', 'toolbar');
  bar.setAttribute('aria-label', 'BluntCMS');

  const button = (id, label, key) => {
    const b = B.mk('button', 'blunt-btn', bar);
    b.type = 'button';
    b.dataset.id = id;
    b.dataset.label = key ? `${label} (${key})` : label;
    b.setAttribute('aria-label', label);
    b.innerHTML = ICONS[id];
    return b;
  };

  for (const [id, label, key] of TOOLS) {
    button(id, label, key).addEventListener('click', () => B.setTool(id));
  }
  B.mk('span', 'blunt-divider', bar);
  const save = button('save', 'Save', 'Ctrl+S');
  save.addEventListener('click', () => B.save());
  B.mk('span', 'blunt-dot', save);
  button('exit', 'Exit').addEventListener('click', () => B.exit());

  B.on('tool', (tool) => {
    bar.querySelectorAll('.blunt-btn').forEach((b) => {
      const active = b.dataset.id === tool;
      b.classList.toggle('is-active', active);
      if (TOOLS.some(([id]) => id === b.dataset.id)) b.setAttribute('aria-pressed', String(active));
    });
  });
  B.on('dirty', (dirty) => bar.classList.toggle('is-dirty', dirty));

  // Position + orientation, remembered per browser.
  const KEY = 'blunt-toolbar';
  let state = {};
  try {
    state = JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    state = {};
  }
  const store = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      // storage unavailable — position just isn't remembered
    }
  };
  const clamp = (v, max) => Math.min(Math.max(0, v), Math.max(0, max));
  const applyState = () => {
    bar.classList.toggle('is-vertical', !!state.vertical);
    if (state.x == null) return;
    bar.style.left = `${clamp(state.x, window.innerWidth - bar.offsetWidth)}px`;
    bar.style.top = `${clamp(state.y, window.innerHeight - bar.offsetHeight)}px`;
    bar.style.bottom = 'auto';
    bar.style.transform = 'none';
  };
  applyState();
  window.addEventListener('resize', applyState);

  let drag = null;
  let suppressClick = false;
  bar.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const r = bar.getBoundingClientRect();
    drag = { sx: e.clientX, sy: e.clientY, ox: r.left, oy: r.top, moved: false };
  });
  window.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.sx;
    const dy = e.clientY - drag.sy;
    if (!drag.moved && Math.hypot(dx, dy) < 5) return;
    drag.moved = true;
    state.x = drag.ox + dx;
    state.y = drag.oy + dy;
    applyState();
  });
  window.addEventListener('pointerup', () => {
    if (drag && drag.moved) {
      suppressClick = true;
      store();
    }
    drag = null;
  });
  bar.addEventListener('click', (e) => {
    if (!suppressClick) return;
    suppressClick = false;
    e.stopPropagation();
    e.preventDefault();
  }, true);
  bar.addEventListener('dblclick', (e) => {
    if (e.target.closest('[data-id="save"], [data-id="exit"]')) return;
    state.vertical = !state.vertical;
    applyState();
    store();
  });
})();
