// Car: arcade vehicle physics (grip/drift, turbo, ramps and airtime, slope walls),
// health/turbo/energy, status effects (frozen, shielded, burning, stalled, invisible),
// and the visual rig (wheel spin/steer/suspension, body roll and pitch, lights).
import * as THREE from 'three';
import { clamp, lerp, damp, wrapAngle, R, G, bus } from './core.js';
import { buildVehicle, byId } from './vehicles.js';

const MPH = 0.44704;
// game speed scale: real mph feel too slow in a town this size, so the garage numbers are
// mapped onto m/s with a little boost
const SPEED_SCALE = 0.52;
const GRAV = 24;
const _v = new THREE.Vector3();
const _f = new THREE.Vector3();
const _r = new THREE.Vector3();
const contacts = [];

export const PICKUP_WEAPONS = ['fire', 'homing', 'power', 'napalm', 'ricochet', 'remote', 'stalker', 'shotgun', 'sniper'];

let uid = 0;
export class Car {
  constructor(defId, { name, isPlayer = false, team = 0, color } = {}) {
    this.id = ++uid;
    this.def = byId[defId];
    this.name = name || this.def.name;
    this.isPlayer = isPlayer;
    this.team = team;
    this.markerColor = color || '#d8241c';
    const m = buildVehicle(defId, G.envMap);
    this.model = m;
    this.root = m.root;
    G.scene.add(this.root);
    const d = this.def;
    this.maxHp = d.hp;
    this.hp = d.hp;
    this.mass = d.mass;
    this.top = d.mph[0] * MPH * SPEED_SCALE * 1.6;
    this.turboTop = d.mph[1] * MPH * SPEED_SCALE * 1.6;
    this.length = d.size[2];
    this.width = d.size[0];
    this.height = d.size[1];
    this.radius = Math.max(this.width * 0.55, d.bike ? 0.6 : 0.9);
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.yaw = 0;
    this.yawRate = 0;
    this.pitch = 0;
    this.roll = 0;
    this.visPitch = 0;
    this.visRoll = 0;
    this.bodyLean = 0;
    this.bodyDip = 0;
    this.steerVis = 0;
    this.onGround = true;
    this.airTime = 0;
    this.speed = 0;
    this.fwdSpeed = 0;
    this.alive = false;
    this.turbo = 100;
    this.energy = 100;
    this.boosting = false;
    this.drifting = false;
    this.frozen = 0;
    this.shield = 0;
    this.burning = 0;
    this.burnSource = null;
    this.stalled = 0;
    this.stallTaps = 0;
    this.invisible = 0;
    this.protect = 0;
    this.ramBoost = 0;
    this.kills = 0;
    this.deaths = 0;
    this.score = 0;
    this.lives = 3;
    this.lastHitBy = null;
    this.lastHitTime = -99;
    this.hitFlash = 0;
    this.deadTime = 0;
    this.wreck = null;
    this.healing = 0;
    this.weapons = Object.fromEntries(PICKUP_WEAPONS.map((w) => [w, 0]));
    this.special = d.special.ammo;
    this.specialRegen = 0;
    this.fuel = 100; // for fuel-style specials (flamethrower, turret)
    this.selected = 'special';
    this.mgAmmo = 100;
    this.mgHeat = 0;
    this.ctrl = null;
    this.prevPos = new THREE.Vector3();
    this.accelVec = new THREE.Vector3();
    this.lastGroundY = 0;
    this.forward = new THREE.Vector3(0, 0, 1);
    this.right = new THREE.Vector3(-1, 0, 0);
    this.mechT = 0;
    this.target = null;
    this.skid = 0;
    this.engineLoad = 0;
  }

  spawn(x, z, yaw) {
    this.pos.set(x, G.world.groundHeight(x, z, 50) + 0.05, z);
    this.vel.set(0, 0, 0);
    this.yaw = yaw;
    this.yawRate = 0;
    this.hp = this.maxHp;
    this.turbo = 100;
    this.energy = 100;
    this.alive = true;
    this.frozen = this.shield = this.burning = this.stalled = this.invisible = 0;
    this.protect = 3;
    this.special = this.def.special.ammo;
    this.fuel = 100;
    this.mgAmmo = 100;
    for (const k in this.weapons) this.weapons[k] = 0;
    this.weapons.fire = 2;
    this.weapons.homing = 1;
    this.selected = 'special';
    this.root.visible = true;
    this.setWrecked(false);
    this.lastHitBy = null;
    this.onGround = true;
    this.updateVisual(0);
  }

