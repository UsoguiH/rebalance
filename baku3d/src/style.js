// OWNER: Style agent.  Usogui hand-inked manga look with digital colouring.
//   toon(hex, opts?)          -> THREE.Material   (builders use this for EVERY surface; opts.role picks the palette)
//   createStage(THREE, renderer, scene) -> { camera, target, render(), resize(w,h) }
//   finalize?(THREE, scene, root, stage)  (adds inverted-hull ink outlines, aims the backdrop glow)
//
// Pipeline (all display-referred, no tone mapping):
//   1. shadow pass  (depth from the key light, custom PCF in the toon shader)
//   2. main pass    (MRT: colour + [view normal, view depth]) -> toon shading, screen-space hatching, hull ink
//   3. post pass    (normal/depth ink edges, paper grain, halftone, vignette, grade)
import * as THREE from 'three';
import { VERT_NOISE, FRAG_NOISE } from './style_glsl.js';
import { ROLES, resolveRole } from './style_roles.js';

// ------------------------------------------------------------------ shared uniforms
const U = {
  uLV: { value: new THREE.Vector3(-0.45, 0.6, 0.65).normalize() },   // key light dir, view space
  uRV: { value: new THREE.Vector3(0.7, 0.2, -0.6).normalize() },     // rim light dir, view space
  uRes: { value: new THREE.Vector2(1156, 1264) },
  uScale: { value: 1 },
  uShadowMap: { value: null },
  uShadowMatrix: { value: new THREE.Matrix4() },
  uShadowTexel: { value: 1 / 2048 },
  uGlow: { value: new THREE.Vector3(0.1, 1.35, -0.9) },
};

// World-space key light: warm, from the viewer's top-left front.
const LIGHT_W = new THREE.Vector3(-0.55, 0.8, 0.62).normalize();
const RIM_W = new THREE.Vector3(0.85, 0.35, -0.25).normalize();

const outlineMeshes = [];
let backdropGroup = null;
let bgWall = null, bgVelvet = null;

// ------------------------------------------------------------------ toon material
const TOON_VERT = /* glsl */`
varying vec3 vNv; varying vec3 vNw; varying vec3 vPw; varying vec3 vVp; varying vec3 vCol;
void main(){
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vPw = wp.xyz;
  vec4 mv = viewMatrix * wp;
  vVp = mv.xyz;
  vNv = normalize(normalMatrix * normal);
  #ifdef USE_COLOR
    vCol = color;
  #else
    vCol = vec3(1.0);
  #endif
  gl_Position = projectionMatrix * mv;
}`;

