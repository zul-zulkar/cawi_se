/* ====== RECAP ====== */
let _recapData = {error:[], warning:[], kosong:[], catatan:[]};
let _curRecapTab = 'error';

function collectAllProblems() {
  const errors = [], warnings = [], kosong = [];
  const e = (label, text, blok, field) => errors.push({label, text, blok, field: field || null});
  const w = (label, text, blok, field) => warnings.push({label, text, blok, field: field || null});
  const k = (label, text, blok, field) => kosong.push({label, text, blok, field: field || null});

  if (!getVal('q1_provinsi')) e('Pertanyaan 1: Provinsi', 'Belum dipilih', 1, 'q1_provinsi_inp');
  if (!getVal('q2_kabupaten')) e('Pertanyaan 2: Kabupaten/Kota', 'Belum dipilih', 1, 'q2_kabupaten_inp');
  if (!getVal('q3_kecamatan')) e('Pertanyaan 3: Kecamatan', 'Belum dipilih', 1, 'q3_kecamatan_inp');
  if (!getVal('q4_kelurahan')) e('Pertanyaan 4: Kelurahan/Desa', 'Belum dipilih', 1, 'q4_kelurahan_inp');
  if (!getVal('q5a_nama_perusahaan')) e('Pertanyaan 5a: Nama Perusahaan', 'Harus diisi', 1, 'q5a_nama_perusahaan');
  if (!getVal('q5b_nama_komersial')) e('Pertanyaan 5b: Nama Komersial', 'Harus diisi', 1, 'q5b_nama_komersial');
  if (!getVal('q5c_alamat')) e('Pertanyaan 5c: Alamat', 'Harus diisi', 1, 'q5c_alamat');
  const kodepos = getVal('q5c_kodepos');
  if (!kodepos || kodepos.length !== 5) e('Pertanyaan 5c: Kode Pos', 'Harus 5 digit', 1, 'q5c_kodepos');
  if (!getVal('q5c_hp')) e('Pertanyaan 5c: Nomor HP', 'Harus diisi', 1, 'q5c_hp');
  else if (!isValidHP(getVal('q5c_hp'))) e('Pertanyaan 5c: Nomor HP', 'Format tidak valid (contoh: 081234567890)', 1, 'q5c_hp');
  const emailP = getVal('q5c_email');
  if (emailP && !isValidEmail(emailP)) e('Pertanyaan 5c: Email Perusahaan', 'Format email tidak valid', 1, 'q5c_email');
  if (!emailP) k('Email Perusahaan', 'Tidak diisi (opsional)', 1, 'q5c_email');
  if (!getVal('q5c_website')) k('Website Perusahaan', 'Tidak diisi (opsional)', 1, 'q5c_website');
  if (!getVal('q5c_telepon')) k('Nomor Telepon Kantor', 'Tidak diisi (opsional)', 1, 'q5c_telepon');
  if (!getRadio('q5d')) e('Pertanyaan 5d: Jenis Kawasan', 'Belum dipilih', 1, 'q5d');
  else if (getRadio('q5d') !== '10' && !getVal('q5e_nama_kawasan')) e('Pertanyaan 5e: Nama Kawasan', 'Harus diisi jika bukan di luar kawasan', 1, 'q5e_nama_kawasan');
  if (!getRadio('q6a')) e('Pertanyaan 6a: Kepemilikan NIB', 'Belum dijawab', 1, 'q6a');
  if (getRadio('q6a') === '1') {
    if (!getVal('q6b_nib')) e('Pertanyaan 6b: Nomor NIB', 'Harus diisi', 1, 'q6b_nib');
    else if (getVal('q6b_nib').length !== 13) e('Pertanyaan 6b: Nomor NIB', 'Harus tepat 13 digit', 1, 'q6b_nib');
  }
  if (getRadio('q6a') === '2' && !getRadio('q6c')) e('Pertanyaan 6c: Alasan Tidak Punya NIB', 'Belum dipilih', 1, 'q6c');
  if (getRadio('q6c') === '5' && !getVal('q6c_alasan')) e('Pertanyaan 6c: Alasan Lainnya', 'Harus diisi jika memilih Lainnya', 1, 'q6c_alasan');
  if (!getRadio('q7a')) e('Pertanyaan 7a: Status Badan Usaha', 'Belum dipilih', 1, 'q7a');
  if (getRadio('q7a') === '3' && !getRadio('q7b')) e('Pertanyaan 7b: KDKMP', 'Belum dipilih', 1, 'q7b');
  if (getRadio('q7a') === '3' && !getRadio('q7c')) e('Pertanyaan 7c: Jenis Koperasi', 'Belum dipilih', 1, 'q7c');
  if (!getRadio('q7d')) e('Pertanyaan 7d: Laporan Keuangan', 'Belum dipilih', 1, 'q7d');
  if (!getVal('q8a_nama')) e('Pertanyaan 8a: Nama Pengusaha', 'Harus diisi', 1, 'q8a_nama');
  if (!getRadio('q8b')) e('Pertanyaan 8b: Jenis Kelamin', 'Belum dipilih', 1, 'q8b');
  const umur = parseInt(getVal('q8c_umur'));
  if (!getVal('q8c_umur')) e('Pertanyaan 8c: Umur', 'Harus diisi', 1, 'q8c_umur');
  else if (umur < 17 || umur > 120) e('Pertanyaan 8c: Umur', `${umur} tahun — harus antara 17–120`, 1, 'q8c_umur');
  else if (umur < 22) w('Pertanyaan 8c: Umur', `Pengusaha umur ${umur} tahun, cukup muda — verifikasi`, 1, 'q8c_umur');
  else if (umur > 75) w('Pertanyaan 8c: Umur', `Pengusaha umur ${umur} tahun — verifikasi kembali`, 1, 'q8c_umur');
  const nik = getVal('q8d_nik');
  if (!nik || nik.length !== 16) e('Pertanyaan 8d: NIK', 'Harus tepat 16 digit', 1, 'q8d_nik');
  else if (!/^\d{16}$/.test(nik)) e('Pertanyaan 8d: NIK', 'NIK hanya boleh berisi angka', 1, 'q8d_nik');
  const rt = getVal('q5c_rt'), rw = getVal('q5c_rw');
  if (rt && !/^\d+$/.test(rt)) e('Pertanyaan 5c: RT', 'RT hanya boleh berisi angka', 1, 'q5c_rt');
  if (rw && !/^\d+$/.test(rw)) e('Pertanyaan 5c: RW', 'RW hanya boleh berisi angka', 1, 'q5c_rw');
  if (!getVal('q9a_kegiatan')) e('Pertanyaan 9a: Kegiatan Utama', 'Harus diisi', 1, 'q9a_kegiatan');
  const b1=getRadio('q9b1'),b2=getRadio('q9b2'),b3=getRadio('q9b3'),b4=getRadio('q9b4');
  if (!b1||!b2||!b3||!b4) e('Pertanyaan 9b: Aktivitas Usaha', 'Semua pilihan b1–b4 harus dijawab', 1, 'q9b1');
  else if (b1==='2'&&b2==='2'&&b3==='2'&&b4==='2') e('Pertanyaan 9b: Aktivitas Usaha', 'Minimal satu b1–b4 harus "Ya"', 1, 'q9b1');
  if (!getRadio('q9c')) e('Pertanyaan 9c: Lokasi Usaha', 'Belum dipilih', 1, 'q9c');
  if (!getVal('q9d_input')) e('Pertanyaan 9d: Input/Bahan Baku', 'Harus diisi', 1, 'q9d_input');
  if (!getVal('q9e_proses')) e('Pertanyaan 9e: Proses Produksi', 'Harus diisi', 1, 'q9e_proses');
  if (!getVal('q9f_produk')) e('Pertanyaan 9f: Produk Utama', 'Harus diisi', 1, 'q9f_produk');
  if (!getVal('q9g_kbli_kode')) e('Pertanyaan 9g: KBLI 2025', 'Belum dipilih dari daftar', 1, 'q9g_kbli_search');
  const hotelW = document.getElementById('q9i_hotel_wrap');
  if (hotelW && !hotelW.classList.contains('hidden') && !getRadio('q9i')) e('Pertanyaan 9i: Klasifikasi Hotel', 'Belum dipilih', 1, 'q9i');
  if (!getRadio('q10a')) e('Pertanyaan 10a: Jaringan Usaha', 'Belum dipilih', 1, 'q10a');
  if (getRadio('q10a') === '2' && !getVal('q10b_jumlah')) e('Pertanyaan 10b: Jumlah Cabang', 'Harus diisi', 1, 'q10b_jumlah');
  const q11w = document.getElementById('q11_wrap');
  if (q11w && !q11w.classList.contains('hidden')) {
    if (!getVal('q11a_nama')) e('Pertanyaan 11a: Nama Kantor Pusat', 'Harus diisi', 1, 'q11a_nama');
    if (!getVal('q11b_alamat')) e('Pertanyaan 11b: Alamat Kantor Pusat', 'Harus diisi', 1, 'q11b_alamat');
    if (!getVal('q11c_email')) e('Pertanyaan 11c: Email Kantor Pusat', 'Harus diisi', 1, 'q11c_email');
    else if (!isValidEmail(getVal('q11c_email'))) e('Pertanyaan 11c: Email Kantor Pusat', 'Format email tidak valid', 1, 'q11c_email');
    if (document.getElementById('q11d_negara').value === 'ID') {
      if (!getVal('q11e_provinsi')) e('Pertanyaan 11e: Provinsi Kantor Pusat', 'Belum dipilih', 1, 'q11e_provinsi_inp');
      if (!getVal('q11f_kabupaten')) e('Pertanyaan 11f: Kabupaten/Kota Kantor Pusat', 'Belum dipilih', 1, 'q11f_kabupaten_inp');
    }
  }
  if (!getRadio('q12a')) e('Pertanyaan 12a: Penggunaan Internet', 'Belum dipilih', 1, 'q12a');
  if (getRadio('q12a') === '1') {
    if (!getRadio('q12b1')||!getRadio('q12b2')||!getRadio('q12b3')||!getRadio('q12b4')||!getRadio('q12b5')||!getRadio('q12b6'))
      e('Pertanyaan 12b: Tujuan Internet', 'Semua b1–b6 harus dijawab', 1, 'q12b1');
  }
  if (!getRadio('q12c')) e('Pertanyaan 12c: Teknologi Digital', 'Belum dipilih', 1, 'q12c');
  if (!getRadio('q13a')) e('Pertanyaan 13a: Ramah Lingkungan', 'Belum dipilih', 1, 'q13a');
  if (!getRadio('q13b')) e('Pertanyaan 13b: Biaya Lingkungan', 'Belum dipilih', 1, 'q13b');
  if (!getRadio('q14')) e('Pertanyaan 14: Produk Kreatif', 'Belum dipilih', 1, 'q14');
  if (!getRadio('q15a')) e('Pertanyaan 15a: Sertifikat Halal', 'Belum dipilih', 1, 'q15a');
  if (getRadio('q15a') === '1') {
    if (!getVal('q15b')) e('Pertanyaan 15b: Jumlah Varian Halal', 'Harus diisi', 1, 'q15b');
    if (!getVal('q15c')) e('Pertanyaan 15c: Jumlah Varian Belum Halal', 'Harus diisi', 1, 'q15c');
  }
  if (!getRadio('q16a')) e('Pertanyaan 16a: Izin Edar BPOM', 'Belum dipilih', 1, 'q16a');
  if (getRadio('q16a') === '1') {
    if (!getVal('q16b')) e('Pertanyaan 16b: Jumlah Varian BPOM', 'Harus diisi', 1, 'q16b');
    if (!getVal('q16c')) e('Pertanyaan 16c: Jumlah Varian Belum BPOM', 'Harus diisi', 1, 'q16c');
  }
  if (!getRadio('q17')) e('Pertanyaan 17: Mitra KDKMP', 'Belum dipilih', 1, 'q17');
  if (!getRadio('q18')) e('Pertanyaan 18: Program MBG', 'Belum dipilih', 1, 'q18');
  if (!getRadio('q19a')) e('Pertanyaan 19a: Transaksi Barang Non-Penduduk', 'Belum dipilih', 1, 'q19a');
  if (!getRadio('q19b')) e('Pertanyaan 19b: Transaksi Jasa Non-Penduduk', 'Belum dipilih', 1, 'q19b');
  if (!getVal('q20a')) e('Pertanyaan 20a: Pekerja Laki-laki', 'Harus diisi (isi 0 jika tidak ada)', 1, 'q20a');
  if (!getVal('q20b')) e('Pertanyaan 20b: Pekerja Perempuan', 'Harus diisi (isi 0 jika tidak ada)', 1, 'q20b');
  const totPekerja = (parseInt(getVal('q20a'))||0)+(parseInt(getVal('q20b'))||0);
  if (getVal('q20a') && getVal('q20b') && totPekerja === 0) w('Pertanyaan 20: Jumlah Pekerja', 'Total 0 pekerja — verifikasi apakah benar', 1, 'q20a');
  else if (totPekerja > 5000) w('Pertanyaan 20: Jumlah Pekerja', `Total ${totPekerja} pekerja sangat besar — verifikasi`, 1, 'q20a');
  if (!getVal('q21')) e('Pertanyaan 21: Tahun Beroperasi', 'Harus diisi', 1, 'q21');
  else {
    const thn = parseInt(getVal('q21'));
    if (thn < 1900 || thn > 2026) e('Pertanyaan 21: Tahun Beroperasi', 'Harus antara 1900–2026', 1, 'q21');
    else if (thn >= 2025) w('Pertanyaan 21: Tahun Beroperasi', `Mulai beroperasi ${thn} (sangat baru) — verifikasi`, 1, 'q21');
  }
  if (!getVal('q22a')) e('Pertanyaan 22a: Upah &amp; Gaji', 'Harus diisi (isi 0 jika tidak ada)', 1, 'q22a');
  if (!getVal('q22b')) e('Pertanyaan 22b: Biaya Produksi', 'Harus diisi', 1, 'q22b');
  if (!getVal('q22c')) e('Pertanyaan 22c: Biaya Pembelian Barang', 'Harus diisi', 1, 'q22c');
  if (!getVal('q22d')) e('Pertanyaan 22d: Biaya Operasional', 'Harus diisi', 1, 'q22d');
  if (!getVal('q22e')) e('Pertanyaan 22e: Biaya Non-Operasional', 'Harus diisi', 1, 'q22e');
  if (!getVal('q23a')) e('Pertanyaan 23a: Nilai Barang/Jasa', 'Harus diisi', 1, 'q23a');
  const pctO = getVal('q23d');
  if (pctO === '') e('Pertanyaan 23d: Persentase Online', 'Harus diisi (isi 0 jika tidak ada)', 1, 'q23d');
  else if (isNaN(parseFloat(pctO)) || parseFloat(pctO) < 0 || parseFloat(pctO) > 100) e('Pertanyaan 23d: Persentase Online', 'Harus antara 0–100%', 1, 'q23d');
  if (!getVal('q24a')) e('Pertanyaan 24a: Aset Tanah &amp; Bangunan', 'Harus diisi', 1, 'q24a');
  if (!getVal('q24b')) e('Pertanyaan 24b: Aset Selain Tanah', 'Harus diisi', 1, 'q24b');
  if (!getRadio('q24c1')) w('Pertanyaan 24c1: Kategori Aset', 'Belum dipilih (diisi jika tidak tahu nilai nominal)', 1, 'q24c1');
  if (!getVal('q24d')) e('Pertanyaan 24d: Luas Tanah', 'Harus diisi (isi 0 jika tidak ada)', 1, 'q24d');
  const mfs = ['q25a','q25b','q25c','q25d','q25e','q25f'];
  if (!mfs.every(f => getVal(f) !== '')) e('Pertanyaan 25: Kepemilikan Modal', 'Semua komponen harus diisi', 1, 'q25a');
  else {
    const tot = mfs.map(id=>parseFloat(getVal(id))||0).reduce((a,b)=>a+b,0);
    if (Math.abs(tot-100) > 0.01) e('Pertanyaan 25: Kepemilikan Modal', `Total ${Math.round(tot*100)/100}% — harus = 100%`, 1, 'q25a');
  }
  const pen = parseCurrency(getVal('q22f')), pend = parseCurrency(getVal('q23c'));
  if (pen > 0 && pend > 0 && pend < pen * 0.05) w('Pertanyaan 22–23: Keuangan', 'Pendapatan jauh lebih kecil dari pengeluaran — verifikasi', 1, 'q23a');

  if (!getVal('p_nama')) e('Petugas: Nama Petugas', 'Harus diisi', 3, 'p_nama');
  if (!getVal('r_nama')) e('Responden: Nama', 'Harus diisi', 3, 'r_nama');
  if (!getVal('r_hp')) e('Responden: Nomor HP', 'Harus diisi', 3, 'r_hp');
  else if (!isValidHP(getVal('r_hp'))) e('Responden: Nomor HP', 'Format tidak valid', 3, 'r_hp');
  if (!getVal('r_email')) e('Responden: Email', 'Harus diisi', 3, 'r_email');
  else if (!isValidEmail(getVal('r_email'))) e('Responden: Email', 'Format tidak valid', 3, 'r_email');
  if (!getVal('r_tanggal')) e('Responden: Tanggal Pelaksanaan', 'Harus diisi', 3, 'r_tanggal');
  if (!hasSig) e('Tanda Tangan', 'Harus diisi — gambar di kotak tanda tangan', 3, 'sigCanvas');

  if (!document.getElementById('lokasi_lat').value)
    e('Blok II: Lokasi Kunjungan', 'Koordinat GPS wajib diambil sebelum submit', 2, 'lokasiBtn');

  if (!getVal('catatan1') && !getVal('catatan2') && !getVal('catatan3'))
    k('Blok II: Catatan Kunjungan', 'Semua catatan kunjungan kosong (opsional untuk CAWI)', 2, 'catatan1');

  return {errors, warnings, kosong};
}

