// Wick sprite rig: a posable cel-style candle hero plus every animation cycle,
// keyed pose by pose with anticipation, squash & stretch, smears and follow-through.
// Painted offline into assets/wick.png by tools/bake.html.
(function () {
  const CL = G.cel;
  const ART = (G.art = G.art || {});
  const COL = {
    wax: '#f8ecd0',
    wax2: '#fffaf0',
    shorts: '#d8392b',
    shoe: '#5a3222',
    cheek: 'rgba(236,112,96,0.5)',
    flameOut: '#8a2c0c',
    flame: '#f2872a',
    flameIn: '#ffd452',
    ghost: '#dbe7f2',
  };

  // ---------- default pose ----------
  function pose(view) {
    const side = view === 'side';
    return {
      view,
      bx: 0,
      by: 0,
      sx: 1,
      sy: 1,
      lean: 0,
      fL: side ? [-6, 0] : [-8, 0],
      fR: side ? [7, 0] : [8, 0],
      kL: 3,
      kR: -3,
      rotFL: 0,
      rotFR: 0,
      hL: side ? [-7, -21] : [-26, -15],
      hR: side ? [12, -18] : [26, -15],
      pL: 'fist',
      pR: 'fist',
      rL: side ? Math.PI * 0.6 : Math.PI * 0.75,
      rR: side ? Math.PI * 0.4 : Math.PI * 0.25,
      aim: null,
      look: [side ? 1 : 0, 0],
      blink: 0,
      lid: 0,
      brow: 0,
      mouth: 'grin',
      mouthOpen: 0.5,
      eyes: 'normal',
      flame: { lean: 0, len: 1, scale: 1, lit: 1 },
      alpha: 1,
      extras: [],
    };
  }

  // ---------- painter ----------
  ART.drawWick = (p) => {
    const c = G.ctx;
    c.save();
    if (p.alpha < 1) c.globalAlpha = p.alpha;
    const view = p.view;
    const side = view === 'side';
    CL.ground(0, 0, 21 * Math.max(0.7, p.sx), 6);
    // body transform (pivot at the hips)
    const hipY = -20 + p.by;
    const cs = Math.cos(p.lean),
      sn = Math.sin(p.lean);
    const T = (x, y) => [p.bx + (x * p.sx) * cs - (y * p.sy) * sn, hipY + (x * p.sx) * sn + (y * p.sy) * cs];

    (p.extras || []).filter((e) => e.under).forEach(drawExtra);

    const shL = T(side ? -6 : -16, -30),
      shR = T(side ? 8 : 16, -30);
    const hipL = T(side ? -3 : -7, -2),
      hipR = T(side ? 4 : 7, -2);
    const arm = (sh, h, rot, pz) => {
      CL.hose(sh[0], sh[1], h[0], h[1], sh[0] < p.bx ? 5 : -5, 4.6);
      CL.glove(h[0], h[1], 7.4, rot, pz, h[0] < sh[0] && pz === 'point' ? -1 : 1);
    };
    // far arm first in side view
    if (side) arm(shL, p.hL, p.rL, p.pL);
    // legs + shoes
    CL.hose(hipL[0], hipL[1], p.fL[0], p.fL[1] - 4, p.kL, 4.8);
    CL.hose(hipR[0], hipR[1], p.fR[0], p.fR[1] - 4, p.kR, 4.8);
    const shoe = (f, dir, rot) => {
      if (side) CL.shoe(f[0], f[1] - 4, 9.5, 1, COL.shoe, rot);
      else if (view === 'down') {
        CL.oval(f[0] + dir * 2, f[1] - 3, 9.5, 6.5, COL.shoe, { lw: 2.6, cast: 0.3 });
        CL.stroke([[f[0] + dir * 2 - 7, f[1]], [f[0] + dir * 2 + 7, f[1]]], 1.8, CL.INK, { taper: 0.4 });
      } else CL.oval(f[0], f[1] - 4, 8, 5.5, CL.mix(COL.shoe, '#000000', 0.15), { lw: 2.6, cast: 0.3 });
    };
    shoe(p.fL, -1, p.rotFL);
    shoe(p.fR, 1, p.rotFR);

    // ---- the candle ----
    c.save();
    c.translate(p.bx, hipY);
    c.rotate(p.lean);
    c.scale(p.sx, p.sy);
    const top = -50;
    CL.round(-17, top, 34, 54, 11, COL.wax, { lw: 3.2, cast: 0.26, castDir: [1, 0.12] });
    // wax cap with drips (front has more drips)
    const drip = view === 'up' ? [[-17, top + 12], [-17, top + 3], [-6, top - 2], [8, top - 2], [17, top + 4], [17, top + 16], [13, top + 19], [11, top + 10], [3, top + 11], [0, top + 22], [-4, top + 11], [-11, top + 14]]
      : [[-17, top + 10], [-17, top + 2], [-5, top - 2], [9, top - 1], [17, top + 3], [17, top + 13], [14, top + 16], [11, top + 8], [5, top + 10], [2, top + 17], [-2, top + 9], [-9, top + 13], [-13, top + 19], [-15, top + 11]];
    CL.shape(drip, COL.wax2, { lw: 2.2, cast: 0.18 });
    // shorts
    CL.shape([[-19, -13], [19, -13], [20, 2], [12, 5], [4, 1], [0, 3], [-4, 1], [-12, 5], [-20, 2]], COL.shorts, { lw: 3, cast: 0.25 });
    if (view === 'down') {
      CL.oval(-7, -6, 2.8, 2.8, '#fffdf6', { lw: 1.4, shade: false });
      CL.oval(7, -6, 2.8, 2.8, '#fffdf6', { lw: 1.4, shade: false });
    } else if (side) CL.oval(10, -6, 2.8, 2.8, '#fffdf6', { lw: 1.4, shade: false });
    else CL.stroke([[0, -12], [0, 1]], 1.6, CL.INK, { taper: 0.3 });

    // ---- face ----
    if (view !== 'up') {
      const ox = side ? 6 : 0;
      const lx = p.look[0],
        ly = p.look[1];
      c.fillStyle = COL.cheek;
      c.beginPath();
      if (!side) c.ellipse(-12, -21, 4.2, 2.6, 0, 0, Math.PI * 2);
      c.ellipse(side ? 14 : 12, -21, 4.2, 2.6, 0, 0, Math.PI * 2);
      c.fill();
      const eo = { blink: p.blink, lid: p.lid, iris: null, lidColor: COL.wax };
      if (p.eyes === 'x') {
        [[-7 + ox, -33], [7 + ox, -33]].forEach(([ex, ey]) => {
          CL.stroke([[ex - 4, ey - 4], [ex + 4, ey + 4]], 2.6, CL.INK, { taper: 0.2 });
          CL.stroke([[ex + 4, ey - 4], [ex - 4, ey + 4]], 2.6, CL.INK, { taper: 0.2 });
        });
      } else if (p.eyes === 'happy') {
        [[-7 + ox, -32], [7 + ox, -32]].forEach(([ex, ey]) => CL.stroke([[ex - 5, ey + 2], [ex, ey - 4], [ex + 5, ey + 2]], 3, CL.INK, { taper: 0.25 }));
      } else {
        const big = p.eyes === 'wide' ? 1.25 : 1;
        if (side) {
          CL.eye(1 + ox, -33, 4.2 * big, 8.6 * big, lx, ly, eo);
          CL.eye(10 + ox, -33, 5.2 * big, 9.4 * big, lx, ly, eo);
        } else {
          CL.eye(-7, -33, 5.4 * big, 9.4 * big, lx, ly, eo);
          CL.eye(7, -33, 5.4 * big, 9.4 * big, lx, ly, eo);
        }
      }
      // brows: + angry, - worried
      const b = p.brow;
      if (side) {
        CL.brow(2 + ox, -46, 4, b, 2.4);
        CL.brow(11 + ox, -47, 5, b, 2.8);
      } else {
        CL.stroke([[-12, -46 + b * 2], [-7, -48 - b], [-2, -45 + b * 3]], 2.8, CL.INK, { taper: 0.45 });
        CL.stroke([[2, -45 + b * 3], [7, -48 - b], [12, -46 + b * 2]], 2.8, CL.INK, { taper: 0.45 });
      }
      // little wax nose
      CL.oval(side ? 16 : 0, -26, side ? 3.4 : 3.2, 2.8, '#f3dcb8', { lw: 1.8, cast: 0.3, hl: false });
      const mx = side ? 9 : 0;
      const m = p.mouth;
      if (m === 'grin' || m === 'open') CL.grin(mx, -20, side ? 7 : 9, 8, { open: m === 'open' ? 0.9 : p.mouthOpen, nTeeth: side ? 3 : 4 });
      else if (m === 'grit') CL.grin(mx, -20, side ? 7 : 9, 6, { gritted: true, open: 0.5, nTeeth: 4, tongue: false });
      else if (m === 'o') CL.oval(mx, -19, 3.6, 4.6, '#6a1418', { lw: 2.2, shade: false });
      else if (m === 'sad') CL.stroke([[mx - 5, -17], [mx, -21], [mx + 5, -17]], 2.6, CL.INK, { taper: 0.3 });
      else if (m === 'smile') CL.stroke([[mx - 6, -22], [mx, -17], [mx + 6, -22]], 2.6, CL.INK, { taper: 0.3 });
      else CL.stroke([[mx - 5, -20], [mx + 5, -20]], 2.4, CL.INK, { taper: 0.3 });
    }
    // wick
    CL.stroke([[0, top + 1], [1, top - 7]], 2.6, CL.INK, { taper: 0.1 });
    c.restore();

    // aiming arm: straight from the true shoulder along the aim angle
    if (p.aimA != null) {
      const a = p.aimA;
      p.hR = [shR[0] + Math.cos(a) * p.aimLen, shR[1] + Math.sin(a) * p.aimLen];
      p.rR = a;
      if (p.flashRot) p.extras.push({ t: 'flash', x: p.hR[0] + Math.cos(a) * 19, y: p.hR[1] + Math.sin(a) * 19, r: 8, rot: p.flashRot });
    }
    // near / front arms
    if (side) arm(shR, p.hR, p.rR, p.pR);
    else {
      arm(shL, p.hL, p.rL, p.pL);
      arm(shR, p.hR, p.rR, p.pR);
    }
    // flame rides the top of the wick
    const tip = T(1, -58);
    ART.flame(tip[0], tip[1], p.flame, p.lean);
    (p.extras || []).filter((e) => !e.under).forEach(drawExtra);
    c.restore();
  };

  ART.flame = (x, y, f, bodyLean = 0) => {
    if (!f || f.lit <= 0) return;
    const c = G.ctx;
    c.save();
    c.translate(x, y);
    c.rotate(bodyLean + (f.lean || 0));
    const s = (f.scale || 1) * f.lit;
    c.scale(s, s * (f.len || 1));
    const w = f.wob || 0;
    CL.shape([[0, 2], [-8, -4], [-9, -13], [-4 + w, -22], [1 + w * 2, -32], [6 + w, -20], [9, -10], [7, -2]], COL.flame, { lw: 2.4, line: COL.flameOut, shade: false });
    CL.shape([[0, 0], [-5, -5], [-4, -12], [w, -20], [4, -11], [5, -4]], COL.flameIn, { lw: 0, shade: false });
    CL.oval(0, -4, 2.4, 3.4, '#fffbe8', { lw: 0, shade: false });
    c.restore();
  };

  ART.drawExtra = (e) => drawExtra(e);
  function drawExtra(e) {
    const c = G.ctx;
    if (e.t === 'flash') {
      CL.star(e.x, e.y, e.r || 8, '#fff2a0', 6, e.rot || 0, { lw: 1.6 });
      CL.star(e.x, e.y, (e.r || 8) * 0.5, '#ffffff', 6, (e.rot || 0) + 0.3, { lw: 0 });
    } else if (e.t === 'speed') CL.speedLines(e.x, e.y, e.dir, e.n || 4, e.len || 28, e.spread || 34, 2.4);
    else if (e.t === 'vspeed') {
      for (let i = 0; i < 4; i++) {
        const ox = (i / 3 - 0.5) * (e.spread || 30);
        CL.stroke([[e.x + ox, e.y], [e.x + ox, e.y - e.dir * (e.len || 26) * (0.6 + (i % 2) * 0.4)]], 2.4, CL.INK, { taper: 0.5 });
      }
    } else if (e.t === 'puff') CL.puff(e.x, e.y, e.r, e.col);
    else if (e.t === 'smoke') {
      c.save();
      c.globalAlpha = e.a == null ? 0.8 : e.a;
      CL.puff(e.x, e.y, e.r, '#8f8790');
      c.restore();
    } else if (e.t === 'pink') CL.star(e.x, e.y, e.r || 12, '#ff5fa8', 5, e.rot || 0, { lw: 2 });
    else if (e.t === 'sparkle') CL.star(e.x, e.y, e.r || 5, '#fff6c8', 4, e.rot || 0, { lw: 1.4 });
    else if (e.t === 'ghostTrail') {
      c.save();
      c.globalAlpha = e.a;
      c.strokeStyle = CL.INK;
      c.lineWidth = 2;
      c.beginPath();
      c.roundRect ? c.roundRect(e.x - 17, e.y - 70, 34, 60, 11) : c.rect(e.x - 17, e.y - 70, 34, 60);
      c.stroke();
      c.restore();
    } else if (e.t === 'halo') {
      c.save();
      c.strokeStyle = '#f6d44a';
      c.lineWidth = 3;
      c.beginPath();
      c.ellipse(e.x, e.y, 15, 4.5, 0, 0, Math.PI * 2);
      c.stroke();
      c.restore();
    }
  }

  // ---------- animation library ----------
  const TAU = Math.PI * 2;
  const DIRS = {
    side: { view: 'side', a: 0 },
    diagup: { view: 'side', a: -Math.PI / 4 },
    diagdown: { view: 'side', a: Math.PI / 4 },
    up: { view: 'up', a: -Math.PI / 2 },
    down: { view: 'down', a: Math.PI / 2 },
  };

  function idle(view, f, n) {
    const p = pose(view);
    const k = Math.sin((f / n) * TAU);
    p.sy = 1 + 0.035 * k;
    p.sx = 1 - 0.025 * k;
    p.by = -0.8 * k;
    p.hL = [p.hL[0] - k * 0.8, p.hL[1] - k * 1.2];
    p.hR = [p.hR[0] + k * 0.8, p.hR[1] - k * 1.2];
    p.flame.wob = Math.sin(f * 2.1) * 2;
    p.flame.scale = 1 + 0.06 * Math.sin(f * 1.7);
    if (f === n - 2) p.blink = 1;
    return p;
  }

  function runLegs(p, f, n) {
    const ph = (f / n) * TAU;
    const view = p.view;
    const c = Math.cos(ph),
      s = Math.sin(ph);
    p.by = -4.5 + 5 * Math.abs(c);
    p.sy = 1 + 0.06 * (1 - Math.abs(c));
    p.sx = 1 / p.sy;
    if (view === 'side') {
      p.fR = [14 * c, -Math.max(0, -s) * 11];
      p.fL = [-14 * c, -Math.max(0, s) * 11];
      p.kR = -6;
      p.kL = -6;
      p.rotFR = -Math.max(0, -s) * 0.4;
      p.rotFL = -Math.max(0, s) * 0.4;
      p.lean = 0.14;
      p.flame.lean = -0.45;
      p.flame.len = 1.12;
    } else {
      const toward = view === 'down' ? 1 : -1;
      p.fR = [8, -Math.max(0, -s) * 9 + toward * 2 * c];
      p.fL = [-8, -Math.max(0, s) * 9 - toward * 2 * c];
      p.bx = 1.5 * s;
      p.lean = 0.04 * s;
      p.flame.lean = -0.25 * s;
      p.flame.len = 1.08;
    }
    p.flame.wob = Math.sin(f * 2.3) * 2.5;
    return { c, s };
  }

  function run(view, f, n) {
    const p = pose(view);
    const { c, s } = runLegs(p, f, n);
    if (view === 'side') {
      p.hR = [4 - 13 * c, -22 - 3 * s];
      p.hL = [-4 + 13 * c, -24 + 3 * s];
      p.rR = Math.PI * 0.35 - c * 0.6;
      p.rL = Math.PI * 0.65 + c * 0.6;
      p.look = [1, 0];
      p.mouthOpen = 0.7;
    } else {
      const toward = view === 'down' ? 1 : -1;
      p.hL = [-25, -19 + 6 * c * toward];
      p.hR = [25, -19 - 6 * c * toward];
    }
    return p;
  }

  function aimArm(p, dirName, recoil, flash) {
    const a = DIRS[dirName].a;
    p.aimA = a;
    p.aimLen = 24 - recoil * 4;
    p.flashRot = flash;
    p.pR = 'point';
    p.look = p.view === 'side' ? [Math.cos(a), Math.sin(a) * 0.8] : [0.2, p.view === 'down' ? 0.9 : -0.9];
    if (p.view === 'side') p.lean -= recoil * 0.05;
    p.mouth = 'grit';
    p.brow = 0.8;
  }

  function shoot(dirName, f, n) {
    const p = pose(DIRS[dirName].view);
    const recoil = f % 2 === 0 ? 1 : 0;
    p.sy = 1 - recoil * 0.03;
    p.sx = 1 + recoil * 0.03;
    if (p.view !== 'side') {
      p.hL = [-25, -18];
    }
    aimArm(p, dirName, recoil, recoil ? 0.4 + f : 0);
    p.flame.wob = f;
    return p;
  }
  function runShoot(dirName, f, n) {
    const p = pose(DIRS[dirName].view);
    const { c, s } = runLegs(p, f, n);
    if (p.view === 'side') {
      p.hL = [-4 + 12 * c, -24 + 3 * s];
      p.rL = Math.PI * 0.65 + c * 0.6;
    } else p.hL = [-25, -19 + 6 * c];
    const recoil = f % 2 === 0 ? 1 : 0;
    aimArm(p, dirName, recoil, recoil ? 0.4 + f : 0);
    return p;
  }

  function dash(view, f) {
    const p = pose(view);
    p.mouth = 'grit';
    p.brow = 1;
    p.lid = 0.25;
    if (view === 'side') {
      const k = [
        { sx: 1.2, sy: 0.8, bx: -3, by: 3, lean: -0.2, fl: [-0.2, 1] },
        { sx: 1.6, sy: 0.7, bx: 10, by: 0, lean: 0.35, fl: [-1.25, 1.9] },
        { sx: 1.5, sy: 0.74, bx: 12, by: -1, lean: 0.3, fl: [-1.3, 1.8] },
        { sx: 1.18, sy: 0.88, bx: 8, by: 0, lean: 0.18, fl: [-0.9, 1.4] },
        { sx: 0.9, sy: 1.12, bx: 3, by: -1, lean: -0.08, fl: [-0.3, 1.15] },
        { sx: 1.03, sy: 0.97, bx: 1, by: 0, lean: 0, fl: [-0.1, 1] },
      ][f];
      Object.assign(p, { sx: k.sx, sy: k.sy, bx: k.bx, by: k.by, lean: k.lean });
      p.flame.lean = k.fl[0];
      p.flame.len = k.fl[1];
      if (f === 0) {
        p.fL = [-12, 0];
        p.fR = [8, 0];
        p.hL = [-22, -16];
        p.hR = [-6, -20];
      } else if (f <= 2) {
        p.fL = [-24, -7];
        p.fR = [-12, -3];
        p.rotFL = -0.5;
        p.rotFR = -0.3;
        p.hL = [-24, -30];
        p.hR = [-16, -24];
        p.rL = Math.PI;
        p.rR = Math.PI * 0.9;
        p.pL = p.pR = 'open';
        p.extras.push({ t: 'speed', x: -18, y: -36, dir: 1, n: 5, len: 34, spread: 40, under: true });
        if (f === 1) p.extras.push({ t: 'ghostTrail', x: -12, y: 0, a: 0.35, under: true });
      } else if (f === 3) {
        p.fL = [-12, -2];
        p.fR = [4, 0];
        p.hL = [-16, -22];
        p.hR = [-2, -22];
      } else {
        p.fL = [-6, 0];
        p.fR = [9, 0];
      }
      if (f >= 1 && f <= 3) p.extras.push({ t: 'puff', x: -22 - f * 4, y: -4, r: 7 - f, col: '#f3ead8', under: true });
    } else {
      const dirY = view === 'down' ? 1 : -1;
      const k = [
        [0.82, 1.22, 0],
        [0.72, 1.55, 8],
        [0.75, 1.45, 10],
        [0.86, 1.2, 7],
        [1.12, 0.9, 2],
        [0.98, 1.02, 0],
      ][f];
      p.sx = k[0];
      p.sy = k[1] * (f === 0 ? 0.7 : 1);
      if (f === 0) p.sx = 1.2;
      p.by = k[2] * dirY * 0.5;
      p.flame.len = f >= 1 && f <= 3 ? 1.6 : 1;
      if (f >= 1 && f <= 3) {
        p.hL = [-24, -30];
        p.hR = [24, -30];
        p.pL = p.pR = 'open';
        p.rL = -Math.PI * 0.8;
        p.rR = -Math.PI * 0.2;
        p.extras.push({ t: 'vspeed', x: 0, y: dirY > 0 ? -70 : 6, dir: dirY, len: 26, spread: 36, under: true });
      }
    }
    return p;
  }

  function hurt(f) {
    const p = pose('side');
    p.eyes = f < 2 ? 'wide' : 'normal';
    p.mouth = f < 2 ? 'o' : 'sad';
    p.brow = -1;
    const k = [
      [0.8, 1.25, -0.3, 1.7],
      [1.18, 0.86, -0.15, 1.3],
      [1.05, 0.96, -0.05, 1.05],
      [1, 1, 0, 1],
    ][f];
    p.sx = k[0];
    p.sy = k[1];
    p.lean = k[2];
    p.flame.scale = k[3];
    p.flame.lean = 0.3;
    p.hL = [-24, -48];
    p.hR = [10, -52];
    p.pL = p.pR = 'open';
    p.rL = -Math.PI * 0.75;
    p.rR = -Math.PI * 0.35;
    p.fL = [-12, -2];
    p.fR = [4, -5];
    if (f === 0) p.extras.push({ t: 'sparkle', x: 18, y: -70, r: 7 }, { t: 'sparkle', x: -20, y: -62, r: 5, rot: 0.4 });
    return p;
  }

  function death(f) {
    const p = pose('down');
    const steps = [
      { sx: 0.82, sy: 1.22, fl: 1.6, eyes: 'wide', m: 'o', brow: -1 },
      { sx: 1, sy: 1, fl: 0.7, eyes: 'normal', m: 'sad', brow: -1 },
      { sx: 1, sy: 1, fl: 0.35, eyes: 'normal', m: 'sad', brow: -1 },
      { sx: 1, sy: 1, fl: 0, eyes: 'normal', m: 'o', brow: -1, smoke: 1 },
      { sx: 1.04, sy: 0.93, fl: 0, eyes: 'normal', m: 'sad', brow: -1, lid: 0.45, smoke: 2 },
      { sx: 1.1, sy: 0.85, fl: 0, eyes: 'normal', m: 'sad', brow: -1, lid: 0.55, smoke: 3 },
      { sx: 1.16, sy: 0.8, fl: 0, eyes: 'x', m: 'sad', brow: -1, by: 3, smoke: 4 },
      { sx: 1.22, sy: 0.74, fl: 0, eyes: 'x', m: 'flat', brow: -1, by: 5, smoke: 5 },
      { sx: 1.26, sy: 0.7, fl: 0, eyes: 'x', m: 'flat', brow: -1, by: 6, smoke: 6 },
      { sx: 1.26, sy: 0.7, fl: 0, eyes: 'x', m: 'flat', brow: -1, by: 6, smoke: 7 },
    ][f];
    Object.assign(p, { sx: steps.sx, sy: steps.sy, eyes: steps.eyes, mouth: steps.m, brow: steps.brow, lid: steps.lid || 0, by: steps.by || 0 });
    p.flame.lit = steps.fl > 0 ? 1 : 0;
    p.flame.scale = steps.fl;
    p.hL = f >= 4 ? [-22, -8] : [-24, -40];
    p.hR = f >= 4 ? [22, -8] : [24, -40];
    p.pL = p.pR = f >= 4 ? 'flat' : 'open';
    p.rL = f >= 4 ? Math.PI * 0.9 : -Math.PI * 0.75;
    p.rR = f >= 4 ? Math.PI * 0.1 : -Math.PI * 0.25;
    if (f >= 5) {
      p.fL = [-13, 0];
      p.fR = [13, 0];
    }
    if (steps.smoke) {
      const k = steps.smoke;
      p.extras.push({ t: 'smoke', x: 2 + Math.sin(k) * 3, y: -80 - k * 4 + p.by, r: 5 + k * 0.8, a: Math.max(0.2, 0.9 - k * 0.08) });
      if (k > 2) p.extras.push({ t: 'smoke', x: -6 + Math.cos(k) * 3, y: -98 - k * 3 + p.by, r: 4 + k * 0.5, a: Math.max(0.15, 0.7 - k * 0.08) });
    }
    return p;
  }

  function cheer(f, n) {
    const p = pose('down');
    const air = f === 0 || f === n - 1 ? 0 : Math.sin(((f - 1) / (n - 2)) * Math.PI);
    p.by = -air * 20;
    if (f === 0 || f === n - 1) {
      p.sx = 1.18;
      p.sy = 0.84;
    } else {
      p.sx = 0.92;
      p.sy = 1.1;
    }
    p.fL = [-9, -air * 20 - (air > 0 ? 4 : 0)];
    p.fR = [9, -air * 20 - (air > 0 ? 4 : 0)];
    p.hL = [-26, -64 - air * 20 + Math.sin(f * 1.6) * 4];
    p.hR = [26, -64 - air * 20 - Math.sin(f * 1.6) * 4];
    p.pL = p.pR = 'open';
    p.rL = -Math.PI * 0.62;
    p.rR = -Math.PI * 0.38;
    p.eyes = 'happy';
    p.mouth = 'open';
    p.flame.scale = 1.15;
    if (air > 0.5) p.extras.push({ t: 'sparkle', x: -30, y: -90 - air * 20, r: 6, rot: f }, { t: 'sparkle', x: 32, y: -84 - air * 20, r: 5, rot: f + 1 });
    return p;
  }

  function parry(f) {
    const p = pose('side');
    const spin = [1, 0.4, -0.3, -1, -0.2, 0.8][f];
    p.sx = spin;
    p.sy = 1 + (1 - Math.abs(spin)) * 0.08;
    p.by = -[4, 10, 14, 12, 7, 2][f];
    p.fL = [-6, p.by - 2];
    p.fR = [6, p.by];
    p.hR = [Math.sign(spin || 1) * 24, -46 + p.by];
    p.pR = 'flat';
    p.rR = spin < 0 ? Math.PI : 0;
    p.mouth = 'open';
    p.eyes = f % 2 ? 'normal' : 'happy';
    if (f >= 1 && f <= 4) p.extras.push({ t: 'pink', x: p.hR[0] + Math.sign(spin || 1) * 10, y: p.hR[1] - 4, r: 10 + f * 2, rot: f });
    return p;
  }

  function talk(f) {
    const p = pose('down');
    p.mouth = f % 2 ? 'open' : 'grin';
    p.mouthOpen = 0.3;
    p.hR = [24, -40 + (f % 2) * 4];
    p.pR = 'open';
    p.rR = -Math.PI * 0.3;
    p.by = f % 2 ? -1 : 0;
    return p;
  }

  function ghost(f, n) {
    const p = pose('down');
    const k = Math.sin((f / n) * TAU);
    p.by = -8 - k * 4;
    p.alpha = 0.82;
    p.flame.lit = 0;
    p.mouth = 'o';
    p.brow = -1;
    p.fL = [-6, -10 - k * 4];
    p.fR = [6, -12 - k * 4];
    p.hL = [-26, -40 + k * 6];
    p.hR = [26, -40 - k * 6];
    p.pL = p.pR = 'open';
    p.rL = -Math.PI * 0.8;
    p.rR = -Math.PI * 0.2;
    p.ghost = true;
    p.extras.push({ t: 'halo', x: 0, y: -80 + p.by });
    return p;
  }

  // name: [frames, fps, loop, generator]
  ART.wickAnims = {
    idle_down: [8, 9, true, (f, n) => idle('down', f, n)],
    idle_side: [8, 9, true, (f, n) => idle('side', f, n)],
    idle_up: [8, 9, true, (f, n) => idle('up', f, n)],
    run_down: [8, 14, true, (f, n) => run('down', f, n)],
    run_side: [8, 14, true, (f, n) => run('side', f, n)],
    run_up: [8, 14, true, (f, n) => run('up', f, n)],
    dash_side: [6, 18, false, (f) => dash('side', f)],
    dash_down: [6, 18, false, (f) => dash('down', f)],
    dash_up: [6, 18, false, (f) => dash('up', f)],
    shoot_side: [4, 16, true, (f, n) => shoot('side', f, n)],
    shoot_diagup: [4, 16, true, (f, n) => shoot('diagup', f, n)],
    shoot_diagdown: [4, 16, true, (f, n) => shoot('diagdown', f, n)],
    shoot_up: [4, 16, true, (f, n) => shoot('up', f, n)],
    shoot_down: [4, 16, true, (f, n) => shoot('down', f, n)],
    runshoot_side: [8, 14, true, (f, n) => runShoot('side', f, n)],
    runshoot_diagup: [8, 14, true, (f, n) => runShoot('diagup', f, n)],
    runshoot_diagdown: [8, 14, true, (f, n) => runShoot('diagdown', f, n)],
    runshoot_up: [8, 14, true, (f, n) => runShoot('up', f, n)],
    runshoot_down: [8, 14, true, (f, n) => runShoot('down', f, n)],
    hurt: [4, 12, false, (f) => hurt(f)],
    death: [10, 10, false, (f) => death(f)],
    ghost: [6, 8, true, (f, n) => ghost(f, n)],
    cheer: [8, 12, true, (f, n) => cheer(f, n)],
    parry: [6, 18, false, (f) => parry(f)],
    talk: [4, 8, true, (f) => talk(f)],
  };
  ART.wickPose = (name, f) => {
    const a = ART.wickAnims[name];
    return a[3](f, a[0]);
  };
  // the ghost is a pale see-through recolour of the rig
  const drawRig = ART.drawWick;
  ART.drawWickFrame = (name, f) => {
    const p = ART.wickPose(name, f);
    if (p.ghost) {
      const keep = Object.assign({}, COL);
      COL.wax = COL.ghost;
      COL.wax2 = '#eef4fa';
      COL.shorts = '#b8c8dc';
      COL.shoe = '#9fb0c6';
      drawRig(p);
      Object.assign(COL, keep);
    } else drawRig(p);
  };
})();

