import { extractFrom } from '../helpers/load-source.js'

const { STATIC_KABUPATEN } = extractFrom('data.js', 'STATIC_KABUPATEN')

const PROV_CODES = [
  '11','12','13','14','15','16','17','18','19','21',
  '31','32','33','34','35','36',
  '51','52','53',
  '61','62','63','64','65',
  '71','72','73','74','75','76',
  '81','82',
  '91','92','93','94','95','96',
]

describe('STATIC_KABUPATEN — structure', () => {
  it('contains all 38 provinces', () => {
    expect(Object.keys(STATIC_KABUPATEN)).toHaveLength(38)
  })

  it.each(PROV_CODES)('province %s has at least one entry', (prov) => {
    expect(Array.isArray(STATIC_KABUPATEN[prov])).toBe(true)
    expect(STATIC_KABUPATEN[prov].length).toBeGreaterThan(0)
  })

  it('every entry has non-empty kode and nama', () => {
    for (const [prov, kabs] of Object.entries(STATIC_KABUPATEN)) {
      for (const k of kabs) {
        expect(typeof k.kode).toBe('string', `province ${prov}`)
        expect(k.kode.length).toBeGreaterThan(0)
        expect(typeof k.nama).toBe('string', `province ${prov}`)
        expect(k.nama.length).toBeGreaterThan(0)
      }
    }
  })

  it('kode starts with province code (first 2 chars)', () => {
    for (const [prov, kabs] of Object.entries(STATIC_KABUPATEN)) {
      for (const k of kabs) {
        expect(k.kode.startsWith(prov)).toBe(true)
      }
    }
  })

  it('kode is exactly 4 characters', () => {
    for (const [prov, kabs] of Object.entries(STATIC_KABUPATEN)) {
      for (const k of kabs) {
        expect(k.kode).toHaveLength(4)
      }
    }
  })

  it('no duplicate kode within a province', () => {
    for (const [prov, kabs] of Object.entries(STATIC_KABUPATEN)) {
      const codes = kabs.map(k => k.kode)
      const unique = new Set(codes)
      expect(unique.size).toBe(codes.length)
    }
  })
})

describe('STATIC_KABUPATEN — spot checks', () => {
  it('Bali (51) has 9 entries including KAB. BULELENG and KOTA DENPASAR', () => {
    const bali = STATIC_KABUPATEN['51']
    expect(bali).toHaveLength(9)
    expect(bali.some(k => k.nama === 'KAB. BULELENG')).toBe(true)
    expect(bali.some(k => k.nama === 'KOTA DENPASAR')).toBe(true)
    expect(bali.find(k => k.nama === 'KAB. BULELENG')?.kode).toBe('5108')
  })

  it('DKI Jakarta (31) has 6 entries including KAB. KEPULAUAN SERIBU', () => {
    const jkt = STATIC_KABUPATEN['31']
    expect(jkt).toHaveLength(6)
    expect(jkt.some(k => k.kode === '3101')).toBe(true)
  })

  it('DI Yogyakarta (34) has 5 entries', () => {
    expect(STATIC_KABUPATEN['34']).toHaveLength(5)
  })

  it('Kalimantan Utara (65) has 5 entries', () => {
    expect(STATIC_KABUPATEN['65']).toHaveLength(5)
  })

  it('Papua Selatan (93) has 4 entries', () => {
    expect(STATIC_KABUPATEN['93']).toHaveLength(4)
  })
})
