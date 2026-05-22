import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT   = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const SOURCE = readFileSync(resolve(ROOT, 'js/shared/settings.js'), 'utf8')

function makeSettings({ stored = null } = {}) {
  const storage = stored !== null ? { cawi_settings_v1: stored } : {}
  const localStorageMock = {
    getItem: k => (k in storage ? storage[k] : null),
    setItem: (k, v) => { storage[k] = v },
    removeItem: k => { delete storage[k] },
  }
  const root = {
    dataset: {},
    style: {
      _vars: {},
      setProperty(k, v) { this._vars[k] = v },
    },
  }
  const body = {
    style: { background: '' },
    dataset: {},
  }
  const handlers = []
  const document_ = {
    documentElement: root,
    body,
    hidden: false,
    addEventListener: (ev, cb) => handlers.push({ ev, cb }),
    querySelectorAll: () => [],
    getElementById: () => null,
  }
  const window_ = {}
  const noop = () => {}

  const fn = new Function(
    'window', 'document', 'localStorage', 'confirm', 'setInterval', 'clearInterval', 'requestAnimationFrame',
    `${SOURCE}\nreturn { openSettingsModal: window.openSettingsModal, closeSettingsModal: window.closeSettingsModal, resetSettings: window.resetSettings, root: document.documentElement, body: document.body };`
  )
  const api = fn(window_, document_, localStorageMock, () => true, noop, noop, noop)
  return { api, root, body, storage }
}

describe('settings — defaults on first load', () => {
  it('applies default fontSize=medium', () => {
    const { root } = makeSettings()
    expect(root.dataset.fs).toBe('medium')
  })

  it('applies default density=comfortable', () => {
    const { root } = makeSettings()
    expect(root.dataset.ds).toBe('comfortable')
  })

  it('applies default fontFamily=inter', () => {
    const { root } = makeSettings()
    expect(root.dataset.ff).toBe('inter')
  })

  it('applies default palette=orange', () => {
    const { root } = makeSettings()
    expect(root.dataset.palette).toBe('orange')
    // orange palette sets --orange to BPS orange #ed6c00
    expect(root.style._vars['--orange']).toBe('#ed6c00')
  })

  it('default contrast=normal', () => {
    const { root } = makeSettings()
    expect(root.dataset.contrast).toBe('normal')
  })

  it('hints + numbers both on by default', () => {
    const { root } = makeSettings()
    expect(root.dataset.hints).toBe('on')
    expect(root.dataset.numbers).toBe('on')
  })
})

describe('settings — restore from localStorage', () => {
  it('restores fontSize=large', () => {
    const { root } = makeSettings({ stored: JSON.stringify({ fontSize: 'large' }) })
    expect(root.dataset.fs).toBe('large')
  })

  it('restores density=compact', () => {
    const { root } = makeSettings({ stored: JSON.stringify({ density: 'compact' }) })
    expect(root.dataset.ds).toBe('compact')
  })

  it('restores palette=navy and applies its accent', () => {
    const { root } = makeSettings({ stored: JSON.stringify({ palette: 'navy' }) })
    expect(root.dataset.palette).toBe('navy')
    expect(root.style._vars['--orange']).toBe('#1e40af') // navy accent
  })

  it('restores palette=forest and applies its accent', () => {
    const { root } = makeSettings({ stored: JSON.stringify({ palette: 'forest' }) })
    expect(root.style._vars['--orange']).toBe('#047857')
  })

  it('restores palette=graphite', () => {
    const { root } = makeSettings({ stored: JSON.stringify({ palette: 'graphite' }) })
    expect(root.style._vars['--orange']).toBe('#18181b')
  })

  it('restores palette=burgundy', () => {
    const { root } = makeSettings({ stored: JSON.stringify({ palette: 'burgundy' }) })
    expect(root.style._vars['--orange']).toBe('#9f1239')
  })

  it('restores highContrast=true', () => {
    const { root } = makeSettings({ stored: JSON.stringify({ highContrast: true }) })
    expect(root.dataset.contrast).toBe('high')
  })

  it('restores showHints=false', () => {
    const { root } = makeSettings({ stored: JSON.stringify({ showHints: false }) })
    expect(root.dataset.hints).toBe('off')
  })

  it('restores showNumbers=false', () => {
    const { root } = makeSettings({ stored: JSON.stringify({ showNumbers: false }) })
    expect(root.dataset.numbers).toBe('off')
  })

  it('falls back to defaults when stored JSON is invalid', () => {
    const { root } = makeSettings({ stored: 'not-json' })
    expect(root.dataset.fs).toBe('medium')
    expect(root.dataset.palette).toBe('orange')
  })

  it('merges partial settings with defaults', () => {
    const { root } = makeSettings({ stored: JSON.stringify({ fontSize: 'small' }) })
    expect(root.dataset.fs).toBe('small')        // overridden
    expect(root.dataset.ds).toBe('comfortable')  // default
    expect(root.dataset.palette).toBe('orange')  // default
  })
})

describe('settings — palette tinting', () => {
  it('sets --cream + --orange-faint for orange palette', () => {
    const { root } = makeSettings()
    expect(root.style._vars['--cream']).toBe('#fdf2dd')
    expect(root.style._vars['--orange-faint']).toBe('#fff2e3')
  })

  it('sets palette-specific banner color for navy', () => {
    const { root } = makeSettings({ stored: JSON.stringify({ palette: 'navy' }) })
    expect(root.style._vars['--cream']).toBe('#dbeafe')
  })

  it('unknown palette falls back to orange', () => {
    const { root } = makeSettings({ stored: JSON.stringify({ palette: 'nonexistent' }) })
    expect(root.style._vars['--orange']).toBe('#ed6c00')
  })
})
