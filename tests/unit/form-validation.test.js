import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT   = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const SOURCE = readFileSync(resolve(ROOT, 'js/form-lub/form-validation.js'), 'utf8')

// ── DOM element stub ────────────────────────────────────────────────────────

function mockEl(value = '', isHidden = false) {
  return { value, classList: { contains: cls => cls === 'hidden' && isHidden } }
}

// ── Test-environment factory ────────────────────────────────────────────────

/**
 * Build a collectAllProblems() with controllable mocks.
 *
 * @param {Object} [opts]
 * @param {Object} [opts.fields]   fieldId → string returned by getVal()
 * @param {Object} [opts.radios]   radioName → string returned by getRadio()
 * @param {Object} [opts.elements] elementId → mockEl() for getElementById()
 * @param {boolean}[opts.hasSig]   signature canvas drawn flag
 */
function makeCollect({ fields = {}, radios = {}, elements = {}, hasSig = false } = {}) {
  const dom = { lokasi_lat: mockEl(''), ...elements }
  const noop = () => {}
  const mockDoc = {
    getElementById: id => dom[id] ?? null,
    querySelectorAll: () => ({ forEach: noop }),
    addEventListener: noop,
    createElement: () => ({}),
  }
  const fn = new Function(
    'document', 'window',
    'getVal', 'getRadio',
    'isValidHP', 'isValidEmail', 'parseCurrency',
    'hasSig',
    'goBlok', 'closeSidebar', 'closePetunjuk', 'closeRecap', 'submitForm', 'showRecapTab',
    `${SOURCE}\nreturn { collectAllProblems };`
  )
  return fn(
    mockDoc, { addEventListener: noop },
    id   => String(fields[id]  ?? ''),
    name => String(radios[name] ?? ''),
    hp    => /^(\+62|62|0)[0-9]{8,13}$/.test(hp.replace(/[\s-]/g, '')),
    email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
    s     => parseFloat((s || '').replace(/\./g, '').replace(',', '.')) || 0,
    hasSig,
    noop, noop, noop, noop, noop, noop
  ).collectAllProblems
}

// Convenience: build and immediately call
const collect = (opts = {}) => makeCollect(opts)()

// ── Assertion helpers ───────────────────────────────────────────────────────

const hasErr  = (r, field) => r.errors.some(e => e.field === field)
const errText = (r, field) => r.errors.find(e => e.field === field)?.text ?? null
const hasWarn = (r, field) => r.warnings.some(w => w.field === field)
const warnText = (r, field) => r.warnings.find(w => w.field === field)?.text ?? null


// ═══════════════════════════════════════════════════════════════════════════
// describe blocks
// ═══════════════════════════════════════════════════════════════════════════

describe('empty form — general', () => {
  const result = collect()   // all fields empty, no elements, hasSig=false

  it('generates at least 30 errors', () => {
    expect(result.errors.length).toBeGreaterThanOrEqual(30)
  })

  it('flags GPS koordinat as error', () => {
    expect(hasErr(result, 'lokasiBtn')).toBe(true)
  })

  it('flags signature (sigCanvas) as error', () => {
    expect(hasErr(result, 'sigCanvas')).toBe(true)
  })

  it('flags core blok-1 required fields', () => {
    for (const f of ['q1_provinsi_inp', 'q2_kabupaten_inp', 'q5a_nama_perusahaan', 'q5d'])
      expect(hasErr(result, f)).toBe(true)
  })

  it('flags blok-3 required fields (petugas & responden)', () => {
    for (const f of ['p_nama', 'r_nama', 'r_hp', 'r_email', 'r_tanggal'])
      expect(hasErr(result, f)).toBe(true)
  })
})

// ── GPS ────────────────────────────────────────────────────────────────────

describe('GPS koordinat', () => {
  it('errors when lokasi_lat is empty', () => {
    const r = collect({ elements: { lokasi_lat: mockEl('') } })
    expect(hasErr(r, 'lokasiBtn')).toBe(true)
  })

  it('no GPS error when lokasi_lat has a value', () => {
    const r = collect({ elements: { lokasi_lat: mockEl('-6.2088') } })
    expect(hasErr(r, 'lokasiBtn')).toBe(false)
  })
})

