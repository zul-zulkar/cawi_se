import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT   = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const SOURCE = readFileSync(resolve(ROOT, 'js/form-l/form-l.js'), 'utf8')

/* ─── Lightweight DOM ───────────────────────────────────────────────────── */

function makeEl(opts = {}) {
  const classes = new Set(opts.classes || [])
  return {
    id: opts.id || '',
    value: opts.value !== undefined ? opts.value : '',
    innerHTML: '',
    style: { display: '' },
    classList: {
      contains: cls => classes.has(cls),
      add: cls => classes.add(cls),
      remove: cls => classes.delete(cls),
      toggle: (cls, on) => {
        if (on === undefined) classes.has(cls) ? classes.delete(cls) : classes.add(cls)
        else on ? classes.add(cls) : classes.delete(cls)
      },
    },
    _classes: classes,
    appendChild: () => {},
    setAttribute: () => {},
    insertAdjacentHTML: () => {},
    querySelectorAll: () => [],
    addEventListener: () => {},
    getContext: () => ({}),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 0, height: 0 }),
    width: 0, height: 0,
  }
}

function makeForm() {
  const dom = {}
  // dynamic anggota cards
  for (let i = 1; i <= 5; i++) {
    dom['l_ang_card_' + i]            = makeEl({ id: 'l_ang_card_' + i })
    dom['l_ang_' + i + '_stop_badge'] = makeEl({ id: 'l_ang_' + i + '_stop_badge' })
    dom['l_ang_' + i + '_dn_wrap']     = makeEl({ classes: ['hidden'] })
    dom['l_ang_' + i + '_ln_wrap']     = makeEl({ classes: ['hidden'] })
    dom['l_ang_' + i + '_alamat_dom_wrap'] = makeEl({ classes: ['hidden'] })
    dom['l_ang_' + i + '_sosek5plus_wrap']  = makeEl({})
    dom['l_ang_' + i + '_sosek5plus_wrap2'] = makeEl({})
    dom['l_ang_' + i + '_sosek10plus_wrap'] = makeEl({})
    dom['l_ang_' + i + '_umur'] = makeEl({ id: 'l_ang_' + i + '_umur' })
    dom['l_ang_' + i + '_tgl_lahir'] = makeEl({ id: 'l_ang_' + i + '_tgl_lahir' })
  }
  return dom
}

function makeApi({ radios = {}, fields = {} } = {}) {
  const dom = makeForm()
  // Apply field values to relevant dom entries
  Object.keys(fields).forEach(id => { if (dom[id]) dom[id].value = fields[id] })

  const noop = () => {}
  const docMock = {
    getElementById: id => dom[id] || null,
    querySelectorAll: () => ({ forEach: noop }),
    addEventListener: noop,
    createElement: () => makeEl(),
    body: { classList: { toggle: () => {} } },
  }
  const winMock = { addEventListener: noop }
  const fn = new Function(
    'document', 'window',
    'getRadio', 'getVal', 'parseCurrency', 'formatCurrency', 'setCurrencyReadonly',
    'updateProgress', 'kbliData', 'getKategoriFromKode', 'getKategoriName',
    'STATIC_PROFESI', 'STATIC_PROVINSI', 'STATIC_KABUPATEN', 'STATIC_KECAMATAN', 'STATIC_KELURAHAN',
    `${SOURCE}\nreturn { handleKeberadaanAnggota, handleAgeGatedAnggota, computeUmurAnggota,
      renderAnggotaCards, anggotaCardHTML, disabilitasRowsHTML, penyakitKronisRowsHTML };`
  )
  const api = fn(
    docMock, winMock,
    name => String(radios[name] ?? ''),
    id => String(fields[id] ?? (dom[id] && dom[id].value) ?? ''),
    s => parseFloat((s || '').replace(/\./g, '').replace(',', '.')) || 0,
    () => {}, () => {}, noop,
    [], () => '', () => '',
    [], [], {}, {}, {},
  )
  return { api, dom }
}

