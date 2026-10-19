// Castle and battlefield architecture: walls, towers, gates, keep, throne, prison cage,
// hat machines, stockpile, catapult, bridges, outposts and torches. Static pieces are
// merged into a few batches; anything that changes during play is returned as a model.
import * as THREE from 'three';
import { m, toon, basic, ink, shadowed, Batcher } from './toon.js';
import { brickMaterial } from './terrain.js';
import { planksTex, stainedGlassTex, logEndTex, flameTex, crestTex } from './tex.js';
import { CASTLES, BRIDGES, OUTPOSTS, MAP, bridgeHeight, heightAt } from './world.js';
import { TAU, rng } from './util.js';

export const TEAM_COLORS = [
  { main: '#3f86e8', dark: '#2a5aa8', light: '#8cc0ff', name: 'Blue', css: '#4f93e6' },
  { main: '#e8452a', dark: '#a52a18', light: '#ff9a7a', name: 'Red', css: '#ee6b40' },
];
export const NEUTRAL = { main: '#d8d8d0', dark: '#9a9a90', light: '#ffffff' };

const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const CY = (rt, rb, h, s = 12, open = false) => new THREE.CylinderGeometry(rt, rb, h, s, 1, open);
const STONE = '#c9cfd8', STONE_D = '#9aa4b2', WOOD = '#c8873f', WOOD_D = '#8a5326', GOLD = '#f2c23a', IRON = '#5b5f68';

let brickP, brickU, brickBlue;
function mats() {
  if (!brickP) {
    brickP = brickMaterial();
    brickU = brickMaterial({ attrU: true });
    brickBlue = brickMaterial({ c1: '#b6c3d8', c2: '#9eacc4', c3: '#dfe7f2', mortar: '#5d6a82' });
  }
}
// cylinder with an arc-length attribute so running-bond bricks wrap cleanly
function brickCylinder(rt, rb, h, seg = 14) {
  const g = CY(rt, rb, h, seg, true);
  const p = g.attributes.position;
  const u = new Float32Array(p.count);
  for (let i = 0; i < p.count; i++) u[i] = (Math.atan2(p.getZ(i), p.getX(i)) + Math.PI) * ((rt + rb) / 2);
  g.setAttribute('aU', new THREE.BufferAttribute(u, 1));
  return g;
}

// ---------------------------------------------------------------- walls & towers
function wallRun(group, pts, height = 3.6, thick = 1.9) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
    const L = Math.hypot(bx - ax, bz - az);
    const ang = Math.atan2(bz - az, bx - ax);
    const seg = new THREE.Group();
    seg.position.set((ax + bx) / 2, 0, (az + bz) / 2);
    seg.rotation.y = -ang;
    const body = new THREE.Mesh(B(L + 0.4, height, thick), brickP);
    body.position.y = height / 2;
    seg.add(body);
    // walkway cap and merlons along both edges
    seg.add(m(B(L + 0.4, 0.18, thick + 0.16), '#e8c48a', 0, height + 0.05, 0));
    const n = Math.max(1, Math.floor(L / 1.45));
    for (let k = 0; k < n; k++) {
      const x = -L / 2 + (k + 0.5) * (L / n);
      for (const s of [-1, 1]) seg.add(m(B(0.8, 0.75, 0.5), '#e3b877', x, height + 0.5, s * (thick / 2 - 0.2)));
    }
    group.add(seg);
  }
}

function tower(group, x, z, team, opts = {}) {
  const r = opts.r ?? 2.15, h = opts.h ?? 5.0;
  const t = new THREE.Group();
  t.position.set(x, 0, z);
  const body = new THREE.Mesh(brickCylinder(r * 0.95, r, h, 16), brickU);
  body.position.y = h / 2;
  t.add(body);
  t.add(m(CY(r + 0.25, r + 0.25, 0.3, 16), '#e8c48a', 0, h + 0.1, 0));
  // band of team colour
  t.add(m(CY(r * 0.97, r * 0.97, 0.3, 16), TEAM_COLORS[team].main, 0, h - 0.7, 0));
  if (opts.roof) {
    t.add(m(new THREE.ConeGeometry(r + 0.55, 3.4, 16), TEAM_COLORS[team].main, 0, h + 1.9, 0));
    t.add(m(CY(r + 0.6, r + 0.6, 0.22, 16), GOLD, 0, h + 0.3, 0));
    t.add(m(new THREE.SphereGeometry(0.28, 10, 8), GOLD, 0, h + 3.75, 0));
    flagPole(t, 0, h + 3.7, 0, team, 1.4);
  } else {
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * TAU;
      t.add(m(B(0.9, 0.8, 0.55), '#e3b877', Math.cos(a) * (r + 0.05), h + 0.65, Math.sin(a) * (r + 0.05), { ry: -a + Math.PI / 2 }));
    }
  }
  // arrow slits
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * TAU + 0.5;
    t.add(m(B(0.18, 0.8, 0.12), '#3a2412', Math.cos(a) * r * 0.97, h * 0.55, Math.sin(a) * r * 0.97, { ry: -a + Math.PI / 2, noInk: true }));
  }
  group.add(t);
  return t;
}