const TOON_FRAG = /* glsl */`
precision highp float;
layout(location = 0) out vec4 oCol;
layout(location = 1) out vec4 oNorm;
uniform vec3 uBase; uniform vec3 uLitM; uniform vec3 uMidM; uniform vec3 uShadeM; uniform vec3 uDeepM;
uniform vec3 uInk; uniform vec3 uSpecCol; uniform vec3 uRimCol;
uniform float uMidT, uSolid;
uniform float uSpec, uShin, uBump, uHatch, uPitch, uAngle, uStrand, uRim, uMetal, uFlat, uFlatCol, uLitT;
uniform vec3 uLV; uniform vec3 uRV; uniform vec2 uRes; uniform float uScale;
uniform sampler2D uShadowMap; uniform mat4 uShadowMatrix; uniform float uShadowTexel;
varying vec3 vNv; varying vec3 vNw; varying vec3 vPw; varying vec3 vVp; varying vec3 vCol;
${FRAG_NOISE}

float shadowAt(vec3 pw, vec3 nw){
  vec3 p = pw + nw * 0.014;
  vec4 sp = uShadowMatrix * vec4(p, 1.0);
  vec3 sc = sp.xyz / sp.w;
  if (sc.x < 0.0 || sc.x > 1.0 || sc.y < 0.0 || sc.y > 1.0 || sc.z > 1.0) return 1.0;
  float s = 0.0;
  for (int i = -1; i <= 1; i++) for (int j = -1; j <= 1; j++) {
    float d = texture(uShadowMap, sc.xy + vec2(float(i), float(j)) * uShadowTexel * 1.2).r;
    s += step(sc.z - 0.0012, d);
  }
  return s / 9.0;
}

float foldN(vec3 p){
  float a = 1.0 - abs(vn3(p) * 2.0 - 1.0);
  float b = 1.0 - abs(vn3(p * 2.7 + 5.1) * 2.0 - 1.0);
  return a * 0.65 + b * 0.35;
}

float strokes(vec2 p, float ang, float pitch, float cov){
  if (cov < 0.02) return 0.0;
  ang -= 1.5708;
  float c = cos(ang), sn = sin(ang);
  vec2 q = vec2(p.x * c + p.y * sn, -p.x * sn + p.y * c);
  q.x += (vn(p * 0.02) - 0.5) * pitch * 0.35;
  float id = floor(q.x / pitch);
  float f = fract(q.x / pitch) - 0.5;
  float rnd = h21(vec2(id, 7.13));
  float seg = vn(vec2(q.y / (pitch * 5.0) + rnd * 20.0, id * 3.71));
  seg = smoothstep(0.30, 0.70, seg);
  float thr = 1.0 - cov * 1.25;
  float on = smoothstep(thr, thr + 0.18, seg);
  float width = pitch * (0.07 + 0.19 * cov) * (0.65 + 0.7 * rnd);
  float d = abs(f) * pitch;
  float aa = 0.75 / uScale;
  return (1.0 - smoothstep(width - aa, width + aa, d)) * on;
}

void main(){
  vec3 N = normalize(vNv);
  if (uFlat > 0.5) N = normalize(cross(dFdx(vVp), dFdy(vVp)));
  else if (!gl_FrontFacing) N = -N;
  mat3 V2W = transpose(mat3(viewMatrix));
  vec3 Nw = V2W * N;

  if (uBump > 0.0) {
    vec3 p = vPw * 4.2;
    float e = 0.03;
    float f0 = foldN(p);
    vec3 g = vec3(foldN(p + vec3(e, 0., 0.)) - f0, foldN(p + vec3(0., e, 0.)) - f0, foldN(p + vec3(0., 0., e)) - f0) / e;
    g -= Nw * dot(g, Nw);
    Nw = normalize(Nw - g * uBump * 0.35);
    N = normalize(mat3(viewMatrix) * Nw);
  }

  vec3 V = normalize(-vVp);
  float ndl = dot(N, uLV);
  float sh = shadowAt(vPw, V2W * normalize(vNv));
  float s = min(ndl, mix(-0.30, 1.0, sh));

  vec3 base = pow(max(uBase * vCol, 0.0), vec3(1.0 / 2.2));
  float e = 0.03;
  float bLit  = smoothstep(uLitT - e, uLitT + e, s);
  float bMid  = smoothstep(uMidT - e, uMidT + e, s);
  float bDeep = smoothstep(-0.62 - e, -0.62 + e, s);
  vec3 col;
  if (uFlatCol > 0.5) {
    col = mix(base * uShadeM, base * uLitM, smoothstep(-0.3, 0.3, s));
  } else {
    col = mix(base * uShadeM, base * uMidM, bMid);
    col = mix(col, base * uLitM, bLit);
    col = mix(base * uDeepM, col, bDeep);
  }

  vec3 H = normalize(uLV + V);
  float ndh = max(dot(N, H), 0.0);

  if (uMetal > 0.5) {
    // gold: strong yellow -> orange -> brown ramp driven by a fake studio reflection
    vec3 R = reflect(-V, N);
    float env = R.y * 0.5 + 0.5;
    env += (vn3(vPw * 3.0) - 0.5) * 0.12;
    float t = 0.55 * env + 0.45 * (s * 0.5 + 0.5);
    t = mix(t * 0.55, t, smoothstep(-0.2, 0.15, s));
    t += pow(ndh, 28.0) * 0.5;
    vec3 c0 = vec3(0.20, 0.09, 0.02);
    vec3 c1 = vec3(0.52, 0.31, 0.05);
    vec3 c2 = vec3(0.86, 0.62, 0.12);
    vec3 c3 = vec3(1.00, 0.86, 0.36);
    vec3 c4 = vec3(1.00, 0.98, 0.82);
    float k = 0.025;
    vec3 g = c0;
    g = mix(g, c1, smoothstep(0.26 - k, 0.26 + k, t));
    g = mix(g, c2, smoothstep(0.44 - k, 0.44 + k, t));
    g = mix(g, c3, smoothstep(0.62 - k, 0.62 + k, t));
    g = mix(g, c4, smoothstep(0.82 - k, 0.82 + k, t));
    // soft in-band gradient
    col = mix(g, g * base * 1.25, 0.25);
  }

  float sp = smoothstep(0.55, 0.60, pow(ndh, uShin * 0.25));
  col = mix(col, uSpecCol, sp * uSpec * smoothstep(0.0, 0.5, sh));

  float fres = 1.0 - max(dot(N, V), 0.0);
  float rim = smoothstep(0.62, 0.90, fres) * smoothstep(0.0, 0.5, dot(N, uRV));
  col = mix(col, uRimCol, rim * uRim);

  // --- ink: hatching / stipple, screen-space, diagonal like the reference
  vec2 p = gl_FragCoord.xy / uScale;
  float ink = 0.0;
  float c1 = smoothstep(uMidT + 0.12, uMidT - 0.22, s) * uHatch * 0.85 + uStrand * smoothstep(0.5, -0.2, s);
  float c2 = smoothstep(uMidT - 0.25, uMidT - 0.55, s) * uHatch * 0.9;
  float c3 = smoothstep(-0.60, -0.9, s) * uHatch;
  ink = max(ink, strokes(p, uAngle, uPitch, c1));
  ink = max(ink, strokes(p, uAngle - 0.85, uPitch * 1.12, c2));
  float st = step(h21(floor(p / 2.0) + 3.0), c3 * 0.5) * step(0.01, c3);
  ink = max(ink, st);
  ink *= 0.95;
  // solid spot-black in the deepest creases / under folds
  float solid = smoothstep(-0.58, -0.78, s) * uSolid;
  ink = max(ink, solid);
  col = mix(col, uInk, ink);

  oCol = vec4(col, 1.0);
  oNorm = vec4(N * 0.5 + 0.5, -vVp.z * 0.1);
}`;

