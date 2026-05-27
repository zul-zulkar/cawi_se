/* ====== L FORM HANDLERS ====== */

/* --- L1 Anggota Cards --- */
function renderAnggotaCards() {
  const wrap = document.getElementById('l1_anggota_wrap');
  const empty = document.getElementById('l1_anggota_empty');
  if (!wrap) return;
  const n = parseInt(document.getElementById('l1_jml_kk_anggota').value) || 0;
  const capped = Math.min(Math.max(n, 0), 30);
  if (capped <= 0) {
    wrap.innerHTML = '';
    if (empty) empty.style.display = '';
    updateSidebarAnggota(0);
    updateJmlPendataan();
    if (typeof updateProgress === 'function') updateProgress();
    return;
  }
  if (empty) empty.style.display = 'none';
  // Only re-render if count changed
  if (wrap.dataset.count === String(capped)) return;
  wrap.dataset.count = capped;
  wrap.innerHTML = '';
  for (let i = 1; i <= capped; i++) {
    wrap.insertAdjacentHTML('beforeend', anggotaCardHTML(i));
    initAnggotaSearchable(i);
  }
  updateSidebarAnggota(capped);
  updateJmlPendataan();
  if (typeof updateProgress === 'function') updateProgress();
}

function initAnggotaSearchable(i) {
  if (typeof makeSearchable !== 'function') return;
  makeSearchable(`l_ang_${i}_hubungan`, 'hubungan keluarga');
  makeSearchable(`l_ang_${i}_profesi`, 'profesi/pekerjaan');
  makeSearchable(`l_ang_${i}_dn_provinsi`, 'provinsi pindah');
}

