/* ====== AUTO-SAVE (localStorage) ====== */
const LS_KEY    = 'cawi_se2026_draft_v1';
const LS_DRAFTS = 'cawi_se2026_drafts_v1';
let _autosaveTimer  = null;
let _currentDraftId = null; // ID draft yang sedang dilanjutkan

/* Tulis isian roster yang SEDANG diedit ke penyimpanannya sebelum draft di-serialize.
 * Tanpa ini, autosave/_saveDraftSilent menyimpan store usaha yang basi → isian
 * roster usaha (+ cabang L.KP) yang sedang diketik hilang. Anggota tidak perlu
 * di-sync (input l_ang_* adalah DOM nyata di pool/layar → tertangkap langsung). */
function _syncActiveRosterForms() {
  try {
    if (typeof _activeUsahaIdx !== 'undefined' && _activeUsahaIdx != null
        && typeof serializeCurrentUsahaForm === 'function') {
      serializeCurrentUsahaForm(_activeUsahaIdx); // → _usahaDataStore + #l_usaha_all_data
    }
  } catch (e) {}
}

/* Identitas petugas aktif untuk registry assignment (server). Utamakan sesi
 * portal (sessionStorage), fallback ke field assignment. */
function _activePetugasMeta() {
  try {
    const a = JSON.parse(sessionStorage.getItem('cawi_petugas_aktif') || 'null');
    if (a && a.email) return a;
  } catch (e) {}
  const asg = (typeof window !== 'undefined' && window.__cawiActiveAssignment) || {};
  return {
    nama: asg.petugas_nama || '', email: asg.petugas_email || '',
    peran: asg.petugas_peran || 'PPL', pml_email: asg.pml_email || ''
  };
}

/* Kategori bangunan (keluarga/usaha/lainnya) untuk filter & monitoring. Utamakan
 * window.__cawiStage (hasil gate Blok P: 'keluarga'|'usaha'|'none'); fallback baca
 * Kode Penggunaan Bangunan langsung. Selaras PetugasManager.kategoriFromKode. */
function _deriveKategori() {
  try {
    const stg = (typeof window !== 'undefined' && window.__cawiStage) || '';
    if (stg === 'keluarga' || stg === 'usaha') return stg;
    if (stg === 'none') return 'lainnya';
    const kb = (typeof getVal === 'function') ? getVal('pmt_kode_bangunan') : '';
    if (kb === '2' || kb === '3') return 'keluarga';
    if (kb === '1' || kb === '7') return 'usaha';
    if (kb === '4' || kb === '5' || kb === '6' || kb === '8') return 'lainnya';
  } catch (e) {}
  return '';
}

/* Buang lampiran base64 (foto rumah, tanda tangan) dari objek collectData supaya
 * blob isian draft tetap kecil & aman di sel Sheet. Field teks (termasuk
 * anggota_data/usaha_data yang sudah berupa JSON string) dipertahankan utuh. */
function _stripHeavy(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const out = {};
  Object.keys(obj).forEach(function (k) {
    const v = obj[k];
    out[k] = (typeof v === 'string' && v.indexOf('data:') === 0) ? '[lampiran ada]' : v;
  });
  return out;
}

/* Kirim SNAPSHOT isian (collectDataP + collectDataL) ke Sheet (fire-and-forget)
 * supaya pegawai & PML bisa MEMERIKSA jawaban draft lintas perangkat, bukan hanya
 * persentase. Lampiran base64 di-strip. Mode LIHAT (read-only) di-skip. */
