// GLSL pattern library and a helper that grafts world-space procedural colour onto
// MeshToonMaterial, so ground, cliffs and walls keep the toon lighting and shadows.
import * as THREE from 'three';
import { gradient } from './toon.js';

export const GLSL_LIB = /* glsl */ `
float h21(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec2 h22(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yzx+33.33); return fract((p3.xx+p3.yz)*p3.zy); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(h21(i), h21(i+vec2(1,0)), u.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), u.x), u.y); }
float fbm2(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++){ s += a*vnoise(p); p = p*2.03 + 17.1; a *= 0.5; } return s / 0.9375; }
// Voronoi with distance to the cell border (iq). x: border distance, y: cell hash, zw: cell centre offset
vec4 voro(vec2 x){
  vec2 n = floor(x), f = fract(x), mg, mr; float md = 8.0;
  for (int j=-1;j<=1;j++) for (int i=-1;i<=1;i++){ vec2 g = vec2(float(i),float(j)); vec2 o = h22(n+g)*0.85+0.075; vec2 r = g+o-f; float d = dot(r,r); if (d<md){ md=d; mr=r; mg=g; } }
  md = 8.0;
  for (int j=-2;j<=2;j++) for (int i=-2;i<=2;i++){ vec2 g = mg+vec2(float(i),float(j)); vec2 o = h22(n+g)*0.85+0.075; vec2 r = g+o-f;
    if (dot(mr-r,mr-r) > 0.00001) md = min(md, dot(0.5*(mr+r), normalize(r-mr))); }
  return vec4(md, h21(n+mg), mr);
}
// Herringbone bricks of 1x2 cells. Returns (edge distance, brick hash, local u, local v)
vec4 herring(vec2 p){
  float fx = floor(p.x), fy = floor(p.y);
  vec2 o = vec2(0.0); vec2 sz = vec2(1.0);
  bool found = false;
  for (int k = 0; k < 2; k++){
    float X = fx - float(k);
    if (!found && abs(mod(X - fy, 4.0)) < 0.5){ o = vec2(X, fy); sz = vec2(2.0, 1.0); found = true; }
  }
  for (int k = 0; k < 2; k++){
    float Y = fy - float(k);
    if (!found && abs(mod(fx - Y - 3.0, 4.0)) < 0.5){ o = vec2(fx, Y); sz = vec2(1.0, 2.0); found = true; }
  }
  vec2 l = p - o;
  float e = min(min(l.x, sz.x - l.x), min(l.y, sz.y - l.y));
  return vec4(e, h21(o + sz*3.1), l / sz);
}
// Running-bond bricks. Returns (edge distance, hash, local uv)
vec4 bricks(vec2 p, vec2 size){
  vec2 q = p / size;
  float row = floor(q.y);
  q.x += mod(row, 2.0) * 0.5;
  vec2 id = floor(q); vec2 f = fract(q);
  vec2 e2 = min(f, 1.0 - f) * size;
  return vec4(min(e2.x, e2.y), h21(id + 0.37), f);
}
`;

// Wraps a MeshToonMaterial with a world-position based colour function.
// colorCode must assign `vec3 col` from `vec3 wp` (and may use vU / vN).
export function proceduralToon({ uniforms = {}, colorCode, lib = '', steps = [0.62, 0.84, 1.0], attrU = false, side = THREE.FrontSide, extraVertex = '', objectSpace = false }) {
  const mat = new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: gradient(steps), side });
  mat.userData.uniforms = uniforms;
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vWP;\nvarying vec3 vWN;\n${attrU ? 'attribute float aU; varying float vU;' : ''}`)
      .replace('#include <project_vertex>', `#include <project_vertex>\nvWP = ${objectSpace ? 'transformed' : '(modelMatrix * vec4(transformed, 1.0)).xyz'};\nvWN = normalize(mat3(modelMatrix) * objectNormal);\n${attrU ? 'vU = aU;' : ''}\n${extraVertex}`);
    const decl = Object.entries(uniforms)
      .map(([k, u]) => {
        const v = u.value;
        const t = v && v.isColor ? 'vec3' : v && v.isVector4 ? 'vec4' : v && v.isVector3 ? 'vec3' : v && v.isVector2 ? 'vec2' : v && v.isTexture ? 'sampler2D' : Array.isArray(v) ? null : 'float';
        if (!t) return '';
        return `uniform ${t} ${k};`;
      })
      .join('\n');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vWP;\nvarying vec3 vWN;\n${attrU ? 'varying float vU;' : ''}\n${decl}\n${GLSL_LIB}\n${lib}`)
      .replace('#include <map_fragment>', `{ vec3 wp = vWP; vec3 col = vec3(1.0);\n${colorCode}\n diffuseColor.rgb *= col; }`);
  };
  const key = strHash(colorCode + lib + extraVertex) + ':' + (attrU ? 1 : 0) + (objectSpace ? 'o' : 'w');
  mat.customProgramCacheKey = () => key;
  return mat;
}

function strHash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
}

export const C = (hex) => ({ value: new THREE.Color(hex) });
