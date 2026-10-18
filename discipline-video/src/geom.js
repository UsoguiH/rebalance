// Hand-drawn shape generators. Every function returns an array of polylines
// (arrays of [x, y]) in world coordinates, already "humanized" with a gentle wobble.

import { noise1, rng } from './util.js';

let autoSeed = 1;
const nextSeed = () => (autoSeed = (autoSeed * 48271) % 2147483647);

function resample(pts, step = 6) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    const d = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.max(1, Math.ceil(d / step));
    for (let k = 1; k <= n; k++) out.push([x0 + ((x1 - x0) * k) / n, y0 + ((y1 - y0) * k) / n]);
  }
  return out;
}

// Push each point sideways by smooth noise so straight lines look drawn by hand.
export function humanize(pts, wob = 2.2, seed = nextSeed(), freq = 1 / 110) {
  const r = resample(pts);
  let s = 0;
  return r.map((p, i) => {
    if (i > 0) s += Math.hypot(p[0] - r[i - 1][0], p[1] - r[i - 1][1]);
    const a = r[Math.max(0, i - 1)], b = r[Math.min(r.length - 1, i + 1)];
    let nx = -(b[1] - a[1]), ny = b[0] - a[0];
    const l = Math.hypot(nx, ny) || 1;
    nx /= l; ny /= l;
    const o = (noise1(s * freq, seed % 997) - 0.5) * 2 * wob;
    return [p[0] + nx * o, p[1] + ny * o];
  });
}

export const path = (points, o = {}) => [humanize(points, o.wob ?? 2.2, o.seed)];

export function line(x1, y1, x2, y2, o = {}) {
  const ov = o.over ?? 4;
  const d = Math.hypot(x2 - x1, y2 - y1) || 1;
  const ux = (x2 - x1) / d, uy = (y2 - y1) / d;
  return path([[x1 - ux * ov * 0.3, y1 - uy * ov * 0.3], [x2 + ux * ov, y2 + uy * ov]], o);
}

function catmull(points, seg = 10) {
  const out = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)], p1 = points[i], p2 = points[i + 1], p3 = points[Math.min(points.length - 1, i + 2)];
    for (let k = 0; k < seg; k++) {
      const t = k / seg, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

export const curve = (points, o = {}) => [humanize(catmull(points), o.wob ?? 2.0, o.seed)];

export function ellipse(cx, cy, rx, ry, o = {}) {
  const r = rng(o.seed ?? nextSeed());
  const a0 = o.a0 ?? -Math.PI * (0.5 + r() * 0.6);
  const sweep = o.sweep ?? Math.PI * 2 * (1.04 + r() * 0.06);
  const n = Math.max(24, Math.ceil(((rx + ry) * sweep) / 10));
  const jit = o.jit ?? 0.04;
  const p1 = r() * 6, p2 = r() * 6;
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, a = a0 + sweep * t;
    const k = 1 + jit * Math.sin(a * 2 + p1) * 0.6 + jit * Math.sin(a * 3 + p2) * 0.4 + jit * 0.5 * t;
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  return [humanize(pts, o.wob ?? 1.2)];
}

export const circle = (cx, cy, r, o = {}) => ellipse(cx, cy, r, r, o);

export function arc(cx, cy, r, a0, a1, o = {}) {
  const n = Math.max(8, Math.ceil((Math.abs(a1 - a0) * r) / 8));
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * (o.ry ?? r)]);
  }
  return [humanize(pts, o.wob ?? 1.2)];
}

export function rect(x, y, w, h, o = {}) {
  const ov = o.over ?? 6;
  return [
    ...path([[x - ov, y], [x + w, y], [x + w, y + h + ov]], o),
    ...path([[x + w + ov, y + h], [x, y + h], [x, y - ov]], o),
  ];
}

export function arrow(x1, y1, x2, y2, o = {}) {
  const bend = o.bend ?? 0.15;
  const mx = (x1 + x2) / 2 - (y2 - y1) * bend, my = (y1 + y2) / 2 + (x2 - x1) * bend;
  const shaft = curve([[x1, y1], [mx, my], [x2, y2]], o)[0];
  const n = shaft.length, a = shaft[Math.max(0, n - 4)], b = shaft[n - 1];
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), hl = o.head ?? 26;
  return [
    shaft,
    ...path([[b[0] + Math.cos(ang + 2.6) * hl, b[1] + Math.sin(ang + 2.6) * hl], b, [b[0] + Math.cos(ang - 2.6) * hl, b[1] + Math.sin(ang - 2.6) * hl]], { wob: 1 }),
  ];
}

