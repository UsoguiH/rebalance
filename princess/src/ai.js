// Bot brains. Each bot picks a role, fetches the matching hat, then works through
// priorities: save a princess in trouble, escort carriers, fight nearby enemies, and
// otherwise follow its job (gather and build, push a lane, raid the dungeon, feed cake).
import { findPath, canStand, randomStandable } from './nav.js';
import { CASTLES, OUTPOSTS, CAKES } from './world.js';
import { dist, dist2, clamp, rng } from './util.js';

const R = rng(2024);
const MELEE = { villager: 1.3, worker: 1.6, warrior: 1.8, priest: 1.5 };
const RANGE = { ranger: 13, mage: 11 };

// at least six on the team before anyone stays home
const n0 = (g, b) => g.brains.filter((o) => o.u.team === b.u.team).length >= 5;

export class Brain {
  constructor(game, unit, idx) {
    this.game = game;
    this.u = unit;
    this.idx = idx;
    this.role = 'warrior';
    this.path = null;
    this.pathGoal = null;
    this.pathT = 0;
    this.think = R() * 0.5;
    this.goal = null;
    this.target = null;
    this.hold = 0;
    this.holdCharge = false;
    this.lane = idx % 3; // 0 north, 1 centre, 2 south
    this.stuck = 0;
    this.hatWait = 0;
    this.strafe = R() < 0.5 ? -1 : 1;
    this.strafeT = 0;
    this.job = null;
    this.reaction = 0.25 + R() * 0.35;
  }

  // Team composition decides roles after each respawn.
  pickRole() {
    const g = this.game, team = this.u.team;
    const mates = g.brains.filter((b) => b.u.team === team && b !== this);
    const count = (r) => mates.filter((b) => b.role === r).length;
    const n = mates.length + 1;
    const want = [
      ['worker', n <= 6 ? 1 : 2],
      ['runner', n >= 6 ? 1 : 0],
      ['priest', n >= 5 ? (n >= 12 ? 2 : 1) : 0],
      ['ranger', Math.round(n * 0.15)],
      ['mage', Math.round(n * 0.1)],
    ];
    for (const [r, k] of want) if (count(r) < k) return (this.role = r);
    return (this.role = 'warrior');
  }

  onSpawn() {
    this.pickRole();
    this.path = null;
    this.job = null;
    this.hatWait = 0;
    const g = this.game;
    this.defender = this.role === 'warrior' && n0(g, this) && !g.brains.some((b) => b !== this && b.u.team === this.u.team && b.defender && b.u.alive);
    this.jobT = 0;
  }

