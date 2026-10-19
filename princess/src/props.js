// Scenery and pickup models: leafy (choppable) trees, pines, stumps, rocks, ore
// deposits, flowers, grass tufts, bushes, cake slices, logs and ore chunks.
import * as THREE from 'three';
import { m, toon, ink, shadowed, Batcher } from './toon.js';
import { proceduralToon, C } from './shaders.js';
import { logEndTex, barkTex } from './tex.js';
import { rng, TAU } from './util.js';
import { TREES, PINES, ROCKS, ORES, landSDF, roadSDF, castleFloorSDF, dirtSDF, OUTPOSTS, CAKES, HOLES, highlandSDF, MAP } from './world.js';
import { canStand } from './nav.js';

const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const CY = (rt, rb, h, s = 10) => new THREE.CylinderGeometry(rt, rb, h, s);

let leafMat, pineMat, pineMat2;
function foliage() {
  if (leafMat) return;
  leafMat = proceduralToon({
    objectSpace: true,
    steps: [0.6, 0.83, 1.0],
    uniforms: { cL1: C('#36ad4c'), cL2: C('#4cc561'), cL3: C('#79e08a'), cLD: C('#24843a') },
    colorCode: /* glsl */ `
      // overlapping oval leaves, lighter on the upper side
      vec3 q = wp * 2.4;
      vec4 v = voro(q.xz + q.y * vec2(0.7, -0.4));
      vec4 v2 = voro(q.xy * 1.1 + 5.0);
      float k = abs(vWN.y) > 0.5 ? v.x : v2.x;
      float id = abs(vWN.y) > 0.5 ? v.y : v2.y;
      col = mix(cL1, cL2, id);
      col = mix(col, cL3, smoothstep(0.12, 0.3, k) * 0.55 * smoothstep(-0.2, 0.8, vWN.y + 0.3));
      col = mix(col, cLD, (1.0 - smoothstep(0.02, 0.06, k)) * 0.6);
    `,
  });
  pineMat = toon('#2e9b45', { steps: [0.55, 0.8, 1.0] });
  pineMat2 = toon('#3fb456', { steps: [0.55, 0.8, 1.0] });
}

// Lumpy sphere for canopies and bushes.
function blob(r, detail = 1, seed = 1, squash = 1) {
  const g = new THREE.IcosahedronGeometry(r, detail);
  const p = g.attributes.position;
  const R = rng(seed);
  const offs = new Map();
  for (let i = 0; i < p.count; i++) {
    const k = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
    if (!offs.has(k)) offs.set(k, 0.88 + R() * 0.2);
    const s = offs.get(k);
    p.setXYZ(i, p.getX(i) * s, p.getY(i) * s * squash, p.getZ(i) * s);
  }
  g.computeVertexNormals();
  return g;
}

// ---------------------------------------------------------------- trees
export function leafyTree(seed = 1) {
  foliage();
  const R = rng(seed);
  const g = new THREE.Group();
  const trunk = new THREE.Group();
  // flared trunk with a star of roots
  const tr = m(CY(0.38, 0.62, 2.0, 7), '#8f4f22', 0, 1.0, 0, { map: barkTex() });
  trunk.add(tr);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU + R() * 0.4;
    trunk.add(m(new THREE.ConeGeometry(0.3, 1.0, 4), '#a8622c', Math.cos(a) * 0.55, 0.18, Math.sin(a) * 0.55, { rx: Math.sin(a) * 1.25, rz: -Math.cos(a) * 1.25 }));
  }
  trunk.add(m(B(0.8, 0.12, 0.2), '#3a1c0a', 0, 1.25, 0.42, { rx: -0.25, noInk: true }));
  g.add(trunk);
  const crown = new THREE.Group();
  crown.position.y = 2.7;
  const lobes = [
    [0, 0.4, 0, 1.75],
    [-1.15, -0.1, 0.25, 1.2],
    [1.05, 0.0, -0.2, 1.3],
    [0.2, -0.25, 0.95, 1.15],
  ];
  lobes.forEach(([x, y, z, r], i) => {
    const mesh = new THREE.Mesh(blob(r, 2, seed * 10 + i, 0.86), leafMat);
    mesh.position.set(x, y, z);
    mesh.userData.inkThickness = 0.05;
    crown.add(mesh);
  });
  g.add(crown);
  ink(g, 0.045);
  shadowed(g);
  g.userData = { crown, trunk };
  return g;
}

