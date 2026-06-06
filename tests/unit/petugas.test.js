import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { webcrypto } from 'node:crypto'

const ROOT   = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const SOURCE = readFileSync(resolve(ROOT, 'js/pages/petugas.js'), 'utf8')

beforeAll(() => {
  if (!globalThis.crypto) globalThis.crypto = webcrypto
})

function loadModule() {
  const mockWindow = {}
  new Function('window', SOURCE)(mockWindow)
  return mockWindow.PetugasManager
}

// ============================================================
// Data dummy konsisten — dipakai banyak test
// ============================================================
const PPL_FIXTURES = [
  { nama: 'PPL 1', email: 'ppl1@gmail.com', pml_email: 'pml1@gmail.com' },
  { nama: 'PPL 2', email: 'ppl2@gmail.com', pml_email: 'pml1@gmail.com' },
  { nama: 'PPL 3', email: 'ppl3@gmail.com', pml_email: 'pml2@gmail.com' },
  { nama: 'PPL 4', email: 'ppl4@gmail.com', pml_email: 'pml2@gmail.com' },
]
const PML_FIXTURES = [
  { nama: 'PML 1', email: 'pml1@gmail.com' },
  { nama: 'PML 2', email: 'pml2@gmail.com' },
]

// ============================================================
describe('PetugasManager loader', () => {
  it('mengekspos PetugasManager ke window', () => {
    const PM = loadModule()
    expect(PM).toBeDefined()
    expect(typeof PM.searchPetugas).toBe('function')
  })
})

// ============================================================
describe('hashPassword & verifyPassword', () => {
  const PM = loadModule()

  it('hash plaintext "Kuesioner08!" cocok dengan SHA-256 yang tersimpan di Sheets', async () => {
    const expected = '3e7551e772ef6f4b10197687eeb9779ded613d21b05ec5848e911e829e68cc11'
    const got = await PM.hashPassword('Kuesioner08!')
    expect(got).toBe(expected)
  })

  it('hash deterministik (panggilan berulang menghasilkan hash sama)', async () => {
    const a = await PM.hashPassword('abc')
    const b = await PM.hashPassword('abc')
    expect(a).toBe(b)
  })

  it('hash sensitif terhadap perubahan satu karakter', async () => {
    const a = await PM.hashPassword('Kuesioner08!')
    const b = await PM.hashPassword('Kuesioner08?')
    expect(a).not.toBe(b)
  })

  it('verifyPassword TRUE saat input cocok', async () => {
    const expected = '3e7551e772ef6f4b10197687eeb9779ded613d21b05ec5848e911e829e68cc11'
    expect(await PM.verifyPassword('Kuesioner08!', expected)).toBe(true)
  })

  it('verifyPassword FALSE saat input salah', async () => {
    const expected = '3e7551e772ef6f4b10197687eeb9779ded613d21b05ec5848e911e829e68cc11'
    expect(await PM.verifyPassword('salahdong', expected)).toBe(false)
  })

  it('verifyPassword FALSE saat hash kosong', async () => {
    expect(await PM.verifyPassword('Kuesioner08!', '')).toBe(false)
  })

  it('verifyPassword case-insensitive terhadap hex hash', async () => {
    const expected = '3E7551E772EF6F4B10197687EEB9779DED613D21B05EC5848E911E829E68CC11'
    expect(await PM.verifyPassword('Kuesioner08!', expected)).toBe(true)
  })
})

