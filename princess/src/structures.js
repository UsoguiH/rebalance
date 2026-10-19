// Things soldiers fight over and build: castle gates, hat machines, stockpiles,
// catapults, outposts, torches, choppable trees and ore deposits.
import * as THREE from 'three';
import { CASTLES, OUTPOSTS } from './world.js';
import { NAV, stampBox } from './nav.js';
import { setOutpostColor, TEAM_COLORS } from './castle.js';
import { Spawner } from './items.js';
import { makeCanvas, clamp, dist2, TAU, lerp } from './util.js';

export const COSTS = {
  hat: { wood: 3, ore: 3, work: 10 },
  catapult: { wood: 9, ore: 3, work: 16 },
  gate: { wood: 3, ore: 0, work: 8 },
};

// green crossed-hammers "you can build this" badge
let badgeTex;
function buildBadge() {
  if (!badgeTex) {
    const c = makeCanvas(128, 128);
    const g = c.getContext('2d');
    g.translate(64, 64);
    g.fillStyle = '#5be04a';
    g.strokeStyle = '#1d4a12';
    g.lineWidth = 8;
    g.beginPath();
    g.arc(0, 0, 54, 0, TAU);
    g.fill();
    g.stroke();
    for (const s of [-1, 1]) {
      g.save();
      g.rotate(s * 0.78);
      g.fillStyle = '#8a4a1c';
      g.fillRect(-6, -10, 12, 52);
      g.strokeRect(-6, -10, 12, 52);
      g.fillStyle = '#e8ecf2';
      g.fillRect(-22, -32, 44, 22);
      g.strokeRect(-22, -32, 44, 22);
      g.restore();
    }
    badgeTex = new THREE.CanvasTexture(c);
    badgeTex.colorSpace = THREE.SRGBColorSpace;
  }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: badgeTex, transparent: true, depthWrite: false }));
  s.scale.setScalar(1.1);
  s.renderOrder = 8;
  return s;
}
function progressRing() {
  const g = new THREE.Group();
  const bg = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.62, 32), new THREE.MeshBasicMaterial({ color: 0x2a1206, transparent: true, opacity: 0.75, depthTest: false }));
  const fg = new THREE.Mesh(new THREE.RingGeometry(0.46, 0.58, 32, 1, 0, 0.001), new THREE.MeshBasicMaterial({ color: 0x7dff5a, depthTest: false }));
  bg.renderOrder = fg.renderOrder = 9;
  g.add(bg, fg);
  g.userData.fg = fg;
  g.visible = false;
  g.userData.last = -1;
  return g;
}
function setRing(ring, k, camera) {
  ring.visible = k > 0 && k < 1;
  if (!ring.visible) return;
  if (Math.abs(ring.userData.last - k) > 0.01) {
    ring.userData.last = k;
    const fg = ring.userData.fg;
    fg.geometry.dispose();
    fg.geometry = new THREE.RingGeometry(0.46, 0.58, 32, 1, Math.PI / 2, -k * TAU);
  }
  ring.quaternion.copy(camera.quaternion);
}

// ------------------------------------------------------------------ base
class Buildable {
  constructor(game, team, kind, x, z, y = 0) {
    this.game = game;
    this.team = team;
    this.kind = kind;
    this.x = x;
    this.z = z;
    this.work = 0;
    this.done = false;
    this.badge = buildBadge();
    this.badge.position.set(x, y + 3.6, z);
    this.badge.visible = false;
    this.ring = progressRing();
    this.ring.position.set(x, y + 3.6, z);
    game.scene.add(this.badge, this.ring);
  }
  get cost() {
    return COSTS[this.kind === 'gate' ? 'gate' : this.kind === 'catapult' ? 'catapult' : 'hat'];
  }
  affordable() {
    const t = this.game.teams[this.team];
    return t.wood >= this.cost.wood && t.ore >= this.cost.ore;
  }
  needsWork() {
    return !this.done;
  }
  // A worker hit. Returns true if it did something.
  build(by, amount = 1) {
    if (!this.needsWork() || (!this.work && !this.affordable())) return false;
    if (!this.work) {
      // resources are committed when work starts
      const t = this.game.teams[this.team];
      t.wood -= this.cost.wood;
      t.ore -= this.cost.ore;
    }
    this.work += amount;
    by.score += 2;
    this.game.fx.puff(this.x, 1.2, this.z, 1, 0.6);
    this.game.audio?.play('hammer', by);
    if (this.work >= this.cost.work) {
      this.work = 0;
      this.complete(by);
    }
    return true;
  }
  updateBadge(t, camera) {
    const show = this.needsWork() && (this.work > 0 || this.affordable());
    this.badge.visible = show && this.work === 0;
    this.badge.position.y = this.badgeY + Math.sin(t * 3) * 0.15;
    setRing(this.ring, this.work / this.cost.work, camera);
  }
}