const flags = [];
export function flagPole(parent, x, y, z, team, h = 1.6) {
  parent.add(m(CY(0.05, 0.05, h, 6), WOOD_D, x, y + h / 2, z));
  const g = new THREE.PlaneGeometry(1.1, 0.7, 8, 2);
  g.translate(0.55, 0, 0);
  const mat = toon(TEAM_COLORS[team].main, { side: THREE.DoubleSide });
  const f = new THREE.Mesh(g, mat);
  f.position.set(x + 0.05, y + h - 0.4, z);
  f.userData.flag = { base: g.attributes.position.array.slice(), phase: Math.random() * 6 };
  f.userData.noBatch = true;
  parent.add(f);
  flags.push(f);
  return f;
}
export function updateFlags(t) {
  for (const f of flags) {
    const p = f.geometry.attributes.position, b = f.userData.flag.base;
    for (let i = 0; i < p.count; i++) {
      const x = b[i * 3];
      p.setZ(i, Math.sin(t * 5 + x * 4 + f.userData.flag.phase) * 0.12 * x);
      p.setY(i, b[i * 3 + 1] - x * 0.08);
    }
    p.needsUpdate = true;
  }
}

// ---------------------------------------------------------------- gate
export function gateModel(team) {
  const g = new THREE.Group();
  const col = TEAM_COLORS[team];
  const leaves = [];
  for (const s of [-1, 1]) {
    const hinge = new THREE.Group();
    hinge.position.set(0, 0, s * 2.6);
    const leaf = new THREE.Group();
    const plank = m(B(0.32, 3.0, 2.6), col.main, 0, 1.5, -s * 1.3, { map: planksTex() });
    leaf.add(plank);
    for (const y of [0.55, 2.45]) leaf.add(m(B(0.4, 0.22, 2.5), IRON, 0, y, -s * 1.3));
    for (const y of [0.55, 2.45]) for (const zz of [0.4, 1.3, 2.2]) leaf.add(m(new THREE.SphereGeometry(0.07, 6, 4), '#c8ccd4', 0.2, y, -s * zz, { noInk: true }));
    // diagonal brace
    leaf.add(m(B(0.36, 0.2, 2.8), col.dark, 0.02, 1.5, -s * 1.3, { rx: s * 0.62 }));
    hinge.add(leaf);
    g.add(hinge);
    leaves.push(hinge);
  }
  ink(g, 0.04);
  shadowed(g);
  g.userData.leaves = leaves;
  return g;
}

// ---------------------------------------------------------------- keep & throne
function keep(group, c) {
  const k = new THREE.Group();
  k.position.set(c.keep.x, MAP.terraceY, c.keep.z);
  k.rotation.y = c.s < 0 ? 0 : Math.PI; // facade faces the centre (+x for blue)
  const W = 6.5, D = 9.2, H = 7.2;
  const body = new THREE.Mesh(B(W, H, D), brickP);
  body.position.y = H / 2;
  k.add(body);
  k.add(m(B(W + 0.3, 0.3, D + 0.3), '#e8c48a', 0, H + 0.1, 0));
  for (let i = 0; i < 6; i++) for (const s of [-1, 1]) k.add(m(B(0.8, 0.8, 0.6), '#e3b877', -W / 2 + 0.5 + i * (W - 1) / 5, H + 0.6, s * (D / 2 - 0.3)));
  for (let i = 0; i < 7; i++) for (const s of [-1, 1]) k.add(m(B(0.6, 0.8, 0.8), '#e3b877', s * (W / 2 - 0.3), H + 0.6, -D / 2 + 0.5 + i * (D - 1) / 6));
  // facade: arched door and stained glass windows
  k.add(m(B(0.2, 3.1, 2.4), '#2c180c', W / 2 + 0.02, 1.55, 0, { noInk: true }));
  k.add(m(CY(1.2, 1.2, 0.2, 16, false), '#2c180c', W / 2 + 0.02, 3.1, 0, { rz: Math.PI / 2, noInk: true }));
  k.add(m(B(0.35, 0.4, 3.0), '#e8c48a', W / 2 + 0.1, 4.5, 0));
  const glass = stainedGlassTex();
  for (const z of [-3.0, 3.0]) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 3.0), basic('#ffffff', { map: glass }));
    w.position.set(W / 2 + 0.03, 3.6, z);
    w.rotation.y = Math.PI / 2;
    w.userData.noInk = true;
    k.add(w);
    k.add(m(B(0.25, 0.25, 1.8), TEAM_COLORS[c.team].main, W / 2 + 0.1, 2.0, z));
  }
  // banners hanging on the facade
  for (const z of [-1.7, 1.7]) {
    const b = m(B(0.08, 2.4, 0.9), TEAM_COLORS[c.team].main, W / 2 + 0.1, 4.6, z);
    k.add(b);
    k.add(m(B(0.1, 0.2, 1.0), GOLD, W / 2 + 0.12, 5.8, z));
  }
  // central tower with roof
  const tw = new THREE.Mesh(brickCylinder(2.0, 2.2, 4.5, 16), brickU);
  tw.position.set(-0.6, H + 2.25, 0);
  k.add(tw);
  k.add(m(new THREE.ConeGeometry(2.8, 4.0, 16), TEAM_COLORS[c.team].main, -0.6, H + 6.5, 0));
  k.add(m(CY(2.85, 2.85, 0.25, 16), GOLD, -0.6, H + 4.55, 0));
  const tg = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.8), basic('#ffffff', { map: glass }));
  tg.position.set(-0.6 + 2.05, H + 2.4, 0);
  tg.rotation.y = Math.PI / 2;
  k.add(tg);
  flagPole(k, -0.6, H + 8.4, 0, c.team, 1.6);
  group.add(k);
}

