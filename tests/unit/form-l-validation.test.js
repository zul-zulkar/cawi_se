import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT   = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const SOURCE = readFileSync(resolve(ROOT, 'js/form-l/form-l-validation.js'), 'utf8')

function mockEl(value = '', isHidden = false) {
  return { value, classList: { contains: cls => cls === 'hidden' && isHidden } }
}

// Build usaha store from l2_* fields/radios (backward compat).
// Always returns at least 1 entry so per-usaha validation runs,
// which matches the pre-roster behavior where Blok II was always present.
function buildUsahaStoreV(fields, radios) {
  const obj = {}
  Object.keys(fields).forEach(k => { if (k.startsWith('l2_'))  obj[k]         = fields[k]; })
  Object.keys(radios).forEach(k => { if (k.startsWith('l2_'))  obj['_r_' + k] = radios[k]; })
  return [obj]  // always 1 entry; may be empty object
}

function makeCollect({ fields = {}, radios = {}, elements = {}, l5HasSig = false, usahaStore = null } = {}) {
  const dom = { ...elements }
  const noop = () => {}
  const mockDoc = {
    getElementById: id => dom[id] ?? null,
    querySelectorAll: () => ({ forEach: noop }),
    addEventListener: noop,
    createElement: () => ({}),
  }
  const store = usahaStore !== null ? usahaStore : buildUsahaStoreV(fields, radios)
  const fn = new Function(
    'document', 'window',
    'getVal', 'getRadio',
    'isValidHP', 'isValidEmail',
    'l5HasSig',
    '_usahaDataStore', '_activeUsahaIdx', '_collectL2Fields',
    `${SOURCE}\nreturn { collectAllProblemsL };`
  )
  return fn(
    mockDoc, { addEventListener: noop },
    id   => String(fields[id]  ?? ''),
    name => String(radios[name] ?? ''),
    hp    => /^(\+62|62|0)[0-9]{8,13}$/.test(hp.replace(/[\s-]/g, '')),
    email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
    l5HasSig,
    store, null, null
  ).collectAllProblemsL
}

const collect = (opts = {}) => makeCollect(opts)()

const hasErr  = (r, field) => r.errors.some(e => e.field === field)
const errText = (r, field) => r.errors.find(e => e.field === field)?.text ?? null
const hasWarn = (r, field) => r.warnings.some(w => w.field === field)

describe('collectAllProblemsL — empty form', () => {
  const result = collect()

  it('returns object with errors, warnings, kosong arrays', () => {
    expect(Array.isArray(result.errors)).toBe(true)
    expect(Array.isArray(result.warnings)).toBe(true)
    expect(Array.isArray(result.kosong)).toBe(true)
  })

  it('generates at least 30 errors', () => {
    expect(result.errors.length).toBeGreaterThanOrEqual(30)
  })

  it('flags Blok I required fields', () => {
    for (const f of ['l1_nama_kk', 'l1_nik_kk', 'l1_no_kk', 'l1_jml_kk_anggota'])
      expect(hasErr(result, f)).toBe(true)
  })

  it('flags alamat keluarga', () => {
    for (const f of ['l1_alamat_provinsi', 'l1_alamat_kab', 'l1_alamat_kec', 'l1_alamat_kel'])
      expect(hasErr(result, f)).toBe(true)
  })

  it('flags klasifikasi (radio)', () => {
    expect(hasErr(result, 'l1_klasifikasi')).toBe(true)
  })

  it('flags kode pos', () => {
    expect(hasErr(result, 'l1_kodepos')).toBe(true)
  })

  it('flags petugas + responden + tgl + signature', () => {
    expect(hasErr(result, 'l5_petugas_nama')).toBe(true)
    expect(hasErr(result, 'l5_responden_nama')).toBe(true)
    expect(hasErr(result, 'l5_responden_hp')).toBe(true)
    expect(hasErr(result, 'l5_responden_email')).toBe(false) // email is now optional
    expect(hasErr(result, 'l5_tanggal')).toBe(true)
    expect(hasErr(result, 'l5_sigCanvas')).toBe(true)
  })
})