// ------------------------------------------------------------------ gate
export class Gate extends Buildable {
  constructor(game, team, model) {
    const c = CASTLES[team];
    super(game, team, 'gate', c.gate.x, c.gate.z);
    this.model = model;
    this.maxHp = 40;
    this.hp = this.maxHp;
    this.done = true;
    this.badgeY = 4.2;
    this.open = 0;
    this.shake = 0;
  }
  get destroyed() {
    return this.hp <= 0;
  }
  needsWork() {
    return this.hp < this.maxHp;
  }
  affordable() {
    return this.game.teams[this.team].wood >= (this.destroyed ? COSTS.gate.wood : 1);
  }
  damage(amount, by) {
    if (this.destroyed) return;
    this.hp -= amount;
    this.shake = 0.3;
    this.game.fx.hitStar(this.x - CASTLES[this.team].s * 0.4, 1.6, this.z + (Math.random() - 0.5) * 3, 0xffffff, 0.8);
    for (let i = 0; i < 2; i++) this.game.fx.puff(this.x, 1 + Math.random() * 2, this.z + (Math.random() - 0.5) * 4, 1, 0.5, 0xd8b080);
    this.game.audio?.play('wood', by);
    if (this.hp <= 0) {
      this.hp = 0;
      NAV.gateOpen[this.team] = true;
      this.game.fx.explosion(this.x, 0, this.z, 2.2);
      this.game.announce(this.team === this.game.playerTeam ? 'Our gate has been smashed!' : 'Their gate is down! Charge!', 1 - this.team);
      if (by) by.score += 25;
      this.game.nav.dirty = true;
    }
  }
  build(by) {
    if (!this.needsWork()) return false;
    const t = this.game.teams[this.team];
    if (this.destroyed) {
      if (!this.work && t.wood < COSTS.gate.wood) return false;
      if (!this.work) t.wood -= COSTS.gate.wood;
      this.work += 1;
      by.score += 2;
      this.game.audio?.play('hammer', by);
      this.game.fx.puff(this.x, 1, this.z, 1, 0.6);
      if (this.work >= COSTS.gate.work) {
        this.work = 0;
        this.hp = this.maxHp * 0.5;
        NAV.gateOpen[this.team] = false;
        this.game.fx.puff(this.x, 1.5, this.z, 6, 1.2);
        this.game.nav.dirty = true;
      }
      return true;
    }
    if (t.wood < 1) return false;
    this.hp = Math.min(this.maxHp, this.hp + 5);
    if (Math.random() < 0.34) t.wood -= 1;
    by.score += 1;
    this.game.audio?.play('hammer', by);
    this.game.fx.puff(this.x, 1, this.z, 1, 0.5);
    return true;
  }
  update(dt, t, camera) {
    const g = this.game;
    // swing open for friends, stay shut for foes
    let friend = false;
    for (const u of g.units) {
      if (u.alive && u.team === this.team && dist2(u.x, u.z, this.x, this.z) < 16) friend = true;
    }
    this.open = lerp(this.open, friend ? 1 : 0, 1 - Math.exp(-dt * 6));
    const [l0, l1] = this.model.userData.leaves;
    const broken = this.destroyed;
    const sh = this.shake > 0 ? Math.sin(t * 80) * 0.05 : 0;
    this.shake = Math.max(0, this.shake - dt);
    l0.visible = l1.visible = !broken;
    l0.rotation.y = -this.open * 1.4 + sh;
    l1.rotation.y = this.open * 1.4 - sh;
    if (!broken) {
      const k = 1 - this.hp / this.maxHp;
      l0.rotation.z = l1.rotation.z = k * 0.08;
    }
    this.badgeY = 4.4;
    this.updateBadge(t, camera);
    this.ring.visible = this.ring.visible || (this.hp < this.maxHp && !broken && false);
  }
}

