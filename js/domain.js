/* =========================================================================
   Gym Radar — domain logic (ported from the Flask services layer)
   Subscription status, radar, KPIs, revenue, digest. Async over STORE.
   ========================================================================= */
const DAY = 86400000;
const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const iso = d => new Date(d).toISOString().slice(0, 10);
const parse = s => { const d = new Date(s + 'T00:00:00'); return d; };
const daysBetween = (a, b) => Math.round((parse(b) - parse(a)) / DAY);

async function expiringDays() { return +STORE.getSetting('expiring_days', 7); }

/* current subscription = most recent by start_date */
async function currentSub(memberId) {
  const subs = (await STORE.where('subscriptions', s => s.member_id === memberId))
    .sort((a, b) => (a.start_date < b.start_date ? 1 : -1));
  return subs[0] || null;
}
async function debtTotal(memberId) {
  const ds = await STORE.where('debts', d => d.member_id === memberId && d.status === 'open');
  return round(ds.reduce((a, b) => a + b.amount, 0));
}

function subState(sub, exDays) {
  if (!sub) return { status: 'none', daysLeft: null, sessionsLeft: null, progress: 0 };
  if (sub.sessions_total != null && !sub.end_date) {
    const left = Math.max(0, sub.sessions_total - (sub.sessions_used || 0));
    const status = left <= 0 ? 'finished' : (left <= 2 ? 'expiring' : 'active');
    return { status, daysLeft: null, sessionsLeft: left, progress: sub.sessions_total ? (sub.sessions_used || 0) / sub.sessions_total : 0 };
  }
  if (!sub.end_date) return { status: 'active', daysLeft: null, sessionsLeft: null, progress: 0 };
  const dl = daysBetween(iso(today()), sub.end_date);
  const status = dl < 0 ? 'expired' : (dl <= exDays ? 'expiring' : 'active');
  let progress = 0;
  if (sub.start_date && sub.end_date) {
    const span = daysBetween(sub.start_date, sub.end_date);
    const done = daysBetween(sub.start_date, iso(today()));
    progress = span ? Math.min(1, Math.max(0, done / span)) : 0;
  }
  return { status, daysLeft: dl, sessionsLeft: null, progress };
}

async function enrich(member, exDays) {
  if (exDays == null) exDays = await expiringDays();
  const sub = await currentSub(member.id);
  const st = subState(sub, exDays);
  return {
    ...member, subscription: sub, sub_status: st.status, days_left: st.daysLeft,
    sessions_left: st.sessionsLeft, progress: st.progress, debt: await debtTotal(member.id),
    plan_name: sub ? sub.plan_name : null, end_date: sub ? sub.end_date : null,
  };
}

async function listMembers({ search = '', filter = null } = {}) {
  let rows = await STORE.all('members');
  const exDays = await expiringDays();
  if (search) { const q = search.trim(); rows = rows.filter(m => (m.full_name || '').includes(q) || (m.phone || '').includes(q)); }
  let out = [];
  for (const r of rows) out.push(await enrich(r, exDays));
  out.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || '', 'ar'));
  if (filter === 'expiring') out = out.filter(m => m.sub_status === 'expiring');
  else if (filter === 'expired') out = out.filter(m => ['expired', 'finished'].includes(m.sub_status));
  else if (filter === 'active') out = out.filter(m => ['active', 'expiring'].includes(m.sub_status));
  else if (filter === 'debt') out = out.filter(m => m.debt > 0);
  return out;
}

async function remindedToday(memberId, kind) {
  const r = await STORE.where('reminders', x => x.member_id === memberId && x.kind === kind && x.sent_date === iso(today()));
  return r.length > 0;
}

async function radar() {
  const exDays = await expiringDays();
  const members = await STORE.where('members', m => m.status !== 'left');
  const soon = [], expired = [], debts = [];
  for (const r of members) {
    const m = await enrich(r, exDays);
    const base = { id: m.id, full_name: m.full_name, phone: m.phone, plan_name: m.plan_name, days_left: m.days_left, end_date: m.end_date, debt: m.debt };
    if (m.sub_status === 'expiring') soon.push({ ...base, reminded: await remindedToday(m.id, 'pre_expiry') });
    else if (['expired', 'finished'].includes(m.sub_status)) expired.push({ ...base, reminded: await remindedToday(m.id, 'expired') });
    if (m.debt > 0) debts.push({ ...base, reminded: await remindedToday(m.id, 'debt') });
  }
  soon.sort((a, b) => (a.days_left ?? 999) - (b.days_left ?? 999));
  expired.sort((a, b) => (a.days_left ?? 0) - (b.days_left ?? 0));
  debts.sort((a, b) => b.debt - a.debt);
  return { soon, expired, debts };
}

/* create subscription (+ payment) — renewal */
async function createSubscription(memberId, planId, { start, price, method = 'cash', makePayment = true } = {}) {
  const plan = await STORE.get('plans', planId);
  if (!plan) throw new Error('plan not found');
  const startD = start ? parse(start) : today();
  const endD = plan.type === 'duration' ? new Date(+startD + (plan.days || 0) * DAY) : null;
  const priceP = price != null ? +price : plan.price;
  const sub = await STORE.put('subscriptions', {
    member_id: memberId, plan_id: planId, plan_name: plan.name,
    start_date: iso(startD), end_date: endD ? iso(endD) : null,
    sessions_total: plan.type === 'session' ? plan.sessions : null, sessions_used: 0,
    price_paid: priceP, status: 'active', created_at: iso(today()),
  });
  let receipt = null;
  if (makePayment && priceP > 0) {
    receipt = await STORE.nextReceipt();
    await STORE.put('payments', { member_id: memberId, subscription_id: sub.id, amount: priceP, date: iso(today()), method, receipt, note: 'اشتراك' });
  }
  return { sub, receipt };
}

