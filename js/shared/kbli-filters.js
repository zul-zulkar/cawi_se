/* ====== KBLI conditional sets (Halal & BPOM) ====== */
/* Loads master/KBLI Halal.csv and master/KBLI BPOM.csv at runtime,
   exposes isKBLIHalal(kode) / isKBLIBPOM(kode) helpers, and triggers
   show/hide of dependent sections on form-lub (Q15/Q16) and form-l (L19/L20). */
(function () {
  const _halal = new Set();
  const _bpom  = new Set();
  let _loaded = false;

  async function loadCsv(path, set) {
    try {
      const res = await fetch(path);
      if (!res.ok) return;
      const text = await res.text();
      const lines = text.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || i === 0) continue; // skip header / blank
        // first column is the KBLI kode (may be wrapped in quotes)
        const m = line.match(/^\s*"?([0-9A-Z]+)"?/);
        if (m && m[1]) set.add(m[1]);
      }
    } catch (e) { /* fail soft → empty set, fields shown by default */ }
  }

  async function load() {
    if (_loaded) return;
    await Promise.all([
      loadCsv('master/KBLI Halal.csv', _halal),
      loadCsv('master/KBLI BPOM.csv',  _bpom),
    ]);
    _loaded = true;
  }

  function isHalal(kode) { return _halal.has(String(kode || '').trim()); }
  function isBPOM (kode) { return _bpom.has(String(kode || '').trim()); }

  /* Apply visibility to L.UB Q15 / Q16 + L Q19 / Q20.
     If kode is empty (no selection yet), keep sections visible (default). */
  function apply(kode) {
    const trimmed = String(kode || '').trim();
    const hasSel  = trimmed !== '';
    const halalOk = !hasSel || isHalal(trimmed);
    const bpomOk  = !hasSel || isBPOM(trimmed);

    // L.UB
    setSectionByHeader('sec-15', halalOk);
    setSectionByHeader('sec-16', bpomOk);
    // L Blok II
    setSectionByHeader('sec-L2-19', halalOk);
    setSectionByHeader('sec-L2-20', bpomOk);

    // If hidden, also clear any required state on those questions
    if (!halalOk) {
      ['q15a','q15b','q15c'].forEach(id => clearVal(id));
      ['l2_halal','l2_halal_b','l2_halal_c'].forEach(id => clearVal(id));
    }
    if (!bpomOk) {
      ['q16a','q16b','q16c'].forEach(id => clearVal(id));
      ['l2_bpom','l2_bpom_b','l2_bpom_c'].forEach(id => clearVal(id));
    }
  }

  function setSectionByHeader(headerId, show) {
    const h = document.getElementById(headerId);
    if (!h) return;
    const card = h.closest('.section-card');
    if (!card) return;
    card.classList.toggle('kbli-hidden', !show);
  }
  function clearVal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.type === 'radio') {
      document.querySelectorAll('input[name="' + el.name + '"]').forEach(r => { r.checked = false; });
    } else {
      el.value = '';
    }
  }

  // Public API
  window.kbliFilters = {
    load, apply, isHalal, isBPOM,
    halalSize: () => _halal.size,
    bpomSize:  () => _bpom.size,
  };

  // Apply on page load (in case a draft has a KBLI already selected)
  document.addEventListener('DOMContentLoaded', async () => {
    await load();
    const mode = (typeof getFormMode === 'function') ? getFormMode() : 'lub';
    const kodeEl = document.getElementById(mode === 'l' ? 'l2_kbli_kode' : 'q9g_kbli_kode');
    apply(kodeEl ? kodeEl.value : '');
  });
})();