// ============================================================
describe('searchPetugas', () => {
  const PM = loadModule()

  it('query kosong → kembalikan gabungan semua PPL + PML', () => {
    const out = PM.searchPetugas('', PPL_FIXTURES, PML_FIXTURES)
    expect(out.length).toBe(PPL_FIXTURES.length + PML_FIXTURES.length)
  })

  it('hasil PPL ber-peran "PPL", hasil PML ber-peran "PML"', () => {
    const out = PM.searchPetugas('', PPL_FIXTURES, PML_FIXTURES)
    const ppl = out.filter(x => x.peran === 'PPL')
    const pml = out.filter(x => x.peran === 'PML')
    expect(ppl.length).toBe(PPL_FIXTURES.length)
    expect(pml.length).toBe(PML_FIXTURES.length)
  })

  it('match substring case-insensitive pada nama', () => {
    const out = PM.searchPetugas('PPL 1', PPL_FIXTURES, PML_FIXTURES)
    expect(out.length).toBe(1)
    expect(out[0].email).toBe('ppl1@gmail.com')
  })

  it('match substring case-insensitive pada email', () => {
    const out = PM.searchPetugas('PML2@', PPL_FIXTURES, PML_FIXTURES)
    expect(out.length).toBe(1)
    expect(out[0].peran).toBe('PML')
  })

  it('query yang tidak match → array kosong', () => {
    const out = PM.searchPetugas('xyzzy', PPL_FIXTURES, PML_FIXTURES)
    expect(out).toEqual([])
  })

  it('trim whitespace di query', () => {
    const out = PM.searchPetugas('   PPL 2  ', PPL_FIXTURES, PML_FIXTURES)
    expect(out.length).toBe(1)
    expect(out[0].email).toBe('ppl2@gmail.com')
  })

  it('hasil PPL mempertahankan field pml_email', () => {
    const out = PM.searchPetugas('PPL 3', PPL_FIXTURES, PML_FIXTURES)
    expect(out[0].pml_email).toBe('pml2@gmail.com')
  })

  it('aman terhadap list kosong / undefined', () => {
    expect(PM.searchPetugas('a', null, null)).toEqual([])
    expect(PM.searchPetugas('', [], [])).toEqual([])
  })
})

// ============================================================
describe('resolvePmlNama', () => {
  const PM = loadModule()

  it('resolves email ke nama PML', () => {
    expect(PM.resolvePmlNama('pml1@gmail.com', PML_FIXTURES)).toBe('PML 1')
    expect(PM.resolvePmlNama('pml2@gmail.com', PML_FIXTURES)).toBe('PML 2')
  })

  it('case-insensitive', () => {
    expect(PM.resolvePmlNama('PML1@GMAIL.COM', PML_FIXTURES)).toBe('PML 1')
  })

  it('null untuk email yang tidak ada di list', () => {
    expect(PM.resolvePmlNama('ghost@gmail.com', PML_FIXTURES)).toBeNull()
  })

  it('null saat email kosong atau list kosong', () => {
    expect(PM.resolvePmlNama('', PML_FIXTURES)).toBeNull()
    expect(PM.resolvePmlNama('pml1@gmail.com', [])).toBeNull()
    expect(PM.resolvePmlNama('pml1@gmail.com', null)).toBeNull()
  })
})

// ============================================================
describe('generateId', () => {
  const PM = loadModule()

  it('mengembalikan string non-kosong', () => {
    const id = PM.generateId()
    expect(typeof id).toBe('string')
    expect(id.length).toBeGreaterThan(0)
  })

  it('format mirip UUID v4 (8-4-4-4-12)', () => {
    const id = PM.generateId()
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
  })

  it('panggilan berturut menghasilkan ID berbeda', () => {
    const a = PM.generateId()
    const b = PM.generateId()
    expect(a).not.toBe(b)
  })
})

