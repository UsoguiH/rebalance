import { $, $$, initCommon, openMenu } from './m3.js';
import { blurIn, blurOut, revealOnScroll, reduced } from './motion.js';
import { OCCASIONS } from './shared/invite.js';

initCommon();
revealOnScroll();

// Hero slides: calligraphy swaps with blur, page-indicator pills stretch on a spring
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
const auto = () => { clearInterval(timer); if (!reduced()) timer = setInterval(() => go((cur + 1) % slides.length), 4800); };
dots.forEach((d) => d.addEventListener('click', () => { go(+d.dataset.go); auto(); }));
auto();

// Occasion picker (M3 menu)
let occ = 'wedding';
try { occ = localStorage.getItem('azeema_occ') || 'wedding'; } catch {}
const label = $('#occ-label');
const apply = () => {
  label.textContent = OCCASIONS[occ]?.label || 'زواج';
  $$('a[href^="/create"]').forEach((a) => { const u = new URL(a.href); u.searchParams.set('occasion', occ); a.href = u.pathname + u.search; });
};
apply();
$('#occ-pick').addEventListener('click', (e) => {
  e.stopPropagation();
  openMenu(e.currentTarget, Object.entries(OCCASIONS).map(([k, o]) => ({ key: k, label: o.label, icon: o.icon, checked: k === occ })), (it) => {
    occ = it.key; try { localStorage.setItem('azeema_occ', occ); } catch {}
    blurIn(label, { y: 8 }); apply();
  });
});

// Gentle parallax on the product stage (Apple-style depth)
const stage = $('.sc-stage'), title = $('.hero-title');
if (!reduced()) {
  let raf = 0;
  addEventListener('scroll', () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const y = Math.min(scrollY, 600);
      stage.style.transform = `translateY(${y * 0.18}px) scale(${1 - y / 4000})`;
      title.style.transform = `translateY(${y * 0.35}px)`;
      title.style.opacity = String(1 - y / 420);
    });
  }, { passive: true });
}

// Referral memory
const ref = new URLSearchParams(location.search).get('ref');
if (ref) try { localStorage.setItem('azeema_ref', ref.slice(0, 20)); } catch {}
