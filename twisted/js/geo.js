// Geometry batching: collects quads, boxes and transformed primitives per material,
// then merges them into a handful of meshes so the whole town draws in few calls.
import * as THREE from 'three';

const _v = new THREE.Vector3();
const _n = new THREE.Vector3();
const _m3 = new THREE.Matrix3();

export class Batch {
  constructor() {
    this.groups = new Map();
  }
  group(key, material) {
    let g = this.groups.get(key);
    if (!g) {
      g = { material, pos: [], nor: [], uv: [], col: [], idx: [], vc: false };
      this.groups.set(key, g);
    } else if (material && !g.material) g.material = material;
    return g;
  }
  // a,b,c,d: [x,y,z] in counter-clockwise order seen from the front. uv: [[u,v] x4]
  quad(key, a, b, c, d, uv, color) {
    const g = this.group(key);
    const base = g.pos.length / 3;
    const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const ad = [d[0] - a[0], d[1] - a[1], d[2] - a[2]];
    let nx = ab[1] * ad[2] - ab[2] * ad[1];
    let ny = ab[2] * ad[0] - ab[0] * ad[2];
    let nz = ab[0] * ad[1] - ab[1] * ad[0];
    const l = Math.hypot(nx, ny, nz) || 1;
    nx /= l;
    ny /= l;
    nz /= l;
    for (const p of [a, b, c, d]) {
      g.pos.push(p[0], p[1], p[2]);
      g.nor.push(nx, ny, nz);
    }
    const u = uv || [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ];
    for (const t of u) g.uv.push(t[0], t[1]);
    const c4 = color || [1, 1, 1];
    for (let i = 0; i < 4; i++) g.col.push(c4[0], c4[1], c4[2]);
    g.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  // four vertical walls of a (possibly rotated) box; UVs in meters / tile size so textures repeat
  walls(key, cx, cz, w, d, y0, h, rot = 0, tileU = 1, tileV = 1, opts = {}) {
    const c = Math.cos(rot), s = Math.sin(rot);
    const P = (lx, lz, y) => [cx + lx * c + lz * s, y, cz - lx * s + lz * c];
    const hw = w / 2, hd = d / 2;
    const y1 = y0 + h;
    const v0 = (opts.vOffset || 0) / tileV, v1 = v0 + h / tileV;
    const faces = [
      // front (+z local)
      [P(-hw, hd, y0), P(hw, hd, y0), P(hw, hd, y1), P(-hw, hd, y1), w],
      // right (+x)
      [P(hw, hd, y0), P(hw, -hd, y0), P(hw, -hd, y1), P(hw, hd, y1), d],
      // back (-z)
      [P(hw, -hd, y0), P(-hw, -hd, y0), P(-hw, -hd, y1), P(hw, -hd, y1), w],
      // left (-x)
      [P(-hw, -hd, y0), P(-hw, hd, y0), P(-hw, hd, y1), P(-hw, -hd, y1), d],
    ];
    faces.forEach((f, i) => {
      if (opts.skip && opts.skip.includes(i)) return;
      const len = f[4];
      let uw = len / tileU;
      if (opts.snapU) uw = Math.max(1, Math.round(uw));
      const k = opts.faceKeys ? opts.faceKeys[i] || key : key;
      this.quad(k, f[0], f[1], f[2], f[3], [
        [0, v0],
        [uw, v0],
        [uw, v1],
        [0, v1],
      ]);
    });
  }
  // horizontal top face
  top(key, cx, cz, w, d, y, rot = 0, tile = 1) {
    const c = Math.cos(rot), s = Math.sin(rot);
    const P = (lx, lz) => [cx + lx * c + lz * s, y, cz - lx * s + lz * c];
    const hw = w / 2, hd = d / 2;
    this.quad(key, P(-hw, hd), P(hw, hd), P(hw, -hd), P(-hw, -hd), [
      [0, 0],
      [w / tile, 0],
      [w / tile, d / tile],
      [0, d / tile],
    ]);
  }
  box(key, cx, y0, cz, w, h, d, rot = 0, tile = 1, color) {
    this.walls(key, cx, cz, w, d, y0, h, rot, tile, tile);
    this.top(key, cx, cz, w, d, y0 + h, rot, tile);
    if (color) {
      const g = this.group(key);
      const n = g.col.length;
      for (let i = n - 20 * 3; i < n; i += 3) {
        g.col[i] = color[0];
        g.col[i + 1] = color[1];
        g.col[i + 2] = color[2];
      }
    }
  }
  // any BufferGeometry transformed by matrix (color tints the vertex colors)
  geo(key, geometry, matrix, color) {
    const g = this.group(key);
    const base = g.pos.length / 3;
    const p = geometry.attributes.position;
    const n = geometry.attributes.normal;
    const uv = geometry.attributes.uv;
    const vc = geometry.attributes.color;
    _m3.getNormalMatrix(matrix);
    for (let i = 0; i < p.count; i++) {
      _v.fromBufferAttribute(p, i).applyMatrix4(matrix);
      g.pos.push(_v.x, _v.y, _v.z);
      if (n) {
        _n.fromBufferAttribute(n, i).applyMatrix3(_m3).normalize();
        g.nor.push(_n.x, _n.y, _n.z);
      } else g.nor.push(0, 1, 0);
      if (uv) g.uv.push(uv.getX(i), uv.getY(i));
      else g.uv.push(0, 0);
      if (vc) {
        const c = color || [1, 1, 1];
        g.col.push(vc.getX(i) * c[0], vc.getY(i) * c[1], vc.getZ(i) * c[2]);
      } else {
        const c = color || [1, 1, 1];
        g.col.push(c[0], c[1], c[2]);
      }
    }
    if (geometry.index) {
      const ix = geometry.index.array;
      for (let i = 0; i < ix.length; i++) g.idx.push(base + ix[i]);
    } else for (let i = 0; i < p.count; i++) g.idx.push(base + i);
  }
  toGeometry(g) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(g.pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(g.nor, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(g.uv, 2));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(g.col, 3));
    const count = g.pos.length / 3;
    geo.setIndex(count > 65535 ? new THREE.Uint32BufferAttribute(g.idx, 1) : new THREE.Uint16BufferAttribute(g.idx, 1));
    geo.computeBoundingSphere();
    geo.computeBoundingBox();
    return geo;
  }
  build(parent, { cast = true, receive = true } = {}) {
    const meshes = [];
    for (const [key, g] of this.groups) {
      if (!g.idx.length) continue;
      const mesh = new THREE.Mesh(this.toGeometry(g), g.material);
      mesh.name = key;
      mesh.castShadow = cast && !(g.material && g.material.userData.noShadow);
      mesh.receiveShadow = receive;
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      parent.add(mesh);
      meshes.push(mesh);
    }
    this.groups.clear();
    return meshes;
  }
}

// helper to build a matrix from position / yaw / scale
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
export function mat(x, y, z, ry = 0, sx = 1, sy = 1, sz = 1, rx = 0, rz = 0) {
  _e.set(rx, ry, rz, 'YXZ');
  _q.setFromEuler(_e);
  return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), _q, new THREE.Vector3(sx, sy, sz));
}

// paints a tint into a geometry's vertex colors (adds attribute if needed)
export function tint(geo, color) {
  const c = new THREE.Color(color);
  const n = geo.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}
