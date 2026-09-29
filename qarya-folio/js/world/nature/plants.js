import * as THREE from 'three';
import { Builder } from '../../core/builder.js';
import { addSway, rng } from './util.js';

// النباتات: geometry factories. Every function returns one merged,
// vertex-coloured BufferGeometry (origin at the base) with a `sway`
// attribute for the wind shader.

const UP = new THREE.Vector3(0, 1, 0);
const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), v4 = new THREE.Vector3(), s4 = new THREE.Vector3();

// A drooping palm frond along +X: a spine with a V-folded, serrated blade.
function frondGeometry(L, lift, droop, W, segs = 8) {
  const pos = [];
  const spine = (u) => [L * u, L * (lift * u - droop * u * u), 0];
  const width = (u) => W * Math.pow(Math.sin(Math.PI * Math.min(1, u * 0.95 + 0.06)), 0.75);
  const pts = [];
  for (let i = 0; i <= segs; i++) {
    const u = i / segs;
    const c = spine(u);
    const w = width(u) * (i % 2 ? 1 : 0.62);
    const fold = w * 0.42, sweep = w * 0.45;
    pts.push({ c, l: [c[0] + sweep, c[1] - fold, w], r: [c[0] + sweep, c[1] - fold, -w] });
  }
  for (let i = 0; i < segs; i++) {
    const a = pts[i], b = pts[i + 1];
    pos.push(...a.c, ...b.c, ...a.l, ...a.l, ...b.c, ...b.l);
    pos.push(...a.c, ...a.r, ...b.c, ...a.r, ...b.r, ...b.c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

function between(b, p0, p1, r0, r1, color, sides = 7) {
  const dir = v4.copy(p1).sub(p0);
  const len = dir.length();
  dir.normalize();
  q4.setFromUnitVectors(UP, dir);
  const mid = p0.clone().add(p1).multiplyScalar(0.5);
  m4.compose(mid, q4, s4.set(1, 1, 1));
  b.add(new THREE.CylinderGeometry(r1, r0, len, sides), color, { matrix: m4.clone() });
}

// Date palm. variant 0..2 changes lean, height and crown.
export function palmGeometry(P, variant) {
  const rand = rng(1000 + variant * 31);
  const b = new Builder();
  const H = [6.6, 5.4, 7.6][variant];
  const lean = [1.0, 1.7, 0.55][variant];
  const trunkA = new THREE.Color(P.palmTrunk), trunkB = new THREE.Color('#9d6c42'), ring = new THREE.Color('#6b4327');
  const point = (s) => new THREE.Vector3(lean * H * 0.16 * Math.pow(s, 1.7) + Math.sin(s * Math.PI) * 0.12 * (variant - 1), H * s, 0);
  const N = 9;
  b.cylinder(0.3, 0.52, 0.5, ring, { position: [0, 0.15, 0] }, 7);
  for (let i = 0; i < N; i++) {
    const s0 = i / N, s1 = (i + 1) / N;
    const p0 = point(s0), p1 = point(s1);
    const r0 = 0.34 - 0.13 * s0, r1 = 0.34 - 0.13 * s1;
    between(b, p0, p1, r0, r1 * 1.05, i % 2 ? trunkA : trunkB);
    // The knobbly ring left by each old frond.
    between(b, p0, p0.clone().lerp(p1, 0.18), r0 * 1.22, r0 * 1.12, ring);
  }
  const top = point(1);
  b.sphere(0.36, P.palmLeafDark, { position: [top.x, top.y, top.z], scale: [1, 0.8, 1] }, 0);
  for (let k = 0; k < 3; k++) {
    b.add(new THREE.ConeGeometry(0.08, 0.9, 4), P.palmLeaf, { position: [top.x + (k - 1) * 0.1, top.y + 0.5, (k % 2) * 0.1 - 0.05], rotation: [(k - 1) * 0.25, 0, (k - 1) * 0.2] });
  }

  // Fronds: a drooping lower tier and a few younger upright ones.
  const greens = [P.palmLeaf, P.palmLeafDark, '#3f7534', '#5a9a42'];
  const tiers = [
    { n: 8 + variant, lift: 0.5, droop: 1.15, L: 3.3, W: 0.5, y: 0 },
    { n: 4, lift: 1.05, droop: 1.15, L: 2.5, W: 0.42, y: 0.15 },
  ];
  for (const tier of tiers) {
    for (let k = 0; k < tier.n; k++) {
      const yaw = (k / tier.n) * Math.PI * 2 + rand() * 0.4 + (tier.y ? 0.4 : 0);
      const L = tier.L * (0.85 + rand() * 0.3);
      const g = frondGeometry(L, tier.lift + (rand() - 0.5) * 0.2, tier.droop + (rand() - 0.5) * 0.3, tier.W);
      const old = !tier.y && rand() < 0.18;
      const col = old ? '#9a9a44' : greens[(k + (tier.y ? 1 : 0)) % greens.length];
      m4.compose(v4.set(top.x, top.y + tier.y, top.z), q4.setFromEuler(new THREE.Euler(0, yaw, (rand() - 0.5) * 0.15)), s4.set(1, 1, 1));
      b.add(g, col, { matrix: m4.clone() });
    }
  }

  // Date clusters hanging under the crown.
  const dates = [P.date, '#b5541f', '#a33a1f'];
  const nClusters = variant === 1 ? 2 : 3;
  for (let c = 0; c < nClusters; c++) {
    const a = (c / nClusters) * Math.PI * 2 + 0.6;
    const ox = Math.cos(a) * 0.45, oz = Math.sin(a) * 0.45;
    const base = new THREE.Vector3(top.x + ox * 0.5, top.y - 0.15, top.z + oz * 0.5);
    const tip = new THREE.Vector3(top.x + ox * 1.25, top.y - 0.75, top.z + oz * 1.25);
    between(b, base, tip, 0.035, 0.025, '#c8902e', 4);
    for (let d = 0; d < 9; d++) {
      const f = 0.35 + rand() * 0.65;
      b.sphere(0.085 + rand() * 0.03, dates[d % 3], {
        position: [base.x + (tip.x - base.x) * f + (rand() - 0.5) * 0.22, base.y + (tip.y - base.y) * f - 0.1 - rand() * 0.12, base.z + (tip.z - base.z) * f + (rand() - 0.5) * 0.22],
        scale: [1, 1.25, 1],
      }, 0);
    }
  }

  const geo = b.build().geometry;
  return {
    height: H,
    top,
    geometry: addSway(geo, (x, y, z) => {
      const s = Math.min(1, Math.max(0, y / H));
      const hd = Math.hypot(x - top.x, z - top.z);
      return 0.45 * s * s + (y > H * 0.8 ? 0.28 * Math.max(0, hd - 0.4) : 0);
    }),
  };
}

// Round desert shrub: a clump of faceted balls with twiggy base.
export function shrubGeometry(P, variant) {
  const rand = rng(200 + variant);
  const b = new Builder();
  const cols = variant === 0 ? [P.shrub, '#6c8a3a', '#93a852'] : ['#a3a05a', '#8d8a48', '#b8a867'];
  for (let i = 0; i < 3; i++) b.cylinder(0.03, 0.05, 0.5, '#7a5a3a', { position: [(rand() - 0.5) * 0.4, 0.2, (rand() - 0.5) * 0.4], rotation: [(rand() - 0.5) * 0.8, 0, (rand() - 0.5) * 0.8] }, 4);
  const n = 4 + Math.floor(rand() * 2);
  for (let i = 0; i < n; i++) {
    const a = rand() * Math.PI * 2, r = i ? 0.3 + rand() * 0.25 : 0;
    const s = i ? 0.3 + rand() * 0.18 : 0.46;
    b.sphere(s, cols[i % 3], { position: [Math.cos(a) * r, 0.3 + s * 0.6 + (i ? 0 : 0.1), Math.sin(a) * r], scale: [1, 0.8, 1] }, 0);
  }
  return addSway(b.build().geometry, (x, y) => Math.max(0, y) * 0.35);
}

// Dry grass tuft: thin blades leaning out. green=true for oasis grass.
export function grassGeometry(P, green, flowers = false) {
  const rand = rng(green ? 301 : 300);
  const b = new Builder();
  const cols = green ? ['#6f9e3f', '#86b34a', '#5b8a36'] : ['#d9b877', '#c29a55', '#e3c68c'];
  const n = green ? 9 : 8;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rand() * 0.5;
    const h = (green ? 0.55 : 0.6) + rand() * 0.45;
    const lean = 0.25 + rand() * 0.35;
    b.add(new THREE.ConeGeometry(0.045, h, 3), cols[i % 3], {
      position: [Math.cos(a) * 0.1 + Math.cos(a) * Math.sin(lean) * h * 0.5, Math.cos(lean) * h * 0.5, Math.sin(a) * 0.1 + Math.sin(a) * Math.sin(lean) * h * 0.5],
      rotation: [Math.sin(a) * lean, 0, -Math.cos(a) * lean],
    });
  }
  if (flowers) {
    const fc = ['#f6f0e4', '#e8742a', '#f0b12e', '#d95a7a'];
    for (let i = 0; i < 4; i++) {
      const a = rand() * Math.PI * 2, r = 0.15 + rand() * 0.2, h = 0.45 + rand() * 0.3;
      b.cylinder(0.012, 0.012, h, '#5b8a36', { position: [Math.cos(a) * r, h / 2, Math.sin(a) * r] }, 3);
      b.sphere(0.07, fc[i % fc.length], { position: [Math.cos(a) * r, h + 0.02, Math.sin(a) * r], scale: [1, 0.6, 1] }, 0);
    }
  }
  return addSway(b.build().geometry, (x, y) => Math.max(0, y) * 0.4);
}

// Columnar desert plant (euphorbia-like) with a few upturned arms.
export function cactusGeometry(P, variant) {
  const rand = rng(400 + variant);
  const b = new Builder();
  const g1 = '#6f8f4a', g2 = '#5b7a3c', tip = '#e8c35a';
  const H = variant ? 1.6 : 2.3;
  b.cylinder(0.2, 0.24, H, g1, { position: [0, H / 2, 0] }, 6);
  b.cylinder(0.02, 0.2, 0.22, g2, { position: [0, H + 0.11, 0] }, 6);
  const arms = variant ? 2 : 3;
  for (let i = 0; i < arms; i++) {
    const a = (i / arms) * Math.PI * 2 + rand();
    const y = H * (0.35 + rand() * 0.3), out = 0.5 + rand() * 0.2, up = 0.5 + rand() * 0.6;
    const dx = Math.cos(a), dz = Math.sin(a);
    b.cylinder(0.12, 0.13, out, g2, { position: [dx * out / 2, y, dz * out / 2], rotation: [dz * Math.PI / 2, 0, -dx * Math.PI / 2] }, 6);
    b.cylinder(0.13, 0.13, up, g1, { position: [dx * out, y + up / 2 - 0.06, dz * out] }, 6);
    b.cylinder(0.02, 0.13, 0.14, g2, { position: [dx * out, y + up + 0.0, dz * out] }, 6);
    b.sphere(0.06, tip, { position: [dx * out, y + up + 0.1, dz * out] }, 0);
  }
  b.sphere(0.07, tip, { position: [0, H + 0.25, 0] }, 0);
  return addSway(b.build().geometry, () => 0);
}

// Agave-like rosette of stiff spiky leaves.
export function agaveGeometry(P) {
  const rand = rng(500);
  const b = new Builder();
  const cols = ['#7a9a6a', '#6a8a5e', '#8fae78'];
  const n = 11;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rand() * 0.3;
    const tilt = 0.5 + rand() * 0.6, h = 0.7 + rand() * 0.4;
    b.add(new THREE.ConeGeometry(0.1, h, 3), cols[i % 3], {
      position: [Math.cos(a) * Math.sin(tilt) * h * 0.5, Math.cos(tilt) * h * 0.5, Math.sin(a) * Math.sin(tilt) * h * 0.5],
      rotation: [Math.sin(a) * tilt, 0, -Math.cos(a) * tilt], scale: [1, 1, 0.45],
    });
  }
  b.add(new THREE.ConeGeometry(0.03, 1.4, 4), '#a8703f', { position: [0, 0.7, 0] });
  b.sphere(0.1, '#f0b12e', { position: [0, 1.42, 0] }, 0);
  return addSway(b.build().geometry, (x, y) => Math.max(0, y) * 0.05);
}

// Reed clump for the shore: tall blades and a few bulrush heads.
export function reedGeometry(P) {
  const rand = rng(600);
  const b = new Builder();
  const cols = ['#6f9a3a', '#86a84a', '#5c7f34', '#a3a655'];
  for (let i = 0; i < 12; i++) {
    const a = rand() * Math.PI * 2, r = rand() * 0.35;
    const h = 1.2 + rand() * 1.1, lean = rand() * 0.25;
    b.add(new THREE.ConeGeometry(0.04, h, 3), cols[i % 4], {
      position: [Math.cos(a) * r, h / 2, Math.sin(a) * r], rotation: [Math.sin(a) * lean, 0, -Math.cos(a) * lean],
    });
  }
  for (let i = 0; i < 4; i++) {
    const a = rand() * Math.PI * 2, r = rand() * 0.25, h = 1.3 + rand() * 0.7;
    b.cylinder(0.015, 0.015, h, '#7b8f45', { position: [Math.cos(a) * r, h / 2, Math.sin(a) * r] }, 3);
    b.cylinder(0.06, 0.06, 0.3, '#6b3f24', { position: [Math.cos(a) * r, h + 0.1, Math.sin(a) * r] }, 5);
  }
  return addSway(b.build().geometry, (x, y) => Math.max(0, y) * 0.3);
}

// Lily pad (with an optional flower), flat at y = 0.
export function lilyGeometry(P, flower) {
  const b = new Builder();
  b.add(new THREE.CylinderGeometry(0.55, 0.55, 0.04, 9, 1, false, 0.35, Math.PI * 2 - 0.5), '#5f9a45', { position: [0, 0.02, 0] });
  if (flower) {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      b.add(new THREE.ConeGeometry(0.07, 0.24, 3), i % 2 ? '#fbeaf0' : '#f2b8c9', { position: [Math.cos(a) * 0.08, 0.12, Math.sin(a) * 0.08], rotation: [Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6] });
    }
    b.sphere(0.05, P.saffron, { position: [0, 0.12, 0] }, 0);
  }
  return addSway(b.build().geometry, () => 0);
}
