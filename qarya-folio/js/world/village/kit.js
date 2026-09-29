import * as THREE from 'three';
import { mergeGeometries } from 'three-addons';

// أدوات القرية: a placement "kit" that composes transforms on top of the core
// Builder, a Builder that carries one extra per-vertex attribute (for the
// fluttering fabric and the flickering lantern glass), and a text atlas that
// packs every Arabic sign in the village into one canvas texture.

const Y = new THREE.Vector3(0, 1, 0);
const ONE = new THREE.Vector3(1, 1, 1);

// Seeded random so the village looks the same on every visit.
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function mix(a, b, k) {
  return new THREE.Color(a).lerp(new THREE.Color(b), k);
}
export function shade(c, dl) {
  return new THREE.Color(c).offsetHSL(0, 0, dl);
}

// ---------------------------------------------------------------- geometry
const cache = new Map();
function cached(key, make) {
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key);
}
export const G = {
  box: () => cached('box', () => new THREE.BoxGeometry(1, 1, 1)),
  // Square frustum with a 1×1 base: mud walls lean in a little as they rise.
  taper: (t = 0.965) => cached('taper' + t, () => {
    const r = Math.SQRT1_2;
    return new THREE.CylinderGeometry(r * t, r, 1, 4, 1).rotateY(Math.PI / 4);
  }),
  cyl: (rt, rb, h, seg = 8) => cached(`c${rt},${rb},${h},${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg)),
  cone: (r, h, seg = 6) => cached(`k${r},${h},${seg}`, () => new THREE.ConeGeometry(r, h, seg)),
  ico: (r, d = 0) => cached(`i${r},${d}`, () => new THREE.IcosahedronGeometry(r, d)),
  // Triangular merlon / vent, base on y = 0, centred on z.
  tri: (w, h, depth) => cached(`t${w},${h},${depth}`, () => {
    const s = new THREE.Shape();
    s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, h); s.closePath();
    return new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false }).translate(0, 0, -depth / 2);
  }),
  lathe: (key, pts, seg = 8) => cached('l' + key, () => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg)),
  torus: (r, tube, rs = 4, ts = 8, arc = Math.PI * 2) => cached(`o${r},${tube},${rs},${ts},${arc}`, () => new THREE.TorusGeometry(r, tube, rs, ts, arc)),
  // Arched opening in a slab: outer w×h, a round-headed hole of half-width hw
  // whose straight sides stop at spring height sh. Extruded along z (depth d).
  arch: (w, h, hw, sh, d) => cached(`a${w},${h},${hw},${sh},${d}`, () => {
    const s = new THREE.Shape();
    s.moveTo(-w / 2, 0); s.lineTo(-hw, 0); s.lineTo(-hw, sh);
    s.absarc(0, sh, hw, Math.PI, 0, true);
    s.lineTo(hw, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h); s.lineTo(-w / 2, h); s.closePath();
    s.curveSegments = 10;
    return new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false, curveSegments: 10 }).translate(0, 0, -d / 2);
  }),
  // A flat arch-shaped ring (trim around an arched opening).
  archRing: (hw, sh, t, d) => cached(`r${hw},${sh},${t},${d}`, () => {
    const s = new THREE.Shape();
    s.moveTo(-hw - t, 0); s.lineTo(-hw - t, sh);
    s.absarc(0, sh, hw + t, Math.PI, 0, true);
    s.lineTo(hw + t, 0); s.lineTo(hw, 0); s.lineTo(hw, sh);
    s.absarc(0, sh, hw, 0, Math.PI, false);
    s.lineTo(-hw, 0); s.closePath();
    return new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false, curveSegments: 10 }).translate(0, 0, -d / 2);
  }),
};

// A quad from four points (for tent roofs, sagging cloth…), as a geometry.
export function quadGeo(a, b, c, d) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b, ...c, ...a, ...c, ...d], 3));
  g.computeVertexNormals();
  return g;
}
export function triGeo(a, b, c) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b, ...c], 3));
  g.computeVertexNormals();
  return g;
}

// ---------------------------------------------------------------- builders
// A Builder with one extra per-vertex attribute (float or vec3). Each add()
// takes `opts.attr`: a number / array (same for every vertex) or a
// Float32Array already laid out per vertex.
export function makeXBuilder(Builder, name, size) {
  return new (class extends Builder {
    constructor() { super(); this.attrName = name; this.attrSize = size; }
    add(geo, color, o = {}) {
      super.add(geo, color, o);
      const g = this.parts[this.parts.length - 1];
      const n = g.attributes.position.count;
      const arr = new Float32Array(n * size);
      const a = o.attr === undefined ? 0 : o.attr;
      if (a instanceof Float32Array) arr.set(a.subarray(0, arr.length));
      else if (typeof a === 'number') arr.fill(a);
      else for (let i = 0; i < n; i++) arr.set(a, i * size);
      g.setAttribute(name, new THREE.BufferAttribute(arr, size));
      return this;
    }
  })();
}

// Fabric: vertices move by aFlap * (a couple of travelling sines).
export function fabricMaterial(uTime) {
  const m = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uTime;
    sh.vertexShader = 'attribute vec3 aFlap;\nuniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      float qPh = dot(position, vec3(1.3, 0.8, 1.1));
      transformed += aFlap * (sin(uTime * 2.9 + qPh) * 0.65 + sin(uTime * 5.3 + qPh * 1.7) * 0.35);`);
  };
  m.customProgramCacheKey = () => 'qarya-fabric';
  return m;
}

