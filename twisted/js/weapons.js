// Weapons: machine gun, pickup weapons (fire/homing/power/stalker missiles, napalm,
// ricochet, remote bomb, shotgun, sniper), energy moves (freeze missile, shield, drop mine,
// jump) and every vehicle's special + alternate special. Also lock-on targeting and the
// glowing world pickups (weapons, health, turbo).
import * as THREE from 'three';
import { clamp, R, G, bus, lerp } from './core.js';
import { F } from './fx.js';

export const WEAPON_INFO = {
  special: { name: 'Special', short: 'S' },
  fire: { name: 'Fire Missile', give: 2, dmg: 16, color: 0xff7a2a },
  homing: { name: 'Homing Missile', give: 2, dmg: 12, color: 0xb06aff },
  power: { name: 'Power Missile', give: 1, dmg: 75, color: 0xff3a5a },
  napalm: { name: 'Napalm', give: 1, dmg: 15, color: 0xff9a2a },
  ricochet: { name: 'Ricochet', give: 2, dmg: 30, color: 0x9ae0ff },
  remote: { name: 'Remote Bomb', give: 1, dmg: 60, color: 0xffd23a },
  stalker: { name: 'Stalker Missile', give: 1, dmg: 45, color: 0x5affc8 },
  shotgun: { name: 'Shotgun', give: 3, dmg: 40, color: 0xe8e8e8 },
  sniper: { name: 'Sniper Rifle', give: 2, dmg: 50, color: 0x8ad0ff },
};
// carousel order on the HUD (bottom center)
export const CAROUSEL = ['special', 'fire', 'homing', 'power', 'stalker', 'napalm', 'ricochet', 'remote', 'shotgun', 'sniper'];
const PICK_TABLE = [
  ['fire', 7], ['homing', 6], ['power', 3], ['napalm', 3], ['ricochet', 3], ['remote', 3], ['stalker', 2], ['shotgun', 3], ['sniper', 2],
];

const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _u = new THREE.Vector3();
const UPV = new THREE.Vector3(0, 1, 0);

// ---------- projectile meshes ----------
function missileMesh(color, scale = 1, glow = 0xffa040) {
  const g = new THREE.Group();
  const bodyM = new THREE.MeshStandardMaterial({ color: 0xd8d4c8, metalness: 0.5, roughness: 0.4 });
  const tipM = new THREE.MeshStandardMaterial({ color, roughness: 0.5, emissive: color, emissiveIntensity: 0.25 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.9, 8), bodyM);
  body.rotation.x = Math.PI / 2;
  g.add(body);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.32, 8), tipM);
  nose.rotation.x = Math.PI / 2;
  nose.position.z = 0.6;
  g.add(nose);
  for (let i = 0; i < 4; i++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.22, 0.22), tipM);
    fin.position.z = -0.38;
    fin.rotation.z = (i * Math.PI) / 2;
    fin.position.x = Math.sin((i * Math.PI) / 2) * 0.12;
    fin.position.y = Math.cos((i * Math.PI) / 2) * 0.12;
    g.add(fin);
  }
  const fl = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), new THREE.MeshBasicMaterial({ color: glow, toneMapped: false }));
  fl.position.z = -0.5;
  g.add(fl);
  g.scale.setScalar(scale);
  return g;
}
const MESHES = {
  fire: () => missileMesh(0xff6a1a),
  homing: () => missileMesh(0x9a4aff, 1, 0xc080ff),
  power: () => missileMesh(0xff2a3a, 1.8),
  stalker: () => missileMesh(0x2affb0, 1.3, 0x80ffd8),
  freeze: () => {
    const m = missileMesh(0x6ab8ff, 1, 0x9ad8ff);
    return m;
  },
  rpg: () => missileMesh(0x6a7a3a, 1.4),
  mini: () => missileMesh(0xff8a2a, 0.6),
  rat: () => missileMesh(0xc02a1a, 1.6),
  napalm: () => {
    const g = new THREE.Group();
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.8, 10), new THREE.MeshStandardMaterial({ color: 0xb02a14, roughness: 0.5, metalness: 0.4 }));
    c.rotation.x = Math.PI / 2;
    g.add(c);
    const b = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.04, 4, 12), new THREE.MeshStandardMaterial({ color: 0x222 }));
    g.add(b);
    return g;
  },
  remote: () => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 8), new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.4, metalness: 0.6 })));
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 4), new THREE.MeshBasicMaterial({ color: 0xff2a1a, toneMapped: false }));
    l.position.y = 0.42;
    l.name = 'blink';
    g.add(l);
    return g;
  },
  ricochet: () => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.3, 0.8), new THREE.MeshStandardMaterial({ color: 0x3a5a7a, metalness: 0.5, roughness: 0.4 })));
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 4), new THREE.MeshBasicMaterial({ color: 0x9ae0ff, toneMapped: false }));
    l.position.y = 0.2;
    g.add(l);
    return g;
  },
  mine: () => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 0.18, 12), new THREE.MeshStandardMaterial({ color: 0x3a3a30, roughness: 0.5, metalness: 0.5 })));
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 4), new THREE.MeshBasicMaterial({ color: 0xff2a1a, toneMapped: false }));
    l.position.y = 0.12;
    l.name = 'blink';
    g.add(l);
    return g;
  },
  ghost: () => {
    const g = new THREE.Group();
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 10), new THREE.MeshBasicMaterial({ color: 0xffb070, toneMapped: false }));
    g.add(s);
    const n = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff2010, toneMapped: false }));
    n.position.z = 0.55;
    g.add(n);
    return g;
  },
  soul: () => new THREE.Mesh(new THREE.SphereGeometry(0.6, 12, 8), new THREE.MeshBasicMaterial({ color: 0xc070ff, toneMapped: false, transparent: true, opacity: 0.8 })),
  gurney: () => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.15, 2.0), new THREE.MeshStandardMaterial({ color: 0xc8c8c4, metalness: 0.7, roughness: 0.3 })));
    const sheet = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.3, 1.8), new THREE.MeshStandardMaterial({ color: 0xe8e4da, roughness: 0.9 }));
    sheet.position.y = 0.2;
    g.add(sheet);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), new THREE.MeshStandardMaterial({ color: 0xd8b08c }));
    head.position.set(0, 0.35, 0.85);
    g.add(head);
    const rk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.6, 8), new THREE.MeshStandardMaterial({ color: 0x8a1a1a }));
    rk.rotation.x = Math.PI / 2;
    rk.position.set(0, -0.15, -1.1);
    g.add(rk);
    return g;
  },
  saw: () => {
    const g = new THREE.Group();
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.26, 1.2), new THREE.MeshStandardMaterial({ color: 0xd0d0d0, metalness: 0.9, roughness: 0.2 }));
    blade.position.z = 0.4;
    g.add(blade);
    g.add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.32, 0.45), new THREE.MeshStandardMaterial({ color: 0xd6b320 })));
    return g;
  },
  taxi: () => {
    const g = new THREE.Group();
    const y = new THREE.MeshStandardMaterial({ color: 0xd6a618, roughness: 0.5 });
    const b = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.7, 4.2), y);
    g.add(b);
    const c = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.55, 2.0), y);
    c.position.y = 0.6;
    g.add(c);
    return g;
  },
  coffin: () => new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.45, 2.1), new THREE.MeshStandardMaterial({ color: 0x3a2418, roughness: 0.6 })),
  ratbomb: () => new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), new THREE.MeshStandardMaterial({ color: 0x5a5048, roughness: 0.9 })),
};

