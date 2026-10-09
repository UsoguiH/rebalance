'use strict';
// Core helpers for the "Show it" motion piece: math, easing, seeded noise,
// tapered hand-drawn strokes, text and film-finish passes.

const W = 1156, H = 867;           // frame size of the reference footage (4:3)
const CX = W / 2, CY = 433;        // optical centre used by most layouts
const TAU = Math.PI * 2;
const FONT = 'Outfit';

const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const inRange = (t, a, b) => t >= a && t < b;

const E = {
  lin: t => t,
  inQ: t => t * t,
  outQ: t => 1 - (1 - t) * (1 - t),
  ioQ: t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  inC: t => t * t * t,
  outC: t => 1 - Math.pow(1 - t, 3),
  ioC: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outQuint: t => 1 - Math.pow(1 - t, 5),
  inExpo: t => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
  outExpo: t => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  ioExpo: t => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2),
  outBack: (t, s = 1.70158) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
};

// Interpolate a keyframed value: keys = [[time, value, easeFn?], ...]
function kf(t, keys) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1, ease] = keys[i];
    if (t <= t1) {
      const [t0, v0] = keys[i - 1];
      const p = (ease || E.ioC)(seg(t, t0, t1));
      if (Array.isArray(v0)) return v0.map((v, j) => lerp(v, v1[j], p));
      return lerp(v0, v1, p);
    }
  }
  return keys[keys.length - 1][1];
}

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash = n => mulberry32((n * 2654435761) >>> 0)();

// ---------- colour ----------
function hex(c) {
  c = c.replace('#', '');
  return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)];
}
const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const rgb = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
function ramp(stops, t) { // stops: [[pos, [r,g,b]], ...]
  t = clamp(t);
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0]) {
      const p = seg(t, stops[i - 1][0], stops[i][0]);
      return mix(stops[i - 1][1], stops[i][1], p);
    }
  }
  return stops[stops.length - 1][1];
}

const C = {
  paper: hex('e3e2e2'), paperLow: hex('bdbcbd'),
  ink: hex('2b1d1a'), inkSoft: hex('3b2925'), brown: hex('6b4637'),
  night: hex('232323'), cream: hex('f1e7e1'),
  red: hex('d8262a'), flashRed: hex('c41f26'), yellow: hex('e3b52f'),
  cyan: hex('3ff0e6'), blue: hex('2b6af2'),
};

// ---------- backgrounds ----------
function paperBG(ctx, k = 1) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, rgb(C.paper));
  g.addColorStop(0.58, rgb(mix(C.paper, C.paperLow, 0.12)));
  g.addColorStop(0.75, rgb(mix(C.paper, C.paperLow, 0.75)));
  g.addColorStop(1, rgb(C.paperLow));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // soft light falloff to the corners
  const r = ctx.createRadialGradient(CX, 300, 120, CX, 380, 820);
  r.addColorStop(0, 'rgba(255,255,255,0.05)');
  r.addColorStop(1, `rgba(60,60,60,${0.16 * k})`);
  ctx.fillStyle = r;
  ctx.fillRect(0, 0, W, H);
}
function nightBG(ctx, col = C.night) {
  ctx.fillStyle = rgb(col);
  ctx.fillRect(0, 0, W, H);
  const r = ctx.createRadialGradient(W * 0.9, 120, 40, W * 0.6, 420, 900);
  r.addColorStop(0, 'rgba(255,255,255,0.025)');
  r.addColorStop(1, 'rgba(0,0,0,0.12)');
  ctx.fillStyle = r;
  ctx.fillRect(0, 0, W, H);
}
function solid(ctx, col, a = 1) { ctx.fillStyle = rgb(col, a); ctx.fillRect(0, 0, W, H); }
function vignette(ctx, amt = 0.35, inner = 0.35, col = [0, 0, 0], cx = CX, cy = CY) {
  const g = ctx.createRadialGradient(cx, cy, W * inner, cx, cy, W * 0.78);
  g.addColorStop(0, rgb(col, 0));
  g.addColorStop(1, rgb(col, amt));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}
