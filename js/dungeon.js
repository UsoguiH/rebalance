// The Lost Reels: procedurally generated three-floor dungeons that end in a boss,
// with loot, a minimap, the Stage Hook escape, the "CUT!" death card and results.
(function () {
  const K = G.ink,
    C = K.C,
    I = G.input,
    A = G.audio,
    U = G.ui,
    CH = G.chars,
    F = G.fx,
    IT = G.items;
  G.scenes = G.scenes || {};

  const B = { x0: 70, y0: 118, x1: 890, y1: 500 };
  const MID = { x: (B.x0 + B.x1) / 2, y: (B.y0 + B.y1) / 2 };
  const DIRS = { n: [0, -1], s: [0, 1], w: [-1, 0], e: [1, 0] };
  const OPP = { n: 's', s: 'n', w: 'e', e: 'w' };
  const DOORPOS = { n: [MID.x, B.y0], s: [MID.x, B.y1], w: [B.x0, MID.y], e: [B.x1, MID.y] };

  const THEMES = [
    { floorA: '#efe0bd', floorB: '#c9564a', wall: '#8a5a3b', wall2: '#6b4128', trim: C.cream, prop: 'sack' },
    { floorA: '#e0c08a', floorB: '#d9a866', wall: '#c9392f', wall2: '#f4e6c6', trim: C.gold, prop: 'drum' },
    { floorA: '#b8a06a', floorB: '#9c8452', wall: '#4a3a4a', wall2: '#3a2c3a', trim: C.gold, prop: 'gears' },
    { floorA: '#4b3a5a', floorB: '#3b2c48', wall: '#7d1a17', wall2: '#5a1210', trim: C.gold, prop: 'can' },
  ];

  // ---------- floor generation ----------
  function genFloor(reel, depth, seed) {
    const r = G.rng(seed);
    const rooms = {};
    const key = (x, y) => x + ',' + y;
    const want = 7 + depth * 2 + reel;
    let x = 0,
      y = 0;
    rooms[key(0, 0)] = { gx: 0, gy: 0 };
    let guard = 0;
    while (Object.keys(rooms).length < want && guard++ < 500) {
      const d = r.pick(['n', 's', 'e', 'w']);
      const nx = x + DIRS[d][0],
        ny = y + DIRS[d][1];
      if (Math.abs(nx) > 3 || Math.abs(ny) > 2) {
        x = 0;
        y = 0;
        continue;
      }
      x = nx;
      y = ny;
      if (!rooms[key(x, y)]) rooms[key(x, y)] = { gx: x, gy: y };
      if (r() < 0.15) {
        const ks = Object.keys(rooms);
        const pick = rooms[r.pick(ks)];
        x = pick.gx;
        y = pick.gy;
      }
    }
    const list = Object.values(rooms);
    list.forEach((rm) => {
      rm.doors = {};
      Object.keys(DIRS).forEach((d) => {
        if (rooms[key(rm.gx + DIRS[d][0], rm.gy + DIRS[d][1])]) rm.doors[d] = true;
      });
      rm.type = 'fight';
      rm.cleared = false;
      rm.visited = false;
      rm.seed = Math.floor(r() * 1e6);
    });
    // BFS distances
    const dist = {};
    const q = [rooms[key(0, 0)]];
    dist[key(0, 0)] = 0;
    while (q.length) {
      const c = q.shift();
      Object.keys(c.doors).forEach((d) => {
        const k2 = key(c.gx + DIRS[d][0], c.gy + DIRS[d][1]);
        if (dist[k2] == null) {
          dist[k2] = dist[key(c.gx, c.gy)] + 1;
          q.push(rooms[k2]);
        }
      });
    }
    const start = rooms[key(0, 0)];
    start.type = 'start';
    start.cleared = true;
    const sorted = list.slice().sort((a, b) => dist[key(b.gx, b.gy)] - dist[key(a.gx, a.gy)]);
    const exit = sorted[0];
    exit.type = depth === 2 ? 'bossdoor' : 'exit';
    const deadEnds = list.filter((rm) => rm.type === 'fight' && Object.keys(rm.doors).length === 1);
    const others = list.filter((rm) => rm.type === 'fight');
    const tr = deadEnds[0] || others[others.length - 1];
    if (tr) {
      tr.type = 'treasure';
      tr.cleared = true;
    }
    if (depth >= 1) {
      const pl = list.filter((rm) => rm.type === 'fight');
      const pool = pl[Math.floor(r() * pl.length)];
      if (pool && pl.length > 2) {
        pool.type = 'pool';
        pool.cleared = true;
      }
    }
    return { rooms, key, start, reel, depth };
  }

  // weighted loot pick (cheap stuff common, treasures rarer; deeper = richer)
  function rollLoot(reel, depth, rich = 0) {
    const ids = IT.byReel(reel);
    const w = ids.map((id) => {
      const b = IT.db[id].base;
      return Math.pow(60 / b, 0.9 - rich * 0.5 - depth * 0.12);
    });
    let t = w.reduce((a, b) => a + b, 0) * Math.random();
    for (let i = 0; i < ids.length; i++) {
      t -= w[i];
      if (t <= 0) return ids[i];
    }
    return ids[0];
  }

  function paintRoomBg(reel) {
    const th = THEMES[reel];
    return G.paintTo((c) => {
      c.fillStyle = th.wall2;
      c.fillRect(0, 0, G.W, G.H);
      // floor
      const tile = 41;
      for (let y = B.y0 - 10; y < B.y1 + 10; y += tile)
        for (let x = B.x0 - 10; x < B.x1 + 10; x += tile) {
          const odd = (Math.floor((x - B.x0) / tile) + Math.floor((y - B.y0) / tile)) % 2;
          c.fillStyle = odd ? th.floorB : th.floorA;
          if (reel === 1) c.fillStyle = odd ? '#dcb77c' : '#e4c38c';
          if (reel === 2) c.fillStyle = odd ? '#a88f5c' : '#b79d68';
          c.fillRect(x, y, tile, tile);
        }
      if (reel === 1) {
        // circus ring
        K.seed(800);
        K.blob(MID.x, MID.y + 10, 330, 150, null, { lw: 10, stroke: C.red });
        K.blob(MID.x, MID.y + 10, 330, 150, null, { lw: 3 });
      }
      if (reel === 2) {
        const r = G.rng(3);
        for (let i = 0; i < 10; i++) {
          const x = B.x0 + r() * (B.x1 - B.x0),
            y = B.y0 + r() * (B.y1 - B.y0);
          c.strokeStyle = 'rgba(40,25,10,0.3)';
          c.lineWidth = 3;
          c.beginPath();
          c.arc(x, y, 20 + r() * 20, 0, Math.PI * 2);
          c.stroke();
        }
      }
      if (reel === 3) {
        const r = G.rng(5);
        c.fillStyle = 'rgba(255,220,150,0.08)';
        for (let i = 0; i < 40; i++) {
          c.beginPath();
          c.arc(B.x0 + r() * 820, B.y0 + r() * 380, 3, 0, Math.PI * 2);
          c.fill();
        }
      }
      // floor shading
      const g = c.createRadialGradient(MID.x, MID.y, 100, MID.x, MID.y, 520);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(30,15,5,0.4)');
      c.fillStyle = g;
      c.fillRect(B.x0, B.y0, B.x1 - B.x0, B.y1 - B.y0);
      // back wall
      c.fillStyle = th.wall;
      c.fillRect(0, 0, G.W, B.y0);
      K.seed(810);
      if (reel === 0) {
        for (let i = 0; i < 6; i++) {
          K.rrect(40 + i * 150, 20, 120, 70, 6, '#a06a44', { lw: 3 });
          K.line([[100 + i * 150, 20], [100 + i * 150, 90]], 2);
          K.blob(90 + i * 150, 60, 4, 4, C.gold, { lw: 1.5 });
          K.blob(110 + i * 150, 60, 4, 4, C.gold, { lw: 1.5 });
        }
      } else if (reel === 1) {
        for (let i = 0; i < 24; i++) {
          c.fillStyle = i % 2 ? C.cream : C.red;
          c.fillRect(i * 40, 0, 40, B.y0);
        }
        for (let i = 0; i < 12; i++) K.blob(40 + i * 80, 20, 8, 8, '#fff3b0', { lw: 2 });
      } else if (reel === 2) {
        for (let i = 0; i < 5; i++) {
          const x = 100 + i * 190;
          const p = [];
          for (let k = 0; k < 20; k++) {
            const a = (k / 20) * Math.PI * 2;
            const rr = k % 2 ? 34 : 42;
            p.push([x + Math.cos(a) * rr, 60 + Math.sin(a) * rr]);
          }
          K.shape(p, '#8a6a2a', { lw: 3 });
          K.blob(x, 60, 12, 12, th.wall, { lw: 2.5 });
        }
      } else {
        for (let i = 0; i < 12; i++) {
          c.fillStyle = i % 2 ? '#9b221d' : '#7d1a17';
          c.fillRect(i * 80, 0, 80, B.y0);
        }
        K.filmStrip(0, 30, G.W, 44);
        for (let i = 0; i < 12; i++) {
          c.fillStyle = 'rgba(240,230,200,0.25)';
          c.fillRect(20 + i * 80, 40, 60, 24);
        }
      }
      K.line([[0, B.y0], [G.W, B.y0]], 5);
      // side & bottom walls (thick ink frame)
      c.fillStyle = th.wall2;
      c.fillRect(0, B.y0, B.x0, G.H);
      c.fillRect(B.x1, B.y0, G.W - B.x1, G.H);
      c.fillRect(0, B.y1, G.W, G.H - B.y1);
      K.line([[B.x0, B.y0], [B.x0, B.y1], [B.x1, B.y1], [B.x1, B.y0]], 5);
      K.rrect(B.x0 - 12, B.y0 - 6, B.x1 - B.x0 + 24, B.y1 - B.y0 + 18, 10, null, { lw: 3, stroke: th.trim });
    });
  }

  // ---------- the scene ----------
  G.scenes.dungeon = (reel) => {
    const s = G.state;
    const S = {
      reel,
      depth: 0,
      t: 0,
      state: 'play',
      loot: [],
      gainedGold: 0,
      pbullets: [],
      ebullets: [],
      enemies: [],
      hazards: [],
      props: [],
      boss: null,
      inited: false,
      enter() {
        if (this.inited) return;
        this.inited = true;
        this.bg = paintRoomBg(reel);
        this.pl = new G.Player(MID.x, MID.y + 60, true);
        this.buildFloor(0);
        A.play('dungeon');
        if (!s.seen.controls) {
          s.seen.controls = true;
          U.say([
            { who: 'wick', text: "Whoa, I'm inside the picture! Okay, Wick, remember what Granny said..." },
            { who: 'wick', text: 'J or LEFT CLICK fires my Flicker Finger. The mouse aims, or I shoot where I face. SPACE does a dodge roll!' },
            { who: 'wick', text: 'Anything PINK can be PARRIED: roll right into it! Parries and hits fill my cards, and L or RIGHT CLICK spends a full card on an EX blast.' },
            { who: 'wick', text: 'Q drinks a tonic. And if things get hairy, R calls the Stage Hook to yank me home with my loot, for a small fee.' },
          ]);
        }
      },
      buildFloor(depth) {
        this.depth = depth;
        this.floor = genFloor(reel, depth, (Math.random() * 1e9) | 0);
        this.room = null;
        this.enterRoom(this.floor.start, null);
        this.pl.x = MID.x;
        this.pl.y = MID.y + 40;
        this.banner = { t: 0, text: 'REEL ' + (reel + 1) + ' · FLOOR ' + (depth + 1), sub: G.REELS[reel].name };
      },
      enterRoom(rm, fromDir) {
        this.room = rm;
        rm.visited = true;
        this.pbullets = [];
        this.ebullets = [];
        this.enemies = [];
        this.hazards = [];
        this.loot = rm.loot || (rm.loot = []);
        const r = G.rng(rm.seed);
        // props: obstacles (some breakable)
        if (!rm.props) {
          rm.props = [];
          const n = rm.type === 'fight' || rm.type === 'exit' ? r.int(1, 4) : rm.type === 'start' ? 1 : 0;
          for (let i = 0; i < n; i++) {
            for (let k = 0; k < 12; k++) {
              const px = r.range(B.x0 + 80, B.x1 - 80),
                py = r.range(B.y0 + 60, B.y1 - 50);
              if (Math.abs(px - MID.x) < 90 || Math.abs(py - MID.y) < 60) continue;
              if (rm.props.some((p) => G.dist(p.x, p.y, px, py) < 80)) continue;
              rm.props.push({ x: px, y: py, r: 22, hp: r() < 0.5 ? 4 : 999, seed: r() * 99, dead: false });
              break;
            }
          }
        }
        this.props = rm.props;
        this.world = { bounds: B, solids: this.props };
        if (!rm.cleared && (rm.type === 'fight' || rm.type === 'exit' || rm.type === 'bossdoor')) {
          const list = G.REEL_ENEMIES[reel];
          const n = 2 + this.depth + Math.floor(reel / 2) + (r() < 0.5 ? 1 : 0);
          const mult = 1 + this.depth * 0.3;
          for (let i = 0; i < n; i++) {
            let ex, ey;
            for (let k = 0; k < 20; k++) {
              ex = r.range(B.x0 + 60, B.x1 - 60);
              ey = r.range(B.y0 + 50, B.y1 - 40);
              const dx = fromDir ? DOORPOS[fromDir][0] : MID.x,
                dy = fromDir ? DOORPOS[fromDir][1] : MID.y;
              if (G.dist(ex, ey, dx, dy) > 220 && !this.props.some((p) => G.dist(p.x, p.y, ex, ey) < 50)) break;
            }
            const e = G.spawnEnemy(r.pick(list), ex, ey, mult);
            e.spawnT = 0.6 + i * 0.12;
            this.enemies.push(e);
          }
          this.locked = true;
          A.sfx('door');
        } else this.locked = false;
        if (rm.type === 'treasure' && !rm.opened) rm.chest = { x: MID.x, y: MID.y };
        if (rm.type === 'pool') rm.fountain = rm.fountain || { x: MID.x, y: MID.y, used: false };
        if (fromDir) {
          const [dx, dy] = DOORPOS[fromDir];
          this.pl.x = dx + (fromDir === 'w' ? 40 : fromDir === 'e' ? -40 : 0);
          this.pl.y = dy + (fromDir === 'n' ? 44 : fromDir === 's' ? -24 : 20);
        }
      },
      spawnAdd(type, x, y) {
        const e = G.spawnEnemy(type, x, y, 1);
        this.enemies.push(e);
      },
      dropLoot(x, y, goldRange, forceItem) {
        const g = G.R.int(goldRange[0], goldRange[1]);
        for (let i = 0; i < Math.min(3, g); i++) this.loot.push({ gold: Math.ceil((g * (1 + this.depth * 0.5)) / Math.min(3, g)) + reel * 2, x, y, vx: (Math.random() - 0.5) * 160, vy: (Math.random() - 0.5) * 120, z: 0, vz: 220, t: 0 });
        if (forceItem || Math.random() < 0.32 + this.depth * 0.04) this.loot.push({ id: forceItem || rollLoot(reel, this.depth), x, y, vx: (Math.random() - 0.5) * 120, vy: (Math.random() - 0.5) * 100, z: 0, vz: 260, t: 0 });
      },

      update(dt) {
        this.t += dt;
        if (this.banner) {
          this.banner.t += dt;
          if (this.banner.t > 2.6) this.banner = null;
        }
        if (this.slide) {
          this.slide.t += dt / 0.28;
          if (this.slide.t >= 1) this.slide = null;
          return;
        }
        const pl = this.pl;
        if (this.state === 'hook') return this.updHook(dt);
        if (this.state === 'dead' || this.state === 'cut') return this.updDead(dt);
        if (this.state === 'intro') return this.updIntro(dt);
        if (this.state === 'wrap' || this.state === 'results') return this.updWrap(dt);

        pl.update(dt, this);
        if (pl.dead) {
          this.state = 'dead';
          this.st = 0;
          return;
        }
        // enemies
        this.enemies.forEach((e) => G.updateEnemy(e, dt, this));
        if (this.boss) this.boss.update(dt);
        // hazards
        this.hazards = this.hazards.filter((h) => {
          const alive = h.update(dt);
          if (alive && h.hurts(pl)) pl.hurt(h.x != null ? h : { x: pl.x, y: pl.y - 10 });
          return alive;
        });
        this.updBullets(dt);
        this.enemies = this.enemies.filter((e) => !e.dead);
        // room cleared?
        if (this.locked && !this.boss && this.enemies.length === 0) {
          this.locked = false;
          this.room.cleared = true;
          A.sfx('chest');
          U.toastMsg('ROOM CLEAR!', C.gold);
          F.flash = 0.25;
          F.flashColor = C.cream;
        }
        if (this.boss && this.boss.hp <= 0 && this.state === 'play') this.startWrap();
        this.updLoot(dt);
        this.checkExits();
        this.near = null;
        const rm = this.room;
        if (rm.chest && !rm.opened && G.dist(pl.x, pl.y, rm.chest.x, rm.chest.y + 20) < 60) this.near = { label: 'OPEN', x: rm.chest.x, y: rm.chest.y - 40, act: () => this.openChest() };
        if (rm.fountain && !rm.fountain.used && G.dist(pl.x, pl.y, rm.fountain.x, rm.fountain.y + 30) < 70) this.near = { label: 'DRINK', x: rm.fountain.x, y: rm.fountain.y - 50, act: () => this.drinkFountain() };
        if ((rm.type === 'exit' || rm.type === 'bossdoor') && !this.locked && G.dist(pl.x, pl.y, MID.x, B.y0 + 60) < 64)
          this.near = { label: rm.type === 'exit' ? 'NEXT FLOOR' : 'BOSS STAGE', x: MID.x, y: B.y0 + 30, act: () => this.descend() };
        if (this.near && I.hit('interact')) this.near.act();
        if (I.hit('hook')) this.useHook();
        if (I.hit('bag')) U.openBag(false);
        if (I.hit('pause')) U.openPause(() => G.go(() => G.scenes.title()));
      },

      updBullets(dt) {
        const pl = this.pl;
        const targets = this.enemies.filter((e) => e.spawnT <= 0);
        this.pbullets = this.pbullets.filter((b) => {
          b.life -= dt;
          if (b.homing) {
            let best = null,
              bd = 1e9;
            targets.forEach((e) => {
              const d = G.dist(b.x, b.y, e.x, e.y - 20);
              if (d < bd) {
                bd = d;
                best = { x: e.x, y: e.y - 20 };
              }
            });
            if (this.boss && this.state === 'play') best = best || { x: this.boss.x, y: this.boss.y - 100 };
            if (best) {
              const want = Math.atan2(best.y - b.y, best.x - b.x);
              const cur = Math.atan2(b.vy, b.vx);
              let d = ((want - cur + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
              const na = cur + G.clamp(d, -b.homing * dt, b.homing * dt);
              const sp = Math.hypot(b.vx, b.vy);
              b.vx = Math.cos(na) * sp;
              b.vy = Math.sin(na) * sp;
            }
          }
          b.x += b.vx * dt;
          b.y += b.vy * dt;
          if (b.life <= 0 || b.x < B.x0 - 20 || b.x > B.x1 + 20 || b.y < B.y0 - 70 || b.y > B.y1 + 10) return false;
          for (const p of this.props) {
            if (!p.dead && G.dist(b.x, b.y, p.x, p.y - 16) < p.r + b.r) {
              F.hitStar(b.x, b.y);
              if (p.hp < 999) {
                p.hp -= b.dmg;
                if (p.hp <= 0) {
                  p.dead = true;
                  A.sfx('enemyDie');
                  F.poof(p.x, p.y - 16, 8, C.tan, 80);
                  this.dropLoot(p.x, p.y, [1, 3], Math.random() < 0.25 ? rollLoot(reel, this.depth) : null);
                }
              }
              if (!b.pierce) return false;
            }
          }
          for (const e of targets) {
            if (e.dead || (b.hitSet && b.hitSet.has(e))) continue;
            if (G.dist(b.x, b.y, e.x, e.y - 20 - e.z) < e.r + b.r + 6) {
              e.hp -= b.dmg;
              e.flash = 0.08;
              pl.addMeter(b.dmg * 0.02);
              F.hitStar(b.x, b.y, C.yellow);
              A.sfx('hit');
              if (e.hp <= 0) G.killEnemy(e, this);
              if (!b.pierce) return false;
              b.hitSet.add(e);
            }
          }
          const bo = this.boss;
          if (bo && this.state === 'play' && !(b.hitSet && b.hitSet.has(bo)) && bo.hitTest(b.x, b.y, b.r)) {
            bo.hp -= b.dmg;
            bo.flash = 0.06;
            pl.addMeter(b.dmg * 0.011);
            F.hitStar(b.x, b.y, C.yellow);
            if (Math.random() < 0.4) A.sfx('hit');
            if (!b.pierce) return false;
            b.hitSet.add(bo);
          }
          return true;
        });
        this.ebullets = this.ebullets.filter((b) => {
          b.t = (b.t || 0) + dt;
          b.life -= dt;
          if (b.frozen > 0) {
            b.frozen -= dt;
            if (b.frozen <= 0 && b.redirect) {
              const a = Math.atan2(pl.y - 30 - b.y, pl.x - b.x) + (Math.random() - 0.5) * 0.3;
              const sp = Math.max(160, Math.hypot(b.vx, b.vy));
              b.vx = Math.cos(a) * sp;
              b.vy = Math.sin(a) * sp;
              b.redirect = false;
              if (b.wave) {
                b.bx = b.x;
                b.by = b.y;
                b.t = 0;
              }
            }
          } else {
            if (b.curve) {
              const a = Math.atan2(b.vy, b.vx) + b.curve * dt;
              const sp = Math.hypot(b.vx, b.vy);
              b.vx = Math.cos(a) * sp;
              b.vy = Math.sin(a) * sp;
            }
            if (b.wave) {
              if (b.bx == null) {
                b.bx = b.x;
                b.by = b.y;
              }
              b.bx += b.vx * dt;
              b.by += b.vy * dt;
              const l = Math.hypot(b.vx, b.vy) || 1;
              const w = Math.sin(b.t * b.wave.f) * b.wave.a;
              b.x = b.bx + (-b.vy / l) * w;
              b.y = b.by + (b.vx / l) * w;
            } else {
              b.x += b.vx * dt;
              b.y += b.vy * dt;
            }
          }
          if (b.life <= 0 || b.x < B.x0 - 40 || b.x > B.x1 + 40 || b.y < B.y0 - 90 || b.y > B.y1 + 30) return false;
          for (const p of this.props) if (!p.dead && G.dist(b.x, b.y, p.x, p.y - 16) < p.r + b.r * 0.6) return false;
          const d = G.dist(b.x, b.y, pl.x, pl.y - 30);
          if (b.pink && pl.roll && d < b.r + pl.r + 22) {
            if (pl.tryParry(b)) return false;
          }
          if (d < b.r + 11) {
            if (pl.hurt(b)) return false;
          }
          return true;
        });
      },

      updLoot(dt) {
        const pl = this.pl;
        this.loot = this.room.loot = this.loot.filter((l) => {
          l.t += dt;
          if (l.vz || l.z > 0) {
            l.x += l.vx * dt;
            l.y += l.vy * dt;
            l.z += l.vz * dt;
            l.vz -= 900 * dt;
            if (l.z <= 0) {
              l.z = 0;
              l.vz = Math.abs(l.vz) > 80 ? -l.vz * 0.4 : 0;
              l.vx *= 0.5;
              l.vy *= 0.5;
            }
            l.x = G.clamp(l.x, B.x0 + 20, B.x1 - 20);
            l.y = G.clamp(l.y, B.y0 + 20, B.y1 - 10);
          }
          if (l.t < 0.4) return true;
          const d = G.dist(pl.x, pl.y - 10, l.x, l.y);
          if (l.gold) {
            if (d < 90) {
              l.x += ((pl.x - l.x) / d) * 400 * dt;
              l.y += ((pl.y - 10 - l.y) / d) * 400 * dt;
            }
            if (d < 20) {
              s.gold += l.gold;
              this.gainedGold += l.gold;
              A.sfx('coin');
              return false;
            }
            return true;
          }
          if (d < 30) {
            if (IT.fits(s.bag, l.id)) {
              IT.add(s.bag, l.id, 1);
              A.sfx('pickup');
              F.popText(l.x, l.y - 30, IT.db[l.id].name, C.cream, 16);
              return false;
            } else if (!this.fullWarn || G.t - this.fullWarn > 3) {
              this.fullWarn = G.t;
              U.toastMsg('BAG FULL! (I to manage, Z to drop)', C.red);
            }
          }
          return true;
        });
      },

      checkExits() {
        if (this.locked || this.boss) return;
        const pl = this.pl;
        const doors = this.room.doors;
        const pushing = I.axis();
        let go = null;
        if (doors.n && Math.abs(pl.x - MID.x) < 46 && pl.y <= B.y0 + pl.r + 1 && pushing.y < 0) go = 'n';
        if (doors.s && Math.abs(pl.x - MID.x) < 46 && pl.y >= B.y1 - pl.r - 1 && pushing.y > 0) go = 's';
        if (doors.w && Math.abs(pl.y - MID.y) < 46 && pl.x <= B.x0 + pl.r + 1 && pushing.x < 0) go = 'w';
        if (doors.e && Math.abs(pl.y - MID.y) < 46 && pl.x >= B.x1 - pl.r - 1 && pushing.x > 0) go = 'e';
        if (!go) return;
        const f = this.floor;
        const nr = f.rooms[f.key(this.room.gx + DIRS[go][0], this.room.gy + DIRS[go][1])];
        if (!nr) return;
        // film-advance slide between rooms
        this.slide = { t: 0, dir: go, snap: this.snapshot() };
        this.enterRoom(nr, OPP[go]);
      },
      snapshot() {
        const cv = document.createElement('canvas');
        cv.width = G.canvas.width;
        cv.height = G.canvas.height;
        cv.getContext('2d').drawImage(G.canvas, 0, 0);
        return cv;
      },

      openChest() {
        const rm = this.room;
        rm.opened = true;
        A.sfx('chest');
        F.spark(rm.chest.x, rm.chest.y - 20, C.gold, 10);
        const n = 2 + Math.floor(Math.random() * 2) + (this.depth > 1 ? 1 : 0);
        for (let i = 0; i < n; i++) this.loot.push({ id: rollLoot(reel, this.depth, 0.8), x: rm.chest.x, y: rm.chest.y + 10, vx: (Math.random() - 0.5) * 260, vy: 40 + Math.random() * 120, z: 10, vz: 300, t: 0 });
        this.loot.push({ gold: 20 + this.depth * 15 + reel * 10, x: rm.chest.x, y: rm.chest.y + 10, vx: 0, vy: 80, z: 10, vz: 260, t: 0 });
      },
      drinkFountain() {
        const f = this.room.fountain;
        f.used = true;
        this.pl.hp = this.pl.maxHp;
        A.sfx('heal');
        F.spark(this.pl.x, this.pl.y - 40, C.pink, 12);
        F.popText(this.pl.x, this.pl.y - 90, 'FULL HP!', C.pink, 24);
      },
      descend() {
        A.sfx('door');
        if (this.room.type === 'exit') {
          G.go(() => {
            this.buildFloor(this.depth + 1);
            return this;
          });
        } else {
          G.go(() => {
            this.startBoss();
            return this;
          }, { dur: 0.7 });
        }
      },

      // ---------- boss ----------
      startBoss() {
        this.room = { gx: 99, gy: 99, doors: {}, type: 'arena', cleared: false, loot: [], props: [] };
        this.props = [];
        this.world = { bounds: B, solids: [] };
        this.loot = this.room.loot;
        this.enemies = [];
        this.ebullets = [];
        this.pbullets = [];
        this.hazards = [];
        this.locked = true;
        this.boss = G.BOSSES[reel].make(this);
        this.pl.x = MID.x;
        this.pl.y = B.y1 - 50;
        this.pl.fy = -1;
        this.pl.fx = 0;
        this.pl.frozen = true;
        this.state = 'intro';
        this.st = 0;
        this.bossTime = 0;
        this.banner = null;
        A.play(reel === 3 ? 'final' : 'boss');
      },
      updIntro(dt) {
        this.st += dt;
        const beats = [1.6, 2.3, 3.0, 3.9];
        [1.6, 2.3, 3.0].forEach((b) => {
          if (this.st - dt < b && this.st >= b) A.sfx('announce');
        });
        if (this.st >= beats[3]) {
          this.state = 'play';
          this.pl.frozen = false;
        }
        this.pl.update(dt, this);
      },
      startWrap() {
        this.state = 'wrap';
        this.st = 0;
        this.ebullets = [];
        this.hazards = [];
        this.enemies.forEach((e) => G.killEnemy(e, this));
        this.enemies = [];
        this.pl.frozen = true;
        F.hitStop = 0.4;
        F.flash = 1;
        F.flashColor = C.white;
        A.stop();
        A.sfx('boom');
      },
      updWrap(dt) {
        this.st += dt;
        const bo = this.boss;
        if (this.state === 'wrap') {
          if (this.st < 2.2 && Math.random() < 0.3) {
            F.poof(bo.x + (Math.random() - 0.5) * 160, bo.y - 40 - Math.random() * 160, 5, C.cream, 100);
            F.hitStar(bo.x + (Math.random() - 0.5) * 140, bo.y - Math.random() * 180, C.yellow);
            if (Math.random() < 0.3) A.sfx('enemyDie');
          }
          if (this.st > 1 && !this.wrapSfx) {
            this.wrapSfx = true;
            A.play('victory');
          }
          if (this.st > 3.4) {
            this.state = 'results';
            this.st = 0;
            this.results = this.grade();
          }
        } else if (this.st > 1 && (I.hit('confirm') || I.mouse.pressed)) this.finishBoss();
      },
      grade() {
        const pl = this.pl;
        const time = this.bossTime;
        let pts = 0;
        pts += time < 100 ? 2 : time < 170 ? 1 : 0;
        pts += Math.min(3, pl.hp);
        pts += Math.min(3, pl.parries);
        pts += Math.min(2, pl.exUsed);
        const grades = ['D', 'C', 'C+', 'B-', 'B', 'B+', 'A-', 'A', 'A', 'A+', 'S'];
        return { time, hp: pl.hp, parries: pl.parries, ex: pl.exUsed, grade: grades[Math.min(10, pts)], pts };
      },
      finishBoss() {
        const first = !s.cleared[reel];
        s.cleared[reel] = true;
        const keys = ['Golden Whistle', "Jester's Key", 'Pendulum Weight', 'Projector Bulb'];
        if (!s.keys.includes(keys[reel])) s.keys.push(keys[reel]);
        // rewards: top-tier loot straight to the bag (overflow into the chest)
        const ids = IT.byReel(reel);
        const rewards = [ids[ids.length - 1], ids[ids.length - 2], rollLoot(reel, 2, 1), rollLoot(reel, 2, 1)];
        rewards.forEach((id) => {
          const left = IT.add(s.bag, id, 1);
          if (left) IT.add(s.chest, id, 1, 30);
        });
        s.gold += 150 * (reel + 1);
        s.phase = 'night';
        G.save();
        const home = () => G.go(() => G.scenes.town('pictures'));
        const cs = ['boss1', 'boss2', 'boss3', 'ending'][reel];
        if (first) G.go(() => G.scenes.cutscene(cs, reel === 3 ? () => G.go(() => G.scenes.credits()) : home));
        else home();
      },

      // ---------- escape & death ----------
      useHook() {
        if (this.boss) return U.toastMsg("The Stage Hook can't reach the boss stage!", C.red);
        const cost = Math.max(10, Math.round(s.gold * 0.1));
        U.confirm('Use the Stage Hook? Get yanked home with all your loot for ' + cost + ' gold.', () => {
          s.gold = Math.max(0, s.gold - cost);
          this.state = 'hook';
          this.st = 0;
          this.pl.frozen = true;
          A.sfx('hook');
        });
      },
      updHook(dt) {
        this.st += dt;
        if (this.st > 1.6 && !this.leaving) {
          this.leaving = true;
          s.phase = 'night';
          G.save();
          G.go(() => G.scenes.town('pictures'));
        }
      },
      updDead(dt) {
        this.st += dt;
        if (this.state === 'dead' && this.st > 1.8) {
          this.state = 'cut';
          this.st = 0;
          // lose everything outside the safe pocket (top row)
          const lost = s.bag.slice(4);
          this.lostCount = lost.reduce((a, it) => a + it.n, 0);
          s.bag = s.bag.slice(0, 4);
          s.stats.deaths++;
          s.phase = 'night';
          G.save();
          A.play('story');
        }
        if (this.state === 'cut' && this.st > 1 && (I.hit('confirm') || I.mouse.pressed)) {
          G.go(() => G.scenes.town('pictures'));
        }
      },

      // ---------- drawing ----------
      draw() {
        const c = G.ctx;
        if (this.slide) {
          const d = DIRS[this.slide.dir];
          const k = G.easeInOut(Math.min(1, this.slide.t));
          c.save();
          c.translate(-d[0] * G.W * k, -d[1] * G.H * k);
          c.drawImage(this.slide.snap, 0, 0, G.W, G.H);
          c.restore();
          c.save();
          c.translate(d[0] * G.W * (1 - k), d[1] * G.H * (1 - k));
          this.drawWorld();
          c.restore();
          return;
        }
        this.drawWorld();
        this.drawHud();
      },
      drawWorld() {
        const c = G.ctx;
        c.drawImage(this.bg, 0, 0, G.W, G.H);
        const rm = this.room;
        this.drawDoors();
        // exit trapdoor / boss door
        if (rm.type === 'exit') {
          K.seed(900);
          K.rrect(MID.x - 50, B.y0 - 70, 100, 110, 10, this.locked ? '#5b3a26' : '#1d1510', { lw: 4 });
          if (!this.locked) {
            K.text('DOWN', MID.x, B.y0 - 30, 16, { fill: C.gold, lw: 3 });
            K.shape([[MID.x - 12, B.y0 - 8], [MID.x + 12, B.y0 - 8], [MID.x, B.y0 + 8]], C.gold, { lw: 2 });
          }
        } else if (rm.type === 'bossdoor') {
          K.seed(901);
          K.rrect(MID.x - 70, B.y0 - 100, 140, 140, 16, this.locked ? '#4a2a2a' : '#7d1a17', { lw: 4.5 });
          K.star(MID.x, B.y0 - 40, 26, C.gold, 5, 0);
          if (!this.locked) G.paintMarquee(MID.x - 80, B.y0 - 112, 160, 30, this.t);
        }
        // fountain
        if (rm.fountain) {
          const f = rm.fountain;
          K.seed(902);
          K.blob(f.x, f.y + 20, 70, 30, '#9aa3a8', { lw: 3.5 });
          K.blob(f.x, f.y + 16, 58, 22, f.used ? '#8a9aa0' : C.pink, { lw: 2.5 });
          if (!f.used) for (let i = 0; i < 4; i++) K.blob(f.x - 20 + i * 14, f.y + 10 - ((this.t * 40 + i * 12) % 30), 3, 3, C.white, { lw: 1.4 });
          K.rrect(f.x - 8, f.y - 40, 16, 56, 4, '#9aa3a8', { lw: 3 });
        }
        // hazards on the floor
        this.hazards.forEach((h) => h.draw());
        // y-sorted actors
        const ents = [];
        this.props.forEach((p) => !p.dead && ents.push({ y: p.y, d: () => drawProp(p, reel) }));
        if (rm.chest) ents.push({ y: rm.chest.y, d: () => drawChest(rm.chest, rm.opened) });
        this.loot.forEach((l) => ents.push({ y: l.y, d: () => this.drawLoot(l) }));
        this.enemies.forEach((e) => ents.push({ y: e.y, d: () => G.drawEnemy(e) }));
        if (this.boss && !(this.state === 'results')) ents.push({ y: this.boss.y, d: () => this.boss.draw() });
        if (this.state !== 'hook' || this.st < 0.7) ents.push({ y: this.pl.y, d: () => this.pl.draw() });
        ents.sort((a, b) => a.y - b.y).forEach((e) => e.d());
        this.pbullets.forEach(G.drawPBullet);
        this.ebullets.forEach((b) => {
          if (b.frozen > 0) {
            c.save();
            c.globalAlpha = 0.6;
            G.drawEBullet(b);
            c.restore();
          } else G.drawEBullet(b);
        });
        F.draw();
        if (this.state === 'hook') this.drawHook();
        if (this.state === 'dead' || this.state === 'cut') CH.wickGhost(this.pl.x, this.pl.y - Math.min(this.st, 1.8) * 60, 1.4);
        if (this.near && !U.blocking()) U.prompt(this.near.x, this.near.y - 40, 'E', this.near.label);
      },
      drawDoors() {
        const doors = this.room.doors;
        const th = THEMES[reel];
        Object.keys(doors).forEach((d) => {
          const [x, y] = DOORPOS[d];
          K.seed(950 + d.charCodeAt(0));
          const horiz = d === 'n' || d === 's';
          const w = horiz ? 96 : 30,
            h = horiz ? 30 : 96;
          const dx = x - w / 2 + (d === 'w' ? -16 : d === 'e' ? 16 : 0),
            dy = y - h / 2 + (d === 'n' ? -16 : d === 's' ? 16 : 0);
          K.rrect(dx, dy, w, h, 6, K.INK, { lw: 3, stroke: th.trim });
          if (this.locked) {
            for (let i = 0; i < 5; i++) {
              if (horiz) K.line([[dx + 10 + i * 19, dy + 2], [dx + 10 + i * 19, dy + h - 2]], 5, '#8a8a90');
              else K.line([[dx + 2, dy + 10 + i * 19], [dx + w - 2, dy + 10 + i * 19]], 5, '#8a8a90');
            }
          }
        });
      },
      drawLoot(l) {
        const c = G.ctx;
        K.seed(l.x);
        K.shadow(l.x, l.y, 12, 4);
        const bob = l.z > 0 ? l.z : Math.sin(this.t * 4 + l.x) * 3 + 4;
        if (l.gold) K.coin(l.x, l.y - bob - 6, 7);
        else {
          if (Math.floor(this.t * 3 + l.x) % 3 === 0) K.star(l.x + 12, l.y - bob - 22, 4, C.white, 4, 0, { lw: 1 });
          IT.icon(l.id, l.x, l.y - bob - 12, 0.9);
        }
      },
      drawHook() {
        // a vaudeville hook swoops in from the wings and yanks Wick off stage
        const c = G.ctx;
        const k = this.st;
        const pl = this.pl;
        let hx;
        if (k < 0.6) hx = G.W + 80 - (G.W + 80 - pl.x) * G.easeOut(k / 0.6);
        else hx = pl.x + G.easeIn(Math.min(1, (k - 0.7) / 0.6)) * (G.W + 200 - pl.x);
        const wx = k < 0.7 ? pl.x : hx;
        if (k >= 0.7) CH.wick(wx, pl.y, { rolling: false, mood: 'o', pose: 'shrug', fx: 1, moving: false });
        K.seed(960);
        K.line([[hx + 40, pl.y - 50], [G.W + 300, pl.y - 70]], 10, '#8b6a3e');
        K.line([[hx + 40, pl.y - 50], [hx - 10, pl.y - 60], [hx - 30, pl.y - 30], [hx - 10, pl.y - 20]], 10, '#8b6a3e', { smooth: true });
        K.line([[hx + 40, pl.y - 50], [G.W + 300, pl.y - 70]], 2);
        if (k > 0.7) for (let i = 0; i < 3; i++) K.line([[wx - 40 - i * 12, pl.y - 60 + i * 20], [wx - 90 - i * 20, pl.y - 60 + i * 20]], 3);
      },
      drawHud() {
        const c = G.ctx;
        if (this.state === 'intro') return this.drawIntro();
        if (this.state === 'wrap') return this.drawWrapText();
        if (this.state === 'results') return this.drawResults();
        if (this.state === 'cut') return this.drawCut();
        if (this.state === 'dead') return;
        U.hud(this.pl);
        if (!this.boss) this.drawMinimap();
        if (this.banner) {
          const k = this.banner.t;
          const x = k < 0.4 ? G.W / 2 - (1 - G.easeOut(k / 0.4)) * 700 : k > 2.2 ? G.W / 2 + G.easeIn((k - 2.2) / 0.4) * 700 : G.W / 2;
          c.save();
          c.translate(x, 190);
          c.rotate(-0.03);
          K.seed(970);
          K.card(-230, -50, 460, 100, { fill: C.cream });
          K.text(this.banner.text, 0, -14, 30, { fill: C.red, wave: 1.5 });
          K.text(this.banner.sub, 0, 24, 18, { font: K.F.deco, fill: K.INK, lw: 0, shadow: false });
          c.restore();
        }
      },
      drawMinimap() {
        const c = G.ctx;
        const f = this.floor;
        const cw = 20,
          chh = 13;
        const ox = G.W - 110,
          oy = 60;
        c.save();
        c.translate(ox, oy);
        c.rotate(0.03);
        K.seed(980);
        K.rrect(-92, -40, 184, 92, 6, 'rgba(244,230,198,0.92)', { lw: 3 });
        Object.values(f.rooms).forEach((rm) => {
          const known = rm.visited || Object.keys(rm.doors).some((d) => {
            const n = f.rooms[f.key(rm.gx + DIRS[d][0], rm.gy + DIRS[d][1])];
            return n && n.visited;
          });
          if (!known) return;
          const x = rm.gx * (cw + 4) - cw / 2,
            y = rm.gy * (chh + 4) + 6 - chh / 2;
          const cur = rm === this.room;
          c.fillStyle = cur ? (Math.floor(G.t * 4) % 2 ? C.red : C.orange) : rm.visited ? '#b9a27a' : 'rgba(0,0,0,0)';
          c.fillRect(x, y, cw, chh);
          c.strokeStyle = K.INK;
          c.lineWidth = rm.visited ? 2 : 1;
          c.setLineDash(rm.visited ? [] : [3, 3]);
          c.strokeRect(x, y, cw, chh);
          c.setLineDash([]);
          if (rm.visited && (rm.type === 'exit' || rm.type === 'bossdoor')) K.text(rm.type === 'exit' ? '▼' : '★', x + cw / 2, y + chh / 2 + 1, 10, { fill: K.INK, lw: 0, shadow: false, font: 'serif' });
          if (rm.visited && rm.type === 'treasure' && !rm.opened) K.text('$', x + cw / 2, y + chh / 2 + 1, 10, { fill: C.dbrown, lw: 0, shadow: false });
          if (rm.visited && rm.type === 'pool' && !rm.fountain.used) K.text('♥', x + cw / 2, y + chh / 2 + 1, 10, { fill: C.red, lw: 0, shadow: false, font: 'serif' });
        });
        c.restore();
        K.text(G.REELS[reel].short.toUpperCase() + ' · F' + (this.depth + 1), ox, oy + 68, 13, { fill: C.cream, lw: 3 });
        U.key('R', ox - 70, oy + 92, 0.8);
        K.text('HOOK', ox - 54, oy + 93, 11, { font: K.F.deco, fill: C.cream, lw: 2.5, align: 'left' });
      },
      drawIntro() {
        const c = G.ctx;
        const st = this.st;
        const bo = G.BOSSES[reel];
        if (st < 1.6) {
          const k = Math.min(1, st * 3) * (st > 1.35 ? 1 - (st - 1.35) / 0.25 : 1);
          c.save();
          c.globalAlpha = k;
          c.translate(G.W / 2, 150);
          c.rotate(-0.03);
          G.paintMarquee(-250, -60, 500, 120, this.t);
          K.text(bo.name, 0, -12, 36, { fill: C.cream, wave: 1.5 });
          K.text('"' + bo.tag + '"', 0, 30, 18, { font: K.F.deco, fill: C.gold, lw: 3 });
          c.restore();
        } else {
          const words = ['LIGHTS!', 'CAMERA!', 'ACTION!!'];
          const i = Math.min(2, Math.floor((st - 1.6) / 0.7));
          const lt = (st - 1.6 - i * 0.7) / 0.7;
          const sc = G.easeBack(Math.min(1, lt * 3));
          c.save();
          c.translate(G.W / 2, 240);
          c.scale(sc, sc);
          c.rotate(Math.sin(i * 2) * 0.06);
          K.text(words[i], 0, 0, i === 2 ? 88 : 64, { fill: i === 2 ? C.red : C.cream, wave: 3, lw: 12 });
          c.restore();
        }
      },
      drawWrapText() {
        const c = G.ctx;
        if (this.st < 0.6) return;
        const sc = G.easeBack(Math.min(1, (this.st - 0.6) * 2.5));
        c.save();
        c.translate(G.W / 2, 250);
        c.scale(sc, sc);
        c.rotate(-0.05);
        K.text("THAT'S A", 0, -50, 54, { fill: C.cream, wave: 2.5, lw: 10 });
        K.text('WRAP!', 0, 30, 110, { fill: C.red, wave: 4, lw: 14 });
        c.restore();
      },
      drawResults() {
        const c = G.ctx;
        const r = this.results;
        c.fillStyle = 'rgba(20,10,5,0.55)';
        c.fillRect(0, 0, G.W, G.H);
        const k = G.easeBack(Math.min(1, this.st * 3));
        c.save();
        c.translate(G.W / 2, G.H / 2);
        c.scale(k, k);
        c.rotate(-0.025);
        K.card(-300, -200, 600, 400, { fill: C.cream });
        K.text('THE RESULTS', 0, -160, 34, { fill: C.red, wave: 1.5 });
        const rows = [
          ['TIME', Math.floor(r.time / 60) + ':' + String(Math.floor(r.time % 60)).padStart(2, '0')],
          ['HP BONUS', r.hp + ''],
          ['PARRY', r.parries + ''],
          ['EX SHOTS', r.ex + ''],
          ['REWARD', '+' + 150 * (reel + 1) + ' gold, 4 curios'],
        ];
        rows.forEach((row, i) => {
          const show = this.st > 0.4 + i * 0.25;
          if (!show) return;
          K.text(row[0], -250, -95 + i * 44, 22, { align: 'left', fill: K.INK, lw: 0, shadow: false, font: K.F.deco });
          K.line([[-100, -88 + i * 44], [60, -88 + i * 44]], 1.5, 'rgba(29,21,16,0.4)');
          K.text(row[1], 250, -95 + i * 44, 22, { align: 'right', fill: C.red, lw: 3 });
        });
        if (this.st > 1.8) {
          const gs = G.easeBack(Math.min(1, (this.st - 1.8) * 3));
          c.save();
          c.translate(190, 130);
          c.scale(gs, gs);
          c.rotate(0.15);
          K.seed(990);
          K.blob(0, 0, 56, 56, C.gold, { lw: 4 });
          K.text(r.grade, 0, 4, 50, { fill: C.red, lw: 7 });
          c.restore();
          K.text('GRADE', 110, 130, 20, { font: K.F.deco, fill: K.INK, lw: 0, shadow: false });
        }
        c.restore();
        if (this.st > 1 && Math.floor(G.t * 2) % 2) K.text('PRESS E', G.W / 2, 515, 16, { fill: C.cream, lw: 3 });
      },
      drawCut() {
        const c = G.ctx;
        c.fillStyle = 'rgba(20,10,5,0.6)';
        c.fillRect(0, 0, G.W, G.H);
        const k = G.easeBack(Math.min(1, this.st * 3));
        c.save();
        c.translate(G.W / 2, G.H / 2);
        c.scale(k, k);
        c.rotate(0.03);
        K.card(-280, -190, 560, 380, { fill: C.cream });
        // clapperboard
        K.seed(995);
        K.rrect(-70, -170, 140, 70, 4, '#2c2c31', { lw: 3 });
        c.save();
        c.translate(-70, -170);
        c.rotate(-0.3 + Math.min(0.3, this.st * 1.2));
        K.rrect(0, -18, 140, 18, 2, C.white, { lw: 3 });
        for (let i = 0; i < 5; i++) K.line([[8 + i * 27, -16], [20 + i * 27, -2]], 5);
        c.restore();
        K.text('CUT!', 0, -135, 34, { fill: C.cream, lw: 5 });
        K.text("YOU GOT SNUFFED!", 0, -60, 30, { fill: C.red, wave: 1.5 });
        // progress film strip
        const prog = this.boss ? 1 - Math.max(0, this.boss.hp) / this.boss.maxHp : (this.depth + 0.5) / 3.5;
        K.filmStrip(-230, -10, 460, 44);
        c.fillStyle = C.gold;
        c.fillRect(-222, 3, 444 * G.clamp(prog, 0, 1), 18);
        K.star(-230 + 460 * G.clamp(prog, 0, 1), 12, 14, C.cream, 5, 0);
        K.text(this.boss ? 'BOSS PROGRESS' : 'REEL PROGRESS', 0, 50, 16, { font: K.F.deco, fill: K.INK, lw: 0, shadow: false });
        K.para(this.lostCount ? 'You dropped ' + this.lostCount + ' curios. Your safe pocket (top row) was spared.' : 'Your safe pocket kept your loot safe!', -220, 80, 440, 17, { align: 'left' });
        c.restore();
        if (this.st > 1 && Math.floor(G.t * 2) % 2) K.text('PRESS E TO GO HOME', G.W / 2, 515, 16, { fill: C.cream, lw: 3 });
      },
    };
    // count boss time
    const upd = S.update;
    S.update = function (dt) {
      if (this.boss && this.state === 'play') this.bossTime += dt;
      upd.call(this, dt);
    };
    return S;
  };

  function drawProp(p, reel) {
    K.seed(p.seed);
    K.shadow(p.x, p.y, 26, 7);
    const breakable = p.hp < 999;
    if (reel === 0) {
      if (breakable) {
        K.rrect(p.x - 16, p.y - 40, 32, 38, 8, '#c0303a', { lw: 3 });
        K.rrect(p.x - 18, p.y - 46, 36, 10, 3, '#e8e2d2', { lw: 2.5 });
      } else {
        K.shape([[p.x - 24, p.y], [p.x + 24, p.y], [p.x + 20, p.y - 40], [p.x + 8, p.y - 50], [p.x - 8, p.y - 50], [p.x - 20, p.y - 40]], '#e9dcc0', { lw: 3, smooth: true });
        K.text('FLOUR', p.x, p.y - 22, 9, { font: K.F.deco, fill: C.dbrown, lw: 0, shadow: false });
      }
    } else if (reel === 1) {
      K.blob(p.x, p.y - 8, 24, 10, breakable ? C.blue : C.red, { lw: 3 });
      K.rrect(p.x - 24, p.y - 40, 48, 32, 3, breakable ? C.blue : C.red, { lw: 3 });
      K.blob(p.x, p.y - 40, 24, 10, C.cream, { lw: 3 });
      K.star(p.x, p.y - 24, 8, C.yellow, 5, 0, { lw: 1.5 });
    } else if (reel === 2) {
      if (breakable) {
        K.rrect(p.x - 18, p.y - 36, 36, 34, 4, '#8a5a3b', { lw: 3 });
        K.line([[p.x - 18, p.y - 36], [p.x + 18, p.y - 2]], 2);
      } else {
        K.blob(p.x, p.y - 20, 22, 22, '#c99a3c', { lw: 3 });
        K.blob(p.x, p.y - 20, 8, 8, '#4a3a4a', { lw: 2 });
      }
    } else {
      K.blob(p.x, p.y - 14, 22, 12, '#3c3a3f', { lw: 3 });
      K.blob(p.x, p.y - 26, 22, 12, breakable ? '#6b4f7d' : '#3c3a3f', { lw: 3 });
      K.blob(p.x, p.y - 26, 5, 3, C.cream, { lw: 1.5 });
    }
  }
  function drawChest(ch, opened) {
    K.seed(930);
    K.shadow(ch.x, ch.y + 20, 44, 10);
    K.rrect(ch.x - 40, ch.y - 20, 80, 44, 6, '#8a5a3b', { lw: 3.5 });
    if (opened) {
      K.rrect(ch.x - 42, ch.y - 44, 84, 22, 8, '#6a3c24', { lw: 3.5 });
      K.wash(ch.x, ch.y - 20, 50, 20, 'rgba(255,230,140,0.7)');
    } else {
      K.rrect(ch.x - 43, ch.y - 30, 86, 22, 10, '#a06a44', { lw: 3.5 });
      K.rrect(ch.x - 8, ch.y - 18, 16, 16, 3, C.gold, { lw: 2.5 });
      K.star(ch.x + 34, ch.y - 36, 6, C.white, 4, G.t * 2, { lw: 1 });
    }
  }
})();
