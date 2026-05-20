import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT   = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const SOURCE = readFileSync(resolve(ROOT, 'js/form-l/form-l-progress.js'), 'utf8')

function mockEl(value = '', isHidden = false) {
  return { value, classList: { contains: cls => cls === 'hidden' && isHidden } }
}

function makeCalc({ fields = {}, radios = {}, elements = {}, l5HasSig = false } = {}) {
  const noop = () => {}
  const dom  = { ...elements }
  const mockDoc = {
    getElementById:  id => dom[id] ?? null,
    querySelectorAll: () => ({ forEach: noop }),
    addEventListener: noop,
    createElement:   () => ({}),
  }
  const fn = new Function(
    'document', 'window',
    'getVal', 'getRadio',
    'isValidHP', 'isValidEmail',
    'l5HasSig',
    `${SOURCE}\nreturn { calcProgressL };`
  )
  return fn(
    mockDoc, { addEventListener: noop },
    id    => String(fields[id]  ?? ''),
    name  => String(radios[name] ?? ''),
    hp    => /^(\+62|62|0)[0-9]{8,13}$/.test(hp.replace(/[\s-]/g, '')),
    email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
    l5HasSig
  ).calcProgressL
}

const calc = (opts = {}) => makeCalc(opts)()

// ─── BASELINE ───────────────────────────────────────────────────────────────

describe('calcProgressL() — baseline', () => {
  it('returns numeric pct, filled, total', () => {
    const r = calc()
    expect(typeof r.pct).toBe('number')
    expect(typeof r.filled).toBe('number')
    expect(typeof r.total).toBe('number')
  })

  it('empty form has filled=0 and total >= 50 (baseline includes Blok I+II+III+V)', () => {
    const r = calc()
    expect(r.filled).toBe(0)
    expect(r.total).toBeGreaterThanOrEqual(50)
  })

  it('pct equals Math.round(filled / total * 100)', () => {
    const r = calc({ fields: { l1_nama_kk: 'Budi' } })
    expect(r.pct).toBe(Math.round(r.filled / r.total * 100))
  })

  it('pct is between 0 and 100 inclusive', () => {
    const r = calc()
    expect(r.pct).toBeGreaterThanOrEqual(0)
    expect(r.pct).toBeLessThanOrEqual(100)
  })
})

// ─── BLOK I: Keluarga header ─────────────────────────────────────────────────

describe('calcProgressL() — Blok I keluarga header', () => {
  it('nama_kk filled increments filled by 1', () => {
    const base = calc()
    const r = calc({ fields: { l1_nama_kk: 'Budi Santoso' } })
    expect(r.filled).toBe(base.filled + 1)
  })

  it('NIK KK requires 16 digits — 15 not enough', () => {
    const r = calc({ fields: { l1_nik_kk: '123456789012345' } })
    expect(r.filled).toBe(0)
  })

  it('NIK KK 16 digits counts', () => {
    const base = calc()
    const r = calc({ fields: { l1_nik_kk: '1234567890123456' } })
    expect(r.filled).toBe(base.filled + 1)
  })

  it('No KK requires 16 digits', () => {
    const base = calc()
    const r = calc({ fields: { l1_no_kk: '1234567890123456' } })
    expect(r.filled).toBe(base.filled + 1)
  })

  it('jml_kk_anggota >0 & <=30 counts', () => {
    const base = calc()
    const r = calc({ fields: { l1_jml_kk_anggota: '4' } })
    expect(r.filled).toBe(base.filled + 1)
  })

  it('jml_kk_anggota=0 does not count', () => {
    const r = calc({ fields: { l1_jml_kk_anggota: '0' } })
    expect(r.filled).toBe(0)
  })

  it('jml_kk_anggota=31 does not count (capped at 30)', () => {
    const r = calc({ fields: { l1_jml_kk_anggota: '31' } })
    expect(r.filled).toBe(0)
  })

  it('alamat provinsi/kab/kec/kel each count separately', () => {
    const base = calc()
    const r = calc({ fields: {
      l1_alamat_provinsi: '51', l1_alamat_kab: '5108',
      l1_alamat_kec: '510801', l1_alamat_kel: '5108010001',
    }})
    expect(r.filled).toBe(base.filled + 4)
  })

  it('klasifikasi (radio) counts', () => {
    const base = calc()
    const r = calc({ radios: { l1_klasifikasi: '1' } })
    expect(r.filled).toBe(base.filled + 1)
  })

  it('kode pos requires 5 digits', () => {
    const base = calc()
    const r = calc({ fields: { l1_kodepos: '80361' } })
    expect(r.filled).toBe(base.filled + 1)
    const r2 = calc({ fields: { l1_kodepos: '803' } })
    expect(r2.filled).toBe(0)
  })

  it('sesuai_kk (radio) counts', () => {
    const base = calc()
    const r = calc({ radios: { l1_sesuai_kk: '1' } })
    expect(r.filled).toBe(base.filled + 1)
  })
})