export function toon(hex = 0xffffff, opts = {}) {
  const role = opts.role && ROLES[opts.role] ? opts.role : 'suit';
  const r = resolveRole(role, opts);
  const color = new THREE.Color(hex);
  const uniforms = {
    ...U,
    uBase: { value: color },
    uLitM: { value: new THREE.Vector3(...r.lit) },
    uMidM: { value: new THREE.Vector3(...r.mid) },
    uShadeM: { value: new THREE.Vector3(...r.shade) },
    uDeepM: { value: new THREE.Vector3(...r.deep) },
    uInk: { value: new THREE.Vector3(...r.ink) },
    uSpecCol: { value: new THREE.Vector3(...r.specCol) },
    uRimCol: { value: new THREE.Vector3(...r.rimCol) },
    uSpec: { value: r.spec }, uShin: { value: r.shin }, uBump: { value: r.bump },
    uHatch: { value: r.hatch }, uPitch: { value: r.pitch }, uAngle: { value: r.angle },
    uStrand: { value: r.strand }, uRim: { value: r.rim }, uMetal: { value: r.metal ? 1 : 0 },
    uFlat: { value: opts.flatShading ? 1 : 0 }, uFlatCol: { value: r.flatCol ? 1 : 0 },
    uLitT: { value: r.litT }, uMidT: { value: r.midT }, uSolid: { value: r.solid },
  };
  const mat = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms, vertexShader: TOON_VERT, fragmentShader: TOON_FRAG,
    side: opts.side ?? THREE.FrontSide,
    vertexColors: !!opts.vertexColors,
  });
  mat.color = color;
  mat.userData.role = role;
  mat.userData.inkWidth = opts.outline === false ? 0 : (typeof opts.outline === 'number' ? opts.outline : r.outline);
  return mat;
}

// ------------------------------------------------------------------ hull outlines
const HULL_VERT = /* glsl */`
uniform float uWidth; uniform vec3 uLV; uniform vec2 uRes; uniform float uScale;
varying float vZ;
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vec3 nv = normalize(normalMatrix * normal);
  vec4 clip = projectionMatrix * mv;
  vec2 dir = (projectionMatrix * vec4(nv, 0.0)).xy;
  float l = length(dir);
  dir = l > 1e-5 ? dir / l : vec2(0.0);
  float lit = dot(nv, uLV) * 0.5 + 0.5;
  float wm = mix(1.65, 0.70, smoothstep(0.25, 0.8, lit));      // heavier ink on the shadow side
  wm *= clamp(3.0 / max(-mv.z, 0.5), 0.75, 1.45);               // closer = heavier
  float px = uWidth * uScale * wm;
  clip.xy += dir * (px * 2.0 / uRes) * clip.w;
  clip.z += 0.0015 * clip.w;
  vZ = -mv.z;
  gl_Position = clip;
}`;
const HULL_FRAG = /* glsl */`
precision highp float;
layout(location = 0) out vec4 oCol;
layout(location = 1) out vec4 oNorm;
uniform vec3 uInkCol;
varying float vZ;
void main(){
  oCol = vec4(uInkCol, 1.0);
  oNorm = vec4(0.5, 0.5, 1.0, vZ * 0.1);
}`;

