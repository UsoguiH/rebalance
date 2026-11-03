// poses.js: the 10 drawings from the reference sheet, their rig points, and their loops.
//
// Every point is in the drawing's own pixels (mascot/art/poseNN.png), read off a grid
// laid over each cut-out; the eye ellipses were fitted to the eye whites automatically.
// A loop is key poses read with `flow` (no stop-and-go), plus `fx` accents, plus idle
// life that never stops, plus follow-through (the head and the afro trail the body).
(function (root) {
  'use strict';
  const M = root.Motion;
  const { flow, track, lin, wave, bell, lw, blinks, clamp, mix } = M;
  const { Wt } = root.SpriteRig;

  // ── rig points per drawing ────────────────────────────────────────────────
  // head: [cx, cy, rx, ry] of hair + face; face: centre of the features; seat: sitting poses
  const DRAWINGS = {
    p01: { file: 'pose01.png', floor: 415.5, hip: [105, 300], neck: [102, 196], head: [107, 104, 86, 96], face: [100, 142],
      eyes: [[75.5, 126.5, 16.5, 15.5], [125, 125.5, 17, 15.5]], mouth: [100, 163],
      limbs: [{ id: 'cane', a: [30, 288], b: [20, 418], r: 15, ramp: 0.08 }] },
    p02: { file: 'pose02.png', floor: 417.5, hip: [136, 300], neck: [145, 196], head: [176, 108, 88, 93], face: [158, 140],
      eyes: [[132.5, 117, 16.5, 16], [181.5, 128.5, 17.5, 16.5]], mouth: [149, 162],
      limbs: [{ id: 'wave', a: [82, 218], b: [32, 112], r: 36, ramp: 0.38, f: 14 }, { id: 'stick', a: [226, 252], b: [276, 152], r: 9, ramp: 0.45 }],
      headExcl: ['wave'] },
    p03: { file: 'pose03.png', floor: 455, hip: [137, 325], neck: [128, 236], head: [145, 150, 80, 100], face: [137, 182],
      eyes: [], mouth: [130, 200],
      limbs: [
        { id: 'armL', a: [90, 218], b: [72, -4], r: 42, ramp: 0.25 },
        { id: 'armR', a: [205, 218], b: [306, 66], r: 50, ramp: 0.25 },
        { id: 'legL', a: [112, 332], b: [118, 440], r: 36, ramp: 0.2 },
        { id: 'legR', a: [172, 338], b: [250, 412], r: 40, ramp: 0.2 },
      ], headExcl: ['armL', 'armR'] },
    p04: { file: 'pose04.png', floor: 404, hip: [92, 300], neck: [88, 196], head: [100, 105, 88, 95], face: [88, 142],
      eyes: [[64.5, 129, 16.5, 9], [115, 133.5, 17, 9.5]], mouth: [86, 158], lash: 0.3,
      limbs: [{ id: 'stick', a: [140, 236], b: [188, 164], r: 8, ramp: 0.4 }] },
    p05: { file: 'pose05.png', floor: 414, hip: [140, 305], neck: [140, 196], head: [145, 105, 86, 95], face: [140, 142],
      eyes: [[115, 126, 17, 16], [165, 126, 17, 15]], mouth: [139, 162],
      limbs: [{ id: 'cane', a: [36, 236], b: [31, 420], r: 24, ramp: 0.02, f: 10 }] },
    p06: { file: 'pose06.png', floor: 414, hip: [205, 300], neck: [205, 190], head: [241, 102, 85, 93], face: [218, 130],
      eyes: [[196, 112.5, 15, 15.5], [241.5, 123.5, 16.5, 15.5]], mouth: [211, 150],
      limbs: [{ id: 'pointer', a: [152, 214], pts: [[152, 214], [92, 172], [8, 90]], r: 20, f: 12, ramp: 0.25 }],
      // the three yellow spark strokes, measured off the drawing and redrawn live (inner end first)
      sparks: [[30.5, 138.3, 11.7, 127.8], [29.8, 156.5, 7.5, 160.4], [36.3, 174.9, 21.8, 191.9]], sparkW: 6.2, sparkColor: '#fdc666' },
    p07: { file: 'pose07.png', floor: 406, hip: [150, 295], neck: [140, 191], head: [161, 112, 84, 84], face: [143, 136],
      eyes: [[120.5, 117.5, 15.5, 15.5], [166.5, 128.5, 16.5, 15.5]], mouth: [136, 157],
      limbs: [{ id: 'hand', a: [64, 224], b: [38, 132], r: 38, ramp: 0.3 }, { id: 'stick', a: [214, 210], b: [242, 150], r: 8, ramp: 0.4 }],
      headExcl: ['hand'] },
    p08: { file: 'pose08.png', floor: 390, seat: 300, hip: [137, 278], neck: [138, 190], head: [152, 105, 85, 90], face: [140, 142],
      eyes: [[116.5, 128.5, 16.5, 9.5], [164.5, 130.5, 16.5, 13.5]], mouth: [138, 160], lash: 0.3,
      limbs: [{ id: 'book', a: [137, 300], b: [137, 180], r: 95, ramp: 0, f: 20 }] },
    p09: { file: 'pose09.png', floor: 359, seat: 285, hip: [137, 268], neck: [134, 172], head: [172, 95, 92, 88], face: null,
      eyes: [], mouth: [139, 152], limbs: [] },
    p10: { file: 'pose10.png', floor: 428, hip: [115, 305], neck: [110, 202], head: [133, 130, 88, 88], face: [115, 150],
      eyes: [[91.5, 132.5, 15.5, 14.5], [139, 140, 16, 15]], mouth: [107, 172],
      limbs: [
        { id: 'book', a: [212, 210], b: [270, 82], r: 52, ramp: 0.3 },
        { id: 'crown', a: [150, 70], b: [195, 10], r: 38, ramp: 0, f: 10 },
        { id: 'cane', a: [32, 288], b: [20, 432], r: 15, ramp: 0.08 },
      ], headExcl: ['book'] },
  };

  /** The deformer stack of one drawing: local parts first, the root last. */
  function deformers(d) {
    const D = [];
    d.eyes.forEach((e, i) => D.push({ id: 'eye' + i, pivot: [e[0], e[1]], weight: Wt.ellipse(e[0], e[1], e[2] * 0.55, e[3] * 0.6, 0.7) }));
    d.eyes.forEach((e, i) => D.push({ id: 'brow' + i, pivot: [e[0], e[1] - 31], weight: Wt.ellipse(e[0], e[1] - 31, 19, 9, 0.9) }));
    if (d.mouth) D.push({ id: 'mouth', pivot: [d.mouth[0], d.mouth[1] - 8], weight: Wt.circle(d.mouth[0], d.mouth[1], 11, 21) });
    const limbW = {};
    for (const l of d.limbs) {
      limbW[l.id] = l.weight || (l.pts ? Wt.poly(l.pts, l.r, l.f || 14, l.ramp) : Wt.capsule(l.a[0], l.a[1], l.b[0], l.b[1], l.r, l.f || 14, l.ramp));
    }
    for (const l of d.limbs) {
      let w = limbW[l.id];
      const ex = (d.excl && d.excl[l.id]) || [];
      if (ex.length) { const base = w; w = (x, y) => base(x, y) * ex.reduce((a, id) => a * (1 - limbW[id](x, y)), 1); }
      D.push({ id: l.id, pivot: l.a, weight: w });
    }
    if (d.face) D.push({ id: 'face', pivot: d.face, weight: Wt.ellipse(d.face[0], d.face[1], 50, 46, 0.5) });
    const [hx, hy, hrx, hry] = d.head;
    let hw = Wt.mul(Wt.ellipse(hx, hy, hrx, hry, 0.16), Wt.above(d.neck[1] - 8, d.neck[1] + 14));
    if (d.headExcl) { const base = hw; hw = (x, y) => base(x, y) * d.headExcl.reduce((a, id) => a * (1 - limbW[id](x, y)), 1); }
    D.push({ id: 'head', pivot: d.neck, weight: hw });
    D.push({ id: 'body', pivot: d.hip, weight: Wt.above(d.hip[1] - 14, d.hip[1] + 22) });
    D.push({ id: 'root', pivot: [d.hip[0], d.seat || d.floor], weight: d.seat ? Wt.above(d.seat - 8, d.seat + 10) : Wt.all() });
    return D;
  }
  for (const k in DRAWINGS) DRAWINGS[k].deformers = deformers(DRAWINGS[k]);

  // ── the loops ─────────────────────────────────────────────────────────────
  const CH = { x: 0, lift: 0, sy: 1, lean: 0, breath: 0, hr: 0, hx: 0, hy: 0, yaw: 0, lookX: 0, lookY: 0, mo: 0, brow: 0, brow0: 0, brow1: 0, lid: 0 };
  /** Syllables: an open-close every ~170 ms, varied, closed at both ends of the window. */
  function talk(t, a, b, amt) {
    if (t <= a || t >= b) return 0;
    const k = Math.floor((t - a) / 170);
    const s = Math.abs(Math.sin(((t - a) / 170) * Math.PI));
    const env = Math.min(1, (t - a) / 150, (b - t) / 150);
    return (amt || 0.25) * s * (0.55 + 0.45 * M.seeded(k, 7)) * env;
  }

  const CLIPS = [
    {
      id: 'idle', drawing: 'p01', ar: 'وقفة الأستاذ', en: 'Idle', dur: 5600,
      keys: [
        [0, {}], [1200, {}],
        [1600, { yaw: 0.6, lookX: 0.8, hr: -2 }], [2800, { yaw: 0.6, lookX: 0.8, hr: -2 }],
        [3250, { yaw: 0, lookX: 0, hr: 0 }],
        [3700, { sy: 0.965 }], [3880, { sy: 1.035, lift: 4, brow: 3 }], [4060, { sy: 0.985, lift: 0 }], [4250, { sy: 1, brow: 0 }],
      ],
      blinks: [1500, 3150, 4800, 5050],
      fx(t, c) { c.cane = 1.2 * wave(t, 2800); },
    },
    {
      id: 'wave', drawing: 'p02', ar: 'أهلاً!', en: 'Hello', dur: 2520,
      keys: [[0, {}]],
      blinks: [900, 2050],
      fx(t, c) {
        c.wave = 14 * wave(t, 420);
        c.sy += 0.016 * wave(t, 420, 0.25);
        c.hr += 3 * wave(t, 840, 0.1);
        c.mo += 0.08 + 0.1 * Math.abs(wave(t, 420));
        c.stick = 2.5 * wave(t, 840, 0.3);
        c.yaw += 0.15 * wave(t, 2520);
        c.brow += 1.5 * Math.max(0, wave(t, 840, 0.2));
      },
    },
    {
      id: 'jump', drawing: 'p03', ar: 'احتفال', en: 'Celebrate', dur: 1400, inAir: true,
      keys: [[0, {}]],
      blinks: [],
      fx(t, c) {
        const p = t / 1400;
        const s = Math.sin(Math.PI * p);
        c.lift += 36 * s;
        c.sy += 0.05 * Math.abs(Math.cos(Math.PI * p)) * (1 - Math.pow(Math.cos(Math.PI * p), 16)) - 0.09 * Math.pow(Math.cos(Math.PI * p), 16);
        c.armL = -9 * Math.sin(2 * Math.PI * p);
        c.armR = 9 * Math.sin(2 * Math.PI * p + 0.6);
        c.legL = 7 * Math.sin(2 * Math.PI * p + 0.4);
        c.legR = -10 * Math.sin(2 * Math.PI * p + 0.9);
        c.mo += 0.08 * s;
        c.stars = 1;
      },
    },
    {
      id: 'confident', drawing: 'p04', ar: 'واثق', en: 'Confident', dur: 4200,
      keys: [
        [0, {}], [700, { hr: -4, lean: -1.5, hy: -1 }], [1300, { hr: -4 }],
        [1500, { brow1: 4, lookX: 0.6, yaw: 0.3 }], [1700, { brow1: 0 }], [1850, { brow1: 4 }], [2100, { brow1: 0, lookX: 0.1, yaw: 0 }],
        [2700, { hr: 3, lean: 0, hy: 0, lookX: -0.4, yaw: -0.3 }],
        [3000, { hy: 3 }], [3150, { hy: 0 }], [3300, { hy: 3 }], [3450, { hy: 0 }],
        [3900, { hr: 0, lookX: 0, yaw: 0 }],
      ],
      blinks: [2650],
      fx(t, c) { c.stick = 2 * wave(t, 2100); c.mo += 0.04 * Math.max(0, wave(t, 4200, 0.3)); },
    },
    {
      id: 'determined', drawing: 'p05', ar: 'جاهز للتحدي', en: 'Determined', dur: 3000,
      keys: [
        [0, {}], [500, {}],
        [750, { caneY: -14, sy: 1.025, hy: -1 }],
        [900, { caneY: 2, sy: 0.92, hy: 3, brow: -2 }],
        [1030, { caneY: 0, sy: 1.04, hy: -1 }],
        [1160, { sy: 1, hy: 0, brow: 0 }],
        [1700, { yaw: -0.4, lookX: -0.7 }], [2300, { yaw: 0, lookX: 0 }],
        [2550, { hy: 3 }], [2700, { hy: 0 }],
      ],
      blinks: [1650, 2350],
      fx(t, c) { c.dust = lin(t, 900, 1400); },
    },
    {
      id: 'teaching', drawing: 'p06', ar: 'يشرح الدرس', en: 'Teaching', dur: 3600,
      keys: [
        [0, {}], [400, { pointer: -6 }], [520, { pointer: 5 }], [640, { pointer: -6 }], [760, { pointer: 5 }], [900, { pointer: 0 }],
        [1700, { yaw: -0.6, lookX: -1, lookY: -0.4, hr: -3 }], [2400, { yaw: 0, lookX: 0, lookY: 0, hr: 2 }], [3200, { hr: 0 }],
      ],
      blinks: [1650, 2450],
      fx(t, c) {
        c.mo += talk(t, 900, 1650) + talk(t, 2450, 3450);
        c.sparkS = 1 + 0.4 * (bell(lin(t, 480, 700)) + bell(lin(t, 720, 940))) + 0.08 * wave(t, 900);
        c.hy += 1.2 * Math.abs(wave(t, 680)) * (lin(t, 900, 1000) - lin(t, 1550, 1650) + lin(t, 2450, 2550) - lin(t, 3350, 3450));
      },
    },
    {
      id: 'worried', drawing: 'p07', ar: 'أوه لا!', en: 'Uh-oh', dur: 2600,
      keys: [
        [0, {}], [300, { lean: -2, x: -2 }],
        [900, { lookX: -0.8, yaw: -0.3 }], [1300, { lookX: 0.8, yaw: 0.3 }], [1700, { lookX: 0, yaw: 0 }],
        [2200, { lean: 0, x: 0 }],
      ],
      blinks: [850, 1650],
      fx(t, c) {
        c.x += 0.7 * wave(t, 100);
        c.hand = 4 * wave(t, 130);
        c.mo += 0.08 * lw(t, 2600, 160);
        c.brow += 1.5 + 1.5 * wave(t, 1300);
        c.sweat = (t % 2600) / 2600;
      },
    },
    {
      id: 'reading', drawing: 'p08', ar: 'يقرأ', en: 'Reading', dur: 5200,
      keys: [
        [0, { lookX: -0.7, hr: -1.5 }], [900, { lookX: 0.7, hr: 1.5 }],
        [1050, { lookX: -0.7, hr: -1.5, lookY: 0.2 }], [1950, { lookX: 0.7, hr: 1.5 }],
        [2100, { lookX: -0.7, lookY: 0.4, hr: -1.5 }], [3000, { lookX: 0.7, hr: 1.5 }],
        [3250, { lookX: 0, lookY: -0.8, brow: 4, hr: -3, yaw: 0.2, mo: 0.2, bookY: -4 }],
        [3900, {}],
        [4300, { lookX: -0.7, lookY: 0, brow: 0, hr: -1.5, yaw: 0, mo: 0, bookY: 0 }],
      ],
      blinks: [1000, 3200, 4400],
      fx(t, c) { c.bookY = (c.bookY || 0) + 1.2 * wave(t, 1300); },
    },
    {
      id: 'sleeping', drawing: 'p09', ar: 'نائم', en: 'Sleeping', dur: 4400,
      keys: [[0, {}], [2600, { hr: 3, hy: 3 }], [3000, { hr: 6, hy: 5 }], [3150, { hr: -2, hy: -2 }], [3500, { hr: 0, hy: 0 }]],
      blinks: [],
      idle: 0.5,
      fx(t, c) {
        c.breath += 0.028 * wave(t, 2200, -0.25);
        c.mo += 0.1 * (wave(t, 2200, -0.25) + 1) / 2;
        c.hr += 1.5 * wave(t, 2200, -0.1);
        c.zzz = 1;
      },
    },
    {
      id: 'champion', drawing: 'p10', ar: 'البطل', en: 'Champion', dur: 3000,
      keys: [[0, {}], [1500, { yaw: 0.3, lookX: 0.5 }], [2100, { yaw: 0, lookX: 0 }]],
      blinks: [1200, 2400],
      fx(t, c) {
        c.book = 8 * wave(t, 500);
        c.sy += 0.015 * wave(t, 500, 0.25);
        c.lift += 3 * Math.max(0, wave(t, 1000, 0.1));
        c.crown = 6 * wave(t, 500, 0.4);
        c.cane = 1.5 * wave(t, 1500);
        c.stars = 1;
      },
    },
  ];

  // compile keys → one flow track per channel
  for (const clip of CLIPS) {
    const names = new Set(Object.keys(CH));
    clip.keys.forEach(([, k]) => Object.keys(k).forEach((n) => names.add(n)));
    const start = {};
    for (const n of names) start[n] = clip.keys[0][1][n] != null ? clip.keys[0][1][n] : CH[n] != null ? CH[n] : 0;
    let cur = start; const snaps = [[0, start]];
    for (let i = 1; i < clip.keys.length; i++) { cur = Object.assign({}, cur, clip.keys[i][1]); snaps.push([clip.keys[i][0], cur]); }
    if (snaps[snaps.length - 1][0] < clip.dur) snaps.push([clip.dur, start]);
    clip._tracks = {};
    for (const n of names) clip._tracks[n] = snaps.map(([t, s]) => [t, s[n]]);
    clip._blink = blinks(clip.blinks || [], clip.dur, 0);
    clip.d = DRAWINGS[clip.drawing];
  }

  const wrap = (t, d) => ((t % d) + d) % d;
  /** Raw channels at time t: key poses + accents + idle life. */
  function channels(clip, tIn) {
    const d = clip.dur, t = wrap(tIn, d);
    const c = {};
    for (const n in clip._tracks) c[n] = flow(t, clip._tracks[n]);
    if (clip.fx) clip.fx(t, c);
    const k = clip.idle == null ? 1 : clip.idle;
    c.breath += 0.012 * lw(t, d, 2600) * k;
    c.hr += 1.5 * lw(t, d, 4400, 0.4) * k;
    c.x += 0.8 * lw(t, d, 5000, 0.2) * k;
    c.lean += 0.6 * lw(t, d, 3800, 0.6) * k;
    c.lookX += 0.06 * lw(t, d, 3600, 0.3) * k;
    c.lid = Math.max(c.lid, track(t, clip._blink));
    return c;
  }

  /** Deformer params for the rig, with follow-through, at time t. */
  function params(clip, t) {
    const c = channels(clip, t);
    const a = channels(clip, t - 90), b = channels(clip, t - 120);
    const P = {};
    const sy = c.sy, sx = 1 / Math.pow(Math.max(0.3, sy), 0.6);
    P.root = { tx: c.x, ty: -c.lift, sx, sy };
    P.body = { rot: c.lean, sx: 1 - c.breath * 0.35, sy: 1 + c.breath };
    // the head rights itself after a lean; the afro squashes a beat behind the body
    const jig = clamp(0.004 * (a.lift - c.lift) + 0.6 * (b.sy - sy) + 0.5 * (a.breath - c.breath), -0.06, 0.06);
    P.head = { rot: c.hr - 0.45 * b.lean, tx: c.hx, ty: c.hy, sx: 1 - jig * 0.5, sy: 1 + jig };
    P.face = { tx: c.yaw * 7, ty: 0 };
    const eyes = clip.d.eyes;
    eyes.forEach((e, i) => {
      P['eye' + i] = { tx: clamp(c.lookX, -1.2, 1.2) * e[2] * 0.28, ty: clamp(c.lookY, -1.2, 1.2) * e[3] * 0.24 };
      P['brow' + i] = { ty: -(c.brow + (c['brow' + i] || 0)) };
    });
    P.mouth = { sy: 1 + c.mo, sx: 1 + c.mo * 0.12 };
    for (const l of clip.d.limbs) P[l.id] = { rot: c[l.id] || 0, ty: c[l.id + 'Y'] || 0, sx: c[l.id + 'S'] || 1, sy: c[l.id + 'S'] || 1 };
    // the crown wobbles behind the head
    if (P.crown) P.crown.rot += 0.8 * (b.hr - c.hr) + 6 * (a.lift - c.lift) * 0.05;
    return { P, c };
  }

  root.Poses = { DRAWINGS, CLIPS, byId: Object.fromEntries(CLIPS.map((c) => [c.id, c])), params };
})(window);
