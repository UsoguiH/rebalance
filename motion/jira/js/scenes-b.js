// Jira scenes, part B: "Meet Jira" (the logo, then a live board where a card is
// planned, tracked and shipped), "No more chasing updates", and the 3D arch of
// "From backlog... to launch".
(function () {
  const S = M.scenes;
  const J = M.jira;
  const C = J.C;
  const { W, H } = M;

  // ---------------------------------------------------------------- Meet Jira
  const BOARD = { x: 210, y: 140, w: 1500, h: 820 };
  const COLS = [
    { name: 'TO DO', x: 250 },
    { name: 'IN PROGRESS', x: 730 },
    { name: 'DONE', x: 1210 },
  ];
  const CW = 460;
  const CARD_W = 428;
  const CARD_H = 116;
  const GAP = 14;
  const slot = (col, idx) => [COLS[col].x + 16, 336 + idx * (CARD_H + GAP)];
  // where each card sits over time: [t, col, idx]; moves ease over 0.22s
  const PLAN = {
    101: [[0, 0, 0], [11.42, 0, 1], [12.05, 0, 0]],
    104: [[0, 0, 1], [11.44, 0, 2], [12.07, 0, 1]],
    112: [[0, 0, 2], [11.46, 0, 3], [12.09, 0, 2]],
    97: [[0, 1, 0], [12.28, 1, 1], [12.62, 1, 0]],
    99: [[0, 1, 1], [12.3, 1, 2], [12.64, 1, 1]],
    90: [[0, 2, 0], [12.76, 2, 1]],
    88: [[0, 2, 1], [12.78, 2, 2]],
    85: [[0, 2, 2], [12.8, 2, 3]],
  };
  const cardPos = (id, t) => {
    const ks = PLAN[id];
    let i = 0;
    while (i < ks.length - 1 && t >= ks[i + 1][0]) i++;
    const [, c1, i1] = ks[i];
    const [x1, y1] = slot(c1, i1);
    if (i === 0) return [x1, y1];
    const [tt, , ] = ks[i];
    const [, c0, i0] = ks[i - 1];
    const [x0, y0] = slot(c0, i0);
    const u = M.ease.outCubic(M.prog(t, tt, tt + 0.22));
    return [M.lerp(x0, x1, u), M.lerp(y0, y1, u)];
  };
  // the new card: drops in on "Plan it", dragged on "Track it" and "Ship it"
  const DRAG1 = [12.0, 12.42];
  const DRAG2 = [12.56, 12.94];
  const heroPos = (t) => {
    const [ax, ay] = slot(0, 0);
    const [bx, by] = slot(1, 0);
    const [cx, cy] = slot(2, 0);
    if (t < DRAG1[0]) return { x: ax, y: ay - (1 - M.ease.outBack(M.prog(t, 11.4, 11.66), 1.4)) * 260, lift: 0, rot: 0, a: M.prog(t, 11.4, 11.46) };
    const leg = (t0, t1, x0, y0, x1, y1) => {
      const u = M.ease.inOutCubic(M.prog(t, t0, t1));
      const lift = Math.sin(Math.PI * M.prog(t, t0 - 0.05, t1 + 0.08));
      return { x: M.lerp(x0, x1, u), y: M.lerp(y0, y1, u) - Math.sin(Math.PI * u) * 60, lift, rot: Math.sin(Math.PI * u) * 0.06, a: 1 };
    };
    if (t < DRAG2[0]) return leg(DRAG1[0], DRAG1[1], ax, ay, bx, by);
    return leg(DRAG2[0], DRAG2[1], bx, by, cx, cy);
  };
  const boardCursor = (t) => {
    const h = heroPos(t);
    const grab = [h.x + 300, h.y + 64];
    if (t < 11.98) return M.track(t, [[11.62, 1400, 1150], [11.8, 900, 700], [11.98, grab[0], grab[1]]]);
    if (t < DRAG2[1] + 0.02) return grab;
    return M.track(t, [[DRAG2[1] + 0.02, grab[0], grab[1]], [13.15, grab[0] + 260, grab[1] + 260]]);
  };
  // quick restyles at the end of the shot: [start, theme]
  const THEMES = [[0, 'light'], [13.08, 'dark'], [13.16, 'blue'], [13.24, 'light']];

  const board = (c, t, theme) => {
    const dark = theme === 'dark';
    const blue = theme === 'blue';
    const bg = dark ? '#1d2125' : blue ? C.blue : '#ffffff';
    c.save();
    c.shadowColor = 'rgba(9,30,66,0.25)';
    c.shadowBlur = 60;
    c.shadowOffsetY = 20;
    M.fillRR(c, BOARD.x, BOARD.y, BOARD.w, BOARD.h, 28, bg);
    c.restore();
    // header
    M.text(c, 'Launch board', 330, 222, { size: 36, weight: 700, color: dark || blue ? '#ffffff' : C.navy });
    M.text(c, 'Sprint 24  ·  6 days left', 600, 220, { size: 24, weight: 500, color: dark ? '#9fadbc' : blue ? '#cce0ff' : C.sub });
    ['NK', 'SK', 'AM', 'JL'].forEach((n, i) => J.avatar(c, 1430 + i * 30, 210, 22, n, [C.red, C.teal, C.purple, C.orange][i]));
    M.fillRR(c, 1555, 186, 120, 48, 8, blue ? C.purple : C.blue);
    M.text(c, 'Share', 1615, 218, { size: 22, weight: 700, color: '#ffffff', align: 'center' });
    // columns
    const counts = [t < 11.42 ? 3 : t < 12.05 ? 4 : 3, t < 12.3 ? 2 : t < 12.62 ? 3 : 2, t < 12.78 ? 3 : 4];
    COLS.forEach((col, i) => {
      M.fillRR(c, col.x, 270, CW, 660, 16, dark ? '#161a1d' : blue ? 'rgba(255,255,255,0.16)' : C.page);
      M.text(c, `${col.name}  ${counts[i]}`, col.x + 20, 310, { size: 20, weight: 700, color: dark ? '#9fadbc' : blue ? '#ffffff' : C.sub, track: 0.04 });
    });
    for (const id of [101, 104, 112, 97, 99, 90, 88, 85]) {
      const [x, y] = cardPos(id, t);
      J.card(c, x, y, CARD_W, CARD_H, id, { theme: dark ? 'dark' : 'light' });
    }
  };
  const confetti = (c, t, x0, y0) => {
    const k = t - 12.95;
    if (k < 0 || k > 0.9) return;
    const r = M.rng(9);
    for (let i = 0; i < 46; i++) {
      const a = r.range(-Math.PI * 0.95, -Math.PI * 0.05);
      const v = r.range(500, 1100);
      const x = x0 + Math.cos(a) * v * k;
      const y = y0 + Math.sin(a) * v * k + 1400 * k * k;
      c.save();
      c.globalAlpha = 1 - M.prog(k, 0.55, 0.9);
      c.translate(x, y);
      c.rotate(r() * 6 + k * r.range(-14, 14));
      c.fillStyle = [C.blue4, C.green, C.yellow, C.red, C.purple, C.teal][i % 6];
      c.fillRect(-7, -4, 14, 8);
      c.restore();
    }
  };

  S.meetJira = (c, t) => {
    c.fillStyle = M.rgrad(c, 960, 480, 100, 1300, [[0, '#ffffff'], [1, '#d7e6ff']]);
    c.fillRect(0, 0, W, H);
    // logo beat: the tile springs in, the wordmark slides out from behind it
    const pull = M.ease.inOutCubic(M.prog(t, 11.0, 11.42));
    const pop = M.ease.outBack(M.prog(t, 10.27, 10.62), 1.9);
    const wm = M.ease.outCubic(M.prog(t, 10.5, 10.85));
    const ts = M.lerp(260, 52, pull);
    const tx = M.lerp(960 - 205 * wm, 270, pull);
    const ty = M.lerp(530, 206, pull);
    if (pull > 0) {
      const bs = M.lerp(0.7, 1, M.ease.outCubic(pull));
      M.withLayer(
        c,
        (l) => {
          l.translate(960, 550);
          l.scale(bs, bs);
          l.translate(-960, -550);
          const theme = THEMES.filter(([at]) => t >= at).pop()[1];
          board(l, t, theme);
          // the hero card, above the others
          if (t >= 11.4) {
            const h = heroPos(t);
            const done = M.prog(t, DRAG2[1], DRAG2[1] + 0.3);
            J.card(l, h.x, h.y, CARD_W, CARD_H, 128, { lift: h.lift, rot: h.rot, theme: theme === 'dark' ? 'dark' : 'light', done });
            if (t >= 11.4 && t < 11.75) {
              // a sparkle where it lands
              const sp = M.prog(t, 11.55, 11.75);
              l.save();
              l.globalAlpha = 1 - sp;
              l.strokeStyle = C.blue4;
              l.lineWidth = 4;
              M.rr(l, h.x - sp * 20, h.y - sp * 20, CARD_W + sp * 40, CARD_H + sp * 40, 14);
              l.stroke();
              l.restore();
            }
            const [cx, cy] = slot(2, 0);
            confetti(l, t, cx + CARD_W / 2, cy + CARD_H / 2);
          }
        },
        { alpha: M.prog(t, 11.05, 11.3) }
      );
    }
    J.jiraTile(c, tx, ty, ts * pop, { draw: M.prog(t, 10.4, 10.7) });
    const wsize = M.lerp(180, 36, pull);
    if (wm > 0 && pull < 1) {
      M.blurWord(c, 'Jira', tx + ts * 0.62, ty + wsize * 0.36, wm, { size: wsize, weight: 800, color: C.navy, blurFrom: 14, track: -0.03, alpha: 1 - M.ease.inQuad(pull) });
    }
    // cursor
    if (t > 11.62 && t < 13.15) {
      const [x, y] = boardCursor(t);
      const grabbing = (t > DRAG1[0] - 0.03 && t < DRAG1[1]) || (t > DRAG2[0] - 0.03 && t < DRAG2[1]);
      M.cursor(c, x, y, 1.6, { press: grabbing ? 0.7 : 0, rot: -0.25 });
    }
    // white-out into the next line
    const f = M.prog(t, 13.26, 13.4);
    if (f > 0) {
      c.fillStyle = `rgba(233,235,238,${f})`;
      c.fillRect(0, 0, W, H);
    }
  };

  // ---------------------------------------------------------------- No more chasing updates
  const NM = [
    { s: 'No', t0: 13.5, weight: 400 },
    { s: 'more', t0: 13.58, weight: 400 },
    { s: 'chasing', t0: 13.68, weight: 800, color: C.blue },
    { s: 'updates.', t0: 13.86, weight: 400 },
  ];
  const bubble = (c, t, ax, ay) => {
    if (t < 14.3) return;
    const r = M.key(t, [[14.3, 6], [14.37, 22, 'outQuad'], [14.46, 100, 'outQuad'], [14.53, 124, 'outQuad'], [14.62, 98, 'inOutQuad'], [14.7, 92, 'outQuad'], [14.85, 106, 'outQuad'], [15.4, 112, 'linear']]);
    const grow = M.prog(t, 14.37, 14.49);
    const cx = M.lerp(ax + 10, ax + 115, grow);
    const cy = M.lerp(ay - 10, ay - 120, grow);
    c.save();
    c.fillStyle = C.blue;
    c.beginPath();
    c.arc(ax, ay, Math.min(10, 4 + (t - 14.3) * 80), 0, Math.PI * 2);
    c.fill();
    if (grow > 0) {
      c.beginPath();
      c.arc(cx, cy, r, 0, Math.PI * 2);
      c.arc(cx - r * 0.5, cy + r * 0.5, r * 0.58, 0, Math.PI * 2);
      c.fill();
      // check mark draws on, then turns green with a ring burst
      const d = M.prog(t, 14.5, 14.66);
      const g = M.prog(t, 14.7, 14.85);
      c.save();
      c.translate(cx, cy);
      c.strokeStyle = '#ffffff';
      c.lineWidth = r * 0.16;
      c.lineCap = 'round';
      c.lineJoin = 'round';
      if (g > 0) {
        c.fillStyle = C.green;
        c.beginPath();
        c.arc(0, 0, r * 0.62 * M.ease.outBack(g, 2), 0, Math.PI * 2);
        c.fill();
        c.save();
        c.globalAlpha = 1 - g;
        c.lineWidth = 6;
        c.strokeStyle = C.green;
        c.beginPath();
        c.arc(0, 0, r * (1 + g * 0.6), 0, Math.PI * 2);
        c.stroke();
        c.restore();
      }
      const pts = [[-0.36, 0.02], [-0.1, 0.28], [0.4, -0.26]].map(([x, y]) => [x * r, y * r]);
      const l1 = Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]);
      const l2 = Math.hypot(pts[2][0] - pts[1][0], pts[2][1] - pts[1][1]);
      c.setLineDash([(l1 + l2) * d, 9999]);
      c.beginPath();
      c.moveTo(...pts[0]);
      c.lineTo(...pts[1]);
      c.lineTo(...pts[2]);
      c.stroke();
      c.restore();
    }
    c.restore();
  };
  S.noMore = (c, t) => {
    if (t < 13.4) return S.meetJira(c, t);
    c.fillStyle = '#e9ebee';
    c.fillRect(0, 0, W, H);
    const z = 1 + Math.max(0, t - 14.2) * 0.06;
    c.save();
    c.translate(1300, 540);
    c.scale(z, z);
    c.translate(-1300, -540);
    const boxes = M.wordLine(
      c,
      NM.map((w) => Object.assign({ color: C.ink }, w)),
      t,
      { size: 118, x: W / 2, y: 580, dur: 0.18, slide: 110, blurFrom: 12, track: -0.02 }
    );
    c.restore();
    // the reaction bubble rides the end of "updates."
    const last = boxes[3];
    if (last && last.x !== undefined) {
      const ex = (last.x + last.ww - 1300) * z + 1300;
      bubble(c, t, ex + 10, 470);
    }
    if (t > 14.75) {
      const tr = [[14.75, -40, 760], [14.85, 200, 850], [15.0, 520, 900], [15.15, 760, 860], [15.3, 900, 760]];
      const [x, y] = M.track(t, tr);
      const [x0, y0] = M.track(t - 0.03, tr);
      M.cursorSmear(c, x0, y0, x, y, 1.0);
    }
  };

  // ---------------------------------------------------------------- From backlog... to launch
  // glyphs laid on a 3D arch: [text, accent?, weight, size, appear time]
  const ARCH = [
    ['From', 0, 500, 160, 15.38],
    ['backlog...', 0, 500, 128, 15.56],
    ['to', 0, 500, 102, 16.25],
    ['l', 1, 800, 168, 16.42],
    ['a', 1, 800, 154, 16.47],
    ['u', 1, 800, 146, 16.52],
    ['n', 1, 800, 146, 16.57],
    ['c', 1, 800, 154, 16.62],
    ['h', 1, 800, 168, 16.67],
  ];
  const cardsPlate = () =>
    M.pic('jira-dark-cards', W, H, (c) => {
      c.fillStyle = M.rgrad(c, 960, 520, 100, 1150, [[0, '#0f2347'], [1, '#050b16']]);
      c.fillRect(0, 0, W, H);
      const floatCard = (x, y, rot, id) => {
        c.save();
        c.translate(x, y);
        c.rotate(rot);
        c.filter = 'blur(5px)';
        c.globalAlpha = 0.55;
        J.card(c, -214, -58, 428, 116, id, { theme: 'dark' });
        c.restore();
      };
      floatCard(240, 130, -0.4, 104);
      floatCard(1720, 170, 0.5, 97);
      floatCard(160, 930, 0.3, 112);
      floatCard(1760, 920, -0.35, 90);
      floatCard(980, 1010, 0.05, 101);
      floatCard(1000, 60, -0.06, 88);
      c.filter = 'none';
      c.globalAlpha = 1;
    });
  S.arch = (c, t) => {
    const k = (t - 15.3) / 1.9;
    c.save();
    c.translate(W / 2, H / 2);
    c.rotate(k * 0.03);
    c.scale(1.04 + k * 0.04, 1.04 + k * 0.04);
    c.translate(-W / 2, -H / 2);
    c.drawImage(cardsPlate(), 0, 0);
    c.restore();
    // lay the glyphs along an arc that slowly orbits
    const R = 1300;
    const cx = 960;
    const cy = 1680 + k * 40;
    const sp = 0.03;
    // centre the run of glyphs on the arc, then let it orbit slowly
    let span = 0;
    ARCH.forEach(([s, , wt, size], i) => (span += M.measure(c, s, size, wt, -0.02) / R + (i < 3 ? sp : 0.004)));
    let a = -span / 2 + k * 0.05;
    ARCH.forEach(([s, accent, wt, size], i) => {
      const t0 = ARCH[i][4];
      const p = M.ease.outBack(M.prog(t, t0, t0 + 0.22), 2);
      const ww = M.measure(c, s, size, wt, -0.02);
      const da = (ww / R) * 0.5;
      a += da;
      const x = cx + Math.sin(a) * R;
      const y = cy - Math.cos(a) * R + (i === 0 ? 40 : 0);
      a += da + (i < 3 ? sp : 0.004);
      if (p <= 0) return;
      const draw = (l, dx, col) => {
        l.save();
        l.translate(x + dx, y + (1 - p) * 60);
        l.rotate(a - da);
        l.scale(p, p);
        M.text(l, s, 0, size * 0.36, { size, weight: wt, color: col, align: 'center', track: -0.02 });
        l.restore();
      };
      const blur = i === 0 ? 3 : i === 1 ? 1 : 0;
      M.withLayer(
        c,
        (l) => {
          if (accent) {
            l.save();
            l.shadowColor = 'rgba(76,154,255,0.8)';
            l.shadowBlur = 22;
            draw(l, 0, C.blue3);
            l.restore();
          } else {
            l.globalCompositeOperation = 'lighter';
            draw(l, -blur * 1.4 - 2, 'rgba(255,60,60,0.85)');
            draw(l, blur * 1.4 + 2, 'rgba(40,200,255,0.8)');
            l.globalCompositeOperation = 'source-over';
            draw(l, 0, 'rgba(240,244,255,0.9)');
          }
        },
        { blur }
      );
    });
    const [x, y] = M.track(t, [[15.3, 900, 760], [15.6, 960, 560], [16.2, 1100, 470], [16.8, 1260, 430], [17.2, 1330, 420]]);
    M.cursor(c, x, y, 0.95, { rot: -0.5 });
  };
})();
