/* ====== L FORM HANDLERS ====== */

/* --- L1 Anggota Roster --- */

// Jumlah anggota saat ini (sinkron dengan #l1_jml_kk_anggota hidden input)
function _getAnggotaCount() {
  const el = document.getElementById('l1_jml_kk_anggota');
  return el ? (parseInt(el.value) || 0) : 0;
}
function _setAnggotaCount(n) {
  const el = document.getElementById('l1_jml_kk_anggota');
  if (el) el.value = n;
}

// Pastikan card untuk anggota ke-i ada di pool (buat jika belum ada)
function _ensureAnggotaCard(i) {
  if (document.getElementById('l_ang_card_' + i)) return;
  const pool = document.getElementById('anggota-pool');
  if (!pool) return;
  pool.insertAdjacentHTML('beforeend', anggotaCardHTML(i));
  initAnggotaSearchable(i);
}

// Tambah anggota baru ke roster
function addAnggota() {
  const current = _getAnggotaCount();
  if (current >= 30) { alert('Maksimal 30 anggota keluarga.'); return; }
  const newIdx = current + 1;
  _setAnggotaCount(newIdx);
  _ensureAnggotaCard(newIdx);
  renderAnggotaRoster();
  updateSidebarAnggota(newIdx);
  updateJmlPendataan();
  if (typeof updateProgress === 'function') updateProgress();
  // Langsung buka form detail anggota baru
  if (typeof showAngDetailScreen === 'function') showAngDetailScreen(newIdx);
  if (typeof saveDraft === 'function') saveDraft(); // persist daftar roster segera
}

// Hapus anggota ke-i dan geser indeks
function deleteAnggota(i) {
  const total = _getAnggotaCount();
  if (!confirm('Hapus anggota ke-' + i + '? Data yang sudah diisi akan hilang.')) return;
  // Shift data dari i+1..total ke i..total-1
  for (let j = i; j < total; j++) {
    _shiftAnggotaFields(j + 1, j);
  }
  // Hapus card terakhir dari pool
  const lastCard = document.getElementById('l_ang_card_' + total);
  if (lastCard) lastCard.remove();
  _setAnggotaCount(total - 1);
  renderAnggotaRoster();
  updateSidebarAnggota(total - 1);
  updateJmlPendataan();
  if (typeof updateProgress === 'function') updateProgress();
  if (typeof saveDraft === 'function') saveDraft(); // persist daftar roster segera
}

// Copy semua field dari anggota `src` ke anggota `dst`
function _shiftAnggotaFields(src, dst) {
  _ensureAnggotaCard(dst);
  const fieldsTxt = ['nama','nik','hubungan','alamat_dom_note','dn_provinsi','dn_kab','ln_negara','tgl_lahir','profesi','kronis_q_lain','18a_nilai','18b_nilai','18c_nilai'];
  fieldsTxt.forEach(f => {
    const s = document.getElementById('l_ang_' + src + '_' + f);
    const d = document.getElementById('l_ang_' + dst + '_' + f);
    if (s && d) { d.value = s.value; s.value = ''; }
  });
  // Selects
  ['hubungan','dn_provinsi'].forEach(f => {
    const s = document.getElementById('l_ang_' + src + '_' + f);
    const d = document.getElementById('l_ang_' + dst + '_' + f);
    if (s && d) { d.value = s.value; s.value = ''; }
  });
  // Radios
  const radioGroups = ['keberadaan','alamat_dom','kawin','jk','sekolah','ijazah','rekening','kedudukan','18a','18b','18c',
    'disab_a','disab_b','disab_c','disab_d','disab_e','disab_f',
    'kronis_a','kronis_b','kronis_c','kronis_d','kronis_e','kronis_f','kronis_g','kronis_h',
    'kronis_i','kronis_j','kronis_k','kronis_l','kronis_m','kronis_n','kronis_o','kronis_p'];
  radioGroups.forEach(g => {
    const srcVal = document.querySelector(`input[name="l_ang_${src}_${g}"]:checked`);
    const dstRadio = srcVal ? document.querySelector(`input[name="l_ang_${dst}_${g}"][value="${srcVal.value}"]`) : null;
    // Clear dst
    document.querySelectorAll(`input[name="l_ang_${dst}_${g}"]`).forEach(r => { r.checked = false; });
    if (dstRadio) { dstRadio.checked = true; dstRadio.dispatchEvent(new Event('change', {bubbles:true})); }
    // Clear src
    if (srcVal) { srcVal.checked = false; srcVal.dispatchEvent(new Event('change', {bubbles:true})); }
  });
  // Umur (readonly, dihitung dari tgl_lahir)
  if (typeof computeUmurAnggota === 'function') { computeUmurAnggota(dst); computeUmurAnggota(src); }
}

// Render satu baris roster (update jika sudah ada)
function renderAnggotaRosterRow(i) {
  const list = document.getElementById('l1_roster_list');
  if (!list) return;
  const existing = document.getElementById('l_ang_row_' + i);
  const html = _anggotaRosterRowHTML(i);
  if (existing) { existing.outerHTML = html; }
  else { list.insertAdjacentHTML('beforeend', html); }
}

// Render seluruh roster table
function renderAnggotaRoster() {
  const list = document.getElementById('l1_roster_list');
  const empty = document.getElementById('l1_roster_empty');
  const countEl = document.getElementById('l1_roster_count');
  if (!list) return;
  const n = _getAnggotaCount();
  list.innerHTML = '';
  for (let i = 1; i <= n; i++) {
    list.insertAdjacentHTML('beforeend', _anggotaRosterRowHTML(i));
  }
  if (empty) empty.style.display = n > 0 ? 'none' : '';
  if (countEl) countEl.textContent = n + ' anggota';
  // Selaraskan opsi "Pemberi Jawaban" (Blok V) tiap roster berubah.
  if (typeof _populateRespondenSelect === 'function') _populateRespondenSelect();
}

/* ---- Blok V: Pemberi Jawaban / Responden = pilih anggota keluarga atau orang lain ----
 * Select #l5_responden_pilih: value = nomor anggota (1..n) | "__luar__" | "".
 * Anggota → nama terisi otomatis dari Blok I & dikunci read-only.
 * Orang lain → field nama tampil & dapat diisi manual. (HP/email/tanggal tetap manual.) */
function _populateRespondenSelect() {
  const sel = document.getElementById('l5_responden_pilih');
  if (!sel) return;
  const prev = sel.value;
  const n = _getAnggotaCount();
  let html = '<option value="">— pilih anggota keluarga / orang lain —</option>';
  for (let i = 1; i <= Math.min(n, 30); i++) {
    const nama = getVal('l_ang_' + i + '_nama') || ('Anggota #' + i);
    html += '<option value="' + i + '">' + _sbEsc(nama) + (i === 1 ? ' (Kepala Keluarga)' : '') + '</option>';
  }
  html += '<option value="__luar__">Orang lain (bukan anggota keluarga)</option>';
  sel.innerHTML = html;
  if (prev) sel.value = prev;
}

function handleRespondenPilih() {
  const sel = document.getElementById('l5_responden_pilih');
  if (!sel) return;
  const namaInp = document.getElementById('l5_responden_nama');
  const v = sel.value;
  const isLuar = (v === '__luar__');
  const isMember = !!v && !isLuar;
  if (namaInp) namaInp.classList.toggle('hidden', !isLuar); // input manual hanya utk orang lain
  if (isMember) {
    if (namaInp) { namaInp.value = getVal('l_ang_' + parseInt(v, 10) + '_nama'); }
  } else if (!v) {
    if (namaInp) namaInp.value = ''; // belum dipilih → kosongkan
  }
  // isLuar: biarkan nilai l5_responden_nama apa adanya untuk diisi/diedit manual.
  if (typeof updateProgress === 'function') updateProgress();
}

function _anggotaRosterRowHTML(i) {
  const nama  = (document.getElementById('l_ang_' + i + '_nama') || {}).value || '';
  const hub   = (document.getElementById('l_ang_' + i + '_hubungan') || {});
  const hubTxt = hub.selectedIndex > 0 ? hub.options[hub.selectedIndex].text : '';
  const keb   = document.querySelector(`input[name="l_ang_${i}_keberadaan"]:checked`);
  const kebV  = keb ? keb.value : '';
  const STOP  = (kebV === '2' || kebV === '6' || kebV === '7');

  let statusCls, statusTxt;
  if (!nama && !kebV) { statusCls = 'chip-empty'; statusTxt = 'Belum diisi'; }
  else if (STOP)      { statusCls = 'chip-stop';  statusTxt = 'STOP'; }
  else if (!nama || !kebV || !document.querySelector(`input[name="l_ang_${i}_jk"]:checked`)) {
    statusCls = 'chip-partial'; statusTxt = 'Belum lengkap';
  } else { statusCls = 'chip-done'; statusTxt = 'Terisi'; }

  const isKK = (i === 1); // anggota #1 = Kepala Keluarga (otomatis, tidak dapat dihapus)
  const displayName = nama || (isKK ? 'Kepala Keluarga' : 'Anggota ke-' + i);
  const meta = [hubTxt, kebV ? 'Keberadaan: ' + kebV : ''].filter(Boolean).join(' · ');
  const delCtrl = isKK
    ? `<span class="roster-kk-lock" title="Kepala Keluarga — terisi otomatis">🔒</span>`
    : `<button class="btn-roster-del" type="button" title="Hapus anggota" aria-label="Hapus anggota ke-${i}" onclick="deleteAnggota(${i})">✕</button>`;
  return `<div class="roster-row" id="l_ang_row_${i}">
    <div class="roster-row-top">
      <div class="roster-no">${i}</div>
      <div class="roster-info">
        <div class="roster-name">${displayName}</div>
        <div class="roster-meta">${meta || 'Belum ada data'}</div>
      </div>
      <span class="status-chip ${statusCls}">${statusTxt}</span>
      ${delCtrl}
    </div>
    <button class="btn-roster-open" type="button" onclick="if(typeof showAngDetailScreen==='function')showAngDetailScreen(${i})">Buka detail anggota</button>
  </div>`;
}

// renderAnggotaCards dipanggil oleh draft.js — render semua ke pool lalu update roster
function renderAnggotaCards() {
  const n = _getAnggotaCount();
  if (n <= 0) {
    renderAnggotaRoster();
    updateSidebarAnggota(0);
    updateJmlPendataan();
    if (typeof updateProgress === 'function') updateProgress();
    return;
  }
  for (let i = 1; i <= n; i++) {
    _ensureAnggotaCard(i);
  }
  renderAnggotaRoster();
  updateSidebarAnggota(n);
  updateJmlPendataan();
  if (typeof updateProgress === 'function') updateProgress();
}

// Anggota #1 = Kepala Keluarga: otomatis dibuat saat roster masih kosong,
// hubungan dikunci ke "1" (Kepala Keluarga), namanya disinkron dari l1_nama_kk.
// Idempotent — aman dipanggil dari prefill, restore draft, maupun init.
function ensureKepalaKeluarga() {
  if (typeof getFormMode === 'function' && getFormMode() !== 'l') return;
  if (_getAnggotaCount() > 0) return; // sudah ada anggota (mis. dari draft)
  _setAnggotaCount(1);
  _ensureAnggotaCard(1);
  const hub = document.getElementById('l_ang_1_hubungan');
  if (hub) {
    hub.value = '1'; // 1 = Kepala Keluarga
    const inp = document.getElementById('l_ang_1_hubungan_inp');
    if (inp) {
      const opt = Array.prototype.find.call(hub.options, o => o.value === '1');
      if (opt) { inp.value = opt.text; inp.classList.add('has-value'); }
    }
    hub.dispatchEvent(new Event('change', { bubbles: true }));
  }
  syncKepalaKeluargaNama();
  renderAnggotaRoster();
  if (typeof updateSidebarAnggota === 'function') updateSidebarAnggota(1);
  if (typeof updateJmlPendataan === 'function') updateJmlPendataan();
  if (typeof updateProgress === 'function') updateProgress();
}

// Sinkron IDENTITAS anggota #1 (Kepala Keluarga): nama + NIK dari Blok I
// (yang di unified bersumber dari Blok P) selama hubungan anggota #1 masih
// "Kepala Keluarga". Dipanggil saat l1_nama_kk / l1_nik_kk berubah atau dari
// syncPIdentityToL (Blok P). Anggota #1 jadi read-only di unified (sumber tunggal).
function syncKepalaKeluargaIdentity() {
  const ang = document.getElementById('l_ang_1_nama');
  const hub = document.getElementById('l_ang_1_hubungan');
  if (!ang) return;
  if (hub && hub.value && hub.value !== '1') return; // anggota #1 bukan KK → jangan timpa
  const kk = document.getElementById('l1_nama_kk');
  if (kk) ang.value = kk.value;
  const kkNik  = document.getElementById('l1_nik_kk');
  const angNik = document.getElementById('l_ang_1_nik');
  if (kkNik && angNik) angNik.value = kkNik.value;
  _lockKKMemberFields();
  if (document.getElementById('l_ang_row_1')) renderAnggotaRosterRow(1);
  if (typeof updateAnggotaNamePreview === 'function') updateAnggotaNamePreview(1);
}
// Alias backward-compat (dipanggil dari oninput l1_nama_kk).
function syncKepalaKeluargaNama() { syncKepalaKeluargaIdentity(); }

// Anggota #1 = Kepala Keluarga: nama + NIK bersumber dari Blok P (unified) →
// jadikan read-only agar tidak diisi ganda. Mode legacy (non-unified): editable.
function _lockKKMemberFields() {
  const lock = !!(document.body && document.body.classList.contains('mode-unified'));
  ['l_ang_1_nama', 'l_ang_1_nik'].forEach(function (id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.readOnly = lock;
    el.classList.toggle('input-muted', lock);
    el.title = lock ? 'Diisi otomatis dari Blok P (Kepala Keluarga)' : '';
  });
}

/* ---- Foto Rumah (Blok III R19): kompres di klien → simpan data URL di hidden field ----
 * File input tak bisa dipulihkan dari draft, jadi hasil kompresi disimpan di hidden
 * (#<hiddenId>) yang ikut draft. Saat submit, GAS meng-upload base64 ini ke Drive. */