// ============================================================
describe('createAssignment', () => {
  const PM = loadModule()
  const activePPL = { nama: 'PPL 1', email: 'ppl1@gmail.com', peran: 'PPL', pml_email: 'pml1@gmail.com' }

  function validData(over = {}) {
    return {
      jenis: 'L',
      nama_responden: 'Budi Santoso',
      provinsi: 'Bali',
      kabupaten: 'Buleleng',
      kecamatan: 'Sukasada',
      desa: 'Panji',
      ...over,
    }
  }

  it('membuat entry valid dengan field lengkap', () => {
    const a = PM.createAssignment(validData(), activePPL)
    expect(a.id).toMatch(/^[0-9a-f-]{36}$/i)
    expect(a.jenis).toBe('L')
    expect(a.nama_responden).toBe('Budi Santoso')
    expect(a.petugas_email).toBe('ppl1@gmail.com')
    expect(a.petugas_peran).toBe('PPL')
    expect(a.status).toBe('draft')
    expect(typeof a.created_at).toBe('string')
    expect(a.updated_at).toBe(a.created_at)
  })

  it('draft_key untuk L mengikuti pola cawi_l_draft_<id>', () => {
    const a = PM.createAssignment(validData({ jenis: 'L' }), activePPL)
    expect(a.draft_key).toBe('cawi_l_draft_' + a.id)
  })

  it('legacy jenis "LUB" dinormalisasi ke UNIFIED + draft_key cawi_u_draft_<id> (L.UB di-retire)', () => {
    const a = PM.createAssignment(validData({ jenis: 'LUB' }), activePPL)
    expect(a.jenis).toBe('UNIFIED')
    expect(a.draft_key).toBe('cawi_u_draft_' + a.id)
  })

  it('normalisasi jenis selain "L" menjadi "UNIFIED"', () => {
    const a = PM.createAssignment(validData({ jenis: 'LUB' }), activePPL)
    expect(a.jenis).toBe('UNIFIED')
  })

  it('jenis UNIFIED → jenis "UNIFIED" + draft_key cawi_u_draft_<id>', () => {
    const a = PM.createAssignment(validData({ jenis: 'UNIFIED' }), activePPL)
    expect(a.jenis).toBe('UNIFIED')
    expect(a.draft_key).toBe('cawi_u_draft_' + a.id)
  })

  it('jenis "P" dinormalisasi menjadi "UNIFIED"', () => {
    const a = PM.createAssignment(validData({ jenis: 'P' }), activePPL)
    expect(a.jenis).toBe('UNIFIED')
  })

  it('UNIFIED menyertakan p_status "open" + p_jenis_bangunan null', () => {
    const a = PM.createAssignment(validData({ jenis: 'UNIFIED' }), activePPL)
    expect(a.p_status).toBe('open')
    expect(a.p_jenis_bangunan).toBeNull()
  })

  it('jenis tak dikenal → default UNIFIED', () => {
    const a = PM.createAssignment(validData({ jenis: 'XYZ' }), activePPL)
    expect(a.jenis).toBe('UNIFIED')
  })

  it('throw error saat field wajib kosong', () => {
    expect(() => PM.createAssignment(validData({ desa: '' }), activePPL)).toThrow()
    expect(() => PM.createAssignment(validData({ nama_responden: '   ' }), activePPL)).toThrow()
    expect(() => PM.createAssignment(validData({ provinsi: '' }), activePPL)).toThrow()
  })

  it('throw error saat petugasAktif tidak valid', () => {
    expect(() => PM.createAssignment(validData(), null)).toThrow()
    expect(() => PM.createAssignment(validData(), { nama: 'x' })).toThrow()
  })

  it('menyimpan peran petugas aktif PML dengan benar', () => {
    const activePML = { nama: 'PML 1', email: 'pml1@gmail.com', peran: 'PML' }
    const a = PM.createAssignment(validData(), activePML)
    expect(a.petugas_peran).toBe('PML')
  })

  it('menyimpan kode wilayah BPS (provinsi_kd, kabupaten_kd, kecamatan_kd, desa_kd)', () => {
    const a = PM.createAssignment(validData({
      provinsi_kd: '51',
      kabupaten_kd: '5108',
      kecamatan_kd: '5108050',
      desa_kd: '5108050001'
    }), activePPL)
    expect(a.provinsi_kd).toBe('51')
    expect(a.kabupaten_kd).toBe('5108')
    expect(a.kecamatan_kd).toBe('5108050')
    expect(a.desa_kd).toBe('5108050001')
  })

  it('kode wilayah opsional (backward compat) — kosong jika tidak diberi', () => {
    const a = PM.createAssignment(validData(), activePPL)
    expect(a.provinsi_kd).toBe('')
    expect(a.kabupaten_kd).toBe('')
    expect(a.kecamatan_kd).toBe('')
    expect(a.desa_kd).toBe('')
  })

  it('menyimpan SLS/SubSLS untuk pembagian wilayah lebih detail', () => {
    const a = PM.createAssignment(validData({
      sls_nama:    'BANJAR PENGINUMAN',
      sls_kd:      '0001',
      sls_full_kd: '51010100010001',
      subsls_kd:   '02'
    }), activePPL)
    expect(a.sls_nama).toBe('BANJAR PENGINUMAN')
    expect(a.sls_kd).toBe('0001')
    expect(a.sls_full_kd).toBe('51010100010001')
    expect(a.subsls_kd).toBe('02')
  })

  it('SubSLS default "00" jika tidak diberi (SLS tunggal tanpa pembagian)', () => {
    const a = PM.createAssignment(validData(), activePPL)
    expect(a.subsls_kd).toBe('00')
    expect(a.sls_nama).toBe('')
    expect(a.sls_kd).toBe('')
    expect(a.sls_full_kd).toBe('')
  })
})

