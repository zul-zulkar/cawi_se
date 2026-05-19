import { extractFrom } from '../helpers/load-source.js'

const { esc, fmtDate, sha256 } = extractFrom('js/utils.js', 'esc', 'fmtDate', 'sha256')

/* ─────────────── esc() ─────────────── */
describe('esc()', () => {
  it('escapes & < > "', () => {
    expect(esc('a & b')).toBe('a &amp; b')
    expect(esc('<tag>')).toBe('&lt;tag&gt;')
    expect(esc('say "hi"')).toBe('say &quot;hi&quot;')
  })

  it('handles null / undefined (returns empty string)', () => {
    expect(esc(null)).toBe('')
    expect(esc(undefined)).toBe('')
  })

  it('coerces numbers to string', () => {
    expect(esc(0)).toBe('0')
    expect(esc(42)).toBe('42')
  })

  it('passes plain text through unchanged', () => {
    expect(esc('hello world')).toBe('hello world')
  })

  it('double-escapes already-escaped entities', () => {
    // Re-escaping &amp; should produce &amp;amp;
    expect(esc('&amp;')).toBe('&amp;amp;')
  })
})

/* ─────────────── fmtDate() ─────────────── */
describe('fmtDate()', () => {
  it.each([null, '', 0, undefined])('returns — for falsy input %s', (v) => {
    expect(fmtDate(v)).toBe('—')
  })

  it('returns input unchanged for a clearly invalid date string', () => {
    expect(fmtDate('bukan-tanggal')).toBe('bukan-tanggal')
  })

  it('returns a non-empty localised string for a valid ISO timestamp', () => {
    const result = fmtDate('2026-03-15T09:00:00')
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(5)
    expect(result).not.toBe('—')
  })

  it('handles a numeric Unix timestamp', () => {
    // Jan 1 2026 UTC
    const result = fmtDate(1767225600000)
    expect(typeof result).toBe('string')
    expect(result).not.toBe('—')
  })
})

/* ─────────────── sha256() ─────────────── */
describe('sha256()', () => {
  it('returns a 64-character lowercase hex string', async () => {
    const hash = await sha256('hello')
    expect(hash).toHaveLength(64)
    expect(/^[0-9a-f]{64}$/.test(hash)).toBe(true)
  })

  it('is deterministic for the same input', async () => {
    const h1 = await sha256('test123')
    const h2 = await sha256('test123')
    expect(h1).toBe(h2)
  })

  it('produces different hashes for different inputs', async () => {
    const h1 = await sha256('password1')
    const h2 = await sha256('password2')
    expect(h1).not.toBe(h2)
  })

  it('matches Node.js built-in crypto for the same input', async () => {
    const { createHash } = await import('node:crypto')
    const expected = createHash('sha256').update('abc', 'utf8').digest('hex')
    expect(await sha256('abc')).toBe(expected)
  })
})
