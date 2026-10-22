// Effects: instanced billboard particles (fire, smoke, sparks, flashes, ice, water),
// stretched tracer sparks, tumbling debris chunks, ground scorch decals, pooled flash
// lights and camera shake.
import * as THREE from 'three';
import { R, rng, clamp, G } from './core.js';
import { canvas } from './textures.js';

const CELLS = 4; // atlas is 4x4
export const F = { glow: 0, smoke: 1, fire: 2, spark: 3, star: 4, ring: 5, ice: 6, drop: 7, flame: 8, smoke2: 9, chunk: 10, skull: 11, bolt: 12 };

function makeAtlas() {
  const S = 128, N = CELLS;
  const c = canvas(S * N, S * N);
  const ctx = c.getContext('2d');
  const r = rng(9);
  const cell = (i, fn) => {
    const x = (i % N) * S, y = Math.floor(i / N) * S;
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.rect(0, 0, S, S);
    ctx.clip();
    fn(ctx, S);
    ctx.restore();
  };
  const blob = (ctx, x, y, rad, inner, outer) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, inner);
    g.addColorStop(1, outer);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.fill();
  };
  cell(F.glow, (x, s) => blob(x, s / 2, s / 2, s / 2, 'rgba(255,255,255,1)', 'rgba(255,255,255,0)'));
  const puff = (x, s, seed, dark) => {
    const rr = rng(seed);
    for (let i = 0; i < 26; i++) {
      const a = rr() * Math.PI * 2, d = rr() * s * 0.22;
      const v = dark ? 120 + rr() * 80 : 200 + rr() * 55;
      blob(x, s / 2 + Math.cos(a) * d, s / 2 + Math.sin(a) * d, s * (0.14 + rr() * 0.16), `rgba(${v},${v},${v},${0.28 + rr() * 0.2})`, `rgba(${v},${v},${v},0)`);
    }
  };
  cell(F.smoke, (x, s) => puff(x, s, 3, false));
  cell(F.smoke2, (x, s) => puff(x, s, 7, true));
  cell(F.fire, (x, s) => {
    for (let i = 0; i < 22; i++) {
      const a = r() * Math.PI * 2, d = r() * s * 0.2;
      blob(x, s / 2 + Math.cos(a) * d, s / 2 + Math.sin(a) * d, s * (0.12 + r() * 0.18), 'rgba(255,240,200,0.6)', 'rgba(255,120,20,0)');
    }
    blob(x, s / 2, s / 2, s * 0.3, 'rgba(255,255,230,0.8)', 'rgba(255,160,40,0)');
  });
  cell(F.spark, (x, s) => {
    const g = x.createLinearGradient(0, 0, s, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.7, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g;
    x.fillRect(0, s / 2 - 5, s, 10);
    blob(x, s * 0.72, s / 2, 12, 'rgba(255,255,255,1)', 'rgba(255,255,255,0)');
  });
  cell(F.star, (x, s) => {
    blob(x, s / 2, s / 2, s * 0.25, 'rgba(255,255,255,1)', 'rgba(255,255,255,0)');
    x.fillStyle = 'rgba(255,255,255,0.9)';
    for (let i = 0; i < 4; i++) {
      x.save();
      x.translate(s / 2, s / 2);
      x.rotate((i * Math.PI) / 4);
      x.beginPath();
      x.moveTo(-s / 2, 0);
      x.lineTo(0, -3);
      x.lineTo(s / 2, 0);
      x.lineTo(0, 3);
      x.fill();
      x.restore();
    }
  });
  cell(F.ring, (x, s) => {
    x.strokeStyle = 'rgba(255,255,255,0.9)';
    x.lineWidth = 8;
    x.beginPath();
    x.arc(s / 2, s / 2, s * 0.42, 0, Math.PI * 2);
    x.stroke();
    x.lineWidth = 18;
    x.strokeStyle = 'rgba(255,255,255,0.25)';
    x.stroke();
  });
  cell(F.ice, (x, s) => {
    x.fillStyle = 'rgba(220,240,255,0.9)';
    for (let i = 0; i < 6; i++) {
      x.save();
      x.translate(s / 2, s / 2);
      x.rotate((i * Math.PI) / 3);
      x.fillRect(-3, 0, 6, s * 0.45);
      x.fillRect(-14, s * 0.25, 28, 4);
      x.restore();
    }
    blob(x, s / 2, s / 2, s * 0.2, 'rgba(255,255,255,1)', 'rgba(255,255,255,0)');
  });
  cell(F.drop, (x, s) => blob(x, s / 2, s / 2, s * 0.2, 'rgba(255,255,255,0.9)', 'rgba(255,255,255,0)'));
  cell(F.flame, (x, s) => {
    for (let i = 0; i < 18; i++) {
      const yy = s * 0.2 + r() * s * 0.6;
      blob(x, s / 2 + (r() - 0.5) * s * 0.3, yy, s * (0.08 + r() * 0.12) * (1.2 - yy / s), 'rgba(255,250,210,0.7)', 'rgba(255,110,20,0)');
    }
  });
  cell(F.chunk, (x, s) => {
    x.fillStyle = '#ffffff';
    x.beginPath();
    x.moveTo(s * 0.3, s * 0.2);
    x.lineTo(s * 0.8, s * 0.35);
    x.lineTo(s * 0.7, s * 0.8);
    x.lineTo(s * 0.2, s * 0.65);
    x.fill();
  });
  cell(F.skull, (x, s) => {
    blob(x, s / 2, s / 2, s / 2, 'rgba(255,255,255,0.9)', 'rgba(255,255,255,0)');
    x.fillStyle = 'rgba(0,0,0,0.85)';
    x.beginPath();
    x.arc(s * 0.38, s * 0.44, s * 0.09, 0, Math.PI * 2);
    x.arc(s * 0.62, s * 0.44, s * 0.09, 0, Math.PI * 2);
    x.fill();
    x.beginPath();
    x.arc(s / 2, s * 0.62, s * 0.16, 0, Math.PI);
    x.fill();
  });
  cell(F.bolt, (x, s) => {
    x.strokeStyle = 'rgba(255,255,255,1)';
    x.lineWidth = 4;
    x.beginPath();
    let px = 0, py = s / 2;
    x.moveTo(px, py);
    while (px < s) {
      px += 10 + r() * 10;
      py = s / 2 + (r() - 0.5) * s * 0.5;
      x.lineTo(px, py);
    }
    x.stroke();
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const vert = /* glsl */ `
  attribute vec3 iPos;
  attribute vec4 iCol;
  attribute vec4 iData; // size, rotation, frame, stretch
  attribute vec3 iVel;
  varying vec2 vUv;
  varying vec4 vCol;
  uniform float uCells;
  void main() {
    float size = iData.x, rot = iData.y, frame = iData.z, stretch = iData.w;
    vec4 mv = viewMatrix * vec4(iPos, 1.0);
    vec2 p = position.xy;
    if (stretch > 0.0) {
      // align quad to the screen-space velocity
      vec4 mv2 = viewMatrix * vec4(iPos + iVel * 0.016, 1.0);
      vec2 dir = mv2.xy - mv.xy;
      float l = length(dir);
      dir = l > 1e-5 ? dir / l : vec2(1.0, 0.0);
      vec2 nrm = vec2(-dir.y, dir.x);
      float len = max(size, l * stretch);
      mv.xy += dir * p.x * len + nrm * p.y * size * 0.35;
    } else {
      float c = cos(rot), s = sin(rot);
      mv.xy += mat2(c, s, -s, c) * p * size;
    }
    gl_Position = projectionMatrix * mv;
    float fx = mod(frame, uCells), fy = floor(frame / uCells);
    vUv = (vec2(fx, uCells - 1.0 - fy) + uv) / uCells;
    vCol = iCol;
  }
`;
const frag = /* glsl */ `
  uniform sampler2D uMap;
  varying vec2 vUv;
  varying vec4 vCol;
  void main() {
    vec4 t = texture2D(uMap, vUv);
    gl_FragColor = vec4(vCol.rgb * t.rgb, t.a * vCol.a);
    if (gl_FragColor.a < 0.004) discard;
  }
`;

class Layer {
  constructor(scene, atlas, additive, max) {
    this.max = max;
    this.n = 0;
    const base = new THREE.PlaneGeometry(1, 1);
    const g = new THREE.InstancedBufferGeometry();
    g.index = base.index;
    g.setAttribute('position', base.attributes.position);
    g.setAttribute('uv', base.attributes.uv);
    this.aPos = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3).setUsage(THREE.DynamicDrawUsage);
    this.aCol = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4).setUsage(THREE.DynamicDrawUsage);
    this.aData = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4).setUsage(THREE.DynamicDrawUsage);
    this.aVel = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('iPos', this.aPos);
    g.setAttribute('iCol', this.aCol);
    g.setAttribute('iData', this.aData);
    g.setAttribute('iVel', this.aVel);
    g.instanceCount = 0;
    this.geo = g;
    const m = new THREE.ShaderMaterial({
      uniforms: { uMap: { value: atlas }, uCells: { value: CELLS } },
      vertexShader: vert,
      fragmentShader: frag,
      transparent: true,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.mesh = new THREE.Mesh(g, m);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = additive ? 3 : 2;
    scene.add(this.mesh);
    // particle state
    this.p = [];
  }
  add(o) {
    if (this.p.length >= this.max) this.p.shift();
    this.p.push(o);
  }
  update(dt) {
    const ps = this.p;
    let w = 0;
    for (let i = 0; i < ps.length; i++) {
      const q = ps[i];
      q.t += dt;
      if (q.t >= q.life) continue;
      q.vx *= Math.exp(-q.drag * dt);
      q.vy = q.vy * Math.exp(-q.drag * dt) - q.grav * dt;
      q.vz *= Math.exp(-q.drag * dt);
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.z += q.vz * dt;
      if (q.floor !== undefined && q.y < q.floor) {
        q.y = q.floor;
        q.vy *= -0.3;
      }
      q.rot += q.spin * dt;
      ps[w++] = q;
    }
    ps.length = w;
    const n = Math.min(ps.length, this.max);
    const P = this.aPos.array, C = this.aCol.array, D = this.aData.array, V = this.aVel.array;
    for (let i = 0; i < n; i++) {
      const q = ps[i];
      const k = q.t / q.life;
      P[i * 3] = q.x;
      P[i * 3 + 1] = q.y;
      P[i * 3 + 2] = q.z;
      V[i * 3] = q.vx;
      V[i * 3 + 1] = q.vy;
      V[i * 3 + 2] = q.vz;
      const fadeIn = q.fadeIn ? Math.min(1, q.t / q.fadeIn) : 1;
      const a = (1 - Math.pow(k, q.fadePow)) * fadeIn * q.a;
      C[i * 4] = q.r + (q.r2 - q.r) * k;
      C[i * 4 + 1] = q.g + (q.g2 - q.g) * k;
      C[i * 4 + 2] = q.b + (q.b2 - q.b) * k;
      C[i * 4 + 3] = a;
      D[i * 4] = q.s0 + (q.s1 - q.s0) * Math.sqrt(k);
      D[i * 4 + 1] = q.rot;
      D[i * 4 + 2] = q.frame;
      D[i * 4 + 3] = q.stretch;
    }
    this.geo.instanceCount = n;
    this.aPos.needsUpdate = this.aCol.needsUpdate = this.aData.needsUpdate = this.aVel.needsUpdate = true;
  }
}

const _c1 = new THREE.Color(), _c2 = new THREE.Color();
function P(o) {
  // particle defaults
  _c1.set(o.color ?? 0xffffff);
  _c2.set(o.color2 ?? o.color ?? 0xffffff);
  return {
    x: o.pos.x, y: o.pos.y, z: o.pos.z,
    vx: o.vel ? o.vel.x : 0, vy: o.vel ? o.vel.y : 0, vz: o.vel ? o.vel.z : 0,
    t: 0, life: o.life ?? 1, drag: o.drag ?? 1, grav: o.grav ?? 0,
    s0: o.size ?? 1, s1: o.size1 ?? o.size ?? 1,
    rot: o.rot ?? R() * 6.28, spin: o.spin ?? (R() - 0.5) * 2,
    r: _c1.r, g: _c1.g, b: _c1.b, r2: _c2.r, g2: _c2.g, b2: _c2.b,
    a: o.alpha ?? 1, fadePow: o.fadePow ?? 1.5, fadeIn: o.fadeIn ?? 0,
    frame: o.frame ?? 0, stretch: o.stretch ?? 0, floor: o.floor,
  };
}

const _v = new THREE.Vector3();

export class FX {
  constructor(scene) {
    this.scene = scene;
    const atlas = makeAtlas();
    this.add = new Layer(scene, atlas, true, 4000);
    this.alpha = new Layer(scene, atlas, false, 2500);
    // light pool
    this.lights = [];
    for (let i = 0; i < 6; i++) {
      const l = new THREE.PointLight(0xffa040, 0, 30, 2);
      l.castShadow = false;
      scene.add(l);
      this.lights.push({ l, t: 0, life: 1, peak: 0 });
    }
    // debris chunks
    const dgeo = new THREE.BoxGeometry(1, 1, 1);
    this.debrisMesh = new THREE.InstancedMesh(dgeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7, metalness: 0.4 }), 400);
    this.debrisMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.debrisMesh.castShadow = true;
    this.debrisMesh.frustumCulled = false;
    this.debrisMesh.count = 0;
    scene.add(this.debrisMesh);
    this.debris = [];
    // scorch decals
    const dc = canvas(128, 128);
    const dx = dc.getContext('2d');
    const g = dx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(10,8,6,0.9)');
    g.addColorStop(0.5, 'rgba(20,15,10,0.6)');
    g.addColorStop(1, 'rgba(20,15,10,0)');
    dx.fillStyle = g;
    dx.fillRect(0, 0, 128, 128);
    const dtex = new THREE.CanvasTexture(dc);
    this.decalMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: dtex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }), 120);
    this.decalMesh.count = 0;
    this.decalMesh.frustumCulled = false;
    this.decalMesh.renderOrder = 1;
    scene.add(this.decalMesh);
    this.decals = [];
    this.shakeAmt = 0;
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._e = new THREE.Euler();
    this._s = new THREE.Vector3();
    this._p = new THREE.Vector3();
  }

  emit(layer, o) {
    (layer === 'add' ? this.add : this.alpha).add(P(o));
  }
  light(pos, color = 0xffa040, intensity = 60, life = 0.4, range = 30) {
    let best = this.lights[0];
    for (const L of this.lights) if (L.t >= L.life || L.peak * (1 - L.t / L.life) < best.peak * (1 - best.t / best.life)) best = L;
    best.l.position.copy(pos);
    best.l.color.set(color);
    best.l.distance = range;
    best.peak = intensity;
    best.t = 0;
    best.life = life;
  }
  shake(a) {
    this.shakeAmt = Math.min(1.5, this.shakeAmt + a);
  }

  // ---------- presets ----------
  explosion(pos, scale = 1, kind = 'normal') {
    const s = scale;
    const hot = kind === 'freeze' ? 0xbfe6ff : kind === 'purple' ? 0xd28aff : 0xffd27a;
    const mid = kind === 'freeze' ? 0x3a8cff : kind === 'purple' ? 0x7a2ad8 : 0xff6a1a;
    this.emit('add', { pos, size: 3 * s, size1: 9 * s, life: 0.22, color: 0xffffff, color2: hot, frame: F.star, spin: 0 });
    for (let i = 0; i < 16 * s + 6; i++) {
      _v.set(R() - 0.5, R() * 0.8 + 0.1, R() - 0.5).normalize().multiplyScalar((4 + R() * 10) * s);
      this.emit('add', { pos: pos.clone().addScaledVector(_v, 0.06), vel: _v.clone(), size: (1.6 + R() * 1.6) * s, size1: (3.5 + R() * 3) * s, life: 0.5 + R() * 0.5, drag: 3, grav: -2, color: hot, color2: mid, frame: F.fire, fadePow: 1.2 });
    }
    if (kind !== 'freeze') {
      for (let i = 0; i < 12 * s + 4; i++) {
        _v.set(R() - 0.5, R() * 0.6 + 0.3, R() - 0.5).normalize().multiplyScalar((2 + R() * 5) * s);
        this.emit('alpha', { pos: pos.clone(), vel: _v.clone(), size: 2 * s, size1: (6 + R() * 5) * s, life: 1.6 + R() * 1.8, drag: 1.4, grav: -1.6, color: 0x2a2420, color2: 0x8a7a68, alpha: 0.75, frame: R() < 0.5 ? F.smoke : F.smoke2, fadeIn: 0.15, fadePow: 1.1 });
      }
    }
    this.sparks(pos, null, Math.round(20 * s), kind === 'freeze' ? 0xbfe6ff : 0xffc870, 24 * s);
    this.emit('add', { pos: _v.set(pos.x, pos.y - 0.2, pos.z), size: 1 * s, size1: 12 * s, life: 0.35, color: hot, alpha: 0.6, frame: F.ring, spin: 0 });
    this.light(pos, kind === 'freeze' ? 0x7ab8ff : kind === 'purple' ? 0xb050ff : 0xff9a40, 120 * s, 0.45, 26 * s + 8);
    const gy = G.world ? G.world.groundHeight(pos.x, pos.z, pos.y + 1) : 0;
    if (pos.y - gy < 3 && kind !== 'freeze') this.decal(pos.x, gy, pos.z, 3.5 * s);
    if (kind !== 'freeze') this.chunks(pos, Math.round(6 * s), 0x2a2622, 9 * s);
  }
  sparks(pos, normal, n = 10, color = 0xffd890, speed = 14) {
    for (let i = 0; i < n; i++) {
      _v.set(R() - 0.5, R() - 0.2, R() - 0.5).normalize();
      if (normal) _v.addScaledVector(normal, 1.2).normalize();
      _v.multiplyScalar(speed * (0.4 + R() * 0.8));
      this.emit('add', { pos, vel: _v.clone(), size: 0.12, life: 0.25 + R() * 0.35, drag: 1.5, grav: 18, color: 0xffffff, color2: color, frame: F.spark, stretch: 3.2, fadePow: 2 });
    }
  }
  muzzle(pos, dir, color = 0xffe0a0, size = 0.9) {
    this.emit('add', { pos, vel: dir.clone().multiplyScalar(4), size, size1: size * 0.4, life: 0.06, color, frame: F.star, spin: 0 });
  }
  tracer(pos, vel, color = 0xffe6a0) {
    this.emit('add', { pos, vel, size: 0.14, life: 0.06, drag: 0, color, frame: F.spark, stretch: 1.4, fadePow: 4 });
  }
  smokeTrail(pos, dark = false, size = 0.6) {
    this.emit('alpha', { pos, vel: _v.set((R() - 0.5) * 0.6, 0.8, (R() - 0.5) * 0.6).clone(), size, size1: size * 4, life: 1.2 + R() * 0.6, drag: 1, color: dark ? 0x3a3530 : 0x9a9088, color2: 0x8a8278, alpha: 0.55, frame: F.smoke, fadeIn: 0.05 });
  }
  fireTrail(pos, color = 0xffc060, color2 = 0xff4a10, size = 0.7) {
    this.emit('add', { pos, vel: _v.set((R() - 0.5) * 0.8, (R() - 0.5) * 0.8, (R() - 0.5) * 0.8).clone(), size, size1: size * 0.3, life: 0.22, color, color2, frame: F.fire });
  }
  flame(pos, vel, size = 0.8) {
    this.emit('add', { pos, vel, size, size1: size * 4.5, life: 0.5 + R() * 0.2, drag: 2.2, grav: -4, color: 0xfff0b0, color2: 0xff3a08, frame: R() < 0.5 ? F.fire : F.flame, fadePow: 1.4 });
    if (R() < 0.3) this.emit('alpha', { pos: _v.copy(pos).addScaledVector(vel, 0.3).clone(), vel: vel.clone().multiplyScalar(0.4), size: size * 2, size1: size * 6, life: 1, drag: 1.5, grav: -3, color: 0x2a2420, alpha: 0.5, frame: F.smoke2, fadeIn: 0.2 });
  }
  exhaust(pos, dir, color = 0x5a8cff, size = 0.45) {
    this.emit('add', { pos, vel: dir.clone().multiplyScalar(3), size, size1: size * 0.2, life: 0.12, color: 0xffffff, color2: color, frame: F.flame, rot: 0, spin: 0 });
  }
  dust(pos, vel, color = 0x9a8a70, size = 1.0) {
    this.emit('alpha', { pos, vel, size, size1: size * 3.5, life: 1 + R() * 0.6, drag: 2, grav: -0.5, color, alpha: 0.35, frame: F.smoke, fadeIn: 0.1 });
  }
  damageSmoke(pos, frac) {
    // frac 0 healthy .. 1 nearly dead
    if (frac > 0.45 && R() < frac * 0.6) this.emit('alpha', { pos, vel: _v.set((R() - 0.5), 2 + R() * 2, (R() - 0.5)).clone(), size: 0.6, size1: 2.6 + frac * 2, life: 1.4, drag: 0.8, color: frac > 0.75 ? 0x1a1816 : 0x5a5650, alpha: 0.6, frame: F.smoke2, fadeIn: 0.1 });
    if (frac > 0.75 && R() < 0.5) this.fireTrail(pos, 0xffd070, 0xff3a00, 0.5 + R() * 0.4);
  }
  ice(pos, n = 12) {
    for (let i = 0; i < n; i++) {
      _v.set(R() - 0.5, R(), R() - 0.5).normalize().multiplyScalar(2 + R() * 4);
      this.emit('add', { pos, vel: _v.clone(), size: 0.5, size1: 0.1, life: 0.8, drag: 2, grav: 4, color: 0xd8f0ff, color2: 0x4a8aff, frame: F.ice });
    }
  }
  water(pos, dir) {
    for (let i = 0; i < 3; i++) {
      _v.set((R() - 0.5) * 2, 11 + R() * 4, (R() - 0.5) * 2);
      if (dir) _v.addScaledVector(dir, 3);
      this.emit('alpha', { pos, vel: _v.clone(), size: 0.3, size1: 1.4, life: 1.6, drag: 0.3, grav: 16, color: 0xd8e4ec, alpha: 0.6, frame: F.drop });
    }
  }
  shockwave(pos, radius, color = 0xc8e0ff) {
    this.emit('add', { pos, size: 1, size1: radius * 2.2, life: 0.5, color, frame: F.ring, spin: 0, fadePow: 1 });
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      _v.set(Math.cos(a), 0.15, Math.sin(a)).multiplyScalar(radius * 1.8);
      this.emit('alpha', { pos: pos.clone(), vel: _v.clone(), size: 1.5, size1: 4, life: 0.8, drag: 3, color: 0x9a8a70, alpha: 0.4, frame: F.smoke });
    }
  }
  bolt(a, b, color = 0x9ad0ff) {
    const n = 8;
    for (let i = 0; i < n; i++) {
      _v.lerpVectors(a, b, i / n);
      _v.x += (R() - 0.5) * 0.8;
      _v.y += (R() - 0.5) * 0.8;
      _v.z += (R() - 0.5) * 0.8;
      this.emit('add', { pos: _v.clone(), size: 1.4, life: 0.12, color, frame: F.bolt });
    }
  }
  chunks(pos, n, color = 0x2a2622, speed = 9) {
    for (let i = 0; i < n; i++) {
      if (this.debris.length >= 400) this.debris.shift();
      _v.set(R() - 0.5, R() * 0.9 + 0.3, R() - 0.5).normalize().multiplyScalar(speed * (0.4 + R() * 0.8));
      this.debris.push({
        p: pos.clone(), v: _v.clone(), r: new THREE.Euler(R() * 6, R() * 6, R() * 6), w: new THREE.Vector3((R() - 0.5) * 14, (R() - 0.5) * 14, (R() - 0.5) * 14),
        s: new THREE.Vector3(0.2 + R() * 0.5, 0.06 + R() * 0.15, 0.2 + R() * 0.5), t: 0, life: 6 + R() * 4, c: new THREE.Color(color).multiplyScalar(0.7 + R() * 0.6), fire: R() < 0.3 ? 1.2 : 0,
      });
    }
  }
  decal(x, y, z, size) {
    if (this.decals.length >= 120) this.decals.shift();
    this.decals.push({ x, y: y + 0.03, z, s: size * (0.8 + R() * 0.5), r: R() * 6, t: 0 });
  }

  update(dt) {
    this.add.update(dt);
    this.alpha.update(dt);
    for (const L of this.lights) {
      L.t += dt;
      L.l.intensity = L.t < L.life ? L.peak * Math.pow(1 - L.t / L.life, 2) : 0;
    }
    // debris
    const dm = this.debrisMesh;
    let n = 0;
    const keep = [];
    for (const d of this.debris) {
      d.t += dt;
      if (d.t > d.life) continue;
      d.v.y -= 22 * dt;
      d.p.addScaledVector(d.v, dt);
      const gy = G.world ? G.world.groundHeight(d.p.x, d.p.z, d.p.y + 0.5) : 0;
      if (d.p.y < gy + 0.05) {
        d.p.y = gy + 0.05;
        d.v.y *= -0.35;
        d.v.x *= 0.6;
        d.v.z *= 0.6;
        d.w.multiplyScalar(0.6);
      }
      d.r.x += d.w.x * dt;
      d.r.y += d.w.y * dt;
      d.r.z += d.w.z * dt;
      if (d.fire > 0) {
        d.fire -= dt;
        if (R() < 0.5) this.fireTrail(d.p, 0xffc060, 0xff4a10, 0.35);
      }
      this._q.setFromEuler(d.r);
      const shrink = d.t > d.life - 1 ? d.life - d.t : 1;
      this._s.copy(d.s).multiplyScalar(shrink);
      this._m.compose(d.p, this._q, this._s);
      dm.setMatrixAt(n, this._m);
      dm.setColorAt(n, d.c);
      n++;
      keep.push(d);
    }
    this.debris = keep;
    dm.count = n;
    dm.instanceMatrix.needsUpdate = true;
    if (dm.instanceColor) dm.instanceColor.needsUpdate = true;
    // decals fade very slowly
    const de = this.decalMesh;
    let k = 0;
    for (const d of this.decals) {
      d.t += dt;
      this._e.set(0, d.r, 0);
      this._q.setFromEuler(this._e);
      this._s.set(d.s, 1, d.s);
      this._m.compose(this._p.set(d.x, d.y, d.z), this._q, this._s);
      de.setMatrixAt(k++, this._m);
    }
    de.count = k;
    de.instanceMatrix.needsUpdate = true;
    this.shakeAmt = Math.max(0, this.shakeAmt - dt * 1.8);
  }
}
void clamp;
