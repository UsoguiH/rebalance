// Gate — dark stage, logo, حواء and آدم as two big cream cards showing each scene in full.
// Flat (2D) motion only, driven by Motion (the Framer Motion engine). No side wipes or slide-ins:
// things rise, scale and un-blur into place; the scene is its own layer; dots drift; the arrow pulses;
// the chosen card fills the screen while its scene glides to the centre, then the next page takes over.
import { $, $$, hydrateIcons, getSection, hasChosenSection, setSection, ar, money } from './shell.js';
import { SALONS } from './data.js';

hydrateIcons();
const M = window.Motion;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches || !M;
const gate = $('#gate'), wrap = $('.gx-doors'), doors = $$('.gd');
const spring = (stiffness = 300, damping = 24) => ({ type: 'spring', stiffness, damping });
const EASE = [0.22, 1, 0.36, 1];

// real numbers on each card
['eve', 'adam'].forEach((k) => {
  const l = SALONS[k];
  $(`[data-near="${k}"]`).textContent = `${ar(l.length)} صالونات`;
  $(`[data-from="${k}"]`).insertAdjacentHTML('afterend', `<em class="from">يبدأ من ${money(Math.min(...l.map((s) => s.from)))}</em>`);
});
if (hasChosenSection()) gate.dataset.hot = getSection();

let busy = false;
const scene = (d) => d.querySelector('.gd-scene img');
function hot(door) {
  doors.forEach((d) => d.classList.toggle('hot', d === door));
  wrap.classList.toggle('has-hot', !!door);
  if (door) gate.dataset.hot = door.dataset.k;
}

doors.forEach((d) => {
  if (!reduced) {
    d.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'mouse' || busy) return; hot(d); M.animate(d, { y: -6 }, spring(300, 22)); M.animate(d.querySelector('.gd-scene'), { scale: 1.03, y: -4 }, spring(260, 20)); });
    d.addEventListener('pointerleave', () => { if (busy) return; hot(null); M.animate(d, { y: 0, scale: 1 }, spring(300, 22)); M.animate(d.querySelector('.gd-scene'), { scale: 1, y: 0 }, spring(260, 20)); });
    // whileTap: the card squeezes while the scene pops forward a touch
    d.addEventListener('pointerdown', () => { if (busy) return; hot(d); M.animate(d, { scale: 0.97 }, spring(600, 32)); M.animate(d.querySelector('.gd-scene'), { scale: 1.05 }, spring(500, 26)); });
    const release = (e) => {
      if (busy) return;
      M.animate(d, { scale: 1 }, spring(500, 16));
      M.animate(d.querySelector('.gd-scene'), { scale: e?.pointerType === 'mouse' ? 1.03 : 1 }, spring(400, 18));
      if (e?.pointerType !== 'mouse') setTimeout(() => !busy && hot(null), 250);
    };
    d.addEventListener('pointerup', release);
    d.addEventListener('pointercancel', release);
  }
  d.addEventListener('focus', () => hot(d));
  d.addEventListener('blur', () => hot(null));
  d.addEventListener('click', (e) => { e.preventDefault(); enter(d); });
});

// ---------- enter: the card fills the screen, its scene glides to the centre; the next page takes over ----------
async function enter(door) {
  if (busy) return;
  busy = true;
  const k = door.dataset.k, href = door.getAttribute('href');
  setSection(k);
  if (reduced) { location.href = href; return; }
  hot(door);
  const cr = door.getBoundingClientRect(), sr = door.querySelector('.gd-scene').getBoundingClientRect();
  const zoom = document.createElement('div');
  zoom.className = 'gx-zoom';
  zoom.innerHTML = `<img src="${scene(door).currentSrc}" alt="">`;
  const img = zoom.querySelector('img');
  img.style.viewTransitionName = `gate-${k}`;
  Object.assign(zoom.style, { top: cr.top + 'px', left: cr.left + 'px', width: cr.width + 'px', height: cr.height + 'px', borderRadius: '30px' });
  Object.assign(img.style, { left: sr.left - cr.left + 'px', top: sr.top - cr.top + 'px', width: sr.width + 'px', height: sr.height + 'px' });
  document.body.append(zoom);
  door.style.visibility = 'hidden';
  M.animate(doors.find((d) => d !== door), { opacity: 0, scale: 0.94 }, { duration: 0.25 });
  M.animate($('.gx-head'), { opacity: 0, y: -12 }, { duration: 0.2 });
  let h = innerHeight * 0.72, w = h * 960 / 1350;
  if (w > innerWidth * 0.92) { w = innerWidth * 0.92; h = w * 1350 / 960; }
  const s = { ...spring(220, 30), restDelta: 0.5 };
  M.animate(img, { left: (innerWidth - w) / 2, top: (innerHeight - h) / 2, width: w, height: h }, s);
  await M.animate(zoom, { top: 0, left: 0, width: innerWidth, height: innerHeight, borderRadius: 0 }, s).then(() => {}, () => {});
  location.href = href;
}
addEventListener('pageshow', (e) => {
  if (!e.persisted) return;
  busy = false; hot(null); $('.gx-zoom')?.remove();
  doors.forEach((d) => { d.style.visibility = ''; d.style.opacity = ''; d.style.transform = ''; });
  Object.assign($('.gx-head').style, { opacity: '', transform: '' });
});

