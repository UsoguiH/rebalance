// Gate — MoLu logo + the whole Eve/Adam picture; each half of the picture is a door, with a button under it.
// Flat (2D) motion only, driven by Motion (the Framer Motion engine): the wordmark writes itself in,
// the headline rises word by word, the picture opens from its centre seam, one shared highlight slides
// between the doors (layoutId-style), and the chosen half grows into the next screen.
import { $, $$, hydrateIcons, getSection, hasChosenSection, setSection, ar } from './shell.js';
import { SALONS } from './data.js';

hydrateIcons();
const M = window.Motion;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches || !M;
const gate = $('#gate'), pic = $('#pic'), glow = $('.glow');
const halves = { eve: $('.half.eve'), adam: $('.half.adam') };
const doors = { eve: $('.door2.eve'), adam: $('.door2.adam') };
const spring = (stiffness = 300, damping = 24, extra = {}) => ({ type: 'spring', stiffness, damping, ...extra });
const EASE = [0.22, 1, 0.36, 1];

['eve', 'adam'].forEach((k) => { $(`[data-near="${k}"]`).textContent = `${ar(SALONS[k].length)} صالونات`; });
if (hasChosenSection()) gate.dataset.hot = getSection();

// ---------- focus: dim the other half, lift this tag, slide the shared glow under this door ----------
let current = null, busy = false;
function focus(k) {
  if (busy || k === current) return;
  const first = current === null;
  current = k;
  gate.dataset.hot = k || gate.dataset.hot || '';
  pic.classList.toggle('has-hot', !!k);
  Object.entries(halves).forEach(([key, h]) => h.classList.toggle('hot', key === k));
  if (reduced) { glow.style.opacity = k ? 1 : 0; if (k) glow.style.left = doors[k].offsetLeft + 'px'; return; }
  Object.entries(halves).forEach(([key, h]) => M.animate(h.querySelector('.tag'), key === k ? { y: -6, scale: 1.08 } : { y: 0, scale: 1 }, spring(420, 22)));
  if (!k) { M.animate(glow, { opacity: 0 }, { duration: 0.25 }); return; }
  const x = doors[k].offsetLeft;
  if (first || getComputedStyle(glow).opacity === '0') { glow.style.left = '0px'; M.animate(glow, { x, opacity: 1, scale: [0.94, 1] }, { x: { duration: 0 }, opacity: { duration: 0.2 }, scale: spring(400, 26) }); }
  else M.animate(glow, { x, opacity: 1 }, spring(380, 30));
}

const bind = (el, k) => {
  el.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') focus(k); });
  el.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') focus(null); });
  el.addEventListener('pointerdown', () => { focus(k); if (!reduced && el.classList.contains('door2')) M.animate(el, { scale: 0.96 }, spring(600, 32)); });
  el.addEventListener('pointerup', () => { if (!reduced && el.classList.contains('door2')) M.animate(el, { scale: 1 }, spring(500, 15)); });
  el.addEventListener('focus', () => focus(k));
  el.addEventListener('blur', () => focus(null));
  el.addEventListener('click', (e) => { e.preventDefault(); enter(k); });
};
['eve', 'adam'].forEach((k) => { bind(halves[k], k); bind(doors[k], k); });

