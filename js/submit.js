function validateBlok1() {
  if (!getVal('q1_provinsi')) return 'Pertanyaan 1: Pilih Provinsi';
  if (!getVal('q2_kabupaten')) return 'Pertanyaan 2: Pilih Kabupaten/Kota';
  if (!getVal('q3_kecamatan')) return 'Pertanyaan 3: Pilih Kecamatan';
  if (!getVal('q4_kelurahan')) return 'Pertanyaan 4: Pilih Kelurahan/Desa/Nagari';
  if (!getVal('q5a_nama_perusahaan')) return 'Pertanyaan 5a: Isi Nama Perusahaan';
  if (!getVal('q5b_nama_komersial')) return 'Pertanyaan 5b: Isi Nama Komersial';
  if (!getVal('q5c_alamat')) return 'Pertanyaan 5c: Isi Alamat Perusahaan';
  const kodepos = getVal('q5c_kodepos');
  if (!kodepos || kodepos.length !== 5) return 'Pertanyaan 5c: Kode Pos harus 5 digit';
  if (!getVal('q5c_hp')) return 'Pertanyaan 5c: Isi Nomor HP/WhatsApp';
  if (!isValidHP(getVal('q5c_hp'))) return 'Pertanyaan 5c: Format nomor HP tidak valid (contoh: 081234567890)';
  const emailPerusahaan = getVal('q5c_email');
  if (emailPerusahaan && !isValidEmail(emailPerusahaan)) return 'Pertanyaan 5c: Format email perusahaan tidak valid';
  if (!getRadio('q5d')) return 'Pertanyaan 5d: Pilih Jenis Kawasan';
  const kawasan = getRadio('q5d');
  if (kawasan !== '10' && !getVal('q5e_nama_kawasan')) return 'Pertanyaan 5e: Isi Nama Kawasan';
  if (!getRadio('q6a')) return 'Pertanyaan 6a: Apakah memiliki NIB?';
  if (getRadio('q6a') === '1') {
    if (!getVal('q6b_nib')) return 'Pertanyaan 6b: Isi NIB';
    if (getVal('q6b_nib').length !== 13) return 'Pertanyaan 6b: NIB harus 13 digit';
  }
  if (getRadio('q6a') === '2' && !getRadio('q6c')) return 'Pertanyaan 6c: Pilih alasan tidak memiliki NIB';
  if (getRadio('q6c') === '5' && !getVal('q6c_alasan')) return 'Pertanyaan 6c: Isi alasan lainnya';
  if (!getRadio('q7a')) return 'Pertanyaan 7a: Pilih Status Badan Usaha';
  if (getRadio('q7a') === '3' && !getRadio('q7b')) return 'Pertanyaan 7b: Pilih apakah KDKMP?';
  if (getRadio('q7a') === '3' && !getRadio('q7c')) return 'Pertanyaan 7c: Pilih Jenis Koperasi';
  if (!getRadio('q7d')) return 'Pertanyaan 7d: Apakah memiliki laporan keuangan?';
  if (!getVal('q8a_nama')) return 'Pertanyaan 8a: Isi Nama Pengusaha';
  if (!getRadio('q8b')) return 'Pertanyaan 8b: Pilih Jenis Kelamin';
  if (!getVal('q8c_umur')) return 'Pertanyaan 8c: Isi Umur';
  const umur = parseInt(getVal('q8c_umur'));
  if (umur < 17 || umur > 120) return 'Pertanyaan 8c: Umur harus antara 17-120 tahun';
  const nik = getVal('q8d_nik');
  if (!nik || nik.length !== 16) return 'Pertanyaan 8d: NIK harus 16 digit';
  if (!/^\d{16}$/.test(nik)) return 'Pertanyaan 8d: NIK hanya boleh berisi angka';
  const rt5 = getVal('q5c_rt'), rw5 = getVal('q5c_rw');
  if (rt5 && !/^\d+$/.test(rt5)) return 'Pertanyaan 5c: RT hanya boleh berisi angka';
  if (rw5 && !/^\d+$/.test(rw5)) return 'Pertanyaan 5c: RW hanya boleh berisi angka';
  if (!getVal('q9a_kegiatan')) return 'Pertanyaan 9a: Isi Kegiatan Utama';
  const b1=getRadio('q9b1'), b2=getRadio('q9b2'), b3=getRadio('q9b3'), b4=getRadio('q9b4');
  if (!b1||!b2||!b3||!b4) return 'Pertanyaan 9b: Jawab semua pertanyaan b1-b4';
  if (b1==='2'&&b2==='2'&&b3==='2'&&b4==='2') return 'Pertanyaan 9b: Minimal satu dari b1-b4 harus dijawab "Ya"';
  if (!getRadio('q9c')) return 'Pertanyaan 9c: Pilih lokasi usaha';
  if (!getVal('q9d_input')) return 'Pertanyaan 9d: Isi input yang digunakan';
  if (!getVal('q9e_proses')) return 'Pertanyaan 9e: Isi proses produksi';
  if (!getVal('q9f_produk')) return 'Pertanyaan 9f: Isi produk utama';
  if (!getVal('q9g_kbli_kode')) return 'Pertanyaan 9g: Pilih KBLI';
  if (!document.getElementById('q9i_hotel_wrap').classList.contains('hidden') && !getRadio('q9i'))
    return 'Pertanyaan 9i: Pilih Klasifikasi Hotel';
  if (!getRadio('q10a')) return 'Pertanyaan 10a: Pilih Jaringan Usaha';
  if (getRadio('q10a')==='2' && !getVal('q10b_jumlah')) return 'Pertanyaan 10b: Isi jumlah kantor cabang';
  if (['3','4','5','6'].includes(getRadio('q10a'))) {
    if (!getVal('q11a_nama')) return 'Pertanyaan 11a: Isi Nama Kantor Pusat';
    if (!getVal('q11b_alamat')) return 'Pertanyaan 11b: Isi Alamat Kantor Pusat';
    if (!getVal('q11c_email')) return 'Pertanyaan 11c: Isi Email Kantor Pusat';
    if (!isValidEmail(getVal('q11c_email'))) return 'Pertanyaan 11c: Format email Kantor Pusat tidak valid';
    const negaraKP = document.getElementById('q11d_negara') ? document.getElementById('q11d_negara').value : 'ID';
    if (negaraKP === 'ID') {
      if (!getVal('q11e_provinsi')) return 'Pertanyaan 11e: Pilih Provinsi Kantor Pusat';
      if (!getVal('q11f_kabupaten')) return 'Pertanyaan 11f: Pilih Kabupaten/Kota Kantor Pusat';
    }
  }
  if (!getRadio('q12a')) return 'Pertanyaan 12a: Pilih apakah menggunakan internet?';
  if (getRadio('q12a') === '1') {
    if (!getRadio('q12b1')) return 'Pertanyaan 12b1: Pilih tujuan internet (menerima pesanan)';
    if (!getRadio('q12b2')) return 'Pertanyaan 12b2: Pilih tujuan internet (produksi)';
    if (!getRadio('q12b3')) return 'Pertanyaan 12b3: Pilih tujuan internet (distribusi)';
    if (!getRadio('q12b4')) return 'Pertanyaan 12b4: Pilih tujuan internet (beli bahan baku)';
    if (!getRadio('q12b5')) return 'Pertanyaan 12b5: Pilih tujuan internet (promosi)';
    if (!getRadio('q12b6')) return 'Pertanyaan 12b6: Pilih tujuan internet (lainnya)';
  }
  if (!getRadio('q12c')) return 'Pertanyaan 12c: Pilih apakah memanfaatkan teknologi digital?';
  if (!getRadio('q13a')) return 'Pertanyaan 13a: Pilih produk ramah lingkungan?';
  if (!getRadio('q13b')) return 'Pertanyaan 13b: Pilih biaya/investasi lingkungan?';
  if (!getRadio('q14')) return 'Pertanyaan 14: Pilih apakah menggunakan produk kreatif?';
  if (!getRadio('q15a')) return 'Pertanyaan 15a: Pilih sertifikat halal?';
  if (getRadio('q15a') === '1') {
    if (getVal('q15b') === '') return 'Pertanyaan 15b: Isi jumlah varian sudah halal BPJPH';
    if (getVal('q15c') === '') return 'Pertanyaan 15c: Isi jumlah varian belum halal BPJPH';
  }
  if (!getRadio('q16a')) return 'Pertanyaan 16a: Pilih izin edar?';
  if (getRadio('q16a') === '1') {
    if (getVal('q16b') === '') return 'Pertanyaan 16b: Isi jumlah varian sudah izin BPOM';
    if (getVal('q16c') === '') return 'Pertanyaan 16c: Isi jumlah varian belum izin BPOM';
  }
  if (!getRadio('q17')) return 'Pertanyaan 17: Pilih apakah bermitra KDKMP?';
  if (!getRadio('q18')) return 'Pertanyaan 18: Pilih keterlibatan MBG?';
  if (!getRadio('q19a')) return 'Pertanyaan 19a: Pilih transaksi barang non-penduduk?';
  if (!getRadio('q19b')) return 'Pertanyaan 19b: Pilih transaksi jasa non-penduduk?';
  if (getVal('q20a')==='' || getVal('q20b')==='') return 'Pertanyaan 20: Isi jumlah pekerja';
  if (!getVal('q21')) return 'Pertanyaan 21: Isi tahun mulai beroperasi';
  const thn = parseInt(getVal('q21'));
  if (thn < 1900 || thn > 2026) return 'Pertanyaan 21: Tahun harus antara 1900-2026';
  if (!getVal('q22a')) return 'Pertanyaan 22a: Isi nilai upah dan gaji';
  if (!getVal('q22b')) return 'Pertanyaan 22b: Isi biaya produksi';
  if (!getVal('q22c')) return 'Pertanyaan 22c: Isi biaya pembelian barang';
  if (!getVal('q22d')) return 'Pertanyaan 22d: Isi biaya operasional';
  if (!getVal('q22e')) return 'Pertanyaan 22e: Isi biaya non-operasional';
  if (!getVal('q23a')) return 'Pertanyaan 23a: Isi nilai barang dan jasa';
  if (getVal('q23d') === '') return 'Pertanyaan 23d: Isi persentase pendapatan online';
  const pctOnline = parseFloat(getVal('q23d'));
  if (isNaN(pctOnline) || pctOnline < 0 || pctOnline > 100) return 'Pertanyaan 23d: Persentase harus antara 0-100%';
  if (!getVal('q24a')) return 'Pertanyaan 24a: Isi nilai aset tanah dan bangunan';
  if (!getVal('q24b')) return 'Pertanyaan 24b: Isi nilai aset selain tanah';
  if (!getVal('q24d')) return 'Pertanyaan 24d: Isi luas tanah';
  const modalFields = ['q25a','q25b','q25c','q25d','q25e','q25f'];
  for (const f of modalFields) {
    if (getVal(f) === '') return 'Pertanyaan 25: Isi semua komponen kepemilikan modal';
  }
  const totalModal = modalFields.map(id=>parseFloat(getVal(id))||0).reduce((a,b)=>a+b,0);
  if (Math.abs(totalModal - 100) > 0.01) return `Pertanyaan 25: Total kepemilikan modal harus = 100% (saat ini: ${Math.round(totalModal*100)/100}%)`;
  return null;
}

