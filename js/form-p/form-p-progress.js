/* ============================================================
 * form-p-progress.js — Progress Blok P (SE2026-P / pemutakhiran)
 * calcProgressP() → { pct, filled, total } (pola calcProgressL).
 * Wajib: nama, keberadaan, kode bangunan, no. urut bangunan, geotag.
 * Geotag tidak dihitung bila keberadaan tidak ditemukan(0)/meninggal(3)/khusus(6).
 * Field pilihan = radio → getRadio (fallback getVal untuk kompat tes).
 * ============================================================ */
function calcProgressP() {
  const val = (id) => (typeof getVal === 'function') ? getVal(id) : '';
  const rad = (id) => ((typeof getRadio === 'function') ? getRadio(id) : '') || val(id);
  let filled = 0, total = 0;
  const cText = (id) => { total++; if (val(id)) filled++; };
  const cRad = (id) => { total++; if (rad(id)) filled++; };

  cText('pmt_nama');
  cRad('pmt_keberadaan');
  cText('pmt_kode_bangunan');
  cText('pmt_no_bgn');

  // Geotag (1 slot) — kecuali keberadaan tidak ditemukan/meninggal/khusus
  const keb = rad('pmt_keberadaan');
  const geoExempt = (keb === '0' || keb === '3' || keb === '6');
  if (!geoExempt) { total++; if (val('pmt_lat') && val('pmt_lng')) filled++; }

  // Opsional yang ikut dihitung
  const opsional = ['pmt_jml_usaha', 'pmt_no_kel', 'pmt_jalan'];
  opsional.forEach((id) => { total++; if (val(id)) filled++; });

  const pct = total ? Math.round(filled / total * 100) : 0;
  return { pct, filled, total };
}

if (typeof window !== 'undefined') window.calcProgressP = calcProgressP;
