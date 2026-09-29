// camel.js - procedural low-poly dromedary + Arab rider, animated from the ride state.
// Pure Three.js geometry (no assets). Camel faces +Z at heading 0; camel's left is +X.
import * as THREE from 'three';

const V3 = THREE.Vector3, Quat = THREE.Quaternion, M4 = THREE.Matrix4, Col = THREE.Color;
const TAU = Math.PI * 2, DEG = Math.PI / 180;
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const damp = (a, b, rate, dt) => a + (b - a) * (1 - Math.exp(-rate * dt));
const fract = (x) => x - Math.floor(x);

// ------------------------------------------------------------------ palette
const C = {
  coat: 0xc99b5e, coatDark: 0xa87a44, coatLight: 0xe0bd88, belly: 0xe6c894, legLo: 0xb98850,
  hoof: 0x6e4c32, callus: 0x8b6238, nose: 0x6a4a38, lip: 0xb58a5e, mouth: 0x5b2b2b, eye: 0x140c0a,
  ear: 0x9c6c44, tuft: 0x7d5230, red: 0x9c1f2a, teal: 0x14766f, gold: 0xd9a63a, cream: 0xf3ead7,
  leather: 0x6d2a20, brown: 0x3a2a20, skin: 0xb9835a, beard: 0x2b1d15, white: 0xffffff, black: 0x141010,
};

// ------------------------------------------------------------------ tuning knobs (exposed in userData.tuning)
const TUNING = {
  pitchSign: 1,      // state.pitch > 0 assumed nose-up
  rollSign: 1,       // state.roll > 0 assumed left side up (rotation.z positive)
  strideGain: 1,     // multiplies auto foot-slip-free stride estimate
  bobGain: 1,        // body bob amplitude
  riderBounce: 1,    // rider spring excitation
  scarfGain: 1,      // wind on scarf
  leanGain: 1,       // lean into turns
};

// ------------------------------------------------------------------ small deterministic rng
function makeRng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const hash3 = (x, y, z) => { const n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return n - Math.floor(n); };
const wob = (x, y, z) => (Math.sin(x * 9.1 + z * 4.3) + Math.sin(y * 7.7 + x * 3.1) + Math.sin(z * 8.3 + y * 5.9)) / 3;

// ------------------------------------------------------------------ geometry helpers
const _c = new Col(), _c2 = new Col();
function paint(geo, col, jit = 0.05) {
  const p = geo.attributes.position, n = p.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (typeof col === 'function') col(x, y, z, _c); else _c.set(col);
    const j = 1 + jit * (wob(x, y, z) + 0.5 * (hash3(Math.round(x * 40), Math.round(y * 40), Math.round(z * 40)) - 0.5));
    a[i * 3] = _c.r * j; a[i * 3 + 1] = _c.g * j; a[i * 3 + 2] = _c.b * j;
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(a, 3));
  return geo;
}
function fin(g, col, jit) { if (g.attributes.uv) g.deleteAttribute('uv'); return paint(g, col, jit); }

const _m = new M4(), _q = new Quat(), _e = new THREE.Euler(), _v1 = new V3(), _v2 = new V3(), _v3 = new V3();
const AX_X = new V3(1, 0, 0), UP = new V3(0, 1, 0), DOWN = new V3(0, -1, 0);

function Gsph(rx, ry, rz, px, py, pz, col, o = {}) {
  const g = new THREE.SphereGeometry(1, o.w || 10, o.h || 7);
  _q.setFromEuler(_e.set(o.rx || 0, o.ry || 0, o.rz || 0));
  _m.compose(_v1.set(px, py, pz), _q, _v2.set(rx, ry, rz));
  g.applyMatrix4(_m);
  return fin(g, col, o.jit);
}
function Glimb(p0, p1, r0, r1, col, o = {}) {
  const len = p0.distanceTo(p1);
  const g = new THREE.CylinderGeometry(r0, r1, Math.max(len, 1e-4), o.seg || 8, 1, !!o.open);
  _v3.copy(p0).sub(p1).normalize();
  _q.setFromUnitVectors(UP, _v3);
  _m.compose(_v1.copy(p0).add(p1).multiplyScalar(0.5), _q, _v2.set(o.sx || 1, 1, o.sz || 1));
  g.applyMatrix4(_m);
  return fin(g, col, o.jit);
}
const P = (x, y, z) => new V3(x, y, z);
function Gtorus(R, r, px, py, pz, rot, sc, col, seg = 12) {
  const g = new THREE.TorusGeometry(R, r, 6, seg);
  _q.setFromEuler(_e.set(rot[0], rot[1], rot[2]));
  _m.compose(_v1.set(px, py, pz), _q, _v2.set(sc[0], sc[1], sc[2]));
  g.applyMatrix4(_m);
  return fin(g, col, 0.02);
}
// generic lofted surface. fn(s,t,j,k,out) fills out.x,y,z ; colFn(j,k,x,y,z,c)
function Gloft(J, K, fn, o = {}) {
  const nv = (J + 1) * (K + 1), pos = new Float32Array(nv * 3), col = new Float32Array(nv * 3), uv = new Float32Array(nv * 2);
  const out = { x: 0, y: 0, z: 0 }; let i = 0;
  for (let j = 0; j <= J; j++) for (let k = 0; k <= K; k++, i++) {
    fn(j / J, k / K, j, k, out);
    pos[i * 3] = out.x; pos[i * 3 + 1] = out.y; pos[i * 3 + 2] = out.z;
    if (o.colFn) o.colFn(j, k, out.x, out.y, out.z, _c); else _c.set(o.color || 0xffffff);
    const jt = 1 + (o.jit ?? 0.04) * wob(out.x, out.y, out.z);
    col[i * 3] = _c.r * jt; col[i * 3 + 1] = _c.g * jt; col[i * 3 + 2] = _c.b * jt;
    uv[i * 2] = (k / K) * (o.uS || 1); uv[i * 2 + 1] = (j / J) * (o.vS || 1);
  }
  const idx = [];
  for (let j = 0; j < J; j++) for (let k = 0; k < K; k++) {
    const a = j * (K + 1) + k, b = a + K + 1, c = a + 1, d = b + 1;
    if (!o.flip) idx.push(a, b, c, c, b, d); else idx.push(a, c, b, c, d, b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  if (!o.noColor) g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  if (o.uv) g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}
function merge(list) {
  const gs = list.map((g) => (g.index ? g.toNonIndexed() : g));
  let n = 0; for (const g of gs) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3).fill(1);
  let o = 0;
  for (const g of gs) {
    if (!g.attributes.normal) g.computeVertexNormals();
    pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3);
    if (g.attributes.color) col.set(g.attributes.color.array, o * 3);
    o += g.attributes.position.count;
  }
  for (const g of list) g.dispose();
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  out.computeBoundingSphere();
  return out;
}
// interpolate rows [x, a, b, ...] (Catmull-Rom); fills out[]
function keyInterp(keys, x, out) {
  const n = keys.length; let i = 0;
  while (i < n - 2 && x > keys[i + 1][0]) i++;
  const k0 = keys[Math.max(i - 1, 0)], k1 = keys[i], k2 = keys[i + 1], k3 = keys[Math.min(i + 2, n - 1)];
  const t = clamp((x - k1[0]) / (k2[0] - k1[0]), 0, 1), t2 = t * t, t3 = t2 * t;
  for (let c = 1; c < k1.length; c++) {
    const a = k0[c], b = k1[c], cc = k2[c], d = k3[c];
    out[c - 1] = 0.5 * (2 * b + (-a + cc) * t + (2 * a - 5 * b + 4 * cc - d) * t2 + (-a + 3 * b - 3 * cc + d) * t3);
  }
  return out;
}

