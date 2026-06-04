let _formDirty = false;

document.addEventListener('DOMContentLoaded', () => {
  // Pindahkan Blok II section-cards ke screen-usaha-body (sebelum applyFormMode)
  _initUsahaDetailScreen();

  // Inject identitas pendata (login) ke field hidden + auto-fill nama petugas
  injectPetugasIdentity();

  // Apply current mode early (so form-l/form-lub visibility is correct)
  if (typeof applyFormMode === 'function') applyFormMode(getFormMode());

  // Init searchable selects BEFORE any data load
  makeSearchable('q1_provinsi', 'provinsi');
  makeSearchable('q2_kabupaten', 'kabupaten/kota');
  makeSearchable('q3_kecamatan', 'kecamatan');
  makeSearchable('q4_kelurahan', 'kelurahan/desa');
  makeSearchable('q11d_negara', 'negara');
  makeSearchable('q11e_provinsi', 'provinsi kantor pusat');
  makeSearchable('q11f_kabupaten', 'kabupaten/kota kantor pusat');
  // L mode regional dropdowns
  if (document.getElementById('l1_alamat_provinsi')) {
    makeSearchable('l1_alamat_provinsi', 'provinsi keluarga');
    makeSearchable('l1_alamat_kab', 'kabupaten/kota keluarga');
    makeSearchable('l1_alamat_kec', 'kecamatan keluarga');
    makeSearchable('l1_alamat_kel', 'kelurahan/desa keluarga');
    loadProvinsiL();
    // L mode static selects with > 5 options
    makeSearchable('l3_lantai_bahan', 'bahan lantai');
    makeSearchable('l3_dinding_bahan', 'bahan dinding');
    makeSearchable('l3_atap_bahan', 'bahan atap');
    makeSearchable('l3_air', 'sumber air minum');
  }

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

  // === MODE PRE-SELECTOR ===
  // Show mode gate after auth succeeds if no mode is set yet
  document.addEventListener('cawi-auth-ok', () => {
    if (typeof hasFormMode === 'function' && !hasFormMode()) {
      // No draft-continue in progress means user is starting fresh — ask which kuesioner
      const continuing = localStorage.getItem('cawi_draft_continue_id');
      const editing    = localStorage.getItem('cawi_edit_mode');
      if (!continuing && !editing) showModeGate(false);
    }
  });

  // === EDIT MODE (dari daftar.html) ===
  const _isEditMode = loadEditMode();

  // Sembunyikan tombol Simpan Draft saat edit mode
  if (_isEditMode) {
    const btn = document.getElementById('saveDraftBtn');
    if (btn) btn.style.display = 'none';
  }

  // === DRAFT CONTINUE (dari daftar.html klik "Lanjutkan") ===
  const _draftContinueId = localStorage.getItem('cawi_draft_continue_id');
  if (_draftContinueId && !_isEditMode) {
    localStorage.removeItem('cawi_draft_continue_id');
    _currentDraftId = _draftContinueId;
    // LS_KEY sudah diset oleh continueDraft() di daftar-main.js
    restoreDraft();
  }

  // === AUTO-RESTORE DRAFT ===
  // Kuesioner sekarang HANYA dibuka via assignment (Portal Petugas) atau
  // workflow admin (daftar.html). Tidak ada lagi "draft mengambang" milik
  // user anonim, jadi tidak perlu banner "Mulai Baru / Muat Draft".
  // Draft yang ada di LS_KEY = milik assignment aktif (di-mirror oleh guard)
  // → langsung di-restore secara silent.
  if (!_isEditMode && !_draftContinueId) {
    try {
      if (localStorage.getItem(LS_KEY)) restoreDraft();
    } catch(e) {}
  }

  // === ASSIGNMENT PREFILL (urut & deterministik) ===
  // Cascade dropdown wilayah (loadKabupatenL → loadKecamatanL → loadKelurahanL)
  // bersifat async + bergantung urutan. restoreDraft() dispatch change event,
  // tetapi urutan iterasi Object.keys + timing async bisa membuat dropdown
  // child belum siap saat value child di-set → value tidak match → kosong.
  // Helper ini explicit menjamin cascade jalan urut.
  if (window.__cawiActiveAssignment && !_isEditMode && !_draftContinueId) {
    setTimeout(() => applyAssignmentPrefill(window.__cawiActiveAssignment), 100);
  }

  // Auto-save on any input change (debounced 60s) + mark form dirty
  document.addEventListener('input', () => { scheduleAutosave(); _formDirty = true; });
  document.addEventListener('change', () => { scheduleAutosave(); _formDirty = true; });

  // Save on blok navigation — auto-save draft (create if needed)
  const origGoBlok = window.goBlok;
  window.goBlok = function(n) {
    saveAsDraft();
    origGoBlok(n);
  };

  // Prevent accidental page close/refresh when form has unsaved input
  window.addEventListener('beforeunload', e => {
    if (_formDirty) { e.preventDefault(); return (e.returnValue = ''); }
  });

  // iOS Safari: back/forward gesture doesn't fire beforeunload.
  // Auto-save on pagehide so no data is lost when user navigates away.
  window.addEventListener('pagehide', () => {
    try { saveAsDraft(); } catch(e) {}
  });

  // If page is restored from bfcache (iOS swipe-back), the guard state
  // may be stale. Redirect to portal so session is re-validated cleanly.
  // Data was already saved by pagehide + storage proxy.
  window.addEventListener('pageshow', e => {
    if (e.persisted) { window.location.replace('index.html'); }
  });
});

