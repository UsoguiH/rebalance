// لوحتي — the salon's own screen after it signs up (molu-app.com calls it «لوحتك»): today's bookings on a timeline
// (tap one: attended / no-show / cancel), «+ موعد» for phone and walk-in customers, services and prices, the team with
// invite links, and sharing (the booking link, a QR sticker, the «احجز» button on Google Maps). Demo bookings are
// generated per day from the salon's own services and hours; anything you change is kept on this device.
import { boot, $, $$, ar, icon, money, snackbar, appts, userStore, catArt } from './shell.js';
import { CATEGORIES, MY_KEY } from './data.js';
import { coverArt } from './art.js';
import { openSheet, closeSheet, copyText, initSegmented } from './m3.js';
import { spring, blurIn } from './motion.js';

const QR_JS = 'js/vendor/qrcode.js';
const LINK = 'molu-app.com/b/';
const DASH = 'molu_dash';
const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || 'null') ?? d; } catch { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const rng = (seed) => { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };
const hash = (s) => { let h = 7; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };
const hm = (m) => { const h = Math.floor(m / 60) % 24, mm = String(m % 60).padStart(2, '0'); return `${((h + 11) % 12) + 1}:${mm} ${h < 12 ? 'ص' : 'م'}`; };
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const OPEN = { day: [[600, 1380]], split: [[540, 720], [960, 1380]], evening: [[960, 1440]] };
const NAMES = { eve: ['نورة', 'ريم', 'سارة', 'لمى', 'هيا', 'جود', 'دانة', 'أمل', 'العنود', 'شهد', 'رهف', 'منيرة'], adam: ['عبدالله', 'فهد', 'سلمان', 'تركي', 'خالد', 'نايف', 'بندر', 'سعود', 'ماجد', 'راكان', 'عمر', 'يزيد'] };
const CREW = { eve: ['ريم', 'سارة', 'لمى', 'هيا', 'جود'], adam: ['سامي', 'محمد', 'ياسر', 'عمر', 'بدر'] };
const SOURCE = { online: 'من صفحتك', phone: 'اتصال', walkin: 'حضور مباشر', app: 'من التطبيق' };

export default function mount() {
  const me = read(MY_KEY, null);
  if (!me) { // nothing registered on this device yet: the way in
    boot({ page: 'account' });
    $('#app').innerHTML = `<div class="d-empty"><span class="ic">${icon('storefront', 40)}</span><h1>ما سجّلت محلّك بعد</h1><p>سجّل صالونك أو محل الحلاقة خلال دقيقتين، وتصير لوحتك هنا.</p><a class="btn btn-black btn-lg pressable" href="join.html">سجّل محلّك مجاناً</a></div>`;
    return;
  }
  const S = me.section, F = S === 'eve', g = (f, m) => (F ? f : m);
  boot({ page: 'account', section: S, nav: false });
  const dash = read(DASH, {}); dash.status ||= {}; dash.added ||= []; dash.team ||= [me.owner, ...CREW[S].slice(0, Math.min(me.team, 6) - 1)];
  const save = () => write(DASH, dash);
  const saveMe = () => write(MY_KEY, me);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const nowM = new Date().getHours() * 60 + new Date().getMinutes();
  let day = 0, tab = 'today';

  // ---------- bookings for a day: generated from your services and hours, plus what you add, plus real app bookings ----------
  function bookings(di) {
    const d = new Date(today); d.setDate(d.getDate() + di); const key = iso(d);
    const r = rng(hash(me.name) + (d.getMonth() * 31 + d.getDate()) * 97);
    const slots = (OPEN[me.hours?.id] || OPEN.day).flatMap(([a, b]) => Array.from({ length: Math.floor((b - a) / 30) }, (_, k) => a + k * 30));
    if (d.getDay() === 5 && !me.hours?.friday) return [];
    const n = Math.round((me.kind === 'home' ? 2 : 3) + r() * (me.kind === 'home' ? 3 : 5));
    const busy = {}, list = [];
    for (let k = 0; k < n * 3 && list.length < n; k++) {
      const m = slots[Math.floor(r() * slots.length)], svc = me.services[Math.floor(r() * me.services.length)], staff = dash.team[Math.floor(r() * dash.team.length)];
      const end = m + svc.minutes;
      if ((busy[staff] || []).some(([a, b]) => m < b && end > a)) continue;
      (busy[staff] ||= []).push([m, end]);
      list.push({ id: `${key}-${m}-${staff}`, day: key, m, name: NAMES[S][Math.floor(r() * 12)], phone: `05${Math.floor(10000000 + r() * 89999999)}`, svc: svc.name, minutes: svc.minutes, price: svc.price, staff, source: r() > 0.25 ? 'online' : 'phone', _r: r() });
    }
    const app = appts.list().filter((a) => a.salonId === 'mine' && iso(new Date(a.at)) === key)
      .map((a) => { const t = new Date(a.at); return { id: a.id, day: key, m: t.getHours() * 60 + t.getMinutes(), name: userStore.get()?.name || 'عميل', phone: userStore.get()?.phone || '', svc: a.services.join('، '), minutes: a.minutes, price: a.total, staff: a.staff, source: 'app', cancelled: a.status === 'cancelled' }; });
    return [...list, ...dash.added.filter((b) => b.day === key), ...app].map((b) => {
      let st = dash.status[b.id] || (b.cancelled ? 'cancelled' : null);
      if (!st) st = di < 0 || (di === 0 && b.m + b.minutes <= nowM) ? (b._r !== undefined && b._r < 0.12 ? 'noshow' : 'done') : 'booked';
      return { ...b, st };
    }).sort((a, b) => a.m - b.m);
  }
  const week = () => Array.from({ length: 7 }, (_, k) => bookings(-k)).flat();

  // ---------- screen ----------
  const greet = new Date().getHours() < 12 ? 'صباح الخير' : 'مساء الخير';
  const trialLeft = Math.max(0, 14 - Math.floor((Date.now() - (me.createdAt || Date.now())) / 864e5));
  $('#app').innerHTML = `
    <header class="d-head">
      <a class="round pressable" href="account.html" aria-label="رجوع">${icon('arrow_back', 22, 'flip-rtl')}</a>
      <span class="grow"><small>${greet} يا ${me.owner}</small><b>${me.name}</b></span>
      <a class="round pressable" href="salon.html?id=mine" aria-label="شوف صفحتك">${icon('storefront', 22)}</a>
    </header>
    <div class="d-live"><i></i><span>صفحتك شغّالة ويشوفها العملاء في ${me.kind === 'home' ? (me.areas || []).join('، ') : me.district}</span></div>
    <a class="d-trial pressable" href="business.html#pricing">${icon('workspace_premium', 22)}<span class="grow"><b>تجربتك المجانية: باقي ${ar(trialLeft)} يوم</b><small>كل المزايا، بدون بطاقة وبدون عمولة</small></span>${icon('chevron_left', 20)}</a>
    <div class="segmented d-tabs" role="tablist" aria-label="أقسام اللوحة">
      ${[['today', 'اليوم'], ['services', 'الخدمات'], ['team', 'الفريق'], ['share', 'شارك']].map(([k, t]) => `<label><input type="radio" name="dtab" value="${k}"${k === tab ? ' checked' : ''}><span>${t}</span></label>`).join('')}
    </div>
    <div id="panel"></div>`;
  initSegmented($('#app'));
  $('.d-tabs').addEventListener('change', (e) => { tab = e.target.value; panel(); });

  function panel() {
    $('#add').hidden = tab !== 'today';
    $('#panel').innerHTML = tab === 'today' ? todayHtml() : tab === 'services' ? servicesHtml() : tab === 'team' ? teamHtml() : shareHtml();
    blurIn($('#panel'), { y: 14 });
    if (tab === 'share') drawQr();
  }

  // ---------- اليوم ----------
  function todayHtml() {
    const list = bookings(day), live = list.filter((b) => b.st !== 'cancelled');
    const income = live.filter((b) => b.st !== 'noshow').reduce((s, b) => s + b.price, 0);
    const w = week().filter((b) => b.st === 'done' || b.st === 'noshow'), rate = w.length ? Math.round(w.filter((b) => b.st === 'done').length / w.length * 100) : 100;
    const days = Array.from({ length: 7 }, (_, k) => { const d = new Date(today); d.setDate(d.getDate() + k); return d; });
    const wd = new Intl.DateTimeFormat('ar-SA-u-nu-latn-ca-gregory', { weekday: 'short' });
    const next = day === 0 ? live.find((b) => b.st === 'booked' && b.m >= nowM) : null;
    return `
      <div class="d-stats">
        <div><b>${ar(live.length)}</b><small>${day === 0 ? 'حجوزات اليوم' : 'حجوزات'}</small></div>
        <div><b>${money(income)}</b><small>${day === 0 ? 'دخل اليوم المتوقع' : 'الدخل المتوقع'}</small></div>
        <div><b>${ar(rate)}٪</b><small>الحضور هالأسبوع</small></div>
      </div>
      <div class="d-days" role="tablist" aria-label="اليوم">${days.map((d, k) => `<button type="button" data-day="${k}" aria-selected="${k === day}"><small>${k === 0 ? 'اليوم' : k === 1 ? 'بكرة' : wd.format(d)}</small><b>${ar(d.getDate())}</b><i>${ar(bookings(k).filter((b) => b.st !== 'cancelled').length)}</i></button>`).join('')}</div>
      ${next ? `<div class="d-next">${icon('schedule', 20)}<span>الجاي: <b>${next.name}</b> · ${next.svc} الساعة ${hm(next.m)}</span></div>` : ''}
      ${list.length ? `<ol class="d-line">${list.map((b) => `
        <li class="st-${b.st}${day === 0 && b.st === 'booked' && b.m <= nowM && nowM < b.m + b.minutes ? ' now' : ''}">
          <time>${hm(b.m)}</time>
          <button type="button" class="d-bk pressable" data-bk="${b.id}">
            <span class="grow"><b>${b.name}</b><span>${b.svc} · ${ar(b.minutes)} د · مع ${b.staff}</span></span>
            <span class="d-end"><b>${money(b.price)}</b><em>${{ booked: 'مؤكد', done: 'حضر', noshow: 'ما حضر', cancelled: 'ملغي' }[b.st]}</em></span>
          </button>
          <small class="src">${SOURCE[b.source]}</small>
        </li>`).join('')}</ol>` : `<div class="d-none">${icon('event_available', 30)}<b>${day === 0 ? 'ما فيه حجوزات اليوم' : 'ما فيه حجوزات هذا اليوم'}</b><span>شارك رابطك، أو أضف موعد اتصال أو حضور مباشر من «+ موعد».</span></div>`}`;
  }
  const findBk = (id) => { for (let k = -7; k < 7; k++) { const b = bookings(k).find((x) => x.id === id); if (b) return b; } return null; };

  // ---------- الخدمات ----------
  function servicesHtml() {
    const cats = CATEGORIES[S].filter((c) => me.services.some((x) => x.cat === c.id));
    return `<p class="d-hint">أسعارك كما يشوفها العملاء. عدّل بـ − و +، أو شيل الخدمة.</p>
      ${cats.map((c) => `<section class="d-card"><h3><span>${catArt(S, c.id, 30)}</span>${c.name}</h3>${me.services.map((x, k) => [x, k]).filter(([x]) => x.cat === c.id).map(([x, k]) => `
        <div class="j-srow"><span class="grow"><b>${x.name}</b><small>${ar(x.minutes)} دقيقة</small></span>
          <span class="j-step" data-price="${k}"><button type="button" data-d="-1" aria-label="أقل">${icon('remove', 20)}</button><b>${ar(x.price)} <small>ر.س</small></b><button type="button" data-d="1" aria-label="أكثر">${icon('add', 20)}</button></span>
          <button type="button" class="d-x" data-del="${k}" aria-label="احذف ${x.name}">${icon('close', 18)}</button></div>`).join('')}</section>`).join('')}
      <button type="button" class="btn btn-tonal btn-block btn-lg pressable" id="new-svc">${icon('add', 20)}أضف خدمة</button>`;
  }

  // ---------- الفريق ----------
  function teamHtml() {
    return `<p class="d-hint">كل واحد له جدوله، ويقدر العميل يختار مين يخدمه.</p>
      <section class="d-card">${dash.team.map((n, k) => `<div class="d-member"><span class="av">${n.charAt(0)}</span><span class="grow"><b>${n}</b><small>${k === 0 ? 'المالك' : g('مختصة', 'حلاق')} · ${ar(week().filter((b) => b.staff === n && b.st === 'done').length)} زيارة هالأسبوع</small></span>${k ? `<button type="button" class="d-x" data-rm="${k}" aria-label="احذف ${n}">${icon('close', 18)}</button>` : ''}</div>`).join('')}</section>
      <button type="button" class="btn btn-tonal btn-block btn-lg pressable" id="new-member">${icon('person_add', 20)}أضف ${g('مختصة', 'حلاق')}</button>
      <div class="d-invite">${icon('link', 20)}<span class="grow">أو أرسل لهم رابط الانضمام، يسجّلون ويشوفون جدولهم من جوالهم</span><button type="button" class="btn btn-black btn-sm pressable" id="invite">انسخ</button></div>`;
  }

  // ---------- شارك ----------
  function shareHtml() {
    const url = LINK + me.slug;
    return `<div class="d-linkbox"><span class="grow"><small>رابط صفحتك</small><b dir="ltr">${url}</b></span><button type="button" class="btn btn-black btn-sm pressable" id="copy">${icon('content_copy', 18)}انسخ</button></div>
      <div class="d-poster" id="poster">
        <span class="thumb">${coverArt({ art: hash(me.name), section: S })}</span>
        <b>${me.name}</b><small>احجز موعدك من جوالك</small>
        <div class="qr" id="qr" role="img" aria-label="رمز QR لرابط صفحتك"></div>
        <span class="url" dir="ltr">${url}</span>
      </div>
      <p class="d-hint" style="text-align:center">ملصق QR: اطبعه وحطه عند الكاشير أو على المراية</p>
      <ol class="d-tips">
        <li><span>${icon('share', 20)}</span><span class="grow"><b>البايو في الإنستقرام والسناب</b><small>حط الرابط في البايو، وكل من يزور حسابك يحجز بنفسه.</small></span></li>
        <li><span>${icon('location_on', 20)}</span><span class="grow"><b>زر «احجز» في قوقل ماب</b><small>ملفك التجاري في قوقل ← تعديل الملف ← الحجوزات ← أضف رابطك. يطلع زر «احجز» لكل من يبحث عنك.</small></span></li>
        <li><span>${icon('chat', 20)}</span><span class="grow"><b>رسالة جاهزة للواتساب</b><small>«صار الحجز عندنا أونلاين 🎉 اختر وقتك: ${url}»</small></span><button type="button" class="btn btn-tonal btn-sm pressable" id="wa">انسخ</button></li>
      </ol>`;
  }
  function drawQr() {
    const go = () => {
      try { const q = window.qrcode(0, 'M'); q.addData('https://' + LINK + me.slug); q.make(); $('#qr').innerHTML = q.createSvgTag({ cellSize: 4, margin: 0, scalable: true }); }
      catch { $('#qr').innerHTML = `<span class="muted">${icon('qr_code_2', 64)}</span>`; }
    };
    if (window.qrcode) return go();
    const s = document.createElement('script'); s.src = QR_JS; s.onload = go; s.onerror = go; document.head.append(s);
  }

  // ---------- sheets ----------
  const sheet = $('#sheet'), body = $('#sheet-body');
  const open = (html) => { body.innerHTML = html; openSheet(sheet); };
  function bookingSheet(b) {
    open(`<h2 class="title-l">${b.name}</h2>
      <p class="muted" style="margin:2px 0 4px">${b.svc} · ${hm(b.m)} · مع ${b.staff}</p>
      <p class="muted" dir="ltr" style="text-align:end;margin:0 0 14px">${b.phone ? '+966 ' + b.phone.replace(/^0/, '') : ''}</p>
      <div class="sheet-list">
        <button type="button" data-set="done">${icon('check_circle', 24)}حضر</button>
        <button type="button" data-set="noshow">${icon('event_busy', 24)}ما حضر</button>
        ${b.st !== 'booked' ? `<button type="button" data-set="booked">${icon('history', 24)}رجّعه مؤكد</button>` : ''}
        <button type="button" data-wa>${icon('chat', 24)}انسخ تذكير للواتساب</button>
        <button type="button" class="danger" data-set="cancelled">${icon('cancel', 24)}إلغاء الموعد</button>
      </div>`);
    body.onclick = (e) => {
      const set = e.target.closest('[data-set]');
      if (set) { dash.status[b.id] = set.dataset.set; save(); closeSheet(sheet); panel(); snackbar({ done: 'سجّلنا الحضور ✓', noshow: 'سجّلنا الغياب', booked: 'رجع الموعد مؤكد', cancelled: 'ألغينا الموعد وفتحنا الوقت لغيره' }[set.dataset.set]); return; }
      if (e.target.closest('[data-wa]')) copyText(`تذكير من ${me.name}: موعدك ${b.svc} الساعة ${hm(b.m)}. نشوفك على خير 🌿`, 'نسخنا التذكير ✓');
    };
  }
  function addSheet() {
    let di = day;
    const freeTimes = (k) => {
      const taken = bookings(k).filter((b) => b.st !== 'cancelled');
      return (OPEN[me.hours?.id] || OPEN.day).flatMap(([a, b]) => Array.from({ length: Math.floor((b - a) / 30) }, (_, j) => a + j * 30))
        .filter((m) => (k > 0 || m > nowM) && taken.filter((b) => m < b.m + b.minutes && m + 30 > b.m).length < dash.team.length);
    };
    if (!freeTimes(di).length) di = Math.min(6, di + 1); // nothing left today: start on tomorrow
    const wd = new Intl.DateTimeFormat('ar-SA-u-nu-latn-ca-gregory', { weekday: 'short' });
    const dayName = (k) => { const d = new Date(today); d.setDate(d.getDate() + k); return k === 0 ? 'اليوم' : k === 1 ? 'بكرة' : `${wd.format(d)} ${ar(d.getDate())}`; };
    const pick = { svc: 0, m: null, staff: dash.team[0] };
    const times = () => {
      const free = freeTimes(di); pick.m = free[0] ?? null;
      $('#c-time').innerHTML = free.length ? free.slice(0, 24).map((m, k) => `<button type="button" class="chip${k ? '' : ' on'}" data-v="${m}">${hm(m)}</button>`).join('') : '<p class="muted" style="margin:0">ما بقى وقت فاضي هذا اليوم</p>';
      $('#c-save').disabled = !free.length;
    };
    open(`<h2 class="title-l">موعد جديد</h2>
      <p class="muted" style="margin:2px 0 12px">اتصال أو حضور مباشر · يظهر مع حجوزات صفحتك في جدول واحد</p>
      <div class="d-form">
        <div class="segmented" role="radiogroup" aria-label="المصدر"><label><input type="radio" name="src" value="phone" checked><span>اتصال</span></label><label><input type="radio" name="src" value="walkin"><span>حضور مباشر</span></label></div>
        <label class="j-input"><input id="c-name" placeholder="اسم ${g('العميلة', 'العميل')}" autocomplete="off"></label>
        <label class="phone-field"><span>+966</span><input id="c-phone" type="tel" inputmode="numeric" placeholder="5X XXX XXXX (اختياري)" maxlength="11"></label>
        <b class="lbl">الخدمة</b><div class="j-chips" id="c-svc">${me.services.map((x, k) => `<button type="button" class="chip${k ? '' : ' on'}" data-v="${k}">${x.name} · ${ar(x.price)}</button>`).join('')}</div>
        ${dash.team.length > 1 ? `<b class="lbl">مع</b><div class="j-chips" id="c-staff">${dash.team.map((n, k) => `<button type="button" class="chip${k ? '' : ' on'}" data-v="${n}">${n}</button>`).join('')}</div>` : ''}
        <b class="lbl">اليوم</b><div class="j-chips" id="c-day">${Array.from({ length: 7 }, (_, k) => `<button type="button" class="chip${k === di ? ' on' : ''}" data-v="${k}">${dayName(k)}</button>`).join('')}</div>
        <b class="lbl">الوقت</b><div class="j-chips" id="c-time"></div>
        <button class="btn btn-black btn-lg btn-block pressable" type="button" id="c-save">أضف الموعد</button>
      </div>`);
    initSegmented(body); times();
    body.onclick = (e) => {
      const chip = e.target.closest('.chip');
      if (chip) {
        const box = chip.parentElement; $$('.chip', box).forEach((c) => c.classList.toggle('on', c === chip)); const v = chip.dataset.v;
        if (box.id === 'c-svc') pick.svc = +v; if (box.id === 'c-time') pick.m = +v; if (box.id === 'c-staff') pick.staff = v;
        if (box.id === 'c-day') { di = +v; times(); }
        return;
      }
      if (e.target.closest('#c-save')) {
        const name = $('#c-name').value.trim();
        if (!name) { snackbar(`اكتب اسم ${g('العميلة', 'العميل')}`); $('#c-name').focus(); return; }
        if (pick.m == null) return;
        const svc = me.services[pick.svc], d = new Date(today); d.setDate(d.getDate() + di);
        dash.added.push({ id: 'A' + Date.now(), day: iso(d), m: pick.m, name, phone: $('#c-phone').value.replace(/\D/g, ''), svc: svc.name, minutes: svc.minutes, price: svc.price, staff: pick.staff, source: $('input[name="src"]:checked', body).value });
        save(); closeSheet(sheet); day = di; panel(); snackbar(`أضفنا موعد ${name} ${dayName(di) === 'اليوم' ? 'اليوم' : dayName(di)} الساعة ${hm(pick.m)} ✓`);
      }
    };
    setTimeout(() => $('#c-name')?.focus(), 350);
  }
  function serviceSheet() {
    open(`<h2 class="title-l">خدمة جديدة</h2>
      <div class="d-form">
        <b class="lbl">القسم</b><div class="j-chips" id="n-cat">${CATEGORIES[S].map((c, k) => `<button type="button" class="chip${k ? '' : ' on'}" data-v="${c.id}">${c.name}</button>`).join('')}</div>
        <label class="j-input"><input id="n-name" placeholder="اسم الخدمة" autocomplete="off"></label>
        <div class="j-row"><span class="grow"><b>المدة</b></span><span class="j-step" data-n="minutes"><button type="button" data-d="-1">${icon('remove', 20)}</button><b>30 <small>د</small></b><button type="button" data-d="1">${icon('add', 20)}</button></span></div>
        <div class="j-row"><span class="grow"><b>السعر</b></span><span class="j-step" data-n="price"><button type="button" data-d="-1">${icon('remove', 20)}</button><b>50 <small>ر.س</small></b><button type="button" data-d="1">${icon('add', 20)}</button></span></div>
        <button class="btn btn-black btn-lg btn-block pressable" type="button" id="n-save">أضف الخدمة</button>
      </div>`);
    const n = { cat: CATEGORIES[S][0].id, minutes: 30, price: 50 };
    body.onclick = (e) => {
      const chip = e.target.closest('.chip'); if (chip) { $$('.chip', chip.parentElement).forEach((c) => c.classList.toggle('on', c === chip)); n.cat = chip.dataset.v; return; }
      const st = e.target.closest('.j-step button'); if (st) { const box = st.closest('.j-step'), k = box.dataset.n, d = +st.dataset.d; n[k] = Math.max(5, n[k] + d * (k === 'minutes' ? 5 : 5)); $('b', box).innerHTML = `${ar(n[k])} <small>${k === 'minutes' ? 'د' : 'ر.س'}</small>`; return; }
      if (e.target.closest('#n-save')) {
        const name = $('#n-name').value.trim(); if (!name) { snackbar('اكتب اسم الخدمة'); return; }
        me.services.push({ cat: n.cat, name, minutes: n.minutes, price: n.price }); saveMe(); closeSheet(sheet); panel(); snackbar('أضفنا الخدمة لصفحتك ✓');
      }
    };
  }
  function memberSheet() {
    open(`<h2 class="title-l">أضف ${g('مختصة', 'حلاق')}</h2><div class="d-form"><label class="j-input"><input id="m-name" placeholder="الاسم" autocomplete="off"></label><button class="btn btn-black btn-lg btn-block pressable" type="button" id="m-save">أضف</button></div>`);
    setTimeout(() => $('#m-name')?.focus(), 350);
    body.onclick = (e) => {
      if (!e.target.closest('#m-save')) return;
      const name = $('#m-name').value.trim(); if (!name) { snackbar('اكتب الاسم'); return; }
      dash.team.push(name); me.team = dash.team.length; save(); saveMe(); closeSheet(sheet); panel(); snackbar(`انضم ${name} للفريق ✓`);
    };
  }

  // ---------- taps ----------
  $('#panel').addEventListener('click', (e) => {
    const t = e.target;
    const dy = t.closest('[data-day]'); if (dy) { day = +dy.dataset.day; panel(); return; }
    const bk = t.closest('[data-bk]'); if (bk) { const b = findBk(bk.dataset.bk); if (b) bookingSheet(b); return; }
    const pr = t.closest('[data-price] button');
    if (pr) {
      const box = pr.closest('[data-price]'), x = me.services[+box.dataset.price], d = +pr.dataset.d;
      x.price = Math.max(5, x.price + d * 5); saveMe();
      $('b', box).innerHTML = `${ar(x.price)} <small>ر.س</small>`;
      spring($('b', box), [{ transform: `translateY(${d > 0 ? 6 : -6}px)`, opacity: 0.4 }, { transform: 'none', opacity: 1 }], 'snappy');
      return;
    }
    const del = t.closest('[data-del]');
    if (del) { if (me.services.length < 2) { snackbar('لازم تبقى خدمة وحدة على الأقل'); return; } const [x] = me.services.splice(+del.dataset.del, 1); saveMe(); panel(); snackbar(`شلنا «${x.name}»`, { action: 'تراجع', onAction: () => { me.services.push(x); saveMe(); panel(); } }); return; }
    const rm = t.closest('[data-rm]'); if (rm) { const [n] = dash.team.splice(+rm.dataset.rm, 1); me.team = dash.team.length; save(); saveMe(); panel(); snackbar(`شلنا ${n} من الفريق`); return; }
    if (t.closest('#new-svc')) return serviceSheet();
    if (t.closest('#new-member')) return memberSheet();
    if (t.closest('#invite')) return copyText(`https://${LINK}${me.slug}/team`, 'نسخنا رابط الانضمام ✓');
    if (t.closest('#copy')) return copyText('https://' + LINK + me.slug, 'نسخنا رابط صفحتك ✓');
    if (t.closest('#wa')) return copyText(`صار الحجز عندنا أونلاين 🎉 اختر وقتك: https://${LINK}${me.slug}`, 'نسخنا الرسالة ✓');
  });
  $('#add').onclick = addSheet;
  panel();
  spring($('.d-head'), [{ opacity: 0, transform: 'translateY(-8px)' }, { opacity: 1, transform: 'none' }], 'gentle');
}
if (!window.__softnav) mount();
