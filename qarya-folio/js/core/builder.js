import * as THREE from 'three';
import { mergeGeometries } from 'three-addons';

// Builder: collects many small coloured pieces into one faceted mesh with
// vertex colours. That's the whole art style in one helper: low-poly shapes,
// flat shading, one draw call per building (or per village chunk).
//
//   const b = new Builder();
//   b.box([2, 3, 2], P.mud, { position: [0, 1.5, 0] });
//   b.add(new THREE.ConeGeometry(1, 2, 6), P.palmLeaf, { position: [...], rotation: [...], scale: [...] });
//   const mesh = b.build();   // THREE.Mesh, castShadow + receiveShadow on
//   scene.add(mesh);

const shared = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const e = new THREE.Euler();
const v = new THREE.Vector3();
const s = new THREE.Vector3();

export class Builder {
  constructor() {
    this.parts = [];
  }

  // geometry: any BufferGeometry (it is cloned). color: hex string or THREE.Color.
  // opts: { position:[x,y,z], rotation:[x,y,z], scale:[x,y,z]|number, matrix: Matrix4 }
  add(geometry, color, opts = {}) {
    let g = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    for (const name of Object.keys(g.attributes)) {
      if (name !== 'position' && name !== 'normal') g.deleteAttribute(name);
    }
    if (opts.matrix) {
      g.applyMatrix4(opts.matrix);
    } else {
      const p = opts.position || [0, 0, 0];
      const r = opts.rotation || [0, 0, 0];
      const sc = opts.scale === undefined ? [1, 1, 1] : (typeof opts.scale === 'number' ? [opts.scale, opts.scale, opts.scale] : opts.scale);
      m.compose(v.set(p[0], p[1], p[2]), q.setFromEuler(e.set(r[0], r[1], r[2])), s.set(sc[0], sc[1], sc[2]));
      g.applyMatrix4(m);
    }
    const c = color instanceof THREE.Color ? color : new THREE.Color(color);
    const n = g.attributes.position.count;
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    if (!g.attributes.normal) g.computeVertexNormals();
    this.parts.push(g);
    return this;
  }

  box(size, color, opts) {
    return this.add(new THREE.BoxGeometry(size[0], size[1], size[2]), color, opts);
  }

  cylinder(rTop, rBottom, height, color, opts = {}, segments = 8) {
    return this.add(new THREE.CylinderGeometry(rTop, rBottom, height, segments), color, opts);
  }

  sphere(radius, color, opts = {}, detail = 1) {
    return this.add(new THREE.IcosahedronGeometry(radius, detail), color, opts);
  }

  // Merge everything added so far into one mesh.
  build({ castShadow = true, receiveShadow = true, material = shared } = {}) {
    if (!this.parts.length) return new THREE.Group();
    const geo = mergeGeometries(this.parts, false);
    this.parts.forEach((g) => g.dispose());
    this.parts = [];
    geo.computeBoundingSphere();
    const mesh = new THREE.Mesh(geo, material);
    mesh.castShadow = castShadow;
    mesh.receiveShadow = receiveShadow;
    return mesh;
  }
}

export const flatMaterial = shared;

// Cached single-colour flat material for meshes that move on their own.
const cache = new Map();
export function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!cache.has(key)) cache.set(key, new THREE.MeshLambertMaterial({ color, flatShading: true, ...opts }));
  return cache.get(key);
}
