// Entities: shared physics, the player, mobs, dropped items, falling blocks,
// arrows, primed TNT, particles and explosions. Plus the blocky character models.
(function () {
  const SC = window.SC;
  const B = SC.B, I = SC.I;
  const blocks = SC.blocks;
  const GRAV = 30;
  const JUMP = Math.sqrt(2 * GRAV * 1.3);
  SC.GRAV = GRAV;
  const game = () => SC.game;
  const sfx = (name, x, y, o) => SC.audio && SC.audio.at(name, x, y, o);

  // ---------- base entity ----------
  class Entity {
    constructor(x, y, w, h) {
      this.x = x;
      this.y = y;
      this.w = w;
      this.h = h;
      this.vx = 0;
      this.vy = 0;
      this.onGround = false;
      this.hitWall = false;
      this.inWater = false;
      this.inLava = false;
      this.dead = false;
      this.age = 0;
      this.fallY = y;
      this.burn = 0;
    }
    get world() {
      return game().world;
    }
    overlapsTile(tx, ty) {
      return this.x + this.w / 2 > tx && this.x - this.w / 2 < tx + 1 && this.y > ty && this.y - this.h < ty + 1;
    }
    tilesTouching(fn) {
      const x0 = Math.floor(this.x - this.w / 2), x1 = Math.floor(this.x + this.w / 2 - 1e-6);
      const y0 = Math.floor(this.y - this.h), y1 = Math.floor(this.y - 1e-6);
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (fn(x, y)) return true;
      return false;
    }
    sense() {
      const w = this.world;
      this.inWater = w.fluidAt(this.x, this.y - this.h * 0.45) === B.WATER;
      this.headInWater = w.fluidAt(this.x, this.y - this.h * 0.9) === B.WATER;
      this.inLava = this.tilesTouching((x, y) => w.get(x, y) === B.LAVA);
      this.onLadder = this.tilesTouching((x, y) => blocks[w.get(x, y)].climb);
    }
    physics(dt) {
      this.sense();
      if (this.inWater || this.inLava) {
        this.vy += GRAV * 0.22 * dt;
        this.vy *= Math.exp(-dt * 3);
        if (this.vy > 3) this.vy = 3;
      } else {
        this.vy += GRAV * dt;
        if (this.vy > 45) this.vy = 45;
      }
      this.move(this.vx * dt, this.vy * dt);
    }
    move(dx, dy) {
      const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 0.4));
      this.hitWall = false;
      const wasGround = this.onGround;
      this.onGround = false;
      for (let s = 0; s < steps; s++) {
        this.moveX(dx / steps);
        this.moveY(dy / steps);
      }
      if (this.onGround && !wasGround) this.land();
      if (this.onGround || this.inWater || this.onLadder) this.fallY = this.y;
      else if (this.y < this.fallY) this.fallY = this.y;
    }
    land() {
      const d = this.y - this.fallY;
      this.lastFall = d;
      if (d > 3.4 && !this.inWater) {
        this.damage(Math.floor(d - 3), null, 'fall');
        sfx('fall', this.x, this.y);
      }
    }
    moveX(dx) {
      if (!dx) return;
      const w = this.world;
      this.x += dx;
      const y0 = Math.floor(this.y - this.h + 1e-4), y1 = Math.floor(this.y - 1e-4);
      if (dx > 0) {
        const tx = Math.floor(this.x + this.w / 2);
        for (let ty = y0; ty <= y1; ty++)
          if (w.solid(tx, ty)) {
            this.x = tx - this.w / 2 - 1e-4;
            this.vx = 0;
            this.hitWall = 1;
            break;
          }
      } else {
        const tx = Math.floor(this.x - this.w / 2);
        for (let ty = y0; ty <= y1; ty++)
          if (w.solid(tx, ty)) {
            this.x = tx + 1 + this.w / 2 + 1e-4;
            this.vx = 0;
            this.hitWall = -1;
            break;
          }
      }
    }
    moveY(dy) {
      if (!dy) return;
      const w = this.world;
      this.y += dy;
      const x0 = Math.floor(this.x - this.w / 2 + 1e-4), x1 = Math.floor(this.x + this.w / 2 - 1e-4);
      if (dy > 0) {
        const ty = Math.floor(this.y);
        for (let tx = x0; tx <= x1; tx++)
          if (w.solid(tx, ty)) {
            this.y = ty;
            this.vy = 0;
            this.onGround = true;
            break;
          }
      } else {
        const ty = Math.floor(this.y - this.h);
        for (let tx = x0; tx <= x1; tx++)
          if (w.solid(tx, ty)) {
            this.y = ty + 1 + this.h;
            this.vy = 0;
            break;
          }
      }
    }
    // standing in sun with nothing overhead
    inSun() {
      const w = this.world;
      const x = Math.floor(this.x);
      for (let y = Math.floor(this.y - this.h) - 1; y >= 0; y--) {
        const id = w.get(x, y);
        if (id && (blocks[id].opaque || blocks[id].fluid) && !(blocks[id].tree && w.getMeta(x, y) & 1)) return false;
        if (blocks[id].tree) return false;
      }
      return true;
    }
    hazards(dt) {
      const w = this.world;
      this.hazT = (this.hazT || 0) - dt;
      if (this.hazT > 0) return;
      if (this.inLava) {
        this.damage(4, null, 'lava');
        this.burn = 6;
        this.hazT = 0.5;
      } else if (this.tilesTouching((x, y) => w.get(x, y) === B.CACTUS)) {
        this.damage(1, null, 'cactus');
        this.hazT = 0.5;
      } else if (this.burn > 0 && !this.inWater) {
        this.damage(1, null, 'fire');
        this.hazT = 1;
      }
      if (this.inWater) this.burn = 0;
    }
    damage() {}
  }
  SC.Entity = Entity;

  // ---------- inventory helpers ----------
  SC.stack = (id, n = 1, d = 0) => ({ id, n, d });
  // add to slots [from, to). returns leftover count
  SC.addToSlots = (slots, id, n, d = 0, order) => {
    const max = SC.maxStack(id);
    const idxs = order || slots.map((_, i) => i);
    if (max > 1)
      for (const i of idxs) {
        const s = slots[i];
        if (s && s.id === id && s.n < max) {
          const t = Math.min(n, max - s.n);
          s.n += t;
          n -= t;
          if (!n) return 0;
        }
      }
    for (const i of idxs) {
      if (!slots[i]) {
        const t = Math.min(n, max);
        slots[i] = { id, n: t, d };
        n -= t;
        if (!n) return 0;
      }
    }
    return n;
  };

  // ---------- the player ----------
  class Player extends Entity {
    constructor(x, y) {
      super(x, y, 0.6, 1.8);
      this.inv = new Array(36).fill(null);
      this.sel = 0;
      this.hp = 20;
      this.food = 20;
      this.sat = 5;
      this.exh = 0;
      this.air = 10;
      this.regenT = 0;
      this.hurtT = 0;
      this.flash = 0;
      this.facing = 1;
      this.walk = 0;
      this.swing = 0;
      this.mine = null;
      this.attackCd = 0;
      this.useCd = 0;
      this.eatT = 0;
      this.bowT = 0;
      this.sprint = false;
      this.sneak = false;
      this.stepDist = 0;
      this.spawn = null;
      this.kind = 'player';
      this.armor = [null, null, null, null];
      this.off = [null];
      this.xpLevel = 0;
      this.xpProg = 0;
      this.xpTotal = 0;
    }
    get offhand() {
      return this.off[0];
    }
    set offhand(v) {
      this.off[0] = v;
    }
    armorPoints() {
      let a = 0, t = 0;
      for (const s of this.armor)
        if (s) {
          a += SC.items[s.id].pts;
          t += SC.items[s.id].tough || 0;
        }
      return [a, t];
    }
    addXP(n) {
      if (n <= 0) return;
      this.xpTotal += n;
      let pts = this.xpProg * SC.xpNeed(this.xpLevel) + n;
      let up = false;
      while (pts >= SC.xpNeed(this.xpLevel)) {
        pts -= SC.xpNeed(this.xpLevel);
        this.xpLevel++;
        up = this.xpLevel % 5 === 0 || up;
      }
      this.xpProg = pts / SC.xpNeed(this.xpLevel);
      sfx(up ? 'levelUp' : 'orb', this.x, this.y);
    }
    held() {
      return this.inv[this.sel];
    }
    give(id, n = 1, d = 0) {
      const order = [...Array(9).keys(), ...Array.from({ length: 27 }, (_, i) => i + 9)];
      return SC.addToSlots(this.inv, id, n, d, order);
    }
    count(id) {
      let c = 0;
      for (const s of this.inv) if (s && s.id === id) c += s.n;
      return c;
    }
    take(id, n) {
      for (let i = 0; i < 36 && n > 0; i++) {
        const s = this.inv[i];
        if (s && s.id === id) {
          const t = Math.min(n, s.n);
          s.n -= t;
          n -= t;
          if (!s.n) this.inv[i] = null;
        }
      }
    }
    consumeHeld(n = 1) {
      const s = this.held();
      if (!s || game().creative) return;
      s.n -= n;
      if (s.n <= 0) this.inv[this.sel] = null;
    }
    wearHeld(n = 1) {
      const s = this.held();
      const it = s && SC.items[s.id];
      if (!it || !it.dur || game().creative) return;
      s.d = (s.d || 0) + n;
      if (s.d >= it.dur) {
        this.inv[this.sel] = null;
        sfx('toolBreak', this.x, this.y);
      }
    }
    exhaust(v) {
      this.exh += v;
      while (this.exh >= 4) {
        this.exh -= 4;
        if (this.sat > 0) this.sat = Math.max(0, this.sat - 1);
        else this.food = Math.max(0, this.food - 1);
      }
    }
    damage(n, src, cause) {
      const g = game();
      if (this.dead || n <= 0 || g.creative || this.spectator) return false;
      if (this.hurtT > 0 && cause !== 'drown' && cause !== 'starve') return false;
      if (['zombie', 'arrow', 'explosion', 'creeper'].includes(cause)) {
        const d = g.difficulty;
        if (d === 0) return false;
        if (d === 1) n = Math.min(n / 2 + 1, n);
        if (d === 3) n *= 1.5;
      }
      if (!['fall', 'drown', 'starve', 'void', 'fire'].includes(cause)) {
        const [a, t] = this.armorPoints();
        if (a > 0) {
          const raw = n;
          n *= 1 - Math.min(20, Math.max(a / 5, a - n / (2 + t / 4))) / 25;
          for (let k = 0; k < 4; k++) {
            const s = this.armor[k];
            if (!s) continue;
            s.d = (s.d || 0) + Math.max(1, Math.floor(raw / 4));
            if (s.d >= SC.items[s.id].dur) {
              this.armor[k] = null;
              sfx('toolBreak', this.x, this.y);
            }
          }
        }
      }
      n = Math.round(n * 2) / 2;
      if (n <= 0) return false;
      if (g.stat) g.stat('damageTaken', n);
      this.hp -= n;
      this.hurtT = 0.5;
      this.flash = 0.3;
      this.lastCause = cause;
      SC.shake(Math.min(6, 2 + n));
      if (src) {
        const dir = Math.sign(this.x - src.x) || 1;
        this.vx = dir * 7;
        this.vy = -6;
      }
      sfx('hurt', this.x, this.y);
      this.exhaust(0.1);
      if (this.hp <= 0) {
        this.hp = 0;
        this.dead = true;
        game().onPlayerDeath(cause);
      }
      return true;
    }
    eyeX() {
      return this.x;
    }
    eyeY() {
      return this.y - 1.55;
    }
    update(dt, ctl) {
      const w = this.world;
      this.age += dt;
      this.hurtT -= dt;
      this.flash -= dt;
      this.attackCd -= dt;
      this.useCd -= dt;
      this.swing = Math.max(0, this.swing - dt * 3.5);
      if (this.spectator) {
        this.vx += (ctl.dir * 12 - this.vx) * (1 - Math.exp(-dt * 8));
        this.vy += ((ctl.jump ? -12 : ctl.sneak ? 12 : 0) - this.vy) * (1 - Math.exp(-dt * 8));
        this.x = SC.clamp(this.x + this.vx * dt, 0.5, w.W - 0.5);
        this.y = SC.clamp(this.y + this.vy * dt, 2, w.H);
        if (ctl.dir) this.facing = ctl.dir;
        return;
      }
      this.sneak = ctl.sneak && !this.inWater && !this.flying;
      if (ctl.sprintTap && this.food > 6) this.sprint = true;
      if (!ctl.dir || this.sneak || this.hitWall || this.food <= 6) this.sprint = false;
      const speed = this.sneak ? 1.4 : this.sprint ? 5.8 : 4.3;
      const target = ctl.dir * speed * (this.inWater ? 0.55 : 1) * (this.eatT > 0 || this.bowT > 0 ? 0.35 : 1);
      const ground = this.onGround;
      const icy = ground && w.get(Math.floor(this.x), Math.floor(this.y + 0.05)) === B.ICE;
      const k = icy ? 2 : ground ? 22 : 7;
      this.vx += (target - this.vx) * (1 - Math.exp(-dt * k));
      if (ctl.dir) this.facing = ctl.dir;
      if (ctl.face) this.facing = ctl.face;

      this.sense();
      // jumping, swimming, climbing
      if (this.inWater || this.inLava) {
        if (ctl.jump) this.vy = Math.max(this.vy - 40 * dt, -4.2);
        if (ctl.jump && this.hitWall && !this.headInWater) this.vy = -7;
      } else if (ctl.jump && ground) {
        this.vy = -JUMP;
        if (game().stat) game().stat('jumps', 1);
        this.exhaust(this.sprint ? 0.2 : 0.05);
        if (this.sprint) this.vx += ctl.dir * 1.2;
      }
      if (this.onLadder) {
        if (ctl.up || (ctl.jump && !ground)) this.vy = -3.5;
        else if (ctl.down) this.vy = 3.5;
        else if (this.sneak) this.vy = 0;
        else this.vy = Math.min(this.vy, 2);
      }
      // auto step up a single block while walking
      const x0 = this.x;
      if (this.flying) {
        this.sense();
        this.vx += (target * 1.6 - this.vx) * (1 - Math.exp(-dt * 10));
        this.vy += ((ctl.jump ? -8 : ctl.sneak ? 8 : 0) - this.vy) * (1 - Math.exp(-dt * 10));
        this.move(this.vx * dt, this.vy * dt);
        if (this.onGround && ctl.sneak) this.flying = false;
      } else this.physics(dt);
      if (this.onLadder && !ctl.up && !ctl.down && !ctl.jump) this.vy = Math.min(this.vy, 2);
      if (this.autoJump !== false && this.hitWall && ground && ctl.dir && this.vy >= 0 && !this.sneak) {
        const fx = Math.floor(this.x + ctl.dir * (this.w / 2 + 0.1));
        const fy = Math.floor(this.y - 0.5);
        if (w.solid(fx, fy) && !w.solid(fx, fy - 1) && !w.solid(fx, fy - 2) && !w.solid(Math.floor(this.x), Math.floor(this.y - this.h - 0.2))) {
          this.vy = -JUMP;
        }
      }
      // sneaking keeps you on the edge
      if (this.sneak && ground && this.vy >= 0) {
        const below = (x) => w.solid(Math.floor(x - this.w / 2 + 0.05), Math.floor(this.y + 0.1)) || w.solid(Math.floor(x + this.w / 2 - 0.05), Math.floor(this.y + 0.1));
        if (!below(this.x) && below(x0)) {
          this.x = x0;
          this.vx = 0;
          this.y = Math.floor(this.y + 0.1);
          this.vy = 0;
          this.onGround = true;
        }
      }
      this.x = SC.clamp(this.x, 0.5, w.W - 0.5);

      // walk animation and footsteps
      const moved = Math.abs(this.x - x0);
      if (this.onGround) {
        this.walk += moved * 2.2;
        this.stepDist += moved;
        if (this.stepDist > (this.sprint ? 1.6 : 1.3)) {
          this.stepDist = 0;
          const gid = w.get(Math.floor(this.x), Math.floor(this.y + 0.05));
          if (gid) sfx('step', this.x, this.y, { mat: blocks[gid].sound });
        }
        this.exhaust(moved * (this.sprint ? 0.1 : 0.01));
      }
      if (!moved) this.walk *= 0.8;

      // breath
      if (this.headInWater) {
        this.air -= dt;
        if (this.air < 0) {
          this.air += 1;
          this.damage(2, null, 'drown');
        }
      } else this.air = Math.min(10, this.air + dt * 5);
      this.hazards(dt);
      if (this.y > w.H + 8) this.damage(40, null, 'void');

      // hunger
      this.regenT += dt;
      if (this.food >= 18 && this.hp < 20 && this.regenT > 3) {
        this.regenT = 0;
        this.hp = Math.min(20, this.hp + 1);
        this.exhaust(3);
      } else if (this.food <= 0 && this.regenT > 4) {
        this.regenT = 0;
        if (this.hp > [20, 10, 1, 0][game().difficulty]) this.damage(1, null, 'starve');
      }
      if (game().difficulty === 0) {
        this.peaceT = (this.peaceT || 0) + dt;
        if (this.peaceT > 1) {
          this.peaceT = 0;
          if (this.hp < 20) this.hp = Math.min(20, this.hp + 1);
          if (this.food < 20) this.food++;
        }
      }
      this.exhaust(dt * 0.008);
    }
    draw(ctx, sx, sy, S) {
      if (this.spectator) return;
      const s = this.held();
      drawHumanoid(ctx, sx, sy, (S * 1.8) / 32, this.facing, {
        skin: [199, 150, 110],
        hair: [72, 46, 26],
        shirt: [0, 168, 168],
        pants: [62, 62, 160],
        shoes: [70, 70, 70],
        walk: this.walk,
        swing: this.swing,
        crouch: this.sneak,
        flash: this.flash > 0,
        held: s ? s.id : 0,
        offhand: this.offhand ? this.offhand.id : 0,
        armor: this.armorColors(),
        aim: this.bowT > 0,
        burn: this.burn > 0,
        eating: this.eatT > 0,
      });
    }
    armorColors() {
      return this.armor.map((a) => (a ? SC.items[a.id].acol : null));
    }
  }
  SC.Player = Player;
  SC.xpNeed = (l) => (l >= 30 ? 112 + (l - 30) * 9 : l >= 15 ? 37 + (l - 15) * 5 : 7 + l * 2);

  // ---------- mobs ----------
  const MOBS = {
    zombie: { w: 0.6, h: 1.8, hp: 20, speed: 2.3, hostile: true, burns: true },
    skeleton: { w: 0.6, h: 1.85, hp: 20, speed: 2.5, hostile: true, burns: true },
    creeper: { w: 0.6, h: 1.65, hp: 20, speed: 2.1, hostile: true },
    pig: { w: 0.9, h: 0.9, hp: 10, speed: 1.6 },
    sheep: { w: 0.9, h: 1.25, hp: 8, speed: 1.6 },
  };
  SC.MOBS = MOBS;
  class Mob extends Entity {
    constructor(kind, x, y) {
      const d = MOBS[kind];
      super(x, y, d.w, d.h);
      this.kind = kind;
      this.def = d;
      this.hp = d.hp;
      this.facing = Math.random() < 0.5 ? -1 : 1;
      this.walk = 0;
      this.hurtT = 0;
      this.flash = 0;
      this.think = 0;
      this.dir = 0;
      this.fuse = 0;
      this.shootT = 1 + Math.random() * 2;
      this.fleeT = 0;
      this.attackT = 0;
      this.sunT = 0;
      this.soundT = 4 + Math.random() * 10;
    }
    damage(n, src, cause) {
      if (this.dead || this.hurtT > 0) return false;
      if (src && src.by === 'player') this.playerHitT = 5;
      this.hp -= n;
      this.hurtT = 0.45;
      this.flash = 0.25;
      if (src) {
        const dir = Math.sign(this.x - src.x) || 1;
        this.vx = dir * (src.kb || 7);
        this.vy = -5.5;
      }
      if (!this.def.hostile) this.fleeT = 5;
      sfx('mobHurt', this.x, this.y, { kind: this.kind });
      if (this.hp <= 0) this.die(cause);
      return true;
    }
    die(cause) {
      this.dead = true;
      const g = game();
      const drops = [];
      const r = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
      const fire = this.burn > 0 || cause === 'lava';
      if (this.kind === 'zombie') drops.push([I.ROTTEN_FLESH, r(0, 2)]);
      if (this.kind === 'skeleton') {
        drops.push([I.BONE, r(0, 2)], [I.ARROW, r(0, 2)]);
        if (Math.random() < 0.08) drops.push([I.BOW, 1]);
      }
      if (this.kind === 'creeper') drops.push([I.GUNPOWDER, r(0, 2)]);
      if (this.kind === 'pig') drops.push([fire ? I.COOKED_PORKCHOP : I.PORKCHOP, r(1, 3)]);
      if (this.kind === 'sheep') drops.push([B.WOOL, 1], [fire ? I.COOKED_MUTTON : I.MUTTON, r(1, 2)]);
      for (const [id, n] of drops) if (n > 0) g.dropItem(this.x, this.y - this.h / 2, id, n);
      if (this.playerHitT > 0) {
        SC.dropXP(this.x, this.y - this.h / 2, this.def.hostile ? 5 : 1 + Math.floor(Math.random() * 3));
        if (g.statMap) g.statMap('killed', this.kind, 1);
        if (g.stat) g.stat('mobKills', 1);
      }
      SC.puff(this.x, this.y - this.h / 2, 14, [235, 235, 235]);
      sfx('mobDie', this.x, this.y, { kind: this.kind });
    }
    update(dt) {
      const g = game();
      const p = g.player;
      const d = this.def;
      this.age += dt;
      this.hurtT -= dt;
      this.flash -= dt;
      this.attackT -= dt;
      this.playerHitT = (this.playerHitT || 0) - dt;
      this.think -= dt;
      this.fleeT -= dt;
      const dx = p.x - this.x, dy = p.y - this.y;
      const dist = Math.hypot(dx, dy);
      let want = 0;
      let speed = d.speed;
      if (d.hostile && g.difficulty === 0) {
        this.dead = true;
        return;
      }
      const target = !p.dead && !g.creative && !p.spectator && dist < 18;

      if (d.hostile && target) {
        if (this.kind === 'skeleton') {
          const see = dist < 16 && g.lineOfSight(this.x, this.y - 1.5, p.x, p.y - 1.2);
          if (dist > 10 || !see) want = Math.sign(dx);
          else if (dist < 6) want = -Math.sign(dx);
          this.facing = Math.sign(dx) || this.facing;
          this.shootT -= dt;
          if (see && this.shootT <= 0 && dist < 16) {
            this.shootT = 2 + Math.random() * 1.2;
            g.shootArrow(this, this.x + this.facing * 0.4, this.y - 1.5, p.x, p.y - 1, 16, 2 + Math.floor(Math.random() * 3));
          }
        } else if (this.kind === 'creeper') {
          if (dist < 2.6 && g.lineOfSight(this.x, this.y - 1, p.x, p.y - 1)) {
            if (this.fuse === 0) sfx('fuse', this.x, this.y);
            this.fuse += dt;
            want = 0;
          } else {
            this.fuse = Math.max(0, this.fuse - dt);
            want = Math.sign(dx);
          }
          if (this.fuse > 1.5) {
            this.dead = true;
            SC.explode(this.x, this.y - 0.8, 3, this);
            return;
          }
        } else {
          want = Math.abs(dx) > 0.3 ? Math.sign(dx) : 0;
          if (this.attackT <= 0 && Math.abs(dx) < (p.w + this.w) / 2 + 0.35 && Math.abs(dy) < 1.4) {
            this.attackT = 1;
            p.damage(3, this, 'zombie');
          }
        }
      } else {
        this.fuse = Math.max(0, this.fuse - dt);
        if (this.fleeT > 0) {
          speed *= 1.9;
          if (this.think <= 0) {
            this.dir = Math.sign(this.x - p.x) || 1;
            this.think = 1;
          }
          want = this.dir;
        } else {
          if (this.think <= 0) {
            this.think = 2 + Math.random() * 4;
            this.dir = Math.random() < 0.45 ? 0 : Math.random() < 0.5 ? -1 : 1;
          }
          want = this.dir;
          // passive mobs avoid long drops and water
          if (want && this.onGround) {
            const fx = Math.floor(this.x + want * (this.w / 2 + 0.3));
            let drop = 0;
            while (drop < 4 && !this.world.solid(fx, Math.floor(this.y) + drop)) drop++;
            if (drop >= 3 || this.world.fluidAt(fx + 0.5, this.y + 0.5)) {
              this.dir = -want;
              want = 0;
            }
          }
        }
      }
      if (want) this.facing = want;
      const tv = want * speed;
      this.vx += (tv - this.vx) * (1 - Math.exp(-dt * (this.onGround ? 12 : 4)));
      const x0 = this.x;
      this.physics(dt);
      if (this.inWater) this.vy = Math.min(this.vy, -1.5);
      if (this.hitWall && this.onGround && want) {
        if (!this.world.solid(Math.floor(this.x + want * (this.w / 2 + 0.2)), Math.floor(this.y - 1.5) - 1)) this.vy = -JUMP;
        else if (!d.hostile) this.dir = -want;
      }
      this.walk += Math.abs(this.x - x0) * 2.2;
      if (Math.abs(this.x - x0) < 1e-4) this.walk *= 0.85;

      // burning in daylight
      if (d.burns) {
        this.sunT -= dt;
        if (this.sunT <= 0) {
          this.sunT = 0.7;
          if (g.dayFactor() > 0.75 && this.inSun() && !this.inWater) this.burn = 3;
        }
      }
      if (this.burn > 0) this.burn -= dt;
      this.hazards(dt);

      this.soundT -= dt;
      if (this.soundT <= 0) {
        this.soundT = 6 + Math.random() * 12;
        if (dist < 20) sfx('say', this.x, this.y, { kind: this.kind });
      }
    }
    draw(ctx, sx, sy, S) {
      const k = this.kind;
      const flash = this.flash > 0;
      if (k === 'zombie') {
        drawHumanoid(ctx, sx, sy, (S * 1.8) / 32, this.facing, {
          skin: [86, 140, 72],
          hair: [60, 100, 50],
          shirt: [0, 150, 150],
          pants: [70, 58, 140],
          shoes: [70, 58, 140],
          walk: this.walk,
          arms: 'forward',
          flash,
          burn: this.burn > 0,
          eye: [30, 30, 30],
        });
      } else if (k === 'skeleton') {
        drawHumanoid(ctx, sx, sy, (S * 1.85) / 32, this.facing, {
          skin: [205, 205, 205],
          hair: [190, 190, 190],
          shirt: [175, 175, 175],
          pants: [190, 190, 190],
          shoes: [160, 160, 160],
          walk: this.walk,
          thin: true,
          held: I.BOW,
          aim: true,
          flash,
          burn: this.burn > 0,
          eye: [20, 20, 20],
        });
      } else if (k === 'creeper') drawCreeper(ctx, sx, sy, (S * 1.65) / 26, this.facing, this.walk, this.fuse, flash);
      else drawQuad(ctx, sx, sy, S / 16, this.facing, this.walk, k, flash);
    }
  }
  SC.Mob = Mob;

  // ---------- dropped items ----------
  class ItemDrop extends Entity {
    constructor(x, y, id, n, d = 0) {
      super(x, y, 0.3, 0.3);
      this.id = id;
      this.n = n;
      this.d = d;
      this.vx = (Math.random() - 0.5) * 3;
      this.vy = -3 - Math.random() * 2;
      this.pickDelay = 0.4;
      this.bob = Math.random() * 6;
      this.kind = 'item';
    }
    update(dt) {
      const g = game();
      this.age += dt;
      this.pickDelay -= dt;
      this.vx *= Math.exp(-dt * (this.onGround ? 8 : 1));
      if (this.inWater) this.vy -= GRAV * 0.3 * dt;
      this.physics(dt);
      if (this.inLava) {
        this.dead = true;
        sfx('fizz', this.x, this.y);
        return;
      }
      if (this.age > 300) this.dead = true;
      const p = g.player;
      if (p.dead || this.pickDelay > 0) return;
      const dx = p.x - this.x, dy = p.y - 0.9 - this.y;
      const d = Math.hypot(dx, dy);
      if (d < 2.6) {
        const pull = (1 - d / 2.6) * 14 + 3;
        this.x += (dx / d) * dt * pull;
        this.y += (dy / d) * dt * pull;
      }
      if (d < 0.7) {
        const left = p.give(this.id, this.n, this.d);
        if (left < this.n) {
          sfx('pop', this.x, this.y);
          if (g.statMap) g.statMap('picked', this.id, this.n - left);
          this.n = left;
          if (!left) this.dead = true;
        }
      }
    }
    draw(ctx, sx, sy, S) {
      const s = S * 0.45;
      const b = Math.sin(this.age * 3 + this.bob) * S * 0.06;
      const icon = SC.icons[this.id];
      if (!icon) return;
      ctx.drawImage(icon, sx - s / 2, sy - s - S * 0.08 + b, s, s);
      if (this.n > 1) ctx.drawImage(icon, sx - s / 2 + S * 0.08, sy - s - S * 0.14 + b, s, s);
    }
  }
  SC.ItemDrop = ItemDrop;

  class XPOrb extends Entity {
    constructor(x, y, v) {
      super(x, y, 0.25, 0.25);
      this.v = v;
      this.vx = (Math.random() - 0.5) * 4;
      this.vy = -2 - Math.random() * 3;
      this.kind = 'xp';
      this.pickDelay = 0.5;
      this.seed = Math.random() * 10;
    }
    update(dt) {
      this.age += dt;
      this.pickDelay -= dt;
      const p = game().player;
      const dx = p.x - this.x, dy = p.y - 0.9 - this.y;
      const d = Math.hypot(dx, dy);
      if (d < 7 && !p.dead && !p.spectator && this.pickDelay <= 0) {
        const f = (1 - d / 7) ** 2 * 60;
        this.vx += (dx / d) * f * dt;
        this.vy += (dy / d) * f * dt;
      }
      this.vx *= Math.exp(-dt * 2);
      this.physics(dt);
      if (this.age > 300 || this.inLava) this.dead = true;
      if (d < 0.7 && this.pickDelay <= 0 && !p.dead && !p.spectator) {
        this.dead = true;
        p.addXP(this.v);
      }
    }
    draw(ctx, sx, sy, S) {
      const sz = Math.max(3, S * (0.18 + Math.min(this.v, 20) * 0.01));
      const t = this.age * 6 + this.seed;
      const r = Math.round(160 + 95 * Math.sin(t)), gch = 255, b = Math.round(40 + 30 * Math.sin(t + 2));
      ctx.fillStyle = 'rgba(40,60,0,0.9)';
      ctx.fillRect(Math.round(sx - sz / 2) - 1, Math.round(sy - sz - S * 0.05) - 1, Math.round(sz) + 2, Math.round(sz) + 2);
      ctx.fillStyle = `rgb(${r},${gch},${b})`;
      ctx.fillRect(Math.round(sx - sz / 2), Math.round(sy - sz - S * 0.05), Math.round(sz), Math.round(sz));
    }
  }
  SC.XPOrb = XPOrb;
  SC.dropXP = (x, y, total) => {
    total = Math.floor(total);
    while (total > 0) {
      const v = total >= 17 ? 17 : total >= 7 ? 7 : total >= 3 ? 3 : 1;
      total -= v;
      game().entities.push(new XPOrb(x, y, v));
    }
  };

  class FallingBlock extends Entity {
    constructor(x, y, id) {
      super(x + 0.5, y + 1, 0.98, 0.98);
      this.id = id;
      this.kind = 'falling';
    }
    update(dt) {
      this.physics(dt);
      this.age += dt;
      if (this.onGround || this.age > 20) {
        this.dead = true;
        const w = this.world;
        const tx = Math.floor(this.x), ty = Math.floor(this.y - 0.5);
        if (w.open(tx, ty) && !blocks[w.get(tx, ty)].fluid) w.set(tx, ty, this.id);
        else if (w.open(tx, ty)) w.set(tx, ty, this.id);
        else game().dropItem(this.x, this.y - 0.5, this.id, 1);
        // crush anything standing underneath
        for (const e of [game().player, ...game().entities]) if ((e instanceof Mob || e instanceof Player) && e.overlapsTile(tx, ty)) e.damage(2, null, 'crush');
      }
    }
    draw(ctx, sx, sy, S) {
      ctx.drawImage(SC.tex[this.id], Math.round(sx - S / 2), Math.round(sy - S), S, S);
    }
  }
  SC.FallingBlock = FallingBlock;

  class Arrow extends Entity {
    constructor(owner, x, y, vx, vy, dmg) {
      super(x, y, 0.1, 0.1);
      this.owner = owner;
      this.vx = vx;
      this.vy = vy;
      this.dmg = dmg;
      this.stuck = false;
      this.kind = 'arrow';
    }
    update(dt) {
      this.age += dt;
      if (this.stuck) {
        if (this.age > 30) this.dead = true;
        const p = game().player;
        if (this.owner === p && Math.hypot(p.x - this.x, p.y - 0.9 - this.y) < 0.9) {
          if (!p.give(I.ARROW, 1)) {
            this.dead = true;
            sfx('pop', this.x, this.y);
          }
        }
        return;
      }
      const steps = Math.max(1, Math.ceil(Math.hypot(this.vx, this.vy) * dt / 0.2));
      for (let s = 0; s < steps; s++) {
        this.vy += (20 * dt) / steps;
        this.x += (this.vx * dt) / steps;
        this.y += (this.vy * dt) / steps;
        if (this.world.solid(this.x, this.y)) {
          this.stuck = true;
          this.age = 0;
          sfx('arrowHit', this.x, this.y);
          return;
        }
        for (const e of [game().player, ...game().entities]) {
          if (e === this.owner || e.dead || !(e instanceof Mob || e instanceof Player)) continue;
          if (this.x > e.x - e.w / 2 && this.x < e.x + e.w / 2 && this.y > e.y - e.h && this.y < e.y) {
            const by = this.owner === game().player ? 'player' : 'mob';
            e.damage(this.dmg, { x: this.x - Math.sign(this.vx), kb: 4, by }, 'arrow');
            this.dead = true;
            return;
          }
        }
      }
      if (this.age > 10) this.dead = true;
    }
    draw(ctx, sx, sy, S) {
      const a = this.stuck ? this.ang : (this.ang = Math.atan2(this.vy, this.vx));
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(a);
      const u = S / 16;
      ctx.fillStyle = '#7a5a32';
      ctx.fillRect(-9 * u, -0.5 * u, 9 * u, u);
      ctx.fillStyle = '#9a9a9a';
      ctx.fillRect(0, -1 * u, 2 * u, 2 * u);
      ctx.fillStyle = '#eeeeee';
      ctx.fillRect(-9 * u, -1.5 * u, 2.5 * u, 3 * u);
      ctx.restore();
    }
  }
  SC.Arrow = Arrow;

  class PrimedTNT extends Entity {
    constructor(x, y, fuse = 4) {
      super(x + 0.5, y + 1, 0.98, 0.98);
      this.fuse = fuse;
      this.vy = -4;
      this.vx = (Math.random() - 0.5) * 1.5;
      this.kind = 'tnt';
    }
    update(dt) {
      this.physics(dt);
      this.vx *= Math.exp(-dt * 4);
      this.fuse -= dt;
      if (Math.random() < 0.4) SC.particles.push({ x: this.x, y: this.y - 1, vx: 0, vy: -1.5, life: 0.6, max: 0.6, col: [120, 120, 120], size: 0.12, g: -1 });
      if (this.fuse <= 0) {
        this.dead = true;
        SC.explode(this.x, this.y - 0.5, 4, this);
      }
    }
    draw(ctx, sx, sy, S) {
      const grow = this.fuse < 0.4 ? 1 + (0.4 - this.fuse) * 0.4 : 1;
      const s = S * grow;
      ctx.drawImage(SC.tex[B.TNT], Math.round(sx - s / 2), Math.round(sy - S / 2 - s / 2), s, s);
      if (Math.floor(this.fuse * 4) % 2 === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.fillRect(Math.round(sx - s / 2), Math.round(sy - S / 2 - s / 2), s, s);
      }
    }
  }
  SC.PrimedTNT = PrimedTNT;

  // ---------- particles ----------
  SC.particles = [];
  const pScale = () => [1, 0.5, 0.15][(SC.options && SC.options.particles) || 0];
  SC.puff = (x, y, n, col) => {
    n = Math.ceil(n * pScale());
    for (let i = 0; i < n; i++)
      SC.particles.push({
        x: x + (Math.random() - 0.5) * 0.6,
        y: y + (Math.random() - 0.5) * 0.8,
        vx: (Math.random() - 0.5) * 2,
        vy: -Math.random() * 1.5,
        life: 0.6 + Math.random() * 0.5,
        max: 1.1,
        col,
        size: 0.14 + Math.random() * 0.1,
        g: -0.5,
      });
  };
  SC.debris = (x, y, id, n = 10, burst = 1) => {
    n = Math.ceil(n * pScale());
    const base = SC.texColor[id] || [128, 128, 128];
    for (let i = 0; i < n; i++) {
      const f = 0.75 + Math.random() * 0.4;
      SC.particles.push({
        x: x + Math.random(),
        y: y + Math.random(),
        vx: (Math.random() - 0.5) * 4 * burst,
        vy: (-Math.random() * 4 - 1) * burst,
        life: 0.5 + Math.random() * 0.5,
        max: 1,
        col: base.map((c) => c * f),
        size: 0.09 + Math.random() * 0.08,
        g: 20,
        solid: true,
      });
    }
  };
  SC.updateParticles = (dt) => {
    const w = game().world;
    const P = SC.particles;
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i];
      p.life -= dt;
      p.vy += p.g * dt;
      const nx = p.x + p.vx * dt, ny = p.y + p.vy * dt;
      if (p.solid && w.solid(nx, ny)) {
        p.vx *= 0.3;
        p.vy = 0;
      } else {
        p.x = nx;
        p.y = ny;
      }
      if (p.life <= 0) P.splice(i, 1);
    }
    if (P.length > 1500) P.splice(0, P.length - 1500);
  };

  // ---------- explosions ----------
  SC.explode = (x, y, power, src) => {
    const g = game();
    const w = g.world;
    const R = power;
    sfx('explode', x, y);
    SC.shake(14);
    for (let ty = Math.floor(y - R); ty <= Math.ceil(y + R); ty++)
      for (let tx = Math.floor(x - R); tx <= Math.ceil(x + R); tx++) {
        const d = Math.hypot(tx + 0.5 - x, ty + 0.5 - y);
        if (d > R * (0.75 + Math.random() * 0.35)) continue;
        if (!w.inb(tx, ty)) continue;
        const id = w.get(tx, ty);
        if (!id) continue;
        const b = blocks[id];
        if (b.hard < 0 || b.hard >= 50) continue;
        if (b.fluid) continue;
        if (id === B.TNT) {
          w.set(tx, ty, 0);
          const t = new SC.PrimedTNT(tx, ty, 0.5 + Math.random() * 1);
          g.entities.push(t);
          continue;
        }
        const drop = Math.random() < 0.3;
        if (drop) for (const [di, n] of w.dropsFor(id, tx, ty)) g.dropItem(tx + 0.5, ty + 0.5, di, n);
        const c = w.containers.get(w.idx(tx, ty));
        if (c) {
          for (const s of c.type === 'chest' ? c.items : c.slots) if (s) g.dropItem(tx + 0.5, ty + 0.5, s.id, s.n, s.d);
          w.containers.delete(w.idx(tx, ty));
        }
        w.set(tx, ty, 0);
        if (Math.random() < 0.3) SC.debris(tx, ty, id, 3, 2);
      }
    for (let i = 0; i < 30; i++) {
      const a = Math.random() * Math.PI * 2, s = Math.random() * 5;
      SC.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.8 + Math.random() * 0.8, max: 1.6, col: i % 3 ? [230, 230, 230] : [255, 200, 90], size: 0.3 + Math.random() * 0.35, g: -1 });
    }
    for (const e of [g.player, ...g.entities]) {
      if (e.dead || e === src) continue;
      const d = Math.hypot(e.x - x, e.y - e.h / 2 - y);
      if (d > R * 2) continue;
      const imp = 1 - d / (R * 2);
      if (e.kind === 'item') {
        if (imp > 0.5) e.dead = true;
      } else if (e instanceof SC.Mob || e instanceof SC.Player) e.damage(Math.floor(((imp * imp + imp) / 2) * 7 * power + 1), null, src && src.kind === 'creeper' ? 'creeper' : 'explosion');
      const dir = Math.sign(e.x - x) || 1;
      e.vx += dir * imp * 14;
      e.vy -= imp * 10;
    }
  };

  // ---------- character models ----------
  // shading helper: c = [r,g,b], f = brightness multiplier
  let TINT = null;
  const RED = [255, 40, 40], WHITE = [255, 255, 255];
  const col = (c, f = 1) => {
    let r = c[0] * f, g = c[1] * f, b = c[2] * f;
    if (TINT) {
      r = r * 0.45 + TINT[0] * 0.55;
      g = g * 0.45 + TINT[1] * 0.55;
      b = b * 0.45 + TINT[2] * 0.55;
    }
    return `rgb(${Math.min(255, r) | 0},${Math.min(255, g) | 0},${Math.min(255, b) | 0})`;
  };
  function limb(ctx, u, px, py, ang, w, h, c, f, endC, over, held) {
    ctx.save();
    ctx.translate(px * u, py * u);
    ctx.rotate(ang);
    if (held) drawHeld(ctx, u, held, ang);
    ctx.fillStyle = col(c, f);
    ctx.fillRect((-w / 2) * u, 0, w * u, h * u);
    ctx.fillStyle = col(c, f * 0.82);
    ctx.fillRect((-w / 2) * u, 0, u, h * u);
    if (endC) {
      ctx.fillStyle = col(endC, f);
      ctx.fillRect((-w / 2) * u, (h - 2) * u, w * u, 2 * u);
    }
    if (over) armorBand(ctx, u, w, over, f);
    ctx.restore();
  }
  // armour pieces are drawn as slightly larger bands over a limb
  function armorBand(ctx, u, w, over, f) {
    for (const [y0, y1, pal] of over) {
      if (!pal) continue;
      ctx.fillStyle = col(pal[0], f);
      ctx.fillRect((-w / 2 - 0.5) * u, y0 * u, (w + 1) * u, (y1 - y0) * u);
      ctx.fillStyle = col(pal[1], f);
      ctx.fillRect((-w / 2 - 0.5) * u, (y1 - 0.75) * u, (w + 1) * u, 0.75 * u);
      ctx.fillStyle = col(pal[2], f);
      ctx.fillRect((w / 2 - 0.5) * u, y0 * u, 1 * u, (y1 - y0 - 0.75) * u);
    }
  }
  function drawHeld(ctx, u, id, armAng) {
    const icon = SC.icons[id];
    const it = SC.items[id];
    if (!icon) return;
    ctx.save();
    ctx.translate(0, 11 * u);
    if (it && it.block) {
      ctx.rotate(-armAng * 0.2);
      ctx.drawImage(icon, -1 * u, -2 * u, 7 * u, 7 * u);
    } else if (id === I.BOW) {
      ctx.rotate(-Math.PI / 4 - Math.PI / 2);
      ctx.drawImage(icon, -8 * u, -8 * u, 14 * u, 14 * u);
    } else {
      ctx.rotate(-Math.PI / 2 - 0.2);
      ctx.drawImage(icon, -3 * u, -11 * u, 13 * u, 13 * u);
    }
    ctx.restore();
  }
  function drawHumanoid(ctx, sx, sy, u, facing, o) {
    TINT = o.flash ? RED : null;
    ctx.save();
    ctx.translate(Math.round(sx), Math.round(sy));
    ctx.scale(facing, 1);
    const sw = Math.sin(o.walk) * Math.min(1, Math.abs(Math.sin(o.walk)) + 0.6) * 0.7;
    const lw = o.thin ? 2 : 4;
    const crouch = o.crouch ? 2 : 0;
    const legA = sw, legB = -sw;
    const A = o.armor || [];
    const legOver = [[0, 8.5, A[2]], [8.5, 12.4, A[3]]];
    // back leg, back arm
    limb(ctx, u, 0, -12, legB, lw, 12, o.pants, 0.72, o.shoes, legOver);
    let armBack = -sw * 0.8, armFront = sw * 0.8;
    if (o.arms === 'forward') {
      armBack = -1.45 + Math.sin(o.walk * 0.5) * 0.05;
      armFront = -1.55 - Math.sin(o.walk * 0.5) * 0.05;
    }
    if (o.aim) {
      armBack = -1.45;
      armFront = -1.5;
    }
    if (o.eating) armFront = -1.1 + Math.sin(performance.now() / 70) * 0.15;
    if (o.swing > 0) armFront = -0.3 - Math.sin(o.swing * Math.PI) * 1.6;
    limb(ctx, u, 0, -22 + crouch, armBack, lw, 12, o.shirt, 0.72, o.skin, [[-0.5, 5, A[1]]], o.offhand);
    // body
    ctx.save();
    ctx.translate(0, -12 * u);
    if (o.crouch) ctx.rotate(0.3);
    ctx.fillStyle = col(o.shirt);
    ctx.fillRect((-lw / 2) * u, -12 * u, lw * u, 12 * u);
    ctx.fillStyle = col(o.shirt, 0.82);
    ctx.fillRect((-lw / 2) * u, -12 * u, u, 12 * u);
    if (o.thin) {
      ctx.fillStyle = col(o.shirt, 0.6);
      for (let k = 0; k < 4; k++) ctx.fillRect(-1 * u, (-10 + k * 2.5) * u, 2 * u, 0.8 * u);
    }
    ctx.translate(0, -12 * u);
    armorBand(ctx, u, lw, [[-0.5, 10, A[1]], [10, 12.5, A[2]]], 1);
    ctx.restore();
    limb(ctx, u, 0, -12, legA, lw, 12, o.pants, 1, o.shoes, legOver);
    // head
    const hx = o.crouch ? 2 : 0;
    const hy = -32 + crouch;
    ctx.fillStyle = col(o.skin);
    ctx.fillRect((-4 + hx) * u, hy * u, 8 * u, 8 * u);
    ctx.fillStyle = col(o.hair);
    ctx.fillRect((-4 + hx) * u, hy * u, 8 * u, 2 * u);
    ctx.fillRect((-4 + hx) * u, hy * u, 3 * u, 5 * u);
    ctx.fillStyle = col(o.eye || WHITE);
    ctx.fillRect((1 + hx) * u, (hy + 4) * u, 2 * u, u);
    if (!o.eye) {
      ctx.fillStyle = '#3b3b9b';
      ctx.fillRect((2 + hx) * u, (hy + 4) * u, u, u);
    }
    if (o.thin) {
      ctx.fillStyle = '#222';
      ctx.fillRect((0 + hx) * u, (hy + 6) * u, 4 * u, u);
    }
    if (A[0]) {
      ctx.fillStyle = col(A[0][0]);
      ctx.fillRect((-4.5 + hx) * u, (hy - 0.5) * u, 9 * u, 3 * u);
      ctx.fillRect((-4.5 + hx) * u, hy * u, 3.5 * u, 6.5 * u);
      ctx.fillStyle = col(A[0][2]);
      ctx.fillRect((-3.5 + hx) * u, (hy - 0.5) * u, 7 * u, 0.75 * u);
      ctx.fillStyle = col(A[0][1]);
      ctx.fillRect((-4.5 + hx) * u, (hy + 2) * u, 9 * u, 0.75 * u);
    }
    // held item and front arm
    ctx.save();
    ctx.translate(0, (-22 + crouch) * u);
    ctx.rotate(armFront);
    if (o.held) drawHeld(ctx, u, o.held, armFront);
    ctx.fillStyle = col(o.shirt);
    ctx.fillRect((-lw / 2) * u, 0, lw * u, 12 * u);
    ctx.fillStyle = col(o.shirt, 0.85);
    ctx.fillRect((-lw / 2) * u, 0, u, 12 * u);
    ctx.fillStyle = col(o.skin);
    ctx.fillRect((-lw / 2) * u, 8 * u, lw * u, 4 * u);
    armorBand(ctx, u, lw, [[-0.5, 5, A[1]]], 1);
    ctx.restore();
    ctx.restore();
    TINT = null;
    if (o.burn) flames(ctx, sx, sy, u * 10, u * 32);
  }
  function flames(ctx, sx, sy, w, h) {
    const t = performance.now() / 90;
    for (let i = 0; i < 9; i++) {
      const fx = sx - w / 2 + ((i * 37 + Math.floor(t) * 13) % 100) / 100 * w;
      const fh = h * (0.2 + ((i * 53 + Math.floor(t) * 7) % 100) / 300);
      const fy = sy - ((i * 29) % 100) / 100 * h * 0.8;
      ctx.fillStyle = i % 2 ? 'rgba(255,200,60,0.85)' : 'rgba(255,110,20,0.85)';
      ctx.fillRect(fx, fy - fh, w / 6, fh);
    }
  }
  // creeper texture
  const CREEP = [];
  {
    const r = SC.rng(77);
    for (let i = 0; i < 400; i++) {
      const v = r();
      CREEP.push(v < 0.25 ? [70, 160, 60] : v < 0.6 ? [94, 190, 80] : v < 0.85 ? [60, 130, 50] : [140, 210, 120]);
    }
  }
  function camo(ctx, u, x, y, w, h, seed, f = 1) {
    for (let j = 0; j < h; j++)
      for (let i = 0; i < w; i++) {
        ctx.fillStyle = col(CREEP[(seed + i * 7 + j * 13) % 400], f);
        ctx.fillRect((x + i) * u, (y + j) * u, u + 0.5, u + 0.5);
      }
  }
  function drawCreeper(ctx, sx, sy, u, facing, walk, fuse, flash) {
    TINT = flash ? RED : fuse > 0 && Math.floor(fuse * 8) % 2 === 0 ? WHITE : null;
    ctx.save();
    ctx.translate(Math.round(sx), Math.round(sy));
    ctx.scale(facing, 1);
    const sw = Math.sin(walk) * 0.5;
    const swell = 1 + Math.min(fuse, 1.5) * 0.12;
    for (const [px, a, f] of [[-2, -sw, 0.7], [2, sw, 0.7], [-2, sw, 1], [2, -sw, 1]]) {
      ctx.save();
      ctx.translate(px * u, -6 * u);
      ctx.rotate(a);
      camo(ctx, u, -2, 0, 4, 6, 50 + px * 10, f);
      ctx.restore();
    }
    ctx.save();
    ctx.translate(0, -6 * u);
    ctx.scale(swell, swell);
    camo(ctx, u, -2, -12, 4, 12, 100);
    camo(ctx, u, -4, -20, 8, 8, 200);
    ctx.fillStyle = '#111';
    ctx.fillRect(2 * u, -18 * u, 2 * u, 2 * u);
    ctx.fillRect(1 * u, -15 * u, 2 * u, 3 * u);
    ctx.fillRect(3 * u, -15 * u, 1 * u, 3 * u);
    ctx.restore();
    ctx.restore();
    TINT = null;
  }
  function drawQuad(ctx, sx, sy, u, facing, walk, kind, flash) {
    TINT = flash ? RED : null;
    ctx.save();
    ctx.translate(Math.round(sx), Math.round(sy));
    ctx.scale(facing, 1);
    const sheep = kind === 'sheep';
    const skin = sheep ? [214, 190, 172] : [240, 162, 160];
    const body = sheep ? [236, 236, 236] : [240, 162, 160];
    const legC = sheep ? [214, 190, 172] : [225, 145, 145];
    const sw = Math.sin(walk) * 0.5;
    const lh = sheep ? 6 : 4;
    for (const [px, a, f] of [[-5, sw, 0.7], [4, -sw, 0.7], [-4, -sw, 1], [5, sw, 1]]) {
      ctx.save();
      ctx.translate(px * u, -lh * u);
      ctx.rotate(a);
      ctx.fillStyle = col(legC, f);
      ctx.fillRect(-1.5 * u, 0, 3 * u, lh * u);
      ctx.restore();
    }
    const by = -lh;
    if (sheep) {
      ctx.fillStyle = col(body, 0.92);
      ctx.fillRect(-8 * u, (by - 10) * u, 15 * u, 10 * u);
      ctx.fillStyle = col(body);
      ctx.fillRect(-7 * u, (by - 11) * u, 13 * u, 10 * u);
      ctx.fillStyle = col(body, 0.85);
      for (let k = 0; k < 6; k++) ctx.fillRect((-6 + k * 2) * u, (by - 9 + (k % 2) * 3) * u, u, u);
    } else {
      ctx.fillStyle = col(body);
      ctx.fillRect(-8 * u, (by - 8) * u, 15 * u, 8 * u);
      ctx.fillStyle = col(body, 0.88);
      ctx.fillRect(-8 * u, (by - 2) * u, 15 * u, 2 * u);
    }
    // head
    const hy = sheep ? by - 14 : by - 10;
    ctx.fillStyle = col(skin);
    ctx.fillRect(5 * u, hy * u, 7 * u, 7 * u);
    if (sheep) {
      ctx.fillStyle = col(body);
      ctx.fillRect(5 * u, hy * u, 4 * u, 3 * u);
    } else {
      ctx.fillStyle = col([235, 130, 140]);
      ctx.fillRect(12 * u, (hy + 3) * u, 2 * u, 3 * u);
      ctx.fillStyle = col([150, 70, 80]);
      ctx.fillRect(13 * u, (hy + 3) * u, u, u);
      ctx.fillRect(13 * u, (hy + 5) * u, u, u);
    }
    ctx.fillStyle = '#fff';
    ctx.fillRect(9 * u, (hy + 2) * u, 2 * u, u);
    ctx.fillStyle = '#111';
    ctx.fillRect(10 * u, (hy + 2) * u, u, u);
    ctx.restore();
    TINT = null;
  }
  SC.drawHumanoid = drawHumanoid;
})();
