// Characters: Wick (the candle hero), Granny Tallow, the townsfolk, the shopkeepers
// and Mr. Sprocket the Projectionist. All drawn with rubber-hose limbs, pie-cut eyes
// and white gloves. (x, y) is always the point between the character's feet.
(function () {
  const K = G.ink,
    C = K.C;
  const CH = (G.chars = {});

  // ---------- flame (Wick's head-light) ----------
  CH.flame = (x, y, s = 1, lit = 1) => {
    if (lit <= 0) return;
    const c = G.ctx;
    const f1 = Math.sin(G.animT * 17) * 2.5,
      f2 = Math.cos(G.animT * 23) * 1.5;
    c.save();
    c.translate(x, y);
    c.scale(s * lit, s * lit);
    const glow = c.createRadialGradient(0, -10, 2, 0, -10, 40);
    glow.addColorStop(0, 'rgba(255,210,120,0.35)');
    glow.addColorStop(1, 'rgba(255,210,120,0)');
    c.fillStyle = glow;
    c.beginPath();
    c.arc(0, -10, 40, 0, Math.PI * 2);
    c.fill();
    K.shape(
      [[0, 2], [-9, -6], [-8, -16], [-2 + f2, -26], [f1, -34], [4, -22], [9, -12], [8, -4]],
      C.orange,
      { smooth: true, lw: 2.6 }
    );
    K.shape([[0, 0], [-5, -6], [-3, -14], [f1 * 0.6, -22], [4, -12], [5, -5]], C.yellow, { smooth: true, lw: 0 });
    c.restore();
  };

  // ---------- WICK ----------
  // p: {fx, fy, moving, phase, aim(rad|null), rolling, rollT, rollDir, alpha, blink, mood, scale, seed, lit, pose}
  CH.wick = (x, y, p = {}) => {
    const c = G.ctx;
    const s = p.scale || 1;
    c.save();
    c.translate(x, y);
    c.scale(s, s);
    if (p.alpha != null) c.globalAlpha = p.alpha;
    K.seed(p.seed || 11);
    K.shadow(0, 0, 20, 6);
    const fx = p.fx == null ? 1 : p.fx;
    const fy = p.fy || 0;
    const back = fy < -0.5 && Math.abs(fx) < 0.6;
    const side = Math.abs(fx) > 0.35 ? Math.sign(fx) : 0;
    const ph = p.phase || 0;
    const t = G.animT;
    if (p.rolling) {
      // tumble: squash and spin, trailing speed lines
      const k = p.rollT || 0;
      c.save();
      c.translate(0, -24);
      const dir = p.rollDir || 1;
      for (let i = 0; i < 3; i++)
        K.line([[-dir * (26 + i * 8), -8 + i * 8], [-dir * (46 + i * 12), -8 + i * 8]], 2.2);
      c.rotate(k * Math.PI * 2 * dir);
      c.scale(1.1, 0.85);
      K.blob(0, 0, 20, 20, C.cream, { lw: 3, shade: true });
      K.blob(0, 8, 18, 9, C.red, { lw: 2.5 });
      K.glove(-12, -6, 6, 0, 'fist');
      K.glove(12, 6, 6, Math.PI, 'fist');
      CH.flame(0, -18, 0.6, p.lit == null ? 1 : p.lit);
      c.restore();
      c.restore();
      return;
    }
    const bob = p.moving ? -Math.abs(Math.sin(ph)) * 4 : Math.sin(t * 3) * 1.2;
    const hipY = -20 + bob;
    // legs
    const legSwing = p.moving ? Math.sin(ph) : 0;
    const lift = (v) => (p.moving ? Math.max(0, v) * 5 : 0);
    const lf = [-7 + legSwing * 9 * (side || 0.5), -3 - lift(Math.cos(ph))];
    const rf = [7 - legSwing * 9 * (side || 0.5), -3 - lift(-Math.cos(ph))];
    K.hose(-6, hipY, lf[0], lf[1], 4 * legSwing, 5);
    K.hose(6, hipY, rf[0], rf[1], -4 * legSwing, 5);
    K.shoe(lf[0], lf[1], 8.5, side || -1);
    K.shoe(rf[0], rf[1], 8.5, side || 1);
    // arms setup
    const shL = [-14, -42 + bob],
      shR = [14, -42 + bob];
    const armSwing = p.moving ? Math.sin(ph) * 10 : Math.sin(t * 3) * 2;
    let handL = [-22, -26 + bob + armSwing * 0.3],
      handR = [22, -26 + bob - armSwing * 0.3];
    let poseL = 'fist',
      poseR = 'fist',
      rotL = Math.PI,
      rotR = 0;
    if (p.pose === 'cheer') {
      handL = [-26, -66 + bob + Math.sin(t * 12) * 3];
      handR = [26, -66 + bob - Math.sin(t * 12) * 3];
      poseL = poseR = 'open';
      rotL = -Math.PI / 2 - 0.4;
      rotR = -Math.PI / 2 + 0.4;
    } else if (p.pose === 'wave') {
      handR = [28, -64 + bob];
      poseR = 'wave';
      rotR = -Math.PI / 2 + Math.sin(t * 10) * 0.5;
    } else if (p.pose === 'shrug') {
      handL = [-28, -46 + bob];
      handR = [28, -46 + bob];
      poseL = poseR = 'open';
      rotL = Math.PI + 0.5;
      rotR = -0.5;
    }
    let aimHand = null;
    if (p.aim != null) {
      const a = p.aim;
      const useR = Math.cos(a) >= 0;
      const sh = useR ? shR : shL;
      const recoil = p.shooting ? (Math.floor(G.t * 20) % 2) * 3 : 0;
      aimHand = { sh, x: sh[0] + Math.cos(a) * (22 - recoil), y: sh[1] + Math.sin(a) * (22 - recoil), a, useR };
      if (useR) handR = null;
      else handL = null;
    }
    const drawArm = (sh, h, rot, pose) => {
      if (!h) return;
      K.hose(sh[0], sh[1], h[0], h[1], sh[0] < 0 ? 5 : -5, 4.5);
      K.glove(h[0], h[1], 6.5, rot, pose);
    };
    // back arm when aiming upward is drawn before body
    const aimBehind = aimHand && Math.sin(aimHand.a) < -0.3;
    if (aimBehind) {
      K.hose(aimHand.sh[0], aimHand.sh[1], aimHand.x, aimHand.y, 0, 4.5);
      K.glove(aimHand.x, aimHand.y, 6.5, aimHand.a, 'point');
    }
    // body: a stout candle
    const top = -66 + bob;
    K.rrect(-16, top, 32, 50, 12, C.cream, { lw: 3.2 });
    c.save();
    c.beginPath();
    c.rect(-16, top, 32, 50);
    c.clip();
    c.fillStyle = 'rgba(120,70,30,0.13)';
    c.fillRect(side >= 0 ? 6 : -16, top, 10, 50);
    c.restore();
    // wax drips over the rim
    K.shape([[-16, top + 10], [-16, top + 2], [-4, top - 1], [10, top], [16, top + 4], [16, top + 14], [12, top + 17], [9, top + 9], [3, top + 12], [-1, top + 20], [-5, top + 11], [-11, top + 14]], '#fffaf0', { lw: 2.4, smooth: true, amt: 0.7 });
    // shorts with two buttons
    K.rrect(-17, -30 + bob, 34, 14, 5, C.red, { lw: 3 });
    if (!back) {
      K.blob(-7, -24 + bob, 2.8, 2.8, C.white, { lw: 1.5, amt: 0.3 });
      K.blob(7, -24 + bob, 2.8, 2.8, C.white, { lw: 1.5, amt: 0.3 });
    }
    // face
    if (!back) {
      const ox = side * 5 + fx * 1.5,
        oy = fy * 2;
      const blink = p.blink || (Math.sin(G.t * 1.3 + (p.seed || 0)) > 0.985 ? 1 : 0);
      K.pieEye(-6 + ox, -48 + bob + oy, 5, 8, fx, fy, blink);
      K.pieEye(6 + ox, -48 + bob + oy, 5, 8, fx, fy, blink);
      // cheeks
      c.fillStyle = 'rgba(230,110,90,0.45)';
      c.beginPath();
      c.ellipse(-11 + ox, -38 + bob, 4, 2.5, 0, 0, Math.PI * 2);
      c.ellipse(11 + ox, -38 + bob, 4, 2.5, 0, 0, Math.PI * 2);
      c.fill();
      // mouth
      const mood = p.mood || 'grin';
      if (mood === 'grin') {
        K.shape([[-7 + ox, -40 + bob], [7 + ox, -40 + bob], [0 + ox, -33 + bob]], C.darkred, { lw: 2.2, smooth: true, amt: 0.5 });
      } else if (mood === 'o') {
        K.blob(ox, -37 + bob, 3, 4, C.darkred, { lw: 2, amt: 0.3 });
      } else if (mood === 'sad') {
        K.line([[-5 + ox, -35 + bob], [ox, -38 + bob], [5 + ox, -35 + bob]], 2.2, K.INK, { smooth: true });
      } else if (mood === 'talk') {
        const open = Math.abs(Math.sin(G.t * 18)) * 4 + 1;
        K.blob(ox, -37 + bob, 5, open, C.darkred, { lw: 2, amt: 0.3 });
      } else {
        K.line([[-5 + ox, -38 + bob], [5 + ox, -38 + bob]], 2.2);
      }
    }
    // wick + flame
    K.line([[0, top + 1], [1, top - 6]], 2.5);
    CH.flame(1, top - 5, 0.9, p.lit == null ? 1 : p.lit);
    drawArm(shL, handL, rotL, poseL);
    drawArm(shR, handR, rotR, poseR);
    if (aimHand && !aimBehind) {
      K.hose(aimHand.sh[0], aimHand.sh[1], aimHand.x, aimHand.y, 0, 4.5);
      K.glove(aimHand.x, aimHand.y, 6.5, aimHand.a, 'point');
      if (p.shooting && Math.floor(G.t * 20) % 2 === 0) {
        const mx = aimHand.x + Math.cos(aimHand.a) * 16,
          my = aimHand.y + Math.sin(aimHand.a) * 16;
        K.star(mx, my, 7, C.yellow, 5, G.t * 10, { lw: 1.5 });
      }
    }
    c.restore();
  };

  // ghost for the death card: Wick's snuffed spirit floats upward
  CH.wickGhost = (x, y, s = 1) => {
    const c = G.ctx;
    c.save();
    c.translate(x, y);
    c.scale(s, s);
    c.globalAlpha = 0.85;
    K.seed(77);
    K.blob(0, -58, 18, 5, null, { lw: 2.5 }); // halo
    K.shape([[-15, -48], [15, -48], [17, -10], [10, -2], [4, -8], [-2, 0], [-8, -8], [-16, -2]], '#dfe7f0', { smooth: true, lw: 3 });
    K.pieEye(-6, -34, 4, 6, 0, -1, 0);
    K.pieEye(6, -34, 4, 6, 0, -1, 0);
    K.line([[-4, -22], [0, -24], [4, -22]], 2, K.INK, { smooth: true });
    c.restore();
  };

  // ---------- generic toon for townsfolk / NPCs ----------
  // spec: {body, color, color2, hat, name}
  // p: {phase, moving, fx, mood, carry(itemId), scale, seed, talk, emote}
  CH.toon = (x, y, spec, p = {}) => {
    const c = G.ctx;
    const s = p.scale || 1;
    c.save();
    c.translate(x, y);
    c.scale(s * (p.flip ? -1 : 1), s);
    K.seed(p.seed || spec.seed || 5);
    K.shadow(0, 0, spec.body === 'walrus' ? 34 : 18, 6);
    const ph = p.phase || 0;
    const t = G.animT;
    const bob = p.moving ? -Math.abs(Math.sin(ph)) * 3.5 : Math.sin(t * 2.5 + (p.seed || 0)) * 1.2;
    const fx = p.fx || 0;
    const sw = p.moving ? Math.sin(ph) : 0;
    const hipY = -18 + bob;
    const legW = spec.body === 'walrus' ? 7 : 4.5;
    const lfx = spec.body === 'walrus' ? -14 : -6;
    const lf = [lfx - 1 + sw * 7, -3 - (p.moving ? Math.max(0, Math.cos(ph)) * 4 : 0)];
    const rf = [-lfx + 1 - sw * 7, -3 - (p.moving ? Math.max(0, -Math.cos(ph)) * 4 : 0)];
    if (spec.body !== 'bottle' || true) {
      K.hose(lfx, hipY, lf[0], lf[1], 3 * sw, legW);
      K.hose(-lfx, hipY, rf[0], rf[1], -3 * sw, legW);
      K.shoe(lf[0], lf[1], spec.body === 'walrus' ? 11 : 7.5, -1, spec.shoe || '#4a2f22');
      K.shoe(rf[0], rf[1], spec.body === 'walrus' ? 11 : 7.5, 1, spec.shoe || '#4a2f22');
    }
    const B = BODIES[spec.body] || BODIES.egg;
    const info = B(spec, bob, p);
    // arms
    const sh = info.shoulder;
    const swing = p.moving ? Math.sin(ph) * 8 : 0;
    let hl = [-sh[0] - 9, sh[1] + 16 + swing * 0.3],
      hr = [sh[0] + 9, sh[1] + 16 - swing * 0.3];
    let rl = Math.PI,
      rr = 0,
      pl = 'fist',
      pr = 'fist';
    if (p.carry) {
      hl = [-10, sh[1] + 8];
      hr = [10, sh[1] + 8];
      pl = pr = 'open';
      rl = -Math.PI / 2 - 0.3;
      rr = -Math.PI / 2 + 0.3;
    } else if (p.talk) {
      hr = [sh[0] + 14, sh[1] - 6 + Math.sin(G.t * 8) * 4];
      pr = 'open';
      rr = -0.6;
    } else if (p.mood === 'angry') {
      hl = [-sh[0] - 4, sh[1] + 12];
      hr = [sh[0] + 4, sh[1] + 12];
    } else if (p.mood === 'ecstatic') {
      hl = [-sh[0] - 12, sh[1] - 16 + Math.sin(G.t * 14) * 3];
      hr = [sh[0] + 12, sh[1] - 16 - Math.sin(G.t * 14) * 3];
      pl = pr = 'open';
      rl = -Math.PI / 2 - 0.5;
      rr = -Math.PI / 2 + 0.5;
    }
    K.hose(-sh[0], sh[1], hl[0], hl[1], 5, 4);
    K.hose(sh[0], sh[1], hr[0], hr[1], -5, 4);
    if (info.tool) info.tool(hr);
    K.glove(hl[0], hl[1], 5.5, rl, pl);
    K.glove(hr[0], hr[1], 5.5, rr, pr);
    if (p.carry && G.items) G.items.icon(p.carry, 0, sh[1] - 6, 0.8);
    // face
    const f = info.face;
    if (f) {
      const lookX = fx * 0.8;
      const blink = Math.sin(G.t * 1.1 + (p.seed || 0) * 3) > 0.985 ? 1 : 0;
      K.pieEye(f[0] - f[2] + lookX * 3, f[1], f[3], f[4], lookX, p.mood === 'think' ? -0.8 : 0, blink);
      K.pieEye(f[0] + f[2] + lookX * 3, f[1], f[3], f[4], lookX, p.mood === 'think' ? -0.8 : 0, blink);
      if (p.mood === 'angry') {
        K.line([[f[0] - f[2] - 5, f[1] - f[4] - 4], [f[0] - 2, f[1] - f[4] + 1]], 2.6);
        K.line([[f[0] + f[2] + 5, f[1] - f[4] - 4], [f[0] + 2, f[1] - f[4] + 1]], 2.6);
      }
      const my = f[1] + f[4] + 6;
      const mx = f[0] + lookX * 3;
      if (!info.noMouth) {
        if (p.talk) K.blob(mx, my, 4.5, 1.5 + Math.abs(Math.sin(G.t * 16)) * 3, C.darkred, { lw: 1.8, amt: 0.3 });
        else if (p.mood === 'angry' || p.mood === 'meh')
          K.line([[mx - 5, my + 2], [mx, my - 1], [mx + 5, my + 2]], 2.2, K.INK, { smooth: true });
        else if (p.mood === 'ecstatic' || p.mood === 'happy')
          K.shape([[mx - 6, my - 2], [mx + 6, my - 2], [mx, my + 5]], C.darkred, { lw: 2, smooth: true, amt: 0.4 });
        else K.line([[mx - 4, my], [mx, my + 2], [mx + 4, my]], 2, K.INK, { smooth: true });
      }
    }
    if (info.after) info.after();
    c.restore();
    if (p.emote) CH.emote(x, y - (info.top || 70) * s - 22, p.emote, p.emoteT || 0);
  };

  // thought / reaction bubbles above customers
  CH.emote = (x, y, kind, t) => {
    const c = G.ctx;
    const pop = Math.min(1, t * 6);
    c.save();
    c.translate(x, y);
    c.scale(pop, pop);
    K.seed(900);
    K.blob(-10, 20, 3, 3, C.white, { lw: 1.6 });
    K.blob(-4, 14, 4.5, 4.5, C.white, { lw: 1.8 });
    K.blob(0, -4, 22, 16, C.white, { lw: 2.6 });
    if (kind === 'think') {
      for (let i = 0; i < 3; i++) K.blob(-9 + i * 9, -4 + (Math.floor(G.t * 4) % 3 === i ? -3 : 0), 2.8, 2.8, K.INK, { lw: 0 });
    } else if (kind === 'ecstatic') {
      K.shape([[0, 8], [-11, -3], [-8, -11], [0, -6], [8, -11], [11, -3]], C.red, { lw: 2, smooth: true });
    } else if (kind === 'happy') {
      K.coin(0, -4, 9);
      K.text('$', 0, -4, 11, { fill: C.dbrown, lw: 0, shadow: false });
    } else if (kind === 'meh') {
      K.shape([[0, -16], [-6, -2], [0, 6], [6, -2]], C.sky, { lw: 2, smooth: true });
    } else if (kind === 'angry') {
      K.line([[-12, -8], [-4, 0], [-10, 4], [2, -10], [8, 2], [12, -8]], 2.6);
      K.blob(0, -4, 8, 6, null, { lw: 2 });
    } else if (kind === 'wait') {
      K.text('!', 0, -4, 20, { fill: C.yellow, lw: 3, shadow: false });
    } else if (kind === 'bag') {
      K.text('?', 0, -4, 20, { fill: C.cream, lw: 3, shadow: false });
    }
    c.restore();
  };

  // Body library. Each returns {shoulder:[x,y], face:[cx,cy,eyeGap,eyeW,eyeH], top, tool, after, noMouth}
  const BODIES = {
    peanut(spec, b) {
      K.blob(0, -30 + b, 16, 16, spec.color || C.tan, { lw: 3, shade: true });
      K.blob(0, -56 + b, 14, 14, spec.color || C.tan, { lw: 3, shade: true });
      for (let i = 0; i < 5; i++) K.blob(-7 + (i % 3) * 7, -34 + b + Math.floor(i / 3) * 10, 1.2, 1.2, 'rgba(90,60,30,0.6)', { lw: 0 });
      return {
        shoulder: [13, -34 + b],
        face: [0, -58 + b, 5, 4, 6],
        top: 90,
        after() {
          // top hat & monocle
          K.rrect(-10, -94 + b, 20, 22, 3, K.INK, { lw: 2 });
          K.rrect(-16, -74 + b, 32, 5, 2, K.INK, { lw: 2 });
          K.rrect(-10, -78 + b, 20, 4, 1, C.red, { lw: 0 });
          K.blob(5, -58 + b, 6.5, 7.5, null, { lw: 1.8 });
          K.line([[11, -56 + b], [13, -44 + b]], 1);
        },
      };
    },
    bowl(spec, b) {
      K.blob(0, -34 + b, 24, 17, C.white, { lw: 3, shade: true });
      K.line([[-22, -30 + b], [22, -30 + b]], 4, spec.color || C.blue);
      K.blob(0, -52 + b, 18, 5, C.white, { lw: 2.5 });
      K.blob(0, -58 + b, 5, 4, C.white, { lw: 2.2 });
      return {
        shoulder: [20, -36 + b],
        face: [0, -40 + b, 7, 4.5, 6.5],
        top: 70,
        after() {
          K.blob(8, -63 + b, 5, 5, spec.color2 || C.pink, { lw: 2 });
          K.blob(8, -63 + b, 2, 2, C.yellow, { lw: 1 });
        },
      };
    },
    pickle(spec, b) {
      K.blob(0, -40 + b, 14, 26, spec.color || C.green, { lw: 3, shade: true });
      for (let i = 0; i < 6; i++) K.blob(-7 + (i % 2) * 13, -54 + b + i * 6, 1.6, 1.6, C.dgreen, { lw: 0 });
      return {
        shoulder: [11, -36 + b],
        face: [0, -52 + b, 5, 4, 6],
        top: 76,
        after() {
          K.shape([[-13, -66 + b], [13, -66 + b], [10, -74 + b], [-10, -74 + b]], spec.color2 || C.red, { lw: 2.4, smooth: true });
          K.rrect(-2, -69 + b, 20, 4, 2, spec.color2 || C.red, { lw: 2 });
        },
      };
    },
    shaker(spec, b) {
      K.rrect(-14, -62 + b, 28, 44, 6, '#e8e4dc', { lw: 3 });
      K.blob(0, -64 + b, 14, 8, '#b9b5ad', { lw: 3 });
      for (let i = -1; i <= 1; i++) K.blob(i * 5, -66 + b, 1.2, 1.2, K.INK, { lw: 0 });
      K.line([[-13, -24 + b], [13, -24 + b]], 3, spec.color || C.navy);
      return {
        shoulder: [13, -40 + b],
        face: [0, -46 + b, 5, 4, 6],
        top: 82,
        after() {
          K.shape([[-12, -72 + b], [12, -72 + b], [9, -80 + b], [-9, -80 + b]], C.white, { lw: 2.2, smooth: true });
        },
      };
    },
    egg(spec, b) {
      K.shape([[0, -68 + b], [15, -54 + b], [18, -34 + b], [12, -20 + b], [0, -17 + b], [-12, -20 + b], [-18, -34 + b], [-15, -54 + b]], spec.color || '#f7efdc', { smooth: true, lw: 3 });
      return {
        shoulder: [15, -36 + b],
        face: [0, -48 + b, 5, 4, 6],
        top: 78,
        noMouth: true,
        tool(h) {
          K.line([[h[0] + 4, h[1]], [h[0] + 6, h[1] + 26]], 3.5, C.dbrown);
        },
        after() {
          // walrus-ish grandpa moustache
          K.shape([[0, -40 + b], [-12, -34 + b], [-16, -38 + b], [-8, -42 + b], [0, -41 + b], [8, -42 + b], [16, -38 + b], [12, -34 + b]], C.white, { smooth: true, lw: 2.2 });
        },
      };
    },
    cat(spec, b) {
      K.blob(0, -32 + b, 13, 15, K.INK, { lw: 3 });
      K.blob(0, -56 + b, 17, 14, K.INK, { lw: 3 });
      K.shape([[-15, -62 + b], [-12, -78 + b], [-4, -68 + b]], K.INK, { lw: 2 });
      K.shape([[15, -62 + b], [12, -78 + b], [4, -68 + b]], K.INK, { lw: 2 });
      K.blob(0, -51 + b, 12, 8, '#f3dcc4', { lw: 2 });
      for (let i = -2; i <= 2; i++) K.blob(i * 4.5, -41 + b + Math.abs(i) * -1, 2.4, 2.4, C.white, { lw: 1.2, amt: 0.2 });
      return {
        shoulder: [11, -36 + b],
        face: [0, -58 + b, 5.5, 4.5, 6.5],
        top: 80,
        after() {
          K.blob(0, -48 + b, 2, 1.5, C.pink, { lw: 1 });
        },
      };
    },
    // Granny Tallow: a short, well-melted candle in a shawl and specs
    granny(spec, b) {
      K.rrect(-16, -52 + b, 32, 36, 12, '#f6ead0', { lw: 3 });
      K.shape([[-16, -44 + b], [-10, -54 + b], [2, -52 + b], [14, -55 + b], [17, -44 + b], [12, -38 + b], [6, -46 + b], [-4, -38 + b], [-10, -45 + b]], '#fffaf0', { smooth: true, lw: 2.2 });
      K.shape([[-19, -30 + b], [19, -30 + b], [14, -14 + b], [0, -8 + b], [-14, -14 + b]], spec.color || C.purple, { smooth: true, lw: 2.6 });
      return {
        shoulder: [15, -30 + b],
        face: [0, -38 + b, 6, 4, 5],
        top: 72,
        after() {
          K.blob(-6, -38 + b, 6, 6, null, { lw: 1.8 });
          K.blob(6, -38 + b, 6, 6, null, { lw: 1.8 });
          K.line([[-1, -38 + b], [1, -38 + b]], 1.5);
          K.line([[0, -53 + b], [0, -58 + b]], 2.5);
          CH.flame(0, -57 + b, 0.55);
        },
      };
    },
    // Hammerstein the blacksmith walrus
    walrus(spec, b) {
      K.blob(0, -40 + b, 32, 30, spec.color || '#8f6f58', { lw: 3.2, shade: true });
      K.shape([[-24, -40 + b], [24, -40 + b], [22, -14 + b], [-22, -14 + b]], '#5d4a3c', { lw: 2.6 });
      K.blob(0, -48 + b, 16, 9, '#c9a88c', { lw: 2.5 });
      K.shape([[-8, -42 + b], [-6, -24 + b], [-3, -42 + b]], C.white, { lw: 2 });
      K.shape([[8, -42 + b], [6, -24 + b], [3, -42 + b]], C.white, { lw: 2 });
      K.blob(0, -55 + b, 5, 3.5, K.INK, { lw: 0 });
      return {
        shoulder: [28, -46 + b],
        face: [0, -62 + b, 8, 4.5, 6],
        top: 86,
        noMouth: true,
        tool(h) {
          K.line([[h[0], h[1]], [h[0] + 6, h[1] - 34]], 4, C.dbrown);
          K.rrect(h[0] - 6, h[1] - 44, 24, 13, 3, '#56575c', { lw: 2.6 });
        },
        after() {
          K.blob(0, -76 + b, 12, 4, '#3a2c22', { lw: 2 });
        },
      };
    },
    // Dr. Fizzwater the soda-pop apothecary
    bottle(spec, b) {
      K.shape([[-7, -84 + b], [7, -84 + b], [8, -66 + b], [16, -54 + b], [16, -20 + b], [-16, -20 + b], [-16, -54 + b], [-8, -66 + b]], 'rgba(106,170,120,0.95)', { lw: 3, smooth: false });
      K.rrect(-16, -48 + b, 32, 18, 3, C.cream, { lw: 2.2 });
      K.text('FIZZ', 0, -39 + b, 9, { font: K.F.deco, fill: C.red, lw: 0, shadow: false });
      for (let i = 0; i < 3; i++) {
        const yy = -28 + b - ((G.t * 30 + i * 14) % 36);
        K.blob(-8 + i * 7, yy, 1.8, 1.8, 'rgba(255,255,255,0.8)', { lw: 1 });
      }
      return {
        shoulder: [15, -44 + b],
        face: [0, -60 + b, 4.5, 3.5, 5.5],
        top: 96,
        after() {
          const cy = -86 + b;
          const pts = [];
          for (let i = 0; i < 16; i++) {
            const a = (i / 16) * Math.PI * 2;
            const r = i % 2 ? 9 : 11;
            pts.push([Math.cos(a) * r, cy + Math.sin(a) * r * 0.45]);
          }
          K.shape(pts, C.red, { lw: 2.2 });
          K.shape([[-5, -52 + b], [5, -52 + b], [0, -48 + b]], C.red, { lw: 1.5 });
          K.shape([[0, -50 + b], [-7, -55 + b], [-7, -46 + b]], C.red, { lw: 1.8 });
          K.shape([[0, -50 + b], [7, -55 + b], [7, -46 + b]], C.red, { lw: 1.8 });
        },
      };
    },
    // Mr. Sprocket the Projectionist: a lanky showman with a film projector for a head
    projector(spec, b) {
      K.shape([[-14, -60 + b], [14, -60 + b], [18, -18 + b], [-18, -18 + b]], '#3b2f4d', { lw: 3 });
      K.shape([[-5, -60 + b], [5, -60 + b], [0, -40 + b]], C.white, { lw: 2 });
      K.shape([[0, -58 + b], [-6, -62 + b], [-6, -54 + b]], C.red, { lw: 1.8 });
      K.shape([[0, -58 + b], [6, -62 + b], [6, -54 + b]], C.red, { lw: 1.8 });
      K.rrect(-20, -96 + b, 40, 34, 5, '#55565e', { lw: 3 });
      const spin = G.animT * 3;
      [[-11, -106], [11, -106]].forEach(([rx, ry], i) => {
        K.blob(rx, ry + b, 11, 11, '#2c2c31', { lw: 2.6 });
        for (let k = 0; k < 4; k++) {
          const a = spin * (i ? -1 : 1) + (k * Math.PI) / 2;
          K.blob(rx + Math.cos(a) * 5.5, ry + b + Math.sin(a) * 5.5, 2.4, 2.4, '#9e9aa6', { lw: 1 });
        }
      });
      return {
        shoulder: [15, -54 + b],
        face: [-6, -82 + b, 5, 4, 5.5],
        top: 122,
        noMouth: !!spec.noMouth,
        after() {
          K.blob(12, -76 + b, 7, 7, '#b8d7e6', { lw: 2.6, hl: true });
          // pencil moustache
          K.line([[-12, -69 + b], [-6, -71 + b], [0, -69 + b]], 2.2, K.INK, { smooth: true });
        },
      };
    },
  };
  CH.BODIES = BODIES;

  // named cast
  CH.cast = {
    granny: { body: 'granny', color: C.purple, name: 'Granny Tallow', seed: 21 },
    hammer: { body: 'walrus', name: 'Hammerstein', seed: 22 },
    fizz: { body: 'bottle', name: 'Dr. Fizzwater', seed: 23 },
    sprocket: { body: 'projector', name: 'Mr. Sprocket', seed: 24, shoe: '#1c1c22' },
  };
  CH.customers = [
    { body: 'peanut', color: C.tan, name: 'Sir Goober' },
    { body: 'bowl', color: C.blue, color2: C.pink, name: 'Mrs. Sugarbowl' },
    { body: 'pickle', color: C.green, color2: C.red, name: 'Dill' },
    { body: 'shaker', color: C.navy, name: 'Salty Sam' },
    { body: 'egg', color: '#f7efdc', name: 'Grampa Yolk' },
    { body: 'cat', name: 'Kit Katz' },
    { body: 'pickle', color: '#8fb35a', color2: C.blue, name: 'Gherkin' },
    { body: 'bowl', color: C.red, color2: C.yellow, name: 'Madame Creamer' },
  ];

  // Portrait: bust of a character inside an oval frame (dialog UI)
  CH.portrait = (who, x, y, r = 58, talking = false) => {
    const c = G.ctx;
    K.seed(333);
    K.blob(x, y, r + 6, r + 6, C.gold, { lw: 3.5 });
    c.save();
    c.beginPath();
    c.ellipse(x, y, r, r, 0, 0, Math.PI * 2);
    c.fillStyle = '#e8cfa0';
    c.fill();
    c.clip();
    K.wash(x, y - 10, r, r, '#fff4d8', 0.9);
    if (who === 'wick') CH.wick(x, y + r * 1.25, { scale: 1.75, mood: talking ? 'talk' : 'grin', fx: 0.2 });
    else {
      const spec = CH.cast[who] || who;
      const sc = spec.body === 'walrus' ? 1.3 : spec.body === 'projector' ? 1.1 : 1.6;
      const oy = spec.body === 'projector' ? r * 1.7 : spec.body === 'walrus' ? r * 1.35 : r * 1.3;
      CH.toon(x, y + oy, spec, { scale: sc, talk: talking, fx: -0.3 });
    }
    c.restore();
    K.blob(x, y, r, r, null, { lw: 3 });
  };
})();
