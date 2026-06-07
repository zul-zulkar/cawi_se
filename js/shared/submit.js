/* validateBlok1 & validateBlok3 (validasi L.UB) DIHAPUS saat retire subsistem L.UB.
   Validasi unified/L memakai collectAllProblemsL / collectAllProblemsP. */

function collectData() {
  // L.UB di-retire — semua pengumpulan data kini lewat collectDataL (form L).
  return collectDataL();
}

/* collectDataLUB (payload L.UB) DIHAPUS saat retire subsistem L.UB. */

/* ====== L MODE DATA COLLECTION ====== */
function collectDataL() {
  const optText = (id) => {
    const el = document.getElementById(id);
    if (!el || el.tagName !== 'SELECT' || el.selectedIndex < 0) return '';
    return el.options[el.selectedIndex]?.text || '';
  };
  const data = {
    timestamp: new Date().toLocaleString('id-ID'),
    formMode: 'l',
    // === BLOK I: Keluarga ===
    nama_kk:        getVal('l1_nama_kk'),
    nik_kk:         getVal('l1_nik_kk'),
    no_kk:          getVal('l1_no_kk'),
    jml_anggota:    getVal('l1_jml_kk_anggota'),
    jml_pendataan:  getVal('l1_jml_pendataan'),
    provinsi:       optText('l1_alamat_provinsi'),
    provinsi_kd:    getVal('l1_alamat_provinsi'),
    kabupaten:      optText('l1_alamat_kab'),
    kabupaten_kd:   getVal('l1_alamat_kab'),
    kecamatan:      optText('l1_alamat_kec'),
    kecamatan_kd:   getVal('l1_alamat_kec'),
    kelurahan:      optText('l1_alamat_kel'),
    kelurahan_kd:   getVal('l1_alamat_kel'),
    klasifikasi:    getRadio('l1_klasifikasi'),
    kode_pos:       getVal('l1_kodepos'),
    kode_sls:       getVal('l1_kode_sls'),
    nama_sls:       getVal('l1_nama_sls'),
    alamat_detail:  getVal('l1_alamat_detail'),
    nama_jalan:     getVal('l1_nama_jalan'),
    no_rumah:       getVal('l1_no_rumah'),
    sesuai_kk:      getRadio('l1_sesuai_kk'),
    // === Per Anggota (JSON array) ===
    anggota_data: (function() {
      const nA = parseInt(getVal('l1_jml_kk_anggota')) || 0;
      const arr = [];
      for (let i = 1; i <= Math.min(nA, 30); i++) {
        const card = document.getElementById('l_ang_card_' + i);
        if (!card) continue;
        const keb = getRadio('l_ang_' + i + '_keberadaan');
        const STOP = (keb === '2' || keb === '6' || keb === '7');
        const rec = {
          no:           i,
          nama:         getVal('l_ang_' + i + '_nama'),
          nik:          getVal('l_ang_' + i + '_nik'),
          hubungan:     getVal('l_ang_' + i + '_hubungan'),
          keberadaan:   keb,
          stop_state:   STOP ? 1 : 0,
        };
        if (!STOP) {
          rec.alamat_dom    = getRadio('l_ang_' + i + '_alamat_dom');
          rec.dn_provinsi   = getVal('l_ang_' + i + '_dn_provinsi');
          rec.dn_kab        = getVal('l_ang_' + i + '_dn_kab');
          rec.ln_negara     = getVal('l_ang_' + i + '_ln_negara');
          rec.kawin         = getRadio('l_ang_' + i + '_kawin');
          rec.jk            = getRadio('l_ang_' + i + '_jk');
          rec.tgl_lahir     = getVal('l_ang_' + i + '_tgl_lahir');
          rec.umur          = getVal('l_ang_' + i + '_umur');
          const umur = parseInt(rec.umur) || 0;
          if (umur >= 5) {
            rec.sekolah  = getRadio('l_ang_' + i + '_sekolah');
            rec.ijazah   = getRadio('l_ang_' + i + '_ijazah');   // radio group, bukan getVal
            rec.rekening = getRadio('l_ang_' + i + '_rekening');
          }
          if (umur >= 10) {
            rec.profesi      = getVal('l_ang_' + i + '_profesi'); // select dengan id, getVal benar
            rec.kedudukan    = getRadio('l_ang_' + i + '_kedudukan'); // radio group, bukan getVal
            rec.pend_18a     = getRadio('l_ang_' + i + '_18a');
            rec.pend_18a_nilai = parseCurrency(getVal('l_ang_' + i + '_18a_nilai'));
            rec.pend_18b     = getRadio('l_ang_' + i + '_18b');
            rec.pend_18b_nilai = parseCurrency(getVal('l_ang_' + i + '_18b_nilai'));
            rec.pend_18c     = getRadio('l_ang_' + i + '_18c');
            rec.pend_18c_nilai = parseCurrency(getVal('l_ang_' + i + '_18c_nilai'));
          }
          // Disabilitas & penyakit kronis (always collected if non-STOP)
          rec.disab = ['a','b','c','d','e','f'].map(s => getRadio('l_ang_' + i + '_disab_' + s)).join('|');
          rec.kronis = ['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p']
            .map(s => getRadio('l_ang_' + i + '_kronis_' + s)).join('|');
          rec.kronis_lain = getVal('l_ang_' + i + '_kronis_q_lain');
        }
        arr.push(rec);
      }
      return JSON.stringify(arr);
    })(),
    // === BLOK II: Usaha (multi-usaha JSON array) ===
    // Jika ada usaha yang sedang diedit (aktif di form), serialize dulu ke store
    usaha_data: (function() {
      if (typeof _usahaDataStore === 'undefined') return '[]';
      // Sync usaha yang sedang aktif di form (kalau ada)
      if (typeof _activeUsahaIdx !== 'undefined' && _activeUsahaIdx != null) {
        if (typeof _collectL2Fields === 'function') {
          const activeData = _collectL2Fields();
          _usahaDataStore[_activeUsahaIdx - 1] = activeData;
        }
      }
      return JSON.stringify(_usahaDataStore);
    })(),
        // === BLOK III: Perumahan & Aset ===
    jenis_bangunan:    getRadio('l3_jenis_bangunan'),
    lantai_apt:        getVal('l3_lantai_apt'),
    bangunan_lain:     getVal('l3_bangunan_lain'),
    jml_keluarga_rumah: getVal('l3_jml_keluarga'),
    kk_lain:           getVal('l3_kk_lain'),
    status_milik:      getRadio('l3_status_milik'),
    bukti:             getRadio('l3_bukti'),
    status_lain:       getVal('l3_status_lain'),
    sewa:              parseCurrency(getVal('l3_sewa')),
    luas_lantai:       getVal('l3_luas_lantai'),
    lantai_bahan:      getRadio('l3_lantai_bahan') || getVal('l3_lantai_bahan'),
    lantai_kondisi:    getRadio('l3_lantai_kondisi'),    // radio
    dinding_bahan:     getRadio('l3_dinding_bahan') || getVal('l3_dinding_bahan'),
    dinding_kondisi:   getRadio('l3_dinding_kondisi'),  // radio
    atap_bahan:        getRadio('l3_atap_bahan') || getVal('l3_atap_bahan'),
    atap_kondisi:      getRadio('l3_atap_kondisi'),     // radio
    bab:               getRadio('l3_bab'),
    kloset:            getRadio('l3_kloset'),
    tinja:             getRadio('l3_tinja'),
    air:               getVal('l3_air'),
    listrik:           getRadio('l3_listrik'),
    meteran_jml:       getVal('l3_meteran_jml'),
    meteran_daya1:     getVal('l3_meteran_daya1'),
    meteran_daya2:     getVal('l3_meteran_daya2'),
    meteran_id1:       getVal('l3_meteran_id1'),
    meteran_id2:       getVal('l3_meteran_id2'),
    listrik_bln:       parseCurrency(getVal('l3_listrik_bln')),
    pulsa_bln:         parseCurrency(getVal('l3_pulsa_bln')),
    makanan_mgg:       parseCurrency(getVal('l3_makanan_mgg')),
    nonmakanan_bln:    parseCurrency(getVal('l3_nonmakanan_bln')),
    nonmakanan_thn:    parseCurrency(getVal('l3_nonmakanan_thn')),
    aset_gas3:         getVal('l3_aset_gas3'),
    aset_gas5:         getVal('l3_aset_gas5'),
    aset_kulkas:       getVal('l3_aset_kulkas'),
    aset_ac:           getVal('l3_aset_ac'),
    aset_emas:         getVal('l3_aset_emas'),
    aset_komputer:     getVal('l3_aset_komputer'),
    aset_motor:        getVal('l3_aset_motor'),
    aset_motor_nilai:  parseCurrency(getVal('l3_aset_motor_nilai')),
    aset_mobil:        getVal('l3_aset_mobil'),
    aset_mobil_nilai:  parseCurrency(getVal('l3_aset_mobil_nilai')),
    aset_tanah:        getVal('l3_aset_tanah'),
    aset_tanah_nilai:  parseCurrency(getVal('l3_aset_tanah_nilai')),
    aset_rumah:        getVal('l3_aset_rumah'),
    aset_rumah_nilai:  parseCurrency(getVal('l3_aset_rumah_nilai')),
    // Foto Rumah (R19) — data URL JPEG terkompres; GAS upload ke Drive → URL
    foto_depan:        getVal('l3_foto_depan_data'),
    foto_ruang_tamu:   getVal('l3_foto_ruang_tamu_data'),
    // === BLOK IV: Catatan ===
    catatan_pendata:   getVal('l4_catatan'),
    // === BLOK V: Responden ===
    // Identitas petugas TIDAK lagi diisi manual — otomatis dari assignment/login.
    petugas_nama:      ((typeof window !== 'undefined' && window.__cawiActiveAssignment) || {}).petugas_nama || '',
    petugas_nip:       ((typeof window !== 'undefined' && window.__cawiActiveAssignment) || {}).petugas_nip || '',
    petugas_hp:        ((typeof window !== 'undefined' && window.__cawiActiveAssignment) || {}).petugas_hp || '',
    // Identitas pendata dari sesi login (hidden, auto-inject)
    petugas_email_login: getVal('petugas_email_login'),
    petugas_peran_login: getVal('petugas_peran_login'),
    responden_nama:    getVal('l5_responden_nama'),
    responden_hp:      getVal('l5_responden_hp'),
    responden_email:   getVal('l5_responden_email'),
    tanggal_pelaksanaan: getVal('l5_tanggal'),
    tanda_tangan: (typeof l5HasSig !== 'undefined' && l5HasSig && typeof l5Canvas !== 'undefined' && l5Canvas)
      ? _getSigData(l5Canvas) : '',
  };
  if (_editRecordId) data._edit_id = _editRecordId;
  return data;
}

