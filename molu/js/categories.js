import { boot, $, $$, ar, icon, money, catArt, secSwitch, swap } from './shell.js';
import { SECTIONS, CATEGORIES, SALONS } from './data.js';
import { spring, blurIn } from './motion.js';
import { initials } from './art.js';

// The whole screen is one function: a full page load runs it once; moving between screens in place (js/vt.js)
// calls it again on the fresh markup, without downloading or re-evaluating this file.
export default function mount() {
  let section = boot({ page: 'cats' });
  let sel = 'offers';

  const offerGroups = () => {
    const list = SALONS[section];
    const disc = list.filter((s) => s.offer);
    const cheap = [...list].sort((a, b) => a.from - b.from);
    return [
      { title: 'عروض اليوم', n: 6, unit: ['عروض', 'عرض'], tiles: [
        ...[20, 15, 10].map((p) => ({ big: `${ar(p)}٪`, label: `خصم يصل إلى ${ar(p)}٪`, href: `explore.html?s=${section}&offer=1` })),
        ...[cheap[0], cheap[1]].map((s) => ({ big: ar(s.from), label: `بـ ${money(s.from)}`, href: `salon.html?id=${s.id}` })),
        { art: 'fire', label: 'الأكثر حجزاً هالأسبوع', href: `explore.html?s=${section}` },
      ] },
      { title: 'خذ أكثر بأقل', n: 3, unit: ['عروض', 'عرض'], tiles: [
        { art: 'gift', label: 'الخدمة الثانية بنص السعر', href: disc[0] ? `salon.html?id=${disc[0].id}` : '#' },
        { art: section === 'eve' ? 'bride' : 'groom', label: section === 'eve' ? 'باقات العرائس' : 'باقة العريس', href: `explore.html?s=${section}&cat=${section === 'eve' ? 'makeup' : 'groom'}` },
        { art: 'home', label: 'خدمة في البيت', href: `explore.html?s=${section}&home=1` },
      ] },
    ];
  };
  const catGroups = (c) => {
    const salons = SALONS[section].filter((s) => s.categories.some((x) => x.id === c.id));
    return [
      { title: c.name, n: c.services.length, tiles: c.services.map(([name, , price]) => ({ art: c.id, label: name, sub: `من ${money(Math.round(price * 0.85 / 5) * 5)}`, href: `explore.html?s=${section}&q=${encodeURIComponent(name)}` })) },
      { title: `صالونات ${c.name}`, n: salons.length, unit: ['صالونات', 'صالون'], tiles: salons.slice(0, 6).map((s) => ({ logo: initials(s.name), label: s.name, sub: `★ ${s.rating.toFixed(1)}`, href: `salon.html?id=${s.id}` })) },
    ];
  };

  function rail() {
    const items = [{ id: 'offers', name: 'العروض', icon: 'percent' }, ...CATEGORIES[section]];
    $('#rail').innerHTML = items.map((c) => `<button type="button" role="tab" data-rail="${c.id}" aria-selected="${c.id === sel}"><span class="ri">${catArt(section, c.id === 'offers' ? 'offer' : c.id, 40)}</span>${c.name}</button>`).join('');
  }
  const tile = (t) => `<a class="gt" href="${t.href}"><span class="ti">${t.big ? `<span class="num3d">${t.big}</span>` : t.art ? catArt(section, t.art, 44) : t.logo ? `<span style="font:700 1.8rem/1 var(--md-font-brand);color:var(--md-primary)">${t.logo}</span>` : icon(t.ico, 34)}</span>${t.label}${t.sub ? `<small>${t.sub}</small>` : ''}</a>`;
  function panel() {
    const groups = sel === 'offers' ? offerGroups() : catGroups(CATEGORIES[section].find((c) => c.id === sel));
    $('#panel').innerHTML = groups.map((g, i) => `
      <section class="group" data-open="true" style="--i:${i}">
        <button class="g-head" type="button" aria-expanded="true"><span><b>${g.title}</b><small>${ar(g.n)} ${(g.unit || ['خدمات', 'خدمة'])[g.n > 2 && g.n < 11 ? 0 : 1]}</small></span>${icon('expand_less', 24)}</button>
        <div class="g-body"><div class="gtiles">${g.tiles.map(tile).join('')}</div></div>
      </section>`).join('');
    $$('#panel .group').forEach((g, i) => spring(g, [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], 'gentle', { delay: i * 0.06 }));
  }
  rail(); panel();

  $('#rail').addEventListener('click', (e) => {
    const b = e.target.closest('[data-rail]'); if (!b || b.dataset.rail === sel) return;
    sel = b.dataset.rail;
    $$('#rail [data-rail]').forEach((x) => x.setAttribute('aria-selected', x === b));
    spring($('.ri', b), [{ transform: 'scale(.8)' }, { transform: 'scale(1.08)' }], 'bouncy');
    panel();
    scrollTo({ top: 0, behavior: 'smooth' });
  });

  // collapsible groups: spring the height, rotate the chevron (CSS)
  $('#panel').addEventListener('click', (e) => {
    const h = e.target.closest('.g-head'); if (!h) return;
    const g = h.parentElement, body = $('.g-body', g), open = g.dataset.open === 'true';
    const from = body.offsetHeight;
    body.hidden = false;
    const to = open ? 0 : body.scrollHeight;
    g.dataset.open = !open; h.setAttribute('aria-expanded', !open);
    spring(body, [{ height: from + 'px' }, { height: to + 'px' }], 'smooth').finished.then((a) => { a.cancel(); body.hidden = open; });
    if (!open) blurIn($('.gtiles', body), { y: 16 });
  });

  secSwitch($('#sec'), section, (k) => { section = k; sel = 'offers'; swap($('.cat-layout'), () => { rail(); panel(); }); });
  $('#q').addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.value.trim()) location.href = `explore.html?s=${section}&q=${encodeURIComponent(e.target.value.trim())}`; });
}
if (!window.__softnav) mount();
