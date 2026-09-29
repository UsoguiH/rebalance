// world-decor.js - instanced palms / rocks / bushes / grass, nomad tents, wayfinding flags,
// welcome gate + rug at spawn, and the hoof-print trail (world.stamp).
import * as THREE from 'three';
import { GeoBuilder, xf, smoothstep } from './world-util.js';
import { ZONE_DEFS, zoneLayout, GATE, SPAWN } from './world-layout.js';
import { makeKilimTexture, makeHoofTexture } from './world-textures.js';

const C = (h) => new THREE.Color(h);
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();

function distSeg(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(px - (ax + dx * t), pz - (az + dz * t));
}

/** tapered tube between two points appended to a GeoBuilder */
function taper(gb, a, b, rt, rb, color, seg = 6) {
  const len = a.distanceTo(b);
  const g = new THREE.CylinderGeometry(rt, rb, len, seg, 1, true);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  gb.add(g, new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)), color);
  g.dispose();
}

/** one palm frond: a drooping double-sided leaf strip */
function frond(gb, o, yaw, len, tilt, cLo, cHi) {
  const segs = 7, pts = [];
  const dx = Math.sin(yaw), dz = Math.cos(yaw), px = Math.cos(yaw), pz = -Math.sin(yaw);
  for (let k = 0; k <= segs; k++) {
    const t = k / segs;
    const w = 0.62 * Math.pow(Math.sin(Math.min(1, t * 1.15 + 0.08) * Math.PI * 0.92), 0.7) * (1 - t * 0.35);
    const along = len * t, y = tilt * along - 2.3 * along * along / len;
    pts.push({ x: o.x + dx * along, y: o.y + y, z: o.z + dz * along, w, t });
  }
  for (let k = 0; k < segs; k++) {
    const a = pts[k], b = pts[k + 1];
    const c0 = cLo.clone().lerp(cHi, a.t), c1 = cLo.clone().lerp(cHi, b.t);
    const v = [
      [a.x - px * a.w, a.y - 0.12 * a.w, a.z - pz * a.w, c0], [a.x + px * a.w, a.y - 0.12 * a.w, a.z + pz * a.w, c0],
      [b.x + px * b.w, b.y - 0.12 * b.w, b.z + pz * b.w, c1], [b.x - px * b.w, b.y - 0.12 * b.w, b.z - pz * b.w, c1],
      [a.x, a.y + 0.05, a.z, c0], [b.x, b.y + 0.05, b.z, c1],
    ];
    // two folded quads (V-shaped leaf): left half and right half meeting on the midrib
    const tri = (i, j, k2) => { for (const idx of [i, j, k2]) { gb.p.push(v[idx][0], v[idx][1], v[idx][2]); gb.n.push(0, 1, 0); gb.c.push(v[idx][3].r, v[idx][3].g, v[idx][3].b); gb.u.push(0, 0); } };
    tri(0, 4, 5); tri(0, 5, 3); tri(4, 1, 2); tri(4, 2, 5);
  }
}

function buildPalmGeos() {
  const trunk = new GeoBuilder({ ao: 0.25, jitter: 0.06 });
  const crown = new GeoBuilder({ ao: 0, jitter: 0.08 });
  const N = 8, H = 7.2, lean = 1.6;
  let prev = new THREE.Vector3(0, 0, 0);
  for (let i = 1; i <= N; i++) {
    const t = i / N;
    const cur = new THREE.Vector3(lean * t * t, H * t, 0);
    const r0 = 0.34 - 0.13 * (i - 1) / N, r1 = 0.34 - 0.13 * i / N;
    taper(trunk, prev, cur, r1, r0, i % 2 ? 0x8a6a48 : 0x7a5c3e, 7);
    prev = cur;
  }
  const top = new THREE.Vector3(lean, H, 0);
  for (let i = 0; i < 4; i++) crown.add(new THREE.SphereGeometry(0.2, 6, 4), xf(top.x + Math.cos(i * 1.6) * 0.28, top.y - 0.25, top.z + Math.sin(i * 1.6) * 0.28), 0x5a3a1e);
  const nF = 11;
  for (let i = 0; i < nF; i++) {
    const yaw = (i / nF) * Math.PI * 2 + (i % 2) * 0.2;
    frond(crown, top, yaw, 3.6 + (i % 3) * 0.35, 0.95 - (i % 3) * 0.2, C(0x2f6b34), C(i % 4 === 0 ? 0xa9c95a : 0x7db34a));
  }
  return { trunk: trunk.build(), crown: crown.build() };
}