export function throneModel(team) {
  const g = new THREE.Group();
  const col = TEAM_COLORS[team];
  g.add(m(CY(1.45, 1.6, 0.35, 18), '#e8c48a', 0, 0.17, 0));
  g.add(m(CY(1.15, 1.25, 0.25, 18), col.main, 0, 0.45, 0));
  // chair
  g.add(m(B(1.3, 0.5, 1.2), GOLD, 0, 0.85, 0));
  g.add(m(B(1.1, 0.25, 1.0), col.main, 0, 1.2, 0));
  g.add(m(B(0.3, 2.2, 1.3), GOLD, -0.6, 1.9, 0));
  g.add(m(B(0.16, 1.7, 1.0), col.main, -0.42, 1.95, 0));
  for (const s of [-1, 1]) g.add(m(new THREE.SphereGeometry(0.17, 10, 8), GOLD, -0.6, 3.05, s * 0.55));
  g.add(m(new THREE.ConeGeometry(0.2, 0.4, 5), GOLD, -0.6, 3.2, 0));
  for (const s of [-1, 1]) g.add(m(B(1.1, 0.18, 0.18), GOLD, 0, 1.35, s * 0.55));
  ink(g, 0.035);
  shadowed(g);
  return g;
}

// ---------------------------------------------------------------- prison cage
export function cageModel() {
  const g = new THREE.Group();
  g.add(m(CY(1.85, 2.0, 0.4, 20), '#cdbf9e', 0, 0.2, 0));
  g.add(m(CY(1.6, 1.6, 0.12, 20), '#8a8f99', 0, 0.45, 0));
  const cage = new THREE.Group();
  cage.position.y = 0.45;
  const bars = 16, R = 1.45, H = 2.6;
  for (let i = 0; i < bars; i++) {
    const a = (i / bars) * TAU;
    if (i >= 0 && i <= 1) continue; // door gap (door added separately)
    cage.add(m(CY(0.075, 0.075, H, 6), '#7f858f', Math.cos(a) * R, H / 2, Math.sin(a) * R, { ink: 0.025 }));
  }
  for (const y of [0.1, 1.2, H]) {
    const ring = m(new THREE.TorusGeometry(R, 0.09, 6, 28), '#6b717b', 0, y, 0, { rx: Math.PI / 2, ink: 0.025 });
    cage.add(ring);
  }
  // dome ribs
  for (let i = 0; i < 6; i++) {
    const rib = m(new THREE.TorusGeometry(R, 0.08, 6, 20, Math.PI), '#7f858f', 0, H, 0, { ry: (i / 6) * Math.PI, ink: 0.025 });
    cage.add(rib);
  }
  cage.add(m(new THREE.SphereGeometry(0.3, 10, 8), '#6b717b', 0, H + R, 0));
  // chain up to the gallows beam
  for (let i = 0; i < 6; i++) cage.add(m(new THREE.TorusGeometry(0.14, 0.045, 5, 10), '#6b717b', 0, H + R + 0.3 + i * 0.32, 0, { ry: i % 2 ? Math.PI / 2 : 0, noInk: true }));
  g.add(cage);
  // door (two bars + frame) on a hinge
  const door = new THREE.Group();
  const a0 = 0, a1 = (2 / bars) * TAU;
  door.position.set(Math.cos(a0) * R, 0.45, Math.sin(a0) * R);
  const dx = Math.cos(a1) * R - Math.cos(a0) * R, dz = Math.sin(a1) * R - Math.sin(a0) * R;
  const len = Math.hypot(dx, dz);
  const dInner = new THREE.Group();
  dInner.rotation.y = -Math.atan2(dz, dx);
  for (const t of [0.2, 0.5, 0.8]) dInner.add(m(CY(0.075, 0.075, H, 6), '#7f858f', t * len, H / 2, 0, { ink: 0.025 }));
  for (const y of [0.15, H - 0.1]) dInner.add(m(B(len, 0.12, 0.12), '#6b717b', len / 2, y, 0));
  door.add(dInner);
  g.add(door);
  // gallows post and beam
  g.add(m(B(0.4, 7.3, 0.4), WOOD_D, -2.2, 3.65, 0));
  g.add(m(B(2.7, 0.35, 0.4), WOOD, -1.0, 7.0, 0));
  g.add(m(B(0.3, 1.2, 0.3), WOOD, -1.75, 6.4, 0, { rz: -0.8 }));
  ink(g, 0.035);
  shadowed(g);
  g.userData.door = door;
  return g;
}

