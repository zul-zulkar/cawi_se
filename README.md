# CAWI SE2026 — BPS Buleleng

Aplikasi web formulir pendataan **Sensus Ekonomi 2026** berbasis CAWI (Computer Assisted Web Interviewing). Mendukung **dua jenis kuesioner**: usaha/perusahaan besar (L.UB) dan usaha rumah tangga (L). Data dikirim ke Google Sheets via Google Apps Script.

---

## Versi

**v2.1 — Design System Refresh + UX Polish**

Fitur utama (kumulatif sejak v1.0):

### Inti pendataan
- **Pre-selector modal** saat login — pilih jenis pendataan: **Usaha/Perusahaan Besar (L.UB)** atau **Rumah Tangga (L)**
- **Kuesioner SE2026-L** lengkap dalam 5 Blok: Keluarga & Anggota, Usaha, Perumahan & Aset, Catatan, Petugas/Responden
- **Kuesioner SE2026 L.UB** lengkap dengan dukungan L.KP (kantor cabang dinamis hingga 50 unit)
- **Anggota keluarga dinamis** (max 30) dengan **STOP-state** (Meninggal/Pisah KK/Tidak Ditemukan) dan **age-gated fields** (≥5 untuk sekolah/ijazah/rekening/disabilitas, ≥10 untuk profesi/pendapatan)
- **187 kode profesi** SE2026-L (`js/data/profesi.js`)
- **Dual sheet routing** otomatis: `SE2026_Responses` + `SE2026_LKP` untuk L.UB; `SE2026_L_Responses` + `SE2026_L_Anggota` untuk L
- **Mata uang** format Indonesia 2 desimal: `1.234.567,89`
- **KBLI 2025** scored search (1520 entri) — bobot kode/judul/uraian
- **KBLI conditional** — Field Halal (L.UB Q15, L Q19) & BPOM (L.UB Q16, L Q20) otomatis muncul/tersembunyi berdasarkan `master/KBLI Halal.csv` (386 kode) & `master/KBLI BPOM.csv` (94 kode)
- **L Q14a = 6 (Unit Pembantu/Penunjang)** → pendataan otomatis selesai: hanya kantor pusat info + langsung ke BLOK V untuk submit

### UX & desain
- **Bootstrap Icons** (v1.11) untuk semua icon — konsisten lintas halaman
- **Topbar desktop sticky** dengan Submit + Rekap & Periksa di tiap halaman
- **Mobile topbar** dengan hamburger + Petunjuk + Rekap + Submit
- **Sidebar Ganti Kuesioner** tombol prominent + auto-refresh ke BLOK I mode baru
- **25 tombol Petunjuk** terstruktur (Termasuk/Tidak Termasuk/Catatan) di field-field penting L.UB & L Blok II
- **Smooth animations** untuk expand/collapse, blok transitions, modal in/out
- **Loading spinner** di gate password + submit overlay (cycle saat hash dimuat)
- **Atur Tampilan** modal dengan font size, kerapatan, tipografi, palet warna (5 pilihan), kontras tinggi, auto-save interval
- **Scroll offset** otomatis di bawah topbar agar pertanyaan yang diklik dari sidebar tidak tertutup

