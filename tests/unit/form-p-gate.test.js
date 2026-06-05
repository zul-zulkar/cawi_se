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

describe('PMT_GATE_RULES — gate Kode Penggunaan Bangunan → stage lanjutan (model leburan L)', () => {
  const gate = loadGate()

  it('kode 2 (Campuran) & 3 (Tempat Tinggal) → keluarga (L keluarga + usaha)', () => {
    expect(gate('3', 0, '')).toBe('keluarga')
    expect(gate('3', 2, '')).toBe('keluarga')
    expect(gate('2', 0, '')).toBe('keluarga')
    expect(gate('2', 1, 'ub')).toBe('keluarga') // skala tak mengubah stage
  })

  it('kode 1 (Khusus Usaha) & 7 (Virtual Office) → usaha (L usaha saja)', () => {
    expect(gate('1', 1, 'umkm')).toBe('usaha')
    expect(gate('1', 1, 'ub')).toBe('usaha')   // usaha besar pun masuk L usaha
    expect(gate('1', 1, '')).toBe('usaha')
    expect(gate('7', 0, 'ub')).toBe('usaha')
    expect(gate('7', 0, 'umkm')).toBe('usaha')
  })

  it('kode 4/5/6/8 → none (cukup listing Blok P, tidak ada kuesioner lanjutan)', () => {
    ;['4', '5', '6', '8'].forEach(k => {
      expect(gate(k, 0, '')).toBe('none')
      expect(gate(k, 5, 'ub')).toBe('none')
    })
  })

  it('kode kosong / tak dikenal → none', () => {
    expect(gate('', 0, '')).toBe('none')
    expect(gate(null, 0, '')).toBe('none')
    expect(gate(undefined, 0, '')).toBe('none')
    expect(gate('9', 0, '')).toBe('none')
    expect(gate('abc', 0, '')).toBe('none')
  })

  it('skala (UMKM/UB) tidak lagi mengubah hasil gate', () => {
    expect(gate('1', 1, 'UB')).toBe('usaha')
    expect(gate('1', 1, ' Besar ')).toBe('usaha')
    expect(gate('1', 1, 'UMKM')).toBe('usaha')
    expect(gate('2', 1, 'UB')).toBe('keluarga')
  })

  it('jmlUsaha tidak mengubah hasil gate (parameter cadangan)', () => {
    expect(gate('3', 0, '')).toBe(gate('3', 99, ''))
    expect(gate('1', 0, 'ub')).toBe(gate('1', 99, 'ub'))
  })
})
