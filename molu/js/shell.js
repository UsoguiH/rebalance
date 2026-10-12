// App shell: section (حواء / آدم), محلي floating nav, device stores, shared renderers.
import { SECTIONS, money, salonById } from './data.js';
import { icon } from './icons.js';
import { coverArt } from './art.js';
import { $, $$, ar, initCommon, snackbar } from './m3.js';
import { spring } from './motion.js';

export { icon, $, $$, ar, snackbar, spring, money };

// ---------- tiny localStorage stores (wrapped: private mode / blocked storage must not break the page) ----------
const store = (k, def) => ({
  get() { try { return JSON.parse(localStorage.getItem(k)) ?? def; } catch { return def; } },
  set(v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
});

const sectionStore = store('molu_section', null);
export function getSection() {
  const q = new URLSearchParams(location.search).get('s');
  if (q === 'eve' || q === 'adam') { sectionStore.set(q); return q; }
  return sectionStore.get() || 'eve';
}
export const setSection = (s) => sectionStore.set(s);
export const hasChosenSection = () => !!sectionStore.get();

const favStore = store('molu_favs', []);
export const favs = {
  list: () => favStore.get(),
  has: (id) => favStore.get().includes(id),
  toggle(id) {
    const l = favStore.get(), on = !l.includes(id);
    favStore.set(on ? [id, ...l] : l.filter((x) => x !== id));
    return on;
  },
};

const apptStore = store('molu_appts', []);
export const isUpcoming = (a) => a.status === 'booked' && new Date(a.at) > Date.now() - 36e5;
// bookings whose salon no longer exists in the demo data are skipped
const known = () => apptStore.get().filter((a) => salonById(a.salonId));
export const appts = {
  list: known,
  upcoming: () => known().filter(isUpcoming).sort((a, b) => new Date(a.at) - new Date(b.at)),
  add(a) { const l = apptStore.get(); l.unshift(a); apptStore.set(l); },
  update(id, patch) { apptStore.set(apptStore.get().map((a) => (a.id === id ? { ...a, ...patch } : a))); },
};

export const userStore = store('molu_user', null);

// ---------- floating nav: 3 in a pill + مواعيدي in its own circle ----------
// three things people come back for; offers and categories live on the home screen (its shortcuts), not in the bar
const NAV = [
  ['home', 'explore.html', 'home', 'الرئيسية'],
  ['favs', 'favorites.html', 'favorite', 'المفضلة'],
  ['account', 'account.html', 'person', 'حسابي'],
];
const navIcon = (n) => `<span class="ni">${icon(n, 28, 'ni-o')}${icon(n + '_f', 28, 'ni-f')}</span>`;
export function renderNav(active) {
  const n = appts.upcoming().length;
  const items = NAV.map(([k, href, ic, label]) => `<a class="nav-item pressable" href="${href}"${k === active ? ' aria-current="page"' : ''} aria-label="${label}">${navIcon(ic)}</a>`).join('');
  document.body.insertAdjacentHTML('beforeend', `
    <nav class="navbar" aria-label="التنقل">
      <div class="nav-group"><i class="nav-indicator"></i>${items}</div>
      <div class="nav-solo"><a class="nav-item pressable" href="appointments.html"${active === 'appts' ? ' aria-current="page"' : ''} aria-label="مواعيدي"><span class="badge-wrap">${navIcon('calendar_month')}<span class="badge" data-n="${n}">${n ? ar(n) : ''}</span></span></a></div>
    </nav>`);
}

// ---------- category art (Uber-Eats style) ----------
// Drop generated PNG/WebP art into img/icons/<section>-<id>.webp and list the name in ICON_FILES;
// until then each category shows its emoji.
export const ICON_FILES = new Set([]);
const EMOJI = {
  offer: '🏷️', home: '🏠', all: '✨', gift: '🎁', fire: '🔥',
  'eve-hair': '💇‍♀️', 'eve-nails': '💅', 'eve-makeup': '💄', 'eve-brows': '👁️', 'eve-skin': '🧴', 'eve-massage': '💆‍♀️', 'eve-henna': '🌿', 'eve-bride': '👰‍♀️',
  'adam-cut': '💈', 'adam-beard': '🧔🏻', 'adam-color': '🎨', 'adam-care': '🧖‍♂️', 'adam-massage': '💆‍♂️', 'adam-groom': '🤵',
};
export function catArt(section, id, size = 48) {
  const k = `${section}-${id}`;
  if (ICON_FILES.has(k) || ICON_FILES.has(id)) return `<img class="cat-art" src="img/icons/${ICON_FILES.has(k) ? k : id}.webp" alt="" width="${size}" height="${size}" loading="lazy" decoding="async">`;
  return `<span class="cat-emoji" style="font-size:${Math.round(size * 0.82)}px" aria-hidden="true">${EMOJI[k] || EMOJI[id] || '✨'}</span>`;
}

// ---------- shared renderers ----------
export const faceImg = (s) => `<span class="face"><img src="${SECTIONS[s].img}-560.webp" alt="" width="32" height="32"></span>`;
export const verified = () => icon('verified_f', 17, 'verified');

// Uber Eats card: big picture, name, one quiet meta line, rating bubble
export function salonCard(s, { i = 0 } = {}) {
  const on = favs.has(s.id);
  return `
  <article class="sc-card" style="--i:${i}" data-id="${s.id}">
    <a class="img pressable" href="salon.html?id=${s.id}" aria-label="${s.name}">
      ${coverArt(s)}
      ${s.offer ? `<span class="offer">${s.offer}</span>` : ''}
      ${s.home ? `<span class="home-tag">${icon('home_work', 15)}يجونك البيت</span>` : ''}
    </a>
    <button class="fav${on ? ' on' : ''}" type="button" data-fav="${s.id}" aria-pressed="${on}" aria-label="المفضلة">${icon('favorite', 26, 'f-o')}${icon('favorite_f', 26, 'f-f')}</button>
    <a class="meta" href="salon.html?id=${s.id}">
      <span class="grow"><h3>${s.name}${s.verified ? verified() : ''}</h3>
      <p>${ar(s.km)} كم · ${s.open ? 'مفتوح' : 'يفتح 10 ص'} · من ${money(s.from)}</p></span>
      <span class="rate">${s.reviews ? s.rating.toFixed(1) : 'جديد'}</span>
    </a>
  </article>`;
}

// favorite heart: spring pop + snackbar, delegated once per page
export function bindFavs(root = document, onChange) {
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-fav]');
    if (!b) return;
    e.preventDefault();
    const on = favs.toggle(b.dataset.fav);
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', on);
    spring(b, [{ transform: 'scale(.6)' }, { transform: 'scale(1)' }], 'bouncy');
    snackbar(on ? 'أُضيف للمفضلة' : 'أُزيل من المفضلة', on ? { action: 'عرض', onAction: () => (location.href = 'favorites.html') } : {});
    onChange?.(b.dataset.fav, on);
  });
}