  get hpFrac() {
    return clamp(this.hp / this.maxHp, 0, 1);
  }
  get facing() {
    return this.forward;
  }

  damage(amount, source, weaponName = '') {
    if (!this.alive || amount <= 0) return 0;
    if (this.protect > 0) return 0;
    if (this.shield > 0) {
      bus.emit('shieldHit', this, source);
      return 0;
    }
    const dmg = amount;
    this.hp -= dmg;
    this.hitFlash = 1;
    if (source && source !== this) {
      this.lastHitBy = source;
      this.lastHitTime = G.time;
    }
    bus.emit('damage', this, dmg, source, weaponName);
    if (this.hp <= 0) this.die(source, weaponName);
    return dmg;
  }
  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }
  die(source, weaponName) {
    if (!this.alive) return;
    this.alive = false;
    this.hp = 0;
    this.deaths++;
    this.deadTime = 0;
    const killer = source && source !== this ? source : this.lastHitBy && G.time - this.lastHitTime < 8 ? this.lastHitBy : null;
    if (killer) killer.kills++;
    this.vel.y = 9;
    this.yawRate = (R() - 0.5) * 4;
    this.setWrecked(true);
    bus.emit('death', this, killer, weaponName);
  }
  setWrecked(on) {
    this.root.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      if (on) {
        if (!o.userData.origMat) o.userData.origMat = o.material;
        o.material = WRECK;
      } else if (o.userData.origMat) {
        o.material = o.userData.origMat;
      }
    });
  }

  // ---------- physics ----------
  update(dt, ctrl) {
    this.ctrl = ctrl;
    const d = this.def;
    // timers
    this.protect = Math.max(0, this.protect - dt);
    this.shield = Math.max(0, this.shield - dt);
    this.invisible = Math.max(0, this.invisible - dt);
    this.hitFlash = Math.max(0, this.hitFlash - dt * 3);
    if (this.frozen > 0) this.frozen = Math.max(0, this.frozen - dt);
    if (this.burning > 0) {
      this.burning -= dt;
      this.damage(6 * dt, this.burnSource, 'Fire');
    }
    if (this.stalled > 0) {
      this.stalled -= dt;
      if (ctrl.throttle && !this._stallHeld) this.stallTaps++;
      this._stallHeld = !!ctrl.throttle;
      if (this.stallTaps > 5) this.stalled = 0;
    } else this.stallTaps = 0;
    this.energy = Math.min(100, this.energy + dt * 5.5);
    if (!this.boosting) this.turbo = Math.min(100, this.turbo + dt * 6);
    this.mgAmmo = Math.min(100, this.mgAmmo + dt * (ctrl.mg ? 0 : 14));
    // special regen
    const sp = d.special;
    if (sp.fuel) {
      if (!ctrl.fireHeld || this.selected !== 'special') this.fuel = Math.min(100, this.fuel + dt * sp.regen);
    } else if (this.special < sp.ammo) {
      this.specialRegen += dt;
      if (this.specialRegen >= sp.regen) {
        this.special++;
        this.specialRegen = 0;
      }
    } else this.specialRegen = 0;

    if (!this.alive) {
      this.deadTime += dt;
      this.integrateDead(dt);
      this.updateVisual(dt);
      return;
    }

    const disabled = this.frozen > 0 || this.stalled > 0;
    let throttle = disabled ? 0 : ctrl.throttle;
    let brake = disabled ? 0 : ctrl.brake;
    let steer = disabled ? 0 : ctrl.steer;
    const handbrake = !disabled && ctrl.handbrake;
    this.boosting = !disabled && ctrl.turbo && this.turbo > 1 && (throttle > 0 || this.boosting);
    if (this.boosting) this.turbo = Math.max(0, this.turbo - dt * 26);

    // basis
    const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
    this.forward.set(sy, 0, cy);
    this.right.set(-cy, 0, sy);
    let vf = this.vel.x * sy + this.vel.z * cy;
    let vr = this.vel.x * -cy + this.vel.z * sy;
    const top = this.boosting ? this.turboTop : this.top;
    const mech = this.mechT > 0;

    if (this.onGround) {
      // engine / brakes
      const acc = d.accel * (this.boosting ? 1.6 : 1) * (mech ? 0.5 : 1);
      if (throttle > 0) {
        if (vf < -0.5) vf += 40 * dt;
        else {
          const k = clamp(1 - (vf / top) ** 2, -1, 1);
          vf += acc * throttle * k * dt;
          if (vf > top) vf = damp(vf, top, 2, dt);
        }
      } else if (brake > 0) {
        if (vf > 0.6) vf -= 34 * dt;
        else {
          const rev = this.boosting ? -this.top * 0.8 : -15;
          vf = Math.max(rev, vf - (this.boosting ? acc : 14) * dt);
        }
      } else vf = damp(vf, 0, 0.45, dt);
      if (this.ramBoost > 0) {
        vf = Math.max(vf, this.turboTop * 1.05);
        this.ramBoost -= dt;
      }
      // slope gravity
      vf += GRAV * 0.5 * Math.sin(this.pitch) * dt;
      // lateral grip
      const grip = handbrake ? 1.6 : d.grip * (this.boosting ? 0.85 : 1);
      vr = damp(vr, 0, grip, dt);
      this.drifting = Math.abs(vr) > 3.5 && Math.abs(vf) > 8;
      // steering
      const sf = clamp(Math.abs(vf) / 5, 0, 1) * (1 - 0.42 * clamp(Math.abs(vf) / this.turboTop, 0, 1));
      let target = -steer * d.turn * sf * Math.sign(vf || 1) * (handbrake ? 1.55 : 1);
      if (mech) target *= 0.8;
      this.yawRate = damp(this.yawRate, target, 10, dt);
      // drift carries some sideways momentum into the slide
      if (handbrake && Math.abs(vf) > 6) vf = damp(vf, vf * 0.96, 2, dt);
    } else {
      // air control
      this.yawRate = damp(this.yawRate, -steer * 1.2, 2, dt);
    }
    this.yaw = wrapAngle(this.yaw + this.yawRate * dt);
    // recompose (keep vertical)
    const s2 = Math.sin(this.yaw), c2 = Math.cos(this.yaw);
    const vy = this.vel.y;
    if (this.onGround) {
      // when the heading changes, rotate the forward speed with it (grip) but keep the slide
      this.vel.set(s2 * vf + -c2 * vr, vy, c2 * vf + s2 * vr);
    }
    this.fwdSpeed = vf;
    this.speed = Math.hypot(this.vel.x, this.vel.z);
    this.skid = this.onGround ? clamp((Math.abs(vr) - 2) / 6, 0, 1) + (brake && vf > 8 ? 0.6 : 0) : 0;
    this.engineLoad = throttle;

    // integrate
    this.prevPos.copy(this.pos);
    if (!this.onGround) this.vel.y -= GRAV * dt;
    this.pos.addScaledVector(this.vel, dt);

    // ground
    this.groundCheck(dt);
    // static collisions
    this.collideStatic(dt);
    this.updateVisual(dt);
  }

  groundCheck(dt) {
    const w = G.world;
    const hl = this.length * 0.38, hw = this.width * 0.42;
    const s = Math.sin(this.yaw), c = Math.cos(this.yaw);
    const yq = this.pos.y + 0.6;
    const pf = (lx, lz) => w.groundHeight(this.pos.x + lz * s - lx * c, this.pos.z + lz * c + lx * s, yq);
    const fl = pf(hw, hl), fr = pf(-hw, hl), bl = pf(hw, -hl), br = pf(-hw, -hl);
    const gy = Math.max((fl + fr + bl + br) / 4, w.groundHeight(this.pos.x, this.pos.z, yq));
    // walls: ground rising too fast is a cliff/ledge, not a slope
    if (gy - this.pos.y > 0.75 && this.onGround) {
      this.pos.x = this.prevPos.x;
      this.pos.z = this.prevPos.z;
      const n = _v.set(this.vel.x, 0, this.vel.z).normalize();
      const vn = this.vel.x * n.x + this.vel.z * n.z;
      this.vel.x -= n.x * vn * 1.3;
      this.vel.z -= n.z * vn * 1.3;
      if (vn > 10) bus.emit('impact', this, vn, this.pos);
      return;
    }
    const targetPitch = Math.atan2((bl + br) / 2 - (fl + fr) / 2, hl * 2);
    const targetRoll = Math.atan2((fl + bl) / 2 - (fr + br) / 2, hw * 2);
    const stick = 0.25 + Math.abs(this.fwdSpeed) * 0.012;
    if (this.onGround) {
      if (this.pos.y - gy > stick && this.vel.y > -1) {
        // left the ground (ramp lip or ledge)
        this.onGround = false;
        this.airTime = 0;
      } else {
        const vy = (gy - this.lastGroundY) / Math.max(dt, 1e-3);
        this.vel.y = clamp(vy, -30, 30);
        this.pos.y = gy;
        this.pitch = damp(this.pitch, targetPitch, 14, dt);
        this.roll = damp(this.roll, -targetRoll, 14, dt);
      }
    } else {
      this.airTime += dt;
      this.pitch = damp(this.pitch, -this.vel.y * 0.012, 1.5, dt);
      this.roll = damp(this.roll, 0, 1.5, dt);
      if (this.pos.y <= gy) {
        const impact = -this.vel.y;
        this.pos.y = gy;
        this.onGround = true;
        this.vel.y = 0;
        this.bodyDip = clamp(impact * 0.025, 0, 0.35);
        if (impact > 6) bus.emit('land', this, impact);
        if (impact > 24) this.damage((impact - 24) * 1.2, null, 'Fall');
      }
    }
    this.lastGroundY = this.onGround ? this.pos.y : gy;
  }

  collideStatic(dt) {
    const w = G.world;
    const hl = this.length * 0.5 - this.radius * 0.8;
    const s = Math.sin(this.yaw), c = Math.cos(this.yaw);
    const n = Math.max(1, Math.round((hl * 2) / (this.radius * 1.2)) + 1);
    let hit = null;
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0 : -hl + (2 * hl * i) / (n - 1);
      _v.set(this.pos.x + s * t, 0, this.pos.z + c * t);
      const bx = _v.x, bz = _v.z;
      w.collideCircle(_v, this.radius, this.pos.y + 0.2, this.height, contacts);
      if (contacts.length) {
        this.pos.x += _v.x - bx;
        this.pos.z += _v.z - bz;
        for (const ct of contacts) {
          const vn = this.vel.x * ct.nx + this.vel.z * ct.nz;
          if (vn < 0) {
            this.vel.x -= ct.nx * vn * 1.25;
            this.vel.z -= ct.nz * vn * 1.25;
            // twist the car away from the wall depending on which end hit
            const tw = t / Math.max(hl, 0.1);
            this.yawRate += (ct.nx * c - ct.nz * s) * -vn * 0.02 * tw;
            if (!hit || -vn > hit.v) hit = { v: -vn, nx: ct.nx, nz: ct.nz, x: bx - ct.nx * this.radius, z: bz - ct.nz * this.radius };
          }
        }
      }
    }
    if (hit && hit.v > 4) {
      bus.emit('impact', this, hit.v, new THREE.Vector3(hit.x, this.pos.y + 0.7, hit.z));
      if (hit.v > 16) this.damage((hit.v - 16) * 0.5, null, 'Wall');
    }
  }

  integrateDead(dt) {
    this.vel.y -= GRAV * dt;
    this.pos.addScaledVector(this.vel, dt);
    this.yaw += this.yawRate * dt;
    const gy = G.world.groundHeight(this.pos.x, this.pos.z, this.pos.y + 1);
    if (this.pos.y < gy) {
      this.pos.y = gy;
      if (this.vel.y < -4) this.vel.y *= -0.3;
      else this.vel.y = 0;
      this.vel.x *= 0.9;
      this.vel.z *= 0.9;
      this.yawRate *= 0.8;
    }
    this.roll = damp(this.roll, 0.6, 2, dt);
  }

  // ---------- visuals ----------
  updateVisual(dt) {
    const m = this.model;
    const root = this.root;
    root.position.copy(this.pos);
    // body dynamics: lean into turns, dip on braking / landing
    const latAcc = this.yawRate * this.fwdSpeed;
    const bike = this.def.bike;
    this.bodyLean = damp(this.bodyLean, clamp(latAcc * (bike ? -0.03 : 0.006), bike ? -0.6 : -0.09, bike ? 0.6 : 0.09), 6, dt);
    const accel = this.ctrl ? (this.ctrl.throttle ? -0.025 : this.ctrl.brake && this.fwdSpeed > 2 ? 0.04 : 0) : 0;
    this.bodyDip = damp(this.bodyDip, 0, 5, dt);
    this.visPitch = damp(this.visPitch, this.pitch + (this.onGround ? accel : 0), 10, dt);
    this.visRoll = damp(this.visRoll, this.roll, 10, dt);
    root.rotation.set(this.visPitch, this.yaw, this.visRoll + (bike ? this.bodyLean : 0), 'YXZ');
    m.body.rotation.z = bike ? 0 : this.bodyLean;
    m.body.rotation.x = accel * 0.6 + this.bodyDip * 0.3;
    m.body.position.y = -this.bodyDip;
    // wheels
    const steer = this.ctrl && this.alive ? this.ctrl.steer : 0;
    this.steerVis = damp(this.steerVis, -steer * 0.42, 10, dt);
    for (const w of m.wheels) {
      w.spin.rotation.x += (this.fwdSpeed / w.r) * dt;
      if (w.steer) w.pivot.rotation.y = this.steerVis;
      w.pivot.position.y = w.baseY + (this.onGround ? 0 : -0.12);
    }
    // special visuals
    const p = m.parts;
    if (p.spring && p.head) {
      p.head.position.y = 0.95 + Math.sin(G.time * 9) * 0.04 * (this.speed > 2 ? 1 : 0.2);
      p.head.rotation.z = Math.sin(G.time * 5) * 0.05 * this.speed * 0.05;
    }
    if (p.lightbar) {
      const ph = Math.floor(G.time * 6) % 2;
      p.lightbar.forEach((l, i) => (l.visible = (i < 2) === !!ph));
    }
    if (p.beacon) p.beacon.rotation.y += dt * 8;
    if (p.turret && this.turretYaw !== undefined) p.turret.rotation.y = this.turretYaw;
    // freeze/shield/invisible looks
    const inv = this.invisible > 0;
    if (inv !== this._inv) {
      this._inv = inv;
      root.traverse((o) => {
        if (o.isMesh && o.material) {
          if (inv) {
            o.userData.preInvis = o.material;
            o.material = GHOST;
          } else if (o.userData.preInvis) o.material = o.userData.preInvis;
        }
      });
    }
    // headlights intensity flicker on damage
    const hl = this.hpFrac < 0.25 ? (Math.sin(G.time * 30) > 0 ? 1 : 0.2) : 1;
    for (const l of m.headLights) l.visible = this.alive && hl > 0.5;
    for (const l of m.tailLights) l.material = this.ctrl && this.ctrl.brake && this.alive ? BRAKE : TAIL;
  }

  // world-space position of a local point
  local(p, out = new THREE.Vector3()) {
    return out.copy(p).applyMatrix4(this.root.matrixWorld);
  }
  get center() {
    return _v.set(this.pos.x, this.pos.y + this.height * 0.5, this.pos.z);
  }
  centerOut(out) {
    return out.set(this.pos.x, this.pos.y + this.height * 0.5, this.pos.z);
  }
  dispose() {
    G.scene.remove(this.root);
  }
}

