# CAWI SE2026 — BPS Buleleng

Aplikasi web formulir pendataan **Sensus Ekonomi 2026** berbasis CAWI (Computer Assisted Web Interviewing). Data hasil isian dikirim ke Google Sheets melalui Google Apps Script.

---

## Struktur Proyek

```
cawi_se26/
├── index.html              # Formulir isian utama (petugas)
├── daftar.html             # Dashboard rekap entri data
├── admin.html              # Panel admin (password, sheet, pegawai)
├── data.js                 # Data statis kecamatan & kelurahan
├── google-apps-script.js   # Kode backend Google Apps Script
├── netlify.toml            # Konfigurasi deployment Netlify
│
├── master/
│   └── kbli.json           # Kamus KBLI 2025 (1520 entri: kode, judul, uraian)
│
├── css/
│   ├── index.css           # Styling formulir utama
│   ├── daftar.css          # Styling dashboard rekap
│   └── admin.css           # Styling panel admin
│
└── js/
    ├── config.js           # URL Apps Script terpusat (DEFAULT_SCRIPT_URL)
    ├── utils.js            # SHA-256 hash, esc(), fmtDate()
    ├── auth.js             # Gate password kuesioner (dipakai index + daftar)
    ├── auth-admin.js       # Gate password admin
    ├── petugas.js          # Data & dropdown daftar petugas
    ├── ui.js               # makeSearchable(), toggleRemark(), goBlok()
    ├── map.js              # Geolokasi (ambilLokasi)
    ├── regional.js         # loadProvinsi(), loadKecamatan(), loadKelurahan()
    ├── kbli.js             # Pencarian KBLI 2025 (scored search)
    ├── form.js             # Handler radio, kalkulasi, validasi field
    ├── form-progress.js    # Indikator progres pengisian
    ├── form-validation.js  # validateBlok1(), validateBlok3()
    ├── draft.js            # Auto-save & restore draft (localStorage)
    ├── submit.js           # collectData(), submitForm(), edit mode
    ├── index-init.js       # DOMContentLoaded — inisialisasi formulir
    ├── daftar-main.js      # Semua logika dashboard rekap
    └── admin-main.js       # Semua logika panel admin
```

---

## Cara Duplikasi Proyek

### 1. Salin Repository

**Opsi A — Fork di GitHub (disarankan):**
1. Buka repository di GitHub
2. Klik tombol **Fork** di pojok kanan atas
3. Clone fork Anda ke lokal:
   ```bash
   git clone https://github.com/<username-anda>/cawi_se26.git
   cd cawi_se26
   ```

**Opsi B — Download ZIP:**
1. Klik **Code → Download ZIP** di halaman repository
2. Ekstrak ke folder kerja Anda

---

### 2. Buat Google Sheet Baru

