/* BluntCMS Light — event wiring: clicks route to the active tool, keyboard shortcuts, leave warning. */
(() => {
  'use strict';

  const B = window.Blunt;

  document.addEventListener('click', (e) => {
    if (B.isUi(e.target)) return;

    // Ctrl/Cmd + click follows a link; a plain click edits.
    const link = e.target.closest('a[href]');
    if (link && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      e.stopPropagation();
      const raw = link.getAttribute('data-blunt-href') ?? link.getAttribute('href');
      if (raw.startsWith('#')) {
        const target = document.getElementById(decodeURIComponent(raw.slice(1)));
        if (target) target.scrollIntoView({ behavior: 'smooth' });
        return;
      }
      if (B.dirty && !window.confirm('You have unsaved changes. Leave anyway?')) return;
      B.leaving = true;
      window.location.href = link.href;
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    if (B.tool === 'text') {
      B.textClick(e.target);
      return;
    }
    const el = e.target.closest('[data-blunt-id]');
    if (!el) return;
    if (B.tool === 'select') {
      B.select(el);
    } else if (B.tool === 'fill') {
      B.select(el);
      B.openFill(el);
    } else if (B.tool === 'reset') {
      B.resetEl(el);
    }
  }, true);

  document.addEventListener('keydown', (e) => {
    const t = e.target;
    const typing = t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName);
    const mod = e.ctrlKey || e.metaKey;
    const key = e.key.toLowerCase();

    if (mod && key === 's') {
      e.preventDefault();
      if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
      B.save();
      return;
    }
    if (typing) return;
    if (mod && key === 'z') {
      e.preventDefault();
      if (e.shiftKey) B.redo();
      else B.undo();
      return;
    }
    if (mod && key === 'y') {
      e.preventDefault();
      B.redo();
      return;
    }
    if (mod || e.altKey) return;
    const tool = { v: 'select', t: 'text', f: 'fill', r: 'reset' }[key];
    if (tool) {
      B.setTool(tool);
    } else if (e.key === 'Escape') {
      B.select(null);
    }
  });

  window.addEventListener('beforeunload', (e) => {
    if (B.dirty && !B.leaving) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  B.setTool('select');
  B.setDirty(false);
  if (B.cfg.duplicates.length) {
    B.toast(`These names are used more than once and can't be text-edited: ${B.cfg.duplicates.join(', ')}`, 'error');
  }
})();