describe('handleKeberadaanAnggota — STOP detection', () => {
  it('keberadaan=2 (Meninggal) marks card with .anggota-stop', () => {
    const { api, dom } = makeApi({ radios: { 'l_ang_1_keberadaan': '2' } })
    api.handleKeberadaanAnggota(1)
    expect(dom['l_ang_card_1']._classes.has('anggota-stop')).toBe(true)
  })

  it('keberadaan=6 (Pisah KK) marks card with .anggota-stop', () => {
    const { api, dom } = makeApi({ radios: { 'l_ang_1_keberadaan': '6' } })
    api.handleKeberadaanAnggota(1)
    expect(dom['l_ang_card_1']._classes.has('anggota-stop')).toBe(true)
  })

  it('keberadaan=7 (Tidak Ditemukan) marks card with .anggota-stop', () => {
    const { api, dom } = makeApi({ radios: { 'l_ang_1_keberadaan': '7' } })
    api.handleKeberadaanAnggota(1)
    expect(dom['l_ang_card_1']._classes.has('anggota-stop')).toBe(true)
  })

  it('keberadaan=1 (Tinggal) does NOT mark .anggota-stop', () => {
    const { api, dom } = makeApi({ radios: { 'l_ang_1_keberadaan': '1' } })
    api.handleKeberadaanAnggota(1)
    expect(dom['l_ang_card_1']._classes.has('anggota-stop')).toBe(false)
  })

  it('keberadaan=3 (pindah DN) does NOT mark STOP', () => {
    const { api, dom } = makeApi({ radios: { 'l_ang_1_keberadaan': '3' } })
    api.handleKeberadaanAnggota(1)
    expect(dom['l_ang_card_1']._classes.has('anggota-stop')).toBe(false)
  })

  it('keberadaan=4 (pindah LN) does NOT mark STOP', () => {
    const { api, dom } = makeApi({ radios: { 'l_ang_1_keberadaan': '4' } })
    api.handleKeberadaanAnggota(1)
    expect(dom['l_ang_card_1']._classes.has('anggota-stop')).toBe(false)
  })

  it('keberadaan=5 (anggota baru) does NOT mark STOP', () => {
    const { api, dom } = makeApi({ radios: { 'l_ang_1_keberadaan': '5' } })
    api.handleKeberadaanAnggota(1)
    expect(dom['l_ang_card_1']._classes.has('anggota-stop')).toBe(false)
  })
})

describe('handleKeberadaanAnggota — STOP badge text', () => {
  it('keberadaan=2 shows "STOP — Meninggal" badge', () => {
    const { api, dom } = makeApi({ radios: { 'l_ang_1_keberadaan': '2' } })
    api.handleKeberadaanAnggota(1)
    expect(dom['l_ang_1_stop_badge'].textContent).toMatch(/Meninggal/)
  })

  it('keberadaan=6 shows "STOP — Pisah KK" badge', () => {
    const { api, dom } = makeApi({ radios: { 'l_ang_1_keberadaan': '6' } })
    api.handleKeberadaanAnggota(1)
    expect(dom['l_ang_1_stop_badge'].textContent).toMatch(/Pisah KK/)
  })

  it('keberadaan=7 shows "STOP — Tidak Ditemukan" badge', () => {
    const { api, dom } = makeApi({ radios: { 'l_ang_1_keberadaan': '7' } })
    api.handleKeberadaanAnggota(1)
    expect(dom['l_ang_1_stop_badge'].textContent).toMatch(/Tidak Ditemukan/)
  })

  it('non-STOP keberadaan hides the badge', () => {
    const { api, dom } = makeApi({ radios: { 'l_ang_1_keberadaan': '1' } })
    api.handleKeberadaanAnggota(1)
    expect(dom['l_ang_1_stop_badge'].style.display).toBe('none')
  })
})

