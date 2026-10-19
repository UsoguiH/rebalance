// A soldier on the field: movement, class weapons (tap to attack, hold to charge),
// blocking, carrying, swimming, jumping, status effects, death and respawn.
import * as THREE from 'three';
import { CharModel, CLASS_INFO } from './chars.js';
import { slide, groundY, cellKind, canStand } from './nav.js';
import { clamp, lerp, approachAngle, wrapAngle, dist2, TAU, rng } from './util.js';
import { MAP } from './world.js';

const R = rng(31337);
const CHARGE_TIME = { villager: 0.6, worker: 0.8, warrior: 0.9, ranger: 0.8, mage: 0.8, priest: 0.9 };

export class Unit {
  constructor(game, team, opts = {}) {
    this.game = game;
    this.team = team;
    this.name = opts.name || 'Soldier';
    this.isPlayer = !!opts.isPlayer;
    this.id = opts.id ?? 0;
    this.seed = opts.seed ?? Math.floor(R() * 1e6);
    this.cls = 'villager';
    this.alt = false;
    this.x = 0;
    this.z = 0;
    this.y = 0;
    this.vx = 0;
    this.vz = 0;
    this.jumpY = 0;
    this.jumpV = 0;
    this.yaw = team === 0 ? Math.PI / 2 : -Math.PI / 2;
    this.alive = false;
    this.respawn = 0;
    this.hp = 2;
    this.maxHp = 2;
    this.score = 0;
    this.kills = 0;
    this.deaths = 0;
    this.carrying = null;
    this.cd = 0;
    this.charging = false;
    this.chargeT = 0;
    this.beamUsed = false;
    this.pending = [];
    this.status = { burn: 0, burnBy: null, slow: 0, freeze: 0, curse: 0, aura: 0, flame: 0 };
    this.lastHurt = 99;
    this.restT = 0;
    this.eatT = 0;
    this.swimming = false;
    this.corpseT = 0;
    this.knockX = 0;
    this.knockZ = 0;
    this.stun = 0;
    this.flying = null; // catapult flight
    this.blocking = false;
    this.model = null;
    this.lastAttacker = null;
    this.assistBy = new Map();
    this.spawnProtect = 0;
    this.blockedFor = 0;
  }

  get info() {
    return CLASS_INFO[this.cls];
  }
  get upgraded() {
    return this.cls !== 'villager' && this.game.upgraded(this.team, this.cls);
  }
  get usingAlt() {
    return this.alt && this.upgraded;
  }
  get chargeK() {
    return clamp((this.chargeT - 0.15) / (CHARGE_TIME[this.cls] - 0.15), 0, 1);
  }

  rebuildModel() {
    const old = this.model;
    const anim = old ? old.anim : null;
    this.model = new CharModel(this.team, this.cls, { upgraded: this.upgraded, alt: this.usingAlt, seed: this.seed });
    if (anim) Object.assign(this.model.anim, { run: anim.run });
    this.model.root.position.set(this.x, this.y, this.z);
    this.model.root.rotation.y = this.yaw;
    if (old) {
      this.game.scene.remove(old.root);
      old.dispose();
    }
    this.game.scene.add(this.model.root);
  }

  spawnAt(x, z) {
    this.x = x;
    this.z = z;
    this.y = groundY(x, z);
    this.alive = true;
    this.cls = 'villager';
    this.alt = false;
    this.maxHp = this.hp = this.info.hearts;
    this.status = { burn: 0, burnBy: null, slow: 0, freeze: 0, curse: 0, aura: 0, flame: 0 };
    this.carrying = null;
    this.charging = false;
    this.chargeT = 0;
    this.cd = 0;
    this.pending = [];
    this.flying = null;
    this.corpseT = 0;
    this.spawnProtect = 1.5;
    this.yaw = this.team === 0 ? Math.PI / 2 : -Math.PI / 2;
    this.rebuildModel();
    this.model.root.visible = true;
    this.game.fx.puff(x, this.y + 0.5, z, 4, 1);
  }

