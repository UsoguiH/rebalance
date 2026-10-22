// Pedestrians: instanced townsfolk walking the sidewalk loops around each block. They
// panic and run when cars come close, and get flung (with a red splat) when hit.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/BufferGeometryUtils.js';
import { rng, R, G, clamp } from './core.js';
import { BLOCKS, CURB, SIDEWALK } from './world.js';

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(1, 1, 1), _p = new THREE.Vector3();

function part(geo, color, x, y, z) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  g.translate(x, y, z);
  const c = new THREE.Color(color);
  const n = g.attributes.position.count;
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    col[i * 3] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.deleteAttribute('uv');
  return g;
}
// white shirt parts are tinted per instance; skin, hair and trousers keep their color
function personGeo() {
  return mergeGeometries([
    part(new THREE.BoxGeometry(0.42, 0.55, 0.24), '#ffffff', 0, 1.18, 0),
    part(new THREE.BoxGeometry(0.15, 0.82, 0.18), '#2a2c3a', -0.11, 0.45, 0),
    part(new THREE.BoxGeometry(0.15, 0.82, 0.18), '#2a2c3a', 0.11, 0.45, 0),
    part(new THREE.BoxGeometry(0.11, 0.55, 0.12), '#ffffff', -0.28, 1.18, 0),
    part(new THREE.BoxGeometry(0.11, 0.55, 0.12), '#ffffff', 0.28, 1.18, 0),
    part(new THREE.SphereGeometry(0.13, 8, 6), '#d8a888', 0, 1.62, 0),
    part(new THREE.SphereGeometry(0.135, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), '#3a2a1e', 0, 1.65, -0.01),
  ]);
}

