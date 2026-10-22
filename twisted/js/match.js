// Match: game modes (Death Match, Last Man Standing, Hunted, Endurance), spawning and
// respawning, scoring, garage health bays, destructible radar dishes, per-car effects
// (damage smoke, turbo flames, burning, frozen ice block, shield bubble, Sweet Tooth's
// flaming head) and the event wiring that feeds the HUD, audio and FX.
import * as THREE from 'three';
import { G, bus, R, clamp } from './core.js';
import { Car, collideCars } from './car.js';
import { AIDriver } from './ai.js';
import { VEHICLES } from './vehicles.js';
import { input } from './input.js';
import { audio } from './audio.js';

const _v = new THREE.Vector3();
const _w = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

export class Match {
  constructor(cfg, ctx) {
    this.cfg = cfg;
    this.fx = ctx.fx;
    this.hud = ctx.hud;
    this.weapons = ctx.weapons;
    this.time = 0;
    this.over = false;
    this.ais = [];
    this.respawnQ = [];
    this.limit = cfg.mode === 'dm' ? 10 : cfg.mode === 'hunted' ? 12 : 0;
    this.timeLimit = cfg.mode === 'dm' ? 8 * 60 : cfg.mode === 'hunted' ? 6 * 60 : 0;
    this.huntedScoreT = 0;
    this.spawnTimer = 0;
    this.unsub = [];
    this.setup();
  }

  setup() {
    const cfg = this.cfg;
    const skill = G.settings.difficulty;
    const player = new Car(cfg.vehicle, { isPlayer: true, name: 'You' });
    player.name = VEHICLES.find((v) => v.id === cfg.vehicle).name;
    G.player = player;
    G.cars = [player];
    const pool = VEHICLES.map((v) => v.id).filter((id) => id !== cfg.vehicle);
    shuffle(pool);
    const n = cfg.mode === 'endurance' ? 2 : G.settings.opponents;
    for (let i = 0; i < n; i++) this.addAI(pool[i % pool.length], skill);
    // spawn everyone apart
    const spawns = shuffle(G.world.spawns.slice());
    G.cars.forEach((c, i) => {
      const sp = spawns[i % spawns.length];
      c.spawn(sp.x + (i >= spawns.length ? 8 : 0), sp.z, sp.a);
      c.lives = cfg.mode === 'lms' ? 3 : cfg.mode === 'endurance' && c.isPlayer ? 1 : 99;
    });
    G.hunted = cfg.mode === 'hunted' ? G.cars[1 + Math.floor(R() * (G.cars.length - 1))] : null;
    G.playerBias = [1.2, 0.85, 0.65][skill];
    G.teams = false;
    for (const b of G.world.healthBays) b.cooldown = 0;
    this.bindEvents();
  }
  addAI(id, skill) {
    const car = new Car(id, { name: VEHICLES.find((v) => v.id === id).name });
    car.ai = new AIDriver(car, skill);
    G.cars.push(car);
    this.ais.push(car.ai);
    return car;
  }