function collectRemarks() {
  const remarks = [];
  document.querySelectorAll('.remark-area textarea').forEach((ta) => {
    const text = ta.value.trim();
    if (!text) return;
    const card = ta.closest('.section-card');
    const header = card ? card.querySelector('.section-header') : null;
    const lbl = header ? header.innerText.replace(/[\+✕] Catatan/g,'').trim() : 'Catatan';
    remarks.push({label: lbl, text});
  });
  return remarks;
}

function showRecap() {
  const {errors, warnings, kosong} = collectAllProblems();
  const catatan = collectRemarks();
  _recapData = {error: errors, warning: warnings, kosong, catatan};

  const badge = (id, count, isError) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = count;
    if (count > 0) el.classList.add(isError ? 'err' : 'has-count');
    else el.classList.remove('err','has-count');
  };
  badge('badge-error', errors.length, true);
  badge('badge-warning', warnings.length, false);
  badge('badge-kosong', kosong.length, false);
  badge('badge-catatan', catatan.length, false);

  const btn = document.getElementById('confirmSubmitBtn');
  if (btn) {
    btn.disabled = errors.length > 0;
    btn.title = errors.length > 0 ? 'Perbaiki semua Error terlebih dahulu' : '';
  }

  showRecapTab('error');
  document.getElementById('recapModal').classList.add('open');
  document.getElementById('recapOverlay').classList.add('open');
  closeSidebar();
  closePetunjuk();
}

