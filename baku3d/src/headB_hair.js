// Builder B helper: strand-built silver hair.  FACE SPACE (see headB_geo.js).
import { Wf, ZF, ZB, YLO, YHI } from './headB_geo.js';

function rngMaker(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

const CEN = [0, 0.062, -0.012];
const N_EXP = 2.5;
function inside(x, y, z) {
  if (y < YLO || y > YHI) return false;
  const W = Wf(y); if (Math.abs(x) >= W) return false;
  const f = Math.pow(Math.max(0, 1 - Math.pow(Math.abs(x) / W, N_EXP)), 1 / N_EXP);
  const zm = (ZF(y) + ZB(y)) / 2, d = (ZF(y) - ZB(y)) / 2;
  return Math.abs(z - zm) <= d * f;
}
// outline point of skull cross-section x=x0 in direction phi (0 = front/forward, 90deg = up)
function outline(x0, phi) {
  const dy = Math.sin(phi), dz = Math.cos(phi);
  let lo = 0, hi = 0.3;
  for (let k = 0; k < 28; k++) { const m = (lo + hi) / 2; if (inside(x0, CEN[1] + dy * m, CEN[2] + dz * m)) lo = m; else hi = m; }
  return [CEN[1] + dy * lo, CEN[2] + dz * lo];
}

export const hairline = (x, z) => {
  const ax = Math.abs(x);
  const front = 0.088 - 0.058 * sm(0.025, 0.076, ax) + 0.006 * (1 - Math.min(1, ax / 0.022));
  const t = sm(0.015, -0.040, z);
  return front * (1 - t) + (-0.038) * t;
};

export function buildHair(THREE, style, field, skullGeo) {
  const rnd = rngMaker(7);
  const R = (a, b) => a + (b - a) * rnd();
  const group = new THREE.Group(); group.name = 'hair';

  // ---- buckets per colour
  const palette = [
    { hex: 0xf8f8fa, w: 0.42 }, { hex: 0xe6e8ee, w: 0.26 }, { hex: 0xc9ccd6, w: 0.16 }, { hex: 0xa3a8b6, w: 0.08 },
  ];
  const buckets = palette.map(p => ({ ...p, pos: [], idx: [] }));
  const ink = { hex: 0x4a4e5c, pos: [], idx: [] };
  const inkDeep = { hex: 0x23242e, pos: [], idx: [] };
  const pick = () => { let r = rnd() * 0.92, a = 0; for (const b of buckets) { a += b.w; if (r < a) return b; } return buckets[0]; };

  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const cen = V(...CEN);
  const tmpT = new THREE.Vector3(), tmpN = new THREE.Vector3(), tmpB = new THREE.Vector3();

  // sweep a flat lens ribbon through pts (Vector3[]), widths via wf(t), thickness th
  function strand(bucket, pts, wf, th = 0.0016, cenOverride) {
    const n = pts.length, base = bucket.pos.length / 3;
    const c = cenOverride || cen;
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      tmpT.subVectors(b, a).normalize();
      tmpN.subVectors(pts[i], c).normalize();
      tmpN.addScaledVector(tmpT, -tmpN.dot(tmpT));
      if (tmpN.lengthSq() < 1e-8) tmpN.set(0, 0, 1);
      tmpN.normalize();
      tmpB.crossVectors(tmpT, tmpN).normalize();
      const hw = wf(i / (n - 1)) / 2, p = pts[i], t = th * Math.min(1, 0.4 + 2 * hw / 0.005);
      bucket.pos.push(
        p.x + tmpB.x * hw, p.y + tmpB.y * hw, p.z + tmpB.z * hw,
        p.x + tmpN.x * t, p.y + tmpN.y * t, p.z + tmpN.z * t,
        p.x - tmpB.x * hw, p.y - tmpB.y * hw, p.z - tmpB.z * hw,
        p.x - tmpN.x * t * 0.4, p.y - tmpN.y * t * 0.4, p.z - tmpN.z * t * 0.4);
      if (i < n - 1) {
        const k = base + i * 4;
        for (let s = 0; s < 4; s++) { const a0 = k + s, a1 = k + (s + 1) % 4, b0 = k + 4 + s, b1 = k + 4 + (s + 1) % 4; bucket.idx.push(a0, a1, b0, a1, b1, b0); }
      }
    }
  }
  const taper = (w, rootT = 0.08, tipT = 0.30, tipMin = 0.0) => t => w * Math.min(sm(0, rootT, t) * 0.8 + 0.2, Math.max(tipMin, 1 - sm(1 - tipT, 1, t)));

  // ---- 1. scalp cap (shaded base, hairline-cut)
  {
    const pos = skullGeo.attributes.position, nor = skullGeo.attributes.normal, idxs = skullGeo.index.array;
    const off = new Float32Array(pos.count * 3), keep = new Uint8Array(pos.count);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const crown = 0.0035 + 0.006 * sm(0.07, 0.14, y) * sm(0.04, -0.06, z - 0.03 * 0) ;
      off[i * 3] = x + nor.getX(i) * crown; off[i * 3 + 1] = y + nor.getY(i) * crown; off[i * 3 + 2] = z + nor.getZ(i) * crown;
      keep[i] = y >= hairline(x, z) ? 1 : 0;
    }
    const I = [];
    for (let i = 0; i < idxs.length; i += 3) if (keep[idxs[i]] && keep[idxs[i + 1]] && keep[idxs[i + 2]]) I.push(idxs[i], idxs[i + 1], idxs[i + 2]);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(off, 3));
    geo.setIndex(I);
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, style.toon(0xe4e6ec, { role: 'hair', side: THREE.DoubleSide, hatch: 0.2, outline: 0 }));
    m.name = 'scalp'; group.add(m);
  }

  // ---- 2. slicked-back strands (layered), flowing over the skull on spherical Bezier paths
  function surf(dx, dy, dz) {
    const l = Math.hypot(dx, dy, dz); dx /= l; dy /= l; dz /= l;
    let lo = 0, hi = 0.3;
    for (let k = 0; k < 26; k++) { const m = (lo + hi) / 2; if (inside(CEN[0] + dx * m, CEN[1] + dy * m, CEN[2] + dz * m)) lo = m; else hi = m; }
    return [CEN[0] + dx * lo, CEN[1] + dy * lo, CEN[2] + dz * lo, dx, dy, dz];
  }
  const d2r = Math.PI / 180;
  const layers = 5;
  for (let l = 0; l < layers; l++) {
    for (let az = -104; az <= 104; az += 2.9) {
      const az0 = (az + R(-1, 1)) * d2r, sn = Math.sin(az0), cs = Math.cos(az0);
      const side = sm(48, 100, Math.abs(az)), sgn = az < 0 ? -1 : 1;
      // root: first elevation whose surface point is above the hairline
      let el = -50 * d2r, root = null;
      for (; el < 80 * d2r; el += 2 * d2r) {
        const q = surf(sn * Math.cos(el), Math.sin(el), cs * Math.cos(el));
        if (q[1] >= hairline(q[0], q[2]) - R(-0.002, 0.007) * (l === 0 ? 0.3 : 1)) { root = q; break; }
      }
      if (!root) continue;
      const d0 = V(root[3], root[4], root[5]);
      const xn = sn;
      const viaTop = V(0.30 * xn + 0.50, 1.0, -0.05), viaSide = V(sgn * 0.85, 0.55, -0.55);
      const via = viaTop.clone().multiplyScalar(1 - side).add(viaSide.clone().multiplyScalar(side)).normalize();
      const d1 = V(xn * 0.35 + 0.30 + R(-0.05, 0.05), R(-0.30, -0.12) + 0.2 * side, -0.95).normalize();
      const kk = 1.55 + R(-0.15, 0.15);
      const K = 32, pts = [];
      const eps = 0.0018 + l * 0.0024 + R(0, 0.0014);
      const lift = rnd() < 0.10 ? R(0.004, 0.012) : 0;
      const ph1 = R(0, Math.PI * 2), fr = R(3, 9), amp = R(0.0006, 0.0024);
      const tEnd = R(0.78, 1.0) - (l === 0 ? 0 : 0.0) - (side > 0.5 ? R(0.0, 0.18) : 0);
      for (let k = 0; k <= K; k++) {
        const t = (k / K) * tEnd;
        const a = (1 - t) * (1 - t), b = 2 * t * (1 - t) * kk, c = t * t;
        const dd = V(d0.x * a + via.x * b + d1.x * c, d0.y * a + via.y * b + d1.y * c, d0.z * a + via.z * b + d1.z * c).normalize();
        const q = surf(dd.x, dd.y, dd.z);
        const bump = (0.012 + 0.016 * (1 - 0.3 * side)) * Math.max(0, Math.sin(Math.PI * Math.min(1, t * 1.15))) ** 0.7 * sm(0.0, 0.5, t);
        const e = eps + bump + lift * Math.max(0, Math.sin(Math.PI * t / tEnd)) ** 1.5;
        const wob = Math.sin(t * fr * 3 + ph1) * amp;
        pts.push(V(q[0] + dd.x * e + wob, q[1] + dd.y * e, q[2] + dd.z * e));
      }
      const w0 = R(0.0044, 0.0088) * (1 - 0.2 * side);
      const b = (rnd() < 0.035) ? (rnd() < 0.3 ? inkDeep : ink) : pick();
      strand(b, pts, taper(w0, 0.05, 0.30, 0.0), 0.0015);
      if (l >= 1 && rnd() < 0.16) {
        const q = pts.map((p, i) => p.clone().addScaledVector(tmpN.subVectors(p, cen).normalize(), -0.0014).add(V(0.0018, 0, 0)));
        strand(rnd() < 0.5 ? ink : inkDeep, q, taper(0.0014, 0.1, 0.35), 0.0008);
      }
    }
  }

  // ---- 3. hand-placed hanging locks, bangs and flicks
  function lock(bucket, ctrl, w, th = 0.0017, segs = 26, cenOv) {
    const c = new THREE.CatmullRomCurve3(ctrl.map(p => V(...p)), false, 'catmullrom', 0.5);
    strand(bucket, c.getPoints(segs), taper(w, 0.06, 0.38), th, cenOv);
  }
  // right (viewer's) long bangs: a thick wavy sweep falling from the parting over the temple, hanging beside the cheek
  const lockCen = V(0, 0.04, -0.01);
  for (let i = 0; i < 30; i++) {
    const u = i / 29, jit = () => R(-0.0065, 0.0065);
    const x0 = 0.000 + 0.05 * u;
    const wave = R(0.002, 0.008), sgn = rnd() < 0.5 ? 1 : -1;
    const len = 0.55 + 0.6 * R(0, 1);
    const ctrl = [
      [x0 - 0.02, 0.118 - 0.01 * u, 0.050],
      [x0 + 0.004 + jit(), 0.112 - 0.01 * u, 0.074 + jit()],
      [0.040 + 0.020 * u + jit(), 0.092 - 0.012 * u, 0.094 - 0.006 * u],
      [0.068 + 0.012 * u + wave * sgn, 0.060 - 0.018 * u, 0.094 - 0.012 * u],
      [0.082 + 0.008 * u - wave * sgn, 0.026 - 0.018 * u * len, 0.078 - 0.010 * u],
      [0.088 + 0.006 * u + wave * sgn, -0.006 - 0.040 * len, 0.058 - 0.012 * u],
      [0.084 + 0.012 * u - wave * sgn * 0.5 + 0.008 * u, -0.030 - 0.045 * len, 0.045 - 0.018 * u],
    ];
    lock(rnd() < 0.18 ? buckets[2] : pick(), ctrl, R(0.0050, 0.0105), 0.0020, 30, lockCen);
  }
  // left (viewer's) temple tufts: swept back & flicking outward in ragged points at ear level
  for (let i = 0; i < 18; i++) {
    const u = i / 17, jit = () => R(-0.003, 0.003);
    const ctrl = [
      [-0.050 - 0.020 * u + jit(), 0.090 - 0.04 * u, 0.050 - 0.012 * u],
      [-0.068 - 0.014 * u, 0.064 - 0.034 * u + jit(), 0.044 - 0.006 * u],
      [-0.082 - 0.014 * u, 0.040 - 0.038 * u, 0.030 - 0.01 * u],
      [-0.094 - 0.020 * u + jit(), 0.020 - 0.040 * u, 0.016 - 0.012 * u],
      [-0.104 - 0.032 * u + jit(), 0.004 - 0.036 * u, 0.006 - 0.014 * u],
      [-0.118 - 0.046 * u + jit(), -0.006 - 0.032 * u * R(0.5, 1.3), 0.0 - 0.016 * u],
    ];
    lock(pick(), ctrl, R(0.0050, 0.0095), 0.0017, 24, lockCen);
  }
  // ragged short tufts bulging out on the viewer's left temple / ear
  for (let i = 0; i < 20; i++) {
    const u = i / 19, jit = () => R(-0.004, 0.004), L = R(0.7, 1.3);
    const y0 = 0.075 - 0.075 * u;
    const ctrl = [
      [-0.058 - 0.010 * u, y0 + 0.01, 0.040],
      [-0.078 - 0.012 * u + jit(), y0 - 0.004, 0.030],
      [-0.094 - 0.016 * u * L + jit(), y0 - 0.014 - 0.008 * L, 0.018],
      [-0.108 - 0.026 * u * L + jit(), y0 - 0.030 * L - 0.01, 0.008 - 0.006 * u],
    ];
    lock(pick(), ctrl, R(0.0055, 0.0105), 0.0018, 16, lockCen);
  }
  // sideburn flicks above both ears
  for (const sg of [-1, 1]) for (let i = 0; i < 8; i++) {
    const jit = () => R(-0.002, 0.002);
    const ctrl = [
      [sg * 0.072, 0.040 - 0.004 * i, 0.012],
      [sg * (0.082 + 0.004 * i / 7), 0.014 - 0.004 * i, 0.000],
      [sg * (0.090 + 0.006 * i / 7) + jit(), -0.010 - 0.004 * i, -0.014],
      [sg * (0.094 + 0.014 * i / 7), -0.030 - 0.004 * i, -0.034],
    ];
    lock(pick(), ctrl, R(0.004, 0.0075), 0.0016, 18, lockCen);
  }
  // crown flyaways / swept tips at the back (silhouette)
  for (let i = 0; i < 24; i++) {
    const x0 = R(-0.07, 0.07), jit = () => R(-0.004, 0.004);
    const [y1, z1] = outline(Math.min(Math.abs(x0), 0.07) * Math.sign(x0), 2.2);
    const [y2, z2] = outline(Math.min(Math.abs(x0), 0.07) * Math.sign(x0), 2.8);
    const ctrl = [
      [x0, y1 + 0.004, z1 - 0.002], [x0 * 1.05 + jit(), y2 + 0.012, z2 - 0.012],
      [x0 * 1.2 + jit(), y2 - 0.02, z2 - 0.030], [x0 * 1.3 + R(-0.01, 0.01), y2 - 0.052, z2 - 0.036 - R(0, 0.02)]];
    lock(pick(), ctrl, R(0.006, 0.010), 0.0017, 18);
  }

  // ---- materials / meshes
  const mk = (b, name) => {
    if (!b.pos.length) return;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3));
    geo.setIndex(b.idx);
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, style.toon(b.hex, { role: 'hair', side: THREE.DoubleSide, hatch: 0.0, outline: 0.35 }));
    m.name = name; group.add(m);
  };
  buckets.forEach((b, i) => mk(b, 'hair' + i)); mk(ink, 'hairInk'); mk(inkDeep, 'hairInkDeep');
  return group;
}
