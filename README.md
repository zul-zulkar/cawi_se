# CAWI SE2026 — BPS Buleleng

Aplikasi web formulir pendataan **Sensus Ekonomi 2026** berbasis CAWI (Computer Assisted Web Interviewing). Data hasil isian dikirim ke Google Sheets melalui Google Apps Script.

---

## Struktur Proyek

```
cawi_se26/
├── index.html              # Formulir isian utama (petugas)
├── daftar.html             # Dashboard rekap entri data
├── admin.html              # Panel admin (password, sheet, pegawai)
├── data.js                 # Data statis kecamatan, kelurahan, KBLI
├── google-apps-script.js   # Kode backend Google Apps Script
└── netlify.toml            # Konfigurasi deployment Netlify
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
7. **Salin URL** yang muncul — URL ini yang akan dipakai sebagai `SCRIPT_URL`

---

### 4. Hubungkan URL Script ke Aplikasi

Setelah deploy selesai, ada dua cara memasukkan URL baru:

**Cara A — Lewat Panel Admin (tanpa edit kode):**
1. Buka `admin.html` di browser
2. Login dengan password admin (default: tanyakan ke pengelola proyek asal)
3. Scroll ke kartu **Sumber Data Google Sheet**
4. Tempel URL Apps Script baru → klik **Simpan URL**

**Cara B — Edit langsung di kode:**

Buka `index.html`, cari baris berikut dan ganti URL-nya:
```javascript
const DEFAULT_SCRIPT_URL_FORM = "https://script.google.com/macros/s/<<URL_LAMA>>/exec";
```

Lakukan hal yang sama di `daftar.html`:
```javascript
const DEFAULT_SCRIPT_URL_DAFTAR = "https://script.google.com/macros/s/<<URL_LAMA>>/exec";
```

> **Catatan:** Cara A hanya berlaku per-perangkat (localStorage). Cara B mengubah default untuk semua pengguna.

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
Upload semua file (`index.html`, `daftar.html`, `admin.html`, `data.js`) ke server web manapun yang mendukung file statis.

---

## Password Default

| Akses | Password Default |
|---|---|
| Formulir (kuesioner) | Tanyakan ke pengelola proyek asal |
| Panel Admin | Tanyakan ke pengelola proyek asal |

> Password disimpan sebagai hash SHA-256 di localStorage masing-masing perangkat. Ubah password melalui `admin.html` segera setelah duplikasi selesai.

---

## Cara Kerja Penyimpanan

- **Google Sheets + Apps Script** — semua entri formulir dikirim ke sheet via HTTP POST
- **localStorage** — pengaturan lokal (password kustom, URL sheet kustom, daftar pegawai kustom) disimpan per-perangkat dan tidak tersinkronisasi antar perangkat secara otomatis

---

## Troubleshooting

| Masalah | Solusi |
|---|---|
| Formulir tidak bisa submit | Periksa URL Apps Script di panel admin; pastikan deployment masih aktif |
| Data tidak muncul di daftar | Pastikan `SHEET_ID` di Apps Script sudah benar dan sheet sudah punya izin akses |
| Password terkunci | Buka DevTools browser → Console → jalankan `localStorage.clear()` lalu reload |
| Apps Script error 403 | Deploy ulang sebagai Web App dengan *Who has access: Anyone* |
