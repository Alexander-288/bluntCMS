/* BluntCMS Light — editor core: shared state, change tracking, undo, save, toasts. */
(() => {
  'use strict';

  const listeners = {};
  const B = (window.Blunt = {
    cfg: window.BLUNT,
    tool: 'select',
    selected: null,
    dirty: false,
    saving: false,
    leaving: false,
    pending: new Map(), // key -> change that differs from the file
    originals: new Map(), // key -> value when first touched (file state)
    known: new Map(), // key -> last value the editor set
    undoStack: [],
    redoStack: [],
  });

  B.on = (event, fn) => (listeners[event] ||= []).push(fn);
  B.emit = (event, data) => (listeners[event] || []).forEach((fn) => fn(data));

  B.mk = (tag, className, parent) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (parent) parent.append(node);
    return node;
  };

  B.isUi = (node) => !!(node && node.closest && node.closest('.blunt-ui'));

  B.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /**
   * A white blob behind the active button of a bar. When the active button changes, the leading
   * edge runs ahead (the blob stretches into a pill over both buttons, squashing a little), then
   * the trailing edge catches up and it settles as a circle — a liquid-looking move.
   * The container must be positioned and isolated; blobbed buttons get the class .is-blobbed.
   */
  B.makeBlob = (container) => {
    const blob = B.mk('span', 'blunt-blob');
    container.prepend(blob); // painted first, so the buttons' icons can blend with it
    blob.hidden = true;
    let current = null;
    const box = (btn) => ({ x: btn.offsetLeft, y: btn.offsetTop, w: btn.offsetWidth, h: btn.offsetHeight });
    const place = (r) => Object.assign(blob.style, { left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px` });

    return {
      move(btn) {
        if (!btn) {
          blob.hidden = true;
          current = null;
          return;
        }
        if (btn === current) return;
        const from = current && current.isConnected && !blob.hidden ? box(current) : null;
        const to = box(btn);
        current = btn;
        blob.hidden = false;
        place(to);
        if (!from || B.reducedMotion.matches) return;

        const vertical = Math.abs(to.y - from.y) > Math.abs(to.x - from.x);
        const [pos, size, a, b, s] = vertical ? ['top', 'height', from.y, to.y, to.h] : ['left', 'width', from.x, to.x, to.w];
        const lo = Math.min(a, b);
        const hi = Math.max(a, b) + s;
        const squash = vertical ? 'scaleX(.84)' : 'scaleY(.84)';
        blob.getAnimations().forEach((anim) => anim.cancel());
        blob.animate([
          { [pos]: `${a}px`, [size]: `${s}px`, transform: 'none' },
          { [pos]: `${lo}px`, [size]: `${hi - lo}px`, transform: squash, offset: 0.42 },
          { [pos]: `${b}px`, [size]: `${s}px`, transform: 'none' },
        ], { duration: 460, easing: 'cubic-bezier(.3, .7, .2, 1)' });
      },
      /** Re-snap without animating (after the bar's layout changes, e.g. horizontal ↔ vertical). */
      sync() {
        if (current && current.isConnected) place(box(current));
      },
    };
  };

  // Every inline style property the editor manages (same list as the server allowlist).
  B.STYLE_PROPS = [
    'border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius',
    'border-radius',
    'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
    'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
    'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
    'gap',
    'color', 'background-color', 'border-color',
    'border-style', 'text-align', 'justify-content', 'align-items',
  ];

  /** "rgb(26, 26, 26)" -> "#1a1a1a" (alpha ignored). */
  B.toHex = (rgb) => {
    const m = String(rgb).match(/[\d.]+/g);
    if (!m || m.length < 3) return '#000000';
    return `#${m.slice(0, 3).map((n) => Math.round(Number(n)).toString(16).padStart(2, '0')).join('')}`;
  };

  /** Short human name for an element, e.g. "article.card" or "h1#title". */
  B.describe = (el) => {
    let s = el.tagName.toLowerCase();
    const cls = [...el.classList].find((c) => !c.startsWith('blunt-'));
    if (el.id) s += `#${el.id}`;
    else if (cls) s += `.${cls}`;
    return s;
  };

  /** How many editor-managed inline styles an element has. */
  B.overrideCount = (el) => B.STYLE_PROPS.filter((p) => B.currentStyle(el, p) !== '').length;

  B.setTool = (tool) => {
    B.tool = tool;
    document.documentElement.dataset.bluntTool = tool;
    B.emit('tool', tool);
  };

  B.select = (el) => {
    B.selected = el;
    B.emit('select', el);
  };

  B.setDirty = (dirty) => {
    B.dirty = dirty;
    B.emit('dirty', dirty);
  };

  // A record is one property change:
  // { kind: 'style', el, id, prop, before, after } | { kind: 'text'|'href', el, name, before, after }
  // | { kind: 'token', name, before, after }
  B.keyOf = (r) => (r.kind === 'style' ? `style:${r.id}:${r.prop}` : `${r.kind}:${r.name}`);

  B.styleRec = (el, prop, before, after) => ({ kind: 'style', el, id: Number(el.dataset.bluntId), prop, before, after });

  /** Current inline value of a style property, preferring the exact string the editor last set. */
  B.currentStyle = (el, prop) => {
    const key = `style:${el.dataset.bluntId}:${prop}`;
    return B.known.has(key) ? B.known.get(key) : el.style.getPropertyValue(prop);
  };

  B.currentToken = (name) => {
    const key = `token:${name}`;
    return B.known.has(key) ? B.known.get(key) : B.tokenValue(name);
  };

  B.applyValue = (r, value) => {
    if (r.kind === 'style') {
      if (value) r.el.style.setProperty(r.prop, value);
      else r.el.style.removeProperty(r.prop);
    } else if (r.kind === 'text') {
      r.el.textContent = value;
    } else if (r.kind === 'href') {
      r.el.setAttribute('data-blunt-href', value);
    } else if (r.kind === 'token') {
      document.documentElement.style.setProperty(r.name, value);
    }
  };

  B.track = (r, value) => {
    const key = B.keyOf(r);
    if (!B.originals.has(key)) B.originals.set(key, r.before);
    B.known.set(key, value);
    if (value === B.originals.get(key)) B.pending.delete(key);
    else B.pending.set(key, { ...r, value });
  };

  /** Records a group of already-applied changes as one undo step. */
  B.commit = (group) => {
    const changed = group.filter((r) => r.before !== r.after);
    if (!changed.length) return;
    changed.forEach((r) => B.track(r, r.after));
    B.undoStack.push(changed);
    B.redoStack = [];
    B.setDirty(B.pending.size > 0);
    B.emit('change');
  };

  B.undo = () => {
    const group = B.undoStack.pop();
    if (!group) return;
    [...group].reverse().forEach((r) => {
      B.applyValue(r, r.before);
      B.track(r, r.before);
    });
    B.redoStack.push(group);
    B.setDirty(B.pending.size > 0);
    B.emit('change');
  };

  B.redo = () => {
    const group = B.redoStack.pop();
    if (!group) return;
    group.forEach((r) => {
      B.applyValue(r, r.after);
      B.track(r, r.after);
    });
    B.undoStack.push(group);
    B.setDirty(B.pending.size > 0);
    B.emit('change');
  };

  B.buildChanges = () => {
    const styles = new Map();
    const out = [];
    for (const p of B.pending.values()) {
      if (p.kind === 'style') {
        const s = styles.get(p.id) || { type: 'style', id: p.id, set: {}, unset: [] };
        if (p.value) s.set[p.prop] = p.value;
        else s.unset.push(p.prop);
        styles.set(p.id, s);
      } else {
        out.push({ type: p.kind, name: p.name, value: p.value });
      }
    }
    return [...out, ...styles.values()];
  };

  B.save = async () => {
    if (B.saving) return;
    B.emit('beforesave');
    if (!B.pending.size) {
      B.toast('Nothing to save.');
      return;
    }
    B.saving = true;
    const body = {
      page: B.cfg.page,
      hash: B.cfg.hash,
      tokenHash: B.cfg.tokenHash,
      csrf: B.cfg.csrf,
      changes: B.buildChanges(),
    };
    let data;
    try {
      const res = await fetch(B.cfg.saveUrl, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      data = await res.json();
    } catch {
      data = { ok: false, error: 'Could not reach the server. Your changes are kept.' };
    }
    B.saving = false;
    if (!data.ok) {
      B.toast(data.error || 'Save failed. Your changes are kept.', 'error');
      return;
    }
    B.cfg.hash = data.hash;
    B.cfg.tokenHash = data.tokenHash;
    B.pending.clear();
    B.originals.clear();
    B.undoStack = [];
    B.redoStack = [];
    B.setDirty(false);
    B.toast('Saved.');
  };

  B.exit = () => {
    if (B.dirty && !window.confirm('You have unsaved changes. Leave anyway?')) return;
    B.leaving = true;
    window.location.href = B.cfg.viewUrl;
  };

  const toasts = B.mk('div', 'blunt-ui blunt-toasts');
  toasts.setAttribute('role', 'status');
  toasts.setAttribute('aria-live', 'polite');

  B.toast = (message, kind = 'info') => {
    if (!toasts.isConnected) document.body.append(toasts);
    const t = B.mk('div', kind === 'error' ? 'blunt-toast is-error' : 'blunt-toast', toasts);
    t.textContent = message;
    setTimeout(() => t.remove(), kind === 'error' ? 7000 : 3000);
  };
})();
