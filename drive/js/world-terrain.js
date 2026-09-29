// world-terrain.js - deterministic dune height field + polar terrain mesh (+ exact mesh sampler).
import * as THREE from 'three';
import { makeSimplex, smoothstep, clamp, GLSL_HASH } from './world-util.js';
import { ZONE_DEFS, SPAWN, GROUND_RADIUS, zoneLayout, LANDMARK_OFFSET } from './world-layout.js';

const S = (a, b, x) => smoothstep(a, b, x);

export function createHeightField(seed = 7) {
  const n = makeSimplex(seed);
  const n2 = makeSimplex(seed + 101);
  const wa = 0.42, ca = Math.cos(wa), sa = Math.sin(wa);
  const plats = ZONE_DEFS.map((d) => { const l = zoneLayout(d); return { x: l.cx, z: l.cz, y: d.platY, inner: l.inner, outer: l.outer, lx: l.lx, lz: l.lz, id: d.id }; });
  const skills = plats.find((p) => p.id === 'skills');

  function base(x, z) {
    // domain warp
    const wx = x + 9 * n2(x * 0.013, z * 0.013), wz = z + 9 * n2(x * 0.013 + 40, z * 0.013 - 17);
    const u = wx * ca + wz * sa, v = -wx * sa + wz * ca;         // u across wind, v along wind
    let h = 2.6 * n(u / 95, v / 150);                             // broad swells
    const r = 1 - Math.sqrt(n(u / 34 + 3.1, v / 58) ** 2 + 0.06);  // soft-ridged crests
    h += 1.9 * (r - 0.6);
    h += 0.45 * n(x / 11 + 9, z / 11);                            // small undulation
    h += 0.12 * n(x / 4.2, z / 4.2);
    return h;
  }

  function heightAt(x, z) {
    let h = base(x, z);
    const r = Math.hypot(x, z);
    // spawn plateau
    const ws = 1 - S(SPAWN.plateauInner, SPAWN.plateauOuter, r);
    if (ws > 0) h += (SPAWN.y - h) * ws;
    for (let i = 0; i < plats.length; i++) {
      const p = plats[i];
      const d = Math.hypot(x - p.x, z - p.z);
      if (d < p.outer) { const w = 1 - S(p.inner, p.outer, d); h += (p.y - h) * w; }
    }
    // oasis basin
    {
      const d = Math.hypot(x - skills.lx, z - skills.lz);
      if (d < 7) h -= 0.85 * (1 - S(3.2, 7, d));
    }
    // rising rim so the horizon reads as big dunes, never a hard edge
    const rim = S(110, 190, r) * (7 + 3 * n(x / 40 + 5, z / 40)) * (1 - S(205, GROUND_RADIUS, r) * 0.7);
    return h + rim;
  }
  return { heightAt, plats };
}

