// A Rescue the Princess match: builds the world, owns every soldier, item and
// structure, resolves combat and interactions, runs the win rule and drives the camera.
import * as THREE from 'three';
import { buildTerrain } from './terrain.js';
import { buildNav, NAV, groundY, canStand } from './nav.js';
import { buildCastles, updateFlags, TEAM_COLORS } from './castle.js';
import { buildScenery } from './props.js';
import { CASTLES, OUTPOSTS, CAKES, MAP, insideCastle } from './world.js';
import { FX } from './fx.js';
import { Items, Spawner } from './items.js';
import { Projectiles } from './projectiles.js';
import { Unit } from './units.js';
import { Brain } from './ai.js';
import { Princess, NAMES as PRINCESS_NAMES } from './princess.js';
import { Gate, HatMachine, Catapult, Outpost, TreeRes, OreRes, Torch } from './structures.js';
import { HUD } from './hud.js';
import { CLASS_INFO } from './chars.js';
import { clamp, dist, dist2, lerp, TAU, rng, sdSegment, wrapAngle } from './util.js';

const R = rng(1009);
const NAMES = ['Sir Digby', 'Jess', 'Pip', 'Rowan', 'Bertram', 'Mabel', 'Tobias', 'Wren', 'Gareth', 'Elsie', 'Cuthbert', 'Agnes', 'Percival', 'Hattie', 'Edmund', 'Bess', 'Osric', 'Nell', 'Godfrey', 'Tilly', 'Alaric', 'Maud', 'Barnaby', 'Ivy', 'Leofric', 'Dot', 'Hamish', 'Peg', 'Wilfred', 'Joan', 'Rufus', 'Greta'];
const skullSVG = `<svg viewBox="0 0 40 40"><path d="M20 3C10 3 4 10 4 18c0 5 2 8 5 10v6h22v-6c3-2 5-5 5-10C36 10 30 3 20 3z" fill="#fff8ea"/><circle cx="13" cy="19" r="5" fill="#2a1206"/><circle cx="27" cy="19" r="5" fill="#2a1206"/><path d="M18 26h4l-2 4z" fill="#2a1206"/><path d="M13 34v-4M17 34v-4M23 34v-4M27 34v-4" stroke="#2a1206" stroke-width="2"/></svg>`;
const plusSVG = `<svg viewBox="0 0 40 40"><rect x="4" y="9" width="32" height="24" rx="5" fill="#fff8ea"/><path d="M20 13v16M12 21h16" stroke="#e8302a" stroke-width="6"/></svg>`;
const crownSVG = `<svg viewBox="0 0 40 40"><path d="M5 30 L8 12 L15 21 L20 8 L25 21 L32 12 L35 30 Z" fill="#ffd23a" stroke="#2a1206" stroke-width="2.5" stroke-linejoin="round"/></svg>`;

export class Game {
  constructor({ renderer, scene, camera, input, audio, hudRoot, opts }) {
    this.hudRoot = hudRoot;
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.input = input;
    this.audio = audio;
    this.opts = Object.assign({ teamSize: 10, playerTeam: 0, difficulty: 1 }, opts);
    this.playerTeam = this.opts.playerTeam;
    this.time = 0;
    this.units = [];
    this.brains = [];
    this.teams = [0, 1].map(() => ({ wood: 0, ore: 0, winT: 0, upgrades: {} }));
    this.focus = new THREE.Vector3();
    this.camPos = new THREE.Vector3();
    this.nav = { dirty: false };
    this.over = false;
    this.paused = false;
    this.pathBudget = 4;
    this.stats = { kills: [0, 0], rescues: [0, 0] };
  }

  async build(onProgress = () => {}) {
    const scene = this.scene;
    onProgress('Laying the paths');
    await tick();
    buildNav();
    onProgress('Raising the island');
    await tick();
    this.terrain = buildTerrain(scene);
    onProgress('Building castles');
    await tick();
    const dyn = buildCastles(scene);
    this.castleModels = dyn.castles;
    onProgress('Planting trees');
    await tick();
    const scenery = buildScenery(scene);
    this.fx = new FX(scene, this.camera);
    this.items = new Items(this);
    this.projectiles = new Projectiles(this);
    // structures
    this.gates = [0, 1].map((t) => new Gate(this, t, this.castleModels[t].gate));
    this.hatMachines = [];
    this.catapults = [];
    for (const c of CASTLES) {
      const models = this.castleModels[c.team];
      c.hatMachines.forEach((def, i) => {
        models.hms[i].updateMatrixWorld(true);
        this.hatMachines.push(new HatMachine(this, c.team, def, models.hms[i]));
      });
      this.catapults.push(new Catapult(this, c.team, models.cat));
    }
    this.buildables = [...this.gates, ...this.hatMachines, ...this.catapults];
    this.outposts = OUTPOSTS.map((o, i) => new Outpost(this, o, dyn.outposts[i]));
    this.torches = dyn.torches.map((t) => new Torch(this, t));
    this.trees = scenery.trees.map((t) => new TreeRes(this, t));
    this.ores = scenery.ores.map((o) => new OreRes(this, o));
    this.cakeSpawners = CAKES.map((c) => new Spawner(this.items, 'cake', c.x, c.z, 22, { initial: 1 + R() * 4 }));
    // princesses
    this.princesses = [0, 1].map((t) => new Princess(this, t));
  }

