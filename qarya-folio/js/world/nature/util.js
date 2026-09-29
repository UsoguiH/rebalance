import * as THREE from 'three';

// أدوات مشتركة لوحدة الطبيعة: seeded random, the exact height of the rendered
// (faceted) ground, keep-out checks, and the wind-sway material patch that
// palms, shrubs and reeds share.

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Height of the terrain *mesh* (piecewise-linear triangles), so small things
// and decals sit exactly on the drawn facets instead of the smooth function.
// Mirrors PlaneGeometry's grid and triangle split used in core/terrain.js.
export function makeGroundHeight(ctx) {
  const { LAYOUT, heightAt } = ctx;
  const seg = ctx.mobile ? 110 : 170;
  const size = LAYOUT.size, half = size / 2, cell = size / seg;
  const n = seg + 1;
  const grid = new Float32Array(n * n).fill(NaN);
  const H = (ix, iz) => {
    const k = iz * n + ix;
    let h = grid[k];
    if (h !== h) { h = heightAt(ix * cell - half, iz * cell - half); grid[k] = h; }
    return h;
  };
  return (x, z) => {
    let fx = (x + half) / cell, fz = (z + half) / cell;
    if (fx < 0 || fz < 0 || fx >= seg || fz >= seg) return heightAt(x, z);
    const ix = Math.floor(fx), iz = Math.floor(fz);
    const u = fx - ix, v = fz - iz;
    const ha = H(ix, iz), hb = H(ix, iz + 1), hc = H(ix + 1, iz + 1), hd = H(ix + 1, iz);
    if (u + v <= 1) return ha + (hd - ha) * u + (hb - ha) * v;
    return hc + (hb - hc) * (1 - u) + (hd - hc) * (1 - v);
  };
}

// Keep-out: zone circles, landmarks, named spots, and the likely paths
// between them (the village draws its lanes between these same points).
export function makeKeepOut(ctx) {
  const { zones, spots } = ctx.content;
  const { LAYOUT } = ctx;
  const points = [];
  for (const z of zones) {
    points.push({ x: z.x, z: z.z, r: z.radius });
    if (z.landmark && z.id !== 'oasis') points.push({ x: z.landmark.x, z: z.landmark.z, r: 2 });
  }
  for (const k of Object.keys(spots)) points.push({ x: spots[k].x, z: spots[k].z, r: 1 });
  points.push({ x: LAYOUT.spawn.x, z: LAYOUT.spawn.z, r: 2 });

  const S = LAYOUT.spawn, W = spots.well, G = spots.gate;
  const zp = (id) => { const z = zones.find((q) => q.id === id); return z ? { x: z.x, z: z.z } : null; };
  const segs = [];
  const seg = (a, b, extra = 0) => { if (a && b) segs.push([a.x, a.z, b.x, b.z, extra]); };
  seg(S, G); seg(G, W); seg(W, spots.souq); seg(W, zp('about')); seg(W, zp('skills'), 3); // the skill signpost avenue is wider
  seg(zp('about'), zp('oasis')); seg(zp('skills'), zp('oasis')); seg(G, zp('contact'));
  seg(G, spots.playground); seg(G, spots.campfire); seg(spots.souq, zp('project-1'));
  seg(spots.souq, zp('project-0'));

  function segDist(x, z, s) {
    const dx = s[2] - s[0], dz = s[3] - s[1];
    const L2 = dx * dx + dz * dz || 1;
    let t = ((x - s[0]) * dx + (z - s[1]) * dz) / L2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(x - (s[0] + dx * t), z - (s[1] + dz * t));
  }

  // clear: extra metres around zones/spots; pathClear: half-width kept free along paths.
  return function ok(x, z, clear = 6, pathClear = 3) {
    for (const p of points) if (Math.hypot(x - p.x, z - p.z) < p.r + clear) return false;
    // Paths only matter inside and just around the village.
    if (Math.hypot(x, z) < LAYOUT.village.r + 8) {
      for (const s of segs) if (segDist(x, z, s) < pathClear + s[4]) return false;
    }
    return true;
  };
}

// Oasis shoreline: radius from the pond centre where the ground rises above
// the water, sampled at N angles.
export function makeShore(ctx, groundH) {
  const { oasis } = ctx.LAYOUT;
  const N = 96;
  const radii = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    let r = 0;
    while (r < oasis.r * 2 && groundH(oasis.x + Math.cos(a) * r, oasis.z + Math.sin(a) * r) < oasis.water) r += 0.05;
    radii[i] = r;
  }
  const at = (a) => {
    let f = ((a / (Math.PI * 2)) % 1 + 1) % 1 * N;
    const i = Math.floor(f) % N, j = (i + 1) % N;
    f -= Math.floor(f);
    return radii[i] * (1 - f) + radii[j] * f;
  };
  let max = 0;
  for (const r of radii) max = Math.max(max, r);
  return { at, max, N };
}

// Per-vertex sway weight attribute, computed from the merged geometry.
export function addSway(geo, fn) {
  const p = geo.attributes.position;
  const w = new Float32Array(p.count);
  for (let i = 0; i < p.count; i++) w[i] = fn(p.getX(i), p.getY(i), p.getZ(i));
  geo.setAttribute('sway', new THREE.BufferAttribute(w, 1));
  return geo;
}