### Infrastruktur
- **Halaman Daftar** dengan badge berwarna (orange `L.UB` / biru `L`) dan filter "Jenis Pendataan"
- **Draft auto-save** + restore lengkap dengan `_formMode`, tanda tangan terpisah per mode
- **GPS geolokasi** dengan map preview, password gate dengan SHA-256 hash, panel admin terpisah
- **535 unit test** (47 baru: KBLI filters, settings, loading helpers)

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
├── index.html              # Formulir isian utama (L.UB + L mode-switch, AUTO-GENERATED)
├── daftar.html             # Dashboard rekap entri data (badge L.UB/L + filter mode)
├── admin.html              # Panel admin (password, sheet URL, pegawai)
├── README.md               # Dokumentasi (file ini)
├── package.json            # Scripts: build:html, test, coverage
├── netlify.toml            # Konfigurasi deployment Netlify
├── vitest.config.js        # Konfigurasi unit-test runner
│
├── server/
│   └── google-apps-script.js   # Backend Apps Script (dual-sheet routing) — copy ke script.google.com
│
├── master/
│   ├── kbli.json               # Kamus KBLI 2025 (1520 entri)
│   ├── KBLI Halal.csv          # 386 kode KBLI eligible Sertifikasi Halal (Q15/Q19 trigger)
│   ├── KBLI BPOM.csv           # 94 kode KBLI eligible Izin Edar BPOM (Q16/Q20 trigger)
│   └── kuesioner/              # PDF + extracted text SE2026-L/L.UB/L.KP sumber
│
├── src/
│   └── index/                  # Partial HTML — gabungkan via `npm run build:html`
│       ├── 01-head.html        # <head> + Leaflet/Bootstrap Icons/font + CSS link
│       ├── 02-gates.html       # Password gate + Mode pre-selector
│       ├── 03-shell-open.html  # Mobile topbar + sidebar overlay
│       ├── 04-sidebar.html     # Sidebar (L.UB + L navigation + Ganti Kuesioner + Actions)
│       ├── 05-main-open.html   # Desktop topbar + header-kop + blok-nav
│       ├── 06-form-lub.html    # Form L.UB lengkap (3 Blok, dengan Petunjuk Q5e/13/14/19/20/22/23)
│       ├── 07-11 form-l-blok*.html  # L Blok I–V (Petunjuk di Blok II Q8/9/13/17/18/23/24/26/27/30/31)
│       ├── 12-shell-close.html # Close form-container + footer
│       ├── 13-modals.html      # Petunjuk + Recap + Leave-guard + Settings (Atur Tampilan) + Submit Loading
│       ├── 14-scripts.html     # <script> tags (urutan loading)
│       └── 15-end.html         # </body></html>
│
├── tools/
│   └── build-html.js           # Concat src/index/*.html → index.html (no deps)
│
├── css/
│   ├── core/                   # Token + primitive lintas halaman
│   │   ├── design-tokens.css   # CSS variables (palet, ink, rule, shadow, type, radii) + animasi global
│   │   └── design-system.css   # Primitif: .pill, .badge, .ds-btn, .ds-card, modal, toast
│   ├── index/                  # CSS spesifik halaman kuesioner
│   │   ├── base.css            # Reset, utility (.hidden, .alert, .spinner)
│   │   ├── layout.css          # Header-kop, sidebar, blok-nav, footer, mobile-topbar
│   │   ├── components.css      # Form fields, autocomplete, KBLI, signature, lokasi
│   │   ├── modals.css          # Petunjuk, recap, leave-guard, pw-gate, mode-gate
│   │   ├── form-l.css          # L mode: anggota card, mode-aware containers
│   │   ├── design-overrides.css # Override legacy class dengan design tokens
│   │   └── design-features.css # Topbar, settings modal, loading overlay, smooth UX, scroll offset
│   ├── daftar/
│   │   ├── index.css           # Base styling dashboard
│   │   └── design.css          # Design overrides (tabel, filter, modal view/confirm)
│   └── admin/
│       ├── index.css           # Base styling panel admin
│       └── design.css          # Design overrides (gate, kartu, status row, button family)
│
└── js/
    ├── config.js               # DEFAULT_SCRIPT_URL Apps Script
    │
    ├── data/                   # Master data lokal
    │   ├── regional.js         # STATIC_KABUPATEN, STATIC_KECAMATAN, STATIC_KELURAHAN Bali
    │   └── profesi.js          # 187 kode profesi SE2026-L
    │
    ├── auth/                   # Gate password (loading spinner cycle)
    │   ├── auth.js             # Kuesioner password + wobble on error
    │   ├── auth-daftar.js      # Daftar password
    │   └── auth-admin.js       # Admin password
    │
    ├── form-lub/               # L.UB (Usaha Besar)
    │   ├── form.js             # Handler radio, kalkulasi, validasi L.UB
    │   ├── form-progress.js    # calcProgress dispatcher (L.UB default)
    │   └── form-validation.js  # collectAllProblems dispatcher (L.UB default)
    │
    ├── form-l/                 # L (Rumah Tangga)
    │   ├── form-l.js           # Anggota dinamis, STOP-state, age-gated, L Q14a=6 end-of-survey
    │   ├── form-l-progress.js  # calcProgressL
    │   └── form-l-validation.js # collectAllProblemsL
    │
    ├── pages/                  # Bootstrap per halaman
    │   ├── index-init.js       # DOMContentLoaded — wire mode gate, anggota init
    │   ├── daftar-main.js      # Dashboard + filter + badge + view L/L.UB
    │   └── admin-main.js       # Panel admin
    │
    └── shared/                 # Util & komponen lintas halaman
        ├── utils.js            # SHA-256, esc(), fmtDate()
        ├── form-mode.js        # Mode L.UB/L (storage, switch, auto-refresh to BLOK I)
        ├── ui.js               # makeSearchable(), goBlok() (mode-aware), updateDeskTopbar()
        ├── map.js              # Geolokasi
        ├── regional.js         # loadProvinsi/Kecamatan/Kelurahan
        ├── kbli.js             # Pencarian KBLI 2025 (scored)
        ├── kbli-filters.js     # Halal/BPOM conditional show/hide based on KBLI selection
        ├── petugas.js          # Data & dropdown pegawai
        ├── draft.js            # Auto-save & restore (_formMode + TTD L)
        ├── submit.js           # collectData/collectDataL, mode-aware submit & edit
        ├── settings.js         # Atur Tampilan: fontSize/density/font/palette/contrast/hints/autosave
        ├── loading.js          # showLoadingOverlay(), setButtonLoading(), showToast()
        └── backup.js           # Helper export/import lokal
