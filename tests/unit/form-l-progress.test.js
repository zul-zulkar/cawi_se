import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT   = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const SOURCE = readFileSync(resolve(ROOT, 'js/form-l/form-l-progress.js'), 'utf8')

function mockEl(value = '', { hidden = false, kbliHidden = false } = {}) {
  return {
    value,
    classList: {
      contains: cls =>
        (cls === 'hidden' && hidden) || (cls === 'kbli-hidden' && kbliHidden),
    },
    closest: () => null,
  }
}

// Bangun _usahaDataStore dari fields/radios yang memiliki prefix l2_
// agar tests Blok II lama tetap bekerja tanpa perubahan.
// Selalu mengembalikan minimal 1 entry (kosong jika tidak ada l2_* values)
// agar progress slots Blok II ikut dihitung (sama seperti sebelum refactor).
function buildUsahaStore(fields, radios) {
  const obj = {}
  Object.keys(fields).forEach(k  => { if (k.startsWith('l2_'))  obj[k]           = fields[k];  })
  Object.keys(radios).forEach(k  => { if (k.startsWith('l2_'))  obj['_r_' + k]   = radios[k];  })
  return [obj]  // always 1 entry
}

function makeCalc({ fields = {}, radios = {}, elements = {}, l5HasSig = false, usahaStore = null } = {}) {
  const noop = () => {}
  const dom  = { ...elements }
  const mockDoc = {
    getElementById:   id  => dom[id] ?? null,
    querySelectorAll: ()  => ({ forEach: noop }),
    addEventListener: noop,
    createElement:    ()  => ({}),
  }
  // Inject _usahaDataStore — either explicit or auto-built from l2_* fields/radios
  const store = usahaStore !== null ? usahaStore : buildUsahaStore(fields, radios)
  const fn = new Function(
    'document', 'window',
    'getVal', 'getRadio',
    'isValidHP', 'isValidEmail',
    'l5HasSig',
    '_usahaDataStore', '_activeUsahaIdx', '_collectL2Fields',
    `${SOURCE}\nreturn { calcProgressL };`
  )
  return fn(
    mockDoc, { addEventListener: noop },
    id    => String(fields[id]  ?? ''),
    name  => String(radios[name] ?? ''),
    hp    => /^(\+62|62|0)[0-9]{8,13}$/.test(hp.replace(/[\s-]/g, '')),
    email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
    l5HasSig,
    store, null, null
  ).calcProgressL
}

const calc = (opts = {}) => makeCalc(opts)()

// ─── BASELINE ───────────────────────────────────────────────────────────────

describe('calcProgressL() — baseline', () => {
  it('returns numeric pct, filled, total', () => {
    const r = calc()
    expect(typeof r.pct).toBe('number')
    expect(typeof r.filled).toBe('number')
    expect(typeof r.total).toBe('number')
  })

  it('empty form has filled=0 and total >= 50 (baseline includes Blok I+II+III+V)', () => {
    const r = calc()
    expect(r.filled).toBe(0)
    expect(r.total).toBeGreaterThanOrEqual(50)
  })

  it('pct equals Math.round(filled / total * 100)', () => {
    const r = calc({ fields: { l1_nama_kk: 'Budi' } })
    expect(r.pct).toBe(Math.round(r.filled / r.total * 100))
  })

  it('pct is between 0 and 100 inclusive', () => {
    const r = calc()
    expect(r.pct).toBeGreaterThanOrEqual(0)
    expect(r.pct).toBeLessThanOrEqual(100)
  })
})

// ─── BLOK I: Keluarga header ─────────────────────────────────────────────────

