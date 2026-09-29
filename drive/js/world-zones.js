// world-zones.js - zone pads, beams, rising particles, floating signs, materials shared by landmarks.
import * as THREE from 'three';
import { ZONE_DEFS, PAD_R, zoneLayout } from './world-layout.js';
import { GeoBuilder, xf, clamp, smoothstep } from './world-util.js';
import { makeSignTexture, whenFontsReady } from './world-textures.js';
import { buildLandmarks } from './world-landmarks.js';

const TONE = `
#include <tonemapping_fragment>
#include <colorspace_fragment>`;

export function createZones(ctx) {
  const { quality, uniforms, heightAt } = ctx;
  const group = new THREE.Group(); group.name = 'zones';
  const low = quality === 'low';
  ctx.flagList = []; ctx.palmList = []; ctx.poolList = []; ctx.updaters = [];

  // ---------- shared materials
  const Std = low ? THREE.MeshLambertMaterial : THREE.MeshStandardMaterial;
  const stdOpts = low ? { vertexColors: true } : { vertexColors: true, roughness: 0.9, metalness: 0.0 };
  const mats = {
    std: new Std(stdOpts),
    cloth: new Std({ ...stdOpts, side: THREE.DoubleSide }),
    glow: new THREE.MeshBasicMaterial({ vertexColors: true }),
  };
  ctx.mats = mats;
  ctx.glowMats.push(mats.glow);
  const signMats = [];
  ctx.signMats = signMats;

  // ---------- zone data
  const zones = ZONE_DEFS.map((d) => {
    const l = zoneLayout(d);
    return { id: d.id, x: d.x, z: d.z, r: PAD_R, color: d.color, colorHex: new THREE.Color(d.color).getHex(), title: d.title,
      y: d.platY, layout: l, active: false, glow: 0, inside: false };
  });

  // ---------- pads (one draw call)
  const padCol = zones.map((z) => new THREE.Color(z.color));
  const padU = {
    uActive: { value: zones.map(() => 0) }, uColor: { value: padCol }, uTime: uniforms.uTime, uNight: uniforms.uNight,
  };
  {
    const pos = [], loc = [], zi = [], idx = [];
    zones.forEach((z, i) => {
      const seg = 64, R = 1.3; const base = pos.length / 3;
      const cy = z.y + 0.06;
      for (let s = 0; s <= seg; s++) {
        const a = (s / seg) * Math.PI * 2;
        for (const rr of [0, 0.5, 1]) {
          const lx = Math.cos(a) * R * rr, lz = Math.sin(a) * R * rr;
          pos.push(z.x + lx * PAD_R, cy, z.z + lz * PAD_R); loc.push(lx, lz); zi.push(i);
        }
      }
      for (let s = 0; s < seg; s++) for (let r = 0; r < 2; r++) {
        const a = base + s * 3 + r, b = base + (s + 1) * 3 + r;
        idx.push(a, b, b + 1, a, b + 1, a + 1);
      }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aL', new THREE.Float32BufferAttribute(loc, 2));
    g.setAttribute('aZ', new THREE.Float32BufferAttribute(zi, 1));
    g.setIndex(idx);
    // fix winding to face up: compute and flip if needed
    const pm = new THREE.ShaderMaterial({
      uniforms: padU, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false,
      polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
      vertexShader: `attribute vec2 aL; attribute float aZ; varying vec2 vL; varying float vZ; void main(){ vL = aL; vZ = aZ; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
      fragmentShader: `varying vec2 vL; varying float vZ; uniform float uActive[5]; uniform vec3 uColor[5]; uniform float uTime, uNight;
        void main(){
          int zi = int(vZ+0.5); float act = uActive[zi]; vec3 col = uColor[zi];
          float d = length(vL); float ang = atan(vL.y, vL.x);
          float pulse = 0.5+0.5*sin(uTime*2.2 + vZ*1.7);
          float boost = 0.8 + 0.4*pulse + act*1.2 + uNight*0.7;
          float fill = smoothstep(1.02, 0.0, d);
          float a = fill*(0.20 + 0.16*act + 0.06*pulse);
          float ring1 = smoothstep(0.05,0.0,abs(d-0.97));
          float ring2 = smoothstep(0.03,0.0,abs(d-0.72))*0.7;
          float dash = smoothstep(0.035,0.0,abs(d-0.85)) * step(0.0, sin(ang*26.0 - uTime*(0.8+act*2.5)))*0.85;
          float w = fract(uTime*0.33 + vZ*0.21); float wave = smoothstep(0.07,0.0,abs(d-w*0.95))*(1.0-w)*0.9;
          float sdist = abs(d - 0.40*(0.72+0.28*cos(8.0*ang + uTime*0.5))); float star = smoothstep(0.035,0.0,sdist)*0.9;
          float core = smoothstep(0.17,0.0,d)*0.55;
          float halo = smoothstep(1.3,0.95,d)*0.22*(1.0-step(0.97,d)*0.0);
          float m = a + (ring1+ring2+dash+wave+star+core)*boost*0.75 + halo*(0.6+act);
          m *= smoothstep(1.3, 1.05, d);
          vec3 c = col*(1.05 + act*0.7 + uNight*0.9) + vec3(0.25)*act*(ring1+star);
          gl_FragColor = vec4(c, clamp(m,0.0,0.95));${TONE}
        }`,
    });
    const mesh = new THREE.Mesh(g, pm); mesh.frustumCulled = false; mesh.renderOrder = 2; mesh.name = 'pads';
    group.add(mesh);
  }

  // ---------- beams (one draw call)
  const beamU = { uActive: padU.uActive, uColor: padU.uColor, uTime: uniforms.uTime, uNight: uniforms.uNight };
  {
    const parts = [];
    zones.forEach((z, i) => {
      const H = 48;
      const g = new THREE.CylinderGeometry(0.9, 2.0, H, 20, 6, true);
      g.translate(z.x, z.y + H / 2, z.z);
      const n = g.attributes.position.count;
      g.setAttribute('aZ', new THREE.Float32BufferAttribute(new Array(n).fill(i), 1));
      parts.push(g);
    });
    const merged = mergeGeos(parts);
    const bm = new THREE.ShaderMaterial({
      uniforms: beamU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
      vertexShader: `attribute float aZ; varying float vZ; varying float vH; varying vec3 vN; varying vec3 vV; uniform float uTime;
        void main(){ vZ = aZ; vec4 w = modelMatrix*vec4(position,1.); vH = position.y; vN = normalize(mat3(modelMatrix)*normal); vV = normalize(cameraPosition - w.xyz);
        gl_Position = projectionMatrix*viewMatrix*w; }`,
      fragmentShader: `varying float vZ; varying float vH; varying vec3 vN; varying vec3 vV; uniform float uActive[5]; uniform vec3 uColor[5]; uniform float uTime,uNight;
        void main(){ int zi = int(vZ+0.5); float act = uActive[zi];
          float y01 = clamp(vH/48.0, 0.0, 1.0);
          float e = pow(abs(dot(normalize(vN), normalize(vV))), 1.6);
          float shimmer = 0.75 + 0.25*sin(vH*0.5 - uTime*2.0 + vZ*2.0);
          float a = e*(1.0-y01)*(1.0-y01)*shimmer*(0.07 + act*0.22 + uNight*0.13) * smoothstep(0.0, 0.03, y01+0.02);
          gl_FragColor = vec4(uColor[zi]*(1.0+act), a);${TONE} }`,
    });
    const mesh = new THREE.Mesh(merged, bm); mesh.frustumCulled = false; mesh.renderOrder = 3; mesh.name = 'beams';
    group.add(mesh);
  }

  // ---------- rising light particles (one draw call)
  const nPer = { low: 22, med: 42, high: 64 }[quality] || 40;
  const partU = { uActive: padU.uActive, uColor: padU.uColor, uTime: uniforms.uTime, uNight: uniforms.uNight, uPx: uniforms.uPx };
  {
    const N = nPer * zones.length;
    const pos = new Float32Array(N * 3), seed = new Float32Array(N * 3), zi = new Float32Array(N);
    let k = 0;
    zones.forEach((z, i) => { for (let s = 0; s < nPer; s++, k++) { pos.set([z.x, z.y, z.z], k * 3); seed.set([ctx.rng(), ctx.rng(), ctx.rng()], k * 3); zi[k] = i; } });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aS', new THREE.BufferAttribute(seed, 3));
    g.setAttribute('aZ', new THREE.BufferAttribute(zi, 1));
    const pm = new THREE.ShaderMaterial({
      uniforms: { ...partU, uR: { value: PAD_R } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
      vertexShader: `attribute vec3 aS; attribute float aZ; uniform float uTime,uPx,uR; uniform float uActive[5]; varying float vA; varying float vZ;
        void main(){ vZ = aZ; float act = uActive[int(aZ+0.5)];
          float sp = 0.25 + aS.x*0.35 + act*0.35; float t = fract(uTime*sp + aS.y*7.0);
          float a = aS.z*6.2831 + uTime*(0.3+aS.x*0.4) + t*2.0; float rr = uR*(0.15+0.85*sqrt(fract(aS.x*13.7)))*0.95;
          vec3 p = position + vec3(cos(a)*rr, 0.15 + t*(5.0+aS.y*5.0), sin(a)*rr);
          vec4 mv = viewMatrix*vec4(p,1.); gl_Position = projectionMatrix*mv;
          vA = sin(t*3.14159)*(0.55+act*0.7);
          gl_PointSize = (0.10+aS.y*0.14)*(1.0-t*0.5)*520.0*uPx/max(1.0,-mv.z); }`,
      fragmentShader: `varying float vA; varying float vZ; uniform vec3 uColor[5]; uniform float uNight;
        void main(){ vec2 c = gl_PointCoord-0.5; float a = smoothstep(0.5,0.0,length(c)); a *= a;
          vec3 col = uColor[int(vZ+0.5)]*(1.2+uNight); gl_FragColor = vec4(col*a*vA, a*vA);${TONE} }`,
    });
    const pts = new THREE.Points(g, pm); pts.frustumCulled = false; pts.renderOrder = 4; pts.name = 'padParticles';
    group.add(pts);
  }

  // ---------- floating signs (built by landmarks via ctx.addSign)
  const signs = [];
  ctx.addSign = function addSign({ text, color, w, h, x, y, z, parent, yaw = 0, double = true, sub }) {
    const { texture, draw } = makeSignTexture(text, color, { w: 1024, h: Math.round(1024 * h / w), sub });
    const b = new GeoBuilder({ jitter: 0, ao: 0 });
    b.add(new THREE.PlaneGeometry(w, h), xf(0, 0, 0.03), 0xffffff);
    if (double) b.add(new THREE.PlaneGeometry(w, h), xf(0, 0, -0.03, 0, Math.PI), 0xffffff);
    const mat = new THREE.MeshBasicMaterial({ map: texture, alphaTest: 0.4 });
    signMats.push(mat);
    const mesh = new THREE.Mesh(b.build(), mat);
    mesh.position.set(x, y, z); mesh.rotation.y = yaw;
    mesh.name = 'sign:' + text;
    (parent || group).add(mesh);
    signs.push({ mesh, y0: y, ph: signs.length * 1.3, draw });
    return mesh;
  };
  ctx.texRedraws.push(...[]);
  whenFontsReady(() => { for (const s of signs) s.draw(); for (const f of ctx.texRedraws) f(); });

  // ---------- landmarks
  const lm = buildLandmarks(ctx, { group, zones, mats });

  function update(dt, time, p) {
    for (let i = 0; i < zones.length; i++) {
      const z = zones[i];
      const d = Math.hypot(p.x - z.x, p.z - z.z);
      z.inside = d <= z.r;
      const target = z.inside ? 1 : d < z.r * 2 ? 0.28 * (1 - (d - z.r) / z.r) : 0;
      z.glow += (target - z.glow) * Math.min(1, dt * 5);
      z.active = z.inside;
      padU.uActive.value[i] = z.glow;
    }
    for (const s of signs) s.mesh.position.y = s.y0 + Math.sin(time * 0.9 + s.ph) * 0.12;
    for (const u of ctx.updaters) u(dt, time, p);
  }
  function setNight(n, tod) {
    ctx.glowMats.forEach((m) => m.color.setScalar(0.6 + 1.0 * n));
    for (const m of signMats) m.color.setScalar(0.85 + 0.45 * n);
    if (lm.setNight) lm.setNight(n, tod);
  }
  return {
    group, zones: zones.map((z) => z), update, setNight,
    refreshSigns() { for (const s of signs) s.draw(); for (const f of ctx.texRedraws) f(); },
    dispose() {},
  };
}

/** merge simple non-indexed/indexed geometries that share attribute names */
export function mergeGeos(list) {
  let vc = 0, ic = 0;
  const names = Object.keys(list[0].attributes);
  for (const g of list) { vc += g.attributes.position.count; ic += g.index ? g.index.count : g.attributes.position.count; }
  const out = new THREE.BufferGeometry();
  for (const n of names) {
    const it = list[0].attributes[n].itemSize;
    const arr = new Float32Array(vc * it); let o = 0;
    for (const g of list) { arr.set(g.attributes[n].array, o); o += g.attributes[n].array.length; }
    out.setAttribute(n, new THREE.BufferAttribute(arr, it));
  }
  const idx = new Uint32Array(ic); let io = 0, vo = 0;
  for (const g of list) {
    const c = g.attributes.position.count;
    if (g.index) for (let i = 0; i < g.index.count; i++) idx[io++] = g.index.array[i] + vo; else for (let i = 0; i < c; i++) idx[io++] = i + vo;
    vo += c;
  }
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  return out;
}