/* ============================================================
 * collectDataP — payload Blok P (SE2026-P / pemutakhiran)
 * Urutan/nama field HARUS match P_FIELD_NAMES di server/google-apps-script.js.
 * Wilayah (prov/kab/kec/desa + SLS) diambil dari assignment (scope SLS);
 * field pmt_* dari Blok P. jenis_lanjutan + record_id_lanjutan diisi oleh
 * orchestrator submitUnified() setelah submit stage L/L.UB.
 * ============================================================ */
function collectDataP() {
  const a = (typeof window !== 'undefined' && window.__cawiActiveAssignment) || {};
  return {
    timestamp: new Date().toLocaleString('id-ID'),
    formMode: 'p',
    // Identitas pendata (login)
    petugas_email_login: getVal('petugas_email_login'),
    petugas_peran_login: getVal('petugas_peran_login'),
    petugas_nama: getVal('p_nama') || getVal('l5_petugas_nama') || (a.petugas_nama || ''),
    // Jenis entitas (1=keluarga, 2=bangunan lainnya) + identitas
    pmt_jenis_entitas: (typeof getRadio === 'function') ? getRadio('pmt_jenis_entitas') : '',
    pmt_no_kel: getVal('pmt_no_kel'),
    pmt_no_bgn: getVal('pmt_no_bgn'),
    pmt_no_kel_max: getVal('pmt_no_kel_max'),
    pmt_no_bgn_max: getVal('pmt_no_bgn_max'),
    pmt_nama: getVal('pmt_nama'),
    pmt_nama_anggota: getVal('pmt_nama_anggota'),
    pmt_nomor_kk: getVal('pmt_nomor_kk'),
    pmt_nik: getVal('pmt_nik'),
    pmt_jalan: getVal('pmt_jalan'),
    pmt_blok: getVal('pmt_blok'),
    // Wilayah dari assignment (scope SLS) — SubSLS terpisah
    provinsi: a.provinsi || '', provinsi_kd: a.provinsi_kd || '',
    kabupaten: a.kabupaten || '', kabupaten_kd: a.kabupaten_kd || '',
    kecamatan: a.kecamatan || '', kecamatan_kd: a.kecamatan_kd || '',
    kelurahan: a.desa || '', kelurahan_kd: a.desa_kd || '',
    kode_sls: a.sls_full_kd || a.sls_kd || '', nama_sls: a.sls_nama || '',
    pmt_subsls: a.subsls_kd || '',
    // Pemutakhiran (field pilihan = radio → getRadio)
    pmt_sls_berubah: (typeof getRadio === 'function') ? getRadio('pmt_sls_berubah') : '',
    pmt_sls_nama: getVal('pmt_sls_nama'),
    pmt_keberadaan: (typeof getRadio === 'function') ? getRadio('pmt_keberadaan') : '',
    pmt_sesuai_kk: (typeof getRadio === 'function') ? getRadio('pmt_sesuai_kk') : '',
    pmt_kode_bangunan: getVal('pmt_kode_bangunan'),
    pmt_skala: getVal('pmt_skala'),
    pmt_jml_usaha: getVal('pmt_jml_usaha'),
    pmt_idsbr: getVal('pmt_idsbr'),
    pmt_jml_kk: getVal('pmt_jml_kk'),
    pmt_jml_menetap: getVal('pmt_jml_menetap'),
    // Geotag
    pmt_lat: getVal('pmt_lat'),
    pmt_lng: getVal('pmt_lng'),
    pmt_akurasi: getVal('pmt_akurasi'),
    // Tautan ke kuesioner lanjutan (diisi orchestrator)
    jenis_lanjutan: '',
    record_id_lanjutan: ''
  };
}