function handleFotoChange(input, hiddenId, previewId) {
  var file = input && input.files && input.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function (e) {
    var img = new Image();
    img.onload = function () {
      var maxDim = 1280;
      var w = img.width, h = img.height;
      if (w > h && w > maxDim) { h = Math.round(h * maxDim / w); w = maxDim; }
      else if (h >= w && h > maxDim) { w = Math.round(w * maxDim / h); h = maxDim; }
      var canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      var dataUrl = canvas.toDataURL('image/jpeg', 0.6);
      var hidden = document.getElementById(hiddenId);
      if (hidden) hidden.value = dataUrl;
      var prev = document.getElementById(previewId);
      if (prev) { prev.src = dataUrl; prev.style.display = 'block'; }
      if (typeof updateProgress === 'function') updateProgress();
      if (typeof saveDraft === 'function') saveDraft(); // persist foto segera
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

/* Pulihkan pratinjau foto dari hidden field (data URL) setelah draft di-restore. */
function restoreFotoPreviews() {
  [['l3_foto_depan_data', 'l3_foto_depan_prev'],
   ['l3_foto_ruang_tamu_data', 'l3_foto_ruang_tamu_prev']].forEach(function (pair) {
    var hidden = document.getElementById(pair[0]);
    var prev = document.getElementById(pair[1]);
    if (hidden && prev && hidden.value) { prev.src = hidden.value; prev.style.display = 'block'; }
  });
}

function initAnggotaSearchable(i) {
  if (typeof makeSearchable !== 'function') return;
  makeSearchable(`l_ang_${i}_hubungan`, 'hubungan keluarga');
  makeSearchable(`l_ang_${i}_profesi`, 'profesi/pekerjaan');
  makeSearchable(`l_ang_${i}_dn_provinsi`, 'provinsi pindah');
}

function anggotaCardHTML(i) {
  const profesiOpts = (typeof STATIC_PROFESI !== 'undefined' ? STATIC_PROFESI : [])
    .map(p => `<option value="${p.kode}">${p.kode}. ${p.nama}</option>`).join('');
  const provOpts = (typeof STATIC_PROVINSI !== 'undefined' ? STATIC_PROVINSI : [])
    .map(p => `<option value="${p.kode}">${p.nama}</option>`).join('');
  return `
<div class="anggota-card" id="l_ang_card_${i}">
  <div class="anggota-header" onclick="toggleAnggotaCard(${i})">
    <div class="anggota-header-name">
      <span>Anggota #${i}</span>
      <span id="l_ang_${i}_name_preview" style="color:#666;font-weight:500;font-size:12.5px"></span>
      <span id="l_ang_${i}_stop_badge" class="anggota-stop-badge" style="display:none">STOP</span>
    </div>
    <span id="l_ang_toggle_${i}">&#9660;</span>
  </div>
  <div class="anggota-body" id="l_ang_body_${i}">
    <div class="anggota-ctx-bar"><span class="anggota-ctx-label">Anggota ke-${i}:</span><span id="l_ang_${i}_ctx_nama" class="anggota-ctx-nama">&nbsp;(nama belum diisi)</span></div>
    <div class="anggota-subsection-label">A. Identitas (r5-r13)</div>
    <div class="inline-fields">
      <div class="form-group">
        <label class="field-label">5. Nomor Urut</label>
        <input type="text" class="input-muted" readonly value="${i}"/>
      </div>
      <div class="form-group" style="flex:2">
        <label class="field-label">6. Nama Anggota <span class="req">*</span></label>
        <input type="text" id="l_ang_${i}_nama" placeholder="Nama lengkap" oninput="updateAnggotaNamePreview(${i});updateJmlPendataan()"/>
      </div>
      <div class="form-group" style="flex:2">
        <label class="field-label">7. NIK</label>
        <input type="text" id="l_ang_${i}_nik" maxlength="16" placeholder="16 digit NIK"/>
      </div>
    </div>
    <div class="form-group">
      <label class="field-label">8. Hubungan dengan Kepala Keluarga <span class="req">*</span></label>
      <select id="l_ang_${i}_hubungan">
        <option value="">-- Pilih --</option>
        <option value="1">1. Kepala Keluarga</option>
        <option value="2">2. Istri/Suami</option>
        <option value="3">3. Anak</option>
        <option value="4">4. Menantu</option>
        <option value="5">5. Cucu</option>
        <option value="6">6. Orang Tua</option>
        <option value="7">7. Mertua</option>
        <option value="8">8. Famili</option>
        <option value="9">9. Lainnya</option>
      </select>
    </div>
    <div class="form-group">
      <label class="field-label">9a. Keberadaan Anggota <span class="req">*</span></label>
      <div class="radio-group">
        <label class="radio-item"><input type="radio" name="l_ang_${i}_keberadaan" value="1" onchange="handleKeberadaanAnggota(${i})"/> <span>1. Tinggal di rumah ini</span></label>
        <label class="radio-item"><input type="radio" name="l_ang_${i}_keberadaan" value="2" onchange="handleKeberadaanAnggota(${i})"/> <span>2. Meninggal (STOP)</span></label>
        <label class="radio-item"><input type="radio" name="l_ang_${i}_keberadaan" value="3" onchange="handleKeberadaanAnggota(${i})"/> <span>3. Pindah dalam negeri</span></label>
        <label class="radio-item"><input type="radio" name="l_ang_${i}_keberadaan" value="4" onchange="handleKeberadaanAnggota(${i})"/> <span>4. Pindah luar negeri</span></label>
        <label class="radio-item"><input type="radio" name="l_ang_${i}_keberadaan" value="5" onchange="handleKeberadaanAnggota(${i})"/> <span>5. Anggota baru</span></label>
        <label class="radio-item"><input type="radio" name="l_ang_${i}_keberadaan" value="6" onchange="handleKeberadaanAnggota(${i})"/> <span>6. Pisah KK (STOP)</span></label>
        <label class="radio-item"><input type="radio" name="l_ang_${i}_keberadaan" value="7" onchange="handleKeberadaanAnggota(${i})"/> <span>7. Tidak ditemukan (STOP)</span></label>
      </div>
    </div>

    <div class="anggota-after-r9">
    <div class="form-group hidden" id="l_ang_${i}_alamat_dom_wrap">
      <label class="field-label">9b. Alamat domisili <span class="req">*</span></label>
      <div class="radio-group">
        <label class="radio-item"><input type="radio" name="l_ang_${i}_alamat_dom" value="1"/> <span>1. Sesuai KK &amp; KTP</span></label>
        <label class="radio-item"><input type="radio" name="l_ang_${i}_alamat_dom" value="2"/> <span>2. Hanya sesuai KK</span></label>
        <label class="radio-item"><input type="radio" name="l_ang_${i}_alamat_dom" value="3"/> <span>3. Hanya sesuai KTP</span></label>
        <label class="radio-item"><input type="radio" name="l_ang_${i}_alamat_dom" value="4"/> <span>4. Tidak sesuai KK &amp; KTP</span></label>
      </div>
    </div>
    <div class="hidden" id="l_ang_${i}_dn_wrap">
      <div class="form-group">
        <label class="field-label">10DN.a. Provinsi domisili</label>
        <select id="l_ang_${i}_dn_provinsi" onchange="handleDnProvinsiAnggota(${i})">
          <option value="">-- Pilih --</option>
          ${provOpts}
        </select>
      </div>
      <div class="form-group">
        <label class="field-label">10DN.b. Kab/Kota domisili</label>
        <select id="l_ang_${i}_dn_kab" disabled>
          <option value="">-- Pilih Provinsi dulu --</option>
        </select>
      </div>
    </div>
    <div class="form-group hidden" id="l_ang_${i}_ln_wrap">
      <label class="field-label">10LN. Negara domisili</label>
      <input type="text" id="l_ang_${i}_ln_negara" placeholder="Nama negara"/>
    </div>
    <div class="form-group">
      <label class="field-label">11. Status Perkawinan <span class="req">*</span></label>
      <div class="radio-group">
        <label class="radio-item"><input type="radio" name="l_ang_${i}_kawin" value="1"/> <span>1. Belum kawin</span></label>
        <label class="radio-item"><input type="radio" name="l_ang_${i}_kawin" value="2"/> <span>2. Kawin/nikah</span></label>
        <label class="radio-item"><input type="radio" name="l_ang_${i}_kawin" value="3"/> <span>3. Cerai hidup</span></label>
        <label class="radio-item"><input type="radio" name="l_ang_${i}_kawin" value="4"/> <span>4. Cerai mati</span></label>
      </div>
    </div>
    <div class="form-group">
      <label class="field-label">12. Jenis Kelamin <span class="req">*</span></label>
      <div class="radio-group">
        <label class="radio-item"><input type="radio" name="l_ang_${i}_jk" value="1"/> <span>1. Laki-laki</span></label>
        <label class="radio-item"><input type="radio" name="l_ang_${i}_jk" value="2"/> <span>2. Perempuan</span></label>
      </div>
    </div>
    <div class="inline-fields">
      <div class="form-group">
        <label class="field-label">13a. Tanggal Lahir <span class="req">*</span></label>
        <input type="date" id="l_ang_${i}_tgl_lahir" onchange="computeUmurAnggota(${i})"/>
      </div>
      <div class="form-group">
        <label class="field-label">13b. Umur (autofill)</label>
        <input type="number" id="l_ang_${i}_umur" class="input-muted" readonly placeholder="—"/>
      </div>
    </div>

    <div class="anggota-subsection-label">B. Sosial Ekonomi (r14-r21)</div>
    <div id="l_ang_${i}_sosek5plus_wrap">
      <div class="form-group">
        <label class="field-label">14. Partisipasi sekolah (≥5 thn) <span class="req">*</span></label>
        <div class="radio-group">
          <label class="radio-item"><input type="radio" name="l_ang_${i}_sekolah" value="0" onchange="handleSekolahAnggota(${i})"/> <span>0. Tidak/belum pernah</span></label>
          <label class="radio-item"><input type="radio" name="l_ang_${i}_sekolah" value="1" onchange="handleSekolahAnggota(${i})"/> <span>1. Masih sekolah</span></label>
          <label class="radio-item"><input type="radio" name="l_ang_${i}_sekolah" value="2" onchange="handleSekolahAnggota(${i})"/> <span>2. Tidak bersekolah lagi</span></label>
        </div>
      </div>
      <div id="l_ang_${i}_ijazah_wrap">
      <div class="form-group">
        <label class="field-label">15. Ijazah Tertinggi (≥5 thn) <span class="req">*</span></label>
        <div class="radio-group">
          <label class="radio-item"><input type="radio" name="l_ang_${i}_ijazah" value="0"/> <span>0. Tidak punya ijazah SD</span></label>
          <label class="radio-item"><input type="radio" name="l_ang_${i}_ijazah" value="1"/> <span>1. SD/sederajat</span></label>
          <label class="radio-item"><input type="radio" name="l_ang_${i}_ijazah" value="2"/> <span>2. SMP/sederajat</span></label>
          <label class="radio-item"><input type="radio" name="l_ang_${i}_ijazah" value="3"/> <span>3. SMA/sederajat</span></label>
          <label class="radio-item"><input type="radio" name="l_ang_${i}_ijazah" value="4"/> <span>4. D1/D2/D3</span></label>
          <label class="radio-item"><input type="radio" name="l_ang_${i}_ijazah" value="5"/> <span>5. D4/S1/Profesi</span></label>
          <label class="radio-item"><input type="radio" name="l_ang_${i}_ijazah" value="6"/> <span>6. S2/S3</span></label>
        </div>
      </div>
      </div>
    </div>
    <div id="l_ang_${i}_sosek10plus_wrap">
      <div class="form-group">
        <label class="field-label">16. Profesi Pekerjaan Utama (≥10 thn) <span class="req">*</span></label>
        <select id="l_ang_${i}_profesi" onchange="handleProfesiAnggota(${i})">
          <option value="">-- Pilih --</option>
          ${profesiOpts}
        </select>
      </div>
      <div id="l_ang_${i}_kedudukan_wrap">
      <div class="form-group">
        <label class="field-label">17. Status Kedudukan (≥10 thn) <span class="req">*</span></label>
        <div class="radio-group">
          <label class="radio-item"><input type="radio" name="l_ang_${i}_kedudukan" value="1"/> <span>1. Berusaha sendiri</span></label>
          <label class="radio-item"><input type="radio" name="l_ang_${i}_kedudukan" value="2"/> <span>2. Berusaha dibantu buruh</span></label>
          <label class="radio-item"><input type="radio" name="l_ang_${i}_kedudukan" value="3"/> <span>3. Buruh/karyawan/swasta</span></label>
          <label class="radio-item"><input type="radio" name="l_ang_${i}_kedudukan" value="4"/> <span>4. ASN/TNI/Polri/BUMN/BUMD</span></label>
          <label class="radio-item"><input type="radio" name="l_ang_${i}_kedudukan" value="5"/> <span>5. Pekerja bebas</span></label>
          <label class="radio-item"><input type="radio" name="l_ang_${i}_kedudukan" value="6"/> <span>6. Pekerja keluarga/tidak dibayar</span></label>
          <label class="radio-item"><input type="radio" name="l_ang_${i}_kedudukan" value="9"/> <span>9. Tidak tahu</span></label>
        </div>
      </div>
      </div>
      <div class="form-group">
        <label class="field-label">18a. Pendapatan dari Pekerjaan <span style="font-weight:400;color:#666">(per bulan)</span> <span class="req">*</span></label>
        <div class="radio-group">
          <label class="radio-item"><input type="radio" name="l_ang_${i}_18a" value="1" onchange="handlePendapatanAnggota(${i},'18a')"/> <span>1. Ya</span></label>
          <label class="radio-item"><input type="radio" name="l_ang_${i}_18a" value="2" onchange="handlePendapatanAnggota(${i},'18a')"/> <span>2. Tidak</span></label>
          <label class="radio-item"><input type="radio" name="l_ang_${i}_18a" value="9" onchange="handlePendapatanAnggota(${i},'18a')"/> <span>9. Tidak tahu</span></label>
        </div>
        <div class="hidden" id="l_ang_${i}_18a_nilai_wrap">
          <div class="currency-input-wrap" style="margin-top:8px"><span class="currency-prefix">Rp</span>
            <input type="text" id="l_ang_${i}_18a_nilai" class="currency-field" oninput="formatCurrency(this)" placeholder="0"/>
          </div>
        </div>
      </div>
      <div class="form-group">
        <label class="field-label">18b. Pendapatan Keuntungan Usaha <span style="font-weight:400;color:#666">(per bulan)</span> <span class="req">*</span></label>
        <div class="radio-group">
          <label class="radio-item"><input type="radio" name="l_ang_${i}_18b" value="1" onchange="handlePendapatanAnggota(${i},'18b')"/> <span>1. Ya</span></label>
          <label class="radio-item"><input type="radio" name="l_ang_${i}_18b" value="2" onchange="handlePendapatanAnggota(${i},'18b')"/> <span>2. Tidak</span></label>
          <label class="radio-item"><input type="radio" name="l_ang_${i}_18b" value="9" onchange="handlePendapatanAnggota(${i},'18b')"/> <span>9. Tidak tahu</span></label>
        </div>
        <div class="hidden" id="l_ang_${i}_18b_nilai_wrap">
          <div class="currency-input-wrap" style="margin-top:8px"><span class="currency-prefix">Rp</span>
            <input type="text" id="l_ang_${i}_18b_nilai" class="currency-field" oninput="formatCurrency(this)" placeholder="0"/>
          </div>
        </div>
      </div>
      <div class="form-group">
        <label class="field-label">18c. Penerimaan Transfer/Passive (pensiun, kupon SBN) <span style="font-weight:400;color:#666">(per bulan)</span> <span class="req">*</span></label>
        <div class="radio-group">
          <label class="radio-item"><input type="radio" name="l_ang_${i}_18c" value="1" onchange="handlePendapatanAnggota(${i},'18c')"/> <span>1. Ya</span></label>
          <label class="radio-item"><input type="radio" name="l_ang_${i}_18c" value="2" onchange="handlePendapatanAnggota(${i},'18c')"/> <span>2. Tidak</span></label>
          <label class="radio-item"><input type="radio" name="l_ang_${i}_18c" value="9" onchange="handlePendapatanAnggota(${i},'18c')"/> <span>9. Tidak tahu</span></label>
        </div>
        <div class="hidden" id="l_ang_${i}_18c_nilai_wrap">
          <div class="currency-input-wrap" style="margin-top:8px"><span class="currency-prefix">Rp</span>
            <input type="text" id="l_ang_${i}_18c_nilai" class="currency-field" oninput="formatCurrency(this)" placeholder="0"/>
          </div>
        </div>
      </div>
    </div>
    <div id="l_ang_${i}_sosek5plus_wrap2">
      <div class="form-group">
        <label class="field-label">19. Rekening Aktif / Dompet Digital (≥5 thn) <span class="req">*</span></label>
        <div class="radio-group">
          <label class="radio-item"><input type="radio" name="l_ang_${i}_rekening" value="1"/> <span>1. Ya untuk usaha</span></label>
          <label class="radio-item"><input type="radio" name="l_ang_${i}_rekening" value="2"/> <span>2. Ya untuk pribadi</span></label>
          <label class="radio-item"><input type="radio" name="l_ang_${i}_rekening" value="3"/> <span>3. Ya untuk usaha &amp; pribadi</span></label>
          <label class="radio-item"><input type="radio" name="l_ang_${i}_rekening" value="4"/> <span>4. Tidak ada</span></label>
          <label class="radio-item"><input type="radio" name="l_ang_${i}_rekening" value="9"/> <span>9. Tidak tahu</span></label>
        </div>
      </div>
      <div class="form-group">
        <label class="field-label">20. Disabilitas (Ya/Tidak/Tidak Tahu per jenis)</label>
        ${disabilitasRowsHTML(i)}
      </div>
      <div class="form-group">
        <label class="field-label">21. Penyakit Kronis (Ya/Tidak/Tidak Tahu per jenis)</label>
        ${penyakitKronisRowsHTML(i)}
        <div class="form-group">
          <label class="field-label">21q. Lainnya (sebutkan)</label>
          <input type="text" id="l_ang_${i}_kronis_q_lain" placeholder="Penyakit lainnya"/>
        </div>
      </div>
    </div>
    </div><!-- end .anggota-after-r9 -->
  </div>
</div>`;
}

function disabilitasRowsHTML(i) {
  const labels = [
    ['a', 'Fisik'], ['b', 'Mental'], ['c', 'Intelektual'],
    ['d', 'Sensorik Netra'], ['e', 'Sensorik Rungu'], ['f', 'Sensorik Wicara'],
  ];
  return labels.map(([k, lbl]) => `
    <div class="qmatrix-row">
      <div class="qmatrix-label">${k.toUpperCase()}. ${lbl}</div>
      <div class="radio-group qmatrix-opts">
        <label class="radio-item"><input type="radio" name="l_ang_${i}_disab_${k}" value="1"/> <span>Ya</span></label>
        <label class="radio-item"><input type="radio" name="l_ang_${i}_disab_${k}" value="2"/> <span>Tidak</span></label>
        <label class="radio-item"><input type="radio" name="l_ang_${i}_disab_${k}" value="9"/> <span>TT</span></label>
      </div>
    </div>`).join('');
}

function penyakitKronisRowsHTML(i) {
  const labels = [
    ['a', 'Hipertensi'], ['b', 'Rematik'], ['c', 'Asma'], ['d', 'Masalah Jantung'],
    ['e', 'Diabetes'], ['f', 'TBC'], ['g', 'Stroke'], ['h', 'Kanker/Tumor'],
    ['i', 'Gagal Ginjal'], ['j', 'Hemofilia'], ['k', 'HIV/AIDS'], ['l', 'Kolesterol'],
    ['m', 'Sirosis Hati'], ['n', 'Talasemia'], ['o', 'Leukemia'], ['p', 'Alzheimer'],
  ];
  return labels.map(([k, lbl]) => `
    <div class="qmatrix-row">
      <div class="qmatrix-label">${k.toUpperCase()}. ${lbl}</div>
      <div class="radio-group qmatrix-opts">
        <label class="radio-item"><input type="radio" name="l_ang_${i}_kronis_${k}" value="1"/> <span>Ya</span></label>
        <label class="radio-item"><input type="radio" name="l_ang_${i}_kronis_${k}" value="2"/> <span>Tidak</span></label>
        <label class="radio-item"><input type="radio" name="l_ang_${i}_kronis_${k}" value="9"/> <span>TT</span></label>
      </div>
    </div>`).join('');
}

// toggleAnggotaCard — tidak lagi digunakan dengan roster, dipertahankan agar tidak error
function toggleAnggotaCard(i) {}

function updateAnggotaNamePreview(i) {
  const el = document.getElementById('l_ang_' + i + '_nama');
  const name = el ? el.value.trim() : '';
  const ctx = document.getElementById('l_ang_' + i + '_ctx_nama');
  if (ctx) ctx.textContent = name ? ' ' + name : ' (nama belum diisi)';
  const card = document.getElementById('l_ang_card_' + i);
  if (card) {
    if (name) card.setAttribute('data-ang-nama', name);
    else card.removeAttribute('data-ang-nama');
  }
  if (document.getElementById('l_ang_row_' + i)) renderAnggotaRosterRow(i);
}

/* Daftar field per-roster untuk sidebar (key = suffix id/nama, label = teks).
 * Anggota: suffix dipakai sbg `l_ang_{i}_{suffix}` (id utk text/select, name utk radio).
 * Usaha:   suffix dipakai sbg `l2_{suffix}` pada form detail usaha aktif. */
var _SB_ANG_FIELDS = [
  ['nama', '5 · Nama'], ['nik', '7 · NIK'], ['hubungan', '8 · Hubungan'],
  ['keberadaan', '9 · Keberadaan'], ['kawin', '11 · Status Kawin'], ['jk', '12 · Jenis Kelamin'],
  ['tgl_lahir', '13 · Tgl Lahir / Umur'], ['sekolah', '14 · Partisipasi Sekolah'], ['ijazah', '15 · Ijazah'],
  ['profesi', '16 · Profesi'], ['kedudukan', '17 · Kedudukan'], ['18a', '18 · Pendapatan'],
  ['rekening', '19 · Rekening'], ['disab_a', '20 · Disabilitas'], ['kronis_a', '21 · Penyakit Kronis']
];
var _SB_USAHA_FIELDS = [
  ['nama_usaha', '8 · Nama & Alamat'], ['jenis_usaha', '9 · Jenis Usaha'], ['punya_nib', '10 · NIB'],
  ['badan_usaha', '11 · Badan Usaha'], ['pengusaha_nama', '12 · Pengusaha'], ['kegiatan_utama', '13 · Kegiatan & KBLI'],
  ['jaringan', '14 · Jaringan'], ['internet', '16 · Internet'], ['ramah_a', '17 · Ramah Lingkungan'],
  ['kreatif', '18 · Produk Kreatif'], ['halal', '19 · Halal'], ['bpom', '20 · BPOM'],
  ['mitra_kdkmp', '21 · Mitra KDKMP'], ['mbg', '22 · MBG'], ['pekerja_l', '24 · Pekerja'], ['tahun_operasi', '25 · Tahun Beroperasi']
];

function _sbRosterFieldsHtml(kind, i) {
  var list = (kind === 'ang') ? _SB_ANG_FIELDS : _SB_USAHA_FIELDS;
  var fn   = (kind === 'ang') ? 'gotoAngField' : 'gotoUsahaField';
  return list.map(function (f) {
    return '<div class="sb-roster-field" onclick="' + fn + '(' + i + ',\'' + f[0] + '\')">' + _sbEsc(f[1]) + '</div>';
  }).join('');
}

/* Markup satu entri roster: header (nomor + nama + caret) + daftar field collapsible. */
function _sbRosterEntryHtml(kind, i, nm, openFn) {
  return '<div class="sb-roster-entry">'
    + '<div class="sb-roster-entry-head">'
    +   '<span class="sb-roster-no">#' + i + '</span>'
    +   '<span class="sb-roster-nm' + (nm ? '' : ' is-empty') + '" onclick="if(typeof ' + openFn + "==='function')" + openFn + '(' + i + ')">'
    +     (nm ? _sbEsc(nm) : 'belum diisi') + '</span>'
    +   '<button type="button" class="sb-roster-fcaret" onclick="toggleSidebarEntry(this)" title="Lihat field entri ini">&#9656;</button>'
    + '</div>'
    + '<div class="sb-roster-fields sb-roster-collapsed">' + _sbRosterFieldsHtml(kind, i) + '</div>'
  + '</div>';
}

/* Toggle expand/collapse daftar field di satu entri roster. */
function toggleSidebarEntry(btn) {
  if (!btn) return;
  var entry = btn.closest ? btn.closest('.sb-roster-entry') : null;
  if (!entry) return;
  var fields = entry.querySelector('.sb-roster-fields');
  if (!fields) return;
  var collapsed = fields.classList.toggle('sb-roster-collapsed');
  btn.classList.toggle('open', !collapsed);
}

/* Scroll ke field tertentu di layar detail roster + kilatkan sorotan.
 * `base` = id (text/select) atau name (radio). */
function _rosterScrollTo(base) {
  var el = document.getElementById(base);
  if (!el) el = document.querySelector('[name="' + base + '"]');
  if (!el) return;
  var tgt = (el.closest && el.closest('.form-group')) || el;
  try { tgt.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) { tgt.scrollIntoView(); }
  tgt.classList.add('field-flash');
  setTimeout(function () { tgt.classList.remove('field-flash'); }, 1600);
}

/* Buka layar detail anggota/usaha lalu scroll ke field yang diklik di sidebar. */
function gotoAngField(i, suffix) {
  if (typeof showAngDetailScreen === 'function') showAngDetailScreen(i);
  setTimeout(function () { _rosterScrollTo('l_ang_' + i + '_' + suffix); }, 90);
}
function gotoUsahaField(i, suffix) {
  if (typeof showUsahaDetailScreen === 'function') showUsahaDetailScreen(i);
  setTimeout(function () { _rosterScrollTo('l2_' + suffix); }, 140);
}

function updateSidebarAnggota(count) {
  const group = document.getElementById('sidebarAnggotaGroup');
  const items = document.getElementById('sidebarAnggotaItems');
  if (!group || !items) return;
  if (count <= 0) { group.classList.add('hidden'); items.innerHTML = ''; return; }
  group.classList.remove('hidden');
  let html = '';
  for (let i = 1; i <= count; i++) {
    const nmEl = document.getElementById('l_ang_' + i + '_nama');
    const nm = (nmEl && nmEl.value ? String(nmEl.value) : '').trim();
    html += _sbRosterEntryHtml('ang', i, nm, 'showAngDetailScreen');
  }
  items.innerHTML = html;
}

/* Generate item roster USAHA di sidebar (Blok II L) — nama dari _usahaDataStore. */
function updateSidebarUsaha(count) {
  const group = document.getElementById('sidebarUsahaGroup');
  const items = document.getElementById('sidebarUsahaItems');
  if (!group || !items) return;
  const n = (typeof count === 'number') ? count
          : (typeof _usahaDataStore !== 'undefined' ? _usahaDataStore.length : 0);
  if (n <= 0) { group.classList.add('hidden'); items.innerHTML = ''; return; }
  group.classList.remove('hidden');
  let html = '';
  for (let i = 1; i <= n; i++) {
    const d = (typeof _usahaDataStore !== 'undefined' && _usahaDataStore[i - 1]) || {};
    const nm = String(d['l2_nama_usaha'] || '').trim();
    html += _sbRosterEntryHtml('usaha', i, nm, 'showUsahaDetailScreen');
  }
  items.innerHTML = html;
}

function _sbEsc(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
  });
}

function updateJmlPendataan() {
  const n = _getAnggotaCount();
  let filled = 0;
  for (let i = 1; i <= n; i++) {
    const nama = document.getElementById('l_ang_' + i + '_nama');
    if (nama && nama.value.trim()) filled++;
  }
  const out = document.getElementById('l1_jml_pendataan');
  if (out) out.value = filled || '';
}

/* --- Anggota STOP-state (r9a) --- */
function handleKeberadaanAnggota(i) {
  const v = getRadio('l_ang_' + i + '_keberadaan');
  const card = document.getElementById('l_ang_card_' + i);
  const badge = document.getElementById('l_ang_' + i + '_stop_badge');
  const dnWrap   = document.getElementById('l_ang_' + i + '_dn_wrap');
  const lnWrap   = document.getElementById('l_ang_' + i + '_ln_wrap');
  const domWrap  = document.getElementById('l_ang_' + i + '_alamat_dom_wrap');

  const STOP = (v === '2' || v === '6' || v === '7');
  if (card) card.classList.toggle('anggota-stop', STOP);
  if (badge) {
    if (STOP) {
      badge.style.display = '';
      badge.textContent = (v === '2') ? 'STOP — Meninggal'
                       : (v === '6') ? 'STOP — Pisah KK'
                       : 'STOP — Tidak Ditemukan';
    } else {
      badge.style.display = 'none';
    }
  }
  // r10DN visible only when v=3
  if (dnWrap)  dnWrap.classList.toggle('hidden', v !== '3');
  // r10LN visible only when v=4
  if (lnWrap)  lnWrap.classList.toggle('hidden', v !== '4');
  // r9b (alamat domisili) only for v=1 (tinggal di rumah ini)
  if (domWrap) domWrap.classList.toggle('hidden', v !== '1');

  if (typeof updateProgress === 'function') updateProgress();
}

/* --- Compute umur & age-gated fields --- */
function computeUmurAnggota(i) {
  const tgl = document.getElementById('l_ang_' + i + '_tgl_lahir');
  const out = document.getElementById('l_ang_' + i + '_umur');
  if (!tgl || !out) return;
  const v = tgl.value;
  if (!v) { out.value = ''; handleAgeGatedAnggota(i); return; }
  const d = new Date(v);
  if (isNaN(d.getTime())) { out.value = ''; handleAgeGatedAnggota(i); return; }
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  if (age < 0) age = 0;
  out.value = age;
  handleAgeGatedAnggota(i);
}

function handleAgeGatedAnggota(i) {
  const umur = parseInt(document.getElementById('l_ang_' + i + '_umur')?.value) || 0;
  const has5  = umur >= 5;
  const has10 = umur >= 10;
  const w5a  = document.getElementById('l_ang_' + i + '_sosek5plus_wrap');
  const w5b  = document.getElementById('l_ang_' + i + '_sosek5plus_wrap2');
  const w10  = document.getElementById('l_ang_' + i + '_sosek10plus_wrap');
  if (w5a) w5a.classList.toggle('hidden', !has5);
  if (w5b) w5b.classList.toggle('hidden', !has5);
  if (w10) w10.classList.toggle('hidden', !has10);
  if (typeof updateProgress === 'function') updateProgress();
}

/* --- Per-anggota conditional handlers --- */
function handleSekolahAnggota(i) {
  const v = getRadio('l_ang_' + i + '_sekolah');
  const w = document.getElementById('l_ang_' + i + '_ijazah_wrap');
  if (w) w.classList.toggle('hidden', v === '0');
  if (typeof updateProgress === 'function') updateProgress();
}

function handleProfesiAnggota(i) {
  const v = document.getElementById('l_ang_' + i + '_profesi')?.value;
  const w = document.getElementById('l_ang_' + i + '_kedudukan_wrap');
  if (w) w.classList.toggle('hidden', v === '000');
  if (typeof updateProgress === 'function') updateProgress();
}

function handlePendapatanAnggota(i, key) {
  const v = getRadio('l_ang_' + i + '_' + key);
  const w = document.getElementById('l_ang_' + i + '_' + key + '_nilai_wrap');
  if (w) w.classList.toggle('hidden', v !== '1');
  if (typeof updateProgress === 'function') updateProgress();
}

/* --- L1 regional dropdowns --- */
/* Kode wilayah PENDEK (spesifik per level) dari id gabungan: prov 2, kab 2, kec 3, desa 3 digit. */
function _wilShortKode(level, full) {
  const k = String(full == null ? '' : full);
  switch (level) {
    case 'prov': return k.slice(0, 2);
    case 'kab':  return k.slice(2, 4);
    case 'kec':  return k.slice(4, 7);
    case 'desa': return k.slice(7, 10);
    default:     return k;
  }
}
/* Label opsi wilayah: "[kode] NAMA" (kode pendek per level). */
function _wilLabel(level, full, nama) {
  const sk = _wilShortKode(level, full);
  // Strip prefix "[kode] " bila nama sudah ber-label (assignment lama) → cegah ganda.
  const clean = String(nama == null ? '' : nama).replace(/^\[[^\]]*\]\s*/, '');
  return sk ? '[' + sk + '] ' + clean : clean;
}
/* Urut ascending berdasarkan kode (id gabungan numerik). */
function _byKode(a, b) {
  const ka = String(a == null ? '' : a), kb = String(b == null ? '' : b);
  return ka.localeCompare(kb, undefined, { numeric: true });
}