// ============================================================
describe('canViewAssignment', () => {
  const PM = loadModule()
  const activePPL1 = { nama: 'PPL 1', email: 'ppl1@gmail.com', peran: 'PPL', pml_email: 'pml1@gmail.com' }
  const activePPL3 = { nama: 'PPL 3', email: 'ppl3@gmail.com', peran: 'PPL', pml_email: 'pml2@gmail.com' }
  const activePML1 = { nama: 'PML 1', email: 'pml1@gmail.com', peran: 'PML' }
  const activePML2 = { nama: 'PML 2', email: 'pml2@gmail.com', peran: 'PML' }

  const assPPL1 = { id: 'a1', petugas_email: 'ppl1@gmail.com', petugas_peran: 'PPL' }
  const assPPL2 = { id: 'a2', petugas_email: 'ppl2@gmail.com', petugas_peran: 'PPL' }
  const assPPL3 = { id: 'a3', petugas_email: 'ppl3@gmail.com', petugas_peran: 'PPL' }
  const assPML1 = { id: 'a4', petugas_email: 'pml1@gmail.com', petugas_peran: 'PML' }

  it('PPL HANYA bisa lihat assignment miliknya sendiri', () => {
    expect(PM.canViewAssignment(assPPL1, activePPL1, PPL_FIXTURES)).toBe(true)
    expect(PM.canViewAssignment(assPPL2, activePPL1, PPL_FIXTURES)).toBe(false)
    expect(PM.canViewAssignment(assPPL3, activePPL1, PPL_FIXTURES)).toBe(false)
  })

  it('PML bisa lihat assignment PPL yang di bawahnya', () => {
    expect(PM.canViewAssignment(assPPL1, activePML1, PPL_FIXTURES)).toBe(true)
    expect(PM.canViewAssignment(assPPL2, activePML1, PPL_FIXTURES)).toBe(true)
  })

  it('PML TIDAK bisa lihat assignment PPL yang bukan bawahannya', () => {
    expect(PM.canViewAssignment(assPPL3, activePML1, PPL_FIXTURES)).toBe(false)
    expect(PM.canViewAssignment(assPPL1, activePML2, PPL_FIXTURES)).toBe(false)
  })

  it('PML bisa lihat assignment miliknya sendiri', () => {
    expect(PM.canViewAssignment(assPML1, activePML1, PPL_FIXTURES)).toBe(true)
  })

  it('case-insensitive di email match', () => {
    const assUpper = { petugas_email: 'PPL1@Gmail.com' }
    expect(PM.canViewAssignment(assUpper, activePPL1, PPL_FIXTURES)).toBe(true)
  })

  it('false saat petugasAktif tidak ada atau assignment tidak ada', () => {
    expect(PM.canViewAssignment(null, activePPL1, PPL_FIXTURES)).toBe(false)
    expect(PM.canViewAssignment(assPPL1, null, PPL_FIXTURES)).toBe(false)
  })
})

