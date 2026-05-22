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

const SHEET_ID          = "1GvDink6EEC0HFDT7eUgUXpG_gCfroFp7cZxOuWFvKew";
const SHEET_NAME        = "SE2026_Responses";
const LKP_SHEET_NAME    = "SE2026_LKP";
const CONFIG_SHEET_NAME = "CAWI_Config";

// L MODE (Rumah Tangga / SE2026-L) — sheet baru, dibuat otomatis bila belum ada
const L_SHEET_NAME       = "SE2026_L_Responses";
const L_ANGGOTA_SHEET    = "SE2026_L_Anggota";

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

    // === MODE DISPATCHER: L mode pakai sheet terpisah ===
    const mode = (d.formMode === 'l') ? 'l' : 'lub';

    // Delete: cari di kedua sheet (frontend tidak kirim formMode di delete)
    if (d.action === "deleteRecord" && d._delete_id && parseInt(d._delete_id) > 0) {
      const targetMode = d.formMode || _findRecordMode(parseInt(d._delete_id));
      if (targetMode === 'l') return deleteLRecord(parseInt(d._delete_id));
      const ss = SpreadsheetApp.openById(SHEET_ID);
      const sheet = ss.getSheetByName(SHEET_NAME);
      if (!sheet) return jsonResponse({ status: "error", message: "Sheet tidak ditemukan" });
      return deleteSheetRecord(sheet, parseInt(d._delete_id));
    }

    // L MODE: submit / edit
    if (mode === 'l') {
      if (d._edit_id && parseInt(d._edit_id) > 0) return updateLRecord(d, parseInt(d._edit_id));
      return insertLRecord(d);
    }

    // L.UB MODE (kode lama, tidak diubah)
    const ss  = SpreadsheetApp.openById(SHEET_ID);
    let sheet = ss.getSheetByName(SHEET_NAME);

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

    return jsonResponse({ status: "ok", message: "Data berhasil disimpan", mode: "lub" });

  } catch (err) {
    Logger.log("doPost error: " + err.message);
    return jsonResponse({ status: "error", message: err.message });
  }
}

// Cek mode record by _id (dipakai untuk deleteRecord ketika frontend tidak kirim formMode)
function _findRecordMode(id) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var lub = ss.getSheetByName(SHEET_NAME);
  if (lub && (id + 1) >= 2 && (id + 1) <= lub.getLastRow()) return 'lub';
  var l = ss.getSheetByName(L_SHEET_NAME);
  if (l && (id + 1) >= 2 && (id + 1) <= l.getLastRow()) return 'l';
  return 'lub';
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