function _pushDraftContent(status) {
  try {
    if (typeof window !== 'undefined' && window.__cawiReadOnly) return;
    const asg = (typeof window !== 'undefined' && window.__cawiActiveAssignment) || null;
    if (!asg || !asg.id) return;
    const url = (typeof getScriptUrl === 'function') ? getScriptUrl() : null;
    if (!url) return;
    const who = _activePetugasMeta();
    const unified = (typeof isUnifiedMode === 'function') && isUnifiedMode();
    const stage = (typeof computeStageFromP === 'function') ? computeStageFromP() : 'none';
    const blob = { stage: stage };
    if (unified && typeof collectDataP === 'function') blob.p = _stripHeavy(collectDataP());
    // Sertakan kuesioner L: unified stage keluarga/usaha, atau mode L legacy.
    const wantL = unified
      ? (stage === 'keluarga' || stage === 'usaha')
      : ((typeof getFormMode === 'function') ? getFormMode() === 'l' : true);
    if (wantL && typeof collectDataL === 'function') blob.l = _stripHeavy(collectDataL());
    const payload = {
      action: 'saveDraftContent', cawi_id: asg.id,
      status: status || 'draft', formMode: 'p',
      petugas_email: who.email || asg.petugas_email || '',
      pml_email: who.pml_email || asg.pml_email || '',
      data: JSON.stringify(blob)
    };
    fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload), keepalive: true
    }).catch(function () {});
  } catch (e) {}
}

/* Kirim metadata + progress assignment ke Sheet (fire-and-forget) supaya pegawai
 * bisa memantau lewat daftar.html lintas perangkat. Tidak memblokir UI; gagal =
 * diabaikan (draft lokal tetap jalan). Hanya untuk alur assignment (ada cawi_id). */
function _pushAssignmentMeta(status) {
  try {
    // Mode LIHAT (assignment sudah submitted, dibuka tanpa Editing): jangan kirim
    // apa pun supaya status "submitted" + progress tidak ter-downgrade ke "draft".
    if (typeof window !== 'undefined' && window.__cawiReadOnly) return;
    const asg = (typeof window !== 'undefined' && window.__cawiActiveAssignment) || null;
    if (!asg || !asg.id) return;
    const who = _activePetugasMeta();
    const pp = (typeof calcProgress === 'function') ? calcProgress() : { pct: 0, filled: 0, total: 0 };
    const url = (typeof getScriptUrl === 'function') ? getScriptUrl() : null;
    if (!url) return;
    const payload = {
      action: 'saveAssignmentMeta',
      cawi_id: asg.id,
      jenis: asg.jenis || 'UNIFIED',
      kategori: _deriveKategori(),
      status: status || 'draft',
      progress: pp.pct || 0, filled: pp.filled || 0, total: pp.total || 0,
      petugas_nama: who.nama || asg.petugas_nama || '',
      petugas_email: who.email || asg.petugas_email || '',
      petugas_peran: who.peran || asg.petugas_peran || 'PPL',
      pml_email: who.pml_email || asg.pml_email || '',
      nama_responden: asg.nama_responden || '',
      provinsi: asg.provinsi || '', provinsi_kd: asg.provinsi_kd || '',
      kabupaten: asg.kabupaten || '', kabupaten_kd: asg.kabupaten_kd || '',
      kecamatan: asg.kecamatan || '', kecamatan_kd: asg.kecamatan_kd || '',
      desa: asg.desa || '', desa_kd: asg.desa_kd || '',
      sls_nama: asg.sls_nama || '', sls_kd: asg.sls_kd || '',
      sls_full_kd: asg.sls_full_kd || '', subsls_kd: asg.subsls_kd || ''
    };
    fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload), keepalive: true
    }).catch(function () {});
  } catch (e) {}
}