function loadProvinsiL() {
  const sel = document.getElementById('l1_alamat_provinsi');
  if (!sel) return;
  sel.innerHTML = '<option value="">-- Pilih Provinsi --</option>';
  const list = (typeof STATIC_PROVINSI !== 'undefined') ? STATIC_PROVINSI : [];
  [...list].sort((a, b) => _byKode(a.kode, b.kode)).forEach(d => {
    const o = document.createElement('option');
    o.value = d.kode; o.textContent = _wilLabel('prov', d.kode, d.nama);
    sel.appendChild(o);
  });
  if (typeof syncSearchable === 'function') syncSearchable('l1_alamat_provinsi', 'provinsi keluarga');
}

async function loadKabupatenL(kdprov) {
  const sel = document.getElementById('l1_alamat_kab');
  if (!sel) return;
  sel.innerHTML = '<option value="">Memuat...</option>';
  sel.disabled = true;
  ['l1_alamat_kec', 'l1_alamat_kel'].forEach(id => {
    const s = document.getElementById(id);
    if (s) { s.innerHTML = '<option value="">--</option>'; s.disabled = true; }
  });
  if (typeof syncSearchable === 'function') {
    syncSearchable('l1_alamat_kab', 'kabupaten/kota keluarga');
    syncSearchable('l1_alamat_kec', 'kecamatan keluarga');
    syncSearchable('l1_alamat_kel', 'kelurahan/desa keluarga');
  }
  if (!kdprov) { sel.innerHTML = '<option value="">-- Pilih Kabupaten/Kota --</option>'; return; }
  const staticKabs = (typeof STATIC_KABUPATEN !== 'undefined' && STATIC_KABUPATEN[kdprov]) || null;
  if (staticKabs) {
    sel.innerHTML = '<option value="">-- Pilih Kabupaten/Kota --</option>';
    [...staticKabs].sort((a, b) => _byKode(a.kode, b.kode)).forEach(k => {
      const o = document.createElement('option');
      o.value = k.kode; o.textContent = _wilLabel('kab', k.kode, k.nama);
      sel.appendChild(o);
    });
    sel.disabled = false;
    if (typeof syncSearchable === 'function') syncSearchable('l1_alamat_kab', 'kabupaten/kota keluarga');
    return;
  }
  try {
    const res = await fetch(`https://esurvey.bps.go.id/lookup/api/v1/collections/668fcfe6-8ef4-4612-968a-d1330c03fe17/filter?version=1&filter=kdprov||eq||${kdprov}`,
      { headers: { 'Accept': 'application/json' } });
    const d = await res.json();
    sel.innerHTML = '<option value="">-- Pilih --</option>';
    (d.data || []).sort((a, b) => _byKode(a.kdprovkab, b.kdprovkab)).forEach(k => {
      const o = document.createElement('option');
      o.value = k.kdprovkab; o.textContent = _wilLabel('kab', k.kdprovkab, k.namakab);
      sel.appendChild(o);
    });
    sel.disabled = false;
    if (typeof syncSearchable === 'function') syncSearchable('l1_alamat_kab', 'kabupaten/kota keluarga');
  } catch (e) {
    sel.innerHTML = '<option value="">-- Gagal memuat --</option>';
    sel.disabled = false;
  }
}