const hullGeoCache = new WeakMap();
function smoothGeometry(geo) {
  if (hullGeoCache.has(geo)) return hullGeoCache.get(geo);
  const pos = geo.getAttribute('position');
  const idx = geo.getIndex();
  const n = pos.count;
  const key = new Map();
  const ids = new Int32Array(n);
  const sums = [];
  for (let i = 0; i < n; i++) {
    const k = `${Math.round(pos.getX(i) * 2e4)},${Math.round(pos.getY(i) * 2e4)},${Math.round(pos.getZ(i) * 2e4)}`;
    let id = key.get(k);
    if (id === undefined) { id = sums.length; key.set(k, id); sums.push([0, 0, 0]); }
    ids[i] = id;
  }
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const tri = idx ? idx.count / 3 : n / 3;
  for (let t = 0; t < tri; t++) {
    const i0 = idx ? idx.getX(t * 3) : t * 3, i1 = idx ? idx.getX(t * 3 + 1) : t * 3 + 1, i2 = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
    if (!(i0 < n && i1 < n && i2 < n)) continue;
    a.fromBufferAttribute(pos, i0); b.fromBufferAttribute(pos, i1); c.fromBufferAttribute(pos, i2);
    b.sub(a); c.sub(a); b.cross(c); // area-weighted face normal
    for (const i of [i0, i1, i2]) { const s = sums[ids[i]]; s[0] += b.x; s[1] += b.y; s[2] += b.z; }
  }
  const nor = new Float32Array(n * 3);
  const v = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const s = sums[ids[i]];
    v.set(s[0], s[1], s[2]);
    if (v.lengthSq() < 1e-14) v.set(geo.getAttribute('normal') ? geo.getAttribute('normal').getX(i) : 0, geo.getAttribute('normal') ? geo.getAttribute('normal').getY(i) : 1, geo.getAttribute('normal') ? geo.getAttribute('normal').getZ(i) : 0);
    v.normalize();
    nor[i * 3] = v.x; nor[i * 3 + 1] = v.y; nor[i * 3 + 2] = v.z;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', pos);
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  if (idx) g.setIndex(idx);
  g.boundingSphere = geo.boundingSphere; g.boundingBox = geo.boundingBox;
  hullGeoCache.set(geo, g);
  return g;
}

const hullMats = new Map();
function hullMaterial(width, inkCol) {
  const k = width.toFixed(2) + inkCol.join();
  if (hullMats.has(k)) return hullMats.get(k);
  const m = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3, side: THREE.BackSide,
    uniforms: { uWidth: { value: width }, uLV: U.uLV, uRes: U.uRes, uScale: U.uScale, uInkCol: { value: new THREE.Vector3(...inkCol) } },
    vertexShader: HULL_VERT, fragmentShader: HULL_FRAG,
  });
  hullMats.set(k, m);
  return m;
}

export function finalize(_T, scene, root, _stage) {
  const targets = [];
  // The style backdrop (wall + velvet drapes) replaces any big flat wall / velvet back panel the
  // builders made; use their bounding boxes to place ours.
  try {
    scene.updateMatrixWorld(true);
    const bb = new THREE.Box3(), sz = new THREE.Vector3(), ct = new THREE.Vector3();
    (root || scene).traverse(o => {
      if (!o.isMesh || o.userData.isOutline || !o.geometry) return;
      bb.setFromObject(o); bb.getSize(sz); bb.getCenter(ct);
      const role = o.material && o.material.userData && o.material.userData.role;
      if (sz.x > 2.5 && sz.z < 0.08) { o.visible = false; if (bgWall) bgWall.position.z = Math.min(bb.max.z, -0.2) - 0.01; }
      else if (role === 'velvet' && sz.y > 1.0 && sz.z < 0.25 && sz.x > 0.3) {
        o.visible = false;
        if (bgVelvet) { bgVelvet.position.set(ct.x, ct.y, bb.max.z - 0.015); bgVelvet.scale.set(sz.x + 0.03, sz.y + 0.1, 1); }
      }
    });
  } catch (e) { /* keep defaults */ }
  (root || scene).traverse(o => {
    if (!o.isMesh || !o.visible || o.isInstancedMesh || o.isSkinnedMesh || o.userData.isOutline || o.userData.noOutline) return;
    if (!o.geometry || !o.geometry.getAttribute('position')) return;
    targets.push(o);
  });
  for (const m of targets) {
    const mat = Array.isArray(m.material) ? m.material[0] : m.material;
    if (!mat || mat.transparent || mat.opacity < 1) continue;
    if (mat.userData && mat.userData.role === 'hair' && !/scalp/i.test(m.name)) continue; // thin strands: no hull, edge pass inks them
    let w = mat.userData && mat.userData.inkWidth;
    if (w === undefined) w = 2.0;
    if (w <= 0) continue;
    const ink = (ROLES[mat.userData?.role]?.ink) || [0.06, 0.03, 0.04];
    let hg; try { hg = smoothGeometry(m.geometry); } catch (e) { console.warn('style: hull skipped', e.message); continue; }
    const hull = new THREE.Mesh(hg, hullMaterial(w, ink.map(x => x * 0.55)));
    hull.userData.isOutline = true;
    hull.frustumCulled = false;
    hull.castShadow = false; hull.receiveShadow = false;
    m.add(hull);
    outlineMeshes.push(hull);
  }
  // aim the backdrop glow at the head (second child of the root by contract)
  try {
    scene.updateMatrixWorld(true);
    const head = root && root.children[1];
    if (head) {
      const box = new THREE.Box3().setFromObject(head);
      if (isFinite(box.min.x)) {
        const c = box.getCenter(new THREE.Vector3());
        U.uGlow.value.set(c.x + 0.05, c.y + 0.02, -0.9); 
      }
    }
  } catch (e) { /* keep default */ }
}

