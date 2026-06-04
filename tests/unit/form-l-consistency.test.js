/**
 * form-l-consistency.test.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Cross-cutting ("lapisan testing") tests that verify the three pillars of
 * L-mode data flow are mutually consistent:
 *
 *   1. Validation  (collectAllProblemsL  in form-l-validation.js)
 *      → generates errors for every required field that is empty
 *
 *   2. Progress    (calcProgressL        in form-l-progress.js)
 *      → counts that same field as unfilled; increments filled when provided
 *
 *   3. Collection  (collectDataL         in submit.js)
 *      → includes the field in the submitted data object (source scan)
 *
 * A field that is validated but not counted in progress causes the bar to stay
 * stuck below 100% even when the form is complete.  A field that is counted in
 * progress but not collected means the answer is lost on submission.  These
 * tests catch both failure modes.
 */

import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT  = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const V_SRC = readFileSync(resolve(ROOT, 'js/form-l/form-l-validation.js'), 'utf8')
const P_SRC = readFileSync(resolve(ROOT, 'js/form-l/form-l-progress.js'), 'utf8')
const S_SRC = readFileSync(resolve(ROOT, 'js/shared/submit.js'), 'utf8')
// form-l.js now owns _collectL2Fields which maps l2_* fields to usaha store keys
const F_SRC = readFileSync(resolve(ROOT, 'js/form-l/form-l.js'), 'utf8')

// ── DOM / environment helpers ─────────────────────────────────────────────────

const noop = () => {}

function mockDoc(elements = {}) {
  return {
    getElementById:   id  => elements[id] ?? null,
    querySelectorAll: ()  => ({ forEach: noop }),
    addEventListener: noop,
    createElement:    ()  => ({}),
  }
}

// Build usaha store from l2_* fields/radios (always 1 entry for backward compat)
function buildStoreC(fields, radios) {
  const obj = {}
  Object.keys(fields).forEach(k => { if (k.startsWith('l2_'))  obj[k]         = fields[k]; })
  Object.keys(radios).forEach(k => { if (k.startsWith('l2_'))  obj['_r_' + k] = radios[k]; })
  return [obj]
}

function runValidation({ fields = {}, radios = {}, elements = {}, usahaStore = null } = {}) {
  const store = usahaStore !== null ? usahaStore : buildStoreC(fields, radios)
  const fn = new Function(
    'document', 'window', 'getVal', 'getRadio',
    'isValidHP', 'isValidEmail', 'l5HasSig',
    '_usahaDataStore', '_activeUsahaIdx', '_collectL2Fields',
    `${V_SRC}\nreturn collectAllProblemsL();`
  )
  return fn(
    mockDoc(elements), { addEventListener: noop },
    id   => String(fields[id]  ?? ''),
    name => String(radios[name] ?? ''),
    hp   => /^(\+62|62|0)[0-9]{8,13}$/.test(hp.replace(/[\s-]/g, '')),
    em   => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em),
    false,
    store, null, null
  )
}

function runProgress({ fields = {}, radios = {}, elements = {}, usahaStore = null } = {}) {
  const store = usahaStore !== null ? usahaStore : buildStoreC(fields, radios)
  const fn = new Function(
    'document', 'window', 'getVal', 'getRadio',
    'isValidHP', 'isValidEmail', 'l5HasSig',
    '_usahaDataStore', '_activeUsahaIdx', '_collectL2Fields',
    `${P_SRC}\nreturn calcProgressL();`
  )
  return fn(
    mockDoc(elements), { addEventListener: noop },
    id   => String(fields[id]  ?? ''),
    name => String(radios[name] ?? ''),
    hp   => /^(\+62|62|0)[0-9]{8,13}$/.test(hp.replace(/[\s-]/g, '')),
    em   => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em),
    false,
    store, null, null
  )
}

// ── Field matrix ──────────────────────────────────────────────────────────────

/**
 * Unconditional B2 radio fields: always required regardless of other answers.
 * safeValue = a value that marks the field as filled WITHOUT triggering extra
 * conditional sub-fields (so delta between empty and filled is exactly +1).
 */
