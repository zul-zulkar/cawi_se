let records    = [];
let _activeTab = 'all';

/* ====== TAB & SIDEBAR ====== */
function setActiveTab(tab) {
  _activeTab = tab;
  ['all', 'submitted', 'draft'].forEach(t => {
    const cap = t.charAt(0).toUpperCase() + t.slice(1);
    const sb  = document.getElementById('sidebarTab' + cap);
    const tb  = document.getElementById('tabBar'     + cap);
    if (sb) sb.classList.toggle('active', t === tab);
    if (tb) tb.classList.toggle('active', t === tab);
  });
  closeSidebar();
  updateStats();
  renderTable();
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebarOverlay').classList.toggle('open');
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('open');
}

/* ====== LOCAL DRAFTS (tanpa load draft.js) ====== */
function getLocalDrafts() {
  try { return JSON.parse(localStorage.getItem('cawi_se2026_drafts_v1') || '[]'); }
  catch(e) { return []; }
}

/* ====== FETCH DATA ====== */
async function fetchRecords() {
  setLoading(true);
  try {
    const resp = await fetch(getScriptUrl(), {
      method: 'POST',
      body: JSON.stringify({ action: 'getRecords' })
    });
    const json = await resp.json();
    if (json.status === 'ok') {
      const serverRecs = (json.data || []).map(r => ({ ...r, _isDraft: false }));
      const draftRecs  = getLocalDrafts();
      records = [...draftRecs, ...serverRecs];
      buildPetugasFilter();
      updateStats();
      renderTable();
    } else {
      showError('Gagal memuat: ' + (json.message || 'error tidak diketahui'));
    }
  } catch(err) {
    showError('Tidak dapat terhubung ke server.<br/>Periksa koneksi internet lalu klik Refresh.');
  } finally {
    setLoading(false);
  }
}

function setLoading(yes) {
  document.getElementById('loadingWrap').style.display    = yes ? 'flex'  : 'none';
  document.getElementById('tableContainer').style.display = yes ? 'none'  : 'block';
}

