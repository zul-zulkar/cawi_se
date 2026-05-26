/* ====== AUTO-SAVE (localStorage) ====== */
const LS_KEY    = 'cawi_se2026_draft_v1';
const LS_DRAFTS = 'cawi_se2026_drafts_v1';
let _autosaveTimer  = null;
let _currentDraftId = null; // ID draft yang sedang dilanjutkan

function saveDraft() {
  try {
    const vals = {};
    document.querySelectorAll('input[id]:not([type=radio]):not([type=checkbox]),textarea[id],select[id]').forEach(el => {
      if (!el.id || el.readOnly) return;
      vals[el.id] = el.value;
    });
    document.querySelectorAll('input[type=radio]:checked').forEach(el => {
      vals['_r_' + el.name] = el.value;
    });
    // Checkbox state (L mode uses checkboxes, e.g., l2_m31e_*)
    document.querySelectorAll('input[type=checkbox][id]').forEach(el => {
      vals['_c_' + el.id] = el.checked ? '1' : '0';
    });
    if (typeof hasSig !== 'undefined' && hasSig) {
      try { vals['_sig'] = canvas.toDataURL('image/png'); } catch(e) {}
    }
    if (typeof l5HasSig !== 'undefined' && l5HasSig && typeof l5Canvas !== 'undefined' && l5Canvas) {
      try { vals['_sig_l'] = l5Canvas.toDataURL('image/png'); } catch(e) {}
    }
    vals['_formMode'] = (typeof getFormMode === 'function') ? getFormMode() : 'lub';
    vals['_ts'] = new Date().toISOString();
    localStorage.setItem(LS_KEY, JSON.stringify(vals));
    // Update status indicator
    const dot = document.getElementById('autosaveDot');
    const txt = document.getElementById('autosaveText');
    if (dot) { dot.style.background = '#68d391'; setTimeout(() => { dot.style.background='rgba(255,255,255,.2)'; }, 2000); }
    if (txt) { const t=new Date(); txt.textContent='Tersimpan '+String(t.getHours()).padStart(2,'0')+':'+String(t.getMinutes()).padStart(2,'0'); }
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
    if (vals['_formMode'] === 'l' && vals['l1_jml_kk_anggota'] && typeof renderAnggotaCards === 'function') {
      const inp = document.getElementById('l1_jml_kk_anggota');
      if (inp) { inp.value = vals['l1_jml_kk_anggota']; renderAnggotaCards(); }
    }
    // Restore inputs / selects / textareas
    Object.keys(vals).forEach(key => {
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
    });
    // Restore KBLI chip & kbliFilters untuk L.UB mode
    const savedKode = vals['q9g_kbli_kode'];
    if (savedKode && typeof kbliData !== 'undefined' && kbliData.length) {
      const entry = kbliData.find(d => d.kode === savedKode);
      if (entry && typeof selectKBLI === 'function') selectKBLI(entry);
    }
    // Restore KBLI chip & kbliFilters untuk L mode
    const savedKodeL = vals['l2_kbli_kode'];
    if (savedKodeL && typeof kbliData !== 'undefined' && kbliData.length) {
      const entryL = kbliData.find(d => d.kode === savedKodeL);
      if (entryL && typeof selectKBLIL === 'function') selectKBLIL(entryL);
    }
    // Re-apply kbliFilters setelah restore.
    // 1) Panggil apply() SEGERA (sinkron) agar seksi Halal/BPOM langsung tersembunyi
    //    tanpa menunggu CSV selesai dimuat (aman karena untuk KBLI di luar Halal/BPOM
    //    hasilnya tetap benar meski Set masih kosong).
    // 2) Setelah CSV selesai dimuat, panggil lagi agar kode yg ADA di daftar Halal/BPOM
    //    ditampilkan kembali dengan benar (singleton load() mencegah double-fetch).
    (function() {
      const restMode = vals['_formMode'] || 'lub';
      const restKbli = restMode === 'l' ? savedKodeL : savedKode;
      if (restKbli && window.kbliFilters) {
        window.kbliFilters.apply(restKbli);                              // (1) langsung
        window.kbliFilters.load().then(function() {                      // (2) setelah load
          window.kbliFilters.apply(restKbli);
        });
      }
    })();
    // Resync SEMUA searchable select display texts (L.UB + L mode + anggota cards)
    // Tangani seluruh select[data-ss-init] sekaligus — profesi, hubungan, provinsi, dll.
    document.querySelectorAll('select[data-ss-init]').forEach(sel => {
      if (!sel.value) return;
      const inp = document.getElementById(sel.id + '_inp');
      if (!inp) return;
      const opt = Array.from(sel.options).find(o => o.value === sel.value);
      if (opt) { inp.value = opt.text; inp.classList.add('has-value'); }
    });
    // Restore L.UB signature
    if (vals['_sig']) {
      const img = new Image();
      img.onload = () => { ctx.clearRect(0,0,canvas.width,canvas.height); ctx.drawImage(img,0,0); hasSig=true; updateProgress(); };
      img.src = vals['_sig'];
    }
    // Restore L mode signature
    if (vals['_sig_l'] && typeof l5Canvas !== 'undefined' && l5Canvas && typeof l5Ctx !== 'undefined' && l5Ctx) {
      const imgL = new Image();
      imgL.onload = () => { l5Ctx.clearRect(0,0,l5Canvas.width,l5Canvas.height); l5Ctx.drawImage(imgL,0,0); l5HasSig=true; updateProgress(); };
      imgL.src = vals['_sig_l'];
    }
    const hint = document.getElementById('sig-hint');
    if (hint && vals['_sig']) hint.textContent = 'Tanda tangan dimuat dari draft';
    const hintL = document.getElementById('l5_sig_hint');
    if (hintL && vals['_sig_l']) hintL.textContent = 'Tanda tangan dimuat dari draft';
    dismissRestore();
    updateProgress();
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
    const raw = {};
    document.querySelectorAll('input[id]:not([type=radio]):not([type=checkbox]),textarea[id],select[id]').forEach(el => {
      if (!el.id || el.readOnly) return;
      raw[el.id] = el.value;
    });
    document.querySelectorAll('input[type=radio]:checked').forEach(el => {
      raw['_r_' + el.name] = el.value;
    });
    document.querySelectorAll('input[type=checkbox][id]').forEach(el => {
      raw['_c_' + el.id] = el.checked ? '1' : '0';
    });
    if (typeof hasSig !== 'undefined' && hasSig) {
      try { raw['_sig'] = canvas.toDataURL('image/png'); } catch(e) {}
    }
    if (typeof l5HasSig !== 'undefined' && l5HasSig && typeof l5Canvas !== 'undefined' && l5Canvas) {
      try { raw['_sig_l'] = l5Canvas.toDataURL('image/png'); } catch(e) {}
    }
    const mode = (typeof getFormMode === 'function') ? getFormMode() : 'lub';
    raw['_formMode'] = mode;
    raw['_ts'] = new Date().toISOString();

    const id = _currentDraftId || ('draft_' + Date.now());
    let draft;
    if (mode === 'l') {
      // L mode: summary uses Kepala Keluarga + Nama Usaha
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
        nama_kk:         raw['l1_nama_kk']     || '',
        nama_usaha:      raw['l2_nama_usaha']  || '',
        jumlah_anggota:  nAng,
        jumlah_terdata:  jmlTerdata,
        kecamatan:       kecInpL ? kecInpL.value.trim() : '',
        kecamatan_kd:    raw['l1_alamat_kec']  || '',
        petugas_nama:    raw['l5_petugas_nama']|| '',
        kbli_kode:       raw['l2_kbli_kode']   || '',
        kbli_judul:      raw['l2_kbli_search'] || '',
        // For backward compat with daftar render
        nama_perusahaan: raw['l2_nama_usaha']  || '',
        nama_komersial:  raw['l1_nama_kk']     || '',
        _raw:            raw
      };
    } else {
      const kecInp = document.getElementById('q3_kecamatan_inp');
      draft = {
        _draftId:        id,
        _ts:             raw['_ts'],
        _isDraft:        true,
        _formMode:       'lub',
        nama_perusahaan: raw['q5a_nama_perusahaan'] || '',
        nama_komersial:  raw['q5b_nama_komersial']  || '',
        kecamatan:       kecInp ? kecInp.value.trim() : '',
        kecamatan_kd:    raw['q3_kecamatan']         || '',
        petugas_nama:    raw['p_nama']               || '',
        kbli_kode:       raw['q9g_kbli_kode']        || '',
        kbli_judul:      raw['q9g_kbli_search']      || '',
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
    const toastLabel = (mode === 'l')
      ? (draft.nama_kk || draft.nama_usaha || 'Draft Rumah Tangga')
      : (draft.nama_perusahaan || 'Draft baru');
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
  t.textContent = '✓ Draft "' + safeName + '" tersimpan ke Daftar';
  t.style.opacity = '1';
  clearTimeout(t._tmr);
  t._tmr = setTimeout(() => { t.style.opacity = '0'; }, 3500);
}
