/* ====== PROGRESS & RECAP — dispatcher bersama (form L & unified P) ======
 * Fungsi-fungsi ini sebelumnya tinggal di js/form-lub/form-progress.js &
 * js/form-lub/form-validation.js (yang juga berisi versi L.UB). Saat subsistem
 * L.UB di-retire, bagian BERSAMA dipindah ke sini; versi *LUB di-drop.
 * Dispatcher kini sadar unified: gabungkan Blok P + form L (saat stage mengungkap L).
 * Dimuat SETELAH form-l-* & form-p-* (pemanggilan calc*L/calc*P bersifat runtime). */

/* ---------- PROGRESS ---------- */
function calcProgress() {
  // Unified P: Blok P (+ form L bila stage keluarga/usaha). Legacy non-unified: form L.
  if (typeof isUnifiedActive === 'function' && isUnifiedActive()) {
    const stage = (typeof window !== 'undefined' && window.__cawiStage) || 'none';
    const P = (typeof calcProgressP === 'function') ? calcProgressP() : { pct: 0, filled: 0, total: 0 };
    if ((stage === 'keluarga' || stage === 'usaha') && typeof calcProgressL === 'function') {
      const L = calcProgressL();
      const filled = P.filled + L.filled;
      const total  = P.total + L.total;
      return { pct: total ? Math.round(filled / total * 100) : 0, filled, total };
    }
    return P;
  }
  if (typeof calcProgressL === 'function') return calcProgressL();
  return { pct: 0, filled: 0, total: 0 };
}

function updateProgress() {
  const { pct, filled, total } = calcProgress();
  const sf = document.getElementById('sidebarProgressFill');
  const sp = document.getElementById('sidebarProgressPct');
  const sd = document.getElementById('sidebarProgressDetail');
  if (sf) sf.style.width = pct + '%';
  if (sp) sp.textContent = pct + '%';
  if (sd) sd.textContent = filled + ' dari ' + total + ' field wajib terisi';
}

/* ---------- RECAP ("Rekap & Periksa") ---------- */
let _recapData = { error: [], warning: [], kosong: [], catatan: [] };
let _curRecapTab = 'error';

function collectAllProblems() {
  // Unified P: gabung masalah Blok P + form L (saat stage mengungkap L).
  if (typeof isUnifiedActive === 'function' && isUnifiedActive()) {
    const stage = (typeof window !== 'undefined' && window.__cawiStage) || 'none';
    const P = (typeof collectAllProblemsP === 'function')
      ? collectAllProblemsP() : { errors: [], warnings: [], kosong: [] };
    if ((stage === 'keluarga' || stage === 'usaha') && typeof collectAllProblemsL === 'function') {
      const L = collectAllProblemsL();
      return {
        errors:   P.errors.concat(L.errors),
        warnings: (P.warnings || []).concat(L.warnings || []),
        kosong:   (P.kosong || []).concat(L.kosong || []),
      };
    }
    return P;
  }
  if (typeof collectAllProblemsL === 'function') return collectAllProblemsL();
  return { errors: [], warnings: [], kosong: [] };
}

function collectRemarks() {
  const remarks = [];
  document.querySelectorAll('.remark-area textarea').forEach((ta) => {
    const text = ta.value.trim();
    if (!text) return;
    const card = ta.closest('.section-card');
    const header = card ? card.querySelector('.section-header') : null;
    const lbl = header ? header.innerText.replace(/[\+✕] Catatan/g, '').trim() : 'Catatan';
    remarks.push({ label: lbl, text });
  });
  return remarks;
}

function showRecap() {
  const { errors, warnings, kosong } = collectAllProblems();
  const catatan = collectRemarks();
  _recapData = { error: errors, warning: warnings, kosong, catatan };

  const badge = (id, count, isError) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = count;
    if (count > 0) el.classList.add(isError ? 'err' : 'has-count');
    else el.classList.remove('err', 'has-count');
  };
  badge('badge-error', errors.length, true);
  badge('badge-warning', warnings.length, false);
  badge('badge-kosong', kosong.length, false);
  badge('badge-catatan', catatan.length, false);

  const btn = document.getElementById('confirmSubmitBtn');
  if (btn) {
    btn.disabled = errors.length > 0;
    btn.title = errors.length > 0 ? 'Perbaiki semua Error terlebih dahulu' : '';
  }

  showRecapTab('error');
  document.getElementById('recapModal').classList.add('open');
  document.getElementById('recapOverlay').classList.add('open');
  if (typeof closeSidebar === 'function') closeSidebar();
  if (typeof closePetunjuk === 'function') closePetunjuk();
}

function showRecapTab(tab) {
  _curRecapTab = tab;
  document.querySelectorAll('.recap-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  const body = document.getElementById('recapBody');
  if (!body) return;
  const items = _recapData[tab] || [];
  if (!items.length) {
    const icons = { error: '&#9989;', warning: '&#128161;', kosong: '&#128203;', catatan: '&#128221;' };
    const msgs = {
      error: 'Tidak ada error. Semua data wajib sudah terisi dengan benar.',
      warning: 'Tidak ada peringatan.',
      kosong: 'Tidak ada field opsional yang kosong.',
      catatan: 'Belum ada catatan pendata. Tambahkan melalui tombol <strong>+ Catatan</strong> di setiap kartu pertanyaan.'
    };
    body.innerHTML = `<div class="recap-empty-state"><div class="recap-empty-icon">${icons[tab]}</div><div class="recap-empty-text">${msgs[tab]}</div></div>`;
    return;
  }
  const cls = { error: 'item-error', warning: 'item-warning', kosong: 'item-empty', catatan: 'item-remark' };
  body.innerHTML = items.map((item, i) => {
    const dataStr = JSON.stringify(item).replace(/'/g, "&#39;");
    return `<div class="recap-item ${cls[tab]}" style="animation-delay:${i * 0.04}s" onclick='recapNavigate(${dataStr},"${tab}")'>
      <div class="recap-item-label">${item.label}</div>
      <div class="recap-item-text">${item.text}</div>
    </div>`;
  }).join('');
}

function recapNavigate(item, tab) {
  if (tab === 'catatan') return;
  closeRecap();
  // Blok P (unified) dinavigasi via goBlokP; blok L via goBlok(n).
  if (item.blok === 'P') {
    if (typeof goBlokP === 'function') goBlokP();
  } else if (item.blok) {
    if (typeof goBlok === 'function') goBlok(item.blok);
  }
  if (item.field) {
    setTimeout(() => {
      let el = document.getElementById(item.field);
      if (!el) el = document.querySelector(`input[name="${item.field}"]`);
      if (el) { el.focus(); el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    }, 420);
  }
}

function closeRecap() {
  const m = document.getElementById('recapModal');
  const o = document.getElementById('recapOverlay');
  if (m) m.classList.remove('open');
  if (o) o.classList.remove('open');
}

async function confirmSubmit() {
  closeRecap();
  await submitForm();
}
