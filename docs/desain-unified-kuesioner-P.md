# Desain Teknis — Unified Assignment: Kuesioner P + L/L.UB/L.KP (Satu Halaman)

> Status: **DESAIN** (belum implementasi). Membangun di atas hasil plan-mode
> (`~/.claude/plans/reactive-purring-brooks.md`) + eksplorasi panduan
> `master/kuesioner/05 Pemutakhiran Kuesioner P SE2026 1.0.pdf`.
>
> **Revisi penting vs plan awal:** Arsitektur bukan lagi "P = roster banyak entri".
> Model final: **1 assignment = 1 bangunan/entitas = 1 kuesioner gabungan** (P → L atau
> P → L.UB ± L.KP) dalam **satu `kuesioner.html`**, blok tampil berurutan, sidebar dinamis.

---

## 0. Ringkasan Arsitektur

```
Portal (index.html)
   └─ assignment { jenis: "UNIFIED", ... }  (1 bangunan/keluarga)
        │  ?draft=<key>&mode=UNIFIED
        ▼
kuesioner.html  (SATU halaman, blok berurutan)
   ┌─────────────────────────────────────────────────────────────┐
   │ BLOK P (Pemutakhiran)  — selalu tampil pertama               │
   │   identitas wilayah · nama · alamat · keberadaan ·           │
   │   GEOTAGGING · jumlah usaha · KODE PENGGUNAAN BANGUNAN ◄─gate │
   └─────────────────────────────────────────────────────────────┘
        │  (setelah field penentu diisi → sidebar reveal blok lanjutan)
        ├─ tempat tinggal + ada usaha   →  BLOK L (I..V)        → submit formMode 'l'   → SE2026_L_Responses
        ├─ khusus usaha / campuran      →  BLOK L.UB (I..III)   → submit formMode 'lub' → SE2026_Responses
        │     └─ + status kantor pusat  →  BLOK L.KP (opsional) → submit (lkp_data)     → SE2026_LKP
        └─ bukan tempat tinggal/usaha   →  (hanya P)
   semua →  BLOK P di-submit sendiri → SE2026_P_Responses

Submit terpisah & berurutan: P → (L | L.UB) → L.KP. Masing-masing punya record_id sendiri.
Identitas pendata (petugas_email_login) di-inject hidden ke SEMUA collectData*().
```

### Gate Logic (Blok P → kuesioner lanjutan)
Field penentu utama: **`pmt_kode_bangunan`** (Kode Penggunaan Bangunan, kode 1–8 dari panduan),
dibantu **`pmt_jml_usaha`** (jumlah usaha) & **`pmt_skala`** (UMKM/UB, bila ada dari prelist).

| Kode bangunan | Kondisi | Blok lanjutan | Catatan panduan |
|---|---|---|---|
| 3 Tempat Tinggal | `pmt_jml_usaha` > 0 | **L** (I–V: keluarga + usaha) | sosek keluarga + usaha rumah tangga |
| 3 Tempat Tinggal | `pmt_jml_usaha` = 0 | **L** (keluarga saja, blok usaha kosong) | pemutakhiran sosek tetap jalan |
| 2 Campuran | — | **L** atau **L.UB** (lihat `pmt_skala`) | panduan: keluarga+usaha; user: condong L.UB bila usaha formal |
| 1 Khusus Usaha / 7 Virtual Office | skala UMKM | **L** (blok usaha) | SE2026-L untuk usaha non-UB |
| 1 Khusus Usaha / 7 Virtual Office | skala UB | **L.UB** | + L.KP bila kantor pusat/jaringan |
| usaha/perusahaan = **Kantor pusat** (`q10a`=2) | — | **+ L.KP** (roster cabang) **nested di dalam entri usaha tsb, di dalam assignment** | per-entri usaha, BUKAN blok level-form; gate = jaringan usaha "Kantor pusat" |
| 4 Ibadah/Organisasi · 5 Pemerintah/sekolah · 6 Tdk dicakup · 8 Panti/lapas | — | **(P saja)** | hanya listing; 8 isi PIC |

> ⚠️ **Reconciliation note:** keputusan user ("khusus usaha/campuran → L.UB; tempat tinggal+usaha → L")
> disederhanakan. Panduan membedakan **skala UB vs non-UB**, bukan murni jenis bangunan. Desain ini
> membuat gate **berbasis tabel/config** (`PMT_GATE_RULES`) agar mudah disetel saat ada kepastian.
> Untuk UB, panduan menyebut petugas door-to-door cukup keberadaan+geotag (L.UB oleh PPL-UB) — perlu
> diputuskan apakah app tetap menampilkan L.UB penuh atau hanya P. **Open question G-1.**

