// motion.js: the rossark-motion-skill engine, ported to the web (no build step).
// Everything that moves reads a clock time `t` in milliseconds and is a pure function of it.

const bez = (x1, y1, x2, y2) => {
  // cubic-bezier easing, solved with Newton steps (same curves as the skill)
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (s) => ((ax * s + bx) * s + cx) * s;
  const sy = (s) => ((ay * s + by) * s + cy) * s;
  const dx = (s) => (3 * ax * s + 2 * bx) * s + cx;
  return (p) => {
    if (p <= 0) return 0;
    if (p >= 1) return 1;
    let s = p;
    for (let i = 0; i < 6; i++) {
      const d = dx(s);
      if (Math.abs(d) < 1e-6) break;
      s -= (sx(s) - p) / d;
    }
    return sy(Math.min(1, Math.max(0, s)));
  };
};

export const EASE_IN_OUT = bez(0.77, 0, 0.175, 1); // things that travel
export const EASE_OUT = bez(0.23, 1, 0.32, 1); // things that open or arrive
export const EASE_IN = bez(0.55, 0, 1, 0.45); // only things leaving / falling

/** Keyframes [ms, value, 'out'?]; eases in and out of every key. For ONE move (a blink, a lid). */
export function track(t, keys) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const k1 = keys[i];
    if (t <= k1[0]) {
      const k0 = keys[i - 1];
      const span = k1[0] - k0[0];
      const p = span > 0 ? (t - k0[0]) / span : 1;
      const e = k1[2] === 'out' ? EASE_OUT(p) : EASE_IN_OUT(p);
      return k0[1] + (k1[1] - k0[1]) * e;
    }
  }
  return keys[keys.length - 1][1];
}

/** Smooth monotone path through key poses [ms, value]: for acting. Never stops at a key. */
export function flow(t, k) {
  const n = k.length;
  if (t <= k[0][0]) return k[0][1];
  if (t >= k[n - 1][0]) return k[n - 1][1];
  let i = 0;
  while (k[i + 1][0] < t) i++;
  const slope = (j) => (k[j + 1][1] - k[j][1]) / (k[j + 1][0] - k[j][0] || 1);
  const tangent = (j) => {
    if (j === 0 || j === n - 1) return 0;
    const a = slope(j - 1), b = slope(j);
    if (a * b <= 0) return 0;
    const h0 = k[j][0] - k[j - 1][0], h1 = k[j + 1][0] - k[j][0];
    const w0 = 2 * h1 + h0, w1 = h1 + 2 * h0;
    return (w0 + w1) / (w0 / a + w1 / b);
  };
  const h = k[i + 1][0] - k[i][0] || 1;
  const s = (t - k[i][0]) / h, s2 = s * s, s3 = s2 * s;
  return (
    (2 * s3 - 3 * s2 + 1) * k[i][1] +
    (s3 - 2 * s2 + s) * h * tangent(i) +
    (-2 * s3 + 3 * s2) * k[i + 1][1] +
    (s3 - s2) * h * tangent(i + 1)
  );
}

/** 0 → 1 inside [a, b] (eased), 0 before, 1 after: one beat of a scene. */
export function seg(t, a, b, curve = 'out') {
  if (t <= a) return 0;
  if (t >= b) return 1;
  const p = (t - a) / (b - a);
  return curve === 'out' ? EASE_OUT(p) : curve === 'lin' ? p : curve === 'in' ? EASE_IN(p) : EASE_IN_OUT(p);
}

/** Inside [a, b]: 0 → 1 → 0 smoothly (an accent switched on for a window). */
export function win(t, a, b, fade = 180) {
  if (t <= a || t >= b) return 0;
  return Math.min(1, (t - a) / fade, (b - t) / fade) ** 1;
}

export const wave = (t, period, phase = 0) => Math.sin((t / period + phase) * Math.PI * 2);
export const loop = (t, period, phase = 0) => {
  const p = (t / period + phase) % 1;
  return p < 0 ? p + 1 : p;
};
export const bell = (p) => Math.sin(Math.PI * Math.min(1, Math.max(0, p)));
export const seeded = (i, salt = 0) => {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
};
export const mix = (a, b, p) => a + (b - a) * p;
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

/**
 * A blink: closes in 110 ms, holds 40 ms, reopens in 190 ms with ease-out
 * (reopening is slower than closing). `times` are the blink starts in the loop.
 */
export function blinks(t, times, rest = 0) {
  let v = rest;
  for (const b of times) {
    if (t < b || t > b + 340) continue;
    if (t < b + 110) v = Math.max(v, mix(rest, 1, EASE_IN_OUT((t - b) / 110)));
    else if (t < b + 150) v = 1;
    else v = Math.max(v, mix(1, rest, EASE_OUT((t - b - 150) / 190)));
  }
  return v;
}

/** Keep the volume: when the height scales by sy, the width scales by 1 / sy^0.6. */
export const keepVolume = (sy) => 1 / Math.pow(sy, 0.6);