  // Creates the soldiers. opts: { teamSize, playerTeam, spectate }
  startMatch(opts = {}) {
    Object.assign(this.opts, opts);
    this.playerTeam = this.opts.playerTeam;
    const scene = this.scene;
    const spectate = !!this.opts.spectate;
    this.spectate = spectate;
    const n = this.opts.teamSize;
    let id = 0;
    const names = [...NAMES].sort(() => R() - 0.5);
    for (const team of [0, 1]) {
      for (let i = 0; i < n; i++) {
        const isPlayer = team === this.playerTeam && i === 0;
        const u = new Unit(this, team, { name: isPlayer && !spectate ? 'You' : names[id % names.length], isPlayer: isPlayer && !spectate, id: id++, seed: id * 17 + team });
        this.units.push(u);
        if (isPlayer) this.player = u;
        if (!u.isPlayer || this.opts.autopilot) {
          const b = new Brain(this, u, i);
          u.brain = b;
          this.brains.push(b);
        }
        u.respawn = isPlayer ? 0 : 0.2 + i * 0.25;
      }
    }
    this.hud = new HUD(this.hudRoot || document.getElementById('hud'), this);
    // first spawn
    for (const u of this.units) if (u.respawn <= 0) this.respawnUnit(u);
    this.focus.set(this.player.x, 0, this.player.z);
    this.placeCamera(1);
    // team ring under the player
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.78, 32), new THREE.MeshBasicMaterial({ color: TEAM_COLORS[this.playerTeam].light, transparent: true, opacity: 0.8, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2;
    ring.renderOrder = 2;
    this.playerRing = ring;
    scene.add(ring);
    const charge = new THREE.Mesh(new THREE.RingGeometry(0.2, 1, 40), new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending }));
    charge.rotation.x = -Math.PI / 2;
    charge.renderOrder = 2;
    this.chargeRing = charge;
    scene.add(charge);
    this.aimMarker = new THREE.Mesh(new THREE.RingGeometry(0.25, 0.4, 24), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, depthWrite: false }));
    this.aimMarker.rotation.x = -Math.PI / 2;
    this.aimMarker.renderOrder = 3;
    scene.add(this.aimMarker);
    if (!spectate) this.announce('Rescue the Princess!', -1);
    this.started = true;
    this.feed = {
      heal: (by, who) => {
        if (by.team === this.playerTeam && (by.isPlayer || who.isPlayer)) this.hud.feed(`${plusSVG}<span class="t${who.team}">${who.name}</span>`);
      },
    };
  }

  // ---------------------------------------------------------------- queries
  upgraded(team, cls) {
    return this.hatMachines?.some((h) => h.team === team && h.cls === cls && h.upgraded);
  }
  nearestEnemy(u, r, visible) {
    let best = null, bd = r * r;
    for (const o of this.units) {
      if (!o.alive || o.team === u.team || o.flying) continue;
      const d = dist2(u.x, u.z, o.x, o.z);
      if (d < bd && (!visible || d < 9 || this.lineOfFire(u, o))) {
        bd = d;
        best = o;
      }
    }
    return best;
  }
  nearestHurtAlly(u, r) {
    let best = null, bs = Infinity;
    for (const o of this.units) {
      if (!o.alive || o.team !== u.team || o === u) continue;
      const d = dist2(u.x, u.z, o.x, o.z);
      if (d > r * r) continue;
      const need = o.maxHp - o.hp;
      const score = d - need * 30 - (o.carryingPrincess ? 40 : 0);
      if ((need > 0.05 || (o.status.aura <= 0 && d < 30)) && score < bs) {
        bs = score;
        best = o;
      }
    }
    return best;
  }
  enemiesNear(u, r) {
    let n = 0;
    for (const o of this.units) if (o.alive && o.team !== u.team && dist2(u.x, u.z, o.x, o.z) < r * r) n++;
    return n;
  }
  // projectiles stop at walls, trees and closed gates; water and drops do not block
  lineOfFire(a, b) {
    const d = dist(a.x, a.z, b.x, b.z);
    if (d < 2) return true;
    const n = Math.ceil(d / 0.4);
    for (let k = 1; k < n; k++) {
      const x = a.x + ((b.x - a.x) * k) / n, z = a.z + ((b.z - a.z) * k) / n;
      if (!canStand(x, z, a.team) && groundY(x, z) > -2) return false;
    }
    return true;
  }
  inCastle(u, team) {
    return insideCastle(u.x, u.z, team);
  }
  nearestDrop(u) {
    const c = CASTLES[u.team];
    let best = { x: c.stockpile.x, z: c.stockpile.z };
    let bd = dist2(u.x, u.z, best.x, best.z);
    for (const o of this.outposts) {
      if (o.owner !== u.team) continue;
      const d = dist2(u.x, u.z, o.x, o.z);
      if (d < bd) {
        bd = d;
        best = { x: o.x, z: o.z + 2.6 };
      }
    }
    return best;
  }

  // ---------------------------------------------------------------- combat
  damage(t, amount, by, o = {}) {
    if (!t.alive || t.flying) return false;
    if (t.spawnProtect > 0 && !o.quiet) return false;
    const dirX = o.dirX ?? (by ? t.x - by.x : 0), dirZ = o.dirZ ?? (by ? t.z - by.z : 0);
    const dl = Math.hypot(dirX, dirZ) || 1;
    // shield block: attack arriving from the front
    if (t.blocking && by && o.kind !== 'drain' && !o.area) {
      const toAtt = Math.atan2(-dirX, -dirZ);
      if (Math.abs(wrapAngle(toAtt - t.yaw)) < 1.25) {
        this.fx.hitStar(t.x + Math.sin(t.yaw) * 0.6, t.y + 1.0, t.z + Math.cos(t.yaw) * 0.6, 0xffffff, 0.8);
        this.audio?.play('block', t);
        t.knockX += (dirX / dl) * 2;
        t.knockZ += (dirZ / dl) * 2;
        return false;
      }
    }
    if (t.status.aura > 0 && !o.quiet) {
      t.status.aura = 0;
      this.fx.ring(t.x, t.y + 1, t.z, 0xfff6a0, 1.4, 0.4);
      return false;
    }
    if (o.burn) {
      t.status.burn = Math.max(t.status.burn, 3.5);
      t.status.burnBy = by;
    }
    if (o.slow) t.status.slow = Math.max(t.status.slow, 3);
    if (o.freeze) t.status.freeze = Math.max(t.status.freeze, o.freeze);
    if (t.status.freeze > 0 && !o.freeze && amount > 0.3) {
      // shatter the ice on a solid hit
      amount *= 1.25;
      t.status.freeze = 0;
      for (let i = 0; i < 6; i++) this.fx.ice(t.x, t.y + 1, t.z, 0.5);
    }
    if (!o.noFlash) {
      t.model.hit();
      const k = o.knock ?? 2;
      t.knockX += (dirX / dl) * k;
      t.knockZ += (dirZ / dl) * k;
      this.fx.hitStar(t.x - (dirX / dl) * 0.3, t.y + 1.0, t.z - (dirZ / dl) * 0.3, o.burn ? 0xffa030 : 0xffe24a, 0.9 + amount * 0.25);
      this.fx.blood(t.x, t.y + 1.0, t.z, dirX / dl, dirZ / dl, clamp(amount, 0.2, 1.4));
      this.audio?.play(o.projectile ? 'squish' : 'hit', t);
      if (t.isPlayer) this.fx.addShake(0.25 + amount * 0.1);
      if (by?.isPlayer) this.fx.addShake(0.1);
    }
    // getting hit knocks loose cake and logs, and slaps break a princess carry
    if (o.slap) {
      if (t.carrying) this.dropCarried(t);
      if (t.carryingPrincess) t.carryingPrincess.releaseCarrier(t);
    }
    if (t.eatT > 0 && amount > 0.2) {
      t.eatT = 0;
      t.model.anim.sit = 0;
    }
    t.hurtRaw(amount, by);
    return true;
  }

  kill(u, by, o = {}) {
    if (!u.alive) return;
    u.alive = false;
    u.hp = 0;
    u.deaths++;
    u.corpseT = 0;
    u.charging = false;
    u.blocking = false;
    u.model.anim.dead = 0.001;
    u.model.anim.swing = -1;
    u.respawn = 6;
    if (u.carrying) this.dropCarried(u);
    if (u.carryingPrincess) u.carryingPrincess.releaseCarrier(u);
    if (!o.fell) {
      this.fx.blood(u.x, u.y + 1.0, u.z, 0, 0, 2.2);
      this.fx.splat(u.x, u.z, 2.4, 90);
      this.fx.gibs(u.x, u.y + 1, u.z, 5);
    }
    // the hat falls off and can be picked up by anyone
    if (u.cls !== 'villager' && !o.fell && groundY(u.x, u.z) > -3) {
      const a = R() * TAU;
      const it = this.items.spawn('hat', u.x, u.z, { cls: u.cls, team: u.team, upgraded: this.upgraded(u.team, u.cls), ttl: 22 });
      this.items.drop(it, u.x, u.z, Math.cos(a) * 2, Math.sin(a) * 2, 5);
    }
    this.audio?.play('die', u);
    if (by && by !== u && by.team !== u.team) {
      by.kills++;
      by.score += u.cls === 'villager' ? 5 : 10;
      this.stats.kills[by.team]++;
      for (const [a, t] of u.assistBy) if (a !== by && a.team !== u.team && this.time - t < 6) a.score += 4;
      if (by.isPlayer) this.fx.text(u.x, u.y + 2.4, u.z, '+' + (u.cls === 'villager' ? 5 : 10), '#ffe066', 0.8);
    }
    u.assistBy.clear();
    if (u.team === this.playerTeam || by?.isPlayer) this.hud.feed(`${skullSVG}<span class="t${u.team}">${u.name}</span>`);
  }

  // melee sweep in front of `u`
  melee(u, range, arc, dmg, o = {}) {
    const fx = Math.sin(u.yaw), fz = Math.cos(u.yaw);
    let hitAny = false;
    for (const t of this.units) {
      if (!t.alive || t.team === u.team || t.flying) continue;
      const dx = t.x - u.x, dz = t.z - u.z;
      const d = Math.hypot(dx, dz);
      if (d > range + 0.4 || Math.abs(t.y - u.y) > 1.6) continue;
      const ang = Math.abs(wrapAngle(Math.atan2(dx, dz) - u.yaw));
      if (arc < TAU && ang > arc / 2 && d > 0.6) continue;
      this.damage(t, dmg, u, { dirX: dx, dirZ: dz, knock: o.knock, burn: o.burn, slap: o.slap, area: o.spin });
      hitAny = true;
    }
    if (!o.landing) {
      const a0 = u.yaw + (arc >= TAU ? 0 : -arc / 2), a1 = u.yaw + (arc >= TAU ? TAU : arc / 2);
      const col = o.burn ? 0xffb040 : o.slap ? 0xfff2c8 : 0xffffff;
      this.fx.slash(u.x, u.y + 0.95, u.z, o.spin ? a0 : a1, o.spin ? a1 : a0, range * 0.85, col, o.spin ? 0.8 : 0.55);
    }
    // structures, trees and ore
    const hx = u.x + fx * range * 0.7, hz = u.z + fz * range * 0.7;
    const foeGate = this.gates[1 - u.team], ownGate = this.gates[u.team];
    const gateDist = (g) => sdSegment(u.x, u.z, g.x, g.z - 2.7, g.x, g.z + 2.7);
    const facing = Math.abs(wrapAngle(Math.atan2(foeGate.x - u.x, foeGate.z - u.z) - u.yaw)) < 1.4 || gateDist(foeGate) < 1.2;
    if (!foeGate.destroyed && gateDist(foeGate) < range + 0.7 && facing) {
      foeGate.damage(dmg * (u.cls === 'warrior' ? 1.3 : 1), u);
      hitAny = true;
    }
    if (o.tool && !hitAny) {
      if (ownGate.needsWork() && gateDist(ownGate) < range + 1.0 && ownGate.build(u)) return;
      for (const b of this.buildables) {
        if (b.team !== u.team || b === ownGate) continue;
        if (dist(hx, hz, b.x, b.z) < 2.2 && b.build(u)) return;
      }
      for (const t of this.trees) {
        if (t.standing && dist(hx, hz, t.x, t.z) < 1.3) {
          t.chop(u);
          return;
        }
      }
      for (const r of this.ores) {
        if (dist(hx, hz, r.x, r.z) < 1.9) {
          if (r.mine(u)) return;
        }
      }
    }
    if (hitAny && u.isPlayer) this.hitStop = 0.04;
  }

  dash(u, ax, az, len, dmg) {
    const hit = new Set();
    const steps = 14;
    let i = 0;
    const stepFn = () => {
      if (!u.alive || i++ >= steps) return;
      const [nx, nz] = [u.x + (ax * len) / steps, u.z + (az * len) / steps];
      if (canStand(nx, nz, u.team)) {
        u.x = nx;
        u.z = nz;
      }
      this.fx.puff(u.x, u.y + 0.3, u.z, 1, 0.5);
      for (const t of this.units) {
        if (!t.alive || t.team === u.team || hit.has(t)) continue;
        if (dist2(t.x, t.z, u.x, u.z) < 1.8 * 1.8) {
          hit.add(t);
          this.damage(t, dmg, u, { dirX: ax, dirZ: az, knock: 7, burn: u.status.flame > 0 });
        }
      }
      u.later(0.018, stepFn);
    };
    u.later(0.05, stepFn);
    this.fx.slash(u.x, u.y + 1, u.z, u.yaw - 0.4, u.yaw + 0.4, 2.2, 0xffffff, 0.8);
    this.audio?.play('spin', u);
  }

  areaSpell(u, kind, r) {
    const col = { firering: 0xff8a20, freeze: 0x9fe8ff, heal: 0x9dffb0, curse: 0xb060ff }[kind];
    this.fx.ring(u.x, u.y + 0.15, u.z, col, r, 0.55, { add: true });
    this.fx.ring(u.x, u.y + 0.2, u.z, 0xffffff, r * 0.7, 0.4);
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * TAU;
      const x = u.x + Math.cos(a) * r * 0.8, z = u.z + Math.sin(a) * r * 0.8;
      if (kind === 'firering') this.fx.fire(x, u.y + 0.4, z, 0.9);
      else if (kind === 'freeze') this.fx.ice(x, u.y + 0.5, z, 0.6);
      else this.fx.sparkle(x, u.y + 0.5, z, col, 1);
    }
    this.audio?.play(kind === 'firering' ? 'fire' : kind === 'freeze' ? 'ice' : kind === 'heal' ? 'heal' : 'curse', u);
    for (const t of this.units) {
      if (!t.alive || dist2(t.x, t.z, u.x, u.z) > r * r) continue;
      const enemy = t.team !== u.team;
      if (kind === 'heal' && !enemy) t.heal(1.6, t === u ? null : u);
      else if (kind === 'firering' && enemy) {
        this.damage(t, 0.25, u, { burn: true, knock: 6, area: true });
      } else if (kind === 'freeze' && enemy) this.damage(t, 0.5, u, { freeze: 2.5, knock: 0.5, area: true });
      else if (kind === 'curse' && enemy) {
        t.status.curse = 3.5;
        this.fx.sparkle(t.x, t.y + 1.6, t.z, col, 3);
      }
    }
  }

  explode(x, z, r, dmg, by) {
    const y = groundY(x, z);
    this.fx.explosion(x, y, z, r * 0.8);
    this.audio?.play('explode', { x, z });
    for (const t of this.units) {
      if (!t.alive) continue;
      const d = dist(t.x, t.z, x, z);
      if (d > r) continue;
      const k = 1 - (d / r) * 0.6;
      if (by && t.team === by.team && t !== by) continue;
      this.damage(t, dmg * k, by && by.team !== t.team ? by : null, { dirX: t.x - x, dirZ: t.z - z, knock: 9, area: true });
    }
    for (const g of this.gates) if (dist(x, z, g.x, g.z) < r + 2.5) g.damage(dmg * 2.5, by);
    for (const t of this.trees) if (t.standing && dist(x, z, t.x, t.z) < r * 0.7 && by) t.chop(by);
    for (const o of this.ores) if (dist(x, z, o.x, o.z) < r * 0.7 && by) o.mine(by);
  }

  throwBomb(u, ax, az, power) {
    const it = this.items.spawn('bomb', u.x, u.z);
    this.items.throw(it, u, ax, az, power);
    it.fuse = 1.1;
    this.audio?.play('swing', u);
  }

  hitStructureAt(x, z, dmg, by) {
    if (!by) return;
    const g = this.gates[1 - by.team];
    if (!g.destroyed && sdSegment(x, z, g.x, g.z - 2.8, g.x, g.z + 2.8) < 1.3) g.damage(dmg, by);
  }

  // ---------------------------------------------------------------- interaction
  interact(u) {
    if (u.carryingPrincess) {
      u.carryingPrincess.releaseCarrier(u);
      return;
    }
    if (u.carrying) {
      const it = u.carrying;
      const captive = this.princesses[1 - u.team];
      if (it.type === 'cake' && captive.state !== 'carried' && dist(u.x, u.z, captive.x, captive.z) < 2.8) {
        this.items.remove(it);
        u.carrying = null;
        captive.feed(u);
        return;
      }
      this.dropCarried(u);
      return;
    }
    // princess first
    for (const p of this.princesses) {
      const reach = 2.2 + p.stage * 0.35;
      if (dist(u.x, u.z, p.x, p.z) < reach && p.canGrab(u)) {
        p.grab(u);
        return;
      }
    }
    const cat = this.catapults[u.team];
    if (cat.done && dist(u.x, u.z, cat.x, cat.z) < 2.6) {
      cat.launch(u);
      return;
    }
    const it = this.items.nearest(u.x, u.z, 1.8);
    if (it) return this.pickUp(u, it);
    // hat machines always have a hat ready for their own team
    const hm = this.hatMachineNear(u);
    if (hm) this.takeHat(u, hm);
  }
  hatMachineNear(u) {
    for (const h of this.hatMachines) if (h.team === u.team && dist(u.x, u.z, h.plateX, h.plateZ) < 2.3 && u.cls !== h.cls) return h;
    return null;
  }
  takeHat(u, h) {
    if (h.spawner.current) {
      this.items.remove(h.spawner.current);
      h.spawner.current = null;
      h.spawner.timer = 1.2;
    }
    u.setClass(h.cls, { alt: false });
    this.fx.puff(h.plateX, 0.8, h.plateZ, 2, 0.6);
    this.audio?.play('hat', u);
    if (u.isPlayer) this.announce(`You are now a ${CLASS_INFO[h.cls].label}!` + (h.upgraded ? ' (Q swaps weapon)' : ''), u.team);
  }
  pickUp(u, it) {
    if (it.type === 'hat') {
      this.items.remove(it);
      const sameMachineUp = it.upgraded || this.upgraded(u.team, it.cls);
      u.setClass(it.cls, { alt: false });
      this.audio?.play('hat', u);
      if (u.isPlayer) this.announce(`You are now a ${CLASS_INFO[it.cls].label}!` + (sameMachineUp ? ' (Q swaps weapon)' : ''), u.team);
      return;
    }
    if (it.spawner) it.spawner.onTaken(it);
    it.spawner = null;
    it.holder = u;
    u.carrying = it;
    it.ttl = Infinity;
    this.audio?.play('pickup', u);
  }
  dropCarried(u) {
    const it = u.carrying;
    if (!it) return;
    u.carrying = null;
    this.items.drop(it, u.x + Math.sin(u.yaw) * 0.8, u.z + Math.cos(u.yaw) * 0.8, Math.sin(u.yaw) * 1.5, Math.cos(u.yaw) * 1.5, 3);
    if (it.type === 'log' || it.type === 'ore') it.ttl = 40;
  }
  throwCarried(u, ctl) {
    const it = u.carrying;
    u.carrying = null;
    const ax = ctl.aimX ?? Math.sin(u.yaw), az = ctl.aimZ ?? Math.cos(u.yaw);
    const l = Math.hypot(ax, az) || 1;
    this.items.throw(it, u, ax / l, az / l, it.type === 'bigbomb' ? 0.8 : 1);
    u.model.anim.swing = 0;
    u.model.anim.swingKind = 'throw';
    u.model.anim.swingDur = 0.35;
    if (it.type === 'log' || it.type === 'ore') it.ttl = 40;
    this.audio?.play('swing', u);
  }
  onItemLanded(it) {
    // thrown cake into the captive princess's lap
    if (it.type === 'cake' && it.thrower) {
      const captive = this.princesses[1 - it.thrower.team];
      if (captive.state !== 'carried' && dist(it.x, it.z, captive.x, captive.z) < 2.2) {
        captive.feed(it.thrower);
        this.items.remove(it);
        return;
      }
    }
    if (it.type === 'potion') {
      // chicken potion: shrink enemies into helpless 1-heart chickens (here: villagers)
      this.fx.puff(it.x, it.y + 0.5, it.z, 8, 1.3, 0xe0b0ff);
      for (const t of this.units) {
        if (t.alive && it.thrower && t.team !== it.thrower.team && dist(t.x, t.z, it.x, it.z) < 3.2) {
          t.setClass('villager');
          t.hp = Math.min(t.hp, 1);
          this.fx.sparkle(t.x, t.y + 1.2, t.z, 0xe0b0ff, 4);
        }
      }
      this.items.remove(it);
      return;
    }
    if ((it.type === 'bomb' || it.type === 'bigbomb') && it.fuse < 0 && it.thrower) it.fuse = it.type === 'bomb' ? 0.4 : 1.2;
    this.fx.dust(it.x, it.z, 2);
  }

  onRescue(p, lead, team) {
    this.stats.rescues[team]++;
    this.announce(team === this.playerTeam ? `${PRINCESS_NAMES[p.team]} is home safe!` : `They rescued ${PRINCESS_NAMES[p.team]}!`, team);
    this.audio?.play('horn', null);
    this.fx.puff(p.x, p.y + 1, p.z, 10, 1.4, 0xffe0f0);
    for (let i = 0; i < 20; i++) this.fx.sparkle(p.x, p.y + 1.5, p.z, 0xffe070);
    this.hud.feed(`${crownSVG}<span class="t${team}">${lead.name}</span>`);
  }
  onImprison(p, lead) {
    this.announce(lead.team === this.playerTeam ? 'Back in the dungeon she goes!' : `${PRINCESS_NAMES[p.team]} was dragged back to their dungeon!`, lead.team);
    this.audio?.play('lose', null);
  }
  announce(text, team) {
    this.hud?.banner(text, team);
  }

  respawnUnit(u) {
    const c = CASTLES[u.team];
    for (let i = 0; i < 30; i++) {
      const x = c.spawn.x + (R() - 0.5) * 5, z = c.spawn.z + (R() - 0.5) * 9;
      if (canStand(x, z, u.team, true)) {
        u.spawnAt(x, z);
        break;
      }
    }
    if (!u.alive) u.spawnAt(c.spawn.x, c.spawn.z);
    u.brain?.onSpawn();
  }

  // ---------------------------------------------------------------- player controls
  playerControls(dt) {
    const inp = this.input, u = this.player;
    const ctl = { mx: 0, mz: 0 };
    const pad = inp.pad();
    let mx = (inp.down('KeyD', 'ArrowRight') ? 1 : 0) - (inp.down('KeyA', 'ArrowLeft') ? 1 : 0);
    let mz = (inp.down('KeyS', 'ArrowDown') ? 1 : 0) - (inp.down('KeyW', 'ArrowUp') ? 1 : 0);
    if (pad) {
      mx += pad.lx;
      mz += pad.ly;
    }
    ctl.mx = mx;
    ctl.mz = mz;
    // aim: mouse on the ground plane, or right stick, or facing
    if (pad && (pad.rx || pad.ry)) {
      ctl.aimX = pad.rx;
      ctl.aimZ = pad.ry;
      ctl.faceAim = true;
    } else if (!inp.usingPad) {
      const ray = new THREE.Raycaster();
      ray.setFromCamera(new THREE.Vector2(inp.mouse.nx, inp.mouse.ny), this.camera);
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -(u.y + 0.9));
      const hit = new THREE.Vector3();
      if (ray.ray.intersectPlane(plane, hit)) {
        ctl.aimX = hit.x - u.x;
        ctl.aimZ = hit.z - u.z;
        this.aimMarker.position.set(hit.x, groundY(hit.x, hit.z) + 0.05, hit.z);
        // soft lock: snap aim to an enemy near the cursor
        let best = null, bd = 2.2 * 2.2;
        for (const o of this.units) {
          if (!o.alive || o.team === u.team) continue;
          const d = dist2(o.x, o.z, hit.x, hit.z);
          if (d < bd) {
            bd = d;
            best = o;
          }
        }
        if (best) {
          ctl.aimX = best.x - u.x;
          ctl.aimZ = best.z - u.z;
          this.aimMarker.position.set(best.x, best.y + 0.05, best.z);
        }
      }
      ctl.faceAim = false;
    } else {
      ctl.aimX = Math.sin(u.yaw);
      ctl.aimZ = Math.cos(u.yaw);
    }
    // gamepad: auto-target the nearest enemy in front when attacking
    if (inp.usingPad && !(pad && (pad.rx || pad.ry))) {
      const t = this.nearestEnemy(u, 9, true);
      if (t) {
        ctl.aimX = t.x - u.x;
        ctl.aimZ = t.z - u.z;
      }
    }
    const kAtk = inp.down('KeyJ'), kAtkHit = inp.hit('KeyJ');
    ctl.attack = inp.mouse.left || kAtk || (pad && (pad.rt || pad.x));
    ctl.attackPressed = inp.mouse.leftPressed || kAtkHit || (pad && (pad.hit('rt') || pad.hit('x')));
    ctl.attackReleased = inp.mouse.leftReleased || (pad && (pad.released('rt') || pad.released('x')));
    ctl.block = inp.mouse.right || inp.down('KeyK', 'ShiftLeft') || (pad && pad.lt);
    ctl.interact = inp.hit('KeyE', 'KeyF') || (pad && pad.hit('b'));
    ctl.swap = inp.hit('KeyQ') || (pad && pad.hit('y'));
    ctl.jump = inp.hit('Space') || (pad && pad.hit('a'));
    ctl.eat = inp.hit('KeyC') || (pad && pad.hit('lb'));
    return ctl;
  }

  // ---------------------------------------------------------------- frame
  update(dt) {
    if (!this.started) {
      this.time += dt;
      this.terrain.update(this.time);
      updateFlags(this.time);
      this.fx.update(dt);
      this.render();
      return;
    }
    if (this.paused || this.over) {
      this.render();
      return;
    }
    if (this.hitStop > 0) {
      this.hitStop -= dt;
      dt *= 0.25;
    }
    this.time += dt;
    const t = this.time;
    this.pathBudget = 4;
    // units
    for (const u of this.units) {
      if (!u.alive) {
        u.respawn -= dt;
        if (u.respawn <= 0) this.respawnUnit(u);
      }
    }
    const pctl = this.player.isPlayer && this.player.alive ? this.playerControls(dt) : { mx: 0, mz: 0 };
    for (const u of this.units) {
      const ctl = u.brain ? u.brain.update(dt) : pctl;
      // helpers carrying the princess are dragged along by the leader
      if (u.carryingPrincess && u.carryingPrincess.carrier !== u) {
        ctl.mx = ctl.mz = 0;
        ctl.attackPressed = false;
      }
      u.update(dt, ctl);
    }
    this.separate();
    // automatic deposits at stockpiles and owned outposts
    for (const u of this.units) {
      if (!u.alive || !u.carrying || (u.carrying.type !== 'log' && u.carrying.type !== 'ore')) continue;
      const c = CASTLES[u.team];
      let ok = dist(u.x, u.z, c.stockpile.x, c.stockpile.z) < 3.4;
      if (!ok) for (const o of this.outposts) if (o.owner === u.team && dist(u.x, u.z, o.x, o.z) < 3.8) ok = true;
      if (ok) {
        const it = u.carrying;
        const team = this.teams[u.team];
        if (it.type === 'log') team.wood = Math.min(99, team.wood + 1);
        else team.ore = Math.min(99, team.ore + 1);
        this.items.remove(it);
        u.carrying = null;
        u.score += 5;
        this.fx.text(u.x, u.y + 2.6, u.z, it.type === 'log' ? '+1 wood' : '+1 ore', '#ffe9a0', 0.6);
        this.audio?.play('deposit', u);
      }
    }
    this.items.update(dt, t);
    for (const s of this.cakeSpawners) s.update(dt);
    this.projectiles.update(dt);
    for (const p of this.princesses) p.update(dt);
    for (const g of this.gates) g.update(dt, t, this.camera);
    for (const h of this.hatMachines) h.update(dt, t, this.camera);
    for (const c of this.catapults) c.update(dt, t, this.camera);
    for (const o of this.outposts) o.update(dt);
    for (const tr of this.trees) tr.update(dt);
    for (const o of this.ores) o.update(dt);
    for (const to of this.torches) to.update(dt, t);
    this.updateStockpiles();
    this.checkWin(dt);
    this.fx.update(dt);
    this.terrain.update(t);
    updateFlags(t);
    this.updateCamera(dt);
    this.updateHUD(dt);
    this.input.endFrame();
    this.render();
  }

  separate() {
    const us = this.units;
    for (let i = 0; i < us.length; i++) {
      const a = us[i];
      if (!a.alive || a.flying) continue;
      for (let j = i + 1; j < us.length; j++) {
        const b = us[j];
        if (!b.alive || b.flying) continue;
        const dx = b.x - a.x, dz = b.z - a.z;
        const d2 = dx * dx + dz * dz;
        if (d2 > 0.72 * 0.72 || d2 < 1e-6) continue;
        if (a.carryingPrincess && a.carryingPrincess === b.carryingPrincess) continue;
        const d = Math.sqrt(d2), push = (0.72 - d) * 0.5;
        const px = (dx / d) * push, pz = (dz / d) * push;
        if (canStand(a.x - px, a.z - pz, a.team)) {
          a.x -= px;
          a.z -= pz;
        }
        if (canStand(b.x + px, b.z + pz, b.team)) {
          b.x += px;
          b.z += pz;
        }
      }
    }
  }

  updateStockpiles() {
    for (const t of [0, 1]) {
      const sp = this.castleModels[t].stock.userData;
      const w = this.teams[t].wood, o = this.teams[t].ore;
      sp.logs.children.forEach((l, i) => (l.visible = i < w));
      sp.ingots.children.forEach((l, i) => (l.visible = i < o));
    }
  }

  checkWin(dt) {
    let leader = -1;
    for (const t of [0, 1]) {
      const own = this.princesses[t], foe = this.princesses[1 - t];
      const team = this.teams[t];
      if (own.state === 'throne' && foe.state === 'prison') {
        const before = Math.ceil(30 - team.winT);
        team.winT += dt;
        const after = Math.ceil(30 - team.winT);
        if (after !== before && after <= 10) this.audio?.play('tick');
        leader = t;
        if (team.winT >= 30) this.endMatch(t);
      } else team.winT = 0;
    }
    this.winTeam = leader;
  }

  endMatch(team) {
    if (this.over) return;
    this.over = true;
    this.winner = team;
    this.audio?.play(team === this.playerTeam ? 'win' : 'lose');
    this.onEnd?.(team);
  }

  updateCamera(dt) {
    if (this.spectate) {
      this.directT = (this.directT || 0) - dt;
      const carried = this.princesses.find((p) => p.state === 'carried');
      if (carried) this.directed = carried.carrier;
      else if (this.directT <= 0 || !this.directed || !this.directed.alive) {
        this.directT = 9;
        const fighters = this.units.filter((o) => o.alive && o.cls !== 'villager' && this.enemiesNear(o, 10) > 0);
        this.directed = fighters[Math.floor(R() * fighters.length)] || this.units.find((o) => o.alive) || this.player;
      }
      const d = this.directed;
      this.focus.x = lerp(this.focus.x, d.x, 1 - Math.exp(-dt * 1.5));
      this.focus.z = lerp(this.focus.z, d.z, 1 - Math.exp(-dt * 1.5));
      this.placeCamera(dt);
      this.playerRing.visible = this.chargeRing.visible = this.aimMarker.visible = false;
      return;
    }
    const u = this.player;
    let tx = u.x, tz = u.z;
    if (!u.alive && u.corpseT > 2) {
      const c = CASTLES[u.team];
      tx = lerp(u.x, c.spawn.x, clamp((u.corpseT - 2) / 3, 0, 1));
      tz = lerp(u.z, c.spawn.z, clamp((u.corpseT - 2) / 3, 0, 1));
    }
    if (this.camLock) [tx, tz] = this.camLock;
    this.focus.x = lerp(this.focus.x, tx, 1 - Math.exp(-dt * (u.flying ? 10 : 6)));
    this.focus.z = lerp(this.focus.z, tz, 1 - Math.exp(-dt * (u.flying ? 10 : 6)));
    this.focus.y = lerp(this.focus.y, Math.max(0, u.y * 0.6), 1 - Math.exp(-dt * 4));
    this.placeCamera(dt);
    // markers under the player
    this.playerRing.visible = u.alive && !u.flying;
    this.playerRing.position.set(u.x, u.y + 0.04, u.z);
    this.playerRing.rotation.z = this.time * 2;
    const ck = u.charging ? u.chargeK : 0;
    this.chargeRing.visible = ck > 0.02;
    this.chargeRing.position.set(u.x, u.y + 0.05, u.z);
    this.chargeRing.scale.setScalar(0.6 + ck * 1.4);
    this.chargeRing.material.opacity = ck >= 1 ? 0.55 + Math.sin(this.time * 30) * 0.2 : 0.35;
    this.aimMarker.visible = u.alive && !this.input.usingPad;
  }
  placeCamera(dt) {
    const dist = this.opts.camDist ?? 25, pitch = (this.opts.camPitch ?? 52) * (Math.PI / 180);
    const fx = clamp(this.focus.x, -70, 70), fz = clamp(this.focus.z, -33, 31);
    const sh = this.fx ? this.fx.shake : 0;
    const sx = (Math.random() - 0.5) * sh * 0.5, sz = (Math.random() - 0.5) * sh * 0.5;
    this.camera.position.set(fx + sx, this.focus.y + Math.sin(pitch) * dist, fz + Math.cos(pitch) * dist + sz);
    this.camera.lookAt(fx + sx, this.focus.y, fz + sz);
    const sun = this.sun;
    if (sun) {
      sun.position.set(fx - 16, 34, fz + 12);
      sun.target.position.set(fx, 0, fz);
    }
  }

  updateHUD(dt) {
    if (this.spectate) return;
    const u = this.player;
    const ranked = [...this.units].sort((a, b) => b.score - a.score);
    const team = this.teams[u.team];
    const winLeft = this.winTeam >= 0 ? 30 - this.teams[this.winTeam].winT : 0;
    const info = CLASS_INFO[u.cls];
    const alt = u.upgraded;
    const tips = {
      villager: 'Slap to knock items loose',
      worker: alt ? (u.usingAlt ? 'Throw bombs' : 'Chop, mine, build and repair') : 'Chop, mine, build and repair',
      warrior: u.usingAlt ? 'Hold to dash with the glaive' : 'Hold to spin · RMB block',
      ranger: u.usingAlt ? 'Blunderbuss blast' : 'Hold for a piercing shot',
      mage: u.usingAlt ? 'Ice bolts · hold to freeze' : 'Fireballs · hold for a fire ring',
      priest: u.usingAlt ? 'Hold to drain · charge to curse' : 'Hold to heal · charge for area heal',
    };
    const card = u.alive ? `<b>${info.label}${u.usingAlt ? '+' : ''}</b><br>${tips[u.cls]}${alt ? ' · <kbd>Q</kbd> swap' : ''}<br><kbd>E</kbd> grab / drop · <kbd>Space</kbd> jump${u.carrying?.type === 'cake' ? ' · <kbd>C</kbd> eat' : ''}` : '';
    this.hud.update(dt, {
      rank: ranked.indexOf(u) + 1,
      score: u.score,
      hp: u.alive ? u.hp : 0,
      maxHp: u.maxHp,
      wood: team.wood,
      ore: team.ore,
      respawn: u.alive ? 0 : Math.max(0, u.respawn),
      princesses: this.princesses.map((p) => ({ state: p.state, stage: p.stage })),
      winTeam: this.winTeam ?? -1,
      winLeft,
      playerTeam: this.playerTeam,
      classCard: card,
    });
    // prompts near the player
    const prompts = [];
    if (u.alive && !u.flying) {
      if (u.carryingPrincess) prompts.push({ x: u.x, y: u.y + 4.2, z: u.z, key: 'E', label: 'Let go' });
      else if (u.carrying) {
        const cap = this.princesses[1 - u.team];
        if (u.carrying.type === 'cake' && cap.state !== 'carried' && dist(u.x, u.z, cap.x, cap.z) < 2.8) prompts.push({ x: cap.x, y: cap.y + 3.6, z: cap.z, key: 'E', label: 'Feed cake' });
        else prompts.push({ x: u.x, y: u.y + 3.4, z: u.z, key: 'E', label: 'Drop  ·  Click to throw', dim: true });
      } else {
        let done = false;
        for (const p of this.princesses) {
          if (dist(u.x, u.z, p.x, p.z) < 2.2 + p.stage * 0.35 && p.canGrab(u)) {
            prompts.push({ x: p.x, y: p.y + 3.4, z: p.z, key: 'E', label: p.team === u.team ? 'Rescue!' : 'Kidnap!' });
            done = true;
          }
        }
        const cat = this.catapults[u.team];
        if (!done && cat.done && dist(u.x, u.z, cat.x, cat.z) < 2.6) prompts.push({ x: cat.x, y: 2.6, z: cat.z, key: 'E', label: 'Launch!' }), (done = true);
        const it = !done && this.items.nearest(u.x, u.z, 1.8);
        const hm = !done && !it && this.hatMachineNear(u);
        if (hm) prompts.push({ x: hm.plateX, y: 1.9, z: hm.plateZ, key: 'E', label: `${CLASS_INFO[hm.cls].label}${hm.upgraded ? '+' : ''} hat` });
        if (it) {
          const label = it.type === 'hat' ? `${CLASS_INFO[it.cls].label}${it.upgraded ? '+' : ''} hat` : { cake: 'Cake', log: 'Log', ore: 'Ore', bomb: 'Bomb', bigbomb: 'Big bomb', potion: 'Chicken potion' }[it.type];
          prompts.push({ x: it.x, y: it.y + 1.6, z: it.z, key: 'E', label });
        }
      }
    }
    const w = this.renderer.domElement.clientWidth, h = this.renderer.domElement.clientHeight;
    this.hud.prompts(prompts, this.camera, w, h);
    const moving = this.princesses.filter((p) => p.state === 'carried' || p.state === 'dropped').map((p) => ({ x: p.x, y: p.y + 1, z: p.z, team: p.team }));
    this.hud.offscreen(moving, this.camera, w, h);
    this.hud.scoreboard(this.input.down('Tab'), this.units, this.playerTeam);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}

function tick() {
  return new Promise((r) => setTimeout(r, 0));
}
export { NAV, MAP };