export class Peds {
  constructor(world, scene, fx) {
    this.world = world;
    this.fx = fx;
    const r = rng(99);
    const blocks = BLOCKS.filter((b) => b.id !== 'court');
    const N = 46;
    this.list = [];
    for (let i = 0; i < N; i++) {
      const b = blocks[i % blocks.length];
      this.list.push(this.make(b, r));
    }
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 });
    this.mesh = new THREE.InstancedMesh(personGeo(), mat, N);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.castShadow = true;
    this.mesh.frustumCulled = false;
    const shirts = ['#b8342a', '#3a5a8a', '#d8d0b8', '#4a6a3a', '#c8a03a', '#6a3a6a', '#2a2a2a', '#a86a3a'];
    this.list.forEach((p, i) => this.mesh.setColorAt(i, new THREE.Color(r.pick(shirts))));
    scene.add(this.mesh);
    this.onSplat = null;
  }
  make(b, r) {
    // walk the sidewalk ring of a block (rectangle inset by half a sidewalk)
    const o = SIDEWALK * 0.55;
    const ring = [
      [b.x0 + o, b.z0 + o],
      [b.x1 - o, b.z0 + o],
      [b.x1 - o, b.z1 - o],
      [b.x0 + o, b.z1 - o],
    ];
    const seg = Math.floor(r() * 4);
    const t = r();
    const a = ring[seg], c = ring[(seg + 1) % 4];
    return {
      ring, seg, dir: r() < 0.5 ? 1 : -1,
      pos: new THREE.Vector3(a[0] + (c[0] - a[0]) * t, CURB, a[1] + (c[1] - a[1]) * t),
      vel: new THREE.Vector3(), yaw: 0, state: 'walk', t: r() * 10, speed: 1.1 + r() * 0.5,
      fling: null, dead: 0, block: b,
    };
  }
  update(dt) {
    const cars = G.cars;
    this.list.forEach((p, i) => {
      p.t += dt;
      if (p.state === 'dead') {
        // tumble, land, lie there for a while, then a new pedestrian appears elsewhere
        p.dead += dt;
        p.vel.y -= 22 * dt;
        p.pos.addScaledVector(p.vel, dt);
        const gy = this.world.groundHeight(p.pos.x, p.pos.z, p.pos.y + 0.5);
        if (p.pos.y < gy) {
          p.pos.y = gy;
          if (p.vel.y < -3 && !p.landed) {
            p.landed = true;
            this.fx.decal(p.pos.x, gy, p.pos.z, 1.6, 'blood');
          }
          p.vel.multiplyScalar(0.5);
          p.vel.y = 0;
          p.spin.multiplyScalar(0.5);
        }
        p.rx += p.spin.x * dt;
        p.rz += p.spin.z * dt;
        if (p.pos.y <= gy + 0.01) {
          p.rx += (Math.PI / 2 - p.rx) * Math.min(1, dt * 6);
          p.rz *= Math.exp(-dt * 6);
        }
        if (p.dead > 25) Object.assign(p, this.make(p.block, R));
        this.write(i, p, p.rx, p.rz, 0);
        return;
      }
      // threat check: nearest car coming at us
      let flee = null, fd = 1e9;
      for (const c of cars) {
        if (!c.alive) continue;
        const dx = p.pos.x - c.pos.x, dz = p.pos.z - c.pos.z;
        const d = Math.hypot(dx, dz);
        if (d < c.radius + 0.45 && c.speed > 3 && Math.abs(c.pos.y - p.pos.y) < 2) {
          this.hit(p, c);
          return;
        }
        if (d < 16 && d < fd && c.speed > 4) {
          fd = d;
          flee = c;
        }
      }
      if (flee) {
        p.state = 'run';
        const dx = p.pos.x - flee.pos.x, dz = p.pos.z - flee.pos.z;
        const l = Math.hypot(dx, dz) || 1;
        // run sideways out of the car's path
        const side = flee.right.x * dx + flee.right.z * dz > 0 ? 1 : -1;
        const tx = dx / l * 0.6 + flee.right.x * side * 0.8, tz = dz / l * 0.6 + flee.right.z * side * 0.8;
        p.vel.set(tx, 0, tz).normalize().multiplyScalar(4.2);
      } else {
        p.state = 'walk';
        const a = p.ring[p.seg], b = p.ring[(p.seg + (p.dir > 0 ? 1 : 3)) % 4];
        const dx = b[0] - p.pos.x, dz = b[1] - p.pos.z;
        const l = Math.hypot(dx, dz);
        if (l < 0.5) p.seg = (p.seg + (p.dir > 0 ? 1 : 3)) % 4;
        else p.vel.set(dx / l, 0, dz / l).multiplyScalar(p.speed);
        void a;
      }
      p.pos.x += p.vel.x * dt;
      p.pos.z += p.vel.z * dt;
      // stay out of buildings
      const solid = this.world.pointSolid(p.pos.x, 1, p.pos.z);
      if (solid) {
        p.pos.x -= p.vel.x * dt * 2;
        p.pos.z -= p.vel.z * dt * 2;
      }
      p.pos.y = this.world.groundHeight(p.pos.x, p.pos.z, p.pos.y + 1);
      p.yaw = Math.atan2(p.vel.x, p.vel.z);
      const run = p.state === 'run';
      const bob = Math.abs(Math.sin(p.t * (run ? 13 : 7))) * (run ? 0.09 : 0.04);
      this.write(i, p, run ? 0.25 : 0.04, Math.sin(p.t * (run ? 13 : 7)) * 0.06, bob);
    });
    this.mesh.instanceMatrix.needsUpdate = true;
  }
  write(i, p, rx, rz, bob) {
    _e.set(rx, p.yaw, rz, 'YXZ');
    _q.setFromEuler(_e);
    _m.compose(_p.set(p.pos.x, p.pos.y + bob, p.pos.z), _q, _s);
    this.mesh.setMatrixAt(i, _m);
  }
  hit(p, car) {
    p.state = 'dead';
    p.dead = 0;
    p.landed = false;
    p.vel.set(car.vel.x * 0.8 + (R() - 0.5) * 3, 5 + car.speed * 0.25, car.vel.z * 0.8 + (R() - 0.5) * 3);
    p.spin = new THREE.Vector3((R() - 0.5) * 14, 0, (R() - 0.5) * 14);
    p.rx = 0;
    p.rz = 0;
    const at = p.pos.clone().setY(p.pos.y + 1);
    for (let i = 0; i < 18; i++) {
      _p.set(R() - 0.5, R() * 0.8 + 0.2, R() - 0.5).normalize().multiplyScalar(3 + R() * 6).addScaledVector(car.vel, 0.3);
      this.fx.emit('alpha', { pos: at, vel: _p.clone(), size: 0.25, size1: 0.1, life: 0.9, grav: 18, color: 0x8a0a06, color2: 0x4a0402, frame: 7, alpha: 0.95 });
    }
    if (this.onSplat) this.onSplat(p, car, clamp(car.speed / 25, 0.3, 1));
  }
}