function anggotaCardHTML(i) {
  const profesiOpts = (typeof STATIC_PROFESI !== 'undefined' ? STATIC_PROFESI : [])
    .map(p => `<option value="${p.kode}">${p.kode}. ${p.nama}</option>`).join('');
  const provOpts = (typeof STATIC_PROVINSI !== 'undefined' ? STATIC_PROVINSI : [])
    .map(p => `<option value="${p.kode}">${p.nama}</option>`).join('');
  return `
<div class="anggota-card" id="l_ang_card_${i}">
  <div class="anggota-header" onclick="toggleAnggotaCard(${i})">
    <div class="anggota-header-name">
      <span>Anggota #${i}</span>
      <span id="l_ang_${i}_name_preview" style="color:#666;font-weight:500;font-size:12.5px"></span>
      <span id="l_ang_${i}_stop_badge" class="anggota-stop-badge" style="display:none">STOP</span>
    </div>
    <span id="l_ang_toggle_${i}">&#9660;</span>
  </div>
  <div class="anggota-body" id="l_ang_body_${i}">
    <div class="anggota-ctx-bar"><span class="anggota-ctx-label">Anggota ke-${i}:</span><span id="l_ang_${i}_ctx_nama" class="anggota-ctx-nama">&nbsp;(nama belum diisi)</span></div>
    <div class="anggota-subsection-label">A. Identitas (r5-r13)</div>
    <div class="inline-fields">
      <div class="form-group">
        <label class="field-label">5. Nomor Urut</label>
        <input type="text" class="input-muted" readonly value="${i}"/>
      </div>
      <div class="form-group" style="flex:2">
        <label class="field-label">6. Nama Anggota <span class="req">*</span></label>
        <input type="text" id="l_ang_${i}_nama" placeholder="Nama lengkap" oninput="updateAnggotaNamePreview(${i});updateJmlPendataan()"/>
      </div>
      <div class="form-group" style="flex:2">
        <label class="field-label">7. NIK</label>
        <input type="text" id="l_ang_${i}_nik" maxlength="16" placeholder="16 digit NIK"/>
      </div>
    </div>
    <div class="form-group">
      <label class="field-label">8. Hubungan dengan Kepala Keluarga <span class="req">*</span></label>
      <select id="l_ang_${i}_hubungan">
        <option value="">-- Pilih --</option>
        <option value="1">1. Kepala Keluarga</option>
        <option value="2">2. Istri/Suami</option>
        <option value="3">3. Anak</option>
        <option value="4">4. Menantu</option>
        <option value="5">5. Cucu</option>
        <option value="6">6. Orang Tua</option>
        <option value="7">7. Mertua</option>
        <option value="8">8. Famili</option>
        <option value="9">9. Lainnya</option>
      </select>
    </div>
    <div class="form-group">
      <label class="field-label">9a. Keberadaan Anggota <span class="req">*</span></label>
      <div class="radio-group">
        <label class="radio-item"><input type="radio" name="l_ang_${i}_keberadaan" value="1" onchange="handleKeberadaanAnggota(${i})"/> <span>1. Tinggal di rumah ini</span></label>
        <label class="radio-item"><input type="radio" name="l_ang_${i}_keberadaan" value="2" onchange="handleKeberadaanAnggota(${i})"/> <span>2. Meninggal (STOP)</span></label>
        <label class="radio-item"><input type="radio" name="l_ang_${i}_keberadaan" value="3" onchange="handleKeberadaanAnggota(${i})"/> <span>3. Pindah dalam negeri</span></label>
        <label class="radio-item"><input type="radio" name="l_ang_${i}_keberadaan" value="4" onchange="handleKeberadaanAnggota(${i})"/> <span>4. Pindah luar negeri</span></label>
        <label class="radio-item"><input type="radio" name="l_ang_${i}_keberadaan" value="5" onchange="handleKeberadaanAnggota(${i})"/> <span>5. Anggota baru</span></label>
        <label class="radio-item"><input type="radio" name="l_ang_${i}_keberadaan" value="6" onchange="handleKeberadaanAnggota(${i})"/> <span>6. Pisah KK (STOP)</span></label>
        <label class="radio-item"><input type="radio" name="l_ang_${i}_keberadaan" value="7" onchange="handleKeberadaanAnggota(${i})"/> <span>7. Tidak ditemukan (STOP)</span></label>
      </div>
    </div>

    <div class="anggota-after-r9">
    <div class="form-group hidden" id="l_ang_${i}_alamat_dom_wrap">
      <label class="field-label">9b. Alamat domisili</label>
      <div class="radio-group">
        <label class="radio-item"><input type="radio" name="l_ang_${i}_alamat_dom" value="1"/> <span>1. Sesuai KK &amp; KTP</span></label>
        <label class="radio-item"><input type="radio" name="l_ang_${i}_alamat_dom" value="2"/> <span>2. Hanya sesuai KK</span></label>
        <label class="radio-item"><input type="radio" name="l_ang_${i}_alamat_dom" value="3"/> <span>3. Hanya sesuai KTP</span></label>
        <label class="radio-item"><input type="radio" name="l_ang_${i}_alamat_dom" value="4"/> <span>4. Tidak sesuai KK &amp; KTP</span></label>
      </div>
    </div>
    <div class="hidden" id="l_ang_${i}_dn_wrap">
      <div class="form-group">
        <label class="field-label">10DN.a. Provinsi domisili</label>
        <select id="l_ang_${i}_dn_provinsi" onchange="handleDnProvinsiAnggota(${i})">
          <option value="">-- Pilih --</option>
          ${provOpts}
        </select>
      </div>
      <div class="form-group">
        <label class="field-label">10DN.b. Kab/Kota domisili</label>
        <select id="l_ang_${i}_dn_kab" disabled>
          <option value="">-- Pilih Provinsi dulu --</option>
        </select>
      </div>
    </div>
    <div class="form-group hidden" id="l_ang_${i}_ln_wrap">
      <label class="field-label">10LN. Negara domisili</label>
      <input type="text" id="l_ang_${i}_ln_negara" placeholder="Nama negara"/>
    </div>
    <div class="form-group">
      <label class="field-label">11. Status Perkawinan</label>
      <div class="radio-group">
        <label class="radio-item"><input type="radio" name="l_ang_${i}_kawin" value="1"/> <span>1. Belum kawin</span></label>
        <label class="radio-item"><input type="radio" name="l_ang_${i}_kawin" value="2"/> <span>2. Kawin/nikah</span></label>
        <label class="radio-item"><input type="radio" name="l_ang_${i}_kawin" value="3"/> <span>3. Cerai hidup</span></label>
        <label class="radio-item"><input type="radio" name="l_ang_${i}_kawin" value="4"/> <span>4. Cerai mati</span></label>
      </div>
    </div>
    <div class="form-group">
      <label class="field-label">12. Jenis Kelamin <span class="req">*</span></label>
      <div class="radio-group">
        <label class="radio-item"><input type="radio" name="l_ang_${i}_jk" value="1"/> <span>1. Laki-laki</span></label>
        <label class="radio-item"><input type="radio" name="l_ang_${i}_jk" value="2"/> <span>2. Perempuan</span></label>
      </div>
    </div>
    <div class="inline-fields">
      <div class="form-group">
        <label class="field-label">13a. Tanggal Lahir <span class="req">*</span></label>
        <input type="date" id="l_ang_${i}_tgl_lahir" onchange="computeUmurAnggota(${i})"/>
      </div>
      <div class="form-group">
        <label class="field-label">13b. Umur (autofill)</label>
        <input type="number" id="l_ang_${i}_umur" class="input-muted" readonly placeholder="—"/>
      </div>
    </div>

    <div class="anggota-subsection-label">B. Sosial Ekonomi (r14-r21)</div>
    <div id="l_ang_${i}_sosek5plus_wrap">
      <div class="form-group">
        <label class="field-label">14. Partisipasi sekolah (≥5 thn)</label>
        <div class="radio-group">
          <label class="radio-item"><input type="radio" name="l_ang_${i}_sekolah" value="0" onchange="handleSekolahAnggota(${i})"/> <span>0. Tidak/belum pernah</span></label>
          <label class="radio-item"><input type="radio" name="l_ang_${i}_sekolah" value="1" onchange="handleSekolahAnggota(${i})"/> <span>1. Masih sekolah</span></label>
          <label class="radio-item"><input type="radio" name="l_ang_${i}_sekolah" value="2" onchange="handleSekolahAnggota(${i})"/> <span>2. Tidak bersekolah lagi</span></label>
        </div>
      </div>
      <div id="l_ang_${i}_ijazah_wrap">
      <div class="form-group">
        <label class="field-label">15. Ijazah Tertinggi (≥5 thn)</label>
        <div class="radio-group">
          <label class="radio-item"><input type="radio" name="l_ang_${i}_ijazah" value="0"/> <span>0. Tidak punya ijazah SD</span></label>
          <label class="radio-item"><input type="radio" name="l_ang_${i}_ijazah" value="1"/> <span>1. SD/sederajat</span></label>
          <label class="radio-item"><input type="radio" name="l_ang_${i}_ijazah" value="2"/> <span>2. SMP/sederajat</span></label>
          <label class="radio-item"><input type="radio" name="l_ang_${i}_ijazah" value="3"/> <span>3. SMA/sederajat</span></label>
          <label class="radio-item"><input type="radio" name="l_ang_${i}_ijazah" value="4"/> <span>4. D1/D2/D3</span></label>
          <label class="radio-item"><input type="radio" name="l_ang_${i}_ijazah" value="5"/> <span>5. D4/S1/Profesi</span></label>
          <label class="radio-item"><input type="radio" name="l_ang_${i}_ijazah" value="6"/> <span>6. S2/S3</span></label>
        </div>
      </div>
      </div>
    </div>
    <div id="l_ang_${i}_sosek10plus_wrap">
      <div class="form-group">
        <label class="field-label">16. Profesi Pekerjaan Utama (≥10 thn)</label>
        <select id="l_ang_${i}_profesi" onchange="handleProfesiAnggota(${i})">
          <option value="">-- Pilih --</option>
          ${profesiOpts}
        </select>
      </div>
      <div id="l_ang_${i}_kedudukan_wrap">
      <div class="form-group">
        <label class="field-label">17. Status Kedudukan (≥10 thn)</label>
        <div class="radio-group">
          <label class="radio-item"><input type="radio" name="l_ang_${i}_kedudukan" value="1"/> <span>1. Berusaha sendiri</span></label>
          <label class="radio-item"><input type="radio" name="l_ang_${i}_kedudukan" value="2"/> <span>2. Berusaha dibantu buruh</span></label>
          <label class="radio-item"><input type="radio" name="l_ang_${i}_kedudukan" value="3"/> <span>3. Buruh/karyawan/swasta</span></label>
          <label class="radio-item"><input type="radio" name="l_ang_${i}_kedudukan" value="4"/> <span>4. ASN/TNI/Polri/BUMN/BUMD</span></label>
          <label class="radio-item"><input type="radio" name="l_ang_${i}_kedudukan" value="5"/> <span>5. Pekerja bebas</span></label>
          <label class="radio-item"><input type="radio" name="l_ang_${i}_kedudukan" value="6"/> <span>6. Pekerja keluarga/tidak dibayar</span></label>
          <label class="radio-item"><input type="radio" name="l_ang_${i}_kedudukan" value="9"/> <span>9. Tidak tahu</span></label>
        </div>
      </div>
      </div>
      <div class="form-group">
        <label class="field-label">18a. Pendapatan dari Pekerjaan</label>
        <div class="radio-group">
          <label class="radio-item"><input type="radio" name="l_ang_${i}_18a" value="1" onchange="handlePendapatanAnggota(${i},'18a')"/> <span>1. Ya</span></label>
          <label class="radio-item"><input type="radio" name="l_ang_${i}_18a" value="2" onchange="handlePendapatanAnggota(${i},'18a')"/> <span>2. Tidak</span></label>
          <label class="radio-item"><input type="radio" name="l_ang_${i}_18a" value="9" onchange="handlePendapatanAnggota(${i},'18a')"/> <span>9. Tidak tahu</span></label>
        </div>
        <div class="hidden" id="l_ang_${i}_18a_nilai_wrap">
          <div class="currency-input-wrap" style="margin-top:8px"><span class="currency-prefix">Rp</span>
            <input type="text" id="l_ang_${i}_18a_nilai" class="currency-field" oninput="formatCurrency(this)" placeholder="0"/>
          </div>
        </div>
      </div>
      <div class="form-group">
        <label class="field-label">18b. Pendapatan Keuntungan Usaha</label>
        <div class="radio-group">
          <label class="radio-item"><input type="radio" name="l_ang_${i}_18b" value="1" onchange="handlePendapatanAnggota(${i},'18b')"/> <span>1. Ya</span></label>
          <label class="radio-item"><input type="radio" name="l_ang_${i}_18b" value="2" onchange="handlePendapatanAnggota(${i},'18b')"/> <span>2. Tidak</span></label>
          <label class="radio-item"><input type="radio" name="l_ang_${i}_18b" value="9" onchange="handlePendapatanAnggota(${i},'18b')"/> <span>9. Tidak tahu</span></label>
        </div>
        <div class="hidden" id="l_ang_${i}_18b_nilai_wrap">
          <div class="currency-input-wrap" style="margin-top:8px"><span class="currency-prefix">Rp</span>
            <input type="text" id="l_ang_${i}_18b_nilai" class="currency-field" oninput="formatCurrency(this)" placeholder="0"/>
          </div>
        </div>
      </div>
      <div class="form-group">
        <label class="field-label">18c. Penerimaan Transfer/Passive (pensiun, kupon SBN)</label>
        <div class="radio-group">
          <label class="radio-item"><input type="radio" name="l_ang_${i}_18c" value="1" onchange="handlePendapatanAnggota(${i},'18c')"/> <span>1. Ya</span></label>
          <label class="radio-item"><input type="radio" name="l_ang_${i}_18c" value="2" onchange="handlePendapatanAnggota(${i},'18c')"/> <span>2. Tidak</span></label>
          <label class="radio-item"><input type="radio" name="l_ang_${i}_18c" value="9" onchange="handlePendapatanAnggota(${i},'18c')"/> <span>9. Tidak tahu</span></label>
        </div>
        <div class="hidden" id="l_ang_${i}_18c_nilai_wrap">
          <div class="currency-input-wrap" style="margin-top:8px"><span class="currency-prefix">Rp</span>
            <input type="text" id="l_ang_${i}_18c_nilai" class="currency-field" oninput="formatCurrency(this)" placeholder="0"/>
          </div>
        </div>
      </div>
    </div>
    <div id="l_ang_${i}_sosek5plus_wrap2">
      <div class="form-group">
        <label class="field-label">19. Rekening Aktif / Dompet Digital (≥5 thn)</label>
        <div class="radio-group">
          <label class="radio-item"><input type="radio" name="l_ang_${i}_rekening" value="1"/> <span>1. Ya untuk usaha</span></label>
          <label class="radio-item"><input type="radio" name="l_ang_${i}_rekening" value="2"/> <span>2. Ya untuk pribadi</span></label>
          <label class="radio-item"><input type="radio" name="l_ang_${i}_rekening" value="3"/> <span>3. Ya untuk usaha &amp; pribadi</span></label>
          <label class="radio-item"><input type="radio" name="l_ang_${i}_rekening" value="4"/> <span>4. Tidak ada</span></label>
          <label class="radio-item"><input type="radio" name="l_ang_${i}_rekening" value="9"/> <span>9. Tidak tahu</span></label>
        </div>
      </div>
      <div class="form-group">
        <label class="field-label">20. Disabilitas (Ya/Tidak/Tidak Tahu per jenis)</label>
        ${disabilitasRowsHTML(i)}
      </div>
      <div class="form-group">
        <label class="field-label">21. Penyakit Kronis (Ya/Tidak/Tidak Tahu per jenis)</label>
        ${penyakitKronisRowsHTML(i)}
        <div class="form-group">
          <label class="field-label">21q. Lainnya (sebutkan)</label>
          <input type="text" id="l_ang_${i}_kronis_q_lain" placeholder="Penyakit lainnya"/>
        </div>
      </div>
    </div>
    </div><!-- end .anggota-after-r9 -->
  </div>
</div>`;
}

