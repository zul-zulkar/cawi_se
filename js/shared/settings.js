/* ====== "Atur Tampilan" — local UI preferences ====== */
(function () {
  const KEY = 'cawi_settings_v1';
  const DEFAULTS = {
    fontSize:    'medium',        // small | medium | large
    density:     'comfortable',   // compact | comfortable | spacious
    fontFamily:  'inter',         // inter | system | serif
    palette:     'orange',        // orange | navy | forest | graphite | burgundy
    highContrast:false,
    showHints:   true,
    showNumbers: true,
    autosave:    '60',            // off | 30 | 60 | 120
  };

  const PALETTES = {
    orange:   { accent: '#ed6c00', hot: '#ff7a14', soft: '#fde6cf', faint: '#fff2e3', banner: '#fdf2dd' },
    navy:     { accent: '#1e40af', hot: '#1d4ed8', soft: '#dbeafe', faint: '#eff6ff', banner: '#dbeafe' },
    forest:   { accent: '#047857', hot: '#059669', soft: '#d1fae5', faint: '#ecfdf5', banner: '#d1fae5' },
    graphite: { accent: '#18181b', hot: '#27272a', soft: '#e4e4e7', faint: '#fafafa', banner: '#e4e4e7' },
    burgundy: { accent: '#9f1239', hot: '#be123c', soft: '#fde2e7', faint: '#fff1f2', banner: '#fde2e7' },
  };

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return { ...DEFAULTS };
      return { ...DEFAULTS, ...JSON.parse(raw) };
    } catch (e) { return { ...DEFAULTS }; }
  }
  function save(s) {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
  }
  function apply(s) {
    const r = document.documentElement;
    r.dataset.fs        = s.fontSize;
    r.dataset.ds        = s.density;
    r.dataset.ff        = s.fontFamily;
    r.dataset.palette   = s.palette;
    r.dataset.contrast  = s.highContrast ? 'high' : 'normal';
    r.dataset.hints     = s.showHints   ? 'on' : 'off';
    r.dataset.numbers   = s.showNumbers ? 'on' : 'off';

    const p = PALETTES[s.palette] || PALETTES.orange;
    r.style.setProperty('--orange',       p.accent);
    r.style.setProperty('--orange-hot',   p.hot);
    r.style.setProperty('--orange-soft',  p.soft);
    r.style.setProperty('--orange-faint', p.faint);
    r.style.setProperty('--cream',        p.banner);
  }

  // Auto-save scheduler — reads new interval on change
  let _autosaveTimer = null;
  function reschedAutosave(s) {
    if (_autosaveTimer) { clearInterval(_autosaveTimer); _autosaveTimer = null; }
    const sec = parseInt(s.autosave, 10);
    if (!sec || s.autosave === 'off') return;
    _autosaveTimer = setInterval(() => {
      if (typeof window.saveAsDraft === 'function' && !document.hidden) {
        try { window.saveAsDraft({ silent: true }); } catch (e) {}
      }
    }, sec * 1000);
  }

  // --- Modal interactions ---
  function updateModalUI(s) {
    document.querySelectorAll('.set-seg').forEach(seg => {
      const key = seg.dataset.key;
      const val = String(s[key]);
      seg.querySelectorAll('.set-seg-btn').forEach(b => {
        b.classList.toggle('on', b.dataset.val === val);
      });
    });
    document.querySelectorAll('.set-toggle').forEach(t => {
      const key = t.dataset.key;
      const on = !!s[key];
      t.classList.toggle('on', on);
      t.setAttribute('aria-checked', on ? 'true' : 'false');
    });
    document.querySelectorAll('.set-palette').forEach(p => {
      const val = String(s.palette);
      p.querySelectorAll('.set-palette-chip').forEach(c => {
        c.classList.toggle('on', c.dataset.val === val);
      });
    });
  }

  function wireModalOnce() {
    if (window._cawiSettingsWired) return;
    window._cawiSettingsWired = true;
    document.querySelectorAll('.set-seg').forEach(seg => {
      seg.addEventListener('click', (e) => {
        const btn = e.target.closest('.set-seg-btn');
        if (!btn) return;
        const key = seg.dataset.key;
        const val = btn.dataset.val;
        const s = load();
        s[key] = (key === 'highContrast' || key === 'showHints' || key === 'showNumbers') ? (val === 'true') : val;
        save(s); apply(s); updateModalUI(s);
        if (key === 'autosave') reschedAutosave(s);
      });
    });
    document.querySelectorAll('.set-toggle').forEach(t => {
      t.addEventListener('click', () => {
        const key = t.dataset.key;
        const s = load();
        s[key] = !s[key];
        save(s); apply(s); updateModalUI(s);
      });
    });
    document.querySelectorAll('.set-palette').forEach(p => {
      p.addEventListener('click', (e) => {
        const chip = e.target.closest('.set-palette-chip');
        if (!chip) return;
        const s = load();
        s.palette = chip.dataset.val;
        save(s); apply(s); updateModalUI(s);
      });
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const bd = document.getElementById('setBackdrop');
        if (bd && bd.style.display !== 'none') closeSettingsModal();
      }
    });
  }

  // Public API
  window.openSettingsModal = function () {
    const bd = document.getElementById('setBackdrop');
    if (!bd) return;
    wireModalOnce();
    updateModalUI(load());
    bd.style.display = 'flex';
    requestAnimationFrame(() => bd.classList.add('open'));
  };
  window.closeSettingsModal = function () {
    const bd = document.getElementById('setBackdrop');
    if (!bd) return;
    bd.classList.remove('open');
    setTimeout(() => { bd.style.display = 'none'; }, 200);
  };
  window.resetSettings = function () {
    if (!confirm('Kembalikan semua pengaturan tampilan ke default?')) return;
    const s = { ...DEFAULTS };
    save(s); apply(s); updateModalUI(s); reschedAutosave(s);
    if (typeof window.showToast === 'function') {
      window.showToast('Pengaturan tampilan direset.', 'ok');
    }
  };

  // Apply on first load
  try {
    const s = load();
    apply(s);
    reschedAutosave(s);
  } catch (e) {}
})();
