// Terrain meshes: the island top (one procedural ground shader for grass, herringbone
// roads, castle flagstones and dirt holes), cliff faces with a grass lip, the castle
// terraces, the river and moats, waterfalls, the northern highlands and the sky.
import * as THREE from 'three';
import { MAP, landSDF, islandSDF, waterSDF, roadSDF, castleFloorSDF, dirtSDF, terraceSDF, CASTLES, riverSDF, highlandSDF, riverXAt } from './world.js';
import { proceduralToon, C, GLSL_LIB } from './shaders.js';
import { clamp, noise2 } from './util.js';

// ------------------------------------------------------------------ marching squares
export function contours(f, x0, z0, x1, z1, step) {
  const nx = Math.ceil((x1 - x0) / step) + 1, nz = Math.ceil((z1 - z0) / step) + 1;
  const v = new Float32Array(nx * nz);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) v[j * nx + i] = f(x0 + i * step, z0 + j * step);
  const segs = new Map();
  const ep = (key, ia, ib, xa, za, xb, zb) => {
    const a = v[ia], b = v[ib];
    const t = a / (a - b);
    return { key, x: xa + (xb - xa) * t, z: za + (zb - za) * t };
  };
  for (let j = 0; j < nz - 1; j++)
    for (let i = 0; i < nx - 1; i++) {
      const ia = j * nx + i, ib = ia + 1, ic = ia + nx + 1, id = ia + nx;
      const A = v[ia] < 0, B = v[ib] < 0, Cc = v[ic] < 0, D = v[id] < 0;
      const code = (A ? 1 : 0) | (B ? 2 : 0) | (Cc ? 4 : 0) | (D ? 8 : 0);
      if (code === 0 || code === 15) continue;
      const xa = x0 + i * step, za = z0 + j * step, xb = xa + step, zb = za + step;
      const E = [
        () => ep('h' + ia, ia, ib, xa, za, xb, za),
        () => ep('v' + ib, ib, ic, xb, za, xb, zb),
        () => ep('h' + id, id, ic, xa, zb, xb, zb),
        () => ep('v' + ia, ia, id, xa, za, xa, zb),
      ];
      const center = (v[ia] + v[ib] + v[ic] + v[id]) / 4 < 0;
      let pairs;
      switch (code) {
        case 1: pairs = [[3, 0]]; break;
        case 2: pairs = [[0, 1]]; break;
        case 3: pairs = [[3, 1]]; break;
        case 4: pairs = [[1, 2]]; break;
        case 5: pairs = center ? [[0, 1], [2, 3]] : [[3, 0], [1, 2]]; break;
        case 6: pairs = [[0, 2]]; break;
        case 7: pairs = [[3, 2]]; break;
        case 8: pairs = [[2, 3]]; break;
        case 9: pairs = [[0, 2]]; break;
        case 10: pairs = center ? [[3, 0], [1, 2]] : [[0, 1], [2, 3]]; break;
        case 11: pairs = [[1, 2]]; break;
        case 12: pairs = [[1, 3]]; break;
        case 13: pairs = [[0, 1]]; break;
        case 14: pairs = [[0, 3]]; break;
      }
      for (const [ea, eb] of pairs) {
        let p = E[ea](), q = E[eb]();
        // orient so the inside (f < 0) lies on the left of p->q, judged from the corner the segment cuts
        const k = ea < eb ? ea * 4 + eb : eb * 4 + ea;
        const corner = k === 3 ? [xa, za, A] : k === 1 ? [xb, za, B] : k === 6 ? [xb, zb, Cc] : k === 11 ? [xa, zb, D] : [xa, za, A];
        const cross = (q.x - p.x) * (corner[1] - p.z) - (q.z - p.z) * (corner[0] - p.x);
        if ((cross > 0) !== corner[2]) [p, q] = [q, p];
        segs.set(p.key, { p, q });
      }
    }
  const loops = [];
  const used = new Set();
  for (const [k, s] of segs) {
    if (used.has(k)) continue;
    const loop = [];
    let cur = s, guard = 0;
    while (cur && !used.has(cur.p.key) && guard++ < 200000) {
      used.add(cur.p.key);
      loop.push([cur.p.x, cur.p.z]);
      cur = segs.get(cur.q.key);
    }
    if (loop.length > 3) loops.push(loop);
  }
  return loops;
}

