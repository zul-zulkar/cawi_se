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
  const h = await hashPassword(pw);
  if (h === _activeHash) {
    sessionStorage.setItem(PW_SESSION_KEY, '1');
    document.getElementById('pwGate').style.display = 'none';
  } else {
    document.getElementById('pwError').style.display = 'block';
    document.getElementById('pwInput').value = '';
    document.getElementById('pwInput').focus();
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
  input.disabled    = true;
  input.placeholder = 'Memuat…';
  btn.disabled      = true;

  await loadPasswordHash();

  input.disabled    = false;
  input.placeholder = 'Masukkan kata sandi';
  btn.disabled      = false;
  input.focus();
})();
