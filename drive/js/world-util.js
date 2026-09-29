// world-util.js - small helpers shared by the world modules (no DOM access here).
import * as THREE from 'three';

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Deterministic PRNG. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Seeded 2D simplex noise, returns function(x,y) -> [-1,1]. */
export function makeSimplex(seed = 1) {
  const rng = mulberry32(seed);
  const perm = new Uint8Array(512);
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = (rng() * (i + 1)) | 0;
    const t = p[i]; p[i] = p[j]; p[j] = t;
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const G = [1, 1, -1, 1, 1, -1, -1, -1, 1, 0, -1, 0, 1, 0, -1, 0, 0, 1, 0, -1, 0, 1, 0, -1];
  const F2 = 0.5 * (Math.sqrt(3) - 1), G2 = (3 - Math.sqrt(3)) / 6;
  return function noise2(xin, yin) {
    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s), j = Math.floor(yin + s);
    const t = (i + j) * G2;
    const x0 = xin - (i - t), y0 = yin - (j - t);
    const i1 = x0 > y0 ? 1 : 0, j1 = x0 > y0 ? 0 : 1;
    const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
    const ii = i & 255, jj = j & 255;
    let n0 = 0, n1 = 0, n2 = 0;
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 > 0) { const g = (perm[ii + perm[jj]] % 12) * 2; t0 *= t0; n0 = t0 * t0 * (G[g % 24] * x0 + G[(g + 1) % 24] * y0); }
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 > 0) { const g = (perm[ii + i1 + perm[jj + j1]] % 12) * 2; t1 *= t1; n1 = t1 * t1 * (G[g % 24] * x1 + G[(g + 1) % 24] * y1); }
    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 > 0) { const g = (perm[ii + 1 + perm[jj + 1]] % 12) * 2; t2 *= t2; n2 = t2 * t2 * (G[g % 24] * x2 + G[(g + 1) % 24] * y2); }
    return 70 * (n0 + n1 + n2);
  };
}

const _v = new THREE.Vector3();
const _c = new THREE.Color();
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();

/** Compose a matrix from position / euler rotation / scale. */
export function xf(x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
  _e.set(rx, ry, rz, 'YXZ');
  _q.setFromEuler(_e);
  return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), _q.clone(), new THREE.Vector3(sx, sy, sz));
}

/**
 * Accumulates transformed geometry with per-vertex colours into one BufferGeometry.
 * Colours are sRGB hex / css strings / THREE.Color, or a function(worldPos, normal, out) -> Color.
 * opts.ao darkens vertices near y=0 (cheap contact shadow), opts.jitter adds per-vertex tone noise.
 */
export class GeoBuilder {
  constructor(opts = {}) {
    this.p = []; this.n = []; this.c = []; this.u = [];
    this.ao = opts.ao ?? 0;         // strength of ground darkening
    this.aoH = opts.aoH ?? 1.6;
    this.jitter = opts.jitter ?? 0.05;
  }
  add(geo, m, color = 0xffffff, uvXf = null) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    const pos = g.attributes.position, nor = g.attributes.normal, uv = g.attributes.uv;
    const nm = new THREE.Matrix3().getNormalMatrix(m);
    const isFn = typeof color === 'function';
    const col = isFn ? null : new THREE.Color(color);
    const nv = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      _v.fromBufferAttribute(pos, i).applyMatrix4(m);
      nv.fromBufferAttribute(nor, i).applyMatrix3(nm).normalize();
      this.p.push(_v.x, _v.y, _v.z);
      this.n.push(nv.x, nv.y, nv.z);
      const cc = isFn ? color(_v, nv, _c) : col;
      let r = cc.r, gg = cc.g, b = cc.b;
      if (this.jitter) {
        const h = Math.sin(_v.x * 12.9898 + _v.y * 78.233 + _v.z * 37.719) * 43758.5453;
        const j = 1 + ((h - Math.floor(h)) - 0.5) * this.jitter * 2;
        r *= j; gg *= j; b *= j;
      }
      if (this.ao) {
        const k = 1 - this.ao * (1 - smoothstep(0, this.aoH, _v.y));
        r *= k; gg *= k; b *= k;
      }
      this.c.push(r, gg, b);
      if (uv) this.u.push(uv.getX(i), uv.getY(i)); else this.u.push(0, 0);
    }
    if (g !== geo) g.dispose();
    return this;
  }
  // ---- convenience primitives; y is the BASE of the primitive
  box(w, h, d, x, y, z, color, ry = 0, rx = 0, rz = 0) {
    const g = new THREE.BoxGeometry(w, h, d);
    this.add(g, xf(x, y + h / 2, z, rx, ry, rz), color); g.dispose(); return this;
  }
  cyl(rt, rb, h, seg, x, y, z, color, open = false) {
    const g = new THREE.CylinderGeometry(rt, rb, h, seg, 1, open);
    this.add(g, xf(x, y + h / 2, z), color); g.dispose(); return this;
  }
  cone(r, h, seg, x, y, z, color) { return this.cyl(0.0001, r, h, seg, x, y, z, color); }
  sph(r, x, y, z, color, sx = 1, sy = 1, sz = 1, ws = 10, hs = 8) {
    const g = new THREE.SphereGeometry(r, ws, hs);
    this.add(g, xf(x, y, z, 0, 0, 0, sx, sy, sz), color); g.dispose(); return this;
  }
  /** cylinder between two points */
  tube(ax, ay, az, bx, by, bz, r, color, seg = 5) {
    const a = new THREE.Vector3(ax, ay, az), b = new THREE.Vector3(bx, by, bz);
    const len = a.distanceTo(b);
    const g = new THREE.CylinderGeometry(r, r, len, seg, 1, true);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    const m = new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1));
    this.add(g, m, color); g.dispose(); return this;
  }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.u, 2));
    g.computeBoundingSphere(); g.computeBoundingBox();
    return g;
  }
}