const UNCONDITIONAL_B2_RADIOS = [
  // field                safeValue   note
  ['l2_kawasan',          '10'],   // '10' = luar kawasan → no nama_kawasan
  ['l2_jenis_usaha',      '1'],
  ['l2_badan_usaha',      '1'],
  ['l2_pengusaha_jk',     '1'],
  ['l2_b1',               '2'],    // b1=2 & b2=2 → shows b3 gate, but b3 itself unfilled
  ['l2_b2',               '2'],
  ['l2_jaringan',         '1'],    // '1' = mandiri → no jml_cabang required
  ['l2_internet',         '2'],    // '2' = tidak → no internet_b1-b6 required
  ['l2_teknologi',        '2'],
  ['l2_ramah_a',          '2'],
  ['l2_ramah_b',          '2'],
  ['l2_kreatif',          '2'],
  ['l2_mitra_kdkmp',      '2'],
  ['l2_mbg',              '2'],
  ['l2_nonpend_a',        '2'],
  ['l2_nonpend_b',        '2'],
  ['l2_nonpend_c',        '2'],
]

/**
 * Newly-added B2 fields in this session (teknologi, ramah, kreatif, kemitraan,
 * mbg, nonpend, and the conditional internet sub-fields). Used for the
 * "delta +N" bulk tests.
 */
const NEW_B2_RADIOS = {
  l2_internet:    '2',
  l2_teknologi:   '2',
  l2_ramah_a:     '2',
  l2_ramah_b:     '2',
  l2_kreatif:     '2',
  l2_mitra_kdkmp: '2',
  l2_mbg:         '2',
  l2_nonpend_a:   '2',
  l2_nonpend_b:   '2',
  l2_nonpend_c:   '2',
}

// ── Pillar 1 × Pillar 2: Validation ↔ Progress consistency ───────────────────

describe('Consistency: B2 radio fields — validation error AND progress count', () => {
  for (const [field, safeValue] of UNCONDITIONAL_B2_RADIOS) {
    it(`${field}: empty → validation error; filled → progress filled++`, () => {
      // Pillar 1: field generates a validation error when empty
      const v = runValidation()
      expect(v.errors.some(e => e.field === field)).toBe(true)

      // Pillar 2: filling this field (with safeValue) increases progress.filled by ≥1
      const pEmpty  = runProgress()
      const pFilled = runProgress({ radios: { [field]: safeValue } })
      expect(pFilled.filled).toBeGreaterThan(pEmpty.filled)
    })
  }
})

describe('Consistency: internet_b1-b6 (16b) — both pillars agree on conditionality', () => {
  it('internet=1: validation requires b1-b6 AND progress counts 6 extra slots', () => {
    // Validation: all 6 sub-fields required
    const v = runValidation({ radios: { l2_internet: '1' } })
    for (const s of ['b1','b2','b3','b4','b5','b6'])
      expect(v.errors.some(e => e.field === 'l2_internet_' + s)).toBe(true)

    // Progress: filling all 6 adds exactly 6 to filled
    const pBase = runProgress({ radios: { l2_internet: '1' } })
    const pFull = runProgress({
      radios: {
        l2_internet: '1',
        l2_internet_b1: '1', l2_internet_b2: '1', l2_internet_b3: '2',
        l2_internet_b4: '2', l2_internet_b5: '1', l2_internet_b6: '2',
      },
    })
    expect(pFull.filled - pBase.filled).toBe(6)
  })

  it('internet=2: validation does NOT require b1-b6 AND progress does NOT count them', () => {
    // Validation: no b1-b6 errors
    const v = runValidation({ radios: { l2_internet: '2' } })
    for (const s of ['b1','b2','b3','b4','b5','b6'])
      expect(v.errors.some(e => e.field === 'l2_internet_' + s)).toBe(false)

    // Progress: filling b1-b6 does not increase filled when internet=2
    const pBase = runProgress({ radios: { l2_internet: '2' } })
    const pWithB = runProgress({
      radios: {
        l2_internet: '2',
        l2_internet_b1: '1', l2_internet_b2: '1', l2_internet_b3: '2',
        l2_internet_b4: '2', l2_internet_b5: '1', l2_internet_b6: '2',
      },
    })
    expect(pWithB.filled).toBe(pBase.filled) // b1-b6 not counted
  })

  it('internet=1: total increases by 6 vs internet=2 (extra slots)', () => {
    const pNo  = runProgress({ radios: { l2_internet: '2' } })
    const pYes = runProgress({ radios: { l2_internet: '1' } })
    expect(pYes.total - pNo.total).toBe(6)
  })
})