// ------------------------------------------------------------------ backdrop
const BACK_VERT = /* glsl */`
varying vec3 vPw; varying vec3 vVp;
void main(){
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vPw = wp.xyz; vec4 mv = viewMatrix * wp; vVp = mv.xyz;
  gl_Position = projectionMatrix * mv;
}`;
const BACK_FRAG = /* glsl */`
precision highp float;
layout(location = 0) out vec4 oCol;
layout(location = 1) out vec4 oNorm;
uniform float uMode; uniform vec3 uGlow; uniform vec2 uRes; uniform float uScale;
uniform sampler2D uShadowMap; uniform mat4 uShadowMatrix; uniform float uShadowTexel;
varying vec3 vPw; varying vec3 vVp;
${FRAG_NOISE}

float shadowAt(vec3 pw){
  vec4 sp = uShadowMatrix * vec4(pw, 1.0);
  vec3 sc = sp.xyz / sp.w;
  if (sc.x < 0.0 || sc.x > 1.0 || sc.y < 0.0 || sc.y > 1.0 || sc.z > 1.0) return 1.0;
  float s = 0.0;
  for (int i = -1; i <= 1; i++) for (int j = -1; j <= 1; j++) {
    float d = texture(uShadowMap, sc.xy + vec2(float(i), float(j)) * uShadowTexel * 2.0).r;
    s += step(sc.z - 0.004, d);
  }
  return s / 9.0;
}

float strokesB(vec2 p, float ang, float pitch, float cov){
  if (cov < 0.02) return 0.0;
  float c = cos(ang), sn = sin(ang);
  vec2 q = vec2(p.x * c + p.y * sn, -p.x * sn + p.y * c);
  q.x += (vn(p * 0.02) - 0.5) * pitch * 0.4;
  float id = floor(q.x / pitch);
  float f = fract(q.x / pitch) - 0.5;
  float rnd = h21(vec2(id, 3.3));
  float seg = smoothstep(0.2, 0.8, vn(vec2(q.y / (pitch * 10.0) + rnd * 30.0, id * 2.9)));
  float thr = 1.0 - cov * 1.25;
  float on = smoothstep(thr, thr + 0.2, seg);
  float width = pitch * (0.08 + 0.3 * cov) * (0.6 + 0.8 * rnd);
  float aa = 0.75 / uScale;
  return (1.0 - smoothstep(width - aa, width + aa, abs(f) * pitch)) * on;
}

vec3 velvetRamp(float t){
  vec3 a = vec3(0.14, 0.01, 0.045);
  vec3 b = vec3(0.38, 0.03, 0.10);
  vec3 c = vec3(0.52, 0.06, 0.14);
  vec3 d = vec3(0.70, 0.13, 0.19);
  vec3 e = vec3(0.98, 0.52, 0.30);
  vec3 f = vec3(1.00, 0.76, 0.46);
  vec3 col = mix(a, b, smoothstep(0.0, 0.25, t));
  col = mix(col, c, smoothstep(0.22, 0.50, t));
  col = mix(col, d, smoothstep(0.48, 0.72, t));
  col = mix(col, e, smoothstep(0.70, 0.92, t));
  col = mix(col, f, smoothstep(0.92, 1.1, t));
  return col;
}

void main(){
  vec2 w = vPw.xy;
  vec2 p = gl_FragCoord.xy / uScale;
  vec3 col;
  if (uMode > 0.5) {
    // ---- deep crimson velvet panel: one wide diagonal fold, warm glow upper right / behind the head
    vec2 v = (w - vec2(0.0, 1.0)) / 0.37;
    vec2 gv = (uGlow.xy - vec2(0.0, 1.0)) / 0.37 + vec2(0.6, 0.5);
    float lean = v.x * 0.9 + v.y * 0.55;
    float warp = vn(vec2(v.x * 0.7, v.y * 0.4)) * 2.6 + vn(vec2(v.x * 2.2, v.y * 0.9)) * 0.7;
    float f1 = 0.5 + 0.5 * sin(lean * 2.6 + warp);
    float f2 = 0.5 + 0.5 * sin(lean * 6.5 + warp * 1.5 + 1.3);
    float fold = f1 * 0.78 + f2 * 0.22;
    float g = smoothstep(-1.6, 2.6, v.x * 0.9 + 0.55 * v.y);
    float d = length((v - gv) * vec2(0.85, 0.75));
    float glow = exp(-d * d * 0.40);
    float t = 0.22 + 0.20 * g + 0.62 * glow + (fold - 0.5) * 0.36;
    t -= 0.36 * smoothstep(-0.8, -3.2, v.y);
    t -= 0.10 * smoothstep(0.2, -1.2, v.x) * (1.0 - glow);
    col = velvetRamp(clamp(t, 0.0, 1.0));
    float gully = smoothstep(0.34, 0.20, fold) * (1.0 - glow * 0.5);
    col = mix(col, col * vec3(0.38, 0.22, 0.30), gully * 0.85);
    float sh = shadowAt(vPw);
    float shade = (1.0 - sh);
    col *= mix(1.0, 0.62, shade);
    float cov = gully * 0.7 + shade * 0.35 + smoothstep(0.16, 0.0, t) * 0.8;
    float ink = strokesB(p, -0.20 + (vn(p * 0.004) - 0.5) * 0.15, 6.5, cov * 0.5);
    col = mix(col, vec3(0.09, 0.005, 0.03), ink * 0.8);
  } else {
    // ---- pale worn brick wall: very fine mortar, barely-there bricks, grime, warm glow near the throne
    vec3 cream = vec3(1.0, 0.985, 0.92);
    vec3 dark = vec3(0.90, 0.86, 0.76);
    const float BH = 0.15, BW = 0.34;
    float row = floor(w.y / BH);
    float bx = w.x / BW + mod(row, 2.0) * 0.5;
    vec2 bc = vec2(fract(bx), fract(w.y / BH));
    float dm = min(min(bc.x, 1.0 - bc.x) * BW, min(bc.y, 1.0 - bc.y) * BH);
    float brk = smoothstep(0.45, 0.70, vn(vec2(w.x * 9.0, w.y * 9.0)));
    float mortar = (1.0 - smoothstep(0.0008, 0.0026, dm)) * brk;
    float tone = vn(w * 1.3) * 0.5 + vn(w * 5.0) * 0.25 + h21(floor(vec2(bx, row))) * 0.25;
    float grime = vn(w * 9.0) * vn(w * 2.3 + 7.0);
    col = mix(cream, dark, clamp(tone * 0.35 + grime * 0.45 + 0.30 * smoothstep(0.6, -0.5, w.y) + 0.30 * smoothstep(0.7, 1.6, abs(w.x)), 0.0, 1.0));
    col = mix(col, vec3(1.0, 0.86, 0.58), 0.22 * exp(-pow(abs(w.x) - 0.55, 2.0) * 7.0) * smoothstep(-0.2, 1.4, w.y));
    col = mix(col, vec3(0.50, 0.44, 0.38), mortar * 0.45);
    float cn = abs(vn(w * vec2(2.3, 3.4) + vec2(9.0, 3.0)) - 0.5);
    float cm = smoothstep(0.76, 0.86, vn(w * 1.1 + 4.0)) * smoothstep(1.3, 0.9, abs(w.x));
    col = mix(col, vec3(0.25, 0.2, 0.17), (1.0 - smoothstep(0.002, 0.007, cn)) * cm * 0.6);
    float sh = shadowAt(vPw);
    col *= mix(1.0, 0.86, 1.0 - sh);
    col *= 1.0 - 0.18 * smoothstep(1.0, 1.9, abs(w.x));
  }
  oCol = vec4(col, 1.0);
  oNorm = vec4(0.5, 0.5, 1.0, -vVp.z * 0.1);
}`;