// ─── BLOK I: Per Anggota ────────────────────────────────────────────────────

describe('calcProgressL() — per anggota', () => {
  it('total grows with jml_kk_anggota', () => {
    const r1 = calc({ fields: { l1_jml_kk_anggota: '1' } })
    const r2 = calc({ fields: { l1_jml_kk_anggota: '2' } })
    expect(r2.total).toBeGreaterThan(r1.total)
  })

  it('STOP-state anggota (keberadaan=2) reduces per-anggota total', () => {
    const r1 = calc({ fields: { l1_jml_kk_anggota: '1' } })
    const r2 = calc({
      fields: { l1_jml_kk_anggota: '1' },
      radios: { 'l_ang_1_keberadaan': '2' },
    })
    expect(r2.total).toBeLessThan(r1.total)
  })

  it('STOP-state via keberadaan=6 reduces total', () => {
    const r2 = calc({
      fields: { l1_jml_kk_anggota: '1' },
      radios: { 'l_ang_1_keberadaan': '6' },
    })
    const rA = calc({ fields: { l1_jml_kk_anggota: '1' }, radios: { 'l_ang_1_keberadaan': '1' } })
    expect(r2.total).toBeLessThan(rA.total)
  })

  it('STOP-state via keberadaan=7 reduces total', () => {
    const r2 = calc({
      fields: { l1_jml_kk_anggota: '1' },
      radios: { 'l_ang_1_keberadaan': '7' },
    })
    const rA = calc({ fields: { l1_jml_kk_anggota: '1' }, radios: { 'l_ang_1_keberadaan': '1' } })
    expect(r2.total).toBeLessThan(rA.total)
  })

  it('keberadaan=3 (pindah DN) adds dn_provinsi requirement', () => {
    const r = calc({
      fields: { l1_jml_kk_anggota: '1' },
      radios: { 'l_ang_1_keberadaan': '3' },
    })
    const r2 = calc({
      fields: { l1_jml_kk_anggota: '1', 'l_ang_1_dn_provinsi': '51' },
      radios: { 'l_ang_1_keberadaan': '3' },
    })
    expect(r2.filled).toBe(r.filled + 1)
  })

  it('keberadaan=4 (pindah LN) adds ln_negara requirement', () => {
    const r = calc({
      fields: { l1_jml_kk_anggota: '1' },
      radios: { 'l_ang_1_keberadaan': '4' },
    })
    const r2 = calc({
      fields: { l1_jml_kk_anggota: '1', 'l_ang_1_ln_negara': 'Singapore' },
      radios: { 'l_ang_1_keberadaan': '4' },
    })
    expect(r2.filled).toBe(r.filled + 1)
  })

  it('age >= 5 adds sekolah/ijazah/rekening requirements', () => {
    const rUnder5 = calc({ fields: { l1_jml_kk_anggota: '1', 'l_ang_1_umur': '3' } })
    const r5plus  = calc({ fields: { l1_jml_kk_anggota: '1', 'l_ang_1_umur': '7' } })
    expect(r5plus.total).toBe(rUnder5.total + 3)
  })

  it('age >= 10 adds profesi/kedudukan/18a/18b/18c requirements', () => {
    const r5  = calc({ fields: { l1_jml_kk_anggota: '1', 'l_ang_1_umur': '7' } })
    const r10 = calc({ fields: { l1_jml_kk_anggota: '1', 'l_ang_1_umur': '12' } })
    expect(r10.total).toBe(r5.total + 5)
  })

  it('multiple anggota: STOP for some, age-gated for others', () => {
    const r = calc({
      fields: {
        l1_jml_kk_anggota: '3',
        'l_ang_1_umur': '30', 'l_ang_2_umur': '6', 'l_ang_3_umur': '70',
      },
      radios: {
        'l_ang_1_keberadaan': '1',
        'l_ang_2_keberadaan': '2',  // STOP
        'l_ang_3_keberadaan': '1',
      },
    })
    expect(r.total).toBeGreaterThan(0)
  })

  it('caps anggota at 30', () => {
    const r = calc({ fields: { l1_jml_kk_anggota: '50' } })
    // total reflects up to 30 anggota only (or 0 if cap is rejected)
    expect(r.total).toBeLessThan(2000)
  })
})

