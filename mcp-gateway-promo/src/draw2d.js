// Canvas-2D helpers: text, shapes, halftone, grain, clouds and the "viewport" layer overlay.
import { rng, TAU, clamp, lerp } from './util.js';

export const C = {
  pink: '#f2317f', hot: '#ff2d86', magenta: '#e23aa6', rose: '#ff8fb8', blush: '#ffd3e4',
  lilac: '#c9a5f2', violet: '#8b5cf6', purple: '#7445e0', deep: '#4a2bb0',
  coral: '#f26a5a', orange: '#f79a3e', yellow: '#f6c453', sky: '#8fd0f2', blue: '#3f8fe0',
  white: '#ffffff', paper: '#f5f2f4', ink: '#1b1640', grey: '#8f8a9c',
};

export const FONTS = { display: 'Outfit', ui: 'Inter', hand: 'Caveat' };

export async function loadFonts(base = './vendor/fonts/') {
  const defs = [];
  for (const w of [400, 500, 600, 700, 800, 900]) defs.push(['Outfit', w, `outfit-latin-${w}-normal.woff2`]);
  for (const w of [400, 500, 600, 700]) defs.push(['Inter', w, `inter-latin-${w}-normal.woff2`]);
  defs.push(['Caveat', 700, 'caveat-latin-700-normal.woff2']);
  await Promise.all(defs.map(async ([fam, weight, file]) => {
    const f = new FontFace(fam, `url(${base}${file})`, { weight: String(weight) });
    await f.load();
    document.fonts.add(f);
  }));
}

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.round(w); c.height = Math.round(h);
  return c;
}

export const font = (size, weight = 700, family = FONTS.display) => `${weight} ${size}px ${family}, sans-serif`;

export function rr(g, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

// Draw text; returns measured width. Options: size, weight, family, color, align, baseline, ls, alpha, stroke, lw.
export function text(g, str, x, y, o = {}) {
  g.save();
  g.font = font(o.size || 40, o.weight || 700, o.family || FONTS.display);
  g.textAlign = o.align || 'left';
  g.textBaseline = o.baseline || 'alphabetic';
  if (o.ls != null) g.letterSpacing = `${o.ls}px`;
  if (o.alpha != null) g.globalAlpha *= o.alpha;
  if (o.stroke) {
    g.strokeStyle = o.stroke; g.lineWidth = o.lw || 2; g.lineJoin = 'round';
    g.strokeText(str, x, y);
  }
  if (o.color !== null) { g.fillStyle = o.color || C.ink; g.fillText(str, x, y); }
  const w = g.measureText(str).width;
  g.restore();
  return w;
}

export function measure(g, str, o = {}) {
  g.save();
  g.font = font(o.size || 40, o.weight || 700, o.family || FONTS.display);
  if (o.ls != null) g.letterSpacing = `${o.ls}px`;
  const w = g.measureText(str).width;
  g.restore();
  return w;
}

// ---- halftone -------------------------------------------------------------------------------
// Dot grid whose radius follows amount(x, y) in [0, 1]. Returned canvas is tinted with `color`.
export function halftone(w, h, color, amount, cell = 14, angle = 0.5) {
  const c = makeCanvas(w, h), g = c.getContext('2d');
  g.fillStyle = color;
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const span = Math.hypot(w, h);
  for (let v = -span; v < span; v += cell) {
    for (let u = -span; u < span; u += cell) {
      const x = w / 2 + u * cos - v * sin, y = h / 2 + u * sin + v * cos;
      if (x < -cell || y < -cell || x > w + cell || y > h + cell) continue;
      const a = clamp(amount(x / w, y / h));
      if (a <= 0.02) continue;
      g.beginPath(); g.arc(x, y, a * cell * 0.62, 0, TAU); g.fill();
    }
  }
  return c;
}

// ---- film grain -----------------------------------------------------------------------------
export function makeGrain(size = 384, seed = 7) {
  const out = [];
  for (let k = 0; k < 4; k++) {
    const c = makeCanvas(size, size), g = c.getContext('2d');
    const img = g.createImageData(size, size), r = rng(seed + k * 31);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 128 + (r() - 0.5) * 255 * 0.9;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    out.push(c);
  }
  return out;
}

// ---- clouds ---------------------------------------------------------------------------------
// A soft cumulus sprite built from many overlapping radial puffs.
export function cloudSprite(w, h, seed = 1, tint = '255,255,255') {
  const c = makeCanvas(w, h), g = c.getContext('2d'), r = rng(seed);
  for (let i = 0; i < 70; i++) {
    const px = w * (0.12 + 0.76 * r()), bias = Math.sin((px / w) * Math.PI);
    const py = h * (0.72 - 0.5 * r() * bias);
    const rad = (0.08 + 0.2 * r()) * h * (0.6 + bias);
    const grd = g.createRadialGradient(px, py, 0, px, py, rad);
    grd.addColorStop(0, `rgba(${tint},${0.2 + 0.25 * r()})`);
    grd.addColorStop(1, `rgba(${tint},0)`);
    g.fillStyle = grd; g.beginPath(); g.arc(px, py, rad, 0, TAU); g.fill();
  }
  return c;
}

// ---- hand-drawn primitives ------------------------------------------------------------------
export function scribbleLine(g, x0, y0, x1, y1, r, jitter = 3, steps = 8) {
  g.beginPath(); g.moveTo(x0, y0);
  for (let i = 1; i <= steps; i++) {
    const p = i / steps;
    g.lineTo(lerp(x0, x1, p) + (r() - 0.5) * jitter, lerp(y0, y1, p) + (r() - 0.5) * jitter);
  }
  g.stroke();
}

export function scribbleRect(g, x, y, w, h, r, jitter = 3) {
  scribbleLine(g, x, y, x + w, y, r, jitter); scribbleLine(g, x + w, y, x + w, y + h, r, jitter);
  scribbleLine(g, x + w, y + h, x, y + h, r, jitter); scribbleLine(g, x, y + h, x, y, r, jitter);
}

export function hatch(g, x, y, w, h, r, n = 14, color = '#000') {
  g.save(); g.strokeStyle = color; g.beginPath(); g.rect(x, y, w, h); g.clip();
  for (let i = 0; i < n; i++) {
    const o = (i / n) * (w + h);
    scribbleLine(g, x + o + (r() - 0.5) * 8, y - 4, x + o - h + (r() - 0.5) * 8, y + h + 4, r, 4, 5);
  }
  g.restore();
}

// Gateway mark: a shield drawn in one stroke that exits through a check swoosh.
// Points are in a 200x200 box centred on (0, 0); used by the 2D logo and the 3D glossy squiggle.
export const LOGO_PTS = [
  [-73, 8], [-75, -28], [-72, -55], [-42, -60], [0, -77], [42, -60], [72, -55], [75, -28], [72, 8],
  [56, 42], [28, 66], [0, 83], [-28, 66], [-56, 42], [-71, 12], [-54, -6], [-32, 6], [-10, 31], [16, 3], [52, -40], [104, -82],
];

// Catmull-Rom sample of a polyline: returns [x, y] at u in [0, 1].
export function spline(pts, u) {
  const n = pts.length - 1, f = clamp(u) * n, i = Math.min(n - 1, Math.floor(f)), t = f - i;
  const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n, i + 2)];
  const c = (a, b, cc, d) => 0.5 * ((2 * b) + (-a + cc) * t + (2 * a - 5 * b + 4 * cc - d) * t * t + (-a + 3 * b - 3 * cc + d) * t * t * t);
  return [c(p0[0], p1[0], p2[0], p3[0]), c(p0[1], p1[1], p2[1], p3[1])];
}