export function scribble(x, y, w, h, o = {}) {
  const passes = o.passes ?? Math.max(3, Math.round(w / 34));
  const r = rng(o.seed ?? nextSeed());
  const pts = [];
  for (let i = 0; i <= passes; i++) {
    const px = x + (w * i) / passes;
    pts.push([px + (r() - 0.5) * 10, i % 2 ? y + h * (0.05 + r() * 0.1) : y + h * (0.85 + r() * 0.1)]);
  }
  return path(pts, { wob: 1.5 });
}

export const strike = (x1, x2, y, o = {}) => line(x1 - 8, y + 6, x2 + 8, y - 6, { wob: 1.5, ...o });

export const check = (x, y, s = 1) => path([[x - 40 * s, y - 5 * s], [x - 12 * s, y + 30 * s], [x + 45 * s, y - 50 * s]], { wob: 1.5 });

export const cross = (x, y, s = 1) => [
  ...line(x - 35 * s, y - 35 * s, x + 35 * s, y + 35 * s, { wob: 1.5 }),
  ...line(x + 35 * s, y - 35 * s, x - 35 * s, y + 35 * s, { wob: 1.5 }),
];

// A line that trembles, for "shaky" days.
export function tremble(x1, y, x2, amp = 10, freq = 0.09, o = {}) {
  const r = rng(o.seed ?? nextSeed());
  const pts = [];
  for (let x = x1; x <= x2; x += 5) {
    const k = (x - x1) * freq;
    pts.push([x, y + Math.sin(k) * amp * 0.5 + (r() - 0.5) * amp + Math.sin(k * 0.23) * amp * 0.8]);
  }
  return [humanize(pts, 1)];
}

export function dashed(x1, y, x2, dash = 26, gap = 22, o = {}) {
  const r = rng(o.seed ?? nextSeed()), out = [];
  for (let x = x1; x < x2; x += dash + gap + (r() - 0.5) * 14) out.push(...line(x, y + (r() - 0.5) * 8, Math.min(x2, x + dash), y + (r() - 0.5) * 8, { wob: 1 }));
  return out;
}

// Stick figure poses, in figure units with the feet at the origin.
const POSES = {
  stand: {
    body: [[0, -182], [0, -90]],
    armL: [[0, -165], [-28, -122], [-38, -78]],
    armR: [[0, -165], [28, -122], [38, -78]],
    legL: [[0, -90], [-16, -45], [-26, 0]],
    legR: [[0, -90], [16, -45], [26, 0]],
  },
  hold: {
    body: [[0, -182], [0, -90]],
    armL: [[0, -165], [-28, -122], [-38, -78]],
    armR: [[0, -165], [46, -140], [72, -172]],
    legL: [[0, -90], [-16, -45], [-26, 0]],
    legR: [[0, -90], [16, -45], [26, 0]],
  },
  lift: {
    body: [[0, -182], [0, -90]],
    armL: [[0, -165], [-44, -186], [-52, -238]],
    armR: [[0, -165], [44, -186], [52, -238]],
    legL: [[0, -90], [-24, -48], [-34, 0]],
    legR: [[0, -90], [24, -48], [34, 0]],
  },
  step: {
    body: [[0, -182], [0, -90]],
    armL: [[0, -165], [-30, -128], [-22, -86]],
    armR: [[0, -165], [32, -134], [48, -100]],
    legL: [[0, -90], [-14, -46], [-20, 0]],
    legR: [[0, -90], [26, -66], [34, -30]],
  },
  cheer: {
    body: [[0, -182], [0, -90]],
    armL: [[0, -165], [-40, -200], [-58, -250]],
    armR: [[0, -165], [40, -200], [58, -250]],
    legL: [[0, -90], [-18, -45], [-28, 0]],
    legR: [[0, -90], [18, -45], [28, 0]],
  },
};

export function figureUnits(pose = 'stand') {
  const p = POSES[pose];
  return [
    ...circle(0, -215, 33, { wob: 0.8 }),
    ...path(p.body, { wob: 1.2 }),
    ...path(p.armL, { wob: 1 }),
    ...path(p.armR, { wob: 1 }),
    ...path(p.legL, { wob: 1 }),
    ...path(p.legR, { wob: 1 }),
  ];
}

export const place = (strokes, x, y, s = 1, flip = 1) => strokes.map((pts) => pts.map(([px, py]) => [x + px * s * flip, y + py * s]));

export const figure = (x, y, s = 1, pose = 'stand', flip = 1) => place(figureUnits(pose), x, y, s, flip);