function showError(msg) {
  setLoading(false);
  document.getElementById('tableContainer').innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">&#9888;</div>
      <div class="empty-text">${msg}</div>
      <button class="btn btn-primary" onclick="fetchRecords()">&#8635; Coba Lagi</button>
    </div>`;
}

/* ====== FILTER ====== */
function buildPetugasFilter() {
  const sel     = document.getElementById('filterPetugas');
  const current = sel.value;
  const names   = [...new Set(records.map(r => r.petugas_nama).filter(Boolean))].sort();
  sel.innerHTML  = '<option value="">— Semua Petugas —</option>' +
    names.map(n => `<option value="${esc(n)}"${n===current?' selected':''}>${esc(n)}</option>`).join('');
}

function getRecordMode(r) {
  // Records lama tanpa _formMode dianggap L.UB (backward-compat)
  return r._formMode || r.formMode || 'lub';
}

function getRecordName(r) {
  if (getRecordMode(r) === 'l') {
    return r.nama_kk || r.nama_usaha || r.nama_perusahaan || '';
  }
  return r.nama_perusahaan || '';
}

function getFiltered() {
  const q = (document.getElementById('searchBox').value || '').toLowerCase().trim();
  const p = document.getElementById('filterPetugas').value;
  const fmEl = document.getElementById('filterMode');
  const fm = fmEl ? fmEl.value : '';
  return records.filter(r => {
    const okStatus  = _activeTab === 'all'
      || (_activeTab === 'draft'     &&  r._isDraft)
      || (_activeTab === 'submitted' && !r._isDraft);
    const okPetugas = !p || r.petugas_nama === p;
    const okMode    = !fm || getRecordMode(r) === fm;
    const recName   = getRecordName(r);
    const okSearch  = !q
      || (recName           || '').toLowerCase().includes(q)
      || (r.nama_perusahaan || '').toLowerCase().includes(q)
      || (r.nama_komersial  || '').toLowerCase().includes(q)
      || (r.nama_kk         || '').toLowerCase().includes(q)
      || (r.nama_usaha      || '').toLowerCase().includes(q)
      || (r.petugas_nama    || '').toLowerCase().includes(q)
      || (r.kecamatan       || '').toLowerCase().includes(q)
      || (r.kelurahan       || '').toLowerCase().includes(q)
      || (r.kbli_judul      || '').toLowerCase().includes(q)
      || (r.kbli_kode       || '').toLowerCase().includes(q);
    return okStatus && okPetugas && okMode && okSearch;
  });
}

function onFilter() {
  updateStats();
  renderTable();
}

/* ====== STATS ====== */
function updateStats() {
  const filtered   = getFiltered();
  const serverRecs = records.filter(r => !r._isDraft);
  const draftRecs  = records.filter(r =>  r._isDraft);

  document.getElementById('statTotal').textContent    = serverRecs.length;
  document.getElementById('statDraft').textContent    = draftRecs.length;
  document.getElementById('statFiltered').textContent = filtered.length;
  const uniq = new Set(records.map(r => r.petugas_nama).filter(Boolean));
  document.getElementById('statPetugas').textContent  = uniq.size;

  _setCount('sidebarTabAllCount',       records.length,      'data');
  _setCount('sidebarTabSubmittedCount', serverRecs.length,   'entri');
  _setCount('sidebarTabDraftCount',     draftRecs.length,    'draft');
  _setCount('tabBarAllCount',           records.length,      null);
  _setCount('tabBarSubmittedCount',     serverRecs.length,   null);
  _setCount('tabBarDraftCount',         draftRecs.length,    null);
}

function _setCount(id, n, suffix) {
  const el = document.getElementById(id);
  if (el) el.textContent = suffix ? `${n} ${suffix}` : String(n);
}

/* ====== RENDER TABLE ====== */
function renderTable() {
  const filtered   = getFiltered();
  const container  = document.getElementById('tableContainer');
  const totalServer = records.filter(r => !r._isDraft).length;
  const totalDraft  = records.filter(r =>  r._isDraft).length;

  document.getElementById('listMeta').textContent = records.length
    ? `${filtered.length} ditampilkan — ${totalServer} tersubmit, ${totalDraft} draft`
    : 'Belum ada data';

  if (!records.length) {
    container.innerHTML = `<div class="empty-state">
      <div class="empty-icon">&#128196;</div>
      <div class="empty-text">Belum ada entri tersimpan.<br/>Submit form atau simpan draft dari halaman kuesioner.</div>
      <a href="index.html" class="btn btn-primary">&#43; Mulai Entri Baru</a>
    </div>`;
    return;
  }
  if (!filtered.length) {
    container.innerHTML = `<div class="empty-state">
      <div class="empty-icon">&#128269;</div>
      <div class="empty-text">Tidak ada entri yang cocok dengan filter yang dipilih.</div>
    </div>`;
    return;
  }

  let html = `<table><thead><tr>
    <th>No</th>
    <th>Jenis</th>
    <th>Perusahaan / Usaha / Keluarga</th>
    <th>Petugas Pendata</th>
    <th>Kecamatan</th>
    <th>Waktu</th>
    <th>Aksi</th>
  </tr></thead><tbody>`;

  filtered.forEach((r, idx) => {
    const mode = getRecordMode(r);
    const badge = (mode === 'l')
      ? `<span class="mode-badge mode-badge-l" title="Usaha Rumah Tangga">L</span>`
      : `<span class="mode-badge mode-badge-lub" title="Usaha/Perusahaan Besar">L.UB</span>`;
    const nameMain = getRecordName(r);
    const nameSub  = (mode === 'l') ? r.nama_usaha : r.nama_komersial;
    const co       = esc(nameMain) || '<em style="color:#bbb">Tanpa nama</em>';
    const koml     = nameSub ? `<small>${esc(nameSub)}</small>` : '';

    if (r._isDraft) {
      const kec = esc(r.kecamatan || r.kecamatan_kd || '—');
      html += `<tr class="tr-draft">
        <td data-label="No" style="color:#aaa;font-size:12px;text-align:center">${idx+1}</td>
        <td data-label="Jenis" class="cell-jenis">${badge}</td>
        <td data-label="Perusahaan" class="cell-company">
          ${co}${koml}
        </td>
        <td data-label="Petugas" class="cell-petugas">${esc(r.petugas_nama||'—')}</td>
        <td data-label="Kecamatan" style="font-size:12.5px;color:#555">${kec}</td>
        <td data-label="Waktu" style="font-size:12px;color:#888;white-space:nowrap">${fmtDate(r._ts)}</td>
        <td><div class="td-actions">
          <button class="btn btn-sm btn-draft-continue" title="Lanjutkan" onclick="continueDraft('${r._draftId}')">&#9654;</button>
          <button class="btn btn-sm btn-danger-sm" title="Hapus" onclick="deleteDraftLocal('${r._draftId}')">&#128465;</button>
        </div></td>
      </tr>`;
    } else {
      html += `<tr>
        <td data-label="No" style="color:#aaa;font-size:12px;text-align:center">${idx+1}</td>
        <td data-label="Jenis" class="cell-jenis">${badge}</td>
        <td data-label="Perusahaan" class="cell-company">
          ${co}${koml}
        </td>
        <td data-label="Petugas" class="cell-petugas">${esc(r.petugas_nama||'—')}
          ${r.petugas_nip ? `<small>NIP: ${esc(r.petugas_nip)}</small>` : ''}</td>
        <td data-label="Kecamatan" style="font-size:12.5px;color:#555">${esc(r.kecamatan||'—')}</td>
        <td data-label="Waktu" style="font-size:12px;color:#888;white-space:nowrap">${fmtDate(r._ts||r.timestamp)}</td>
        <td><div class="td-actions">
          <button class="btn btn-sm btn-info" title="Lihat" onclick="viewRecord(${r._id})">&#128065;</button>
          <button class="btn btn-sm" style="background:#38a169;color:#fff" title="Edit" onclick="editRecord(${r._id})">&#9998;</button>
          <button class="btn btn-sm" style="background:#805ad5;color:#fff" title="Duplikat" onclick="duplicateRecord(${r._id})">&#9986;</button>
          <button class="btn btn-sm" style="background:#e53e3e;color:#fff" title="Hapus" onclick="deleteRecord(${r._id})">&#128465;</button>
        </div></td>
      </tr>`;
    }
  });
  html += `</tbody></table>`;
  container.innerHTML = html;
}

/* ====== VIEW: SECTION BUILDERS ====== */
function viewSectionsLUB(r) {
  return [
    { title: 'Petugas Pendata', fields: [
      ['Nama Petugas', r.petugas_nama],
      ['NIP / ID', r.petugas_nip],
      ['HP Petugas', r.petugas_hp],
    ]},
    { title: 'Lokasi', fields: [
      ['Provinsi', r.provinsi],
      ['Kabupaten/Kota', r.kabupaten],
      ['Kecamatan', r.kecamatan],
      ['Kelurahan/Desa', r.kelurahan],
    ]},
    { title: 'Identitas Usaha', fields: [
      ['Nama Perusahaan', r.nama_perusahaan],
      ['Nama Komersial', r.nama_komersial],
      ['Alamat', r.alamat],
      ['Email', r.email_perusahaan],
      ['Website', r.website],
      ['Telepon', r.telepon],
      ['HP/WA', r.hp],
    ]},
    { title: 'NIB & Badan Usaha', fields: [
      ['Punya NIB', r.punya_nib],
      ['No. NIB', r.nib],
      ['Status Badan Usaha', r.badan_usaha],
    ]},
    { title: 'Pengusaha', fields: [
      ['Nama Pengusaha', r.nama_pengusaha],
      ['Jenis Kelamin', r.jenis_kelamin_pengusaha],
      ['Umur', r.umur_pengusaha],
      ['NIK', r.nik_pengusaha],
    ]},
    { title: 'Kegiatan Usaha', fields: [
      ['Kegiatan Utama', r.kegiatan_utama],
      ['KBLI', r.kbli_judul],
      ['Kode KBLI', r.kbli_kode],
      ['Kategori KBLI', r.kbli_kategori],
    ]},
    { title: 'Tenaga Kerja & Keuangan', fields: [
      ['Pekerja Laki-laki', r.pekerja_laki],
      ['Pekerja Perempuan', r.pekerja_perempuan],
      ['Total Pekerja', r.pekerja_total],
      ['Pendapatan Total', r.pendapatan_total ? 'Rp ' + Number(r.pendapatan_total).toLocaleString('id-ID') : ''],
      ['Aset Total', r.aset_total ? 'Rp ' + Number(r.aset_total).toLocaleString('id-ID') : ''],
    ]},
    { title: 'Responden', fields: [
      ['Nama Responden', r.responden_nama],
      ['HP Responden', r.responden_hp],
      ['Email Responden', r.responden_email],
      ['Tanggal Pelaksanaan', r.tanggal_pelaksanaan],
    ]},
  ];
}

function viewSectionsL(r) {
  // Parse anggota_data if available
  let anggotaList = [];
  try {
    if (r.anggota_data) anggotaList = JSON.parse(r.anggota_data);
  } catch(e) { anggotaList = []; }

  const sections = [
    { title: 'Petugas Pendata', fields: [
      ['Nama Petugas', r.petugas_nama],
      ['NIP / ID', r.petugas_nip],
      ['HP Petugas', r.petugas_hp],
    ]},
    { title: 'Keluarga (Kepala KK)', fields: [
      ['Nama KK', r.nama_kk],
      ['NIK KK', r.nik_kk],
      ['No KK', r.no_kk],
      ['Jumlah Anggota', r.jml_anggota],
      ['Jumlah Pendataan', r.jml_pendataan],
    ]},
    { title: 'Alamat Keluarga', fields: [
      ['Provinsi', r.provinsi],
      ['Kabupaten/Kota', r.kabupaten],
      ['Kecamatan', r.kecamatan],
      ['Kelurahan/Desa', r.kelurahan],
      ['Klasifikasi', r.klasifikasi === '1' ? 'Perkotaan' : r.klasifikasi === '2' ? 'Perdesaan' : ''],
      ['Kode Pos', r.kode_pos],
      ['Alamat Detail', r.alamat_detail],
      ['Nama Jalan', r.nama_jalan],
      ['No Rumah', r.no_rumah],
    ]},
    { title: `Anggota Keluarga (${anggotaList.length})`, fields:
      anggotaList.length ? anggotaList.map(a => [
        `#${a.no} ${a.nama || '(tanpa nama)'}`,
        `${a.stop_state ? 'STOP — ' : ''}${a.hubungan ? 'Hub: ' + a.hubungan + ' · ' : ''}${a.umur ? 'Umur ' + a.umur : ''}`
      ]) : [['(tidak ada anggota terdata)', '']],
    },
    { title: 'Usaha', fields: [
      ['Nama Usaha', r.nama_usaha],
      ['Nama Komersial', r.nama_komersial],
      ['Alamat', r.alamat_usaha],
      ['HP Usaha', r.hp_usaha],
      ['Email Usaha', r.email_usaha],
      ['Jenis Usaha', r.jenis_usaha],
      ['Punya NIB', r.punya_nib],
      ['NIB', r.nib],
      ['Badan Usaha', r.badan_usaha],
      ['Pengusaha', r.pengusaha_nama],
      ['NIK Pengusaha', r.pengusaha_nik],
      ['Kegiatan Utama', r.kegiatan_utama],
      ['KBLI', r.kbli_judul],
      ['Kode KBLI', r.kbli_kode],
      ['Tahun Operasi', r.tahun_operasi],
      ['Pekerja L/P', (r.pekerja_l || 0) + ' / ' + (r.pekerja_p || 0)],
    ]},
    { title: 'Perumahan & Aset', fields: [
      ['Jenis Bangunan', r.jenis_bangunan],
      ['Status Kepemilikan', r.status_milik],
      ['Luas Lantai', r.luas_lantai ? r.luas_lantai + ' m²' : ''],
      ['Sumber Air', r.air],
      ['Sumber Listrik', r.listrik],
      ['Motor', r.aset_motor],
      ['Mobil', r.aset_mobil],
      ['Tanah', r.aset_tanah],
      ['Rumah', r.aset_rumah],
      ['Pengeluaran Makanan/Mgg', r.makanan_mgg ? 'Rp ' + Number(r.makanan_mgg).toLocaleString('id-ID') : ''],
      ['Pengeluaran NonMakanan/Bln', r.nonmakanan_bln ? 'Rp ' + Number(r.nonmakanan_bln).toLocaleString('id-ID') : ''],
    ]},
    { title: 'Catatan Pendata', fields: [
      ['Catatan', r.catatan_pendata],
    ]},
    { title: 'Responden', fields: [
      ['Nama Responden', r.responden_nama],
      ['HP Responden', r.responden_hp],
      ['Email Responden', r.responden_email],
      ['Tanggal Pelaksanaan', r.tanggal_pelaksanaan],
    ]},
  ];
  return sections;
}

