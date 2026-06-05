/* ====== PROGRESS CALCULATION — L MODE ====== */
/*
 * calcProgressL — versi L dari calcProgress.
 * Hitung baseline keluarga (Blok I header) + per-anggota delta
 * (STOP / age-gated aware) + Blok II/III/V (catatan opsional).
 *
 * Returns { pct, filled, total } — sama struktur dengan calcProgress L.UB.
 *
 * KONSISTENSI dengan collectAllProblemsL:
 *  - alamat_dom   : hanya wajib saat keb=1 (tinggal di rumah ini)
 *  - ijazah       : tidak wajib saat sekolah=0 (tidak/belum pernah sekolah)
 *  - kedudukan    : tidak wajib saat profesi=000 (tidak bekerja)
 *  - jml_keluarga : tidak wajib saat jb=5 (lainnya)
 *  - lantai_kondisi/dinding_kondisi/atap_kondisi: hanya wajib untuk material
 *    tertentu (bukan tanah/bambu/ijuk/lainnya yang tidak memiliki kondisi)
 *  - tinja        : tidak wajib saat bab in {4,5,6} (tanpa fasilitas/alam/lain)
 *  - email        : opsional — tidak dihitung dalam progress
 *  - halal/bpom   : ikuti kbli-hidden sama seperti validation
 *
 * Blok II Rincian yang sekarang dihitung:
 *  16a internet, 16b tujuan internet (kondisional), 16c teknologi,
 *  17a ramah lingkungan, 17b biaya/input lingkungan,
 *  18 produk kreatif,
 *  19 halal (kondisional kbli), 20 bpom (kondisional kbli),
 *  21 mitra kdkmp, 22 program mbg,
 *  23a/b/c transaksi non-penduduk
 */
