import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT   = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const SOURCE = readFileSync(resolve(ROOT, 'js/form-lub/form-progress.js'), 'utf8')

function mockEl(value = '', isHidden = false) {
  return { value, classList: { contains: cls => cls === 'hidden' && isHidden } }
}

function makeCalc({ fields = {}, radios = {}, elements = {}, hasSig = false } = {}) {
  const noop = () => {}
  const dom  = { ...elements }
  const mockDoc = {
    getElementById:  id => dom[id] ?? null,
    querySelectorAll: () => ({ forEach: noop }),
    addEventListener: noop,
    createElement:   () => ({}),
  }
  const fn = new Function(
    'document', 'window',
    'getVal', 'getRadio',
    'isValidHP', 'isValidEmail',
    'hasSig',
    `${SOURCE}\nreturn { calcProgress };`
  )
  return fn(
    mockDoc, { addEventListener: noop },
    id    => String(fields[id]  ?? ''),
    name  => String(radios[name] ?? ''),
    hp    => /^(\+62|62|0)[0-9]{8,13}$/.test(hp.replace(/[\s-]/g, '')),
    email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
    hasSig
  ).calcProgress
}

const calc = (opts = {}) => makeCalc(opts)()

// ─── BASELINE ───────────────────────────────────────────────────────────────

describe('calcProgress() — baseline', () => {
  it('empty form: pct=0, filled=0, total=59', () => {
    const r = calc()
    expect(r.pct).toBe(0)
    expect(r.filled).toBe(0)
    expect(r.total).toBe(59)
  })

  it('returns numeric pct, filled, total', () => {
    const r = calc()
    expect(typeof r.pct).toBe('number')
    expect(typeof r.filled).toBe('number')
    expect(typeof r.total).toBe('number')
  })

  it('pct equals Math.round(filled / total * 100)', () => {
    const r = calc({ fields: { q1_provinsi: 'Bali' } })
    expect(r.pct).toBe(Math.round(r.filled / r.total * 100))
  })

  it('complete minimal form reaches pct=100', () => {
    // covers all base fields; q6a=2, q9b3/q9b4 paths, q25 sum check
    const r = calc({
      fields: {
        q1_provinsi: 'Bali', q2_kabupaten: 'Badung',
        q3_kecamatan: 'Kuta', q4_kelurahan: 'Kuta',
        q5a_nama_perusahaan: 'PT X', q5b_nama_komersial: 'X',
        q5c_alamat: 'Jl. A', q5c_kodepos: '80361',
        q5c_hp: '081234567890',
        q8a_nama: 'Budi', q8c_umur: '35', q8d_nik: '5171020101900001',
        q9a_kegiatan: 'Dagang', q9f_produk: 'Beras', q9g_kbli_kode: '47110',
        q20a: '2', q20b: '1',
        q21: '2010',
        q22a: '1000', q22b: '2000', q22c: '3000', q22d: '500', q22e: '200',
        q23a: '10000', q23d: '0',
        q24a: '5000', q24b: '3000', q24d: '200',
        q25a: '60', q25b: '20', q25c: '10', q25d: '5', q25e: '3', q25f: '2',
        r_nama: 'Petugas A', r_hp: '081234567890',
        r_email: 'a@b.com', r_tanggal: '2026-01-01',
      },
      radios: {
        q5d: '10',
        q6a: '2', q6c: '1',
        q7a: '1', q7d: '1',
        q8b: '1',
        q9b1: '2', q9b2: '2', q9b3: '2', q9b4: '1',
        q10a: '1',
        q12a: '2', q12c: '1',
        q13a: '1', q13b: '1', q14: '1',
        q15a: '2', q16a: '2',
        q17: '1', q18: '1',
        q19a: '1', q19b: '1', q19c: '1',
      },
      hasSig: true,
    })
    expect(r.pct).toBe(100)
    expect(r.filled).toBe(r.total)
  })
})

// ─── Q1–Q4: REGIONAL ────────────────────────────────────────────────────────

describe('Q1–Q4: regional', () => {
  it('setting q1_provinsi increases filled by 1', () => {
    const r = calc({ fields: { q1_provinsi: 'Bali' } })
    expect(r.filled).toBe(1)
  })

  it('all four regional fields filled: filled=4', () => {
    const r = calc({
      fields: {
        q1_provinsi: 'Bali', q2_kabupaten: 'Badung',
        q3_kecamatan: 'Kuta', q4_kelurahan: 'Kuta',
      },
    })
    expect(r.filled).toBe(4)
  })
})

// ─── Q5: IDENTITAS PERUSAHAAN ───────────────────────────────────────────────

