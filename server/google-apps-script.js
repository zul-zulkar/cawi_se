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
// SHEET_NAME (SE2026_Responses) & LKP_SHEET_NAME (SE2026_LKP) DIHAPUS: subsistem L.UB di-retire.
const CONFIG_SHEET_NAME = "CAWI_Config";

// L MODE (Rumah Tangga / SE2026-L) — sheet baru, dibuat otomatis bila belum ada
const L_SHEET_NAME       = "SE2026_L_Responses";
const L_ANGGOTA_SHEET    = "SE2026_L_Anggota";
const L_USAHA_SHEET      = "SE2026_L_Usaha";   // sheet rinci per-usaha (pecahan usaha_data JSON)

// P MODE (Pemutakhiran / listing SE2026-P) — sheet baru, dibuat otomatis bila belum ada
const P_SHEET_NAME       = "SE2026_P_Responses";
// Sheet sumber prelist (DTSEN/SBR) — dikelola manual di Sheets; getPrelist baca by SLS
const PRELIST_SHEET_NAME = "SE2026_Prelist";

// Portal Petugas — sheet daftar PPL & PML (dikelola manual di Sheets)
const PPL_SHEET_NAME = "PPL";
const PML_SHEET_NAME = "PML";

// Registry assignment + progress (1 baris per assignment, key = cawi_id).
// Diisi otomatis: portal saat assignment dibuat, kuesioner saat autosave/submit.
// Dibaca daftar.html untuk monitoring lintas perangkat (difilter per peran di klien).
const ASSIGN_SHEET = "SE2026_Assignments";

// LKP_HEADERS, HEADERS, & buildRow (kolom/baris L.UB) DIHAPUS: subsistem L.UB di-retire.

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);

    if (d.action === "getConfig")  return getConfigResponse();
    if (d.action === "setConfig")  return setConfigResponse(d.key, d.value);
    if (d.action === "getRecords") return getRecordsResponse();
    if (d.action === "getPetugas") return getPetugasResponse();
    if (d.action === "getPetugasByEmail") return getPetugasByEmailResponse(d.email);
    if (d.action === "getPplUnderPml")    return getPplUnderPmlResponse(d.pml_email);
    if (d.action === "getPrelist")  return getPrelistResponse(d.sls_kd || d.kode_sls || d.sls || '');
    if (d.action === "getPRecords") return getPRecordsResponse();
    // Registry assignment + progress (untuk daftar.html — monitoring lintas perangkat)
    if (d.action === "saveAssignmentMeta") return saveAssignmentMetaResponse(d);
    if (d.action === "getAssignmentsMeta") return getAssignmentsMetaResponse();
    if (d.action === "deleteAssignmentMeta") return deleteAssignmentMetaResponse(d.cawi_id);

    // === P MODE (Pemutakhiran / listing) → sheet SE2026_P_Responses ===
    // Self-contained: resolusi cawi_id, insert/update/delete sendiri (1 baris per entitas).
    if (d.formMode === 'p') {
      if (d.action === "deleteRecord" && d._delete_id && parseInt(d._delete_id) > 0) {
        return deletePRecord(parseInt(d._delete_id));
      }
      // Edit-in-place via cawi_id (1 assignment = 1 baris P)
      if (d.cawi_id && !d._edit_id) {
        try {
          var _pss = SpreadsheetApp.openById(SHEET_ID);
          var _psheet = _pss.getSheetByName(P_SHEET_NAME);
          if (_psheet) {
            var _prow = findRowByCawiId(_psheet, d.cawi_id);
            if (_prow > 0) d._edit_id = _prow - 1;
          }
        } catch (_pErr) { Logger.log("findRowByCawiId P gagal: " + _pErr.message); }
      }
      if (d._edit_id && parseInt(d._edit_id) > 0) return updatePRecord(d, parseInt(d._edit_id));
      return insertPRecord(d);
    }

    // === L MODE (SE2026-L) — sheet SE2026_L_Responses ===
    // L.UB di-retire: formMode "p" sudah ditangani di atas; sisanya = L.
    // CAWI_ID dispatcher: timpa baris dengan cawi_id sama.
    if (d.cawi_id && !d._edit_id && d.action !== "deleteRecord") {
      try {
        var _ss = SpreadsheetApp.openById(SHEET_ID);
        var _sheet = _ss.getSheetByName(L_SHEET_NAME);
        if (_sheet) {
          var _row = findRowByCawiId(_sheet, d.cawi_id);
          if (_row > 0) d._edit_id = _row - 1;
        }
      } catch (_cawiErr) { Logger.log("findRowByCawiId gagal: " + _cawiErr.message); }
    }

    if (d.action === "deleteRecord" && d._delete_id && parseInt(d._delete_id) > 0) {
      return deleteLRecord(parseInt(d._delete_id));
    }

    if (d._edit_id && parseInt(d._edit_id) > 0) return updateLRecord(d, parseInt(d._edit_id));
    return insertLRecord(d);

  } catch (err) {
    Logger.log("doPost error: " + err.message);
    return jsonResponse({ status: "error", message: err.message });
  }
}