/** Pointed (ogee-ish) arch outline geometry: a slab with an arch-shaped opening. Faces +Z, base at y=0, centred on x. */
export function archSlabGeometry({ w = 5.4, h = 6.6, openW = 3.2, openH = 5.2, straight = 3.0, depth = 1.2, rosette = true, chamfer = 0.5 } = {}) {
  const s = new THREE.Shape();
  const hw = w / 2;
  s.moveTo(-hw, 0);
  s.lineTo(hw, 0);
  s.lineTo(hw, h - chamfer);
  s.lineTo(hw - chamfer, h);
  s.lineTo(-hw + chamfer, h);
  s.lineTo(-hw, h - chamfer);
  s.lineTo(-hw, 0);
  const o = new THREE.Path();
  const ow = openW / 2;
  o.moveTo(-ow, 0);
  o.lineTo(-ow, straight);
  // pointed arch: two arcs meeting at apex
  const n = 10;
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const x = -ow + ow * t;
    const yy = straight + (openH - straight) * Math.sin(t * Math.PI / 2) ** 1.25;
    o.lineTo(x, yy);
  }
  for (let i = n - 1; i >= 0; i--) {
    const t = i / n;
    const x = ow - ow * t;
    const yy = straight + (openH - straight) * Math.sin(t * Math.PI / 2) ** 1.25;
    o.lineTo(x, yy);
  }
  o.lineTo(ow, 0);
  o.lineTo(-ow, 0);
  s.holes.push(o);
  if (rosette && h - openH > 1.0) {
    const r = new THREE.Path();
    const cy = (h + openH) / 2 + 0.05, rr = Math.min(0.45, (h - openH) * 0.28);
    for (let i = 0; i <= 16; i++) {
      const a = -(i / 16) * Math.PI * 2;
      const px = Math.cos(a) * rr, py = cy + Math.sin(a) * rr;
      if (i === 0) r.moveTo(px, py); else r.lineTo(px, py);
    }
    s.holes.push(r);
  }
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.07, bevelSegments: 1, curveSegments: 6 });
  g.translate(0, 0, -depth / 2);
  return g;
}

/** Sample the arch opening outline top polygon (for mashrabiya fill). Returns Shape of the region above y0. */
export function archOpeningShape({ openW = 3.2, openH = 5.2, straight = 3.0, y0 = 3.2, inset = 0.06 } = {}) {
  const ow = openW / 2 - inset;
  const s = new THREE.Shape();
  const prof = (t) => straight + (openH - straight) * Math.sin(t * Math.PI / 2) ** 1.25 - inset * 0.5;
  s.moveTo(-ow, y0);
  s.lineTo(-ow, Math.max(y0, straight));
  const n = 10;
  for (let i = 1; i <= n; i++) { const t = i / n; s.lineTo(-ow + ow * t, prof(t)); }
  for (let i = n - 1; i >= 0; i--) { const t = i / n; s.lineTo(ow - ow * t, prof(t)); }
  s.lineTo(ow, y0);
  s.lineTo(-ow, y0);
  return s;
}

/** Add three.js fog uniforms + chunks to a ShaderMaterial definition helper. */
export function fogUniforms(extra) {
  return THREE.UniformsUtils.merge([THREE.UniformsLib.fog, extra]);
}

export const GLSL_HASH = /* glsl */`
float hash21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hash21(i),hash21(i+vec2(1,0)),f.x), mix(hash21(i+vec2(0,1)),hash21(i+vec2(1,1)),f.x), f.y); }
`;
