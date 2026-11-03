// motion.js: the rossark-motion-skill engine, ported to plain browser JS.
//
// Everything that moves reads one clock per character. Values come from keyframe
// tracks (`track` for one move, `flow` for acting through key poses) and a few
// shaping helpers. Nothing here keeps state, so any frame can be drawn at any time.
(function (root) {
  'use strict';

  // ── Curves (declared first: everything below reads them) ──────────────────
  function bezier(x1, y1, x2, y2) {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
    const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const sx = (s) => ((ax * s + bx) * s + cx) * s;
    const sy = (s) => ((ay * s + by) * s + cy) * s;
    const dx = (s) => (3 * ax * s + 2 * bx) * s + cx;
    return function (p) {
      if (p <= 0) return 0;
      if (p >= 1) return 1;
      let s = p;
      for (let i = 0; i < 8; i++) {
        const e = sx(s) - p;
        if (Math.abs(e) < 1e-5) break;
        const d = dx(s);
        if (Math.abs(d) < 1e-6) break;
        s -= e / d;
      }
      if (s < 0 || s > 1) { // fall back to bisection
        let lo = 0, hi = 1; s = p;
        for (let i = 0; i < 20; i++) { if (sx(s) < p) lo = s; else hi = s; s = (lo + hi) / 2; }
      }
      return sy(s);
    };
  }
  /** Things that travel: gaze, sway, a head turning, a lid closing. */
  const EASE_IN_OUT = bezier(0.77, 0, 0.175, 1);
  /** Things that open or arrive: a mouth, a lid reopening, a prop appearing. */
  const EASE_OUT = bezier(0.23, 1, 0.32, 1);
  /** Only for things leaving or falling away. */
  const EASE_IN = bezier(0.55, 0, 1, 0.45);

  /** One move: keys [ms, value, 'out'?]; eases into every key. Last key = first key for loops. */
  function track(t, keys) {
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

  /**
   * Acting: a monotone cubic through key poses [ms, value]. Continuous speed, never
   * overshoots a key. Repeat a value to hold; the idle layer keeps the hold alive.
   */
  function flow(t, k) {
    const n = k.length;
    if (n === 1 || t <= k[0][0]) return k[0][1];
    if (t >= k[n - 1][0]) return k[n - 1][1];
    let i = 0;
    while (k[i + 1][0] < t) i++;
    const slope = (j) => (k[j + 1][1] - k[j][1]) / Math.max(1e-6, k[j + 1][0] - k[j][0]);
    const tangent = (j) => {
      if (j === 0 || j === n - 1) return 0;
      const a = slope(j - 1), b = slope(j);
      if (a * b <= 0) return 0;
      const h0 = k[j][0] - k[j - 1][0], h1 = k[j + 1][0] - k[j][0];
      const w0 = 2 * h1 + h0, w1 = h1 + 2 * h0;
      return (w0 + w1) / (w0 / a + w1 / b);
    };
    const h = k[i + 1][0] - k[i][0];
    if (h <= 0) return k[i + 1][1];
    const s = (t - k[i][0]) / h, s2 = s * s, s3 = s2 * s;
    return (2 * s3 - 3 * s2 + 1) * k[i][1] + (s3 - 2 * s2 + s) * h * tangent(i) +
      (-2 * s3 + 3 * s2) * k[i + 1][1] + (s3 - s2) * h * tangent(i + 1);
  }

  /** 0 → 1 inside the window [a, b], 0 before, 1 after. One beat of a scene. */
  function seg(t, a, b, curve) {
    if (t <= a) return 0;
    if (t >= b) return 1;
    const p = (t - a) / (b - a);
    return curve === 'inOut' ? EASE_IN_OUT(p) : curve === 'lin' ? p : curve === 'in' ? EASE_IN(p) : EASE_OUT(p);
  }
  /** Linear 0..1 inside [a, b]. */
  function lin(t, a, b) { return t <= a ? 0 : t >= b ? 1 : (t - a) / (b - a); }
  /** A smooth back-and-forth from -1 to 1. */
  function wave(t, period, phase) { return Math.sin((t / period + (phase || 0)) * Math.PI * 2); }
  /** Progress through a loop, 0 to 1. */
  function loop(t, period, phase) { const p = (t / period + (phase || 0)) % 1; return p < 0 ? p + 1 : p; }
  /** 0 at both ends and 1 in the middle. */
  function bell(p) { return Math.sin(Math.PI * Math.min(1, Math.max(0, p))); }
  /** Stable pseudo-random in [0, 1). */
  function seeded(i, salt) {
    const x = Math.sin(i * 12.9898 + (salt || 0) * 78.233) * 43758.5453;
    return x - Math.floor(x);
  }
  /**
   * A damped spring "boing" that starts at t0: 0 before, then an oscillation that
   * dies out. This is the bouncy-brand accent (the skill allows overshoot when the
   * brand asks for it; this one does).
   */
  function boing(t, t0, freq, decay) {
    if (t < t0) return 0;
    const s = (t - t0) / 1000;
    return Math.exp(-s * (decay || 7)) * Math.sin(s * (freq || 4) * Math.PI * 2);
  }
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const mix = (a, b, p) => a + (b - a) * p;

  /** A wave whose period divides the loop length, so the loop seam never jumps. */
  function lw(t, dur, approx, phase) {
    const n = Math.max(1, Math.round(dur / approx));
    return wave(t, dur / n, phase);
  }

  /** Blink keys for `track`: close ~110 ms, hold 40 ms, reopen ~190 ms eased out. */
  function blinks(times, dur, rest) {
    const r = rest || 0;
    const k = [[0, r]];
    times.slice().sort((a, b) => a - b).forEach((T) => {
      k.push([T - 1, r], [T + 110, 1], [T + 150, 1], [T + 340, r, 'out']);
    });
    k.push([dur, r]);
    return k;
  }

  root.Motion = { bezier, EASE_IN_OUT, EASE_OUT, EASE_IN, track, flow, seg, lin, wave, loop, bell, seeded, boing, clamp, mix, lw, blinks };
})(typeof window !== 'undefined' ? window : globalThis);
