/* BluntCMS Light — Fill tool (paint bucket) and Reset tool. */
(() => {
  'use strict';

  const B = window.Blunt;

  // The paint colour and target live here; the inspector panel edits them.
  B.paint = { color: '#1a1a1a', prop: 'background-color' };

  /** Click paints, Alt-click picks the colour up, Shift-click paints the linked token. */
  B.paintClick = (el, e) => {
    const { prop, color } = B.paint;
    if (e.altKey) {
      B.paint.color = B.toHex(getComputedStyle(el).getPropertyValue(prop));
      B.emit('paint');
      B.toast(`Picked ${B.paint.color}`);
      return;
    }
    if (e.shiftKey) {
      const t = B.tokenFor(el, prop);
      if (t.error) {
        B.toast(`Can't paint a token here: ${t.error}.`, 'error');
        return;
      }
      const rec = { kind: 'token', name: t.name, before: B.currentToken(t.name), after: color };
      B.applyValue(rec, color);
      B.commit([rec]);
      return;
    }
    const rec = B.styleRec(el, prop, B.currentStyle(el, prop), color);
    B.applyValue(rec, color);
    B.commit([rec]);
  };

  // ---- Paint popup: floats above the toolbar while Fill is active ----
  const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
  const pop = B.mk('div', 'blunt-ui blunt-paintpop', document.body);
  pop.hidden = true;
  pop.setAttribute('aria-label', 'Paint colour');

  function renderPaint() {
    pop.replaceChildren();
    const line = B.mk('div', 'blunt-colourrow', pop);
    const dot = B.mk('button', 'blunt-swatch is-lg', line);
    dot.type = 'button';
    dot.style.background = B.paint.color;
    dot.dataset.tip = 'Pick paint colour';
    dot.setAttribute('aria-label', 'Pick paint colour');
    const hex = B.mk('input', 'blunt-input', line);
    hex.type = 'text';
    hex.maxLength = 9;
    hex.spellcheck = false;
    hex.value = B.paint.color;
    hex.setAttribute('aria-label', 'Paint hex');
    const seg = B.mk('div', 'blunt-iseg is-text', pop);
    for (const [label, prop] of [['Background', 'background-color'], ['Text', 'color'], ['Border', 'border-color']]) {
      const b = B.mk('button', 'blunt-segtext', seg);
      b.type = 'button';
      b.textContent = label;
      b.dataset.tip = `Paint the ${label.toLowerCase()} colour`;
      b.classList.toggle('is-active', B.paint.prop === prop);
      b.addEventListener('click', () => {
        B.paint.prop = prop;
        renderPaint();
      });
    }
    B.mk('p', 'blunt-note', pop).textContent = 'Click paints · Alt-click picks · Shift-click paints the token';

    const before = B.paint.color;
    dot.addEventListener('click', () => {
      B.openPicker(dot, B.paint.color, {
        onInput: (c) => {
          B.paint.color = c;
          dot.style.background = c;
          hex.value = c;
        },
        onDone: (c) => {
          B.paint.color = c || before;
          renderPaint();
        },
      });
    });
    hex.addEventListener('change', () => {
      const v = hex.value.trim().toLowerCase();
      if (!HEX.test(v)) {
        B.toast('Use a hex colour like #1a1a1a.', 'error');
        hex.value = B.paint.color;
        return;
      }
      B.paint.color = v;
      dot.style.background = v;
    });
    hex.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') hex.blur();
    });
  }

  /** Sits centred above the toolbar (below it when the toolbar is near the top), always on screen. */
  function place() {
    if (pop.hidden) return;
    const bar = document.querySelector('.blunt-toolbar');
    if (bar) {
      const r = bar.getBoundingClientRect();
      const gap = 12;
      let top = r.top - pop.offsetHeight - gap;
      if (top < 8) top = r.bottom + gap;
      const left = r.left + r.width / 2 - pop.offsetWidth / 2;
      pop.style.top = `${Math.min(Math.max(8, top), window.innerHeight - pop.offsetHeight - 8)}px`;
      pop.style.left = `${Math.min(Math.max(8, left), window.innerWidth - pop.offsetWidth - 8)}px`;
    }
    requestAnimationFrame(place);
  }

  B.on('tool', (tool) => {
    const show = tool === 'fill';
    if (show === !pop.hidden) return;
    pop.hidden = !show;
    if (show) {
      renderPaint();
      requestAnimationFrame(place);
    }
  });
  B.on('paint', () => {
    if (!pop.hidden) renderPaint();
  });

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
})();
