/* BluntCMS Light — selection box with Illustrator-style radius dots and spacing handles. */
(() => {
  'use strict';

  const B = window.Blunt;

  // [key, longhand, inward x, inward y]
  const CORNERS = [
    ['tl', 'border-top-left-radius', 1, 1],
    ['tr', 'border-top-right-radius', -1, 1],
    ['br', 'border-bottom-right-radius', -1, -1],
    ['bl', 'border-bottom-left-radius', 1, -1],
  ];
  const RADIUS_LONGHANDS = CORNERS.map((c) => c[1]);
  // [side, outward x, outward y]
  const EDGES = [
    ['top', 0, -1],
    ['right', 1, 0],
    ['bottom', 0, 1],
    ['left', -1, 0],
  ];

  const layer = B.mk('div', 'blunt-ui blunt-overlay', document.body);
  layer.hidden = true;
  const box = B.mk('div', 'blunt-box', layer);
  const readout = B.mk('div', 'blunt-ui blunt-readout', document.body);
  readout.hidden = true;
  const handles = {};
  for (const [key] of CORNERS) handles[key] = B.mk('div', 'blunt-handle blunt-corner', box);
  for (const [side] of EDGES) handles[side] = B.mk('div', `blunt-handle blunt-edge blunt-edge-${side}`, box);

  /** Converts a computed length (px or %) to px. */
  const toPx = (value, basis) => {
    const n = parseFloat(value) || 0;
    return String(value).trim().endsWith('%') ? (n * basis) / 100 : n;
  };

  function place(el) {
    const r = el.getBoundingClientRect();
    Object.assign(box.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
    const cs = getComputedStyle(el);
    const max = Math.min(r.width, r.height) / 2;
    for (const [key, prop, ix, iy] of CORNERS) {
      const radius = toPx(cs.getPropertyValue(prop), Math.min(r.width, r.height));
      const inset = Math.min(Math.max(radius, 12), max);
      handles[key].style.left = `${ix > 0 ? inset : r.width - inset}px`;
      handles[key].style.top = `${iy > 0 ? inset : r.height - inset}px`;
    }
  }

  function frame() {
    const el = B.selected;
    const show = !!el && el.isConnected && (B.tool === 'select' || B.tool === 'fill');
    layer.hidden = !show;
    if (show) place(el);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  function showReadout(e, text) {
    readout.textContent = text;
    readout.hidden = false;
    readout.style.left = `${e.clientX + 14}px`;
    readout.style.top = `${e.clientY + 14}px`;
  }

  /** Works out what a drag on a handle edits. */
  function dragPlan(el, handleKey, e) {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const corner = CORNERS.find((c) => c[0] === handleKey);
    if (corner) {
      const [, longhand, ix, iy] = corner;
      return {
        prop: e.altKey ? longhand : 'border-radius',
        label: e.altKey ? 'corner' : 'radius',
        start: toPx(cs.getPropertyValue(longhand), Math.min(r.width, r.height)),
        delta: (dx, dy) => (dx * ix + dy * iy) / 2,
        min: 0,
        max: Math.min(r.width, r.height) / 2,
        // A plain radius drag also clears per-corner overrides so the shorthand wins.
        alsoClear: e.altKey ? [] : RADIUS_LONGHANDS,
      };
    }
    const [side, ox, oy] = EDGES.find((edge) => edge[0] === handleKey);
    const base = e.altKey ? 'margin' : 'padding';
    const prop = `${base}-${side}`;
    return {
      prop,
      label: prop,
      start: parseFloat(cs.getPropertyValue(prop)) || 0,
      delta: (dx, dy) => dx * ox + dy * oy,
      min: base === 'padding' ? 0 : -Infinity,
      max: Infinity,
      alsoClear: [],
    };
  }

  function startDrag(e, handleKey) {
    const el = B.selected;
    if (!el || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const handle = e.currentTarget;
    try {
      handle.setPointerCapture(e.pointerId);
    } catch {
      // pointer no longer active — the drag still works while over the handle
    }

    const plan = dragPlan(el, handleKey, e);
    const token = e.shiftKey ? B.tokenFor(el, plan.prop) : null;
    const sx = e.clientX;
    const sy = e.clientY;
    let value = null;

    const before = {};
    if (token && token.name) {
      before.token = B.currentToken(token.name);
      // Start from the token's own value, not the element's (which may be overridden inline).
      if (/^-?\d+(\.\d+)?px$/.test(before.token)) plan.start = parseFloat(before.token);
    } else if (!token) {
      for (const p of [...plan.alsoClear, plan.prop]) before[p] = B.currentStyle(el, p);
    }

    const onMove = (ev) => {
      if (token && token.error) {
        showReadout(ev, token.error);
        return;
      }
      const px = Math.round(Math.min(plan.max, Math.max(plan.min, plan.start + plan.delta(ev.clientX - sx, ev.clientY - sy))));
      value = `${px}px`;
      if (token) {
        document.documentElement.style.setProperty(token.name, value);
        showReadout(ev, `${token.name} ${value}${token.overridden ? ' (overridden here)' : ''}`);
      } else {
        el.style.setProperty(plan.prop, value);
        showReadout(ev, `${plan.label} ${value}`);
      }
    };

    const onUp = () => {
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', onUp);
      handle.removeEventListener('pointercancel', onUp);
      readout.hidden = true;
      if (value === null) return;
      if (token) {
        B.commit([{ kind: 'token', name: token.name, before: before.token, after: value }]);
      } else {
        // Clear per-corner props first, then set the main prop, so redo replays in the right order.
        const group = plan.alsoClear.map((p) => B.styleRec(el, p, before[p], ''));
        group.push(B.styleRec(el, plan.prop, before[plan.prop], value));
        B.commit(group);
      }
    };

    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onUp);
    handle.addEventListener('pointercancel', onUp);
  }

  for (const key of Object.keys(handles)) {
    handles[key].addEventListener('pointerdown', (e) => startDrag(e, key));
  }
})();