function validateBlok3() {
  if (!getVal('p_nama')) return 'Nama petugas pendata harus diisi';
  if (!getVal('r_nama')) return 'Nama responden harus diisi';
  if (!getVal('r_hp')) return 'Nomor HP/Telepon responden harus diisi';
  if (!isValidHP(getVal('r_hp'))) return 'Format nomor HP responden tidak valid (contoh: 081234567890)';
  if (!getVal('r_email')) return 'Email responden harus diisi';
  if (!isValidEmail(getVal('r_email'))) return 'Format email responden tidak valid';
  if (!getVal('r_tanggal')) return 'Tanggal pelaksanaan harus diisi';
  if (!hasSig) return 'Tanda tangan harus diisi';
  return null;
}


function collectData() {
  const data = {
    timestamp: new Date().toLocaleString('id-ID'),
    // Blok I
    provinsi: document.getElementById('q1_provinsi').options[document.getElementById('q1_provinsi').selectedIndex]?.text || '',
    provinsi_kd: getVal('q1_provinsi'),
    kabupaten: document.getElementById('q2_kabupaten').options[document.getElementById('q2_kabupaten').selectedIndex]?.text || '',
    kabupaten_kd: getVal('q2_kabupaten'),
    kecamatan: document.getElementById('q3_kecamatan').options[document.getElementById('q3_kecamatan').selectedIndex]?.text || '',
    kecamatan_kd: getVal('q3_kecamatan'),
    kelurahan: document.getElementById('q4_kelurahan').options[document.getElementById('q4_kelurahan').selectedIndex]?.text || '',
    kelurahan_kd: getVal('q4_kelurahan'),
    nama_perusahaan: getVal('q5a_nama_perusahaan'),
    nama_komersial: getVal('q5b_nama_komersial'),
    alamat: getVal('q5c_alamat'),
    rt: getVal('q5c_rt'), rw: getVal('q5c_rw'),
    kode_pos: getVal('q5c_kodepos'),
    email_perusahaan: getVal('q5c_email'),
    website: getVal('q5c_website'),
    telepon: `(${getVal('q5c_kodearea')}) ${getVal('q5c_telepon')} ext ${getVal('q5c_ext')}`,
    hp: getVal('q5c_hp'),
    jenis_kawasan: getRadio('q5d'),
    nama_kawasan: getVal('q5e_nama_kawasan'),
    punya_nib: getRadio('q6a'),
    nib: getVal('q6b_nib'),
    alasan_no_nib: getRadio('q6c'),
    alasan_no_nib_lain: getVal('q6c_alasan'),
    badan_usaha: getRadio('q7a'),
    kdkmp: getRadio('q7b'),
    jenis_koperasi: getRadio('q7c'),
    laporan_keuangan: getRadio('q7d'),
    nama_pengusaha: getVal('q8a_nama'),
    jenis_kelamin_pengusaha: getRadio('q8b'),
    umur_pengusaha: getVal('q8c_umur'),
    nik_pengusaha: getVal('q8d_nik'),
    kegiatan_utama: getVal('q9a_kegiatan'),
    produksi_barang: getRadio('q9b1'),
    layanan_makan: getRadio('q9b2'),
    penjualan_barang: getRadio('q9b3'),
    aktivitas_jasa: getRadio('q9b4'),
    lokasi_usaha: getRadio('q9c'),
    input_digunakan: getVal('q9d_input'),
    proses_produksi: getVal('q9e_proses'),
    produk_utama: getVal('q9f_produk'),
    kbli_kode: getVal('q9g_kbli_kode'),
    kbli_judul: getVal('q9g_kbli_search'),
    kbli_kategori: getVal('q9g_kbli_kategori'),
    klasifikasi_hotel: getRadio('q9i'),
    jaringan_usaha: getRadio('q10a'),
    jumlah_cabang: getVal('q10b_jumlah'),
    kp_nama: getVal('q11a_nama'),
    kp_alamat: getVal('q11b_alamat'),
    kp_email: getVal('q11c_email'),
    kp_negara: getVal('q11d_negara'),
    kp_provinsi: getVal('q11e_provinsi'),
    kp_kabupaten: getVal('q11f_kabupaten'),
    pakai_internet: getRadio('q12a'),
    internet_pesanan: getRadio('q12b1'),
    internet_produksi: getRadio('q12b2'),
    internet_distribusi: getRadio('q12b3'),
    internet_beli: getRadio('q12b4'),
    internet_promosi: getRadio('q12b5'),
    internet_lain: getRadio('q12b6'),
    digital: getRadio('q12c'),
    ramah_lingkungan: getRadio('q13a'),
    biaya_lingkungan: getRadio('q13b'),
    produk_kreatif: getRadio('q14'),
    sertifikat_halal: getRadio('q15a'),
    varian_halal_bpjph: getVal('q15b'),
    varian_belum_halal_bpjph: getVal('q15c'),
    izin_edar: getRadio('q16a'),
    varian_bpom: getVal('q16b'),
    varian_belum_bpom: getVal('q16c'),
    mitra_kdkmp: getRadio('q17'),
    program_mbg: getRadio('q18'),
    transaksi_barang_nonpenduduk: getRadio('q19a'),
    transaksi_jasa_nonpenduduk: getRadio('q19b'),
    pekerja_laki: getVal('q20a'),
    pekerja_perempuan: getVal('q20b'),
    pekerja_total: getVal('q20c'),
    tahun_beroperasi: getVal('q21'),
    pengeluaran_upah: parseCurrency(getVal('q22a')),
    pengeluaran_produksi: parseCurrency(getVal('q22b')),
    pengeluaran_beli_barang: parseCurrency(getVal('q22c')),
    pengeluaran_operasional: parseCurrency(getVal('q22d')),
    pengeluaran_nonoperasional: parseCurrency(getVal('q22e')),
    pengeluaran_total: parseCurrency(getVal('q22f')),
    pendapatan_barang_jasa: parseCurrency(getVal('q23a')),
    pendapatan_lain: parseCurrency(getVal('q23b')),
    pendapatan_total: parseCurrency(getVal('q23c')),
    pct_online: getVal('q23d'),
    aset_tanah_bangunan: parseCurrency(getVal('q24a')),
    aset_lain: parseCurrency(getVal('q24b')),
    aset_total: parseCurrency(getVal('q24c')),
    aset_kategori: getRadio('q24c1'),
    luas_tanah: getVal('q24d'),
    modal_perorangan: getVal('q25a'),
    modal_lnprt: getVal('q25b'),
    modal_korporasi_publik: getVal('q25c'),
    modal_korporasi_non: getVal('q25d'),
    modal_pemerintah: getVal('q25e'),
    modal_asing: getVal('q25f'),
    modal_total: getVal('q25g'),
    // Blok II
    lokasi_lat: document.getElementById('lokasi_lat').value,
    lokasi_lng: document.getElementById('lokasi_lng').value,
    lokasi_akurasi: document.getElementById('lokasi_akurasi').value,
    catatan1: getVal('catatan1'), waktu1: getVal('waktu1'),
    catatan2: getVal('catatan2'), waktu2: getVal('waktu2'),
    catatan3: getVal('catatan3'), waktu3: getVal('waktu3'),
    // Blok III — Petugas
    petugas_nama: getVal('p_nama'),
    petugas_nip: getVal('p_nip'),
    petugas_hp: getVal('p_hp'),
    // Blok III — Responden
    responden_nama: getVal('r_nama'),
    responden_hp: getVal('r_hp'),
    responden_email: getVal('r_email'),
    tanggal_pelaksanaan: getVal('r_tanggal'),
    tanda_tangan: hasSig ? canvas.toDataURL('image/png') : ''
  };
  if (_editRecordId) data._edit_id = _editRecordId;
  return data;
}


