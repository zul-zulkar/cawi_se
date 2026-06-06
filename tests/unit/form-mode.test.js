import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT   = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const SOURCE = readFileSync(resolve(ROOT, 'js/shared/form-mode.js'), 'utf8')

/* L.UB di-retire — getFormMode() kini SELALU 'l'. setFormMode/applyFormMode
 * hanya mengenal mode L (+ unified P via class body terpisah). */
function makeMode({ stored = null } = {}) {
  const storage = { [stored !== null ? 'cawi_form_mode' : '_unused']: stored }
  const localStorageMock = {
    getItem: k => (k in storage ? storage[k] : null),
    setItem: (k, v) => { storage[k] = v },
    removeItem: k => { delete storage[k] },
  }
  const bodyClasses = new Set()
  const bodyClassList = {
    add: (cls) => { bodyClasses.add(cls) },
    remove: (cls) => { bodyClasses.delete(cls) },
    toggle: (cls, on) => { on ? bodyClasses.add(cls) : bodyClasses.delete(cls) },
    contains: cls => bodyClasses.has(cls),
  }
  const headerKop = { classList: { remove: () => {}, add: () => {} } }
  const sidebarLabel = { className: '', textContent: '' }
  const elements = { headerKop, sidebarModeLabel: sidebarLabel }
  const mockDoc = {
    body: { classList: bodyClassList },
    getElementById: id => elements[id] || null,
  }
  const noop = () => {}
  const fn = new Function(
    'document', 'window', 'localStorage', 'confirm',
    `${SOURCE}\nreturn { getFormMode, setFormMode, hasFormMode, clearFormMode, applyFormMode, setUnifiedMode, isUnifiedActive };`
  )
  return {
    api: fn(mockDoc, { addEventListener: noop }, localStorageMock, () => true),
    storage,
    bodyClasses,
    sidebarLabel,
  }
}

describe('form-mode — getFormMode() selalu "l" (L.UB di-retire)', () => {
  it('returns "l" by default when nothing stored', () => {
    const { api } = makeMode()
    expect(api.getFormMode()).toBe('l')
  })

  it('returns "l" when stored value is "l"', () => {
    const { api } = makeMode({ stored: 'l' })
    expect(api.getFormMode()).toBe('l')
  })

  it('returns "l" even when stored value is legacy "lub"', () => {
    const { api } = makeMode({ stored: 'lub' })
    expect(api.getFormMode()).toBe('l')
  })

  it('returns "l" when stored value is an unknown string', () => {
    const { api } = makeMode({ stored: 'banana' })
    expect(api.getFormMode()).toBe('l')
  })
})

describe('form-mode — setFormMode()', () => {
  it('stores "l" and returns "l" regardless of argument', () => {
    const { api, storage } = makeMode()
    expect(api.setFormMode('lub')).toBe('l')
    expect(storage.cawi_form_mode).toBe('l')
  })

  it('applies mode-l body class (and never mode-lub)', () => {
    const { api, bodyClasses } = makeMode()
    api.setFormMode('l')
    expect(bodyClasses.has('mode-l')).toBe(true)
    expect(bodyClasses.has('mode-lub')).toBe(false)
  })
})

describe('form-mode — hasFormMode()', () => {
  it('returns false when no mode stored', () => {
    const { api } = makeMode()
    expect(api.hasFormMode()).toBe(false)
  })

  it('returns true after setFormMode', () => {
    const { api } = makeMode()
    api.setFormMode('l')
    expect(api.hasFormMode()).toBe(true)
  })

  it('returns false after clearFormMode', () => {
    const { api } = makeMode({ stored: 'l' })
    api.clearFormMode()
    expect(api.hasFormMode()).toBe(false)
  })
})

describe('form-mode — applyFormMode()', () => {
  it('sets sidebarModeLabel to L badge', () => {
    const { api, sidebarLabel } = makeMode()
    api.applyFormMode()
    expect(sidebarLabel.className).toBe('mode-badge mode-badge-l')
    expect(sidebarLabel.textContent).toBe('L')
  })

  it('adds mode-l and clears mode-lub', () => {
    const { api, bodyClasses } = makeMode()
    bodyClasses.add('mode-lub') // simulasi draft lama
    api.applyFormMode()
    expect(bodyClasses.has('mode-l')).toBe(true)
    expect(bodyClasses.has('mode-lub')).toBe(false)
  })
})

describe('form-mode — clearFormMode()', () => {
  it('removes mode from storage', () => {
    const { api, storage } = makeMode({ stored: 'l' })
    api.clearFormMode()
    expect('cawi_form_mode' in storage).toBe(false)
  })
})

describe('form-mode — unified helpers', () => {
  it('setUnifiedMode(true) adds mode-unified; isUnifiedActive() true', () => {
    const { api, bodyClasses } = makeMode()
    api.setUnifiedMode(true)
    expect(bodyClasses.has('mode-unified')).toBe(true)
    expect(api.isUnifiedActive()).toBe(true)
  })

  it('setUnifiedMode(false) removes mode-unified', () => {
    const { api, bodyClasses } = makeMode()
    api.setUnifiedMode(true)
    api.setUnifiedMode(false)
    expect(bodyClasses.has('mode-unified')).toBe(false)
    expect(api.isUnifiedActive()).toBe(false)
  })
})
