/**
 * Load a browser script file and extract named functions for unit testing.
 *
 * Strategy: wrap source code in new Function() with mocked DOM stubs so that
 * top-level DOM side-effects (canvas setup, addEventListener) are no-ops while
 * pure function declarations are returned and tested against production code.
 *
 * Works without any changes to the source files.
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

/* ── Minimal DOM stubs ── */
const mockCtx = {
  beginPath: () => {}, moveTo: () => {}, lineTo: () => {},
  stroke: () => {}, clearRect: () => {},
  strokeStyle: '', lineWidth: 0, lineCap: '',
}

const mockCanvas = {
  getContext: () => mockCtx,
  addEventListener: () => {},
  width: 300, height: 150,
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 300, height: 150 }),
}

export const mockDocument = {
  addEventListener: () => {},
  getElementById: (id) => id === 'sigCanvas' ? mockCanvas : null,
  querySelector: () => null,
  querySelectorAll: () => ({ forEach: () => {} }),
  createElement: () => ({ appendChild: () => {} }),
}

export const mockWindow = {
  addEventListener: () => {},
  document: mockDocument,
}

/**
 * Extract named function declarations from a browser script.
 * @param {string} relPath  Path relative to project root, e.g. 'js/utils.js'
 * @param {...string} names  Names of functions to extract
 * @returns {Object} Map of function name → function
 */
export function extractFrom(relPath, ...names) {
  const code = readFileSync(resolve(ROOT, relPath), 'utf8')
  // new Function runs in sloppy mode (no strict) so function declarations
  // are visible throughout the body and captured in the return object.
  // eslint-disable-next-line no-new-func
  const fn = new Function('document', 'window', `${code}\nreturn { ${names.join(', ')} };`)
  return fn(mockDocument, mockWindow)
}
