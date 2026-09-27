// Player: Wick's movement, dodge roll, parry, finger-gun shooting and EX shots.
(function () {
  const K = G.ink,
    C = K.C,
    I = G.input,
    A = G.audio,
    F = G.fx;

  G.Player = class {
    constructor(x, y, combat = false) {
      this.x = x;
      this.y = y;
      this.combat = combat;
      this.fx = 0;
      this.fy = 1;
      this.phase = 0;
      this.moving = false;
      this.r = 13;
      this.maxHp = 3 + G.state.hpLevel;
      this.hp = this.maxHp;
      this.meter = 0;
      this.cardFlip = [0, 0, 0, 0, 0];
      this.inv = 0;
      this.roll = null;
      this.rollCd = 0;
      this.shootCd = 0;
      this.aim = null;
      this.shooting = false;
      this.dead = false;
      this.parries = 0;
      this.exUsed = 0;
      this.hits = 0;
      this.speed = 205;
      this.frozen = false;
    }

    update(dt, world) {
      if (this.dead) return;
      this.inv = Math.max(0, this.inv - dt);
      this.rollCd = Math.max(0, this.rollCd - dt);
      this.shootCd = Math.max(0, this.shootCd - dt);
      for (let i = 0; i < 5; i++) if (this.meter >= i + 1) this.cardFlip[i] = Math.min(1, (this.cardFlip[i] || 0) + dt);
      else this.cardFlip[i] = 0;
      const ax = this.frozen ? { x: 0, y: 0 } : I.axis();
      let mx = ax.x,
        my = ax.y;
      const l = Math.hypot(mx, my);
      if (l > 0) {
        mx /= l;
        my /= l;
      }
      if (this.roll) {
        const r = this.roll;
        r.t += dt;
        const k = r.t / r.dur;
        const sp = 520 * (1 - k * 0.6);
        this.move(r.dx * sp * dt, r.dy * sp * dt, world);
        if (Math.random() < 0.5) F.poof(this.x - r.dx * 10, this.y - 4, 1, C.cream, 30);
        if (r.t >= r.dur) {
          this.roll = null;
          this.rollCd = 0.22;
        }
      } else {
        this.moving = l > 0;
        if (this.moving) {
          this.fx = mx;
          this.fy = my;
          this.phase += dt * 13;
          const slow = this.shooting && this.combat ? 0.8 : 1;
          this.move(mx * this.speed * slow * dt, my * this.speed * slow * dt, world);
        }
      }
      if (!this.combat || this.frozen) {
        this.aim = null;
        this.shooting = false;
        return;
      }
      // dodge roll (parries pink things mid-roll)
      if (I.hit('dodge') && !this.roll && this.rollCd <= 0) {
        const dx = l > 0 ? mx : this.fx || 0,
          dy = l > 0 ? my : this.fy || 0;
        const dl = Math.hypot(dx, dy) || 1;
        this.roll = { t: 0, dur: 0.34, dx: dx / dl, dy: dy / dl, parried: false };
        A.sfx('dodge');
        F.poof(this.x, this.y - 4, 4, C.cream, 50);
      }
      // aiming: mouse if the mouse was used recently, else facing
      const m = I.mouse;
      const useMouse = I.lastDevice === 'mouse' || G.t - m.lastMove < 1.5;
      this.shooting = I.is('shoot') && !this.roll;
      if (this.shooting || I.hit('ex')) {
        if (useMouse) this.aim = Math.atan2(m.y - (this.y - 40), m.x - this.x);
        else this.aim = Math.atan2(this.fy, this.fx);
      } else this.aim = null;
      if (this.aim != null && useMouse) {
        this.fx = Math.cos(this.aim);
        this.fy = Math.sin(this.aim);
      }
      const W = G.ui.WEAPONS[G.state.weapon];
      if (this.shooting && this.shootCd <= 0) {
        this.shootCd = W.rate;
        const dmgMul = [1, 1, 1.35, 1.75, 2.2][G.state.dmgLevel] || 1;
        const hx = this.x + Math.cos(this.aim) * 30,
          hy = this.y - 42 + Math.sin(this.aim) * 30;
        for (let i = 0; i < W.count; i++) {
          const off = W.count > 1 ? (i - (W.count - 1) / 2) * W.spread : (Math.random() - 0.5) * W.spread;
          const a = this.aim + off;
          world.pbullets.push({
            x: hx,
            y: hy,
            vx: Math.cos(a) * W.speed,
            vy: Math.sin(a) * W.speed,
            r: W.r,
            dmg: W.dmg * dmgMul,
            life: W.life,
            kind: W.homing ? 'firefly' : 'flame',
            homing: W.homing || 0,
            seed: Math.random() * 999,
          });
        }
        A.sfx('shoot');
      }
      if (I.hit('ex') && this.meter >= 1 && !this.roll) {
        this.meter -= 1;
        this.exUsed++;
        const a = this.aim == null ? Math.atan2(this.fy, this.fx) : this.aim;
        world.pbullets.push({ x: this.x + Math.cos(a) * 30, y: this.y - 40 + Math.sin(a) * 30, vx: Math.cos(a) * 520, vy: Math.sin(a) * 520, r: 26, dmg: 9 * ([1, 1, 1.35, 1.75, 2.2][G.state.dmgLevel] || 1), life: 1.4, kind: 'ex', pierce: true, hitSet: new Set(), seed: 5 });
        A.sfx('ex');
        F.shake = 8;
        F.ring(this.x, this.y - 40, 60, C.orange);
      }
      if (I.hit('potion')) this.drink();
      if (I.hit('swap') && G.state.weapons.length > 1) {
        const ws = G.state.weapons;
        G.state.weapon = ws[(ws.indexOf(G.state.weapon) + 1) % ws.length];
        A.sfx('select');
        G.ui.toastMsg(G.ui.WEAPONS[G.state.weapon].name.toUpperCase());
      }
    }

    drink() {
      const s = G.state;
      if (s.potions <= 0 || this.hp >= this.maxHp) {
        A.sfx('back');
        return;
      }
      s.potions--;
      this.hp = Math.min(this.maxHp, this.hp + 2);
      A.sfx('heal');
      F.popText(this.x, this.y - 90, '+2 HP', C.pink);
      F.spark(this.x, this.y - 40, C.pink, 8);
    }

    addMeter(v) {
      this.meter = Math.min(5, this.meter + v);
    }

    tryParry(b) {
      if (!this.roll || !b.pink) return false;
      if (G.dist(this.x, this.y - 30, b.x, b.y) > this.r + b.r + 22) return false;
      this.parries++;
      this.addMeter(1);
      this.inv = Math.max(this.inv, 0.3);
      A.sfx('parry');
      F.hitStop = 0.12;
      F.flash = 0.6;
      F.flashColor = C.pink;
      F.popText(b.x, b.y - 20, 'PARRY!', C.pink, 26);
      F.spark(b.x, b.y, C.pink, 8);
      return true;
    }

    hurt(from) {
      if (this.inv > 0 || this.roll || this.dead) return false;
      this.hp--;
      this.hits++;
      this.inv = 1.6;
      A.sfx('hurt');
      F.shake = 12;
      F.hitStop = 0.08;
      F.hitStar(this.x, this.y - 40, C.white);
      F.spark(this.x, this.y - 40, C.red, 6);
      if (from) {
        const a = Math.atan2(this.y - from.y, this.x - from.x);
        this.knock = { x: Math.cos(a) * 240, y: Math.sin(a) * 240, t: 0.15 };
      }
      if (this.hp <= 0) {
        this.dead = true;
        A.sfx('sad');
        for (let i = 0; i < 6; i++) F.smoke(this.x + (Math.random() - 0.5) * 20, this.y - 70);
      }
      return true;
    }

    move(dx, dy, world) {
      if (this.knock && this.knock.t > 0) {
        this.knock.t -= G.dt;
        dx += this.knock.x * G.dt;
        dy += this.knock.y * G.dt;
      }
      this.x += dx;
      this.y += dy;
      G.collide(this, world);
    }

    draw() {
      if (this.dead) return;
      const blink = this.inv > 0 && !this.roll && Math.floor(this.inv * 14) % 2 === 0;
      G.chars.wick(this.x, this.y, {
        fx: this.fx,
        fy: this.fy,
        moving: this.moving && !this.roll,
        phase: this.phase,
        aim: this.aim,
        shooting: this.shooting,
        rolling: !!this.roll,
        rollT: this.roll ? this.roll.t / this.roll.dur : 0,
        rollDir: this.roll ? (this.roll.dx >= 0 ? 1 : -1) : 1,
        rollView: this.roll ? (Math.abs(this.roll.dy) > Math.abs(this.roll.dx) ? (this.roll.dy > 0 ? 'down' : 'up') : 'side') : null,
        hurtT: this.inv > 1.2 && !this.roll ? (1.6 - this.inv) / 0.4 : null,
        alpha: blink ? 0.35 : 1,
        mood: this.inv > 1.2 ? 'o' : 'grin',
      });
    }
  };

  // Resolve a circle body against the world's bounds, circle solids and rect solids
  G.collide = (e, world) => {
    const b = world.bounds;
    if (b) {
      e.x = G.clamp(e.x, b.x0 + e.r, b.x1 - e.r);
      e.y = G.clamp(e.y, b.y0 + e.r, b.y1 - e.r);
    }
    (world.solids || []).forEach((s) => {
      if (s.dead) return;
      if (s.w) {
        const cx = G.clamp(e.x, s.x, s.x + s.w),
          cy = G.clamp(e.y, s.y, s.y + s.h);
        const d = Math.hypot(e.x - cx, e.y - cy);
        if (d < e.r) {
          if (d === 0) {
            e.y = s.y + s.h + e.r;
            return;
          }
          e.x = cx + ((e.x - cx) / d) * e.r;
          e.y = cy + ((e.y - cy) / d) * e.r;
        }
      } else {
        const d = Math.hypot(e.x - s.x, e.y - s.y);
        const rr = e.r + s.r;
        if (d < rr && d > 0) {
          e.x = s.x + ((e.x - s.x) / d) * rr;
          e.y = s.y + ((e.y - s.y) / d) * rr;
        }
      }
    });
  };

  // Player projectile art
  G.drawPBullet = (b) => {
    const c = G.ctx;
    const a = Math.atan2(b.vy, b.vx);
    K.seed(b.seed || 1);
    c.save();
    c.translate(b.x, b.y);
    c.rotate(a);
    if (b.kind === 'ex') {
      for (let i = 1; i <= 3; i++) K.blob(-i * 14, Math.sin(G.animT * 20 + i) * 4, 16 - i * 3, 12 - i * 2, i % 2 ? C.orange : C.yellow, { lw: 2.2 });
      K.blob(0, 0, 26, 22, C.orange, { lw: 3, hl: true });
      K.blob(4, 0, 15, 12, C.yellow, { lw: 0 });
      K.pieEye(4, -5, 4, 6, 1, 0, 0);
      K.pieEye(14, -5, 4, 6, 1, 0, 0);
    } else if (b.kind === 'firefly') {
      K.wash(0, 0, 18, 18, 'rgba(255,230,120,0.6)');
      K.blob(-3, 0, 7, 5, C.yellow, { lw: 2 });
      K.blob(3, 0, 4, 4, K.INK, { lw: 0 });
      K.blob(-2, -5 + Math.sin(G.t * 40) * 2, 4, 2.5, 'rgba(255,255,255,0.8)', { lw: 1 });
    } else {
      K.shape([[10, 0], [2, -6], [-12, -2], [-16, 0], [-12, 2], [2, 6]], C.orange, { smooth: true, lw: 2.2, amt: 0.5 });
      K.blob(3, 0, 4, 3, C.yellow, { lw: 0 });
    }
    c.restore();
  };
})();
