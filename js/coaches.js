/* =========================================================================
   Gym Radar — Coaches: profiles, salary payments, attendance.
   Salary payments count as expenses (reduce profit).
   Depends on app.js globals ($, esc, av, fi, nf, ICONS, modal, toast, ST, render).
   ========================================================================= */
async function coachesScreen() {
  const coaches = (await STORE.all('coaches')).filter(c => c.active !== false).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'));
  const now = new Date(); const f = new Date(now.getFullYear(), now.getMonth(), 1), n = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const salTotal = await DOMAIN.coachPaymentsBetween(f, n);
  let cards = '';
  for (const c of coaches) {
    const att = await DOMAIN.coachAttendanceCount(c.id);
    const paid = await DOMAIN.coachPaidThisMonth(c.id);
    const paidColor = c.salary > 0 && paid >= c.salary ? 'var(--green)' : 'var(--amber)';
    cards += `<div class="card" style="padding:14px 16px;margin-bottom:10px">
      <div style="display:flex;align-items:center;gap:11px">
        <div class="av" style="background:${av(c.id + 100)}">${esc(fi(c.name))}</div>
        <div style="flex:1;min-width:0"><b>${esc(c.name)}</b><div class="num" style="font-size:12px;color:var(--muted)">${esc(c.phone || '')}</div></div>
        <button class="close" onclick="openCoachEdit(${c.id})" title="تعديل">${ICONS.edit}</button></div>
      <div style="display:flex;gap:16px;margin-top:10px;font-size:12px;color:var(--muted);flex-wrap:wrap">
        <span>الراتب: <b class="num" style="color:var(--text)">${nf(c.salary)}</b> د.أ</span>
        <span>حضر <b class="num" style="color:var(--text)">${att}</b> يوم</span>
        <span>دُفع هذا الشهر <b class="num" style="color:${paidColor}">${nf(paid)}</b> د.أ</span></div>
      <div style="display:flex;gap:8px;margin-top:10px">
        <button class="btn btn-primary" style="flex:1" onclick="payCoach(${c.id})">دفع راتب</button>
        <button class="btn btn-ghost" style="flex:1" onclick="markCoachAttendance(${c.id})">تسجيل حضور</button>
        <button class="btn btn-ghost" onclick="coachHistory(${c.id})">السجل</button></div></div>`;
  }
  $('#view').innerHTML = `<div class="top"><div><h1>المدربون</h1><div class="sub">إجمالي الرواتب هذا الشهر: <span class="num">${nf(salTotal)}</span> د.أ</div></div>
    <div class="spacer"></div><button class="btn btn-primary" onclick="addCoach()">مدرب جديد</button></div>
    ${coaches.length ? cards : '<div class="card"><div class="empty">لا مدربون بعد — أضف أول مدرب</div></div>'}`;
}