// ── NIK ────────────────────────────────────────────────────────────────────

describe('NIK (q8d)', () => {
  it('errors when NIK is empty', () => {
    expect(hasErr(collect(), 'q8d_nik')).toBe(true)
  })

  it('errors when NIK is only 15 digits', () => {
    const r = collect({ fields: { q8d_nik: '123456789012345' } })
    expect(hasErr(r, 'q8d_nik')).toBe(true)
  })

  it('errors when NIK contains letters (16 chars but non-numeric)', () => {
    const r = collect({ fields: { q8d_nik: '123456789012345X' } })
    expect(hasErr(r, 'q8d_nik')).toBe(true)
    expect(errText(r, 'q8d_nik')).toMatch(/hanya boleh berisi angka/i)
  })

  it('no NIK error for a valid 16-digit numeric string', () => {
    const r = collect({ fields: { q8d_nik: '1234567890123456' } })
    expect(hasErr(r, 'q8d_nik')).toBe(false)
  })
})

// ── Umur ───────────────────────────────────────────────────────────────────

describe('umur pengusaha (q8c)', () => {
  it('errors when age < 17', () => {
    const r = collect({ fields: { q8c_umur: '16' } })
    expect(hasErr(r, 'q8c_umur')).toBe(true)
    expect(errText(r, 'q8c_umur')).toMatch(/17/)
  })

  it('warns (not errors) for age 17–21', () => {
    const r = collect({ fields: { q8c_umur: '20' } })
    expect(hasErr(r, 'q8c_umur')).toBe(false)
    expect(hasWarn(r, 'q8c_umur')).toBe(true)
    expect(warnText(r, 'q8c_umur')).toMatch(/muda/i)
  })

  it('no error or warning for age 30', () => {
    const r = collect({ fields: { q8c_umur: '30' } })
    expect(hasErr(r, 'q8c_umur')).toBe(false)
    expect(hasWarn(r, 'q8c_umur')).toBe(false)
  })

  it('warns (not errors) for age 76–120', () => {
    const r = collect({ fields: { q8c_umur: '80' } })
    expect(hasErr(r, 'q8c_umur')).toBe(false)
    expect(hasWarn(r, 'q8c_umur')).toBe(true)
  })

  it('errors when age > 120', () => {
    const r = collect({ fields: { q8c_umur: '121' } })
    expect(hasErr(r, 'q8c_umur')).toBe(true)
  })
})

// ── Kodepos ────────────────────────────────────────────────────────────────

describe('kodepos (q5c)', () => {
  it('errors when kodepos has only 4 characters', () => {
    const r = collect({ fields: { q5c_kodepos: '1234' } })
    expect(hasErr(r, 'q5c_kodepos')).toBe(true)
  })

  it('no kodepos error for exactly 5 characters', () => {
    const r = collect({ fields: { q5c_kodepos: '12345' } })
    expect(hasErr(r, 'q5c_kodepos')).toBe(false)
  })
})

// ── Nomor HP ───────────────────────────────────────────────────────────────

describe('nomor HP (q5c_hp)', () => {
  it('errors for a number that does not start with 0/62/+62', () => {
    const r = collect({ fields: { q5c_hp: '12345678901' } })
    expect(hasErr(r, 'q5c_hp')).toBe(true)
    expect(errText(r, 'q5c_hp')).toMatch(/Format/i)
  })

  it('no phone error for valid 08xx number', () => {
    const r = collect({ fields: { q5c_hp: '081234567890' } })
    expect(hasErr(r, 'q5c_hp')).toBe(false)
  })
})

// ── Email perusahaan (opsional) ────────────────────────────────────────────

describe('email perusahaan — optional (q5c_email)', () => {
  it('empty email goes to kosong, not errors', () => {
    const r = collect({ fields: { q5c_email: '' } })
    expect(hasErr(r, 'q5c_email')).toBe(false)
    expect(r.kosong.some(k => k.label.includes('Email Perusahaan'))).toBe(true)
  })

  it('invalid email format produces an error', () => {
    const r = collect({ fields: { q5c_email: 'bukan-email' } })
    expect(hasErr(r, 'q5c_email')).toBe(true)
  })

  it('no error for valid email', () => {
    const r = collect({ fields: { q5c_email: 'info@usaha.co.id' } })
    expect(hasErr(r, 'q5c_email')).toBe(false)
  })
})

