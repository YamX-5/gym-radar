/* =========================================================================
   Gym Radar — Phases 2-4: expenses/profit, close-day, receipts, freeze,
   referrals helpers, super-admin. Depends on app.js globals (runtime).
   ========================================================================= */
const EX_CATS = { rent: 'إيجار', salaries: 'رواتب', equipment: 'معدات', utilities: 'فواتير', other: 'أخرى' };

/* ---------- Phase 2: expenses ---------- */
function openExpense() {
  const opts = Object.entries(EX_CATS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('');
  modal('مصروف جديد', `
    <div class="field"><label>المبلغ (دينار)</label><input id="ex_amt" type="number" dir="ltr" style="text-align:right"></div>
    <div class="field"><label>الفئة</label><select id="ex_cat">${opts}</select></div>
    <div class="field"><label>ملاحظة</label><input id="ex_note" placeholder="اختياري"></div>
    <div class="field"><label>التاريخ</label><input id="ex_date" type="date" value="${DOMAIN.iso(DOMAIN.today())}"></div>`,
    `<button class="btn btn-primary" onclick="saveExpense()">حفظ</button>`);
}
async function saveExpense() {
  const amt = +$('#ex_amt').value; if (!amt) return toast('أدخل المبلغ', 'var(--red)');
  await STORE.put('expenses', { amount: amt, category: $('#ex_cat').value, note: $('#ex_note').value, date: $('#ex_date').value || DOMAIN.iso(DOMAIN.today()) });
  closeModal(); toast('تم تسجيل المصروف'); if (ST.screen === 'payments') render();
}
async function deleteExpense(id) { await STORE.del('expenses', id); toast('تم الحذف'); render(); }

/* ---------- Phase 2: close the day ---------- */
async function closeDayModal() {
  const c = await DOMAIN.closeDay();
  const net = DOMAIN.round(c.total - c.expenses);
  modal('إقفال اليوم', `
    <div style="display:flex;flex-direction:column;gap:2px">
      <div class="line"><span style="flex:1">نقدًا</span><b class="num">${c.cash} د.أ</b></div>
      <div class="line"><span style="flex:1">كليك</span><b class="num">${c.cliq} د.أ</b></div>
      <div class="line"><span style="flex:1">أخرى</span><b class="num">${c.other} د.أ</b></div>
      <div class="line"><span style="flex:1"><b>إجمالي المقبوضات</b> (<span class="num">${c.count}</span> عملية)</span><b class="num">${c.total} د.أ</b></div>
      <div class="line"><span style="flex:1">مصروفات اليوم</span><b class="num" style="color:var(--red)">${c.expenses} د.أ</b></div>
      <div class="line" style="border-bottom:none"><span style="flex:1"><b>صافي اليوم</b></span><b class="num" style="color:var(--green);font-size:16px">${net} د.أ</b></div>
    </div>`,
    `<button class="btn btn-primary" onclick="copyCloseDay(${c.cash},${c.cliq},${c.other},${c.total},${c.count},${c.expenses},${net})">نسخ للمالك</button>`);
}
async function copyCloseDay(cash, cliq, other, total, count, exp, net) {
  const gym = STORE.getSetting('gym_name', 'Gym Radar');
  const txt = `إقفال ${gym} — ${DOMAIN.iso(DOMAIN.today())}\nنقدًا: ${cash} | كليك: ${cliq} | أخرى: ${other}\nإجمالي: ${total} د.أ (${count} عملية)\nمصروفات: ${exp} د.أ\nصافي: ${net} د.أ`;
  try { await navigator.clipboard.writeText(txt); toast('تم النسخ — أرسله للمالك'); } catch { toast('تعذّر النسخ', 'var(--red)'); }
}

/* ---------- Phase 3: printable receipt / invoice ---------- */
async function printReceipt(paymentId) {
  const p = await STORE.get('payments', paymentId); if (!p) return;
  const m = await STORE.get('members', p.member_id);
  const s = STORE.allSettings();
  const method = { cash: 'نقدًا', cliq: 'كليك', other: 'أخرى' }[p.method] || p.method;
  const accent = s.primary || '#F97316';
  const taxLine = s.gym_tax ? `<div style="font-size:12px;color:#666">الرقم الضريبي: ${esc(s.gym_tax)}</div>` : '';
  const phoneLine = s.gym_phone ? `<div style="font-size:12px;color:#666">${esc(s.gym_phone)}</div>` : '';
  const w = window.open('', '_blank');
  w.document.write(`<!doctype html><html dir="rtl"><head><meta charset="utf-8"><title>${esc(p.receipt || '')}</title></head>
    <body style="font-family:'Segoe UI',Tahoma,sans-serif;max-width:360px;margin:20px auto;padding:20px;border:1px solid #ddd;border-radius:10px">
      <div style="border-bottom:2px solid ${accent};padding-bottom:12px;margin-bottom:12px">
        <div style="font-size:20px;font-weight:800">${esc(s.gym_name || 'Gym Radar')}</div>${taxLine}${phoneLine}
        <div style="margin-top:6px;font-weight:700;color:${accent};direction:ltr">${esc(p.receipt || '')}</div>
      </div>
      <table style="width:100%;font-size:14px;border-collapse:collapse">
        <tr><td style="padding:6px 0;color:#666">العضو</td><td style="text-align:end;font-weight:700">${esc(m ? m.full_name : '')}</td></tr>
        <tr><td style="padding:6px 0;color:#666">التاريخ</td><td style="text-align:end;direction:ltr">${esc(p.date)}</td></tr>
        <tr><td style="padding:6px 0;color:#666">الطريقة</td><td style="text-align:end">${method}</td></tr>
        <tr><td style="padding:6px 0;color:#666">البيان</td><td style="text-align:end">${esc(p.note || 'اشتراك')}</td></tr>
      </table>
      <div style="margin-top:14px;background:${accent};color:#fff;border-radius:8px;padding:12px 16px;display:flex;justify-content:space-between;font-size:18px;font-weight:800">
        <span>المبلغ</span><span style="direction:ltr">${p.amount} د.أ</span></div>
      <div style="text-align:center;margin-top:16px;color:#999;font-size:12px">شكرًا لك</div>
    </body></html>`);
  w.document.close(); w.focus(); setTimeout(() => w.print(), 300);
}

/* ---------- Phase 3: freeze / unfreeze ---------- */
function freezeMember(id) {
  modal('تجميد الاشتراك', `
    <div class="field"><label>عدد أيام التجميد (تُضاف لتاريخ الانتهاء)</label>
      <input id="fz_days" type="number" dir="ltr" style="text-align:right" value="7"></div>
    <div style="font-size:12px;color:var(--muted)">يُمدَّد تاريخ انتهاء اشتراكه بنفس عدد أيام التجميد.</div>`,
    `<button class="btn btn-primary" onclick="doFreeze(${id})">تجميد</button>`);
}
async function doFreeze(id) {
  const days = +$('#fz_days').value || 0;
  const sub = await DOMAIN.currentSub(id);
  if (sub && sub.end_date && days > 0) {
    const ne = new Date(new Date(sub.end_date + 'T00:00:00').getTime() + days * 86400000);
    await STORE.put('subscriptions', { id: sub.id, end_date: DOMAIN.iso(ne) });
  }
  await STORE.put('members', { id, status: 'frozen' });
  closeModal(); closeDrawer(); toast('تم تجميد الاشتراك'); render();
}
async function unfreezeMember(id) { await STORE.put('members', { id, status: 'active' }); closeDrawer(); toast('تم إلغاء التجميد'); render(); }

/* ---------- Phase 4: super-admin (cross-gym) ---------- */
async function platformScreen() {
  const v = $('#view');
  v.innerHTML = `<div class="top"><div><h1>المنصّة</h1><div class="sub">نظرة عامة على كل الأندية</div></div></div><div id="pfBody"><div class="empty">جارٍ التحميل…</div></div>`;
  try {
    const { data, error } = await STORE.adapter.sb.rpc('platform_overview');
    if (error) throw error;
    const rows = data || [];
    const totMembers = rows.reduce((s, r) => s + (+r.members || 0), 0);
    const totRev = rows.reduce((s, r) => s + (+r.revenue_month || 0), 0);
    $('#pfBody').innerHTML = `
      <div class="kpis" style="grid-template-columns:repeat(3,1fr)">
        <div class="kpi"><div class="lbl">الأندية</div><div class="val"><span class="num">${rows.length}</span></div></div>
        <div class="kpi"><div class="lbl">إجمالي الأعضاء</div><div class="val"><span class="num">${totMembers}</span></div></div>
        <div class="kpi"><div class="lbl">إيراد هذا الشهر (الكل)</div><div class="val"><span class="num">${DOMAIN.round(totRev)}</span> <span class="u">د.أ</span></div></div>
      </div>
      <div class="card" style="margin-top:16px"><div class="tblx"><table class="tbl"><thead><tr><th>النادي</th><th>الأعضاء</th><th>فعّالون</th><th>إيراد الشهر</th><th>مستحقات</th><th>أُنشئ</th></tr></thead>
        <tbody>${rows.map(r => `<tr><td><b>${esc(r.gym_name)}</b></td><td class="num">${r.members}</td><td class="num">${r.active_members}</td>
          <td class="num">${DOMAIN.round(+r.revenue_month)} د.أ</td><td class="num">${DOMAIN.round(+r.open_debts)} د.أ</td>
          <td class="num" style="color:var(--muted);font-size:12px">${(r.created_at || '').slice(0, 10)}</td></tr>`).join('')}</tbody></table></div></div>`;
  } catch (e) {
    $('#pfBody').innerHTML = `<div class="empty">غير متاح — تأكد أنك مضاف في <b>platform_admins</b>.</div>`;
  }
}
