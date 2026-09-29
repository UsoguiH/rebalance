// world-props.js - pushable props (clay jars, crates, barrels, footballs, brass lanterns).
// Each prop is its own Object3D (origin = ground contact) so main can move it from the physics body.
import * as THREE from 'three';
import { GeoBuilder, xf } from './world-util.js';
import { ZONE_DEFS, zoneLayout } from './world-layout.js';

const C = (h) => new THREE.Color(h);

function makeGeos() {
  const g = {};
  // clay jar: lathe profile with a teal band and a gold rim
  {
    const prof = [[0.0, 0], [0.26, 0], [0.38, 0.14], [0.46, 0.4], [0.42, 0.66], [0.26, 0.82], [0.22, 0.95], [0.28, 1.02], [0.0, 1.02]].map(([x, y]) => new THREE.Vector2(x, y));
    const b = new GeoBuilder({ ao: 0.25, jitter: 0.05 });
    b.add(new THREE.LatheGeometry(prof, 12), xf(0, 0, 0), (p, n, out) => (p.y > 0.28 && p.y < 0.38 ? out.set(0x0f7c86) : p.y > 0.94 ? out.set(0xe0a458) : p.y > 0.5 && p.y < 0.56 ? out.set(0xf3e2c0) : out.set(0xc8553d)));
    g.jar = { geo: b.build(), r: 0.46, mass: 10 };
  }
  // wooden crate with dark straps
  {
    const b = new GeoBuilder({ ao: 0.2, jitter: 0.06 });
    b.box(0.9, 0.9, 0.9, 0, 0, 0, 0xa8743f);
    for (const s of [-1, 1]) { b.box(0.94, 0.94, 0.12, 0, -0.02, s * 0.32, 0x5a3a1e); b.box(0.12, 0.94, 0.94, s * 0.32, -0.02, 0, 0x5a3a1e); }
    g.crate = { geo: b.build(), r: 0.62, mass: 22 };
  }
  // barrel
  {
    const b = new GeoBuilder({ ao: 0.2, jitter: 0.05 });
    b.cyl(0.46, 0.4, 0.2, 10, 0, 0, 0, 0x7a5230); b.cyl(0.5, 0.5, 0.6, 10, 0, 0.2, 0, 0x8a5e36); b.cyl(0.4, 0.46, 0.2, 10, 0, 0.8, 0, 0x7a5230);
    for (const y of [0.16, 0.5, 0.84]) b.cyl(0.52 - Math.abs(y - 0.5) * 0.15, 0.52 - Math.abs(y - 0.5) * 0.15, 0.07, 10, 0, y, 0, 0x2b2233);
    g.barrel = { geo: b.build(), r: 0.52, mass: 26 };
  }
  // football (soccer ball with dark patches)
  {
    const s = new THREE.IcosahedronGeometry(0.42, 1).toNonIndexed(); s.computeVertexNormals();
    const pos = s.attributes.position, col = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i += 3) {
      const cx = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3, cy = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3, cz = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3;
      const dark = Math.sin(cx * 9.1) * Math.sin(cy * 8.3) * Math.sin(cz * 9.7) > 0.12;
      const c = dark ? C(0x22262e) : C(0xf7f3ea);
      for (let k = 0; k < 3; k++) col.set([c.r, c.g, c.b], (i + k) * 3);
    }
    s.setAttribute('color', new THREE.BufferAttribute(col, 3));
    s.translate(0, 0.42, 0);
    g.ball = { geo: s, r: 0.42, mass: 2.5 };
  }
  // brass lantern with warm glow cage
  {
    const b = new GeoBuilder({ ao: 0.1, jitter: 0.03 });
    b.cyl(0.26, 0.3, 0.12, 8, 0, 0, 0, 0xb8862b); b.cyl(0.22, 0.22, 0.5, 8, 0, 0.12, 0, 0xffc46b);
    for (let i = 0; i < 4; i++) { const a = (i / 4) * 6.283 + 0.78; b.cyl(0.025, 0.025, 0.5, 4, Math.cos(a) * 0.235, 0.12, Math.sin(a) * 0.235, 0xb8862b); }
    b.cone(0.3, 0.22, 8, 0, 0.62, 0, 0xb8862b); b.sph(0.06, 0, 0.87, 0, 0xe0a458, 1, 1, 1, 5, 4);
    g.lantern = { geo: b.build(), r: 0.32, mass: 5, glow: true };
  }
  return g;
}

