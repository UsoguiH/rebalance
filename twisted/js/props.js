// Instanced props: trees (solid), breakable street furniture (lamps, hydrants, mailboxes,
// benches, signs, fences, cones...), and pushable/explodable objects (parked cars, gas pumps,
// dumpsters, carts). Broken pieces tumble with simple rigid-body debris physics.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/BufferGeometryUtils.js';
import { rng, clamp, R } from './core.js';
import { leafTex, barkTex } from './textures.js';
import { ROADS, BLOCKS, CURB, SIDEWALK, ROUNDABOUT, terrainH, outside } from './world.js';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _s = new THREE.Vector3(1, 1, 1);
const _p = new THREE.Vector3();
const _c = new THREE.Color();

function part(geo, color, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz)));
  const c = new THREE.Color(color);
  const n = g.attributes.position.count;
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    col[i * 3] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
  for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'color', 'uv'].includes(k)) g.deleteAttribute(k);
  return g;
}
const merge = (parts) => mergeGeometries(parts, false);
const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const C = (r1, r2, h, s = 10) => new THREE.CylinderGeometry(r1, r2, h, s);

// ---------- prop models ----------
function lampGeo() {
  return merge([
    part(C(0.12, 0.18, 7.6, 8), '#3b3a36', 0, 3.8, 0),
    part(B(0.12, 0.12, 2.2), '#3b3a36', 0, 7.5, 1.0),
    part(B(0.5, 0.22, 0.8), '#2e2d2a', 0, 7.42, 2.0),
    part(B(0.38, 0.05, 0.6), '#fff1c4', 0, 7.29, 2.0),
    part(C(0.28, 0.32, 0.5, 8), '#2e2d2a', 0, 0.25, 0),
  ]);
}
function trafficGeo() {
  const head = (x) => [
    part(B(0.42, 1.2, 0.36), '#2c2a24', x, 6.4, 0),
    part(C(0.11, 0.11, 0.05, 8), '#b8231c', x, 6.75, 0.2, Math.PI / 2),
    part(C(0.11, 0.11, 0.05, 8), '#6b5a14', x, 6.4, 0.2, Math.PI / 2),
    part(C(0.11, 0.11, 0.05, 8), '#1f4a24', x, 6.05, 0.2, Math.PI / 2),
  ];
  return merge([part(C(0.14, 0.2, 7, 8), '#4a4a44', 0, 3.5, 0), part(B(6.5, 0.16, 0.16), '#4a4a44', 3.2, 6.95, 0), ...head(3), ...head(5.5)]);
}
function hydrantGeo() {
  return merge([
    part(C(0.2, 0.24, 0.7, 10), '#b82a1e', 0, 0.35, 0),
    part(C(0.24, 0.24, 0.1, 10), '#b82a1e', 0, 0.72, 0),
    part(new THREE.SphereGeometry(0.18, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), '#b82a1e', 0, 0.76, 0),
    part(C(0.08, 0.08, 0.5, 6), '#b82a1e', 0, 0.5, 0, 0, 0, Math.PI / 2),
  ]);
}
function mailboxGeo() {
  return merge([
    part(B(0.5, 0.75, 0.45), '#2c4a7a', 0, 0.6, 0),
    part(C(0.25, 0.25, 0.45, 10, 1), '#2c4a7a', 0, 0.98, 0, Math.PI / 2, 0, 0, 1, 1, 1),
    part(B(0.06, 0.24, 0.06), '#222', -0.2, 0.12, -0.18),
    part(B(0.06, 0.24, 0.06), '#222', 0.2, 0.12, 0.18),
  ]);
}
function benchGeo() {
  const p = [];
  for (let i = 0; i < 3; i++) p.push(part(B(1.9, 0.06, 0.13), '#7a5a3a', 0, 0.48, -0.2 + i * 0.16));
  for (let i = 0; i < 2; i++) p.push(part(B(1.9, 0.12, 0.05), '#7a5a3a', 0, 0.68 + i * 0.18, -0.36, -0.2));
  p.push(part(B(0.08, 0.5, 0.6), '#2a2a28', -0.85, 0.25, -0.05), part(B(0.08, 0.5, 0.6), '#2a2a28', 0.85, 0.25, -0.05));
  return merge(p);
}
function trashGeo() {
  return merge([part(C(0.32, 0.28, 0.95, 10), '#3a4a3a', 0, 0.48, 0), part(C(0.35, 0.35, 0.08, 10), '#2a2a26', 0, 0.98, 0)]);
}
function newsGeo() {
  return merge([part(B(0.5, 0.9, 0.45), '#c8a020', 0, 0.65, 0), part(B(0.36, 0.3, 0.02), '#2a2a2a', 0, 0.85, 0.23), part(B(0.06, 0.2, 0.06), '#222', 0, 0.1, 0)]);
}
function coneGeo() {
  return merge([part(new THREE.ConeGeometry(0.22, 0.7, 10), '#e0571c', 0, 0.38, 0), part(C(0.18, 0.2, 0.1, 10), '#e8e2d2', 0, 0.42, 0), part(B(0.5, 0.04, 0.5), '#e0571c', 0, 0.02, 0)]);
}
function barricadeGeo() {
  return merge([
    part(B(2.2, 0.25, 0.06), '#e8e2d2', 0, 0.85, 0),
    part(B(2.2, 0.25, 0.06), '#d8571c', 0, 0.55, 0),
    part(B(0.07, 1.0, 0.6), '#7a5a3a', -0.9, 0.5, 0, 0.0),
    part(B(0.07, 1.0, 0.6), '#7a5a3a', 0.9, 0.5, 0),
  ]);
}
function fenceGeo() {
  const p = [part(B(0.08, 1.8, 0.08), '#8b8d8a', -2, 0.9, 0), part(B(0.08, 1.8, 0.08), '#8b8d8a', 2, 0.9, 0), part(B(4, 0.05, 0.05), '#8b8d8a', 0, 1.78, 0)];
  // chain link as a grid of thin bars
  for (let i = -1.9; i <= 1.9; i += 0.25) p.push(part(B(0.02, 1.7, 0.02), '#7d807d', i, 0.9, 0, 0, 0, 0.5));
  return merge(p);
}
function picketGeo() {
  const p = [part(B(3, 0.08, 0.05), '#e8e4da', 0, 0.35, 0), part(B(3, 0.08, 0.05), '#e8e4da', 0, 0.8, 0)];
  for (let i = -1.45; i <= 1.45; i += 0.18) p.push(part(B(0.1, 1.05, 0.03), '#ece8de', i, 0.55, 0.03));
  return merge(p);
}
function signGeo() {
  return merge([part(C(0.05, 0.05, 2.6, 6), '#8a8a84', 0, 1.3, 0), part(C(0.38, 0.38, 0.03, 8), '#b01d16', 0, 2.5, 0.03, Math.PI / 2, 0, Math.PI / 8)]);
}
function meterGeo() {
  return merge([part(C(0.05, 0.05, 1.1, 6), '#4a4a44', 0, 0.55, 0), part(B(0.22, 0.32, 0.18), '#6a6a62', 0, 1.25, 0)]);
}
function phoneGeo() {
  return merge([part(B(0.95, 2.3, 0.95), '#2a4a8a', 0, 1.15, 0), part(B(0.8, 1.4, 0.02), '#3a4a52', 0, 1.3, 0.48), part(B(1, 0.15, 1), '#b8b8b0', 0, 2.35, 0)]);
}
function dumpsterGeo() {
  return merge([part(B(1.9, 1.3, 1.2), '#2d5a3a', 0, 0.75, 0), part(B(2, 0.1, 1.3), '#244a30', 0, 1.42, 0, 0.06), part(C(0.1, 0.1, 0.1, 6), '#111', -0.8, 0.07, 0.5, Math.PI / 2)]);
}
function cartGeo() {
  const p = [part(B(0.6, 0.45, 0.9), '#a8aaa8', 0, 0.75, 0), part(B(0.55, 0.04, 0.85), '#7a7c7a', 0, 0.35, 0), part(B(0.6, 0.04, 0.04), '#b02020', 0, 1.0, -0.5)];
  for (const [x, z] of [
    [-0.25, -0.35],
    [0.25, -0.35],
    [-0.25, 0.35],
    [0.25, 0.35],
  ])
    p.push(part(C(0.07, 0.07, 0.05, 8), '#222', x, 0.07, z, 0, 0, Math.PI / 2));
  return merge(p);
}
function pumpGeo() {
  return merge([
    part(B(1.0, 1.9, 0.7), '#d8d2c4', 0, 0.95, 0),
    part(B(1.02, 0.4, 0.72), '#b01d16', 0, 1.75, 0),
    part(B(0.6, 0.3, 0.02), '#202020', 0, 1.35, 0.36),
    part(C(0.04, 0.04, 0.9, 6), '#202020', 0.45, 0.9, 0.2),
  ]);
}
function wheel(x, z, r = 0.34) {
  return [part(C(r, r, 0.24, 12), '#1b1a19', x, r, z, 0, 0, Math.PI / 2), part(C(r * 0.55, r * 0.55, 0.26, 8), '#8a8a86', x, r, z, 0, 0, Math.PI / 2)];
}
function sedanGeo(kind) {
  const p = [];
  if (kind === 'pickup') {
    p.push(part(B(1.9, 0.75, 5.1), '#ffffff', 0, 0.75, 0));
    p.push(part(B(1.8, 0.75, 1.9), '#ffffff', 0, 1.5, 0.6));
    p.push(part(B(1.82, 0.5, 1.6), '#1f2326', 0, 1.55, 0.6));
    p.push(part(B(1.86, 0.35, 2.3), '#ffffff', 0, 1.25, -1.35));
    p.push(part(B(1.7, 0.1, 2.2), '#3a3a38', 0, 1.0, -1.35));
  } else if (kind === 'wagon') {
    p.push(part(B(1.85, 0.7, 5.0), '#ffffff', 0, 0.72, 0));
    p.push(part(B(1.72, 0.62, 3.1), '#ffffff', 0, 1.36, -0.45));
    p.push(part(B(1.74, 0.48, 3.0), '#1f2326', 0, 1.36, -0.45));
    p.push(part(B(1.86, 0.08, 4.9), '#6b4a2a', 0, 0.85, 0));
  } else {
    p.push(part(B(1.85, 0.68, 4.8), '#ffffff', 0, 0.72, 0));
    p.push(part(B(1.65, 0.6, 2.3), '#ffffff', 0, 1.33, -0.2));
    p.push(part(B(1.67, 0.46, 2.2), '#1f2326', 0, 1.33, -0.2));
  }
  p.push(part(B(1.6, 0.18, 0.05), '#d8d4c4', 0, 0.82, 2.47));
  p.push(part(B(0.3, 0.14, 0.04), '#f4e6b0', -0.68, 0.84, 2.49), part(B(0.3, 0.14, 0.04), '#f4e6b0', 0.68, 0.84, 2.49));
  p.push(part(B(0.32, 0.14, 0.04), '#8a1a14', -0.7, 0.84, -2.47), part(B(0.32, 0.14, 0.04), '#8a1a14', 0.7, 0.84, -2.47));
  p.push(part(B(1.95, 0.2, 0.25), '#2a2a2a', 0, 0.45, 2.42), part(B(1.95, 0.2, 0.25), '#2a2a2a', 0, 0.45, -2.42));
  for (const [x, z] of [
    [-0.88, 1.55],
    [0.88, 1.55],
    [-0.88, -1.55],
    [0.88, -1.55],
  ])
    p.push(...wheel(x, z));
  return merge(p);
}

