// Scenes, part B: "But..." over the meadow collapsing into a text caret, the
// typed "But,what if one Button", the "Life saver" button between the
// reaching hands (and its quick restyles), and "No more endless ai subscriptions".
(function () {
  const S = M.scenes;
  const { W, H } = M;
  const A = M.art;
  const tw = M.tw;

  // spring rise with one upward overshoot, as the "But" letters do
  const rise = (t, t0) => {
    const u = t - t0;
    if (u <= 0) return { y: 520, a: 0, blur: 0 };
    // fast rise from 520px below, overshoot ~105px up, settle by ~0.45s
    const y = M.key(u, [[0, 520], [0.12, -60, 'outQuad'], [0.17, -105, 'outQuad'], [0.45, 0, 'inOutCubic']]);
    const v = Math.abs(M.key(u + 0.01, [[0, 520], [0.12, -60, 'outQuad'], [0.17, -105, 'outQuad'], [0.45, 0, 'inOutCubic']]) - y);
    return { y, a: M.clamp(u / 0.06, 0, 1), blur: Math.min(30, v * 1.6) };
  };

  // ---------------------------------------------------------------- But...
  const BUT = { size: 486, base: 718, x: 443, letters: [['B', 7.555], ['u', 7.585], ['t', 7.62]], dots: [7.81, 7.87, 7.92] };
  // letters sit at their measured advances, so the word stays tight in any weight
  let butLayout = null;
  const layoutBut = (c) => {
    if (butLayout) return butLayout;
    let x = BUT.x;
    const letters = BUT.letters.map(([ch, t0]) => {
      const at = [ch, M.inkX(c, ch, x, BUT.size, 500), t0];
      x += M.measure(c, ch, BUT.size, 500, -0.01);
      return at;
    });
    const dots = BUT.dots.map((t0, i) => [x + 30 + i * 128, t0]);
    return (butLayout = { letters, dots });
  };
  // each letter also travels in from the left: B and u drift, t snaps past and back
  const BUT_DX = {
    B: [[7.55, -110], [8.05, 0, 'outCubic']],
    u: [[7.58, -150], [8.0, 0, 'outCubic']],
    t: [[7.62, -300], [7.73, 50, 'outQuad'], [7.8, 0, 'inOutQuad']],
  };
  const drawBut = (c, t) => {
    // meadow, a touch closer than the intro, cooling to slate before the collapse
    const g = M.ease.inOutQuad(M.prog(t, 7.88, 8.06));
    c.save();
    c.translate(W / 2, H / 2);
    c.scale(1.12, 1.12);
    c.translate(-W / 2, -H / 2 + 40);
    if (g > 0) c.filter = `saturate(${1 - 0.75 * g}) brightness(${1 - 0.2 * g}) blur(${g * 3}px)`;
    c.drawImage(A.hillsDOF(), 0, 0);
    c.restore();
    const L = layoutBut(c);
    for (const [ch, ix, t0] of L.letters) {
      const r = rise(t, t0);
      if (r.a <= 0) continue;
      const x = ix + M.key(t, BUT_DX[ch]);
      M.withLayer(
        c,
        (l) => {
          // vertical smear while moving fast
          const n = r.blur > 9 ? 7 : 1;
          for (let i = 0; i < n; i++) M.text(l, ch, x, BUT.base + r.y + (i - (n - 1) / 2) * r.blur * 0.45, { size: BUT.size, weight: 500, color: '#ffffff', alpha: n === 1 ? 1 : 0.26 });
        },
        { alpha: r.a, blur: r.blur * 0.25 }
      );
    }
    for (const [x, t0] of L.dots) {
      const r = rise(t, t0);
      if (r.a <= 0) continue;
      // the dots keep sinking to the baseline a little longer
      const sink = tw(t, t0 + 0.2, t0 + 0.45, -25, 0, 'inOutQuad');
      c.save();
      c.globalAlpha = r.a;
      c.fillStyle = '#fff';
      c.beginPath();
      c.arc(x + 26, BUT.base - 26 + r.y * 0.5 + sink, 26, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }
  };

  // ---------------------------------------------------------------- typing
  const TYPE = 'But,what if one Button';
  const KEYS = [8.32, 8.36, 8.4, 8.46, 8.5, 8.58, 8.65, 8.69, 8.74, 8.82, 8.88, 8.94, 9.0, 9.05, 9.09, 9.13, 9.18, 9.25, 9.31, 9.36, 9.47, 9.58];
  const TSIZE = 500;
  const TBASE = 720;
  // on-screen x of the caret's left edge, tracked off the original
  const CARET = [
    [8.774, 1191], [8.822, 1209], [8.871, 1239], [8.919, 1256], [8.968, 1276], [9.016, 1319], [9.064, 1344],
    [9.112, 1395], [9.16, 1420], [9.209, 1463], [9.257, 1482], [9.306, 1510], [9.355, 1520], [9.403, 1531],
    [9.453, 1536], [9.55, 1535], [9.603, 1525], [9.653, 1518], [9.703, 1495], [9.755, 1478], [9.805, 1432], [9.855, 1400], [9.904, 1380],
  ];
  // the shrinking "But..." card on its way to becoming the caret: [t, x0, x1]
  const CARD = [
    [8.08, 0, 1920], [8.15, 40, 1880], [8.24, 110, 1800], [8.29, 190, 1730], [8.339, 287, 1643], [8.387, 417, 1520],
    [8.435, 561, 1375], [8.483, 759, 1193], [8.531, 840, 1169], [8.579, 967, 1161], [8.627, 1016, 1168],
    [8.677, 1100, 1194], [8.724, 1133, 1211], [8.774, 1191, 1243],
  ];
  const cardAt = (t) => {
    let i = 0;
    while (i < CARD.length - 2 && t > CARD[i + 1][0]) i++;
    const [t0, a0, b0] = CARD[i];
    const [t1, a1, b1] = CARD[i + 1];
    const u = M.clamp((t - t0) / (t1 - t0), 0, 1);
    return [M.lerp(a0, a1, u), M.lerp(b0, b1, u)];
  };
  const widths = {};
  const typedWidth = (c, n) => {
    const key = n;
    if (widths[key] === undefined) {
      const head = TYPE.slice(0, Math.min(n, 16));
      const tail = TYPE.slice(16, Math.max(16, n));
      widths[key] = M.measure(c, head, TSIZE, 500, -0.02) + (tail ? M.measure(c, tail, TSIZE, 800, -0.02) : 0);
    }
    return widths[key];
  };
  // caret position in text space: eases to the end of the text after each key
  const caretWorld = (c, t) => {
    let n = 0;
    while (n < KEYS.length && t >= KEYS[n]) n++;
    if (n === 0) return 0;
    const prev = typedWidth(c, n - 1);
    const cur = typedWidth(c, n);
    return M.lerp(prev, cur, M.ease.outCubic(M.clamp((t - KEYS[n - 1]) / 0.025, 0, 1))) + 47;
  };
  const drawTypedText = (c, t, off) => {
    for (let i = 0; i < KEYS.length; i++) {
      const p = M.prog(t, KEYS[i] + 0.025, KEYS[i] + 0.12);
      if (p <= 0) break;
      const ch = TYPE[i];
      if (ch === ' ') continue;
      const x = off + typedWidth(c, i);
      const o = { size: TSIZE, weight: i < 16 ? 500 : 800, color: '#0b0b0b', track: -0.02, blurFrom: 20 };
      if (p >= 1) M.text(c, ch, x, TBASE, o);
      else M.blurWord(c, ch, x, TBASE, M.ease.outQuad(p), o);
    }
  };
  const pastel = () =>
    M.pic('pastel', W, H, (c) => {
      const r = M.rng(31);
      c.fillStyle = '#f9e9cf';
      c.fillRect(0, 0, W, H);
      c.filter = 'blur(90px)';
      for (let i = 0; i < 22; i++) {
        c.globalAlpha = r.range(0.35, 0.8);
        c.fillStyle = r() < 0.7 ? '#def59a' : '#fde4d2';
        c.beginPath();
        c.ellipse(r() * W, r.range(200, 950), r.range(150, 380), r.range(120, 260), 0, 0, Math.PI * 2);
        c.fill();
      }
      c.filter = 'none';
      c.globalAlpha = 1;
    });

  S.but = (c, t) => {
    if (t < 8.08) {
      drawBut(c, t);
      return;
    }
    // pastel page with the typed line; the "But..." shot shrinks into the caret
    c.drawImage(pastel(), 0, 0);
    const screenCaret = t < 8.774 ? cardAt(t)[0] : M.key(t, CARET.map(([a, b]) => [a, b, 'linear']));
    const off = screenCaret - caretWorld(c, t);
    // horizontal smear proportional to how fast the line is sliding
    const v = Math.abs(screenCaret - caretWorld(c, t) - ((t < 8.774 ? cardAt(t - 0.02)[0] : M.key(t - 0.02, CARET.map(([a, b]) => [a, b, 'linear']))) - caretWorld(c, t - 0.02)));
    const spread = v * 0.6;
    const n = M.clamp(Math.round(spread / 3), 1, 16);
    M.withLayer(
      c,
      (l) => {
        for (let i = 0; i < n; i++) {
          l.globalAlpha = 1 / (i + 1);
          drawTypedText(l, t, off - (i / Math.max(1, n - 1) - 0.5) * spread);
        }
      },
      { blur: Math.min(3, spread / 25) }
    );
    const dim = M.key(t, [[8.08, 0.92], [8.25, 0.8], [8.34, 0.28, 'inQuad'], [8.46, 0, 'outQuad']]);
    if (dim > 0) {
      c.fillStyle = `rgba(14,14,10,${dim})`;
      c.fillRect(0, 0, W, H);
    }
    if (t < 8.774) {
      // the card: the meadow shot, desaturated and darkened as it collapses
      const [x0, x1] = cardAt(t);
      const k = M.prog(t, 7.95, 8.4);
      const top = M.lerp(0, 231, M.prog(t, 8.3, 8.72));
      const bot = M.lerp(H, 852, M.prog(t, 8.3, 8.72));
      M.withLayer(c, (l) => {
        l.save();
        l.beginPath();
        l.rect(x0, top, x1 - x0, bot - top);
        l.clip();
        const s = M.lerp(1, 0.86, k);
        l.translate(W / 2, H / 2);
        l.scale(s, s);
        l.translate(-W / 2, -H / 2);
        drawBut(l, t);
        l.restore();
        // the shot keeps darkening as it narrows into the caret
        l.globalCompositeOperation = 'source-atop';
        l.fillStyle = `rgba(30,31,33,${0.15 * k + 0.8 * M.prog(t, 8.36, 8.58)})`;
        l.fillRect(0, 0, W, H);
      });
    } else {
      c.fillStyle = '#0b0b0b';
      c.fillRect(screenCaret, 231, 52, 621);
    }
  };

  // ---------------------------------------------------------------- Life saver
  // camera: button centre x and zoom, measured off the original button box
  const lsX = (t) => (t < 11.0 ? 970 + 245 * Math.exp(-3 * (t - 9.904)) : M.key(t, [[11.0, 973], [11.39, 962, 'inOutQuad'], [11.77, 959, 'linear']]));
  const lsS = (t) =>
    M.key(t, [[11.0, 1], [11.19, 0.976, 'inQuad'], [11.32, 0.947, 'inQuad'], [11.39, 0.916, 'linear'], [11.58, 0.748, 'linear'], [11.77, 0.567, 'linear'], [11.97, 0.522, 'outQuad'], [12.16, 0.5, 'outQuad'], [12.6, 0.48, 'outQuad']]);
  // restyles: [start, plate, hand style, button fill, text colour, outline]
  const STYLES = [
    [9.904, 'sepia', 'painting', '#2a5bab', '#e6e6ea'],
    [11.404, 'glass', 'glass', '#7a5638', '#ece4d8'],
    [11.468, 'sepiaB', 'realistic', 'rgba(140,105,60,0.85)', '#efe9e0'],
    [11.581, 'comic', 'comic', '#1d8bb4', '#f4f4f4', '#1d2a33'],
    [11.613, 'sketch', 'sketch', '#3f3f3f', '#f2f2f2'],
    [11.677, 'gold', 'gold', '#8a5a36', '#f1e6da'],
    [11.709, 'lego', 'lego', '#5d6d8c', '#f0f0f4'],
    [11.773, 'gold2', 'gold', '#2a5bab', '#e9e9ee'],
  ];
  const plate = (name) =>
    ({
      sepia: A.clouds.sepia,
      sepiaB: A.clouds.sepia,
      glass: A.clouds.glass,
      comic: A.clouds.comic,
      sketch: A.clouds.sketch,
      gold: A.clouds.gold,
      gold2: A.clouds.gold,
      lego: A.clouds.lego,
    })[name]();

  S.lifeSaver = (c, t) => {
    let si = STYLES.length - 1;
    while (si > 0 && t < STYLES[si][0]) si--;
    const [, pl, hand, fill, ink, outline] = STYLES[si];
    const cx = lsX(t);
    const s = lsS(t);
    const cy = 542;
    // plate, scaled with the camera a little less than the subject
    const ps = 1.12 + 0.12 * s;
    c.save();
    c.translate(W / 2 + (cx - 960) * 0.2, H / 2);
    c.scale(ps, ps);
    c.translate(-W / 2, -H / 2);
    c.drawImage(plate(pl), 0, 0);
    // after 11.77 the golden clouds grade to cool grey
    if (t > 11.77) {
      c.globalAlpha = M.prog(t, 11.78, 11.95);
      c.drawImage(A.clouds.grey(), 0, 0);
      c.globalAlpha = 1;
    }
    c.restore();

    c.save();
    c.translate(cx, cy);
    c.scale(s, s);
    // the hands drift toward each other
    const drift = (t - 9.9) * 14;
    const handStyle = t > 11.85 ? 'realistic' : hand;
    const hs = 1.75 * Math.pow(s, -0.45);
    A.hand(c, -600 + drift, 10, hs, false, handStyle, 0.05, 'adam');
    A.hand(c, 640 - drift + tw(t, 10.2, 11.2, 420, 0, 'outCubic'), -70, hs, true, handStyle, 0.1, 'god');
    // the button
    const bw = 1008;
    const bh = 321;
    const word = t < 11.47 ? 'Life saver' : 'Higgsfield';
    const swap = M.prog(t, 11.45, 11.53);
    c.save();
    if (outline) {
      M.fillRR(c, -bw / 2 - 8, -bh / 2 - 8, bw + 16, bh + 16, 62, outline);
    }
    M.fillRR(c, -bw / 2, -bh / 2, bw, bh, 56, fill);
    const g = c.createLinearGradient(0, -bh / 2, 0, bh / 2);
    g.addColorStop(0, 'rgba(255,255,255,0.08)');
    g.addColorStop(1, 'rgba(0,0,0,0.08)');
    M.fillRR(c, -bw / 2, -bh / 2, bw, bh, 56, g);
    const size = 200;
    if (swap > 0 && swap < 1) {
      M.blurWord(c, 'Life saver', 0, size * 0.36, 1 - swap, { size, weight: 700, color: ink, align: 'center', blurFrom: 10 });
      M.blurWord(c, 'Higgsfield', 0, size * 0.36, swap, { size, weight: 700, color: ink, align: 'center', blurFrom: 10 });
    } else M.text(c, word, 0, size * 0.36, { size, weight: 700, color: ink, align: 'center', track: -0.01 });
    c.restore();
    c.restore();

    // fade to the pale grey page of the next line
    const f = M.prog(t, 12.45, 12.82);
    if (f > 0) {
      c.fillStyle = `rgba(224,224,224,${M.ease.inOutQuad(f)})`;
      c.fillRect(0, 0, W, H);
    }
  };

  // ---------------------------------------------------------------- No more endless
  const NM = [
    { s: 'No', t0: 12.76, a: 110 },
    { s: 'more', t0: 12.81, a: 120 },
    { s: 'endless', t0: 12.86, a: 110, weight: 700, color: '#2452b8' },
    { s: 'ai', t0: 12.99, a: 100 },
    { s: 'subscriptions', t0: 13.13, a: 100 },
  ];
  // the line is centred where the original's was (around x 950) at a space apart
  let nmEnd = null;
  const layoutNM = (c) => {
    if (nmEnd !== null) return;
    const space = M.measure(c, ' ', 102, 400) * 1.15;
    const ws = NM.map((w) => M.measure(c, w.s, 102, w.weight || 400, -0.02));
    let x = 950 - (ws.reduce((a, b) => a + b, 0) + space * (NM.length - 1)) / 2;
    NM.forEach((w, i) => {
      w.x = x;
      x += ws[i] + space;
    });
    nmEnd = x - space;
  };
  const BLUE = '#1f4fc6';

  // iMessage-style tapback: a blob with a heart, which catches fire
  const bubble = (c, t) => {
    if (t < 13.43) return;
    const r = M.key(t, [[13.43, 6], [13.5, 22, 'outQuad'], [13.59, 100, 'outQuad'], [13.66, 126, 'outQuad'], [13.75, 98, 'inOutQuad'], [13.83, 90, 'outQuad'], [13.98, 110, 'outQuad'], [15.1, 116, 'linear']]);
    const grow = M.prog(t, 13.5, 13.62);
    // anchor: the tail dot sits at the top right of "subscriptions"
    const tx = nmEnd - 54;
    const ty = 497;
    const cx = M.lerp(tx + 10, tx + 113, grow);
    const cy = M.lerp(ty - 10, 378, grow);
    c.save();
    c.fillStyle = BLUE;
    c.beginPath();
    c.arc(tx, ty, Math.min(10, 4 + (t - 13.43) * 80), 0, Math.PI * 2);
    c.fill();
    if (grow > 0) {
      c.beginPath();
      c.arc(cx, cy, r, 0, Math.PI * 2);
      c.arc(cx - r * 0.5, cy + r * 0.5, r * 0.58, 0, Math.PI * 2);
      c.fill();
      // heart outline, then the fire
      const hs = r * 0.62;
      const fire = M.prog(t, 13.7, 13.85);
      c.save();
      c.translate(cx, cy + hs * 0.05);
      const heart = new Path2D('M0 0.95C-0.1 0.86 -1 0.25 -1 -0.35 -1 -0.75 -0.68 -1 -0.36 -1 -0.18 -1 -0.06 -0.9 0 -0.8 0.06 -0.9 0.18 -1 0.36 -1 0.68 -1 1 -0.75 1 -0.35 1 0.25 0.1 0.86 0 0.95Z');
      c.scale(hs * 0.8, hs * 0.8);
      if (fire > 0) {
        // flames licking up behind and through the heart
        const fl = new Path2D('M0 1C-0.75 1 -1.05 0.35 -0.8 -0.2 -0.65 -0.5 -0.5 -0.6 -0.45 -1 -0.15 -0.75 -0.05 -0.55 0 -0.3 0.1 -0.8 0.35 -1.2 0.4 -1.35 0.6 -0.9 1 -0.45 0.9 0.2 0.8 0.75 0.45 1 0 1Z');
        c.globalAlpha = fire;
        const g = c.createLinearGradient(0, 1, 0, -1.3);
        g.addColorStop(0, '#ffd23a');
        g.addColorStop(0.5, '#ff8a1c');
        g.addColorStop(1, '#ff4a1c');
        c.fillStyle = g;
        c.fill(fl);
        c.globalAlpha = 1;
      }
      c.lineWidth = 0.16;
      c.strokeStyle = '#fff';
      c.lineJoin = 'round';
      c.stroke(heart);
      c.restore();
    }
    c.restore();
  };

  S.noMore = (c, t) => {
    // the Life saver plate finishes fading underneath the first words
    if (t < 12.86) {
      S.lifeSaver(c, t);
    } else {
      c.fillStyle = '#e0e0e0';
      c.fillRect(0, 0, W, H);
    }
    // the whole line slowly pushes in after it lands
    const z = 1 + Math.max(0, t - 13.4) * 0.066;
    c.save();
    c.translate(1224, 540);
    c.scale(z, z);
    c.translate(-1224, -540);
    layoutNM(c);
    for (const w of NM) {
      const p = M.clamp((t - w.t0) / 0.17, 0, 1);
      if (p <= 0) continue;
      const x = w.x + w.a * Math.exp(-5 * (t - w.t0));
      M.blurWord(c, w.s, x, 576, M.ease.outQuad(p), { size: 102, weight: w.weight || 400, color: w.color || '#111111', blurFrom: 12, track: -0.02 });
    }
    c.restore();
    bubble(c, t);
    // the cursor swoops in from the left and drifts toward the words
    if (t > 14.08) {
      const tr = [
        [14.08, -20, 700], [14.137, 160, 810], [14.2, 299, 890], [14.265, 407, 917], [14.314, 441, 923], [14.362, 499, 928],
        [14.411, 523, 930], [14.459, 545, 928], [14.507, 581, 923], [14.555, 590, 900], [14.603, 603, 877], [14.651, 611, 874],
        [14.699, 643, 875], [14.747, 656, 869], [14.795, 681, 852], [14.844, 695, 844], [14.893, 709, 834], [14.941, 741, 812],
        [14.989, 757, 799], [15.038, 791, 751], [15.087, 811, 719], [15.135, 830, 690],
      ];
      const [x, y] = M.track(t, tr);
      const [x0, y0] = M.track(t - 0.03, tr);
      M.cursorSmear(c, x0, y0, x, y, 1.0);
    }
  };
})();