function disabilitasRowsHTML(i) {
  const labels = [
    ['a', 'Fisik'], ['b', 'Mental'], ['c', 'Intelektual'],
    ['d', 'Sensorik Netra'], ['e', 'Sensorik Rungu'], ['f', 'Sensorik Wicara'],
  ];
  return labels.map(([k, lbl]) => `
    <div class="inline-fields" style="align-items:center;border-bottom:1px solid #f5f2ee;padding:6px 0">
      <div style="flex:1;font-size:13px">${k.toUpperCase()}. ${lbl}</div>
      <div class="radio-group" style="margin:0">
        <label class="radio-item"><input type="radio" name="l_ang_${i}_disab_${k}" value="1"/> <span>Ya</span></label>
        <label class="radio-item"><input type="radio" name="l_ang_${i}_disab_${k}" value="2"/> <span>Tidak</span></label>
        <label class="radio-item"><input type="radio" name="l_ang_${i}_disab_${k}" value="9"/> <span>TT</span></label>
      </div>
    </div>`).join('');
}

function penyakitKronisRowsHTML(i) {
  const labels = [
    ['a', 'Hipertensi'], ['b', 'Rematik'], ['c', 'Asma'], ['d', 'Masalah Jantung'],
    ['e', 'Diabetes'], ['f', 'TBC'], ['g', 'Stroke'], ['h', 'Kanker/Tumor'],
    ['i', 'Gagal Ginjal'], ['j', 'Hemofilia'], ['k', 'HIV/AIDS'], ['l', 'Kolesterol'],
    ['m', 'Sirosis Hati'], ['n', 'Talasemia'], ['o', 'Leukemia'], ['p', 'Alzheimer'],
  ];
  return labels.map(([k, lbl]) => `
    <div class="inline-fields" style="align-items:center;border-bottom:1px solid #f5f2ee;padding:6px 0">
      <div style="flex:1;font-size:13px">${k.toUpperCase()}. ${lbl}</div>
      <div class="radio-group" style="margin:0">
        <label class="radio-item"><input type="radio" name="l_ang_${i}_kronis_${k}" value="1"/> <span>Ya</span></label>
        <label class="radio-item"><input type="radio" name="l_ang_${i}_kronis_${k}" value="2"/> <span>Tidak</span></label>
        <label class="radio-item"><input type="radio" name="l_ang_${i}_kronis_${k}" value="9"/> <span>TT</span></label>
      </div>
    </div>`).join('');
}

function toggleAnggotaCard(i) {
  const body = document.getElementById('l_ang_body_' + i);
  const icon = document.getElementById('l_ang_toggle_' + i);
  if (!body) return;
  const hidden = body.style.display === 'none';
  body.style.display = hidden ? '' : 'none';
  if (icon) icon.innerHTML = hidden ? '&#9660;' : '&#9658;';
}

function updateAnggotaNamePreview(i) {
  const el = document.getElementById('l_ang_' + i + '_nama');
  const name = el ? el.value.trim() : '';
  const out = document.getElementById('l_ang_' + i + '_name_preview');
  if (out) out.textContent = name ? '— ' + name : '';
  const ctx = document.getElementById('l_ang_' + i + '_ctx_nama');
  if (ctx) ctx.textContent = name ? ' ' + name : ' (nama belum diisi)';
  // Perbarui data-ang-nama pada card agar tiap pertanyaan menampilkan nama via CSS ::after
  const card = document.getElementById('l_ang_card_' + i);
  if (card) {
    if (name) card.setAttribute('data-ang-nama', name);
    else card.removeAttribute('data-ang-nama');
  }
}

function updateSidebarAnggota(count) {
  const group = document.getElementById('sidebarAnggotaGroup');
  const items = document.getElementById('sidebarAnggotaItems');
  if (!group || !items) return;
  if (count <= 0) { group.classList.add('hidden'); items.innerHTML = ''; return; }
  group.classList.remove('hidden');
  items.innerHTML = '';
  for (let i = 1; i <= count; i++) {
    const div = document.createElement('div');
    div.className = 'sidebar-q-item sidebar-q-sub';
    div.setAttribute('onclick', `goBlokAndScrollId(1,'l_ang_card_${i}')`);
    div.textContent = '↳ Anggota #' + i;
    items.appendChild(div);
  }
}

function updateJmlPendataan() {
  const wrap = document.getElementById('l1_anggota_wrap');
  if (!wrap) return;
  const cards = wrap.querySelectorAll('.anggota-card');
  let filled = 0;
  cards.forEach(card => {
    const id = card.id.replace('l_ang_card_', '');
    const nama = document.getElementById('l_ang_' + id + '_nama');
    if (nama && nama.value.trim()) filled++;
  });
  const out = document.getElementById('l1_jml_pendataan');
  if (out) out.value = filled || '';
}

/* --- Anggota STOP-state (r9a) --- */
function handleKeberadaanAnggota(i) {
  const v = getRadio('l_ang_' + i + '_keberadaan');
  const card = document.getElementById('l_ang_card_' + i);
  const badge = document.getElementById('l_ang_' + i + '_stop_badge');
  const dnWrap   = document.getElementById('l_ang_' + i + '_dn_wrap');
  const lnWrap   = document.getElementById('l_ang_' + i + '_ln_wrap');
  const domWrap  = document.getElementById('l_ang_' + i + '_alamat_dom_wrap');

  const STOP = (v === '2' || v === '6' || v === '7');
  if (card) card.classList.toggle('anggota-stop', STOP);
  if (badge) {
    if (STOP) {
      badge.style.display = '';
      badge.textContent = (v === '2') ? 'STOP — Meninggal'
                       : (v === '6') ? 'STOP — Pisah KK'
                       : 'STOP — Tidak Ditemukan';
    } else {
      badge.style.display = 'none';
    }
  }
  // r10DN visible only when v=3
  if (dnWrap)  dnWrap.classList.toggle('hidden', v !== '3');
  // r10LN visible only when v=4
  if (lnWrap)  lnWrap.classList.toggle('hidden', v !== '4');
  // r9b (alamat domisili) only for v=1 (tinggal di rumah ini)
  if (domWrap) domWrap.classList.toggle('hidden', v !== '1');

  if (typeof updateProgress === 'function') updateProgress();
}

/* --- Compute umur & age-gated fields --- */
function computeUmurAnggota(i) {
  const tgl = document.getElementById('l_ang_' + i + '_tgl_lahir');
  const out = document.getElementById('l_ang_' + i + '_umur');
  if (!tgl || !out) return;
  const v = tgl.value;
  if (!v) { out.value = ''; handleAgeGatedAnggota(i); return; }
  const d = new Date(v);
  if (isNaN(d.getTime())) { out.value = ''; handleAgeGatedAnggota(i); return; }
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  if (age < 0) age = 0;
  out.value = age;
  handleAgeGatedAnggota(i);
}

function handleAgeGatedAnggota(i) {
  const umur = parseInt(document.getElementById('l_ang_' + i + '_umur')?.value) || 0;
  const has5  = umur >= 5;
  const has10 = umur >= 10;
  const w5a  = document.getElementById('l_ang_' + i + '_sosek5plus_wrap');
  const w5b  = document.getElementById('l_ang_' + i + '_sosek5plus_wrap2');
  const w10  = document.getElementById('l_ang_' + i + '_sosek10plus_wrap');
  if (w5a) w5a.classList.toggle('hidden', !has5);
  if (w5b) w5b.classList.toggle('hidden', !has5);
  if (w10) w10.classList.toggle('hidden', !has10);
  if (typeof updateProgress === 'function') updateProgress();
}

/* --- Per-anggota conditional handlers --- */
function handleSekolahAnggota(i) {
  const v = getRadio('l_ang_' + i + '_sekolah');
  const w = document.getElementById('l_ang_' + i + '_ijazah_wrap');
  if (w) w.classList.toggle('hidden', v === '0');
  if (typeof updateProgress === 'function') updateProgress();
}

function handleProfesiAnggota(i) {
  const v = document.getElementById('l_ang_' + i + '_profesi')?.value;
  const w = document.getElementById('l_ang_' + i + '_kedudukan_wrap');
  if (w) w.classList.toggle('hidden', v === '000');
  if (typeof updateProgress === 'function') updateProgress();
}

function handlePendapatanAnggota(i, key) {
  const v = getRadio('l_ang_' + i + '_' + key);
  const w = document.getElementById('l_ang_' + i + '_' + key + '_nilai_wrap');
  if (w) w.classList.toggle('hidden', v !== '1');
  if (typeof updateProgress === 'function') updateProgress();
}