// ---------------------------------------------------------------- hat machines
const ICON = {
  warrior(g) {
    g.add(m(B(0.12, 0.8, 0.05), '#d8dde6', 0, 0.2, 0));
    g.add(m(B(0.45, 0.1, 0.1), GOLD, 0, -0.2, 0));
    g.add(m(B(0.09, 0.25, 0.09), WOOD_D, 0, -0.35, 0));
  },
  ranger(g) {
    g.add(m(new THREE.TorusGeometry(0.4, 0.05, 5, 14, Math.PI), WOOD, 0, 0, 0, { rz: -Math.PI / 2 }));
    g.add(m(B(0.02, 0.8, 0.02), '#ffffff', 0, 0, 0, { noInk: true }));
    g.add(m(B(0.75, 0.05, 0.05), WOOD_D, 0.05, 0, 0));
  },
  mage(g) {
    g.add(m(B(0.08, 0.9, 0.08), WOOD_D, 0, 0, 0, { rz: 0.2 }));
    g.add(m(new THREE.SphereGeometry(0.17, 8, 6), '#ffb43a', -0.09, 0.48, 0, { emissive: '#ff7a1a' }));
  },
  priest(g) {
    g.add(m(B(0.18, 0.8, 0.12), '#ffffff', 0, 0, 0));
    g.add(m(B(0.55, 0.18, 0.12), '#ffffff', 0, 0.12, 0));
  },
  worker(g) {
    g.add(m(B(0.08, 0.85, 0.08), WOOD, 0, 0, 0));
    g.add(m(B(0.38, 0.28, 0.06), '#c8ccd4', 0.15, 0.3, 0));
  },
};
export function classIcon(cls) {
  const g = new THREE.Group();
  ICON[cls](g);
  return g;
}
export function hatMachineModel(team, cls) {
  const g = new THREE.Group();
  const col = TEAM_COLORS[team];
  g.add(m(CY(1.35, 1.45, 0.4, 16), '#cdbf9e', 0, 0.2, 0));
  const dome = m(new THREE.SphereGeometry(1.15, 16, 10, 0, TAU, 0, Math.PI / 2), col.main, 0, 0.4, 0, { s: [1, 1.05, 1] });
  g.add(dome);
  g.add(m(new THREE.TorusGeometry(1.15, 0.12, 6, 24), '#bfc4cc', 0, 0.5, 0, { rx: Math.PI / 2 }));
  // riveted plates
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + 0.3;
    g.add(m(new THREE.SphereGeometry(0.09, 6, 4), '#d8dce4', Math.cos(a) * 1.0, 0.95, Math.sin(a) * 1.0, { noInk: true }));
  }
  // front chute and the plate where the hat appears (front = +x)
  g.add(m(B(0.9, 0.7, 1.0), '#8a8f99', 1.05, 0.75, 0));
  g.add(m(CY(0.38, 0.38, 0.3, 12), '#2a2a30', 1.52, 0.8, 0, { rz: Math.PI / 2, noInk: true }));
  g.add(m(CY(0.62, 0.7, 0.18, 14), '#c9cfd8', 2.0, 0.09, 0));
  // chimney and cogs
  g.add(m(CY(0.22, 0.26, 1.1, 10), '#7f858f', -0.45, 1.6, 0.3));
  g.add(m(CY(0.3, 0.3, 0.12, 10), '#5b5f68', -0.45, 2.15, 0.3));
  const cog = new THREE.Group();
  cog.position.set(-0.2, 1.05, -1.02);
  cog.add(m(CY(0.42, 0.42, 0.16, 12), GOLD, 0, 0, 0, { rx: Math.PI / 2 }));
  for (let i = 0; i < 8; i++) cog.add(m(B(0.14, 0.18, 0.16), GOLD, Math.cos((i / 8) * TAU) * 0.48, Math.sin((i / 8) * TAU) * 0.48, 0, { rz: (i / 8) * TAU }));
  g.add(cog);
  // sign with the class icon
  const sign = new THREE.Group();
  sign.position.set(0, 2.6, 0);
  sign.add(m(CY(0.55, 0.55, 0.14, 18), '#f6e7c4', 0, 0, 0, { rx: Math.PI / 2 }));
  sign.add(m(new THREE.TorusGeometry(0.55, 0.07, 6, 20), col.main, 0, 0, 0));
  const icon = classIcon(cls);
  icon.position.z = 0.1;
  icon.scale.setScalar(0.85);
  sign.add(icon);
  const icon2 = classIcon(cls);
  icon2.position.z = -0.1;
  icon2.rotation.y = Math.PI;
  icon2.scale.setScalar(0.85);
  sign.add(icon2);
  g.add(m(CY(0.06, 0.06, 1.0, 6), '#5b5f68', 0, 1.9, 0));
  g.add(sign);
  // upgrade trim (hidden until upgraded)
  const trim = new THREE.Group();
  trim.add(m(new THREE.TorusGeometry(1.2, 0.1, 6, 24), GOLD, 0, 0.62, 0, { rx: Math.PI / 2 }));
  trim.add(m(new THREE.OctahedronGeometry(0.3), GOLD, 0, 1.65, 0));
  trim.visible = false;
  g.add(trim);
  ink(g, 0.035);
  shadowed(g);
  g.userData = { cog, sign, trim, plate: new THREE.Vector3(2.0, 0.2, 0) };
  return g;
}