// ─── BLOK II: Usaha ─────────────────────────────────────────────────────────

describe('calcProgressL() — Blok II Usaha', () => {
  it('nama_usaha counts', () => {
    const base = calc()
    const r = calc({ fields: { l2_nama_usaha: 'Warung Bu Budi' } })
    expect(r.filled).toBe(base.filled + 1)
  })

  it('kawasan=10 (luar) does not require nama_kawasan', () => {
    const base = calc()
    const r = calc({ radios: { l2_kawasan: '10' } })
    // kawasan radio counted; nama_kawasan NOT required when v=10
    expect(r.filled).toBe(base.filled + 1)
  })

  it('kawasan=1 (in kawasan) requires nama_kawasan too', () => {
    const r1 = calc({ radios: { l2_kawasan: '1' } })
    const r2 = calc({ radios: { l2_kawasan: '1' }, fields: { l2_nama_kawasan: 'KEK Mandalika' } })
    expect(r2.filled).toBe(r1.filled + 1)
  })

  it('NIB=1 requires 13-digit NIB number', () => {
    const r1 = calc({ radios: { l2_punya_nib: '1' } })
    const r2 = calc({ radios: { l2_punya_nib: '1' }, fields: { l2_nib: '1234567890123' } })
    expect(r2.filled).toBe(r1.filled + 1)
    const r3 = calc({ radios: { l2_punya_nib: '1' }, fields: { l2_nib: '12345' } })
    expect(r3.filled).toBe(r1.filled)
  })

  it('NIB=2 requires nib_alasan radio', () => {
    const r1 = calc({ radios: { l2_punya_nib: '2' } })
    const r2 = calc({ radios: { l2_punya_nib: '2', l2_nib_alasan: '3' } })
    expect(r2.filled).toBe(r1.filled + 1)
  })

  it('nib_alasan=5 (lainnya) requires text field', () => {
    const r1 = calc({ radios: { l2_punya_nib: '2', l2_nib_alasan: '5' } })
    const r2 = calc({
      radios: { l2_punya_nib: '2', l2_nib_alasan: '5' },
      fields: { l2_nib_alasan_lain: 'Kompleksitas administrasi' },
    })
    expect(r2.filled).toBe(r1.filled + 1)
  })

  it('pengusaha_umur in range 17-120 counts', () => {
    const base = calc()
    const r = calc({ fields: { l2_pengusaha_umur: '35' } })
    expect(r.filled).toBe(base.filled + 1)
  })

  it('pengusaha_umur < 17 does not count', () => {
    const r = calc({ fields: { l2_pengusaha_umur: '15' } })
    expect(r.filled).toBe(0)
  })

  it('pengusaha_nik 16 digits counts', () => {
    const base = calc()
    const r = calc({ fields: { l2_pengusaha_nik: '1234567890123456' } })
    expect(r.filled).toBe(base.filled + 1)
  })

  it('b1=1 b2=2 path requires input/proses (manufacturing)', () => {
    const r1 = calc({ radios: { l2_b1: '1', l2_b2: '2' } })
    const r2 = calc({
      radios: { l2_b1: '1', l2_b2: '2' },
      fields: { l2_input: 'tepung', l2_proses: 'membakar' },
    })
    expect(r2.filled).toBe(r1.filled + 2)
  })

  it('b2=1 path requires lokasi c', () => {
    const r1 = calc({ radios: { l2_b2: '1' } })
    const r2 = calc({ radios: { l2_b2: '1', l2_c: '4' } })
    expect(r2.filled).toBe(r1.filled + 1)
  })

  it('b1=2 b2=2 b3=2 path requires b4', () => {
    const r1 = calc({ radios: { l2_b1: '2', l2_b2: '2', l2_b3: '2' } })
    const r2 = calc({ radios: { l2_b1: '2', l2_b2: '2', l2_b3: '2', l2_b4: '1' } })
    expect(r2.filled).toBe(r1.filled + 1)
  })

  it('jaringan=2 requires jml_cabang', () => {
    const r1 = calc({ radios: { l2_jaringan: '2' } })
    const r2 = calc({ radios: { l2_jaringan: '2' }, fields: { l2_jml_cabang: '3' } })
    expect(r2.filled).toBe(r1.filled + 1)
  })

  it('halal=1 requires halal_b and halal_c', () => {
    const r1 = calc({ radios: { l2_halal: '1' } })
    const r2 = calc({ radios: { l2_halal: '1' }, fields: { l2_halal_b: '5', l2_halal_c: '2' } })
    expect(r2.filled).toBe(r1.filled + 2)
  })

  it('bpom=1 requires bpom_b and bpom_c', () => {
    const r1 = calc({ radios: { l2_bpom: '1' } })
    const r2 = calc({ radios: { l2_bpom: '1' }, fields: { l2_bpom_b: '3', l2_bpom_c: '1' } })
    expect(r2.filled).toBe(r1.filled + 2)
  })

  it('tahun_operasi must be in 1900-2026', () => {
    const r1 = calc({ fields: { l2_tahun_operasi: '1850' } })
    expect(r1.filled).toBe(0)
    const r2 = calc({ fields: { l2_tahun_operasi: '2020' } })
    expect(r2.filled).toBe(1)
  })

  it('y29 sum = 100 counts an extra checkmark', () => {
    const fields = {
      l2_y29a: '50', l2_y29b: '20', l2_y29c: '10',
      l2_y29d: '10', l2_y29e: '5',  l2_y29f: '5',
    }
    const r = calc({
      fields,
      elements: { l2_tahunan_wrap: mockEl('', false), l2_bulanan_wrap: mockEl('', true) },
    })
    // 6 fields + 1 sum-check = 7
    expect(r.filled).toBeGreaterThanOrEqual(7)
  })

  it('y29 sum != 100 does not get the sum-check bonus', () => {
    const fields = {
      l2_y29a: '50', l2_y29b: '20', l2_y29c: '10',
      l2_y29d: '10', l2_y29e: '5',  l2_y29f: '4',  // total 99
    }
    const r = calc({
      fields,
      elements: { l2_tahunan_wrap: mockEl('', false), l2_bulanan_wrap: mockEl('', true) },
    })
    const allRight = calc({
      fields: { ...fields, l2_y29f: '5' },
      elements: { l2_tahunan_wrap: mockEl('', false), l2_bulanan_wrap: mockEl('', true) },
    })
    expect(allRight.filled).toBe(r.filled + 1)
  })
})

