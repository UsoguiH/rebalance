// Core helpers: math, seeded RNG, value noise, small vector scratch space.
import * as THREE from 'three';

export const TAU = Math.PI * 2;
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, v) => clamp((v - a) / (b - a), 0, 1);
export const smoothstep = (a, b, v) => {
  const t = invLerp(a, b, v);
  return t * t * (3 - 2 * t);
};
// frame-rate independent exponential approach
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));
export const wrapAngle = (a) => {
  a = (a + Math.PI) % TAU;
  if (a < 0) a += TAU;
  return a - Math.PI;
};
export const angleDiff = (from, to) => wrapAngle(to - from);
export const dampAngle = (a, b, lambda, dt) => a + angleDiff(a, b) * (1 - Math.exp(-lambda * dt));
export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOutBack = (t) => {
  const c = 1.70158;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
};

// mulberry32
export function rng(seed) {
  let a = seed >>> 0;
  const r = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  r.range = (lo, hi) => lo + r() * (hi - lo);
  r.int = (lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
  r.pick = (arr) => arr[Math.floor(r() * arr.length)];
  r.sign = () => (r() < 0.5 ? -1 : 1);
  return r;
}
export const R = rng((Math.random() * 1e9) | 0);

// hash-based 2D value noise + fBm (deterministic, used by terrain and textures)
function hash2(x, y) {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
export function noise2(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}
export function fbm(x, y, oct = 4, lac = 2, gain = 0.5) {
  let s = 0, amp = 0.5, f = 1, norm = 0;
  for (let i = 0; i < oct; i++) {
    s += amp * noise2(x * f, y * f);
    norm += amp;
    amp *= gain;
    f *= lac;
  }
  return s / norm;
}
// ridged multifractal, gives rocky crests
export function ridged(x, y, oct = 4) {
  let s = 0, amp = 0.5, f = 1, norm = 0;
  for (let i = 0; i < oct; i++) {
    const n = 1 - Math.abs(noise2(x * f, y * f) * 2 - 1);
    s += amp * n * n;
    norm += amp;
    amp *= 0.5;
    f *= 2.03;
  }
  return s / norm;
}

// scratch objects (never hold references across calls)
export const v1 = new THREE.Vector3();
export const v2 = new THREE.Vector3();
export const v3 = new THREE.Vector3();
export const q1 = new THREE.Quaternion();
export const m1 = new THREE.Matrix4();
export const e1 = new THREE.Euler();
export const UP = new THREE.Vector3(0, 1, 0);

export const mph = (v) => v * 2.23694;

// simple event bus
export const bus = {
  _l: {},
  on(ev, fn) {
    (this._l[ev] || (this._l[ev] = [])).push(fn);
  },
  off(ev, fn) {
    const a = this._l[ev];
    if (!a) return;
    const i = a.indexOf(fn);
    if (i >= 0) a.splice(i, 1);
  },
  emit(ev, ...a) {
    const l = this._l[ev];
    if (l) for (const fn of l.slice()) fn(...a);
  },
};

// shared game-wide state (set up by main.js)
export const G = {
  renderer: null,
  scene: null,
  camera: null,
  time: 0,
  dt: 0,
  world: null,
  cars: [],
  player: null,
  settings: {
    volume: 0.8,
    music: 0.55,
    difficulty: 1, // 0 easy, 1 normal, 2 twisted
    opponents: 6,
    quality: 1, // 0 low, 1 high
    invertCam: false,
  },
};

export function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem('tm-settings') || '{}');
    Object.assign(G.settings, s);
  } catch (e) {
    /* storage blocked: keep defaults */
  }
}
export function saveSettings() {
  try {
    localStorage.setItem('tm-settings', JSON.stringify(G.settings));
  } catch (e) {
    /* ignore */
  }
}