// ---------- enter: the chosen half of the picture grows to full screen, then the next page takes over ----------
async function enter(k) {
  if (busy) return;
  focus(k); busy = true;
  setSection(k);
  const href = `explore.html?s=${k}`;
  if (reduced) { location.href = href; return; }
  const r = halves[k].getBoundingClientRect();
  const zoom = document.createElement('div');
  zoom.className = 'gx-zoom';
  zoom.innerHTML = `<img src="img/${k}-960.webp" alt="">`;
  zoom.querySelector('img').style.viewTransitionName = `gate-${k}`;
  Object.assign(zoom.style, { top: r.top + 'px', left: r.left + 'px', width: r.width + 'px', height: r.height + 'px', borderRadius: '24px', opacity: 0 });
  document.body.append(zoom);
  M.animate(zoom, { opacity: 1 }, { duration: 0.12 });
  M.animate([$('.gx-head'), $('.doors2')], { opacity: 0, y: (i) => (i ? 20 : -14) }, { duration: 0.25, ease: EASE });
  await M.animate(zoom, { top: 0, left: 0, width: innerWidth, height: innerHeight, borderRadius: 0 }, { ...spring(220, 30), restDelta: 0.5 }).then(() => {}, () => {});
  location.href = href;
}
addEventListener('pageshow', (e) => {
  if (!e.persisted) return;
  busy = false; current = null; focus(null); $('.gx-zoom')?.remove();
  [$('.gx-head'), $('.doors2')].forEach((el) => Object.assign(el.style, { opacity: '', transform: '' }));
});

// ---------- entrance (one orchestrated sequence) ----------
if (!reduced) {
  const words = $$('.gx-h1 span');
  M.animate($$('.gx-bg i'), { opacity: [0, 0.32] }, { duration: 1.2, ease: 'easeOut' });
  // logo: the mark pops, the wordmarks write themselves in (Latin left→right, Arabic right→left)
  M.animate($('.logo-mark'), { scale: [0.4, 1], rotate: [-14, 0], opacity: [0, 1] }, spring(320, 15));
  M.animate($('.logo-latin'), { clipPath: ['inset(-20% 100% -40% 0)', 'inset(-20% 0% -40% 0)'] }, { duration: 0.9, delay: 0.2, ease: EASE });
  M.animate($('.logo-ar'), { clipPath: ['inset(-30% 0 -50% 100%)', 'inset(-30% 0 -50% 0%)'] }, { duration: 0.8, delay: 0.35, ease: EASE });
  M.animate($('.logo-sep'), { scaleY: [0, 1] }, { duration: 0.5, delay: 0.3, ease: EASE });
  M.animate($('.gx-kicker'), { opacity: [0, 1], y: [8, 0] }, { duration: 0.48, delay: 0.3, ease: EASE });
  // headline word by word
  M.animate(words, { opacity: [0, 1], y: [18, 0] }, { ...spring(260, 22), delay: M.stagger(0.06, { startDelay: 0.38 }) });
  M.animate(words, { filter: ['blur(8px)', 'blur(0px)'] }, { duration: 0.5, delay: M.stagger(0.06, { startDelay: 0.38 }), ease: 'easeOut' });
  // picture opens like a curtain from the centre seam
  M.animate(pic, { clipPath: ['inset(0% 50% 0% 50% round 30px)', 'inset(0% 0% 0% 0% round 30px)'] }, { duration: 1.05, delay: 0.55, ease: EASE });
  M.animate($('.pic img'), { scale: [1.12, 1] }, { duration: 1.4, delay: 0.55, ease: EASE });
  M.animate($('.seam'), { opacity: [0, 1, 0], scaleY: [0.2, 1, 1] }, { duration: 1.2, delay: 0.5, ease: 'easeInOut' });
  M.animate($$('.half .tag'), { opacity: [0, 1], y: [14, 0], scale: [0.7, 1] }, { ...spring(380, 18), delay: M.stagger(0.1, { startDelay: 1.15 }) });
  M.animate($('.pic-sheen'), { transform: ['translateX(-120%)', 'translateX(120%)'] }, { duration: 1.1, delay: 1.5, ease: EASE });
  // doors rise, arrows spin in
  M.animate([doors.eve, doors.adam], { opacity: [0, 1], y: [26, 0] }, { ...spring(240, 22), delay: M.stagger(0.08, { startDelay: 0.95 }) });
  M.animate($$('.door2 .go'), { scale: [0.3, 1], rotate: [-90, 0] }, { ...spring(380, 16), delay: M.stagger(0.08, { startDelay: 1.15 }) });
}
