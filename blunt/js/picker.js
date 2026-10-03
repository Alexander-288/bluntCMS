/* BluntCMS Light — colour picker popover in the toolbar's style: shade area, hue slider, hex, token and recent swatches. */
(() => {
  'use strict';

  const B = window.Blunt;
  const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
  const recent = [];

  const hexToRgb = (hex) => {
    let h = hex.slice(1);
    if (h.length === 3) h = [...h].map((c) => c + c).join('');
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const rgbToHex = (rgb) => `#${rgb.map((n) => Math.round(n).toString(16).padStart(2, '0')).join('')}`;
  const rgbToHsv = ([r, g, b]) => {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const d = max - Math.min(r, g, b);
    let h = 0;
    if (d) {
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
      if (h < 0) h += 360;
    }
    return [h, max ? d / max : 0, max];
  };
  const hsvToRgb = (h, s, v) => {
    const f = (n) => {
      const k = (n + h / 60) % 6;
      return (v - v * s * Math.max(0, Math.min(k, 4 - k, 1))) * 255;
    };
    return [f(5), f(3), f(1)];
  };
  /** Any CSS colour string we can read -> "#rrggbb", or null. */
  const normalise = (value) => {
    const v = String(value || '').trim();
    if (HEX.test(v)) return rgbToHex(hexToRgb(v));
    if (/^rgba?\(/.test(v)) return B.toHex(v);
    return null;
  };
  B.normaliseColour = normalise;

  const pop = B.mk('div', 'blunt-ui blunt-picker', document.body);
  pop.hidden = true;
  pop.setAttribute('role', 'dialog');
  pop.setAttribute('aria-label', 'Colour picker');
  const sv = B.mk('div', 'blunt-sv', pop);
  const svThumb = B.mk('span', 'blunt-thumb', sv);
  const hue = B.mk('div', 'blunt-hue', pop);
  const hueThumb = B.mk('span', 'blunt-thumb', hue);
  const line = B.mk('div', 'blunt-picker-line', pop);
  const preview = B.mk('span', 'blunt-swatch', line);
  const hex = B.mk('input', 'blunt-input', line);
  hex.type = 'text';
  hex.maxLength = 7;
  hex.spellcheck = false;
  hex.setAttribute('aria-label', 'Hex colour');
  const swatches = B.mk('div', 'blunt-swatches', pop);

  let h = 0;
  let s = 0;
  let v = 0;
  let session = null; // { anchor, start, onInput, onDone }
  const current = () => rgbToHex(hsvToRgb(h, s, v));

  function draw(keepHexField) {
    sv.style.backgroundColor = `hsl(${h} 100% 50%)`;
    svThumb.style.left = `${s * 100}%`;
    svThumb.style.top = `${(1 - v) * 100}%`;
    hueThumb.style.left = `${(h / 360) * 100}%`;
    hueThumb.style.background = `hsl(${h} 100% 50%)`;
    const c = current();
    svThumb.style.background = c;
    preview.style.background = c;
    if (!keepHexField) hex.value = c;
  }

  function setColour(value, keepHexField) {
    const [nh, ns, nv] = rgbToHsv(hexToRgb(value));
    if (ns > 0) h = nh; // keep the hue when moving to greys
    s = ns;
    v = nv;
    draw(keepHexField);
  }

  const emit = () => {
    if (session) session.onInput(current());
  };

  function dragArea(area, onPos) {
    area.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      try {
        area.setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      const move = (ev) => {
        const r = area.getBoundingClientRect();
        onPos(Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (ev.clientY - r.top) / r.height)));
        draw();
        emit();
      };
      const up = () => {
        area.removeEventListener('pointermove', move);
        area.removeEventListener('pointerup', up);
        area.removeEventListener('pointercancel', up);
      };
      move(e);
      area.addEventListener('pointermove', move);
      area.addEventListener('pointerup', up);
      area.addEventListener('pointercancel', up);
    });
  }
  dragArea(sv, (x, y) => {
    s = x;
    v = 1 - y;
  });
  dragArea(hue, (x) => {
    h = x * 359.9;
  });

  hex.addEventListener('input', () => {
    let value = hex.value.trim();
    if (value && !value.startsWith('#')) value = `#${value}`;
    if (HEX.test(value)) {
      setColour(value, true);
      emit();
    }
  });
  hex.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') close(true);
  });

  function fillSwatches() {
    swatches.replaceChildren();
    const seen = new Set();
    const add = (colour, tip) => {
      if (!colour || seen.has(colour)) return;
      seen.add(colour);
      const b = B.mk('button', 'blunt-swatch', swatches);
      b.type = 'button';
      b.style.background = colour;
      b.dataset.tip = tip;
      b.setAttribute('aria-label', tip);
      b.addEventListener('click', () => {
        setColour(colour);
        emit();
      });
    };
    for (const name of B.cfg.tokens) add(normalise(B.currentToken(name)), `${name}  ${normalise(B.currentToken(name))}`);
    recent.forEach((c) => add(c, `Recent  ${c}`));
    swatches.hidden = !swatches.children.length;
  }

  function close(commit) {
    if (!session) return;
    const done = session;
    session = null;
    pop.hidden = true;
    const value = current();
    if (commit && value !== done.start) {
      const i = recent.indexOf(value);
      if (i >= 0) recent.splice(i, 1);
      recent.unshift(value);
      recent.length = Math.min(recent.length, 8);
    }
    done.onDone(commit ? value : null);
  }

  /**
   * Opens the picker next to anchor. onInput(hex) fires live; onDone(hex) on close, or onDone(null) when cancelled (Esc).
   * Clicking the same anchor again closes it.
   */
  B.openPicker = (anchor, value, { onInput, onDone }) => {
    if (session) {
      const same = session.anchor === anchor;
      close(true);
      if (same) return;
    }
    const start = normalise(value) || '#000000';
    session = { anchor, start, onInput, onDone };
    setColour(start);
    fillSwatches();
    pop.hidden = false;
    const r = anchor.getBoundingClientRect();
    const panel = anchor.closest('.blunt-panel');
    const side = panel ? panel.getBoundingClientRect() : r;
    let left = side.left - pop.offsetWidth - 10;
    if (left < 8) left = side.right + 10;
    pop.style.left = `${Math.min(left, window.innerWidth - pop.offsetWidth - 8)}px`;
    pop.style.top = `${Math.min(Math.max(8, r.top - 16), window.innerHeight - pop.offsetHeight - 8)}px`;
  };
  B.closePicker = close;

  // Click outside commits; Esc cancels (and doesn't also deselect).
  document.addEventListener('pointerdown', (e) => {
    if (!session || pop.contains(e.target) || e.target === session.anchor) return;
    close(true);
  }, true);
  document.addEventListener('keydown', (e) => {
    if (session && e.key === 'Escape') {
      e.stopImmediatePropagation();
      close(false);
    }
  }, true);
  B.on('select', () => close(true));
  B.on('tool', () => close(true));
  B.on('beforesave', () => close(true));
})();
