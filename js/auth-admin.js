// ══════════════════════════════════════════════
// ADMIN GATE
// ══════════════════════════════════════════════
// Hash SHA-256 untuk password admin default: AdminBPS2026!
const ADMIN_DEFAULT_HASH = '5a55c7873ed7338f35d782adb513d336a36086ddec0fa4b6444fda6d440387c2';
const DEFAULT_PW_HASH    = '941bacc5d2499f5e06108337bca646d12b59fb1d131cf763fce025b682bdd7d8';
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
  const h = await sha256(pw);
  if (h === _adminHash) {
    sessionStorage.setItem(ADMIN_SESSION_KEY, '1');
    document.getElementById('adminGate').style.display = 'none';
    initPage();
  } else {
    document.getElementById('adminPwError').style.display = 'block';
    document.getElementById('adminPwInput').value = '';
    document.getElementById('adminPwInput').focus();
  }
}

document.getElementById('adminPwInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') checkAdminPassword();
});

(async function() {
  const input = document.getElementById('adminPwInput');
  const btn   = document.querySelector('#adminGate .gate-box button');
  input.disabled    = true;
  input.placeholder = 'Memuat…';
  btn.disabled      = true;

  await fetchConfig();

  if (sessionStorage.getItem(ADMIN_SESSION_KEY) === '1') {
    document.getElementById('adminGate').style.display = 'none';
    initPage();
    return;
  }

  input.disabled    = false;
  input.placeholder = 'Kata sandi admin';
  btn.disabled      = false;
  input.focus();
})();

function logoutAdmin() {
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
  location.reload();
}