describe('calcProgressL() — Blok I keluarga header', () => {
  it('nama_kk filled increments filled by 1', () => {
    const base = calc()
    const r = calc({ fields: { l1_nama_kk: 'Budi Santoso' } })
    expect(r.filled).toBe(base.filled + 1)
  })

  it('NIK KK requires 16 digits — 15 not enough', () => {
    const r = calc({ fields: { l1_nik_kk: '123456789012345' } })
    expect(r.filled).toBe(0)
  })

  it('NIK KK 16 digits counts', () => {
    const base = calc()
    const r = calc({ fields: { l1_nik_kk: '1234567890123456' } })
    expect(r.filled).toBe(base.filled + 1)
  })

  it('No KK requires 16 digits', () => {
    const base = calc()
    const r = calc({ fields: { l1_no_kk: '1234567890123456' } })
    expect(r.filled).toBe(base.filled + 1)
  })

  it('jml_kk_anggota >0 & <=30 counts', () => {
    const base = calc()
    const r = calc({ fields: { l1_jml_kk_anggota: '4' } })
    expect(r.filled).toBe(base.filled + 1)
  })

  it('jml_kk_anggota=0 does not count', () => {
    const r = calc({ fields: { l1_jml_kk_anggota: '0' } })
    expect(r.filled).toBe(0)
  })

  it('jml_kk_anggota=31 does not count (capped at 30)', () => {
    const r = calc({ fields: { l1_jml_kk_anggota: '31' } })
    expect(r.filled).toBe(0)
  })

  it('alamat provinsi/kab/kec/kel each count separately', () => {
    const base = calc()
    const r = calc({ fields: {
      l1_alamat_provinsi: '51', l1_alamat_kab: '5108',
      l1_alamat_kec: '510801', l1_alamat_kel: '5108010001',
    }})
    expect(r.filled).toBe(base.filled + 4)
  })

  it('klasifikasi (radio) counts', () => {
    const base = calc()
    const r = calc({ radios: { l1_klasifikasi: '1' } })
    expect(r.filled).toBe(base.filled + 1)
  })

  it('kode pos requires 5 digits', () => {
    const base = calc()
    const r = calc({ fields: { l1_kodepos: '80361' } })
    expect(r.filled).toBe(base.filled + 1)
    const r2 = calc({ fields: { l1_kodepos: '803' } })
    expect(r2.filled).toBe(0)
  })

  it('sesuai_kk (radio) counts', () => {
    const base = calc()
    const r = calc({ radios: { l1_sesuai_kk: '1' } })
    expect(r.filled).toBe(base.filled + 1)
  })
})

// ─── BLOK I: Per Anggota ────────────────────────────────────────────────────

