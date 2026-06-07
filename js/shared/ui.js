function goBlok(n) {
  // Bila sedang di layar detail roster (anggota/usaha), pulang dulu ke layar
  // utama (simpan entri aktif) supaya panel blok kembali terlihat.
  if (typeof _returnToMainScreen === 'function') _returnToMainScreen();
  const mode = (typeof getFormMode === 'function') ? getFormMode() : 'l';
  const prefix = (mode === 'l') ? 'blokL' : 'blok';
  const tabPrefix = (mode === 'l') ? 'sidebarTabL' : 'sidebarTab';
  document.querySelectorAll('.blok-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.sidebar-item').forEach(t => t.classList.remove('active'));
  const panel = document.getElementById(prefix + n);
  if (panel) panel.classList.add('active');
  const sTab = document.getElementById(tabPrefix + n);
  if (sTab) sTab.classList.add('active');
  const kop = document.getElementById('headerKop');
  if (kop) kop.classList.toggle('kop-hidden', n !== 1);
  if (typeof updateProgress === 'function') updateProgress();
  if (typeof updateDeskTopbar === 'function') updateDeskTopbar(n, mode);
  window.scrollTo({top: 0, behavior: 'smooth'});
  closeSidebar();
}

/* ====== Desktop topbar — sync title with active blok ====== */
function updateDeskTopbar(n) {
  const titleEl = document.getElementById('deskTopbarTitle');
  const subEl   = document.getElementById('deskTopbarSub');
  if (!titleEl || !subEl) return;
  // L.UB di-retire — hanya kuesioner L (unified P memakai blok L yang sama).
  const lBloks = {
    1: 'BLOK I — Keluarga & Anggota',
    2: 'BLOK II — Usaha / Perusahaan',
    3: 'BLOK III — Perumahan & Aset',
    4: 'BLOK IV — Catatan Pendata',
    5: 'BLOK V — Petugas & Responden',
  };
  titleEl.textContent = 'Kuesioner SE2026-L';
  subEl.textContent   = lBloks[n] || ('BLOK ' + n);
}


/* ====== SIDEBAR ====== */
function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  const ov = document.getElementById('sidebarOverlay');
  const hb = document.getElementById('hamburgerBtn');
  const isOpen = sb.classList.contains('open');
  sb.classList.toggle('open', !isOpen);
  ov.classList.toggle('open', !isOpen);
  if (hb) hb.innerHTML = isOpen ? '&#9776;' : '&#10005;';
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('open');
  const hb = document.getElementById('hamburgerBtn');
  if (hb) hb.innerHTML = '&#9776;';
}

/* ====== PETUNJUK ====== */
function togglePetunjuk() {
  const modal = document.getElementById('petunjukModal');
  const ov = document.getElementById('petunjukOverlay');
  const isOpen = modal.classList.contains('open');
  modal.classList.toggle('open', !isOpen);
  ov.classList.toggle('open', !isOpen);
  if (!isOpen) closeSidebar();
}
function closePetunjuk() {
  document.getElementById('petunjukModal').classList.remove('open');
  document.getElementById('petunjukOverlay').classList.remove('open');
}

/* ====== REMARK ====== */
function toggleRemark(id, btn) {
  const area = document.getElementById(id);
  if (!area) return;
  const isOpen = area.classList.contains('open');
  area.classList.toggle('open', !isOpen);
  btn.classList.toggle('open', !isOpen);
  btn.textContent = isOpen ? '+ Catatan' : '&#10005; Catatan';
}

/* ====== INLINE PETUNJUK ====== */
function toggleFieldPetunjuk(id, btn) {
  const box = document.getElementById(id);
  if (!box) return;
  const open = box.classList.toggle('open');
  btn.classList.toggle('open', open);
  // Label is rendered via CSS (::before swap when .open) — keep original markup when closed
  btn.innerHTML = open ? '' : '<i class="bi bi-lightbulb-fill"></i> Petunjuk';
}