/* ====== IDENTITAS PENDATA (login) ======
 * Baca petugas aktif dari sessionStorage['cawi_petugas_aktif'] (di-set portal).
 * Bila tidak terbawa (mis. tab baru) → fallback ke window.__cawiActiveAssignment
 * yang di-set oleh assignment guard. Isi field hidden petugas_email_login /
 * petugas_peran_login (di-submit di semua mode), dan auto-fill nama petugas
 * ke field form (tanpa menimpa isian manual yang sudah ada).
 */
function injectPetugasIdentity() {
  let email = '', peran = '', nama = '';
  try {
    const active = JSON.parse(sessionStorage.getItem('cawi_petugas_aktif') || 'null');
    if (active) { email = active.email || ''; peran = active.peran || ''; nama = active.nama || ''; }
  } catch (e) {}
  // Fallback: assignment (G-4) — sessionStorage tidak terbawa antar-tab
  const a = window.__cawiActiveAssignment;
  if (a) {
    if (!email) email = a.petugas_email || '';
    if (!peran) peran = a.petugas_peran || '';
    if (!nama)  nama  = a.petugas_nama  || '';
  }
  const eEl = document.getElementById('petugas_email_login');
  if (eEl) eEl.value = email;
  const pEl = document.getElementById('petugas_peran_login');
  if (pEl) pEl.value = peran;
  // Auto-fill nama petugas ke field form L.UB (p_nama) & L (l5_petugas_nama),
  // hanya bila kosong (jangan timpa isian manual / hasil restore draft).
  if (nama) {
    ['p_nama', 'l5_petugas_nama'].forEach(id => {
      const el = document.getElementById(id);
      if (el && !el.value) el.value = nama;
    });
  }
}

/* ====== GUARDED NAVIGATION ======
 * Selalu konfirmasi sebelum keluar dari kuesioner. Konfirmasi tampil
 * baik form sudah diubah maupun belum, karena assignment-driven workflow
 * selalu perlu jejak yang jelas saat petugas keluar mid-isian. Pilih
 * "Simpan Draft & Keluar" untuk auto-save + redirect; "Batal" untuk
 * tetap di kuesioner.
 */
let _leaveAction = null;

function guardedNav(urlOrFn, newTab) {
  _leaveAction = { fn: urlOrFn, newTab: !!newTab };
  document.getElementById('leaveGuardOverlay').classList.add('open');
  document.getElementById('leaveGuardModal').classList.add('open');
}