/* POST satu payload ke GAS, kembalikan record_id (atau null). Lempar bila GAS error. */
async function _postData(data) {
  const res = await fetch(getScriptUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(data)
  });
  let record_id = null;
  try {
    const json = await res.json();
    if (json.status !== 'ok') throw new Error(json.message || 'GAS error');
    if (json.record_id || json.recordId) record_id = json.record_id || json.recordId;
  } catch (parseErr) {
    if (parseErr.message === 'GAS error') throw parseErr;
    // Response bukan JSON (mis. redirect GAS) → abaikan
  }
  return record_id;
}

/* ============================================================
 * submitUnified — orkestrasi multi-submit untuk unified mode (SE2026-P).
 * Urutan: validasi P → validasi stage → submit stage (L/L.UB) → submit P
 * (dengan jenis_lanjutan + record_id_lanjutan). Stage 'none' = submit P saja.
 * Tiap sheet di-overwrite by cawi_id (edit-in-place) saat re-submit.
 * ============================================================ */
async function submitUnified() {
  hideAlert('alertBox');
  // 1) Validasi Blok P
  if (typeof collectAllProblemsP === 'function') {
    const p = collectAllProblemsP();
    if (p.errors && p.errors.length) {
      if (typeof goBlokP === 'function') goBlokP();
      setTimeout(() => showAlert('alertBox', 'Blok P — ' + p.errors[0].text), 300);
      return;
    }
  }
  const stage = (typeof computeStageFromP === 'function') ? computeStageFromP() : 'none';
  const isLStage = (stage === 'keluarga' || stage === 'usaha');
  // 2) Validasi stage lanjutan (kuesioner L; usaha-saja → field keluarga di-skip
  //    otomatis oleh collectAllProblemsL via window.__cawiLScope).
  if (isLStage) {
    window.__cawiLScope = (stage === 'usaha') ? 'usaha' : 'full';
    if (typeof collectAllProblemsL === 'function') {
      const probs = collectAllProblemsL();
      if (probs.errors.length) {
        const first = probs.errors[0];
        if (typeof goBlok === 'function') goBlok(first.blok || 2);
        setTimeout(() => showAlert('l5_submitAlert', first.label + ' — ' + first.text), 300);
        return;
      }
    }
  }

  if (typeof window.showLoadingOverlay === 'function') {
    window.showLoadingOverlay('Mengirim data…', 'Blok P + kuesioner lanjutan. Jangan tutup halaman.');
  }
  try {
    const cawiId = (window.__cawiActiveAssignment && window.__cawiActiveAssignment.id) || null;
    // 3) Submit stage dulu (untuk dapat record_id tautan). keluarga & usaha sama-sama
    //    formMode 'l' (L.UB dilebur). usaha-saja: field keluarga kosong → tetap valid.
    let stageRecordId = null;
    if (isLStage) {
      const sd = collectData(); // dispatch by getFormMode (sudah diselaraskan ke 'l')
      if (cawiId) sd.cawi_id = cawiId;
      stageRecordId = await _postData(sd);
    }
    // 4) Submit Blok P (dengan tautan ke stage)
    const pd = collectDataP();
    if (cawiId) pd.cawi_id = cawiId;
    pd.jenis_lanjutan = stage;
    pd.record_id_lanjutan = (stageRecordId != null) ? String(stageRecordId) : '';
    const pRecordId = await _postData(pd);

    // Sukses — bersihkan draft & beri tahu guard (status submitted + redirect)
    clearDraft();
    if (_currentDraftId) { deleteDraftById(_currentDraftId); }
    if (typeof _formDirty !== 'undefined') _formDirty = false;
    try {
      window.dispatchEvent(new CustomEvent('cawi:submit-success', {
        detail: { formMode: 'p', stage: stage, wasEdit: false, record_id: pRecordId, cawi_id: cawiId }
      }));
    } catch (_e) {}
    if (typeof window.hideLoadingOverlay === 'function') window.hideLoadingOverlay();
    if (typeof showToast === 'function') showToast('Data pemutakhiran terkirim ✓', 'ok');
  } catch (e) {
    if (typeof window.hideLoadingOverlay === 'function') window.hideLoadingOverlay();
    showAlert('alertBox', 'Gagal mengirim: ' + e.message + '. Periksa koneksi lalu coba lagi.');
  }
}


