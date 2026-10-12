import { boot, $, $$, ar, icon, favs, appts, bindFavs, setSection, snackbar, money, verified, catArt } from './shell.js';
import { SECTIONS, salonById, SALONS, days, slots, fmtTime } from './data.js';
import { coverArt, mapArt, initials } from './art.js';
import { realMap, directionsUrl, sourceNote } from './map.js';
import { openSheet, closeSheet, setLoading, copyText } from './m3.js';
import { spring, blurIn } from './motion.js';

const params = new URLSearchParams(location.search);
const salon = salonById(params.get('id')) || SALONS.eve[0];
const S = SECTIONS[salon.section];
const F = salon.section === 'eve';
setSection(salon.section);
boot({ page: 'home', section: salon.section, nav: false });
document.title = `${salon.name} — مولو`;

const reschedule = appts.list().find((a) => a.id === params.get('reschedule'));
const picked = new Map(); // "ci:si" → service
const key = (ci, si) => `${ci}:${si}`;
const svcOf = (k) => { const [ci, si] = k.split(':').map(Number); return salon.categories[ci].services[si]; };
const count = (n) => (n === 1 ? 'خدمة' : n === 2 ? 'خدمتين' : `${ar(n)} ${n <= 10 ? 'خدمات' : 'خدمة'}`);
const addBtn = (k, s) => `<button class="add pressable" type="button" data-svc="${k}" aria-pressed="false" aria-label="أضف ${s.name}">${icon('add', 22, 'a-off')}${icon('check', 22, 'a-on')}</button>`;

// most-booked: the first service of the first three categories
const popular = salon.categories.slice(0, 3).map((c, ci) => ({ c, ci, s: c.services[0] }));

