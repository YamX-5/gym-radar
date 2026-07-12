/* =========================================================================
   Gym Radar — Supabase adapter
   Implements the SAME interface as LocalAdapter, so app.js / domain.js don't
   change at all. Activated automatically when config.js has a URL + key.

   Requires supabase-js (loaded via <script> in index.html → global `supabase`).
   ========================================================================= */
class SupabaseAdapter {
  constructor(url, key) {
    this.isLocal = false;
    this.sb = supabase.createClient(url, key);
    this._settings = {};   // small key/value cache so getSetting stays synchronous
    this.gymId = null;     // set at login (from staff row); scopes settings writes
    this.role = null;
  }

  async init() {
    // load THIS gym's settings into memory (RLS returns only my gym's rows)
    const { data } = await this.sb.from('app_settings').select('key,value');
    this._settings = {};
    (data || []).forEach(r => this._settings[r.key] = r.value);
  }

  async all(e) { const { data, error } = await this.sb.from(e).select('*'); if (error) throw error; return data || []; }
  async get(e, id) { const { data } = await this.sb.from(e).select('*').eq('id', id).maybeSingle(); return data || null; }
  async where(e, pred) { return (await this.all(e)).filter(pred); }   // client-side predicate (fine for one gym's volume)

  async put(e, obj) {
    if (obj.id == null) {
      const { id, ...row } = obj;                                     // let Postgres assign the id
      const { data, error } = await this.sb.from(e).insert(row).select().single();
      if (error) throw error;
      Object.assign(obj, data);                                       // reflect generated id back to caller
      return data;
    }
    const { id, ...row } = obj;
    const { data, error } = await this.sb.from(e).update(row).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }
  async del(e, id) { const { error } = await this.sb.from(e).delete().eq('id', id); if (error) throw error; return true; }
  async bulkPut(e, arr) {
    const rows = arr.map(({ id, ...r }) => r);
    const { data, error } = await this.sb.from(e).insert(rows).select();
    if (error) throw error;
    return data;
  }

  // settings — cached in memory, written through to the DB
  getSetting(k, d) { const v = this._settings[k]; return v == null ? d : v; }
  allSettings() { return { ...this._settings }; }
  setSetting(k, v) {
    this._settings[k] = String(v);
    // gym_id has a DB default (my_gym()), but send it explicitly so upsert's
    // conflict target (gym_id,key) matches and updates the right gym's row.
    const row = { key: k, value: String(v) };
    if (this.gymId) row.gym_id = this.gymId;
    this.sb.from('app_settings').upsert(row, { onConflict: 'gym_id,key' }).then(() => {}, () => {});
  }

  async nextReceipt() { const { data, error } = await this.sb.rpc('next_receipt'); if (error) throw error; return data; }

  async export() {
    const o = { settings: this.allSettings() };
    for (const e of ['members', 'plans', 'subscriptions', 'payments', 'debts', 'reminders']) o[e] = await this.all(e);
    return o;
  }
  async isEmpty() { const { count } = await this.sb.from('members').select('id', { count: 'exact', head: true }); return (count || 0) === 0; }
}

/* activate if configured */
if (window.GR_CONFIG && window.GR_CONFIG.supabaseUrl && window.GR_CONFIG.supabaseAnonKey && typeof supabase !== 'undefined') {
  STORE.adapter = new SupabaseAdapter(window.GR_CONFIG.supabaseUrl, window.GR_CONFIG.supabaseAnonKey);
  console.log('[Gym Radar] using Supabase backend');
}