const WRECK = new THREE.MeshStandardMaterial({ color: 0x1b1816, roughness: 0.95, metalness: 0.1 });
const GHOST = new THREE.MeshStandardMaterial({ color: 0x9fb4c8, transparent: true, opacity: 0.12, roughness: 0.1, metalness: 0.5, depthWrite: false });
const TAIL = new THREE.MeshBasicMaterial({ color: 0x8a1a12, toneMapped: false });
const BRAKE = new THREE.MeshBasicMaterial({ color: 0xff3a22, toneMapped: false });

// car vs car collisions with ramming damage
export function collideCars(cars) {
  for (let i = 0; i < cars.length; i++) {
    const a = cars[i];
    if (!a.alive && a.deadTime > 2) continue;
    for (let j = i + 1; j < cars.length; j++) {
      const b = cars[j];
      if (!b.alive && b.deadTime > 2) continue;
      if (Math.abs(a.pos.y - b.pos.y) > 2.5) continue;
      // approximate each car by a capsule: test closest points of their spines
      const best = capsuleContact(a, b);
      if (!best) continue;
      const { nx, nz, pen, px, pz } = best;
      const ma = a.mass, mb = b.mass, tot = ma + mb;
      a.pos.x -= nx * pen * (mb / tot);
      a.pos.z -= nz * pen * (mb / tot);
      b.pos.x += nx * pen * (ma / tot);
      b.pos.z += nz * pen * (ma / tot);
      const rel = (a.vel.x - b.vel.x) * nx + (a.vel.z - b.vel.z) * nz;
      if (rel <= 0) continue;
      const e = 0.35;
      const jimp = ((1 + e) * rel) / (1 / ma + 1 / mb);
      a.vel.x -= (nx * jimp) / ma;
      a.vel.z -= (nz * jimp) / ma;
      b.vel.x += (nx * jimp) / mb;
      b.vel.z += (nz * jimp) / mb;
      // spin from off-center hits
      a.yawRate += (R() - 0.5) * rel * 0.05;
      b.yawRate += (R() - 0.5) * rel * 0.05;
      if (rel > 7 && a.alive && b.alive) {
        // the faster car (into the contact) deals more; heavier cars hit harder
        const sa = Math.max(0, a.vel.x * nx + a.vel.z * nz), sb = Math.max(0, -(b.vel.x * nx + b.vel.z * nz));
        const base = (rel - 6) * 1.25;
        let dmgToB = base * Math.sqrt(ma / mb) * (0.5 + (sa / (sa + sb + 0.01)) * 0.8);
        let dmgToA = base * Math.sqrt(mb / ma) * (0.5 + (sb / (sa + sb + 0.01)) * 0.8);
        if (a.ramBoost > 0 || a.def.id === 'darkside' && a.boosting) dmgToB *= a.ramBoost > 0 ? 3.2 : 1.4;
        if (b.ramBoost > 0 || b.def.id === 'darkside' && b.boosting) dmgToA *= b.ramBoost > 0 ? 3.2 : 1.4;
        b.damage(Math.round(dmgToB), a, 'Ram Damage');
        a.damage(Math.round(dmgToA), b, 'Ram Damage');
        bus.emit('carHit', a, b, rel, new THREE.Vector3(px, (a.pos.y + b.pos.y) / 2 + 0.8, pz));
      } else if (rel > 2) bus.emit('carBump', a, b, rel, new THREE.Vector3(px, (a.pos.y + b.pos.y) / 2 + 0.8, pz));
    }
  }
}