// Auto-migration: pastikan kolom "CAWI ID" ada di sheet.
// Sheet existing yang dibuat sebelum kolom ini diperkenalkan akan otomatis
// di-extend. Return indeks kolom (1-based) "CAWI ID" di sheet.
function ensureCawiIdColumn(sheet) {
  if (!sheet) return -1;
  var lastCol = sheet.getLastColumn();
  if (lastCol >= 1) {
    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    for (var i = 0; i < headers.length; i++) {
      if (String(headers[i]).trim().toUpperCase() === 'CAWI ID') return i + 1;
    }
  }
  // Belum ada → append sebagai kolom baru
  var newCol = lastCol + 1;
  var cell = sheet.getRange(1, newCol);
  cell.setValue('CAWI ID');
  cell.setFontWeight('bold');
  // Ikuti warna header sheet (orange untuk L.UB / biru untuk L) jika sudah ada styling
  try {
    var refBg = sheet.getRange(1, 1).getBackground();
    var refFg = sheet.getRange(1, 1).getFontColor();
    if (refBg) cell.setBackground(refBg);
    if (refFg) cell.setFontColor(refFg);
  } catch (e) {}
  return newCol;
}

// Cari row (1-based sheet row) dengan kolom "CAWI ID" yang cocok dengan cawi_id.
// Return -1 jika value tidak ditemukan. Auto-migrasi kolom kalau belum ada.
function findRowByCawiId(sheet, cawi_id) {
  if (!sheet || !cawi_id) return -1;
  var colIdx = ensureCawiIdColumn(sheet);
  if (colIdx < 1) return -1;
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  var col = sheet.getRange(2, colIdx, lastRow - 1, 1).getValues();
  var target = String(cawi_id).trim();
  for (var j = 0; j < col.length; j++) {
    if (String(col[j][0]).trim() === target) return j + 2;
  }
  return -1;
}

// _findRecordMode (dispatcher hapus L.UB) DIHAPUS: subsistem L.UB di-retire.

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

// Kembalikan semua rekaman L sebagai JSON (L.UB di-retire — sheet SE2026_Responses
// tidak lagi dibaca; record L.UB lama tetap ada di Sheets tapi tak ditampilkan di app).
function getRecordsResponse() {
  try {
    return jsonResponse({ status: "ok", data: readLRecords() });
  } catch(err) {
    return jsonResponse({ status: "error", message: err.message });
  }
}

// saveTandaTangan (TTD L.UB) DIHAPUS: subsistem L.UB di-retire. getOrCreateFolder dipertahankan (dipakai L).

function getOrCreateFolder(name) {
  const it = DriveApp.getFoldersByName(name);
  return it.hasNext() ? it.next() : DriveApp.createFolder(name);
}

// applyTextFormat (L.UB) DIHAPUS: subsistem L.UB di-retire.

// Format kolom L mode yang berisi angka tapi harus disimpan sebagai teks
// Kolom (1-indexed) sesuai L_FIELD_NAMES: nik_kk=3, no_kk=4, kode_pos=16,
// hp_usaha=32, pengusaha_nik=47, petugas_nip=173, petugas_hp=174, responden_hp=176
function applyTextFormatL(sheet, rowNum, d) {
  var textFields = [
    { col: 3,   val: d.nik_kk },
    { col: 4,   val: d.no_kk },
    { col: 16,  val: d.kode_pos },
    { col: 32,  val: d.hp_usaha },
    { col: 47,  val: d.pengusaha_nik },
    { col: 173, val: d.petugas_nip },
    { col: 174, val: d.petugas_hp },
    { col: 176, val: d.responden_hp }
  ];
  textFields.forEach(function(f) {
    if (f.val !== null && f.val !== undefined && f.val !== '') {
      var cell = sheet.getRange(rowNum, f.col);
      cell.setNumberFormat('@');
      cell.setValue(String(f.val));
    }
  });
}

// updateRecord/deleteSheetRecord (L.UB), seluruh fungsi SE2026_LKP, & FIELD_NAMES (L.UB)
// DIHAPUS: subsistem L.UB di-retire.

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

// Endpoint GET — default kembalikan semua rekaman; dukung ?action=getConfig dan ?action=getPetugas
// untuk Portal Petugas (petugas.html) yang fetch via GET tanpa CORS preflight.
function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) ? String(e.parameter.action) : "";
    if (action === "getConfig")  return getConfigResponse();
    if (action === "getPetugas") return getPetugasResponse();
    if (action === "getPetugasByEmail") {
      return getPetugasByEmailResponse(e.parameter.email);
    }
    if (action === "getPplUnderPml") {
      return getPplUnderPmlResponse(e.parameter.pml_email);
    }
    if (action === "getPrelist") {
      return getPrelistResponse(e.parameter.sls_kd || e.parameter.kode_sls || e.parameter.sls || '');
    }
    if (action === "getPRecords") return getPRecordsResponse();
    if (action === "getAssignmentsMeta") return getAssignmentsMetaResponse();
    return getRecordsResponse();
  } catch(err) {
    return jsonResponse({ status: "error", message: err.message });
  }
}