/* --- L1 regional dropdowns --- */
function loadProvinsiL() {
  const sel = document.getElementById('l1_alamat_provinsi');
  if (!sel) return;
  sel.innerHTML = '<option value="">-- Pilih Provinsi --</option>';
  const list = (typeof STATIC_PROVINSI !== 'undefined') ? STATIC_PROVINSI : [];
  list.forEach(d => {
    const o = document.createElement('option');
    o.value = d.kode; o.textContent = d.nama;
    sel.appendChild(o);
  });
  if (typeof syncSearchable === 'function') syncSearchable('l1_alamat_provinsi', 'provinsi keluarga');
}

async function loadKabupatenL(kdprov) {
  const sel = document.getElementById('l1_alamat_kab');
  if (!sel) return;
  sel.innerHTML = '<option value="">Memuat...</option>';
  sel.disabled = true;
  ['l1_alamat_kec', 'l1_alamat_kel'].forEach(id => {
    const s = document.getElementById(id);
    if (s) { s.innerHTML = '<option value="">--</option>'; s.disabled = true; }
  });
  if (typeof syncSearchable === 'function') {
    syncSearchable('l1_alamat_kab', 'kabupaten/kota keluarga');
    syncSearchable('l1_alamat_kec', 'kecamatan keluarga');
    syncSearchable('l1_alamat_kel', 'kelurahan/desa keluarga');
  }
  if (!kdprov) { sel.innerHTML = '<option value="">-- Pilih Kabupaten/Kota --</option>'; return; }
  const staticKabs = (typeof STATIC_KABUPATEN !== 'undefined' && STATIC_KABUPATEN[kdprov]) || null;
  if (staticKabs) {
    sel.innerHTML = '<option value="">-- Pilih Kabupaten/Kota --</option>';
    [...staticKabs].sort((a, b) => a.nama.localeCompare(b.nama)).forEach(k => {
      const o = document.createElement('option');
      o.value = k.kode; o.textContent = k.nama;
      sel.appendChild(o);
    });
    sel.disabled = false;
    if (typeof syncSearchable === 'function') syncSearchable('l1_alamat_kab', 'kabupaten/kota keluarga');
    return;
  }
  try {
    const res = await fetch(`https://esurvey.bps.go.id/lookup/api/v1/collections/668fcfe6-8ef4-4612-968a-d1330c03fe17/filter?version=1&filter=kdprov||eq||${kdprov}`,
      { headers: { 'Accept': 'application/json' } });
    const d = await res.json();
    sel.innerHTML = '<option value="">-- Pilih --</option>';
    (d.data || []).sort((a, b) => a.namakab.localeCompare(b.namakab)).forEach(k => {
      const o = document.createElement('option');
      o.value = k.kdprovkab; o.textContent = k.namakab;
      sel.appendChild(o);
    });
    sel.disabled = false;
    if (typeof syncSearchable === 'function') syncSearchable('l1_alamat_kab', 'kabupaten/kota keluarga');
  } catch (e) {
    sel.innerHTML = '<option value="">-- Gagal memuat --</option>';
    sel.disabled = false;
  }
}

function loadKecamatanL(kdprovkab) {
  const sel = document.getElementById('l1_alamat_kec');
  if (!sel) return;
  sel.innerHTML = '<option value="">-- Pilih Kecamatan --</option>';
  const child = document.getElementById('l1_alamat_kel');
  if (child) { child.innerHTML = '<option value="">--</option>'; child.disabled = true; }
  if (typeof syncSearchable === 'function') syncSearchable('l1_alamat_kel', 'kelurahan/desa keluarga');
  if (!kdprovkab) { sel.disabled = true; if (typeof syncSearchable === 'function') syncSearchable('l1_alamat_kec', 'kecamatan keluarga'); return; }
  const stk = (typeof STATIC_KECAMATAN !== 'undefined' && STATIC_KECAMATAN[kdprovkab]) || [];
  stk.forEach(k => {
    const o = document.createElement('option');
    o.value = k.kode; o.textContent = k.nama;
    sel.appendChild(o);
  });
  sel.disabled = false;
  if (typeof syncSearchable === 'function') syncSearchable('l1_alamat_kec', 'kecamatan keluarga');
}

function loadKelurahanL(kdprovkabkec) {
  const sel = document.getElementById('l1_alamat_kel');
  if (!sel) return;
  sel.innerHTML = '<option value="">-- Pilih Kelurahan/Desa --</option>';
  if (!kdprovkabkec) { sel.disabled = true; if (typeof syncSearchable === 'function') syncSearchable('l1_alamat_kel', 'kelurahan/desa keluarga'); return; }
  const stk = (typeof STATIC_KELURAHAN !== 'undefined' && STATIC_KELURAHAN[kdprovkabkec]) || [];
  stk.forEach(k => {
    const o = document.createElement('option');
    o.value = k.kode; o.textContent = k.nama;
    sel.appendChild(o);
  });
  sel.disabled = false;
  if (typeof syncSearchable === 'function') syncSearchable('l1_alamat_kel', 'kelurahan/desa keluarga');
}

/* --- Per-anggota DN kab/kota regional loader --- */
async function handleDnProvinsiAnggota(i) {
  const prov = document.getElementById('l_ang_' + i + '_dn_provinsi')?.value;
  const sel  = document.getElementById('l_ang_' + i + '_dn_kab');
  if (!sel) return;
  if (!prov) {
    sel.innerHTML = '<option value="">-- Pilih Provinsi dulu --</option>';
    sel.disabled = true;
    return;
  }
  sel.innerHTML = '<option value="">Memuat...</option>';
  sel.disabled = true;
  const staticKabs = (typeof STATIC_KABUPATEN !== 'undefined' && STATIC_KABUPATEN[prov]) || null;
  if (staticKabs) {
    sel.innerHTML = '<option value="">-- Pilih Kabupaten/Kota --</option>';
    [...staticKabs].sort((a, b) => a.nama.localeCompare(b.nama)).forEach(k => {
      const o = document.createElement('option');
      o.value = k.kode; o.textContent = k.nama;
      sel.appendChild(o);
    });
    sel.disabled = false;
    return;
  }
  try {
    const res = await fetch(`https://esurvey.bps.go.id/lookup/api/v1/collections/668fcfe6-8ef4-4612-968a-d1330c03fe17/filter?version=1&filter=kdprov||eq||${prov}`,
      { headers: { 'Accept': 'application/json' } });
    const d = await res.json();
    sel.innerHTML = '<option value="">-- Pilih --</option>';
    (d.data || []).sort((a, b) => a.namakab.localeCompare(b.namakab)).forEach(k => {
      const o = document.createElement('option');
      o.value = k.kdprovkab; o.textContent = k.namakab;
      sel.appendChild(o);
    });
    sel.disabled = false;
  } catch (_) {
    sel.innerHTML = '<option value="">-- Gagal memuat --</option>';
    sel.disabled = false;
  }
}

/* --- L2 conditional handlers --- */
function handleKawasanL() {
  const v = getRadio('l2_kawasan');
  const wrap = document.getElementById('l2_nama_kawasan_wrap');
  if (wrap) wrap.classList.toggle('hidden', !v || v === '10');
}

function handleJenisUsahaL() {
  const v = getRadio('l2_jenis_usaha');
  const wrap = document.getElementById('l2_lokasi_utama_wrap');
  // Show lokasi utama wrap if v in {3,4,5,6}
  if (wrap) wrap.classList.toggle('hidden', !['3', '4', '5', '6'].includes(v));
}

function handleNIBL() {
  const v = getRadio('l2_punya_nib');
  document.getElementById('l2_nib_wrap').classList.toggle('hidden', v !== '1');
  document.getElementById('l2_nib_alasan_wrap').classList.toggle('hidden', v !== '2');
}

function handleNIBAlasanL() {
  const v = getRadio('l2_nib_alasan');
  document.getElementById('l2_nib_alasan_lain_wrap').classList.toggle('hidden', v !== '5');
}

function handleBadanUsahaL() {
  const v = getRadio('l2_badan_usaha');
  document.getElementById('l2_koperasi_wrap').classList.toggle('hidden', v !== '3');
}

function handleKegiatanL() {
  const b1 = getRadio('l2_b1');
  const b2 = getRadio('l2_b2');
  const show3 = b1 === '2' && b2 === '2';
  document.getElementById('l2_b3_wrap').classList.toggle('hidden', !show3);
  if (!show3) document.querySelectorAll('input[name="l2_b3"]').forEach(r => r.checked = false);
  const b3 = show3 ? getRadio('l2_b3') : '';
  const show4 = show3 && b3 === '2';
  document.getElementById('l2_b4_wrap').classList.toggle('hidden', !show4);
  if (!show4) document.querySelectorAll('input[name="l2_b4"]').forEach(r => r.checked = false);
  // c shown when food/retail path: b2=Ya OR b3=Ya
  const showC = b2 === '1' || (show3 && b3 === '1');
  document.getElementById('l2_c_wrap').classList.toggle('hidden', !showC);
  // d/e shown when manufacturing: b1=Ya AND b2=Tidak
  const showDE = b1 === '1' && b2 === '2';
  document.getElementById('l2_de_wrap').classList.toggle('hidden', !showDE);
}

