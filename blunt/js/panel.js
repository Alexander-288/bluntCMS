/* BluntCMS Light — inspector panel in the toolbar's style: icon tabs, a fixed skeleton layout, the paint colour. */
(() => {
  'use strict';

  const B = window.Blunt;
  const SIDES = ['top', 'right', 'bottom', 'left'];
  const CORNERS = ['top-left', 'top-right', 'bottom-right', 'bottom-left'];
  const LENGTH = /^-?\d+(\.\d+)?(px|rem|em|%)$/;
  const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
  const FLEX_OR_GRID = /^(inline-)?(flex|grid)$/;
  const cap = (s) => s[0].toUpperCase() + s.slice(1);

  // ---- Icons (24px, same weight as the toolbar) ----
  const svg = (body) => `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
  const bars = (xs, w = 4) => xs.map(([x, y, hgt]) => `<rect x="${x}" y="${y}" width="${w}" height="${hgt}" rx="1.2" fill="currentColor" stroke="none"/>`).join('');
  const ICONS = {
    box: svg('<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><rect x="8.5" y="8.5" width="7" height="7" rx="1.5" fill="currentColor" stroke="none"/>'),
    border: svg('<path d="M4 20V11a7 7 0 0 1 7-7h9"/><path d="M4 20h0M20 4h0" stroke-width="3"/>'),
    colour: svg('<path d="M12 3.5s6.5 6.9 6.5 11a6.5 6.5 0 0 1-13 0c0-4.1 6.5-11 6.5-11z" fill="currentColor" stroke="none"/>'),
    layout: svg('<path d="M4 6h16M7 12h10M4 18h16"/>'),
    tokens: svg('<path d="M12 3.5l8.5 8.5-8.5 8.5L3.5 12z"/><path d="M12 8.5l3.5 3.5-3.5 3.5L8.5 12z" fill="currentColor" stroke="none"/>'),
    'none': svg('<circle cx="12" cy="12" r="7.5"/><path d="M6.8 17.2L17.2 6.8"/>'),
    solid: svg('<path d="M4 12h16" stroke-width="2.6"/>'),
    dashed: svg('<path d="M4 12h3.5M10.25 12h3.5M16.5 12H20" stroke-width="2.6"/>'),
    dotted: svg('<path d="M4.5 12h0M9.5 12h0M14.5 12h0M19.5 12h0" stroke-width="3"/>'),
    left: svg('<path d="M4 6h16M4 12h10M4 18h14"/>'),
    center: svg('<path d="M4 6h16M7 12h10M5 18h14"/>'),
    right: svg('<path d="M4 6h16M10 12h10M6 18h14"/>'),
    justify: svg('<path d="M4 6h16M4 12h16M4 18h16"/>'),
    'flex-start': svg(`<path d="M3 4v16"/>${bars([[6, 7, 10], [11, 7, 10]])}`),
    'jc-center': svg(`<path d="M12 4v2M12 18v2" />${bars([[6.5, 7, 10], [13.5, 7, 10]])}`),
    'flex-end': svg(`<path d="M21 4v16"/>${bars([[9, 7, 10], [14, 7, 10]])}`),
    'space-between': svg(`<path d="M3 4v16M21 4v16"/>${bars([[5.5, 7, 10], [14.5, 7, 10]])}`),
    'space-around': svg(`<path d="M3 4v16M21 4v16"/>${bars([[6.5, 7, 10], [13.5, 7, 10]])}`),
    'space-evenly': svg(`<path d="M3 4v16M21 4v16"/>${bars([[7, 7, 10], [13, 7, 10]])}`),
    'ai-start': svg(`<path d="M4 3h16"/>${bars([[6, 6, 8], [14, 6, 12]])}`),
    'ai-center': svg(`<path d="M4 12h2M18 12h2"/>${bars([[7, 8, 8], [13, 6, 12]])}`),
    'ai-end': svg(`<path d="M4 21h16"/>${bars([[6, 10, 8], [14, 6, 12]])}`),
    stretch: svg(`<path d="M4 3h16M4 21h16"/>${bars([[7, 6, 12], [13, 6, 12]])}`),
    baseline: svg(`${bars([[6, 6, 10], [14, 9, 7]])}<path d="M3 14h18" stroke-dasharray="2 2"/>`),
  };

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

  // ---- Floating tooltip (same pill as the toolbar's labels; never clipped by scrolling) ----
  const tip = B.mk('div', 'blunt-ui blunt-tooltip', document.body);
  tip.hidden = true;
  document.addEventListener('pointerover', (e) => {
    const t = e.target.closest && e.target.closest('.blunt-panel [data-tip], .blunt-picker [data-tip]');
    if (!t) {
      tip.hidden = true;
      return;
    }
    tip.textContent = t.dataset.tip;
    tip.hidden = false;
    const r = t.getBoundingClientRect();
    const below = r.bottom + 8 + tip.offsetHeight < window.innerHeight;
    tip.style.top = `${below ? r.bottom + 8 : r.top - tip.offsetHeight - 8}px`;
    tip.style.left = `${Math.min(Math.max(4, r.left + r.width / 2 - tip.offsetWidth / 2), window.innerWidth - tip.offsetWidth - 4)}px`;
  });
  document.addEventListener('pointerdown', () => {
    tip.hidden = true;
  }, true);

  // ---- Shell: icon bar, name line, paint, body ----
  const panel = B.mk('aside', 'blunt-ui blunt-panel', document.body);
  panel.setAttribute('aria-label', 'Inspector');
  const bar = B.mk('div', 'blunt-panel-bar', panel);
  bar.setAttribute('role', 'tablist');
  const iconButton = (parent, id, label, cls = '') => {
    const b = B.mk('button', `blunt-ibtn ${cls}`.trim(), parent);
    b.type = 'button';
    b.innerHTML = ICONS[id];
    b.dataset.tip = label;
    b.setAttribute('aria-label', label);
    return b;
  };
  const tabButtons = {};
  for (const [id, label] of TABS) {
    const b = iconButton(bar, id, label);
    b.setAttribute('role', 'tab');
    b.addEventListener('click', () => {
      tab = id;
      state.tab = id;
      store();
      render();
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
  const paintBox = B.mk('div', 'blunt-paint', panel);
  const body = B.mk('div', 'blunt-panel-body', panel);
  body.setAttribute('role', 'tabpanel');

  // ---- Drag (anywhere on the bar or name line), double-click to collapse ----
  const clamp = (v, max) => Math.min(Math.max(0, v), Math.max(0, max));
  const applyState = () => {
    panel.classList.toggle('is-collapsed', !!state.collapsed);
    if (state.x == null) return;
    panel.style.left = `${clamp(state.x, window.innerWidth - panel.offsetWidth)}px`;
    panel.style.top = `${clamp(state.y, window.innerHeight - 56)}px`;
    panel.style.right = 'auto';
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
      state.collapsed = !state.collapsed;
      applyState();
      store();
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

  // ---- Applying values ----

  /** Sets several props as one undo step ('' clears). In token mode, edits the first set prop's token. */
  function setStyles(el, values, e) {
    if (useToken(e)) {
      const prop = Object.keys(values).find((p) => values[p] !== '');
      if (!prop) return;
      const value = values[prop];
      const t = B.tokenFor(el, prop);
      if (t.error) {
        B.toast(`Can't edit a token here: ${t.error}.`, 'error');
        return;
      }
      const rec = { kind: 'token', name: t.name, before: B.currentToken(t.name), after: value };
      B.applyValue(rec, value);
      B.commit([rec]);
      return;
    }
    // Clears first, then sets — so a shorthand set after clearing its longhands wins.
    const group = Object.entries(values)
      .map(([p, v]) => B.styleRec(el, p, B.currentStyle(el, p), v))
      .sort((a, b) => (a.after === '' ? 0 : 1) - (b.after === '' ? 0 : 1));
    group.forEach((r) => B.applyValue(r, r.after));
    B.commit(group);
  }

  // ---- Field builders. With no element (or when disabled) they render as an empty skeleton. ----
  let updaters = [];
  const refresh = () => {
    updaters.forEach((fn) => fn());
    updateChrome();
  };
  const computed = (el, prop) => getComputedStyle(el).getPropertyValue(prop);
  const px = (el, prop) => String(Math.round(parseFloat(computed(el, prop)) || 0));
  const isTransparent = (c) => /rgba\(.*,\s*0\)$/.test(c) || c === 'transparent';

  function row(parent, label) {
    const r = B.mk('div', 'blunt-row', parent);
    if (label) B.mk('span', 'blunt-row-label', r).textContent = label;
    return r;
  }

  function note(parent, text) {
    B.mk('p', 'blunt-note', parent).textContent = text;
  }

  /** Number pill: drag sideways to scrub, click to type, ↑/↓ to step, empty to clear. */
  function numberField(parent, el, { props, clear = [], min = 0, allowAuto = false, read, label, disabled = false }) {
    const input = B.mk('input', 'blunt-num', parent);
    input.type = 'text';
    input.spellcheck = false;
    input.setAttribute('aria-label', label);
    input.dataset.tip = cap(label);
    if (!el || disabled) {
      input.disabled = true;
      input.value = '–';
      return;
    }
    const show = read || (() => (allowAuto && B.currentStyle(el, props[0]) === 'auto' ? 'auto' : px(el, props[0])));

    updaters.push(() => {
      if (document.activeElement !== input) input.value = show();
      input.classList.toggle('is-set', props.some((p) => B.currentStyle(el, p) !== ''));
      input.classList.toggle('has-token', !!B.tokenFor(el, props[0]).name);
    });
    updaters[updaters.length - 1]();

    const valuesFor = (v) => {
      const out = {};
      clear.forEach((p) => {
        out[p] = '';
      });
      props.forEach((p) => {
        out[p] = v;
      });
      return out;
    };
    const parse = (raw) => {
      const v = raw.trim();
      if (v === '') return '';
      if (allowAuto && v === 'auto') return 'auto';
      const withUnit = /^-?\d+(\.\d+)?$/.test(v) ? `${v}px` : v;
      if (withUnit !== '0' && !LENGTH.test(withUnit)) return null;
      if (min >= 0 && withUnit.startsWith('-')) return null;
      return withUnit;
    };

    input.addEventListener('change', () => {
      const v = parse(input.value);
      if (v === null) {
        B.toast('Use a size like 12, 12px, 1.5rem or 50%.', 'error');
        input.value = show();
        return;
      }
      setStyles(el, valuesFor(v), null);
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        input.blur();
      } else if (e.key === 'Escape') {
        input.value = show();
        input.blur();
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const step = (e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? 10 : 1);
        const n = Math.max(min, (parseFloat(input.value) || 0) + step);
        input.value = String(n);
        setStyles(el, valuesFor(`${n}px`), null);
      }
    });

    let scrub = null;
    input.addEventListener('pointerdown', (e) => {
      if (document.activeElement === input || e.button !== 0) return;
      e.preventDefault();
      scrub = { x: e.clientX, start: parseFloat(show()) || 0, moved: false, token: useToken(e), before: {}, value: null };
      try {
        input.setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    });
    input.addEventListener('pointermove', (e) => {
      if (!scrub) return;
      const dx = e.clientX - scrub.x;
      if (!scrub.moved) {
        if (Math.abs(dx) < 3) return;
        scrub.moved = true;
        if (scrub.token) {
          const t = B.tokenFor(el, props[0]);
          if (t.error) {
            B.toast(`Can't edit a token here: ${t.error}.`, 'error');
            scrub = null;
            return;
          }
          scrub.tokenName = t.name;
          scrub.before.token = B.currentToken(t.name);
        } else {
          Object.keys(valuesFor('')).forEach((p) => {
            scrub.before[p] = B.currentStyle(el, p);
          });
        }
      }
      const n = Math.max(min, Math.round(scrub.start + dx));
      scrub.value = `${n}px`;
      input.value = String(n);
      if (scrub.token) {
        document.documentElement.style.setProperty(scrub.tokenName, scrub.value);
      } else {
        clear.forEach((p) => el.style.removeProperty(p));
        props.forEach((p) => el.style.setProperty(p, scrub.value));
      }
    });
    input.addEventListener('pointerup', () => {
      if (!scrub) return;
      const s = scrub;
      scrub = null;
      if (!s.moved) {
        input.focus();
        input.select();
        return;
      }
      if (s.value === null) return;
      if (s.token) {
        B.commit([{ kind: 'token', name: s.tokenName, before: s.before.token, after: s.value }]);
      } else {
        const values = valuesFor(s.value);
        const group = Object.keys(values)
          .map((p) => B.styleRec(el, p, s.before[p], values[p]))
          .sort((a, b) => (a.after === '' ? 0 : 1) - (b.after === '' ? 0 : 1));
        B.commit(group);
      }
    });
  }

  /** Icon button group for a keyword property. Clicking the active inline value again clears it. */
  function iconSeg(parent, el, { prop, options, disabled = false }) {
    const seg = B.mk('div', 'blunt-iseg', parent);
    const buttons = options.map(([value, icon, label]) => {
      const b = iconButton(seg, icon, label, 'is-sm');
      b.disabled = !el || disabled;
      b.addEventListener('click', () => {
        // Keywords can't be tokens, so these always edit the element itself.
        const next = B.currentStyle(el, prop) === value ? '' : value;
        const rec = B.styleRec(el, prop, B.currentStyle(el, prop), next);
        B.applyValue(rec, next);
        B.commit([rec]);
      });
      return [value, b];
    });
    if (!el || disabled) return;
    updaters.push(() => {
      const current = computed(el, prop);
      buttons.forEach(([value, b]) => b.classList.toggle('is-active', current === value));
      seg.classList.toggle('is-set', B.currentStyle(el, prop) !== '');
    });
    updaters[updaters.length - 1]();
  }

  /** Round colour dot (opens the picker) + hex pill. */
  function colourField(parent, el, { prop, label }) {
    const r = row(parent, label);
    const line = B.mk('div', 'blunt-colourrow', r);
    const dot = B.mk('button', 'blunt-swatch is-lg', line);
    dot.type = 'button';
    dot.dataset.tip = `Pick ${label.toLowerCase()} colour`;
    dot.setAttribute('aria-label', `Pick ${label.toLowerCase()} colour`);
    const hex = B.mk('input', 'blunt-input', line);
    hex.type = 'text';
    hex.maxLength = 9;
    hex.spellcheck = false;
    hex.setAttribute('aria-label', `${label} hex`);
    if (!el) {
      dot.disabled = true;
      dot.classList.add('is-empty');
      hex.disabled = true;
      hex.value = '–';
      return;
    }

    updaters.push(() => {
      const value = computed(el, prop);
      dot.classList.toggle('is-empty', isTransparent(value));
      dot.style.background = isTransparent(value) ? '' : value;
      if (document.activeElement !== hex) hex.value = isTransparent(value) ? 'none' : B.toHex(value);
      hex.classList.toggle('is-set', B.currentStyle(el, prop) !== '');
      hex.classList.toggle('has-token', !!B.tokenFor(el, prop).name);
    });
    updaters[updaters.length - 1]();

    dot.addEventListener('click', (e) => {
      const token = useToken(e) ? B.tokenFor(el, prop) : null;
      if (token && token.error) {
        B.toast(`Can't edit a token here: ${token.error}.`, 'error');
        return;
      }
      const before = token ? B.currentToken(token.name) : B.currentStyle(el, prop);
      const live = (c) => {
        if (token) document.documentElement.style.setProperty(token.name, c);
        else el.style.setProperty(prop, c);
        refresh();
      };
      B.openPicker(dot, computed(el, prop), {
        onInput: live,
        onDone: (c) => {
          if (c === null) {
            if (token) document.documentElement.style.setProperty(token.name, before);
            else if (before) el.style.setProperty(prop, before);
            else el.style.removeProperty(prop);
            refresh();
            return;
          }
          const rec = token ? { kind: 'token', name: token.name, before, after: c } : B.styleRec(el, prop, before, c);
          B.applyValue(rec, c);
          B.commit([rec]);
        },
      });
    });

    hex.addEventListener('change', () => {
      const v = hex.value.trim().toLowerCase();
      if (v === '' || v === 'none') {
        setStyles(el, { [prop]: '' }, null);
        return;
      }
      if (!HEX.test(v)) {
        B.toast('Use a hex colour like #1a1a1a.', 'error');
        refresh();
        return;
      }
      setStyles(el, { [prop]: v }, null);
    });
    hex.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') hex.blur();
    });
  }

  // ---- Tabs (always the same skeleton; el may be null) ----
  const RENDER = {
    box(el) {
      const ring = (parent, name, cls) => {
        const r = B.mk('div', `blunt-ring ${cls}`, parent);
        B.mk('span', 'blunt-ring-label', r).textContent = name;
        const cells = {};
        for (const side of SIDES) cells[side] = B.mk('div', `blunt-cell blunt-cell-${side}`, r);
        cells.inner = B.mk('div', 'blunt-cell blunt-cell-inner', r);
        return cells;
      };
      const margin = ring(body, 'Margin', 'is-margin');
      const border = ring(margin.inner, 'Border', 'is-border');
      const padding = ring(border.inner, 'Padding', 'is-padding');
      for (const side of SIDES) {
        numberField(margin[side], el, { props: [`margin-${side}`], min: -Infinity, allowAuto: side === 'left' || side === 'right', label: `margin ${side}` });
        numberField(border[side], el, { props: [`border-${side}-width`], label: `border ${side}` });
        numberField(padding[side], el, { props: [`padding-${side}`], label: `padding ${side}` });
      }
      const content = B.mk('div', 'blunt-content', padding.inner);
      content.textContent = '–';
      if (el) {
        updaters.push(() => {
          const r = el.getBoundingClientRect();
          content.textContent = `${Math.round(r.width)} × ${Math.round(r.height)}`;
        });
      }
      note(body, 'Drag a number to scrub · click to type · empty to clear');
    },

    border(el) {
      iconSeg(row(body, 'Style'), el, {
        prop: 'border-style',
        options: [['none', 'none', 'No border'], ['solid', 'solid', 'Solid'], ['dashed', 'dashed', 'Dashed'], ['dotted', 'dotted', 'Dotted']],
      });

      const w = row(body, 'Width');
      numberField(B.mk('div', 'blunt-all', w), el, { props: SIDES.map((s) => `border-${s}-width`), label: 'all sides' });
      const wq = B.mk('div', 'blunt-quad', w);
      SIDES.forEach((s) => numberField(wq, el, { props: [`border-${s}-width`], label: `${s} width` }));

      colourField(body, el, { prop: 'border-color', label: 'Colour' });

      const r = row(body, 'Radius');
      numberField(B.mk('div', 'blunt-all', r), el, {
        props: ['border-radius'],
        clear: CORNERS.map((c) => `border-${c}-radius`),
        label: 'all corners',
        read: () => px(el, 'border-top-left-radius'),
      });
      const rq = B.mk('div', 'blunt-quad', r);
      CORNERS.forEach((c) => numberField(rq, el, { props: [`border-${c}-radius`], label: `${c.replace('-', ' ')} corner` }));
    },

    colour(el) {
      colourField(body, el, { prop: 'color', label: 'Text' });
      colourField(body, el, { prop: 'background-color', label: 'Background' });
      colourField(body, el, { prop: 'border-color', label: 'Border' });
    },

    layout(el) {
      iconSeg(row(body, 'Text align'), el, {
        prop: 'text-align',
        options: [['left', 'left', 'Left'], ['center', 'center', 'Centre'], ['right', 'right', 'Right'], ['justify', 'justify', 'Justify']],
      });

      const block = row(body, 'Block');
      const centre = B.mk('button', 'blunt-pill', block);
      centre.type = 'button';
      centre.textContent = 'Centre in parent';
      centre.dataset.tip = 'Sets left and right margins to auto. Needs the element to be narrower than its parent.';
      centre.disabled = !el;
      if (el) {
        const isCentred = () => B.currentStyle(el, 'margin-left') === 'auto' && B.currentStyle(el, 'margin-right') === 'auto';
        centre.addEventListener('click', () => {
          const v = isCentred() ? '' : 'auto';
          setStyles(el, { 'margin-left': v, 'margin-right': v }, null);
        });
        updaters.push(() => centre.classList.toggle('is-active', isCentred()));
      }

      const container = !!el && FLEX_OR_GRID.test(computed(el, 'display'));
      iconSeg(row(body, 'Justify'), el, {
        prop: 'justify-content',
        disabled: !container,
        options: [
          ['flex-start', 'flex-start', 'Start'], ['center', 'jc-center', 'Centre'], ['flex-end', 'flex-end', 'End'],
          ['space-between', 'space-between', 'Space between'], ['space-around', 'space-around', 'Space around'], ['space-evenly', 'space-evenly', 'Space evenly'],
        ],
      });
      iconSeg(row(body, 'Align'), el, {
        prop: 'align-items',
        disabled: !container,
        options: [['flex-start', 'ai-start', 'Top'], ['center', 'ai-center', 'Middle'], ['flex-end', 'ai-end', 'Bottom'], ['stretch', 'stretch', 'Stretch'], ['baseline', 'baseline', 'Baseline']],
      });
      numberField(B.mk('div', 'blunt-all', row(body, 'Gap')), el, { props: ['gap'], label: 'gap', disabled: !container });
      if (el && !container) note(body, 'Justify, align and gap work on flex and grid containers. Turning an element into one comes in BluntCMS Thick.');
    },
  };

  /** Which tabs have something for this element — the rest get a dimmed icon. */
  function relevance(el) {
    if (!el || !el.isConnected) return { box: false, border: false, colour: false, layout: false };
    const cs = getComputedStyle(el);
    const any = (props) => props.some((p) => parseFloat(cs.getPropertyValue(p)) > 0);
    const hasBorder = SIDES.some((s) => cs.getPropertyValue(`border-${s}-style`) !== 'none' && parseFloat(cs.getPropertyValue(`border-${s}-width`)) > 0);
    const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    return {
      box: hasBorder || any(SIDES.flatMap((s) => [`margin-${s}`, `padding-${s}`])),
      border: hasBorder || any(CORNERS.map((c) => `border-${c}-radius`)),
      colour: hasText || hasBorder || !isTransparent(cs.backgroundColor),
      layout: hasText || FLEX_OR_GRID.test(cs.display) || (cs.marginLeft === cs.marginRight && B.currentStyle(el, 'margin-left') === 'auto'),
    };
  }

  function updateChrome() {
    const el = B.selected && B.selected.isConnected ? B.selected : null;
    const rel = relevance(el);
    for (const [id, label] of TABS) {
      const b = tabButtons[id];
      const active = id === tab;
      b.classList.toggle('is-active', active);
      b.classList.toggle('is-dim', !rel[id]);
      b.setAttribute('aria-selected', String(active));
      b.dataset.tip = rel[id] || !el ? label : `${label} · nothing set yet`;
    }
    nameText.textContent = el ? B.describe(el) : 'Nothing selected';
    nameLine.classList.toggle('is-empty', !el);
    if (el) {
      const r = el.getBoundingClientRect();
      sizeText.textContent = `${Math.round(r.width)} × ${Math.round(r.height)}`;
    } else {
      sizeText.textContent = 'Select (V) an element';
    }
  }

  // ---- Paint colour (Fill tool) ----
  function renderPaint() {
    paintBox.replaceChildren();
    paintBox.hidden = B.tool !== 'fill';
    if (paintBox.hidden) return;
    const r = row(paintBox, 'Paint');
    const line = B.mk('div', 'blunt-colourrow', r);
    const dot = B.mk('button', 'blunt-swatch is-lg', line);
    dot.type = 'button';
    dot.style.background = B.paint.color;
    dot.dataset.tip = 'Pick paint colour';
    dot.setAttribute('aria-label', 'Pick paint colour');
    const hex = B.mk('input', 'blunt-input', line);
    hex.type = 'text';
    hex.maxLength = 9;
    hex.value = B.paint.color;
    hex.setAttribute('aria-label', 'Paint hex');
    const before = B.paint.color;
    dot.addEventListener('click', () => {
      B.openPicker(dot, B.paint.color, {
        onInput: (c) => {
          B.paint.color = c;
          dot.style.background = c;
          hex.value = c;
        },
        onDone: (c) => {
          B.paint.color = c || before;
          renderPaint();
        },
      });
    });
    hex.addEventListener('change', () => {
      const v = hex.value.trim().toLowerCase();
      if (!HEX.test(v)) {
        B.toast('Use a hex colour like #1a1a1a.', 'error');
        hex.value = B.paint.color;
        return;
      }
      B.paint.color = v;
      dot.style.background = v;
    });
    const seg = B.mk('div', 'blunt-iseg is-text', r);
    for (const [label, prop] of [['Background', 'background-color'], ['Text', 'color'], ['Border', 'border-color']]) {
      const b = B.mk('button', 'blunt-segtext', seg);
      b.type = 'button';
      b.textContent = label;
      b.classList.toggle('is-active', B.paint.prop === prop);
      b.addEventListener('click', () => {
        B.paint.prop = prop;
        renderPaint();
      });
    }
    note(paintBox, 'Click paints · Alt-click picks a colour · Shift-click paints the token');
  }

  // ---- Render ----
  function render() {
    updaters = [];
    body.replaceChildren();
    const el = B.selected && B.selected.isConnected ? B.selected : null;
    RENDER[tab](el);
    refresh();
  }

  B.on('select', render);
  B.on('change', refresh);
  B.on('live', refresh);
  B.on('tool', renderPaint);
  B.on('paint', renderPaint);
  render();
  renderPaint();
})();
