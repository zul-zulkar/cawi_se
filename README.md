# CAWI SE2026 — BPS Buleleng

Aplikasi web formulir pendataan **Sensus Ekonomi 2026** berbasis CAWI (Computer Assisted Web Interviewing). Mendukung **dua jenis kuesioner**: usaha/perusahaan besar (L.UB) dan usaha rumah tangga (L). Data dikirim ke Google Sheets via Google Apps Script.

---

## Versi

**v2.0 — Dual Mode Kuesioner (L.UB + L Rumah Tangga)**

Fitur utama:
- **Pre-selector modal** saat login — pilih jenis pendataan: **Usaha/Perusahaan Besar (L.UB)** atau **Rumah Tangga (L)**
- **Kuesioner SE2026-L** lengkap dalam 5 Blok: Keluarga & Anggota, Usaha, Perumahan & Aset, Catatan, Petugas/Responden
- **Kuesioner SE2026 L.UB** lengkap dengan dukungan L.KP (kantor cabang dinamis hingga 50 unit)
- **Anggota keluarga dinamis** (max 30) dengan **STOP-state** (Meninggal/Pisah KK/Tidak Ditemukan) dan **age-gated fields** (≥5 untuk sekolah/ijazah/rekening/disabilitas, ≥10 untuk profesi/pendapatan)
- **187 kode profesi** SE2026-L (`data-profesi.js`)
- **Dual sheet routing** otomatis: `SE2026_Responses` + `SE2026_LKP` untuk L.UB; `SE2026_L_Responses` + `SE2026_L_Anggota` untuk L
- **Tombol Ganti Jenis** di sidebar untuk switch mode (dengan konfirmasi)
- **Halaman Daftar** dengan badge berwarna (orange `L.UB` / biru `L`) dan filter "Jenis Pendataan"
- **Draft auto-save** + restore lengkap dengan `_formMode`, tanda tangan terpisah per mode
- **Mata uang** format Indonesia 2 desimal: `1.234.567,89`
- **KBLI 2025** scored search (1520 entri) — bobot kode/judul/uraian
- **GPS geolokasi** dengan map preview, password gate dengan SHA-256 hash, panel admin terpisah
- **488 unit test** menjamin kebenaran logika progres, validasi, dispatch mode, dan filter daftar

---

## Default Endpoint (untuk Duplikator)

Aplikasi siap dipakai tanpa konfigurasi tambahan — sudah terhubung ke deployment sandbox:

| Item | Nilai Default |
|---|---|
| Apps Script URL | `https://script.google.com/macros/s/AKfycbxVyPaTpVmfxBvIPQc2u6kTMKWIZXT7LggpjGVCLV-pGHMRRQzL_zGEr1OjeuArB7OgDA/exec` |
| Google Sheet ID | `1GvDink6EEC0HFDT7eUgUXpG_gCfroFp7cZxOuWFvKew` |
| Password Kuesioner | `Kuesioner08!` |
| Password Daftar | `Daftar08!` |
| Password Admin | `Admin08!` |