  // ------------------------------------------------------------ helpers
  moveTo(x, z, ctl, dt, opts = {}) {
    const u = this.u;
    const d = dist(u.x, u.z, x, z);
    if (d < (opts.arrive ?? 0.6)) return true;
    this.pathT -= dt;
    const goalMoved = !this.pathGoal || dist(this.pathGoal[0], this.pathGoal[1], x, z) > (d > 12 ? 4 : 1.2);
    if (!this.path || goalMoved || this.pathT <= 0 || u.blockedFor > 0.5) {
      if (this.game.pathBudget > 0) {
        this.game.pathBudget--;
        const p = findPath(u.x, u.z, x, z, u.team, { noWater: !!u.carryingPrincess || opts.noWater, waterCost: u.carrying ? 12 : 5 });
        this.path = p ? p.pts : null;
        this.pi = 1;
        this.pathGoal = [x, z];
        this.pathT = 2.5 + R();
        if (u.blockedFor > 0.5) {
          // wiggle free
          const [rx, rz] = randomStandable(u.x, u.z, 2, u.team, R);
          this.path = [[u.x, u.z], [rx, rz], ...(this.path ? this.path.slice(1) : [])];
          u.blockedFor = 0;
        }
      }
    }
    let tx = x, tz = z;
    if (this.path && this.path.length > 1) {
      while (this.pi < this.path.length - 1 && dist(u.x, u.z, this.path[this.pi][0], this.path[this.pi][1]) < 0.55) this.pi++;
      [tx, tz] = this.path[Math.min(this.pi, this.path.length - 1)];
    }
    const dx = tx - u.x, dz = tz - u.z;
    const l = Math.hypot(dx, dz) || 1;
    const slow = opts.slowDown && d < 3 ? clamp(d / 3, 0.3, 1) : 1;
    ctl.mx = (dx / l) * slow;
    ctl.mz = (dz / l) * slow;
    // separation from teammates
    for (const o of this.game.units) {
      if (o === u || !o.alive || o.team !== u.team) continue;
      const ox = u.x - o.x, oz = u.z - o.z, d2 = ox * ox + oz * oz;
      if (d2 < 0.8 && d2 > 1e-4) {
        ctl.mx += (ox / Math.sqrt(d2)) * 0.6;
        ctl.mz += (oz / Math.sqrt(d2)) * 0.6;
      }
    }
    return false;
  }
  aimAt(t, ctl) {
    const u = this.u;
    let tx = t.x, tz = t.z;
    // lead moving targets a little
    if (t.vx !== undefined && RANGE[u.cls]) {
      const tt = dist(u.x, u.z, t.x, t.z) / 25;
      tx += t.vx * tt;
      tz += t.vz * tt;
    }
    const dx = tx - u.x, dz = tz - u.z, l = Math.hypot(dx, dz) || 1;
    ctl.aimX = dx / l;
    ctl.aimZ = dz / l;
  }
  press(ctl, charge) {
    if (this.hold > 0) return;
    const ct = { villager: 0.6, worker: 0.8, warrior: 0.9, ranger: 0.8, mage: 0.8, priest: 0.9 }[this.u.cls];
    this.hold = charge ? ct + 0.15 : 0.06;
    this.holdCharge = charge;
    ctl.attackPressed = true;
    ctl.attack = true;
  }
  stepHold(ctl, dt) {
    if (this.hold > 0) {
      this.hold -= dt;
      ctl.attack = this.hold > 0;
      if (this.hold <= 0) ctl.attackReleased = true;
    }
  }

  // ------------------------------------------------------------ main
  update(dt) {
    const g = this.game, u = this.u;
    const ctl = { mx: 0, mz: 0, attack: false, attackPressed: false, attackReleased: false, interact: false, aimX: Math.sin(u.yaw), aimZ: Math.cos(u.yaw) };
    if (!u.alive || u.flying) return ctl;
    this.stepHold(ctl, dt);
    this.think -= dt;
    if (this.think <= 0) {
      this.think = this.reaction;
      this.decide();
    }
    this.act(ctl, dt);
    return ctl;
  }