export const loopArea = (l) => {
  let a = 0;
  for (let i = 0; i < l.length; i++) {
    const [x0, z0] = l[i], [x1, z1] = l[(i + 1) % l.length];
    a += x0 * z1 - x1 * z0;
  }
  return a / 2;
};
function pointInLoop(x, z, l) {
  let c = false;
  for (let i = 0, j = l.length - 1; i < l.length; j = i++) {
    const [xi, zi] = l[i], [xj, zj] = l[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
  }
  return c;
}
function chaikin(l, passes = 1) {
  for (let p = 0; p < passes; p++) {
    const out = [];
    for (let i = 0; i < l.length; i++) {
      const a = l[i], b = l[(i + 1) % l.length];
      out.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    l = out;
  }
  return l;
}
function decimate(l, minLen) {
  const out = [l[0]];
  for (let i = 1; i < l.length; i++) {
    const p = out[out.length - 1];
    if (Math.hypot(l[i][0] - p[0], l[i][1] - p[1]) >= minLen) out.push(l[i]);
  }
  return out;
}

// Flat cap at height y for all loops (outer loops with holes).
export function capGeometry(loops, y) {
  const outers = [], holes = [];
  for (const l of loops) (loopArea(l) > 0 ? outers : holes).push(l);
  const pos = [], idxs = [];
  for (const o of outers) {
    const myHoles = holes.filter((h) => pointInLoop(h[0][0], h[0][1], o));
    const contour = o.map(([x, z]) => new THREE.Vector2(x, z));
    const hs = myHoles.map((h) => h.map(([x, z]) => new THREE.Vector2(x, z)));
    const tris = THREE.ShapeUtils.triangulateShape(contour, hs);
    const base = pos.length / 3;
    const all = [...contour, ...hs.flat()];
    for (const p of all) pos.push(p.x, y, p.y);
    for (const t of tris) idxs.push(base + t[0], base + t[2], base + t[1]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idxs);
  g.computeVertexNormals();
  // make sure the cap faces up
  const n = g.attributes.normal;
  if (n.count && n.getY(0) < 0) {
    const ix = g.index.array;
    for (let i = 0; i < ix.length; i += 3) [ix[i + 1], ix[i + 2]] = [ix[i + 2], ix[i + 1]];
    g.computeVertexNormals();
  }
  return g;
}

// Vertical skirt along loops. rows: array of [yOffsetFn | y, outwardPush]
export function wallGeometry(loops, topY, bottomFn, opts = {}) {
  const pos = [], nor = [], us = [], idx = [];
  const rows = opts.rows || [0, 0.35, 1, 0.55, 2, 0.75, 1];
  for (let l of loops) {
    if (opts.flip) l = l.slice().reverse();
    const n = l.length;
    let u = 0;
    const base = pos.length / 3;
    const R = rows.length;
    for (let i = 0; i <= n; i++) {
      const p = l[i % n], prev = l[(i - 1 + n) % n], next = l[(i + 1) % n];
      if (i > 0) u += Math.hypot(p[0] - prev[0], p[1] - prev[1]);
      // outward normal (inside is on the left, so outward is the right side)
      let dx = next[0] - prev[0], dz = next[1] - prev[1];
      const dl = Math.hypot(dx, dz) || 1;
      dx /= dl;
      dz /= dl;
      const ox = dz, oz = -dx;
      const bottom = bottomFn(p[0], p[1]);
      for (let r = 0; r < R; r++) {
        const t = r / (R - 1);
        const y = topY + (bottom - topY) * rows[r];
        const bulge = opts.rough ? (noise2(u * 0.35, y * 0.25) - 0.45) * opts.rough * Math.min(1, (topY - y) / 2) : 0;
        pos.push(p[0] + ox * bulge, y, p[1] + oz * bulge);
        nor.push(ox, 0, oz);
        us.push(u);
        void t;
      }
      if (i < n) {
        for (let r = 0; r < R - 1; r++) {
          const a = base + i * R + r, b = base + (i + 1) * R + r;
          idx.push(a, b, a + 1, b, b + 1, a + 1);
        }
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('aU', new THREE.Float32BufferAttribute(us, 1));
  g.setIndex(idx);
  return g;
}

// ------------------------------------------------------------------ splat map
// RGBA = encoded signed distance (0.5 at the edge, 4 units each way) to road,
// castle floor, dirt holes and land.
export const SPLAT = { ppu: 4, tex: null, data: null, w: 0, h: 0 };
const enc = (d) => clamp(Math.round((0.5 - d * 0.125) * 255), 0, 255);
function buildSplat() {
  const ppu = SPLAT.ppu;
  const w = Math.round((MAP.maxX - MAP.minX) * ppu), h = Math.round((MAP.maxZ - MAP.minZ) * ppu);
  const data = new Uint8Array(w * h * 4);
  for (let j = 0; j < h; j++) {
    const z = MAP.minZ + (j + 0.5) / ppu;
    for (let i = 0; i < w; i++) {
      const x = MAP.minX + (i + 0.5) / ppu;
      const o = (j * w + i) * 4;
      const ax = Math.abs(x);
      data[o] = enc(ax < 46 && ax > 3 ? roadSDF(x, z) : ax <= 3 && Math.abs(z) < 3 ? roadSDF(x, z) : 8);
      data[o + 1] = enc(ax > 40 ? castleFloorSDF(x, z) : 8);
      data[o + 2] = enc(ax < 42 && ax > 5 ? dirtSDF(x, z) : 8);
      data[o + 3] = enc(landSDF(x, z));
    }
  }
  const tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  Object.assign(SPLAT, { tex, data, w, h });
}

// ------------------------------------------------------------------ materials
const mapRect = () => ({ value: new THREE.Vector4(MAP.minX, MAP.minZ, MAP.maxX - MAP.minX, MAP.maxZ - MAP.minZ) });

export function groundMaterial() {
  return proceduralToon({
    steps: [0.7, 0.88, 1.0],
    uniforms: {
      uSplat: { value: SPLAT.tex },
      uRect: mapRect(),
      cG1: C('#6cc653'), cG2: C('#7fd862'), cG3: C('#93e676'), cGLine: C('#4fa83e'), cGDark: C('#58b445'),
      cB1: C('#e2b273'), cB2: C('#cf9b5d'), cB3: C('#efc58a'), cMortar: C('#9a6438'),
      cT1: C('#f1d697'), cT2: C('#e3c07a'), cT3: C('#d2a965'), cGrout: C('#a77d4b'),
      cD1: C('#7a5532'), cD2: C('#946a40'), cInk: C('#2c1a0c'),
    },
    lib: /* glsl */ `
      vec4 splat(vec2 p){ return texture2D(uSplat, (p - uRect.xy) / uRect.zw); }
      vec3 grass(vec2 p){
        // topographic bands of lighter and darker green with a pale rim line
        float lv = fbm2(p * 0.05) * 5.0 + fbm2(p * 0.13 + 7.3) * 0.9;
        float band = floor(lv), fr = fract(lv);
        float tone = h21(vec2(band, 3.0));
        vec3 col = mix(cG1, cG2, step(0.5, mod(band, 2.0)) * 0.8 + tone * 0.2);
        float rim = 1.0 - smoothstep(0.0, 0.06, fr);
        col = mix(col, cG3, rim * 0.55);
        // irregular flagstone cells
        vec4 v = voro(p * 0.62 + vec2(band * 0.37));
        col *= 0.95 + 0.1 * v.y;
        float e = 1.0 - smoothstep(0.015, 0.05, v.x);
        col = mix(col, cGLine, e * 0.32);
        // tiny highlight on the top-left of each cell
        col = mix(col, cG3, smoothstep(0.05, 0.25, v.x) * clamp(-v.w * 0.6 - v.z * 0.3, 0.0, 1.0) * 0.18);
        return col;
      }
      vec3 road(vec2 p, out float mortar){
        vec2 q = mat2(0.7071, -0.7071, 0.7071, 0.7071) * p * 2.35;
        vec4 b = herring(q);
        vec3 col = mix(cB1, cB2, b.y);
        col = mix(col, cB3, smoothstep(0.75, 1.0, b.y) * 0.6);
        // bevel: light on one side of each brick
        col = mix(col, cB3, (1.0 - smoothstep(0.05, 0.16, b.x)) * 0.35 * step(0.5, b.z));
        mortar = 1.0 - smoothstep(0.035, 0.075, b.x);
        return mix(col, cMortar, mortar * 0.85);
      }
      vec3 tiles(vec2 p, vec2 cell, out float grout){
        vec2 q = p / cell; vec2 id = floor(q); vec2 f = fract(q);
        float hsh = h21(id);
        vec3 col = mix(cT1, cT2, hsh);
        col = mix(col, cT3, step(0.86, hsh) * 0.7);
        vec2 e2 = min(f, 1.0 - f) * cell;
        float e = min(e2.x, e2.y);
        grout = 1.0 - smoothstep(0.03, 0.07, e);
        col = mix(col, cT1 * 1.04, (1.0 - smoothstep(0.06, 0.18, f.y * cell.y)) * 0.5);
        return mix(col, cGrout, grout);
      }
      vec3 castleFloor(vec2 p){
        float g;
        // radial rosettes around the castle squares
        vec2 cs[4]; cs[0] = vec2(-50.5, 0.0); cs[1] = vec2(50.5, 0.0); cs[2] = vec2(-63.5, 0.0); cs[3] = vec2(63.5, 0.0);
        for (int i = 0; i < 4; i++){
          vec2 d = p - cs[i]; float r = length(d);
          float R = i < 2 ? 4.2 : 6.5;
          if (r < R){
            float ring = floor(r / 0.9); float a = atan(d.y, d.x);
            float n = max(4.0, floor(6.2831 * (ring + 0.5) * 0.9 / 0.95));
            vec2 q = vec2(a / 6.2831 * n, r / 0.9);
            vec2 id = floor(q); vec2 f = fract(q);
            float e = min(min(f.x, 1.0 - f.x) * 6.2831 * r / n, min(f.y, 1.0 - f.y) * 0.9);
            if (ring < 0.5) e = (0.9 - r);
            vec3 col = mix(cT1, cT2, h21(id + float(i)));
            if (mod(ring, 2.0) > 0.5) col = mix(col, cT3, 0.45);
            float gr = 1.0 - smoothstep(0.03, 0.07, e);
            col = mix(col, cGrout, gr);
            float edgeR = 1.0 - smoothstep(0.0, 0.08, abs(r - R));
            return mix(col, cGrout * 0.8, edgeR);
          }
        }
        vec3 col = tiles(p + vec2(0.0, 0.33), vec2(1.45, 1.15), g);
        // diamond inlay bands
        vec2 dq = abs(fract(p * 0.125) - 0.5);
        float dm = abs(dq.x + dq.y - 0.36);
        col = mix(col, cT3 * 0.92, (1.0 - smoothstep(0.012, 0.03, dm)) * 0.8);
        return col;
      }
    `,
    colorCode: /* glsl */ `
      vec2 p = wp.xz;
      vec4 s = splat(p);
      vec3 base = grass(p);
      // dirt holes: sunken earth with a dark lip
      float dD = (0.5 - s.b) * 8.0;
      if (dD < 0.25){
        float jag = (vnoise(p * 5.0) - 0.5) * 0.28;
        float d = dD + jag;
        vec3 dirt = mix(cD1, cD2, smoothstep(-1.6, -0.2, d) * 0.7 + vnoise(p * 3.0) * 0.3);
        dirt *= 0.8 + 0.2 * smoothstep(-0.2, -1.2, d);
        float ink = 1.0 - smoothstep(0.0, 0.08, abs(d));
        base = mix(base, dirt, step(d, 0.0));
        base = mix(base, cInk, ink * 0.9);
      }
      // herringbone road with a jagged grass overhang
      float dR = (0.5 - s.r) * 8.0;
      if (dR < 0.4){
        float m;
        vec3 r = road(p, m);
        float jag = (abs(fract(p.x * 2.1 + p.y * 1.3) - 0.5) + abs(fract(p.y * 2.7 - p.x * 0.9) - 0.5)) * 0.32 + vnoise(p * 4.0) * 0.18;
        float d = dR + jag - 0.2;
        r *= 0.9 + 0.1 * smoothstep(0.0, -0.8, d);
        base = mix(base, r, step(d, 0.0));
        base = mix(base, cGDark, (1.0 - smoothstep(0.0, 0.07, abs(d))) * 0.85);
      }
      // castle flagstones
      float dC = (0.5 - s.g) * 8.0;
      if (dC < 0.2){
        vec3 cf = castleFloor(p);
        base = mix(base, cf, step(dC, 0.0));
        base = mix(base, cInk, (1.0 - smoothstep(0.0, 0.08, abs(dC))) * 0.7);
      }
      // ink where land meets the cliff lip
      float dL = (0.5 - s.a) * 8.0;
      base = mix(base, cGDark, smoothstep(-0.9, -0.05, dL) * 0.35 * (1.0 - step(dC, 0.0)));
      col = base;
    `,
  });
}

export function cliffMaterial(opts = {}) {
  return proceduralToon({
    steps: [0.62, 0.82, 1.0],
    attrU: true,
    uniforms: {
      cR1: C(opts.r1 || '#8f9b85'), cR2: C(opts.r2 || '#a8b29b'), cR3: C(opts.r3 || '#75836f'), cMoss: C('#6aa04e'),
      cLip: C('#6cc653'), cLip2: C('#58b445'), cInk: C('#2a2014'), uLip: { value: opts.lip ?? 1 }, uTop: { value: opts.top ?? 0 },
    },
    colorCode: /* glsl */ `
      vec2 q = vec2(vU * 0.42, wp.y * 0.5);
      vec4 v = voro(q);
      vec3 rock = mix(cR1, cR2, v.y);
      rock = mix(rock, cR3, step(0.78, v.y));
      // fake bevel: brighter upper part of every block, darker lower part
      rock *= 0.82 + 0.3 * clamp(0.5 - v.w * 0.9, 0.0, 1.0);
      float e = 1.0 - smoothstep(0.02, 0.07, v.x);
      rock = mix(rock, cInk, e * 0.85);
      // moss streaks near the top
      float moss = smoothstep(0.55, 0.8, vnoise(vec2(vU * 0.6, wp.y * 0.9)) + (wp.y - uTop) * 0.12 + 0.25);
      rock = mix(rock, cMoss, moss * 0.55 * uLip);
      // depth darkening into the haze below
      rock *= mix(1.0, 0.6, smoothstep(-2.0, -24.0, wp.y - uTop));
      // grass lip with a jagged ink edge
      float jag = abs(fract(vU * 1.6) - 0.5) * 0.5 + vnoise(vec2(vU * 2.3, 0.0)) * 0.25;
      float d = (uTop - wp.y) - (0.18 + jag) ;
      vec3 lip = mix(cLip, cLip2, smoothstep(0.0, 0.3, uTop - wp.y));
      col = mix(rock, lip, step(d, 0.0) * uLip);
      col = mix(col, cInk, (1.0 - smoothstep(0.0, 0.07, abs(d))) * uLip);
      col = mix(col, cInk, (1.0 - smoothstep(0.0, 0.06, uTop - wp.y)) * (1.0 - uLip));
    `,
  });
}

export function brickMaterial(opts = {}) {
  return proceduralToon({
    steps: [0.66, 0.86, 1.0],
    attrU: !!opts.attrU,
    uniforms: { cK1: C(opts.c1 || '#e3b877'), cK2: C(opts.c2 || '#cf9f5f'), cK3: C(opts.c3 || '#f0cf94'), cMortar: C(opts.mortar || '#8f6438'), cInk: C('#2a1a0c') },
    colorCode: /* glsl */ `
      vec2 uvw = ${opts.attrU ? 'vec2(vU, wp.y)' : 'vec2(wp.x * abs(vWN.z) + wp.z * abs(vWN.x) + (wp.x + wp.z) * abs(vWN.y), wp.y * (1.0 - abs(vWN.y)) + wp.z * abs(vWN.y))'};
      vec4 b = bricks(uvw, vec2(${opts.bw || '1.25'}, ${opts.bh || '0.55'}));
      vec3 c = mix(cK1, cK2, b.y);
      c = mix(c, cK3, step(0.82, b.y) * 0.7);
      c = mix(c, cK3, (1.0 - smoothstep(0.04, 0.12, b.w * ${opts.bh || '0.55'})) * 0.35);
      float m = 1.0 - smoothstep(0.03, 0.065, b.x);
      col = mix(c, cMortar, m);
    `,
  });
}

export function waterMaterial() {
  const uniforms = {
    uTime: { value: 0 },
    uSplat: { value: SPLAT.tex },
    uRect: mapRect(),
    cDeep: { value: new THREE.Color('#3a8fd2') },
    cShallow: { value: new THREE.Color('#62bde9') },
    cLine: { value: new THREE.Color('#9fdcf6') },
    cFoam: { value: new THREE.Color('#ffffff') },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: /* glsl */ `
      varying vec3 vWP;
      void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vWP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `
      varying vec3 vWP;
      uniform float uTime; uniform sampler2D uSplat; uniform vec4 uRect;
      uniform vec3 cDeep, cShallow, cLine, cFoam;
      ${GLSL_LIB}
      void main(){
        vec2 p = vWP.xz;
        vec4 s = texture2D(uSplat, (p - uRect.xy) / uRect.zw);
        float shore = (0.5 - s.a) * 8.0; // distance from the bank (positive in water)
        vec3 col = mix(cShallow, cDeep, smoothstep(0.2, 3.5, shore));
        // drifting caustic cells
        vec2 flow = vec2(0.0, uTime * 0.35);
        vec4 v = voro(p * 0.32 - flow * 0.4 + vec2(sin(uTime * 0.3 + p.y * 0.2) * 0.3, 0.0));
        float line = 1.0 - smoothstep(0.015, 0.07, v.x);
        col = mix(col, cLine, line * 0.28);
        // soft sky sheen streaks
        float sheen = smoothstep(0.55, 0.85, fbm2(vec2(p.x * 0.15, p.y * 0.05 - uTime * 0.08)));
        col = mix(col, cLine, sheen * 0.35);
        // foam along the banks, wobbling
        float wob = sin(p.x * 1.7 + uTime * 1.6) * 0.08 + sin(p.y * 2.3 - uTime * 1.3) * 0.08;
        float foam = 1.0 - smoothstep(0.18, 0.3, shore + wob);
        float ring = 1.0 - smoothstep(0.04, 0.1, abs(shore - (0.65 + 0.18 * sin(uTime * 1.2 + p.x * 0.3 + p.y * 0.2))));
        col = mix(col, cFoam, max(foam, ring * 0.55));
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  return mat;
}

export function waterfallMaterial(dir = 1) {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    vertexShader: /* glsl */ `varying vec2 vUv; varying vec3 vWP; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position,1.0); vWP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `
      varying vec2 vUv; varying vec3 vWP; uniform float uTime;
      ${GLSL_LIB}
      void main(){
        float x = vUv.x * 9.0;
        float y = vUv.y * 6.0 + uTime * ${dir > 0 ? '2.4' : '-2.4'};
        float n = vnoise(vec2(x * 1.6, y * 0.35));
        float streak = smoothstep(0.55, 0.75, vnoise(vec2(x * 3.0, y * 0.2)));
        vec3 col = mix(vec3(0.33, 0.66, 0.9), vec3(0.62, 0.86, 0.98), n);
        col = mix(col, vec3(1.0), streak * 0.8);
        float edge = smoothstep(0.0, 0.06, vUv.x) * smoothstep(1.0, 0.94, vUv.x);
        float fade = ${dir > 0 ? 'smoothstep(0.0, 0.35, vUv.y)' : '1.0'};
        float top = 1.0 - smoothstep(0.0, 0.05, 1.0 - vUv.y);
        col = mix(col, vec3(1.0), top);
        gl_FragColor = vec4(col, 0.92 * edge * fade);
        #include <colorspace_fragment>
      }`,
  });
}

// ------------------------------------------------------------------ highlands (north backdrop)
const HIGH_Y = MAP.highY;

// ------------------------------------------------------------------ build
export function buildTerrain(scene) {
  buildSplat();
  const group = new THREE.Group();
  group.name = 'terrain';
  scene.add(group);

  // Island top: dry land minus the highland strip.
  const land = (x, z) => Math.max(landSDF(x, z), -highlandSDF(x, z) - 0.6);
  const landLoops = contours(land, MAP.minX, MAP.minZ, MAP.maxX, MAP.maxZ, 0.5)
    .map((l) => decimate(chaikin(l, 1), 0.35))
    .filter((l) => Math.abs(loopArea(l)) > 2);
  const groundMat = groundMaterial();
  const ground = new THREE.Mesh(capGeometry(landLoops, 0), groundMat);
  ground.receiveShadow = true;
  ground.name = 'ground';
  group.add(ground);

  // Cliffs and banks. Walls along the river/moats stop at the bed; the rest drop away.
  const cliffMat = cliffMaterial();
  const bottom = (x, z) => (waterSDF(x, z) < 1.6 && islandSDF(x, z) < -1 ? MAP.bedY : -46);
  const cliffs = new THREE.Mesh(wallGeometry(landLoops.map((l) => l), 0, bottom, { rows: [0, 0.04, 0.12, 0.25, 0.45, 0.7, 1], rough: 0.9 }), cliffMat);
  cliffs.receiveShadow = true;
  group.add(cliffs);

  // Water: river and moats.
  const waterMat = waterMaterial();
  const wg = gridWhere((x, z) => waterSDF(x, z) < 1.3 && islandSDF(x, z) < 1.5 && highlandSDF(x, z) > -1.5, 1, MAP.waterY);
  const water = new THREE.Mesh(wg, waterMat);
  water.name = 'water';
  group.add(water);

  // Riverbed seen through nothing (water is opaque) but fills gaps at the waterfall lip.
  // Waterfalls: one pouring from the highlands into the river, one off the south cliff.
  const wfMats = [];
  const nx = riverXAt(-40), sx = riverXAt(40);
  let nz = -30;
  while (highlandSDF(nx, nz) > 0 && nz > -60) nz -= 0.1;
  let sz = 30;
  while (islandSDF(sx, sz) < 0 && sz < 60) sz += 0.1;
  const north = waterfall(nx, nz + 0.6, 9, HIGH_Y + 0.2, MAP.waterY, 1);
  const south = waterfall(sx, sz - 0.3, 12.5, MAP.waterY, -46, 1, true);
  for (const w of [north, south]) {
    group.add(w);
    wfMats.push(w.material);
  }

  // Highlands: raised rock shelf along the north edge with a grass top.
  const hl = contours((x, z) => Math.max(highlandSDF(x, z), Math.abs(x) - 100, -88 - z), -110, -90, 110, -20, 0.75)
    .map((l) => decimate(chaikin(l, 1), 0.5))
    .filter((l) => Math.abs(loopArea(l)) > 5);
  const hlTopMat = groundMaterial();
  const hlTop = new THREE.Mesh(capGeometry(hl, HIGH_Y), hlTopMat);
  hlTop.receiveShadow = true;
  group.add(hlTop);
  const hlWallMat = cliffMaterial({ top: HIGH_Y });
  const hlWall = new THREE.Mesh(wallGeometry(hl, HIGH_Y, (x, z) => (waterSDF(x, z) < 1 ? MAP.bedY : -1), { rows: [0, 0.05, 0.15, 0.35, 0.6, 0.85, 1], rough: 1.2 }), hlWallMat);
  hlWall.receiveShadow = true;
  group.add(hlWall);

  // Terraces inside each castle.
  const terraceMat = groundMaterial();
  const terraceWallMat = brickMaterial({ attrU: true });
  for (const c of CASTLES) {
    const x0 = c.s < 0 ? -78 : 50, x1 = c.s < 0 ? -50 : 78;
    const loops = contours((x, z) => (Math.sign(x) === c.s ? terraceSDF(x, z) : 5), x0, -14, x1, 14, 0.25).map((l) => decimate(l, 0.2));
    const top = new THREE.Mesh(capGeometry(loops, MAP.terraceY), terraceMat);
    top.receiveShadow = true;
    group.add(top);
    const wall = new THREE.Mesh(wallGeometry(loops, MAP.terraceY, () => -0.05, { rows: [0, 0.08, 1] }), terraceWallMat);
    wall.receiveShadow = true;
    wall.castShadow = true;
    group.add(wall);
    c.terraceLoops = loops;
  }

  // Sky dome and the misty sea far below.
  buildSky(scene);

  return {
    group,
    update(t) {
      waterMat.uniforms.uTime.value = t;
      for (const m of wfMats) m.uniforms.uTime.value = t;
    },
  };
}

function gridWhere(pred, step, y) {
  const pos = [];
  for (let z = MAP.minZ - 8; z < MAP.maxZ + 8; z += step)
    for (let x = MAP.minX; x < MAP.maxX; x += step) {
      const c = pred(x + step / 2, z + step / 2) || pred(x, z) || pred(x + step, z + step) || pred(x + step, z) || pred(x, z + step);
      if (!c) continue;
      pos.push(x, y, z, x, y, z + step, x + step, y, z, x + step, y, z, x, y, z + step, x + step, y, z + step);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

function waterfall(x, z, width, yTop, yBot, dir, outward = false) {
  const h = yTop - yBot;
  const g = new THREE.PlaneGeometry(width, h, 8, 12);
  // slight curve so it reads as a falling sheet
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const yy = p.getY(i), xx = p.getX(i);
    const t = (h / 2 - yy) / h;
    p.setZ(i, (outward ? 1 : -1) * (Math.sin(t * Math.PI * 0.5) * 1.6 - 0.2) + Math.cos((xx / width) * Math.PI) * 0.4);
  }
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, waterfallMaterial(dir));
  m.position.set(x, (yTop + yBot) / 2, z);
  m.renderOrder = 2;
  return m;
}

function buildSky(scene) {
  // vertical gradient sky sphere
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: { top: { value: new THREE.Color('#8fd3ff') }, mid: { value: new THREE.Color('#bfe7ff') }, low: { value: new THREE.Color('#5aa3c9') } },
    vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `varying vec3 vP; uniform vec3 top, mid, low;
      void main(){ float y = vP.y; vec3 c = y > 0.0 ? mix(mid, top, smoothstep(0.0, 0.6, y)) : mix(mid, low, smoothstep(0.0, -0.5, y));
      gl_FragColor = vec4(c, 1.0);
      #include <colorspace_fragment>
      }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 24, 16), skyMat);
  sky.frustumCulled = false;
  scene.add(sky);
  // sea of mist far below the island
  const seaMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `varying vec3 vWP; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vWP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `varying vec3 vWP; uniform float uTime; ${GLSL_LIB}
      void main(){ vec2 p = vWP.xz * 0.02; float n = fbm2(p + vec2(uTime * 0.01, 0.0));
        vec3 c = mix(vec3(0.36, 0.64, 0.82), vec3(0.78, 0.9, 0.97), smoothstep(0.35, 0.75, n));
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600), seaMat);
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = -44;
  scene.add(sea);
}

export { riverSDF };
