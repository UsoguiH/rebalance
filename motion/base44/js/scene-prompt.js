'use strict';
// 0.00 – 4.20s: the prompt box. A pill grows into a card while a colour
// band (orange → magenta → cyan → white) sweeps through it, the prompt
// types itself, the camera punches in, the cursor clicks Send and the
// card lifts away.

const PROMPT = 'Build a creator storefront with a revenue dashboard and secure checkout.';
const PROMPT_BREAK = 63; // "…and secure " | "checkout."
const BOX_W = 308, BOX_H = 103;

// card geometry and the colour band come from js/band-data.js (sampled per frame)
const BOX_GROW = BOX_GROW_DATA;
const BAND = BAND_DATA;

// characters typed by frame
const TYPED = [[F(59), 0], [F(61), 3, E.lin], [F(63), 10, E.lin], [F(65), 20, E.lin], [F(67), 31, E.lin], [F(69), 40, E.lin],
  [F(71), 48, E.lin], [F(73), 54, E.lin], [F(75), 61, E.lin], [F(77), 65, E.lin], [F(79), 67, E.lin], [F(81), 69, E.lin],
  [F(83), 70, E.lin], [F(85), 72, E.lin]];

// camera on the card after typing: centre, zoom
const BOX_CAM = [
  [F(85), [288.5, 163, 1.0]],
  [F(86), [288.5, 163, 1.38], E.lin],
  [F(87), [288.5, 163, 1.52], E.outQ],
  [F(90), [288, 162.5, 1.57], E.outQ],
  [F(101), [279, 162, 1.61], E.lin],
  [F(111), [267, 161, 1.65], E.lin],
  [F(119), [263, 160, 1.7], E.lin],
  [F(121), [263, 151, 1.7], E.inQ],
  [F(123), [263, 138, 1.7], E.lin],
  [F(124), [263, 124, 1.69], E.lin],
  [F(125), [263, 106, 1.68], E.lin],
  [F(126), [263, 86, 1.67], E.lin],
  [F(127), [263, 68, 1.66], E.lin],
];

let promptFont = 9.9;
function fitPromptFont(ctx) {
  // line 1 measures 287 px wide in the reference before the zoom
  promptFont = 9.9 * 287 / measure(ctx, PROMPT.slice(0, PROMPT_BREAK - 1), 9.9, 'Inter', 400, -0.005);
}

function iconPlus(ctx, x, y, s, a = 1) {
  ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 0.9; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x - s, y); ctx.lineTo(x + s, y); ctx.moveTo(x, y - s); ctx.lineTo(x, y + s); ctx.stroke(); ctx.restore();
}
function iconSliders(ctx, x, y, s, a = 1) {
  ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 0.7; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x - s, y - s * 0.45); ctx.lineTo(x + s, y - s * 0.45); ctx.moveTo(x - s, y + s * 0.45); ctx.lineTo(x + s, y + s * 0.45); ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(x - s * 0.4, y - s * 0.45, s * 0.32, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(x + s * 0.4, y + s * 0.45, s * 0.32, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.restore();
}
function iconMic(ctx, x, y, s, a = 1) {
  ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 0.8; ctx.lineCap = 'round';
  rrect(ctx, x - s * 0.32, y - s, s * 0.64, s * 1.25, s * 0.32); ctx.stroke();
  ctx.beginPath(); ctx.arc(x, y - 0.05 * s, s * 0.62, 0.15, Math.PI - 0.15); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, y + s * 0.58); ctx.lineTo(x, y + s * 0.95); ctx.stroke();
  ctx.restore();
}

// Card contents in card-local px (0..BOX_W, 0..BOX_H)
function promptCard(ctx, t, o) {
  const { w, h, band, white, fadeRight } = o;
  const r = Math.min(9, h / 2);
  // soft drop shadow
  ctx.save();
  ctx.shadowColor = `rgba(0,0,0,${0.075 * white})`; ctx.shadowBlur = 22; ctx.shadowOffsetY = 6;
  rrect(ctx, 0, 0, w, h, r); ctx.fillStyle = '#fff'; ctx.fill();
  ctx.restore();
  if (band) {
    const g = ctx.createLinearGradient(0, 0, w, 0);
    band.forEach((c, i) => g.addColorStop(i / (band.length - 1), rgb(c)));
    rrect(ctx, 0, 0, w, h, r); ctx.fillStyle = g; ctx.fill();
    // faint top sheen
    const v = ctx.createLinearGradient(0, 0, 0, h);
    v.addColorStop(0, 'rgba(255,255,255,0.08)'); v.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = v; ctx.fill();
  }
  if (fadeRight > 0) { // right edge still unfolding: dissolve into the backdrop
    const g = ctx.createLinearGradient(w * 0.55, 0, w, 0);
    g.addColorStop(0, 'rgba(246,246,246,0)'); g.addColorStop(1, `rgba(246,246,246,${fadeRight})`);
    ctx.fillStyle = g; ctx.fillRect(w * 0.5, -2, w * 0.52, h + 4);
  }
}

