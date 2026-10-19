// Navigation grid (0.5 unit cells) with heights, water, static obstacles and team gates,
// plus A* with line-of-sight smoothing and a simple slide-along-walls mover.
import { MAP, surfaceAt, CASTLES, OUTPOSTS, TREES, PINES, ROCKS, ORES, BRIDGES } from './world.js';
import { sdPolyline, clamp } from './util.js';

export const CELL = 0.5;
const W = Math.round((MAP.maxX - MAP.minX) / CELL);
const H = Math.round((MAP.maxZ - MAP.minZ) / CELL);
export const NAV = {
  W, H,
  height: new Float32Array(W * H),
  kind: new Uint8Array(W * H), // 0 void, 1 ground, 2 water, 3 bridge, 4 terrace, 5 stairs
  block: new Uint8Array(W * H), // static obstacles (count, so dynamic props can add/remove)
  gate: new Int8Array(W * H).fill(-1), // team owning a gate cell
  gateOpen: [false, false], // destroyed gates let everyone through
  dyn: new Uint8Array(W * H), // dynamic blockers (built ladders, catapult, ...)
};
const KIND = { void: 0, ground: 1, water: 2, bridge: 3, terrace: 4, stairs: 5 };
export const toCell = (x, z) => [Math.floor((x - MAP.minX) / CELL), Math.floor((z - MAP.minZ) / CELL)];
export const cellCenter = (cx, cz) => [MAP.minX + (cx + 0.5) * CELL, MAP.minZ + (cz + 0.5) * CELL];
const idx = (cx, cz) => cz * W + cx;

function stampCircle(x, z, r, arr = NAV.block, v = 1) {
  const [c0, r0] = toCell(x - r, z - r), [c1, r1] = toCell(x + r, z + r);
  for (let cz = Math.max(0, r0); cz <= Math.min(H - 1, r1); cz++)
    for (let cx = Math.max(0, c0); cx <= Math.min(W - 1, c1); cx++) {
      const [px, pz] = cellCenter(cx, cz);
      if ((px - x) ** 2 + (pz - z) ** 2 <= r * r) arr[idx(cx, cz)] += v;
    }
}
export function stampBox(x, z, hx, hz, arr = NAV.block, v = 1) {
  const [c0, r0] = toCell(x - hx, z - hz), [c1, r1] = toCell(x + hx, z + hz);
  for (let cz = Math.max(0, r0); cz <= Math.min(H - 1, r1); cz++) for (let cx = Math.max(0, c0); cx <= Math.min(W - 1, c1); cx++) arr[idx(cx, cz)] += v;
}
function stampPolyline(pts, r, arr = NAV.block) {
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const [x, z] of pts) {
    x0 = Math.min(x0, x);
    x1 = Math.max(x1, x);
    z0 = Math.min(z0, z);
    z1 = Math.max(z1, z);
  }
  const [c0, r0] = toCell(x0 - r, z0 - r), [c1, r1] = toCell(x1 + r, z1 + r);
  for (let cz = Math.max(0, r0); cz <= Math.min(H - 1, r1); cz++)
    for (let cx = Math.max(0, c0); cx <= Math.min(W - 1, c1); cx++) {
      const [px, pz] = cellCenter(cx, cz);
      if (sdPolyline(px, pz, pts) <= r) arr[idx(cx, cz)] = 1;
    }
}

export function buildNav() {
  for (let cz = 0; cz < H; cz++)
    for (let cx = 0; cx < W; cx++) {
      const [x, z] = cellCenter(cx, cz);
      const s = surfaceAt(x, z);
      NAV.height[idx(cx, cz)] = s.y;
      NAV.kind[idx(cx, cz)] = KIND[s.kind];
    }
  // castles: walls, towers, terrace parapet, keep, gates
  for (const c of CASTLES) {
    for (const w of c.walls) stampPolyline(w, 1.05);
    c.towers.forEach(([x, z], i) => {
      if (i === 3 || i === 6) return;
      if (i === 4 || i === 5) stampCircle(x, z * 1.25, 1.6);
      else stampCircle(x, z, 2.0);
    });
    stampBox(c.keep.x, c.keep.z, 3.6, 4.6);
    const g = c.gate;
    const [c0, r0] = toCell(g.x - 0.9, g.z - g.half), [c1, r1] = toCell(g.x + 0.9, g.z + g.half);
    for (let cz = r0; cz <= r1; cz++) for (let cx = c0; cx <= c1; cx++) NAV.gate[idx(cx, cz)] = c.team;
    stampCircle(c.throne.x, c.throne.z, 0.9);
    for (const hm of c.hatMachines) stampCircle(hm.x, hm.z, 1.35);
    stampCircle(c.prison.x, c.prison.z, 1.7);
    stampBox(c.stockpile.x, c.stockpile.z, 1.6, 1.1);
    for (const [x, z] of c.torches) stampCircle(x, z, 0.3);
    // drawbridge rails
    const d = c.drawbridge;
    stampBox((d.x0 + d.x1) / 2, d.z - d.half - 0.15, Math.abs(d.x0 - d.x1) / 2 - 0.6, 0.12);
    stampBox((d.x0 + d.x1) / 2, d.z + d.half + 0.15, Math.abs(d.x0 - d.x1) / 2 - 0.6, 0.12);
  }
  for (const b of BRIDGES) {
    const cx = (b.x0 + b.x1) / 2, hx = Math.abs(b.x0 - b.x1) / 2 - 0.3;
    stampBox(cx, b.z - b.half - 0.2, hx, 0.15);
    stampBox(cx, b.z + b.half + 0.2, hx, 0.15);
  }
  for (const o of OUTPOSTS) stampCircle(o.x, o.z, 2.3);
  for (const t of TREES) stampCircle(t.x, t.z, 0.75);
  for (const p of PINES) stampCircle(p.x, p.z, 0.65);
  for (const r of ROCKS) stampCircle(r.x, r.z, 0.7 * r.s);
  for (const o of ORES) stampCircle(o.x, o.z, 1.25);
}