function glow(ctx, x, y, r, col, a = 1, falloff = 0) {
  const g = ctx.createRadialGradient(x, y, r * falloff, x, y, r);
  g.addColorStop(0, rgb(col, a));
  g.addColorStop(0.45, rgb(col, a * 0.55));
  g.addColorStop(1, rgb(col, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

// ---------- film grain ----------
const Grain = (() => {
  const frames = [];
  const gw = 578, gh = 434;
  for (let k = 0; k < 6; k++) {
    const c = document.createElement('canvas');
    c.width = gw; c.height = gh;
    const g = c.getContext('2d');
    const id = g.createImageData(gw, gh);
    const r = mulberry32(1000 + k);
    for (let i = 0; i < gw * gh; i++) {
      const v = r() * 255;
      id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = v;
      id.data[i * 4 + 3] = 255;
    }
    g.putImageData(id, 0, 0);
    frames.push(c);
  }
  return {
    draw(ctx, t, amt = 0.07) {
      const f = frames[Math.floor(t * 24) % frames.length];
      ctx.save();
      ctx.globalAlpha = amt;
      ctx.globalCompositeOperation = 'overlay';
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(f, 0, 0, W, H);
      ctx.restore();
    },
  };
})();

// ---------- geometry ----------
function catmull(pts, steps = 10, closed = false) {
  const n = pts.length, out = [];
  const P = i => (closed ? pts[(i + n) % n] : pts[clamp(i, 0, n - 1)]);
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    for (let s = 0; s < steps; s++) {
      const t = s / steps, t2 = t * t, t3 = t2 * t;
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  out.push(closed ? out[0] : pts[n - 1]);
  return out;
}
function ellipsePts(cx, cy, rx, ry, rot = 0, a0 = 0, a1 = TAU, n = 90) {
  const out = [], c = Math.cos(rot), s = Math.sin(rot);
  for (let i = 0; i <= n; i++) {
    const a = lerp(a0, a1, i / n), x = Math.cos(a) * rx, y = Math.sin(a) * ry;
    out.push([cx + x * c - y * s, cy + x * s + y * c]);
  }
  return out;
}
function polyLen(pts) {
  const L = [0];
  for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return L;
}
function flatToPts(flat) { const o = []; for (let i = 0; i < flat.length; i += 2) o.push([flat[i], flat[i + 1]]); return o; }
function pathFrom(pts, closed = true) {
  const p = new Path2D();
  pts.forEach((q, i) => (i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1])));
  if (closed) p.closePath();
  return p;
}

// Tapered marker / pen stroke along a polyline, trimmed to [from, to] of its length.
// opts: width, color, alpha, taper (0..1 share of length used to taper each end), wobble
function stroke(ctx, pts, from, to, opts = {}) {
  from = clamp(from); to = clamp(to);
  if (to - from < 0.002 || pts.length < 2) return;
  const width = opts.width ?? 4, taper = opts.taper ?? 0.35;
  const L = polyLen(pts), total = L[L.length - 1];
  const a = from * total, b = to * total, span = b - a;
  const left = [], right = [];
  const sample = d => {
    let i = 1;
    while (i < L.length - 1 && L[i] < d) i++;
    const t = (d - L[i - 1]) / Math.max(1e-6, L[i] - L[i - 1]);
    const p = pts[i - 1], q = pts[i];
    return [lerp(p[0], q[0], t), lerp(p[1], q[1], t), q[0] - p[0], q[1] - p[1]];
  };
  const steps = Math.max(8, Math.ceil(span / 3));
  for (let k = 0; k <= steps; k++) {
    const u = k / steps, d = a + span * u;
    const [x, y, dx, dy] = sample(d);
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;
    const g = d / total; // global position along the full stroke
    let w = width;
    if (taper > 0) w *= Math.min(1, Math.pow(clamp(g / taper), 0.6), Math.pow(clamp((1 - g) / taper), 0.6));
    if (opts.trimTaper) w *= Math.min(1, clamp(u / 0.15) * 0.7 + 0.3, clamp((1 - u) / 0.15) * 0.7 + 0.3);
    if (opts.wobble) w *= 1 + opts.wobble * Math.sin(g * 37 + (opts.seed || 0));
    w = Math.max(w, opts.minWidth ?? 0.6) / 2;
    left.push([x + nx * w, y + ny * w]);
    right.push([x - nx * w, y - ny * w]);
  }
  ctx.save();
  ctx.globalAlpha *= opts.alpha ?? 1;
  if (opts.blur) ctx.filter = `blur(${opts.blur}px)`;
  if (opts.glow) { ctx.shadowColor = opts.glowColor || opts.color; ctx.shadowBlur = opts.glow; }
  ctx.fillStyle = opts.color || '#000';
  ctx.beginPath();
  left.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
  for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i][0], right[i][1]);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
// A stroke that writes on during [t0, t1] and erases from its tail during [t2, t3].
function writeOn(ctx, t, pts, t0, t1, t2, t3, opts = {}) {
  if (t < t0 || t > t3) return;
  const to = E.outQ(seg(t, t0, t1));
  const from = E.inQ(seg(t, t2, t3));
  stroke(ctx, pts, from, to, opts);
}

// ---------- text ----------
function setFont(ctx, size, weight = 700) { ctx.font = `${weight} ${size}px ${FONT}`; }
function text(ctx, str, x, y, o = {}) {
  ctx.save();
  setFont(ctx, o.size || 38, o.weight || 700);
  if ('letterSpacing' in ctx) ctx.letterSpacing = (o.tracking ?? -0.01) * (o.size || 38) + 'px';
  ctx.textAlign = o.align || 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.globalAlpha *= o.alpha ?? 1;
  if (o.blur) ctx.filter = `blur(${o.blur}px)`;
  if (o.glow) { ctx.shadowColor = o.glowColor || rgb(o.color || C.cream, 0.6); ctx.shadowBlur = o.glow; }
  ctx.fillStyle = Array.isArray(o.color) ? rgb(o.color) : o.color || rgb(C.cream);
  ctx.fillText(str, x, y);
  ctx.restore();
}
function measure(ctx, str, size, weight = 700, tracking = -0.01) {
  ctx.save();
  setFont(ctx, size, weight);
  if ('letterSpacing' in ctx) ctx.letterSpacing = tracking * size + 'px';
  const w = ctx.measureText(str).width;
  ctx.restore();
  return w;
}
// Words that pop in grey and settle to the final colour (as in the reference typing).
function wordsLine(ctx, t, x, y, words, o = {}) {
  if (o.blur > 0.3) { // render the line once, then blur it as a whole
    const cv = ctx.canvas;
    const [lc, lg] = Layers.get(`words_${cv.width}x${cv.height}`, cv.width, cv.height);
    lg.setTransform(ctx.getTransform());
    const end = wordsLine(lg, t, x, y, words, { ...o, blur: 0 });
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.filter = `blur(${o.blur}px)`; ctx.globalAlpha *= o.alpha ?? 1; ctx.drawImage(lc, 0, 0); ctx.restore();
    return end;
  }
  const size = o.size || 40, weight = o.weight || 600;
  const space = measure(ctx, ' ', size, weight, o.tracking ?? -0.01);
  let cx = x;
  for (const w of words) {
    if (t < w.t) break;
    const k = E.outQ(seg(t, w.t, w.t + (o.settle ?? 0.08)));
    const col = w.color || o.color || C.ink;
    const c = mix(o.fresh || [150, 140, 138], col, k);
    text(ctx, w.s, cx, y, { size, weight, color: c, tracking: o.tracking, blur: o.blur, alpha: o.alpha });
    cx += measure(ctx, w.s, size, weight, o.tracking ?? -0.01) + space;
  }
  return cx;
}
function cursorBar(ctx, x, y, h, col, a = 1, w = 4) {
  ctx.fillStyle = rgb(col, a);
  ctx.fillRect(x, y - h, w, h);
}

// Off-screen layer helper (for blur / masking passes)
const Layers = (() => {
  const pool = {};
  return {
    get(name, w = W, h = H) {
      let c = pool[name];
      if (!c) { c = document.createElement('canvas'); c.width = w; c.height = h; pool[name] = c; }
      const g = c.getContext('2d');
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none';
      g.clearRect(0, 0, c.width, c.height);
      return [c, g];
    },
  };
})();
function withLayer(ctx, name, fn, { blur = 0, alpha = 1, op = 'source-over' } = {}) {
  const [c, g] = Layers.get(name);
  fn(g);
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.globalCompositeOperation = op;
  if (blur > 0.05) ctx.filter = `blur(${blur}px)`;
  ctx.drawImage(c, 0, 0);
  ctx.restore();
}
// Directional motion blur by stacking offset copies of a layer.
function smearLayer(ctx, name, fn, dx, dy, n = 8, alpha = 1, blur = 0) {
  const [c, g] = Layers.get(name);
  fn(g);
  ctx.save();
  if (blur) ctx.filter = `blur(${blur}px)`;
  for (let i = 0; i < n; i++) {
    const u = n === 1 ? 0 : i / (n - 1) - 0.5;
    ctx.globalAlpha = alpha * (1.6 / n);
    ctx.drawImage(c, dx * u, dy * u);
  }
  ctx.restore();
}

// Concave four-point "astroid" star used by several flashes.
function starPath(cx, cy, rx, ry, pinch = 0.12, rot = 0, arms = null) {
  // arms: optional [right, down, left, up] length multipliers
  const a = arms || [1, 1, 1, 1];
  const tips = [[rx * a[0], 0], [0, ry * a[1]], [-rx * a[2], 0], [0, -ry * a[3]]];
  const c = Math.cos(rot), s = Math.sin(rot);
  const tr = p => [cx + p[0] * c - p[1] * s, cy + p[0] * s + p[1] * c];
  const p = new Path2D();
  const t0 = tr(tips[0]);
  p.moveTo(t0[0], t0[1]);
  for (let i = 0; i < 4; i++) {
    const A = tips[i], B = tips[(i + 1) % 4];
    const ctrl = tr([(A[0] + B[0]) * pinch, (A[1] + B[1]) * pinch]);
    const end = tr(B);
    p.quadraticCurveTo(ctrl[0], ctrl[1], end[0], end[1]);
  }
  p.closePath();
  return p;
}
