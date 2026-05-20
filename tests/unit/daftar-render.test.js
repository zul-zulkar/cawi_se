import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT   = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const SOURCE = readFileSync(resolve(ROOT, 'js/pages/daftar-main.js'), 'utf8')

function makeApi({ records = [], searchBoxValue = '', filterPetugas = '', filterMode = '' } = {}) {
  const elements = {
    searchBox:     { value: searchBoxValue },
    filterPetugas: { value: filterPetugas },
    filterMode:    { value: filterMode },
  }
  const docMock = {
    getElementById:   id => elements[id] || null,
    addEventListener: () => {},
    createElement:    () => ({}),
    querySelectorAll: () => ({ forEach: () => {} }),
  }
  const noop = () => {}
  const fetchMock = () => ({ then: () => ({}) })

  const fn = new Function(
    'document', 'window', 'localStorage', 'fetch',
    'esc', 'fmtDate', 'getScriptUrl',
    `${SOURCE}\nreturn { getRecordMode, getRecordName, getFiltered, setActiveTab };`
  )
  const api = fn(
    docMock, { addEventListener: noop }, { getItem: () => null, setItem: noop, removeItem: noop }, fetchMock,
    s => String(s ?? ''), () => '', () => 'about:blank',
  )
  // Inject records into the eval'd `records` global by re-execing in same closure
  // — workaround: redefine via writable test surface
  return { api, elements, _setRecords: rs => {
    // The records variable is module-scoped inside the new Function; we cannot
    // mutate from outside. So instead we pre-seed via constructor and re-build.
  }}
}

/* Records variable lives inside the new Function scope, so we re-build the
 * scope each time with seeded data passed in as a parameter. */
function makeApiWithRecords(records = [], { search = '', petugas = '', mode = '' } = {}) {
  const elements = {
    searchBox:     { value: search },
    filterPetugas: { value: petugas },
    filterMode:    { value: mode },
  }
  const docMock = {
    getElementById:   id => elements[id] || null,
    addEventListener: () => {},
    createElement:    () => ({}),
    querySelectorAll: () => ({ forEach: () => {} }),
  }
  const noop = () => {}
  // Inject seedRecords into the executed code by prefacing `records = …;` before SOURCE.
  const prelude = `records = ${JSON.stringify(records)};\n`
  const fn = new Function(
    'document', 'window', 'localStorage', 'fetch',
    'esc', 'fmtDate', 'getScriptUrl',
    `${SOURCE}\n${prelude}return { getRecordMode, getRecordName, getFiltered };`
  )
  return fn(
    docMock, { addEventListener: noop },
    { getItem: () => null, setItem: noop, removeItem: noop },
    () => Promise.resolve({ json: () => Promise.resolve({}) }),
    s => String(s ?? ''), () => '', () => '',
  )
}

describe('getRecordMode', () => {
  it('returns "l" when _formMode = "l"', () => {
    const api = makeApiWithRecords([])
    expect(api.getRecordMode({ _formMode: 'l' })).toBe('l')
  })

  it('returns "lub" when _formMode = "lub"', () => {
    const api = makeApiWithRecords([])
    expect(api.getRecordMode({ _formMode: 'lub' })).toBe('lub')
  })

  it('returns "lub" for backward-compat (no _formMode field)', () => {
    const api = makeApiWithRecords([])
    expect(api.getRecordMode({})).toBe('lub')
  })

  it('reads formMode field (without underscore) too', () => {
    const api = makeApiWithRecords([])
    expect(api.getRecordMode({ formMode: 'l' })).toBe('l')
  })
})

describe('getRecordName', () => {
  it('L mode uses nama_kk first', () => {
    const api = makeApiWithRecords([])
    expect(api.getRecordName({ _formMode: 'l', nama_kk: 'Budi', nama_usaha: 'Warung B' })).toBe('Budi')
  })

  it('L mode falls back to nama_usaha if nama_kk empty', () => {
    const api = makeApiWithRecords([])
    expect(api.getRecordName({ _formMode: 'l', nama_kk: '', nama_usaha: 'Warung Bu Budi' }))
      .toBe('Warung Bu Budi')
  })

  it('L mode falls back to nama_perusahaan if other names empty', () => {
    const api = makeApiWithRecords([])
    expect(api.getRecordName({ _formMode: 'l', nama_perusahaan: 'Backup Co' })).toBe('Backup Co')
  })

  it('L.UB mode uses nama_perusahaan', () => {
    const api = makeApiWithRecords([])
    expect(api.getRecordName({ nama_perusahaan: 'PT X' })).toBe('PT X')
  })

  it('returns empty string when no name available', () => {
    const api = makeApiWithRecords([])
    expect(api.getRecordName({})).toBe('')
  })
})