function calcProgressL() {
  let t = 0, f = 0;
  const c = ok => { t++; if (ok) f++; };

  /* === BLOK I: Keluarga (header) === */
  c(!!getVal('l1_nama_kk'));
  c(getVal('l1_nik_kk').length === 16);
  c(getVal('l1_no_kk').length === 16);
  const nAng = parseInt(getVal('l1_jml_kk_anggota')) || 0;
  c(nAng > 0 && nAng <= 30);
  c(!!getVal('l1_alamat_provinsi'));
  c(!!getVal('l1_alamat_kab'));
  c(!!getVal('l1_alamat_kec'));
  c(!!getVal('l1_alamat_kel'));
  c(!!getRadio('l1_klasifikasi'));
  c(getVal('l1_kodepos').length === 5);
  c(!!getVal('l1_alamat_detail'));
  c(!!getVal('l1_nama_jalan'));
  c(!!getVal('l1_no_rumah'));
  c(!!getRadio('l1_sesuai_kk'));

  /* === BLOK I: Per Anggota (dynamic) === */
  const capped = Math.min(Math.max(nAng, 0), 30);
  for (let i = 1; i <= capped; i++) {
    c(!!getVal('l_ang_' + i + '_nama'));
    const nikA = getVal('l_ang_' + i + '_nik');
    // NIK boleh kosong; tapi jika diisi, harus 16-digit.
    if (nikA) c(nikA.length === 16);
    c(!!getVal('l_ang_' + i + '_hubungan'));
    const keb = getRadio('l_ang_' + i + '_keberadaan');
    c(!!keb);
    // STOP-state (2=Meninggal, 6=Pisah KK, 7=Tidak Ditemukan): skip per-anggota detail
    const STOP = (keb === '2' || keb === '6' || keb === '7');
    if (STOP) continue;
    // r9b (alamat domisili): hanya wajib saat keb=1 (tinggal di rumah ini)
    if (keb === '1') c(!!getRadio('l_ang_' + i + '_alamat_dom'));
    // r10DN.a wajib jika keberadaan=3 (pindah DN)
    if (keb === '3') c(!!getVal('l_ang_' + i + '_dn_provinsi'));
    // r10LN wajib jika keberadaan=4 (pindah LN)
    if (keb === '4') c(!!getVal('l_ang_' + i + '_ln_negara'));
    c(!!getRadio('l_ang_' + i + '_kawin'));
    c(!!getRadio('l_ang_' + i + '_jk'));
    c(!!getVal('l_ang_' + i + '_tgl_lahir'));
    // Age-gated (≥5)
    const umur = parseInt(getVal('l_ang_' + i + '_umur')) || 0;
    if (umur >= 5) {
      const sekolah = getRadio('l_ang_' + i + '_sekolah');
      c(!!sekolah);
      // Ijazah tidak wajib saat sekolah=0 (tidak/belum pernah sekolah — field hidden)
      if (sekolah !== '0') c(!!getRadio('l_ang_' + i + '_ijazah'));
      c(!!getRadio('l_ang_' + i + '_rekening'));
    }
    // Age-gated (≥10)
    if (umur >= 10) {
      const profesi = getVal('l_ang_' + i + '_profesi');
      c(!!profesi);
      // Kedudukan tidak wajib saat profesi=000 (tidak bekerja — field hidden)
      if (profesi !== '000') c(!!getRadio('l_ang_' + i + '_kedudukan'));
      c(!!getRadio('l_ang_' + i + '_18a'));
      c(!!getRadio('l_ang_' + i + '_18b'));
      c(!!getRadio('l_ang_' + i + '_18c'));
    }
  }

  /* === BLOK II: Usaha (multi-usaha, iterate _usahaDataStore) === */
  function calcOneUsahaProgress(d) {
    c(!!d.l2_nama_usaha);
    c(!!d.l2_alamat);
    const kw = d['_r_l2_kawasan'] || '';
    c(!!kw);
    if (kw && kw !== '10') c(!!d.l2_nama_kawasan);
    c(!!d['_r_l2_jenis_usaha']);
    const nibR = d['_r_l2_punya_nib'] || '';
    c(!!nibR);
    if (nibR === '1') c((d.l2_nib || '').length === 13);
    if (nibR === '2') c(!!d['_r_l2_nib_alasan']);
    if (d['_r_l2_nib_alasan'] === '5') c(!!d.l2_nib_alasan_lain);
    c(!!d['_r_l2_badan_usaha']);
    c(!!d.l2_pengusaha_nama);
    c(!!d['_r_l2_pengusaha_jk']);
    const uP = parseInt(d.l2_pengusaha_umur || '');
    c(!!d.l2_pengusaha_umur && uP >= 17 && uP <= 120);
    c((d.l2_pengusaha_nik || '').length === 16);
    c(!!d.l2_kegiatan_utama);
    const lb1 = d['_r_l2_b1'] || '', lb2 = d['_r_l2_b2'] || '';
    c(!!lb1); c(!!lb2);
    const showLb3 = lb1 === '2' && lb2 === '2';
    if (showLb3) c(!!d['_r_l2_b3']);
    const lb3 = showLb3 ? (d['_r_l2_b3'] || '') : '';
    if (showLb3 && lb3 === '2') c(!!d['_r_l2_b4']);
    const showLc = lb2 === '1' || (showLb3 && lb3 === '1');
    if (showLc) c(!!d['_r_l2_c']);
    const showLde = lb1 === '1' && lb2 === '2';
    if (showLde) { c(!!d.l2_input); c(!!d.l2_proses); }
    c(!!d.l2_produk_utama);
    c(!!d.l2_kbli_kode);
    c(!!d['_r_l2_jaringan']);
    if (d['_r_l2_jaringan'] === '2') c(!!d.l2_jml_cabang);
    c(!!d['_r_l2_internet']);
    if (d['_r_l2_internet'] === '1') {
      ['b1','b2','b3','b4','b5','b6'].forEach(s => c(!!d['_r_l2_internet_' + s]));
    }
    c(!!d['_r_l2_teknologi']);
    c(!!d['_r_l2_ramah_a']);
    c(!!d['_r_l2_ramah_b']);
    c(!!d['_r_l2_kreatif']);
    c(!!d['_r_l2_halal']);
    if (d['_r_l2_halal'] === '1') {
      c(d.l2_halal_b !== '' && d.l2_halal_b !== undefined);
      c(d.l2_halal_c !== '' && d.l2_halal_c !== undefined);
    }
    c(!!d['_r_l2_bpom']);
    if (d['_r_l2_bpom'] === '1') {
      c(d.l2_bpom_b !== '' && d.l2_bpom_b !== undefined);
      c(d.l2_bpom_c !== '' && d.l2_bpom_c !== undefined);
    }
    c(!!d['_r_l2_mitra_kdkmp']);
    c(!!d['_r_l2_mbg']);
    c(!!d['_r_l2_nonpend_a']);
    c(!!d['_r_l2_nonpend_b']);
    c(!!d['_r_l2_nonpend_c']);
    c(d.l2_pekerja_l !== '' && d.l2_pekerja_l !== undefined);
    c(d.l2_pekerja_p !== '' && d.l2_pekerja_p !== undefined);
    const yrU = parseInt(d.l2_tahun_operasi || '');
    c(!!d.l2_tahun_operasi && yrU >= 1900 && yrU <= 2026);
    // y29 sum (tahunan, tahun < 2026) — only count when all y29 fields are present
    if (yrU >= 1900 && yrU < 2026) {
      const y29ids = ['l2_y29a','l2_y29b','l2_y29c','l2_y29d','l2_y29e','l2_y29f'];
      if (y29ids.every(id => d[id] !== undefined && d[id] !== '')) {
        y29ids.forEach(id => c(true));
        const tot = y29ids.map(id => parseFloat(d[id])||0).reduce((a,b)=>a+b,0);
        c(Math.abs(tot-100) <= 0.01);
      }
    }
  }

  const _uList = (typeof _usahaDataStore !== 'undefined') ? _usahaDataStore : [];
  const activeUsahaIdx = (typeof _activeUsahaIdx !== 'undefined') ? _activeUsahaIdx : null;
  _uList.forEach((u, i) => {
    const idx = i + 1;
    const data = (activeUsahaIdx === idx && typeof _collectL2Fields === 'function') ? _collectL2Fields() : u;
    calcOneUsahaProgress(data);
  });

  /* === BLOK III: Perumahan & Aset === */
  const jb = getRadio('l3_jenis_bangunan');
  c(!!jb);
  if (jb === '3' || jb === '4') c(!!getVal('l3_lantai_apt'));
  if (jb === '5') c(!!getVal('l3_bangunan_lain'));
  // jml_keluarga tidak wajib saat jb=5 (Lainnya)
  if (jb !== '5') c(getVal('l3_jml_keluarga') !== '');
  const sm = getRadio('l3_status_milik');
  c(!!sm);
  if (sm === '1') c(!!getRadio('l3_bukti'));
  if (sm === '5') c(!!getVal('l3_status_lain'));
  c(getVal('l3_luas_lantai') !== '');
  c(!!getVal('l3_lantai_bahan'));
  // lantai_kondisi: tidak wajib saat bahan tanah/bambu/lainnya (7,8,9)
  const lantaiBahan = getVal('l3_lantai_bahan');
  if (lantaiBahan && !['7','8','9'].includes(lantaiBahan)) c(!!getRadio('l3_lantai_kondisi'));
  c(!!getVal('l3_dinding_bahan'));
  // dinding_kondisi: tidak wajib saat bahan bambu/lainnya (6,7)
  const dindingBahan = getVal('l3_dinding_bahan');
  if (dindingBahan && !['6','7'].includes(dindingBahan)) c(!!getRadio('l3_dinding_kondisi'));
  c(!!getVal('l3_atap_bahan'));
  // atap_kondisi: tidak wajib saat bahan ijuk/rumbia/lainnya (5,7,8)
  const atapBahan = getVal('l3_atap_bahan');
  if (atapBahan && !['5','7','8'].includes(atapBahan)) c(!!getRadio('l3_atap_kondisi'));
  const bab = getRadio('l3_bab');
  c(!!bab);
  if (['1','2','3'].includes(bab)) c(!!getRadio('l3_kloset'));
  // tinja: tidak wajib saat bab in {4,5,6} (tanpa fasilitas / alam terbuka / lainnya)
  if (bab && !['4','5','6'].includes(bab)) c(!!getRadio('l3_tinja'));
  c(!!getVal('l3_air'));
  const lst = getRadio('l3_listrik');
  c(!!lst);
  if (lst === '1') c(getVal('l3_meteran_jml') !== '');
  c(getVal('l3_makanan_mgg') !== '');
  c(getVal('l3_nonmakanan_bln') !== '');
  c(getVal('l3_nonmakanan_thn') !== '');
  // Aset bergerak/tidak bergerak: angka (boleh 0 — tetap dihitung jika diisi)
  ['l3_aset_gas3','l3_aset_gas5','l3_aset_kulkas','l3_aset_ac','l3_aset_emas','l3_aset_komputer',
   'l3_aset_motor','l3_aset_mobil','l3_aset_tanah','l3_aset_rumah'].forEach(id => c(getVal(id) !== ''));

  /* === BLOK V: Responden === (identitas petugas otomatis dari login) */
  c(!!getVal('l5_responden_nama'));
  const hpR = getVal('l5_responden_hp');
  c(!!hpR && isValidHP(hpR));
  // Email opsional — tidak dihitung dalam progress (konsisten dengan validation)
  c(!!getVal('l5_tanggal'));
  c(typeof l5HasSig !== 'undefined' && l5HasSig === true);

  return { pct: Math.round(f / t * 100), filled: f, total: t };
}
