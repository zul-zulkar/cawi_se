// KBLI: load dari master/kbli.json (dengan uraian lengkap)
let kbliData = [];
async function preloadKBLI() {
  const inp = document.getElementById('q9g_kbli_search');
  if (inp) inp.placeholder = 'Memuat data KBLI 2025…';
  try {
    const res = await fetch('master/kbli.json');
    const json = await res.json();
    kbliData = (json.data || []).map(d => {
      const uraian = d.uraian || '';
      return {
        kode: d.kode, kodeLower: d.kode.toLowerCase(),
        judul: d.judul, judulLower: d.judul.toLowerCase(),
        uraian, uraianLower: uraian.toLowerCase(),
        kategori: getKategoriFromKode(d.kode)
      };
    });
  } catch(e) {
    kbliData = (typeof KBLI_DATA !== 'undefined') ? KBLI_DATA.map(d => ({
      kode: d.Kode, kodeLower: d.Kode.toLowerCase(),
      judul: d.Judul, judulLower: d.Judul.toLowerCase(),
      uraian: '', uraianLower: '',
      kategori: d.Kategori || ''
    })) : [];
  }
  if (inp) inp.placeholder = `🔍 Cari KBLI 2025… (${kbliData.length} kode tersedia)`;
}

function getKategoriFromKode(kode) {
  const n = parseInt((kode || '').substring(0, 2), 10);
  if (n >= 1  && n <= 3)  return 'A';
  if (n >= 5  && n <= 9)  return 'B';
  if (n >= 10 && n <= 33) return 'C';
  if (n === 35)           return 'D';
  if (n >= 36 && n <= 39) return 'E';
  if (n >= 41 && n <= 43) return 'F';
  if (n >= 45 && n <= 47) return 'G';
  if (n >= 49 && n <= 53) return 'H';
  if (n >= 55 && n <= 56) return 'I';
  if (n >= 58 && n <= 63) return 'J';
  if (n >= 64 && n <= 66) return 'K';
  if (n === 68)           return 'L';
  if (n >= 69 && n <= 75) return 'M';
  if (n >= 77 && n <= 82) return 'N';
  if (n === 84)           return 'O';
  if (n === 85)           return 'P';
  if (n >= 86 && n <= 88) return 'Q';
  if (n >= 90 && n <= 93) return 'R';
  if (n >= 94 && n <= 96) return 'S';
  if (n >= 97 && n <= 98) return 'T';
  if (n === 99)           return 'U';
  return '';
}

function wordOverlapScore(text, qWords, baseScore) {
  const m = qWords.filter(w => text.includes(w)).length;
  return m > 0 ? Math.round(baseScore * m / qWords.length) : 0;
}

function scoreKBLI(d, lower, qWords) {
  let score = 0;

  const qNoSpace = lower.replace(/\s/g, '');
  if (d.kodeLower === qNoSpace)              score += 100;
  else if (d.kodeLower.startsWith(qNoSpace)) score += 80;
  else if (d.kodeLower.includes(qNoSpace))   score += 50;

  if (d.judulLower === lower)                score += 90;
  else if (d.judulLower.startsWith(lower))   score += 60;
  else if (d.judulLower.includes(lower))     score += 45;
  else if (qWords.length > 0)               score += wordOverlapScore(d.judulLower, qWords, 35);

  if (d.uraianLower.includes(lower))         score += 20;
  else if (qWords.length > 0)               score += wordOverlapScore(d.uraianLower, qWords, 12);

  return score;
}

let kbliTimer = null;
function searchKBLI(q) {
  clearTimeout(kbliTimer);
  const dd = document.getElementById('kbliDropdown');
  if (!q || q.length < 2) { dd.classList.remove('open'); return; }
  kbliTimer = setTimeout(() => {
    if (!kbliData.length) {
      dd.innerHTML = '<div class="autocomplete-item" style="color:#999">Data KBLI sedang dimuat, coba lagi sebentar…</div>';
      dd.classList.add('open');
      return;
    }
    const lower  = q.toLowerCase().trim();
    const qWords = lower.split(/\s+/).filter(w => w.length >= 2);

    const results = kbliData
      .map(d => ({ d, score: scoreKBLI(d, lower, qWords) }))
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 15)
      .map(x => x.d);

    dd.innerHTML = '';
    if (!results.length) {
      dd.innerHTML = '<div class="autocomplete-item" style="color:#999">Tidak ditemukan — coba kata kunci lain</div>';
    } else {
      results.forEach(d => {
        const item = document.createElement('div');
        item.className = 'autocomplete-item';
        const snippet = d.uraian.length > 110 ? d.uraian.substring(0, 110) + '…' : d.uraian;
        item.innerHTML =
          `<div><span class="kode">${d.kode}</span> <strong style="font-size:12.5px">${d.judul}</strong> <span class="kbli-cat">[${d.kategori}]</span></div>` +
          (snippet ? `<div class="kbli-snippet">${snippet}</div>` : '');
        item.onclick = () => selectKBLI(d);
        dd.appendChild(item);
      });
    }
    dd.classList.add('open');
  }, 150);
}

