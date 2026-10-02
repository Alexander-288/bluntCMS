/* BluntCMS Light — Fill tool (colours) and Reset tool. */
(() => {
  'use strict';

  const B = window.Blunt;
  const TARGETS = [
    ['Background', 'background-color'],
    ['Text', 'color'],
    ['Border', 'border-color'],
  ];
  const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

  const pop = B.mk('div', 'blunt-ui blunt-popover', document.body);
  pop.hidden = true;
  let target = 'background-color';

  const toHex = (rgb) => {
    const m = String(rgb).match(/[\d.]+/g);
    if (!m || m.length < 3) return '#000000';
    return `#${m.slice(0, 3).map((n) => Math.round(Number(n)).toString(16).padStart(2, '0')).join('')}`;
  };

  B.openFill = (el) => {
    pop.replaceChildren();
    const seg = B.mk('div', 'blunt-seg', pop);
    const color = B.mk('input', 'blunt-color', pop);
    color.type = 'color';
    color.setAttribute('aria-label', 'Colour');
    const hex = B.mk('input', 'blunt-input', pop);
    hex.type = 'text';
    hex.maxLength = 9;
    hex.spellcheck = false;
    hex.setAttribute('aria-label', 'Hex colour');
    const tokenRow = B.mk('label', 'blunt-check', pop);
    const tokenBox = B.mk('input', '', tokenRow);
    tokenBox.type = 'checkbox';
    tokenRow.append('Shared token (or Shift + Apply)');
    const note = B.mk('div', 'blunt-note', pop);
    const apply = B.mk('button', 'blunt-apply', pop);
    apply.type = 'button';
    apply.textContent = 'Apply';

    const refresh = () => {
      const value = toHex(getComputedStyle(el).getPropertyValue(target));
      color.value = value;
      hex.value = value;
      seg.querySelectorAll('button').forEach((b) => b.classList.toggle('is-active', b.dataset.prop === target));
      if (tokenBox.checked) {
        const t = B.tokenFor(el, target);
        note.textContent = t.error ? `Token: ${t.error}` : `Token: ${t.name}`;
      } else {
        note.textContent = '';
      }
    };

    for (const [label, prop] of TARGETS) {
      const b = B.mk('button', '', seg);
      b.type = 'button';
      b.textContent = label;
      b.dataset.prop = prop;
      b.addEventListener('click', () => {
        target = prop;
        refresh();
      });
    }

    const doApply = (useToken) => {
      const value = hex.value.trim().toLowerCase();
      if (!HEX.test(value)) {
        B.toast('Use a hex colour like #1a1a1a.', 'error');
        return;
      }
      if (useToken) {
        const t = B.tokenFor(el, target);
        if (t.error) {
          B.toast(`Can't use a token here: ${t.error}.`, 'error');
          return;
        }
        const rec = { kind: 'token', name: t.name, before: B.currentToken(t.name), after: value };
        B.applyValue(rec, value);
        B.commit([rec]);
      } else {
        const rec = B.styleRec(el, target, B.currentStyle(el, target), value);
        B.applyValue(rec, value);
        B.commit([rec]);
      }
      refresh();
    };

    color.addEventListener('input', () => {
      hex.value = color.value;
    });
    hex.addEventListener('input', () => {
      if (/^#[0-9a-f]{6}$/i.test(hex.value)) color.value = hex.value;
    });
    hex.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') doApply(e.shiftKey || tokenBox.checked);
    });
    tokenBox.addEventListener('change', refresh);
    apply.addEventListener('click', (e) => doApply(e.shiftKey || tokenBox.checked));

    refresh();
    const r = el.getBoundingClientRect();
    pop.style.left = `${Math.min(Math.max(8, r.right + 12), window.innerWidth - 248)}px`;
    pop.style.top = `${Math.min(Math.max(8, r.top), window.innerHeight - 260)}px`;
    pop.hidden = false;
  };

  B.resetEl = (el) => {
    const group = [];
    for (const prop of B.STYLE_PROPS) {
      const before = B.currentStyle(el, prop);
      if (before !== '') group.push(B.styleRec(el, prop, before, ''));
    }
    if (!group.length) {
      B.toast('Nothing to reset on this element.');
      return;
    }
    group.forEach((r) => B.applyValue(r, ''));
    B.commit(group);
  };

  B.on('tool', (tool) => {
    if (tool !== 'fill') pop.hidden = true;
  });
  B.on('select', (el) => {
    if (!el) pop.hidden = true;
  });
})();
