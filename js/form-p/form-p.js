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
 * Model leburan (L & L.UB jadi satu form L; usaha besar pun masuk L usaha):
 *   kode 1–8 (panduan SE2026-P):
 *     1 Khusus Usaha · 2 Campuran · 3 Tempat Tinggal · 4 Ibadah/Organisasi
 *     5 Kantor Pemerintah & Konsulat · 6 Tidak dicakup · 7 Virtual Office · 8 Panti/Lapas
 *   - 2 (campuran) / 3 (tempat tinggal) = KELUARGA → kuesioner L keluarga + usaha
 *   - 1 (khusus usaha) / 7 (virtual office) = USAHA → kuesioner L usaha saja
 *   - 4 / 5 / 6 / 8 = tidak ada kuesioner lanjutan (cukup listing Blok P)
 * skala (UMKM/UB) tidak lagi menentukan stage — usaha besar tetap ke L usaha.
 * Return: 'none' | 'keluarga' | 'usaha'  (pure function — diuji unit).
 */
function PMT_GATE_RULES(kode, jmlUsaha, skala) {
  var k = String(kode == null ? '' : kode).trim();
  switch (k) {
    case '2':                 // Campuran (tempat tinggal + usaha)
    case '3':                 // Tempat tinggal
      return 'keluarga';
    case '1':                 // Khusus tempat usaha
    case '7':                 // Kantor virtual (virtual office)
      return 'usaha';
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
  var isL = (stage === 'keluarga' || stage === 'usaha');
  body.classList.toggle('stage-keluarga', stage === 'keluarga');
  body.classList.toggle('stage-usaha',    stage === 'usaha');
  body.classList.toggle('stage-none',     stage === 'none');
  window.__cawiStage = stage;
  // Cakupan kuesioner L: 'usaha' = hanya Blok II (usaha), 'full' = keluarga+usaha.
  // Dibaca oleh validasi/progres L agar field keluarga tak diwajibkan saat usaha-saja.
  window.__cawiLScope = (stage === 'usaha') ? 'usaha' : 'full';

  // Keluarga & usaha sama-sama pakai form L (L.UB sudah dilebur ke Blok II usaha).
  if (isL && typeof setFormMode === 'function' && (typeof getFormMode !== 'function' || getFormMode() !== 'l')) {
    setFormMode('l');
  }
  // Pastikan class unified tidak ikut hilang saat applyFormMode jalan.
  body.classList.add('mode-unified');

  // Stage usaha-saja: paksa navigasi ke Blok II (usaha) bila sedang di blok keluarga.
  if (stage === 'usaha' && typeof goBlok === 'function') {
    var activePanel = document.querySelector('.blok-panel.active');
    if (activePanel && /^blokL[1345]$/.test(activePanel.id)) goBlok(2);
  }

  if (typeof updateProgress === 'function') updateProgress();
  _renderStageHint(stage);
  return stage;
}

/* Tampilkan/ubah teks petunjuk lanjutan di Blok P. */
function _renderStageHint(stage) {
  var el = document.getElementById('pmt_stage_hint');
  if (!el) return;
  var msg;
  if (stage === 'keluarga')   msg = 'Lanjutkan ke kuesioner <b>L — Keluarga &amp; Usaha</b> (anggota keluarga + usaha rumah tangga).';
  else if (stage === 'usaha') msg = 'Lanjutkan ke kuesioner <b>L — Usaha saja</b> (bangunan bukan tempat tinggal; cukup data usaha).';
  else                        msg = 'Bangunan ini cukup dilisting pada Blok P (tidak ada kuesioner lanjutan).';
  el.innerHTML = msg;
  el.classList.toggle('stage-hint-none', stage === 'none');
}

/* Cermin nilai radio Kode Penggunaan Bangunan → select tersembunyi #pmt_kode_bangunan
 * supaya getVal('pmt_kode_bangunan') (gate/validasi/collect) tetap bekerja. */
function _syncPmtKodeFromRadio() {
  var r = document.querySelector('input[name="pmt_kode_bangunan_r"]:checked');
  var sel = document.getElementById('pmt_kode_bangunan');
  if (sel) sel.value = r ? r.value : '';
}
/* Sebaliknya: set radio dari nilai select (saat restore draft yang menyimpan select). */
function _syncPmtRadioFromKode() {
  var sel = document.getElementById('pmt_kode_bangunan');
  var v = sel ? String(sel.value || '') : '';
  if (!v) return;
  var r = document.querySelector('input[name="pmt_kode_bangunan_r"][value="' + v + '"]');
  if (r) r.checked = true;
}

/* Handler input field penentu — dipanggil dari oninput/onchange Blok P. */
function handlePmtKodeBangunan() { _syncPmtKodeFromRadio(); refreshDynamicSidebar(); if (typeof scheduleAutosave === 'function') scheduleAutosave(); }
function handlePmtJmlUsaha()     { refreshDynamicSidebar(); if (typeof scheduleAutosave === 'function') scheduleAutosave(); }
function handlePmtSkala()        { refreshDynamicSidebar(); if (typeof scheduleAutosave === 'function') scheduleAutosave(); }

/* Jenis entitas: 1=Keluarga, 2=Bangunan lainnya. Toggle field khusus keluarga
 * (.pmt-keluarga-only) via body class + sesuaikan label nama/keberadaan. */
function handlePmtJenisEntitas() {
  var r = document.querySelector('input[name="pmt_jenis_entitas"]:checked');
  var v = r ? r.value : '';
  var isBangunan = (v === '2');
  document.body.classList.toggle('pmt-bangunan', isBangunan);
  var namaLbl = document.getElementById('pmt_nama_label');
  if (namaLbl) namaLbl.innerHTML = (isBangunan ? 'Nama Usaha / Bangunan' : 'Nama Kepala Keluarga') + ' <span class="req">*</span>';
  var kebLbl = document.getElementById('pmt_keberadaan_label');
  if (kebLbl) kebLbl.innerHTML = (isBangunan ? 'Keberadaan Bangunan' : 'Keberadaan Keluarga') + ' <span class="req">*</span>';
  if (typeof scheduleAutosave === 'function') scheduleAutosave();
}

/* ---- Geotag Blok P (pmt_lat/lng/akurasi) ----
 * Ringan & self-contained (tidak menyentuh map.js milik L.UB).
 * Map visual menyusul di finalisasi geotag (Fase 4).
 */
function ambilLokasiP() {
  var btn = document.getElementById('pmtLokasiBtn');
  var res = document.getElementById('pmtLokasiResult');
  var txt = btn ? btn.querySelector('.geo-btn-text') : null;
  if (!navigator.geolocation) { if (res) res.textContent = 'GPS tidak didukung perangkat ini.'; return; }
  if (res) res.textContent = 'Mengambil lokasi…';
  if (txt) txt.textContent = 'Mengambil…';
  navigator.geolocation.getCurrentPosition(function (pos) {
    var lat = pos.coords.latitude.toFixed(7);
    var lng = pos.coords.longitude.toFixed(7);
    var akr = Math.round(pos.coords.accuracy);
    _pSet('pmt_lat', lat); _pSet('pmt_lng', lng); _pSet('pmt_akurasi', akr);
    if (res) { res.classList.add('done'); res.innerHTML = '📍 ' + lat + ', ' + lng + ' &nbsp;(±' + akr + ' m)'; }
    if (btn) { btn.dataset.done = '1'; btn.classList.add('done'); }
    if (txt) txt.textContent = 'Perbarui Lokasi ✓';
    if (typeof scheduleAutosave === 'function') scheduleAutosave();
    if (typeof updateProgress === 'function') updateProgress();
  }, function (err) {
    if (res) { res.classList.remove('done'); res.textContent = 'Gagal mengambil lokasi: ' + (err && err.message ? err.message : 'tidak diketahui'); }
    if (txt) txt.textContent = 'Ambil Lokasi GPS';
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

/* Isi tampilan Identitas Wilayah (readonly) dari assignment aktif.
 * SLS & SubSLS ditampilkan terpisah agar lebih bersih. */
function _fillPWilayah(a) {
  a = a || (typeof window !== 'undefined' && window.__cawiActiveAssignment) || {};
  var lbl = (typeof _wilLabel === 'function')
    ? _wilLabel
    : function (lv, full, nama) { return nama || '—'; };
  var set = function (id, txt) { var el = document.getElementById(id); if (el) el.textContent = txt || '—'; };
  set('pmt_w_prov', lbl('prov', a.provinsi_kd, a.provinsi));
  set('pmt_w_kab',  lbl('kab',  a.kabupaten_kd, a.kabupaten));
  set('pmt_w_kec',  lbl('kec',  a.kecamatan_kd, a.kecamatan));
  set('pmt_w_desa', lbl('desa', a.desa_kd, a.desa));
  var sls = a.sls_nama ? ('[' + (a.sls_kd || '----') + '] ' + a.sls_nama) : (a.sls_kd ? ('[' + a.sls_kd + ']') : '—');
  set('pmt_w_sls', sls);
  var sub = a.subsls_kd || '00';
  set('pmt_w_subsls', sub === '00' ? '00 (SLS tidak terbagi)' : sub);
}

/* Prefill (readonly) nomor urut keluarga & bangunan TERBESAR yang sudah ada di
 * SubSLS ini — referensi untuk pengisian nomor urut berikutnya. Sumber: getPRecords
 * (GAS), difilter per kelurahan+SLS+SubSLS. Best-effort (gagal → biarkan kosong). */
function _prefillNoUrutMax(a) {
  a = a || (typeof window !== 'undefined' && window.__cawiActiveAssignment) || {};
  var setMax = function (id, v) { var el = document.getElementById(id); if (el) el.value = (v > 0 ? String(v) : ''); };
  var urlFn = (typeof getScriptUrl === 'function') ? getScriptUrl : null;
  if (!urlFn) return;
  try {
    fetch(urlFn(), { method: 'POST', body: JSON.stringify({ action: 'getPRecords' }) })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (!j || j.status !== 'ok' || j.kind !== 'precords' || !Array.isArray(j.data)) return;
        var maxKel = 0, maxBgn = 0;
        j.data.forEach(function (rec) {
          // Cocokkan SubSLS: kelurahan + SLS (+ subsls bila ada di record)
          var sameDesa = !a.desa_kd || String(rec.kelurahan_kd || '') === String(a.desa_kd);
          var sameSls  = !a.sls_kd  || String(rec.kode_sls || '') === String(a.sls_kd);
          var sameSub  = (rec.pmt_subsls == null || a.subsls_kd == null) ? true
                       : String(rec.pmt_subsls) === String(a.subsls_kd);
          if (!(sameDesa && sameSls && sameSub)) return;
          var k = parseInt(rec.pmt_no_kel, 10); if (!isNaN(k) && k > maxKel) maxKel = k;
          var b = parseInt(rec.pmt_no_bgn, 10); if (!isNaN(b) && b > maxBgn) maxBgn = b;
        });
        setMax('pmt_no_kel_max', maxKel);
        setMax('pmt_no_bgn_max', maxBgn);
      })
      .catch(function () {});
  } catch (e) {}
}

/* ---- Init ---- */
function initFormP() {
  if (!isUnifiedMode()) return;
  _fillPWilayah();
  // Restore: selaraskan radio kode bangunan & toggle jenis entitas dari draft.
  _syncPmtRadioFromKode();
  _syncPmtKodeFromRadio();
  if (typeof handlePmtJenisEntitas === 'function') handlePmtJenisEntitas();
  // Hitung stage awal (mis. dari draft yang sudah berisi pmt_kode_bangunan).
  refreshDynamicSidebar();
  // Prefill referensi nomor urut terbesar (async, best-effort).
  _prefillNoUrutMax();
}

// Ekspor ke window (non-module; dipakai inline handler & init).
if (typeof window !== 'undefined') {
  window.PMT_GATE_RULES       = PMT_GATE_RULES;
  window.computeStageFromP    = computeStageFromP;
  window.refreshDynamicSidebar = refreshDynamicSidebar;
  window.handlePmtKodeBangunan = handlePmtKodeBangunan;
  window.handlePmtJmlUsaha    = handlePmtJmlUsaha;
  window.handlePmtSkala       = handlePmtSkala;
  window.handlePmtJenisEntitas = handlePmtJenisEntitas;
  window._fillPWilayah        = _fillPWilayah;
  window.ambilLokasiP         = ambilLokasiP;
  window.seedPrelistP         = seedPrelistP;
  window.initFormP            = initFormP;
  window.isUnifiedMode        = isUnifiedMode;
  window.goBlokP              = goBlokP;
}
