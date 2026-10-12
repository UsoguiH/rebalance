// Gate — حواء / آدم only. محلي-style dark immersive stage, animated with Motion (the Framer Motion engine):
// a continuous "position" value drives the whole scene (cards, titles, backdrop, switch, dots), so drag,
// tap, keys and the entrance all share one spring and can be interrupted at any moment.
import { $, $$, hydrateIcons, getSection, setSection, ar, money } from './shell.js';
import { SALONS } from './data.js';

hydrateIcons();
const M = window.Motion;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches || !M;
const KEYS = ['eve', 'adam'];
const LABEL = ['ادخلي قسم حواء', 'ادخل قسم آدم'];
const SPRING = { type: 'spring', stiffness: 260, damping: 30, mass: 1 };

const stage = $('#stage'), cards = $$('.gx-card'), titles = $$('.gx-title .t'), bgs = $$('.gx-bg i');
const thumb = $('.gx-thumb'), tabs = $$('.gx-switch [data-go]'), dots = $$('.gx-dots i'), lbl = $('#enter .lbl');

// real numbers on each door
KEYS.forEach((k) => {
  const l = SALONS[k];
  $(`[data-near="${k}"]`).textContent = `${ar(l.length)} صالونات قريبة`;
  $(`[data-from="${k}"]`).textContent = `يبدأ من ${money(Math.min(...l.map((s) => s.from)))} · ★ ${Math.max(...l.map((s) => s.rating)).toFixed(1)}`;
});

let pos = getSection() === 'adam' ? 1 : 0, idx = pos, ctl = null, busy = false;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const step = () => cards[0].offsetWidth * 0.74;
let tilt = { x: 0, y: 0 };

function render(p) {
  const st = step();
  cards.forEach((c, i) => {
    const rel = i - p, a = Math.abs(rel);
    const x = -rel * st;                       // RTL: آدم sits to the left
    const s = 1 - 0.18 * Math.min(a, 1.2);
    const ry = rel * -26 + (a < 0.5 ? tilt.x : 0);
    const rx = a < 0.5 ? tilt.y : 0;
    c.style.transform = `translateX(${x}px) translateZ(${-a * 120}px) rotateY(${ry}deg) rotateX(${rx}deg) scale(${s})`;
    c.style.zIndex = a < 0.5 ? 3 : 1;
    c.querySelector('.gx-shade').style.opacity = Math.min(a, 1) * 0.5;
  });
  titles.forEach((t, i) => {
    const rel = i - p, a = Math.abs(rel);
    t.style.opacity = clamp(1 - a * 1.8);
    t.style.transform = `translateX(${-rel * 70}px) scale(${1 - a * 0.1})`;
    t.style.filter = a > 0.01 ? `blur(${Math.min(a * 10, 10)}px)` : '';
  });
  bgs[0].style.opacity = clamp(1 - p); bgs[1].style.opacity = clamp(p);
  thumb.style.transform = `translateX(${-clamp(p) * tabs[0].offsetWidth}px)`;
  dots.forEach((d, i) => { const a = clamp(1 - Math.abs(i - p)); d.style.width = `${7 + 17 * a}px`; d.style.background = `rgba(255,255,255,${0.4 + 0.6 * a})`; });
  const n = Math.round(clamp(p));
  if (n !== idx) settle(n);
}

// discrete state: tabs, aria, the button label (springs out ↑, new one in from ↓)
function settle(n) {
  idx = n;
  tabs.forEach((t, i) => t.setAttribute('aria-selected', i === n));
  titles.forEach((t, i) => t.setAttribute('aria-hidden', i !== n));
  $('#enter').setAttribute('aria-label', LABEL[n]);
  const text = n ? 'ادخل' : 'ادخلي';
  if (reduced) { lbl.textContent = text; return; }
  M.animate(lbl, { opacity: 0, y: -16, filter: 'blur(6px)' }, { duration: 0.14 }).then(() => {
    lbl.textContent = text;
    M.animate(lbl, { opacity: [0, 1], y: [18, 0] }, { type: 'spring', stiffness: 420, damping: 26 });
    M.animate(lbl, { filter: ['blur(6px)', 'blur(0px)'] }, { duration: 0.3, ease: 'easeOut' });
  });
}

function goTo(target, velocity = 0) {
  ctl?.stop();
  if (reduced) { pos = target; render(pos); return; }
  ctl = M.animate(pos, target, { ...SPRING, velocity, onUpdate: (v) => { pos = v; render(v); } });
  if (target !== Math.round(pos)) sheen(cards[target], 0.25);
}

function sheen(card, delay = 0) {
  if (reduced) return;
  M.animate(card.querySelector('.gx-sheen'), { transform: ['translateX(-120%)', 'translateX(120%)'] }, { duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] });
}