---

## A. Perubahan File

| Action | File | Alasan |
|---|---|---|
| **CREATE** | `src/index/06b-form-p.html` | Partial blok Kuesioner P (tampil pertama). Disisipkan sebelum form L.UB/L. |
| **CREATE** | `js/form-p/form-p.js` | Handler Blok P: gate logic, reveal blok lanjutan, geotag init, prefill prelist. |
| **CREATE** | `js/form-p/form-p-validation.js` | `collectAllProblemsP()` — validasi field P. |
| **CREATE** | `js/form-p/form-p-progress.js` | `calcProgressP()` — progress blok P. |
| **CREATE** | `tests/unit/form-p-validation.test.js` | Test validasi P. |
| **CREATE** | `tests/unit/form-p-progress.test.js` | Test progress P. |
| **CREATE** | `tests/unit/form-p-consistency.test.js` | P ↔ collectDataP ↔ P_HEADERS. |
| **CREATE** | `tests/unit/sidebar-dynamic.test.js` | Gate logic → blok mana yang muncul. |
| **CREATE** | `tests/unit/unified-assignment.test.js` | Backward-compat + jenis UNIFIED. |
| **MODIFY** | `src/index/02-gates.html` | Hapus `#modeGate` pre-selector (mode ditentukan runtime oleh P). Sisakan password gate. |
| **MODIFY** | `src/index/04-sidebar.html` | Tambah grup `.sb-p` (selalu tampil). Grup `.sb-l`/`.sb-lub`/`.sb-lkp` jadi *hidden by default*, di-reveal oleh gate. |
| **MODIFY** | `src/index/06-form-lub.html` | Pindahkan blok "Lokasi Kunjungan" (geotag) KELUAR ke Blok P. Tambah anchor L.KP (Fase 1 sudah roster). |
| **MODIFY** | `src/index/11-form-l-blok5.html` | (opsional) sinkron identitas petugas auto-fill. |
| **MODIFY** | `src/index/14-scripts.html` | Load `js/form-p/*.js`. |
| **MODIFY** | `src/index/01b-assignment-guard.html` | `mode=UNIFIED`; prefill P; fetch prelist; submit-success multi-record. |
| **MODIFY** | `js/shared/form-mode.js` | Model mode: `mode-unified` + sub-stage (`stage-l`/`stage-lub`). `getFormMode()` derivasi dari gate. Hapus auto `showModeGate`. |
| **MODIFY** | `js/shared/ui.js` | `goBlok(n)` dukung prefix P (`blokP{n}`) + stage L/L.UB; `updateDeskTopbar` judul P. |
| **MODIFY** | `js/shared/submit.js` | `collectDataP()` baru; inject `petugas_email_login` ke semua collect; submit P/L/L.UB/L.KP terpisah berurutan; pindah geotag ke P. |
| **MODIFY** | `js/pages/index-init.js` | Init Blok P, sidebar dinamis trigger, prefill identitas, hash/screen integrasi. |
| **MODIFY** | `js/pages/petugas.js` | `createAssignment()` jenis `"UNIFIED"`; field `p_jenis_bangunan`,`p_status`; backward-compat baca "L"/"L.UB". |
| **MODIFY** | `index.html` | Buat assignment jenis UNIFIED; buka `mode=UNIFIED`; (opsional) migrasi tampilan assignment lama. |
| **MODIFY** | `daftar.html` / `js/pages/daftar-main.js` | Tampilkan 3 jenis record (P, L/L.UB, L.KP) + badge. |
| **MODIFY** | `server/google-apps-script.js` | Sheet `SE2026_P_Responses` + `P_HEADERS`/`P_FIELD_NAMES` + `buildRowP`; routing `formMode==='p'`; kolom `petugas_email_login` di semua sheet; geotag pindah ke P. |
| **NO CHANGE** | `js/form-l/*.js`, `js/form-lub/form*.js` (logika isi) | Konten L/L.UB dipertahankan; hanya dipanggil dari shell unified. |
| **DELETE (Fase 6)** | `_kuesioner_P_extract.txt` | File sementara hasil ekstrak PDF. |

