/* BluntCMS — inspector field builders shared by every tier's panel: number pills, icon groups, colour fields. */
(() => {
  'use strict';

  const B = window.Blunt;
  const LENGTH = /^-?\d+(\.\d+)?(px|rem|em|%)$/;
  const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
  const cap = (s) => s[0].toUpperCase() + s.slice(1);

  /**
   * Builders bound to one panel. icons: id → svg markup. useToken(e): whether an edit targets the token.
   * Each builder registers an updater; refresh() re-reads every field, then calls onRefresh().
   */
  B.makeFields = ({ icons, useToken, onRefresh = () => {} }) => {
    let updaters = [];
    const refresh = () => {
      updaters.forEach((fn) => fn());
      onRefresh();
    };
    const reset = () => {
      updaters = [];
    };
    const computed = (el, prop) => getComputedStyle(el).getPropertyValue(prop);
    const px = (el, prop) => String(Math.round(parseFloat(computed(el, prop)) || 0));
    const isTransparent = (c) => /rgba\(.*,\s*0\)$/.test(c) || c === 'transparent';

    const iconButton = (parent, id, label, cls = '') => {
      const b = B.mk('button', `blunt-ibtn ${cls}`.trim(), parent);
      b.type = 'button';
      b.innerHTML = icons[id];
      b.dataset.tip = label;
      b.setAttribute('aria-label', label);
      return b;
    };

    /** Sets several props as one undo step ('' clears). In token mode, edits the first set prop's token. */
    function setStyles(el, values, e) {
      if (useToken(e)) {
        const prop = Object.keys(values).find((p) => values[p] !== '');
        if (!prop) return;
        const value = values[prop];
        const t = B.tokenFor(el, prop);
        if (t.error) {
          B.toast(`Can't edit a token here: ${t.error}.`, 'error');
          return;
        }
        const rec = { kind: 'token', name: t.name, before: B.currentToken(t.name), after: value };
        B.applyValue(rec, value);
        B.commit([rec]);
        return;
      }
      // Clears first, then sets — so a shorthand set after clearing its longhands wins.
      const group = Object.entries(values)
        .map(([p, v]) => B.styleRec(el, p, B.currentStyle(el, p), v))
        .sort((a, b) => (a.after === '' ? 0 : 1) - (b.after === '' ? 0 : 1));
      group.forEach((r) => B.applyValue(r, r.after));
      B.commit(group);
    }

    function row(parent, label) {
      const r = B.mk('div', 'blunt-row', parent);
      if (label) B.mk('span', 'blunt-row-label', r).textContent = label;
      return r;
    }

    function note(parent, text) {
      B.mk('p', 'blunt-note', parent).textContent = text;
    }

    /**
     * Number pill: drag sideways to scrub, click to type, ↑/↓ to step, empty to clear.
     * Lengths by default. keywords: words it also accepts (allowAuto = ['auto']).
     * unit '' makes it a plain number: scale turns the shown number into the stored one (opacity 35 → 0.35).
     * step: the arrow-key and scrub increment (font weight: 100); decimals: shown precision; scrubPx: drag pixels per step.
     */
    function numberField(parent, el, { props, clear = [], min = 0, max = Infinity, allowAuto = false, keywords, unit = 'px', scale = 1, step = 1, decimals = 0, scrubPx = 1, read, label, disabled = false }) {
      const input = B.mk('input', 'blunt-num', parent);
      input.type = 'text';
      input.spellcheck = false;
      input.setAttribute('aria-label', label);
      input.dataset.tip = cap(label);
      if (!el || disabled) {
        input.disabled = true;
        input.value = '–';
        return;
      }
      const words = keywords || (allowAuto ? ['auto'] : []);
      const clamp = (n) => Math.min(max, Math.max(min, n));
      const round = (n) => +n.toFixed(decimals);
      const store = (n) => (unit === 'px' ? `${n}px` : String(+(round(n) / scale).toFixed(4)));
      const show = read || (() => {
        const inline = B.currentStyle(el, props[0]);
        if (words.includes(inline)) return inline;
        const c = computed(el, props[0]);
        if (words.includes(c)) return c;
        if (unit === 'px') return px(el, props[0]);
        const n = parseFloat(c);
        return Number.isNaN(n) ? c : String(round(n * scale));
      });

      updaters.push(() => {
        if (document.activeElement !== input) input.value = show();
        input.classList.toggle('is-set', props.some((p) => B.currentStyle(el, p) !== ''));
        input.classList.toggle('has-token', !!B.tokenFor(el, props[0]).name);
      });
      updaters[updaters.length - 1]();

      const valuesFor = (v) => {
        const out = {};
        clear.forEach((p) => {
          out[p] = '';
        });
        props.forEach((p) => {
          out[p] = v;
        });
        return out;
      };
      const parse = (raw) => {
        const v = raw.trim();
        if (v === '') return '';
        if (words.includes(v)) return v;
        if (unit !== 'px') {
          const n = Number(v);
          const onStep = step <= 1 || n % step === 0; // whole steps like font weight's 100s
          return v !== '' && Number.isFinite(n) && n === clamp(n) && onStep ? store(round(n)) : null;
        }
        const withUnit = /^-?\d+(\.\d+)?$/.test(v) ? `${v}px` : v;
        if (withUnit !== '0' && !LENGTH.test(withUnit)) return null;
        if (min >= 0 && withUnit.startsWith('-')) return null;
        return withUnit;
      };

      input.addEventListener('change', () => {
        const v = parse(input.value);
        if (v === null) {
          const or = words.length ? ` (or ${words.join(' / ')})` : '';
          B.toast(unit === 'px' ? `Use a size like 12, 12px, 1.5rem or 50%${or}.` : `Use a number from ${min} to ${max}${step > 1 ? ` in steps of ${step}` : ''}${or}.`, 'error');
          input.value = show();
          return;
        }
        setStyles(el, valuesFor(v), null);
      });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          input.blur();
        } else if (e.key === 'Escape') {
          input.value = show();
          input.blur();
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault();
          const delta = (e.key === 'ArrowUp' ? 1 : -1) * step * (e.shiftKey ? 10 : 1);
          const n = clamp(round((parseFloat(input.value) || 0) + delta));
          input.value = String(n);
          setStyles(el, valuesFor(store(n)), null);
        }
      });

      let scrub = null;
      input.addEventListener('pointerdown', (e) => {
        if (document.activeElement === input || e.button !== 0) return;
        e.preventDefault();
        scrub = { x: e.clientX, start: parseFloat(show()) || 0, moved: false, token: useToken(e), before: {}, value: null };
        try {
          input.setPointerCapture(e.pointerId);
        } catch {
          // ignore
        }
      });
      input.addEventListener('pointermove', (e) => {
        if (!scrub) return;
        const dx = e.clientX - scrub.x;
        if (!scrub.moved) {
          if (Math.abs(dx) < 3) return;
          scrub.moved = true;
          if (scrub.token) {
            const t = B.tokenFor(el, props[0]);
            if (t.error) {
              B.toast(`Can't edit a token here: ${t.error}.`, 'error');
              scrub = null;
              return;
            }
            scrub.tokenName = t.name;
            scrub.before.token = B.currentToken(t.name);
          } else {
            Object.keys(valuesFor('')).forEach((p) => {
              scrub.before[p] = B.currentStyle(el, p);
            });
          }
        }
        const n = clamp(round(scrub.start + Math.round(dx / scrubPx) * step));
        scrub.value = store(n);
        input.value = String(n);
        if (scrub.token) {
          document.documentElement.style.setProperty(scrub.tokenName, scrub.value);
        } else {
          clear.forEach((p) => el.style.removeProperty(p));
          props.forEach((p) => el.style.setProperty(p, scrub.value));
        }
      });
      input.addEventListener('pointerup', () => {
        if (!scrub) return;
        const s = scrub;
        scrub = null;
        if (!s.moved) {
          input.focus();
          input.select();
          return;
        }
        if (s.value === null) return;
        if (s.token) {
          B.commit([{ kind: 'token', name: s.tokenName, before: s.before.token, after: s.value }]);
        } else {
          const values = valuesFor(s.value);
          const group = Object.keys(values)
            .map((p) => B.styleRec(el, p, s.before[p], values[p]))
            .sort((a, b) => (a.after === '' ? 0 : 1) - (b.after === '' ? 0 : 1));
          B.commit(group);
        }
      });
    }

    /** Icon button group for a keyword property. Clicking the active inline value again clears it. */
    function iconSeg(parent, el, { prop, options, disabled = false }) {
      const seg = B.mk('div', 'blunt-iseg', parent);
      const buttons = options.map(([value, icon, label]) => {
        const b = iconButton(seg, icon, label, 'is-sm');
        b.disabled = !el || disabled;
        b.addEventListener('click', () => {
          // Keywords can't be tokens, so these always edit the element itself.
          const next = B.currentStyle(el, prop) === value ? '' : value;
          const rec = B.styleRec(el, prop, B.currentStyle(el, prop), next);
          B.applyValue(rec, next);
          B.commit([rec]);
        });
        return [value, b];
      });
      if (!el || disabled) return;
      updaters.push(() => {
        const current = computed(el, prop);
        buttons.forEach(([value, b]) => b.classList.toggle('is-active', current === value));
        seg.classList.toggle('is-set', B.currentStyle(el, prop) !== '');
      });
      updaters[updaters.length - 1]();
    }

    /** Text button group for a keyword property, e.g. display. Clicking the active inline value again clears it. */
    function textSeg(parent, el, { prop, options, disabled = false }) {
      const seg = B.mk('div', 'blunt-iseg is-text', parent);
      const buttons = options.map(([value, text, tip]) => {
        const b = B.mk('button', 'blunt-segtext', seg);
        b.type = 'button';
        b.textContent = text;
        if (tip) b.dataset.tip = tip;
        b.disabled = !el || disabled;
        b.addEventListener('click', () => {
          const next = B.currentStyle(el, prop) === value ? '' : value;
          const rec = B.styleRec(el, prop, B.currentStyle(el, prop), next);
          B.applyValue(rec, next);
          B.commit([rec]);
        });
        return [value, b];
      });
      if (!el || disabled) return;
      updaters.push(() => {
        const current = computed(el, prop);
        buttons.forEach(([value, b]) => b.classList.toggle('is-active', current === value));
        seg.classList.toggle('is-set', B.currentStyle(el, prop) !== '');
      });
      updaters[updaters.length - 1]();
    }

    /** Round colour dot (opens the picker) + hex pill. */
    function colourField(parent, el, { prop, label }) {
      const r = row(parent, label);
      const line = B.mk('div', 'blunt-colourrow', r);
      const dot = B.mk('button', 'blunt-swatch is-lg', line);
      dot.type = 'button';
      dot.dataset.tip = `Pick ${label.toLowerCase()} colour`;
      dot.setAttribute('aria-label', `Pick ${label.toLowerCase()} colour`);
      const hex = B.mk('input', 'blunt-input', line);
      hex.type = 'text';
      hex.maxLength = 9;
      hex.spellcheck = false;
      hex.setAttribute('aria-label', `${label} hex`);
      if (!el) {
        dot.disabled = true;
        dot.classList.add('is-empty');
        hex.disabled = true;
        hex.value = '–';
        return;
      }

      updaters.push(() => {
        const value = computed(el, prop);
        dot.classList.toggle('is-empty', isTransparent(value));
        dot.style.background = isTransparent(value) ? '' : value;
        if (document.activeElement !== hex) hex.value = isTransparent(value) ? 'none' : B.toHex(value);
        hex.classList.toggle('is-set', B.currentStyle(el, prop) !== '');
        hex.classList.toggle('has-token', !!B.tokenFor(el, prop).name);
      });
      updaters[updaters.length - 1]();

      dot.addEventListener('click', (e) => {
        const token = useToken(e) ? B.tokenFor(el, prop) : null;
        if (token && token.error) {
          B.toast(`Can't edit a token here: ${token.error}.`, 'error');
          return;
        }
        const before = token ? B.currentToken(token.name) : B.currentStyle(el, prop);
        const live = (c) => {
          if (token) document.documentElement.style.setProperty(token.name, c);
          else el.style.setProperty(prop, c);
          refresh();
        };
        B.openPicker(dot, computed(el, prop), {
          onInput: live,
          onDone: (c) => {
            if (c === null) {
              if (token) document.documentElement.style.setProperty(token.name, before);
              else if (before) el.style.setProperty(prop, before);
              else el.style.removeProperty(prop);
              refresh();
              return;
            }
            const rec = token ? { kind: 'token', name: token.name, before, after: c } : B.styleRec(el, prop, before, c);
            B.applyValue(rec, c);
            B.commit([rec]);
          },
        });
      });

      hex.addEventListener('change', () => {
        const v = hex.value.trim().toLowerCase();
        if (v === '' || v === 'none') {
          setStyles(el, { [prop]: '' }, null);
          return;
        }
        if (!HEX.test(v)) {
          B.toast('Use a hex colour like #1a1a1a.', 'error');
          refresh();
          return;
        }
        setStyles(el, { [prop]: v }, null);
      });
      hex.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') hex.blur();
      });
    }

    /** Lets a section register its own updater (e.g. the box diagram's size readout). */
    const watch = (fn) => updaters.push(fn);

    return { row, note, numberField, iconSeg, textSeg, colourField, iconButton, setStyles, reset, refresh, watch, computed, px, isTransparent };
  };
})();
