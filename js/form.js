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

function handleUsaha() {
  const b1 = getRadio('q9b1');
  const b2 = getRadio('q9b2');
  const b3v = document.getElementById('q9b3_wrap');
  const b4v = document.getElementById('q9b4_wrap');
  const cW  = document.getElementById('q9c_wrap');
  const deW = document.getElementById('q9de_wrap');

  // b3 visible if b1=Tidak AND b2=Tidak
  const show3 = b1 === '2' && b2 === '2';
  b3v.classList.toggle('hidden', !show3);
  if (!show3) document.querySelectorAll('input[name="q9b3"]').forEach(r => r.checked = false);

  const b3 = show3 ? getRadio('q9b3') : '';

  // b4 visible if b1=Tidak AND b2=Tidak AND b3=Tidak
  const show4 = show3 && b3 === '2';
  b4v.classList.toggle('hidden', !show4);
  if (!show4) document.querySelectorAll('input[name="q9b4"]').forEach(r => r.checked = false);

  // 9c shown when food/retail path: b2=Ya OR b3=Ya
  const showC = b2 === '1' || (show3 && b3 === '1');
  cW.classList.toggle('hidden', !showC);

  // 9d/9e shown when manufacturing: b1=Ya AND b2=Tidak
  const showDE = b1 === '1' && b2 === '2';
  deW.classList.toggle('hidden', !showDE);

  updateProgress();
}

function handleJaringan() {
  const v = getRadio('q10a');
  document.getElementById('q10b_wrap').classList.toggle('hidden', v !== '2');
  document.getElementById('q11_wrap').classList.toggle('hidden', !['3','4','5','6'].includes(v));
  // L.KP section only for kantor pusat
  const lkp = document.getElementById('lkp_section');
  if (lkp) {
    if (v === '2') {
      handleJumlahCabang();
    } else {
      lkp.classList.add('hidden');
    }
  }
}

