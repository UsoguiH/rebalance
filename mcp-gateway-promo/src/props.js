// Procedurally modelled props. Everything is built from primitives so the film has no asset files.
import { THREE, mat, glossy, matte, slab, box, decal, mesh, canvasTex, roundedRectShape } from './kit3d.js';
import * as T from './textures.js';
import { rng, TAU } from './util.js';
import { LOGO_PTS } from './draw2d.js';

const G = () => new THREE.Group();

export function phone() {
  const g = G();
  g.add(mesh(slab(0.8, 1.66, 0.14, 0.05, 0.022), glossy(0xf58aa6, { metalness: 0.35, roughness: 0.25 }), { vp: 0xd9938f }));
  const scr = decal(0.745, 1.6, T.lockScreenTex()); scr.position.z = 0.05; g.add(scr);
  g.userData.screen = scr;
  return g;
}

// Sheet of paper lying in XZ with a curled corner.
export function paperSheet(w, h, tex, curl = 0.55, o = {}) {
  const geo = new THREE.PlaneGeometry(w, h, 30, 38);
  const p = geo.attributes.position, R = o.radius ?? 0.22;
  // curl around a diagonal line near the (-x, -y) corner
  const nx = -0.74, ny = -0.67, off = (w * 0.5 * 0.74 + h * 0.5 * 0.67) - curl;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    const d = x * nx + y * ny - off;
    if (d > 0) {
      const a = Math.min(d / R, 2.6);
      const nd = R * Math.sin(a), up = R * (1 - Math.cos(a));
      p.setXYZ(i, x + nx * (nd - d), y + ny * (nd - d), up);
    }
  }
  geo.computeVertexNormals();
  const m = mesh(geo, mat(0xffffff, { map: tex, roughness: 0.95, side: THREE.DoubleSide }), { vp: o.vp ?? 0x9fd0c4 });
  m.rotation.x = -Math.PI / 2;
  const g = G(); g.add(m);
  return g;
}

export function buzzer() {
  const g = G();
  const base = mesh(slab(0.62, 0.62, 0.14, 0.1, 0.03), glossy(0xf05a8e), { rot: [-Math.PI / 2, 0, 0], pos: [0, 0.08, 0], vp: 0xd98fc0 }); g.add(base);
  g.add(mesh(new THREE.CylinderGeometry(0.23, 0.25, 0.09, 40), glossy(0xf7a035), { pos: [0, 0.2, 0], vp: 0xcfd98f }));
  g.add(mesh(new THREE.SphereGeometry(0.19, 36, 18, 0, TAU, 0, Math.PI / 2), glossy(0xff7a3d), { pos: [0, 0.23, 0], scale: [1, 0.8, 1], vp: 0xe0a070 }));
  g.add(mesh(new THREE.SphereGeometry(0.07, 24, 12), glossy(0xffd166), { pos: [0, 0.38, 0], vp: 0xcfd98f }));
  return g;
}

const PENCILS = [0xf2617a, 0x56b6f7, 0xf7a035, 0x7ad37f, 0xb26cf5, 0x2e2a4f, 0xff8fb8, 0x4fd6c8, 0xf5d04f];
export function penCup(o = {}) {
  const g = G(), r = rng(o.seed ?? 4);
  const cupMat = mat(o.color ?? 0x4a4460, { alphaMap: T.meshAlphaTex(), transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.5, metalness: 0.4 });
  cupMat.alphaMap.wrapS = cupMat.alphaMap.wrapT = THREE.RepeatWrapping; cupMat.alphaMap.repeat.set(7, 2); cupMat.alphaMap.colorSpace = THREE.NoColorSpace;
  g.add(mesh(new THREE.CylinderGeometry(0.34, 0.28, 0.8, 40, 1, true), cupMat, { pos: [0, 0.4, 0], vp: 0x6a7f6f }));
  g.add(mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.04, 40), mat(o.color ?? 0x4a4460, { metalness: 0.4 }), { pos: [0, 0.02, 0], vp: 0x6a7f6f }));
  for (let i = 0; i < 9; i++) {
    const pg = G(), col = PENCILS[i % PENCILS.length], len = 1.0 + r() * 0.35;
    pg.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, len, 8), mat(col, { roughness: 0.4 }), { pos: [0, len / 2, 0] }));
    pg.add(mesh(new THREE.ConeGeometry(0.03, 0.1, 8), mat(0xf3d9b8), { pos: [0, len + 0.05, 0] }));
    pg.add(mesh(new THREE.ConeGeometry(0.012, 0.04, 8), mat(col), { pos: [0, len + 0.09, 0] }));
    const a = r() * TAU, tilt = 0.12 + r() * 0.22;
    pg.position.set(Math.cos(a) * 0.12, 0.05, Math.sin(a) * 0.12);
    pg.rotation.set(Math.sin(a) * tilt, 0, -Math.cos(a) * tilt);
    g.add(pg);
  }
  return g;
}