  setClass(cls, opts = {}) {
    const oldMax = this.maxHp;
    this.cls = cls;
    this.alt = opts.alt ?? false;
    this.maxHp = this.info.hearts;
    this.hp = clamp(this.hp + (this.maxHp - oldMax), 0.25, this.maxHp);
    if (opts.full) this.hp = this.maxHp;
    this.charging = false;
    this.chargeT = 0;
    this.rebuildModel();
    this.game.fx.puff(this.x, this.y + 1, this.z, 3, 0.9);
  }

  get speed() {
    let s = this.info.speed;
    if (this.carrying) s *= this.carrying.carrySpeed ?? 1;
    if (this.carryingPrincess) s *= this.carryingPrincess.speedFor();
    if (this.status.slow > 0) s *= 0.5;
    if (this.blocking) s *= 0.55;
    if (this.charging && this.chargeT > 0.2) s *= 0.6;
    if (this.swimming) s *= 0.5;
    if (this.eatT > 0) s = 0;
    return s;
  }

  // ---------------------------------------------------------------- per-frame
  update(dt, ctl) {
    const g = this.game;
    const mdl = this.model;
    if (!this.alive) {
      this.corpseT += dt;
      if (mdl) {
        mdl.anim.dead += dt;
        mdl.update(dt, { moving: false });
        if (this.corpseT > 5 && mdl.root.visible) {
          mdl.root.visible = false;
          g.fx.puff(this.x, this.y + 0.3, this.z, 4, 0.9);
        }
      }
      return;
    }
    this.lastHurt += dt;
    this.spawnProtect = Math.max(0, this.spawnProtect - dt);
    if (this.cd > 0) this.cd -= dt;

    // catapult flight overrides everything
    if (this.flying) return this.updateFlight(dt);

    // status effects
    const st = this.status;
    if (st.burn > 0) {
      st.burn -= dt;
      this.hurtRaw(0.45 * dt, st.burnBy, true);
      if (R() < 0.6) g.fx.fire(this.x, this.y + 0.6 + R() * 1.2, this.z, 0.6);
      if (this.swimming) st.burn = 0;
      if (!this.alive) return;
    }
    if (st.slow > 0) {
      st.slow -= dt;
      if (R() < 0.25) g.fx.ice(this.x, this.y + 1, this.z, 0.3);
    }
    if (st.freeze > 0) st.freeze -= dt;
    if (st.curse > 0) st.curse -= dt;
    if (st.aura > 0) st.aura -= dt;
    if (st.flame > 0) {
      st.flame -= dt;
      if (R() < 0.4 && mdl.weaponR) {
        const p = mdl.weaponR.getWorldPosition(new THREE.Vector3());
        g.fx.fire(p.x, p.y + 0.4, p.z, 0.45);
      }
    }
    if (this.stun > 0) this.stun -= dt;
    const frozen = st.freeze > 0;

    // eating cake (sitting)
    if (this.eatT > 0) {
      this.eatT -= dt;
      this.heal(1.3 * dt, null, true);
      if (R() < 0.15) g.fx.sparkle(this.x, this.y + 1.6, this.z, 0xffe0f0);
      if (this.eatT <= 0) mdl.anim.sit = 0;
    }

    // ------------------------------------------------ movement
    let mx = ctl.mx || 0, mz = ctl.mz || 0;
    if (st.curse > 0) {
      const a = Math.sin(g.time * 3 + this.id) * 2.2;
      const c = Math.cos(a), s = Math.sin(a);
      [mx, mz] = [mx * c - mz * s, mx * s + mz * c];
    }
    if (frozen || this.stun > 0 || this.eatT > 0) mx = mz = 0;
    const len = Math.hypot(mx, mz);
    if (len > 1) {
      mx /= len;
      mz /= len;
    }
    const sp = this.speed;
    const tvx = mx * sp, tvz = mz * sp;
    const acc = 1 - Math.exp(-dt * 14);
    this.vx = lerp(this.vx, tvx, acc);
    this.vz = lerp(this.vz, tvz, acc);
    let dx = (this.vx + this.knockX) * dt, dz = (this.vz + this.knockZ) * dt;
    this.knockX *= Math.exp(-dt * 8);
    this.knockZ *= Math.exp(-dt * 8);
    const noWater = !!this.carryingPrincess;
    if (Math.abs(dx) + Math.abs(dz) > 1e-5) {
      const [nx, nz, blocked] = slide(this.x, this.z, dx, dz, this.team, noWater, 0.32);
      this.blockedFor = blocked && len > 0.3 ? this.blockedFor + dt : 0;
      this.x = nx;
      this.z = nz;
    }
    // ground, water and jumping
    const gy = groundY(this.x, this.z);
    const kind = cellKind(this.x, this.z);
    const wasSwim = this.swimming;
    this.swimming = kind === 2 && this.jumpY <= 0.01;
    if (this.swimming && !wasSwim) {
      g.fx.splash(this.x, this.z, true);
      g.audio?.play('splash', this);
      if (this.carrying && this.carrying.type !== 'cake') g.dropCarried(this);
    }
    if (ctl.jump && this.jumpY <= 0.01 && !this.swimming && !frozen && this.eatT <= 0) {
      this.jumpV = 7.2;
      g.audio?.play('jump', this);
    }
    if (this.jumpY > 0 || this.jumpV > 0) {
      this.jumpV -= 24 * dt;
      this.jumpY = Math.max(0, this.jumpY + this.jumpV * dt);
      if (this.jumpY === 0) {
        this.jumpV = 0;
        g.fx.dust(this.x, this.z, 3);
      }
    }
    // smooth vertical follow (stairs) plus the hop
    this.y = lerp(this.y, gy, 1 - Math.exp(-dt * 20)) ;
    if (gy < -6) this.fallOff();
    if (!this.alive) return;

    // facing
    const moving = len > 0.15;
    let wantYaw = this.yaw;
    const aiming = ctl.aimX !== undefined && (ctl.aimX || ctl.aimZ);
    if ((this.charging || ctl.attack || this.blocking || mdl.anim.swing >= 0 || ctl.faceAim) && aiming) wantYaw = Math.atan2(ctl.aimX, ctl.aimZ);
    else if (moving) wantYaw = Math.atan2(mx, mz);
    else if (aiming && ctl.faceAim !== false && this.isPlayer) wantYaw = Math.atan2(ctl.aimX, ctl.aimZ);
    if (!frozen) this.yaw = approachAngle(this.yaw, wantYaw, dt * 14);

    // footsteps
    if (moving && !this.swimming && this.jumpY === 0 && R() < dt * 6) g.fx.dust(this.x - Math.sin(this.yaw) * 0.3, this.z - Math.cos(this.yaw) * 0.3, 1);
    if (this.swimming && moving && R() < dt * 5) g.fx.splash(this.x, this.z, false);

    // ------------------------------------------------ actions
    if (!frozen && this.stun <= 0 && this.eatT <= 0 && !this.swimming) this.actions(dt, ctl);
    else {
      this.charging = false;
      this.chargeT = 0;
      this.blocking = false;
    }

    // resting regeneration
    if (!moving && !this.charging && this.lastHurt > 4 && this.hp < this.maxHp && mdl.anim.swing < 0) {
      this.restT += dt;
      if (this.restT > 1.5) this.heal(0.28 * dt, null, true);
    } else this.restT = 0;

    // pending hit events (damage lands mid-swing)
    for (let i = this.pending.length - 1; i >= 0; i--) {
      const p = this.pending[i];
      p.t -= dt;
      if (p.t <= 0) {
        this.pending.splice(i, 1);
        if (this.alive) p.fn();
      }
    }

    // ------------------------------------------------ animate
    const a = mdl.anim;
    if (a.swing >= 0) {
      a.swing += dt / (a.swingDur || 0.35);
      if (a.swing >= 1) a.swing = -1;
    }
    a.charge = this.charging ? this.chargeK : Math.max(0, a.charge - dt * 6);
    a.carry = lerp(a.carry, this.carrying || this.carryingPrincess ? 1 : 0, 1 - Math.exp(-dt * 12));
    a.swim = lerp(a.swim, this.swimming ? 1 : 0, 1 - Math.exp(-dt * 8));
    a.block = lerp(a.block, this.blocking ? 1 : 0, 1 - Math.exp(-dt * 16));
    a.sit = lerp(a.sit, this.eatT > 0 || this.restT > 3 ? 1 : 0, 1 - Math.exp(-dt * 8));
    mdl.update(dt, { moving: moving && !frozen, speedMul: sp / 5.5, mood: this.isPlayer ? 'angry' : 'angry', groundOffset: -this.jumpY });
    mdl.root.position.set(this.x, this.y + this.jumpY, this.z);
    mdl.root.rotation.y = this.yaw;
    if (frozen) mdl.mat.emissive.setRGB(0.25, 0.45, 0.6);
    else if (mdl.flash <= 0 && st.curse > 0) mdl.mat.emissive.setRGB(0.25, 0.05, 0.3);
    else if (mdl.flash <= 0) mdl.mat.emissive.setRGB(st.aura > 0 ? 0.18 : 0, st.aura > 0 ? 0.18 : 0, st.aura > 0 ? 0.1 : 0);
  }

