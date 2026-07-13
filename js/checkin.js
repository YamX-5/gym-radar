/* =========================================================================
   Gym Radar — check-in / QR gate / at-risk retention
   - Every scan or manual check-in logs a visit (feeds retention).
   - Gate mode: camera reads a member's QR -> full-screen GREEN (eligible) or
     RED (not eligible), and logs the visit.
   - Member QR = "GR:<id>" (print or download; scanned by the gym tablet).
   ========================================================================= */
const CHECKIN = {
  async record(memberId) {
    await STORE.put('checkins', { member_id: memberId, at: new Date().toISOString() });
  },
  async lastVisitMap() {
    const map = {};
    for (const c of await STORE.all('checkins')) {
      const d = (c.at || '').slice(0, 10);
      if (!map[c.member_id] || d > map[c.member_id]) map[c.member_id] = d;
    }
    return map;
  },
  async todayCount() {
    const t = DOMAIN.iso(DOMAIN.today());
    return (await STORE.all('checkins')).filter(c => (c.at || '').slice(0, 10) === t).length;
  },
  eligibility(m) {
    const ok = ['active', 'expiring'].includes(m.sub_status) && m.status !== 'frozen';
    let sub;
    if (m.status === 'frozen') sub = 'الاشتراك مجمّد';
    else if (m.sub_status === 'expiring') sub = `اشتراك فعّال · يتبقّى ${m.days_left} يومًا`;
    else if (m.sub_status === 'active') sub = m.end_date ? `فعّال حتى ${m.end_date}` : 'اشتراك فعّال';
    else if (m.sub_status === 'expired') sub = `منتهٍ منذ ${Math.abs(m.days_left || 0)} يومًا`;
    else if (m.sub_status === 'finished') sub = 'انتهت الحصص';
    else sub = 'لا يوجد اشتراك فعّال';
    return { ok, tone: ok ? 'green' : 'red', title: m.full_name, sub, debt: m.debt || 0 };
  },
  async atRisk(days) {
    days = days || +STORE.getSetting('atrisk_days', 10);
    const last = await this.lastVisitMap();
    const today = new Date(DOMAIN.iso(DOMAIN.today()));
    const out = [];
    for (const m of await DOMAIN.listMembers({ filter: 'active' })) {
      const lv = last[m.id];
      if (!lv) continue;                                   // never scanned -> no data, don't flag
      const gap = Math.round((today - new Date(lv)) / 86400000);
      if (gap >= days) out.push({ ...m, lastVisit: lv, gap });
    }
    out.sort((a, b) => b.gap - a.gap);
    return out;
  },
};

