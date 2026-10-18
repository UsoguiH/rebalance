// Blocky Minecraft-style doodles, drawn as hand-inked strokes (arrays of polylines).

import * as G from '../../discipline-video/src/geom.js';
import { rng } from '../../discipline-video/src/util.js';

const rotAbout = (pts, a, cx, cy) => {
  const c = Math.cos(a), s = Math.sin(a);
  return pts.map(([x, y]) => [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c]);
};

// A rectangle outline, optionally rotated about a pivot.
export function box(x, y, w, h, o = {}) {
  let pts = [[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y + 1]];
  if (o.a) pts = rotAbout(pts, o.a, o.px, o.py);
  return G.path(pts, { wob: o.wob ?? 1.2 });
}

// ── Hatching: parallel pen lines filling a region, skipping holes ───────────
export function hatch(bbox, inside, { gap = 12, angle = -0.8, holes = [], seed = 3 } = {}) {
  const [x1, y1, x2, y2] = bbox, r = rng(seed);
  const ux = Math.cos(angle), uy = Math.sin(angle), nx = -uy, ny = ux;
  const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2, R = Math.hypot(x2 - x1, y2 - y1) / 2;
  const inHole = (x, y) => holes.some(([hx, hy, hw, hh]) => x > hx && x < hx + hw && y > hy && y < hy + hh);
  const out = [];
  for (let k = -R, i = 0; k <= R; k += gap, i++) {
    let run = [];
    const flush = () => { if (run.length > 2) out.push(G.humanize(run, 0.8)); run = []; };
    const pts = [];
    for (let s = -R; s <= R; s += 5) pts.push([cx + nx * k + ux * s, cy + ny * k + uy * s]);
    if (i % 2) pts.reverse(); // the pen zig-zags back and forth like a real hand
    for (const [x, y] of pts) {
      const jx = x + (r() - 0.5) * 1.5;
      if (inside(x, y) && !inHole(x, y)) run.push([jx, y]); else flush();
    }
    flush();
  }
  return out;
}

export const rectRegion = (x, y, w, h) => [[x, y, x + w, y + h], (px, py) => px > x && px < x + w && py > y && py < y + h];
export const ellipseRegion = (cx, cy, rx, ry) => [[cx - rx, cy - ry, cx + rx, cy + ry], (px, py) => ((px - cx) / rx) ** 2 + ((py - cy) / ry) ** 2 < 1];

// ── Characters ──────────────────────────────────────────────────────────────
const POSES = {
  stand: { aL: 0.08, aR: -0.08, lL: 0.04, lR: -0.04 },
  punch: { aL: 0.25, aR: -1.5, lL: 0.18, lR: -0.18 },
  hold: { aL: 0.1, aR: -0.95, lL: 0.04, lR: -0.04 },
  run: { aL: 0.95, aR: -0.95, lL: -0.6, lR: 0.6 },
  ready: { aL: 0.9, aR: -1.15, lL: 0.28, lR: -0.28 },
  scared: { aL: 2.6, aR: -2.6, lL: 0.15, lR: -0.15 },
};

// A blocky character, feet at (x, y). Returns ink strokes, the right hand's position,
// and (for Herobrine) the hatching that darkens the face around his blank eyes.
export function blocky(x, y, s = 1, pose = 'stand', { herobrine = false, flip = 1, gap } = {}) {
  const p = POSES[pose];
  const X = (u) => x + u * s * flip, Y = (v) => y + v * s;
  const out = [];
  out.push(...box(X(-32), Y(-252), 64 * s * flip, 64 * s));
  out.push(...box(X(-32), Y(-188), 64 * s * flip, 98 * s));
  const limb = (px, py, w, len, a) => {
    const x0 = X(px) - (w / 2) * s, y0 = Y(py);
    out.push(...box(x0, y0, w * s, len * s, { a: a * flip, px: X(px), py: Y(py) }));
    return rotAbout([[X(px), y0 + len * s]], a * flip, X(px), Y(py))[0];
  };
  limb(-45, -186, 26, 96, p.aL);
  const hand = limb(45, -186, 26, 96, p.aR);
  limb(-16, -90, 30, 90, p.lL);
  limb(16, -90, 30, 90, p.lR);
  const eyes = [[X(-22), Y(-222), 14 * s, 9 * s], [X(8), Y(-222), 14 * s, 9 * s]].map(([ex, ey, w, h]) => (flip < 0 ? [ex - w, ey, w, h] : [ex, ey, w, h]));
  let shade = [];
  if (herobrine) {
    const [bb, inside] = rectRegion(Math.min(X(-30), X(30)), Y(-250), 60 * s, 60 * s);
    shade = hatch(bb, inside, { gap: gap ?? 7 * Math.max(1, s * 0.8), angle: -0.75, holes: eyes.map(([ex, ey, w, h]) => [ex - 2, ey - 2, w + 4, h + 4]) });
    for (const [ex, ey, w, h] of eyes) out.push(...box(ex, ey, w, h, { wob: 0.4 }));
  } else {
    out.push(...G.line(X(-32), Y(-234), X(32), Y(-234), { wob: 0.8, over: 0 }));
    for (const [ex, ey, w, h] of eyes) out.push(...box(ex + w * 0.3, ey, w * 0.45, h, { wob: 0.4 }));
    out.push(...G.line(X(-10), Y(-200), X(10), Y(-200), { wob: 0.5, over: 0 }));
  }
  return { ink: out, shade, hand, eyes };
}