// hydrate <i data-i="name" data-s="24"> placeholders in static markup
export function hydrateIcons(root = document) {
  $$('[data-i]', root).forEach((el) => { el.outerHTML = icon(el.dataset.i, +el.dataset.s || 24, el.className); });
}

// حواء | آدم switch: two options, a thumb that slides (CSS transition), and a quick content swap.
export function secSwitch(host, current, onChange) {
  host.classList.add('sec-seg');
  host.setAttribute('role', 'group'); host.setAttribute('aria-label', 'القسم');
  host.innerHTML = `<i class="ss-thumb" aria-hidden="true"></i>` + ['eve', 'adam'].map((k) => `<button type="button" data-k="${k}" aria-pressed="${k === current}">${faceImg(k)}<span>${SECTIONS[k].name}</span></button>`).join('');
  const thumb = host.querySelector('.ss-thumb');
  const place = (animate) => {
    const on = host.querySelector('[aria-pressed="true"]');
    if (!animate) thumb.style.transition = 'none';
    thumb.style.width = on.offsetWidth + 'px';
    thumb.style.transform = `translateX(${on.offsetLeft - 4}px)`;
    if (!animate) requestAnimationFrame(() => (thumb.style.transition = ''));
  };
  requestAnimationFrame(() => place(false));
  addEventListener('resize', () => place(false));
  host.addEventListener('click', (e) => {
    const b = e.target.closest('[data-k]');
    if (!b || b.getAttribute('aria-pressed') === 'true') return;
    host.querySelectorAll('[data-k]').forEach((x) => x.setAttribute('aria-pressed', x === b));
    place(true);
    setSection(b.dataset.k); document.body.dataset.section = b.dataset.k;
    onChange(b.dataset.k);
  });
}
// fast content swap: 90ms out, re-render, 200ms in (no page snapshot)
export function swap(el, render) {
  el.classList.add('swap-out');
  setTimeout(() => { render(); el.classList.remove('swap-out'); el.classList.remove('swap-in'); void el.offsetWidth; el.classList.add('swap-in'); }, 90);
}

export function boot({ page, section = getSection(), nav = true } = {}) {
  document.body.dataset.section = section;
  hydrateIcons();
  if (nav) renderNav(page);
  initCommon();
  return section;
}

// demo history so «مواعيدي» never opens empty on a first visit (only once per device)
export function seedDemo(SALONS) {
  try { if (localStorage.getItem('molu_seeded')) return; localStorage.setItem('molu_seeded', '1'); } catch { return; }
  const d = (days, h) => { const x = new Date(); x.setDate(x.getDate() + days); x.setHours(h, 0, 0, 0); return x.toISOString(); };
  const mk = (s, svc, days, h, status) => ({ id: 'D' + s.id + days, salonId: s.id, section: s.section, services: [svc.name], total: svc.price, minutes: svc.minutes, staff: s.staff[0].name, at: d(days, h), pay: 'salon', status, createdAt: Date.now() });
  const e = SALONS.eve, a = SALONS.adam;
  const l = [mk(e[0], e[0].categories[0].services[0], -9, 19, 'booked'), mk(a[1], a[1].categories[0].services[0], -27, 21, 'booked'), mk(e[3], e[3].categories[0].services[0], -41, 17, 'cancelled')];
  apptStore.set([...apptStore.get(), ...l]);
}
