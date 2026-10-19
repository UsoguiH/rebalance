// Scenes, part A: the meadow intro, the zoom onto "Button", and the rapid
// montage of subscription buttons. Times are seconds into the piece.
(function () {
  const S = (M.scenes = M.scenes || {});
  const { W, H } = M;
  const A = M.art;
  const tw = M.tw;

  // the blue "Button" pill: x,y is its top-left; press 0..1 squashes it
  const bluePill = (c, x, y, w, h, label, size, { press = 0, hover = null } = {}) => {
    const r = h * 0.17;
    c.save();
    const cx = x + w / 2;
    const cy = y + h / 2;
    const k = 1 - press * 0.04;
    c.translate(cx, cy + press * h * 0.03);
    c.scale(k, k);
    c.translate(-cx, -cy);
    // darker lip under the face
    M.fillRR(c, x, y + h * 0.045, w, h, r, '#163f86');
    const g = c.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, '#2c5eae');
    g.addColorStop(1, '#2858a6');
    M.fillRR(c, x, y, w, h * 0.985, r, g);
    if (hover && hover.a > 0) {
      // the bright hover glow that follows the cursor across the face
      c.save();
      M.rr(c, x, y, w, h * 0.985, r);
      c.clip();
      c.globalAlpha = hover.a;
      c.fillStyle = M.rgrad(c, hover.x, hover.y, 0, h * 1.2, [
        [0, 'rgba(30,140,255,0.95)'],
        [1, 'rgba(30,140,255,0)'],
      ]);
      c.fillRect(x, y, w, h);
      c.restore();
    }
    M.text(c, label, cx, cy + size * 0.36, { size, weight: 700, color: '#e3e4e8', align: 'center', track: -0.01 });
    c.restore();
  };
  S.bluePill = bluePill;

  // ---------------------------------------------------------------- intro
  // "We've all pressed this Button before" over the meadow, then a whip-zoom
  // onto the button and a big cursor clicking it. All positions were measured
  // off the original frames: each word settles into a fixed spot with an
  // exponential ease (rate 3/s) from ~130px to the right.
  const IN = { size: 67, base: 585, weight: 500, color: '#eef3f3' };
  const INTRO_WORDS = [
    { s: 'We\u2019ve', t0: 0.33, a: 146 },
    { s: 'all', t0: 0.62, a: 136 },
    { s: 'pressed', t0: 0.93, a: 124 },
    { s: 'this', t0: 1.2, a: 116 },
    { s: 'before', t0: 1.93, a: 36 },
  ];
  const PILL = { x: 1093, y: 526, w: 227, h: 81, text: 55, t0: 1.7 };
  // words sit a space apart, packed out from the pill (which the zoom targets),
  // so the line stays even in any weight
  let introLaid = false;
  const layoutIntro = (c) => {
    if (introLaid) return;
    const space = M.measure(c, ' ', IN.size, IN.weight);
    let x = PILL.x - space * 1.1;
    for (let i = 3; i >= 0; i--) {
      x -= M.measure(c, INTRO_WORDS[i].s, IN.size, IN.weight);
      INTRO_WORDS[i].x = x;
      x -= space;
    }
    INTRO_WORDS[4].x = PILL.x + PILL.w + space * 0.7;
    introLaid = true;
  };
  const settle = (t, t0, x, a) => x + a * Math.exp(-3 * (t - t0));

  // zoom camera: where the pill centre lands on screen, and the zoom factor
  const PC = [PILL.x + PILL.w / 2, PILL.y + PILL.h / 2];
  const zoomS = (t) =>
    Math.exp(M.key(t, [[1.66, 0], [1.882, 0.1, 'inQuad'], [1.9, 1.085, 'inQuad'], [2.01, 1.244, 'outQuad'], [2.6, 1.353, 'outCubic']]));
  const zoomX = (t) => M.key(t, [[1.66, PC[0]], [1.882, 1230, 'inQuad'], [1.9, 1342, 'inQuad'], [2.01, 1091, 'inOutQuad'], [2.6, 964, 'outCubic']]);
  const zoomY = (t) => M.key(t, [[1.66, PC[1]], [1.882, PC[1], 'inQuad'], [1.9, 518, 'inQuad'], [2.01, 554, 'inOutQuad'], [2.6, 546, 'outCubic']]);
  // the whip out of the shot, into the montage
  const whip = (t) => M.key(t, [[3.24, 0], [3.345, -260, 'inCubic']]);

  const introLine = (c, t, hover, press) => {
    layoutIntro(c);
    for (const w of INTRO_WORDS) {
      const p = M.clamp((t - w.t0) / 0.28, 0, 1);
      if (p <= 0) continue;
      M.blurWord(c, w.s, settle(t, w.t0, w.x, w.a), IN.base, M.ease.outQuad(p), { size: IN.size, weight: IN.weight, color: IN.color, blurFrom: 12 });
    }
    const pp = M.clamp((t - PILL.t0) / 0.25, 0, 1);
    if (pp > 0) {
      const px = settle(t, PILL.t0, PILL.x, 30);
      M.withLayer(c, (l) => bluePill(l, px, PILL.y, PILL.w, PILL.h, 'Button', PILL.text, { press, hover }), {
        blur: (1 - pp) * 10,
        alpha: Math.min(1, pp * 1.4),
      });
    }
  };

  S.intro = (c, t) => {
    // meadow, slowly pushing in, then enlarged and softened by the zoom
    const z = zoomS(t);
    const bgS = 1 + t * 0.01 + (z - 1) * 0.25;
    c.save();
    c.translate(W / 2, H / 2);
    c.scale(bgS, bgS);
    c.translate(-W / 2, -H / 2);
    const extra = M.clamp((z - 1) * 3, 0, 8);
    if (extra > 0.3) c.filter = `blur(${extra}px)`;
    c.drawImage(A.hillsDOF(), 0, 0);
    c.restore();

    // hover glow position (screen space) and the click
    const [cx, cy] = cursorAt(t);
    const press = M.key(t, [[3.13, 0], [3.21, 1, 'outQuad'], [3.3, 0.6, 'inOutQuad']]);
    const hoverA = M.prog(t, 2.75, 3.0);
    const zoomedNow = t > 1.66;
    if (!zoomedNow) introLine(c, t, null, 0);
    else {
      const speed = Math.abs(Math.log(zoomS(t + 0.016) / zoomS(t - 0.016))) * 30 + Math.abs(whip(t + 0.016) - whip(t - 0.016)) * 0.08;
      const n = M.clamp(Math.round(speed * 3), 1, 10);
      M.motionBlur(c, n, (cc, u) => {
        const tt = t - 0.008 + u * 0.008;
        const s = zoomS(tt);
        cc.save();
        cc.translate(zoomX(tt) + whip(tt), zoomY(tt));
        cc.scale(s, s);
        cc.translate(-PC[0], -PC[1]);
        // hover glow lives in screen space; convert to line space
        const hover = hoverA > 0 ? { x: (cx - zoomX(tt)) / s + PC[0], y: (cy - zoomY(tt)) / s + PC[1], a: hoverA } : null;
        introLine(cc, tt, hover, press);
        cc.restore();
      });
    }

    // the rounded frame line that settles in around the shot
    if (t < 1.9) {
      const ins = tw(t, 0.6, 0.8, -12, 21, 'outCubic');
      const a = M.prog(t, 0.6, 0.66) * tw(t, 1.895, 1.91, 1, 0, 'linear');
      c.save();
      c.globalAlpha = 0.8 * a;
      M.strokeRR(c, ins, ins - 4, W - ins * 2, H - (ins - 4) * 2, 50, '#f4f7f7', 2);
      c.restore();
      // footer, typed out
      const foot = '\u00a9 All Rights Reserved By MosyCreate.';
      const n = Math.floor(M.clamp((t - 0.28) / 0.4, 0, 1) * foot.length);
      M.text(c, foot.slice(0, n), 757, 1048, { size: 19, weight: 500, color: '#eef2f0', alpha: 0.85 * tw(t, 1.75, 1.88, 1, 0, 'linear') });
    }

    // cursor: small and wandering before the zoom, huge and clicking after
    if (t < 1.9) M.cursor(c, cx, cy, 0.78, { alpha: M.prog(t, 0.76, 0.8), rot: -0.12 });
    else M.cursor(c, cx, cy, 3.7, { press: press * 0.6, rot: -0.38 });
    M.caption(c, 'Simple Button', { y: 1010, alpha: M.prog(t, 2.2, 2.4) });
  };

  // cursor fingertip, tracked off the original frame by frame
  const cursorAt = (t) =>
    t < 1.9
      ? M.track(t, [
          [0.75, 270, 1060], [0.817, 299, 995], [0.881, 303, 923], [0.945, 322, 840], [1.009, 354, 767],
          [1.074, 381, 714], [1.139, 395, 668], [1.204, 422, 651], [1.268, 448, 644], [1.332, 477, 644],
          [1.396, 491, 648], [1.461, 522, 664], [1.525, 558, 686], [1.589, 616, 701], [1.656, 675, 713],
          [1.72, 748, 714], [1.784, 831, 704], [1.85, 899, 691], [1.9, 925, 680],
        ])
      : M.track(t, [
          [1.9, 590, 1110], [1.946, 562, 1045], [2.042, 536, 1002], [2.09, 585, 988], [2.139, 682, 938],
          [2.188, 729, 910], [2.236, 775, 885], [2.284, 857, 839], [2.332, 895, 817], [2.381, 961, 777],
          [2.429, 989, 761], [2.477, 1035, 726], [2.525, 1057, 713], [2.573, 1095, 690], [2.621, 1112, 678],
          [2.669, 1128, 670], [2.717, 1153, 653], [2.765, 1165, 645], [2.813, 1183, 632], [2.861, 1190, 627],
          [2.909, 1201, 619], [2.957, 1205, 617], [3.005, 1211, 612], [3.103, 1215, 609], [3.2, 1208, 606],
          [3.345, 1195, 604],
        ]);

  // ---------------------------------------------------------------- montage
  // One card per button, hard cuts between them. Each card: background,
  // the button (same frame on most cards), a glyph, and a caption.
  const BX = 462;
  const BY = 369;
  const BW = 1000;
  const BH = 345;
  const BR = 50;
  const btnLabel = (c, parts, color, glyph, gcolor, size = 120, dx = 0) => {
    // parts: [[text, weight], ...] laid out centred with an optional glyph
    const gs = glyph ? size * 0.92 : 0;
    const gap = glyph ? size * 0.06 : 0;
    let total = gs + gap;
    for (const [s, w] of parts) total += M.measure(c, s, size, w, -0.015);
    let x = W / 2 - total / 2 + dx;
    const base = BY + BH / 2 + size * 0.36;
    if (glyph) {
      A.glyph(c, glyph, x + gs / 2, BY + BH / 2, gs, gcolor || color);
      x += gs + gap;
    }
    for (const [s, w] of parts) x += M.text(c, s, x, base, { size, weight: w, color, track: -0.015 });
  };
  const card = (c, fill, stroke) => {
    M.fillRR(c, BX, BY, BW, BH, BR, fill);
    if (stroke) M.strokeRR(c, BX, BY, BW, BH, BR, stroke, 2);
  };
  const tile = (c, x, y, w, h, fill, stroke) => {
    M.fillRR(c, x, y, w, h, 46, fill);
    if (stroke) M.strokeRR(c, x, y, w, h, 46, stroke, 2);
  };

  const CARDS = [
    {
      at: 3.345,
      cap: 'Apple Pay Button',
      draw(c, t, k) {
        c.fillStyle = '#dedede';
        c.fillRect(0, 0, W, H);
        M.fillRR(c, 305, -200, 1306, 1010, 70, '#bbbbbb');
        c.fillStyle = '#9a9a9a';
        c.fillRect(455, 104, 1006, 3);
        M.text(c, 'Service fee', 455, 66, { size: 70, weight: 500, color: '#3a3a3a' });
        M.text(c, '20.15$', 1461, 66, { size: 70, weight: 500, color: '#3a3a3a', align: 'right' });
        M.text(c, 'Total', 455, 300, { size: 88, weight: 500, color: '#2b2b2b' });
        M.text(c, '200$', 1461, 300, { size: 88, weight: 700, color: '#2b2b2b', align: 'right' });
        const press = M.key(k, [[0.18, 0], [0.24, 1, 'outQuad'], [0.36, 0, 'outQuad']]);
        c.save();
        c.translate(963, 540);
        c.scale(1 - press * 0.03, 1 - press * 0.03);
        c.translate(-963, -540);
        M.fillRR(c, 448, 362, 1030, 355, 46, '#000');
        A.glyph(c, 'apple', 790, 528, 130, '#fff');
        M.text(c, 'Pay', 870, 590, { size: 150, weight: 500, color: '#fff' });
        c.restore();
        const [x, y] = M.track(k, [[0, 1235, 640], [0.25, 1250, 625], [0.5, 1262, 620]]);
        M.cursor(c, x, y, 3.3, { press });
      },
    },
    {
      at: 3.845,
      cap: 'ChatGPT Subscription Button',
      draw(c, t, k) {
        c.fillStyle = '#303030';
        c.fillRect(0, 0, W, H);
        M.fillRR(c, 222, -120, 1472, 1300, 40, M.vgrad(c, 0, H, [[0, '#33334a'], [1, '#2a2c3e']]));
        M.strokeRR(c, 222, -120, 1472, 1300, 40, 'rgba(160,160,220,0.35)', 2);
        M.text(c, '-Upscale Photo up to 4k', 370, 105, { size: 66, weight: 400, color: '#8c8cb0' });
        M.text(c, '-Unlimited  access', 370, 248, { size: 66, weight: 400, color: '#8c8cb0' });
        const g = c.createLinearGradient(372, 369, 1554, 717);
        g.addColorStop(0, '#5b5895');
        g.addColorStop(0.55, '#6e68a8');
        g.addColorStop(1, '#58548c');
        M.fillRR(c, 372, 369, 1182, 348, 174, g);
        M.strokeRR(c, 372, 369, 1182, 348, 174, 'rgba(220,220,255,0.55)', 3);
        M.text(c, 'Buy GPT 5', 963, 600, { size: 150, weight: 500, color: '#dcdcec', align: 'center' });
        A.glyph(c, 'gemini', 395, 865, 48, '#e8e8f0');
        M.text(c, 'Core model', 455, 885, { size: 60, weight: 400, color: '#e8e8f0' });
        M.text(c, 'More messages and uploads', 455, 1045, { size: 60, weight: 400, color: '#e8e8f0' });
        const [x, y] = M.track(k, [[0, 1600, 220], [0.15, 1700, 60], [0.3, 1820, -120]]);
        M.cursor(c, x, y, 3.3, { blur: 6, alpha: 1 - M.prog(k, 0.2, 0.3) });
      },
    },
    {
      at: 4.173,
      cap: 'Grok Subscription Button',
      draw(c, t, k) {
        c.drawImage(A.grokSky(), 0, 0);
        // drifting sparks
        const r = M.rng(3);
        for (let i = 0; i < 46; i++) {
          const x = r() * W;
          const y = (r() * H - k * r.range(60, 260) + H) % H;
          c.globalAlpha = r.range(0.3, 1);
          c.fillStyle = '#fff';
          c.save();
          c.filter = `blur(${r.range(0, 3)}px)`;
          c.beginPath();
          c.ellipse(x, y, r.range(2, 5), r.range(4, 10), r() * 3, 0, Math.PI * 2);
          c.fill();
          c.restore();
        }
        c.globalAlpha = 1;
        card(c, M.vgrad(c, BY, BY + BH, [[0, '#cfcfcf'], [1, '#a7a7a7']]), 'rgba(255,255,255,0.6)');
        btnLabel(c, [['Try Grok', 500]], '#1b1b1b', 'grok', '#1b1b1b', 140);
      },
    },
    {
      at: 4.511,
      cap: 'Claude Subscription Button',
      draw(c, t, k) {
        c.fillStyle = '#171717';
        c.fillRect(0, 0, W, H);
        c.fillStyle = '#414141';
        c.fillRect(0, 0, 193, H);
        M.fillRR(c, 193, -60, 1397, 1200, 30, '#3c3c3c');
        c.fillStyle = '#5a5a5a';
        c.fillRect(1590, 0, 4, H);
        c.fillStyle = '#4a4a4a';
        c.fillRect(1840, 0, 80, H);
        M.text(c, 'Pro', 412, 160, { size: 66, weight: 600, color: '#f0f0f0' });
        M.text(c, 'Research, code, and organize', 412, 245, { size: 54, weight: 400, color: '#bdbdbd' });
        M.fillRR(c, 412, 369, 1158, 345, 50, '#dcd6cc');
        btnLabel(c, [['Buy Claude', 500]], '#d4622b', 'claude', '#d4622b', 132, 30);
        c.fillStyle = '#555';
        c.fillRect(193, 790, 1397, 3);
        M.text(c, 'Everything in Free and:', 412, 880, { size: 58, weight: 500, color: '#e0e0e0' });
        M.text(c, '✓  Claude Code directly in your', 412, 990, { size: 58, weight: 400, color: '#d0d0d0' });
      },
    },
    {
      at: 4.736,
      cap: 'Upgrade This Button',
      draw(c, t, k) {
        c.drawImage(A.desert(), 0, 0);
        tile(c, BX, -120, BW, 390, 'rgba(30,30,44,0.55)', 'rgba(255,255,255,0.18)');
        tile(c, BX, 820, BW, 400, 'rgba(30,20,20,0.55)', 'rgba(255,255,255,0.18)');
        card(c, '#1b2550', 'rgba(255,255,255,0.35)');
        btnLabel(c, [['Upgrade ', 500], ['This', 700]], '#f2f2f2', null, null, 124);
      },
    },
    {
      at: 4.962,
      cap: 'Upgrade That Button',
      draw(c, t, k) {
        c.fillStyle = M.vgrad(c, 0, H, [[0, '#4a4846'], [0.6, '#6f6a62'], [0.75, '#8f7a5a'], [1, '#3a332c']]);
        c.fillRect(0, 0, W, H);
        c.save();
        c.filter = 'blur(30px)';
        c.fillStyle = 'rgba(200,190,170,0.5)';
        c.fillRect(0, 720, W, 90);
        c.restore();
        tile(c, BX, -120, BW, 390, 'rgba(50,48,46,0.85)', 'rgba(255,255,255,0.15)');
        tile(c, BX, 820, BW, 400, 'rgba(50,48,46,0.85)', 'rgba(255,255,255,0.15)');
        tile(c, -560, BY, 900, BH, 'rgba(60,58,56,0.8)');
        tile(c, 1590, BY, 900, BH, 'rgba(60,58,56,0.8)');
        card(c, '#ebe9dc');
        btnLabel(c, [['Upgrade ', 500], ['That', 700]], '#151515', null, null, 124);
      },
    },
    {
      at: 5.172,
      cap: 'Gemini Subscription Button',
      draw(c, t, k) {
        c.drawImage(A.stars('gemini', '#173a6c', '#231650', 40, 8), 0, 0);
        card(c, '#e6eefd');
        btnLabel(c, [['Get Gemini', 500]], '#18213f', 'gemini', '#1d2e5c', 128);
      },
    },
    {
      at: 5.364,
      cap: 'Perplexity Subscription Button',
      draw(c, t, k) {
        c.fillStyle = '#868a8b';
        c.fillRect(0, 0, W, H);
        c.fillStyle = '#eff8f5';
        c.fillRect(0, 335, W, 400);
        card(c, '#141c1d');
        btnLabel(c, [['Try Perplexity', 500]], '#3ab4bd', 'perplexity', '#3ab4bd', 120);
      },
    },
    {
      at: 5.574,
      cap: 'Copilot Subscription Button',
      draw(c, t, k) {
        c.drawImage(A.copilot(), 0, 0);
        A.ribbon(c, k);
        card(c, '#0a78d4');
        // the ribbon passes in front of the button's left edge
        c.save();
        c.beginPath();
        c.rect(0, 0, 640, H);
        c.clip();
        c.globalAlpha = 0.9;
        A.ribbon(c, k);
        c.restore();
        btnLabel(c, [['Buy Copilot', 500]], '#ffffff', 'copilot', null, 124);
      },
    },
    {
      at: 5.768,
      cap: 'Runway Subscription Button',
      draw(c, t, k) {
        c.drawImage(A.tiles('runway', '#23272a', '#3e4926'), 0, 0);
        card(c, '#a3cd22');
        btnLabel(c, [['Try Runway', 500]], '#ffffff', 'runway', '#ffffff', 124);
      },
    },
    {
      at: 5.961,
      cap: 'Kling 3.0 Subscription Button',
      draw(c, t, k) {
        c.drawImage(A.kling(), 0, 0);
        card(c, 'rgba(20,30,40,0.35)', '#36d3c4');
        // a teal glow sweeping across the button
        c.save();
        M.rr(c, BX, BY, BW, BH, BR);
        c.clip();
        const gx = M.lerp(700, 1180, M.ease.outCubic(M.clamp(k / 0.2, 0, 1)));
        c.fillStyle = M.rgrad(c, gx, 540, 0, 330, [[0, '#22d6b0'], [0.85, '#1ccfc6'], [1, 'rgba(28,207,198,0)']]);
        c.fillRect(BX, BY, BW, BH);
        c.restore();
        btnLabel(c, [['Buy Kling 3.0', 500]], '#0e1c22', 'kling', '#0e1c22', 120);
      },
    },
    {
      at: 6.169,
      cap: 'Luma Ai Subscription Button',
      draw(c, t, k) {
        c.drawImage(A.luma(), 0, 0);
        const g = 1 + M.ease.outCubic(M.clamp(k / 0.19, 0, 1)) * 0.03;
        c.save();
        c.translate(W / 2, H / 2);
        c.scale(g, g);
        c.translate(-W / 2, -H / 2);
        M.strokeRR(c, 340, 247, 1240, 590, 80, '#3d3b58', 10);
        M.strokeRR(c, 395, 300, 1130, 485, 64, '#3d3b58', 8);
        c.restore();
        card(c, '#423b57');
        btnLabel(c, [['Luma AI', 500]], '#ffffff', 'luma', '#e8e6f0', 124);
      },
    },
    {
      at: 6.361,
      cap: 'Sora Subscription Button',
      draw(c, t, k) {
        c.drawImage(A.stars('sora', '#012b68', '#085dcc', 26, 15), 0, 0);
        card(c, '#e0e3e8');
        const pop = M.ease.outBack(M.clamp(k / 0.12, 0, 1));
        c.save();
        btnLabel(c, [['Get Sora', 500]], '#1e2f63', null, null, 128, 50);
        A.glyph(c, 'sora', 640, 540, 120 * pop, '#1e2f63');
        c.restore();
      },
    },
    {
      at: 6.57,
      cap: 'GPT 5.5 Subscription Button',
      draw(c, t, k) {
        c.fillStyle = '#dedede';
        c.fillRect(0, 0, W, H);
        const s = 1 - M.ease.outCubic(M.clamp(k / 0.13, 0, 1)) * 0.06;
        c.save();
        c.translate(W / 2, H / 2);
        c.scale(s, s);
        c.translate(-W / 2, -H / 2);
        card(c, '#020102');
        btnLabel(c, [['GPT 5.5', 500]], '#ffffff', 'openai', '#ffffff', 128);
        c.restore();
      },
    },
    {
      at: 6.697,
      cap: 'Claude Subscription Button',
      draw(c) {
        c.fillStyle = '#fcefe8';
        c.fillRect(0, 0, W, H);
        card(c, '#d97758');
        btnLabel(c, [['Buy Claude', 500]], '#ffffff', 'claude', '#ffffff', 128);
      },
    },
    {
      at: 6.889,
      cap: 'Upgrade This Button',
      draw(c) {
        c.drawImage(A.tiles('taupe', '#4c4132', '#6b5c4b'), 0, 0);
        card(c, '#d7c4a7');
        btnLabel(c, [['Upgrade ', 500], ['This', 700]], '#4b4034', null, null, 124);
      },
    },
    {
      at: 7.082,
      cap: 'Upgrade That Button',
      draw(c) {
        c.drawImage(A.tiles('red', '#7e0303', '#952e2a'), 0, 0);
        card(c, '#eee9db');
        btnLabel(c, [['Upgrade ', 500], ['That', 700]], '#161616', null, null, 124);
      },
    },
    {
      at: 7.242,
      cap: 'Nano Banana Subscription Button',
      draw(c, t, k) {
        c.fillStyle = '#f6c51e';
        c.fillRect(0, 0, W, H);
        A.bananaGuy(c, 210, 830, 1.15, k * 30);
        A.bananaGuy(c, 1760, 800, 1.0, k * 30 + 2);
        M.fillRR(c, 400, 350, 1120, 387, 60, '#2a3c8e');
        M.text(c, 'Banana', 1000, 600, { size: 150, weight: 700, color: '#ffffff', align: 'center' });
        A.glyph(c, 'banana', 690, 550, 120, '#f5d23a');
      },
    },
    {
      at: 7.453,
      cap: 'Claude Subscription Button',
      draw(c) {
        c.fillStyle = '#755547';
        c.fillRect(0, 0, W, H);
        c.fillStyle = '#fcefe8';
        c.fillRect(200, 0, 130, H);
        c.fillRect(1590, 0, 150, H);
        c.fillStyle = '#9a7b71';
        c.fillRect(330, 0, 1260, H);
        M.text(c, 'Pro', 412, 160, { size: 66, weight: 600, color: '#ffffff' });
        M.text(c, 'Research, code, and organize', 412, 245, { size: 54, weight: 400, color: '#efe2dc' });
        M.fillRR(c, 462, 369, 1000, 345, 50, '#d97758');
        M.strokeRR(c, 462, 369, 1000, 345, 50, '#a5523a', 3);
        btnLabel(c, [['Buy Claude', 500]], '#ffffff', 'claude', '#ffffff', 128);
        c.fillStyle = 'rgba(255,255,255,0.35)';
        c.fillRect(330, 790, 1260, 3);
        M.text(c, 'Everything in Free and:', 412, 880, { size: 58, weight: 500, color: '#f3ece8' });
        M.text(c, '✓  Claude Code directly in your', 412, 990, { size: 58, weight: 400, color: '#f3ece8' });
      },
    },
  ];

  S.montage = (c, t) => {
    let i = CARDS.length - 1;
    while (i > 0 && t < CARDS[i].at) i--;
    const cd = CARDS[i];
    const k = t - cd.at;
    cd.draw(c, t, k);
    const dark = !/Apple|GPT 5.5|Upgrade That Button|Claude/.test(cd.cap) || i === 3;
    M.caption(c, cd.cap, { y: 1006, color: dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)' });
  };
})();
