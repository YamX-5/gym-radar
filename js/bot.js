/* =========================================================================
   Gym Radar — assistant (Arabic intent engine, NOT an LLM)
   Normalizes Arabic, matches intents over local data, returns rich cards.
   Revenue intents are admin-only.
   ========================================================================= */
function normAr(t) {
  if (!t) return '';
  t = t.trim().replace(/[ً-ٰٟـ]/g, '');
  t = t.replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/[ىي]/g, 'ي').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي');
  '٠١٢٣٤٥٦٧٨٩'.split('').forEach((a, i) => { t = t.split(a).join(i); });
  return t.replace(/\s+/g, ' ').trim();
}
const has = (t, ...w) => w.some(x => t.includes(x));
const intInText = t => { const m = t.match(/\d+/); return m ? +m[0] : null; };

const SUGGESTIONS = ['من انتهى اشتراكه؟', 'من ينتهي هذا الأسبوع؟', 'كم إيراد هذا الشهر؟', 'من عليه مستحقات؟', 'كم عدد الأعضاء النشطين؟', 'ماذا جرى اليوم؟'];

async function botAsk(raw, role = 'admin') {
  const t = normAr(raw); const admin = role === 'admin';
  const reply = (text, rows = [], kind = 'text') => ({ text, rows, kind });

  // revenue
  if (has(t, 'ايراد', 'دخل', 'دخلنا', 'مقبوضات', 'فلوس', 'مبلغ', 'قبضنا') && !has(t, 'دين', 'مستحق')) {
    if (!admin) return reply('هذه المعلومات مخصّصة للإدارة ');
    const [f, n] = mb(DOMAIN.today()); const v = await DOMAIN.round(await revBetween(f, n));
    return reply(`إيراد هذا الشهر حتى الآن: ${v} دينار.`);
  }
  // debts
  if (has(t, 'دين', 'ديون', 'مستحق', 'مستحقات', 'عليه', 'باقي')) {
    const ms = await DOMAIN.listMembers({ filter: 'debt' });
    if (!ms.length) return reply('لا توجد مستحقات قائمة ');
    const total = DOMAIN.round(ms.reduce((s, m) => s + m.debt, 0));
    return reply(`عدد الأعضاء الذين عليهم مستحقات: ${ms.length} — المجموع ${total} دينار.`, ms.map(row), 'debt');
  }
  // expiring within X / this week
  if (has(t, 'ينتهي', 'يخلص', 'قرب', 'قريب', 'هذا الاسبوع', 'الاسبوع', 'الجمعه')) {
    let days = intInText(t); if (days == null) days = has(t, 'اسبوع', 'جمعه') ? 7 : await DOMAIN.expiringDays();
    const ms = (await DOMAIN.listMembers({ filter: 'active' })).filter(m => m.days_left != null && m.days_left >= 0 && m.days_left <= days);
    if (!ms.length) return reply(`لا أحد ينتهي اشتراكه خلال ${days} يومًا `);
    return reply(`${ms.length} عضوًا ينتهي اشتراكهم خلال ${days} يومًا:`, ms.map(row), 'expiring');
  }
  // expired
  if (has(t, 'انتهى', 'انتهي', 'خلص', 'منتهي', 'منته')) {
    const ms = await DOMAIN.listMembers({ filter: 'expired' });
    if (!ms.length) return reply('لا توجد اشتراكات منتهية ');
    return reply(`${ms.length} اشتراكًا منتهيًا:`, ms.map(row), 'expired');
  }
  // active count
  if (has(t, 'عدد', 'كم') && has(t, 'عضو', 'اعضاء', 'نشط', 'نشطين', 'مشترك')) {
    const ms = await DOMAIN.listMembers({ filter: 'active' });
    return reply(`عدد الأعضاء النشطين: ${ms.length}.`);
  }
  // today summary
  if (has(t, 'اليوم', 'ملخص', 'ماذا جرى', 'الوضع')) {
    if (!admin) { const r = await DOMAIN.radar(); return reply(`ينتهي قريبًا: ${r.soon.length}\n منتهٍ: ${r.expired.length}\n عليهم مستحقات: ${r.debts.length}`); }
    return reply(await DOMAIN.digestText());
  }
  // member lookup by name
  const hit = await findMember(t);
  if (hit) {
    let info = `${hit.full_name}`;
    if (hit.plan_name) info += ` — ${hit.plan_name}`;
    if (hit.sub_status === 'expired') info += `\n منتهٍ${hit.days_left != null ? ' منذ ' + Math.abs(hit.days_left) + ' يومًا' : ''}`;
    else if (hit.days_left != null) info += `\n يتبقّى ${hit.days_left} يومًا (حتى ${hit.end_date})`;
    if (hit.debt > 0) info += `\n عليه مستحقات ${hit.debt} دينار`;
    return reply(info, [row(hit)], 'member');
  }
  return reply('لم أفهم سؤالك تمامًا. جرّب أحد هذه الأسئلة:');
}

function row(m) { return { id: m.id, full_name: m.full_name, phone: m.phone, days_left: m.days_left, end_date: m.end_date, plan_name: m.plan_name, debt: m.debt || 0 }; }
async function findMember(t) {
  const rows = await STORE.all('members'); let best = null;
  for (const r of rows) {
    const nn = normAr(r.full_name); if (!nn) continue;
    const toks = nn.split(' ').filter(x => x.length >= 2);
    if (nn && t.includes(nn) || toks.some(x => x.length >= 3 && t.includes(x))) {
      const m = await DOMAIN.enrich(r);
      if (!best || nn.length > best.s) best = { s: nn.length, m };
    }
  }
  return best ? best.m : null;
}
function mb(d) { return [new Date(d.getFullYear(), d.getMonth(), 1), new Date(d.getFullYear(), d.getMonth() + 1, 1)]; }
async function revBetween(a, b) { const ps = await STORE.where('payments', p => p.date >= a.toISOString().slice(0, 10) && p.date < b.toISOString().slice(0, 10)); return ps.reduce((s, p) => s + p.amount, 0); }

window.BOT = { ask: botAsk, SUGGESTIONS, normAr };
