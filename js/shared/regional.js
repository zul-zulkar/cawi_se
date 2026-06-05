const API_BASE = 'https://esurvey.bps.go.id/lookup/api/v1/collections';

async function apiFetch(url) {
  const r = await fetch(url, {headers:{'Accept':'application/json'}});
  if (!r.ok) throw new Error('API error: ' + r.status);
  return r.json();
}

function loadProvinsi() {
  const sel = document.getElementById('q11e_provinsi');
  if (!sel) return;
  sel.innerHTML = '<option value="">-- Pilih Provinsi --</option>';
  const list = (typeof STATIC_PROVINSI !== 'undefined') ? STATIC_PROVINSI : [];
  list.forEach(d => {
    const o = document.createElement('option');
    o.value = d.kode;
    o.textContent = d.nama;
    sel.appendChild(o);
  });
  syncSearchable('q11e_provinsi', 'provinsi');
}

async function loadKabupaten(kdprov, selectId='q2_kabupaten', spinnerId='spinner-kab') {
  const sel = document.getElementById(selectId);
  sel.innerHTML = '<option value="">-- Pilih Kabupaten/Kota --</option>';
  sel.disabled = true;
  if (selectId === 'q2_kabupaten') {
    const selKec = document.getElementById('q3_kecamatan');
    const selKel = document.getElementById('q4_kelurahan');
    selKec.innerHTML = '<option value="">-- Pilih Kecamatan --</option>';
    selKel.innerHTML = '<option value="">-- Pilih Kelurahan/Desa/Nagari --</option>';
    selKec.disabled = true; selKel.disabled = true;
  }
  if (!kdprov) return;
  const sp = document.getElementById(spinnerId);
  sp.classList.remove('hidden');
  try {
    const res = await apiFetch(`${API_BASE}/668fcfe6-8ef4-4612-968a-d1330c03fe17/filter?version=1&filter=kdprov||eq||${kdprov}`);
    const data = (res.data || []).sort((a,b)=>a.namakab.localeCompare(b.namakab));
    data.forEach(d => {
      const o = document.createElement('option');
      o.value = d.kdprovkab;
      o.textContent = d.namakab;
      sel.appendChild(o);
    });
    sel.disabled = false;
    syncSearchable(selectId, 'kabupaten/kota');
  } catch(e) { console.error('Gagal memuat kabupaten:', e); }
  finally { sp.classList.add('hidden'); }
}

function loadKecamatan(kdprovkab) {
  const selKec = document.getElementById('q3_kecamatan');
  const selKel = document.getElementById('q4_kelurahan');
  selKec.innerHTML = '<option value="">-- Pilih Kecamatan --</option>';
  selKel.innerHTML = '<option value="">-- Pilih Kelurahan/Desa/Nagari --</option>';
  selKec.disabled = true; selKel.disabled = true;
  syncSearchable('q3_kecamatan', 'kecamatan');
  syncSearchable('q4_kelurahan', 'kelurahan/desa');
  if (!kdprovkab) return;
  const list = (typeof STATIC_KECAMATAN !== 'undefined' && STATIC_KECAMATAN[kdprovkab]) || [];
  list.forEach(d => {
    const o = document.createElement('option');
    o.value = d.kode;
    o.textContent = d.nama;
    selKec.appendChild(o);
  });
  selKec.disabled = false;
  syncSearchable('q3_kecamatan', 'kecamatan');
}

function loadKelurahan(kdprovkabkec) {
  const sel = document.getElementById('q4_kelurahan');
  sel.innerHTML = '<option value="">-- Pilih Kelurahan/Desa/Nagari --</option>';
  sel.disabled = true;
  syncSearchable('q4_kelurahan', 'kelurahan/desa');
  if (!kdprovkabkec) return;
  const list = (typeof STATIC_KELURAHAN !== 'undefined' && STATIC_KELURAHAN[kdprovkabkec]) || [];
  list.slice().sort((a,b) => a.nama.localeCompare(b.nama)).forEach(d => {
    const o = document.createElement('option');
    o.value = d.kode;
    o.textContent = d.nama;
    sel.appendChild(o);
  });
  sel.disabled = false;
  syncSearchable('q4_kelurahan', 'kelurahan/desa');
}

// ---- Searchable Select — helpers ----
function _ssEsc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function _ssScore(label, q) {
  if (!q) return 1;
  const lc = label.toLowerCase();
  const ql = q.toLowerCase();
  if (lc === ql) return 100;
  if (lc.startsWith(ql)) return 80;
  if (lc.split(/[\s\/\-\.\(\)]+/).some(w => w.startsWith(ql))) return 60;
  if (lc.includes(ql)) return 40;
  return 0;
}

function _ssHighlight(text, q) {
  if (!q) return _ssEsc(text);
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return _ssEsc(text);
  return _ssEsc(text.slice(0, idx)) +
    '<mark class="ss-mark">' + _ssEsc(text.slice(idx, idx + q.length)) + '</mark>' +
    _ssEsc(text.slice(idx + q.length));
}

// ---- Searchable Select Component ----
/* Searchable select — versi minimalis:
 *  - Trigger READ-ONLY (#<id>_inp) menampilkan nilai terpilih (bersih, seperti select).
 *    Tetap kompatibel: kode prefill/draft cukup set inp.value + class has-value.
 *  - Tombol clear (×) muncul saat ada nilai.
 *  - Kotak pencarian berada DI DALAM dropdown (#<id>_search), bukan di field.
 */