function saveDraft() {
  try {
    _syncActiveRosterForms();
    const vals = {};
    const _roIds = [];
    document.querySelectorAll('input[id]:not([type=radio]):not([type=checkbox]),textarea[id],select[id]').forEach(el => {
      if (!el.id) return;
      // Field readonly/derived (umur, nama+NIK kepala keluarga terkunci, dll) tetap
      // disimpan sebagai safety-net: kalau derivasi gagal saat restore, nilainya
      // tak hilang. Ditandai di _ro agar restore boleh mengisinya langsung.
      if (el.readOnly) { if (el.value) { vals[el.id] = el.value; _roIds.push(el.id); } return; }
      vals[el.id] = el.value;
    });
    if (_roIds.length) vals['_ro'] = _roIds;
    document.querySelectorAll('input[type=radio]:checked').forEach(el => {
      vals['_r_' + el.name] = el.value;
    });
    // Checkbox state (L mode uses checkboxes, e.g., l2_m31e_*)
    document.querySelectorAll('input[type=checkbox][id]').forEach(el => {
      vals['_c_' + el.id] = el.checked ? '1' : '0';
    });
    if (typeof l5HasSig !== 'undefined' && l5HasSig && typeof l5Canvas !== 'undefined' && l5Canvas) {
      try { vals['_sig_l'] = l5Canvas.toDataURL('image/png'); } catch(e) {}
    }
    vals['_formMode'] = (typeof getFormMode === 'function') ? getFormMode() : 'l';
    vals['_ts'] = new Date().toISOString();
    // Snapshot progress agar portal (index.html) bisa tampilkan % tanpa load form
    try {
      if (typeof calcProgress === 'function') {
        var _pp = calcProgress();
        vals['_progress'] = _pp.pct;
        vals['_pfilled']  = _pp.filled;
        vals['_ptotal']   = _pp.total;
      }
    } catch (e) {}
    localStorage.setItem(LS_KEY, JSON.stringify(vals));
    // Update status indicator
    const dot = document.getElementById('autosaveDot');
    const txt = document.getElementById('autosaveText');
    if (dot) { dot.style.background = '#68d391'; setTimeout(() => { dot.style.background='rgba(255,255,255,.2)'; }, 2000); }
    if (txt) { const t=new Date(); txt.textContent='Tersimpan '+String(t.getHours()).padStart(2,'0')+':'+String(t.getMinutes()).padStart(2,'0'); }
    // Sinkron metadata+progress ke server (fire-and-forget) untuk monitoring pegawai.
    _pushAssignmentMeta('draft');
    // Sinkron SNAPSHOT isian agar pegawai/PML bisa memeriksa jawaban draft.
    _pushDraftContent('draft');
  } catch(e) { console.error('Gagal simpan draft:', e); }
}

function scheduleAutosave() {
  if (_autosaveTimer) clearTimeout(_autosaveTimer);
  _autosaveTimer = setTimeout(saveDraft, 60000);
}

