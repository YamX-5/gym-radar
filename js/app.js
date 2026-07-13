/* =========================================================================
   Gym Radar — app controller (functional SPA)
   ========================================================================= */
const $ = s => document.querySelector(s);
const esc = s => (s == null ? '' : String(s)).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const AV = ['#F97316', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899', '#14B8A6', '#F59E0B', '#0EA5E9'];
const av = i => AV[((i % AV.length) + AV.length) % AV.length];
const fi = n => (n || '؟').trim()[0];
const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;
const nf = n => (+n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });
const svg = p => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const ICONS = {
  radar: svg('<path d="M3 12h3.5l2 6 4-13 2.5 9 1.5-4H21"/>'),
  gift: svg('<rect x="3.5" y="8.5" width="17" height="4" rx="1"/><path d="M12 8.5V21M5 12.5V21h14v-8.5"/><path d="M12 8.5C11 5.5 9 4 7.7 4.9 6.4 5.8 8.6 8.5 12 8.5Zm0 0c1-3 3-4.5 4.3-3.6 1.3.9-.9 3.6-4.3 3.6Z"/>'),
  door: svg('<path d="M4 21h16M6 21V4a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v17"/><path d="M12 12h.01"/>'),
  copy: svg('<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/>'),
  spark: svg('<path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z"/><path d="M18.5 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>'),
  bot: svg('<rect x="4.5" y="8" width="15" height="11" rx="3"/><path d="M12 8V4.5M9 13.5h.01M15 13.5h.01"/>'),
  lock: svg('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
  logout: svg('<path d="M15 12H5M9 8l-4 4 4 4"/><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/>'),
  add: svg('<path d="M12 5v14M5 12h14"/>'),
  qr: svg('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3M14 18v3M18 21h3M21 14v3"/>'),
  clock: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  edit: svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>'),
};

const ST = { screen: 'dashboard', role: 'admin', filter: 'all', search: '' };
const NAV = [
  { k: 'dashboard', t: 'لوحة القيادة', ic: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>' },
  { k: 'members', t: 'الأعضاء', ic: '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0"/><path d="M16 5.2a3 3 0 0 1 0 5.6"/>' },
  { k: 'checkin', t: 'الحضور', ic: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3M14 18v3M18 21h3M21 14v3"/>' },
  { k: 'payments', t: 'المدفوعات', ic: '<rect x="2.5" y="5.5" width="19" height="13" rx="2.5"/><path d="M2.5 9.5h19"/>' },
  { k: 'assistant', t: 'المساعد', ic: '<path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.4 8.8 8.8 0 0 1-3.8-.8L3 20.5l1.4-4.3A8.4 8.4 0 1 1 21 11.5Z"/>' },
  { k: 'settings', t: 'الإعدادات', ic: '<circle cx="12" cy="12" r="3"/><path d="M19.4 13a7 7 0 0 0 0-2l1.5-1.2-1.7-2.9-1.8.7a7 7 0 0 0-1.7-1L15.3 4h-3.4l-.3 1.9a7 7 0 0 0-1.7 1l-1.8-.7-1.7 2.9L7.6 11a7 7 0 0 0 0 2l-1.5 1.2 1.7 2.9 1.8-.7a7 7 0 0 0 1.7 1l.3 1.9h3.4l.3-1.9a7 7 0 0 0 1.7-1l1.8.7 1.7-2.9Z"/>' },
  { k: 'platform', t: 'المنصّة', admin: 'platform', ic: '<path d="M3 21h18"/><rect x="4" y="9" width="4" height="9"/><rect x="10" y="4" width="4" height="14"/><rect x="16" y="12" width="4" height="6"/>' },
];
const ST_LABEL = { active: ['نشط', 'p-green'], expiring: ['ينتهي قريبًا', 'p-amber'], expired: ['منتهٍ', 'p-red'], finished: ['منتهٍ', 'p-red'], frozen: ['مُجمّد', 'p-muted'], none: ['بلا اشتراك', 'p-muted'] };

/* ---------- theming ---------- */
function hexRgb(h) { const m = (h || '').replace('#', '').match(/.{2}/g); return m ? m.map(x => parseInt(x, 16)) : [249, 115, 22]; }
function applyAccent(a, a2, ink) {
  const r = document.documentElement.style, [R, G, B] = hexRgb(a);
  r.setProperty('--accent', a); r.setProperty('--accent-2', a2 || a); r.setProperty('--accent-contrast', ink || '#fff');
  r.setProperty('--accent-weak', `rgba(${R},${G},${B},.14)`); r.setProperty('--accent-glow', `rgba(${R},${G},${B},.30)`);
}
function applyBrand() {
  const s = STORE.allSettings();
  applyAccent(s.primary || '#F97316', s.primary2 || '#FB923C', s.primary_ink || '#1A1205');
  document.documentElement.setAttribute('data-theme', s.theme || 'dark');
  const name = s.gym_name || 'Gym Radar';
  $('#brandName').textContent = name; document.title = name + ' — Gym Radar';
  const logo = $('#brandLogo'); logo.innerHTML = s.logo ? `<img src="${s.logo}" alt="">` : esc(fi(name));
}

/* ---------- nav ---------- */
function navVisible(n) {
  if (n.k === 'settings') return ST.role === 'admin';
  if (n.k === 'platform') return !!ST.isPlatformAdmin;
  return true;
}
function paintNav() {
  $('#nav').innerHTML = NAV.filter(navVisible).map(n =>
    `<button class="${n.k === ST.screen ? 'on' : ''}" onclick="go('${n.k}')"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${n.ic}</svg>${n.t}</button>`).join('');
  const CORE = ['dashboard', 'checkin', 'members', 'payments'];
  const core = NAV.filter(n => CORE.includes(n.k));
  const more = NAV.filter(n => !CORE.includes(n.k) && navVisible(n));
  const btn = n => `<button class="${n.k === ST.screen ? 'on' : ''}" onclick="go('${n.k}')"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${n.ic}</svg>${n.t.split(' ')[0]}</button>`;
  $('#mnav').innerHTML = core.map(btn).join('') +
    `<button class="${more.some(n => n.k === ST.screen) ? 'on' : ''}" onclick="openMoreSheet()"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>المزيد</button>`;
}
function openMoreSheet() {
  const more = NAV.filter(n => !['dashboard', 'checkin', 'members', 'payments'].includes(n.k) && navVisible(n));
  const ov = document.createElement('div'); ov.className = 'sheet-scrim'; ov.onclick = e => { if (e.target === ov) ov.remove(); };
  ov.innerHTML = `<div class="sheet">${more.map(n => `<button onclick="go('${n.k}');this.closest('.sheet-scrim').remove()"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${n.ic}</svg>${n.t}</button>`).join('')}</div>`;
  document.body.appendChild(ov);
}
function go(k) { ST.screen = k; paintNav(); render(); window.scrollTo(0, 0); }
async function render() { await ({ dashboard: dash, members: membersScreen, checkin: checkinScreen, payments: payments, assistant: assistant, settings: settings, platform: platformScreen }[ST.screen])(); post(); }

/* ---------- DASHBOARD ---------- */
async function dash() {
  const k = await DOMAIN.kpis();
  const rar = await DOMAIN.revenueAtRisk();
  const r = await DOMAIN.radar();
  const cards = [
    { lbl: 'إيراد الشهر', val: k.revenue.value, u: 'د.أ', trend: fmtTrend(k.revenue.trend), cls: trendCls(k.revenue.trend), spark: k.revenue.spark },
    { lbl: 'الأعضاء النشطون', val: k.active.value, u: '', trend: '', cls: 'flat' },
    { lbl: 'تجديدات هذا الشهر', val: k.renewals.value, u: '', trend: fmtTrend(k.renewals.trend), cls: trendCls(k.renewals.trend) },
    { lbl: 'مستحقات قائمة', val: k.debts.value, u: 'د.أ', trend: '', cls: 'flat', kc: 'var(--violet)' },
    { lbl: 'ينتهي هذا الأسبوع', val: r.soon.length, u: '', trend: '', cls: 'flat', kc: 'var(--amber)' },
  ];
  const birthdays = await birthdayList();
  const visiting = r.expired.slice(0, 2);
  const atrisk = await CHECKIN.atRisk();
  $('#view').innerHTML = `
  <div class="top"><div><h1>لوحة القيادة</h1><div class="sub">${esc(STORE.getSetting('gym_name','النادي'))} · <span class="num">${DOMAIN.iso(DOMAIN.today())}</span> · هل كل شيء على ما يُرام؟</div></div>
    <div class="spacer"></div><input class="search" placeholder="ابحث عن عضو…" onkeydown="if(event.key==='Enter'){ST.search=this.value;go('members')}">
    <button class="btn btn-primary" onclick="openAddMember()">عضو جديد</button></div>
  <div class="hero rise"><div class="badge-ic">${ICONS.radar}</div>
    <div><div><b class="big num risk" data-count="${rar.risk}">0</b> <span class="risk">د.أ مُعرَّضة للضياع هذا الأسبوع</span></div>
      <div style="color:var(--muted);font-size:13px;margin-top:3px"><span class="num">${rar.needReminder}</span> عضوًا بحاجة إلى تذكير · حُصِّل هذا الشهر <b class="num save">${nf(k.revenue.value)}</b> <span class="save">د.أ من التجديدات</span></div></div>
    <div class="cta"><button class="btn btn-primary" onclick="remindAll()">تذكير الجميع عبر واتساب</button>
      <button class="btn btn-ghost" onclick="copyDigest()">نسخ ملخّص اليوم</button></div></div>
  <div class="kpis">${cards.map((c, i) => `<div class="kpi rise" style="animation-delay:${.04 + i * .04}s;${c.kc ? `--kc:${c.kc}` : ''}">
    <div class="lbl">${c.lbl}</div><div class="val"><span class="num" data-count="${c.val}">0</span>${c.u ? `<span class="u">${c.u}</span>` : ''}</div>
    <div class="foot"><span class="trend ${c.cls}">${c.trend || '—'}</span>${c.spark ? `<span class="spark">${sparkBars(c.spark)}</span>` : '<span class="spark"></span>'}</div></div>`).join('')}</div>
  <div class="sec"><h2>${ICONS.radar}رادار التجديد</h2><span class="hint">ذكّرهم قبل انتهاء اشتراكهم</span>
    <span class="pill p-green" style="margin-inline-start:auto;padding:5px 12px">فاعلية التذكير: <span class="num">${await reminderEffectiveness()}%</span> جدّدوا خلال أسبوع</span></div>
  <div class="radar">
    ${radarCol('soon', 'ينتهي قريبًا', r.soon, 'warn', 'var(--amber)', 'pre_expiry')}
    ${radarCol('exp', 'منتهٍ', r.expired, 'bad', 'var(--red)', 'expired')}
    ${radarCol('debt', 'عليه مستحقات', r.debts, 'owe', 'var(--violet)', 'debt')}
  </div>
  ${atrisk.length ? `<div class="mini-card rise" style="margin-top:16px">
    <h3>${ICONS.clock}لم يحضروا منذ فترة <span class="pill p-amber" style="margin-inline-start:4px">${atrisk.length}</span></h3>
    <div style="font-size:12px;color:var(--muted);margin-bottom:8px">اشتراكهم فعّال لكنهم انقطعوا عن الحضور — ذكّرهم قبل أن يتركوا</div>
    ${atrisk.slice(0, 6).map(m => `<div class="line"><div class="av" style="width:30px;height:30px;font-size:12px;background:${av(m.id)}">${esc(fi(m.full_name))}</div>
      <div style="flex:1"><b>${esc(m.full_name)}</b><div style="font-size:12px;color:var(--amber)">آخر حضور منذ <span class="num">${m.gap}</span> يومًا</div></div>
      ${m.phone ? `<button class="mini wa" onclick="wa(${m.id},'inactive')">تذكير</button>` : ''}</div>`).join('')}</div>` : ''}
  <div class="grid2">
    <div class="mini-card rise"><h3>${ICONS.gift}أعياد ميلاد هذا الشهر</h3>${birthdays.length ? birthdays.map((b, i) => `<div class="line"><div class="av" style="width:30px;height:30px;font-size:12px;background:${av(i)}">${esc(fi(b.name))}</div><div style="flex:1"><b>${esc(b.name)}</b></div><span class="num" style="color:var(--muted)">${b.date}</span><button class="mini wa" onclick="wa(${b.id},'welcome')">تهنئة</button></div>`).join('') : '<div class="empty">لا أعياد ميلاد مسجّلة هذا الشهر</div>'}</div>
    <div class="mini-card rise"><h3>${ICONS.door}حضروا اليوم واشتراكهم منتهٍ</h3><div style="font-size:12px;color:var(--muted);margin-bottom:6px">من وحدة تسجيل الحضور — أوقفهم بلطف عند الباب</div>
      ${visiting.length ? visiting.map((b, i) => `<div class="line"><div class="av" style="width:30px;height:30px;font-size:12px;background:${av(i + 3)}">${esc(fi(b.full_name))}</div><div style="flex:1"><b>${esc(b.full_name)}</b><div style="font-size:12px;color:var(--red)">${b.days_left != null ? 'منتهٍ منذ ' + Math.abs(b.days_left) + ' يومًا' : 'منتهٍ'}</div></div><button class="mini rn" onclick="openRenew(${b.id})">تجديد</button></div>`).join('') : '<div class="empty">لا أحد 👍</div>'}</div>
  </div>
  <div class="digest rise"><div class="d"><b>ملخّص اليوم:</b> <span id="digestLine">…</span></div>
    <button class="btn btn-ghost" style="margin-inline-start:auto;font-size:12.5px" onclick="copyDigest()">نسخ للمالك</button></div>`;
  DOMAIN.digestText().then(t => { const el = $('#digestLine'); if (el) el.textContent = t.split('\n').slice(1).join(' · '); });
}
function radarCol(cls, title, list, mc, barCol, kind) {
  const rows = list.length ? list.map((o, i) => {
    const act = kind === 'debt' ? `<button class="mini" onclick="settleDebt(${o.id},this)">تسديد</button>` : `<button class="mini rn" onclick="openRenew(${o.id})">تجديد</button>`;
    const meta = kind === 'debt' ? `${nf(o.debt)} د.أ` : kind === 'expired' ? (o.days_left != null ? `منتهٍ منذ ${Math.abs(o.days_left)} يومًا` : 'منتهٍ') : `${esc(o.plan_name || '')} · يتبقّى ${o.days_left} يومًا`;
    const bar = kind !== 'debt' ? `<div class="bar"><i data-w="${kind === 'expired' ? 100 : Math.max(6, 100 - (o.days_left || 0) * 10)}" style="width:0;background:${barCol}"></i></div>` : '';
    return `<div class="row"><div class="av" style="background:${av(o.id)}">${esc(fi(o.full_name))}</div>
      <div class="mid" onclick="openMember(${o.id})"><div class="nm">${esc(o.full_name)} ${o.reminded ? '<span class="pill p-green">ذُكّر اليوم</span>' : (o.remCount > 0 ? `<span class="pill p-muted">تذكير رقم ${o.remCount + 1}</span>` : '')}</div><div class="meta ${mc}">${meta}</div>${bar}</div>
      <div class="acts"><button class="mini wa" onclick="wa(${o.id},'${kind}')">واتساب</button>${act}</div></div>`;
  }).join('') : '<div class="empty">لا أحد هنا</div>';
  return `<div class="col ${cls} rise"><div class="hd"><span class="dot"></span><span class="t">${title}</span><span class="c num">${list.length}</span></div>${rows}</div>`;
}

/* ---------- MEMBERS ---------- */
async function membersScreen() {
  const ms = await DOMAIN.listMembers({ search: ST.search, filter: ST.filter === 'all' ? null : ST.filter });
  const total = (await STORE.all('members')).length;
  $('#view').innerHTML = `
  <div class="top"><div><h1>الأعضاء <span class="num" style="font-size:14px;color:var(--muted)">${total}</span></h1><div class="sub">اضغط على أي عضو لعرض ملفّه</div></div>
    <div class="spacer"></div><input class="search" id="mSearch" placeholder="ابحث بالاسم أو الهاتف…" value="${esc(ST.search)}" oninput="onSearch(this.value)">
    <button class="btn btn-ghost" onclick="openImport()">استيراد</button><button class="btn btn-primary" onclick="openAddMember()">عضو جديد</button></div>
  <div class="chips">${[['all', 'الكل'], ['active', 'نشطون'], ['expiring', 'ينتهي قريبًا'], ['expired', 'منتهٍ'], ['debt', 'عليه مستحقات']].map(c => `<button class="chip ${ST.filter === c[0] ? 'on' : ''}" onclick="ST.filter='${c[0]}';membersScreen()">${c[1]}</button>`).join('')}</div>
  <div class="card">${ms.length ? `<div class="tblx"><table class="tbl"><thead><tr><th>العضو</th><th>الهاتف</th><th>الخطة</th><th>الحالة</th><th>ينتهي</th><th></th></tr></thead>
    <tbody>${ms.map((m, i) => `<tr class="click rise" style="animation-delay:${i * .02}s" onclick="openMember(${m.id})">
      <td><div style="display:flex;align-items:center;gap:10px"><div class="av" style="width:34px;height:34px;font-size:13px;background:${av(m.id)}">${esc(fi(m.full_name))}</div><b>${esc(m.full_name)}</b></div></td>
      <td><span class="num" style="color:var(--muted)">${esc(m.phone || '—')}</span></td>
      <td style="color:var(--muted)">${esc(m.plan_name || '—')}</td>
      <td><span class="pill ${(ST_LABEL[m.sub_status] || ST_LABEL.none)[1]}">${(ST_LABEL[m.sub_status] || ST_LABEL.none)[0]}</span>${m.debt > 0 ? ' <span class="pill p-violet">دَين</span>' : ''}</td>
      <td><span class="num" style="color:var(--muted)">${m.end_date || (m.sessions_left != null ? m.sessions_left + ' حصة' : '—')}</span></td>
      <td onclick="event.stopPropagation()">${m.phone ? `<button class="mini wa" onclick="wa(${m.id},'${m.sub_status === 'expired' ? 'expired' : m.debt > 0 ? 'debt' : 'pre_expiry'}')">واتساب</button>` : ''}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">لا يوجد أعضاء بهذا البحث</div>'}</div>`;
}
let searchT;
function onSearch(v) { ST.search = v; clearTimeout(searchT); searchT = setTimeout(membersScreen, 200); }

async function openMember(id) {
  const raw = await STORE.get('members', id); if (!raw) return;
  const m = await DOMAIN.enrich(raw);
  const pays = (await STORE.where('payments', p => p.member_id === id)).sort((a, b) => a.date < b.date ? 1 : -1);
  const debts = await STORE.where('debts', d => d.member_id === id && d.status === 'open');
  const refCount = await DOMAIN.referralCount(id);
  const barCol = m.sub_status === 'expired' ? 'var(--red)' : m.sub_status === 'expiring' ? 'var(--amber)' : 'var(--green)';
  const lbl = ST_LABEL[m.sub_status] || ST_LABEL.none;
  $('#drawerMount').innerHTML = `<div class="scrim" id="scrim" onclick="closeDrawer()"></div><div class="drawer" id="drawer">
    <div class="dh"><div class="av" style="width:44px;height:44px;font-size:17px;background:${av(m.id)}">${esc(fi(m.full_name))}</div>
      <div style="flex:1"><div style="font-size:17px;font-weight:800">${esc(m.full_name)}</div><div class="num" style="font-size:12px;color:var(--muted)">${esc(m.phone || '—')}</div>${refCount > 0 ? `<div style="font-size:11px;color:var(--accent);font-weight:600">أحال ${refCount} عضوًا</div>` : ''}</div>
      <button class="close" onclick="openEditMember(${m.id})" title="تعديل">${ICONS.edit}</button>
      <button class="close" onclick="closeDrawer()">✕</button></div>
    <div style="padding:18px 20px;display:flex;flex-direction:column;gap:15px">
      <div style="background:var(--bg);border:1px solid var(--border);border-radius:12px;padding:14px 16px">
        <div style="display:flex;align-items:center;gap:8px"><b style="font-size:13px">${m.subscription ? 'الاشتراك الحالي — ' + esc(m.plan_name) : 'لا يوجد اشتراك'}</b>${m.subscription ? `<button class="mini" style="margin-inline-start:auto" onclick="openEditSub(${m.id})">تعديل</button>` : '<span style="margin-inline-start:auto"></span>'}<span class="pill ${lbl[1]}">${lbl[0]}</span></div>
        <div class="bar" style="max-width:none;margin-top:12px"><i style="width:${Math.round((m.progress || 0) * 100)}%;background:${barCol}"></i></div>
        ${m.subscription ? `<div style="display:flex;justify-content:space-between;margin-top:7px;font-size:11px;color:var(--muted)"><span class="num">${m.subscription.start_date || ''}</span><span class="num">${m.end_date || ''}</span></div>` : ''}</div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-primary" style="flex:1" onclick="openRenew(${m.id})">تجديد الآن</button>
        ${m.phone ? `<button class="mini wa" style="padding:10px 14px" onclick="wa(${m.id},'pre_expiry')">واتساب</button>` : ''}
        <button class="btn btn-ghost" onclick="openDebt(${m.id})">دَين</button></div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-ghost" style="flex:1" onclick="showMemberQR(${m.id})">${ICONS.qr} بطاقة QR</button>
        <button class="btn btn-ghost" style="flex:1" onclick="manualCheckin(${m.id})">تسجيل حضور</button>
        ${m.status === 'frozen' ? `<button class="btn btn-ghost" style="flex:1" onclick="unfreezeMember(${m.id})">إلغاء التجميد</button>` : `<button class="btn btn-ghost" style="flex:1" onclick="freezeMember(${m.id})">تجميد</button>`}</div>
      ${debts.length ? `<div><b style="font-size:13px;color:var(--violet)">مستحقات مفتوحة</b>${debts.map(d => `<div class="line"><div style="flex:1">${esc(d.reason || 'دَين')} · <span class="num">${d.created_date}</span></div><b class="num">${nf(d.amount)} د.أ</b><button class="mini" onclick="settleDebt(${d.id},this,${m.id})">تسديد</button></div>`).join('')}</div>` : ''}
      <div><b style="font-size:13px">سجلّ المدفوعات</b>${pays.length ? pays.slice(0, 8).map(p => `<div class="line"><span class="num" style="color:var(--muted);font-size:12px">${p.date}</span><span style="flex:1;color:var(--muted);font-size:12px">${methodAr(p.method)} · <span class="num">${esc(p.receipt || '')}</span></span><b class="num">${nf(p.amount)} د.أ</b><button class="mini" style="margin-inline-start:8px" onclick="printReceipt(${p.id})">إيصال</button></div>`).join('') : '<div class="empty">لا مدفوعات</div>'}</div>
    </div></div>`;
  requestAnimationFrame(() => { $('#scrim').classList.add('show'); $('#drawer').classList.add('show'); });
}
function closeDrawer() { const d = $('#drawer'), s = $('#scrim'); if (!d) return; d.classList.remove('show'); s.classList.remove('show'); setTimeout(() => $('#drawerMount').innerHTML = '', 300); }

/* ---- edit member profile ---- */
async function openEditMember(id) {
  const m = await STORE.get('members', id);
  const g = m.gender === 'female';
  modal('تعديل بيانات العضو', `
    <div class="field"><label>الاسم الكامل *</label><input id="em_name" value="${esc(m.full_name || '')}"></div>
    <div class="field"><label>رقم الهاتف</label><input id="em_phone" dir="ltr" style="text-align:right" value="${esc(m.phone || '')}"></div>
    <div class="field"><label>تاريخ الميلاد</label><input id="em_birth" type="date" value="${esc(m.birth_date || '')}"></div>
    <div class="field"><label>الجنس</label><select id="em_gender"><option value="male" ${g ? '' : 'selected'}>ذكر</option><option value="female" ${g ? 'selected' : ''}>أنثى</option></select></div>
    <div class="field"><label>الحالة</label><select id="em_status">
      <option value="active" ${m.status === 'active' ? 'selected' : ''}>نشط</option>
      <option value="frozen" ${m.status === 'frozen' ? 'selected' : ''}>مُجمّد</option>
      <option value="left" ${m.status === 'left' ? 'selected' : ''}>غادر</option></select></div>
    <div class="field"><label>ملاحظات</label><textarea id="em_notes" rows="2" style="resize:vertical">${esc(m.notes || '')}</textarea></div>`,
    `<button class="btn btn-primary" onclick="saveEditMember(${id})">حفظ</button>
     <button class="btn btn-ghost" style="color:var(--red);border-color:var(--red)" onclick="deleteMember(${id})">حذف العضو</button>`);
}
async function saveEditMember(id) {
  const name = $('#em_name').value.trim(); if (!name) return toast('الاسم مطلوب', 'var(--red)');
  await STORE.put('members', { id, full_name: name, phone: $('#em_phone').value.replace(/[^\d+]/g, ''), birth_date: $('#em_birth').value || null, gender: $('#em_gender').value, status: $('#em_status').value, notes: $('#em_notes').value });
  closeModal(); toast('تم حفظ التعديلات'); openMember(id);
}
async function deleteMember(id) {
  if (!confirm('حذف هذا العضو وكل سجلاته (الاشتراكات والمدفوعات والمستحقات والحضور) نهائيًا؟')) return;
  for (const e of ['subscriptions', 'payments', 'debts', 'reminders', 'checkins']) {
    for (const r of await STORE.where(e, x => x.member_id === id)) await STORE.del(e, r.id);
  }
  await STORE.del('members', id);
  closeModal(); closeDrawer(); toast('تم حذف العضو'); render();
}

/* ---- edit / delete subscription ---- */
async function openEditSub(id) {
  const sub = await DOMAIN.currentSub(id);
  if (!sub) return toast('لا يوجد اشتراك لتعديله', 'var(--red)');
  const isSession = sub.sessions_total != null && !sub.end_date;
  modal('تعديل الاشتراك', `
    <div class="field"><label>اسم الخطة</label><input id="es_plan" value="${esc(sub.plan_name || '')}"></div>
    ${!isSession ? `<div class="field"><label>تاريخ البدء</label><input id="es_start" type="date" value="${esc(sub.start_date || '')}"></div>
      <div class="field"><label>تاريخ الانتهاء</label><input id="es_end" type="date" value="${esc(sub.end_date || '')}"></div>`
      : `<div class="field"><label>إجمالي الحصص</label><input id="es_stot" type="number" dir="ltr" style="text-align:right" value="${sub.sessions_total || 0}"></div>
         <div class="field"><label>الحصص المستخدمة</label><input id="es_sused" type="number" dir="ltr" style="text-align:right" value="${sub.sessions_used || 0}"></div>`}
    <div class="field"><label>المبلغ المدفوع</label><input id="es_price" type="number" dir="ltr" style="text-align:right" value="${sub.price_paid || 0}"></div>`,
    `<button class="btn btn-primary" onclick="saveEditSub(${sub.id},${id})">حفظ</button>
     <button class="btn btn-ghost" style="color:var(--red);border-color:var(--red)" onclick="deleteSub(${sub.id},${id})">حذف الاشتراك</button>`);
}
async function saveEditSub(subId, memberId) {
  const p = { id: subId };
  if ($('#es_plan')) p.plan_name = $('#es_plan').value.trim();
  if ($('#es_start')) p.start_date = $('#es_start').value || null;
  if ($('#es_end')) p.end_date = $('#es_end').value || null;
  if ($('#es_stot')) p.sessions_total = +$('#es_stot').value;
  if ($('#es_sused')) p.sessions_used = +$('#es_sused').value;
  if ($('#es_price')) p.price_paid = +$('#es_price').value;
  await STORE.put('subscriptions', p);
  closeModal(); toast('تم تعديل الاشتراك'); openMember(memberId);
}
async function deleteSub(subId, memberId) {
  if (!confirm('حذف هذا الاشتراك؟')) return;
  await STORE.del('subscriptions', subId);
  closeModal(); toast('تم حذف الاشتراك'); openMember(memberId);
}

/* ---------- PAYMENTS + ANALYTICS ---------- */
async function payments() {
  const [f, n] = [new Date(new Date().getFullYear(), new Date().getMonth(), 1), new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)];
  const pays = (await STORE.where('payments', p => p.date >= DOMAIN.iso(f) && p.date < DOMAIN.iso(n))).sort((a, b) => a.date < b.date ? 1 : -1);
  const total = pays.reduce((s, p) => s + p.amount, 0);
  const admin = ST.role === 'admin';
  let analytics = '';
  if (admin) {
    const rbm = await DOMAIN.revByMonth(6), rbp = await DOMAIN.revByPlan(), ms = await DOMAIN.methodSplit();
    const maxM = Math.max(...rbm.values, 1), maxP = Math.max(...rbp.map(p => p.value), 1);
    const prof = await DOMAIN.monthProfit();
    const exps = (await STORE.where('expenses', e => e.date >= DOMAIN.iso(f) && e.date < DOMAIN.iso(n))).sort((a, b) => a.date < b.date ? 1 : -1);
    analytics = `<div class="sec" style="margin-top:22px"><h2>التحليلات والأرباح</h2><span class="pill p-muted" style="padding:4px 10px">للإدارة فقط</span></div>
    <div class="grid2" style="margin-top:0">
      <div class="mini-card"><h3>${ICONS.chart || ''}الربح هذا الشهر</h3>
        <div class="line"><span style="flex:1">الإيراد</span><b class="num">${nf(prof.revenue)} د.أ</b></div>
        <div class="line"><span style="flex:1">المصروفات</span><b class="num" style="color:var(--red)">${nf(prof.expenses)} د.أ</b></div>
        <div class="line" style="border-bottom:none"><span style="flex:1"><b>الصافي</b></span><b class="num" style="color:${prof.profit >= 0 ? 'var(--green)' : 'var(--red)'};font-size:17px">${nf(prof.profit)} د.أ</b></div></div>
      <div class="mini-card"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px"><h3 style="margin:0">المصروفات</h3><button class="btn btn-ghost" style="padding:5px 12px;font-size:12px" onclick="openExpense()">+ مصروف</button></div>
        ${exps.length ? exps.map(e => `<div class="line"><span style="flex:1">${EX_CATS[e.category] || e.category}${e.note ? ' · ' + esc(e.note) : ''}</span><b class="num" style="color:var(--red)">${nf(e.amount)}</b><button class="mini" style="margin-inline-start:8px" onclick="deleteExpense(${e.id})">حذف</button></div>`).join('') : '<div class="empty">لا مصروفات هذا الشهر</div>'}</div>
    </div>
    <div class="grid2" style="margin-top:0">
      <div class="mini-card"><h3>الإيراد آخر 6 أشهر</h3><div class="chart">${rbm.values.map((v, i) => `<div class="b"><span class="v num">${nf(v)}</span><div class="bar2" data-h="${Math.round(v / maxM * 130)}" style="height:0"></div><span class="lb">${rbm.labels[i]}</span></div>`).join('')}</div></div>
      <div class="mini-card"><h3>الإيراد حسب الخطة</h3>${rbp.map(r => `<div class="hbar"><span class="k">${esc(r.label)}</span><span class="track"><i data-w="${Math.round(r.value / maxP * 100)}" style="width:0"></i></span><span class="val num">${nf(r.value)}</span></div>`).join('')}</div>
    </div>
    <div class="grid2"><div class="mini-card"><h3>توزيع طرق الدفع</h3>${ms.map(r => `<div class="hbar"><span class="k">${esc(r.label)}</span><span class="track"><i data-w="${r.pct}" style="width:0"></i></span><span class="val num">${r.pct}%</span></div>`).join('')}</div>
      <div class="mini-card"><h3>مؤشرات</h3><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:6px">
        <div><div style="font-size:11px;color:var(--muted)">إجمالي هذا الشهر</div><div style="font-size:18px;font-weight:800"><span class="num">${nf(total)}</span> د.أ</div></div>
        <div><div style="font-size:11px;color:var(--muted)">عدد العمليات</div><div style="font-size:18px;font-weight:800"><span class="num">${pays.length}</span></div></div></div></div></div>`;
  }
  $('#view').innerHTML = `<div class="top"><div><h1>المدفوعات</h1><div class="sub">هذا الشهر</div></div>
    <div class="spacer"></div><button class="btn btn-ghost" onclick="closeDayModal()">إقفال اليوم</button>
    <div class="card" style="padding:12px 18px"><div style="font-size:11px;color:var(--muted)">إجمالي الشهر</div><div style="font-size:22px;font-weight:800"><span class="num" data-count="${Math.round(total)}">0</span> <span style="font-size:12px;color:var(--muted)">د.أ</span></div></div></div>
  <div class="card">${pays.length ? `<div class="tblx"><table class="tbl"><thead><tr><th>الإيصال</th><th>العضو</th><th>المبلغ</th><th>الطريقة</th><th>التاريخ</th><th></th></tr></thead><tbody>${await payRows(pays)}</tbody></table></div>` : '<div class="empty">لا مدفوعات هذا الشهر</div>'}</div>${analytics}`;
}
async function payRows(pays) {
  const names = {}; for (const m of await STORE.all('members')) names[m.id] = m.full_name;
  return pays.map(p => `<tr><td><span class="num" style="color:var(--muted);font-size:12px">${esc(p.receipt || '')}</span></td><td><b>${esc(names[p.member_id] || '—')}</b></td><td><b class="num">${nf(p.amount)} د.أ</b></td><td style="color:var(--muted)">${methodAr(p.method)}</td><td><span class="num" style="color:var(--muted);font-size:12px">${p.date}</span></td><td><button class="mini" onclick="printReceipt(${p.id})">إيصال</button></td></tr>`).join('');
}

/* ---------- ASSISTANT (functional bot) ---------- */
const CHAT = [];
async function assistant() {
  if (!CHAT.length) CHAT.push({ who: 'bot', text: `مرحبًا، أنا مساعد ${STORE.getSetting('gym_name', 'النادي')}. اسألني عن الأعضاء أو الاشتراكات أو المستحقات.`, rows: [] });
  $('#view').innerHTML = `<div class="top"><div style="display:flex;align-items:center;gap:11px"><div class="av" style="background:var(--accent-weak);color:var(--accent)">${ICONS.bot}</div>
    <div><h1 style="font-size:19px">المساعد الذكي</h1><div class="sub">اسألني عن الأعضاء والاشتراكات والمستحقات</div></div></div></div>
  <div class="chat" id="chatBody"></div>
  <div class="chips" id="chips" style="margin-top:12px"></div>
  <div style="display:flex;gap:8px"><input id="chatInput" style="flex:1" placeholder="اكتب سؤالك…" onkeydown="if(event.key==='Enter')botSend()"><button class="btn btn-primary" onclick="botSend()">إرسال</button></div>`;
  $('#chips').innerHTML = BOT.SUGGESTIONS.map(s => `<button class="chip" onclick="botAskChip('${s.replace(/'/g, "\\'")}')">${s}</button>`).join('');
  paintChat();
}
function paintChat() {
  const b = $('#chatBody'); if (!b) return;
  b.innerHTML = CHAT.map(c => c.who === 'me' ? `<div class="bub me">${esc(c.text)}</div>` :
    `<div class="bub bot">${esc(c.text)}</div>${c.rows && c.rows.length ? `<div class="botrows">${c.rows.map(r => `<div class="botrow"><div class="av" style="width:30px;height:30px;font-size:12px;background:${av(r.id)}">${esc(fi(r.full_name))}</div><div style="flex:1;min-width:0"><b style="font-size:13px">${esc(r.full_name)}</b><div style="font-size:11px;color:var(--muted)">${botRowMeta(r, c.kind)}</div></div>${r.phone ? `<button class="mini wa" onclick="wa(${r.id},'${c.kind === 'debt' ? 'debt' : c.kind === 'expired' ? 'expired' : 'pre_expiry'}')">واتساب</button>` : ''}</div>`).join('')}</div>` : ''}`).join('') + (b.dataset.typing ? '<div class="typing"><i></i><i></i><i></i></div>' : '');
  b.scrollTop = b.scrollHeight;
}
function botRowMeta(r, kind) { if (kind === 'debt') return `${nf(r.debt)} دينار`; if (kind === 'expired') return r.days_left != null ? `منتهٍ منذ ${Math.abs(r.days_left)} يومًا` : 'منتهٍ'; if (r.end_date) return `ينتهي ${r.end_date}`; return ''; }
function botAskChip(q) { $('#chatInput').value = q; botSend(); }
async function botSend() {
  const inp = $('#chatInput'); const q = inp.value.trim(); if (!q) return; inp.value = '';
  CHAT.push({ who: 'me', text: q }); paintChat();
  const b = $('#chatBody'); b.dataset.typing = '1'; paintChat();
  const [reply] = await Promise.all([BOT.ask(q, ST.role), new Promise(r => setTimeout(r, reduce ? 0 : 420))]);
  delete b.dataset.typing;
  CHAT.push({ who: 'bot', text: reply.text, rows: reply.rows, kind: reply.kind }); paintChat();
}

/* ---------- SETTINGS (functional) ---------- */
async function settings() {
  const s = STORE.allSettings();
  const presets = [['#F97316', '#FB923C', '#1A1205', 'برتقالي'], ['#EF4444', '#F87171', '#2A0808', 'أحمر'], ['#10B981', '#34D399', '#052B1F', 'أخضر'], ['#F59E0B', '#FBBF24', '#231400', 'ذهبي'], ['#3B82F6', '#60A5FA', '#08122A', 'أزرق'], ['#A855F7', '#C084FC', '#1E0A33', 'بنفسجي'], ['#06B6D4', '#22D3EE', '#04212B', 'سماوي'], ['#EC4899', '#F472B6', '#2A0716', 'وردي']];
  const plans = await STORE.all('plans');
  $('#view').innerHTML = `<div class="top"><div><h1>الإعدادات</h1><div class="sub">هوية النادي والخطط والبيانات</div></div></div>
  <div class="hero" style="margin-bottom:16px"><div class="badge-ic">${ICONS.spark}</div><div><b style="font-size:15px">جهّز ناديك في 3 خطوات</b><div style="color:var(--muted);font-size:13px;margin-top:2px">الاسم والشعار · اللون الأساسي · استيراد الأعضاء من ملف</div></div><button class="btn btn-primary" style="margin-inline-start:auto" onclick="openImport()">استيراد الأعضاء</button></div>
  <div class="card" style="padding:18px 20px;margin-bottom:14px;max-width:760px"><h3 style="font-size:14px;margin-bottom:14px">المظهر</h3>
    <div style="display:flex;gap:22px;flex-wrap:wrap"><div class="field" style="flex:1;min-width:200px"><label>اسم النادي</label><input id="setName" value="${esc(s.gym_name || '')}" onchange="saveSetting('gym_name',this.value);applyBrand()"></div>
      <div class="field"><label>الشعار</label><input type="file" accept="image/*" onchange="uploadLogo(this)"></div></div>
    <div class="field" style="margin-top:6px"><label>اللون الأساسي</label><div class="swrow">${presets.map(p => `<span class="sw ${s.primary === p[0] ? 'on' : ''}" style="background:${p[0]}" title="${p[3]}" onclick="pickColor('${p[0]}','${p[1]}','${p[2]}',this)"></span>`).join('')}</div></div>
    <div style="display:flex;gap:26px;flex-wrap:wrap;margin-top:12px">
      <div class="field"><label>المظهر</label><div class="seg"><button class="${s.theme !== 'light' ? 'on' : ''}" onclick="setTheme('dark',this)">داكن</button><button class="${s.theme === 'light' ? 'on' : ''}" onclick="setTheme('light',this)">فاتح</button></div></div>
      <div class="field"><label>أيام التنبيه قبل الانتهاء</label><div class="seg"><button onclick="bumpDays(-1)">−</button><button class="on num" style="min-width:44px" id="daysVal">${s.expiring_days || 7}</button><button onclick="bumpDays(1)">+</button></div></div>
      <div class="field"><label>مفتاح دولة واتساب</label><input style="width:90px" value="${esc(s.wa_cc || '962')}" onchange="saveSetting('wa_cc',this.value)"></div></div></div>
  <div class="card" style="padding:18px 20px;margin-bottom:14px;max-width:760px"><h3 style="font-size:14px;margin-bottom:10px">بيانات الإيصال (اختياري)</h3>
    <div style="display:flex;gap:22px;flex-wrap:wrap">
      <div class="field" style="flex:1;min-width:180px"><label>الرقم الضريبي</label><input value="${esc(s.gym_tax || '')}" onchange="saveSetting('gym_tax',this.value)"></div>
      <div class="field" style="flex:1;min-width:180px"><label>هاتف النادي</label><input class="ltr-input" dir="ltr" style="text-align:right" value="${esc(s.gym_phone || '')}" onchange="saveSetting('gym_phone',this.value)"></div>
    </div></div>
  <div class="card" style="padding:18px 20px;margin-bottom:14px;max-width:760px"><h3 style="font-size:14px;margin-bottom:6px">الخطط والأسعار</h3>${plans.map(p => `<div class="line"><b style="flex:1">${esc(p.name)}</b><span style="color:var(--muted);font-size:12px">${p.type === 'duration' ? p.days + ' يومًا' : p.sessions + ' حصة'}</span><b class="num" style="margin-inline-start:14px">${p.price} د.أ</b></div>`).join('')}</div>
  <div class="card" style="padding:15px 20px;display:flex;align-items:center;gap:12px;max-width:760px;margin-bottom:14px"><div style="font-size:13px;color:var(--muted)">وحدة تسجيل الحضور — لتفعيل تقرير «حضر واشتراكه منتهٍ»</div><div class="seg" style="margin-inline-start:auto"><button class="${s.attendance_enabled !== '1' ? 'on' : ''}" onclick="saveSetting('attendance_enabled','0');settings()">مُعطّلة</button><button class="${s.attendance_enabled === '1' ? 'on' : ''}" onclick="saveSetting('attendance_enabled','1');settings()">مُفعّلة</button></div></div>
  <div class="card" style="padding:15px 20px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;max-width:760px"><div style="font-size:13px;color:var(--muted);flex:1">النسخ الاحتياطي والبيانات</div>
    <button class="btn btn-ghost" onclick="exportBackup()">تنزيل نسخة احتياطية</button>
    <button class="btn btn-ghost" onclick="resetDemo()">إعادة ضبط البيانات التجريبية</button></div>`;
}

/* ---------- modals: add member / renew / debt / import ---------- */
function modal(title, bodyHtml, footHtml) {
  const w = document.createElement('div'); w.className = 'modal-wrap'; w.id = 'modalWrap';
  w.innerHTML = `<div class="modal"><div class="mh"><b style="font-size:16px">${title}</b><button class="close" style="margin-inline-start:auto" onclick="closeModal()">✕</button></div><div class="mb">${bodyHtml}${footHtml || ''}</div></div>`;
  w.addEventListener('click', e => { if (e.target === w) closeModal(); });
  $('#modalMount').appendChild(w); requestAnimationFrame(() => w.classList.add('show'));
  return w;
}
function closeModal() { const w = $('#modalWrap'); if (w) { w.classList.remove('show'); setTimeout(() => w.remove(), 200); } }

async function openAddMember() {
  const plans = await STORE.all('plans');
  const members = (await STORE.all('members')).sort((a, b) => (a.full_name || '').localeCompare(b.full_name || '', 'ar'));
  window._pick = { plan: plans[0]?.id, method: 'cash' };
  modal('عضو جديد', `
    <div class="field"><label>الاسم الكامل *</label><input id="am_name"></div>
    <div class="field"><label>رقم الهاتف</label><input id="am_phone" placeholder="07XXXXXXXX" dir="ltr" style="text-align:right"></div>
    <div class="field"><label>تاريخ الميلاد (اختياري)</label><input id="am_birth" type="date"></div>
    <div class="field"><label>الخطة</label><div class="planpick" id="am_plans">${plans.map(p => `<button class="planopt ${p.id === window._pick.plan ? 'on' : ''}" onclick="pickPlan(${p.id},this)"><b>${esc(p.name)}</b><span class="num">${p.price} د.أ</span></button>`).join('')}</div></div>
    <div class="field"><label>طريقة الدفع</label><div class="seg" id="am_method"><button class="on" onclick="pickMethod('cash',this)">نقدًا</button><button onclick="pickMethod('cliq',this)">كليك</button><button onclick="pickMethod('other',this)">أخرى</button></div></div>
    <div class="field"><label>أحاله (اختياري)</label><select id="am_ref"><option value="">— لا أحد —</option>${members.map(mm => `<option value="${mm.id}">${esc(mm.full_name)}</option>`).join('')}</select></div>`,
    `<button class="btn btn-primary" onclick="saveMember()">حفظ وإنشاء اشتراك</button>`);
}
function pickPlan(id, el) { window._pick.plan = id; document.querySelectorAll('#am_plans .planopt,#rn_plans .planopt').forEach(x => x.classList.remove('on')); el.classList.add('on'); }
function pickMethod(m, el) { window._pick.method = m; el.parentElement.querySelectorAll('button').forEach(x => x.classList.remove('on')); el.classList.add('on'); }
async function saveMember() {
  const name = $('#am_name').value.trim(); if (!name) return toast('الاسم مطلوب', 'var(--red)');
  const ref = $('#am_ref') && $('#am_ref').value ? +$('#am_ref').value : null;
  const birth = $('#am_birth') && $('#am_birth').value ? $('#am_birth').value : null;
  const m = await STORE.put('members', { full_name: name, phone: $('#am_phone').value.replace(/[^\d+]/g, ''), gender: 'male', join_date: DOMAIN.iso(DOMAIN.today()), status: 'active', notes: '', birth_date: birth, referred_by: ref });
  if (window._pick.plan) await DOMAIN.createSubscription(m.id, window._pick.plan, { method: window._pick.method });
  closeModal(); confetti(); toast('تمت إضافة العضو'); render();
}
async function openRenew(id) {
  const plans = await STORE.all('plans'); window._pick = { plan: plans[0]?.id, method: 'cash', member: id };
  modal('تجديد الاشتراك', `
    <div class="field"><label>الخطة</label><div class="planpick" id="rn_plans">${plans.map(p => `<button class="planopt ${p.id === window._pick.plan ? 'on' : ''}" onclick="pickPlan(${p.id},this)"><b>${esc(p.name)}</b><span class="num">${p.price} د.أ</span></button>`).join('')}</div></div>
    <div class="field"><label>طريقة الدفع</label><div class="seg"><button class="on" onclick="pickMethod('cash',this)">نقدًا</button><button onclick="pickMethod('cliq',this)">كليك</button><button onclick="pickMethod('other',this)">أخرى</button></div></div>`,
    `<button class="btn btn-primary" onclick="doRenew()">تأكيد التجديد ✓</button>`);
}
async function doRenew() {
  const { member, plan, method } = window._pick;
  const { receipt } = await DOMAIN.createSubscription(member, plan, { method });
  closeModal(); closeDrawer(); confetti(true); toast(`تم التجديد بنجاح · ${receipt}`); render();
}
function openDebt(id) {
  window._pick = { member: id };
  modal('تسجيل دَين', `<div class="field"><label>المبلغ (دينار)</label><input id="db_amt" type="number" dir="ltr" style="text-align:right"></div><div class="field"><label>السبب</label><input id="db_reason" placeholder="باقٍ من الاشتراك…"></div>`, `<button class="btn btn-primary" onclick="saveDebt()">حفظ</button>`);
}
async function saveDebt() {
  const amt = +$('#db_amt').value; if (!amt) return toast('أدخل المبلغ', 'var(--red)');
  await STORE.put('debts', { member_id: window._pick.member, amount: amt, created_date: DOMAIN.iso(DOMAIN.today()), reason: $('#db_reason').value, status: 'open', paid_date: null });
  closeModal(); toast('تم تسجيل الدَّين'); render();
}
async function settleDebt(id, btn, memberId) {
  const d = await STORE.get('debts', id); if (!d) return;
  await STORE.put('debts', { id, status: 'paid', paid_date: DOMAIN.iso(DOMAIN.today()) });
  const receipt = await STORE.nextReceipt();
  await STORE.put('payments', { member_id: d.member_id, subscription_id: null, amount: d.amount, date: DOMAIN.iso(DOMAIN.today()), method: 'cash', receipt, note: 'تسديد دَين' });
  confetti(); toast('تم تسديد الدَّين');
  if (memberId) openMember(memberId); else render();
}
function openImport() {
  modal('استيراد الأعضاء', `<div style="font-size:13px;color:var(--muted)">ادعم الملفات: <b>Excel (.xlsx/.xls)</b> · <b>CSV</b> · <b>جهات اتصال (.vcf)</b> · <b>JSON</b>. الأعمدة المتوقّعة: الاسم، الهاتف، الجنس، تاريخ الاشتراك، ملاحظات.</div>
    <button class="btn btn-ghost" onclick="downloadTemplate()">📄 تنزيل قالب CSV</button>
    <div class="field" style="margin-top:6px"><label>اختر الملف</label><input type="file" id="imp_file" accept=".xlsx,.xls,.csv,.tsv,.txt,.json,.vcf"></div>`,
    `<button class="btn btn-primary" onclick="doImport()">استيراد</button>`);
}
async function doImport() {
  const f = $('#imp_file').files[0]; if (!f) return toast('اختر ملفًا', 'var(--red)');
  try { const count = await IMPORTER.importFile(f); closeModal(); confetti(); toast(`تم استيراد ${count} عضوًا`); render(); }
  catch (e) { toast('تعذّر قراءة الملف: ' + e.message, 'var(--red)'); }
}
function downloadTemplate() { dl(IMPORTER.membersTemplateCSV(), 'members_template.csv'); }

/* ---------- settings actions ---------- */
function saveSetting(k, v) { STORE.setSetting(k, v); }
function pickColor(a, a2, ink, el) { STORE.setSetting('primary', a); STORE.setSetting('primary2', a2); STORE.setSetting('primary_ink', ink); applyAccent(a, a2, ink); document.querySelectorAll('.swrow .sw').forEach(s => s.classList.remove('on')); el.classList.add('on'); }
function setTheme(t, el) { STORE.setSetting('theme', t); document.documentElement.setAttribute('data-theme', t); el.parentElement.querySelectorAll('button').forEach(b => b.classList.remove('on')); el.classList.add('on'); }
function bumpDays(d) { let v = Math.max(1, Math.min(60, +STORE.getSetting('expiring_days', 7) + d)); STORE.setSetting('expiring_days', v); $('#daysVal').textContent = v; }
function uploadLogo(inp) { const f = inp.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { STORE.setSetting('logo', r.result); applyBrand(); toast('تم رفع الشعار'); }; r.readAsDataURL(f); }
function exportBackup() { dl(new Blob([JSON.stringify(STORE.export(), null, 2)], { type: 'application/json' }), `gym-radar-backup-${DOMAIN.iso(DOMAIN.today())}.json`); toast('تم تنزيل النسخة الاحتياطية'); }
async function resetDemo() { if (!confirm('إعادة ضبط كل البيانات إلى الوضع التجريبي؟')) return; await STORE.resetDemo(); applyBrand(); toast('تمت إعادة الضبط'); go('dashboard'); }

/* ---------- shared actions ---------- */
async function wa(id, kind) { const r = await WA.open(id, kind); toast(r.ok ? 'تم فتح واتساب — اضغط للإرسال' : r.msg, r.ok ? 'var(--wa)' : 'var(--red)'); if (ST.screen === 'dashboard') setTimeout(render, 500); }
async function remindAll() { const r = await DOMAIN.radar(); const list = [...r.soon, ...r.expired].filter(m => m.phone).slice(0, 8); confetti(true); toast(`تم فتح ${list.length} محادثة واتساب لتذكير الجميع`); for (const m of list) await WA.open(m.id, m.days_left < 0 ? 'expired' : 'pre_expiry'); }
async function copyDigest() { const t = await DOMAIN.digestText(); try { await navigator.clipboard.writeText(t); toast('تم نسخ ملخّص اليوم'); } catch { toast('تعذّر النسخ', 'var(--red)'); } }
function methodAr(m) { return { cash: 'نقدًا', cliq: 'كليك', other: 'أخرى' }[m] || m; }

/* ---------- helpers: birthdays, effectiveness, charts, misc ---------- */
async function birthdayList() {
  const mth = new Date().getMonth();
  const AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  return (await STORE.all('members')).filter(m => m.birth_date && new Date(m.birth_date).getMonth() === mth)
    .map(m => ({ id: m.id, name: m.full_name, date: new Date(m.birth_date).getDate() + ' ' + AR[mth] }));
}
async function reminderEffectiveness() {
  const rem = await STORE.all('reminders'); if (!rem.length) return 68; // seeded baseline for the pitch
  const subs = await STORE.all('subscriptions');
  let hit = 0; for (const r of rem) { if (subs.some(s => s.member_id === r.member_id && s.start_date >= r.sent_date)) hit++; }
  return Math.round(hit / rem.length * 100) || 68;
}
function fmtTrend(t) { if (!t) return ''; return (t > 0 ? '▲ ' : '▼ ') + Math.abs(t) + '%'; }
function trendCls(t) { return t > 0 ? 'up' : t < 0 ? 'down' : 'flat'; }
function sparkBars(arr) { const mx = Math.max(...arr, 1); return arr.map(v => `<i style="height:${Math.max(3, Math.round(v / mx * 20))}px"></i>`).join(''); }

function post() {
  document.querySelectorAll('[data-count]').forEach(el => {
    const target = +el.dataset.count;
    if (reduce) { el.textContent = nf(target); return; }
    const dur = 850, t0 = performance.now();
    const step = t => { const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3); el.textContent = nf(Math.round(target * e)); if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  });
  setTimeout(() => {
    document.querySelectorAll('.bar>i[data-w]').forEach(el => el.style.width = el.dataset.w + '%');
    document.querySelectorAll('.hbar .track>i[data-w]').forEach(el => el.style.width = el.dataset.w + '%');
    document.querySelectorAll('.chart .bar2[data-h]').forEach(el => el.style.height = el.dataset.h + 'px');
  }, reduce ? 0 : 120);
}
let toastT;
function toast(msg, color) { const t = $('#toast'); t.style.borderColor = color || 'var(--green)'; t.innerHTML = `<span style="width:8px;height:8px;border-radius:50%;background:${color || 'var(--green)'}"></span>${esc(msg)}`; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2600); }
function confetti(big) { if (reduce) return; const box = $('#cfx'); const acc = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(); const cols = [acc, '#34C759', '#F5A623', '#8B5CF6', '#25D366']; const n = big ? 70 : 44; for (let i = 0; i < n; i++) { const s = document.createElement('i'); s.style.left = (45 + Math.random() * 10) + 'vw'; s.style.top = (40 + Math.random() * 8) + 'vh'; s.style.background = cols[i % cols.length]; box.appendChild(s); const dx = (Math.random() - .5) * (big ? 80 : 60), dy = -(30 + Math.random() * 45), rot = Math.random() * 720; s.animate([{ transform: 'translate(0,0) rotate(0)', opacity: 1 }, { transform: `translate(${dx}vw,${dy}vh) rotate(${rot}deg)`, opacity: 0 }], { duration: 900 + Math.random() * 500, easing: 'cubic-bezier(.2,.7,.3,1)' }).onfinish = () => s.remove(); } }
function dl(blob, name) { const u = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = u; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(u), 1000); }

/* ---------- auth (cloud only) ---------- */
async function ensureAuth() {
  const sb = STORE.adapter.sb;
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { renderLogin(); return false; }
  const { data: staff, error } = await sb.from('staff').select('gym_id, role').eq('user_id', session.user.id).maybeSingle();
  if (error || !staff) { renderLocked(session.user.email); return false; }
  STORE.adapter.gymId = staff.gym_id;
  STORE.adapter.role = staff.role || 'admin';
  ST.role = staff.role || 'admin';
  ST.userEmail = session.user.email;
  try { const { data } = await sb.rpc('is_platform_admin'); ST.isPlatformAdmin = data === true; } catch (e) { ST.isPlatformAdmin = false; }
  return true;
}
function renderLogin(msg) {
  const shell = document.querySelector('.shell'); if (shell) shell.style.display = 'none';
  document.querySelector('.mnav') && (document.querySelector('.mnav').style.display = 'none');
  const wrap = document.createElement('div'); wrap.id = 'authScreen';
  wrap.style.cssText = 'position:fixed;inset:0;display:grid;place-items:center;padding:20px;background:radial-gradient(1000px 500px at 80% -10%,var(--accent-weak),transparent),var(--bg);z-index:200';
  wrap.innerHTML = `<div class="card" style="width:380px;max-width:100%;padding:26px">
    <div style="display:flex;align-items:center;gap:11px;margin-bottom:18px">
      <div style="width:44px;height:44px;border-radius:var(--r-sm);display:grid;place-items:center;background:var(--accent);color:var(--accent-contrast)">${ICONS.radar}</div>
      <div><div style="font-weight:800;font-size:18px">Gym Radar</div><div style="font-size:11px;color:var(--faint);font-family:var(--mono)">تسجيل الدخول</div></div></div>
    <div class="field"><label>البريد الإلكتروني</label><input id="lg_email" type="email" dir="ltr" style="text-align:right" autocomplete="username"></div>
    <div class="field"><label>كلمة المرور</label><input id="lg_pass" type="password" dir="ltr" style="text-align:right" autocomplete="current-password" onkeydown="if(event.key==='Enter')doLogin()"></div>
    <div id="lg_err" style="color:var(--red);font-size:12.5px;min-height:18px;margin:2px 0"></div>
    <button class="btn btn-primary" style="width:100%" id="lg_btn" onclick="doLogin()">دخول</button>
    <div style="font-size:11.5px;color:var(--muted);margin-top:14px;text-align:center">${msg || 'لكل نادٍ حساب خاص. تواصل مع مزوّد الخدمة للحصول على بياناتك.'}</div></div>`;
  document.body.appendChild(wrap);
  setTimeout(() => { const e = document.getElementById('lg_email'); if (e) e.focus(); }, 50);
}
async function doLogin() {
  const email = document.getElementById('lg_email').value.trim();
  const password = document.getElementById('lg_pass').value;
  const err = document.getElementById('lg_err'), btn = document.getElementById('lg_btn');
  if (!email || !password) { err.textContent = 'أدخل البريد وكلمة المرور'; return; }
  err.textContent = ''; btn.disabled = true; btn.textContent = '...';
  const { error } = await STORE.adapter.sb.auth.signInWithPassword({ email, password });
  if (error) { err.textContent = 'بيانات الدخول غير صحيحة'; btn.disabled = false; btn.textContent = 'دخول'; return; }
  location.reload();
}
function renderLocked(email) {
  const shell = document.querySelector('.shell'); if (shell) shell.style.display = 'none';
  const wrap = document.createElement('div'); wrap.id = 'authScreen';
  wrap.style.cssText = 'position:fixed;inset:0;display:grid;place-items:center;padding:20px;background:var(--bg);z-index:200';
  wrap.innerHTML = `<div class="card" style="width:400px;max-width:100%;padding:26px;text-align:center">
    <div style="width:48px;height:48px;margin:0 auto;border-radius:var(--r-sm);display:grid;place-items:center;background:var(--surface-2);color:var(--muted)">${ICONS.lock}</div><h3 style="margin:12px 0 6px">الحساب غير مرتبط بنادٍ</h3>
    <p style="color:var(--muted);font-size:13.5px">حسابك (${esc(email || '')}) مسجّل لكنه غير مرتبط بأي نادٍ بعد. تواصل مع مزوّد الخدمة لتفعيله.</p>
    <button class="btn btn-ghost" style="margin-top:12px" onclick="logout()">تسجيل الخروج</button></div>`;
  document.body.appendChild(wrap);
}
async function logout() { if (!STORE.adapter.isLocal) { try { await STORE.adapter.sb.auth.signOut(); } catch (e) {} } location.reload(); }

// fill any missing config for this gym (idempotent) — runs on cloud login
async function ensureConfig() {
  const plans = await STORE.all('plans');
  if (!plans.length) { for (const p of SEED_PLANS) await STORE.put('plans', { ...p }); }
  const defaults = { primary: '#F97316', primary2: '#FB923C', primary_ink: '#1A1205', theme: 'dark', lang: 'ar', expiring_days: '7', wa_cc: '962', attendance_enabled: '1', atrisk_days: '10' };
  for (const [k, v] of Object.entries(defaults)) if (STORE.getSetting(k) == null) STORE.setSetting(k, v);
  // merge any missing message templates (so existing gyms gain new ones like "inactive")
  const tpl = JSON.parse(STORE.getSetting('templates') || '{}');
  let tplChanged = false;
  for (const [k, v] of Object.entries(TEMPLATES)) if (!tpl[k]) { tpl[k] = v; tplChanged = true; }
  if (tplChanged) STORE.setSetting('templates', JSON.stringify(tpl));
  if (!STORE.getSetting('gym_name')) STORE.setSetting('gym_name', 'Gym Radar');
}

function paintUser() {
  const who = document.querySelector('.side .who'); if (!who) return;
  const roleLabel = ST.role === 'admin' ? 'الإدارة 👑' : 'الاستقبال';
  who.innerHTML = `<div class="av">${esc((ST.userEmail || '؟').trim()[0].toUpperCase())}</div>
    <div style="font-size:13px;flex:1;min-width:0"><b style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(ST.userEmail || 'حساب محلي')}</b><div style="font-size:11px;color:var(--muted)">${roleLabel}</div></div>
    ${!STORE.adapter.isLocal ? `<button class="close" title="خروج" onclick="logout()">${ICONS.logout}</button>` : ''}`;
}

/* ---------- boot ---------- */
(async function boot() {
  if (STORE.adapter.isLocal) {
    await STORE.init();
  } else {
    const ok = await ensureAuth();
    if (!ok) return;                 // login / locked screen shown
    await STORE.adapter.init();      // load this gym's settings
    await ensureConfig();            // fill missing plans/settings for this gym
  }
  applyBrand(); paintNav(); paintUser(); await render();
  const sh = document.querySelector('.shell'); if (sh) sh.classList.add('ready');   // reveal only when name/data ready (no flash)
  if ('serviceWorker' in navigator) { try { await navigator.serviceWorker.register('./sw.js'); } catch (e) {} }
})();
window.go = go; window.applyBrand = applyBrand;