describe('handleKeberadaanAnggota — conditional wraps', () => {
  it('keberadaan=3 shows DN wrap, hides LN wrap', () => {
    const { api, dom } = makeApi({ radios: { 'l_ang_1_keberadaan': '3' } })
    api.handleKeberadaanAnggota(1)
    expect(dom['l_ang_1_dn_wrap']._classes.has('hidden')).toBe(false)
    expect(dom['l_ang_1_ln_wrap']._classes.has('hidden')).toBe(true)
  })

  it('keberadaan=4 shows LN wrap, hides DN wrap', () => {
    const { api, dom } = makeApi({ radios: { 'l_ang_1_keberadaan': '4' } })
    api.handleKeberadaanAnggota(1)
    expect(dom['l_ang_1_ln_wrap']._classes.has('hidden')).toBe(false)
    expect(dom['l_ang_1_dn_wrap']._classes.has('hidden')).toBe(true)
  })

  it('keberadaan=1 shows alamat_dom_wrap', () => {
    const { api, dom } = makeApi({ radios: { 'l_ang_1_keberadaan': '1' } })
    api.handleKeberadaanAnggota(1)
    expect(dom['l_ang_1_alamat_dom_wrap']._classes.has('hidden')).toBe(false)
  })

  it('STOP-state hides alamat_dom_wrap', () => {
    const { api, dom } = makeApi({ radios: { 'l_ang_1_keberadaan': '2' } })
    api.handleKeberadaanAnggota(1)
    expect(dom['l_ang_1_alamat_dom_wrap']._classes.has('hidden')).toBe(true)
  })

  it('empty keberadaan hides alamat_dom_wrap', () => {
    const { api, dom } = makeApi({})
    api.handleKeberadaanAnggota(1)
    expect(dom['l_ang_1_alamat_dom_wrap']._classes.has('hidden')).toBe(true)
  })
})

describe('handleAgeGatedAnggota — age thresholds', () => {
  it('umur=3 hides all sosek wraps (5+ and 10+)', () => {
    const { api, dom } = makeApi({ fields: { 'l_ang_1_umur': '3' } })
    api.handleAgeGatedAnggota(1)
    expect(dom['l_ang_1_sosek5plus_wrap']._classes.has('hidden')).toBe(true)
    expect(dom['l_ang_1_sosek5plus_wrap2']._classes.has('hidden')).toBe(true)
    expect(dom['l_ang_1_sosek10plus_wrap']._classes.has('hidden')).toBe(true)
  })

  it('umur=5 shows 5+ wraps but hides 10+ wrap', () => {
    const { api, dom } = makeApi({ fields: { 'l_ang_1_umur': '5' } })
    api.handleAgeGatedAnggota(1)
    expect(dom['l_ang_1_sosek5plus_wrap']._classes.has('hidden')).toBe(false)
    expect(dom['l_ang_1_sosek5plus_wrap2']._classes.has('hidden')).toBe(false)
    expect(dom['l_ang_1_sosek10plus_wrap']._classes.has('hidden')).toBe(true)
  })

  it('umur=10 shows all wraps (5+ and 10+)', () => {
    const { api, dom } = makeApi({ fields: { 'l_ang_1_umur': '10' } })
    api.handleAgeGatedAnggota(1)
    expect(dom['l_ang_1_sosek5plus_wrap']._classes.has('hidden')).toBe(false)
    expect(dom['l_ang_1_sosek5plus_wrap2']._classes.has('hidden')).toBe(false)
    expect(dom['l_ang_1_sosek10plus_wrap']._classes.has('hidden')).toBe(false)
  })

  it('umur=9 shows 5+ but hides 10+', () => {
    const { api, dom } = makeApi({ fields: { 'l_ang_1_umur': '9' } })
    api.handleAgeGatedAnggota(1)
    expect(dom['l_ang_1_sosek5plus_wrap']._classes.has('hidden')).toBe(false)
    expect(dom['l_ang_1_sosek10plus_wrap']._classes.has('hidden')).toBe(true)
  })

  it('umur kosong hides all wraps', () => {
    const { api, dom } = makeApi({})
    api.handleAgeGatedAnggota(1)
    expect(dom['l_ang_1_sosek5plus_wrap']._classes.has('hidden')).toBe(true)
    expect(dom['l_ang_1_sosek10plus_wrap']._classes.has('hidden')).toBe(true)
  })

  it('umur=80 shows all wraps', () => {
    const { api, dom } = makeApi({ fields: { 'l_ang_1_umur': '80' } })
    api.handleAgeGatedAnggota(1)
    expect(dom['l_ang_1_sosek5plus_wrap']._classes.has('hidden')).toBe(false)
    expect(dom['l_ang_1_sosek5plus_wrap2']._classes.has('hidden')).toBe(false)
    expect(dom['l_ang_1_sosek10plus_wrap']._classes.has('hidden')).toBe(false)
  })
})