export function headphones(color = 0xf2705e) {
  const g = G(), m = glossy(color, { roughness: 0.3 });
  g.add(mesh(new THREE.TorusGeometry(0.5, 0.055, 14, 48, Math.PI), m, { pos: [0, 0.5, 0] }));
  for (const s of [-1, 1]) {
    g.add(mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.15, 36), m, { pos: [s * 0.5, 0.36, 0], rot: [0, 0, Math.PI / 2] }));
    g.add(mesh(new THREE.TorusGeometry(0.2, 0.07, 12, 32), matte(0xfff0ea), { pos: [s * 0.41, 0.36, 0], rot: [0, Math.PI / 2, 0] }));
  }
  return g;
}

export function mug(color = 0xfff4ec) {
  const g = G(), m = glossy(color, { roughness: 0.25 });
  g.add(mesh(new THREE.CylinderGeometry(0.3, 0.26, 0.56, 40), m, { pos: [0, 0.28, 0] }));
  g.add(mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.02, 40), mat(0x8a4b3a, { roughness: 0.3 }), { pos: [0, 0.54, 0] }));
  g.add(mesh(new THREE.TorusGeometry(0.16, 0.045, 12, 28, Math.PI), m, { pos: [0.3, 0.29, 0], rot: [0, 0, -Math.PI / 2] }));
  return g;
}

// Laptop with the hinge along the back edge; screen texture is swappable.
export function laptop(screenTex) {
  const g = G(), shell = glossy(0xfbe9ee, { metalness: 0.25, roughness: 0.3 });
  g.add(mesh(slab(3.1, 2.1, 0.12, 0.07, 0.02), shell, { rot: [-Math.PI / 2, 0, 0], pos: [0, 0.05, 0], vp: 0xd9b98f }));
  // keyboard well + keys
  g.add(mesh(new THREE.PlaneGeometry(2.8, 1.12), mat(0xe9c7d2, { roughness: 0.7 }), { rot: [-Math.PI / 2, 0, 0], pos: [0, 0.101, -0.3], cast: false }));
  const keyGeo = box(0.168, 0.035, 0.168, 0.015), keyMat = mat(0xf2705e, { roughness: 0.45 });
  const keys = new THREE.InstancedMesh(keyGeo, keyMat, 14 * 5), d = new THREE.Object3D();
  let k = 0;
  for (let row = 0; row < 5; row++) for (let col = 0; col < 14; col++) {
    d.position.set(-1.3 + col * 0.2, 0.118, -0.74 + row * 0.2); d.updateMatrix(); keys.setMatrixAt(k++, d.matrix);
  }
  keys.castShadow = true; keys.receiveShadow = true; keys.userData.vp = 0xd9938f; g.add(keys);
  g.add(mesh(slab(1.1, 0.62, 0.05, 0.004, 0), mat(0xf7dbe3, { roughness: 0.35 }), { rot: [-Math.PI / 2, 0, 0], pos: [0, 0.102, 0.62], cast: false }));
  // lid
  const lid = G(); lid.position.set(0, 0.09, -1.05);
  lid.add(mesh(slab(3.1, 2.0, 0.12, 0.05, 0.02), shell, { pos: [0, 1.0, 0], vp: 0xd9b98f }));
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(2.92, 1.83), new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false }));
  scr.position.set(0, 1.0, 0.047); scr.userData.vp = 0x3a3f4a; lid.add(scr);
  lid.rotation.x = -0.26;
  g.add(lid);
  g.userData.lid = lid; g.userData.screen = scr;
  return g;
}