  actions(dt, ctl) {
    const g = this.game;
    const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);

    if (ctl.swap && this.upgraded) {
      this.alt = !this.alt;
      this.rebuildModel();
      g.audio?.play('swap', this);
    }
    if (ctl.interact) g.interact(this);
    if (ctl.eat && this.carrying && this.carrying.type === 'cake' && this.hp < this.maxHp) {
      g.items.remove(this.carrying);
      this.carrying = null;
      this.eatT = 1.6;
      g.audio?.play('munch', this);
    }

    this.blocking = this.cls === 'warrior' && !this.usingAlt && !!ctl.block && !this.carrying && !this.carryingPrincess;

    // carrying: the attack button throws what you hold
    if (this.carrying) {
      if (ctl.attackPressed) g.throwCarried(this, ctl);
      this.charging = false;
      return;
    }
    if (this.carryingPrincess) {
      this.charging = false;
      return;
    }

    // priest beams work while the button is held
    if (this.cls === 'priest' && ctl.attack && this.cd <= 0) {
      const target = this.usingAlt ? g.nearestEnemy(this, 6.5, true) : g.nearestHurtAlly(this, 7.5);
      if (target && this.chargeT > 0.12) {
        this.beamUsed = true;
        if (this.usingAlt) {
          g.damage(target, 0.75 * dt, this, { noFlash: true, kind: 'drain', quiet: true });
          this.heal(0.4 * dt, null, true);
          g.fx.beam('beam' + this.id, this.x, this.y + 1.2, this.z, target.x, target.y + 1.0, target.z, 0xb060ff);
        } else {
          target.heal(0.85 * dt, this);
          if (target.hp >= target.maxHp) target.status.aura = Math.max(target.status.aura, 6);
          g.fx.beam('beam' + this.id, this.x, this.y + 1.4, this.z, target.x, target.y + 1.0, target.z, 0x9dffb0);
        }
        this.yaw = approachAngle(this.yaw, Math.atan2(target.x - this.x, target.z - this.z), dt * 10);
      }
    }