export function penDoodle(x, y, len = 110, ang = -1.0, w = 16) {
  const ux = Math.cos(ang), uy = Math.sin(ang), nx = -uy * w / 2, ny = ux * w / 2;
  const t = [x, y], b = [x + ux * 22, y + uy * 22];
  const e = [x + ux * len, y + uy * len];
  return [
    ...path([t, [b[0] + nx, b[1] + ny], [e[0] + nx, e[1] + ny], [e[0] - nx, e[1] - ny], [b[0] - nx, b[1] - ny], t], { wob: 0.8 }),
    ...line(b[0] + nx, b[1] + ny, b[0] - nx, b[1] - ny, { wob: 0.5, over: 1 }),
  ];
}

export function clockFace(cx, cy, r) {
  const out = [...circle(cx, cy, r)];
  for (let i = 0; i < 12; i += 3) {
    const a = (i / 12) * Math.PI * 2;
    out.push(...line(cx + Math.cos(a) * r * 0.78, cy + Math.sin(a) * r * 0.78, cx + Math.cos(a) * r * 0.9, cy + Math.sin(a) * r * 0.9, { wob: 0.4, over: 1 }));
  }
  return out;
}

export function alarmClock(cx, cy, r) {
  return [
    ...clockFace(cx, cy, r),
    ...arc(cx - r * 0.62, cy - r * 0.92, r * 0.36, Math.PI * 1.05, Math.PI * 1.95),
    ...arc(cx + r * 0.62, cy - r * 0.92, r * 0.36, Math.PI * 1.05, Math.PI * 1.95),
    ...line(cx - r * 0.6, cy + r * 0.82, cx - r * 0.85, cy + r * 1.15, { over: 1 }),
    ...line(cx + r * 0.6, cy + r * 0.82, cx + r * 0.85, cy + r * 1.15, { over: 1 }),
  ];
}

export function hands(cx, cy, r, hourA, minA) {
  return [
    ...line(cx, cy, cx + Math.cos(hourA) * r * 0.5, cy + Math.sin(hourA) * r * 0.5, { wob: 0.4, over: 0 }),
    ...line(cx, cy, cx + Math.cos(minA) * r * 0.75, cy + Math.sin(minA) * r * 0.75, { wob: 0.4, over: 0 }),
  ];
}

export function sun(cx, cy, r) {
  const out = [...circle(cx, cy, r)];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.2;
    out.push(...line(cx + Math.cos(a) * r * 1.35, cy + Math.sin(a) * r * 1.35, cx + Math.cos(a) * r * 1.85, cy + Math.sin(a) * r * 1.85, { wob: 0.5, over: 1 }));
  }
  return out;
}

export function cloud(cx, cy, s = 1) {
  const pts = [];
  const bumps = [[-80, 10, 38], [-38, -22, 48], [20, -34, 54], [74, -6, 40]];
  pts.push([cx - 112 * s, cy + 30 * s]);
  for (const [bx, by, br] of bumps) {
    for (let k = 0; k <= 10; k++) {
      const a = Math.PI * (1.0 + k / 10);
      pts.push([cx + (bx + Math.cos(a) * br) * s, cy + (by + Math.sin(a) * br) * s]);
    }
  }
  pts.push([cx + 112 * s, cy + 30 * s], [cx - 112 * s, cy + 32 * s]);
  return [humanize(pts, 1.4)];
}

export function rain(x, y, w, h, n = 9, seed = 7) {
  const r = rng(seed), out = [];
  for (let i = 0; i < n; i++) {
    const px = x + (w * (i + 0.5)) / n + (r() - 0.5) * 14, py = y + r() * h * 0.5;
    out.push(...line(px, py, px - 12, py + 36 + r() * 20, { wob: 0.4, over: 1 }));
  }
  return out;
}

export function tracks(x1, x2, y) {
  const out = [...line(x1, y, x2, y + 2, { wob: 1.4 }), ...line(x1, y + 34, x2, y + 35, { wob: 1.4 })];
  for (let x = x1 + 14; x < x2; x += 48) out.push(...line(x, y - 8, x - 6, y + 44, { wob: 0.5, over: 1 }));
  return out;
}

export function train(x, y, s = 1) {
  return [
    ...rect(x - 70 * s, y - 70 * s, 120 * s, 70 * s, { over: 3 }),
    ...rect(x - 70 * s, y - 120 * s, 50 * s, 50 * s, { over: 3 }),
    ...line(x + 50 * s, y - 40 * s, x + 80 * s, y, { over: 1 }),
    ...circle(x - 40 * s, y + 6 * s, 14 * s, { wob: 0.5 }),
    ...circle(x + 20 * s, y + 6 * s, 14 * s, { wob: 0.5 }),
    ...curve([[x + 30 * s, y - 70 * s], [x + 34 * s, y - 100 * s], [x + 60 * s, y - 112 * s], [x + 90 * s, y - 118 * s]], { wob: 1 }),
  ];
}