describe('calcProgressL() — per anggota', () => {
  it('total grows with jml_kk_anggota', () => {
    const r1 = calc({ fields: { l1_jml_kk_anggota: '1' } })
    const r2 = calc({ fields: { l1_jml_kk_anggota: '2' } })
    expect(r2.total).toBeGreaterThan(r1.total)
  })

  it('STOP-state anggota (keberadaan=2) reduces per-anggota total', () => {
    const r1 = calc({ fields: { l1_jml_kk_anggota: '1' } })
    const r2 = calc({
      fields: { l1_jml_kk_anggota: '1' },
      radios: { 'l_ang_1_keberadaan': '2' },
    })
    expect(r2.total).toBeLessThan(r1.total)
  })

  it('STOP-state via keberadaan=6 reduces total', () => {
    const r2 = calc({
      fields: { l1_jml_kk_anggota: '1' },
      radios: { 'l_ang_1_keberadaan': '6' },
    })
    const rA = calc({ fields: { l1_jml_kk_anggota: '1' }, radios: { 'l_ang_1_keberadaan': '1' } })
    expect(r2.total).toBeLessThan(rA.total)
  })

  it('STOP-state via keberadaan=7 reduces total', () => {
    const r2 = calc({
      fields: { l1_jml_kk_anggota: '1' },
      radios: { 'l_ang_1_keberadaan': '7' },
    })
    const rA = calc({ fields: { l1_jml_kk_anggota: '1' }, radios: { 'l_ang_1_keberadaan': '1' } })
    expect(r2.total).toBeLessThan(rA.total)
  })

  it('keberadaan=3 (pindah DN) adds dn_provinsi requirement', () => {
    const r = calc({
      fields: { l1_jml_kk_anggota: '1' },
      radios: { 'l_ang_1_keberadaan': '3' },
    })
    const r2 = calc({
      fields: { l1_jml_kk_anggota: '1', 'l_ang_1_dn_provinsi': '51' },
      radios: { 'l_ang_1_keberadaan': '3' },
    })
    expect(r2.filled).toBe(r.filled + 1)
  })

  it('keberadaan=4 (pindah LN) adds ln_negara requirement', () => {
    const r = calc({
      fields: { l1_jml_kk_anggota: '1' },
      radios: { 'l_ang_1_keberadaan': '4' },
    })
    const r2 = calc({
      fields: { l1_jml_kk_anggota: '1', 'l_ang_1_ln_negara': 'Singapore' },
      radios: { 'l_ang_1_keberadaan': '4' },
    })
    expect(r2.filled).toBe(r.filled + 1)
  })

  // ── alamat_dom: hanya wajib saat keb=1 ──────────────────────────────────
  it('keberadaan=1 requires alamat_dom (tinggal di rumah ini)', () => {
    const r1 = calc({ fields: { l1_jml_kk_anggota: '1' }, radios: { 'l_ang_1_keberadaan': '1' } })
    const r2 = calc({
      fields: { l1_jml_kk_anggota: '1' },
      radios: { 'l_ang_1_keberadaan': '1', 'l_ang_1_alamat_dom': '1' },
    })
    expect(r2.filled).toBe(r1.filled + 1)
  })

  it('keberadaan=3 does NOT require alamat_dom (not at this address)', () => {
    const rKeb1 = calc({
      fields: { l1_jml_kk_anggota: '1' },
      radios: { 'l_ang_1_keberadaan': '1' },
    })
    const rKeb3 = calc({
      fields: { l1_jml_kk_anggota: '1' },
      radios: { 'l_ang_1_keberadaan': '3' },
    })
    // keb=3 total should be lower by 1 (no alamat_dom slot, but has dn_provinsi slot)
    // The key point: filling alamat_dom for keb=3 adds nothing
    const rKeb3WithDom = calc({
      fields: { l1_jml_kk_anggota: '1' },
      radios: { 'l_ang_1_keberadaan': '3', 'l_ang_1_alamat_dom': '1' },
    })
    expect(rKeb3WithDom.filled).toBe(rKeb3.filled) // alamat_dom not counted for keb=3
  })

  it('keberadaan=5 does NOT require alamat_dom (anggota baru)', () => {
    const r = calc({ fields: { l1_jml_kk_anggota: '1' }, radios: { 'l_ang_1_keberadaan': '5' } })
    const rWithDom = calc({
      fields: { l1_jml_kk_anggota: '1' },
      radios: { 'l_ang_1_keberadaan': '5', 'l_ang_1_alamat_dom': '1' },
    })
    expect(rWithDom.filled).toBe(r.filled) // no extra
  })

  // ── sekolah/ijazah/rekening ──────────────────────────────────────────────
  it('age >= 5 adds sekolah + ijazah + rekening requirements (3 fields)', () => {
    const rUnder5 = calc({ fields: { l1_jml_kk_anggota: '1', 'l_ang_1_umur': '3' } })
    const r5plus  = calc({ fields: { l1_jml_kk_anggota: '1', 'l_ang_1_umur': '7' } })
    expect(r5plus.total).toBe(rUnder5.total + 3)
  })

  it('sekolah=0 (tidak pernah sekolah): ijazah slot removed', () => {
    const rSekolah0 = calc({
      fields: { l1_jml_kk_anggota: '1', 'l_ang_1_umur': '7' },
      radios: { 'l_ang_1_sekolah': '0' },
    })
    const rSekolah1 = calc({
      fields: { l1_jml_kk_anggota: '1', 'l_ang_1_umur': '7' },
      radios: { 'l_ang_1_sekolah': '1' },
    })
    // sekolah=0 removes ijazah slot (-1 total)
    expect(rSekolah0.total).toBe(rSekolah1.total - 1)
  })

  it('sekolah=0 filled counts +1, but ijazah filling adds nothing extra', () => {
    const base = calc({
      fields: { l1_jml_kk_anggota: '1', 'l_ang_1_umur': '7' },
      radios: { 'l_ang_1_sekolah': '0' },
    })
    const withIjazah = calc({
      fields: { l1_jml_kk_anggota: '1', 'l_ang_1_umur': '7' },
      radios: { 'l_ang_1_sekolah': '0', 'l_ang_1_ijazah': '3' },
    })
    expect(withIjazah.filled).toBe(base.filled) // ijazah not in total for sekolah=0
  })

  // ── profesi/kedudukan ────────────────────────────────────────────────────
  it('age >= 10 adds profesi + kedudukan + 18a/18b/18c requirements (5 fields)', () => {
    const r5  = calc({ fields: { l1_jml_kk_anggota: '1', 'l_ang_1_umur': '7' } })
    const r10 = calc({ fields: { l1_jml_kk_anggota: '1', 'l_ang_1_umur': '12' } })
    expect(r10.total).toBe(r5.total + 5)
  })

  it('profesi=000 (tidak bekerja): kedudukan slot removed', () => {
    const rProf000 = calc({
      fields: { l1_jml_kk_anggota: '1', 'l_ang_1_umur': '12', 'l_ang_1_profesi': '000' },
    })
    const rProfOth = calc({
      fields: { l1_jml_kk_anggota: '1', 'l_ang_1_umur': '12', 'l_ang_1_profesi': '075' },
    })
    // profesi=000 removes kedudukan slot (-1 total)
    expect(rProf000.total).toBe(rProfOth.total - 1)
  })

  it('profesi=000 filled counts +1, but kedudukan filling adds nothing extra', () => {
    const base = calc({
      fields: { l1_jml_kk_anggota: '1', 'l_ang_1_umur': '12', 'l_ang_1_profesi': '000' },
    })
    const withKed = calc({
      fields: { l1_jml_kk_anggota: '1', 'l_ang_1_umur': '12', 'l_ang_1_profesi': '000' },
      radios: { 'l_ang_1_kedudukan': '1' },
    })
    expect(withKed.filled).toBe(base.filled) // kedudukan not in total for profesi=000
  })

  it('multiple anggota: STOP for some, age-gated for others', () => {
    const r = calc({
      fields: {
        l1_jml_kk_anggota: '3',
        'l_ang_1_umur': '30', 'l_ang_2_umur': '6', 'l_ang_3_umur': '70',
      },
      radios: {
        'l_ang_1_keberadaan': '1',
        'l_ang_2_keberadaan': '2',  // STOP
        'l_ang_3_keberadaan': '1',
      },
    })
    expect(r.total).toBeGreaterThan(0)
  })

  it('caps anggota at 30', () => {
    const r = calc({ fields: { l1_jml_kk_anggota: '50' } })
    expect(r.total).toBeLessThan(2000)
  })
})