```

### Filosofi struktur

**Root minim** — hanya 3 HTML entry-point + config (package, netlify, vitest) + README. Semua data, kode, dan style ada di subfolder fungsional.

**CSS dipisah `core/` vs per-halaman** — `core/design-tokens.css` + `core/design-system.css` di-load di semua 3 halaman. Per-halaman folder berisi base style + design overrides yang men-cascade di atas tokens.

**JS modular per fungsi**:
- `data/` — static lookup tables
- `auth/`, `pages/`, `forms/` — masing-masing punya entry point sendiri
- `shared/` — utility yang dipakai 2+ halaman
- `config.js` di root `js/` untuk runtime URL config

**`server/`** — file Apps Script (`google-apps-script.js`) yang di-copy-paste ke script.google.com saat deployment. Bukan client-side code.

### Build pipeline

`index.html` dihasilkan dari partial-partial di `src/index/`:

```bash
npm run build:html        # Concat → tulis ulang index.html
```

⚠️ **Jangan edit `index.html` secara langsung** — perubahan akan ditimpa saat build berikutnya. Edit partial yang relevan di `src/index/`, lalu jalankan `npm run build:html`.

Banner peringatan auto-generated dimasukkan otomatis di puncak file output.

---

## Menjalankan Test Suite

Proyek ini dilengkapi **535 unit test** dengan [Vitest](https://vitest.dev/).

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
 Test Files  15 passed (15)
      Tests  535 passed (535)
   Duration  ~1s
```

### Cakupan Test
```
tests/unit/
├── utils.test.js            # esc(), fmtDate(), sha256()
├── validators.test.js       # isValidHP(), isValidEmail(), parseCurrency()
├── kbli.test.js             # getKategoriFromKode(), scoreKBLI(), dll.
├── kbli-filters.test.js     # ⭐ NEW — Halal/BPOM CSV load + apply() show/hide (16 test)
├── kabupaten.test.js        # STATIC_KABUPATEN integrity (Bali, dll.)
├── draft.test.js            # getDraftList(), deleteDraftById()
├── form-progress.test.js    # calcProgress L.UB (~75 test)
├── form-validation.test.js  # collectAllProblems L.UB (~130 test)
├── form-mode.test.js        # getFormMode/setFormMode/applyFormMode (15 test)
├── settings.test.js         # ⭐ NEW — defaults, restore, palette tinting (17 test)
├── loading.test.js          # ⭐ NEW — setButtonLoading, showLoadingOverlay, showToast (14 test)
├── anggota-card.test.js     # STOP-state, age-gated, template (33 test)
├── form-l-progress.test.js  # calcProgressL (32 test)
├── form-l-validation.test.js# collectAllProblemsL (47 test)
└── daftar-render.test.js    # filter mode + badge logic (16 test)
```

