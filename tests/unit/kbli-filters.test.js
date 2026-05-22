import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT   = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const SOURCE = readFileSync(resolve(ROOT, 'js/shared/kbli-filters.js'), 'utf8')

// Mock CSV content matching real format: header + lines "<kode>,<rincian>"
const HALAL_CSV = `Kode KBLI 2025,Rincian KBLI 2025
01111,Pertanian Jagung
10120,Pengolahan Daging
10212,Pengolahan Ikan
`
const BPOM_CSV = `KBLI 2025,Rincian KBLI 2025
10120,Pengolahan dan Pengawetan Daging
10212,Pengolahan dan Pengawetan Ikan dengan Pengasapan
`

function makeKbliFilters({ halal = HALAL_CSV, bpom = BPOM_CSV } = {}) {
  // Capture elements that the module manipulates
  const elements = {}
  const getElementById = (id) => elements[id] || null

  // Create stub section cards for each Halal/BPOM header
  const headerIds = ['sec-15', 'sec-16', 'sec-L2-19', 'sec-L2-20']
  for (const id of headerIds) {
    const card = {
      classList: {
        _classes: new Set(),
        toggle(cls, on) { on === undefined ? (this._classes.has(cls) ? this._classes.delete(cls) : this._classes.add(cls)) : (on ? this._classes.add(cls) : this._classes.delete(cls)) },
        contains(cls) { return this._classes.has(cls) },
        add(cls)  { this._classes.add(cls) },
        remove(cls) { this._classes.delete(cls) },
      }
    }
    const header = { id, closest: (sel) => sel === '.section-card' ? card : null }
    elements[id] = header
    // Expose card so tests can inspect
    elements['__card_' + id] = card
  }

  const window_ = { kbliFilters: null }
  const document_ = {
    getElementById,
    querySelectorAll: () => [],
    addEventListener: (ev, cb) => {
      // store handler but don't auto-run; tests will trigger load() manually
      if (ev === 'DOMContentLoaded') window_._dcl = cb
    },
  }
  const fetchMock = (path) => {
    if (path.includes('Halal')) return Promise.resolve({ ok: true, text: () => Promise.resolve(halal) })
    if (path.includes('BPOM'))  return Promise.resolve({ ok: true, text: () => Promise.resolve(bpom)  })
    return Promise.resolve({ ok: false })
  }

  const fn = new Function('window', 'document', 'fetch', `${SOURCE}\nreturn window.kbliFilters;`)
  const api = fn(window_, document_, fetchMock)
  return { api, elements, window: window_ }
}

describe('kbli-filters — isHalal() / isBPOM() detection', () => {
  it('detects Halal codes after load()', async () => {
    const { api } = makeKbliFilters()
    await api.load()
    expect(api.isHalal('01111')).toBe(true)
    expect(api.isHalal('10120')).toBe(true)
    expect(api.isHalal('99999')).toBe(false)
  })

  it('detects BPOM codes after load()', async () => {
    const { api } = makeKbliFilters()
    await api.load()
    expect(api.isBPOM('10120')).toBe(true)
    expect(api.isBPOM('10212')).toBe(true)
    expect(api.isBPOM('01111')).toBe(false) // Pertanian: not in BPOM
  })

  it('returns false for empty / undefined kode', async () => {
    const { api } = makeKbliFilters()
    await api.load()
    expect(api.isHalal('')).toBe(false)
    expect(api.isHalal(undefined)).toBe(false)
    expect(api.isHalal(null)).toBe(false)
    expect(api.isBPOM('')).toBe(false)
  })

  it('trims whitespace around kode', async () => {
    const { api } = makeKbliFilters()
    await api.load()
    expect(api.isHalal('  10120  ')).toBe(true)
    expect(api.isBPOM(' 10120')).toBe(true)
  })

  it('counts match the CSV row totals', async () => {
    const { api } = makeKbliFilters()
    await api.load()
    expect(api.halalSize()).toBe(3) // 3 data lines in mock
    expect(api.bpomSize()).toBe(2)
  })

  it('fails soft when fetch errors — sizes stay 0', async () => {
    const fn = new Function('window', 'document', 'fetch', `${SOURCE}\nreturn window.kbliFilters;`)
    const window_ = {}
    const document_ = { getElementById: () => null, querySelectorAll: () => [], addEventListener: () => {} }
    const api = fn(window_, document_, () => Promise.reject(new Error('network')))
    await api.load()
    expect(api.halalSize()).toBe(0)
    expect(api.bpomSize()).toBe(0)
  })
})

