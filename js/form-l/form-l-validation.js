/* ====== VALIDATION (RECAP) — L MODE ====== */
/*
 * collectAllProblemsL — versi L dari collectAllProblems.
 * Validasi NIK 16-digit, no KK 16-digit, umur autocomputed,
 * STOP-state branch, age-gated, sum kepemilikan modal = 100%, dst.
 *
 * Returns {errors, warnings, kosong} — sama struktur dengan L.UB.
 *
 * Blok mapping (untuk recap navigation):
 *   1 = Blok I (Keluarga & Anggota) — blokL1
 *   2 = Blok II (Usaha) — blokL2
 *   3 = Blok III (Perumahan & Aset) — blokL3
 *   4 = Blok IV (Catatan) — blokL4
 *   5 = Blok V (Petugas & Responden) — blokL5
 */
function collectAllProblemsL() {
  const errors = [], warnings = [], kosong = [];
  const e = (label, text, blok, field) => errors.push({label, text, blok, field: field || null});
  const w = (label, text, blok, field) => warnings.push({label, text, blok, field: field || null});
  const k = (label, text, blok, field) => kosong.push({label, text, blok, field: field || null});

  // Unified (SE2026-P): identitas KK + alamat jalan/no + kesesuaian KK adalah
  // SUMBER TUNGGAL Blok P (divalidasi di collectAllProblemsP, dialirkan ke L1).
  // Lewati di sini agar tidak dobel-error pada field L1 yang disembunyikan.
  const _unifiedP = (typeof isUnifiedMode === 'function' && isUnifiedMode());

  /* === BLOK I: Keluarga (header) === */
  if (!_unifiedP) {
    if (!getVal('l1_nama_kk')) e('Rincian 1: Nama Kepala Keluarga', 'Harus diisi', 1, 'l1_nama_kk');
    const nikKK = getVal('l1_nik_kk');
    if (!nikKK) e('Rincian 1: NIK Kepala Keluarga', 'Harus diisi', 1, 'l1_nik_kk');
    else if (nikKK.length !== 16) e('Rincian 1: NIK Kepala Keluarga', 'Harus tepat 16 digit', 1, 'l1_nik_kk');
    else if (!/^\d{16}$/.test(nikKK)) e('Rincian 1: NIK Kepala Keluarga', 'NIK hanya boleh berisi angka', 1, 'l1_nik_kk');
    const noKK = getVal('l1_no_kk');
    if (!noKK) e('Rincian 1: Nomor KK', 'Harus diisi', 1, 'l1_no_kk');
    else if (noKK.length !== 16) e('Rincian 1: Nomor KK', 'Harus tepat 16 digit', 1, 'l1_no_kk');
    else if (!/^\d{16}$/.test(noKK)) e('Rincian 1: Nomor KK', 'Nomor KK hanya boleh berisi angka', 1, 'l1_no_kk');
  }
  const jmlAng = parseInt(getVal('l1_jml_kk_anggota'));
  if (!getVal('l1_jml_kk_anggota')) e('Rincian 2a: Jumlah Anggota Keluarga', 'Harus diisi', 1, 'l1_jml_kk_anggota');
  else if (isNaN(jmlAng) || jmlAng < 1) e('Rincian 2a: Jumlah Anggota Keluarga', 'Minimal 1 anggota', 1, 'l1_jml_kk_anggota');
  else if (jmlAng > 30) e('Rincian 2a: Jumlah Anggota Keluarga', 'Maksimal 30 anggota', 1, 'l1_jml_kk_anggota');
  if (!getVal('l1_alamat_provinsi')) e('Rincian 3: Provinsi', 'Belum dipilih', 1, 'l1_alamat_provinsi');
  if (!getVal('l1_alamat_kab')) e('Rincian 3: Kabupaten/Kota', 'Belum dipilih', 1, 'l1_alamat_kab');
  if (!getVal('l1_alamat_kec')) e('Rincian 3: Kecamatan', 'Belum dipilih', 1, 'l1_alamat_kec');
  if (!getVal('l1_alamat_kel')) e('Rincian 3: Kelurahan/Desa', 'Belum dipilih', 1, 'l1_alamat_kel');
  if (!getRadio('l1_klasifikasi')) e('Rincian 3: Klasifikasi Wilayah', 'Belum dipilih', 1, 'l1_klasifikasi');
  const kp = getVal('l1_kodepos');
  if (!kp) e('Rincian 3: Kode Pos', 'Harus diisi', 1, 'l1_kodepos');
  else if (kp.length !== 5) e('Rincian 3: Kode Pos', 'Harus 5 digit', 1, 'l1_kodepos');
  if (!getVal('l1_kode_sls')) k('Rincian 3: Kode SLS', 'Tidak diisi (opsional)', 1, 'l1_kode_sls');
  if (!getVal('l1_nama_sls')) k('Rincian 3: Nama SLS', 'Tidak diisi (opsional)', 1, 'l1_nama_sls');
  if (!getVal('l1_alamat_detail')) e('Rincian 3: Alamat Detail', 'Harus diisi', 1, 'l1_alamat_detail');
  if (!_unifiedP) {
    if (!getVal('l1_nama_jalan')) e('Rincian 3: Nama Jalan', 'Harus diisi (isi "-" jika tidak ada)', 1, 'l1_nama_jalan');
    if (!getVal('l1_no_rumah')) e('Rincian 3: Nomor Rumah', 'Harus diisi (isi "-" jika tidak ada)', 1, 'l1_no_rumah');
    if (!getRadio('l1_sesuai_kk')) e('Rincian 4: Kesesuaian dengan KK', 'Belum dipilih', 1, 'l1_sesuai_kk');
  }

  /* === BLOK I: Per Anggota === */
  const capped = Math.min(Math.max(jmlAng || 0, 0), 30);
  for (let i = 1; i <= capped; i++) {
    const prefix = 'Anggota #' + i;
    if (!getVal('l_ang_' + i + '_nama')) e(prefix + ': Nama', 'Harus diisi', 1, 'l_ang_' + i + '_nama');
    const nikA = getVal('l_ang_' + i + '_nik');
    if (nikA && nikA.length !== 16) e(prefix + ': NIK', 'Harus tepat 16 digit', 1, 'l_ang_' + i + '_nik');
    else if (nikA && !/^\d{16}$/.test(nikA)) e(prefix + ': NIK', 'NIK hanya boleh berisi angka', 1, 'l_ang_' + i + '_nik');
    if (!getVal('l_ang_' + i + '_hubungan')) e(prefix + ': Hubungan Keluarga', 'Belum dipilih', 1, 'l_ang_' + i + '_hubungan');
    const keb = getRadio('l_ang_' + i + '_keberadaan');
    if (!keb) e(prefix + ': Keberadaan', 'Belum dipilih', 1, 'l_ang_' + i + '_keberadaan');
    const STOP = (keb === '2' || keb === '6' || keb === '7');
    if (STOP) continue; // STOP-state: skip rest of validations
    if (keb === '1' && !getRadio('l_ang_' + i + '_alamat_dom')) e(prefix + ': Alamat Domisili', 'Belum dipilih (wajib jika tinggal di rumah ini)', 1, 'l_ang_' + i + '_alamat_dom');
    if (keb === '3' && !getVal('l_ang_' + i + '_dn_provinsi')) e(prefix + ': Provinsi Domisili (DN)', 'Harus dipilih jika pindah dalam negeri', 1, 'l_ang_' + i + '_dn_provinsi');
    if (keb === '4' && !getVal('l_ang_' + i + '_ln_negara')) e(prefix + ': Negara Domisili (LN)', 'Harus diisi jika pindah luar negeri', 1, 'l_ang_' + i + '_ln_negara');
    if (!getRadio('l_ang_' + i + '_kawin')) e(prefix + ': Status Perkawinan', 'Belum dipilih', 1, 'l_ang_' + i + '_kawin');
    if (!getRadio('l_ang_' + i + '_jk')) e(prefix + ': Jenis Kelamin', 'Belum dipilih', 1, 'l_ang_' + i + '_jk');
    const tgl = getVal('l_ang_' + i + '_tgl_lahir');
    if (!tgl) e(prefix + ': Tanggal Lahir', 'Harus diisi', 1, 'l_ang_' + i + '_tgl_lahir');
    const umur = parseInt(getVal('l_ang_' + i + '_umur')) || 0;
    if (tgl && umur === 0 && !getVal('l_ang_' + i + '_umur')) {
      e(prefix + ': Umur', 'Tidak dapat dihitung dari tanggal lahir — periksa nilai tanggal', 1, 'l_ang_' + i + '_tgl_lahir');
    }
    if (umur > 120) w(prefix + ': Umur', `${umur} tahun — verifikasi (lebih dari 120)`, 1, 'l_ang_' + i + '_tgl_lahir');
    // Cek konsistensi hubungan vs umur
    const hub = getVal('l_ang_' + i + '_hubungan');
    if (hub === '1' && umur > 0 && umur < 15) w(prefix + ': Kepala Keluarga', `KK berumur ${umur} tahun — verifikasi`, 1, 'l_ang_' + i + '_hubungan');
    if (hub === '2' && umur > 0 && umur < 15) w(prefix + ': Istri/Suami', `Pasangan berumur ${umur} tahun — verifikasi`, 1, 'l_ang_' + i + '_hubungan');
    // Age-gated (≥5)
    if (umur >= 5) {
      const sekolah = getRadio('l_ang_' + i + '_sekolah');
      if (!sekolah) e(prefix + ': Partisipasi Sekolah', 'Wajib diisi untuk umur ≥ 5', 1, 'l_ang_' + i + '_sekolah');
      // Ijazah required unless sekolah='0' (tidak pernah sekolah — field hidden)
      if (sekolah !== '0' && !getRadio('l_ang_' + i + '_ijazah')) e(prefix + ': Ijazah Tertinggi', 'Wajib diisi untuk umur ≥ 5', 1, 'l_ang_' + i + '_ijazah');
      if (!getRadio('l_ang_' + i + '_rekening')) e(prefix + ': Rekening Aktif', 'Wajib diisi untuk umur ≥ 5', 1, 'l_ang_' + i + '_rekening');
    }
    // Age-gated (≥10)
    if (umur >= 10) {
      const profesi = getVal('l_ang_' + i + '_profesi');
      if (!profesi) e(prefix + ': Profesi Utama', 'Wajib diisi untuk umur ≥ 10', 1, 'l_ang_' + i + '_profesi');
      // Kedudukan required unless profesi='000' (tidak bekerja — field hidden)
      if (profesi !== '000' && !getRadio('l_ang_' + i + '_kedudukan')) e(prefix + ': Kedudukan Pekerjaan', 'Wajib diisi untuk umur ≥ 10', 1, 'l_ang_' + i + '_kedudukan');
      if (!getRadio('l_ang_' + i + '_18a')) e(prefix + ': Pendapatan Pekerjaan', 'Belum dipilih', 1, 'l_ang_' + i + '_18a');
      if (!getRadio('l_ang_' + i + '_18b')) e(prefix + ': Pendapatan Keuntungan Usaha', 'Belum dipilih', 1, 'l_ang_' + i + '_18b');
      if (!getRadio('l_ang_' + i + '_18c')) e(prefix + ': Penerimaan Transfer/Pasif', 'Belum dipilih', 1, 'l_ang_' + i + '_18c');
    }
    // Disabilitas & penyakit kronis — bila kosong, dianggap "TT/Tidak Tahu" — log ke kosong saja
    const disK = ['a','b','c','d','e','f'].filter(k => !getRadio('l_ang_' + i + '_disab_' + k));
    if (disK.length > 0) k(prefix + ': Disabilitas', disK.length + ' kategori belum diisi (boleh dilewat)', 1, 'l_ang_' + i + '_disab_a');
    const krK = ['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p'].filter(k => !getRadio('l_ang_' + i + '_kronis_' + k));
    if (krK.length > 0) k(prefix + ': Penyakit Kronis', krK.length + ' kategori belum diisi (boleh dilewat)', 1, 'l_ang_' + i + '_kronis_a');
  }
  // Validasi: anggota pertama harus Kepala Keluarga
  if (capped >= 1 && getVal('l_ang_1_hubungan') && getVal('l_ang_1_hubungan') !== '1')
    e('Anggota #1: Hubungan Keluarga', 'Anggota pertama harus Kepala Keluarga (pilih kode 1)', 1, 'l_ang_1_hubungan');
  // Validasi: jumlah pendataan = jumlah anggota terisi nama
  const jmlPdt = parseInt(getVal('l1_jml_pendataan')) || 0;
  if (jmlAng > 0 && jmlPdt < jmlAng) w('Rincian 2b: Jumlah Pendataan', `Baru ${jmlPdt} dari ${jmlAng} anggota terdata namanya`, 1, 'l1_jml_pendataan');

  /* === BLOK II: Usaha (multi-usaha, iterate _usahaDataStore) === */
  function validateOneUsaha(d, idx) {
    const pre = 'Usaha ke-' + idx + ': ';
    if (!d.l2_nama_usaha) e(pre + 'Nama Usaha', 'Harus diisi', 2, 'l2_nama_usaha');
    if (!d.l2_alamat) e(pre + 'Alamat Usaha', 'Harus diisi', 2, 'l2_alamat');
    const lhp = d.l2_hp || '';
    if (lhp && typeof isValidHP === 'function' && !isValidHP(lhp)) e(pre + 'Nomor HP Usaha', 'Format tidak valid', 2, 'l2_hp');
    const lem = d.l2_email || '';
    if (lem && typeof isValidEmail === 'function' && !isValidEmail(lem)) e(pre + 'Email Usaha', 'Format email tidak valid', 2, 'l2_email');
    const kw = d['_r_l2_kawasan'] || '';
    if (!kw) e(pre + 'Jenis Kawasan', 'Belum dipilih', 2, 'l2_kawasan');
    else if (kw !== '10' && !d.l2_nama_kawasan) e(pre + 'Nama Kawasan', 'Harus diisi jika bukan di luar kawasan', 2, 'l2_nama_kawasan');
    if (!d['_r_l2_jenis_usaha']) e(pre + 'Jenis Usaha', 'Belum dipilih', 2, 'l2_jenis_usaha');
    const nibR = d['_r_l2_punya_nib'] || '';
    if (!nibR) e(pre + 'Kepemilikan NIB', 'Belum dipilih', 2, 'l2_punya_nib');
    if (nibR === '1') {
      const nib = d.l2_nib || '';
      if (!nib) e(pre + 'Nomor NIB', 'Harus diisi', 2, 'l2_nib');
      else if (nib.length !== 13) e(pre + 'Nomor NIB', 'Harus tepat 13 digit', 2, 'l2_nib');
    }
    if (nibR === '2' && !d['_r_l2_nib_alasan']) e(pre + 'Alasan Tidak Punya NIB', 'Belum dipilih', 2, 'l2_nib_alasan');
    if (d['_r_l2_nib_alasan'] === '5' && !d.l2_nib_alasan_lain) e(pre + 'Alasan NIB Lainnya', 'Harus diisi', 2, 'l2_nib_alasan_lain');
    if (!d['_r_l2_badan_usaha']) e(pre + 'Badan Usaha', 'Belum dipilih', 2, 'l2_badan_usaha');
    if (!d.l2_pengusaha_nama) e(pre + 'Nama Pengusaha', 'Harus diisi', 2, 'l2_pengusaha_nama');
    if (!d['_r_l2_pengusaha_jk']) e(pre + 'Jenis Kelamin Pengusaha', 'Belum dipilih', 2, 'l2_pengusaha_jk');
    const uP = parseInt(d.l2_pengusaha_umur || '');
    if (!d.l2_pengusaha_umur) e(pre + 'Umur Pengusaha', 'Harus diisi', 2, 'l2_pengusaha_umur');
    else if (uP < 17 || uP > 120) e(pre + 'Umur Pengusaha', uP + ' tahun — harus antara 17–120', 2, 'l2_pengusaha_umur');
    else if (uP < 22) w(pre + 'Umur Pengusaha', 'Pengusaha umur ' + uP + ' tahun, cukup muda — verifikasi', 2, 'l2_pengusaha_umur');
    else if (uP > 75) w(pre + 'Umur Pengusaha', 'Pengusaha umur ' + uP + ' tahun — verifikasi kembali', 2, 'l2_pengusaha_umur');
    const nikP = d.l2_pengusaha_nik || '';
    if (!nikP) e(pre + 'NIK Pengusaha', 'Harus diisi', 2, 'l2_pengusaha_nik');
    else if (nikP.length !== 16) e(pre + 'NIK Pengusaha', 'Harus tepat 16 digit', 2, 'l2_pengusaha_nik');
    if (!d.l2_kegiatan_utama) e(pre + 'Kegiatan Utama', 'Harus diisi', 2, 'l2_kegiatan_utama');
    const lb1 = d['_r_l2_b1'] || '', lb2 = d['_r_l2_b2'] || '';
    if (!lb1) e(pre + 'Produksi Barang (b1)', 'Harus dijawab', 2, 'l2_b1');
    if (!lb2) e(pre + 'Layanan Makan Minum (b2)', 'Harus dijawab', 2, 'l2_b2');
    const showLb3 = lb1 === '2' && lb2 === '2';
    const lb3 = showLb3 ? (d['_r_l2_b3'] || '') : '';
    if (showLb3 && !lb3) e(pre + 'Penjualan Barang (b3)', 'Harus dijawab', 2, 'l2_b3');
    if (showLb3 && lb3 === '2' && !d['_r_l2_b4']) e(pre + 'Jenis Aktivitas (b4)', 'Harus dipilih', 2, 'l2_b4');
    const showLc = lb2 === '1' || (showLb3 && lb3 === '1');
    if (showLc && !d['_r_l2_c']) e(pre + 'Lokasi Usaha (c)', 'Belum dipilih', 2, 'l2_c');
    const showLde = lb1 === '1' && lb2 === '2';
    if (showLde && !d.l2_input)  e(pre + 'Input/Bahan Baku (14d)', 'Harus diisi', 2, 'l2_input');
    if (showLde && !d.l2_proses) e(pre + 'Proses Produksi (14e)', 'Harus diisi', 2, 'l2_proses');
    if (!d.l2_produk_utama) e(pre + 'Produk Utama', 'Harus diisi', 2, 'l2_produk_utama');
    if (!d.l2_kbli_kode) e(pre + 'KBLI 2025', 'Belum dipilih dari daftar', 2, 'l2_kbli_search');
    if (!d['_r_l2_jaringan']) e(pre + 'Jaringan Usaha', 'Belum dipilih', 2, 'l2_jaringan');
    if (d['_r_l2_jaringan'] === '2' && !d.l2_jml_cabang) e(pre + 'Jumlah Cabang', 'Harus diisi', 2, 'l2_jml_cabang');
    if (!d['_r_l2_internet']) e(pre + 'Penggunaan Internet (16a)', 'Belum dipilih', 2, 'l2_internet');
    if (d['_r_l2_internet'] === '1') {
      ['b1','b2','b3','b4','b5','b6'].forEach(s => {
        if (!d['_r_l2_internet_' + s]) e(pre + 'Tujuan Internet (16b' + s + ')', 'Belum dipilih', 2, 'l2_internet_' + s);
      });
    }
    if (!d['_r_l2_teknologi'])   e(pre + 'Teknologi Digital (16c)', 'Belum dipilih', 2, 'l2_teknologi');
    if (!d['_r_l2_ramah_a'])     e(pre + 'Produk Ramah Lingkungan (17a)', 'Belum dipilih', 2, 'l2_ramah_a');
    if (!d['_r_l2_ramah_b'])     e(pre + 'Input Perlindungan Lingkungan (17b)', 'Belum dipilih', 2, 'l2_ramah_b');
    if (!d['_r_l2_kreatif'])     e(pre + 'Produk Kreatif/Seni (18)', 'Belum dipilih', 2, 'l2_kreatif');
    if (!d['_r_l2_halal'])       e(pre + 'Sertifikat Halal (19a)', 'Belum dipilih', 2, 'l2_halal');
    if (d['_r_l2_halal'] === '1') {
      if (!d.l2_halal_b && d.l2_halal_b !== '0') e(pre + 'Jumlah Varian Halal (19b)', 'Harus diisi', 2, 'l2_halal_b');
      if (!d.l2_halal_c && d.l2_halal_c !== '0') e(pre + 'Jumlah Varian Belum Halal (19c)', 'Harus diisi', 2, 'l2_halal_c');
    }
    if (!d['_r_l2_bpom'])        e(pre + 'Izin Edar BPOM (20a)', 'Belum dipilih', 2, 'l2_bpom');
    if (d['_r_l2_bpom'] === '1') {
      if (!d.l2_bpom_b && d.l2_bpom_b !== '0') e(pre + 'Jumlah Varian BPOM (20b)', 'Harus diisi', 2, 'l2_bpom_b');
      if (!d.l2_bpom_c && d.l2_bpom_c !== '0') e(pre + 'Jumlah Varian Belum BPOM (20c)', 'Harus diisi', 2, 'l2_bpom_c');
    }
    if (!d['_r_l2_mitra_kdkmp']) e(pre + 'Mitra KDKMP (21)', 'Belum dipilih', 2, 'l2_mitra_kdkmp');
    if (!d['_r_l2_mbg'])         e(pre + 'Program MBG (22)', 'Belum dipilih', 2, 'l2_mbg');
    if (!d['_r_l2_nonpend_a'])   e(pre + 'Transaksi Barang Non-Penduduk (23a)', 'Belum dipilih', 2, 'l2_nonpend_a');
    if (!d['_r_l2_nonpend_b'])   e(pre + 'Transaksi Jual Jasa Non-Penduduk (23b)', 'Belum dipilih', 2, 'l2_nonpend_b');
    if (!d['_r_l2_nonpend_c'])   e(pre + 'Transaksi Beli Jasa Non-Penduduk (23c)', 'Belum dipilih', 2, 'l2_nonpend_c');
    if (d.l2_pekerja_l === '' || d.l2_pekerja_l === undefined) e(pre + 'Pekerja Laki-laki (24a)', 'Harus diisi (isi 0 jika tidak ada)', 2, 'l2_pekerja_l');
    if (d.l2_pekerja_p === '' || d.l2_pekerja_p === undefined) e(pre + 'Pekerja Perempuan (24b)', 'Harus diisi (isi 0 jika tidak ada)', 2, 'l2_pekerja_p');
    const totPekerja = (parseInt(d.l2_pekerja_l)||0) + (parseInt(d.l2_pekerja_p)||0);
    if (d.l2_pekerja_l !== '' && d.l2_pekerja_l !== undefined && d.l2_pekerja_p !== '' && d.l2_pekerja_p !== undefined && totPekerja > 500) w(pre + 'Jumlah Pekerja', 'Total ' + totPekerja + ' pekerja — verifikasi (usaha rumah tangga umumnya kecil)', 2, 'l2_pekerja_l');
    const yr = parseInt(d.l2_tahun_operasi || '');
    if (!d.l2_tahun_operasi) e(pre + 'Tahun Operasi (25)', 'Harus diisi', 2, 'l2_tahun_operasi');
    else if (yr < 1900 || yr > 2026) e(pre + 'Tahun Operasi (25)', 'Harus antara 1900–2026', 2, 'l2_tahun_operasi');
    if (d.l2_tahun_operasi && yr >= 1900 && yr < 2026) {
      // Tahunan section (26-29) — validate y29 modal sum
      const y29ids = ['l2_y29a','l2_y29b','l2_y29c','l2_y29d','l2_y29e','l2_y29f'];
      if (y29ids.every(id => d[id] !== undefined && d[id] !== '')) {
        const tot = y29ids.map(id => parseFloat(d[id])||0).reduce((a,b)=>a+b,0);
        if (Math.abs(tot-100) > 0.01) e(pre + 'Kepemilikan Modal (29)', 'Total ' + Math.round(tot*100)/100 + '% — harus = 100%', 2, 'l2_y29a');
      }
    } else if (d.l2_tahun_operasi && yr >= 2026) {
      // Bulanan section (30-33) — validate m33 modal sum
      const m33ids = ['l2_m33a','l2_m33b','l2_m33c','l2_m33d','l2_m33e','l2_m33f'];
      if (m33ids.every(id => d[id] !== undefined && d[id] !== '')) {
        const tot = m33ids.map(id => parseFloat(d[id])||0).reduce((a,b)=>a+b,0);
        if (Math.abs(tot-100) > 0.01) e(pre + 'Modal Saat Didirikan (33)', 'Total ' + Math.round(tot*100)/100 + '% — harus = 100%', 2, 'l2_m33a');
      }
    }
  }

  const _usahaList = (typeof _usahaDataStore !== 'undefined') ? _usahaDataStore : [];
  if (_usahaList.length === 0) {
    e('BLOK II: Daftar Usaha', 'Harus ada minimal 1 usaha', 2, null);
  } else {
    const activeIdx = (typeof _activeUsahaIdx !== 'undefined') ? _activeUsahaIdx : null;
    _usahaList.forEach((u, i) => {
      const idx = i + 1;
      const data = (activeIdx === idx && typeof _collectL2Fields === 'function') ? _collectL2Fields() : u;
      validateOneUsaha(data, idx);
    });
  }

  /* === BLOK III: Perumahan & Aset === */
  const jb = getRadio('l3_jenis_bangunan');
  if (!jb) e('Rincian 1: Jenis Bangunan', 'Belum dipilih', 3, 'l3_jenis_bangunan');
  if ((jb === '3' || jb === '4') && !getVal('l3_lantai_apt')) e('Rincian 1: Lantai Apartemen', 'Harus diisi jika rusun/apartemen', 3, 'l3_lantai_apt');
  if (jb === '5' && !getVal('l3_bangunan_lain')) e('Rincian 1: Jenis Bangunan Lainnya', 'Harus diisi jika memilih Lainnya', 3, 'l3_bangunan_lain');
  if (jb !== '5' && getVal('l3_jml_keluarga') === '') e('Rincian 2: Jumlah Keluarga', 'Harus diisi', 3, 'l3_jml_keluarga');
  const sm = getRadio('l3_status_milik');
  if (!sm) e('Rincian 3: Status Kepemilikan', 'Belum dipilih', 3, 'l3_status_milik');
  if (sm === '1' && !getRadio('l3_bukti')) e('Rincian 3: Bukti Kepemilikan', 'Belum dipilih', 3, 'l3_bukti');
  if (sm === '5' && !getVal('l3_status_lain')) e('Rincian 3: Status Lainnya', 'Harus diisi jika memilih Lainnya', 3, 'l3_status_lain');
  if (getVal('l3_luas_lantai') === '') e('Rincian 5: Luas Lantai', 'Harus diisi', 3, 'l3_luas_lantai');
  const lantaiBahan = getRadio('l3_lantai_bahan') || getVal('l3_lantai_bahan');
  if (!lantaiBahan) e('Rincian 6a: Bahan Lantai', 'Belum dipilih', 3, 'l3_lantai_bahan');
  if (lantaiBahan && !['7','8','9'].includes(lantaiBahan) && !getRadio('l3_lantai_kondisi')) e('Rincian 6b: Kondisi Lantai', 'Belum dipilih', 3, 'l3_lantai_kondisi');
  const dindingBahan = getRadio('l3_dinding_bahan') || getVal('l3_dinding_bahan');
  if (!dindingBahan) e('Rincian 7a: Bahan Dinding', 'Belum dipilih', 3, 'l3_dinding_bahan');
  if (dindingBahan && !['6','7'].includes(dindingBahan) && !getRadio('l3_dinding_kondisi')) e('Rincian 7b: Kondisi Dinding', 'Belum dipilih', 3, 'l3_dinding_kondisi');
  const atapBahan = getRadio('l3_atap_bahan') || getVal('l3_atap_bahan');
  if (!atapBahan) e('Rincian 8a: Bahan Atap', 'Belum dipilih', 3, 'l3_atap_bahan');
  if (atapBahan && !['5','7','8'].includes(atapBahan) && !getRadio('l3_atap_kondisi')) e('Rincian 8b: Kondisi Atap', 'Belum dipilih', 3, 'l3_atap_kondisi');
  const bab = getRadio('l3_bab');
  if (!bab) e('Rincian 9: Fasilitas BAB', 'Belum dipilih', 3, 'l3_bab');
  if (['1','2','3'].includes(bab) && !getRadio('l3_kloset')) e('Rincian 9: Jenis Kloset', 'Belum dipilih', 3, 'l3_kloset');
  if (!['4','5','6'].includes(bab) && !getRadio('l3_tinja')) e('Rincian 11: Tempat Pembuangan Tinja', 'Belum dipilih', 3, 'l3_tinja');
  if (!getVal('l3_air')) e('Rincian 11: Sumber Air Minum', 'Belum dipilih', 3, 'l3_air');
  const lst = getRadio('l3_listrik');
  if (!lst) e('Rincian 12: Sumber Listrik', 'Belum dipilih', 3, 'l3_listrik');
  if (lst === '1' && getVal('l3_meteran_jml') === '') e('Rincian 12: Jumlah Meteran', 'Harus diisi jika ada PLN', 3, 'l3_meteran_jml');
  if (getVal('l3_makanan_mgg') === '') e('Rincian 13a: Pengeluaran Makanan/Minggu', 'Harus diisi', 3, 'l3_makanan_mgg');
  if (getVal('l3_nonmakanan_bln') === '') e('Rincian 13b: Pengeluaran Non-Makanan/Bulan', 'Harus diisi', 3, 'l3_nonmakanan_bln');
  if (getVal('l3_nonmakanan_thn') === '') e('Rincian 13c: Pengeluaran Non-Makanan/Tahun', 'Harus diisi', 3, 'l3_nonmakanan_thn');
  // Aset bergerak / tidak bergerak: angka wajib (0 valid)
  const asetItems = [
    ['l3_aset_gas3', '14a: Tabung Gas 3kg'],
    ['l3_aset_gas5', '14b: Tabung Gas 5.5kg+'],
    ['l3_aset_kulkas', '14c: Kulkas'],
    ['l3_aset_ac', '14d: AC'],
    ['l3_aset_emas', '14e: Emas/Perhiasan'],
    ['l3_aset_komputer', '14f: Komputer/Laptop'],
    ['l3_aset_motor', '15a: Motor'],
    ['l3_aset_mobil', '15b: Mobil'],
    ['l3_aset_tanah', '16a: Tanah'],
    ['l3_aset_rumah', '16b: Rumah'],
  ];
  asetItems.forEach(([id, lbl]) => {
    if (getVal(id) === '') e('Rincian ' + lbl, 'Harus diisi (isi 0 jika tidak ada)', 3, id);
  });

  /* === BLOK IV: Catatan (opsional) === */
  if (!getVal('l4_catatan')) k('Blok IV: Catatan Pendata', 'Tidak diisi (opsional)', 4, 'l4_catatan');

  /* === BLOK V: Responden === (Identitas petugas otomatis dari login — tak divalidasi) */
  if (!getVal('l5_responden_nama')) e('Responden: Nama', 'Harus diisi', 5, 'l5_responden_nama');
  if (!getVal('l5_responden_hp')) e('Responden: Nomor HP', 'Harus diisi', 5, 'l5_responden_hp');
  else if (!isValidHP(getVal('l5_responden_hp'))) e('Responden: Nomor HP', 'Format tidak valid', 5, 'l5_responden_hp');
  const l5Email = getVal('l5_responden_email');
  if (l5Email && !isValidEmail(l5Email)) e('Responden: Email', 'Format email tidak valid', 5, 'l5_responden_email');
  if (!getVal('l5_tanggal')) e('Responden: Tanggal Pelaksanaan', 'Harus diisi', 5, 'l5_tanggal');
  if (typeof l5HasSig === 'undefined' || l5HasSig !== true) e('Tanda Tangan', 'Harus diisi — gambar di kotak tanda tangan', 5, 'l5_sigCanvas');

  // Unified stage "usaha-saja" (bangunan lainnya): hanya data usaha yang diwajibkan.
  // Buang temuan blok keluarga — Blok I (keluarga&anggota) & Blok III (perumahan&aset).
  if (typeof window !== 'undefined' && window.__cawiLScope === 'usaha') {
    const keepUsaha = (arr) => arr.filter((x) => x.blok !== 1 && x.blok !== 3);
    return { errors: keepUsaha(errors), warnings: keepUsaha(warnings), kosong: keepUsaha(kosong) };
  }

  return {errors, warnings, kosong};
}
