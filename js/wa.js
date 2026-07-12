/* =========================================================================
   Gym Radar — WhatsApp deep links
   Opens the WhatsApp app (mobile) or WhatsApp Web/Desktop — never sends
   automatically; a human always taps send. Logs the reminder so the row
   shows "تم التذكير ✓".
   ========================================================================= */
function waPhone(phone, cc) {
  if (!phone) return null;
  let p = String(phone).replace(/\D/g, '');
  if (p.startsWith('00')) p = p.slice(2);
  if (p.startsWith(cc)) return p;
  if (p.startsWith('0')) return cc + p.slice(1);
  return cc + p;
}
function fillTemplate(body, m, gym) {
  const dl = m.days_left;
  return body
    .replace(/{الاسم}/g, m.full_name || '')
    .replace(/{تاريخ_الانتهاء}/g, m.end_date || '—')
    .replace(/{الأيام}/g, dl != null ? Math.abs(dl) : '—')
    .replace(/{المبلغ}/g, m.debt != null ? m.debt : '')
    .replace(/{النادي}/g, gym || 'النادي');
}
async function openWhatsApp(memberId, kind = 'pre_expiry') {
  const raw = await STORE.get('members', memberId);
  if (!raw) return { ok: false, msg: 'العضو غير موجود' };
  const m = await DOMAIN.enrich(raw);
  const cc = STORE.getSetting('wa_cc', '962');
  const gym = STORE.getSetting('gym_name', 'النادي');
  const templates = JSON.parse(STORE.getSetting('templates', '{}'));
  const body = fillTemplate(templates[kind] || 'مرحبًا {الاسم}', m, gym);
  const phone = waPhone(m.phone, cc);
  if (!phone) return { ok: false, msg: 'لا يوجد رقم هاتف لهذا العضو' };

  // log reminder (once per kind per day)
  if (['pre_expiry', 'expired', 'debt'].includes(kind)) {
    const dup = await STORE.where('reminders', r => r.member_id === memberId && r.kind === kind && r.sent_date === DOMAIN.iso(DOMAIN.today()));
    if (!dup.length) await STORE.put('reminders', { member_id: memberId, kind, sent_date: DOMAIN.iso(DOMAIN.today()) });
  }
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const url = (isMobile ? `whatsapp://send?phone=${phone}&text=` : `https://wa.me/${phone}?text=`) + encodeURIComponent(body);
  const fallback = `https://wa.me/${phone}?text=${encodeURIComponent(body)}`;
  window.open(isMobile ? fallback : url, '_blank'); // wa.me reliably hands off to the app on both
  return { ok: true, url: fallback };
}
window.WA = { open: openWhatsApp, phone: waPhone };
