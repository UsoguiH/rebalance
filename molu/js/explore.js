import { boot, $, $$, ar, icon, salonCard, bindFavs, setSection, faceImg, money, catArt, appts } from './shell.js';
import { SECTIONS, CATEGORIES, CITIES, SALONS, salonById, fmtTime } from './data.js';
import { mapArt, coverArt } from './art.js';
import { openMenu } from './m3.js';
import { spring, blurIn } from './motion.js';
import { shapeBadge } from './shapes.js';

const params = new URLSearchParams(location.search);
let section = boot({ page: 'home' });
const state = { q: params.get('q') || '', cat: params.get('cat') || '', home: params.get('home') === '1', offer: params.get('offer') === '1' };

const shortcutList = () => [
  { id: 'offer', name: 'عروض', icon: 'percent' },
  { id: 'home', name: 'في البيت', icon: 'home_work' },
  ...CATEGORIES[section].map((c) => ({ id: c.id, name: c.name, icon: c.icon })),
];

function header() {
  const S = SECTIONS[section];
  $('#sec').innerHTML = `${faceImg(section)}${S.name}${icon('expand_more', 18)}`;
  $('#sec .face img').style.viewTransitionName = `gate-${section}`; // the gate picture morphs into this avatar
  $('#q').placeholder = S.searchPh;
  $('#q').value = state.q;
  $('#sbox').classList.toggle('has', !!state.q);
  $('#cats').innerHTML = shortcutList().map((c) => {
    const on = c.id === state.cat || (c.id === 'home' && state.home) || (c.id === 'offer' && state.offer);
    return `<button class="sc" type="button" data-sc="${c.id}" aria-pressed="${on}"><span class="tile">${catArt(section, c.id, 56)}</span>${c.name}</button>`;
  }).join('');
}

const matches = (s) => {
  const q = state.q.trim();
  return (!state.cat || s.categories.some((c) => c.id === state.cat)) && (!state.home || s.home) && (!state.offer || s.offer) &&
    (!q || s.name.includes(q) || s.district.includes(q) || s.categories.some((c) => c.name.includes(q) || c.services.some((x) => x.name.includes(q))));
};
const filtering = () => state.q.trim() || state.cat || state.home || state.offer;
const label = () => state.cat ? CATEGORIES[section].find((c) => c.id === state.cat)?.name : state.home ? 'خدمة في البيت' : state.offer ? 'عروض' : `«${state.q.trim()}»`;
const row = (title, list, href = '') => list.length ? `<section class="sec"><div class="sec-h"><h2>${title}</h2>${href ? `<button type="button" data-more="${href}" aria-label="عرض الكل">${icon('arrow_back', 22)}</button>` : ''}</div><div class="carousel">${list.map((s, i) => salonCard(s, { i })).join('')}</div></section>` : '';

function feed() {
  const all = SALONS[section];
  const f = $('#feed');
  if (filtering()) {
    const list = all.filter(matches).sort((a, b) => b.rating - a.rating);
    f.innerHTML = `<section class="sec">
      <div class="sec-h"><h2>${list.length ? `${ar(list.length)} ${list.length > 2 && list.length < 11 ? 'صالونات' : 'صالون'}` : 'ما لقينا شي'}</h2>
      <button class="filter-chip pressable" type="button" id="reset" style="width:auto;border-radius:19px;background:#1A1A1A">${label()}${icon('close', 18)}</button></div>
      ${list.length ? `<div class="list rise">${list.map((s, i) => salonCard(s, { i })).join('')}</div>` : `<div class="empty">${shapeBadge({ shape: 4, size: 88 })}<h3>جرّب كلمة ثانية</h3><p>أو امسح البحث وتصفّح كل الصالونات.</p></div>`}
    </section>`;
  } else {
    const near = [...all].sort((a, b) => a.km - b.km);
    const next = appts.upcoming()[0];
    const nextHtml = next ? (() => {
      const s = salonById(next.salonId), d = new Date(next.at);
      const when = new Intl.DateTimeFormat('ar-SA-u-nu-latn-ca-gregory', { weekday: 'long', day: 'numeric', month: 'long' }).format(d);
      return `<section class="sec"><a class="next-appt pressable" href="appointments.html"><span class="ic">${icon('event_available', 28)}</span><span class="grow"><b>موعدك الجاي في ${s.name}</b><span>${when} · ${fmtTime(d.getHours() * 60 + d.getMinutes())}</span></span><span class="pill-dark">التفاصيل</span></a></section>`;
    })() : '';
    f.innerHTML = nextHtml + row(`الأقرب ${section === 'eve' ? 'لكِ' : 'لك'}`, near.slice(0, 6)) +
      row('عروض اليوم', all.filter((s) => s.offer), 'offer') +
      row('الأعلى تقييماً', [...all].sort((a, b) => b.rating - a.rating).slice(0, 6)) +
      `<section class="sec"><div class="sec-h"><h2>كل الصالونات</h2></div><div class="list">${near.map((s, i) => salonCard(s, { i })).join('')}</div></section>
      <a class="owner-link pressable" href="business.html">${icon('storefront', 22)}<span class="grow"><b>صاحب صالون أو حلاق؟</b><span>سجّل صالونك مجاناً — بدون عمولة</span></span>${icon('chevron_left', 22)}</a>`;
  }
}
function render(animate = true) {
  header(); feed();
  if (animate) $$('#feed .sec').forEach((s, i) => spring(s, [{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }], 'gentle', { delay: i * 0.06 }));
}
render(false);
bindFavs(document);

