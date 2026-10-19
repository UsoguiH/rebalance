// Arrows, musket pellets, fireballs, ice bolts and thrown bombs.
import * as THREE from 'three';
import { m, ink } from './toon.js';
import { glowTex } from './tex.js';
import { groundY, canStand } from './nav.js';
import { dist2 } from './util.js';

function arrowModel(fire) {
  const g = new THREE.Group();
  g.add(m(new THREE.CylinderGeometry(0.03, 0.03, 1.0, 5), '#c8873f', 0, 0, 0, { rx: Math.PI / 2 }));
  g.add(m(new THREE.ConeGeometry(0.07, 0.2, 5), '#d8dde6', 0, 0, 0.58, { rx: Math.PI / 2 }));
  g.add(m(new THREE.BoxGeometry(0.02, 0.16, 0.25), '#ffffff', 0, 0.04, -0.4));
  g.add(m(new THREE.BoxGeometry(0.16, 0.02, 0.25), fire ? '#ff9a2a' : '#ffffff', 0, 0, -0.4));
  ink(g, 0.02);
  return g;
}
function orb(color, size) {
  const g = new THREE.Group();
  g.add(m(new THREE.SphereGeometry(size, 10, 8), color, 0, 0, 0, { emissive: color, emissiveIntensity: 0.8 }));
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  s.scale.setScalar(size * 6);
  g.add(s);
  ink(g, 0.03);
  return g;
}
function pellet() {
  return m(new THREE.SphereGeometry(0.09, 6, 5), '#3a3a40', 0, 0, 0, { noInk: true });
}

export class Projectiles {
  constructor(game) {
    this.game = game;
    this.list = [];
  }
  // kind: arrow | pellet | fire | ice | drain
  fire(kind, owner, x, y, z, dirX, dirZ, opts = {}) {
    const speed = opts.speed ?? { arrow: 30, pellet: 34, fire: 16, ice: 18 }[kind];
    const model = kind === 'arrow' ? arrowModel(opts.burn) : kind === 'pellet' ? pellet() : kind === 'fire' ? orb('#ffa020', 0.24) : orb('#9fe8ff', 0.22);
    model.position.set(x, y, z);
    model.rotation.y = Math.atan2(dirX, dirZ);
    this.game.scene.add(model);
    const p = {
      kind, owner, team: owner.team, x, y, z, vx: dirX * speed, vz: dirZ * speed, vy: opts.vy ?? 0, g: opts.g ?? 0,
      life: opts.range ? opts.range / speed : 1.2, dmg: opts.dmg ?? 1, pierce: opts.pierce ?? 0, hit: new Set(), model, opts,
      px: x, py: y, pz: z,
    };
    this.list.push(p);
    return p;
  }
  update(dt) {
    const g = this.game;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.life -= dt;
      p.px = p.x;
      p.py = p.y;
      p.pz = p.z;
      p.vy -= p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.model.position.set(p.x, p.y, p.z);
      if (p.kind === 'arrow') p.model.rotation.x = -Math.atan2(p.vy, Math.hypot(p.vx, p.vz));
      // trails
      if (p.kind === 'arrow' || p.kind === 'pellet') g.fx.streak(p.px, p.py, p.pz, p.x, p.y, p.z, p.opts.burn ? 0xffb040 : 0xffffff, 0.18, p.kind === 'pellet' ? 0.05 : 0.07);
      if (p.kind === 'fire' && Math.random() < 0.8) g.fx.fire(p.x, p.y, p.z, 0.55);
      if (p.kind === 'ice' && Math.random() < 0.6) g.fx.ice(p.x, p.y, p.z, 0.3);
      if (p.opts.burn && p.kind === 'arrow' && Math.random() < 0.5) g.fx.fire(p.x, p.y, p.z, 0.3);
      let dead = p.life <= 0;
      // hit units
      if (!dead) {
        for (const u of g.units) {
          if (!u.alive || u.team === p.team || p.hit.has(u)) continue;
          if (dist2(u.x, u.z, p.x, p.z) < 0.55 * 0.55 && p.y > u.y - 0.2 && p.y < u.y + 2.0) {
            p.hit.add(u);
            g.damage(u, p.dmg, p.owner, { dirX: p.vx, dirZ: p.vz, kind: p.kind, burn: p.opts.burn, slow: p.opts.slow, knock: p.opts.knock ?? 1.5, projectile: true });
            if (p.kind === 'fire') g.fx.explosionSmall?.(p.x, p.y, p.z);
            if (p.pierce-- <= 0) {
              dead = true;
              break;
            }
          }
        }
      }
      // hit gates, walls and the ground
      if (!dead) {
        const gy = groundY(p.x, p.z);
        if (p.y <= gy + 0.05) dead = true;
        else if (!canStand(p.x, p.z, p.team) && gy > -2 && p.y < gy + 3.4) {
          dead = true;
          g.hitStructureAt?.(p.x, p.z, p.dmg * 0.5, p.owner);
        }
      }
      if (dead) {
        if (p.kind === 'fire') {
          g.fx.puff(p.x, p.y, p.z, 2, 0.6, 0x9a9a9a);
          for (let k = 0; k < 4; k++) g.fx.fire(p.x, p.y, p.z, 0.7);
        } else if (p.kind === 'ice') {
          for (let k = 0; k < 5; k++) g.fx.ice(p.x, p.y, p.z, 0.4);
        } else g.fx.hitStar(p.x, p.y, p.z, 0xffffff, 0.5);
        g.scene.remove(p.model);
        this.list.splice(i, 1);
      }
    }
  }
}
