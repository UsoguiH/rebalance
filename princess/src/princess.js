// The princesses: held in the enemy's cage, rescued to their own throne, kidnapped
// back, fed cake by their captors (150 calories a slice, burning 2 per second) and
// carried by one or more soldiers, slower the fatter she gets.
import { PrincessModel } from './chars.js';
import { CASTLES, MAP } from './world.js';
import { groundY } from './nav.js';
import { clamp, lerp, dist } from './util.js';

export const NAMES = ['Princess Bluebell', 'Princess Rosalind'];

export class Princess {
  constructor(game, team) {
    this.game = game;
    this.team = team; // whose princess she is
    this.model = new PrincessModel(team);
    game.scene.add(this.model.root);
    this.calories = 0;
    this.carriers = [];
    this.state = 'prison';
    this.home = 'prison';
    this.dropT = 0;
    this.eating = 0;
    this.happy = 0;
    this.placeIn('prison');
  }
  get stage() {
    return Math.min(3, Math.floor(this.calories / 300));
  }
  get captors() {
    return 1 - this.team;
  }
  get carrier() {
    return this.carriers[0] || null;
  }
  placeIn(where) {
    this.state = where;
    this.home = where;
    this.carriers = [];
    if (where === 'prison') {
      const p = CASTLES[this.captors].prison;
      this.x = p.x;
      this.z = p.z;
      this.y = 0.5;
    } else {
      const t = CASTLES[this.team].throne;
      this.x = t.x;
      this.z = t.z;
      this.y = MAP.terraceY + 0.45;
    }
  }
  speedFor() {
    const n = Math.max(1, this.carriers.length);
    return clamp((0.9 * n) / (this.stage + 1), 0.14, 0.9);
  }
  canGrab(u) {
    if (!u.alive || u.carrying || u.carryingPrincess || u.swimming) return false;
    if (this.state === 'carried') return u.team === this.carrier.team && this.carriers.length < 4;
    if (this.state === 'prison') return u.team === this.team;
    if (this.state === 'throne') return u.team === this.captors;
    return true; // dropped: anyone
  }
  grab(u) {
    const g = this.game;
    if (this.state === 'carried') {
      this.carriers.push(u);
      u.carryingPrincess = this;
      g.audio?.play('pickup', u);
      return;
    }
    const from = this.state;
    this.state = 'carried';
    this.carriers = [u];
    u.carryingPrincess = this;
    this.dropT = 0;
    if (from === 'prison') {
      g.announce(u.team === g.playerTeam ? 'Your princess is free! Bring her home!' : 'The enemy is rescuing their princess!', u.team);
      g.castleModels[this.captors].cage.userData.door.rotation.y = -1.9;
    }
    if (from === 'throne') g.announce(u.team === g.playerTeam ? 'You kidnapped their princess!' : 'Your princess has been kidnapped!', u.team);
    g.audio?.play('princess', u);
    g.fx.puff(this.x, this.y + 1, this.z, 3, 1);
  }
  releaseCarrier(u) {
    const i = this.carriers.indexOf(u);
    if (i < 0) return;
    this.carriers.splice(i, 1);
    u.carryingPrincess = null;
    if (!this.carriers.length) this.drop();
  }
  drop() {
    for (const c of this.carriers) c.carryingPrincess = null;
    this.carriers = [];
    this.state = 'dropped';
    this.dropT = 0;
    this.y = groundY(this.x, this.z);
    this.game.fx.puff(this.x, this.y + 0.6, this.z, 4, 1.2);
    this.game.audio?.play('thud', this);
  }
  feed(by) {
    this.calories = Math.min(1200, this.calories + 150);
    this.eating = 1.6;
    by.score += 15;
    this.game.fx.text(this.x, this.y + 3.4, this.z, '+150', '#ffd0f0', 0.8);
    this.game.audio?.play('munch', this);
  }

  update(dt) {
    const g = this.game;
    this.calories = Math.max(0, this.calories - 2 * dt);
    this.eating = Math.max(0, this.eating - dt);
    this.happy = Math.max(0, this.happy - dt);
    const mdl = this.model;
    mdl.fat = lerp(mdl.fat, this.calories / 1200, 1 - Math.exp(-dt * 3));
    if (this.state === 'carried') {
      // drop if the leader died or ended up somewhere odd
      this.carriers = this.carriers.filter((c) => c.alive && c.carryingPrincess === this);
      if (!this.carriers.length) {
        this.drop();
      } else {
        const lead = this.carriers[0];
        this.x = lead.x;
        this.z = lead.z;
        this.y = lead.y + 0.5;
        // helpers hold on around her
        this.carriers.forEach((c, i) => {
          if (i === 0) return;
          const a = lead.yaw + (i % 2 ? 1 : -1) * (1.2 + Math.floor((i - 1) / 2) * 0.9);
          const r = 0.9 + this.stage * 0.25;
          c.x = lerp(c.x, lead.x + Math.sin(a) * r, 0.3);
          c.z = lerp(c.z, lead.z + Math.cos(a) * r, 0.3);
          c.yaw = lead.yaw;
        });
        // delivered?
        const own = CASTLES[this.team], foe = CASTLES[this.captors];
        if (lead.team === this.team && dist(this.x, this.z, own.throne.x, own.throne.z) < 3.2) {
          const team = lead.team;
          for (const c of this.carriers) {
            c.carryingPrincess = null;
            c.score += c === lead ? 100 : 50;
          }
          this.placeIn('throne');
          this.happy = 6;
          g.onRescue(this, lead, team);
        } else if (lead.team === this.captors && dist(this.x, this.z, foe.prison.x, foe.prison.z) < 3.0) {
          for (const c of this.carriers) {
            c.carryingPrincess = null;
            c.score += c === lead ? 60 : 30;
          }
          this.placeIn('prison');
          g.onImprison(this, lead);
        }
      }
    } else if (this.state === 'dropped') {
      this.dropT += dt;
      if (this.dropT > 30) {
        g.fx.puff(this.x, this.y + 1, this.z, 6, 1.4);
        this.placeIn(this.home);
        g.announce(`${NAMES[this.team]} was returned to the ${this.home === 'prison' ? 'dungeon' : 'throne'}.`, -1);
      }
    }
    if (this.state === 'prison') {
      const door = g.castleModels[this.captors].cage.userData.door;
      door.rotation.y = lerp(door.rotation.y, 0, 1 - Math.exp(-dt * 4));
    }
    mdl.root.position.set(this.x, this.state === 'carried' ? this.y + 1.2 : this.y, this.z);
    if (this.state === 'carried') mdl.root.rotation.y = this.carriers[0].yaw + Math.PI / 2;
    else if (this.state === 'throne') mdl.root.rotation.y = this.team === 0 ? Math.PI / 2 : -Math.PI / 2;
    else mdl.root.rotation.y = Math.sin(g.time * 0.5) * 0.4 + (this.captors === 0 ? Math.PI / 2 : -Math.PI / 2);
    mdl.update(dt, { carried: this.state === 'carried', eating: this.eating, happy: this.happy > 0 || this.state === 'throne' });
  }
}