// ------------------------------------------------------------------ canvas textures
function canvasTex(w, h, draw, repeat) {
  if (typeof document === 'undefined') return null;
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  return t;
}
function blanketTexture() {
  return canvasTex(512, 256, (g, w, h) => {
    const hex = (n) => '#' + n.toString(16).padStart(6, '0');
    g.fillStyle = hex(C.red); g.fillRect(0, 0, w, h);
    // side hem borders (u edges)
    const border = (x0, x1) => {
      g.fillStyle = hex(C.teal); g.fillRect(x0, 0, x1 - x0, h);
      g.fillStyle = hex(C.gold);
      for (let y = 0; y < h; y += 32) { g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y + 16); g.lineTo(x0, y + 32); g.closePath(); g.fill(); }
      g.fillStyle = hex(C.cream); g.fillRect(x0, 0, 6, h); g.fillRect(x1 - 6, 0, 6, h);
    };
    border(0, 56); border(w - 56, w);
    // central field of diamonds
    for (let row = 0; row < 4; row++) for (let i = 0; i < 6; i++) {
      const cx = 96 + i * 64 + (row % 2) * 32, cy = 32 + row * 64;
      if (cx > w - 90) continue;
      g.fillStyle = hex(row % 2 ? C.teal : C.gold);
      g.beginPath(); g.moveTo(cx, cy - 26); g.lineTo(cx + 26, cy); g.lineTo(cx, cy + 26); g.lineTo(cx - 26, cy); g.closePath(); g.fill();
      g.fillStyle = hex(C.cream);
      g.beginPath(); g.moveTo(cx, cy - 11); g.lineTo(cx + 11, cy); g.lineTo(cx, cy + 11); g.lineTo(cx - 11, cy); g.closePath(); g.fill();
    }
    g.strokeStyle = hex(C.gold); g.lineWidth = 4;
    for (const x of [72, w - 72]) { g.beginPath(); for (let y = 0; y <= h; y += 16) g.lineTo(x + ((y / 16) % 2 ? 6 : -6), y); g.stroke(); }
  });
}
function ghutraTexture() {
  return canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#f6f0e4'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#c4262e';
    for (let i = 0; i < 4; i++) { g.fillRect(i * 32 + 12, 0, 7, h); g.fillRect(0, i * 32 + 12, w, 7); }
    g.fillStyle = 'rgba(196,38,46,0.55)';
    for (let y = 0; y < h; y += 8) for (let x = 0; x < w; x += 8) if (((x + y) / 8) % 2 === 0) g.fillRect(x + 2, y + 2, 3, 3);
  }, true);
}

// ------------------------------------------------------------------ body shape (lofted torso)
const TK = [ // z, cy, rx, ry
  [-1.08, 1.52, 0.02, 0.02], [-1.0, 1.52, 0.19, 0.22], [-0.9, 1.52, 0.32, 0.36], [-0.7, 1.52, 0.39, 0.44],
  [-0.35, 1.49, 0.39, 0.45], [0.0, 1.45, 0.38, 0.46], [0.4, 1.40, 0.37, 0.49], [0.75, 1.38, 0.32, 0.48],
  [0.95, 1.40, 0.22, 0.36], [1.03, 1.42, 0.09, 0.17], [1.08, 1.42, 0.02, 0.03],
];
const HUMP = { h: 0.30, z: -0.02, s: 0.34 };
const _s = [0, 0, 0];
function bodyPt(z, a, off, out) {
  keyInterp(TK, z, _s);
  const cy = _s[0], rx = Math.max(_s[1], 0.01) + off, ry = Math.max(_s[2], 0.01) + off, ca = Math.cos(a), sa = Math.sin(a);
  let y = cy + ry * ca;
  if (ca > 0) y += HUMP.h * Math.exp(-(((z - HUMP.z) / HUMP.s) ** 2)) * ca * ca;
  out.x = rx * sa; out.y = y; out.z = z;
}

// ------------------------------------------------------------------ two bone IK (3D)
const _qa = new Quat(), _qb = new Quat(), _d = new V3(), _pl = new V3(), _el = new V3(), _ld = new V3();
function solveLimb(upper, lower, target, pole, L1, L2, outAbsLower) {
  const S = upper.position;
  _d.copy(target).sub(S);
  let D = _d.length(); const maxD = L1 + L2 - 1e-3, minD = Math.abs(L1 - L2) + 1e-3;
  if (D < 1e-5) _d.set(0, -1, 0); else _d.multiplyScalar(1 / D);
  D = clamp(D, minD, maxD);
  const a = (L1 * L1 - L2 * L2 + D * D) / (2 * D), h = Math.sqrt(Math.max(L1 * L1 - a * a, 0));
  _pl.copy(pole).addScaledVector(_d, -pole.dot(_d));
  if (_pl.lengthSq() < 1e-6) _pl.set(1, 0, 0);
  _pl.normalize();
  _el.copy(_d).multiplyScalar(a).addScaledVector(_pl, h); // elbow relative to S
  _ld.copy(_d).multiplyScalar(D).sub(_el).normalize();
  _qa.setFromUnitVectors(DOWN, _v1.copy(_el).normalize());
  upper.quaternion.copy(_qa);
  _qb.setFromUnitVectors(DOWN, _ld);
  lower.quaternion.copy(_qa).invert().multiply(_qb);
  outAbsLower.copy(_qb);
}

class Spring {
  constructor(k, c) { this.k = k; this.c = c; this.x = 0; this.v = 0; }
  step(target, dt, force = 0) {
    const n = Math.max(1, Math.ceil(dt / 0.008)), h = dt / n;
    for (let i = 0; i < n; i++) { this.v += (this.k * (target - this.x) - this.c * this.v + force) * h; this.x += this.v * h; }
    return this.x;
  }
}

// ------------------------------------------------------------------ gait definitions (leg order FL, FR, HL, HR)
const GAITS = {
  walk:   { S: 0.30, H: 0.13, duty: 0.64, off: [0.16, 0.66, 0.0, 0.5] },
  trot:   { S: 0.40, H: 0.20, duty: 0.50, off: [0.03, 0.53, 0.0, 0.5] }, // 'pace': same side together
  gallop: { S: 0.52, H: 0.30, duty: 0.32, off: [0.40, 0.52, 0.0, 0.12] }, // transverse gallop, suspension phase
};
function footCycle(p, gt, S, Hs, out) {
  p = fract(p);
  if (p < gt.duty) { const u = p / gt.duty; out.z = S * (1 - 2 * u); out.y = 0; out.sw = 0; }
  else {
    const u = (p - gt.duty) / (1 - gt.duty), e = lerp(u, sstep(u), 0.6);
    out.z = -S + 2 * S * e;
    out.y = gt.H * Hs * Math.pow(Math.sin(Math.PI * u), 0.75); out.sw = u;
  }
}

