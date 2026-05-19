// ============================================================
// GOOGLE APPS SCRIPT — Backend untuk Form CAWI SE2026 BPS
// ============================================================
// Cara deploy:
// 1. Buka https://script.google.com
// 2. Buat project baru → tempel seluruh kode ini
// 3. Ganti SHEET_ID di bawah dengan ID Google Sheet Anda
//    (ambil dari URL: docs.google.com/spreadsheets/d/<<ID>>/edit)
// 4. Klik Deploy → New Deployment → Web App
//    - Execute as: Me
//    - Who has access: Anyone
// 5. Salin URL yang diberikan, paste ke index.html pada SCRIPT_URL
// ============================================================

const SHEET_ID          = "1f-YLgJHfMU33_9Pn6snao1xZ-qf3vBQRpAxFwxBLOGI";
const SHEET_NAME        = "SE2026_Responses";
const LKP_SHEET_NAME    = "SE2026_LKP";
const CONFIG_SHEET_NAME = "CAWI_Config";

// Header SE2026_LKP sheet (satu baris per kantor cabang)
const LKP_HEADERS = [
  "Record ID", "Timestamp", "Nama Perusahaan",
  "No Cabang", "Nama Kantor/Unit", "Jenis Unit",
  "Provinsi", "Kabupaten/Kota", "KBLI",
  "Jumlah Pekerja", "Nilai Pengeluaran (Rp)",
  "Nilai Produksi/Penjualan/Pendapatan (Rp)", "Nilai Aset (Rp)"
];

// Header columns — urutan harus sama dengan appendRow di bawah
const HEADERS = [
  "Timestamp",
  // BLOK I — Lokasi
  "Provinsi", "Kode Provinsi",
  "Kabupaten/Kota", "Kode Kabupaten",
  "Kecamatan", "Kode Kecamatan",
  "Kelurahan/Desa", "Kode Kelurahan",
  // Q5 Perusahaan
  "Nama Perusahaan", "Nama Komersial",
  "Alamat", "RT", "RW", "Kode Pos",
  "Email Perusahaan", "Website",
  "Telepon", "No HP/WA",
  "Jenis Kawasan", "Nama Kawasan",
  // Q6 NIB
  "Punya NIB", "No NIB",
  "Alasan Tidak NIB", "Alasan Lain NIB",
  // Q7 Badan Usaha
  "Status Badan Usaha", "KDKMP", "Jenis Koperasi", "Laporan Keuangan",
  // Q8 Pengusaha
  "Nama Pengusaha", "Jenis Kelamin Pengusaha", "Umur Pengusaha", "NIK Pengusaha",
  // Q9 Kegiatan
  "Kegiatan Utama",
  "Produksi Barang", "Layanan Makan Minum", "Penjualan Barang", "Aktivitas Jasa",
  "Lokasi Usaha",
  "Input Digunakan", "Proses Produksi", "Produk Utama",
  "KBLI Kode", "KBLI Judul", "KBLI Kategori",
  "Klasifikasi Hotel",
  // Q10 Jaringan
  "Jaringan Usaha", "Jumlah Cabang",
  // Q11 Kantor Pusat
  "KP Nama", "KP Alamat", "KP Email", "KP Negara", "KP Provinsi", "KP Kabupaten",
  // Q12 Internet
  "Pakai Internet",
  "Internet Pesanan", "Internet Produksi", "Internet Distribusi",
  "Internet Beli Bahan", "Internet Promosi", "Internet Lain",
  "Teknologi Digital",
  // Q13-Q19
  "Ramah Lingkungan", "Biaya Lingkungan",
  "Produk Kreatif",
  "Sertifikat Halal", "Varian Halal BPJPH", "Varian Belum Halal BPJPH",
  "Izin Edar", "Varian BPOM", "Varian Belum BPOM",
  "Mitra KDKMP",
  "Program MBG",
  "Transaksi Barang Non-Penduduk", "Transaksi Jual Jasa Non-Penduduk",
  // Q20-Q25
  "Pekerja Laki-laki", "Pekerja Perempuan", "Pekerja Total",
  "Tahun Beroperasi",
  "Pengeluaran Upah Gaji", "Pengeluaran Produksi", "Pengeluaran Beli Barang",
  "Pengeluaran Operasional", "Pengeluaran Non-Operasional", "Pengeluaran Total",
  "Pendapatan Barang Jasa", "Pendapatan Lain", "Pendapatan Total",
  "Pct Pendapatan Online (%)",
  "Aset Tanah Bangunan", "Aset Lain", "Aset Total", "Kategori Aset",
  "Luas Tanah (m2)",
  "Modal Perorangan (%)", "Modal LNPRT (%)", "Modal Korporasi Publik (%)",
  "Modal Korporasi Non Publik (%)", "Modal Pemerintah (%)", "Modal Asing (%)", "Modal Total (%)",
  // BLOK II
  "Catatan Kunjungan I", "Waktu Kunjungan I",
  "Catatan Kunjungan II", "Waktu Kunjungan II",
  "Catatan Kunjungan III", "Waktu Kunjungan III",
  // BLOK III — Petugas
  "Petugas Nama", "Petugas NIP", "Petugas HP",
  // BLOK III — Responden
  "Responden Nama", "Responden HP", "Responden Email",
  "Tanggal Pelaksanaan",
  "Tanda Tangan (base64)",
  // Tambahan Q19c + L.KP
  "Transaksi Beli Jasa Non-Penduduk",
  "Data Cabang (JSON)"
];

