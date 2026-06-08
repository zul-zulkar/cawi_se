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

// Field minimal yang membuat Blok P valid (tanpa error).
// keberadaan dibaca via getRadio()||getVal() → cukup di-set lewat getVal (fields).
const VALID = {
  pmt_jenis_entitas: '1',
  pmt_nama: 'Keluarga Wayan',
  pmt_keberadaan: '1',
  pmt_kode_bangunan: '3',
  pmt_no_bgn: '7', pmt_no_kel: '12',
  pmt_lat: '-8.1', pmt_lng: '115.1',
  // Identitas keluarga (sumber tunggal Blok P, wajib saat kode 2/3 + ditemukan)
  pmt_nik: '1234567890123456', pmt_nomor_kk: '1234567890123456',
  pmt_sesuai_kk: '1', pmt_jalan: 'Jl. Anggur', pmt_blok: 'A1',
}

describe('collectAllProblemsP — field wajib', () => {
  it('kosong → error untuk jenis entitas, nama, keberadaan, kode bangunan, dan geotag', () => {
    const r = runP()
    const fields = r.errors.map(e => e.field)
    expect(fields).toContain('pmt_jenis_entitas')
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

describe('collectAllProblemsP — identitas keluarga (sumber tunggal Blok P)', () => {
  it('kode 3 + ditemukan, NIK & No KK kosong → error', () => {
    const r = runP({
      pmt_nama: 'X', pmt_keberadaan: '1', pmt_kode_bangunan: '3',
      pmt_no_bgn: '1', pmt_no_kel: '1', pmt_lat: '-8.1', pmt_lng: '115.1',
      pmt_sesuai_kk: '1', pmt_jalan: '-', pmt_blok: '-',
    })
    const f = r.errors.map(e => e.field)
    expect(f).toContain('pmt_nik')
    expect(f).toContain('pmt_nomor_kk')
  })

  it('NIK bukan 16 digit → error format', () => {
    const r = runP({ ...VALID, pmt_nik: '123' })
    expect(r.errors.some(e => e.field === 'pmt_nik')).toBe(true)
  })

  it('NIK kode khusus 9999 → diterima', () => {
    const r = runP({ ...VALID, pmt_nik: '9999' })
    expect(r.errors.some(e => e.field === 'pmt_nik')).toBe(false)
  })

  it('No KK kode khusus 8888 → diterima', () => {
    const r = runP({ ...VALID, pmt_nomor_kk: '8888' })
    expect(r.errors.some(e => e.field === 'pmt_nomor_kk')).toBe(false)
  })

  it('bangunan lainnya (kode 1, jenis=2) → identitas keluarga TIDAK wajib', () => {
    const r = runP({
      pmt_jenis_entitas: '2', pmt_nama: 'Usaha', pmt_keberadaan: '1',
      pmt_kode_bangunan: '1', pmt_no_bgn: '1', pmt_lat: '-8.1', pmt_lng: '115.1',
    })
    const f = r.errors.map(e => e.field)
    expect(f).not.toContain('pmt_nik')
    expect(f).not.toContain('pmt_nomor_kk')
  })

  it('keluarga tidak ditemukan (keberadaan 0) → identitas keluarga TIDAK wajib', () => {
    const r = runP({ pmt_nama: 'X', pmt_keberadaan: '0', pmt_kode_bangunan: '3', pmt_no_bgn: '1', pmt_no_kel: '1' })
    const f = r.errors.map(e => e.field)
    expect(f).not.toContain('pmt_nik')
    expect(f).not.toContain('pmt_nomor_kk')
  })
})

describe('collectAllProblemsP — geotag conditional', () => {
  it('keberadaan=0 (tidak ditemukan) → geotag TIDAK wajib', () => {
    const r = runP({ pmt_nama: 'X', pmt_keberadaan: '0', pmt_kode_bangunan: '3', pmt_no_bgn: '1', pmt_no_kel: '1' })
    expect(r.errors.some(e => e.field === 'pmt_lat')).toBe(false)
  })

  it('keberadaan=3 (meninggal) → geotag TIDAK wajib', () => {
    const r = runP({ pmt_nama: 'X', pmt_keberadaan: '3', pmt_kode_bangunan: '3', pmt_no_bgn: '1', pmt_no_kel: '1' })
    expect(r.errors.some(e => e.field === 'pmt_lat')).toBe(false)
  })

  it('keberadaan=6 (keluarga khusus) → geotag TIDAK wajib', () => {
    const r = runP({ pmt_nama: 'X', pmt_keberadaan: '6', pmt_kode_bangunan: '8', pmt_no_bgn: '1', pmt_no_kel: '1' })
    expect(r.errors.some(e => e.field === 'pmt_lat')).toBe(false)
  })

  it('keberadaan=1 (ditemukan) tanpa koordinat → error geotag', () => {
    const r = runP({ pmt_nama: 'X', pmt_keberadaan: '1', pmt_kode_bangunan: '3', pmt_no_bgn: '1', pmt_no_kel: '1' })
    expect(r.errors.some(e => e.field === 'pmt_lat')).toBe(true)
  })

  it('keberadaan=2 (keluarga baru) tanpa koordinat → error geotag (wajib)', () => {
    const r = runP({ pmt_nama: 'X', pmt_keberadaan: '2', pmt_kode_bangunan: '3', pmt_no_bgn: '1', pmt_no_kel: '1' })
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
