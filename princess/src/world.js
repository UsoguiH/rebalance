// The battlefield as data: a mirrored two-castle map (blue on the left, red on the right)
// with a river down the middle, three crossings, outposts, forests and ore. Everything
// else (terrain meshes, navigation, AI) is derived from the signed-distance fields here.
import { clamp, sdBox, sdCircle, sdPolyline, sdSegment, fbm, lerp, spline, rng, smoothstep } from './util.js';

export const MAP = {
  minX: -82, maxX: 82, minZ: -50, maxZ: 50,
  halfW: 78, halfH: 40, // island extents
  waterY: -0.85, bedY: -2.4, groundY: 0, terraceY: 1.8, highY: 9,
};
export const TEAM = { BLUE: 0, RED: 1 };
export const SIDE = [-1, 1]; // x sign of each team's home

// ------------------------------------------------------------- river & moats
const riverPts = spline([[0, -56], [2.5, -40], [3, -30], [-1.5, -17], [0, -8], [0, 8], [1.5, 17], [-3, 30], [-2.5, 40], [0, 56]], 10);
function riverHalfWidth(z) {
  // wide around the central island, narrower under the north/south bridges
  const island = Math.exp(-(z * z) / 90) * 4.2;
  return 5.4 + island + Math.sin(z * 0.21) * 0.5;
}
export const RIVER = riverPts;
export const RIVER_ISLAND = { x: 0, z: 0, r: 5.6 };
const moatPts = (s) => spline([[s * 40.5, -22], [s * 39, -11], [s * 38.4, 0], [s * 39, 11], [s * 40.5, 22]], 8);
export const MOATS = [moatPts(-1), moatPts(1)];

export function riverSDF(x, z) {
  // distance to centreline minus local half width (cheap: sample nearest segment)
  let best = Infinity, bz = z;
  for (let i = 0; i < riverPts.length - 1; i++) {
    const a = riverPts[i], b = riverPts[i + 1];
    if (Math.abs(z - a[1]) > 12 && Math.abs(z - b[1]) > 12) continue;
    const d = sdSegment(x, z, a[0], a[1], b[0], b[1]);
    if (d < best) {
      best = d;
      bz = (a[1] + b[1]) / 2;
    }
  }
  return best - riverHalfWidth(bz);
}
function moatSDF(x, z) {
  const pts = x < 0 ? MOATS[0] : MOATS[1];
  const d = sdPolyline(x, z, pts);
  // rounded pond ends
  return d - 2.3;
}
export function waterSDF(x, z) {
  let w = riverSDF(x, z);
  w = Math.max(w, -sdCircle(x, z, RIVER_ISLAND.x, RIVER_ISLAND.z, RIVER_ISLAND.r));
  return Math.min(w, moatSDF(x, z));
}

// Island outline with a hand-drawn wobble.
export function islandSDF(x, z) {
  const w = (fbm(x * 0.07 + 11, z * 0.07 - 4, 3) - 0.5) * 5;
  return sdBox(x, z, 0, -5, MAP.halfW - 9, MAP.halfH - 4) - 9 + w;
}
// Raised rocky shelf along the north edge (negative inside).
export function highlandSDF(x, z) {
  const w = (fbm(x * 0.06 + 3, 1.7, 3) - 0.5) * 6 + Math.sin(x * 0.11) * 1.5;
  return z + 42 + w;
}
export function riverXAt(z) {
  for (let i = 0; i < riverPts.length - 1; i++) {
    const a = riverPts[i], b = riverPts[i + 1];
    if (z >= a[1] && z <= b[1]) return lerp(a[0], b[0], (z - a[1]) / (b[1] - a[1] || 1));
  }
  return 0;
}
// < 0 where there is dry land at ground height.
export function landSDF(x, z) {
  return Math.max(islandSDF(x, z), -waterSDF(x, z));
}

