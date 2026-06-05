import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT  = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const V_SRC = readFileSync(resolve(ROOT, 'js/form-p/form-p-validation.js'), 'utf8')

const noop = () => {}

function runP(fields = {}) {
  const fn = new Function(
    'document', 'window', 'getVal', 'getRadio',
    `${V_SRC}\nreturn collectAllProblemsP();`
  )
  return fn(
    { getElementById: () => null, querySelectorAll: () => ({ forEach: noop }), addEventListener: noop },
    { addEventListener: noop },
    id => String(fields[id] ?? ''),
    () => ''
  )
}

// Field minimal yang membuat Blok P valid (tanpa error)
const VALID = {
  pmt_nama: 'Keluarga Wayan',
  pmt_keberadaan: '1',
  pmt_kode_bangunan: '3',
  pmt_lat: '-8.1', pmt_lng: '115.1',
}

describe('collectAllProblemsP — field wajib', () => {
  it('kosong → error untuk nama, keberadaan, kode bangunan, dan geotag', () => {
    const r = runP()
    const fields = r.errors.map(e => e.field)
    expect(fields).toContain('pmt_nama')
    expect(fields).toContain('pmt_keberadaan')
    expect(fields).toContain('pmt_kode_bangunan')
    expect(fields).toContain('pmt_lat') // geotag
  })

  it('semua wajib terisi → tidak ada error', () => {
    const r = runP(VALID)
    expect(r.errors).toEqual([])
  })

  it('setiap error punya blok "P" (untuk navigasi)', () => {
    const r = runP()
    expect(r.errors.every(e => e.blok === 'P')).toBe(true)
  })
})

describe('collectAllProblemsP — geotag conditional', () => {
  it('keberadaan=2 (pindah) → geotag TIDAK wajib', () => {
    const r = runP({ pmt_nama: 'X', pmt_keberadaan: '2', pmt_kode_bangunan: '3' })
    expect(r.errors.some(e => e.field === 'pmt_lat')).toBe(false)
  })

  it('keberadaan=3 (fiktif) → geotag TIDAK wajib', () => {
    const r = runP({ pmt_nama: 'X', pmt_keberadaan: '3', pmt_kode_bangunan: '6' })
    expect(r.errors.some(e => e.field === 'pmt_lat')).toBe(false)
  })

  it('keberadaan=1 (ditemukan) tanpa koordinat → error geotag', () => {
    const r = runP({ pmt_nama: 'X', pmt_keberadaan: '1', pmt_kode_bangunan: '3' })
    expect(r.errors.some(e => e.field === 'pmt_lat')).toBe(true)
  })
})

describe('collectAllProblemsP — warning jumlah usaha', () => {
  it('jumlah usaha negatif → warning', () => {
    const r = runP({ ...VALID, pmt_jml_usaha: '-1' })
    expect(r.warnings.some(w => w.field === 'pmt_jml_usaha')).toBe(true)
  })

  it('jumlah usaha angka valid → tidak ada warning', () => {
    const r = runP({ ...VALID, pmt_jml_usaha: '2' })
    expect(r.warnings.some(w => w.field === 'pmt_jml_usaha')).toBe(false)
  })
})