Fungsi-fungsi browser script dimuat ke konteks test via `new Function()` + mock DOM minimal — **tidak ada perubahan pada source file** dan tidak ada runtime browser yang dibutuhkan.

### Lapisan test (deep)

1. **Pure utilities** (`utils`, `validators`) — input/output deterministik
2. **Lookup tables** (`kabupaten`, `kbli`) — integritas data dan helper scoring
3. **State machines** (`form-mode`, `draft`) — transitions + side effects via mocked DOM
4. **Form logic** (`form-progress`, `form-validation`, `form-l-*`, `anggota-card`) — branching ratusan kasus
5. **Layout dependencies** (`daftar-render`) — render filter + badge logic
6. **UX modules** (`settings`, `loading`, `kbli-filters`) — preferensi user, loading state, conditional fields

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
2. Hapus isi `Code.gs`, paste seluruh isi [`server/google-apps-script.js`](server/google-apps-script.js)
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

### 5. Sesuaikan Data Wilayah, Profesi & Pegawai
- **Data wilayah** (kecamatan, kelurahan, kabupaten) di [`js/data/regional.js`](js/data/regional.js) — edit sesuai wilayah BPS Anda
- **Daftar profesi** di [`js/data/profesi.js`](js/data/profesi.js)
- **KBLI conditional list** di [`master/KBLI Halal.csv`](master/KBLI%20Halal.csv) dan [`master/KBLI BPOM.csv`](master/KBLI%20BPOM.csv) — edit sesuai aturan terbaru
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
2. Login dengan password `Kuesioner08!` — ✅ tombol Masuk menampilkan spinner cycle saat hash dimuat
3. ✅ **Cek**: Modal **"Pilih Jenis Pendataan"** muncul dengan 2 tombol (L.UB / L)
4. Buka DevTools Console → ketik `localStorage.getItem('cawi_form_mode')` → harus `null`
5. Pilih **L.UB (Usaha/Perusahaan Besar)** → modal hilang
6. Cek lagi `localStorage.getItem('cawi_form_mode')` → harus `"lub"`
7. ✅ Topbar desktop menampilkan judul + tombol Submit/Rekap

### TEST 2 — L.UB Submit (Regression)

1. Lanjut dari TEST 1 (mode L.UB)
2. Isi minimal field wajib (lihat petunjuk per field — klik tombol 💡 **Petunjuk** untuk struktur Termasuk/Tidak Termasuk)
3. Pilih KBLI yang **ada di Halal.csv** (mis. `10120` Daging) → ✅ Q15 (Halal) & Q16 (BPOM) tetap terlihat
4. Pilih KBLI yang **tidak ada di kedua list** (mis. `99999` jika diset) → ✅ Q15 & Q16 tersembunyi otomatis
5. Klik **Rekap & Periksa** di topbar → tab Error harus kosong
6. Klik **Submit** → overlay loading dengan spinner muncul
7. ✅ **Cek di spreadsheet**: row baru di sheet `SE2026_Responses`
8. ✅ **Cek di `daftar.html`**: badge orange `L.UB`, nama perusahaan terisi

### TEST 3 — Ganti Mode (auto-refresh)

1. Klik **Ganti Kuesioner** di sidebar (kartu oranye)
2. ✅ Modal "Pilih Jenis Pendataan" muncul; pilih **L (Rumah Tangga)**
3. ✅ Tanpa perlu klik sidebar — kuesioner **langsung berpindah** ke BLOK I mode L
4. ✅ Toast hijau: "Kuesioner diganti ke L (Rumah Tangga)"
5. ✅ Sidebar berubah: tampil "BLOK I (Keluarga) / II (Usaha) / III (Perumahan) / IV (Catatan) / V (Petugas)"
6. ✅ Badge sidebar atas: biru "L"