// ─── BLOK III: Perumahan ────────────────────────────────────────────────────

describe('calcProgressL() — Blok III Perumahan', () => {
  it('jenis_bangunan=3 (rusun) requires lantai_apt', () => {
    const r1 = calc({ radios: { l3_jenis_bangunan: '3' } })
    const r2 = calc({ radios: { l3_jenis_bangunan: '3' }, fields: { l3_lantai_apt: '12' } })
    expect(r2.filled).toBe(r1.filled + 1)
  })

  it('jenis_bangunan=5 requires bangunan_lain', () => {
    const r1 = calc({ radios: { l3_jenis_bangunan: '5' } })
    const r2 = calc({ radios: { l3_jenis_bangunan: '5' }, fields: { l3_bangunan_lain: 'Kos' } })
    expect(r2.filled).toBe(r1.filled + 1)
  })

  it('status_milik=1 requires bukti radio', () => {
    const r1 = calc({ radios: { l3_status_milik: '1' } })
    const r2 = calc({ radios: { l3_status_milik: '1', l3_bukti: '1' } })
    expect(r2.filled).toBe(r1.filled + 1)
  })

  it('status_milik=5 requires status_lain text', () => {
    const r1 = calc({ radios: { l3_status_milik: '5' } })
    const r2 = calc({
      radios: { l3_status_milik: '5' },
      fields: { l3_status_lain: 'Pinjam pakai' },
    })
    expect(r2.filled).toBe(r1.filled + 1)
  })

  it('bab in {1,2,3} requires kloset', () => {
    const r1 = calc({ radios: { l3_bab: '1' } })
    const r2 = calc({ radios: { l3_bab: '1', l3_kloset: '1' } })
    expect(r2.filled).toBe(r1.filled + 1)
  })

  it('bab=4 does not require kloset', () => {
    const r1 = calc({ radios: { l3_bab: '4' } })
    // No additional kloset slot opened — kloset not added to total
    expect(r1.filled).toBe(1) // just bab
  })

  it('listrik=1 requires meteran_jml', () => {
    const r1 = calc({ radios: { l3_listrik: '1' } })
    const r2 = calc({ radios: { l3_listrik: '1' }, fields: { l3_meteran_jml: '1' } })
    expect(r2.filled).toBe(r1.filled + 1)
  })

  it('all 10 aset bergerak/tidak bergerak fields are independent', () => {
    const ids = ['l3_aset_gas3','l3_aset_gas5','l3_aset_kulkas','l3_aset_ac','l3_aset_emas',
                 'l3_aset_komputer','l3_aset_motor','l3_aset_mobil','l3_aset_tanah','l3_aset_rumah']
    const base = calc()
    const fields = {}
    ids.forEach(id => fields[id] = '0')
    const r = calc({ fields })
    expect(r.filled).toBe(base.filled + 10)
  })
})