function backdropMaterial(mode) {
  return new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms: { ...U, uMode: { value: mode } },
    vertexShader: BACK_VERT, fragmentShader: BACK_FRAG,
  });
}

// ------------------------------------------------------------------ post
const POST_VERT = /* glsl */`
varying vec2 vUv;
void main(){ vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const POST_FRAG = /* glsl */`
precision highp float;
layout(location = 0) out vec4 oCol;
uniform sampler2D tColor; uniform sampler2D tNorm; uniform vec2 uRes; uniform float uScale;
varying vec2 vUv;
${FRAG_NOISE}
void main(){
  vec2 px = vec2(1.0) / uRes;
  float r = 1.15 * max(uScale, 0.8);
  vec3 col = texture(tColor, vUv).rgb;
  vec4 nc = texture(tNorm, vUv);
  float zc = nc.w;
  vec3 n0 = nc.xyz * 2.0 - 1.0;
  vec2 offs[4] = vec2[4](vec2(r, 0.), vec2(-r, 0.), vec2(0., r), vec2(0., -r));
  float dz = 0.0; float dn = 0.0;
  for (int i = 0; i < 4; i++) {
    vec4 nn = texture(tNorm, vUv + offs[i] * px);
    float rel = abs(nn.w - zc) / max(max(nn.w, zc), 0.05);
    dz = max(dz, rel);
    if (rel < 0.02) dn = max(dn, 1.0 - dot(n0, nn.xyz * 2.0 - 1.0));
  }
  // thick ink where a big depth jump marks a silhouette
  float big = 0.0;
  for (int i = 0; i < 4; i++) {
    vec4 nn = texture(tNorm, vUv + offs[i] * px * 2.4);
    big = max(big, abs(nn.w - zc) / max(max(nn.w, zc), 0.05));
  }
  vec2 gp = gl_FragCoord.xy / uScale;
  float wob = 0.75 + 0.5 * vn(gp * 0.06);
  float eDepth = smoothstep(0.018, 0.045, dz * wob);
  float eNorm = smoothstep(0.40, 0.80, dn * wob);
  float eBig = smoothstep(0.10, 0.22, big);
  float edge = max(max(eDepth, eNorm * 0.75), eBig);
  col = mix(col, vec3(0.06, 0.03, 0.05), edge * 0.92);

  // grade: a bit punchier, warmer
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(lum), col, 1.10);
  col = (col - 0.5) * 1.10 + 0.5;
  col *= vec3(1.01, 1.0, 0.985);

  // paper grain + printed-ink speckle + mild halftone
  float g1 = h21(floor(gl_FragCoord.xy));
  float g2 = vn(gl_FragCoord.xy * 0.35);
  float g3 = vn(gl_FragCoord.xy * vec2(0.03, 0.9));          // fibres
  col *= 1.0 - 0.05 * g1 - 0.045 * g2 - 0.03 * g3 + 0.11;
  float dark = 1.0 - smoothstep(0.0, 0.12, lum);
  
  float ang = 0.785398;
  vec2 hp = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * (gl_FragCoord.xy / uScale);
  vec2 cell = fract(hp / 5.0) - 0.5;
  float dot_ = smoothstep(0.50, 0.30, length(cell) / (0.15 + 0.45 * (1.0 - lum)));
  col *= 1.0 - 0.07 * dot_ * smoothstep(0.85, 0.35, lum);

  // vignette
  vec2 q = vUv - 0.5;
  float vig = smoothstep(0.95, 0.35, length(q * vec2(1.0, 1.05)));
  col *= mix(0.80, 1.0, vig);
  col = mix(col, col * vec3(1.0, 0.92, 0.90), 1.0 - vig);

  oCol = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