function loadKecamatanL(kdprovkab) {
  const sel = document.getElementById('l1_alamat_kec');
  if (!sel) return;
  sel.innerHTML = '<option value="">-- Pilih Kecamatan --</option>';
  const child = document.getElementById('l1_alamat_kel');
  if (child) { child.innerHTML = '<option value="">--</option>'; child.disabled = true; }
  if (typeof syncSearchable === 'function') syncSearchable('l1_alamat_kel', 'kelurahan/desa keluarga');
  if (!kdprovkab) { sel.disabled = true; if (typeof syncSearchable === 'function') syncSearchable('l1_alamat_kec', 'kecamatan keluarga'); return; }
  const stk = (typeof STATIC_KECAMATAN !== 'undefined' && STATIC_KECAMATAN[kdprovkab]) || [];
  [...stk].sort((a, b) => _byKode(a.kode, b.kode)).forEach(k => {
    const o = document.createElement('option');
    o.value = k.kode; o.textContent = _wilLabel('kec', k.kode, k.nama);
    sel.appendChild(o);
  });
  sel.disabled = false;
  if (typeof syncSearchable === 'function') syncSearchable('l1_alamat_kec', 'kecamatan keluarga');
}

function loadKelurahanL(kdprovkabkec) {
  const sel = document.getElementById('l1_alamat_kel');
  if (!sel) return;
  sel.innerHTML = '<option value="">-- Pilih Kelurahan/Desa --</option>';
  if (!kdprovkabkec) { sel.disabled = true; if (typeof syncSearchable === 'function') syncSearchable('l1_alamat_kel', 'kelurahan/desa keluarga'); return; }
  const stk = (typeof STATIC_KELURAHAN !== 'undefined' && STATIC_KELURAHAN[kdprovkabkec]) || [];
  [...stk].sort((a, b) => _byKode(a.kode, b.kode)).forEach(k => {
    const o = document.createElement('option');
    o.value = k.kode; o.textContent = _wilLabel('desa', k.kode, k.nama);
    sel.appendChild(o);
  });
  sel.disabled = false;
  if (typeof syncSearchable === 'function') syncSearchable('l1_alamat_kel', 'kelurahan/desa keluarga');
}

/* --- Per-anggota DN kab/kota regional loader --- */
async function handleDnProvinsiAnggota(i) {
  const prov = document.getElementById('l_ang_' + i + '_dn_provinsi')?.value;
  const sel  = document.getElementById('l_ang_' + i + '_dn_kab');
  if (!sel) return;
  if (!prov) {
    sel.innerHTML = '<option value="">-- Pilih Provinsi dulu --</option>';
    sel.disabled = true;
    return;
  }
  sel.innerHTML = '<option value="">Memuat...</option>';
  sel.disabled = true;
  const staticKabs = (typeof STATIC_KABUPATEN !== 'undefined' && STATIC_KABUPATEN[prov]) || null;
  if (staticKabs) {
    sel.innerHTML = '<option value="">-- Pilih Kabupaten/Kota --</option>';
    [...staticKabs].sort((a, b) => a.nama.localeCompare(b.nama)).forEach(k => {
      const o = document.createElement('option');
      o.value = k.kode; o.textContent = k.nama;
      sel.appendChild(o);
    });
    sel.disabled = false;
    return;
  }
  try {
    const res = await fetch(`https://esurvey.bps.go.id/lookup/api/v1/collections/668fcfe6-8ef4-4612-968a-d1330c03fe17/filter?version=1&filter=kdprov||eq||${prov}`,
      { headers: { 'Accept': 'application/json' } });
    const d = await res.json();
    sel.innerHTML = '<option value="">-- Pilih --</option>';
    (d.data || []).sort((a, b) => a.namakab.localeCompare(b.namakab)).forEach(k => {
      const o = document.createElement('option');
      o.value = k.kdprovkab; o.textContent = k.namakab;
      sel.appendChild(o);
    });
    sel.disabled = false;
  } catch (_) {
    sel.innerHTML = '<option value="">-- Gagal memuat --</option>';
    sel.disabled = false;
  }
}

/* ====== L2 USAHA ROSTER (multi-usaha) ======
 * Data setiap usaha disimpan dalam _usahaDataStore (array JS) dan
 * di-mirror ke hidden input #l_usaha_all_data agar ikut draft save/restore.
 * Form l2_* dipakai sebagai "edit form" aktif — hanya satu usaha aktif
 * dalam DOM sekaligus; data usaha lain tersimpan di store.
 */

let _usahaDataStore = [];   // array of objects, index 0 = usaha ke-1
let _activeUsahaIdx = null; // 1-based, usaha yang sedang diedit di form

/* ---- Store persistence ---- */

function _saveUsahaStoreToDom() {
  const el = document.getElementById('l_usaha_all_data');
  if (el) el.value = JSON.stringify(_usahaDataStore);
  const cntEl = document.getElementById('l_usaha_count');
  if (cntEl) cntEl.value = _usahaDataStore.length;
}

function syncUsahaStoreFromDom() {
  const el = document.getElementById('l_usaha_all_data');
  try { _usahaDataStore = JSON.parse((el && el.value) || '[]'); }
  catch(e) { _usahaDataStore = []; }
}

/* ---- Serialize / Deserialize form l2_* ↔ store ---- */

function serializeCurrentUsahaForm(idx) {
  if (!idx || idx < 1) return;
  const obj = _collectL2Fields();
  _usahaDataStore[idx - 1] = obj;
  _saveUsahaStoreToDom();
}

function loadUsahaIntoForm(idx) {
  if (!idx || idx < 1) return;
  _activeUsahaIdx = idx;
  const obj = _usahaDataStore[idx - 1] || {};
  _populatePengusahaSelect();   // opsi anggota siap SEBELUM _applyL2Fields set value
  _applyL2Fields(obj);
  rehydrateUsahaConditionals();
  handlePengusahaPilih();        // terapkan auto-fill / readonly sesuai pilihan tersimpan
}

/* ---- Rincian 12: Pengusaha = pilih dari anggota keluarga (auto-isi) atau orang luar (manual) ----
 * Select #l2_pengusaha_pilih: value = nomor anggota (1..n) | "__luar__" | "".
 * Anggota → nama/JK/umur/NIK terisi dari Blok I & dikunci read-only.
 * Orang luar → field nama tampil & semua dapat diisi manual. */
function _populatePengusahaSelect() {
  const sel = document.getElementById('l2_pengusaha_pilih');
  if (!sel) return;
  const prev = sel.value;
  const n = _getAnggotaCount();
  let html = '<option value="">— pilih anggota keluarga / orang luar —</option>';
  for (let i = 1; i <= Math.min(n, 30); i++) {
    const nama = getVal('l_ang_' + i + '_nama') || ('Anggota #' + i);
    html += '<option value="' + i + '">' + _sbEsc(nama) + (i === 1 ? ' (Kepala Keluarga)' : '') + '</option>';
  }
  html += '<option value="__luar__">Orang luar (bukan anggota keluarga)</option>';
  sel.innerHTML = html;
  if (prev) sel.value = prev;
  // Reset read-only agar _clearL2Fields/_applyL2Fields bisa menulis ulang nilainya.
  ['l2_pengusaha_umur', 'l2_pengusaha_nik'].forEach(function (id) {
    const el = document.getElementById(id);
    if (el) { el.readOnly = false; el.classList.remove('input-muted'); }
  });
}

function _setPengusahaJk(v) {
  document.querySelectorAll('input[name="l2_pengusaha_jk"]').forEach(function (r) {
    r.checked = (!!v && r.value === v);
  });
}

