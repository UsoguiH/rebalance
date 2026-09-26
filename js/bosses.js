// Bosses: one showstopper per Lost Reel. Each has three phases of patterns,
// pink parryable projectiles, and a big hand-inked design.
(function () {
  const K = G.ink,
    C = K.C,
    A = G.audio,
    F = G.fx;

  // ---------- hazards ----------
  G.hz = {
    ring(room, x, y, o = {}) {
      room.hazards.push({
        r: 10,
        max: o.max || 460,
        sp: o.speed || 280,
        w: 14,
        update(dt) {
          this.r += this.sp * dt;
          return this.r < this.max;
        },
        hurts(pl) {
          return Math.abs(G.dist(pl.x, pl.y, x, y) - this.r) < this.w;
        },
        draw() {
          const c = G.ctx;
          c.save();
          c.globalAlpha = 1 - this.r / this.max;
          c.lineWidth = 10;
          c.strokeStyle = o.color || '#e8dcc0';
          c.beginPath();
          c.ellipse(x, y, this.r, this.r * 0.9, 0, 0, Math.PI * 2);
          c.stroke();
          c.lineWidth = 3;
          c.strokeStyle = K.INK;
          c.stroke();
          c.restore();
        },
      });
    },
    // light beam: telegraph then burn
    beam(room, x, y, a, o = {}) {
      const tele = o.tele || 0.8,
        on = o.on || 1.1,
        rot = o.rot || 0;
      room.hazards.push({
        t: 0,
        a,
        update(dt) {
          this.t += dt;
          if (this.t > tele) this.a += rot * dt;
          return this.t < tele + on;
        },
        hurts(pl) {
          if (this.t < tele) return false;
          const dx = pl.x - x,
            dy = pl.y - 30 - y;
          const along = dx * Math.cos(this.a) + dy * Math.sin(this.a);
          const perp = Math.abs(-dx * Math.sin(this.a) + dy * Math.cos(this.a));
          return along > 0 && perp < 26 + along * 0.08;
        },
        draw() {
          const c = G.ctx;
          c.save();
          c.translate(x, y);
          c.rotate(this.a);
          if (this.t < tele) {
            c.setLineDash([10, 10]);
            c.strokeStyle = 'rgba(255,240,160,0.8)';
            c.lineWidth = 3;
            c.beginPath();
            c.moveTo(0, 0);
            c.lineTo(1000, 0);
            c.stroke();
          } else {
            const g = c.createLinearGradient(0, 0, 900, 0);
            g.addColorStop(0, 'rgba(255,248,210,0.95)');
            g.addColorStop(1, 'rgba(255,230,150,0.35)');
            c.fillStyle = g;
            c.beginPath();
            c.moveTo(0, -20);
            c.lineTo(1000, -100);
            c.lineTo(1000, 100);
            c.lineTo(0, 20);
            c.fill();
            c.strokeStyle = K.INK;
            c.lineWidth = 2.5;
            c.stroke();
          }
          c.restore();
        },
      });
    },
    pendulum(room, px, py, len, o = {}) {
      room.hazards.push({
        t: 0,
        life: o.life || 6,
        update(dt) {
          this.t += dt;
          const k = Math.min(1, this.t / 0.8, (this.life - this.t) / 0.8);
          this.a = Math.sin(this.t * 1.7) * 1.05 * Math.max(0, k);
          this.bx = px + Math.sin(this.a) * len;
          this.by = py + Math.cos(this.a) * len;
          return this.t < this.life;
        },
        hurts(pl) {
          return G.dist(pl.x, pl.y - 20, this.bx, this.by) < 50;
        },
        draw() {
          K.seed(4040);
          K.line([[px, py], [this.bx, this.by]], 7, '#8a6a2a');
          K.line([[px, py], [this.bx, this.by]], 2);
          K.blob(this.bx, this.by, 42, 42, C.gold, { lw: 4, hl: true });
          K.blob(this.bx, this.by, 24, 24, null, { lw: 2 });
        },
      });
    },
    bouncer(room, x, y, o = {}) {
      room.hazards.push({
        x,
        y,
        vx: o.vx || 200,
        vy: o.vy || 160,
        r: o.r || 30,
        t: 0,
        life: o.life || 9,
        update(dt) {
          this.t += dt;
          this.x += this.vx * dt;
          this.y += this.vy * dt;
          const b = room.world.bounds;
          if (this.x < b.x0 + this.r || this.x > b.x1 - this.r) this.vx *= -1;
          if (this.y < b.y0 + this.r || this.y > b.y1 - this.r) this.vy *= -1;
          this.x = G.clamp(this.x, b.x0 + this.r, b.x1 - this.r);
          this.y = G.clamp(this.y, b.y0 + this.r, b.y1 - this.r);
          return this.t < this.life;
        },
        hurts(pl) {
          return G.dist(pl.x, pl.y - 20, this.x, this.y) < this.r + 12;
        },
        draw() {
          o.draw ? o.draw(this) : K.blob(this.x, this.y, this.r, this.r, C.grey, { lw: 3 });
        },
      });
    },
  };

  function base(hp, x, y) {
    return { x, y, z: 0, hp, maxHp: hp, t: 0, phase: 1, flash: 0, stun: 0, mode: 'idle', mt: 0, seed: 7, dead: false, hopN: 0 };
  }
  function phaseCheck(b, th = [0.62, 0.28]) {
    const k = b.hp / b.maxHp;
    const p = k > th[0] ? 1 : k > th[1] ? 2 : 3;
    if (p !== b.phase) {
      b.phase = p;
      b.stun = 1.1;
      b.mode = 'idle';
      b.mt = 0;
      F.shake = 14;
      A.sfx('boom');
      F.poof(b.x, b.y - 80, 10, C.cream, 140);
      return true;
    }
    return false;
  }
  const setMode = (b, m) => {
    b.mode = m;
    b.mt = 0;
    b.sub = 0;
  };
  const toPl = (b, room, oy = 80) => Math.atan2(room.pl.y - 30 - (b.y - oy - b.z), room.pl.x - b.x);

  // =========================================================
  // 1. BOILIN' BARTHOLOMEW, the crooning kettle
  // =========================================================
  const kettle = {
    name: "BOILIN' BARTHOLOMEW",
    tag: 'The Crooning Kettle',
    hp: 230,
    make(room) {
      const b = base(this.hp, 480, 230);
      b.hitTest = (x, y, r) => G.dist(x, y, b.x, b.y - 70 - b.z) < 72 + r;
      b.update = (dt) => {
        b.t += dt;
        b.mt += dt;
        b.flash = Math.max(0, b.flash - dt);
        if (phaseCheck(b)) {
          // snap back to centre stage for the new act
          b.x = 480;
          b.y = 230;
          b.z = 0;
          b.hopN = 0;
          b.homeHop = false;
          if (b.phase === 3) {
            // the lid pops off and bounces around the arena
            G.hz.bouncer(room, b.x, b.y - 140, {
              vx: 210,
              vy: 170,
              r: 30,
              life: 999,
              draw(h) {
                K.seed(4100);
                K.blob(h.x, h.y, 34, 18, '#c8743a', { lw: 3.5, hl: true });
                K.blob(h.x, h.y - 16, 9, 7, K.INK, { lw: 2 });
              },
            });
          }
        }
        if (b.stun > 0) {
          b.stun -= dt;
          return;
        }
        const P = b.phase;
        if (b.mode === 'idle') {
          if (b.mt > (P === 3 ? 0.4 : 0.8)) {
            if (P === 2) setMode(b, 'hop');
            else setMode(b, b.last === 'croon' ? (P === 3 ? 'spray' : 'steam') : 'croon');
            b.last = b.mode;
          }
        } else if (b.mode === 'croon') {
          const rate = P === 3 ? 0.12 : 0.17;
          if (b.mt - b.sub * rate > rate) {
            b.sub++;
            const a = toPl(b, room, 100) + Math.sin(b.sub * 0.5) * 0.5;
            G.shoot(room, b.x - 20, b.y - 110, a, P === 3 ? 230 : 190, { kind: 'note', r: 9, wave: { a: 40, f: 6 }, pink: b.sub % 5 === 0, color: C.cream });
          }
          if (b.mt > 3.2) setMode(b, 'idle');
        } else if (b.mode === 'steam') {
          if (b.sub === 0 && b.mt > 0.45) {
            b.sub = 1;
            const gap = Math.random() * Math.PI * 2;
            for (let i = 0; i < 16; i++) {
              const a = (i / 16) * Math.PI * 2;
              if (Math.abs(((a - gap + Math.PI * 3) % (Math.PI * 2)) - Math.PI) < 0.45) continue;
              G.shoot(room, b.x + 70, b.y - 110, a, 170, { kind: 'steam', r: 13, pink: i === 5 });
            }
            A.sfx('whistle');
            F.poof(b.x + 80, b.y - 120, 5, '#e6e2dc', 60);
          }
          if (b.mt > 1.3) setMode(b, 'idle');
        } else if (b.mode === 'hop') {
          // crouch -> leap off-screen -> crash down on Wick's spot
          if (b.sub === 0) {
            if (b.mt > 0.45) {
              b.sub = 1;
              b.mt = 0;
              A.sfx('bop');
            }
          } else if (b.sub === 1) {
            b.z = G.easeIn(Math.min(1, b.mt / 0.45)) * 600;
            if (b.mt > 0.5) {
              b.sub = 2;
              b.mt = 0;
              b.tx = room.pl.x;
              b.ty = G.clamp(room.pl.y + 20, 240, 480);
            }
          } else if (b.sub === 2) {
            b.x = G.lerp(b.x, b.tx, Math.min(1, dt * 6));
            b.y = G.lerp(b.y, b.ty, Math.min(1, dt * 6));
            if (b.mt > 0.55) {
              b.z = 600 * (1 - G.easeIn(Math.min(1, (b.mt - 0.55) / 0.3)));
              if (b.mt > 0.85) {
                b.z = 0;
                b.sub = 3;
                b.mt = 0;
                F.shake = 16;
                A.sfx('boom');
                F.poof(b.x, b.y, 12, C.cream, 160);
                G.hz.ring(room, b.x, b.y, { speed: 300, max: 380 });
                for (let i = 0; i < 10; i++) G.shoot(room, b.x, b.y - 40, (i / 10) * Math.PI * 2, 150, { r: 7, color: C.white, pink: i === 3 });
              }
            }
          } else if (b.sub === 3 && b.mt > 0.6) {
            b.hopN++;
            if (b.hopN % 4 === 0) {
              b.tx = 480;
              b.ty = 230;
              b.sub = 1;
              b.mt = 0;
              b.homeHop = true;
            } else if (b.homeHop) {
              b.homeHop = false;
              setMode(b, 'croon');
            } else {
              b.sub = 0;
              b.mt = 0;
            }
          }
          if (b.sub === 2 && b.homeHop) {
            b.tx = 480;
            b.ty = 230;
          }
        } else if (b.mode === 'spray') {
          const sw = Math.sin(b.mt * 2.2);
          const a = Math.PI / 2 + sw * 1.2;
          if (Math.floor(b.mt / 0.05) > b.sub) {
            b.sub++;
            G.shoot(room, b.x + 70, b.y - 100, a, 280, { kind: 'steam', r: 9, color: '#bfe3f0', pink: b.sub % 17 === 0 });
          }
          if (b.mt > 3) setMode(b, 'idle');
        }
      };
      b.draw = () => drawKettle(b, room);
      return b;
    },
  };
  function drawKettle(b, room) {
    const c = G.ctx;
    const x = b.x,
      y = b.y;
    K.seed(4000);
    if (b.z > 0) {
      const s = Math.max(0.25, 1 - b.z / 600);
      K.shadow(b.tx != null && b.mode === 'hop' && b.sub === 2 ? b.tx : x, b.mode === 'hop' && b.sub === 2 ? b.ty : y, 80 * s, 22 * s);
    } else K.shadow(x, y, 80, 22);
    c.save();
    c.translate(x, y - b.z);
    const squash = b.mode === 'hop' && b.sub === 0 ? 1 - Math.min(1, b.mt / 0.45) * 0.2 : b.mode === 'hop' && b.sub === 3 ? 0.85 + Math.min(1, b.mt * 4) * 0.15 : 1;
    const sing = b.mode === 'croon';
    c.scale(1 / squash, squash);
    if (b.flash > 0) c.scale(1.03, 0.97);
    // legs
    const st = Math.sin(b.t * 6) * 4;
    K.hose(-28, -24, -40, -4 + st * 0.3, 6, 7);
    K.hose(28, -24, 40, -4 - st * 0.3, -6, 7);
    K.shoe(-44, -4, 16, -1);
    K.shoe(44, -4, 16, 1);
    // spout
    K.shape([[48, -80], [98, -120], [112, -128], [110, -112], [60, -56]], '#c8743a', { lw: 4, smooth: false });
    // body
    K.blob(0, -76, 78, 62, '#c8743a', { lw: 4.5, shade: true, hl: true });
    for (let i = 0; i < 6; i++) K.blob(-50 + (i % 3) * 50, -92 + Math.floor(i / 3) * 44, 5, 5, '#e89a5c', { lw: 0 });
    K.blob(0, -24, 70, 12, '#8e4f28', { lw: 3.5 });
    // handle
    K.line([[-50, -128], [-30, -170], [30, -170], [50, -128]], 9, '#3a2a22', { smooth: true });
    // lid
    if (b.phase < 3) {
      K.blob(0, -136, 36, 14, '#c8743a', { lw: 3.5, hl: true });
      K.blob(0, -154, 10, 8, K.INK, { lw: 2 });
    } else {
      for (let i = 0; i < 3; i++) {
        const k = (b.t * 1.5 + i / 3) % 1;
        c.globalAlpha = 1 - k;
        K.blob(-10 + i * 10, -140 - k * 60, 12 + k * 10, 10, '#e6e2dc', { lw: 2 });
        c.globalAlpha = 1;
      }
    }
    // face
    const ang = b.phase === 3;
    K.pieEye(-22, -90, 14, 20, room.pl.x > x ? 0.5 : -0.5, 0.3, 0);
    K.pieEye(22, -90, 14, 20, room.pl.x > x ? 0.5 : -0.5, 0.3, 0);
    if (ang || b.mode === 'hop') {
      K.line([[-40, -118], [-10, -104]], 5);
      K.line([[40, -118], [10, -104]], 5);
    } else {
      K.line([[-36, -118], [-12, -122]], 4, K.INK, { smooth: true });
      K.line([[36, -118], [12, -122]], 4, K.INK, { smooth: true });
    }
    if (sing) {
      const o = 10 + Math.abs(Math.sin(b.t * 9)) * 10;
      K.blob(0, -52, 18, o, C.darkred, { lw: 3 });
      K.blob(0, -48 + o * 0.4, 9, 5, C.pink, { lw: 0 });
    } else if (ang) {
      K.rrect(-22, -62, 44, 18, 6, C.white, { lw: 3 });
      K.line([[-22, -53], [22, -53]], 2);
    } else K.line([[-20, -56], [0, -48], [20, -56]], 4, K.INK, { smooth: true });
    // bowtie
    K.shape([[0, -30], [-18, -40], [-18, -20]], C.red, { lw: 3 });
    K.shape([[0, -30], [18, -40], [18, -20]], C.red, { lw: 3 });
    K.blob(0, -30, 5, 5, C.red, { lw: 2.5 });
    // arms (one holds a microphone while crooning)
    const sw = Math.sin(b.t * 5) * 8;
    K.hose(-70, -80, -104, -60 + sw, 8, 6);
    K.glove(-104, -60 + sw, 10, Math.PI, sing ? 'open' : 'fist');
    if (sing) {
      K.hose(-64, -60, -30, -40, -8, 6);
      K.line([[-24, -40], [-14, -30]], 5, '#555');
      K.blob(-28, -44, 8, 8, '#9e9aa6', { lw: 2.5 });
      K.glove(-30, -40, 10, -0.5, 'fist');
    } else {
      K.hose(70, -80, 104, -60 - sw, -8, 6);
      K.glove(104, -60 - sw, 10, 0, 'fist');
    }
    c.restore();
    if (b.mode === 'hop' && b.sub === 2) {
      c.save();
      c.globalAlpha = 0.5 + Math.sin(G.t * 30) * 0.2;
      c.strokeStyle = C.red;
      c.lineWidth = 3;
      c.beginPath();
      c.ellipse(b.tx, b.ty, 70, 20, 0, 0, Math.PI * 2);
      c.stroke();
      c.restore();
    }
  }

  // =========================================================
  // 2. JANGLES THE JACK, jack-in-the-box
  // =========================================================
  const jangles = {
    name: 'JANGLES THE JACK',
    tag: 'The Boxed Buffoon',
    hp: 330,
    make(room) {
      const b = base(this.hp, 480, 300);
      b.pop = 1;
      b.hitTest = (x, y, r) => G.dist(x, y, b.x, b.y - 60) < 66 + r || G.dist(x, y, b.x, b.y - 120 - 100 * b.pop) < 44 + r;
      b.update = (dt) => {
        b.t += dt;
        b.mt += dt;
        b.flash = Math.max(0, b.flash - dt);
        phaseCheck(b);
        if (b.stun > 0) {
          b.stun -= dt;
          b.pop = G.lerp(b.pop, 0.2, dt * 6);
          return;
        }
        const P = b.phase;
        b.pop = G.lerp(b.pop, b.mode === 'bounce' ? 0.4 : 1, dt * 8);
        if (b.mode === 'idle') {
          if (b.mt > 0.7) {
            if (P === 1) setMode(b, b.last === 'juggle' ? 'balloons' : 'juggle');
            else if (P === 2) setMode(b, b.last === 'bounce' ? 'juggle' : 'bounce');
            else setMode(b, b.last === 'spin' ? 'juggle' : 'spin');
            b.last = b.mode;
            if (b.mode === 'bounce') {
              const a = Math.PI * 0.25 + Math.random() * 0.5;
              b.vx = Math.cos(a) * 300 * (Math.random() < 0.5 ? -1 : 1);
              b.vy = Math.sin(a) * 300;
            }
          }
        } else if (b.mode === 'juggle') {
          const n = P === 1 ? 3 : 4;
          if (b.mt > 0.5 + b.sub * 0.45 && b.sub < n) {
            b.sub++;
            const a = toPl(b, room, 170);
            const curve = (b.sub % 2 ? 1 : -1) * 1.1;
            G.shoot(room, b.x + (b.sub % 2 ? 40 : -40), b.y - 170, a - curve * 0.35, 280, { kind: 'pin', r: 12, curve, pink: b.sub === n });
            A.sfx('bop');
          }
          if (b.mt > 0.5 + n * 0.45 + 0.8) setMode(b, 'idle');
        } else if (b.mode === 'balloons') {
          if (b.sub === 0 && b.mt > 0.3) {
            b.sub = 1;
            room.spawnAdd('balloon', b.x - 120, b.y - 20);
            room.spawnAdd('balloon', b.x + 120, b.y - 20);
            A.sfx('whistle');
          }
          if (b.mt > 1.5) setMode(b, 'idle');
        } else if (b.mode === 'bounce') {
          const bd = room.world.bounds;
          b.x += b.vx * dt;
          b.y += b.vy * dt;
          if (b.x < bd.x0 + 70 || b.x > bd.x1 - 70) {
            b.vx *= -1;
            A.sfx('bop');
            F.shake = 5;
          }
          if (b.y < bd.y0 + 140 || b.y > bd.y1 - 10) {
            b.vy *= -1;
            A.sfx('bop');
            F.shake = 5;
          }
          b.x = G.clamp(b.x, bd.x0 + 70, bd.x1 - 70);
          b.y = G.clamp(b.y, bd.y0 + 140, bd.y1 - 10);
          if (Math.floor(b.mt / 0.22) > b.sub) {
            b.sub++;
            G.shoot(room, b.x, b.y - 40, Math.random() * Math.PI * 2, 90, { kind: 'star', r: 7, color: [C.yellow, C.blue, C.pink][b.sub % 3], pink: b.sub % 3 === 2, life: 3 });
          }
          if (G.dist(b.x, b.y, room.pl.x, room.pl.y) < 70) room.pl.hurt(b);
          if (b.mt > 5) {
            // hop back home
            b.x = G.lerp(b.x, 480, 0.2);
            b.y = G.lerp(b.y, 300, 0.2);
            if (G.dist(b.x, b.y, 480, 300) < 10 || b.mt > 6) {
              b.x = 480;
              b.y = 300;
              setMode(b, 'idle');
            }
          }
        } else if (b.mode === 'spin') {
          const arms = 3;
          if (Math.floor(b.mt / 0.1) > b.sub) {
            b.sub++;
            for (let k = 0; k < arms; k++) G.shoot(room, b.x, b.y - 170, b.mt * 2.2 + (k / arms) * Math.PI * 2, 170, { kind: 'star', r: 8, color: C.yellow, pink: b.sub % 12 === 0 && k === 0 });
          }
          if (b.mt > 4) setMode(b, 'idle');
        }
      };
      b.draw = () => drawJangles(b, room);
      return b;
    },
  };
  function drawJangles(b, room) {
    const c = G.ctx;
    K.seed(4200);
    K.shadow(b.x, b.y, 80, 22);
    c.save();
    c.translate(b.x, b.y);
    if (b.flash > 0) c.scale(1.03, 0.97);
    // spring neck
    const h = 100 * b.pop;
    for (let i = 0; i < 7; i++) K.blob(Math.sin(b.t * 6 + i) * 6 * b.pop, -110 - (h * i) / 7, 18, 6, null, { lw: 4, stroke: '#8a8a90' });
    // head
    const hx = Math.sin(b.t * 3) * 14 * b.pop,
      hy = -120 - h;
    K.blob(hx, hy, 46, 42, '#f7efdc', { lw: 4, hl: true });
    // jester hat
    K.shape([[hx - 44, hy - 20], [hx - 80, hy - 70], [hx - 10, hy - 42]], C.red, { lw: 3.5, smooth: true });
    K.shape([[hx + 44, hy - 20], [hx + 80, hy - 70], [hx + 10, hy - 42]], C.blue, { lw: 3.5, smooth: true });
    K.shape([[hx - 20, hy - 36], [hx, hy - 90], [hx + 20, hy - 36]], C.yellow, { lw: 3.5, smooth: true });
    K.blob(hx - 80, hy - 72, 8, 8, C.gold, { lw: 2.5 });
    K.blob(hx + 80, hy - 72, 8, 8, C.gold, { lw: 2.5 });
    K.blob(hx, hy - 92, 8, 8, C.gold, { lw: 2.5 });
    K.pieEye(hx - 16, hy - 6, 10, 15, room.pl.x > b.x ? 0.5 : -0.5, 0.4, 0);
    K.pieEye(hx + 16, hy - 6, 10, 15, room.pl.x > b.x ? 0.5 : -0.5, 0.4, 0);
    K.blob(hx, hy + 10, 9, 8, C.red, { lw: 3, hl: true });
    K.shape([[hx - 26, hy + 18], [hx + 26, hy + 18], [hx + 14, hy + 34], [hx - 14, hy + 34]], C.darkred, { lw: 3, smooth: true });
    K.rrect(hx - 16, hy + 17, 32, 6, 2, C.white, { lw: 1.5 });
    // ruffle collar
    for (let i = 0; i < 7; i++) K.blob(hx - 36 + i * 12, hy + 42, 9, 7, i % 2 ? C.white : C.pink, { lw: 2.2 });
    // arms juggling
    if (b.pop > 0.6) {
      const jy = hy + 60;
      K.hose(hx - 20, jy - 10, hx - 70, jy - 40 + Math.sin(b.t * 10) * 10, 10, 6);
      K.hose(hx + 20, jy - 10, hx + 70, jy - 40 - Math.sin(b.t * 10) * 10, -10, 6);
      K.glove(hx - 70, jy - 40 + Math.sin(b.t * 10) * 10, 10, Math.PI * 1.2, 'open');
      K.glove(hx + 70, jy - 40 - Math.sin(b.t * 10) * 10, 10, -0.3, 'open');
    }
    // the box
    K.rrect(-70, -120, 140, 120, 6, '#7b4f8f', { lw: 4.5 });
    K.shape([[-70, -120], [-50, -138], [90, -138], [70, -120]], '#9a6aae', { lw: 4 });
    K.shape([[70, -120], [90, -138], [90, -18], [70, 0]], '#5e3a6e', { lw: 4 });
    K.star(-20, -62, 26, C.yellow, 5, 0.2);
    K.star(40, -40, 14, C.pink, 5, -0.2);
    // lid flapping open
    c.save();
    c.translate(-70, -120);
    c.rotate(-1.9 + Math.sin(b.t * 8) * 0.1);
    K.rrect(0, -6, 140, 14, 3, '#9a6aae', { lw: 3.5 });
    c.restore();
    // crank
    c.save();
    c.translate(90, -70);
    c.rotate(b.t * 5);
    K.line([[0, 0], [22, 0], [22, 14]], 5, '#8a8a90');
    K.blob(22, 16, 5, 5, C.red, { lw: 2 });
    c.restore();
    c.restore();
  }

  // =========================================================
  // 3. GRANDFATHER TOCK, the grandfather clock
  // =========================================================
  const tock = {
    name: 'GRANDFATHER TOCK',
    tag: 'The Keeper of Time',
    hp: 430,
    make(room) {
      const b = base(this.hp, 480, 285);
      b.hitTest = (x, y, r) => x > b.x - 60 - r && x < b.x + 60 + r && y > b.y - 210 - r && y < b.y + r;
      b.update = (dt) => {
        b.t += dt;
        b.mt += dt;
        b.flash = Math.max(0, b.flash - dt);
        phaseCheck(b);
        if (b.stun > 0) {
          b.stun -= dt;
          return;
        }
        const P = b.phase;
        if (b.mode === 'idle') {
          if (b.mt > 0.8) {
            const opts = P === 1 ? ['hours', 'pendulum'] : P === 2 ? ['hours', 'freeze', 'cuckoo'] : ['rollers', 'freeze', 'spiral'];
            let m = opts[Math.floor(Math.random() * opts.length)];
            if (m === b.last) m = opts[(opts.indexOf(m) + 1) % opts.length];
            setMode(b, m);
            b.last = m;
          }
        } else if (b.mode === 'hours') {
          // twelve gears fired from the twelve hour marks, in a sweep
          if (b.mt > 0.3 + b.sub * 0.12 && b.sub < 12) {
            const a = (b.sub / 12) * Math.PI * 2 - Math.PI / 2;
            G.shoot(room, b.x + Math.cos(a) * 44, b.y - 160 + Math.sin(a) * 44, a + Math.PI / 12, 190, { kind: 'gear', r: 11, pink: b.sub === 7 });
            b.sub++;
            A.sfx('bop');
          }
          if (b.mt > 2.4) setMode(b, 'idle');
        } else if (b.mode === 'pendulum') {
          if (b.sub === 0) {
            b.sub = 1;
            G.hz.pendulum(room, b.x, b.y - 60, 250, { life: 5 });
          }
          if (Math.floor(b.mt / 0.8) > b.sub) {
            b.sub++;
            G.shoot(room, b.x, b.y - 160, toPl(b, room, 160), 220, { kind: 'gear', r: 10, pink: b.sub % 3 === 0 });
          }
          if (b.mt > 5.2) setMode(b, 'idle');
        } else if (b.mode === 'freeze') {
          // "TIME OUT!": every bullet stops, then re-aims at Wick
          if (b.sub === 0) {
            for (let i = 0; i < 16; i++) G.shoot(room, b.x, b.y - 160, (i / 16) * Math.PI * 2, 230, { kind: 'gear', r: 10, pink: i % 8 === 3 });
            b.sub = 1;
          }
          if (b.sub === 1 && b.mt > 0.8) {
            b.sub = 2;
            A.sfx('bell');
            F.flash = 0.5;
            F.flashColor = '#d0e0ff';
            room.ebullets.forEach((e) => {
              e.frozen = 0.9;
              e.redirect = true;
            });
            F.popText(b.x, b.y - 260, 'TIME OUT!', C.sky, 28);
          }
          if (b.mt > 2.6) setMode(b, 'idle');
        } else if (b.mode === 'cuckoo') {
          if (b.sub === 0 && b.mt > 0.4) {
            b.sub = 1;
            A.sfx('whistle');
            room.spawnAdd('cuckoo', b.x - 60, b.y - 200);
            if (room.enemies.length < 4) room.spawnAdd('cuckoo', b.x + 60, b.y - 200);
          }
          if (b.mt > 1.6) setMode(b, 'idle');
        } else if (b.mode === 'rollers') {
          if (Math.floor(b.mt / 0.7) > b.sub && b.sub < 6) {
            b.sub++;
            const bd = room.world.bounds;
            const lane = bd.y0 + 60 + ((b.sub * 97) % (bd.y1 - bd.y0 - 90));
            const left = b.sub % 2;
            G.shoot(room, left ? bd.x0 : bd.x1, lane, left ? 0 : Math.PI, 260, { kind: 'gear', r: 22, pink: b.sub === 4 });
          }
          if (b.mt > 5) setMode(b, 'idle');
        } else if (b.mode === 'spiral') {
          if (Math.floor(b.mt / 0.09) > b.sub) {
            b.sub++;
            G.shoot(room, b.x, b.y - 160, b.mt * 3, 180, { kind: 'gear', r: 9, pink: b.sub % 14 === 0 });
            G.shoot(room, b.x, b.y - 160, b.mt * 3 + Math.PI, 180, { kind: 'gear', r: 9 });
          }
          if (b.mt > 3.6) setMode(b, 'idle');
        }
      };
      b.draw = () => drawTock(b, room);
      return b;
    },
  };
  function drawTock(b, room) {
    const c = G.ctx;
    K.seed(4300);
    K.shadow(b.x, b.y, 80, 20);
    c.save();
    c.translate(b.x, b.y);
    if (b.flash > 0) c.scale(1.03, 0.98);
    const sway = Math.sin(b.t * 2) * 0.03;
    c.rotate(sway);
    // feet
    K.hose(-30, -12, -44, -2, 4, 7);
    K.hose(30, -12, 44, -2, -4, 7);
    K.shoe(-48, -2, 15, -1);
    K.shoe(48, -2, 15, 1);
    // case
    K.rrect(-58, -220, 116, 210, 10, '#7a4a2e', { lw: 4.5 });
    K.shape([[-66, -220], [0, -262], [66, -220]], '#5b3a26', { lw: 4.5 });
    K.blob(0, -236, 10, 10, C.gold, { lw: 2.5 });
    // pendulum window
    K.rrect(-30, -100, 60, 80, 20, '#3a2a22', { lw: 3.5 });
    const pa = Math.sin(b.t * 4) * 0.5;
    K.line([[0, -96], [Math.sin(pa) * 50, -96 + Math.cos(pa) * 50]], 3, C.gold);
    K.blob(Math.sin(pa) * 50, -96 + Math.cos(pa) * 50, 11, 11, C.gold, { lw: 2.5 });
    // face
    K.blob(0, -160, 52, 52, '#fbf1d9', { lw: 4.5, hl: true });
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      K.line([[Math.cos(a) * 42, -160 + Math.sin(a) * 42], [Math.cos(a) * 48, -160 + Math.sin(a) * 48]], i % 3 ? 2 : 4);
    }
    const look = room.pl.x > b.x ? 0.5 : -0.5;
    K.pieEye(-16, -170, 10, 14, look, 0.3, 0);
    K.pieEye(16, -170, 10, 14, look, 0.3, 0);
    // hands as bushy brows
    const brow = b.phase === 3 ? 0.35 : 0.1;
    K.line([[-34, -196 + brow * 20], [-6, -188]], 5);
    K.line([[34, -196 + brow * 20], [6, -188]], 5);
    // moustache of clock hands
    K.shape([[0, -148], [-34, -140], [-40, -150], [0, -154], [40, -150], [34, -140]], '#c9c9c9', { lw: 3, smooth: true });
    if (b.mode === 'freeze' || b.mode === 'hours') K.blob(0, -132, 10, 7, C.darkred, { lw: 2.5 });
    else K.line([[-10, -132], [10, -132]], 3);
    // arms
    const sw = Math.sin(b.t * 4) * 10;
    K.hose(-56, -150, -96, -120 + sw, 8, 6);
    K.hose(56, -150, 96, -120 - sw, -8, 6);
    K.glove(-96, -120 + sw, 10, Math.PI, 'fist');
    K.glove(96, -120 - sw, 10, 0, 'point');
    c.restore();
  }

  // =========================================================
  // 4. MR. SPROCKET, the Projectionist
  // =========================================================
  const sprocket = {
    name: 'MR. SPROCKET',
    tag: 'The Projectionist',
    hp: 560,
    make(room) {
      const b = base(this.hp, 480, 250);
      b.hitTest = (x, y, r) => G.dist(x, y, b.x, b.y - 150) < 70 + r || G.dist(x, y, b.x, b.y - 60) < 50 + r;
      b.update = (dt) => {
        b.t += dt;
        b.mt += dt;
        b.flash = Math.max(0, b.flash - dt);
        phaseCheck(b, [0.66, 0.33]);
        if (b.stun > 0) {
          b.stun -= dt;
          return;
        }
        const P = b.phase;
        // stroll side to side like a showman
        const bd = room.world.bounds;
        if (b.mode !== 'beam') b.x = 480 + Math.sin(b.t * 0.6) * (P === 3 ? 260 : 160);
        b.x = G.clamp(b.x, bd.x0 + 80, bd.x1 - 80);
        if (b.mode === 'idle') {
          if (b.mt > (P === 3 ? 0.4 : 0.7)) {
            const opts = P === 1 ? ['beam', 'film'] : P === 2 ? ['rerunKettle', 'rerunJangles', 'rerunTock', 'beam'] : ['finale', 'beam', 'film'];
            let m = opts[Math.floor(Math.random() * opts.length)];
            if (m === b.last) m = opts[(opts.indexOf(m) + 1) % opts.length];
            setMode(b, m);
            b.last = m;
          }
        } else if (b.mode === 'beam') {
          if (b.sub === 0) {
            b.sub = 1;
            const a = toPl(b, room, 150);
            G.hz.beam(room, b.x + 20, b.y - 150, a - 0.5, { tele: 0.8, on: 1.4, rot: 0.7 });
            if (P >= 2) G.hz.beam(room, b.x + 20, b.y - 150, a + 0.9, { tele: 0.8, on: 1.4, rot: -0.7 });
          }
          if (b.mt > 2.6) setMode(b, 'idle');
        } else if (b.mode === 'film') {
          if (Math.floor(b.mt / 0.3) > b.sub && b.sub < 8) {
            b.sub++;
            const a = toPl(b, room, 150) + (b.sub % 2 ? 0.25 : -0.25);
            for (let i = -1; i <= 1; i++) G.shoot(room, b.x, b.y - 150, a + i * 0.3, 240, { kind: 'film', r: 10, pink: b.sub === 5 && i === 0 });
          }
          if (b.mt > 3) setMode(b, 'idle');
        } else if (b.mode === 'rerunKettle') {
          // a flicker of the kettle's croon
          if (Math.floor(b.mt / 0.15) > b.sub && b.mt < 2.4) {
            b.sub++;
            G.shoot(room, b.x, b.y - 150, toPl(b, room, 150), 210, { kind: 'note', r: 9, wave: { a: 50, f: 7 }, pink: b.sub % 5 === 0 });
          }
          if (b.mt > 2.8) setMode(b, 'idle');
        } else if (b.mode === 'rerunJangles') {
          if (b.mt > 0.3 + b.sub * 0.35 && b.sub < 5) {
            b.sub++;
            const curve = (b.sub % 2 ? 1 : -1) * 1.2;
            G.shoot(room, b.x, b.y - 150, toPl(b, room, 150) - curve * 0.35, 280, { kind: 'pin', r: 12, curve, pink: b.sub === 3 });
          }
          if (b.mt > 2.6) setMode(b, 'idle');
        } else if (b.mode === 'rerunTock') {
          if (b.sub === 0) {
            b.sub = 1;
            for (let i = 0; i < 18; i++) G.shoot(room, b.x, b.y - 150, (i / 18) * Math.PI * 2, 220, { kind: 'gear', r: 10, pink: i === 4 });
          }
          if (b.sub === 1 && b.mt > 0.75) {
            b.sub = 2;
            A.sfx('bell');
            room.ebullets.forEach((e) => {
              e.frozen = 0.7;
              e.redirect = true;
            });
          }
          if (b.mt > 2.3) setMode(b, 'idle');
        } else if (b.mode === 'finale') {
          if (Math.floor(b.mt / 0.08) > b.sub) {
            b.sub++;
            const a = b.mt * 2.6;
            G.shoot(room, b.x - 11, b.y - 196, a, 190, { kind: 'star', r: 8, color: C.yellow, pink: b.sub % 15 === 0 });
            G.shoot(room, b.x + 11, b.y - 196, -a + Math.PI, 190, { kind: 'film', r: 9 });
          }
          if (b.mt > 4) setMode(b, 'idle');
        }
      };
      b.draw = () => {
        const c = G.ctx;
        c.save();
        if (b.flash > 0) {
          c.translate(b.x, b.y);
          c.scale(1.03, 0.98);
          c.translate(-b.x, -b.y);
        }
        G.chars.toon(b.x, b.y, Object.assign({}, G.chars.cast.sprocket, { noMouth: false }), {
          scale: 1.9,
          fx: room.pl.x > b.x ? 1 : -1,
          talk: b.mode === 'rerunKettle',
          mood: b.phase === 3 ? 'angry' : null,
          moving: true,
          phase: b.t * 4,
          seed: 24,
        });
        if (b.mode === 'beam' || b.mode === 'film') K.wash(b.x + 22, b.y - 145, 40, 40, 'rgba(255,245,200,0.9)');
        c.restore();
      };
      return b;
    },
  };

  G.BOSSES = [kettle, jangles, tock, sprocket];
})();
