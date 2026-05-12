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
