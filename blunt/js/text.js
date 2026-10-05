/* BluntCMS — Text tool: in-place editing of [data-blunt] blocks, plus link hrefs. Plain text in Light; formatted text when a tier turns on B.richText. */
(() => {
  'use strict';

  const B = window.Blunt;
  const pop = B.mk('div', 'blunt-ui blunt-popover', document.body);
  pop.hidden = true;
  let editing = null; // { el, done, rich }

  const finishEdit = () => {
    if (editing) editing.done();
  };

  // ---- Formatted text: the small set of inline tags the server accepts ----
  const RICH = { STRONG: 'strong', B: 'b', EM: 'em', I: 'i', U: 'u', S: 's', STRIKE: 's', A: 'a', BR: 'br' };
  const KEEP_ATTRS = ['data-blunt-id', 'data-blunt-href', 'href'];

  /** Whether a block holds only text and the allowed inline tags, with no extra attributes (so nothing is lost on save). */
  B.richEditable = (el) => [...el.querySelectorAll('*')].every((d) => (
    d.tagName in RICH && d.tagName !== 'STRIKE' && !d.hasAttribute('data-blunt')
    && [...d.attributes].every((a) => KEEP_ATTRS.includes(a.name) && (a.name !== 'href' || d.tagName === 'A'))
  ));

  /** Tidies what the browser's formatting commands leave behind: unknown wrappers are unwrapped, attributes dropped, strike becomes s. */
  function richClean(root) {
    for (const node of [...root.childNodes]) {
      if (node.nodeType !== 1) continue;
      richClean(node);
      const tag = RICH[node.tagName];
      if (!tag || (tag === 'a' && root.closest('a'))) {
        node.replaceWith(...node.childNodes);
        continue;
      }
      let el = node;
      if (node.tagName === 'STRIKE') {
        el = document.createElement('s');
        el.append(...node.childNodes);
        node.replaceWith(el);
      }
      for (const a of [...el.attributes]) {
        if (!KEEP_ATTRS.includes(a.name) || (a.name === 'href' && tag !== 'a')) el.removeAttribute(a.name);
      }
      if (tag !== 'br' && !el.textContent && !el.querySelector('br')) el.remove();
    }
    root.normalize();
  }

  /** The block's content as the tree the server builds HTML from. Links keep their real address, not the editor's. */
  B.richTree = (root) => {
    const out = [];
    for (const node of root.childNodes) {
      if (node.nodeType === 3) {
        if (typeof out[out.length - 1] === 'string') out[out.length - 1] += node.data;
        else if (node.data) out.push(node.data);
      } else if (node.nodeType === 1 && RICH[node.tagName]) {
        const tag = RICH[node.tagName];
        if (tag === 'br') {
          out.push({ tag });
          continue;
        }
        const n = { tag, children: B.richTree(node) };
        if (tag === 'a') n.href = node.getAttribute('data-blunt-href') ?? node.getAttribute('href') ?? '';
        out.push(n);
      } else if (node.nodeType === 1) {
        out.push(...B.richTree(node));
      }
    }
    return out;
  };

  function startEdit(el, name, rich) {
    if (editing && editing.el === el) return;
    finishEdit();
    const before = rich ? el.innerHTML : el.textContent;
    if (rich) {
      el.contentEditable = 'true';
      try {
        document.execCommand('styleWithCSS', false, false); // tags, not inline styles
      } catch {
        // older browsers: tags are the default
      }
    } else {
      try {
        el.contentEditable = 'plaintext-only';
      } catch {
        el.contentEditable = 'true';
      }
    }
    el.classList.add('blunt-editing');

    const onKey = (e) => {
      if (e.key === 'Enter' && !(rich && e.shiftKey)) {
        e.preventDefault();
        done();
      } else if (e.key === 'Escape') {
        if (rich) el.innerHTML = before;
        else el.textContent = before;
        done();
      }
    };
    const onPaste = (e) => {
      e.preventDefault();
      document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
    };
    // Moving focus into the formatting bar keeps the edit open.
    const onBlur = (e) => {
      if (e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('.blunt-richbar')) return;
      done();
    };
    const done = () => {
      if (!editing || editing.el !== el) return;
      editing = null;
      el.removeEventListener('keydown', onKey);
      el.removeEventListener('paste', onPaste);
      el.removeEventListener('blur', onBlur);
      el.removeAttribute('contenteditable');
      el.classList.remove('blunt-editing');
      if (document.activeElement === el) el.blur();
      if (rich) {
        richClean(el);
        B.commit([{ kind: 'rich', el, name, before, after: el.innerHTML }]);
      } else {
        if (el.children.length) el.textContent = el.textContent; // flatten anything the browser inserted
        B.commit([{ kind: 'text', el, name, before, after: el.textContent }]);
      }
      B.emit('textdone', el);
    };
    el.addEventListener('keydown', onKey);
    el.addEventListener('paste', onPaste);
    el.addEventListener('blur', onBlur);
    editing = { el, done, rich };
    el.focus();
    B.emit('textedit', { el, rich });
  }

  B.finishTextEdit = finishEdit;
  B.textEditing = () => (editing ? editing.el : null);

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
    // Links stay plain text (a link can't hold another link); other blocks get formatting when the tier allows it.
    const rich = !!B.richText && el.tagName !== 'A' && B.richEditable(el);
    if (el.children.length && !rich) {
      B.toast(B.richText
        ? "This block contains HTML that can't be edited here."
        : "This block contains HTML tags and can't be edited as plain text in Light.", 'error');
      return;
    }
    startEdit(el, name, rich);
    if (el.tagName === 'A') openHref(el, name);
  };

  B.on('tool', () => {
    finishEdit();
    pop.hidden = true;
  });
  B.on('beforesave', finishEdit);
})();
