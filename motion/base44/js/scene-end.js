'use strict';
// 11.23 – 16.07s: the iris dot becomes a gradient bullet, "fast." "secure."
// "live." snap in, the line collapses into a blob that turns into the sun
// mark, and BASE 44 types out beside it.

const WORDS = [
  { s: 'fast.', col: [242, 242, 242], f0: 338.5, per: 0.9 },
  { s: 'secure.', col: [214, 160, 112], f0: 360, per: 0.6 },
  { s: 'live.', col: [228, 216, 238], f0: 381, per: 0.7 },
];
let wordFont = 39;
function fitWordFont(ctx) {
  wordFont = 39 * 250 / measure(ctx, 'fast.secure.live.', 39, 'Figtree', 400, -0.005);
}
const DOT_X = [[F(338), 296], [F(340), 280, E.outQ], [F(342), 262.5, E.outQ], [F(345), 253, E.outQ], [F(360), 247, E.lin], [F(361.5), 236, E.inQ],
  [F(363), 203, E.outQ], [F(370), 196, E.outQ], [F(379.5), 192, E.lin], [F(381), 157, E.outQ], [F(384), 154, E.outQ], [F(404), 151, E.lin],
  [F(406), 155, E.lin], [F(407), 159, E.lin], [F(408), 170, E.lin], [F(409), 257, E.inQ], [F(410), 277, E.outQ], [F(411), 283, E.outQ], [F(412), 289, E.outQ]];
const DOT_COLS = [
  [F(338), [80, 200, 242, 80, 205, 245]], [F(341), [150, 175, 248, 165, 170, 248]], [F(347), [165, 172, 250, 220, 148, 252]],
  [F(351), [150, 180, 248, 229, 144, 254]], [F(361), [160, 174, 250, 170, 168, 246]], [F(371), [170, 174, 249, 235, 138, 251]],
  [F(378), [60, 215, 247, 90, 205, 247]], [F(381), [100, 196, 246, 112, 195, 250]], [F(387), [150, 178, 250, 190, 165, 250]],
  [F(391), [205, 155, 252, 224, 150, 252]], [F(397), [110, 190, 248, 225, 148, 250]], [F(401), [82, 210, 248, 211, 154, 249]],
  [F(405), [40, 221, 244, 42, 221, 246]], [F(408), [110, 196, 248, 150, 180, 250]], [F(409), [170, 170, 250, 180, 168, 250]],
  [F(410), [216, 160, 250, 236, 150, 240]], [F(411), [40, 225, 245, 230, 150, 245]],
];

function gradientDot(ctx, t, x, y, rx, ry) {
  const c = kf(t, DOT_COLS.map(([tt, v], i) => [tt, v, i ? E.lin : undefined]));
  const g = ctx.createLinearGradient(x - rx, y - ry, x + rx, y + ry);
  g.addColorStop(0, rgb(c.slice(0, 3))); g.addColorStop(1, rgb(c.slice(3, 6)));
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill();
}

