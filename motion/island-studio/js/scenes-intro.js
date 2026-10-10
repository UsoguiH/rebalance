'use strict';
// Intro: Bloub's two eyes blink, split apart around "Your island", close
// into the black island, which flips through gradient tiles with live status
// labels, and the Island wordmark lands over a bulging tile grid.
// (Choreography from the ElevenAgents study; FR(n) is that film's frame n.)

const FR = n => (n - 1) / 30; // reference frame → seconds
const INK = [20, 20, 20];

// mono status label: a small bar, uppercase text, optional grey lines above
const MONO = 'DM Mono';
function monoLabel(ctx, x, y, s, o = {}) {
  const a = o.alpha ?? 1;
  if (a <= 0.01) return;
  ctx.save(); ctx.globalAlpha *= a;
  if (o.sub) o.sub.forEach((line, i) => text(ctx, line, x + 7, y - 8 - (o.sub.length - 1 - i) * 7.4, { size: 5.6, family: MONO, color: [170, 168, 164], tracking: 0.06 }));
  ctx.fillStyle = rgb(INK); ctx.fillRect(x, y - 5.6, 2, 6.2);
  text(ctx, s, x + 7, y, { size: 5.8, family: MONO, weight: 500, color: [40, 40, 40], tracking: 0.07 });
  ctx.restore();
}
// scramble the tail of a string while it resolves (k: 0..1)
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
function scramble(s, k, seed = 1) {
  const n = Math.floor(s.length * clamp(k));
  if (n >= s.length) return s;
  const r = mulberry32(seed + Math.floor(k * 40));
  let out = s.slice(0, n);
  for (let i = n; i < Math.min(s.length, n + 4); i++) out += s[i] === ' ' ? ' ' : GLYPHS[Math.floor(r() * GLYPHS.length)];
  return out;
}

// ------------------------------------------------------------ pause → Your agents
// Bloub's eyes: two black pills (they are also a pause sign)
function pauseBars(ctx, cx, cy, sep, w = 5.5, h = 26, col = INK, blink = 0) {
  ctx.fillStyle = rgb(col);
  const hh = Math.max(w, h * (1 - 0.85 * blink));
  rrect(ctx, cx - sep / 2 - w / 2, cy - hh / 2, w, hh, w / 2); ctx.fill();
  rrect(ctx, cx + sep / 2 - w / 2, cy - hh / 2, w, hh, w / 2); ctx.fill();
}
const AGENTS_TXT = 'Your island';
function sceneOpen(ctx, t) {
  panelBG(ctx);
  const cy = PCY + 0.5;
  if (t < FR(37.5)) {
    const sep = kf(t, [[FR(1), 15], [FR(29), 16], [FR(31), 18], [FR(33), 26, E.inQ], [FR(36), 50, E.inQ], [FR(37.5), 140, E.inQ]]);
    const h = kf(t, [[FR(33), 26], [FR(36), 22], [FR(37.5), 12]]);
    pauseBars(ctx, PCX, cy, sep, kf(t, [[FR(33), 7], [FR(36), 5]]), h, INK, blinkAt(t, [FR(9), FR(21)]));
    return;
  }
  // the bars fly out to become the two dots, the words appear between them
  const dx = kf(t, [[FR(37.5), 233], [FR(40), 259, E.outQ], [FR(43), 268, E.outQ], [FR(52), 283, E.outQ], [FR(70), 285]]);
  const ldy = kf(t, [[FR(68), 0], [FR(70), 19, E.ioQ]]);
  ctx.fillStyle = rgb(INK);
  ctx.fillRect(PCX - dx - 2.75, cy - 2.75 + ldy, 5.5, 5.5); ctx.fillRect(PCX + dx - 2.75, cy - 2.75, 5.5, 5.5);
  if (t < FR(67)) {
    // collapse from both ends, a small block riding each end
    const keep = Math.round(kf(t, [[FR(57), 11], [FR(58), 9, E.lin], [FR(62), 7, E.lin], [FR(64), 6, E.lin], [FR(66), 1, E.lin]]));
    const cut = (11 - keep) / 2;
    const a0 = Math.floor(cut), s = AGENTS_TXT.slice(a0, a0 + keep);
    const size = 23, full = measure(ctx, AGENTS_TXT, size, 'Inter', 400, -0.02);
    const xs = PCX - full / 2 + measure(ctx, AGENTS_TXT.slice(0, a0), size, 'Inter', 400, -0.02);
    const appear = seg(t, FR(37.5), FR(40));
    text(ctx, s, xs, cy + 7.5, { size, color: INK, tracking: -0.02, alpha: appear, blur: (1 - appear) * 2 });
    if (keep < 11) {
      const bw = measure(ctx, s, size, 'Inter', 400, -0.02), q = keep > 5 ? 7 : 5.5;
      ctx.fillRect(xs - q - 1.5, cy - q / 2, q, q); ctx.fillRect(xs + bw + 1.5, cy - q / 2, q, q);
    }
    return;
  }
  // a block grows in the middle
  const s = kf(t, [[FR(67), 10], [FR(68), 25, E.outQ], [FR(70), 68, E.outQ]]);
  const w = s * 1.9, h = s * 0.62;
  rrect(ctx, PCX - w / 2, cy - h / 2, w, h, h / 2); ctx.fill();
  if (s > 30) pauseBars(ctx, PCX - w / 2 + h / 2 + 4, cy, h * 0.18, h * 0.09, h * 0.36, [245, 245, 248]);
}