describe('computeUmurAnggota — date arithmetic', () => {
  it('computes age from a past tgl_lahir', () => {
    const { api, dom } = makeApi({})
    dom['l_ang_1_tgl_lahir'].value = '2000-06-15'
    api.computeUmurAnggota(1)
    const u = parseInt(dom['l_ang_1_umur'].value)
    expect(u).toBeGreaterThan(15)
    expect(u).toBeLessThan(40)
  })

  it('empty tgl_lahir resets umur to empty string', () => {
    const { api, dom } = makeApi({})
    dom['l_ang_1_tgl_lahir'].value = ''
    api.computeUmurAnggota(1)
    expect(dom['l_ang_1_umur'].value).toBe('')
  })

  it('invalid date resets umur to empty string', () => {
    const { api, dom } = makeApi({})
    dom['l_ang_1_tgl_lahir'].value = 'not-a-date'
    api.computeUmurAnggota(1)
    expect(dom['l_ang_1_umur'].value).toBe('')
  })

  it('future date produces umur 0 (clamped)', () => {
    const { api, dom } = makeApi({})
    dom['l_ang_1_tgl_lahir'].value = '2099-01-01'
    api.computeUmurAnggota(1)
    expect(parseInt(dom['l_ang_1_umur'].value)).toBe(0)
  })
})

describe('anggotaCardHTML — template rendering', () => {
  it('generates an anggota-card div', () => {
    const { api } = makeApi({})
    const html = api.anggotaCardHTML(1)
    expect(html).toContain('anggota-card')
    expect(html).toContain('l_ang_card_1')
  })

  it('includes all keberadaan radio options 1-7', () => {
    const { api } = makeApi({})
    const html = api.anggotaCardHTML(1)
    for (let v = 1; v <= 7; v++)
      expect(html).toContain(`value="${v}"`)
  })

  it('includes age-gated wrap divs (5plus, 5plus2, 10plus)', () => {
    const { api } = makeApi({})
    const html = api.anggotaCardHTML(1)
    expect(html).toContain('sosek5plus_wrap')
    expect(html).toContain('sosek10plus_wrap')
  })

  it('includes disabilitas 6 jenis radios', () => {
    const { api } = makeApi({})
    const html = api.disabilitasRowsHTML(1)
    for (const k of ['a','b','c','d','e','f'])
      expect(html).toContain(`l_ang_1_disab_${k}`)
  })

  it('includes 16 penyakit kronis radios', () => {
    const { api } = makeApi({})
    const html = api.penyakitKronisRowsHTML(1)
    const letters = 'abcdefghijklmnop'.split('')
    letters.forEach(k => expect(html).toContain(`l_ang_1_kronis_${k}`))
  })

  it('uses correct anggota index in IDs', () => {
    const { api } = makeApi({})
    const html3 = api.anggotaCardHTML(3)
    expect(html3).toContain('l_ang_card_3')
    expect(html3).toContain('l_ang_3_nama')
    expect(html3).toContain('l_ang_3_nik')
  })
})
