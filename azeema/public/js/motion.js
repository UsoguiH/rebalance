// Motion engine: real spring physics rendered through CSS linear() easings + Web Animations.
// Mirrors the Framer Motion behaviours used as reference (spring expand, blur-in, layout morph).

export const SPRINGS = {
  smooth: { stiffness: 200, damping: 22, mass: 1.2 },
  snappy: { stiffness: 400, damping: 30, mass: 0.8 },
  gentle: { stiffness: 246.7, damping: 31.4, mass: 1 },
  bouncy: { stiffness: 380, damping: 17, mass: 1 },
  sheet: { stiffness: 300, damping: 32, mass: 1 },
};

const cache = new Map();
// Simulate x'' = (-k(x-1) - c v)/m from x=0 → settle; sample into a linear() easing.
export function springEasing({ stiffness, damping, mass, velocity = 0 }) {
  const key = `${stiffness}|${damping}|${mass}|${velocity}`;
  if (cache.has(key)) return cache.get(key);
  const dt = 1 / 600;
  let x = 0, v = velocity, t = 0;
  const samples = [];
  let still = 0;
  while (t < 3) {
    const a = (-stiffness * (x - 1) - damping * v) / mass;
    v += a * dt; x += v * dt; t += dt;
    samples.push([t, x]);
    still = Math.abs(x - 1) < 0.0015 && Math.abs(v) < 0.02 ? still + 1 : 0;
    if (still > 30) break;
  }
  const duration = Math.round(t * 1000);
  const pts = [];
  const n = Math.min(32, Math.max(16, Math.round(duration / 26))); // enough samples for a smooth curve, short enough to parse cheaply
  for (let i = 0; i <= n; i++) {
    const s = samples[Math.min(samples.length - 1, Math.round((i / n) * (samples.length - 1)))];
    pts.push(+s[1].toFixed(4));
  }
  pts[pts.length - 1] = 1;
  const out = { easing: `linear(${pts.join(', ')})`, duration };
  cache.set(key, out);
  return out;
}

export const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

// el.animate with a named spring
export function spring(el, keyframes, name = 'smooth', { delay = 0, fill = 'both' } = {}) {
  const { easing, duration } = springEasing(SPRINGS[name] || name);
  return el.animate(keyframes, { duration: reduced() ? 1 : duration, delay: reduced() ? 0 : delay * 1000, easing, fill });
}

// Blur-in entrance (opacity 0, blur 8px, y 40 → rest) — the "content" motion of ExpandDetails
export function blurIn(el, { y = 40, delay = 0 } = {}) {
  return spring(el, [{ opacity: 0, filter: 'blur(8px)', transform: `translateY(${y}px)` }, { opacity: 1, filter: 'blur(0)', transform: 'none' }], 'gentle', { delay });
}
export function blurOut(el, { y = 16 } = {}) {
  return spring(el, [{ opacity: 1, filter: 'blur(0)', transform: 'none' }, { opacity: 0, filter: 'blur(8px)', transform: `translateY(${y}px)` }], 'gentle');
}

// Scroll reveal with stagger
export function revealOnScroll(root = document) {
  const els = [...root.querySelectorAll('[data-reveal]')];
  if (!('IntersectionObserver' in window) || reduced()) return;
  els.forEach((el) => (el.style.opacity = 0));
  const io = new IntersectionObserver((entries) => {
    entries.filter((e) => e.isIntersecting).forEach((e, i) => {
      io.unobserve(e.target);
      // opacity + transform only (compositor-friendly; no filter work while scrolling)
      spring(e.target, [{ opacity: 0, transform: 'translateY(24px)' }, { opacity: 1, transform: 'none' }], 'gentle', { delay: i * 0.05 }).finished.then(() => (e.target.style.opacity = ''));
    });
  }, { rootMargin: '0px 0px -8% 0px' });
  els.forEach((el) => io.observe(el));
}
