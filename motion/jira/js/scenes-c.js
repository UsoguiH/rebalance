// Jira scenes, part C: "Plan once, Ship faster (:", the Boards ring folding into
// a Timeline, the Automation wall of integrations wired together into
// "All connected", and the Jira end card.
(function () {
  const S = M.scenes;
  const J = M.jira;
  const C = J.C;
  const { W, H } = M;

  // ---------------------------------------------------------------- Plan once
  const PLAN = { x: 600, base: 574, size: 80 };
  const WORDS = [
    { s: 'Plan', t0: 17.27, w: 500, col: C.ink },
    { s: 'once,', t0: 17.33, w: 500, col: C.ink },
    { s: 'And', t0: 17.86, w: 800, col: C.blue, up: 1 },
    { s: 'ship', t0: 17.95, w: 800, col: C.blue, up: 1 },
    { s: '(:', t0: 18.02, w: 800, col: C.blue, up: 1 },
  ];
  const layout = (c) => {
    if (WORDS[0].dx !== undefined) return;
    let x = 0;
    for (const w of WORDS) {
      w.dx = x;
      x += M.measure(c, w.s, PLAN.size, w.w, -0.02) + PLAN.size * (w.s === 'once,' ? 0.14 : 0.2);
    }
  };
  const cam = (t) => M.key(t, [[17.2, 0.97], [17.78, 1.0, 'linear'], [17.9, 1.03, 'inQuad'], [18.03, 1.2, 'inQuad'], [18.25, 1.6, 'outQuad'], [18.7, 1.8, 'outCubic'], [18.85, 2.1, 'inQuad']]);
  const out = (t) => M.prog(t, 18.72, 18.85);
  const swoosh = (c, p) => {
    if (p <= 0) return null;
    const pts = [];
    for (let i = 0; i <= 40; i++) {
      const u = (i / 40) * p;
      pts.push([PLAN.x + 4 + u * 360, PLAN.base + 16 + Math.pow(u, 2.2) * 38, 8.5 * (1 - Math.pow(u, 1.6) * 0.8)]);
    }
    c.save();
    c.fillStyle = C.blue4;
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
  S.planOnce = (c, t) => {
    c.fillStyle = '#e9ebee';
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
        const col = w.up || dark > 0.99 ? w.col : `rgba(9,30,66,${0.35 + 0.65 * dark})`;
        M.blurWord(cc, w.s, PLAN.x + w.dx + dx, PLAN.base + dy, M.ease.outQuad(p), { size: PLAN.size, weight: w.w, color: col, blurFrom: 8, track: -0.02 });
      }
      cc.restore();
      return tip ? [(tip[0] - 980) * s + 980, (tip[1] - 540) * s + 540] : null;
    };
    let tip = null;
    if (out(t) > 0) M.withLayer(c, (l) => draw(l), { blur: out(t) * 16, alpha: 1 - out(t) * 0.35 });
    else tip = draw(c);
    if (t < 18.3) {
      const inTr = [[17.2, -60, 650], [17.28, 430, 627]];
      const outTr = [[17.9, 1000, 690], [18.03, 1090, 712], [18.15, 1380, 760], [18.3, 2060, 820]];
      let p;
      let q;
      if (t < 17.28) [p, q] = [M.track(t - 0.03, inTr), M.track(t, inTr)];
      else if (t < 17.9 && tip) p = q = [tip[0] + 18, tip[1] + 6];
      else [p, q] = [M.track(t - 0.03, outTr), M.track(t, outTr)];
      M.cursorSmear(c, p[0], p[1], q[0], q[1], 1.05);
    }
  };

  // ---------------------------------------------------------------- Boards -> Timeline
  const RING = [101, 104, 112, 97, 99, 90, 88, 85];
  const ringAngle = (t) => (-90 - 64 * Math.exp(-4.75 * (t - 18.95))) * (Math.PI / 180);
  const ringScale = (t) => M.key(t, [[18.85, 1.25], [18.95, 1.0, 'outCubic'], [19.1, 0.95, 'linear'], [19.35, 0.87, 'outQuad'], [19.45, 0.86, 'linear']]);
  // a mini issue card for the ring
  const mini = (c, id, x, y, s, sx = 1, sy = 1) => {
    const is = J.ISSUES[id];
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
      J.typeIcon(c, 18, 18, 30, is.type);
      M.fillRR(c, 18, 66, 190, 14, 7, C.line);
      M.fillRR(c, 18, 92, 130, 14, 7, C.line);
      J.avatar(c, 196, 122, 18, is.who, is.col);
      M.text(c, is.key, 18, 132, { size: 18, weight: 700, color: C.sub });
    }
    c.restore();
  };
  // timeline card, centred on (960, 560); open 0..1 unfolds it
  const BARS = [
    ['Design', C.purple, 0.0, 0.34],
    ['Build', C.blue4, 0.22, 0.7],
    ['Test', C.teal, 0.55, 0.85],
    ['Launch', C.green, 0.8, 1.0],
  ];
  const timeline = (c, t, open) => {
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
    // month ticks
    ['Jun', 'Jul', 'Aug', 'Sep'].forEach((m, i) => M.text(c, m, x + 260 + i * 220, y + 52, { size: 22, weight: 600, color: C.sub }));
    c.fillStyle = C.line;
    c.fillRect(x + 240, y + 70, w - 280, 2);
    BARS.forEach(([name, col, a, b], i) => {
      const yy = y + 100 + i * 58;
      M.text(c, name, x + 40, yy + 30, { size: 26, weight: 600, color: C.navy });
      const g = M.ease.outCubic(M.prog(t, 19.62 + i * 0.07, 19.95 + i * 0.07));
      const x0 = x + 250 + a * 820;
      const bw = (b - a) * 820 * g;
      if (bw > 2) M.fillRR(c, x0, yy + 6, bw, 34, 17, col);
    });
    // "today" marker
    const today = x + 250 + 0.58 * 820;
    c.fillStyle = C.red;
    c.fillRect(today, y + 80, 3, 240);
    c.restore();
  };
  S.boards = (c, t) => {
    c.fillStyle = '#e9ebee';
    c.fillRect(0, 0, W, H);
    if (t < 19.52) {
      const fold = M.ease.inCubic(M.prog(t, 19.39, 19.52));
      const s = ringScale(t);
      const spin = Math.abs(ringAngle(t + 0.016) - ringAngle(t - 0.016)) * 30;
      const n = M.clamp(Math.round(spin * 2), 1, 6);
      M.motionBlur(c, n, (cc, u) => {
        const a0 = ringAngle(t + (u - 0.5) * 0.03);
        RING.forEach((id, i) => {
          const a = a0 + (i * Math.PI) / 4;
          const r = 330 * s;
          mini(cc, id, 960 + Math.cos(a) * r * (1 + fold * 0.3), 560 + Math.sin(a) * r * (1 - fold * 0.95), s * 0.95, 1 + fold * 0.4, 1 - fold * 0.8);
        });
      });
      M.withLayer(c, (l) => M.text(l, 'Boards', 960, 560 + 40 * s, { size: 116 * s, weight: 800, color: C.ink, align: 'center', track: -0.03 }), {
        blur: (1 - M.prog(t, 18.85, 18.95)) * 10 + fold * 8,
        alpha: 1 - fold,
      });
      if (fold > 0.5) timeline(c, t, 0);
      return;
    }
    const open = M.ease.outBack(M.prog(t, 19.5, 19.64), 1.2);
    const o = M.prog(t, 20.1, 20.2);
    const draw = (cc) => {
      timeline(cc, t, open);
      const word = 'Timeline';
      const keys = [19.55, 19.6, 19.64, 19.68, 19.72, 19.76, 19.8, 19.84];
      let x = 960 - M.measure(cc, word, 112, 800, -0.02) / 2;
      for (let i = 0; i < word.length; i++) {
        const p = M.prog(t, keys[i], keys[i] + 0.16);
        const w = M.measure(cc, word[i], 112, 800, -0.02);
        if (p > 0) M.blurWord(cc, word[i], x, 330 - (1 - M.ease.outBack(p, 2)) * 40, p, { size: 112, weight: 800, color: C.ink, blurFrom: 8, track: -0.02 });
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

  // ---------------------------------------------------------------- Automation -> All connected
  // integration tiles on the wall: [slug, x, y, size]
  const WALL = [
    ['github', 300, 230, 230],
    ['bitbucket', 620, 170, 190],
    ['confluence', 1300, 170, 200],
    ['figma', 1640, 240, 230],
    ['gmail', 230, 640, 210],
    ['googlecalendar', 560, 880, 190],
    ['zoom', 1370, 880, 200],
    ['googlesheets', 1700, 660, 210],
    ['trello', 960, 900, 170],
  ];
  // the Connected stage, framed around the card: [slug, x, y, size, blur]
  const STAGE = [
    ['github', 160, 170, 300, 6],
    ['figma', 1720, 180, 320, 8],
    ['confluence', 380, 860, 260, 2],
    ['zoom', 1560, 860, 280, 2],
    ['gmail', 1040, 120, 200, 10],
    ['googlesheets', 140, 560, 220, 8],
    ['bitbucket', 1820, 560, 220, 8],
    ['googlecalendar', 960, 980, 180, 4],
  ];
  const CARD = { x: 646, y: 400, w: 628, h: 330 };
  S.automation = (c, t) => {
    c.fillStyle = '#e9ebee';
    c.fillRect(0, 0, W, H);
    if (t < 20.82) {
      const tint = M.prog(t, 20.45, 20.7);
      if (tint > 0) {
        c.fillStyle = M.rgrad(c, 960, 540, 100, 1400, [[0, `rgba(222,235,255,${tint})`], [1, `rgba(76,154,255,${tint * 0.7})`]]);
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
            l.strokeStyle = C.blue4;
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
          WALL.forEach(([slug, x, y, s], i) => J.appTile(l, slug, x, y, s, { rot: Math.sin(i * 2.1) * 0.06 }));
          l.save();
          l.translate(960, 500);
          l.scale(ts, ts);
          M.text(l, 'Automation', 0, 54, { size: 160, weight: 800, color: C.ink, align: 'center', track: -0.03 });
          l.restore();
        },
        { blur: (1 - M.prog(t, 20.2, 20.4)) * 18 }
      );
      // a blue flash hands over to the Connected card
      const fl = M.prog(t, 20.72, 20.82);
      if (fl > 0) {
        c.fillStyle = M.hgrad(c, 0, W, [[0, `rgba(38,132,255,${fl})`], [0.6, `rgba(0,82,204,${fl})`], [1, `rgba(101,84,192,${fl})`]]);
        c.fillRect(0, 0, W, H);
      }
      return;
    }
    const fl = 1 - M.prog(t, 20.82, 21.02);
    if (fl > 0) {
      c.fillStyle = M.rgrad(c, 300, 0, 100, 1500, [[0, `rgba(38,132,255,${fl})`], [0.45, `rgba(0,82,204,${fl * 0.8})`], [1, 'rgba(101,84,192,0)']]);
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
    c.strokeStyle = C.blue4;
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
      const big = s > 250;
      const a = big ? 1 : reveal;
      if (a <= 0) continue;
      M.withLayer(c, (l) => J.appTile(l, slug, x, y, s), { blur: b + (1 - a) * 10, alpha: a });
    }
    // the dark card
    c.save();
    c.shadowColor = 'rgba(9,30,66,0.4)';
    c.shadowBlur = 50;
    M.fillRR(c, CARD.x, CARD.y, CARD.w, CARD.h, 26, C.ink);
    c.restore();
    J.jiraTile(c, CARD.x + 80, CARD.y + 80, 84, { flat: true });
    const sw = M.prog(t, 21.62, 21.8);
    if (sw < 1) M.blurWord(c, 'Reports', CARD.x + CARD.w / 2, CARD.y + 220, 1 - sw, { size: 112, weight: 800, color: '#ffffff', align: 'center', blurFrom: 12, track: -0.02 });
    if (sw > 0) {
      M.blurWord(c, 'Pure', CARD.x + 52, CARD.y + 205, sw, { size: 60, weight: 500, color: C.blue3, blurFrom: 10 });
      M.blurWord(c, 'focus.', CARD.x + 50, CARD.y + 290, sw, { size: 112, weight: 800, color: '#ffffff', blurFrom: 12, track: -0.02 });
    }
    c.restore();
    const wo = M.prog(t, 22.35, 23.1);
    if (wo > 0) {
      c.fillStyle = `rgba(233,235,238,${M.ease.inOutQuad(wo)})`;
      c.fillRect(0, 0, W, H);
    }
  };

  // ---------------------------------------------------------------- end card
  const TAG = [
    { s: 'Your', t0: 23.15 },
    { s: 'whole', t0: 23.33 },
    { s: 'team,', t0: 23.55 },
    { s: 'in', t0: 23.85 },
    { s: 'one', t0: 24.05 },
    { s: 'place.', t0: 24.35, weight: 800, blue: true },
  ];
  S.end = (c, t) => {
    const v = M.key(t, [[25.6, 233], [25.75, 128, 'inQuad'], [25.86, 42, 'linear'], [26.0, 17, 'outQuad'], [26.27, 0, 'outQuad']]);
    const dark = 1 - v / 233;
    // page fades from light grey to Atlassian navy-black
    const [r, g, b] = M.mix([233, 235, 238], [5, 11, 24], dark);
    c.fillStyle = `rgb(${r | 0},${g | 0},${b | 0})`;
    c.fillRect(0, 0, W, H);
    // the hairline grows into the Jira tile
    const iw = M.key(t, [[23.2, 3], [23.55, 10, 'inQuad'], [23.68, 56, 'inQuad'], [23.92, 170, 'linear'], [24.2, 260, 'outCubic']]);
    const ih = M.key(t, [[23.15, 0], [23.32, 270, 'outCubic'], [23.68, 244, 'inOutQuad'], [24.2, 260, 'outQuad']]);
    const end = M.ease.inOutCubic(M.prog(t, 25.6, 25.92));
    // the end lockup (tile + wordmark) is centred as a group
    const wmw = M.measure(c, 'Jira', 150, 800, -0.03);
    const lockX = 960 - (118 + 30 + wmw) / 2;
    const cx = M.lerp(960, lockX + 59, end);
    const cy = M.lerp(380, 528, end);
    const sz = M.lerp(1, 118 / 260, end);
    const w = iw * sz;
    const h = ih * sz;
    if (h > 1) {
      M.withLayer(
        c,
        (l) => {
          const g = l.createLinearGradient(cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2);
          g.addColorStop(0, '#2f8bff');
          g.addColorStop(1, C.blue);
          M.fillRR(l, cx - w / 2, cy - h / 2, w, h, Math.max(1, Math.min(w, h) * 0.24), g);
          const d = M.prog(t, 23.75, 24.15);
          if (d > 0) M.icon(l, 'jira', cx, cy, Math.min(w, h) * 0.56 * M.ease.outBack(d, 1.6), '#ffffff');
        },
        { blur: Math.sin(Math.PI * M.prog(t, 25.6, 25.95)) * 8 }
      );
    }
    // tagline: re-centres as each word lands; later shrinks under the wordmark
    const ty = M.lerp(600, 664, end);
    const ts = M.lerp(66, 46, end);
    const ink = dark > 0.5 ? '#ffffff' : C.ink;
    c.save();
    c.translate(960, ty);
    c.scale(ts / 66, ts / 66);
    c.translate(-960, -ty);
    M.wordLine(
      c,
      TAG.map((w) => ({ s: w.s, t0: w.t0, weight: w.weight || 500, color: w.blue ? (dark > 0.5 ? C.blue3 : C.blue) : ink })),
      t,
      { size: 66, x: 960, y: ty, dur: 0.3, slide: 30, blurFrom: 10, gap: 18, track: -0.02 }
    );
    c.restore();
    const wm = M.prog(t, 25.66, 25.9);
    if (wm > 0) M.blurWord(c, 'Jira', lockX + 148, 582, wm, { size: 150, weight: 800, color: '#ffffff', blurFrom: 16, track: -0.03 });
  };
})();