describe('collectAllProblemsL — NIK validation', () => {
  it('NIK KK = 15 digits → 16-digit error', () => {
    const r = collect({ fields: { l1_nik_kk: '123456789012345' } })
    expect(errText(r, 'l1_nik_kk')).toMatch(/16 digit/)
  })

  it('NIK KK = 16 digits all numeric passes (no error for nik_kk)', () => {
    const r = collect({ fields: { l1_nik_kk: '1234567890123456' } })
    expect(hasErr(r, 'l1_nik_kk')).toBe(false)
  })

  it('NIK KK with non-numeric flags letters error', () => {
    const r = collect({ fields: { l1_nik_kk: '12345678901234ab' } })
    expect(errText(r, 'l1_nik_kk')).toMatch(/angka/)
  })

  it('No KK = 17 digits → 16-digit error', () => {
    const r = collect({ fields: { l1_no_kk: '12345678901234567' } })
    expect(errText(r, 'l1_no_kk')).toMatch(/16 digit/)
  })
})

describe('collectAllProblemsL — jumlah anggota bounds', () => {
  it('jml_kk_anggota=0 flags "minimal 1"', () => {
    const r = collect({ fields: { l1_jml_kk_anggota: '0' } })
    expect(errText(r, 'l1_jml_kk_anggota')).toMatch(/[Mm]inimal/)
  })

  it('jml_kk_anggota=31 flags "maksimal 30"', () => {
    const r = collect({ fields: { l1_jml_kk_anggota: '31' } })
    expect(errText(r, 'l1_jml_kk_anggota')).toMatch(/[Mm]aksimal/)
  })

  it('jml_kk_anggota=5 → no error on bounds', () => {
    const r = collect({ fields: { l1_jml_kk_anggota: '5' } })
    expect(hasErr(r, 'l1_jml_kk_anggota')).toBe(false)
  })
})