function promptChrome(ctx, t, iconsA, sendT) {
  // + and sliders chips
  const chip = (cx) => { rrect(ctx, cx - 7.5, 86 - 7.5, 15, 15, 3.5); ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.08)'; ctx.lineWidth = 0.5; ctx.stroke(); };
  ctx.save(); ctx.globalAlpha *= iconsA[0];
  chip(18); iconPlus(ctx, 18, 86, 3.6);
  ctx.restore();
  ctx.save(); ctx.globalAlpha *= iconsA[1];
  chip(39); iconSliders(ctx, 39, 86, 3.4);
  iconMic(ctx, 262, 86, 6.2);
  ctx.restore();
  ctx.save(); ctx.globalAlpha *= iconsA[2];
  const s = lerp(3, 17, iconsA[2]);
  rrect(ctx, 288 - s / 2, 86 - s / 2, s, s, Math.min(4, s / 2));
  if (sendT > 0) {
    const g = ctx.createLinearGradient(288 - 8, 86 - 8, 288 + 8, 86 + 8);
    g.addColorStop(0, rgb(mix([10, 10, 10], [40, 22, 14], sendT)));
    g.addColorStop(0.55, rgb(mix([10, 10, 10], [72, 30, 12], sendT)));
    g.addColorStop(1, rgb(mix([10, 10, 10], [200, 92, 30], sendT)));
    ctx.fillStyle = g;
  } else ctx.fillStyle = '#0c0c0c';
  ctx.fill();
  if (iconsA[2] > 0.6) {
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.9; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(284.5, 86); ctx.lineTo(291.5, 86); ctx.moveTo(288.7, 83.2); ctx.lineTo(291.5, 86); ctx.lineTo(288.7, 88.8); ctx.stroke();
  }
  ctx.restore();
}

function promptText(ctx, t) {
  const typed = kf(t, TYPED);
  const shown = kf(t - 0.012, TYPED);
  const size = promptFont;
  const lines = [PROMPT.slice(0, PROMPT_BREAK), PROMPT.slice(PROMPT_BREAK)];
  const pos = n => { // caret position for n chars
    if (n <= PROMPT_BREAK - 1) return [9 + measure(ctx, PROMPT.slice(0, Math.floor(n)), size, 'Inter', 400, -0.005), 24];
    return [9 + measure(ctx, PROMPT.slice(PROMPT_BREAK, Math.floor(n)), size, 'Inter', 400, -0.005), 38.5];
  };
  // glyphs (the newest few fade in)
  let x = 9, y = 24;
  for (let i = 0; i < PROMPT.length; i++) {
    if (i === PROMPT_BREAK) { x = 9; y = 38.5; }
    const a = clamp(shown - i + 1);
    const ch = PROMPT[i];
    if (a > 0) text(ctx, ch, x, y, { size, color: [24, 24, 24], alpha: a, tracking: -0.005 });
    x += measure(ctx, ch, size, 'Inter', 400, -0.005);
  }
  // caret
  if (t > F(58)) {
    const [cx, cy] = pos(typed);
    const lead = t < F(86) ? 3 : 3.5;
    const a = kf(t, [[F(97), 1], [F(100), 0.25], [F(108), 0.2], [F(112), 0]]);
    if (a > 0) {
      ctx.fillStyle = rgb([30, 30, 30], a);
      ctx.fillRect(cx + lead, cy - 8.4, t > F(86) ? 0.8 : 0.6, 10.6);
    }
  }
}

function scenePrompt(ctx, t) {
  studioBG(ctx);
  if (t < F(29)) return;
  if (t < F(60)) {
    const [cx, cy, w, h] = kf(t, BOX_GROW);
    if (w < 1) return;
    const band = kf(t, BAND);
    const cols = []; for (let i = 0; i < band.length; i += 3) cols.push(band.slice(i, i + 3));
    ctx.save();
    ctx.translate(cx - w / 2, cy - h / 2);
    promptCard(ctx, t, { w, h, band: cols, white: seg(t, F(52), F(60)), fadeRight: 0 });
    if (w > 290) {
      ctx.save(); ctx.scale(w / BOX_W, h / BOX_H);
      promptChrome(ctx, t, [seg(t, F(40), F(43)), seg(t, F(44), F(46)), seg(t, F(46), F(49))], 0);
      ctx.restore();
    }
    ctx.restore();
    return;
  }
  const [cx, cy, z] = kf(t, BOX_CAM);
  const alpha = kf(t, [[F(122), 1], [F(123), 0.85], [F(124), 0.7], [F(125), 0.42], [F(126), 0.2], [F(127), 0]]);
  if (alpha > 0) {
    const ox = 288.5, oy = 163; // card centre before the punch-in
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(cx, cy); ctx.scale(z, z); ctx.translate(-BOX_W / 2, -BOX_H / 2);
    promptCard(ctx, t, { w: BOX_W, h: BOX_H, band: null, white: 1, fadeRight: 0 });
    // white card keeps a whisper of cyan at the right until it settles
    const tint = 1 - seg(t, F(60), F(64));
    if (tint > 0) {
      const g = ctx.createLinearGradient(BOX_W * 0.5, 0, BOX_W, 0);
      g.addColorStop(0, 'rgba(220,250,252,0)'); g.addColorStop(1, `rgba(200,240,248,${0.8 * tint})`);
      rrect(ctx, 0, 0, BOX_W, BOX_H, 9); ctx.fillStyle = g; ctx.fill();
    }
    promptText(ctx, t);
    promptChrome(ctx, t, [1, 1, 1], kf(t, [[F(108), 0], [F(113), 1], [F(119), 1], [F(122), 0.6]]));
    ctx.restore();
    void ox; void oy;
  }
  // pointer
  if (t > F(94)) {
    const z2 = z, sx = cx + (288 - BOX_W / 2) * z2 + 14, sy = cy + (86 - BOX_H / 2) * z2 + 15;
    const p = kf(t, [[F(94), [575, 330]], [F(97), [527, 257], E.outQ], [F(99), [520, 249], E.outQ], [F(101), [sx, sy], E.outQ]]);
    const [px, py] = t < F(101) ? p : [sx, sy];
    const ca = kf(t, [[F(124), 1], [F(126), 0.55], [F(127), 0.3], [F(129), 0]]);
    cursor(ctx, px, py + (t > F(121) ? -0 : 0), 1.05, ca);
  }
}
