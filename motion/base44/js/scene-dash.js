'use strict';
// 5.87 – 11.25s: the cards fly in (glass → orange → dark) while revenue
// counts up, they orbit and stack, fan out into the CreatorHub window over
// shifting marble / sky / sunset backdrops, the camera dives onto Publish,
// the click ripples, and an iris closes the shot down into a single dot.

// [frame, cx, cy, scale, rot] per card (screen px, scale vs page size)
const SHUFFLE = {
  chart: [[178, 330, 170, 1.75, -0.55], [180, 290, 170, 1.6, -0.5], [181, 311, 190, 1.5, -0.45], [182, 350, 190, 1.35, -0.4], [183, 393, 180, 1.35, -0.35],
    [184, 340, 207, 1.1, -0.17], [185, 271, 221, 1.3, -0.2], [186, 232, 220, 1.28, -0.22], [187, 220, 185, 1.26, -0.2], [188, 240, 160, 1.15, -0.17],
    [189, 228, 130, 1.0, -0.17], [190, 228, 98, 0.9, -0.17], [191, 238, 92, 0.86, -0.15], [192, 256, 88, 0.88, -0.1], [193, 271, 88, 0.9, -0.08],
    [194, 285, 88, 0.9, -0.05], [195, 293, 89, 0.92, -0.03], [197, 317, 86, 0.95, -0.01], [199, 321, 84, 0.95, 0], [201, 332, 90, 0.96, 0],
    [211, 332, 92, 0.97, 0], [221, 307, 86, 0.97, 0], [225, 282, 83, 0.97, 0], [227, 267, 89, 0.97, 0], [229, 252, 110, 0.97, 0],
    [231, 240, 119, 0.98, 0], [233, 226, 137, 0.98, 0], [235, 224, 177, 0.96, 0], [237, 260, 213, 0.95, 0], [239, 300, 170, 0.92, 0], [251, 305, 163, 0.88, 0]],
  revenue: [[181, 300, 110, 0.9, 0.3], [182, 280, 110, 0.9, 0.33], [183, 254, 103, 0.95, 0.35], [184, 321, 88, 0.86, 0.25], [185, 368, 133, 0.8, 0.22], [186, 380, 190, 0.76, -0.15],
    [187, 357, 245, 0.76, -0.12], [188, 314, 262, 0.77, -0.1], [189, 289, 252, 0.79, -0.12], [190, 262, 250, 0.82, -0.15], [191, 255, 252, 0.8, -0.12],
    [192, 238, 243, 0.82, -0.08], [193, 222, 232, 0.82, -0.06], [194, 214, 224, 0.8, -0.05], [195, 213, 221, 0.78, -0.04], [197, 206, 193, 0.77, -0.02],
    [199, 205, 189, 0.77, -0.01], [201, 200, 181, 0.79, 0], [211, 201, 186, 0.79, 0], [221, 211, 208, 0.8, 0], [225, 225, 223, 0.8, 0],
    [227, 237, 231, 0.8, 0], [229, 250, 237, 0.79, 0], [231, 270, 245, 0.8, 0], [233, 296, 242, 0.8, 0], [235, 325, 217, 0.8, 0],
    [237, 336, 166, 0.76, 0], [239, 300, 160, 0.72, 0], [251, 290, 162, 0.72, 0]],
  course: [[178, 230, 175, 1.55, -0.28], [180, 250, 180, 1.45, -0.26], [181, 296, 190, 1.4, -0.24], [182, 278, 203, 1.15, -0.17], [183, 268, 203, 1.09, -0.12],
    [184, 235, 168, 0.98, -0.17], [185, 250, 130, 0.95, -0.15], [186, 278, 104, 0.86, -0.1], [187, 318, 112, 0.83, -0.12], [188, 340, 126, 0.8, -0.12],
    [189, 358, 148, 0.78, -0.1], [190, 365, 163, 0.78, -0.08], [191, 362, 170, 0.76, -0.06], [192, 362, 192, 0.8, -0.05], [193, 354, 203, 0.79, -0.04],
    [194, 347, 210, 0.79, -0.03], [195, 350, 218, 0.79, -0.02], [197, 333, 233, 0.75, 0], [199, 325, 240, 0.75, 0], [201, 323, 244, 0.75, 0],
    [211, 324, 244, 0.75, 0], [221, 342, 227, 0.78, 0], [225, 348, 212, 0.78, 0], [227, 352, 194, 0.76, 0], [229, 354, 179, 0.75, 0],
    [231, 352, 161, 0.73, 0], [233, 340, 145, 0.75, 0], [235, 314, 123, 0.76, 0], [237, 277, 132, 0.81, 0], [239, 271, 167, 0.91, 0],
    [241, 284, 171, 1.02, 0], [243, 286, 168, 1.1, 0], [245, 289, 165, 1.13, 0], [247, 289, 162, 1.16, 0], [249, 288, 161, 1.18, 0], [251, 289, 162, 1.19, 0]],
};
const REVENUE = [[F(186), 900], [F(187), 1072, E.lin], [F(188), 1350, E.lin], [F(189), 1705, E.lin], [F(190), 2177, E.lin], [F(191), 2484, E.lin],
  [F(192), 3367, E.lin], [F(193), 7314, E.lin], [F(194), 11203, E.lin], [F(195), 11689, E.lin], [F(197), 13122, E.lin], [F(199), 13484, E.lin],
  [F(201), 13809, E.lin], [F(203), 14019, E.lin], [F(205), 14149, E.lin], [F(207), 14222, E.lin], [F(209), 14246, E.lin], [F(211), 14250, E.lin]];