function handlePengusahaPilih() {
  const sel = document.getElementById('l2_pengusaha_pilih');
  if (!sel) return;
  const namaInp = document.getElementById('l2_pengusaha_nama');
  const umurInp = document.getElementById('l2_pengusaha_umur');
  const nikInp  = document.getElementById('l2_pengusaha_nik');
  const v = sel.value;
  const isLuar = (v === '__luar__');
  const isMember = !!v && !isLuar;
  // Input nama manual hanya tampil untuk orang luar.
  if (namaInp) namaInp.classList.toggle('hidden', !isLuar);
  if (isMember) {
    const i = parseInt(v, 10);
    if (namaInp) namaInp.value = getVal('l_ang_' + i + '_nama');
    if (umurInp) umurInp.value = getVal('l_ang_' + i + '_umur');
    if (nikInp)  nikInp.value  = getVal('l_ang_' + i + '_nik');
    _setPengusahaJk(getRadio('l_ang_' + i + '_jk'));
    // Kunci field yang terisi otomatis (umur & NIK; JK ikut anggota).
    [umurInp, nikInp].forEach(function (el) { if (el) { el.readOnly = true; el.classList.add('input-muted'); } });
  } else {
    // Orang luar / belum dipilih → editable.
    [umurInp, nikInp].forEach(function (el) { if (el) { el.readOnly = false; el.classList.remove('input-muted'); } });
    if (!v) { // belum dipilih → kosongkan agar tidak ada sisa data anggota lama
      if (namaInp) namaInp.value = '';
      if (umurInp) umurInp.value = '';
      if (nikInp)  nikInp.value  = '';
      _setPengusahaJk('');
    }
  }
  if (typeof updateProgress === 'function') updateProgress();
}

function _collectL2Fields() {
  const obj = {};
  // text / number / select / textarea
  const textIds = [
    'l2_nama_usaha','l2_nama_komersial','l2_alamat','l2_rt','l2_rw','l2_kodepos',
    'l2_email','l2_website','l2_hp','l2_nama_kawasan','l2_lokasi_alamat',
    'l2_lokasi_provinsi','l2_lokasi_kab','l2_nib','l2_nib_alasan_lain',
    'l2_pengusaha_pilih','l2_pengusaha_nama','l2_pengusaha_umur','l2_pengusaha_nik','l2_kegiatan_utama',
    'l2_input','l2_proses','l2_produk_utama','l2_kbli_kode','l2_kbli_search',
    'l2_kbli_kategori','l2_kbli_kategori_display','l2_jml_cabang',
    'l2_kp_nama','l2_kp_negara','l2_kp_alamat','l2_kp_email','l2_kp_provinsi','l2_kp_kab',
    'l2_halal_b','l2_halal_c','l2_bpom_b','l2_bpom_c',
    'l2_pekerja_l','l2_pekerja_p','l2_pekerja_dibayar','l2_pekerja_tidak_dibayar','l2_tahun_operasi',
    'l2_y26a','l2_y26b','l2_y26c','l2_y26d','l2_y26e','l2_y26f',
    'l2_y27a','l2_y27b','l2_y27c','l2_y27d',
    'l2_y28a','l2_y28b','l2_y28c','l2_y28d',
    'l2_y29a','l2_y29b','l2_y29c','l2_y29d','l2_y29e','l2_y29f','l2_y29g',
    'l2_m30a','l2_m30b','l2_m30c','l2_m30d','l2_m30e','l2_m30f',
    'l2_m31a','l2_m31b','l2_m31c','l2_m31d',
    'l2_m32a','l2_m32b','l2_m32c','l2_m32d',
    'l2_m33a','l2_m33b','l2_m33c','l2_m33d','l2_m33e','l2_m33f','l2_m33g',
  ];
  textIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) obj[id] = el.value;
  });
  // radio groups
  const radioNames = [
    'l2_kawasan','l2_jenis_usaha','l2_punya_nib','l2_nib_alasan','l2_badan_usaha',
    'l2_kdkmp','l2_koperasi_jenis','l2_lap_keuangan','l2_pengusaha_jk',
    'l2_b1','l2_b2','l2_b3','l2_b4','l2_c','l2_hotel','l2_jaringan',
    'l2_internet','l2_internet_b1','l2_internet_b2','l2_internet_b3',
    'l2_internet_b4','l2_internet_b5','l2_internet_b6',
    'l2_teknologi','l2_ramah_a','l2_ramah_b','l2_kreatif',
    'l2_halal','l2_bpom','l2_mitra_kdkmp','l2_mbg',
    'l2_nonpend_a','l2_nonpend_b','l2_nonpend_c',
    'l2_y28c1','l2_m32c1',
  ];
  radioNames.forEach(name => {
    const checked = document.querySelector(`input[name="${name}"]:checked`);
    obj['_r_' + name] = checked ? checked.value : '';
  });
  // checkboxes (bulan beroperasi 2026)
  for (let i = 1; i <= 8; i++) {
    const cb = document.getElementById('l2_m31e_' + i);
    obj['_c_l2_m31e_' + i] = cb && cb.checked ? '1' : '0';
  }
  // KBLI chip visibility
  const chip = document.getElementById('l2_kbli_chip');
  obj['_kbli_chip_visible'] = chip && chip.style.display !== 'none' ? '1' : '0';
  // L.KP — cabang per-usaha (ikut tersimpan di objek usaha → usaha_data ke GAS)
  obj._cabang = (typeof _collectL2Cabang === 'function') ? _collectL2Cabang() : [];
  return obj;
}

function _applyL2Fields(obj) {
  if (!obj) return;
  // Clear all first
  _clearL2Fields();
  // text / number / select / textarea
  Object.keys(obj).forEach(key => {
    if (key.startsWith('_')) return;
    const el = document.getElementById(key);
    if (el && !el.readOnly && !el.disabled) {
      el.value = obj[key] || '';
    }
  });
  // radio groups
  Object.keys(obj).forEach(key => {
    if (!key.startsWith('_r_')) return;
    const name = key.slice(3);
    const val = obj[key];
    document.querySelectorAll(`input[name="${name}"]`).forEach(r => { r.checked = false; });
    if (val) {
      const radio = document.querySelector(`input[name="${name}"][value="${val}"]`);
      if (radio) radio.checked = true;
    }
  });
  // checkboxes
  for (let i = 1; i <= 8; i++) {
    const cb = document.getElementById('l2_m31e_' + i);
    if (cb) cb.checked = (obj['_c_l2_m31e_' + i] === '1');
  }
  // KBLI chip
  const kode = (document.getElementById('l2_kbli_kode') || {}).value;
  const chip = document.getElementById('l2_kbli_chip');
  const searchEl = document.getElementById('l2_kbli_search');
  if (kode && chip) {
    chip.style.display = '';
    const chipText = document.getElementById('l2_kbli_chip_text');
    const chipUraian = document.getElementById('l2_kbli_chip_uraian');
    if (chipText) chipText.textContent = kode;
    if (chipUraian) chipUraian.textContent = searchEl ? searchEl.value : '';
    if (searchEl) searchEl.style.display = 'none';
    const dropWrap = document.querySelector('.ac-wrap');
    if (dropWrap) dropWrap.style.display = 'none';
  } else if (chip) {
    chip.style.display = 'none';
    if (searchEl) searchEl.style.display = '';
    const dropWrap = document.querySelector('.ac-wrap');
    if (dropWrap) dropWrap.style.display = '';
  }
  // Apply kbli filter (Halal/BPOM visibility)
  if (typeof applyKBLIFilter === 'function') applyKBLIFilter();
  // L.KP — bangun ulang kartu cabang dari objek usaha
  if (typeof _applyL2Cabang === 'function') _applyL2Cabang(obj._cabang || []);
}

function _clearL2Fields() {
  document.querySelectorAll('[id^="l2_"]').forEach(el => {
    if (el.readOnly || el.disabled) return;
    if (el.type === 'radio' || el.type === 'checkbox') { el.checked = false; return; }
    el.value = '';
  });
  // Hide KBLI chip, show search
  const chip = document.getElementById('l2_kbli_chip');
  if (chip) chip.style.display = 'none';
  const dropWrap = document.querySelector('.ac-wrap');
  if (dropWrap) dropWrap.style.display = '';
  const searchEl = document.getElementById('l2_kbli_search');
  if (searchEl) searchEl.style.display = '';
  // Reset readonly totals
  ['l2_pekerja_total','l2_pekerja_total2','l2_y26f','l2_y27c','l2_y28c','l2_y29g',
   'l2_m30f','l2_m31c','l2_m32c','l2_m33g'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  // Hide conditional wraps
  ['l2_nama_kawasan_wrap','l2_nib_wrap','l2_nib_alasan_wrap','l2_nib_alasan_lain_wrap',
   'l2_koperasi_wrap','l2_lokasi_utama_wrap','l2_b3_wrap','l2_b4_wrap','l2_c_wrap',
   'l2_de_wrap','l2_hotel_wrap','l2_jml_cabang_wrap','l2_kp_wrap','l2_unit_pembantu_notice',
   'l2_internet_b_wrap','l2_halal_b_wrap','l2_bpom_b_wrap',
   'l2_tahunan_wrap','l2_bulanan_wrap'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });
  // L.KP — kosongkan daftar cabang
  const cabList = document.getElementById('l2_cabang_list');
  if (cabList) cabList.innerHTML = '';
  if (typeof _syncL2JmlCabang === 'function') _syncL2JmlCabang();
}

// Re-trigger semua conditional show/hide handlers setelah load data
function rehydrateUsahaConditionals() {
  if (typeof handleKawasanL       === 'function') handleKawasanL();
  if (typeof handleJenisUsahaL    === 'function') handleJenisUsahaL();
  if (typeof handleNIBL           === 'function') handleNIBL();
  if (typeof handleBadanUsahaL    === 'function') handleBadanUsahaL();
  if (typeof handleKegiatanL      === 'function') handleKegiatanL();
  if (typeof handleJaringanL      === 'function') handleJaringanL();
  if (typeof handleInternetL      === 'function') handleInternetL();
  if (typeof handleHalalL         === 'function') handleHalalL();
  if (typeof handleBPOML          === 'function') handleBPOML();
  if (typeof handleTahunOperasiL  === 'function') handleTahunOperasiL();
  if (typeof handleNIBAlasanL     === 'function') handleNIBAlasanL();
}

/* ---- CRUD ---- */

function addUsaha() {
  const current = _usahaDataStore.length;
  if (current >= 10) { alert('Maksimal 10 usaha per keluarga.'); return; }
  _usahaDataStore.push({});
  _saveUsahaStoreToDom();
  renderUsahaRoster();
  if (typeof updateProgress === 'function') updateProgress();
  // Buka detail usaha baru
  const newIdx = _usahaDataStore.length;
  if (typeof showUsahaDetailScreen === 'function') showUsahaDetailScreen(newIdx);
  if (typeof saveDraft === 'function') saveDraft(); // persist daftar roster usaha segera
}

function deleteUsaha(idx) {
  if (!confirm('Hapus usaha ke-' + idx + '? Data yang sudah diisi akan hilang.')) return;
  // Jika usaha yang dihapus sedang diedit, tutup dulu
  if (_activeUsahaIdx === idx && typeof showMainScreen === 'function') {
    _activeUsahaIdx = null;
    showMainScreen();
  }
  _usahaDataStore.splice(idx - 1, 1);
  if (_activeUsahaIdx > idx) _activeUsahaIdx--;
  _saveUsahaStoreToDom();
  renderUsahaRoster();
  if (typeof updateProgress === 'function') updateProgress();
  if (typeof saveDraft === 'function') saveDraft(); // persist daftar roster usaha segera
}

/* ---- Roster rendering ---- */

function renderUsahaRosterRow(idx) {
  const list = document.getElementById('l2_roster_list');
  if (!list) return;
  const existing = document.getElementById('l_usaha_row_' + idx);
  const html = _usahaRosterRowHTML(idx);
  if (existing) existing.outerHTML = html;
  else list.insertAdjacentHTML('beforeend', html);
}

function renderUsahaRoster() {
  const list = document.getElementById('l2_roster_list');
  const empty = document.getElementById('l2_roster_empty');
  const countEl = document.getElementById('l2_roster_count');
  if (!list) return;
  list.innerHTML = '';
  const n = _usahaDataStore.length;
  for (let i = 1; i <= n; i++) list.insertAdjacentHTML('beforeend', _usahaRosterRowHTML(i));
  if (empty)   empty.style.display   = n > 0 ? 'none' : '';
  if (countEl) countEl.textContent = n + ' usaha';
  if (typeof updateSidebarUsaha === 'function') updateSidebarUsaha(n);
}

function _usahaRosterRowHTML(idx) {
  const d = _usahaDataStore[idx - 1] || {};
  const nama   = d['l2_nama_usaha'] || '';
  const kbliKd = d['l2_kbli_kode'] || '';
  const kbliJd = d['l2_kbli_search'] || '';
  const tahun  = d['l2_tahun_operasi'] || '';

  let statusCls, statusTxt;
  if (!nama && !kbliKd) { statusCls = 'chip-empty';   statusTxt = 'Belum diisi'; }
  else if (!nama || !kbliKd) { statusCls = 'chip-partial'; statusTxt = 'Belum lengkap'; }
  else { statusCls = 'chip-done'; statusTxt = 'Terisi'; }

  const displayName = nama || ('Usaha ke-' + idx);
  const meta = [kbliKd ? 'KBLI ' + kbliKd : '', tahun ? 'Tahun ' + tahun : ''].filter(Boolean).join(' · ');
  return `<div class="roster-row" id="l_usaha_row_${idx}">
    <div class="roster-row-top">
      <div class="roster-no">${idx}</div>
      <div class="roster-info">
        <div class="roster-name">${displayName}</div>
        <div class="roster-meta">${meta || (kbliJd ? kbliJd.slice(0,50) : 'Belum ada data')}</div>
      </div>
      <span class="status-chip ${statusCls}">${statusTxt}</span>
      <button class="btn-roster-del" type="button" title="Hapus usaha" aria-label="Hapus usaha ke-${idx}" onclick="deleteUsaha(${idx})">✕</button>
    </div>
    <button class="btn-roster-open" type="button" onclick="if(typeof showUsahaDetailScreen==='function')showUsahaDetailScreen(${idx})">Buka detail usaha</button>
  </div>`;
}

/* ====== L.KP CABANG per-usaha (inline cards) ======
 * Cabang dari usaha "Kantor pusat" (l2_jaringan=2). Disimpan per-usaha di
 * _usahaDataStore[i]._cabang (lewat _collectL2Fields/_applyL2Fields) → otomatis
 * ikut usaha_data JSON ke GAS, tanpa perubahan backend/submit. Kartu inline
 * (id l2cab_<n>_*), dibangun ulang tiap usaha dimuat. */