describe('collectAllProblemsL — per-anggota validation', () => {
  it('anggota tanpa nama → error nama', () => {
    const r = collect({ fields: { l1_jml_kk_anggota: '1' } })
    expect(hasErr(r, 'l_ang_1_nama')).toBe(true)
  })

  it('anggota dengan keberadaan=1 (Tinggal) butuh alamat_dom', () => {
    const r = collect({
      fields: { l1_jml_kk_anggota: '1' },
      radios: { 'l_ang_1_keberadaan': '1' },
    })
    expect(hasErr(r, 'l_ang_1_alamat_dom')).toBe(true)
  })

  it('STOP-state (keberadaan=2) skip subsequent fields', () => {
    const r = collect({
      fields: { l1_jml_kk_anggota: '1' },
      radios: { 'l_ang_1_keberadaan': '2' },
    })
    expect(hasErr(r, 'l_ang_1_alamat_dom')).toBe(false)
    expect(hasErr(r, 'l_ang_1_jk')).toBe(false)
    expect(hasErr(r, 'l_ang_1_tgl_lahir')).toBe(false)
  })

  it('STOP-state via keberadaan=6 (Pisah KK) skip rest', () => {
    const r = collect({
      fields: { l1_jml_kk_anggota: '1' },
      radios: { 'l_ang_1_keberadaan': '6' },
    })
    expect(hasErr(r, 'l_ang_1_alamat_dom')).toBe(false)
  })

  it('STOP-state via keberadaan=7 skip rest', () => {
    const r = collect({
      fields: { l1_jml_kk_anggota: '1' },
      radios: { 'l_ang_1_keberadaan': '7' },
    })
    expect(hasErr(r, 'l_ang_1_kawin')).toBe(false)
  })

  it('keberadaan=3 (pindah DN) requires dn_provinsi', () => {
    const r = collect({
      fields: { l1_jml_kk_anggota: '1' },
      radios: { 'l_ang_1_keberadaan': '3' },
    })
    expect(hasErr(r, 'l_ang_1_dn_provinsi')).toBe(true)
  })

  it('keberadaan=4 (pindah LN) requires ln_negara', () => {
    const r = collect({
      fields: { l1_jml_kk_anggota: '1' },
      radios: { 'l_ang_1_keberadaan': '4' },
    })
    expect(hasErr(r, 'l_ang_1_ln_negara')).toBe(true)
  })

  it('anggota umur >= 5 requires sekolah/ijazah/rekening', () => {
    const r = collect({
      fields: { l1_jml_kk_anggota: '1', 'l_ang_1_umur': '8' },
      radios: { 'l_ang_1_keberadaan': '1' },
    })
    expect(hasErr(r, 'l_ang_1_sekolah')).toBe(true)
    expect(hasErr(r, 'l_ang_1_ijazah')).toBe(true)
    expect(hasErr(r, 'l_ang_1_rekening')).toBe(true)
  })

  it('anggota umur < 5 does NOT require sekolah/ijazah', () => {
    const r = collect({
      fields: { l1_jml_kk_anggota: '1', 'l_ang_1_umur': '3' },
      radios: { 'l_ang_1_keberadaan': '1' },
    })
    expect(hasErr(r, 'l_ang_1_sekolah')).toBe(false)
    expect(hasErr(r, 'l_ang_1_ijazah')).toBe(false)
  })

  it('anggota umur >= 10 requires profesi/kedudukan/18a/18b/18c', () => {
    const r = collect({
      fields: { l1_jml_kk_anggota: '1', 'l_ang_1_umur': '15' },
      radios: { 'l_ang_1_keberadaan': '1' },
    })
    expect(hasErr(r, 'l_ang_1_profesi')).toBe(true)
    expect(hasErr(r, 'l_ang_1_kedudukan')).toBe(true)
    expect(hasErr(r, 'l_ang_1_18a')).toBe(true)
    expect(hasErr(r, 'l_ang_1_18b')).toBe(true)
    expect(hasErr(r, 'l_ang_1_18c')).toBe(true)
  })

  it('anggota umur 7 does NOT require profesi (< 10)', () => {
    const r = collect({
      fields: { l1_jml_kk_anggota: '1', 'l_ang_1_umur': '7' },
      radios: { 'l_ang_1_keberadaan': '1' },
    })
    expect(hasErr(r, 'l_ang_1_profesi')).toBe(false)
  })

  it('anggota NIK 15 digits → error', () => {
    const r = collect({
      fields: { l1_jml_kk_anggota: '1', 'l_ang_1_nik': '123456789012345' },
      radios: { 'l_ang_1_keberadaan': '1' },
    })
    expect(errText(r, 'l_ang_1_nik')).toMatch(/16 digit/)
  })

  it('anggota umur > 120 → warning', () => {
    const r = collect({
      fields: { l1_jml_kk_anggota: '1', 'l_ang_1_umur': '125' },
      radios: { 'l_ang_1_keberadaan': '1' },
    })
    expect(r.warnings.some(w => /verifikasi/.test(w.text))).toBe(true)
  })

  it('hubungan=1 (KK) umur < 15 → warning', () => {
    const r = collect({
      fields: {
        l1_jml_kk_anggota: '1', 'l_ang_1_umur': '12', 'l_ang_1_hubungan': '1',
      },
      radios: { 'l_ang_1_keberadaan': '1' },
    })
    expect(r.warnings.some(w => /Kepala Keluarga/.test(w.label))).toBe(true)
  })

  it('jml_pendataan < jml_anggota → warning', () => {
    const r = collect({
      fields: { l1_jml_kk_anggota: '3', l1_jml_pendataan: '1' },
    })
    expect(hasWarn(r, 'l1_jml_pendataan')).toBe(true)
  })
})