---

## B. Struktur File Baru

| Komponen | Path | Isi |
|---|---|---|
| Partial HTML Blok P | `src/index/06b-form-p.html` | `<div class="blok-panel active" id="blokP1">…</div>` (+ blokP2 bila perlu). Berisi field `pmt_*` + UI geotag (pindahan dari L.UB). |
| Handler P | `js/form-p/form-p.js` | `initFormP()`, `handlePmtKodeBangunan()`, `applyGateP()`, `revealStage(stage)`, `seedPrelistP(data)`. |
| Validasi P | `js/form-p/form-p-validation.js` | `collectAllProblemsP()` → `{errors,warnings,kosong}` (pola L). |
| Progress P | `js/form-p/form-p-progress.js` | `calcProgressP()` → `{pct,filled,total}`. |
| collectDataP | **di `js/shared/submit.js`** (bukan file baru) | konsisten dgn `collectData()`/`collectDataL()` yang sudah di submit.js. |
| Sidebar dinamis | **di `js/pages/index-init.js`** (+ helper di `form-p.js`) | `refreshDynamicSidebar(stage)`. Tidak buat file baru. |
| GAS sheet P | `server/google-apps-script.js` | `P_SHEET_NAME="SE2026_P_Responses"`, `P_HEADERS`, `P_FIELD_NAMES`, `buildRowP(d)`, `getOrInitPSheet()`. |

### P_HEADERS (usulan kolom SE2026_P_Responses)
`Timestamp · CAWI ID · Petugas Email (login) · No Urut Keluarga · No Urut Bangunan ·
Nama KK/Bangunan · Alamat (jalan/blok) · Provinsi..Desa (+kode) · Kode SLS · Nama SLS ·
Perubahan SLS (R108) · Nama SLS Baru (R109) · Keberadaan · Sesuai KK · Kode Penggunaan Bangunan ·
Skala (UMKM/UB) · Jumlah Usaha · IDSBR · Jumlah Anggota (KK) · Jumlah Anggota Menetap (R515) ·
Latitude · Longitude · Akurasi (m) · Jenis Lanjutan (L/LUB/none) · Record ID Lanjutan`

---

## C. Field Prefix Convention — Blok P

**Prefix: `pmt_`** (PeMuTakhiran). **TIDAK boleh `p_`** karena bentrok dgn field petugas L.UB
existing (`p_nama`, `p_nip`, `p_hp`).

| Field | id |
|---|---|
| Perubahan SLS (R108) | `pmt_sls_berubah` |
| Nama SLS / Non-SLS (R109) | `pmt_sls_nama` |
| Nama KK / Bangunan | `pmt_nama` |
| Keberadaan keluarga/bangunan | `pmt_keberadaan` |
| Alamat domisili = KK? | `pmt_sesuai_kk` |
| Alamat nama jalan / blok | `pmt_jalan` / `pmt_blok` |
| No urut keluarga / bangunan | `pmt_no_kel` / `pmt_no_bgn` |
| **Kode penggunaan bangunan (GATE)** | `pmt_kode_bangunan` |
| Skala usaha (UMKM/UB) | `pmt_skala` |
| Jumlah usaha (GATE) | `pmt_jml_usaha` |
| IDSBR | `pmt_idsbr` |
| Jumlah anggota (KK) / menetap | `pmt_jml_kk` / `pmt_jml_menetap` |
| Geotag (pindah dari L.UB) | `pmt_lat` / `pmt_lng` / `pmt_akurasi` |

> Cek konflik: `pmt_*` tidak bentrok dengan `l1_/l2_/l3_/l4_/l5_`, `q1..q25`/`lkp_*`, `lokasi_*`.
> Field geotag lama `lokasi_lat/lng/akurasi` (L.UB) → **dipindah** jadi `pmt_lat/lng/akurasi`
> (UI `ambilLokasi()` di `map.js` disesuaikan id target-nya, atau diparametrisasi).

---

## D. Sidebar Dinamis — Pseudocode