function darkBG(ctx) {
  ctx.fillStyle = '#282828'; ctx.fillRect(0, 0, SW, SH);
  const g = ctx.createRadialGradient(SW / 2, SH / 2, 120, SW / 2, SH / 2, 360);
  g.addColorStop(0, 'rgba(46,44,47,0)'); g.addColorStop(1, 'rgba(48,46,50,0.6)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, SW, SH);
}

function wordLine(ctx, t, x0) {
  const size = wordFont, base = 176;
  let x = x0;
  const collapse = seg(t, F(405), F(409.5));
  const blobX = kf(t, DOT_X);
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
  const dx = kf(t, DOT_X);
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
function fitBaseFont(ctx) { baseFont = 37 * 139 / measure(ctx, 'BASE 44', 37, 'Inter Tight', 700, -0.01); }

function sunMark(ctx, t, cx, cy, r, morph) {
  layer(ctx, 'sun', g => sunMarkRaw(g, t, cx, cy, r, morph));
}
function sunMarkRaw(ctx, t, cx, cy, r, morph) {
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.clip();
  const g = ctx.createLinearGradient(0, cy - r, 0, cy + r);
  g.addColorStop(0, '#e4692d'); g.addColorStop(0.35, '#ea7a2e'); g.addColorStop(0.62, '#eb882b'); g.addColorStop(0.8, '#e27434'); g.addColorStop(1, '#e8804f');
  ctx.fillStyle = g; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  if (morph > 0) { // last trace of the cyan/pink blob
    const m = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    m.addColorStop(0, `rgba(50,220,245,${morph})`); m.addColorStop(1, `rgba(230,150,245,${morph})`);
    ctx.fillStyle = m; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  }
  ctx.restore();
  // horizontal cuts across the lower part
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  for (const [a, b] of [[0.69, 0.718], [0.82, 0.852], [0.93, 0.962]]) ctx.fillRect(cx - r - 1, cy - r + a * 2 * r, 2 * r + 2, (b - a) * 2 * r);
  ctx.restore();
}

function sunBG(ctx, t) {
  const warm = seg(t, F(412), F(467));
  const g = ctx.createLinearGradient(0, 0, 0, SH);
  g.addColorStop(0, rgb([225, 225, 223]));
  g.addColorStop(0.25, rgb(mix([232, 221, 219], [230, 217, 208], warm)));
  g.addColorStop(0.5, rgb(mix([233, 216, 208], [235, 207, 195], warm)));
  g.addColorStop(0.74, rgb(mix([229, 207, 194], [232, 191, 169], warm)));
  g.addColorStop(1, rgb(mix([228, 196, 181], [228, 180, 157], warm)));
  ctx.fillStyle = g; ctx.fillRect(0, 0, SW, SH);
}

function sceneSun(ctx, t) {
  if (t < F(412)) { // the dark stage lifts through grey to the warm backdrop
    if (t < F(410)) { sceneWords(ctx, t); return; }
    const g = ctx.createLinearGradient(0, 0, 0, SH);
    if (t < F(411)) { g.addColorStop(0, '#6e6b6a'); g.addColorStop(1, '#6a625e'); }
    else { g.addColorStop(0, '#d0cecd'); g.addColorStop(1, '#c4b8b2'); }
    ctx.fillStyle = g; ctx.fillRect(0, 0, SW, SH);
    if (t < F(411)) { // last letters either side of the blob
      text(ctx, 'fa', 222, 176, { size: wordFont, family: 'Figtree', color: [236, 236, 236], alpha: 0.8 });
      text(ctx, 're.', 292, 176, { size: wordFont, family: 'Figtree', color: [214, 160, 112], alpha: 0.8 });
    }
    const dx = kf(t, DOT_X);
    gradientDot(ctx, t, dx, 162.5, t < F(411) ? 25 : 29, t < F(411) ? 24 : 29);
    return;
  }
  sunBG(ctx, t);
  const cx = kf(t, SUN_X), r = kf(t, SUN_R), cy = r > 31 ? 130 + r : 132 + r;
  sunMark(ctx, t, cx, cy, r, 0.6 * (1 - seg(t, F(412), F(412.8))));
  // BASE 44
  const letters = [['B', 449, 453], ['A', 454, 456.5], ['S', 455, 457.5], ['E', 456, 458.5], [' ', 456, 456], ['4', 457, 460.5], ['4', 459, 463]];
  let x = cx + 37.5;
  for (const [ch, a, b] of letters) {
    const adv = measure(ctx, ch, baseFont, 'Inter Tight', 700, -0.01);
    const k = seg(t, F(a), F(b));
    if (k > 0 && ch !== ' ') {
      text(ctx, ch, x, 176, { size: baseFont, family: 'Inter Tight', weight: 700, color: mix([206, 190, 184], [42, 34, 32], E.ioQ(k)), alpha: clamp(k * 2.5), tracking: -0.01 });
    }
    x += adv;
  }
}