async function submitForm() {
  hideAlert('submitAlert');

  // Validate Blok I
  const errB1 = validateBlok1();
  if (errB1) {
    goBlok(1);
    setTimeout(() => showAlert('alertBox', 'Blok I — ' + errB1), 300);
    return;
  }

  // Validate Blok III
  const errB3 = validateBlok3();
  if (errB3) {
    showAlert('submitAlert', errB3);
    return;
  }

  const btn = document.getElementById('submitBtn');
  btn.disabled = true;
  btn.textContent = 'Mengirim...';

  try {
    const data = collectData();
    const isEdit = !!(data._edit_id);
    console.log('[SUBMIT] mode:', isEdit ? 'EDIT id=' + data._edit_id : 'BARU');
    // Content-Type: text/plain → tidak perlu no-cors, bisa baca response
    const res = await fetch(getScriptUrl(), {
      method: 'POST',
      headers: {'Content-Type': 'text/plain'},
      body: JSON.stringify(data)
    });
    let gasOk = true;
    try {
      const json = await res.json();
      console.log('[SUBMIT] GAS response:', json);
      if (json.status !== 'ok') throw new Error(json.message || 'GAS error');
    } catch(parseErr) {
      // Jika response bukan JSON (mis. redirect GAS), abaikan
      if (parseErr.message && parseErr.message !== 'GAS error') {
        console.warn('[SUBMIT] Tidak bisa parse response GAS:', parseErr.message);
      } else if (parseErr.message === 'GAS error') {
        throw parseErr;
      }
    }
    const wasEdit = isEdit;
    btn.textContent = wasEdit ? 'DIPERBARUI ✓' : 'TERKIRIM ✓';
    btn.style.background = '#38a169';
    _editRecordId = null;
    cancelEditMode();
    clearDraft();
    if (_currentDraftId) { deleteDraftById(_currentDraftId); }
    // Simpan ringkasan ke daftar lokal
    try {
      const LS_REC = 'cawi_se2026_records_v1';
      const recs = JSON.parse(localStorage.getItem(LS_REC) || '[]');
      recs.unshift({ _id: Date.now(), _ts: new Date().toISOString(), ...data });
      localStorage.setItem(LS_REC, JSON.stringify(recs));
    } catch(_e) {}
    document.getElementById('submitAlert').classList.add('hidden');
    const successDiv = document.createElement('div');
    successDiv.className = 'alert alert-success';
    successDiv.innerHTML = wasEdit
      ? '<strong>Data berhasil diperbarui!</strong> Rekaman asli telah ditimpa di Google Sheets.'
      : '<strong>Data berhasil dikirim!</strong> Terima kasih telah mengisi form CAWI SE2026.';
    document.getElementById('submitBtn').parentNode.insertBefore(successDiv, document.getElementById('submitBtn'));
  } catch(e) {
    btn.disabled = false;
    btn.textContent = 'KIRIM / SUBMIT';
    showAlert('submitAlert', 'Gagal mengirim: ' + e.message + '. Pastikan koneksi internet stabil dan coba lagi.');
  }
}


