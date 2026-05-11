/* ====== PROGRESS CALCULATION ====== */
function calcProgress() {
  let t = 0, f = 0;
  const c = ok => { t++; if (ok) f++; };
  // Q1-Q4 lokasi
  c(!!getVal('q1_provinsi')); c(!!getVal('q2_kabupaten'));
  c(!!getVal('q3_kecamatan')); c(!!getVal('q4_kelurahan'));
  // Q5 identitas perusahaan
  c(!!getVal('q5a_nama_perusahaan')); c(!!getVal('q5b_nama_komersial'));
  c(!!getVal('q5c_alamat'));
  c(getVal('q5c_kodepos').length === 5);
  const hp5 = getVal('q5c_hp');
  c(!!hp5 && isValidHP(hp5));
  c(!!getRadio('q5d'));
  if (getRadio('q5d') && getRadio('q5d') !== '10') c(!!getVal('q5e_nama_kawasan'));
  // Q6 NIB
  c(!!getRadio('q6a'));
  if (getRadio('q6a') === '1') c(getVal('q6b_nib').length === 13);
  if (getRadio('q6a') === '2') c(!!getRadio('q6c'));
  if (getRadio('q6c') === '5') c(!!getVal('q6c_alasan'));
  // Q7 badan usaha
  c(!!getRadio('q7a'));
  if (getRadio('q7a') === '3') { c(!!getRadio('q7b')); c(!!getRadio('q7c')); }
  c(!!getRadio('q7d'));
  // Q8 pengusaha
  c(!!getVal('q8a_nama')); c(!!getRadio('q8b'));
  const u = parseInt(getVal('q8c_umur'));
  c(!!getVal('q8c_umur') && u >= 17 && u <= 120);
  c(getVal('q8d_nik').length === 16);
  // Q9 kegiatan
  c(!!getVal('q9a_kegiatan'));
  ['q9b1','q9b2','q9b3','q9b4'].forEach(n => c(!!getRadio(n)));
  const bv = ['q9b1','q9b2','q9b3','q9b4'].map(n => getRadio(n));
  if (bv.every(v => v)) c(!bv.every(v => v === '2'));
  c(!!getRadio('q9c'));
  c(!!getVal('q9d_input')); c(!!getVal('q9e_proses')); c(!!getVal('q9f_produk'));
  c(!!getVal('q9g_kbli_kode'));
  const hW = document.getElementById('q9i_hotel_wrap');
  if (hW && !hW.classList.contains('hidden')) c(!!getRadio('q9i'));
  // Q10 jaringan
  c(!!getRadio('q10a'));
  if (getRadio('q10a') === '2') c(!!getVal('q10b_jumlah'));
  // Q11 kantor pusat (conditional)
  const qW = document.getElementById('q11_wrap');
  if (qW && !qW.classList.contains('hidden')) {
    c(!!getVal('q11a_nama')); c(!!getVal('q11b_alamat'));
    const e11 = getVal('q11c_email');
    c(!!e11 && isValidEmail(e11));
    const n11 = document.getElementById('q11d_negara');
    if (n11 && n11.value === 'ID') { c(!!getVal('q11e_provinsi')); c(!!getVal('q11f_kabupaten')); }
  }
  // Q12-Q19
  c(!!getRadio('q12a'));
  if (getRadio('q12a') === '1') ['q12b1','q12b2','q12b3','q12b4','q12b5','q12b6'].forEach(n => c(!!getRadio(n)));
  c(!!getRadio('q12c'));
  c(!!getRadio('q13a')); c(!!getRadio('q13b')); c(!!getRadio('q14'));
  c(!!getRadio('q15a'));
  if (getRadio('q15a') === '1') { c(getVal('q15b') !== ''); c(getVal('q15c') !== ''); }
  c(!!getRadio('q16a'));
  if (getRadio('q16a') === '1') { c(getVal('q16b') !== ''); c(getVal('q16c') !== ''); }
  c(!!getRadio('q17')); c(!!getRadio('q18'));
  c(!!getRadio('q19a')); c(!!getRadio('q19b'));
  // Q20-Q25
  c(getVal('q20a') !== ''); c(getVal('q20b') !== '');
  const yr = parseInt(getVal('q21'));
  c(!!getVal('q21') && yr >= 1900 && yr <= 2026);
  ['q22a','q22b','q22c','q22d','q22e'].forEach(id => c(!!getVal(id)));
  c(!!getVal('q23a'));
  const pO = getVal('q23d');
  c(pO !== '' && !isNaN(+pO) && +pO >= 0 && +pO <= 100);
  c(!!getVal('q24a')); c(!!getVal('q24b')); c(!!getVal('q24d'));
  const mf = ['q25a','q25b','q25c','q25d','q25e','q25f'];
  mf.forEach(id => c(getVal(id) !== ''));
  if (mf.every(id => getVal(id) !== '')) {
    const tot25 = mf.map(id => parseFloat(getVal(id)) || 0).reduce((a,b) => a+b, 0);
    c(Math.abs(tot25 - 100) < 0.01);
  }
  // Blok III responden
  c(!!getVal('r_nama'));
  const hp3 = getVal('r_hp'); c(!!hp3 && isValidHP(hp3));
  const re = getVal('r_email'); c(!!re && isValidEmail(re));
  c(!!getVal('r_tanggal')); c(hasSig);
  return { pct: Math.round(f / t * 100), filled: f, total: t };
}

function updateProgress() {
  const { pct, filled, total } = calcProgress();
  const sf = document.getElementById('sidebarProgressFill');
  const sp = document.getElementById('sidebarProgressPct');
  const sd = document.getElementById('sidebarProgressDetail');
  if (sf) sf.style.width = pct + '%';
  if (sp) sp.textContent = pct + '%';
  if (sd) sd.textContent = filled + ' dari ' + total + ' field wajib terisi';
}
