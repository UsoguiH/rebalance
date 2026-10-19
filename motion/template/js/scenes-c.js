// Template scenes, part C: "<Verb> once, And <verb> (:", the first feature (a ring
// of cards) folding into the second (a panel), the third (a wall of integrations)
// into the fourth (a dark card) and the payoff, and the end card.
(function () {
  const S = M.scenes;
  const T = M.tpl;
  const C = T.C;
  const K = M.CONTENT;
  const F = K.features;
  const { W, H } = M;

  // ---------------------------------------------------------------- <Verb> once
  const OW = T.words(K.once);
  const lead = OW.filter((w) => !w.accent);
  const tail = OW.filter((w) => w.accent);
  const T1 = T.cues('once1', lead.map((w) => w.s), T.rhythm(lead.length, [17.27, 17.33]), 'once').map((t) => M.clamp(t, 17.2, 17.75));
  const T2 = T.cues('once2', tail.map((w) => w.s), T.rhythm(tail.length, [18.14, 18.27, 18.38]), 'once').map((t) => M.clamp(t, 18.0, 18.5));
  const WORDS = [...lead.map((w, i) => ({ s: w.s, t0: T1[i], w: 500, col: C.ink })), ...tail.map((w, i) => ({ s: w.s, t0: T2[i], w: 800, col: C.text, up: 1 }))];
  const PLAN = { x: 600, base: 574, size: 80, swoosh: 360 };
  const layout = (c) => {
    if (WORDS[0].dx !== undefined) return;
    const gap = (w) => PLAN.size * (/,$/.test(w.s) ? 0.14 : 0.2);
    let total = 0;
    WORDS.forEach((w, i) => (total += M.measure(c, w.s, PLAN.size, w.w, -0.02) + (i < WORDS.length - 1 ? gap(w) : 0)));
    if (total > 1300) {
      PLAN.size *= 1300 / total;
      total = 1300;
    }
    PLAN.x = 980 - total / 2;
    let x = 0;
    for (const w of WORDS) {
      w.dx = x;
      x += M.measure(c, w.s, PLAN.size, w.w, -0.02) + gap(w);
    }
    // the swoosh underlines the first half of the line
    const first = WORDS.findIndex((w) => w.up);
    PLAN.swoosh = Math.max(200, (first > 0 ? WORDS[first].dx : total) - PLAN.size * 0.3);
  };
  const cam = (t) => M.key(t, [[17.2, 0.97], [17.78, 1.0, 'linear'], [17.9, 1.03, 'inQuad'], [18.03, 1.2, 'inQuad'], [18.25, 1.6, 'outQuad'], [18.7, 1.8, 'outCubic'], [18.85, 2.1, 'inQuad']]);
  const out = (t) => M.prog(t, 18.72, 18.85);
  const swoosh = (c, p) => {
    if (p <= 0) return null;
    const pts = [];
    for (let i = 0; i <= 40; i++) {
      const u = (i / 40) * p;
      pts.push([PLAN.x + 4 + u * PLAN.swoosh, PLAN.base + 16 + Math.pow(u, 2.2) * 38, 8.5 * (1 - Math.pow(u, 1.6) * 0.8)]);
    }
    c.save();
    c.fillStyle = C.light;
    c.beginPath();
    pts.forEach(([x, y, w], i) => (i ? c.lineTo(x, y - w) : c.moveTo(x, y - w)));
    for (let i = pts.length - 1; i >= 0; i--) c.lineTo(pts[i][0], pts[i][1] + pts[i][2]);
    c.closePath();
    c.fill();
    c.beginPath();
    c.arc(pts[0][0], pts[0][1], pts[0][2], 0, Math.PI * 2);
    c.fill();
    c.restore();
    return pts[pts.length - 1];
  };
  const [ir, ig, ib] = T.rgb(C.ink);
  S.once = (c, t) => {
    c.fillStyle = C.grey;
    c.fillRect(0, 0, W, H);
    layout(c);
    const draw = (cc) => {
      const s = cam(t);
      cc.save();
      cc.translate(980 + M.prog(t, 17.78, 18.7) * 10, 540 + M.prog(t, 17.78, 18.7) * 20 + out(t) * 50);
      cc.scale(s, s);
      cc.translate(-980, -540);
      const tip = swoosh(cc, M.ease.outCubic(M.prog(t, 17.28, 17.9)));
      for (const w of WORDS) {
        const p = M.clamp((t - w.t0) / 0.22, 0, 1);
        if (p <= 0) continue;
        const dy = w.up ? (1 - M.ease.outCubic(p)) * 22 : 0;
        const dx = (1 - M.ease.outCubic(p)) * (w.up ? 30 : 40);
        const dark = M.prog(t, w.t0 + 0.05, w.t0 + 0.35);
        const col = w.up || dark > 0.99 ? w.col : `rgba(${ir},${ig},${ib},${0.35 + 0.65 * dark})`;
        M.blurWord(cc, w.s, PLAN.x + w.dx + dx, PLAN.base + dy, M.ease.outQuad(p), { size: PLAN.size, weight: w.w, color: col, blurFrom: 8, track: -0.02 });
      }
      cc.restore();
      return tip ? [(tip[0] - 980) * s + 980, (tip[1] - 540) * s + 540] : null;
    };
    let tip = null;
    if (out(t) > 0) M.withLayer(c, (l) => draw(l), { blur: out(t) * 16, alpha: 1 - out(t) * 0.35 });
    else tip = draw(c);
    if (t < 18.3) {
      const inTr = [[17.2, -60, 650], [17.28, PLAN.x - 170, 627]];
      const outTr = [[17.9, 1000, 690], [18.03, 1090, 712], [18.15, 1380, 760], [18.3, 2060, 820]];
      let p;
      let q;
      if (t < 17.28) [p, q] = [M.track(t - 0.03, inTr), M.track(t, inTr)];
      else if (t < 17.9 && tip) p = q = [tip[0] + 18, tip[1] + 6];
      else [p, q] = [M.track(t - 0.03, outTr), M.track(t, outTr)];
      M.cursorSmear(c, p[0], p[1], q[0], q[1], 1.05);
    }
  };

  // ---------------------------------------------------------------- feature 1 -> feature 2
  const ringAngle = (t) => (-90 - 64 * Math.exp(-4.75 * (t - 18.95))) * (Math.PI / 180);
  const ringScale = (t) => M.key(t, [[18.85, 1.25], [18.95, 1.0, 'outCubic'], [19.1, 0.95, 'linear'], [19.35, 0.87, 'outQuad'], [19.45, 0.86, 'linear']]);
  // a mini card for the ring
  const mini = (c, i, x, y, s, sx = 1, sy = 1) => {
    const is = T.ITEMS[i % T.ITEMS.length];
    const w = 230 * s * sx;
    const h = 150 * s * sy;
    c.save();
    c.translate(x - w / 2, y - h / 2);
    c.save();
    c.shadowColor = 'rgba(9,30,66,0.22)';
    c.shadowBlur = 16 * s;
    c.shadowOffsetY = 6 * s;
    M.fillRR(c, 0, 0, w, h, 16 * s, '#ffffff');
    c.restore();
    if (sy > 0.4) {
      c.scale(s * sx, s * sy);
      T.typeIcon(c, 18, 18, 30, is.type);
      M.fillRR(c, 18, 66, 190, 14, 7, C.line);
      M.fillRR(c, 18, 92, 130, 14, 7, C.line);
      T.avatar(c, 196, 122, 18, is.who, is.col);
      M.text(c, is.key, 18, 132, { size: 18, weight: 700, color: C.sub });
    }
    c.restore();
  };
  // the second feature's panel, centred on (960, 570); open 0..1 unfolds it
  const P = F.panel;
  const ROWS = P.rows || [['Design', 0.0, 0.34], ['Build', 0.22, 0.7], ['Test', 0.55, 0.85], ['Launch', 0.8, 1.0]];
  const ROWCOL = [C.purple, C.light, C.teal, C.green];
  const panel = (c, t, open) => {
    const x = 380;
    const y = 400;
    const w = 1160;
    const h = 340;
    c.save();
    c.translate(960, 570);
    c.scale(M.lerp(0.55, 1, open), M.lerp(0.12, 1, open));
    c.translate(-960, -570);
    c.save();
    c.shadowColor = 'rgba(9,30,66,0.2)';
    c.shadowBlur = 40;
    c.shadowOffsetY = 12;
    M.fillRR(c, x, y, w, h, 32, '#ffffff');
    c.restore();
    const type = P.type || 'timeline';
    if (type === 'timeline') {
      (P.ticks || ['Jun', 'Jul', 'Aug', 'Sep']).slice(0, 4).forEach((m, i) => M.text(c, m, x + 260 + i * 220, y + 52, { size: 22, weight: 600, color: C.sub }));
      c.fillStyle = C.line;
      c.fillRect(x + 240, y + 70, w - 280, 2);
      ROWS.slice(0, 4).forEach(([name, a, b], i) => {
        const yy = y + 100 + i * 58;
        M.text(c, name, x + 40, yy + 30, { size: T.fit(c, name, 26, 600, 190), weight: 600, color: C.navy });
        const g = M.ease.outCubic(M.prog(t, 19.62 + i * 0.07, 19.95 + i * 0.07));
        const bw = (b - a) * 820 * g;
        if (bw > 2) M.fillRR(c, x + 250 + a * 820, yy + 6, bw, 34, 17, ROWCOL[i]);
      });
      c.fillStyle = C.red;
      c.fillRect(x + 250 + 0.58 * 820, y + 80, 3, 240);
    } else if (type === 'chart') {
      // rows: [label, value 0..1]
      const n = ROWS.length;
      const bw = (w - 120) / n;
      ROWS.forEach(([name, v], i) => {
        const g = M.ease.outBack(M.prog(t, 19.62 + i * 0.05, 19.92 + i * 0.05), 1.3);
        const bh = 210 * v * g;
        const bx = x + 60 + i * bw + bw * 0.2;
        if (bh > 1) M.fillRR(c, bx, y + 270 - bh, bw * 0.6, bh, 10, i === n - 1 ? C.brand : C.tint);
        M.text(c, name, bx + bw * 0.3, y + 312, { size: T.fit(c, name, 22, 600, bw * 0.9), weight: 600, color: C.sub, align: 'center' });
      });
    } else {
      // list: [label] rows, each ticked in turn
      ROWS.slice(0, 4).forEach(([name], i) => {
        const yy = y + 50 + i * 70;
        M.strokeRR(c, x + 60, yy, 40, 40, 10, C.line, 3);
        T.check(c, x + 80, yy + 20, 22, M.prog(t, 19.66 + i * 0.08, 19.9 + i * 0.08));
        M.text(c, name, x + 130, yy + 31, { size: T.fit(c, name, 30, 500, w - 200), weight: 500, color: C.navy });
      });
    }
    c.restore();
  };
  const ringWord = F.ring;
  const panelWord = P.word;
  const KEYS = T.rhythm(panelWord.length, [19.55, 19.6, 19.64, 19.68, 19.72, 19.76, 19.8, 19.84]);
  let ringSize = 0;
  let panelSize = 0;
  S.ring = (c, t) => {
    c.fillStyle = C.grey;
    c.fillRect(0, 0, W, H);
    if (!ringSize) {
      ringSize = T.fit(c, ringWord, 116, 800, 540, -0.03);
      panelSize = T.fit(c, panelWord, 112, 800, 1160, -0.02);
    }
    if (t < 19.52) {
      const fold = M.ease.inCubic(M.prog(t, 19.39, 19.52));
      const s = ringScale(t);
      const spin = Math.abs(ringAngle(t + 0.016) - ringAngle(t - 0.016)) * 30;
      const n = M.clamp(Math.round(spin * 2), 1, 6);
      M.motionBlur(c, n, (cc, u) => {
        const a0 = ringAngle(t + (u - 0.5) * 0.03);
        for (let i = 0; i < 8; i++) {
          const a = a0 + (i * Math.PI) / 4;
          const r = 330 * s;
          mini(cc, i, 960 + Math.cos(a) * r * (1 + fold * 0.3), 560 + Math.sin(a) * r * (1 - fold * 0.95), s * 0.95, 1 + fold * 0.4, 1 - fold * 0.8);
        }
      });
      M.withLayer(c, (l) => M.text(l, ringWord, 960, 560 + ringSize * 0.345 * s, { size: ringSize * s, weight: 800, color: C.ink, align: 'center', track: -0.03 }), {
        blur: (1 - M.prog(t, 18.85, 18.95)) * 10 + fold * 8,
        alpha: 1 - fold,
      });
      if (fold > 0.5) panel(c, t, 0);
      return;
    }
    const open = M.ease.outBack(M.prog(t, 19.5, 19.64), 1.2);
    const o = M.prog(t, 20.1, 20.2);
    const draw = (cc) => {
      panel(cc, t, open);
      let x = 960 - M.measure(cc, panelWord, panelSize, 800, -0.02) / 2;
      for (let i = 0; i < panelWord.length; i++) {
        const p = M.prog(t, KEYS[i], KEYS[i] + 0.16);
        const w = M.measure(cc, panelWord[i], panelSize, 800, -0.02);
        if (p > 0) M.blurWord(cc, panelWord[i], x, 330 - (1 - M.ease.outBack(p, 2)) * 40, p, { size: panelSize, weight: 800, color: C.ink, blurFrom: 8, track: -0.02 });
        x += w;
      }
    };
    if (o > 0) {
      M.withLayer(
        c,
        (l) => {
          l.translate(960, 560);
          l.scale(1 - o * 0.2, 1 - o * 0.2);
          l.translate(-960, -560);
          draw(l);
        },
        { blur: o * 6 }
      );
    } else draw(c);
  };

  // ---------------------------------------------------------------- feature 3 -> feature 4 -> payoff
  const tiles = F.wall.tiles && F.wall.tiles.length ? F.wall.tiles : ['chat'];
  const tile = (i) => tiles[i % tiles.length];
  const WALL = [[300, 230, 230], [620, 170, 190], [1300, 170, 200], [1640, 240, 230], [230, 640, 210], [560, 880, 190], [1370, 880, 200], [1700, 660, 210], [960, 900, 170]].map((p, i) => [tile(i), ...p]);
  const STAGE = [[160, 170, 300, 6], [1720, 180, 320, 8], [380, 860, 260, 2], [1560, 860, 280, 2], [1040, 120, 200, 10], [140, 560, 220, 8], [1820, 560, 220, 8], [960, 980, 180, 4]].map((p, i) => [tile([0, 3, 2, 6, 4, 7, 1, 5][i]), ...p]);
  const CARD = { x: 646, y: 400, w: 628, h: 330 };
  const PW = T.words(F.payoff);
  const small = PW.filter((w) => !w.accent).map((w) => w.s).join(' ');
  const big = PW.filter((w) => w.accent).map((w) => w.s).join(' ') || T.plain(F.payoff);
  const SWAP = M.clamp(T.cues('payoff', [PW[0].s], [22.03], 'wall')[0], 21.7, 22.35);
  let wallSize = 0;
  let cardSize = 0;
  let bigSize = 0;
  S.wall = (c, t) => {
    c.fillStyle = C.grey;
    c.fillRect(0, 0, W, H);
    if (!wallSize) {
      wallSize = T.fit(c, F.wall.word, 160, 800, 1240, -0.03);
      cardSize = T.fit(c, F.card, 112, 800, CARD.w - 90, -0.02);
      bigSize = T.fit(c, big, 112, 800, CARD.w - 100, -0.02);
    }
    if (t < 20.82) {
      const tint = M.prog(t, 20.45, 20.7);
      if (tint > 0) {
        const [r1, g1, b1] = T.rgb(C.tint);
        const [r2, g2, b2] = T.rgb(C.lighter);
        c.fillStyle = M.rgrad(c, 960, 540, 100, 1400, [[0, `rgba(${r1},${g1},${b1},${tint})`], [1, `rgba(${r2},${g2},${b2},${tint * 0.7})`]]);
        c.fillRect(0, 0, W, H);
      }
      const z = M.key(t, [[20.2, 0.5], [20.32, 0.86, 'outCubic'], [20.42, 1.08, 'outQuad'], [20.62, 1.0, 'inOutQuad']]);
      const sk = M.key(t, [[20.2, 0.6], [20.32, 0.25, 'outCubic'], [20.42, 0.03, 'outQuad'], [20.7, 0, 'outQuad']]);
      const ts = M.key(t, [[20.2, 1.25], [20.42, 1.38, 'outQuad'], [20.62, 1.0, 'inOutQuad']]);
      M.withLayer(
        c,
        (l) => {
          l.translate(960, 540);
          l.transform(1 - sk * 0.25, sk * 0.25, -sk * 0.35, 1, 0, 0);
          l.scale(z, z);
          l.translate(-960, -540);
          // pulses run along wires from each tile to the centre
          const wire = M.prog(t, 20.42, 20.6);
          if (wire > 0) {
            l.save();
            l.strokeStyle = C.light;
            l.lineWidth = 4;
            l.setLineDash([14, 14]);
            l.lineDashOffset = -t * 140;
            l.globalAlpha = wire;
            for (const [, x, y] of WALL) {
              l.beginPath();
              l.moveTo(x, y);
              l.lineTo(M.lerp(x, 960, wire), M.lerp(y, 540, wire));
              l.stroke();
            }
            l.restore();
          }
          WALL.forEach(([slug, x, y, s], i) => T.appTile(l, slug, x, y, s, { rot: Math.sin(i * 2.1) * 0.06 }));
          l.save();
          l.translate(960, 500);
          l.scale(ts, ts);
          M.text(l, F.wall.word, 0, wallSize * 0.34, { size: wallSize, weight: 800, color: C.ink, align: 'center', track: -0.03 });
          l.restore();
        },
        { blur: (1 - M.prog(t, 20.2, 20.4)) * 18 }
      );
      // a brand flash hands over to the card
      const fl = M.prog(t, 20.72, 20.82);
      if (fl > 0) {
        const [a1, a2, a3] = [C.light, C.brand, C.purple].map(T.rgb);
        c.fillStyle = M.hgrad(c, 0, W, [[0, M.rgba(a1, fl)], [0.6, M.rgba(a2, fl)], [1, M.rgba(a3, fl)]]);
        c.fillRect(0, 0, W, H);
      }
      return;
    }
    const fl = 1 - M.prog(t, 20.82, 21.02);
    if (fl > 0) {
      const [a1, a2, a3] = [C.light, C.brand, C.purple].map(T.rgb);
      c.fillStyle = M.rgrad(c, 300, 0, 100, 1500, [[0, M.rgba(a1, fl)], [0.45, M.rgba(a2, fl * 0.8)], [1, M.rgba(a3, 0)]]);
      c.fillRect(0, 0, W, H);
    }
    const z = M.key(t, [[20.82, 1.9], [21.03, 1.62, 'outCubic'], [21.51, 1.5, 'outQuad'], [22.16, 1.0, 'inOutCubic'], [22.96, 0.915, 'outQuad'], [23.1, 0.9, 'linear']]);
    const rot = M.key(t, [[20.82, -0.15], [21.03, -0.05, 'outQuad'], [21.51, 0, 'outQuad']]);
    c.save();
    c.translate(960, 560);
    c.rotate(rot);
    c.scale(z, z);
    c.translate(-960, -560);
    // wires from every tile into the card
    c.save();
    c.strokeStyle = C.light;
    c.lineWidth = 4;
    c.setLineDash([14, 14]);
    c.lineDashOffset = -t * 140;
    c.globalAlpha = 0.7;
    for (const [, x, y] of STAGE) {
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(960, 565);
      c.stroke();
    }
    c.restore();
    for (const [slug, x, y, s, b] of STAGE) {
      const reveal = M.prog(t, 21.3, 21.75);
      const a = s > 250 ? 1 : reveal;
      if (a <= 0) continue;
      M.withLayer(c, (l) => T.appTile(l, slug, x, y, s), { blur: b + (1 - a) * 10, alpha: a });
    }
    // the dark card
    c.save();
    c.shadowColor = 'rgba(9,30,66,0.4)';
    c.shadowBlur = 50;
    M.fillRR(c, CARD.x, CARD.y, CARD.w, CARD.h, 26, C.ink);
    c.restore();
    T.brandTile(c, CARD.x + 80, CARD.y + 80, 84, { flat: true });
    const sw = M.prog(t, SWAP, SWAP + 0.17);
    if (sw < 1) M.blurWord(c, F.card, CARD.x + CARD.w / 2, CARD.y + 220, 1 - sw, { size: cardSize, weight: 800, color: '#ffffff', align: 'center', blurFrom: 12, track: -0.02 });
    if (sw > 0) {
      if (small) M.blurWord(c, small, CARD.x + 52, CARD.y + 205, sw, { size: T.fit(c, small, 60, 500, CARD.w - 100), weight: 500, color: C.onDark, blurFrom: 10 });
      M.blurWord(c, big, CARD.x + 50, CARD.y + 290, sw, { size: bigSize, weight: 800, color: '#ffffff', blurFrom: 12, track: -0.02 });
    }
    c.restore();
    const wo = M.prog(t, 22.7, 23.15);
    if (wo > 0) {
      c.fillStyle = `rgba(233,235,238,${M.ease.inOutQuad(wo)})`;
      c.fillRect(0, 0, W, H);
    }
  };

  // ---------------------------------------------------------------- end card
  // the tagline in two halves, split at its comma, each landing with its half of the line
  const TW = T.words(K.end.tagline);
  const cut = TW.findIndex((w) => /,$/.test(w.s));
  const half1 = cut >= 0 ? TW.slice(0, cut + 1) : TW.slice(0, Math.ceil(TW.length / 2));
  const half2 = TW.slice(half1.length);
  const E1 = T.cues('tag1', half1.map((w) => w.s), T.rhythm(half1.length, [23.25, 23.38, 23.66]), 'end').map((t) => M.clamp(t, 23.15, 24.1));
  const E2 = T.cues('tag2', half2.map((w) => w.s), T.rhythm(half2.length, [24.3, 24.43, 24.66]), 'end').map((t) => M.clamp(t, 24.2, 25.3));
  const TAG = [...half1.map((w, i) => ({ ...w, t0: E1[i] })), ...half2.map((w, i) => ({ ...w, t0: E2[i] }))];
  let endSizes = null;
  S.end = (c, t) => {
    if (!endSizes) {
      const wm = T.fit(c, K.brand.name, 150, 800, 1100 - 148, -0.03);
      endSizes = { tag: T.fit(c, T.plain(K.end.tagline), 66, 600, 1500, -0.02), wm, wmw: M.measure(c, K.brand.name, wm, 800, -0.03) };
    }
    const v = M.key(t, [[25.6, 233], [25.75, 128, 'inQuad'], [25.86, 42, 'linear'], [26.0, 17, 'outQuad'], [26.27, 0, 'outQuad']]);
    const dark = 1 - v / 233;
    // the page fades from light grey to the brand's night
    const [r, g, b] = M.mix([233, 235, 238], C.night, dark);
    c.fillStyle = `rgb(${r | 0},${g | 0},${b | 0})`;
    c.fillRect(0, 0, W, H);
    // the hairline grows into the brand tile
    const iw = M.key(t, [[23.2, 3], [23.55, 10, 'inQuad'], [23.68, 56, 'inQuad'], [23.92, 170, 'linear'], [24.2, 260, 'outCubic']]);
    const ih = M.key(t, [[23.15, 0], [23.32, 270, 'outCubic'], [23.68, 244, 'inOutQuad'], [24.2, 260, 'outQuad']]);
    const end = M.ease.inOutCubic(M.prog(t, 25.6, 25.92));
    // the end lockup (tile + wordmark) is centred as a group
    const lockX = 960 - (118 + 30 + endSizes.wmw) / 2;
    const cx = M.lerp(960, lockX + 59, end);
    const cy = M.lerp(380, 528, end);
    const sz = M.lerp(1, 118 / 260, end);
    const w = iw * sz;
    const h = ih * sz;
    if (h > 1) {
      M.withLayer(
        c,
        (l) => {
          const gr = l.createLinearGradient(cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2);
          gr.addColorStop(0, C.light);
          gr.addColorStop(1, C.brand);
          M.fillRR(l, cx - w / 2, cy - h / 2, w, h, Math.max(1, Math.min(w, h) * 0.24), gr);
          const d = M.prog(t, 23.75, 24.15);
          if (d > 0) T.mark(l, cx, cy, Math.min(w, h) * 0.56 * M.ease.outBack(d, 1.6), K.brand.markColor || '#ffffff');
        },
        { blur: Math.sin(Math.PI * M.prog(t, 25.6, 25.95)) * 8 }
      );
    }
    // tagline: re-centres as each word lands; later shrinks under the wordmark
    const S0 = endSizes.tag;
    const ty = M.lerp(600, 664, end);
    const ts = M.lerp(S0, S0 * 0.7, end);
    const ink = dark > 0.5 ? '#ffffff' : C.ink;
    c.save();
    c.translate(960, ty);
    c.scale(ts / S0, ts / S0);
    c.translate(-960, -ty);
    M.wordLine(
      c,
      TAG.map((w) => ({ s: w.s, t0: w.t0, weight: w.accent ? 800 : 500, color: w.accent ? (dark > 0.5 ? C.onDark : C.text) : ink })),
      t,
      { size: S0, x: 960, y: ty, dur: 0.3, slide: 30, blurFrom: 10, gap: S0 * 0.27, track: -0.02 }
    );
    c.restore();
    const wm = M.prog(t, 25.66, 25.9);
    if (wm > 0) M.blurWord(c, K.brand.name, lockX + 148, 582 - (150 - endSizes.wm) * 0.36, wm, { size: endSizes.wm, weight: 800, color: '#ffffff', blurFrom: 16, track: -0.03 });
  };
})();
