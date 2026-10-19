// Pickups: cake slices, logs, ore, hats, bombs and chicken potions. Items can lie on
// the ground (bobbing and glinting), be carried overhead, or fly through the air.
import * as THREE from 'three';
import { cakeModel, logModel, oreChunkModel } from './props.js';
import { hatModel, weapon } from './chars.js';
import { m, ink, shadowed } from './toon.js';
import { groundY, canStand } from './nav.js';
import { TEAM_COLORS } from './castle.js';
import { rng, TAU, dist2 } from './util.js';

const R = rng(7);
let nextId = 1;

function bombModel(big) {
  const g = new THREE.Group();
  const w = weapon('bomb');
  w.scale.setScalar(big ? 2.2 : 1.2);
  g.add(w);
  ink(g, 0.035);
  shadowed(g, true, false);
  return g;
}
function potionModel() {
  const g = new THREE.Group();
  g.add(m(new THREE.SphereGeometry(0.28, 12, 10), '#d68cff', 0, 0.28, 0, { emissive: '#7a2aa0', emissiveIntensity: 0.3 }));
  g.add(m(new THREE.CylinderGeometry(0.09, 0.11, 0.22, 8), '#d68cff', 0, 0.6, 0));
  g.add(m(new THREE.CylinderGeometry(0.11, 0.11, 0.1, 8), '#8a4a1c', 0, 0.74, 0));
  ink(g, 0.03);
  shadowed(g, true, false);
  return g;
}

export class Item {
  constructor(type, x, z, opts = {}) {
    this.id = nextId++;
    this.type = type; // cake | log | ore | hat | bomb | bigbomb | potion
    this.cls = opts.cls;
    this.team = opts.team ?? 0;
    this.upgraded = !!opts.upgraded;
    this.x = x;
    this.z = z;
    this.y = groundY(x, z);
    this.vx = this.vy = this.vz = 0;
    this.airborne = false;
    this.holder = null;
    this.alive = true;
    this.spawner = opts.spawner || null;
    this.age = 0;
    this.fuse = -1;
    this.thrower = null;
    this.ttl = opts.ttl ?? Infinity;
    this.model = this.makeModel();
    this.phase = R() * TAU;
  }
  makeModel() {
    switch (this.type) {
      case 'cake': return cakeModel();
      case 'log': return logModel();
      case 'ore': return oreChunkModel();
      case 'hat': return hatModel(this.cls, this.team, this.upgraded);
      case 'bomb': return bombModel(false);
      case 'bigbomb': return bombModel(true);
      case 'potion': return potionModel();
    }
    return new THREE.Group();
  }
  get carrySpeed() {
    return { cake: 0.97, log: 0.82, ore: 0.8, bomb: 0.95, bigbomb: 0.75, potion: 0.97 }[this.type] ?? 1;
  }
}

