/* ====== FORM MODE (L.UB vs L; + Unified P) ====== */
const LS_MODE   = 'cawi_form_mode';
const MODE_LUB  = 'lub';
const MODE_L    = 'l';
const MODE_UNIFIED = 'unified'; // SE2026-P: Blok P + L/L.UB dalam satu halaman

// Aktifkan unified mode (Blok P sebagai entri). Stage (l/lub) ditentukan
// runtime oleh PMT_GATE_RULES; lihat js/form-p/form-p.js.
function setUnifiedMode(on) {
  document.body.classList.toggle('mode-unified', on !== false);
}
function isUnifiedActive() {
  return !!(document.body && document.body.classList.contains('mode-unified'));
}

function getFormMode() {
  const m = localStorage.getItem(LS_MODE);
  return (m === MODE_L) ? MODE_L : MODE_LUB;
}

function setFormMode(mode) {
  const m = (mode === MODE_L) ? MODE_L : MODE_LUB;
  localStorage.setItem(LS_MODE, m);
  applyFormMode(m);
  return m;
}

function hasFormMode() {
  return !!localStorage.getItem(LS_MODE);
}

function clearFormMode() {
  localStorage.removeItem(LS_MODE);
}

function applyFormMode(mode) {
  const m = (mode === MODE_L) ? MODE_L : MODE_LUB;
  document.body.classList.toggle('mode-l',   m === MODE_L);
  document.body.classList.toggle('mode-lub', m === MODE_LUB);
  // Reset sidebar/blok navigation to Blok 1 of current mode
  const headerKop = document.getElementById('headerKop');
  if (headerKop) headerKop.classList.remove('kop-hidden');
  // Update sidebar mode-badge label
  const lbl = document.getElementById('sidebarModeLabel');
  if (lbl) {
    lbl.className = 'mode-badge mode-badge-' + m;
    lbl.textContent = (m === MODE_L) ? 'L' : 'L.UB';
  }
}

/* Mode pre-selector 2-gate (showModeGate/hideModeGate/chooseMode/switchFormMode)
   DIHAPUS — semua assignment kini unified P; mode legacy L/L.UB ditentukan
   deterministik dari ?mode= oleh guard (01b-assignment-guard.html) lalu di-apply
   saat restore draft. Tidak ada lagi pemilih kuesioner di UI. */
