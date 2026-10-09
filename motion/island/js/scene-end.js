'use strict';
// 11.23 – 16.07s: the iris dot becomes Bloub, "native." "local." "alive."
// snap in, the line collapses into a blob that turns into the Bloub mark,
// and "Island" types out beside it.

const WORDS = [
  { s: 'native.', col: [242, 242, 247], f0: 338.5, per: 0.65 },
  { s: 'local.', col: [176, 164, 255], f0: 360, per: 0.7 },
  { s: 'alive.', col: [255, 158, 204], f0: 381, per: 0.6 },
];
let wordFont = 39;
let groupShift = [0, 0, 0];
function fitWordFont(ctx) {
  // keep Base 44's type size, and recentre the line for Island's (longer) words
  wordFont = 39 * 250 / measure(ctx, 'fast.secure.live.', 39, 'Figtree', 400, -0.005);
  const m = s => measure(ctx, s, wordFont, 'Figtree', 400, -0.005);
  groupShift = [(m('fast.') - m('native.')) / 2, (m('fast.secure.') - m('native.local.')) / 2, (m('fast.secure.live.') - m('native.local.alive.')) / 2];
}
const dotX = t => kf(t, DOT_X) + (t > F(406) ? 0 : kf(t, [[F(358), groupShift[0]], [F(363), groupShift[1], E.outQ], [F(379), groupShift[1]], [F(383), groupShift[2], E.outQ]]));
const DOT_X = [[F(338), 296], [F(340), 280, E.outQ], [F(342), 262.5, E.outQ], [F(345), 253, E.outQ], [F(360), 247, E.lin], [F(361.5), 236, E.inQ],
  [F(363), 203, E.outQ], [F(370), 196, E.outQ], [F(379.5), 192, E.lin], [F(381), 157, E.outQ], [F(384), 154, E.outQ], [F(404), 151, E.lin],
  [F(406), 155, E.lin], [F(407), 159, E.lin], [F(408), 170, E.lin], [F(409), 257, E.inQ], [F(410), 277, E.outQ], [F(411), 283, E.outQ], [F(412), 289, E.outQ]];

// the bullet is Bloub, changing coat through the agent colours
const BLOUB_COLS = [[F(338), [52, 128, 255]], [F(347), [130, 92, 246]], [F(355), [236, 90, 170]], [F(363), [130, 92, 246]],
  [F(371), [226, 64, 84]], [F(378), [52, 128, 255]], [F(387), [130, 92, 246]], [F(395), [236, 90, 170]], [F(401), [52, 128, 255]],
  [F(405), [70, 200, 230]], [F(409), [176, 160, 255]], [F(410.5), [236, 160, 230]], [F(411.5), [236, 236, 242]]];
function gradientDot(ctx, t, x, y, rx, ry) {
  const body = kf(t, BLOUB_COLS.map(([tt, v], i) => [tt, v, i ? E.ioQ : undefined]));
  const blink = [[F(352), F(354.5)], [F(372), F(374.5)], [F(397), F(399.5)]].some(([a, b]) => t > a && t < b) ? 1 : 0;
  const look = [Math.sin(t * 2.1) * 0.5, Math.cos(t * 1.7) * 0.2];
  bloub(ctx, x, y, ry, { body, sx: rx / ry, sy: 1, blink, look, eye: '#0b0b12', rim: false });
}