describe('collectAllProblemsL — Blok II Usaha', () => {
  it('nama_usaha required', () => {
    const r = collect()
    expect(hasErr(r, 'l2_nama_usaha')).toBe(true)
  })

  it('kawasan=1 (in KEK) requires nama_kawasan', () => {
    const r = collect({ radios: { l2_kawasan: '1' } })
    expect(hasErr(r, 'l2_nama_kawasan')).toBe(true)
  })

  it('kawasan=10 (luar) does NOT require nama_kawasan', () => {
    const r = collect({ radios: { l2_kawasan: '10' } })
    expect(hasErr(r, 'l2_nama_kawasan')).toBe(false)
  })

  it('NIB=1 requires 13-digit NIB', () => {
    const r = collect({ radios: { l2_punya_nib: '1' }, fields: { l2_nib: '12345' } })
    expect(errText(r, 'l2_nib')).toMatch(/13 digit/)
  })

  it('NIB=1 with 13-digit NIB passes', () => {
    const r = collect({ radios: { l2_punya_nib: '1' }, fields: { l2_nib: '1234567890123' } })
    expect(hasErr(r, 'l2_nib')).toBe(false)
  })

  it('NIB=2 requires nib_alasan', () => {
    const r = collect({ radios: { l2_punya_nib: '2' } })
    expect(hasErr(r, 'l2_nib_alasan')).toBe(true)
  })

  it('nib_alasan=5 requires lainnya text', () => {
    const r = collect({ radios: { l2_punya_nib: '2', l2_nib_alasan: '5' } })
    expect(hasErr(r, 'l2_nib_alasan_lain')).toBe(true)
  })

  it('pengusaha umur < 17 flags error', () => {
    const r = collect({ fields: { l2_pengusaha_umur: '15' } })
    expect(errText(r, 'l2_pengusaha_umur')).toMatch(/17.*120/)
  })

  it('pengusaha umur 20 → warning (terlalu muda)', () => {
    const r = collect({ fields: { l2_pengusaha_umur: '20' } })
    expect(r.warnings.some(w => /muda/.test(w.text))).toBe(true)
  })

  it('pengusaha umur 80 → warning (verifikasi)', () => {
    const r = collect({ fields: { l2_pengusaha_umur: '80' } })
    expect(r.warnings.some(w => /verifikasi/.test(w.text))).toBe(true)
  })

  it('pengusaha NIK 15 digits → error', () => {
    const r = collect({ fields: { l2_pengusaha_nik: '123456789012345' } })
    expect(errText(r, 'l2_pengusaha_nik')).toMatch(/16 digit/)
  })

  it('b1=1 b2=2 (manufacturing) requires input + proses', () => {
    const r = collect({ radios: { l2_b1: '1', l2_b2: '2' } })
    expect(hasErr(r, 'l2_input')).toBe(true)
    expect(hasErr(r, 'l2_proses')).toBe(true)
  })

  it('b2=1 (food/retail) requires l2_c', () => {
    const r = collect({ radios: { l2_b2: '1' } })
    expect(hasErr(r, 'l2_c')).toBe(true)
  })

  it('jaringan=2 requires jml_cabang', () => {
    const r = collect({ radios: { l2_jaringan: '2' } })
    expect(hasErr(r, 'l2_jml_cabang')).toBe(true)
  })

  it('halal=1 requires halal_b & halal_c', () => {
    const r = collect({ radios: { l2_halal: '1' } })
    expect(hasErr(r, 'l2_halal_b')).toBe(true)
    expect(hasErr(r, 'l2_halal_c')).toBe(true)
  })

  it('bpom=1 requires bpom_b & bpom_c', () => {
    const r = collect({ radios: { l2_bpom: '1' } })
    expect(hasErr(r, 'l2_bpom_b')).toBe(true)
    expect(hasErr(r, 'l2_bpom_c')).toBe(true)
  })

  it('tahun_operasi 1850 → error out-of-range', () => {
    const r = collect({ fields: { l2_tahun_operasi: '1850' } })
    expect(errText(r, 'l2_tahun_operasi')).toMatch(/1900.*2026/)
  })

  it('tahun_operasi 2099 → error out-of-range', () => {
    const r = collect({ fields: { l2_tahun_operasi: '2099' } })
    expect(errText(r, 'l2_tahun_operasi')).toMatch(/1900.*2026/)
  })

  it('total pekerja > 500 → warning (rumah tangga umumnya kecil)', () => {
    const r = collect({ fields: { l2_pekerja_l: '600', l2_pekerja_p: '0' } })
    expect(r.warnings.some(w => /kecil/.test(w.text))).toBe(true)
  })

  it('tahunan wrap visible & y29 != 100 → error sum', () => {
    // tahun < 2026 → tahunan section; y29 sum check applies
    const r = collect({
      fields: {
        l2_tahun_operasi: '2020',
        l2_y29a: '50', l2_y29b: '20', l2_y29c: '10',
        l2_y29d: '10', l2_y29e: '5', l2_y29f: '4',  // total 99
      },
    })
    expect(errText(r, 'l2_y29a')).toMatch(/100%/)
  })

  it('tahunan wrap visible & y29 = 100 → no error', () => {
    const r = collect({
      fields: {
        l2_tahun_operasi: '2020',
        l2_y29a: '50', l2_y29b: '20', l2_y29c: '10',
        l2_y29d: '10', l2_y29e: '5', l2_y29f: '5',
      },
    })
    expect(hasErr(r, 'l2_y29a')).toBe(false)
  })

  it('bulanan wrap visible & m33 != 100 → error sum', () => {
    // tahun >= 2026 → bulanan section; m33 sum check applies
    const r = collect({
      fields: {
        l2_tahun_operasi: '2026',
        l2_m33a: '40', l2_m33b: '20', l2_m33c: '15',
        l2_m33d: '10', l2_m33e: '10', l2_m33f: '4',  // 99
      },
    })
    expect(errText(r, 'l2_m33a')).toMatch(/100%/)
  })
})

