/* BluntCMS Light — inspector panel in the toolbar's style: icon tabs and a fixed skeleton layout. */
(() => {
  'use strict';

  const B = window.Blunt;

  const TABS = [['box', 'Box'], ['border', 'Border'], ['colour', 'Colour'], ['layout', 'Layout']];

  // ---- Remembered state ----
  const KEY = 'blunt-panel';
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
      // storage unavailable — the panel just won't remember
    }
  };
  let tab = TABS.some(([id]) => id === state.tab) ? state.tab : 'box';

  const f = B.makeFields({ icons: B.sections.icons, useToken: (e) => useToken(e), onRefresh: () => updateChrome() });
  const iconButton = f.iconButton;

  // ---- Shell: icon bar, name line, body ----
  const panel = B.mk('aside', 'blunt-ui blunt-panel', document.body);
  panel.setAttribute('aria-label', 'Inspector');
  const bar = B.mk('div', 'blunt-panel-bar', panel);
  bar.setAttribute('role', 'tablist');
  const tabButtons = {};
  const blob = B.makeBlob(bar);
  for (const [id, label] of TABS) {
    const b = iconButton(bar, id, label, 'is-blobbed');
    b.setAttribute('role', 'tab');
    b.addEventListener('click', () => {
      if (tab === id && !state.collapsed) return;
      morph(() => {
        tab = id;
        state.tab = id;
        state.collapsed = false;
        store();
        applyState();
        render();
      });
    });
    tabButtons[id] = b;
  }
  B.mk('span', 'blunt-divider', bar);
  const tokenBtn = iconButton(bar, 'tokens', 'Edit shared tokens (or hold Shift)');
  tokenBtn.setAttribute('aria-pressed', 'false');
  let tokenMode = false;
  tokenBtn.addEventListener('click', () => {
    tokenMode = !tokenMode;
    tokenBtn.classList.toggle('is-active', tokenMode);
    tokenBtn.setAttribute('aria-pressed', String(tokenMode));
  });
  const useToken = (e) => tokenMode || !!(e && e.shiftKey);

  const nameLine = B.mk('div', 'blunt-panel-name', panel);
  const nameText = B.mk('span', 'blunt-name', nameLine);
  const sizeText = B.mk('span', 'blunt-size', nameLine);
  const body = B.mk('div', 'blunt-panel-body', panel);
  body.setAttribute('role', 'tabpanel');

  // ---- Height changes animate with a clip-path wipe ----
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  // The sides line up with the panel so the rounded corners land exactly on the moving bottom edge
  // (wider side insets would put the rounding outside the panel and leave square corners on the cut).
  // The top is left open so the shadow above isn't clipped.
  const clip = (cut) => `inset(-40px 0 ${Math.max(0, cut)}px 0 round 26px)`;
  let morphing = null;

  /** Runs change(), then wipes the panel open (grow) or closed (shrink) between the old and new height. */
  function morph(change) {
    // Stop a running wipe right away (cancel, not finish: finish events fire later, which left the
    // held height in place and made a quick second switch measure the wrong size and snap).
    if (morphing) {
      morphing.cancel();
      morphing = null;
    }
    panel.style.height = '';
    const before = panel.getBoundingClientRect().height;
    change();
    const after = panel.getBoundingClientRect().height;
    if (reducedMotion.matches || Math.abs(after - before) < 2) return;
    const timing = { duration: 280, easing: 'cubic-bezier(.2, .8, .2, 1)' };
    if (after > before) {
      morphing = panel.animate([{ clipPath: clip(after - before) }, { clipPath: clip(0) }], timing);
    } else {
      // Hold the old height while the cut moves up, then let the panel settle.
      panel.style.height = `${before}px`;
      morphing = panel.animate([{ clipPath: clip(0) }, { clipPath: clip(before - after) }], timing);
      const settle = () => {
        panel.style.height = '';
      };
      morphing.addEventListener('finish', settle);
      morphing.addEventListener('cancel', settle);
    }
    if (!state.collapsed) {
      body.animate([{ opacity: 0, transform: 'translateY(-4px)' }, { opacity: 1, transform: 'none' }], { duration: 200, easing: 'ease-out' });
    }
  }

  // ---- Drag (anywhere on the bar or name line), double-click to collapse ----
  const clamp = (v, max) => Math.min(Math.max(0, v), Math.max(0, max));
  const MARGIN = 8;
  /** Keeps the whole panel on screen: clamps the position and shortens the panel (body scrolls) when it sits low. */
  const applyState = () => {
    panel.classList.toggle('is-collapsed', !!state.collapsed);
    const headH = bar.offsetHeight + nameLine.offsetHeight;
    let top = 16;
    if (state.x != null) {
      panel.style.left = `${Math.max(MARGIN, clamp(state.x, window.innerWidth - panel.offsetWidth - MARGIN))}px`;
      top = Math.max(MARGIN, clamp(state.y, window.innerHeight - headH - MARGIN));
      panel.style.top = `${top}px`;
      panel.style.right = 'auto';
    }
    panel.style.maxHeight = `${window.innerHeight - top - MARGIN}px`;
  };
  applyState();
  window.addEventListener('resize', applyState);

  let drag = null;
  let suppressClick = false;
  for (const handle of [bar, nameLine]) {
    handle.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      const r = panel.getBoundingClientRect();
      drag = { sx: e.clientX, sy: e.clientY, ox: r.left, oy: r.top, moved: false };
    });
    handle.addEventListener('dblclick', (e) => {
      if (e.target.closest('button')) return;
      morph(() => {
        state.collapsed = !state.collapsed;
        applyState();
        store();
      });
    });
  }
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

  // ---- Render (tab contents come from B.sections, shared with other tiers) ----
  const LAYOUT_NOTE = 'Justify, align and gap work on flex and grid containers. Turning an element into one comes in BluntCMS Thick.';

  function updateChrome() {
    const el = B.selected && B.selected.isConnected ? B.selected : null;
    const rel = B.sections.relevance(el);
    for (const [id, label] of TABS) {
      const b = tabButtons[id];
      const active = id === tab;
      b.classList.toggle('is-active', active);
      b.classList.toggle('is-dim', !rel[id]);
      b.setAttribute('aria-selected', String(active));
      b.dataset.tip = rel[id] || !el ? label : `${label} · nothing set yet`;
    }
    blob.move(tabButtons[tab]);
    nameText.textContent = el ? B.describe(el) : 'Nothing selected';
    nameLine.classList.toggle('is-empty', !el);
    if (el) {
      const r = el.getBoundingClientRect();
      sizeText.textContent = `${Math.round(r.width)} × ${Math.round(r.height)}`;
    } else {
      sizeText.textContent = 'Select (V) an element';
    }
  }

  function render() {
    f.reset();
    body.replaceChildren();
    const el = B.selected && B.selected.isConnected ? B.selected : null;
    B.sections[tab](body, el, f, { containerNote: LAYOUT_NOTE });
    f.refresh();
  }

  B.on('select', () => morph(render));
  B.on('change', f.refresh);
  B.on('live', f.refresh);
  render();
})();