export function createProps(ctx, zonesMod, decor) {
  const { quality, heightAt, rng, colliders, mats } = ctx;
  const geos = makeGeos();
  const propMats = { std: mats.std, glow: mats.glow };
  const props = [];
  const total = { low: 34, med: 60, high: 74 }[quality] || 50;

  const blocked = (x, z, r) => colliders.some((c) => c.type === 'circle'
    ? Math.hypot(x - c.x, z - c.z) < c.r + r + 0.4
    : Math.abs(x - c.x) < (c.hx || 1) + r + 0.9 && Math.abs(z - c.z) < (c.hz || 1) + r + 0.9);
  const tooClose = (x, z, r) => props.some((p) => Math.hypot(p.x - x, p.z - z) < p.r + r + 0.15);
  const defs = ZONE_DEFS.map((d) => ({ ...d, l: zoneLayout(d) }));
  const inPad = (x, z) => defs.some((d) => Math.hypot(x - d.x, z - d.z) < 7.6);

  function add(type, x, z, yaw = 0) {
    const t = geos[type];
    if (!t || blocked(x, z, t.r) || tooClose(x, z, t.r) || inPad(x, z)) return false;
    const mesh = new THREE.Mesh(t.geo, t.glow ? propMats.glow : propMats.std);
    if (t.glow) { mesh.castShadow = false; } else { mesh.castShadow = true; mesh.receiveShadow = true; }
    mesh.rotation.y = yaw;
    mesh.position.set(x, heightAt(x, z), z);
    mesh.matrixAutoUpdate = true;
    props.push({ type, x, z, r: t.r, mass: t.mass, mesh });
    return true;
  }
  const pick = () => { const r = rng(); return r < 0.3 ? 'jar' : r < 0.5 ? 'crate' : r < 0.68 ? 'barrel' : r < 0.86 ? 'ball' : 'lantern'; };

  // 1) a "jar bowling" triangle in front of the spawn (fun to plough through)
  {
    const cx = -13, cz = 20;
    for (let row = 0; row < 4; row++) for (let i = 0; i <= row; i++) add('jar', cx + (i - row / 2) * 1.15, cz + row * 1.0, rng() * 6.28);
  }
  // 2) a ring of footballs and a crate wall near the spawn
  for (let i = 0; i < 6; i++) { const a = (i / 6) * 6.283; add('ball', 12 + Math.cos(a) * 3.2, 15 + Math.sin(a) * 3.2); }
  for (let i = 0; i < 5; i++) add('crate', 16 + (i % 3) * 1.05, 24 - Math.floor(i / 3) * 1.05 - 6, 0.1 * i);
  // 3) little groups at every zone entrance
  for (const d of defs) {
    const bx = d.x - d.l.ox * 11, bz = d.z - d.l.oz * 11;
    for (let i = 0; i < 4; i++) add(pick(), bx + Math.cos(i * 1.7 + d.x) * 3.4, bz + Math.sin(i * 1.7 + d.x) * 3.4, rng() * 6.28);
  }
  // 4) scatter the rest across the walkable ring
  let guard = 0;
  while (props.length < total && guard++ < 1200) {
    const a = rng() * 6.283, dist = 8 + rng() * 78;
    add(pick(), Math.cos(a) * dist, Math.sin(a) * dist, rng() * 6.283);
  }
  return { props };
}