describe('collectAllProblemsL — Blok III Perumahan', () => {
  it('jenis_bangunan required', () => {
    const r = collect()
    expect(hasErr(r, 'l3_jenis_bangunan')).toBe(true)
  })

  it('jenis_bangunan=3 requires lantai_apt', () => {
    const r = collect({ radios: { l3_jenis_bangunan: '3' } })
    expect(hasErr(r, 'l3_lantai_apt')).toBe(true)
  })

  it('jenis_bangunan=4 also requires lantai_apt', () => {
    const r = collect({ radios: { l3_jenis_bangunan: '4' } })
    expect(hasErr(r, 'l3_lantai_apt')).toBe(true)
  })

  it('jenis_bangunan=5 requires bangunan_lain', () => {
    const r = collect({ radios: { l3_jenis_bangunan: '5' } })
    expect(hasErr(r, 'l3_bangunan_lain')).toBe(true)
  })

  it('status_milik=1 requires bukti', () => {
    const r = collect({ radios: { l3_status_milik: '1' } })
    expect(hasErr(r, 'l3_bukti')).toBe(true)
  })

  it('status_milik=5 requires status_lain', () => {
    const r = collect({ radios: { l3_status_milik: '5' } })
    expect(hasErr(r, 'l3_status_lain')).toBe(true)
  })

  it('bab=1 requires kloset', () => {
    const r = collect({ radios: { l3_bab: '1' } })
    expect(hasErr(r, 'l3_kloset')).toBe(true)
  })

  it('bab=4 does NOT require kloset', () => {
    const r = collect({ radios: { l3_bab: '4' } })
    expect(hasErr(r, 'l3_kloset')).toBe(false)
  })

  it('listrik=1 requires meteran_jml', () => {
    const r = collect({ radios: { l3_listrik: '1' } })
    expect(hasErr(r, 'l3_meteran_jml')).toBe(true)
  })

  it('all 10 aset items required (even = 0)', () => {
    const r = collect()
    for (const id of ['l3_aset_gas3', 'l3_aset_motor', 'l3_aset_rumah'])
      expect(hasErr(r, id)).toBe(true)
  })
})

describe('collectAllProblemsL — Blok IV (opsional)', () => {
  it('catatan kosong → kosong list, bukan error', () => {
    const r = collect()
    expect(r.kosong.some(k => k.field === 'l4_catatan')).toBe(true)
    expect(hasErr(r, 'l4_catatan')).toBe(false)
  })
})

describe('collectAllProblemsL — Blok V', () => {
  it('responden_email invalid → format error', () => {
    const r = collect({ fields: { l5_responden_email: 'invalid' } })
    expect(errText(r, 'l5_responden_email')).toMatch(/[Ff]ormat/)
  })

  it('responden_hp invalid → format error', () => {
    const r = collect({ fields: { l5_responden_hp: 'abc' } })
    expect(errText(r, 'l5_responden_hp')).toMatch(/[Ff]ormat/)
  })

  it('petugas_hp kosong → kosong list (opsional)', () => {
    const r = collect()
    expect(r.kosong.some(k => k.field === 'l5_petugas_hp')).toBe(true)
  })

  it('petugas_nip not tracked (not required, not in kosong — field exists in DOM only)', () => {
    // l5_petugas_nip is filled by autocomplete; validation doesn't track it
    const r = collect()
    expect(r.errors.some(e => e.field === 'l5_petugas_nip')).toBe(false)
  })

  it('petugas_hp invalid → error', () => {
    const r = collect({ fields: { l5_petugas_hp: 'abc' } })
    expect(errText(r, 'l5_petugas_hp')).toMatch(/[Ff]ormat/)
  })

  it('l5HasSig=true → no signature error', () => {
    const r = collect({ l5HasSig: true })
    expect(hasErr(r, 'l5_sigCanvas')).toBe(false)
  })

  it('l5HasSig=false → signature error', () => {
    const r = collect({ l5HasSig: false })
    expect(hasErr(r, 'l5_sigCanvas')).toBe(true)
  })
})