$('#app').innerHTML = `
  <div class="cover">${coverArt(salon)}
    <div class="cover-bar">
      <a class="glass pressable" href="explore.html?s=${salon.section}" aria-label="رجوع">${icon('arrow_back', 22, 'flip-rtl')}</a>
      <div class="group-b">
        <button class="glass pressable" type="button" id="share" aria-label="مشاركة">${icon('ios_share', 22)}</button>
        <button class="glass fav pressable${favs.has(salon.id) ? ' on' : ''}" type="button" data-fav="${salon.id}" aria-pressed="${favs.has(salon.id)}" aria-label="المفضلة">${icon('favorite', 22, 'f-o')}${icon('favorite_f', 22, 'f-f')}</button>
      </div>
    </div>
  </div>
  <div class="wrap">
    <div class="store-head enter">
      <span class="logo" style="--c:${F ? 'var(--eve)' : 'var(--adam)'}">${initials(salon.name)}</span>
      <h1>${salon.name}${salon.verified ? verified() : ''}</h1>
      <div class="store-meta"><b>★ ${salon.rating.toFixed(1)}</b><span>(${ar(salon.reviews)})</span>·<span>${salon.district}</span>·<span>${ar(salon.km)} كم</span>·<span class="${salon.open ? 'open' : ''}">${salon.open ? 'مفتوح حتى 11 م' : 'يفتح 10 ص'}</span></div>
      <div class="info-pills">
        ${salon.offer ? `<span class="hot">${icon('percent', 18)}${salon.offer} على كل الخدمات</span>` : ''}
        <span>${icon('payments', 18)}الدفع بعد الخدمة</span>
        <span>${icon('event_available', 18)}إلغاء مجاني</span>
        ${salon.home ? `<span>${icon('home_work', 18)}يجونك البيت</span>` : ''}
      </div>
    </div>

    <section class="sec"><div class="sec-h"><h2>الأكثر طلباً</h2></div>
      <div class="carousel">${popular.map(({ c, ci, s }) => `
        <div class="pop-card" data-pick="${key(ci, 0)}"><span class="ti">${catArt(salon.section, c.id, 48)}</span>${addBtn(key(ci, 0), s)}<b>${s.name}</b><span>${money(s.price)} · ${ar(s.minutes)} د</span></div>`).join('')}</div>
    </section>
  </div>

  <nav class="tabs" aria-label="أقسام الخدمات"><div class="tabs-in" id="tabs">${salon.categories.map((c, ci) => `<button type="button" data-tab="${ci}" aria-selected="${ci === 0}">${c.name}</button>`).join('')}<i class="ink" id="ink"></i></div></nav>
  <div class="wrap">
    ${salon.categories.map((c, ci) => `
      <section class="menu-sec" id="m-${ci}"><h2>${c.name}</h2>
        ${c.services.map((s, si) => `
          <div class="svc" data-pick="${key(ci, si)}"><div class="grow"><b>${s.name}</b><span>${money(s.price)} · ${ar(s.minutes)} دقيقة</span></div>${addBtn(key(ci, si), s)}</div>`).join('')}
      </section>`).join('')}

    <section class="sec"><div class="sec-h"><h2>وش قالوا عنه</h2><span class="muted">★ ${salon.rating.toFixed(1)} · ${ar(salon.reviews)} تقييم</span></div>
      <div class="carousel">${salon.reviewList.map(([n, r, t]) => `<article class="review"><header>${n}<span class="stars">${Array.from({ length: 5 }, (_, i) => icon(i < r ? 'star_f' : 'star', 15)).join('')}</span></header><p>${t}</p></article>`).join('')}</div>
    </section>

    <section class="sec"><div class="sec-h"><h2>عن ${S.place === 'صالون' ? 'الصالون' : 'المكان'}</h2></div>
      <div class="about">
        <div class="mini-map pressable" id="mini-map" role="button" aria-label="افتح الخريطة">${mapArt([salon], { activeId: salon.id, section: salon.section })}</div>
        <p class="muted" style="font-size:.78rem;margin:-4px 4px 0">${sourceNote(salon)}</p>
        <a class="row pressable" href="${directionsUrl(salon)}" target="_blank" rel="noopener">${icon('location_on', 24)}<span class="grow"><b>${salon.street ? salon.street + '، ' : ''}${salon.district}، ${salon.city}</b><span>${ar(salon.km)} كم ${F ? 'منكِ' : 'منك'}</span></span>${icon('chevron_left', 22)}</a>
        <div class="row">${icon('schedule', 24)}<span class="grow"><b>كل يوم 10 ص – 11 م</b><span>الجمعة من 4 م</span></span></div>
        <div class="row">${icon('groups', 24)}<span class="grow"><b>${salon.staff.map((m) => m.name).join('، ')}</b><span>${F ? 'فريق نسائي بالكامل' : 'فريق الحلاقين'}</span></span></div>
        ${salon.amenities.length ? `<div class="row">${icon('check_circle', 24)}<span class="grow"><b>المزايا</b><span>${salon.amenities.join(' · ')}</span></span></div>` : ''}
      </div>
    </section>
  </div>`;
bindFavs(document);

// ---------- pick services (tap the row or the + button) ----------
function sync() {
  const list = [...picked.values()];
  const total = list.reduce((n, s) => n + s.price, 0);
  const bar = $('#cta');
  const was = !bar.classList.contains('hide');
  bar.classList.toggle('hide', !list.length);
  if (list.length) {
    $('#cta-n').textContent = ar(list.length);
    $('#cta-p').textContent = money(total);
    if (was) spring($('#cta-n'), [{ transform: 'scale(1.4)' }, { transform: 'none' }], 'bouncy');
  }
  $$('[data-svc]').forEach((b) => b.setAttribute('aria-pressed', picked.has(b.dataset.svc)));
}
document.addEventListener('click', (e) => {
  const row = e.target.closest('[data-pick]');
  if (!row || e.target.closest('#book')) return;
  const k = row.dataset.pick;
  picked.has(k) ? picked.delete(k) : picked.set(k, svcOf(k));
  sync();
  $$(`[data-svc="${k}"]`).forEach((b) => spring(b, [{ transform: 'scale(.7)' }, { transform: 'none' }], 'bouncy'));
});