// ─── BLOK II: Usaha ─────────────────────────────────────────────────────────

describe('calcProgressL() — Blok II Usaha', () => {
  it('nama_usaha counts', () => {
    const base = calc()
    const r = calc({ fields: { l2_nama_usaha: 'Warung Bu Budi' } })
    expect(r.filled).toBe(base.filled + 1)
  })

  it('kawasan=10 (luar) does not require nama_kawasan', () => {
    const base = calc()
    const r = calc({ radios: { l2_kawasan: '10' } })
    expect(r.filled).toBe(base.filled + 1)
  })

  it('kawasan=1 (in kawasan) requires nama_kawasan too', () => {
    const r1 = calc({ radios: { l2_kawasan: '1' } })
    const r2 = calc({ radios: { l2_kawasan: '1' }, fields: { l2_nama_kawasan: 'KEK Mandalika' } })
    expect(r2.filled).toBe(r1.filled + 1)
  })

  it('NIB=1 requires 13-digit NIB number', () => {
    const r1 = calc({ radios: { l2_punya_nib: '1' } })
    const r2 = calc({ radios: { l2_punya_nib: '1' }, fields: { l2_nib: '1234567890123' } })
    expect(r2.filled).toBe(r1.filled + 1)
    const r3 = calc({ radios: { l2_punya_nib: '1' }, fields: { l2_nib: '12345' } })
    expect(r3.filled).toBe(r1.filled)
  })

  it('NIB=2 requires nib_alasan radio', () => {
    const r1 = calc({ radios: { l2_punya_nib: '2' } })
    const r2 = calc({ radios: { l2_punya_nib: '2', l2_nib_alasan: '3' } })
    expect(r2.filled).toBe(r1.filled + 1)
  })

  it('nib_alasan=5 (lainnya) requires text field', () => {
    const r1 = calc({ radios: { l2_punya_nib: '2', l2_nib_alasan: '5' } })
    const r2 = calc({
      radios: { l2_punya_nib: '2', l2_nib_alasan: '5' },
      fields: { l2_nib_alasan_lain: 'Kompleksitas administrasi' },
    })
    expect(r2.filled).toBe(r1.filled + 1)
  })

  it('pengusaha_umur in range 17-120 counts', () => {
    const base = calc()
    const r = calc({ fields: { l2_pengusaha_umur: '35' } })
    expect(r.filled).toBe(base.filled + 1)
  })

  it('pengusaha_umur < 17 does not count', () => {
    const r = calc({ fields: { l2_pengusaha_umur: '15' } })
    expect(r.filled).toBe(0)
  })

  it('pengusaha_nik 16 digits counts', () => {
    const base = calc()
    const r = calc({ fields: { l2_pengusaha_nik: '1234567890123456' } })
    expect(r.filled).toBe(base.filled + 1)
  })

  it('b1=1 b2=2 path requires input/proses (manufacturing)', () => {
    const r1 = calc({ radios: { l2_b1: '1', l2_b2: '2' } })
    const r2 = calc({
      radios: { l2_b1: '1', l2_b2: '2' },
      fields: { l2_input: 'tepung', l2_proses: 'membakar' },
    })
    expect(r2.filled).toBe(r1.filled + 2)
  })

  it('b2=1 path requires lokasi c', () => {
    const r1 = calc({ radios: { l2_b2: '1' } })
    const r2 = calc({ radios: { l2_b2: '1', l2_c: '4' } })
    expect(r2.filled).toBe(r1.filled + 1)
  })

  it('b1=2 b2=2 b3=2 path requires b4', () => {
    const r1 = calc({ radios: { l2_b1: '2', l2_b2: '2', l2_b3: '2' } })
    const r2 = calc({ radios: { l2_b1: '2', l2_b2: '2', l2_b3: '2', l2_b4: '1' } })
    expect(r2.filled).toBe(r1.filled + 1)
  })

  it('jaringan=2 requires jml_cabang', () => {
    const r1 = calc({ radios: { l2_jaringan: '2' } })
    const r2 = calc({ radios: { l2_jaringan: '2' }, fields: { l2_jml_cabang: '3' } })
    expect(r2.filled).toBe(r1.filled + 1)
  })

  // ── Rincian 16a/b/c ─────────────────────────────────────────────────────
  it('internet (16a) radio counts', () => {
    const base = calc()
    const r = calc({ radios: { l2_internet: '2' } })
    expect(r.filled).toBe(base.filled + 1)
  })

  it('internet=1 opens 16b (6 tujuan sub-fields)', () => {
    const rNo  = calc({ radios: { l2_internet: '2' } })
    const rYes = calc({ radios: { l2_internet: '1' } })
    expect(rYes.total).toBe(rNo.total + 6)
  })

  it('internet=1 with all b1-b6 filled counts all 6', () => {
    const r1 = calc({ radios: { l2_internet: '1' } })
    const r2 = calc({
      radios: {
        l2_internet: '1',
        l2_internet_b1: '1', l2_internet_b2: '2', l2_internet_b3: '2',
        l2_internet_b4: '1', l2_internet_b5: '1', l2_internet_b6: '2',
      },
    })
    expect(r2.filled).toBe(r1.filled + 6)
  })

  it('teknologi (16c) radio counts', () => {
    const base = calc()
    const r = calc({ radios: { l2_teknologi: '1' } })
    expect(r.filled).toBe(base.filled + 1)
  })

  // ── Rincian 17a/17b ──────────────────────────────────────────────────────
  it('ramah_a (17a) counts', () => {
    const base = calc()
    const r = calc({ radios: { l2_ramah_a: '1' } })
    expect(r.filled).toBe(base.filled + 1)
  })

  it('ramah_b (17b) counts', () => {
    const base = calc()
    const r = calc({ radios: { l2_ramah_b: '2' } })
    expect(r.filled).toBe(base.filled + 1)
  })

  // ── Rincian 18 ───────────────────────────────────────────────────────────
  it('kreatif (18) counts', () => {
    const base = calc()
    const r = calc({ radios: { l2_kreatif: '2' } })
    expect(r.filled).toBe(base.filled + 1)
  })

  // ── Halal/BPOM ───────────────────────────────────────────────────────────
  it('halal=1 requires halal_b and halal_c', () => {
    const r1 = calc({ radios: { l2_halal: '1' } })
    const r2 = calc({ radios: { l2_halal: '1' }, fields: { l2_halal_b: '5', l2_halal_c: '2' } })
    expect(r2.filled).toBe(r1.filled + 2)
  })

  it('bpom=1 requires bpom_b and bpom_c', () => {
    const r1 = calc({ radios: { l2_bpom: '1' } })
    const r2 = calc({ radios: { l2_bpom: '1' }, fields: { l2_bpom_b: '3', l2_bpom_c: '1' } })
    expect(r2.filled).toBe(r1.filled + 2)
  })

  // ── Rincian 21/22 ────────────────────────────────────────────────────────
  it('mitra_kdkmp (21) counts', () => {
    const base = calc()
    const r = calc({ radios: { l2_mitra_kdkmp: '2' } })
    expect(r.filled).toBe(base.filled + 1)
  })

  it('mbg (22) counts', () => {
    const base = calc()
    const r = calc({ radios: { l2_mbg: '5' } })
    expect(r.filled).toBe(base.filled + 1)
  })

  // ── Rincian 23 ───────────────────────────────────────────────────────────
  it('nonpend_a/b/c (23) each count independently', () => {
    const base = calc()
    const r = calc({ radios: { l2_nonpend_a: '2', l2_nonpend_b: '2', l2_nonpend_c: '2' } })
    expect(r.filled).toBe(base.filled + 3)
  })

  it('tahun_operasi must be in 1900-2026', () => {
    const r1 = calc({ fields: { l2_tahun_operasi: '1850' } })
    expect(r1.filled).toBe(0)
    const r2 = calc({ fields: { l2_tahun_operasi: '2020' } })
    expect(r2.filled).toBe(1)
  })

  it('y29 sum = 100 counts an extra checkmark', () => {
    const fields = {
      l2_tahun_operasi: '2020',  // tahunan section (yr < 2026)
      l2_y29a: '50', l2_y29b: '20', l2_y29c: '10',
      l2_y29d: '10', l2_y29e: '5',  l2_y29f: '5',
    }
    const r = calc({ fields })
    expect(r.filled).toBeGreaterThanOrEqual(7)
  })

  it('y29 sum != 100 does not get the sum-check bonus', () => {
    const fields = {
      l2_tahun_operasi: '2020',
      l2_y29a: '50', l2_y29b: '20', l2_y29c: '10',
      l2_y29d: '10', l2_y29e: '5',  l2_y29f: '4',  // total 99
    }
    const r = calc({ fields })
    const allRight = calc({
      fields: { ...fields, l2_y29f: '5' },
    })
    expect(allRight.filled).toBe(r.filled + 1)
  })
})

