// Gate — حواء and آدم, both on screen. محلي-style dark immersive stage animated with Motion
// (the Framer Motion engine): staggered entrance, hover tilt / press springs with the other door
// dimming, and a layoutId-style grow to full screen that the next page's view transition picks up.
import { $, $$, hydrateIcons, getSection, hasChosenSection, setSection, ar, money } from './shell.js';
import { SALONS } from './data.js';

hydrateIcons();
const M = window.Motion;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches || !M;
const gate = $('#gate'), wrap = $('.gx-doors'), doors = $$('.gd');

// real numbers on each door
['eve', 'adam'].forEach((k) => {
  const l = SALONS[k];
  $(`[data-near="${k}"]`).textContent = `${ar(l.length)} صالونات قريبة`;
  $(`[data-from="${k}"]`).textContent += ` · من ${money(Math.min(...l.map((s) => s.from)))}`;
});
if (hasChosenSection()) gate.dataset.hot = getSection();

const spring = (stiffness = 300, damping = 24) => ({ type: 'spring', stiffness, damping });
let busy = false;

// focus one door: lift + tilt it, dim the other, warm the backdrop behind it
function hot(door) {
  doors.forEach((d) => d.classList.toggle('hot', d === door));
  wrap.classList.toggle('has-hot', !!door);
  if (door) gate.dataset.hot = door.dataset.k;
}

doors.forEach((d) => {
  if (!reduced) {
    d.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse' || busy) return;
      const r = d.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      M.animate(d, { rotateY: x * 8, rotateX: -y * 7, scale: 1.015 }, spring(260, 22));
    });
    d.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse' && !busy) hot(d); });
    d.addEventListener('pointerleave', () => { if (busy) return; hot(null); M.animate(d, { rotateY: 0, rotateX: 0, scale: 1 }, spring(260, 20)); });
    // whileTap
    d.addEventListener('pointerdown', () => { if (busy) return; hot(d); M.animate(d, { scale: 0.97 }, spring(600, 32)); });
    d.addEventListener('pointerup', (e) => { if (busy) return; M.animate(d, { scale: 1 }, spring(500, 16)); if (e.pointerType !== 'mouse') setTimeout(() => !busy && hot(null), 250); });
    d.addEventListener('pointercancel', () => { hot(null); M.animate(d, { scale: 1 }, spring(500, 16)); });
  }
  d.addEventListener('click', (e) => { e.preventDefault(); enter(d); });
});

// ---------- enter: the door grows to full screen (layout animation), then the next page takes over ----------
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
  const other = doors.find((d) => d !== door);
  M.animate(other, { opacity: 0, scale: 0.92 }, { duration: 0.25 });
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

// ---------- entrance: header drops in, the doors slide in from opposite sides, then a sheen passes ----------
if (!reduced) {
  M.animate($('.gx-bg'), { opacity: [0, 1] }, { duration: 0.9 });
  M.animate($('.gx-head'), { opacity: [0, 1], y: [-12, 0], scale: [0.96, 1] }, { duration: 0.48, ease: [0.22, 1, 0.36, 1] });
  doors.forEach((d, i) => {
    const from = i === 0 ? 70 : -70; // حواء from the right, آدم from the left (RTL)
    M.animate(d, { opacity: [0, 1], x: [from, 0], y: [30, 0], rotate: [i === 0 ? 2.5 : -2.5, 0], scale: [0.94, 1] }, { ...spring(170, 20), delay: 0.12 + i * 0.12 });
    M.animate(d.querySelector('.gd-sheen'), { transform: ['translateX(-130%)', 'translateX(130%)'] }, { duration: 1, delay: 0.9 + i * 0.25, ease: [0.22, 1, 0.36, 1] });
    M.animate(d.querySelector('.gd-go'), { scale: [0.4, 1], rotate: [-45, 0] }, { ...spring(380, 16), delay: 0.45 + i * 0.12 });
    M.animate(d.querySelector('.gd-txt'), { opacity: [0, 1], y: [16, 0] }, { ...spring(220, 22), delay: 0.35 + i * 0.12 });
  });
}