/* ====== EDIT MODE (dari daftar.html) ====== */
const EDIT_KEY = 'cawi_edit_mode';
let _editRecordId = null;

function cancelEditMode() {
  localStorage.removeItem(EDIT_KEY);
  _editRecordId = null;
  const b = document.getElementById('editModeBanner');
  if (b) b.style.display = 'none';
}

function loadEditMode() {
  const raw = localStorage.getItem(EDIT_KEY);
  if (!raw) return false;
  localStorage.removeItem(EDIT_KEY);
  try {
    const r = JSON.parse(raw);
    const banner = document.getElementById('editModeBanner');
    if (banner) banner.style.display = 'block';

    // Isi field teks / angka / textarea
    const textMap = {
      'q5a_nama_perusahaan': r.nama_perusahaan,
      'q5b_nama_komersial':  r.nama_komersial,
      'q5c_alamat':          r.alamat,
      'q5c_rt':              r.rt,
      'q5c_rw':              r.rw,
      'q5c_kodepos':         r.kode_pos,
      'q5c_email':           r.email_perusahaan,
      'q5c_website':         r.website,
      'q5c_hp':              r.hp,
      'q5e_nama_kawasan':    r.nama_kawasan,
      'q6b_nib':             r.nib,
      'q6c_alasan':          r.alasan_no_nib_lain,
      'q8a_nama':            r.nama_pengusaha,
      'q8c_umur':            r.umur_pengusaha,
      'q8d_nik':             r.nik_pengusaha,
      'q9a_kegiatan':        r.kegiatan_utama,
      'q9d_input':           r.input_digunakan,
      'q9e_proses':          r.proses_produksi,
      'q9f_produk':          r.produk_utama,
      'q9g_kbli_kode':       r.kbli_kode,
      'q9g_kbli_search':     r.kbli_judul,
      'q9g_kbli_kategori':   r.kbli_kategori,
      'q9h_kategori':        r.kbli_kategori,
      'q10b_jumlah':         r.jumlah_cabang,
      'q11a_nama':           r.kp_nama,
      'q11b_alamat':         r.kp_alamat,
      'q11c_email':          r.kp_email,
      'q15b':                r.varian_halal_bpjph,
      'q15c':                r.varian_belum_halal_bpjph,
      'q16b':                r.varian_bpom,
      'q16c':                r.varian_belum_bpom,
      'q20a':                r.pekerja_laki,
      'q20b':                r.pekerja_perempuan,
      'q21':                 r.tahun_beroperasi,
      'q22a':                r.pengeluaran_upah,
      'q22b':                r.pengeluaran_produksi,
      'q22c':                r.pengeluaran_beli_barang,
      'q22d':                r.pengeluaran_operasional,
      'q22e':                r.pengeluaran_nonoperasional,
      'q23a':                r.pendapatan_barang_jasa,
      'q23b':                r.pendapatan_lain,
      'q23d':                r.pct_online,
      'q24a':                r.aset_tanah_bangunan,
      'q24b':                r.aset_lain,
      'q24d':                r.luas_tanah,
      'q25a':                r.modal_perorangan,
      'q25b':                r.modal_lnprt,
      'q25c':                r.modal_korporasi_publik,
      'q25d':                r.modal_korporasi_non,
      'q25e':                r.modal_pemerintah,
      'q25f':                r.modal_asing,
      'lokasi_lat': r.lokasi_lat, 'lokasi_lng': r.lokasi_lng, 'lokasi_akurasi': r.lokasi_akurasi,
      'catatan1': r.catatan1, 'waktu1': (r.waktu1 || '').substring(0, 16),
      'catatan2': r.catatan2, 'waktu2': (r.waktu2 || '').substring(0, 16),
      'catatan3': r.catatan3, 'waktu3': (r.waktu3 || '').substring(0, 16),
      'p_hp':     r.petugas_hp,
      'r_nama':   r.responden_nama,
      'r_hp':     r.responden_hp,
      'r_email':  r.responden_email,
      'r_tanggal':(r.tanggal_pelaksanaan || '').substring(0, 10),
    };
    Object.keys(textMap).forEach(id => {
      const val = textMap[id];
      if (!val) return;
      const el = document.getElementById(id);
      if (el) {
        el.value = val;
        el.dispatchEvent(new Event('input',  {bubbles:true}));
        el.dispatchEvent(new Event('change', {bubbles:true}));
      }
    });

    // Simpan _id untuk mode overwrite
    _editRecordId = r._id || null;

    // Parse telepon gabungan "(kodearea) nomor ext ext" kembali ke komponen
    if (r.telepon) {
      const m = r.telepon.match(/^\(([^)]*)\)\s*(.*?)\s+ext\s+(.*)$/);
      if (m) {
        const elKode = document.getElementById('q5c_kodearea');
        const elTel  = document.getElementById('q5c_telepon');
        const elExt  = document.getElementById('q5c_ext');
        if (elKode && m[1].trim()) elKode.value = m[1].trim();
        if (elTel  && m[2].trim()) elTel.value  = m[2].trim();
        if (elExt  && m[3].trim()) elExt.value  = m[3].trim();
      }
    }

    // Petugas: p_nip readonly — isi langsung
    if (r.petugas_nama) {
      const pNama = document.getElementById('p_nama');
      const pNip  = document.getElementById('p_nip');
      if (pNama) pNama.value = r.petugas_nama;
      if (pNip)  pNip.value  = r.petugas_nip || '';
    }

    // Render ulang tampilan lokasi jika sudah ada di rekaman
    if (r.lokasi_lat && r.lokasi_lng) {
      const result = document.getElementById('lokasiResult');
      const btn = document.getElementById('lokasiBtn');
      if (result) {
        result.innerHTML =
          '<div style="color:#276749;font-weight:700;margin-bottom:4px">&#10003; Lokasi terekam (dari data sebelumnya)</div>' +
          '<div style="color:#555">Lat: <strong>' + r.lokasi_lat + '</strong> &nbsp;|&nbsp; Lng: <strong>' + r.lokasi_lng + '</strong></div>' +
          (r.lokasi_akurasi ? '<div style="color:#888;font-size:11.5px;margin-top:2px">Akurasi: ±' + r.lokasi_akurasi + ' meter</div>' : '');
        result.style.background = '#f0fff4';
        result.style.borderColor = '#68d391';
      }
      if (btn) {
        btn.innerHTML = '&#10003; Lokasi Terekam';
        btn.style.background = '#276749';
        btn.dataset.done = '1';
        btn.onmouseover = null;
        btn.onmouseout = null;
      }
      setTimeout(() => renderLokasiMap(r.lokasi_lat, r.lokasi_lng, r.lokasi_akurasi), 300);
    }

    // Radio buttons
    const radioMap = {
      'q5d':  r.jenis_kawasan,
      'q6a':  r.punya_nib,
      'q6c':  r.alasan_no_nib,
      'q7a':  r.badan_usaha,
      'q7b':  r.kdkmp,
      'q7c':  r.jenis_koperasi,
      'q7d':  r.laporan_keuangan,
      'q8b':  r.jenis_kelamin_pengusaha,
      'q9b1': r.produksi_barang,
      'q9b2': r.layanan_makan,
      'q9b3': r.penjualan_barang,
      'q9b4': r.aktivitas_jasa,
      'q9c':  r.lokasi_usaha,
      'q9i':  r.klasifikasi_hotel,
      'q10a': r.jaringan_usaha,
      'q12a': r.pakai_internet,
      'q12b1':r.internet_pesanan,
      'q12b2':r.internet_produksi,
      'q12b3':r.internet_distribusi,
      'q12b4':r.internet_beli,
      'q12b5':r.internet_promosi,
      'q12b6':r.internet_lain,
      'q12c': r.digital,
      'q13a': r.ramah_lingkungan,
      'q13b': r.biaya_lingkungan,
      'q14':  r.produk_kreatif,
      'q15a': r.sertifikat_halal,
      'q16a': r.izin_edar,
      'q17':  r.mitra_kdkmp,
      'q18':  r.program_mbg,
      'q19a': r.transaksi_barang_nonpenduduk,
      'q19b': r.transaksi_jasa_nonpenduduk,
      'q24c1':r.aset_kategori,
    };
    Object.keys(radioMap).forEach(name => {
      const val = radioMap[name];
      if (!val) return;
      const radio = document.querySelector(`input[name="${name}"][value="${val}"]`);
      if (radio) { radio.checked = true; radio.dispatchEvent(new Event('change', {bubbles:true})); }
    });

    // KBLI chip
    if (r.kbli_kode && typeof kbliData !== 'undefined' && kbliData.length) {
      const entry = kbliData.find(d => d.kode === r.kbli_kode);
      if (entry && typeof selectKBLI === 'function') selectKBLI(entry);
    }

    // Lokasi: q1=Bali, q2=Buleleng sudah di-set default.
    // Kecamatan Buleleng sudah di-load oleh loadKecamatan('5108').
    // Cukup set kecamatan → load kelurahan → set kelurahan.
    if (r.kecamatan_kd) {
      const selKec = document.getElementById('q3_kecamatan');
      if (selKec) {
        selKec.value = r.kecamatan_kd;
        selKec.disabled = false;
        const kecInp = document.getElementById('q3_kecamatan_inp');
        if (kecInp) {
          const opt = selKec.options[selKec.selectedIndex];
          if (opt && opt.text) { kecInp.value = opt.text; kecInp.classList.add('has-value'); }
        }
        if (typeof loadKelurahan === 'function') loadKelurahan(r.kecamatan_kd);
        if (r.kelurahan_kd) {
          const selKel = document.getElementById('q4_kelurahan');
          if (selKel) {
            selKel.value = r.kelurahan_kd;
            selKel.disabled = false;
            const kelInp = document.getElementById('q4_kelurahan_inp');
            if (kelInp) {
              const opt = selKel.options[selKel.selectedIndex];
              if (opt && opt.text) { kelInp.value = opt.text; kelInp.classList.add('has-value'); }
            }
          }
        }
      }
    }

    // Recalculate totals
    if (typeof calcPekerja         === 'function') calcPekerja();
    if (typeof calcPengeluaran     === 'function') calcPengeluaran();
    if (typeof calcPendapatan      === 'function') calcPendapatan();
    if (typeof calcAset            === 'function') calcAset();
    if (typeof calcModal           === 'function') calcModal();
    if (typeof updateProgress      === 'function') updateProgress();

    return true;
  } catch(e) { console.error('Gagal load edit mode:', e); return false; }
}
