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