### TEST 4 — L Mode: Q14a kode 6 (Pendataan Selesai)

1. Di Blok II, isi Q14a Jaringan = **6. Unit Pembantu/Penunjang**
2. ✅ Notice amber muncul: "PENDATAAN SELESAI" + tombol "Lanjut ke BLOK V"
3. ✅ Section Q16–Q33 di Blok II otomatis tersembunyi
4. ✅ Sidebar BLOK III & IV di-dim (tidak bisa diklik)
5. Klik tombol **Lanjut ke BLOK V** → langsung pindah ke tanda tangan & submit

### TEST 5 — L Mode: Anggota Dinamis + STOP State + Age-gated

1. Di Blok I, isi `Jumlah Anggota Keluarga = 3` → ✅ 3 anggota card ter-generate
2. Klik link anggota di sidebar → ✅ scroll dengan offset di bawah topbar (tidak tertutup)
3. Pada Anggota #2, pilih `r9a Keberadaan = 2 (Meninggal)`
4. ✅ Card #2 badge merah "STOP — Meninggal"; sub-section sosek hilang
5. Atur tanggal lahir Anggota #1 → ✅ r14/r15/r19/r20-21 muncul saat umur ≥5, r16/r17 muncul saat umur ≥10

### TEST 6 — Petunjuk Toggle

1. Pada Q9 form-l Blok II (Jenis Usaha) → klik tombol **💡 Petunjuk**
2. ✅ Box expand smooth dengan struktur:
   - **Termasuk** (hijau, checkmark) — 6 klasifikasi jenis usaha
   - **Catatan** (background cream) — aturan kode 1-2 vs 3-6
3. Klik lagi → ✅ tombol berubah jadi ✕ "Tutup Petunjuk" (hitam), box collapse smooth

### TEST 7 — Atur Tampilan (Settings)

1. Klik **Atur Tampilan** di sidebar
2. ✅ Modal muncul dengan 7 row + tombol Reset/Selesai
3. Ubah Palet warna ke **Navy** → ✅ semua aksen oranye berubah biru navy live
4. Toggle **Tampilkan keterangan field** off → ✅ hint italic oranye sembunyi
5. Ubah Ukuran teks ke **Besar** → ✅ font scale up
6. Tutup modal → reload halaman → ✅ pengaturan persistent
7. Klik **Reset** → ✅ confirm → kembali ke default

### TEST 8 — Mobile Topbar

1. Resize browser ke <880px atau buka di HP
2. ✅ Sidebar tersembunyi, hamburger menu muncul
3. ✅ Topbar mobile menampilkan: hamburger + CAWI SE2026 + ❓Petunjuk + 🔍Rekap + 📤**Submit** (pojok kanan; bukan tombol Keluar)
4. Klik hamburger → ✅ sidebar slide in

### TEST 9 — KBLI Conditional (Halal/BPOM)

1. Di L Blok II, pilih KBLI `10120` (Pengolahan Daging — di Halal + BPOM)
2. ✅ Section L Q19 (Halal) dan L Q20 (BPOM) tetap terlihat
3. Ganti KBLI ke `41011` (Konstruksi — tidak di kedua list)
4. ✅ Section L Q19 dan L Q20 otomatis tersembunyi
5. Ganti KBLI ke kode yang hanya di Halal.csv (mis. `01111` Pertanian Jagung)
6. ✅ Hanya L Q19 (Halal) terlihat; L Q20 (BPOM) tersembunyi

### TEST 10 — Submit & Daftar

1. Submit dari Blok V → ✅ overlay loading muncul dengan spinner cycle
2. Buka `daftar.html` → ✅ entri tampil dengan badge biru "L"
3. Filter Jenis Pendataan = L → ✅ hanya record L
4. Hapus record → ✅ row + anggota cascade-delete di spreadsheet