function buildRow(d) {
  return [
    d.timestamp || new Date().toLocaleString("id-ID"),
    // Lokasi
    d.provinsi, d.provinsi_kd,
    d.kabupaten, d.kabupaten_kd,
    d.kecamatan, d.kecamatan_kd,
    d.kelurahan, d.kelurahan_kd,
    // Q5
    d.nama_perusahaan, d.nama_komersial,
    d.alamat, d.rt, d.rw, d.kode_pos,
    d.email_perusahaan, d.website,
    d.telepon, d.hp,
    d.jenis_kawasan, d.nama_kawasan,
    // Q6
    d.punya_nib, d.nib,
    d.alasan_no_nib, d.alasan_no_nib_lain,
    // Q7
    d.badan_usaha, d.kdkmp, d.jenis_koperasi, d.laporan_keuangan,
    // Q8
    d.nama_pengusaha, d.jenis_kelamin_pengusaha, d.umur_pengusaha, d.nik_pengusaha,
    // Q9
    d.kegiatan_utama,
    d.produksi_barang, d.layanan_makan, d.penjualan_barang, d.aktivitas_jasa,
    d.lokasi_usaha,
    d.input_digunakan, d.proses_produksi, d.produk_utama,
    d.kbli_kode, d.kbli_judul, d.kbli_kategori,
    d.klasifikasi_hotel,
    // Q10
    d.jaringan_usaha, d.jumlah_cabang,
    // Q11
    d.kp_nama, d.kp_alamat, d.kp_email, d.kp_negara, d.kp_provinsi, d.kp_kabupaten,
    // Q12
    d.pakai_internet,
    d.internet_pesanan, d.internet_produksi, d.internet_distribusi,
    d.internet_beli, d.internet_promosi, d.internet_lain,
    d.digital,
    // Q13-Q19
    d.ramah_lingkungan, d.biaya_lingkungan,
    d.produk_kreatif,
    d.sertifikat_halal, d.varian_halal_bpjph, d.varian_belum_halal_bpjph,
    d.izin_edar, d.varian_bpom, d.varian_belum_bpom,
    d.mitra_kdkmp,
    d.program_mbg,
    d.transaksi_barang_nonpenduduk, d.transaksi_jual_jasa_nonpenduduk,
    // Q20-Q25
    d.pekerja_laki, d.pekerja_perempuan, d.pekerja_total,
    d.tahun_beroperasi,
    d.pengeluaran_upah, d.pengeluaran_produksi, d.pengeluaran_beli_barang,
    d.pengeluaran_operasional, d.pengeluaran_nonoperasional, d.pengeluaran_total,
    d.pendapatan_barang_jasa, d.pendapatan_lain, d.pendapatan_total,
    d.pct_online,
    d.aset_tanah_bangunan, d.aset_lain, d.aset_total, d.aset_kategori,
    d.luas_tanah,
    d.modal_perorangan, d.modal_lnprt, d.modal_korporasi_publik,
    d.modal_korporasi_non, d.modal_pemerintah, d.modal_asing, d.modal_total,
    // Blok II
    d.catatan1, d.waktu1,
    d.catatan2, d.waktu2,
    d.catatan3, d.waktu3,
    // Blok III — Petugas
    d.petugas_nama, d.petugas_nip, d.petugas_hp,
    // Blok III — Responden
    d.responden_nama, d.responden_hp, d.responden_email,
    d.tanggal_pelaksanaan,
    d.tanda_tangan ? "[ada]" : "[kosong]",
    // Q19c + L.KP
    d.transaksi_beli_jasa_nonpenduduk,
    d.lkp_data || ''
  ];
}

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);

    if (d.action === "getConfig")  return getConfigResponse();
    if (d.action === "setConfig")  return setConfigResponse(d.key, d.value);
    if (d.action === "getRecords") return getRecordsResponse();

    const ss  = SpreadsheetApp.openById(SHEET_ID);
    let sheet = ss.getSheetByName(SHEET_NAME);

    if (d.action === "deleteRecord" && d._delete_id && parseInt(d._delete_id) > 0) {
      if (!sheet) return jsonResponse({ status: "error", message: "Sheet tidak ditemukan" });
      return deleteSheetRecord(sheet, parseInt(d._delete_id));
    }

    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
    }

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
      sheet.getRange(1, 1, 1, HEADERS.length)
        .setFontWeight("bold")
        .setBackground("#fc6c00")
        .setFontColor("#ffffff");
      sheet.setFrozenRows(1);
      sheet.setColumnWidth(1, 160);
    }

    if (d._edit_id && parseInt(d._edit_id) > 0) {
      return updateRecord(sheet, d, parseInt(d._edit_id));
    }

    sheet.appendRow(buildRow(d));
    const newId = sheet.getLastRow() - 1;
    applyTextFormat(sheet, sheet.getLastRow(), d);
    saveLKPBranches(sheet, newId, d);

    if (d.tanda_tangan && d.tanda_tangan.length > 100) {
      try { saveTandaTangan(d); } catch(sigErr) { Logger.log("Gagal simpan TTD: " + sigErr.message); }
    }

    return jsonResponse({ status: "ok", message: "Data berhasil disimpan" });

  } catch (err) {
    Logger.log("doPost error: " + err.message);
    return jsonResponse({ status: "error", message: err.message });
  }
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// Konversi nilai sel ke string — tangani Date object dari Google Sheets
function cellStr(v) {
  if (v instanceof Date) {
    return Utilities.formatDate(v, Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm");
  }
  return (v !== null && v !== undefined) ? String(v) : "";
}

// Kembalikan semua rekaman dari sheet sebagai JSON
function getRecordsResponse() {
  try {
    const ss    = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet || sheet.getLastRow() <= 1) {
      return jsonResponse({ status: "ok", data: [] });
    }
    const values = sheet.getDataRange().getValues();
    const rows = values.slice(1).map(function(row, idx) {
      var obj = { _id: idx + 1 };
      FIELD_NAMES.forEach(function(key, i) {
        obj[key] = cellStr(row[i]);
      });
      obj._ts = obj.timestamp;
      return obj;
    });
    return jsonResponse({ status: "ok", data: rows });
  } catch(err) {
    return jsonResponse({ status: "error", message: err.message });
  }
}