function addCoach() {
  modal('مدرب جديد', `
    <div class="field"><label>الاسم *</label><input id="co_name"></div>
    <div class="field"><label>الهاتف</label><input id="co_phone" dir="ltr" style="text-align:right"></div>
    <div class="field"><label>الراتب الشهري (د.أ)</label><input id="co_salary" type="number" dir="ltr" style="text-align:right" value="0"></div>
    <div class="field"><label>ملاحظات</label><input id="co_notes" placeholder="اختياري"></div>`,
    `<button class="btn btn-primary" onclick="saveCoach()">حفظ</button>`);
}
async function saveCoach() {
  const name = $('#co_name').value.trim(); if (!name) return toast('الاسم مطلوب', 'var(--red)');
  await STORE.put('coaches', { name, phone: $('#co_phone').value.replace(/[^\d+]/g, ''), salary: +$('#co_salary').value || 0, active: true, notes: $('#co_notes').value });
  closeModal(); toast('تمت إضافة المدرب'); if (ST.screen === 'coaches') render();
}
async function openCoachEdit(id) {
  const c = await STORE.get('coaches', id);
  modal('تعديل المدرب', `
    <div class="field"><label>الاسم *</label><input id="ce_name" value="${esc(c.name || '')}"></div>
    <div class="field"><label>الهاتف</label><input id="ce_phone" dir="ltr" style="text-align:right" value="${esc(c.phone || '')}"></div>
    <div class="field"><label>الراتب الشهري (د.أ)</label><input id="ce_salary" type="number" dir="ltr" style="text-align:right" value="${c.salary || 0}"></div>
    <div class="field"><label>ملاحظات</label><input id="ce_notes" value="${esc(c.notes || '')}"></div>`,
    `<button class="btn btn-primary" onclick="saveCoachEdit(${id})">حفظ</button>
     <button class="btn btn-ghost" style="color:var(--red);border-color:var(--red)" onclick="deleteCoach(${id})">حذف المدرب</button>`);
}
async function saveCoachEdit(id) {
  const name = $('#ce_name').value.trim(); if (!name) return toast('الاسم مطلوب', 'var(--red)');
  await STORE.put('coaches', { id, name, phone: $('#ce_phone').value.replace(/[^\d+]/g, ''), salary: +$('#ce_salary').value || 0, notes: $('#ce_notes').value });
  closeModal(); toast('تم الحفظ'); if (ST.screen === 'coaches') render();
}
async function deleteCoach(id) {
  if (!confirm('حذف هذا المدرب وكل رواتبه وحضوره؟')) return;
  for (const e of ['coach_payments', 'coach_attendance']) for (const r of await STORE.where(e, x => x.coach_id === id)) await STORE.del(e, r.id);
  await STORE.del('coaches', id);
  closeModal(); toast('تم حذف المدرب'); if (ST.screen === 'coaches') render();
}
async function payCoach(id) {
  const c = await STORE.get('coaches', id);
  modal('دفع راتب — ' + esc(c.name), `
    <div class="field"><label>المبلغ (د.أ)</label><input id="cp_amt" type="number" dir="ltr" style="text-align:right" value="${c.salary || 0}"></div>
    <div class="field"><label>التاريخ</label><input id="cp_date" type="date" value="${DOMAIN.iso(DOMAIN.today())}"></div>
    <div class="field"><label>ملاحظة</label><input id="cp_note" placeholder="راتب شهر…"></div>
    <div style="font-size:12px;color:var(--muted)">يُحتسب ضمن مصروفات النادي ويخصم من الأرباح.</div>`,
    `<button class="btn btn-primary" onclick="doPayCoach(${id})">تسجيل الدفع</button>`);
}
async function doPayCoach(id) {
  const amt = +$('#cp_amt').value; if (!amt) return toast('أدخل المبلغ', 'var(--red)');
  await STORE.put('coach_payments', { coach_id: id, amount: amt, date: $('#cp_date').value || DOMAIN.iso(DOMAIN.today()), note: $('#cp_note').value });
  closeModal(); confetti(); toast('تم تسجيل الراتب'); if (ST.screen === 'coaches') render();
}
async function markCoachAttendance(id) {
  const c = await STORE.get('coaches', id);
  await STORE.put('coach_attendance', { coach_id: id, at: new Date().toISOString() });
  toast('تم تسجيل حضور ' + esc(c.name)); if (ST.screen === 'coaches') render();
}
async function coachHistory(id) {
  const c = await STORE.get('coaches', id);
  const pays = (await STORE.where('coach_payments', p => p.coach_id === id)).sort((a, b) => a.date < b.date ? 1 : -1);
  const att = await DOMAIN.coachAttendanceCount(id);
  const recent = (await STORE.where('coach_attendance', a => a.coach_id === id)).sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 8);
  modal('سجل ' + esc(c.name), `
    <div style="font-size:13px;color:var(--muted);margin-bottom:10px">حضر <b style="color:var(--text)">${att}</b> يوم هذا الشهر</div>
    <b style="font-size:13px">الرواتب المدفوعة</b>
    ${pays.length ? pays.map(p => `<div class="line"><span class="num" style="color:var(--muted);font-size:12px">${p.date}</span><span style="flex:1">${esc(p.note || 'راتب')}</span><b class="num">${nf(p.amount)} د.أ</b></div>`).join('') : '<div class="empty">لا مدفوعات</div>'}
    <b style="font-size:13px;display:block;margin-top:12px">آخر أيام الحضور</b>
    ${recent.length ? recent.map(a => `<div class="line"><span class="num" style="color:var(--muted);font-size:12px">${(a.at || '').slice(0, 10)}</span><span style="flex:1;color:var(--muted);font-size:12px">${(a.at || '').slice(11, 16)}</span></div>`).join('') : '<div class="empty">لا حضور</div>'}`,
    `<button class="btn btn-ghost" onclick="closeModal()">إغلاق</button>`);
}