export function chair(color = 0x9a63f0) {
  const g = G(), m = glossy(color, { roughness: 0.4 }), chrome = mat(0xe9e4f5, { metalness: 0.9, roughness: 0.2 });
  g.add(mesh(box(1.5, 0.22, 1.4, 0.1), m, { pos: [0, 1.5, 0], vp: 0x8fa6d9 }));
  const back = mesh(box(1.5, 1.7, 0.2, 0.1), m, { pos: [0, 2.55, 0.72], rot: [0.12, 0, 0], vp: 0xd9938f }); g.add(back);
  const holes = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.06, 0.06, 0.24, 12), mat(0x6c3fc4), 5 * 6), d = new THREE.Object3D();
  let k = 0;
  for (let i = 0; i < 5; i++) for (let j = 0; j < 6; j++) { d.position.set(-0.5 + i * 0.25, -0.6 + j * 0.24, 0); d.rotation.set(Math.PI / 2, 0, 0); d.updateMatrix(); holes.setMatrixAt(k++, d.matrix); }
  holes.userData.finalOnly = true; back.add(holes);
  for (const [x, z] of [[-0.65, -0.6], [0.65, -0.6], [-0.65, 0.6], [0.65, 0.6]]) g.add(mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.5, 10), chrome, { pos: [x, 0.75, z], vp: 0xcfd98f }));
  return g;
}

export function desk(w = 9, d = 3.4, hgt = 2.6, color = 0xffffff) {
  const g = G(), top = mat(color, { roughness: 0.5 }), leg = mat(0xf3eefc, { metalness: 0.6, roughness: 0.3 });
  g.add(mesh(box(w, 0.14, d, 0.05), top, { pos: [0, hgt, 0], vp: 0x8fa6d9 }));
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(mesh(new THREE.CylinderGeometry(0.06, 0.05, hgt, 12), leg, { pos: [x * (w / 2 - 0.4), hgt / 2, z * (d / 2 - 0.35)], vp: 0xd9938f }));
  return g;
}

// Marker with its tip at the origin and the body along +Y.
export function marker() {
  const g = G();
  const bodyTex = T.gradientTex([[0, '#6fc3ff'], [0.45, '#b9a2ff'], [0.75, '#ff7fc0'], [1, '#ff4f8d']], 500);
  g.add(mesh(new THREE.ConeGeometry(0.035, 0.11, 16), mat(0x2b2540, { roughness: 0.6 }), { pos: [0, 0.055, 0], rot: [Math.PI, 0, 0] }));
  g.add(mesh(new THREE.CylinderGeometry(0.085, 0.04, 0.2, 24), glossy(0xff4f8d), { pos: [0, 0.2, 0] }));
  g.add(mesh(new THREE.CylinderGeometry(0.1, 0.085, 0.42, 6), glossy(0xff5c98, { flatShading: true }), { pos: [0, 0.51, 0] }));
  g.add(mesh(new THREE.CylinderGeometry(0.105, 0.105, 1.5, 28), glossy(0xffffff, { map: bodyTex, roughness: 0.3 }), { pos: [0, 1.47, 0], vp: 0xb592d9 }));
  g.add(mesh(new THREE.SphereGeometry(0.105, 24, 12, 0, TAU, 0, Math.PI / 2), glossy(0x6fc3ff), { pos: [0, 2.22, 0] }));
  return g;
}

export function paperclip(color = 0xf2475f) {
  const pts = [], add = (x, z) => pts.push(new THREE.Vector3(x, 0, z));
  const loop = (cx, cz, rx, a0, a1, n = 10) => { for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * (i / n); add(cx + Math.cos(a) * rx, cz + Math.sin(a) * rx); } };
  add(-0.07, 0.2); loop(0, -0.3, 0.07, Math.PI, TAU); loop(0, 0.32, 0.1, 0, Math.PI); loop(0, -0.36, 0.1, Math.PI, TAU); add(0.1, 0.12);
  const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 90, 0.014, 8);
  return mesh(geo, glossy(color, { roughness: 0.25 }), { pos: [0, 0.016, 0], vp: 0xd98fc0 });
}

