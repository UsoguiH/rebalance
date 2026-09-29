import * as THREE from 'three';
import { FONT_DISPLAY } from './textures.js';

// Turns a line of (Arabic) text into extruded 3D pieces. The browser shapes the
// text onto a canvas; we split the pixels into connected letter groups (Arabic
// words break naturally where letters don't join), trace each group's outline
// with marching squares, and extrude it. Dots and hamzas join the nearest group.

function labelComponents(mask, W, H) {
  const labels = new Int32Array(W * H).fill(-1);
  const comps = [];
  const stack = [];
  for (let i = 0; i < W * H; i++) {
    if (!mask[i] || labels[i] >= 0) continue;
    const id = comps.length;
    const c = { id, area: 0, x0: W, y0: H, x1: 0, y1: 0 };
    labels[i] = id;
    stack.push(i);
    while (stack.length) {
      const j = stack.pop();
      const x = j % W, y = (j / W) | 0;
      c.area++;
      if (x < c.x0) c.x0 = x; if (x > c.x1) c.x1 = x;
      if (y < c.y0) c.y0 = y; if (y > c.y1) c.y1 = y;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const k = ny * W + nx;
        if (mask[k] && labels[k] < 0) { labels[k] = id; stack.push(k); }
      }
    }
    comps.push(c);
  }
  return { labels, comps };
}

// Marching-squares segments per case; edges: 0 top, 1 right, 2 bottom, 3 left.
const CASES = {
  1: [[3, 2]], 2: [[2, 1]], 3: [[3, 1]], 4: [[1, 0]], 5: [[3, 2], [1, 0]], 6: [[2, 0]], 7: [[3, 0]],
  8: [[0, 3]], 9: [[0, 2]], 10: [[0, 3], [2, 1]], 11: [[0, 1]], 12: [[1, 3]], 13: [[1, 2]], 14: [[2, 3]],
};
// Edge midpoints in doubled integer coordinates (so keys are exact).
const EDGE = [[1, 0], [2, 1], [1, 2], [0, 1]];

function traceLoops(inside, x0, y0, x1, y1) {
  const adj = new Map();
  const link = (a, b) => {
    (adj.get(a) || adj.set(a, []).get(a)).push(b);
    (adj.get(b) || adj.set(b, []).get(b)).push(a);
  };
  for (let y = y0 - 1; y <= y1; y++) {
    for (let x = x0 - 1; x <= x1; x++) {
      const tl = inside(x, y), tr = inside(x + 1, y), br = inside(x + 1, y + 1), bl = inside(x, y + 1);
      const idx = (tl << 3) | (tr << 2) | (br << 1) | bl;
      const segs = CASES[idx];
      if (!segs) continue;
      for (const [e1, e2] of segs) {
        const a = (x * 2 + EDGE[e1][0]) * 100000 + (y * 2 + EDGE[e1][1]);
        const b = (x * 2 + EDGE[e2][0]) * 100000 + (y * 2 + EDGE[e2][1]);
        link(a, b);
      }
    }
  }
  const loops = [];
  const seen = new Set();
  for (const start of adj.keys()) {
    if (seen.has(start)) continue;
    const loop = [];
    let prev = -1, cur = start;
    while (!seen.has(cur)) {
      seen.add(cur);
      loop.push([Math.floor(cur / 100000) / 2, (cur % 100000) / 2]);
      const n = adj.get(cur);
      const next = n[0] !== prev ? n[0] : n[1];
      prev = cur;
      cur = next;
      if (cur === undefined) break;
    }
    if (loop.length > 6) loops.push(loop);
  }
  return loops;
}

function simplify(points, eps) {
  if (points.length < 4) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = points[a], [bx, by] = points[b];
    const dx = bx - ax, dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;
    let best = -1, bestD = eps;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs((points[i][0] - ax) * dy - (points[i][1] - ay) * dx) / len;
      if (d > bestD) { bestD = d; best = i; }
    }
    if (best > 0) { keep[best] = 1; stack.push([a, best], [best, b]); }
  }
  return points.filter((_, i) => keep[i]);
}

// Closed loops: split at the point farthest from the start, simplify both halves.
function simplifyClosed(loop, eps) {
  const [sx, sy] = loop[0];
  let k = 0, far = -1;
  loop.forEach(([x, y], i) => { const d = (x - sx) ** 2 + (y - sy) ** 2; if (d > far) { far = d; k = i; } });
  const a = simplify(loop.slice(0, k + 1), eps);
  const b = simplify([...loop.slice(k), loop[0]], eps);
  return [...a.slice(0, -1), ...b.slice(0, -1)];
}

function area(loop) {
  let s = 0;
  for (let i = 0, j = loop.length - 1; i < loop.length; j = i++) s += (loop[j][0] + loop[i][0]) * (loop[j][1] - loop[i][1]);
  return s / 2;
}