// ============================================================
describe('filterAssignments', () => {
  const PM = loadModule()
  const list = [
    { id: '1', petugas_email: 'ppl1@gmail.com', petugas_nama: 'PPL 1', jenis: 'L',
      provinsi: 'Bali', kabupaten: 'Buleleng', kecamatan: 'Sukasada', desa: 'Panji',
      nama_responden: 'Budi', status: 'draft', created_at: '2026-06-01T10:00:00Z', updated_at: '2026-06-01T10:00:00Z' },
    { id: '2', petugas_email: 'ppl2@gmail.com', petugas_nama: 'PPL 2', jenis: 'LUB',
      provinsi: 'Bali', kabupaten: 'Buleleng', kecamatan: 'Sukasada', desa: 'Sambangan',
      nama_responden: 'Toko ABC', status: 'submitted', created_at: '2026-06-02T10:00:00Z', updated_at: '2026-06-02T10:00:00Z' },
    { id: '3', petugas_email: 'ppl3@gmail.com', petugas_nama: 'PPL 3', jenis: 'L',
      provinsi: 'Bali', kabupaten: 'Buleleng', kecamatan: 'Banjar', desa: 'Pedawa',
      nama_responden: 'Wayan', status: 'draft', created_at: '2026-06-03T10:00:00Z', updated_at: '2026-06-03T10:00:00Z' },
    { id: '4', petugas_email: 'pml1@gmail.com', petugas_nama: 'PML 1', jenis: 'L',
      provinsi: 'Bali', kabupaten: 'Buleleng', kecamatan: 'Banjar', desa: 'Pedawa',
      nama_responden: 'Made', status: 'draft', created_at: '2026-06-04T10:00:00Z', updated_at: '2026-06-04T10:00:00Z' },
  ]

  const activePPL1 = { nama: 'PPL 1', email: 'ppl1@gmail.com', peran: 'PPL', pml_email: 'pml1@gmail.com' }
  const activePML1 = { nama: 'PML 1', email: 'pml1@gmail.com', peran: 'PML' }
  const activePML2 = { nama: 'PML 2', email: 'pml2@gmail.com', peran: 'PML' }

  it('PPL hanya melihat assignment miliknya (filter kosong)', () => {
    const out = PM.filterAssignments(list, {}, activePPL1, PPL_FIXTURES)
    expect(out.length).toBe(1)
    expect(out[0].id).toBe('1')
  })

  it('PML 1 melihat PPL 1, PPL 2, dan PML 1 sendiri (3 record)', () => {
    const out = PM.filterAssignments(list, {}, activePML1, PPL_FIXTURES)
    expect(out.length).toBe(3)
    expect(out.map(x => x.id).sort()).toEqual(['1', '2', '4'])
  })

  it('PML 2 melihat PPL 3 (yang bawahannya), bukan yang lain', () => {
    const out = PM.filterAssignments(list, {}, activePML2, PPL_FIXTURES)
    expect(out.length).toBe(1)
    expect(out[0].id).toBe('3')
  })

  it('filter by desa — PML1 hanya melihat assignment miliknya di Pedawa (id=4), bukan PPL3', () => {
    // PML 1 menaungi PPL1 & PPL2 (di desa Panji & Sambangan), plus dirinya sendiri di Pedawa.
    // PPL 3 (id=3) di Pedawa BUKAN bawahannya, jadi tidak terlihat.
    const out = PM.filterAssignments(list, { desa: 'Pedawa' }, activePML1, PPL_FIXTURES)
    expect(out.length).toBe(1)
    expect(out[0].id).toBe('4')
  })

  it('filter by desa — PML2 melihat PPL3 (bawahannya) di Pedawa', () => {
    const out = PM.filterAssignments(list, { desa: 'Pedawa' }, activePML2, PPL_FIXTURES)
    expect(out.length).toBe(1)
    expect(out[0].id).toBe('3')
  })

  it('filter by jenis L', () => {
    const out = PM.filterAssignments(list, { jenis: 'L' }, activePML1, PPL_FIXTURES)
    expect(out.every(x => x.jenis === 'L')).toBe(true)
    expect(out.map(x => x.id).sort()).toEqual(['1', '4'])
  })

  it('filter jenis "LUB" diabaikan (L.UB di-retire) → setara tanpa filter jenis', () => {
    const withLub  = PM.filterAssignments(list, { jenis: 'LUB' }, activePML1, PPL_FIXTURES)
    const noFilter = PM.filterAssignments(list, {}, activePML1, PPL_FIXTURES)
    expect(withLub.map(x => x.id).sort()).toEqual(noFilter.map(x => x.id).sort())
  })

  it('filter by jenis UNIFIED (SE2026-P)', () => {
    const uList = [
      { id: 'u1', petugas_email: 'pml1@gmail.com', jenis: 'UNIFIED', desa: 'Pedawa' },
      { id: 'u2', petugas_email: 'pml1@gmail.com', jenis: 'L',       desa: 'Pedawa' },
    ]
    const out = PM.filterAssignments(uList, { jenis: 'UNIFIED' }, activePML1, PPL_FIXTURES)
    expect(out.length).toBe(1)
    expect(out[0].id).toBe('u1')
  })

  it('filter by kecamatan', () => {
    const out = PM.filterAssignments(list, { kecamatan: 'Sukasada' }, activePML1, PPL_FIXTURES)
    expect(out.map(x => x.id).sort()).toEqual(['1', '2'])
  })

  it('filter by petugas_nama', () => {
    const out = PM.filterAssignments(list, { petugas_nama: 'PPL 2' }, activePML1, PPL_FIXTURES)
    expect(out.length).toBe(1)
    expect(out[0].id).toBe('2')
  })

  it('kombinasi beberapa filter (AND)', () => {
    const out = PM.filterAssignments(list,
      { kecamatan: 'Sukasada', jenis: 'L' }, activePML1, PPL_FIXTURES)
    expect(out.length).toBe(1)
    expect(out[0].id).toBe('1')
  })

  it('jenis tak dikenal diabaikan', () => {
    const out = PM.filterAssignments(list, { jenis: 'XYZ' }, activePML1, PPL_FIXTURES)
    expect(out.length).toBe(3)
  })
})

