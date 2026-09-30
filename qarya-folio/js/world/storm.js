import * as THREE from 'three';
import { reveal } from '../core/reveal.js';

// العاصفة الرملية: what surrounds the island before the visitor starts. A
// dome of churning, wind-streaked sand around the camera, sheets of blowing
// sand swirling around the island, and a glowing golden rim where the island
// ends. `update(dt, t, level)` fades it all out as `level` goes 1 → 0.

const NOISE = `
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1,0)), f.x), mix(h21(i + vec2(0,1)), h21(i + vec2(1,1)), f.x), f.y); }
float fbm(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++){ s += a * vn(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }
`;

function domeMaterial() {
  // Opaque and drawn right after the sky (which it hides) but before the
  // world, so the island always sits on top of it.
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
    fog: false,
    uniforms: {
      uTime: { value: 0 },
      uLevel: { value: 1 },
      uWind: { value: new THREE.Vector2(1, 0.25) },
      uDark: { value: new THREE.Color('#6b3a1c') },
      uMid: { value: new THREE.Color('#c07a3a') },
      uLight: { value: new THREE.Color('#f3c985') },
      uCalm: { value: new THREE.Color('#f0cf9c') },
    },
    vertexShader: `varying vec3 vDir;
      void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform float uTime; uniform float uLevel; uniform vec2 uWind; uniform vec3 uDark, uMid, uLight, uCalm; varying vec3 vDir;
      ${NOISE}
      void main(){
        vec3 d = normalize(vDir);
        // Project the view ray onto a sheet of sand far below (or a ceiling
        // above), so the pattern is seamless and flows with the wind.
        vec2 p = d.xz / max(0.18, abs(d.y)) * 2.2;
        vec2 w = normalize(uWind);
        vec2 n = vec2(-w.y, w.x);
        float along = dot(p, w), across = dot(p, n);
        float t = uTime;
        float warp = fbm(vec2(along * 0.25 - t * 0.4, across * 0.6));
        float body = fbm(vec2(along * 0.5 - t * 1.4, across * 1.2 + warp * 1.6));
        float streak = fbm(vec2(along * 0.35 - t * 2.6, across * 7.0 + warp * 2.5));
        float fine = fbm(vec2(along * 1.2 - t * 5.0, across * 22.0));
        float s = body * 0.55 + streak * 0.38 + fine * 0.16;
        vec3 col = mix(uDark, uMid, smoothstep(0.28, 0.62, s));
        col = mix(col, uLight, smoothstep(0.58, 0.86, s + streak * 0.2));
        // Slow pulses of thicker sand rolling through.
        col *= 0.86 + 0.22 * fbm(vec2(along * 0.08 - t * 0.5, across * 0.08));
        col *= 0.78 + 0.35 * smoothstep(-0.95, 0.05, d.y);
        gl_FragColor = vec4(mix(uCalm, col, uLevel), 1.0);
      }`,
  });
}