function handleJaringanL() {
  const v = getRadio('l2_jaringan');
  document.getElementById('l2_jml_cabang_wrap').classList.toggle('hidden', v !== '2');
  document.getElementById('l2_kp_wrap').classList.toggle('hidden', !['3', '4', '5', '6'].includes(v));
  const notice = document.getElementById('l2_unit_pembantu_notice');
  if (notice) notice.classList.toggle('hidden', v !== '6');
  // Kode 6 = Unit Pembantu/Penunjang → pendataan selesai: hide all sections after L2.14
  const isSelesai = (v === '6');
  document.body.classList.toggle('l2-pendataan-selesai', isSelesai);
  // Hide every section-card in #blokL2 whose header is sec-L2-16 onwards
  const blok = document.getElementById('blokL2');
  if (blok) {
    blok.querySelectorAll('.section-card').forEach(card => {
      const hdr = card.querySelector('.section-header');
      if (!hdr || !hdr.id) return;
      const m = hdr.id.match(/^sec-L2-(\d+)/);
      if (m && parseInt(m[1], 10) >= 16) {
        card.classList.toggle('pendataan-selesai-hide', isSelesai);
      }
    });
  }
}

function handleInternetL() {
  const v = getRadio('l2_internet');
  document.getElementById('l2_internet_b_wrap').classList.toggle('hidden', v !== '1');
}

function handleHalalL() {
  const v = getRadio('l2_halal');
  document.getElementById('l2_halal_b_wrap').classList.toggle('hidden', v !== '1');
}

function handleBPOML() {
  const v = getRadio('l2_bpom');
  document.getElementById('l2_bpom_b_wrap').classList.toggle('hidden', v !== '1');
}

function handleTahunOperasiL() {
  const v = parseInt(document.getElementById('l2_tahun_operasi').value) || 0;
  const isBefore2026 = v && v < 2026;
  const isIn2026     = v && v >= 2026;
  document.getElementById('l2_tahunan_wrap').classList.toggle('hidden', !isBefore2026);
  document.getElementById('l2_bulanan_wrap').classList.toggle('hidden', !isIn2026);
}

/* --- L2 calculations --- */
function calcPekerjaL() {
  const l = parseInt(document.getElementById('l2_pekerja_l').value) || 0;
  const p = parseInt(document.getElementById('l2_pekerja_p').value) || 0;
  const d = parseInt(document.getElementById('l2_pekerja_dibayar').value) || 0;
  const t = parseInt(document.getElementById('l2_pekerja_tidak_dibayar').value) || 0;
  document.getElementById('l2_pekerja_total').value  = l + p;
  document.getElementById('l2_pekerja_total2').value = d + t;
}

function calcL2Pengeluaran() {
  const ids = ['l2_y26a','l2_y26b','l2_y26c','l2_y26d','l2_y26e'];
  const total = ids.map(id => parseCurrency(document.getElementById(id).value)).reduce((a,b)=>a+b, 0);
  setCurrencyReadonly('l2_y26f', total);
}

function calcL2Pendapatan() {
  const total = ['l2_y27a','l2_y27b'].map(id => parseCurrency(document.getElementById(id).value)).reduce((a,b)=>a+b, 0);
  setCurrencyReadonly('l2_y27c', total);
}

function calcL2Aset() {
  const total = ['l2_y28a','l2_y28b'].map(id => parseCurrency(document.getElementById(id).value)).reduce((a,b)=>a+b, 0);
  setCurrencyReadonly('l2_y28c', total);
}

function calcL2Modal() {
  const ids = ['l2_y29a','l2_y29b','l2_y29c','l2_y29d','l2_y29e','l2_y29f'];
  const total = ids.map(id => parseFloat(document.getElementById(id).value) || 0).reduce((a,b)=>a+b, 0);
  const rounded = Math.round(total * 100) / 100;
  document.getElementById('l2_y29g').value = rounded;
  const ind = document.getElementById('l2_y29_indicator');
  if (ind) {
    if (Math.abs(rounded - 100) < 0.01) { ind.textContent = '% ✓ Total = 100%'; ind.style.color = '#38a169'; }
    else { ind.textContent = '% (harus = 100%)'; ind.style.color = '#e53e3e'; }
  }
}

function calcL2Bulanan() {
  // 30. Pengeluaran
  const tp = ['l2_m30a','l2_m30b','l2_m30c','l2_m30d','l2_m30e']
    .map(id => parseCurrency(document.getElementById(id).value)).reduce((a,b)=>a+b, 0);
  setCurrencyReadonly('l2_m30f', tp);
  // 31. Pendapatan
  const tr = ['l2_m31a','l2_m31b'].map(id => parseCurrency(document.getElementById(id).value)).reduce((a,b)=>a+b, 0);
  setCurrencyReadonly('l2_m31c', tr);
  // 32. Aset
  const ta = ['l2_m32a','l2_m32b'].map(id => parseCurrency(document.getElementById(id).value)).reduce((a,b)=>a+b, 0);
  setCurrencyReadonly('l2_m32c', ta);
}

function calcL2Modal33() {
  const ids = ['l2_m33a','l2_m33b','l2_m33c','l2_m33d','l2_m33e','l2_m33f'];
  const total = ids.map(id => parseFloat(document.getElementById(id).value) || 0).reduce((a,b)=>a+b, 0);
  const rounded = Math.round(total * 100) / 100;
  document.getElementById('l2_m33g').value = rounded;
  const ind = document.getElementById('l2_m33_indicator');
  if (ind) {
    if (Math.abs(rounded - 100) < 0.01) { ind.textContent = '% ✓ Total = 100%'; ind.style.color = '#38a169'; }
    else { ind.textContent = '% (harus = 100%)'; ind.style.color = '#e53e3e'; }
  }
}

/* --- L3 handlers --- */
function handleJenisBangunanL() {
  const v = getRadio('l3_jenis_bangunan');
  document.getElementById('l3_lantai_apt_wrap').classList.toggle('hidden', !(v === '3' || v === '4'));
  document.getElementById('l3_bangunan_lain_wrap').classList.toggle('hidden', v !== '5');
  const jmlSec = document.getElementById('l3_jml_keluarga_section');
  if (jmlSec) jmlSec.classList.toggle('hidden', v === '5');
}

function handleJmlKeluargaL() {
  const v = parseInt(document.getElementById('l3_jml_keluarga').value) || 1;
  const wrap = document.getElementById('l3_kk_lain_wrap');
  if (!wrap) return;
  if (v <= 1) { wrap.innerHTML = ''; return; }
  let html = '';
  for (let j = 2; j <= v; j++) {
    html += `<div class="form-group" style="margin-top:8px">
      <label class="field-label">b. Nomor KK Keluarga #${j}</label>
      <input type="text" id="l3_kk_lain_${j}" maxlength="16" placeholder="16 digit Nomor KK"/>
    </div>`;
  }
  wrap.innerHTML = html;
}

function handleMeteranJmlL() {
  const n = Math.min(Math.max(parseInt(document.getElementById('l3_meteran_jml')?.value) || 0, 1), 2);
  const wrap = document.getElementById('l3_meteran_detail_wrap');
  if (!wrap) return;
  const dayaOpts = `<option value="">-- Pilih --</option>
    <option value="450">450</option><option value="900">900</option>
    <option value="1300">1.300</option><option value="2200">2.200</option>
    <option value=">2200">&gt;2.200</option>`;
  let html = '';
  for (let j = 1; j <= n; j++) {
    html += `<div class="inline-fields" style="margin-top:8px">
      <div class="form-group">
        <label class="field-label">b. Daya meteran ${j} (W)</label>
        <select id="l3_meteran_daya${j}">${dayaOpts}</select>
      </div>
      <div class="form-group">
        <label class="field-label">c. ID Pelanggan PLN ${j}</label>
        <input type="text" id="l3_meteran_id${j}" placeholder="ID/Nomor"/>
      </div>
    </div>`;
  }
  wrap.innerHTML = html;
  if (typeof updateProgress === 'function') updateProgress();
}

function handleStatusMilikL() {
  const v = getRadio('l3_status_milik');
  document.getElementById('l3_bukti_wrap').classList.toggle('hidden', v !== '1');
  document.getElementById('l3_status_lain_wrap').classList.toggle('hidden', v !== '5');
  const lbl = document.getElementById('l3_sewa_label');
  if (lbl) {
    const lblMap = {
      '1': '4. Perkiraan sewa sebulan jika disewakan (Rp)',
      '2': '4. Sewa sebulan yang dibayar (Rp)',
      '3': '4. Perkiraan sewa sebulan jika disewakan (Rp)',
      '4': '4. Perkiraan sewa sebulan (Rp)',
      '5': '4. Perkiraan sewa sebulan (Rp)',
    };
    lbl.textContent = lblMap[v] || '4. Perkiraan sewa sebulan (Rp)';
  }
}