// Little "glow" ticks around Herobrine's eyes.
export function glow(eyes, len = 14) {
  const out = [];
  for (const [ex, ey, w, h] of eyes) {
    const cx = ex + w / 2, cy = ey + h / 2;
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + 0.3, r0 = Math.max(w, h) * 0.85;
      out.push(...G.line(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, cx + Math.cos(a) * (r0 + len), cy + Math.sin(a) * (r0 + len), { wob: 0.3, over: 0 }));
    }
  }
  return out;
}

// ── Items ───────────────────────────────────────────────────────────────────
export function torch(x, y, s = 1) {
  return {
    stick: box(x - 7 * s, y - 70 * s, 14 * s, 70 * s, { wob: 0.6 }),
    flame: G.curve([[x, y - 76 * s], [x - 15 * s, y - 92 * s], [x - 4 * s, y - 116 * s], [x + 3 * s, y - 104 * s], [x + 9 * s, y - 128 * s], [x + 16 * s, y - 94 * s], [x, y - 76 * s]], { wob: 0.8 }),
  };
}

export function rays(x, y, r0, r1, n = 8, a0 = 0) {
  const out = [];
  for (let k = 0; k < n; k++) {
    const a = a0 + (k / n) * Math.PI * 2;
    out.push(...G.line(x + Math.cos(a) * r0, y + Math.sin(a) * r0, x + Math.cos(a) * r1, y + Math.sin(a) * r1, { wob: 0.6, over: 0 }));
  }
  return out;
}

export function pickaxe(x, y, s = 1) {
  return [
    ...G.path([[x, y], [x + 92 * s, y - 92 * s]], { wob: 0.8 }),
    ...G.path([[x + 92 * s, y - 92 * s], [x + 98 * s, y - 86 * s], [x + 6 * s, y + 6 * s], [x, y]], { wob: 0.6 }),
    ...G.path([[x + 38 * s, y - 128 * s], [x + 82 * s, y - 112 * s], [x + 112 * s, y - 82 * s], [x + 128 * s, y - 38 * s], [x + 112 * s, y - 34 * s], [x + 96 * s, y - 72 * s], [x + 72 * s, y - 96 * s], [x + 34 * s, y - 112 * s], [x + 38 * s, y - 128 * s]], { wob: 0.8 }),
  ];
}

export function sword(x, y, s = 1) {
  return [
    ...G.path([[x, y], [x + 22 * s, y - 22 * s]], { wob: 0.5 }),
    ...G.path([[x + 8 * s, y - 40 * s], [x + 40 * s, y - 8 * s]], { wob: 0.5 }),
    ...G.path([[x + 18 * s, y - 32 * s], [x + 120 * s, y - 134 * s], [x + 134 * s, y - 134 * s], [x + 134 * s, y - 120 * s], [x + 32 * s, y - 18 * s]], { wob: 0.6 }),
    ...G.line(x + 34 * s, y - 34 * s, x + 118 * s, y - 118 * s, { wob: 0.3, over: 0 }),
  ];
}

export function ingot(x, y, s = 1) {
  return [...G.path([[x - 50 * s, y], [x - 34 * s, y - 34 * s], [x + 34 * s, y - 34 * s], [x + 50 * s, y], [x - 50 * s, y]], { wob: 0.8 }),
    ...G.line(x - 24 * s, y - 22 * s, x + 10 * s, y - 22 * s, { wob: 0.3, over: 0 })];
}

export function oreBlock(x, y, size = 100) {
  const out = [...box(x, y, size, size)];
  const r = rng(5);
  for (let k = 0; k < 6; k++) {
    const ox = x + 14 + r() * (size - 40), oy = y + 14 + r() * (size - 40);
    out.push(...box(ox, oy, 14, 12, { wob: 0.3 }));
  }
  return out;
}