  bindEvents() {
    const on = (ev, fn) => {
      bus.on(ev, fn);
      this.unsub.push([ev, fn]);
    };
    const hud = this.hud, fx = this.fx;
    on('damage', (car, dmg, src, weapon) => {
      if (this.over) return;
      if (src && src.isPlayer && car !== src && weapon) hud.damageText(weapon, dmg);
      if (car.isPlayer) {
        G.hitPulse = Math.min(1, (G.hitPulse || 0) + dmg / 30);
        if (dmg > 8) fx.shake(clamp(dmg / 60, 0.1, 0.6));
      }
    });
    on('death', (car, killer, weapon) => {
      const p = car.centerOut(new THREE.Vector3());
      fx.explosion(p, 2.4);
      setTimeout(() => fx.explosion(p.clone().add(new THREE.Vector3(R() - 0.5, 1, R() - 0.5)), 1.4), 180);
      fx.chunks(p, 16, 0x2a2420, 14);
      audio.boom(p, 2, car.isPlayer);
      if (G.player && p.distanceTo(G.player.pos) < 40) fx.shake(0.8);
      car.lives--;
      if (killer && killer.isPlayer && car !== killer) {
        hud.kill(`You Killed ${car.name}!`);
        audio.ui('kill');
      }
      if (car.isPlayer) hud.event(killer ? `Killed by ${killer.name}` : 'You wrecked yourself', '#ff8a6a');
      else hud.event(killer ? `${killer.name} killed ${car.name}` : `${car.name} was wrecked`, '#d8d0bc');
      // hunted: the killer becomes the prey
      if (this.cfg.mode === 'hunted' && car === G.hunted) {
        if (killer) killer.score += 2;
        G.hunted = killer || G.cars.find((c) => c !== car && c.alive);
        if (G.hunted) hud.event(`${G.hunted.isPlayer ? 'You are' : G.hunted.name + ' is'} now Hunted!`, '#ffd23a');
      }
      if (this.cfg.mode === 'dm' && killer && killer !== car) killer.score = killer.kills;
      if (this.cfg.mode === 'endurance' && !car.isPlayer) {
        // every kill brings a fresh car (and more of them over time)
        this.spawnTimer = 2.5;
      }
      if (car.lives > 0) this.respawnQ.push({ car, t: car.isPlayer ? 3.5 : 4 + R() * 2 });
    });
    on('pickup', (car, label) => {
      if (car.isPlayer) {
        hud.pickup(label);
        audio.ui('pickup');
      }
    });
    on('impact', (car, v, pos) => {
      fx.sparks(pos, _v.set(car.vel.x, 2, car.vel.z).normalize().negate(), Math.min(24, 4 + v), 0xffd890, 8);
      if (v > 9) fx.chunks(pos, 2, 0x4a4844, 4);
      audio.impact(pos, v);
      if (car.isPlayer) fx.shake(clamp(v / 50, 0.05, 0.5));
    });
    on('carHit', (a, b, rel, pos) => {
      fx.sparks(pos, UP, Math.min(40, 8 + rel * 1.5), 0xffd890, 12);
      fx.chunks(pos, 3, 0x3a3834, 6);
      audio.impact(pos, rel * 1.4);
      if (a.isPlayer || b.isPlayer) fx.shake(clamp(rel / 40, 0.15, 0.8));
    });
    on('carBump', (a, b, rel, pos) => audio.impact(pos, rel));
    on('land', (car, impact) => {
      fx.dust(car.pos.clone().add(_v.set(0, 0.3, 0)), _w.set(0, 1, 0), 0x9a8a70, 1.5);
      if (impact > 10) audio.impact(car.pos, impact * 0.6);
      if (car.isPlayer) fx.shake(clamp(impact / 60, 0.05, 0.4));
    });
    on('frozen', (car, by) => {
      fx.ice(car.centerOut(new THREE.Vector3()), 24);
      audio.zap(car.pos, car.isPlayer);
      if (car.isPlayer && by) hud.event(`Frozen by ${by.name}`, '#9ad8ff');
    });
    on('targeted', (car, name) => {
      if (car.isPlayer) {
        hud.warning(`Targeted by ${name}!`);
        audio.ui('warn');
      }
      if (car.ai) car.ai.incoming = G.time;
    });
    on('launch', (car, p) => {
      if (p.target && p.target.ai) p.target.ai.incoming = G.time;
    });
    on('stall', (car, by) => {
      if (car.isPlayer) hud.event(`Shocked by ${by.name}`, '#9ad8ff');
    });
    on('shieldOn', (car) => audio.zap(car.pos, car.isPlayer));
    on('jump', (car) => fx.dust(car.pos.clone(), _w.set(0, 2, 0), 0x9a8a70, 1.2));
    on('transform', (car) => {
      if (car.isPlayer) hud.event('SWEET BOT!', '#ffd23a');
      fx.explosion(car.centerOut(new THREE.Vector3()), 0.6);
    });
    on('ramBoost', (car) => {
      if (car.isPlayer) fx.shake(0.3);
    });
    on('repair', (car) => {
      fx.sparks(car.centerOut(new THREE.Vector3()), UP, 20, 0x8affc8, 6);
      if (car.isPlayer) hud.event('Repaired +30', '#8affc8');
    });
    on('targetDestroyed', (tg, by) => {
      if (tg.dead) return;
      tg.dead = true;
      G.world.removeCollider(tg.collider);
      for (let i = 0; i < 4; i++) setTimeout(() => fx.explosion(tg.pos.clone().add(new THREE.Vector3((R() - 0.5) * 6, R() * 4, (R() - 0.5) * 6)), 2), i * 220);
      tg.falling = 0;
      if (by && by.isPlayer) hud.event(`${tg.name} Destroyed!`, '#ffd23a');
    });
  }
  dispose() {
    for (const [ev, fn] of this.unsub) bus.off(ev, fn);
    for (const c of G.cars) {
      c.dispose();
      if (c.fxObjs) for (const o of Object.values(c.fxObjs)) G.scene.remove(o);
    }
    G.cars = [];
    G.player = null;
  }

