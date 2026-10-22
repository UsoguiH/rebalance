// AI drivers: pick a goal (hunt an enemy, grab weapons, flee to health), path along the
// town road graph, chase directly when close, steer around obstacles, unstick, and use
// the right weapon for the range (plus energy moves and each vehicle's special).
import * as THREE from 'three';
import { clamp, angleDiff, R, G } from './core.js';

const _v = new THREE.Vector3();

export function blankControl() {
  return {
    throttle: 0, brake: 0, steer: 0, turbo: false, handbrake: false, mg: false, fire: false, fireHeld: false, alt: false,
    prev: false, next: false, jump: false, freeze: false, shield: false, mine: false, rear: false, look: false,
  };
}

export class AIDriver {
  constructor(car, skill = 1) {
    this.car = car;
    this.c = blankControl();
    this.skill = skill; // 0 easy .. 2 twisted
    this.think = R() * 0.3;
    this.goal = null;
    this.goalKind = 'roam';
    this.path = [];
    this.target = null;
    this.stuckT = 0;
    this.reverseT = 0;
    this.revSteer = 1;
    this.holdT = 0;
    this.grudge = null;
    this.aggro = 0.6 + R() * 0.5;
    this.fireT = 0;
  }

  update(dt) {
    const car = this.car;
    const c = this.c;
    c.fire = c.alt = c.prev = c.next = c.jump = c.freeze = c.shield = c.mine = false;
    if (!car.alive) {
      c.throttle = c.brake = c.steer = 0;
      c.mg = c.fireHeld = false;
      return c;
    }
    this.think -= dt;
    if (this.think <= 0) {
      this.think = 0.35 + R() * 0.2;
      this.decide();
    }
    this.drive(dt);
    this.combat(dt);
    return c;
  }

  decide() {
    const car = this.car;
    const W = G.world;
    const lowHp = car.hpFrac < 0.32;
    // candidate target: closest visible-ish enemy, with a grudge toward whoever hit us last
    let best = null, bs = 1e9;
    for (const o of G.cars) {
      if (o === car || !o.alive || o.invisible > 0) continue;
      if (G.teams && o.team === car.team && car.team !== 0) continue;
      let s = o.pos.distanceTo(car.pos);
      if (o === car.lastHitBy && G.time - car.lastHitTime < 6) s *= 0.5;
      if (o.isPlayer) s *= G.playerBias || 0.8;
      if (G.hunted && o === G.hunted) s *= 0.4;
      if (s < bs) {
        bs = s;
        best = o;
      }
    }
    this.target = best;
    const armed = Object.values(car.weapons).reduce((a, b) => a + b, 0) + car.special;
    if (lowHp) {
      const h = this.nearestPickup('health') || this.nearestBay();
      if (h) {
        this.setGoal(h, 'health');
        return;
      }
    }
    if (best && (bs < 260 * this.aggro || armed > 2)) {
      this.setGoal(best.pos, 'hunt');
      return;
    }
    const wp = this.nearestPickup('weapon');
    if (wp) this.setGoal(wp, 'pickup');
    else if (best) this.setGoal(best.pos, 'hunt');
    else this.setGoal(W.nodes[(R() * W.nodes.length) | 0], 'roam');
  }
  nearestPickup(kind) {
    let best = null, bd = 1e9;
    for (const p of G.weapons.pickups) {
      if (!p.active || p.kind !== kind) continue;
      const d = Math.hypot(p.x - this.car.pos.x, p.z - this.car.pos.z);
      if (d < bd) {
        bd = d;
        best = p;
      }
    }
    return best;
  }
  nearestBay() {
    let best = null, bd = 1e9;
    for (const b of G.world.healthBays) {
      if (b.cooldown > 0) continue;
      const d = Math.hypot(b.x - this.car.pos.x, b.z - this.car.pos.z);
      if (d < bd) {
        bd = d;
        best = b;
      }
    }
    return best;
  }
  setGoal(g, kind) {
    const W = G.world;
    this.goal = g;
    this.goalKind = kind;
    const a = W.nearestNode(this.car.pos.x, this.car.pos.z, true);
    const b = W.nearestNode(g.x, g.z, false);
    this.path = W.path(a, b).slice();
    // drop nodes behind us
    while (this.path.length > 1) {
      const n = this.path[0], n2 = this.path[1];
      const d1 = Math.hypot(n.x - this.car.pos.x, n.z - this.car.pos.z);
      const d12 = Math.hypot(n2.x - n.x, n2.z - n.z);
      const d2 = Math.hypot(n2.x - this.car.pos.x, n2.z - this.car.pos.z);
      if (d2 < d12 || d1 < 10) this.path.shift();
      else break;
    }
  }