// Shared uniforms for all wind-driven materials.
export const windUniforms = {
  uTime: { value: 0 },
  uWind: { value: new THREE.Vector4(1, 0, 0.5, 0) }, // dir.x, dir.z, strength, gust
};

const SWAY_HEAD = /* glsl */`
uniform float uTime;
uniform vec4 uWind;
attribute float sway;
`;
const SWAY_BODY = /* glsl */`
#include <begin_vertex>
{
  vec3 wdir = vec3(uWind.x, 0.0, uWind.y);
  #ifdef USE_INSTANCING
    float ph = instanceMatrix[3].x * 0.37 + instanceMatrix[3].z * 0.23;
    wdir = normalize(transpose(mat3(instanceMatrix)) * wdir);
  #else
    float ph = position.x * 0.31 + position.z * 0.23;
  #endif
  float s = uWind.z, g = uWind.w;
  float bend = sway * (0.10 * s + 0.16 * g + (0.07 + 0.08 * g) * sin(uTime * 1.3 + ph) + 0.035 * sin(uTime * 2.7 + ph * 1.9));
  transformed += wdir * bend;
  transformed.y -= abs(bend) * 0.18;
  transformed.y += sin(uTime * (4.5 + 3.0 * g) + ph + position.x * 1.7 + position.z * 1.9) * sway * (0.02 + 0.03 * g);
}
`;

function patchSway(sh) {
  sh.uniforms.uTime = windUniforms.uTime;
  sh.uniforms.uWind = windUniforms.uWind;
  sh.vertexShader = SWAY_HEAD + sh.vertexShader.replace('#include <begin_vertex>', SWAY_BODY);
}

// Lambert (vertex colours, faceted) that bends with the wind, plus the
// matching depth material so shadows sway too.
export function swayMaterial({ side = THREE.FrontSide } = {}) {
  const material = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side });
  material.onBeforeCompile = patchSway;
  material.customProgramCacheKey = () => 'qarya-sway';
  const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, side });
  depth.onBeforeCompile = patchSway;
  depth.customProgramCacheKey = () => 'qarya-sway-depth';
  return { material, depth };
}

// Wing flapping for birds and insects: vertices rotate about the body's
// long axis (Z) by an angle that depends on |x|.
export function flapMaterial({ freq, amp, bias = 0, glide = false }) {
  const material = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide });
  material.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = windUniforms.uTime;
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', /* glsl */`
#include <begin_vertex>
{
  float ph = 0.0;
  #ifdef USE_INSTANCING
    ph = float(gl_InstanceID) * 2.17;
  #endif
  float ax = abs(position.x);
  float k = ${glide ? 'smoothstep(-0.1, 0.5, sin(uTime * 0.45 + ph * 0.7))' : '1.0'};
  float a = (${amp.toFixed(3)} * sin(uTime * ${freq.toFixed(2)} + ph)) * k + ${bias.toFixed(3)} * (1.0 - k * 0.5);
  if (ax > 0.02) {
    transformed.x = sign(position.x) * ax * cos(a);
    transformed.y += ax * sin(a);
  }
}
`);
  };
  material.customProgramCacheKey = () => `qarya-flap-${freq}-${amp}-${bias}-${glide}`;
  return material;
}

// Instanced layer helper: collects candidate transforms, then builds one
// InstancedMesh. Candidates can be dropped later (set to zero scale).
export class Layer {
  constructor(geometry, material, { castShadow = true, receiveShadow = true, depth = null, name = '' } = {}) {
    this.geometry = geometry;
    this.material = material;
    this.depth = depth;
    this.items = [];
    this.opts = { castShadow, receiveShadow, name };
  }
  add(x, y, z, { yaw = 0, scale = 1, sx, sy, sz, tilt, color, collider, r = 1 } = {}) {
    this.items.push({ x, y, z, yaw, sx: sx ?? scale, sy: sy ?? scale, sz: sz ?? scale, tilt, color, collider, r, alive: true });
  }
  build(scene) {
    const n = this.items.length;
    const mesh = new THREE.InstancedMesh(this.geometry, this.material, Math.max(1, n));
    mesh.count = n;
    mesh.castShadow = this.opts.castShadow;
    mesh.receiveShadow = this.opts.receiveShadow;
    mesh.name = this.opts.name;
    if (this.depth) mesh.customDepthMaterial = this.depth;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s = new THREE.Vector3();
    const c = new THREE.Color();
    this.items.forEach((it, i) => {
      e.set(it.tilt ? it.tilt[0] : 0, it.yaw, it.tilt ? it.tilt[1] : 0, 'YXZ');
      q.setFromEuler(e);
      m.compose(v.set(it.x, it.y, it.z), q, s.set(it.sx, it.sy, it.sz));
      mesh.setMatrixAt(i, m);
      if (it.color !== undefined) mesh.setColorAt(i, c.set(it.color));
      else if (mesh.instanceColor) mesh.setColorAt(i, c.set(0xffffff));
    });
    // Instances extend a long way from the origin: a whole-layer bounding sphere.
    mesh.computeBoundingSphere();
    this.mesh = mesh;
    scene.add(mesh);
    return mesh;
  }
  hide(i) {
    this.items[i].alive = false;
    const m = new THREE.Matrix4().makeScale(0, 0, 0);
    this.mesh.setMatrixAt(i, m);
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
