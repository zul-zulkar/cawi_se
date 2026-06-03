# CAWI SE2026 — BPS

Aplikasi web formulir **Sensus Ekonomi 2026** berbasis CAWI (Computer Assisted Web Interviewing). Mendukung dua jenis kuesioner: **L.UB** (usaha/perusahaan besar) dan **L** (rumah tangga). Data dikirim ke Google Sheets via Google Apps Script.

Repo ini dirancang agar BPS daerah lain bisa **duplikasi dengan cepat** — cukup ganti backend Sheet, data wilayah, dan password.

---

## Cara Pakai Cepat (Demo)

Endpoint default sudah aktif (sandbox publik). Buka `index.html` di browser — halaman utama adalah **Portal Petugas**: login, pilih petugas, lalu kelola/buka assignment. Kuesioner hanya dapat dibuka melalui assignment.

| Akses | Password Default |
|---|---|
| Portal Petugas (`index.html`) | `Kuesioner08!` |
| Daftar (`daftar.html`) | `Daftar08!` |
| Admin (`admin.html`) | `Admin08!` |

> Kuesioner berada di `kuesioner.html` dan dilindungi guard: hanya bisa dibuka via `?draft=<key>&mode=L|LUB` yang cocok dengan assignment milik petugas login.

> ⚠️ Endpoint default menulis ke sheet publik — hanya untuk demo. Untuk operasi resmi, ikuti **Duplikasi** di bawah.

---

## Duplikasi untuk Daerah Lain

### 1. Salin repo

```bash
git clone <repo-url>
cd cawi_se
```

### 2. Siapkan Backend (Google Sheets + Apps Script)

1. Buat Google Sheet baru, catat **SHEET_ID** dari URL.
2. Buka [script.google.com](https://script.google.com) → **New Project**.
3. Hapus isi `Code.gs`, paste seluruh isi `server/google-apps-script.js`.
4. Ganti `SHEET_ID` di baris paling atas dengan ID milik Anda.
5. **Deploy → New Deployment → Web App**:
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Salin **Web app URL** (yang berakhir `/exec`).

Tab `SE2026_Responses`, `SE2026_LKP`, `SE2026_L_Responses`, `SE2026_L_Anggota`, dan `CAWI_Config` akan dibuat otomatis saat submit pertama.

### 3. Hubungkan URL ke Aplikasi

**Cara cepat** — buka `admin.html` → login → kartu **Sumber Data Google Sheet** → paste URL → Simpan.
URL disimpan di `localStorage` per-perangkat.

**Cara permanen** — edit `js/config.js`:

```javascript
const DEFAULT_SCRIPT_URL = "https://script.google.com/macros/s/.../exec";
```

### 4. Sesuaikan Data Lokal

| Apa | File |
|---|---|
| Wilayah (kabupaten/kecamatan/kelurahan) | `js/data/regional.js` |
| Daftar profesi | `js/data/profesi.js` |
| KBLI Halal / BPOM | `master/KBLI Halal.csv`, `master/KBLI BPOM.csv` |
| Daftar pegawai | Lewat panel admin (kartu *Daftar Pegawai*) |
| Password | Lewat panel admin (langsung ke Google Sheets sebagai hash) |

### 5. Deploy

- **Netlify**: import repo → biarkan build kosong → Deploy.
- **GitHub Pages**: Settings → Pages → Source `main / (root)`.
- **Hosting mandiri**: upload semua folder (`js/`, `css/`, `master/`, dll.) ke web server statis.

---

## Struktur Singkat

```
cawi_se/
├── index.html        # Portal Petugas (hand-written) — halaman utama
├── kuesioner.html    # Formulir kuesioner (auto-generated dari src/index/*)
├── daftar.html       # Dashboard rekap entri (admin)
├── admin.html        # Panel admin
├── petugas.html      # Alias redirect ke index.html (backward compat)
├── server/           # Google Apps Script (backend)
├── master/           # KBLI 2025 + Halal/BPOM CSV
├── src/index/        # Partial HTML — gabungkan via `npm run build:html`
├── css/              # core/ (token+primitif) + per-halaman
├── js/               # config, data, auth, form-lub, form-l, pages, shared
├── tests/            # Unit test (Vitest)
└── tools/            # build-html.js
```

> Jangan edit `kuesioner.html` langsung — perubahan ditimpa saat build. Edit di `src/index/*.html` lalu jalankan `npm run build:html`. File `index.html` adalah portal hand-written dan **tidak** di-generate oleh build script.

---

## Testing

```bash
npm install
npm test
```

535 unit test dengan Vitest. Tidak perlu browser — modul dimuat via `new Function()` + mock DOM minimal.

---

## Changelog

### v2.1 — Design Refresh & UX Polish
- **Design system** baru — token warna/font, palet 5 pilihan (orange/navy/forest/graphite/burgundy), kontras tinggi
- **Topbar sticky** desktop + mobile dengan Submit & Rekap; mobile menukar Keluar → Submit
- **Atur Tampilan** modal (font size, density, palette, hints, autosave) — persistent di `localStorage`
- **Loading UX** — spinner cycle saat verifikasi password, overlay saat submit, smooth animations
- **KBLI conditional** — field Halal & BPOM otomatis muncul/sembunyi berdasarkan `master/KBLI Halal.csv` & `KBLI BPOM.csv`
- **L Q14a = 6** (Unit Pembantu/Penunjang) → pendataan otomatis selesai, langsung ke BLOK V
- **25 tombol Petunjuk** terstruktur di field-field kritikal L.UB & L Blok II
- **Bootstrap Icons** v1.11 menggantikan emoji/SVG inline
- **Reorganisasi file** — CSS ke `css/core/` + per-halaman, data ke `js/data/`, Apps Script ke `server/`
- **+47 unit test** baru (kbli-filters, settings, loading) — total 535

### v2.0 — Dual Mode (L.UB + L)
- Tambah kuesioner **SE2026-L** (rumah tangga) berdampingan dengan **L.UB**
- **Mode gate** saat login untuk memilih jenis pendataan
- **Anggota dinamis** (max 30) dengan STOP-state & age-gated fields
- Dual-sheet routing: `SE2026_L_Responses` + `SE2026_L_Anggota`

---

## Lisensi & Kontak

Dibuat untuk internal BPS. Untuk pertanyaan tentang deployment asli (password, endpoint produksi), hubungi pengelola proyek asal.