  drive(dt) {
    const car = this.car, c = this.c, W = G.world;
    const g = this.goal;
    if (!g) return;
    // aim point: direct when the goal is close and visible, else next path node
    let tx, tz;
    const gd = Math.hypot(g.x - car.pos.x, g.z - car.pos.z);
    const direct = gd < 75 && W.segmentBlocked(car.pos.x, car.pos.y + 1, car.pos.z, g.x, (g.y ?? car.pos.y) + 1, g.z, 0.6) < 0;
    if (direct) {
      tx = g.x;
      tz = g.z;
      // lead moving targets
      if (this.goalKind === 'hunt' && this.target) {
        const lead = clamp(gd / 60, 0, 1.2);
        tx += this.target.vel.x * lead;
        tz += this.target.vel.z * lead;
      }
    } else {
      while (this.path.length && Math.hypot(this.path[0].x - car.pos.x, this.path[0].z - car.pos.z) < 11) this.path.shift();
      const n = this.path[0];
      if (n) {
        tx = n.x;
        tz = n.z;
      } else {
        tx = g.x;
        tz = g.z;
        if (this.think > 0.2) this.think = 0.05;
      }
    }
    const want = Math.atan2(tx - car.pos.x, tz - car.pos.z);
    let diff = angleDiff(car.yaw, want);
    // obstacle feelers
    const look = 7 + car.speed * 0.7;
    const s = Math.sin(car.yaw), co = Math.cos(car.yaw);
    const probe = (ang) => {
      const ss = Math.sin(car.yaw + ang), cc = Math.cos(car.yaw + ang);
      const t = W.segmentBlocked(car.pos.x, car.pos.y + 0.9, car.pos.z, car.pos.x + ss * look, car.pos.y + 0.9, car.pos.z + cc * look, 0.5);
      return t < 0 ? 1 : t;
    };
    const fc = probe(0), fl = probe(0.5), fr = probe(-0.5);
    if (fc < 1 || fl < 0.6 || fr < 0.6) {
      diff += (fl > fr ? 1 : -1) * (1 - Math.min(fc, 1)) * 1.4;
      if (fl < 0.6) diff -= 0.5;
      if (fr < 0.6) diff += 0.5;
    }
    void s;
    void co;

    if (this.reverseT > 0) {
      this.reverseT -= dt;
      c.throttle = 0;
      c.brake = 1;
      c.steer = this.revSteer;
      c.handbrake = false;
      c.turbo = false;
      return;
    }
    c.steer = clamp(-diff * 2.2, -1, 1);
    const sharp = Math.abs(diff);
    c.throttle = 1;
    c.brake = 0;
    c.handbrake = sharp > 1.1 && car.speed > 14;
    if (sharp > 2.2 && gd < 25 && this.goalKind === 'hunt') {
      // target behind and close: swing around with the handbrake
      c.handbrake = true;
    }
    if (fc < 0.35 && car.speed > 12) {
      c.throttle = 0;
      c.brake = 1;
    }
    // turbo on long straights or when fleeing
    c.turbo = (sharp < 0.15 && gd > 70 && car.turbo > 40) || (this.goalKind === 'health' && sharp < 0.4 && car.turbo > 20);
    if (this.goalKind === 'hunt' && gd < 18 && car.def.id === 'darkside') c.turbo = true;
    // stuck detection
    if (car.speed < 1.6 && c.throttle > 0) this.stuckT += dt;
    else this.stuckT = Math.max(0, this.stuckT - dt * 2);
    if (this.stuckT > 1.0) {
      this.stuckT = 0;
      this.reverseT = 1.1 + R() * 0.6;
      this.revSteer = R() < 0.5 ? -1 : 1;
      this.think = 0;
    }
  }

