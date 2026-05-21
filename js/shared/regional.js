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
function makeSearchable(selectId, label) {
  const select = document.getElementById(selectId);
  if (!select || select.dataset.ssInit) return;
  select.dataset.ssInit = '1';
  select.style.display = 'none';

  const wrap = document.createElement('div');
  wrap.className = 'ss-wrap';
  select.parentNode.insertBefore(wrap, select);
  wrap.appendChild(select);

  const inp = document.createElement('input');
  inp.type = 'text';
  inp.className = 'ss-input';
  inp.id = selectId + '_inp';
  inp.autocomplete = 'off';
  inp.disabled = select.disabled;
  inp.placeholder = select.disabled ? 'Memuat...' : `🔍 Cari ${label}…`;
  wrap.insertBefore(inp, select);

  const dd = document.createElement('div');
  dd.className = 'ss-dropdown';
  dd.id = selectId + '_dd';
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

  function renderDd(opts, q) {
    focusIdx = -1;
    dd.innerHTML = '';
    const visible = opts.slice(0, 150);
    if (!visible.length) {
      const empty = document.createElement('div');
      empty.className = 'ss-item ss-empty';
      empty.textContent = 'Tidak ditemukan';
      dd.appendChild(empty);
    } else {
      visible.forEach(o => {
        const el = document.createElement('div');
        el.className = 'ss-item';
        if (o.value === select.value) el.classList.add('active');
        el.innerHTML = _ssHighlight(o.label, q || '');
        el._ssOpt = o;
        el.addEventListener('mousedown', e => {
          e.preventDefault();
          selectOpt(o);
        });
        dd.appendChild(el);
      });
    }
    dd.classList.add('open');
  }

  function selectOpt(o) {
    inp.value = o.label;
    inp.classList.add('has-value');
    select.value = o.value;
    select.dispatchEvent(new Event('change', {bubbles: true}));
    dd.classList.remove('open');
    focusIdx = -1;
  }

  function getItems() {
    return Array.from(dd.querySelectorAll('.ss-item:not(.ss-empty)'));
  }

  function setFocus(idx) {
    const items = getItems();
    items.forEach(el => el.classList.remove('keyboard-focus'));
    focusIdx = Math.max(0, Math.min(idx, items.length - 1));
    if (items[focusIdx]) {
      items[focusIdx].classList.add('keyboard-focus');
      items[focusIdx].scrollIntoView({block: 'nearest'});
    }
  }

  inp.addEventListener('focus', () => {
    if (inp.disabled) return;
    inp.select();
    const q = inp.value;
    renderDd(scoreFilter(getOpts(), q), q);
  });

  inp.addEventListener('input', () => {
    const q = inp.value;
    renderDd(scoreFilter(getOpts(), q), q);
    if (!q) { inp.classList.remove('has-value'); select.value = ''; }
  });

  inp.addEventListener('keydown', e => {
    const items = getItems();
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!dd.classList.contains('open')) {
        const q = inp.value;
        renderDd(scoreFilter(getOpts(), q), q);
      } else {
        setFocus(focusIdx + 1);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocus(focusIdx - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (focusIdx >= 0 && items[focusIdx] && items[focusIdx]._ssOpt) {
        selectOpt(items[focusIdx]._ssOpt);
      } else if (items.length === 1 && items[0]._ssOpt) {
        selectOpt(items[0]._ssOpt);
      }
    } else if (e.key === 'Escape') {
      dd.classList.remove('open');
      focusIdx = -1;
    }
  });

  inp.addEventListener('blur', () => {
    setTimeout(() => {
      dd.classList.remove('open');
      focusIdx = -1;
      if (inp.value && !getOpts().find(o => o.label === inp.value)) {
        const cur = select.value ? (getOpts().find(o => o.value === select.value) || null) : null;
        inp.value = cur ? cur.label : '';
        if (!cur) inp.classList.remove('has-value');
      }
    }, 180);
  });
}

function syncSearchable(selectId, label) {
  const inp = document.getElementById(selectId + '_inp');
  const select = document.getElementById(selectId);
  if (!inp || !select) return;
  inp.disabled = select.disabled;
  if (select.disabled) {
    inp.placeholder = 'Memuat…';
    inp.value = '';
    inp.classList.remove('has-value');
  } else {
    const count = Array.from(select.options).filter(o => o.value).length;
    inp.placeholder = count > 0 ? `🔍 Cari ${label}… (${count} pilihan)` : `🔍 Cari ${label}…`;
    inp.value = '';
    inp.classList.remove('has-value');
  }
}