// ------------------------------------------------------------------ hat machine
export class HatMachine extends Buildable {
  constructor(game, team, def, model) {
    super(game, team, 'hat', def.x, def.z);
    this.cls = def.cls;
    this.model = model;
    this.upgraded = false;
    this.badgeY = 3.8;
    const plate = model.userData.plate.clone().applyMatrix4(model.matrixWorld);
    this.plateX = plate.x;
    this.plateZ = plate.z;
    this.spawner = new Spawner(game.items, 'hat', this.plateX, this.plateZ, 6, { cls: this.cls, team, upgraded: false, initial: 0.5 + Math.random() });
    this.extra = null;
  }
  needsWork() {
    return !this.upgraded;
  }
  complete(by) {
    this.upgraded = true;
    this.model.userData.trim.visible = true;
    this.spawner.opts.upgraded = true;
    if (this.spawner.current) {
      this.game.items.remove(this.spawner.current);
      this.spawner.current = null;
      this.spawner.timer = 0.5;
    }
    this.game.fx.puff(this.x, 1.5, this.z, 8, 1.3);
    for (let i = 0; i < 12; i++) this.game.fx.sparkle(this.x, 1.5, this.z, 0xffe070);
    this.game.announce(`${TEAM_COLORS[this.team].name} upgraded the ${this.cls} hat machine!`, this.team);
    this.game.audio?.play('upgrade', by);
    by.score += 20;
    // upgraded worker and mage machines hand out big bombs and chicken potions
    const c = CASTLES[this.team];
    if (this.cls === 'worker') this.extra = new Spawner(this.game.items, 'bigbomb', c.bombRack.x, c.bombRack.z, 25, { initial: 2 });
    if (this.cls === 'mage') this.extra = new Spawner(this.game.items, 'potion', this.x + c.s * -1.6, this.z + 1.6, 30, { initial: 3 });
  }
  update(dt, t, camera) {
    this.spawner.update(dt);
    this.extra?.update(dt);
    this.model.userData.cog.rotation.z += dt * (this.upgraded ? 3 : 1);
    this.model.userData.sign.rotation.y = Math.sin(t * 1.2) * 0.5;
    if (Math.random() < dt * 1.5) this.game.fx.puff(this.x - Math.cos(-this.model.rotation.y) * 0.45, 2.4, this.z - Math.sin(-this.model.rotation.y) * 0.45, 1, 0.45, 0xeeeeee);
    this.updateBadge(t, camera);
  }
}