function _l2CabangCount() {
  const list = document.getElementById('l2_cabang_list');
  return list ? list.querySelectorAll('.l2cab-card').length : 0;
}
function _syncL2JmlCabang() {
  const n = _l2CabangCount();
  const cntEl = document.getElementById('l2_cabang_count');
  if (cntEl) cntEl.textContent = n + ' cabang/unit';
  const empty = document.getElementById('l2_cabang_empty');
  if (empty) empty.style.display = n > 0 ? 'none' : '';
  const jml = document.getElementById('l2_jml_cabang');
  if (jml) jml.value = n > 0 ? n : '';
}
function _l2CabangCardHTML(i, d) {
  d = d || {};
  const v = (k) => (d[k] != null ? String(d[k]) : '');
  const chk = (val) => v('jenis') === val ? ' checked' : '';
  const esc = (typeof _sbEsc === 'function') ? _sbEsc : ((s) => String(s == null ? '' : s));
  return `<div class="l2cab-card" data-cab="${i}">
    <div class="l2cab-head">
      <span class="l2cab-no">#${i}</span>
      <span class="l2cab-title">Cabang / Unit</span>
      <button type="button" class="btn-roster-del" title="Hapus cabang/unit" aria-label="Hapus cabang ${i}" onclick="deleteCabangL2(${i})">&#10005;</button>
    </div>
    <div class="form-group">
      <label class="field-label">Nama Kantor/Unit <span class="req">*</span></label>
      <input type="text" id="l2cab_${i}_nama" value="${esc(v('nama'))}" placeholder="Nama kantor/unit"/>
    </div>
    <div class="inline-fields">
      <div class="form-group">
        <label class="field-label">Jenis Unit</label>
        <div class="radio-group">
          <label class="radio-item"><input type="radio" name="l2cab_${i}_jenis" value="1"${chk('1')}/> <span>1. Kantor Cabang</span></label>
          <label class="radio-item"><input type="radio" name="l2cab_${i}_jenis" value="2"${chk('2')}/> <span>2. Kantor Perwakilan</span></label>
          <label class="radio-item"><input type="radio" name="l2cab_${i}_jenis" value="3"${chk('3')}/> <span>3. Pabrik</span></label>
          <label class="radio-item"><input type="radio" name="l2cab_${i}_jenis" value="4"${chk('4')}/> <span>4. Unit Pembantu/Penunjang</span></label>
        </div>
      </div>
      <div class="form-group">
        <label class="field-label">KBLI (5 digit)</label>
        <input type="text" id="l2cab_${i}_kbli" maxlength="5" value="${esc(v('kbli'))}" placeholder="00000"/>
      </div>
    </div>
    <div class="form-group">
      <label class="field-label">Alamat</label>
      <input type="text" id="l2cab_${i}_alamat" value="${esc(v('alamat'))}" placeholder="Alamat cabang/unit"/>
    </div>
    <div class="form-group">
      <label class="field-label">Jumlah Pekerja</label>
      <input type="number" id="l2cab_${i}_pekerja" min="0" value="${esc(v('pekerja'))}" placeholder="0"/>
    </div>
  </div>`;
}
function addCabangL2() {
  const list = document.getElementById('l2_cabang_list');
  if (!list) return;
  const n = _l2CabangCount();
  if (n >= 50) { alert('Maksimal 50 cabang/unit.'); return; }
  list.insertAdjacentHTML('beforeend', _l2CabangCardHTML(n + 1, {}));
  _syncL2JmlCabang();
  if (typeof updateProgress === 'function') updateProgress();
}
function deleteCabangL2(i) {
  if (!confirm('Hapus cabang/unit ke-' + i + '? Data yang sudah diisi akan hilang.')) return;
  const arr = _collectL2Cabang();
  arr.splice(i - 1, 1);
  _applyL2Cabang(arr);
  if (typeof updateProgress === 'function') updateProgress();
}
function _collectL2Cabang() {
  const list = document.getElementById('l2_cabang_list');
  if (!list) return [];
  const out = [];
  list.querySelectorAll('.l2cab-card').forEach((card) => {
    const i = card.getAttribute('data-cab');
    const g = (f) => { const el = document.getElementById('l2cab_' + i + '_' + f); return el ? el.value : ''; };
    const jenis = (typeof getRadio === 'function') ? getRadio('l2cab_' + i + '_jenis') : '';
    out.push({ nama: g('nama'), jenis: jenis, kbli: g('kbli'), alamat: g('alamat'), pekerja: g('pekerja') });
  });
  return out;
}
function _applyL2Cabang(arr) {
  const list = document.getElementById('l2_cabang_list');
  if (!list) return;
  list.innerHTML = '';
  (arr || []).forEach((d, idx) => list.insertAdjacentHTML('beforeend', _l2CabangCardHTML(idx + 1, d)));
  _syncL2JmlCabang();
}

/* --- L2 conditional handlers --- */
function handleKawasanL() {
  const v = getRadio('l2_kawasan');
  const wrap = document.getElementById('l2_nama_kawasan_wrap');
  if (wrap) wrap.classList.toggle('hidden', !v || v === '10');
}

function handleJenisUsahaL() {
  const v = getRadio('l2_jenis_usaha');
  const wrap = document.getElementById('l2_lokasi_utama_wrap');
  // Show lokasi utama wrap if v in {3,4,5,6}
  if (wrap) wrap.classList.toggle('hidden', !['3', '4', '5', '6'].includes(v));
}

function handleNIBL() {
  const v = getRadio('l2_punya_nib');
  document.getElementById('l2_nib_wrap').classList.toggle('hidden', v !== '1');
  document.getElementById('l2_nib_alasan_wrap').classList.toggle('hidden', v !== '2');
}

function handleNIBAlasanL() {
  const v = getRadio('l2_nib_alasan');
  document.getElementById('l2_nib_alasan_lain_wrap').classList.toggle('hidden', v !== '5');
}

function handleBadanUsahaL() {
  const v = getRadio('l2_badan_usaha');
  document.getElementById('l2_koperasi_wrap').classList.toggle('hidden', v !== '3');
}

function handleKegiatanL() {
  const b1 = getRadio('l2_b1');
  const b2 = getRadio('l2_b2');
  const show3 = b1 === '2' && b2 === '2';
  document.getElementById('l2_b3_wrap').classList.toggle('hidden', !show3);
  if (!show3) document.querySelectorAll('input[name="l2_b3"]').forEach(r => r.checked = false);
  const b3 = show3 ? getRadio('l2_b3') : '';
  const show4 = show3 && b3 === '2';
  document.getElementById('l2_b4_wrap').classList.toggle('hidden', !show4);
  if (!show4) document.querySelectorAll('input[name="l2_b4"]').forEach(r => r.checked = false);
  // c shown when food/retail path: b2=Ya OR b3=Ya
  const showC = b2 === '1' || (show3 && b3 === '1');
  document.getElementById('l2_c_wrap').classList.toggle('hidden', !showC);
  // d/e shown when manufacturing: b1=Ya AND b2=Tidak
  const showDE = b1 === '1' && b2 === '2';
  document.getElementById('l2_de_wrap').classList.toggle('hidden', !showDE);
}

function handleJaringanL() {
  const v = getRadio('l2_jaringan');
  document.getElementById('l2_jml_cabang_wrap').classList.toggle('hidden', v !== '2');
  document.getElementById('l2_kp_wrap').classList.toggle('hidden', !['3', '4', '5', '6'].includes(v));
  const notice = document.getElementById('l2_unit_pembantu_notice');
  if (notice) notice.classList.toggle('hidden', v !== '6');
  // Kode 6 = Unit Pembantu/Penunjang → pendataan selesai: hide all sections after L2.14
  const isSelesai = (v === '6');
  document.body.classList.toggle('l2-pendataan-selesai', isSelesai);
  // Hide every kartu detail usaha (sec-L2-16 onwards). Setelah init kartu
  // dipindah ke #screen-usaha-body, jadi cari di sana (fallback #blokL2).
  const blok = document.getElementById('screen-usaha-body') || document.getElementById('blokL2');
  if (blok) {
    blok.querySelectorAll('.section-card').forEach(card => {
      const hdr = card.querySelector('.section-header');
      if (!hdr || !hdr.id) return;
      const m = hdr.id.match(/^sec-L2-(\d+)/);
      if (m && parseInt(m[1], 10) >= 16) {
        card.classList.toggle('pendataan-selesai-hide', isSelesai);
      }
    });
  }
}

function handleInternetL() {
  const v = getRadio('l2_internet');
  document.getElementById('l2_internet_b_wrap').classList.toggle('hidden', v !== '1');
}

function handleHalalL() {
  const v = getRadio('l2_halal');
  document.getElementById('l2_halal_b_wrap').classList.toggle('hidden', v !== '1');
}

function handleBPOML() {
  const v = getRadio('l2_bpom');
  document.getElementById('l2_bpom_b_wrap').classList.toggle('hidden', v !== '1');
}

function handleTahunOperasiL() {
  const v = parseInt(document.getElementById('l2_tahun_operasi').value) || 0;
  const isBefore2026 = v && v < 2026;
  const isIn2026     = v && v >= 2026;
  document.getElementById('l2_tahunan_wrap').classList.toggle('hidden', !isBefore2026);
  document.getElementById('l2_bulanan_wrap').classList.toggle('hidden', !isIn2026);
}

/* --- L2 calculations --- */
function calcPekerjaL() {
  const l = parseInt(document.getElementById('l2_pekerja_l').value) || 0;
  const p = parseInt(document.getElementById('l2_pekerja_p').value) || 0;
  const d = parseInt(document.getElementById('l2_pekerja_dibayar').value) || 0;
  const t = parseInt(document.getElementById('l2_pekerja_tidak_dibayar').value) || 0;
  document.getElementById('l2_pekerja_total').value  = l + p;
  document.getElementById('l2_pekerja_total2').value = d + t;
}

function calcL2Pengeluaran() {
  const ids = ['l2_y26a','l2_y26b','l2_y26c','l2_y26d','l2_y26e'];
  const total = ids.map(id => parseCurrency(document.getElementById(id).value)).reduce((a,b)=>a+b, 0);
  setCurrencyReadonly('l2_y26f', total);
}

function calcL2Pendapatan() {
  const total = ['l2_y27a','l2_y27b'].map(id => parseCurrency(document.getElementById(id).value)).reduce((a,b)=>a+b, 0);
  setCurrencyReadonly('l2_y27c', total);
}

function calcL2Aset() {
  const total = ['l2_y28a','l2_y28b'].map(id => parseCurrency(document.getElementById(id).value)).reduce((a,b)=>a+b, 0);
  setCurrencyReadonly('l2_y28c', total);
}

function calcL2Modal() {
  const ids = ['l2_y29a','l2_y29b','l2_y29c','l2_y29d','l2_y29e','l2_y29f'];
  const total = ids.map(id => parseFloat(document.getElementById(id).value) || 0).reduce((a,b)=>a+b, 0);
  const rounded = Math.round(total * 100) / 100;
  document.getElementById('l2_y29g').value = rounded;
  const ind = document.getElementById('l2_y29_indicator');
  if (ind) {
    if (Math.abs(rounded - 100) < 0.01) { ind.textContent = '% ✓ Total = 100%'; ind.style.color = '#38a169'; }
    else { ind.textContent = '% (harus = 100%)'; ind.style.color = '#e53e3e'; }
  }
}

function calcL2Bulanan() {
  // 30. Pengeluaran
  const tp = ['l2_m30a','l2_m30b','l2_m30c','l2_m30d','l2_m30e']
    .map(id => parseCurrency(document.getElementById(id).value)).reduce((a,b)=>a+b, 0);
  setCurrencyReadonly('l2_m30f', tp);
  // 31. Pendapatan
  const tr = ['l2_m31a','l2_m31b'].map(id => parseCurrency(document.getElementById(id).value)).reduce((a,b)=>a+b, 0);
  setCurrencyReadonly('l2_m31c', tr);
  // 32. Aset
  const ta = ['l2_m32a','l2_m32b'].map(id => parseCurrency(document.getElementById(id).value)).reduce((a,b)=>a+b, 0);
  setCurrencyReadonly('l2_m32c', ta);
}

function calcL2Modal33() {
  const ids = ['l2_m33a','l2_m33b','l2_m33c','l2_m33d','l2_m33e','l2_m33f'];
  const total = ids.map(id => parseFloat(document.getElementById(id).value) || 0).reduce((a,b)=>a+b, 0);
  const rounded = Math.round(total * 100) / 100;
  document.getElementById('l2_m33g').value = rounded;
  const ind = document.getElementById('l2_m33_indicator');
  if (ind) {
    if (Math.abs(rounded - 100) < 0.01) { ind.textContent = '% ✓ Total = 100%'; ind.style.color = '#38a169'; }
    else { ind.textContent = '% (harus = 100%)'; ind.style.color = '#e53e3e'; }
  }
}

/* --- L3 handlers --- */
function handleJenisBangunanL() {
  const v = getRadio('l3_jenis_bangunan');
  document.getElementById('l3_lantai_apt_wrap').classList.toggle('hidden', !(v === '3' || v === '4'));
  document.getElementById('l3_bangunan_lain_wrap').classList.toggle('hidden', v !== '5');
  const jmlSec = document.getElementById('l3_jml_keluarga_section');
  if (jmlSec) jmlSec.classList.toggle('hidden', v === '5');
}

function handleJmlKeluargaL() {
  const v = parseInt(document.getElementById('l3_jml_keluarga').value) || 1;
  const wrap = document.getElementById('l3_kk_lain_wrap');
  if (!wrap) return;
  if (v <= 1) { wrap.innerHTML = ''; return; }
  let html = '';
  for (let j = 2; j <= v; j++) {
    html += `<div class="form-group" style="margin-top:8px">
      <label class="field-label">b. Nomor KK Keluarga #${j}</label>
      <input type="text" id="l3_kk_lain_${j}" maxlength="16" placeholder="16 digit Nomor KK"/>
    </div>`;
  }
  wrap.innerHTML = html;
}

function handleMeteranJmlL() {
  const n = Math.min(Math.max(parseInt(document.getElementById('l3_meteran_jml')?.value) || 0, 1), 2);
  const wrap = document.getElementById('l3_meteran_detail_wrap');
  if (!wrap) return;
  const dayaOpts = `<option value="">-- Pilih --</option>
    <option value="450">450</option><option value="900">900</option>
    <option value="1300">1.300</option><option value="2200">2.200</option>
    <option value=">2200">&gt;2.200</option>`;
  let html = '';
  for (let j = 1; j <= n; j++) {
    html += `<div class="inline-fields" style="margin-top:8px">
      <div class="form-group">
        <label class="field-label">b. Daya meteran ${j} (W)</label>
        <select id="l3_meteran_daya${j}">${dayaOpts}</select>
      </div>
      <div class="form-group">
        <label class="field-label">c. ID Pelanggan PLN ${j}</label>
        <input type="text" id="l3_meteran_id${j}" placeholder="ID/Nomor"/>
      </div>
    </div>`;
  }
  wrap.innerHTML = html;
  if (typeof updateProgress === 'function') updateProgress();
}

