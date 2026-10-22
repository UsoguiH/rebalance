// Sunsprings sky: smoggy burnt-orange dome with drifting cloud banks, a hazy sun,
// and distant lightning strikes (bolts + sky flash + delayed thunder).
import * as THREE from 'three';
import { R } from './core.js';

const vert = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vDir = normalize(wp.xyz - cameraPosition);
    gl_Position = projectionMatrix * viewMatrix * wp;
    gl_Position.z = gl_Position.w; // keep at far plane
  }
`;
const frag = /* glsl */ `
  uniform vec3 uZenith, uHorizon, uHaze, uSunCol, uSunDir, uCloudDark, uCloudLit;
  uniform float uTime, uFlash;
  uniform vec3 uFlashDir;
  varying vec3 vDir;
  float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
  float n2(vec2 p){
    vec2 i = floor(p), f = fract(p);
    vec2 u = f*f*(3.0-2.0*f);
    return mix(mix(h2(i), h2(i+vec2(1,0)), u.x), mix(h2(i+vec2(0,1)), h2(i+vec2(1,1)), u.x), u.y);
  }
  float fbm(vec2 p){
    float s = 0.0, a = 0.5;
    for(int i=0;i<6;i++){ s += a*n2(p); p = p*2.03 + vec2(1.7,9.2); a *= 0.5; }
    return s;
  }
  void main(){
    vec3 d = normalize(vDir);
    float h = d.y;
    vec3 col = mix(uHorizon, uZenith, pow(clamp(h, 0.0, 1.0), 0.55));
    // thick haze band hugging the horizon
    col = mix(col, uHaze, exp(-max(h, 0.0) * 9.0) * 0.85);
    // clouds: streaky banks projected on a high plane
    if (h > -0.05) {
      vec2 uv = d.xz / (h + 0.18);
      uv *= vec2(0.55, 1.1);
      float c = fbm(uv * 1.4 + vec2(uTime * 0.012, uTime * 0.004));
      float c2 = fbm(uv * 3.1 - vec2(uTime * 0.02, 0.0));
      float cov = smoothstep(0.42, 0.78, c * 0.75 + c2 * 0.35);
      float sunAmt = pow(max(dot(d, uSunDir), 0.0), 3.0);
      vec3 cc = mix(uCloudDark, uCloudLit, clamp(c2 * 1.2 + sunAmt * 0.8, 0.0, 1.0));
      float fade = smoothstep(-0.02, 0.25, h);
      col = mix(col, cc, cov * 0.85 * fade);
    }
    // sun glow through smog
    float sd = max(dot(d, uSunDir), 0.0);
    col += uSunCol * (pow(sd, 900.0) * 2.5 + pow(sd, 40.0) * 0.45 + pow(sd, 6.0) * 0.18);
    // below horizon fade to haze
    col = mix(col, uHaze * 0.9, smoothstep(0.0, -0.08, h));
    // lightning flash, strongest toward the strike
    float fl = uFlash * (0.35 + 0.65 * pow(max(dot(d, uFlashDir), 0.0), 2.0));
    col += vec3(0.75, 0.68, 1.0) * fl;
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export function createSky(scene, sunDir) {
  const uniforms = {
    uZenith: { value: new THREE.Color('#5a3418') },
    uHorizon: { value: new THREE.Color('#c9853f') },
    uHaze: { value: new THREE.Color('#b9773a') },
    uSunCol: { value: new THREE.Color('#ffd28a') },
    uSunDir: { value: sunDir.clone() },
    uCloudDark: { value: new THREE.Color('#3d2414') },
    uCloudLit: { value: new THREE.Color('#d39a55') },
    uTime: { value: 0 },
    uFlash: { value: 0 },
    uFlashDir: { value: new THREE.Vector3(1, 0.2, 0).normalize() },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: vert,
    fragmentShader: frag,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(4000, 48, 24), mat);
  mesh.renderOrder = -10;
  mesh.frustumCulled = false;
  scene.add(mesh);

  // lightning bolt meshes
  const boltMat = new THREE.MeshBasicMaterial({
    color: 0xe6dcff,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
  });
  const bolts = [];
  for (let i = 0; i < 2; i++) {
    const m = new THREE.Mesh(new THREE.BufferGeometry(), boltMat.clone());
    m.frustumCulled = false;
    m.visible = false;
    scene.add(m);
    bolts.push({ mesh: m, t: 0 });
  }

  function makeBolt(b, origin, top) {
    // jagged ribbon from top down to origin, with a couple of forks
    const pos = [];
    const addSeg = (a, c, w) => {
      const dx = c.x - a.x, dz = c.z - a.z;
      const l = Math.hypot(dx, dz) || 1;
      const ox = (-dz / l) * w, oz = (dx / l) * w;
      pos.push(a.x - w, a.y, a.z, a.x + w, a.y, a.z, c.x + w, c.y, c.z);
      pos.push(a.x - w, a.y, a.z, c.x + w, c.y, c.z, c.x - w, c.y, c.z);
      pos.push(a.x, a.y, a.z - w, a.x, a.y, a.z + w, c.x, c.y, c.z + w);
      pos.push(a.x, a.y, a.z - w, c.x, c.y, c.z + w, c.x, c.y, c.z - w);
      void ox;
      void oz;
    };
    const walk = (from, to, steps, w, fork) => {
      let p = from.clone();
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const n = from.clone().lerp(to, t);
        if (i < steps) {
          n.x += (R() - 0.5) * 60 * (1 - t * 0.5);
          n.z += (R() - 0.5) * 60 * (1 - t * 0.5);
        }
        addSeg(p, n, w);
        if (fork && R() < 0.3) {
          const end = n.clone().add(new THREE.Vector3((R() - 0.5) * 300, -R() * 250, (R() - 0.5) * 300));
          walk(n, end, 4, w * 0.5, false);
        }
        p = n;
      }
    };
    walk(top, origin, 12, 3.2, true);
    b.mesh.geometry.dispose();
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    b.mesh.geometry = g;
  }

  let next = 3 + R() * 6;
  let thunderCb = null;
  return {
    mesh,
    uniforms,
    onThunder(cb) {
      thunderCb = cb;
    },
    strike(camPos) {
      const b = bolts.find((x) => x.t <= 0) || bolts[0];
      const ang = R() * Math.PI * 2;
      const dist = 900 + R() * 900;
      const origin = new THREE.Vector3(camPos.x + Math.cos(ang) * dist, 60 + R() * 40, camPos.z + Math.sin(ang) * dist);
      const top = origin.clone().add(new THREE.Vector3((R() - 0.5) * 200, 900, (R() - 0.5) * 200));
      makeBolt(b, origin, top);
      b.t = 0.45;
      b.mesh.visible = true;
      uniforms.uFlashDir.value.copy(origin).sub(camPos).setY(400).normalize();
      uniforms.uFlash.value = 0.9;
      if (thunderCb) thunderCb(dist);
    },
    update(dt, camera) {
      mesh.position.copy(camera.position);
      uniforms.uTime.value += dt;
      next -= dt;
      if (next <= 0) {
        next = 4 + R() * 9;
        this.strike(camera.position);
      }
      uniforms.uFlash.value = Math.max(0, uniforms.uFlash.value - dt * 3.2);
      for (const b of bolts) {
        if (b.t > 0) {
          b.t -= dt;
          // flicker
          const f = b.t > 0 ? (Math.sin(b.t * 80) > -0.3 ? 1 : 0.2) * Math.min(1, b.t * 4) : 0;
          b.mesh.material.opacity = f;
          if (b.t <= 0) b.mesh.visible = false;
        }
      }
    },
  };
}