// ------------------------------------------------------------------ stage
export function createStage(_T, renderer, scene) {
  scene.background = null;
  try { if (typeof document !== 'undefined' && /[?&]shot\b/.test(location.search)) { const st = document.createElement('style'); st.textContent = '#hint{display:none!important}'; document.head.appendChild(st); } } catch (e) { /* ignore */ }

  // slight low-angle heroic camera, framed like refs/ref_full.jpg
  const camera = new THREE.PerspectiveCamera(32, 1156 / 1264, 0.1, 100);
  camera.position.set(0, 0.85, 2.2);
  const target = new THREE.Vector3(0, 0.85, 0);
  camera.lookAt(target);

  // backdrop: wall behind, velvet throne-back in front of it
  backdropGroup = new THREE.Group();
  backdropGroup.name = 'backdrop';
  backdropGroup.userData.noOutline = true;
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), backdropMaterial(0));
  wall.scale.set(10, 7, 1); wall.position.set(0, 1.2, -0.96);
  const velvet = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), backdropMaterial(1));
  velvet.scale.set(0.76, 3.2, 1); velvet.position.set(0, 1.15, -0.47);
  bgWall = wall; bgVelvet = velvet;
  for (const m of [wall, velvet]) { m.userData.noOutline = true; m.castShadow = false; backdropGroup.add(m); }
  scene.add(backdropGroup);

  // shadow map (key light)
  const SM = 2048;
  const shadowRT = new THREE.WebGLRenderTarget(SM, SM, {
    depthBuffer: true,
    depthTexture: new THREE.DepthTexture(SM, SM),
    minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter,
  });
  shadowRT.texture.minFilter = THREE.NearestFilter; shadowRT.texture.magFilter = THREE.NearestFilter;
  shadowRT.depthTexture.minFilter = THREE.NearestFilter; shadowRT.depthTexture.magFilter = THREE.NearestFilter;
  U.uShadowMap.value = shadowRT.depthTexture;
  U.uShadowTexel.value = 1 / SM;
  const lightCam = new THREE.OrthographicCamera(-1.6, 1.6, 1.8, -1.3, 0.5, 14);
  const depthMat = new THREE.MeshBasicMaterial({ colorWrite: false, side: THREE.DoubleSide });
  const biasM = new THREE.Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);

  // main MRT target (colour + normal/depth), MSAA
  const mainRT = new THREE.WebGLRenderTarget(1156, 1264, {
    count: 2, samples: 4, type: THREE.HalfFloatType, depthBuffer: true,
    minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter,
  });
  mainRT.textures[0].name = 'color'; mainRT.textures[1].name = 'norm';

  const postMat = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3, depthTest: false, depthWrite: false,
    uniforms: { tColor: { value: mainRT.textures[0] }, tNorm: { value: mainRT.textures[1] }, uRes: U.uRes, uScale: U.uScale },
    vertexShader: POST_VERT, fragmentShader: POST_FRAG,
  });
  const postScene = new THREE.Scene();
  const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMat);
  quad.frustumCulled = false;
  postScene.add(quad);

  const tmp = new THREE.Vector3();
  const hiddenTmp = [];
  function updateSize() {
    renderer.getDrawingBufferSize(tmp);
    const w = Math.max(2, Math.floor(tmp.x || 1156)), h = Math.max(2, Math.floor(tmp.y || 1264));
    if (mainRT.width !== w || mainRT.height !== h) mainRT.setSize(w, h);
    U.uRes.value.set(w, h);
    U.uScale.value = h / 1264;
  }

  function render() {
    updateSize();
    camera.updateMatrixWorld(); camera.updateProjectionMatrix();
    scene.updateMatrixWorld(true);
    // light directions into view space
    U.uLV.value.copy(LIGHT_W).transformDirection(camera.matrixWorldInverse).normalize();
    U.uRV.value.copy(RIM_W).transformDirection(camera.matrixWorldInverse).normalize();

    // 1. shadow pass
    lightCam.position.copy(target).addScaledVector(LIGHT_W, 7);
    lightCam.lookAt(target);
    lightCam.updateMatrixWorld(); lightCam.updateProjectionMatrix();
    U.uShadowMatrix.value.copy(biasM).multiply(lightCam.projectionMatrix).multiply(lightCam.matrixWorldInverse);
    hiddenTmp.length = 0;
    for (const o of outlineMeshes) { if (o.visible) { o.visible = false; hiddenTmp.push(o); } }
    const bgVis = backdropGroup.visible; backdropGroup.visible = false;
    scene.overrideMaterial = depthMat;
    renderer.setRenderTarget(shadowRT);
    renderer.clear();
    renderer.render(scene, lightCam);
    scene.overrideMaterial = null;
    backdropGroup.visible = bgVis;
    for (const o of hiddenTmp) o.visible = true;

    // 2. main pass
    renderer.setRenderTarget(mainRT);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    renderer.render(scene, camera);

    // 3. post pass to the canvas
    renderer.setRenderTarget(null);
    renderer.clear();
    renderer.render(postScene, postCam);
  }

  function resize(w, h) {
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    updateSize();
  }

  return { camera, target, render, resize };
}
