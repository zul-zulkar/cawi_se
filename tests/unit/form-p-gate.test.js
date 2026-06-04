import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT   = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const SOURCE = readFileSync(resolve(ROOT, 'js/form-p/form-p.js'), 'utf8')

// PMT_GATE_RULES murni (tanpa DOM) — inject SOURCE lalu kembalikan fungsinya.
// Blok `if (typeof window !== 'undefined')` di akhir form-p.js otomatis dilewati
// karena window tidak terdefinisi di scope Function ini.
function loadGate() {
  const fn = new Function(`${SOURCE}\nreturn { PMT_GATE_RULES };`)
  return fn().PMT_GATE_RULES
}

describe('PMT_GATE_RULES — gate Kode Penggunaan Bangunan → stage lanjutan', () => {
  const gate = loadGate()

  it('kode 3 (Tempat Tinggal) → L (dengan atau tanpa usaha)', () => {
    expect(gate('3', 0, '')).toBe('l')
    expect(gate('3', 2, '')).toBe('l')
    expect(gate('3', 1, 'ub')).toBe('l') // tempat tinggal tetap L walau skala UB
  })

  it('kode 1 (Khusus Usaha) → L.UB bila skala UB, else L', () => {
    expect(gate('1', 1, 'ub')).toBe('lub')
    expect(gate('1', 1, 'besar')).toBe('lub')
    expect(gate('1', 1, 'umkm')).toBe('l')
    expect(gate('1', 1, '')).toBe('l')
  })

  it('kode 7 (Virtual Office) → mengikuti skala (UB → L.UB)', () => {
    expect(gate('7', 0, 'ub')).toBe('lub')
    expect(gate('7', 0, 'umkm')).toBe('l')
  })

  it('kode 2 (Campuran) → L.UB bila UB, else L', () => {
    expect(gate('2', 1, 'ub')).toBe('lub')
    expect(gate('2', 1, 'umkm')).toBe('l')
    expect(gate('2', 0, '')).toBe('l')
  })

  it('kode 4/5/6/8 → none (cukup listing Blok P)', () => {
    ;['4', '5', '6', '8'].forEach(k => {
      expect(gate(k, 0, '')).toBe('none')
      expect(gate(k, 5, 'ub')).toBe('none') // tetap none walau ada usaha/UB
    })
  })

  it('kode kosong / tak dikenal → none', () => {
    expect(gate('', 0, '')).toBe('none')
    expect(gate(null, 0, '')).toBe('none')
    expect(gate(undefined, 0, '')).toBe('none')
    expect(gate('9', 0, '')).toBe('none')
    expect(gate('abc', 0, '')).toBe('none')
  })

  it('skala case-insensitive & toleran spasi', () => {
    expect(gate('1', 1, 'UB')).toBe('lub')
    expect(gate('1', 1, ' Besar ')).toBe('lub')
    expect(gate('1', 1, 'UMKM')).toBe('l')
  })

  it('jmlUsaha tidak mengubah hasil gate (parameter cadangan)', () => {
    expect(gate('3', 0, '')).toBe(gate('3', 99, ''))
    expect(gate('1', 0, 'ub')).toBe(gate('1', 99, 'ub'))
  })
})
