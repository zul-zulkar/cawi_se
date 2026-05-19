import { extractFrom } from '../helpers/load-source.js'

const { isValidHP, isValidEmail, parseCurrency } =
  extractFrom('js/form.js', 'isValidHP', 'isValidEmail', 'parseCurrency')

/* ─────────────── isValidHP() ─────────────── */
describe('isValidHP()', () => {
  it.each([
    '081234567890',      // starts with 0, 11 digits
    '6281234567890',     // starts with 62, 11 digits
    '+6281234567890',    // starts with +62, 11 digits
    '0812 3456 7890',    // spaces stripped
    '0812-3456-7890',    // dashes stripped
    '0811234567890',     // 12 digits after 0 — still ≤ 13
  ])('accepts valid number: %s', (hp) => {
    expect(isValidHP(hp)).toBe(true)
  })

  it.each([
    '0812345',           // too short after prefix (6 digits < 8)
    '12345678901',       // doesn't start with 0/62/+62
    '',                  // empty
    'abcdefghij',        // not a number
    '+6281',             // too short
  ])('rejects invalid number: %s', (hp) => {
    expect(isValidHP(hp)).toBe(false)
  })
})

/* ─────────────── isValidEmail() ─────────────── */
describe('isValidEmail()', () => {
  it.each([
    'user@example.com',
    'a.b+c@x.y.z',
    'test123@bps.go.id',
  ])('accepts valid email: %s', (email) => {
    expect(isValidEmail(email)).toBe(true)
  })

  it.each([
    'notanemail',        // no @
    '@example.com',      // nothing before @
    'user@',            // nothing after @
    'user@example',     // no dot in domain
    'user @example.com', // space
    '',                  // empty
  ])('rejects invalid email: %s', (email) => {
    expect(isValidEmail(email)).toBe(false)
  })
})

/* ─────────────── parseCurrency() ─────────────── */
describe('parseCurrency()', () => {
  it('parses Indonesian thousands-separator format', () => {
    expect(parseCurrency('1.234.567')).toBe(1234567)
  })

  it('parses decimal with comma', () => {
    expect(parseCurrency('1.234.567,89')).toBeCloseTo(1234567.89)
  })

  it('parses plain integer string', () => {
    expect(parseCurrency('1000')).toBe(1000)
  })

  it('parses zero', () => {
    expect(parseCurrency('0')).toBe(0)
    expect(parseCurrency('0,00')).toBe(0)
  })

  it('returns 0 for empty / null / non-numeric', () => {
    expect(parseCurrency('')).toBe(0)
    expect(parseCurrency(null)).toBe(0)
    expect(parseCurrency('abc')).toBe(0)
  })

  it('handles values without separators', () => {
    expect(parseCurrency('50000')).toBe(50000)
  })
})