describe('kbli-filters — apply() show/hide on section cards', () => {
  it('default (empty kode) → all 4 sections stay visible', async () => {
    const { api, elements } = makeKbliFilters()
    await api.load()
    api.apply('')
    expect(elements['__card_sec-15'].classList.contains('kbli-hidden')).toBe(false)
    expect(elements['__card_sec-16'].classList.contains('kbli-hidden')).toBe(false)
    expect(elements['__card_sec-L2-19'].classList.contains('kbli-hidden')).toBe(false)
    expect(elements['__card_sec-L2-20'].classList.contains('kbli-hidden')).toBe(false)
  })

  it('selecting non-Halal & non-BPOM kode → hides Q15/Q16/L19/L20', async () => {
    const { api, elements } = makeKbliFilters()
    await api.load()
    api.apply('99999') // not in either list
    expect(elements['__card_sec-15'].classList.contains('kbli-hidden')).toBe(true)
    expect(elements['__card_sec-16'].classList.contains('kbli-hidden')).toBe(true)
    expect(elements['__card_sec-L2-19'].classList.contains('kbli-hidden')).toBe(true)
    expect(elements['__card_sec-L2-20'].classList.contains('kbli-hidden')).toBe(true)
  })

  it('selecting Halal-only kode → shows Q15/L19, hides Q16/L20', async () => {
    const { api, elements } = makeKbliFilters()
    await api.load()
    api.apply('01111') // Halal only
    expect(elements['__card_sec-15'].classList.contains('kbli-hidden')).toBe(false)
    expect(elements['__card_sec-L2-19'].classList.contains('kbli-hidden')).toBe(false)
    expect(elements['__card_sec-16'].classList.contains('kbli-hidden')).toBe(true)
    expect(elements['__card_sec-L2-20'].classList.contains('kbli-hidden')).toBe(true)
  })

  it('selecting both-list kode (10120) → shows all 4 sections', async () => {
    const { api, elements } = makeKbliFilters()
    await api.load()
    api.apply('10120') // in both Halal + BPOM
    expect(elements['__card_sec-15'].classList.contains('kbli-hidden')).toBe(false)
    expect(elements['__card_sec-16'].classList.contains('kbli-hidden')).toBe(false)
    expect(elements['__card_sec-L2-19'].classList.contains('kbli-hidden')).toBe(false)
    expect(elements['__card_sec-L2-20'].classList.contains('kbli-hidden')).toBe(false)
  })

  it('switching from non-matching to Halal kode → re-shows Q15/L19', async () => {
    const { api, elements } = makeKbliFilters()
    await api.load()
    api.apply('99999')
    expect(elements['__card_sec-15'].classList.contains('kbli-hidden')).toBe(true)
    api.apply('01111')
    expect(elements['__card_sec-15'].classList.contains('kbli-hidden')).toBe(false)
  })
})

describe('kbli-filters — real master CSVs', () => {
  it('loads real Halal master with at least 100 entries', async () => {
    const realFetch = (path) => {
      if (path.includes('Halal')) {
        const text = readFileSync(resolve(ROOT, 'master/KBLI Halal.csv'), 'utf8')
        return Promise.resolve({ ok: true, text: () => Promise.resolve(text) })
      }
      if (path.includes('BPOM')) {
        const text = readFileSync(resolve(ROOT, 'master/KBLI BPOM.csv'), 'utf8')
        return Promise.resolve({ ok: true, text: () => Promise.resolve(text) })
      }
      return Promise.resolve({ ok: false })
    }
    const fn = new Function('window', 'document', 'fetch', `${SOURCE}\nreturn window.kbliFilters;`)
    const window_ = {}
    const document_ = { getElementById: () => null, querySelectorAll: () => [], addEventListener: () => {} }
    const api = fn(window_, document_, realFetch)
    await api.load()
    expect(api.halalSize()).toBeGreaterThan(100)
    expect(api.bpomSize()).toBeGreaterThan(50)
  })

  it('real master: 10120 is BPOM-eligible', async () => {
    const realFetch = (path) => {
      const f = path.includes('Halal') ? 'master/KBLI Halal.csv' : path.includes('BPOM') ? 'master/KBLI BPOM.csv' : null
      if (!f) return Promise.resolve({ ok: false })
      const text = readFileSync(resolve(ROOT, f), 'utf8')
      return Promise.resolve({ ok: true, text: () => Promise.resolve(text) })
    }
    const fn = new Function('window', 'document', 'fetch', `${SOURCE}\nreturn window.kbliFilters;`)
    const api = fn({}, { getElementById: () => null, querySelectorAll: () => [], addEventListener: () => {} }, realFetch)
    await api.load()
    expect(api.isBPOM('10120')).toBe(true)
  })
})
