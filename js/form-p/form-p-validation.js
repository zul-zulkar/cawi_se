/* ============================================================
 * form-p-validation.js — Validasi Blok P (SE2026-P / pemutakhiran)
 * collectAllProblemsP() → { errors, warnings, kosong } (pola form-l-validation).
 * Field wajib: pmt_nama, pmt_keberadaan, pmt_kode_bangunan, geotag (lat+lng).
 * Geotag dikecualikan bila keberadaan = pindah (2) / fiktif (3).
 * ============================================================ */
function collectAllProblemsP() {
  const errors = [], warnings = [], kosong = [];
  const val = (id) => (typeof getVal === 'function') ? getVal(id) : '';

  function req(id, label) {
    if (!val(id)) {
      errors.push({ field: id, label: 'Blok P', text: label + ' wajib diisi', blok: 'P' });
      kosong.push(id);
      return false;
    }
    return true;
  }

  req('pmt_nama', 'Nama keluarga/usaha/bangunan');
  req('pmt_keberadaan', 'Keberadaan keluarga/bangunan');
  req('pmt_kode_bangunan', 'Kode penggunaan bangunan');

  // Geotag wajib kecuali keberadaan pindah(2)/fiktif(3)
  const keb = val('pmt_keberadaan');
  const geoExempt = (keb === '2' || keb === '3');
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
