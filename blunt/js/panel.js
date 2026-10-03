/* BluntCMS Light — inspector panel: Box, Border, Colour and Layout tabs for the selected element, plus the paint colour. */
(() => {
  'use strict';

  const B = window.Blunt;
  const SIDES = ['top', 'right', 'bottom', 'left'];
  const CORNERS = ['top-left', 'top-right', 'bottom-right', 'bottom-left'];
  const LENGTH = /^-?\d+(\.\d+)?(px|rem|em|%)$/;
  const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
  const FLEX_OR_GRID = /^(inline-)?(flex|grid)$/;
  const TABS = [['box', 'Box'], ['border', 'Border'], ['colour', 'Colour'], ['layout', 'Layout']];

  // ---- Remembered panel state ----
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

  // ---- Shell ----
  const panel = B.mk('aside', 'blunt-ui blunt-panel', document.body);
  panel.setAttribute('aria-label', 'Inspector');
  const head = B.mk('div', 'blunt-panel-head', panel);
  const title = B.mk('span', 'blunt-panel-title', head);
  const tokenBtn = B.mk('button', 'blunt-chip', head);
  tokenBtn.type = 'button';
  tokenBtn.textContent = 'Tokens';
  tokenBtn.title = 'Edit the shared token instead of this element (or hold Shift)';
  tokenBtn.setAttribute('aria-pressed', 'false');
  const paintBox = B.mk('div', 'blunt-paint', panel);
  const tabBar = B.mk('div', 'blunt-seg blunt-tabs', panel);
  tabBar.setAttribute('role', 'tablist');
  const body = B.mk('div', 'blunt-panel-body', panel);

  let tokenMode = false;
  tokenBtn.addEventListener('click', () => {
    tokenMode = !tokenMode;
    tokenBtn.classList.toggle('is-active', tokenMode);
    tokenBtn.setAttribute('aria-pressed', String(tokenMode));
  });
  const useToken = (e) => tokenMode || !!(e && e.shiftKey);

  for (const [id, label] of TABS) {
    const b = B.mk('button', '', tabBar);
    b.type = 'button';
    b.textContent = label;
    b.dataset.tab = id;
    b.setAttribute('role', 'tab');
    b.addEventListener('click', () => {
      tab = id;
      state.tab = id;
      store();
      render();
    });
  }

  // ---- Position, drag and collapse ----
  const clamp = (v, max) => Math.min(Math.max(0, v), Math.max(0, max));
  const applyState = () => {
    panel.classList.toggle('is-collapsed', !!state.collapsed);
    if (state.x == null) return;
    panel.style.left = `${clamp(state.x, window.innerWidth - panel.offsetWidth)}px`;
    panel.style.top = `${clamp(state.y, window.innerHeight - 48)}px`;
    panel.style.right = 'auto';
  };
  applyState();
  window.addEventListener('resize', applyState);

  let drag = null;
  head.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || e.target.closest('button')) return;
    const r = panel.getBoundingClientRect();
    drag = { sx: e.clientX, sy: e.clientY, ox: r.left, oy: r.top, moved: false };
    try {
      head.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  });
  head.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.sx;
    const dy = e.clientY - drag.sy;
    if (!drag.moved && Math.hypot(dx, dy) < 4) return;
    drag.moved = true;
    state.x = drag.ox + dx;
    state.y = drag.oy + dy;
    applyState();
  });
  head.addEventListener('pointerup', () => {
    if (drag && drag.moved) store();
    drag = null;
  });
  head.addEventListener('dblclick', (e) => {
    if (e.target.closest('button')) return;
    state.collapsed = !state.collapsed;
    applyState();
    store();
  });

  // ---- Applying values ----

  /** Sets several props at once as one undo step ('' clears). In token mode, edits the first set prop's token. */
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

  // ---- Field builders. Each registers an updater so the panel tracks undo and canvas drags. ----
  let updaters = [];
  const refresh = () => updaters.forEach((fn) => fn());
  const computed = (el, prop) => getComputedStyle(el).getPropertyValue(prop);
  const px = (el, prop) => String(Math.round(parseFloat(computed(el, prop)) || 0));

  function row(parent, label) {
    const r = B.mk('div', 'blunt-row', parent);
    if (label) B.mk('span', 'blunt-row-label', r).textContent = label;
    return r;
  }

  /**
   * A number input you can type into or drag sideways to scrub.
   * props: properties it sets together · clear: extra props cleared alongside (e.g. radius longhands)
   */
  function numberField(parent, el, { props, clear = [], min = 0, allowAuto = false, read, label }) {
    const input = B.mk('input', 'blunt-num', parent);
    input.type = 'text';
    input.spellcheck = false;
    input.setAttribute('aria-label', label || props[0]);
    input.title = `${label || props[0]} — drag to scrub, type to set, empty to clear`;
    const show = read || (() => (allowAuto && B.currentStyle(el, props[0]) === 'auto' ? 'auto' : px(el, props[0])));

    const update = () => {
      if (document.activeElement !== input) input.value = show();
      input.classList.toggle('is-set', props.some((p) => B.currentStyle(el, p) !== ''));
      input.classList.toggle('has-token', !!B.tokenFor(el, props[0]).name);
    };
    updaters.push(update);
    update();

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

    // Scrub: drag sideways. A click without dragging focuses for typing.
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
        const values = valuesFor(scrub.value);
        clear.forEach((p) => el.style.removeProperty(p));
        props.forEach((p) => el.style.setProperty(p, values[p]));
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
    return input;
  }

  /** Row of buttons for a keyword property. Clicking the active inline value again clears it. */
  function segField(parent, el, { prop, options }) {
    const seg = B.mk('div', 'blunt-seg blunt-seg-sm', parent);
    const buttons = options.map(([value, label]) => {
      const b = B.mk('button', '', seg);
      b.type = 'button';
      b.textContent = label;
      b.title = value;
      b.addEventListener('click', () => {
        // Keyword values can't be tokens, so these always edit the element itself.
        const next = B.currentStyle(el, prop) === value ? '' : value;
        const rec = B.styleRec(el, prop, B.currentStyle(el, prop), next);
        B.applyValue(rec, next);
        B.commit([rec]);
      });
      return [value, b];
    });
    updaters.push(() => {
      const current = computed(el, prop);
      buttons.forEach(([value, b]) => b.classList.toggle('is-active', current === value));
      seg.classList.toggle('is-set', B.currentStyle(el, prop) !== '');
    });
    updaters[updaters.length - 1]();
  }

  /** Colour swatch + hex field. Live preview while picking; one undo step per pick. */
  function colorField(parent, el, { prop, label }) {
    const r = row(parent, label);
    const line = B.mk('div', 'blunt-colorrow', r);
    const color = B.mk('input', 'blunt-color', line);
    color.type = 'color';
    color.setAttribute('aria-label', `${label} colour`);
    const hex = B.mk('input', 'blunt-input', line);
    hex.type = 'text';
    hex.maxLength = 9;
    hex.spellcheck = false;
    hex.setAttribute('aria-label', `${label} hex`);

    updaters.push(() => {
      const value = B.toHex(computed(el, prop));
      if (document.activeElement !== hex) hex.value = value;
      if (document.activeElement !== color) color.value = value;
      hex.classList.toggle('is-set', B.currentStyle(el, prop) !== '');
      hex.classList.toggle('has-token', !!B.tokenFor(el, prop).name);
    });
    updaters[updaters.length - 1]();

    let live = null;
    color.addEventListener('input', () => {
      if (useToken(null)) return; // tokens are applied on change only
      if (!live) live = B.currentStyle(el, prop);
      el.style.setProperty(prop, color.value);
      hex.value = color.value;
    });
    color.addEventListener('change', () => {
      if (live !== null) {
        el.style.setProperty(prop, live || '');
        if (!live) el.style.removeProperty(prop);
        live = null;
      }
      setStyles(el, { [prop]: color.value }, null);
    });
    hex.addEventListener('change', () => {
      const v = hex.value.trim().toLowerCase();
      if (v === '') {
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

  function note(parent, text) {
    B.mk('p', 'blunt-note', parent).textContent = text;
  }

  // ---- Tabs ----
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
      const margin = ring(body, 'margin', 'is-margin');
      const border = ring(margin.inner, 'border', 'is-border');
      const padding = ring(border.inner, 'padding', 'is-padding');
      for (const side of SIDES) {
        numberField(margin[side], el, { props: [`margin-${side}`], min: -Infinity, allowAuto: side === 'left' || side === 'right', label: `margin ${side}` });
        numberField(border[side], el, { props: [`border-${side}-width`], label: `border ${side}` });
        numberField(padding[side], el, { props: [`padding-${side}`], label: `padding ${side}` });
      }
      const content = B.mk('div', 'blunt-content', padding.inner);
      const size = () => {
        const r = el.getBoundingClientRect();
        content.textContent = `${Math.round(r.width)} × ${Math.round(r.height)}`;
      };
      updaters.push(size);
      size();
      note(body, 'Drag a number to scrub · type to set · empty to clear');
    },

    border(el) {
      segField(row(body, 'Style'), el, {
        prop: 'border-style',
        options: [['none', 'None'], ['solid', 'Solid'], ['dashed', 'Dashed'], ['dotted', 'Dotted']],
      });

      const widths = SIDES.map((s) => `border-${s}-width`);
      const w = row(body, 'Width');
      numberField(B.mk('div', 'blunt-all', w), el, { props: widths, label: 'all widths' });
      const wq = B.mk('div', 'blunt-quad', w);
      SIDES.forEach((s) => numberField(wq, el, { props: [`border-${s}-width`], label: `${s} width` }));

      colorField(body, el, { prop: 'border-color', label: 'Colour' });

      const longhands = CORNERS.map((c) => `border-${c}-radius`);
      const r = row(body, 'Radius');
      numberField(B.mk('div', 'blunt-all', r), el, {
        props: ['border-radius'],
        clear: longhands,
        label: 'all corners',
        read: () => px(el, 'border-top-left-radius'),
      });
      const rq = B.mk('div', 'blunt-quad', r);
      CORNERS.forEach((c) => numberField(rq, el, { props: [`border-${c}-radius`], label: `${c} radius` }));
    },

    colour(el) {
      colorField(body, el, { prop: 'color', label: 'Text' });
      colorField(body, el, { prop: 'background-color', label: 'Background' });
      colorField(body, el, { prop: 'border-color', label: 'Border' });
    },

    layout(el) {
      segField(row(body, 'Text'), el, {
        prop: 'text-align',
        options: [['left', 'Left'], ['center', 'Centre'], ['right', 'Right'], ['justify', 'Justify']],
      });

      const block = row(body, 'Block');
      const centre = B.mk('button', 'blunt-chip blunt-wide', block);
      centre.type = 'button';
      centre.textContent = 'Centre in parent';
      const isCentred = () => B.currentStyle(el, 'margin-left') === 'auto' && B.currentStyle(el, 'margin-right') === 'auto';
      centre.addEventListener('click', () => {
        const v = isCentred() ? '' : 'auto';
        setStyles(el, { 'margin-left': v, 'margin-right': v }, null);
      });
      updaters.push(() => centre.classList.toggle('is-active', isCentred()));
      updaters[updaters.length - 1]();
      note(block, 'Works when the element is narrower than its parent.');

      if (FLEX_OR_GRID.test(computed(el, 'display'))) {
        segField(row(body, 'Justify'), el, {
          prop: 'justify-content',
          options: [['flex-start', 'Start'], ['center', 'Centre'], ['flex-end', 'End'], ['space-between', 'Between'], ['space-around', 'Around'], ['space-evenly', 'Evenly']],
        });
        segField(row(body, 'Align'), el, {
          prop: 'align-items',
          options: [['flex-start', 'Start'], ['center', 'Centre'], ['flex-end', 'End'], ['stretch', 'Stretch'], ['baseline', 'Base']],
        });
        numberField(B.mk('div', 'blunt-all', row(body, 'Gap')), el, { props: ['gap'], label: 'gap' });
      } else {
        note(body, 'Justify, align and gap show up for flex and grid containers. Turning an element into one comes in BluntCMS Thick.');
      }
    },
  };

  // ---- Paint (Fill tool) ----
  function renderPaint() {
    paintBox.replaceChildren();
    paintBox.hidden = B.tool !== 'fill';
    if (paintBox.hidden) return;
    const r = row(paintBox, 'Paint');
    const line = B.mk('div', 'blunt-colorrow', r);
    const color = B.mk('input', 'blunt-color', line);
    color.type = 'color';
    color.value = B.paint.color.length === 7 ? B.paint.color : '#000000';
    color.setAttribute('aria-label', 'Paint colour');
    const hex = B.mk('input', 'blunt-input', line);
    hex.type = 'text';
    hex.maxLength = 9;
    hex.value = B.paint.color;
    hex.setAttribute('aria-label', 'Paint hex');
    color.addEventListener('input', () => {
      B.paint.color = color.value;
      hex.value = color.value;
    });
    hex.addEventListener('change', () => {
      const v = hex.value.trim().toLowerCase();
      if (!HEX.test(v)) {
        B.toast('Use a hex colour like #1a1a1a.', 'error');
        hex.value = B.paint.color;
        return;
      }
      B.paint.color = v;
      if (v.length === 7) color.value = v;
    });
    const seg = B.mk('div', 'blunt-seg blunt-seg-sm', r);
    for (const [label, prop] of [['Background', 'background-color'], ['Text', 'color'], ['Border', 'border-color']]) {
      const b = B.mk('button', '', seg);
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
    tabBar.querySelectorAll('button').forEach((b) => {
      const active = b.dataset.tab === tab;
      b.classList.toggle('is-active', active);
      b.setAttribute('aria-selected', String(active));
    });
    const el = B.selected;
    if (!el || !el.isConnected) {
      title.textContent = 'Inspector';
      note(body, 'Pick an element with Select (V) to see its styles.');
      return;
    }
    title.textContent = B.describe(el);
    RENDER[tab](el);
  }

  B.on('select', render);
  B.on('change', refresh);
  B.on('live', refresh);
  B.on('tool', renderPaint);
  B.on('paint', renderPaint);
  render();
  renderPaint();
})();