  decide() {
    const g = this.game, u = this.u;
    const enemyRange = u.cls === 'ranger' || u.cls === 'mage' ? 15 : u.carrying || u.carryingPrincess ? 3 : 10;
    this.target = g.nearestEnemy(u, enemyRange, true);
    const myP = g.princesses[u.team], theirP = g.princesses[1 - u.team];
    this.job = null;

    if (u.carryingPrincess) return (this.job = { kind: 'carryPrincess' });
    if (u.carrying) {
      const it = u.carrying;
      if (it.type === 'cake') return (this.job = { kind: 'feed' });
      if (it.type === 'log' || it.type === 'ore') return (this.job = { kind: 'deposit' });
      if (it.type === 'bigbomb' || it.type === 'bomb' || it.type === 'potion') return (this.job = { kind: 'lob' });
    }
    // need a hat first
    const wantCls = this.role === 'runner' ? 'villager' : this.role;
    if (u.cls === 'villager' && wantCls !== 'villager') {
      this.hatWait += this.reaction;
      if (this.hatWait > 14 && this.role !== 'warrior') {
        this.role = 'warrior';
        this.hatWait = 0;
      }
      return (this.job = { kind: 'hat', cls: this.role });
    }

    // princess emergencies
    for (const p of [myP, theirP]) {
      if (p.state === 'carried' && p.carrier.team !== u.team) {
        const d = dist(u.x, u.z, p.x, p.z);
        if (d < 50 && u.cls !== 'worker') return (this.job = { kind: 'chase', unit: p.carrier });
      }
      if (p.state === 'dropped' && dist(u.x, u.z, p.x, p.z) < 40) return (this.job = { kind: 'grabPrincess', p });
      if (p.state === 'carried' && p.carrier.team === u.team && p.carriers.length < Math.min(4, p.stage + 1) && dist(u.x, u.z, p.x, p.z) < 30 && u.cls !== 'worker')
        return (this.job = { kind: 'helpCarry', p });
      if (p.state === 'carried' && p.carrier.team === u.team && dist(u.x, u.z, p.x, p.z) < 26 && u.cls !== 'worker') return (this.job = { kind: 'escort', p });
    }
    // fight whatever is close
    if (this.target && (u.cls !== 'worker' || dist(u.x, u.z, this.target.x, this.target.z) < 4)) {
      if (u.cls === 'priest' && !u.usingAlt) {
        // priests stay with friends and heal
      } else return (this.job = { kind: 'fight', unit: this.target });
    }
    // class jobs
    if (u.cls === 'priest') {
      const hurt = g.nearestHurtAlly(u, 25);
      if (hurt) return (this.job = { kind: 'heal', unit: hurt });
      const buddy = g.units.filter((o) => o !== u && o.alive && o.team === u.team && o.cls !== 'priest' && o.cls !== 'worker').sort((a, b) => dist2(u.x, u.z, a.x, a.z) - dist2(u.x, u.z, b.x, b.z))[0];
      if (buddy) return (this.job = { kind: 'follow', unit: buddy });
    }
    if (u.cls === 'worker') return (this.job = this.workerJob());
    if (u.cls === 'villager') return (this.job = this.runnerJob());
    // rescue raid once the enemy gate is down, or when already inside their walls
    const foe = CASTLES[1 - u.team];
    const inside = g.inCastle(u, 1 - u.team);
    const open = g.gates[1 - u.team].destroyed;
    if (myP.state === 'prison' && (open || inside) && !this.defender) return (this.job = { kind: 'rescue', p: myP });
    if (theirP.state === 'throne' && (open || inside) && this.idx % 3 === 1) return (this.job = { kind: 'kidnap', p: theirP });
    if (inside) return (this.job = { kind: 'siege' }); // break the gate from within
    if (this.defender) return (this.job = { kind: 'defend' });
    // fly over the walls with the catapult
    const cat = g.catapults[u.team];
    if (cat.done && !open && this.idx % 3 === 2 && myP.state === 'prison') return (this.job = { kind: 'catapult' });
    // push the lane: outpost first, then the enemy gate
    const lanePosts = this.laneOutposts();
    const next = lanePosts.find((o) => o.owner !== u.team);
    const siegeTime = g.time > 90 && (this.idx % 3 === 0 || g.time > 200);
    if (next && !siegeTime) return (this.job = { kind: 'capture', o: next });
    if (!g.gates[1 - u.team].destroyed) return (this.job = { kind: 'siege' });
    return (this.job = { kind: 'rescue', p: myP });
  }

  laneOutposts() {
    const g = this.game, s = this.u.team === 0 ? -1 : 1;
    const ids = this.lane === 0 ? [s < 0 ? 0 : 3, 2, s < 0 ? 3 : 0] : this.lane === 2 ? [s < 0 ? 1 : 4, 2, s < 0 ? 4 : 1] : [2, s < 0 ? 3 : 0, s < 0 ? 4 : 1];
    return ids.map((i) => g.outposts[i]);
  }