// ------------------------------------------------------------ gradient tiles with labels
// [first frame, look, tile width, tile height]
const TILE_SEQ = [
  [72.5, 'violet', 134, 125], [75, 'violet', 143, 134], [86.5, 'teal', 159, 148], [96.5, 'magenta', 173, 161], [106.5, 'peach', 187, 175],
  [113.5, 'sky', 202, 188], [121.5, 'teal', 217, 202], [126.5, 'magenta', 232, 215], [130.5, 'peach', 368, 343], [133.5, 'rose', 438, 408],
  [136.5, 'lilac', 690, 442], [139.5, 'beige', 787, 442],
];
// label layouts (bar x, baseline y, text, grey lines above) per stretch
const LBL_OLD = {
  a: [[148, 181, 'REVIEWING RESPONSES', ['GOOD MORNING JANA! OF COURSE']], [148, 337, 'INVESTIGATING TRANSFERS'], [598, 175, 'ANALYZING CONVERSATIONS'], [598, 265, 'WRITING FIX'], [598, 418, 'PROPOSING CHANGE']],
  b: [[148, 181, 'REVIEWING RESPONSES', ['GOOD MORNING JANA! OF COURSE', 'LET ME PULL UP THE PRICING', 'DETAILS FOR YOU']], [148, 337, 'INVESTIGATING TRANSFERS'], [598, 142, 'ANALYZING CONVERSATIONS'],
    [598, 193, 'WRITING FIX'], [598, 213, 'RUNNING SIMULATIONS'], [598, 307, 'PROPOSING CHANGE', ['WEB PAGES']]],
  c: [[148, 181, 'REVIEWING RESPONSES', ['GOOD MORNING JANA! OF COURSE', 'LET ME PULL UP THE PRICING', 'DETAILS FOR YOU']], [148, 337, 'INVESTIGATING TRANSFERS'], [598, 142, 'ANALYZING CONVERSATIONS'],
    [598, 196, 'RUNNING SIMULATIONS'], [598, 253, 'PROPOSING CHANGE', ['WEB PAGES']]],
  d: [[123, 181, 'MONITORING CALLS', ['GOOD MORNING JANA! OF COURSE', 'LET ME PULL UP THE PRICING']], [148, 253, 'REVIEWING RESPONSES'], [104, 337, 'INVESTIGATING TRANSFERS'],
    [673, 142, 'ANALYZING CONVERSATIONS', []], [673, 196, 'RUNNING SIMULATIONS'], [623, 265, 'PROPOSING CHANGE'], [623, 307, 'ROLLING OUT EXPERIMENTS']],
  e: [[123, 181, 'MONITORING CALL'], [123, 337, 'MONITORING CALL'], [673, 142, 'MONITORING CALL', ['GOOD MORNING JANA!']], [673, 196, 'MONITORING CALL'], [673, 307, 'MONITORING CALL']],
};
const LBL = {
  a: [[148, 181, 'WATCHING SESSIONS', ['4 CLAUDE CODE SESSIONS FOUND']], [148, 337, 'AURORA-WEB  EDITING THEME.TS'], [598, 175, 'PIXEL-API  RUNNING NPM TEST'], [598, 265, 'NOTES-CLI  READING PACKAGE.JSON'], [598, 418, 'NOW PLAYING  MIDNIGHT CITY']],
  b: [[148, 181, 'WATCHING SESSIONS', ['4 CLAUDE CODE SESSIONS FOUND', 'AURORA-WEB WANTS TO RUN', 'NPM RUN BUILD']], [148, 337, 'AURORA-WEB  NEEDS YOU'], [598, 142, 'PIXEL-API  RUNNING NPM TEST'],
    [598, 193, 'NOTES-CLI  DONE'], [598, 213, '5-HOUR LIMIT  47%'], [598, 307, 'BATTERY  62%', ['CHARGING']]],
  c: [[148, 181, 'WATCHING SESSIONS', ['4 CLAUDE CODE SESSIONS FOUND', 'AURORA-WEB WANTS TO RUN', 'NPM RUN BUILD']], [148, 337, 'AURORA-WEB  NEEDS YOU'], [598, 142, 'PIXEL-API  RUNNING NPM TEST'],
    [598, 196, '5-HOUR LIMIT  47%'], [598, 253, 'FOCUS  24:06', ['DEEP WORK']]],
  d: [[123, 181, 'LOCALHOST:5173', ['VITE  UP 42M', 'NEXT.JS  UP 7M']], [148, 253, 'WEEKLY LIMIT  63%'], [104, 337, 'DOWNLOAD  ISLANDLAB.EXE'],
    [673, 142, 'TASKS  2 OF 4', []], [673, 196, 'CALENDAR  THURSDAY 8'], [623, 265, 'NOTES  API KEY ROTATION'], [623, 307, 'NETWORK  6.7 MB/S']],
  e: [[123, 181, 'ISLAND'], [123, 337, 'ISLAND'], [673, 142, 'ISLAND', ['HI, I\u2019M BLOUB']], [673, 196, 'ISLAND'], [673, 307, 'ISLAND']],
};
const LBL_AT = [[FR(72.5), 'a'], [FR(86.5), 'b'], [FR(96.5), 'c'], [FR(113.5), 'd'], [FR(121.5), 'e']];
function sceneTiles(ctx, t) {
  scrubT = t;
  const cur = TILE_SEQ.filter(s => t >= FR(s[0])).pop();
  const [f0, look, w, h] = cur;
  if (look === 'beige') { scenePausePanel(ctx, t); return; }
  panelBG(ctx);
  const cy = PCY + 0.5;
  // labels, decoding in after each change
  if (t < FR(126.5)) {
    const [l0, key] = LBL_AT.filter(l => t >= l[0]).pop();
    const k = seg(t, l0, l0 + 0.25);
    LBL[key].forEach(([x, y, s, sub], i) => monoLabel(ctx, x, y, scramble(s, k + i * 0.05, i * 7), { sub, alpha: 1 }));
  } else {
    // just four dots by now
    ctx.fillStyle = rgb(INK);
    const dx = w / 2 + 120;
    for (const [x, y] of [[PCX - dx, cy - 40], [PCX - dx, cy + 34], [PCX + dx, cy - 2], [PCX + dx + 30, cy - 46]]) ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
  }
  ctx.save();
  if (w > 600) { ctx.beginPath(); ctx.rect(P.x, P.y, P.w, P.h); ctx.clip(); }
  gradTile(ctx, look, PCX - w / 2, cy - h / 2, w, h, w > 600 ? 0 : 3);
  ctx.restore();
  // the pause button rides the big tiles
  if (t >= FR(130.5)) pauseButton(ctx, PCX, cy, kf(t, [[FR(130.5), 12], [FR(133.5), 18], [FR(136.5), 24]]));
}
function pauseButton(ctx, x, y, s) {
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.08)'; ctx.shadowBlur = s * 0.3;
  ctx.fillStyle = 'rgba(255,255,255,0.96)'; rrect(ctx, x - s / 2, y - s / 2, s, s, s * 0.14); ctx.fill(); ctx.restore();
  pauseBars(ctx, x, y, s * 0.2, s * 0.085, s * 0.3, INK, blinkAt(scrubT, [FR(141)]));
}
let scrubT = 0; // the time pauseButton is drawn at (for its blink)
function scenePausePanel(ctx, t) {
  scrubT = t;
  ctx.drawImage(gradImage('beige'), P.x, P.y, P.w, P.h);
  pauseButton(ctx, PCX, PCY + 0.5, kf(t, [[FR(139.5), 63], [FR(143), 78, E.outQ], [FR(144.5), 70]]));
}