// ---------- interactions ----------
$('#sec').addEventListener('click', () => {
  const go = () => { section = section === 'eve' ? 'adam' : 'eve'; setSection(section); document.body.dataset.section = section; state.cat = ''; history.replaceState(null, '', `?s=${section}`); render(false); };
  document.startViewTransition ? document.startViewTransition(go) : go();
});
let qT;
$('#q').addEventListener('input', (e) => { state.q = e.target.value; $('#sbox').classList.toggle('has', !!state.q); clearTimeout(qT); qT = setTimeout(() => { feed(); }, 120); });
$('#clear').addEventListener('click', () => { state.q = ''; $('#q').value = ''; $('#sbox').classList.remove('has'); feed(); $('#q').focus(); });
$('#cats').addEventListener('click', (e) => {
  const b = e.target.closest('[data-sc]'); if (!b) return;
  const id = b.dataset.sc, was = b.getAttribute('aria-pressed') === 'true';
  state.cat = ''; state.home = false; state.offer = false;
  if (!was) { if (id === 'home') state.home = true; else if (id === 'offer') state.offer = true; else state.cat = id; }
  spring($('.tile', b), [{ transform: 'scale(.8)' }, { transform: 'none' }], 'bouncy');
  $$('#cats .sc').forEach((x) => x.setAttribute('aria-pressed', x === b && !was));
  feed();
  blurIn($('#feed'), { y: 18 });
});
document.addEventListener('click', (e) => {
  if (e.target.closest('#reset')) { state.q = ''; state.cat = ''; state.home = false; state.offer = false; render(); }
  const more = e.target.closest('[data-more]');
  if (more) { state.offer = true; render(); scrollTo({ top: 0, behavior: 'smooth' }); }
});
$('#loc').addEventListener('click', (e) => {
  e.stopPropagation();
  openMenu(e.currentTarget, CITIES.map((c) => ({ label: c })), (it) => { $('#loc-l').textContent = it.label; blurIn($('#loc-l'), { y: 8 }); });
});

// map pill: hides while scrolling down, comes back on scroll up
let lastY = scrollY;
addEventListener('scroll', () => { const y = scrollY; $('#map-fab').classList.toggle('hide', y > lastY && y > 120); lastY = y; }, { passive: true });

// full-screen map, morphing out of the pill (clip-path spring)
$('#map-fab').addEventListener('click', () => {
  const fab = $('#map-fab').getBoundingClientRect();
  const list = SALONS[section].filter(matches);
  let active = list[0]?.id;
  const el = document.createElement('div');
  el.className = 'map-full';
  const paint = () => {
    const s = list.find((x) => x.id === active);
    el.innerHTML = `${mapArt(list, { activeId: active, section, h: Math.round(400 * innerHeight / innerWidth) })}
      <button class="round pressable" type="button" aria-label="إغلاق">${icon('close', 22)}</button>
      ${s ? `<a class="map-card pressable" href="salon.html?id=${s.id}"><span class="thumb">${coverArt(s)}</span><span class="grow"><b>${s.name}</b><br><span class="muted" style="font-size:.86rem">${ar(s.km)} كم · من ${money(s.from)}</span></span><span class="pill-dark">${SECTIONS[section].book}</span></a>` : ''}`;
    $('.round', el).onclick = close;
  };
  const close = () => {
    document.documentElement.style.overflow = '';
    spring(el, [{ clipPath: 'inset(0 round 0px)' }, { clipPath: `inset(${fab.top}px ${innerWidth - fab.right}px ${innerHeight - fab.bottom}px ${fab.left}px round 23px)` }], 'snappy').finished.then(() => el.remove());
  };
  paint();
  el.addEventListener('click', (e) => {
    const pin = e.target.closest('.pin'); if (!pin) return;
    active = pin.dataset.id; paint();
    spring($('.map-card', el), [{ transform: 'translateY(24px)', opacity: 0 }, { transform: 'none', opacity: 1 }], 'bouncy');
  });
  document.body.append(el);
  document.documentElement.style.overflow = 'hidden';
  spring(el, [{ clipPath: `inset(${fab.top}px ${innerWidth - fab.right}px ${innerHeight - fab.bottom}px ${fab.left}px round 23px)` }, { clipPath: 'inset(0 round 0px)' }], 'smooth');
  $$('.pin', el).forEach((p, i) => p.animate([{ opacity: 0, translate: '0 -16px' }, { opacity: 1, translate: '0 0' }], { duration: 400, delay: 250 + i * 40, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' }));
});
