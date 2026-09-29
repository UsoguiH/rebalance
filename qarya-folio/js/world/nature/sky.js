import * as THREE from 'three';
import { Builder } from '../../core/builder.js';
import { rng } from './util.js';

// السماء: a gradient dome with a soft sun, drifting low-poly clouds, and the
// golden-afternoon light and haze tuned to match.

export function createSky(ctx) {
  const { scene, P, sun, sunOffset, hemi, mobile } = ctx;

  // Light: a lower, warmer afternoon sun from the south-west. Shadows fall
  // north-east, away from the camera, so they stay readable.
  sunOffset.set(-40, 47, 30);
  sun.color.set('#ffe4b8');
  sun.intensity = 2.25;
  hemi.color.set('#ffeed4');
  hemi.groundColor.set('#cf9560');
  hemi.intensity = 1.3;

  const horizon = new THREE.Color(P.skyHorizon);
  const haze = new THREE.Color('#f2d3a2');
  scene.background = haze.clone();
  scene.fog = new THREE.Fog(haze, 75, 215);

  const sunDir = sunOffset.clone().normalize();
  const uniforms = {
    uTop: { value: new THREE.Color(P.skyTop) },
    uMid: { value: new THREE.Color('#a9c9e0') },
    uHorizon: { value: horizon },
    uHaze: { value: haze },
    uSun: { value: new THREE.Color('#fff3d6') },
    uGlow: { value: new THREE.Color('#ffc978') },
    uSunDir: { value: sunDir },
  };
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(420, 32, 16),
    new THREE.ShaderMaterial({
      uniforms,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
      fog: false,
      vertexShader: /* glsl */`
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */`
        uniform vec3 uTop, uMid, uHorizon, uHaze, uSun, uGlow, uSunDir;
        varying vec3 vDir;
        void main() {
          vec3 d = normalize(vDir);
          float h = d.y;
          vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.28, h));
          col = mix(col, uTop, smoothstep(0.2, 0.85, h));
          col = mix(col, uHaze, smoothstep(0.02, -0.12, h));
          float s = max(dot(d, uSunDir), 0.0);
          col += uGlow * (pow(s, 6.0) * 0.28 + pow(s, 40.0) * 0.35);
          col = mix(col, uSun, smoothstep(0.9985, 0.9992, s));
          // Warm band hugging the horizon.
          col = mix(col, uGlow, exp(-abs(h) * 14.0) * 0.18);
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    }),
  );
  dome.renderOrder = -1000;
  dome.frustumCulled = false;
  dome.name = 'sky';
  scene.add(dome);

  // Clouds: one faceted cloud shape, instanced with stretched scales.
  const rand = rng(77);
  const b = new Builder();
  const puffs = [[0, 0, 0, 3.2], [3.4, -0.3, 0.4, 2.4], [-3.2, -0.4, -0.2, 2.3], [1.4, 1.3, -0.3, 2.2], [-1.5, 1.0, 0.5, 2.0], [5.6, -0.8, 0, 1.5], [-5.4, -0.9, 0.3, 1.4]];
  for (const [x, y, z, r] of puffs) {
    b.sphere(r, '#fffaf0', { position: [x, y, z], scale: [1, 0.72, 0.85] }, 1);
    b.sphere(r * 0.92, '#f6dcc6', { position: [x, y - r * 0.28, z], scale: [1.05, 0.45, 0.9] }, 0);
  }
  const cloudGeo = b.build().geometry;
  const cloudMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, fog: false, emissive: '#8a6f5c', emissiveIntensity: 0.55 });
  const nClouds = mobile ? 8 : 14;
  const clouds = new THREE.InstancedMesh(cloudGeo, cloudMat, nClouds);
  clouds.frustumCulled = false;
  const cloudData = [];
  for (let i = 0; i < nClouds; i++) {
    const a = rand() * Math.PI * 2, r = 110 + rand() * 170;
    cloudData.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, y: 48 + rand() * 38, s: 1.3 + rand() * 1.6, yaw: rand() * Math.PI, speed: 0.6 + rand() * 0.6 });
  }
  scene.add(clouds);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sv = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);

  return {
    update(dt, t, wind) {
      const cam = ctx.camera;
      if (cam) dome.position.copy(cam.position);
      for (let i = 0; i < nClouds; i++) {
        const c = cloudData[i];
        c.x += wind.dir.x * c.speed * (1 + wind.gust) * dt;
        c.z += wind.dir.y * c.speed * (1 + wind.gust) * dt;
        if (Math.hypot(c.x, c.z) > 300) { c.x = -c.x * 0.95; c.z = -c.z * 0.95; }
        q.setFromAxisAngle(up, c.yaw);
        m.compose(v.set(c.x, c.y, c.z), q, sv.set(c.s * 1.4, c.s, c.s));
        clouds.setMatrixAt(i, m);
      }
      clouds.instanceMatrix.needsUpdate = true;
    },
  };
}
