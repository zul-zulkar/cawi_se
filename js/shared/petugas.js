// ── Data pegawai untuk autocomplete petugas ──
const DEFAULT_PEGAWAI = [
  {"nama":"Gede Iwan Santika SST, M.M.","nip":"197807072002121002","jabatan":"Kepala BPS Kabupaten Buleleng"},
  {"nama":"I Ketut Ariasa, SE","nip":"197306041994011001","jabatan":"Kepala Subbagian Umum"},
  {"nama":"I Komang Ari Wijaya, SST, M.Agb","nip":"198611152009021002","jabatan":"Statistisi Ahli Madya"},
  {"nama":"Ketut Ksama Putra SST., M.Si.","nip":"199004042013111001","jabatan":"Statistisi Ahli Muda"},
  {"nama":"Alit Mahendra, SST","nip":"199204222014121001","jabatan":"Statistisi Ahli Muda"},
  {"nama":"Nyoman Subaktiyasa, SE","nip":"197106261994011001","jabatan":"Statistisi Ahli Muda"},
  {"nama":"Ni Made Egy Wira Astuti, SST","nip":"199203302014122001","jabatan":"Statistisi Ahli Muda"},
  {"nama":"Ni Made Pratiwi Pendit, S.Si., M.Si","nip":"198609142009022007","jabatan":"Statistisi Ahli Muda"},
  {"nama":"Raden Agus Setiyo Purnawan, SE","nip":"197008251994011001","jabatan":"Statistisi Ahli Muda"},
  {"nama":"I Made Oka Suarjaya, SST, M.SE.","nip":"198809162010121001","jabatan":"Statistisi Ahli Muda"},
  {"nama":"Garinca Firgiana Santoso, S.Tr.Stat.","nip":"199902162022012001","jabatan":"Statistisi Ahli Pertama"},
  {"nama":"I Made Kariasa SST, M.SE.","nip":"199103292014121001","jabatan":"Pranata Komputer Ahli Muda"},
  {"nama":"Rizq Taufiq Bahtiar Razendrya, S.Tr.Stat.","nip":"200104132023021003","jabatan":"Statistisi Ahli Pertama"},
  {"nama":"Kadek Suradnyana Wisnawa, SST","nip":"199405202017011001","jabatan":"Statistisi Ahli Pertama"},
  {"nama":"Amalia Susanti, S.Tr.Stat.","nip":"199901112022012001","jabatan":"Statistisi Ahli Pertama"},
  {"nama":"Ni Luh Putu Yayang Septia Ningsih, S.Tr.Stat.","nip":"199812302022012001","jabatan":"Statistisi Ahli Pertama"},
  {"nama":"Novia Putri Lestari, S.Tr.Stat.","nip":"199811242022012002","jabatan":"Statistisi Ahli Pertama"},
  {"nama":"Kharisma Pandu Utama, S.Tr.Stat.","nip":"200110172023101002","jabatan":"Statistisi Ahli Pertama"},
  {"nama":"Sita Dian Maretna, S.Tr.Stat.","nip":"200003302023022001","jabatan":"Pranata Komputer Ahli Pertama"},
  {"nama":"Erik Rihendri Candra Adifa, S.Tr.Stat.","nip":"199905202023021001","jabatan":"Pranata Komputer Ahli Pertama"},
  {"nama":"Nyoman Pasek Susena, SE","nip":"198612232011011006","jabatan":"Pranata Komputer Ahli Pertama"},
  {"nama":"I Made Resdana","nip":"196807172006041017","jabatan":"Statistisi Mahir"},
  {"nama":"Made Sunika","nip":"197204012007101001","jabatan":"Statistisi Mahir"},
  {"nama":"I Gede Setya Budhi","nip":"197907052006041005","jabatan":"Pranata Keuangan APBN Terampil"},
  {"nama":"I Nyoman Samiada","nip":"196902011989021001","jabatan":"Fungsional Umum"},
  {"nama":"Nyoman Redita","nip":"197009302006041007","jabatan":"Statistisi Mahir"},
  {"nama":"I Putu Wardana Gelgel","nip":"197104072009011004","jabatan":"Fungsional Umum"},
  {"nama":"Fadly Muhamad Akbar, S.Tr.Stat.","nip":"200103202024121004","jabatan":"Fungsional Umum / Statistisi Ahli Pertama"},
  {"nama":"Kasah Aisyah, A.Md.Stat.","nip":"200105212024122001","jabatan":"Fungsional Umum / Statistisi Pelaksana"},
  {"nama":"I Ketut Edi Mudarta","nip":"198307302025211036","jabatan":"PPPK - Operator Layanan Operasional"},
  {"nama":"I Made Wiradana","nip":"198507072025211071","jabatan":"PPPK - Operator Layanan Operasional"},
  {"nama":"Ketut Swadana","nip":"196911272025211007","jabatan":"PPPK - Operator Layanan Operasional"},
  {"nama":"Putri Octaviana","nip":"199510142025212054","jabatan":"PPPK - Operator Layanan Operasional"},
  {"nama":"Ni Nengah Sekar","nip":"198507172025212050","jabatan":"PPPK - Pengelola Umum Operasional"},
  {"nama":"Muhammad Zulkarnain, S.Tr.Stat","nip":"199901152023021001","jabatan":"Pranata Komputer Ahli Pertama"}
];
const PEGAWAI = JSON.parse(localStorage.getItem('cawi_pegawai_override') || 'null') || DEFAULT_PEGAWAI;

function filterPetugas() {
  const q = document.getElementById('p_nama').value.trim().toLowerCase();
  const drop = document.getElementById('petugasDrop');
  if (!q) { drop.style.display = 'none'; return; }
  const matches = PEGAWAI.filter(p => p.nama.toLowerCase().includes(q)).slice(0, 10);
  if (!matches.length) { drop.style.display = 'none'; return; }
  drop.innerHTML = matches.map(p =>
    `<div class="ac-item" onmousedown="selectPetugas(this)" data-nama="${p.nama.replace(/"/g,'&quot;')}" data-nip="${p.nip}">
      <div class="ac-name">${p.nama}</div>
      <div class="ac-sub">${p.jabatan}</div>
    </div>`
  ).join('');
  drop.style.display = 'block';
}

function selectPetugas(el) {
  document.getElementById('p_nama').value = el.dataset.nama;
  document.getElementById('p_nip').value  = el.dataset.nip;
  document.getElementById('petugasDrop').style.display = 'none';
}

function hidePetugasDrop() {
  setTimeout(() => {
    const drop = document.getElementById('petugasDrop');
    if (drop) drop.style.display = 'none';
  }, 150);
}