/* ---------- the "الحضور" screen (reception) ---------- */
async function checkinScreen() {
  const count = await CHECKIN.todayCount();
  $('#view').innerHTML = `
  <div class="top"><div><h1>الحضور</h1><div class="sub">اليوم حضر <span class="num">${count}</span> عضوًا</div></div>
    <div class="spacer"></div><button class="btn btn-primary" onclick="openKiosk()">${ICONS.qr || ''} بدء وضع البوابة</button></div>
  <div class="card" style="padding:16px;margin-bottom:14px">
    <div style="font-size:13px;color:var(--muted);margin-bottom:10px">تسجيل حضور يدوي — ابحث عن العضو واضغط لتسجيله والتحقق من اشتراكه</div>
    <input class="search" style="width:100%" id="ciSearch" placeholder="ابحث بالاسم أو الهاتف…" oninput="ciSearch(this.value)">
    <div id="ciResults" style="margin-top:10px"></div>
  </div>
  <div class="mini-card"><h3>آخر من حضر اليوم</h3><div id="ciRecent"></div></div>`;
  ciRenderRecent();
}
let ciT;
function ciSearch(v) { clearTimeout(ciT); ciT = setTimeout(async () => {
  const box = $('#ciResults'); if (!box) return;
  if ((v || '').trim().length < 2) { box.innerHTML = ''; return; }
  const ms = await DOMAIN.listMembers({ search: v });
  box.innerHTML = ms.slice(0, 8).map(m => {
    const e = CHECKIN.eligibility(m);
    return `<div class="row" style="border:1px solid var(--border);border-radius:var(--r-sm);margin-bottom:6px">
      <div class="av" style="background:${av(m.id)}">${esc(fi(m.full_name))}</div>
      <div class="mid"><div class="nm">${esc(m.full_name)}</div><div class="meta ${e.ok ? '' : 'bad'}">${e.sub}</div></div>
      <button class="mini ${e.ok ? 'rn' : ''}" style="${e.ok ? '' : 'background:var(--red);color:#fff'}" onclick="manualCheckin(${m.id})">تسجيل حضور</button></div>`;
  }).join('') || '<div class="empty">لا نتائج</div>';
}, 200); }
async function manualCheckin(id) {
  const m = await DOMAIN.enrich(await STORE.get('members', id));
  await CHECKIN.record(id);
  gateResult(m);                       // show the same green/red panel
  $('#ciSearch') && ($('#ciSearch').value = ''); $('#ciResults') && ($('#ciResults').innerHTML = '');
  ciRenderRecent();
}
async function ciRenderRecent() {
  const box = $('#ciRecent'); if (!box) return;
  const t = DOMAIN.iso(DOMAIN.today());
  const rows = (await STORE.all('checkins')).filter(c => (c.at || '').slice(0, 10) === t)
    .sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 10);
  const names = {}; for (const m of await STORE.all('members')) names[m.id] = m.full_name;
  box.innerHTML = rows.length ? rows.map(c => `<div class="line"><div class="av" style="width:28px;height:28px;font-size:11px;background:${av(c.member_id)}">${esc(fi(names[c.member_id] || '؟'))}</div>
    <div style="flex:1"><b style="font-size:13px">${esc(names[c.member_id] || 'عضو')}</b></div>
    <span class="num" style="color:var(--muted);font-size:12px">${(c.at || '').slice(11, 16)}</span></div>`).join('') : '<div class="empty">لا حضور بعد اليوم</div>';
}

/* ---------- gate result panel (green / red) ---------- */
function gateResult(m, opts = {}) {
  const e = CHECKIN.eligibility(m);
  const el = document.createElement('div');
  el.className = 'gate-result ' + e.tone;
  el.innerHTML = `<div class="gate-mark">${e.ok ? '✓' : '✕'}</div>
    <div class="gate-name">${esc(e.title)}</div>
    <div class="gate-sub">${esc(e.sub)}</div>
    ${e.debt > 0 ? `<div class="gate-debt">عليه مستحقات ${e.debt} دينار</div>` : ''}`;
  (opts.mount || document.body).appendChild(el);
  try { beep(e.ok); } catch (_) {}
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 250); }, opts.ms || 2200);
}
function beep(ok) {
  const a = new (window.AudioContext || window.webkitAudioContext)();
  const o = a.createOscillator(), g = a.createGain();
  o.connect(g); g.connect(a.destination);
  o.frequency.value = ok ? 880 : 220; o.type = 'sine';
  g.gain.setValueAtTime(0.08, a.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + (ok ? 0.18 : 0.4));
  o.start(); o.stop(a.currentTime + (ok ? 0.2 : 0.42));
}