// ---------- entrance: everything rises, scales and un-blurs into place (no side motion) ----------
const rise = (el, delay, from = 18) => {
  M.animate(el, { opacity: [0, 1], y: [from, 0] }, { ...spring(240, 22), delay });
  M.animate(el, { filter: ['blur(8px)', 'blur(0px)'] }, { duration: 0.5, delay, ease: 'easeOut' });
};
if (!reduced) {
  M.animate($('.gx-bg'), { opacity: [0, 1] }, { duration: 1 });
  // header: the fox pops, the wordmark and the headline rise word by word
  if ($('.logo-mark')) {
    M.animate($('.logo-mark'), { scale: [0.4, 1], rotate: [-14, 0], opacity: [0, 1] }, spring(320, 15));
    [$('.logo-latin'), $('.logo-sep'), $('.logo-ar')].forEach((el, i) => rise(el, 0.15 + i * 0.07, 10));
  } else rise($('.molu-logo'), 0.1, 10);
  rise($('.gx-hl small'), 0.05, 10);
  $$('.gx-hl h1 > *').forEach((el, i) => rise(el, 0.12 + i * 0.08, 16));

  doors.forEach((d, i) => {
    const t = 0.2 + i * 0.14;
    // the card rises and grows into place…
    M.animate(d, { opacity: [0, 1], y: [48, 0], scale: [0.9, 1] }, { ...spring(170, 21), delay: t });
    // …the scene settles a beat later as its own layer…
    M.animate(d.querySelector('.gd-scene'), { opacity: [0, 1], y: [36, 0], scale: [0.86, 1] }, { ...spring(190, 18), delay: t + 0.14 });
    // …then the words, line by line
    M.animate(d.querySelector('.gd-chip'), { opacity: [0, 1], scale: [0.6, 1], y: [-8, 0] }, { ...spring(420, 18), delay: t + 0.3 });
    $$('.gd-name > *', d).forEach((el, j) => rise(el, t + 0.34 + j * 0.07, 14));
    M.animate(d.querySelector('.gd-go'), { scale: [0.2, 1], rotate: [-120, 0] }, { ...spring(360, 15), delay: t + 0.55 });
    // the illustration's dots pop in, then drift
    $$('.dot', d).forEach((dot, j) => {
      M.animate(dot, { scale: [0, 1] }, { ...spring(500, 14), delay: t + 0.6 + j * 0.08 });
      M.animate(dot, { y: [0, j % 2 ? 7 : -7, 0], x: [0, j % 2 ? -3 : 3, 0] }, { duration: 3.2 + j * 0.9, repeat: Infinity, ease: 'easeInOut', delay: t + 1 });
    });
    // the arrow pulses every few seconds: a ring expands from it
    const go = d.querySelector('.gd-go');
    const ring = document.createElement('i');
    Object.assign(ring.style, { position: 'absolute', inset: '0', borderRadius: '50%', boxShadow: '0 0 0 2px rgba(255, 80, 40, .9)', pointerEvents: 'none', opacity: '0' });
    go.style.position = 'relative'; go.append(ring);
    M.animate(ring, { scale: [1, 1.7], opacity: [0.9, 0] }, { duration: 1.1, ease: 'easeOut', repeat: Infinity, repeatDelay: 2.6, delay: t + 1.6 + i * 0.5 });
  });
}
