// Cel shading: cached toon materials, inverted-hull ink outlines and a static batcher
// that merges scenery by material so the whole map costs a few dozen draw calls.
import * as THREE from 'three';

const gradCache = {};
export function gradient(steps = [0.58, 0.8, 1.0]) {
  const key = steps.join(',');
  if (gradCache[key]) return gradCache[key];
  const data = new Uint8Array(steps.length * 4);
  steps.forEach((s, i) => {
    const v = Math.round(s * 255);
    data.set([v, v, v, 255], i * 4);
  });
  const tex = new THREE.DataTexture(data, steps.length, 1, THREE.RGBAFormat);
  tex.minFilter = tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return (gradCache[key] = tex);
}

const matCache = new Map();
// Shared toon material. opts: { map, emissive, side, transparent, steps, flat, vertexColors }
export function toon(color, opts = {}) {
  const key = [color, opts.map ? opts.map.uuid : '', opts.emissive || '', opts.side || 0, opts.transparent ? 1 : 0, (opts.steps || []).join('/'), opts.vertexColors ? 1 : 0, opts.alphaTest || 0, opts.tag || ''].join('|');
  let m = matCache.get(key);
  if (m) return m;
  m = new THREE.MeshToonMaterial({
    color: new THREE.Color(color),
    gradientMap: gradient(opts.steps),
    map: opts.map || null,
    side: opts.side || THREE.FrontSide,
    transparent: !!opts.transparent,
    vertexColors: !!opts.vertexColors,
    alphaTest: opts.alphaTest || 0,
  });
  if (opts.emissive) {
    m.emissive = new THREE.Color(opts.emissive);
    m.emissiveIntensity = opts.emissiveIntensity ?? 1;
  }
  matCache.set(key, m);
  return m;
}

export function basic(color, opts = {}) {
  const key = 'b|' + color + '|' + (opts.map ? opts.map.uuid : '') + '|' + (opts.transparent ? 1 : 0) + '|' + (opts.opacity ?? 1) + '|' + (opts.side || 0) + '|' + (opts.depthWrite === false ? 0 : 1) + '|' + (opts.blending || 0) + '|' + (opts.tag || '');
  let m = matCache.get(key);
  if (m) return m;
  m = new THREE.MeshBasicMaterial({
    color: new THREE.Color(color),
    map: opts.map || null,
    transparent: !!opts.transparent,
    opacity: opts.opacity ?? 1,
    side: opts.side || THREE.FrontSide,
    depthWrite: opts.depthWrite !== false,
    blending: opts.blending || THREE.NormalBlending,
    alphaTest: opts.alphaTest || 0,
  });
  matCache.set(key, m);
  return m;
}

// ---------------------------------------------------------------- outlines
// Hard-edged meshes have split normals at corners, so pushing along them tears the
// hull apart. Each geometry gets an `outlineNormal` attribute: the average normal of
// every face sharing that position.
export function ensureOutlineNormals(geo) {
  if (geo.attributes.outlineNormal) return geo;
  if (!geo.attributes.normal) geo.computeVertexNormals();
  const pos = geo.attributes.position, nor = geo.attributes.normal;
  const map = new Map();
  const key = (i) => `${Math.round(pos.getX(i) * 1000)},${Math.round(pos.getY(i) * 1000)},${Math.round(pos.getZ(i) * 1000)}`;
  for (let i = 0; i < pos.count; i++) {
    const k = key(i);
    let a = map.get(k);
    if (!a) map.set(k, (a = [0, 0, 0]));
    a[0] += nor.getX(i);
    a[1] += nor.getY(i);
    a[2] += nor.getZ(i);
  }
  const out = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const a = map.get(key(i));
    const l = Math.hypot(a[0], a[1], a[2]) || 1;
    out[i * 3] = a[0] / l;
    out[i * 3 + 1] = a[1] / l;
    out[i * 3 + 2] = a[2] / l;
  }
  geo.setAttribute('outlineNormal', new THREE.BufferAttribute(out, 3));
  return geo;
}