  // ---------- per frame ----------
  update(dt) {
    this.time += dt;
    const player = G.player;
    // controls
    for (const car of G.cars) {
      const ctrl = car.isPlayer ? playerCtrl() : car.ai.update(dt);
      car.update(dt, ctrl);
      this.weapons.control(car, ctrl, dt);
    }
    collideCars(G.cars);
    G.props.update(dt, G.cars);
    this.effects(dt);
    this.bays(dt);
    this.targets(dt);
    // respawns
    for (const r of this.respawnQ) r.t -= dt;
    const ready = this.respawnQ.filter((r) => r.t <= 0);
    this.respawnQ = this.respawnQ.filter((r) => r.t > 0);
    for (const r of ready) this.respawn(r.car);
    // endurance waves
    if (this.cfg.mode === 'endurance' && this.spawnTimer > 0) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        const alive = G.cars.filter((c) => !c.isPlayer && c.alive).length;
        const want = 2 + Math.floor(player.kills / 3);
        const pool = VEHICLES.map((v) => v.id);
        for (let i = alive; i < Math.min(want, 8); i++) {
          const car = this.addAI(pool[Math.floor(R() * pool.length)], G.settings.difficulty);
          this.respawn(car);
        }
      }
    }
    // hunted scoring: the prey earns a point every 6 seconds alive
    if (this.cfg.mode === 'hunted' && G.hunted && G.hunted.alive) {
      this.huntedScoreT += dt;
      if (this.huntedScoreT > 6) {
        this.huntedScoreT = 0;
        G.hunted.score++;
      }
    }
    this.checkEnd();
  }
  respawn(car) {
    // pick the spawn point farthest from enemies
    let best = null, bs = -1;
    for (const sp of G.world.spawns) {
      let md = 1e9;
      for (const o of G.cars) if (o !== car && o.alive) md = Math.min(md, Math.hypot(o.pos.x - sp.x, o.pos.z - sp.z));
      md += R() * 40;
      if (md > bs) {
        bs = md;
        best = sp;
      }
    }
    car.spawn(best.x, best.z, best.a);
    if (car.isPlayer) this.hud.bigCenter(car.name.toUpperCase(), '#e8862a', 1.2, 36);
  }
  checkEnd() {
    if (this.over) return;
    const p = G.player;
    const mode = this.cfg.mode;
    let end = false, win = false;
    if (mode === 'dm') {
      const top = G.cars.reduce((a, b) => (b.kills > a.kills ? b : a));
      if (top.kills >= this.limit) {
        end = true;
        win = top === p;
      }
      if (this.time >= this.timeLimit) {
        end = true;
        win = p.kills >= top.kills;
      }
    } else if (mode === 'lms') {
      const left = G.cars.filter((c) => c.lives > 0 || c.alive);
      if (p.lives <= 0 && !p.alive && p.deadTime > 2.5) {
        end = true;
        win = false;
      } else if (left.length === 1 && left[0] === p) {
        end = true;
        win = true;
      }
    } else if (mode === 'hunted') {
      const top = G.cars.reduce((a, b) => (b.score > a.score ? b : a));
      if (top.score >= this.limit || this.time >= this.timeLimit) {
        end = true;
        win = top === p || p.score >= top.score;
      }
    } else if (mode === 'endurance') {
      if (!p.alive && p.lives <= 0 && p.deadTime > 2.5) {
        end = true;
        win = p.kills >= 10;
      }
    }
    if (end) {
      this.over = true;
      this.win = win;
    }
  }

  // ---------- garage health bays ----------
  bays(dt) {
    for (const b of G.world.healthBays) {
      b.cooldown = Math.max(0, (b.cooldown || 0) - dt);
      b.t = (b.t || 0) + dt;
      if (b.cooldown <= 0 && R() < 0.4) this.fx.emit('add', { pos: _v.set(b.x + (R() - 0.5) * b.r * 1.6, 0.3, b.z + (R() - 0.5) * b.r * 1.6), vel: _w.set(0, 2 + R() * 2, 0), size: 0.35, size1: 0.1, life: 1, color: 0x6affc8, frame: 0 });
      for (const car of G.cars) {
        if (!car.alive || b.cooldown > 0) continue;
        if (Math.hypot(car.pos.x - b.x, car.pos.z - b.z) > b.r) continue;
        if (car.hp < car.maxHp) {
          car.heal(car.maxHp * 0.45 * dt);
          b.used = (b.used || 0) + dt;
          if (car.isPlayer) this.hud.pickup('Health Bay');
          if (R() < 0.5) this.fx.sparks(car.centerOut(_v), UP, 2, 0x8affc8, 5);
          if (car.hp >= car.maxHp) {
            if (car.isPlayer) this.hud.pickup('Health Bay Full');
            b.cooldown = 40;
          }
          if (b.used > 4) {
            b.cooldown = 40;
            b.used = 0;
          }
        }
      }
    }
  }
  targets(dt) {
    for (const tg of G.world.targets) {
      if (!tg.dead || tg.falling === undefined || tg.falling > 3) continue;
      tg.falling += dt;
      tg.tilt.rotation.x = Math.min(0.6, tg.tilt.rotation.x + dt * 1.2 * tg.falling);
      tg.head.position.y = Math.max(2, tg.head.position.y - dt * 4 * tg.falling);
      if (R() < 0.3) this.fx.smokeTrail(tg.pos.clone().add(_v.set((R() - 0.5) * 4, R() * 3, (R() - 0.5) * 4)), true, 2);
      if (R() < 0.3) this.fx.fireTrail(tg.pos.clone().add(_v.set((R() - 0.5) * 3, -2 + R() * 2, (R() - 0.5) * 3)), 0xffc060, 0xff4010, 1.5);
    }
  }

  // ---------- per-car effects ----------
  effects(dt) {
    const fx = this.fx;
    for (const car of G.cars) {
      const o = car.fxObjs || (car.fxObjs = {});
      const parts = car.model.parts;
      car.root.updateMatrixWorld();
      if (!car.alive) {
        if (car.deadTime < 9 && R() < 0.6) {
          const p = car.centerOut(_v);
          fx.fireTrail(p.clone().add(_w.set((R() - 0.5) * car.width, 0.4, (R() - 0.5) * car.length * 0.5)), 0xffc060, 0xff3a00, 1.4);
          if (R() < 0.5) fx.smokeTrail(p, true, 1.4);
        }
        if (car.deadTime > 6 && !car.isPlayer && car.lives <= 0) car.root.visible = car.deadTime < 14;
        if (o.ice) o.ice.visible = false;
        if (o.shield) o.shield.visible = false;
        continue;
      }
      // damage smoke from the engine bay
      const dmg = 1 - car.hpFrac;
      if (dmg > 0.45) fx.damageSmoke(car.local(_v.set(0, car.height * 0.75, car.length * 0.3)), dmg);
      // burning
      if (car.burning > 0) for (let i = 0; i < 2; i++) fx.fireTrail(car.local(_v.set((R() - 0.5) * car.width, car.height * (0.3 + R() * 0.6), (R() - 0.5) * car.length * 0.8)), 0xffd070, 0xff3a00, 0.9);
      // turbo exhaust flames
      if (car.boosting || car.ramBoost > 0 || (parts.nitro && car.engineLoad && car.speed > 4)) {
        for (const e of parts.exhausts || []) {
          const p = car.local(_v.copy(e));
          const dir = _w.copy(car.forward).negate();
          fx.exhaust(p, dir, parts.nitro ? 0x3a6aff : parts.fireExhaust ? 0xff4a10 : 0xff7a20, car.boosting ? 0.6 : 0.35);
        }
      }
      if (parts.stacks && car.engineLoad && R() < 0.3) for (const e of parts.exhausts || []) fx.smokeTrail(car.local(_v.copy(e)), true, 0.35);
      // skid dust
      if (car.skid > 0.3 && R() < car.skid) {
        for (const w of car.model.wheels) if (w.z < 0) fx.dust(car.local(_v.set(w.x, 0.2, w.z)), _w.set(0, 0.6, 0).addScaledVector(car.vel, -0.1), 0x8a8478, 0.7);
      }
      // off-road dust at speed
      if (car.onGround && car.speed > 12 && !G.world.onRoad(car.pos.x, car.pos.z) && !G.world.inBlock(car.pos.x, car.pos.z) && R() < 0.5) fx.dust(car.local(_v.set(0, 0.2, -car.length / 2)), _w.set(0, 1, 0).addScaledVector(car.vel, -0.15), 0xa8926a, 1.3);
      // Sweet Tooth's head is always on fire
      if (parts.flamePoint) {
        const fp = car.local(_v.copy(parts.flamePoint));
        fx.fireTrail(fp.clone().add(_w.set((R() - 0.5) * 0.4, 0.1, (R() - 0.5) * 0.4)), 0xffe0a0, 0xff3a08, 0.55 + R() * 0.25);
        fx.emit('add', { pos: fp, vel: _w.set((R() - 0.5) * 0.6, 2.5 + R() * 1.5, (R() - 0.5) * 0.6).addScaledVector(car.vel, 0.85), size: 0.5, size1: 0.1, life: 0.45, color: 0xffd080, color2: 0xff2a00, frame: 8 });
      }
      // frozen ice block
      if (car.frozen > 0) {
        if (!o.ice) {
          o.ice = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.55, roughness: 0.05, metalness: 0.2, emissive: 0x3a6aa8, emissiveIntensity: 0.4 }));
          G.scene.add(o.ice);
        }
        o.ice.visible = true;
        o.ice.position.copy(car.pos).setY(car.pos.y + car.height * 0.5);
        o.ice.rotation.set(0, car.yaw, 0);
        o.ice.scale.set(car.width + 0.6, car.height + 0.5, car.length + 0.5);
      } else if (o.ice) o.ice.visible = false;
      // shield bubble
      if (car.shield > 0) {
        if (!o.shield) {
          o.shield = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshBasicMaterial({ color: 0xff5a2a, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
          G.scene.add(o.shield);
        }
        o.shield.visible = true;
        o.shield.position.copy(car.pos).setY(car.pos.y + car.height * 0.5);
        o.shield.scale.set(car.width * 0.9 + 0.8, car.height * 0.8 + 0.8, car.length * 0.65 + 0.8);
        o.shield.material.opacity = 0.18 + 0.1 * Math.sin(G.time * 20) + (car.shield < 1 ? (Math.sin(G.time * 30) > 0 ? 0.1 : -0.15) : 0);
      } else if (o.shield) o.shield.visible = false;
      // Sweet Bot: stand the truck up on its rear
      if (car.def.id === 'sweettooth') {
        const k = car.mechT > 0 ? Math.min(1, (10 - car.mechT) * 3, car.mechT * 3) : 0;
        car.model.body.rotation.x += -k * 1.2;
        car.model.body.position.y += k * 2.2;
        car.model.body.position.z = -k * 1.6;
        for (const w of car.model.wheels) w.pivot.visible = k < 0.5;
        if (k > 0.5 && car.speed > 2) {
          car.stompT = (car.stompT || 0) + dt * car.speed * 0.2;
          if (car.stompT > 1) {
            car.stompT = 0;
            fx.dust(car.pos.clone(), _w.set(0, 1, 0), 0x9a8a70, 1.2);
            if (car.isPlayer) fx.shake(0.12);
          }
        }
      }
    }
  }

  hudState() {
    const p = G.player;
    const mode = this.cfg.mode;
    const others = G.cars.filter((c) => c !== p);
    let opponentsLabel = `Opponents: ${others.filter((c) => c.alive || c.lives > 0).length}`;
    if (mode === 'endurance') opponentsLabel = `Opponents Killed: ${p.kills}`;
    const key = mode === 'hunted' ? 'score' : 'kills';
    const sorted = G.cars.slice().sort((a, b) => b[key] - a[key]);
    const rows = sorted.slice(0, 3).map((c) => ({ rank: sorted.indexOf(c) + 1, name: c.isPlayer ? 'You' : c.name, score: c[key], me: c.isPlayer }));
    if (!rows.find((r) => r.me)) rows.push({ rank: sorted.indexOf(p) + 1, name: 'You', score: p[key], me: true });
    const timer = this.timeLimit ? this.timeLimit - this.time : this.time;
    const pr = this.respawnQ.find((r) => r.car === p);
    return {
      opponentsLabel,
      scoreRows: rows,
      timer,
      respawn: pr ? `Respawning in ${Math.ceil(pr.t)}` : !p.alive && p.lives <= 0 ? 'ELIMINATED' : null,
      scoreboard: input.score
        ? G.cars
            .slice()
            .sort((a, b) => b.kills - a.kills)
            .map((c) => ({ name: c.isPlayer ? 'You' : c.name, vehicle: c.def.name, kills: c.kills, deaths: c.deaths, me: c.isPlayer }))
        : null,
    };
  }
  results() {
    const p = G.player;
    const sorted = G.cars.slice().sort((a, b) => b.kills - a.kills);
    const place = sorted.indexOf(p) + 1;
    const t = this.time;
    const ord = (n) => n + (['th', 'st', 'nd', 'rd'][n % 10 > 3 || Math.floor(n / 10) === 1 ? 0 : n % 10] || 'th');
    return {
      modeName: this.cfg.modeName,
      win: this.win,
      time: `${String(Math.floor(t / 60)).padStart(2, '0')}:${(t % 60).toFixed(3).padStart(6, '0')}`,
      kills: p.kills,
      deaths: p.deaths,
      place: `${ord(place)} of ${G.cars.length}`,
    };
  }
}

// the player's controls (G.input is swapped for an edge-free proxy on later substeps)
function playerCtrl() {
  return G.input;
}
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(R() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