// ── RT / RW format ────────────────────────────────────────────────────────

describe('RT/RW format (q5c_rt / q5c_rw)', () => {
  it('no error when RT/RW are empty (optional fields)', () => {
    const r = collect({ fields: { q5c_rt: '', q5c_rw: '' } })
    expect(hasErr(r, 'q5c_rt')).toBe(false)
    expect(hasErr(r, 'q5c_rw')).toBe(false)
  })

  it('errors when RT contains letters', () => {
    const r = collect({ fields: { q5c_rt: '02a' } })
    expect(hasErr(r, 'q5c_rt')).toBe(true)
  })

  it('no error for numeric RT', () => {
    const r = collect({ fields: { q5c_rt: '005' } })
    expect(hasErr(r, 'q5c_rt')).toBe(false)
  })
})

// ── NIB conditional (q6a) ─────────────────────────────────────────────────

describe('NIB conditional (q6a)', () => {
  it('errors when q6a=1 (punya NIB) but NIB is empty', () => {
    const r = collect({ radios: { q6a: '1' } })
    expect(hasErr(r, 'q6b_nib')).toBe(true)
  })

  it('errors when q6a=1 and NIB is 12 digits (should be 13)', () => {
    const r = collect({ radios: { q6a: '1' }, fields: { q6b_nib: '123456789012' } })
    expect(hasErr(r, 'q6b_nib')).toBe(true)
    expect(errText(r, 'q6b_nib')).toMatch(/13/)
  })

  it('no NIB error when q6a=1 and NIB is exactly 13 digits', () => {
    const r = collect({ radios: { q6a: '1' }, fields: { q6b_nib: '1234567890123' } })
    expect(hasErr(r, 'q6b_nib')).toBe(false)
  })

  it('errors when q6a=2 and alasan (q6c) not selected', () => {
    const r = collect({ radios: { q6a: '2' } })
    expect(hasErr(r, 'q6c')).toBe(true)
  })

  it('errors when q6a=2, q6c=5 (Lainnya), alasan teks empty', () => {
    const r = collect({ radios: { q6a: '2', q6c: '5' }, fields: { q6c_alasan: '' } })
    expect(hasErr(r, 'q6c_alasan')).toBe(true)
  })

  it('no q6c_alasan error when q6c=5 and alasan text is filled', () => {
    const r = collect({ radios: { q6a: '2', q6c: '5' }, fields: { q6c_alasan: 'Belum daftar OSS' } })
    expect(hasErr(r, 'q6c_alasan')).toBe(false)
  })
})

// ── Badan usaha koperasi (q7a=3) ──────────────────────────────────────────

describe('badan usaha koperasi (q7a=3)', () => {
  it('errors for missing q7b when q7a=3', () => {
    const r = collect({ radios: { q7a: '3' } })
    expect(hasErr(r, 'q7b')).toBe(true)
  })

  it('errors for missing q7c when q7a=3', () => {
    const r = collect({ radios: { q7a: '3' } })
    expect(hasErr(r, 'q7c')).toBe(true)
  })

  it('no q7b/q7c error when q7a ≠ 3', () => {
    const r = collect({ radios: { q7a: '1' } })
    expect(hasErr(r, 'q7b')).toBe(false)
    expect(hasErr(r, 'q7c')).toBe(false)
  })
})

// ── Kegiatan usaha cascade (q9b) ──────────────────────────────────────────