  workerJob() {
    const g = this.game, u = this.u, team = g.teams[u.team];
    const gate = g.gates[u.team];
    if ((gate.destroyed && team.wood >= 3) || (gate.hp < gate.maxHp * 0.6 && team.wood >= 1) || gate.work > 0) return { kind: 'build', s: gate };
    const builds = g.buildables.filter((b) => b.team === u.team && b.needsWork() && b !== gate && (b.work > 0 || b.affordable()));
    if (builds.length) {
      const order = ['worker', 'warrior', 'ranger', 'mage', 'priest'];
      builds.sort((a, b) => (b.work > 0) - (a.work > 0) || order.indexOf(a.cls) - order.indexOf(b.cls));
      return { kind: 'build', s: builds[0] };
    }
    // loose resources lying around first
    const loose = g.items.nearest(u.x, u.z, 20, (it) => it.type === 'log' || it.type === 'ore');
    if (loose) return { kind: 'pickup', it: loose };
    const needOre = team.ore < 3 || (team.wood >= 6 && team.ore < 6);
    const s = u.team === 0 ? -1 : 1;
    const homeBias = (x) => (Math.sign(x) === s ? 0 : 900);
    if (needOre) {
      const ores = g.ores.filter((o) => o.ready).sort((a, b) => dist2(u.x, u.z, a.x, a.z) + homeBias(a.x) - (dist2(u.x, u.z, b.x, b.z) + homeBias(b.x)));
      if (ores.length) return { kind: 'mine', r: ores[0] };
    }
    const trees = g.trees.filter((t) => t.standing).sort((a, b) => dist2(u.x, u.z, a.x, a.z) + homeBias(a.x) - (dist2(u.x, u.z, b.x, b.z) + homeBias(b.x)));
    if (trees.length) return { kind: 'chop', r: trees[0] };
    return { kind: 'defend' };
  }

  runnerJob() {
    const g = this.game, u = this.u;
    const captive = g.princesses[1 - u.team];
    if (captive.state === 'prison' && captive.calories < 1050) {
      const cake = g.items.nearest(u.x, u.z, 90, (it) => it.type === 'cake');
      if (cake) return { kind: 'pickup', it: cake };
    }
    return { kind: 'defend' };
  }