// Simpan tanda tangan ke Google Drive
function saveTandaTangan(d) {
  const base64 = d.tanda_tangan.replace(/^data:image\/png;base64,/, '');
  const blob    = Utilities.newBlob(Utilities.base64Decode(base64), 'image/png',
    `TTD_${d.nama_perusahaan || 'unknown'}_${d.timestamp || Date.now()}.png`);
  const folder  = getOrCreateFolder('CAWI_SE2026_TTD');
  folder.createFile(blob);
}

function getOrCreateFolder(name) {
  const it = DriveApp.getFoldersByName(name);
  return it.hasNext() ? it.next() : DriveApp.createFolder(name);
}

// Format kolom yang berisi angka tapi harus disimpan sebagai teks
function applyTextFormat(sheet, rowNum, d) {
  var textFields = [
    { col: 15,  val: d.kode_pos },
    { col: 19,  val: d.hp },
    { col: 23,  val: d.nib },
    { col: 33,  val: d.nik_pengusaha },
    { col: 109, val: d.petugas_nip },
    { col: 110, val: d.petugas_hp },
    { col: 112, val: d.responden_hp }
  ];
  textFields.forEach(function(f) {
    if (f.val !== null && f.val !== undefined && f.val !== '') {
      var cell = sheet.getRange(rowNum, f.col);
      cell.setNumberFormat('@');
      cell.setValue(String(f.val));
    }
  });
}