// ------------------------------------------------------------- castles
// Built for blue (x < 0) and mirrored for red.
function castleDef(team) {
  const s = SIDE[team];
  const P = (x, z) => [s * x, z];
  const wall = [P(74, -25), P(54, -25), P(46.5, -19.5), P(44, -12), P(44, -2.7)];
  const wall2 = [P(44, 2.7), P(44, 12), P(46.5, 19.5), P(54, 25), P(74, 25), P(74, -25)];
  return {
    team,
    s,
    walls: [wall, wall2],
    gate: { x: s * 44, z: 0, half: 2.7, dir: s }, // the doors face the centre (+x for blue)
    towers: [P(74, -25), P(54, -25), P(46.5, -19.5), P(44, -12), P(44, -3.4), P(44, 3.4), P(44, 12), P(46.5, 19.5), P(54, 25), P(74, 25)], // 3 and 6 are not built
    terrace: { x: s * 63.5, z: 0, r: 9.2, back: s * 74 },
    stairs: { x0: s * 54.6, x1: s * 51.2, z: 0, half: 2.2 },
    keep: { x: s * 70.5, z: 0 },
    throne: { x: s * 66.2, z: 0 },
    spawn: { x: s * 60.5, z: 0 },
    prison: { x: s * 51, z: -17 },
    stockpile: { x: s * 63.5, z: 16.5 },
    catapult: { x: s * 51, z: 17 },
    bombRack: { x: s * 61, z: -18.5 },
    hatMachines: [
      { cls: 'warrior', x: s * 50, z: 8 },
      { cls: 'ranger', x: s * 50, z: -8 },
      { cls: 'mage', x: s * 56.5, z: 12.5 },
      { cls: 'priest', x: s * 56.5, z: -12.5 },
      { cls: 'worker', x: s * 66, z: -16.5 },
    ],
    torches: [P(45.5, -4.6), P(45.5, 4.6), P(55.6, -3), P(55.6, 3)],
    drawbridge: { x0: s * 43.6, x1: s * 35.6, z: 0, half: 2.4 },
  };
}
export const CASTLES = [castleDef(0), castleDef(1)];

export function insideCastle(x, z, team) {
  const c = CASTLES[team];
  const ax = Math.abs(x);
  if (Math.sign(x) !== c.s) return false;
  if (ax > 74 || Math.abs(z) > 25) return false;
  // inner boundary approximated by the wall polyline (front face)
  if (ax < 44) return false;
  if (Math.abs(z) > 12 && ax < 44 + (Math.abs(z) - 12) * 0.34 + (Math.abs(z) > 19.5 ? (Math.abs(z) - 19.5) * 1.0 : 0)) return false;
  return true;
}
export function castleFloorSDF(x, z) {
  const ax = Math.abs(x);
  // union of a rounded rectangle and the wall outline region
  return sdBox(ax, z, 59.5, 0, 15.2, 25.5) - 0.2;
}
export function terraceSDF(x, z) {
  const c = x < 0 ? CASTLES[0] : CASTLES[1];
  const t = c.terrace;
  const circle = sdCircle(x, z, t.x, t.z, t.r);
  const back = sdBox(x, z, (t.x + t.back) / 2, 0, Math.abs(t.back - t.x) / 2, t.r * 0.82);
  return Math.min(circle, back);
}
// Stair ramp: returns 0..1 progress (1 = top) or -1 when not on the stairs.
export function stairT(x, z) {
  const c = x < 0 ? CASTLES[0] : CASTLES[1];
  const st = c.stairs;
  if (Math.abs(z - st.z) > st.half) return -1;
  const lo = Math.min(st.x0, st.x1), hi = Math.max(st.x0, st.x1);
  if (x < lo || x > hi) return -1;
  return clamp((x - st.x1) / (st.x0 - st.x1), 0, 1);
}