function handleBABL() {
  const v = getRadio('l3_bab');
  // kloset only if v ∈ {1,2,3}
  document.getElementById('l3_kloset_wrap').classList.toggle('hidden', !['1','2','3'].includes(v));
  // tinja hidden when no toilet facility (4=MCK umum, 5=ada tapi tidak dipakai, 6=tidak ada)
  const tinjaWrap = document.getElementById('l3_tinja_wrap');
  if (tinjaWrap) tinjaWrap.classList.toggle('hidden', ['4','5','6'].includes(v));
}

function handleLantaiBahanL() {
  const v = document.getElementById('l3_lantai_bahan')?.value;
  const w = document.getElementById('l3_lantai_kondisi_wrap');
  if (w) w.classList.toggle('hidden', ['7','8','9'].includes(v));
}

function handleDindingBahanL() {
  const v = document.getElementById('l3_dinding_bahan')?.value;
  const w = document.getElementById('l3_dinding_kondisi_wrap');
  if (w) w.classList.toggle('hidden', ['6','7'].includes(v));
}

function handleAtapBahanL() {
  const v = document.getElementById('l3_atap_bahan')?.value;
  const w = document.getElementById('l3_atap_kondisi_wrap');
  if (w) w.classList.toggle('hidden', ['5','7','8'].includes(v));
}

function handleListrikL() {
  const v = getRadio('l3_listrik');
  document.getElementById('l3_meteran_wrap').classList.toggle('hidden', v !== '1');
}

function handleAsetMotorL() {
  const v = parseInt(document.getElementById('l3_aset_motor').value) || 0;
  document.getElementById('l3_motor_nilai_wrap').classList.toggle('hidden', v <= 0);
}

function handleAsetMobilL() {
  const v = parseInt(document.getElementById('l3_aset_mobil').value) || 0;
  document.getElementById('l3_mobil_nilai_wrap').classList.toggle('hidden', v <= 0);
}

function handleAsetTanahL() {
  const v = parseInt(document.getElementById('l3_aset_tanah').value) || 0;
  document.getElementById('l3_tanah_nilai_wrap').classList.toggle('hidden', v <= 0);
}

function handleAsetRumahL() {
  const v = parseInt(document.getElementById('l3_aset_rumah').value) || 0;
  document.getElementById('l3_rumah_nilai_wrap').classList.toggle('hidden', v <= 0);
}

/* --- L5 signature (separate canvas from L.UB) --- */
let l5Canvas, l5Ctx, l5Drawing = false, l5HasSig = false;

function initL5Signature() {
  l5Canvas = document.getElementById('l5_sigCanvas');
  if (!l5Canvas) return;
  l5Ctx = l5Canvas.getContext('2d');
  const getPosL5 = (e) => {
    const r = l5Canvas.getBoundingClientRect();
    const scaleX = l5Canvas.width / r.width;
    const scaleY = l5Canvas.height / r.height;
    if (e.touches) return {x:(e.touches[0].clientX - r.left)*scaleX, y:(e.touches[0].clientY - r.top)*scaleY};
    return {x:(e.clientX - r.left)*scaleX, y:(e.clientY - r.top)*scaleY};
  };
  l5Canvas.addEventListener('mousedown', e => { l5Drawing = true; const p=getPosL5(e); l5Ctx.beginPath(); l5Ctx.moveTo(p.x,p.y); });
  l5Canvas.addEventListener('mousemove', e => { if(!l5Drawing) return; const p=getPosL5(e); l5Ctx.lineTo(p.x,p.y); l5Ctx.strokeStyle='#000'; l5Ctx.lineWidth=2; l5Ctx.lineCap='round'; l5Ctx.stroke(); l5HasSig=true; });
  l5Canvas.addEventListener('mouseup',    () => { l5Drawing=false; l5Ctx.beginPath(); if (typeof updateProgress==='function') updateProgress(); _saveL5Sig(); });
  l5Canvas.addEventListener('mouseleave', () => { l5Drawing=false; l5Ctx.beginPath(); });
  l5Canvas.addEventListener('touchstart', e => { e.preventDefault(); l5Drawing=true; const p=getPosL5(e); l5Ctx.beginPath(); l5Ctx.moveTo(p.x,p.y); }, {passive:false});
  l5Canvas.addEventListener('touchmove',  e => { e.preventDefault(); if(!l5Drawing) return; const p=getPosL5(e); l5Ctx.lineTo(p.x,p.y); l5Ctx.strokeStyle='#000'; l5Ctx.lineWidth=2; l5Ctx.lineCap='round'; l5Ctx.stroke(); l5HasSig=true; }, {passive:false});
  l5Canvas.addEventListener('touchend',   () => { l5Drawing=false; l5Ctx.beginPath(); if (typeof updateProgress==='function') updateProgress(); _saveL5Sig(); });
}

/* Simpan tanda tangan L ke localStorage segera setelah setiap stroke selesai.
 * Ini memastikan _sig_l selalu sinkron di LS_KEY (autosave) maupun di named draft (_raw),
 * sehingga draft continue dari daftar.html pun mendapatkan tanda tangan terbaru. */
function _saveL5Sig() {
  if (!l5HasSig || !l5Canvas) return;
  try {
    const sig = l5Canvas.toDataURL('image/png');
    const lsKey     = typeof LS_KEY    !== 'undefined' ? LS_KEY    : 'cawi_se2026_draft_v1';
    const lsDrafts  = typeof LS_DRAFTS !== 'undefined' ? LS_DRAFTS : 'cawi_se2026_drafts_v1';
    // 1. Update autosave entry (LS_KEY)
    const raw = JSON.parse(localStorage.getItem(lsKey) || '{}');
    raw['_sig_l'] = sig;
    localStorage.setItem(lsKey, JSON.stringify(raw));
    // 2. Update named draft entry (_raw._sig_l) agar continueDraft() ikut terbaru
    const cid = typeof _currentDraftId !== 'undefined' ? _currentDraftId : null;
    if (cid) {
      const list = JSON.parse(localStorage.getItem(lsDrafts) || '[]');
      const idx = list.findIndex(function(d) { return d._draftId === cid; });
      if (idx >= 0 && list[idx]._raw) {
        list[idx]._raw['_sig_l'] = sig;
        localStorage.setItem(lsDrafts, JSON.stringify(list));
      }
    }
  } catch(e) {}
}

function clearSignatureL() {
  if (!l5Canvas || !l5Ctx) return;
  l5Ctx.clearRect(0, 0, l5Canvas.width, l5Canvas.height);
  l5HasSig = false;
  if (typeof updateProgress === 'function') updateProgress();
}

/* --- L mode KBLI search (separate from L.UB) --- */
function filterKBLIL() {
  const inp = document.getElementById('l2_kbli_search');
  if (!inp || typeof kbliData === 'undefined' || !kbliData.length) return;
  const q = inp.value.toLowerCase().trim();
  const drop = document.getElementById('kbliLDrop');
  if (!drop) return;
  if (!q || q.length < 2) { drop.style.display = 'none'; return; }
  const tokens = q.split(/\s+/).filter(Boolean);
  const scored = kbliData.map(d => {
    const text = ((d.kode || '') + ' ' + (d.judul || '') + ' ' + (d.uraian || '')).toLowerCase();
    let s = 0;
    tokens.forEach(t => { if (text.includes(t)) s++; });
    return { d, s };
  }).filter(x => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 12);
  if (!scored.length) { drop.innerHTML = '<div class="ac-item" style="color:#aaa">Tidak ada hasil</div>'; drop.style.display = 'block'; return; }
  drop.innerHTML = scored.map(({d}) =>
    `<div class="ac-item" onmousedown="selectKBLIL(${JSON.stringify(d).replace(/"/g,'&quot;')})">
      <div><strong>${d.kode}</strong> — ${d.judul}</div>
      <div class="ac-sub">${(d.uraian || '').slice(0,120)}</div>
    </div>`).join('');
  drop.style.display = 'block';
}

function hideKBLILDrop() {
  setTimeout(() => {
    const drop = document.getElementById('kbliLDrop');
    if (drop) drop.style.display = 'none';
  }, 200);
}

function selectKBLIL(entry) {
  const kodeEl = document.getElementById('l2_kbli_kode');
  const katEl  = document.getElementById('l2_kbli_kategori');
  const katDis = document.getElementById('l2_kbli_kategori_display');
  const inp    = document.getElementById('l2_kbli_search');
  const chip   = document.getElementById('l2_kbli_chip');
  const chipT  = document.getElementById('l2_kbli_chip_text');
  const chipU  = document.getElementById('l2_kbli_chip_uraian');
  if (kodeEl) kodeEl.value = entry.kode;
  if (katEl)  katEl.value  = (typeof getKategoriFromKode === 'function') ? getKategoriFromKode(entry.kode) : '';
  if (katDis) katDis.value = (typeof getKategoriName === 'function' && katEl) ? getKategoriName(katEl.value) : (katEl ? katEl.value : '');
  if (inp)    inp.value    = entry.kode + ' — ' + entry.judul;
  if (chip)   chip.style.display = 'flex';
  if (chipT)  chipT.textContent = entry.kode + ' — ' + entry.judul;
  if (chipU)  chipU.textContent = entry.uraian || '';
  const drop = document.getElementById('kbliLDrop');
  if (drop) drop.style.display = 'none';
  // Show hotel wrap if KBLI starts with akomodasi prefix (551)
  const wrap = document.getElementById('l2_hotel_wrap');
  if (wrap) wrap.classList.toggle('hidden', !(entry.kode || '').startsWith('551'));
  if (window.kbliFilters) window.kbliFilters.apply(entry.kode);
}