function contains(loop, [px, py]) {
  let inside = false;
  for (let i = 0, j = loop.length - 1; i < loop.length; j = i++) {
    const [xi, yi] = loop[i], [xj, yj] = loop[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function textPieces(text, { height = 2.6, depth = 0.8, px = 220, font = FONT_DISPLAY } = {}) {
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  const fontStr = `700 ${px}px ${font}`;
  ctx.font = fontStr;
  const m = ctx.measureText(text);
  const W = Math.ceil(m.width + px * 0.4);
  const H = Math.ceil(px * 1.7);
  c.width = W;
  c.height = H;
  ctx.font = fontStr;
  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#000';
  ctx.fillText(text, W / 2, H / 2);
  const img = ctx.getImageData(0, 0, W, H).data;
  const mask = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) mask[i] = img[i * 4 + 3] > 110 ? 1 : 0;

  const { labels, comps } = labelComponents(mask, W, H);
  if (!comps.length) return [];
  const maxArea = Math.max(...comps.map((q) => q.area));
  const big = comps.filter((q) => q.area > maxArea * 0.06);
  // Attach dots and small marks to the closest big group (horizontal overlap first).
  const owner = new Map();
  for (const q of comps) {
    if (big.includes(q)) { owner.set(q.id, q.id); continue; }
    const cx = (q.x0 + q.x1) / 2, cy = (q.y0 + q.y1) / 2;
    let best = big[0], bestD = Infinity;
    for (const b of big) {
      const dx = cx < b.x0 ? b.x0 - cx : cx > b.x1 ? cx - b.x1 : 0;
      const dy = cy < b.y0 ? b.y0 - cy : cy > b.y1 ? cy - b.y1 : 0;
      const d = dx * 4 + dy;
      if (d < bestD) { bestD = d; best = b; }
    }
    owner.set(q.id, best.id);
  }

  // Overall ink bounds, used to place pieces relative to the whole word.
  const inkX0 = Math.min(...comps.map((q) => q.x0)), inkX1 = Math.max(...comps.map((q) => q.x1));
  const inkY0 = Math.min(...comps.map((q) => q.y0)), inkY1 = Math.max(...comps.map((q) => q.y1));
  const scale = height / (inkY1 - inkY0);
  const midX = (inkX0 + inkX1) / 2;

  const pieces = [];
  for (const b of big) {
    const members = comps.filter((q) => owner.get(q.id) === b.id);
    const x0 = Math.min(...members.map((q) => q.x0)), x1 = Math.max(...members.map((q) => q.x1));
    const y0 = Math.min(...members.map((q) => q.y0)), y1 = Math.max(...members.map((q) => q.y1));
    const ids = new Set(members.map((q) => q.id));
    const inside = (x, y) => (x >= 0 && y >= 0 && x < W && y < H && mask[y * W + x] && ids.has(labels[y * W + x]) ? 1 : 0);
    const loops = traceLoops(inside, x0, y0, x1, y1).map((l) => simplifyClosed(l, 0.9)).filter((l) => l.length >= 3);
    // Nesting depth decides outline vs hole.
    const info = loops.map((l) => ({ l, a: Math.abs(area(l)), depth: 0, holes: [] }));
    for (const a of info) for (const o of info) if (o !== a && o.a > a.a && contains(o.l, a.l[0])) a.depth++;
    const outers = info.filter((q) => q.depth % 2 === 0);
    for (const h of info.filter((q) => q.depth % 2 === 1)) {
      const parent = outers.filter((o) => o.a > h.a && contains(o.l, h.l[0])).sort((p, q) => p.a - q.a)[0];
      if (parent) parent.holes.push(h);
    }
    const cxp = (x0 + x1) / 2, cyp = (y0 + y1) / 2;
    const toV = ([x, y]) => new THREE.Vector2((x - cxp) * scale, -(y - cyp) * scale);
    const shapes = outers.map((o) => {
      const s = new THREE.Shape(o.l.map(toV));
      for (const h of o.holes) s.holes.push(new THREE.Path(h.l.map(toV)));
      return s;
    });
    if (!shapes.length) continue;
    const geo = new THREE.ExtrudeGeometry(shapes, {
      depth, curveSegments: 1, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.035, bevelSegments: 1,
    });
    geo.translate(0, 0, -depth / 2);
    geo.computeVertexNormals();
    pieces.push({
      geometry: geo,
      w: (x1 - x0) * scale + 0.08,
      h: (y1 - y0) * scale + 0.08,
      d: depth + 0.12,
      // Offset from the word's centre, and height of the piece's centre above the lowest ink.
      x: (cxp - midX) * scale,
      y: (inkY1 - cyp) * scale,
    });
  }
  return pieces;
}
