// Scenes, part C: the 3D arch of "No more unnecessary costs", "Pay once, And
// done (:", the Video ring that folds into the Voice card, the Image wall,
// Motion / Pure Creation, and the logo ending.
(function () {
  const S = M.scenes;
  const { W, H } = M;
  const A = M.art;
  const P = A.photos;

  // ---------------------------------------------------------------- unnecessary costs
  // Each glyph sits on a curved 3D arch; its screen pose was read off the
  // original at two moments and is interpolated (and extrapolated) in time.
  // [text, red?, weight, [x, y, angle, size] @15.20, [x, y, angle, size] @16.46, blur]
  const ARCH = [
    ['No', 0, 500, [300, 590, -28, 150], [250, 675, -42, 165], 5],
    ['more', 0, 500, [510, 495, -20, 78], [550, 445, -34, 82], 1.5],
    ['u', 1, 600, [636, 520, 0, 80], [735, 475, 0, 80], 0.5],
    ['n', 1, 700, [663, 405, 0, 96], [770, 382, 0, 98], 0],
    ['n', 1, 600, [730, 405, 0, 76], [835, 376, 0, 76], 0],
    ['e', 1, 600, [795, 410, 0, 70], [895, 372, 0, 70], 0],
    ['C', 1, 700, [920, 345, 0, 130], [995, 262, 0, 134], 0],
    ['e', 1, 600, [998, 402, 8, 76], [1090, 352, 10, 76], 0],
    ['s', 1, 600, [1060, 462, 14, 74], [1135, 420, 18, 74], 0],
    ['s', 1, 600, [1118, 482, 16, 74], [1180, 470, 20, 74], 0],
    ['a', 1, 700, [1185, 530, 6, 96], [1235, 535, 8, 96], 0],
    ['r', 1, 600, [1290, 548, 4, 84], [1340, 556, 4, 84], 0],
    ['y', 1, 600, [1372, 556, 6, 84], [1410, 566, 6, 84], 0],
    ['costs', 0, 500, [1580, 565, 18, 98], [1575, 580, 30, 98], 1.5],
  ];
  const tags = () =>
    M.pic('cost-tags', W, H, (c) => {
      c.fillStyle = M.rgrad(c, 960, 520, 100, 1150, [[0, '#1d1d1d'], [1, '#0f0f0f']]);
      c.fillRect(0, 0, W, H);
      // dark product tags scattered around the edges, out of focus
      const tag = (x, y, w, h, rot, label, red) => {
        c.save();
        c.translate(x, y);
        c.rotate(rot);
        c.filter = 'blur(6px)';
        M.fillRR(c, -w / 2, -h / 2, w, h, 26, '#0b0b0b');
        c.filter = 'blur(3px)';
        if (label) {
          // chromatic fringes on the tag print
          for (const [dx, col] of [[-4, 'rgba(255,40,40,0.8)'], [4, 'rgba(60,220,255,0.6)'], [0, red ? '#d21a1a' : '#d8d8d8']]) {
            c.fillStyle = col;
            M.setFont(c, h * 0.22, 800);
            c.fillText(label, -w * 0.38 + dx, 0);
          }
        }
        c.restore();
      };
      tag(1120, 900, 330, 330, Math.PI / 4, null);
      tag(470, 950, 240, 150, 0.1, '▣');
      tag(1150, 970, 300, 160, -0.05, '❦  ❧');
      tag(1820, 160, 380, 230, 0.6, '$200', true);
      tag(60, 230, 260, 260, -0.7, '$20', true);
      tag(1830, 880, 300, 240, -0.5, '$99', true);
      tag(620, 60, 420, 120, 0, '$19.99', true);
      c.filter = 'none';
      c.fillStyle = M.rgrad(c, 960, 540, 300, 1100, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.5)']]);
      c.fillRect(0, 0, W, H);
    });

  S.costs = (c, t) => {
    // the plate drifts with the slow orbit
    const k = (t - 15.2) / 1.26;
    c.save();
    c.translate(W / 2, H / 2);
    c.rotate(k * 0.03);
    c.scale(1.04 + k * 0.03, 1.04 + k * 0.03);
    c.translate(-W / 2, -H / 2 - k * 30);
    c.drawImage(tags(), 0, 0);
    c.restore();
    for (const [s, red, wt, a, b, blur] of ARCH) {
      const x = M.lerp(a[0], b[0], k);
      const y = M.lerp(a[1], b[1], k);
      const ang = M.lerp(a[2], b[2], k);
      const size = M.lerp(a[3], b[3], k) * 1.3;
      const draw = (l, dx, col) => {
        l.save();
        l.translate(x + dx, y);
        l.rotate((ang * Math.PI) / 180);
        M.text(l, s, 0, size * 0.36, { size, weight: wt, color: col, align: 'center', track: -0.02 });
        l.restore();
      };
      M.withLayer(
        c,
        (l) => {
          if (red) {
            l.save();
            l.shadowColor = 'rgba(255,0,0,0.55)';
            l.shadowBlur = 14;
            draw(l, 0, '#ff1414');
            l.restore();
          } else {
            // white glyphs carry red/cyan fringes, like the original's lens
            l.globalCompositeOperation = 'lighter';
            draw(l, -blur * 1.4 - 2, 'rgba(255,40,40,0.9)');
            draw(l, blur * 1.4 + 2, 'rgba(40,220,255,0.8)');
            l.globalCompositeOperation = 'source-over';
            draw(l, 0, 'rgba(235,235,235,0.85)');
          }
        },
        { blur: blur }
      );
    }
    const [cx, cy] = M.track(t, [[15.135, 940, 480], [15.2, 950, 470], [15.5, 1000, 430], [15.9, 1060, 380], [16.46, 1120, 345], [17.06, 1150, 330]]);
    M.cursor(c, cx, cy, 0.95, { rot: -0.5 });
  };

  // ---------------------------------------------------------------- Pay once
  // world layout at camera scale 1 (the framing around 17.75s)
  const PAY = { x: 612, base: 574, size: 80 };
  const payCam = (t) =>
    M.key(t, [[17.06, 0.97], [17.75, 1.0, 'linear'], [17.88, 1.03, 'inQuad'], [18.01, 1.2, 'inQuad'], [18.23, 1.62, 'outQuad'], [18.59, 1.84, 'outCubic'], [18.714, 2.1, 'inQuad']]);
  const payOut = (t) => M.prog(t, 18.6, 18.714);
  const underline = (c, p) => {
    if (p <= 0) return;
    // a brush swoosh: thick under "Pay", tapering and dipping past the comma
    const pts = [];
    for (let i = 0; i <= 40; i++) {
      const u = (i / 40) * p;
      const x = PAY.x + 4 + u * 330;
      const y = PAY.base + 14 + Math.pow(u, 2.2) * 38;
      pts.push([x, y, 8.5 * (1 - Math.pow(u, 1.6) * 0.8)]);
    }
    c.save();
    c.fillStyle = '#1f4fd0';
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
  const PAYWORDS = [
    { s: 'Pay', t0: 17.11, w: 500, col: '#111' },
    { s: 'once,', t0: 17.17, w: 500, col: '#111' },
    { s: 'And', t0: 17.84, w: 700, col: '#1f4fd0', up: 1 },
    { s: 'done', t0: 17.93, w: 700, col: '#1f4fd0', up: 1 },
    { s: '(:', t0: 18.0, w: 700, col: '#1f4fd0', up: 1 },
  ];
  const payLayout = (c) => {
    if (PAYWORDS[0].dx === undefined) {
      let x = 0;
      for (const w of PAYWORDS) {
        w.dx = x;
        x += M.measure(c, w.s, PAY.size, w.w, -0.02) + PAY.size * (w.s === 'once,' ? 0.12 : 0.2);
      }
    }
  };
  S.payOnce = (c, t) => {
    c.fillStyle = '#e0e0e0';
    c.fillRect(0, 0, W, H);
    payLayout(c);
    const draw = (cc, tt) => {
      const s = payCam(tt);
      cc.save();
      cc.translate(980 + M.prog(tt, 17.75, 18.6) * 10, 540 + M.prog(tt, 17.75, 18.6) * 20 + payOut(tt) * 50);
      cc.scale(s, s);
      cc.translate(-980, -540);
      const tip = underline(cc, M.ease.outCubic(M.prog(tt, 17.12, 17.75)));
      for (const w of PAYWORDS) {
        const p = M.clamp((tt - w.t0) / 0.22, 0, 1);
        if (p <= 0) continue;
        const dy = w.up ? (1 - M.ease.outCubic(p)) * 22 : 0;
        const dx = w.up ? (1 - M.ease.outCubic(p)) * 30 : (1 - M.ease.outCubic(p)) * 40;
        // "Pay once," starts grey and darkens as the stroke passes
        const col = w.up ? w.col : M.prog(tt, w.t0 + 0.05, w.t0 + 0.35) > 0.99 ? w.col : `rgba(17,17,17,${0.35 + 0.65 * M.prog(tt, w.t0 + 0.05, w.t0 + 0.35)})`;
        M.blurWord(cc, w.s, PAY.x + w.dx + dx, PAY.base + dy, M.ease.outQuad(p), { size: PAY.size, weight: w.w, color: col, blurFrom: 8, track: -0.02 });
      }
      cc.restore();
      return tip ? [(tip[0] - 980) * s + 980, (tip[1] - 540) * s + 540] : null;
    };
    let tip = null;
    const out = payOut(t);
    if (out > 0) M.withLayer(c, (l) => draw(l, t), { blur: out * 16, alpha: 1 - out * 0.35 });
    else tip = draw(c, t);
    // cursor: flies in from the left, drags the underline, then exits right
    if (t < 18.15) {
      let x;
      let y;
      if (t < 17.12) [x, y] = M.track(t, [[17.04, -60, 650], [17.12, 445, 627]]);
      else if (t < 17.75 && tip) [x, y] = [tip[0] + 18, tip[1] + 6];
      else [x, y] = M.track(t, [[17.75, 996, 687], [17.88, 1069, 710], [18.0, 1361, 760], [18.15, 2050, 820]]);
      const [px, py] = t < 17.12 ? M.track(t - 0.03, [[17.04, -60, 650], [17.12, 445, 627]]) : t > 17.75 ? M.track(t - 0.03, [[17.75, 996, 687], [17.88, 1069, 710], [18.0, 1361, 760], [18.15, 2050, 820]]) : [x, y];
      M.cursorSmear(c, px, py, x, y, 1.05);
    }
  };

  // ---------------------------------------------------------------- Video -> Voice
  const RING = ['blonde', 'statue', 'biker', 'legs', 'redhair', 'street', 'night', 'bob'];
  const ringAngle = (t) => (-90 - 64 * Math.exp(-4.75 * (t - 18.81))) * (Math.PI / 180);
  const ringScale = (t) => M.key(t, [[18.714, 1.25], [18.81, 1.0, 'outCubic'], [18.97, 0.95, 'linear'], [19.2, 0.87, 'outQuad'], [19.3, 0.86, 'linear']]);
  const thumb = (c, name, x, y, s, a = 1, sx = 1, sy = 1) => {
    const img = P[name]();
    const w = 190 * s * sx;
    const h = 190 * s * sy;
    c.save();
    c.globalAlpha *= a;
    M.rr(c, x - w / 2, y - h / 2, w, h, 24 * s);
    c.clip();
    const k = Math.max(w / img.width, h / img.height);
    c.drawImage(img, x - (img.width * k) / 2, y - (img.height * k) / 2, img.width * k, img.height * k);
    c.restore();
  };
  // the voice card, centred on (960, 542); open 0..1 unfolds it
  const voiceCard = (c, t, open) => {
    const x = 414;
    const y = 420;
    const w = 1092;
    const h = 244;
    c.save();
    c.translate(960, 542);
    c.scale(M.lerp(0.55, 1, open), M.lerp(0.12, 1, open));
    c.translate(-960, -542);
    M.fillRR(c, x, y, w, h, 40, 'rgba(184,184,188,0.85)');
    // play button
    const g = c.createLinearGradient(500, 460, 660, 620);
    g.addColorStop(0, '#3b78d8');
    g.addColorStop(1, '#173f8c');
    c.fillStyle = g;
    c.beginPath();
    c.arc(580, 542, 84, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#fff';
    c.beginPath();
    c.moveTo(560, 505);
    c.lineTo(612, 542);
    c.lineTo(560, 579);
    c.closePath();
    c.fill();
    const tp = M.prog(t, 19.33, 19.43);
    M.blurWord(c, 'Adam', 718, 552, tp, { size: 74, weight: 600, color: '#1a1a1a', blurFrom: 10 });
    M.blurWord(c, 'Brooding, Dark', 718, 592, tp, { size: 32, weight: 400, color: '#5a5a5a', blurFrom: 6 });
    M.fillRR(c, 954, 472, 462, 140, 40, '#1f4bd8');
    M.blurWord(c, 'Select voice', 1185, 566, M.prog(t, 19.35, 19.47), { size: 64, weight: 600, color: '#ffffff', align: 'center', blurFrom: 10 });
    c.restore();
  };
  S.video = (c, t) => {
    c.fillStyle = '#e0e0e0';
    c.fillRect(0, 0, W, H);
    if (t < 19.35) {
      // the rotating ring of clips around "Video"
      const fold = M.ease.inCubic(M.prog(t, 19.22, 19.35));
      const s = ringScale(t);
      const spin = Math.abs(ringAngle(t + 0.016) - ringAngle(t - 0.016)) * 30;
      const n = M.clamp(Math.round(spin * 2), 1, 6);
      M.motionBlur(c, n, (cc, u) => {
        const a0 = ringAngle(t + (u - 0.5) * 0.03);
        RING.forEach((name, i) => {
          const a = a0 + (i * Math.PI) / 4;
          const r = 300 * s;
          const x = 960 + Math.cos(a) * r * (1 + fold * 0.3);
          const y = 542 + Math.sin(a) * r * (1 - fold * 0.95);
          thumb(cc, name, x, y, s, 1, 1 + fold * 0.4, 1 - fold * 0.8);
        });
      });
      M.withLayer(c, (l) => M.text(l, 'Video', 960, 542 + 38 * s, { size: 108 * s, weight: 700, color: '#0d0d0d', align: 'center', track: -0.02 }), {
        blur: (1 - M.prog(t, 18.714, 18.8)) * 10 + fold * 8,
        alpha: 1 - fold,
      });
      if (fold > 0.5) voiceCard(c, t, 0);
      return;
    }
    // Voice: the card unfolds and the title types in, letters dropping into place
    const open = M.ease.outBack(M.prog(t, 19.33, 19.46), 1.2);
    const out = M.prog(t, 19.98, 20.082);
    const draw = (cc) => {
      voiceCard(cc, t, open);
      const word = 'Voice';
      const keys = [19.34, 19.47, 19.53, 19.6, 19.66];
      let x = 960 - M.measure(cc, word, 112, 700, -0.02) / 2;
      for (let i = 0; i < word.length; i++) {
        const p = M.prog(t, keys[i], keys[i] + 0.16);
        const w = M.measure(cc, word[i], 112, 700, -0.02);
        if (p > 0) M.blurWord(cc, word[i], x, 312 - (1 - M.ease.outBack(p, 2)) * 40, p, { size: 112, weight: 700, color: '#0d0d0d', blurFrom: 8, track: -0.02 });
        x += w;
      }
    };
    if (out > 0) {
      M.withLayer(c, (l) => {
        l.translate(960, 542);
        l.scale(1 - out * 0.2, 1 - out * 0.2);
        l.translate(-960, -542);
        draw(l);
      }, { blur: out * 6, alpha: 1 });
    } else draw(c);
  };

  // ---------------------------------------------------------------- Image -> Motion -> Creation
  // the photo wall, laid out as in the original at ~20.48s: [photo, x, y, w, h]
  const WALL = [
    ['robot', 140, 60, 370, 240],
    ['eye', 130, 310, 370, 200],
    ['keyhole', 560, 100, 370, 210],
    ['field', 980, 110, 370, 210],
    ['redman', 1410, 80, 400, 530],
    ['geisha', 100, 520, 320, 430],
    ['cows', 490, 540, 290, 390],
    ['volcano', 850, 600, 590, 340],
    ['jeep', 1490, 620, 260, 330],
  ];
  const pic = (c, name, x, y, w, h, r = 22) => {
    const img = P[name]();
    c.save();
    M.rr(c, x, y, w, h, r);
    c.clip();
    const k = Math.max(w / img.width, h / img.height);
    c.drawImage(img, x + w / 2 - (img.width * k) / 2, y + h / 2 - (img.height * k) / 2, img.width * k, img.height * k);
    c.restore();
  };
  // Motion / Creation stage: [photo, x, y, w, h, blur] around the black card
  const STAGE = [
    ['geisha', -20, 50, 390, 430, 4],
    ['field', 670, 50, 580, 280, 3],
    ['eye', 1120, 50, 800, 250, 12],
    ['volcano', -20, 760, 350, 300, 8],
    ['street', 550, 950, 720, 200, 3],
    ['jeep', 160, 280, 400, 520, 1],
    ['robot', 784, 746, 232, 154, 1],
    ['cows', 1260, 316, 564, 724, 0],
  ];
  const CARD = { x: 656, y: 406, w: 540, h: 304 };
  S.image = (c, t) => {
    c.fillStyle = '#e0e0e0';
    c.fillRect(0, 0, W, H);
    if (t < 20.6) {
      // photos swing in from a blur, then the page tints toward sky blue
      const tint = M.prog(t, 20.36, 20.56);
      if (tint > 0) {
        c.fillStyle = M.rgrad(c, 1500, 900, 100, 1500, [[0, `rgba(80,200,230,${tint})`], [1, `rgba(190,215,229,${tint})`]]);
        c.fillRect(0, 0, W, H);
      }
      const z = M.key(t, [[20.082, 0.5], [20.2, 0.86, 'outCubic'], [20.3, 1.08, 'outQuad'], [20.48, 1.0, 'inOutQuad']]);
      const ts = M.key(t, [[20.1, 1.25], [20.3, 1.38, 'outQuad'], [20.48, 1.0, 'inOutQuad']]);
      const sk = M.key(t, [[20.082, 0.6], [20.2, 0.25, 'outCubic'], [20.3, 0.03, 'outQuad'], [20.6, 0, 'outQuad']]);
      const settle = M.prog(t, 20.082, 20.28);
      M.withLayer(
        c,
        (l) => {
          l.translate(960, 540);
          l.transform(1 - sk * 0.25, sk * 0.25, -sk * 0.35, 1, 0, 0);
          l.scale(z, z);
          l.translate(-960, -540);
          for (const [name, x, y, w, h] of WALL) pic(l, name, x, y, w, h);
          l.translate(960, 480);
          l.scale(ts, ts);
          M.text(l, 'Image', 0, 50, { size: 165, weight: 700, color: '#0d0d0d', align: 'center', track: -0.03 });
        },
        { blur: (1 - settle) * 18 }
      );
      // the green flash that hands over to "Motion"
      const fl = M.prog(t, 20.5, 20.6);
      if (fl > 0) {
        c.fillStyle = M.hgrad(c, 0, W, [[0, `rgba(131,249,0,${fl})`], [0.6, `rgba(0,226,83,${fl})`], [1, `rgba(60,210,230,${fl})`]]);
        c.fillRect(0, 0, W, H);
      }
      return;
    }
    // Motion -> Pure Creation, the camera easing back as the wall fills in
    const z = M.key(t, [[20.6, 1.9], [20.81, 1.62, 'outCubic'], [21.29, 1.5, 'outQuad'], [21.94, 1.0, 'inOutCubic'], [22.74, 0.915, 'outQuad'], [23.05, 0.9, 'linear']]);
    const rot = M.key(t, [[20.6, -0.15], [20.81, -0.05, 'outQuad'], [21.29, 0, 'outQuad']]);
    const cx = M.key(t, [[20.6, 960], [21.29, 885, 'outQuad'], [21.94, 926, 'inOutCubic'], [22.74, 959, 'outQuad']]);
    const cy = M.key(t, [[20.6, 640], [20.81, 613, 'outQuad'], [21.29, 574, 'outQuad'], [21.94, 558, 'inOutCubic']]);
    const fl = 1 - M.prog(t, 20.6, 20.8);
    if (fl > 0) {
      c.fillStyle = M.rgrad(c, 300, 0, 100, 1500, [[0, `rgba(131,249,0,${fl})`], [0.45, `rgba(0,226,83,${fl * 0.8})`], [1, `rgba(60,210,230,0)`]]);
      c.fillRect(0, 0, W, H);
    }
    c.save();
    c.translate(cx, cy);
    c.rotate(rot);
    c.scale(z, z);
    c.translate(-926, -558);
    for (const [name, x, y, w, h, b] of STAGE) {
      const reveal = name === 'jeep' || name === 'cows' || name === 'robot' ? 1 : M.prog(t, 21.45, 21.85);
      if (reveal <= 0) continue;
      M.withLayer(c, (l) => pic(l, name, x, y, w, h, 14), { blur: b + (1 - reveal) * 10, alpha: reveal });
    }
    // the black card with a keyhole glimpse behind the word
    c.fillStyle = '#050505';
    c.fillRect(CARD.x, CARD.y, CARD.w, CARD.h);
    c.save();
    c.globalAlpha = 0.55;
    c.beginPath();
    c.rect(CARD.x, CARD.y, CARD.w, CARD.h);
    c.clip();
    c.drawImage(P.keyhole(), CARD.x + 120, CARD.y, 330, CARD.h);
    c.restore();
    const sw = M.prog(t, 21.55, 21.75);
    if (sw < 1) M.blurWord(c, 'Motion', CARD.x + CARD.w / 2, CARD.y + 196, 1 - sw, { size: 140, weight: 700, color: '#ffffff', align: 'center', blurFrom: 12, track: -0.02 });
    if (sw > 0) {
      M.blurWord(c, 'Pure', CARD.x + 58, CARD.y + 112, sw, { size: 50, weight: 500, color: '#ffffff', blurFrom: 10 });
      M.blurWord(c, 'Creation', CARD.x + 56, CARD.y + 210, sw, { size: 108, weight: 700, color: '#ffffff', blurFrom: 12, track: -0.02 });
    }
    c.restore();
    // white-out toward the logo page
    const wo = M.prog(t, 22.3, 23.1);
    if (wo > 0) {
      c.fillStyle = `rgba(224,224,224,${M.ease.inOutQuad(wo)})`;
      c.fillRect(0, 0, W, H);
    }
  };

  // ---------------------------------------------------------------- All in one place / logo
  const LIME = '#c9f23a';
  const icon = (c, x, y, w, h, r, body, mark, draw = 1) => {
    M.fillRR(c, x, y, w, h, r, body);
    c.save();
    M.rr(c, x, y, w, h, r);
    c.clip();
    // the squiggle draws itself in as the icon opens up
    c.save();
    c.translate(x + w / 2, y + h / 2);
    const s = Math.min(w, h) / 100;
    c.scale(s, s);
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.strokeStyle = mark;
    c.lineWidth = 11;
    const path = new Path2D('M-36 -16C-26 -42 6 -40 -4 -16 -14 8 -30 26 -14 30 4 32 18 -4 30 -6 44 -8 30 18 18 26 30 34 42 24 44 16');
    c.setLineDash([260 * draw, 400]);
    c.stroke(path);
    c.restore();
    c.restore();
  };
  const TAG = [
    { s: 'All', t0: 23.15, weight: 400 },
    { s: 'in', t0: 23.55, weight: 400 },
    { s: 'one', t0: 23.85, weight: 400 },
    { s: 'place.', t0: 24.4, weight: 600, color: '#9fc72e' },
  ];
  S.allInOne = (c, t) => {
    // page tone: pale grey, then down to black for the end card
    const v = Math.round(M.key(t, [[25.3, 224], [25.45, 128, 'inQuad'], [25.56, 42, 'linear'], [25.7, 17, 'outQuad'], [25.97, 0, 'outQuad']]));
    const dark = 1 - v / 224;
    c.fillStyle = `rgb(${v},${v},${v})`;
    c.fillRect(0, 0, W, H);
    // icon: a hairline that thickens into the rounded app tile
    const iw = M.key(t, [[23.15, 3], [23.48, 10, 'inQuad'], [23.6, 52, 'inQuad'], [23.87, 154, 'linear'], [24.2, 262, 'outCubic']]);
    const ih = M.key(t, [[23.08, 0], [23.25, 270, 'outCubic'], [23.6, 242, 'inOutQuad'], [24.2, 260, 'outQuad']]);
    const end = M.ease.inOutCubic(M.prog(t, 25.3, 25.62));
    // the end lockup (tile + wordmark) is centred as a group
    const wmw = M.measure(c, 'Higgsfield', 134, 700, -0.02);
    const lockX = 960 - (113 + 22 + wmw) / 2;
    const cx = M.lerp(954, lockX + 56.5, end);
    const cy = M.lerp(368, 528, end);
    const sz = M.lerp(1, 113 / 260, end);
    const w = iw * sz;
    const h = ih * sz;
    const r = Math.min(w, h) * 0.2;
    const flip = M.prog(t, 25.33, 25.45);
    if (h > 1) {
      M.withLayer(
        c,
        (l) => {
          if (flip < 1) icon(l, cx - w / 2, cy - h / 2, w, h, Math.max(1, r), '#151515', '#a8cf2e', M.prog(t, 23.55, 24.2));
          if (flip > 0) {
            l.globalAlpha = flip;
            icon(l, cx - w / 2, cy - h / 2, w, h, r, LIME, '#121212', 1);
          }
        },
        { blur: Math.sin(Math.PI * M.prog(t, 25.32, 25.7)) * 10 }
      );
    }
    // tagline: re-centres as each word lands; later shrinks under the wordmark
    const ty = M.lerp(560, 660, end);
    const ts = M.lerp(66, 48, end);
    const col = dark > 0.5 ? '#ffffff' : '#1d1d1d';
    c.save();
    c.translate(960, ty);
    c.scale(ts / 66, ts / 66);
    c.translate(-960, -ty);
    M.wordLine(
      c,
      TAG.map((w) => Object.assign({}, w, { color: w.color ? (dark > 0.5 ? '#d4f54a' : w.color) : col })),
      t,
      { size: 66, x: 960, y: ty, dur: 0.3, slide: 30, blurFrom: 10, gap: 18, track: -0.02 }
    );
    c.restore();
    // wordmark blurs in to the right of the shrinking icon
    const wm = M.prog(t, 25.36, 25.6);
    if (wm > 0) M.blurWord(c, 'Higgsfield', lockX + 135, 578, wm, { size: 134, weight: 700, color: '#ffffff', blurFrom: 16, track: -0.02 });
  };
})();