// ---------------------------------------------------------------- stockpile & catapult
export function stockpileModel() {
  const g = new THREE.Group();
  g.add(m(B(3.4, 0.25, 2.4), WOOD_D, 0, 0.12, 0, { map: planksTex() }));
  const logs = new THREE.Group();
  const endMat = toon('#ffffff', { map: logEndTex() });
  const barkMat = toon('#9a5a2a');
  const cyl = CY(0.26, 0.26, 1.5, 10);
  const r = rng(4);
  for (let i = 0; i < 12; i++) {
    const row = Math.floor(i / 5), col = i % 5;
    const lg = new THREE.Mesh(cyl, [barkMat, endMat, endMat]);
    lg.rotation.z = Math.PI / 2;
    lg.position.set(-0.55, 0.5 + row * 0.42, -0.95 + col * 0.48 + (row % 2) * 0.24);
    lg.rotation.y = (r() - 0.5) * 0.15;
    lg.visible = false;
    logs.add(lg);
  }
  g.add(logs);
  const ingots = new THREE.Group();
  for (let i = 0; i < 9; i++) {
    const row = Math.floor(i / 3), col = i % 3;
    const ig = m(B(0.7, 0.26, 0.38), '#c9ced8', 1.0, 0.4 + row * 0.27, -0.6 + col * 0.55, { ry: row % 2 ? 0.1 : -0.05 });
    ig.visible = false;
    ingots.add(ig);
  }
  g.add(ingots);
  // little sign post with log/ore icons
  g.add(m(B(0.12, 1.6, 0.12), WOOD_D, 1.75, 0.8, 1.1));
  g.add(m(B(0.1, 0.6, 0.9), WOOD, 1.75, 1.5, 1.1, { map: planksTex() }));
  ink(g, 0.035);
  shadowed(g);
  g.userData = { logs, ingots };
  return g;
}

export function catapultModel(team) {
  const g = new THREE.Group();
  const col = TEAM_COLORS[team];
  // build site: stakes, rope and a pile of planks
  const site = new THREE.Group();
  for (const [x, z] of [[-1.6, -1.2], [1.6, -1.2], [-1.6, 1.2], [1.6, 1.2]]) site.add(m(B(0.18, 0.7, 0.18), WOOD_D, x, 0.35, z));
  for (const [x, z, w, d] of [[0, -1.2, 3.2, 0.05], [0, 1.2, 3.2, 0.05], [-1.6, 0, 0.05, 2.4], [1.6, 0, 0.05, 2.4]]) site.add(m(B(w, 0.05, d), '#e8d29a', x, 0.55, z, { noInk: true }));
  for (let i = 0; i < 4; i++) site.add(m(B(2.2, 0.14, 0.4), WOOD, -0.2 + i * 0.05, 0.08 + i * 0.14, -0.3 + i * 0.12, { ry: i * 0.25, map: planksTex() }));
  g.add(site);
  // finished catapult
  const built = new THREE.Group();
  for (const s of [-1, 1]) {
    built.add(m(B(3.4, 0.35, 0.35), WOOD, 0, 0.6, s * 0.95, { map: planksTex() }));
    for (const x of [-1.2, 1.2]) built.add(m(CY(0.5, 0.5, 0.25, 12), WOOD_D, x, 0.5, s * 1.2, { rx: Math.PI / 2 }));
    built.add(m(B(0.3, 1.8, 0.3), WOOD, 0.3, 1.4, s * 0.95, { rz: 0.15 }));
  }
  built.add(m(B(0.35, 0.35, 2.3), WOOD_D, 0.3, 2.1, 0));
  built.add(m(B(3.4, 0.25, 2.0), WOOD, 0, 0.75, 0, { map: planksTex() }));
  const arm = new THREE.Group();
  arm.position.set(0.3, 1.0, 0);
  arm.add(m(B(3.6, 0.28, 0.28), WOOD, -1.5, 0, 0));
  const bucket = m(CY(0.75, 0.5, 0.5, 12), col.main, -3.2, 0.25, 0);
  arm.add(bucket);
  arm.rotation.z = -0.22;
  built.add(arm);
  built.add(m(B(0.5, 0.5, 1.6), '#8a8f99', 1.3, 0.95, 0));
  built.visible = false;
  g.add(built);
  ink(g, 0.035);
  shadowed(g);
  g.userData = { site, built, arm };
  return g;
}

// ---------------------------------------------------------------- torches & bomb rack
export function torchModel() {
  const g = new THREE.Group();
  g.add(m(CY(0.1, 0.14, 2.0, 8), WOOD_D, 0, 1.0, 0));
  g.add(m(CY(0.32, 0.18, 0.35, 10), IRON, 0, 2.1, 0));
  const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex(), color: 0xffb030, transparent: true, depthWrite: false }));
  flame.scale.set(0.7, 0.9, 1);
  flame.position.y = 2.6;
  const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex(), color: 0xfff2a0, transparent: true, depthWrite: false }));
  core.scale.set(0.38, 0.5, 1);
  core.position.y = 2.5;
  ink(g, 0.03);
  shadowed(g);
  g.add(flame, core);
  g.userData = { flame, core, lit: true };
  return g;
}