// ---------- sticky tabs: click scrolls, scrolling moves the ink (scroll-spy) ----------
const tabs = $$('#tabs [data-tab]'), ink = $('#ink');
function setTab(i, scrollTabs = true) {
  tabs.forEach((t, k) => t.setAttribute('aria-selected', k === i));
  const t = tabs[i], host = $('#tabs');
  ink.style.width = t.offsetWidth + 'px';
  ink.style.transform = `translateX(${t.offsetLeft + t.offsetWidth - host.offsetWidth}px)`;
  if (scrollTabs) t.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
}
setTab(0, false);
let spyOff = false;
$('#tabs').addEventListener('click', (e) => {
  const t = e.target.closest('[data-tab]'); if (!t) return;
  spyOff = true; setTab(+t.dataset.tab);
  $(`#m-${t.dataset.tab}`).scrollIntoView({ behavior: 'smooth' });
  setTimeout(() => (spyOff = false), 700);
});
const io = new IntersectionObserver((es) => {
  if (spyOff) return;
  const vis = es.filter((x) => x.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
  if (vis) setTab(+vis.target.id.slice(2));
}, { rootMargin: '-70px 0px -60% 0px' });
$$('.menu-sec').forEach((s) => io.observe(s));
addEventListener('resize', () => setTab(tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true'), false));

// ---------- share / map ----------
$('#share').addEventListener('click', async () => {
  try { if (navigator.share) return await navigator.share({ title: salon.name, url: location.href }); } catch { return; }
  copyText(location.href, 'نسخنا رابط الصالون ✓');
});
// mini map → full-screen real map (clip-path spring out of the card); drawn map if the real one can't load
let miniDone = false;
const drawMini = () => { if (miniDone) return; miniDone = true; const host = $('#mini-map'); realMap(host, { salons: [salon], activeId: salon.id, interactive: false }).then(() => host.querySelector('.map-art')?.remove()).catch(() => {}); };
new IntersectionObserver((es, io) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); drawMini(); } }, { rootMargin: '300px' }).observe($('#mini-map'));
$('#mini-map').addEventListener('click', () => {
  const r = $('#mini-map').getBoundingClientRect();
  const clip = `inset(${r.top}px ${innerWidth - r.right}px ${innerHeight - r.bottom}px ${r.left}px round 20px)`;
  const el = document.createElement('div');
  let rm;
  el.className = 'map-full';
  el.innerHTML = `<div class="map-host"></div><button class="round pressable" type="button" aria-label="إغلاق">${icon('close', 22)}</button>
    <span class="map-note">${sourceNote(salon)}</span>
    <div class="map-card"><span class="thumb">${coverArt(salon)}</span><span class="grow"><b>${salon.name}</b><br><span class="muted" style="font-size:.86rem">${salon.district} · ${ar(salon.km)} كم</span></span>
    <a class="pill-dark" href="${directionsUrl(salon)}" target="_blank" rel="noopener">${icon('near_me', 18)}الاتجاهات</a></div>`;
  document.body.append(el);
  document.documentElement.style.overflow = 'hidden';
  spring(el, [{ clipPath: clip }, { clipPath: 'inset(0 round 0px)' }], 'smooth');
  blurIn($('.map-card', el), { y: 30, delay: 0.25 });
  const others = SALONS[salon.section];
  realMap($('.map-host', el), { salons: others, activeId: salon.id, padBottom: 110, onPick: (id) => { if (id !== salon.id) location.href = `salon.html?id=${id}`; } })
    .then((m) => { rm = m; m.map.setView([salon.lat, salon.lng], 15.5, { animate: false }); })
    .catch(() => { $('.map-host', el).innerHTML = mapArt(others, { activeId: salon.id, section: salon.section, h: Math.round(400 * innerHeight / innerWidth) }); });
  $('.round', el).onclick = () => {
    document.documentElement.style.overflow = '';
    const r2 = $('#mini-map').getBoundingClientRect();
    spring(el, [{ clipPath: 'inset(0 round 0px)' }, { clipPath: `inset(${r2.top}px ${innerWidth - r2.right}px ${innerHeight - r2.bottom}px ${r2.left}px round 20px)` }], 'snappy').finished.then(() => { rm?.destroy(); el.remove(); });
  };
});

