/* ====== FORM MODE (L.UB vs L) ====== */
const LS_MODE   = 'cawi_form_mode';
const MODE_LUB  = 'lub';
const MODE_L    = 'l';

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

/* Pre-selector modal */
function showModeGate(forSwitch) {
  const gate = document.getElementById('modeGate');
  if (!gate) return;
  gate.classList.add('open');
  const cancel = document.getElementById('modeCancelBtn');
  if (cancel) cancel.style.display = forSwitch ? '' : 'none';
}

function hideModeGate() {
  const gate = document.getElementById('modeGate');
  if (gate) gate.classList.remove('open');
}

function chooseMode(mode) {
  setFormMode(mode);
  hideModeGate();
  if (typeof updateProgress === 'function') updateProgress();
}

/* Switch via sidebar — warn if there's user data */
function switchFormMode() {
  const dirty = (typeof _formDirty !== 'undefined' && _formDirty)
    || (typeof _currentDraftId !== 'undefined' && _currentDraftId);
  if (dirty) {
    if (!confirm('Mengganti jenis kuesioner akan menutup form saat ini. Pastikan draft sudah tersimpan. Lanjutkan?')) return;
  }
  showModeGate(true);
}