// ── World ───────────────────────────────────────────────────────────────────
export function ground(x1, x2, y, size = 64) {
  const out = [...G.line(x1, y, x2, y, { wob: 1.5 }), ...G.line(x1, y + size, x2, y + size, { wob: 1.5 })];
  for (let x = x1; x <= x2 + 1; x += size) out.push(...G.line(x, y, x, y + size, { wob: 0.8, over: 0 }));
  const tufts = [];
  for (let x = x1; x < x2; x += 16) tufts.push([x, y + 10 + ((x / 16) % 2) * 10]);
  out.push(...G.path(tufts, { wob: 0.6 }));
  return out;
}

export function tree(x, groundY, s = 1, leaves = true) {
  const out = [...box(x - 17 * s, groundY - 140 * s, 34 * s, 140 * s)];
  out.push(...G.line(x - 5 * s, groundY - 120 * s, x - 5 * s, groundY - 40 * s, { wob: 0.4, over: 0 }));
  if (!leaves) return out;
  const b = 56 * s, top = groundY - 140 * s - b * 2.6;
  const rows = [[-1, 0], [-2, -1, 0, 1], [-2, -1, 0, 1]];
  rows.forEach((cols, r) => cols.forEach((c) => out.push(...box(x + c * b, top + r * b * 0.86, b, b * 0.86, { wob: 0.8 }))));
  return out;
}

export function fallingLeaves(x, y, n = 6, seed = 4) {
  const r = rng(seed), out = [];
  for (let k = 0; k < n; k++) {
    const lx = x + (r() - 0.5) * 220, ly = y + r() * 200, a = (r() - 0.5) * 1.2;
    out.push(...box(lx, ly, 22, 22, { a, px: lx + 11, py: ly + 11, wob: 0.4 }));
  }
  return out;
}

export function house(x, groundY, s = 1) {
  const w = 250 * s, h = 160 * s, x0 = x - w / 2, y0 = groundY - h;
  const out = [...box(x0, y0, w, h)];
  for (let k = 1; k < 4; k++) out.push(...G.line(x0, y0 + (h * k) / 4, x0 + w, y0 + (h * k) / 4, { wob: 0.6, over: 0 }));
  const left = [[x0 - 20 * s, y0]];
  let cx = x0 - 20 * s, cy = y0;
  for (let k = 0; k < 4; k++) { cy -= 30 * s; left.push([cx, cy]); cx += 34 * s; left.push([cx, cy]); }
  const roof = [...left, ...left.map(([px, py]) => [2 * x - px, py]).reverse()];
  out.push(...G.path(roof, { wob: 1 }));
  out.push(...box(x - 26 * s, groundY - 96 * s, 52 * s, 96 * s), ...G.line(x - 26 * s, groundY - 48 * s, x + 26 * s, groundY - 48 * s, { wob: 0.4, over: 0 }));
  out.push(...box(x0 + 26 * s, y0 + 34 * s, 50 * s, 50 * s), ...G.line(x0 + 51 * s, y0 + 34 * s, x0 + 51 * s, y0 + 84 * s, { wob: 0.3, over: 0 }));
  return out;
}

export function squareMoon(x, y, size = 110) {
  return [...box(x - size / 2, y - size / 2, size, size), ...box(x - size * 0.3, y - size * 0.25, size * 0.2, size * 0.2, { wob: 0.4 }),
    ...box(x + size * 0.08, y + size * 0.05, size * 0.26, size * 0.22, { wob: 0.4 })];
}

export function hill(x, y, cols, rows, size = 70) {
  const out = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols - (r === 0 ? 1 : 0); c++) out.push(...box(x + c * size, y + r * size, size, size, { wob: 0.7 }));
  return out;
}

export function fog(x1, x2, y, n = 3) {
  const out = [];
  for (let k = 0; k < n; k++) {
    const pts = [];
    for (let x = x1 + k * 30; x <= x2 - k * 20; x += 40) pts.push([x, y + k * 34 + Math.sin(x / 55 + k) * 9]);
    out.push(...G.curve(pts, { wob: 1 }));
  }
  return out;
}

export function panel(x, y, w, h) {
  return [...box(x, y, w, h, { wob: 1.6 })];
}

export function speedLines(x, y, n = 4, len = 70) {
  const out = [];
  for (let k = 0; k < n; k++) out.push(...G.line(x - len - k * 8, y + k * 34, x - k * 8, y + k * 34, { wob: 0.6, over: 0 }));
  return out;
}

export function speaker(x, y, s = 1) {
  return [
    ...G.path([[x - 30 * s, y - 14 * s], [x - 12 * s, y - 14 * s], [x + 10 * s, y - 34 * s], [x + 10 * s, y + 34 * s], [x - 12 * s, y + 14 * s], [x - 30 * s, y + 14 * s], [x - 30 * s, y - 14 * s]], { wob: 0.8 }),
    ...G.arc(x + 14 * s, y, 26 * s, -0.7, 0.7), ...G.arc(x + 14 * s, y, 44 * s, -0.7, 0.7),
  ];
}