// ------------------------------------------------------------- outposts, resources, cakes
export const OUTPOSTS = [
  { id: 0, x: -24, z: -18 },
  { id: 1, x: -24, z: 19 },
  { id: 2, x: 0, z: 0, center: true },
  { id: 3, x: 24, z: -18 },
  { id: 4, x: 24, z: 19 },
];
export const BRIDGES = [
  { x0: -12.6, x1: -4.6, z: 0, half: 1.9 },
  { x0: 4.6, x1: 12.6, z: 0, half: 1.9 },
  { x0: -9.5, x1: 9.5, z: -26, half: 2.0 },
  { x0: -9.5, x1: 9.5, z: 26, half: 2.0 },
];
// Herringbone brick roads: centrelines (blue half; mirrored).
const roadBlue = [
  spline([[-44, 0], [-35, 0], [-28, 0.5], [-20, 0], [-13, 0]], 6),
  spline([[-30, 0.5], [-27, -7], [-24, -13.5]], 6),
  spline([[-24, -22.5], [-19, -26], [-10, -26]], 6),
  spline([[-30, 0.5], [-27, 8], [-24, 14.5]], 6),
  spline([[-24, 23.5], [-19, 26], [-10, 26]], 6),
];
export const ROADS = [...roadBlue, ...roadBlue.map((r) => r.map(([x, z]) => [-x, z]))];
export const ISLAND_ROAD = [[-5, 0], [5, 0]];

const ORE_BLUE = [[-17, -34], [-15, 34], [-34, -30]];
export const ORES = [...ORE_BLUE, ...ORE_BLUE.map(([x, z]) => [-x, z])].map(([x, z], i) => ({ id: i, x, z }));

const CAKE_BLUE = [[-33, -10], [-33, 10], [-17, -6], [-12, -36], [-12, 36], [-38, -30]];
export const CAKES = [...CAKE_BLUE, ...CAKE_BLUE.map(([x, z]) => [-x, z]), [0, -3.6], [0, 3.6]].map(([x, z], i) => ({ id: i, x, z }));

export function roadSDF(x, z) {
  let d = Infinity;
  for (const r of ROADS) {
    if (r[0][0] * x < 0 && Math.abs(x) > 2) {
      // roads only live on their own half
    }
    d = Math.min(d, sdPolyline(x, z, r));
  }
  d = Math.min(d, sdPolyline(x, z, ISLAND_ROAD));
  return d - 1.75;
}

// Forest placement: choppable round trees and decorative pines, dirt holes, rocks.
function scatter(seed, n, region, minDist, avoid) {
  const r = rng(seed), out = [];
  let tries = 0;
  while (out.length < n && tries++ < n * 60) {
    const x = r.range(region[0], region[1]), z = r.range(region[2], region[3]);
    if (avoid(x, z)) continue;
    if (out.some((p) => (p[0] - x) ** 2 + (p[1] - z) ** 2 < minDist * minDist)) continue;
    out.push([x, z]);
  }
  return out;
}
function blockedForScenery(x, z, margin = 2.4) {
  if (landSDF(x, z) > -margin) return true;
  if (roadSDF(x, z) < 1.2) return true;
  if (Math.abs(x) > 41 && Math.abs(z) < 28) return true; // castle and moat
  if (OUTPOSTS.some((o) => (o.x - x) ** 2 + (o.z - z) ** 2 < 36)) return true;
  if (ORES.some((o) => (o.x - x) ** 2 + (o.z - z) ** 2 < 16)) return true;
  if (CAKES.some((o) => (o.x - x) ** 2 + (o.z - z) ** 2 < 6)) return true;
  if (BRIDGES.some((b) => Math.abs(z - b.z) < b.half + 2.5 && x > Math.min(b.x0, b.x1) - 3 && x < Math.max(b.x0, b.x1) + 3)) return true;
  return false;
}
function mirror(list) {
  return [...list, ...list.map(([x, z]) => [-x, z])];
}
const treesBlue = [
  ...scatter(11, 9, [-50, -12, -39, -28], 4.2, (x, z) => blockedForScenery(x, z)),
  ...scatter(12, 9, [-50, -12, 28, 39], 4.2, (x, z) => blockedForScenery(x, z)),
  ...scatter(13, 4, [-40, -30, -26, -10], 4.2, (x, z) => blockedForScenery(x, z)),
  ...scatter(14, 4, [-40, -30, 10, 26], 4.2, (x, z) => blockedForScenery(x, z)),
];
export const TREES = mirror(treesBlue).map(([x, z], i) => ({ id: i, x, z, seed: i * 7 + 3 }));
const pinesBlue = [
  ...scatter(21, 12, [-76, -40, -40, -27], 3.2, (x, z) => blockedForScenery(x, z, 1.6) || TREES.some((t) => (t.x - x) ** 2 + (t.z - z) ** 2 < 9)),
  ...scatter(22, 12, [-76, -40, 27, 40], 3.2, (x, z) => blockedForScenery(x, z, 1.6) || TREES.some((t) => (t.x - x) ** 2 + (t.z - z) ** 2 < 9)),
  ...scatter(23, 5, [-20, -9, -20, -8], 3.5, (x, z) => blockedForScenery(x, z, 1.6) || TREES.some((t) => (t.x - x) ** 2 + (t.z - z) ** 2 < 9)),
];
export const PINES = mirror(pinesBlue).map(([x, z], i) => ({ x, z, seed: i * 13 + 1 }));
const holesBlue = scatter(31, 9, [-38, -8, -36, 36], 6, (x, z) => blockedForScenery(x, z, 3) || TREES.some((t) => (t.x - x) ** 2 + (t.z - z) ** 2 < 12));
export const HOLES = mirror(holesBlue).map(([x, z], i) => ({ x, z, r: 1.1 + ((i * 37) % 10) / 10, rot: i * 1.7 }));
const rocksBlue = scatter(41, 10, [-74, -8, -38, 38], 5, (x, z) => blockedForScenery(x, z, 1.4) || TREES.some((t) => (t.x - x) ** 2 + (t.z - z) ** 2 < 9) || HOLES.some((h) => (h.x - x) ** 2 + (h.z - z) ** 2 < 9));
export const ROCKS = mirror(rocksBlue).map(([x, z], i) => ({ x, z, s: 0.7 + ((i * 53) % 10) / 14, seed: i }));

