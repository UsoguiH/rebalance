// Visual effects: blood spray and ground splats, hit stars, cartoon smoke puffs,
// weapon trails, floating numbers, fire, ice, heal beams, splashes and screen shake.
import * as THREE from 'three';
import { bloodTex, puffTex, sparkTex, glowTex, flameTex } from './tex.js';
import { rng, TAU, clamp, lerp } from './util.js';
import { groundY } from './nav.js';

const R = rng(99);
const tmpV = new THREE.Vector3();

export class FX {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.parts = [];
    this.decals = [];
    this.trails = [];
    this.beams = [];
    this.texts = [];
    this.shake = 0;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.bloodTex = [0, 1, 2, 3].map((i) => bloodTex(i));
    this.dropGeo = new THREE.IcosahedronGeometry(0.09, 0);
    this.dropMat = new THREE.MeshBasicMaterial({ color: 0xd8141c });
    this.chunkGeo = new THREE.DodecahedronGeometry(0.11, 0);
    this.chunkMat = new THREE.MeshToonMaterial({ color: 0xb8101a });
    this.decalGeo = new THREE.PlaneGeometry(1, 1);
    this.decalGeo.rotateX(-Math.PI / 2);
    this.spriteMats = {};
    this.dropMesh = new THREE.InstancedMesh(this.dropGeo, this.dropMat, 600);
    this.dropMesh.count = 0;
    this.dropMesh.frustumCulled = false;
    this.group.add(this.dropMesh);
    this.drops = [];
  }

  spriteMat(tex, color, blending = THREE.NormalBlending) {
    const key = tex.uuid + color + blending;
    if (!this.spriteMats[key]) this.spriteMats[key] = new THREE.SpriteMaterial({ map: tex, color, transparent: true, depthWrite: false, blending });
    return this.spriteMats[key].clone();
  }

  // ---------------------------------------------------------------- blood
  blood(x, y, z, dirX = 0, dirZ = 0, amount = 1) {
    const n = Math.round(14 * amount);
    for (let i = 0; i < n && this.drops.length < 600; i++) {
      const sp = 2 + R() * 5;
      const a = Math.atan2(dirZ, dirX) + (R() - 0.5) * 2.2;
      const k = dirX || dirZ ? 1 : 0;
      this.drops.push({
        x, y, z,
        vx: Math.cos(a) * sp * (k ? 1 : R() - 0.5) * 1.2,
        vy: 2 + R() * 4.5,
        vz: Math.sin(a) * sp * (k ? 1 : R() - 0.5) * 1.2,
        s: 0.6 + R() * 1.0,
        life: 2,
      });
    }
    if (amount > 0.3) this.splat(x + dirX * 0.6, z + dirZ * 0.6, 0.7 + amount * 0.9);
  }
  splat(x, z, size = 1.2, ttl = 70) {
    const gy = groundY(x, z);
    if (gy < -5) return;
    const mat = new THREE.MeshBasicMaterial({ map: this.bloodTex[Math.floor(R() * 4)], color: 0xc5121b, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 - this.decals.length * 0.001 });
    const d = new THREE.Mesh(this.decalGeo, mat);
    d.position.set(x, gy + 0.02 + (this.decals.length % 10) * 0.002, z);
    d.rotation.y = R() * TAU;
    d.scale.setScalar(0.01);
    d.renderOrder = 1;
    this.group.add(d);
    this.decals.push({ mesh: d, size, t: 0, ttl });
    if (this.decals.length > 220) {
      const old = this.decals.shift();
      this.group.remove(old.mesh);
      old.mesh.material.dispose();
    }
  }
  gibs(x, y, z, n = 6) {
    for (let i = 0; i < n; i++) {
      const mesh = new THREE.Mesh(this.chunkGeo, this.chunkMat);
      mesh.position.set(x, y, z);
      this.group.add(mesh);
      const a = R() * TAU, sp = 2 + R() * 4;
      this.parts.push({ mesh, vx: Math.cos(a) * sp, vy: 4 + R() * 4, vz: Math.sin(a) * sp, life: 2.5, kind: 'gib', spin: R() * 10 });
    }
  }

  // ---------------------------------------------------------------- sprites
  sprite(tex, color, x, y, z, size, life, opts = {}) {
    const s = new THREE.Sprite(this.spriteMat(tex, color, opts.add ? THREE.AdditiveBlending : THREE.NormalBlending));
    s.position.set(x, y, z);
    s.scale.setScalar(size);
    s.renderOrder = 5;
    s.material.rotation = opts.rot ?? R() * TAU;
    this.group.add(s);
    const p = { mesh: s, life, max: life, size, grow: opts.grow ?? 1, vx: opts.vx || 0, vy: opts.vy || 0, vz: opts.vz || 0, kind: 'sprite', fade: opts.fade ?? 1, spin: opts.spin || 0, g: opts.g || 0 };
    this.parts.push(p);
    return p;
  }
  hitStar(x, y, z, color = 0xffe24a, size = 1.1) {
    this.sprite(sparkTex(), color, x, y, z, size, 0.18, { grow: 1.6 });
    this.sprite(sparkTex(), 0xffffff, x, y, z, size * 0.55, 0.14, { grow: 1.4 });
  }
  puff(x, y, z, n = 3, size = 1.0, color = 0xffffff) {
    for (let i = 0; i < n; i++) {
      const a = R() * TAU;
      this.sprite(puffTex(), color, x + Math.cos(a) * 0.4, y + R() * 0.4, z + Math.sin(a) * 0.4, size * (0.6 + R() * 0.5), 0.6 + R() * 0.4, { grow: 1.7, vx: Math.cos(a) * 1.2, vy: 0.8 + R() * 0.6, vz: Math.sin(a) * 1.2, spin: (R() - 0.5) * 3 });
    }
  }
  dust(x, z, n = 2) {
    const y = groundY(x, z);
    for (let i = 0; i < n; i++) this.sprite(puffTex(), 0xf0e6d0, x + (R() - 0.5) * 0.4, y + 0.15, z + (R() - 0.5) * 0.4, 0.35 + R() * 0.2, 0.4, { grow: 1.8, vy: 0.5 });
  }
  splash(x, z, big = false) {
    const y = groundY(x, z);
    for (let i = 0; i < (big ? 10 : 4); i++) {
      const a = R() * TAU;
      this.sprite(glowTex(), 0xffffff, x, y + 0.1, z, 0.25 + R() * 0.2, 0.6, { vx: Math.cos(a) * 2, vy: 3 + R() * 3, vz: Math.sin(a) * 2, g: 12 });
    }
    this.ring(x, y + 0.05, z, 0xffffff, big ? 2.2 : 1.2, 0.6);
  }
  ring(x, y, z, color, radius, life, opts = {}) {
    const geo = new THREE.RingGeometry(0.85, 1, 40);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: opts.add ? THREE.AdditiveBlending : THREE.NormalBlending });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.scale.setScalar(radius * 0.2);
    mesh.renderOrder = 4;
    this.group.add(mesh);
    this.parts.push({ mesh, life, max: life, kind: 'ring', radius, disposeGeo: true });
  }
  fire(x, y, z, size = 0.6) {
    const c = R() < 0.5 ? 0xff8a1a : 0xffc93a;
    this.sprite(flameTex(), c, x + (R() - 0.5) * 0.3, y, z + (R() - 0.5) * 0.3, size, 0.45, { vy: 1.8, grow: 0.4, rot: 0 });
  }
  ice(x, y, z, size = 0.4) {
    this.sprite(sparkTex(), 0xbff0ff, x + (R() - 0.5) * 0.6, y, z + (R() - 0.5) * 0.6, size, 0.5, { vy: 0.6, grow: 0.5 });
  }
  sparkle(x, y, z, color = 0xfff6a0, n = 1) {
    for (let i = 0; i < n; i++) this.sprite(sparkTex(), color, x + (R() - 0.5) * 0.8, y + R() * 0.6, z + (R() - 0.5) * 0.8, 0.25 + R() * 0.2, 0.6, { vy: 0.8, grow: 0.3, add: true });
  }
  explosion(x, y, z, radius = 2.5) {
    this.sprite(glowTex(), 0xffd040, x, y + 0.5, z, radius * 2.2, 0.35, { grow: 1.6, add: true });
    this.sprite(sparkTex(), 0xffffff, x, y + 0.6, z, radius * 1.4, 0.2, { grow: 1.8 });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      this.sprite(puffTex(), i % 2 ? 0x9a9a9a : 0x6a6a6a, x + Math.cos(a) * 0.5, y + 0.4, z + Math.sin(a) * 0.5, 1.2 + R() * 0.6, 0.9, { vx: Math.cos(a) * 4, vy: 2 + R() * 2, vz: Math.sin(a) * 4, grow: 1.6, spin: 2 });
    }
    for (let i = 0; i < 6; i++) this.fire(x + (R() - 0.5) * radius, y + 0.3, z + (R() - 0.5) * radius, 1.0);
    this.ring(x, groundY(x, z) + 0.06, z, 0xffe0a0, radius * 1.3, 0.4);
    this.splatScorch(x, z, radius);
    this.addShake(0.6);
  }
  splatScorch(x, z, r) {
    const gy = groundY(x, z);
    if (gy < -5) return;
    const mat = new THREE.MeshBasicMaterial({ map: this.bloodTex[1], color: 0x2a2018, transparent: true, opacity: 0.7, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    const d = new THREE.Mesh(this.decalGeo, mat);
    d.position.set(x, gy + 0.02, z);
    d.scale.setScalar(r * 1.6);
    this.group.add(d);
    this.decals.push({ mesh: d, size: r * 1.6, t: 1, ttl: 30 });
  }

  // ---------------------------------------------------------------- melee trail
  // An arc ribbon around (x,z) from angle a0 to a1 at radius r.
  slash(x, y, z, a0, a1, r = 1.5, color = 0xffffff, width = 0.45) {
    const seg = 14;
    const pos = new Float32Array((seg + 1) * 2 * 3);
    const alpha = new Float32Array((seg + 1) * 2);
    for (let i = 0; i <= seg; i++) {
      const t = i / seg;
      const a = lerp(a0, a1, t);
      const ri = r - width * t, ro = r + 0.05;
      pos.set([x + Math.sin(a) * ri, y, z + Math.cos(a) * ri, x + Math.sin(a) * ro, y + 0.02, z + Math.cos(a) * ro], i * 6);
      alpha[i * 2] = alpha[i * 2 + 1] = t;
    }
    const idx = [];
    for (let i = 0; i < seg; i++) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('alpha', new THREE.BufferAttribute(alpha, 1));
    geo.setIndex(idx);
    const mat = new THREE.ShaderMaterial({
      uniforms: { color: { value: new THREE.Color(color) }, life: { value: 1 } },
      vertexShader: 'attribute float alpha; varying float vA; void main(){ vA = alpha; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 color; uniform float life; varying float vA; void main(){ float a = smoothstep(0.0, 1.0, vA) * life; gl_FragColor = vec4(color, a * 0.9); }',
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = 6;
    this.group.add(mesh);
    this.parts.push({ mesh, life: 0.22, max: 0.22, kind: 'trail', disposeGeo: true });
  }

  // straight streak (arrows, bullets)
  streak(x0, y0, z0, x1, y1, z1, color = 0xffffff, life = 0.25, width = 0.08) {
    const dir = tmpV.set(x1 - x0, y1 - y0, z1 - z0);
    const len = dir.length();
    const geo = new THREE.PlaneGeometry(len, width);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false, opacity: 0.9 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    mesh.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
    mesh.renderOrder = 6;
    this.group.add(mesh);
    this.parts.push({ mesh, life, max: life, kind: 'fade', disposeGeo: true });
  }

  // ---------------------------------------------------------------- beams
  beam(key, x0, y0, z0, x1, y1, z1, color) {
    let b = this.beams.find((q) => q.key === key);
    if (!b) {
      const geo = new THREE.CylinderGeometry(0.07, 0.07, 1, 6, 1, true);
      geo.rotateX(Math.PI / 2);
      geo.translate(0, 0, 0.5);
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false });
      const core = new THREE.Mesh(geo, mat);
      this.group.add(core);
      b = { key, mesh: core, alive: 0 };
      this.beams.push(b);
    }
    b.alive = 0.12;
    const m = b.mesh;
    m.position.set(x0, y0, z0);
    m.lookAt(x1, y1, z1);
    m.scale.set(1 + Math.sin(performance.now() * 0.03) * 0.4, 1, Math.hypot(x1 - x0, y1 - y0, z1 - z0));
    if (R() < 0.5) this.sparkle(lerp(x0, x1, R()), lerp(y0, y1, R()), lerp(z0, z1, R()), color, 1);
  }

  // ---------------------------------------------------------------- floating text
  text(x, y, z, str, color = '#7dff6a', size = 0.9) {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 128;
    const g = c.getContext('2d');
    g.font = '96px "Luckiest Guy", "Lilita One", sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineWidth = 16;
    g.strokeStyle = '#2a1206';
    g.lineJoin = 'round';
    g.strokeText(str, 128, 70);
    g.fillStyle = color;
    g.fillText(str, 128, 70);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false }));
    s.position.set(x, y, z);
    s.scale.set(size * 2, size, 1);
    s.renderOrder = 20;
    this.group.add(s);
    this.parts.push({ mesh: s, life: 1.1, max: 1.1, kind: 'text', vy: 1.5, base: size, tex });
  }

  addShake(a) {
    this.shake = Math.min(1.2, this.shake + a);
  }

  // ---------------------------------------------------------------- update
  update(dt) {
    // blood droplets (instanced)
    const dm = this.dropMesh, mtx = new THREE.Matrix4();
    let n = 0;
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i];
      d.vy -= 22 * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.z += d.vz * dt;
      d.life -= dt;
      const gy = groundY(d.x, d.z);
      if (d.y <= gy + 0.02 || d.life <= 0) {
        if (gy > -5 && R() < 0.35) this.splat(d.x, d.z, 0.25 + R() * 0.35, 40);
        this.drops.splice(i, 1);
        continue;
      }
    }
    for (const d of this.drops) {
      mtx.makeScale(d.s, d.s * 1.6, d.s);
      mtx.setPosition(d.x, d.y, d.z);
      dm.setMatrixAt(n++, mtx);
    }
    dm.count = n;
    dm.instanceMatrix.needsUpdate = true;

    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.life -= dt;
      const k = clamp(p.life / (p.max || 1), 0, 1);
      const m = p.mesh;
      if (p.kind === 'gib') {
        p.vy -= 22 * dt;
        m.position.x += p.vx * dt;
        m.position.y += p.vy * dt;
        m.position.z += p.vz * dt;
        m.rotation.x += p.spin * dt;
        const gy = groundY(m.position.x, m.position.z);
        if (m.position.y < gy + 0.08) {
          m.position.y = gy + 0.08;
          if (Math.abs(p.vy) > 2 && R() < 0.5) this.splat(m.position.x, m.position.z, 0.4, 40);
          p.vy *= -0.3;
          p.vx *= 0.6;
          p.vz *= 0.6;
          p.spin *= 0.5;
        }
        if (p.life < 0.4) m.scale.setScalar(p.life / 0.4);
      } else if (p.kind === 'sprite') {
        p.vy -= p.g * dt;
        m.position.x += p.vx * dt;
        m.position.y += p.vy * dt;
        m.position.z += p.vz * dt;
        p.vx *= 0.94;
        p.vz *= 0.94;
        const s = p.size * (1 + (1 - k) * (p.grow - 1));
        m.scale.setScalar(s);
        m.material.opacity = p.fade ? Math.min(1, k * 2.5) : 1;
        m.material.rotation += p.spin * dt;
      } else if (p.kind === 'ring') {
        m.scale.setScalar(p.radius * (0.2 + (1 - k) * 0.8));
        m.material.opacity = k;
      } else if (p.kind === 'trail') {
        m.material.uniforms.life.value = k;
      } else if (p.kind === 'fade') {
        m.material.opacity = k * 0.9;
      } else if (p.kind === 'text') {
        m.position.y += p.vy * dt;
        p.vy *= 0.96;
        const pop = p.life > p.max - 0.15 ? 1 + (p.life - (p.max - 0.15)) * 4 : 1;
        m.scale.set(p.base * 2 * pop, p.base * pop, 1);
        m.material.opacity = Math.min(1, k * 3);
      }
      if (p.life <= 0) {
        this.group.remove(m);
        if (p.disposeGeo) m.geometry.dispose();
        if (m.material && m.material !== this.chunkMat) m.material.dispose();
        if (p.tex) p.tex.dispose();
        this.parts.splice(i, 1);
      }
    }
    // splats grow in, then slowly fade
    for (let i = this.decals.length - 1; i >= 0; i--) {
      const d = this.decals[i];
      d.t += dt;
      const grow = Math.min(1, d.t * 8);
      d.mesh.scale.setScalar(d.size * (0.3 + 0.7 * (1 - Math.pow(1 - grow, 3))));
      if (d.t > d.ttl) {
        d.mesh.material.opacity = Math.max(0, 1 - (d.t - d.ttl) / 4);
        if (d.t > d.ttl + 4) {
          this.group.remove(d.mesh);
          d.mesh.material.dispose();
          this.decals.splice(i, 1);
        }
      }
    }
    for (let i = this.beams.length - 1; i >= 0; i--) {
      const b = this.beams[i];
      b.alive -= dt;
      if (b.alive <= 0) {
        this.group.remove(b.mesh);
        b.mesh.geometry.dispose();
        b.mesh.material.dispose();
        this.beams.splice(i, 1);
      }
    }
    this.shake = Math.max(0, this.shake - dt * 2.5);
  }
}