function handleJumlahCabang() {
  const lkp = document.getElementById('lkp_section');
  const wrap = document.getElementById('lkp_branches_wrap');
  if (!lkp || !wrap) return;
  if (getRadio('q10a') !== '2') { lkp.classList.add('hidden'); return; }
  const n = parseInt(document.getElementById('q10b_jumlah').value) || 0;
  if (n <= 0) { lkp.classList.add('hidden'); return; }
  lkp.classList.remove('hidden');
  const capped = Math.min(n, 50);
  // Only re-render if count changed
  if (wrap.dataset.count === String(capped)) return;
  wrap.dataset.count = capped;
  wrap.innerHTML = '';
  const provOpts = (typeof STATIC_PROVINSI !== 'undefined' ? STATIC_PROVINSI : [])
    .map(p => `<option value="${p.kode}">${p.nama}</option>`).join('');
  for (let i = 1; i <= capped; i++) {
    wrap.insertAdjacentHTML('beforeend', `
<div class="section-card" id="lkp_card_${i}" style="margin-top:12px;border-left:3px solid #fc6c00">
  <div class="section-header" style="cursor:pointer;display:flex;justify-content:space-between;align-items:center" onclick="toggleLKPCard(${i})">
    <span>Cabang/Unit #${i}</span><span id="lkp_toggle_${i}">&#9660;</span>
  </div>
  <div id="lkp_body_${i}" class="section-body">
    <div class="inline-fields">
      <div class="form-group" style="flex:2">
        <label class="field-label">Nama Kantor/Unit <span class="req">*</span></label>
        <input type="text" id="lkp_${i}_nama" placeholder="Nama kantor/unit"/>
      </div>
      <div class="form-group" style="flex:1">
        <label class="field-label">Jenis Unit <span class="req">*</span></label>
        <select id="lkp_${i}_jenis">
          <option value="">-- Pilih --</option>
          <option value="1">1. Kantor Cabang</option>
          <option value="2">2. Kantor Perwakilan</option>
          <option value="3">3. Pabrik</option>
          <option value="4">4. Unit Pembantu/Penunjang</option>
        </select>
      </div>
    </div>
    <div class="inline-fields">
      <div class="form-group">
        <label class="field-label">Provinsi <span class="req">*</span></label>
        <select id="lkp_${i}_provinsi" onchange="loadKabupatenLKP(this.value,${i})">
          <option value="">-- Pilih Provinsi --</option>
          ${provOpts}
        </select>
      </div>
      <div class="form-group">
        <label class="field-label">Kabupaten/Kota</label>
        <select id="lkp_${i}_kabupaten" disabled>
          <option value="">-- Pilih Kabupaten/Kota --</option>
        </select>
      </div>
      <div class="form-group">
        <label class="field-label">KBLI (5 digit)</label>
        <input type="text" id="lkp_${i}_kbli" maxlength="5" placeholder="00000"/>
      </div>
    </div>
    <div class="inline-fields">
      <div class="form-group">
        <label class="field-label">Jumlah Pekerja (per 31 Des 2025) <span class="req">*</span></label>
        <input type="number" id="lkp_${i}_pekerja" min="0" placeholder="0"/>
      </div>
      <div class="form-group">
        <label class="field-label">Nilai Pengeluaran 2025 (Rp)</label>
        <div class="currency-input-wrap"><span class="currency-prefix">Rp</span>
          <input type="text" id="lkp_${i}_pengeluaran" class="currency-field" oninput="formatCurrency(this)" placeholder="0"/>
        </div>
      </div>
    </div>
    <div class="inline-fields">
      <div class="form-group">
        <label class="field-label">Nilai Produksi/Penjualan/Pendapatan 2025 (Rp)</label>
        <div class="currency-input-wrap"><span class="currency-prefix">Rp</span>
          <input type="text" id="lkp_${i}_pendapatan" class="currency-field" oninput="formatCurrency(this)" placeholder="0"/>
        </div>
      </div>
      <div class="form-group">
        <label class="field-label">Nilai Aset 2025 (Rp)</label>
        <div class="currency-input-wrap"><span class="currency-prefix">Rp</span>
          <input type="text" id="lkp_${i}_aset" class="currency-field" oninput="formatCurrency(this)" placeholder="0"/>
        </div>
      </div>
    </div>
  </div>
</div>`);
  }
}

function toggleLKPCard(i) {
  const body = document.getElementById('lkp_body_' + i);
  const icon = document.getElementById('lkp_toggle_' + i);
  if (!body) return;
  const hidden = body.style.display === 'none';
  body.style.display = hidden ? '' : 'none';
  if (icon) icon.innerHTML = hidden ? '&#9660;' : '&#9658;';
}

async function loadKabupatenLKP(kdprov, idx) {
  const sel = document.getElementById('lkp_' + idx + '_kabupaten');
  if (!sel) return;
  sel.innerHTML = '<option value="">Memuat...</option>';
  sel.disabled = true;
  if (!kdprov) { sel.innerHTML = '<option value="">-- Pilih Kabupaten/Kota --</option>'; return; }
  try {
    const res = await fetch(`https://esurvey.bps.go.id/lookup/api/v1/collections/668fcfe6-8ef4-4612-968a-d1330c03fe17/filter?version=1&filter=kdprov||eq||${kdprov}`,
      {headers:{'Accept':'application/json'}});
    const d = await res.json();
    sel.innerHTML = '<option value="">-- Pilih Kabupaten/Kota --</option>';
    (d.data || []).sort((a,b)=>a.namakab.localeCompare(b.namakab)).forEach(k => {
      const o = document.createElement('option');
      o.value = k.kdprovkab; o.textContent = k.namakab;
      sel.appendChild(o);
    });
    sel.disabled = false;
  } catch(e) {
    sel.innerHTML = '<option value="">-- Gagal memuat --</option>';
    sel.disabled = false;
  }
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
