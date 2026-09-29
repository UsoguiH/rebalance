// world-sky.js - sky dome, stars, mountains, skyline, clouds, dust motes + time-of-day keyframes.
import * as THREE from 'three';
import { GeoBuilder, mulberry32, makeSimplex, xf, smoothstep, clamp, GLSL_HASH } from './world-util.js';

// t: 0 dawn, .25 noon, .5 dusk, .75 deep night. Colours are sRGB hex.
const KEYS = [
  { t: 0.00, top: '#3b4a7d', mid: '#e59a86', hor: '#ffc08e', sunC: '#ffae7a', sunI: 1.5, moonI: 0.0, hemiS: '#8fb0c8', hemiG: '#c98a6a', hemiI: 0.75, mtn: '#8a5a6a', fog: '#f0b68e' },
  { t: 0.10, top: '#4d80b8', mid: '#a9c6d8', hor: '#fbdcb6', sunC: '#ffdca8', sunI: 2.8, moonI: 0.0, hemiS: '#8fc4d4', hemiG: '#d09a6e', hemiI: 0.95, mtn: '#a4735e', fog: '#f2d2ae' },
  { t: 0.25, top: '#3a84c8', mid: '#86c0e0', hor: '#f6e2c2', sunC: '#fff0d4', sunI: 3.3, moonI: 0.0, hemiS: '#94cad8', hemiG: '#d6a878', hemiI: 1.05, mtn: '#b28a6c', fog: '#efdcb8' },
  { t: 0.40, top: '#4677ad', mid: '#d5b39a', hor: '#ffd39c', sunC: '#ffc384', sunI: 3.0, moonI: 0.0, hemiS: '#88bcc8', hemiG: '#c98c62', hemiI: 0.95, mtn: '#a06a58', fog: '#f4c896' },
  { t: 0.455, top: '#3d5b92', mid: '#ee9c78', hor: '#ffbd80', sunC: '#ff9f55', sunI: 2.7, moonI: 0.0, hemiS: '#78b0bc', hemiG: '#bf7c56', hemiI: 0.9, mtn: '#8d5558', fog: '#f0b07e' },
  { t: 0.50, top: '#2c3a6e', mid: '#d4705f', hor: '#ff9d5e', sunC: '#ff7a3f', sunI: 1.4, moonI: 0.0, hemiS: '#5a7ea6', hemiG: '#a86a58', hemiI: 0.75, mtn: '#6a4460', fog: '#dd8d68' },
  { t: 0.56, top: '#1a2352', mid: '#5f3f7c', hor: '#df6f5e', sunC: '#d0604a', sunI: 0.15, moonI: 0.55, hemiS: '#4a5f96', hemiG: '#6a4a5e', hemiI: 0.6, mtn: '#3a3358', fog: '#8f5a6c' },
  { t: 0.65, top: '#0a1230', mid: '#16244e', hor: '#2c3b6b', sunC: '#101830', sunI: 0.0, moonI: 0.95, hemiS: '#4258a0', hemiG: '#2a3050', hemiI: 0.6, mtn: '#141c3a', fog: '#1e2c54' },
  { t: 0.75, top: '#050a1f', mid: '#0e1a3c', hor: '#1c2c58', sunC: '#101830', sunI: 0.0, moonI: 1.0, hemiS: '#3c50a0', hemiG: '#242c4c', hemiI: 0.6, mtn: '#0f1630', fog: '#172549' },
  { t: 0.90, top: '#111a44', mid: '#2e2f66', hor: '#6a4a72', sunC: '#a45a68', sunI: 0.1, moonI: 0.5, hemiS: '#4a5c98', hemiG: '#54405e', hemiI: 0.6, mtn: '#2c2a50', fog: '#54426a' },
  { t: 1.00, top: '#3b4a7d', mid: '#e59a86', hor: '#ffc08e', sunC: '#ffae7a', sunI: 1.5, moonI: 0.0, hemiS: '#8fb0c8', hemiG: '#c98a6a', hemiI: 0.75, mtn: '#8a5a6a', fog: '#f0b68e' },
];
const COLOR_FIELDS = ['top', 'mid', 'hor', 'sunC', 'hemiS', 'hemiG', 'mtn', 'fog'];
const KEYC = KEYS.map((k) => { const o = { ...k }; for (const f of COLOR_FIELDS) o[f] = new THREE.Color(k[f]); return o; });