async function submitForm() {
  // Unified mode (SE2026-P): orkestrasi multi-submit P → L/L.UB.
  if (typeof isUnifiedMode === 'function' && isUnifiedMode()) {
    return submitUnified();
  }
  // Non-unified legacy hanya mode L (L.UB di-retire).
  const submitAlertId = 'l5_submitAlert';
  const submitBtnId   = 'l5_submitBtn';
  hideAlert(submitAlertId);

  // Validasi via collectAllProblemsL (sudah digate oleh recap).
  if (typeof collectAllProblemsL === 'function') {
    const probs = collectAllProblemsL();
    if (probs.errors.length > 0) {
      const first = probs.errors[0];
      goBlok(first.blok || 1);
      setTimeout(() => showAlert(submitAlertId, first.label + ' — ' + first.text), 300);
      return;
    }
  }

  const btn = document.getElementById(submitBtnId);
  if (btn) { btn.disabled = true; btn.textContent = 'Mengirim...'; }
  if (typeof window.showLoadingOverlay === 'function') {
    window.showLoadingOverlay('Mengirim data ke server…', 'Mohon tunggu, jangan tutup halaman.');
  } else {
    const loadingOverlay = document.getElementById('submitLoadingOverlay');
    if (loadingOverlay) loadingOverlay.style.display = 'flex';
  }
  const loadingOverlay = document.getElementById('submitLoadingOverlay');

  try {
    const data = collectData();
    // Jika kuesioner dibuka dari assignment (Portal Petugas), sertakan
    // cawi_id supaya backend bisa overwrite row yang sama saat re-submit.
    if (window.__cawiActiveAssignment && window.__cawiActiveAssignment.id) {
      data.cawi_id = window.__cawiActiveAssignment.id;
      // Kalau assignment sudah pernah disubmit, pakai record_id untuk edit by row
      if (window.__cawiActiveAssignment.record_id && !data._edit_id) {
        data._edit_id = window.__cawiActiveAssignment.record_id;
      }
    }
    const isEdit = !!(data._edit_id);
    console.log('[SUBMIT] mode:', isEdit ? 'EDIT id=' + data._edit_id : 'BARU');
    // Content-Type: text/plain → tidak perlu no-cors, bisa baca response
    const res = await fetch(getScriptUrl(), {
      method: 'POST',
      headers: {'Content-Type': 'text/plain'},
      body: JSON.stringify(data)
    });
    let gasOk = true;
    let _recordIdFromServer = null;
    try {
      const json = await res.json();
      console.log('[SUBMIT] GAS response:', json);
      if (json.status !== 'ok') throw new Error(json.message || 'GAS error');
      if (json.record_id || json.recordId) _recordIdFromServer = json.record_id || json.recordId;
    } catch(parseErr) {
      // Jika response bukan JSON (mis. redirect GAS), abaikan
      if (parseErr.message && parseErr.message !== 'GAS error') {
        console.warn('[SUBMIT] Tidak bisa parse response GAS:', parseErr.message);
      } else if (parseErr.message === 'GAS error') {
        throw parseErr;
      }
    }
    const wasEdit = isEdit;
    if (btn) {
      btn.textContent = wasEdit ? 'DIPERBARUI ✓' : 'TERKIRIM ✓';
      btn.style.background = '#38a169';
    }
    _editRecordId = null;
    cancelEditMode();
    clearDraft();
    if (_currentDraftId) { deleteDraftById(_currentDraftId); }
    // Mark form clean so leave-guard / beforeunload don't prompt after submit
    if (typeof _formDirty !== 'undefined') _formDirty = false;
    // Beritahu listener (mis. assignment guard) bahwa submit sukses
    try {
      window.dispatchEvent(new CustomEvent('cawi:submit-success', {
        detail: {
          formMode: data.formMode,
          wasEdit:  wasEdit,
          record_id: _recordIdFromServer,
          cawi_id:  data.cawi_id || null
        }
      }));
    } catch(_e) {}
    // Simpan ringkasan ke daftar lokal
    try {
      const LS_REC = 'cawi_se2026_records_v1';
      const recs = JSON.parse(localStorage.getItem(LS_REC) || '[]');
      recs.unshift({ _id: Date.now(), _ts: new Date().toISOString(), ...data });
      localStorage.setItem(LS_REC, JSON.stringify(recs));
    } catch(_e) {}
    if (typeof window.hideLoadingOverlay === 'function') {
      window.hideLoadingOverlay();
    } else if (loadingOverlay) {
      loadingOverlay.style.display = 'none';
    }
    const submitAlertEl = document.getElementById(submitAlertId);
    if (submitAlertEl) submitAlertEl.classList.add('hidden');
    const successDiv = document.createElement('div');
    successDiv.className = 'alert alert-success';
    successDiv.innerHTML = wasEdit
      ? '<strong>Data berhasil diperbarui!</strong> Rekaman asli telah ditimpa di Google Sheets.'
      : '<strong>Data berhasil dikirim!</strong> Terima kasih telah mengisi form CAWI SE2026.';
    if (btn) btn.parentNode.insertBefore(successDiv, btn);
  } catch(e) {
    if (btn) { btn.disabled = false; btn.textContent = 'KIRIM / SUBMIT'; }
    if (typeof window.hideLoadingOverlay === 'function') {
      window.hideLoadingOverlay();
    } else if (loadingOverlay) {
      loadingOverlay.style.display = 'none';
    }
    showAlert(submitAlertId, 'Gagal mengirim: ' + e.message + '. Pastikan koneksi internet stabil dan coba lagi.');
  }
}