// ─── BLOK III: Perumahan ────────────────────────────────────────────────────

describe('calcProgressL() — Blok III Perumahan', () => {
  it('jenis_bangunan=3 (rusun) requires lantai_apt', () => {
    const r1 = calc({ radios: { l3_jenis_bangunan: '3' } })
    const r2 = calc({ radios: { l3_jenis_bangunan: '3' }, fields: { l3_lantai_apt: '12' } })
    expect(r2.filled).toBe(r1.filled + 1)
  })

  it('jenis_bangunan=5 requires bangunan_lain', () => {
    const r1 = calc({ radios: { l3_jenis_bangunan: '5' } })
    const r2 = calc({ radios: { l3_jenis_bangunan: '5' }, fields: { l3_bangunan_lain: 'Kos' } })
    expect(r2.filled).toBe(r1.filled + 1)
  })

  it('jenis_bangunan=5 does NOT require jml_keluarga (slot replaced by bangunan_lain)', () => {
    // jb=5 swaps jml_keluarga for bangunan_lain, so total stays equal between jb=1 and jb=5
    const r5 = calc({ radios: { l3_jenis_bangunan: '5' } })
    const r1 = calc({ radios: { l3_jenis_bangunan: '1' } })
    expect(r5.total).toBe(r1.total)  // net delta = 0 (remove jml_keluarga, add bangunan_lain)

    // Verify: filling jml_keluarga when jb=5 adds nothing
    const r5WithJml = calc({ radios: { l3_jenis_bangunan: '5' }, fields: { l3_jml_keluarga: '2' } })
    expect(r5WithJml.filled).toBe(r5.filled)
  })

  it('jml_keluarga required when jenis_bangunan=1 (biasa)', () => {
    const r1 = calc({ radios: { l3_jenis_bangunan: '1' } })
    const r2 = calc({ radios: { l3_jenis_bangunan: '1' }, fields: { l3_jml_keluarga: '1' } })
    expect(r2.filled).toBe(r1.filled + 1)
  })

  // ── lantai kondisi conditional ───────────────────────────────────────────
  it('lantai_kondisi required when lantai_bahan=1 (bukan tanah/bambu)', () => {
    const r1 = calc({ fields: { l3_lantai_bahan: '1' } })
    const r2 = calc({ fields: { l3_lantai_bahan: '1' }, radios: { l3_lantai_kondisi: '1' } })
    expect(r2.filled).toBe(r1.filled + 1)
  })

  it('lantai_kondisi NOT required when lantai_bahan=7 (tanah)', () => {
    const rTanah = calc({ fields: { l3_lantai_bahan: '7' } })
    const rTanahWithKond = calc({ fields: { l3_lantai_bahan: '7' }, radios: { l3_lantai_kondisi: '1' } })
    expect(rTanahWithKond.filled).toBe(rTanah.filled) // no extra slot
  })

  it('lantai_kondisi NOT required when lantai_bahan=8 (bambu)', () => {
    const r = calc({ fields: { l3_lantai_bahan: '8' } })
    const rWith = calc({ fields: { l3_lantai_bahan: '8' }, radios: { l3_lantai_kondisi: '1' } })
    expect(rWith.filled).toBe(r.filled)
  })

  // ── dinding kondisi conditional ──────────────────────────────────────────
  it('dinding_kondisi required when dinding_bahan=1 (bukan bambu/lainnya)', () => {
    const r1 = calc({ fields: { l3_dinding_bahan: '1' } })
    const r2 = calc({ fields: { l3_dinding_bahan: '1' }, radios: { l3_dinding_kondisi: '2' } })
    expect(r2.filled).toBe(r1.filled + 1)
  })

  it('dinding_kondisi NOT required when dinding_bahan=6 (bambu)', () => {
    const r = calc({ fields: { l3_dinding_bahan: '6' } })
    const rWith = calc({ fields: { l3_dinding_bahan: '6' }, radios: { l3_dinding_kondisi: '1' } })
    expect(rWith.filled).toBe(r.filled)
  })

  // ── atap kondisi conditional ─────────────────────────────────────────────
  it('atap_kondisi required when atap_bahan=1 (bukan ijuk/lainnya)', () => {
    const r1 = calc({ fields: { l3_atap_bahan: '1' } })
    const r2 = calc({ fields: { l3_atap_bahan: '1' }, radios: { l3_atap_kondisi: '2' } })
    expect(r2.filled).toBe(r1.filled + 1)
  })

  it('atap_kondisi NOT required when atap_bahan=5 (ijuk/rumbia)', () => {
    const r = calc({ fields: { l3_atap_bahan: '5' } })
    const rWith = calc({ fields: { l3_atap_bahan: '5' }, radios: { l3_atap_kondisi: '1' } })
    expect(rWith.filled).toBe(r.filled)
  })

  it('status_milik=1 requires bukti radio', () => {
    const r1 = calc({ radios: { l3_status_milik: '1' } })
    const r2 = calc({ radios: { l3_status_milik: '1', l3_bukti: '1' } })
    expect(r2.filled).toBe(r1.filled + 1)
  })

  it('status_milik=5 requires status_lain text', () => {
    const r1 = calc({ radios: { l3_status_milik: '5' } })
    const r2 = calc({
      radios: { l3_status_milik: '5' },
      fields: { l3_status_lain: 'Pinjam pakai' },
    })
    expect(r2.filled).toBe(r1.filled + 1)
  })

  it('bab in {1,2,3} requires kloset', () => {
    const r1 = calc({ radios: { l3_bab: '1' } })
    const r2 = calc({ radios: { l3_bab: '1', l3_kloset: '1' } })
    expect(r2.filled).toBe(r1.filled + 1)
  })

  it('bab=4 does not require kloset', () => {
    const r1 = calc({ radios: { l3_bab: '4' } })
    const r2 = calc({ radios: { l3_bab: '4', l3_kloset: '1' } })
    expect(r2.filled).toBe(r1.filled) // kloset not counted for bab=4
  })

  // ── tinja conditional ────────────────────────────────────────────────────
  it('tinja required when bab=1 (jamban sendiri)', () => {
    const r1 = calc({ radios: { l3_bab: '1' } })
    const r2 = calc({ radios: { l3_bab: '1', l3_tinja: '1' } })
    expect(r2.filled).toBe(r1.filled + 1)
  })

  it('tinja NOT required when bab=4 (tanpa fasilitas/alam terbuka)', () => {
    const r = calc({ radios: { l3_bab: '4' } })
    const rWith = calc({ radios: { l3_bab: '4', l3_tinja: '1' } })
    expect(rWith.filled).toBe(r.filled) // tinja not in total
  })

  it('tinja NOT required when bab=5', () => {
    const r = calc({ radios: { l3_bab: '5' } })
    const rWith = calc({ radios: { l3_bab: '5', l3_tinja: '1' } })
    expect(rWith.filled).toBe(r.filled)
  })

  it('listrik=1 requires meteran_jml', () => {
    const r1 = calc({ radios: { l3_listrik: '1' } })
    const r2 = calc({ radios: { l3_listrik: '1' }, fields: { l3_meteran_jml: '1' } })
    expect(r2.filled).toBe(r1.filled + 1)
  })

  it('all 10 aset bergerak/tidak bergerak fields are independent', () => {
    const ids = ['l3_aset_gas3','l3_aset_gas5','l3_aset_kulkas','l3_aset_ac','l3_aset_emas',
                 'l3_aset_komputer','l3_aset_motor','l3_aset_mobil','l3_aset_tanah','l3_aset_rumah']
    const base = calc()
    const fields = {}
    ids.forEach(id => fields[id] = '0')
    const r = calc({ fields })
    expect(r.filled).toBe(base.filled + 10)
  })
})