function restoreDraft() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    const vals = JSON.parse(raw);
    // Restore form mode FIRST so visible container matches before populating
    if (vals['_formMode'] && typeof setFormMode === 'function') {
      setFormMode(vals['_formMode']);
      if (typeof applyFormMode === 'function') applyFormMode(vals['_formMode']);
    }
    // L mode: ensure anggota cards rendered before populating per-anggota fields
    try {
      if (vals['_formMode'] === 'l' && vals['l1_jml_kk_anggota'] && typeof renderAnggotaCards === 'function') {
        const inp = document.getElementById('l1_jml_kk_anggota');
        if (inp) { inp.value = vals['l1_jml_kk_anggota']; renderAnggotaCards(); }
      }
    } catch (e) { console.error('restore render anggota gagal:', e); }
    // Restore inputs / selects / textareas.
    // PENTING: tiap field dibungkus try/catch sendiri. Handler change/input
    // sebuah field (mis. updateProgress→calcProgressL pada form yang masih
    // setengah terbangun) bisa melempar exception; tanpa isolasi ini, satu
    // field gagal akan MENGGUGURKAN restore SELURUH field sesudahnya (gejala:
    // hanya Blok P awal yang ke-restore, sisanya kosong).
    Object.keys(vals).forEach(key => {
      try {
        if (key.startsWith('_r_')) {
          const name = key.slice(3);
          const radio = document.querySelector(`input[name="${name}"][value="${vals[key]}"]`);
          if (radio) { radio.checked = true; radio.dispatchEvent(new Event('change', {bubbles:true})); }
        } else if (key.startsWith('_c_')) {
          const id = key.slice(3);
          const cb = document.getElementById(id);
          if (cb && cb.type === 'checkbox') cb.checked = (vals[key] === '1');
        } else if (!key.startsWith('_')) {
          const el = document.getElementById(key);
          if (el && !el.readOnly && !el.disabled) {
            el.value = vals[key];
            el.dispatchEvent(new Event('input', {bubbles:true}));
            el.dispatchEvent(new Event('change', {bubbles:true}));
          } else if (!el && vals[key]) {
            // Backward-compat: key may belong to a radio group (e.g. field converted from select→radio)
            if (!document.querySelector(`input[type=radio][name="${key}"]:checked`)) {
              const radio = document.querySelector(`input[type=radio][name="${key}"][value="${vals[key]}"]`);
              if (radio) { radio.checked = true; radio.dispatchEvent(new Event('change', {bubbles:true})); }
            }
          }
        }
      } catch (e) { /* lanjut ke field berikutnya — jangan gugurkan sisa restore */ }
    });
    // Restore KBLI chip & kbliFilters (form L)
    const savedKodeL = vals['l2_kbli_kode'];
    try {
      if (savedKodeL && typeof kbliData !== 'undefined' && kbliData.length) {
        const entryL = kbliData.find(d => d.kode === savedKodeL);
        if (entryL && typeof selectKBLIL === 'function') selectKBLIL(entryL);
      }
    } catch (e) { console.error('restore KBLI gagal:', e); }
    // Re-apply kbliFilters setelah restore.
    // 1) Panggil apply() SEGERA (sinkron) agar seksi Halal/BPOM langsung tersembunyi
    //    tanpa menunggu CSV selesai dimuat (aman karena untuk KBLI di luar Halal/BPOM
    //    hasilnya tetap benar meski Set masih kosong).
    // 2) Setelah CSV selesai dimuat, panggil lagi agar kode yg ADA di daftar Halal/BPOM
    //    ditampilkan kembali dengan benar (singleton load() mencegah double-fetch).
    (function() {
      const restKbli = savedKodeL;
      if (restKbli && window.kbliFilters) {
        window.kbliFilters.apply(restKbli);                              // (1) langsung
        window.kbliFilters.load().then(function() {                      // (2) setelah load
          window.kbliFilters.apply(restKbli);
        });
      }
    })();
    // Resync SEMUA searchable select display texts (L.UB + L mode + anggota cards)
    // Tangani seluruh select[data-ss-init] sekaligus — profesi, hubungan, provinsi, dll.
    try {
      document.querySelectorAll('select[data-ss-init]').forEach(sel => {
        if (!sel.value) return;
        const inp = document.getElementById(sel.id + '_inp');
        if (!inp) return;
        const opt = Array.from(sel.options).find(o => o.value === sel.value);
        if (opt) { inp.value = opt.text; inp.classList.add('has-value'); }
      });
    } catch (e) { console.error('restore searchable select gagal:', e); }
    // Restore L mode signature
    try {
      if (vals['_sig_l'] && typeof l5Canvas !== 'undefined' && l5Canvas && typeof l5Ctx !== 'undefined' && l5Ctx) {
        const imgL = new Image();
        imgL.onload = () => { l5Ctx.clearRect(0,0,l5Canvas.width,l5Canvas.height); l5Ctx.drawImage(imgL,0,0); l5HasSig=true; updateProgress(); };
        imgL.src = vals['_sig_l'];
      }
    } catch (e) { console.error('restore signature gagal:', e); }
    const hintL = document.getElementById('l5_sig_hint');
    if (hintL && vals['_sig_l']) hintL.textContent = 'Tanda tangan dimuat dari draft';
    dismissRestore();
    // L mode: rebuild usaha roster dari hidden input #l_usaha_all_data (restored above)
    try {
      if (typeof syncUsahaStoreFromDom === 'function') syncUsahaStoreFromDom();
      if (typeof renderUsahaRoster   === 'function') renderUsahaRoster();
    } catch (e) { console.error('restore usaha roster gagal:', e); }
    // L mode: pastikan anggota #1 = Kepala Keluarga (skip bila draft sudah punya anggota)
    try {
      if (vals['_formMode'] === 'l' && typeof ensureKepalaKeluarga === 'function') ensureKepalaKeluarga();
    } catch (e) { console.error('restore kepala keluarga gagal:', e); }
    // L mode: pulihkan pilihan "Pemberi Jawaban" (Blok V) — opsi anggota sudah
    // dibangun oleh renderAnggotaRoster. Default ke "Orang lain" bila draft lama
    // hanya menyimpan nama tanpa pilihan eksplisit.
    try {
      if (vals['_formMode'] === 'l' && typeof _populateRespondenSelect === 'function') {
        _populateRespondenSelect();
        const _rp = document.getElementById('l5_responden_pilih');
        if (_rp) {
          let pv = vals['l5_responden_pilih'] || '';
          if (!pv && (vals['l5_responden_nama'] || '')) pv = '__luar__';
          _rp.value = pv;
          if (typeof handleRespondenPilih === 'function') handleRespondenPilih();
          // handleRespondenPilih mengosongkan nama saat orang lain dipilih tanpa nama;
          // kembalikan nama dari draft bila ada.
          if (pv === '__luar__' && vals['l5_responden_nama']) {
            const _rn = document.getElementById('l5_responden_nama');
            if (_rn) _rn.value = vals['l5_responden_nama'];
          }
        }
      }
    } catch (e) { console.error('restore responden gagal:', e); }
    try { if (typeof restoreFotoPreviews === 'function') restoreFotoPreviews(); }
    catch (e) { console.error('restore foto gagal:', e); }
    // Safety-net: isi field readonly/derived dari snapshot HANYA bila derivasi
    // (sync identitas, hitung umur, dll) belum mengisinya. Set langsung tanpa
    // memicu event agar tak ter-clear oleh handler.
    try {
      if (Array.isArray(vals['_ro'])) {
        vals['_ro'].forEach(id => {
          const el = document.getElementById(id);
          if (el && (el.value == null || el.value === '') && vals[id] != null && vals[id] !== '') {
            el.value = vals[id];
            el.classList.add('has-value');
          }
        });
      }
    } catch (e) { console.error('restore field readonly gagal:', e); }
    try { updateProgress(); } catch (e) {}
    const txt = document.getElementById('autosaveText');
    if (txt) txt.textContent = 'Draft dimuat';
  } catch(e) { console.error('Gagal load draft:', e); }
}

