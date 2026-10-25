// League promotion screen. The trophy row zooms in, pans from the current
// league (red book) to the locked next one, which glows, bursts open into the
// emerald book and throws confetti and sparkles.
// Everything is timed in frames at 60 fps (frame 1 = t 0) to match the
// reference recording; motion.js holds the measured trophy placements.
(() => {
  const W = 884, H = 1520, OY = 80;   // stage size in screen px; OY = screen y of the stage top
  const FPS = 60, END = 252;
  const K = 242 / 762;                // source art px -> screen px (red book is 242 wide)
  const PAD = 6, ANCHOR = 0.829;      // sprite padding; anchor = knob/pedestal joint
  const E = 40;                       // padding around the glow canvases
  const BG = '#fffffc';
  const AR = "'Tajawal', 'Noto Sans Arabic', 'Segoe UI', sans-serif";
  const LAT = "'Nunito', 'Segoe UI', sans-serif";
  const GREEN = { x: 440.5, y: 805, s: 1.695 };

  const canvas = document.getElementById('stage');
  const ctx = canvas.getContext('2d');
  const params = new URLSearchParams(location.search);
  const fixedFrame = params.has('frame') ? +params.get('frame') : null;

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ramp = (f, f0, f1) => clamp((f - f0) / (f1 - f0));
  const easeOut = (t) => 1 - (1 - t) ** 3;
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
  // Piecewise-linear keyframes: [[frame, value], ...]
  function keys(k, f) {
    if (f <= k[0][0]) return k[0][1];
    for (let i = 1; i < k.length; i++) {
      if (f <= k[i][0]) {
        const [f0, v0] = k[i - 1], [f1, v1] = k[i];
        return lerp(v0, v1, (f - f0) / (f1 - f0));
      }
    }
    return k[k.length - 1][1];
  }
  function track(name, f) {
    const m = window.LEAGUE_MOTION[name];
    const i = f - m.from;
    if (i < 0) return null;
    const n = m.v.length - 1;
    if (i >= n) return m.v[n];
    const i0 = Math.floor(i), t = i - i0, a = m.v[i0], b = m.v[i0 + 1];
    return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  }
  function rng(seed) {
    return () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---------- art ----------
  const art = {};
  function load(name) {
    return new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => res((art[name] = im));
      im.onerror = rej;
      im.src = 'img/' + name + '.png';
    });
  }
  // Recolored copy of a sprite, optionally grown outward (and then hollowed
  // so only the part outside the original shape is left) and blurred.
  function layer(img, color, grow = 0, blur = 0, hollow = false) {
    const c = document.createElement('canvas');
    c.width = img.width + 2 * E;
    c.height = img.height + 2 * E;
    const g = c.getContext('2d');
    for (const r of grow ? [grow, grow * 0.7, grow * 0.4] : []) {
      for (let i = 0; i < 40; i++) {
        const a = (i / 40) * Math.PI * 2;
        g.drawImage(img, E + Math.cos(a) * r, E + Math.sin(a) * r);
      }
    }
    g.drawImage(img, E, E);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = color;
    g.fillRect(0, 0, c.width, c.height);
    if (hollow) {
      g.globalCompositeOperation = 'destination-out';
      g.drawImage(img, E, E);
    }
    if (!blur) return c;
    const b = document.createElement('canvas');
    b.width = c.width;
    b.height = c.height;
    const bg = b.getContext('2d');
    bg.filter = 'blur(' + blur + 'px)';
    bg.drawImage(c, 0, 0);
    return b;
  }
  function buildLayers() {
    const L = art.locked;
    art.tint = layer(L, '#a9dcee');
    art.pale = layer(L, '#e2f4fd');
    art.white = layer(L, '#ffffff');
    art.ring = layer(L, '#62e6ff', 7, 0, true);
    art.glow = layer(L, '#d2f5ff', 26, 5, true);
  }

  // Draws a sprite with its anchor at (x, y). pad = extra padding of derived layers.
  function sprite(img, x, y, s, alpha = 1, pad = 0) {
    if (alpha <= 0) return;
    const sc = s * K;
    const ax = img.width / 2;
    const ay = pad + PAD + ANCHOR * (img.height - 2 * pad - 2 * PAD);
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, x - ax * sc, y - ay * sc, img.width * sc, img.height * sc);
    ctx.globalAlpha = 1;
  }

  // 4-point twinkle star
  function star(x, y, r, color, alpha = 1) {
    if (r <= 0.3 || alpha <= 0) return;
    const w = r * 0.22;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.quadraticCurveTo(x + w, y - w, x + r, y);
    ctx.quadraticCurveTo(x + w, y + w, x, y + r);
    ctx.quadraticCurveTo(x - w, y + w, x - r, y);
    ctx.quadraticCurveTo(x - w, y - w, x, y - r);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  function dot(x, y, r, color, alpha = 1) {
    if (r <= 0.3 || alpha <= 0) return;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  // Rays from r0 to r1 around (x, y), drawn as rounded dashes
  function rays(x, y, n, r0, r1, width, colors, alpha = 1, rot = 0) {
    if (alpha <= 0 || r1 <= r0) return;
    ctx.globalAlpha = alpha;
    ctx.lineCap = 'round';
    ctx.lineWidth = width;
    for (let i = 0; i < n; i++) {
      const a = rot + (i / n) * Math.PI * 2;
      ctx.strokeStyle = colors[i % colors.length];
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0);
      ctx.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // ---------- trophies ----------
  function drawRow(f) {
    const blue = track('blue', f);
    if (blue && f <= 56) sprite(art.blue, blue[0], blue[1], blue[2]);
    const red = track('red', f);
    sprite(art.red, red[0], red[1], red[2]);
    const next = track('next', f);
    if (next) sprite(art.locked, next[0], next[1], next[2]);
    drawConfetti(f);   // the confetti flies out from behind the book in focus
    if (f < 121) drawUnlocking(f);
    else drawEmerald(f);
  }

  // The locked book in focus: tints icy blue, fills pale, turns into a white
  // silhouette with a cyan outline and glow, wobbles and swells.
  function drawUnlocking(f) {
    const [x, y, s] = track('grey', f);
    sprite(art.locked, x, y, s);
    sprite(art.tint, x, y, s, keys([[84, 0], [96, 0.72], [104, 0.72]], f), E);
    sprite(art.pale, x, y, s, keys([[96, 0], [103, 1]], f), E);
    sprite(art.white, x, y, s, keys([[102, 0], [106, 1]], f), E);
    sprite(art.glow, x, y, s, keys([[101, 0], [107, 1]], f), E);
    sprite(art.ring, x, y, s, keys([[103, 0], [106, 0.3], [110, 0.45], [114, 0.6], [118, 0.85], [120, 1]], f), E);
    // twinkles inside the silhouette
    const k = s / 2.6;
    const inner = [
      [99, 112, 58, -300, 15], [101, 116, -12, -48, 13], [103, 118, -100, -330, 26], [105, 114, 62, -170, 10],
    ];
    for (const [f0, f1, dx, dy, r] of inner) {
      if (f < f0 || f > f1) continue;
      const p = (f - f0) / (f1 - f0);
      star(x + dx * k, y + dy * k, r * Math.sin(Math.PI * p) * k, '#7fdcf5');
    }
  }

  // The emerald book: one frame of the old book at pop size, then the emerald
  // pops in big, settles with a small hop, and gets a shine sweep.
  function drawEmerald(f) {
    const ps = keys([[121, 1.13], [122, 1.127], [125, 1.11], [128, 1.073], [130, 1.049], [131, 1.03], [132, 1.02], [133, 1.01], [134, 1]], f);
    const dy = keys([[121, -22], [125, -30], [128, -30], [130, -24], [131, -16], [132, -8], [133, -2], [134, 0], [137, -5], [140, -6], [143, -3], [146, 0]], f);
    const x = GREEN.x, y = GREEN.y + dy, s = GREEN.s * ps;
    if (f < 122) {
      sprite(art.locked, x, GREEN.y - 14, 2.6);
      return;
    }
    sprite(art.green, x, y, s);
    drawShine(f, x, y, s);
  }

  let shineCanvas = null;
  function drawShine(f, x, y, s) {
    if (f < 133 || f > 180) return;   // shine sweep, facet flash, glints
    const img = art.green;
    if (!shineCanvas) {
      shineCanvas = document.createElement('canvas');
      shineCanvas.width = img.width;
      shineCanvas.height = img.height;
    }
    const g = shineCanvas.getContext('2d');
    const w = img.width, h = img.height;
    const bookBottom = 650;   // below this row is the knob and pedestal
    g.clearRect(0, 0, w, h);
    g.save();
    g.beginPath();
    g.rect(0, 0, w, bookBottom);
    g.clip();
    g.fillStyle = '#ffffff';
    // diagonal sweep: a wide band and a thin one, top-left to bottom-right
    const p = lerp(ramp(f, 134, 166), easeInOut(ramp(f, 134, 166)), 0.5);
    const d = lerp(-0.25, 1.35, p) * (w + bookBottom);
    const a = keys([[133, 0], [137, 0.7], [160, 0.7], [166, 0]], f);
    g.globalAlpha = a;
    for (const [off, bw] of [[0, 120], [150, 34]]) {
      const c = d - off;
      g.beginPath();
      g.moveTo(c - bw, 0);
      g.lineTo(c, 0);
      g.lineTo(c - bookBottom, bookBottom);
      g.lineTo(c - bookBottom - bw, bookBottom);
      g.closePath();
      g.fill();
    }
    // centre facet flash
    const cf = keys([[150, 0], [153, 0.85], [157, 0.85], [161, 0]], f);
    if (cf > 0) {
      g.globalAlpha = cf;
      g.beginPath();
      const cx = w / 2, cy = 330;
      for (let i = 0; i < 5; i++) {
        const ang = -Math.PI / 2 + (i / 5) * Math.PI * 2;
        g[i ? 'lineTo' : 'moveTo'](cx + Math.cos(ang) * 120, cy + Math.sin(ang) * 105);
      }
      g.closePath();
      g.fill();
    }
    g.restore();
    g.globalCompositeOperation = 'destination-in';
    g.drawImage(img, 0, 0);
    g.globalCompositeOperation = 'source-over';
    sprite(shineCanvas, x, y, s);

    // glints on the book and knob
    const sc = s * K;
    const ox = x - (w / 2) * sc, oy = y - (PAD + ANCHOR * (h - 2 * PAD)) * sc;
    const glints = [
      [156, 168, 270, 240, 30], [162, 172, 390, 330, 26], [168, 178, 440, 200, 14],
    ];
    for (const [f0, f1, gx, gy, r] of glints) {
      if (f < f0 || f > f1) continue;
      star(ox + gx * sc, oy + gy * sc, r * Math.sin(Math.PI * ((f - f0) / (f1 - f0))), '#ffffff');
    }
    const kg = keys([[138, 0], [141, 1], [150, 1], [155, 0]], f);
    if (kg > 0) {
      ctx.globalAlpha = kg;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(ox + 370 * sc, oy + 790 * sc, 30 * sc, 9 * sc, -0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  // ---------- confetti and sparkles ----------
  // Squares thrown out from the book's edge in an arch, slowing to a stop,
  // then fading. Measured: ~34 px pieces travelling from ~230 to ~420 px.
  const CONFETTI_COLORS = ['#c882fa', '#ffc80a', '#ff86c4', '#1ec8f5', '#ffbe0a'];
  const confetti = (() => {
    const r = rng(7);
    const list = [];
    const n = 18;
    for (let i = 0; i < n; i++) {
      list.push({
        a: lerp(-Math.PI * 1.12, Math.PI * 0.12, (i + 0.1 + r() * 0.8) / n),
        r0: 205 + r() * 50,
        r1: 340 + r() * 110,
        size: 30 + r() * 6,
        rot: r() * Math.PI,
        spin: (r() - 0.5) * 0.1,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        fade: 141 + r() * 5,
      });
    }
    return list;
  })();
  function drawConfetti(f) {
    if (f < 121 || f > 156) return;
    const cx = 440, cy = 560;
    const t = ramp(f, 121, 148);
    const p = 1 - (1 - t) ** 2;
    for (const c of confetti) {
      const rr = lerp(c.r0, c.r1, p);
      const alpha = 1 - ramp(f, c.fade - 3, c.fade + 5);
      if (alpha <= 0) continue;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(cx + Math.cos(c.a) * rr, cy + Math.sin(c.a) * rr);
      ctx.rotate(c.rot + c.spin * (f - 121));
      ctx.fillStyle = c.color;
      ctx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size);
      ctx.restore();
    }
  }

  // A disc that swells and shrinks while a ring of rays bursts out of it
  function popper(f, x, y, disc, color, bursts) {
    const r = keys(disc, f);
    if (r > 0) dot(x, y, r, color);
    for (const b of bursts) {
      if (f < b.f0 || f > b.f1) continue;
      const p = ramp(f, b.f0, b.f1);
      const outer = lerp(b.r0, b.r1, easeOut(p));
      const len = lerp(b.len, 4, p);
      rays(x, y, 8, outer - len, outer, b.w, b.colors, 1 - ramp(p, 0.65, 1), b.rot || 0);
    }
  }
  // Four dashes around a gap that slide outward and shorten
  function plus(f, x, y, f0, f1, r0, r1, color) {
    if (f < f0 || f > f1) return;
    const p = ramp(f, f0, f1);
    const outer = lerp(r0, r1, easeOut(p));
    const len = outer * lerp(0.55, 0.12, p) * Math.min(1, p * 6);
    rays(x, y, 4, outer - len, outer, 5, [color], 1 - ramp(p, 0.75, 1), -Math.PI / 2);
  }
  function twinkle(f, x0, y0, x1, y1, f0, f1, r, color) {
    if (f < f0 || f > f1) return;
    const p = (f - f0) / (f1 - f0);
    star(lerp(x0, x1, p), lerp(y0, y1, p), r * Math.sin(Math.PI * p) ** 0.8, color);
  }
  const specks = (() => {
    const r = rng(3);
    const list = [];
    for (let i = 0; i < 24; i++) {
      const left = i % 2 === 0;
      const a = r() * Math.PI * 2, d = (left ? 85 : 60) + r() * 40;
      list.push({
        x: (left ? 159 : 828) + Math.cos(a) * d,
        y: (left ? 293 : 477) + Math.sin(a) * d,
        f0: (left ? 192 : 196) + r() * 16,
        color: (left ? ['#c882fa', '#1ec8f5'] : ['#ffc80a', '#ff6464'])[i % 4 >> 1],
      });
    }
    return list;
  })();
  function drawSparkles(f) {
    if (f < 124) return;
    const blue = '#a6e4fb';
    twinkle(f, 336, 190, 340, 292, 126, 184, 46, blue);
    twinkle(f, 118, 440, 118, 452, 124, 178, 28, blue);
    twinkle(f, 694, 458, 697, 512, 134, 186, 29, blue);
    twinkle(f, 168, 425, 170, 460, 186, 234, 56, blue);
    plus(f, 590, 291, 150, 204, 50, 112, '#a5e05a');
    plus(f, 129, 483, 164, 210, 50, 110, '#a5e05a');
    popper(f, 159, 293, [[157, 0], [160, 42], [162, 47], [166, 41], [170, 33], [172, 26], [175, 0]], '#1ec8f5', [
      { f0: 162, f1: 206, r0: 52, r1: 102, len: 26, w: 5, colors: ['#c882fa'] },
      { f0: 172, f1: 210, r0: 44, r1: 74, len: 16, w: 5, colors: ['#1ec8f5'], rot: Math.PI / 8 },
    ]);
    popper(f, 828, 477, [[170, 0], [172, 21], [175, 35], [178, 30], [182, 0]], '#ffc80a', [
      { f0: 177, f1: 212, r0: 40, r1: 72, len: 22, w: 5, colors: ['#ffc80a', '#ff6464'] },
    ]);
    for (const s of specks) {
      if (f < s.f0 || f > s.f0 + 24) continue;
      const p = (f - s.f0) / 24;
      dot(s.x, s.y + p * 8, 4 * (1 - p * 0.6), s.color, 1 - p * p);
    }
  }

  // ---------- screen text and controls ----------
  function caption(lines, y0, lh, alpha) {
    if (alpha <= 0) return;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#4b4b4b';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.direction = 'rtl';
    lines.forEach((parts, i) => {
      // parts: [[text, weight], ...] in reading order (right to left)
      const fonts = parts.map(([, wt]) => wt + ' 42px ' + AR);
      const widths = parts.map(([t], j) => ((ctx.font = fonts[j]), ctx.measureText(t).width));
      let right = W / 2 + widths.reduce((a, b) => a + b, 0) / 2;
      ctx.textAlign = 'right';
      parts.forEach(([t], j) => {
        ctx.font = fonts[j];
        ctx.fillText(t, right, y0 + i * lh);
        right -= widths[j];
      });
    });
    ctx.globalAlpha = 1;
    ctx.direction = 'ltr';
  }

  const ROWS = [
    { rank: 7, xp: 130, name: 'Lina Haddad', avatar: '#ffc1dc', letter: 'L', ink: '#4b4b4b' },
    { rank: 8, xp: 120, name: 'adelx7', avatar: '#58cc02', letter: 'A', ink: '#58a700', me: true },
    { rank: 9, xp: 104, name: 'omar', avatar: '#48a00f', letter: 'O', ink: '#4b4b4b' },
  ];
  function drawCard() {
    const x = 36, y = 842, w = 811, h = 551;
    const rows = [[846, 1034], [1034, 1200], [1200, 1389]], mid = [951, 1117, 1282];
    ctx.save();
    roundRect(x + 2, y + 2, w - 4, h - 4, 28);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.clip();
    ROWS.forEach((r, i) => {
      const [top, bottom] = rows[i], cy = mid[i];
      if (r.me) {
        ctx.fillStyle = '#d0fdb2';
        ctx.fillRect(x, top, w, bottom - top);
      }
      ctx.textBaseline = 'middle';
      ctx.direction = 'ltr';
      ctx.textAlign = 'left';
      ctx.font = '600 35px ' + LAT;
      ctx.fillStyle = r.me ? '#58a700' : '#777777';
      ctx.fillText('XP ' + r.xp, 73, cy + 2);
      ctx.textAlign = 'right';
      ctx.font = '800 36px ' + LAT;
      ctx.fillStyle = r.ink;
      ctx.fillText(r.name, 580, cy + 2);
      dot(683, cy, 55, r.avatar);
      ctx.textAlign = 'center';
      ctx.font = '800 44px ' + LAT;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(r.letter, 683, cy + 3);
      ctx.font = '800 38px ' + LAT;
      ctx.fillStyle = '#58cc02';
      ctx.fillText(String(r.rank), 784, cy + 2);
    });
    ctx.restore();
    roundRect(x + 2, y + 2, w - 4, h - 4, 28);
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#e5e5e2';
    ctx.stroke();
  }

  function drawButton(enabled, alpha) {
    if (alpha <= 0) return;
    const x = 36, y = 1448, w = 811, h = 111, lip = 8;
    ctx.globalAlpha = alpha;
    roundRect(x, y, w, h, 26);
    ctx.fillStyle = enabled ? '#0090d3' : '#d9d9d9';
    ctx.fill();
    roundRect(x, y, w, h - lip, 26);
    ctx.fillStyle = enabled ? '#02acf3' : '#e5e5e5';
    ctx.fill();
    ctx.fillStyle = enabled ? '#ffffff' : '#afafaf';
    ctx.font = '700 30px ' + AR;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.direction = 'rtl';
    ctx.fillText('المتابعة', W / 2, y + (h - lip) / 2 + 2);
    ctx.direction = 'ltr';
    ctx.globalAlpha = 1;
  }

  function drawUI(f) {
    const out = 1 - ramp(f, 12, 26);
    caption([[['لقد حصلت على المركز الـ', 700], ['8', 800], [' الأسبوع الماضي', 700]]], 778, 0, out);
    if (f < 12) {
      drawCard();
      drawButton(true, 1);
    } else {
      drawButton(false, out);
    }
    if (f >= 149) {
      caption([[['تهانينا! لقد تقدّمت إلى', 700]], [['المستوى الزمردي هذا الأسبوع.', 700]]], 1015, 66, 1);
      drawButton(true, ramp(f, 149, 160));
    }
  }

  // ---------- frame ----------
  function render(f) {
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);
    ctx.translate(0, -OY);
    drawRow(f);
    drawSparkles(f);
    drawUI(f);
  }

  let scale = 1;
  function fit() {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const view = fixedFrame !== null ? 1 : Math.min(window.innerWidth / W, window.innerHeight / H);
    canvas.style.width = W * view + 'px';
    canvas.style.height = H * view + 'px';
    scale = view * (fixedFrame !== null ? 1 : dpr);
    canvas.width = Math.round(W * scale);
    canvas.height = Math.round(H * scale);
  }

  let start = 0, frameNow = 1;
  function tick(now) {
    if (!start) start = now;
    frameNow = Math.min(END, 1 + ((now - start) / 1000) * FPS);
    render(frameNow);
    if (frameNow < END) requestAnimationFrame(tick);
  }
  function play() {
    start = 0;
    requestAnimationFrame(tick);
  }

  Promise.all([
    ...['blue', 'red', 'locked', 'green'].map(load),
    document.fonts ? Promise.all([
      document.fonts.load('700 42px Tajawal', 'لقد'), document.fonts.load('800 42px Tajawal', '8'),
      document.fonts.load('600 30px Nunito'), document.fonts.load('800 32px Nunito'),
    ]).catch(() => {}) : null,
  ]).then(() => {
    buildLayers();
    fit();
    window.addEventListener('resize', () => { fit(); render(frameNow); });
    if (fixedFrame !== null) {
      render(fixedFrame);
      window.leagueReady = true;
      // lets the render tool step through frames without reloading
      window.leagueFrame = (f) => render(f);
      return;
    }
    canvas.addEventListener('click', () => { if (frameNow >= END || frameNow > 1) play(); });
    play();
  });
})();