const TINT = [[F(179), 0], [F(181), 0.05], [F(182), 0.85, E.lin], [F(185), 1.0, E.lin], [F(188), 1.12, E.lin], [F(191), 1.4, E.lin], [F(195), 1.72, E.lin], [F(199), 1.92, E.lin], [F(201), 2, E.lin]];

function cardPose(kind, t) {
  return kf(t, SHUFFLE[kind].map(([f, ...v], i) => [F(f), v, i ? E.ioQ : undefined]));
}

// drifting code glyphs around the cards (7.07s – 7.93s)
const GLYPHS = [['||', 69, 75, 193], ['—', 52, 62, 199], ['&&', 166, 104, 211], ['@', 208, 268, 205], ['==', 69, 300, 201], ['=>', 471, 237, 197],
  ['*', 532, 35, 209], ['{', 389, 151, 213], ['//', 495, 290, 215], ['<>', 330, 290, 229], ['^', 70, 120, 231], ['\\', 470, 300, 221], ['·', 400, 20, 207], ['>', 120, 260, 225]];
function codeGlyphs(ctx, t) {
  const fade = kf(t, [[F(237), 1], [F(243), 0]]);
  for (const [g, x, y, f0] of GLYPHS) {
    const a = seg(t, F(f0), F(f0 + 4)) * fade;
    if (a <= 0) continue;
    const dt = t - F(f0);
    text(ctx, g, x + dt * 6, y - dt * 4, { size: 9, color: g.length > 1 && g !== '//' ? [150, 110, 190] : [70, 66, 70], alpha: a * 0.85, align: 'center' });
  }
}

function sceneCards(ctx, t) {
  studioBG(ctx, seg(t, F(181), F(200)) * 0.7);
  if (t < F(184)) sceneTreeFaded(ctx, t);
  const tint = kf(t, TINT);
  const value = kf(t, REVENUE);
  const draw = kf(t, [[F(186), 0], [F(201), 1, E.outQ]]);
  const ca = tint < 0.8 ? 0 : seg(tint, 0.9, 1.1);
  const blur = kf(t, [[F(177), 9], [F(179), 6], [F(181), 3], [F(182), 1.6], [F(184), 0.6], [F(186), 0]]);
  const pose = k => cardPose(k, t);
  const one = (g, k) => {
    const [cx, cy, s, r] = pose(k);
    const tk = k === 'chart' && tint < 1.4 && tint > 0.5 ? tint - 0.22 * (1 - seg(t, F(187), F(190))) : tint; // chart stays peach a little longer
    placeCard(g, k, cx, cy, s, r, { tint: tk, value, draw, content: ca, alpha: t < F(179) ? seg(t, F(176), F(179)) * 0.8 : 1 });
  };
  const order = t < F(236) ? ['chart', 'revenue', 'course'] : ['revenue', 'chart', 'course'];
  if (blur > 0.1) layer(ctx, 'cardsBlur', g => order.forEach(k => one(g, k)), { blur });
  else order.forEach(k => one(ctx, k));
  codeGlyphs(ctx, t);
}
function sceneTreeFaded(ctx, t) {
  // the tree lingers under the incoming cards
  ctx.save(); sceneTreeOverlay(ctx, t); ctx.restore();
}
function sceneTreeOverlay(ctx, t) {
  const [cx, cy] = kf(t, TREE_CAM);
  const fade = kf(t, [[F(176), 0.55], [F(178), 0.4], [F(181), 0.25], [F(184), 0]]);
  if (fade <= 0) return;
  ctx.save(); ctx.globalAlpha = fade; ctx.translate(cx, cy);
  TREE.forEach((it, i) => treeItem(ctx, t, it, i));
  ctx.restore();
}