/* revenue + KPIs */
function monthBounds(d) { const f = new Date(d.getFullYear(), d.getMonth(), 1); const n = new Date(d.getFullYear(), d.getMonth() + 1, 1); return [f, n]; }
async function revenueBetween(a, b) {
  const ps = await STORE.where('payments', p => p.date >= iso(a) && p.date < iso(b));
  return round(ps.reduce((s, p) => s + p.amount, 0));
}
async function kpis() {
  const t = today(); const [f, n] = monthBounds(t);
  const [pf] = monthBounds(new Date(+f - DAY));
  const revM = await revenueBetween(f, n), revP = await revenueBetween(pf, f);
  const exDays = await expiringDays();
  let active = 0, expired = 0;
  for (const r of await STORE.all('members')) {
    const st = subState(await currentSub(r.id), exDays);
    if (['active', 'expiring'].includes(st.status) && r.status === 'active') active++;
    if (['expired', 'finished'].includes(st.status) && r.status !== 'left') expired++;
  }
  const renM = (await STORE.where('subscriptions', s => s.start_date >= iso(f) && s.start_date < iso(n))).length;
  const renP = (await STORE.where('subscriptions', s => s.start_date >= iso(pf) && s.start_date < iso(f))).length;
  const debt = round((await STORE.where('debts', d => d.status === 'open')).reduce((s, d) => s + d.amount, 0));
  const trend = (c, p) => p === 0 ? (c > 0 ? 100 : 0) : round((c - p) / p * 100, 1);
  return {
    revenue: { value: revM, trend: trend(revM, revP), spark: await revSpark() },
    active: { value: active }, renewals: { value: renM, trend: trend(renM, renP) },
    debts: { value: debt }, expired: { value: expired },
  };
}
async function revSpark(months = 6) {
  const out = []; const t = today();
  for (let i = months - 1; i >= 0; i--) { const d = new Date(t.getFullYear(), t.getMonth() - i, 1); const [f, n] = monthBounds(d); out.push(await revenueBetween(f, n)); }
  return out;
}
async function revByMonth(months = 6) {
  const labels = [], values = []; const t = today();
  const AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  for (let i = months - 1; i >= 0; i--) { const d = new Date(t.getFullYear(), t.getMonth() - i, 1); const [f, n] = monthBounds(d); labels.push(AR[d.getMonth()]); values.push(await revenueBetween(f, n)); }
  return { labels, values };
}
async function revByPlan() {
  const pays = await STORE.all('payments');
  const map = {};
  for (const p of pays) {
    let name = 'أخرى';
    if (p.subscription_id) { const s = await STORE.get('subscriptions', p.subscription_id); if (s) name = s.plan_name; }
    map[name] = (map[name] || 0) + p.amount;
  }
  return Object.entries(map).map(([k, v]) => ({ label: k, value: round(v) })).sort((a, b) => b.value - a.value);
}
async function methodSplit() {
  const pays = await STORE.all('payments');
  const tot = pays.reduce((s, p) => s + p.amount, 0) || 1;
  const map = {};
  for (const p of pays) map[p.method] = (map[p.method] || 0) + p.amount;
  const AR = { cash: 'نقدًا', cliq: 'كليك', other: 'أخرى' };
  return Object.entries(map).map(([k, v]) => ({ label: AR[k] || k, pct: Math.round(v / tot * 100) }));
}

async function revenueAtRisk() {
  const r = await radar();
  // dinars tied up in expiring + expired subs this week + open debts
  let risk = 0;
  for (const m of [...r.soon, ...r.expired]) {
    const sub = await currentSub(m.id);
    if (sub) risk += sub.price_paid || 0;
  }
  return { risk: round(risk), needReminder: r.soon.length + r.expired.length };
}

async function digestText() {
  const t = today();
  const todayRev = await revenueBetween(t, new Date(+t + DAY));
  const todayRen = (await STORE.where('subscriptions', s => s.start_date === iso(t))).length;
  const r = await radar();
  const debt = round((await STORE.where('debts', d => d.status === 'open')).reduce((s, d) => s + d.amount, 0));
  const gym = STORE.getSetting('gym_name', 'النادي');
  return [`ملخّص ${gym} — ${iso(t)}`, `مقبوضات اليوم: ${todayRev} دينار`, `تجديدات اليوم: ${todayRen}`,
    `ينتهي قريبًا: ${r.soon.length}`, `منتهٍ: ${r.expired.length}`, `مستحقات قائمة: ${debt} دينار`].join('\n');
}

function round(n, d = 2) { const f = 10 ** d; return Math.round((+n || 0) * f) / f; }
window.DOMAIN = { today, iso, enrich, listMembers, radar, createSubscription, kpis, revByMonth, revByPlan, methodSplit, revenueAtRisk, digestText, currentSub, subState, expiringDays, round };