/** Build terrain mesh. Returns { mesh, meshY(x,z), geometry }. */
export function buildTerrain({ heightAt, quality, uniforms }) {
  const P = {
    low:  { s1: 2.5, S: 160, n2: 10 },
    med:  { s1: 1.7, S: 224, n2: 14 },
    high: { s1: 1.4, S: 288, n2: 16 },
  }[quality] || { s1: 1.7, S: 224, n2: 14 };
  const R1 = 112, R = GROUND_RADIUS;
  const n1 = Math.round(R1 / P.s1);
  const NR = n1 + P.n2;
  const rad = new Float32Array(NR + 1);
  for (let i = 0; i <= n1; i++) rad[i] = (i / n1) * R1;
  for (let k = 1; k <= P.n2; k++) rad[n1 + k] = R1 + (R - R1) * Math.pow(k / P.n2, 1.5);
  const SEG = P.S;
  const N = (NR + 1) * SEG;
  const pos = new Float32Array(N * 3), nor = new Float32Array(N * 3), col = new Float32Array(N * 3);
  const hs = new Float32Array(N);
  const nz = makeSimplex(555);
  const cA = new THREE.Color('#f0c98c'), cB = new THREE.Color('#dca062'), cC = new THREE.Color('#b56f45'), cD = new THREE.Color('#7f6a58');
  const cPlaza = new THREE.Color('#f3d7a4'), cGreen = new THREE.Color('#8fa25a'), cWet = new THREE.Color('#a9835a');
  const tmp = new THREE.Color();
  const skillsDef = ZONE_DEFS.find((d) => d.id === 'skills'); const sl = zoneLayout(skillsDef);
  const zl = ZONE_DEFS.map((d) => zoneLayout(d));
  const eps = 0.7;
  for (let i = 0; i <= NR; i++) {
    for (let j = 0; j < SEG; j++) {
      const a = (j / SEG) * Math.PI * 2;
      const x = Math.cos(a) * rad[i], z = Math.sin(a) * rad[i];
      const h = heightAt(x, z);
      const idx = i * SEG + j;
      pos[idx * 3] = x; pos[idx * 3 + 1] = h; pos[idx * 3 + 2] = z; hs[idx] = h;
      const dx = heightAt(x + eps, z) - heightAt(x - eps, z), dz = heightAt(x, z + eps) - heightAt(x, z - eps);
      const inv = 1 / Math.hypot(dx / (2 * eps), 1, dz / (2 * eps));
      nor[idx * 3] = -dx / (2 * eps) * inv; nor[idx * 3 + 1] = inv; nor[idx * 3 + 2] = -dz / (2 * eps) * inv;
      // colour
      const nn = nz(x / 23, z / 23) * 0.5 + 0.5;
      const t = clamp((h + 2.5) / 6.2 + (nn - 0.5) * 0.35, 0, 1);
      if (t < 0.5) tmp.copy(cC).lerp(cB, S(0.0, 0.5, t)); else tmp.copy(cB).lerp(cA, S(0.5, 1.0, t));
      // lee-side darkening (slope facing away from the sun at ~ -x)
      const slope = Math.hypot(nor[idx * 3], nor[idx * 3 + 2]);
      const facing = -nor[idx * 3] * 0.9 - nor[idx * 3 + 2] * 0.3;
      tmp.multiplyScalar(1 - 0.16 * slope * (1 - clamp(facing * 3 + 0.5, 0, 1)));
      if (h < -2.6) tmp.lerp(cD, 0.25 * S(-2.6, -4.5, h));
      // wind ripple banding
      const band = 0.5 + 0.5 * Math.sin((x * 0.87 + z * 0.5) * 0.9 + nz(x / 30, z / 30) * 5);
      tmp.multiplyScalar(0.95 + 0.07 * band);
      // plazas
      for (let k = 0; k < zl.length; k++) {
        const d = Math.hypot(x - zl[k].cx, z - zl[k].cz);
        if (d < zl[k].outer) tmp.lerp(cPlaza, 0.45 * (1 - S(zl[k].inner - 4, zl[k].outer - 4, d)));
      }
      { const d = Math.hypot(x, z); if (d < 30) tmp.lerp(cPlaza, 0.4 * (1 - S(12, 30, d))); }
      { const d = Math.hypot(x - sl.lx, z - sl.lz);
        if (d < 15) { tmp.lerp(cGreen, 0.55 * (1 - S(6, 15, d)) * (0.6 + 0.4 * nn)); tmp.lerp(cWet, 0.5 * (1 - S(3, 8, d))); } }
      col[idx * 3] = tmp.r; col[idx * 3 + 1] = tmp.g; col[idx * 3 + 2] = tmp.b;
    }
  }
  const idxArr = new Uint32Array(NR * SEG * 6);
  let q = 0;
  for (let i = 0; i < NR; i++) {
    for (let j = 0; j < SEG; j++) {
      const j1 = (j + 1) % SEG;
      const a = i * SEG + j, b = (i + 1) * SEG + j, c = (i + 1) * SEG + j1, d = i * SEG + j1;
      idxArr[q++] = a; idxArr[q++] = c; idxArr[q++] = b;
      idxArr[q++] = a; idxArr[q++] = d; idxArr[q++] = c;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setIndex(new THREE.BufferAttribute(idxArr, 1));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), R + 30);
  geo.boundingBox = new THREE.Box3(new THREE.Vector3(-R, -10, -R), new THREE.Vector3(R, 30, R));

  let mat;
  if (quality === 'low') {
    mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  } else {
    mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96, metalness: 0 });
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uNight = uniforms.uNight;
      sh.uniforms.uSparkle = { value: quality === 'high' ? 1 : 0.6 };
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
        .replace('#include <project_vertex>', '#include <project_vertex>\nvWPos = (modelMatrix * vec4(transformed,1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>
varying vec3 vWPos; uniform float uNight; uniform float uSparkle;
${GLSL_HASH}
float ripPh(vec2 p){
  vec2 q = vec2(p.x*0.87 + p.y*0.5, -p.x*0.5 + p.y*0.87);
  float warp = sin(q.y*0.35)*1.3 + sin(q.y*0.11+1.7)*2.3 + sin(q.x*0.07)*1.0;
  return q.x*4.2 + warp;
}`)
        .replace('#include <color_fragment>', `#include <color_fragment>
float dView = length(vViewPosition);
float fadeR = 1.0 - smoothstep(20.0, 85.0, dView);
float ph1 = ripPh(vWPos.xz);
float ph2 = ripPh(vWPos.xz*2.3 + 7.0);
diffuseColor.rgb *= 1.0 + fadeR*(0.055*sin(ph1) + 0.03*sin(ph2));`)
        .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
{
  vec2 g = (cos(ph1)*4.2*0.6 + cos(ph2)*9.7*0.25) * vec2(0.87,0.5);
  vec3 pert = (viewMatrix * vec4(-g.x, 0.0, -g.y, 0.0)).xyz;
  normal = normalize(normal + pert * 0.11 * fadeR);
}`)
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
{
  vec2 cell = vWPos.xz*26.0; vec2 fc = floor(cell); float hh = hash21(fc);
  float sp = step(0.978, hh) * smoothstep(0.42, 0.0, length(fract(cell)-0.5));
  float tw = pow(abs(sin(hh*80.0 + dot(normalize(vViewPosition), normal)*24.0)), 10.0);
  totalEmissiveRadiance += vec3(1.0,0.86,0.62) * sp * tw * (1.0-smoothstep(8.0,38.0,dView)) * uSparkle * (1.0-uNight*0.8) * 0.9;
}`);
    };
  }
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.castShadow = quality !== 'low';
  mesh.frustumCulled = false;
  mesh.name = 'terrain';

  // exact sampler of the rendered (piecewise linear) surface, used for decals
  function meshY(x, z) {
    const r = Math.hypot(x, z);
    if (r >= R - 0.01) return heightAt(x, z);
    // binary search ring
    let lo = 0, hi = NR;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (rad[mid] <= r) lo = mid; else hi = mid; }
    const i = lo;
    let ang = Math.atan2(z, x); if (ang < 0) ang += Math.PI * 2;
    const fj = (ang / (Math.PI * 2)) * SEG; const j = Math.min(SEG - 1, Math.floor(fj)); const j1 = (j + 1) % SEG;
    const ia = i * SEG + j, ib = (i + 1) * SEG + j, ic = (i + 1) * SEG + j1, id = i * SEG + j1;
    const tri = (p, q2, s) => {
      const ax = pos[p * 3], az = pos[p * 3 + 2], bx = pos[q2 * 3], bz = pos[q2 * 3 + 2], cx = pos[s * 3], cz = pos[s * 3 + 2];
      const den = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
      if (Math.abs(den) < 1e-9) return null;
      const w1 = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / den;
      const w2 = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / den;
      const w3 = 1 - w1 - w2;
      if (w1 < -1e-4 || w2 < -1e-4 || w3 < -1e-4) return null;
      return w1 * hs[p] + w2 * hs[q2] + w3 * hs[s];
    };
    const y = tri(ia, ic, ib);
    if (y !== null) return y;
    const y2 = tri(ia, id, ic);
    return y2 !== null ? y2 : heightAt(x, z);
  }
  return { mesh, meshY, geometry: geo, material: mat, tris: NR * SEG * 2 };
}
