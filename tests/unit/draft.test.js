import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT   = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const SOURCE = readFileSync(resolve(ROOT, 'js/shared/draft.js'), 'utf8')

const LS_DRAFTS = 'cawi_se2026_drafts_v1'

function makeMockStorage(initial = {}) {
  const store = Object.assign({}, initial)
  return {
    getItem:    key       => store[key] ?? null,
    setItem:    (key, val) => { store[key] = val },
    removeItem: key       => { delete store[key] },
    _store:     store,
  }
}

function makeModule(storage = makeMockStorage()) {
  const noop = () => {}
  const mockDoc = {
    getElementById:   () => null,
    querySelector:    () => null,
    querySelectorAll: () => ({ forEach: noop }),
    addEventListener: noop,
    body:  { appendChild: noop },
    createElement: () => ({ style: {}, textContent: '' }),
  }
  const fn = new Function(
    'document', 'window', 'localStorage',
    `${SOURCE}\nreturn { getDraftList, deleteDraftById };`
  )
  return fn(mockDoc, { addEventListener: noop }, storage)
}

// ─── getDraftList() ─────────────────────────────────────────────────────────

describe('getDraftList()', () => {
  it('returns [] when nothing is stored', () => {
    const { getDraftList } = makeModule()
    expect(getDraftList()).toEqual([])
  })

  it('returns [] when stored value is invalid JSON', () => {
    const storage = makeMockStorage({ [LS_DRAFTS]: 'not-valid-json{{' })
    const { getDraftList } = makeModule(storage)
    expect(getDraftList()).toEqual([])
  })

  it('returns [] when stored value is empty string (falls back to "[]")', () => {
    const storage = makeMockStorage({ [LS_DRAFTS]: '' })
    const { getDraftList } = makeModule(storage)
    expect(getDraftList()).toEqual([])
  })

  it('returns a single-element array when one draft is stored', () => {
    const draft = { _draftId: 'draft_001', nama_perusahaan: 'PT X' }
    const storage = makeMockStorage({ [LS_DRAFTS]: JSON.stringify([draft]) })
    const { getDraftList } = makeModule(storage)
    const list = getDraftList()
    expect(list).toHaveLength(1)
    expect(list[0]._draftId).toBe('draft_001')
    expect(list[0].nama_perusahaan).toBe('PT X')
  })

  it('returns all entries when multiple drafts are stored', () => {
    const drafts = [
      { _draftId: 'a', nama_perusahaan: 'PT A' },
      { _draftId: 'b', nama_perusahaan: 'PT B' },
      { _draftId: 'c', nama_perusahaan: 'PT C' },
    ]
    const storage = makeMockStorage({ [LS_DRAFTS]: JSON.stringify(drafts) })
    const { getDraftList } = makeModule(storage)
    expect(getDraftList()).toHaveLength(3)
  })

  it('returns [] when getItem throws (e.g. storage restricted)', () => {
    const storage = {
      getItem:    () => { throw new Error('SecurityError') },
      setItem:    () => {},
      removeItem: () => {},
    }
    const { getDraftList } = makeModule(storage)
    expect(getDraftList()).toEqual([])
  })

  it('preserves draft metadata fields', () => {
    const draft = {
      _draftId: 'draft_999', _ts: '2026-01-01T00:00:00.000Z',
      nama_perusahaan: 'CV Maju', kecamatan: 'Sukasada',
      petugas_nama: 'Budi', kbli_kode: '47110',
    }
    const storage = makeMockStorage({ [LS_DRAFTS]: JSON.stringify([draft]) })
    const { getDraftList } = makeModule(storage)
    expect(getDraftList()[0]).toMatchObject(draft)
  })
})

// ─── deleteDraftById() ──────────────────────────────────────────────────────

describe('deleteDraftById()', () => {
  it('removes the entry with the matching _draftId', () => {
    const drafts = [
      { _draftId: 'a', nama_perusahaan: 'PT A' },
      { _draftId: 'b', nama_perusahaan: 'PT B' },
    ]
    const storage = makeMockStorage({ [LS_DRAFTS]: JSON.stringify(drafts) })
    const { getDraftList, deleteDraftById } = makeModule(storage)

    deleteDraftById('a')
    expect(getDraftList()).toHaveLength(1)
    expect(getDraftList()[0]._draftId).toBe('b')
  })

  it('keeps remaining entries intact', () => {
    const drafts = [
      { _draftId: 'x', nama_perusahaan: 'PT X', kecamatan: 'Kuta' },
      { _draftId: 'y', nama_perusahaan: 'PT Y', kecamatan: 'Sukasada' },
    ]
    const storage = makeMockStorage({ [LS_DRAFTS]: JSON.stringify(drafts) })
    const { getDraftList, deleteDraftById } = makeModule(storage)

    deleteDraftById('x')
    expect(getDraftList()[0]).toMatchObject({ _draftId: 'y', nama_perusahaan: 'PT Y' })
  })

  it('does nothing if the id is not found', () => {
    const drafts = [{ _draftId: 'a', nama_perusahaan: 'PT A' }]
    const storage = makeMockStorage({ [LS_DRAFTS]: JSON.stringify(drafts) })
    const { getDraftList, deleteDraftById } = makeModule(storage)

    deleteDraftById('nonexistent')
    expect(getDraftList()).toHaveLength(1)
  })

  it('empties the list when the only entry is deleted', () => {
    const storage = makeMockStorage({ [LS_DRAFTS]: JSON.stringify([{ _draftId: 'only' }]) })
    const { getDraftList, deleteDraftById } = makeModule(storage)

    deleteDraftById('only')
    expect(getDraftList()).toEqual([])
  })

  it('persists deletion to storage — subsequent getDraftList reflects the change', () => {
    const drafts = [
      { _draftId: 'p', nama_perusahaan: 'PT P' },
      { _draftId: 'q', nama_perusahaan: 'PT Q' },
    ]
    const storage = makeMockStorage({ [LS_DRAFTS]: JSON.stringify(drafts) })
    const { getDraftList, deleteDraftById } = makeModule(storage)

    deleteDraftById('p')
    const list = getDraftList()
    expect(list).toHaveLength(1)
    expect(list[0]._draftId).toBe('q')
  })

  it('handles deletion from an empty list without throwing', () => {
    const storage = makeMockStorage({ [LS_DRAFTS]: '[]' })
    const { getDraftList, deleteDraftById } = makeModule(storage)

    expect(() => deleteDraftById('abc')).not.toThrow()
    expect(getDraftList()).toEqual([])
  })

  it('deletes all matching entries when two identical _draftIds exist', () => {
    // Defensive: shouldn't happen in practice, but filter removes all matches
    const drafts = [
      { _draftId: 'dup', nama_perusahaan: 'A' },
      { _draftId: 'dup', nama_perusahaan: 'B' },
      { _draftId: 'other', nama_perusahaan: 'C' },
    ]
    const storage = makeMockStorage({ [LS_DRAFTS]: JSON.stringify(drafts) })
    const { getDraftList, deleteDraftById } = makeModule(storage)

    deleteDraftById('dup')
    const list = getDraftList()
    expect(list).toHaveLength(1)
    expect(list[0]._draftId).toBe('other')
  })
})
