/* BluntCMS — inspector sections shared by every tier: box diagram, border, colour, layout. */
(() => {
  'use strict';

  const B = window.Blunt;
  const SIDES = ['top', 'right', 'bottom', 'left'];
  const CORNERS = ['top-left', 'top-right', 'bottom-right', 'bottom-left'];
  const FLEX_OR_GRID = /^(inline-)?(flex|grid)$/;

  // ---- Icons (24px, same weight as the toolbar) ----
  const svg = (body) => `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
  const bars = (xs, w = 4) => xs.map(([x, y, hgt]) => `<rect x="${x}" y="${y}" width="${w}" height="${hgt}" rx="1.2" fill="currentColor" stroke="none"/>`).join('');
  const ICONS = {
    box: svg('<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><rect x="8.5" y="8.5" width="7" height="7" rx="1.5" fill="currentColor" stroke="none"/>'),
    border: svg('<path d="M4 20V11a7 7 0 0 1 7-7h9"/><path d="M4 20h0M20 4h0" stroke-width="3"/>'),
    colour: svg('<path d="M12 3.5s6.5 6.9 6.5 11a6.5 6.5 0 0 1-13 0c0-4.1 6.5-11 6.5-11z" fill="currentColor" stroke="none"/>'),
    layout: svg('<path d="M4 6h16M7 12h10M4 18h16"/>'),
    tokens: svg('<path d="M12 3.5l8.5 8.5-8.5 8.5L3.5 12z"/><path d="M12 8.5l3.5 3.5-3.5 3.5L8.5 12z" fill="currentColor" stroke="none"/>'),
    'none': svg('<circle cx="12" cy="12" r="7.5"/><path d="M6.8 17.2L17.2 6.8"/>'),
    solid: svg('<path d="M4 12h16" stroke-width="2.6"/>'),
    dashed: svg('<path d="M4 12h3.5M10.25 12h3.5M16.5 12H20" stroke-width="2.6"/>'),
    dotted: svg('<path d="M4.5 12h0M9.5 12h0M14.5 12h0M19.5 12h0" stroke-width="3"/>'),
    left: svg('<path d="M4 6h16M4 12h10M4 18h14"/>'),
    center: svg('<path d="M4 6h16M7 12h10M5 18h14"/>'),
    right: svg('<path d="M4 6h16M10 12h10M6 18h14"/>'),
    justify: svg('<path d="M4 6h16M4 12h16M4 18h16"/>'),
    'flex-start': svg(`<path d="M3 4v16"/>${bars([[6, 7, 10], [11, 7, 10]])}`),
    'jc-center': svg(`<path d="M12 4v2M12 18v2" />${bars([[6.5, 7, 10], [13.5, 7, 10]])}`),
    'flex-end': svg(`<path d="M21 4v16"/>${bars([[9, 7, 10], [14, 7, 10]])}`),
    'space-between': svg(`<path d="M3 4v16M21 4v16"/>${bars([[5.5, 7, 10], [14.5, 7, 10]])}`),
    'space-around': svg(`<path d="M3 4v16M21 4v16"/>${bars([[6.5, 7, 10], [13.5, 7, 10]])}`),
    'space-evenly': svg(`<path d="M3 4v16M21 4v16"/>${bars([[7, 7, 10], [13, 7, 10]])}`),
    'ai-start': svg(`<path d="M4 3h16"/>${bars([[6, 6, 8], [14, 6, 12]])}`),
    'ai-center': svg(`<path d="M4 12h2M18 12h2"/>${bars([[7, 8, 8], [13, 6, 12]])}`),
    'ai-end': svg(`<path d="M4 21h16"/>${bars([[6, 10, 8], [14, 6, 12]])}`),
    stretch: svg(`<path d="M4 3h16M4 21h16"/>${bars([[7, 6, 12], [13, 6, 12]])}`),
    baseline: svg(`${bars([[6, 6, 10], [14, 9, 7]])}<path d="M3 14h18" stroke-dasharray="2 2"/>`),
  };

  B.sections = {
    icons: ICONS,

    box(body, el, f) {
      const ring = (parent, name, cls) => {
        const r = B.mk('div', `blunt-ring ${cls}`, parent);
        B.mk('span', 'blunt-ring-label', r).textContent = name;
        const cells = {};
        for (const side of SIDES) cells[side] = B.mk('div', `blunt-cell blunt-cell-${side}`, r);
        cells.inner = B.mk('div', 'blunt-cell blunt-cell-inner', r);
        return cells;
      };
      const margin = ring(body, 'Margin', 'is-margin');
      const border = ring(margin.inner, 'Border', 'is-border');
      const padding = ring(border.inner, 'Padding', 'is-padding');
      for (const side of SIDES) {
        f.numberField(margin[side], el, { props: [`margin-${side}`], min: -Infinity, allowAuto: side === 'left' || side === 'right', label: `margin ${side}` });
        f.numberField(border[side], el, { props: [`border-${side}-width`], label: `border ${side}` });
        f.numberField(padding[side], el, { props: [`padding-${side}`], label: `padding ${side}` });
      }
      const content = B.mk('div', 'blunt-content', padding.inner);
      content.textContent = '–';
      if (el) {
        f.watch(() => {
          const r = el.getBoundingClientRect();
          content.textContent = `${Math.round(r.width)} × ${Math.round(r.height)}`;
        });
      }
      f.note(body, 'Drag a number to scrub · click to type · empty to clear');
    },

    border(body, el, f) {
      f.iconSeg(f.row(body, 'Style'), el, {
        prop: 'border-style',
        options: [['none', 'none', 'No border'], ['solid', 'solid', 'Solid'], ['dashed', 'dashed', 'Dashed'], ['dotted', 'dotted', 'Dotted']],
      });

      const w = f.row(body, 'Width');
      f.numberField(B.mk('div', 'blunt-all', w), el, { props: SIDES.map((s) => `border-${s}-width`), label: 'all sides' });
      const wq = B.mk('div', 'blunt-quad', w);
      SIDES.forEach((s) => f.numberField(wq, el, { props: [`border-${s}-width`], label: `${s} width` }));

      f.colourField(body, el, { prop: 'border-color', label: 'Colour' });

      const r = f.row(body, 'Radius');
      f.numberField(B.mk('div', 'blunt-all', r), el, {
        props: ['border-radius'],
        clear: CORNERS.map((c) => `border-${c}-radius`),
        label: 'all corners',
        read: () => f.px(el, 'border-top-left-radius'),
      });
      const rq = B.mk('div', 'blunt-quad', r);
      CORNERS.forEach((c) => f.numberField(rq, el, { props: [`border-${c}-radius`], label: `${c.replace('-', ' ')} corner` }));
    },

    colour(body, el, f) {
      f.colourField(body, el, { prop: 'color', label: 'Text' });
      f.colourField(body, el, { prop: 'background-color', label: 'Background' });
      f.colourField(body, el, { prop: 'border-color', label: 'Border' });
    },

    /** opts.containerNote: shown when the element isn't a flex/grid container. */
    layout(body, el, f, opts = {}) {
      f.iconSeg(f.row(body, 'Text align'), el, {
        prop: 'text-align',
        options: [['left', 'left', 'Left'], ['center', 'center', 'Centre'], ['right', 'right', 'Right'], ['justify', 'justify', 'Justify']],
      });

      const block = f.row(body, 'Block');
      const centre = B.mk('button', 'blunt-pill', block);
      centre.type = 'button';
      centre.textContent = 'Centre in parent';
      centre.dataset.tip = 'Sets left and right margins to auto. Needs the element to be narrower than its parent.';
      centre.disabled = !el;
      if (el) {
        const isCentred = () => B.currentStyle(el, 'margin-left') === 'auto' && B.currentStyle(el, 'margin-right') === 'auto';
        centre.addEventListener('click', () => {
          const v = isCentred() ? '' : 'auto';
          f.setStyles(el, { 'margin-left': v, 'margin-right': v }, null);
        });
        f.watch(() => centre.classList.toggle('is-active', isCentred()));
      }

      const container = !!el && FLEX_OR_GRID.test(f.computed(el, 'display'));
      f.iconSeg(f.row(body, 'Justify'), el, {
        prop: 'justify-content',
        disabled: !container,
        options: [
          ['flex-start', 'flex-start', 'Start'], ['center', 'jc-center', 'Centre'], ['flex-end', 'flex-end', 'End'],
          ['space-between', 'space-between', 'Space between'], ['space-around', 'space-around', 'Space around'], ['space-evenly', 'space-evenly', 'Space evenly'],
        ],
      });
      f.iconSeg(f.row(body, 'Align'), el, {
        prop: 'align-items',
        disabled: !container,
        options: [['flex-start', 'ai-start', 'Top'], ['center', 'ai-center', 'Middle'], ['flex-end', 'ai-end', 'Bottom'], ['stretch', 'stretch', 'Stretch'], ['baseline', 'baseline', 'Baseline']],
      });
      f.numberField(B.mk('div', 'blunt-all', f.row(body, 'Gap')), el, { props: ['gap'], label: 'gap', disabled: !container });
      if (el && !container && opts.containerNote) f.note(body, opts.containerNote);
    },

    /** Which sections have something for this element — the rest get a dimmed icon. */
    relevance(el) {
      if (!el || !el.isConnected) return { box: false, border: false, colour: false, layout: false };
      const cs = getComputedStyle(el);
      const any = (props) => props.some((p) => parseFloat(cs.getPropertyValue(p)) > 0);
      const hasBorder = SIDES.some((s) => cs.getPropertyValue(`border-${s}-style`) !== 'none' && parseFloat(cs.getPropertyValue(`border-${s}-width`)) > 0);
      const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      const transparent = /rgba\(.*,\s*0\)$/.test(cs.backgroundColor) || cs.backgroundColor === 'transparent';
      return {
        box: hasBorder || any(SIDES.flatMap((s) => [`margin-${s}`, `padding-${s}`])),
        border: hasBorder || any(CORNERS.map((c) => `border-${c}-radius`)),
        colour: hasText || hasBorder || !transparent,
        layout: hasText || FLEX_OR_GRID.test(cs.display) || (cs.marginLeft === cs.marginRight && B.currentStyle(el, 'margin-left') === 'auto'),
      };
    },
  };
})();