  // ------------------------------------------------------------ act
  act(ctl, dt) {
    const g = this.game, u = this.u, j = this.job;
    if (!j) return;
    // drop stale jobs at once instead of waiting for the next think
    if ((j.kind === 'escort' || j.kind === 'helpCarry') && j.p.state !== 'carried') return (this.think = 0);
    if (j.kind === 'grabPrincess' && j.p.state !== 'dropped') return (this.think = 0);
    if ((j.kind === 'chase' || j.kind === 'fight' || j.kind === 'heal' || j.kind === 'follow') && !j.unit?.alive) return (this.think = 0);
    if (j.kind === 'carryPrincess' && !u.carryingPrincess) return (this.think = 0);
    const home = CASTLES[u.team], foe = CASTLES[1 - u.team];
    switch (j.kind) {
      case 'hat': {
        const machine = g.hatMachines.find((h) => h.team === u.team && h.cls === j.cls);
        // a fallen soldier's hat on the way is just as good
        const hatItem = g.items.nearest(u.x, u.z, 8, (it) => it.type === 'hat' && it.cls === j.cls);
        const tx = hatItem ? hatItem.x : machine.plateX, tz = hatItem ? hatItem.z : machine.plateZ;
        const a = this.idx * 1.7;
        if (this.moveTo(tx + (hatItem ? 0 : Math.cos(a) * 0.9), tz + (hatItem ? 0 : Math.sin(a) * 0.9), ctl, dt, { arrive: 0.8 }) || dist(u.x, u.z, tx, tz) < 1.6) {
          if (!hatItem && g.hatMachineNear(u) !== machine) {
            // nudge onto the plate
            ctl.mx = (tx - u.x) * 0.5;
            ctl.mz = (tz - u.z) * 0.5;
          }
          ctl.interact = true;
        }
        break;
      }
      case 'carryPrincess': {
        const p = u.carryingPrincess;
        if (p.carrier !== u) break; // helpers are dragged along
        const dest = u.team === p.team ? home.throne : foe.prison;
        this.moveTo(dest.x, dest.z, ctl, dt, { arrive: 0.5, noWater: true });
        break;
      }
      case 'feed': {
        const p = g.princesses[1 - u.team];
        if (p.state === 'carried') {
          ctl.interact = true; // drop the cake and go help
          break;
        }
        if (this.moveTo(p.x, p.z, ctl, dt, { arrive: 1.8 })) ctl.interact = true;
        break;
      }
      case 'deposit': {
        const drop = g.nearestDrop(u);
        this.moveTo(drop.x, drop.z, ctl, dt, { arrive: 1.5 });
        break;
      }
      case 'lob': {
        const t = g.nearestEnemy(u, 9, true);
        if (t) {
          this.aimAt(t, ctl);
          ctl.attackPressed = true;
        } else this.moveTo(foe.gate.x, foe.gate.z, ctl, dt, { arrive: 4 });
        if (u.carrying && u.carrying.type === 'potion') {
          const t2 = g.nearestEnemy(u, 7, true);
          if (t2) {
            this.aimAt(t2, ctl);
            ctl.attackPressed = true;
          }
        }
        break;
      }
      case 'chase':
      case 'fight': {
        const t = j.unit;
        if (!t || !t.alive) break;
        this.fight(t, ctl, dt);
        break;
      }
      case 'grabPrincess': {
        const p = j.p;
        if (this.moveTo(p.x, p.z, ctl, dt, { arrive: 1.4 })) ctl.interact = true;
        if (dist(u.x, u.z, p.x, p.z) < 1.8) ctl.interact = true;
        break;
      }
      case 'helpCarry': {
        const p = j.p;
        if (this.moveTo(p.x, p.z, ctl, dt, { arrive: 1.5 })) ctl.interact = true;
        if (dist(u.x, u.z, p.x, p.z) < 1.9) ctl.interact = true;
        break;
      }
      case 'escort': {
        const p = j.p;
        const t = g.nearestEnemy(u, 9, true);
        if (t) this.fight(t, ctl, dt);
        else {
          const lead = p.carrier;
          const a = this.idx * 1.3;
          this.moveTo(lead.x + Math.sin(a) * 3 + Math.sin(lead.yaw) * 2.5, lead.z + Math.cos(a) * 3 + Math.cos(lead.yaw) * 2.5, ctl, dt, { arrive: 1 });
        }
        break;
      }
      case 'rescue': {
        const p = j.p;
        if (p.state !== 'prison') break;
        if (this.moveTo(p.x, p.z, ctl, dt, { arrive: 1.6 })) ctl.interact = true;
        if (dist(u.x, u.z, p.x, p.z) < 2.1) ctl.interact = true;
        // bash the gate if it is in the way
        this.bashGateIfNear(ctl);
        break;
      }
      case 'kidnap': {
        const p = j.p;
        if (p.state !== 'throne') break;
        if (this.moveTo(p.x, p.z, ctl, dt, { arrive: 1.6 })) ctl.interact = true;
        if (dist(u.x, u.z, p.x, p.z) < 2.1) ctl.interact = true;
        this.bashGateIfNear(ctl);
        break;
      }
      case 'siege': {
        const gate = g.gates[1 - u.team];
        const inside = g.inCastle(u, 1 - u.team);
        const side = inside ? 1 : -1; // which face of the gate we stand on
        const gx = foe.gate.x + foe.s * 1.6 * side, gz = foe.gate.z + ((this.idx % 5) - 2) * 0.8;
        if (gate.destroyed) {
          this.think = 0;
          break;
        }
        if (RANGE[u.cls] && !inside) {
          // ranged troops cover the gate, and pelt it when nobody is around
          const t = g.nearestEnemy(u, 15, true);
          if (t) return this.fight(t, ctl, dt);
          const sx = gx - foe.s * 7, sz = ((this.idx % 3) - 1) * 2;
          if (this.moveTo(sx, sz, ctl, dt, { arrive: 1.2 }) || dist(u.x, u.z, sx, sz) < 3) {
            this.aimAt({ x: foe.gate.x, z: gz * 0.5 }, ctl);
            this.press(ctl, false);
          }
        } else if (this.moveTo(gx, gz, ctl, dt, { arrive: 1.0 })) {
          ctl.aimX = -foe.s * side;
          ctl.aimZ = 0;
          this.press(ctl, u.cls === 'warrior' && R() < 0.3);
        }
        break;
      }
      case 'catapult': {
        const cat = g.catapults[u.team];
        if (this.moveTo(cat.x, cat.z + 1.8, ctl, dt, { arrive: 0.8 }) || dist(u.x, u.z, cat.x, cat.z) < 2.4) ctl.interact = true;
        break;
      }
      case 'capture': {
        const o = j.o;
        const a = this.idx * 2.1;
        this.moveTo(o.x + Math.cos(a) * 3.8, o.z + Math.sin(a) * 3.8, ctl, dt, { arrive: 1.2 });
        break;
      }
      case 'defend': {
        const spot = this.idx % 2 ? [home.gate.x + home.s * 4.5, home.gate.z + ((this.idx % 5) - 2) * 1.5] : [home.prison.x - home.s * 2, home.prison.z + 3];
        const t = g.nearestEnemy(u, 14, true);
        if (t && g.inCastle(t, u.team)) this.fight(t, ctl, dt);
        else this.moveTo(spot[0], spot[1], ctl, dt, { arrive: 1.5 });
        break;
      }
      case 'heal': {
        const t = j.unit;
        if (!t.alive) break;
        const d = dist(u.x, u.z, t.x, t.z);
        if (d > 5.5) this.moveTo(t.x, t.z, ctl, dt, { arrive: 4.5 });
        this.aimAt(t, ctl);
        if (d < 7) {
          ctl.attack = true;
          if (this.hold <= 0 && !u.charging) ctl.attackPressed = true;
          this.hold = 0.6;
        }
        const e = g.nearestEnemy(u, 2.2, true);
        if (e) this.fight(e, ctl, dt);
        break;
      }
      case 'follow': {
        const t = j.unit;
        if (t.alive) this.moveTo(t.x - Math.sin(t.yaw) * 2.5, t.z - Math.cos(t.yaw) * 2.5, ctl, dt, { arrive: 1.5 });
        break;
      }
      case 'build': {
        const s = j.s;
        if (this.moveTo(s.x - (s.kind === 'gate' ? home.s * 1.8 : 0), s.z + (s.kind === 'gate' ? 0 : 1.9), ctl, dt, { arrive: 0.9 })) {
          this.aimAt(s, ctl);
          this.press(ctl, false);
        }
        break;
      }
      case 'pickup': {
        const it = j.it;
        if (!it.alive || it.holder) break;
        if (this.moveTo(it.x, it.z, ctl, dt, { arrive: 0.8 }) || dist(u.x, u.z, it.x, it.z) < 1.4) ctl.interact = true;
        break;
      }
      case 'chop':
      case 'mine': {
        const r = j.r;
        if ((j.kind === 'chop' && !r.standing) || (j.kind === 'mine' && !r.ready)) {
          this.think = 0;
          break;
        }
        const a = Math.atan2(u.x - r.x, u.z - r.z);
        const reach = j.kind === 'chop' ? 1.35 : 1.95;
        if (this.moveTo(r.x + Math.sin(a) * reach, r.z + Math.cos(a) * reach, ctl, dt, { arrive: 0.5 })) {
          this.aimAt(r, ctl);
          this.press(ctl, false);
        }
        break;
      }
    }
  }

