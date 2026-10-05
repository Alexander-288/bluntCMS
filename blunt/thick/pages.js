/* BluntCMS Thick — the sidebar's page switcher and history (restore an earlier version). */
(() => {
  'use strict';

  const B = window.Blunt;
  const siteUrl = B.cfg.saveUrl.replace(/save\.php$/, 'thick/site.php');
  // Same shape as the editor's own links: slashes stay readable.
  const editUrl = (page) => B.cfg.saveUrl.replace(/save\.php$/, `edit.php?page=${encodeURIComponent(page).replace(/%2F/g, '/')}`);
  const svg = (body, size = 20) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
  const ICONS = {
    chevron: svg('<path d="M6 9.5l6 6 6-6"/>', 16),
    history: svg('<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4v4.5H9M12 8v4l3 2"/>'),
  };

  const side = document.querySelector('.blunt-sidebar');
  const site = side.querySelector('.blunt-sitebar');
  const pill = site.querySelector('.blunt-pagepill');
  pill.setAttribute('role', 'button');
  pill.tabIndex = 0;
  pill.dataset.tip = 'Switch page';
  pill.classList.add('is-button');
  pill.insertAdjacentHTML('beforeend', ICONS.chevron);
  const historyBtn = B.mk('button', 'blunt-ibtn', site);
  historyBtn.type = 'button';
  historyBtn.innerHTML = ICONS.history;
  historyBtn.dataset.tip = 'History · restore an earlier version';
  historyBtn.setAttribute('aria-label', 'History');

  const menu = B.mk('div', 'blunt-sb-menu', side);
  menu.hidden = true;
  let open = null; // 'pages' | 'history'

  const close = () => {
    menu.hidden = true;
    open = null;
    pill.classList.remove('is-open');
    historyBtn.classList.remove('is-active');
  };
  const show = (which) => {
    open = which;
    menu.replaceChildren();
    menu.hidden = false;
    menu.style.top = `${site.offsetTop + site.offsetHeight}px`;
    pill.classList.toggle('is-open', which === 'pages');
    historyBtn.classList.toggle('is-active', which === 'history');
  };
  const heading = (text) => {
    B.mk('p', 'blunt-sb-menu-title', menu).textContent = text;
  };
  const message = (text) => B.mk('p', 'blunt-note', menu).textContent = text;

  async function get(params) {
    try {
      const res = await fetch(`${siteUrl}?${new URLSearchParams(params)}`, { credentials: 'same-origin' });
      return await res.json();
    } catch {
      return { ok: false, error: 'Could not reach the server.' };
    }
  }

  /** Leaving the page loses unsaved changes, so ask first (like Exit does). */
  const okToLeave = () => !B.dirty || window.confirm('You have unsaved changes. Leave anyway?');

  // ---- Pages ----
  async function showPages() {
    show('pages');
    heading('Pages');
    message('Loading…');
    const data = await get({ action: 'pages' });
    if (open !== 'pages') return;
    menu.lastChild.remove();
    if (!data.ok) {
      message(data.error);
      return;
    }
    let filter = null;
    if (data.pages.length > 8) {
      filter = B.mk('input', 'blunt-input', menu);
      filter.type = 'text';
      filter.placeholder = 'Find a page';
      filter.setAttribute('aria-label', 'Find a page');
    }
    const list = B.mk('div', 'blunt-sb-list', menu);
    const rows = data.pages.map(({ path, title }) => {
      const b = B.mk('button', 'blunt-sb-item', list);
      b.type = 'button';
      b.classList.toggle('is-current', path === B.cfg.page);
      B.mk('span', 'blunt-sb-item-main', b).textContent = title || path.split('/').pop();
      B.mk('span', 'blunt-sb-item-sub', b).textContent = path;
      b.addEventListener('click', () => {
        if (path === B.cfg.page) {
          close();
          return;
        }
        if (!okToLeave()) return;
        B.leaving = true;
        window.location.href = editUrl(path);
      });
      return [b, `${title || ''} ${path}`.toLowerCase()];
    });
    if (filter) {
      filter.addEventListener('input', () => {
        const q = filter.value.trim().toLowerCase();
        rows.forEach(([b, text]) => {
          b.hidden = !!q && !text.includes(q);
        });
      });
      filter.focus();
    }
  }

  // ---- History ----
  const when = (iso) => {
    const d = new Date(iso);
    const today = new Date();
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (d.toDateString() === today.toDateString()) return `Today ${time}`;
    return `${d.toLocaleDateString([], { day: 'numeric', month: 'short', year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric' })} ${time}`;
  };

  async function showHistory() {
    show('history');
    heading(`History of ${B.cfg.page.split('/').pop()}`);
    message('Loading…');
    const data = await get({ action: 'history', page: B.cfg.page });
    if (open !== 'history') return;
    menu.lastChild.remove();
    if (!data.ok) {
      message(data.error);
      return;
    }
    if (!data.backups.length) {
      message('No earlier versions yet. One is kept every time you save (the last ten).');
      return;
    }
    message('Each save keeps the version before it. Restoring keeps the current one too, so you can go back.');
    const list = B.mk('div', 'blunt-sb-list', menu);
    for (const b of data.backups) {
      const row = B.mk('div', 'blunt-sb-item is-row', list);
      const text = B.mk('div', '', row);
      B.mk('span', 'blunt-sb-item-main', text).textContent = when(b.time);
      B.mk('span', 'blunt-sb-item-sub', text).textContent = b.changed ? `${b.changed} line${b.changed > 1 ? 's' : ''} differ from now` : 'Same as now';
      const restore = B.mk('button', 'blunt-pill is-small', row);
      restore.type = 'button';
      restore.textContent = 'Restore';
      restore.disabled = !b.changed;
      restore.addEventListener('click', () => restoreVersion(b));
    }
  }

  async function restoreVersion(b) {
    if (!okToLeave()) return;
    if (!window.confirm(`Restore the version from ${when(b.time)}? The current file is kept as a backup.`)) return;
    let data;
    try {
      const res = await fetch(siteUrl, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore', page: B.cfg.page, id: b.id, csrf: B.cfg.csrf }),
      });
      data = await res.json();
    } catch {
      data = { ok: false, error: 'Could not reach the server. Nothing was changed.' };
    }
    if (!data.ok) {
      B.toast(data.error, 'error');
      return;
    }
    try {
      sessionStorage.setItem('blunt-toast', `Restored the version from ${when(b.time)}.`);
    } catch {
      // no storage: the reload just won't say so
    }
    B.leaving = true;
    window.location.reload();
  }

  pill.addEventListener('click', () => (open === 'pages' ? close() : showPages()));
  pill.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      pill.click();
    }
  });
  historyBtn.addEventListener('click', () => (open === 'history' ? close() : showHistory()));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && open) close();
  });
  document.addEventListener('pointerdown', (e) => {
    if (open && !menu.contains(e.target) && !site.contains(e.target)) close();
  }, true);
})();