/* ====== SIGNATURE HELPER ======
 * Menghasilkan data URL tanda tangan yang cukup kecil untuk disimpan di Google Sheets
 * (batas sel ≈ 50.000 karakter). Coba PNG dulu; jika terlalu besar, fallback ke JPEG.
 * Fungsi ini dibaca oleh collectData(), collectDataL(), dan draft save functions. */
function _getSigData(canvasEl) {
  if (!canvasEl) return '';
  try {
    const png = canvasEl.toDataURL('image/png');
    if (png.length <= 40000) return png;
    const jpg8 = canvasEl.toDataURL('image/jpeg', 0.8);
    if (jpg8.length <= 40000) return jpg8;
    const jpg5 = canvasEl.toDataURL('image/jpeg', 0.5);
    if (jpg5.length <= 40000) return jpg5;
    return canvasEl.toDataURL('image/jpeg', 0.3);
  } catch(e) { return ''; }
}

/* ====== EDIT MODE (dari daftar.html) ====== */
const EDIT_KEY = 'cawi_edit_mode';
let _editRecordId = null;

function cancelEditMode() {
  localStorage.removeItem(EDIT_KEY);
  _editRecordId = null;
  const b = document.getElementById('editModeBanner');
  if (b) b.style.display = 'none';
}

function loadEditMode() {
  const raw = localStorage.getItem(EDIT_KEY);
  if (!raw) return false;
  localStorage.removeItem(EDIT_KEY);
  try {
    const r = JSON.parse(raw);
    const banner = document.getElementById('editModeBanner');
    if (banner) banner.style.display = 'block';

    // Mode-aware: switch to L mode and delegate to L-mode loader
    if (r.formMode === 'l' || r._formMode === 'l') {
      if (typeof setFormMode === 'function') setFormMode('l');
      if (typeof applyFormMode === 'function') applyFormMode('l');
      if (typeof loadEditModeL === 'function') return loadEditModeL(r);
      return true; // L mode loader not yet implemented; mode is set so user can review/edit
    }

    // Restore edit-mode non-L (L.UB) DIHAPUS: subsistem L.UB di-retire.
    // Record lama L.UB (bila ada) tidak lagi dapat diedit di kuesioner.
    return true;
    } catch(e) { console.error('Gagal load edit mode:', e); return false; }
}
