// Props. Devices and stationery are real glTF models (see models.js); paper, cards, UI
// elements and the ribbon are built here from primitives.
import { THREE, mat, glossy, matte, slab, box, decal, mesh, canvasTex, roundedRectShape } from './kit3d.js';
import * as T from './textures.js';
import { rng, TAU } from './util.js';
import { LOGO_PTS } from './draw2d.js';

const G = () => new THREE.Group();

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

export function desk(w = 9, d = 3.4, hgt = 2.6, color = 0xffffff) {
  const g = G(), top = mat(color, { roughness: 0.5 }), leg = mat(0xf3eefc, { metalness: 0.6, roughness: 0.3 });
  g.add(mesh(box(w, 0.14, d, 0.05), top, { pos: [0, hgt, 0], vp: 0x8fa6d9 }));
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(mesh(new THREE.CylinderGeometry(0.06, 0.05, hgt, 12), leg, { pos: [x * (w / 2 - 0.4), hgt / 2, z * (d / 2 - 0.35)], vp: 0xd9938f }));
  return g;
}

export function sticky(msg, color, size = 0.62) {
  const m = mesh(new THREE.PlaneGeometry(size, size, 6, 6), mat(0xffffff, { map: T.stickyTex(msg, color), roughness: 0.9, side: THREE.DoubleSide }), { vp: 0xd9b98f });
  const p = m.geometry.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i) / size + 0.5; p.setZ(i, Math.pow(1 - y, 2) * 0.07 * size); }
  m.geometry.computeVertexNormals();
  return m;
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
export { phone, laptop, marker, penCup, headphones, mug, chair, scissors, paperclip, buzzer, umbrella, folder, wallClock, clipboard, notepads } from './models.js';