    if (ctl.attackPressed && this.cd <= 0 && !this.blocking) {
      this.charging = true;
      this.chargeT = 0;
      this.beamUsed = false;
    }
    if (this.charging) {
      if (ctl.attack) {
        this.chargeT += dt;
        if (this.chargeK >= 1 && !this.chargedNotified) {
          this.chargedNotified = true;
          g.fx.sparkle(this.x, this.y + 1.5, this.z, 0xfff080, 4);
          g.audio?.play('charged', this);
        }
      }
      if (!ctl.attack || ctl.attackReleased) {
        const charged = this.chargeK >= 1;
        this.charging = false;
        this.chargedNotified = false;
        if (!(this.cls === 'priest' && this.beamUsed)) this.attack(charged, fx, fz, ctl);
        this.chargeT = 0;
      }
    }
  }

  swing(kind, dur, cd) {
    const a = this.model.anim;
    a.swing = 0;
    a.swingKind = kind;
    a.swingDur = dur;
    this.cd = cd;
  }
  later(t, fn) {
    this.pending.push({ t, fn });
  }

  // ---------------------------------------------------------------- attacks
  attack(charged, fx, fz, ctl) {
    const g = this.game;
    const aimX = ctl.aimX ?? fx, aimZ = ctl.aimZ ?? fz;
    const al = Math.hypot(aimX, aimZ) || 1;
    const ax = aimX / al, az = aimZ / al;
    this.yaw = Math.atan2(ax, az);
    const flame = this.status.flame > 0;
    switch (this.cls) {
      case 'villager':
        this.swing('slap', 0.3, 0.38);
        this.later(0.08, () => g.melee(this, 1.35, 1.6, 0.25, { slap: true, knock: 3 }));
        g.audio?.play('swing', this);
        break;
      case 'worker':
        if (this.usingAlt) {
          this.swing('throw', 0.4, charged ? 0.9 : 0.7);
          this.later(0.15, () => g.throwBomb(this, ax, az, charged ? 1.45 : 1));
        } else {
          this.swing('chop', 0.4, 0.5);
          this.later(0.17, () => g.melee(this, 1.7, 1.9, charged ? 2 : 1, { tool: true, knock: charged ? 6 : 3, burn: flame, charged }));
          g.audio?.play('swing', this);
        }
        break;
      case 'warrior':
        if (this.usingAlt) {
          if (charged) {
            // glaive dash: rush forward, striking everything on the way
            this.swing('thrust', 0.5, 0.9);
            g.dash(this, ax, az, 7, 2.5);
          } else {
            this.swing('chop', 0.5, 0.75);
            this.later(0.2, () => g.melee(this, 2.5, 1.5, 1.75, { knock: 4, burn: flame }));
            g.audio?.play('swing', this);
          }
        } else if (charged) {
          this.swing('spin', 0.45, 0.8);
          this.later(0.12, () => g.melee(this, 2.5, TAU, 2, { knock: 6, burn: flame, spin: true }));
          g.audio?.play('spin', this);
        } else {
          this.swing('chop', 0.36, 0.42);
          this.later(0.13, () => g.melee(this, 1.9, 1.7, 1.25, { knock: 3, burn: flame }));
          g.audio?.play('swing', this);
        }
        break;
      case 'ranger':
        if (this.usingAlt) {
          this.swing('gun', 0.4, charged ? 1.6 : 1.3);
          const n = 6, spread = charged ? 0.18 : 0.42;
          for (let i = 0; i < n; i++) {
            const a = Math.atan2(ax, az) + (i / (n - 1) - 0.5) * spread + (R() - 0.5) * 0.06;
            g.projectiles.fire('pellet', this, this.x + ax * 0.7, this.y + 1.0, this.z + az * 0.7, Math.sin(a), Math.cos(a), { dmg: charged ? 0.7 : 0.55, range: charged ? 12 : 9, burn: flame, knock: 2 });
          }
          g.fx.puff(this.x + ax * 1.4, this.y + 1.0, this.z + az * 1.4, 3, 0.7, 0xdddddd);
          g.fx.hitStar(this.x + ax * 1.3, this.y + 1.0, this.z + az * 1.3, 0xffd040, 1.0);
          g.fx.addShake(this.isPlayer ? 0.25 : 0);
          g.audio?.play('gun', this);
        } else {
          this.swing('shoot', 0.3, charged ? 0.55 : 0.42);
          g.projectiles.fire('arrow', this, this.x + ax * 0.6, this.y + 1.05, this.z + az * 0.6, ax, az, { dmg: charged ? 2 : 0.75, range: charged ? 24 : 18, pierce: charged ? 2 : 0, burn: flame, speed: charged ? 38 : 30 });
          g.audio?.play('bow', this);
        }
        break;
      case 'mage':
        if (charged) {
          this.swing('cast', 0.5, 1.0);
          this.later(0.2, () => g.areaSpell(this, this.usingAlt ? 'freeze' : 'firering', 3.8));
        } else {
          this.swing('cast', 0.35, 0.5);
          g.projectiles.fire(this.usingAlt ? 'ice' : 'fire', this, this.x + ax * 0.8, this.y + 1.3, this.z + az * 0.8, ax, az, { dmg: 0.75, range: 15, burn: !this.usingAlt, slow: this.usingAlt });
          g.audio?.play(this.usingAlt ? 'ice' : 'fire', this);
        }
        break;
      case 'priest':
        if (charged) {
          this.swing('cast', 0.5, 1.0);
          this.later(0.2, () => g.areaSpell(this, this.usingAlt ? 'curse' : 'heal', 5));
        } else {
          this.swing('chop', 0.35, 0.45);
          this.later(0.12, () => g.melee(this, 1.7, 1.5, 0.5, { knock: 2 }));
          g.audio?.play('swing', this);
        }
        break;
    }
  }

  // ---------------------------------------------------------------- health
  hurtRaw(amount, by, quiet) {
    if (!this.alive) return;
    this.hp -= amount;
    this.lastHurt = 0;
    if (by && by !== this) {
      this.lastAttacker = by;
      this.assistBy.set(by, this.game.time);
    }
    if (this.hp <= 0.001) this.game.kill(this, by);
  }
  heal(amount, by, quiet) {
    if (!this.alive || this.hp >= this.maxHp) return 0;
    const before = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    const got = this.hp - before;
    if (by) {
      by.healAcc = (by.healAcc || 0) + got;
      if (by.healAcc >= 1) {
        by.healAcc -= 1;
        by.score += 2;
        this.game.fx.text(this.x, this.y + 2.6, this.z, '+1', '#7dff6a', 0.7);
        this.game.feed?.heal(by, this);
      }
    }
    return got;
  }

  fallOff() {
    this.game.kill(this, this.lastAttacker && this.lastHurt < 5 ? this.lastAttacker : null, { fell: true });
  }

  // ---------------------------------------------------------------- catapult flight
  updateFlight(dt) {
    const f = this.flying;
    f.t += dt;
    const k = Math.min(1, f.t / f.dur);
    this.x = lerp(f.x0, f.x1, k);
    this.z = lerp(f.z0, f.z1, k);
    this.y = lerp(f.y0, f.y1, k) + Math.sin(k * Math.PI) * f.h;
    const mdl = this.model;
    mdl.root.position.set(this.x, this.y, this.z);
    mdl.root.rotation.y = this.yaw;
    mdl.body.rotation.x = k * TAU * 1.5;
    if (R() < 0.5) this.game.fx.puff(this.x, this.y + 0.8, this.z, 1, 0.5);
    if (k >= 1) {
      this.flying = null;
      mdl.body.rotation.x = 0;
      this.y = groundY(this.x, this.z);
      if (!canStand(this.x, this.z, this.team)) {
        // nudge onto standable ground
        for (let r = 0.5; r < 6; r += 0.5) {
          let ok = false;
          for (let a = 0; a < TAU; a += 0.5) {
            const px = this.x + Math.cos(a) * r, pz = this.z + Math.sin(a) * r;
            if (canStand(px, pz, this.team)) {
              this.x = px;
              this.z = pz;
              ok = true;
              break;
            }
          }
          if (ok) break;
        }
        this.y = groundY(this.x, this.z);
      }
      this.game.fx.puff(this.x, this.y + 0.3, this.z, 6, 1.2);
      this.game.fx.addShake(this.isPlayer ? 0.5 : 0);
      this.game.melee(this, 2.2, TAU, 1, { knock: 7, landing: true });
      this.game.audio?.play('land', this);
    }
  }
}

export { wrapAngle, dist2, MAP };