// ── Pillar 3: collectDataL source includes all required radio fields ───────────

describe('Consistency: Pillar 3 — usaha fields collected via _collectL2Fields in form-l.js', () => {
  /**
   * With multi-usaha architecture, form-l.js._collectL2Fields() serializes
   * all l2_* fields into the usaha store. submit.js then passes the store
   * as usaha_data JSON array. Verify field names appear in the right source.
   */

  it('submit.js collects usaha_data (JSON array of all usaha)', () => {
    expect(S_SRC).toContain('usaha_data')
    expect(S_SRC).toContain('_usahaDataStore')
  })

  const L2_FIELD_IDS = [
    'l2_internet', 'l2_internet_b1', 'l2_internet_b2', 'l2_internet_b3',
    'l2_internet_b4', 'l2_internet_b5', 'l2_internet_b6',
    'l2_teknologi', 'l2_ramah_a', 'l2_ramah_b', 'l2_kreatif',
    'l2_halal', 'l2_bpom', 'l2_mitra_kdkmp', 'l2_mbg',
    'l2_nonpend_a', 'l2_nonpend_b', 'l2_nonpend_c',
  ]

  for (const fieldId of L2_FIELD_IDS) {
    it(`'${fieldId}' is serialized by _collectL2Fields in form-l.js`, () => {
      // Field must appear in form-l.js _collectL2Fields (in textIds or radioNames)
      expect(F_SRC).toContain(fieldId)
    })
  }
})

// ── Bulk fill: validation and progress agree on completeness ──────────────────

describe('Consistency: new B2 fields — bulk fill clears errors and fills progress', () => {
  it('validation: filling all 10 new B2 radios removes all their errors', () => {
    const r = runValidation({ radios: NEW_B2_RADIOS })
    for (const field of Object.keys(NEW_B2_RADIOS))
      expect(r.errors.some(e => e.field === field)).toBe(false)
  })

  it('progress: filling all 10 new B2 radios increases filled by exactly 10', () => {
    const empty  = runProgress()
    const filled = runProgress({ radios: NEW_B2_RADIOS })
    expect(filled.filled - empty.filled).toBe(10)
  })

  it('progress: total does not change when filling unconditional B2 radios', () => {
    // Unconditional fields do not gate new sub-fields, so total stays constant.
    const empty  = runProgress()
    const filled = runProgress({ radios: NEW_B2_RADIOS })
    expect(filled.total).toBe(empty.total)
  })
})

// ── Optional field exclusions: email is optional in both validation & progress ─

describe('Consistency: optional fields excluded from both validation AND progress', () => {
  it('responden_email: no error when missing in validation', () => {
    const r = runValidation()
    expect(r.errors.some(e => e.field === 'l5_responden_email')).toBe(false)
  })

  it('responden_email: invalid format → error (soft gate: filled but wrong)', () => {
    const r = runValidation({ fields: { l5_responden_email: 'not-valid' } })
    expect(r.errors.some(e => e.field === 'l5_responden_email')).toBe(true)
  })

  it('responden_email: does not contribute to progress filled or total', () => {
    const empty  = runProgress()
    const wEmail = runProgress({ fields: { l5_responden_email: 'ok@example.com' } })
    expect(wEmail.filled).toBe(empty.filled)
    expect(wEmail.total).toBe(empty.total)
  })
})

// ── Conditional field symmetry: Blok I per-anggota ───────────────────────────