// Kembalikan semua rekaman dari sheet sebagai JSON — merged L.UB + L
function getRecordsResponse() {
  try {
    const ss    = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);
    var lubRows = [];
    if (sheet && sheet.getLastRow() > 1) {
      const values = sheet.getDataRange().getValues();
      lubRows = values.slice(1).map(function(row, idx) {
        var obj = { _id: idx + 1, _formMode: 'lub' };
        FIELD_NAMES.forEach(function(key, i) { obj[key] = cellStr(row[i]); });
        obj._ts = obj.timestamp;
        return obj;
      });
    }
    var lRows = readLRecords();
    return jsonResponse({ status: "ok", data: lubRows.concat(lRows) });
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

// Endpoint GET — kembalikan semua rekaman sebagai JSON (L.UB + L merged)
function doGet(e) {
  try {
    return getRecordsResponse();
  } catch(err) {
    return jsonResponse({ status: "error", message: err.message });
  }
}

// ============================================================
// L MODE (SE2026-L Rumah Tangga) — header, builder, helpers
// ============================================================

const L_HEADERS = [
  "Timestamp",
  // Blok I: Keluarga
  "Nama KK", "NIK KK", "No KK",
  "Jumlah Anggota", "Jumlah Pendataan",
  "Provinsi", "Kode Provinsi",
  "Kabupaten/Kota", "Kode Kabupaten",
  "Kecamatan", "Kode Kecamatan",
  "Kelurahan/Desa", "Kode Kelurahan",
  "Klasifikasi", "Kode Pos",
  "Kode SLS", "Nama SLS",
  "Alamat Detail", "Nama Jalan", "Nomor Rumah",
  "Sesuai KK",
  "Anggota Data (JSON)",
  // Blok II: Usaha
  "Nama Usaha", "Nama Komersial", "Alamat Usaha",
  "RT", "RW", "Kode Pos Usaha",
  "Email Usaha", "Website Usaha", "HP Usaha",
  "Kawasan", "Nama Kawasan",
  "Jenis Usaha",
  "Lokasi Alamat", "Lokasi Provinsi", "Lokasi Kab",
  "Punya NIB", "NIB",
  "NIB Alasan", "NIB Alasan Lain",
  "Badan Usaha",
  "Pengusaha Nama", "Pengusaha JK", "Pengusaha Umur", "Pengusaha NIK",
  "Kegiatan Utama",
  "B1", "B2", "B3", "B4", "C",
  "Input Bahan", "Proses Produksi", "Produk Utama",
  "KBLI Kode", "KBLI Judul", "KBLI Kategori",
  "Klasifikasi Hotel",
  "Jaringan", "Jumlah Cabang",
  "KP Nama", "KP Negara", "KP Alamat", "KP Email", "KP Provinsi", "KP Kab",
  "Internet",
  "Halal", "Halal B", "Halal C",
  "BPOM", "BPOM B", "BPOM C",
  "Pekerja L", "Pekerja P", "Pekerja Dibayar", "Pekerja Tidak Dibayar",
  "Tahun Operasi",
  // Tahunan y26-y29
  "Y26a", "Y26b", "Y26c", "Y26d", "Y26e", "Y26f",
  "Y27a", "Y27b", "Y27c", "Y27d",
  "Y28a", "Y28b", "Y28c", "Y28c1", "Y28d",
  "Y29a", "Y29b", "Y29c", "Y29d", "Y29e", "Y29f", "Y29g",
  // Bulanan m30-m33
  "M30a", "M30b", "M30c", "M30d", "M30e", "M30f",
  "M31a", "M31b", "M31c", "M31d", "M31e",
  "M32a", "M32b", "M32c", "M32c1", "M32d",
  "M33a", "M33b", "M33c", "M33d", "M33e", "M33f", "M33g",
  // Blok III: Perumahan & Aset
  "Jenis Bangunan", "Lantai Apt", "Bangunan Lain",
  "Jumlah Keluarga di Rumah", "KK Lain",
  "Status Milik", "Bukti", "Status Lain", "Sewa",
  "Luas Lantai",
  "Lantai Bahan", "Lantai Kondisi",
  "Dinding Bahan", "Dinding Kondisi",
  "Atap Bahan", "Atap Kondisi",
  "BAB", "Kloset", "Tinja",
  "Air",
  "Listrik", "Meteran Jumlah",
  "Meteran Daya 1", "Meteran Daya 2",
  "Meteran ID 1", "Meteran ID 2",
  "Listrik/Bulan", "Pulsa/Bulan",
  "Makanan/Minggu", "NonMakanan/Bulan", "NonMakanan/Tahun",
  "Aset Gas 3kg", "Aset Gas 5.5kg+", "Aset Kulkas", "Aset AC",
  "Aset Emas (gram)", "Aset Komputer",
  "Aset Motor", "Aset Motor Nilai",
  "Aset Mobil", "Aset Mobil Nilai",
  "Aset Tanah", "Aset Tanah Nilai",
  "Aset Rumah", "Aset Rumah Nilai",
  // Blok IV
  "Catatan Pendata",
  // Blok V
  "Petugas Nama", "Petugas NIP", "Petugas HP",
  "Responden Nama", "Responden HP", "Responden Email",
  "Tanggal Pelaksanaan",
  "Tanda Tangan (base64)"
];

// Urutan HARUS sama persis dengan L_HEADERS — dipakai untuk parse balik di getRecordsResponse
const L_FIELD_NAMES = [
  "timestamp",
  "nama_kk", "nik_kk", "no_kk",
  "jml_anggota", "jml_pendataan",
  "provinsi", "provinsi_kd",
  "kabupaten", "kabupaten_kd",
  "kecamatan", "kecamatan_kd",
  "kelurahan", "kelurahan_kd",
  "klasifikasi", "kode_pos",
  "kode_sls", "nama_sls",
  "alamat_detail", "nama_jalan", "no_rumah",
  "sesuai_kk",
  "anggota_data",
  // Blok II
  "nama_usaha", "nama_komersial", "alamat_usaha",
  "rt", "rw", "kodepos_usaha",
  "email_usaha", "website_usaha", "hp_usaha",
  "kawasan", "nama_kawasan",
  "jenis_usaha",
  "lokasi_alamat", "lokasi_provinsi", "lokasi_kab",
  "punya_nib", "nib",
  "nib_alasan", "nib_alasan_lain",
  "badan_usaha",
  "pengusaha_nama", "pengusaha_jk", "pengusaha_umur", "pengusaha_nik",
  "kegiatan_utama",
  "b1", "b2", "b3", "b4", "c",
  "input_bahan", "proses_produksi", "produk_utama",
  "kbli_kode", "kbli_judul", "kbli_kategori",
  "klasifikasi_hotel",
  "jaringan", "jml_cabang",
  "kp_nama", "kp_negara", "kp_alamat", "kp_email", "kp_provinsi", "kp_kab",
  "internet",
  "halal", "halal_b", "halal_c",
  "bpom", "bpom_b", "bpom_c",
  "pekerja_l", "pekerja_p", "pekerja_dibayar", "pekerja_tidak_dibayar",
  "tahun_operasi",
  "y26a", "y26b", "y26c", "y26d", "y26e", "y26f",
  "y27a", "y27b", "y27c", "y27d",
  "y28a", "y28b", "y28c", "y28c1", "y28d",
  "y29a", "y29b", "y29c", "y29d", "y29e", "y29f", "y29g",
  "m30a", "m30b", "m30c", "m30d", "m30e", "m30f",
  "m31a", "m31b", "m31c", "m31d", "m31e",
  "m32a", "m32b", "m32c", "m32c1", "m32d",
  "m33a", "m33b", "m33c", "m33d", "m33e", "m33f", "m33g",
  // Blok III
  "jenis_bangunan", "lantai_apt", "bangunan_lain",
  "jml_keluarga_rumah", "kk_lain",
  "status_milik", "bukti", "status_lain", "sewa",
  "luas_lantai",
  "lantai_bahan", "lantai_kondisi",
  "dinding_bahan", "dinding_kondisi",
  "atap_bahan", "atap_kondisi",
  "bab", "kloset", "tinja",
  "air",
  "listrik", "meteran_jml",
  "meteran_daya1", "meteran_daya2",
  "meteran_id1", "meteran_id2",
  "listrik_bln", "pulsa_bln",
  "makanan_mgg", "nonmakanan_bln", "nonmakanan_thn",
  "aset_gas3", "aset_gas5", "aset_kulkas", "aset_ac",
  "aset_emas", "aset_komputer",
  "aset_motor", "aset_motor_nilai",
  "aset_mobil", "aset_mobil_nilai",
  "aset_tanah", "aset_tanah_nilai",
  "aset_rumah", "aset_rumah_nilai",
  "catatan_pendata",
  "petugas_nama", "petugas_nip", "petugas_hp",
  "responden_nama", "responden_hp", "responden_email",
  "tanggal_pelaksanaan",
  "tanda_tangan"
];

function buildRowL(d) {
  // Build row dari L_FIELD_NAMES — urutan dijamin match L_HEADERS
  return L_FIELD_NAMES.map(function(key) {
    if (key === "tanda_tangan") return d.tanda_tangan ? "[ada]" : "[kosong]";
    var v = d[key];
    return (v === null || v === undefined) ? "" : v;
  });
}

// Init sheet L (header berwarna biru, beda dari L.UB yg orange)
function getOrInitLSheet(ss) {
  var sheet = ss.getSheetByName(L_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(L_SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(L_HEADERS);
    sheet.getRange(1, 1, 1, L_HEADERS.length)
      .setFontWeight("bold")
      .setBackground("#2b6cb0")
      .setFontColor("#ffffff");
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 160);
  }
  return sheet;
}

// Sheet flat per-anggota (mirip pola SE2026_LKP) untuk analisis sosek anggota
const L_ANGGOTA_HEADERS = [
  "Record ID", "Timestamp", "Nama KK",
  "No Anggota", "Nama Anggota", "NIK Anggota",
  "Hubungan", "Keberadaan", "STOP State",
  "Alamat Dom", "DN Provinsi", "DN Kab", "LN Negara",
  "Kawin", "Jenis Kelamin", "Tgl Lahir", "Umur",
  "Sekolah", "Ijazah", "Rekening",
  "Profesi", "Kedudukan",
  "18a", "18a Nilai", "18b", "18b Nilai", "18c", "18c Nilai",
  "Disabilitas", "Kronis", "Kronis Lainnya"
];

function getOrInitLAnggotaSheet(ss) {
  var sheet = ss.getSheetByName(L_ANGGOTA_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(L_ANGGOTA_SHEET);
    sheet.appendRow(L_ANGGOTA_HEADERS);
    sheet.getRange(1, 1, 1, L_ANGGOTA_HEADERS.length)
      .setFontWeight("bold")
      .setBackground("#2b6cb0")
      .setFontColor("#ffffff");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// Pecah anggota_data JSON jadi satu baris per anggota di sheet terpisah
function saveLAnggota(mainSheet, mainId, d) {
  if (!d.anggota_data) return;
  var arr;
  try { arr = JSON.parse(d.anggota_data); } catch(e) { return; }
  if (!arr || !arr.length) return;
  var sheet = getOrInitLAnggotaSheet(mainSheet.getParent());
  arr.forEach(function(a) {
    sheet.appendRow([
      mainId, d.timestamp || '', d.nama_kk || '',
      a.no, a.nama || '', a.nik || '',
      a.hubungan || '', a.keberadaan || '', a.stop_state || 0,
      a.alamat_dom || '', a.dn_provinsi || '', a.dn_kab || '', a.ln_negara || '',
      a.kawin || '', a.jk || '', a.tgl_lahir || '', a.umur || '',
      a.sekolah || '', a.ijazah || '', a.rekening || '',
      a.profesi || '', a.kedudukan || '',
      a.pend_18a || '', a.pend_18a_nilai || 0,
      a.pend_18b || '', a.pend_18b_nilai || 0,
      a.pend_18c || '', a.pend_18c_nilai || 0,
      a.disab || '', a.kronis || '', a.kronis_lain || ''
    ]);
  });
}

function deleteLAnggota(mainSheet, mainId) {
  var sheet = mainSheet.getParent().getSheetByName(L_ANGGOTA_SHEET);
  if (!sheet || sheet.getLastRow() <= 1) return;
  var lastRow = sheet.getLastRow();
  var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = ids.length - 1; i >= 0; i--) {
    if (String(ids[i][0]) === String(mainId)) sheet.deleteRow(i + 2);
  }
}

// Simpan TTD L mode ke folder Drive berbeda (opsional, pola sama dgn L.UB)
function saveTandaTanganL(d) {
  if (!d.tanda_tangan || d.tanda_tangan.length < 100) return;
  var base64 = d.tanda_tangan.replace(/^data:image\/png;base64,/, '');
  var blob   = Utilities.newBlob(Utilities.base64Decode(base64), 'image/png',
    `TTD_L_${d.nama_kk || 'unknown'}_${d.timestamp || Date.now()}.png`);
  var folder = getOrCreateFolder('CAWI_SE2026_L_TTD');
  folder.createFile(blob);
}

// Insert L record
function insertLRecord(d) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = getOrInitLSheet(ss);
  sheet.appendRow(buildRowL(d));
  var newId = sheet.getLastRow() - 1;
  saveLAnggota(sheet, newId, d);
  if (d.tanda_tangan && d.tanda_tangan.length > 100) {
    try { saveTandaTanganL(d); } catch(e) { Logger.log("Gagal simpan TTD L: " + e.message); }
  }
  return jsonResponse({ status: "ok", message: "Data L berhasil disimpan", mode: "l" });
}

// Update L record by _id
function updateLRecord(d, editId) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = getOrInitLSheet(ss);
  var targetRow = editId + 1;
  if (targetRow < 2 || targetRow > sheet.getLastRow()) {
    return jsonResponse({ status: "error", message: "Rekaman L tidak ditemukan (id=" + editId + ")" });
  }
  sheet.getRange(targetRow, 1, 1, L_HEADERS.length).setValues([buildRowL(d)]);
  deleteLAnggota(sheet, editId);
  saveLAnggota(sheet, editId, d);
  if (d.tanda_tangan && d.tanda_tangan.length > 100) {
    try { saveTandaTanganL(d); } catch(e) { Logger.log("Gagal simpan TTD L: " + e.message); }
  }
  return jsonResponse({ status: "ok", message: "Data L berhasil diperbarui", mode: "l" });
}

// Delete L record
function deleteLRecord(deleteId) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(L_SHEET_NAME);
  if (!sheet) return jsonResponse({ status: "error", message: "Sheet L tidak ditemukan" });
  var targetRow = deleteId + 1;
  if (targetRow < 2 || targetRow > sheet.getLastRow()) {
    return jsonResponse({ status: "error", message: "Rekaman L tidak ditemukan (id=" + deleteId + ")" });
  }
  deleteLAnggota(sheet, deleteId);
  sheet.deleteRow(targetRow);
  return jsonResponse({ status: "ok", message: "Rekaman L berhasil dihapus", mode: "l" });
}

// Baca semua L records — return objek dengan _formMode='l' supaya daftar.html bisa render badge
function readLRecords() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(L_SHEET_NAME);
  if (!sheet || sheet.getLastRow() <= 1) return [];
  var values = sheet.getDataRange().getValues();
  return values.slice(1).map(function(row, idx) {
    var obj = { _id: idx + 1, _formMode: 'l' };
    L_FIELD_NAMES.forEach(function(key, i) { obj[key] = cellStr(row[i]); });
    obj._ts = obj.timestamp;
    return obj;
  });
}