function darkBG(ctx) {
  ctx.fillStyle = '#141418'; ctx.fillRect(0, 0, SW, SH);
  const g = ctx.createRadialGradient(SW / 2, SH / 2, 120, SW / 2, SH / 2, 360);
  g.addColorStop(0, 'rgba(30,28,40,0)'); g.addColorStop(1, 'rgba(36,32,52,0.6)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, SW, SH);
}

function wordLine(ctx, t, x0) {
  const size = wordFont, base = 176;
  let x = x0;
  const collapse = seg(t, F(405), F(409.5));
  const blobX = dotX(t);
  let end = x0;
  WORDS.forEach((w, wi) => {
    for (let i = 0; i < w.s.length; i++) {
      const ch = w.s[i];
      const adv = measure(ctx, ch, size, 'Figtree', 400, -0.005);
      const ti = F(w.f0 + i * w.per);
      const k = seg(t, ti, ti + F(3.2));
      if (k > 0) {
        // fresh letters arrive spread out and soft, then snap together
        const spread = (1 - E.outC(k)) * (22 + i * 14) * (wi === 0 ? 0.4 : 1);
        let gx = x + spread, a = E.outQ(clamp(k * 1.6)), blur = (1 - k) * 2.2;
        const grow = wi === 0 && i === 0 ? lerp(0.5, 1, E.outC(seg(t, F(338.5), F(341)))) : 1;
        if (ch === '.' && wi < 2 && t > F(405.5)) a *= 1 - seg(t, F(405.5), F(407)); // separators drop out first
        if (collapse > 0) { // letters pile toward the blob
          const pull = E.inQ(collapse);
          gx = lerp(gx, blobX - adv / 2, pull * 0.15);
          a *= 1 - seg(t, F(409.6), F(410.6));
          blur += collapse * 0.8;
        }
        if (grow !== 1) { ctx.save(); ctx.translate(gx, base); ctx.scale(grow, grow); text(ctx, ch, 0, 0, { size, family: 'Figtree', color: w.col, alpha: a, blur, tracking: -0.005 }); ctx.restore(); }
        else text(ctx, ch, gx, base, { size, family: 'Figtree', color: w.col, alpha: a, blur, tracking: -0.005 });
      }
      x += ch === '.' && wi < 2 ? adv * (1 - seg(t, F(405.5), F(407))) : adv;
    }
    if (t >= F(w.f0)) end = x;
  });
  return end;
}

function sceneWords(ctx, t) {
  darkBG(ctx);
  const dx = dotX(t);
  // once the separators drop the line drifts right on its own while the blob crosses it
  const tx = t > F(406) ? 178 + (t - F(406)) * 30 * 12 : dx + 23;
  if (t < F(411)) {
    const end = wordLine(ctx, t, tx);
    // text-box selection frame
    const boxA = kf(t, [[F(388), 0], [F(391), 0.55], [F(404), 0.55], [F(408), 0.25], [F(409), 0]]);
    if (boxA > 0) {
      ctx.save(); ctx.globalAlpha = boxA;
      ctx.strokeStyle = 'rgba(205,205,210,0.75)'; ctx.lineWidth = 0.6;
      const x1 = t > F(407) ? lerp(end + 3, end - 20, seg(t, F(407), F(408.5))) : end + 3;
      ctx.strokeRect(tx - 2.5, 145.5, x1 - tx + 2.5, 33.5);
      ctx.fillStyle = 'rgba(235,235,240,0.9)'; ctx.fillRect(tx - 3, 145, 1, 34.5);
      ctx.restore();
    }
  }
  // the dot (and later the blob)
  if (t >= F(337.5)) {
    const rx = kf(t, [[F(406), 16], [F(407), 17.5], [F(408), 18], [F(409), 32], [F(410), 25], [F(411), 26]]);
    const ry = kf(t, [[F(406), 16], [F(407), 17.5], [F(408), 18], [F(409), 28], [F(410), 24], [F(411), 26]]);
    gradientDot(ctx, t, dx, 162.5, rx, ry);
  }
}

// ------------------------------- sun -----------------------------------
const SUN_X = [[F(411), 289], [F(421), 289.5], [F(441), 289, E.lin], [F(445), 287, E.inQ], [F(447), 279, E.inQ], [F(449), 241, E.outQ],
  [F(451), 230, E.outQ], [F(455), 220.5, E.outQ], [F(461), 213.5, E.outQ], [F(467), 212.5, E.outQ], [F(482), 209.5, E.lin]];
const SUN_R = [[F(411.5), 21], [F(413), 30, E.outQ], [F(415), 33, E.outQ], [F(421), 33.5, E.outQ], [F(445), 33, E.lin], [F(451), 31, E.ioQ], [F(467), 30.5, E.outQ]];
let baseFont = 37;
function fitBaseFont(ctx) { baseFont = 37 * 139 / measure(ctx, 'BASE 44', 37, 'Inter Tight', 700, -0.01) * 1.08; }

// The closing mark is Bloub himself, as on the app icon: pale sphere, grey
// rim, two black pill eyes. It glances at the wordmark and blinks once.
function sunMark(ctx, t, cx, cy, r, morph) {
  const body = mix([230, 230, 238], [236, 160, 230], morph);
  const blink = t > F(431) && t < F(434.5) ? Math.sin(Math.PI * seg(t, F(431), F(434.5))) : 0;
  const look = [kf(t, [[F(440), 0], [F(452), 0.65, E.ioQ], [F(476), 0.65], [F(482), 0.3]]), kf(t, [[F(440), 0], [F(452), 0.1]])];
  ctx.save();
  ctx.shadowColor = 'rgba(70,50,140,0.18)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 4;
  ctx.fillStyle = '#ddd'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
  ctx.restore();
  bloub(ctx, cx, cy, r, { body, blink, look, eye: '#0e0e12' });
}

function sunBG(ctx, t) {
  studioBG(ctx, seg(t, F(412), F(467)) * 0.6, (t - F(412)) * 0.6);
}

function sceneSun(ctx, t) {
  if (t < F(412)) { // the dark stage lifts through grey to the warm backdrop
    if (t < F(410)) { sceneWords(ctx, t); return; }
    const g = ctx.createLinearGradient(0, 0, 0, SH);
    if (t < F(411)) { g.addColorStop(0, '#6c6a80'); g.addColorStop(1, '#76687e'); }
    else { g.addColorStop(0, '#d2d0ea'); g.addColorStop(1, '#e2cce0'); }
    ctx.fillStyle = g; ctx.fillRect(0, 0, SW, SH);
    if (t < F(411)) { // last letters either side of the blob
      text(ctx, 'na', 214, 176, { size: wordFont, family: 'Figtree', color: [236, 236, 242], alpha: 0.8 });
      text(ctx, 've.', 296, 176, { size: wordFont, family: 'Figtree', color: [255, 158, 204], alpha: 0.8 });
    }
    const dx = dotX(t);
    gradientDot(ctx, t, dx, 162.5, t < F(411) ? 25 : 29, t < F(411) ? 24 : 29);
    return;
  }
  sunBG(ctx, t);
  const cx = kf(t, SUN_X), r = kf(t, SUN_R), cy = r > 31 ? 130 + r : 132 + r;
  sunMark(ctx, t, cx, cy, r, 0.6 * (1 - seg(t, F(412), F(412.8))));
  // BASE 44
  const letters = [['I', 449, 453], ['s', 454, 456.5], ['l', 455, 457.5], ['a', 456, 458.5], ['n', 457, 460.5], ['d', 459, 463]];
  let x = cx + 37.5;
  for (const [ch, a, b] of letters) {
    const adv = measure(ctx, ch, baseFont, 'Inter Tight', 800, -0.02);
    const k = seg(t, F(a), F(b));
    if (k > 0 && ch !== ' ') {
      text(ctx, ch, x, 176, { size: baseFont, family: 'Inter Tight', weight: 800, color: mix([196, 190, 226], [22, 20, 36], E.ioQ(k)), alpha: clamp(k * 2.5), tracking: -0.02 });
    }
    x += adv;
  }
}
