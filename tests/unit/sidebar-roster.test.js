import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const SRC = readFileSync(resolve(ROOT, 'js/shared/form-core.js'), 'utf8')

/* Muat goBlokOpen + toggleSidebarRoster dari form-core.js dengan dependensi
 * (document, getFormMode, goBlok) di-inject sebagai parameter. */
function load(document, getFormMode, goBlok) {
  // eslint-disable-next-line no-new-func
  const fn = new Function(
    'document', 'getFormMode', 'goBlok',
    `${SRC}\nreturn { goBlokOpen, toggleSidebarRoster };`
  )
  return fn(document, getFormMode || (() => 'l'), goBlok || (() => {}))
}

/* classList mock yang melacak kelas dalam Set. */
function mkClassList(initial = []) {
  const s = new Set(initial)
  return {
    add: c => s.add(c),
    remove: c => s.delete(c),
    contains: c => s.has(c),
    toggle: (c, force) => {
      if (force === undefined) {
        if (s.has(c)) { s.delete(c); return false }
        s.add(c); return true
      }
      if (force) { s.add(c); return true }
      s.delete(c); return false
    },
  }
}

/* ─────────────── toggleSidebarRoster() ─────────────── */
describe('toggleSidebarRoster() — expand/collapse grup roster di sidebar', () => {
  function setup() {
    const items = { classList: mkClassList(), _kind: 'items' }
    items.classList.add('sidebar-roster-items')
    const group = { querySelector: sel => sel === '.sidebar-roster-items' ? items : null }
    const caret = {
      classList: mkClassList(['open']),
      nextElementSibling: null,            // caret = elemen terakhir di header
      closest: sel => sel === '[id$="Group"]' ? group : null,
    }
    return { items, caret }
  }

  it('klik caret meng-collapse daftar entri (tambah sb-roster-collapsed, lepas open)', () => {
    const { items, caret } = setup()
    const { toggleSidebarRoster } = load()
    toggleSidebarRoster(caret)
    expect(items.classList.contains('sb-roster-collapsed')).toBe(true)
    expect(caret.classList.contains('open')).toBe(false)
  })

  it('klik caret dua kali kembali ter-expand (toggle)', () => {
    const { items, caret } = setup()
    const { toggleSidebarRoster } = load()
    toggleSidebarRoster(caret)
    toggleSidebarRoster(caret)
    expect(items.classList.contains('sb-roster-collapsed')).toBe(false)
    expect(caret.classList.contains('open')).toBe(true)
  })

  it('mendukung head lama (nextElementSibling = items) tanpa caret', () => {
    const items = { classList: mkClassList() }
    items.classList.add('sidebar-roster-items')
    const head = { classList: mkClassList(['open']), nextElementSibling: items }
    const { toggleSidebarRoster } = load()
    toggleSidebarRoster(head)
    expect(items.classList.contains('sb-roster-collapsed')).toBe(true)
  })

  it('aman bila el null / tanpa items (tidak melempar)', () => {
    const { toggleSidebarRoster } = load()
    expect(() => toggleSidebarRoster(null)).not.toThrow()
    expect(() => toggleSidebarRoster({ nextElementSibling: null, closest: () => null })).not.toThrow()
  })
})

/* ─────────────── goBlokOpen() ─────────────── */
describe('goBlokOpen() — navigasi blok + auto-expand daftar pertanyaan', () => {
  function setupDoc(mode) {
    const list = { classList: mkClassList(['hidden']) }
    const btn = { classList: mkClassList() }
    const ids = {}
    const suffix = mode === 'l' ? 'L' : ''
    ids['sidebarQList' + suffix + '2'] = list
    ids['sidebarExpandBtn' + suffix + '2'] = btn
    const document = { getElementById: id => ids[id] || null }
    return { document, list, btn }
  }

  it('memanggil goBlok lalu membuka q-list (lepas hidden, tandai btn open) — mode L', () => {
    const { document, list, btn } = setupDoc('l')
    const calls = []
    const { goBlokOpen } = load(document, () => 'l', n => calls.push(n))
    goBlokOpen(2)
    expect(calls).toEqual([2])
    expect(list.classList.contains('hidden')).toBe(false)
    expect(btn.classList.contains('open')).toBe(true)
  })

  it('tidak melempar bila q-list blok tak punya daftar pertanyaan', () => {
    const document = { getElementById: () => null }
    const calls = []
    const { goBlokOpen } = load(document, () => 'l', n => calls.push(n))
    expect(() => goBlokOpen(4)).not.toThrow()
    expect(calls).toEqual([4])  // navigasi tetap terjadi
  })
})
