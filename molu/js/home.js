// Gate — logo + حواء and آدم as two big cards on white. Flat (2D) motion only, driven by Motion
// (the Framer Motion engine): the wordmark writes itself in, the cards slide in from opposite sides,
// hover lifts / press squeezes a card while the other dims, and the chosen card grows into the next page.
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
  $(`[data-near="${k}"]`).textContent = `${ar(l.length)} صالونات قريبة`;
  $(`[data-from="${k}"]`).textContent += ` · من ${money(Math.min(...l.map((s) => s.from)))}`;
});
if (hasChosenSection()) gate.dataset.hot = getSection();

let busy = false;
// focus one card: the other dims, the colour behind this one warms up
function hot(door) {
  doors.forEach((d) => d.classList.toggle('hot', d === door));
  wrap.classList.toggle('has-hot', !!door);
  if (door) gate.dataset.hot = door.dataset.k;
}

doors.forEach((d) => {
  if (!reduced) {
    // hover: lift (flat — no tilt)
    d.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'mouse' || busy) return; hot(d); M.animate(d, { y: -6, scale: 1.012 }, spring(300, 22)); });
    d.addEventListener('pointerleave', () => { if (busy) return; hot(null); M.animate(d, { y: 0, scale: 1 }, spring(300, 22)); });
    // whileTap
    d.addEventListener('pointerdown', () => { if (busy) return; hot(d); M.animate(d, { scale: 0.97 }, spring(600, 32)); });
    d.addEventListener('pointerup', (e) => { if (busy) return; M.animate(d, { scale: e.pointerType === 'mouse' ? 1.012 : 1 }, spring(500, 16)); if (e.pointerType !== 'mouse') setTimeout(() => !busy && hot(null), 250); });
    d.addEventListener('pointercancel', () => { hot(null); M.animate(d, { scale: 1, y: 0 }, spring(500, 16)); });
  }
  d.addEventListener('focus', () => hot(d));
  d.addEventListener('blur', () => hot(null));
  d.addEventListener('click', (e) => { e.preventDefault(); enter(d); });
});

// ---------- enter: the card grows to full screen (layout animation), then the next page takes over ----------
async function enter(door) {
  if (busy) return;
  busy = true;
  const k = door.dataset.k, href = door.getAttribute('href');
  setSection(k);
  if (reduced) { location.href = href; return; }
  hot(door);
  const r = door.getBoundingClientRect();
  const zoom = document.createElement('div');
  zoom.className = 'gx-zoom';
  zoom.innerHTML = `<img src="${door.querySelector('img').currentSrc}" alt="">`;
  zoom.querySelector('img').style.viewTransitionName = `gate-${k}`;
  Object.assign(zoom.style, { top: r.top + 'px', left: r.left + 'px', width: r.width + 'px', height: r.height + 'px', borderRadius: '30px' });
  document.body.append(zoom);
  door.style.visibility = 'hidden';
  M.animate(doors.find((d) => d !== door), { opacity: 0, scale: 0.92 }, { duration: 0.25 });
  M.animate($('.gx-head'), { opacity: 0, y: -12 }, { duration: 0.2 });
  await M.animate(zoom, { top: 0, left: 0, width: innerWidth, height: innerHeight, borderRadius: 0 }, { ...spring(230, 30), restDelta: 0.5 }).then(() => {}, () => {});
  location.href = href;
}
// back button (bfcache): restore the scene
addEventListener('pageshow', (e) => {
  if (!e.persisted) return;
  busy = false; hot(null); $('.gx-zoom')?.remove();
  doors.forEach((d) => { d.style.visibility = ''; d.style.opacity = ''; d.style.transform = ''; });
  Object.assign($('.gx-head').style, { opacity: '', transform: '' });
});

// ---------- entrance ----------
if (!reduced) {
  M.animate($('.gx-bg'), { opacity: [0, 1] }, { duration: 0.9 });
  // logo: the mark pops, the wordmarks write themselves in (Latin left→right, Arabic right→left)
  if ($('.logo-mark')) {
    M.animate($('.logo-mark'), { scale: [0.4, 1], rotate: [-14, 0], opacity: [0, 1] }, spring(320, 15));
    M.animate($('.logo-latin'), { clipPath: ['inset(-20% 100% -40% 0)', 'inset(-20% 0% -40% 0)'] }, { duration: 0.9, delay: 0.2, ease: EASE });
    M.animate($('.logo-ar'), { clipPath: ['inset(-30% 0 -50% 100%)', 'inset(-30% 0 -50% 0%)'] }, { duration: 0.8, delay: 0.35, ease: EASE });
    M.animate($('.logo-sep'), { scaleY: [0, 1] }, { duration: 0.5, delay: 0.3, ease: EASE });
  } else M.animate($('.molu-logo'), { opacity: [0, 1], y: [-10, 0] }, { duration: 0.48, ease: EASE });
  M.animate($('.gx-hl'), { opacity: [0, 1], y: [-12, 0], scale: [0.96, 1] }, { duration: 0.48, ease: EASE });
  // cards: حواء slides in from the right, آدم from the left (RTL), then a sheen passes over each
  doors.forEach((d, i) => {
    const from = i === 0 ? 70 : -70;
    M.animate(d, { opacity: [0, 1], x: [from, 0], y: [30, 0], rotate: [i === 0 ? 2.5 : -2.5, 0], scale: [0.94, 1] }, { ...spring(170, 20), delay: 0.12 + i * 0.12 });
    M.animate(d.querySelector('.gd-sheen'), { transform: ['translateX(-130%)', 'translateX(130%)'] }, { duration: 1, delay: 0.9 + i * 0.25, ease: EASE });
    M.animate(d.querySelector('.gd-go'), { scale: [0.4, 1], rotate: [-45, 0] }, { ...spring(380, 16), delay: 0.45 + i * 0.12 });
    M.animate(d.querySelector('.gd-txt'), { opacity: [0, 1], y: [16, 0] }, { ...spring(220, 22), delay: 0.35 + i * 0.12 });
    M.animate(d.querySelector('.gd-chip'), { opacity: [0, 1], y: [-10, 0], scale: [0.85, 1] }, { ...spring(380, 20), delay: 0.5 + i * 0.12 });
  });
}
