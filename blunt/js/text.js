/* BluntCMS Light — Text tool: in-place plain-text editing of [data-blunt] blocks, plus link hrefs. */
(() => {
  'use strict';

  const B = window.Blunt;
  const pop = B.mk('div', 'blunt-ui blunt-popover', document.body);
  pop.hidden = true;
  let editing = null;

  const finishEdit = () => {
    if (editing) editing.blur();
  };

  function startEdit(el, name) {
    if (editing === el) return;
    finishEdit();
    const before = el.textContent;
    try {
      el.contentEditable = 'plaintext-only';
    } catch {
      el.contentEditable = 'true';
    }
    el.classList.add('blunt-editing');
    editing = el;
    el.focus();

    const onKey = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        el.blur();
      } else if (e.key === 'Escape') {
        el.textContent = before;
        el.blur();
      }
    };
    const onPaste = (e) => {
      e.preventDefault();
      document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
    };
    const onBlur = () => {
      el.removeEventListener('keydown', onKey);
      el.removeEventListener('paste', onPaste);
      el.removeEventListener('blur', onBlur);
      el.removeAttribute('contenteditable');
      el.classList.remove('blunt-editing');
      if (el.children.length) el.textContent = el.textContent; // flatten anything the browser inserted
      editing = null;
      B.commit([{ kind: 'text', el, name, before, after: el.textContent }]);
    };
    el.addEventListener('keydown', onKey);
    el.addEventListener('paste', onPaste);
    el.addEventListener('blur', onBlur);
  }

  function openHref(el, name) {
    const before = el.getAttribute('data-blunt-href') ?? el.getAttribute('href') ?? '';
    pop.replaceChildren();
    const label = B.mk('label', 'blunt-field', pop);
    label.append('Link address');
    const input = B.mk('input', 'blunt-input', label);
    input.type = 'text';
    input.value = before;
    input.spellcheck = false;

    let closed = false;
    const close = (commit) => {
      if (closed) return;
      closed = true;
      pop.hidden = true;
      if (commit) B.commit([{ kind: 'href', el, name, before, after: input.value.trim() }]);
    };
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        close(true);
      } else if (e.key === 'Escape') {
        close(false);
      }
    });
    input.addEventListener('change', () => close(true));

    const r = el.getBoundingClientRect();
    pop.style.left = `${Math.min(Math.max(8, r.left), window.innerWidth - 248)}px`;
    pop.style.top = `${Math.min(r.bottom + 8, window.innerHeight - 80)}px`;
    pop.hidden = false;
  }

  B.textClick = (target) => {
    const el = target.closest('[data-blunt]');
    if (!el) return;
    const name = el.dataset.blunt;
    if (B.cfg.duplicates.includes(name)) {
      B.toast(`"${name}" is used more than once on this page, so it can't be edited.`, 'error');
      return;
    }
    if (el.children.length) {
      B.toast("This block contains HTML tags and can't be edited as plain text in Light.", 'error');
      return;
    }
    startEdit(el, name);
    if (el.tagName === 'A') openHref(el, name);
  };

  B.on('tool', () => {
    finishEdit();
    pop.hidden = true;
  });
})();