function jaggedCone(r, h, seg, R, jag = 0.25) {
  const g = new THREE.ConeGeometry(r, h, seg, 1, true);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    if (y < 0) {
      const a = Math.atan2(p.getZ(i), p.getX(i));
      const k = Math.round(((a + Math.PI) / TAU) * seg) % 2 ? 1 + jag : 1 - jag * 0.3;
      p.setX(i, p.getX(i) * k);
      p.setZ(i, p.getZ(i) * k);
      p.setY(i, y - (k > 1 ? 0.18 : 0) + (R() - 0.5) * 0.1);
    }
  }
  g.computeVertexNormals();
  return g;
}
export function pineTree(seed = 1, scale = 1) {
  foliage();
  const R = rng(seed);
  const g = new THREE.Group();
  g.add(m(CY(0.2, 0.3, 1.1, 6), '#8a4a20', 0, 0.55, 0));
  const tiers = 4;
  for (let i = 0; i < tiers; i++) {
    const r = 1.75 - i * 0.36, h = 1.6 - i * 0.12;
    const cone = new THREE.Mesh(jaggedCone(r, h, 10, R), i % 2 ? pineMat2 : pineMat);
    cone.position.y = 1.2 + i * 0.85 + h / 2;
    cone.rotation.y = R() * TAU;
    g.add(cone);
    // closed underside so the camera never sees through
    const cap = new THREE.Mesh(new THREE.CircleGeometry(r * 0.95, 10), toon('#1f7a33'));
    cap.rotation.x = Math.PI / 2;
    cap.position.y = cone.position.y - h / 2 + 0.05;
    cap.userData.noInk = true;
    g.add(cap);
  }
  g.scale.setScalar(scale);
  ink(g, 0.045);
  shadowed(g);
  return g;
}

export function stump(seed = 1) {
  const g = new THREE.Group();
  const endMat = toon('#ffffff', { map: logEndTex() });
  const side = toon('#9a5a2a', { map: barkTex() });
  const s = new THREE.Mesh(CY(0.55, 0.65, 0.7, 9), [side, endMat, endMat]);
  s.position.y = 0.35;
  g.add(s);
  const R = rng(seed);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + R();
    g.add(m(new THREE.ConeGeometry(0.22, 0.7, 4), '#a8622c', Math.cos(a) * 0.6, 0.12, Math.sin(a) * 0.6, { rx: Math.sin(a) * 1.3, rz: -Math.cos(a) * 1.3 }));
  }
  ink(g, 0.04);
  shadowed(g);
  return g;
}

export function rock(seed = 1, s = 1) {
  const g = new THREE.Group();
  const R = rng(seed);
  const n = 1 + Math.floor(R() * 2);
  for (let i = 0; i < n; i++) {
    const geo = new THREE.DodecahedronGeometry(0.75 - i * 0.2, 0);
    geo.scale(1.2, 0.75, 1);
    const r = m(geo, i ? '#a7ad98' : '#949b86', i * 0.7 - 0.2, 0.32 - i * 0.1, i * 0.4, { ry: R() * TAU, rz: (R() - 0.5) * 0.3 });
    g.add(r);
    g.add(m(geo, '#6aa04e', i * 0.7 - 0.2, 0.4 - i * 0.1, i * 0.4, { ry: r.rotation.y, s: [0.85, 0.5, 0.85], noInk: true }));
  }
  g.scale.setScalar(s);
  ink(g, 0.04);
  shadowed(g);
  return g;
}