// ─── BLOK V: Petugas/Responden ──────────────────────────────────────────────

describe('calcProgressL() — Blok V Petugas/Responden', () => {
  it('petugas_nama counts', () => {
    const base = calc()
    const r = calc({ fields: { l5_petugas_nama: 'Andi' } })
    expect(r.filled).toBe(base.filled + 1)
  })

  it('responden_hp requires valid format and counts', () => {
    const base = calc()
    const r = calc({ fields: { l5_responden_hp: '081234567890' } })
    expect(r.filled).toBe(base.filled + 1)
  })

  it('invalid responden_hp does not count', () => {
    const r = calc({ fields: { l5_responden_hp: '12345' } })
    expect(r.filled).toBe(0)
  })

  it('responden_email is OPTIONAL — does not affect filled or total', () => {
    const base = calc()
    // Filling email adds nothing
    const rEmail = calc({ fields: { l5_responden_email: 'foo@bar.com' } })
    expect(rEmail.filled).toBe(base.filled)
    expect(rEmail.total).toBe(base.total)
  })

  it('invalid email also has no effect (email is excluded from progress)', () => {
    const r = calc({ fields: { l5_responden_email: 'not-an-email' } })
    expect(r.filled).toBe(0)
  })

  it('l5HasSig=true counts signature', () => {
    const base = calc()
    const r = calc({ l5HasSig: true })
    expect(r.filled).toBe(base.filled + 1)
  })

  it('tanggal counts', () => {
    const base = calc()
    const r = calc({ fields: { l5_tanggal: '2026-05-01' } })
    expect(r.filled).toBe(base.filled + 1)
  })
})