function dismissRestore() {
  const b = document.getElementById('restoreBanner');
  if (b) b.style.display = 'none';
}

function clearDraft() {
  localStorage.removeItem(LS_KEY);
  const txt = document.getElementById('autosaveText');
  if (txt) txt.textContent = 'Draft dihapus';
}

/* ====== NAMED DRAFT LIST ====== */
function getDraftList() {
  try { return JSON.parse(localStorage.getItem(LS_DRAFTS) || '[]'); }
  catch(e) { return []; }
}

function saveAsDraft() {
  try {
    // Sync usaha yang sedang aktif di form ke store sebelum serialize
    _syncActiveRosterForms();
    const raw = {};
    const _roIds = [];
    document.querySelectorAll('input[id]:not([type=radio]):not([type=checkbox]),textarea[id],select[id]').forEach(el => {
      if (!el.id) return;
      if (el.readOnly) { if (el.value) { raw[el.id] = el.value; _roIds.push(el.id); } return; }
      raw[el.id] = el.value;
    });
    if (_roIds.length) raw['_ro'] = _roIds;
    document.querySelectorAll('input[type=radio]:checked').forEach(el => {
      raw['_r_' + el.name] = el.value;
    });
    document.querySelectorAll('input[type=checkbox][id]').forEach(el => {
      raw['_c_' + el.id] = el.checked ? '1' : '0';
    });
    if (typeof l5HasSig !== 'undefined' && l5HasSig && typeof l5Canvas !== 'undefined' && l5Canvas) {
      try { raw['_sig_l'] = l5Canvas.toDataURL('image/png'); } catch(e) {}
    }
    const mode = (typeof getFormMode === 'function') ? getFormMode() : 'l';
    raw['_formMode'] = mode;
    raw['_ts'] = new Date().toISOString();
    // Snapshot progress agar portal (index.html) bisa tampilkan % tanpa load form
    try {
      if (typeof calcProgress === 'function') {
        const _pp = calcProgress();
        raw['_progress'] = _pp.pct;
        raw['_pfilled']  = _pp.filled;
        raw['_ptotal']   = _pp.total;
      }
    } catch (e) {}

    const id = _currentDraftId || ('draft_' + Date.now());
    let draft;
    {
      // Ringkasan draft form L (Kepala Keluarga + Nama Usaha). L.UB di-retire.
      // Unified P: saat masih di Blok P (field L belum diisi), pakai pmt_nama +
      // wilayah assignment sebagai fallback agar kartu draft tak tampil "Tanpa nama".
      const a = (typeof window !== 'undefined' && window.__cawiActiveAssignment) || {};
      const namaP = raw['pmt_nama'] || '';
      const kecInpL = document.getElementById('l1_alamat_kec_inp');
      // Count anggota with filled nama
      let jmlTerdata = 0;
      const nAng = parseInt(raw['l1_jml_kk_anggota']) || 0;
      for (let i = 1; i <= Math.min(nAng, 30); i++) {
        if (raw['l_ang_' + i + '_nama']) jmlTerdata++;
      }
      draft = {
        _draftId:        id,
        _ts:             raw['_ts'],
        _isDraft:        true,
        _formMode:       'l',
        nama_kk:         raw['l1_nama_kk']     || namaP || '',
        nama_usaha:      raw['l2_nama_usaha']  || '',
        pmt_nama:        namaP,
        jumlah_anggota:  nAng,
        jumlah_terdata:  jmlTerdata,
        kecamatan:       (kecInpL ? kecInpL.value.trim() : '') || a.kecamatan || '',
        kecamatan_kd:    raw['l1_alamat_kec']  || a.kecamatan_kd || '',
        petugas_nama:    raw['l5_petugas_nama']|| a.petugas_nama || '',
        kbli_kode:       raw['l2_kbli_kode']   || '',
        kbli_judul:      raw['l2_kbli_search'] || '',
        // For backward compat with daftar render
        nama_perusahaan: raw['l2_nama_usaha']  || namaP || '',
        nama_komersial:  raw['l1_nama_kk']     || '',
        _raw:            raw
      };
    }

    const list = getDraftList();
    const idx  = list.findIndex(d => d._draftId === id);
    if (idx >= 0) list[idx] = draft; else list.unshift(draft);
    localStorage.setItem(LS_DRAFTS, JSON.stringify(list));
    localStorage.setItem(LS_KEY, JSON.stringify(raw));
    _currentDraftId = id;

    const txt = document.getElementById('autosaveText');
    if (txt) txt.textContent = 'Draft tersimpan';
    const dot = document.getElementById('autosaveDot');
    if (dot) { dot.style.background = '#fc6c00'; setTimeout(() => { dot.style.background = 'rgba(255,255,255,.2)'; }, 3000); }
    const toastLabel = draft.nama_kk || draft.nama_usaha || 'Draft Rumah Tangga';
    _showDraftToast(toastLabel);
    return true;
  } catch(e) {
    console.error('Gagal simpan draft:', e);
    alert('Gagal menyimpan draft. Coba lagi.');
    return false;
  }
}

function deleteDraftById(id) {
  try {
    const list = getDraftList().filter(d => d._draftId !== id);
    localStorage.setItem(LS_DRAFTS, JSON.stringify(list));
    if (_currentDraftId === id) _currentDraftId = null;
  } catch(e) { console.error('Gagal hapus draft:', e); }
}

function _showDraftToast(nama) {
  let t = document.getElementById('_draftToast');
  if (!t) {
    t = document.createElement('div');
    t.id = '_draftToast';
    t.style.cssText = 'position:fixed;bottom:80px;right:20px;background:#276749;color:#fff;padding:12px 18px;border-radius:8px;font-size:13px;font-weight:600;z-index:9999;box-shadow:0 4px 16px rgba(0,0,0,.25);transition:opacity .4s;max-width:300px';
    document.body.appendChild(t);
  }
  const safeName = nama.length > 25 ? nama.slice(0, 25) + '…' : nama;
  t.textContent = '✓ Draft "' + safeName + '" tersimpan';
  t.style.opacity = '1';
  clearTimeout(t._tmr);
  t._tmr = setTimeout(() => { t.style.opacity = '0'; }, 3500);
}