function handleStatusMilikL() {
  const v = getRadio('l3_status_milik');
  document.getElementById('l3_bukti_wrap').classList.toggle('hidden', v !== '1');
  document.getElementById('l3_status_lain_wrap').classList.toggle('hidden', v !== '5');
  const lbl = document.getElementById('l3_sewa_label');
  if (lbl) {
    const lblMap = {
      '1': '4. Perkiraan sewa sebulan jika disewakan (Rp)',
      '2': '4. Sewa sebulan yang dibayar (Rp)',
      '3': '4. Perkiraan sewa sebulan jika disewakan (Rp)',
      '4': '4. Perkiraan sewa sebulan (Rp)',
      '5': '4. Perkiraan sewa sebulan (Rp)',
    };
    lbl.textContent = lblMap[v] || '4. Perkiraan sewa sebulan (Rp)';
  }
}

function handleBABL() {
  const v = getRadio('l3_bab');
  // kloset only if v ∈ {1,2,3}
  document.getElementById('l3_kloset_wrap').classList.toggle('hidden', !['1','2','3'].includes(v));
  // tinja hidden when no toilet facility (4=MCK umum, 5=ada tapi tidak dipakai, 6=tidak ada)
  const tinjaWrap = document.getElementById('l3_tinja_wrap');
  if (tinjaWrap) tinjaWrap.classList.toggle('hidden', ['4','5','6'].includes(v));
}

function handleLantaiBahanL() {
  const v = getRadio('l3_lantai_bahan');
  const w = document.getElementById('l3_lantai_kondisi_wrap');
  if (w) w.classList.toggle('hidden', ['7','8','9'].includes(v));
}

function handleDindingBahanL() {
  const v = getRadio('l3_dinding_bahan');
  const w = document.getElementById('l3_dinding_kondisi_wrap');
  if (w) w.classList.toggle('hidden', ['6','7'].includes(v));
}

function handleAtapBahanL() {
  const v = getRadio('l3_atap_bahan');
  const w = document.getElementById('l3_atap_kondisi_wrap');
  if (w) w.classList.toggle('hidden', ['5','7','8'].includes(v));
}

function handleListrikL() {
  const v = getRadio('l3_listrik');
  document.getElementById('l3_meteran_wrap').classList.toggle('hidden', v !== '1');
}

function handleAsetMotorL() {
  const v = parseInt(document.getElementById('l3_aset_motor').value) || 0;
  document.getElementById('l3_motor_nilai_wrap').classList.toggle('hidden', v <= 0);
}

function handleAsetMobilL() {
  const v = parseInt(document.getElementById('l3_aset_mobil').value) || 0;
  document.getElementById('l3_mobil_nilai_wrap').classList.toggle('hidden', v <= 0);
}

function handleAsetTanahL() {
  const v = parseInt(document.getElementById('l3_aset_tanah').value) || 0;
  document.getElementById('l3_tanah_nilai_wrap').classList.toggle('hidden', v <= 0);
}

function handleAsetRumahL() {
  const v = parseInt(document.getElementById('l3_aset_rumah').value) || 0;
  document.getElementById('l3_rumah_nilai_wrap').classList.toggle('hidden', v <= 0);
}

/* --- L5 signature (separate canvas from L.UB) --- */
let l5Canvas, l5Ctx, l5Drawing = false, l5HasSig = false;

function initL5Signature() {
  l5Canvas = document.getElementById('l5_sigCanvas');
  if (!l5Canvas) return;
  l5Ctx = l5Canvas.getContext('2d');
  const getPosL5 = (e) => {
    const r = l5Canvas.getBoundingClientRect();
    const scaleX = l5Canvas.width / r.width;
    const scaleY = l5Canvas.height / r.height;
    if (e.touches) return {x:(e.touches[0].clientX - r.left)*scaleX, y:(e.touches[0].clientY - r.top)*scaleY};
    return {x:(e.clientX - r.left)*scaleX, y:(e.clientY - r.top)*scaleY};
  };
  l5Canvas.addEventListener('mousedown', e => { l5Drawing = true; const p=getPosL5(e); l5Ctx.beginPath(); l5Ctx.moveTo(p.x,p.y); });
  l5Canvas.addEventListener('mousemove', e => { if(!l5Drawing) return; const p=getPosL5(e); l5Ctx.lineTo(p.x,p.y); l5Ctx.strokeStyle='#000'; l5Ctx.lineWidth=2; l5Ctx.lineCap='round'; l5Ctx.stroke(); l5HasSig=true; });
  l5Canvas.addEventListener('mouseup',    () => { l5Drawing=false; l5Ctx.beginPath(); if (typeof updateProgress==='function') updateProgress(); _saveL5Sig(); });
  l5Canvas.addEventListener('mouseleave', () => { l5Drawing=false; l5Ctx.beginPath(); });
  l5Canvas.addEventListener('touchstart', e => { e.preventDefault(); l5Drawing=true; const p=getPosL5(e); l5Ctx.beginPath(); l5Ctx.moveTo(p.x,p.y); }, {passive:false});
  l5Canvas.addEventListener('touchmove',  e => { e.preventDefault(); if(!l5Drawing) return; const p=getPosL5(e); l5Ctx.lineTo(p.x,p.y); l5Ctx.strokeStyle='#000'; l5Ctx.lineWidth=2; l5Ctx.lineCap='round'; l5Ctx.stroke(); l5HasSig=true; }, {passive:false});
  l5Canvas.addEventListener('touchend',   () => { l5Drawing=false; l5Ctx.beginPath(); if (typeof updateProgress==='function') updateProgress(); _saveL5Sig(); });
}

/* Simpan tanda tangan L ke localStorage segera setelah setiap stroke selesai.
 * Ini memastikan _sig_l selalu sinkron di LS_KEY (autosave) maupun di named draft (_raw),
 * sehingga draft continue dari daftar.html pun mendapatkan tanda tangan terbaru. */
function _saveL5Sig() {
  if (!l5HasSig || !l5Canvas) return;
  try {
    const sig = l5Canvas.toDataURL('image/png');
    const lsKey     = typeof LS_KEY    !== 'undefined' ? LS_KEY    : 'cawi_se2026_draft_v1';
    const lsDrafts  = typeof LS_DRAFTS !== 'undefined' ? LS_DRAFTS : 'cawi_se2026_drafts_v1';
    // 1. Update autosave entry (LS_KEY)
    const raw = JSON.parse(localStorage.getItem(lsKey) || '{}');
    raw['_sig_l'] = sig;
    localStorage.setItem(lsKey, JSON.stringify(raw));
    // 2. Update named draft entry (_raw._sig_l) agar continueDraft() ikut terbaru
    const cid = typeof _currentDraftId !== 'undefined' ? _currentDraftId : null;
    if (cid) {
      const list = JSON.parse(localStorage.getItem(lsDrafts) || '[]');
      const idx = list.findIndex(function(d) { return d._draftId === cid; });
      if (idx >= 0 && list[idx]._raw) {
        list[idx]._raw['_sig_l'] = sig;
        localStorage.setItem(lsDrafts, JSON.stringify(list));
      }
    }
  } catch(e) {}
}

function clearSignatureL() {
  if (!l5Canvas || !l5Ctx) return;
  l5Ctx.clearRect(0, 0, l5Canvas.width, l5Canvas.height);
  l5HasSig = false;
  if (typeof updateProgress === 'function') updateProgress();
}

/* --- Auto-split alamat 18i → 18j (nama jalan) & 18k (nomor rumah) --- */
function _autoSplitAlamat18i(val) {
  var jEl = document.getElementById('l1_nama_jalan');
  var nEl = document.getElementById('l1_no_rumah');
  if (!jEl || !nEl) return;
  if (!val) { jEl.value = ''; nEl.value = ''; return; }
  // Ekstrak nomor rumah: setelah "No." / "Nomor " / "No " (case-insensitive)
  var nomorMatch = val.match(/\bNo\.?\s*(\d+[A-Za-z]?)/i) || val.match(/\bNomor\s+(\d+[A-Za-z]?)/i);
  var nomor = nomorMatch ? nomorMatch[1] : '';
  // Ekstrak nama jalan: strip prefix Jl./Jalan/Gang/Gg., ambil sampai sebelum "No."/"RT"/"RW"/","
  var stripped = val.replace(/^(Jl\.|Jalan|Gang|Gg\.)\s+/i, '');
  var jalanMatch = stripped.match(/^(.+?)(?:\s+No\.?\s|\s+RT[\s\d]|\s+RW[\s\d]|,|$)/i);
  var jalan = jalanMatch ? jalanMatch[1].trim() : stripped.split(',')[0].trim();
  jEl.value = jalan;
  nEl.value = nomor;
}

/* --- L mode KBLI search (separate from L.UB) --- */
function filterKBLIL() {
  const inp = document.getElementById('l2_kbli_search');
  if (!inp || typeof kbliData === 'undefined' || !kbliData.length) return;
  const q = inp.value.toLowerCase().trim();
  const drop = document.getElementById('kbliLDrop');
  if (!drop) return;
  if (!q || q.length < 2) { drop.style.display = 'none'; return; }
  const tokens = q.split(/\s+/).filter(Boolean);
  const scored = kbliData.map(d => {
    const text = ((d.kode || '') + ' ' + (d.judul || '') + ' ' + (d.uraian || '')).toLowerCase();
    let s = 0;
    tokens.forEach(t => { if (text.includes(t)) s++; });
    return { d, s };
  }).filter(x => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 12);
  if (!scored.length) { drop.innerHTML = '<div class="ac-item" style="color:#aaa">Tidak ada hasil</div>'; drop.style.display = 'block'; return; }
  drop.innerHTML = scored.map(({d}) =>
    `<div class="ac-item" onmousedown="selectKBLIL(${JSON.stringify(d).replace(/"/g,'&quot;')})">
      <div><strong>${d.kode}</strong> — ${d.judul}</div>
      <div class="ac-sub">${(d.uraian || '').slice(0,120)}</div>
    </div>`).join('');
  drop.style.display = 'block';
}

function hideKBLILDrop() {
  setTimeout(() => {
    const drop = document.getElementById('kbliLDrop');
    if (drop) drop.style.display = 'none';
  }, 200);
}

function selectKBLIL(entry) {
  const kodeEl = document.getElementById('l2_kbli_kode');
  const katEl  = document.getElementById('l2_kbli_kategori');
  const katDis = document.getElementById('l2_kbli_kategori_display');
  const inp    = document.getElementById('l2_kbli_search');
  const chip   = document.getElementById('l2_kbli_chip');
  const chipT  = document.getElementById('l2_kbli_chip_text');
  const chipU  = document.getElementById('l2_kbli_chip_uraian');
  if (kodeEl) kodeEl.value = entry.kode;
  if (katEl)  katEl.value  = (typeof getKategoriFromKode === 'function') ? getKategoriFromKode(entry.kode) : '';
  if (katDis) katDis.value = (typeof getKategoriName === 'function' && katEl) ? getKategoriName(katEl.value) : (katEl ? katEl.value : '');
  if (inp)    inp.value    = entry.kode + ' — ' + entry.judul;
  if (chip)   chip.style.display = 'flex';
  if (chipT)  chipT.textContent = entry.kode + ' — ' + entry.judul;
  if (chipU)  chipU.textContent = entry.uraian || '';
  const drop = document.getElementById('kbliLDrop');
  if (drop) drop.style.display = 'none';
  // Show hotel wrap if KBLI starts with akomodasi prefix (551)
  const wrap = document.getElementById('l2_hotel_wrap');
  if (wrap) wrap.classList.toggle('hidden', !(entry.kode || '').startsWith('551'));
  if (window.kbliFilters) window.kbliFilters.apply(entry.kode);
}