export function sticky(msg, color, size = 0.62) {
  const m = mesh(new THREE.PlaneGeometry(size, size, 6, 6), mat(0xffffff, { map: T.stickyTex(msg, color), roughness: 0.9, side: THREE.DoubleSide }), { vp: 0xd9b98f });
  const p = m.geometry.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i) / size + 0.5; p.setZ(i, Math.pow(1 - y, 2) * 0.07 * size); }
  m.geometry.computeVertexNormals();
  return m;
}

export function scissors() {
  const g = G(), steel = mat(0xd8dae6, { metalness: 0.9, roughness: 0.25 }), red = glossy(0xf2475f);
  for (const s of [-1, 1]) {
    const arm = G();
    arm.add(mesh(box(0.07, 0.02, 0.8, 0.008), steel, { pos: [0, 0.02, -0.38] }));
    arm.add(mesh(new THREE.TorusGeometry(0.13, 0.035, 10, 28), red, { pos: [s * 0.1, 0.03, 0.2], rot: [Math.PI / 2, 0, 0] }));
    arm.rotation.y = s * 0.22; g.add(arm);
  }
  return g;
}

// Glossy tube that follows the logo stroke; drawRange reveals it like ink.
export function logoTube(radius = 0.05, color = 0xe5213f, scale = 0.011) {
  const pts = LOGO_PTS.map(([x, y]) => new THREE.Vector3(x * scale, 0, y * scale));
  const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 260, radius, 12);
  const m = mesh(geo, glossy(color, { roughness: 0.12 }), { vp: 0xd9938f });
  m.userData.count = geo.index.count;
  const q = (a) => Math.floor((m.userData.count * Math.max(0, Math.min(1, a))) / 6) * 6;
  m.userData.reveal = (a1, a0 = 0) => geo.setDrawRange(q(a0), Math.max(0, q(a1) - q(a0)));
  return m;
}

export function umbrella() {
  const g = G();
  const gores = 8, seg = 8, R = 1.25, cap = Math.PI * 0.47;
  const geo = new THREE.SphereGeometry(R, gores * seg, 20, 0, TAU, 0, cap);
  const p = geo.attributes.position, col = [];
  const cTop = new THREE.Color(0xff6fb0), cEdge = new THREE.Color(0xc79bff), cAlt = new THREE.Color(0xf79ad0), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const ang = Math.atan2(z, x), rr2 = Math.hypot(x, z), down = rr2 / R;
    const rib = Math.abs(Math.sin(ang * gores * 0.5)); // 0 at ribs, 1 mid-gore
    const k = 1 - 0.1 * rib * down * down;             // panels sag inward between ribs
    x *= k; z *= k; y = y * 0.62 + 0.09 * rib * down * down * down;
    p.setXYZ(i, x, y - R * 0.62 * Math.cos(cap), z);
    const gi = Math.floor(((ang + Math.PI) / TAU) * gores + 0.0001) % 2;
    c.copy(cTop).lerp(gi ? cEdge : cAlt, Math.pow(down, 1.4) * (gi ? 1 : 0.8)); col.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.computeVertexNormals();
  g.add(mesh(geo, glossy(0xffffff, { vertexColors: true, side: THREE.DoubleSide, roughness: 0.42, clearcoat: 0.5 }), { vp: 0x9aa6d6 }));
  const rod = mat(0xc7a2ff, { metalness: 0.6, roughness: 0.25 });
  g.add(mesh(new THREE.CylinderGeometry(0.022, 0.022, 2.05, 10), rod, { pos: [0, -0.42, 0] }));
  g.add(mesh(new THREE.CylinderGeometry(0.012, 0.03, 0.2, 10), rod, { pos: [0, 0.74, 0] }));
  g.add(mesh(new THREE.TorusGeometry(0.11, 0.026, 10, 24, Math.PI), glossy(0xb07cff), { pos: [0.11, -1.45, 0], rot: [0, 0, Math.PI] }));
  return g;
}