// ---------------------------- backdrops --------------------------------
let BACKDROPS = null;
function makeBackdrops() {
  if (BACKDROPS) return;
  const w = 220, h = 124;
  BACKDROPS = {
    marbleA: noiseTexture(w, h, 7, n => ramp([[0, [236, 168, 220]], [0.35, [244, 196, 232]], [0.5, [246, 214, 200]], [0.62, [242, 166, 96]], [0.78, [236, 128, 60]], [1, [250, 220, 200]]], n), { scale: 3.2, warp: 1.4, stretch: 1.6 }),
    marbleB: noiseTexture(w, h, 11, n => ramp([[0, [214, 170, 214]], [0.35, [224, 196, 222]], [0.5, [208, 206, 170]], [0.66, [160, 156, 100]], [0.8, [196, 188, 140]], [1, [236, 214, 226]]], n), { scale: 3, warp: 1.5, stretch: 1.4 }),
    sky: noiseTexture(w, h, 23, (n, x, y) => {
      const sky = ramp([[0, [52, 78, 108]], [0.45, [86, 120, 152]], [0.62, [150, 176, 200]], [0.8, [96, 104, 140]], [1, [168, 184, 206]]], n);
      const cloud = ramp([[0, [70, 40, 26]], [0.45, [150, 86, 46]], [0.7, [214, 136, 74]], [1, [236, 190, 140]]], n);
      return mix(sky, cloud, seg(y, 0.55, 0.85));
    }, { scale: 2.6, warp: 1.1, stretch: 2.2 }),
    sunset: noiseTexture(w, h, 31, (n, x, y) => {
      const sky = ramp([[0, [58, 56, 74]], [0.45, [92, 84, 108]], [0.62, [124, 104, 120]], [1, [80, 74, 96]]], n);
      const glow = ramp([[0, [150, 80, 46]], [0.5, [206, 118, 62]], [1, [110, 56, 34]]], n);
      const cloud = ramp([[0, [32, 18, 12]], [0.45, [92, 46, 24]], [0.75, [170, 92, 46]], [1, [214, 130, 70]]], n);
      return y < 0.5 ? mix(sky, glow, seg(y, 0.32, 0.52)) : mix(glow, cloud, seg(y, 0.52, 0.72));
    }, { scale: 3.4, warp: 1.0, stretch: 3.2 }),
  };
}
function backdrop(ctx, t, x, y, w, h) {
  makeBackdrops();
  const drift = (t - F(257)) * 14;
  const layers = [
    ['marbleA', kf(t, [[F(256), 0], [F(257), 1], [F(269), 1], [F(271), 0]])],
    ['marbleB', kf(t, [[F(269), 0], [F(271), 1], [F(272), 1], [F(274), 0]])],
    ['sky', kf(t, [[F(272), 0], [F(274), 1], [F(277), 1], [F(280), 0]])],
    ['sunset', kf(t, [[F(276), 0], [F(280), 1]])],
  ];
  ctx.save();
  ctx.imageSmoothingQuality = 'high';
  for (const [name, a] of layers) {
    if (a <= 0) continue;
    ctx.globalAlpha = a;
    ctx.drawImage(BACKDROPS[name], x - 40 - drift, y - 30, w + 120, h + 60);
  }
  ctx.restore();
}