// Brush stroke along the logo path from u=0 to u=amount with calligraphic width.
export function drawLogo(g, cx, cy, scale, amount, color = C.pink, width = 13) {
  if (amount <= 0) return;
  const steps = 220, end = Math.floor(steps * clamp(amount));
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = color;
  let prev = spline(LOGO_PTS, 0);
  for (let i = 1; i <= end; i++) {
    const u = i / steps, p = spline(LOGO_PTS, u);
    const dx = p[0] - prev[0], dy = p[1] - prev[1];
    const ang = Math.atan2(dy, dx);
    const taper = Math.min(1, u * 14 + 0.25) * Math.min(1, (1 - u) * 9 + 0.2);
    g.lineWidth = width * scale * (0.55 + 0.45 * Math.abs(Math.sin(ang - 0.9))) * taper;
    g.beginPath(); g.moveTo(cx + prev[0] * scale, cy + prev[1] * scale); g.lineTo(cx + p[0] * scale, cy + p[1] * scale); g.stroke();
    prev = p;
  }
  g.restore();
}

// ---- viewport overlay (After-Effects-style layer handles) -----------------------------------
const LAYER_COLORS = ['#ff4d6d', '#3aa0ff', '#29c48b', '#f6a609', '#b061ff', '#ff7a2f', '#16c1d6'];
export class Layers {
  constructor() { this.items = []; this.on = false; }
  begin(on) { this.items.length = 0; this.on = on; }
  // Register a layer's bounds (centre-anchored by default) for the overlay.
  add(x, y, w, h, o = {}) { if (this.on) this.items.push({ x, y, w, h, rot: o.rot || 0, path: o.path || null }); }
  draw(g) {
    this.items.forEach((it, i) => {
      const col = LAYER_COLORS[i % LAYER_COLORS.length];
      g.save(); g.translate(it.x + it.w / 2, it.y + it.h / 2); g.rotate(it.rot);
      g.strokeStyle = col; g.lineWidth = 2; g.globalAlpha = 0.9;
      g.strokeRect(-it.w / 2, -it.h / 2, it.w, it.h);
      g.fillStyle = col;
      for (const [hx, hy] of [[-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]]) g.fillRect(hx * it.w / 2 - 5, hy * it.h / 2 - 5, 10, 10);
      g.beginPath(); g.arc(0, 0, 9, 0, TAU); g.moveTo(-16, 0); g.lineTo(16, 0); g.moveTo(0, -16); g.lineTo(0, 16); g.stroke();
      g.restore();
      if (it.path) {
        g.save(); g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 1.5; g.setLineDash([3, 7]);
        g.beginPath(); it.path.forEach((p, k) => (k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke();
        g.setLineDash([]);
        it.path.forEach((p) => g.fillRect(p[0] - 4, p[1] - 4, 8, 8));
        g.restore();
      }
    });
  }
}