export class Weapons {
  constructor(scene, fx, audio) {
    this.scene = scene;
    this.fx = fx;
    this.audio = audio;
    this.proj = [];
    this.pools = {};
    this.fires = []; // napalm fire pools
    this.pickups = [];
    this.guided = null; // projectile steered by the player
  }

  mesh(kind) {
    const pool = this.pools[kind] || (this.pools[kind] = []);
    const m = pool.pop() || MESHES[kind]();
    m.visible = true;
    this.scene.add(m);
    return m;
  }
  release(p) {
    if (!p.mesh) return;
    p.mesh.visible = false;
    this.scene.remove(p.mesh);
    (this.pools[p.kind] || (this.pools[p.kind] = [])).push(p.mesh);
    p.mesh = null;
  }

  // best enemy in the forward cone with line of sight
  findTarget(car, cone = 0.45, range = 230, rear = false) {
    let best = null, bs = 1e9;
    const fx = car.forward.x * (rear ? -1 : 1), fz = car.forward.z * (rear ? -1 : 1);
    for (const o of G.cars) {
      if (o === car || !o.alive || o.invisible > 0) continue;
      if (G.teams && o.team === car.team && car.team !== 0) continue;
      const dx = o.pos.x - car.pos.x, dz = o.pos.z - car.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > range || d < 1) continue;
      const dot = (dx * fx + dz * fz) / d;
      const ang = Math.acos(clamp(dot, -1, 1));
      if (ang > cone) continue;
      const s = ang * 60 + d * 0.35;
      if (s < bs) {
        if (G.world.segmentBlocked(car.pos.x, car.pos.y + 1.2, car.pos.z, o.pos.x, o.pos.y + 1.2, o.pos.z, 3) >= 0) continue;
        bs = s;
        best = o;
      }
    }
    return best;
  }
  nearestEnemy(car, range = 80, needLOS = true) {
    let best = null, bd = range;
    for (const o of G.cars) {
      if (o === car || !o.alive || o.invisible > 0) continue;
      if (G.teams && o.team === car.team && car.team !== 0) continue;
      const d = o.pos.distanceTo(car.pos);
      if (d < bd) {
        if (needLOS && G.world.segmentBlocked(car.pos.x, car.pos.y + 1.5, car.pos.z, o.pos.x, o.pos.y + 1.2, o.pos.z, 3) >= 0) continue;
        bd = d;
        best = o;
      }
    }
    return best;
  }

  // ---------- per-car firing ----------
  control(car, c, dt) {
    if (!car.alive) return;
    car.target = this.findTarget(car, c.rear ? 0.6 : 0.42, 230, c.rear);
    const disabled = car.frozen > 0;
    car.mgCool = Math.max(0, (car.mgCool || 0) - dt);
    car.fireCool = Math.max(0, (car.fireCool || 0) - dt);
    // weapon cycling
    if (c.prev || c.next) {
      const avail = CAROUSEL.filter((k) => k === 'special' || car.weapons[k] > 0);
      let i = avail.indexOf(car.selected);
      i = (i + (c.next ? 1 : -1) + avail.length) % avail.length;
      car.selected = avail[i];
      if (car.isPlayer) this.audio.ui('tick');
    }
    if (car.selected !== 'special' && !(car.weapons[car.selected] > 0)) car.selected = 'special';
    if (disabled) return;

    // machine gun
    if (c.mg && car.mgAmmo > 0 && car.mgCool <= 0) {
      const gat = car.gatling > 0;
      car.mgCool = gat ? 0.045 : 0.085;
      car.mgAmmo -= gat ? 0 : 1;
      this.fireMG(car, gat ? 5 : 2.6, c.rear);
    }
    if (car.gatling > 0) car.gatling -= dt;

    // energy moves
    if (c.freeze && car.energy >= 45) {
      car.energy -= 45;
      this.launch(car, 'freeze', { rear: c.rear });
    }
    if (c.shield && car.energy >= 50) {
      car.energy -= 50;
      car.shield = 4;
      bus.emit('shieldOn', car);
    }
    if (c.mine && car.energy >= 25) {
      car.energy -= 25;
      this.dropMine(car);
    }
    if (c.jump && car.energy >= 20 && car.onGround) {
      car.energy -= 20;
      car.vel.y = 11;
      car.onGround = false;
      car.airTime = 0;
      bus.emit('jump', car);
    }

    // remote bombs / napalm detonate on a second press
    if (c.fire) {
      const pending = this.proj.find((p) => p.owner === car && p.detonatable && p.t > 0.15);
      if (pending) {
        pending.detonate = true;
        return;
      }
    }

    const sel = car.selected;
    if (sel === 'special') this.special(car, c, dt);
    else if (sel === 'stalker' || sel === 'sniper') {
      // hold to charge, release to fire
      if (c.fireHeld) {
        car.charge = Math.min(1.5, (car.charge || 0) + dt);
        car.charging = sel;
      } else if (car.charging === sel && car.charge > 0) {
        this.firePickup(car, sel, c.rear, car.charge);
        car.charge = 0;
        car.charging = null;
      }
    } else if (c.fire && car.fireCool <= 0) {
      this.firePickup(car, sel, c.rear, 0);
    }
    if (c.alt && car.selected === 'special') this.altSpecial(car, c);
  }

  firePickup(car, kind, rear, charge) {
    if (!(car.weapons[kind] > 0)) return;
    car.weapons[kind]--;
    car.fireCool = 0.35;
    switch (kind) {
      case 'fire':
      case 'homing':
      case 'power':
        this.launch(car, kind, { rear });
        break;
      case 'stalker':
        this.launch(car, 'stalker', { rear, charge });
        break;
      case 'napalm':
        this.lob(car, 'napalm', { speed: 26, up: 12, rear });
        break;
      case 'remote':
        this.lob(car, 'remote', { speed: 22, up: 10, rear });
        break;
      case 'ricochet':
        this.launch(car, 'ricochet', { rear });
        break;
      case 'shotgun':
        this.shotgun(car, 40, 36, 0.38, 'Shotgun', rear);
        break;
      case 'sniper':
        this.sniper(car, charge);
        break;
    }
    if (car.selected === kind && car.weapons[kind] <= 0) car.selected = 'special';
  }

  // ---------- specials ----------
  special(car, c, dt) {
    const id = car.def.id;
    const fireP = c.fire && car.fireCool <= 0;
    const useAmmo = () => {
      if (car.special <= 0) return false;
      car.special--;
      car.fireCool = 0.6;
      return true;
    };
    switch (id) {
      case 'sweettooth':
        if (car.mechT > 0) {
          if (c.fireHeld && car.fireCool <= 0) {
            car.fireCool = 0.07;
            this.fireMG(car, 4, false, 'Sweet Bot Gun', 1.2);
            if (R() < 0.12) this.launch(car, 'mini', { name: 'Sweet Bot Rockets', dmg: 8 });
          }
        } else if (fireP && useAmmo()) this.launch(car, 'ghost', { name: 'Laughing Ghost', dmg: 40 });
        break;
      case 'roadkill':
        if (c.fireHeld && car.special > 0) {
          car.charge = Math.min(2.4, (car.charge || 0) + dt);
          car.charging = 'special';
        } else if (car.charging === 'special' && car.charge > 0) {
          const n = 1 + Math.floor(car.charge / 0.45);
          useAmmo();
          for (let i = 0; i < n; i++) setTimeout(() => this.launch(car, 'mini', { name: 'Charge Missiles', dmg: 10, spread: (i - n / 2) * 0.08 }), i * 70);
          car.charge = 0;
          car.charging = null;
        }
        break;
      case 'kamikaze':
        if (c.fireHeld && car.fuel > 0) {
          car.fuel = Math.max(0, car.fuel - dt * 22);
          this.flamethrower(car, dt);
        }
        break;
      case 'outlaw':
        if (c.fireHeld && car.fuel > 0) {
          car.fuel = Math.max(0, car.fuel - dt * 16);
          this.turret(car, dt);
        }
        break;
      case 'meatwagon':
        if (fireP && useAmmo()) this.launch(car, 'gurney', { name: 'Gurney Bomb', dmg: 55 });
        break;
      case 'axel':
        if (fireP && useAmmo()) this.shockwave(car, 22, 38, 'Shockwave');
        break;
      case 'crimsonfury':
        if (fireP && useAmmo()) this.shotgun(car, 52, 45, 0.3, 'Phantom Shotgun', c.rear);
        break;
      case 'reaper':
        if (c.fireHeld && car.special > 0) {
          car.charge = Math.min(2, (car.charge || 0) + dt);
          car.charging = 'special';
          if (car.charge > 1 && car.speed > 8) car.sawLit = true;
          if (car.sawLit) this.fx.fireTrail(car.local(_v.set(0.35, 0.95, 0.7)), 0xffd070, 0xff3a00, 0.5);
          else if (car.speed > 6 && R() < 0.6) this.fx.sparks(car.local(_v.set(0.35, 0.1, 0.7)), UPV, 2, 0xffc060, 6);
        } else if (car.charging === 'special' && car.charge > 0) {
          useAmmo();
          this.launch(car, 'saw', { name: car.sawLit ? 'Flaming Chainsaw' : 'Chainsaw', dmg: car.sawLit ? 90 : 45, lit: car.sawLit });
          car.charge = 0;
          car.charging = null;
          car.sawLit = false;
        }
        break;
      case 'darkside':
        if (fireP && useAmmo()) {
          car.ramBoost = 1.8;
          car.turbo = Math.max(car.turbo, 30);
          bus.emit('ramBoost', car);
        }
        break;
      case 'vermin':
        if (fireP && useAmmo()) this.launch(car, 'rat', { name: 'Rat Rocket', dmg: 60, guided: car.isPlayer });
        break;
      case 'shadow':
        if (fireP && useAmmo()) this.launch(car, 'soul', { name: 'Soul Shadow', dmg: 45, ghost: true });
        break;
      case 'junkyarddog':
        if (fireP && useAmmo()) this.lob(car, 'taxi', { speed: 30, up: 9, name: 'Taxi Slam', dmg: 60, radius: 7 });
        break;
    }
  }
  altSpecial(car) {
    const id = car.def.id;
    const cost = car.def.alt.cost;
    if (car.def.special.fuel) {
      if (car.fuel < cost) return;
      car.fuel -= cost;
    } else {
      if (car.special < cost) return;
      car.special -= cost;
    }
    switch (id) {
      case 'sweettooth':
        car.mechT = 10;
        bus.emit('transform', car);
        break;
      case 'roadkill':
        car.gatling = 3;
        break;
      case 'kamikaze':
        this.empRing(car, 16, 2.6, 'Shock Freeze');
        break;
      case 'outlaw': {
        const t = car.target || this.nearestEnemy(car, 35);
        if (t) {
          this.fx.bolt(car.local(_v.set(0, 2.4, -1.2)), t.centerOut(_w), 0xa0d8ff);
          this.hitCar(t, car, 15, 'Tazer', t.centerOut(_w));
          t.stalled = 3.5;
          bus.emit('stall', t, car);
        }
        break;
      }
      case 'meatwagon':
        this.launch(car, 'gurney', { name: 'Guided Gurney', dmg: 65, guided: car.isPlayer });
        break;
      case 'axel':
        car.vel.y = 16;
        car.onGround = false;
        car.slamPending = true;
        break;
      case 'crimsonfury':
        car.invisible = 6;
        bus.emit('vanish', car);
        break;
      case 'reaper':
        this.launch(car, 'rpg', { name: 'RPG', dmg: 40, nohome: true, speed: 95 });
        break;
      case 'darkside':
        car.shield = 3;
        car.ramBoost = 1.2;
        break;
      case 'vermin':
        for (let i = 0; i < 3; i++) this.lob(car, 'ratbomb', { speed: 22 + i * 6, up: 14, name: 'Rat Mortar', dmg: 25, radius: 6, spread: (i - 1) * 0.15 });
        break;
      case 'shadow':
        this.dropMine(car, 'coffin', { name: 'Death Coffin', dmg: 50, remote: true });
        break;
      case 'junkyarddog':
        car.heal(30);
        bus.emit('repair', car);
        break;
    }
  }

  // ---------- weapon behaviours ----------
  muzzles(car) {
    const guns = car.model.parts.guns || [];
    return guns.map((gn) => gn.localToWorld(_u.set(0, 0.02, 1.3)).clone());
  }
  fireMG(car, dmg, rear, name = 'Machine Gun', spreadMul = 1) {
    const ms = this.muzzles(car);
    car._mgSide = ((car._mgSide || 0) + 1) % Math.max(1, ms.length);
    const from = ms[car._mgSide] || car.local(_v.set(0, 1.2, 2));
    const dir = _w.copy(car.forward).multiplyScalar(rear ? -1 : 1);
    if (rear) from.copy(car.local(_v.set(0, 1.0, -car.length / 2 - 0.3)));
    // aim assist toward the locked target
    const t = car.target;
    if (t) {
      t.centerOut(_u).addScaledVector(t.vel, from.distanceTo(_u) / 260);
      _u.sub(from).normalize();
      if (_u.dot(dir) > 0.82) dir.copy(_u);
    } else dir.y += 0.01;
    dir.x += (R() - 0.5) * 0.03 * spreadMul;
    dir.y += (R() - 0.5) * 0.015 * spreadMul;
    dir.z += (R() - 0.5) * 0.03 * spreadMul;
    dir.normalize();
    this.proj.push({ kind: 'bullet', owner: car, pos: from.clone(), vel: dir.clone().multiplyScalar(260).add(car.vel), t: 0, life: 1.2, dmg, name });
    this.fx.muzzle(from, dir, 0xffe0a0, 0.7);
    if (car.isPlayer || R() < 0.5) this.audio.gun(from, car.isPlayer);
  }
  launch(car, kind, o = {}) {
    const rear = !!o.rear;
    const dir = car.forward.clone().multiplyScalar(rear ? -1 : 1);
    if (o.spread) dir.applyAxisAngle(UPV, o.spread);
    const mp = car.model.parts.missile ? car.local(_v.copy(car.model.parts.missile)) : car.local(_v.set(0, 1.4, 1));
    if (rear) mp.copy(car.local(_v.set(0, 1.2, -car.length / 2 - 0.6)));
    const target = o.nohome ? null : car.target || (kind === 'freeze' || kind === 'homing' || kind === 'ghost' || kind === 'soul' ? this.findTarget(car, 1.2, 200, rear) : null);
    const spec = {
      fire: { speed: 75, turn: 1.1, dmg: 16, name: 'Fire Missile', life: 4, r: 0.8 },
      homing: { speed: 55, turn: 3.2, dmg: 12, name: 'Homing Missile', life: 5, r: 0.8 },
      power: { speed: 25, accel: 120, max: 105, turn: 0, dmg: 75, name: 'Power Missile', life: 4, r: 1.2, blast: 6 },
      stalker: { speed: 50, turn: 1 + (o.charge || 0) * 2.5, dmg: 45, name: 'Stalker Missile', life: 6, r: 0.9 },
      freeze: { speed: 60, turn: 2.4, dmg: 1, name: 'Freeze Missile', life: 4, r: 0.9, freeze: 3.2 },
      ghost: { speed: 42, turn: 3.6, dmg: 40, name: 'Laughing Ghost', life: 6, r: 1.1, blast: 4 },
      mini: { speed: 70, turn: 2.2, dmg: o.dmg || 10, name: o.name || 'Rockets', life: 3, r: 0.7 },
      gurney: { speed: 30, turn: 2.0, dmg: o.dmg || 55, name: o.name || 'Gurney Bomb', life: 7, r: 1.3, blast: 7 },
      saw: { speed: 62, turn: 0.8, dmg: o.dmg || 45, name: o.name || 'Chainsaw', life: 3, r: 1.2 },
      rpg: { speed: o.speed || 95, turn: 0, dmg: 40, name: 'RPG', life: 3, r: 1, blast: 5 },
      rat: { speed: 48, turn: 2.2, dmg: 60, name: 'Rat Rocket', life: 7, r: 1.1, blast: 7 },
      soul: { speed: 46, turn: 2.8, dmg: 45, name: 'Soul Shadow', life: 6, r: 1.2, ghost: true },
      ricochet: { speed: 34, turn: 0, dmg: 30, name: 'Ricochet', life: 6, r: 0.9, ground: true },
    }[kind];
    const p = {
      kind, owner: car, pos: mp.clone(), vel: dir.multiplyScalar(spec.speed).add(_w.set(car.vel.x, 0, car.vel.z).multiplyScalar(0.6)), t: 0, life: spec.life,
      speed: spec.speed, accel: spec.accel || 0, max: spec.max || spec.speed, turn: spec.turn, dmg: o.dmg || spec.dmg, name: o.name || spec.name,
      r: spec.r, blast: spec.blast || 3.5, freeze: spec.freeze || 0, target, ghost: spec.ghost, ground: spec.ground, lit: o.lit,
      guided: !!o.guided,
    };
    if (kind === 'ricochet') {
      p.pos.copy(car.local(_v.set(0, 0.4, rear ? -car.length / 2 - 0.8 : car.length / 2 + 0.8)));
      p.vel.y = 0;
    }
    p.mesh = this.mesh(kind);
    p.mesh.position.copy(p.pos);
    this.proj.push(p);
    if (p.guided) this.guided = p;
    this.audio.launch(p.pos, kind, car.isPlayer);
    bus.emit('launch', car, p);
    if (target && target.isPlayer && (kind === 'homing' || kind === 'ghost' || kind === 'soul' || kind === 'stalker')) bus.emit('targeted', target, p.name);
    return p;
  }
  lob(car, kind, o) {
    const dir = car.forward.clone().multiplyScalar(o.rear ? -1 : 1);
    if (o.spread) dir.applyAxisAngle(UPV, o.spread);
    let speed = o.speed;
    // aim the arc at the locked target
    const t = car.target;
    if (t && !o.rear) {
      const d = t.pos.distanceTo(car.pos);
      // flight time for the given launch height is 2*up/g, so pick the horizontal speed
      speed = clamp((d * 22) / (2 * o.up), 8, 60);
      _u.subVectors(t.pos, car.pos).setY(0).normalize();
      dir.copy(_u);
    }
    const from = car.local(_v.set(0, car.height + 0.5, o.rear ? -car.length / 2 : 0.5));
    const p = {
      kind, owner: car, pos: from.clone(), vel: dir.multiplyScalar(speed).add(_w.set(car.vel.x, 0, car.vel.z)).setY(o.up), t: 0, life: 12,
      dmg: o.dmg || WEAPON_INFO[kind]?.dmg || 30, name: o.name || WEAPON_INFO[kind]?.name || kind, r: 0.8, lobbed: true,
      detonatable: kind === 'remote' || kind === 'napalm', radius: o.radius || (kind === 'remote' ? 9 : 5), spin: new THREE.Vector3(R() * 4, R() * 4, R() * 4),
    };
    p.mesh = this.mesh(kind);
    this.proj.push(p);
    this.audio.launch(p.pos, 'lob', car.isPlayer);
  }
  dropMine(car, kind = 'mine', o = {}) {
    const p = {
      kind, owner: car, pos: car.local(_v.set(0, 0.3, -car.length / 2 - 0.9)).clone(), vel: car.vel.clone().multiplyScalar(0.2), t: 0, life: 40,
      dmg: o.dmg || 10, name: o.name || 'Drop Mine', r: 2.2, mine: true, armed: false, detonatable: !!o.remote,
    };
    p.vel.y = 2;
    p.mesh = this.mesh(kind);
    this.proj.push(p);
    this.audio.ui('mine');
  }
  shotgun(car, maxDmg, range, cone, name, rear) {
    const from = car.local(_v.set(0, 1.1, (rear ? -1 : 1) * (car.length / 2 + 0.3))).clone();
    const fwd = car.forward.clone().multiplyScalar(rear ? -1 : 1);
    for (let i = 0; i < 14; i++) {
      _w.copy(fwd).applyAxisAngle(UPV, (R() - 0.5) * cone * 2);
      _w.y += (R() - 0.3) * 0.1;
      this.fx.tracer(from.clone().addScaledVector(_w, 2), _w.clone().multiplyScalar(180), 0xfff0c0);
    }
    this.fx.muzzle(from, fwd, 0xfff0c0, 2.4);
    this.fx.light(from, 0xffd890, 40, 0.12, 14);
    for (const o of G.cars) {
      if (o === car || !o.alive) continue;
      _u.subVectors(o.pos, car.pos).setY(0);
      const d = _u.length();
      if (d > range) continue;
      _u.normalize();
      if (Math.acos(clamp(_u.dot(fwd), -1, 1)) > cone + 0.12) continue;
      if (G.world.segmentBlocked(from.x, from.y, from.z, o.pos.x, o.pos.y + 1, o.pos.z, 3) >= 0) continue;
      const dmg = Math.round(maxDmg * clamp(1 - d / range, 0.15, 1));
      this.hitCar(o, car, dmg, name, o.centerOut(new THREE.Vector3()));
      o.vel.addScaledVector(_u, 6);
    }
    this.audio.boom(from, 0.5, car.isPlayer);
    G.props.blast(from.clone().addScaledVector(fwd, 6), 6, 15, car);
  }
  sniper(car, charge) {
    const from = car.local(_v.set(0, 1.4, 1)).clone();
    const t = car.target;
    const dir = t ? t.centerOut(new THREE.Vector3()).sub(from).normalize() : car.forward.clone();
    const dmg = Math.round(lerp(20, 60, clamp(charge / 1.5, 0, 1)));
    const end = from.clone().addScaledVector(dir, 250);
    const tb = G.world.segmentBlocked(from.x, from.y, from.z, end.x, end.y, end.z, 1);
    if (tb >= 0) end.lerpVectors(from, end, tb);
    for (let i = 0; i < 20; i++) this.fx.tracer(from.clone().lerp(end, i / 20), dir.clone().multiplyScalar(30), 0x9ad8ff);
    if (t && (tb < 0 || from.distanceTo(t.pos) < from.distanceTo(end))) this.hitCar(t, car, dmg, 'Sniper Rifle', t.centerOut(new THREE.Vector3()));
    this.audio.boom(from, 0.4, car.isPlayer);
  }
  flamethrower(car, dt) {
    const noz = car.model.parts.flameNozzle ? car.local(_v.copy(car.model.parts.flameNozzle)).clone() : car.local(_v.set(0, 1, car.length / 2)).clone();
    for (let i = 0; i < 3; i++) {
      _w.copy(car.forward).multiplyScalar(26 + R() * 8);
      _w.x += (R() - 0.5) * 4;
      _w.y += (R() - 0.3) * 2;
      _w.z += (R() - 0.5) * 4;
      _w.add(car.vel);
      this.fx.flame(noz, _w.clone(), 0.6);
    }
    this.audio.flame(noz, car.isPlayer, dt);
    car._flameTick = (car._flameTick || 0) + dt;
    if (car._flameTick < 0.12) return;
    car._flameTick = 0;
    for (const o of G.cars) {
      if (o === car || !o.alive) continue;
      _u.subVectors(o.pos, car.pos);
      const d = _u.length();
      if (d > 20) continue;
      _u.y = 0;
      _u.normalize();
      if (_u.dot(car.forward) < 0.8) continue;
      this.hitCar(o, car, 5, 'Flame Thrower', o.centerOut(new THREE.Vector3()));
      o.burning = Math.max(o.burning, 2);
      o.burnSource = car;
    }
    G.props.blast(noz.clone().addScaledVector(car.forward, 8), 4, 6, car);
  }
  turret(car, dt) {
    const t = this.nearestEnemy(car, 70);
    const tp = car.model.parts.turret;
    if (!tp) return;
    let want = car.turretYaw || 0;
    if (t) {
      const dx = t.pos.x - car.pos.x, dz = t.pos.z - car.pos.z;
      want = Math.atan2(dx, dz) - car.yaw;
    }
    car.turretYaw = (car.turretYaw || 0) + Math.atan2(Math.sin(want - (car.turretYaw || 0)), Math.cos(want - (car.turretYaw || 0))) * Math.min(1, dt * 10);
    car.turretCool = (car.turretCool || 0) - dt;
    if (car.turretCool > 0) return;
    car.turretCool = 0.09;
    const g = car.model.parts.turretGun;
    const from = g.localToWorld(_v.set(0, 0, 1.2)).clone();
    const dir = t ? t.centerOut(new THREE.Vector3()).sub(from).normalize() : g.getWorldDirection(new THREE.Vector3());
    dir.x += (R() - 0.5) * 0.04;
    dir.z += (R() - 0.5) * 0.04;
    dir.normalize();
    this.proj.push({ kind: 'bullet', owner: car, pos: from, vel: dir.multiplyScalar(240), t: 0, life: 1, dmg: 3.7, name: 'SUV Turret' });
    this.fx.muzzle(from, dir, 0xffe0a0, 0.6);
    this.audio.gun(from, car.isPlayer);
  }
  shockwave(car, radius, dmg, name) {
    const c = car.pos.clone();
    c.y += 0.3;
    this.fx.shockwave(c, radius, 0xc8e0ff);
    this.fx.shake(car.isPlayer ? 0.8 : 0.2);
    this.fx.light(c, 0x9ac8ff, 90, 0.4, radius * 1.5);
    this.audio.boom(c, 1.3, car.isPlayer);
    for (const o of G.cars) {
      if (o === car || !o.alive) continue;
      const d = o.pos.distanceTo(car.pos);
      if (d > radius) continue;
      const f = 1 - d / radius;
      this.hitCar(o, car, Math.round(dmg * (0.4 + 0.6 * f)), name, o.centerOut(new THREE.Vector3()));
      _u.subVectors(o.pos, car.pos).setY(0).normalize();
      o.vel.addScaledVector(_u, 14 * f);
      o.vel.y = 8 * f + 3;
      o.onGround = false;
    }
    G.props.blast(c, radius, 25, car);
  }
  empRing(car, radius, freeze, name) {
    const c = car.pos.clone();
    c.y += 0.6;
    this.fx.shockwave(c, radius, 0x7ab8ff);
    this.fx.ice(c, 30);
    this.audio.zap(c, car.isPlayer);
    for (const o of G.cars) {
      if (o === car || !o.alive) continue;
      if (o.pos.distanceTo(car.pos) > radius) continue;
      this.hitCar(o, car, 6, name, o.centerOut(new THREE.Vector3()));
      if (o.shield <= 0) {
        o.frozen = freeze;
        bus.emit('frozen', o, car);
      }
    }
  }

  // ---------- damage plumbing ----------
  hitCar(target, owner, dmg, name, at) {
    const dealt = target.damage(dmg, owner, name);
    if (dealt > 0) bus.emit('hit', owner, target, dealt, name, at);
    return dealt;
  }
  explode(p, at, direct) {
    const blast = p.blast || p.radius || 3.5;
    const big = p.dmg >= 40 ? 1.6 : p.dmg >= 20 ? 1.15 : 0.8;
    this.fx.explosion(at, p.kind === 'freeze' ? 0.8 : big, p.kind === 'freeze' ? 'freeze' : p.kind === 'soul' ? 'purple' : 'normal');
    this.fx.shake(G.player && at.distanceTo(G.player.pos) < 30 ? 0.35 * big : 0);
    this.audio.boom(at, big, p.owner && p.owner.isPlayer);
    if (direct) {
      this.hitCar(direct, p.owner, p.dmg, p.name, at);
      if (p.freeze && direct.shield <= 0) {
        direct.frozen = p.freeze;
        this.fx.ice(at, 18);
        bus.emit('frozen', direct, p.owner);
      }
      _u.copy(p.vel).setY(0).normalize();
      direct.vel.addScaledVector(_u, p.dmg * 0.12);
      direct.vel.y += p.dmg * 0.06;
      if (p.dmg >= 40) direct.onGround = false;
      if (p.lit) {
        direct.burning = 4;
        direct.burnSource = p.owner;
      }
    }
    // splash
    for (const o of G.cars) {
      if (o === direct || !o.alive) continue;
      const d = o.pos.distanceTo(at);
      if (d > blast) continue;
      const f = 1 - d / blast;
      const dmg = Math.round(p.dmg * 0.5 * f);
      if (dmg > 0) this.hitCar(o, p.owner, dmg, p.name, o.centerOut(new THREE.Vector3()));
      _u.subVectors(o.pos, at).setY(0).normalize();
      o.vel.addScaledVector(_u, 8 * f);
    }
    G.props.blast(at, blast + 1, p.dmg, p.owner);
    // landmarks
    for (const tg of G.world.targets) {
      if (tg.dead || tg.pos.distanceTo(at) > tg.r + blast) continue;
      tg.hp -= p.dmg;
      if (tg.hp <= 0) bus.emit('targetDestroyed', tg, p.owner);
    }
  }

  // ---------- update ----------
  update(dt) {
    const W = G.world;
    const keep = [];
    for (const p of this.proj) {
      p.t += dt;
      let dead = p.t > p.life;
      if (p.kind === 'bullet') {
        _v.copy(p.pos);
        p.pos.addScaledVector(p.vel, dt);
        this.fx.tracer(p.pos, p.vel, p.name === 'SUV Turret' ? 0xffd080 : 0xffe6a0);
        // cars
        let hit = null;
        for (const o of G.cars) {
          if (o === p.owner || !o.alive) continue;
          o.centerOut(_u);
          if (segSphere(_v, p.pos, _u, Math.max(o.radius, o.height * 0.5) + 0.3)) {
            hit = o;
            break;
          }
        }
        if (hit) {
          this.hitCar(hit, p.owner, p.dmg, p.name, p.pos);
          this.fx.sparks(p.pos, null, 3, 0xffd890, 8);
          if (R() < 0.3) this.audio.ping(p.pos);
          dead = true;
        } else {
          const tb = W.segmentBlocked(_v.x, _v.y, _v.z, p.pos.x, p.pos.y, p.pos.z, 0.3);
          const gy = W.groundHeight(p.pos.x, p.pos.z, p.pos.y);
          if (tb >= 0 || p.pos.y < gy) {
            if (tb >= 0) p.pos.lerpVectors(_v, p.pos, tb);
            this.fx.sparks(p.pos, UPV, 2, 0xffc070, 6);
            if (R() < 0.3) this.fx.emit('alpha', { pos: p.pos, vel: new THREE.Vector3(0, 1, 0), size: 0.3, size1: 1.2, life: 0.6, color: 0x8a8070, alpha: 0.5, frame: F.smoke });
            dead = true;
          }
          const pr = G.props.hitTest(p.pos, 0.2);
          if (pr) {
            G.props.damage(pr, p.dmg, p.owner);
            this.fx.sparks(p.pos, null, 3);
            dead = true;
          }
        }
        if (dead) continue;
        keep.push(p);
        continue;
      }

      if (p.mine) {
        p.vel.y -= 22 * dt;
        p.pos.addScaledVector(p.vel, dt);
        const gy = W.groundHeight(p.pos.x, p.pos.z, p.pos.y + 0.5);
        if (p.pos.y < gy + 0.1) {
          p.pos.y = gy + 0.1;
          p.vel.set(0, 0, 0);
        }
        p.armed = p.t > 0.6;
        const bl = p.mesh.getObjectByName('blink');
        if (bl) bl.visible = Math.sin(p.t * 12) > 0;
        if (p.armed) {
          for (const o of G.cars) {
            if (!o.alive || (o === p.owner && p.t < 3)) continue;
            if (o.pos.distanceTo(p.pos) < p.r + o.radius) {
              this.explode({ ...p, blast: 4 }, p.pos.clone(), o);
              o.vel.y += 9;
              o.onGround = false;
              dead = true;
              break;
            }
          }
        }
        if (p.detonate) {
          this.explode({ ...p, blast: 8 }, p.pos.clone(), null);
          dead = true;
        }
      } else if (p.lobbed) {
        p.vel.y -= (p.detonate && p.kind === 'napalm' ? 60 : 22) * dt;
        p.pos.addScaledVector(p.vel, dt);
        p.mesh.rotation.x += p.spin.x * dt;
        p.mesh.rotation.z += p.spin.z * dt;
        if (p.kind === 'napalm') this.fx.fireTrail(p.pos, 0xffb050, 0xff3a00, 0.5);
        const gy = W.groundHeight(p.pos.x, p.pos.z, p.pos.y + 0.5);
        let direct = null;
        for (const o of G.cars) {
          if (o === p.owner || !o.alive) continue;
          if (o.pos.distanceTo(p.pos) < o.radius + 1.0 && p.pos.y < o.pos.y + o.height + 0.5) direct = o;
        }
        const wall = W.pointSolid(p.pos.x, p.pos.y, p.pos.z);
        if (p.kind === 'remote') {
          const bl = p.mesh.getObjectByName('blink');
          if (bl) bl.visible = Math.sin(p.t * 10) > 0;
          if (p.pos.y <= gy + 0.4) {
            p.pos.y = gy + 0.4;
            p.vel.multiplyScalar(0.4);
            p.vel.y = 0;
          }
          if (wall) p.vel.set(0, 0, 0);
          if (direct && !p.stuck) {
            p.stuck = direct;
            p.stickOff = p.pos.clone().sub(direct.pos);
          }
          if (p.stuck) p.pos.copy(p.stuck.pos).add(p.stickOff);
          if (p.detonate || p.t > 11) {
            this.explode({ ...p, blast: p.radius }, p.pos.clone(), p.stuck && p.stuck.alive ? p.stuck : null);
            dead = true;
          }
        } else if (p.pos.y <= gy + 0.3 || direct || wall) {
          const at = p.pos.clone();
          at.y = Math.max(at.y, gy + 0.3);
          if (p.kind === 'napalm') {
            this.explode({ ...p, dmg: p.dmg, blast: 4 }, at, direct);
            this.fires.push({ pos: at, r: 5.5, t: 0, life: 7, owner: p.owner });
          } else this.explode({ ...p, blast: p.radius }, at, direct);
          dead = true;
        }
      } else if (p.ground) {
        // ricochet: rolls along the ground and bounces off walls
        p.pos.addScaledVector(p.vel, dt);
        const gy = W.groundHeight(p.pos.x, p.pos.z, p.pos.y + 1);
        p.pos.y = gy + 0.25;
        const col = W.pointSolid(p.pos.x, p.pos.y + 0.3, p.pos.z);
        if (col) {
          p.pos.addScaledVector(p.vel, -dt);
          // reflect off the dominant axis of the collider
          const n = colliderNormal(col, p.pos);
          const vn = p.vel.x * n.x + p.vel.z * n.z;
          p.vel.x -= 2 * vn * n.x;
          p.vel.z -= 2 * vn * n.z;
          this.fx.sparks(p.pos, null, 6);
          this.audio.ping(p.pos);
        }
        p.mesh.rotation.y = Math.atan2(p.vel.x, p.vel.z);
        if (R() < 0.5) this.fx.sparks(p.pos, UPV, 1, 0x9ae0ff, 3);
        for (const o of G.cars) {
          if (o === p.owner && p.t < 0.5) continue;
          if (!o.alive) continue;
          if (o.pos.distanceTo(p.pos) < o.radius + p.r) {
            this.explode(p, p.pos.clone(), o === p.owner ? null : o);
            dead = true;
            break;
          }
        }
        if (dead) {
          this.release(p);
          continue;
        }
        if (p.t > p.life) {
          this.explode(p, p.pos.clone(), null);
          dead = true;
        }
      } else {
        // guided by player steering
        if (p.guided && G.input && p.owner.isPlayer) {
          const c = G.input;
          const yawRate = -c.steer * 2.2;
          p.vel.applyAxisAngle(UPV, yawRate * dt);
          const pitch = (c.throttle ? 0.6 : 0) - (c.brake ? 0.6 : 0);
          p.vel.y = clamp(p.vel.y + pitch * 30 * dt, -20, 20);
          if (c.fire && p.t > 0.3) p.detonate = true;
        } else if (p.target && p.target.alive && p.turn > 0 && p.target.invisible <= 0) {
          // homing
          p.target.centerOut(_u);
          _u.sub(p.pos).normalize();
          _w.copy(p.vel).normalize();
          const ang = Math.acos(clamp(_w.dot(_u), -1, 1));
          const maxT = p.turn * dt * (p.kind === 'fire' ? clamp(p.t * 2, 0.3, 1) : 1);
          if (ang > 1e-4) {
            const k = Math.min(1, maxT / ang);
            _w.lerp(_u, k).normalize();
            p.vel.copy(_w).multiplyScalar(p.vel.length());
          }
        }
        if (p.accel) {
          const sp = Math.min(p.max, p.vel.length() + p.accel * dt);
          p.vel.setLength(sp);
        }
        _v.copy(p.pos);
        p.pos.addScaledVector(p.vel, dt);
        // trails
        const back = _w.copy(p.vel).normalize().multiplyScalar(-0.6).add(p.pos);
        switch (p.kind) {
          case 'homing':
            this.fx.fireTrail(back, 0xe0a0ff, 0x7a2ad8, 0.55);
            this.fx.emit('add', { pos: back, size: 0.5, size1: 1.6, life: 0.6, color: 0xb070ff, color2: 0x3a1080, alpha: 0.6, frame: F.glow });
            break;
          case 'freeze':
            this.fx.fireTrail(back, 0xe0f4ff, 0x3a8cff, 0.5);
            if (R() < 0.5) this.fx.ice(back, 1);
            break;
          case 'ghost':
            this.fx.fireTrail(back, 0xffd080, 0xff2a00, 1.2);
            this.fx.fireTrail(p.pos, 0xffe0a0, 0xff5010, 0.9);
            this.fx.smokeTrail(back, true, 0.6);
            break;
          case 'soul':
            this.fx.emit('add', { pos: back, size: 1.2, size1: 0.2, life: 0.5, color: 0xd090ff, color2: 0x4a1080, frame: F.skull });
            break;
          case 'saw':
            p.mesh.rotation.x += dt * 20;
            if (p.lit) this.fx.fireTrail(p.pos, 0xffd070, 0xff3a00, 0.9);
            break;
          case 'gurney':
            this.fx.fireTrail(back, 0xffc060, 0xff4010, 0.7);
            this.fx.smokeTrail(back, false, 0.5);
            break;
          default:
            this.fx.fireTrail(back, 0xffd080, 0xff5010, p.kind === 'power' ? 1.1 : 0.6);
            this.fx.smokeTrail(back, false, p.kind === 'power' ? 0.9 : 0.5);
        }
        // collisions: cars
        let direct = null;
        for (const o of G.cars) {
          if (o === p.owner && p.t < 0.6) continue;
          if (!o.alive) continue;
          o.centerOut(_u);
          if (segSphere(_v, p.pos, _u, Math.max(o.radius, o.height * 0.5) + p.r * 0.5)) {
            direct = o;
            break;
          }
        }
        if (direct) {
          this.explode(p, p.pos.clone(), direct);
          dead = true;
        } else if (p.detonate) {
          this.explode(p, p.pos.clone(), null);
          dead = true;
        } else if (!p.ghost) {
          const tb = W.segmentBlocked(_v.x, _v.y, _v.z, p.pos.x, p.pos.y, p.pos.z, 0.2);
          const gy = W.groundHeight(p.pos.x, p.pos.z, p.pos.y + 0.5);
          if (tb >= 0 || p.pos.y < gy + 0.1) {
            if (tb >= 0) p.pos.lerpVectors(_v, p.pos, tb);
            else p.pos.y = gy + 0.3;
            this.explode(p, p.pos.clone(), null);
            dead = true;
          } else {
            const pr = G.props.hitTest(p.pos, 0.6);
            if (pr) {
              this.explode(p, p.pos.clone(), null);
              dead = true;
            }
          }
        }
        if (!dead && p.t > p.life) {
          this.explode(p, p.pos.clone(), null);
          dead = true;
        }
      }
      if (p.mesh && !dead) {
        p.mesh.position.copy(p.pos);
        if (!p.lobbed && !p.mine && p.kind !== 'ricochet' && p.vel.lengthSq() > 0.01) p.mesh.lookAt(_u.copy(p.pos).add(p.vel));
      }
      if (dead) {
        if (this.guided === p) this.guided = null;
        this.release(p);
      } else keep.push(p);
    }
    this.proj = keep;

    // napalm fire pools
    const fk = [];
    for (const f of this.fires) {
      f.t += dt;
      if (f.t > f.life) continue;
      fk.push(f);
      const k = 1 - f.t / f.life;
      for (let i = 0; i < 3; i++) {
        const a = R() * Math.PI * 2, d = Math.sqrt(R()) * f.r;
        this.fx.flame(_v.set(f.pos.x + Math.cos(a) * d, f.pos.y, f.pos.z + Math.sin(a) * d), _w.set(0, 3 + R() * 3, 0), 0.6 + k * 0.8);
      }
      f.tick = (f.tick || 0) + dt;
      if (f.tick > 0.25) {
        f.tick = 0;
        for (const o of G.cars) {
          if (!o.alive || o.pos.distanceTo(f.pos) > f.r + o.radius) continue;
          this.hitCar(o, f.owner, 2, 'Napalm', o.centerOut(new THREE.Vector3()));
          o.burning = Math.max(o.burning, 1.5);
          o.burnSource = f.owner;
        }
      }
    }
    this.fires = fk;

    // axel slam on landing / sweet bot timer
    for (const car of G.cars) {
      if (car.slamPending && car.onGround && car.alive) {
        car.slamPending = false;
        this.shockwave(car, 16, 30, 'Axel Smash');
      }
      if (car.mechT > 0) {
        car.mechT -= dt;
        if (car.mechT <= 0) bus.emit('untransform', car);
      }
    }
    this.updatePickups(dt);
  }

  // ---------- pickups ----------
  spawnPickups() {
    const W = G.world;
    for (const s of W.pickupSpots) {
      const pk = { ...s, y: W.groundHeight(s.x, s.z, 50), active: true, timer: 0, weapon: null, group: null };
      pk.group = this.pickupMesh(pk);
      this.scene.add(pk.group);
      this.pickups.push(pk);
      this.rollPickup(pk);
    }
  }
  rollPickup(pk) {
    if (pk.kind === 'weapon') {
      let tot = 0;
      for (const [, w] of PICK_TABLE) tot += w;
      let x = R() * tot;
      for (const [k, w] of PICK_TABLE) {
        x -= w;
        if (x <= 0) {
          pk.weapon = k;
          break;
        }
      }
      // icon tint per weapon
      const col = new THREE.Color(WEAPON_INFO[pk.weapon].color);
      pk.icon.children.forEach((m) => m.material && m.material.color && m.material.color.copy(col).lerp(new THREE.Color(0xffffff), 0.35));
      pk.beam.material.color.copy(col);
      pk.iconShape(pk.weapon);
    }
  }
  pickupMesh(pk) {
    const g = new THREE.Group();
    g.position.set(pk.x, pk.y, pk.z);
    const col = pk.kind === 'health' ? 0x3affb0 : pk.kind === 'turbo' ? 0xffd23a : 0xffffff;
    // ground glow ring + light column
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.15, 32), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.06;
    g.add(ring);
    // soft glow halo behind the floating icon
    const beam = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: col, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    beam.scale.set(3.2, 3.2, 1);
    beam.position.y = 1.7;
    g.add(beam);
    pk.beam = beam;
    const icon = new THREE.Group();
    icon.position.y = 1.7;
    g.add(icon);
    pk.icon = icon;
    const mat = new THREE.MeshBasicMaterial({ color: col, toneMapped: false });
    const build = (kind) => {
      while (icon.children.length) icon.remove(icon.children[0]);
      const add = (geo, x = 0, y = 0, z = 0, rz = 0, rx = 0) => {
        const m = new THREE.Mesh(geo, mat);
        m.position.set(x, y, z);
        m.rotation.set(rx, 0, rz);
        icon.add(m);
      };
      if (pk.kind === 'health') {
        add(new THREE.BoxGeometry(1.2, 0.36, 0.3));
        add(new THREE.BoxGeometry(0.36, 1.2, 0.3));
      } else if (pk.kind === 'turbo') {
        add(new THREE.ConeGeometry(0.45, 0.6, 3), 0, 0.35, 0);
        add(new THREE.BoxGeometry(0.3, 0.7, 0.2), 0, -0.2, 0);
      } else if (kind === 'napalm') {
        add(new THREE.CylinderGeometry(0.3, 0.3, 0.9, 10));
        add(new THREE.ConeGeometry(0.2, 0.3, 8), 0, 0.6, 0);
      } else if (kind === 'remote' || kind === 'ricochet') {
        add(new THREE.SphereGeometry(0.42, 12, 8));
        add(new THREE.CylinderGeometry(0.05, 0.05, 0.4, 6), 0, 0.5, 0);
      } else if (kind === 'shotgun' || kind === 'sniper') {
        add(new THREE.BoxGeometry(0.16, 0.16, 1.3), 0, 0, 0);
        add(new THREE.BoxGeometry(0.2, 0.4, 0.3), 0, -0.2, -0.4);
      } else {
        // missile icon (fire/homing/power/stalker)
        const sc = kind === 'power' ? 1.3 : 1;
        add(new THREE.CylinderGeometry(0.16 * sc, 0.16 * sc, 1.0 * sc, 10));
        add(new THREE.ConeGeometry(0.16 * sc, 0.4 * sc, 10), 0, 0.7 * sc, 0);
        add(new THREE.BoxGeometry(0.6 * sc, 0.25, 0.05), 0, -0.4 * sc, 0);
        add(new THREE.BoxGeometry(0.05, 0.25, 0.6 * sc), 0, -0.4 * sc, 0);
        if (kind === 'homing' || kind === 'stalker') add(new THREE.TorusGeometry(0.4, 0.04, 4, 16), 0, 0, 0, 0, Math.PI / 2);
      }
    };
    pk.iconShape = build;
    build(pk.weapon);
    return g;
  }
  updatePickups(dt) {
    const tt = G.time;
    for (const pk of this.pickups) {
      if (!pk.active) {
        pk.timer -= dt;
        if (pk.timer <= 0) {
          pk.active = true;
          pk.group.visible = true;
          this.rollPickup(pk);
        }
        continue;
      }
      pk.icon.rotation.y = tt * 2.2;
      pk.icon.position.y = 1.7 + Math.sin(tt * 2.5 + pk.x) * 0.18;
      pk.beam.material.opacity = 0.42 + Math.sin(tt * 4 + pk.z) * 0.12;
      pk.beam.position.y = pk.icon.position.y;
      for (const car of G.cars) {
        if (!car.alive) continue;
        const dx = car.pos.x - pk.x, dz = car.pos.z - pk.z;
        if (dx * dx + dz * dz > (car.radius + 1.6) ** 2 || Math.abs(car.pos.y - pk.y) > 3) continue;
        let took = false, label = '';
        if (pk.kind === 'health') {
          if (car.hp < car.maxHp) {
            car.heal(car.maxHp * 0.3);
            took = true;
            label = 'Health';
          }
        } else if (pk.kind === 'turbo') {
          car.turbo = 100;
          car.energy = 100;
          took = true;
          label = 'Turbo Recharge';
        } else {
          car.weapons[pk.weapon] = Math.min(9, car.weapons[pk.weapon] + WEAPON_INFO[pk.weapon].give);
          took = true;
          label = WEAPON_INFO[pk.weapon].name;
          if (car.selected === 'special' && car.isPlayer && car.special <= 0) car.selected = pk.weapon;
        }
        if (took) {
          pk.active = false;
          pk.group.visible = false;
          pk.timer = pk.kind === 'health' ? 28 : 18;
          bus.emit('pickup', car, label, pk);
          break;
        }
      }
    }
  }
  clear() {
    for (const p of this.proj) this.release(p);
    this.proj = [];
    this.fires = [];
    for (const pk of this.pickups) this.scene.remove(pk.group);
    this.pickups = [];
    this.guided = null;
  }
}