// ============================================================
describe('deleteAssignment', () => {
  const PM = loadModule()
  const list = [
    { id: '1', nama_responden: 'A' },
    { id: '2', nama_responden: 'B' },
    { id: '3', nama_responden: 'C' },
  ]

  it('menghapus entry dengan id yang cocok', () => {
    const out = PM.deleteAssignment('2', list)
    expect(out.length).toBe(2)
    expect(out.find(x => x.id === '2')).toBeUndefined()
  })

  it('immutable — input list tidak berubah', () => {
    PM.deleteAssignment('1', list)
    expect(list.length).toBe(3)
  })

  it('id yang tidak ada → list tetap utuh', () => {
    const out = PM.deleteAssignment('99', list)
    expect(out.length).toBe(3)
  })

  it('list kosong/undefined → array kosong', () => {
    expect(PM.deleteAssignment('1', [])).toEqual([])
    expect(PM.deleteAssignment('1', null)).toEqual([])
  })
})

// ============================================================
describe('getDistinctValues', () => {
  const PM = loadModule()
  const list = [
    { desa: 'Panji', kecamatan: 'Sukasada' },
    { desa: 'Sambangan', kecamatan: 'Sukasada' },
    { desa: 'Pedawa', kecamatan: 'Banjar' },
    { desa: 'Panji', kecamatan: 'Sukasada' },        // duplikat
    { desa: '',      kecamatan: 'Banjar' },          // kosong dilewati
    { desa: '  Pedawa  ', kecamatan: 'Banjar' },     // whitespace di-trim
  ]

  it('mengembalikan unique values', () => {
    const out = PM.getDistinctValues(list, 'desa')
    expect(out).toEqual(['Panji', 'Pedawa', 'Sambangan'])
  })

  it('sorted alphabetically (locale id)', () => {
    const out = PM.getDistinctValues(list, 'kecamatan')
    expect(out).toEqual(['Banjar', 'Sukasada'])
  })

  it('skip nilai kosong / whitespace-only', () => {
    const out = PM.getDistinctValues(list, 'desa')
    expect(out).not.toContain('')
  })

  it('list kosong → array kosong', () => {
    expect(PM.getDistinctValues([], 'desa')).toEqual([])
    expect(PM.getDistinctValues(null, 'desa')).toEqual([])
  })

  it('field yang tidak ada → array kosong', () => {
    expect(PM.getDistinctValues(list, 'nonexistent')).toEqual([])
  })
})