describe('Consistency: per-anggota conditional fields — validation ↔ progress agree', () => {
  it('keberadaan=1 (tinggal): BOTH require alamat_dom', () => {
    const v = runValidation({
      fields: { l1_jml_kk_anggota: '1' },
      radios: { 'l_ang_1_keberadaan': '1' },
    })
    expect(v.errors.some(e => e.field === 'l_ang_1_alamat_dom')).toBe(true)

    const pBase = runProgress({
      fields: { l1_jml_kk_anggota: '1' },
      radios: { 'l_ang_1_keberadaan': '1' },
    })
    const pWith = runProgress({
      fields: { l1_jml_kk_anggota: '1' },
      radios: { 'l_ang_1_keberadaan': '1', 'l_ang_1_alamat_dom': '1' },
    })
    expect(pWith.filled).toBe(pBase.filled + 1)
  })

  it('keberadaan=5 (anggota baru): NEITHER require alamat_dom', () => {
    const v = runValidation({
      fields: { l1_jml_kk_anggota: '1' },
      radios: { 'l_ang_1_keberadaan': '5' },
    })
    expect(v.errors.some(e => e.field === 'l_ang_1_alamat_dom')).toBe(false)

    const pBase = runProgress({
      fields: { l1_jml_kk_anggota: '1' },
      radios: { 'l_ang_1_keberadaan': '5' },
    })
    const pWith = runProgress({
      fields: { l1_jml_kk_anggota: '1' },
      radios: { 'l_ang_1_keberadaan': '5', 'l_ang_1_alamat_dom': '1' },
    })
    expect(pWith.filled).toBe(pBase.filled) // alamat_dom not counted for keb=5
  })

  it('sekolah=0: NEITHER validation NOR progress require ijazah', () => {
    const v = runValidation({
      fields: { l1_jml_kk_anggota: '1', 'l_ang_1_umur': '8' },
      radios: { 'l_ang_1_keberadaan': '1', 'l_ang_1_sekolah': '0' },
    })
    expect(v.errors.some(e => e.field === 'l_ang_1_ijazah')).toBe(false)

    const pBase = runProgress({
      fields: { l1_jml_kk_anggota: '1', 'l_ang_1_umur': '8' },
      radios: { 'l_ang_1_sekolah': '0' },
    })
    const pWith = runProgress({
      fields: { l1_jml_kk_anggota: '1', 'l_ang_1_umur': '8' },
      radios: { 'l_ang_1_sekolah': '0', 'l_ang_1_ijazah': '3' },
    })
    expect(pWith.filled).toBe(pBase.filled) // ijazah not counted for sekolah=0
  })

  it('profesi=000: NEITHER validation NOR progress require kedudukan', () => {
    const v = runValidation({
      fields: { l1_jml_kk_anggota: '1', 'l_ang_1_umur': '15', 'l_ang_1_profesi': '000' },
      radios: { 'l_ang_1_keberadaan': '1' },
    })
    expect(v.errors.some(e => e.field === 'l_ang_1_kedudukan')).toBe(false)

    const pBase = runProgress({
      fields: { l1_jml_kk_anggota: '1', 'l_ang_1_umur': '15', 'l_ang_1_profesi': '000' },
    })
    const pWith = runProgress({
      fields: { l1_jml_kk_anggota: '1', 'l_ang_1_umur': '15', 'l_ang_1_profesi': '000' },
      radios: { 'l_ang_1_kedudukan': '1' },
    })
    expect(pWith.filled).toBe(pBase.filled) // kedudukan not counted for profesi=000
  })
})

// ── Blok III material conditional symmetry ────────────────────────────────────

