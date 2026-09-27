// The hero: a top-hatted plague-doctor crow in a tattered cloak and red scarf,
// painted in the clean cel style. Reuses the keyed pose library from art/wick.js
// (idle, run, dash, shoot, hurt, death...) and draws it with this rig, so the
// cloak, scarf and hat get follow-through from the same timing.
(function () {
  const CL = G.cel;
  const ART = G.art;
  const COL = {
    cloak: '#2c2735',
    cloakShade: '#15111b',
    rim: '#7a7197',
    lining: '#4a4458',
    head: '#231f2b',
    beak: '#8c8893',
    beakShade: '#5c5866',
    eyeWhite: '#ffe1d8',
    iris: '#ff3b30',
    hat: '#1e1a24',
    band: '#b3261e',
    scarf: '#e8453a',
    glove: '#e9d8b4',
    boot: '#3b3544',
  };
  const PALE = {
    cloak: '#c9d6e6',
    cloakShade: '#9fb0c8',
    rim: '#ffffff',
    lining: '#b4c3d8',
    head: '#b9c8dc',
    beak: '#e6eef8',
    beakShade: '#c2cfe0',
    eyeWhite: '#ffffff',
    iris: '#8fb0d8',
    hat: '#aab9cf',
    band: '#d6e2f0',
    scarf: '#e6eef8',
    glove: '#f4f8fc',
    boot: '#b4c3d8',
  };
  let K = COL;

  // cloak / scarf shapes react to motion: trail > 0 means "streaming behind"
  function cloakPts(view, tr, wob) {
    if (view === 'side') {
      const bk = (x, y, k) => [x - tr * 16 * k, y - tr * 9 * k + Math.sin(wob + k * 3) * tr * 2];
      return [
        [-9, -36],
        [10, -36],
        [18, -27],
        [22, -8],
        [25, 9],
        [19, 13],
        [15, 7],
        [9, 14],
        [3, 7],
        bk(-4, 14, 0.4),
        bk(-9, 7, 0.6),
        bk(-16, 13, 0.85),
        bk(-21, 5, 1),
        bk(-25, -8, 0.8),
        [-19, -27],
      ];
    }
    const flap = Math.sin(wob) * tr * 3;
    return [
      [-11, -36],
      [11, -36],
      [20, -26],
      [23, -6],
      [26 + flap, 10],
      [20, 14],
      [15, 8],
      [9, 15],
      [3, 8],
      [-3, 15],
      [-9, 8],
      [-15, 15],
      [-20, 8],
      [-26 - flap, 11],
      [-23, -6],
      [-20, -26],
    ];
  }

  function rimLight(poly) {
    // cool rim light along the lit (upper-left) edge so the black cloak reads on dark floors
    const c = G.ctx;
    c.save();
    c.beginPath();
    CL.trace(c, poly);
    c.clip();
    c.beginPath();
    c.moveTo(poly[0][0] + 2.5, poly[0][1] + 2.5);
    for (let i = 1; i < poly.length; i++) c.lineTo(poly[i][0] + 2.5, poly[i][1] + 2.5);
    c.closePath();
    c.strokeStyle = K.rim;
    c.lineWidth = 2.6;
    c.stroke();
    c.restore();
  }

  function scarf(view, tr, wob) {
    if (view === 'side') {
      const len = 16 + tr * 16;
      const y0 = -34;
      const tail = (dy, ph) => {
        const pts = [[-6, y0 + dy]];
        for (let i = 1; i <= 4; i++) pts.push([-6 - (len * i) / 4, y0 + dy + i * (3 - tr * 2.2) + Math.sin(wob + ph + i * 1.3) * (1.5 + tr * 2.5)]);
        return pts;
      };
      CL.stroke(tail(0, 0), 7, CL.INK, { taper: 0.0, taperEnd: 0.5 });
      CL.stroke(tail(0, 0), 4.6, K.scarf, { taper: 0, taperEnd: 0.5 });
      CL.stroke(tail(4, 1.7), 6, CL.INK, { taper: 0.0, taperEnd: 0.5 });
      CL.stroke(tail(4, 1.7), 3.8, K.scarf, { taper: 0, taperEnd: 0.5 });
    } else if (view === 'up') {
      const pts = [[-4, -34]];
      for (let i = 1; i <= 4; i++) pts.push([-4 + Math.sin(wob + i) * (2 + tr * 3), -34 + i * 5.5]);
      CL.stroke(pts, 8, CL.INK, { taper: 0, taperEnd: 0.4 });
      CL.stroke(pts, 5.4, K.scarf, { taper: 0, taperEnd: 0.4 });
    } else {
      // tail thrown over the left shoulder, as on the reference sprite
      const pts = [[-12, -34]];
      for (let i = 1; i <= 4; i++) pts.push([-14 - i * 1.5 - tr * i * 1.5, -34 + i * 5.5 + Math.sin(wob + i * 1.2) * (1 + tr * 2)]);
      CL.stroke(pts, 8, CL.INK, { taper: 0, taperEnd: 0.4 });
      CL.stroke(pts, 5.4, K.scarf, { taper: 0, taperEnd: 0.4 });
    }
  }

  function eyes(p, view, headX) {
    const c = G.ctx;
    const glow = (x, y, r) => {
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(255,70,50,0.45)');
      g.addColorStop(1, 'rgba(255,70,50,0)');
      c.fillStyle = g;
      c.beginPath();
      c.arc(x, y, r, 0, Math.PI * 2);
      c.fill();
    };
    const pos = view === 'side' ? [[headX + 1, -50, 4.2, 6.4], [headX + 9, -50, 5.8, 7.8]] : [[-7, -50, 5.8, 7.8], [7, -50, 5.8, 7.8]];
    if (p.eyes === 'x') {
      pos.forEach(([x, y, w]) => {
        CL.stroke([[x - w * 0.8, y - w * 0.8], [x + w * 0.8, y + w * 0.8]], 2.4, K.iris, { taper: 0.2 });
        CL.stroke([[x + w * 0.8, y - w * 0.8], [x - w * 0.8, y + w * 0.8]], 2.4, K.iris, { taper: 0.2 });
      });
      return;
    }
    pos.forEach(([x, y]) => glow(x, y, 8));
    if (p.eyes === 'happy') {
      pos.forEach(([x, y, w]) => CL.stroke([[x - w, y + 2], [x, y - 3.5], [x + w, y + 2]], 2.8, K.iris, { taper: 0.25 }));
      return;
    }
    const big = p.eyes === 'wide' ? 1.25 : 1;
    // determined by default: the lids cut in at an angle; worried flips it
    const tilt = p.brow >= 0 ? 0.35 + p.brow * 0.25 : -0.35;
    pos.forEach(([x, y, w, h], i) => {
      CL.eye(x, y, w * big, h * big, p.look[0], p.look[1], {
        blink: p.blink,
        lid: p.eyes === 'wide' ? 0 : Math.max(p.lid || 0, 0.18),
        lidTilt: view === 'side' ? tilt : i === 0 ? -tilt : tilt,
        lidColor: K.head,
        iris: K.iris,
        white: K.eyeWhite,
      });
    });
  }

  function beak(p, view, headX) {
    const open = p.mouth === 'open' || p.mouth === 'o' ? 1 : p.mouth === 'grin' ? 0.25 : 0;
    const sh = { lw: 2.6, shade: K.beakShade, cast: 0.3 };
    if (view === 'side') {
      const bx = headX + 9;
      // lower jaw hinges open for shouts
      CL.shape([[bx, -41], [bx + 16, -38 + open * 5], [bx + 22, -34 + open * 7], [bx + 4, -37 + open * 2]], K.beakShade, { lw: 2.2, shade: false });
      CL.shape([[bx - 2, -46], [bx + 12, -46], [bx + 24, -41], [bx + 27, -35], [bx + 20, -38], [bx + 4, -39]], K.beak, sh);
      CL.oval(bx + 12, -43.5, 1.2, 0.9, CL.INK, { lw: 0, shade: false });
      CL.stroke([[bx + 2, -42], [bx + 18, -39.5]], 1.2, CL.INK, { taper: 0.4 });
    } else if (view === 'down') {
      if (open) CL.shape([[-4, -40], [4, -40], [0, -30 + open * 3]], '#6a1418', { lw: 2, shade: false });
      CL.shape([[-7, -46], [7, -46], [5.5, -38], [2, -24 - open * 2], [-2, -24 - open * 2], [-5.5, -38]], K.beak, sh);
      CL.oval(-2.2, -40, 1, 1.4, CL.INK, { lw: 0, shade: false });
      CL.oval(2.2, -40, 1, 1.4, CL.INK, { lw: 0, shade: false });
      CL.stroke([[0, -45], [0, -27]], 1.1, CL.INK, { taper: 0.4 });
    }
  }

  function hat(p, view, headX, tr, dead) {
    const c = G.ctx;
    c.save();
    // hat lags behind the body: tips back when running, bobs with squash
    const tilt = view === 'side' ? -tr * 0.22 + (dead ? -0.9 : 0) : (dead ? -0.6 : 0) + (p.bx || 0) * 0.01;
    c.translate(headX + (dead ? -10 : 0), -58 + (dead ? 6 : 0));
    c.rotate(tilt);
    const topW = view === 'side' ? 12 : 13;
    CL.shape([[-topW + 1, -21], [topW, -21], [topW - 1.5, 0], [-topW + 2.5, 0]], K.hat, { lw: 3, sharp: true, cast: 0.3 });
    rimLight(CL.smooth([[-topW + 1, -21], [topW, -21], [topW - 1.5, 0], [-topW + 2.5, 0]], true, 3));
    CL.shape([[-topW + 2, -6], [topW - 1, -6], [topW - 1.2, -1], [-topW + 2.3, -1]], K.band, { lw: 1.8, sharp: true, cast: 0.3 });
    CL.oval(view === 'side' ? 2 : 0.5, 0.5, view === 'side' ? 18 : 19, 4.2, K.hat, { lw: 2.8, cast: 0.3 });
    c.restore();
  }

  ART.drawHero = (p) => {
    const c = G.ctx;
    K = p.ghost ? PALE : COL;
    c.save();
    if (p.alpha < 1) c.globalAlpha = p.alpha;
    const view = p.view;
    const side = view === 'side';
    const tr = Math.max(0, -(p.flame.lean || 0)) * (p.flame.len || 1) * (side ? 1 : 0.6) + (p.view !== 'side' && p.flame.len > 1.3 ? 0.8 : 0);
    const wob = (p.flame.wob || 0) * 0.8 + p.by * 0.3;
    const dead = p.eyes === 'x' || (p.flame.lit === 0 && !p.ghost);
    CL.ground(0, 0, 23 * Math.max(0.7, p.sx), 6.5);
    const hipY = -20 + p.by;
    const cs = Math.cos(p.lean),
      sn = Math.sin(p.lean);
    const T = (x, y) => [p.bx + x * p.sx * cs - y * p.sy * sn, hipY + x * p.sx * sn + y * p.sy * cs];
    (p.extras || []).filter((e) => e.under).forEach((e) => ART.drawExtra && ART.drawExtra(e));

    const shL = T(side ? -8 : -17, -27),
      shR = T(side ? 10 : 17, -27);
    const hipL = T(side ? -4 : -7, 2),
      hipR = T(side ? 5 : 7, 2);
    CL.gloveColor = K.glove;
    const arm = (sh, h, rot, pz) => {
      CL.hose(sh[0], sh[1], h[0], h[1], sh[0] < p.bx ? 4 : -4, 6.5, K.cloak === COL.cloak ? '#17131d' : K.cloakShade);
      CL.glove(h[0], h[1], 7.8, rot, pz, h[0] < sh[0] && pz === 'point' ? -1 : 1);
    };
    // far arm
    if (side) arm(shL, p.hL, p.rL, p.pL);
    // legs peek out under the cloak
    CL.hose(hipL[0], hipL[1], p.fL[0], p.fL[1] - 4, p.kL, 4.6);
    CL.hose(hipR[0], hipR[1], p.fR[0], p.fR[1] - 4, p.kR, 4.6);
    const boot = (f, dir, rot) => {
      if (side) CL.shoe(f[0], f[1] - 4, 10.5, 1, K.boot, rot);
      else if (view === 'down') CL.oval(f[0] + dir * 2, f[1] - 3.5, 10, 7, K.boot, { lw: 2.6, cast: 0.3 });
      else CL.oval(f[0], f[1] - 4, 8.5, 6, K.boot, { lw: 2.6, cast: 0.3 });
    };
    boot(p.fL, -1, p.rotFL);
    boot(p.fR, 1, p.rotFR);

    c.save();
    c.translate(p.bx, hipY);
    c.rotate(p.lean);
    c.scale(p.sx, p.sy);
    // scarf tails behind the cloak in side/up views
    if (view !== 'down') scarf(view, tr, wob);
    // cloak
    const cp = CL.smooth(cloakPts(view, tr, wob), true, 4);
    CL.fill(cp, K.cloak, { lw: 3.2, shade: K.cloakShade, cast: 0.3, castDir: [1, 0.35], hl: false });
    rimLight(cp);
    if (view === 'down') {
      // front opening with the grey lining (the lighter strip on the pixel sprite)
      CL.shape([[3, -30], [8, -30], [10, 12], [4, 8]], K.lining, { lw: 2, cast: 0.3, hl: false });
    } else if (side) {
      CL.shape([[12, -24], [17, -24], [21, 9], [15, 6]], K.lining, { lw: 2, cast: 0.3, hl: false });
    } else CL.stroke([[0, -32], [0, 8]], 1.8, CL.INK, { taper: 0.3 });
    // scarf wrap around the neck (under the head so the beak can overlap it)
    CL.shape([[-13, -38], [13, -38], [14, -32], [-14, -32]], K.scarf, { lw: 2.4, cast: 0.35 });
    // head
    const headX = side ? 3 : 0;
    CL.oval(headX, -48, 15, 13.5, K.head, { lw: 3, cast: 0.25, hl: false });
    if (view !== 'up') {
      eyes(p, view, headX);
      beak(p, view, headX);
    }
    if (view === 'down') scarf(view, tr, wob);
    hat(p, view, headX, tr, dead);
    c.restore();

    if (p.aimA != null) {
      const a = p.aimA;
      p.hR = [shR[0] + Math.cos(a) * p.aimLen, shR[1] + Math.sin(a) * p.aimLen];
      p.rR = a;
      if (p.flashRot) p.extras.push({ t: 'flash', x: p.hR[0] + Math.cos(a) * 19, y: p.hR[1] + Math.sin(a) * 19, r: 8, rot: p.flashRot });
    }
    if (side) arm(shR, p.hR, p.rR, p.pR);
    else {
      arm(shL, p.hL, p.rL, p.pL);
      arm(shR, p.hR, p.rR, p.pR);
    }
    CL.gloveColor = null;
    (p.extras || []).filter((e) => !e.under && e.t !== 'halo').forEach((e) => ART.drawExtra && ART.drawExtra(e));
    if (p.ghost) {
      c.strokeStyle = '#f6d44a';
      c.lineWidth = 3;
      c.beginPath();
      c.ellipse(p.bx, hipY - 88, 15, 4.5, 0, 0, Math.PI * 2);
      c.stroke();
    }
    c.restore();
  };

  ART.drawHeroFrame = (name, f) => ART.drawHero(ART.wickPose(name, f));
  ART.sheets = ART.sheets || {};
  ART.sheets.hero = { cell: [128, 144], anchor: [64, 128], scale: 1.5, cols: 16, anims: ART.wickAnims, draw: ART.drawHeroFrame };
})();
