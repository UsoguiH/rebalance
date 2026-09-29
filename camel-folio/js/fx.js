import * as THREE from 'three';
import { dotTexture, hoofTexture } from './textures.js';

// Soft particles with per-particle size, alpha and colour.
class Particles {
  constructor(scene, count, { additive = false } = {}) {
    this.count = count;
    this.pos = new Float32Array(count * 3);
    this.vel = new Float32Array(count * 3);
    this.life = new Float32Array(count);
    this.maxLife = new Float32Array(count).fill(1);
    this.size = new Float32Array(count);
    this.alpha = new Float32Array(count);
    this.color = new Float32Array(count * 3);
    this.grow = new Float32Array(count);
    this.gravity = new Float32Array(count);
    this.cursor = 0;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1));
    geo.setAttribute('aColor', new THREE.BufferAttribute(this.color, 3));
    this.geo = geo;
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      uniforms: { map: { value: dotTexture() }, scale: { value: 300 } },
      vertexShader: `attribute float aSize; attribute float aAlpha; attribute vec3 aColor; uniform float scale;
        varying float vA; varying vec3 vC;
        void main(){ vA = aAlpha; vC = aColor; vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * scale / -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform sampler2D map; varying float vA; varying vec3 vC;
        void main(){ vec4 t = texture2D(map, gl_PointCoord); if (t.a * vA < 0.01) discard; gl_FragColor = vec4(vC, t.a * vA); }`,
    });
    this.material = mat;
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
  }

  spawn(x, y, z, vx, vy, vz, { life = 1, size = 1, color = [0.9, 0.78, 0.6], grow = 1, gravity = 0 } = {}) {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % this.count;
    this.pos.set([x, y, z], i * 3);
    this.vel.set([vx, vy, vz], i * 3);
    this.life[i] = life;
    this.maxLife[i] = life;
    this.size[i] = size;
    this.color.set(color, i * 3);
    this.grow[i] = grow;
    this.gravity[i] = gravity;
  }

  update(dt) {
    for (let i = 0; i < this.count; i++) {
      if (this.life[i] <= 0) { this.alpha[i] = 0; continue; }
      this.life[i] -= dt;
      const k = Math.max(0, this.life[i] / this.maxLife[i]);
      const j = i * 3;
      this.vel[j + 1] -= this.gravity[i] * dt;
      this.pos[j] += this.vel[j] * dt;
      this.pos[j + 1] += this.vel[j + 1] * dt;
      this.pos[j + 2] += this.vel[j + 2] * dt;
      this.vel[j] *= 0.96; this.vel[j + 2] *= 0.96;
      this.size[i] += this.grow[i] * dt;
      this.alpha[i] = Math.min(1, k * 1.6) * 0.55;
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.aSize.needsUpdate = true;
    this.geo.attributes.aAlpha.needsUpdate = true;
    this.geo.attributes.aColor.needsUpdate = true;
  }
}

export class FX {
  constructor(scene, { mobile = false } = {}) {
    this.dust = new Particles(scene, mobile ? 120 : 220);
    this.confetti = new Particles(scene, 160);

    // Footprints: a ring buffer of instanced decals that fade by shrinking.
    this.maxPrints = mobile ? 120 : 220;
    const geo = new THREE.PlaneGeometry(0.55, 0.55);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
      map: hoofTexture(), transparent: true, opacity: 0.35, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -4,
    });
    this.prints = new THREE.InstancedMesh(geo, mat, this.maxPrints);
    this.prints.frustumCulled = false;
    this.printData = [];
    const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < this.maxPrints; i++) {
      this.prints.setMatrixAt(i, zero);
      this.printData.push({ age: 1e9, x: 0, z: 0, rot: 0 });
    }
    this.printCursor = 0;
    scene.add(this.prints);
    this.m = new THREE.Matrix4();
    this.q = new THREE.Quaternion();
    this.s = new THREE.Vector3();
    this.p = new THREE.Vector3();
    this.yAxis = new THREE.Vector3(0, 1, 0);
  }

  footprint(x, y, z, heading) {
    const d = this.printData[this.printCursor];
    this.printCursor = (this.printCursor + 1) % this.maxPrints;
    Object.assign(d, { age: 0, x, y, z, rot: heading });
  }

  kick(pos, fwd, strength) {
    const n = Math.round(2 + strength * 4);
    for (let i = 0; i < n; i++) {
      this.dust.spawn(
        pos.x + (Math.random() - 0.5) * 0.4, 0.15, pos.z + (Math.random() - 0.5) * 0.4,
        -fwd.x * strength * 1.5 + (Math.random() - 0.5) * 1.5, 0.6 + Math.random() * 1.2 * strength, -fwd.z * strength * 1.5 + (Math.random() - 0.5) * 1.5,
        { life: 0.8 + Math.random() * 0.6, size: 0.6 + strength * 0.6, grow: 1.4 },
      );
    }
  }

  landing(pos) {
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      this.dust.spawn(pos.x + Math.cos(a) * 1.1, 0.2, pos.z + Math.sin(a) * 1.1, Math.cos(a) * 4, 0.8 + Math.random(), Math.sin(a) * 4, { life: 1.1, size: 1.0, grow: 2 });
    }
  }

  splash(pos) {
    for (let i = 0; i < 8; i++) {
      this.dust.spawn(pos.x, 0.2, pos.z, (Math.random() - 0.5) * 3, 2.5 + Math.random() * 2.5, (Math.random() - 0.5) * 3, { life: 0.6, size: 0.35, grow: 0.2, gravity: 14, color: [0.75, 0.93, 0.95] });
    }
  }

  celebrate(pos) {
    const cols = [[0.71, 0.28, 0.23], [0.95, 0.76, 0.31], [0.18, 0.44, 0.45], [0.96, 0.89, 0.76]];
    for (let i = 0; i < 120; i++) {
      this.confetti.spawn(
        pos.x + (Math.random() - 0.5) * 3, 0.5, pos.z + (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 9, 8 + Math.random() * 8, (Math.random() - 0.5) * 9,
        { life: 2.4, size: 0.5, grow: 0, gravity: 12, color: cols[i % 4] },
      );
    }
  }

  update(dt) {
    this.dust.update(dt);
    this.confetti.update(dt);
    const LIFE = 30;
    for (let i = 0; i < this.maxPrints; i++) {
      const d = this.printData[i];
      if (d.age > LIFE + 1) continue;
      d.age += dt;
      const k = Math.max(0, 1 - d.age / LIFE);
      this.q.setFromAxisAngle(this.yAxis, d.rot);
      this.s.setScalar(k > 0 ? 0.5 + k * 0.5 : 0);
      this.p.set(d.x, (d.y || 0) + 0.035, d.z);
      this.m.compose(this.p, this.q, this.s);
      this.prints.setMatrixAt(i, this.m);
    }
    this.prints.instanceMatrix.needsUpdate = true;
  }
}
