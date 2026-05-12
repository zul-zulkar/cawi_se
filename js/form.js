function handleKawasan() {
  const v = getRadio('q5d');
  // Show Q5e only when a specific kawasan (1-9) is selected; hide for "Di luar kawasan" or unselected
  document.getElementById('q5e_wrap').classList.toggle('hidden', !v || v === '10');
}

function handleNIB() {
  const v = getRadio('q6a');
  document.getElementById('q6b_wrap').classList.toggle('hidden', v !== '1');
  document.getElementById('q6c_wrap').classList.toggle('hidden', v !== '2');
}

function handleNIBAlasan() {
  const v = getRadio('q6c');
  document.getElementById('q6c_alasan_wrap').classList.toggle('hidden', v !== '5');
}

function handleBadanUsaha() {
  const v = getRadio('q7a');
  document.getElementById('q7_koperasi_wrap').classList.toggle('hidden', v !== '3');
}

function handleJaringan() {
  const v = getRadio('q10a');
  document.getElementById('q10b_wrap').classList.toggle('hidden', v !== '2');
  document.getElementById('q11_wrap').classList.toggle('hidden', !['3','4','5','6'].includes(v));
}

function handleInternet() {
  const v = getRadio('q12a');
  document.getElementById('q12b_wrap').classList.toggle('hidden', v !== '1');
}

function handleHalal() {
  const v = getRadio('q15a');
  document.getElementById('q15bc_wrap').classList.toggle('hidden', v !== '1');
}

function handleIzinEdar() {
  const v = getRadio('q16a');
  document.getElementById('q16bc_wrap').classList.toggle('hidden', v !== '1');
}

function handleNegaraKP() {
  const v = document.getElementById('q11d_negara').value;
  document.getElementById('q11_prov_kab_wrap').classList.toggle('hidden', v !== 'ID');
}


function calcPekerja() {
  const a = parseInt(document.getElementById('q20a').value) || 0;
  const b = parseInt(document.getElementById('q20b').value) || 0;
  document.getElementById('q20c').value = a + b;
}

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

function calcPengeluaran() {
  const total = ['q22a','q22b','q22c','q22d','q22e']
    .map(id => parseCurrency(document.getElementById(id).value))
    .reduce((a,b)=>a+b, 0);
  setCurrencyReadonly('q22f', total);
}

function calcPendapatan() {
  const total = ['q23a','q23b']
    .map(id => parseCurrency(document.getElementById(id).value))
    .reduce((a,b)=>a+b, 0);
  setCurrencyReadonly('q23c', total);
}

function calcAset() {
  const total = ['q24a','q24b']
    .map(id => parseCurrency(document.getElementById(id).value))
    .reduce((a,b)=>a+b, 0);
  setCurrencyReadonly('q24c', total);
}

function calcModal() {
  const fields = ['q25a','q25b','q25c','q25d','q25e','q25f'];
  const total = fields.map(id => parseFloat(document.getElementById(id).value)||0).reduce((a,b)=>a+b,0);
  const roundedTotal = Math.round(total * 100) / 100;
  document.getElementById('q25g').value = roundedTotal;
  const ind = document.getElementById('modal-indicator');
  if (Math.abs(roundedTotal - 100) < 0.01) {
    ind.textContent = '% ✓ Total = 100%'; ind.style.color = '#38a169';
  } else {
    ind.textContent = `% (harus = 100%)`; ind.style.color = '#e53e3e';
  }
}


const canvas = document.getElementById('sigCanvas');
const ctx = canvas.getContext('2d');
let drawing = false, hasSig = false, canvasRect = null;
window.addEventListener('resize', () => { canvasRect = null; });

function getPos(e) {
  if (!canvasRect) canvasRect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / canvasRect.width;
  const scaleY = canvas.height / canvasRect.height;
  if (e.touches) {
    return {x:(e.touches[0].clientX - canvasRect.left)*scaleX, y:(e.touches[0].clientY - canvasRect.top)*scaleY};
  }
  return {x:(e.clientX - canvasRect.left)*scaleX, y:(e.clientY - canvasRect.top)*scaleY};
}

canvas.addEventListener('mousedown', e => { drawing=true; const p=getPos(e); ctx.beginPath(); ctx.moveTo(p.x,p.y); });
canvas.addEventListener('mousemove', e => { if(!drawing) return; const p=getPos(e); ctx.lineTo(p.x,p.y); ctx.strokeStyle='#000'; ctx.lineWidth=2; ctx.lineCap='round'; ctx.stroke(); hasSig=true; });
canvas.addEventListener('mouseup', ()=>{ drawing=false; ctx.beginPath(); });
canvas.addEventListener('mouseleave', ()=>{ drawing=false; ctx.beginPath(); });
canvas.addEventListener('touchstart', e=>{ e.preventDefault(); drawing=true; const p=getPos(e); ctx.beginPath(); ctx.moveTo(p.x,p.y); }, {passive:false});
canvas.addEventListener('touchmove', e=>{ e.preventDefault(); if(!drawing) return; const p=getPos(e); ctx.lineTo(p.x,p.y); ctx.strokeStyle='#000'; ctx.lineWidth=2; ctx.lineCap='round'; ctx.stroke(); hasSig=true; }, {passive:false});
canvas.addEventListener('touchend', ()=>{ drawing=false; ctx.beginPath(); });

function clearSignature() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  hasSig = false;
  updateProgress();
}


function getRadio(name) {
  const el = document.querySelector(`input[name="${name}"]:checked`);
  return el ? el.value : '';
}

function getVal(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidHP(hp) {
  return /^(\+62|62|0)[0-9]{8,13}$/.test(hp.replace(/[\s\-]/g,''));
}

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

/* ====== SIDEBAR BLOK ACCORDION ====== */
function toggleSidebarBlok(n) {
  const list = document.getElementById('sidebarQList' + n);
  const btn  = document.getElementById('sidebarExpandBtn' + n);
  if (!list) return;
  const opening = list.classList.contains('hidden');
  list.classList.toggle('hidden');
  if (btn) btn.classList.toggle('open', opening);
}

function goBlokAndScroll(blokNum, qId) {
  goBlok(blokNum);
  setTimeout(() => scrollToQuestion(qId), 280);
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