export function cellKind(x, z) {
  const [cx, cz] = toCell(x, z);
  if (cx < 0 || cz < 0 || cx >= W || cz >= H) return 0;
  return NAV.kind[idx(cx, cz)];
}
export function groundY(x, z) {
  const [cx, cz] = toCell(x, z);
  if (cx < 0 || cz < 0 || cx >= W || cz >= H) return -40;
  return NAV.height[idx(cx, cz)];
}

// opts: { team, noWater }
function passableIdx(i, team, noWater) {
  const k = NAV.kind[i];
  if (k === 0 || NAV.block[i] || NAV.dyn[i]) return false;
  if (noWater && k === 2) return false;
  const g = NAV.gate[i];
  if (g >= 0 && g !== team && !NAV.gateOpen[g]) return false;
  return true;
}
function stepOk(a, b) {
  const ha = NAV.height[a], hb = NAV.height[b];
  const ka = NAV.kind[a], kb = NAV.kind[b];
  if (ka === 2 || kb === 2) return Math.max(ha, hb) <= 0.65; // climb in and out of water from banks/bridges
  return Math.abs(ha - hb) <= 0.62;
}
export function canStand(x, z, team = -1, noWater = false) {
  const [cx, cz] = toCell(x, z);
  if (cx < 0 || cz < 0 || cx >= W || cz >= H) return false;
  return passableIdx(idx(cx, cz), team, noWater);
}
export function canStep(x0, z0, x1, z1, team = -1, noWater = false) {
  const [ax, az] = toCell(x0, z0), [bx, bz] = toCell(x1, z1);
  if (bx < 0 || bz < 0 || bx >= W || bz >= H) return false;
  const b = idx(bx, bz);
  if (!passableIdx(b, team, noWater)) return false;
  if (ax === bx && az === bz) return true;
  if (ax < 0 || az < 0 || ax >= W || az >= H) return true;
  return stepOk(idx(ax, az), b);
}

// Moves a circle by (dx, dz) sliding along blocked cells. Returns the new position.
export function slide(x, z, dx, dz, team, noWater, r = 0.35) {
  const tryMove = (nx, nz) => {
    const ox = Math.sign(nx - x) * r, oz = Math.sign(nz - z) * r;
    return canStep(x, z, nx + ox, nz + oz, team, noWater) && canStep(x, z, nx, nz, team, noWater);
  };
  if (tryMove(x + dx, z + dz)) return [x + dx, z + dz, false];
  if (Math.abs(dx) > 1e-4 && tryMove(x + dx, z)) return [x + dx, z, true];
  if (Math.abs(dz) > 1e-4 && tryMove(x, z + dz)) return [x, z + dz, true];
  return [x, z, true];
}

// ----------------------------------------------------------------- A*
class Heap {
  constructor() {
    this.a = [];
    this.p = [];
  }
  push(v, pr) {
    const a = this.a, p = this.p;
    a.push(v);
    p.push(pr);
    let i = a.length - 1;
    while (i > 0) {
      const j = (i - 1) >> 1;
      if (p[j] <= pr) break;
      a[i] = a[j];
      p[i] = p[j];
      i = j;
    }
    a[i] = v;
    p[i] = pr;
  }
  pop() {
    const a = this.a, p = this.p;
    const top = a[0];
    const lv = a.pop(), lp = p.pop();
    if (a.length) {
      let i = 0;
      const n = a.length;
      for (;;) {
        let l = 2 * i + 1, r = l + 1, m = i, mp = lp;
        if (l < n && p[l] < mp) {
          m = l;
          mp = p[l];
        }
        if (r < n && p[r] < mp) m = r;
        if (m === i) break;
        a[i] = a[m];
        p[i] = p[m];
        i = m;
      }
      a[i] = lv;
      p[i] = lp;
    }
    return top;
  }
  get size() {
    return this.a.length;
  }
}
const gScore = new Float32Array(W * H);
const came = new Int32Array(W * H);
const stamp = new Uint32Array(W * H);
const closed = new Uint32Array(W * H);
let searchId = 0;
const DIRS = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];