function makeSearchable(selectId, label) {
  const select = document.getElementById(selectId);
  if (!select || select.dataset.ssInit) return;
  select.dataset.ssInit = '1';
  select.style.display = 'none';

  const wrap = document.createElement('div');
  wrap.className = 'ss-wrap';
  select.parentNode.insertBefore(wrap, select);
  wrap.appendChild(select);

  // Trigger read-only (menampilkan pilihan). Pencarian dilakukan di dalam dropdown.
  const inp = document.createElement('input');
  inp.type = 'text';
  inp.className = 'ss-input';
  inp.id = selectId + '_inp';
  inp.readOnly = true;
  inp.autocomplete = 'off';
  inp.disabled = select.disabled;
  inp.placeholder = select.disabled ? 'Memuat…' : `Pilih ${label}…`;
  inp.dataset.ssLabel = label;
  wrap.insertBefore(inp, select);

  // Tombol clear (×)
  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.className = 'ss-clear';
  clearBtn.id = selectId + '_clear';
  clearBtn.setAttribute('aria-label', `Hapus pilihan ${label}`);
  clearBtn.innerHTML = '&times;';
  wrap.insertBefore(clearBtn, select);

  // Dropdown: kotak cari + daftar opsi.
  const dd = document.createElement('div');
  dd.className = 'ss-dropdown';
  dd.id = selectId + '_dd';
  const searchRow = document.createElement('div');
  searchRow.className = 'ss-search-row';
  const search = document.createElement('input');
  search.type = 'text';
  search.className = 'ss-search';
  search.id = selectId + '_search';
  search.autocomplete = 'off';
  search.placeholder = `🔍 Cari ${label}…`;
  searchRow.appendChild(search);
  dd.appendChild(searchRow);
  const listEl = document.createElement('div');
  listEl.className = 'ss-list';
  listEl.id = selectId + '_list';
  dd.appendChild(listEl);
  wrap.appendChild(dd);

  let focusIdx = -1;

  function getOpts() {
    return Array.from(select.options).filter(o => o.value !== '').map(o => ({value: o.value, label: o.text}));
  }
  function scoreFilter(opts, q) {
    const ql = (q || '').trim();
    if (!ql) return opts;
    return opts
      .map(o => ({...o, _score: _ssScore(o.label, ql)}))
      .filter(o => o._score > 0)
      .sort((a, b) => b._score - a._score || a.label.localeCompare(b.label, 'id'));
  }
  function renderList(opts, q) {
    focusIdx = -1;
    listEl.innerHTML = '';
    const visible = opts.slice(0, 150);
    if (!visible.length) {
      const empty = document.createElement('div');
      empty.className = 'ss-item ss-empty';
      empty.textContent = 'Tidak ditemukan';
      listEl.appendChild(empty);
      return;
    }
    visible.forEach(o => {
      const el = document.createElement('div');
      el.className = 'ss-item';
      if (o.value === select.value) el.classList.add('active');
      el.innerHTML = _ssHighlight(o.label, q || '');
      el._ssOpt = o;
      el.addEventListener('mousedown', e => { e.preventDefault(); selectOpt(o); });
      listEl.appendChild(el);
    });
  }
  function openDd() {
    if (inp.disabled) return;
    dd.classList.add('open');
    search.value = '';
    renderList(getOpts(), '');
    setTimeout(() => search.focus(), 0);
  }
  function closeDd() { dd.classList.remove('open'); focusIdx = -1; }
  function selectOpt(o) {
    inp.value = o.label;
    inp.classList.add('has-value');
    select.value = o.value;
    select.dispatchEvent(new Event('change', {bubbles: true}));
    closeDd();
  }
  function clearSel(e) {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    inp.value = '';
    inp.classList.remove('has-value');
    select.value = '';
    select.dispatchEvent(new Event('change', {bubbles: true}));
    closeDd();
  }
  function getItems() { return Array.from(listEl.querySelectorAll('.ss-item:not(.ss-empty)')); }
  function setFocus(idx) {
    const items = getItems();
    items.forEach(el => el.classList.remove('keyboard-focus'));
    focusIdx = Math.max(0, Math.min(idx, items.length - 1));
    if (items[focusIdx]) {
      items[focusIdx].classList.add('keyboard-focus');
      items[focusIdx].scrollIntoView({block: 'nearest'});
    }
  }

  inp.addEventListener('click', () => { dd.classList.contains('open') ? closeDd() : openDd(); });
  inp.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDd(); }
  });
  clearBtn.addEventListener('click', clearSel);
  search.addEventListener('input', () => renderList(scoreFilter(getOpts(), search.value), search.value));
  search.addEventListener('keydown', e => {
    const items = getItems();
    if (e.key === 'ArrowDown') { e.preventDefault(); setFocus(focusIdx + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setFocus(focusIdx - 1); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (focusIdx >= 0 && items[focusIdx] && items[focusIdx]._ssOpt) selectOpt(items[focusIdx]._ssOpt);
      else if (items.length === 1 && items[0]._ssOpt) selectOpt(items[0]._ssOpt);
    } else if (e.key === 'Escape') { closeDd(); inp.focus(); }
  });
  // Tutup dropdown saat klik di luar
  document.addEventListener('mousedown', ev => { if (!wrap.contains(ev.target)) closeDd(); });
}

function syncSearchable(selectId, label) {
  const inp = document.getElementById(selectId + '_inp');
  const select = document.getElementById(selectId);
  if (!inp || !select) return;
  const search = document.getElementById(selectId + '_search');
  inp.disabled = select.disabled;
  if (select.disabled) {
    inp.placeholder = 'Memuat…';
    inp.value = '';
    inp.classList.remove('has-value');
  } else {
    const count = Array.from(select.options).filter(o => o.value).length;
    inp.placeholder = `Pilih ${label}…`;
    if (search) search.placeholder = count > 0 ? `🔍 Cari ${label}… (${count})` : `🔍 Cari ${label}…`;
    inp.value = '';
    inp.classList.remove('has-value');
  }
}
