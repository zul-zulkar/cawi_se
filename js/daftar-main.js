let records = [];

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
      records = json.data || [];
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

function getFiltered() {
  const q = (document.getElementById('searchBox').value || '').toLowerCase().trim();
  const p = document.getElementById('filterPetugas').value;
  return records.filter(r => {
    const okPetugas = !p || r.petugas_nama === p;
    const okSearch  = !q
      || (r.nama_perusahaan || '').toLowerCase().includes(q)
      || (r.nama_komersial  || '').toLowerCase().includes(q)
      || (r.petugas_nama    || '').toLowerCase().includes(q)
      || (r.kecamatan       || '').toLowerCase().includes(q)
      || (r.kelurahan       || '').toLowerCase().includes(q)
      || (r.kbli_judul      || '').toLowerCase().includes(q)
      || (r.kbli_kode       || '').toLowerCase().includes(q);
    return okPetugas && okSearch;
  });
}

function onFilter() {
  updateStats();
  renderTable();
}

/* ====== STATS ====== */
function updateStats() {
  const filtered = getFiltered();
  document.getElementById('statTotal').textContent    = records.length;
  document.getElementById('statFiltered').textContent = filtered.length;
  const uniq = new Set(records.map(r => r.petugas_nama).filter(Boolean));
  document.getElementById('statPetugas').textContent  = uniq.size;
}

/* ====== RENDER TABLE ====== */
function renderTable() {
  const filtered = getFiltered();
  const container = document.getElementById('tableContainer');

  document.getElementById('listMeta').textContent = records.length
    ? `${filtered.length} dari ${records.length} entri`
    : 'Belum ada data';

  if (!records.length) {
    container.innerHTML = `<div class="empty-state">
      <div class="empty-icon">&#128196;</div>
      <div class="empty-text">Belum ada entri tersimpan di Google Sheets.<br/>Submit form untuk merekam entri.</div>
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
    <th>Perusahaan / Usaha</th>
    <th>Petugas Pendata</th>
    <th>Kecamatan</th>
    <th>Waktu Submit</th>
    <th>Aksi</th>
  </tr></thead><tbody>`;

  filtered.forEach((r, idx) => {
    const co   = esc(r.nama_perusahaan) || '<em style="color:#bbb">Tanpa nama</em>';
    const koml = r.nama_komersial ? `<small>${esc(r.nama_komersial)}</small>` : '';
    html += `<tr>
      <td data-label="No" style="color:#aaa;font-size:12px;text-align:center">${idx+1}</td>
      <td data-label="Perusahaan" class="cell-company">${co}${koml}</td>
      <td data-label="Petugas" class="cell-petugas">${esc(r.petugas_nama||'—')}
        ${r.petugas_nip ? `<small>NIP: ${esc(r.petugas_nip)}</small>` : ''}</td>
      <td data-label="Kecamatan" style="font-size:12.5px;color:#555">${esc(r.kecamatan||'—')}</td>
      <td data-label="Waktu" style="font-size:12px;color:#888;white-space:nowrap">${fmtDate(r._ts||r.timestamp)}</td>
      <td><div class="td-actions">
        <button class="btn btn-sm btn-info" onclick="viewRecord(${r._id})">&#128065; Lihat</button>
        <button class="btn btn-sm" style="background:#38a169;color:#fff" onclick="editRecord(${r._id})">&#9998; Edit</button>
        <button class="btn btn-sm" style="background:#805ad5;color:#fff" onclick="duplicateRecord(${r._id})">&#9986; Duplikat</button>
        <button class="btn btn-sm" style="background:#e53e3e;color:#fff" onclick="deleteRecord(${r._id})">&#128465; Hapus</button>
      </div></td>
    </tr>`;
  });
  html += `</tbody></table>`;
  container.innerHTML = html;
}

/* ====== VIEW ====== */
function viewRecord(id) {
  const r = records.find(x => x._id === id);
  if (!r) return;
  document.getElementById('viewTitle').textContent    = r.nama_perusahaan || 'Detail Entri';
  document.getElementById('viewSubtitle').textContent = `Submit: ${fmtDate(r._ts||r.timestamp)} | Petugas: ${r.petugas_nama || '—'}`;

  const sections = [
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
  localStorage.setItem('cawi_edit_mode', JSON.stringify(r));
  window.location.href = 'index.html';
}

/* ====== DUPLIKAT ====== */
function duplicateRecord(id) {
  const r = records.find(x => x._id === id);
  if (!r) return;
  const copy = Object.assign({}, r);
  delete copy._id;
  copy.responden_nama = '';
  copy.responden_hp   = '';
  copy.responden_email = '';
  copy.tanggal_pelaksanaan = '';
  localStorage.setItem('cawi_edit_mode', JSON.stringify(copy));
  window.location.href = 'index.html';
}

/* ====== HAPUS ====== */
let _pendingDeleteId = null;

function deleteRecord(id) {
  const r = records.find(x => x._id === id);
  if (!r) return;
  _pendingDeleteId = id;
  document.getElementById('confirmDeleteName').textContent =
    r.nama_perusahaan || '(tanpa nama)';
  document.getElementById('confirmDeleteSub').textContent =
    `Petugas: ${r.petugas_nama || '—'} | ${r.kecamatan || '—'}`;
  document.getElementById('confirmOverlay').classList.add('open');
}

function cancelDelete() {
  _pendingDeleteId = null;
  document.getElementById('confirmOverlay').classList.remove('open');
}

async function confirmDelete() {
  if (!_pendingDeleteId) return;
  const id = _pendingDeleteId;
  const btn = document.getElementById('confirmDeleteBtn');
  btn.textContent = 'Menghapus...';
  btn.disabled = true;

  try {
    await fetch(getScriptUrl(), {
      method: 'POST',
      mode: 'no-cors',
      body: JSON.stringify({ action: 'deleteRecord', _delete_id: id })
    });
    // no-cors → opaque, asumsikan berhasil
    records = records.filter(x => x._id !== id);
    buildPetugasFilter();
    updateStats();
    renderTable();
    cancelDelete();
  } catch(err) {
    alert('Gagal menghapus: ' + err.message);
    btn.textContent = 'Hapus';
    btn.disabled = false;
  }
}

/* ====== EXPORT CSV ====== */
function exportCSV() {
  const filtered = getFiltered();
  if (!filtered.length) { alert('Tidak ada data untuk diekspor.'); return; }
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
  const blob = new Blob(['﻿' + rows.join('\r\n')], {type:'text/csv;charset=utf-8'});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `CAWI_SE2026_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ====== INIT ====== */
document.addEventListener('DOMContentLoaded', fetchRecords);