export function signpost(x, groundY, topY, boardW, boardH) {
  return [
    ...line(x, groundY, x, topY + boardH * 0.5, { wob: 1 }),
    ...rect(x - boardW * 0.32, topY - boardH * 0.5, boardW, boardH),
  ];
}

export function book(cx, cy, s = 1) {
  return [
    ...path([[cx, cy - 34 * s], [cx - 60 * s, cy - 44 * s], [cx - 60 * s, cy + 36 * s], [cx, cy + 46 * s], [cx + 60 * s, cy + 36 * s], [cx + 60 * s, cy - 44 * s], [cx, cy - 34 * s], [cx, cy + 46 * s]], { wob: 1 }),
    ...line(cx - 46 * s, cy - 20 * s, cx - 14 * s, cy - 16 * s, { wob: 0.4, over: 0 }),
    ...line(cx - 46 * s, cy - 2 * s, cx - 14 * s, cy + 2 * s, { wob: 0.4, over: 0 }),
    ...line(cx + 14 * s, cy - 16 * s, cx + 46 * s, cy - 20 * s, { wob: 0.4, over: 0 }),
  ];
}

export function dumbbell(cx, cy, s = 1) {
  return [
    ...line(cx - 46 * s, cy, cx + 46 * s, cy, { wob: 0.6 }),
    ...rect(cx - 62 * s, cy - 30 * s, 18 * s, 60 * s, { over: 2 }),
    ...rect(cx + 44 * s, cy - 30 * s, 18 * s, 60 * s, { over: 2 }),
  ];
}

export function seats(cx, cy, cols, rows, dx = 78, dy = 62) {
  const out = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = cx + (c - (cols - 1) / 2) * dx + (r % 2) * 10, y = cy + r * dy;
      const back = [[x - 22, y + 2], [x - 22, y - 22]];
      for (let k = 0; k <= 8; k++) back.push([x - 22 * Math.cos((Math.PI * k) / 8), y - 22 - 16 * Math.sin((Math.PI * k) / 8)]);
      back.push([x + 22, y + 2]);
      out.push(...path(back, { wob: 0.7 }));
      out.push(...path([[x - 30, y + 2], [x + 30, y + 2], [x + 30, y + 14], [x - 30, y + 14], [x - 30, y + 2]], { wob: 0.6 }));
      out.push(...line(x - 24, y + 14, x - 24, y + 26, { wob: 0.3, over: 0 }), ...line(x + 24, y + 14, x + 24, y + 26, { wob: 0.3, over: 0 }));
    }
  }
  return out;
}

export function moon(cx, cy, r) {
  return [
    ...arc(cx, cy, r, Math.PI * 0.35, Math.PI * 1.65),
    ...arc(cx + r * 0.38, cy, r * 0.8, Math.PI * 0.62, Math.PI * 1.38),
  ];
}

export function lamp(cx, topY, s = 1) {
  const sh = topY + 110 * s;
  return [
    ...line(cx, topY, cx, sh, { wob: 0.5 }),
    ...path([[cx - 26 * s, sh], [cx - 78 * s, sh + 70 * s], [cx + 78 * s, sh + 70 * s], [cx + 26 * s, sh], [cx - 26 * s, sh]], { wob: 0.8 }),
    ...arc(cx, sh + 72 * s, 20 * s, 0.1, Math.PI - 0.1),
  ];
}

export function mirror(cx, cy, rx, ry) {
  return [
    ...ellipse(cx, cy, rx, ry, { wob: 1 }),
    ...ellipse(cx, cy, rx + 18, ry + 18, { wob: 1 }),
    ...line(cx - rx * 0.5, cy + ry + 14, cx - rx * 0.8, cy + ry + 90),
    ...line(cx + rx * 0.5, cy + ry + 14, cx + rx * 0.8, cy + ry + 90),
    ...line(cx + rx * 0.35, cy - ry * 0.7, cx + rx * 0.62, cy - ry * 0.4, { wob: 0.4, over: 0 }),
    ...line(cx + rx * 0.5, cy - ry * 0.78, cx + rx * 0.7, cy - ry * 0.56, { wob: 0.4, over: 0 }),
  ];
}

export function page(cx, cy, w, h) {
  const x = cx - w / 2, y = cy - h / 2, f = w * 0.22;
  return [
    ...path([[x + w - f, y], [x, y], [x, y + h], [x + w, y + h], [x + w, y + f], [x + w - f, y], [x + w - f, y + f], [x + w, y + f]], { wob: 1 }),
  ];
}

export function flag(x, y, s = 1) {
  return [
    ...line(x, y, x, y - 120 * s, { wob: 0.6 }),
    ...path([[x, y - 120 * s], [x + 70 * s, y - 100 * s], [x, y - 78 * s]], { wob: 0.8 }),
  ];
}