// Baca sheet PPL (Nama, Email, PML) dan PML (Nama, Email) lalu kembalikan
// sebagai daftar terstruktur untuk halaman petugas. Skip header dan baris kosong.
function getPetugasResponse() {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    return jsonResponse({
      status: "ok",
      data: {
        ppl: readPetugasSheet(ss, PPL_SHEET_NAME, true),
        pml: readPetugasSheet(ss, PML_SHEET_NAME, false)
      }
    });
  } catch(err) {
    return jsonResponse({ status: "error", message: err.message });
  }
}

// Cari satu petugas berdasarkan email. Cek dulu sheet PPL, lalu sheet PML.
// Endpoint cepat untuk alur login terpadu (email + sandi sekaligus).
function getPetugasByEmailResponse(email) {
  try {
    if (!email) return jsonResponse({ status: "ok", data: null });
    var target = String(email).trim().toLowerCase();
    if (!target) return jsonResponse({ status: "ok", data: null });
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var ppl = readPetugasSheet(ss, PPL_SHEET_NAME, true);
    for (var i = 0; i < ppl.length; i++) {
      if (ppl[i].email.toLowerCase() === target) {
        return jsonResponse({
          status: "ok",
          data: { nama: ppl[i].nama, email: ppl[i].email, peran: "PPL", pml_email: ppl[i].pml_email }
        });
      }
    }
    var pml = readPetugasSheet(ss, PML_SHEET_NAME, false);
    for (var j = 0; j < pml.length; j++) {
      if (pml[j].email.toLowerCase() === target) {
        return jsonResponse({
          status: "ok",
          data: { nama: pml[j].nama, email: pml[j].email, peran: "PML" }
        });
      }
    }
    return jsonResponse({ status: "ok", data: null });
  } catch(err) {
    return jsonResponse({ status: "error", message: err.message });
  }
}

// Kembalikan daftar PPL (email saja) yang berada di bawah PML tertentu.
// Dipakai PML untuk filter assignment di portal — lebih ringan daripada
// fetch seluruh sheet PPL kalau cuma butuh daftar bawahan.
function getPplUnderPmlResponse(pml_email) {
  try {
    if (!pml_email) return jsonResponse({ status: "ok", data: [] });
    var target = String(pml_email).trim().toLowerCase();
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var ppl = readPetugasSheet(ss, PPL_SHEET_NAME, true);
    var out = [];
    for (var i = 0; i < ppl.length; i++) {
      if ((ppl[i].pml_email || '').toLowerCase() === target) {
        out.push({ nama: ppl[i].nama, email: ppl[i].email, pml_email: ppl[i].pml_email });
      }
    }
    return jsonResponse({ status: "ok", data: out });
  } catch(err) {
    return jsonResponse({ status: "error", message: err.message });
  }
}

function readPetugasSheet(ss, name, includePml) {
  var sheet = ss.getSheetByName(name);
  if (!sheet || sheet.getLastRow() < 2) return [];
  var values = sheet.getDataRange().getValues();
  var rows = [];
  for (var i = 1; i < values.length; i++) {
    var nama  = cellStr(values[i][0]).trim();
    var email = cellStr(values[i][1]).trim();
    if (!nama && !email) continue;
    var row = { nama: nama, email: email };
    if (includePml) row.pml_email = cellStr(values[i][2]).trim();
    rows.push(row);
  }
  return rows;
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
  // Blok II: Usaha (JSON array — semua usaha dalam satu kolom)
  "Usaha Data (JSON)",
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
  "Tanda Tangan (base64)",
  "CAWI ID",
  "Petugas Email (login)", "Petugas Peran (login)",
  // Foto Rumah (Blok III R19) — URL Google Drive (di-upload dari base64 terkompres)
  "Foto Depan (URL)", "Foto Ruang Tamu (URL)"
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
  // Blok II: usaha JSON array
  "usaha_data",
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
  "tanda_tangan",
  "cawi_id",
  "petugas_email_login", "petugas_peran_login",
  "foto_depan", "foto_ruang_tamu"
];