// ---------- booking: ONE sheet — who (optional) · day · time · confirm ----------
const DAYS = days(14);
const bk = { staff: 'any', day: 0, slot: null };
const firstFree = () => Math.max(0, DAYS.findIndex((d) => slots(salon, d.i).some((s) => s.free)));
const total = () => [...picked.values()].reduce((n, s) => n + s.price, 0);

function slotsHtml() {
  const ss = slots(salon, bk.day);
  return ss.some((s) => s.free)
    ? ss.map((s) => `<button class="slot" type="button" data-slot="${s.m}"${s.free ? '' : ' disabled'} aria-pressed="${bk.slot === s.m}">${fmtTime(s.m)}</button>`).join('')
    : `<div class="empty" style="grid-column:1/-1;padding:16px">${icon('event_busy', 36)}<b>هاليوم مكتمل</b><span>${F ? 'اختاري' : 'اختر'} يوم ثاني</span></div>`;
}
function confirmLabel() { return bk.slot == null ? `${F ? 'اختاري' : 'اختر'} الوقت` : `${reschedule ? 'تأكيد الموعد الجديد' : 'تأكيد الحجز'} · ${money(total())}`; }

function renderBooking() {
  const list = [...picked.values()];
  $('#bk').innerHTML = `
    <h2>${F ? 'متى يناسبكِ؟' : 'متى يناسبك؟'}</h2>
    <p class="sub">${list.map((s) => s.name).join('، ')} · ${ar(list.reduce((n, s) => n + s.minutes, 0))} دقيقة</p>
    <div class="bk-lbl">مع مين؟</div>
    <div class="pills" id="staff">${[['any', S.anyStaff], ...salon.staff.map((m) => [m.name, m.name])].map(([v, l]) => `<button class="pill" type="button" data-staff="${v}" aria-pressed="${bk.staff === v}">${v === 'any' ? icon('bolt', 18) : ''}${l}</button>`).join('')}</div>
    <div class="bk-lbl">اليوم</div>
    <div class="pills" id="days">${DAYS.map((d) => `<button class="day" type="button" data-day="${d.i}" aria-pressed="${d.i === bk.day}"><small>${d.wd}</small><b>${ar(d.day)}</b></button>`).join('')}</div>
    <div class="bk-lbl">الوقت</div>
    <div class="slots" id="slots">${slotsHtml()}</div>
    <div class="bk-note">${icon('notifications_active', 20)}<span>الدفع بعد الخدمة · نذكّر${F ? 'كِ' : 'ك'} قبل الموعد بساعتين · إلغاء مجاني</span></div>
    <div class="bk-foot"><button class="btn btn-block pressable" type="button" id="confirm"${bk.slot == null ? ' disabled' : ''}>${confirmLabel()}</button></div>`;
  requestAnimationFrame(() => $(`#days [data-day="${bk.day}"]`)?.scrollIntoView({ inline: 'center', block: 'nearest' }));
}

