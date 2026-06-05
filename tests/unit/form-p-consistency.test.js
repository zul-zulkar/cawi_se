/**
 * form-p-consistency.test.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Menjaga konsistensi tiga pilar alur data Blok P (SE2026-P):
 *   1. Validasi/Progress  (js/form-p/form-p-validation.js & -progress.js)
 *   2. Collection         (collectDataP di js/shared/submit.js)
 *   3. Persistence        (P_FIELD_NAMES di server/google-apps-script.js)
 *
 * Field wajib yang tidak ikut di-collect = jawaban hilang saat submit.
 * Field di-collect tapi tidak ada di P_FIELD_NAMES = di-drop oleh GAS.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT    = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const S_SRC   = readFileSync(resolve(ROOT, 'js/shared/submit.js'), 'utf8')
const V_SRC   = readFileSync(resolve(ROOT, 'js/form-p/form-p-validation.js'), 'utf8')
const PR_SRC  = readFileSync(resolve(ROOT, 'js/form-p/form-p-progress.js'), 'utf8')
const GAS_SRC = readFileSync(resolve(ROOT, 'server/google-apps-script.js'), 'utf8')

// Ekstrak isi array P_FIELD_NAMES dari GAS
function extractPFieldNames(src) {
  const m = src.match(/const P_FIELD_NAMES\s*=\s*\[([\s\S]*?)\]/)
  if (!m) return []
  return [...m[1].matchAll(/"([^"]+)"/g)].map(x => x[1])
}

// Ekstrak key dari object literal collectDataP() di submit.js
function extractCollectKeys(src) {
  const m = src.match(/function collectDataP\s*\(\)\s*\{[\s\S]*?\n\}/)
  if (!m) return []
  return [...m[0].matchAll(/^\s*([a-zA-Z_]+):/gm)].map(x => x[1])
}

const pFields = extractPFieldNames(GAS_SRC)
const collectKeys = extractCollectKeys(S_SRC)

const REQUIRED_PMT = ['pmt_nama', 'pmt_keberadaan', 'pmt_kode_bangunan', 'pmt_lat', 'pmt_lng']

describe('Blok P — fungsi inti ada', () => {
  it('collectDataP() ada di submit.js & mengirim formMode p', () => {
    expect(S_SRC).toMatch(/function collectDataP/)
    expect(S_SRC).toContain("formMode: 'p'")
  })

  it('submitUnified() ada (orkestrasi multi-submit)', () => {
    expect(S_SRC).toMatch(/function submitUnified/)
  })

  it('GAS P_FIELD_NAMES terisi (>10 kolom)', () => {
    expect(pFields.length).toBeGreaterThan(10)
  })
})

describe('Blok P — field wajib lintas pilar', () => {
  for (const f of REQUIRED_PMT) {
    it(`'${f}': divalidasi, di-collect, dan ada di P_FIELD_NAMES`, () => {
      // Pilar 1: disebut di validasi atau progress
      expect(V_SRC.includes(f) || PR_SRC.includes(f)).toBe(true)
      // Pilar 2: ikut di collectDataP
      expect(collectKeys).toContain(f)
      // Pilar 3: dipersistensi GAS
      expect(pFields).toContain(f)
    })
  }
})

describe('Blok P — tidak ada field collect yang di-drop GAS', () => {
  it('setiap key collectDataP ada di P_FIELD_NAMES (kecuali formMode)', () => {
    const allowed = new Set([...pFields, 'formMode'])
    const orphan = collectKeys.filter(k => !allowed.has(k))
    expect(orphan).toEqual([])
  })

  it('jenis_lanjutan & record_id_lanjutan ikut di-collect & dipersistensi', () => {
    for (const f of ['jenis_lanjutan', 'record_id_lanjutan']) {
      expect(collectKeys).toContain(f)
      expect(pFields).toContain(f)
    }
  })
})
