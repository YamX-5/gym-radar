/* =========================================================================
   Gym Radar — member import (all common file types)
   Supports: .xlsx .xls (SheetJS), .csv .tsv, .json, .vcf (phone contacts).
   Maps flexible headers (Arabic/English) → member rows, then bulk-inserts.
   ========================================================================= */
const HEADER_MAP = {
  name: ['name', 'full_name', 'fullname', 'الاسم', 'اسم', 'الاسم الكامل'],
  phone: ['phone', 'mobile', 'tel', 'number', 'الهاتف', 'رقم', 'الجوال', 'الموبايل'],
  gender: ['gender', 'sex', 'الجنس', 'النوع'],
  join: ['join', 'join_date', 'date', 'تاريخ', 'تاريخ الاشتراك', 'الانضمام'],
  notes: ['notes', 'note', 'ملاحظات', 'ملاحظة'],
};
function matchKey(header) {
  const h = String(header || '').trim().toLowerCase();
  for (const [k, alts] of Object.entries(HEADER_MAP)) if (alts.some(a => h === a.toLowerCase() || h.includes(a.toLowerCase()))) return k;
  return null;
}
function normGender(v) { const s = String(v || '').toLowerCase(); return (s.includes('أنث') || s.includes('female') || s === 'f' || s.includes('انث')) ? 'female' : 'male'; }
function cleanPhone(v) { return String(v == null ? '' : v).replace(/[^\d+]/g, ''); }

function rowsToMembers(rows) {
  if (!rows.length) return [];
  const header = rows[0].map(c => String(c || ''));
  const idx = {}; header.forEach((h, i) => { const k = matchKey(h); if (k && idx[k] == null) idx[k] = i; });
  const hasHeader = Object.keys(idx).length > 0;
  const body = hasHeader ? rows.slice(1) : rows;
  if (!hasHeader) { idx.name = 0; idx.phone = 1; idx.gender = 2; idx.join = 3; idx.notes = 4; } // positional
  const out = [];
  for (const r of body) {
    const name = String(r[idx.name] ?? '').trim();
    if (!name) continue;
    out.push({
      full_name: name, phone: cleanPhone(r[idx.phone]), gender: normGender(r[idx.gender]),
      join_date: (String(r[idx.join] ?? '').slice(0, 10)) || new Date().toISOString().slice(0, 10),
      notes: String(r[idx.notes] ?? '').trim(), status: 'active', birth_date: null,
    });
  }
  return out;
}

function parseCSV(text) {
  const delim = text.indexOf('\t') > -1 && text.indexOf(',') === -1 ? '\t' : ',';
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === delim) { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); if (row.some(x => x !== '')) rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); if (row.some(x => x !== '')) rows.push(row); }
  return rows;
}
function parseVCF(text) {
  const cards = text.split(/BEGIN:VCARD/i).slice(1);
  const rows = [['name', 'phone']];
  for (const c of cards) {
    const nameM = c.match(/FN[^:]*:(.+)/i);
    const telM = c.match(/TEL[^:]*:([+\d ()\-]+)/i);
    const name = nameM ? nameM[1].trim() : '';
    if (name) rows.push([name, telM ? telM[1].trim() : '']);
  }
  return rows;
}

async function importFile(file) {
  const name = file.name.toLowerCase();
  let rows;
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' });
  } else if (name.endsWith('.json')) {
    const data = JSON.parse(await file.text());
    const arr = Array.isArray(data) ? data : (data.members || []);
    rows = [['name', 'phone', 'gender', 'join', 'notes'], ...arr.map(o => [o.full_name || o.name, o.phone, o.gender, o.join_date || o.join, o.notes])];
  } else if (name.endsWith('.vcf')) {
    rows = parseVCF(await file.text());
  } else { // csv / tsv / txt
    rows = parseCSV(await file.text());
  }
  const members = rowsToMembers(rows);
  if (members.length) await STORE.bulkPut('members', members);
  return members.length;
}
function membersTemplateCSV() {
  const csv = 'الاسم,الهاتف,الجنس,تاريخ الاشتراك,ملاحظات\nمحمد أحمد,0791234567,ذكر,2026-07-01,مثال\nسارة علي,0787654321,أنثى,2026-07-01,\n';
  return new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
}
window.IMPORTER = { importFile, membersTemplateCSV };
