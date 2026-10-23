/*
 * WordMotion: type a word, get a pen-drawn wordmark animation.
 *
 * Every letter is a monoline centreline drawn with flat (butt) ends and
 * revealed with stroke-dashoffset, the way the "More" hero does it. The first
 * letter of a word is swapped for a tall looped "swash" capital, like the
 * looped M of the original.
 *
 * Units: 1 unit = 1 px of the reference recording (1156 px wide phone).
 * Baseline is y = 0, up is negative. Stroke width 52, x-height 206.
 */
(function (root) {
  'use strict';

  const SW = 52;            // stroke width
  const XH = -206;          // x-height (flat tops)
  const CY = -103;          // bowl centre
  const RY = 84;            // bowl centreline radius, vertical (outer 213 tall + overshoot)
  const ASC = -300;         // ascender top (flat)
  const DSC = 92;           // descender bottom (flat)
  const NUM = -290;         // figure height
  const BAR = 44;           // f / t crossbar weight

  const r2 = (v) => Math.round(v * 100) / 100;

  // ---------------------------------------------------------------------
  // Path builder
  // ---------------------------------------------------------------------
  function Path() { this.s = ''; this.x = 0; this.y = 0; }
  Path.prototype.M = function (x, y) { this.s += `M${r2(x)} ${r2(y)}`; this.x = x; this.y = y; return this; };
  Path.prototype.L = function (x, y) { this.s += `L${r2(x)} ${r2(y)}`; this.x = x; this.y = y; return this; };
  Path.prototype.C = function (a, b, c, d, x, y) {
    this.s += `C${r2(a)} ${r2(b)} ${r2(c)} ${r2(d)} ${r2(x)} ${r2(y)}`; this.x = x; this.y = y; return this;
  };
  // Elliptical arc from angle a0 to a1 (degrees, SVG orientation: 0 = right,
  // 90 = down). Decreasing angles run counter-clockwise on screen.
  Path.prototype.A = function (cx, cy, rx, ry, a0, a1, sq) {
    sq = sq || 1;
    const rad = Math.PI / 180;
    const n = Math.max(1, Math.ceil(Math.abs(a1 - a0) / 90 - 1e-9));
    const step = (a1 - a0) / n;
    const k = (4 / 3) * Math.tan((step * rad) / 4) * sq;
    let t = a0 * rad;
    const pt = (a) => [cx + rx * Math.cos(a), cy + ry * Math.sin(a)];
    const p0 = pt(t);
    if (!this.s) this.M(p0[0], p0[1]);
    else if (Math.abs(this.x - p0[0]) > 0.01 || Math.abs(this.y - p0[1]) > 0.01) this.L(p0[0], p0[1]);
    for (let i = 0; i < n; i++) {
      const t1 = t + step * rad;
      const a = pt(t), b = pt(t1);
      this.C(
        a[0] - k * rx * Math.sin(t), a[1] + k * ry * Math.cos(t),
        b[0] + k * rx * Math.sin(t1), b[1] - k * ry * Math.cos(t1),
        b[0], b[1]
      );
      t = t1;
    }
    return this;
  };
  Path.prototype.toString = function () { return this.s; };
  const P = () => new Path();

  // Point transform for absolute path data (used to mirror figures).
  function mapPath(d, f) {
    return d.replace(/(-?\d*\.?\d+)\s+(-?\d*\.?\d+)/g, (_, x, y) => {
      const p = f(+x, +y);
      return `${r2(p[0])} ${r2(p[1])}`;
    });
  }

  // A stroke: { d, t: [start, end] as fraction of the letter's time,
  //             w: width, join, clip: [x0, y0, x1, y1] }
  const S = (d, t, o) => Object.assign({ d: String(d), t: t }, o || {});
  const CLIP_XH = [-200, XH, 600, 0];   // keep diagonals flat at x-height and baseline

  // ---------------------------------------------------------------------
  // Lowercase
  // ---------------------------------------------------------------------
  const LC = {};

  // o: starts at 10 o'clock and runs counter-clockwise (as in the recording)
  LC.o = () => ({
    adv: 230,
    s: [S('M45.04 -148.47C28.63 -121.53 28.15 -77.92 48.06 -50.37C69.25 -21.06 113.03 -10.05 151.55 -24.9' +
      'C177.75 -35 198.52 -72.38 197.76 -101.19C196.59 -145.77 172.94 -178.07 134.14 -184.16' +
      'C92 -190.78 58.86 -177.45 43.12 -145.75L41.4 -142.2', [0, 1])],
  });

  // e: thin crossbar and the bowl are drawn at the same time
  LC.e = () => ({
    adv: 219,
    s: [
      S('M30 -102.25L210.75 -102.25', [0, 0.5], { w: 38 }),
      S('M184.75 -84L184 -104.15C190 -160.18 153.76 -183.36 113.75 -186.25C62.78 -189.93 29.4 -153.76 31.5 -99.25' +
        'C33.25 -53.7 65.37 -20.25 111.5 -19C130.38 -18.49 143.5 -20 158.5 -27', [0.06, 1]),
    ],
  });

  // r: stem bottom-up, then the arm
  LC.r = () => ({
    adv: 126,
    s: [
      S(P().M(34, 0).L(34, XH), [0, 0.55]),
      S('M31 -121C40 -158 60.69 -170.06 83 -173C111.49 -176.76 114.4 -169 125.5 -164.4', [0.5, 1]),
    ],
  });

  const bowlR = (cx) => P().A(cx, CY, 80, RY, 205, 515);     // bowl right of a stem (b, p)
  const bowlL = (cx) => P().A(cx, CY, 80, RY, -25, -335);    // bowl left of a stem (a, d, q, g)

  LC.a = () => ({ adv: 226, s: [S(bowlL(112), [0, 0.72]), S(P().M(192, XH).L(192, 0), [0.42, 1])] });
  LC.b = () => ({ adv: 226, s: [S(P().M(34, ASC).L(34, 0), [0, 0.45]), S(bowlR(114), [0.3, 1])] });
  LC.c = () => ({ adv: 204, s: [S(P().A(109, CY, 77, RY, -40, -320, 1.03), [0, 1])] });
  LC.d = () => ({ adv: 226, s: [S(bowlL(112), [0, 0.7]), S(P().M(192, ASC).L(192, 0), [0.35, 1])] });
  LC.f = () => ({
    adv: 140,
    s: [
      S(P().M(136, -262).C(124, -271, 110, -274, 95, -274).C(66, -274, 50, -258, 50, -226).L(50, 0), [0, 0.72]),
      S(P().M(8, -184).L(126, -184), [0.5, 1], { w: BAR }),
    ],
  });
  LC.g = () => ({
    adv: 226,
    s: [
      S(bowlL(112), [0, 0.65]),
      S(P().M(192, XH).L(192, 20).C(192, 52, 168, 66, 128, 66).C(98, 66, 72, 59, 52, 44), [0.35, 1]),
    ],
  });
  const arch = (x0, x1) => {
    const m = (x0 + x1) / 2;
    return P().M(x0, -122).C(x0 + 7, -160, m - 36, -180, m + 2, -180)
      .C(x1 - 26 + 2, -180, x1, -156, x1, -114).L(x1, 0);
  };
  LC.h = () => ({ adv: 212, s: [S(P().M(34, 0).L(34, ASC), [0, 0.5]), S(arch(34, 178), [0.38, 1])] });
  LC.i = () => ({ adv: 68, s: [S(P().M(34, XH).L(34, 0), [0, 0.7]), S(P().M(34, -246).L(34, -298), [0.66, 1])] });
  LC.j = () => ({
    adv: 80,
    s: [
      S(P().M(44, XH).L(44, 24).C(44, 54, 30, 66, 6, 66).L(-12, 66), [0, 0.72]),
      S(P().M(44, -246).L(44, -298), [0.68, 1]),
    ],
  });
  LC.k = () => ({
    adv: 204,
    s: [
      S(P().M(34, ASC).L(34, 0), [0, 0.45]),
      S(P().M(186, -232).L(48, -78), [0.32, 0.75], { clip: CLIP_XH }),
      S(P().M(96, -128).L(194, 18), [0.55, 1], { clip: CLIP_XH }),
    ],
  });
  LC.l = () => ({ adv: 68, s: [S(P().M(34, ASC).L(34, 0), [0, 1])] });
  LC.m = () => ({
    adv: 300,
    s: [S(P().M(34, 0).L(34, XH), [0, 0.36]), S(arch(34, 150), [0.26, 0.7]), S(arch(150, 266), [0.56, 1])],
  });
  LC.n = () => ({ adv: 212, s: [S(P().M(34, 0).L(34, XH), [0, 0.48]), S(arch(34, 178), [0.36, 1])] });
  LC.p = () => ({ adv: 226, s: [S(P().M(34, XH).L(34, DSC), [0, 0.45]), S(bowlR(114), [0.3, 1])] });
  LC.q = () => ({ adv: 226, s: [S(bowlL(112), [0, 0.7]), S(P().M(192, XH).L(192, DSC), [0.35, 1])] });
  LC.s = () => ({
    adv: 190,
    s: [S(P().M(154, -164).C(144, -181, 122, -188, 96, -188).C(62, -188, 40, -171, 40, -147)
      .C(40, -119, 66, -111, 97, -104).C(130, -96, 158, -86, 158, -56).C(158, -30, 133, -18, 97, -18)
      .C(66, -18, 44, -29, 32, -49), [0, 1])],
  });
  LC.t = () => ({
    adv: 132,
    s: [
      S(P().M(50, -262).L(50, -64).C(50, -36, 62, -24, 88, -24).C(100, -24, 110, -26, 120, -29), [0, 0.75]),
      S(P().M(8, -184).L(122, -184), [0.48, 1], { w: BAR }),
    ],
  });
  LC.u = () => ({
    adv: 212,
    s: [
      S(P().M(34, XH).L(34, -92).C(34, -48, 58, -22, 100, -22).C(142, -22, 172, -50, 178, -88), [0, 0.7]),
      S(P().M(178, XH).L(178, 0), [0.42, 1]),
    ],
  });
  LC.v = () => ({
    adv: 214,
    s: [S(P().M(14, -246).L(107, 12).L(200, -246), [0, 1], { join: 'miter', clip: CLIP_XH })],
  });
  LC.w = () => ({
    adv: 322,
    s: [S(P().M(16, -246).L(86, 12).L(161, -236).L(236, 12).L(306, -246), [0, 1], { join: 'miter', clip: CLIP_XH })],
  });
  LC.x = () => ({
    adv: 206,
    s: [
      S(P().M(18, -240).L(190, 34), [0, 0.6], { clip: CLIP_XH }),
      S(P().M(188, -240).L(16, 34), [0.4, 1], { clip: CLIP_XH }),
    ],
  });
  LC.y = () => ({
    adv: 214,
    s: [
      S(P().M(14, -246).L(108, 4), [0, 0.5], { clip: [-200, XH, 600, 0] }),
      S(P().M(200, -246).L(60, 130), [0.36, 1], { clip: [-200, XH, 600, DSC] }),
    ],
  });
  LC.z = () => ({
    adv: 198,
    s: [S(P().M(16, -180).L(176, -180).L(24, -26).L(184, -26), [0, 1], { join: 'miter', clip: [6, -260, 192, 40] })],
  });

  // Figures and punctuation (same skeleton rules)
  LC['0'] = () => ({ adv: 214, s: [S(P().A(107, -145, 75, 119, 214, -150, 1.03), [0, 1])] });
  LC['1'] = () => ({
    adv: 170,
    s: [S(P().M(44, -224).L(116, -284).L(116, 0), [0, 1], { join: 'miter', clip: [-50, NUM, 400, 0] })],
  });
  LC['2'] = () => ({
    adv: 210,
    s: [S(P().M(36, -222).C(40, -262, 74, -284, 108, -284).C(148, -284, 176, -258, 176, -222)
      .C(176, -196, 164, -178, 140, -154).L(34, -26).L(194, -26), [0, 1], { join: 'miter', clip: [6, -400, 204, 0] })],
  });
  LC['3'] = () => ({
    adv: 212,
    s: [S(P().M(38, -258).C(58, -277, 82, -284, 106, -284).C(146, -284, 172, -262, 172, -226)
      .C(172, -190, 146, -166, 100, -166).C(152, -166, 180, -138, 180, -94).C(180, -48, 148, -18, 104, -18)
      .C(74, -18, 50, -30, 32, -52), [0, 1])],
  });
  LC['4'] = () => ({
    adv: 222,
    s: [S(P().M(152, 20).L(152, -282).L(18, -86).L(214, -86), [0, 1], { join: 'miter', clip: [-50, NUM, 400, 0] })],
  });
  LC['5'] = () => ({
    adv: 212,
    s: [S(P().M(172, -264).L(64, -264).L(50, -158).C(70, -170, 90, -176, 110, -176)
      .C(154, -176, 182, -144, 182, -98).C(182, -50, 148, -18, 104, -18).C(72, -18, 48, -32, 32, -56), [0, 1],
      { join: 'miter' })],
  });
  const six = () => P().M(158, -262).C(142, -278, 124, -284, 106, -284).C(60, -284, 32, -236, 32, -142)
    .C(32, -60, 64, -18, 108, -18).C(150, -18, 180, -50, 180, -96).C(180, -142, 150, -172, 110, -172)
    .C(72, -172, 42, -150, 34, -114);
  LC['6'] = () => ({ adv: 212, s: [S(six(), [0, 1])] });
  LC['7'] = () => ({
    adv: 200,
    s: [S(P().M(20, -264).L(182, -264).L(78, 30), [0, 1], { join: 'miter', clip: [-50, NUM, 400, 0] })],
  });
  LC['8'] = () => ({
    adv: 212,
    s: [S(P().M(106, -166).C(70, -166, 44, -188, 44, -224).C(44, -260, 72, -284, 106, -284)
      .C(140, -284, 168, -260, 168, -224).C(168, -188, 142, -166, 106, -166).C(62, -166, 32, -138, 32, -94)
      .C(32, -48, 64, -18, 106, -18).C(148, -18, 180, -48, 180, -94).C(180, -138, 150, -166, 106, -166), [0, 1])],
  });
  LC['9'] = () => ({ adv: 212, s: [S(mapPath(String(six()), (x, y) => [212 - x, -302 - y]), [0, 1])] });
  LC['.'] = () => ({ adv: 76, s: [S(P().M(38, 0).L(38, -52), [0, 1])] });
  LC[','] = () => ({ adv: 76, s: [S(P().M(40, -52).L(40, -6).L(22, 44), [0, 1], { join: 'miter' })] });
  LC['!'] = () => ({ adv: 80, s: [S(P().M(40, ASC).L(40, -86), [0, 0.7]), S(P().M(40, -52).L(40, 0), [0.7, 1])] });
  LC['?'] = () => ({
    adv: 196,
    s: [
      S(P().M(26, -228).C(32, -268, 64, -288, 100, -288).C(142, -288, 170, -262, 170, -228)
        .C(170, -190, 140, -174, 112, -158).C(98, -150, 92, -136, 92, -116).L(92, -86), [0, 0.75]),
      S(P().M(92, -52).L(92, 0), [0.75, 1]),
    ],
  });
  LC['-'] = () => ({ adv: 150, s: [S(P().M(18, -110).L(132, -110), [0, 1], { w: 46 })] });
  LC["'"] = () => ({ adv: 72, s: [S(P().M(36, ASC).L(36, -214), [0, 1])] });
  LC['&'] = () => ({
    adv: 250,
    s: [S(P().M(232, -6).L(78, -176).C(56, -200, 50, -216, 50, -232).C(50, -264, 76, -288, 108, -288)
      .C(140, -288, 164, -266, 164, -238).C(164, -206, 140, -190, 108, -168).C(62, -136, 34, -114, 34, -78)
      .C(34, -40, 66, -18, 106, -18).C(154, -18, 196, -50, 214, -120), [0, 1])],
  });
  LC[' '] = () => ({ adv: 110, s: [] });

  // ---------------------------------------------------------------------
  // Swash capitals (first letter). Tall, looped, one or two strokes.
  // Legs that land on the baseline are cut flat by clip at +7 (the round
  // overshoot), like the M in the recording.
  // ---------------------------------------------------------------------
  const CAPCLIP = [-400, -600, 1200, 8];
  const SC = {};

  // The reference M, fitted to the recording (left leg, arch, loop, second hump).
  const M_PATH =
    'M28.25 30.7C39.25 -104.65 125.9 -298.28 213.9 -299.25C269.35 -299.86 291.25 -225.45 284.4 -149.5' +
    'C279.72 -97.64 256.06 -19.9 203 -20.4C169.83 -20.71 155.25 -46.13 165.5 -89.4' +
    'C178.22 -143.11 248.15 -237.14 338 -231.85C384.27 -229.13 393.57 -195.84 394.4 -156.5' +
    'C395.54 -102.34 365 -36.9 351 11L341.5 32.5';
  SC.m = () => ({ adv: 426, s: [S(M_PATH, [0, 1], { clip: CAPCLIP })] });

  // Shared opening of the M: rising concave leg and arch top.
  const LEG = 'M28 33C38 -102 116 -299 214 -299';

  SC.a = () => ({
    adv: 372,
    s: [
      S(LEG + 'C282 -299 318 -232 318 -150C318 -96 314 -46 312 0L311 30', [0, 0.7], { clip: CAPCLIP }),
      S(P().M(92, -150).C(120, -96, 172, -72, 236, -86).C(286, -98, 330, -118, 366, -130), [0.55, 1], { w: 46 }),
    ],
  });
  SC.b = () => ({
    adv: 350,
    s: [S(LEG + 'C276 -299 300 -268 300 -234C300 -196 266 -170 210 -170C180 -170 156 -178 150 -190' +
      'C146 -200 158 -206 172 -200C186 -194 200 -178 232 -172C290 -162 326 -128 326 -84' +
      'C326 -40 288 -18 222 -18C160 -18 110 -32 72 -58', [0, 1], { clip: CAPCLIP })],
  });
  SC.c = () => ({
    adv: 330,
    s: [S(P().M(218, -206).C(250, -216, 262, -244, 252, -266).C(240, -292, 208, -300, 180, -300)
      .C(94, -300, 34, -230, 34, -146).C(34, -62, 94, -18, 178, -18).C(230, -18, 280, -40, 314, -80), [0, 1])],
  });
  SC.d = () => ({
    adv: 382,
    s: [S(LEG + 'C306 -299 360 -230 360 -152C360 -66 300 -18 206 -18C140 -18 74 -32 14 -66', [0, 1], { clip: CAPCLIP })],
  });
  SC.e = () => ({
    adv: 320,
    s: [S(P().M(272, -258).C(250, -286, 218, -300, 182, -300).C(122, -300, 84, -266, 84, -226)
      .C(84, -192, 112, -170, 150, -168).C(170, -167, 182, -178, 176, -188).C(170, -198, 150, -192, 140, -170)
      .C(132, -154, 112, -160, 88, -150).C(56, -136, 38, -112, 38, -84).C(38, -40, 84, -18, 160, -18)
      .C(214, -18, 260, -36, 300, -70), [0, 1])],
  });
  SC.f = () => ({
    adv: 330,
    s: [
      S(P().M(28, -238).C(60, -290, 120, -306, 186, -292).C(240, -280, 280, -284, 320, -300), [0, 0.45], { w: 46 }),
      S(P().M(42, 33).C(60, -80, 110, -200, 170, -290), [0.3, 0.8], { clip: CAPCLIP }),
      S(P().M(84, -152).L(250, -152), [0.65, 1], { w: 44 }),
    ],
  });
  SC.g = () => ({
    adv: 352,
    s: [S(P().M(282, -236).C(262, -280, 224, -300, 180, -300).C(94, -300, 34, -230, 34, -146)
      .C(34, -62, 94, -18, 176, -18).C(250, -18, 300, -60, 300, -130).L(300, -136).L(176, -136), [0, 1],
      { join: 'round' })],
  });
  SC.h = () => ({
    adv: 384,
    s: [
      S(P().M(52, -244).C(72, -290, 118, -306, 138, -288).C(150, -276, 146, -252, 136, -220)
        .C(110, -140, 76, -50, 58, 0).L(48, 33), [0, 0.45], { clip: CAPCLIP }),
      S(P().M(330, -300).C(310, -200, 290, -100, 282, 0).L(280, 33), [0.3, 0.75], { clip: CAPCLIP }),
      S(P().M(36, -132).C(120, -156, 200, -146, 290, -154).C(322, -157, 346, -164, 372, -178), [0.55, 1], { w: 46 }),
    ],
  });
  SC.i = () => ({
    adv: 260,
    s: [
      S(P().M(20, -248).C(60, -296, 130, -306, 196, -290).C(220, -284, 240, -284, 256, -292), [0, 0.45], { w: 46 }),
      S(P().M(150, -292).C(130, -200, 100, -110, 70, -48).C(56, -18, 30, -6, 12, -24), [0.3, 1]),
    ],
  });
  SC.j = () => ({
    adv: 300,
    s: [
      S(P().M(40, -248).C(80, -296, 150, -306, 216, -290).C(240, -284, 262, -284, 282, -292), [0, 0.42], { w: 46 }),
      S(P().M(196, -294).C(180, -170, 164, -40, 140, 22).C(124, 64, 92, 84, 60, 80).C(28, 76, 16, 50, 32, 20), [0.28, 1]),
    ],
  });
  SC.k = () => ({
    adv: 340,
    s: [
      S(P().M(52, -244).C(72, -290, 118, -306, 138, -288).C(150, -276, 146, -252, 136, -220)
        .C(110, -140, 76, -50, 58, 0).L(48, 33), [0, 0.45], { clip: CAPCLIP }),
      S(P().M(332, -286).C(272, -252, 196, -186, 140, -150).C(120, -137, 126, -122, 146, -124)
        .C(204, -128, 246, -86, 272, -26).L(286, 33), [0.38, 1], { clip: CAPCLIP }),
    ],
  });
  SC.l = () => ({
    adv: 330,
    s: [S(P().M(232, -232).C(252, -262, 248, -298, 216, -300).C(178, -302, 152, -262, 142, -204)
      .C(130, -134, 106, -68, 78, -42).C(60, -26, 32, -20, 30, -38).C(28, -58, 62, -60, 92, -40)
      .C(132, -16, 200, -18, 240, -18).C(270, -18, 296, -26, 322, -40), [0, 1])],
  });
  SC.n = () => ({
    adv: 398,
    s: [S(LEG + 'C256 -299 268 -250 272 -180C276 -100 280 -20 316 -20C350 -20 362 -80 366 -160' +
      'C370 -230 374 -276 392 -304', [0, 1], { clip: CAPCLIP })],
  });
  SC.o = () => ({
    adv: 326,
    s: [S(P().M(262, -236).C(240, -282, 200, -300, 160, -300).C(84, -300, 34, -230, 34, -150)
      .C(34, -70, 90, -18, 160, -18).C(234, -18, 288, -72, 288, -150).C(288, -206, 256, -244, 204, -246)
      .C(172, -247, 146, -236, 128, -218), [0, 1])],
  });
  SC.p = () => ({
    adv: 336,
    s: [S(LEG + 'C276 -299 316 -264 316 -212C316 -160 276 -128 214 -128C176 -128 146 -140 128 -158', [0, 1],
      { clip: CAPCLIP })],
  });
  SC.q = () => ({
    adv: 356,
    s: [
      S(P().A(166, -150, 130, 124, 214, -146, 1.02), [0, 0.78]),
      S(P().M(180, -66).C(220, -40, 260, -10, 330, 6), [0.62, 1], { w: 48 }),
    ],
  });
  SC.r = () => ({
    adv: 352,
    s: [S(LEG + 'C276 -299 316 -264 316 -212C316 -164 278 -136 222 -134C204 -133 196 -144 206 -152' +
      'C220 -160 240 -146 256 -120C278 -84 296 -40 314 0L326 30', [0, 1], { clip: CAPCLIP })],
  });
  SC.s = () => ({
    adv: 300,
    s: [S(P().M(268, -266).C(246, -290, 216, -300, 182, -300).C(128, -300, 92, -272, 92, -232)
      .C(92, -188, 138, -170, 182, -154).C(236, -136, 268, -112, 268, -78).C(268, -38, 226, -18, 168, -18)
      .C(110, -18, 66, -40, 40, -72).C(22, -94, 20, -116, 38, -118).C(56, -120, 66, -98, 60, -80), [0, 1])],
  });
  SC.t = () => ({
    adv: 300,
    s: [
      S(P().M(14, -240).C(54, -294, 124, -306, 190, -290).C(230, -280, 260, -282, 290, -296), [0, 0.45], { w: 46 }),
      S(P().M(160, -290).C(140, -200, 120, -110, 110, -60).C(102, -24, 120, -16, 150, -20).C(170, -23, 184, -30, 196, -40),
        [0.3, 1]),
    ],
  });
  SC.u = () => ({
    adv: 352,
    s: [
      S(P().M(20, -250).C(30, -290, 62, -300, 80, -284).C(96, -270, 84, -230, 70, -180).C(52, -112, 50, -62, 70, -38)
        .C(92, -14, 150, -12, 196, -40).C(240, -66, 270, -110, 282, -160), [0, 0.7]),
      S(P().M(300, -212).C(292, -140, 288, -60, 290, 0).L(290, 30), [0.45, 1], { clip: CAPCLIP }),
    ],
  });
  SC.v = () => ({
    adv: 330,
    s: [S(P().M(10, -246).C(28, -290, 60, -302, 80, -284).C(102, -264, 110, -180, 140, -100)
      .C(156, -56, 164, -24, 172, 0).L(176, 12).C(200, -80, 260, -230, 322, -300), [0, 1],
      { join: 'miter', clip: CAPCLIP })],
  });
  SC.w = () => ({
    adv: 470,
    s: [S(P().M(10, -246).C(28, -290, 60, -302, 80, -284).C(98, -266, 104, -180, 126, -100).C(138, -56, 144, -24, 150, 0)
      .L(154, 12).L(236, -236).L(318, 12).C(350, -90, 400, -230, 462, -300), [0, 1], { join: 'miter', clip: CAPCLIP })],
  });
  SC.x = () => ({
    adv: 340,
    s: [
      S(P().M(12, -248).C(34, -294, 82, -298, 110, -260).C(160, -190, 210, -80, 260, -36).C(286, -14, 316, -12, 330, -30),
        [0, 0.62]),
      S(P().M(300, -290).C(220, -200, 120, -90, 60, 0).L(40, 30), [0.42, 1], { clip: CAPCLIP }),
    ],
  });
  SC.y = () => ({
    adv: 340,
    s: [
      S(P().M(14, -250).C(26, -290, 60, -302, 80, -284).C(100, -264, 92, -220, 96, -180).C(100, -140, 130, -118, 170, -118)
        .C(220, -118, 262, -150, 290, -210), [0, 0.55]),
      S(P().M(320, -290).C(292, -150, 260, -20, 226, 50).C(200, 102, 150, 112, 120, 92).C(100, 78, 104, 56, 124, 50), [0.4, 1]),
    ],
  });
  SC.z = () => ({
    adv: 330,
    s: [S(P().M(30, -252).C(70, -290, 130, -300, 196, -282).C(228, -274, 264, -276, 296, -290).L(48, -24)
      .C(100, -30, 160, -16, 220, -18).C(260, -20, 290, -30, 316, -44), [0, 1], { join: 'round' })],
  });

  // ---------------------------------------------------------------------
  // Timing helpers
  // ---------------------------------------------------------------------
  function bezier(x1, y1, x2, y2) {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
    const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const fx = (t) => ((ax * t + bx) * t + cx) * t;
    const fy = (t) => ((ay * t + by) * t + cy) * t;
    const dx = (t) => (3 * ax * t + 2 * bx) * t + cx;
    return function (x) {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      let t = x;
      for (let i = 0; i < 6; i++) {
        const e = fx(t) - x, d = dx(t);
        if (Math.abs(e) < 1e-5) return fy(t);
        if (Math.abs(d) < 1e-6) break;
        t -= e / d;
      }
      let lo = 0, hi = 1; t = x;
      for (let i = 0; i < 30; i++) {
        const v = fx(t);
        if (Math.abs(v - x) < 1e-5) break;
        if (v < x) lo = t; else hi = t;
        t = (lo + hi) / 2;
      }
      return fy(t);
    };
  }
  // Curves fitted to the recording.
  const EASE = {
    draw: bezier(0.207, 0.225, 0.223, 1),   // per letter
    rise: bezier(0.334, 0.706, 0.027, 0.978),
    expoOut: bezier(0.16, 1, 0.3, 1),
    out: bezier(0.25, 0.6, 0.3, 1),
    linear: (x) => x,
  };
  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

  // ---------------------------------------------------------------------
  // Layout
  // ---------------------------------------------------------------------
  function glyphFor(ch, first, swash) {
    const lower = ch.toLowerCase();
    if (first && swash && SC[lower]) return { def: SC[lower](), swash: true };
    if (LC[lower]) return { def: LC[lower](), swash: false };
    return null;
  }

  // Kerning tweaks (units), keyed by pair. "S:" marks the swash as left glyph.
  const KERN = { 'S:m:o': 0, 'r:e': 0, 'r:a': -6, 'r:o': -6, 'r:c': -6, 'r:s': -4, 'f:o': -6, 't:o': -4 };

  function layout(word, opts) {
    const swash = opts.swash !== false;
    const out = [];
    let x = 0, prev = null, prevSw = false;
    const chars = Array.from(String(word || ''));
    let firstDone = false;
    for (const ch of chars) {
      const isLetter = /[a-z]/i.test(ch);
      const g = glyphFor(ch, isLetter && !firstDone, swash);
      if (isLetter) firstDone = true;
      if (!g) continue;
      const key = (prevSw ? 'S:' : '') + (prev || '') + ':' + ch.toLowerCase();
      if (prev && KERN[key] != null) x += KERN[key];
      out.push({ ch, x, def: g.def, swash: g.swash });
      x += g.def.adv + (opts.tracking || 0);
      prev = ch.toLowerCase(); prevSw = g.swash;
    }
    return { glyphs: out, width: x - (opts.tracking || 0) };
  }

  // ---------------------------------------------------------------------
  // Wordmark renderer
  // ---------------------------------------------------------------------
  const NS = 'http://www.w3.org/2000/svg';
  let uid = 0;
  const el = (name, attrs, parent) => {
    const e = document.createElementNS(NS, name);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };

  const DEFAULTS = {
    word: 'More',
    swash: true,
    color: '#1E4A1A',
    stagger: 0.126,         // seconds between letters
    letterDuration: 0.712,  // seconds per letter
    maxDraw: 2.0,           // cap on total draw time for long words
    tracking: 0,
  };

  /**
   * Draw a word into an SVG <g>. Returns a handle with seek(t) in seconds.
   */
  // Object.assign that skips undefined values, so callers can pass sparse options.
  function merge(base, extra) {
    const out = Object.assign({}, base);
    for (const k in extra || {}) if (extra[k] !== undefined) out[k] = extra[k];
    return out;
  }

  function timing(n, o) {
    let stagger = o.stagger;
    if (n > 1 && (n - 1) * stagger + o.letterDuration > o.maxDraw) {
      stagger = Math.max(0.02, (o.maxDraw - o.letterDuration) / (n - 1));
    }
    return { stagger, dur: o.letterDuration };
  }

  function wordmark(parent, options) {
    const o = merge(DEFAULTS, options);
    const svgRoot = parent.ownerSVGElement || parent;
    let defs = svgRoot.querySelector('defs');
    if (!defs) defs = el('defs', {}, svgRoot);
    const g = el('g', { class: 'wm-word', fill: 'none', stroke: o.color, 'stroke-width': SW }, parent);
    const lay = layout(o.word, o);
    const { stagger, dur } = timing(lay.glyphs.length, o);
    const strokes = [], letters = [];
    let minY = -213, maxY = 7;
    lay.glyphs.forEach((gl, i) => {
      const gg = el('g', { transform: `translate(${gl.x} 0)` }, g);
      const t0 = i * stagger;
      if (gl.def.s.length) letters.push({ ch: gl.ch, swash: gl.swash, start: t0, end: t0 + dur });
      gl.def.s.forEach((s) => {
        const p = el('path', { d: s.d, 'stroke-linecap': 'butt', 'stroke-linejoin': s.join || 'round' }, gg);
        if (s.w) p.setAttribute('stroke-width', s.w);
        if (s.clip) {
          const id = 'wmc' + (++uid);
          const cp = el('clipPath', { id, clipPathUnits: 'userSpaceOnUse' }, defs);
          // userSpaceOnUse resolves in the glyph's own (translated) space
          el('rect', { x: s.clip[0], y: s.clip[1], width: s.clip[2] - s.clip[0], height: s.clip[3] - s.clip[1] }, cp);
          p.setAttribute('clip-path', `url(#${id})`);
        }
        const len = p.getTotalLength();
        p.style.strokeDasharray = `${len + 2} ${len + 2}`;
        p.style.strokeDashoffset = len + 1;
        strokes.push({ el: p, len, start: t0, a: s.t[0], b: s.t[1] });
        try {
          const bb = p.getBBox();
          minY = Math.min(minY, bb.y - SW / 2); maxY = Math.max(maxY, bb.y + bb.height + SW / 2);
        } catch (e) { /* not rendered yet */ }
      });
    });
    const total = letters.length ? letters[letters.length - 1].end : 0;
    const handle = {
      el: g,
      width: lay.width,
      letters,
      top: Math.max(minY, -340),
      bottom: Math.min(maxY, 140),
      duration: total,
      // when the last letter is as far along as the recording's e when the word starts to rise
      settle: letters.length ? letters[letters.length - 1].start + 0.553 : 0,
      seek(t) {
        for (const s of strokes) {
          // one pen motion per letter; each stroke owns a slice [a, b] of it
          const lp = EASE.draw(clamp01((t - s.start) / dur));
          const p = clamp01((lp - s.a) / (s.b - s.a));
          s.el.style.strokeDashoffset = s.len * (1 - p) + (p >= 1 ? 0 : 1);
          s.el.style.visibility = p <= 0 ? 'hidden' : 'visible';
        }
      },
      setColor(c) { g.setAttribute('stroke', c); },
      remove() { g.remove(); },
    };
    handle.seek(0);
    return handle;
  }

  // Static SVG markup of a fully drawn word (used for export and the product label).
  function staticSVG(word, opts) {
    const o = merge(DEFAULTS, opts);
    const lay = layout(word, o);
    let defs = '', body = '';
    lay.glyphs.forEach((gl) => {
      body += `<g transform="translate(${gl.x} 0)">`;
      gl.def.s.forEach((s) => {
        let clip = '';
        if (s.clip) {
          const id = 'sc' + (++uid);
          defs += `<clipPath id="${id}" clipPathUnits="userSpaceOnUse"><rect x="${s.clip[0]}" y="${s.clip[1]}" width="${s.clip[2] - s.clip[0]}" height="${s.clip[3] - s.clip[1]}"/></clipPath>`;
          clip = ` clip-path="url(#${id})"`;
        }
        body += `<path d="${s.d}"${s.w ? ` stroke-width="${s.w}"` : ''} stroke-linejoin="${s.join || 'round'}"${clip}/>`;
      });
      body += '</g>';
    });
    return { width: lay.width, defs, body };
  }

  // Self-contained animated SVG (CSS keyframes, no script). Needs a DOM to
  // measure path lengths.
  function animatedSVG(word, opts) {
    const o = merge(DEFAULTS, opts);
    const lay = layout(word, o);
    const { stagger, dur } = timing(lay.glyphs.length, o);
    const probe = el('svg', { width: 0, height: 0, style: 'position:absolute;left:-9999px' });
    document.body.appendChild(probe);
    let defs = '', body = '', css = '';
    const pad = 40, top = -340, h = 480;
    lay.glyphs.forEach((gl, i) => {
      body += `<g transform="translate(${gl.x} 0)">`;
      gl.def.s.forEach((s) => {
        const pp = el('path', { d: s.d }, probe);
        const len = Math.ceil(pp.getTotalLength()) + 2;
        const id = 'p' + (++uid);
        let clip = '';
        if (s.clip) {
          defs += `<clipPath id="c${id}" clipPathUnits="userSpaceOnUse"><rect x="${s.clip[0]}" y="${s.clip[1]}" width="${s.clip[2] - s.clip[0]}" height="${s.clip[3] - s.clip[1]}"/></clipPath>`;
          clip = ` clip-path="url(#c${id})"`;
        }
        let kf = '';
        for (let k = 0; k <= 30; k++) {
          const p = clamp01((EASE.draw(k / 30) - s.t[0]) / (s.t[1] - s.t[0]));
          kf += `${(k / 30 * 100).toFixed(2)}%{stroke-dashoffset:${(len * (1 - p)).toFixed(1)}}`;
        }
        css += `@keyframes k${id}{${kf}}#${id}{stroke-dasharray:${len} ${len};stroke-dashoffset:${len};` +
          `animation:k${id} ${dur.toFixed(3)}s linear ${(i * stagger).toFixed(3)}s both}`;
        body += `<path id="${id}" d="${s.d}"${s.w ? ` stroke-width="${s.w}"` : ''} stroke-linejoin="${s.join || 'round'}"${clip}/>`;
      });
      body += '</g>';
    });
    probe.remove();
    const w = Math.ceil(lay.width + pad * 2);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-pad} ${top} ${w} ${h}" width="${w}" height="${h}">` +
      `<style>${css}@media (prefers-reduced-motion:reduce){path{animation:none!important;stroke-dashoffset:0!important}}</style>` +
      `<defs>${defs}</defs><g fill="none" stroke="${o.color}" stroke-width="${SW}" stroke-linecap="butt">${body}</g></svg>`;
  }

  // ---------------------------------------------------------------------
  // Hero scene: the full recording (draw, rise, nav, button, product).
  // Stage is 1156 x 2054, the web viewport of the recording.
  // ---------------------------------------------------------------------
  const STAGE_W = 1156, STAGE_H = 2054;
  const THEMES = {
    matcha: { bg: '#AEC49B', ink: '#1E4A1A', pill: '#E7EDE3', pillInk: '#2B5A27', btnInk: '#FFFFFF', tub: '#9AA06A', tubDark: '#737A4A', label: '#E6E8E1', ring: '#FFFFFF' },
    berry: { bg: '#F2B8C6', ink: '#5B1230', pill: '#FBE6EC', pillInk: '#6B1A3A', btnInk: '#FFFFFF', tub: '#C9708A', tubDark: '#93465E', label: '#FFF4F7', ring: '#FFFFFF' },
    ocean: { bg: '#A9CFE0', ink: '#0E3550', pill: '#E4F1F7', pillInk: '#164563', btnInk: '#FFFFFF', tub: '#5E93AE', tubDark: '#3C6A82', label: '#F2F8FB', ring: '#FFFFFF' },
    citrus: { bg: '#F4D35E', ink: '#3A2A05', pill: '#FBF0C6', pillInk: '#4A3608', btnInk: '#FFF8E1', tub: '#D9A62E', tubDark: '#A87A14', label: '#FFFBEA', ring: '#FFFFFF' },
    night: { bg: '#1D2420', ink: '#C9E6B0', pill: '#2C3630', pillInk: '#C9E6B0', btnInk: '#1D2420', tub: '#4A5A45', tubDark: '#2E3A2B', label: '#DDEFD0', ring: '#C9E6B0' },
    paper: { bg: '#EFE9DE', ink: '#1B1B1B', pill: '#FFFFFF', pillInk: '#1B1B1B', btnInk: '#FFFFFF', tub: '#B7AE9C', tubDark: '#857C6A', label: '#FFFFFF', ring: '#FFFFFF' },
  };

  const ICONS = {
    instagram: '<rect x="-21" y="-21" width="42" height="42" rx="12" fill="none" stroke="currentColor" stroke-width="5.5"/><circle r="10" fill="none" stroke="currentColor" stroke-width="5.5"/><circle cx="12.5" cy="-12.5" r="3.2" fill="currentColor"/>',
    tiktok: '<path d="M2 -24v31a9.5 9.5 0 1 1 -9.5 -9.5" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"/><path d="M2 -21c2 9 8 14 17 15" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"/>',
    youtube: '<rect x="-26" y="-18" width="52" height="36" rx="10" fill="currentColor"/><path d="M-6 -9l15 9l-15 9z" fill="var(--wm-pill)"/>',
    arrow: '<path d="M-9 9L9 -9M-6 -9H9V6" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="square"/>',
  };

  function noiseURL() {
    try {
      const c = document.createElement('canvas');
      c.width = c.height = 160;
      const x = c.getContext('2d');
      const img = x.createImageData(160, 160);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = Math.random() * 255;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
      x.putImageData(img, 0, 0);
      return c.toDataURL();
    } catch (e) { return ''; }
  }

  function injectCSS() {
    if (document.getElementById('wm-css')) return;
    const st = document.createElement('style');
    st.id = 'wm-css';
    st.textContent = `
.wm-stage{position:absolute;left:0;top:0;width:${STAGE_W}px;height:${STAGE_H}px;overflow:hidden;transform-origin:0 0;background:var(--wm-bg);font-family:'Barlow Semi Condensed','Roboto Condensed','Arial Narrow',sans-serif;}
.wm-stage *{box-sizing:border-box}
.wm-layer{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.wm-grain{position:absolute;inset:0;opacity:.055;mix-blend-mode:multiply;pointer-events:none;background-size:160px 160px}
.wm-nav{position:absolute;left:0;top:0;width:100%;height:330px;pointer-events:none}
.wm-circle{position:absolute;width:117px;height:117px;border-radius:50%;background:var(--wm-pill);color:var(--wm-pillink);display:flex;align-items:center;justify-content:center}
.wm-pillbtn{position:absolute;height:117px;border-radius:59px;background:var(--wm-pill);color:var(--wm-pillink);display:flex;align-items:center;justify-content:center;padding:0 46px 6px;font-weight:500;font-size:86px;letter-spacing:-0.035em;white-space:nowrap;line-height:1}
.wm-btn{position:absolute;top:883px;left:0;width:100%;height:117px;display:flex;justify-content:center;gap:2px;pointer-events:none}
.wm-btn .wm-circle,.wm-btn .wm-pillbtn{position:relative;background:var(--wm-ink);color:var(--wm-btnink)}
.wm-btn .wm-pillbtn{padding:0 44px 6px 44px}
`;
    document.head.appendChild(st);
  }

  function hero(container, options) {
    injectCSS();
    const o = merge({
      word: 'More', theme: 'matcha', swash: true, mode: 'hero',
      button: 'Buy now', shop: 'Shop all', product: true, nav: true, label: 'PLANT\nPROTEIN\nBLEND', hold: 0,
      speed: 1, loop: false, onUpdate: null,
    }, options);
    const colors = merge(THEMES[o.theme] || THEMES.matcha, o.colors);

    container.style.position = container.style.position || 'relative';
    container.style.overflow = 'hidden';
    const stage = document.createElement('div');
    stage.className = 'wm-stage';
    container.appendChild(stage);

    const ringSVG = el('svg', { class: 'wm-layer', viewBox: `0 0 ${STAGE_W} ${STAGE_H}` });
    const tubSVG = el('svg', { class: 'wm-layer', viewBox: `0 0 ${STAGE_W} ${STAGE_H}` });
    const wordSVG = el('svg', { class: 'wm-layer', viewBox: `0 0 ${STAGE_W} ${STAGE_H}` });
    stage.appendChild(ringSVG); stage.appendChild(tubSVG); stage.appendChild(wordSVG);
    el('defs', {}, wordSVG);

    const nav = document.createElement('div');
    nav.className = 'wm-nav';
    nav.innerHTML =
      ['instagram', 'tiktok', 'youtube'].map((k, i) =>
        `<div class="wm-circle" style="left:${60 + i * 133.5}px;top:106px"><svg width="70" height="70" viewBox="-35 -35 70 70">${ICONS[k]}</svg></div>`).join('') +
      `<div class="wm-circle" style="left:655px;top:106px"><svg width="40" height="40" viewBox="-20 -20 40 40">${ICONS.arrow}</svg></div>` +
      `<div class="wm-pillbtn wm-shop" style="right:60px;top:106px"></div>`;
    stage.appendChild(nav);
    const btn = document.createElement('div');
    btn.className = 'wm-btn';
    btn.innerHTML = `<div class="wm-circle"><svg width="40" height="40" viewBox="-20 -20 40 40">${ICONS.arrow}</svg></div><div class="wm-pillbtn wm-buy"></div>`;
    stage.appendChild(btn);
    const grain = document.createElement('div');
    grain.className = 'wm-grain';
    const nz = noiseURL();
    if (nz) grain.style.backgroundImage = `url(${nz})`;
    stage.appendChild(grain);

    let word = null, wordG = null, tl = [], events = [], duration = 0, t = 0, playing = false, raf = 0, last = 0;
    let ring = null, ringLen = 0, tubG = null, tubInner = null;

    function applyColors() {
      stage.style.setProperty('--wm-bg', colors.bg);
      stage.style.setProperty('--wm-ink', colors.ink);
      stage.style.setProperty('--wm-pill', colors.pill);
      stage.style.setProperty('--wm-pillink', colors.pillInk);
      stage.style.setProperty('--wm-btnink', colors.btnInk);
    }

    function buildTub() {
      tubSVG.innerHTML = ''; ringSVG.innerHTML = '';
      if (!o.product || o.mode !== 'hero') { ring = null; tubG = null; return; }
      ring = el('path', {
        d: P().A(650, 2036, 682, 682, 168, 334).toString(),
        fill: 'none', stroke: colors.ring, 'stroke-width': 33, 'stroke-linecap': 'butt',
      }, ringSVG);
      ringLen = ring.getTotalLength();
      ring.style.strokeDasharray = `${ringLen} ${ringLen}`;

      const id = 'wmt' + (++uid);
      const BODY = 'M-282 112C-282 64 282 64 282 112L392 1400H-392Z';
      const LID = 'M-292 0C-292 -50 292 -50 292 0L294 118C294 70 -294 70 -294 118Z';
      const defs = el('defs', {}, tubSVG);
      defs.innerHTML = `
<linearGradient id="${id}b" x1="-400" x2="400" y1="0" y2="0" gradientUnits="userSpaceOnUse">
  <stop offset="0" stop-color="${colors.tubDark}"/><stop offset=".18" stop-color="${colors.tub}"/>
  <stop offset=".55" stop-color="${colors.tub}"/><stop offset=".82" stop-color="${colors.tub}"/><stop offset="1" stop-color="${colors.tubDark}"/>
</linearGradient>
<linearGradient id="${id}s" x1="-400" x2="400" y1="0" y2="0" gradientUnits="userSpaceOnUse">
  <stop offset="0" stop-color="#000" stop-opacity=".22"/><stop offset=".12" stop-color="#000" stop-opacity="0"/>
  <stop offset=".3" stop-color="#fff" stop-opacity=".16"/><stop offset=".42" stop-color="#fff" stop-opacity="0"/>
  <stop offset=".86" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".3"/>
</linearGradient>
<linearGradient id="${id}l" x1="0" x2="1" y1="0" y2="0">
  <stop offset="0" stop-color="#cfd0cc"/><stop offset=".25" stop-color="#f6f6f4"/><stop offset=".6" stop-color="#ffffff"/><stop offset="1" stop-color="#bcbdb8"/>
</linearGradient>
<linearGradient id="${id}lt" x1="0" x2="0" y1="0" y2="1">
  <stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e2e3df"/>
</linearGradient>
<clipPath id="${id}c"><path d="${BODY}"/></clipPath>`;
      // Seen slightly from below, so every rim is an upward arc and the top face is hidden.
      // Local units: origin at the lid's top centre, y down; the body widens towards the bottom.
      tubG = el('g', {}, tubSVG);
      const inner = el('g', {}, tubG);
      tubInner = inner;
      el('path', { d: BODY, fill: `url(#${id}b)` }, inner);
      const sv = staticSVG(o.word, { swash: o.swash });
      const sc = Math.min(560 / Math.max(sv.width, 1), 0.6);
      const lab = el('g', { 'clip-path': `url(#${id}c)` }, inner);
      const lw = el('g', {
        transform: `translate(${-sv.width * sc / 2 + 6} ${206 + 324 * sc}) scale(${sc})`,
        fill: 'none', stroke: colors.label, 'stroke-width': SW, 'stroke-linecap': 'butt',
      }, lab);
      lw.innerHTML = `<defs>${sv.defs}</defs>${sv.body}`;
      const lines = String(o.label || '').split('\n').filter(Boolean).slice(0, 3);
      const y0 = 206 + 324 * sc + 70;
      lines.forEach((ln, i) => {
        const tx = el('text', {
          x: -262, y: y0 + (i ? 30 + i * 76 : 0), fill: colors.label, 'font-size': i ? 86 : 52, 'font-weight': 700,
          'font-family': "'Barlow Semi Condensed','Arial Narrow',sans-serif", 'letter-spacing': '-1.5',
          transform: 'skewX(-4)',
        }, lab);
        tx.textContent = ln;
      });
      el('path', { d: BODY, fill: `url(#${id}s)` }, inner);
      el('path', { d: LID, fill: `url(#${id}l)` }, inner);
      el('path', { d: 'M-292 86C-292 40 292 40 292 86', fill: 'none', stroke: '#000', 'stroke-opacity': '.08', 'stroke-width': 5 }, inner);
      el('path', { d: 'M-288 6C-288 -38 288 -38 288 6', fill: 'none', stroke: '#fff', 'stroke-opacity': '.9', 'stroke-width': 6 }, inner);
    }

    function build() {
      applyColors();
      stage.querySelector('.wm-shop').textContent = o.shop;
      stage.querySelector('.wm-buy').textContent = o.button;
      if (word) word.remove();
      if (wordG) wordG.remove();
      wordG = el('g', {}, wordSVG);
      word = wordmark(wordG, { word: o.word, swash: o.swash, color: colors.ink, stagger: o.stagger, letterDuration: o.letterDuration });
      // fit: the reference word is 988 wide (84 px margins)
      const s = Math.min(1, 988 / Math.max(word.width, 1));
      const x = (STAGE_W - word.width * s) / 2;
      const hero = o.mode === 'hero';
      const base = hero ? 1363 : STAGE_H / 2 + 150 * s;
      wordG.setAttribute('data-x', x);
      wordG.setAttribute('data-s', s);
      wordG.setAttribute('transform', `translate(${x} ${base}) scale(${s})`);
      buildTub();
      nav.style.display = hero && o.nav ? '' : 'none';
      btn.style.display = hero && o.nav ? '' : 'none';

      const R = word.settle + o.hold;
      tl = [];
      events = [];
      tl.push((tt) => word.seek(tt));
      if (hero) {
        tl.push((tt) => {
          const p = EASE.rise(clamp01((tt - R) / 0.55));
          wordG.setAttribute('transform', `translate(${x} ${base - 626 * p}) scale(${s})`);
        });
        tl.push((tt) => {
          const p = EASE.out(clamp01((tt - R - 0.12) / 0.3));
          nav.style.opacity = p;
        });
        tl.push((tt) => {
          const a = clamp01((tt - R - 0.16) / 0.2);
          const p = EASE.expoOut(clamp01((tt - R - 0.16) / 0.62));
          btn.style.opacity = a;
          btn.style.transform = `translateY(${140 * (1 - p)}px)`;
        });
        if (ring) {
          tl.push((tt) => {
            const p = EASE.out(clamp01((tt - R - 0.32) / 0.3));
            ring.style.strokeDashoffset = ringLen * (1 - p);
            ring.style.visibility = p > 0 ? 'visible' : 'hidden';
            const q = EASE.expoOut(clamp01((tt - R - 0.3) / 0.9));
            tubG.style.visibility = tt > R + 0.3 ? 'visible' : 'hidden';
            tubInner.setAttribute('transform',
              `translate(${672 - 140 * (1 - q)} ${1243 + 1000 * (1 - q)}) rotate(${13 + 9 * (1 - q)})`);
          });
        }
        events.push({ name: 'Word rises', start: R, end: R + 0.55 });
        if (o.nav) {
          events.push({ name: 'Nav fades in', start: R + 0.12, end: R + 0.42 });
          events.push({ name: 'Button rises', start: R + 0.16, end: R + 0.78 });
        }
        if (ring) events.push({ name: 'Product + ring', start: R + 0.3, end: R + 1.2 });
        duration = R + 1.25;
      } else {
        duration = word.duration + 0.6;
      }
      seek(t > duration ? duration : t);
    }

    function seek(tt) {
      t = Math.max(0, Math.min(duration, tt));
      for (const f of tl) f(t);
      if (o.onUpdate) o.onUpdate(t, duration);
    }

    function frame(now) {
      if (!playing) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      let nt = t + dt * o.speed;
      if (nt >= duration) {
        if (!o.loop) { seek(duration); playing = false; if (o.onUpdate) o.onUpdate(t, duration); return; }
        nt = 0;
      }
      seek(nt);
      raf = requestAnimationFrame(frame);
    }

    function fit() {
      const w = container.clientWidth, h = container.clientHeight;
      const s = Math.min(w / STAGE_W, h / STAGE_H);
      stage.style.transform = `translate(${(w - STAGE_W * s) / 2}px, ${(h - STAGE_H * s) / 2}px) scale(${s})`;
    }
    let ro = null;
    if (root.ResizeObserver) { ro = new ResizeObserver(fit); ro.observe(container); }
    fit();
    t = 0;
    build();

    const api = {
      play(from) {
        if (from != null) seek(from);
        else if (t >= duration) seek(0);
        if (playing) return api;
        playing = true; last = performance.now();
        raf = requestAnimationFrame(frame);
        return api;
      },
      pause() { playing = false; cancelAnimationFrame(raf); return api; },
      replay() { api.pause(); seek(0); return api.play(); },
      seek(tt) { seek(tt); return api; },
      get time() { return t; },
      get duration() { return duration; },
      get playing() { return playing; },
      set(opts) {
        for (const k in opts) if (opts[k] !== undefined) o[k] = opts[k];
        Object.assign(colors, merge(THEMES[o.theme] || THEMES.matcha, o.colors));
        build();
        return api;
      },
      timeline() { return { letters: word.letters.slice(), events: events.slice(), duration }; },
      options: o,
      colors,
      stage,
      fit,
      destroy() { api.pause(); if (ro) ro.disconnect(); stage.remove(); },
    };
    return api;
  }

  root.WordMotion = {
    wordmark, hero, layout, staticSVG, animatedSVG, THEMES, EASE, bezier,
    glyphs: { lower: LC, swash: SC },
    metrics: { SW, XH, ASC, DSC, STAGE_W, STAGE_H },
  };
})(typeof window !== 'undefined' ? window : this);