const outlineMats = new Map();
export function outlineMaterial(thickness = 0.035, color = 0x1a0f08) {
  const key = thickness + '|' + color;
  let m = outlineMats.get(key);
  if (m) return m;
  m = new THREE.ShaderMaterial({
    uniforms: { thickness: { value: thickness }, color: { value: new THREE.Color(color) }, opacity: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute vec3 outlineNormal;
      uniform float thickness;
      #include <common>
      #include <fog_pars_vertex>
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vec3 n = normalize(normalMatrix * outlineNormal);
        // keep lines a similar weight on screen whatever the camera distance
        float k = thickness * clamp(-mvPosition.z / 30.0, 0.5, 2.0);
        mvPosition.xyz += n * k;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 color;
      uniform float opacity;
      #include <common>
      #include <fog_pars_fragment>
      void main() {
        gl_FragColor = vec4(color, opacity);
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
    side: THREE.BackSide,
    fog: true,
  });
  m.uniforms.fogColor = { value: new THREE.Color() };
  m.uniforms.fogNear = { value: 1 };
  m.uniforms.fogFar = { value: 2000 };
  m.uniforms.fogDensity = { value: 0 };
  outlineMats.set(key, m);
  return m;
}

// Adds an ink hull as a child of `mesh` (shares its geometry).
export function inkMesh(mesh, thickness = 0.035, color = 0x1a0f08) {
  ensureOutlineNormals(mesh.geometry);
  const o = new THREE.Mesh(mesh.geometry, outlineMaterial(thickness, color));
  o.castShadow = false;
  o.receiveShadow = false;
  o.userData.isOutline = true;
  o.raycast = () => {};
  mesh.add(o);
  return o;
}

// Walks a hierarchy and inks every visible mesh that does not opt out.
export function ink(root, thickness = 0.035, color = 0x1a0f08) {
  const list = [];
  root.traverse((o) => {
    if (o.isMesh && !o.userData.isOutline && !o.userData.noInk) list.push(o);
  });
  for (const m of list) inkMesh(m, m.userData.inkThickness ?? thickness, color);
  return root;
}

export function shadowed(root, cast = true, receive = true) {
  root.traverse((o) => {
    if (o.isMesh && !o.userData.isOutline) {
      o.castShadow = cast && !o.userData.noShadow;
      o.receiveShadow = receive;
    }
  });
  return root;
}

// ---------------------------------------------------------------- mesh helper
// m(geometry, color, x, y, z, opts) -> Mesh, the workhorse of every model builder.
export function m(geo, color, x = 0, y = 0, z = 0, opts = {}) {
  const mat = opts.material || (opts.basic ? basic(color, opts) : toon(color, opts));
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  if (opts.rx) mesh.rotation.x = opts.rx;
  if (opts.ry) mesh.rotation.y = opts.ry;
  if (opts.rz) mesh.rotation.z = opts.rz;
  if (opts.s !== undefined) {
    if (Array.isArray(opts.s)) mesh.scale.set(opts.s[0], opts.s[1], opts.s[2]);
    else mesh.scale.setScalar(opts.s);
  }
  if (opts.noInk) mesh.userData.noInk = true;
  if (opts.ink !== undefined) mesh.userData.inkThickness = opts.ink;
  if (opts.noShadow) mesh.userData.noShadow = true;
  return mesh;
}

// ---------------------------------------------------------------- static batching
// Collects meshes (with world transforms) and merges them by material.
export class Batcher {
  constructor() {
    this.groups = new Map();
    this.loose = [];
  }
  addObject(root) {
    root.updateMatrixWorld(true);
    root.traverse((o) => {
      if (!o.isMesh || !o.visible) return;
      const mat = o.material;
      if (Array.isArray(mat)) {
        // multi-material meshes are kept as they are
        this.loose.push({ geo: o.geometry, mat, matrix: o.matrixWorld.clone(), cast: o.castShadow, receive: o.receiveShadow });
        return;
      }
      let g = this.groups.get(mat);
      if (!g) this.groups.set(mat, (g = { mat, items: [], outline: !!o.userData.isOutline, cast: false, receive: false }));
      g.items.push({ geo: o.geometry, matrix: o.matrixWorld.clone() });
      g.cast = g.cast || o.castShadow;
      g.receive = g.receive || o.receiveShadow;
    });
  }
  build(parent) {
    const meshes = [];
    for (const g of this.groups.values()) {
      const geos = [];
      for (const it of g.items) {
        let geo = it.geo.index ? it.geo.toNonIndexed() : it.geo.clone();
        // keep only attributes the material needs, so everything merges cleanly
        for (const name of Object.keys(geo.attributes)) {
          if (!['position', 'normal', 'uv', 'color', 'outlineNormal', 'aU'].includes(name)) geo.deleteAttribute(name);
        }
        if (!g.outline && geo.attributes.outlineNormal) geo.deleteAttribute('outlineNormal');
        if (g.outline && !geo.attributes.outlineNormal) {
          ensureOutlineNormals(it.geo);
          geo = it.geo.index ? it.geo.toNonIndexed() : it.geo.clone();
        }
        geo.applyMatrix4(it.matrix);
        if (geo.attributes.outlineNormal) {
          const nm = new THREE.Matrix3().getNormalMatrix(it.matrix);
          const a = geo.attributes.outlineNormal, v = new THREE.Vector3();
          for (let i = 0; i < a.count; i++) {
            v.fromBufferAttribute(a, i).applyMatrix3(nm).normalize();
            a.setXYZ(i, v.x, v.y, v.z);
          }
        }
        geos.push(geo);
      }
      const merged = mergeGeometries(geos);
      if (!merged) continue;
      const mesh = new THREE.Mesh(merged, g.mat);
      mesh.castShadow = g.cast && !g.outline;
      mesh.receiveShadow = g.receive;
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      parent.add(mesh);
      meshes.push(mesh);
    }
    for (const l of this.loose) {
      const mesh = new THREE.Mesh(l.geo, l.mat);
      mesh.matrixAutoUpdate = false;
      mesh.matrix.copy(l.matrix);
      mesh.castShadow = l.cast;
      mesh.receiveShadow = l.receive;
      parent.add(mesh);
    }
    this.loose = [];
    this.groups.clear();
    return meshes;
  }
}

export function mergeGeometries(geos) {
  if (!geos.length) return null;
  const names = Object.keys(geos[0].attributes).filter((n) => geos.every((g) => g.attributes[n]));
  let total = 0;
  for (const g of geos) total += g.attributes.position.count;
  const out = new THREE.BufferGeometry();
  for (const n of names) {
    const size = geos[0].attributes[n].itemSize;
    const arr = new Float32Array(total * size);
    let off = 0;
    for (const g of geos) {
      const a = g.attributes[n];
      if (a.isInterleavedBufferAttribute || a.array.length !== a.count * size) {
        for (let i = 0; i < a.count; i++) for (let k = 0; k < size; k++) arr[(off + i) * size + k] = a.getComponent(i, k);
      } else arr.set(a.array, off * size);
      off += a.count;
    }
    out.setAttribute(n, new THREE.BufferAttribute(arr, size));
  }
  out.computeBoundingSphere();
  out.computeBoundingBox();
  return out;
}