describe('Q5: identitas perusahaan', () => {
  it('kodepos of exactly 5 chars counts', () => {
    const yes = calc({ fields: { q5c_kodepos: '80361' } })
    const no  = calc()
    expect(yes.filled).toBe(no.filled + 1)
  })

  it('kodepos of 4 chars does not count', () => {
    const r = calc({ fields: { q5c_kodepos: '8036' } })
    expect(r.filled).toBe(0)
  })

  it('valid HP counts', () => {
    const r = calc({ fields: { q5c_hp: '081234567890' } })
    expect(r.filled).toBe(1)
  })

  it('invalid HP does not count', () => {
    const r = calc({ fields: { q5c_hp: '12345' } })
    expect(r.filled).toBe(0)
  })

  it('q5d non-"10" adds q5e_nama_kawasan to total', () => {
    const base = calc()
    const r    = calc({ radios: { q5d: '1' } })
    expect(r.total).toBe(base.total + 1)
  })

  it('q5d="10" (luar kawasan) does NOT add q5e to total', () => {
    const base = calc()
    const r    = calc({ radios: { q5d: '10' } })
    expect(r.total).toBe(base.total)
  })
})

// ─── Q6: NIB ────────────────────────────────────────────────────────────────

describe('Q6: NIB', () => {
  it('q6a="1" adds NIB field to total', () => {
    const base = calc()
    const r    = calc({ radios: { q6a: '1' } })
    expect(r.total).toBe(base.total + 1)
  })

  it('q6a="1" with valid 13-digit NIB fills both fields', () => {
    const r = calc({ radios: { q6a: '1' }, fields: { q6b_nib: '1234567890123' } })
    expect(r.filled).toBe(2)
  })

  it('q6a="1" with wrong-length NIB does not fill NIB field', () => {
    const r = calc({ radios: { q6a: '1' }, fields: { q6b_nib: '123' } })
    expect(r.filled).toBe(1) // q6a filled, q6b not
  })

  it('q6a="2" adds q6c to total', () => {
    const base = calc()
    const r    = calc({ radios: { q6a: '2' } })
    expect(r.total).toBe(base.total + 1)
  })

  it('q6c="5" adds alasan field to total', () => {
    const base = calc()
    const r    = calc({ radios: { q6a: '2', q6c: '5' } })
    expect(r.total).toBe(base.total + 2) // q6c + q6c_alasan
  })
})

// ─── Q7: BADAN USAHA ────────────────────────────────────────────────────────

describe('Q7: badan usaha', () => {
  it('q7a="3" (koperasi) adds q7b and q7c to total', () => {
    const base = calc()
    const r    = calc({ radios: { q7a: '3' } })
    expect(r.total).toBe(base.total + 2)
  })

  it('q7a="3" with both q7b and q7c filled counts them', () => {
    const base = calc()
    const r    = calc({ radios: { q7a: '3', q7b: '1', q7c: '2' } })
    expect(r.filled).toBe(base.filled + 3) // q7a + q7b + q7c
  })
})

// ─── Q8: PENGUSAHA ──────────────────────────────────────────────────────────

describe('Q8: pengusaha', () => {
  it('umur 17–120 counts', () => {
    const yes = calc({ fields: { q8c_umur: '35' } })
    const no  = calc()
    expect(yes.filled).toBe(no.filled + 1)
  })

  it('umur 17 (boundary) counts', () => {
    expect(calc({ fields: { q8c_umur: '17' } }).filled).toBe(1)
  })

  it('umur 16 (below minimum) does not count', () => {
    expect(calc({ fields: { q8c_umur: '16' } }).filled).toBe(0)
  })

  it('umur 121 (above maximum) does not count', () => {
    expect(calc({ fields: { q8c_umur: '121' } }).filled).toBe(0)
  })

  it('NIK of exactly 16 chars counts', () => {
    const r = calc({ fields: { q8d_nik: '1234567890123456' } })
    expect(r.filled).toBe(1)
  })

  it('NIK of 15 chars does not count', () => {
    expect(calc({ fields: { q8d_nik: '123456789012345' } }).filled).toBe(0)
  })
})

// ─── Q9: KEGIATAN PATHS ─────────────────────────────────────────────────────

describe('Q9: kegiatan paths', () => {
  it('show3 path (b1=2, b2=2) adds q9b3 to total', () => {
    const base = calc()
    const r    = calc({ radios: { q9b1: '2', q9b2: '2' } })
    expect(r.total).toBe(base.total + 1)
  })

  it('show4 path (b3=2) adds q9b4 to total', () => {
    const base = calc()
    const r    = calc({ radios: { q9b1: '2', q9b2: '2', q9b3: '2' } })
    expect(r.total).toBe(base.total + 2) // q9b3 + q9b4
  })

  it('showC path (b2=1) adds q9c to total', () => {
    const base = calc()
    const r    = calc({ radios: { q9b1: '2', q9b2: '1' } })
    expect(r.total).toBe(base.total + 1) // q9c
  })

  it('showDE path (b1=1, b2=2) adds q9d and q9e to total', () => {
    const base = calc()
    const r    = calc({ radios: { q9b1: '1', q9b2: '2' } })
    expect(r.total).toBe(base.total + 2) // q9d + q9e
  })
})

