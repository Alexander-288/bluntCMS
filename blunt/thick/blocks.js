/* BluntCMS Thick — Move tool: drag repeat blocks (cards, list items) to reorder them; duplicate or delete them from a small bar. */
(() => {
  'use strict';

  const B = window.Blunt;
  const svg = (body) => `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
  const ICONS = {
    duplicate: svg('<rect x="8" y="8" width="12" height="12" rx="3"/><path d="M16 8V6.5A2.5 2.5 0 0 0 13.5 4h-7A2.5 2.5 0 0 0 4 6.5v7A2.5 2.5 0 0 0 6.5 16H8"/>'),
    trash: svg('<path d="M4 7h16M10 3.5h4M6 7l.8 11.6a2 2 0 0 0 2 1.9h6.4a2 2 0 0 0 2-1.9L18 7M10 11v5M14 11v5"/>'),
  };

  // ---- Which blocks repeat ----
  const keyOfNode = (n) => n.dataset.bluntCopy || n.dataset.bluntId;
  const sourceId = (n) => (n.dataset.bluntCopy ? n.dataset.bluntCopy.split(':')[1] : n.dataset.bluntId);
  const signature = (parent) => [...parent.children].map(keyOfNode).filter(Boolean).join(',');

  /** Only whitespace between the children, as the server requires. */
  const cleanContainer = (parent) => [...parent.childNodes].every((n) => n.nodeType === 1 || (n.nodeType === 3 && !n.data.trim()));

  /** A list item, a child of a [data-blunt-repeat] container, or one of several siblings with the same tag and class. */
  B.repeatItem = (el) => {
    const parent = el && el.parentElement;
    if (!parent || !parent.dataset.bluntId || parent === document.body || B.isUi(el) || !keyOfNode(el)) return false;
    if (el.tagName === 'LI' || parent.hasAttribute('data-blunt-repeat')) return true;
    return [...parent.children].filter((s) => s.tagName === el.tagName && s.className === el.className).length > 1;
  };
  const itemAt = (target) => {
    for (let el = target && target.nodeType === 1 ? target : null; el; el = el.parentElement) {
      if (B.repeatItem(el)) return el;
    }
    return null;
  };

  // ---- Applying an order: rebuild a container's children from a signature ----
  const registry = new Map(); // container id → Map(key → node), so removed and copied nodes can come back
  const nodesOf = (parent) => {
    const id = parent.dataset.bluntId;
    if (!registry.has(id)) registry.set(id, new Map());
    const reg = registry.get(id);
    [...parent.children].forEach((n) => keyOfNode(n) && reg.set(keyOfNode(n), n));
    return reg;
  };

  B.applyOrder = (parent, value) => {
    const reg = nodesOf(parent);
    const keys = value ? value.split(',') : [];
    [...parent.children].forEach((n) => keyOfNode(n) && !keys.includes(keyOfNode(n)) && n.remove());
    keys.forEach((k) => reg.get(k) && parent.append(reg.get(k)));
    if (B.selected && !B.selected.isConnected) B.select(null);
  };

  const commitOrder = (parent, before) => {
    const after = signature(parent);
    if (after === before) return;
    const rec = { kind: 'order', el: parent, id: Number(parent.dataset.bluntId), before, after };
    B.applyValue(rec, after);
    B.commit([rec]);
  };

  let copySeq = 0;
  B.duplicateBlock = (item) => {
    const parent = item.parentElement;
    const before = signature(parent);
    const copy = item.cloneNode(true);
    [copy, ...copy.querySelectorAll('[data-blunt-id]')].forEach((n) => n.removeAttribute('data-blunt-id'));
    copy.removeAttribute('data-blunt-copy');
    copy.classList.remove('blunt-editing');
    copySeq += 1;
    copy.dataset.bluntCopy = `copy:${sourceId(item)}:${copySeq}`;
    nodesOf(parent);
    registry.get(parent.dataset.bluntId).set(copy.dataset.bluntCopy, copy);
    item.after(copy);
    commitOrder(parent, before);
  };

  B.deleteBlock = (item) => {
    const parent = item.parentElement;
    const before = signature(parent);
    nodesOf(parent);
    item.remove();
    commitOrder(parent, before);
    hideBar();
  };

  // ---- Hover hint for the Move tool (hover.js asks) ----
  B.moveHint = (target) => {
    const item = itemAt(target);
    if (!item) return { el: null, cursor: 'default' };
    if (!cleanContainer(item.parentElement)) return { el: item, text: "Text between these items · can't rearrange", blocked: true, cursor: 'not-allowed' };
    return { el: item, text: `${B.describe(item)} · drag to move`, cursor: dragging ? 'grabbing' : 'grab' };
  };

  // ---- Bar on the hovered block: duplicate, delete ----
  const bar = B.mk('div', 'blunt-ui blunt-blockbar', document.body);
  bar.hidden = true;
  const button = (icon, tip) => {
    const b = B.mk('button', 'blunt-ibtn is-sm', bar);
    b.type = 'button';
    b.innerHTML = ICONS[icon];
    b.dataset.tip = tip;
    b.setAttribute('aria-label', tip);
    return b;
  };
  let barItem = null;
  button('duplicate', 'Duplicate').addEventListener('click', () => barItem && B.duplicateBlock(barItem));
  button('trash', 'Delete').addEventListener('click', () => barItem && B.deleteBlock(barItem));
  function hideBar() {
    bar.hidden = true;
    barItem = null;
  }
  function placeBar() {
    if (!barItem || !barItem.isConnected) {
      hideBar();
      return;
    }
    const r = barItem.getBoundingClientRect();
    bar.style.top = `${Math.max(8, r.top + 8)}px`;
    bar.style.left = `${Math.min(window.innerWidth - bar.offsetWidth - 8, r.right - bar.offsetWidth - 8)}px`;
  }

  document.addEventListener('pointermove', (e) => {
    if (B.tool !== 'move' || dragging) return;
    if (bar.contains(e.target)) return;
    const item = itemAt(e.target);
    if (!item || !cleanContainer(item.parentElement)) {
      hideBar();
      return;
    }
    if (item !== barItem) {
      barItem = item;
      bar.hidden = false;
      placeBar();
    }
  }, { passive: true });
  window.addEventListener('scroll', placeBar, true);
  window.addEventListener('resize', placeBar);
  B.on('tool', (tool) => tool !== 'move' && hideBar());
  B.on('change', placeBar);

  // ---- Drag to reorder: the block moves live among its siblings ----
  let dragging = null; // { item, parent, before, x, y, moved }
  document.addEventListener('pointerdown', (e) => {
    if (B.tool !== 'move' || e.button !== 0 || B.isUi(e.target)) return;
    const item = itemAt(e.target);
    if (!item || !cleanContainer(item.parentElement)) return;
    e.preventDefault();
    dragging = { item, parent: item.parentElement, before: signature(item.parentElement), x: e.clientX, y: e.clientY, moved: false };
  }, true);
  document.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    if (!dragging.moved && Math.hypot(e.clientX - dragging.x, e.clientY - dragging.y) < 5) return;
    if (!dragging.moved) {
      dragging.moved = true;
      dragging.item.classList.add('blunt-dragging');
      hideBar();
    }
    const over = document.elementsFromPoint(e.clientX, e.clientY)
      .map((n) => n.closest && [...dragging.parent.children].find((c) => c === n || c.contains(n)))
      .find((c) => c && c !== dragging.item);
    if (!over) return;
    const kids = [...dragging.parent.children];
    if (kids.indexOf(dragging.item) < kids.indexOf(over)) over.after(dragging.item);
    else over.before(dragging.item);
  });
  window.addEventListener('pointerup', () => {
    if (!dragging) return;
    const d = dragging;
    dragging = null;
    d.item.classList.remove('blunt-dragging');
    if (d.moved) commitOrder(d.parent, d.before);
  });
})();