// Grey boulders studded with white crystals (mined for ore).
export function oreDeposit(seed = 1) {
  const g = new THREE.Group();
  const R = rng(seed);
  const rocks = [[0, 0.55, 0, 1.1], [0.9, 0.4, 0.5, 0.75], [-0.8, 0.35, 0.4, 0.7], [0.3, 0.3, -0.8, 0.7]];
  for (const [x, y, z, r] of rocks) {
    const geo = new THREE.DodecahedronGeometry(r, 0);
    geo.scale(1.15, 0.8, 1.05);
    g.add(m(geo, R() < 0.5 ? '#a9a49c' : '#bdb8ae', x, y, z, { ry: R() * TAU }));
  }
  const crystals = new THREE.Group();
  for (let i = 0; i < 11; i++) {
    const a = R() * TAU, d = 0.4 + R() * 0.9;
    const c = m(R() < 0.5 ? new THREE.OctahedronGeometry(0.28 + R() * 0.12) : B(0.36, 0.36, 0.36), '#f4f7fb', Math.cos(a) * d, 0.75 + R() * 0.5, Math.sin(a) * d, { rx: R() * 3, ry: R() * 3, emissive: '#8aa0c0', emissiveIntensity: 0.15 });
    crystals.add(c);
  }
  g.add(crystals);
  ink(g, 0.04);
  shadowed(g);
  g.userData = { crystals };
  return g;
}

// ---------------------------------------------------------------- small decor
function flower(kind, R) {
  const g = new THREE.Group();
  const stemH = 0.45 + R() * 0.15;
  g.add(m(CY(0.03, 0.035, stemH, 5), '#3d9b3a', 0, stemH / 2, 0, { ink: 0.018 }));
  for (const s of [-1, 1]) g.add(m(new THREE.SphereGeometry(0.1, 6, 4), '#4fb54a', s * 0.1, 0.1, 0, { s: [1.2, 0.35, 0.6], rz: s * 0.6, ink: 0.015 }));
  if (kind === 'tulip' || kind === 'whiteTulip') {
    const col = kind === 'tulip' ? '#ffd93a' : '#f8f8f0';
    const head = m(new THREE.CylinderGeometry(0.15, 0.08, 0.28, 6), col, 0, stemH + 0.12, 0, { ink: 0.02 });
    g.add(head);
    for (let i = 0; i < 3; i++) g.add(m(new THREE.ConeGeometry(0.07, 0.14, 4), col, Math.cos((i / 3) * TAU) * 0.09, stemH + 0.3, Math.sin((i / 3) * TAU) * 0.09, { noInk: true }));
  } else {
    const col = kind === 'red' ? '#ef3a2a' : '#3f73ef';
    const head = new THREE.Group();
    head.position.y = stemH + 0.04;
    head.rotation.x = -0.5;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU;
      head.add(m(new THREE.SphereGeometry(0.11, 6, 4), col, Math.cos(a) * 0.12, 0, Math.sin(a) * 0.12, { s: [1, 0.35, 1], ink: 0.018 }));
    }
    head.add(m(new THREE.SphereGeometry(0.06, 6, 4), '#ffd23a', 0, 0.04, 0, { noInk: true }));
    g.add(head);
  }
  return g;
}