// trees: displaced blob canopy + alpha leaf cards, trunk with bark
function treeGeos(kind, seed) {
  const r = rng(seed);
  const trunk = [];
  const canopy = [];
  const cards = [];
  if (kind === 'pine') {
    trunk.push(part(C(0.18, 0.32, 9, 7), '#4a3626', 0, 4.5, 0));
    for (let i = 0; i < 5; i++) {
      const y = 2.6 + i * 1.7, rad = 2.6 - i * 0.45;
      const cone = new THREE.ConeGeometry(rad, 2.8, 9, 1);
      canopy.push(part(cone, i % 2 ? '#2f3a22' : '#36432a', 0, y + 1.2, 0, 0, r() * 3));
    }
  } else if (kind === 'dead') {
    trunk.push(part(C(0.12, 0.3, 6, 6), '#5a4a3a', 0, 3, 0));
    for (let i = 0; i < 6; i++) {
      const a = r() * Math.PI * 2, y = 2.5 + r() * 3;
      trunk.push(part(C(0.04, 0.1, 2.4, 5), '#5a4a3a', Math.cos(a) * 0.7, y + 0.6, Math.sin(a) * 0.7, Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9));
    }
  } else {
    const h = 4 + r() * 2;
    trunk.push(part(C(0.22, 0.38, h + 1, 7), '#4a3a2c', 0, (h + 1) / 2, 0));
    for (let i = 0; i < 3; i++) {
      const a = r() * Math.PI * 2;
      trunk.push(part(C(0.08, 0.16, 2.6, 5), '#4a3a2c', Math.cos(a) * 0.6, h + 0.2, Math.sin(a) * 0.6, Math.sin(a) * 0.7, 0, -Math.cos(a) * 0.7));
    }
    // canopy: a few low-poly cores wrapped in alpha leaf cards. All normals point away from
    // the canopy centre so the crown shades like one soft volume instead of facets.
    const center = new THREE.Vector3(0, h + 2.2, 0);
    const sphereNormals = (g) => {
      const pp = g.attributes.position, nn = g.attributes.normal;
      for (let k = 0; k < pp.count; k++) {
        _p.fromBufferAttribute(pp, k).sub(center);
        _p.y = _p.y * 0.8 + 1.2;
        _p.normalize();
        nn.setXYZ(k, _p.x, _p.y, _p.z);
      }
      return g;
    };
    const blobs = 4 + Math.floor(r() * 3);
    const dry = kind === 'dry';
    for (let i = 0; i < blobs; i++) {
      const rad = 1.5 + r() * 1.2;
      const a = (i / blobs) * Math.PI * 2 + r();
      const d = i === 0 ? 0 : 1.3 + r() * 0.8;
      const cx = Math.cos(a) * d, cz = Math.sin(a) * d, cy = h + 1.4 + r() * 1.6 + (i === 0 ? 0.8 : 0);
      canopy.push(sphereNormals(part(new THREE.IcosahedronGeometry(rad * 0.72, 1), dry ? '#5a5a30' : '#34401e', cx, cy, cz)));
      for (let k = 0; k < 9; k++) {
        const q = new THREE.PlaneGeometry(rad * 1.9, rad * 1.9);
        const off = new THREE.Vector3(r() - 0.5, r() - 0.4, r() - 0.5).multiplyScalar(rad * 0.9);
        const tint = dry ? '#b8a870' : r() < 0.5 ? '#8a9a5a' : '#7a8c50';
        cards.push(sphereNormals(part(q, tint, cx + off.x, cy + off.y, cz + off.z, r() * Math.PI, r() * Math.PI, r() * Math.PI)));
      }
    }
  }
  return {
    trunk: merge(trunk),
    canopy: canopy.length ? merge(canopy) : null,
    cards: cards.length ? merge(cards) : null,
  };
}