describe('getFiltered — mode filter', () => {
  const recs = [
    { _id: 1, _formMode: 'lub', nama_perusahaan: 'PT A', petugas_nama: 'Andi', kecamatan: 'X' },
    { _id: 2, _formMode: 'l',   nama_kk: 'Budi',         petugas_nama: 'Andi', kecamatan: 'Y' },
    { _id: 3,                   nama_perusahaan: 'PT C', petugas_nama: 'Citra', kecamatan: 'Z' },
  ]

  it('filterMode = "" returns all records', () => {
    const api = makeApiWithRecords(recs)
    expect(api.getFiltered()).toHaveLength(3)
  })

  it('filterMode = "lub" returns only L.UB + legacy records', () => {
    const api = makeApiWithRecords(recs, { mode: 'lub' })
    const out = api.getFiltered()
    expect(out).toHaveLength(2)
    expect(out.every(r => r._id === 1 || r._id === 3)).toBe(true)
  })

  it('filterMode = "l" returns only L records', () => {
    const api = makeApiWithRecords(recs, { mode: 'l' })
    const out = api.getFiltered()
    expect(out).toHaveLength(1)
    expect(out[0]._id).toBe(2)
  })
})

describe('getFiltered — search by L mode name', () => {
  const recs = [
    { _id: 1, _formMode: 'l', nama_kk: 'Budi Santoso',  nama_usaha: 'Warung Budi' },
    { _id: 2, _formMode: 'l', nama_kk: 'Citra Lestari', nama_usaha: 'Toko Citra' },
    { _id: 3, _formMode: 'lub', nama_perusahaan: 'PT Maju' },
  ]

  it('search by nama_kk hits L record', () => {
    const api = makeApiWithRecords(recs, { search: 'Budi' })
    const out = api.getFiltered()
    expect(out.some(r => r._id === 1)).toBe(true)
  })

  it('search by nama_usaha hits L record', () => {
    const api = makeApiWithRecords(recs, { search: 'Warung' })
    const out = api.getFiltered()
    expect(out.some(r => r._id === 1)).toBe(true)
  })

  it('search by nama_perusahaan hits L.UB record', () => {
    const api = makeApiWithRecords(recs, { search: 'Maju' })
    const out = api.getFiltered()
    expect(out.some(r => r._id === 3)).toBe(true)
  })

  it('search is case-insensitive', () => {
    const api = makeApiWithRecords(recs, { search: 'BUDI' })
    const out = api.getFiltered()
    expect(out.some(r => r._id === 1)).toBe(true)
  })
})

describe('getFiltered — petugas filter combined with mode', () => {
  const recs = [
    { _id: 1, _formMode: 'lub', petugas_nama: 'Andi' },
    { _id: 2, _formMode: 'l',   petugas_nama: 'Andi' },
    { _id: 3, _formMode: 'l',   petugas_nama: 'Budi' },
  ]

  it('mode=l + petugas=Andi → only record 2', () => {
    const api = makeApiWithRecords(recs, { mode: 'l', petugas: 'Andi' })
    const out = api.getFiltered()
    expect(out).toHaveLength(1)
    expect(out[0]._id).toBe(2)
  })

  it('mode=lub + petugas=Andi → only record 1', () => {
    const api = makeApiWithRecords(recs, { mode: 'lub', petugas: 'Andi' })
    const out = api.getFiltered()
    expect(out).toHaveLength(1)
    expect(out[0]._id).toBe(1)
  })

  it('no mode filter + petugas=Andi → records 1 + 2', () => {
    const api = makeApiWithRecords(recs, { petugas: 'Andi' })
    const out = api.getFiltered()
    expect(out).toHaveLength(2)
  })
})

describe('getFiltered — backward compat', () => {
  it('records without _formMode default to L.UB visibility under "lub" filter', () => {
    const recs = [{ _id: 99, nama_perusahaan: 'Legacy Co' }]
    const api = makeApiWithRecords(recs, { mode: 'lub' })
    expect(api.getFiltered()).toHaveLength(1)
  })

  it('legacy records hidden under "l" filter', () => {
    const recs = [{ _id: 99, nama_perusahaan: 'Legacy Co' }]
    const api = makeApiWithRecords(recs, { mode: 'l' })
    expect(api.getFiltered()).toHaveLength(0)
  })
})
