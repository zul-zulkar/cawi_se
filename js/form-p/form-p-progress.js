/* ============================================================
 * form-p-progress.js — Progress Blok P (SE2026-P / pemutakhiran)
 * calcProgressP() → { pct, filled, total } (pola calcProgressL).
 * Menghitung TEPAT field yang diwajibkan collectAllProblemsP (1:1) supaya
 * "Field Wajib Terisi" mencapai 100% persis saat validasi lolos:
 *   selalu : jenis_entitas, nama, keberadaan, kode bangunan, no urut bangunan
 *   keluarga (jenis≠2)         : + no urut keluarga
 *   geotag                     : kecuali keberadaan 0/3/6
 *   stage keluarga (kode 2/3) &&
 *     keberadaan 1/2           : + nik, nomor_kk, sesuai_kk, jalan, blok
 * Field opsional (jml_usaha, idsbr, jml_kk/menetap, sls_*) TIDAK dihitung.
 * Field pilihan = radio → getRadio (fallback getVal untuk kompat tes).
 * ============================================================ */
function calcProgressP() {
  const val = (id) => (typeof getVal === 'function') ? getVal(id) : '';
  const rad = (id) => ((typeof getRadio === 'function') ? getRadio(id) : '') || val(id);
  let filled = 0, total = 0;
  const cText = (id) => { total++; if (val(id)) filled++; };
  const cRad = (id) => { total++; if (rad(id)) filled++; };

  const isBangunan = (rad('pmt_jenis_entitas') === '2');
  const keb = rad('pmt_keberadaan');
  const kode = val('pmt_kode_bangunan');
  const stageKeluarga = (kode === '2' || kode === '3');
  const kebFull = (keb === '1' || keb === '2');

  cRad('pmt_jenis_entitas');
  cText('pmt_nama');
  cRad('pmt_keberadaan');
  cText('pmt_kode_bangunan');
  cText('pmt_no_bgn');
  if (!isBangunan) cText('pmt_no_kel');     // no urut keluarga: wajib utk entitas keluarga

  // Geotag (1 slot) — kecuali keberadaan tidak ditemukan/meninggal/khusus
  const geoExempt = (keb === '0' || keb === '3' || keb === '6');
  if (!geoExempt) { total++; if (val('pmt_lat') && val('pmt_lng')) filled++; }

  // Identitas keluarga + alamat (Blok P sumber tunggal) — wajib saat kuesioner
  // keluarga aktif (kode 2/3) & keluarga ditemukan/baru (keberadaan 1/2).
  if (stageKeluarga && kebFull) {
    ['pmt_nik', 'pmt_nomor_kk', 'pmt_jalan', 'pmt_blok'].forEach(cText);
    cRad('pmt_sesuai_kk');
  }

  const pct = total ? Math.round(filled / total * 100) : 0;
  return { pct, filled, total };
}

if (typeof window !== 'undefined') window.calcProgressP = calcProgressP;