function clearKBLIL() {
  ['l2_kbli_kode','l2_kbli_kategori','l2_kbli_kategori_display','l2_kbli_search'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const chip = document.getElementById('l2_kbli_chip');
  if (chip) chip.style.display = 'none';
  const wrap = document.getElementById('l2_hotel_wrap');
  if (wrap) wrap.classList.add('hidden');
  if (window.kbliFilters) window.kbliFilters.apply('');
}

/* ====== L MODE EDIT MODE LOADER ====== */
/*
 * loadEditModeL(r) — populate L mode form from a submitted record `r`.
 * Returns true on success.
 */
function loadEditModeL(r) {
  try {
    const setVal = (id, v) => {
      if (v == null || v === '') return;
      const el = document.getElementById(id);
      if (!el) return;
      el.value = v;
      el.dispatchEvent(new Event('input',  {bubbles:true}));
      el.dispatchEvent(new Event('change', {bubbles:true}));
    };
    const setRadio = (name, v) => {
      if (v == null || v === '') return;
      const radio = document.querySelector(`input[name="${name}"][value="${v}"]`);
      if (radio) { radio.checked = true; radio.dispatchEvent(new Event('change', {bubbles:true})); }
    };
    const setCurrency = (id, v) => {
      if (v == null || v === '' || v === 0) return;
      const el = document.getElementById(id);
      if (!el) return;
      el.value = Number(v).toLocaleString('id-ID');
      el.dispatchEvent(new Event('input', {bubbles:true}));
    };

    // === BLOK I ===
    setVal('l1_nama_kk', r.nama_kk);
    setVal('l1_nik_kk', r.nik_kk);
    setVal('l1_no_kk', r.no_kk);
    setVal('l1_jml_kk_anggota', r.jml_anggota);
    // Alamat KK: cascade provinsi → kab → kec → kel dengan update display text
    // setVal tidak digunakan agar onchange tidak memicu double-load;
    // setiap level di-set langsung lalu display input (_inp) diperbarui manual.
    (function() {
      const _setDirect = (id, val) => {
        const el = document.getElementById(id);
        if (el && val != null && val !== '') el.value = val;
      };
      const _syncDisp = (id) => {
        const sel = document.getElementById(id);
        const inp = document.getElementById(id + '_inp');
        if (!sel || !inp) return;
        const opt = sel.options[sel.selectedIndex];
        if (opt && opt.value && opt.text) { inp.value = opt.text; inp.classList.add('has-value'); }
      };
      if (!r.provinsi_kd) return;
      _setDirect('l1_alamat_provinsi', r.provinsi_kd);
      _syncDisp('l1_alamat_provinsi');
      // loadKabupatenL bisa async (API) atau sync (static data) — gunakan Promise.resolve()
      Promise.resolve(typeof loadKabupatenL === 'function' ? loadKabupatenL(r.provinsi_kd) : null)
        .then(() => {
          _setDirect('l1_alamat_kab', r.kabupaten_kd);
          _syncDisp('l1_alamat_kab');
          if (r.kabupaten_kd && typeof loadKecamatanL === 'function') {
            loadKecamatanL(r.kabupaten_kd); // sinkron (STATIC_KECAMATAN)
            _setDirect('l1_alamat_kec', r.kecamatan_kd);
            _syncDisp('l1_alamat_kec');
            if (r.kecamatan_kd && typeof loadKelurahanL === 'function') {
              loadKelurahanL(r.kecamatan_kd); // sinkron (STATIC_KELURAHAN)
              _setDirect('l1_alamat_kel', r.kelurahan_kd);
              _syncDisp('l1_alamat_kel');
            }
          }
        });
    })();
    setRadio('l1_klasifikasi', r.klasifikasi);
    setVal('l1_kodepos', r.kode_pos);
    setVal('l1_kode_sls', r.kode_sls);
    setVal('l1_nama_sls', r.nama_sls);
    setVal('l1_alamat_detail', r.alamat_detail);
    setVal('l1_nama_jalan', r.nama_jalan);
    setVal('l1_no_rumah', r.no_rumah);
    setRadio('l1_sesuai_kk', r.sesuai_kk);

    // Render anggota cards then populate
    if (typeof renderAnggotaCards === 'function') renderAnggotaCards();
    setTimeout(() => {
      try {
        const anggota = r.anggota_data ? JSON.parse(r.anggota_data) : [];
        anggota.forEach(a => {
          const i = a.no;
          setVal('l_ang_' + i + '_nama', a.nama);
          setVal('l_ang_' + i + '_nik', a.nik);
          setVal('l_ang_' + i + '_hubungan', a.hubungan);
          setRadio('l_ang_' + i + '_keberadaan', a.keberadaan);
          if (a.stop_state === 1 || a.stop_state === '1') return;
          setRadio('l_ang_' + i + '_alamat_dom', a.alamat_dom);
          setVal('l_ang_' + i + '_dn_provinsi', a.dn_provinsi);
          setVal('l_ang_' + i + '_dn_kab', a.dn_kab);
          setVal('l_ang_' + i + '_ln_negara', a.ln_negara);
          setRadio('l_ang_' + i + '_kawin', a.kawin);
          setRadio('l_ang_' + i + '_jk', a.jk);
          setVal('l_ang_' + i + '_tgl_lahir', a.tgl_lahir);
          if (typeof computeUmurAnggota === 'function') computeUmurAnggota(i);
          setRadio('l_ang_' + i + '_sekolah', a.sekolah);
          setRadio('l_ang_' + i + '_ijazah', a.ijazah);   // radio, bukan setVal
          setRadio('l_ang_' + i + '_rekening', a.rekening);
          setVal('l_ang_' + i + '_profesi', a.profesi);
          setRadio('l_ang_' + i + '_kedudukan', a.kedudukan); // radio, bukan setVal
          setRadio('l_ang_' + i + '_18a', a.pend_18a);
          setCurrency('l_ang_' + i + '_18a_nilai', a.pend_18a_nilai);
          setRadio('l_ang_' + i + '_18b', a.pend_18b);
          setCurrency('l_ang_' + i + '_18b_nilai', a.pend_18b_nilai);
          setRadio('l_ang_' + i + '_18c', a.pend_18c);
          setCurrency('l_ang_' + i + '_18c_nilai', a.pend_18c_nilai);
          if (a.disab) {
            const parts = String(a.disab).split('|');
            ['a','b','c','d','e','f'].forEach((s, idx) => setRadio('l_ang_' + i + '_disab_' + s, parts[idx]));
          }
          if (a.kronis) {
            const parts = String(a.kronis).split('|');
            ['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p'].forEach((s, idx) =>
              setRadio('l_ang_' + i + '_kronis_' + s, parts[idx]));
          }
          setVal('l_ang_' + i + '_kronis_q_lain', a.kronis_lain);
          // Sync searchable select display texts (profesi, hubungan, dn_provinsi, dll)
          // setelah setVal, _inp text wajib disync manual karena makeSearchable tidak auto-update
          ['hubungan', 'profesi', 'dn_provinsi'].forEach(field => {
            const sel = document.getElementById('l_ang_' + i + '_' + field);
            if (!sel || !sel.value) return;
            const inp = document.getElementById('l_ang_' + i + '_' + field + '_inp');
            if (!inp) return;
            const opt = Array.from(sel.options).find(o => o.value === sel.value);
            if (opt) { inp.value = opt.text; inp.classList.add('has-value'); }
          });
        });
      } catch(_e) { console.warn('Gagal parse anggota_data:', _e); }
      if (typeof updateProgress === 'function') updateProgress();
    }, 300);

    // === BLOK II ===
    setVal('l2_nama_usaha', r.nama_usaha);
    setVal('l2_nama_komersial', r.nama_komersial);
    setVal('l2_alamat', r.alamat_usaha);
    setVal('l2_rt', r.rt); setVal('l2_rw', r.rw);
    setVal('l2_kodepos', r.kodepos_usaha);
    setVal('l2_email', r.email_usaha);
    setVal('l2_website', r.website_usaha);
    setVal('l2_hp', r.hp_usaha);
    setRadio('l2_kawasan', r.kawasan);
    setVal('l2_nama_kawasan', r.nama_kawasan);
    setRadio('l2_jenis_usaha', r.jenis_usaha);
    setVal('l2_lokasi_alamat', r.lokasi_alamat);
    setVal('l2_lokasi_provinsi', r.lokasi_provinsi);
    setVal('l2_lokasi_kab', r.lokasi_kab);
    setRadio('l2_punya_nib', r.punya_nib);
    setVal('l2_nib', r.nib);
    setRadio('l2_nib_alasan', r.nib_alasan);
    setVal('l2_nib_alasan_lain', r.nib_alasan_lain);
    setRadio('l2_badan_usaha', r.badan_usaha);
    setVal('l2_pengusaha_nama', r.pengusaha_nama);
    setRadio('l2_pengusaha_jk', r.pengusaha_jk);
    setVal('l2_pengusaha_umur', r.pengusaha_umur);
    setVal('l2_pengusaha_nik', r.pengusaha_nik);
    setVal('l2_kegiatan_utama', r.kegiatan_utama);
    setRadio('l2_b1', r.b1); setRadio('l2_b2', r.b2);
    setRadio('l2_b3', r.b3); setRadio('l2_b4', r.b4);
    setRadio('l2_c', r.c);
    setVal('l2_input', r.input_bahan);
    setVal('l2_proses', r.proses_produksi);
    setVal('l2_produk_utama', r.produk_utama);
    setVal('l2_kbli_kode', r.kbli_kode);
    setVal('l2_kbli_search', r.kbli_judul);
    setVal('l2_kbli_kategori', r.kbli_kategori);
    // KBLI chip — defer until kbliData resolves (preloadKBLI adalah singleton)
    if (r.kbli_kode) {
      // Terapkan filter KBLI segera (aman meski CSV belum selesai)
      if (window.kbliFilters) {
        window.kbliFilters.apply(r.kbli_kode);
        window.kbliFilters.load().then(() => window.kbliFilters.apply(r.kbli_kode));
      }
      if (typeof preloadKBLI === 'function') {
        preloadKBLI().then(() => {
          const entry = kbliData.find(d => d.kode === r.kbli_kode);
          if (entry && typeof selectKBLIL === 'function') selectKBLIL(entry);
        });
      }
    }
    setRadio('l2_hotel', r.klasifikasi_hotel);
    setRadio('l2_jaringan', r.jaringan);
    setVal('l2_jml_cabang', r.jml_cabang);
    setVal('l2_kp_nama', r.kp_nama);
    setVal('l2_kp_negara', r.kp_negara);
    setVal('l2_kp_alamat', r.kp_alamat);
    setVal('l2_kp_email', r.kp_email);
    setVal('l2_kp_provinsi', r.kp_provinsi);
    setVal('l2_kp_kab', r.kp_kab);
    setRadio('l2_internet', r.internet);
    setRadio('l2_halal', r.halal);
    setVal('l2_halal_b', r.halal_b); setVal('l2_halal_c', r.halal_c);
    setRadio('l2_bpom', r.bpom);
    setVal('l2_bpom_b', r.bpom_b); setVal('l2_bpom_c', r.bpom_c);
    setVal('l2_pekerja_l', r.pekerja_l);
    setVal('l2_pekerja_p', r.pekerja_p);
    setVal('l2_pekerja_dibayar', r.pekerja_dibayar);
    setVal('l2_pekerja_tidak_dibayar', r.pekerja_tidak_dibayar);
    setVal('l2_tahun_operasi', r.tahun_operasi);
    ['a','b','c','d','e','f'].forEach(s => setCurrency('l2_y26' + s, r['y26' + s]));
    ['a','b','c'].forEach(s => setCurrency('l2_y27' + s, r['y27' + s]));
    setVal('l2_y27d', r.y27d);
    ['a','b','c'].forEach(s => setCurrency('l2_y28' + s, r['y28' + s]));
    setVal('l2_y28c1', r.y28c1); setVal('l2_y28d', r.y28d);
    ['a','b','c','d','e','f','g'].forEach(s => setVal('l2_y29' + s, r['y29' + s]));
    ['a','b','c','d','e','f'].forEach(s => setCurrency('l2_m30' + s, r['m30' + s]));
    ['a','b','c'].forEach(s => setCurrency('l2_m31' + s, r['m31' + s]));
    setVal('l2_m31d', r.m31d);
    if (r.m31e) String(r.m31e).split(',').forEach(idx => {
      const cb = document.getElementById('l2_m31e_' + idx); if (cb) cb.checked = true;
    });
    ['a','b','c'].forEach(s => setCurrency('l2_m32' + s, r['m32' + s]));
    setVal('l2_m32c1', r.m32c1); setVal('l2_m32d', r.m32d);
    ['a','b','c','d','e','f','g'].forEach(s => setVal('l2_m33' + s, r['m33' + s]));

    // === BLOK III ===
    setRadio('l3_jenis_bangunan', r.jenis_bangunan);
    setVal('l3_lantai_apt', r.lantai_apt);
    setVal('l3_bangunan_lain', r.bangunan_lain);
    setVal('l3_jml_keluarga', r.jml_keluarga_rumah);
    setVal('l3_kk_lain', r.kk_lain);
    setRadio('l3_status_milik', r.status_milik);
    setRadio('l3_bukti', r.bukti);
    setVal('l3_status_lain', r.status_lain);
    setCurrency('l3_sewa', r.sewa);
    setVal('l3_luas_lantai', r.luas_lantai);
    setVal('l3_lantai_bahan', r.lantai_bahan);   setRadio('l3_lantai_kondisi',  r.lantai_kondisi);
    setVal('l3_dinding_bahan', r.dinding_bahan); setRadio('l3_dinding_kondisi', r.dinding_kondisi);
    setVal('l3_atap_bahan', r.atap_bahan);       setRadio('l3_atap_kondisi',    r.atap_kondisi);
    setRadio('l3_bab', r.bab);
    setRadio('l3_kloset', r.kloset);
    setRadio('l3_tinja', r.tinja);
    setVal('l3_air', r.air);
    setRadio('l3_listrik', r.listrik);
    setVal('l3_meteran_jml', r.meteran_jml);
    setVal('l3_meteran_daya1', r.meteran_daya1); setVal('l3_meteran_daya2', r.meteran_daya2);
    setVal('l3_meteran_id1', r.meteran_id1); setVal('l3_meteran_id2', r.meteran_id2);
    setCurrency('l3_listrik_bln', r.listrik_bln); setCurrency('l3_pulsa_bln', r.pulsa_bln);
    setCurrency('l3_makanan_mgg', r.makanan_mgg);
    setCurrency('l3_nonmakanan_bln', r.nonmakanan_bln);
    setCurrency('l3_nonmakanan_thn', r.nonmakanan_thn);
    ['gas3','gas5','kulkas','ac','emas','komputer','motor','mobil','tanah','rumah'].forEach(k =>
      setVal('l3_aset_' + k, r['aset_' + k]));
    ['motor','mobil','tanah','rumah'].forEach(k => setCurrency('l3_aset_' + k + '_nilai', r['aset_' + k + '_nilai']));

    // === BLOK IV ===
    setVal('l4_catatan', r.catatan_pendata);

    // === BLOK V ===
    setVal('l5_petugas_nama', r.petugas_nama);
    setVal('l5_petugas_nip', r.petugas_nip);
    setVal('l5_petugas_hp', r.petugas_hp);
    setVal('l5_responden_nama', r.responden_nama);
    setVal('l5_responden_hp', r.responden_hp);
    setVal('l5_responden_email', r.responden_email);
    setVal('l5_tanggal', (r.tanggal_pelaksanaan || '').substring(0, 10));
    // Tanda tangan: server menyimpan "[ada]"/("[kosong]") bukan data aktual.
    // Hanya restore jika nilai adalah base64 data URL (misal dari draft lokal).
    const _ttd = r.tanda_tangan || '';
    if (_ttd.startsWith('data:image/') && typeof l5Canvas !== 'undefined' && l5Canvas && typeof l5Ctx !== 'undefined' && l5Ctx) {
      const img = new Image();
      img.onload = () => {
        l5Ctx.clearRect(0, 0, l5Canvas.width, l5Canvas.height);
        l5Ctx.drawImage(img, 0, 0);
        l5HasSig = true;
        if (typeof updateProgress === 'function') updateProgress();
      };
      img.src = _ttd;
      const hintL = document.getElementById('l5_sig_hint');
      if (hintL) hintL.textContent = 'Tanda tangan dimuat dari data sebelumnya.';
    } else {
      // Server menyimpan TTD ke Drive — tidak bisa dipulihkan di sini
      const hintL = document.getElementById('l5_sig_hint');
      if (hintL && _ttd) hintL.textContent = 'Tanda tangan sebelumnya tersimpan di server. Silakan tanda tangan ulang.';
    }
    _editRecordId = r._id || null;
    if (typeof updateProgress === 'function') updateProgress();
    return true;
  } catch(e) { console.error('Gagal load edit mode L:', e); return false; }
}

initL5Signature();