// Timpa rekaman yang ada berdasarkan _id
function updateRecord(sheet, d, editId) {
  var targetRow = editId + 1;
  if (targetRow < 2 || targetRow > sheet.getLastRow()) {
    return jsonResponse({ status: "error", message: "Rekaman tidak ditemukan (id=" + editId + ")" });
  }
  sheet.getRange(targetRow, 1, 1, HEADERS.length).setValues([buildRow(d)]);
  applyTextFormat(sheet, targetRow, d);
  deleteLKPBranches(sheet, editId);
  saveLKPBranches(sheet, editId, d);
  if (d.tanda_tangan && d.tanda_tangan.length > 100) {
    try { saveTandaTangan(d); } catch(sigErr) { Logger.log("Gagal simpan TTD: " + sigErr.message); }
  }
  return jsonResponse({ status: "ok", message: "Data berhasil diperbarui" });
}

// Hapus rekaman berdasarkan _id
function deleteSheetRecord(sheet, deleteId) {
  var targetRow = deleteId + 1;
  if (targetRow < 2 || targetRow > sheet.getLastRow()) {
    return jsonResponse({ status: "error", message: "Rekaman tidak ditemukan (id=" + deleteId + ")" });
  }
  deleteLKPBranches(sheet, deleteId);
  sheet.deleteRow(targetRow);
  return jsonResponse({ status: "ok", message: "Rekaman berhasil dihapus" });
}

// ============================================================
// SE2026_LKP — Manajemen Data Cabang
// ============================================================

function getOrInitLKPSheet(ss) {
  var lkpSheet = ss.getSheetByName(LKP_SHEET_NAME);
  if (!lkpSheet) {
    lkpSheet = ss.insertSheet(LKP_SHEET_NAME);
    lkpSheet.appendRow(LKP_HEADERS);
    lkpSheet.getRange(1, 1, 1, LKP_HEADERS.length)
      .setFontWeight("bold")
      .setBackground("#1a56db")
      .setFontColor("#ffffff");
    lkpSheet.setFrozenRows(1);
    lkpSheet.setColumnWidth(1, 80);   // Record ID
    lkpSheet.setColumnWidth(3, 180);  // Nama Perusahaan
    lkpSheet.setColumnWidth(5, 200);  // Nama Kantor/Unit
  }
  return lkpSheet;
}

// Tulis baris cabang ke SE2026_LKP (satu baris per cabang)
function saveLKPBranches(sheet, mainId, d) {
  if (!d.lkp_data) return;
  var branches;
  try { branches = JSON.parse(d.lkp_data); } catch(e) { return; }
  if (!branches || !branches.length) return;
  var lkpSheet = getOrInitLKPSheet(sheet.getParent());
  branches.forEach(function(b) {
    lkpSheet.appendRow([
      mainId,
      d.timestamp || '',
      d.nama_perusahaan || '',
      b.no,
      b.nama,
      b.jenis,
      b.provinsi,
      b.kabupaten,
      b.kbli,
      b.pekerja,
      b.pengeluaran,
      b.pendapatan,
      b.aset
    ]);
  });
}

// Hapus semua baris cabang untuk mainId tertentu
function deleteLKPBranches(sheet, mainId) {
  var lkpSheet = sheet.getParent().getSheetByName(LKP_SHEET_NAME);
  if (!lkpSheet || lkpSheet.getLastRow() <= 1) return;
  var lastRow = lkpSheet.getLastRow();
  var ids = lkpSheet.getRange(2, 1, lastRow - 1, 1).getValues();
  // Hapus dari bawah ke atas agar row index tidak bergeser
  for (var i = ids.length - 1; i >= 0; i--) {
    if (String(ids[i][0]) === String(mainId)) {
      lkpSheet.deleteRow(i + 2);
    }
  }
}