/* ---------- KIOSK / gate mode (camera + jsQR) ---------- */
const Kiosk = { stream: null, raf: null, lastId: null, lastAt: 0 };
function openKiosk() {
  const wrap = document.createElement('div'); wrap.id = 'kiosk'; wrap.className = 'kiosk';
  wrap.innerHTML = `
    <video id="kioskVid" playsinline muted></video>
    <canvas id="kioskCanvas" hidden></canvas>
    <div class="kiosk-frame"></div>
    <div class="kiosk-hint">قرّب رمز العضو (QR) نحو الكاميرا</div>
    <div class="kiosk-brand">${esc(STORE.getSetting('gym_name', 'Gym Radar'))} · وضع البوابة</div>
    <button class="kiosk-exit" onclick="closeKiosk()">إنهاء</button>
    <div id="kioskResult"></div>`;
  document.body.appendChild(wrap);
  startKioskCamera();
}
async function startKioskCamera() {
  const vid = $('#kioskVid'), canvas = $('#kioskCanvas');
  try {
    Kiosk.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    vid.srcObject = Kiosk.stream; await vid.play();
  } catch (e) {
    $('#kioskHint') || ($('#kiosk .kiosk-hint').textContent = 'تعذّر فتح الكاميرا — تأكد من الإذن، أو استخدم التسجيل اليدوي');
    return;
  }
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const scan = () => {
    if (!$('#kiosk')) return;
    if (vid.readyState === vid.HAVE_ENOUGH_DATA) {
      canvas.width = vid.videoWidth; canvas.height = vid.videoHeight;
      ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
      if (code && code.data) handleScan(code.data);
    }
    Kiosk.raf = requestAnimationFrame(scan);
  };
  Kiosk.raf = requestAnimationFrame(scan);
}
async function handleScan(text) {
  const m = text.match(/^GR:(\d+)$/); if (!m) return;
  const id = +m[1];
  const now = Date.now();
  if (Kiosk.lastId === id && now - Kiosk.lastAt < 6000) return;   // debounce re-scans
  Kiosk.lastId = id; Kiosk.lastAt = now;
  const raw = await STORE.get('members', id);
  const mount = $('#kioskResult');
  if (!raw) { const el = document.createElement('div'); el.className = 'gate-result red'; el.innerHTML = `<div class="gate-mark">✕</div><div class="gate-name">بطاقة غير معروفة</div>`; mount.appendChild(el); try{beep(false)}catch(_){}; setTimeout(() => el.remove(), 1800); return; }
  const member = await DOMAIN.enrich(raw);
  await CHECKIN.record(id);                     // log every scan (attendance)
  gateResult(member, { mount, ms: 2400 });
}
function closeKiosk() {
  if (Kiosk.raf) cancelAnimationFrame(Kiosk.raf);
  if (Kiosk.stream) Kiosk.stream.getTracks().forEach(t => t.stop());
  Kiosk.stream = null; Kiosk.lastId = null;
  const k = $('#kiosk'); if (k) k.remove();
}

/* ---------- member QR card ---------- */
let _qrName = '';
async function showMemberQR(id) {
  const m = await STORE.get('members', id); _qrName = m ? m.full_name : '';
  const ov = modal('بطاقة العضو (QR)', `
    <div style="display:flex;flex-direction:column;align-items:center;gap:12px">
      <div id="qrbox" style="background:#fff;padding:14px;border-radius:var(--r-sm)"></div>
      <div style="font-weight:700">${esc(_qrName)}</div>
      <div style="font-size:12px;color:var(--muted);text-align:center">يعرضها العضو على كاميرا البوابة للدخول. اطبعها كبطاقة أو نزّلها وأرسلها له عبر واتساب.</div>
    </div>`,
    `<button class="btn btn-primary" onclick="printQR()">طباعة</button>
     <button class="btn btn-ghost" onclick="downloadQR()">تنزيل صورة</button>`);
  const box = ov.querySelector('#qrbox');
  box.innerHTML = '';
  new QRCode(box, { text: 'GR:' + id, width: 220, height: 220, correctLevel: QRCode.CorrectLevel.M });
}
function _qrCanvas() { return document.querySelector('#qrbox canvas'); }
function downloadQR() {
  const c = _qrCanvas(); if (!c) return;
  const a = document.createElement('a'); a.href = c.toDataURL('image/png'); a.download = 'qr_' + (_qrName || 'member').replace(/\s+/g, '_') + '.png'; a.click();
}
function printQR() {
  const c = _qrCanvas(); if (!c) return;
  const gym = STORE.getSetting('gym_name', 'Gym Radar');
  const w = window.open('', '_blank');
  w.document.write(`<div style="text-align:center;font-family:sans-serif;padding:30px">
    <h2>${esc(gym)}</h2><img src="${c.toDataURL('image/png')}" style="width:260px;height:260px"><h3>${esc(_qrName)}</h3>
    <p style="color:#666">بطاقة الدخول — Gym Radar</p></div>`);
  w.document.close(); w.focus(); setTimeout(() => w.print(), 300);
}