function capsuleContact(a, b) {
  const ha = Math.max(0, a.length * 0.5 - a.radius), hb = Math.max(0, b.length * 0.5 - b.radius);
  const ax0 = a.pos.x - a.forward.x * ha, az0 = a.pos.z - a.forward.z * ha;
  const ax1 = a.pos.x + a.forward.x * ha, az1 = a.pos.z + a.forward.z * ha;
  const bx0 = b.pos.x - b.forward.x * hb, bz0 = b.pos.z - b.forward.z * hb;
  const bx1 = b.pos.x + b.forward.x * hb, bz1 = b.pos.z + b.forward.z * hb;
  const reach = a.radius + b.radius;
  const dx0 = a.pos.x - b.pos.x, dz0 = a.pos.z - b.pos.z;
  const lim = ha + hb + reach;
  if (dx0 * dx0 + dz0 * dz0 > lim * lim) return null;
  const [px, pz, qx, qz] = closestSegSeg(ax0, az0, ax1, az1, bx0, bz0, bx1, bz1);
  let dx = qx - px, dz = qz - pz;
  const d = Math.hypot(dx, dz);
  if (d >= reach) return null;
  if (d < 1e-4) {
    dx = b.pos.x - a.pos.x;
    dz = b.pos.z - a.pos.z;
  }
  const l = Math.hypot(dx, dz) || 1;
  return { nx: dx / l, nz: dz / l, pen: reach - d, px: (px + qx) / 2, pz: (pz + qz) / 2 };
}
function closestSegSeg(p1x, p1z, q1x, q1z, p2x, p2z, q2x, q2z) {
  const d1x = q1x - p1x, d1z = q1z - p1z, d2x = q2x - p2x, d2z = q2z - p2z;
  const rx = p1x - p2x, rz = p1z - p2z;
  const a = d1x * d1x + d1z * d1z, e = d2x * d2x + d2z * d2z, f = d2x * rx + d2z * rz;
  let s, t;
  if (a < 1e-6 && e < 1e-6) return [p1x, p1z, p2x, p2z];
  if (a < 1e-6) {
    s = 0;
    t = clamp(f / e, 0, 1);
  } else {
    const c = d1x * rx + d1z * rz;
    if (e < 1e-6) {
      t = 0;
      s = clamp(-c / a, 0, 1);
    } else {
      const b = d1x * d2x + d1z * d2z;
      const den = a * e - b * b;
      s = den !== 0 ? clamp((b * f - c * e) / den, 0, 1) : 0;
      t = (b * s + f) / e;
      if (t < 0) {
        t = 0;
        s = clamp(-c / a, 0, 1);
      } else if (t > 1) {
        t = 1;
        s = clamp((b - c) / a, 0, 1);
      }
    }
  }
  return [p1x + d1x * s, p1z + d1z * s, p2x + d2x * t, p2z + d2z * t];
}
void lerp;
void _f;
void _r;