describe('kegiatan usaha cascade (q9b)', () => {
  it('q9b3 required when b1=Tidak AND b2=Tidak', () => {
    const r = collect({ radios: { q9b1: '2', q9b2: '2' } })
    expect(hasErr(r, 'q9b3')).toBe(true)
  })

  it('q9b3 NOT required when b1=Ya', () => {
    const r = collect({ radios: { q9b1: '1', q9b2: '2' } })
    expect(hasErr(r, 'q9b3')).toBe(false)
  })

  it('q9b4 required when b1=Tidak, b2=Tidak, b3=Tidak', () => {
    const r = collect({ radios: { q9b1: '2', q9b2: '2', q9b3: '2' } })
    expect(hasErr(r, 'q9b4')).toBe(true)
  })

  it('q9b4 NOT required when b3=Ya (sells goods → stops cascade)', () => {
    const r = collect({ radios: { q9b1: '2', q9b2: '2', q9b3: '1' } })
    expect(hasErr(r, 'q9b4')).toBe(false)
  })

  it('q9d & q9e required when b1=Ya (manufacturing) AND b2=Tidak', () => {
    const r = collect({ radios: { q9b1: '1', q9b2: '2' } })
    expect(hasErr(r, 'q9d_input')).toBe(true)
    expect(hasErr(r, 'q9e_proses')).toBe(true)
  })

  it('q9c required when b2=Ya (food/beverage path)', () => {
    const r = collect({ radios: { q9b1: '1', q9b2: '1' } })
    expect(hasErr(r, 'q9c')).toBe(true)
  })

  it('q9d/q9e NOT required when b1=Tidak (non-manufacturing)', () => {
    const r = collect({ radios: { q9b1: '2', q9b2: '2', q9b3: '2', q9b4: '1' } })
    expect(hasErr(r, 'q9d_input')).toBe(false)
    expect(hasErr(r, 'q9e_proses')).toBe(false)
  })
})

// ── Persentase online (q23d) ───────────────────────────────────────────────

describe('persentase penjualan online (q23d)', () => {
  it('errors when q23d is empty string', () => {
    const r = collect({ fields: { q23d: '' } })
    expect(hasErr(r, 'q23d')).toBe(true)
    expect(errText(r, 'q23d')).toMatch(/Harus diisi/i)
  })

  it('errors when q23d > 100', () => {
    const r = collect({ fields: { q23d: '150' } })
    expect(hasErr(r, 'q23d')).toBe(true)
    expect(errText(r, 'q23d')).toMatch(/0.100/)
  })

  it('errors when q23d is negative', () => {
    const r = collect({ fields: { q23d: '-5' } })
    expect(hasErr(r, 'q23d')).toBe(true)
  })

  it('no q23d error for value 0', () => {
    const r = collect({ fields: { q23d: '0' } })
    expect(hasErr(r, 'q23d')).toBe(false)
  })

  it('no q23d error for value 100', () => {
    const r = collect({ fields: { q23d: '100' } })
    expect(hasErr(r, 'q23d')).toBe(false)
  })
})

// ── Modal kepemilikan (q25 sum) ────────────────────────────────────────────

describe('kepemilikan modal (q25 — must sum to 100%)', () => {
  it('errors when components sum to 80%', () => {
    const r = collect({ fields: { q25a: '60', q25b: '20', q25c: '0', q25d: '0', q25e: '0', q25f: '0' } })
    expect(hasErr(r, 'q25a')).toBe(true)
    expect(errText(r, 'q25a')).toMatch(/80/)
  })

  it('no sum error when components total exactly 100', () => {
    const r = collect({ fields: { q25a: '60', q25b: '40', q25c: '0', q25d: '0', q25e: '0', q25f: '0' } })
    expect(hasErr(r, 'q25a')).toBe(false)
  })

  it('errors when any q25 component is missing (blank)', () => {
    const r = collect({ fields: { q25a: '100', q25b: '', q25c: '0', q25d: '0', q25e: '0', q25f: '0' } })
    expect(hasErr(r, 'q25a')).toBe(true)
  })
})

// ── Jumlah pekerja warnings ────────────────────────────────────────────────

describe('jumlah pekerja warnings (q20)', () => {
  it('warns when total workers = 0 (both q20a and q20b zero)', () => {
    const r = collect({ fields: { q20a: '0', q20b: '0' } })
    expect(hasWarn(r, 'q20a')).toBe(true)
  })

  it('warns when total workers > 5000', () => {
    const r = collect({ fields: { q20a: '4000', q20b: '2000' } })
    expect(hasWarn(r, 'q20a')).toBe(true)
    expect(warnText(r, 'q20a')).toMatch(/sangat besar/i)
  })

  it('no worker warning for a reasonable count', () => {
    const r = collect({ fields: { q20a: '3', q20b: '2' } })
    expect(hasWarn(r, 'q20a')).toBe(false)
  })
})