function nearestPassable(cx, cz, team, noWater) {
  for (let r = 0; r < 8; r++)
    for (let dz = -r; dz <= r; dz++)
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
        const x = cx + dx, z = cz + dz;
        if (x < 0 || z < 0 || x >= W || z >= H) continue;
        if (passableIdx(idx(x, z), team, noWater)) return [x, z];
      }
  return null;
}

export function findPath(x0, z0, x1, z1, team, opts = {}) {
  const noWater = !!opts.noWater;
  let [sx, sz] = toCell(x0, z0);
  let [tx, tz] = toCell(x1, z1);
  const s = nearestPassable(sx, sz, team, noWater), t = nearestPassable(tx, tz, team, noWater);
  if (!s || !t) return null;
  [sx, sz] = s;
  [tx, tz] = t;
  const start = idx(sx, sz), goal = idx(tx, tz);
  searchId++;
  const heap = new Heap();
  gScore[start] = 0;
  stamp[start] = searchId;
  came[start] = -1;
  heap.push(start, 0);
  const waterCost = opts.waterCost ?? 5;
  const limit = opts.limit ?? 60000;
  let it = 0, best = start, bestH = Infinity;
  while (heap.size && it++ < limit) {
    const cur = heap.pop();
    if (closed[cur] === searchId) continue;
    closed[cur] = searchId;
    if (cur === goal) {
      best = cur;
      break;
    }
    const cx = cur % W, cz = (cur / W) | 0;
    const h = Math.hypot(cx - tx, cz - tz);
    if (h < bestH) {
      bestH = h;
      best = cur;
    }
    for (const [dx, dz, c] of DIRS) {
      const nx = cx + dx, nz = cz + dz;
      if (nx < 0 || nz < 0 || nx >= W || nz >= H) continue;
      const n = idx(nx, nz);
      if (closed[n] === searchId || !passableIdx(n, team, noWater) || !stepOk(cur, n)) continue;
      if (dx && dz && (!passableIdx(idx(cx + dx, cz), team, noWater) || !passableIdx(idx(cx, cz + dz), team, noWater))) continue;
      const g = gScore[cur] + c * (NAV.kind[n] === 2 ? waterCost : 1);
      if (stamp[n] !== searchId || g < gScore[n]) {
        stamp[n] = searchId;
        gScore[n] = g;
        came[n] = cur;
        const nh = Math.max(Math.abs(nx - tx), Math.abs(nz - tz)) + 0.414 * Math.min(Math.abs(nx - tx), Math.abs(nz - tz));
        heap.push(n, g + nh * 1.05);
      }
    }
  }
  const cells = [];
  for (let c = best; c !== -1; c = came[c]) cells.push(c);
  cells.reverse();
  // string pulling
  const pts = cells.map((c) => cellCenter(c % W, (c / W) | 0));
  const out = [pts[0]];
  let i = 0;
  while (i < pts.length - 1) {
    let j = Math.min(pts.length - 1, i + 40);
    while (j > i + 1 && !lineClear(pts[i][0], pts[i][1], pts[j][0], pts[j][1], team, noWater)) j--;
    out.push(pts[j]);
    i = j;
  }
  if (best === goal) out[out.length - 1] = [x1, z1];
  return { pts: out, complete: best === goal };
}

export function lineClear(x0, z0, x1, z1, team, noWater, clearance = 0.36) {
  const d = Math.hypot(x1 - x0, z1 - z0);
  if (d < 1e-4) return true;
  const n = Math.ceil(d / (CELL * 0.5));
  // walk the centre line and two parallel lines a body-width apart
  const px = (-(z1 - z0) / d) * clearance, pz = ((x1 - x0) / d) * clearance;
  for (const o of [0, 1, -1]) {
    let lx = x0 + px * o, lz = z0 + pz * o;
    if (o && !canStand(lx, lz, team, noWater)) return false;
    for (let k = 1; k <= n; k++) {
      const t = k / n;
      const x = x0 + (x1 - x0) * t + px * o, z = z0 + (z1 - z0) * t + pz * o;
      if (!canStep(lx, lz, x, z, team, noWater)) return false;
      lx = x;
      lz = z;
    }
  }
  return true;
}

export function randomStandable(x, z, r, team, rand = Math.random) {
  for (let i = 0; i < 30; i++) {
    const a = rand() * Math.PI * 2, d = Math.sqrt(rand()) * r;
    const px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
    if (canStand(px, pz, team, true)) return [px, pz];
  }
  return [x, z];
}
export const navClamp = (x, z) => [clamp(x, MAP.minX + 1, MAP.maxX - 1), clamp(z, MAP.minZ + 1, MAP.maxZ - 1)];