// ---------------------------------------------------------------- bridges
function riverBridge(group, b) {
  const lo = Math.min(b.x0, b.x1), hi = Math.max(b.x0, b.x1);
  const n = Math.round((hi - lo) / 0.5);
  const tex = planksTex();
  for (let i = 0; i < n; i++) {
    const x = lo + (i + 0.5) * ((hi - lo) / n);
    const y = bridgeHeight(b, x);
    const y2 = bridgeHeight(b, x + 0.25);
    const tilt = Math.atan2(y2 - y, 0.25);
    group.add(m(B(0.48, 0.2, b.half * 2 + 0.2), i % 2 ? '#f0c869' : '#e6b856', x, y - 0.1, b.z, { rz: tilt, map: tex, ink: 0.025 }));
  }
  // beams underneath
  for (const s of [-1, 1]) for (let i = 0; i < n; i += 2) {
    const x = lo + (i + 0.5) * ((hi - lo) / n);
    group.add(m(B(1.05, 0.25, 0.3), '#b07a3a', x + 0.25, bridgeHeight(b, x) - 0.32, b.z + s * (b.half - 0.2)));
  }
  // posts and rails
  const posts = Math.max(3, Math.round((hi - lo) / 1.8) + 1);
  for (const s of [-1, 1]) {
    let prev = null;
    for (let i = 0; i < posts; i++) {
      const x = lo + (i / (posts - 1)) * (hi - lo);
      const y = bridgeHeight(b, x);
      const z = b.z + s * (b.half + 0.15);
      group.add(m(B(0.32, 1.25, 0.32), '#e2b052', x, y + 0.45, z));
      group.add(m(B(0.4, 0.14, 0.4), '#f3cf73', x, y + 1.1, z));
      if (i === 0 || i === posts - 1) group.add(m(new THREE.SphereGeometry(0.22, 8, 6), '#f3cf73', x, y + 1.3, z));
      if (prev) {
        const [px, py] = prev;
        const L = Math.hypot(x - px, y - py);
        const a = Math.atan2(y - py, x - px);
        group.add(m(B(L, 0.18, 0.2), '#f0c869', (x + px) / 2, (y + py) / 2 + 0.9, z, { rz: a }));
        group.add(m(B(L, 0.12, 0.14), '#d7a245', (x + px) / 2, (y + py) / 2 + 0.45, z, { rz: a }));
      }
      prev = [x, y];
    }
  }
  // piers into the water
  for (const x of [lo + 0.6, hi - 0.6])
    for (const s of [-1, 1]) group.add(m(CY(0.28, 0.3, 2.4, 8), '#a8743a', x, MAP.waterY - 0.4, b.z + s * (b.half - 0.3)));
}

function drawbridge(group, c) {
  const d = c.drawbridge;
  const lo = Math.min(d.x0, d.x1), hi = Math.max(d.x0, d.x1);
  const tex = planksTex();
  group.add(m(B(hi - lo, 0.28, d.half * 2), '#e8c98a', (lo + hi) / 2, -0.1, d.z, { map: tex }));
  for (const s of [-1, 1]) {
    group.add(m(B(hi - lo, 0.38, 0.32), '#c9ced8', (lo + hi) / 2, 0.08, d.z + s * (d.half + 0.05)));
    for (let x = lo + 0.4; x < hi; x += 1.0) group.add(m(new THREE.CylinderGeometry(0.11, 0.11, 0.06, 10), '#ffffff', x, 0.29, d.z + s * (d.half + 0.05), { noInk: true }));
    // chains up to the gate
    const gx = c.gate.x - c.s * 0.6;
    const ex = d.x1 + c.s * 0.0;
    const n = 9;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const x = ex + (gx - ex) * t, y = 0.3 + t * 2.8 - Math.sin(t * Math.PI) * 0.5;
      group.add(m(new THREE.TorusGeometry(0.11, 0.04, 4, 8), '#5b5f68', x, y, d.z + s * (d.half + 0.05), { ry: i % 2 ? Math.PI / 2 : 0, noInk: true }));
    }
  }
}

