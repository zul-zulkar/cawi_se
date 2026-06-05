/* ============================================================
 * form-p-progress.js — Progress Blok P (SE2026-P / pemutakhiran)
 * calcProgressP() → { pct, filled, total } (pola calcProgressL).
 * Hitung field wajib (nama/keberadaan/kode bangunan + geotag) dan
 * sejumlah field opsional yang relevan. Geotag tidak dihitung bila
 * keberadaan = pindah (2) / fiktif (3) (selaras validasi).
 * ============================================================ */
function calcProgressP() {
  const val = (id) => (typeof getVal === 'function') ? getVal(id) : '';
  let filled = 0, total = 0;

  const wajib = ['pmt_nama', 'pmt_keberadaan', 'pmt_kode_bangunan'];
  wajib.forEach((id) => { total++; if (val(id)) filled++; });

  // Geotag (1 slot) — kecuali keberadaan pindah/fiktif
  const keb = val('pmt_keberadaan');
  const geoExempt = (keb === '2' || keb === '3');
  if (!geoExempt) { total++; if (val('pmt_lat') && val('pmt_lng')) filled++; }

  // Opsional yang ikut dihitung
  const opsional = ['pmt_jml_usaha', 'pmt_idsbr', 'pmt_jml_kk', 'pmt_no_kel', 'pmt_no_bgn', 'pmt_jalan'];
  opsional.forEach((id) => { total++; if (val(id)) filled++; });

  const pct = total ? Math.round(filled / total * 100) : 0;
  return { pct, filled, total };
}

if (typeof window !== 'undefined') window.calcProgressP = calcProgressP;