describe('collectAllProblemsL — blok routing', () => {
  it('Blok I errors carry blok=1', () => {
    const r = collect()
    const e = r.errors.find(x => x.field === 'l1_nama_kk')
    expect(e?.blok).toBe(1)
  })

  it('Blok II errors carry blok=2', () => {
    const r = collect()
    const e = r.errors.find(x => x.field === 'l2_nama_usaha')
    expect(e?.blok).toBe(2)
  })

  it('Blok III errors carry blok=3', () => {
    const r = collect()
    const e = r.errors.find(x => x.field === 'l3_jenis_bangunan')
    expect(e?.blok).toBe(3)
  })

  it('Blok V errors carry blok=5', () => {
    const r = collect()
    const e = r.errors.find(x => x.field === 'l5_petugas_nama')
    expect(e?.blok).toBe(5)
  })
})

// ─── Blok II: Rincian 16-23 — newly added validation fields ─────────────────

describe('collectAllProblemsL — Blok II Rincian 16a: Internet', () => {
  it('internet required when empty', () => {
    expect(hasErr(collect(), 'l2_internet')).toBe(true)
  })

  it('internet error carries blok=2 and Rincian 16a label', () => {
    const r = collect()
    const e = r.errors.find(e => e.field === 'l2_internet')
    expect(e?.blok).toBe(2)
    expect(e?.label).toMatch(/16a/)
  })

  it('internet=2 clears error', () => {
    expect(hasErr(collect({ radios: { l2_internet: '2' } }), 'l2_internet')).toBe(false)
  })
})

describe('collectAllProblemsL — Blok II Rincian 16b: Tujuan Internet (kondisional)', () => {
  it('internet=1 requires internet_b1 through b6', () => {
    const r = collect({ radios: { l2_internet: '1' } })
    for (const s of ['b1','b2','b3','b4','b5','b6'])
      expect(hasErr(r, 'l2_internet_' + s)).toBe(true)
  })

  it('internet=2 does NOT require internet_b1-b6', () => {
    const r = collect({ radios: { l2_internet: '2' } })
    for (const s of ['b1','b2','b3','b4','b5','b6'])
      expect(hasErr(r, 'l2_internet_' + s)).toBe(false)
  })

  it('internet empty → b1-b6 also not required (gate not triggered)', () => {
    const r = collect()
    for (const s of ['b1','b2','b3','b4','b5','b6'])
      expect(hasErr(r, 'l2_internet_' + s)).toBe(false)
  })

  it('internet_b errors carry blok=2', () => {
    const r = collect({ radios: { l2_internet: '1' } })
    expect(r.errors.find(e => e.field === 'l2_internet_b3')?.blok).toBe(2)
  })

  it('internet=1 with all b1-b6 filled → no b errors', () => {
    const r = collect({
      radios: {
        l2_internet: '1',
        l2_internet_b1: '1', l2_internet_b2: '2', l2_internet_b3: '2',
        l2_internet_b4: '1', l2_internet_b5: '1', l2_internet_b6: '2',
      }
    })
    for (const s of ['b1','b2','b3','b4','b5','b6'])
      expect(hasErr(r, 'l2_internet_' + s)).toBe(false)
  })
})

describe('collectAllProblemsL — Blok II Rincian 16c: Teknologi Digital', () => {
  it('teknologi required when empty', () => {
    expect(hasErr(collect(), 'l2_teknologi')).toBe(true)
  })

  it('teknologi error label matches Rincian 16c', () => {
    expect(collect().errors.find(e => e.field === 'l2_teknologi')?.label).toMatch(/16c/)
  })

  it('teknologi error carries blok=2', () => {
    expect(collect().errors.find(e => e.field === 'l2_teknologi')?.blok).toBe(2)
  })

  it('teknologi=1 clears error', () => {
    expect(hasErr(collect({ radios: { l2_teknologi: '1' } }), 'l2_teknologi')).toBe(false)
  })

  it('teknologi=2 clears error', () => {
    expect(hasErr(collect({ radios: { l2_teknologi: '2' } }), 'l2_teknologi')).toBe(false)
  })
})