1. Buka [Google Sheets](https://sheets.google.com) → buat spreadsheet baru
2. Beri nama sheet sesuai kebutuhan (misal: `SE2026_Responses`)
3. Catat **ID spreadsheet** dari URL-nya:
   ```
   https://docs.google.com/spreadsheets/d/<<SHEET_ID>>/edit
   ```

---

### 3. Setup Google Apps Script

1. Buka [script.google.com](https://script.google.com) → klik **Proyek Baru**
2. Hapus semua kode yang ada, lalu salin seluruh isi `google-apps-script.js`
3. Ganti nilai `SHEET_ID` di baris paling atas:
   ```javascript
   const SHEET_ID   = "ID_SHEET_ANDA_DI_SINI";
   const SHEET_NAME = "SE2026_Responses"; // nama tab sheet
   ```
4. Simpan proyek (**Ctrl+S**)
5. Klik **Deploy → New Deployment**
   - Type: **Web App**
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Klik **Deploy** → izinkan akses jika diminta
7. **Salin URL** yang muncul — URL ini yang akan dipakai sebagai script URL

---

### 4. Hubungkan URL Script ke Aplikasi

Setelah deploy selesai, ada dua cara memasukkan URL baru:

**Cara A — Lewat Panel Admin (tanpa edit kode):**
1. Buka `admin.html` di browser
2. Login dengan password admin
3. Scroll ke kartu **Sumber Data Google Sheet**
4. Tempel URL Apps Script baru → klik **Simpan URL**

**Cara B — Edit langsung di kode:**

Buka `js/config.js` dan ganti URL default:
```javascript
const DEFAULT_SCRIPT_URL = "https://script.google.com/macros/s/<<URL_BARU>>/exec";
```

> **Catatan:** Cara A menyimpan URL di localStorage masing-masing perangkat (berlaku lokal). Cara B mengubah default untuk semua pengguna baru.

---

### 5. Sesuaikan Data Wilayah & Pegawai

**Data wilayah** (kecamatan, kelurahan) ada di `data.js`. Edit sesuai wilayah kerja BPS Anda.

**Daftar pegawai** bisa diubah tanpa edit kode melalui panel admin:
1. Buka `admin.html` → login
2. Scroll ke kartu **Daftar Pegawai**
3. Tambah, edit, atau hapus pegawai sesuai kebutuhan
4. Atau klik **Reset Daftar ke Default** untuk kembali ke daftar bawaan

---

### 6. Deploy ke Hosting

**Opsi A — Netlify (disarankan, sudah ada `netlify.toml`):**
1. Buat akun di [netlify.com](https://netlify.com)
2. Klik **Add new site → Import an existing project**
3. Hubungkan ke repository GitHub Anda
4. Biarkan pengaturan build kosong (situs ini statis)
5. Klik **Deploy site** — URL publik akan otomatis tersedia

**Opsi B — GitHub Pages:**
1. Push semua file ke branch `main` di GitHub
2. Buka **Settings → Pages** di repository
3. Source: pilih branch `main`, folder `/ (root)`
4. Klik **Save** — situs tersedia di `https://<username>.github.io/<nama-repo>`

**Opsi C — Hosting mandiri:**
Upload seluruh folder proyek (termasuk `js/`, `css/`, `master/`) ke server web manapun yang mendukung file statis.

---

## Password Default

| Akses | Password Default |
|---|---|
| Formulir (kuesioner) | Tanyakan ke pengelola proyek asal |
| Panel Admin | Tanyakan ke pengelola proyek asal |

> Password disimpan sebagai hash SHA-256 di Google Sheets dan diambil saat halaman dimuat. Ubah password melalui `admin.html` segera setelah duplikasi selesai — perubahan langsung berlaku untuk semua perangkat.

---

## Cara Kerja Penyimpanan

- **Google Sheets + Apps Script** — semua entri formulir dikirim ke sheet via HTTP POST; hash password kuesioner dan admin juga disimpan di sheet agar berlaku terpusat
- **sessionStorage** — status login sesi aktif; otomatis bersih saat tab/browser ditutup
- **localStorage** — pengaturan lokal (URL sheet kustom, daftar pegawai kustom, draft isian); tidak tersinkronisasi antar perangkat

---

## Pencarian KBLI 2025

Formulir menggunakan kamus KBLI 2025 (`master/kbli.json`, 1520 entri) dengan algoritma pencarian berbasis skor:

| Field | Bobot |
|---|---|
| Kode (exact match) | 100 |
| Kode (prefix) | 80 |
| Judul (exact) | 90 |
| Judul (prefix/contains) | 45–60 |
| Uraian (contains/word overlap) | 12–20 |

Hasil diurutkan berdasarkan skor tertinggi, menampilkan 15 entri teratas beserta uraian singkat dan kategori KBLI.

---

## Troubleshooting

| Masalah | Solusi |
|---|---|
| Formulir tidak bisa submit | Periksa URL Apps Script di panel admin; pastikan deployment masih aktif |
| Data tidak muncul di daftar | Pastikan `SHEET_ID` di Apps Script sudah benar dan sheet sudah punya izin akses |
| Password tidak dikenali | Pastikan koneksi internet aktif saat membuka halaman (hash diambil dari sheet); coba reload |
| Apps Script error 403 | Deploy ulang sebagai Web App dengan *Who has access: Anyone* |
| KBLI tidak muncul saat diketik | Pastikan file `master/kbli.json` ikut ter-upload ke server hosting |
