/* BluntCMS Light — finds which CSS token (custom property) an element's property comes from. */
(() => {
  'use strict';

  const B = window.Blunt;

  // Longhand -> shorthand to check when the longhand itself isn't declared.
  const SHORTHAND = {
    'padding-top': 'padding', 'padding-right': 'padding', 'padding-bottom': 'padding', 'padding-left': 'padding',
    'margin-top': 'margin', 'margin-right': 'margin', 'margin-bottom': 'margin', 'margin-left': 'margin',
    'border-top-left-radius': 'border-radius', 'border-top-right-radius': 'border-radius',
    'border-bottom-right-radius': 'border-radius', 'border-bottom-left-radius': 'border-radius',
    'border-top-width': 'border-width', 'border-right-width': 'border-width',
    'border-bottom-width': 'border-width', 'border-left-width': 'border-width',
    'background-color': 'background',
  };

  const SINGLE_VAR = /^var\(\s*(--[A-Za-z0-9-]+)\s*(,[\s\S]*)?\)$/;

  // Approximate selector specificity: ids, then classes/attributes/pseudo-classes, then types.
  function specificity(selector) {
    const s = selector.replace(/::[\w-]+/g, '');
    const ids = (s.match(/#[\w-]+/g) || []).length;
    const classes = (s.match(/\.[\w-]+|\[[^\]]*\]|:[\w-]+/g) || []).length;
    const types = (s.match(/(^|[\s>+~(])[a-zA-Z][\w-]*/g) || []).length;
    return ids * 1e6 + classes * 1e3 + types;
  }

  function* styleRules(rules) {
    for (const rule of rules) {
      if (rule instanceof CSSStyleRule) {
        yield rule;
      } else if (rule instanceof CSSMediaRule) {
        if (window.matchMedia(rule.media.mediaText).matches) yield* styleRules(rule.cssRules);
      } else if (rule instanceof CSSSupportsRule) {
        if (CSS.supports(rule.conditionText)) yield* styleRules(rule.cssRules);
      } else if (rule.cssRules) {
        yield* styleRules(rule.cssRules);
      }
    }
  }

  function matchSpecificity(el, selectorText) {
    let best = -1;
    for (const part of selectorText.split(',')) {
      try {
        if (el.matches(part)) best = Math.max(best, specificity(part.trim()));
      } catch {
        // selector the browser can't match (e.g. pseudo-element) — skip
      }
    }
    return best;
  }

  /** The winning stylesheet value for prop on el (ignores inline styles). */
  function declaredValue(el, prop) {
    let winner = null;
    for (const sheet of document.styleSheets) {
      let rules;
      try {
        rules = sheet.cssRules;
      } catch {
        continue; // cross-origin stylesheet
      }
      for (const rule of styleRules(rules)) {
        const spec = matchSpecificity(el, rule.selectorText);
        if (spec < 0) continue;
        const value = rule.style.getPropertyValue(prop) || (SHORTHAND[prop] ? rule.style.getPropertyValue(SHORTHAND[prop]) : '');
        if (value && (!winner || spec >= winner.spec)) winner = { spec, value: value.trim() };
      }
    }
    return winner ? winner.value : '';
  }

  /** { name, overridden } when prop on el is exactly var(--token) from the token file, else { error }. */
  B.tokenFor = (el, prop) => {
    const match = SINGLE_VAR.exec(declaredValue(el, prop));
    if (!match) return { error: 'no token' };
    if (!B.cfg.tokens.includes(match[1])) return { error: `${match[1]} is not in the token file` };
    return { name: match[1], overridden: el.style.getPropertyValue(prop) !== '' };
  };

  B.tokenValue = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
})();