/* ====== VIEW ====== */
function viewRecord(id) {
  const r = records.find(x => x._id === id);
  if (!r) return;
  const mode = getRecordMode(r);
  const titleName = getRecordName(r) || 'Detail Entri';
  document.getElementById('viewTitle').textContent    = titleName;
  document.getElementById('viewSubtitle').textContent =
    `${mode === 'l' ? '[L]' : '[L.UB]'} Submit: ${fmtDate(r._ts||r.timestamp)} | Petugas: ${r.petugas_nama || '—'}`;

  const sections = (mode === 'l') ? viewSectionsL(r) : viewSectionsLUB(r);

  let html = '';
  sections.forEach(sec => {
    const filled = sec.fields.filter(([,v]) => v && String(v).trim() && String(v) !== 'undefined');
    if (!filled.length) return;
    html += `<div class="view-section"><div class="view-section-title">${esc(sec.title)}</div><div class="view-grid">`;
    sec.fields.forEach(([label, val]) => {
      const v = val && String(val).trim() && String(val) !== 'undefined' ? esc(String(val)) : null;
      html += `<div class="view-field">
        <div class="view-field-label">${esc(label)}</div>
        <div class="view-field-value${v ? '' : ' empty'}">${v || 'tidak diisi'}</div>
      </div>`;
    });
    html += `</div></div>`;
  });
  document.getElementById('viewBody').innerHTML = html;
  document.getElementById('viewOverlay').classList.add('open');
}