> ⚠️ **Endpoint default menulis ke spreadsheet sandbox publik** — semua data submit dari duplikator yang belum mengganti URL akan masuk ke sheet pusat. Cocok untuk demo, **tidak cocok untuk operasi pendataan resmi**. Lihat [Cara Duplikasi Proyek](#cara-duplikasi-proyek) untuk setup endpoint sendiri.

---

## Struktur Proyek

```
cawi_se/
├── index.html              # Formulir isian utama (L.UB + L mode-switch)
├── daftar.html             # Dashboard rekap entri data (badge L.UB/L + filter mode)
├── admin.html              # Panel admin (password, sheet URL, pegawai)
├── data.js                 # Data statis kecamatan & kelurahan Bali
├── data-profesi.js         # 187 kode profesi SE2026-L (untuk L mode r16)
├── google-apps-script.js   # Backend Apps Script (dual-sheet routing)
├── netlify.toml            # Konfigurasi deployment Netlify
│
├── master/
│   ├── kbli.json           # Kamus KBLI 2025 (1520 entri)
│   └── kuesioner/          # PDF + extracted text SE2026-L sumber
│
├── src/
│   └── index/               # Partial HTML — gabungkan via `npm run build:html`
│       ├── 01-head.html              # <head> + Leaflet/font + 5 CSS link
│       ├── 02-gates.html             # Password gate + Mode pre-selector
│       ├── 03-shell-open.html        # Mobile topbar + sidebar overlay + app-layout open
│       ├── 04-sidebar.html           # Sidebar (L.UB + L navigation)
│       ├── 05-main-open.html         # Main + header-kop + blok-nav + form-container
│       ├── 06-form-lub.html          # Form L.UB lengkap (3 Blok)
│       ├── 07-form-l-blok1.html      # L Blok I — Keluarga & Anggota
│       ├── 08-form-l-blok2.html      # L Blok II — Usaha
│       ├── 09-form-l-blok3.html      # L Blok III — Perumahan & Aset
│       ├── 10-form-l-blok4.html      # L Blok IV — Catatan
│       ├── 11-form-l-blok5.html      # L Blok V — Petugas & Responden
│       ├── 12-shell-close.html       # Close form-container + footer
│       ├── 13-modals.html            # Petunjuk + Recap + Leave-guard modals
│       ├── 14-scripts.html           # <script> tags (urutan loading)
│       └── 15-end.html               # </body></html>
│
├── tools/
│   └── build-html.js        # Concat src/index/*.html → index.html (no deps)
│
├── css/
│   ├── index/                # Pecahan CSS formulir utama
│   │   ├── base.css                  # Reset, utility (.hidden, .alert, .spinner)
│   │   ├── layout.css                # Header-kop, sidebar, blok-nav, footer, mobile-topbar, banners
│   │   ├── components.css            # Form fields, autocomplete, KBLI, signature, lokasi, buttons, cards, remark
│   │   ├── modals.css                # Overlay, petunjuk, recap, leave-guard, pw-gate, mode-gate
│   │   └── form-l.css                # L mode: anggota card, mode-aware containers, mode badge
│   ├── daftar.css           # Styling dashboard (termasuk badge L.UB/L)
│   └── admin.css            # Styling panel admin
│
└── js/
    ├── config.js            # DEFAULT_SCRIPT_URL Apps Script
    │
    ├── auth/                # Gate password
    │   ├── auth.js          # Kuesioner password
    │   ├── auth-daftar.js   # Daftar password
    │   └── auth-admin.js    # Admin password
    │
    ├── form-lub/            # L.UB (Usaha Besar) — fitur lama
    │   ├── form.js                  # Handler radio, kalkulasi, validasi L.UB
    │   ├── form-progress.js         # calcProgress dispatcher (L.UB default)
    │   └── form-validation.js       # collectAllProblems dispatcher (L.UB default)
    │
    ├── form-l/              # L (Rumah Tangga) — fitur SE2026-L
    │   ├── form-l.js                # ⭐ Anggota dinamis, STOP-state, age-gated, loadEditModeL
    │   ├── form-l-progress.js       # ⭐ calcProgressL
    │   └── form-l-validation.js     # ⭐ collectAllProblemsL
    │
    ├── pages/               # Bootstrap per halaman
    │   ├── index-init.js            # DOMContentLoaded — wire mode gate, anggota init
    │   ├── daftar-main.js           # Dashboard + filter + badge + view L/L.UB
    │   └── admin-main.js            # Panel admin
    │
    └── shared/              # Util & komponen lintas halaman
        ├── utils.js                 # SHA-256, esc(), fmtDate()
        ├── form-mode.js             # ⭐ Mode L.UB/L (storage, switch, gate modal)
        ├── ui.js                    # makeSearchable(), goBlok() (mode-aware)
        ├── map.js                   # Geolokasi
        ├── regional.js              # loadProvinsi/Kecamatan/Kelurahan
        ├── kbli.js                  # Pencarian KBLI 2025 (scored)
        ├── petugas.js               # Data & dropdown pegawai
        ├── draft.js                 # Auto-save & restore (_formMode + TTD L)
        ├── submit.js                # collectData/collectDataL, mode-aware submit & edit
        └── backup.js                # Helper export/import lokal
```

### Build pipeline

`index.html` dihasilkan dari partial-partial di `src/index/`:

```bash
npm run build:html        # Concat → tulis ulang index.html
```

⚠️ **Jangan edit `index.html` secara langsung** — perubahan akan ditimpa saat build berikutnya. Edit partial yang relevan di `src/index/`, lalu jalankan `npm run build:html`.

Banner peringatan auto-generated dimasukkan otomatis di puncak file output.

---

## Menjalankan Test Suite

Proyek ini dilengkapi 488 unit test dengan [Vitest](https://vitest.dev/).

### Prasyarat
Node.js v18+. Cek dengan `node --version`. Instal dari [nodejs.org](https://nodejs.org) atau `winget install OpenJS.NodeJS.LTS`.

### Instalasi & Run
```bash
cd cawi_se
npm install
npm test                # Sekali jalan
npm run test:watch      # Auto-reload saat file berubah
npm run coverage        # HTML report di tests/coverage/
```

Output saat semua lolos:
```
 Test Files  12 passed (12)
      Tests  488 passed (488)
   Duration  ~1.4s
```

### Cakupan Test
```
tests/unit/
├── utils.test.js            # esc(), fmtDate(), sha256()
├── validators.test.js       # isValidHP(), isValidEmail(), parseCurrency()
├── kbli.test.js             # getKategoriFromKode(), scoreKBLI(), dll.
├── kabupaten.test.js        # STATIC_KABUPATEN integrity
├── draft.test.js            # getDraftList(), deleteDraftById()
├── form-progress.test.js    # calcProgress L.UB (~75 test)
├── form-validation.test.js  # collectAllProblems L.UB (~130 test)
├── form-mode.test.js        # getFormMode/setFormMode/applyFormMode (15 test)
├── anggota-card.test.js     # STOP-state, age-gated, template (33 test)
├── form-l-progress.test.js  # calcProgressL (32 test)
├── form-l-validation.test.js# collectAllProblemsL (47 test)
└── daftar-render.test.js    # filter mode + badge logic (16 test)
```

Fungsi-fungsi browser script dimuat ke konteks test via `new Function()` + mock DOM minimal — **tidak ada perubahan pada source file** dan tidak ada runtime browser yang dibutuhkan.

---

## Cara Duplikasi Proyek

> 💡 **Mau cepat coba dulu?** Pakai endpoint default — lihat tabel [Default Endpoint](#default-endpoint-untuk-duplikator). Loncat ke [Alur Tes End-to-End](#alur-tes-end-to-end). Untuk operasi serius, ikuti langkah 1–6 berikut.

### 1. Salin Repository

**Opsi A — Fork GitHub:**
```bash
git clone https://github.com/<username-anda>/cawi_se.git
cd cawi_se
```

**Opsi B — Download ZIP:** Klik **Code → Download ZIP** → ekstrak ke folder kerja.

### 2. Buat Google Sheet Baru
1. Buka [Google Sheets](https://sheets.google.com) → **Blank**
2. Beri nama (mis: `CAWI SE2026 — Buleleng`)
3. Catat **SHEET_ID** dari URL: `docs.google.com/spreadsheets/d/<<SHEET_ID>>/edit`

Sheet kosong tidak masalah — Apps Script akan auto-create tab `SE2026_Responses`, `SE2026_LKP`, `SE2026_L_Responses`, `SE2026_L_Anggota`, `CAWI_Config` saat record pertama masuk.

### 3. Setup Google Apps Script
1. Buka [script.google.com](https://script.google.com) → **New Project**
2. Hapus isi `Code.gs`, paste seluruh isi [`google-apps-script.js`](google-apps-script.js)
3. Ganti `SHEET_ID` di baris 15:
   ```javascript
   const SHEET_ID = "ID_SHEET_ANDA_DI_SINI";
   ```
4. Save (**Ctrl+S**)
5. **Test dulu sebelum deploy** — di dropdown function pilih `doGet` → klik ▶️ Run → authorize akses (Allow). Harus return JSON tanpa error.
6. Klik **Deploy → New Deployment** → ⚙️ → **Web App**:
   - Execute as: **Me**
   - Who has access: **Anyone**
7. Klik **Deploy** → salin **Web app URL** (yang berakhir `/exec`)

### 4. Hubungkan URL Script ke Aplikasi

**Cara A — Lewat Admin Panel (tanpa edit kode):**
1. Buka `admin.html` di browser → login (default `Admin08!`)
2. Scroll ke kartu **Sumber Data Google Sheet** → paste URL → **Simpan URL**

> URL disimpan di `localStorage.cawi_script_url_override` — **berlaku lokal per perangkat**.

**Cara B — Edit kode (default untuk semua pengguna):**

Buka [`js/config.js`](js/config.js) dan ganti:
```javascript
const DEFAULT_SCRIPT_URL = "https://script.google.com/macros/s/<<URL_BARU>>/exec";
```

### 5. Sesuaikan Data Wilayah & Pegawai
- **Data wilayah** (kecamatan, kelurahan, kabupaten) di [`data.js`](data.js) — edit sesuai wilayah BPS Anda
- **Daftar pegawai** lewat admin panel → kartu **Daftar Pegawai** → tambah/edit/hapus

### 6. Deploy ke Hosting

**Opsi A — Netlify (disarankan):**
1. [netlify.com](https://netlify.com) → **Add new site → Import an existing project**
2. Hubungkan ke repo GitHub → biarkan build kosong → **Deploy**

**Opsi B — GitHub Pages:**
1. Push ke branch `main`
2. **Settings → Pages** → Source: `main` / `(root)` → **Save**

**Opsi C — Hosting mandiri:** Upload seluruh folder (termasuk `js/`, `css/`, `master/`) ke web server statis.

---

## Alur Tes End-to-End

Panduan untuk menguji sendiri fitur dual-mode dari nol sampai data masuk ke spreadsheet.

### Pra-syarat
- Browser dengan DevTools (Chrome/Firefox/Edge)
- Bisa pakai default endpoint (untuk demo) **atau** endpoint Anda sendiri (untuk operasi)
- Jika pakai endpoint sendiri: pastikan langkah 2–4 [Cara Duplikasi Proyek](#cara-duplikasi-proyek) sudah selesai

### TEST 1 — Bootstrap & Mode Gate

1. **Buka `index.html`** di browser (lokal atau hosted)
2. Login dengan password `Kuesioner08!`
3. ✅ **Cek**: Modal **"Pilih Jenis Pendataan"** muncul dengan 2 tombol (L.UB / L)
4. Buka DevTools Console → ketik `localStorage.getItem('cawi_form_mode')` → harus `null`
5. Pilih **L.UB (Usaha/Perusahaan Besar)** → modal hilang
6. Cek lagi `localStorage.getItem('cawi_form_mode')` → harus `"lub"`
7. Header tab harus tampil "BLOK I / II / III" (L.UB)

### TEST 2 — L.UB Submit (Regression — pastikan tidak rusak)

1. Lanjut dari TEST 1 (mode L.UB)
2. Isi minimal field wajib:
   - Lokasi: provinsi/kab Bali sudah default → pilih kecamatan & kelurahan
   - Q5a Nama Perusahaan, Q5b Komersial, alamat, kodepos 5-digit, HP
   - Q5d Kawasan (pilih), Q6a NIB, Q7a Badan Usaha, Q7d Laporan
   - Q8 Pengusaha (nama, JK, umur 17-120, NIK 16 digit)
   - Q9 Kegiatan + KBLI (cari "Warung" pilih 1)
   - Q10a Jaringan, Q12 Internet, Q13-Q19 isi radio
   - Q20 pekerja, Q21 tahun, Q22-Q25 nominal (Q25 sum = 100%)
   - Blok II Lokasi GPS, Blok III Petugas, Responden, Tanggal, **Tanda tangan**
3. Klik **Rekap** → tab Error harus kosong
4. Klik **KIRIM**
5. ✅ **Cek di spreadsheet**: row baru di sheet `SE2026_Responses`
6. ✅ **Cek di `daftar.html`**: badge orange `L.UB`, nama perusahaan terisi

### TEST 3 — Ganti Mode ke L (Rumah Tangga)

1. Buka `index.html` (sesi baru — bisa logout/login ulang atau hapus `localStorage.cawi_form_mode`)
2. ✅ Modal mode gate muncul lagi → pilih **L (Rumah Tangga)**
3. ✅ Sidebar berubah: tampil "BLOK I (Keluarga & Anggota) / II (Usaha) / III (Perumahan) / IV (Catatan) / V (Petugas)"
4. Badge sidebar atas harus biru bertulisan **"L"**

### TEST 4 — L Mode: Anggota Dinamis

1. Di Blok I, isi `Jumlah Anggota Keluarga = 3`
2. ✅ 3 anggota card otomatis ter-generate (tiap card collapsible "A. Identitas" + "B. Sosial Ekonomi")
3. Di sidebar Blok I, scroll → harus muncul daftar "↳ Anggota #1, #2, #3" — klik salah satu untuk auto-scroll

### TEST 5 — L Mode: STOP State

1. Pada Anggota #2, pilih **r9a Keberadaan = 2 (Meninggal)**
2. ✅ Cek visual:
   - Card #2 muncul badge merah **"STOP — Meninggal"**
   - Sub-section setelah r9a (alamat domisili, sosek, disabilitas) **hilang**
3. Ulang dengan nilai 6 (Pisah KK) dan 7 (Tidak Ditemukan) — badge text harus update sesuai

### TEST 6 — L Mode: Age-gated Fields

Anggota #1, set **tgl lahir berbeda** dan amati:

| Tanggal Lahir | Umur Auto | r14 (sekolah) | r15 (ijazah) | r16 (profesi) | r19 (rekening) | r20–21 (disab/kronis) |
|---|---|---|---|---|---|---|
| 2024-01-01 | 1 | tersembunyi | tersembunyi | tersembunyi | tersembunyi | tersembunyi |
| 2020-01-01 | 5 | **muncul** | **muncul** | tersembunyi | **muncul** | **muncul** |
| 2010-01-01 | 15 | muncul | muncul | **muncul** | muncul | muncul |

✅ Field umur autofill, ✅ visibilitas wraps sesuai threshold (≥5 dan ≥10)

### TEST 7 — L Mode: Pindah Domisili

1. Anggota #3, pilih **r9a Keberadaan = 3 (Pindah Dalam Negeri)**
2. ✅ Field `Provinsi Domisili (DN)` + `Kab/Kota` muncul; field `Negara LN` **tetap hidden**
3. Ganti ke nilai 4 (Pindah LN) → DN hidden, **Negara LN muncul**

### TEST 8 — L Mode: Submit Lengkap

1. Isi minimal:
   - **Blok I**: Nama KK, NIK KK 16-digit, No KK 16-digit, alamat lengkap, kodepos 5-digit, 1 anggota lengkap (dewasa umur ≥10) — termasuk profesi, kedudukan, 18a/b/c
   - **Blok II**: Nama Usaha, alamat, jenis usaha radio, NIB radio (boleh "tidak ada" + alasan), badan usaha, pengusaha lengkap, kegiatan utama, KBLI, pekerja L/P, tahun operasi (mis. 2020 → tahunan section muncul), isi y26-y29 (modal y29 sum = 100%)
   - **Blok III**: jenis bangunan, status milik, semua bahan/kondisi/BAB/listrik/air, makanan/non-makanan, **10 aset bergerak & tidak bergerak (boleh 0)**
   - **Blok IV**: catatan (opsional)
   - **Blok V**: petugas nama, responden lengkap, tanggal, **tanda tangan**
2. Klik **Rekap** → tab Error harus kosong (warning OK)
3. Klik **KIRIM**
4. ✅ **Cek spreadsheet**:
   - Sheet `SE2026_L_Responses` baru terbuat (header biru) → row baru
   - Sheet `SE2026_L_Anggota` baru terbuat → 1 row per anggota non-STOP
5. ✅ **Cek `daftar.html`**: entri baru dengan **badge biru "L"**, nama KK terisi
6. ✅ **Cek folder Drive**: `CAWI_SE2026_L_TTD` → file `TTD_L_<nama>_<ts>.png` tersimpan

### TEST 9 — Daftar: Filter & View

1. Buka `daftar.html` → login `Daftar08!`
2. ✅ Tampil 2 entri (L.UB dari TEST 2 + L dari TEST 8) dengan kolom **"Jenis"** berisi badge
3. Filter **Jenis Pendataan = L** → hanya record L tersisa
4. Filter **= L.UB** → hanya record L.UB tersisa
5. Search "Budi" (nama KK L) → ✅ record L tampil
6. Klik 👁️ **View** pada record L → section "Anggota Keluarga (1)" + "Perumahan & Aset" tampil

### TEST 10 — Draft Save & Restore

1. Buka `index.html` mode L → isi sebagian (nama KK, 2 anggota)
2. Klik **Simpan Draft**
3. ✅ Toast hijau "Draft tersimpan" muncul, ✅ entri di daftar dengan badge L
4. Refresh `index.html` (atau logout/login) → buka daftar → klik ▶️ **Lanjutkan** pada draft
5. ✅ Kembali ke index dengan mode L ter-restore, anggota card ter-render dari draft

### TEST 11 — Hapus Record

1. Di `daftar.html`, hapus record L (klik 🗑️ pada baris badge L)
2. ✅ Record hilang dari daftar
3. ✅ **Cek spreadsheet**: row hilang dari `SE2026_L_Responses`, anggota-anggotanya hilang dari `SE2026_L_Anggota` (cascade delete)

### TEST 12 — Apps Script Logs (Troubleshooting)

Jika ada submit gagal:
1. Buka Apps Script editor → **Executions** (icon jam di sidebar kiri)
2. Klik execution yang failed → cek error log
3. Common issues:
   - `Cannot read properties of undefined` — payload format salah; cek Console browser → Network tab → request body
   - `Permission denied` — re-deploy dengan "Execute as: Me, Who has access: Anyone"
   - Sheet baru tidak terbuat — `SHEET_ID` salah; cek konstanta di Apps Script

---

## Password Default

Password aktif diambil dari sheet `CAWI_Config`. Jika belum dikonfigurasi (sheet baru), aplikasi fall back ke:

| Akses | Password Fallback |
|---|---|
| Formulir (kuesioner) | `Kuesioner08!` |
| Daftar Entri | `Daftar08!` |
| Panel Admin | `Admin08!` |

> ⚠️ **Segera ganti** lewat `admin.html` setelah duplikasi. Perubahan disimpan ke Google Sheets sebagai SHA-256 hash dan langsung berlaku untuk semua perangkat.

> Password deployment **asli BPS Buleleng** tidak tercantum — hubungi pengelola proyek asal.

---

## Cara Kerja Penyimpanan

### Layer 1 — Google Sheets (sumber kebenaran)
- **SE2026_Responses** — entri L.UB, satu baris per usaha; col 117 (`Data Cabang JSON`) sebagai backup raw cabang
- **SE2026_LKP** — flat: satu baris per kantor cabang; linked via `Record ID`
- **SE2026_L_Responses** — entri L (rumah tangga), satu baris per record; col `Anggota Data (JSON)` backup raw
- **SE2026_L_Anggota** — flat: satu baris per anggota; linked via `Record ID`
- **CAWI_Config** — key/value SHA-256 hash password
- **Drive Folders** — `CAWI_SE2026_TTD` (L.UB) dan `CAWI_SE2026_L_TTD` (L) menyimpan PNG tanda tangan

### Layer 2 — Browser Storage
- **sessionStorage** — status login (`cawi_auth_v1`, `cawi_daftar_auth`, `cawi_admin_auth`) — bersih saat tab ditutup
- **localStorage**:
  - `cawi_form_mode` → `'lub'` atau `'l'`
  - `cawi_se2026_draft_v1` → draft kuesioner aktif (raw values)
  - `cawi_se2026_drafts_v1` → daftar semua draft tersimpan
  - `cawi_edit_mode` → record yang sedang di-edit (dari halaman daftar)
  - `cawi_draft_continue_id` → ID draft yang sedang dilanjutkan
  - `cawi_script_url_override` → URL Apps Script kustom (per device)

---

## Pencarian KBLI 2025

Formulir pakai kamus KBLI 2025 (`master/kbli.json`, 1520 entri) dengan algoritma berbasis skor:

| Field | Bobot |
|---|---|
| Kode exact match | 100 |
| Kode prefix | 80 |
| Judul exact | 90 |
| Judul prefix/contains | 45–60 |
| Uraian contains/word overlap | 12–20 |

Hasil top-15 ditampilkan dengan uraian + kategori.

---

## Troubleshooting

| Masalah | Solusi |
|---|---|
| Modal mode gate tidak muncul | `localStorage.removeItem('cawi_form_mode')` lalu reload |
| Anggota card tidak muncul setelah isi jumlah | Cek Console → harus tidak ada error `STATIC_PROFESI undefined` (cek tag `<script src="data-profesi.js">` di index.html) |
| Badge L/L.UB tidak tampil di daftar | Hard refresh **Ctrl+Shift+R** untuk reload JS terbaru; cek `getRecordMode(records[0])` di Console |
| Sheet L tidak terbuat saat submit | Cek Apps Script Executions → kemungkinan error `Cannot read formMode` → pastikan deployment versi terbaru |
| Tanda tangan L tidak masuk Drive | Cek folder `CAWI_SE2026_L_TTD` di Drive akun yang deploy Apps Script — buat manual jika permission Drive belum diberi |
| Submit gagal — Apps Script error 403 | Deploy ulang Web App dengan **Who has access: Anyone** |
| KBLI search tidak ada hasil | Pastikan `master/kbli.json` ikut ter-upload ke hosting |
| Hapus L record menghapus L.UB | Pastikan frontend versi terbaru (kirim `formMode` di delete payload) — re-deploy frontend |
| Password tidak dikenali | Pastikan online (hash dari sheet); reload halaman; fallback default tersedia jika sheet kosong |