// Lantern glass and embers: unlit colour that flickers per lantern (aPhase).
export function glowMaterial(uTime) {
  const m = new THREE.MeshBasicMaterial({ vertexColors: true });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uTime;
    sh.vertexShader = 'attribute float aPhase;\nvarying float vPhase;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vPhase = aPhase;');
    sh.fragmentShader = 'uniform float uTime;\nvarying float vPhase;\n' + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      float fl = 0.86 + 0.14 * sin(uTime * 8.3 + vPhase * 17.0) * sin(uTime * 3.7 + vPhase * 7.0) + 0.06 * sin(uTime * 21.0 + vPhase * 3.0);
      diffuseColor.rgb *= fl;`);
  };
  m.customProgramCacheKey = () => 'qarya-glow';
  return m;
}

// ---------------------------------------------------------------- kit
function compose(o) {
  const p = o.position || [0, 0, 0];
  const r = o.rotation || [0, 0, 0];
  const s = o.scale === undefined ? [1, 1, 1] : (typeof o.scale === 'number' ? [o.scale, o.scale, o.scale] : o.scale);
  return new THREE.Matrix4().compose(
    new THREE.Vector3(p[0], p[1], p[2]),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(r[0], r[1], r[2], r[3] || 'XYZ')),
    new THREE.Vector3(s[0], s[1], s[2]),
  );
}

// A Kit places parts in a local frame (x across, y up, +z = "front") and
// writes them into one of three builders: `stat` (static, merged), `fab`
// (fluttering fabric) or `glow` (flickering light). It also adds static
// colliders in the same frame.
export class Kit {
  constructor(B, physics, m = new THREE.Matrix4(), rotY = 0) {
    this.B = B; this.physics = physics; this.m = m; this.rotY = rotY;
    this.rot3 = new THREE.Matrix3().setFromMatrix4(m);
  }
  // Child frame at local (x, y, z) turned by ry.
  at(x, y, z, ry = 0) {
    const m = this.m.clone().multiply(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(Y, ry), ONE));
    return new Kit(this.B, this.physics, m, this.rotY + ry);
  }
  // Same frame, another static builder (chunk).
  into(stat) {
    return new Kit({ ...this.B, stat }, this.physics, this.m, this.rotY);
  }
  point(x, y, z) { return new THREE.Vector3(x, y, z).applyMatrix4(this.m); }
  dir(x, y, z) { return new THREE.Vector3(x, y, z).applyMatrix3(this.rot3); }

  add(geo, color, o = {}) {
    const local = compose(o);
    const b = this.B[o.layer || 'stat'];
    let attr = o.attr;
    if (typeof attr === 'function') {
      const g = (geo.index ? geo.toNonIndexed() : geo.clone()).applyMatrix4(local);
      const pos = g.attributes.position;
      const k = b.attrSize;
      const arr = new Float32Array(pos.count * k);
      const v = new THREE.Vector3();
      for (let i = 0; i < pos.count; i++) {
        const r = attr(pos.getX(i), pos.getY(i), pos.getZ(i));
        if (k === 1) arr[i] = r;
        else { v.set(r[0], r[1], r[2]).applyMatrix3(this.rot3); arr[i * 3] = v.x; arr[i * 3 + 1] = v.y; arr[i * 3 + 2] = v.z; }
      }
      g.dispose();
      attr = arr;
    } else if (Array.isArray(attr) && attr.length === 3) {
      const v = new THREE.Vector3(attr[0], attr[1], attr[2]).applyMatrix3(this.rot3);
      attr = [v.x, v.y, v.z];
    }
    b.add(geo, color, { matrix: this.m.clone().multiply(local), attr });
    return this;
  }
  box(size, color, o = {}) {
    return this.add(G.box(), color, { ...o, scale: size });
  }
  taper(size, color, o = {}, t = 0.965) {
    return this.add(G.taper(t), color, { ...o, scale: size });
  }
  cyl(rt, rb, h, color, o = {}, seg = 8) {
    return this.add(G.cyl(rt, rb, h, seg), color, o);
  }
  cone(r, h, color, o = {}, seg = 6) {
    return this.add(G.cone(r, h, seg), color, o);
  }
  ball(r, color, o = {}, detail = 0) {
    return this.add(G.ico(r, detail), color, o);
  }
  // A thin rod between two local points.
  rod(a, b, r, color, o = {}, seg = 4) {
    const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
    const len = va.distanceTo(vb);
    const mid = va.clone().add(vb).multiplyScalar(0.5);
    const q = new THREE.Quaternion().setFromUnitVectors(Y, vb.clone().sub(va).normalize());
    const e = new THREE.Euler().setFromQuaternion(q);
    return this.add(G.cyl(r, r, 1, seg), color, { ...o, position: mid.toArray(), rotation: [e.x, e.y, e.z], scale: [1, len, 1] });
  }

  // Static colliders in this frame.
  solid(size, position, ry = 0) {
    const p = this.point(position[0], position[1], position[2]);
    const b = this.physics.addBox({ size, position: [p.x, p.y, p.z], rotationY: this.rotY + ry, mass: 0 });
    b.village = true;
    return b;
  }
  solidCyl(radius, height, position) {
    const p = this.point(position[0], position[1], position[2]);
    const b = this.physics.addCylinder({ radius, height, position: [p.x, p.y, p.z], mass: 0 });
    b.village = true;
    return b;
  }
}

// ---------------------------------------------------------------- labels
// Every sign's face is a plane mapped to a slot of one shared canvas, so all
// the Arabic text in the village is a single draw call. Slots are drawn
// once with fallback fonts and again when the web fonts arrive.
export class Labels {
  constructor() { this.slots = []; this.planes = []; }

  // draw(g, w, h) paints the slot (0,0)-(w,h). Returns the slot.
  slot(w, h, draw) {
    const s = { w, h, draw, x: 0, y: 0 };
    this.slots.push(s);
    return s;
  }

  // A plane showing `slot`, size (pw × ph) metres, facing local +z of `kit`.
  plane(kit, slot, pw, ph, o = {}) {
    const m = kit.m.clone().multiply(compose(o));
    this.planes.push({ slot, pw, ph, m });
  }

  build() {
    const pad = 6, W = 2048;
    const order = [...this.slots].sort((a, b) => b.h - a.h);
    let x = 0, y = 0, row = 0;
    for (const s of order) {
      if (x + s.w + pad * 2 > W) { x = 0; y += row; row = 0; }
      s.x = x + pad; s.y = y + pad;
      x += s.w + pad * 2;
      row = Math.max(row, s.h + pad * 2);
    }
    let H = 256;
    while (H < y + row) H *= 2;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    this.canvas = canvas;

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    this.texture = tex;
    this.draw();

    const geos = this.planes.map(({ slot: s, pw, ph, m }) => {
      const g = new THREE.PlaneGeometry(pw, ph);
      const uv = g.attributes.uv;
      for (let i = 0; i < uv.count; i++) {
        uv.setXY(i, (s.x + uv.getX(i) * s.w) / W, 1 - (s.y + (1 - uv.getY(i)) * s.h) / H);
      }
      return g.applyMatrix4(m);
    });
    const mesh = new THREE.Mesh(mergeGeometries(geos), new THREE.MeshLambertMaterial({ map: tex }));
    geos.forEach((g) => g.dispose());
    mesh.receiveShadow = true;
    mesh.name = 'village-labels';

    // Redraw once the Arabic fonts are in.
    if (document.fonts?.load) {
      Promise.all([
        document.fonts.load('700 64px "Reem Kufi"', 'أهلاً بكم'),
        document.fonts.load('700 64px "Aref Ruqaa"', 'رحلة'),
        document.fonts.load('700 64px "Cairo"', 'تواصل'),
      ]).then(() => { this.draw(); tex.needsUpdate = true; }).catch(() => {});
    }
    return mesh;
  }

  draw() {
    const g = this.canvas.getContext('2d');
    g.clearRect(0, 0, this.canvas.width, this.canvas.height);
    for (const s of this.slots) {
      g.save();
      // Bleed the slot's edge colour into the padding (mipmaps).
      g.translate(s.x, s.y);
      g.beginPath(); g.rect(-4, -4, s.w + 8, s.h + 8); g.clip();
      g.direction = 'rtl';
      s.draw(g, s.w, s.h);
      g.restore();
    }
  }
}

// Text that fits inside maxW, centred at (cx, cy).
export function fitText(g, text, family, size, maxW, cx, cy, color, opts = {}) {
  let px = size;
  g.font = `700 ${px}px ${family}`;
  while (g.measureText(text).width > maxW && px > 10) {
    px -= 2;
    g.font = `700 ${px}px ${family}`;
  }
  g.direction = 'rtl';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  if (opts.shadow) {
    g.fillStyle = opts.shadow;
    g.fillText(text, cx + px * 0.04, cy + px * 0.05 + (opts.dy || 0));
  }
  g.fillStyle = color;
  g.fillText(text, cx, cy + (opts.dy || 0));
}

// Row of small triangles, the village's signature ornament.
export function triangleBorder(g, x0, x1, y, size, colors, up = true) {
  let i = 0;
  for (let x = x0; x + size <= x1 + 0.5; x += size) {
    g.fillStyle = colors[i++ % colors.length];
    g.beginPath();
    if (up) { g.moveTo(x, y); g.lineTo(x + size, y); g.lineTo(x + size / 2, y - size * 0.8); }
    else { g.moveTo(x, y); g.lineTo(x + size, y); g.lineTo(x + size / 2, y + size * 0.8); }
    g.closePath(); g.fill();
  }
}
