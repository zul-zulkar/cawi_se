/* ====== AUTO-SAVE (localStorage) ====== */
const LS_KEY = 'cawi_se2026_draft_v1';
let _autosaveTimer = null;

function saveDraft() {
  try {
    const vals = {};
    document.querySelectorAll('input[id]:not([type=radio]):not([type=checkbox]),textarea[id],select[id]').forEach(el => {
      if (!el.id || el.readOnly) return;
      vals[el.id] = el.value;
    });
    document.querySelectorAll('input[type=radio]:checked').forEach(el => {
      vals['_r_' + el.name] = el.value;
    });
    if (hasSig) {
      try { vals['_sig'] = canvas.toDataURL('image/png'); } catch(e) {}
    }
    vals['_ts'] = new Date().toISOString();
    localStorage.setItem(LS_KEY, JSON.stringify(vals));
    // Update status indicator
    const dot = document.getElementById('autosaveDot');
    const txt = document.getElementById('autosaveText');
    if (dot) { dot.style.background = '#68d391'; setTimeout(() => { dot.style.background='rgba(255,255,255,.2)'; }, 2000); }
    if (txt) { const t=new Date(); txt.textContent='Tersimpan '+String(t.getHours()).padStart(2,'0')+':'+String(t.getMinutes()).padStart(2,'0'); }
  } catch(e) { console.error('Gagal simpan draft:', e); }
}

function scheduleAutosave() {
  if (_autosaveTimer) clearTimeout(_autosaveTimer);
  _autosaveTimer = setTimeout(saveDraft, 60000);
}

function restoreDraft() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    const vals = JSON.parse(raw);
    // Restore inputs / selects / textareas
    Object.keys(vals).forEach(key => {
      if (key.startsWith('_r_')) {
        const name = key.slice(3);
        const radio = document.querySelector(`input[name="${name}"][value="${vals[key]}"]`);
        if (radio) { radio.checked = true; radio.dispatchEvent(new Event('change', {bubbles:true})); }
      } else if (!key.startsWith('_')) {
        const el = document.getElementById(key);
        if (el && !el.readOnly && !el.disabled) {
          el.value = vals[key];
          el.dispatchEvent(new Event('input', {bubbles:true}));
          el.dispatchEvent(new Event('change', {bubbles:true}));
        }
      }
    });
    // Restore KBLI chip if kode was saved
    const savedKode = vals['q9g_kbli_kode'];
    if (savedKode && kbliData.length) {
      const entry = kbliData.find(d => d.kode === savedKode);
      if (entry) selectKBLI(entry);
    }
    // Resync searchable select display texts
    ['q1_provinsi','q2_kabupaten','q3_kecamatan','q4_kelurahan','q11e_provinsi','q11f_kabupaten'].forEach(id => {
      const sel = document.getElementById(id);
      if (!sel || !sel.value) return;
      const inp = document.getElementById(id + '_inp');
      const opt = sel.options[sel.selectedIndex];
      if (inp && opt && opt.text) { inp.value = opt.text; inp.classList.add('has-value'); }
    });
    // Restore signature
    if (vals['_sig']) {
      const img = new Image();
      img.onload = () => { ctx.clearRect(0,0,canvas.width,canvas.height); ctx.drawImage(img,0,0); hasSig=true; updateProgress(); };
      img.src = vals['_sig'];
    }
    const hint = document.getElementById('sig-hint');
    if (hint && vals['_sig']) hint.textContent = 'Tanda tangan dimuat dari draft';
    dismissRestore();
    updateProgress();
    const txt = document.getElementById('autosaveText');
    if (txt) txt.textContent = 'Draft dimuat';
  } catch(e) { console.error('Gagal load draft:', e); }
}

function dismissRestore() {
  const b = document.getElementById('restoreBanner');
  if (b) b.style.display = 'none';
}

function clearDraft() {
  localStorage.removeItem(LS_KEY);
  const txt = document.getElementById('autosaveText');
  if (txt) txt.textContent = 'Draft dihapus';
}