describe('collectAllProblemsL — Blok II Rincian 17a/17b: Ramah Lingkungan', () => {
  it('ramah_a (17a) required when empty', () => {
    expect(hasErr(collect(), 'l2_ramah_a')).toBe(true)
  })

  it('ramah_a error label matches Rincian 17a', () => {
    expect(collect().errors.find(e => e.field === 'l2_ramah_a')?.label).toMatch(/17a/)
  })

  it('ramah_a=1 clears error', () => {
    expect(hasErr(collect({ radios: { l2_ramah_a: '1' } }), 'l2_ramah_a')).toBe(false)
  })

  it('ramah_b (17b) required when empty', () => {
    expect(hasErr(collect(), 'l2_ramah_b')).toBe(true)
  })

  it('ramah_b error label matches Rincian 17b', () => {
    expect(collect().errors.find(e => e.field === 'l2_ramah_b')?.label).toMatch(/17b/)
  })

  it('ramah_b=2 clears error', () => {
    expect(hasErr(collect({ radios: { l2_ramah_b: '2' } }), 'l2_ramah_b')).toBe(false)
  })

  it('ramah_a and ramah_b are independent — both needed', () => {
    const rA = collect({ radios: { l2_ramah_a: '1' } })
    expect(hasErr(rA, 'l2_ramah_b')).toBe(true)  // b still required
    const rB = collect({ radios: { l2_ramah_b: '1' } })
    expect(hasErr(rB, 'l2_ramah_a')).toBe(true)  // a still required
  })
})

describe('collectAllProblemsL — Blok II Rincian 18: Produk Kreatif', () => {
  it('kreatif required when empty', () => {
    expect(hasErr(collect(), 'l2_kreatif')).toBe(true)
  })

  it('kreatif error label matches Rincian 18', () => {
    expect(collect().errors.find(e => e.field === 'l2_kreatif')?.label).toMatch(/18/)
  })

  it('kreatif error carries blok=2', () => {
    expect(collect().errors.find(e => e.field === 'l2_kreatif')?.blok).toBe(2)
  })

  it('kreatif=2 clears error', () => {
    expect(hasErr(collect({ radios: { l2_kreatif: '2' } }), 'l2_kreatif')).toBe(false)
  })
})

describe('collectAllProblemsL — Blok II Rincian 21/22: Kemitraan & MBG', () => {
  it('mitra_kdkmp (21) required when empty', () => {
    expect(hasErr(collect(), 'l2_mitra_kdkmp')).toBe(true)
  })

  it('mitra_kdkmp error label matches Rincian 21', () => {
    expect(collect().errors.find(e => e.field === 'l2_mitra_kdkmp')?.label).toMatch(/21/)
  })

  it('mitra_kdkmp=1 clears error', () => {
    expect(hasErr(collect({ radios: { l2_mitra_kdkmp: '1' } }), 'l2_mitra_kdkmp')).toBe(false)
  })

  it('mbg (22) required when empty', () => {
    expect(hasErr(collect(), 'l2_mbg')).toBe(true)
  })

  it('mbg error label matches Rincian 22', () => {
    expect(collect().errors.find(e => e.field === 'l2_mbg')?.label).toMatch(/22/)
  })

  it('mbg=5 clears error', () => {
    expect(hasErr(collect({ radios: { l2_mbg: '5' } }), 'l2_mbg')).toBe(false)
  })
})