// ----------------------------- the window -------------------------------
const PAGE_W = 502, PAGE_H = 283;
const PAGE_CARDS = { revenue: [96.5, 139.5], course: [251, 141], chart: [402.5, 142.5] };
const BUTTON = [450, 3.5, 44, 13.8]; // x, y, w, h in page px
// page → screen: [s, px, py]
const PAGE_CAM = [
  [F(251), [0.86, 289 - 251 * 0.86, 162 - 141 * 0.86]],
  [F(253), [0.88, 289 - 251 * 0.88, 162 - 141 * 0.88], E.lin],
  [F(255), [0.906, 289 - 251 * 0.906, 162 - 141 * 0.906], E.lin],
  [F(257), [0.975, 289 - 251 * 0.975, 162 - 141 * 0.975], E.lin],
  [F(259), [1.05, 289 - 251 * 1.05, 162 - 141 * 1.05], E.lin],
  [F(261), [1.094, 14.4, 7.7], E.lin],
  [F(265), [1.12, 8, 2], E.lin],
  [F(271), [1.124, 7, 12], E.lin],
  [F(273), [1.064, 22, 19], E.outQ],
  [F(277), [1.008, 36, 19], E.outQ],
  [F(281), [1.0, 38, 21], E.outQ],
  [F(289), [1.0, 33, 21], E.lin],
  [F(297), [1.04, 6, 26], E.lin],
  [F(299), [1.07, -5, 28], E.lin],
  [F(301), [1.38, 524 - 502 * 1.38, 35], E.inQ],
  [F(303), [2.43, 465 - 502 * 2.43, 85], E.lin],
  [F(305), [2.52, 451 - 502 * 2.52, 100], E.outQ],
  [F(307), [2.95, 441 - 502 * 2.95, 107], E.outQ],
  [F(311), [2.92, 429 - 502 * 2.92, 118], E.lin],
  [F(316), [2.95, 423 - 502 * 2.95, 123], E.lin],
  [F(321), [3.22, 425 - 502 * 3.22, 126], E.lin],
  [F(326), [3.05, 418 - 502 * 3.05, 127], E.lin],
  [F(331), [2.76, 406 - 502 * 2.76, 127], E.lin],
  [F(333), [2.5, 393 - 502 * 2.5, 129], E.lin],
  [F(334), [2.38, 386 - 502 * 2.38, 129], E.lin],
  [F(335), [2.1, 376 - 502 * 2.1, 131], E.lin],
  [F(336), [1.8, 363 - 502 * 1.8, 131], E.lin],
  [F(337), [0.7, 330 - 502 * 0.7, 150], E.lin],
];
const COURSE_BOOST = [[F(251), 1.38], [F(253), 1.35, E.lin], [F(255), 1.31, E.lin], [F(257), 1.18, E.lin], [F(259), 1.09, E.lin], [F(261), 1.05, E.lin], [F(265), 1.0, E.lin]];

function buttonLook(t) {
  // gradient stops left→right, label alpha
  const keys = [
    [F(275), [[240, 128, 60], [244, 160, 100], [248, 200, 160]]],
    [F(283), [[242, 120, 60], [246, 170, 120], [252, 236, 226]]],
    [F(289), [[226, 60, 200], [236, 120, 220], [250, 236, 246]]],
    [F(293), [[214, 40, 214], [232, 110, 228], [250, 230, 246]]],
    [F(295), [[120, 90, 240], [222, 90, 226], [250, 228, 244]]],
    [F(297), [[60, 210, 240], [210, 110, 226], [250, 236, 246]]],
    [F(299), [[60, 236, 240], [110, 236, 244], [250, 252, 252]]],
    [F(305), [[64, 238, 242], [120, 240, 246], [250, 252, 252]]],
    [F(306), [[220, 200, 246], [236, 200, 240], [250, 246, 250]]],
    [F(308), [[244, 170, 214], [246, 176, 214], [252, 236, 244]]],
    [F(312), [[246, 164, 196], [246, 164, 196], [248, 190, 210]]],
    [F(314), [[246, 152, 160], [246, 150, 158], [246, 160, 160]]],
    [F(316), [[244, 128, 112], [244, 124, 108], [244, 126, 108]]],
    [F(319), [[242, 106, 54], [242, 106, 54], [242, 108, 56]]],
  ];
  const flat = kf(t, keys.map(([tt, c], i) => [tt, c.flat(), i ? E.lin : undefined]));
  return { stops: [flat.slice(0, 3), flat.slice(3, 6), flat.slice(6, 9)], label: seg(t, F(306), F(309)), shine: kf(t, [[F(281), 0], [F(285), 0.8], [F(309), 0.8], [F(312), 0]]) };
}

