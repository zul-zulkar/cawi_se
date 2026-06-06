/* ====== FORM MODE (L + Unified P) ======
 * Subsistem L.UB di-retire: satu-satunya kuesioner lanjutan kini form L.
 * getFormMode() karena itu SELALU 'l'. Unified P (Blok P) berdiri di atas form L
 * lewat class body `mode-unified`; visibilitas #form-l di unified ditentukan oleh
 * class stage (stage-keluarga/stage-usaha) — lihat css/index/form-l.css & form-p.js. */
const LS_MODE      = 'cawi_form_mode';
const MODE_L       = 'l';
const MODE_UNIFIED = 'unified'; // SE2026-P: Blok P + form L dalam satu halaman

// Aktifkan unified mode (Blok P sebagai entri). Stage ditentukan runtime oleh
// PMT_GATE_RULES; lihat js/form-p/form-p.js.
function setUnifiedMode(on) {
  document.body.classList.toggle('mode-unified', on !== false);
}
function isUnifiedActive() {
  return !!(document.body && document.body.classList.contains('mode-unified'));
}

// Mode kuesioner lanjutan kini selalu 'l' (L.UB dilebur/di-retire).
function getFormMode() {
  return MODE_L;
}

function setFormMode(mode) {
  localStorage.setItem(LS_MODE, MODE_L);
  applyFormMode(MODE_L);
  return MODE_L;
}

function hasFormMode() {
  return !!localStorage.getItem(LS_MODE);
}

function clearFormMode() {
  localStorage.removeItem(LS_MODE);
}

function applyFormMode() {
  document.body.classList.add('mode-l');
  document.body.classList.remove('mode-lub'); // jaga-jaga untuk draft lama
  // Reset header kop ke Blok 1
  const headerKop = document.getElementById('headerKop');
  if (headerKop) headerKop.classList.remove('kop-hidden');
  // Sidebar mode-badge label (jika masih ada di markup)
  const lbl = document.getElementById('sidebarModeLabel');
  if (lbl) { lbl.className = 'mode-badge mode-badge-l'; lbl.textContent = 'L'; }
}
