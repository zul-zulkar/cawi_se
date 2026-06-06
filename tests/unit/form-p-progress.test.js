import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT  = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const P_SRC = readFileSync(resolve(ROOT, 'js/form-p/form-p-progress.js'), 'utf8')

const noop = () => {}

function runP(fields = {}) {
  const fn = new Function(
    'document', 'window', 'getVal', 'getRadio',
    `${P_SRC}\nreturn calcProgressP();`
  )
  return fn(
    { getElementById: () => null, querySelectorAll: () => ({ forEach: noop }), addEventListener: noop },
    { addEventListener: noop },
    id => String(fields[id] ?? ''),
    () => ''
  )
}

describe('calcProgressP — bentuk hasil', () => {
  it('mengembalikan { pct, filled, total } numerik', () => {
    const r = runP()
    expect(typeof r.pct).toBe('number')
    expect(typeof r.filled).toBe('number')
    expect(typeof r.total).toBe('number')
    expect(r.total).toBeGreaterThan(0)
  })

  it('kosong → filled 0, pct 0', () => {
    const r = runP()
    expect(r.filled).toBe(0)
    expect(r.pct).toBe(0)
  })
})

describe('calcProgressP — penghitungan', () => {
  it('mengisi pmt_nama menambah filled', () => {
    const empty = runP()
    const one = runP({ pmt_nama: 'X' })
    expect(one.filled).toBe(empty.filled + 1)
  })

  it('geotag (lat+lng) dihitung 1 slot', () => {
    const base = runP({ pmt_keberadaan: '1' })
    const geo = runP({ pmt_keberadaan: '1', pmt_lat: '-8.1', pmt_lng: '115.1' })
    expect(geo.filled).toBe(base.filled + 1)
  })

  it('keberadaan tidak ditemukan/meninggal/khusus (0/3/6) mengurangi total (geotag tak dihitung)', () => {
    const found = runP({ pmt_keberadaan: '1' })
    const stop  = runP({ pmt_keberadaan: '0' })
    expect(found.total - stop.total).toBe(1)
  })

  it('100% saat semua slot terisi', () => {
    const r = runP({
      pmt_nama: 'X', pmt_keberadaan: '1', pmt_kode_bangunan: '3',
      pmt_lat: '-8.1', pmt_lng: '115.1',
      pmt_jml_usaha: '1', pmt_idsbr: '123', pmt_jml_kk: '4',
      pmt_no_kel: '1', pmt_no_bgn: '1', pmt_jalan: 'Jl. Melati',
      // Identitas keluarga (slot tambahan saat kode 2/3 + ditemukan)
      pmt_nik: '1234567890123456', pmt_nomor_kk: '1234567890123456',
      pmt_blok: 'A1', pmt_sesuai_kk: '1',
    })
    expect(r.pct).toBe(100)
    expect(r.filled).toBe(r.total)
  })
})