// ── Tahun beroperasi ───────────────────────────────────────────────────────

describe('tahun beroperasi (q21)', () => {
  it('errors when year < 1900', () => {
    const r = collect({ fields: { q21: '1899' } })
    expect(hasErr(r, 'q21')).toBe(true)
    expect(errText(r, 'q21')).toMatch(/1900/)
  })

  it('no error for boundary year 1900', () => {
    const r = collect({ fields: { q21: '1900' } })
    expect(hasErr(r, 'q21')).toBe(false)
  })

  it('no error for year 2024', () => {
    const r = collect({ fields: { q21: '2024' } })
    expect(hasErr(r, 'q21')).toBe(false)
  })

  it('warns (not errors) for year ≥ 2025 (sangat baru)', () => {
    const r = collect({ fields: { q21: '2025' } })
    expect(hasErr(r, 'q21')).toBe(false)
    expect(hasWarn(r, 'q21')).toBe(true)
    expect(warnText(r, 'q21')).toMatch(/sangat baru/i)
  })

  it('errors when year > 2026', () => {
    const r = collect({ fields: { q21: '2027' } })
    expect(hasErr(r, 'q21')).toBe(true)
  })
})

// ── Financial ratio warning ────────────────────────────────────────────────

describe('rasio keuangan (q22f vs q23c)', () => {
  it('warns when pendapatan jauh lebih kecil dari pengeluaran (< 5%)', () => {
    const r = collect({ fields: { q22f: '1000000', q23c: '10000' } })
    expect(hasWarn(r, 'q23a')).toBe(true)
  })

  it('no ratio warning when pendapatan is reasonable', () => {
    const r = collect({ fields: { q22f: '1000000', q23c: '800000' } })
    expect(hasWarn(r, 'q23a')).toBe(false)
  })
})

// ── L.KP branch validation ────────────────────────────────────────────────

describe('L.KP validasi cabang', () => {
  it('skips LKP checks entirely when q10a ≠ 2', () => {
    const r = collect({ radios: { q10a: '1' } })
    expect(r.errors.some(e => e.label.startsWith('L.KP'))).toBe(false)
  })

  it('errors when branch nama is empty (q10a=2, 1 branch)', () => {
    const r = collect({
      radios: { q10a: '2' },
      fields: { q10b_jumlah: '1' },
      elements: {
        'lkp_1_nama':    mockEl(''),
        'lkp_1_jenis':   mockEl('1'),
        'lkp_1_provinsi':mockEl('31'),
        'lkp_1_pekerja': mockEl('5'),
      },
    })
    expect(hasErr(r, 'lkp_1_nama')).toBe(true)
  })

  it('errors when branch provinsi is empty', () => {
    const r = collect({
      radios: { q10a: '2' },
      fields: { q10b_jumlah: '1' },
      elements: {
        'lkp_1_nama':    mockEl('Cabang Jakarta'),
        'lkp_1_jenis':   mockEl('1'),
        'lkp_1_provinsi':mockEl(''),
        'lkp_1_pekerja': mockEl('5'),
      },
    })
    expect(hasErr(r, 'lkp_1_provinsi')).toBe(true)
  })

  it('errors when branch pekerja is blank (even "0" is valid)', () => {
    const r = collect({
      radios: { q10a: '2' },
      fields: { q10b_jumlah: '1' },
      elements: {
        'lkp_1_nama':    mockEl('Cabang Jakarta'),
        'lkp_1_jenis':   mockEl('1'),
        'lkp_1_provinsi':mockEl('31'),
        'lkp_1_pekerja': mockEl(''),     // blank → error
      },
    })
    expect(hasErr(r, 'lkp_1_pekerja')).toBe(true)
  })

  it('no LKP errors when all branch fields are filled (0 pekerja is valid)', () => {
    const r = collect({
      radios: { q10a: '2' },
      fields: { q10b_jumlah: '1' },
      elements: {
        'lkp_1_nama':    mockEl('Cabang Jakarta'),
        'lkp_1_jenis':   mockEl('1'),
        'lkp_1_provinsi':mockEl('31'),
        'lkp_1_pekerja': mockEl('0'),    // "0" is valid
      },
    })
    expect(r.errors.filter(e => e.label.includes('Cabang #1')).length).toBe(0)
  })
})

