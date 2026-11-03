// poses.js: the 10 drawings from the reference sheet, their rig, and their loops.
//
// Units are the ORIGINAL sheet's pixels inside each pose's crop (the art itself is 2x).
// Every point and outline was read off a 10-unit grid laid over the drawing; the eye
// ellipses were fitted to the eye whites automatically.
//
// Parts are RIGID: a hand, a prop or the head moves as one piece, so nothing detailed is
// ever stretched. The only soft zones are where a part meets its parent on a flat colour
// (the collar under the beard, a white sleeve, the trousers at the hips).
(function (root) {
  'use strict';
  const M = root.Motion;
  const { flow, track, lin, wave, bell, lw, blinks, clamp } = M;
  const { Wt } = root.SpriteRig;

  // ── the drawings ──────────────────────────────────────────────────────────
  // head: [cx, cy, rx, ry] round hair + face; parts: rigid polygons hinged at `pivot`;
  // keepOffHead: outlines of things above the neck that are NOT the head (canes, books…)
  const DRAWINGS = {
    p01: {
      file: 'pose01.png', floor: 415.5, hip: [105, 300], neck: [102, 196], head: [107, 104, 86, 96],
      eyes: [[75.5, 126.5, 16.5, 15.5], [125, 125.5, 17, 15.5]], mouth: [100, 163],
    },
    p02: {
      file: 'pose02.png', floor: 417.5, hip: [136, 300], neck: [145, 196], head: [176, 108, 88, 93],
      eyes: [[132.5, 117, 16.5, 16], [181.5, 128.5, 17.5, 16.5]], mouth: [149, 162],
      parts: [{
        id: 'wave', pivot: [77, 157], f: 2,
        poly: [[2, 128], [18, 100], [64, 96], [79, 112], [80, 160], [74, 184], [86, 197], [74, 210], [40, 206], [26, 186], [2, 152]],
        sleeve: { poly: [[28, 186], [90, 192], [104, 228], [58, 238], [28, 212]], from: 238, to: 196 },
      }],
      keepOffHead: [[[262, 150], [284, 157], [242, 256], [220, 249]]],
    },
    p03: {
      file: 'pose03.png', floor: 455, hip: [137, 325], neck: [128, 236], head: [145, 150, 80, 100],
      eyes: [], mouth: [130, 200],
      parts: [
        { id: 'armL', pivot: [74, 160], f: 1.5,
          poly: [[66, -4], [100, 2], [68, 86], [63, 128], [71, 150], [76, 172], [84, 194], [92, 218], [60, 228], [30, 206], [8, 170], [0, 150], [3, 108], [14, 88], [40, 84]] },
        { id: 'armR', pivot: [231, 158], f: 1.5,
          poly: [[251, 60], [340, 78], [338, 176], [304, 180], [288, 202], [246, 242], [212, 234], [206, 212], [230, 186], [229, 166], [229, 150], [234, 130], [244, 96]] },
        { id: 'legL', pivot: [118, 335], soft: (x, y) => (1 - Wt.hinge([150, 0], [1, 0], 16)(x, y)) * Wt.hinge([0, 335], [0, 1], 22)(x, y) },
        { id: 'legR', pivot: [176, 338], soft: (x, y) => Wt.hinge([150, 0], [1, 0], 16)(x, y) * Wt.hinge([0, 338], [0, 1], 22)(x, y) },
      ],
    },
    p04: {
      file: 'pose04.png', floor: 404, hip: [92, 300], neck: [88, 196], head: [100, 105, 88, 95],
      eyes: [[64.5, 129, 16.5, 9], [115, 133.5, 17, 9.5]], mouth: [86, 158], lash: 0.3,
      keepOffHead: [[[174, 164], [194, 170], [150, 248], [136, 240]]],
    },
    p05: {
      file: 'pose05.png', floor: 414, hip: [140, 305], neck: [140, 196], head: [145, 105, 86, 95],
      eyes: [[115, 126, 17, 16], [165, 126, 17, 15]], mouth: [139, 162],
      parts: [{
        id: 'cane', pivot: [34, 270], f: 2,
        poly: [[22, 206], [41, 206], [45, 240], [69, 250], [69, 291], [43, 301], [41, 418], [23, 418], [21, 301], [4, 291], [4, 254], [22, 240]],
        sleeve: { poly: [[40, 196], [88, 196], [88, 252], [44, 252]], from: 198, to: 246 },
      }],
    },
    p06: {
      file: 'pose06.png', floor: 414, hip: [205, 300], neck: [205, 190], head: [241, 102, 85, 93],
      eyes: [[196, 112.5, 15, 15.5], [241.5, 123.5, 16.5, 15.5]], mouth: [211, 150],
      parts: [{
        id: 'pointer', pivot: [152, 226], f: 2,
        poly: [[10, 95], [25, 88], [80, 140], [106, 150], [124, 176], [150, 198], [158, 242], [114, 247], [100, 216], [74, 206], [60, 182], [58, 158]],
      }],
      // the three yellow spark strokes, measured off the drawing and redrawn live (inner end first)
      sparks: [[30.5, 138.3, 11.7, 127.8], [29.8, 156.5, 7.5, 160.4], [36.3, 174.9, 21.8, 191.9]], sparkW: 6.2, sparkColor: '#fdc666',
    },
    p07: {
      file: 'pose07.png', floor: 406, hip: [150, 295], neck: [140, 191], head: [161, 112, 84, 84],
      eyes: [[120.5, 117.5, 15.5, 15.5], [166.5, 128.5, 16.5, 15.5]], mouth: [136, 157],
      parts: [{
        id: 'hand', pivot: [80, 186], f: 2,
        sleeve: { poly: [[20, 205], [92, 205], [96, 250], [24, 250]], from: 250, to: 212 },
        poly: [[4, 160], [14, 140], [30, 129], [62, 127], [70, 150], [89, 158], [89, 190], [80, 214], [76, 232], [40, 238], [18, 225], [9, 200]],
      }],
      keepOffHead: [[[236, 144], [251, 151], [220, 222], [205, 214]]],
    },
    p08: {
      file: 'pose08.png', floor: 390, seat: 300, hip: [137, 278], neck: [138, 190], head: [152, 105, 85, 90],
      eyes: [[116.5, 128.5, 16.5, 9.5], [164.5, 130.5, 16.5, 13.5]], mouth: [138, 160], lash: 0.3,
      keepOffHead: [[[48, 179], [100, 181], [125, 193], [150, 193], [176, 181], [234, 177], [234, 292], [48, 292]]],
    },
    p09: {
      file: 'pose09.png', floor: 359, seat: 285, hip: [137, 268], neck: [134, 172], head: [172, 95, 92, 88],
      eyes: [], mouth: [139, 152],
    },
    p10: {
      file: 'pose10.png', floor: 428, hip: [115, 305], neck: [110, 202], head: [133, 130, 88, 88],
      eyes: [[91.5, 132.5, 15.5, 14.5], [139, 140, 16, 15]], mouth: [107, 172],
      parts: [
        { id: 'book', pivot: [206, 166], f: 1.5,
          poly: [[221, 80], [300, 97], [297, 140], [297, 186], [270, 196], [250, 213], [226, 231], [199, 228], [193, 205], [205, 182], [204, 163], [212, 125]] },
        { id: 'crown', pivot: [172, 56], f: 1.5, onHead: true,
          poly: [[124, 2], [172, 2], [226, 28], [226, 54], [202, 62], [172, 60], [136, 46], [122, 36]] },
      ],
    },
  };

  /** The deformer stack of one drawing: local parts first, the root last. */
  function deformers(d) {
    const D = [];
    d.eyes.forEach((e, i) => D.push({ id: 'eye' + i, pivot: [e[0], e[1]], weight: Wt.ellipse(e[0], e[1], e[2] * 0.55, e[3] * 0.6, 0.6) }));
    d.eyes.forEach((e, i) => D.push({ id: 'brow' + i, pivot: [e[0], e[1] - 31], weight: Wt.ellipse(e[0], e[1] - 31, 18, 7, 0.45) }));
    if (d.mouth) D.push({ id: 'mouth', pivot: [d.mouth[0], d.mouth[1] - 7], weight: Wt.circle(d.mouth[0], d.mouth[1], 9, 17) });
    const partW = {};
    for (const p of d.parts || []) {
      let w;
      if (p.soft) w = p.soft;
      else {
        const rigid = Wt.poly(p.poly, p.f == null ? 2 : p.f);
        if (p.sleeve) {
          // the sleeve between the part and the body stretches (flat white, so it never shows)
          const s = p.sleeve, inS = Wt.poly(s.poly, 2);
          w = (x, y) => Math.max(rigid(x, y), inS(x, y) * (s.from > s.to ? 1 - clamp((y - s.to) / (s.from - s.to), 0, 1) : clamp((y - s.from) / (s.to - s.from), 0, 1)));
        } else w = rigid;
      }
      partW[p.id] = w;
      D.push({ id: p.id, pivot: p.pivot, weight: w });
    }
    const [hx, hy, hrx, hry] = d.head;
    const off = (d.parts || []).filter((p) => !p.onHead && !p.soft).map((p) => partW[p.id])
      .concat((d.keepOffHead || []).map((poly) => Wt.poly(poly, 2)));
    D.push({ id: 'head', pivot: d.neck, weight: Wt.minus(Wt.mul(Wt.ellipse(hx, hy, hrx * 1.3, hry * 1.3, 0.05), Wt.above(d.neck[1] - 6, d.neck[1] + 10)), ...off) });
    D.push({ id: 'body', pivot: d.hip, weight: Wt.above(d.hip[1] - 14, d.hip[1] + 22) });
    D.push({ id: 'root', pivot: [d.hip[0], d.seat || d.floor], weight: d.seat ? Wt.above(d.seat - 8, d.seat + 10) : Wt.all() });
    return D;
  }
  for (const k in DRAWINGS) { DRAWINGS[k].scale = 2; DRAWINGS[k].deformers = deformers(DRAWINGS[k]); }

  // ── the loops ─────────────────────────────────────────────────────────────
  // Channels: x, lift, sy (squash), lean, breath, hr/hx/hy (head), lookX/lookY (pupils),
  // mo (mouth), brow/brow0/brow1, lid, and one per part (its rotation, or `<id>Y` to move).
  const CH = { x: 0, lift: 0, sy: 1, lean: 0, breath: 0, hr: 0, hx: 0, hy: 0, lookX: 0, lookY: 0, mo: 0, brow: 0, brow0: 0, brow1: 0, lid: 0 };
  /** Syllables: an open-close every ~170 ms, varied, closed at both ends of the window. */
  function talk(t, a, b, amt) {
    if (t <= a || t >= b) return 0;
    const k = Math.floor((t - a) / 170);
    const s = Math.abs(Math.sin(((t - a) / 170) * Math.PI));
    const env = Math.min(1, (t - a) / 150, (b - t) / 150);
    return (amt || 0.14) * s * (0.55 + 0.45 * M.seeded(k, 7)) * env;
  }

  const CLIPS = [
    {
      id: 'idle', drawing: 'p01', ar: 'وقفة الأستاذ', en: 'Idle', dur: 5600,
      keys: [
        [0, {}], [1300, {}],
        // a glance: the pupils lead, the head follows a beat later (blink on the turn)
        [1600, { lookX: 0.85 }], [1800, { lookX: 0.85, hr: -2.5, hx: 1.5 }], [2800, { lookX: 0.85, hr: -2.5, hx: 1.5 }],
        [3100, { lookX: 0 }], [3300, { hr: 0, hx: 0 }],
        // a happy bob: dip, pop, settle
        [3700, { sy: 0.965 }], [3870, { sy: 1.035, lift: 4, brow: 2.5 }], [4050, { sy: 0.985, lift: 0 }], [4250, { sy: 1, brow: 0 }],
      ],
      blinks: [1560, 3150, 4800, 5050],
    },
    {
      id: 'wave', drawing: 'p02', ar: 'أهلاً!', en: 'Hello', dur: 2520,
      keys: [[0, {}]],
      blinks: [900, 2050],
      fx(t, c) {
        c.wave = 10 * wave(t, 420);
        c.sy += 0.012 * wave(t, 420, 0.25);
        c.hr += 2.2 * wave(t, 840, 0.1);
        c.mo += 0.06 + 0.06 * Math.abs(wave(t, 420));
        c.brow += 1.2 * Math.max(0, wave(t, 840, 0.2));
        c.lookX += 0.15 * wave(t, 2520);
      },
    },
    {
      id: 'jump', drawing: 'p03', ar: 'احتفال', en: 'Celebrate', dur: 1400, inAir: true,
      keys: [[0, {}]],
      blinks: [],
      fx(t, c) {
        const p = t / 1400, cs = Math.cos(Math.PI * p);
        c.lift += 34 * Math.sin(Math.PI * p);
        // stretch while moving, squash at the bottom of each hop (volume kept by the rig)
        c.sy += 0.045 * Math.abs(cs) * (1 - Math.pow(cs, 16)) - 0.075 * Math.pow(cs, 16);
        c.armL = -6 * Math.sin(2 * Math.PI * p);
        c.armR = 6 * Math.sin(2 * Math.PI * p + 0.6);
        c.legL = 5 * Math.sin(2 * Math.PI * p + 0.4);
        c.legR = -7 * Math.sin(2 * Math.PI * p + 0.9);
        c.stars = 1;
      },
    },
    {
      id: 'confident', drawing: 'p04', ar: 'واثق', en: 'Confident', dur: 4200,
      keys: [
        [0, {}], [700, { hr: -3.5, lean: -1.5, hy: -1 }], [1300, { hr: -3.5 }],
        [1500, { brow1: 3, lookX: 0.6 }], [1700, { brow1: 0 }], [1850, { brow1: 3 }], [2100, { brow1: 0, lookX: 0.1 }],
        [2600, { lookX: -0.5 }], [2800, { hr: 2.5, lean: 0, hy: 0 }],
        [3050, { hy: 2.5 }], [3200, { hy: 0 }], [3350, { hy: 2.5 }], [3500, { hy: 0 }],
        [3900, { hr: 0, lookX: 0 }],
      ],
      blinks: [2620],
    },
    {
      id: 'determined', drawing: 'p05', ar: 'جاهز للتحدي', en: 'Determined', dur: 3000,
      keys: [
        [0, {}], [500, {}],
        [760, { caneY: -14, sy: 1.025, hy: -1 }],
        [900, { caneY: 1.5, sy: 0.93, hy: 2.5, brow: -2 }],
        [1030, { caneY: 0, sy: 1.035, hy: -1 }],
        [1160, { sy: 1, hy: 0, brow: 0 }],
        [1700, { lookX: -0.7 }], [1850, { hr: 2 }], [2300, { lookX: 0 }], [2450, { hr: 0 }],
        [2600, { hy: 2.5 }], [2750, { hy: 0 }],
      ],
      blinks: [1680, 2320],
      fx(t, c) { c.dust = lin(t, 900, 1400); },
    },
    {
      id: 'teaching', drawing: 'p06', ar: 'يشرح الدرس', en: 'Teaching', dur: 3600,
      keys: [
        [0, {}], [400, { pointer: -5 }], [520, { pointer: 4 }], [640, { pointer: -5 }], [760, { pointer: 4 }], [900, { pointer: 0 }],
        [1650, { lookX: -1, lookY: -0.4 }], [1850, { hr: -3, hx: -1.5 }], [2350, { lookX: 0, lookY: 0 }], [2550, { hr: 1.5, hx: 0 }], [3200, { hr: 0 }],
      ],
      blinks: [1630, 2340],
      fx(t, c) {
        c.mo += talk(t, 900, 1600) + talk(t, 2500, 3450);
        c.sparkS = 1 + 0.4 * (bell(lin(t, 480, 700)) + bell(lin(t, 720, 940))) + 0.08 * wave(t, 900);
        c.hy += 1 * Math.abs(wave(t, 600)) * (lin(t, 900, 1000) - lin(t, 1500, 1600) + lin(t, 2500, 2600) - lin(t, 3350, 3450));
      },
    },
    {
      id: 'worried', drawing: 'p07', ar: 'أوه لا!', en: 'Uh-oh', dur: 2600,
      keys: [
        [0, {}], [300, { lean: -1.5, x: -2 }],
        [850, { lookX: -0.8 }], [1000, { hr: 2 }], [1300, { lookX: 0.8 }], [1450, { hr: -2 }], [1700, { lookX: 0 }], [1850, { hr: 0 }],
        [2200, { lean: 0, x: 0 }],
      ],
      blinks: [830, 1680],
      fx(t, c) {
        c.x += 0.6 * wave(t, 100);
        c.hand = 3 * wave(t, 130);
        c.mo += 0.05 * lw(t, 2600, 160);
        c.brow += 1 + 1 * wave(t, 1300);
        c.sweat = (t % 2600) / 2600;
      },
    },
    {
      id: 'reading', drawing: 'p08', ar: 'يقرأ', en: 'Reading', dur: 5200,
      keys: [
        [0, { lookX: -0.7, hr: -1.2 }], [900, { lookX: 0.7, hr: 1.2 }],
        [1050, { lookX: -0.7, hr: -1.2, lookY: 0.2 }], [1950, { lookX: 0.7, hr: 1.2 }],
        [2100, { lookX: -0.7, lookY: 0.4, hr: -1.2 }], [3000, { lookX: 0.7, hr: 1.2 }],
        [3250, { lookX: 0, lookY: -0.9, brow: 3 }], [3400, { hr: -3, hy: -1.5, mo: 0.12 }],
        [3900, {}],
        [4300, { lookX: -0.7, lookY: 0, brow: 0, hr: -1.2, hy: 0, mo: 0 }],
      ],
      blinks: [1000, 3230, 4400],
    },
    {
      id: 'sleeping', drawing: 'p09', ar: 'نائم', en: 'Sleeping', dur: 4400,
      keys: [[0, {}], [2600, { hr: 2.5, hy: 2.5 }], [3000, { hr: 5, hy: 4 }], [3150, { hr: -1.5, hy: -1.5 }], [3500, { hr: 0, hy: 0 }]],
      blinks: [],
      idle: 0.5,
      fx(t, c) {
        c.breath += 0.026 * wave(t, 2200, -0.25);
        c.mo += 0.07 * (wave(t, 2200, -0.25) + 1) / 2;
        c.hr += 1.2 * wave(t, 2200, -0.1);
        c.zzz = 1;
      },
    },
    {
      id: 'champion', drawing: 'p10', ar: 'البطل', en: 'Champion', dur: 3000,
      keys: [[0, {}], [1500, { lookX: 0.5 }], [1650, { hr: -2 }], [2100, { lookX: 0 }], [2250, { hr: 0 }]],
      blinks: [1480, 2400],
      fx(t, c) {
        c.book = 4.5 * wave(t, 500);
        c.sy += 0.013 * wave(t, 500, 0.25);
        c.lift += 3 * Math.max(0, wave(t, 1000, 0.1));
        c.crown = 4 * wave(t, 500, 0.4);
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
  /** Raw channels at time t: key poses + accents + idle life (periods divide the loop). */
  function channels(clip, tIn) {
    const d = clip.dur, t = wrap(tIn, d);
    const c = {};
    for (const n in clip._tracks) c[n] = flow(t, clip._tracks[n]);
    if (clip.fx) clip.fx(t, c);
    const k = clip.idle == null ? 1 : clip.idle;
    c.breath += 0.012 * lw(t, d, 2600) * k;
    c.hr += 1.2 * lw(t, d, 4400, 0.4) * k;
    c.x += 0.6 * lw(t, d, 5000, 0.2) * k;
    c.lean += 0.5 * lw(t, d, 3800, 0.6) * k;
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
    const jig = clamp(0.003 * (a.lift - c.lift) + 0.45 * (b.sy - sy) + 0.4 * (a.breath - c.breath), -0.035, 0.035);
    P.head = { rot: c.hr - 0.45 * b.lean, tx: c.hx, ty: c.hy, sx: 1 - jig * 0.5, sy: 1 + jig };
    clip.d.eyes.forEach((e, i) => {
      P['eye' + i] = { tx: clamp(c.lookX, -1.1, 1.1) * e[2] * 0.26, ty: clamp(c.lookY, -1.1, 1.1) * e[3] * 0.22 };
      P['brow' + i] = { ty: -(c.brow + (c['brow' + i] || 0)) };
    });
    P.mouth = { sy: 1 + clamp(c.mo, -0.1, 0.22), sx: 1 + clamp(c.mo, -0.1, 0.22) * 0.1 };
    for (const p of clip.d.parts || []) P[p.id] = { rot: c[p.id] || 0, ty: c[p.id + 'Y'] || 0 };
    if (P.crown) P.crown.rot += 0.8 * (b.hr - c.hr) + 0.3 * (a.lift - c.lift);
    return { P, c };
  }

  root.Poses = { DRAWINGS, CLIPS, byId: Object.fromEntries(CLIPS.map((c) => [c.id, c])), params };
})(window);
