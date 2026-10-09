'use strict';
// Shared helpers for the Perplexity piece (same engine as the Base 44 study).
// reference clip's own 578×325 coordinate space; the stage renders at 2×.

const SW = 578, SH = 325, SCALE = 2;
const W = SW * SCALE, H = SH * SCALE;
const TAU = Math.PI * 2;

const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const F = n => (n - 1) / 30; // reference frame number → seconds

const E = {
  lin: t => t,
  inQ: t => t * t,
  outQ: t => 1 - (1 - t) * (1 - t),
  ioQ: t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  inC: t => t * t * t,
  outC: t => 1 - Math.pow(1 - t, 3),
  ioC: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outQuint: t => 1 - Math.pow(1 - t, 5),
  outExpo: t => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inExpo: t => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
  outBack: (t, s = 1.70158) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
};

// keys: [[time, value, easeIntoThisKey?], ...]; values may be numbers or arrays
function kf(t, keys) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1, ease] = keys[i];
    if (t <= t1) {
      const [t0, v0] = keys[i - 1];
      const p = (ease || E.ioC)(seg(t, t0, t1));
      return Array.isArray(v0) ? v0.map((v, j) => lerp(v, v1[j], p)) : lerp(v0, v1, p);
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

const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const rgb = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
function ramp(stops, t) {
  t = clamp(t);
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0]) return mix(stops[i - 1][1], stops[i][1], seg(t, stops[i - 1][0], stops[i][0]));
  }
  return stops[stops.length - 1][1];
}

function rrect(ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Light studio backdrop shared by the opening, tree and card scenes.
function studioBG(ctx, warm = 0) {
  const g = ctx.createLinearGradient(0, 0, 0, SH);
  const top = mix([246, 246, 246], [237, 234, 229], warm);
  const bot = mix([227, 227, 227], [219, 215, 212], warm);
  g.addColorStop(0, rgb(top));
  g.addColorStop(0.42, rgb(top));
  g.addColorStop(0.62, rgb(mix(top, bot, 0.3)));
  g.addColorStop(0.8, rgb(mix(top, bot, 0.7)));
  g.addColorStop(1, rgb(bot));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, SW, SH);
}

function setFont(ctx, size, family, weight = 400) { ctx.font = `${weight} ${size}px ${family}`; }
function text(ctx, s, x, y, o = {}) {
  ctx.save();
  setFont(ctx, o.size || 12, o.family || 'Inter', o.weight || 400);
  if ('letterSpacing' in ctx) ctx.letterSpacing = (o.tracking || 0) * (o.size || 12) + 'px';
  ctx.textAlign = o.align || 'left';
  ctx.textBaseline = o.baseline || 'alphabetic';
  ctx.globalAlpha *= o.alpha ?? 1;
  if (o.blur > 0.05) ctx.filter = `blur(${o.blur}px)`;
  ctx.fillStyle = Array.isArray(o.color) ? rgb(o.color) : o.color || '#222';
  ctx.fillText(s, x, y);
  ctx.restore();
}
function measure(ctx, s, size, family = 'Inter', weight = 400, tracking = 0) {
  ctx.save();
  setFont(ctx, size, family, weight);
  if ('letterSpacing' in ctx) ctx.letterSpacing = tracking * size + 'px';
  const w = ctx.measureText(s).width;
  ctx.restore();
  return w;
}

// Off-screen layers (stage-sized unless told otherwise)
const Layers = (() => {
  const pool = {};
  return {
    get(name, w = W, h = H) {
      let c = pool[name];
      if (!c || c.width !== w || c.height !== h) { c = document.createElement('canvas'); c.width = w; c.height = h; pool[name] = c; }
      const g = c.getContext('2d');
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none';
      g.clearRect(0, 0, w, h);
      return [c, g];
    },
  };
})();
// Draw fn into a stage-sized layer (with the same SCALE transform), then composite.
function layer(ctx, name, fn, { blur = 0, alpha = 1, op = 'source-over', mask = null } = {}) {
  const [c, g] = Layers.get(name);
  g.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  fn(g);
  if (mask) { g.globalCompositeOperation = 'destination-in'; mask(g); g.globalCompositeOperation = 'source-over'; }
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = op;
  if (blur > 0.05) ctx.filter = `blur(${blur * SCALE}px)`;
  ctx.drawImage(c, 0, 0);
  ctx.restore();
}

// Film-ish sensor noise the reference carries (it is a re-encoded screen capture)
const Grain = (() => {
  const frames = [];
  for (let k = 0; k < 4; k++) {
    const c = document.createElement('canvas'); c.width = SW; c.height = SH;
    const g = c.getContext('2d'), id = g.createImageData(SW, SH), r = mulberry32(99 + k);
    for (let i = 0; i < SW * SH; i++) { const v = r() * 255; id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = v; id.data[i * 4 + 3] = 255; }
    g.putImageData(id, 0, 0); frames.push(c);
  }
  return {
    draw(ctx, t, amt) {
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = amt; ctx.globalCompositeOperation = 'overlay';
      ctx.drawImage(frames[Math.floor(t * 30) % 4], 0, 0, W, H);
      ctx.restore();
    },
  };
})();

// Value-noise fBm texture, coloured by a palette ramp. Used for the marble,
// sky and sunset-cloud backdrops behind the dashboard.
function noiseTexture(w, h, seed, palette, { octaves = 5, scale = 3, warp = 1.2, stretch = 2.5 } = {}) {
  const r = mulberry32(seed), N = 64, grid = new Float32Array(N * N);
  for (let i = 0; i < grid.length; i++) grid[i] = r();
  const smooth = t => t * t * (3 - 2 * t);
  const vn = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = smooth(x - xi), yf = smooth(y - yi);
    const g = (a, b) => grid[((b & (N - 1)) * N) + (a & (N - 1))];
    return lerp(lerp(g(xi, yi), g(xi + 1, yi), xf), lerp(g(xi, yi + 1), g(xi + 1, yi + 1), xf), yf);
  };
  const fbm = (x, y) => { let v = 0, a = 0.5, f = 1; for (let o = 0; o < octaves; o++) { v += a * vn(x * f, y * f); a *= 0.5; f *= 2; } return v; };
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'), id = g.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const u = (x / w) * scale, v = (y / h) * scale / stretch;
    const q = fbm(u + 5.2, v + 1.3);
    const n = fbm(u + warp * 4 * q, v + warp * 4 * fbm(u + 1.7, v + 9.2));
    const col = palette(n, x / w, y / h);
    const i = (y * w + x) * 4;
    id.data[i] = col[0]; id.data[i + 1] = col[1]; id.data[i + 2] = col[2]; id.data[i + 3] = 255;
  }
  g.putImageData(id, 0, 0);
  return c;
}

// Standard arrow pointer, tip at (x, y), in source px
function cursor(ctx, x, y, s = 1, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y); ctx.scale(s, s);
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(0, 16); ctx.lineTo(3.8, 12.4); ctx.lineTo(6.4, 18.2); ctx.lineTo(8.8, 17.2);
  ctx.lineTo(6.3, 11.5); ctx.lineTo(11.3, 11.5); ctx.closePath();
  ctx.fillStyle = '#111'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.1; ctx.lineJoin = 'round';
  ctx.stroke(); ctx.fill();
  ctx.restore();
}