// ─── COMPLETE FORM ───────────────────────────────────────────────────────────

describe('calcProgressL() — complete form', () => {
  it('all mandatory fields filled reaches >= 95% (near-complete)', () => {
    const r = calc({
      fields: {
        l1_nama_kk: 'Budi', l1_nik_kk: '1234567890123456', l1_no_kk: '1234567890123456',
        l1_jml_kk_anggota: '1',
        l1_alamat_provinsi: '51', l1_alamat_kab: '5108',
        l1_alamat_kec: '510801', l1_alamat_kel: '5108010001',
        l1_kodepos: '81111',
        l1_alamat_detail: 'Jl. A No.1', l1_nama_jalan: 'A', l1_no_rumah: '1',
        // Anggota #1 (umur 45, non-STOP, keb=1)
        'l_ang_1_nama': 'Budi', 'l_ang_1_hubungan': '1', 'l_ang_1_tgl_lahir': '1980-01-01',
        'l_ang_1_umur': '45', 'l_ang_1_profesi': '075',
        // Blok II
        l2_nama_usaha: 'Warung', l2_alamat: 'Jl. A',
        l2_pengusaha_nama: 'Budi', l2_pengusaha_umur: '45',
        l2_pengusaha_nik: '1234567890123456',
        l2_kegiatan_utama: 'jual', l2_produk_utama: 'beras',
        l2_kbli_kode: '47110',
        l2_pekerja_l: '1', l2_pekerja_p: '0',
        l2_tahun_operasi: '2020',
        // Blok III
        l3_jml_keluarga: '1', l3_luas_lantai: '60',
        l3_lantai_bahan: '1', l3_dinding_bahan: '1', l3_atap_bahan: '1',
        l3_air: '1',
        l3_makanan_mgg: '500000', l3_nonmakanan_bln: '1000000', l3_nonmakanan_thn: '2000000',
        l3_aset_gas3: '0', l3_aset_gas5: '0', l3_aset_kulkas: '0', l3_aset_ac: '0',
        l3_aset_emas: '0', l3_aset_komputer: '0', l3_aset_motor: '1', l3_aset_mobil: '0',
        l3_aset_tanah: '0', l3_aset_rumah: '0',
        // Blok V
        l5_petugas_nama: 'Andi', l5_responden_nama: 'Budi',
        l5_responden_hp: '081234567890', l5_tanggal: '2026-05-01',
      },
      radios: {
        l1_klasifikasi: '1', l1_sesuai_kk: '1',
        'l_ang_1_keberadaan': '1', 'l_ang_1_alamat_dom': '1',
        'l_ang_1_kawin': '2', 'l_ang_1_jk': '1', 'l_ang_1_sekolah': '2',
        'l_ang_1_ijazah': '3', 'l_ang_1_rekening': '2',
        'l_ang_1_kedudukan': '1',
        'l_ang_1_18a': '1', 'l_ang_1_18b': '2', 'l_ang_1_18c': '2',
        l2_kawasan: '10', l2_jenis_usaha: '1', l2_punya_nib: '2', l2_nib_alasan: '3',
        l2_badan_usaha: '13', l2_pengusaha_jk: '1',
        l2_b1: '2', l2_b2: '1', l2_c: '4',
        l2_jaringan: '1',
        l2_internet: '2', l2_teknologi: '2',
        l2_ramah_a: '3', l2_ramah_b: '2',
        l2_kreatif: '2',
        l2_halal: '2', l2_bpom: '2',
        l2_mitra_kdkmp: '2', l2_mbg: '5',
        l2_nonpend_a: '2', l2_nonpend_b: '2', l2_nonpend_c: '2',
        l3_jenis_bangunan: '1', l3_status_milik: '1', l3_bukti: '1',
        l3_lantai_kondisi: '2', l3_dinding_kondisi: '2', l3_atap_kondisi: '2',
        l3_bab: '1', l3_kloset: '1', l3_tinja: '1', l3_listrik: '2',
      },
      l5HasSig: true,
    })
    expect(r.pct).toBeGreaterThanOrEqual(95)
  })
})
