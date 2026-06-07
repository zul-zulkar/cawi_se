/* ====== FORM CORE — helper bersama (L & P) ======
 * Helper fondasi yang dipakai seluruh aplikasi kuesioner (form L & form P).
 * Sebelumnya tinggal di js/form-lub/form.js (mis-named); dipindah ke sini saat
 * subsistem L.UB di-retire. Harus dimuat SEBELUM form-l/form-p/submit.
 * Tidak ada logika spesifik L.UB di file ini. */

/* ---- Pembaca nilai field ---- */
function getRadio(name) {
  const el = document.querySelector(`input[name="${name}"]:checked`);
  return el ? el.value : '';
}

function getVal(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

/* ---- Mata uang ---- */
function parseCurrency(s) {
  return parseFloat((s || '').replace(/\./g,'').replace(',','.')) || 0;
}

function formatCurrency(el) {
  const raw = el.value;
  const commaIdx = raw.indexOf(',');
  if (commaIdx === -1) {
    const digits = raw.replace(/\D/g,'');
    if (!digits) { el.value = ''; return; }
    el.value = parseInt(digits,10).toLocaleString('id-ID');
  } else {
    const intPart = raw.substring(0,commaIdx).replace(/\D/g,'');
    const decPart = raw.substring(commaIdx+1).replace(/\D/g,'').substring(0,2);
    const intFormatted = intPart ? parseInt(intPart,10).toLocaleString('id-ID') : '0';
    el.value = intFormatted + ',' + decPart;
  }
}

function setCurrencyReadonly(id, val) {
  document.getElementById(id).value = (val || 0).toLocaleString('id-ID',{minimumFractionDigits:2,maximumFractionDigits:2});
}

/* ---- Validator format ---- */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidHP(hp) {
  return /^(\+62|62|0)[0-9]{8,13}$/.test(hp.replace(/[\s\-]/g,''));
}

/* ---- Alert inline ---- */
function showAlert(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
  el.scrollIntoView({behavior:'smooth', block:'center'});
}

function hideAlert(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('hidden');
}

function markFieldFilled(el) {
  if (!el || el.readOnly || el.disabled) return;
  el.classList.toggle('field-filled', el.value.trim().length > 0);
}

/* ====== SIDEBAR BLOK ACCORDION & NAVIGASI ====== */
function toggleSidebarBlok(n) {
  const mode = (typeof getFormMode === 'function') ? getFormMode() : 'l';
  const listPrefix = (mode === 'l') ? 'sidebarQListL' : 'sidebarQList';
  const btnPrefix  = (mode === 'l') ? 'sidebarExpandBtnL' : 'sidebarExpandBtn';
  const list = document.getElementById(listPrefix + n);
  const btn  = document.getElementById(btnPrefix  + n);
  if (!list) return;
  const opening = list.classList.contains('hidden');
  list.classList.toggle('hidden');
  if (btn) btn.classList.toggle('open', opening);
}

function goBlokAndScroll(blokNum, qId) {
  goBlok(blokNum);
  setTimeout(() => scrollToQuestion(qId), 280);
}

/* Klik header blok di sidebar: navigasi ke blok SEKALIGUS buka daftar
 * pertanyaannya (termasuk grup roster anggota/usaha) agar petugas bisa langsung
 * melihat & melompat ke pertanyaan / masuk ke roster. */
function goBlokOpen(blokNum) {
  goBlok(blokNum);
  const mode = (typeof getFormMode === 'function') ? getFormMode() : 'l';
  const list = document.getElementById((mode === 'l' ? 'sidebarQListL' : 'sidebarQList') + blokNum);
  const btn  = document.getElementById((mode === 'l' ? 'sidebarExpandBtnL' : 'sidebarExpandBtn') + blokNum);
  if (list && list.classList.contains('hidden')) {
    list.classList.remove('hidden');
    if (btn) btn.classList.add('open');
  }
}

function scrollToId(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({behavior: 'smooth', block: 'start'});
  el.style.backgroundColor = '#fffaeb';
  setTimeout(() => {
    el.style.transition = 'background-color 0.5s ease';
    el.style.backgroundColor = 'transparent';
    setTimeout(() => { el.style.transition = ''; }, 500);
  }, 1200);
}

function goBlokAndScrollId(blokNum, id) {
  goBlok(blokNum);
  setTimeout(() => scrollToId(id), 280);
}

/* ====== BLOK OUTLINE FUNCTIONS ====== */
function toggleBlokOutline(btn) {
  const list = btn.nextElementSibling;
  const isHidden = list.classList.contains('hidden');
  list.classList.toggle('hidden');
  btn.classList.toggle('expanded');
}

function scrollToQuestion(qNum) {
  const el = document.getElementById('sec-' + qNum);
  if (el) {
    el.scrollIntoView({behavior: 'smooth', block: 'start'});
    el.style.backgroundColor = '#fffaeb';
    setTimeout(() => {
      el.style.transition = 'background-color 0.5s ease';
      el.style.backgroundColor = 'transparent';
    }, 100);
  }
}