export function folder() {
  const g = G(), yel = glossy(0xf7b93b, { roughness: 0.35 }), yel2 = glossy(0xffd26a, { roughness: 0.35 });
  g.add(mesh(slab(1.6, 1.12, 0.1, 0.05, 0.015), yel, { pos: [0, 0, -0.07], vp: 0xd9b98f }));
  g.add(mesh(slab(0.6, 0.3, 0.09, 0.05, 0.015), yel, { pos: [-0.46, 0.56, -0.07], vp: 0xd9b98f }));
  const files = [];
  [['policy.yaml', '#ffe3ef'], ['audit.log', '#e9e0ff'], ['config.yaml', '#dff3ff']].forEach(([label, tint], i) => {
    const f = G();
    f.add(mesh(slab(1.42, 1.0, 0.07, 0.012, 0.004), mat(0xffffff, { roughness: 0.6 }), { vp: 0xe8e8e8 }));
    const d = decal(1.42, 1.0, T.fileCardTex(label, tint)); d.position.z = 0.012; f.add(d);
    f.position.set(0, 0, -0.045 + i * 0.022); g.add(f); files.push(f);
  });
  const flap = G(); flap.position.set(0, -0.56, 0.035);
  flap.add(mesh(slab(1.6, 1.0, 0.1, 0.05, 0.015), yel2, { pos: [0, 0.5, 0], vp: 0xe0a070 }));
  const logo = decal(0.7, 0.7, T.logoTex('#c2185b')); logo.position.set(0, 0.5, 0.045); flap.add(logo);
  g.add(flap);
  g.userData.flap = flap; g.userData.files = files;
  return g;
}

// Floating rounded card with a canvas face (notification, file card, ...).
export function card(w, h, tex, color = 0xf58ac6, o = {}) {
  const g = G();
  const body = mesh(slab(w, h, o.r ?? h * 0.26, 0.03, 0.01), glossy(color, { transparent: true, opacity: o.opacity ?? 0.9, roughness: 0.2 }), { vp: o.vp ?? 0xb592d9 });
  g.add(body);
  if (tex) { const d = decal(w * 1.012, h * 1.03, tex); d.position.z = 0.028; g.add(d); }
  return g;
}

// Pill push-button with a printed label.
export function pillButton(label) {
  const g = G();
  const body = mesh(slab(3.2, 0.95, 0.475, 0.34, 0.07, 6), new THREE.MeshPhysicalMaterial({ color: 0xf2a8f0, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.08, transparent: true, opacity: 0.93, sheen: 1, sheenColor: 0xffffff }), { vp: 0xd9938f });
  g.add(body);
  const l1 = decal(2.75, 0.82, T.pillLabelTex(label, '#9645d6')); l1.position.z = 0.245; g.add(l1);
  const l2 = decal(2.75, 0.82, T.pillLabelTex(label, '#ffffff')); l2.position.z = 0.246; l2.material.opacity = 0; g.add(l2);
  g.userData = { body, label: l1, labelLit: l2 };
  return g;
}

// Flat satin ribbon whose spine is re-evaluated every frame: fn(u) -> { p: [x,y,z], n: [x,y,z], w }
export class Ribbon {
  constructor(segs = 220, color = 0xe5213f) {
    this.segs = segs;
    const geo = new THREE.BufferGeometry();
    this.pos = new Float32Array((segs + 1) * 2 * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    const idx = [];
    for (let i = 0; i < segs; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    geo.setIndex(idx);
    this.mesh = mesh(geo, glossy(color, { side: THREE.DoubleSide, roughness: 0.22 }), { vp: 0xb592d9 });
    this.mesh.frustumCulled = false;
  }
  set(fn) {
    const P = this.pos;
    for (let i = 0; i <= this.segs; i++) {
      const { p, n, w } = fn(i / this.segs), o = i * 6, h = w / 2;
      P[o] = p[0] - n[0] * h; P[o + 1] = p[1] - n[1] * h; P[o + 2] = p[2] - n[2] * h;
      P[o + 3] = p[0] + n[0] * h; P[o + 4] = p[1] + n[1] * h; P[o + 5] = p[2] + n[2] * h;
    }
    const g = this.mesh.geometry; g.attributes.position.needsUpdate = true; g.computeVertexNormals();
  }
}

export { roundedRectShape, canvasTex };