function closeView() {
  document.getElementById('viewOverlay').classList.remove('open');
}

/* ====== EDIT ====== */
function editRecord(id) {
  const r = records.find(x => x._id === id);
  if (!r) return;
  localStorage.setItem('cawi_form_mode', getRecordMode(r));
  localStorage.setItem('cawi_edit_mode', JSON.stringify(r));
  window.location.href = 'index.html';
}

/* ====== DUPLIKAT ====== */
function duplicateRecord(id) {
  const r = records.find(x => x._id === id);
  if (!r) return;
  const copy = Object.assign({}, r);
  delete copy._id;
  copy.responden_nama        = '';
  copy.responden_hp          = '';
  copy.responden_email       = '';
  copy.tanggal_pelaksanaan   = '';
  localStorage.setItem('cawi_form_mode', getRecordMode(r));
  localStorage.setItem('cawi_edit_mode', JSON.stringify(copy));
  window.location.href = 'index.html';
}

/* ====== HAPUS (server record) ====== */
let _pendingDeleteId = null;
let _pendingDeleteMode = null;

function deleteRecord(id) {
  // Records lama tanpa _formMode dianggap L.UB — kedua sheet bisa punya _id yg sama
  // sehingga butuh mode untuk disambiguasi
  const r = records.find(x => x._id === id && !x._isDraft);
  if (!r) return;
  _pendingDeleteId   = id;
  _pendingDeleteMode = getRecordMode(r);
  document.getElementById('confirmDeleteName').textContent =
    getRecordName(r) || '(tanpa nama)';
  document.getElementById('confirmDeleteSub').textContent =
    `Petugas: ${r.petugas_nama || '—'} | ${r.kecamatan || '—'}`;
  document.getElementById('confirmOverlay').classList.add('open');
}