// ================================================================== main factory
export function createCamelRider() {
  const rng = makeRng(20240229);
  const disposables = [];
  const track = (o) => { disposables.push(o); return o; };

  // ---- materials
  const matBody = track(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0, flatShading: true }));
  const matCloth = track(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, side: THREE.DoubleSide }));
  const texBlanket = blanketTexture(), texGhutra = ghutraTexture();
  if (texBlanket) track(texBlanket); if (texGhutra) track(texGhutra);
  const matBlanket = track(new THREE.MeshStandardMaterial({ map: texBlanket, color: texBlanket ? 0xffffff : C.red, roughness: 0.95, side: THREE.DoubleSide }));
  const matGhutra = track(new THREE.MeshStandardMaterial({ map: texGhutra, color: texGhutra ? 0xffffff : C.cream, roughness: 0.95, side: THREE.DoubleSide }));

  const meshes = [];
  const mk = (geo, mat, parent, name, shadow = true) => {
    const m = new THREE.Mesh(geo, mat); m.name = name; m.castShadow = shadow; m.receiveShadow = true;
    track(geo); parent.add(m); meshes.push(m); return m;
  };
  const grp = (parent, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };

  // ---- hierarchy
  const root = new THREE.Group(); root.name = 'CamelRider';
  const tilt = grp(root);
  const PIV = 1.3;
  const body = grp(tilt, 0, PIV, 0);
  body.rotation.order = 'YXZ';
  const inner = grp(body, 0, -PIV, 0); // "camel space": ground-based coordinates
  inner.updateMatrix();

  // ================= torso
  {
    const parts = [];
    const torso = Gloft(30, 20, (s, t, j, k, o) => {
      const z = -1.08 + 2.16 * (0.5 - 0.5 * Math.cos(Math.PI * s));
      bodyPt(z, t * TAU, 0, o);
    }, {
      colFn: (j, k, x, y, z, c) => {
        const back = clamp((y - 1.3) / 0.6, 0, 1), belly = clamp((1.2 - y) / 0.25, 0, 1);
        c.set(C.coat).lerp(_c2.set(C.coatDark), back * 0.35).lerp(_c2.set(C.belly), belly * 0.7);
        if (y > 1.98) c.lerp(_c2.set(C.coatDark), 0.3);
      }, jit: 0.05,
    });
    parts.push(torso);
    for (const s of [1, -1]) {
      parts.push(Gsph(0.17, 0.34, 0.38, s * 0.29, 1.42, -0.72, C.coat, { w: 10, h: 8 }));      // haunch
      parts.push(Gsph(0.15, 0.32, 0.29, s * 0.28, 1.35, 0.52, C.coat, { w: 10, h: 8 }));  // shoulder
    }
    parts.push(Gsph(0.2, 0.09, 0.2, 0, 1.0, 0.62, C.callus));                                  // chest pad
    parts.push(Gsph(0.07, 0.09, 0.08, 0, 1.52, -1.03, C.coatDark));                            // tail root
    mk(merge(parts), matBody, inner, 'torso');
  }
  // ================= blanket + gear
  {
    const AMAX = 2.0, Z0 = -0.84, Z1 = 0.44;
    const g = Gloft(14, 18, (s, t, j, k, o) => { bodyPt(Z0 + (Z1 - Z0) * s, (t * 2 - 1) * AMAX, 0.03, o); }, { uv: true, noColor: true });
    mk(g, matBlanket, inner, 'blanket');
    const parts = [];
    const tas = (x, y, z, len, c1, c2) => parts.push(Glimb(P(x, y, z), P(x, y - len, z), 0.008, 0.026, (px, py, pz, c) => c.set(c1).lerp(_c2.set(c2), clamp((y - py) / len, 0, 1)), { seg: 5, jit: 0.02 }));
    const tmp = { x: 0, y: 0, z: 0 };
    for (const s of [-1, 1]) for (let i = 0; i <= 12; i++) {
      bodyPt(Z0 + (Z1 - Z0) * (i / 12), s * AMAX, 0.03, tmp);
      tas(tmp.x, tmp.y, tmp.z, 0.11, i % 2 ? C.gold : C.red, i % 2 ? C.red : C.gold);
    }
    // saddle cushion, cantle, pommel
    parts.push(Gsph(0.31, 0.065, 0.30, 0, 1.955, -0.64, C.leather, { w: 12, h: 6 }));
    parts.push(Gsph(0.27, 0.13, 0.045, 0, 2.03, -0.93, C.leather, { w: 10, h: 6 }));
    parts.push(Gsph(0.045, 0.10, 0.04, 0, 2.03, -0.36, C.leather, { w: 8, h: 6 }));
    parts.push(Gsph(0.03, 0.03, 0.03, 0, 2.13, -0.36, C.gold, { w: 6, h: 5 }));
    parts.push(Gsph(0.03, 0.03, 0.03, 0, 2.16, -0.93, C.gold, { w: 6, h: 5 }));
    // breast collar and girth
    const ring = (zc, r, col, lowerOnly) => {
      let prev = null;
      for (let k = 0; k <= 20; k++) {
        const a = (k / 20) * TAU; if (lowerOnly && Math.cos(a) > 0.2) { prev = null; continue; }
        bodyPt(zc, a, 0.025, tmp); const p = P(tmp.x, tmp.y, tmp.z);
        if (prev) parts.push(Glimb(prev, p, r, r, col, { seg: 5, jit: 0.02 })); prev = p;
      }
    };
    ring(0.60, 0.028, C.red); ring(-0.18, 0.03, C.red, true);
    for (let i = -2; i <= 2; i++) { bodyPt(0.60, Math.PI + i * 0.22, 0.025, tmp); tas(tmp.x, tmp.y, tmp.z, 0.13, C.gold, C.red); }
    mk(merge(parts), matBody, inner, 'gear');
  }

  // ================= legs
  const LEGS = [];
  const legDefs = [
    { name: 'FL', sx: 1, z: 0.58, front: true }, { name: 'FR', sx: -1, z: 0.58, front: true },
    { name: 'HL', sx: 1, z: -0.72, front: false }, { name: 'HR', sx: -1, z: -0.72, front: false },
  ];
  const HIP_Y = 1.24, ANKLE_H = 0.085;
  for (const d of legDefs) {
    const U = d.front ? 0.58 : 0.66, L = d.front ? 0.58 : 0.66;
    const upper = grp(inner, d.sx * 0.2, HIP_Y, d.z), lower = grp(upper, 0, -U, 0), foot = grp(lower, 0, -L, 0);
    const r0 = d.front ? 0.14 : 0.165;
    mk(merge([
      Glimb(P(0, 0, 0), P(0, -U, 0), r0, 0.075, (x, y, z, c) => c.set(C.coat).lerp(_c2.set(C.legLo), clamp(-y / U, 0, 1)), { seg: 8 }),
      Gsph(0.09, 0.09, 0.09, 0, -U, 0.005, C.callus, { w: 8, h: 6 }),
      Gsph(0.12, 0.12, 0.12, 0, 0, 0, C.coat, { w: 8, h: 6 }),
    ]), matBody, upper, d.name + '_upper');
    mk(merge([
      Glimb(P(0, 0, 0), P(0, -L, 0), 0.07, 0.055, C.legLo, { seg: 8 }),
      Gsph(0.072, 0.072, 0.072, 0, -L + 0.02, 0, C.legLo, { w: 8, h: 6 }),
    ]), matBody, lower, d.name + '_lower');
    mk(merge([
      Gsph(0.08, 0.045, 0.115, 0, -0.045, 0.03, C.hoof, { w: 10, h: 6 }),
      Gsph(0.04, 0.035, 0.05, 0.035, -0.05, 0.11, C.hoof, { w: 6, h: 5 }),
      Gsph(0.04, 0.035, 0.05, -0.035, -0.05, 0.11, C.hoof, { w: 6, h: 5 }),
    ]), matBody, foot, d.name + '_foot');
    LEGS.push({ ...d, upper, lower, foot, U, L, hip: upper.position, plant: false, prevP: 0, pole: P(0, 0, d.front ? 1 : -1), rest: d.front ? 0.03 : -0.05 });
  }

  // ================= neck / head
  const NL = 0.3;
  const NR = [0.25, 0.22, 0.19, 0.17, 0.15, 0.125];
  const NECK_REST = [55, -20, -20, -15, 15].map((v) => v * DEG);
  const neckBase = grp(inner, 0, 1.55, 0.68);
  const nk = []; let par = neckBase;
  for (let i = 0; i < 5; i++) {
    const g = i === 0 ? neckBase : grp(par, 0, NL, 0);
    const parts = [
      Glimb(P(0, 0, 0), P(0, NL, 0), NR[i], NR[i + 1], (x, y, z, c) => c.set(C.coat).lerp(_c2.set(C.coatLight), clamp(z / 0.2, 0, 1) * 0.35), { seg: 8, sx: 0.88 }),
      Gsph(NR[i + 1] * 0.88, NR[i + 1], NR[i + 1] * 0.9, 0, NL, 0, C.coat, { w: 8, h: 6 }),
    ];
    if (i >= 1) for (let k = 0; k < 3; k++) parts.push(Glimb(P(0, 0.05 + k * 0.09, NR[i] * 0.85), P(0, -0.02 + k * 0.09, NR[i] * 0.85 + 0.03), 0.012, 0.0, C.tuft, { seg: 4 }));
    mk(merge(parts), matBody, g, 'neck' + i);
    nk.push(g); par = g;
    if (i === 0) g.rotation.order = 'XYZ';
  }
  // neck segments positioned at (0,NL,0) relative to previous; first sits at neckBase
  const head = grp(nk[4], 0, NL, 0);
  const ears = []; let lashMesh = null, jaw = null;
  const HP = 0.42; // rein ring z
  {
    const parts = [
      Gsph(0.115, 0.12, 0.19, 0, 0, 0.10, C.coat, { w: 10, h: 8 }),
      Gsph(0.09, 0.07, 0.10, 0, 0.06, 0.15, C.coat, { w: 8, h: 6 }),
      Gsph(0.085, 0.085, 0.19, 0, -0.055, 0.36, C.coat, { rx: 0.12, w: 10, h: 8 }),
      Gsph(0.08, 0.055, 0.09, 0, -0.095, 0.50, C.lip, { w: 8, h: 6 }),
      Gsph(0.06, 0.045, 0.05, 0, -0.075, 0.58, C.nose, { w: 8, h: 6 }),
      Gsph(0.014, 0.02, 0.012, 0.03, -0.07, 0.615, C.black, { w: 5, h: 4 }),
      Gsph(0.014, 0.02, 0.012, -0.03, -0.07, 0.615, C.black, { w: 5, h: 4 }),
      Gsph(0.06, 0.03, 0.14, 0, -0.085, 0.30, C.mouth, { w: 6, h: 4 }),
    ];
    for (const s of [1, -1]) {
      parts.push(Gsph(0.05, 0.07, 0.09, s * 0.1, -0.06, 0.12, C.coat, { w: 7, h: 6 }));
      parts.push(Gsph(0.026, 0.03, 0.03, s * 0.106, 0.03, 0.17, C.eye, { w: 7, h: 6 }));
      parts.push(Gsph(0.009, 0.009, 0.009, s * 0.125, 0.043, 0.19, C.white, { w: 4, h: 3, jit: 0 }));
      parts.push(Gsph(0.03, 0.02, 0.05, s * 0.1, 0.075, 0.17, C.coatDark, { w: 6, h: 5 }));
      // halter ring + tassel
      parts.push(Gsph(0.022, 0.022, 0.022, s * 0.105, -0.05, HP, C.gold, { w: 6, h: 5 }));
      parts.push(Glimb(P(s * 0.11, -0.07, 0.33), P(s * 0.11, -0.2, 0.33), 0.008, 0.03, (x, y, z, c) => c.set(C.gold).lerp(_c2.set(C.red), clamp((-0.07 - y) / 0.13, 0, 1)), { seg: 5 }));
    }
    for (let k = 0; k < 3; k++) parts.push(Glimb(P(0, 0.11, -0.02 - k * 0.03), P(0, 0.18, -0.09 - k * 0.03), 0.02, 0.0, C.tuft, { seg: 4 }));
    // halter straps
    const rr = (zc, cy, rx, ry, r) => { let prev = null; for (let k = 0; k <= 14; k++) { const a = (k / 14) * TAU, p = P(rx * Math.sin(a), cy + ry * Math.cos(a), zc); if (prev) parts.push(Glimb(prev, p, r, r, C.red, { seg: 4, jit: 0.02 })); prev = p; } };
    rr(HP, -0.062, 0.096, 0.094, 0.011); rr(0.02, 0.0, 0.122, 0.128, 0.012);
    for (const s of [1, -1]) parts.push(Glimb(P(s * 0.098, -0.05, HP), P(s * 0.125, 0.02, 0.03), 0.009, 0.009, C.red, { seg: 4 }));
    mk(merge(parts), matBody, head, 'head');
    // lashes (togglable)
    const lp = [];
    for (const s of [1, -1]) for (let i = 0; i < 5; i++) {
      const z = 0.145 + i * 0.014, y = 0.052 + Math.sin(i / 4 * Math.PI) * 0.006;
      lp.push(Glimb(P(s * 0.112, y, z), P(s * 0.135, y + 0.035, z + 0.006), 0.004, 0.0, C.black, { seg: 3, jit: 0 }));
    }
    lashMesh = mk(merge(lp), matBody, head, 'lashes', false);
    // ears
    for (const s of [1, -1]) {
      const eg = grp(head, s * 0.075, 0.1, -0.01);
      mk(merge([Gsph(0.032, 0.075, 0.02, 0, 0.06, 0, C.coat, { w: 7, h: 6 }), Gsph(0.02, 0.05, 0.012, 0, 0.06, 0.01, C.ear, { w: 6, h: 5 })]), matBody, eg, 'ear');
      ears.push(eg);
    }
    // jaw
    jaw = grp(head, 0, -0.03, 0.12);
    const J = P(0, 0.03, -0.12);
    const jp = [
      Gsph(0.07, 0.045, 0.17, 0, -0.105, 0.30, C.coat, { w: 8, h: 6 }), Gsph(0.06, 0.035, 0.06, 0, -0.115, 0.48, C.lip, { w: 7, h: 5 }),
      Glimb(P(0, -0.13, 0.52), P(0, -0.22, 0.5), 0.02, 0.0, C.tuft, { seg: 4 }), Glimb(P(0.015, -0.13, 0.5), P(0.02, -0.2, 0.47), 0.014, 0.0, C.tuft, { seg: 4 }),
    ];
    for (const g of jp) g.translate(J.x, J.y, J.z); // shift by -pivot
    mk(merge(jp), matBody, jaw, 'jaw');
  }
  // ================= tail
  const tailA = grp(inner, 0, 1.56, -1.06), tailB = grp(tailA, 0, -0.3, 0);
  mk(merge([Glimb(P(0, 0, 0), P(0, -0.3, 0), 0.045, 0.032, C.coatDark, { seg: 6 })]), matBody, tailA, 'tail0');
  mk(merge([
    Glimb(P(0, 0, 0), P(0, -0.25, 0), 0.032, 0.025, C.coatDark, { seg: 6 }),
    Glimb(P(0, -0.2, 0), P(0, -0.46, 0.0), 0.05, 0.03, C.tuft, { seg: 6 }), Gsph(0.05, 0.07, 0.05, 0, -0.42, 0, C.tuft, { w: 7, h: 6 }),
  ]), matBody, tailB, 'tail1');

  // ================= rider
  const rider = grp(inner, 0, 1.98, -0.64);
  const sway = grp(rider);
  const torso = grp(sway);
  const rTorsoGeo = (() => {
    const parts = [];
    const TR = [[-0.04, 0.30, 0.26], [0.05, 0.28, 0.24], [0.2, 0.205, 0.175], [0.38, 0.225, 0.18], [0.53, 0.255, 0.17], [0.62, 0.20, 0.14], [0.67, 0.09, 0.09], [0.71, 0.05, 0.05]];
    const o = [0, 0, 0];
    parts.push(Gloft(16, 20, (s, t, j, k, out) => {
      const y = -0.04 + 0.75 * s; keyInterp(TR, y, o);
      const th = t * TAU, fold = 1 + 0.045 * Math.sin(6 * th + 5 * y) * (1 - 0.6 * sstep(y / 0.6));
      out.x = o[0] * fold * Math.sin(th); out.z = o[1] * fold * Math.cos(th); out.y = y;
    }, { flip: true, colFn: (j, k, x, y, z, c) => { c.set(C.cream); if (y > 0.66) c.set(C.skin); c.multiplyScalar(0.94 + 0.08 * Math.sin(6 * (k / 20 * TAU) + 5 * y)); }, jit: 0.02 }));
    // bisht (open front)
    const BR = [[0.02, 0.33, 0.28], [0.22, 0.26, 0.21], [0.42, 0.275, 0.215], [0.58, 0.30, 0.215], [0.66, 0.18, 0.15], [0.70, 0.10, 0.09]];
    const th0 = 0.6;
    parts.push(Gloft(14, 18, (s, t, j, k, out) => {
      const y = 0.02 + 0.68 * s; keyInterp(BR, y, o);
      const th = th0 + (TAU - 2 * th0) * t, fold = 1 + 0.03 * Math.sin(7 * th + 4 * y);
      out.x = o[0] * fold * Math.sin(th); out.z = o[1] * fold * Math.cos(th) - 0.005; out.y = y;
    }, { flip: true, colFn: (j, k, x, y, z, c) => { const edge = k === 0 || k === 18 || j === 0; c.set(edge ? C.gold : C.brown); }, jit: 0.03 }));
    // belt + dagger
    parts.push(Gtorus(0.2, 0.02, 0, 0.2, 0.0, [Math.PI / 2, 0, 0], [1.0, 0.86, 1], C.red, 14));
    parts.push(Glimb(P(0.03, 0.21, 0.19), P(0.11, 0.06, 0.2), 0.025, 0.02, C.gold, { seg: 5 }));
    parts.push(Glimb(P(0.11, 0.06, 0.2), P(0.16, -0.01, 0.2), 0.02, 0.008, C.brown, { seg: 5 }));
    return merge(parts);
  })();
  mk(rTorsoGeo, matCloth, torso, 'rider_torso');
  // head
  const rhead = grp(torso, 0, 0.70, 0);
  {
    const parts = [
      Gsph(0.125, 0.145, 0.135, 0, 0.14, 0, C.skin, { w: 12, h: 9, jit: 0.02 }),
      Gsph(0.03, 0.04, 0.04, 0, 0.12, 0.135, C.skin, { w: 6, h: 5 }),
      Gsph(0.025, 0.017, 0.012, 0.05, 0.17, 0.118, C.white, { w: 6, h: 5, jit: 0 }), Gsph(0.025, 0.017, 0.012, -0.05, 0.17, 0.118, C.white, { w: 6, h: 5, jit: 0 }),
      Gsph(0.012, 0.012, 0.01, 0.05, 0.17, 0.126, C.black, { w: 5, h: 4, jit: 0 }), Gsph(0.012, 0.012, 0.01, -0.05, 0.17, 0.126, C.black, { w: 5, h: 4, jit: 0 }),
      Gsph(0.038, 0.011, 0.012, 0.05, 0.205, 0.125, C.beard, { rz: -0.15, w: 6, h: 4, jit: 0 }), Gsph(0.038, 0.011, 0.012, -0.05, 0.205, 0.125, C.beard, { rz: 0.15, w: 6, h: 4, jit: 0 }),
      Gsph(0.05, 0.014, 0.02, 0, 0.088, 0.128, C.beard, { w: 8, h: 4 }),
      Gsph(0.02, 0.006, 0.006, 0, 0.068, 0.133, C.mouth, { w: 6, h: 4, jit: 0 }),
      Gsph(0.088, 0.07, 0.08, 0, 0.035, 0.085, C.beard, { w: 9, h: 6 }),
      Gsph(0.02, 0.06, 0.05, 0.105, 0.1, 0.05, C.beard, { w: 5, h: 5 }), Gsph(0.02, 0.06, 0.05, -0.105, 0.1, 0.05, C.beard, { w: 5, h: 5 }),
      Gsph(0.015, 0.03, 0.02, 0.128, 0.14, 0, C.skin, { w: 5, h: 5 }), Gsph(0.015, 0.03, 0.02, -0.128, 0.14, 0, C.skin, { w: 5, h: 5 }),
      Gtorus(0.172, 0.014, 0, 0.27, 0, [Math.PI / 2 + 0.12, 0, 0], [1, 1, 1], C.black, 18),
      Gtorus(0.174, 0.014, 0, 0.30, -0.005, [Math.PI / 2 + 0.12, 0, 0], [1, 1, 1], C.black, 18),
    ];
    mk(merge(parts), matCloth, rhead, 'rider_head');
    const gh = Gloft(12, 22, (s, t, j, k, out) => {
      const th0 = 0.9 * sstep((s - 0.36) / 0.2), th = th0 + (TAU - 2 * th0) * t;
      let y, r;
      if (s < 0.4) { const phi = (s / 0.4) * 72 * DEG; y = 0.16 + 0.21 * Math.cos(phi); r = 0.02 + 0.19 * Math.sin(phi); }
      else { const u = (s - 0.4) / 0.6, back = 0.5 - 0.5 * Math.cos(th); y = 0.21 * Math.cos(72 * DEG) + 0.16 - u * (0.42 + 0.14 * back); r = 0.19 * Math.sin(72 * DEG) + 0.02 + 0.13 * Math.sin(u * 2.2) * (1 - 0.35 * back * u) + 0.02 * Math.sin(5 * th) * u; y -= 0.035 * Math.sin(6 * th) * u; }
      out.x = r * Math.sin(th); out.z = r * Math.cos(th) - 0.01; out.y = y;
    }, { flip: true, uv: true, noColor: true, uS: 2, vS: 2 });
    mk(gh, matGhutra, rhead, 'ghutra');
  }
  // arms
  const ARMS = [];
  for (const sx of [1, -1]) {
    const up = grp(torso, sx * 0.25, 0.56, 0), lo = grp(up, 0, -0.30, 0);
    mk(merge([Glimb(P(0, 0, 0), P(0, -0.30, 0), 0.08, 0.06, C.brown, { seg: 7 }), Gsph(0.085, 0.085, 0.085, 0, 0, 0, C.brown, { w: 8, h: 6 })]), matCloth, up, 'arm_up');
    mk(merge([
      Glimb(P(0, 0, 0), P(0, -0.27, 0), 0.058, 0.05, C.cream, { seg: 7 }), Gsph(0.06, 0.06, 0.06, 0, 0, 0, C.cream, { w: 8, h: 6 }),
      Glimb(P(0, -0.24, 0), P(0, -0.275, 0), 0.056, 0.056, C.gold, { seg: 7 }),
      Gsph(0.04, 0.05, 0.045, 0, -0.32, 0.01, C.skin, { w: 7, h: 6 }), Gsph(0.02, 0.03, 0.02, sx * -0.03, -0.33, 0.04, C.skin, { w: 5, h: 5 }),
    ]), matCloth, lo, 'arm_lo');
    ARMS.push({ sx, up, lo, q: new Quat(), base: new V3(sx * 0.16, 2.25, -0.17), pole: new V3(sx * 0.7, -0.5, -0.5) });
  }
  // legs (draped)
  const RLEGS = [];
  for (const sx of [1, -1]) {
    const lg = grp(sway, sx * 0.15, 0, 0.02);
    const kn = P(sx * 0.19, -0.12, 0.27), an = P(sx * 0.27, -0.52, 0.06);
    mk(merge([
      Glimb(P(0, 0, 0), kn, 0.11, 0.08, C.cream, { seg: 8 }), Glimb(kn, an, 0.085, 0.06, C.cream, { seg: 8 }),
      Gsph(0.13, 0.11, 0.15, 0, 0.0, 0.05, C.cream, { w: 8, h: 6 }), Gsph(0.09, 0.09, 0.09, kn.x, kn.y, kn.z, C.cream, { w: 7, h: 6 }),
      Gsph(0.07, 0.04, 0.12, an.x, an.y - 0.055, an.z + 0.05, C.brown, { w: 7, h: 5 }), Gsph(0.05, 0.05, 0.05, an.x, an.y + 0.0, an.z, C.skin, { w: 6, h: 5 }),
      Glimb(P(an.x, an.y + 0.1, an.z), P(an.x, an.y + 0.0, an.z), 0.065, 0.075, C.cream, { seg: 8 }),
    ]), matCloth, lg, 'rider_leg');
    RLEGS.push(lg);
  }

  // ================= dynamic: scarf tails (verlet) & reins
  const NS = 8, SEG = 0.09;
  const tails = [0, 1].map((i) => ({ sx: i ? -1 : 1, p: Array.from({ length: NS }, () => new V3()), pp: Array.from({ length: NS }, () => new V3()), init: false }));
  const tailGeo = new THREE.BufferGeometry();
  {
    const nv = 2 * NS * 2, pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), idx = [];
    for (let t = 0; t < 2; t++) for (let i = 0; i < NS; i++) for (let s = 0; s < 2; s++) {
      const v = (t * NS + i) * 2 + s; uv[v * 2] = s * 0.5; uv[v * 2 + 1] = i / (NS - 1) * 1.5;
      if (i < NS - 1 && s === 0) { idx.push(v, v + 2, v + 1, v + 1, v + 2, v + 3); }
    }
    tailGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    tailGeo.setAttribute('normal', new THREE.BufferAttribute(nor, 3).setUsage(THREE.DynamicDrawUsage));
    tailGeo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); tailGeo.setIndex(idx);
  }
  const tailMesh = mk(tailGeo, matGhutra, inner, 'scarf_tails'); tailMesh.frustumCulled = false;
  const NR2 = 9, reinGeo = new THREE.BufferGeometry();
  {
    const nv = 2 * NR2 * 4, pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), col = new Float32Array(nv * 3), idx = [];
    _c.set(C.red);
    for (let i = 0; i < nv; i++) { col[i * 3] = _c.r; col[i * 3 + 1] = _c.g; col[i * 3 + 2] = _c.b; }
    for (let r = 0; r < 2; r++) for (let i = 0; i < NR2 - 1; i++) for (let s = 0; s < 4; s++) {
      const a = (r * NR2 + i) * 4 + s, b = (r * NR2 + i) * 4 + (s + 1) % 4;
      idx.push(a, a + 4, b, b, a + 4, b + 4);
    }
    reinGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    reinGeo.setAttribute('normal', new THREE.BufferAttribute(nor, 3).setUsage(THREE.DynamicDrawUsage));
    reinGeo.setAttribute('color', new THREE.BufferAttribute(col, 3)); reinGeo.setIndex(idx);
  }
  const reinMesh = mk(reinGeo, matBody, inner, 'reins'); reinMesh.frustumCulled = false; reinMesh.castShadow = false;

  // ================= state / animation variables
  const W = { idle: 1, walk: 0, trot: 0, gallop: 0 };
  let T = 0, prevPhase = 0, cyc = 3.5, prevHeading = 0, yawRate = 0, steerSign = -1, turnCmd = 0, turnAct = 0;
  let sprintW = 0, brakeW = 0, callAmt = 0, callTimer = 0, prevSpeed = 0, accel = 0;
  let pitchS = 0, rollS = 0, prevBodyY = 0, prevBodyVy = 0, bodyAy = 0, prevBodyPitch = 0, prevBodyPV = 0, bodyPA = 0;
  let lastBumpT = null, bumpKick = 0, bumpV = 0;
  const earT = [rng() * 3 + 1, rng() * 3 + 2], earF = [0, 0];
  const sprY = new Spring(190, 14), sprP = new Spring(55, 8), sprR = new Spring(55, 8), sprBump = new Spring(90, 7);
  let headYaw = 0, headTilt = 0, lookAmt = 0;
  const invM = new M4(), tmpT = new V3(), qLow = new Quat(), qFoot = new Quat(), m2 = new M4();
  const handLocal = ARMS.map(() => new V3());
  const stats = { drawCalls: meshes.length, triangles: 0 };
  for (const m of meshes) { const g = m.geometry; stats.triangles += (g.index ? g.index.count : g.attributes.position.count) / 3; }
  let quality = 'high';
  const anchors = { head: head, riderHead: rhead, seat: rider, feet: LEGS.map((l) => l.foot), body: inner };
  const cyc1 = { z: 0, y: 0, sw: 0 };

  function playCall(dur = 1.6) { callTimer = dur; }

  function update(dt, state, time) {
    dt = clamp(dt || 0, 0, 0.05);
    const s = state || {};
    T += dt; const t = typeof time === 'number' ? time : T;
    const speed = s.speed || 0, aspeed = Math.abs(speed), phase = s.gaitPhase || 0;
    const speedN = clamp(aspeed / 10, 0, 1);

    // gait weights (damped -> no popping)
    const gname = s.gait === 'walk' || s.gait === 'trot' || s.gait === 'gallop' ? s.gait : 'idle';
    let sum = 0;
    for (const k in W) { W[k] = damp(W[k], k === gname ? 1 : 0, 6, dt); sum += W[k]; }
    for (const k in W) W[k] /= sum;
    sprintW = damp(sprintW, s.sprint ? 1 : 0, 5, dt);
    brakeW = damp(brakeW, s.braking && aspeed > 0.8 ? 1 : 0, 8, dt);
    callTimer = Math.max(0, callTimer - dt); callAmt = damp(callAmt, callTimer > 0 ? 1 : 0, 6, dt);

    // stride estimate (slip-free)
    let dph = phase - prevPhase; dph -= Math.round(dph); prevPhase = phase;
    if (dt > 0 && Math.abs(dph) > 1e-5) { const inst = (aspeed * dt) / Math.abs(dph); if (inst < 40 && inst > 0.2) cyc = lerp(cyc, inst, 1 - Math.exp(-4 * dt)); }

    // steering / yaw
    let dh = (s.heading || 0) - prevHeading; dh -= Math.round(dh / TAU) * TAU; prevHeading = s.heading || 0;
    if (dt > 0) yawRate = damp(yawRate, dh / dt, 10, dt);
    const steer = s.steer || 0;
    if (Math.abs(steer) > 0.3 && Math.abs(yawRate) > 0.15) steerSign += (Math.sign(steer * yawRate) - steerSign) * 0.2;
    turnCmd = damp(turnCmd, steer * steerSign, 7, dt);           // + = left (+X)
    turnAct = damp(turnAct, clamp(yawRate / 1.6, -1.5, 1.5), 6, dt);
    accel = damp(accel, dt > 0 ? (speed - prevSpeed) / dt : 0, 6, dt); prevSpeed = speed;

    // terrain tilt
    pitchS = damp(pitchS, (s.pitch || 0) * TUNING.pitchSign, 10, dt);
    rollS = damp(rollS, (s.roll || 0) * TUNING.rollSign, 10, dt);
    tilt.rotation.set(-pitchS, 0, rollS);

    // bump reaction
    const lb = s.lastBump;
    if (lb && lb.t !== lastBumpT) { if (lastBumpT !== null) bumpV += (lb.strength || 0.5) * 9; lastBumpT = lb.t; }
    bumpKick = sprBump.step(0, dt, 0); if (bumpV) { sprBump.v += bumpV; bumpV = 0; }

    // ---- body motion
    const P2 = TAU * phase, wW = W.walk, wT = W.trot, wG = W.gallop;
    const moving = 1 - W.idle;
    let bob = -(0.02 * wW + 0.04 * wT + 0.08 * wG) - 0.03 * sprintW;
    let pitchO = 0, rollO = 0, swayX = 0;
    bob += TUNING.bobGain * (wW * 0.02 * Math.sin(2 * P2 + 0.6) + wT * 0.03 * Math.sin(2 * P2 + 0.4) + wG * 0.085 * Math.cos(P2 - TAU * 0.91));
    rollO += -0.03 * wW * Math.sin(P2 - 0.4) - 0.05 * wT * Math.sin(P2) + 0.012 * wG * Math.sin(P2);
    swayX += 0.02 * wW * Math.sin(P2) + 0.035 * wT * Math.sin(P2);
    pitchO += wG * 0.085 * Math.cos(P2 - TAU * 0.25) + 0.012 * wT * Math.sin(2 * P2) + 0.008 * wW * Math.sin(2 * P2);
    // idle breathing
    const breath = Math.sin(t * 1.7);
    bob += W.idle * 0.004 * breath;
    // brake pose: weight back
    pitchO += 0.13 * brakeW + 0.03 * sprintW * 0; bob -= 0.03 * brakeW;
    const slipRoll = (s.slip || 0) * 0.05 * Math.sin(t * 25) ;
    // lean into turns
    const spdF = clamp(aspeed / 4, 0, 1);
    const lean = (0.55 * turnAct + 0.45 * turnCmd * spdF) * spdF * 0.15 * TUNING.leanGain;
    const bodyRoll = rollO - lean + slipRoll;   // rz: + = left side up; turning left -> rz negative
    const bodyPitch = pitchO + 0.02 * bumpKick;       // nose-up positive
    const bodyY = bob + 0.05 * bumpKick;
    body.position.set(swayX, PIV + bodyY, 0);
    body.rotation.set(-bodyPitch, -turnAct * 0.02, bodyRoll);
    body.scale.set(1, 1, 1);
    body.updateMatrix();
    invM.multiplyMatrices(body.matrix, inner.matrix).invert();
    // torso breathing
    {
      const tm = inner.children[0]; if (tm) tm.scale.set(1 + 0.004 * breath, 1 + 0.008 * breath, 1);
    }

    // ---- legs
    const domG = wG > 0.5 ? 'gallop' : wT > 0.4 ? 'trot' : 'walk';
    for (let i = 0; i < 4; i++) {
      const L = LEGS[i];
      let fz = 0, fy = 0, sw = 0;
      for (const g of ['walk', 'trot', 'gallop']) {
        const w = W[g]; if (w < 1e-3) continue;
        const gt = GAITS[g];
        const Sg = clamp(0.5 * gt.duty * cyc * TUNING.strideGain, 0.65 * gt.S, 1.45 * gt.S) * (1 + 0.1 * sprintW);
        footCycle(phase - gt.off[i], gt, Sg, 1 + 0.2 * sprintW, cyc1);
        fz += w * cyc1.z; fy += w * cyc1.y; sw += w * cyc1.sw;
      }
      // braking: plant front legs forward, hind under
      fz = lerp(fz, L.front ? 0.28 : 0.18, brakeW); fy = lerp(fy, 0, brakeW); sw *= 1 - brakeW;
      // footfall events
      const gt = GAITS[domG], lp = fract(phase - gt.off[i]);
      if (W.idle < 0.7 && aspeed > 0.5 && ((s.gaitPhase || 0) !== 0)) {
        const wrapped = Math.abs(lp - L.prevP) > 0.5 && (speed >= 0 ? lp < L.prevP : lp > L.prevP);
        if (wrapped && root.userData.onFootfall) root.userData.onFootfall(i, clamp(0.4 + speedN, 0, 1));
      }
      L.prevP = lp;
      tmpT.set(L.hip.x, ANKLE_H + fy, L.hip.z + L.rest + fz).applyMatrix4(invM);
      solveLimb(L.upper, L.lower, tmpT, L.pole, L.U, L.L, qLow);
      const toe = 0.55 * Math.sin(Math.PI * sw) * (0.5 - sw) * 2;
      qFoot.setFromAxisAngle(AX_X, toe);
      L.foot.quaternion.copy(qLow).invert().multiply(qFoot);
      L.plant = fy < 0.01;
    }

    // ---- neck & head
    const idleLookT = Math.sin(t * 0.31) * Math.sin(t * 0.13 + 1.0);
    lookAmt = damp(lookAmt, W.idle > 0.6 ? 1 : 0, 2, dt);
    const idleYaw = 0.35 * idleLookT * lookAmt;
    const tiltGate = sstep((Math.sin(t * 0.21 + 2.0) - 0.75) / 0.2);
    headTilt = damp(headTilt, 0.16 * tiltGate * lookAmt, 3, dt);
    const gaitAmp = 0.5 * wW + 0.8 * wT + 1.4 * wG + 0.4 * sprintW;
    const stretch = sprintW, callU = callAmt, brk = brakeW;
    const STRETCH = [15, 15, 10, 0, -5].map((v) => v * DEG);
    const CALL = [-15, 0, 0, 5, -5].map((v) => v * DEG);
    const BRK = [-8, 3, 5, 5, 0].map((v) => v * DEG);
    const yawTot = turnCmd * 0.5 + idleYaw;
    for (let i = 0; i < 5; i++) {
      const wv = 0.02 + 0.015 * i;
      let a = NECK_REST[i] + stretch * STRETCH[i] + callU * CALL[i] + brk * BRK[i];
      a += wv * gaitAmp * Math.sin(P2 - 0.8 * i - 0.3);
      a += 0.006 * Math.sin(t * 1.7 + i * 0.5) * W.idle;
      nk[i].rotation.x = a;
      nk[i].rotation.z = -yawTot * (i === 0 ? 0.05 : 0.11);
      nk[i].rotation.y = 0;
    }
    head.rotation.set(15 * DEG + 0.07 * gaitAmp * Math.sin(P2 - 4.2) + stretch * -0.05 + callU * -0.55 + brk * -0.15 + 0.02 * Math.sin(t * 1.7 + 3), yawTot * 0.55, headTilt);
    // jaw & chewing
    const chew = W.idle > 0.5 ? 0.035 + 0.03 * Math.sin(t * 4.5) : 0.01;
    const roar = callU * (0.45 + 0.06 * Math.sin(t * 24));
    jaw.rotation.x = chew + roar + 0.12 * sprintW * (0.5 + 0.5 * Math.sin(t * 9));
    jaw.rotation.y = W.idle > 0.5 ? 0.05 * Math.sin(t * 2.25) : 0;
    // ears
    for (let e = 0; e < 2; e++) {
      earT[e] -= dt; if (earT[e] < 0) { earF[e] = 0.28; earT[e] = 2 + rng() * 5; }
      let fl = 0; if (earF[e] > 0) { earF[e] -= dt; fl = Math.sin((1 - earF[e] / 0.28) * Math.PI * 2) * Math.exp(-(1 - earF[e] / 0.28) * 0.5); }
      const sx = e === 0 ? 1 : -1;
      const back = Math.max(sprintW, brk * 0.6);
      ears[e].rotation.set(-0.15 - 0.95 * back + 0.5 * fl + 0.08 * Math.sin(t * 0.9 + e * 2) * W.idle + callU * 0.25, 0, sx * (-0.55 + 0.35 * back) + 0.1 * fl);
      ears[e].rotation.z = -sx * (0.55 - 0.3 * back) + 0.12 * fl * sx;
    }
    if (lashMesh) lashMesh.visible = quality !== 'low';

    // ---- tail
    const swish = Math.sin(t * 3.1) * (0.25 + 0.15 * W.idle) + 0.12 * Math.sin(t * 7.3);
    tailA.rotation.set(0.32 + 0.9 * wG * 0.6 + 0.4 * sprintW * 0.3, 0.25 * swish, 0.35 * swish + 0.1 * Math.sin(P2));
    tailB.rotation.set(0.15 + 0.3 * wG, 0.2 * Math.sin(t * 3.1 - 0.9), 0.4 * Math.sin(t * 3.1 - 0.8));

    // ---- rider springs
    const vyB = dt > 0 ? (bodyY - prevBodyY) / dt : 0;
    bodyAy = damp(bodyAy, dt > 0 ? clamp((vyB - prevBodyVy) / dt, -60, 60) : 0, 40, dt);
    prevBodyY = bodyY; prevBodyVy = vyB;
    const ru = clamp(sprY.step(0, dt, -bodyAy * TUNING.riderBounce * 0.9), -0.12, 0.12);
    const leanF = 0.06 * speedN + 0.16 * sprintW - 0.012 * clamp(accel, -6, 6) - 0.12 * brakeW * 0 + 0.05 * brakeW;
    const rp = sprP.step(leanF + 0.55 * (bodyPitch + pitchS), dt);
    const rr = sprR.step(-0.55 * bodyRoll - 0.5 * rollS + turnCmd * -0.05 * spdF, dt);
    sway.position.set(0, ru, 0);
    sway.rotation.set(0, 0, 0);
    torso.rotation.set(rp * 1.0 + 0, -turnCmd * 0.12, rr);
    // shift hips slightly on bounce
    rhead.rotation.set(-0.45 * rp - 0.1 * sprintW + 0.03 * Math.sin(t * 1.3) * W.idle, turnCmd * 0.4 + idleYaw * 0.4, -rr * 0.5);
    for (let k = 0; k < 2; k++) RLEGS[k].rotation.set(0.05 * Math.sin(P2 + k * Math.PI) * moving + 0.04 * (ru * 10), 0, 0);

    // ---- arms (IK to rein grip)
    torso.updateMatrix(); sway.updateMatrix(); rider.updateMatrix();
    m2.copy(rider.matrix).multiply(sway.matrix).multiply(torso.matrix).invert();
    const tension = clamp(0.25 + 0.5 * sprintW + 0.3 * brakeW + 0.2 * Math.abs(turnCmd) + 0.2 * callU, 0, 1);
    for (let a = 0; a < 2; a++) {
      const A = ARMS[a];
      tmpT.copy(A.base);
      tmpT.z += 0.05 * tension - 0.06 * turnCmd * A.sx * -1 * -1 * 0 - 0.06 * turnCmd * (A.sx > 0 ? 1 : -1) * -1 * 0;
      tmpT.z += (A.sx > 0 ? -1 : 1) * 0.05 * turnCmd * -1;
      tmpT.y += ru * 0.5 - 0.02 * tension + 0.02 * Math.sin(P2 * 2) * moving;
      tmpT.applyMatrix4(m2);
      solveLimb(A.up, A.lo, tmpT, A.pole, 0.30, 0.30, A.q);
    }

    // ---- update world matrices, then reins + scarf
    root.updateMatrixWorld(true);
    updateReins(tension);
    updateScarf(dt, t, speed, aspeed, speedN);
  }

  // rein ring / hand positions in inner space
  const ringL = new V3(), ringR = new V3(), hL = new V3(), hR = new V3();
  const rp_ = [new V3(), new V3()];
  function updateReins(tension) {
    const pos = reinGeo.attributes.position.array, nor = reinGeo.attributes.normal.array;
    const rings = [ringL.set(0.105, -0.05, HP), ringR.set(-0.105, -0.05, HP)];
    const hands = [hL.set(0, -0.34, 0.03), hR.set(0, -0.34, 0.03)];
    for (let r = 0; r < 2; r++) {
      const a = head.localToWorld(rings[r].clone()); inner.worldToLocal(a);
      const b = ARMS[r].lo.localToWorld(hands[r].clone()); inner.worldToLocal(b);
      const sx = r === 0 ? 1 : -1, sag = (1 - tension) * 0.32 + 0.04;
      let prev = null; const pts = [];
      for (let i = 0; i < NR2; i++) {
        const u = i / (NR2 - 1), p = new V3().lerpVectors(b, a, u);
        p.x += sx * 0.11 * Math.sin(Math.PI * u) * (u < 0.85 ? 1 : 0.4); p.y -= sag * Math.sin(Math.PI * u) * (1 - 0.3 * u);
        pts.push(p);
      }
      for (let i = 0; i < NR2; i++) {
        const tg = _v1.copy(pts[Math.min(i + 1, NR2 - 1)]).sub(pts[Math.max(i - 1, 0)]).normalize();
        const n1 = _v2.crossVectors(tg, UP); if (n1.lengthSq() < 1e-4) n1.set(1, 0, 0); n1.normalize();
        const n2 = _v3.crossVectors(tg, n1).normalize();
        for (let s = 0; s < 4; s++) {
          const ang = (s / 4) * TAU + Math.PI / 4, cx = Math.cos(ang), sy = Math.sin(ang), rad = 0.011;
          const o = ((r * NR2 + i) * 4 + s) * 3;
          const nx = n1.x * cx + n2.x * sy, ny = n1.y * cx + n2.y * sy, nz = n1.z * cx + n2.z * sy;
          pos[o] = pts[i].x + nx * rad; pos[o + 1] = pts[i].y + ny * rad; pos[o + 2] = pts[i].z + nz * rad;
          nor[o] = nx; nor[o + 1] = ny; nor[o + 2] = nz;
        }
      }
    }
    reinGeo.attributes.position.needsUpdate = true; reinGeo.attributes.normal.needsUpdate = true;
  }

  const anc = new V3(), tan = new V3(), sid = new V3(), gv = new V3(), acc = new V3();
  let scarfAcc = 0;
  function updateScarf(dt, t, speed, aspeed, speedN) {
    const pos = tailGeo.attributes.position.array, nor = tailGeo.attributes.normal.array;
    scarfAcc += dt; const h = 1 / 60; let steps = 0;
    const wind = 0.45 * aspeed * aspeed * TUNING.scarfGain * (speed >= 0 ? -1 : 1);
    while (scarfAcc >= h && steps < (quality === 'low' ? 1 : 3)) {
      scarfAcc -= h; steps++;
      for (let ti = 0; ti < 2; ti++) {
        const T_ = tails[ti], p = T_.p, pp = T_.pp;
        anc.set(T_.sx * 0.1, -0.09, -0.19); rhead.localToWorld(anc); inner.worldToLocal(anc);
        if (!T_.init) { for (let i = 0; i < NS; i++) { p[i].set(anc.x, anc.y - i * SEG, anc.z - 0.02 * i); pp[i].copy(p[i]); } T_.init = true; }
        p[0].copy(anc); pp[0].copy(anc);
        for (let i = 1; i < NS; i++) {
          const v = _v1.copy(p[i]).sub(pp[i]).multiplyScalar(0.965);
          pp[i].copy(p[i]);
          acc.set(0, -7, wind * 0.3 * (1 + 0.2 * i / NS));
          acc.z = wind;
          acc.x = T_.sx * 0.6 * aspeed * 0 - turnAct * aspeed * 0.5 + Math.sin(t * 9 + i * 1.7 + ti * 2) * speedN * 26;
          acc.y += Math.cos(t * 11 + i * 1.3 + ti) * speedN * 16;
          p[i].add(v).addScaledVector(acc, h * h);
        }
        for (let it = 0; it < 3; it++) for (let i = 1; i < NS; i++) {
          _v2.copy(p[i]).sub(p[i - 1]); const d = _v2.length() || 1e-5;
          p[i].addScaledVector(_v2, -(d - SEG) / d * (i === 1 ? 1 : 0.5));
          if (i > 1) p[i - 1].addScaledVector(_v2, (d - SEG) / d * 0.5);
        }
      }
    }
    for (let ti = 0; ti < 2; ti++) {
      const p = tails[ti].p;
      for (let i = 0; i < NS; i++) {
        tan.copy(p[Math.min(i + 1, NS - 1)]).sub(p[Math.max(i - 1, 0)]).normalize();
        const tw = Math.sin(t * 7 + i * 0.9 + ti * 1.7) * 0.9 * speedN + Math.sin(t * 2 + i) * 0.1;
        const hw = 0.05 + 0.03 * (i / (NS - 1));
        sid.set(1, 0, 0);
        _v2.crossVectors(tan, sid);
        sid.multiplyScalar(Math.cos(tw)).addScaledVector(_v2, Math.sin(tw)).addScaledVector(tan, tan.x * (1 - Math.cos(tw)));
        gv.crossVectors(tan, sid).normalize();
        for (let s = 0; s < 2; s++) {
          const o = ((ti * NS + i) * 2 + s) * 3, k = s ? 1 : -1;
          pos[o] = p[i].x + sid.x * hw * k; pos[o + 1] = p[i].y + sid.y * hw * k; pos[o + 2] = p[i].z + sid.z * hw * k;
          nor[o] = gv.x; nor[o + 1] = gv.y; nor[o + 2] = gv.z;
        }
      }
    }
    tailGeo.attributes.position.needsUpdate = true; tailGeo.attributes.normal.needsUpdate = true;
  }

  function setQuality(q) {
    quality = q === 'low' || q === 'med' ? q : 'high';
    for (const m of meshes) {
      m.castShadow = quality !== 'low' || m.name === 'torso' || m.name.endsWith('_upper') || m.name === 'rider_torso';
      m.receiveShadow = quality === 'high';
    }
    reinMesh.castShadow = false; tailMesh.castShadow = quality === 'high';
    if (lashMesh) lashMesh.visible = quality !== 'low';
  }
  function dispose() {
    for (const d of disposables) d.dispose && d.dispose();
    root.removeFromParent();
  }

  root.userData = { playCall, tuning: TUNING, stats, anchors, quality: () => quality, onFootfall: null, gaitWeights: W, get calling() { return callTimer > 0; } };
  // initial pose
  update(0.016, { gait: 'idle' }, 0);
  return { root, update, setQuality, dispose };
}
