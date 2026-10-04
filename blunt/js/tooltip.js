/* BluntCMS — floating tooltip for any editor control with data-tip (never clipped by scrolling). */
(() => {
  'use strict';

  const B = window.Blunt;
  const tip = B.mk('div', 'blunt-ui blunt-tooltip', document.body);
  tip.hidden = true;

  document.addEventListener('pointerover', (e) => {
    const t = e.target.closest && e.target.closest('.blunt-ui [data-tip]');
    if (!t) {
      tip.hidden = true;
      return;
    }
    tip.textContent = t.dataset.tip;
    tip.hidden = false;
    const r = t.getBoundingClientRect();
    const below = r.bottom + 8 + tip.offsetHeight < window.innerHeight;
    tip.style.top = `${below ? r.bottom + 8 : r.top - tip.offsetHeight - 8}px`;
    tip.style.left = `${Math.min(Math.max(4, r.left + r.width / 2 - tip.offsetWidth / 2), window.innerWidth - tip.offsetWidth - 4)}px`;
  });
  document.addEventListener('pointerdown', () => {
    tip.hidden = true;
  }, true);
})();
