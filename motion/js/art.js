// Art: procedural stand-ins for the photographic plates in the original ad
// (hills, desert, clouds, the Creation-of-Adam hands, collage photos) and the
// small brand glyphs drawn inside the buttons. Plates are painted once and cached.
(function () {
  const A = (M.art = {});
  const { W, H } = M;

  // scattered soft blobs, the workhorse for clouds, foliage and blur plates
  const blobs = (c, r, n, x0, y0, x1, y1, rad0, rad1, colors, alpha = 1) => {
    for (let i = 0; i < n; i++) {
      const x = r.range(x0, x1);
      const y = r.range(y0, y1);
      const rad = r.range(rad0, rad1);
      const col = colors[Math.floor(r() * colors.length)];
      c.globalAlpha = alpha * r.range(0.4, 1);
      c.fillStyle = col;
      c.beginPath();
      c.ellipse(x, y, rad, rad * r.range(0.5, 1), r() * Math.PI, 0, Math.PI * 2);
      c.fill();
    }
    c.globalAlpha = 1;
  };

  // ---------- intro: tilt-shift meadow under a teal sky ----------
  A.hills = () =>
    M.pic('hills', W, H, (c) => {
      const r = M.rng(7);
      c.fillStyle = M.vgrad(c, 0, 700, [
        [0, '#07465f'],
        [0.3, '#1b6981'],
        [0.62, '#4f8e93'],
        [0.86, '#7aa69c'],
        [1, '#86a58a'],
      ]);
      c.fillRect(0, 0, W, H);
      // faint high streaks in the sky
      c.save();
      c.globalAlpha = 0.07;
      c.filter = 'blur(30px)';
      for (let i = 0; i < 6; i++) {
        c.fillStyle = '#bfe3e6';
        c.fillRect(-100, 120 + i * 70, W + 200, 18);
      }
      c.restore();
      const hill = (y, amp, f, ph, fill, blur) => {
        c.save();
        if (blur) c.filter = `blur(${blur}px)`;
        c.beginPath();
        c.moveTo(-60, H + 60);
        for (let x = -60; x <= W + 60; x += 20) {
          c.lineTo(x, y + Math.sin(x * f + ph) * amp + Math.sin(x * f * 2.3 + ph * 1.7) * amp * 0.4);
        }
        c.lineTo(W + 60, H + 60);
        c.closePath();
        c.fillStyle = fill;
        c.fill();
        c.restore();
      };
      hill(640, 26, 0.004, 1.2, M.vgrad(c, 600, 760, [[0, '#4d6a3a'], [1, '#3c5a2a']]), 18);
      hill(690, 30, 0.0032, 2.4, M.vgrad(c, 650, 820, [[0, '#5f7e30'], [1, '#3f5b24']]), 12);
      hill(760, 44, 0.0026, 0.3, M.vgrad(c, 720, 1000, [[0, '#7f9a2e'], [0.5, '#5f7a26'], [1, '#6b6a22']]), 6);
      hill(860, 50, 0.0021, 4.1, M.vgrad(c, 800, 1080, [[0, '#8fa432'], [0.6, '#6c7f26'], [1, '#6f6824']]), 3);
      // sunlit crests and darker troughs
      c.save();
      c.filter = 'blur(10px)';
      blobs(c, r, 60, 0, 720, W, 1080, 60, 160, ['#a9b83c', '#c4c046', '#54642a', '#3e5126'], 0.35);
      c.restore();
      // grass blades, longer toward the camera
      for (let i = 0; i < 9000; i++) {
        const y = 720 + Math.pow(r(), 0.8) * 370;
        const x = r() * W;
        const near = (y - 720) / 360;
        c.strokeStyle = r() < 0.5 ? '#a7c23e' : '#4b6620';
        c.globalAlpha = 0.12 + near * 0.35;
        c.lineWidth = 1 + near * 1.5;
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(x + r.range(-3, 3), y - 4 - near * 16);
        c.stroke();
      }
      // flower drifts on the near slopes
      for (let k = 0; k < 46; k++) {
        const cx = r() < 0.5 ? r.range(-40, 700) : r.range(1100, 1960);
        const cy = r.range(800, 1080);
        const col = r() < 0.6 ? '#ef8f7e' : r() < 0.5 ? '#f0b04e' : '#e8d84e';
        for (let i = 0; i < 40; i++) {
          c.globalAlpha = r.range(0.5, 0.95);
          c.fillStyle = col;
          c.beginPath();
          c.arc(cx + r.range(-70, 70), cy + r.range(-18, 18), r.range(2, 6), 0, Math.PI * 2);
          c.fill();
        }
      }
      // flowers: pink, orange and yellow specks, denser and sharper toward the camera
      for (let i = 0; i < 2600; i++) {
        const y = 700 + Math.pow(r(), 0.7) * 400;
        const x = r() * W;
        const near = (y - 700) / 380;
        const s = 1 + near * 4 * r();
        const pick = r();
        c.fillStyle = pick < 0.45 ? '#e88f7a' : pick < 0.7 ? '#eaa64e' : pick < 0.9 ? '#e3d24e' : '#cfd9e6';
        c.globalAlpha = 0.25 + near * 0.6;
        c.beginPath();
        c.ellipse(x, y, s, s * 0.7, 0, 0, Math.PI * 2);
        c.fill();
      }
      c.globalAlpha = 1;
      // a soft blue-grey patch of wildflowers on the left hill
      c.save();
      c.filter = 'blur(14px)';
      c.globalAlpha = 0.45;
      c.fillStyle = '#8fa3a6';
      c.beginPath();
      c.ellipse(420, 830, 260, 50, -0.08, 0, Math.PI * 2);
      c.fill();
      c.restore();
    });

  // the meadow with depth-of-field: far half blurred, near half softly focused
  A.hillsDOF = () =>
    M.pic('hillsDOF', W, H, (c) => {
      const src = A.hills();
      c.filter = 'blur(1.5px) saturate(1.3) contrast(1.08)';
      c.drawImage(src, 0, 0);
      c.filter = 'blur(14px) saturate(1.3) contrast(1.08)';
      c.save();
      c.beginPath();
      c.rect(0, 0, W, 740);
      c.clip();
      c.drawImage(src, 0, 0);
      c.restore();
      c.filter = 'none';
    });

  // ---------- montage plates ----------
  A.desert = () =>
    M.pic('desert', W, H, (c) => {
      c.fillStyle = M.vgrad(c, 0, 700, [[0, '#2b3350'], [0.6, '#3d4664'], [1, '#6b6170']]);
      c.fillRect(0, 0, W, H);
      c.fillStyle = '#2c3048';
      c.beginPath();
      c.moveTo(0, 690);
      c.lineTo(160, 640);
      c.lineTo(260, 680);
      c.lineTo(420, 620);
      c.lineTo(560, 700);
      c.lineTo(1400, 690);
      c.lineTo(1600, 630);
      c.lineTo(1920, 680);
      c.lineTo(1920, 1080);
      c.lineTo(0, 1080);
      c.fill();
      c.fillStyle = M.hgrad(c, 0, 900, [[0, '#a4581f'], [0.5, '#c9772b'], [1, '#7a3d18']]);
      c.beginPath();
      c.moveTo(0, 1080);
      c.lineTo(0, 860);
      c.quadraticCurveTo(300, 700, 620, 760);
      c.quadraticCurveTo(900, 820, 1200, 1080);
      c.fill();
      c.fillStyle = '#3a1c10';
      c.beginPath();
      c.moveTo(380, 1080);
      c.quadraticCurveTo(700, 820, 1300, 900);
      c.quadraticCurveTo(1650, 960, 1920, 860);
      c.lineTo(1920, 1080);
      c.fill();
      c.fillStyle = 'rgba(255,170,90,0.18)';
      c.beginPath();
      c.moveTo(0, 860);
      c.quadraticCurveTo(300, 700, 620, 760);
      c.lineTo(560, 790);
      c.quadraticCurveTo(300, 760, 0, 900);
      c.fill();
    });

  A.stars = (name, top, bottom, n, seed) =>
    M.pic(name, W, H, (c) => {
      const r = M.rng(seed);
      c.fillStyle = M.vgrad(c, 0, H, [[0, top], [1, bottom]]);
      c.fillRect(0, 0, W, H);
      for (let i = 0; i < n; i++) {
        c.globalAlpha = r.range(0.2, 0.8);
        c.fillStyle = '#cfe0ff';
        c.beginPath();
        c.arc(r() * W, r() * H, r.range(1, 3.2), 0, Math.PI * 2);
        c.fill();
      }
      c.globalAlpha = 1;
    });

  // a grid of soft rounded tiles, as behind "Try Runway" / "Upgrade This/That"
  A.tiles = (name, bg, tile, gap = 22) =>
    M.pic(name, W, H, (c) => {
      c.fillStyle = bg;
      c.fillRect(0, 0, W, H);
      const rows = [
        [-260, 460, 0],
        [369, 345, 1],
        [736, 460, 2],
      ];
      for (const [y, h, k] of rows) {
        const off = k === 1 ? -560 : -40;
        const w = k === 1 ? 1000 : 640;
        for (let x = off; x < W + 200; x += w + gap) {
          c.save();
          c.shadowColor = 'rgba(0,0,0,0.25)';
          c.shadowBlur = 18;
          M.fillRR(c, x, y, w, h, 46, tile);
          c.restore();
        }
      }
    });

  A.copilot = () =>
    M.pic('copilot', W, H, (c) => {
      const g = c.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, '#e6dcf0');
      g.addColorStop(0.45, '#dcbde6');
      g.addColorStop(1, '#f8c2b4');
      c.fillStyle = g;
      c.fillRect(0, 0, W, H);
    });

  // the twisting ribbon in the Copilot plate; p sweeps it along
  A.ribbon = (c, p) => {
    c.save();
    c.lineCap = 'round';
    const path = (k) => {
      c.beginPath();
      for (let i = 0; i <= 60; i++) {
        const u = i / 60;
        const x = -80 + u * 760 + Math.sin(p * 2 + u) * 10;
        const y = 1040 - Math.sin(u * Math.PI * 1.6 + 0.2) * 820 + k;
        if (i === 0) c.moveTo(x, y);
        else c.lineTo(x, y);
      }
    };
    path(0);
    c.strokeStyle = '#a774b4';
    c.lineWidth = 66;
    c.stroke();
    path(-10);
    c.strokeStyle = 'rgba(255,255,255,0.18)';
    c.lineWidth = 18;
    c.stroke();
    c.restore();
  };

  A.kling = () =>
    M.pic('kling', W, H, (c) => {
      const r = M.rng(4);
      c.fillStyle = M.vgrad(c, 0, H, [[0, '#1a1d29'], [0.5, '#2b3646'], [1, '#121219']]);
      c.fillRect(0, 0, W, H);
      c.filter = 'blur(28px)';
      // windscreen glow and the dark dashboard of a car interior
      c.fillStyle = 'rgba(120,140,170,0.45)';
      c.fillRect(200, 220, 1500, 320);
      c.fillStyle = '#0c0d12';
      c.fillRect(0, 760, W, 400);
      c.beginPath();
      c.ellipse(560, 900, 340, 120, 0, 0, Math.PI * 2);
      c.fill();
      blobs(c, r, 30, 0, 0, W, H, 40, 120, ['#0f1118', '#3b4658'], 0.6);
      c.filter = 'none';
    });

  A.luma = () =>
    M.pic('luma', W, H, (c) => {
      c.fillStyle = M.rgrad(c, 960, 540, 100, 1200, [[0, '#c4cbe0'], [1, '#7d8fae']]);
      c.fillRect(0, 0, W, H);
    });

  A.grokSky = () =>
    M.pic('grok', W, H, (c) => {
      c.fillStyle = '#161616';
      c.fillRect(0, 0, W, H);
      c.fillStyle = M.rgrad(c, 960, 540, 0, 900, [[0, '#2a2a2a'], [1, '#141414']]);
      c.fillRect(0, 0, W, H);
    });

  // ---------- clouds and the reaching hands ----------
  const cloudPlate = (name, base, light, dark, seed) =>
    M.pic(name, W, H, (c) => {
      const r = M.rng(seed);
      c.fillStyle = base;
      c.fillRect(0, 0, W, H);
      c.filter = 'blur(40px)';
      blobs(c, r, 70, -100, -100, W + 100, H + 100, 80, 260, [light, dark, base], 0.55);
      // billowing highlights with shadowed undersides
      c.filter = 'blur(26px)';
      for (let i = 0; i < 26; i++) {
        const x = r.range(-100, W + 100);
        const y = r.range(-60, H + 60);
        const rad = r.range(90, 220);
        c.globalAlpha = 0.45;
        c.fillStyle = dark;
        c.beginPath();
        c.arc(x + rad * 0.15, y + rad * 0.35, rad, 0, Math.PI * 2);
        c.fill();
        c.globalAlpha = 0.75;
        c.fillStyle = light;
        c.beginPath();
        c.arc(x, y, rad * 0.85, 0, Math.PI * 2);
        c.fill();
      }
      c.globalAlpha = 1;
      c.filter = 'blur(12px)';
      blobs(c, r, 90, -100, -100, W + 100, H + 100, 30, 110, [light, dark], 0.25);
      c.filter = 'none';
    });
  A.clouds = {
    sepia: () => cloudPlate('cl-sepia', '#c9a66b', '#e7cf9f', '#a8834c', 11),
    gold: () => cloudPlate('cl-gold', '#c99a52', '#fbecc8', '#8a6a3a', 12),
    grey: () => cloudPlate('cl-grey', '#a9a49c', '#f0ede6', '#625e58', 13),
    lego: () =>
      M.pic('cl-lego', W, H, (c) => {
        const r = M.rng(5);
        const s = 24;
        for (let y = 0; y < H; y += s) {
          for (let x = 0; x < W; x += s) {
            const n = Math.sin(x * 0.004 + y * 0.003) + Math.sin(x * 0.011 - y * 0.007) + r() * 0.4;
            c.fillStyle = n > 1 ? '#f2e2b0' : n > 0.2 ? '#e7b847' : n > -0.6 ? '#d9a032' : '#5b8bc4';
            c.fillRect(x, y, s, s);
            c.fillStyle = 'rgba(0,0,0,0.08)';
            c.fillRect(x, y + s - 3, s, 3);
          }
        }
      }),
    glass: () =>
      M.pic('cl-glass', W, H, (c) => {
        const r = M.rng(9);
        c.fillStyle = M.rgrad(c, 960, 520, 50, 1100, [[0, '#fff6dc'], [0.5, '#f0d79a'], [1, '#c79a52']]);
        c.fillRect(0, 0, W, H);
        // lead lines: a cracked mosaic radiating from the centre
        c.strokeStyle = '#4a3216';
        c.lineWidth = 7;
        c.lineJoin = 'round';
        for (let i = 0; i < 26; i++) {
          const a = (i / 26) * Math.PI * 2 + r() * 0.1;
          c.beginPath();
          c.moveTo(960 + Math.cos(a) * 90, 520 + Math.sin(a) * 90);
          let x = 960 + Math.cos(a) * 90;
          let y = 520 + Math.sin(a) * 90;
          for (let k = 0; k < 7; k++) {
            x += Math.cos(a + r.range(-0.4, 0.4)) * 190;
            y += Math.sin(a + r.range(-0.4, 0.4)) * 190;
            c.lineTo(x, y);
          }
          c.stroke();
        }
        for (let k = 1; k < 7; k++) {
          c.beginPath();
          for (let i = 0; i <= 40; i++) {
            const a = (i / 40) * Math.PI * 2;
            const rad = k * 170 + Math.sin(a * 5 + k) * 40;
            const x = 960 + Math.cos(a) * rad * 1.3;
            const y = 520 + Math.sin(a) * rad;
            if (i === 0) c.moveTo(x, y);
            else c.lineTo(x, y);
          }
          c.stroke();
        }
      }),
    comic: () =>
      M.pic('cl-comic', W, H, (c) => {
        c.fillStyle = M.hgrad(c, 0, W, [[0, '#4d8fbf'], [0.6, '#6aa0c4'], [1, '#e5976a']]);
        c.fillRect(0, 0, W, H);
        const puff = (x, y, s) => {
          c.beginPath();
          for (let i = 0; i < 7; i++) {
            const a = (i / 7) * Math.PI * 2;
            c.moveTo(x + Math.cos(a) * s * 0.6 + s * 0.45, y + Math.sin(a) * s * 0.4);
            c.arc(x + Math.cos(a) * s * 0.6, y + Math.sin(a) * s * 0.4, s * 0.45, 0, Math.PI * 2);
          }
          c.fillStyle = '#f7e8c8';
          c.strokeStyle = '#3a2a1a';
          c.lineWidth = 6;
          c.stroke();
          c.fill();
        };
        puff(1000, 60, 260);
        puff(120, 1020, 200);
        puff(1500, 1040, 160);
        puff(-60, 120, 180);
      }),
    sketch: () =>
      M.pic('cl-sketch', W, H, (c) => {
        const r = M.rng(21);
        c.fillStyle = '#faf3dc';
        c.fillRect(0, 0, W, H);
        c.lineCap = 'round';
        for (let i = 0; i < 900; i++) {
          const x = r() * W;
          const y = r() * H;
          const l = r.range(20, 70);
          c.strokeStyle = r() < 0.55 ? 'rgba(240,205,90,0.55)' : 'rgba(80,130,200,0.45)';
          c.lineWidth = r.range(1, 3);
          c.beginPath();
          c.moveTo(x, y);
          c.lineTo(x + l, y - l * 0.6);
          c.stroke();
        }
      }),
  };

  // Reaching hands, built from tapered capsules (forearm, back of hand, four
  // fingers and a thumb). The index fingertip sits at the origin, pointing +x.
  // pose 'adam' hangs limp; pose 'god' points with the index straight.
  const HANDS = {
    adam: [
      [[-1500, -40], [-900, -40], [-330, -12], 150, 108],
      [[-360, -12], [-250, -6], [-150, 6], 116, 100],
      [[-300, -44], [-215, -66], [-150, -56], 40, 30],
      [[-175, 44], [-128, 78], [-100, 108], 28, 22],
      [[-165, 26], [-100, 62], [-62, 100], 32, 25],
      [[-158, 6], [-72, 36], [-22, 74], 35, 27],
      [[-160, -18], [-70, -12], [0, 0], 35, 27],
    ],
    god: [
      [[-1500, -10], [-900, -20], [-330, -8], 150, 108],
      [[-360, -8], [-250, -2], [-150, 4], 116, 100],
      [[-170, 46], [-128, 80], [-160, 92], 28, 24],
      [[-160, 30], [-108, 66], [-142, 80], 32, 27],
      [[-152, 14], [-88, 48], [-120, 66], 35, 29],
      [[-270, -36], [-190, -50], [-128, -34], 40, 30],
      [[-160, -12], [-75, -6], [0, 0], 36, 27],
    ],
  };
  const SKIN = {
    painting: ['#e6b48a', '#a5683f', '#4a2614'],
    gold: ['#efc497', '#b47b48', '#5a3418'],
    realistic: ['#e2d6c8', '#9a8c7c', '#3e3830'],
    comic: ['#f6d0a8', '#d9a073', '#24160c'],
    glass: ['#e0a055', '#a05e24', '#2e1c0c'],
    sketch: ['#ecc49a', '#b0703f', '#5a2a10'],
    lego: ['#d39a62', '#94603a', '#3a2414'],
  };
  // a capsule whose width tapers from w0 to w1 along a quadratic curve
  const capsule = (c, [p0, p1, p2, w0, w1], grow, fill) => {
    const n = 14;
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      const x = (1 - u) * (1 - u) * p0[0] + 2 * u * (1 - u) * p1[0] + u * u * p2[0];
      const y = (1 - u) * (1 - u) * p0[1] + 2 * u * (1 - u) * p1[1] + u * u * p2[1];
      pts.push([x, y, (M.lerp(w0, w1, u) + grow) / 2]);
    }
    c.beginPath();
    for (let i = 0; i <= n; i++) {
      const [x, y, r] = pts[i];
      const [nx, ny] = pts[Math.min(n, i + 1)];
      const [px, py] = pts[Math.max(0, i - 1)];
      const a = Math.atan2(ny - py, nx - px) - Math.PI / 2;
      const X = x + Math.cos(a) * r;
      const Y = y + Math.sin(a) * r;
      if (i === 0) c.moveTo(X, Y);
      else c.lineTo(X, Y);
    }
    const [ex, ey, er] = pts[n];
    const ea = Math.atan2(ey - pts[n - 1][1], ex - pts[n - 1][0]);
    c.arc(ex, ey, er, ea - Math.PI / 2, ea + Math.PI / 2);
    for (let i = n; i >= 0; i--) {
      const [x, y, r] = pts[i];
      const [nx, ny] = pts[Math.min(n, i + 1)];
      const [px, py] = pts[Math.max(0, i - 1)];
      const a = Math.atan2(ny - py, nx - px) + Math.PI / 2;
      c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    const [sx, sy, sr] = pts[0];
    const sa = Math.atan2(pts[1][1] - sy, pts[1][0] - sx);
    c.arc(sx, sy, sr, sa + Math.PI / 2, sa + (Math.PI * 3) / 2);
    c.fillStyle = fill;
    c.fill();
  };
  const paintHand = (c, pose, style) => {
    const skin = SKIN[style];
    const g = c.createLinearGradient(0, -90, 0, 120);
    g.addColorStop(0, skin[0]);
    g.addColorStop(0.55, skin[1]);
    g.addColorStop(1, skin[2]);
    const ink = style === 'comic' || style === 'glass' ? skin[2] : M.rgba([40, 22, 10], style === 'sketch' ? 0.8 : 0.45);
    const line = style === 'glass' ? 10 : style === 'comic' ? 8 : style === 'sketch' ? 4 : 3;
    for (const seg of HANDS[pose]) {
      capsule(c, seg, line, ink);
      capsule(c, seg, 0, g);
    }
    // soft light along the top of every segment
    c.save();
    c.globalAlpha = style === 'comic' ? 0.5 : 0.28;
    c.translate(0, -6);
    for (const seg of HANDS[pose]) capsule(c, [seg[0], seg[1], seg[2], seg[3] * 0.35, seg[4] * 0.35], 0, skin[0]);
    c.restore();
    if (style === 'glass') {
      // lead lines across the glass hand
      c.save();
      c.strokeStyle = skin[2];
      c.lineWidth = 5;
      c.globalCompositeOperation = 'source-atop';
      for (let i = -1500; i < 40; i += 60) {
        c.beginPath();
        c.moveTo(i, -120);
        c.lineTo(i + 24, 140);
        c.stroke();
      }
      c.restore();
    }
  };
  A.hand = (c, x, y, s, flip, style, rot = 0, pose = 'adam') => {
    c.save();
    c.translate(x, y);
    c.rotate(flip ? -rot : rot);
    c.scale(flip ? -s : s, s);
    if (style === 'lego') {
      // blocky: render small, scale up without smoothing
      const k = 0.07;
      const lc = M.layer(Math.ceil(1600 * k), Math.ceil(300 * k));
      const l = lc.getContext('2d');
      l.scale(k, k);
      l.translate(1540, 150);
      paintHand(l, pose, 'lego');
      c.imageSmoothingEnabled = false;
      c.drawImage(lc, -1540, -150, lc.width / k, lc.height / k);
      c.imageSmoothingEnabled = true;
    } else {
      // painted into its own layer so the overlapping outlines don't build up
      M.withLayer(c, (l) => paintHand(l, pose, style));
    }
    c.restore();
  };

  // ---------- collage photos (Video ring, Image wall, Motion/Creation) ----------
  const photo = (name, w, h, fn) => M.pic('ph-' + name, w, h, fn);
  const face = (c, cx, cy, s, skin, hair, lips = '#b0202a') => {
    c.fillStyle = hair;
    c.beginPath();
    c.ellipse(cx, cy - s * 0.1, s * 0.62, s * 0.75, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = skin;
    c.beginPath();
    c.ellipse(cx, cy + s * 0.05, s * 0.45, s * 0.6, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#222';
    c.fillRect(cx - s * 0.25, cy - s * 0.05, s * 0.14, s * 0.05);
    c.fillRect(cx + s * 0.11, cy - s * 0.05, s * 0.14, s * 0.05);
    c.fillStyle = lips;
    c.beginPath();
    c.ellipse(cx, cy + s * 0.38, s * 0.12, s * 0.05, 0, 0, Math.PI * 2);
    c.fill();
  };
  A.photos = {
    geisha: () =>
      photo('geisha', 320, 360, (c, w, h) => {
        c.fillStyle = '#e9e4e2';
        c.fillRect(0, 0, w, h);
        c.fillStyle = '#5b5250';
        c.fillRect(0, 0, w, 90);
        face(c, w * 0.42, h * 0.55, 230, '#f3efee', '#e9e4e2', '#a3101c');
      }),
    eye: () =>
      photo('eye', 360, 220, (c, w, h) => {
        c.fillStyle = M.vgrad(c, 0, h, [[0, '#8a8a8a'], [1, '#4a4a4a']]);
        c.fillRect(0, 0, w, h);
        c.fillStyle = '#d8d8d8';
        c.beginPath();
        c.ellipse(w / 2, h / 2, 120, 60, 0, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#333';
        c.beginPath();
        c.arc(w / 2, h / 2, 46, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#111';
        c.beginPath();
        c.arc(w / 2, h / 2, 20, 0, Math.PI * 2);
        c.fill();
      }),
    keyhole: () =>
      photo('keyhole', 360, 220, (c, w, h) => {
        c.fillStyle = '#0b0b0b';
        c.fillRect(0, 0, w, h);
        c.fillStyle = M.vgrad(c, 40, h, [[0, '#f2e4c9'], [1, '#9d8a70']]);
        c.beginPath();
        c.arc(w / 2, 80, 40, 0, Math.PI * 2);
        c.moveTo(w / 2 - 20, 100);
        c.lineTo(w / 2 - 50, h);
        c.lineTo(w / 2 + 50, h);
        c.lineTo(w / 2 + 20, 100);
        c.fill();
      }),
    field: () =>
      photo('field', 360, 220, (c, w, h) => {
        c.fillStyle = M.vgrad(c, 0, h, [[0, '#9fb1b8'], [0.45, '#c8c2a6'], [0.5, '#c79a3c'], [1, '#8f6a22']]);
        c.fillRect(0, 0, w, h);
        c.fillStyle = '#3b4a52';
        c.beginPath();
        c.ellipse(w * 0.5, h * 0.5, 34, 50, 0, 0, Math.PI * 2);
        c.fill();
        c.beginPath();
        c.arc(w * 0.5, h * 0.25, 18, 0, Math.PI * 2);
        c.fill();
      }),
    redman: () =>
      photo('redman', 260, 400, (c, w, h) => {
        c.fillStyle = M.vgrad(c, 0, h, [[0, '#5fa0d8'], [0.7, '#c7d9e6'], [0.72, '#7a6a5a'], [1, '#4a3a2a']]);
        c.fillRect(0, 0, w, h);
        c.fillStyle = '#d6b07a';
        c.fillRect(w * 0.2, h * 0.08, w * 0.6, h * 0.86);
        c.fillStyle = '#c62a1e';
        c.fillRect(w * 0.38, h * 0.32, w * 0.24, h * 0.22);
        c.fillStyle = '#1d2433';
        c.fillRect(w * 0.4, h * 0.54, w * 0.08, h * 0.3);
        c.fillRect(w * 0.52, h * 0.54, w * 0.08, h * 0.3);
        c.fillStyle = '#e0b090';
        c.beginPath();
        c.arc(w * 0.5, h * 0.27, 16, 0, Math.PI * 2);
        c.fill();
      }),
    volcano: () =>
      photo('volcano', 380, 220, (c, w, h) => {
        c.fillStyle = M.vgrad(c, 0, h, [[0, '#5b3c8a'], [0.6, '#b0508f'], [1, '#3a1a3a']]);
        c.fillRect(0, 0, w, h);
        c.fillStyle = '#2a1424';
        c.beginPath();
        c.moveTo(0, h);
        c.lineTo(w * 0.35, h * 0.55);
        c.lineTo(w * 0.7, h * 0.62);
        c.lineTo(w, h * 0.8);
        c.lineTo(w, h);
        c.fill();
        c.fillStyle = '#ff7a2a';
        c.beginPath();
        c.moveTo(w * 0.8, h * 0.7);
        c.quadraticCurveTo(w * 0.78, h * 0.3, w * 0.84, h * 0.15);
        c.quadraticCurveTo(w * 0.88, h * 0.4, w * 0.86, h * 0.72);
        c.fill();
      }),
    jeep: () =>
      photo('jeep', 300, 340, (c, w, h) => {
        c.fillStyle = M.vgrad(c, 0, h, [[0, '#a6c4dc'], [0.5, '#d6c8a6'], [1, '#a68a5a']]);
        c.fillRect(0, 0, w, h);
        c.fillStyle = '#e8eaec';
        M.fillRR(c, w * 0.1, h * 0.25, w * 0.85, h * 0.5, 20, '#e8eaec');
        c.fillStyle = '#2a2a2a';
        c.beginPath();
        c.arc(w * 0.45, h * 0.6, 70, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#9a9a9a';
        c.beginPath();
        c.arc(w * 0.45, h * 0.6, 38, 0, Math.PI * 2);
        c.fill();
      }),
    cows: () =>
      photo('cows', 330, 400, (c, w, h) => {
        c.fillStyle = '#c99a5e';
        c.fillRect(0, 0, w, h);
        c.fillStyle = M.vgrad(c, 30, 220, [[0, '#4a9be0'], [1, '#cfe6f6']]);
        c.fillRect(70, 30, w - 110, 190);
        c.fillStyle = '#fff';
        c.beginPath();
        c.ellipse(130, 160, 45, 52, 0, 0, Math.PI * 2);
        c.ellipse(230, 160, 45, 52, 0, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#222';
        c.beginPath();
        c.ellipse(115, 140, 18, 22, 0.4, 0, Math.PI * 2);
        c.ellipse(245, 145, 20, 18, -0.3, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#2a1a0e';
        M.setFont(c, 50, 800, -0.03);
        c.fillText('OUT OF', 46, 290);
        c.fillText('THE BOX.', 46, 340);
      }),
    robot: () =>
      photo('robot', 360, 220, (c, w, h) => {
        c.fillStyle = M.vgrad(c, 0, h, [[0, '#b9b9b9'], [1, '#4c4c4c']]);
        c.fillRect(0, 0, w, h);
        c.fillStyle = '#2a2a2a';
        c.beginPath();
        c.ellipse(w * 0.62, h * 0.45, 70, 60, 0, 0, Math.PI * 2);
        c.fill();
        c.fillRect(w * 0.2, h * 0.5, 60, 80);
      }),
    redhair: () =>
      photo('redhair', 240, 240, (c, w, h) => {
        c.fillStyle = '#d7d4d0';
        c.fillRect(0, 0, w, h);
        face(c, w / 2, h * 0.55, 150, '#efcfbf', '#c0202a', '#c0202a');
      }),
    blonde: () =>
      photo('blonde', 240, 240, (c, w, h) => {
        c.fillStyle = '#5a4a3a';
        c.fillRect(0, 0, w, h);
        face(c, w / 2, h * 0.55, 150, '#e8bfa0', '#c79a5a', '#b05a50');
      }),
    bob: () =>
      photo('bob', 240, 240, (c, w, h) => {
        c.fillStyle = '#e4e4e6';
        c.fillRect(0, 0, w, h);
        face(c, w / 2, h * 0.55, 150, '#efd2c0', '#141414', '#c03040');
      }),
    statue: () =>
      photo('statue', 240, 240, (c, w, h) => {
        c.fillStyle = '#6a6a6a';
        c.fillRect(0, 0, w, h);
        c.fillStyle = '#8d8d8d';
        c.fillRect(w * 0.4, h * 0.15, w * 0.2, h * 0.7);
      }),
    biker: () =>
      photo('biker', 240, 240, (c, w, h) => {
        c.fillStyle = M.vgrad(c, 0, h, [[0, '#2a3a5a'], [1, '#111']]);
        c.fillRect(0, 0, w, h);
        c.fillStyle = '#d9d9d9';
        c.beginPath();
        c.ellipse(w * 0.55, h * 0.45, 60, 80, 0.5, 0, Math.PI * 2);
        c.fill();
      }),
    night: () =>
      photo('night', 240, 240, (c, w, h) => {
        c.fillStyle = M.vgrad(c, 0, h, [[0, '#0e1414'], [1, '#2a3a36']]);
        c.fillRect(0, 0, w, h);
        c.fillStyle = '#3a5a50';
        c.fillRect(0, h * 0.55, w, h * 0.45);
      }),
    dark: () =>
      photo('dark', 240, 240, (c, w, h) => {
        c.fillStyle = '#0a0a0a';
        c.fillRect(0, 0, w, h);
      }),
    legs: () =>
      photo('legs', 240, 240, (c, w, h) => {
        c.fillStyle = M.vgrad(c, 0, h, [[0, '#3a3634'], [1, '#141210']]);
        c.fillRect(0, 0, w, h);
        c.fillStyle = '#0c0c0c';
        c.fillRect(w * 0.35, h * 0.2, 30, h * 0.7);
        c.fillRect(w * 0.55, h * 0.25, 30, h * 0.65);
      }),
    street: () =>
      photo('street', 240, 240, (c, w, h) => {
        c.fillStyle = M.vgrad(c, 0, h, [[0, '#6a5a4a'], [1, '#2a2420']]);
        c.fillRect(0, 0, w, h);
        c.fillStyle = '#c9b8a4';
        c.fillRect(w * 0.42, h * 0.2, 40, h * 0.6);
      }),
  };

  // ---------- glyphs drawn inside the buttons ----------
  // each glyph is centred on (x, y) and fits roughly in a box of size s
  A.glyph = (c, kind, x, y, s, color) => {
    c.save();
    c.translate(x, y);
    c.fillStyle = color;
    c.strokeStyle = color;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    const k = s / 100;
    c.scale(k, k);
    switch (kind) {
      case 'apple': {
        c.beginPath();
        c.moveTo(0, -18);
        c.bezierCurveTo(-14, -30, -44, -28, -46, 4);
        c.bezierCurveTo(-48, 30, -28, 52, -14, 50);
        c.bezierCurveTo(-6, 49, -4, 46, 0, 46);
        c.bezierCurveTo(4, 46, 6, 49, 14, 50);
        c.bezierCurveTo(28, 52, 46, 26, 46, 14);
        c.bezierCurveTo(30, 6, 30, -16, 40, -22);
        c.bezierCurveTo(30, -32, 12, -28, 0, -18);
        c.fill();
        c.beginPath();
        c.ellipse(8, -38, 8, 16, 0.6, 0, Math.PI * 2);
        c.fill();
        break;
      }
      case 'grok': {
        c.lineWidth = 9;
        c.beginPath();
        c.arc(0, 0, 34, 0.9, Math.PI * 2 - 0.3);
        c.stroke();
        c.beginPath();
        c.moveTo(-46, 46);
        c.lineTo(42, -42);
        c.stroke();
        break;
      }
      case 'claude': {
        c.lineWidth = 9;
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2 + 0.2;
          const l = 40 + (i % 3) * 5;
          c.beginPath();
          c.moveTo(Math.cos(a) * 6, Math.sin(a) * 6);
          c.lineTo(Math.cos(a) * l, Math.sin(a) * l);
          c.stroke();
        }
        break;
      }
      case 'gemini': {
        c.beginPath();
        c.moveTo(0, -48);
        c.quadraticCurveTo(4, -4, 48, 0);
        c.quadraticCurveTo(4, 4, 0, 48);
        c.quadraticCurveTo(-4, 4, -48, 0);
        c.quadraticCurveTo(-4, -4, 0, -48);
        c.fill();
        break;
      }
      case 'perplexity': {
        c.lineWidth = 6;
        c.beginPath();
        c.moveTo(0, -46);
        c.lineTo(0, 46);
        c.moveTo(-34, -40);
        c.lineTo(0, -8);
        c.lineTo(34, -40);
        c.moveTo(-34, -14);
        c.lineTo(34, -14);
        c.lineTo(34, 22);
        c.lineTo(0, -8);
        c.lineTo(-34, 22);
        c.lineTo(-34, -14);
        c.moveTo(-34, 22);
        c.lineTo(-34, 44);
        c.lineTo(0, 14);
        c.lineTo(34, 44);
        c.lineTo(34, 22);
        c.stroke();
        break;
      }
      case 'copilot': {
        const cols = ['#2dbbf0', '#8b5cf6', '#f59e0b', '#22c55e'];
        cols.forEach((col, i) => {
          c.fillStyle = col;
          c.beginPath();
          c.ellipse(-12 + (i % 2) * 24, -12 + (i >> 1) * 24, 20, 20, 0, 0, Math.PI * 2);
          c.fill();
        });
        break;
      }
      case 'runway': {
        c.lineWidth = 10;
        c.beginPath();
        c.moveTo(-34, 40);
        c.lineTo(-34, -30);
        c.quadraticCurveTo(-34, -40, -24, -40);
        c.lineTo(10, -40);
        c.quadraticCurveTo(36, -40, 36, -14);
        c.quadraticCurveTo(36, 10, 10, 10);
        c.lineTo(-8, 10);
        c.lineTo(30, 40);
        c.stroke();
        break;
      }
      case 'kling': {
        c.lineWidth = 7;
        c.beginPath();
        c.ellipse(0, 0, 40, 26, -0.5, 0, Math.PI * 2);
        c.stroke();
        c.beginPath();
        c.ellipse(0, 0, 26, 40, -0.5, 0, Math.PI * 2);
        c.stroke();
        break;
      }
      case 'luma': {
        c.beginPath();
        c.moveTo(-6, -46);
        c.lineTo(36, -18);
        c.lineTo(36, 30);
        c.lineTo(-6, 4);
        c.closePath();
        c.globalAlpha = 0.95;
        c.fill();
        c.beginPath();
        c.moveTo(-6, 4);
        c.lineTo(36, 30);
        c.lineTo(-6, 48);
        c.lineTo(-44, 26);
        c.closePath();
        c.globalAlpha = 0.6;
        c.fill();
        c.beginPath();
        c.moveTo(-6, -46);
        c.lineTo(-6, 4);
        c.lineTo(-44, 26);
        c.lineTo(-44, -18);
        c.closePath();
        c.globalAlpha = 0.8;
        c.fill();
        break;
      }
      case 'sora': {
        c.beginPath();
        for (let i = 0; i < 9; i++) {
          const a = (i / 9) * Math.PI * 2;
          c.moveTo(Math.cos(a) * 30 + 20, Math.sin(a) * 30);
          c.arc(Math.cos(a) * 30, Math.sin(a) * 30, 20, 0, Math.PI * 2);
        }
        c.arc(0, 0, 34, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#fff';
        c.beginPath();
        c.ellipse(-14, -2, 9, 12, 0, 0, Math.PI * 2);
        c.ellipse(14, -2, 9, 12, 0, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = color;
        c.beginPath();
        c.arc(-12, 0, 4, 0, Math.PI * 2);
        c.arc(16, 0, 4, 0, Math.PI * 2);
        c.fill();
        break;
      }
      case 'openai': {
        c.lineWidth = 7;
        for (let i = 0; i < 6; i++) {
          c.save();
          c.rotate((i / 6) * Math.PI * 2);
          c.beginPath();
          c.moveTo(-10, -18);
          c.lineTo(-10, -30);
          c.quadraticCurveTo(-10, -46, 8, -46);
          c.quadraticCurveTo(28, -46, 30, -24);
          c.stroke();
          c.restore();
        }
        break;
      }
      case 'banana': {
        c.fillStyle = '#f5d23a';
        c.beginPath();
        c.moveTo(-40, 30);
        c.quadraticCurveTo(10, 40, 40, -30);
        c.quadraticCurveTo(46, -10, 30, 14);
        c.quadraticCurveTo(0, 50, -40, 30);
        c.fill();
        c.fillStyle = '#e8a91a';
        c.beginPath();
        c.moveTo(-40, 30);
        c.quadraticCurveTo(-10, 0, 20, -40);
        c.quadraticCurveTo(10, 10, -40, 30);
        c.fill();
        c.fillStyle = '#5a4012';
        c.fillRect(36, -40, 8, 12);
        break;
      }
      case 'higgs': {
        // the Higgsfield squiggle: a looping scribble on a diagonal
        c.lineWidth = 11;
        c.beginPath();
        c.moveTo(-42, -10);
        c.bezierCurveTo(-30, -40, 6, -40, -6, -14);
        c.bezierCurveTo(-18, 12, -30, 28, -14, 30);
        c.bezierCurveTo(4, 32, 18, -4, 30, -6);
        c.bezierCurveTo(44, -8, 28, 18, 18, 26);
        c.bezierCurveTo(30, 34, 44, 26, 46, 18);
        c.stroke();
        break;
      }
    }
    c.restore();
  };

  // ---------- characters ----------
  A.bananaGuy = (c, x, y, s, wave) => {
    c.save();
    c.translate(x, y);
    c.scale(s, s);
    c.fillStyle = M.hgrad(c, -60, 60, [[0, '#f0c419'], [0.5, '#ffe36a'], [1, '#d9a512']]);
    c.beginPath();
    c.moveTo(-10, -260);
    c.quadraticCurveTo(80, -150, 70, 60);
    c.quadraticCurveTo(60, 200, -10, 240);
    c.quadraticCurveTo(-90, 180, -80, 0);
    c.quadraticCurveTo(-70, -170, -10, -260);
    c.fill();
    c.fillStyle = '#6a4a1a';
    c.fillRect(-18, -290, 18, 36);
    // eyes and grin
    c.fillStyle = '#fff';
    c.beginPath();
    c.ellipse(-30, -40, 20, 24, 0, 0, Math.PI * 2);
    c.ellipse(16, -40, 20, 24, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#222';
    c.beginPath();
    c.arc(-26, -36, 9, 0, Math.PI * 2);
    c.arc(20, -36, 9, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#5a1a10';
    c.beginPath();
    c.ellipse(-6, 20, 26, 18, 0, 0, Math.PI);
    c.fill();
    // waving arm
    c.strokeStyle = '#e9b81a';
    c.lineWidth = 14;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(60, 40);
    c.lineTo(110, -20 + Math.sin(wave) * 20);
    c.stroke();
    c.restore();
  };
})();