function streakMaterial(count) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    fog: false,
    blending: THREE.NormalBlending,
    uniforms: {
      uTime: { value: 0 },
      uLevel: { value: 1 },
      uScale: { value: 300 },
      uAngle: { value: 0 },
      uCenter: reveal.center,
      uRadius: reveal.radius,
      uColor: { value: new THREE.Color('#f6d7a0') },
      uShade: { value: new THREE.Color('#8a4f25') },
    },
    vertexShader: `attribute float aSeed; uniform float uScale; uniform vec2 uCenter; uniform float uRadius;
      varying float vA; varying float vS;
      void main(){
        vec4 w = modelMatrix * vec4(position, 1.0);
        float d = distance(w.xz, uCenter);
        // Only in the storm: fade out near and inside the island.
        vA = smoothstep(uRadius + 0.4, uRadius + 3.0, d);
        vS = aSeed;
        vec4 mv = viewMatrix * w;
        gl_PointSize = (14.0 + aSeed * 30.0) * uScale / -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `uniform float uLevel; uniform float uAngle; uniform vec3 uColor, uShade; varying float vA; varying float vS;
      void main(){
        vec2 c = gl_PointCoord - 0.5;
        float ca = cos(uAngle), sa = sin(uAngle);
        c = vec2(ca * c.x - sa * c.y, sa * c.x + ca * c.y);
        // A long thin streak of sand, soft at the ends.
        float a = exp(-(c.x * c.x) * 9.0 - (c.y * c.y) * 320.0);
        a *= vA * uLevel * (0.35 + 0.65 * vS);
        if (a < 0.01) discard;
        gl_FragColor = vec4(mix(uShade, uColor, vS), a);
      }`,
  });
}

function puffMaterial() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,0.9)');
  grd.addColorStop(0.5, 'rgba(255,255,255,0.35)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  const map = new THREE.CanvasTexture(c);
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    fog: false,
    uniforms: {
      map: { value: map },
      uLevel: { value: 1 },
      uScale: { value: 300 },
      uCenter: reveal.center,
      uRadius: reveal.radius,
      uColor: { value: new THREE.Color('#d9a060') },
    },
    vertexShader: `attribute float aSeed; uniform float uScale; uniform vec2 uCenter; uniform float uRadius; varying float vA;
      void main(){
        vec4 w = modelMatrix * vec4(position, 1.0);
        vA = smoothstep(uRadius + 1.0, uRadius + 6.0, distance(w.xz, uCenter));
        vec4 mv = viewMatrix * w;
        gl_PointSize = (120.0 + aSeed * 160.0) * uScale / -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `uniform sampler2D map; uniform float uLevel; uniform vec3 uColor; varying float vA;
      void main(){ float a = texture2D(map, gl_PointCoord).a * 0.32 * vA * uLevel; if (a < 0.01) discard; gl_FragColor = vec4(uColor, a); }`,
  });
}

function rimTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 8;
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 512, 0);
  grd.addColorStop(0, 'rgba(255,190,90,0)');
  grd.addColorStop(0.4, 'rgba(255,210,130,0.35)');
  grd.addColorStop(0.5, 'rgba(255,250,225,1)');
  grd.addColorStop(0.58, 'rgba(255,200,110,0.5)');
  grd.addColorStop(1, 'rgba(255,170,70,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 512, 8);
  return new THREE.CanvasTexture(c);
}