function selectKBLI(d) {
  document.getElementById('q9g_kbli_search').value = `[${d.kode}] ${d.judul}`;
  document.getElementById('q9g_kbli_kode').value = d.kode;
  document.getElementById('q9g_kbli_kategori').value = d.kategori;
  document.getElementById('q9h_kategori').value = `[${d.kategori}] ${getKategoriName(d.kategori)}`;
  document.getElementById('kbliDropdown').classList.remove('open');
  const chip = document.getElementById('q9g_kbli_chip');
  if (chip) {
    chip.classList.remove('hidden');
    document.getElementById('q9g_kbli_chip_text').textContent = `[${d.kode}] ${d.judul} — Kategori ${d.kategori}: ${getKategoriName(d.kategori)}`;
    const uraianEl = document.getElementById('q9g_kbli_chip_uraian');
    if (uraianEl) {
      uraianEl.textContent = d.uraian;
      uraianEl.classList.toggle('hidden', !d.uraian);
    }
  }
  const isHotel = d.kategori === 'I' || (d.kode && d.kode.startsWith('55'));
  document.getElementById('q9i_hotel_wrap').classList.toggle('hidden', !isHotel);
  updateProgress();
}

function clearKBLI() {
  document.getElementById('q9g_kbli_search').value = '';
  document.getElementById('q9g_kbli_kode').value = '';
  document.getElementById('q9g_kbli_kategori').value = '';
  document.getElementById('q9h_kategori').value = '';
  const chip = document.getElementById('q9g_kbli_chip');
  if (chip) {
    chip.classList.add('hidden');
    const uraianEl = document.getElementById('q9g_kbli_chip_uraian');
    if (uraianEl) { uraianEl.textContent = ''; uraianEl.classList.add('hidden'); }
  }
  document.getElementById('q9i_hotel_wrap').classList.add('hidden');
  document.querySelectorAll('input[name="q9i"]').forEach(r => r.checked = false);
  updateProgress();
}

function getKategoriName(k) {
  const map = {
    'A':'Pertanian, Kehutanan dan Perikanan','B':'Pertambangan dan Penggalian',
    'C':'Industri Pengolahan','D':'Pengadaan Listrik dan Gas',
    'E':'Pengadaan Air; Pengelolaan Sampah, Limbah dan Daur Ulang',
    'F':'Konstruksi','G':'Perdagangan Besar dan Eceran; Reparasi Mobil dan Sepeda Motor',
    'H':'Transportasi dan Pergudangan','I':'Penyediaan Akomodasi dan Makan Minum',
    'J':'Informasi dan Komunikasi','K':'Aktivitas Keuangan dan Asuransi',
    'L':'Real Estat','M':'Aktivitas Profesional, Ilmiah dan Teknis',
    'N':'Aktivitas Penyewaan dan Sewa Guna Usaha Tanpa Hak Opsi, Ketenagakerjaan, Agen Perjalanan dan Penunjang Usaha Lainnya',
    'O':'Administrasi Pemerintahan, Pertahanan dan Jaminan Sosial Wajib',
    'P':'Pendidikan','Q':'Aktivitas Kesehatan Manusia dan Aktivitas Sosial',
    'R':'Kesenian, Hiburan dan Rekreasi','S':'Aktivitas Jasa Lainnya',
    'T':'Aktivitas Rumah Tangga Sebagai Pemberi Kerja',
    'U':'Aktivitas Badan Internasional dan Badan Ekstra Internasional Lainnya'
  };
  return map[k] || k;
}

// Close autocomplete on outside click
document.addEventListener('click', e => {
  if (!e.target.closest('.autocomplete-wrap')) {
    document.getElementById('kbliDropdown').classList.remove('open');
  }
  if (!e.target.closest('.ss-wrap')) {
    document.querySelectorAll('.ss-dropdown.open').forEach(d => d.classList.remove('open'));
  }
});
