import { extractFrom } from '../helpers/load-source.js'

const { getKategoriFromKode, wordOverlapScore, scoreKBLI, getKategoriName } =
  extractFrom('js/shared/kbli.js', 'getKategoriFromKode', 'wordOverlapScore', 'scoreKBLI', 'getKategoriName')

/* ─────────────── getKategoriFromKode() ─────────────── */
describe('getKategoriFromKode()', () => {
  it.each([
    // [kode, expected]
    ['01',   'A'], // Pertanian
    ['03',   'A'],
    ['05',   'B'], // Pertambangan
    ['09',   'B'],
    ['10',   'C'], // Industri Pengolahan
    ['33',   'C'],
    ['35',   'D'], // Listrik & Gas
    ['36',   'E'], // Air & Sampah
    ['39',   'E'],
    ['41',   'F'], // Konstruksi
    ['43',   'F'],
    ['45',   'G'], // Perdagangan
    ['47',   'G'],
    ['49',   'H'], // Transportasi
    ['53',   'H'],
    ['55',   'I'], // Akomodasi & Makan Minum (hotel/resto)
    ['5610', 'I'], // prefixed kode — substring(0,2) = '56'
    ['64',   'K'], // Keuangan
    ['68',   'L'], // Real Estat
    ['85',   'P'], // Pendidikan
    ['99',   'U'], // Badan Internasional
  ])('kode "%s" → kategori "%s"', (kode, expected) => {
    expect(getKategoriFromKode(kode)).toBe(expected)
  })

  it.each([
    ['00', ''], // below range
    ['04', ''], // gap between A(1-3) and B(5-9)
    ['34', ''], // gap between C(10-33) and D(35)
    ['40', ''], // gap between E(36-39) and F(41-43)
    ['67', ''], // gap between K(64-66) and L(68)
    ['83', ''], // gap between N(77-82) and O(84)
  ])('kode "%s" in undefined range → ""', (kode, expected) => {
    expect(getKategoriFromKode(kode)).toBe(expected)
  })

  it.each([null, undefined, ''])('returns "" for falsy input %s', (v) => {
    expect(getKategoriFromKode(v)).toBe('')
  })
})

/* ─────────────── wordOverlapScore() ─────────────── */
describe('wordOverlapScore()', () => {
  it('returns 0 when no words match', () => {
    expect(wordOverlapScore('industri pengolahan', ['makanan', 'minuman'], 35)).toBe(0)
  })

  it('returns full baseScore when all words match', () => {
    expect(wordOverlapScore('usaha makanan dan minuman segar', ['makanan', 'minuman'], 35)).toBe(35)
  })

  it('returns proportional score for partial overlap (1 of 2 words)', () => {
    // 1/2 * 35 = 17.5 → Math.round → 18
    expect(wordOverlapScore('usaha makanan', ['makanan', 'minuman'], 35)).toBe(18)
  })

  it('returns 0 when qWords is empty', () => {
    expect(wordOverlapScore('apapun', [], 35)).toBe(0)
  })
})

/* ─────────────── scoreKBLI() ─────────────── */
describe('scoreKBLI()', () => {
  const makeEntry = (kode, judul, uraian) => ({
    kode, kodeLower: kode.toLowerCase(),
    judul, judulLower: judul.toLowerCase(),
    uraian, uraianLower: uraian.toLowerCase(),
  })

  it('scores exact kode match at ≥ 100', () => {
    const d = makeEntry('56101', 'Restoran', 'Usaha penyediaan makanan')
    expect(scoreKBLI(d, '56101', ['56101'])).toBeGreaterThanOrEqual(100)
  })

  it('scores kode prefix match at 80', () => {
    const d = makeEntry('56101', 'Restoran', 'xyz')
    // query '561' is a prefix of '56101'
    expect(scoreKBLI(d, '561', ['561'])).toBe(80)
  })

  it('scores exact judul match at ≥ 90', () => {
    const d = makeEntry('99999', 'Restoran', 'xyz')
    expect(scoreKBLI(d, 'restoran', ['restoran'])).toBeGreaterThanOrEqual(90)
  })

  it('scores uraian contains match at 20', () => {
    const d = makeEntry('99999', 'xyz', 'Usaha penyediaan makanan')
    expect(scoreKBLI(d, 'makanan', ['makanan'])).toBe(20)
  })

  it('returns 0 for completely unrelated query', () => {
    const d = makeEntry('01001', 'Pertanian Padi', 'Tanaman padi di sawah')
    expect(scoreKBLI(d, 'restoran', ['restoran'])).toBe(0)
  })

  it('accumulates score across kode + judul + uraian matches', () => {
    const d = makeEntry('56101', 'Restoran', 'Usaha penyediaan makanan di restoran')
    // kode prefix (80) + judul exact (90) + uraian contains 'restoran' (20) = 190
    const score = scoreKBLI(d, 'restoran', ['restoran'])
    expect(score).toBeGreaterThan(100)
  })
})

/* ─────────────── getKategoriName() ─────────────── */
describe('getKategoriName()', () => {
  it.each([
    ['A', 'Pertanian'],
    ['C', 'Industri'],
    ['G', 'Perdagangan'],
    ['I', 'Akomodasi'],
    ['P', 'Pendidikan'],
  ])('kategori %s → nama mengandung "%s"', (k, substr) => {
    expect(getKategoriName(k)).toContain(substr)
  })

  it('returns the key itself for an unknown category', () => {
    expect(getKategoriName('Z')).toBe('Z')
    expect(getKategoriName('X')).toBe('X')
  })

  it('returns "" for empty key', () => {
    expect(getKategoriName('')).toBe('')
  })
})