// ─── Q9i: HOTEL WRAP ────────────────────────────────────────────────────────

describe('Q9i: hotel wrap', () => {
  it('visible hotel wrap adds q9i to total', () => {
    const base = calc()
    const r    = calc({ elements: { 'q9i_hotel_wrap': mockEl('', false) } })
    expect(r.total).toBe(base.total + 1)
  })

  it('hidden hotel wrap does NOT add q9i', () => {
    const base = calc()
    const r    = calc({ elements: { 'q9i_hotel_wrap': mockEl('', true) } })
    expect(r.total).toBe(base.total)
  })

  it('visible hotel wrap with q9i set counts it', () => {
    const base = calc()
    const r    = calc({
      elements: { 'q9i_hotel_wrap': mockEl('', false) },
      radios: { q9i: '2' },
    })
    expect(r.filled).toBe(base.filled + 1)
  })
})

// ─── Q10 / Q11: JARINGAN & KANTOR PUSAT ────────────────────────────────────

describe('Q10 / Q11: jaringan dan kantor pusat', () => {
  it('q10a="2" adds q10b to total', () => {
    const base = calc()
    const r    = calc({ radios: { q10a: '2' } })
    expect(r.total).toBe(base.total + 1)
  })

  it('visible q11_wrap (non-ID) adds 3 fields to total', () => {
    const base = calc()
    const r    = calc({
      elements: {
        'q11_wrap':      mockEl('', false),
        'q11d_negara':   mockEl('US'),
      },
    })
    expect(r.total).toBe(base.total + 3) // q11a, q11b, q11c
  })

  it('q11d_negara="ID" adds 2 more (prov + kab) to total', () => {
    const base = calc()
    const r    = calc({
      elements: {
        'q11_wrap':    mockEl('', false),
        'q11d_negara': mockEl('ID'),
      },
    })
    expect(r.total).toBe(base.total + 5) // q11a,b,c + q11e,f
  })

  it('hidden q11_wrap does NOT add any q11 fields', () => {
    const base = calc()
    const r    = calc({ elements: { 'q11_wrap': mockEl('', true) } })
    expect(r.total).toBe(base.total)
  })
})

// ─── L.KP: CABANG ───────────────────────────────────────────────────────────

describe('L.KP: cabang', () => {
  it('q10a=2 with 2 fully-filled branches adds 9 to total and counts all', () => {
    const r = calc({
      radios: { q10a: '2' },
      fields: { q10b_jumlah: '2' },
      elements: {
        'lkp_1_nama':     mockEl('Cabang A'),
        'lkp_1_jenis':    mockEl('1'),
        'lkp_1_provinsi': mockEl('51'),
        'lkp_1_pekerja':  mockEl('5'),
        'lkp_2_nama':     mockEl('Cabang B'),
        'lkp_2_jenis':    mockEl('2'),
        'lkp_2_provinsi': mockEl('32'),
        'lkp_2_pekerja':  mockEl('3'),
      },
    })
    expect(r.total).toBe(59 + 1 + 8)   // base + q10b + 2 branches × 4 fields
    expect(r.filled).toBe(1 + 1 + 8)   // q10a + q10b + all branch fields
  })

  it('pekerja="0" (zero workers) still counts for progress', () => {
    const r = calc({
      radios: { q10a: '2' },
      fields: { q10b_jumlah: '1' },
      elements: {
        'lkp_1_nama':     mockEl('Cabang A'),
        'lkp_1_jenis':    mockEl('1'),
        'lkp_1_provinsi': mockEl('51'),
        'lkp_1_pekerja':  mockEl('0'), // value is '0', not ''
      },
    })
    const branchFilled = r.filled - 1 - 1 // subtract q10a and q10b
    expect(branchFilled).toBe(4)
  })
})

// ─── Q12: INTERNET ──────────────────────────────────────────────────────────

describe('Q12: internet', () => {
  it('q12a="1" adds 6 q12b sub-fields to total', () => {
    const base = calc()
    const r    = calc({ radios: { q12a: '1' } })
    expect(r.total).toBe(base.total + 6)
  })

  it('q12a="2" (tidak) adds no extra fields', () => {
    const base = calc()
    const r    = calc({ radios: { q12a: '2' } })
    expect(r.total).toBe(base.total)
  })
})