  bashGateIfNear(ctl) {
    const g = this.game, u = this.u;
    const foe = CASTLES[1 - u.team];
    const gate = g.gates[1 - u.team];
    if (!gate.destroyed && dist(u.x, u.z, foe.gate.x, foe.gate.z) < 3.4) {
      ctl.aimX = foe.s;
      ctl.aimZ = 0;
      this.press(ctl, false);
    }
  }

  fight(t, ctl, dt) {
    const u = this.u;
    const g = this.game;
    if (g.inCastle(t, t.team) && !g.gates[t.team].destroyed && !g.inCastle(u, t.team) && !RANGE[u.cls]) {
      const foe = CASTLES[t.team];
      const gx = foe.gate.x - foe.s * 1.6, gz = foe.gate.z + ((this.idx % 5) - 2) * 0.8;
      if (this.moveTo(gx, gz, ctl, dt, { arrive: 1.0 })) {
        ctl.aimX = foe.s;
        ctl.aimZ = 0;
        this.press(ctl, u.cls === 'warrior' && R() < 0.3);
      }
      return;
    }
    const d = dist(u.x, u.z, t.x, t.z);
    this.aimAt(t, ctl);
    const ranged = RANGE[u.cls] && !(u.cls === 'ranger' && u.usingAlt && d > 8);
    if (u.cls === 'villager' && u.carrying) return;
    if (RANGE[u.cls]) {
      const want = u.usingAlt && u.cls === 'ranger' ? 6 : RANGE[u.cls] * 0.7;
      this.strafeT -= dt;
      if (this.strafeT <= 0) {
        this.strafeT = 1 + R() * 1.5;
        this.strafe *= -1;
      }
      if (d > RANGE[u.cls] * 0.95 || !this.game.lineOfFire(u, t)) this.moveTo(t.x, t.z, ctl, dt, { arrive: want });
      else {
        const k = d < want * 0.6 ? -1 : 0;
        ctl.mx = (-ctl.aimZ * this.strafe * 0.6 + ctl.aimX * k);
        ctl.mz = (ctl.aimX * this.strafe * 0.6 + ctl.aimZ * k);
        // mages blast crowds, rangers charge shots at long range
        const crowd = this.game.enemiesNear(u, 3.5);
        const charge = (u.cls === 'mage' && crowd >= 2) || (u.cls === 'ranger' && !u.usingAlt && d > 9 && R() < 0.5);
        if (u.cls === 'mage' && charge) this.press(ctl, true);
        else if (ranged) this.press(ctl, charge);
      }
      return;
    }
    const reach = (MELEE[u.cls] ?? 1.6) + (u.usingAlt && u.cls === 'warrior' ? 0.7 : 0);
    if (d > reach * 0.9) {
      this.moveTo(t.x, t.z, ctl, dt, { arrive: reach * 0.8 });
      if (u.cls === 'warrior' && u.usingAlt && d < 6 && d > 3 && R() < 0.02) this.press(ctl, true);
    } else {
      // circle a little while swinging
      ctl.mx = -ctl.aimZ * this.strafe * 0.25;
      ctl.mz = ctl.aimX * this.strafe * 0.25;
      const crowd = this.game.enemiesNear(u, 2.6);
      const charge = u.cls === 'warrior' && !u.usingAlt && crowd >= 2 && R() < 0.5;
      this.press(ctl, charge || (u.cls === 'worker' && R() < 0.2));
    }
    // warriors raise shields against archers
    if (u.cls === 'warrior' && !u.usingAlt && t.cls === 'ranger' && d > 4 && this.hold <= 0) ctl.block = true;
  }
}
export { canStand, OUTPOSTS, CAKES };
