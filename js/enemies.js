// Enemies of the Lost Reels, plus enemy bullets. Each reel has its own cast.
(function () {
  const K = G.ink,
    C = K.C,
    A = G.audio,
    F = G.fx;

  // ---------- enemy bullets ----------
  G.shoot = (room, x, y, a, sp, o = {}) => {
    room.ebullets.push(Object.assign({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 8, life: 5, kind: 'pellet', color: C.cream, seed: Math.random() * 99 }, o));
  };
  G.drawEBullet = (b) => {
    const c = G.ctx;
    K.seed(b.seed);
    const col = b.pink ? C.pink : b.color;
    c.save();
    c.translate(b.x, b.y);
    if (b.kind === 'note') {
      c.rotate(Math.sin(G.animT * 8 + b.seed) * 0.3);
      K.blob(-3, 5, b.r * 0.8, b.r * 0.6, col, { lw: 2.4, rot: -0.4 });
      K.line([[b.r * 0.4, 3], [b.r * 0.4, -b.r * 1.4], [b.r * 1.2, -b.r * 0.9]], 3);
    } else if (b.kind === 'steam') {
      c.globalAlpha = 0.85;
      K.blob(0, 0, b.r, b.r * 0.85, b.pink ? C.pink : '#e6e2dc', { lw: 2.4 });
    } else if (b.kind === 'pin') {
      c.rotate(G.t * 12 + b.seed);
      K.shape([[0, -b.r * 1.3], [b.r * 0.5, -b.r * 0.5], [b.r * 0.35, b.r * 0.4], [b.r * 0.6, b.r * 1.2], [-b.r * 0.6, b.r * 1.2], [-b.r * 0.35, b.r * 0.4], [-b.r * 0.5, -b.r * 0.5]], col === C.cream ? C.white : col, { lw: 2.2, smooth: true });
      K.line([[-b.r * 0.4, 0], [b.r * 0.4, 0]], 2.5, C.red);
    } else if (b.kind === 'gear') {
      c.rotate(G.t * 6 + b.seed);
      const p = [];
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const r = i % 2 ? b.r * 0.72 : b.r;
        p.push([Math.cos(a) * r, Math.sin(a) * r]);
      }
      K.shape(p, b.pink ? C.pink : '#c99a3c', { lw: 2.2 });
      K.blob(0, 0, b.r * 0.3, b.r * 0.3, C.cream, { lw: 1.5 });
    } else if (b.kind === 'star') {
      K.star(0, 0, b.r * 1.3, col === C.cream ? C.yellow : col, 5, G.t * 5 + b.seed, { lw: 2.2 });
    } else if (b.kind === 'film') {
      c.rotate(Math.atan2(b.vy, b.vx));
      K.rrect(-b.r * 1.4, -b.r * 0.7, b.r * 2.8, b.r * 1.4, 2, b.pink ? C.pink : '#3c3a3f', { lw: 2 });
      K.rrect(-b.r * 0.8, -b.r * 0.4, b.r * 1.6, b.r * 0.8, 1, '#e8e0c8', { lw: 1 });
    } else if (b.kind === 'sand') {
      K.blob(0, 0, b.r, b.r, b.pink ? C.pink : C.tan, { lw: 2 });
    } else {
      K.blob(0, 0, b.r, b.r, col, { lw: 2.4, hl: true });
    }
    c.restore();
  };

  // ---------- enemy types ----------
  const T = (G.ENEMIES = {
    // Reel 1: The Pantry Picture
    sugarcube: { hp: 5, r: 16, ai: 'hopper', shock: 0, gold: [1, 3], draw: drawSugar },
    spoon: { hp: 7, r: 14, ai: 'chaser', speed: 85, gold: [1, 3], draw: drawSpoon },
    pepper: { hp: 9, r: 16, ai: 'turret', pattern: 'cross', rate: 2.2, gold: [2, 4], draw: drawPepper },
    toast: { hp: 5, r: 15, ai: 'bouncer', speed: 150, gold: [1, 2], draw: drawToast },
    // Reel 2: Big Top Blowout
    balloon: { hp: 4, r: 16, ai: 'floater', speed: 55, pop: 8, gold: [1, 3], draw: drawBalloon },
    pinny: { hp: 6, r: 14, ai: 'bouncer', speed: 210, gold: [1, 3], draw: drawPinny },
    clown: { hp: 10, r: 17, ai: 'turret', pattern: 'aimed', rate: 1.6, gold: [2, 5], draw: drawClown },
    popper: { hp: 5, r: 14, ai: 'hopper', shock: 6, gold: [1, 3], draw: drawPopper },
    // Reel 3: Tick-Tock Tower
    cuckoo: { hp: 8, r: 15, ai: 'swooper', speed: 380, fly: true, gold: [2, 4], draw: drawCuckoo },
    gearling: { hp: 10, r: 17, ai: 'bouncer', speed: 170, gold: [2, 4], draw: drawGearling },
    hourglass: { hp: 10, r: 16, ai: 'teleporter', rate: 2.2, gold: [2, 5], draw: drawHourglass },
    tickbug: { hp: 6, r: 12, ai: 'chaser', speed: 125, gold: [1, 3], draw: drawTickbug },
    // Reel 4: The Final Cut
    reelie: { hp: 12, r: 17, ai: 'bouncer', speed: 190, gold: [3, 6], draw: drawReelie },
    shade: { hp: 10, r: 14, ai: 'chaser', speed: 140, gold: [3, 6], draw: drawShade },
    spot: { hp: 14, r: 18, ai: 'turret', pattern: 'ring', rate: 2.4, gold: [3, 6], draw: drawSpot },
    clapper: { hp: 11, r: 16, ai: 'hopper', shock: 8, gold: [3, 6], draw: drawClapper },
  });
  G.REEL_ENEMIES = [
    ['sugarcube', 'spoon', 'pepper', 'toast'],
    ['balloon', 'pinny', 'clown', 'popper'],
    ['cuckoo', 'gearling', 'hourglass', 'tickbug'],
    ['reelie', 'shade', 'spot', 'clapper'],
  ];

  G.spawnEnemy = (type, x, y, mult = 1) => {
    const d = T[type];
    return {
      type,
      d,
      x,
      y,
      z: 0,
      vx: 0,
      vy: 0,
      hp: d.hp * mult,
      maxHp: d.hp * mult,
      r: d.r,
      t: Math.random() * 1.5,
      state: 'idle',
      seed: Math.random() * 999,
      flash: 0,
      fx: 1,
      spawnT: 0.6,
      cd: 1 + Math.random() * 1.5,
    };
  };

  G.updateEnemy = (e, dt, room) => {
    const pl = room.pl;
    const d = e.d;
    e.t += dt;
    e.flash = Math.max(0, e.flash - dt);
    if (e.spawnT > 0) {
      e.spawnT -= dt;
      return;
    }
    const dx = pl.x - e.x,
      dy = pl.y - e.y;
    const dist = Math.hypot(dx, dy) || 1;
    const toP = Math.atan2(dy, dx);
    e.fx = dx >= 0 ? 1 : -1;
    const moveBy = (vx, vy) => {
      e.x += vx * dt;
      e.y += vy * dt;
      if (!d.fly) G.collide(e, room.world);
      else {
        const b = room.world.bounds;
        e.x = G.clamp(e.x, b.x0 + e.r, b.x1 - e.r);
        e.y = G.clamp(e.y, b.y0 + e.r, b.y1 - e.r);
      }
    };
    switch (d.ai) {
      case 'chaser': {
        const wob = Math.sin(e.t * 3 + e.seed) * 0.5;
        moveBy(Math.cos(toP + wob) * d.speed, Math.sin(toP + wob) * d.speed);
        break;
      }
      case 'hopper': {
        if (e.state === 'idle') {
          e.cd -= dt;
          if (e.cd <= 0) {
            e.state = 'jump';
            e.jt = 0;
            e.sx = e.x;
            e.sy = e.y;
            const reach = Math.min(dist, 170);
            e.tx = e.x + Math.cos(toP) * reach;
            e.ty = e.y + Math.sin(toP) * reach;
          }
        } else {
          e.jt += dt / 0.55;
          const k = Math.min(1, e.jt);
          e.x = G.lerp(e.sx, e.tx, k);
          e.y = G.lerp(e.sy, e.ty, k);
          G.collide(e, room.world);
          e.z = Math.sin(k * Math.PI) * 60;
          if (k >= 1) {
            e.state = 'idle';
            e.z = 0;
            e.cd = 0.7 + Math.random() * 0.6;
            F.poof(e.x, e.y, 4, C.cream, 40);
            A.sfx('bop');
            if (d.shock) for (let i = 0; i < d.shock; i++) G.shoot(room, e.x, e.y - 10, (i / d.shock) * Math.PI * 2, 170, { r: 6, pink: i === 0 && Math.random() < 0.4 });
          }
        }
        break;
      }
      case 'turret': {
        e.cd -= dt;
        moveBy(Math.cos(e.t * 0.8 + e.seed) * 20, Math.sin(e.t * 0.6 + e.seed) * 20);
        if (e.cd <= 0) {
          e.cd = d.rate;
          e.fire = 0.25;
          const pk = Math.random() < 0.3;
          if (d.pattern === 'cross') {
            const off = Math.floor(e.t / d.rate) % 2 ? Math.PI / 4 : 0;
            for (let i = 0; i < 4; i++) G.shoot(room, e.x, e.y - 20, off + (i * Math.PI) / 2, 190, { pink: pk && i === 0, color: '#6d625a' });
          } else if (d.pattern === 'aimed') {
            for (let i = -1; i <= 1; i++) G.shoot(room, e.x, e.y - 24, toP + i * 0.22, 230, { kind: 'star', r: 8, pink: pk && i === 0 });
          } else {
            for (let i = 0; i < 10; i++) G.shoot(room, e.x, e.y - 24, (i / 10) * Math.PI * 2 + e.t, 170, { kind: 'star', r: 8, pink: pk && i === 0, color: '#fff3b0' });
          }
          A.sfx('shoot');
        }
        if (e.fire) e.fire = Math.max(0, e.fire - dt);
        break;
      }
      case 'bouncer': {
        if (!e.vx && !e.vy) {
          const a = Math.random() * Math.PI * 2;
          e.vx = Math.cos(a) * d.speed;
          e.vy = Math.sin(a) * d.speed;
        }
        const px = e.x,
          py = e.y;
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        G.collide(e, room.world);
        const b = room.world.bounds;
        if (e.x <= b.x0 + e.r + 0.5 || e.x >= b.x1 - e.r - 0.5 || Math.abs(e.x - (px + e.vx * dt)) > 0.5) e.vx *= -1;
        if (e.y <= b.y0 + e.r + 0.5 || e.y >= b.y1 - e.r - 0.5 || Math.abs(e.y - (py + e.vy * dt)) > 0.5) e.vy *= -1;
        break;
      }
      case 'floater': {
        moveBy(Math.cos(toP) * d.speed, Math.sin(toP) * d.speed + Math.sin(e.t * 3) * 20);
        break;
      }
      case 'swooper': {
        if (e.state === 'idle') {
          // hover at a distance, circling
          const want = 200;
          const a = toP + Math.PI + Math.sin(e.t) * 0.8;
          const hx = pl.x + Math.cos(a) * want,
            hy = pl.y + Math.sin(a) * want;
          moveBy((hx - e.x) * 2, (hy - e.y) * 2);
          e.cd -= dt;
          if (e.cd <= 0) {
            e.state = 'aim';
            e.at = 0.55;
            e.ang = toP;
          }
        } else if (e.state === 'aim') {
          e.at -= dt;
          if (e.at <= 0) {
            e.state = 'dash';
            e.at = 0.45;
            A.sfx('whistle');
          }
        } else {
          e.at -= dt;
          moveBy(Math.cos(e.ang) * d.speed, Math.sin(e.ang) * d.speed);
          if (e.at <= 0) {
            e.state = 'idle';
            e.cd = 1.2 + Math.random();
          }
        }
        break;
      }
      case 'teleporter': {
        e.cd -= dt;
        if (e.state === 'idle' && e.cd <= 0) {
          e.state = 'vanish';
          e.at = 0.35;
        } else if (e.state === 'vanish') {
          e.at -= dt;
          if (e.at <= 0) {
            F.poof(e.x, e.y - 20, 5, C.tan, 50);
            const b = room.world.bounds;
            for (let k = 0; k < 10; k++) {
              e.x = G.lerp(b.x0 + 60, b.x1 - 60, Math.random());
              e.y = G.lerp(b.y0 + 60, b.y1 - 60, Math.random());
              if (G.dist(e.x, e.y, pl.x, pl.y) > 180) break;
            }
            F.poof(e.x, e.y - 20, 5, C.tan, 50);
            e.state = 'appear';
            e.at = 0.5;
          }
        } else if (e.state === 'appear') {
          e.at -= dt;
          if (e.at <= 0) {
            for (let i = -2; i <= 2; i++) G.shoot(room, e.x, e.y - 24, toP + i * 0.18, 200, { kind: 'sand', r: 7, pink: i === 0 && Math.random() < 0.5 });
            A.sfx('shoot');
            e.state = 'idle';
            e.cd = d.rate;
          }
        }
        break;
      }
    }
    // contact damage
    if (e.z < 20 && e.state !== 'vanish' && G.dist(e.x, e.y, pl.x, pl.y) < e.r + pl.r) pl.hurt(e);
  };

  G.killEnemy = (e, room) => {
    e.dead = true;
    A.sfx('enemyDie');
    F.poof(e.x, e.y - 16, 8, C.cream, 90);
    F.hitStar(e.x, e.y - 16, C.yellow);
    if (e.d.pop) {
      for (let i = 0; i < e.d.pop; i++) G.shoot(room, e.x, e.y - 20, (i / e.d.pop) * Math.PI * 2, 180, { r: 7, color: C.red, pink: i === 0 });
    }
    room.dropLoot(e.x, e.y, e.d.gold);
  };

  G.drawEnemy = (e) => {
    const c = G.ctx;
    if (e.spawnT > 0) {
      // spawn in on a puff of ink
      const k = 1 - e.spawnT / 0.6;
      K.seed(e.seed);
      K.blob(e.x, e.y - 14, 26 * k, 18 * k, K.INK, { lw: 0 });
      return;
    }
    K.seed(e.seed);
    K.shadow(e.x, e.y, e.r + 4 - e.z * 0.05, 5);
    c.save();
    c.translate(e.x, e.y - e.z);
    const hit = e.flash > 0;
    if (hit) c.scale(1.12, 0.92);
    if (e.d.ai === 'hopper' && e.state === 'idle' && e.cd < 0.3) c.scale(1.2, 0.8);
    if (e.state === 'vanish') c.scale(1 - (0.35 - e.at) / 0.35, 1);
    e.d.draw(e);
    c.restore();
    if (e.d.ai === 'swooper' && e.state === 'aim') {
      c.save();
      c.setLineDash([8, 8]);
      c.strokeStyle = 'rgba(212,57,43,0.6)';
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(e.x, e.y - 16);
      c.lineTo(e.x + Math.cos(e.ang) * 400, e.y - 16 + Math.sin(e.ang) * 400);
      c.stroke();
      c.restore();
    }
  };

  // ---------- enemy art (drawn at origin = feet) ----------
  const face = (x, y, s = 1, mood = 'mean', fx = 0) => {
    K.pieEye(x - 5 * s + fx * 2, y, 4 * s, 6 * s, fx, 0, 0);
    K.pieEye(x + 5 * s + fx * 2, y, 4 * s, 6 * s, fx, 0, 0);
    if (mood === 'mean') {
      K.line([[x - 10 * s, y - 8 * s], [x - 2 * s, y - 5 * s]], 2.4);
      K.line([[x + 10 * s, y - 8 * s], [x + 2 * s, y - 5 * s]], 2.4);
      K.shape([[x - 5 * s, y + 8 * s], [x + 5 * s, y + 8 * s], [x, y + 12 * s]], C.darkred, { lw: 1.8, amt: 0.4 });
    } else {
      K.blob(x + fx * 2, y + 10 * s, 3 * s, 3 * s, C.darkred, { lw: 1.6, amt: 0.3 });
    }
  };
  const legs = (e, w = 7, y = -8) => {
    const s = Math.sin(e.t * 12);
    K.hose(-w, y, -w - 2 + s * 4, -2, 2, 4);
    K.hose(w, y, w + 2 - s * 4, -2, -2, 4);
    K.shoe(-w - 2 + s * 4, -2, 6, -1);
    K.shoe(w + 2 - s * 4, -2, 6, 1);
  };
  const arms = (e, y = -24, w = 14, up = false) => {
    const s = Math.sin(e.t * 10) * 4;
    K.hose(-w + 4, y, -w - 8, y + (up ? -14 : 8) + s, 4, 3.5);
    K.hose(w - 4, y, w + 8, y + (up ? -14 : 8) - s, -4, 3.5);
    K.glove(-w - 8, y + (up ? -14 : 8) + s, 4.5, Math.PI, 'fist');
    K.glove(w + 8, y + (up ? -14 : 8) - s, 4.5, 0, 'fist');
  };

  function drawSugar(e) {
    legs(e, 6, -8);
    K.shape([[-16, -38], [16, -38], [18, -8], [-18, -8]], C.white, { lw: 3 });
    K.shape([[-16, -38], [-8, -46], [22, -46], [16, -38]], '#f0ece2', { lw: 2.6 });
    K.star(10, -40, 4, C.yellow, 4, 0, { lw: 1 });
    face(0, -26, 1, 'mean', e.fx * 0.5);
  }
  function drawSpoon(e) {
    legs(e, 5, -10);
    K.line([[0, -8], [0, -30]], 6, '#cfd3d8');
    K.line([[0, -8], [0, -30]], 1.5);
    K.blob(0, -44, 14, 18, '#dde2e8', { lw: 3, hl: true });
    arms(e, -26, 8);
    face(0, -46, 0.9, 'mean', e.fx * 0.5);
    // tiny soldier hat
    K.rrect(-8, -70, 16, 10, 2, C.red, { lw: 2 });
  }
  function drawPepper(e) {
    K.rrect(-14, -44, 28, 40, 8, '#4a3a33', { lw: 3 });
    K.blob(0, -46, 14, 9, '#8a8a90', { lw: 2.6 });
    for (let i = -1; i <= 1; i++) K.blob(i * 5, -49, 1.3, 1.3, K.INK, { lw: 0 });
    face(0, -26, 0.9, e.fire ? 'o' : 'mean', e.fx * 0.4);
    if (e.fire) K.blob(0, -58, 12, 8, 'rgba(120,110,100,0.6)', { lw: 1.5 });
  }
  function drawToast(e) {
    legs(e, 6, -8);
    K.shape([[-16, -8], [16, -8], [16, -34], [20, -42], [12, -50], [0, -48], [-12, -50], [-20, -42], [-16, -34]], '#d9a15a', { lw: 3, smooth: true });
    K.shape([[-12, -12], [12, -12], [12, -32], [14, -40], [0, -43], [-14, -40], [-12, -32]], '#f1d29a', { lw: 1.5, smooth: true });
    face(0, -28, 0.9, 'mean', e.fx * 0.5);
  }
  function drawBalloon(e) {
    K.line([[0, -4], [3, -16], [-2, -26]], 1.6, K.INK, { smooth: true });
    K.blob(0, -44, 16, 19, C.red, { lw: 3, hl: true });
    K.blob(-12, -58, 6, 7, C.red, { lw: 2.4 });
    K.blob(12, -58, 6, 7, C.red, { lw: 2.4 });
    face(0, -44, 0.9, 'mean', e.fx * 0.5);
  }
  function drawPinny(e) {
    G.ctx.rotate(Math.sin(e.t * 16) * 0.35);
    legs(e, 5, -8);
    K.shape([[0, -58], [8, -46], [5, -30], [10, -14], [6, -6], [-6, -6], [-10, -14], [-5, -30], [-8, -46]], C.white, { smooth: true, lw: 3 });
    K.line([[-6, -28], [6, -28]], 3.5, C.red);
    K.line([[-8, -20], [8, -20]], 3.5, C.blue);
    face(0, -44, 0.7, 'mean', e.fx * 0.5);
  }
  function drawClown(e) {
    // a light-bulb clown on a spring
    for (let i = 0; i < 4; i++) K.blob(0, -6 - i * 6, 9, 3, null, { lw: 2.4, stroke: '#8a8a90' });
    K.blob(0, -46, 18, 20, '#fff3b0', { lw: 3, hl: true });
    K.rrect(-8, -30, 16, 8, 2, '#9e9aa6', { lw: 2 });
    face(0, -48, 0.95, e.fire ? 'o' : 'mean', e.fx * 0.5);
    K.blob(0 + e.fx * 2, -42, 4, 4, C.red, { lw: 1.6 });
    K.shape([[-10, -64], [10, -64], [0, -82]], C.blue, { lw: 2.4 });
    K.blob(0, -83, 4, 4, C.yellow, { lw: 1.6 });
  }
  function drawPopper(e) {
    legs(e, 5, -8);
    K.shape([[-14, -8], [14, -8], [18, -34], [-18, -34]], C.white, { lw: 3 });
    for (let i = -1; i <= 1; i++) K.line([[i * 10, -9], [i * 12, -33]], 4, C.red);
    K.blob(-8, -40, 8, 7, '#f6d768', { lw: 2.2 });
    K.blob(6, -42, 9, 8, '#f6d768', { lw: 2.2 });
    face(0, -24, 0.8, 'mean', e.fx * 0.5);
  }
  function drawCuckoo(e) {
    const flap = Math.sin(e.t * 26) * 10;
    G.ctx.scale(e.fx, 1);
    K.shape([[-4, -40], [-26, -50 - flap], [-14, -36]], '#5f8fc4', { lw: 2.4 });
    K.blob(0, -36, 16, 13, '#e8b04a', { lw: 3, hl: true });
    K.shape([[14, -40], [26, -36], [14, -32]], C.orange, { lw: 2.2 });
    K.pieEye(6, -40, 4, 6, 1, 0, 0);
    K.shape([[4, -40], [-26, -26 + flap], [-10, -30]], '#5f8fc4', { lw: 2.4 });
    K.line([[-14, -34], [-22, -30]], 2);
  }
  function drawGearling(e) {
    G.ctx.save();
    G.ctx.translate(0, -22);
    G.ctx.rotate(e.t * 4 * Math.sign(e.vx || 1));
    const p = [];
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const r = i % 2 ? 15 : 20;
      p.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    K.shape(p, '#c99a3c', { lw: 3 });
    G.ctx.restore();
    K.blob(0, -22, 10, 10, C.cream, { lw: 2.4 });
    face(0, -22, 0.7, 'mean', e.fx * 0.5);
  }
  function drawHourglass(e) {
    legs(e, 5, -8);
    K.rrect(-16, -60, 32, 7, 2, C.brown, { lw: 2.4 });
    K.rrect(-16, -14, 32, 7, 2, C.brown, { lw: 2.4 });
    K.shape([[-12, -53], [12, -53], [3, -34], [12, -14], [-12, -14], [-3, -34]], 'rgba(200,230,240,0.9)', { lw: 2.6 });
    K.shape([[-8, -14], [8, -14], [0, -24]], C.tan, { lw: 0 });
    face(0, -44, 0.7, 'mean', e.fx * 0.4);
    arms(e, -34, 12, true);
  }
  function drawTickbug(e) {
    legs(e, 7, -6);
    K.blob(0, -18, 15, 12, '#8e3b2e', { lw: 3, hl: true });
    K.blob(0, -18, 9, 7, C.cream, { lw: 2 });
    K.line([[0, -18], [0, -24]], 1.8);
    K.line([[0, -18], [4 * Math.cos(e.t * 6), -18 + 4 * Math.sin(e.t * 6)]], 1.8);
    K.line([[-6, -28], [-12, -38]], 2);
    K.line([[6, -28], [12, -38]], 2);
  }
  function drawReelie(e) {
    G.ctx.save();
    G.ctx.translate(0, -24);
    G.ctx.rotate(e.t * 5);
    K.blob(0, 0, 21, 21, '#3c3a3f', { lw: 3 });
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      K.blob(Math.cos(a) * 11, Math.sin(a) * 11, 4, 4, C.cream, { lw: 1.4 });
    }
    G.ctx.restore();
    face(0, -24, 0.7, 'mean', e.fx * 0.4);
  }
  function drawShade(e) {
    G.ctx.globalAlpha = 0.9;
    K.shape([[-14, -4], [-16, -40], [-8, -58], [8, -58], [16, -40], [14, -4], [6, -10], [0, -2], [-6, -10]], '#2a2230', { smooth: true, lw: 2.5, stroke: '#6b4f7d' });
    K.blob(-5, -40, 4, 6, C.cream, { lw: 0 });
    K.blob(5, -40, 4, 6, C.cream, { lw: 0 });
    G.ctx.globalAlpha = 1;
  }
  function drawSpot(e) {
    K.rrect(-4, -24, 8, 22, 2, '#55565e', { lw: 2.4 });
    K.line([[-14, -2], [14, -2]], 4);
    K.blob(0, -38, 20, 16, '#55565e', { lw: 3 });
    K.blob(e.fx * 10, -38, 9, 12, '#fff3b0', { lw: 2.6, hl: true });
    K.pieEye(-6 - e.fx * 3, -42, 3.5, 5, e.fx, 0, 0);
    if (e.fire) K.wash(e.fx * 20, -38, 40, 30, 'rgba(255,240,160,0.8)');
  }
  function drawClapper(e) {
    legs(e, 6, -8);
    K.rrect(-18, -40, 36, 32, 3, '#2c2c31', { lw: 3 });
    const open = e.state === 'jump' ? -0.5 : 0;
    G.ctx.save();
    G.ctx.translate(-18, -40);
    G.ctx.rotate(open);
    K.rrect(0, -10, 36, 10, 2, C.white, { lw: 2.6 });
    for (let i = 0; i < 4; i++) K.line([[4 + i * 9, -9], [10 + i * 9, -1]], 3);
    G.ctx.restore();
    face(0, -24, 0.8, 'mean', e.fx * 0.4);
  }
})();
