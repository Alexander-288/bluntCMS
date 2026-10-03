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