### TEST 11 — Sidebar Dropdown Overlay

1. Di Blok I, klik dropdown **Kecamatan** (searchable select)
2. ✅ Dropdown muncul **di atas** section card berikutnya (tidak tertutup)
3. Pilih satu kecamatan → ✅ dropdown menutup, value terisi

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
  - `cawi_settings_v1` → preferensi Atur Tampilan (font, density, palette, autosave)

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

Hasil top-15 ditampilkan dengan uraian + kategori. Setelah pemilihan, `js/shared/kbli-filters.js` otomatis menentukan apakah field Halal & BPOM perlu ditampilkan berdasarkan CSV master.

---

## Design System

### Token (`css/core/design-tokens.css`)
Semua warna, shadow, radius, dan tipografi terdefinisi sebagai CSS variable. Mengganti palette di Atur Tampilan memperbarui token live tanpa reload — semua komponen (tombol, kartu, banner, badge) ikut menyesuaikan.

### Primitif (`css/core/design-system.css`)
- `.pill`, `.badge`, `.ds-btn`, `.ds-card`, `.toast`, `.modal-backdrop`
- Variant: `.primary`, `.danger`, `.ghost`, `.outline-*`
- Animasi: `fadeIn`, `fadeUp`, `scaleIn`, `wobble`, `spin`

### Icon Framework
**Bootstrap Icons v1.11** via CDN (`<link>` di semua 3 halaman). Klas `<i class="bi bi-<name>"></i>` — lihat [icons.getbootstrap.com](https://icons.getbootstrap.com) untuk daftar.

Contoh penggunaan di sidebar: `bi-floppy-fill` (Simpan Draft), `bi-gear-fill` (Atur Tampilan), `bi-info-circle-fill` (Petunjuk), `bi-search` (Rekap), `bi-card-list` (Daftar), `bi-box-arrow-left` (Keluar).

---

## Troubleshooting

| Masalah | Solusi |
|---|---|
| Modal mode gate tidak muncul | `localStorage.removeItem('cawi_form_mode')` lalu reload |
| Anggota card tidak muncul setelah isi jumlah | Cek Console → harus tidak ada error `STATIC_PROFESI undefined` (cek tag `<script src="js/data/profesi.js">` di index.html) |
| Badge L/L.UB tidak tampil di daftar | Hard refresh **Ctrl+Shift+R** untuk reload JS terbaru; cek `getRecordMode(records[0])` di Console |
| Sheet L tidak terbuat saat submit | Cek Apps Script Executions → kemungkinan error `Cannot read formMode` → pastikan deployment versi terbaru |
| Tanda tangan L tidak masuk Drive | Cek folder `CAWI_SE2026_L_TTD` di Drive akun yang deploy Apps Script — buat manual jika permission Drive belum diberi |
| Submit gagal — Apps Script error 403 | Deploy ulang Web App dengan **Who has access: Anyone** |
| KBLI search tidak ada hasil | Pastikan `master/kbli.json` ikut ter-upload ke hosting |
| Halal/BPOM section selalu tampil/hilang | Cek `master/KBLI Halal.csv` & `KBLI BPOM.csv` ter-upload; cek di Console `kbliFilters.halalSize()` & `bpomSize()` |
| Hapus L record menghapus L.UB | Pastikan frontend versi terbaru (kirim `formMode` di delete payload) — re-deploy frontend |
| Password tidak dikenali | Pastikan online (hash dari sheet); reload halaman; fallback default tersedia jika sheet kosong |
| Icon Bootstrap tidak muncul | Pastikan CDN `cdn.jsdelivr.net/npm/bootstrap-icons` terjangkau; cek Console untuk error 404 di link CSS |
| Atur Tampilan tidak persistent | Cek `localStorage.getItem('cawi_settings_v1')` di Console; clear data lalu reload jika korup |
| Dropdown Kecamatan tertutup section berikutnya | Hard refresh untuk memuat CSS `design-features.css` terbaru — fix via `.section-card:has(.ss-dropdown.open) { z-index: 250 }` |
