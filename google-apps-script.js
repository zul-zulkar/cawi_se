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

const SHEET_ID   = "1f-YLgJHfMU33_9Pn6snao1xZ-qf3vBQRpAxFwxBLOGI";
const SHEET_NAME = "SE2026_Responses";

// Ganti token ini dengan string acak yang kuat — harus sama dengan API_TOKEN di index.html
const API_TOKEN  = "BPS-5108-K3r4h4s14an-SE2026-xK9mP";

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
  "Transaksi Barang Non-Penduduk", "Transaksi Jasa Non-Penduduk",
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
  "Tanda Tangan (base64)"
];

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    if (d._token !== API_TOKEN) {
      return ContentService
        .createTextOutput(JSON.stringify({ status: "error", message: "Akses ditolak" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    const ss    = SpreadsheetApp.openById(SHEET_ID);
    let sheet   = ss.getSheetByName(SHEET_NAME);

    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
    }

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
      const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
      headerRange
        .setFontWeight("bold")
        .setBackground("#fc6c00")
        .setFontColor("#ffffff");
      sheet.setFrozenRows(1);
      sheet.setColumnWidth(1, 160); // Timestamp
    }

    sheet.appendRow([
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
      d.transaksi_barang_nonpenduduk, d.transaksi_jasa_nonpenduduk,
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
      d.tanda_tangan ? "[ada]" : "[kosong]" // simpan flag saja, bukan base64 penuh
    ]);

    // Opsional: simpan tanda tangan sebagai file Drive
    if (d.tanda_tangan && d.tanda_tangan.length > 100) {
      try {
        saveTandaTangan(d);
      } catch(sigErr) {
        Logger.log("Gagal simpan TTD: " + sigErr.message);
      }
    }

    return ContentService
      .createTextOutput(JSON.stringify({ status: "ok", message: "Data berhasil disimpan" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    Logger.log("doPost error: " + err.message);
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
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

// Urutan kolom ini HARUS sama dengan appendRow di doPost dan HEADERS di atas
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
  "transaksi_barang_nonpenduduk", "transaksi_jasa_nonpenduduk",
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
  "tanda_tangan"
];

// Endpoint GET — kembalikan semua rekaman sebagai JSON (butuh token)
function doGet(e) {
  try {
    const token = e && e.parameter && e.parameter.token;
    if (token !== API_TOKEN) {
      return ContentService
        .createTextOutput(JSON.stringify({ status: "error", message: "Akses ditolak" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const ss    = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet || sheet.getLastRow() <= 1) {
      return ContentService
        .createTextOutput(JSON.stringify({ status: "ok", data: [] }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const values = sheet.getDataRange().getValues();
    const rows = values.slice(1).map(function(row, idx) {
      var obj = { _id: idx + 1 };
      FIELD_NAMES.forEach(function(key, i) {
        obj[key] = (row[i] !== undefined && row[i] !== null) ? String(row[i]) : "";
      });
      obj._ts = obj.timestamp;
      return obj;
    });

    return ContentService
      .createTextOutput(JSON.stringify({ status: "ok", data: rows }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch(err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
