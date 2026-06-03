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

  /* === BLOK II: Usaha === */
  c(!!getVal('l2_nama_usaha'));
  c(!!getVal('l2_alamat'));
  const hp2 = getVal('l2_hp');
  if (hp2) c(isValidHP(hp2));
  const kw = getRadio('l2_kawasan');
  c(!!kw);
  if (kw && kw !== '10') c(!!getVal('l2_nama_kawasan'));
  c(!!getRadio('l2_jenis_usaha'));
  const nibR = getRadio('l2_punya_nib');
  c(!!nibR);
  if (nibR === '1') c(getVal('l2_nib').length === 13);
  if (nibR === '2') c(!!getRadio('l2_nib_alasan'));
  if (getRadio('l2_nib_alasan') === '5') c(!!getVal('l2_nib_alasan_lain'));
  c(!!getRadio('l2_badan_usaha'));
  c(!!getVal('l2_pengusaha_nama'));
  c(!!getRadio('l2_pengusaha_jk'));
  const uP = parseInt(getVal('l2_pengusaha_umur'));
  c(!!getVal('l2_pengusaha_umur') && uP >= 17 && uP <= 120);
  c(getVal('l2_pengusaha_nik').length === 16);
  c(!!getVal('l2_kegiatan_utama'));
  const lb1 = getRadio('l2_b1'), lb2 = getRadio('l2_b2');
  c(!!lb1); c(!!lb2);
  const showLb3 = lb1 === '2' && lb2 === '2';
  if (showLb3) c(!!getRadio('l2_b3'));
  const lb3 = showLb3 ? getRadio('l2_b3') : '';
  const showLb4 = showLb3 && lb3 === '2';
  if (showLb4) c(!!getRadio('l2_b4'));
  const showLc = lb2 === '1' || (showLb3 && lb3 === '1');
  if (showLc) c(!!getRadio('l2_c'));
  const showLde = lb1 === '1' && lb2 === '2';
  if (showLde) { c(!!getVal('l2_input')); c(!!getVal('l2_proses')); }
  c(!!getVal('l2_produk_utama'));
  c(!!getVal('l2_kbli_kode'));
  const lHotelW = document.getElementById('l2_hotel_wrap');
  if (lHotelW && !lHotelW.classList.contains('hidden')) c(!!getRadio('l2_hotel'));
  const jR = getRadio('l2_jaringan');
  c(!!jR);
  if (jR === '2') c(!!getVal('l2_jml_cabang'));
  /* Rincian 16a: Internet */
  const intV = getRadio('l2_internet');
  c(!!intV);
  /* Rincian 16b: Tujuan penggunaan internet (kondisional: internet=1) */
  if (intV === '1') {
    ['l2_internet_b1','l2_internet_b2','l2_internet_b3',
     'l2_internet_b4','l2_internet_b5','l2_internet_b6'].forEach(n => c(!!getRadio(n)));
  }
  /* Rincian 16c: Teknologi digital */
  c(!!getRadio('l2_teknologi'));
  /* Rincian 17a: Produk ramah lingkungan */
  c(!!getRadio('l2_ramah_a'));
  /* Rincian 17b: Input perlindungan lingkungan */
  c(!!getRadio('l2_ramah_b'));
  /* Rincian 18: Produk karya seni/sastra/desain/teknologi/warisan */
  c(!!getRadio('l2_kreatif'));
  /* Rincian 19/20: Halal & BPOM — ikuti kbli-hidden sama seperti validation */
  const _hHalalP = document.getElementById('sec-L2-19');
  const _cHalalP = _hHalalP && _hHalalP.closest('.section-card');
  const showL2HalalP = !_cHalalP || !_cHalalP.classList.contains('kbli-hidden');
  const _hBpomP  = document.getElementById('sec-L2-20');
  const _cBpomP  = _hBpomP  && _hBpomP.closest('.section-card');
  const showL2BpomP  = !_cBpomP  || !_cBpomP.classList.contains('kbli-hidden');
  if (showL2HalalP) {
    c(!!getRadio('l2_halal'));
    if (getRadio('l2_halal') === '1') {
      c(getVal('l2_halal_b') !== '');
      c(getVal('l2_halal_c') !== '');
    }
  }
  if (showL2BpomP) {
    c(!!getRadio('l2_bpom'));
    if (getRadio('l2_bpom') === '1') {
      c(getVal('l2_bpom_b') !== '');
      c(getVal('l2_bpom_c') !== '');
    }
  }
  /* Rincian 21: Mitra KDKMP */
  c(!!getRadio('l2_mitra_kdkmp'));
  /* Rincian 22: Program MBG */
  c(!!getRadio('l2_mbg'));
  /* Rincian 23: Transaksi non-penduduk */
  c(!!getRadio('l2_nonpend_a'));
  c(!!getRadio('l2_nonpend_b'));
  c(!!getRadio('l2_nonpend_c'));
  /* Pekerja & tahun operasi */
  c(getVal('l2_pekerja_l') !== '');
  c(getVal('l2_pekerja_p') !== '');
  const yr = parseInt(getVal('l2_tahun_operasi'));
  c(!!getVal('l2_tahun_operasi') && yr >= 1900 && yr <= 2026);
  /* Tahunan vs Bulanan: hitung sesuai container yang aktif */
  const lTahunanW = document.getElementById('l2_tahunan_wrap');
  const lBulananW = document.getElementById('l2_bulanan_wrap');
  if (lTahunanW && !lTahunanW.classList.contains('hidden')) {
    ['l2_y26a','l2_y26b','l2_y26c','l2_y26d','l2_y26e'].forEach(id => c(getVal(id) !== ''));
    ['l2_y27a','l2_y27b'].forEach(id => c(getVal(id) !== ''));
    c(getVal('l2_y27d') !== '');
    ['l2_y28a','l2_y28b'].forEach(id => c(getVal(id) !== ''));
    const m29 = ['l2_y29a','l2_y29b','l2_y29c','l2_y29d','l2_y29e','l2_y29f'];
    m29.forEach(id => c(getVal(id) !== ''));
    if (m29.every(id => getVal(id) !== '')) {
      const tot = m29.map(id => parseFloat(getVal(id)) || 0).reduce((a,b) => a+b, 0);
      c(Math.abs(tot - 100) < 0.01);
    }
  }
  if (lBulananW && !lBulananW.classList.contains('hidden')) {
    ['l2_m30a','l2_m30b','l2_m30c','l2_m30d','l2_m30e'].forEach(id => c(getVal(id) !== ''));
    ['l2_m31a','l2_m31b'].forEach(id => c(getVal(id) !== ''));
    c(getVal('l2_m31d') !== '');
    ['l2_m32a','l2_m32b'].forEach(id => c(getVal(id) !== ''));
    const m33 = ['l2_m33a','l2_m33b','l2_m33c','l2_m33d','l2_m33e','l2_m33f'];
    m33.forEach(id => c(getVal(id) !== ''));
    if (m33.every(id => getVal(id) !== '')) {
      const tot = m33.map(id => parseFloat(getVal(id)) || 0).reduce((a,b) => a+b, 0);
      c(Math.abs(tot - 100) < 0.01);
    }
  }

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

  /* === BLOK V: Petugas & Responden === */
  c(!!getVal('l5_petugas_nama'));
  c(!!getVal('l5_responden_nama'));
  const hpR = getVal('l5_responden_hp');
  c(!!hpR && isValidHP(hpR));
  // Email opsional — tidak dihitung dalam progress (konsisten dengan validation)
  c(!!getVal('l5_tanggal'));
  c(typeof l5HasSig !== 'undefined' && l5HasSig === true);

  return { pct: Math.round(f / t * 100), filled: f, total: t };
}