describe('collectAllProblemsL — Blok II Rincian 23: Transaksi Non-Penduduk', () => {
  it('nonpend_a (23a) required when empty', () => {
    expect(hasErr(collect(), 'l2_nonpend_a')).toBe(true)
  })

  it('nonpend_a error label matches Rincian 23a', () => {
    expect(collect().errors.find(e => e.field === 'l2_nonpend_a')?.label).toMatch(/23a/)
  })

  it('nonpend_b (23b) required when empty', () => {
    expect(hasErr(collect(), 'l2_nonpend_b')).toBe(true)
  })

  it('nonpend_b error label matches Rincian 23b', () => {
    expect(collect().errors.find(e => e.field === 'l2_nonpend_b')?.label).toMatch(/23b/)
  })

  it('nonpend_c (23c) required when empty', () => {
    expect(hasErr(collect(), 'l2_nonpend_c')).toBe(true)
  })

  it('nonpend_c error label matches Rincian 23c', () => {
    expect(collect().errors.find(e => e.field === 'l2_nonpend_c')?.label).toMatch(/23c/)
  })

  it('nonpend_a/b/c are independent — filling one does not clear others', () => {
    const r = collect({ radios: { l2_nonpend_a: '2' } })
    expect(hasErr(r, 'l2_nonpend_b')).toBe(true)
    expect(hasErr(r, 'l2_nonpend_c')).toBe(true)
  })

  it('filling all three clears all three errors', () => {
    const r = collect({ radios: { l2_nonpend_a: '2', l2_nonpend_b: '2', l2_nonpend_c: '2' } })
    expect(hasErr(r, 'l2_nonpend_a')).toBe(false)
    expect(hasErr(r, 'l2_nonpend_b')).toBe(false)
    expect(hasErr(r, 'l2_nonpend_c')).toBe(false)
  })

  it('all three carry blok=2', () => {
    const r = collect()
    expect(r.errors.find(e => e.field === 'l2_nonpend_a')?.blok).toBe(2)
    expect(r.errors.find(e => e.field === 'l2_nonpend_b')?.blok).toBe(2)
    expect(r.errors.find(e => e.field === 'l2_nonpend_c')?.blok).toBe(2)
  })
})

describe('collectAllProblemsL — Blok II section numbering (Rincian 24/25)', () => {
  it('pekerja_l error labeled Rincian 24 (not 23)', () => {
    expect(collect().errors.find(e => e.field === 'l2_pekerja_l')?.label).toMatch(/24/)
  })

  it('pekerja_p error labeled Rincian 24 (not 23)', () => {
    expect(collect().errors.find(e => e.field === 'l2_pekerja_p')?.label).toMatch(/24/)
  })

  it('tahun_operasi error labeled Rincian 25 (not 24)', () => {
    expect(collect().errors.find(e => e.field === 'l2_tahun_operasi')?.label).toMatch(/25/)
  })

  it('no field is labeled Rincian 23a that is also pekerja (no label collision)', () => {
    const r = collect()
    // nonpend fields use 23a/23b/23c; pekerja uses 24a/24b — no collision
    const e23a = r.errors.filter(e => e.label?.includes('23a'))
    expect(e23a.every(e => e.field?.includes('nonpend'))).toBe(true)
  })
})

describe('collectAllProblemsL — new B2 fields: bulk fill', () => {
  it('filling all 9 new unconditional B2 radios removes all their errors', () => {
    const r = collect({
      radios: {
        l2_internet:     '2',  // '2' = tidak pakai internet → no 16b sub-fields
        l2_teknologi:    '2',
        l2_ramah_a:      '2',
        l2_ramah_b:      '2',
        l2_kreatif:      '2',
        l2_mitra_kdkmp:  '2',
        l2_mbg:          '2',
        l2_nonpend_a:    '2',
        l2_nonpend_b:    '2',
        l2_nonpend_c:    '2',
      }
    })
    for (const f of ['l2_internet','l2_teknologi','l2_ramah_a','l2_ramah_b',
                     'l2_kreatif','l2_mitra_kdkmp','l2_mbg',
                     'l2_nonpend_a','l2_nonpend_b','l2_nonpend_c'])
      expect(hasErr(r, f)).toBe(false)
  })

  it('generates at least 9 more errors when new B2 fields are empty (baseline check)', () => {
    const r = collect()
    const newRequiredFields = [
      'l2_teknologi','l2_ramah_a','l2_ramah_b','l2_kreatif',
      'l2_mitra_kdkmp','l2_mbg','l2_nonpend_a','l2_nonpend_b','l2_nonpend_c',
    ]
    const foundErrors = newRequiredFields.filter(f => r.errors.some(e => e.field === f))
    expect(foundErrors.length).toBe(newRequiredFields.length)
  })
})