```js
// js/pages/index-init.js (+ helper di form-p.js)

// Dipanggil saat: (1) DOMContentLoaded, (2) input/change pada pmt_kode_bangunan / pmt_jml_usaha,
//                 (3) restore draft, (4) q10a (kantor pusat) berubah → toggle L.KP.
function refreshDynamicSidebar() {
  const stage = computeStageFromP();   // 'none' | 'l' | 'lub'
  const showLKP = stage === 'lub' && getRadio('q10a') === '2'; // punya jaringan/cabang

  // P selalu tampil
  document.querySelectorAll('.sb-p').forEach(el => el.classList.remove('hidden'));
  // Reset semua lanjutan → hidden
  document.querySelectorAll('.sb-l, .sb-lub, .sb-lkp').forEach(el => el.classList.add('hidden'));

  if (stage === 'l')   document.querySelectorAll('.sb-l').forEach(el => el.classList.remove('hidden'));
  if (stage === 'lub') document.querySelectorAll('.sb-lub').forEach(el => el.classList.remove('hidden'));
  if (showLKP)         document.querySelectorAll('.sb-lkp').forEach(el => el.classList.remove('hidden'));

  setActiveStage(stage); // set body class stage-l/stage-lub agar goBlok() pakai prefix benar
}

function computeStageFromP() {
  const kode  = getVal('pmt_kode_bangunan');
  const jml   = parseInt(getVal('pmt_jml_usaha')) || 0;
  const skala = getVal('pmt_skala'); // 'ub' | 'umkm' | ''
  return PMT_GATE_RULES(kode, jml, skala); // tabel gate (lihat §0)
}
```

**Kapan blok lanjutan ditambahkan:** segera setelah `pmt_kode_bangunan` (dan `pmt_jml_usaha`
untuk kode 2/3) terisi — via listener `oninput/onchange`.

**Bisa disembunyikan lagi?** **Ya — dengan data dipertahankan (G-2 resolved).** Jika user
mengubah `pmt_kode_bangunan` sehingga stage berubah, blok lama **disembunyikan tapi isian TIDAK
dihapus** (tersimpan di DOM + draft). Tidak ada `confirm()`/reset. Jika user balik ke pilihan
semula, blok & datanya muncul kembali utuh. (Hindari `disabled` agar nilai tetap ikut tersubmit
hanya bila stage-nya aktif; saat submit, hanya stage aktif yang dikirim.)

---

## E. Perubahan Guard (`01b-assignment-guard.html`)

1. **URL param:** `?draft=<key>&mode=UNIFIED`. Terima juga `mode=L|LUB` lama (backward-compat) →
   diperlakukan sebagai unified dgn stage terkunci ke L/L.UB (skip Blok P opsional, atau P read-only).
2. **Prefill UNIFIED (`buildPrefillVals`)**: isi field P dari assignment + wilayah:
   `pmt_nama`=`nama_responden`, wilayah `pmt_*` dari kode wilayah, SLS dari `sls_*`.
   Identitas: set `petugas_email_login` (hidden) dari `sessionStorage['cawi_petugas_aktif'].email`,
   dan `p_nama`/`l5_petugas_nama` dari `petugas_nama`.
3. **Fetch prelist:** saat pertama buka, panggil GAS `getPrelist(sls_kd/assignment)` →
   seed field P (nama prelist, IDSBR, alamat). (Async; tampilkan loading overlay seperti Bali regional.)
4. **Submit-success multi-record:** event `cawi:submit-success` kini punya `detail.part` =
   `'p' | 'l' | 'lub' | 'lkp'`. Guard menyimpan `record_id` ke field assignment yang sesuai
   (`record_id_p`, `record_id_l`/`record_id_lub`, `record_id_lkp`) & update `p_status`.
   **Redirect ke portal HANYA setelah submit terakhir** (L.KP bila ada, else L/L.UB, else P-only).
   Draft per-assignment **tidak dihapus** sampai seluruh bagian wajib tersubmit.

---

## F. Backward Compatibility

- **Assignment lama** (`jenis:"L"` / `"L.UB"`): tetap bisa dibuka.
  - `petugas.js`/guard: jika `jenis` ∈ {L,LUB} → buka langsung di stage tsb, Blok P disembunyikan
    atau ditandai "pemutakhiran lama (skip)". `getFormMode()` mengembalikan l/lub seperti dulu.
  - Tidak ada migrasi destruktif. Field `p_jenis_bangunan`/`p_status` default `null`/`"open"`.
- **Migration script di portal:** **tidak wajib**. Assignment baru dibuat `jenis:"UNIFIED"`.
  Opsional: tombol "tandai sbg UNIFIED" untuk assignment lama (low priority).
