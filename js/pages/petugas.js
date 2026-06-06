// ============================================================
// PetugasManager — modul murni untuk portal petugas
// Tidak menyentuh DOM, hanya transformasi data. Aman untuk
// di-load dari petugas.html maupun di-eval di unit test Vitest.
// ============================================================

(function (root) {
  'use strict';

  function bufToHex(buf) {
    var bytes = new Uint8Array(buf);
    var hex = '';
    for (var i = 0; i < bytes.length; i++) {
      var h = bytes[i].toString(16);
      hex += (h.length === 1 ? '0' : '') + h;
    }
    return hex;
  }

  async function hashPassword(plaintext) {
    var enc  = new TextEncoder();
    var buf  = await crypto.subtle.digest('SHA-256', enc.encode(String(plaintext || '')));
    return bufToHex(buf);
  }

  async function verifyPassword(input, expectedHash) {
    if (!expectedHash) return false;
    var hash = await hashPassword(input);
    return hash.toLowerCase() === String(expectedHash).toLowerCase();
  }

  function normalize(s) {
    return String(s == null ? '' : s).toLowerCase().trim();
  }

  function searchPetugas(query, pplList, pmlList) {
    var q   = normalize(query);
    var ppl = (pplList || []).map(function (p) {
      return { nama: p.nama || '', email: p.email || '', pml_email: p.pml_email || '', peran: 'PPL' };
    });
    var pml = (pmlList || []).map(function (p) {
      return { nama: p.nama || '', email: p.email || '', peran: 'PML' };
    });
    var combined = ppl.concat(pml);
    if (!q) return combined;
    return combined.filter(function (p) {
      return normalize(p.nama).indexOf(q) !== -1 || normalize(p.email).indexOf(q) !== -1;
    });
  }

  function resolvePmlNama(pmlEmail, pmlList) {
    if (!pmlEmail || !pmlList) return null;
    var target = normalize(pmlEmail);
    for (var i = 0; i < pmlList.length; i++) {
      if (normalize(pmlList[i].email) === target) return pmlList[i].nama || null;
    }
    return null;
  }

  function generateId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // RFC4122 v4 fallback
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      var v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function createAssignment(data, petugasAktif) {
    if (!petugasAktif || !petugasAktif.email) {
      throw new Error('Petugas aktif tidak valid');
    }
    var required = ['jenis', 'nama_responden', 'provinsi', 'kabupaten', 'kecamatan', 'desa'];
    for (var i = 0; i < required.length; i++) {
      if (!data || !String(data[required[i]] || '').trim()) {
        throw new Error('Field wajib kosong: ' + required[i]);
      }
    }
    // Jenis: L (rumah tangga) atau UNIFIED (SE2026-P pemutakhiran).
    // L.UB di-retire — 'LUB'/'P'/nilai lain di-default ke UNIFIED.
    var jenis = (data.jenis === 'L') ? 'L' : 'UNIFIED';
    var id    = generateId();
    var now   = new Date().toISOString();
    var draftPrefix = (jenis === 'L') ? 'cawi_l_draft_' : 'cawi_u_draft_';
    var draftKey = draftPrefix + id;
    return {
      id: id,
      petugas_nama:  petugasAktif.nama  || '',
      petugas_email: petugasAktif.email,
      petugas_peran: petugasAktif.peran === 'PML' ? 'PML' : 'PPL',
      jenis: jenis,
      // Nama tampilan wilayah (yang dipakai filter & kartu)
      provinsi:       String(data.provinsi).trim(),
      kabupaten:      String(data.kabupaten).trim(),
      kecamatan:      String(data.kecamatan).trim(),
      desa:           String(data.desa).trim(),
      // Kode BPS — dipakai guard untuk pre-fill dropdown cascade di kuesioner
      provinsi_kd:    String(data.provinsi_kd  || '').trim(),
      kabupaten_kd:   String(data.kabupaten_kd || '').trim(),
      kecamatan_kd:   String(data.kecamatan_kd || '').trim(),
      desa_kd:        String(data.desa_kd      || '').trim(),
      // SLS (banjar/dusun/lingkungan) — pembagian wilayah lebih detail
      sls_nama:       String(data.sls_nama     || '').trim(),
      sls_kd:         String(data.sls_kd       || '').trim(),       // 4-digit relatif desa
      sls_full_kd:    String(data.sls_full_kd  || '').trim(),       // 14-digit (desa + sls)
      subsls_kd:      String(data.subsls_kd    || '00').trim(),     // 2-digit; "00" = tanpa sub
      nama_responden: String(data.nama_responden).trim(),
      draft_key: draftKey,
      status: 'draft',
      // SE2026-P (unified): status pemutakhiran + jenis bangunan (diisi runtime)
      p_status: 'open',
      p_jenis_bangunan: null,
      created_at: now,
      updated_at: now
    };
  }

  // PPL: lihat assignment milik email-nya sendiri.
  // PML: lihat assignment dari PPL bawahannya (pml_email = email PML ini) + miliknya sendiri.
  function canViewAssignment(assignment, petugasAktif, pplList) {
    if (!assignment || !petugasAktif) return false;
    var myEmail    = normalize(petugasAktif.email);
    var assignEmail = normalize(assignment.petugas_email);
    if (!myEmail) return false;
    if (assignEmail === myEmail) return true;
    if (petugasAktif.peran !== 'PML') return false;
    if (!pplList || !pplList.length) return false;
    for (var i = 0; i < pplList.length; i++) {
      if (normalize(pplList[i].email) === assignEmail &&
          normalize(pplList[i].pml_email) === myEmail) {
        return true;
      }
    }
    return false;
  }

  function filterAssignments(list, filters, petugasAktif, pplList) {
    var arr = (list || []).filter(function (a) {
      return canViewAssignment(a, petugasAktif, pplList);
    });
    var f = filters || {};
    if (f.desa)         arr = arr.filter(function (a) { return a.desa         === f.desa; });
    if (f.kecamatan)    arr = arr.filter(function (a) { return a.kecamatan    === f.kecamatan; });
    if (f.kabupaten)    arr = arr.filter(function (a) { return a.kabupaten    === f.kabupaten; });
    if (f.petugas_nama) arr = arr.filter(function (a) { return a.petugas_nama === f.petugas_nama; });
    if (f.jenis && (f.jenis === 'L' || f.jenis === 'UNIFIED')) {
      arr = arr.filter(function (a) { return a.jenis === f.jenis; });
    }
    return arr;
  }

  function deleteAssignment(id, list) {
    return (list || []).filter(function (a) { return a.id !== id; });
  }

  function getDistinctValues(list, field) {
    var seen = Object.create(null);
    var out  = [];
    (list || []).forEach(function (a) {
      var v = a && a[field];
      if (v == null) return;
      var s = String(v).trim();
      if (!s || seen[s]) return;
      seen[s] = true;
      out.push(s);
    });
    out.sort(function (a, b) { return a.localeCompare(b, 'id'); });
    return out;
  }

  root.PetugasManager = {
    hashPassword:      hashPassword,
    verifyPassword:    verifyPassword,
    searchPetugas:     searchPetugas,
    resolvePmlNama:    resolvePmlNama,
    createAssignment:  createAssignment,
    filterAssignments: filterAssignments,
    canViewAssignment: canViewAssignment,
    deleteAssignment:  deleteAssignment,
    generateId:        generateId,
    getDistinctValues: getDistinctValues
  };
})(typeof window !== 'undefined' ? window : globalThis);
