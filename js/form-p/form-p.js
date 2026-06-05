/* ============================================================
 * FORM P — Kuesioner SE2026-P (Pemutakhiran / Listing)
 * ------------------------------------------------------------
 * Blok P tampil pertama di "unified mode". Field penentu
 * (pmt_kode_bangunan + pmt_skala) menentukan kuesioner lanjutan
 * (L / L.UB / tidak ada) lewat PMT_GATE_RULES. Sidebar & form
 * lanjutan di-reveal dinamis tanpa menghapus data (G-2).
 *
 * Catatan: file ini ADITIF. Logika L/L.UB existing tidak diubah;
 * unified mode hanya aktif bila body punya class `mode-unified`.
 * Lihat docs/desain-unified-kuesioner-P.md (§C field, §D sidebar).
 * ============================================================ */

/* ---- Gate: Kode Penggunaan Bangunan → stage lanjutan ----
 * kode 1–8 (panduan SE2026-P):
 *   1 Khusus Usaha · 2 Campuran · 3 Tempat Tinggal · 4 Ibadah/Organisasi
 *   5 Pemerintah/Sekolah · 6 Tidak dicakup · 7 Virtual Office · 8 Panti/Lapas
 * skala: 'ub'|'besar' → L.UB ; selain itu (UMKM/kosong) → L.
 * Return: 'none' | 'l' | 'lub'  (pure function — diuji unit).
 */
function PMT_GATE_RULES(kode, jmlUsaha, skala) {
  var k = String(kode == null ? '' : kode).trim();
  var s = String(skala == null ? '' : skala).trim().toLowerCase();
  var isUB = (s === 'ub' || s === 'besar');
  switch (k) {
    case '3':                 // Tempat tinggal → keluarga (+usaha RT) = L
      return 'l';
    case '2':                 // Campuran → UB? L.UB : L
    case '1':                 // Khusus usaha
    case '7':                 // Virtual office
      return isUB ? 'lub' : 'l';
    case '4': case '5': case '6': case '8':
      return 'none';          // hanya listing P (tidak ada kuesioner lanjutan)
    default:
      return 'none';          // belum dipilih / kode tak dikenal
  }
}

/* Baca stage dari field Blok P di DOM. */
function computeStageFromP() {
  var kode  = (typeof getVal === 'function') ? getVal('pmt_kode_bangunan') : _pVal('pmt_kode_bangunan');
  var jml   = (typeof getVal === 'function') ? getVal('pmt_jml_usaha')     : _pVal('pmt_jml_usaha');
  var skala = (typeof getVal === 'function') ? getVal('pmt_skala')          : _pVal('pmt_skala');
  return PMT_GATE_RULES(kode, parseInt(jml, 10) || 0, skala);
}

function _pVal(id) {
  var el = document.getElementById(id);
  return el ? String(el.value || '').trim() : '';
}

function isUnifiedMode() {
  return !!(document.body && document.body.classList.contains('mode-unified'));
}

/* ---- Sidebar dinamis ----
 * Hitung stage dari Blok P lalu:
 *  - set body class `stage-l` / `stage-lub` / `stage-none`
 *  - selaraskan getFormMode() (lewat setFormMode) supaya logika
 *    collect/validation/progress L vs L.UB yang sudah ada terpakai
 *    untuk stage aktif. Data stage non-aktif TIDAK dihapus (G-2).
 */
function refreshDynamicSidebar() {
  if (!isUnifiedMode()) return computeStageFromP();
  var stage = computeStageFromP();
  var body = document.body;
  body.classList.toggle('stage-l',    stage === 'l');
  body.classList.toggle('stage-lub',  stage === 'lub');
  body.classList.toggle('stage-none', stage === 'none');
  window.__cawiStage = stage;

  // Selaraskan mode untuk reuse logika existing (tanpa reset navigasi P).
  if (stage === 'l' && typeof setFormMode === 'function' && (typeof getFormMode !== 'function' || getFormMode() !== 'l')) {
    setFormMode('l');
  } else if (stage === 'lub' && typeof setFormMode === 'function' && (typeof getFormMode !== 'function' || getFormMode() !== 'lub')) {
    setFormMode('lub');
  }
  // Pastikan class unified tidak ikut hilang saat applyFormMode jalan.
  body.classList.add('mode-unified');

  // L.KP nested (q10a=2) hanya relevan saat stage lub — biarkan
  // updateSidebarLKP existing yang mengatur #sidebarLKPGroup.
  if (typeof updateProgress === 'function') updateProgress();
  _renderStageHint(stage);
  return stage;
}

/* Tampilkan/ubah teks petunjuk lanjutan di Blok P. */
function _renderStageHint(stage) {
  var el = document.getElementById('pmt_stage_hint');
  if (!el) return;
  var msg;
  if (stage === 'l')        msg = 'Lanjutkan ke kuesioner <b>SE2026-L</b> (keluarga &amp; usaha rumah tangga).';
  else if (stage === 'lub') msg = 'Lanjutkan ke kuesioner <b>SE2026-L.UB</b> (usaha/perusahaan besar).';
  else                      msg = 'Bangunan ini cukup dilisting pada Blok P (tidak ada kuesioner lanjutan).';
  el.innerHTML = msg;
  el.classList.toggle('stage-hint-none', stage === 'none');
}