// ---------------------------------------------------------------- outposts
export function outpostModel() {
  const g = new THREE.Group();
  const R = 2.0, H = 4.6;
  mats();
  // stone base ring
  g.add(m(CY(R + 0.9, R + 1.0, 0.25, 20), '#aebbd0', 0, 0.12, 0));
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * TAU;
    g.add(m(B(0.8, 0.08, 0.5), i % 2 ? '#c8d3e6' : '#9fb0cc', Math.cos(a) * (R + 0.5), 0.27, Math.sin(a) * (R + 0.5), { ry: -a, noInk: true }));
  }
  const body = new THREE.Mesh(brickCylinder(R * 0.86, R, H, 18), brickBlue);
  body.position.y = H / 2 + 0.2;
  g.add(body);
  g.add(m(CY(R * 0.95, R * 0.95, 0.4, 18), '#c8d3e6', 0, H + 0.4, 0));
  const teamParts = [];
  const tmat = () => {
    const mt = new THREE.MeshToonMaterial({ color: new THREE.Color(NEUTRAL.main), gradientMap: toon('#fff').gradientMap });
    teamParts.push(mt);
    return mt;
  };
  const capMat = tmat();
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * TAU;
    const mer = m(B(0.9, 0.85, 0.6), '#c8d3e6', Math.cos(a) * R * 0.95, H + 1.0, Math.sin(a) * R * 0.95, { ry: -a + Math.PI / 2 });
    g.add(mer);
    const cap = new THREE.Mesh(B(0.95, 0.22, 0.65), capMat);
    cap.position.set(Math.cos(a) * R * 0.95, H + 1.52, Math.sin(a) * R * 0.95);
    cap.rotation.y = -a + Math.PI / 2;
    g.add(cap);
  }
  // door with white stone arch (front faces +z, toward the camera)
  g.add(m(B(1.3, 1.9, 0.3), '#d63c26', 0, 1.15, R - 0.02, { map: planksTex() }));
  g.add(m(B(0.5, 0.5, 0.1), '#3a2412', 0, 1.45, R + 0.15, { noInk: true }));
  for (let i = 0; i < 7; i++) {
    const a = Math.PI - (i / 6) * Math.PI;
    g.add(m(B(0.42, 0.42, 0.5), '#eef2f8', Math.cos(a) * 0.9, 2.05 + Math.sin(a) * 0.75, R + 0.05));
  }
  for (const s of [-1, 1]) g.add(m(B(0.42, 1.9, 0.5), '#eef2f8', s * 0.9, 1.15, R + 0.05));
  // crest shield above the door
  const crestMat = tmat();
  const crest = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.16, 6), crestMat);
  crest.rotation.x = Math.PI / 2;
  crest.position.set(0, 3.35, R * 0.92 + 0.12);
  crest.scale.set(1, 1, 1.25);
  g.add(crest);
  g.add(m(new THREE.TorusGeometry(0.66, 0.09, 6, 6), '#eef2f8', 0, 3.35, R * 0.92 + 0.14, { s: [1, 1.25, 1], rz: Math.PI / 6 }));
  // wooden posts around the base with team-coloured tops
  const topMat = tmat();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + 0.25;
    const x = Math.cos(a) * (R + 0.85), z = Math.sin(a) * (R + 0.85);
    if (z > 1.5 && Math.abs(x) < 1.4) continue;
    g.add(m(CY(0.24, 0.26, 0.7, 6), '#c98a3a', x, 0.45, z));
    const top = new THREE.Mesh(CY(0.25, 0.25, 0.2, 6), topMat);
    top.position.set(x, 0.88, z);
    g.add(top);
  }
  // banners on curved poles
  const bannerMat = tmat();
  const banners = [];
  for (const s of [-1, 1]) {
    const pole = new THREE.Group();
    pole.position.set(s * (R * 0.9), H * 0.78, 0.3);
    pole.add(m(B(1.1, 0.12, 0.12), '#2a4a88', s * 0.5, 0, 0));
    pole.add(m(CY(0.1, 0.1, 0.22, 8), '#2a4a88', s * 1.05, 0, 0, { rz: Math.PI / 2 }));
    const banner = new THREE.Mesh(B(0.9, 2.4, 0.06), bannerMat);
    banner.geometry.translate(0, -1.2, 0);
    banner.position.set(s * 0.65, -0.05, 0);
    pole.add(banner);
    banners.push(banner);
    pole.add(m(B(0.95, 0.1, 0.08), GOLD, s * 0.65, -0.05, 0));
    g.add(pole);
  }
  ink(g, 0.035);
  shadowed(g);
  g.userData = { teamParts, banners, crestMat };
  return g;
}

export function setOutpostColor(model, team, progress = 1) {
  const col = team < 0 ? NEUTRAL : TEAM_COLORS[team];
  for (const mt of model.userData.teamParts) mt.color.set(col.main);
  for (const b of model.userData.banners) b.scale.y = 0.35 + 0.65 * progress;
  model.userData.crestMat.emissive = new THREE.Color(team < 0 ? '#000000' : col.main);
  model.userData.crestMat.emissiveIntensity = team < 0 ? 0 : 0.35;
}

