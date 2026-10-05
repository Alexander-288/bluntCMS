/* BluntCMS Thick — toolbar docked to the bottom edge: tools, undo/redo, save/exit. */
(() => {
  'use strict';

  const B = window.Blunt;
  const svg = (body) => `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
  const solid = (d) => `<path d="${d}" fill="currentColor" stroke="none"/>`;
  const ICONS = {
    select: svg(solid('M5.5 2.8l13.4 8.4c.6.4.4 1.3-.3 1.4l-5.6 1-3 4.9c-.4.6-1.3.4-1.4-.3L5.5 2.8z')),
    move: svg('<path d="M6 15.5V7a2 2 0 0 1 4 0v4.5M10 11V5a2 2 0 0 1 4 0v6M14 11V6.5a2 2 0 0 1 4 0V14a6.5 6.5 0 0 1-6.5 6.5h-1.3a6 6 0 0 1-4.6-2.1l-3-3.5a1.7 1.7 0 0 1 2.5-2.3L6 15.5"/>'),
    text: svg('<path d="M5 6.5V5h14v1.5M12 5v14M9.5 19h5"/>'),
    fill: svg(`${solid('M10.3 4.6l7.1 7.1-6.2 6.2a2.2 2.2 0 0 1-3.1 0l-4-4a2.2 2.2 0 0 1 0-3.1z')}<path d="M7 2.5l4.2 4.2"/>${solid('M19.5 14s-2 2.4-2 3.8a2 2 0 0 0 4 0c0-1.4-2-3.8-2-3.8z')}`),
    pick: svg(`${solid('M12.6 6.2l2.6-2.6a2.5 2.5 0 0 1 3.5 3.5l-2.6 2.6z')}<path d="M15.2 9.8L7 18l-3 1 1-3 8.2-8.2M11.5 5l7.5 7.5"/>`),
    reset: svg(`${solid('M14.3 3.6a2 2 0 0 1 2.8 0l3.3 3.3a2 2 0 0 1 0 2.8L12 18.1H7.8l-3.4-3.4a2 2 0 0 1 0-2.8z')}<path d="M14 21h6.5"/>`),
    undo: svg('<path d="M9 14L4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>'),
    redo: svg('<path d="M15 14l5-5-5-5M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>'),
    save: svg('<path d="M5 12.5l4.5 4.5L19 7.5" stroke-width="2.2"/>'),
    exit: svg('<path d="M6.5 6.5l11 11M17.5 6.5l-11 11" stroke-width="2.2"/>'),
  };
  // [id, label, key]
  const TOOLS = [
    ['select', 'Select', 'V'],
    ['move', 'Move blocks', 'M'],
    ['text', 'Text', 'T'],
    ['fill', 'Fill', 'F'],
    ['pick', 'Eyedropper', 'I'],
    ['reset', 'Reset', 'R'],
  ];
  B.toolKeys.i = 'pick';
  B.toolKeys.m = 'move';

  const bar = B.mk('div', 'blunt-ui blunt-toolbar blunt-dock', document.body);
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

  const blob = B.makeBlob(bar);
  const toolButtons = {};
  for (const [id, label, key] of TOOLS) {
    const b = button(id, label, key);
    b.classList.add('is-blobbed');
    b.addEventListener('click', () => B.setTool(id));
    toolButtons[id] = b;
  }
  B.mk('span', 'blunt-divider', bar);
  const undo = button('undo', 'Undo', 'Ctrl+Z');
  undo.addEventListener('click', () => B.undo());
  const redo = button('redo', 'Redo', 'Ctrl+Shift+Z');
  redo.addEventListener('click', () => B.redo());
  B.mk('span', 'blunt-divider', bar);
  const save = button('save', 'Save', 'Ctrl+S');
  save.addEventListener('click', () => B.save());
  B.mk('span', 'blunt-dot', save);
  button('exit', 'Exit').addEventListener('click', () => B.exit());

  const syncHistory = () => {
    undo.disabled = !B.undoStack.length;
    redo.disabled = !B.redoStack.length;
  };
  syncHistory();
  B.on('change', syncHistory);
  B.on('dirty', syncHistory);

  B.on('tool', (tool) => {
    Object.entries(toolButtons).forEach(([id, b]) => {
      const active = id === tool;
      b.classList.toggle('is-active', active);
      b.setAttribute('aria-pressed', String(active));
    });
    blob.move(toolButtons[tool]);
  });
  B.on('dirty', (dirty) => bar.classList.toggle('is-dirty', dirty));
})();