function buildRockGeo(seed) {
  const g = new THREE.IcosahedronGeometry(1, 1);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const n = Math.sin(x * 3.1 + seed) * Math.cos(z * 2.7 - seed) * 0.16 + Math.sin(y * 4.3 + seed * 2) * 0.1;
    const s = 1 + n;
    p.setXYZ(i, x * s, Math.max(y * s, -0.35) , z * s);
  }
  const ng = g.toNonIndexed(); g.dispose();
  ng.computeVertexNormals();
  const pos = ng.attributes.position, col = new Float32Array(pos.count * 3);
  const lo = C(0x9a6a48), hi = C(0xd2a378), mid = C(0xb98358);
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i), band = Math.floor((y + 0.4) * 3.2) % 2;
    const c = (band ? mid : lo).clone().lerp(hi, smoothstep(-0.2, 1.0, y) * 0.7);
    col.set([c.r, c.g, c.b], i * 3);
  }
  ng.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return ng;
}

export function createDecor(ctx, zonesMod) {
  const { quality, heightAt, meshY, rng, colliders, mats } = ctx;
  const low = quality === 'low', high = quality === 'high';
  const group = new THREE.Group(); group.name = 'decor';
  const N = (a, b, c) => (low ? a : high ? c : b);

  const defs = ZONE_DEFS.map((d) => ({ ...d, l: zoneLayout(d) }));
  const nearZone = (x, z, pad = 0) => defs.some((d) => Math.hypot(x - d.l.cx, z - d.l.cz) < 22 + pad || Math.hypot(x - d.l.lx, z - d.l.lz) < 24 + pad);
  const onPath = (x, z, w) => defs.some((d) => distSeg(x, z, 0, 0, d.x, d.z) < w) || distSeg(x, z, 0, 0, 0, 44) < w;
  const blocked = (x, z, r) => colliders.some((c) => c.type === 'circle' ? Math.hypot(x - c.x, z - c.z) < c.r + r : Math.abs(x - c.x) < (c.hx || 1) + r + 1.5 && Math.abs(z - c.z) < (c.hz || 1) + r + 1.5);
  function scatter(n, { rMin = 14, rMax = 132, pathW = 5, pad = 0, r = 1, tries = 40 } = {}) {
    const out = [];
    for (let i = 0; i < n; i++) {
      for (let t = 0; t < tries; t++) {
        const a = rng() * 6.283, d = rMin + Math.sqrt(rng()) * (rMax - rMin);
        const x = Math.cos(a) * d, z = Math.sin(a) * d;
        if (nearZone(x, z, pad) || onPath(x, z, pathW) || blocked(x, z, r)) continue;
        out.push({ x, z }); break;
      }
    }
    return out;
  }
  const clusters = (centres, per, spread) => { const o = []; for (const c of centres) for (let i = 0; i < per; i++) { const a = rng() * 6.283, d = 2 + rng() * spread; o.push({ x: c.x + Math.cos(a) * d, z: c.z + Math.sin(a) * d }); } return o; };

  // ---------------------------------------------------------------- palms (instanced, swaying)
  const palmGeo = buildPalmGeos();
  const palmSpots = [...ctx.palmList];
  const extra = clusters(scatter(N(2, 4, 6), { rMin: 30, rMax: 118, pad: 2, r: 4 }), 3, 6);
  for (const s of extra) { if (!nearZone(s.x, s.z) && !onPath(s.x, s.z, 4) && !blocked(s.x, s.z, 1)) palmSpots.push({ x: s.x, z: s.z, s: 0.85 + rng() * 0.45, lean: 0.3 + rng() * 0.6, yaw: rng() * 6.283 }); }
  const palmN = palmSpots.length;
  const palmTrunk = new THREE.InstancedMesh(palmGeo.trunk, mats.std, Math.max(1, palmN));
  const palmCrown = new THREE.InstancedMesh(palmGeo.crown, mats.cloth, Math.max(1, palmN));
  for (const m of [palmTrunk, palmCrown]) { m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; group.add(m); }
  palmSpots.forEach((p) => { p.y = heightAt(p.x, p.z) - 0.15; p.ph = rng() * 6.28; colliders.push({ type: 'circle', x: p.x, z: p.z, r: 0.42 * p.s }); });
  function updatePalms(time) {
    palmSpots.forEach((p, i) => {
      const sw = Math.sin(time * 0.9 + p.ph) * 0.018 + Math.sin(time * 1.9 + p.ph * 2) * 0.008;
      _e.set(sw, p.yaw, sw * 0.7, 'YXZ'); _q.setFromEuler(_e);
      _m.compose(_p.set(p.x, p.y, p.z), _q, _s.setScalar(p.s));
      palmTrunk.setMatrixAt(i, _m);
      // fronds ruffle a bit more than the trunk
      const fs = Math.sin(time * 2.3 + p.ph) * 0.03;
      _e.set(sw + fs, p.yaw + Math.sin(time * 0.7 + p.ph) * 0.05, sw * 0.7, 'YXZ'); _q.setFromEuler(_e);
      _m.compose(_p, _q, _s.setScalar(p.s));
      palmCrown.setMatrixAt(i, _m);
    });
    palmTrunk.instanceMatrix.needsUpdate = true; palmCrown.instanceMatrix.needsUpdate = true;
  }
  updatePalms(0);

  // ---------------------------------------------------------------- rocks (instanced) + colliders
  const rockN = N(16, 30, 44);
  const rockGeos = [buildRockGeo(1.3), buildRockGeo(4.1), buildRockGeo(7.7)];
  const rockMeshes = rockGeos.map((g, k) => {
    const cnt = Math.ceil(rockN / 3);
    const m = new THREE.InstancedMesh(g, mats.std, cnt); m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; m.count = 0; group.add(m); return m;
  });
  const rockSpots = scatter(rockN, { rMin: 16, rMax: 128, pathW: 5, r: 2.5 });
  rockSpots.forEach((sp, i) => {
    const m = rockMeshes[i % 3]; if (m.count >= m.instanceMatrix.count) return;
    const big = rng() < 0.22, s = big ? 2.2 + rng() * 2.3 : 0.7 + rng() * 1.2;
    const sy = s * (0.6 + rng() * 0.4);
    _e.set(0, rng() * 6.283, 0); _q.setFromEuler(_e);
    _m.compose(_p.set(sp.x, heightAt(sp.x, sp.z) - 0.18 * sy + 0.1, sp.z), _q, _s.set(s * (0.9 + rng() * 0.3), sy, s * (0.9 + rng() * 0.3)));
    const idx = m.count++; m.setMatrixAt(idx, _m);
    m.setColorAt(idx, _c.setHSL(0.07 + rng() * 0.02, 0.35, 0.8 + rng() * 0.25));
    if (s > 1.0) colliders.push({ type: 'circle', x: sp.x, z: sp.z, r: s * 0.82 });
  });
  for (const m of rockMeshes) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }

  // ---------------------------------------------------------------- dry bushes + grass tufts
  {
    const bg = new GeoBuilder({ ao: 0.3, jitter: 0.08 });
    for (let i = 0; i < 5; i++) { const a = i * 1.3; bg.sph(0.34 + (i % 2) * 0.1, Math.cos(a) * 0.3, 0.32 + (i % 3) * 0.1, Math.sin(a) * 0.3, [0x8a7a3e, 0x9a8a4a, 0x6f6a34][i % 3], 1, 0.75, 1, 6, 4); }
    for (let i = 0; i < 6; i++) { const a = i * 1.1; bg.tube(0, 0, 0, Math.cos(a) * 0.55, 0.7, Math.sin(a) * 0.55, 0.025, 0x5a4020, 4); }
    const n = N(46, 80, 120);
    const bush = new THREE.InstancedMesh(bg.build(), mats.std, n); bush.castShadow = !low; bush.receiveShadow = true; bush.frustumCulled = false;
    const spots = scatter(n, { rMin: 6, rMax: 135, pathW: 3.5, r: 0.8 });
    bush.count = spots.length;
    spots.forEach((sp, i) => {
      _e.set(0, rng() * 6.28, 0); _q.setFromEuler(_e);
      _m.compose(_p.set(sp.x, heightAt(sp.x, sp.z) - 0.05, sp.z), _q, _s.setScalar(0.7 + rng() * 0.9)); bush.setMatrixAt(i, _m);
    });
    group.add(bush);

    const tg = new GeoBuilder({ ao: 0.2, jitter: 0.1 });
    for (let i = 0; i < 7; i++) { const a = i * 0.9; tg.add(new THREE.ConeGeometry(0.05, 0.6 + (i % 3) * 0.18, 4), xf(Math.cos(a) * 0.12, 0.3 + (i % 3) * 0.09, Math.sin(a) * 0.12, Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3), [0xc9b46a, 0xb8a256, 0x9aa85a][i % 3]); }
    const tn = N(80, 150, 260);
    const tufts = new THREE.InstancedMesh(tg.build(), mats.std, tn); tufts.receiveShadow = true; tufts.frustumCulled = false;
    const ts = scatter(tn, { rMin: 4, rMax: 130, pathW: 2.5, r: 0.4, tries: 12 });
    tufts.count = ts.length;
    ts.forEach((sp, i) => {
      _e.set(0, rng() * 6.28, 0); _q.setFromEuler(_e);
      _m.compose(_p.set(sp.x, heightAt(sp.x, sp.z) - 0.03, sp.z), _q, _s.setScalar(0.8 + rng() * 0.9)); tufts.setMatrixAt(i, _m);
    });
    group.add(tufts);
  }

  // ---------------------------------------------------------------- nomad tents (2 camps)
  {
    const sb = new GeoBuilder({ ao: 0.35, jitter: 0.05 }), cb = new GeoBuilder({ ao: 0, jitter: 0.03 });
    const camps = scatter(N(1, 2, 3), { rMin: 55, rMax: 110, pad: 6, r: 6 });
    const cols = [[0xc8553d, 0xf3e2c0], [0x0f7c86, 0xf3e2c0], [0x8f2d2a, 0xe0a458]];
    camps.forEach((c, k) => {
      for (let i = 0; i < 2; i++) {
        const a = i * 2.6 + k, x = c.x + Math.cos(a) * 3.4, z = c.z + Math.sin(a) * 3.4, y = heightAt(x, z);
        const [c1, c2] = cols[(k + i) % 3];
        cb.add(new THREE.ConeGeometry(2.6, 2.2, 4, 1, true), xf(x, y + 1.6, z, 0, Math.PI / 4 + a, 0), (p, n, out) => out.copy(Math.floor((Math.atan2(p.z - z, p.x - x) + Math.PI) / (Math.PI * 2) * 12) % 2 ? C(c1) : C(c2)));
        cb.box(4.2, 0.9, 0.12, x, y, z, c2, a);
        sb.cyl(0.07, 0.09, 2.6, 5, x, y, z, 0x6b4630);
        colliders.push({ type: 'circle', x, z, r: 1.9 });
      }
      const fx = c.x, fz = c.z, fy = heightAt(fx, fz);
      for (let i = 0; i < 7; i++) sb.sph(0.22, fx + Math.cos(i) * 0.7, fy + 0.1, fz + Math.sin(i) * 0.7, 0x7a6a5a, 1, 0.7, 1, 5, 4);
      sb.cone(0.3, 0.8, 5, fx, fy + 0.05, fz, 0xff8a2a);
    });
    if (sb.p.length) { const m = new THREE.Mesh(sb.build(), mats.std); m.castShadow = true; m.receiveShadow = true; group.add(m); }
    if (cb.p.length) { const m = new THREE.Mesh(cb.build(), mats.cloth); m.castShadow = true; m.receiveShadow = true; group.add(m); }
  }

  // ---------------------------------------------------------------- wayfinding flags (spawn -> each pad)
  const flagPoles = [];
  {
    const pg = new GeoBuilder({ ao: 0, jitter: 0 }); pg.cyl(0.05, 0.07, 2.6, 5, 0, 0, 0, 0x6b4630); pg.sph(0.09, 0, 2.62, 0, 0xe0a458, 1, 1, 1, 6, 4);
    const fg = new THREE.PlaneGeometry(1.15, 0.72); fg.translate(0.58, 2.2, 0);
    const spots = [];
    defs.forEach((d) => {
      const len = Math.hypot(d.x, d.z), dirx = d.x / len, dirz = d.z / len;
      for (let t = 18, k = 0; t < len - 10; t += 8.5, k++) {
        const side = k % 2 ? 1 : -1, x = dirx * t - dirz * 2.6 * side, z = dirz * t + dirx * 2.6 * side;
        if (nearZone(x, z) && Math.hypot(x - d.x, z - d.z) < 10) continue;
        spots.push({ x, z, color: d.color, ph: rng() * 6.28, yaw: Math.atan2(dirx, dirz) + side * 0.5 });
      }
    });
    const poles = new THREE.InstancedMesh(pg.build(), mats.std, Math.max(1, spots.length));
    const flags = new THREE.InstancedMesh(fg, new THREE.MeshLambertMaterial({ side: THREE.DoubleSide }), Math.max(1, spots.length));
    poles.castShadow = true; flags.castShadow = false; poles.frustumCulled = flags.frustumCulled = false;
    spots.forEach((s, i) => {
      s.y = heightAt(s.x, s.z);
      _e.set(0, s.yaw, 0); _q.setFromEuler(_e); _m.compose(_p.set(s.x, s.y, s.z), _q, _s.setScalar(1)); poles.setMatrixAt(i, _m);
      flags.setColorAt(i, _c.set(s.color));
    });
    group.add(poles, flags);
    flagPoles.push({ spots, flags });
  }
  function updateFlags(time) {
    const { spots, flags } = flagPoles[0];
    spots.forEach((s, i) => {
      _e.set(Math.sin(time * 2.1 + s.ph) * 0.05, s.yaw + Math.sin(time * 1.7 + s.ph) * 0.28, 0, 'YXZ'); _q.setFromEuler(_e);
      _m.compose(_p.set(s.x, s.y, s.z), _q, _s.set(1, 1, 1)); flags.setMatrixAt(i, _m);
    });
    flags.instanceMatrix.needsUpdate = true;
  }

  // ---------------------------------------------------------------- spawn: welcome gate + rug
  {
    const gb = new GeoBuilder({ ao: 0.45, jitter: 0.05 });
    const gz = GATE.z;
    for (const s of [-1, 1]) {
      gb.box(1.9, 0.6, 1.9, s * 5.8, 0, gz, 0xb08454);
      gb.box(1.5, 7.2, 1.5, s * 5.8, 0.6, gz, (p, n, out) => out.copy(Math.floor(p.y / 1.1) % 2 ? C(0xcfa06a) : C(0xc79358)));
      gb.box(2.1, 0.5, 2.1, s * 5.8, 7.8, gz, 0xb08454);
      gb.cone(0.95, 1.6, 4, s * 5.8, 8.3, gz, C(0x0f7c86));
      gb.cyl(0.05, 0.05, 1.0, 4, s * 5.8, 9.8, gz, C(0xe0a458));
      colliders.push({ type: 'box', x: s * 5.8, z: gz, hx: 0.95, hz: 0.95, rot: 0 });
    }
    gb.box(12.4, 0.7, 1.1, 0, 7.4, gz, 0xc79358);
    gb.box(12.8, 0.3, 1.3, 0, 8.1, gz, 0xb08454);
    for (let i = 0; i < 9; i++) gb.box(0.7, 0.6, 0.7, -5.2 + i * 1.3, 8.4, gz, 0xcfa06a);
    const emissive = new GeoBuilder({ ao: 0, jitter: 0 });
    for (const s of [-1, 1]) { emissive.sph(0.3, s * 3.2, 6.0, gz - 0.9, 0xffc46b, 1, 1.3, 1, 8, 6); emissive.cyl(0.02, 0.02, 1.4, 4, s * 3.2, 6.4, gz - 0.9, 0x2b2233); }
    const m = new THREE.Mesh(gb.build(), mats.std); m.castShadow = true; m.receiveShadow = true; group.add(m);
    group.add(new THREE.Mesh(emissive.build(), mats.glow));
    ctx.addSign({ text: 'أهلًا بك', color: '#ffb347', w: 8.6, h: 3.0, x: 0, y: 11.2, z: gz, parent: group, sub: 'قُد الجمل وزر المحطات' });

    // kilim rug at the start
    const rug = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 8.1), new THREE.MeshLambertMaterial({ map: makeKilimTexture(), polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    rug.rotation.x = -Math.PI / 2; rug.position.set(0, meshY(0, 0) + 0.05, 0); rug.receiveShadow = true; group.add(rug);
  }

  // ---------------------------------------------------------------- hoof-print trail
  const MAXP = N(70, 110, 150), LIFE = 16;
  const hoof = makeHoofTexture();
  const hoofGeo = new THREE.PlaneGeometry(0.42, 0.52); hoofGeo.rotateX(-Math.PI / 2);
  const hoofMesh = new THREE.InstancedMesh(hoofGeo, new THREE.MeshBasicMaterial({ map: hoof, color: 0xffffff, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3, fog: true }), MAXP);
  hoofMesh.frustumCulled = false; hoofMesh.count = 0; hoofMesh.renderOrder = 1; group.add(hoofMesh);
  const prints = []; let head = 0, side = 1;
  const DARK = C(0x6b4a30), SANDC = C(0xd2a86a);
  function stamp(x, z, heading, strength = 1) {
    const sx = Math.cos(heading), sz = -Math.sin(heading);          // camel's right-hand direction
    for (const s of [-1, 1]) {
      const px = x + sx * 0.5 * s + Math.sin(heading) * (s > 0 ? 0.45 : -0.45), pz = z + sz * 0.5 * s + Math.cos(heading) * (s > 0 ? 0.45 : -0.45);
      const rec = { x: px, y: meshY(px, pz) + 0.05, z: pz, yaw: heading + Math.PI, born: performance.now() / 1000, k: 0.65 + strength * 0.35 };
      if (prints.length < MAXP) prints.push(rec); else prints[head] = rec;
      head = (head + 1) % MAXP;
    }
  }
  function updatePrints() {
    const now = performance.now() / 1000;
    hoofMesh.count = prints.length;
    for (let i = 0; i < prints.length; i++) {
      const p = prints[i], age = (now - p.born) / LIFE;
      const sc = age >= 1 ? 0.001 : p.k * (1 - age * 0.3);
      _e.set(0, p.yaw, 0); _q.setFromEuler(_e); _m.compose(_p.set(p.x, p.y, p.z), _q, _s.set(sc, 1, sc));
      hoofMesh.setMatrixAt(i, _m); hoofMesh.setColorAt(i, _c.copy(DARK).lerp(SANDC, Math.min(1, age * 1.05)));
    }
    hoofMesh.instanceMatrix.needsUpdate = true; if (hoofMesh.instanceColor) hoofMesh.instanceColor.needsUpdate = true;
  }

  // ---------------------------------------------------------------- per-frame
  let tick = 0;
  function update(dt, time, p) {
    tick++;
    updatePalms(time);
    if ((tick & 1) === 0) updateFlags(time);
    if (prints.length && (tick & 1) === 1) updatePrints();
  }
  updateFlags(0);

  return { group, update, setNight() {}, stamp, dispose() {}, palms: palmSpots };
}
