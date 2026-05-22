/* ====== PASSWORD GATE — DAFTAR USAHA ====== */
// Default fallback jika sheet belum dikonfigurasi: Daftar08!
const DEFAULT_PW_HASH = 'd4e8da786e7af1fce2677a23a6d30a5f243f8e75f1877546adb72b78cee85e17';
const PW_SESSION_KEY  = 'cawi_daftar_auth_v1';

let _activeHash = null;

async function loadPasswordHash() {
  try {
    const res = await fetch(getScriptUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'getConfig' })
    });
    const d = await res.json();
    if (d.status === 'ok' && d.data && d.data.daftar_pw_hash) {
      _activeHash = d.data.daftar_pw_hash;
    }
  } catch(e) { /* fallback ke default */ }
  if (!_activeHash) _activeHash = DEFAULT_PW_HASH;
}

async function checkPassword() {
  if (!_activeHash) return;
  const pw = document.getElementById('pwInput').value;
  if (!pw) return;
  const btn = document.querySelector('#pwGate button');
  const inp = document.getElementById('pwInput');
  const errEl = document.getElementById('pwError');
  const cardEl = document.querySelector('#pwGate > div');
  if (errEl) errEl.style.display = 'none';
  if (inp) inp.disabled = true;
  if (btn) {
    btn.disabled = true;
    btn.dataset.prevLabel = btn.innerHTML;
    btn.innerHTML = '<span class="pw-spinner" aria-hidden="true"></span>Memverifikasi…';
  }
  try {
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
    } else {
      if (errEl) errEl.style.display = 'block';
      if (inp) { inp.value = ''; inp.focus(); }
      if (cardEl) {
        cardEl.classList.remove('wobble');
        void cardEl.offsetWidth;
        cardEl.classList.add('wobble');
      }
      if (btn) { btn.disabled = false; btn.innerHTML = btn.dataset.prevLabel || 'Masuk'; }
    }
  } finally {
    if (inp) inp.disabled = false;
    if (btn && btn.disabled) { btn.disabled = false; btn.innerHTML = btn.dataset.prevLabel || 'Masuk'; }
  }
}

function logoutKuesioner() {
  sessionStorage.removeItem(PW_SESSION_KEY);
  location.reload();
}

(async function() {
  if (sessionStorage.getItem(PW_SESSION_KEY) === '1') {
    document.getElementById('pwGate').style.display = 'none';
    return;
  }
  const input = document.getElementById('pwInput');
  const btn   = document.querySelector('#pwGate button');
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
    btn.innerHTML = btn.dataset.initLabel || 'Masuk';
    delete btn.dataset.initLabel;
  }
})();