// ---------------------------------------------------------------- assemble
export function buildCastles(scene) {
  mats();
  const statics = new THREE.Group();
  const dyn = { castles: [], torches: [], outposts: [] };
  for (const c of CASTLES) {
    const cg = new THREE.Group();
    for (const w of c.walls) wallRun(cg, w);
    // team crest on the gate tower walkway
    const crest = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), basic('#ffffff', { map: crestTex(TEAM_COLORS[c.team].main, 'shield'), transparent: true }));
    crest.position.set(c.gate.x - c.s * 1.78, 2.9, c.gate.z - 3.4);
    crest.rotation.y = -c.s * Math.PI / 2;
    crest.userData.noInk = true;
    cg.add(crest);
    c.towers.forEach(([x, z], i) => {
      if (i === 3 || i === 6) return;
      const gateTower = i === 4 || i === 5;
      tower(cg, x, gateTower ? z * 1.25 : z, c.team, { roof: i === 0 || i === 9 || i === 1 || i === 8, h: gateTower ? 3.9 : 5.0, r: gateTower ? 1.55 : 2.15 });
    });
    keep(cg, c);
    // terrace parapet (gap at the stairs)
    const ploop = c.terraceLoops ? c.terraceLoops[0] : null;
    if (ploop) {
      for (let i = 0; i < ploop.length; i += 3) {
        const [x0, z0] = ploop[i], [x1, z1] = ploop[(i + 3) % ploop.length];
        const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
        if (Math.abs(mz) < c.stairs.half + 0.3 && Math.abs(mx - c.stairs.x0) < 2) continue;
        if (Math.abs(mx) > 73.2) continue;
        const L = Math.hypot(x1 - x0, z1 - z0);
        cg.add(m(B(L + 0.12, 0.75, 0.45), '#e3b877', mx, MAP.terraceY + 0.37, mz, { ry: -Math.atan2(z1 - z0, x1 - x0), material: brickP }));
        cg.add(m(B(L + 0.14, 0.12, 0.55), '#f0cf94', mx, MAP.terraceY + 0.78, mz, { ry: -Math.atan2(z1 - z0, x1 - x0) }));
      }
    }
    // stairs
    const st = c.stairs;
    const steps = 6;
    for (let i = 0; i < steps; i++) {
      const t0 = i / steps, t1 = (i + 1) / steps;
      const xa = st.x1 + (st.x0 - st.x1) * t0, xb = st.x1 + (st.x0 - st.x1) * t1;
      const h = MAP.terraceY * t1;
      cg.add(m(B(Math.abs(xb - xa) + 0.02, h, st.half * 2), i % 2 ? '#efcf92' : '#e3bf7f', (xa + xb) / 2, h / 2, st.z, { ink: 0.025 }));
    }
    for (const s of [-1, 1]) {
      cg.add(m(B(Math.abs(st.x0 - st.x1) + 0.3, 1.0, 0.45), '#e3b877', (st.x0 + st.x1) / 2, 0.9, st.z + s * (st.half + 0.22), { material: brickP }));
    }
    drawbridge(cg, c);
    // gate posts for the doors
    statics.add(cg);

    // dynamic pieces
    const gate = gateModel(c.team);
    gate.position.set(c.gate.x, 0, c.gate.z);
    gate.rotation.y = c.s < 0 ? 0 : Math.PI;
    scene.add(gate);
    const throne = throneModel(c.team);
    throne.position.set(c.throne.x, MAP.terraceY, c.throne.z);
    throne.rotation.y = c.s < 0 ? 0 : Math.PI;
    scene.add(throne);
    const cage = cageModel();
    cage.position.set(c.prison.x, 0, c.prison.z);
    cage.rotation.y = c.s < 0 ? Math.PI * 0.75 : Math.PI * 0.25;
    scene.add(cage);
    const hms = c.hatMachines.map((h) => {
      const hm = hatMachineModel(c.team, h.cls);
      hm.position.set(h.x, 0, h.z);
      // chute faces the courtyard centre
      const ang = Math.atan2(0 - h.z, c.s * 52 - h.x);
      hm.rotation.y = -ang;
      scene.add(hm);
      return hm;
    });
    const stock = stockpileModel();
    stock.position.set(c.stockpile.x, 0, c.stockpile.z);
    stock.rotation.y = c.s < 0 ? 0 : Math.PI;
    scene.add(stock);
    const cat = catapultModel(c.team);
    cat.position.set(c.catapult.x, 0, c.catapult.z);
    cat.rotation.y = c.s < 0 ? Math.PI : 0;
    scene.add(cat);
    const torches = c.torches.map(([x, z]) => {
      const t = torchModel();
      t.position.set(x, heightAt(x, z), z);
      scene.add(t);
      dyn.torches.push(t);
      return t;
    });
    dyn.castles.push({ gate, throne, cage, hms, stock, cat, torches });
  }
  for (const b of BRIDGES) riverBridge(statics, b);
  for (const o of OUTPOSTS) {
    const om = outpostModel();
    om.position.set(o.x, 0, o.z);
    setOutpostColor(om, -1, 0);
    scene.add(om);
    dyn.outposts.push(om);
  }
  ink(statics, 0.04);
  shadowed(statics);
  // merge the statics, but keep animated flags separate
  const keepAside = [];
  statics.traverse((o) => {
    if (o.userData.noBatch) keepAside.push(o);
  });
  for (const o of keepAside) {
    o.updateMatrixWorld(true);
    const wp = new THREE.Vector3(), wq = new THREE.Quaternion(), ws = new THREE.Vector3();
    o.matrixWorld.decompose(wp, wq, ws);
    o.parent.remove(o);
    o.position.copy(wp);
    o.quaternion.copy(wq);
    o.scale.copy(ws);
    scene.add(o);
  }
  const batch = new Batcher();
  batch.addObject(statics);
  const root = new THREE.Group();
  root.name = 'castleStatics';
  batch.build(root);
  scene.add(root);
  return dyn;
}