// ─── BLOK V: Petugas/Responden ──────────────────────────────────────────────

describe('calcProgressL() — Blok V Petugas/Responden', () => {
  it('petugas_nama counts', () => {
    const base = calc()
    const r = calc({ fields: { l5_petugas_nama: 'Andi' } })
    expect(r.filled).toBe(base.filled + 1)
  })

  it('responden_hp + responden_email require valid format', () => {
    const base = calc()
    const r = calc({ fields: {
      l5_responden_hp: '081234567890',
      l5_responden_email: 'foo@bar.com',
    }})
    expect(r.filled).toBe(base.filled + 2)
  })

  it('invalid email does not count', () => {
    const r = calc({ fields: { l5_responden_email: 'not-an-email' } })
    expect(r.filled).toBe(0)
  })

  it('l5HasSig=true counts signature', () => {
    const base = calc()
    const r = calc({ l5HasSig: true })
    expect(r.filled).toBe(base.filled + 1)
  })
})

// ─── COMPLETE FORM ───────────────────────────────────────────────────────────

describe('calcProgressL() — complete form', () => {
  it('all base fields + 1 non-STOP adult anggota reaches near 100%', () => {
    const r = calc({
      fields: {
        l1_nama_kk: 'Budi', l1_nik_kk: '1234567890123456', l1_no_kk: '1234567890123456',
        l1_jml_kk_anggota: '1',
        l1_alamat_provinsi: '51', l1_alamat_kab: '5108',
        l1_alamat_kec: '510801', l1_alamat_kel: '5108010001',
        l1_kodepos: '81111',
        l1_alamat_detail: 'Jl. A No.1', l1_nama_jalan: 'A', l1_no_rumah: '1',
        // Anggota #1
        'l_ang_1_nama': 'Budi', 'l_ang_1_hubungan': '1', 'l_ang_1_tgl_lahir': '1980-01-01',
        'l_ang_1_umur': '45', 'l_ang_1_ijazah': '3',
        'l_ang_1_profesi': '075', 'l_ang_1_kedudukan': '1',
        // Blok II
        l2_nama_usaha: 'Warung', l2_alamat: 'Jl. A',
        l2_pengusaha_nama: 'Budi', l2_pengusaha_umur: '45',
        l2_pengusaha_nik: '1234567890123456',
        l2_kegiatan_utama: 'jual', l2_produk_utama: 'beras',
        l2_kbli_kode: '47110',
        l2_pekerja_l: '1', l2_pekerja_p: '0',
        l2_tahun_operasi: '2020',
        // Blok III
        l3_jml_keluarga: '1',
        l3_luas_lantai: '60',
        l3_lantai_bahan: '1', l3_lantai_kondisi: '1',
        l3_dinding_bahan: '1', l3_dinding_kondisi: '1',
        l3_atap_bahan: '1', l3_atap_kondisi: '1',
        l3_air: '1',
        l3_makanan_mgg: '500000', l3_nonmakanan_bln: '1000000', l3_nonmakanan_thn: '2000000',
        l3_aset_gas3: '0', l3_aset_gas5: '0', l3_aset_kulkas: '0', l3_aset_ac: '0',
        l3_aset_emas: '0', l3_aset_komputer: '0', l3_aset_motor: '1', l3_aset_mobil: '0',
        l3_aset_tanah: '0', l3_aset_rumah: '0',
        // Blok V
        l5_petugas_nama: 'Andi',
        l5_responden_nama: 'Budi',
        l5_responden_hp: '081234567890',
        l5_responden_email: 'budi@test.com',
        l5_tanggal: '2026-05-01',
      },
      radios: {
        l1_klasifikasi: '1', l1_sesuai_kk: '1',
        'l_ang_1_keberadaan': '1', 'l_ang_1_alamat_dom': '1',
        'l_ang_1_kawin': '2', 'l_ang_1_jk': '1', 'l_ang_1_sekolah': '2',
        'l_ang_1_rekening': '2', 'l_ang_1_18a': '1', 'l_ang_1_18b': '2', 'l_ang_1_18c': '2',
        l2_kawasan: '10', l2_jenis_usaha: '1', l2_punya_nib: '2', l2_nib_alasan: '3',
        l2_badan_usaha: '13', l2_pengusaha_jk: '1',
        l2_b1: '2', l2_b2: '1', l2_c: '4',
        l2_jaringan: '1', l2_internet: '2', l2_halal: '2', l2_bpom: '2',
        l3_jenis_bangunan: '1', l3_status_milik: '1', l3_bukti: '1',
        l3_bab: '1', l3_kloset: '1', l3_tinja: '1', l3_listrik: '2',
      },
      l5HasSig: true,
    })
    expect(r.pct).toBeGreaterThanOrEqual(80)
  })
})
