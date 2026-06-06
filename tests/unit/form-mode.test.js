import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT   = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const SOURCE = readFileSync(resolve(ROOT, 'js/shared/form-mode.js'), 'utf8')

function makeMode({ stored = null } = {}) {
  const storage = { [stored !== null ? 'cawi_form_mode' : '_unused']: stored }
  const localStorageMock = {
    getItem: k => (k in storage ? storage[k] : null),
    setItem: (k, v) => { storage[k] = v },
    removeItem: k => { delete storage[k] },
  }
  const bodyClasses = new Set()
  const bodyClassList = {
    toggle: (cls, on) => { on ? bodyClasses.add(cls) : bodyClasses.delete(cls) },
    contains: cls => bodyClasses.has(cls),
  }
  const elements = {}
  const headerKop = { classList: { remove: () => {}, add: () => {} } }
  const sidebarLabel = { className: '', textContent: '' }
  const modeGate = { classList: { add: () => {}, remove: () => {} } }
  const modeCancel = { style: {} }
  elements.headerKop = headerKop
  elements.sidebarModeLabel = sidebarLabel
  elements.modeGate = modeGate
  elements.modeCancelBtn = modeCancel
  const mockDoc = {
    body: { classList: bodyClassList },
    getElementById: id => elements[id] || null,
  }
  const noop = () => {}
  const fn = new Function(
    'document', 'window', 'localStorage', 'confirm',
    `${SOURCE}\nreturn { getFormMode, setFormMode, hasFormMode, clearFormMode, applyFormMode };`
  )
  return {
    api: fn(mockDoc, { addEventListener: noop }, localStorageMock, () => true),
    storage,
    bodyClasses,
    sidebarLabel,
    modeGate,
    modeCancel,
  }
}

describe('form-mode — getFormMode()', () => {
  it('returns "lub" by default when nothing stored', () => {
    const { api } = makeMode()
    expect(api.getFormMode()).toBe('lub')
  })

  it('returns "l" when stored value is "l"', () => {
    const { api } = makeMode({ stored: 'l' })
    expect(api.getFormMode()).toBe('l')
  })

  it('returns "lub" when stored value is "lub"', () => {
    const { api } = makeMode({ stored: 'lub' })
    expect(api.getFormMode()).toBe('lub')
  })

  it('returns "lub" when stored value is an unknown string', () => {
    const { api } = makeMode({ stored: 'banana' })
    expect(api.getFormMode()).toBe('lub')
  })
})

describe('form-mode — setFormMode()', () => {
  it('stores "l" and returns "l"', () => {
    const { api, storage } = makeMode()
    expect(api.setFormMode('l')).toBe('l')
    expect(storage.cawi_form_mode).toBe('l')
  })

  it('stores "lub" and returns "lub"', () => {
    const { api, storage } = makeMode()
    expect(api.setFormMode('lub')).toBe('lub')
    expect(storage.cawi_form_mode).toBe('lub')
  })

  it('coerces unknown values to "lub"', () => {
    const { api, storage } = makeMode()
    expect(api.setFormMode('xyz')).toBe('lub')
    expect(storage.cawi_form_mode).toBe('lub')
  })

  it('triggers applyFormMode side effects (body class toggle)', () => {
    const { api, bodyClasses } = makeMode()
    api.setFormMode('l')
    expect(bodyClasses.has('mode-l')).toBe(true)
    expect(bodyClasses.has('mode-lub')).toBe(false)
  })

  it('toggles mode-lub on when switching from l', () => {
    const { api, bodyClasses } = makeMode({ stored: 'l' })
    api.setFormMode('lub')
    expect(bodyClasses.has('mode-lub')).toBe(true)
    expect(bodyClasses.has('mode-l')).toBe(false)
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
  it('updates sidebarModeLabel class+text for L mode', () => {
    const { api, sidebarLabel } = makeMode()
    api.applyFormMode('l')
    expect(sidebarLabel.className).toBe('mode-badge mode-badge-l')
    expect(sidebarLabel.textContent).toBe('L')
  })

  it('updates sidebarModeLabel class+text for L.UB mode', () => {
    const { api, sidebarLabel } = makeMode()
    api.applyFormMode('lub')
    expect(sidebarLabel.className).toBe('mode-badge mode-badge-lub')
    expect(sidebarLabel.textContent).toBe('L.UB')
  })

  it('treats unknown mode as lub', () => {
    const { api, bodyClasses } = makeMode()
    api.applyFormMode('xyz')
    expect(bodyClasses.has('mode-lub')).toBe(true)
  })
})

describe('form-mode — clearFormMode()', () => {
  it('removes mode from storage', () => {
    const { api, storage } = makeMode({ stored: 'l' })
    api.clearFormMode()
    expect('cawi_form_mode' in storage).toBe(false)
  })
})