// ============================================================
// FIELD_NAMES — urutan HARUS sama dengan buildRow / HEADERS
// ============================================================
const FIELD_NAMES = [
  "timestamp",
  "provinsi", "provinsi_kd",
  "kabupaten", "kabupaten_kd",
  "kecamatan", "kecamatan_kd",
  "kelurahan", "kelurahan_kd",
  "nama_perusahaan", "nama_komersial",
  "alamat", "rt", "rw", "kode_pos",
  "email_perusahaan", "website",
  "telepon", "hp",
  "jenis_kawasan", "nama_kawasan",
  "punya_nib", "nib",
  "alasan_no_nib", "alasan_no_nib_lain",
  "badan_usaha", "kdkmp", "jenis_koperasi", "laporan_keuangan",
  "nama_pengusaha", "jenis_kelamin_pengusaha", "umur_pengusaha", "nik_pengusaha",
  "kegiatan_utama",
  "produksi_barang", "layanan_makan", "penjualan_barang", "aktivitas_jasa",
  "lokasi_usaha",
  "input_digunakan", "proses_produksi", "produk_utama",
  "kbli_kode", "kbli_judul", "kbli_kategori",
  "klasifikasi_hotel",
  "jaringan_usaha", "jumlah_cabang",
  "kp_nama", "kp_alamat", "kp_email", "kp_negara", "kp_provinsi", "kp_kabupaten",
  "pakai_internet",
  "internet_pesanan", "internet_produksi", "internet_distribusi",
  "internet_beli", "internet_promosi", "internet_lain",
  "digital",
  "ramah_lingkungan", "biaya_lingkungan",
  "produk_kreatif",
  "sertifikat_halal", "varian_halal_bpjph", "varian_belum_halal_bpjph",
  "izin_edar", "varian_bpom", "varian_belum_bpom",
  "mitra_kdkmp",
  "program_mbg",
  "transaksi_barang_nonpenduduk", "transaksi_jual_jasa_nonpenduduk",
  "pekerja_laki", "pekerja_perempuan", "pekerja_total",
  "tahun_beroperasi",
  "pengeluaran_upah", "pengeluaran_produksi", "pengeluaran_beli_barang",
  "pengeluaran_operasional", "pengeluaran_nonoperasional", "pengeluaran_total",
  "pendapatan_barang_jasa", "pendapatan_lain", "pendapatan_total",
  "pct_online",
  "aset_tanah_bangunan", "aset_lain", "aset_total", "aset_kategori",
  "luas_tanah",
  "modal_perorangan", "modal_lnprt", "modal_korporasi_publik",
  "modal_korporasi_non", "modal_pemerintah", "modal_asing", "modal_total",
  "catatan1", "waktu1",
  "catatan2", "waktu2",
  "catatan3", "waktu3",
  "petugas_nama", "petugas_nip", "petugas_hp",
  "responden_nama", "responden_hp", "responden_email",
  "tanggal_pelaksanaan",
  "tanda_tangan",
  "transaksi_beli_jasa_nonpenduduk",
  "lkp_data"
];

// Kembalikan semua config dari sheet CAWI_Config sebagai objek key-value
function getConfigResponse() {
  try {
    const ss     = SpreadsheetApp.openById(SHEET_ID);
    const sheet  = ss.getSheetByName(CONFIG_SHEET_NAME);
    const config = {};
    if (sheet && sheet.getLastRow() > 0) {
      const values = sheet.getDataRange().getValues();
      values.forEach(function(row) {
        if (row[0]) config[String(row[0])] = String(row[1] || '');
      });
    }
    return jsonResponse({ status: "ok", data: config });
  } catch(err) {
    return jsonResponse({ status: "error", message: err.message });
  }
}

// Simpan atau perbarui satu key-value di sheet CAWI_Config
function setConfigResponse(key, value) {
  try {
    if (!key) throw new Error("key diperlukan");
    const ss    = SpreadsheetApp.openById(SHEET_ID);
    let sheet   = ss.getSheetByName(CONFIG_SHEET_NAME);
    if (!sheet) sheet = ss.insertSheet(CONFIG_SHEET_NAME);
    const lastRow = sheet.getLastRow();
    if (lastRow > 0) {
      const keys = sheet.getRange(1, 1, lastRow, 1).getValues();
      for (var i = 0; i < keys.length; i++) {
        if (keys[i][0] === key) {
          sheet.getRange(i + 1, 2).setValue(value || '');
          return jsonResponse({ status: "ok" });
        }
      }
    }
    sheet.appendRow([key, value || '']);
    return jsonResponse({ status: "ok" });
  } catch(err) {
    return jsonResponse({ status: "error", message: err.message });
  }
}

// Endpoint GET — kembalikan semua rekaman sebagai JSON
function doGet(e) {
  try {
    const ss    = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet || sheet.getLastRow() <= 1) {
      return jsonResponse({ status: "ok", data: [] });
    }
    const values = sheet.getDataRange().getValues();
    const rows = values.slice(1).map(function(row, idx) {
      var obj = { _id: idx + 1 };
      FIELD_NAMES.forEach(function(key, i) {
        obj[key] = cellStr(row[i]);
      });
      obj._ts = obj.timestamp;
      return obj;
    });
    return jsonResponse({ status: "ok", data: rows });
  } catch(err) {
    return jsonResponse({ status: "error", message: err.message });
  }
}