- **Sheet:** `SE2026_Responses`, `SE2026_L_Responses`, `SE2026_LKP` **tetap dipakai apa adanya**.
  Hanya **tambah** sheet `SE2026_P_Responses` + **tambah kolom** `Petugas Email (login)` di sheet
  lama (append di akhir → tidak menggeser kolom existing; backward-safe).
- **Draft key:** pola sama `cawi_draft_<uuid>` / `cawi_l_draft_<uuid>`. Untuk UNIFIED gunakan
  satu key (mis. `cawi_u_draft_<uuid>`) menampung P+L/L.UB+L.KP dalam satu objek draft.
  Restore mendeteksi `_formMode`/stage dari isi draft.

---

## G. Testing Plan

**`form-p-validation.test.js`** (pola `form-l-validation.test.js`, inject `getVal/getRadio`):
- field wajib P (nama, keberadaan, kode bangunan, geotag lat/lng) → error saat kosong.
- `pmt_kode_bangunan` ∈ {4,5,6,8} → tidak wajib field L/L.UB.
- keberadaan kode 4/5 → cukup geotag+foto, sisanya skip (STOP-state).
- `pmt_jml_usaha` numerik ≥ 0.

**`form-p-progress.test.js`**: `calcProgressP()` numeric; field terisi → filled++; STOP-state kurangi total.

**`form-p-consistency.test.js`**: setiap field wajib P ada di validation ∧ progress ∧ `collectDataP()` (scan submit.js) ∧ `P_HEADERS`/`P_FIELD_NAMES` (scan GAS). Pola `form-l-consistency.test.js`.

**`sidebar-dynamic.test.js`** (gate):
- kode 3 + jml_usaha>0 → stage 'l'; sidebar `.sb-l` visible, `.sb-lub` hidden.
- kode 1 skala ub → stage 'lub'; `.sb-lub` visible (+ `.sb-lkp` saat q10a=2).
- kode 4/5/6/8 → stage 'none'; hanya `.sb-p`.
- ubah kode 3→1 saat ada data L → konfirmasi & reset.

**`unified-assignment.test.js`**:
- `createAssignment({jenis:'UNIFIED',...})` → object valid + `p_status:'open'`, `p_jenis_bangunan:null`.
- assignment lama `{jenis:'L'}` & `{jenis:'L.UB'}` → tetap valid (backward-compat, `canViewAssignment` dll tak rusak).
- draft UNIFIED round-trip (P+L) tersimpan & ter-restore.

**Regression:** seluruh 734 tes existing tetap hijau (`npm test`); `npm run build:html` sukses.

---

## Open Questions — RESOLVED (2026-06-04)
- **G-1 ✅ TAMPILKAN L.UB PENUH.** Untuk skala UB, app tetap menampilkan blok L.UB lengkap (bukan hanya P+geotag). Gate `PMT_GATE_RULES`: khusus usaha/campuran/VO → L.UB penuh.
- **G-2 ✅ SIMPAN TERSEMBUNYI.** Saat `pmt_kode_bangunan` diganti & blok lanjutan sudah berisi data → blok **disembunyikan tapi data DIPERTAHANKAN** (reversible, tanpa konfirmasi hapus). Draft tetap menyimpan field tersembunyi. Stage aktif ditentukan gate; field stage non-aktif tetap ada di DOM/draft.
- **G-3 ✅ PRELIST MINIMAL.** `getPrelist` saat ini cukup mengembalikan: **domisili wilayah** (prov/kab/kec/desa + SLS), **nama** (bangunan/usaha/keluarga), **skala usaha** (UMKM/UB). Field lain (IDSBR, alamat detail) opsional/menyusul.
- **G-4 ✅ FALLBACK YA.** `petugas_email_login` dibaca dari `sessionStorage['cawi_petugas_aktif'].email`; bila kosong (tab baru) → fallback `__cawiActiveAssignment.petugas_email`. Sama untuk nama & peran.
- **G-5 ✅ YA.** Submit P-standalone diizinkan (kode 4–8) → assignment langsung "submitted".

## Urutan Eksekusi (selaras fase plan)
Fase 0 (identitas+geotag, **sedang jalan**) → Fase 1 (L.KP roster) → Fase 2 (GAS P + getPrelist) →
Fase 3 (shell P + sidebar dinamis + hapus gate) → Fase 4 (field P + gate + multi-submit) →
Fase 5 (portal UNIFIED + daftar) → Fase 6 (tes + build + redeploy + cleanup).