export function createStorm(ctx) {
  const { scene, mobile } = ctx;
  const group = new THREE.Group();
  group.userData.noReveal = true;
  scene.add(group);

  // Background dome, drawn first and centred on the camera.
  const domeMat = domeMaterial();
  const dome = new THREE.Mesh(new THREE.SphereGeometry(300, 48, 24), domeMat);
  dome.renderOrder = -10;
  dome.frustumCulled = false;
  dome.userData.noReveal = true;
  group.add(dome);

  // Blowing sand: streaks racing around the island, and big soft puffs.
  const BOX = 70;
  function points(n, material, yRange) {
    const pos = new Float32Array(n * 3);
    const seed = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * BOX;
      pos[i * 3 + 1] = yRange[0] + Math.random() * (yRange[1] - yRange[0]);
      pos[i * 3 + 2] = (Math.random() - 0.5) * BOX;
      seed[i] = Math.random();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    const p = new THREE.Points(geo, material);
    p.frustumCulled = false;
    p.renderOrder = 4;
    p.userData.noReveal = true;
    group.add(p);
    return { p, pos, seed, n, y: yRange };
  }
  const streaks = points(mobile ? 1400 : 2600, streakMaterial(), [-4, 10]);
  const puffs = points(mobile ? 90 : 160, puffMaterial(), [-3, 6]);

  // The island's glowing edge on the ground.
  const rimMat = new THREE.MeshBasicMaterial({ map: rimTexture(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide });
  const ringGeo = new THREE.RingGeometry(0.9, 1.1, 180, 1);
  const uv = ringGeo.attributes.uv, rp = ringGeo.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (Math.hypot(rp.getX(i), rp.getY(i)) - 0.9) / 0.2, 0.5);
  const rim = new THREE.Mesh(ringGeo, rimMat);
  rim.rotation.x = -Math.PI / 2;
  rim.renderOrder = 5;
  rim.userData.noReveal = true;
  group.add(rim);

  const wind = new THREE.Vector2(1, 0.25).normalize();
  const tmp = new THREE.Vector3();
  const tmp2 = new THREE.Vector3();

  function move(layer, dt, speed, swirl) {
    const { pos, seed, n, y } = layer;
    const c = reveal.center.value;
    const half = BOX / 2;
    for (let i = 0; i < n; i++) {
      const j = i * 3;
      const s = seed[i];
      const dx = pos[j] - c.x, dz = pos[j + 2] - c.y;
      const d = Math.hypot(dx, dz) || 1;
      // Mostly straight downwind, bending around the island like a vortex.
      const tang = swirl * Math.max(0, 1 - d / 30);
      const v = speed * (0.6 + s * 0.8);
      pos[j] += (wind.x * v + (-dz / d) * tang * v) * dt;
      pos[j + 2] += (wind.y * v + (dx / d) * tang * v) * dt;
      pos[j + 1] += Math.sin(s * 40 + performance.now() * 0.001 * (1 + s)) * 0.6 * dt;
      if (pos[j] - c.x > half) pos[j] -= BOX; else if (pos[j] - c.x < -half) pos[j] += BOX;
      if (pos[j + 2] - c.y > half) pos[j + 2] -= BOX; else if (pos[j + 2] - c.y < -half) pos[j + 2] += BOX;
      if (pos[j + 1] > y[1]) pos[j + 1] = y[0];
      if (pos[j + 1] < y[0]) pos[j + 1] = y[1];
    }
    layer.p.geometry.attributes.position.needsUpdate = true;
  }

  let level = 1;
  return {
    group,
    update(dt, t, target) {
      level = target;
      group.visible = level > 0.002;
      if (!group.visible) return;
      const cam = ctx.camera;
      if (cam) dome.position.copy(cam.position);
      domeMat.uniforms.uTime.value = t;
      domeMat.uniforms.uLevel.value = Math.min(1, level * 1.6);
      domeMat.uniforms.uWind.value.copy(wind);

      const ang = 0.25 + Math.sin(t * 0.21) * 0.25;
      wind.set(Math.cos(ang), Math.sin(ang));
      const gust = 1 + 0.35 * Math.sin(t * 1.7) + 0.2 * Math.sin(t * 3.1);
      move(streaks, dt, 26 * gust, 0.9);
      move(puffs, dt, 14 * gust, 0.6);

      // Turn each streak to lie along the wind as seen on screen.
      if (cam) {
        tmp.set(reveal.center.value.x, 0, reveal.center.value.y).project(cam);
        tmp2.set(reveal.center.value.x + wind.x, 0, reveal.center.value.y + wind.y).project(cam);
        const sx = (tmp2.x - tmp.x) * innerWidth, sy = (tmp2.y - tmp.y) * innerHeight;
        streaks.p.material.uniforms.uAngle.value = Math.atan2(sy, sx);
      }
      const scale = innerHeight / 2 / Math.tan(((cam?.fov || 40) * Math.PI) / 360) / 10;
      streaks.p.material.uniforms.uScale.value = scale;
      puffs.p.material.uniforms.uScale.value = scale;
      streaks.p.material.uniforms.uLevel.value = level;
      puffs.p.material.uniforms.uLevel.value = level;

      const c = reveal.center.value;
      const r = Math.min(reveal.radius.value, 400);
      rim.position.set(c.x, ctx.heightAt(c.x, c.y) + 0.08, c.y);
      rim.scale.set(r, r, 1);
      rimMat.opacity = Math.min(1, level * 1.5) * (0.85 + 0.15 * Math.sin(t * 3));
    },
  };
}