  combat(dt) {
    const car = this.car, c = this.c, t = this.target;
    c.mg = false;
    c.fireHeld = false;
    if (!t || !t.alive) return;
    const sk = this.skill;
    const d = t.pos.distanceTo(car.pos);
    _v.subVectors(t.pos, car.pos).setY(0).normalize();
    const facing = _v.dot(car.forward);
    const locked = car.target === t;
    const willFire = R() < [0.35, 0.65, 0.95][sk] * dt * 6;
    // machine gun
    if (facing > 0.93 && d < 90) c.mg = R() < [0.5, 0.8, 1][sk];
    // choose a pickup weapon for this range
    const w = car.weapons;
    let pick = null;
    if (locked) {
      if (w.power > 0 && facing > 0.985 && d < 90) pick = 'power';
      else if (w.shotgun > 0 && d < 24) pick = 'shotgun';
      else if (w.napalm > 0 && d > 10 && d < 45) pick = 'napalm';
      else if (w.remote > 0 && d < 35) pick = 'remote';
      else if (w.homing > 0 && d < 150) pick = 'homing';
      else if (w.fire > 0 && d < 120) pick = 'fire';
      else if (w.stalker > 0 && d < 150) pick = 'stalker';
      else if (w.ricochet > 0 && d < 40 && facing > 0.9) pick = 'ricochet';
      else if (w.sniper > 0 && d < 160) pick = 'sniper';
    }
    // special first when it fits
    const sp = car.def.id;
    const specialFits =
      (sp === 'kamikaze' && d < 18 && facing > 0.85 && car.fuel > 5) ||
      (sp === 'outlaw' && d < 60 && car.fuel > 5) ||
      (sp === 'axel' && d < 16 && car.special > 0) ||
      (sp === 'crimsonfury' && d < 26 && facing > 0.9 && car.special > 0) ||
      (sp === 'darkside' && d < 45 && facing > 0.95 && car.special > 0) ||
      (sp === 'junkyarddog' && d > 15 && d < 70 && car.special > 0) ||
      (['sweettooth', 'meatwagon', 'vermin', 'shadow'].includes(sp) && locked && d < 140 && car.special > 0) ||
      ((sp === 'roadkill' || sp === 'reaper') && locked && d < 90 && car.special > 0);
    if (specialFits) pick = 'special';
    if (pick && pick !== car.selected) {
      car.selected = pick;
    }
    if (!pick) return;
    if (pick === 'special') {
      if (sp === 'kamikaze' || sp === 'outlaw') c.fireHeld = true;
      else if (sp === 'roadkill' || sp === 'reaper') {
        this.holdT += dt;
        c.fireHeld = this.holdT < (sp === 'reaper' ? 1.3 : 1.6);
        if (!c.fireHeld) this.holdT = -0.6;
      } else if (willFire) c.fire = true;
      // alternate specials now and then
      if (R() < dt * 0.05 * (sk + 1)) c.alt = true;
    } else if (pick === 'stalker' || pick === 'sniper') {
      this.holdT += dt;
      c.fireHeld = this.holdT < 1.0;
      if (!c.fireHeld) this.holdT = -0.5;
    } else if (willFire) c.fire = true;
    // energy
    if (car.energy > 60 && facing > 0.9 && d < 60 && R() < dt * 0.25 * (sk + 1)) c.freeze = true;
    if (car.energy > 30 && d < 22 && facing < -0.6 && R() < dt * 0.6) c.mine = true;
    if (car.energy > 55 && car.hpFrac < 0.6 && this.incoming && G.time - this.incoming < 1.2 && R() < 0.5 * (sk + 1) * dt * 8) c.shield = true;
  }
}
