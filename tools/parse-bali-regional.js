#!/usr/bin/env node
/**
 * tools/parse-bali-regional.js — parse master/regional/msubsls_25_2_51.xlsx
 * lalu emit **JSON kompak** ke js/data/regional-bali.json yang berisi
 * seluruh wilayah Provinsi Bali (kode 51) — kab, kec, desa, sls, subsls.
 *
 * Format kompak: array dua-elemen `[kode, nama]` (bukan object `{kode,nama}`)
 * supaya hemat tempat. SubSLS adalah array kode 2-digit ("00", "01", ...).
 *
 * Cara regenerate js/data/regional-bali.json:
 *   1. mkdir -p tools/.tmp && cd tools/.tmp
 *   2. unzip -o ../../master/regional/msubsls_25_2_51.xlsx
 *   3. cd ../.. && node tools/parse-bali-regional.js
 *   4. rm -rf tools/.tmp
 *
 * Hierarki kode (full, hasil concat):
 *   prov     = 2 digit  (51)
 *   kab      = 4 digit  (5101..5171)
 *   kec      = 7 digit  (5101010)
 *   desa     = 10 digit (5101010001)
 *   sls      = 14 digit (51010100010001)
 *   subsls   = 16 digit (5101010001000101) — idsubsls
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SHEET_PATH = resolve(ROOT, 'tools/.tmp/xl/worksheets/sheet1.xml');
const SHARED_STRINGS_PATH = resolve(ROOT, 'tools/.tmp/xl/sharedStrings.xml');
const OUT_PATH = resolve(ROOT, 'js/data/regional-bali.json');

// --- Parse sharedStrings ---
function parseSharedStrings(xml) {
  const out = [];
  // Match each <si>...<t ...>VALUE</t>...</si>
  const re = /<si>(.*?)<\/si>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const inner = m[1];
    // Concat all <t>..</t> chunks (handles rich text si)
    let combined = '';
    const tre = /<t[^>]*>([^<]*)<\/t>/g;
    let tm;
    while ((tm = tre.exec(inner)) !== null) combined += tm[1];
    out.push(decodeEntities(combined));
  }
  return out;
}

function decodeEntities(s) {
  return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

// --- Parse sheet rows ---
function parseRows(xml, strings) {
  const rows = [];
  const rowRe = /<row [^>]*>(.*?)<\/row>/g;
  let rm;
  while ((rm = rowRe.exec(xml)) !== null) {
    const inner = rm[1];
    const cells = {};
    const cellRe = /<c r="([A-Z]+)\d+"(?:\s+t="([^"]+)")?[^>]*>(?:<v>([^<]*)<\/v>)?(?:<is><t[^>]*>([^<]*)<\/t><\/is>)?<\/c>/g;
    let cm;
    while ((cm = cellRe.exec(inner)) !== null) {
      const col = cm[1];
      const type = cm[2];
      const v = cm[3];
      const inlineStr = cm[4];
      if (inlineStr !== undefined) {
        cells[col] = decodeEntities(inlineStr);
      } else if (type === 's' && v !== undefined) {
        cells[col] = strings[parseInt(v, 10)];
      } else if (v !== undefined) {
        cells[col] = v;
      }
    }
    rows.push(cells);
  }
  return rows;
}

// --- Main ---
console.error('Reading sharedStrings...');
const ssXml = readFileSync(SHARED_STRINGS_PATH, 'utf8');
const strings = parseSharedStrings(ssXml);
console.error('  ' + strings.length + ' shared strings');

console.error('Reading sheet1...');
const sheetXml = readFileSync(SHEET_PATH, 'utf8');
const rows = parseRows(sheetXml, strings);
console.error('  ' + rows.length + ' rows');

// Column mapping (A..Z) based on header
//  A=id, B=semester, C=idsubsls, D=nmsls, E=nama_ketua, F=jenis,
//  G=kdprov, H=nmprov, I=kdkab, J=nmkab, K=kdkec, L=nmkec,
//  M=kddesa, N=nmdesa, O=kdsls, P=kdsubsls, Q=klas, R=jumlah_kk, ...

const headerRow = rows[0];
const HEADER_MAP = {
  A: 'id', B: 'semester', C: 'idsubsls', D: 'nmsls', E: 'nama_ketua',
  F: 'jenis', G: 'kdprov', H: 'nmprov', I: 'kdkab', J: 'nmkab',
  K: 'kdkec', L: 'nmkec', M: 'kddesa', N: 'nmdesa',
  O: 'kdsls', P: 'kdsubsls',
};

// Verify header
const expected = ['id','semester','idsubsls','nmsls','nama_ketua','jenis','kdprov','nmprov','kdkab','nmkab','kdkec','nmkec','kddesa','nmdesa','kdsls','kdsubsls'];
const headerVals = Object.keys(HEADER_MAP).map(c => headerRow[c]);
for (let i = 0; i < expected.length; i++) {
  if (headerVals[i] !== expected[i]) {
    console.error('Header mismatch at col ' + i + ': got "' + headerVals[i] + '", expected "' + expected[i] + '"');
    process.exit(1);
  }
}

// Aggregate
const kabMap   = new Map(); // "5101" -> "JEMBRANA"
const kecMap   = new Map(); // "5101010" -> { kdkab, nama }
const desaMap  = new Map(); // "5101010001" -> { kdkec, nama }
const slsMap   = new Map(); // "51010100010001" -> { kddesa, nama, kdsls(4) }
const subslsMap = new Map(); // "5101010001000101" -> { kdsls(14), kdsubsls(2) }

for (let i = 1; i < rows.length; i++) {
  const r = rows[i];
  const kdprov = r.G || '';
  if (kdprov !== '51') continue;
  const kdkabRaw  = r.I || '';
  const kdkecRaw  = r.K || '';
  const kddesaRaw = r.M || '';
  const kdslsRaw  = r.O || '';
  const kdsubslsRaw = r.P || '';

  const kdkab    = kdprov + kdkabRaw.padStart(2, '0');                                  // 4
  const kdkec    = kdkab + kdkecRaw.padStart(3, '0');                                   // 7
  const kddesa   = kdkec + kddesaRaw.padStart(3, '0');                                  // 10
  const kdsls    = kddesa + kdslsRaw.padStart(4, '0');                                  // 14
  const kdsubsls = kdsls + (kdsubslsRaw || '00').padStart(2, '0');                      // 16

  if (!kabMap.has(kdkab))   kabMap.set(kdkab, r.J || '');
  if (!kecMap.has(kdkec))   kecMap.set(kdkec, { kdkab, nama: r.L || '' });
  if (!desaMap.has(kddesa)) desaMap.set(kddesa, { kdkec, nama: r.N || '' });
  if (!slsMap.has(kdsls))   slsMap.set(kdsls, { kddesa, nama: r.D || '' });
  if (!subslsMap.has(kdsubsls)) subslsMap.set(kdsubsls, { kdsls, kdsubsls: kdsubslsRaw.padStart(2, '0') });
}

console.error('Kabupaten/Kota: ' + kabMap.size);
console.error('Kecamatan    : ' + kecMap.size);
console.error('Desa         : ' + desaMap.size);
console.error('SLS          : ' + slsMap.size);
console.error('SubSLS       : ' + subslsMap.size);

// --- Build compact JSON structures ---
// Format:
//   kab[prov]   = [[kode, nama], ...]
//   kec[kdkab]  = [[kode, nama], ...]
//   desa[kdkec] = [[kode, nama], ...]
//   sls[kddesa] = [[kode, nama], ...]
//   subsls[kdsls14] = ["00", "01", ...]  // hanya kode (nama = kode)
function naming(nama, kode) {
  // Konvensi: "KAB. X" untuk kabupaten, "KOTA X" untuk kota (5171 di Bali).
  if (!nama) return nama;
  if (nama.startsWith('KAB.') || nama.startsWith('KOTA')) return nama;
  return kode === '5171' ? 'KOTA ' + nama : 'KAB. ' + nama;
}

const kabKeys  = Array.from(kabMap.keys()).sort();
const kecKeys  = Array.from(kecMap.keys()).sort();
const desaKeys = Array.from(desaMap.keys()).sort();
const slsKeys  = Array.from(slsMap.keys()).sort();

const out = { kab: {}, kec: {}, desa: {}, sls: {}, subsls: {} };
out.kab['51'] = kabKeys.map(k => [k, naming(kabMap.get(k), k)]);
for (const kdkab of kabKeys) {
  out.kec[kdkab] = Array.from(kecMap.entries())
    .filter(([_, v]) => v.kdkab === kdkab)
    .sort((a,b)=>a[0].localeCompare(b[0]))
    .map(([k, v]) => [k, v.nama]);
}
for (const kdkec of kecKeys) {
  out.desa[kdkec] = Array.from(desaMap.entries())
    .filter(([_, v]) => v.kdkec === kdkec)
    .sort((a,b)=>a[0].localeCompare(b[0]))
    .map(([k, v]) => [k, v.nama]);
}
for (const kddesa of desaKeys) {
  // SLS kode disimpan 4-digit relatif terhadap desa supaya hemat tempat
  out.sls[kddesa] = Array.from(slsMap.entries())
    .filter(([_, v]) => v.kddesa === kddesa)
    .sort((a,b)=>a[0].localeCompare(b[0]))
    .map(([k, v]) => [k.slice(10), v.nama]);
}
for (const kdsls of slsKeys) {
  const subs = Array.from(subslsMap.values())
    .filter(v => v.kdsls === kdsls)
    .sort((a,b)=>a.kdsubsls.localeCompare(b.kdsubsls))
    .map(v => v.kdsubsls);
  if (subs.length) out.subsls[kdsls] = subs;
}

// Format JSON tanpa whitespace untuk hemat byte
const json = JSON.stringify(out);
writeFileSync(OUT_PATH, json, 'utf8');
console.error('Wrote ' + OUT_PATH + ' (' + (json.length / 1024).toFixed(1) + ' KB)');
