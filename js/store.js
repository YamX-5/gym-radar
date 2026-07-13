/* =========================================================================
   Gym Radar — data layer (future-proof)
   Async, adapter-based. Today: LocalAdapter (localStorage). Tomorrow: swap
   STORE.adapter = new SupabaseAdapter(...) and NOTHING in the UI changes.
   Every method returns a Promise, exactly like supabase-js would.
   ========================================================================= */

const ENTITIES = ['members', 'plans', 'subscriptions', 'payments', 'debts', 'reminders', 'checkins'];

/* ---------- Local adapter (browser storage) ---------- */
class LocalAdapter {
  constructor(ns = 'gr') { this.ns = ns; this.isLocal = true; }
  _key(e) { return `${this.ns}:${e}`; }
  _read(e) { try { return JSON.parse(localStorage.getItem(this._key(e))) || []; } catch { return []; } }
  _write(e, rows) { localStorage.setItem(this._key(e), JSON.stringify(rows)); }

  async all(e) { return this._read(e); }
  async get(e, id) { return this._read(e).find(r => r.id === id) || null; }
  async where(e, pred) { return this._read(e).filter(pred); }

  async put(e, obj) {
    const rows = this._read(e);
    if (obj.id == null) {
      obj.id = (rows.reduce((m, r) => Math.max(m, r.id || 0), 0) || 0) + 1;
      rows.push(obj);
    } else {
      const i = rows.findIndex(r => r.id === obj.id);
      if (i >= 0) rows[i] = { ...rows[i], ...obj }; else rows.push(obj);
    }
    this._write(e, rows);
    return obj;
  }
  async del(e, id) {
    this._write(e, this._read(e).filter(r => r.id !== id));
    return true;
  }
  async bulkPut(e, arr) {
    const rows = this._read(e);
    let next = (rows.reduce((m, r) => Math.max(m, r.id || 0), 0) || 0);
    for (const obj of arr) { obj.id = ++next; rows.push(obj); }
    this._write(e, rows);
    return arr;
  }

  getSetting(k, d) { const v = localStorage.getItem(`${this.ns}:set:${k}`); return v == null ? d : v; }
  setSetting(k, v) { localStorage.setItem(`${this.ns}:set:${k}`, String(v)); }
  allSettings() {
    const out = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith(`${this.ns}:set:`)) out[key.slice(`${this.ns}:set:`.length)] = localStorage.getItem(key);
    }
    return out;
  }
  export() { const o = { settings: this.allSettings() }; ENTITIES.forEach(e => o[e] = this._read(e)); return o; }
  wipe() { ENTITIES.forEach(e => localStorage.removeItem(this._key(e))); }
}

/* ---------- Supabase adapter (Step 2 — same interface) ----------
   When ready, `npm`-free via CDN esm, then:
     STORE.adapter = new SupabaseAdapter(URL, ANON_KEY)
   Each method maps 1:1 to a supabase-js call. UI code is untouched because
   it only ever calls STORE.all/get/put/del — which already return Promises.
class SupabaseAdapter {
  constructor(url, key){ this.sb = supabase.createClient(url, key); }
  async all(e){ const {data} = await this.sb.from(e).select('*'); return data; }
  async get(e,id){ const {data} = await this.sb.from(e).select('*').eq('id',id).single(); return data; }
  async put(e,obj){ const {data} = await this.sb.from(e).upsert(obj).select().single(); return data; }
  async del(e,id){ await this.sb.from(e).delete().eq('id',id); return true; }
  ...
}
------------------------------------------------------------------------- */

/* ---------- public facade ---------- */
const STORE = {
  adapter: new LocalAdapter('gr'),
  all(e) { return this.adapter.all(e); },
  get(e, id) { return this.adapter.get(e, id); },
  where(e, p) { return this.adapter.where(e, p); },
  put(e, o) { return this.adapter.put(e, o); },
  del(e, id) { return this.adapter.del(e, id); },
  bulkPut(e, a) { return this.adapter.bulkPut(e, a); },
  getSetting(k, d) { return this.adapter.getSetting(k, d); },
  setSetting(k, v) { return this.adapter.setSetting(k, v); },
  allSettings() { return this.adapter.allSettings(); },
  export() { return this.adapter.export(); },

  async nextReceipt() {
    if (this.adapter.nextReceipt) return this.adapter.nextReceipt();   // Supabase: atomic RPC
    const year = new Date().getFullYear();
    let y = +this.getSetting('receipt_year', year);
    let seq = +this.getSetting('receipt_seq', 0);
    if (y !== year) { y = year; seq = 0; }
    seq += 1;
    this.setSetting('receipt_year', y);
    this.setSetting('receipt_seq', seq);
    return `GYM-${y}-${String(seq).padStart(4, '0')}`;
  },

  // LOCAL boot only. Cloud boot (auth + per-gym config) is handled in app.js.
  async init() {
    if (this.adapter.isLocal) await this.seedIfEmpty();
  },
  async seedIfEmpty() {
    if (this.getSetting('seeded') === '1') return;
    await SEED(this);            // defined in seed.js
    this.setSetting('seeded', '1');
  },
  async resetDemo() {
    this.adapter.wipe();
    ['seeded', 'receipt_seq', 'receipt_year'].forEach(k => localStorage.removeItem(`gr:set:${k}`));
    await this.seedIfEmpty();
  },
};

window.STORE = STORE;