function tuftGeometry() {
  // fan of pointed blades, darker at the base
  const pos = [], col = [];
  const blades = 7;
  for (let i = 0; i < blades; i++) {
    const a = (i / (blades - 1) - 0.5) * 1.6;
    const h = 0.35 + (1 - Math.abs(a)) * 0.25;
    const x0 = Math.sin(a) * 0.05, x1 = Math.sin(a) * 0.32;
    const w = 0.06;
    pos.push(x0 - w, 0, 0, x0 + w, 0, 0, x1, h, (i % 2) * 0.05);
    col.push(0.22, 0.55, 0.2, 0.22, 0.55, 0.2, 0.55, 0.9, 0.45);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

function bush(seed) {
  foliage();
  const g = new THREE.Group();
  const R = rng(seed);
  for (let i = 0; i < 3; i++) {
    const mesh = new THREE.Mesh(blob(0.75 + R() * 0.25, 1, seed * 3 + i, 0.8), leafMat);
    mesh.position.set((i - 1) * 0.7, 0.55, (R() - 0.5) * 0.5);
    g.add(mesh);
  }
  ink(g, 0.045);
  shadowed(g);
  return g;
}

// ---------------------------------------------------------------- pickups
export function cakeModel() {
  const g = new THREE.Group();
  const tri = new THREE.Shape();
  tri.moveTo(0, 0);
  tri.lineTo(1.0, -0.33);
  tri.lineTo(1.0, 0.33);
  tri.closePath();
  const layer = (h) => new THREE.ExtrudeGeometry(tri, { depth: h, bevelEnabled: false });
  const ys = [0, 0.16, 0.22, 0.38, 0.44];
  const hs = [0.16, 0.06, 0.16, 0.06, 0.12];
  const cols = ['#e2944c', '#fff8ec', '#e2944c', '#fff8ec', '#fff8ec'];
  for (let i = 0; i < ys.length; i++) {
    const l = m(layer(hs[i]), cols[i], -0.5, ys[i], 0, { rx: -Math.PI / 2, ink: 0.03 });
    l.rotation.x = -Math.PI / 2;
    l.position.y = ys[i];
    g.add(l);
  }
  // frosting swirl along the back and a cherry
  for (let i = 0; i < 5; i++) g.add(m(new THREE.SphereGeometry(0.13, 8, 6), '#ffffff', 0.5, 0.6, -0.28 + i * 0.14, { s: [0.9, 0.8, 0.9] }));
  g.add(m(new THREE.SphereGeometry(0.13, 10, 8), '#e01e1e', 0.25, 0.7, 0));
  g.add(m(CY(0.015, 0.015, 0.3, 4), '#4a2a10', 0.3, 0.88, 0.04, { rz: -0.4, noInk: true }));
  g.scale.setScalar(0.9);
  ink(g, 0.03);
  shadowed(g, true, false);
  return g;
}

export function logModel() {
  const g = new THREE.Group();
  const endMat = toon('#ffffff', { map: logEndTex() });
  const bark = toon('#b46a2e', { map: barkTex() });
  const l = new THREE.Mesh(CY(0.3, 0.3, 1.2, 10), [bark, endMat, endMat]);
  l.rotation.z = Math.PI / 2;
  l.position.y = 0.3;
  g.add(l);
  ink(g, 0.035);
  shadowed(g, true, false);
  return g;
}

export function oreChunkModel() {
  const g = new THREE.Group();
  const R = rng(77);
  for (let i = 0; i < 5; i++) {
    g.add(m(i % 2 ? B(0.3, 0.3, 0.3) : new THREE.OctahedronGeometry(0.22), '#eef2f8', (R() - 0.5) * 0.4, 0.2 + R() * 0.25, (R() - 0.5) * 0.4, { rx: R() * 3, ry: R() * 3, emissive: '#9ab0d0', emissiveIntensity: 0.2 }));
  }
  ink(g, 0.03);
  shadowed(g, true, false);
  return g;
}

// ---------------------------------------------------------------- placement
export function buildScenery(scene) {
  const batch = new Batcher();
  const decor = new THREE.Group();
  const R = rng(4242);
  const trees = TREES.map((t) => {
    const model = leafyTree(t.seed);
    model.position.set(t.x, 0, t.z);
    model.rotation.y = R() * TAU;
    const s = 0.95 + R() * 0.2;
    model.scale.setScalar(s);
    scene.add(model);
    const st = stump(t.seed);
    st.position.set(t.x, 0, t.z);
    st.visible = false;
    scene.add(st);
    return { ...t, model, stump: st, hp: 5, regrow: 0 };
  });
  for (const p of PINES) {
    const model = pineTree(p.seed, 0.9 + ((p.seed * 13) % 7) / 14);
    model.position.set(p.x, 0, p.z);
    decor.add(model);
  }
  // highland pines
  for (let i = 0; i < 70; i++) {
    const x = -95 + R() * 190, z = -50 - R() * 26;
    if (highlandSDF(x, z) > -2) continue;
    const model = pineTree(i * 3 + 7, 1 + R() * 0.4);
    model.position.set(x, MAP.highY, z);
    decor.add(model);
  }
  for (const r of ROCKS) {
    const model = rock(r.seed, r.s);
    model.position.set(r.x, 0, r.z);
    decor.add(model);
  }
  const ores = ORES.map((o) => {
    const model = oreDeposit(o.id + 3);
    model.position.set(o.x, 0, o.z);
    scene.add(model);
    return { ...o, model, hp: 6 };
  });
  // flowers, tufts and bushes, kept off roads, castle floors and obstacles
  const okDecor = (x, z) =>
    landSDF(x, z) < -0.8 && roadSDF(x, z) > 0.3 && castleFloorSDF(x, z) > 0.4 && dirtSDF(x, z) > 0.3 && highlandSDF(x, z) > 1 &&
    canStand(x, z) && !OUTPOSTS.some((o) => (o.x - x) ** 2 + (o.z - z) ** 2 < 10) && !CAKES.some((o) => (o.x - x) ** 2 + (o.z - z) ** 2 < 2);
  const kinds = ['red', 'red', 'blue', 'tulip', 'tulip', 'whiteTulip'];
  let placed = 0;
  for (let i = 0; i < 4000 && placed < 520; i++) {
    const x = -76 + R() * 152, z = -38 + R() * 78;
    if (!okDecor(x, z)) continue;
    // flowers grow in little clusters
    const k = kinds[Math.floor(R() * kinds.length)];
    const n = 1 + Math.floor(R() * 3);
    for (let j = 0; j < n; j++) {
      const fx = x + (R() - 0.5) * 1.6, fz = z + (R() - 0.5) * 1.6;
      if (!okDecor(fx, fz)) continue;
      const f = flower(k, R);
      f.position.set(fx, 0, fz);
      f.rotation.y = R() * TAU;
      f.scale.setScalar(0.9 + R() * 0.35);
      decor.add(f);
      placed++;
    }
  }
  const tuftGeo = tuftGeometry();
  const tuftMat = toon('#7fd862', { vertexColors: true, side: THREE.DoubleSide });
  const tufts = new THREE.Group();
  for (let i = 0; i < 9000 && tufts.children.length < 1400; i++) {
    const x = -78 + R() * 156, z = -40 + R() * 80;
    const nearRoad = roadSDF(x, z);
    if (!(landSDF(x, z) < -0.3 && highlandSDF(x, z) > 0.6 && castleFloorSDF(x, z) > 0.2 && (nearRoad > 0.05 || R() < 0.1) && dirtSDF(x, z) > -0.05)) continue;
    const t = new THREE.Mesh(tuftGeo, tuftMat);
    t.position.set(x, 0, z);
    t.rotation.y = R() * TAU;
    t.scale.setScalar(0.8 + R() * 0.7);
    t.userData.noInk = true;
    tufts.add(t);
  }
  tufts.traverse((o) => o.isMesh && (o.receiveShadow = true));
  for (let i = 0; i < 60; i++) {
    const x = -76 + R() * 152, z = -38 + R() * 78;
    if (!okDecor(x, z) || Math.abs(x) < 8) continue;
    const b = bush(i + 1);
    b.position.set(x, 0, z);
    b.scale.setScalar(0.8 + R() * 0.4);
    decor.add(b);
  }
  // stumps for flavour near holes
  for (const h of HOLES.slice(0, 6)) {
    const s = stump(h.x | 0);
    s.position.set(h.x + 2.4, 0, h.z - 1.2);
    if (okDecor(h.x + 2.4, h.z - 1.2)) decor.add(s);
  }
  batch.addObject(decor);
  batch.addObject(tufts);
  const root = new THREE.Group();
  root.name = 'decor';
  batch.build(root);
  scene.add(root);
  return { trees, ores };
}