function drawPage(ctx, t, s, px, py, full) {
  // window frame + backdrop
  ctx.save();
  ctx.translate(px, py); ctx.scale(s, s);
  ctx.save();
  if (!full) { ctx.beginPath(); ctx.rect(0, 0, PAGE_W, PAGE_H); ctx.clip(); }
  const ext = full ? [-px / s, -py / s, SW / s, SH / s] : [0, 0, PAGE_W, PAGE_H];
  backdrop(ctx, t, ext[0], ext[1], ext[2], ext[3]);
  ctx.restore();
  // header bar
  const barA = seg(t, F(263), F(265));
  if (barA > 0) {
    ctx.save(); ctx.globalAlpha = barA;
    ctx.fillStyle = '#1b1b1b';
    if (full) ctx.fillRect(-px / s, 0, SW / s, 21); else ctx.fillRect(0, 0, PAGE_W, 21);
    text(ctx, 'CreatorHub', PAGE_W / 2, 13.6, { size: 7.4, weight: 500, color: '#f2f2f2', align: 'center' });
    // Publish button
    if (t > F(275)) {
      const b = buttonLook(t);
      const grow = E.outC(seg(t, F(275), F(288)));
      const [bx0, by, bw0, bh] = BUTTON;
      const bx = lerp(440, bx0, grow), bw = lerp(9, bw0, grow);
      const g = ctx.createLinearGradient(bx, 0, bx + bw, 0);
      b.stops.forEach((c, i) => g.addColorStop(i / 2, rgb(c)));
      rrect(ctx, bx, by, bw, bh, 2.6); ctx.fillStyle = g; ctx.fill();
      if (b.shine > 0) {
        ctx.save(); ctx.globalAlpha = b.shine; ctx.filter = `blur(${1.2 * s * SCALE}px)`;
        ctx.fillStyle = '#ffffff'; ctx.fillRect(bx + bw * 0.78, by - 0.5, bw * 0.25, bh + 1);
        ctx.restore();
      }
      if (b.label > 0) text(ctx, 'Publish', bx + bw / 2, by + bh * 0.72, { size: 7.6, weight: 500, color: '#ffffff', align: 'center', alpha: b.label });
    }
    ctx.restore();
  }
  ctx.restore();
}

function scenePage(ctx, t) {
  studioBG(ctx, 0.7);
  const [s, px, py] = kf(t, PAGE_CAM);
  const full = t < F(270);
  drawPage(ctx, t, s, px, py, full);
  // docked cards
  const slide = E.outC(seg(t, F(251), F(258)));
  const boost = kf(t, COURSE_BOOST);
  ctx.save();
  ctx.translate(px, py); ctx.scale(s, s);
  for (const k of ['revenue', 'chart', 'course']) {
    let [cx, cy] = PAGE_CARDS[k];
    if (k !== 'course') cx = lerp(PAGE_CARDS.course[0], cx, slide);
    placeCard(ctx, k, cx, cy, k === 'course' ? boost : 1, 0, { tint: 2, value: 14250, draw: 1, content: 1 });
  }
  ctx.restore();
  // cursor in page space
  if (t > F(300)) {
    const tip = kf(t, [[F(300), [520, 40]], [F(305), [497, 18.5], E.outQ]]);
    const [x, y] = [px + tip[0] * s, py + tip[1] * s];
    cursor(ctx, x, y, Math.max(0.8, s * 0.62));
  }
  // click ripples
  for (let i = 0; i < 3; i++) {
    const t0 = F(321 + i * 1.6);
    const k = seg(t, t0, t0 + 0.42);
    if (k <= 0 || k >= 1) continue;
    const cx = px + (BUTTON[0] + BUTTON[2] / 2) * s, cy = py + (BUTTON[1] + BUTTON[3] / 2) * s;
    const r = lerp(14, 330, E.outC(k));
    const g = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    g.addColorStop(0, `rgba(240,120,60,${0.8 * (1 - k)})`); g.addColorStop(0.5, `rgba(140,220,200,${0.6 * (1 - k)})`); g.addColorStop(1, `rgba(90,220,240,${0.8 * (1 - k)})`);
    ctx.strokeStyle = g; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
  }
}

// iris: dark surround closing on the button, ending as the brand dot
function sceneIris(ctx, t) {
  const r = kf(t, [[F(331.5), 520], [F(332), 420, E.lin], [F(333), 290, E.lin], [F(334), 190, E.lin], [F(335), 145, E.lin], [F(336), 72, E.lin], [F(337), 16, E.lin]]);
  const c = kf(t, [[F(332), [318, 155]], [F(336), [303, 160]], [F(337), [300, 162]]]);
  layer(ctx, 'irisInner', g => scenePage(g, t), {
    mask: g => {
      const gr = g.createRadialGradient(c[0], c[1], r * 0.9, c[0], c[1], r * 1.04 + 4);
      gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(0, 0, SW, SH);
    },
  });
}