/* Handler input field penentu — dipanggil dari oninput/onchange Blok P. */
function handlePmtKodeBangunan() { refreshDynamicSidebar(); if (typeof scheduleAutosave === 'function') scheduleAutosave(); }
function handlePmtJmlUsaha()     { refreshDynamicSidebar(); if (typeof scheduleAutosave === 'function') scheduleAutosave(); }
function handlePmtSkala()        { refreshDynamicSidebar(); if (typeof scheduleAutosave === 'function') scheduleAutosave(); }

/* ---- Geotag Blok P (pmt_lat/lng/akurasi) ----
 * Ringan & self-contained (tidak menyentuh map.js milik L.UB).
 * Map visual menyusul di finalisasi geotag (Fase 4).
 */
function ambilLokasiP() {
  var btn = document.getElementById('pmtLokasiBtn');
  var res = document.getElementById('pmtLokasiResult');
  if (!navigator.geolocation) { if (res) res.textContent = 'GPS tidak didukung perangkat ini.'; return; }
  if (res) res.textContent = 'Mengambil lokasi…';
  navigator.geolocation.getCurrentPosition(function (pos) {
    var lat = pos.coords.latitude.toFixed(7);
    var lng = pos.coords.longitude.toFixed(7);
    var akr = Math.round(pos.coords.accuracy);
    _pSet('pmt_lat', lat); _pSet('pmt_lng', lng); _pSet('pmt_akurasi', akr);
    if (res) res.innerHTML = '📍 ' + lat + ', ' + lng + ' <span class="lokasi-akurasi">(±' + akr + ' m)</span>';
    if (btn) { btn.dataset.done = '1'; btn.style.background = '#276749'; }
    if (typeof scheduleAutosave === 'function') scheduleAutosave();
    if (typeof updateProgress === 'function') updateProgress();
  }, function (err) {
    if (res) res.textContent = 'Gagal mengambil lokasi: ' + (err && err.message ? err.message : 'tidak diketahui');
  }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
}

function _pSet(id, val) {
  var el = document.getElementById(id);
  if (el) el.value = val;
}

/* ---- Prelist seeding (G-3: wilayah + nama + skala) ----
 * Dipanggil saat assignment unified pertama dibuka (data dari GAS getPrelist).
 * Hanya mengisi field yang masih kosong agar tidak menimpa isian/draft.
 */
function seedPrelistP(entry) {
  if (!entry || typeof entry !== 'object') return;
  var map = {
    pmt_nama:   entry.nama,
    pmt_skala:  entry.skala,
    pmt_idsbr:  entry.idsbr,
    pmt_jalan:  entry.alamat,
    pmt_no_kel: entry.no_urut
  };
  Object.keys(map).forEach(function (id) {
    var v = map[id];
    if (v == null || v === '') return;
    var el = document.getElementById(id);
    if (el && !String(el.value || '').trim()) el.value = v;
  });
  refreshDynamicSidebar();
}

/* Navigasi ke Blok P (panel #blokP1). Dipakai sidebar grup .sb-p. */
function goBlokP() {
  // Simpan dulu isian blok saat ini (persist ke draft assignment).
  try { if (typeof saveDraft === 'function') saveDraft(); } catch (e) {}
  var panels = document.querySelectorAll('.blok-panel');
  for (var i = 0; i < panels.length; i++) panels[i].classList.remove('active');
  var tabs = document.querySelectorAll('.sidebar-item');
  for (var j = 0; j < tabs.length; j++) tabs[j].classList.remove('active');
  var panel = document.getElementById('blokP1');
  if (panel) panel.classList.add('active');
  var tab = document.getElementById('sidebarTabP');
  if (tab) tab.classList.add('active');
  var kop = document.getElementById('headerKop');
  if (kop) kop.classList.add('kop-hidden');
  if (typeof updateProgress === 'function') updateProgress();
  if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  if (typeof closeSidebar === 'function') closeSidebar();
}

/* ---- Init ---- */
function initFormP() {
  if (!isUnifiedMode()) return;
  // Hitung stage awal (mis. dari draft yang sudah berisi pmt_kode_bangunan).
  refreshDynamicSidebar();
}

// Ekspor ke window (non-module; dipakai inline handler & init).
if (typeof window !== 'undefined') {
  window.PMT_GATE_RULES       = PMT_GATE_RULES;
  window.computeStageFromP    = computeStageFromP;
  window.refreshDynamicSidebar = refreshDynamicSidebar;
  window.handlePmtKodeBangunan = handlePmtKodeBangunan;
  window.handlePmtJmlUsaha    = handlePmtJmlUsaha;
  window.handlePmtSkala       = handlePmtSkala;
  window.ambilLokasiP         = ambilLokasiP;
  window.seedPrelistP         = seedPrelistP;
  window.initFormP            = initFormP;
  window.isUnifiedMode        = isUnifiedMode;
  window.goBlokP              = goBlokP;
}