// ------------------------------------------------------------------ catapult
export class Catapult extends Buildable {
  constructor(game, team, model) {
    const c = CASTLES[team];
    super(game, team, 'catapult', c.catapult.x, c.catapult.z);
    this.model = model;
    this.badgeY = 3.0;
    this.armT = 0;
    this.firstBuilt = false;
  }
  complete(by) {
    this.done = true;
    this.model.userData.site.visible = false;
    this.model.userData.built.visible = true;
    // the frame now blocks movement
    stampBox(this.x, this.z, 1.5, 1.0, NAV.dyn, 1);
    this.game.fx.puff(this.x, 1.2, this.z, 8, 1.3);
    this.game.announce(`${TEAM_COLORS[this.team].name} built a catapult!`, this.team);
    this.game.audio?.play('upgrade', by);
    by.score += 30;
  }
  launch(u) {
    const g = this.game;
    const foe = CASTLES[1 - this.team];
    const tx = foe.spawn.x * 0.93 + (Math.random() - 0.5) * 6, tz = (Math.random() - 0.5) * 16;
    u.flying = { t: 0, dur: 2.4, x0: this.x, z0: this.z, y0: 1.5, x1: tx, z1: tz, y1: 0, h: 22 };
    u.yaw = Math.atan2(tx - this.x, tz - this.z);
    this.armT = 1;
    g.fx.puff(this.x, 1.5, this.z, 6, 1.2);
    g.audio?.play('catapult', u);
    u.score += 2;
  }
  update(dt, t, camera) {
    if (this.done) {
      const arm = this.model.userData.arm;
      this.armT = Math.max(0, this.armT - dt * 1.2);
      arm.rotation.z = -0.22 + (this.armT > 0.8 ? (1 - this.armT) * 5 * 1.6 : this.armT * 1.6);
    }
    this.updateBadge(t, camera);
  }
}

// ------------------------------------------------------------------ outposts
export class Outpost {
  constructor(game, def, model) {
    this.game = game;
    this.id = def.id;
    this.x = def.x;
    this.z = def.z;
    this.model = model;
    this.owner = -1;
    this.progress = 0; // -1 blue .. +1 red
    this.lastOwner = -1;
    this.healT = 0;
  }
  update(dt) {
    const g = this.game;
    let b = 0, r = 0;
    for (const u of g.units) {
      if (!u.alive || dist2(u.x, u.z, this.x, this.z) > 6.5 * 6.5) continue;
      if (u.team === 0) b++;
      else r++;
    }
    const diff = r - b;
    if (diff !== 0) this.progress = clamp(this.progress + Math.sign(diff) * Math.min(3, Math.abs(diff)) * dt * 0.12, -1, 1);
    let owner = this.owner;
    if (this.progress <= -1) owner = 0;
    else if (this.progress >= 1) owner = 1;
    else if (this.owner === 0 && this.progress > -0.999) owner = this.progress < 0 ? 0 : -1;
    else if (this.owner === 1 && this.progress < 0.999) owner = this.progress > 0 ? 1 : -1;
    if (owner !== this.owner) {
      const prev = this.owner;
      this.owner = owner;
      if (owner >= 0) {
        g.announce(`${TEAM_COLORS[owner].name} captured an outpost!`, owner);
        g.audio?.play('capture', null);
        for (const u of g.units) if (u.alive && u.team === owner && dist2(u.x, u.z, this.x, this.z) < 42) u.score += 5;
      } else if (prev >= 0) g.audio?.play('lose', null);
    }
    const shownTeam = this.owner >= 0 ? this.owner : Math.abs(this.progress) > 0.05 ? (this.progress < 0 ? 0 : 1) : -1;
    setOutpostColor(this.model, shownTeam, this.owner >= 0 ? 1 : Math.abs(this.progress));
    // heal friendly soldiers resting nearby
    if (this.owner >= 0) {
      this.healT += dt;
      if (this.healT > 1) {
        this.healT = 0;
        for (const u of g.units) if (u.alive && u.team === this.owner && dist2(u.x, u.z, this.x, this.z) < 3.6 * 3.6 && u.hp < u.maxHp) u.heal(0.35, null, true);
      }
    }
  }
}

