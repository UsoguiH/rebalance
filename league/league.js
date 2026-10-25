// League promotion screen. The trophy row zooms in and pans from the current
// league to the locked next one. The locked one rattles, its padlock springs
// off, it charges up (the room dims, light is pulled in, it swells and
// trembles), holds for a beat, then bursts open into its unlocked art with a
// flash, shockwave, screen shake, light rays, confetti and a title slam.
// ?style=legendary is a third, bigger take on the unlock: the stage goes dark,
// three hits climb the rarity (rare, epic, legendary), and the badge spins in
// out of a gold explosion under a slammed-in title.
// Two trophy sets: the Qudrati rank badges (default) and the books
// (?set=books). It plays on load; tap at the end to replay.
// (classic.js is the first version, a faithful recreation of the recording.)
// Everything is timed in frames at 60 fps (frame 1 = t 0). Up to the unlock
// the timing matches the reference recording (motion.js holds the measured
// trophy placements); the celebration after the burst keeps the recording's
// beats, shifted by POST frames.
(() => {
  const W = 884, H = 1520, OY = 80;   // stage size in screen px; OY = screen y of the stage top
  const FPS = 60;
  // Timeline (frames)
  const RATTLE = [[112, 122, 0.035], [128, 141, 0.06]];   // two rattles: start, end, max tilt (rad)
  const BREAK = 146;                  // padlock springs open
  const CHARGE = 152, CHARGE_END = 188;  // tint -> white silhouette -> glowing outline
  const BURST = 192;                  // after a 4-frame hold
  const POST = BURST - 121;           // recording frame = timeline frame - POST, after the burst
  const TITLE = 220;
  // Legendary timeline (frames); shares everything up to the padlock snap
  const LG = {
    dark: 150, darkFull: 174,            // the room goes dark, the badge lifts into a spotlight
    hits: [192, 224, 256],               // each hit climbs one rarity
    charge: 262, hold: 294, burst: 298,  // gold charge, a 4-frame freeze, the explosion
    flip: 334,                           // the badge has spun in by here
    title: 320, name: 338, sub: 348, button: 362,
    end: 520,
  };
  const LEGEND = params_style() === 'legendary';
  const END = LEGEND ? LG.end : 380;
  const E = 40;                       // padding around the glow canvases
  const BG = '#fffffc';
  const AR = "'Tajawal', 'Noto Sans Arabic', 'Segoe UI', sans-serif";
  const LAT = "'Nunito', 'Segoe UI', sans-serif";
  const GREEN = { x: 440.5, y: 805, s: 1.695 };   // where the unlocked trophy settles

  // Roles: prev (left), cur (current league), lock (the locked one that opens),
  // open (its unlocked art), after (the next locked one, sliding in on the right).
  // width = on-screen width at scale 1; anchor = height fraction that sits on the
  // measured anchor line (books: the knob/pedestal joint).
  // shine: where the shine sweep is clipped, the facet that flashes and the glints,
  // all as fractions of the unlocked sprite.
  const SETS = {
    ranks: {
      art: {
        prev: ['ranks/rank-silver', 162], cur: ['ranks/rank-gold', 242],
        lock: ['ranks/rank-diamond-grey', 158], open: ['ranks/rank-diamond', 242],
        after: ['ranks/rank-champion-locked', 158],
      },
      pad: 0, anchor: 0.88,
      padlock: { x: 0.5, y: 0.48, size: 0.36 },   // drawn on the lock badge, as on the site
      league: 'الألماسي', title: '#1899d6', glow: '#8fd8ff',
      shine: {
        clip: 1, facet: null,
        glints: [[156, 168, 0.32, 0.3, 30], [162, 172, 0.52, 0.5, 26], [168, 178, 0.62, 0.24, 14]],
        knob: null,
      },
    },
    books: {
      art: {
        prev: ['blue', 162], cur: ['red', 242], lock: ['locked', 164], open: ['green', 242], after: ['locked', 164],
      },
      pad: 6, anchor: 0.829,
      padlock: null,                              // the keyhole is part of the art
      league: 'الزمردي', title: '#58a700', glow: '#a5e05a',
      shine: {
        clip: 650 / 1052, facet: [0.5, 330 / 1052, 120 / 774, 105 / 1052],
        glints: [[156, 168, 270 / 774, 240 / 1052, 30], [162, 172, 390 / 774, 330 / 1052, 26], [168, 178, 440 / 774, 200 / 1052, 14]],
        knob: [370 / 774, 790 / 1052, 30 / 774, 9 / 1052],
      },
    },
  };

  function params_style() { return new URLSearchParams(location.search).get('style'); }

  const canvas = document.getElementById('stage');
  const ctx = canvas.getContext('2d');
  const params = new URLSearchParams(location.search);
  const fixedFrame = params.has('frame') ? +params.get('frame') : null;
  const SET = SETS[params.get('set')] || SETS.ranks;
  const reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ramp = (f, f0, f1) => clamp((f - f0) / (f1 - f0));
  const easeOut = (t) => 1 - (1 - t) ** 3;
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
  // smooth deterministic wobble in [-1, 1]
  const wob = (t, seed) => (Math.sin(t * 1.7 + seed) * 0.6 + Math.sin(t * 3.1 + seed * 2.3) * 0.4);
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
  // A sprite: image plus its screen scale k and anchor point (ax, ay) in image px.
  const art = {};
  function load(role) {
    const [file, width] = SET.art[role];
    return new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => {
        const opaqueW = img.width - 2 * SET.pad, opaqueH = img.height - 2 * SET.pad;
        res((art[role] = { img, k: width / opaqueW, ax: img.width / 2, ay: SET.pad + SET.anchor * opaqueH }));
      };
      img.onerror = rej;
      img.src = 'img/' + file + '.png';
    });
  }
  // Recolored copy of a sprite, optionally grown outward (and then hollowed
  // so only the part outside the original shape is left) and blurred.
  function layer(base, color, grow = 0, blur = 0, hollow = false) {
    const img = base.img;
    const derived = (canvas) => ({ img: canvas, k: base.k, ax: base.ax + E, ay: base.ay + E });
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
    if (!blur) return derived(c);
    const b = document.createElement('canvas');
    b.width = c.width;
    b.height = c.height;
    const bg = b.getContext('2d');
    bg.filter = 'blur(' + blur + 'px)';
    bg.drawImage(c, 0, 0);
    return derived(b);
  }
  function buildLayers() {
    const L = art.lock;
    art.tint = layer(L, '#a9dcee');
    art.pale = layer(L, '#e2f4fd');
    art.white = layer(L, '#ffffff');
    art.ring = layer(L, '#62e6ff', 7, 0, true);
    art.glow = layer(L, '#d2f5ff', 26, 5, true);
  }

  // Draws a sprite with its anchor at (x, y); o.rot tilts it about the anchor,
  // o.sx / o.sy squash and stretch it.
  function sprite(a, x, y, s, alpha = 1, o = null) {
    if (alpha <= 0) return;
    const sc = s * a.k;
    ctx.globalAlpha = alpha;
    if (o) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(o.rot || 0);
      ctx.scale(o.sx || 1, o.sy || 1);
      ctx.drawImage(a.img, -a.ax * sc, -a.ay * sc, a.img.width * sc, a.img.height * sc);
      ctx.restore();
    } else {
      ctx.drawImage(a.img, x - a.ax * sc, y - a.ay * sc, a.img.width * sc, a.img.height * sc);
    }
    ctx.globalAlpha = 1;
  }
  // Screen point of a spot given as fractions of the sprite image
  function spot(a, x, y, s, fx, fy, rot = 0) {
    const sc = s * a.k;
    const dx = (fx * a.img.width - a.ax) * sc, dy = (fy * a.img.height - a.ay) * sc;
    return [x + dx * Math.cos(rot) - dy * Math.sin(rot), y + dx * Math.sin(rot) + dy * Math.cos(rot)];
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
    if (blue && f <= 56) sprite(art.prev, blue[0], blue[1], blue[2]);
    const red = track('red', f);
    sprite(art.cur, red[0], red[1], red[2]);
    const next = track('next', f);
    if (next) sprite(art.after, next[0], next[1], next[2]);
    const c = focusCentre(f);
    drawVignette(f, c);
    drawRays(f, c);
    drawConfetti(f, 0);   // half the confetti flies out from behind the trophy
    if (f < BURST) drawUnlocking(f);
    else drawUnlocked(f);
    drawConfetti(f, 1);
    drawImplosion(f, c);
    drawShockwave(f, c);
  }

  // Where the trophy in focus sits; its visual centre is what the effects aim at
  function focusPose(f) {
    if (f >= BURST) return [GREEN.x, GREEN.y, GREEN.s, art.open];
    const g = track('grey', Math.min(f, 120));
    const s = track('grey', Math.min(f, 100))[2];
    if (f <= 120) return [g[0], g[1], s, art.lock];
    return [lerp(g[0], GREEN.x, easeInOut(ramp(f, 120, 134))), g[1], s, art.lock];
  }
  function focusCentre(f) {
    const [x, y, s, a] = focusPose(f);
    return spot(a, x, y, s, 0.5, 0.5);
  }

  function rattleTilt(f) {
    let r = 0;
    for (const [f0, f1, amp] of RATTLE) {
      if (f < f0 || f > f1) continue;
      const p = ramp(f, f0, f1);
      r += amp * Math.sin((f - f0) * 1.05) * Math.sin(Math.PI * p);
    }
    return r;
  }

  // The locked trophy in focus. Rattles, loses its padlock, then tints icy blue,
  // fills pale, turns into a white silhouette with a cyan outline and glow,
  // swells and trembles harder and harder, and holds still for a beat.
  function drawUnlocking(f) {
    let [x, y, s] = focusPose(f);
    const u = f < CHARGE ? 84 : Math.min(120, 84 + (f - CHARGE));   // recording frame of the glow-up
    s *= keys([[CHARGE + 16, 1], [CHARGE + 32, 1.067], [CHARGE + 35, 1.1], [CHARGE_END, 1.157]], f);
    const shake = f < CHARGE_END ? keys([[CHARGE + 4, 0], [CHARGE + 22, 1.4], [CHARGE_END - 1, 5.5]], f) : 0;
    if (shake && !reduced) {
      x += wob(f * 1.9, 1) * shake;
      y += wob(f * 2.3, 4) * shake * 0.6;
    }
    const rot = rattleTilt(f) + (f >= BREAK && f < BREAK + 10 ? 0.025 * Math.sin((f - BREAK) * 1.4) * (1 - ramp(f, BREAK, BREAK + 10)) : 0);
    const o = { rot };
    sprite(art.lock, x, y, s, 1, o);
    if (SET.padlock) drawPadlock(f, x, y, s, rot);
    sprite(art.tint, x, y, s, keys([[84, 0], [96, 0.72], [104, 0.72]], u), o);
    sprite(art.pale, x, y, s, keys([[96, 0], [103, 1]], u), o);
    sprite(art.white, x, y, s, keys([[102, 0], [106, 1]], u), o);
    sprite(art.glow, x, y, s, keys([[101, 0], [107, 1]], u), o);
    // the outline brightens through the charge and pulses during the hold
    const hold = f >= CHARGE_END ? 0.85 + 0.15 * Math.cos((f - CHARGE_END) * 2.4) : 1;
    sprite(art.ring, x, y, s, keys([[103, 0], [106, 0.3], [110, 0.45], [114, 0.6], [118, 0.85], [120, 1]], u) * hold, o);
    // twinkles inside the silhouette
    const k = s / 2.6;
    const inner = [
      [99, 112, 58, -300, 15], [101, 116, -12, -48, 13], [103, 118, -100, -330, 26], [105, 114, 62, -170, 10],
    ];
    for (const [f0, f1, dx, dy, r] of inner) {
      if (u < f0 || u > f1 || f >= CHARGE_END) continue;
      const p = (u - f0) / (f1 - f0);
      const [px, py] = spot(art.lock, x, y, s, 0.5, art.lock.ay / art.lock.img.height);
      star(px + dx * k * (SET.padlock ? 0.6 : 1), py + dy * k * (SET.padlock ? 0.75 : 1), r * Math.sin(Math.PI * p) * k, '#7fdcf5');
    }
  }

  // The site's padlock (24-unit icon). Before BREAK it sits on the badge and
  // rattles with it; at BREAK the shackle springs up and swings open, then the
  // whole lock hops off, tumbles and falls away.
  function drawPadlock(f, x, y, s, rot) {
    const pl = SET.padlock;
    if (f > BREAK + 40) return;
    let [cx, cy] = spot(art.lock, x, y, s, pl.x, pl.y, rot);
    const size = pl.size * art.lock.img.width * s * art.lock.k;
    let ang = rot, alpha = 1;
    const t = f - (BREAK + 5);
    if (t > 0) {
      cx += -2.2 * t;
      cy += -11 * t + 0.55 * t * t;
      ang += -0.07 * t;
      alpha = 1 - ramp(t, 16, 30);
    }
    const lift = f < BREAK ? 0 : easeOut(ramp(f, BREAK, BREAK + 4)) * 3.2;
    const swing = f < BREAK ? 0 : easeOut(ramp(f, BREAK + 1, BREAK + 7)) * -0.75;
    const u = size / 24;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(cx, cy);
    ctx.rotate(ang);
    ctx.scale(u, u);
    ctx.translate(-12, -12);
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 3 * u;
    ctx.shadowOffsetY = 1.5 * u;
    // shackle: pivots on its right leg when it swings open
    ctx.save();
    ctx.translate(16.5, 10.5 - lift);
    ctx.rotate(swing);
    ctx.translate(-16.5, -10.5);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(7.5, 10.5);
    ctx.lineTo(7.5, 8);
    ctx.arc(12, 8, 4.5, Math.PI, 0);
    ctx.lineTo(16.5, 10.5);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(4.7, 10, 14.6, 11, 3.4) : ctx.rect(4.7, 10, 14.6, 11);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#4b4b4b';
    ctx.beginPath();
    ctx.arc(12, 14.7, 1.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(11, 15.4, 2, 3.4);
    ctx.restore();
    // a small click of light where it snapped
    if (f >= BREAK && f < BREAK + 10) {
      const p = ramp(f, BREAK, BREAK + 10);
      const [sx, sy] = spot(art.lock, x, y, s, pl.x, pl.y - pl.size * 0.45, rot);
      rays(sx, sy, 6, 14 + 30 * easeOut(p), 22 + 40 * easeOut(p), 4, ['#ffffff'], 1 - p);
      rays(sx, sy, 6, 14 + 30 * easeOut(p), 22 + 40 * easeOut(p), 4, [SET.glow], (1 - p) * 0.9, Math.PI / 6);
    }
  }

  // Burst: the unlocked art punches in oversized, squashes and stretches as it
  // lands, hops, settles, and gets a shine sweep.
  function drawUnlocked(f) {
    const r = f - POST;   // recording frame
    const ps = keys([[121, 1.34], [123, 1.28], [126, 0.92], [129, 1.05], [132, 0.985], [135, 1]], r);
    const sx = keys([[121, 0.86], [123, 0.9], [126, 1.1], [129, 0.97], [132, 1.01], [135, 1]], r);
    const sy = keys([[121, 1.14], [123, 1.1], [126, 0.9], [129, 1.04], [132, 0.99], [135, 1]], r);
    const dy = keys([[121, -30], [125, -46], [128, -30], [131, -8], [134, 0], [137, -6], [140, -7], [143, -3], [146, 0]], r);
    const x = GREEN.x, y = GREEN.y + dy, s = GREEN.s * ps;
    drawHalo(f);
    sprite(art.open, x, y, s, 1, { sx, sy });
    drawShine(r, x, y, s);
  }

  // ---------- burst and charge effects ----------
  // The room dims around the trophy while it charges; the flash clears it
  function drawVignette(f, [cx, cy]) {
    const a = keys([[CHARGE - 6, 0], [CHARGE_END, 0.42], [BURST, 0.42], [BURST + 1, 0]], f);
    if (a <= 0) return;
    const g = ctx.createRadialGradient(cx, cy, 200, cx, cy, 980);
    g.addColorStop(0, 'rgba(16,28,52,0)');
    g.addColorStop(1, 'rgba(16,28,52,' + a + ')');
    ctx.fillStyle = g;
    ctx.fillRect(0, OY, W, H);
  }

  // Streaks of light pulled in towards the trophy during the charge
  const motes = (() => {
    const r = rng(11);
    const list = [];
    for (let i = 0; i < 38; i++) {
      list.push({
        a: r() * Math.PI * 2,
        r0: 430 + r() * 200,
        f0: CHARGE + r() * (CHARGE_END - CHARGE - 14),
        dur: 13 + r() * 8,
        w: 3 + r() * 3,
        color: i % 3 ? SET.glow : '#ffffff',
      });
    }
    return list;
  })();
  function drawImplosion(f, [cx, cy]) {
    if (f < CHARGE || f > CHARGE_END) return;
    ctx.lineCap = 'round';
    for (const m of motes) {
      const p = (f - m.f0) / m.dur;
      if (p <= 0 || p >= 1) continue;
      const e = p ** 2.2;
      const rr = lerp(m.r0, 150, e);
      const len = 12 + 70 * e;
      const ca = Math.cos(m.a), sa = Math.sin(m.a);
      ctx.globalAlpha = Math.min(1, p * 3) * (1 - ramp(p, 0.85, 1));
      ctx.strokeStyle = m.color;
      ctx.lineWidth = m.w;
      ctx.beginPath();
      ctx.moveTo(cx + ca * rr, cy + sa * rr);
      ctx.lineTo(cx + ca * (rr + len), cy + sa * (rr + len));
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawShockwave(f, [cx, cy]) {
    for (const [f0, dur, r0, r1, w0, color] of [
      [BURST, 26, 150, 860, 36, SET.glow], [BURST + 4, 26, 130, 620, 14, SET.glow],
    ]) {
      const p = ramp(f, f0, f0 + dur);
      if (f < f0 || p >= 1) continue;
      ctx.globalAlpha = 0.85 * (1 - p) ** 1.5;
      ctx.strokeStyle = color;
      ctx.lineWidth = lerp(w0, 2, p);
      ctx.beginPath();
      ctx.arc(cx, cy, lerp(r0, r1, easeOut(p)), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // Slowly turning light rays behind the unlocked trophy; they stay
  function drawRays(f, [cx, cy]) {
    if (f < BURST) return;
    const a = keys([[BURST, 0], [BURST + 8, 0.95], [BURST + 60, 0.6]], f);
    const rot = (f - BURST) * 0.0045;
    const g = ctx.createRadialGradient(cx, cy, 60, cx, cy, 760);
    g.addColorStop(0, SET.glow);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.save();
    ctx.globalAlpha = a * 0.55;
    ctx.fillStyle = g;
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.beginPath();
    const n = 12;
    for (let i = 0; i < n; i++) {
      const t = (i / n) * Math.PI * 2;
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 760, t - 0.1, t + 0.1);
      ctx.closePath();
    }
    ctx.fill();
    ctx.restore();
    ctx.globalAlpha = 1;
  }
  // Soft breathing glow right behind the trophy
  function drawHalo(f) {
    const [cx, cy] = spot(art.open, GREEN.x, GREEN.y, GREEN.s, 0.5, 0.5);
    const a = keys([[BURST, 0.9], [BURST + 24, 0.45]], f) + 0.06 * Math.sin((f - BURST) * 0.08);
    const g = ctx.createRadialGradient(cx, cy, 40, cx, cy, 330);
    g.addColorStop(0, SET.glow);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.globalAlpha = clamp(a);
    ctx.fillStyle = g;
    ctx.fillRect(cx - 340, cy - 340, 680, 680);
    ctx.globalAlpha = 1;
  }

  function drawFlash(f) {
    const a = keys([[BURST - 1, 0], [BURST, 1], [BURST + 3, 0.75], [BURST + 14, 0]], f) * (reduced ? 0.35 : 1);
    if (a <= 0) return;
    ctx.globalAlpha = a;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, OY, W, H);
    ctx.globalAlpha = 1;
  }

  // Screen shake: a jolt when the padlock snaps, a big one on the burst, a
  // small one when the title lands
  function shakeOffset(f) {
    if (reduced) return [0, 0];
    const amp = keys([[BREAK - 1, 0], [BREAK, 4], [BREAK + 8, 0]], f)
      + keys([[BURST - 1, 0], [BURST, 18], [BURST + 6, 10], [BURST + 26, 0]], f)
      + keys([[TITLE + 2, 0], [TITLE + 3, 6], [TITLE + 12, 0]], f);
    return [wob(f * 2.9, 2) * amp, wob(f * 3.4, 7) * amp];
  }

  let shineCanvas = null;
  function drawShine(f, x, y, s) {
    if (f < 133 || f > 180) return;   // shine sweep, facet flash, glints
    const img = art.open.img, sh = SET.shine;
    if (!shineCanvas) {
      shineCanvas = document.createElement('canvas');
      shineCanvas.width = img.width;
      shineCanvas.height = img.height;
    }
    const g = shineCanvas.getContext('2d');
    const w = img.width, h = img.height;
    const bookBottom = sh.clip * h;   // below this row is the knob and pedestal
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
    const cf = sh.facet ? keys([[150, 0], [153, 0.85], [157, 0.85], [161, 0]], f) : 0;
    if (cf > 0) {
      g.globalAlpha = cf;
      g.beginPath();
      const [fx, fy, rx, ry] = sh.facet;
      for (let i = 0; i < 5; i++) {
        const ang = -Math.PI / 2 + (i / 5) * Math.PI * 2;
        g[i ? 'lineTo' : 'moveTo'](fx * w + Math.cos(ang) * rx * w, fy * h + Math.sin(ang) * ry * h);
      }
      g.closePath();
      g.fill();
    }
    g.restore();
    g.globalCompositeOperation = 'destination-in';
    g.drawImage(img, 0, 0);
    g.globalCompositeOperation = 'source-over';
    sprite({ ...art.open, img: shineCanvas }, x, y, s);

    // glints on the trophy (and the knob, for the books)
    const sc = s * art.open.k;
    const ox = x - art.open.ax * sc, oy = y - art.open.ay * sc;
    for (const [f0, f1, gx, gy, r] of sh.glints) {
      if (f < f0 || f > f1) continue;
      star(ox + gx * w * sc, oy + gy * h * sc, r * Math.sin(Math.PI * ((f - f0) / (f1 - f0))), '#ffffff');
    }
    const kg = sh.knob ? keys([[138, 0], [141, 1], [150, 1], [155, 0]], f) : 0;
    if (kg > 0) {
      const [kx, ky, krx, kry] = sh.knob;
      ctx.globalAlpha = kg;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(ox + kx * w * sc, oy + ky * h * sc, krx * w * sc, kry * h * sc, -0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  // ---------- confetti and sparkles ----------
  // Paper bits blasted up and out of the trophy on the burst: drag slows them,
  // gravity takes over, and they flutter (flip and sway) down past the screen.
  // Simulated from the burst each frame so any frame can be drawn on its own.
  const CONFETTI_COLORS = ['#ffc800', '#1cb0f6', '#58cc02', '#ff4b4b', '#ce82ff', '#ff9600', '#ff86c4'];
  const confetti = (() => {
    const r = rng(7);
    const list = [];
    for (let i = 0; i < 90; i++) {
      const a = -Math.PI / 2 + (r() - 0.5) * Math.PI * 1.35;
      const v = 26 + r() * 28;
      list.push({
        f0: BURST + r() * 3,
        x: (r() - 0.5) * 160, y: (r() - 0.5) * 140,
        vx: Math.cos(a) * v * 1.15, vy: Math.sin(a) * v,
        w: 22 + r() * 14, h: 12 + r() * 8,
        rot: r() * Math.PI * 2, spin: (r() - 0.5) * 0.3,
        flip: r() * Math.PI * 2, flipRate: 0.12 + r() * 0.18,
        sway: r() * Math.PI * 2,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        layer: i % 3 ? 0 : 1,   // two in three fly out from behind the trophy
      });
    }
    return list;
  })();
  function drawConfetti(f, layer) {
    drawConfettiList(confetti, BURST, f, layer, spot(art.open, GREEN.x, GREEN.y, GREEN.s, 0.5, 0.5));
  }
  function drawConfettiList(list, burst, f, layer, [cx, cy]) {
    if (f < burst) return;
    for (const c of list) {
      if (c.layer !== layer || f < c.f0) continue;
      let x = c.x, y = c.y, vx = c.vx, vy = c.vy;
      const steps = Math.floor(f - c.f0);
      for (let i = 0; i < steps; i++) {
        vx *= 0.94;
        vy = vy * 0.94 + 0.6;
        if (vy > 4.5) vy = 4.5;                       // flutter-limited fall speed
        x += vx + Math.sin(c.sway + i * 0.09) * 1.4;
        y += vy;
      }
      const sy = cy + y;
      if (sy > OY + H + 40) continue;
      const t = f - c.f0;
      ctx.save();
      ctx.translate(cx + x, sy);
      ctx.rotate(c.rot + c.spin * t);
      ctx.scale(1, Math.cos(c.flip + c.flipRate * t));
      ctx.fillStyle = c.color;
      ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
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
  function caption(lines, y0, lh, alpha, size = 42) {
    if (alpha <= 0) return;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#4b4b4b';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.direction = 'rtl';
    lines.forEach((parts, i) => {
      // parts: [[text, weight], ...] in reading order (right to left)
      const fonts = parts.map(([, wt]) => wt + ' ' + size + 'px ' + AR);
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

  function drawButton(enabled, alpha, pulse = 0) {
    if (alpha <= 0) return;
    const x = 36, y = 1448, w = 811, h = 111, lip = 8;
    ctx.globalAlpha = alpha;
    ctx.save();
    if (pulse) {
      const k = 1 + pulse;
      ctx.translate(W / 2, y + h / 2);
      ctx.scale(k, k);
      ctx.translate(-W / 2, -(y + h / 2));
    }
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
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  // The league name slams in big and lands with a bounce; the line under it
  // rises in after
  function drawTitle(f) {
    if (f < TITLE) return;
    const k = keys([[TITLE, 1.9], [TITLE + 4, 0.9], [TITLE + 7, 1.05], [TITLE + 10, 0.985], [TITLE + 13, 1]], f);
    ctx.save();
    ctx.globalAlpha = ramp(f, TITLE, TITLE + 2);
    ctx.translate(W / 2, 1012);
    ctx.scale(k, k);
    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '800 78px ' + AR;
    ctx.fillStyle = SET.title;
    ctx.fillText('المستوى ' + SET.league, 0, 0);
    ctx.restore();
    const p = easeOut(ramp(f, TITLE + 8, TITLE + 22));
    if (p > 0) {
      ctx.save();
      ctx.globalAlpha = p;
      ctx.translate(0, (1 - p) * 18);
      caption([[['تهانينا! تقدّمت إلى مستوى جديد هذا الأسبوع', 700]]], 1098, 0, p, 38);
      ctx.restore();
    }
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
    if (LEGEND) return drawLegendTitle(f);
    drawTitle(f);
    const b = ramp(f, TITLE + 18, TITLE + 30);
    if (!LEGEND) drawButton(true, b, b >= 1 ? 0.012 * (1 - Math.cos((f - TITLE - 30) * 0.08)) : 0);
  }

  // ---------- legendary ----------
  // Rarity steps: before the first hit, then rare, epic, legendary
  const RARITY = [
    { color: '#8fa6ff', name: '' },
    { color: '#35c4ff', name: 'نادر' },
    { color: '#c25bff', name: 'ملحمي' },
    { color: '#ffc21a', name: 'أسطوري' },
  ];
  const GOLD = '#ffc21a';
  const lg = {};   // layers made at load time
  function buildLegend() {
    const L = art.lock;
    lg.tint = RARITY.map((r) => layer(L, r.color));
    lg.glow = RARITY.map((r) => layer(L, r.color, 30, 7, true));
    lg.white = art.white;
    lg.openGlow = layer(art.open, GOLD, 34, 9, true);
    lg.back = layer(art.open, '#ffd84d');
    lg.title = textBitmap('أسطوري!', 128);
  }
  // The title drawn once into its own canvas: gold gradient, dark outline,
  // so the glint can be swept across it
  function textBitmap(text, size) {
    const c = document.createElement('canvas');
    c.width = 860;
    c.height = Math.round(size * 1.9);
    const g = c.getContext('2d');
    g.direction = 'rtl';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = '800 ' + size + 'px ' + AR;
    const cy = c.height / 2;
    g.lineJoin = 'round';
    g.lineWidth = size * 0.16;
    g.strokeStyle = '#2a1206';
    g.strokeText(text, c.width / 2, cy + size * 0.06);   // drop edge
    g.strokeText(text, c.width / 2, cy);
    const grad = g.createLinearGradient(0, cy - size * 0.5, 0, cy + size * 0.5);
    grad.addColorStop(0, '#fff8c9');
    grad.addColorStop(0.45, '#ffd21f');
    grad.addColorStop(1, '#ff8a00');
    g.fillStyle = grad;
    g.fillText(text, c.width / 2, cy);
    return c;
  }

  const level = (f) => LG.hits.filter((h) => f >= h).length;
  const sinceHit = (f) => {
    const past = LG.hits.filter((h) => f >= h);
    return past.length ? f - past[past.length - 1] : 999;
  };

  // Badge pose while it is still locked: lifted into the spotlight, bobbing
  function legendPose(f) {
    let [x, y, s] = focusPose(f);
    y -= 80 * easeInOut(ramp(f, LG.dark, LG.darkFull + 6));
    y += Math.sin((f - LG.dark) * 0.07) * 7 * ramp(f, LG.darkFull, LG.darkFull + 20);
    // anticipation before each hit (pull back), punch on it
    let k = 1, sx = 1, sy = 1;
    for (const h of LG.hits) {
      k *= keys([[h - 8, 1], [h - 1, 0.92], [h, 1.14], [h + 4, 0.98], [h + 8, 1]], f);
      sx *= keys([[h - 1, 1], [h, 1.16], [h + 3, 0.92], [h + 7, 1.03], [h + 11, 1]], f);
      sy *= keys([[h - 1, 1], [h, 0.86], [h + 3, 1.08], [h + 7, 0.98], [h + 11, 1]], f);
    }
    k *= keys([[LG.charge, 1], [LG.hold, 1.13]], f);
    const tremble = reduced ? 0 : keys([[LG.charge, 0.5], [LG.hold - 1, 7], [LG.hold, 0]], f) * (f < LG.hold ? 1 : 0)
      + (f < LG.hits[0] ? 0 : 0.8 * (f < LG.charge ? 1 : 0));
    x += wob(f * 2.1, 3) * tremble;
    y += wob(f * 2.6, 8) * tremble * 0.6;
    return { x, y, s: s * k, sx, sy };
  }
  function legendCentre(f) {
    if (f >= LG.burst) {
      const bob = Math.sin((f - LG.flip) * 0.05) * 8 * ramp(f, LG.flip, LG.flip + 30);
      return spot(art.open, GREEN.x, GREEN.y - 30 + bob, GREEN.s, 0.5, 0.5);
    }
    const p = legendPose(f);
    return spot(art.lock, p.x, p.y, p.s, 0.5, 0.5);
  }

  function drawBackdrop(f, [cx, cy]) {
    const a = easeInOut(ramp(f, LG.dark, LG.darkFull));
    if (a <= 0) return;
    const g = ctx.createRadialGradient(cx, cy, 80, cx, cy, 1100);
    const lit = f >= LG.burst ? 1 : 0;
    g.addColorStop(0, lit ? '#3d2475' : '#271650');
    g.addColorStop(0.55, '#140b30');
    g.addColorStop(1, '#06030f');
    ctx.globalAlpha = a;
    ctx.fillStyle = g;
    ctx.fillRect(0, OY, W, H);
    ctx.globalAlpha = 1;
  }

  // A soft beam of light falling from the top onto the badge
  function drawSpotlight(f, [cx, cy]) {
    const a = ramp(f, LG.dark + 10, LG.darkFull + 10) * (1 - ramp(f, LG.burst, LG.burst + 10));
    if (a <= 0) return;
    const g = ctx.createLinearGradient(0, OY, 0, cy + 260);
    g.addColorStop(0, 'rgba(200,210,255,0.32)');
    g.addColorStop(1, 'rgba(200,210,255,0)');
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = a;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(cx - 110, OY);
    ctx.lineTo(cx + 110, OY);
    ctx.lineTo(cx + 330, cy + 260);
    ctx.lineTo(cx - 330, cy + 260);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function glowDisc(cx, cy, r, color, alpha) {
    if (alpha <= 0) return;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alpha;
    ctx.fillStyle = g;
    ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r);
    ctx.restore();
  }
  // Wedge rays around (cx, cy); hue > -1 paints them in a cycling rainbow
  function wedges(cx, cy, n, radius, half, rot, color, alpha, hue = -1) {
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    for (let i = 0; i < n; i++) {
      const t = (i / n) * Math.PI * 2;
      const c = hue < 0 ? color : 'hsl(' + ((hue + i * (360 / n)) % 360) + ',100%,65%)';
      const g = ctx.createRadialGradient(0, 0, 30, 0, 0, radius);
      g.addColorStop(0, c);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = alpha;
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, t - half, t + half);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // Sparks circling the badge on a tilted ring; more and faster with each hit.
  // front = false draws the half behind the badge.
  function drawOrbit(f, [cx, cy], front) {
    if (f < LG.darkFull || f >= LG.burst) return;
    const lv = level(f);
    const n = 10 + lv * 8;
    const color = RARITY[lv].color;
    const speed = 0.025 + lv * 0.018 + ramp(f, LG.charge, LG.hold) * 0.06;
    const pull = 1 - 0.45 * easeInOut(ramp(f, LG.charge, LG.hold));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + f * speed * (1 + (i % 3) * 0.15);
      const depth = Math.sin(a);
      if ((depth > 0) !== front) continue;
      const x = cx + Math.cos(a) * 300 * pull, y = cy + depth * 95 * pull - 10;
      const r = (front ? 5 : 3.5) * (0.8 + 0.4 * ((i * 7) % 5) / 5);
      ctx.globalAlpha = 0.25 * ramp(f, LG.darkFull, LG.darkFull + 12);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, r * 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = ramp(f, LG.darkFull, LG.darkFull + 12);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Each hit: a colour ring, a spray of light streaks
  function drawHits(f, [cx, cy]) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    LG.hits.forEach((h, i) => {
      const t = f - h;
      if (t < 0 || t > 26) return;
      const p = t / 26;
      const color = RARITY[i + 1].color;
      ctx.globalAlpha = (1 - p) ** 1.5;
      ctx.strokeStyle = color;
      ctx.lineWidth = lerp(28, 2, p);
      ctx.beginPath();
      ctx.arc(cx, cy, lerp(170, 640 + i * 120, easeOut(p)), 0, Math.PI * 2);
      ctx.stroke();
      const n = 14 + i * 6;
      ctx.lineCap = 'round';
      ctx.lineWidth = 5;
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + i;
        const r0 = lerp(150, 380 + i * 60, easeOut(p)), len = lerp(70, 10, p);
        ctx.strokeStyle = k % 2 ? color : '#ffffff';
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
        ctx.lineTo(cx + Math.cos(a) * (r0 + len), cy + Math.sin(a) * (r0 + len));
        ctx.stroke();
      }
    });
    ctx.restore();
  }

  // Gold streaks pulled into the badge during the final charge
  const goldMotes = (() => {
    const r = rng(23);
    const list = [];
    for (let i = 0; i < 60; i++) {
      list.push({ a: r() * Math.PI * 2, r0: 480 + r() * 260, f0: LG.charge + r() * (LG.hold - LG.charge - 12), dur: 10 + r() * 8, w: 3 + r() * 4 });
    }
    return list;
  })();
  function drawGoldImplosion(f, [cx, cy]) {
    if (f < LG.charge || f >= LG.hold) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    goldMotes.forEach((m, i) => {
      const p = (f - m.f0) / m.dur;
      if (p <= 0 || p >= 1) return;
      const e = p ** 2;
      const rr = lerp(m.r0, 140, e), len = 16 + 90 * e;
      ctx.globalAlpha = Math.min(1, p * 3) * (1 - ramp(p, 0.85, 1));
      ctx.strokeStyle = i % 3 ? GOLD : '#ffffff';
      ctx.lineWidth = m.w;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(m.a) * rr, cy + Math.sin(m.a) * rr);
      ctx.lineTo(cx + Math.cos(m.a) * (rr + len), cy + Math.sin(m.a) * (rr + len));
      ctx.stroke();
    });
    ctx.restore();
  }

  // The locked badge in the dark: grey art washed with the rarity colour,
  // a coloured glow, a white flash on each hit, white-hot by the end of the charge
  function drawLockedLegend(f) {
    const p = legendPose(f);
    const lv = level(f);
    const o = { sx: p.sx, sy: p.sy };
    const [cx, cy] = spot(art.lock, p.x, p.y, p.s, 0.5, 0.5);
    const pulse = 0.85 + 0.15 * Math.sin(f * 0.25);
    glowDisc(cx, cy, 300 + lv * 50, RARITY[lv].color, (0.35 + lv * 0.12) * ramp(f, LG.dark, LG.darkFull) * pulse);
    wedges(cx, cy, 12, 520 + lv * 90, 0.07, f * (0.004 + lv * 0.004), RARITY[lv].color, 0.1 * lv);
    drawOrbit(f, [cx, cy], false);
    sprite(lg.glow[lv], p.x, p.y, p.s, ramp(f, LG.dark, LG.darkFull) * pulse, o);
    sprite(art.lock, p.x, p.y, p.s, 1, o);
    sprite(lg.tint[lv], p.x, p.y, p.s, (0.2 + lv * 0.12) * ramp(f, LG.dark, LG.darkFull), o);
    const flash = Math.max(1 - sinceHit(f) / 12, 0) + easeInOut(ramp(f, LG.charge + 8, LG.hold - 2));
    sprite(lg.white, p.x, p.y, p.s, clamp(flash), o);
    drawOrbit(f, [cx, cy], true);
  }

  // The rarity word under the badge, popping on each hit
  function drawRarityLabel(f) {
    const lv = level(f);
    if (!lv || f >= LG.burst) return;
    const t = sinceHit(f);
    const k = keys([[0, 1.7], [4, 0.92], [7, 1.04], [10, 1]], t);
    const a = 1 - ramp(f, LG.charge + 8, LG.hold);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(W / 2, 1010);
    ctx.scale(k, k);
    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '800 64px ' + AR;
    ctx.shadowColor = RARITY[lv].color;
    ctx.shadowBlur = 24;
    ctx.fillStyle = RARITY[lv].color;
    ctx.fillText(RARITY[lv].name, 0, 0);
    ctx.restore();
  }

  // ---- after the explosion ----
  const embers = (() => {
    const r = rng(31);
    const list = [];
    for (let i = 0; i < 60; i++) {
      list.push({ x: r() * W, speed: 1.2 + r() * 2.6, off: r() * (H + 200), size: 2 + r() * 3.5, sway: r() * 6, gold: r() < 0.75 });
    }
    return list;
  })();
  function drawEmbers(f) {
    if (f < LG.burst) return;
    const a = ramp(f, LG.burst, LG.burst + 30);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const e of embers) {
      const t = f - LG.burst;
      const y = OY + H + 40 - ((e.off + t * e.speed) % (H + 200));
      const x = e.x + Math.sin(t * 0.03 + e.sway) * 18;
      const fade = clamp((y - OY) / 400) * a;
      ctx.globalAlpha = fade * 0.3;
      ctx.fillStyle = e.gold ? GOLD : '#c9a0ff';
      ctx.beginPath();
      ctx.arc(x, y, e.size * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = fade;
      ctx.fillStyle = '#fff4c4';
      ctx.beginPath();
      ctx.arc(x, y, e.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  // Gold and white stars twinkling on their own rhythms around the badge
  const glints = (() => {
    const r = rng(41);
    const list = [];
    for (let i = 0; i < 16; i++) {
      const a = r() * Math.PI * 2, d = 260 + r() * 200;
      list.push({ dx: Math.cos(a) * d, dy: Math.sin(a) * d * 0.85, period: 60 + r() * 60, phase: r(), r: 14 + r() * 22, gold: i % 3 !== 0 });
    }
    return list;
  })();
  function drawGlints(f, [cx, cy]) {
    if (f < LG.burst + 6) return;
    for (const g of glints) {
      const p = (((f - LG.burst) / g.period) + g.phase) % 1;
      if (p > 0.5) continue;
      star(cx + g.dx, cy + g.dy, g.r * Math.sin(Math.PI * p * 2), g.gold ? '#ffd84d' : '#ffffff');
    }
  }

  const LEGEND_CONFETTI = ['#ffc21a', '#fff1a8', '#ffffff', '#c25bff', '#35c4ff', '#ff7ad9'];
  const legendConfetti = (() => {
    const r = rng(53);
    const list = [];
    for (let i = 0; i < 110; i++) {
      const a = -Math.PI / 2 + (r() - 0.5) * Math.PI * 1.5;
      const v = 30 + r() * 30;
      list.push({
        f0: LG.burst + r() * 4, x: (r() - 0.5) * 160, y: (r() - 0.5) * 140,
        vx: Math.cos(a) * v * 1.15, vy: Math.sin(a) * v,
        w: 22 + r() * 16, h: 12 + r() * 8,
        rot: r() * Math.PI * 2, spin: (r() - 0.5) * 0.3,
        flip: r() * Math.PI * 2, flipRate: 0.12 + r() * 0.18, sway: r() * Math.PI * 2,
        color: LEGEND_CONFETTI[i % LEGEND_CONFETTI.length], layer: i % 3 ? 0 : 1,
      });
    }
    return list;
  })();

  // Rainbow shimmer swept across the revealed badge, now and then
  let shimmerCanvas = null;
  function drawShimmer(f, x, y, s, o) {
    const cycle = (f - (LG.flip + 4)) % 150;
    if (f < LG.flip + 4 || cycle > 34) return;
    const img = art.open.img, w = img.width, h = img.height;
    if (!shimmerCanvas) {
      shimmerCanvas = document.createElement('canvas');
      shimmerCanvas.width = w;
      shimmerCanvas.height = h;
    }
    const g = shimmerCanvas.getContext('2d');
    g.clearRect(0, 0, w, h);
    const d = lerp(-0.4, 1.4, easeInOut(cycle / 34)) * (w + h);
    const grad = g.createLinearGradient(d - h - 90, 0, d - h + 90, 0);
    ['rgba(255,80,80,0)', 'rgba(255,200,60,0.7)', 'rgba(120,255,160,0.7)', 'rgba(80,170,255,0.7)', 'rgba(220,120,255,0.7)', 'rgba(220,120,255,0)']
      .forEach((c, i, arr) => grad.addColorStop(i / (arr.length - 1), c));
    g.save();
    g.setTransform(1, 0, 1, 1, 0, 0);   // shear so the band runs diagonally
    g.fillStyle = grad;
    g.fillRect(-h, 0, w + 2 * h, h);
    g.restore();
    g.globalCompositeOperation = 'destination-in';
    g.drawImage(img, 0, 0);
    g.globalCompositeOperation = 'source-over';
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    sprite({ ...art.open, img: shimmerCanvas }, x, y, s, 0.8, o);
    ctx.restore();
  }

  // The revealed badge: spins in like a card flip (gold back, then the face),
  // lands with an overshoot, then floats
  function drawRevealed(f) {
    const t = ramp(f, LG.burst, LG.flip);
    const phi = (1 - easeOut(t)) * Math.PI * 4;
    const face = Math.cos(phi);
    const k = keys([[LG.burst, 1.45], [LG.flip - 6, 0.97], [LG.flip, 1.04], [LG.flip + 6, 0.99], [LG.flip + 10, 1]], f);
    const bob = Math.sin((f - LG.flip) * 0.05) * 8 * ramp(f, LG.flip, LG.flip + 30);
    const x = GREEN.x, y = GREEN.y - 30 + bob, s = GREEN.s * k;
    const o = { sx: Math.max(0.03, Math.abs(face)) };
    const [cx, cy] = spot(art.open, x, y, s, 0.5, 0.5);
    const breathe = 0.85 + 0.15 * Math.sin(f * 0.06);
    glowDisc(cx, cy, 420, GOLD, 0.55 * breathe);
    sprite(lg.openGlow, x, y, s, keys([[LG.burst, 1], [LG.flip + 20, 0.8]], f) * breathe, o);
    if (face >= 0) sprite(art.open, x, y, s, 1, o);
    else sprite(lg.back, x, y, s, 1, o);
    drawShimmer(f, x, y, s, o);
  }

  function drawLensFlare(f, [cx, cy]) {
    const a = 1 - ramp(f, LG.burst, LG.burst + 34);
    if (f < LG.burst || a <= 0) return;
    const w = lerp(300, W * 1.6, easeOut(ramp(f, LG.burst, LG.burst + 12)));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const [hgt, col, al] of [[90, GOLD, 0.35], [16, '#fff6d8', 1]]) {
      const g = ctx.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(0.5, col);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = a * al;
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(cx, cy, w / 2, hgt / 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawLegendShock(f, [cx, cy]) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const [f0, dur, r1, w0, color] of [[LG.burst, 30, 1000, 46, GOLD], [LG.burst + 3, 28, 760, 18, '#ffffff'], [LG.burst + 8, 30, 600, 10, '#c25bff']]) {
      const p = ramp(f, f0, f0 + dur);
      if (f < f0 || p >= 1) continue;
      ctx.globalAlpha = (1 - p) ** 1.4;
      ctx.strokeStyle = color;
      ctx.lineWidth = lerp(w0, 2, p);
      ctx.beginPath();
      ctx.arc(cx, cy, lerp(160, r1, easeOut(p)), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawLegendTitle(f) {
    if (f >= LG.title) {
      const k = keys([[LG.title, 3.2], [LG.title + 5, 0.86], [LG.title + 9, 1.07], [LG.title + 13, 0.98], [LG.title + 16, 1]], f);
      const bm = lg.title;
      ctx.save();
      ctx.globalAlpha = ramp(f, LG.title, LG.title + 3);
      ctx.translate(W / 2, 268);
      ctx.scale(k, k);
      ctx.shadowColor = 'rgba(255,170,0,0.6)';
      ctx.shadowBlur = 30;
      ctx.drawImage(bm, -bm.width / 2, -bm.height / 2);
      ctx.restore();
      // a glint across the gold letters, then again every few seconds
      const cyc = (f - (LG.title + 18)) % 170;
      if (f >= LG.title + 18 && cyc < 26) {
        const g = document.createElement('canvas');
        g.width = bm.width;
        g.height = bm.height;
        const gc = g.getContext('2d');
        const x = lerp(-120, bm.width + 120, easeInOut(cyc / 26));
        gc.setTransform(1, 0, -0.35, 1, 0, 0);
        const grad = gc.createLinearGradient(x - 60, 0, x + 60, 0);
        grad.addColorStop(0, 'rgba(255,255,255,0)');
        grad.addColorStop(0.5, 'rgba(255,255,255,0.95)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        gc.fillStyle = grad;
        gc.fillRect(-200, 0, bm.width + 400, bm.height);
        gc.setTransform(1, 0, 0, 1, 0, 0);
        gc.globalCompositeOperation = 'destination-in';
        gc.drawImage(bm, 0, 0);
        ctx.drawImage(g, W / 2 - bm.width / 2, 268 - bm.height / 2);
      }
      // a burst of gold behind the word as it lands
      const lp = ramp(f, LG.title + 4, LG.title + 26);
      if (lp > 0 && lp < 1) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        rays(W / 2, 268, 16, lerp(120, 360, easeOut(lp)), lerp(160, 380, easeOut(lp)), 6, [GOLD, '#ffffff'], 1 - lp);
        ctx.restore();
      }
    }
    const np = easeOut(ramp(f, LG.name, LG.name + 14));
    if (np > 0) {
      ctx.save();
      ctx.globalAlpha = np;
      ctx.translate(W / 2, 1000 + (1 - np) * 24);
      ctx.direction = 'rtl';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '800 70px ' + AR;
      ctx.shadowColor = 'rgba(194,91,255,0.8)';
      ctx.shadowBlur = 22;
      ctx.fillStyle = '#ffffff';
      ctx.fillText('المستوى ' + SET.league, 0, 0);
      ctx.restore();
    }
    const sp = easeOut(ramp(f, LG.sub, LG.sub + 14));
    if (sp > 0) {
      ctx.save();
      ctx.globalAlpha = sp;
      ctx.translate(W / 2, 1082 + (1 - sp) * 18);
      ctx.direction = 'rtl';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '700 36px ' + AR;
      ctx.fillStyle = '#d6c8ff';
      ctx.fillText('تهانينا! حقّقت إنجازًا أسطوريًا هذا الأسبوع', 0, 0);
      ctx.restore();
    }
    const b = ramp(f, LG.button, LG.button + 12);
    drawButton(true, b, b >= 1 ? 0.014 * (1 - Math.cos((f - LG.button - 12) * 0.08)) : 0);
  }

  function legendShake(f) {
    if (reduced) return [0, 0];
    let amp = keys([[BREAK - 1, 0], [BREAK, 4], [BREAK + 8, 0]], f);
    LG.hits.forEach((h, i) => { amp += keys([[h - 1, 0], [h, 7 + i * 5], [h + 14, 0]], f); });
    amp += keys([[LG.burst - 1, 0], [LG.burst, 26], [LG.burst + 8, 14], [LG.burst + 36, 0]], f);
    amp += keys([[LG.title + 4, 0], [LG.title + 5, 10], [LG.title + 16, 0]], f);
    return [wob(f * 2.9, 2) * amp, wob(f * 3.4, 7) * amp];
  }

  function drawLegendFlash(f) {
    let a = keys([[LG.burst - 1, 0], [LG.burst, 1], [LG.burst + 3, 0.85], [LG.burst + 8, 0.3], [LG.burst + 14, 0]], f);
    LG.hits.forEach((h) => { a = Math.max(a, keys([[h - 1, 0], [h, 0.35], [h + 6, 0]], f)); });
    a *= reduced ? 0.35 : 1;
    if (a <= 0) return;
    ctx.globalAlpha = a;
    ctx.fillStyle = f >= LG.burst ? '#fff8e0' : '#ffffff';
    ctx.fillRect(0, OY, W, H);
    ctx.globalAlpha = 1;
  }

  function drawLegend(f) {
    // the row as before, then the room goes dark over it
    const red = track('red', f);
    sprite(art.cur, red[0], red[1], red[2]);
    const next = track('next', f);
    if (next) sprite(art.after, next[0], next[1], next[2]);
    const c = legendCentre(f);
    drawBackdrop(f, c);
    drawSpotlight(f, c);
    if (f < LG.burst) {
      drawLockedLegend(f);
      const base = focusPose(f);
      drawPadlock(f, base[0], base[1], base[2], 0);   // still tumbling away from the snap
      drawHits(f, c);
      drawGoldImplosion(f, c);
      drawRarityLabel(f);
      return;
    }
    const t = f - LG.burst;
    const raysIn = keys([[0, 0], [8, 1], [70, 0.75]], t);
    wedges(c[0], c[1], 14, 980, 0.085, t * 0.006, GOLD, 0.42 * raysIn);
    wedges(c[0], c[1], 24, 900, 0.03, -t * 0.004, null, 0.22 * raysIn, (t * 2) % 360);
    drawEmbers(f);
    drawConfettiList(legendConfetti, LG.burst, f, 0, c);
    drawRevealed(f);
    drawConfettiList(legendConfetti, LG.burst, f, 1, c);
    drawGlints(f, c);
    drawLegendShock(f, c);
    drawLensFlare(f, c);
  }

  // ---------- frame ----------
  function render(f) {
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.imageSmoothingQuality = 'high';   // the rank badges are small and drawn up to ~2x
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);
    ctx.translate(0, -OY);
    const legend = LEGEND && f >= LG.dark;
    const [shx, shy] = LEGEND ? legendShake(f) : shakeOffset(f);
    ctx.save();
    ctx.translate(shx, shy);
    if (legend) drawLegend(f);
    else drawRow(f);
    if (!LEGEND && f >= BURST) drawSparkles(f - POST);
    drawUI(f);
    ctx.restore();
    if (LEGEND) drawLegendFlash(f);
    else drawFlash(f);
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

  // Phone buzzes on the hits, where supported
  let buzzTimers = [];
  function buzz() {
    buzzTimers.forEach(clearTimeout);
    buzzTimers = [];
    // browsers only allow it once the page has been tapped
    if (!navigator.vibrate || (navigator.userActivation && !navigator.userActivation.hasBeenActive)) return;
    const at = (f, pattern) => buzzTimers.push(setTimeout(() => navigator.vibrate(pattern), ((f - 1) / FPS) * 1000));
    at(BREAK, 20);
    if (LEGEND) {
      LG.hits.forEach((h, i) => at(h, 25 + i * 15));
      at(LG.burst, [60, 40, 140]);
      at(LG.title + 5, 25);
      return;
    }
    at(BURST, [40, 30, 90]);
    at(TITLE + 3, 15);
  }

  // ---------- playback ----------
  let start = 0, frameNow = 1, playing = false;
  function tick(now) {
    if (playing) {
      if (!start) start = now;
      frameNow = 1 + ((now - start) / 1000) * FPS;
    }
    render(frameNow);   // keeps going past END so the rays keep turning
    requestAnimationFrame(tick);
  }
  function play() {
    playing = true;
    start = 0;
    frameNow = 1;
    buzz();
  }
  function onTap() {
    if (frameNow >= END) play();
  }

  Promise.all([
    ...Object.keys(SET.art).map(load),
    document.fonts ? Promise.all([
      document.fonts.load('700 42px Tajawal', 'لقد'), document.fonts.load('800 42px Tajawal', '8'),
      document.fonts.load('600 30px Nunito'), document.fonts.load('800 32px Nunito'),
      document.fonts.load('800 128px Tajawal', 'أسطوري'),
    ]).catch(() => {}) : null,
  ]).then(() => {
    buildLayers();
    if (LEGEND) buildLegend();
    fit();
    window.addEventListener('resize', () => { fit(); render(frameNow); });
    if (fixedFrame !== null) {
      render(fixedFrame);
      window.leagueReady = true;
      window.leagueEnd = END;
      // lets the render tool step through frames without reloading
      window.leagueFrame = (f) => render(f);
      return;
    }
    requestAnimationFrame(tick);
    // In compare.html both versions sit in iframes; the parent starts them
    // together and a tap on either replays both.
    if (params.has('embed')) {
      window.addEventListener('message', (e) => { if (e.data && e.data.league === 'play') play(); });
      canvas.addEventListener('click', () => parent.postMessage({ league: 'tap' }, '*'));
      parent.postMessage({ league: 'ready' }, '*');
      return;
    }
    canvas.addEventListener('click', onTap);
    window.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') onTap(); });
    play();
  });
})();