// ── Q11 kantor pusat (conditional) ────────────────────────────────────────

describe('Q11 kantor pusat (conditional on q11_wrap visibility)', () => {
  it('skips Q11 validation when q11_wrap is hidden', () => {
    const r = collect({ elements: { q11_wrap: mockEl('', true) } })
    expect(r.errors.some(e => e.label.includes('11'))).toBe(false)
  })

  it('requires q11a and q11b when q11_wrap is visible', () => {
    const r = collect({
      elements: {
        q11_wrap:    mockEl('', false),   // visible
        q11d_negara: mockEl('SG'),        // foreign → skip 11e/11f
      },
    })
    expect(hasErr(r, 'q11a_nama')).toBe(true)
    expect(hasErr(r, 'q11b_alamat')).toBe(true)
  })

  it('requires q11e & q11f when negara = ID', () => {
    const r = collect({
      elements: {
        q11_wrap:    mockEl('', false),
        q11d_negara: mockEl('ID'),
      },
    })
    expect(hasErr(r, 'q11e_provinsi_inp')).toBe(true)
    expect(hasErr(r, 'q11f_kabupaten_inp')).toBe(true)
  })

  it('no q11e/q11f error when negara ≠ ID', () => {
    const r = collect({
      elements: {
        q11_wrap:    mockEl('', false),
        q11d_negara: mockEl('US'),
      },
    })
    expect(hasErr(r, 'q11e_provinsi_inp')).toBe(false)
    expect(hasErr(r, 'q11f_kabupaten_inp')).toBe(false)
  })
})

// ── Hotel classification (q9i conditional) ────────────────────────────────

describe('Q9i klasifikasi hotel (conditional on q9i_hotel_wrap)', () => {
  it('skips q9i when q9i_hotel_wrap is null (element absent)', () => {
    const r = collect()    // no q9i_hotel_wrap element → no check
    expect(hasErr(r, 'q9i')).toBe(false)
  })

  it('skips q9i when q9i_hotel_wrap is hidden', () => {
    const r = collect({ elements: { q9i_hotel_wrap: mockEl('', true) } })
    expect(hasErr(r, 'q9i')).toBe(false)
  })

  it('errors when q9i_hotel_wrap is visible and q9i not selected', () => {
    const r = collect({ elements: { q9i_hotel_wrap: mockEl('', false) } })
    expect(hasErr(r, 'q9i')).toBe(true)
  })
})

// ── Signature ─────────────────────────────────────────────────────────────

describe('tanda tangan (hasSig)', () => {
  it('errors when hasSig = false', () => {
    const r = collect({ hasSig: false })
    expect(hasErr(r, 'sigCanvas')).toBe(true)
  })

  it('no signature error when hasSig = true', () => {
    const r = collect({ hasSig: true })
    expect(hasErr(r, 'sigCanvas')).toBe(false)
  })
})

// ── Blok 3 — responden & petugas ──────────────────────────────────────────

describe('blok 3 — petugas & responden', () => {
  it('errors when p_nama is empty', () => {
    expect(hasErr(collect(), 'p_nama')).toBe(true)
  })

  it('errors when r_nama is empty', () => {
    expect(hasErr(collect(), 'r_nama')).toBe(true)
  })

  it('errors when r_hp has an invalid format', () => {
    const r = collect({ fields: { r_hp: 'bukan-hp' } })
    expect(hasErr(r, 'r_hp')).toBe(true)
  })

  it('no r_hp error for valid number', () => {
    const r = collect({ fields: { r_hp: '081234567890' } })
    expect(hasErr(r, 'r_hp')).toBe(false)
  })

  it('errors when r_email has an invalid format', () => {
    const r = collect({ fields: { r_email: 'bukan-email' } })
    expect(hasErr(r, 'r_email')).toBe(true)
  })

  it('no r_email error for valid email', () => {
    const r = collect({ fields: { r_email: 'petugas@bps.go.id' } })
    expect(hasErr(r, 'r_email')).toBe(false)
  })
})
