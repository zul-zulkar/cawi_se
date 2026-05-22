// ══════════════════════════════════════════════
// ADMIN GATE
// ══════════════════════════════════════════════
// Default fallback jika sheet belum dikonfigurasi (untuk duplikat baru)
// Admin: Admin08! — Kuesioner: Kuesioner08!
const ADMIN_DEFAULT_HASH = 'b2df8fb41bd751d3e93a579175ffa5a15c8185dd82df4fe3224040eba3fd8a76';
const DEFAULT_PW_HASH    = '3e7551e772ef6f4b10197687eeb9779ded613d21b05ec5848e911e829e68cc11';
const ADMIN_SESSION_KEY  = 'cawi_admin_auth_v1';

let _adminHash     = null;
let _kuesionerHash = null;

async function fetchConfig() {
  try {
    const res = await fetch(getScriptUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'getConfig' })
    });
    const d = await res.json();
    if (d.status === 'ok' && d.data) {
      if (d.data.admin_pw_hash)     _adminHash     = d.data.admin_pw_hash;
      if (d.data.kuesioner_pw_hash) _kuesionerHash = d.data.kuesioner_pw_hash;
    }
  } catch(e) { /* fallback ke default */ }
  if (!_adminHash)     _adminHash     = ADMIN_DEFAULT_HASH;
  if (!_kuesionerHash) _kuesionerHash = DEFAULT_PW_HASH;
}

async function checkAdminPassword() {
  const input = document.getElementById('adminPwInput');
  if (input.disabled) return;
  const pw = input.value;
  if (!pw) return;
  const btn = document.querySelector('#adminGate .gate-box button');
  const errEl = document.getElementById('adminPwError');
  const cardEl = document.querySelector('#adminGate .gate-box');
  if (errEl) errEl.style.display = 'none';
  input.disabled = true;
  if (btn) {
    btn.disabled = true;
    btn.dataset.prevLabel = btn.innerHTML;
    btn.innerHTML = '<span class="pw-spinner" aria-hidden="true"></span>Memverifikasi…';
  }
  try {
    const [h] = await Promise.all([
      sha256(pw),
      new Promise(r => setTimeout(r, 280)),
    ]);
    if (h === _adminHash) {
      sessionStorage.setItem(ADMIN_SESSION_KEY, '1');
      const gate = document.getElementById('adminGate');
      if (gate) {
        gate.style.transition = 'opacity .35s ease';
        gate.style.opacity = '0';
        setTimeout(() => { gate.style.display = 'none'; initPage(); }, 350);
      } else {
        initPage();
      }
    } else {
      if (errEl) errEl.style.display = 'block';
      input.value = '';
      input.focus();
      if (cardEl) {
        cardEl.classList.remove('wobble');
        void cardEl.offsetWidth;
        cardEl.classList.add('wobble');
      }
      if (btn) { btn.disabled = false; btn.innerHTML = btn.dataset.prevLabel || 'Masuk'; }
    }
  } finally {
    input.disabled = false;
    if (btn && btn.disabled) { btn.disabled = false; btn.innerHTML = btn.dataset.prevLabel || 'Masuk'; }
  }
}

document.getElementById('adminPwInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') checkAdminPassword();
});

(async function() {
  const input = document.getElementById('adminPwInput');
  const btn   = document.querySelector('#adminGate .gate-box button');
  if (input) {
    input.disabled    = true;
    input.placeholder = 'Memuat konfigurasi…';
  }
  if (btn) {
    btn.disabled = true;
    btn.dataset.initLabel = btn.innerHTML;
    btn.innerHTML = '<span class="pw-spinner" aria-hidden="true"></span>Memuat…';
  }

  await fetchConfig();

  if (sessionStorage.getItem(ADMIN_SESSION_KEY) === '1') {
    document.getElementById('adminGate').style.display = 'none';
    initPage();
    return;
  }

  if (input) {
    input.disabled    = false;
    input.placeholder = 'Kata sandi admin';
    input.focus();
  }
  if (btn) {
    btn.disabled = false;
    btn.innerHTML = btn.dataset.initLabel || 'Masuk';
    delete btn.dataset.initLabel;
  }
})();

function logoutAdmin() {
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
  location.reload();
}