function clearKBLIL() {
  ['l2_kbli_kode','l2_kbli_kategori','l2_kbli_kategori_display','l2_kbli_search'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const chip = document.getElementById('l2_kbli_chip');
  if (chip) chip.style.display = 'none';
  const wrap = document.getElementById('l2_hotel_wrap');
  if (wrap) wrap.classList.add('hidden');
  if (window.kbliFilters) window.kbliFilters.apply('');
}

/* ====== L MODE EDIT MODE LOADER ====== */
/*
 * loadEditModeL(r) — populate L mode form from a submitted record `r`.
 * Returns true on success.
 */
function loadEditModeL(r) {
  try {
    const setVal = (id, v) => {
      if (v == null || v === '') return;
      const el = document.getElementById(id);
      if (!el) return;
      el.value = v;
      el.dispatchEvent(new Event('input',  {bubbles:true}));
      el.dispatchEvent(new Event('change', {bubbles:true}));
    };
    const setRadio = (name, v) => {
      if (v == null || v === '') return;
      const radio = document.querySelector(`input[name="${name}"][value="${v}"]`);
      if (radio) { radio.checked = true; radio.dispatchEvent(new Event('change', {bubbles:true})); }
    };
    const setCurrency = (id, v) => {
      if (v == null || v === '' || v === 0) return;
      const el = document.getElementById(id);
      if (!el) return;
      el.value = Number(v).toLocaleString('id-ID');
      el.dispatchEvent(new Event('input', {bubbles:true}));
    };

    // === BLOK I ===
    setVal('l1_nama_kk', r.nama_kk);
    setVal('l1_nik_kk', r.nik_kk);
    setVal('l1_no_kk', r.no_kk);
    setVal('l1_jml_kk_anggota', r.jml_anggota);
    // Alamat KK: cascade provinsi → kab → kec → kel dengan update display text
    // setVal tidak digunakan agar onchange tidak memicu double-load;
    // setiap level di-set langsung lalu display input (_inp) diperbarui manual.
    (function() {
      const _setDirect = (id, val) => {
        const el = document.getElementById(id);
        if (el && val != null && val !== '') el.value = val;
      };
      const _syncDisp = (id) => {
        const sel = document.getElementById(id);
        const inp = document.getElementById(id + '_inp');
        if (!sel || !inp) return;
        const opt = sel.options[sel.selectedIndex];
        if (opt && opt.value && opt.text) { inp.value = opt.text; inp.classList.add('has-value'); }
      };
      if (!r.provinsi_kd) return;
      _setDirect('l1_alamat_provinsi', r.provinsi_kd);
      _syncDisp('l1_alamat_provinsi');
      // loadKabupatenL bisa async (API) atau sync (static data) — gunakan Promise.resolve()
      Promise.resolve(typeof loadKabupatenL === 'function' ? loadKabupatenL(r.provinsi_kd) : null)
        .then(() => {
          _setDirect('l1_alamat_kab', r.kabupaten_kd);
          _syncDisp('l1_alamat_kab');
          if (r.kabupaten_kd && typeof loadKecamatanL === 'function') {
            loadKecamatanL(r.kabupaten_kd); // sinkron (STATIC_KECAMATAN)
            _setDirect('l1_alamat_kec', r.kecamatan_kd);
            _syncDisp('l1_alamat_kec');
            if (r.kecamatan_kd && typeof loadKelurahanL === 'function') {
              loadKelurahanL(r.kecamatan_kd); // sinkron (STATIC_KELURAHAN)
              _setDirect('l1_alamat_kel', r.kelurahan_kd);
              _syncDisp('l1_alamat_kel');
            }
          }
        });
    })();
    setRadio('l1_klasifikasi', r.klasifikasi);
    setVal('l1_kodepos', r.kode_pos);
    setVal('l1_kode_sls', r.kode_sls);
    setVal('l1_nama_sls', r.nama_sls);
    setVal('l1_alamat_detail', r.alamat_detail);
    setVal('l1_nama_jalan', r.nama_jalan);
    setVal('l1_no_rumah', r.no_rumah);
    setRadio('l1_sesuai_kk', r.sesuai_kk);

    // Render anggota cards then populate
    if (typeof renderAnggotaCards === 'function') renderAnggotaCards();
    setTimeout(() => {
      try {
        const anggota = r.anggota_data ? JSON.parse(r.anggota_data) : [];
        anggota.forEach(a => {
          const i = a.no;
          setVal('l_ang_' + i + '_nama', a.nama);
          setVal('l_ang_' + i + '_nik', a.nik);
          setVal('l_ang_' + i + '_hubungan', a.hubungan);
          setRadio('l_ang_' + i + '_keberadaan', a.keberadaan);
          if (a.stop_state === 1 || a.stop_state === '1') return;
          setRadio('l_ang_' + i + '_alamat_dom', a.alamat_dom);
          setVal('l_ang_' + i + '_dn_provinsi', a.dn_provinsi);
          setVal('l_ang_' + i + '_dn_kab', a.dn_kab);
          setVal('l_ang_' + i + '_ln_negara', a.ln_negara);
          setRadio('l_ang_' + i + '_kawin', a.kawin);
          setRadio('l_ang_' + i + '_jk', a.jk);
          setVal('l_ang_' + i + '_tgl_lahir', a.tgl_lahir);
          if (typeof computeUmurAnggota === 'function') computeUmurAnggota(i);
          setRadio('l_ang_' + i + '_sekolah', a.sekolah);
          setRadio('l_ang_' + i + '_ijazah', a.ijazah);   // radio, bukan setVal
          setRadio('l_ang_' + i + '_rekening', a.rekening);
          setVal('l_ang_' + i + '_profesi', a.profesi);
          setRadio('l_ang_' + i + '_kedudukan', a.kedudukan); // radio, bukan setVal
          setRadio('l_ang_' + i + '_18a', a.pend_18a);
          setCurrency('l_ang_' + i + '_18a_nilai', a.pend_18a_nilai);
          setRadio('l_ang_' + i + '_18b', a.pend_18b);
          setCurrency('l_ang_' + i + '_18b_nilai', a.pend_18b_nilai);
          setRadio('l_ang_' + i + '_18c', a.pend_18c);
          setCurrency('l_ang_' + i + '_18c_nilai', a.pend_18c_nilai);
          if (a.disab) {
            const parts = String(a.disab).split('|');
            ['a','b','c','d','e','f'].forEach((s, idx) => setRadio('l_ang_' + i + '_disab_' + s, parts[idx]));
          }
          if (a.kronis) {
            const parts = String(a.kronis).split('|');
            ['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p'].forEach((s, idx) =>
              setRadio('l_ang_' + i + '_kronis_' + s, parts[idx]));
          }
          setVal('l_ang_' + i + '_kronis_q_lain', a.kronis_lain);
          // Sync searchable select display texts (profesi, hubungan, dn_provinsi, dll)
          // setelah setVal, _inp text wajib disync manual karena makeSearchable tidak auto-update
          ['hubungan', 'profesi', 'dn_provinsi'].forEach(field => {
            const sel = document.getElementById('l_ang_' + i + '_' + field);
            if (!sel || !sel.value) return;
            const inp = document.getElementById('l_ang_' + i + '_' + field + '_inp');
            if (!inp) return;
            const opt = Array.from(sel.options).find(o => o.value === sel.value);
            if (opt) { inp.value = opt.text; inp.classList.add('has-value'); }
          });
        });
      } catch(_e) { console.warn('Gagal parse anggota_data:', _e); }
      if (typeof updateProgress === 'function') updateProgress();
    }, 300);

    // === BLOK II ===
    setVal('l2_nama_usaha', r.nama_usaha);
    setVal('l2_nama_komersial', r.nama_komersial);
    setVal('l2_alamat', r.alamat_usaha);
    setVal('l2_rt', r.rt); setVal('l2_rw', r.rw);
    setVal('l2_kodepos', r.kodepos_usaha);
    setVal('l2_email', r.email_usaha);
    setVal('l2_website', r.website_usaha);
    setVal('l2_hp', r.hp_usaha);
    setRadio('l2_kawasan', r.kawasan);
    setVal('l2_nama_kawasan', r.nama_kawasan);
    setRadio('l2_jenis_usaha', r.jenis_usaha);
    setVal('l2_lokasi_alamat', r.lokasi_alamat);
    setVal('l2_lokasi_provinsi', r.lokasi_provinsi);
    setVal('l2_lokasi_kab', r.lokasi_kab);
    setRadio('l2_punya_nib', r.punya_nib);
    setVal('l2_nib', r.nib);
    setRadio('l2_nib_alasan', r.nib_alasan);
    setVal('l2_nib_alasan_lain', r.nib_alasan_lain);
    setRadio('l2_badan_usaha', r.badan_usaha);
    setVal('l2_pengusaha_nama', r.pengusaha_nama);
    setRadio('l2_pengusaha_jk', r.pengusaha_jk);
    setVal('l2_pengusaha_umur', r.pengusaha_umur);
    setVal('l2_pengusaha_nik', r.pengusaha_nik);
    setVal('l2_kegiatan_utama', r.kegiatan_utama);
    setRadio('l2_b1', r.b1); setRadio('l2_b2', r.b2);
    setRadio('l2_b3', r.b3); setRadio('l2_b4', r.b4);
    setRadio('l2_c', r.c);
    setVal('l2_input', r.input_bahan);
    setVal('l2_proses', r.proses_produksi);
    setVal('l2_produk_utama', r.produk_utama);
    setVal('l2_kbli_kode', r.kbli_kode);
    setVal('l2_kbli_search', r.kbli_judul);
    setVal('l2_kbli_kategori', r.kbli_kategori);
    // KBLI chip — defer until kbliData resolves (preloadKBLI adalah singleton)
    if (r.kbli_kode) {
      // Terapkan filter KBLI segera (aman meski CSV belum selesai)
      if (window.kbliFilters) {
        window.kbliFilters.apply(r.kbli_kode);
        window.kbliFilters.load().then(() => window.kbliFilters.apply(r.kbli_kode));
      }
      if (typeof preloadKBLI === 'function') {
        preloadKBLI().then(() => {
          const entry = kbliData.find(d => d.kode === r.kbli_kode);
          if (entry && typeof selectKBLIL === 'function') selectKBLIL(entry);
        });
      }
    }
    setRadio('l2_hotel', r.klasifikasi_hotel);
    setRadio('l2_jaringan', r.jaringan);
    setVal('l2_jml_cabang', r.jml_cabang);
    setVal('l2_kp_nama', r.kp_nama);
    setVal('l2_kp_negara', r.kp_negara);
    setVal('l2_kp_alamat', r.kp_alamat);
    setVal('l2_kp_email', r.kp_email);
    setVal('l2_kp_provinsi', r.kp_provinsi);
    setVal('l2_kp_kab', r.kp_kab);
    setRadio('l2_internet', r.internet);
    setRadio('l2_halal', r.halal);
    setVal('l2_halal_b', r.halal_b); setVal('l2_halal_c', r.halal_c);
    setRadio('l2_bpom', r.bpom);
    setVal('l2_bpom_b', r.bpom_b); setVal('l2_bpom_c', r.bpom_c);
    setVal('l2_pekerja_l', r.pekerja_l);
    setVal('l2_pekerja_p', r.pekerja_p);
    setVal('l2_pekerja_dibayar', r.pekerja_dibayar);
    setVal('l2_pekerja_tidak_dibayar', r.pekerja_tidak_dibayar);
    setVal('l2_tahun_operasi', r.tahun_operasi);
    ['a','b','c','d','e','f'].forEach(s => setCurrency('l2_y26' + s, r['y26' + s]));
    ['a','b','c'].forEach(s => setCurrency('l2_y27' + s, r['y27' + s]));
    setVal('l2_y27d', r.y27d);
    ['a','b','c'].forEach(s => setCurrency('l2_y28' + s, r['y28' + s]));
    setVal('l2_y28c1', r.y28c1); setVal('l2_y28d', r.y28d);
    ['a','b','c','d','e','f','g'].forEach(s => setVal('l2_y29' + s, r['y29' + s]));
    ['a','b','c','d','e','f'].forEach(s => setCurrency('l2_m30' + s, r['m30' + s]));
    ['a','b','c'].forEach(s => setCurrency('l2_m31' + s, r['m31' + s]));
    setVal('l2_m31d', r.m31d);
    if (r.m31e) String(r.m31e).split(',').forEach(idx => {
      const cb = document.getElementById('l2_m31e_' + idx); if (cb) cb.checked = true;
    });
    ['a','b','c'].forEach(s => setCurrency('l2_m32' + s, r['m32' + s]));
    setVal('l2_m32c1', r.m32c1); setVal('l2_m32d', r.m32d);
    ['a','b','c','d','e','f','g'].forEach(s => setVal('l2_m33' + s, r['m33' + s]));

    // === BLOK III ===
    setRadio('l3_jenis_bangunan', r.jenis_bangunan);
    setVal('l3_lantai_apt', r.lantai_apt);
    setVal('l3_bangunan_lain', r.bangunan_lain);
    setVal('l3_jml_keluarga', r.jml_keluarga_rumah);
    setVal('l3_kk_lain', r.kk_lain);
    setRadio('l3_status_milik', r.status_milik);
    setRadio('l3_bukti', r.bukti);
    setVal('l3_status_lain', r.status_lain);
    setCurrency('l3_sewa', r.sewa);
    setVal('l3_luas_lantai', r.luas_lantai);
    setRadio('l3_lantai_bahan', r.lantai_bahan);   setRadio('l3_lantai_kondisi',  r.lantai_kondisi);
    setRadio('l3_dinding_bahan', r.dinding_bahan); setRadio('l3_dinding_kondisi', r.dinding_kondisi);
    setRadio('l3_atap_bahan', r.atap_bahan);       setRadio('l3_atap_kondisi',    r.atap_kondisi);
    setRadio('l3_bab', r.bab);
    setRadio('l3_kloset', r.kloset);
    setRadio('l3_tinja', r.tinja);
    setVal('l3_air', r.air);
    setRadio('l3_listrik', r.listrik);
    setVal('l3_meteran_jml', r.meteran_jml);
    setVal('l3_meteran_daya1', r.meteran_daya1); setVal('l3_meteran_daya2', r.meteran_daya2);
    setVal('l3_meteran_id1', r.meteran_id1); setVal('l3_meteran_id2', r.meteran_id2);
    setCurrency('l3_listrik_bln', r.listrik_bln); setCurrency('l3_pulsa_bln', r.pulsa_bln);
    setCurrency('l3_makanan_mgg', r.makanan_mgg);
    setCurrency('l3_nonmakanan_bln', r.nonmakanan_bln);
    setCurrency('l3_nonmakanan_thn', r.nonmakanan_thn);
    ['gas3','gas5','kulkas','ac','emas','komputer','motor','mobil','tanah','rumah'].forEach(k =>
      setVal('l3_aset_' + k, r['aset_' + k]));
    ['motor','mobil','tanah','rumah'].forEach(k => setCurrency('l3_aset_' + k + '_nilai', r['aset_' + k + '_nilai']));

    // === BLOK IV ===
    setVal('l4_catatan', r.catatan_pendata);

    // === BLOK V ===
    setVal('l5_petugas_nama', r.petugas_nama);
    setVal('l5_petugas_nip', r.petugas_nip);
    setVal('l5_petugas_hp', r.petugas_hp);
    setVal('l5_responden_nama', r.responden_nama);
    setVal('l5_responden_hp', r.responden_hp);
    setVal('l5_responden_email', r.responden_email);
    setVal('l5_tanggal', (r.tanggal_pelaksanaan || '').substring(0, 10));
    // Tanda tangan: server menyimpan "[ada]"/("[kosong]") bukan data aktual.
    // Hanya restore jika nilai adalah base64 data URL (misal dari draft lokal).
    const _ttd = r.tanda_tangan || '';
    if (_ttd.startsWith('data:image/') && typeof l5Canvas !== 'undefined' && l5Canvas && typeof l5Ctx !== 'undefined' && l5Ctx) {
      const img = new Image();
      img.onload = () => {
        l5Ctx.clearRect(0, 0, l5Canvas.width, l5Canvas.height);
        l5Ctx.drawImage(img, 0, 0);
        l5HasSig = true;
        if (typeof updateProgress === 'function') updateProgress();
      };
      img.src = _ttd;
      const hintL = document.getElementById('l5_sig_hint');
      if (hintL) hintL.textContent = 'Tanda tangan dimuat dari data sebelumnya.';
    } else {
      // Server menyimpan TTD ke Drive — tidak bisa dipulihkan di sini
      const hintL = document.getElementById('l5_sig_hint');
      if (hintL && _ttd) hintL.textContent = 'Tanda tangan sebelumnya tersimpan di server. Silakan tanda tangan ulang.';
    }
    _editRecordId = r._id || null;
    if (typeof updateProgress === 'function') updateProgress();
    return true;
  } catch(e) { console.error('Gagal load edit mode L:', e); return false; }
}

initL5Signature();