// ------------------------------------------------------------ bulging tile grid + wordmark
// Cell edges in grid units: the centre cell is two units wide, the rest one.
function gridEdges(n) { const e = [-1, 1]; for (let i = 2; i <= n; i++) { e.unshift(-i); e.push(i); } return e; }
const GX = gridEdges(7), GY = gridEdges(5);
// grid unit → panel offset: the centre half-cell is 70 px, outer units shrink a little
const gpos = (u, unit, half) => Math.sign(u) * (half + (Math.abs(u) - 1) * unit * (1 - 0.025 * (Math.abs(u) - 1)));
function tileGrid(ctx, t) {
  const grow = kf(t, [[FR(144.5), 0.84], [FR(160), 1.0, E.outQ], [FR(200), 1.6, E.lin], [FR(226), 1.95, E.lin]]);
  const mask = kf(t, [[FR(144.5), 0.5], [FR(152), 0.8], [FR(160), 1.4, E.outQ]]);
  const fade = 1 - seg(t, FR(224), FR(229));
  if (fade <= 0) return;
  const half = 72 * grow, unit = 88 * grow, cy = PCY + 0.5;
  const bulge = (x, y) => { // barrel bend: rows bow outward toward the sides
    const nx = (x - PCX) / 400, ny = (y - cy) / 220;
    return [x + (x - PCX) * 0.1 * ny * ny, y + (y - cy) * 0.3 * nx * nx];
  };
  ctx.save(); ctx.globalAlpha *= fade;
  ctx.lineWidth = 1;
  for (let i = 0; i < GX.length - 1; i++) for (let j = 0; j < GY.length - 1; j++) {
    const x0 = PCX + gpos(GX[i], unit, half) + 3.5, x1 = PCX + gpos(GX[i + 1], unit, half) - 3.5;
    const y0 = cy + gpos(GY[j], unit, half) + 3.5, y1 = cy + gpos(GY[j + 1], unit, half) - 3.5;
    const mx = ((x0 + x1) / 2 - PCX) / (400 * mask), my = ((y0 + y1) / 2 - cy) / (230 * mask);
    const vis = clamp(1.6 - Math.hypot(mx, my) * 1.2);
    if (vis <= 0) continue;
    const pts = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(([x, y]) => bulge(x, y));
    const r = Math.min(14 * grow, (x1 - x0) / 3);
    ctx.save(); ctx.globalAlpha *= vis;
    roundedQuad(ctx, pts, r);
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.translate(0.6, 0.8); ctx.stroke();
    ctx.translate(-0.6, -0.8); ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(0,0,0,0.085)'; ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}
function roundedQuad(ctx, p, r) {
  ctx.beginPath();
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const m0 = mid(p[3], p[0]);
  ctx.moveTo(m0[0], m0[1]);
  for (let i = 0; i < 4; i++) { const a = p[i], b = p[(i + 1) % 4]; ctx.arcTo(a[0], a[1], b[0], b[1], r); }
  ctx.closePath();
}
// the wordmark: a little black island with Bloub's eyes, "Island" in bold,
// then "for Windows"; both type in left to right
const WM = { size: 25, gap: 6.5 };
function elevenMark(ctx, x, y, size, alpha = 1, partL = 1, partR = 1, t = 0) {
  const left = 'Island', right = 'for Windows';
  const pw = size * 1.35, ph = size * 0.66;
  const lw = measure(ctx, left, size, 'Inter', 700, -0.03);
  const total = pw + size * 0.28 + lw;
  ctx.save(); ctx.globalAlpha *= alpha;
  const nL = Math.round((left.length + 1) * partL);
  if (nL >= 1) {
    ctx.fillStyle = rgb(INK); rrect(ctx, x, y - size * 0.7, pw, ph, ph / 2); ctx.fill();
    pauseBars(ctx, x + ph / 2 + 2, y - size * 0.7 + ph / 2, ph * 0.22, ph * 0.1, ph * 0.38, [246, 246, 250], blinkAt(t, [FR(190)]));
  }
  if (nL > 1) text(ctx, left.slice(0, nL - 1), x + pw + size * 0.28, y, { size, weight: 700, color: INK, tracking: -0.03 });
  const nR = Math.round(right.length * partR);
  if (nR > 0) text(ctx, right.slice(0, nR), x + total + WM.gap, y, { size, weight: 400, color: INK, tracking: -0.02 });
  ctx.restore();
  return total + WM.gap + measure(ctx, right, size, 'Inter', 400, -0.02);
}
function sceneLogo(ctx, t) {
  panelBG(ctx, [247, 246, 244]);
  tileGrid(ctx, t);
  const cy = PCY + 6;
  if (t < FR(148)) { // the pause bars sit in the centre cell, then slide apart
    const sep = kf(t, [[FR(144.5), 7], [FR(146), 9], [FR(148), 40, E.inQ]]);
    pauseBars(ctx, PCX, PCY + 0.5, sep, 3, 12);
    return;
  }
  const size = WM.size;
  const arch = 'Agents';
  const archW = measure(ctx, arch, size, 'Inter', 400, -0.02);
  const baseW = elevenMark(ctx, -1000, -1000, size, 0);
  const archK = seg(t, FR(168), FR(176));
  const totalW = baseW + (size * 0.45 + archW) * E.ioQ(archK);
  const x = PCX - totalW / 2;
  const pL = seg(t, FR(148), FR(156)), pR = seg(t, FR(150), FR(157));
  // text sweeps away to the left as the gradient comes in (frames 230–237)
  const out = seg(t, FR(231), FR(238));
  ctx.save();
  if (out > 0) { // fade the left side first
    const mx = lerp(P.x - 200, P.x + P.w, out);
    const g = ctx.createLinearGradient(mx, 0, mx + 260, 0);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,1)');
    layer(ctx, 'wm', gg => { drawWord(gg); gg.globalCompositeOperation = 'destination-in'; gg.fillStyle = g; gg.fillRect(0, 0, SW, SH); });
  } else drawWord(ctx);
  ctx.restore();
  function drawWord(g) {
    elevenMark(g, x, cy, size, 1, pL, pR, t);
    if (archK > 0) {
      const n = Math.round(arch.length * seg(t, FR(169), FR(175)));
      text(g, scrambleLower(arch, n, t), x + baseW + size * 0.45, cy, { size, color: [130, 122, 160], tracking: -0.02, alpha: clamp(archK * 3) });
    }
  }
}
function scrambleLower(s, n, t) {
  if (n >= s.length) return s;
  const r = mulberry32(Math.floor(t * 30));
  let out = s.slice(0, n);
  for (let i = n; i < Math.min(s.length, n + 3); i++) out += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(r() * 26)];
  return out;
}

// gradient sweeping in from the right under the wordmark (frames 229–240)
function sceneLogoOut(ctx, t) {
  sceneLogo(ctx, t);
  const p = seg(t, FR(228), FR(239));
  if (p <= 0) return;
  layer(ctx, 'sweep', g => {
    g.drawImage(gradImage('lilac', 400, 225), P.x, P.y, P.w, P.h);
    const m = g.createLinearGradient(P.x + P.w * (1.25 - 1.6 * p), 0, P.x + P.w * (1.25 - 1.6 * p) + 380, 0);
    m.addColorStop(0, 'rgba(0,0,0,0)'); m.addColorStop(1, 'rgba(0,0,0,1)');
    g.globalCompositeOperation = 'destination-in'; g.fillStyle = m; g.fillRect(0, 0, SW, SH);
  });
}