function cancelDelete() {
  _pendingDeleteId   = null;
  _pendingDeleteMode = null;
  document.getElementById('confirmOverlay').classList.remove('open');
}

async function confirmDelete() {
  if (!_pendingDeleteId) return;
  const id   = _pendingDeleteId;
  const mode = _pendingDeleteMode || 'lub';
  const btn  = document.getElementById('confirmDeleteBtn');
  btn.textContent = 'Menghapus...';
  btn.disabled    = true;
  try {
    await fetch(getScriptUrl(), {
      method: 'POST',
      mode:   'no-cors',
      body:   JSON.stringify({ action: 'deleteRecord', _delete_id: id, formMode: mode })
    });
    records = records.filter(x => !(x._id === id && getRecordMode(x) === mode));
    buildPetugasFilter();
    updateStats();
    renderTable();
    cancelDelete();
  } catch(err) {
    alert('Gagal menghapus: ' + err.message);
    btn.textContent = 'Hapus';
    btn.disabled    = false;
  }
}

/* ====== DRAFT: LANJUTKAN & HAPUS ====== */
function continueDraft(id) {
  const draft = getLocalDrafts().find(d => d._draftId === id);
  if (!draft || !draft._raw) {
    alert('Data draft tidak ditemukan atau telah rusak.');
    return;
  }
  const mode = draft._formMode || (draft._raw && draft._raw._formMode) || 'lub';
  localStorage.setItem('cawi_form_mode', mode);
  localStorage.setItem('cawi_se2026_draft_v1', JSON.stringify(draft._raw));
  localStorage.setItem('cawi_draft_continue_id', id);
  window.location.href = 'index.html';
}