// ---------- drag (with velocity hand-off to the spring) ----------
let drag = null, moved = false;
stage.addEventListener('pointerdown', (e) => {
  if (busy) return;
  ctl?.stop();
  drag = { x: e.clientX, p: pos, t: performance.now(), samples: [[performance.now(), e.clientX]] };
  moved = false;
  stage.setPointerCapture(e.pointerId);
});
stage.addEventListener('pointermove', (e) => {
  if (!drag) {
    // hover tilt on the front card (mouse only)
    if (e.pointerType !== 'mouse' || reduced) return;
    const r = cards[idx].getBoundingClientRect();
    tilt = { x: clamp((e.clientX - (r.left + r.width / 2)) / r.width, -0.6, 0.6) * 10, y: clamp((e.clientY - (r.top + r.height / 2)) / r.height, -0.6, 0.6) * -8 };
    render(pos);
    return;
  }
  const dx = e.clientX - drag.x;
  if (Math.abs(dx) > 6) { moved = true; stage.classList.add('dragging'); }
  let p = drag.p - dx / step();
  if (p < 0) p *= 0.3; else if (p > 1) p = 1 + (p - 1) * 0.3; // rubber band past the ends
  pos = p; render(p);
  drag.samples.push([performance.now(), e.clientX]); if (drag.samples.length > 5) drag.samples.shift();
});
const endDrag = () => {
  if (!drag) return;
  const [t0, x0] = drag.samples[0], [t1, x1] = drag.samples[drag.samples.length - 1];
  const vx = (x1 - x0) / Math.max(1, t1 - t0) * 1000;   // px/s
  const v = -vx / step();                                 // position units/s
  drag = null; stage.classList.remove('dragging');
  if (!moved) return;
  goTo(clamp(Math.round(pos + v * 0.18)), v);
};
stage.addEventListener('pointerup', endDrag);
stage.addEventListener('pointercancel', endDrag);
stage.addEventListener('pointerleave', () => { if (!drag && (tilt.x || tilt.y)) { tilt = { x: 0, y: 0 }; render(pos); } });

cards.forEach((c, i) => c.addEventListener('click', (e) => {
  if (moved) { e.preventDefault(); return; }
  i === idx ? enter() : goTo(i);
}));
tabs.forEach((t) => t.addEventListener('click', () => goTo(+t.dataset.go)));
addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft') goTo(1);
  if (e.key === 'ArrowRight') goTo(0);
  if (e.key === 'Enter' && document.activeElement === document.body) enter();
});
addEventListener('resize', () => render(pos));

// whileTap on the button
const btn = $('#enter');
if (!reduced) {
  btn.addEventListener('pointerdown', () => M.animate(btn, { scale: 0.96 }, { type: 'spring', stiffness: 600, damping: 30 }));
  ['pointerup', 'pointerleave'].forEach((ev) => btn.addEventListener(ev, () => M.animate(btn, { scale: 1 }, { type: 'spring', stiffness: 500, damping: 15 })));
}
btn.addEventListener('click', () => enter());

// ---------- enter: the door grows to full screen (shared element), then the next page takes it over ----------
async function enter() {
  if (busy) return;
  busy = true; ctl?.stop();
  const k = KEYS[idx], card = cards[idx];
  setSection(k);
  const href = `explore.html?s=${k}`;
  if (reduced) { location.href = href; return; }
  const r = card.getBoundingClientRect();
  const zoom = document.createElement('div');
  zoom.className = 'gx-zoom';
  zoom.innerHTML = `<img src="${card.querySelector('img').currentSrc}" alt="">`;
  zoom.querySelector('img').style.viewTransitionName = `gate-${k}`;
  Object.assign(zoom.style, { top: r.top + 'px', left: r.left + 'px', width: r.width + 'px', height: r.height + 'px', borderRadius: '30px' });
  document.body.append(zoom);
  card.style.visibility = 'hidden';
  M.animate([$('.gx-switch'), $('.gx-title'), $('.gx-dots'), btn], { opacity: 0, y: 14 }, { duration: 0.22, delay: M.stagger(0.03) });
  M.animate(cards[1 - idx], { opacity: 0 }, { duration: 0.2 });
  // layout animation: the box itself grows (the picture re-crops naturally, like Framer's layoutId)
  await M.animate(zoom, { top: 0, left: 0, width: innerWidth, height: innerHeight, borderRadius: 0 }, { type: 'spring', stiffness: 230, damping: 30, restDelta: 0.5 }).then(() => {}, () => {});
  location.href = href;
}
// coming back with the browser's back button: restore the scene
addEventListener('pageshow', (e) => {
  if (!e.persisted) return;
  busy = false; $('.gx-zoom')?.remove(); cards.forEach((c) => { c.style.visibility = ''; c.style.opacity = ''; });
  [$('.gx-switch'), $('.gx-title'), $('.gx-dots'), btn].forEach((el) => { el.style.opacity = ''; el.style.transform = ''; });
});

// ---------- entrance: orchestrated, Framer-style stagger ----------
settle(idx); lbl.textContent = idx ? 'ادخل' : 'ادخلي';
if (reduced) render(pos);
else {
  pos = idx ? 0.55 : 0.45; render(pos);             // cards start stacked in the middle…
  M.animate($('.gx-bg'), { opacity: [0, 1] }, { duration: 0.9 });
  M.animate($('.gx-switch'), { opacity: [0, 1], y: [-12, 0], scale: [0.94, 1] }, { duration: 0.48, ease: [0.22, 1, 0.36, 1] });
  M.animate($('.gx-title'), { opacity: [0, 1], y: [26, 0] }, { type: 'spring', stiffness: 160, damping: 22, delay: 0.08 });
  M.animate($('.gx-title'), { filter: ['blur(12px)', 'blur(0px)'] }, { duration: 0.6, delay: 0.08, ease: [0.22, 1, 0.36, 1] });
  M.animate(stage, { opacity: [0, 1], y: [90, 0], scale: [0.9, 1] }, { type: 'spring', stiffness: 170, damping: 20, delay: 0.14 });
  M.animate([$('.gx-dots'), $('#enter')], { opacity: [0, 1], y: [24, 0] }, { type: 'spring', stiffness: 260, damping: 24, delay: M.stagger(0.06, { startDelay: 0.3 }) });
  setTimeout(() => goTo(idx), 260);               // …then deal out to the remembered door
  sheen(cards[idx], 0.9);
}