export class Props {
  constructor(world, scene) {
    this.world = world;
    this.scene = scene;
    this.types = {};
    this.items = [];
    this.active = new Set();
    this.grid = new Map();
    this.onBreak = null; // (item, impact) => {}
    this.onExplode = null; // (item) => {}
    const std = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, metalness: 0.15 });
    this.stdMat = std;
    this.def('lamp', lampGeo(), { breakSpeed: 7, mass: 120, r: 0.3, h: 7 });
    this.def('traffic', trafficGeo(), { breakSpeed: 9, mass: 220, r: 0.35, h: 7 });
    this.def('hydrant', hydrantGeo(), { breakSpeed: 4, mass: 80, r: 0.3, h: 1, hydrant: true });
    this.def('mailbox', mailboxGeo(), { breakSpeed: 3, mass: 40, r: 0.4, h: 1.3 });
    this.def('bench', benchGeo(), { breakSpeed: 3, mass: 50, r: 0.8, h: 1 });
    this.def('trash', trashGeo(), { breakSpeed: 2, mass: 25, r: 0.4, h: 1 });
    this.def('news', newsGeo(), { breakSpeed: 2, mass: 25, r: 0.35, h: 1.1 });
    this.def('cone', coneGeo(), { breakSpeed: 0.5, mass: 4, r: 0.3, h: 0.7 });
    this.def('barricade', barricadeGeo(), { breakSpeed: 1, mass: 20, r: 1.0, h: 1 });
    this.def('fence', fenceGeo(), { breakSpeed: 3, mass: 30, r: 1.9, h: 1.8, flat: true });
    this.def('picket', picketGeo(), { breakSpeed: 2, mass: 20, r: 1.4, h: 1, flat: true });
    this.def('sign', signGeo(), { breakSpeed: 2, mass: 15, r: 0.2, h: 2.6 });
    this.def('meter', meterGeo(), { breakSpeed: 2, mass: 15, r: 0.2, h: 1.3 });
    this.def('phone', phoneGeo(), { breakSpeed: 5, mass: 150, r: 0.6, h: 2.4 });
    this.def('dumpster', dumpsterGeo(), { pushable: true, mass: 700, r: 1.1, h: 1.5, hp: 1e9 });
    this.def('cart', cartGeo(), { breakSpeed: 0.5, mass: 20, r: 0.45, h: 1.1 });
    this.def('pump', pumpGeo(), { pushable: false, solid: true, mass: 1e9, r: 0.7, h: 2, hp: 12, explode: { r: 11, dmg: 40, big: true } });
    for (const k of ['sedan', 'pickup', 'wagon']) this.def(k, sedanGeo(k), { pushable: true, mass: 1100, r: 1.3, h: 1.6, hp: 22, car: true, explode: { r: 7, dmg: 22 } });
    // statue head (giant cook mascot) knocked off by a hit
    this.def('head', merge([part(new THREE.SphereGeometry(1.6, 14, 10), '#e8c9a8'), part(C(1.1, 1.3, 1.6, 12), '#f2f0ea', 0, 1.5, 0), part(B(0.5, 0.3, 0.3), '#2a1a12', 0, 0.2, 1.5), part(B(0.25, 0.25, 0.1), '#1a1a1a', -0.6, 0.6, 1.5), part(B(0.25, 0.25, 0.1), '#1a1a1a', 0.6, 0.6, 1.5)]), { breakSpeed: 0, mass: 300, r: 1.7, h: 3, hp: 15, shootable: true, onHigh: true });

    // trees (static, solid)
    const bark = barkTex();
    const leaves = leafTex('#6a7c34');
    this.treeKinds = [];
    const trunkMat = new THREE.MeshStandardMaterial({ vertexColors: true, map: bark, roughness: 0.95 });
    const canopyMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });
    const cardMat = new THREE.MeshStandardMaterial({ map: leaves, vertexColors: true, alphaTest: 0.45, alphaToCoverage: true, side: THREE.DoubleSide, roughness: 0.95, color: 0xffffff });
    let s = 1;
    for (const kind of ['broad', 'broad', 'broad', 'pine', 'pine', 'dead', 'dry']) {
      const gs = treeGeos(kind, s++ * 17);
      this.treeKinds.push({ kind, gs, list: [] });
    }
    this.treeMats = { trunkMat, canopyMat, cardMat };
  }
  def(name, geo, o) {
    this.types[name] = { name, geo, list: [], mesh: null, ...o };
  }
  place(name, x, z, rot = 0, y = null, scale = 1) {
    const t = this.types[name];
    const gy = y ?? this.world.groundHeight(x, z, 50);
    const it = {
      type: t,
      idx: t.list.length,
      pos: new THREE.Vector3(x, gy, z),
      base: new THREE.Vector3(x, gy, z),
      rot: new THREE.Euler(0, rot, 0, 'YXZ'),
      scale,
      vel: new THREE.Vector3(),
      ang: new THREE.Vector3(),
      broken: false,
      rest: true,
      hp: t.hp ?? 1,
      dead: false,
      timer: 0,
    };
    t.list.push(it);
    this.items.push(it);
    if (t.solid || t.pushable || t.breakSpeed !== undefined) this.gridAdd(it);
    return it;
  }
  tree(x, z, kindIdx, scale = 1) {
    const tk = this.treeKinds[kindIdx];
    const y = this.world.groundHeight(x, z, 50);
    tk.list.push({ x, y, z, rot: R() * Math.PI * 2, scale });
    if (tk.kind !== 'dead' || scale > 0.8) this.world.addCircle(x, z, 0.45 * scale, y - 1, y + 8 * scale, { minimap: false, tree: true });
  }
  gridKey(x, z) {
    return Math.floor(x / 12) * 7919 + Math.floor(z / 12);
  }
  gridAdd(it) {
    const k = this.gridKey(it.pos.x, it.pos.z);
    let a = this.grid.get(k);
    if (!a) this.grid.set(k, (a = []));
    a.push(it);
    it.gk = k;
  }
  gridMove(it) {
    const k = this.gridKey(it.pos.x, it.pos.z);
    if (k === it.gk) return;
    const a = this.grid.get(it.gk);
    if (a) a.splice(a.indexOf(it), 1);
    this.gridAdd(it);
  }
  near(x, z, out) {
    out.length = 0;
    for (let dx = -1; dx <= 1; dx++)
      for (let dz = -1; dz <= 1; dz++) {
        const a = this.grid.get(Math.floor(x / 12 + dx) * 7919 + Math.floor(z / 12 + dz));
        if (a) for (const it of a) out.push(it);
      }
    return out;
  }

  // scatter street furniture, parked cars and trees around the town
  populate() {
    const r = rng(4242);
    const w = this.world;
    // along roads: lamps on both sides of Main St and North Blvd, one side elsewhere
    for (const rd of ROADS) {
      const horiz = rd.z1 === rd.z2;
      const len = horiz ? Math.abs(rd.x2 - rd.x1) : Math.abs(rd.z2 - rd.z1);
      if (len < 20) continue;
      const both = rd.w >= 16;
      const step = both ? 26 : 38;
      for (let t = 12; t < len - 8; t += step) {
        for (const side of both ? [-1, 1] : [1]) {
          const off = rd.w / 2 + 0.9;
          const x = horiz ? Math.min(rd.x1, rd.x2) + t : rd.x1 + side * off;
          const z = horiz ? rd.z1 + side * off : Math.min(rd.z1, rd.z2) + t;
          if (w.onRoad(x, z) || !w.inBlock(x, z)) continue;
          const rot = horiz ? (side > 0 ? Math.PI : 0) : side > 0 ? -Math.PI / 2 : Math.PI / 2;
          this.place('lamp', x, z, rot);
        }
      }
    }
    // traffic lights at main intersections
    const xs = [-110, 0, 120], zs = [-150, 50, 150];
    for (const x of xs)
      for (const z of zs) {
        if (x === 0 && z === -50) continue;
        if (z === 50 && x === -110) continue;
        this.place('traffic', x + 11.5, z + 10.5, Math.PI / 2);
        this.place('traffic', x - 11.5, z - 10.5, -Math.PI / 2);
      }
    // sidewalk furniture on downtown blocks
    for (const b of BLOCKS) {
      const downtown = b.id.startsWith('dt') || b.id === 'gas' || b.id === 'market';
      const per = downtown ? 9 : 28;
      const edges = [
        [b.x0 + 1.4, b.z0 + 1.4, b.x1 - 1.4, b.z0 + 1.4, 0],
        [b.x0 + 1.4, b.z1 - 1.4, b.x1 - 1.4, b.z1 - 1.4, Math.PI],
        [b.x0 + 1.4, b.z0 + 1.4, b.x0 + 1.4, b.z1 - 1.4, Math.PI / 2],
        [b.x1 - 1.4, b.z0 + 1.4, b.x1 - 1.4, b.z1 - 1.4, -Math.PI / 2],
      ];
      for (const [x0, z0, x1, z1, rot] of edges) {
        const len = Math.hypot(x1 - x0, z1 - z0);
        for (let t = 6 + r() * per; t < len - 6; t += per * (0.6 + r() * 0.8)) {
          const x = x0 + ((x1 - x0) * t) / len, z = z0 + ((z1 - z0) * t) / len;
          const k = downtown
            ? r.pick(['hydrant', 'mailbox', 'bench', 'trash', 'news', 'meter', 'meter', 'trash', 'sign', 'phone'])
            : r.pick(['hydrant', 'mailbox', 'trash', 'sign', 'bench']);
          this.place(k, x, z, rot + (k === 'bench' ? Math.PI : 0));
          // street trees downtown and in the suburbs
          if (r() < (downtown ? 0.55 : 0.8)) {
            const tx = x + ((x1 - x0) / len) * 4, tz = z + ((z1 - z0) / len) * 4;
            const ix = tx + Math.cos(rot + Math.PI / 2) * 1.2 * 0, iz = tz;
            if (!this.world.pointSolid(ix, 1, iz)) this.tree(ix, iz, r.int(0, 2), 0.8 + r() * 0.35);
          }
        }
      }
    }
    // parked cars: along curb lanes of Main St and in lots
    const kinds = ['sedan', 'sedan', 'pickup', 'wagon'];
    const colors = ['#7a1d18', '#2a3a5a', '#d8d2c0', '#3a5a3a', '#6a6a66', '#b89a3a', '#1e1e1e', '#8a5a2a', '#4a2a4a', '#9aa4a8'];
    const parked = [];
    for (let z = -135; z < 240; z += 12 + r() * 14) {
      for (const s of [-1, 1]) {
        const x = s * 7.6;
        if (Math.abs(z + 50) < 30 || Math.abs(z - 50) < 14 || Math.abs(z - 150) < 14 || r() < 0.45) continue;
        parked.push([x, z, s > 0 ? 0 : Math.PI]);
      }
    }
    for (const lot of w.parkingLots || []) {
      const n = Math.floor(((lot.x1 - lot.x0) * (lot.z1 - lot.z0)) / 260);
      for (let i = 0; i < n; i++) {
        if (lot.rows === 'x') {
          const x = lot.x0 + 2.4 + Math.floor(r() * ((lot.x1 - lot.x0 - 4) / 2.8)) * 2.8;
          const top = r() < 0.5;
          parked.push([x, top ? lot.z0 + 3 : lot.z1 - 3, top ? Math.PI : 0, true]);
        } else {
          const z = lot.z0 + 2.4 + Math.floor(r() * ((lot.z1 - lot.z0 - 4) / 2.8)) * 2.8;
          const left = r() < 0.5;
          parked.push([left ? lot.x0 + 3 : lot.x1 - 3, z, left ? -Math.PI / 2 : Math.PI / 2, true]);
        }
      }
    }
    for (const [x, z, rot] of parked) {
      const it = this.place(r.pick(kinds), x, z, rot + (r() - 0.5) * 0.08);
      it.color = new THREE.Color(r.pick(colors));
    }
    // gas pumps
    for (const [x, z] of w.gasPumps || []) {
      this.place('pump', x - 0.9, z, 0);
      this.place('pump', x + 0.9, z, 0);
    }
    // dumpsters behind downtown buildings, carts at the market
    for (const [x, z] of [
      [-40, -80],
      [40, -118],
      [-40, 20],
      [40, -20],
      [104, 66],
      [-90, 110],
    ])
      this.place('dumpster', x, z, r() * 3);
    for (let i = 0; i < 10; i++) this.place('cart', 20 + r() * 28, 66 + r() * 68, r() * 6);
    // cones and barricades: road work on Oak St and the north blvd
    for (let i = 0; i < 8; i++) this.place('cone', 70 + i * 3, -46.5, 0);
    this.place('barricade', 94, -46.5, 0);
    this.place('barricade', -160, -150, Math.PI / 2);
    for (let i = 0; i < 6; i++) this.place('cone', -170 + i * 3.5, -153, 0);
    // fences: water tower yard (chain link) and picket fences in the suburbs
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      this.place('fence', -175 + Math.cos(a) * 13, -98 + Math.sin(a) * 13, -a + Math.PI / 2);
    }
    for (const b of BLOCKS.filter((q) => q.id.startsWith('houses'))) {
      for (let x = b.x0 + 7; x < b.x1 - 7; x += 3) {
        if (r() < 0.35) continue;
        this.place('picket', x + 1.5, b.z0 + SIDEWALK + 0.6, 0);
        this.place('picket', x + 1.5, b.z1 - SIDEWALK - 0.6, 0);
      }
    }
    // statue head on the diner mascot
    if (w.statueHead) {
      const it = this.place('head', w.statueHead.x, w.statueHead.z, 0, w.statueHead.y);
      it.raised = true;
    }
    // trees: suburbs, park, courthouse lawn, school, outer belt and hills
    const treeAt = (x, z, kind, sc = 1) => {
      if (w.onRoad(x, z) || w.pointSolid(x, 1, z) || w.pointSolid(x + 1.5, 1, z) || w.pointSolid(x, 1, z + 1.5)) return;
      this.tree(x, z, kind, sc);
    };
    for (let i = 0; i < 70; i++) treeAt(18 + r() * 88, 166 + r() * 70, r.int(0, 3), 0.9 + r() * 0.5);
    for (const [x, z] of [
      [-50, -192],
      [-30, -178],
      [30, -178],
      [50, -192],
      [-56, -230],
      [56, -230],
      [-50, -170],
      [50, -170],
    ])
      treeAt(x, z, 0, 1.1);
    for (let i = 0; i < 260; i++) {
      // outer dirt belt and lower hills
      const a = r() * Math.PI * 2;
      const d = 255 + r() * 160;
      const x = Math.cos(a) * d * 1.15, z = Math.sin(a) * d * 1.15;
      const o = outside(x, z);
      if (Math.abs(x) < 250 && Math.abs(z) < 250) continue;
      if (o > 120) continue;
      const h = terrainH(x, z);
      const kind = o > 15 ? (r() < 0.5 ? 3 : r() < 0.6 ? 6 : 5) : r.pick([0, 1, 2, 6, 5]);
      if (h > 0.3 && this.world.terrainNormal(x, z, _p).y < 0.8) continue;
      treeAt(x, z, kind, 0.8 + r() * 0.6);
    }
    for (let i = 0; i < 40; i++) {
      // house yards
      const b = r.pick(BLOCKS.filter((q) => q.id.startsWith('houses')));
      treeAt(b.x0 + 8 + r() * (b.x1 - b.x0 - 16), b.z0 + 8 + r() * (b.z1 - b.z0 - 16), r.int(0, 2), 1 + r() * 0.4);
    }
    // roundabout island trees are kept clear for the clock tower
    void ROUNDABOUT;
    void CURB;
  }

  build() {
    for (const t of Object.values(this.types)) {
      if (!t.list.length) continue;
      const m = new THREE.InstancedMesh(t.geo, this.stdMat, t.list.length);
      m.castShadow = true;
      m.receiveShadow = true;
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      t.mesh = m;
      for (const it of t.list) {
        this.writeMatrix(it);
        m.setColorAt(it.idx, it.color || _c.set(0xffffff));
      }
      m.instanceColor.needsUpdate = true;
      m.computeBoundingSphere();
      m.frustumCulled = false;
      this.scene.add(m);
    }
    // trees
    const { trunkMat, canopyMat, cardMat } = this.treeMats;
    for (const tk of this.treeKinds) {
      if (!tk.list.length) continue;
      const parts = [
        [tk.gs.trunk, trunkMat],
        [tk.gs.canopy, canopyMat],
        [tk.gs.cards, cardMat],
      ];
      for (const [geo, mt] of parts) {
        if (!geo) continue;
        const m = new THREE.InstancedMesh(geo, mt, tk.list.length);
        tk.list.forEach((t, i) => {
          _e.set(0, t.rot, 0);
          _q.setFromEuler(_e);
          _s.setScalar(t.scale);
          _m.compose(_p.set(t.x, t.y - 0.2, t.z), _q, _s);
          m.setMatrixAt(i, _m);
        });
        m.castShadow = true;
        m.receiveShadow = mt !== cardMat;
        m.computeBoundingSphere();
        this.scene.add(m);
      }
    }
  }
  writeMatrix(it) {
    _q.setFromEuler(it.rot);
    _s.setScalar(it.scale);
    _m.compose(it.pos, _q, _s);
    it.type.mesh ? it.type.mesh.setMatrixAt(it.idx, _m) : null;
    if (it.type.mesh) it.type.mesh.instanceMatrix.needsUpdate = true;
  }

  // collisions with cars + debris simulation
  update(dt, cars) {
    const tmp = this._tmp || (this._tmp = []);
    for (const car of cars) {
      if (!car.alive) continue;
      const list = this.near(car.pos.x, car.pos.z, tmp);
      for (const it of list) {
        if (it.dead || (it.broken && !it.type.pushable)) continue;
        const t = it.type;
        if (it.raised) continue;
        const dx = it.pos.x - car.pos.x, dz = it.pos.z - car.pos.z;
        const rr = t.r * it.scale + car.radius;
        const d2 = dx * dx + dz * dz;
        if (d2 > rr * rr) continue;
        if (Math.abs(it.pos.y - car.pos.y) > 3) continue;
        const d = Math.sqrt(d2) || 0.01;
        const nx = dx / d, nz = dz / d;
        const rel = (car.vel.x - it.vel.x) * nx + (car.vel.z - it.vel.z) * nz;
        if (t.pushable) {
          // momentum exchange along the normal
          const pen = rr - d;
          const total = car.mass + t.mass;
          it.pos.x += nx * pen * (car.mass / total);
          it.pos.z += nz * pen * (car.mass / total);
          car.pos.x -= nx * pen * (t.mass / total);
          car.pos.z -= nz * pen * (t.mass / total);
          if (rel > 0) {
            const j = (1.3 * rel) / (1 / car.mass + 1 / t.mass);
            it.vel.x += (nx * j) / t.mass;
            it.vel.z += (nz * j) / t.mass;
            car.vel.x -= (nx * j) / car.mass;
            car.vel.z -= (nz * j) / car.mass;
            it.ang.y += (R() - 0.5) * rel * 0.25;
            if (rel > 5 && t.car) {
              it.vel.y += rel * 0.08;
              this.damage(it, rel * 0.4, car);
            }
            if (rel > 4 && this.onBump) this.onBump(it, rel, car);
          }
          it.rest = false;
          this.active.add(it);
        } else if (t.solid) {
          const pen = rr - d;
          car.pos.x -= nx * pen;
          car.pos.z -= nz * pen;
          if (rel > 0) {
            car.vel.x -= nx * rel * 1.2;
            car.vel.z -= nz * rel * 1.2;
          }
          if (rel > 8 && t.hp) this.damage(it, rel, car);
        } else if (!it.broken) {
          if (rel >= t.breakSpeed) {
            this.breakProp(it, car.vel, rel);
            const slow = clamp(t.mass / (car.mass + t.mass), 0, 0.35);
            car.vel.multiplyScalar(1 - slow * 0.5);
          } else {
            const pen = rr - d;
            car.pos.x -= nx * pen;
            car.pos.z -= nz * pen;
            if (rel > 0) {
              car.vel.x -= nx * rel;
              car.vel.z -= nz * rel;
            }
          }
        }
      }
    }
    // integrate active props
    for (const it of this.active) {
      const t = it.type;
      it.timer += dt;
      it.vel.y -= 22 * dt;
      it.pos.addScaledVector(it.vel, dt);
      it.rot.x += it.ang.x * dt;
      it.rot.y += it.ang.y * dt;
      it.rot.z += it.ang.z * dt;
      const gy = this.world.groundHeight(it.pos.x, it.pos.z, it.pos.y + 0.5);
      if (it.pos.y <= gy) {
        it.pos.y = gy;
        if (it.vel.y < -3) {
          it.vel.y *= -0.3;
          it.ang.multiplyScalar(0.6);
        } else it.vel.y = 0;
        const fr = Math.exp(-(t.pushable && !it.broken ? 3.2 : 2.2) * dt);
        it.vel.x *= fr;
        it.vel.z *= fr;
        it.ang.multiplyScalar(Math.exp(-3 * dt));
        if (it.broken && !t.pushable) {
          // settle lying flat
          const tx = t.flat ? 0 : Math.PI / 2;
          it.rot.x += (Math.sign(it.rot.x || 1) * tx - it.rot.x) * Math.min(1, dt * 4);
          it.rot.z *= Math.exp(-4 * dt);
        } else {
          it.rot.x *= Math.exp(-5 * dt);
          it.rot.z *= Math.exp(-5 * dt);
        }
      }
      // static collision for sliding pushables
      if (t.pushable) {
        const contacts = this._ct || (this._ct = []);
        this.world.collideCircle(it.pos, t.r * 0.9, it.pos.y, 1.5, contacts);
        for (const c of contacts) {
          const vn = it.vel.x * c.nx + it.vel.z * c.nz;
          if (vn < 0) {
            it.vel.x -= c.nx * vn * 1.4;
            it.vel.z -= c.nz * vn * 1.4;
          }
        }
        this.gridMove(it);
      }
      if (it.burning) {
        it.burning -= dt;
        if (this.onBurn) this.onBurn(it, dt);
      }
      this.writeMatrix(it);
      const spd = it.vel.lengthSq();
      if (spd < 0.05 && Math.abs(it.pos.y - gy) < 0.05 && it.timer > 0.5 && !it.burning) {
        it.rest = true;
        this.active.delete(it);
      }
    }
  }
  breakProp(it, vel, speed) {
    it.broken = true;
    it.raised = false;
    it.rest = false;
    it.timer = 0;
    it.vel.set(vel.x * 0.9 + (R() - 0.5) * 3, 3 + speed * 0.25 + R() * 2, vel.z * 0.9 + (R() - 0.5) * 3);
    it.ang.set((R() - 0.5) * 10, (R() - 0.5) * 8, (R() - 0.5) * 10);
    this.active.add(it);
    if (this.onBreak) this.onBreak(it, speed);
  }
  damage(it, dmg, by) {
    if (it.dead) return;
    if (it.raised) {
      // knocking the statue head off
      it.raised = false;
      this.breakProp(it, new THREE.Vector3((R() - 0.5) * 8, 6, (R() - 0.5) * 8), 10);
      return;
    }
    if (!it.type.hp || it.type.hp > 1e8) {
      if (!it.broken && it.type.breakSpeed !== undefined) this.breakProp(it, new THREE.Vector3((R() - 0.5) * 6, 4, (R() - 0.5) * 6), 8);
      return;
    }
    it.hp -= dmg;
    if (it.hp <= 0) {
      it.dead = !it.type.car;
      it.hp = 0;
      if (it.type.explode && !it.exploded) {
        it.exploded = true;
        if (it.type.car) {
          it.vel.y += 9;
          it.ang.set((R() - 0.5) * 4, (R() - 0.5) * 2, (R() - 0.5) * 6);
          it.burning = 14;
          it.type.mesh.setColorAt(it.idx, _c.set(0x262220));
          it.type.mesh.instanceColor.needsUpdate = true;
          this.active.add(it);
          it.rest = false;
        } else {
          // pumps vanish into a fireball
          it.pos.y -= 50;
          this.writeMatrix(it);
        }
        if (this.onExplode) this.onExplode(it, by);
      }
    }
  }
  // explosion splash: damage/knock props in radius
  blast(pos, radius, dmg, by) {
    const list = this.near(pos.x, pos.z, this._tmp2 || (this._tmp2 = []));
    for (const it of list) {
      if (it.dead) continue;
      const d = it.pos.distanceTo(pos);
      if (d > radius + it.type.r) continue;
      const f = 1 - d / (radius + it.type.r);
      if (it.type.pushable) {
        _p.subVectors(it.pos, pos).setY(0).normalize();
        it.vel.addScaledVector(_p, f * 8);
        it.vel.y += f * 5;
        it.ang.set((R() - 0.5) * 3, (R() - 0.5) * 3, (R() - 0.5) * 3);
        this.active.add(it);
        it.rest = false;
      }
      this.damage(it, dmg * f, by);
    }
  }
  // projectile vs props that can be shot (parked cars, pumps, the statue head)
  hitTest(p, rad = 0.5) {
    const list = this.near(p.x, p.z, this._tmp3 || (this._tmp3 = []));
    for (const it of list) {
      if (it.dead || !(it.type.hp || it.type.shootable)) continue;
      if (it.type.hp > 1e8) continue;
      const dy = p.y - it.pos.y;
      if (dy < -0.5 || dy > it.type.h + 0.5) continue;
      const dx = p.x - it.pos.x, dz = p.z - it.pos.z;
      const rr = it.type.r + rad;
      if (dx * dx + dz * dz < rr * rr) return it;
    }
    return null;
  }
}