function renderDone() {
  const d = DAYS[bk.day], list = [...picked.values()];
  $('#bk').innerHTML = `
    <div class="done">
      <div class="confetti">${Array.from({ length: 18 }, (_, i) => `<i style="--c:${['#FF5028', '#F5A623', '#1E8E4E', '#1A63D6'][i % 4]}"></i>`).join('')}</div>
      <span class="done-check"><svg viewBox="0 0 24 24" fill="none"><path pathLength="1" d="M5 12.5l4.2 4.2L19 7" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="1"/></svg></span>
      <h2>${reschedule ? 'تم تغيير الموعد' : 'تم الحجز!'}</h2>
      <p>${F ? 'نشوفكِ' : 'نشوفك'} في ${salon.name} — أرسلنا التأكيد برسالة.</p>
      <div class="ticket">
        <div class="r"><span>الموعد</span><b>${d.wd} ${ar(d.day)} · ${fmtTime(bk.slot)}</b></div>
        <div class="r"><span>الخدمات</span><b>${list.map((s) => s.name).join('، ')}</b></div>
        <div class="r"><span>${S.staffWord}</span><b>${bk.staff === 'any' ? S.anyStaff : bk.staff}</b></div>
        <div class="r"><span>الإجمالي</span><b>${money(total())}</b></div>
      </div>
      <div class="btns"><a class="btn btn-tonal pressable" href="appointments.html">مواعيدي</a><button class="btn btn-black pressable" type="button" id="done">تمام</button></div>
    </div>`;
  const check = $('.done-check');
  spring(check, [{ transform: 'scale(.2)', opacity: 0 }, { transform: 'none', opacity: 1 }], 'bouncy');
  $('path', check).animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 420, delay: 220, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both' });
  $$('.confetti i').forEach((c, i) => {
    const a = (i / 18) * Math.PI * 2, r = 110 + (i % 3) * 40;
    c.animate([{ transform: 'translate(-50%,0) rotate(0)', opacity: 1 }, { transform: `translate(calc(-50% + ${Math.cos(a) * r}px), ${Math.sin(a) * r * 0.7 + 150}px) rotate(${i * 70}deg)`, opacity: 0 }], { duration: 1100 + (i % 4) * 120, delay: 150, easing: 'cubic-bezier(.15,.7,.3,1)', fill: 'both' });
  });
  blurIn($('.ticket'), { y: 20, delay: 0.25 });
}

$('#cta-btn').addEventListener('click', () => {
  if (bk.slot == null) bk.day = firstFree();
  renderBooking();
  openSheet($('#book'));
});
$('#book').addEventListener('click', async (e) => {
  const t = e.target;
  const st = t.closest('[data-staff]');
  if (st) { bk.staff = st.dataset.staff; $$('#staff .pill').forEach((p) => p.setAttribute('aria-pressed', p === st)); return; }
  const day = t.closest('[data-day]');
  if (day) {
    bk.day = +day.dataset.day; bk.slot = null;
    $$('#days .day').forEach((d) => d.setAttribute('aria-pressed', d === day));
    $('#slots').innerHTML = slotsHtml();
    $('#slots').animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 240, easing: 'cubic-bezier(.22,1,.36,1)' });
    $('#confirm').disabled = true; $('#confirm').textContent = confirmLabel();
    return;
  }
  const slot = t.closest('[data-slot]');
  if (slot) {
    bk.slot = +slot.dataset.slot;
    $$('#slots .slot').forEach((s) => s.setAttribute('aria-pressed', s === slot));
    $('#confirm').disabled = false; $('#confirm').textContent = confirmLabel();
    spring($('#confirm'), [{ transform: 'scale(.95)' }, { transform: 'none' }], 'bouncy');
    return;
  }
  if (t.closest('#confirm')) {
    setLoading($('#confirm'), true);
    await new Promise((r) => setTimeout(r, 850));
    const d = DAYS[bk.day].date, at = new Date(d.getFullYear(), d.getMonth(), d.getDate(), Math.floor(bk.slot / 60), bk.slot % 60);
    const list = [...picked.values()];
    const rec = { salonId: salon.id, section: salon.section, services: list.map((s) => s.name), total: total(), minutes: list.reduce((n, s) => n + s.minutes, 0), staff: bk.staff === 'any' ? S.anyStaff : bk.staff, at: at.toISOString(), pay: 'salon', status: 'booked' };
    if (reschedule) appts.update(reschedule.id, rec);
    else appts.add({ id: 'A' + Date.now().toString(36), createdAt: Date.now(), ...rec });
    renderDone();
    return;
  }
  if (t.closest('#done')) { closeSheet($('#book')); picked.clear(); bk.slot = null; sync(); }
});

// reschedule from «مواعيدي»: same services, sheet opens straight away
if (reschedule) {
  salon.categories.forEach((c, ci) => c.services.forEach((s, si) => { if (reschedule.services.includes(s.name)) picked.set(key(ci, si), s); }));
  sync();
  if (picked.size) setTimeout(() => $('#cta-btn').click(), 400);
}
