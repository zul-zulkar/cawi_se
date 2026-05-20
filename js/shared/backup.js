/* ====== BACKUP & RESTORE DATA LOKAL ====== */

const BACKUP_MANIFEST = {
  drafts:        'cawi_se2026_drafts_v1',
  working_draft: 'cawi_se2026_draft_v1',
  records_cache: 'cawi_se2026_records_v1'
};

function backupData() {
  const payload = {
    _app:      'CAWI_SE2026',
    _version:  1,
    _exported: new Date().toISOString()
  };

  let isEmpty = true;
  Object.entries(BACKUP_MANIFEST).forEach(([key, lsKey]) => {
    const raw = localStorage.getItem(lsKey);
    if (raw) {
      try { payload[key] = JSON.parse(raw); isEmpty = false; }
      catch(e) { payload[key] = null; }
    } else {
      payload[key] = null;
    }
  });

  if (isEmpty) {
    alert('Tidak ada data lokal untuk dibackup.\n\nSimpan setidaknya satu draft terlebih dahulu.');
    return;
  }

  const draftCount = Array.isArray(payload.drafts) ? payload.drafts.length : 0;
  const recCount   = Array.isArray(payload.records_cache) ? payload.records_cache.length : 0;
  const hasWorking = !!payload.working_draft;

  const blob     = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
  const url      = URL.createObjectURL(blob);
  const filename = `CAWI_SE2026_backup_${new Date().toISOString().slice(0, 10)}.json`;
  const a        = document.createElement('a');
  a.href         = url;
  a.download     = filename;
  a.click();
  URL.revokeObjectURL(url);

  _showBackupToast(
    `Backup berhasil: ${draftCount} draft` +
    (recCount   ? `, ${recCount} cache rekaman` : '') +
    (hasWorking ? ', 1 isian aktif'             : '')
  );
}

function restoreData() {
  const input  = document.createElement('input');
  input.type   = 'file';
  input.accept = '.json,application/json';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (data._app !== 'CAWI_SE2026') {
        alert('File tidak valid.\nPastikan file berasal dari fitur backup CAWI SE2026.');
        return;
      }

      const draftCount = Array.isArray(data.drafts) ? data.drafts.length : 0;
      const recCount   = Array.isArray(data.records_cache) ? data.records_cache.length : 0;
      const expDate    = data._exported ? fmtDate(data._exported) : '(tidak diketahui)';

      const ok = confirm(
        `Restore backup dari: ${expDate}\n\n` +
        `Isi file:\n` +
        `  • ${draftCount} draft\n` +
        `  • ${recCount} cache rekaman tersubmit\n\n` +
        `⚠ Data lokal saat ini akan DITIMPA seluruhnya.\n` +
        `Tindakan ini tidak dapat dibatalkan.\n\nLanjutkan?`
      );
      if (!ok) return;

      Object.entries(BACKUP_MANIFEST).forEach(([key, lsKey]) => {
        if (data[key] !== null && data[key] !== undefined) {
          localStorage.setItem(lsKey, JSON.stringify(data[key]));
        }
      });

      alert(`Restore berhasil!\n${draftCount} draft dan ${recCount} cache rekaman telah dipulihkan.\nHalaman akan dimuat ulang.`);
      window.location.reload();
    } catch(e) {
      alert('Gagal membaca file backup:\n' + e.message);
    }
  };
  input.click();
}

function _showBackupToast(msg) {
  let t = document.getElementById('_backupToast');
  if (!t) {
    t = document.createElement('div');
    t.id = '_backupToast';
    t.style.cssText = 'position:fixed;bottom:24px;right:20px;background:#2b6cb0;color:#fff;padding:12px 18px;border-radius:8px;font-size:13px;font-weight:600;z-index:9999;box-shadow:0 4px 16px rgba(0,0,0,.25);transition:opacity .4s;max-width:340px';
    document.body.appendChild(t);
  }
  t.textContent  = '✓ ' + msg;
  t.style.opacity = '1';
  clearTimeout(t._tmr);
  t._tmr = setTimeout(() => { t.style.opacity = '0'; }, 4000);
}