function _doLeaveNav(urlOrFn, newTab) {
  if (typeof urlOrFn === 'function') urlOrFn();
  else if (newTab) window.open(urlOrFn, '_blank');
  else window.location.href = urlOrFn;
}

function leaveGuardSave() { saveAsDraft(); _formDirty = false; leaveGuardGo(); }

function leaveGuardGo() {
  _closeLeaveGuard();
  if (_leaveAction) { const a = _leaveAction; _leaveAction = null; _doLeaveNav(a.fn, a.newTab); }
}

function leaveGuardCancel() { _closeLeaveGuard(); _leaveAction = null; }

function _closeLeaveGuard() {
  document.getElementById('leaveGuardOverlay').classList.remove('open');
  document.getElementById('leaveGuardModal').classList.remove('open');
}

/* ============================================================
   SCREEN MANAGER + HASH ROUTER
   Mengelola navigasi antara main screen, anggota detail, dan
   usaha detail screen. iOS back button pada hash navigation
   otomatis ditangani oleh popstate (tidak perlu beforeunload).
   ============================================================ */

let _activeScreen = 'main'; // 'main' | 'ang' | 'usaha'
let _activeScreenIdx = null; // anggota ke-N atau usaha ke-N

function _showScreen(type) {
  document.querySelectorAll('.form-screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById('screen-' + type);
  if (el) el.classList.add('active');
  _activeScreen = type;
  // Scroll ke atas saat pindah screen
  window.scrollTo(0, 0);
}

function showMainScreen() {
  _showScreen('main');
  _activeScreenIdx = null;
  // Hapus hash agar clean
  if (location.hash) history.pushState(null, '', location.pathname + location.search);
}

function showAngDetailScreen(idx) {
  _activeScreenIdx = idx;
  const titleEl = document.getElementById('screen-ang-title');
  if (titleEl) titleEl.textContent = 'Anggota ke-' + idx;
  // Pindahkan card dari pool ke screen-ang-body
  const pool = document.getElementById('anggota-pool');
  const body = document.getElementById('screen-ang-body');
  if (pool && body) {
    const card = document.getElementById('l_ang_card_' + idx);
    if (card) body.appendChild(card);
  }
  _showScreen('ang');
  history.pushState({ screen: 'ang', idx }, '', '#ang-' + idx);
}

function showUsahaDetailScreen(idx) {
  _activeScreenIdx = idx;
  const titleEl = document.getElementById('screen-usaha-title');
  if (titleEl) titleEl.textContent = 'Usaha ke-' + idx;
  // Load data usaha N ke form l2_*
  if (typeof loadUsahaIntoForm === 'function') loadUsahaIntoForm(idx);
  _showScreen('usaha');
  history.pushState({ screen: 'usaha', idx }, '', '#usaha-' + idx);
}

function exitAnggotaDetail() {
  if (_activeScreenIdx != null) {
    // Kembalikan card ke pool
    const card = document.getElementById('l_ang_card_' + _activeScreenIdx);
    const pool = document.getElementById('anggota-pool');
    if (card && pool) pool.appendChild(card);
    // Update baris roster
    if (typeof renderAnggotaRosterRow === 'function') renderAnggotaRosterRow(_activeScreenIdx);
    if (typeof updateJmlPendataan === 'function') updateJmlPendataan();
    if (typeof updateProgress === 'function') updateProgress();
  }
  showMainScreen();
}

function exitUsahaDetail() {
  if (_activeScreenIdx != null) {
    // Simpan form l2_* ke store
    if (typeof serializeCurrentUsahaForm === 'function') serializeCurrentUsahaForm(_activeScreenIdx);
    // Update roster row
    if (typeof renderUsahaRosterRow === 'function') renderUsahaRosterRow(_activeScreenIdx);
    if (typeof updateProgress === 'function') updateProgress();
  }
  showMainScreen();
}

function showLkpDetailScreen(idx) {
  _activeScreenIdx = idx;
  const titleEl = document.getElementById('screen-lkp-title');
  if (titleEl) titleEl.textContent = 'Cabang/Unit ke-' + idx;
  // Pindahkan card cabang dari pool ke screen-lkp-body
  const pool = document.getElementById('lkp-pool');
  const body = document.getElementById('screen-lkp-body');
  if (pool && body) {
    const card = document.getElementById('lkp_card_' + idx);
    if (card) body.appendChild(card);
  }
  _showScreen('lkp');
  history.pushState({ screen: 'lkp', idx }, '', '#lkp-' + idx);
}

function exitLkpDetail() {
  if (_activeScreenIdx != null) {
    // Kembalikan card ke pool
    const card = document.getElementById('lkp_card_' + _activeScreenIdx);
    const pool = document.getElementById('lkp-pool');
    if (card && pool) pool.appendChild(card);
    if (typeof renderLkpRosterRow === 'function') renderLkpRosterRow(_activeScreenIdx);
    if (typeof updateProgress === 'function') updateProgress();
  }
  showMainScreen();
}

// Hash router — handle popstate (browser/iOS back button)
function _handleHashNav() {
  const hash = location.hash;
  const angM = hash.match(/^#ang-(\d+)$/);
  const usahaM = hash.match(/^#usaha-(\d+)$/);
  const lkpM = hash.match(/^#lkp-(\d+)$/);
  if (angM) {
    const idx = parseInt(angM[1]);
    if (_activeScreen !== 'ang' || _activeScreenIdx !== idx) showAngDetailScreen(idx);
  } else if (usahaM) {
    const idx = parseInt(usahaM[1]);
    if (_activeScreen !== 'usaha' || _activeScreenIdx !== idx) showUsahaDetailScreen(idx);
  } else if (lkpM) {
    const idx = parseInt(lkpM[1]);
    if (_activeScreen !== 'lkp' || _activeScreenIdx !== idx) showLkpDetailScreen(idx);
  } else {
    // Navigasi ke hash kosong = kembali ke main
    if (_activeScreen === 'ang')   exitAnggotaDetail();
    else if (_activeScreen === 'usaha') exitUsahaDetail();
    else if (_activeScreen === 'lkp')   exitLkpDetail();
  }
}
window.addEventListener('popstate', _handleHashNav);

/* ============================================================
   INISIALISASI USAHA DETAIL SCREEN
   Memindahkan semua .section-card dari #blokL2 ke #screen-usaha-body
   saat DOM siap. blokL2 kemudian hanya berisi roster.
   ============================================================ */
function _initUsahaDetailScreen() {
  const blokL2  = document.getElementById('blokL2');
  const usahaBody = document.getElementById('screen-usaha-body');
  if (!blokL2 || !usahaBody) return;
  // Pindahkan nav-actions Blok II ke screen usaha juga
  blokL2.querySelectorAll('.section-card, .notice-box, .nav-actions:last-of-type').forEach(el => {
    // Kecualikan elemen yang sudah ditandai sebagai roster
    if (!el.id || !el.id.startsWith('usaha-roster')) {
      usahaBody.appendChild(el);
    }
  });
}

/* ============================================================
   LAZY-LOAD KAMUS WILAYAH BALI (regional-bali.json)
   File 313 KB. Hanya di-fetch saat assignment wilayah-nya BUKAN
   yang sudah tercover di regional.js (Buleleng = 5108). Singleton
   per sesi kuesioner.
   ============================================================ */
let _baliRegLoaded  = false;
let _baliRegLoading = null;
function loadBaliRegionalKuesioner() {
  if (_baliRegLoaded)  return Promise.resolve();
  if (_baliRegLoading) return _baliRegLoading;
  _baliRegLoading = fetch('js/data/regional-bali.json', { cache: 'force-cache' })
    .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(data => {
      const mergeKn = (target, src) => {
        for (const k in src) {
          target[k] = src[k].map(pair => ({ kode: pair[0], nama: pair[1] }));
        }
      };
      mergeKn(STATIC_KABUPATEN, data.kab);
      mergeKn(STATIC_KECAMATAN, data.kec);
      mergeKn(STATIC_KELURAHAN, data.desa);
      _baliRegLoaded  = true;
      _baliRegLoading = null;
    })
    .catch(err => { _baliRegLoading = null; throw err; });
  return _baliRegLoading;
}

// Apakah wilayah assignment butuh extended Bali data?
function _needsBaliRegional(a) {
  if (!a) return false;
  // Kalau provinsi-nya Bali (51) tapi kabupaten BUKAN Buleleng (5108),
  // data kecamatan/kelurahan tidak ada di regional.js → wajib lazy-load.
  if (a.provinsi_kd === '51' && a.kabupaten_kd && a.kabupaten_kd !== '5108') return true;
  // Kalau kecamatan_kd di-set tapi STATIC_KECAMATAN[kabupaten_kd] belum punya entry
  if (a.kabupaten_kd && !(typeof STATIC_KECAMATAN !== 'undefined' && STATIC_KECAMATAN[a.kabupaten_kd])) return true;
  // Kalau desa_kd di-set tapi kecamatan-nya belum di STATIC_KELURAHAN
  if (a.kecamatan_kd && !(typeof STATIC_KELURAHAN !== 'undefined' && STATIC_KELURAHAN[a.kecamatan_kd])) return true;
  return false;
}

/* ============================================================
   ASSIGNMENT PREFILL — apply data dari assignment ke form secara
   deterministik. Dipanggil setelah restoreDraft() saat kuesioner
   dibuka via guard (window.__cawiActiveAssignment).
   ============================================================ */
function _setSearchableDisplay(selectId) {
  const sel = document.getElementById(selectId);
  const inp = document.getElementById(selectId + '_inp');
  if (!sel || !inp) return;
  const opt = sel.options[sel.selectedIndex];
  if (opt && opt.value && opt.text) {
    inp.value = opt.text;
    inp.classList.add('has-value');
  }
}

async function applyAssignmentPrefill(a) {
  if (!a) return;
  const mode = (typeof getFormMode === 'function') ? getFormMode() : 'lub';

  // Kalau wilayah di luar yang sudah ter-cache di regional.js, lazy-load
  // kamus wilayah Bali penuh dulu — supaya cascade dropdown bisa di-match.
  if (_needsBaliRegional(a)) {
    if (typeof window.showLoadingOverlay === 'function') {
      window.showLoadingOverlay('Memuat kamus wilayah', 'Mengunduh data wilayah Bali (sekali per sesi)…');
    }
    try {
      await loadBaliRegionalKuesioner();
    } catch (e) {
      console.warn('[PREFILL] Gagal load wilayah Bali:', e);
    } finally {
      if (typeof window.hideLoadingOverlay === 'function') window.hideLoadingOverlay();
    }
  }

  if (mode === 'l') {
    // ===== Mode L (Rumah Tangga) =====
    if (a.nama_responden) {
      const el = document.getElementById('l1_nama_kk');
      if (el && !el.value) { el.value = a.nama_responden; el.dispatchEvent(new Event('input', {bubbles:true})); }
    }
    // Anggota #1 = Kepala Keluarga otomatis (idempotent; skip bila draft sudah punya anggota)
    if (typeof ensureKepalaKeluarga === 'function') ensureKepalaKeluarga();
    // Cascade wilayah keluarga (l1_alamat_*)
    if (a.provinsi_kd) {
      const selProv = document.getElementById('l1_alamat_provinsi');
      if (selProv) {
        selProv.value = a.provinsi_kd;
        _setSearchableDisplay('l1_alamat_provinsi');
        if (typeof loadKabupatenL === 'function') await loadKabupatenL(a.provinsi_kd);
      }
    }
    if (a.kabupaten_kd) {
      const selKab = document.getElementById('l1_alamat_kab');
      if (selKab) {
        selKab.value = a.kabupaten_kd;
        _setSearchableDisplay('l1_alamat_kab');
        if (typeof loadKecamatanL === 'function') loadKecamatanL(a.kabupaten_kd);
      }
    }
    if (a.kecamatan_kd) {
      const selKec = document.getElementById('l1_alamat_kec');
      if (selKec) {
        selKec.value = a.kecamatan_kd;
        _setSearchableDisplay('l1_alamat_kec');
        if (typeof loadKelurahanL === 'function') loadKelurahanL(a.kecamatan_kd);
      }
    }
    if (a.desa_kd) {
      const selKel = document.getElementById('l1_alamat_kel');
      if (selKel) {
        selKel.value = a.desa_kd;
        _setSearchableDisplay('l1_alamat_kel');
      }
    }
    // SLS + SubSLS — gabungkan kode menjadi idsubsls 16-digit kalau SubSLS != "00"
    if (a.sls_full_kd) {
      const fullCode = (a.subsls_kd && a.subsls_kd !== '00')
        ? a.sls_full_kd + a.subsls_kd
        : a.sls_full_kd;
      const el = document.getElementById('l1_kode_sls');
      if (el && !el.value) { el.value = fullCode; el.dispatchEvent(new Event('input', {bubbles:true})); }
    }
    if (a.sls_nama) {
      const subTag = (a.subsls_kd && a.subsls_kd !== '00') ? (' (SubSLS ' + a.subsls_kd + ')') : '';
      const el = document.getElementById('l1_nama_sls');
      if (el && !el.value) { el.value = a.sls_nama + subTag; el.dispatchEvent(new Event('input', {bubbles:true})); }
    }
  } else {
    // ===== Mode L.UB (Usaha Besar) =====
    if (a.nama_responden) {
      const el = document.getElementById('q5a_nama_perusahaan');
      if (el && !el.value) { el.value = a.nama_responden; el.dispatchEvent(new Event('input', {bubbles:true})); }
    }
    // Override q1/q2 kalau assignment di wilayah non-Bali atau non-Buleleng
    // (default hardcoded di awal DOMContentLoaded adalah BALI/BULELENG).
    if (a.provinsi_kd && a.provinsi_kd !== '51') {
      const selProv = document.getElementById('q1_provinsi');
      if (selProv) {
        selProv.value = a.provinsi_kd;
        _setSearchableDisplay('q1_provinsi');
        // q2_kabupaten butuh re-load via loadKabupaten async
        if (typeof loadKabupaten === 'function') {
          await loadKabupaten(a.provinsi_kd, 'q2_kabupaten', 'spinner-kab');
        }
      }
    }
    if (a.kabupaten_kd && a.kabupaten_kd !== '5108') {
      const selKab = document.getElementById('q2_kabupaten');
      if (selKab) {
        selKab.value = a.kabupaten_kd;
        _setSearchableDisplay('q2_kabupaten');
        if (typeof loadKecamatan === 'function') loadKecamatan(a.kabupaten_kd);
      }
    }
    // Cascade kec → kel (sync STATIC untuk Bali kab manapun setelah lazy-load)
    if (a.kecamatan_kd) {
      const selKec = document.getElementById('q3_kecamatan');
      if (selKec) {
        selKec.value = a.kecamatan_kd;
        _setSearchableDisplay('q3_kecamatan');
        if (typeof loadKelurahan === 'function') loadKelurahan(a.kecamatan_kd);
      }
    }
    if (a.desa_kd) {
      const selKel = document.getElementById('q4_kelurahan');
      if (selKel) {
        selKel.value = a.desa_kd;
        _setSearchableDisplay('q4_kelurahan');
      }
    }
  }

  // Hindari progress meter "stuck" di 0
  if (typeof updateProgress === 'function') updateProgress();
}