// ------------------------------------------------------------------ resources
export class TreeRes {
  constructor(game, def) {
    this.game = game;
    Object.assign(this, def);
    this.hp = 5;
    this.falling = 0;
    this.regrow = 0;
    this.standing = true;
  }
  chop(by) {
    if (!this.standing) return false;
    this.hp -= 1;
    const g = this.game;
    g.fx.hitStar(this.x, 1.2, this.z, 0xffe9a0, 0.6);
    for (let i = 0; i < 2; i++) g.fx.sparkle(this.x, 3, this.z, 0x7ad860);
    g.audio?.play('chop', by);
    this.model.userData.crown.rotation.z = 0.08;
    if (this.hp <= 0) {
      this.standing = false;
      this.falling = 0.001;
      this.fallDir = Math.atan2(this.x - by.x, this.z - by.z);
      this.stump.visible = true;
      NAV.block; // stays blocked by the stump
      g.items.spawn('log', this.x + Math.sin(this.fallDir) * 1.6, this.z + Math.cos(this.fallDir) * 1.6);
      g.audio?.play('timber', by);
      by.score += 1;
    }
    return true;
  }
  update(dt) {
    const c = this.model.userData.crown;
    c.rotation.z *= Math.exp(-dt * 10);
    if (this.falling > 0) {
      this.falling += dt;
      const k = Math.min(1, this.falling * this.falling * 1.6);
      this.model.rotation.set(0, 0, 0);
      this.model.rotateOnWorldAxis(new THREE.Vector3(Math.cos(this.fallDir), 0, -Math.sin(this.fallDir)), k * 1.5);
      if (this.falling > 1.2) {
        this.game.fx.puff(this.x + Math.sin(this.fallDir) * 3, 0.6, this.z + Math.cos(this.fallDir) * 3, 6, 1.3, 0xd8f0c0);
        this.model.visible = false;
        this.falling = 0;
        this.regrow = 75;
      }
    } else if (!this.standing) {
      this.regrow -= dt;
      if (this.regrow <= 0) {
        this.standing = true;
        this.hp = 5;
        this.model.rotation.set(0, this.model.rotation.y, 0);
        this.model.visible = true;
        this.stump.visible = false;
        this.model.scale.setScalar(0.2);
        this.growT = 0;
      }
    }
    if (this.growT !== undefined) {
      this.growT += dt;
      this.model.scale.setScalar(Math.min(1, 0.2 + this.growT * 0.8));
      if (this.growT > 1) delete this.growT;
    }
  }
}

export class OreRes {
  constructor(game, def) {
    this.game = game;
    Object.assign(this, def);
    this.hp = 5;
    this.cool = 0;
  }
  get ready() {
    return this.cool <= 0;
  }
  mine(by) {
    if (!this.ready) return false;
    const g = this.game;
    this.hp -= 1;
    g.fx.hitStar(this.x, 1, this.z, 0xffffff, 0.7);
    g.fx.sparkle(this.x, 1.3, this.z, 0xdff0ff, 3);
    g.audio?.play('clink', by);
    if (this.hp <= 0) {
      const a = Math.atan2(by.x - this.x, by.z - this.z);
      g.items.spawn('ore', this.x + Math.sin(a) * 1.9, this.z + Math.cos(a) * 1.9);
      this.hp = 5;
      this.cool = 12;
      this.model.userData.crystals.visible = false;
      by.score += 1;
    }
    return true;
  }
  update(dt) {
    if (this.cool > 0) {
      this.cool -= dt;
      if (this.cool <= 0) this.model.userData.crystals.visible = true;
    }
  }
}

// Burning torches set weapons alight.
export class Torch {
  constructor(game, model) {
    this.game = game;
    this.model = model;
    this.x = model.position.x;
    this.z = model.position.z;
  }
  update(dt, t) {
    const { flame, core } = this.model.userData;
    const f = 1 + Math.sin(t * 17 + this.x) * 0.12 + Math.sin(t * 31) * 0.06;
    flame.scale.set(0.7 * f, 0.95 * f, 1);
    core.scale.set(0.38 / f, 0.5 * f, 1);
    if (Math.random() < dt * 4) this.game.fx.sprite(flame.material.map, 0xffa030, this.x, this.model.position.y + 2.9, this.z, 0.25, 0.6, { vy: 1.2, grow: 0.3, rot: 0 });
    for (const u of this.game.units) {
      if (!u.alive || u.status.flame > 0) continue;
      if ((u.cls === 'warrior' || u.cls === 'ranger') && dist2(u.x, u.z, this.x, this.z) < 1.6 * 1.6) {
        u.status.flame = 18;
        this.game.audio?.play('fire', u);
      }
    }
  }
}
export { OUTPOSTS };