function deleteDraftLocal(id) {
  const draft = getLocalDrafts().find(d => d._draftId === id);
  const name  = draft ? (draft.nama_perusahaan || 'draft ini') : 'draft ini';
  if (!confirm(`Hapus draft "${name}"?\nData ini hanya tersimpan di perangkat ini dan tidak dapat dipulihkan.`)) return;
  try {
    const list = getLocalDrafts().filter(d => d._draftId !== id);
    localStorage.setItem('cawi_se2026_drafts_v1', JSON.stringify(list));
    records = records.filter(r => r._draftId !== id);
    updateStats();
    renderTable();
  } catch(e) { alert('Gagal menghapus draft: ' + e.message); }
}

/* ====== EXPORT CSV ====== */
function exportCSV() {
  const filtered = getFiltered().filter(r => !r._isDraft);
  if (!filtered.length) { alert('Tidak ada data tersubmit untuk diekspor.'); return; }
  const cols = ['timestamp','nama_perusahaan','nama_komersial',
    'provinsi','kabupaten','kecamatan','kelurahan',
    'petugas_nama','petugas_nip','petugas_hp',
    'kbli_kode','kbli_kategori',
    'pekerja_total','pendapatan_total','aset_total',
    'responden_nama','tanggal_pelaksanaan'];
  const headers = ['Timestamp','Nama Perusahaan','Nama Komersial',
    'Provinsi','Kabupaten','Kecamatan','Kelurahan',
    'Petugas','NIP Petugas','HP Petugas',
    'KBLI Kode','Kategori KBLI',
    'Total Pekerja','Pendapatan Total','Aset Total',
    'Nama Responden','Tanggal Pelaksanaan'];
  const escape = v => `"${String(v || '').replace(/"/g,'""')}"`;
  const rows   = [headers.map(escape).join(',')];
  filtered.forEach(r => rows.push(cols.map(c => escape(r[c] || '')).join(',')));
  const blob = new Blob(['﻿' + rows.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `CAWI_SE2026_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ====== INIT ====== */
document.addEventListener('DOMContentLoaded', fetchRecords);