function showRecapTab(tab) {
  _curRecapTab = tab;
  document.querySelectorAll('.recap-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  const body = document.getElementById('recapBody');
  const items = _recapData[tab] || [];
  if (!items.length) {
    const icons = {error:'&#9989;',warning:'&#128161;',kosong:'&#128203;',catatan:'&#128221;'};
    const msgs = {
      error:'Tidak ada error. Semua data wajib sudah terisi dengan benar.',
      warning:'Tidak ada peringatan.',
      kosong:'Tidak ada field opsional yang kosong.',
      catatan:'Belum ada catatan pendata. Tambahkan melalui tombol <strong>+ Catatan</strong> di setiap kartu pertanyaan.'
    };
    body.innerHTML = `<div class="recap-empty-state"><div class="recap-empty-icon">${icons[tab]}</div><div class="recap-empty-text">${msgs[tab]}</div></div>`;
    return;
  }
  const cls = {error:'item-error',warning:'item-warning',kosong:'item-empty',catatan:'item-remark'};
  body.innerHTML = items.map((item, i) => {
    const dataStr = JSON.stringify(item).replace(/'/g,"&#39;");
    return `<div class="recap-item ${cls[tab]}" style="animation-delay:${i*0.04}s" onclick='recapNavigate(${dataStr},"${tab}")'>
      <div class="recap-item-label">${item.label}</div>
      <div class="recap-item-text">${item.text}</div>
    </div>`;
  }).join('');
}

function recapNavigate(item, tab) {
  if (tab === 'catatan') return;
  closeRecap();
  if (item.blok) {
    goBlok(item.blok);
    if (item.field) {
      setTimeout(() => {
        let el = document.getElementById(item.field);
        // Fallback: radio button (no id, use name attribute)
        if (!el) el = document.querySelector(`input[name="${item.field}"]`);
        if (el) { el.focus(); el.scrollIntoView({behavior:'smooth', block:'center'}); }
      }, 420);
    }
  }
}

function closeRecap() {
  document.getElementById('recapModal').classList.remove('open');
  document.getElementById('recapOverlay').classList.remove('open');
}

async function confirmSubmit() {
  closeRecap();
  await submitForm();
}