describe('Consistency: Blok III material kondisi — validation ↔ progress agree', () => {
  const MATERIAL_CASES = [
    // [field,          type,    exemptValues,   nonExemptValue]
    ['l3_lantai_bahan', 'lantai_kondisi',  ['7','8','9'], '1'],
    ['l3_dinding_bahan','dinding_kondisi', ['6','7'],     '1'],
    ['l3_atap_bahan',   'atap_kondisi',   ['5','7','8'], '1'],
  ]

  for (const [bahanField, kondisiField, exempts, nonExempt] of MATERIAL_CASES) {
    const exempt = exempts[0] // use first exempt value for tests

    it(`${kondisiField}: BOTH require it when ${bahanField}=${nonExempt}`, () => {
      // Validation
      const v = runValidation({ fields: { [bahanField]: nonExempt } })
      expect(v.errors.some(e => e.field === 'l3_' + kondisiField)).toBe(true)

      // Progress
      const pBase = runProgress({ fields: { [bahanField]: nonExempt } })
      const pWith = runProgress({
        fields: { [bahanField]: nonExempt },
        radios: { ['l3_' + kondisiField]: '1' },
      })
      expect(pWith.filled).toBe(pBase.filled + 1)
    })

    it(`${kondisiField}: NEITHER require it when ${bahanField}=${exempt} (exempt material)`, () => {
      // Validation
      const v = runValidation({ fields: { [bahanField]: exempt } })
      expect(v.errors.some(e => e.field === 'l3_' + kondisiField)).toBe(false)

      // Progress
      const pBase = runProgress({ fields: { [bahanField]: exempt } })
      const pWith = runProgress({
        fields: { [bahanField]: exempt },
        radios: { ['l3_' + kondisiField]: '1' },
      })
      expect(pWith.filled).toBe(pBase.filled) // kondisi not counted for exempt material
    })
  }
})

// ── Blok III tinja conditional symmetry ───────────────────────────────────────

describe('Consistency: tinja (Blok III) — validation ↔ progress agree', () => {
  it('bab=1 (jamban sendiri): BOTH require tinja', () => {
    const v = runValidation({ radios: { l3_bab: '1' } })
    expect(v.errors.some(e => e.field === 'l3_tinja')).toBe(true)

    const pBase = runProgress({ radios: { l3_bab: '1' } })
    const pWith = runProgress({ radios: { l3_bab: '1', l3_tinja: '1' } })
    expect(pWith.filled).toBe(pBase.filled + 1)
  })

  it('bab=4 (alam terbuka): NEITHER require tinja', () => {
    const v = runValidation({ radios: { l3_bab: '4' } })
    expect(v.errors.some(e => e.field === 'l3_tinja')).toBe(false)

    const pBase = runProgress({ radios: { l3_bab: '4' } })
    const pWith = runProgress({ radios: { l3_bab: '4', l3_tinja: '1' } })
    expect(pWith.filled).toBe(pBase.filled)
  })

  it('bab=5: NEITHER require tinja', () => {
    const v = runValidation({ radios: { l3_bab: '5' } })
    expect(v.errors.some(e => e.field === 'l3_tinja')).toBe(false)
  })

  it('bab=6: NEITHER require tinja', () => {
    const v = runValidation({ radios: { l3_bab: '6' } })
    expect(v.errors.some(e => e.field === 'l3_tinja')).toBe(false)
  })
})

// ── jml_keluarga: jenis_bangunan=5 excluded from both ────────────────────────

describe('Consistency: jml_keluarga — excluded when jenis_bangunan=5', () => {
  it('jb=1 (biasa): BOTH require jml_keluarga', () => {
    const v = runValidation({ radios: { l3_jenis_bangunan: '1' } })
    expect(v.errors.some(e => e.field === 'l3_jml_keluarga')).toBe(true)

    const pBase = runProgress({ radios: { l3_jenis_bangunan: '1' } })
    const pWith = runProgress({
      radios: { l3_jenis_bangunan: '1' },
      fields: { l3_jml_keluarga: '2' },
    })
    expect(pWith.filled).toBe(pBase.filled + 1)
  })

  it('jb=5 (lainnya): NEITHER require jml_keluarga', () => {
    const v = runValidation({ radios: { l3_jenis_bangunan: '5' } })
    expect(v.errors.some(e => e.field === 'l3_jml_keluarga')).toBe(false)

    const pBase = runProgress({ radios: { l3_jenis_bangunan: '5' } })
    const pWith = runProgress({
      radios: { l3_jenis_bangunan: '5' },
      fields: { l3_jml_keluarga: '2' },
    })
    expect(pWith.filled).toBe(pBase.filled) // not counted for jb=5
  })
})