export function sampleKeys(t01, out) {
  const t = ((t01 % 1) + 1) % 1;
  let i = 0;
  while (i < KEYC.length - 2 && t >= KEYC[i + 1].t) i++;
  const a = KEYC[i], b = KEYC[i + 1];
  let f = (t - a.t) / (b.t - a.t);
  f = f * f * (3 - 2 * f);
  for (const c of COLOR_FIELDS) out[c].copy(a[c]).lerp(b[c], f);
  for (const s of ['sunI', 'moonI', 'hemiI']) out[s] = a[s] + (b[s] - a[s]) * f;
  return out;
}
export function makeSample() { const o = {}; for (const c of COLOR_FIELDS) o[c] = new THREE.Color(); return o; }

export const SUN_ELEV_MAX = 1.08;
export function sunDirection(t01, out = new THREE.Vector3()) {
  const th = t01 * Math.PI * 2;
  return out.set(Math.cos(th), Math.sin(th) * 1.15, 0.45).normalize();
}

const TONE = `
#include <tonemapping_fragment>
#include <colorspace_fragment>`;

export function createSky({ quality, uniforms, rng }) {
  const group = new THREE.Group(); group.name = 'sky';
  const U = {
    uTop: { value: new THREE.Color() }, uMid: { value: new THREE.Color() }, uHor: { value: new THREE.Color() },
    uSunCol: { value: new THREE.Color() }, uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uMoonDir: { value: new THREE.Vector3(0, -1, 0) },
    uSunAmt: { value: 1 }, uMoonAmt: { value: 0 }, uNight: uniforms.uNight, uTime: uniforms.uTime,
  };
  // ---- dome
  const domeMat = new THREE.ShaderMaterial({
    uniforms: U, side: THREE.BackSide, depthTest: false, depthWrite: false, fog: false,
    vertexShader: `varying vec3 vDir; void main(){ vDir = position; vec4 p = projectionMatrix*modelViewMatrix*vec4(position,1.); gl_Position = p.xyww; }`,
    fragmentShader: `varying vec3 vDir; uniform vec3 uTop,uMid,uHor,uSunCol,uSunDir,uMoonDir; uniform float uSunAmt,uMoonAmt,uNight,uTime;
${GLSL_HASH}
void main(){
  vec3 d = normalize(vDir); float h = d.y;
  vec3 col = mix(uHor, uMid, smoothstep(0.0, 0.30, h));
  col = mix(col, uTop, smoothstep(0.22, 0.95, h));
  col = mix(uHor, col, smoothstep(-0.06, 0.03, h));
  float sd = max(dot(d, uSunDir), 0.0);
  float low = smoothstep(0.55, 0.0, h);
  col += uSunCol * (pow(sd, 5.0)*0.22*low + pow(sd, 28.0)*0.35 + pow(sd, 400.0)*0.9) * uSunAmt;
  col = mix(col, uSunCol, pow(sd, 2.5)*low*0.28*uSunAmt);
  col += uSunCol * smoothstep(0.99935, 0.99975, sd) * 3.0 * uSunAmt;
  float md = dot(d, uMoonDir);
  vec3 moonC = vec3(0.85,0.9,1.0);
  col += moonC * (smoothstep(0.99930, 0.99950, md)*1.6 + pow(max(md,0.), 90.)*0.35 + pow(max(md,0.), 8.)*0.05) * uMoonAmt;
  gl_FragColor = vec4(col, 1.0);${TONE}
}`,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 20), domeMat);
  dome.renderOrder = -100; dome.frustumCulled = false; dome.name = 'skyDome';
  group.add(dome);

  // ---- stars
  const nStars = { low: 500, med: 1100, high: 1800 }[quality] || 1000;
  const sp = new Float32Array(nStars * 3), sz = new Float32Array(nStars), sph = new Float32Array(nStars);
  for (let i = 0; i < nStars; i++) {
    const u = rng(), v = rng();
    const y = 0.04 + 0.96 * u; const a = v * Math.PI * 2; const rr = Math.sqrt(1 - y * y);
    sp.set([Math.cos(a) * rr * 280, y * 280, Math.sin(a) * rr * 280], i * 3);
    sz[i] = 0.6 + Math.pow(rng(), 4) * 2.2; sph[i] = rng() * 6.28;
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  sg.setAttribute('aSize', new THREE.BufferAttribute(sz, 1));
  sg.setAttribute('aPh', new THREE.BufferAttribute(sph, 1));
  const starU = { uOp: { value: 0 }, uTime: uniforms.uTime, uPx: uniforms.uPx };
  const stars = new THREE.Points(sg, new THREE.ShaderMaterial({
    uniforms: starU, transparent: true, depthWrite: false, depthTest: false, fog: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute float aSize; attribute float aPh; uniform float uTime; uniform float uPx; varying float vT;
      void main(){ vT = 0.55 + 0.45*sin(uTime*(1.0+aPh*0.3)+aPh*9.0); vec4 p = projectionMatrix*modelViewMatrix*vec4(position,1.); gl_Position = p.xyww; gl_PointSize = aSize*uPx; }`,
    fragmentShader: `uniform float uOp; varying float vT; void main(){ vec2 c = gl_PointCoord-0.5; float a = smoothstep(0.5,0.0,length(c)); gl_FragColor = vec4(vec3(0.85,0.9,1.0)*a*vT*uOp, a*uOp);${TONE} }`,
  }));
  stars.renderOrder = -99; stars.frustumCulled = false; group.add(stars);

  // ---- mountains (3 layers)
  const noise = makeSimplex(31);
  const mtnLayers = [];
  const mkMountain = (radius, hMin, hMax, fade, seed, order) => {
    const SEG = 320;
    const pos = [], sh = [], idx = [];
    const prof = (a) => {
      const cx = Math.cos(a), cz = Math.sin(a);
      let v = 0.5 + 0.5 * noise(cx * 2.2 + seed, cz * 2.2 + seed) * 1.0;
      v = v * 0.6 + 0.4 * (0.5 + 0.5 * noise(cx * 6 + seed * 2, cz * 6 - seed));
      v += 0.14 * noise(cx * 19 + seed, cz * 19);
      return hMin + (hMax - hMin) * clamp(v, 0, 1);
    };
    for (let i = 0; i <= SEG; i++) {
      const a = (i / SEG) * Math.PI * 2; const h = prof(a); const hn = prof(a + 0.02);
      const x = Math.cos(a) * radius, z = Math.sin(a) * radius;
      pos.push(x, -25, z, x, h, z);
      const s = clamp(0.5 + (h - hn) * 0.09, 0, 1);
      sh.push(s, s);
    }
    for (let i = 0; i < SEG; i++) { const a = i * 2, b = a + 1, c = a + 2, d = a + 3; idx.push(a, c, b, b, c, d); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aShade', new THREE.Float32BufferAttribute(sh, 1));
    g.setIndex(idx);
    const m = new THREE.ShaderMaterial({
      uniforms: { uMtn: { value: new THREE.Color() }, uHor: U.uHor, uFade: { value: fade }, uSunDir: U.uSunDir, uNight: uniforms.uNight },
      side: THREE.DoubleSide, depthTest: false, depthWrite: false, fog: false,
      vertexShader: `attribute float aShade; varying float vSh; varying float vY; void main(){ vSh = aShade; vY = position.y; vec4 p = projectionMatrix*modelViewMatrix*vec4(position,1.); gl_Position = p.xyww; }`,
      fragmentShader: `uniform vec3 uMtn,uHor; uniform float uFade,uNight; varying float vSh; varying float vY;
        void main(){ vec3 c = uMtn*(0.72+0.6*vSh); c = mix(c, uHor, uFade); c = mix(c, uHor, smoothstep(40.0, -10.0, vY)*0.9);
        gl_FragColor = vec4(c,1.0);${TONE} }`,
    });
    const mesh = new THREE.Mesh(g, m); mesh.renderOrder = order; mesh.frustumCulled = false;
    mtnLayers.push(m); group.add(mesh); return mesh;
  };
  const followMeshes = [];
  followMeshes.push(mkMountain(262, 14, 46, 0.30, 3.3, -92));
  followMeshes.push(mkMountain(285, 24, 70, 0.50, 7.1, -93));
  followMeshes.push(mkMountain(310, 40, 100, 0.68, 11.9, -94));
  // order: far first
  followMeshes[2].renderOrder = -95; followMeshes[1].renderOrder = -94; followMeshes[0].renderOrder = -93;

  // ---- skyline of domes & minarets
  {
    const b = new GeoBuilder({ jitter: 0, ao: 0 });
    const rr = mulberry32(99);
    const R = 246;
    const clusters = [0.4, 1.35, 2.3, 3.4, 4.35, 5.4];
    for (const ca of clusters) {
      const n = 7 + (rr() * 5 | 0);
      for (let k = 0; k < n; k++) {
        const a = ca + (k - n / 2) * 0.014 + (rr() - 0.5) * 0.008;
        const x = Math.cos(a) * R, z = Math.sin(a) * R;
        const rot = -a;
        const w = 5 + rr() * 8, h = 8 + rr() * 14, d = 5 + rr() * 7;
        b.add(new THREE.BoxGeometry(w, h + 20, d), xf(x, h / 2 - 10, z, 0, rot), 0xffffff);
        const kind = rr();
        if (kind < 0.35) { // dome
          const r = Math.min(w, d) * 0.42;
          b.add(new THREE.SphereGeometry(r, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), xf(x, h + 10 - 10 + 0, z, 0, 0, 0, 1, 1.05, 1), 0xffffff);
          b.add(new THREE.CylinderGeometry(0.15, 0.15, 3, 4), xf(x, h + r + 1.2, z), 0xffffff);
        } else if (kind < 0.6) { // minaret
          const mh = 14 + rr() * 22;
          b.add(new THREE.CylinderGeometry(0.9, 1.3, mh, 8), xf(x + w * 0.6, h + mh / 2 - 10, z), 0xffffff);
          b.add(new THREE.CylinderGeometry(1.8, 1.8, 0.8, 8), xf(x + w * 0.6, h + mh * 0.75 - 10, z), 0xffffff);
          b.add(new THREE.ConeGeometry(1.1, 4.5, 8), xf(x + w * 0.6, h + mh + 2.2 - 10, z), 0xffffff);
        } else if (kind < 0.75) {
          b.add(new THREE.ConeGeometry(Math.min(w, d) * 0.5, 5, 4), xf(x, h + 2.5, z, 0, Math.PI / 4), 0xffffff);
        }
      }
    }
    const g = b.build();
    const m = new THREE.ShaderMaterial({
      uniforms: { uCol: { value: new THREE.Color() }, uHor: U.uHor, uNight: uniforms.uNight },
      depthTest: false, depthWrite: false, fog: false, side: THREE.DoubleSide,
      vertexShader: `varying vec3 vP; void main(){ vP = position; vec4 p = projectionMatrix*modelViewMatrix*vec4(position,1.); gl_Position = p.xyww; }`,
      fragmentShader: `uniform vec3 uCol,uHor; uniform float uNight; varying vec3 vP; ${GLSL_HASH}
        void main(){ vec3 c = mix(uCol, uHor, 0.42); c = mix(c, uHor, smoothstep(6.0,-10.0,vP.y)*0.85);
          float ang = atan(vP.z, vP.x)*246.0; vec2 cell = vec2(ang/2.6, vP.y/3.4); float hh = hash21(floor(cell));
          vec2 f = fract(cell); float win = step(0.72, hh) * step(0.25,f.x)*step(f.x,0.7)*step(0.3,f.y)*step(f.y,0.75) * step(0.0, vP.y);
          c += vec3(1.0,0.72,0.35)*win*uNight*1.4;
          gl_FragColor = vec4(c,1.0);${TONE} }`,
    });
    const sky = new THREE.Mesh(g, m); sky.renderOrder = -92; sky.frustumCulled = false; sky.name = 'skyline';
    followMeshes.push(sky); group.add(sky); U.skylineMat = m;
    mtnLayers.push(m);
  }

  // ---- clouds (instanced billboards)
  const nClouds = { low: 7, med: 12, high: 16 }[quality] || 10;
  let clouds = null, cloudData = [];
  {
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128;
    const c = cv.getContext('2d'); const cr = mulberry32(5);
    for (let i = 0; i < 16; i++) {
      const x = 40 + cr() * 176, y = 64 + (cr() - 0.5) * 24, r = 22 + cr() * 26;
      const gr = c.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(255,255,255,0.55)'); gr.addColorStop(0.6, 'rgba(255,255,255,0.18)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = gr; c.fillRect(0, 0, 256, 128);
    }
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.ShaderMaterial({
      uniforms: { uMap: { value: tex }, uCol: { value: new THREE.Color() }, uLow: { value: new THREE.Color() }, uOp: { value: 0.9 } },
      transparent: true, depthWrite: false, fog: false,
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; vec4 mv = modelViewMatrix*instanceMatrix*vec4(0.,0.,0.,1.);
        float sx = length(instanceMatrix[0].xyz), sy = length(instanceMatrix[1].xyz); mv.xy += position.xy*vec2(sx,sy); gl_Position = projectionMatrix*mv; }`,
      fragmentShader: `uniform sampler2D uMap; uniform vec3 uCol,uLow; uniform float uOp; varying vec2 vUv;
        void main(){ vec4 t = texture2D(uMap, vUv); vec3 c = mix(uLow, uCol, smoothstep(0.1,0.9,vUv.y)); gl_FragColor = vec4(c, t.a*uOp);${TONE} }`,
    });
    clouds = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), mat, nClouds);
    clouds.frustumCulled = false; clouds.renderOrder = -50; clouds.name = 'clouds';
    const rr = mulberry32(77);
    for (let i = 0; i < nClouds; i++) {
      const a = rr() * Math.PI * 2, d = 120 + rr() * 150;
      cloudData.push({ x: Math.cos(a) * d, y: 55 + rr() * 60, z: Math.sin(a) * d, s: 80 + rr() * 90, sp: 1.2 + rr() * 1.5 });
    }
    group.add(clouds);
  }

  // ---- dust motes / fireflies around player
  const nMotes = { low: 90, med: 220, high: 380 }[quality] || 200;
  const mp = new Float32Array(nMotes * 3), ms = new Float32Array(nMotes * 2);
  for (let i = 0; i < nMotes; i++) { mp.set([rng() * 60, rng() * 14, rng() * 60], i * 3); ms[i * 2] = rng(); ms[i * 2 + 1] = rng(); }
  const mg = new THREE.BufferGeometry();
  mg.setAttribute('position', new THREE.BufferAttribute(mp, 3));
  mg.setAttribute('aS', new THREE.BufferAttribute(ms, 2));
  const moteU = { uTime: uniforms.uTime, uPlayer: uniforms.uPlayer, uNight: uniforms.uNight, uPx: uniforms.uPx, uSunCol: U.uSunCol };
  const motes = new THREE.Points(mg, new THREE.ShaderMaterial({
    uniforms: moteU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    vertexShader: `attribute vec2 aS; uniform float uTime; uniform vec3 uPlayer; uniform float uPx; varying float vA;
      void main(){ vec3 p = position; p.x += uTime*(0.8+aS.x); p.y += sin(uTime*0.6+aS.y*20.)*0.6; p.z += sin(uTime*0.3+aS.x*10.)*1.5;
        vec3 o = mod(p - uPlayer + vec3(30.,0.,30.), vec3(60.,14.,60.)) - vec3(30.,0.,30.);
        vec3 w = uPlayer + vec3(o.x, o.y + 0.3, o.z);
        vec4 mv = viewMatrix*vec4(w,1.); gl_Position = projectionMatrix*mv;
        float fade = smoothstep(30.,18.,length(o.xz));
        vA = fade*(0.35+0.65*sin(uTime*1.5+aS.y*30.)*0.5+0.325);
        gl_PointSize = (1.4+aS.x*2.2)*uPx*8.0/ max(1.0,-mv.z)*4.0; }`,
    fragmentShader: `uniform float uNight; uniform vec3 uSunCol; varying float vA; void main(){ vec2 c = gl_PointCoord-0.5; float a = smoothstep(0.5,0.0,length(c));
      vec3 col = mix(vec3(1.0,0.86,0.6), vec3(0.6,1.0,0.75), uNight);
      gl_FragColor = vec4(col*a*vA*(0.5+uNight*0.9), a*vA*0.6);${TONE} }`,
  }));
  motes.frustumCulled = false; motes.name = 'motes'; group.add(motes);

  const tmpS = makeSample();
  const dirS = new THREE.Vector3(), dirM = new THREE.Vector3();
  const state = { sample: tmpS, sunDir: dirS, moonDir: dirM, night: 0, sunAmt: 1 };
  function setTOD(t01) {
    const s = sampleKeys(t01, tmpS);
    sunDirection(t01, dirS); dirM.copy(dirS).multiplyScalar(-1);
    U.uTop.value.copy(s.top); U.uMid.value.copy(s.mid); U.uHor.value.copy(s.hor); U.uSunCol.value.copy(s.sunC);
    U.uSunDir.value.copy(dirS); U.uMoonDir.value.copy(dirM);
    const elev = dirS.y;
    state.night = smoothstep(0.12, -0.16, elev);
    uniforms.uNight.value = state.night;
    state.sunAmt = smoothstep(-0.08, 0.05, elev);
    U.uSunAmt.value = state.sunAmt; U.uMoonAmt.value = smoothstep(0.0, -0.2, elev);
    starU.uOp.value = smoothstep(0.05, -0.25, elev);
    const layerMix = [0, 0, 0];
    for (const m of mtnLayers) if (m.uniforms.uMtn) m.uniforms.uMtn.value.copy(s.mtn);
    if (U.skylineMat) U.skylineMat.uniforms.uCol.value.copy(s.mtn).multiplyScalar(0.8);
    const cm = clouds.material.uniforms;
    cm.uCol.value.copy(s.hor).lerp(new THREE.Color(1, 1, 1), 0.35 * (1 - state.night)).multiplyScalar(1.0 - 0.6 * state.night + 0.0);
    cm.uLow.value.copy(s.mid).multiplyScalar(0.8);
    return state;
  }
  const _m = new THREE.Matrix4();
  function update(dt, time, p) {
    dome.position.set(p.x, 0, p.z); stars.position.set(p.x, 0, p.z);
    for (const m of followMeshes) m.position.set(p.x * 0.85, 0, p.z * 0.85);
    for (let i = 0; i < cloudData.length; i++) {
      const c = cloudData[i];
      c.x += c.sp * dt; if (c.x > 290) c.x -= 580;
      _m.makeScale(c.s, c.s * 0.34, 1).setPosition(c.x, c.y, c.z);
      clouds.setMatrixAt(i, _m);
    }
    clouds.instanceMatrix.needsUpdate = true;
    // clouds & their positions are world-space, anchored to the player horizontally (parallax-free) for stability
    clouds.position.set(p.x, 0, p.z);
    stars.rotation.y = time * 0.004;
  }
  return { group, setTOD, update, state, U };
}
