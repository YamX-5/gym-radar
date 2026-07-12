/* =========================================================================
   Gym Radar — seed / demo data (formal Arabic)
   Deterministic so demos look identical each reset.
   ========================================================================= */
const DEFAULT_SETTINGS = {
  gym_name: 'Gym Radar',
  primary: '#F97316', primary2: '#FB923C', primary_ink: '#1A1205',
  theme: 'dark', lang: 'ar',
  expiring_days: '7', wa_cc: '962',
  attendance_enabled: '1',
};

const SEED_PLANS = [
  { name: 'شهري', type: 'duration', days: 30, sessions: null, price: 25 },
  { name: '3 أشهر', type: 'duration', days: 90, sessions: null, price: 60 },
  { name: '6 أشهر', type: 'duration', days: 180, sessions: null, price: 100 },
  { name: 'سنوي', type: 'duration', days: 365, sessions: null, price: 150 },
  { name: '12 حصة', type: 'session', days: null, sessions: 12, price: 35 },
];

const TEMPLATES = {
  pre_expiry: 'مرحبًا {الاسم} 👋\nاشتراكك في {النادي} ينتهي بتاريخ {تاريخ_الانتهاء} (يتبقّى {الأيام} يومًا).\nجدّد قبل انتهائه لتبقى مستمرًّا معنا 💪',
  expired: 'مرحبًا {الاسم} 👋\nانتهى اشتراكك في {النادي} منذ {الأيام} يومًا. اشتقنا إليك في النادي 💪\nيسعدنا تجديدك في أي وقت.',
  debt: 'مرحبًا {الاسم} 👋\nتذكير ودّي بأنّه بقي عليك مبلغ {المبلغ} دينار.\nشكرًا لك 🙏',
  welcome: 'أهلًا وسهلًا {الاسم} 🎉\nمرحبًا بك في {النادي}! اشتراكك فعّال حتى {تاريخ_الانتهاء}.\nبالتوفيق في رحلتك 💪',
};

async function SEED(store, includeDemo = true) {
  Object.entries(DEFAULT_SETTINGS).forEach(([k, v]) => store.setSetting(k, v));
  store.setSetting('templates', JSON.stringify(TEMPLATES));

  const plans = [];
  for (const p of SEED_PLANS) plans.push(await store.put('plans', { ...p }));

  if (!includeDemo) return;   // config-only (real DB): plans + settings, no demo members

  const first = ['محمد', 'أحمد', 'خالد', 'عمر', 'يوسف', 'طارق', 'زيد', 'فراس', 'حمزة', 'ناصر', 'سامر', 'باسل', 'أنس', 'معاذ', 'ليث', 'قصي', 'عبدالله', 'إبراهيم', 'مالك', 'أيمن', 'رامي', 'وسام', 'هيثم', 'بلال', 'عدي'];
  const last = ['الزعبي', 'عبيدات', 'الرواشدة', 'حدادين', 'الخطيب', 'المومني', 'العمري', 'نصّار', 'الشلبي', 'بني هاني', 'الطراونة', 'المجالي', 'الشريدة', 'خريسات', 'العدوان', 'الحوراني', 'السعدي', 'قطيشات', 'الزيود', 'عوّاد'];

  // deterministic PRNG
  let s = 42; const rnd = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
  const pick = a => a[Math.floor(rnd() * a.length)];
  const DAY = 86400000, today = new Date(); today.setHours(0, 0, 0, 0);
  const used = new Set();

  for (let i = 0; i < 42; i++) {
    let name; do { name = pick(first) + ' ' + pick(last); } while (used.has(name)); used.add(name);
    const phone = '079' + String(1000000 + Math.floor(rnd() * 9000000));
    const joinAgo = 30 + Math.floor(rnd() * 700);
    const status = i === 6 ? 'frozen' : 'active';
    const m = await store.put('members', {
      full_name: name, phone, gender: 'male', birth_date: null, notes: '',
      join_date: sIso(new Date(today - joinAgo * DAY)), status,
    });

    const plan = pick(plans);
    let end;
    if (i < 10) end = new Date(+today + (1 + Math.floor(rnd() * 7)) * DAY);      // expiring
    else if (i < 16) end = new Date(+today - (1 + Math.floor(rnd() * 30)) * DAY); // expired
    else end = new Date(+today + (8 + Math.floor(rnd() * 220)) * DAY);           // active
    const start = new Date(+end - (plan.days || 60) * DAY);

    const sub = await store.put('subscriptions', {
      member_id: m.id, plan_id: plan.id, plan_name: plan.name,
      start_date: sIso(start), end_date: plan.type === 'duration' ? sIso(end) : null,
      sessions_total: plan.sessions, sessions_used: plan.sessions ? Math.floor(rnd() * plan.sessions) : null,
      price_paid: plan.price, status: 'active', created_at: sIso(start),
    });

    // payment history (current + a few prior), scattered across the year for charts
    const nPrev = Math.floor(rnd() * 3);
    let cur = +start;
    for (let j = 0; j <= nPrev; j++) {
      await store.put('payments', {
        member_id: m.id, subscription_id: j === 0 ? sub.id : null, amount: plan.price,
        date: sIso(new Date(cur)), method: rnd() < 0.7 ? 'cash' : 'cliq',
        receipt: await store.nextReceipt(), note: 'اشتراك',
      });
      cur -= (plan.days || 60) * DAY;
    }
    // some debts
    if (i >= 16 && i < 22) {
      await store.put('debts', {
        member_id: m.id, amount: [10, 15, 20, 25, 30, 40][i - 16],
        created_date: sIso(new Date(+today - Math.floor(rnd() * 20) * DAY)),
        reason: 'باقٍ من الاشتراك', status: 'open', paid_date: null,
      });
    }
  }
}
function sIso(d) { return new Date(d).toISOString().slice(0, 10); }
window.SEED = SEED;