let _glow = null;
function glowTex() {
  if (_glow) return _glow;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,0.9)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.35)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 128, 128);
  _glow = new THREE.CanvasTexture(c);
  return _glow;
}
function segSphere(a, b, c, r) {
  const abx = b.x - a.x, aby = b.y - a.y, abz = b.z - a.z;
  const acx = c.x - a.x, acy = c.y - a.y, acz = c.z - a.z;
  const ab2 = abx * abx + aby * aby + abz * abz || 1e-9;
  const t = clamp((acx * abx + acy * aby + acz * abz) / ab2, 0, 1);
  const dx = a.x + abx * t - c.x, dy = a.y + aby * t - c.y, dz = a.z + abz * t - c.z;
  return dx * dx + dy * dy + dz * dz < r * r;
}
function colliderNormal(col, p) {
  if (col.type === 'circle') return new THREE.Vector3(p.x - col.cx, 0, p.z - col.cz).normalize();
  const dx = p.x - col.cx, dz = p.z - col.cz;
  const lx = dx * col.c - dz * col.s, lz = dx * col.s + dz * col.c;
  let nx = 0, nz = 0;
  if (col.hx - Math.abs(lx) < col.hz - Math.abs(lz)) nx = Math.sign(lx);
  else nz = Math.sign(lz);
  return new THREE.Vector3(nx * col.c + nz * col.s, 0, -nx * col.s + nz * col.c);
}
