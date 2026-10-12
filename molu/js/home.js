import { boot, $, $$, ar, icon, money, appts, getSection, hasChosenSection, setSection, salonCard, bindFavs, faceImg, seedDemo } from './shell.js';
import { SALONS, SECTIONS, CITIES, salonById, fmtTime } from './data.js';
import { openMenu } from './m3.js';
import { blurIn, blurOut, reduced, revealOnScroll, spring } from './motion.js';
import { shapeBadge } from './shapes.js';

seedDemo(SALONS);
const section = boot({ page: 'home' });

// header: avatar shows the visitor's section, badge = upcoming visits
$('#me').innerHTML = `${faceImg(section).replace('class="face"', 'class="face" style="width:100%;height:100%"')}<span class="badge" id="me-badge"></span>`;
const up = appts.upcoming();
$('#me-badge').textContent = up.length ? ar(up.length) : ''; $('#me-badge').dataset.n = up.length;

// hero calligraphy carousel (blur swap; page dots stretch)
const slides = $$('.calli'), dots = $$('.dots button');
let cur = 0, timer;
function go(i) {
  if (i === cur) return;
  const a = slides[cur], b = slides[i];
  blurOut(a, { y: -16 }).finished.then(() => a.classList.remove('on'));
  b.classList.add('on'); blurIn(b, { y: 24 });
  dots.forEach((d, k) => d.setAttribute('aria-selected', k === i));
  cur = i;
}
const auto = () => { clearInterval(timer); if (!reduced()) timer = setInterval(() => go((cur + 1) % slides.length), 4600); };
dots.forEach((d) => d.addEventListener('click', () => { go(+d.dataset.go); auto(); }));
auto();

// brand strip = featured salons (like محلي's ASSAF | THNYAN …)
const featured = [...SALONS.eve.slice(0, 3), ...SALONS.adam.slice(0, 3)].sort((a, b) => b.rating - a.rating);
$('#strip').innerHTML = featured.map((s, i) => `${i ? '<i class="sep"></i>' : ''}<a href="salon.html?id=${s.id}">${s.name.replace(/^(صالون|مركز|حلاق|سبا|استوديو)\s+/, '')}</a>`).join('');

// location
$('#loc').addEventListener('click', (e) => {
  e.stopPropagation();
  openMenu(e.currentTarget, CITIES.map((c) => ({ label: c, checked: $('#loc-l').textContent.startsWith(c) })), (it) => { $('#loc-l').textContent = it.label; blurIn($('#loc-l'), { y: 8 }); });
});

// doors: remember the choice; mark the last one
if (hasChosenSection()) $(`.door.${section}`)?.classList.add('last');
$$('[data-door]').forEach((d) => d.addEventListener('click', () => setSection(d.dataset.door)));
$$('.door').forEach((d, i) => spring(d, [{ opacity: 0, transform: 'translateY(40px) scale(.94)' }, { opacity: 1, transform: 'none' }], 'smooth', { delay: 0.12 + i * 0.07 }));

// body
const next = up[0];
const nextCard = next ? (() => {
  const s = salonById(next.salonId), d = new Date(next.at);
  const when = new Intl.DateTimeFormat('ar-SA-u-nu-latn-ca-gregory', { weekday: 'long', day: 'numeric', month: 'long' }).format(d);
  return `<section class="sec"><a class="next-appt pressable" href="appointments.html" data-reveal>
    <span class="ic">${icon('event_available', 28)}</span>
    <span class="grow"><b>موعدك الجاي في ${s.name}</b><span>${when} · ${fmtTime(d.getHours() * 60 + d.getMinutes())}</span></span>
    <span class="pill-dark">التفاصيل</span></a></section>`;
})() : '';

const TILES = [
  ['#FFE45C', 'اكتشف الجديد', 'صالونات انضمت هالأسبوع', 'storefront', 'explore.html?sort=new'],
  ['#FF5028', 'خصم فوق الخصم', 'عروض تصل 20٪', 'percent', 'offers.html', '#fff'],
  ['#F2E3D5', 'تجهيز عرائس', 'باقات كاملة ليومك', 'celebration', 'explore.html?s=eve&cat=makeup'],
  ['#1F2F3A', 'باقة العريس', 'حلاقة وتنظيف وعناية', 'workspace_premium', 'explore.html?s=adam&cat=groom', '#fff'],
];
const near = [...SALONS[section]].sort((a, b) => a.km - b.km).slice(0, 6);
$('#main').innerHTML = `
  ${nextCard}
  <section class="sec">
    <div class="sec-h"><h2>عروض تستاهل</h2></div>
    <div class="ptiles">${TILES.map(([bg, t, sub, ic, href, fg]) => `<a class="ptile pressable" href="${href}" style="--bg:${bg};--fg:${fg || '#1A1A1A'}" data-reveal><b>${t}</b><small>${sub}</small><span class="art">${icon(ic, 56)}</span></a>`).join('')}</div>
  </section>
  <section class="sec">
    <div class="sec-h"><h2>الأقرب ${section === 'eve' ? 'لكِ' : 'لك'} في ${SECTIONS[section].name}</h2><a href="explore.html?s=${section}" aria-label="عرض الكل">${icon('arrow_back', 22)}</a></div>
    <div class="carousel">${near.map((s, i) => salonCard(s, { i })).join('')}</div>
  </section>
  <section class="sec" data-reveal>
    <div class="owner-banner">${shapeBadge({ shape: 5, size: 56 }).replace('class="shape-badge"', 'class="shape-badge" style="--md-primary-container:rgba(255,255,255,.18);color:#fff"')}
      <h2>صاحب صالون أو حلاق؟</h2><p>صفحة حجز باسمك، تذكير تلقائي لعملائك، وبدون عمولة.</p>
      <a class="btn pressable" href="business.html">سجّل صالونك مجاناً</a></div>
  </section>
  <footer class="foot"><nav><a href="business.html">لأصحاب الصالونات</a><a href="account.html">حسابي</a><a href="#">الأسئلة الشائعة</a><a href="#">الشروط والخصوصية</a></nav><span>support@molu-app.com</span></footer>`;
bindFavs(document);
revealOnScroll();