// ─── Q15 / Q16: HALAL & BPOM ────────────────────────────────────────────────

describe('Q15 / Q16: halal dan BPOM', () => {
  it('q15a="1" adds q15b and q15c to total', () => {
    const base = calc()
    const r    = calc({ radios: { q15a: '1' } })
    expect(r.total).toBe(base.total + 2)
  })

  it('q16a="1" adds q16b and q16c to total', () => {
    const base = calc()
    const r    = calc({ radios: { q16a: '1' } })
    expect(r.total).toBe(base.total + 2)
  })
})

// ─── Q20–Q21: PEKERJA & TAHUN ───────────────────────────────────────────────

describe('Q20–Q21: pekerja dan tahun beroperasi', () => {
  it('q20a="0" (non-empty string) counts', () => {
    const yes = calc({ fields: { q20a: '0' } })
    const no  = calc()
    expect(yes.filled).toBe(no.filled + 1)
  })

  it('q20a empty string does not count', () => {
    expect(calc().filled).toBe(0)
  })

  it('valid year 2010 counts', () => {
    const yes = calc({ fields: { q21: '2010' } })
    const no  = calc()
    expect(yes.filled).toBe(no.filled + 1)
  })

  it('boundary year 1900 counts', () => {
    expect(calc({ fields: { q21: '1900' } }).filled).toBe(1)
  })

  it('year 1899 (below range) does not count', () => {
    expect(calc({ fields: { q21: '1899' } }).filled).toBe(0)
  })

  it('year 2027 (above range) does not count', () => {
    expect(calc({ fields: { q21: '2027' } }).filled).toBe(0)
  })
})

// ─── Q23d: PERSENTASE ONLINE ─────────────────────────────────────────────────

describe('Q23d: persentase online', () => {
  it('"0" counts (zero percent is valid)', () => {
    const yes = calc({ fields: { q23d: '0' } })
    const no  = calc()
    expect(yes.filled).toBe(no.filled + 1)
  })

  it('"50.5" counts', () => {
    const yes = calc({ fields: { q23d: '50.5' } })
    const no  = calc()
    expect(yes.filled).toBe(no.filled + 1)
  })

  it('"150" (above 100) does not count', () => {
    expect(calc({ fields: { q23d: '150' } }).filled).toBe(0)
  })

  it('non-numeric string does not count', () => {
    expect(calc({ fields: { q23d: 'abc' } }).filled).toBe(0)
  })
})

// ─── Q25: MODAL ─────────────────────────────────────────────────────────────

describe('Q25: kepemilikan modal', () => {
  it('all six q25 fields filled adds sum-check item to total', () => {
    const base = calc()
    const r    = calc({
      fields: { q25a: '60', q25b: '20', q25c: '10', q25d: '5', q25e: '3', q25f: '2' },
    })
    expect(r.total).toBe(base.total + 1) // sum-check item added
  })

  it('sum=100 counts the sum-check item', () => {
    const base = calc()
    const r    = calc({
      fields: { q25a: '60', q25b: '20', q25c: '10', q25d: '5', q25e: '3', q25f: '2' },
    })
    expect(r.filled).toBe(base.filled + 6 + 1) // 6 individual + 1 sum check
  })

  it('sum≠100 does not count the sum-check item', () => {
    const base = calc()
    const r    = calc({
      fields: { q25a: '50', q25b: '20', q25c: '10', q25d: '5', q25e: '3', q25f: '2' }, // sum=90
    })
    expect(r.filled).toBe(base.filled + 6) // 6 individual only; sum check fails
  })
})

// ─── BLOK III: RESPONDEN & TANDA TANGAN ─────────────────────────────────────

describe('Blok III: responden dan tanda tangan', () => {
  it('hasSig=true counts the signature', () => {
    const withSig = calc({ hasSig: true })
    const noSig   = calc({ hasSig: false })
    expect(withSig.filled).toBe(noSig.filled + 1)
  })

  it('valid r_hp counts', () => {
    const yes = calc({ fields: { r_hp: '081234567890' } })
    const no  = calc()
    expect(yes.filled).toBe(no.filled + 1)
  })

  it('invalid r_hp does not count', () => {
    expect(calc({ fields: { r_hp: '12345' } }).filled).toBe(0)
  })

  it('valid r_email counts', () => {
    const yes = calc({ fields: { r_email: 'petugas@bps.go.id' } })
    const no  = calc()
    expect(yes.filled).toBe(no.filled + 1)
  })

  it('invalid r_email does not count', () => {
    expect(calc({ fields: { r_email: 'notanemail' } }).filled).toBe(0)
  })
})
