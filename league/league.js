// League promotion screen. The trophy row zooms in and pans from the current
// league to the locked next one. The locked one rattles, its padlock springs
// off, it charges up (the room dims, light is pulled in, it swells and
// trembles), holds for a beat, then bursts open into its unlocked art with a
// flash, shockwave, screen shake, light rays, confetti and a title slam.
// ?style=bold is a third take: same bright screen, simple and hard-hitting.
// The grey badge winds up, the league colour fills it from the bottom, it
// pops with a flat burst while its neighbours hop, then a pill, the league
// name and a ladder of all the leagues show the climb.
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
  const RATTLE = [[128, 141, 0.06]];  // a rattle after the swing settles: start, end, max tilt (rad)
  // The swing as the locked trophy arrives, measured from the recording: the
  // base stays put while the top tips left, swings right and settles (rad,
  // clockwise positive, pivoting on the trophy's base)
  const SWING = [[88, 0], [90, -0.02], [92, -0.054], [94, -0.078], [96, -0.093], [98, -0.08], [100, -0.033],
    [102, 0.013], [104, 0.052], [106, 0.065], [108, 0.035], [110, -0.002], [112, -0.024], [114, -0.026],
    [116, -0.017], [118, 0.004], [120, 0.02], [123, 0.012], [127, 0]];
  // where its base sits meanwhile (the measured box centre swung with the top)
  const SWING_X = [[90, 448], [92, 444], [94, 441], [96, 438], [100, 438], [104, 445], [106, 449], [108, 446],
    [110, 441], [114, 438], [120, 442], [126, 440.5]];
  const BREAK = 146;                  // padlock springs open
  const CHARGE = 152, CHARGE_END = 188;  // tint -> white silhouette -> glowing outline
  const BURST = 192;                  // after a 4-frame hold
  const POST = BURST - 121;           // recording frame = timeline frame - POST, after the burst
  // The promotion (new style, rank badges): 1 silver, 2 gold, 3 diamond, 4 champion.
  // Each runs its own sequence after the padlock snaps; diamond is the charge
  // and burst below, the others are in the "per-promotion flows" section.
  const TIER_N = (() => {
    const q = new URLSearchParams(location.search);
    return q.get('set') === 'books' ? 3 : Math.min(4, Math.max(1, +(q.get('tier') || 3)));
  })();
  const T1 = { flip: [156, 168], banner: 184, end: 300 };
  const T2 = { rise: [158, 180], fall: [186, 198], land: 198, banner: 212, end: 360 };
  const T4 = { wipe: [156, 184], lift: [166, 190], crown: [178, 206], impact: 206, settle: [212, 232], banner: 238, end: 480 };
  const TITLE = [0, T1.banner, T2.banner, 220, T4.banner][TIER_N];
  // Bold timeline (frames); shares everything up to the padlock snap
  const BD = {
    squash: 152, fill: 162, pop: 192,   // wind-up, colour fill, the pop
    pill: 202, title: 210, sub: 220,
    ladder: 230, climb: 244, arrive: 260, button: 272,
    end: 346,
  };
  const BOLD = params_style() === 'bold';
  // Ink timeline (frames): one blue pencil erases the locked trophy, sketches
  // the new one, colours it in, circles it, ticks it and writes its name
  const INK = {
    start: 128, penIn: [118, 132], erase: [132, 154], sketch: [162, 190], color: [196, 224], pop: 228,
    circle: [234, 258], check: [264, 278], write: [288, 324], penOut: [326, 340],
    sub: 328, button: 340, end: 400,
  };
  const INKY = params_style() === 'ink';
  // Spark timeline: a progress ring fills while XP counts up, shatters into
  // shapes, the badge flips over to its new league, stats spring in
  const SP = { ring: 128, fill: [140, 196], burst: 196, flip: [196, 208], head: 206, chip: 214, stats: 234, button: 262, end: 340 };
  // Hype timeline: three heartbeats fill it a third at a time, it rises and
  // slams down, a sticker lands, the students you passed count up
  const HY = { beats: [142, 158, 174], rise: [182, 202], slam: 208, sticker: 216, plus: 234, name: 242, count: [256, 292], button: 300, end: 370 };
  const SPARK = params_style() === 'spark', HYPE = params_style() === 'hype';
  const END = BOLD ? BD.end : INKY ? INK.end : SPARK ? SP.end : HYPE ? HY.end : [0, T1.end, T2.end, 380, T4.end][TIER_N];
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
        l0: ['ranks/rank-bronze', 158], l3g: ['ranks/rank-diamond-grey', 158],
        lockBaked: ['ranks/rank-diamond-locked', 158],
      },
      pad: 0, anchor: 0.88,
      padlock: { x: 0.5, y: 0.48, size: 0.36 },   // drawn on the lock badge, as on the site
      // bold style: all the leagues in order, as [reached art, not-yet art]; we climb from index 2 to 3
      ladder: [['l0', 'l0'], ['prev', 'prev'], ['cur', 'cur'], ['open', 'l3g'], ['after', 'after']],
      ladderFrom: 2,
      shape: 'ranks',   // name, colours and shine come from tiers.js
      shine: {
        clip: 1, knob: null,
      },
    },
    books: {
      art: {
        prev: ['blue', 162], cur: ['red', 242], lock: ['locked', 164], open: ['green', 242], after: ['locked', 164],
        lockBaked: ['locked', 164],
      },
      pad: 6, anchor: 0.829,
      padlock: null,                              // the keyhole is part of the art
      ladder: null,
      leagueName: 'المستوى الزمردي', title: '#58a700', glow: '#a5e05a', shape: 'books',
      shine: {
        clip: 650 / 1052, facet: [0.5, 330 / 1052, 120 / 774, 105 / 1052],
        cross: [340 / 774, 250 / 1052],
        knob: [370 / 774, 790 / 1052, 30 / 774, 9 / 1052],
      },
    },
  };

  function params_style() { return new URLSearchParams(location.search).get('style'); }

  const canvas = document.getElementById('stage');
  const ctx = canvas.getContext('2d');
  const params = new URLSearchParams(location.search);
  const fixedFrame = params.has('frame') ? +params.get('frame') : null;
  // ?tier=1..4 picks the promotion: into silver, gold, diamond (the default) or champion
  const PROMO = window.leaguePromotion(+(params.get('tier') || 3));
  Object.assign(SETS.ranks.art, PROMO.art);
  Object.assign(SETS.ranks, { leagueName: PROMO.tier.name, title: PROMO.tier.title, glow: PROMO.tier.glow });
  Object.assign(SETS.ranks.shine, { facetPoly: PROMO.tier.facet, cross: PROMO.tier.cross });
  const SET = SETS[params.get('set')] || SETS.ranks;
  // Each promotion gets bigger than the last (new style): the charge, flash,
  // shake, shockwaves and confetti scale up, and each has its own signature:
  // silver gets a double polish, gold a burst of coins, diamond crystal
  // shards, champion fireworks, falling crowns and a ribbon under the title.
  const LEVEL = SET === SETS.ranks ? PROMO.tier : null;
  const FX = [
    null,
    { sig: 'polish', confetti: 36, motes: 18, tremble: 0.5, vignette: 0.22, flash: 0.55, shake: 0.45, shocks: 1, sparkles: 0, title: 72,
      colors: ['#c9d6e6', '#8fa3bd', '#ffffff', '#1cb0f6', '#ffc800'] },
    { sig: 'coins', confetti: 60, motes: 28, tremble: 0.75, vignette: 0.32, flash: 0.75, shake: 0.7, shocks: 1, sparkles: 1, title: 76,
      colors: ['#ffc800', '#ffde5a', '#ff9600', '#ffffff', '#1cb0f6', '#58cc02'] },
    { sig: 'shards', confetti: 90, motes: 38, tremble: 1, vignette: 0.42, flash: 1, shake: 1, shocks: 2, sparkles: 2, title: 78,
      colors: ['#ffc800', '#1cb0f6', '#58cc02', '#ff4b4b', '#ce82ff', '#ff9600', '#ff86c4'] },
    { sig: 'royal', confetti: 150, motes: 60, tremble: 1.35, vignette: 0.5, flash: 1, shake: 1.35, shocks: 3, sparkles: 2, title: 84,
      colors: ['#8e4cf0', '#b58cff', '#ffc800', '#ffde5a', '#ffffff', '#ff86c4'] },
  ][SET === SETS.ranks ? Math.min(4, Math.max(1, +(params.get('tier') || 3))) : 3];
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
    if (!a || alpha <= 0) return;   // a role can be empty (no league below bronze or above champion)
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
    drawSignatureBehind(f);
    drawConfetti(f, 0);   // half the confetti flies out from behind the trophy
    if (f < BURST) drawUnlocking(f);
    else drawUnlocked(f);
    drawConfetti(f, 1);
    drawImplosion(f, c);
    drawShockwave(f, c);
    drawSignature(f);
  }

  // Where the trophy in focus sits; its visual centre is what the effects aim at
  function focusPose(f) {
    if (f >= BURST) return [GREEN.x, GREEN.y, GREEN.s, art.open];
    const g = track('grey', Math.min(f, 120));
    const s = track('grey', Math.min(f, 100))[2];
    if (f <= 88) return [g[0], g[1], s, art.lock];
    // from here the swing does the tipping, so follow the base, not the box
    const x = keys([[88, track('grey', 88)[0]], ...SWING_X], f);
    return [x, g[1], s, art.lock];
  }
  // Anchor point and tilt for drawing the locked trophy swung about its base
  function swung(a, x, y, s, rot) {
    const b = (a.img.height - a.ay) * s * a.k;   // anchor to base
    return [x + b * Math.sin(rot), y + b - b * Math.cos(rot)];
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
    const shake = f < CHARGE_END ? keys([[CHARGE + 4, 0], [CHARGE + 22, 1.4], [CHARGE_END - 1, 5.5]], f) * FX.tremble : 0;
    if (shake && !reduced) {
      x += wob(f * 1.9, 1) * shake;
      y += wob(f * 2.3, 4) * shake * 0.6;
    }
    const rot = keys(SWING, f) + rattleTilt(f) + (f >= BREAK && f < BREAK + 10 ? 0.025 * Math.sin((f - BREAK) * 1.4) * (1 - ramp(f, BREAK, BREAK + 10)) : 0);
    [x, y] = swung(art.lock, x, y, s, rot);
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
  function drawPadlock(f, x, y, s, rot, brk = BREAK) {
    const pl = SET.padlock;
    if (f > brk + 40) return;
    let [cx, cy] = spot(art.lock, x, y, s, pl.x, pl.y, rot);
    const size = pl.size * art.lock.img.width * s * art.lock.k;
    let ang = rot, alpha = 1;
    const t = f - (brk + 5);
    if (t > 0) {
      cx += -2.2 * t;
      cy += -11 * t + 0.55 * t * t;
      ang += -0.07 * t;
      alpha = 1 - ramp(t, 16, 30);
    }
    const lift = f < brk ? 0 : easeOut(ramp(f, brk, brk + 4)) * 3.2;
    const swing = f < brk ? 0 : easeOut(ramp(f, brk + 1, brk + 7)) * -0.75;
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
    if (f >= brk && f < brk + 10) {
      const p = ramp(f, brk, brk + 10);
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
    sprite(art.open, x, y, s, 1, { sx, sy });
    drawShine(r, x, y, s);
    if (FX.sig === 'polish') drawShine(r - 46, x, y, s);   // silver: polished twice
  }

  // ---------- signatures: one per promotion ----------
  // A little gold crown (champion confetti, and the ribbon's ends)
  function drawCrown(x, y, w) {
    const h = w * 0.7;
    ctx.fillStyle = '#ffc800';
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y + h / 2);
    ctx.lineTo(x - w / 2, y - h / 2);
    ctx.lineTo(x - w / 4, y);
    ctx.lineTo(x, y - h / 2);
    ctx.lineTo(x + w / 4, y);
    ctx.lineTo(x + w / 2, y - h / 2);
    ctx.lineTo(x + w / 2, y + h / 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#e0a800';
    ctx.fillRect(x - w / 2, y + h / 2 - h * 0.22, w, h * 0.22);
  }

  // Gold: coins burst from behind the badge, flip through the air, land on
  // the floor under it and bounce
  const coins = (() => {
    const r = rng(83);
    const list = [];
    for (let i = 0; i < 16; i++) {
      const side = i % 2 ? 1 : -1;
      list.push({ vx: side * (2 + r() * 7), vy: -(14 + r() * 9), spin: 0.25 + r() * 0.3, r: 20 + r() * 8, delay: r() * 6, x0: (r() - 0.5) * 120 });
    }
    return list;
  })();
  function coinAt(c, t, floor) {
    let x = c.x0, y = 0, vx = c.vx, vy = c.vy, bounced = 0;
    for (let i = 0; i < t; i++) {
      vy += 1.1;
      x += vx;
      y += vy;
      if (y > floor) {
        y = floor;
        vy = -vy * 0.42;
        vx *= 0.7;
        bounced++;
      }
    }
    return [x, y, bounced];
  }
  function drawCoins(f, [cx, cy], burst = BURST) {
    const floor = 330;   // a little below the badge's base
    for (const c of coins) {
      const t = f - burst - 2 - c.delay;
      if (t <= 0) continue;
      const [x, y, bounced] = coinAt(c, Math.floor(t), floor);
      const fade = 1 - ramp(t, 70, 90);
      if (fade <= 0) continue;
      const turn = bounced >= 2 ? 1 : Math.cos(t * c.spin);
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.translate(cx + x, cy + y);
      ctx.scale(Math.max(0.12, Math.abs(turn)), 1);
      ctx.fillStyle = '#e0a800';
      ctx.beginPath();
      ctx.arc(0, 4, c.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffc800';
      ctx.beginPath();
      ctx.arc(0, 0, c.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffe17a';
      ctx.lineWidth = c.r * 0.16;
      ctx.beginPath();
      ctx.arc(0, 0, c.r * 0.62, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  // Diamond: crystal shards thrown out from the badge, spinning as they slow
  const shards = (() => {
    const r = rng(97);
    const list = [];
    for (let i = 0; i < 14; i++) {
      list.push({ a: (i / 14) * Math.PI * 2 + r() * 0.3, d: 260 + r() * 220, len: 34 + r() * 26, spin: (r() - 0.5) * 0.25, delay: r() * 3 });
    }
    return list;
  })();
  function drawShards(f, [cx, cy]) {
    for (const s of shards) {
      const t = f - BURST - s.delay;
      if (t <= 0 || t > 46) continue;
      const p = 1 - Math.exp(-t / 8);
      const x = cx + Math.cos(s.a) * (150 + s.d * p), y = cy + Math.sin(s.a) * (150 + s.d * p) + t * t * 0.03;
      ctx.save();
      ctx.globalAlpha = 1 - ramp(t, 30, 46);
      ctx.translate(x, y);
      ctx.rotate(s.a + Math.PI / 2 + s.spin * t);
      const L = s.len, Wd = L * 0.42;
      ctx.fillStyle = '#a8e2ff';
      ctx.beginPath();
      ctx.moveTo(0, -L / 2); ctx.lineTo(Wd / 2, 0); ctx.lineTo(0, L / 2); ctx.lineTo(-Wd / 2, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(0, -L / 2); ctx.lineTo(Wd / 2, 0); ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  // Champion: flat fireworks pop one after another around the badge
  const FIREWORKS = [[190, 300, 10, '#8e4cf0', '#ffc800'], [700, 260, 22, '#ffc800', '#ff86c4'], [470, 170, 34, '#b58cff', '#ffffff'], [150, 560, 46, '#ffc800', '#8e4cf0'], [740, 560, 52, '#ff86c4', '#ffc800']];
  function drawFireworks(f, burst = BURST) {
    for (const [x, y, d, c1, c2] of FIREWORKS) {
      const t = f - burst - d;
      if (t < 0 || t > 40) continue;
      const p = t / 40;
      dot(x, y, 26 * (1 - ramp(t, 0, 8)) * Math.min(1, t / 3 + 0.3), c1);
      const r0 = lerp(20, 110, easeOut(p)), len = lerp(36, 6, p);
      rays(x, y, 12, r0, r0 + len, 7, [c1, c2], 1 - ramp(p, 0.7, 1));
      rays(x, y, 12, r0 * 0.55, r0 * 0.55 + len * 0.5, 5, [c2], 1 - ramp(p, 0.5, 0.9), Math.PI / 12);
    }
  }

  // Silver: a few bright glints on the badge's rim after the polish
  function drawGlintsOnRim(f, burst = BURST) {
    for (const [d, fx, fy, r] of [[24, 0.86, 0.18, 26], [34, 0.14, 0.55, 20], [44, 0.78, 0.86, 22]]) {
      const t = f - burst - d;
      if (t < 0 || t > 16) continue;
      const [x, y] = spot(art.open, GREEN.x, GREEN.y, GREEN.s, fx, fy);
      star(x, y, r * Math.sin(Math.PI * t / 16), '#ffffff');
      star(x, y, r * 0.55 * Math.sin(Math.PI * t / 16), SET.title);
    }
  }

  function drawSignatureBehind(f) {
    if (f < BURST) return;
    const c = spot(art.open, GREEN.x, GREEN.y, GREEN.s, 0.5, 0.5);
    if (FX.sig === 'coins') drawCoins(f, c);
    if (FX.sig === 'shards') drawShards(f, c);
    if (FX.sig === 'royal') { drawShards(f, c); drawFireworks(f); }
  }
  function drawSignature(f) {
    if (f < BURST) return;
    if (FX.sig === 'polish') drawGlintsOnRim(f);
  }

  // Every promotion's title sits on a ribbon banner in its league's colours,
  // with its own little ornaments: a coin for gold, gems for diamond, crowns
  // for champion. It unrolls from the middle.
  const BANNERS = {
    1: { main: '#8a9db5', dark: '#6b7f99', light: '#a9b9cc', deco: null },
    2: { main: '#f0a800', dark: '#c98a00', light: '#ffc845', deco: 'coin' },
    3: { main: '#1cb0f6', dark: '#1482bf', light: '#5cc8f8', deco: 'gem' },
    4: { main: '#8e4cf0', dark: '#6a2fc8', light: '#a46cf5', deco: 'crown' },
  };
  function drawBanner(f, open, y = 1012) {
    const b = BANNERS[TIER_N];
    if (!b || open <= 0) return false;
    ctx.save();
    ctx.translate(W / 2, y);
    ctx.font = '800 ' + FX.title + 'px ' + AR;
    ctx.direction = 'rtl';
    const tw = ctx.measureText(SET.leagueName).width;
    const w = (tw + 120) * Math.min(1.04, open), h = 120;
    ctx.fillStyle = b.dark;                                  // folded tails
    for (const side of [-1, 1]) {
      const x0 = side * (w / 2 - 20);
      ctx.beginPath();
      ctx.moveTo(x0, -h / 2 + 22);
      ctx.lineTo(x0 + side * 90, -h / 2 + 22);
      ctx.lineTo(x0 + side * 64, 22);
      ctx.lineTo(x0 + side * 90, h / 2 + 22);
      ctx.lineTo(x0, h / 2 + 22);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = b.main;
    roundRect(-w / 2, -h / 2, w, h, 18);
    ctx.fill();
    ctx.fillStyle = b.light;
    ctx.fillRect(-w / 2 + 14, -h / 2 + 10, w - 28, 10);
    ctx.restore();
    const d = 44 * clamp((open - 0.6) * 3);
    if (b.deco && d > 0) {
      for (const side of [-1, 1]) {
        const x = W / 2 + side * (w / 2 - 6), yy = y - h / 2 - 6;
        if (b.deco === 'crown') drawCrown(x, yy, d);
        else if (b.deco === 'coin') { dot(x, yy + 3, d * 0.42, '#c98a00'); dot(x, yy, d * 0.42, '#ffc800'); dot(x, yy, d * 0.24, '#ffe17a'); }
        else {
          ctx.fillStyle = '#a8e2ff';
          ctx.beginPath();
          ctx.moveTo(x, yy - d * 0.5); ctx.lineTo(x + d * 0.32, yy); ctx.lineTo(x, yy + d * 0.5); ctx.lineTo(x - d * 0.32, yy);
          ctx.closePath();
          ctx.fill();
        }
      }
    }
    return true;
  }

  // ---------- per-promotion flows (silver, gold, champion) ----------
  const flowConfetti = TIER_N === 1 ? makeConfetti(5, T1.flip[1], FX.confetti, FX.colors)
    : TIER_N === 2 ? makeConfetti(6, T2.land, FX.confetti, FX.colors)
      : TIER_N === 4 ? makeConfetti(8, T4.impact, FX.confetti, FX.colors) : [];
  if (TIER_N === 4) flowConfetti.forEach((c, i) => { c.crown = i % 6 === 0; });

  // Silver: the padlock flies off, the badge flips over to silver like a card
  // and bounces; it gets polished twice
  function drawSilver(f) {
    neighbours(f, T1.flip[1]);
    const l = lockPose();
    drawPadlock(f, l.x, l.y, l.s, 0, BREAK);
    const c = centreOf();
    drawConfettiList(flowConfetti, T1.flip[1], f, 0, c);
    const u = ramp(f, T1.flip[0], T1.flip[1]);
    const face = Math.max(0.02, Math.abs(Math.cos(Math.PI * u)));
    if (u < 0.5) {
      sprite(art.lock, l.x, l.y, l.s, 1, { sx: face });
    } else {
      const o = openPose(f, T1.flip[0], T1.flip[1]);
      const pop = 1 + 0.16 * (1 - spring(f - T1.flip[1], 2.6, 0.35));
      sprite(art.open, o.x, o.y, o.s * pop, 1, { sx: face });
      drawShine(f - T1.flip[1] + 136, o.x, o.y, o.s * pop);
      drawShine(f - T1.flip[1] + 136 - 46, o.x, o.y, o.s * pop);
    }
    drawConfettiList(flowConfetti, T1.flip[1], f, 1, c);
    drawGlintsOnRim(f, T1.flip[1]);
  }

  // Gold: flipped like a coin. It rises spinning faster and faster, turns gold
  // edge-on in mid-air, drops and lands with a thud; coins scatter and bounce
  function drawGold(f) {
    neighbours(f, T2.land);
    const l = lockPose();
    drawPadlock(f, l.x, l.y, l.s, 0, BREAK);
    const c = centreOf();
    drawCoins(f, c, T2.land);
    drawConfettiList(flowConfetti, T2.land, f, 0, c);
    const turns = 5;
    const p = ramp(f, T2.rise[0], T2.land);
    const phi = turns * 2 * Math.PI * (p < 1 ? p * p * (3 - 2 * p) : 1);
    const lift = -150 * easeOut(ramp(f, T2.rise[0], T2.rise[1])) * (1 - ramp(f, T2.fall[0], T2.fall[1]) ** 2);
    const gold = phi >= (turns - 0.5) * 2 * Math.PI - Math.PI / 2;   // switches while edge-on
    const sx = f < T2.land ? Math.max(0.03, Math.abs(Math.cos(phi))) : keys([[T2.land, 1.22], [T2.land + 4, 0.94], [T2.land + 8, 1.03], [T2.land + 12, 1]], f);
    const sy = f < T2.land ? 1 : keys([[T2.land, 0.8], [T2.land + 4, 1.08], [T2.land + 8, 0.98], [T2.land + 12, 1]], f);
    if (!gold) {
      sprite(art.lock, l.x, l.y + lift, l.s, 1, { sx, sy });
    } else {
      const o = openPose(f, T2.fall[0], T2.land);
      sprite(art.open, o.x, o.y + lift, o.s, 1, { sx, sy });
      if (f >= T2.land) drawShine(f - T2.land + 134, o.x, o.y, o.s);
    }
    drawConfettiList(flowConfetti, T2.land, f, 1, c);
  }

  // Champion: a coronation. Lilac floods out from the badge with turning rays;
  // the badge rises; a big gold crown falls from the top and slams onto it; on
  // impact it turns champion purple with a flash, fireworks and crowns of
  // confetti, then settles wearing the crown
  function drawBigCrown(x, y, w, rot = 0) {
    const h = w * 0.62;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.fillStyle = '#e0a800';
    roundRect(-w / 2, -h * 0.05, w, h * 0.32, h * 0.08);     // band, darker underside
    ctx.fill();
    ctx.fillStyle = '#ffc800';
    ctx.beginPath();
    ctx.moveTo(-w / 2, h * 0.2);
    ctx.lineTo(-w / 2, -h * 0.62);
    ctx.lineTo(-w / 4, -h * 0.18);
    ctx.lineTo(0, -h * 0.8);
    ctx.lineTo(w / 4, -h * 0.18);
    ctx.lineTo(w / 2, -h * 0.62);
    ctx.lineTo(w / 2, h * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffe17a';
    ctx.fillRect(-w / 2, -h * 0.02, w, h * 0.06);
    for (const [px, py] of [[-w / 2, -h * 0.62], [0, -h * 0.8], [w / 2, -h * 0.62]]) dot(px, py, w * 0.055, '#ffc800');
    [['#ff4b4b', -w * 0.28], ['#1cb0f6', 0], ['#58cc02', w * 0.28]].forEach(([col, gx]) => dot(gx, h * 0.1, w * 0.05, col));
    ctx.restore();
  }
  function champBadgePose(f) {
    const l = lockPose();
    const up = -140 * easeOut(ramp(f, T4.lift[0], T4.lift[1]));
    const bob = f > T4.lift[1] && f < T4.impact ? Math.sin((f - T4.lift[1]) * 0.25) * 4 : 0;
    const down = spring(f - T4.settle[0], 1.8, 0.5);
    const o = f < T4.impact ? null : openPose(f, T4.impact, T4.settle[1]);
    const base = o || { x: l.x, y: l.y, s: l.s * art.lock.k / art.open.k };
    const y = base.y + (f < T4.settle[0] ? up + bob : up * (1 - down));
    return { x: base.x, y, s: base.s };
  }
  function drawChampion(f) {
    const c0 = spot(art.open, GREEN.x, GREEN.y, GREEN.s, 0.5, 0.5);
    // lilac flood and rays (behind everything)
    const wipe = easeInOut(ramp(f, T4.wipe[0], T4.wipe[1]));
    if (wipe > 0) {
      ctx.fillStyle = '#f1e7ff';
      ctx.beginPath();
      ctx.arc(c0[0], c0[1], wipe * 1700, 0, Math.PI * 2);
      ctx.fill();
      const ri = clamp(spring(f - T4.wipe[0] - 6, 1.6, 0.5));
      ctx.save();
      ctx.translate(c0[0], c0[1]);
      ctx.rotate((f - T4.wipe[0]) * 0.006);
      ctx.scale(ri, ri);
      ctx.fillStyle = '#e4d3ff';
      ctx.beginPath();
      for (let i = 0; i < 14; i++) {
        const t = (i / 14) * Math.PI * 2;
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, 1100, t - 0.1, t + 0.1);
      }
      ctx.fill();
      ctx.restore();
    }
    neighbours(f, T4.impact);
    const l = lockPose();
    drawPadlock(f, l.x, l.y, l.s, 0, BREAK);
    const pose = champBadgePose(f);
    const [cx, cy] = spot(art.open, pose.x, pose.y, pose.s, 0.5, 0.5);
    drawFireworks(f, T4.impact - 4);
    drawShards(f - (T4.impact - BURST), [cx, cy]);
    drawConfettiList(flowConfetti, T4.impact, f, 0, [cx, cy]);
    // the badge: grey and trembling while the crown falls, purple from the impact
    const tremble = reduced || f >= T4.impact ? 0 : 3 * ramp(f, T4.crown[0], T4.impact);
    const x = pose.x + wob(f * 2.6, 3) * tremble;
    const sq = f < T4.impact ? null : {
      sx: keys([[T4.impact, 1.24], [T4.impact + 4, 0.92], [T4.impact + 8, 1.04], [T4.impact + 12, 1]], f),
      sy: keys([[T4.impact, 0.78], [T4.impact + 4, 1.1], [T4.impact + 8, 0.97], [T4.impact + 12, 1]], f),
    };
    if (f < T4.impact) sprite(art.lock, x, pose.y, pose.s * art.open.k / art.lock.k, 1);
    else {
      sprite(art.open, x, pose.y, pose.s, 1, sq);
      sprite(art.white, x, pose.y, pose.s * art.open.k / art.lock.k, 1 - ramp(f, T4.impact, T4.impact + 12), sq);
      drawShine(f - T4.impact + 128, x, pose.y, pose.s);
    }
    // the crown: falls, slams on, sits slightly tilted
    const [tx, ty] = spot(art.open, x, pose.y, pose.s * (sq ? sq.sy : 1), 0.5, 0);
    const fall = ramp(f, T4.crown[0], T4.impact) ** 2.2;
    if (f >= T4.crown[0]) {
      const cyTop = lerp(OY - 260, ty - 20, fall);
      const k = f < T4.impact ? 1 : keys([[T4.impact, 1.18], [T4.impact + 5, 0.94], [T4.impact + 10, 1]], f);
      const rot = f < T4.impact ? 0.3 * (1 - fall) : -0.12 * spring(f - T4.impact, 1.6, 0.35);
      drawBigCrown(tx, cyTop, 250 * k, rot);
    }
    drawConfettiList(flowConfetti, T4.impact, f, 1, [cx, cy]);
    // shockwaves
    for (const [d, r1, w0, col] of [[0, 1000, 40, '#8e4cf0'], [4, 820, 18, '#ffc800'], [9, 640, 12, '#b58cff']]) {
      const p = ramp(f, T4.impact + d, T4.impact + d + 28);
      if (f < T4.impact + d || p >= 1) continue;
      ctx.globalAlpha = 0.9 * (1 - p) ** 1.4;
      ctx.strokeStyle = col;
      ctx.lineWidth = lerp(w0, 2, p);
      ctx.beginPath();
      ctx.arc(cx, cy, lerp(160, r1, easeOut(p)), 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
  function flowShake(f) {
    if (reduced) return [0, 0];
    let amp = keys([[BREAK - 1, 0], [BREAK, 4], [BREAK + 8, 0]], f);
    if (TIER_N === 2) amp += keys([[T2.land - 1, 0], [T2.land, 10], [T2.land + 16, 0]], f);
    if (TIER_N === 4) amp += keys([[T4.impact - 1, 0], [T4.impact, 26], [T4.impact + 8, 14], [T4.impact + 36, 0]], f);
    amp += keys([[TITLE + 2, 0], [TITLE + 3, TIER_N === 4 ? 9 : 5], [TITLE + 12, 0]], f);
    return [wob(f * 2.9, 2) * amp, wob(f * 3.4, 7) * amp];
  }
  function drawFlowFlash(f) {
    if (TIER_N !== 4) return;
    const a = keys([[T4.impact - 1, 0], [T4.impact, 0.95], [T4.impact + 3, 0.7], [T4.impact + 14, 0]], f) * (reduced ? 0.35 : 1);
    if (a <= 0) return;
    ctx.globalAlpha = a;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, OY, W, H);
    ctx.globalAlpha = 1;
  }

  // ---------- burst and charge effects ----------
  // The room dims around the trophy while it charges; the flash clears it
  function drawVignette(f, [cx, cy]) {
    const a = keys([[CHARGE - 6, 0], [CHARGE_END, FX.vignette], [BURST, FX.vignette], [BURST + 1, 0]], f);
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
    for (let i = 0; i < FX.motes; i++) {
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
      [BURST, 26, 150, 860, 36, SET.glow], [BURST + 4, 26, 130, 620, 14, SET.glow], [BURST + 9, 30, 120, 1000, 22, SET.title],
    ].slice(0, FX.shocks)) {
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

  function drawFlash(f) {
    const a = keys([[BURST - 1, 0], [BURST, 1], [BURST + 3, 0.75], [BURST + 14, 0]], f) * FX.flash * (reduced ? 0.35 : 1);
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
      + keys([[BURST - 1, 0], [BURST, 18], [BURST + 6, 10], [BURST + 26, 0]], f) * FX.shake
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
    // Timed to the recording (frames): a wide "/" band sweeps top-left to
    // bottom-right (139-158), thin lines trail it and split in two (146-172),
    // the centre facet flashes (151-160), then an X glint pops and shrinks.
    const d = (t) => lerp(-0.2, 1.45, t) * (w + bookBottom);
    const bands = [
      [d(ramp(f, 139, 160)), 0.2, keys([[138, 0], [141, 0.75], [153, 0.75], [158, 0]], f)],
      [d(ramp(f, 144, 172)) - 0.27 * w, 0.04, keys([[145, 0], [148, 0.9], [166, 0.9], [172, 0]], f)],
      [d(ramp(f, 150, 174)) - 0.39 * w, 0.035, keys([[158, 0], [161, 0.85], [168, 0.85], [174, 0]], f)],
    ];
    for (const [c, bw, alpha] of bands) {
      if (alpha <= 0) continue;
      g.globalAlpha = alpha;
      g.beginPath();
      g.moveTo(c - bw * w, 0);
      g.lineTo(c, 0);
      g.lineTo(c - bookBottom, bookBottom);
      g.lineTo(c - bookBottom - bw * w, bookBottom);
      g.closePath();
      g.fill();
    }
    // centre facet flash
    const cf = keys([[150, 0], [152, 0.9], [157, 0.9], [161, 0]], f);
    if (cf > 0) {
      g.globalAlpha = cf;
      g.beginPath();
      if (sh.facetPoly) {
        sh.facetPoly.forEach(([px, py], i) => g[i ? 'lineTo' : 'moveTo'](px * w, py * h));
      } else {
        const [fx, fy, rx, ry] = sh.facet;
        for (let i = 0; i < 5; i++) {
          const ang = -Math.PI / 2 + (i / 5) * Math.PI * 2;
          g[i ? 'lineTo' : 'moveTo'](fx * w + Math.cos(ang) * rx * w, fy * h + Math.sin(ang) * ry * h);
        }
      }
      g.closePath();
      g.fill();
    }
    g.restore();
    g.globalCompositeOperation = 'destination-in';
    g.drawImage(img, 0, 0);
    g.globalCompositeOperation = 'source-over';
    sprite({ ...art.open, img: shineCanvas }, x, y, s);

    // the X glint: pops big, becomes a little diamond with a cross, shrinks
    // to a dot (and a knob glint, for the books)
    const sc = s * art.open.k;
    const ox = x - art.open.ax * sc, oy = y - art.open.ay * sc;
    const gr = keys([[158, 0], [160, 0.05], [162, 0.11], [165, 0.09], [168, 0.07], [171, 0.05], [174, 0.03], [177, 0.012], [179, 0]], f) * w * sc;
    if (gr > 0.5) {
      const gx = ox + sh.cross[0] * w * sc, gy = oy + sh.cross[1] * h * sc;
      ctx.save();
      ctx.translate(gx, gy);
      ctx.rotate(Math.PI / 4);
      ctx.strokeStyle = '#ffffff';
      ctx.lineCap = 'round';
      ctx.lineWidth = Math.max(2, gr * 0.22);
      ctx.beginPath();
      ctx.moveTo(-gr, 0);
      ctx.lineTo(gr, 0);
      ctx.moveTo(0, -gr);
      ctx.lineTo(0, gr);
      ctx.stroke();
      const sq = keys([[162, 0], [164, 0.5], [167, 0.5], [169, 0]], f);
      if (sq > 0) {
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-gr * sq, -gr * sq, gr * sq * 2, gr * sq * 2);
      }
      ctx.restore();
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
    for (let i = 0; i < FX.confetti; i++) {
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
        color: FX.colors[i % FX.colors.length],
        crown: FX.sig === 'royal' && i % 6 === 0,   // little gold crowns among the champion's confetti
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
      if (c.crown) {
        ctx.scale(Math.cos(c.flip + c.flipRate * t), 1);
        drawCrown(0, 0, c.w * 0.9);
      } else {
        ctx.scale(1, Math.cos(c.flip + c.flipRate * t));
        ctx.fillStyle = c.color;
        ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
      }
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
  // level 1: just the twinkles; level 2: the crosses, poppers and specks too
  function drawSparkles(f, level = 2) {
    if (f < 124) return;
    const blue = '#a6e4fb';
    twinkle(f, 336, 190, 340, 292, 126, 184, 46, blue);
    twinkle(f, 118, 440, 118, 452, 124, 178, 28, blue);
    twinkle(f, 694, 458, 697, 512, 134, 186, 29, blue);
    twinkle(f, 168, 425, 170, 460, 186, 234, 56, blue);
    if (level < 2) return;
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
    const open = TIER_N === 2
      ? 1                                                   // gold's banner drops in whole
      : spring(f - TITLE + 2, 2.2, 0.45);
    let by = 1012, swing = 0;
    if (TIER_N === 2) {                                     // falls from the top and swings to rest
      const t = f - TITLE + 2;
      by = lerp(OY - 120, 1012, spring(t, 1.6, 0.55));
      swing = 0.22 * Math.exp(-t / 14) * Math.cos(t * 0.32);
    }
    ctx.save();
    ctx.translate(0, by - 1012);
    ctx.translate(W / 2, 1012); ctx.rotate(swing); ctx.translate(-W / 2, -1012);
    const onRibbon = drawBanner(f, open, 1012);
    ctx.save();
    ctx.globalAlpha = ramp(f, TITLE, TITLE + 2);
    ctx.translate(W / 2, 1012);
    ctx.scale(k, k);
    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '800 ' + FX.title + 'px ' + AR;
    ctx.fillStyle = onRibbon ? '#ffffff' : SET.title;
    ctx.fillText(SET.leagueName, 0, 0);
    ctx.restore();
    ctx.restore();
    const p = easeOut(ramp(f, TITLE + 8, TITLE + 22));
    if (p > 0) {
      ctx.save();
      ctx.globalAlpha = p;
      ctx.translate(0, (1 - p) * 18);
      caption([[['تهانينا! تقدّمت إلى مستوى جديد هذا الأسبوع', 700]]], SET === SETS.ranks ? 1140 : 1098, 0, p, 38);
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
    if (BOLD) return drawBoldUI(f);
    if (INKY) return drawInkUI(f);
    if (SPARK) return drawSparkUI(f);
    if (HYPE) return drawHypeUI(f);
    drawTitle(f);
    const b = ramp(f, TITLE + 18, TITLE + 30);
    drawButton(true, b, b >= 1 ? 0.012 * (1 - Math.cos((f - TITLE - 30) * 0.08)) : 0);
  }

  // ---------- bold ----------
  // Flat and bright like the rest of the screen: no glows, no dark. Strength
  // comes from timing: a wind-up, a fill you can watch, one big pop.
  const LIGHT = SET === SETS.ranks ? '#dff3ff' : '#e6f8d4';   // light tint of the league colour
  const BOLD_CONFETTI = ['#58cc02', '#1cb0f6', '#ffc800', '#ff4b4b', '#ce82ff', '#ff9600'];
  function makeConfetti(seed, burst, n, colors) {
    const r = rng(seed);
    const list = [];
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (r() - 0.5) * Math.PI * 1.35;
      const v = 26 + r() * 28;
      const front = i % 3 === 0;   // the ones in front start at the badge's edge, not on its face
      list.push({
        f0: burst + r() * 3,
        x: front ? Math.cos(a) * 190 : (r() - 0.5) * 160, y: front ? Math.sin(a) * 170 : (r() - 0.5) * 140,
        vx: Math.cos(a) * v * 1.15, vy: Math.sin(a) * v,
        w: 22 + r() * 14, h: 12 + r() * 8,
        rot: r() * Math.PI * 2, spin: (r() - 0.5) * 0.3,
        flip: r() * Math.PI * 2, flipRate: 0.12 + r() * 0.18, sway: r() * Math.PI * 2,
        color: colors[i % colors.length], layer: front ? 1 : 0,
      });
    }
    return list;
  }
  const boldConfetti = makeConfetti(17, BD.pop, 80, BOLD_CONFETTI);

  // The badge from the snap to the pop: same spot as the grey one, easing onto
  // the final placement while it fills
  function boldPose(f) {
    const [x0, y0, s0] = focusPose(Math.min(f, 140));
    const sOpen = s0 * art.lock.k / art.open.k;   // same on-screen size in the open art
    const p = easeInOut(ramp(f, BD.fill, BD.pop));
    return { x: lerp(x0, GREEN.x, p), y: lerp(y0, GREEN.y, p), s: lerp(sOpen, GREEN.s, p) };
  }
  // Squash and stretch: squat during the wind-up, rise while filling, then the pop
  function boldSquash(f) {
    const sy = keys([[BD.squash, 1], [BD.squash + 9, 0.86], [BD.fill, 0.88], [BD.pop - 6, 1.05], [BD.pop - 1, 1.02],
      [BD.pop, 1.22], [BD.pop + 4, 0.9], [BD.pop + 8, 1.05], [BD.pop + 12, 0.98], [BD.pop + 16, 1]], f);
    const sx = keys([[BD.squash, 1], [BD.squash + 9, 1.1], [BD.fill, 1.08], [BD.pop - 6, 0.97], [BD.pop - 1, 0.99],
      [BD.pop, 1.18], [BD.pop + 4, 1.06], [BD.pop + 8, 0.97], [BD.pop + 12, 1.01], [BD.pop + 16, 1]], f);
    const k = keys([[BD.pop - 1, 1], [BD.pop, 1.25], [BD.pop + 5, 0.95], [BD.pop + 10, 1.03], [BD.pop + 15, 1]], f);
    return { sx: sx * k, sy: sy * k };
  }

  // The league colour rising through the grey badge, with a wavy white edge
  let fillCanvas = null;
  function filledBadge(f) {
    const img = art.open.img, w = img.width, h = img.height;
    if (!fillCanvas) {
      fillCanvas = document.createElement('canvas');
      fillCanvas.width = w;
      fillCanvas.height = h;
    }
    const g = fillCanvas.getContext('2d');
    g.clearRect(0, 0, w, h);
    const t = ramp(f, BD.fill, BD.pop - 2);
    const p = lerp(t, easeInOut(t), 0.5);   // steady, so you can watch it rise
    const level = lerp(h + 14, -14, p);
    const wave = (x) => level + Math.sin(x * 0.07 + f * 0.5) * 6 * (1 - p * 0.6);
    g.drawImage(img, 0, 0);
    g.globalCompositeOperation = 'destination-in';
    g.beginPath();
    g.moveTo(0, h);
    for (let x = 0; x <= w; x += 4) g.lineTo(x, wave(x));
    g.lineTo(w, h);
    g.closePath();
    g.fill();
    g.globalCompositeOperation = 'source-atop';
    g.strokeStyle = 'rgba(255,255,255,0.9)';
    g.lineWidth = 7;
    g.beginPath();
    for (let x = 0; x <= w; x += 4) g[x ? 'lineTo' : 'moveTo'](x, wave(x) + 3);
    g.stroke();
    g.globalCompositeOperation = 'source-over';
    return fillCanvas;
  }

  // Flat sunburst behind the badge in a light tint of the league colour
  function sunburst(cx, cy, f) {
    if (f < BD.pop) return;
    const k = keys([[BD.pop, 0.3], [BD.pop + 8, 1.08], [BD.pop + 14, 1]], f);
    const rot = (f - BD.pop) * 0.006;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.scale(k, k);
    ctx.fillStyle = LIGHT;
    ctx.beginPath();
    const n = 12;
    for (let i = 0; i < n; i++) {
      const t = (i / n) * Math.PI * 2;
      ctx.moveTo(Math.cos(t - 0.12) * 120, Math.sin(t - 0.12) * 120);
      ctx.lineTo(Math.cos(t - 0.09) * 620, Math.sin(t - 0.09) * 620);
      ctx.arc(0, 0, 620, t - 0.09, t + 0.09);
      ctx.lineTo(Math.cos(t + 0.12) * 120, Math.sin(t + 0.12) * 120);
    }
    ctx.fill();
    ctx.restore();
  }
  // One flat disc and one ring thrown out by the pop
  function popRings(cx, cy, f) {
    const p = ramp(f, BD.pop, BD.pop + 20);
    if (f < BD.pop || p >= 1) return;
    ctx.globalAlpha = (1 - p) * 0.9;
    ctx.fillStyle = LIGHT;
    ctx.beginPath();
    ctx.arc(cx, cy, lerp(150, 430, easeOut(p)), 0, Math.PI * 2);
    ctx.fill();
    const q = ramp(f, BD.pop + 2, BD.pop + 24);
    if (q > 0 && q < 1) {
      ctx.globalAlpha = 1 - q;
      ctx.strokeStyle = SET.title;
      ctx.lineWidth = lerp(16, 2, q);
      ctx.beginPath();
      ctx.arc(cx, cy, lerp(170, 620, easeOut(q)), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  // The neighbours hop when the new league pops
  const hop = (f, delay) => keys([[BD.pop + delay, 0], [BD.pop + delay + 6, -34], [BD.pop + delay + 12, 0], [BD.pop + delay + 16, -9], [BD.pop + delay + 20, 0]], f);

  function drawBold(f) {
    const pose = boldPose(f);
    const sq = boldSquash(f);
    const [cx, cy] = spot(art.open, pose.x, pose.y, pose.s, 0.5, 0.5);
    sunburst(cx, cy, f);
    const red = track('red', f);
    sprite(art.cur, red[0], red[1] + hop(f, 2), red[2]);
    const next = track('next', f);
    if (next) sprite(art.after, next[0], next[1] + hop(f, 5), next[2]);
    popRings(cx, cy, f);
    // the padlock snaps open in front of the badge, then tumbles away behind it
    const base = focusPose(f);
    const lockInFront = f < BREAK + 12;
    if (!lockInFront) drawPadlock(f, base[0], base[1], base[2], 0);
    drawConfettiList(boldConfetti, BD.pop, f, 0, [cx, cy]);
    // the grey badge (shaking a little in the wind-up), the colour rising through it
    const tremble = reduced ? 0 : keys([[BD.squash + 4, 0], [BD.fill, 2.5], [BD.pop - 4, 3.5], [BD.pop - 1, 0]], f);
    const x = pose.x + wob(f * 2.4, 5) * tremble;
    if (f < BD.pop) {
      const ls = pose.s * art.open.k / art.lock.k;
      sprite(art.lock, x, pose.y, ls, 1, sq);
      if (f >= BD.fill) sprite({ ...art.open, img: filledBadge(f) }, x, pose.y, pose.s, 1, sq);
    } else {
      sprite(art.open, x, pose.y, pose.s, 1, sq);
      drawShine(f - BD.pop + 133, x, pose.y, pose.s);
    }
    if (lockInFront) drawPadlock(f, base[0], base[1], base[2], 0);
    drawConfettiList(boldConfetti, BD.pop, f, 1, [cx, cy]);
  }

  // A pill in the league colour, popping in above the badge
  function drawPill(f) {
    if (f < BD.pill) return;
    const k = keys([[BD.pill, 0], [BD.pill + 5, 1.18], [BD.pill + 9, 0.94], [BD.pill + 13, 1]], f);
    const text = 'دوري جديد!';
    ctx.save();
    ctx.translate(W / 2, 318);
    ctx.scale(k, k);
    ctx.font = '800 38px ' + AR;
    ctx.direction = 'rtl';
    const tw = ctx.measureText(text).width;
    const w = tw + 76, h = 70;
    roundRect(-w / 2, -h / 2, w, h + 6, h / 2);
    ctx.fillStyle = shade(SET.title);
    ctx.fill();
    roundRect(-w / 2, -h / 2, w, h, h / 2);
    ctx.fillStyle = SET.title;
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 0, 3);
    ctx.restore();
  }
  // darker lip for the flat pill, like the buttons
  function shade(hex) {
    const n = parseInt(hex.slice(1), 16);
    const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v * 0.8));
    return 'rgb(' + c.join(',') + ')';
  }

  // All the leagues in a row; the bar climbs from the old league to the new one
  function drawLadder(f) {
    if (!SET.ladder || f < BD.ladder) return;
    const a = easeOut(ramp(f, BD.ladder, BD.ladder + 12));
    const n = SET.ladder.length, gap = 156, y = 1262 + (1 - a) * 30;
    const xs = SET.ladder.map((_, i) => W / 2 + (i - (n - 1) / 2) * gap);
    const from = SET.ladderFrom, to = from + 1;
    const climb = easeInOut(ramp(f, BD.climb, BD.arrive));
    const reach = lerp(xs[from], xs[to], climb);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.lineCap = 'round';
    ctx.lineWidth = 14;
    ctx.strokeStyle = '#e5e5e5';
    ctx.beginPath();
    ctx.moveTo(xs[0], y);
    ctx.lineTo(xs[n - 1], y);
    ctx.stroke();
    ctx.strokeStyle = SET.title;
    ctx.beginPath();
    ctx.moveTo(xs[0], y);
    ctx.lineTo(reach, y);
    ctx.stroke();
    SET.ladder.forEach((roles, i) => {
      const done = i < to || (i === to && f >= BD.arrive);
      const role = done ? roles[0] : roles[1];
      let k = 1;
      if (i === to) k = keys([[BD.arrive - 1, 1], [BD.arrive, 1.45], [BD.arrive + 5, 0.92], [BD.arrive + 10, 1.06], [BD.arrive + 14, 1]], f);
      const mini = art[role];
      const s = (i === to && f >= BD.arrive ? 0.42 : 0.36) * 242 / (mini.img.width * mini.k) * k;
      const [mx, my] = [xs[i], y];
      // centre the mini badge on the bar
      sprite(mini, mx, my + (mini.ay - mini.img.height / 2) * s * mini.k, s);
    });
    ctx.restore();
  }

  function drawBoldUI(f) {
    drawPill(f);
    if (f >= BD.title) {
      const k = keys([[BD.title, 1.9], [BD.title + 4, 0.9], [BD.title + 7, 1.05], [BD.title + 10, 0.985], [BD.title + 13, 1]], f);
      ctx.save();
      ctx.globalAlpha = ramp(f, BD.title, BD.title + 2);
      ctx.translate(W / 2, 1000);
      ctx.scale(k, k);
      ctx.direction = 'rtl';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '800 80px ' + AR;
      ctx.fillStyle = SET.title;
      ctx.fillText(SET.leagueName, 0, 0);
      ctx.restore();
    }
    const p = easeOut(ramp(f, BD.sub, BD.sub + 14));
    if (p > 0) {
      ctx.save();
      ctx.translate(0, (1 - p) * 18);
      caption([[['تهانينا! تقدّمت إلى مستوى جديد هذا الأسبوع', 700]]], 1098, 0, p, 38);
      ctx.restore();
    }
    drawLadder(f);
    const b = ramp(f, BD.button, BD.button + 12);
    drawButton(true, b, b >= 1 ? 0.012 * (1 - Math.cos((f - BD.button - 12) * 0.08)) : 0);
  }

  function boldShake(f) {
    if (reduced) return [0, 0];
    const amp = keys([[BREAK - 1, 0], [BREAK, 4], [BREAK + 8, 0]], f)
      + keys([[BD.pop - 1, 0], [BD.pop, 14], [BD.pop + 5, 7], [BD.pop + 20, 0]], f)
      + keys([[BD.title + 2, 0], [BD.title + 3, 5], [BD.title + 12, 0]], f);
    return [wob(f * 2.9, 2) * amp, wob(f * 3.4, 7) * amp];
  }

  // ---------- ink ----------
  // No particles or glow: everything is done by one blue pencil, as if on a
  // worksheet. It erases the locked trophy with its eraser end (crumbs fall),
  // flips, traces the new trophy's outline, colours it in with back-and-forth
  // strokes that reveal the real art, circles it like a marked answer, ticks
  // it, and writes the league name right to left.
  const PEN_LEN = 214, PEN_SCALE = 1.4, PEN_HALF = (PEN_LEN * PEN_SCALE) / 2;
  const WRITE_ANG = -1.0;                     // from the tip, the pencil body points up and to the right
  const dir = (a) => [Math.cos(a), Math.sin(a)];

  // Polyline helpers: cumulative lengths, a point at a distance, a partial path
  function measure(pts) {
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    return cum;
  }
  function pointAt(pts, cum, d) {
    d = clamp(d, 0, cum[cum.length - 1]);
    let i = 1;
    while (i < cum.length - 1 && cum[i] < d) i++;
    const t = (d - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1]);
    return [lerp(pts[i - 1][0], pts[i][0], t), lerp(pts[i - 1][1], pts[i][1], t)];
  }
  function partial(g, pts, cum, d) {
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length && cum[i] <= d; i++) g.lineTo(pts[i][0], pts[i][1]);
    const [x, y] = pointAt(pts, cum, d);
    g.lineTo(x, y);
  }
  // Back-and-forth strokes covering a box (fractions of the image), slightly sloped
  function zigzag(rows, slope) {
    const pts = [];
    for (let i = 0; i < rows; i++) {
      const y = 0.02 + ((i + 0.5) / rows) * 0.96;
      const a = [-0.06, y - slope], b = [1.06, y + slope];
      if (i % 2) pts.push(b, a);
      else pts.push(a, b);
    }
    return pts;
  }
  const ERASE_ROWS = 6, COLOR_ROWS = 8;
  const erasePts = zigzag(ERASE_ROWS, 0.035), colorPts = zigzag(COLOR_ROWS, 0.025);

  // Map image fractions to screen points for a sprite placed at (x, y, s)
  const toScreen = (a, x, y, s, pts) => pts.map(([fx, fy]) => [x + (fx * a.img.width - a.ax) * s * a.k, y + (fy * a.img.height - a.ay) * s * a.k]);

  // The trophy's place during the ink work (after the swing settles), and the
  // open art at the same size; it eases onto the final spot at the pop
  function inkLockPose() {
    const [x, y, s] = focusPose(127);
    return { x, y, s };
  }
  function inkOpenPose(f) {
    const l = inkLockPose();
    const s0 = l.s * art.lock.k / art.open.k;
    const p = easeInOut(ramp(f, INK.pop - 6, INK.pop));
    return { x: lerp(l.x, GREEN.x, p), y: lerp(l.y, GREEN.y, p), s: lerp(s0, GREEN.s, p) };
  }

  // Masks drawn at image resolution: the strokes so far, as a fat line
  const maskCanvases = new Map();
  function strokeMask(img, pts, rows, p) {
    let c = maskCanvases.get(img);
    if (!c) {
      c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      maskCanvases.set(img, c);
    }
    const g = c.getContext('2d');
    g.clearRect(0, 0, c.width, c.height);
    const px = pts.map(([fx, fy]) => [fx * img.width, fy * img.height]);
    const cum = measure(px);
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.lineWidth = (img.height / rows) * 1.3;
    g.strokeStyle = '#000';
    partial(g, px, cum, p * cum[cum.length - 1]);
    g.stroke();
    return c;
  }
  // The art cut by the mask: 'destination-in' keeps the stroked part,
  // 'destination-out' rubs it away
  const cutCanvases = new Map();
  function cut(img, mask, op) {
    let c = cutCanvases.get(op);
    if (!c || c.width !== img.width || c.height !== img.height) {
      c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      cutCanvases.set(op, c);
    }
    const g = c.getContext('2d');
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, c.width, c.height);
    g.drawImage(img, 0, 0);
    g.globalCompositeOperation = op;
    g.drawImage(mask, 0, 0);
    g.globalCompositeOperation = 'source-over';
    return c;
  }

  // Progress through a phase: quick start, steady middle, gentle finish
  const work = (f, [f0, f1]) => {
    const t = ramp(f, f0, f1);
    return lerp(t, easeInOut(t), 0.6);
  };

  // The paths the pencil follows in each phase, in screen space
  function inkPaths(f) {
    const l = inkLockPose(), o = inkOpenPose(Math.min(f, INK.pop - 7));
    const lockA = art.lockBaked;
    const shape = window.LEAGUE_SHAPES[SET.shape];
    const sketch = toScreen(art.open, o.x, o.y, o.s, [...shape, shape[0]]);
    const [cx, cy] = spot(art.open, GREEN.x, GREEN.y, GREEN.s, 0.5, 0.5);
    const loop = [];
    const turns = 1.1, a0 = -2.35;
    for (let i = 0; i <= 140; i++) {
      const t = i / 140, a = a0 + t * turns * Math.PI * 2;
      const r = 1 + 0.07 * t + 0.02 * Math.sin(3 * a + 0.6);
      loop.push([cx + Math.cos(a) * 278 * r, cy + Math.sin(a) * 292 * r]);
    }
    const tick = [[cx + 168, cy - 158], [cx + 204, cy - 116], [cx + 292, cy - 228]];
    return {
      erase: toScreen(lockA, l.x, l.y, l.s * art.lock.k / lockA.k, erasePts),
      sketch,
      color: toScreen(art.open, o.x, o.y, o.s, colorPts),
      loop,
      tick,
      centre: [cx, cy],
    };
  }

  function titleBox() {
    ctx.font = '800 80px ' + AR;
    ctx.direction = 'rtl';
    const tw = ctx.measureText(SET.leagueName).width;
    return { right: W / 2 + tw / 2, left: W / 2 - tw / 2, y: 1000 };
  }

  // Where the pencil is: its centre, the direction from tip to eraser, and how
  // high it is lifted off the page (for its shadow)
  function penState(f, P) {
    const atTip = (h, wob = 0) => ({ c: [h[0] + PEN_HALF * Math.cos(WRITE_ANG), h[1] + PEN_HALF * Math.sin(WRITE_ANG)], a: WRITE_ANG + wob, lift: 0 });
    const atEraser = (h, wob = 0) => ({ c: [h[0] + PEN_HALF * Math.cos(WRITE_ANG), h[1] + PEN_HALF * Math.sin(WRITE_ANG)], a: WRITE_ANG + Math.PI + wob, lift: 0 });
    const at = (pts, p) => pointAt(pts, measure(pts), p * measure(pts)[pts.length - 1]);
    const tb = titleBox();
    const writeHead = (p) => [lerp(tb.right, tb.left, p), tb.y + 14 * Math.sin(p * 46) - 6];
    const phases = [
      { f: INK.erase, s: () => atEraser(at(P.erase, 0)), e: () => atEraser(at(P.erase, 1)), head: (p, f) => atEraser(at(P.erase, p), 0.05 * Math.sin(f * 1.3)) },
      { f: INK.sketch, s: () => atTip(at(P.sketch, 0)), e: () => atTip(at(P.sketch, 1)), head: (p, f) => atTip(at(P.sketch, p), 0.03 * Math.sin(f * 0.9)) },
      { f: INK.color, s: () => atTip(at(P.color, 0)), e: () => atTip(at(P.color, 1)), head: (p, f) => atTip(at(P.color, p), 0.06 * Math.sin(f * 1.6)) },
      { f: INK.circle, s: () => atTip(at(P.loop, 0)), e: () => atTip(at(P.loop, 1)), head: (p) => atTip(at(P.loop, p)) },
      { f: INK.check, s: () => atTip(P.tick[0]), e: () => atTip(P.tick[2]), head: (p) => atTip(at(P.tick, p)) },
      { f: INK.write, s: () => atTip(writeHead(0)), e: () => atTip(writeHead(1)), head: (p) => atTip(writeHead(p)) },
    ];
    const off = { c: [W + 260, OY - 260], a: WRITE_ANG + Math.PI, lift: 1 };
    // flying in
    if (f < INK.penIn[1]) {
      const p = easeOut(ramp(f, INK.penIn[0], INK.penIn[1]));
      return blend(off, phases[0].s(), p);
    }
    for (let i = 0; i < phases.length; i++) {
      const ph = phases[i];
      if (f >= ph.f[0] && f <= ph.f[1]) return ph.head(work(f, ph.f), f);
      const next = phases[i + 1];
      if (next && f > ph.f[1] && f < next.f[0]) {
        const p = easeInOut(ramp(f, ph.f[1], next.f[0]));
        return blend(ph.e(), next.s(), p);
      }
    }
    // flying out
    const last = phases[phases.length - 1].e();
    const p = easeInOut(ramp(f, INK.penOut[0], INK.penOut[1]));
    return blend(last, { c: [W + 260, OY - 200], a: WRITE_ANG - 0.8, lift: 1 }, p);
  }
  // Moves between two pencil states, rising off the page in the middle;
  // turning the long way round when it flips ends
  function blend(a, b, p) {
    return {
      c: [lerp(a.c[0], b.c[0], p), lerp(a.c[1], b.c[1], p)],
      a: lerp(a.a, b.a, p),
      lift: Math.max(lerp(a.lift, b.lift, p), Math.sin(Math.PI * p)),
    };
  }

  // The pencil, drawn flat in the screen's colours; it lies along +x from its tip
  function drawPencil(st) {
    if (!st) return;
    const [cx, cy] = st.c;
    const lift = st.lift || 0;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(st.a);
    ctx.translate(-PEN_HALF, 0);
    const k = PEN_SCALE * (1 + lift * 0.06);
    ctx.scale(k, k);
    ctx.shadowColor = 'rgba(60,60,60,' + (0.16 + 0.06 * lift) + ')';
    ctx.shadowBlur = (3 + 6 * lift) * scale;
    // shadow offsets ignore the transform, so it always falls down and right
    ctx.shadowOffsetX = (4 + 14 * lift) * scale;
    ctx.shadowOffsetY = (6 + 20 * lift) * scale;
    const shape = (fn) => { ctx.beginPath(); fn(); ctx.fill(); };
    ctx.fillStyle = '#f2cf9d';                                            // sharpened wood
    shape(() => { ctx.moveTo(10, -5); ctx.lineTo(40, -14); ctx.lineTo(40, 14); ctx.lineTo(10, 5); });
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = shade(SET.title);                                     // the lead
    shape(() => { ctx.moveTo(0, 0); ctx.lineTo(11, -5.5); ctx.lineTo(11, 5.5); });
    ctx.fillStyle = '#1cb0f6';                                            // body, three flat faces
    ctx.fillRect(40, -14, 132, 28);
    ctx.fillStyle = '#5cc8f8';
    ctx.fillRect(40, -14, 132, 8);
    ctx.fillStyle = '#1899d6';
    ctx.fillRect(40, 6, 132, 8);
    ctx.fillStyle = '#cfd4dc';                                            // ferrule
    ctx.fillRect(172, -14, 20, 28);
    ctx.fillStyle = '#aab2bf';
    ctx.fillRect(177, -14, 3, 28);
    ctx.fillRect(185, -14, 3, 28);
    ctx.fillStyle = '#ff9db8';                                            // eraser
    roundRect(190, -14, 24, 28, 7);
    ctx.fill();
    ctx.fillRect(190, -14, 8, 28);
    ctx.restore();
  }

  // Eraser crumbs: shed along the eraser's path, they drop and fade
  function drawCrumbs(f, P) {
    if (f < INK.erase[0] || f > INK.erase[1] + 40) return;
    const cum = measure(P.erase), len = cum[cum.length - 1];
    for (let k = INK.erase[0]; k <= Math.min(f, INK.erase[1]); k += 1.5) {
      const r = rng(Math.floor(k * 10));
      for (let j = 0; j < 2; j++) {
        const t = f - k;
        if (t > 38) continue;
        const [hx, hy] = pointAt(P.erase, cum, work(k, INK.erase) * len);
        const vx = (r() - 0.5) * 3.2, vy = -1 - r() * 2.5;
        const x = hx + vx * t, y = hy + vy * t + 0.35 * t * t;
        const sz = 6 + r() * 6;
        ctx.globalAlpha = 1 - ramp(t, 22, 38);
        ctx.fillStyle = r() < 0.6 ? '#ff9db8' : '#bfc4cc';
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(r() * 3 + t * 0.1);
        ctx.fillRect(-sz / 2, -sz / 2, sz, sz * 0.7);
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
  }

  function strokePath(pts, d, width, color, alpha = 1) {
    if (alpha <= 0 || d <= 0) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = width;
    ctx.strokeStyle = color;
    partial(ctx, pts, measure(pts), d);
    ctx.stroke();
    ctx.restore();
  }

  // Leans the neighbour away from the pop, pivoting on its base, then settles
  function leanSprite(a, t, dirSign, f) {
    if (!t) return;
    const rot = dirSign * keys([[INK.pop - 1, 0], [INK.pop + 5, 0.075], [INK.pop + 12, -0.02], [INK.pop + 18, 0.006], [INK.pop + 22, 0]], f);
    const [x, y] = swung(a, t[0], t[1], t[2], rot);
    sprite(a, x, y, t[2], 1, rot ? { rot } : null);
  }

  function drawInk(f) {
    const P = inkPaths(f);
    leanSprite(art.cur, track('red', f), -1, f);
    leanSprite(art.after, track('next', f), 1, f);

    // the locked trophy, rubbed away by the eraser
    const l = inkLockPose();
    const lockA = art.lockBaked, ls = l.s * art.lock.k / lockA.k;
    if (f < INK.erase[1] + 1) {
      const ep = work(f, INK.erase);
      const img = ep > 0 ? cut(lockA.img, strokeMask(lockA.img, erasePts, ERASE_ROWS, ep), 'destination-out') : lockA.img;
      sprite({ ...lockA, img }, l.x, l.y, ls);
    }
    // a faint dashed outline where it was, until the new one is drawn
    const shape = window.LEAGUE_SHAPES[SET.shape];
    const guideA = ramp(f, INK.erase[0] + 6, INK.erase[1]) * (1 - ramp(f, INK.sketch[1], INK.color[1]));
    if (guideA > 0) {
      const o = inkOpenPose(f);
      const pts = toScreen(art.open, o.x, o.y, o.s, [...shape, shape[0]]);
      ctx.save();
      ctx.setLineDash([12, 14]);
      strokePath(pts, 1e9, 3, '#c4c4c4', guideA);
      ctx.restore();
    }
    drawCrumbs(f, P);

    // coloured in with back-and-forth strokes that uncover the real art,
    // then the pop
    const o = inkOpenPose(f);
    if (f >= INK.color[0]) {
      const k = keys([[INK.pop - 1, 1], [INK.pop, 1.12], [INK.pop + 4, 0.95], [INK.pop + 8, 1.02], [INK.pop + 12, 1]], f);
      const sq = { sx: keys([[INK.pop, 0.94], [INK.pop + 4, 1.05], [INK.pop + 9, 1]], f), sy: keys([[INK.pop, 1.07], [INK.pop + 4, 0.95], [INK.pop + 9, 1]], f) };
      const cp = work(f, INK.color);
      const img = cp < 1 ? cut(art.open.img, strokeMask(art.open.img, colorPts, COLOR_ROWS, cp), 'destination-in') : art.open.img;
      sprite({ ...art.open, img }, o.x, o.y, o.s * k, 1, f >= INK.pop ? sq : null);
    }
    // the traced outline, fading once the art is complete
    const sketchA = 1 - ramp(f, INK.color[1] - 4, INK.pop - 4);
    if (f >= INK.sketch[0] && sketchA > 0) {
      const cum = measure(P.sketch);
      strokePath(P.sketch, work(f, INK.sketch) * cum[cum.length - 1], 5, SET.title, sketchA);
    }
    // the answer circled and ticked
    if (f >= INK.circle[0]) {
      const cum = measure(P.loop);
      strokePath(P.loop, work(f, INK.circle) * cum[cum.length - 1], 10, SET.title);
    }
    if (f >= INK.check[0]) {
      const cum = measure(P.tick);
      strokePath(P.tick, work(f, INK.check) * cum[cum.length - 1], 18, SET.title);
    }
    // the league name, written right to left behind the pencil
    if (f >= INK.write[0]) {
      const tb = titleBox();
      const p = work(f, INK.write);
      const edge = lerp(tb.right + 6, tb.left - 6, p);
      ctx.save();
      ctx.beginPath();
      ctx.rect(edge, tb.y - 80, tb.right - edge + 20, 160);
      ctx.clip();
      ctx.direction = 'rtl';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '800 80px ' + AR;
      ctx.fillStyle = SET.title;
      ctx.fillText(SET.leagueName, W / 2, tb.y);
      ctx.restore();
    }
    if (f >= INK.penIn[0] && f <= INK.penOut[1]) drawPencil(penState(f, P));
  }

  function drawInkUI(f) {
    const p = easeOut(ramp(f, INK.sub, INK.sub + 14));
    if (p > 0) {
      ctx.save();
      ctx.translate(0, (1 - p) * 18);
      caption([[['تهانينا! تقدّمت إلى مستوى جديد هذا الأسبوع', 700]]], 1098, 0, p, 38);
      ctx.restore();
    }
    const b = ramp(f, INK.button, INK.button + 12);
    drawButton(true, b);
  }

  // ---------- shared by spark and hype ----------
  // A damped spring from 0 to 1 over t frames: overshoots, then settles
  function spring(t, freq = 2.2, damp = 0.38) {
    if (t <= 0) return 0;
    const sec = t / FPS, w = 2 * Math.PI * freq, wd = w * Math.sqrt(1 - damp * damp);
    return 1 - Math.exp(-damp * w * sec) * (Math.cos(wd * sec) + (damp * w / wd) * Math.sin(wd * sec));
  }
  const PALETTE = ['#ffc800', '#1cb0f6', '#ff4b4b', '#58cc02', '#ce82ff', '#ff9600'];
  // The student's numbers: 8th of a 30-player league, so 22 passed
  const STATS = { xpFrom: 900, xpTo: 1800, rank: 8, size: 30 };

  // The locked badge where the swing left it, and the open art at the same size
  function lockPose() {
    const [x, y, s] = focusPose(127);
    return { x, y, s };
  }
  function openPose(f, f0, f1) {
    const l = lockPose();
    const p = easeInOut(ramp(f, f0, f1));
    return { x: lerp(l.x, GREEN.x, p), y: lerp(l.y, GREEN.y, p), s: lerp(l.s * art.lock.k / art.open.k, GREEN.s, p) };
  }
  const centreOf = () => spot(art.open, GREEN.x, GREEN.y, GREEN.s, 0.5, 0.5);
  // Leftmost / rightmost neighbours, hopping when told
  function neighbours(f, hopAt) {
    const h = (d) => keys([[hopAt + d, 0], [hopAt + d + 6, -40], [hopAt + d + 12, 0], [hopAt + d + 16, -10], [hopAt + d + 20, 0]], f);
    const red = track('red', f);
    sprite(art.cur, red[0], red[1] + h(1), red[2]);
    const next = track('next', f);
    if (next) sprite(art.after, next[0], next[1] + h(4), next[2]);
  }
  function text(str, x, y, font, color, align = 'center') {
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillText(str, x, y);
  }

  // Flat geometric pieces
  function shapePath(type, r) {
    ctx.beginPath();
    if (type === 0) {                       // triangle
      for (let i = 0; i < 3; i++) {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / 3;
        ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
    } else if (type === 1) {                // circle
      ctx.arc(0, 0, r * 0.8, 0, Math.PI * 2);
    } else if (type === 2) {                // square
      roundRect(-r * 0.75, -r * 0.75, r * 1.5, r * 1.5, r * 0.25);
    } else if (type === 3) {                // plus
      const t = r * 0.32;
      ctx.moveTo(-t, -r); ctx.lineTo(t, -r); ctx.lineTo(t, -t); ctx.lineTo(r, -t); ctx.lineTo(r, t); ctx.lineTo(t, t);
      ctx.lineTo(t, r); ctx.lineTo(-t, r); ctx.lineTo(-t, t); ctx.lineTo(-r, t); ctx.lineTo(-r, -t); ctx.lineTo(-t, -t);
      ctx.closePath();
    }
  }
  function drawShape(type, x, y, r, rot, color) {
    if (r <= 0.5) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    if (type === 4) {                       // squiggle
      ctx.strokeStyle = color;
      ctx.lineWidth = r * 0.36;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let i = 0; i <= 12; i++) {
        const u = i / 12;
        ctx[i ? 'lineTo' : 'moveTo']((u - 0.5) * r * 2.4, Math.sin(u * Math.PI * 3) * r * 0.45);
      }
      ctx.stroke();
    } else {
      shapePath(type, r);
      ctx.fillStyle = color;
      ctx.fill();
    }
    ctx.restore();
  }

  // A white card with a grey rim and a lip, like the buttons
  function card(x, y, w, h, r = 22) {
    roundRect(x, y + 6, w, h, r);
    ctx.fillStyle = '#e5e5e5';
    ctx.fill();
    roundRect(x, y, w, h, r);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#e5e5e5';
    ctx.stroke();
  }
  // Small flat icons for the stat cards
  function icon(kind, x, y, r) {
    ctx.save();
    ctx.translate(x, y);
    if (kind === 'bolt') {
      ctx.fillStyle = '#ffc800';
      ctx.beginPath();
      ctx.moveTo(r * 0.2, -r); ctx.lineTo(-r * 0.55, r * 0.15); ctx.lineTo(-r * 0.02, r * 0.15);
      ctx.lineTo(-r * 0.25, r); ctx.lineTo(r * 0.6, -r * 0.2); ctx.lineTo(r * 0.05, -r * 0.2);
      ctx.closePath();
      ctx.fill();
    } else if (kind === 'medal') {
      ctx.fillStyle = '#ff4b4b';
      ctx.fillRect(-r * 0.5, -r, r * 0.35, r * 0.9);
      ctx.fillStyle = '#1cb0f6';
      ctx.fillRect(r * 0.15, -r, r * 0.35, r * 0.9);
      ctx.fillStyle = '#ffc800';
      ctx.beginPath();
      ctx.arc(0, r * 0.3, r * 0.6, 0, Math.PI * 2);
      ctx.fill();
    } else {                                // arrow up
      ctx.fillStyle = '#58cc02';
      ctx.beginPath();
      ctx.moveTo(0, -r); ctx.lineTo(r * 0.85, 0); ctx.lineTo(r * 0.32, 0); ctx.lineTo(r * 0.32, r);
      ctx.lineTo(-r * 0.32, r); ctx.lineTo(-r * 0.32, 0); ctx.lineTo(-r * 0.85, 0);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // ---------- spark ----------
  // Pieces thrown off the ring when it completes: each springs out to its spot,
  // spins, hangs a moment and pops away
  const sparkShapes = (() => {
    const r = rng(61);
    const list = [];
    for (let i = 0; i < 26; i++) {
      list.push({
        a: (i / 26) * Math.PI * 2 + (r() - 0.5) * 0.2,
        d: 90 + r() * 170,
        type: i % 5,
        size: 16 + r() * 14,
        spin: (r() - 0.5) * 3,
        color: PALETTE[i % PALETTE.length],
        out: SP.burst + 34 + r() * 26,
        delay: r() * 3,
      });
    }
    return list;
  })();

  function drawSpark(f) {
    neighbours(f, SP.burst);
    const [cx, cy] = centreOf();
    const R = 300;
    // the ring: a grey track springs in, then fills, faster and faster
    const ringIn = spring(f - SP.ring, 2.4, 0.45);
    const fill = ramp(f, SP.fill[0], SP.fill[1]) ** 1.7;
    const gone = ramp(f, SP.burst, SP.burst + 3);
    if (ringIn > 0 && gone < 1) {
      ctx.save();
      ctx.globalAlpha = 1 - gone;
      ctx.lineCap = 'round';
      ctx.lineWidth = 24 * ringIn;
      ctx.strokeStyle = '#e5e5e5';
      ctx.beginPath();
      ctx.arc(cx, cy, R * ringIn, 0, Math.PI * 2);
      ctx.stroke();
      if (fill > 0) {
        ctx.strokeStyle = SET.title;
        ctx.lineWidth = 24 + 8 * ramp(f, SP.fill[1] - 6, SP.fill[1]);
        ctx.beginPath();
        ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + fill * Math.PI * 2);
        ctx.stroke();
        const ha = -Math.PI / 2 + fill * Math.PI * 2;
        dot(cx + Math.cos(ha) * R, cy + Math.sin(ha) * R, 9, '#ffffff');
      }
      ctx.restore();
    }
    // the pieces
    for (const p of sparkShapes) {
      const t = f - SP.burst - p.delay;
      if (t <= 0 || f > p.out + 10) continue;
      const k = spring(t, 1.8, 0.5);
      const dist = R + p.d * k;
      const pop = f < p.out ? 1 : 1 - easeOut(ramp(f, p.out, p.out + 8));
      const swell = f < p.out ? 1 : 1 + 0.4 * Math.sin(Math.PI * ramp(f, p.out, p.out + 8));
      drawShape(p.type, cx + Math.cos(p.a) * dist, cy + Math.sin(p.a) * dist, p.size * Math.min(1, k * 1.4) * pop * swell, p.a + p.spin * k, p.color);
    }
    // the badge: grey and trembling while the ring fills, flips over at the burst
    const l = lockPose();
    const tremble = reduced ? 0 : 3.5 * fill * (f < SP.burst ? 1 : 0);
    const lx = l.x + wob(f * 2.3, 4) * tremble;
    const u = ramp(f, SP.flip[0], SP.flip[1]);
    const face = Math.cos(Math.PI * u);
    if (u < 0.5) {
      const k = 1 + 0.05 * fill;
      sprite(art.lock, lx, l.y, l.s * k, 1, { sx: Math.max(0.02, Math.abs(face)) });
      if (SET.padlock && f < SP.flip[0] + 3) drawPadlock(f, lx, l.y, l.s * k, 0, 1e9);
    } else {
      const o = openPose(f, SP.flip[0], SP.flip[1]);
      const pop = 1 + 0.22 * (1 - spring(f - (SP.flip[0] + 6), 2.6, 0.32));
      sprite(art.open, o.x, o.y, o.s * pop, 1, { sx: Math.max(0.02, Math.abs(face)) });
      drawShine(f - SP.flip[1] + 136, o.x, o.y, o.s * pop);
    }
  }

  function drawSparkUI(f) {
    const [cx, cy] = centreOf();
    // the XP counter under the ring
    if (f >= SP.ring && f < SP.head + 10) {
      const p = ramp(f, SP.fill[0], SP.fill[1]) ** 1.7;
      const n = Math.round(lerp(STATS.xpFrom, STATS.xpTo, p) / 10) * 10;
      const a = spring(f - SP.ring, 2.4, 0.45) * (1 - ramp(f, SP.head - 4, SP.chip));
      const done = f >= SP.fill[1];
      const k = done ? 1 + 0.25 * (1 - spring(f - SP.fill[1], 3, 0.3)) : 1 + 0.06 * ((n / 100) % 1 === 0 ? 1 - ((f * 3) % 1) : 0);
      ctx.save();
      ctx.globalAlpha = clamp(a);
      ctx.translate(W / 2, cy + 370);
      ctx.scale(k, k);
      ctx.direction = 'ltr';
      text(n.toLocaleString('en-US') + ' XP', 0, 0, '800 64px ' + LAT, done ? SET.title : '#4b4b4b');
      ctx.restore();
    }
    // heading springs up from below, then the league name in a chip
    if (f >= SP.head) {
      const k = spring(f - SP.head, 2.2, 0.4);
      ctx.save();
      ctx.globalAlpha = clamp(k * 2);
      ctx.translate(W / 2, 250 + (1 - k) * 80);
      ctx.direction = 'rtl';
      text('دوري جديد!', 0, 0, '800 88px ' + AR, '#3c3c3c');
      ctx.restore();
    }
    if (f >= SP.chip) {
      const k = spring(f - SP.chip, 2.6, 0.38);
      ctx.save();
      ctx.translate(W / 2, cy + 368);
      ctx.scale(k, k);
      ctx.direction = 'rtl';
      ctx.font = '800 54px ' + AR;
      const label = SET.leagueName;
      const w = ctx.measureText(label).width + 80, h = 92;
      roundRect(-w / 2, -h / 2 + 7, w, h, h / 2);
      ctx.fillStyle = shade(SET.title);
      ctx.fill();
      roundRect(-w / 2, -h / 2, w, h, h / 2);
      ctx.fillStyle = SET.title;
      ctx.fill();
      text(label, 0, 2, '800 54px ' + AR, '#ffffff');
      ctx.restore();
    }
    // three stat cards spring in one after another, numbers counting up
    const cards = [
      { kind: 'bolt', label: 'خبرة', value: (t) => '+' + Math.round(lerp(0, STATS.xpTo - STATS.xpFrom, t)) },
      { kind: 'medal', label: 'ترتيبك', value: (t) => '#' + Math.max(STATS.rank, Math.round(lerp(STATS.size, STATS.rank, t))) },
      { kind: 'arrow', label: 'تفوّقت عليهم', value: (t) => String(Math.round(lerp(0, STATS.size - STATS.rank, t))) },
    ];
    const cw = 252, ch = 170, gap = 18, y0 = 1170;
    cards.forEach((c, i) => {
      const f0 = SP.stats + i * 7;
      if (f < f0) return;
      const k = spring(f - f0, 2.4, 0.42);
      const x = W / 2 + (1 - i) * (cw + gap);              // right to left
      ctx.save();
      ctx.translate(x, y0 + (1 - k) * 90);
      ctx.globalAlpha = clamp(k * 1.6);
      card(-cw / 2, -ch / 2, cw, ch);
      icon(c.kind, 0, -ch / 2 + 44, 24);
      const t = easeOut(ramp(f, f0 + 4, f0 + 26));
      ctx.direction = 'ltr';
      text('\u2066' + c.value(t) + '\u2069', 0, 6, '800 50px ' + LAT, '#3c3c3c');
      ctx.direction = 'rtl';
      text(c.label, 0, ch / 2 - 30, '700 28px ' + AR, '#8a8a8a');
      ctx.restore();
    });
    const b = spring(f - SP.button, 2.4, 0.45);
    if (b > 0) drawButton(true, clamp(b * 2), (1 - b) * -0.2);
  }

  // ---------- hype ----------
  // Three heartbeats, each filling a third of the badge with colour from the
  // bottom; it crouches, rises, slams down: the floor ripples, dust puffs,
  // the padlock bursts off; then a tilted sticker, and the count of students
  // you passed
  let hypeFillCanvas = null;
  function hypeFill(level) {
    const img = art.open.img;
    if (!hypeFillCanvas) {
      hypeFillCanvas = document.createElement('canvas');
      hypeFillCanvas.width = img.width;
      hypeFillCanvas.height = img.height;
    }
    const g = hypeFillCanvas.getContext('2d');
    g.clearRect(0, 0, img.width, img.height);
    g.drawImage(img, 0, 0);
    g.globalCompositeOperation = 'destination-in';
    g.fillRect(0, img.height * (1 - level), img.width, img.height * level + 1);
    g.globalCompositeOperation = 'source-over';
    return hypeFillCanvas;
  }
  const dust = (() => {
    const r = rng(71);
    const list = [];
    for (let i = 0; i < 14; i++) {
      const side = i % 2 ? 1 : -1;
      list.push({ side, x0: 60 + r() * 150, v: 4 + r() * 7, up: 0.8 + r() * 1.8, r0: 12 + r() * 14, grow: 1.6 + r() * 1.4 });
    }
    return list;
  })();

  function hypeMotion(f) {
    // vertical offset and squash/stretch of the badge
    const [r0, r1] = HY.rise;
    let dy = 0, sx = 1, sy = 1;
    if (f >= r0 - 6 && f < r0) { const p = ramp(f, r0 - 6, r0); sy = 1 - 0.14 * p; sx = 1 + 0.1 * p; }
    if (f >= r0 && f < HY.slam) {
      const up = easeOut(ramp(f, r0, r1));
      const down = ramp(f, r1 + 2, HY.slam) ** 2;
      dy = -170 * up + 170 * down;
      const st = f < r1 ? 0.1 * (1 - ramp(f, r0, r0 + 8)) : 0.12 * down;
      sy = 1 + st;
      sx = 1 - st * 0.7;
    }
    if (f >= HY.slam) {
      sy = keys([[HY.slam, 0.78], [HY.slam + 4, 1.1], [HY.slam + 8, 0.96], [HY.slam + 12, 1]], f);
      sx = keys([[HY.slam, 1.2], [HY.slam + 4, 0.94], [HY.slam + 8, 1.02], [HY.slam + 12, 1]], f);
    }
    let k = 1;
    HY.beats.forEach((b, i) => { k *= keys([[b - 1, 1], [b, 1.07 + i * 0.03], [b + 6, 1]], f); });
    return { dy, sx, sy, k };
  }

  function drawHype(f) {
    neighbours(f, HY.slam);
    const l = lockPose();
    const m = hypeMotion(f);
    const base = l.y + (art.lock.img.height - art.lock.ay) * l.s * art.lock.k;   // floor line under the badge
    const [cx, cy] = spot(art.lock, l.x, l.y, l.s, 0.5, 0.5);
    // ripples from each heartbeat, in the league colour
    HY.beats.forEach((b, i) => {
      const p = ramp(f, b, b + 22);
      if (f < b || p >= 1) return;
      ctx.globalAlpha = (1 - p) * (0.6 + i * 0.15);
      ctx.strokeStyle = SET.title;
      ctx.lineWidth = lerp(14, 2, p);
      ctx.beginPath();
      ctx.arc(cx, cy, lerp(230, 470 + i * 60, easeOut(p)), 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    });
    // the floor: a line that snaps out on impact, and two waves skidding along it
    if (f >= HY.slam) {
      const p = easeOut(ramp(f, HY.slam, HY.slam + 10));
      const fade = 1 - ramp(f, HY.slam + 30, HY.slam + 44);
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.lineCap = 'round';
      ctx.lineWidth = 7;
      ctx.strokeStyle = '#e5e5e5';
      ctx.beginPath();
      ctx.moveTo(l.x - 430 * p, base);
      ctx.lineTo(l.x + 430 * p, base);
      ctx.stroke();
      const q = ramp(f, HY.slam, HY.slam + 22);
      if (q < 1) {
        ctx.globalAlpha = 1 - q;
        ctx.strokeStyle = SET.title;
        ctx.lineWidth = lerp(12, 3, q);
        for (const side of [-1, 1]) {
          const x = l.x + side * lerp(150, 520, easeOut(q));
          ctx.beginPath();
          ctx.ellipse(x, base, 46, lerp(40, 10, q), 0, Math.PI, 2 * Math.PI);
          ctx.stroke();
        }
      }
      ctx.restore();
      // dust puffs
      for (const d of dust) {
        const t = f - HY.slam;
        if (t > 34) continue;
        const e = 1 - Math.exp(-t / 9);
        const x = l.x + d.side * (d.x0 + d.v * 9 * e * 2.4);
        const y = base - d.up * 9 * e * 3 - 6;
        const rr = d.r0 * (1 + d.grow * e);
        ctx.globalAlpha = 1 - ramp(t, 14, 34);
        ctx.fillStyle = '#eceef1';
        ctx.beginPath();
        ctx.arc(x, y, rr, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
    // the badge: grey, filling a third per heartbeat; full colour once it slams
    const level = f >= HY.slam ? 1 : HY.beats.reduce((acc, b, i) => acc + (1 / 3) * easeOut(ramp(f, b, b + 8)), 0);
    const o = { sx: m.sx, sy: m.sy };
    const y = l.y + m.dy;
    if (f < HY.slam) {
      sprite(art.lock, l.x, y, l.s * m.k, 1, o);
      const os = l.s * art.lock.k / art.open.k;
      if (level > 0) sprite({ ...art.open, img: hypeFill(level) }, l.x, y, os * m.k, 1, o);
      if (SET.padlock) drawPadlock(f, l.x, y, l.s * m.k, 0, HY.beats[2]);
    } else {
      const op = openPose(f, HY.slam, HY.slam + 10);
      sprite(art.open, op.x, op.y, op.s, 1, o);
      drawShine(f - HY.slam + 134, op.x, op.y, op.s);
    }
  }

  // A word set like a sticker: thick white edge, soft drop, slight tilt
  function sticker(str, x, y, size, tilt, fill, k, ink = '#ffffff') {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tilt);
    ctx.scale(k, k);
    ctx.direction = 'rtl';
    ctx.font = '800 ' + size + 'px ' + AR;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = size * 0.26;
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.strokeText(str, 0, size * 0.09);
    ctx.strokeStyle = '#ffffff';
    ctx.strokeText(str, 0, 0);
    ctx.fillStyle = fill;
    ctx.fillText(str, 0, 0);
    ctx.restore();
  }

  function drawHypeUI(f) {
    if (f >= HY.sticker) {
      const k = keys([[HY.sticker, 2.5], [HY.sticker + 5, 0.86], [HY.sticker + 9, 1.07], [HY.sticker + 13, 0.98], [HY.sticker + 16, 1]], f);
      sticker('ترقية!', W / 2, 262, 118, -0.1, SET.title, k);
    }
    if (f >= HY.plus) {
      const k = spring(f - HY.plus, 2.8, 0.35);
      ctx.save();
      ctx.translate(W / 2 + 250, 340);
      ctx.rotate(0.14);
      ctx.scale(k, k);
      ctx.direction = 'rtl';
      ctx.font = '800 36px ' + AR;
      const plus = '\u2066+1\u2069 مستوى';   // isolate "+1" so it keeps its order in Arabic
      const w = ctx.measureText(plus).width + 54, h = 66;
      roundRect(-w / 2 - 6, -h / 2 - 6, w + 12, h + 12, (h + 12) / 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      roundRect(-w / 2, -h / 2, w, h, h / 2);
      ctx.fillStyle = '#ffc800';
      ctx.fill();
      text(plus, 0, 2, '800 36px ' + AR, '#5a4300');
      ctx.restore();
    }
    if (f >= HY.name) {
      const k = spring(f - HY.name, 2.2, 0.42);
      ctx.save();
      ctx.globalAlpha = clamp(k * 2);
      ctx.translate(W / 2, 1000 + (1 - k) * 60);
      ctx.direction = 'rtl';
      text(SET.leagueName, 0, 0, '800 80px ' + AR, SET.title);
      ctx.restore();
    }
    // students passed, counting up with a bump on every step
    if (f >= HY.count[0]) {
      const a = spring(f - HY.count[0], 2.4, 0.45);
      const passed = STATS.size - STATS.rank;
      const n = Math.round(easeOut(ramp(f, HY.count[0] + 4, HY.count[1])) * passed);
      const stepFrame = (() => { for (let g = f; g > HY.count[0]; g--) if (Math.round(easeOut(ramp(g - 1, HY.count[0] + 4, HY.count[1])) * passed) !== n) return g; return HY.count[0]; })();
      const bump = 1 + 0.18 * (1 - ramp(f, stepFrame, stepFrame + 5)) * (n > 0 ? 1 : 0);
      const done = f >= HY.count[1];
      const k2 = done ? 1 + 0.2 * (1 - spring(f - HY.count[1], 3, 0.3)) : bump;
      ctx.save();
      ctx.globalAlpha = clamp(a * 2);
      ctx.direction = 'rtl';
      text('تفوّقت على', W / 2, 1100, '700 38px ' + AR, '#777777');
      ctx.translate(W / 2, 1200);
      ctx.scale(k2, k2);
      ctx.direction = 'ltr';
      text(String(n), 0, 0, '800 120px ' + LAT, '#58cc02');
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = clamp(a * 2);
      ctx.direction = 'rtl';
      text('طالب هذا الأسبوع', W / 2, 1302, '700 38px ' + AR, '#777777');
      ctx.restore();
    }
    const b = spring(f - HY.button, 2.4, 0.45);
    if (b > 0) drawButton(true, clamp(b * 2));
  }

  function hypeShake(f) {
    if (reduced) return [0, 0];
    let amp = keys([[HY.slam - 1, 0], [HY.slam, 18], [HY.slam + 5, 9], [HY.slam + 24, 0]], f)
      + keys([[HY.sticker + 4, 0], [HY.sticker + 5, 7], [HY.sticker + 14, 0]], f);
    HY.beats.forEach((b, i) => { amp += keys([[b - 1, 0], [b, 2 + i * 2], [b + 6, 0]], f); });
    return [wob(f * 2.9, 2) * amp, wob(f * 3.4, 7) * amp];
  }

  // ---------- frame ----------
  function render(f) {
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.imageSmoothingQuality = 'high';   // the rank badges are small and drawn up to ~2x
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);
    ctx.translate(0, -OY);
    const flow = !BOLD && !INKY && !SPARK && !HYPE && TIER_N !== 3 && f >= BREAK;
    const [shx, shy] = BOLD ? boldShake(f) : HYPE ? hypeShake(f) : INKY || SPARK ? [0, 0] : TIER_N !== 3 ? flowShake(f) : shakeOffset(f);
    ctx.save();
    ctx.translate(shx, shy);
    if (BOLD && f >= BREAK) drawBold(f);
    else if (INKY && f >= INK.start) drawInk(f);
    else if (SPARK && f >= SP.ring) drawSpark(f);
    else if (HYPE && f >= SP.ring) drawHype(f);
    else if (flow) [, drawSilver, drawGold, null, drawChampion][TIER_N](f);
    else drawRow(f);
    if (!BOLD && !INKY && !SPARK && !HYPE && TIER_N === 3 && f >= BURST && FX.sparkles) drawSparkles(f - POST, FX.sparkles);
    drawUI(f);
    ctx.restore();
    if (!BOLD && !INKY && !SPARK && !HYPE) {
      if (TIER_N === 3) drawFlash(f);
      else drawFlowFlash(f);
    }
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
    if (SPARK) {
      at(SP.burst, [30, 30, 70]);
      at(SP.stats, 15);
      return;
    }
    if (HYPE) {
      HY.beats.forEach((b, i) => at(b, 15 + i * 10));
      at(HY.slam, [60, 30, 90]);
      at(HY.sticker + 5, 25);
      return;
    }
    if (INKY) {
      at(INK.pop, [30, 30, 60]);
      at(INK.check[1] - 2, 20);
      return;
    }
    if (BOLD) {
      at(BD.pop, [40, 30, 90]);
      at(BD.title + 3, 15);
      at(BD.arrive, 20);
      return;
    }
    const hit = [0, T1.flip[1], T2.land, BURST, T4.impact][TIER_N];
    at(hit, [0, [25, 20, 40], [40, 30, 90], [40, 30, 90], [60, 30, 120, 40, 60]][TIER_N]);
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
    ...Object.keys(SET.art).filter((role) => SET.art[role]).map(load),
    document.fonts ? Promise.all([
      document.fonts.load('700 42px Tajawal', 'لقد'), document.fonts.load('800 42px Tajawal', '8'),
      document.fonts.load('600 30px Nunito'), document.fonts.load('800 32px Nunito'),
      document.fonts.load('800 80px Tajawal', 'المستوى'),
    ]).catch(() => {}) : null,
  ]).then(() => {
    buildLayers();
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