export class Items {
  constructor(game) {
    this.game = game;
    this.list = [];
  }
  spawn(type, x, z, opts = {}) {
    const it = new Item(type, x, z, opts);
    this.game.scene.add(it.model);
    this.list.push(it);
    this.sync(it, 0);
    return it;
  }
  remove(it) {
    it.alive = false;
    if (it.holder) it.holder.carrying = null;
    it.holder = null;
    this.game.scene.remove(it.model);
    const i = this.list.indexOf(it);
    if (i >= 0) this.list.splice(i, 1);
    if (it.spawner) it.spawner.onTaken?.(it, true);
  }
  // Drop at a position with a little hop.
  drop(it, x, z, vx = 0, vz = 0, vy = 3) {
    it.holder = null;
    it.x = x;
    it.z = z;
    it.y = groundY(x, z) + 1.4;
    it.vx = vx;
    it.vz = vz;
    it.vy = vy;
    it.airborne = true;
  }
  throw(it, from, dirX, dirZ, power = 1) {
    it.holder = null;
    it.thrower = from;
    it.x = from.x + dirX * 0.5;
    it.z = from.z + dirZ * 0.5;
    it.y = from.y + 2.0;
    const sp = 7 * power;
    it.vx = dirX * sp;
    it.vz = dirZ * sp;
    it.vy = 5.5 * power;
    it.airborne = true;
    if ((it.type === 'bomb' || it.type === 'bigbomb') && it.fuse < 0) it.fuse = it.type === 'bomb' ? 1.6 : 2.6;
  }
  nearest(x, z, r, filter) {
    let best = null, bd = r * r;
    for (const it of this.list) {
      if (!it.alive || it.holder || it.airborne) continue;
      if (filter && !filter(it)) continue;
      const d = dist2(x, z, it.x, it.z);
      if (d < bd) {
        bd = d;
        best = it;
      }
    }
    return best;
  }
  sync(it, t) {
    const mdl = it.model;
    if (it.holder) {
      const h = it.holder;
      const lift = h.model ? 2.05 : 2;
      mdl.position.set(h.x, h.y + lift + (h.model?.body.position.y || 0), h.z);
      mdl.rotation.set(0, h.yaw + Math.PI / 2, 0);
      if (it.type === 'log') mdl.rotation.y = h.yaw;
      return;
    }
    mdl.position.set(it.x, it.y, it.z);
    if (!it.airborne) {
      const bob = it.type === 'hat' || it.type === 'cake' || it.type === 'potion' ? 0.12 + Math.sin(t * 3 + it.phase) * 0.08 : 0;
      mdl.position.y += bob;
      if (it.type === 'hat' || it.type === 'potion') mdl.rotation.y = t * 1.5 + it.phase;
    } else {
      mdl.rotation.x += 0.15;
    }
  }
  update(dt, t) {
    const g = this.game;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const it = this.list[i];
      it.age += dt;
      if (it.airborne) {
        it.vy -= 20 * dt;
        const nx = it.x + it.vx * dt, nz = it.z + it.vz * dt;
        // bounce off walls
        if (!canStand(nx, nz) && groundY(nx, nz) > it.y - 0.2) {
          it.vx *= -0.3;
          it.vz *= -0.3;
        } else {
          it.x = nx;
          it.z = nz;
        }
        it.y += it.vy * dt;
        const gy = groundY(it.x, it.z);
        if (it.y <= gy) {
          it.y = gy;
          if (gy < -3) {
            // fell off the world
            this.remove(it);
            continue;
          }
          it.airborne = false;
          it.vx = it.vz = it.vy = 0;
          it.model.rotation.x = 0;
          g.onItemLanded?.(it);
        }
      }
      if (it.fuse >= 0) {
        it.fuse -= dt;
        if (Math.random() < 0.5) g.fx.sparkle(it.model.position.x, it.model.position.y + (it.type === 'bigbomb' ? 1.2 : 0.6), it.model.position.z, 0xffc040);
        if (it.fuse <= 0) {
          g.explode(it.x, it.z, it.type === 'bigbomb' ? 4.2 : 2.4, it.type === 'bigbomb' ? 6 : 2, it.thrower);
          this.remove(it);
          continue;
        }
      }
      if (!it.holder && it.ttl < Infinity && !it.airborne) {
        it.ttl -= dt;
        if (it.ttl <= 0) {
          g.fx.puff(it.x, it.y + 0.3, it.z, 2, 0.7);
          this.remove(it);
          continue;
        }
      }
      this.sync(it, t);
    }
  }
}

// Spawn points that regrow a pickup some time after it is taken.
export class Spawner {
  constructor(items, type, x, z, delay, opts = {}) {
    this.items = items;
    this.type = type;
    this.x = x;
    this.z = z;
    this.delay = delay;
    this.opts = opts;
    this.timer = opts.initial ?? 0;
    this.current = null;
  }
  onTaken(it) {
    if (it === this.current) {
      this.current = null;
      this.timer = this.delay;
    }
  }
  update(dt) {
    if (this.current) {
      // once it has been picked up or moved away, start the regrow timer
      if (!this.current.alive || this.current.holder || dist2(this.current.x, this.current.z, this.x, this.z) > 1) {
        this.current.spawner = null;
        this.current = null;
        this.timer = this.delay;
      }
      return;
    }
    if (this.enabled === false) return;
    this.timer -= dt;
    if (this.timer <= 0) {
      this.current = this.items.spawn(this.type, this.x, this.z, { ...this.opts, spawner: this });
      this.items.game.fx.puff(this.x, groundY(this.x, this.z) + 0.3, this.z, 3, 0.6);
    }
  }
}
export { TEAM_COLORS };
