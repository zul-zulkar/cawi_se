/* ====== PASSWORD GATE ====== */
// Default fallback jika sheet belum dikonfigurasi (untuk duplikat baru): Kuesioner08!
const DEFAULT_PW_HASH = '3e7551e772ef6f4b10197687eeb9779ded613d21b05ec5848e911e829e68cc11';
const PW_SESSION_KEY  = 'cawi_auth_v1';

let _activeHash = null;

async function loadPasswordHash() {
  try {
    const res = await fetch(getScriptUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'getConfig' })
    });
    const d = await res.json();
    if (d.status === 'ok' && d.data && d.data.kuesioner_pw_hash) {
      _activeHash = d.data.kuesioner_pw_hash;
    }
  } catch(e) { /* fallback ke default */ }
  if (!_activeHash) _activeHash = DEFAULT_PW_HASH;
}

async function checkPassword() {
  if (!_activeHash) return;
  const pw = document.getElementById('pwInput').value;
  if (!pw) return;
  const btn = document.querySelector('#pwGate .pw-btn, #pwGate button[type="button"], #pwGate button:not([type])');
  const inp = document.getElementById('pwInput');
  const errEl = document.getElementById('pwError');
  const cardEl = document.querySelector('#pwGate .pw-card');
  if (errEl) errEl.style.display = 'none';
  if (inp) { inp.disabled = true; inp.classList.remove('error'); }
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="pw-spinner" aria-hidden="true"></span>Memverifikasi…';
  }
  try {
    // Hashing is fast, but ensure the user sees the loading state briefly
    const [h] = await Promise.all([
      hashPassword(pw),
      new Promise(r => setTimeout(r, 280)),
    ]);
    if (h === _activeHash) {
      sessionStorage.setItem(PW_SESSION_KEY, '1');
      const gate = document.getElementById('pwGate');
      if (gate) {
        gate.style.transition = 'opacity .35s ease';
        gate.style.opacity = '0';
        setTimeout(() => { gate.style.display = 'none'; }, 350);
      }
      document.dispatchEvent(new Event('cawi-auth-ok'));
    } else {
      if (errEl) errEl.style.display = 'block';
      if (inp) { inp.value = ''; inp.classList.add('error'); inp.focus(); }
      if (cardEl) {
        cardEl.classList.remove('wobble');
        // Trigger reflow to restart animation
        void cardEl.offsetWidth;
        cardEl.classList.add('wobble');
      }
      if (btn) { btn.disabled = false; btn.innerHTML = '&#128274; Masuk'; }
    }
  } catch (e) {
    if (btn) { btn.disabled = false; btn.innerHTML = '&#128274; Masuk'; }
  } finally {
    if (inp) inp.disabled = false;
  }
}

function logoutKuesioner() {
  sessionStorage.removeItem(PW_SESSION_KEY);
  localStorage.removeItem('cawi_form_mode'); // force mode-gate on next login
  location.reload();
}

(async function() {
  if (sessionStorage.getItem(PW_SESSION_KEY) === '1') {
    document.getElementById('pwGate').style.display = 'none';
    // Dispatch on next tick so listeners (which are wired in DOMContentLoaded) have a chance to attach
    setTimeout(() => document.dispatchEvent(new Event('cawi-auth-ok')), 0);
    return;
  }
  const input = document.getElementById('pwInput');
  const btn   = document.querySelector('#pwGate .pw-btn, #pwGate button');
  if (input) {
    input.disabled    = true;
    input.placeholder = 'Memuat konfigurasi…';
  }
  if (btn) {
    btn.disabled = true;
    btn.dataset.initLabel = btn.innerHTML;
    btn.innerHTML = '<span class="pw-spinner" aria-hidden="true"></span>Memuat…';
  }

  await loadPasswordHash();

  if (input) {
    input.disabled    = false;
    input.placeholder = 'Masukkan kata sandi';
    input.focus();
  }
  if (btn) {
    btn.disabled = false;
    btn.innerHTML = btn.dataset.initLabel || '&#128274; Masuk';
    delete btn.dataset.initLabel;
  }
})();
