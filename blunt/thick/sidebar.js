/* BluntCMS Thick — sidebar docked to the right: page bar, element header, tabs with foldable sections. */
(() => {
  'use strict';

  const B = window.Blunt;
  const S = B.sections;
  const svg = (body, size = 20) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
  const ICONS = {
    ...S.icons,
    grid: svg('<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/>'),
    page: svg('<path d="M7 3.5h6.5l5 5v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2zM13.5 3.5v5h5"/>'),
    chevron: svg('<path d="M6 9.5l6 6 6-6"/>', 16),
  };
  const LAYOUT_NOTE = 'Justify, align and gap work on flex and grid containers. Set display to flex or grid in the Position tab.';

  // Thick also edits these (the server allows them for this tier); Reset clears them too.
  B.STYLE_PROPS.push(
    'display', 'position', 'top', 'right', 'bottom', 'left', 'z-index', 'overflow',
    'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height', 'opacity',
  );

  // [id, label, icon, sections, relevant?]; each section is [key, title, renderer]
  const TABS = [
    ['box', 'Box', 'box', [['spacing', 'Spacing', S.box], ['size', 'Size', S.size]], (r) => r.box || r.size],
    ['position', 'Position', 'position', [['position', 'Position', S.position]], (r) => r.position],
    ['layout', 'Layout', 'grid', [['layout', 'Layout', S.layout]], (r) => r.layout],
    ['style', 'Style', 'colour', [['border', 'Border and corners', S.border], ['colours', 'Colours', S.colour], ['opacity', 'Opacity', S.opacity]], (r) => r.border || r.colour || r.opacity],
  ];

  // ---- Remembered state: tab and folded sections ----
  const KEY = 'blunt-thick-sidebar';
  let state = {};
  try {
    state = JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    state = {};
  }
  state.folded ||= {};
  const store = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      // storage unavailable — the sidebar just won't remember
    }
  };
  let tab = TABS.some(([id]) => id === state.tab) ? state.tab : 'box';

  let tokenMode = false;
  const useToken = (e) => tokenMode || !!(e && e.shiftKey);
  const f = B.makeFields({ icons: ICONS, useToken, onRefresh: () => updateChrome() });

  document.documentElement.classList.add('blunt-docked');

  // ---- Shell ----
  const side = B.mk('aside', 'blunt-ui blunt-panel blunt-sidebar', document.body);
  side.setAttribute('aria-label', 'Inspector');

  const site = B.mk('div', 'blunt-sitebar', side);
  const pagePill = B.mk('div', 'blunt-pagepill', site);
  pagePill.innerHTML = ICONS.page;
  const path = B.cfg.page.split('/');
  const file = path.pop();
  if (path.length) B.mk('span', 'blunt-pagepill-dir', pagePill).textContent = `${path.join(' / ')} / `;
  B.mk('span', 'blunt-pagepill-file', pagePill).textContent = file;

  const head = B.mk('div', 'blunt-sb-head', side);
  const crumbs = B.mk('div', 'blunt-crumbs', head);
  const nameLine = B.mk('div', 'blunt-sb-name', head);
  const nameText = B.mk('span', 'blunt-name', nameLine);
  const sizeText = B.mk('span', 'blunt-size', nameLine);

  const tabsBar = B.mk('div', 'blunt-sb-tabs', side);
  tabsBar.setAttribute('role', 'tablist');
  const blob = B.makeBlob(tabsBar);
  const tabButtons = {};
  for (const [id, label, icon] of TABS) {
    const b = f.iconButton(tabsBar, icon, label, 'is-blobbed');
    b.setAttribute('role', 'tab');
    b.addEventListener('click', () => {
      if (tab === id) return;
      tab = id;
      state.tab = id;
      store();
      render();
    });
    tabButtons[id] = b;
  }
  B.mk('span', 'blunt-divider', tabsBar);
  const tokenBtn = f.iconButton(tabsBar, 'tokens', 'Edit shared tokens (or hold Shift)');
  tokenBtn.setAttribute('aria-pressed', 'false');
  tokenBtn.addEventListener('click', () => {
    tokenMode = !tokenMode;
    tokenBtn.classList.toggle('is-active', tokenMode);
    tokenBtn.setAttribute('aria-pressed', String(tokenMode));
  });

  const body = B.mk('div', 'blunt-sb-body', side);
  body.setAttribute('role', 'tabpanel');

  // ---- Tab hides all editor UI; a small pill brings it back ----
  const unhide = B.mk('button', 'blunt-ui blunt-unhide', document.body);
  unhide.type = 'button';
  unhide.textContent = 'Show editor (Tab)';
  const toggleUi = () => document.documentElement.classList.toggle('blunt-hide-ui');
  unhide.addEventListener('click', toggleUi);
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab' || e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target;
    if (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
    e.preventDefault();
    toggleUi();
  });

  // ---- Header ----
  const current = () => (B.selected && B.selected.isConnected ? B.selected : null);

  /** Up to three editable parents below body, nearest last, each one click away. */
  function renderCrumbs(el) {
    crumbs.replaceChildren();
    if (!el) return;
    const chain = [];
    for (let p = el.parentElement; p && p !== document.body && chain.length < 4; p = p.parentElement) {
      if (p.matches('[data-blunt-id]')) chain.unshift(p);
    }
    if (chain.length > 3) {
      chain.shift();
      B.mk('span', 'blunt-crumb-more', crumbs).textContent = '… ›';
    }
    for (const p of chain) {
      const b = B.mk('button', 'blunt-crumb', crumbs);
      b.type = 'button';
      b.textContent = B.describe(p);
      b.dataset.tip = 'Select this parent';
      b.addEventListener('click', () => B.select(p));
      B.mk('span', 'blunt-crumb-sep', crumbs).textContent = '›';
    }
  }

  function updateChrome() {
    const el = current();
    const rel = S.relevance(el);
    for (const [id, label, , , isRelevant] of TABS) {
      const b = tabButtons[id];
      const active = id === tab;
      const relevant = isRelevant(rel);
      b.classList.toggle('is-active', active);
      b.classList.toggle('is-dim', !relevant);
      b.setAttribute('aria-selected', String(active));
      b.dataset.tip = relevant || !el ? label : `${label} · nothing set yet`;
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

  // ---- Body: the tab's sections, each foldable ----
  function render() {
    f.reset();
    body.replaceChildren();
    const el = current();
    renderCrumbs(el);
    const [, , , sections] = TABS.find(([id]) => id === tab);
    for (const [key, title, draw] of sections) {
      const sec = B.mk('section', 'blunt-sb-section', body);
      const folded = !!state.folded[key];
      sec.classList.toggle('is-folded', folded);
      const h = B.mk('button', 'blunt-sb-section-head', sec);
      h.type = 'button';
      h.setAttribute('aria-expanded', String(!folded));
      B.mk('span', '', h).textContent = title;
      h.insertAdjacentHTML('beforeend', ICONS.chevron);
      h.addEventListener('click', () => {
        state.folded[key] = !state.folded[key];
        store();
        render();
      });
      if (!folded) draw(B.mk('div', 'blunt-sb-section-body', sec), el, f, { containerNote: LAYOUT_NOTE });
    }
    f.refresh();
  }

  B.on('select', render);
  B.on('change', f.refresh);
  B.on('live', f.refresh);
  render();
})();