export function dirtSDF(x, z) {
  let d = Infinity;
  for (const h of HOLES) {
    const dx = x - h.x, dz = z - h.z;
    const a = Math.atan2(dz, dx);
    const wob = Math.sin(a * 3 + h.rot) * 0.35 + Math.sin(a * 5 - h.rot) * 0.2;
    d = Math.min(d, Math.hypot(dx * 0.8, dz * 1.15) - h.r * (1 + wob * 0.3));
  }
  return d;
}

// ------------------------------------------------------------- heights
export function onBridge(x, z) {
  for (const b of BRIDGES) {
    if (Math.abs(z - b.z) <= b.half && x >= Math.min(b.x0, b.x1) - 0.4 && x <= Math.max(b.x0, b.x1) + 0.4) return b;
  }
  for (const c of CASTLES) {
    const d = c.drawbridge;
    if (Math.abs(z - d.z) <= d.half && x >= Math.min(d.x0, d.x1) - 0.4 && x <= Math.max(d.x0, d.x1) + 0.4) return d;
  }
  return null;
}
export function bridgeHeight(b, x) {
  // gentle arch on the river bridges, flat drawbridge
  const lo = Math.min(b.x0, b.x1), hi = Math.max(b.x0, b.x1);
  const t = clamp((x - lo) / (hi - lo), 0, 1);
  return b.arch === false ? 0.05 : 0.08 + Math.sin(t * Math.PI) * 0.45;
}
for (const c of CASTLES) c.drawbridge.arch = false;

// Ground height under a point, plus a surface kind.
export function surfaceAt(x, z) {
  if (highlandSDF(x, z) < 0.4) return { y: MAP.highY, kind: 'void' };
  const b = onBridge(x, z);
  if (b) return { y: bridgeHeight(b, x), kind: 'bridge' };
  if (Math.abs(x) > 50) {
    const st = stairT(x, z);
    if (st >= 0) return { y: lerp(0, MAP.terraceY, st), kind: 'stairs' };
    if (terraceSDF(x, z) < 0) return { y: MAP.terraceY, kind: 'terrace' };
  }
  const land = landSDF(x, z);
  if (land < 0) return { y: 0, kind: 'ground' };
  if (waterSDF(x, z) < 0.6 && islandSDF(x, z) < -0.5) return { y: MAP.waterY, kind: 'water' };
  return { y: -40, kind: 'void' };
}
export const heightAt = (x, z) => surfaceAt(x, z).y;

export const smoothBand = smoothstep;
