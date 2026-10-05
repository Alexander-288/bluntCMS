/* BluntCMS Thick — formatting bar for the Text tool: bold, italic, underline, strikethrough, links. */
(() => {
  'use strict';

  const B = window.Blunt;
  B.richText = true; // text.js now edits formatted blocks too

  const svg = (body) => `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
  const ICONS = {
    bold: svg('<path d="M7 4.5h5.5a3.75 3.75 0 0 1 0 7.5H7zM7 12h6.5a3.75 3.75 0 0 1 0 7.5H7z" stroke-width="2.5"/>'),
    italic: svg('<path d="M10 4.5h8M6 19.5h8M14.5 4.5l-5 15"/>'),
    underline: svg('<path d="M7 4v7a5 5 0 0 0 10 0V4M5.5 20h13"/>'),
    strikeThrough: svg('<path d="M4.5 12h15M16.5 6.5c-.7-1.2-2.3-2-4.5-2-2.8 0-4.5 1.4-4.5 3.3 0 1.4.9 2.4 2.6 3M7.3 16.8c.7 1.6 2.4 2.7 4.9 2.7 2.8 0 4.6-1.4 4.6-3.4 0-.8-.3-1.5-.8-2.1"/>'),
    link: svg('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'),
    unlink: svg('<path d="M11 7l2-2a4 4 0 0 1 5.7 5.7l-2 2M13 17l-2 2a4 4 0 0 1-5.7-5.7l2-2M8 3.5v2M3.5 8h2M16 20.5v-2M20.5 16h-2"/>'),
    removeFormat: svg('<path d="M5 6.5V5h14v1.5M12 5v9M9.5 19h5M4 4l16 16"/>'),
  };
  const COMMANDS = [
    ['bold', 'Bold (Ctrl+B)'],
    ['italic', 'Italic (Ctrl+I)'],
    ['underline', 'Underline (Ctrl+U)'],
    ['strikeThrough', 'Strikethrough'],
  ];

  const bar = B.mk('div', 'blunt-ui blunt-richbar', document.body);
  bar.hidden = true;
  bar.setAttribute('role', 'toolbar');
  bar.setAttribute('aria-label', 'Text formatting');
  let current = null; // the block being edited

  const button = (icon, tip) => {
    const b = B.mk('button', 'blunt-ibtn is-sm', bar);
    b.type = 'button';
    b.innerHTML = ICONS[icon];
    b.dataset.tip = tip;
    b.setAttribute('aria-label', tip);
    return b;
  };
  const run = (cmd, value) => {
    document.execCommand(cmd, false, value);
    sync();
  };

  const cmdButtons = COMMANDS.map(([cmd, tip]) => {
    const b = button(cmd, tip);
    b.addEventListener('click', () => run(cmd));
    return [cmd, b];
  });
  B.mk('span', 'blunt-divider', bar);
  const linkBtn = button('link', 'Add link');
  const clearBtn = button('removeFormat', 'Clear formatting');
  clearBtn.addEventListener('click', () => run('removeFormat'));

  // Link address entry, shown in place of the buttons
  const linkRow = B.mk('div', 'blunt-richbar-link', bar);
  linkRow.hidden = true;
  const linkInput = B.mk('input', 'blunt-input', linkRow);
  linkInput.type = 'text';
  linkInput.spellcheck = false;
  linkInput.placeholder = 'Link address, e.g. /contact';
  linkInput.setAttribute('aria-label', 'Link address');
  let savedRange = null;

  // Clicks on the bar must not take the selection away from the text (the address box is the exception).
  bar.addEventListener('mousedown', (e) => {
    if (e.target !== linkInput) e.preventDefault();
  });

  const selection = () => {
    const sel = window.getSelection();
    return sel && sel.rangeCount && current && current.contains(sel.anchorNode) ? sel : null;
  };
  const linkAtSelection = () => {
    const sel = selection();
    const node = sel && sel.anchorNode;
    const a = node && (node.nodeType === 1 ? node : node.parentElement).closest('a');
    return a && current.contains(a) ? a : null;
  };

  function sync() {
    if (!current) return;
    cmdButtons.forEach(([cmd, b]) => {
      let on = false;
      try {
        on = document.queryCommandState(cmd);
      } catch {
        // not supported: leave it off
      }
      b.classList.toggle('is-active', on);
    });
    const inLink = !!linkAtSelection();
    linkBtn.innerHTML = ICONS[inLink ? 'unlink' : 'link'];
    linkBtn.dataset.tip = inLink ? 'Remove link' : 'Add link';
  }

  const showButtons = (on) => {
    [...bar.children].forEach((c) => {
      c.hidden = c === linkRow ? on : !on;
    });
  };

  linkBtn.addEventListener('click', () => {
    const a = linkAtSelection();
    if (a) {
      const range = document.createRange();
      range.selectNodeContents(a);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      run('unlink');
      return;
    }
    const sel = selection();
    if (!sel || sel.isCollapsed) {
      B.toast('Select some text first, then add a link.');
      return;
    }
    savedRange = sel.getRangeAt(0).cloneRange();
    linkInput.value = '';
    showButtons(false);
    place();
    linkInput.focus();
  });

  const backToText = () => {
    showButtons(true);
    place();
    if (!current) return;
    current.focus();
    if (savedRange) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(savedRange);
    }
  };
  linkInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      backToText();
      savedRange = null;
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const url = linkInput.value.trim();
      if (/^\s*(javascript|data|vbscript):/i.test(url)) {
        B.toast('That link address is not allowed.', 'error');
        return;
      }
      backToText();
      savedRange = null;
      if (!url) return;
      run('createLink', url);
      // The editor rewrites links for its own use; keep the real address alongside, as on loaded links.
      current.querySelectorAll('a:not([data-blunt-href])').forEach((a) => a.setAttribute('data-blunt-href', a.getAttribute('href')));
    }
  });
  // Leaving the address box for somewhere else ends the edit, like leaving the text would.
  linkInput.addEventListener('blur', (e) => {
    if (linkRow.hidden) return;
    const to = e.relatedTarget;
    if (to && (to === current || (to.closest && to.closest('.blunt-richbar')))) return;
    showButtons(true);
    savedRange = null;
    B.finishTextEdit();
  });

  /** Above the block, or below it when there's no room. */
  function place() {
    if (!current || bar.hidden) return;
    const r = current.getBoundingClientRect();
    let top = r.top - bar.offsetHeight - 10;
    if (top < 8) top = r.bottom + 10;
    bar.style.top = `${Math.min(top, window.innerHeight - bar.offsetHeight - 8)}px`;
    bar.style.left = `${Math.min(Math.max(8, r.left), window.innerWidth - bar.offsetWidth - 8)}px`;
  }

  B.on('textedit', ({ el, rich }) => {
    if (!rich) return;
    current = el;
    showButtons(true);
    bar.hidden = false;
    sync();
    place();
  });
  B.on('textdone', () => {
    current = null;
    bar.hidden = true;
  });
  document.addEventListener('selectionchange', sync);
  window.addEventListener('scroll', place, true);
  window.addEventListener('resize', place);
})();
