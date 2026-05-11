document.addEventListener('DOMContentLoaded', () => {
  // Init searchable selects BEFORE any data load
  makeSearchable('q1_provinsi', 'provinsi');
  makeSearchable('q2_kabupaten', 'kabupaten/kota');
  makeSearchable('q3_kecamatan', 'kecamatan');
  makeSearchable('q4_kelurahan', 'kelurahan/desa');
  makeSearchable('q11e_provinsi', 'provinsi kantor pusat');
  makeSearchable('q11f_kabupaten', 'kabupaten/kota kantor pusat');

  // Auto-select Bali [51] and Buleleng [5108] – fixed domicile
  const selProv = document.getElementById('q1_provinsi');
  const selKab  = document.getElementById('q2_kabupaten');
  selProv.value = '51';
  selKab.value  = '5108';
  const inpProv = document.getElementById('q1_provinsi_inp');
  const inpKab  = document.getElementById('q2_kabupaten_inp');
  if (inpProv) { inpProv.value = 'BALI'; inpProv.classList.add('has-value'); }
  if (inpKab)  { inpKab.value  = 'KAB. BULELENG'; inpKab.classList.add('has-value'); }

  // Auto-load kecamatan list for Buleleng on open
  loadKecamatan('5108');

  // Load provinsi for Kantor Pusat (Q11e)
  loadProvinsi();

  // Preload KBLI data for instant local search
  preloadKBLI();

  // Default today's date for Blok III
  document.getElementById('r_tanggal').value = new Date().toISOString().split('T')[0];

  // Inject remark button + area into every section-card header
  document.querySelectorAll('.section-card').forEach((card, i) => {
    const header = card.querySelector('.section-header');
    if (!header) return;
    const rid = 'remark_card_' + i;
    const btn = document.createElement('button');
    btn.className = 'remark-toggle-btn';
    btn.type = 'button';
    btn.innerHTML = '+ Catatan';
    btn.onclick = () => {
      toggleRemark(rid, btn);
      // Update badge if note added/removed
      const ta = document.getElementById(rid + '_ta');
      if (ta) ta.addEventListener('input', () => {
        btn.classList.toggle('has-note', ta.value.trim().length > 0);
      }, {once: true});
    };
    header.appendChild(btn);
    const area = document.createElement('div');
    area.className = 'remark-area';
    area.id = rid;
    area.innerHTML = `<span class="remark-area-label">Catatan Pendata</span><textarea id="${rid}_ta" placeholder="Tambahkan keterangan atau observasi lapangan untuk pertanyaan ini..."></textarea>`;
    header.insertAdjacentElement('afterend', area);
  });

  // === FILLED FIELD INDICATOR + LIVE PROGRESS ===
  function markFilled(el) {
    if (el.readOnly || el.disabled) return;
    el.classList.toggle('field-filled', el.value.trim().length > 0);
  }
  // Text, number, email, date, textarea inputs
  document.querySelectorAll('input:not([type=hidden]):not([type=radio]):not([type=checkbox]),textarea').forEach(el => {
    el.addEventListener('input', () => { markFilled(el); updateProgress(); });
    el.addEventListener('change', () => { markFilled(el); updateProgress(); });
    markFilled(el); // set initial state (e.g. r_tanggal auto-filled)
  });
  // Select elements (native, including those behind searchable selects)
  document.querySelectorAll('select').forEach(el => {
    el.addEventListener('change', updateProgress);
  });
  // Radio buttons — highlight checked item row + update progress
  document.querySelectorAll('input[type=radio]').forEach(el => {
    el.addEventListener('change', () => {
      const grp = el.closest('.radio-group');
      if (grp) grp.querySelectorAll('.radio-item').forEach(item => {
        item.classList.toggle('checked', !!item.querySelector('input[type=radio]:checked'));
      });
      updateProgress();
    });
  });
  // Signature canvas — update after each stroke
  const sigEl = document.getElementById('sigCanvas');
  if (sigEl) {
    sigEl.addEventListener('mouseup', updateProgress);
    sigEl.addEventListener('touchend', updateProgress);
  }
  // Run once on load to reflect any pre-filled defaults
  updateProgress();

  // === EDIT MODE (dari daftar.html) ===
  const _isEditMode = loadEditMode();

  // === AUTO-SAVE SETUP ===
  // Check for existing draft (skip jika sedang edit mode)
  if (!_isEditMode) try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const vals = JSON.parse(raw);
      const ts = vals['_ts'] ? new Date(vals['_ts']) : null;
      const banner = document.getElementById('restoreBanner');
      const tsEl = document.getElementById('restoreBannerTs');
      if (banner) banner.style.display = 'block';
      if (tsEl && ts) {
        const diff = Math.round((Date.now() - ts.getTime()) / 60000);
        const label = diff < 2 ? 'baru saja' : diff < 60 ? `${diff} menit lalu` : `${Math.round(diff/60)} jam lalu`;
        tsEl.textContent = 'Disimpan ' + label;
      }
    }
  } catch(e) {}

  // Auto-save on any input change (debounced 60s)
  document.addEventListener('input', scheduleAutosave);
  document.addEventListener('change', scheduleAutosave);

  // Also save on blok navigation
  const origGoBlok = window.goBlok;
  window.goBlok = function(n) { saveDraft(); origGoBlok(n); };
});