function buildRowL(d) {
  // Build row dari L_FIELD_NAMES — urutan dijamin match L_HEADERS
  return L_FIELD_NAMES.map(function(key) {
    if (key === "tanda_tangan") {
      if (!d.tanda_tangan) return "[kosong]";
      // Simpan base64 asli jika cukup kecil (batas sel ~50k); fallback ke "[ada]"
      return (d.tanda_tangan.startsWith("data:") && d.tanda_tangan.length <= 45000)
        ? d.tanda_tangan : "[ada]";
    }
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

/* ====== FOTO RUMAH → Google Drive ======
 * Frontend mengirim foto sebagai data URL JPEG terkompres. Di sini di-upload ke
 * folder Drive lalu kolom sheet diisi URL-nya (bukan base64). Idempotent: bila
 * nilai sudah berupa URL (edit ulang), dikembalikan apa adanya. */
function _uploadFotoToDrive(dataUrl, namePrefix, kkName) {
  if (!dataUrl || String(dataUrl).indexOf('data:') !== 0) return dataUrl || '';
  try {
    var m = String(dataUrl).match(/^data:([^;]+);base64,(.*)$/);
    if (!m) return '';
    var folder = getOrCreateFolder('CAWI_SE2026_Foto_Rumah');
    var blob = Utilities.newBlob(Utilities.base64Decode(m[2]), m[1],
      namePrefix + '_' + (kkName || 'KK') + '_' + Date.now() + '.jpg');
    var file = folder.createFile(blob);
    try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
    return file.getUrl();
  } catch (e) { return ''; }
}

// Ganti d.foto_* (base64) → URL Drive SEBELUM buildRowL menulisnya ke sheet.
function _processFotoL(d) {
  if (d.foto_depan)      d.foto_depan      = _uploadFotoToDrive(d.foto_depan, 'depan', d.nama_kk);
  if (d.foto_ruang_tamu) d.foto_ruang_tamu = _uploadFotoToDrive(d.foto_ruang_tamu, 'ruangtamu', d.nama_kk);
}

/* ====== SHEET RINCI PER-USAHA (pecahan usaha_data JSON) ====== */
const L_USAHA_HEADERS = [
  "Record ID", "Timestamp", "Nama KK", "No Usaha",
  "Nama Usaha", "Nama Komersial", "Alamat", "RT", "RW", "Kode Pos", "Email", "Website", "HP",
  "Kawasan", "Nama Kawasan", "Jenis Usaha", "Lokasi Alamat", "Lokasi Provinsi", "Lokasi Kab",
  "Punya NIB", "NIB", "Badan Usaha",
  "Pengusaha Nama", "Pengusaha JK", "Pengusaha Umur", "Pengusaha NIK",
  "Kegiatan Utama", "Input", "Proses", "Produk Utama", "KBLI Kode", "KBLI Kategori",
  "Jaringan", "Jumlah Cabang",
  "Internet", "Teknologi Digital", "Ramah Lingkungan", "Produk Kreatif",
  "Sertifikat Halal", "Izin BPOM", "Mitra KDKMP", "Program MBG",
  "Pekerja Laki", "Pekerja Perempuan", "Pekerja Dibayar", "Pekerja Tidak Dibayar", "Tahun Operasi",
  "Data Lengkap (JSON)"
];

function getOrInitLUsahaSheet(ss) {
  var sheet = ss.getSheetByName(L_USAHA_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(L_USAHA_SHEET);
    sheet.appendRow(L_USAHA_HEADERS);
    sheet.getRange(1, 1, 1, L_USAHA_HEADERS.length)
      .setFontWeight("bold").setBackground("#2b6cb0").setFontColor("#ffffff");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// Pecah usaha_data JSON jadi satu baris per usaha (kolom terbaca + JSON lengkap).
function saveLUsaha(mainSheet, mainId, d) {
  if (!d.usaha_data) return;
  var arr;
  try { arr = JSON.parse(d.usaha_data); } catch (e) { return; }
  if (!arr || !arr.length) return;
  var sheet = getOrInitLUsahaSheet(mainSheet.getParent());
  arr.forEach(function (u, i) {
    u = u || {};
    var g = function (k) { return (u[k] == null) ? '' : u[k]; };           // text/select
    var r = function (k) { return (u['_r_' + k] == null) ? '' : u['_r_' + k]; }; // radio
    sheet.appendRow([
      mainId, d.timestamp || '', d.nama_kk || '', i + 1,
      g('l2_nama_usaha'), g('l2_nama_komersial'), g('l2_alamat'), g('l2_rt'), g('l2_rw'), g('l2_kodepos'), g('l2_email'), g('l2_website'), g('l2_hp'),
      r('l2_kawasan'), g('l2_nama_kawasan'), r('l2_jenis_usaha'), g('l2_lokasi_alamat'), g('l2_lokasi_provinsi'), g('l2_lokasi_kab'),
      r('l2_punya_nib'), g('l2_nib'), r('l2_badan_usaha'),
      g('l2_pengusaha_nama'), r('l2_pengusaha_jk'), g('l2_pengusaha_umur'), g('l2_pengusaha_nik'),
      g('l2_kegiatan_utama'), g('l2_input'), g('l2_proses'), g('l2_produk_utama'), g('l2_kbli_kode'), g('l2_kbli_kategori'),
      r('l2_jaringan'), g('l2_jml_cabang'),
      r('l2_internet'), r('l2_teknologi'), r('l2_ramah_a'), r('l2_kreatif'),
      r('l2_halal'), r('l2_bpom'), r('l2_mitra_kdkmp'), r('l2_mbg'),
      g('l2_pekerja_l'), g('l2_pekerja_p'), g('l2_pekerja_dibayar'), g('l2_pekerja_tidak_dibayar'), g('l2_tahun_operasi'),
      JSON.stringify(u)
    ]);
  });
}

function deleteLUsaha(mainSheet, mainId) {
  var sheet = mainSheet.getParent().getSheetByName(L_USAHA_SHEET);
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
  ensureCawiIdColumn(sheet);
  _processFotoL(d); // foto base64 → URL Drive sebelum ditulis
  sheet.appendRow(buildRowL(d));
  var newId = sheet.getLastRow() - 1;
  applyTextFormatL(sheet, sheet.getLastRow(), d); // jaga angka nol di depan (HP, NIK, dll)
  saveLAnggota(sheet, newId, d);
  saveLUsaha(sheet, newId, d);
  if (d.tanda_tangan && d.tanda_tangan.length > 100) {
    try { saveTandaTanganL(d); } catch(e) { Logger.log("Gagal simpan TTD L: " + e.message); }
  }
  return jsonResponse({ status: "ok", message: "Data L berhasil disimpan", mode: "l", record_id: newId });
}

// Update L record by _id
function updateLRecord(d, editId) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = getOrInitLSheet(ss);
  ensureCawiIdColumn(sheet);
  var targetRow = editId + 1;
  if (targetRow < 2 || targetRow > sheet.getLastRow()) {
    return jsonResponse({ status: "error", message: "Rekaman L tidak ditemukan (id=" + editId + ")" });
  }
  _processFotoL(d); // foto base64 → URL Drive sebelum ditulis
  sheet.getRange(targetRow, 1, 1, L_HEADERS.length).setValues([buildRowL(d)]);
  applyTextFormatL(sheet, targetRow, d); // jaga angka nol di depan (HP, NIK, dll)
  deleteLAnggota(sheet, editId);
  saveLAnggota(sheet, editId, d);
  deleteLUsaha(sheet, editId);
  saveLUsaha(sheet, editId, d);
  if (d.tanda_tangan && d.tanda_tangan.length > 100) {
    try { saveTandaTanganL(d); } catch(e) { Logger.log("Gagal simpan TTD L: " + e.message); }
  }
  return jsonResponse({ status: "ok", message: "Data L berhasil diperbarui", mode: "l", record_id: editId });
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
  deleteLUsaha(sheet, deleteId);
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

// ============================================================
// P MODE (SE2026-P Pemutakhiran / Listing) — header, builder, helpers
// ============================================================
// Satu baris per entitas (keluarga/bangunan/usaha) yang dimutakhirkan.
// Blok P selalu di-submit (formMode 'p'); kuesioner lanjutan (L/L.UB/L.KP)
// disimpan terpisah di sheet masing-masing, ditautkan via "jenis_lanjutan" +
// "record_id_lanjutan". Field memakai prefix pmt_ (lihat docs/desain-unified-kuesioner-P.md §C).

const P_HEADERS = [
  "Timestamp",
  "CAWI ID",
  // Identitas pendata (login)
  "Petugas Email (login)", "Petugas Peran (login)", "Petugas Nama",
  // No urut
  "No Urut Keluarga", "No Urut Bangunan",
  // Identitas entitas
  "Nama KK/Bangunan",
  "Alamat Jalan", "Alamat Blok/No",
  // Wilayah
  "Provinsi", "Kode Provinsi",
  "Kabupaten/Kota", "Kode Kabupaten",
  "Kecamatan", "Kode Kecamatan",
  "Kelurahan/Desa", "Kode Kelurahan",
  "Kode SLS", "Nama SLS",
  "Perubahan SLS", "Nama SLS Baru",
  // Pemutakhiran
  "Keberadaan", "Sesuai KK",
  "Kode Penggunaan Bangunan", "Skala Usaha",
  "Jumlah Usaha", "IDSBR",
  "Jumlah Anggota (KK)", "Jumlah Anggota Menetap",
  // Geotag (pindahan dari L.UB)
  "Latitude", "Longitude", "Akurasi (m)",
  // Tautan ke kuesioner lanjutan
  "Jenis Lanjutan", "Record ID Lanjutan",
  // Tambahan restruktur SE2026-P (keluarga/bangunan) — di-append agar indeks lama stabil
  "Jenis Entitas (1=Keluarga/2=Bangunan)",
  "Nomor KK", "NIK Kepala Keluarga", "Nama Anggota Lainnya",
  "No Urut Keluarga Terbesar (ref)", "No Urut Bangunan Terbesar (ref)",
  "SubSLS"
];

// Urutan HARUS sama persis dengan P_HEADERS
const P_FIELD_NAMES = [
  "timestamp",
  "cawi_id",
  "petugas_email_login", "petugas_peran_login", "petugas_nama",
  "pmt_no_kel", "pmt_no_bgn",
  "pmt_nama",
  "pmt_jalan", "pmt_blok",
  "provinsi", "provinsi_kd",
  "kabupaten", "kabupaten_kd",
  "kecamatan", "kecamatan_kd",
  "kelurahan", "kelurahan_kd",
  "kode_sls", "nama_sls",
  "pmt_sls_berubah", "pmt_sls_nama",
  "pmt_keberadaan", "pmt_sesuai_kk",
  "pmt_kode_bangunan", "pmt_skala",
  "pmt_jml_usaha", "pmt_idsbr",
  "pmt_jml_kk", "pmt_jml_menetap",
  "pmt_lat", "pmt_lng", "pmt_akurasi",
  "jenis_lanjutan", "record_id_lanjutan",
  "pmt_jenis_entitas",
  "pmt_nomor_kk", "pmt_nik", "pmt_nama_anggota",
  "pmt_no_kel_max", "pmt_no_bgn_max",
  "pmt_subsls"
];

function buildRowP(d) {
  // Build row dari P_FIELD_NAMES — urutan dijamin match P_HEADERS
  return P_FIELD_NAMES.map(function(key) {
    if (key === "timestamp") return d.timestamp || new Date().toLocaleString("id-ID");
    var v = d[key];
    return (v === null || v === undefined) ? "" : v;
  });
}

// Init sheet P (header hijau-teal, beda dari L.UB orange & L biru)
function getOrInitPSheet(ss) {
  var sheet = ss.getSheetByName(P_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(P_SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(P_HEADERS);
    sheet.getRange(1, 1, 1, P_HEADERS.length)
      .setFontWeight("bold")
      .setBackground("#0f766e")
      .setFontColor("#ffffff");
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 160);
  }
  return sheet;
}

// Jaga field teks (cegah hilang angka nol depan / notasi ilmiah) untuk IDSBR
function applyTextFormatP(sheet, rowNum, d) {
  var idsbrCol = P_FIELD_NAMES.indexOf('pmt_idsbr') + 1;
  if (idsbrCol > 0 && d.pmt_idsbr !== null && d.pmt_idsbr !== undefined && d.pmt_idsbr !== '') {
    var cell = sheet.getRange(rowNum, idsbrCol);
    cell.setNumberFormat('@');
    cell.setValue(String(d.pmt_idsbr));
  }
}

// Insert P record
function insertPRecord(d) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = getOrInitPSheet(ss);
  ensureCawiIdColumn(sheet);
  sheet.appendRow(buildRowP(d));
  var newId = sheet.getLastRow() - 1;
  applyTextFormatP(sheet, sheet.getLastRow(), d);
  return jsonResponse({ status: "ok", message: "Data P berhasil disimpan", mode: "p", record_id: newId });
}

// Update P record by _id
function updatePRecord(d, editId) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = getOrInitPSheet(ss);
  ensureCawiIdColumn(sheet);
  var targetRow = editId + 1;
  if (targetRow < 2 || targetRow > sheet.getLastRow()) {
    return jsonResponse({ status: "error", message: "Rekaman P tidak ditemukan (id=" + editId + ")" });
  }
  sheet.getRange(targetRow, 1, 1, P_HEADERS.length).setValues([buildRowP(d)]);
  applyTextFormatP(sheet, targetRow, d);
  return jsonResponse({ status: "ok", message: "Data P berhasil diperbarui", mode: "p", record_id: editId });
}

// Delete P record by _id
function deletePRecord(deleteId) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(P_SHEET_NAME);
  if (!sheet) return jsonResponse({ status: "error", message: "Sheet P tidak ditemukan" });
  var targetRow = deleteId + 1;
  if (targetRow < 2 || targetRow > sheet.getLastRow()) {
    return jsonResponse({ status: "error", message: "Rekaman P tidak ditemukan (id=" + deleteId + ")" });
  }
  sheet.deleteRow(targetRow);
  return jsonResponse({ status: "ok", message: "Rekaman P berhasil dihapus", mode: "p" });
}

// Baca semua P records — _formMode='p' untuk badge di daftar.html
function readPRecords() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(P_SHEET_NAME);
  if (!sheet || sheet.getLastRow() <= 1) return [];
  var values = sheet.getDataRange().getValues();
  return values.slice(1).map(function(row, idx) {
    var obj = { _id: idx + 1, _formMode: 'p' };
    P_FIELD_NAMES.forEach(function(key, i) { obj[key] = cellStr(row[i]); });
    obj._ts = obj.timestamp;
    return obj;
  });
}

function getPRecordsResponse() {
  try { return jsonResponse({ status: "ok", kind: "precords", data: readPRecords() }); }
  catch (err) { return jsonResponse({ status: "error", message: err.message }); }
}

// ============================================================
// ASSIGNMENT REGISTRY + PROGRESS — sheet SE2026_Assignments
// ============================================================
// Satu baris per assignment (key = cawi_id). Di-upsert oleh portal (saat dibuat)
// & kuesioner (autosave/submit). daftar.html membacanya untuk monitoring; filter
// per peran (PPL = miliknya, PML = bawahannya) dilakukan di klien (PetugasManager).
const ASSIGN_HEADERS = [
  "CAWI ID", "Jenis", "Status", "Progress (%)", "Filled", "Total",
  "Petugas Nama", "Petugas Email", "Peran", "PML Email",
  "Nama Responden",
  "Provinsi", "Kode Provinsi", "Kabupaten", "Kode Kabupaten",
  "Kecamatan", "Kode Kecamatan", "Desa/Kel", "Kode Desa",
  "Nama SLS", "Kode SLS", "Kode SLS Lengkap", "SubSLS",
  "Dibuat", "Diperbarui"
];
const ASSIGN_FIELDS = [
  "cawi_id", "jenis", "status", "progress", "filled", "total",
  "petugas_nama", "petugas_email", "petugas_peran", "pml_email",
  "nama_responden",
  "provinsi", "provinsi_kd", "kabupaten", "kabupaten_kd",
  "kecamatan", "kecamatan_kd", "desa", "desa_kd",
  "sls_nama", "sls_kd", "sls_full_kd", "subsls_kd",
  "created_at", "updated_at"
];

function getOrInitAssignSheet(ss) {
  var sheet = ss.getSheetByName(ASSIGN_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(ASSIGN_SHEET);
    sheet.appendRow(ASSIGN_HEADERS);
    sheet.getRange(1, 1, 1, ASSIGN_HEADERS.length)
      .setFontWeight("bold").setBackground("#6b46c1").setFontColor("#ffffff");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// Cari row (1-based) berdasarkan cawi_id pada kolom pertama. -1 bila tak ada.
function _findAssignRow(sheet, cawiId) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  var col = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  var target = String(cawiId).trim();
  for (var i = 0; i < col.length; i++) {
    if (String(col[i][0]).trim() === target) return i + 2;
  }
  return -1;
}

// Upsert satu assignment (key cawi_id). created_at dipertahankan saat update.
function saveAssignmentMetaResponse(d) {
  try {
    if (!d || !d.cawi_id) throw new Error("cawi_id diperlukan");
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheet = getOrInitAssignSheet(ss);
    var nowIso = new Date().toISOString();
    var rowNum = _findAssignRow(sheet, d.cawi_id);
    var existing = {};
    if (rowNum > 0) {
      var cur = sheet.getRange(rowNum, 1, 1, ASSIGN_HEADERS.length).getValues()[0];
      ASSIGN_FIELDS.forEach(function (k, i) { existing[k] = cur[i]; });
    }
    var rec = {};
    ASSIGN_FIELDS.forEach(function (k) {
      // Nilai baru menimpa; bila tak dikirim, pertahankan nilai lama.
      rec[k] = (d[k] !== undefined && d[k] !== null && d[k] !== '')
        ? d[k] : (existing[k] != null ? existing[k] : '');
    });
    rec.created_at = (existing.created_at && String(existing.created_at).trim()) ? existing.created_at : nowIso;
    rec.updated_at = nowIso;
    var row = ASSIGN_FIELDS.map(function (k) { return rec[k] == null ? '' : rec[k]; });
    if (rowNum > 0) {
      sheet.getRange(rowNum, 1, 1, row.length).setValues([row]);
    } else {
      sheet.appendRow(row);
    }
    return jsonResponse({ status: "ok", message: "assignment meta tersimpan", cawi_id: d.cawi_id });
  } catch (err) {
    return jsonResponse({ status: "error", message: err.message });
  }
}

function getAssignmentsMetaResponse() {
  try {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheetByName(ASSIGN_SHEET);
    if (!sheet || sheet.getLastRow() <= 1) return jsonResponse({ status: "ok", kind: "assignments", data: [] });
    var values = sheet.getDataRange().getValues();
    var out = values.slice(1).map(function (row) {
      var o = {};
      ASSIGN_FIELDS.forEach(function (k, i) { o[k] = cellStr(row[i]); });
      return o;
    }).filter(function (o) { return o.cawi_id; });
    return jsonResponse({ status: "ok", kind: "assignments", data: out });
  } catch (err) {
    return jsonResponse({ status: "error", message: err.message });
  }
}

function deleteAssignmentMetaResponse(cawiId) {
  try {
    if (!cawiId) throw new Error("cawi_id diperlukan");
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheetByName(ASSIGN_SHEET);
    if (sheet) {
      var rowNum = _findAssignRow(sheet, cawiId);
      if (rowNum > 0) sheet.deleteRow(rowNum);
    }
    return jsonResponse({ status: "ok", message: "assignment meta dihapus" });
  } catch (err) {
    return jsonResponse({ status: "error", message: err.message });
  }
}

// ============================================================
// PRELIST (DTSEN/SBR) — endpoint getPrelist
// ============================================================
// Baca sheet PRELIST_SHEET_NAME, filter by Kode SLS, kembalikan entri minimal
// (G-3): domisili wilayah + nama + skala usaha. Pemetaan kolom dilakukan via
// nama header (case-insensitive) supaya tahan terhadap layout sheet yang belum
// pasti. Bila sheet belum ada → kembalikan list kosong (bukan error).
function getPrelistResponse(slsKd) {
  try {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheetByName(PRELIST_SHEET_NAME);
    if (!sheet || sheet.getLastRow() < 2) return jsonResponse({ status: "ok", kind: "prelist", data: [] });
    var values = sheet.getDataRange().getValues();
    var headers = values[0].map(function(h) { return String(h).trim().toLowerCase(); });
    var idx = _mapPrelistHeaders(headers);
    var target = String(slsKd || '').trim();
    var pick = function(row, i) { return (i >= 0 && i < row.length) ? cellStr(row[i]).trim() : ''; };
    var out = [];
    for (var r = 1; r < values.length; r++) {
      var row = values[r];
      var slsVal = pick(row, idx.kode_sls);
      // Filter SLS bila parameter diberikan & kolom SLS terdeteksi
      if (target && idx.kode_sls >= 0 && slsVal !== target) continue;
      var nama = pick(row, idx.nama);
      if (!nama && !slsVal) continue; // baris kosong
      out.push({
        nama:         nama,
        skala:        pick(row, idx.skala),
        idsbr:        pick(row, idx.idsbr),
        alamat:       pick(row, idx.alamat),
        no_urut:      pick(row, idx.no_urut),
        kode_sls:     slsVal,
        nama_sls:     pick(row, idx.nama_sls),
        provinsi:     pick(row, idx.provinsi),
        provinsi_kd:  pick(row, idx.provinsi_kd),
        kabupaten:    pick(row, idx.kabupaten),
        kabupaten_kd: pick(row, idx.kabupaten_kd),
        kecamatan:    pick(row, idx.kecamatan),
        kecamatan_kd: pick(row, idx.kecamatan_kd),
        kelurahan:    pick(row, idx.kelurahan),
        kelurahan_kd: pick(row, idx.kelurahan_kd)
      });
    }
    return jsonResponse({ status: "ok", kind: "prelist", data: out });
  } catch (err) {
    return jsonResponse({ status: "error", message: err.message });
  }
}

// Petakan indeks kolom prelist berdasarkan kata kunci di header (lowercase).
// Return objek { field: indexKolom (-1 jika tidak ada) }.
function _mapPrelistHeaders(h) {
  function find(fn) { for (var i = 0; i < h.length; i++) { if (fn(h[i])) return i; } return -1; }
  var has    = function(s, kw) { return s.indexOf(kw) >= 0; };
  var isKode = function(s) {
    return has(s, 'kode') || /(^|[^a-z])kd([^a-z]|$)/.test(s) || /_kd$/.test(s);
  };
  return {
    kode_sls:     find(function(s) { return has(s, 'sls') && isKode(s); }),
    nama_sls:     find(function(s) { return has(s, 'sls') && has(s, 'nama'); }),
    nama:         find(function(s) {
      return has(s, 'nama') && !has(s, 'sls') && !has(s, 'prov') && !has(s, 'kab') &&
             !has(s, 'kec') && !has(s, 'desa') && !has(s, 'kelurahan') && !has(s, 'petugas');
    }),
    skala:        find(function(s) { return has(s, 'skala'); }),
    idsbr:        find(function(s) { return has(s, 'idsbr') || has(s, 'id sbr'); }),
    alamat:       find(function(s) { return has(s, 'alamat'); }),
    no_urut:      find(function(s) { return has(s, 'urut'); }),
    provinsi_kd:  find(function(s) { return has(s, 'prov') && isKode(s); }),
    provinsi:     find(function(s) { return has(s, 'prov') && !isKode(s); }),
    kabupaten_kd: find(function(s) { return has(s, 'kab') && isKode(s); }),
    kabupaten:    find(function(s) { return has(s, 'kab') && !isKode(s); }),
    kecamatan_kd: find(function(s) { return has(s, 'kec') && isKode(s); }),
    kecamatan:    find(function(s) { return has(s, 'kec') && !isKode(s); }),
    kelurahan_kd: find(function(s) { return (has(s, 'desa') || has(s, 'kelurahan')) && isKode(s); }),
    kelurahan:    find(function(s) { return (has(s, 'desa') || has(s, 'kelurahan')) && !isKode(s); })
  };
}
