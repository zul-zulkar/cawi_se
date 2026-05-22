import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT   = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const SOURCE = readFileSync(resolve(ROOT, 'js/shared/loading.js'), 'utf8')

function makeButton(initialHtml = 'Submit') {
  const classes = new Set()
  return {
    innerHTML: initialHtml,
    disabled: false,
    dataset: {},
    classList: {
      add: cls => classes.add(cls),
      remove: cls => classes.delete(cls),
      contains: cls => classes.has(cls),
    },
  }
}

function makeLoading() {
  const elements = {}
  const overlay = {
    style: { display: 'none' },
    _classes: new Set(),
    classList: {
      add: cls => overlay._classes.add(cls),
      remove: cls => overlay._classes.delete(cls),
      contains: cls => overlay._classes.has(cls),
    },
    querySelector: (sel) => sel === '.cawi-loading-sub' ? elements.subEl : null,
  }
  const txt = { textContent: 'Mengirim data…' }
  const sub = { textContent: 'Mohon tunggu sebentar' }
  elements.subEl = sub
  elements['submitLoadingOverlay'] = overlay
  elements['submitLoadingText']    = txt

  const appended = []
  const document_ = {
    getElementById: id => elements[id] || null,
    createElement: () => {
      const children = []
      const el = {
        id: '',
        className: '',
        textContent: '',
        style: {},
        setAttribute: () => {},
        appendChild: (c) => { children.push(c); c._parent = el; },
        remove() { const i = appended.indexOf(this); if (i >= 0) appended.splice(i, 1) },
        _children: children,
      }
      appended.push(el)
      return el
    },
    body: { appendChild: () => {} },
  }
  const window_ = {}
  const setTimeoutMock = (cb) => cb() // fire-and-forget for tests

  const fn = new Function(
    'window', 'document', 'requestAnimationFrame', 'setTimeout',
    `${SOURCE}\nreturn { showLoadingOverlay: window.showLoadingOverlay, hideLoadingOverlay: window.hideLoadingOverlay, setButtonLoading: window.setButtonLoading, showToast: window.showToast };`
  )
  const api = fn(window_, document_, (cb) => cb(), setTimeoutMock)
  return { api, overlay, txt, sub, document: document_ }
}

describe('loading — setButtonLoading()', () => {
  it('sets disabled + .is-loading + spinner markup', () => {
    const { api } = makeLoading()
    const btn = makeButton('Submit')
    api.setButtonLoading(btn, 'Memproses…')
    expect(btn.disabled).toBe(true)
    expect(btn.classList.contains('is-loading')).toBe(true)
    expect(btn.innerHTML).toMatch(/btn-spinner/)
    expect(btn.innerHTML).toMatch(/Memproses…/)
  })

  it('preserves original innerHTML for restore', () => {
    const { api } = makeLoading()
    const btn = makeButton('<i class="bi bi-send-fill"></i> Submit')
    api.setButtonLoading(btn, 'Memproses…')
    expect(btn.dataset.prevLabel).toBe('<i class="bi bi-send-fill"></i> Submit')
  })

  it('restore() returns button to original state', () => {
    const { api } = makeLoading()
    const btn = makeButton('Submit')
    const restore = api.setButtonLoading(btn, 'Memproses…')
    restore()
    expect(btn.disabled).toBe(false)
    expect(btn.classList.contains('is-loading')).toBe(false)
    expect(btn.innerHTML).toBe('Submit')
    expect(btn.dataset.loading).toBeUndefined()
    expect(btn.dataset.prevLabel).toBeUndefined()
  })

  it('default label is "Memproses…" when none given', () => {
    const { api } = makeLoading()
    const btn = makeButton('X')
    api.setButtonLoading(btn)
    expect(btn.innerHTML).toMatch(/Memproses…/)
  })

  it('double-call is idempotent (does not lose original label)', () => {
    const { api } = makeLoading()
    const btn = makeButton('Submit')
    const restore1 = api.setButtonLoading(btn, 'A')
    const restore2 = api.setButtonLoading(btn, 'B')
    expect(btn.dataset.prevLabel).toBe('Submit')
    restore1()
    restore2() // no-op since loading flag already cleared by restore1
    expect(btn.innerHTML).toBe('Submit')
  })

  it('returns noop function when btn is null', () => {
    const { api } = makeLoading()
    const restore = api.setButtonLoading(null, 'x')
    expect(typeof restore).toBe('function')
    expect(() => restore()).not.toThrow()
  })
})

describe('loading — showLoadingOverlay() / hideLoadingOverlay()', () => {
  it('shows overlay with display:flex + .show class', () => {
    const { api, overlay } = makeLoading()
    api.showLoadingOverlay('Mengirim…', 'Tunggu')
    expect(overlay.style.display).toBe('flex')
    expect(overlay.classList.contains('show')).toBe(true)
  })

  it('updates main text + subtitle when provided', () => {
    const { api, txt, sub } = makeLoading()
    api.showLoadingOverlay('Verifikasi…', 'Sedang memuat data')
    expect(txt.textContent).toBe('Verifikasi…')
    expect(sub.textContent).toBe('Sedang memuat data')
  })

  it('keeps existing text when only msg passed', () => {
    const { api, txt, sub } = makeLoading()
    api.showLoadingOverlay('Mengirim…')
    expect(txt.textContent).toBe('Mengirim…')
    expect(sub.textContent).toBe('Mohon tunggu sebentar') // default unchanged
  })

  it('hideLoadingOverlay() removes .show + sets display:none', () => {
    const { api, overlay } = makeLoading()
    api.showLoadingOverlay('x')
    api.hideLoadingOverlay()
    expect(overlay.classList.contains('show')).toBe(false)
    expect(overlay.style.display).toBe('none')
  })

  it('does not throw when overlay element is missing', () => {
    const fn = new Function('window', 'document', 'requestAnimationFrame', 'setTimeout',
      `${SOURCE}\nreturn window.showLoadingOverlay;`)
    const showLoadingOverlay = fn({}, { getElementById: () => null, createElement: () => ({ setAttribute: () => {}, appendChild: () => {} }), body: { appendChild: () => {} } }, (cb) => cb(), (cb) => cb())
    expect(() => showLoadingOverlay('x')).not.toThrow()
  })
})

describe('loading — showToast()', () => {
  it('does not throw when called', () => {
    const { api } = makeLoading()
    expect(() => api.showToast('Hello', 'ok')).not.toThrow()
  })

  it('accepts kind=err', () => {
    const { api } = makeLoading()
    expect(() => api.showToast('Gagal', 'err')).not.toThrow()
  })

  it('accepts no kind (defaults to ok)', () => {
    const { api } = makeLoading()
    expect(() => api.showToast('Berhasil')).not.toThrow()
  })
})
