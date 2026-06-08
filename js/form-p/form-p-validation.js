/* ============================================================
 * form-p-validation.js — Validasi Blok P (SE2026-P / pemutakhiran)
 * collectAllProblemsP() → { errors, warnings, kosong } (pola form-l-validation).
 * Wajib: pmt_nama, pmt_keberadaan, pmt_kode_bangunan, pmt_no_bgn, geotag (lat+lng),
 *        pmt_no_kel (khusus entitas keluarga).
 * Geotag dikecualikan bila keberadaan = tidak ditemukan(0)/meninggal(3)/khusus(6).
 * Field pilihan kini radio → dibaca getRadio (fallback getVal untuk kompat tes).
 * ============================================================ */
function collectAllProblemsP() {
  const errors = [], warnings = [], kosong = [];
  const val = (id) => (typeof getVal === 'function') ? getVal(id) : '';
  const rad = (id) => ((typeof getRadio === 'function') ? getRadio(id) : '') || val(id);

  function pushErr(id, label) {
    errors.push({ field: id, label: 'Blok P', text: label + ' wajib diisi', blok: 'P' });
    kosong.push(id);
  }
  function reqVal(id, label) { if (!val(id)) pushErr(id, label); }
  function reqRad(id, label) { if (!rad(id)) pushErr(id, label); }

  reqRad('pmt_jenis_entitas', 'Jenis entitas yang didata');
  const isBangunan = (rad('pmt_jenis_entitas') === '2');

  reqVal('pmt_nama', isBangunan ? 'Nama usaha/bangunan' : 'Nama kepala keluarga');
  reqRad('pmt_keberadaan', isBangunan ? 'Keberadaan bangunan' : 'Keberadaan keluarga');
  reqVal('pmt_kode_bangunan', 'Kode penggunaan bangunan');
  reqVal('pmt_no_bgn', 'Nomor urut bangunan');
  if (!isBangunan) reqVal('pmt_no_kel', 'Nomor urut keluarga');

  // Identitas keluarga = SUMBER TUNGGAL Blok P (dialirkan ke Blok L1 + anggota #1).
  // Wajib hanya bila kuesioner keluarga akan tampil (kode bangunan 2/3) DAN
  // keluarga ditemukan/baru (keberadaan 1/2). NIK/No KK boleh kode khusus.
  const _kode = val('pmt_kode_bangunan');
  const _stageKeluarga = (_kode === '2' || _kode === '3');
  const _keb0 = rad('pmt_keberadaan');
  const _kebFull = (_keb0 === '1' || _keb0 === '2');
  if (_stageKeluarga && _kebFull) {
    const nik = val('pmt_nik');
    if (!nik) pushErr('pmt_nik', 'NIK kepala keluarga');
    else if (!/^(9999|7777)$/.test(nik) && !/^\d{16}$/.test(nik))
      errors.push({ field: 'pmt_nik', label: 'Blok P', text: 'NIK harus 16 digit (atau 9999/7777)', blok: 'P' });
    const nokk = val('pmt_nomor_kk');
    if (!nokk) pushErr('pmt_nomor_kk', 'Nomor Kartu Keluarga');
    else if (!/^(9999|8888|7777)$/.test(nokk) && !/^\d{16}$/.test(nokk))
      errors.push({ field: 'pmt_nomor_kk', label: 'Blok P', text: 'Nomor KK harus 16 digit (atau 9999/8888/7777)', blok: 'P' });
    reqRad('pmt_sesuai_kk', 'Kesesuaian alamat dengan KK');
    reqVal('pmt_jalan', 'Alamat — nama jalan/gang (isi "-" bila tidak ada)');
    reqVal('pmt_blok', 'Alamat — blok/nomor (isi "-" bila tidak ada)');
  }

  // Geotag wajib kecuali keberadaan tidak ditemukan(0)/meninggal(3)/khusus(6)
  const keb = rad('pmt_keberadaan');
  const geoExempt = (keb === '0' || keb === '3' || keb === '6');
  if (!geoExempt && (!val('pmt_lat') || !val('pmt_lng'))) {
    errors.push({ field: 'pmt_lat', label: 'Blok P', text: 'Lokasi GPS wajib diambil', blok: 'P' });
    kosong.push('pmt_lat');
  }

  // Jumlah usaha numerik ≥ 0 (bila diisi)
  const ju = val('pmt_jml_usaha');
  if (ju !== '' && (isNaN(parseInt(ju, 10)) || parseInt(ju, 10) < 0)) {
    warnings.push({ field: 'pmt_jml_usaha', text: 'Jumlah usaha harus angka ≥ 0' });
  }

  return { errors, warnings, kosong };
}

if (typeof window !== 'undefined') window.collectAllProblemsP = collectAllProblemsP;
