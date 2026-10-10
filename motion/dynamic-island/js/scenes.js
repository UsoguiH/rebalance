'use strict';
// The film, scene by scene. Every cut sits on a bar line of the music
// (bar = 2.43 s); the end card lands on the track's big hit at 19.0 s.

const PILL = [132, 26, 13]; // the dormant island: w, h, corner radius

// pill contents: Bloub's face on the left, the working agents on the right
function pillContents(ctx, cx, y, w, h, t, alpha = 1, n = 4) {
  if (alpha <= 0.01) return;
  ctx.save(); ctx.globalAlpha *= alpha;
  face(ctx, cx - w / 2 + h / 2 + 2, y + h / 2, h * 0.3, t);
  for (let i = 0; i < n; i++) {
    const a = AGENTS[n - 1 - i];
    bloub(ctx, cx + w / 2 - h / 2 - 1 - i * h * 0.27, y + h / 2, h * 0.19, { body: a.body, rim: false, blink: blinkAt(t, [1.4 + i * 0.7]) });
  }
  text(ctx, `${n} working`, cx + w / 2 - h / 2 - n * h * 0.27 - 4, y + h / 2 + 2.3, { size: 6.2, color: [150, 150, 160], align: 'right' });
  ctx.restore();
}

// ------------------------------------------------------------ 1 · intro
function sceneIntro(ctx, t) {
  studioBG(ctx, 0, t * 0.5);
  ctx.save();
  const s = kf(t, [[0, 2.6], [1.71, 1.55, E.outC]]);
  camera(ctx, 289, kf(t, [[0, 30], [1.71, 70, E.outC]]), s);
  const y = springKF(t, [[0, -40], [0.08, 14]], 0.7);
  const [w, h, r] = springKF(t, [[0, [26, 26, 13]], [0.22, PILL]], 0.65);
  island(ctx, 289, y, w, h, r);
  pillContents(ctx, 289, y, w, h, t, seg(t, 0.4, 0.7));
  ctx.restore();
  // the caption sits under the island in screen space
  caption(ctx, 'agents', t, 289, 236, { size: 13 });
}

// ------------------------------------------------------------ 2 · the team
const TEAM = [1.75, [262, 158, 30]];
function teamPanel(ctx, t, x0, y0, w, h, a) {
  ctx.save(); ctx.globalAlpha *= a;
  face(ctx, x0 + 18, y0 + 17, 6.5, t);
  text(ctx, 'Claude Code', x0 + 30, y0 + 20, { size: 8.5, weight: 600, color: [245, 245, 250] });
  text(ctx, '4 working', x0 + 84, y0 + 20, { size: 6.5, color: [140, 140, 150] });
  for (const [k, ic] of [[0, '+'], [1, '≡'], [2, '⌂']]) {
    const bx = x0 + w - 56 + k * 18, by = y0 + 17;
    ctx.fillStyle = k === 0 ? rgb(VIOLET) : 'rgba(255,255,255,0.1)';
    ctx.beginPath(); ctx.arc(bx, by, 6.2, 0, TAU); ctx.fill();
    text(ctx, ic, bx, by + 2.6, { size: 7.5, weight: 600, color: [235, 235, 245], align: 'center' });
  }
  AGENTS.forEach((ag, i) => {
    const col = i % 2, row = (i / 2) | 0;
    const bx = x0 + w / 2 + (col ? 54 : -54), by = y0 + 62 + row * 56 + Math.sin(t * 3 + i * 1.7) * 1.4;
    const pop = spring(seg(t, 1.98 + i * 0.08, 2.5 + i * 0.08));
    if (pop <= 0) return;
    const need = i === 0 ? seg(t, 3.55, 3.7) : 0;
    ctx.save(); ctx.translate(bx, by); ctx.scale(pop, pop);
    const g = ctx.createRadialGradient(0, 4, 2, 0, 4, 30); g.addColorStop(0, rgb(ag.body, 0.35)); g.addColorStop(1, rgb(ag.body, 0));
    ctx.fillStyle = g; ctx.fillRect(-32, -28, 64, 64);
    bloub(ctx, 0, 0, 19, { body: ag.body, rim: false, blink: blinkAt(t, [2.6 + i * 0.35, 3.8 - i * 0.2]), look: [Math.sin(t * 1.6 + i) * 0.6, 0.2] });
    // "working" speech dots, or the orange needs-you badge
    if (i !== 3) {
      ctx.fillStyle = rgb(mix(BLUE, ORANGE, need));
      rrect(ctx, -22, -21, 16, 8, 4); ctx.fill();
      if (need < 0.5) for (let d = 0; d < 3; d++) {
        ctx.fillStyle = `rgba(255,255,255,${0.5 + 0.5 * Math.sin(t * 8 - d)})`;
        ctx.beginPath(); ctx.arc(-18 + d * 4, -17, 1, 0, TAU); ctx.fill();
      } else text(ctx, '!', -14, -14.4, { size: 7, weight: 700, color: [255, 255, 255], align: 'center' });
    }
    ctx.restore();
    const label = i === 0 ? (need > 0.5 ? 'aurora-web · needs you' : 'aurora-web · working…') : ag.name;
    text(ctx, label, bx, by + 30, { size: 6.2, color: i === 0 ? mix([200, 200, 210], ORANGE, need) : [170, 170, 180], align: 'center', alpha: pop });
  });
  ctx.restore();
}
function sceneTeam(ctx, t) {
  studioBG(ctx, 0.2, t * 0.5);
  ctx.save();
  camera(ctx, 289, kf(t, [[1.71, 70], [2.3, 94, E.ioC], [4.14, 96, E.lin]]), kf(t, [[1.71, 1.55], [2.3, 1.3, E.ioC], [4.14, 1.4, E.lin]]));
  const [w, h, r] = springKF(t, [[0, PILL], TEAM], 0.7);
  const glow = seg(t, 3.55, 3.75) * (0.75 + 0.25 * Math.sin(t * 9));
  island(ctx, 289, 14, w, h, r, { glow });
  pillContents(ctx, 289, 14, w, h, t, 1 - seg(t, 1.71, 1.85));
  teamPanel(ctx, t, 289 - w / 2, 14, w, h, seg(t, 1.95, 2.2));
  ctx.restore();
}

// ------------------------------------------------------------ 3 · needs you
function sceneNeeds(ctx, t) {
  darkStage(ctx, [[289, 120, 260, [94, 92, 230], 0.35], [289, 112, 150, ORANGE, 0.18 * (1 - seg(t, 6.0, 6.3))], [520, 300, 220, [246, 104, 182], 0.2]]);
  const cy = 112;
  const allowed = seg(t, 6.08, 6.12);
  const [w, h, r] = springKF(t, [[0, [262, 158, 30]], [4.14, [304, 48, 24]], [6.12, [176, 34, 17]]], 0.62);
  const y = cy - h / 2;
  const glow = (1 - seg(t, 6.0, 6.2)) * (0.75 + 0.25 * Math.sin(t * 7));
  island(ctx, 289, y, w, h, r, { glow });
  const x0 = 289 - w / 2, x1 = 289 + w / 2;
  const a = seg(t, 4.3, 4.5) * (1 - allowed);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    ctx.fillStyle = rgb(ORANGE); ctx.beginPath(); ctx.arc(x0 + 20, cy, 8, 0, TAU); ctx.fill();
    text(ctx, '!', x0 + 20, cy + 3.2, { size: 10, weight: 700, color: [0, 0, 0], align: 'center' });
    text(ctx, 'Claude Code', x0 + 36, cy - 3, { size: 8.5, weight: 600, color: [246, 246, 250] });
    text(ctx, 'aurora-web · wants to run', x0 + 40 + measure(ctx, 'Claude Code', 8.5, 'Inter', 600), cy - 3, { size: 6.2, color: [140, 140, 150] });
    ctx.fillStyle = 'rgba(255,159,10,0.16)'; rrect(ctx, x0 + 35, cy + 2.5, 62, 11, 3); ctx.fill();
    text(ctx, 'npm run build', x0 + 39, cy + 10.6, { size: 6.6, family: 'DM Mono', color: ORANGE });
    // Deny / Allow
    const press = t > 5.95 && t < 6.08 ? 1 : 0;
    ctx.fillStyle = '#2c2c30'; rrect(ctx, x1 - 108, cy - 10, 44, 20, 10); ctx.fill();
    text(ctx, 'Deny', x1 - 86, cy + 3, { size: 7.4, weight: 500, color: [230, 230, 236], align: 'center' });
    ctx.save(); ctx.translate(x1 - 34, cy); ctx.scale(1 - press * 0.08, 1 - press * 0.08);
    ctx.fillStyle = rgb(mix(BLUE, [90, 180, 255], seg(t, 5.95, 6.05))); rrect(ctx, -26, -10, 52, 20, 10); ctx.fill();
    text(ctx, 'Allow', 0, 3, { size: 7.4, weight: 600, color: [255, 255, 255], align: 'center' });
    ctx.restore();
    ctx.restore();
  }
  // allowed: a compact pill with a check and the agent carrying on
  if (allowed > 0) {
    const b = seg(t, 6.18, 6.32);
    ctx.save(); ctx.globalAlpha *= b;
    ctx.fillStyle = rgb(GREEN); ctx.beginPath(); ctx.arc(x0 + 17, cy, 6.5, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#000'; ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(x0 + 14, cy); ctx.lineTo(x0 + 16.4, cy + 2.4); ctx.lineTo(x0 + 20.2, cy - 2.4); ctx.stroke();
    text(ctx, 'Allowed · building…', x0 + 29, cy + 2.6, { size: 7.4, weight: 500, color: [235, 235, 242] });
    bloub(ctx, x1 - 16, cy, 6.5, { body: AGENTS[0].body, rim: false });
    ctx.restore();
  }
  ripples(ctx, 289 + 152 - 34, cy, t, 6.0, [140, 200, 255]); // where Allow was
  // pointer glides in and clicks Allow
  if (t > 5.0) {
    const [px, py] = kf(t, [[5.0, [470, 320]], [5.8, [409, cy + 2], E.ioC], [6.6, [413, cy + 8]]]);
    pointer(ctx, px, py, t > 5.95 && t < 6.08 ? 1 : 0, seg(t, 5.0, 5.2));
  }
  caption(ctx, 'needs', t, 289, 212, { size: 13, color: [236, 234, 246] });
}

// ------------------------------------------------------------ 4 · done
function sceneDone(ctx, t) {
  studioBG(ctx, 0.35, t * 0.5);
  ctx.save();
  camera(ctx, 289, 150, 1.12);
  const banner = 8.62;
  const [w, h, r] = springKF(t, [[0, PILL], [6.72, [150, 30, 15]], [6.9, PILL], [banner, [272, 38, 19]]], 0.5);
  island(ctx, 289, 14, w, h, r);
  pillContents(ctx, 289, 14, w, h, t, (1 - seg(t, 6.6, 6.75)) + seg(t, 8.45, 8.55) * (1 - seg(t, banner, banner + 0.05)), 3);
  // the done banner
  const ba = seg(t, banner + 0.12, banner + 0.3);
  if (ba > 0) {
    ctx.save(); ctx.globalAlpha *= ba;
    const x0 = 289 - w / 2;
    face(ctx, x0 + 19, 14 + h / 2, 7, t);
    text(ctx, 'aurora-web is done', x0 + 33, 14 + h / 2 - 1.5, { size: 7.6, weight: 600, color: [246, 246, 250] });
    text(ctx, 'Dark mode for the settings page', x0 + 33, 14 + h / 2 + 7.5, { size: 6.2, color: [140, 140, 150] });
    ctx.fillStyle = 'rgba(10,132,255,0.18)'; rrect(ctx, x0 + w - 62, 14 + h / 2 - 7, 48, 14, 7); ctx.fill();
    ctx.fillStyle = rgb(BLUE); ctx.beginPath(); ctx.arc(x0 + w - 54, 14 + h / 2, 2, 0, TAU); ctx.fill();
    text(ctx, 'working…', x0 + w - 49, 14 + h / 2 + 2.2, { size: 5.8, color: [120, 180, 255] });
    ctx.restore();
  }
  // Bloub leaps out of the island, lands, celebrates, flies home
  const out = seg(t, 6.82, 7.36), home = seg(t, 8.25, 8.62);
  if (t > 6.82 && t < 8.62) {
    const land = [300, 168];
    let x, y, rr;
    if (home <= 0) {
      const p = E.outQ(out);
      x = lerp(289, land[0], p); y = lerp(30, land[1], p) - Math.sin(Math.PI * p) * 70; rr = lerp(7, 27, E.outC(out));
    } else {
      const p = E.inC(home);
      x = lerp(land[0], 289, p); y = lerp(land[1], 27, p) - Math.sin(Math.PI * p) * 40; rr = lerp(27, 7, p);
    }
    const sq = t > 7.36 && home <= 0 ? Math.exp(-(t - 7.36) * 7) * Math.cos((t - 7.36) * 22) * 0.16 : 0;
    const shadowA = home <= 0 ? out : 1 - home;
    ctx.fillStyle = `rgba(60,40,110,${0.16 * shadowA})`;
    ctx.beginPath(); ctx.ellipse(land[0], land[1] + 30, 22 * shadowA, 4, 0, 0, TAU); ctx.fill();
    confetti(ctx, land[0], land[1] - 4, t, 7.38, AGENTS[0].body);
    bloub(ctx, x, y, rr, { sx: 1 + sq, sy: 1 - sq, blink: t > 7.62 && t < 7.95 ? 0.75 : blinkAt(t, [8.1]), look: [0.4, -0.1] });
    if (home <= 0) {
      const b1 = spring(seg(t, 7.42, 7.8)), b2 = spring(seg(t, 7.5, 7.9)), b3 = spring(seg(t, 7.55, 7.95));
      ctx.save(); ctx.translate(x - rr * 0.62, y - rr * 0.62); ctx.scale(b1, b1);
      ctx.fillStyle = rgb(GREEN); ctx.beginPath(); ctx.arc(0, 0, 6, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-2.6, 0); ctx.lineTo(-0.6, 2.2); ctx.lineTo(2.8, -2); ctx.stroke(); ctx.restore();
      ctx.save(); ctx.translate(x + rr + 20, y - rr - 4); ctx.scale(b2, b2);
      ctx.shadowColor = 'rgba(40,20,80,0.18)'; ctx.shadowBlur = 8;
      ctx.fillStyle = '#fff'; rrect(ctx, -24, -10, 48, 20, 10); ctx.fill(); ctx.shadowColor = 'transparent';
      ctx.beginPath(); ctx.moveTo(-14, 8); ctx.lineTo(-20, 15); ctx.lineTo(-8, 9); ctx.fill();
      text(ctx, "I'm done!", 0, 3, { size: 8, weight: 600, color: [30, 28, 40], align: 'center' });
      ctx.restore();
      ctx.save(); ctx.translate(x, y + rr + 13); ctx.scale(b3, b3);
      ctx.fillStyle = '#16151c'; rrect(ctx, -22, -6.5, 44, 13, 6.5); ctx.fill();
      text(ctx, 'aurora-web', 0, 2.2, { size: 6.2, weight: 500, color: [240, 240, 246], align: 'center' });
      ctx.restore();
    }
  }
  ctx.restore();
  caption(ctx, 'done', t, 289, 292, { size: 13 });
}

// ------------------------------------------------------------ 5 · music
function waveBars(ctx, t, cx, cy, grow) {
  const n = 23;
  for (let i = 0; i < n; i++) {
    const d = Math.abs(i - (n - 1) / 2) / ((n - 1) / 2);
    const beat = Math.pow(Math.max(0, Math.cos(((t - 9.0) / 0.6075) * Math.PI)), 6);
    const env = (0.35 + 0.65 * (1 - d * d)) * (0.55 + 0.25 * Math.sin(t * 7.3 + i * 1.9) + 0.2 * Math.sin(t * 13 + i * 0.7) + 0.25 * beat);
    const hgt = Math.max(10, 230 * env * grow);
    const x = cx + (i - (n - 1) / 2) * 23, w = 15;
    const g = ctx.createLinearGradient(0, cy - hgt / 2, 0, cy + hgt / 2);
    g.addColorStop(0, '#ffd6a0'); g.addColorStop(0.35, '#ff7aa8'); g.addColorStop(0.7, '#b46bff'); g.addColorStop(1, '#5e5ce6');
    ctx.save(); ctx.globalAlpha *= 0.35 + 0.65 * (1 - d);
    ctx.fillStyle = g; rrect(ctx, x - w / 2, cy - hgt / 2, w, hgt, w / 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; rrect(ctx, x - w / 2 + 2.5, cy - hgt / 2 + 3, 2.4, hgt - 6, 1.2); ctx.fill();
    ctx.restore();
  }
}
function sceneMusic(ctx, t) {
  darkStage(ctx, [[289, 170, 300, [255, 90, 150], 0.28], [120, 60, 220, [255, 170, 90], 0.18], [470, 280, 240, [120, 90, 255], 0.3]], [16, 8, 20]);
  ctx.save();
  camera(ctx, 289, 162, kf(t, [[9.0, 1.0], [11.43, 1.1, E.lin]]));
  layer(ctx, 'bars', g => { g.translate(SW / 2, SH / 2); g.scale(kf(t, [[9.0, 1.0], [11.43, 1.1, E.lin]]), kf(t, [[9.0, 1.0], [11.43, 1.1, E.lin]])); g.translate(-289, -162); waveBars(g, t, 289, 160, E.outC(seg(t, 9.0, 9.5))); }, { blur: 1.2, alpha: 0.95 });
  const [w, h, r] = springKF(t, [[0, PILL], [9.04, [256, 108, 28]]], 0.62);
  const y0 = 150 - h / 2, x0 = 289 - w / 2;
  island(ctx, 289, y0, w, h, r);
  const a = seg(t, 9.2, 9.4);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    const ag = ctx.createLinearGradient(x0 + 16, y0 + 14, x0 + 58, y0 + 56);
    ag.addColorStop(0, '#8a5cff'); ag.addColorStop(0.55, '#d257d8'); ag.addColorStop(1, '#ff7aa8');
    ctx.fillStyle = ag; rrect(ctx, x0 + 16, y0 + 14, 42, 42, 9); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.arc(x0 + 44, y0 + 26, 7, 0, TAU); ctx.fill();
    text(ctx, 'Midnight City', x0 + 68, y0 + 31, { size: 10, weight: 600, color: [248, 248, 252] });
    text(ctx, 'M83', x0 + 68, y0 + 43, { size: 7.2, color: [150, 150, 160] });
    for (let k = 0; k < 4; k++) {
      const hh = 2 + 4 * Math.abs(Math.sin(t * 9 + k * 1.3));
      ctx.fillStyle = '#ff5c8a'; ctx.fillRect(x0 + 86 + k * 2.6, y0 + 42 - hh, 1.6, hh);
    }
    // the Bloub watching from the corner
    bloub(ctx, x0 + w - 24, y0 + 24, 7, { blink: blinkAt(t, [10.3]), look: [-0.6, 0.3] });
    const p = 0.48 + (t - 9) * 0.004;
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; rrect(ctx, x0 + 38, y0 + 69, w - 76, 2.6, 1.3); ctx.fill();
    ctx.fillStyle = '#fff'; rrect(ctx, x0 + 38, y0 + 69, (w - 76) * p, 2.6, 1.3); ctx.fill();
    text(ctx, '1:56', x0 + 16, y0 + 72.2, { size: 5.6, color: [150, 150, 160] });
    text(ctx, '-2:06', x0 + w - 16, y0 + 72.2, { size: 5.6, color: [150, 150, 160], align: 'right' });
    const cy = y0 + 90;
    ctx.fillStyle = '#fff';
    for (const s of [-1, 1]) for (const k of [0, 1]) {
      const bx = 289 + s * 34 + s * k * 5.5;
      ctx.beginPath(); ctx.moveTo(bx + s * 5, cy); ctx.lineTo(bx - s * 1, cy - 4.5); ctx.lineTo(bx - s * 1, cy + 4.5); ctx.fill();
    }
    ctx.fillRect(285.5, cy - 6, 2.6, 12); ctx.fillRect(290.4, cy - 6, 2.6, 12);
    ctx.restore();
  }
  ctx.restore();
  caption(ctx, 'music', t, 289, 300, { size: 13, color: [246, 238, 246] });
}

// ------------------------------------------------------------ 6 · limits
function sceneLimits(ctx, t) {
  lightStage(ctx);
  ctx.save();
  camera(ctx, 289, 150, kf(t, [[11.43, 1.08], [13.86, 1.16, E.lin]]));
  const y0 = springKF(t, [[0, 14], [11.46, 70]], 0.6);
  const [w, h, r] = springKF(t, [[0, PILL], [11.46, [312, 156, 28]]], 0.62);
  const x0 = 289 - w / 2;
  // heads-up banner above the panel once the 5-hour ring passes 80%
  const hb = spring(seg(t, 12.95, 13.5));
  if (hb > 0) {
    const bw = 196 * hb;
    island(ctx, 289, y0 - 34, bw, 24, 12, { glow: 0.6, glowColor: ORANGE });
    ctx.save(); ctx.globalAlpha *= seg(t, 13.08, 13.25);
    ctx.fillStyle = rgb(ORANGE); ctx.beginPath(); ctx.arc(289 - bw / 2 + 13, y0 - 22, 4.5, 0, TAU); ctx.fill();
    text(ctx, '!', 289 - bw / 2 + 13, y0 - 19.6, { size: 6.5, weight: 700, color: [0, 0, 0], align: 'center' });
    text(ctx, '80% of your 5-hour limit used', 289 - bw / 2 + 23, y0 - 19.4, { size: 7, weight: 500, color: [246, 246, 250] });
    ctx.restore();
  }
  island(ctx, 289, y0, w, h, r);
  const a = seg(t, 11.62, 11.8);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    text(ctx, 'Usage', x0 + 18, y0 + 22, { size: 9, weight: 600, color: [246, 246, 250] });
    text(ctx, 'opus · 82k context', x0 + w - 18, y0 + 22, { size: 6.4, color: [140, 140, 150], align: 'right' });
    const five = 0.82 * E.outC(seg(t, 11.7, 12.95)), week = 0.63 * E.outC(seg(t, 11.8, 12.9));
    const rings = [[x0 + 62, five, five > 0.8 ? ORANGE : [124, 122, 255], '5-hour', 'resets in 2h 14m'], [x0 + 150, week, GREEN, 'Weekly', 'resets Monday']];
    for (const [rx, p, col, l1, l2] of rings) {
      ring(ctx, rx, y0 + 78, 27, p, col, 5.5);
      text(ctx, `${Math.round(p * 100)}%`, rx, y0 + 82, { size: 12, weight: 600, color: [248, 248, 252], align: 'center' });
      text(ctx, l1, rx, y0 + 121, { size: 7, weight: 500, color: [230, 230, 238], align: 'center' });
      text(ctx, l2, rx, y0 + 131, { size: 5.8, color: [130, 130, 142], align: 'center' });
    }
    const sx = x0 + 206;
    ctx.fillStyle = 'rgba(255,255,255,0.06)'; rrect(ctx, sx, y0 + 38, 90, 102, 12); ctx.fill();
    text(ctx, 'Today', sx + 10, y0 + 53, { size: 6.4, color: [140, 140, 150] });
    const rows = [['Tokens', `${(1.24 * E.outC(seg(t, 11.8, 12.8))).toFixed(2)}M`], ['Files edited', `${Math.round(38 * E.outC(seg(t, 11.85, 12.8)))}`], ['Active', '2h 41m'], ['Commands', `${Math.round(117 * E.outC(seg(t, 11.9, 12.85)))}`]];
    rows.forEach(([k, v], i) => {
      text(ctx, k, sx + 10, y0 + 72 + i * 18, { size: 6.2, color: [150, 150, 160] });
      text(ctx, v, sx + 80, y0 + 72 + i * 18, { size: 7.4, weight: 600, color: [246, 246, 250], align: 'right' });
    });
    ctx.restore();
  }
  ctx.restore();
  caption(ctx, 'limits', t, 289, 300, { size: 13 });
}

// ------------------------------------------------------------ 7 · tabs
const TILES = ['Servers', 'Battery', 'Calendar', 'Network', 'Tasks', 'Notes', 'Focus', 'Downloads'];
function tile(ctx, name, t, lit) {
  const w = 70, h = 50;
  ctx.fillStyle = '#000'; rrect(ctx, -w / 2, -h / 2, w, h, 11); ctx.fill();
  if (lit > 0) { ctx.save(); ctx.globalAlpha *= lit; ctx.fillStyle = rgb(VIOLET, 0.55); rrect(ctx, -w / 2, -h / 2, w, h, 11); ctx.fill(); ctx.restore(); }
  text(ctx, name, -w / 2 + 8, -h / 2 + 11, { size: 5.6, weight: 500, color: [150, 150, 162] });
  const L = -w / 2 + 8, B = h / 2 - 9;
  if (name === 'Servers') {
    for (let i = 0; i < 2; i++) {
      ctx.fillStyle = rgb(GREEN); ctx.beginPath(); ctx.arc(L + 2, -2 + i * 13, 2, 0, TAU); ctx.fill();
      text(ctx, i ? 'localhost:3000' : 'localhost:5173', L + 7, 0 + i * 13, { size: 5.8, weight: 500, color: [240, 240, 246] });
    }
  } else if (name === 'Battery') {
    ring(ctx, L + 12, 6, 9, 0.62, GREEN, 2.6);
    text(ctx, '62%', L + 30, 9, { size: 10, weight: 600, color: [246, 246, 250] });
  } else if (name === 'Calendar') {
    text(ctx, 'THURSDAY', L, 2, { size: 4.8, weight: 600, color: [255, 69, 58] });
    text(ctx, '8', L, B + 2, { size: 17, weight: 500, color: [246, 246, 250] });
    text(ctx, 'Oct', L + 14, B + 1, { size: 6, color: [150, 150, 160] });
  } else if (name === 'Network') {
    text(ctx, '6.7 MB/s', L, 4, { size: 9, weight: 600, color: [246, 246, 250] });
    for (let i = 0; i < 12; i++) { const hh = 1 + 7 * Math.abs(Math.sin(i * 1.3 + t * 3)); ctx.fillStyle = rgb(BLUE); ctx.fillRect(L + i * 4.6, B + 2 - hh, 2.6, hh); }
  } else if (name === 'Tasks') {
    ['Review the PR', 'Ship notes-cli', 'Fix auth tests'].forEach((s, i) => {
      ctx.strokeStyle = i === 2 ? rgb(GREEN) : '#777'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(L + 2.5, -5 + i * 9, 2.3, 0, TAU); ctx.stroke();
      text(ctx, s, L + 8, -3 + i * 9, { size: 5, color: i === 2 ? [110, 110, 120] : [230, 230, 238] });
    });
  } else if (name === 'Notes') {
    ctx.fillStyle = 'rgba(255,214,10,0.14)'; rrect(ctx, L - 2, -6, w - 12, 24, 5); ctx.fill();
    text(ctx, 'API key rotation', L + 2, 3, { size: 5.4, weight: 500, color: [246, 240, 210] });
    text(ctx, 'is on the 14th', L + 2, 11, { size: 5.4, weight: 500, color: [246, 240, 210] });
  } else if (name === 'Focus') {
    ring(ctx, L + 12, 6, 9, 0.58 + (t - 13.86) * 0.01, GREEN, 2.6);
    text(ctx, '24:06', L + 27, 9, { size: 9, weight: 600, color: [246, 246, 250] });
  } else if (name === 'Downloads') {
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(L + 4, -4); ctx.lineTo(L + 4, 5); ctx.moveTo(L, 1.5); ctx.lineTo(L + 4, 5.5); ctx.lineTo(L + 8, 1.5); ctx.stroke();
    text(ctx, 'IslandLab.exe', L + 13, 3, { size: 5.8, weight: 500, color: [240, 240, 246] });
    ctx.fillStyle = rgb(BLUE); rrect(ctx, L, B - 2, (w - 16) * clamp((t - 13.9) / 2), 2.4, 1.2); ctx.fill();
  }
}
function sceneTabs(ctx, t) {
  studioBG(ctx, 0.1, t * 0.5);
  const cx = 289, cy = 140, spin = (t - 13.86) * 0.62 + 0.4;
  const items = TILES.map((n, i) => {
    const a = spin + (i / TILES.length) * TAU;
    return { n, i, x: cx + Math.cos(a) * 220, y: cy + Math.sin(a) * 70, z: Math.sin(a) };
  }).sort((p, q) => p.z - q.z);
  const pinned = 'Battery';
  const tap = 15.35;
  const drawTile = it => {
    const pop = spring(seg(t, 13.9 + it.i * 0.06, 14.5 + it.i * 0.06));
    if (pop <= 0) return;
    const s = (0.85 + 0.5 * (it.z + 1) / 2) * pop;
    const lit = it.n === pinned ? seg(t, tap, tap + 0.25) : 0;
    ctx.save(); ctx.translate(it.x, it.y); ctx.scale(s, s);
    ctx.globalAlpha *= 0.5 + 0.5 * (it.z + 1) / 2;
    ctx.shadowColor = 'rgba(40,20,90,0.25)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 5;
    tile(ctx, it.n, t, lit);
    ctx.restore();
  };
  items.filter(it => it.z < 0).forEach(drawTile);
  // Bloub in the orb with two moons
  const orb = ctx.createRadialGradient(cx - 10, cy - 14, 4, cx, cy, 46);
  orb.addColorStop(0, 'rgba(255,255,255,0.75)'); orb.addColorStop(0.7, 'rgba(210,200,255,0.35)'); orb.addColorStop(1, 'rgba(150,140,255,0.15)');
  ctx.fillStyle = orb; ctx.beginPath(); ctx.arc(cx, cy, 44, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1; ctx.stroke();
  const wink = t > tap + 0.1 && t < tap + 0.45 ? 0.85 : blinkAt(t, [14.6]);
  bloub(ctx, cx, cy + Math.sin(t * 2.2) * 2, 24, { blink: wink, look: [Math.sin(t * 1.4) * 0.7, 0.2] });
  for (const k of [0, 1]) {
    const a = t * 1.8 + k * Math.PI;
    const mz = Math.sin(a);
    ctx.fillStyle = `rgba(250,250,255,${0.65 + 0.35 * mz})`;
    ctx.beginPath(); ctx.arc(cx + Math.cos(a) * 56, cy + Math.sin(a) * 16 - 4, 4.5 + mz, 0, TAU); ctx.fill();
  }
  items.filter(it => it.z >= 0).forEach(drawTile);
  // a finger taps the Battery tile to pin it
  const bt = items.find(it => it.n === pinned);
  if (t > 14.8) {
    const [px, py] = kf(t, [[14.8, [520, 330]], [15.3, [bt.x + 4, bt.y + 6], E.ioC], [16.29, [bt.x + 4, bt.y + 6]]]);
    pointer(ctx, t < 15.3 ? px : bt.x + 4, t < 15.3 ? py : bt.y + 6, t > tap && t < tap + 0.12 ? 1 : 0);
    ripples(ctx, bt.x, bt.y, t, tap, [190, 180, 255]);
  }
  caption(ctx, 'tabs', t, 289, 292, { size: 13 });
}

// ------------------------------------------------------------ 8 · retract
function browser(ctx, y) {
  const x0 = 64, x1 = 514, w = x1 - x0;
  ctx.save(); ctx.shadowColor = 'rgba(40,30,80,0.25)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8;
  ctx.fillStyle = '#fff'; rrect(ctx, x0, y, w, 300, 10); ctx.fill(); ctx.restore();
  ctx.fillStyle = '#e9e8ef'; rrect(ctx, x0, y, w, 30, 10); ctx.fill(); ctx.fillRect(x0, y + 20, w, 10);
  ['Island · GitHub', 'Docs', 'localhost:5173', 'Releases'].forEach((s, i) => {
    const tx = x0 + 70 + i * 92;
    ctx.fillStyle = i === 0 ? '#fff' : 'rgba(255,255,255,0.45)'; rrect(ctx, tx, y + 8, 86, 22, 7); ctx.fill();
    text(ctx, s, tx + 10, y + 22, { size: 6.4, weight: 500, color: [60, 58, 76] });
  });
  for (let i = 0; i < 3; i++) { ctx.fillStyle = ['#ff5f57', '#febc2e', '#28c840'][i]; ctx.beginPath(); ctx.arc(x0 + 16 + i * 11, y + 16, 3.6, 0, TAU); ctx.fill(); }
  ctx.fillStyle = '#f3f2f7'; rrect(ctx, x0 + 14, y + 38, w - 28, 16, 8); ctx.fill();
  text(ctx, 'github.com/UsoguiH/dynamic-island-windows', x0 + 26, y + 49, { size: 6.4, color: [110, 108, 126] });
  ctx.fillStyle = '#efeef4';
  for (let i = 0; i < 4; i++) { rrect(ctx, x0 + 30, y + 74 + i * 22, w * (0.7 - i * 0.12), 9, 4.5); ctx.fill(); }
}
function sceneRetract(ctx, t) {
  studioBG(ctx, 0.15, t * 0.5);
  ctx.save();
  camera(ctx, 289, kf(t, [[16.29, 110], [16.9, 52, E.ioC], [18.72, 46]]), kf(t, [[16.29, 1.0], [16.9, 1.7, E.ioC], [18.72, 1.82, E.lin]]));
  browser(ctx, kf(t, [[16.29, 340], [16.78, 4, E.outC]]));
  const fold = 16.95, back = 17.82;
  const [w, h, r] = springKF(t, [[0, PILL], [fold, [156, 4, 2]], [back, PILL]], 0.55);
  island(ctx, 289, 7, w, h, r);
  pillContents(ctx, 289, 7, w, h, t, (1 - seg(t, fold - 0.05, fold + 0.08)) + seg(t, back + 0.15, back + 0.3), 3);
  if (t > 17.2) {
    const [px, py] = kf(t, [[17.2, [380, 120]], [17.7, [300, 12], E.ioC], [18.72, [304, 20], E.outQ]]);
    pointer(ctx, px, py, 0, seg(t, 17.2, 17.35));
  }
  ctx.restore();
  caption(ctx, 'retract', t, 289, 300, { size: 13 });
  // wipe: the island swells to fill the frame on the last beat
  const p = seg(t, 18.42, 18.72);
  if (p > 0) {
    const e = E.inQ(p);
    const s = kf(t, [[16.29, 1.0], [16.9, 1.7], [18.72, 1.82]]);
    const ww = lerp(132 * s, SW * 1.6, e), hh = lerp(26 * s, SH * 2.2, e);
    const top = lerp(162 + (7 - 46) * s, -SH * 0.6, e);
    ctx.fillStyle = '#000'; rrect(ctx, 289 - ww / 2, top, ww, hh, lerp(13 * s, 200, e)); ctx.fill();
  }
}

// ------------------------------------------------------------ 9 · end card
let markSize = 48;
function fitMark(ctx) { markSize = 48 * 128 / measure(ctx, 'Island', 48, 'Inter', 600, -0.03); }
function sceneEnd(ctx, t) {
  const hit = 19.0;
  const flash = Math.exp(-(t - hit) * 4);
  darkStage(ctx, [[289, 160, 260, [94, 92, 230], 0.3 + 0.25 * flash], [289, 160, 120, [255, 255, 255], 0.12 * flash]], [8, 8, 12]);
  const pop = spring(seg(t, hit, hit + 0.55));
  const bx = 212, by = 150;
  ctx.save(); ctx.translate(bx, by); ctx.scale(pop, pop);
  const look = t < 19.6 ? [0, 0] : t < 21.8 ? [0.8, 0.1] : [0, 0.2];
  bloub(ctx, 0, Math.sin(t * 2) * 1.5, 30, { blink: blinkAt(t, [20.5, 22.7]), look });
  ctx.restore();
  // the wordmark wipes in from the left, sharpening as it lands
  const wp = E.outC(seg(t, hit + 0.12, hit + 0.6));
  if (wp > 0) {
    ctx.save();
    ctx.beginPath(); ctx.rect(254, 90, 160 * wp, 100); ctx.clip();
    text(ctx, 'Island', 256 - (1 - wp) * 14, 166, { size: markSize, weight: 600, color: [248, 248, 252], tracking: -0.03, blur: (1 - wp) * 4 });
    ctx.restore();
  }
  caption(ctx, 'end', t, 289, 212, { size: 11.5, weight: 500, color: [176, 174, 196], caretFor: 2.5 });
  const fa = seg(t, 21.3, 21.9);
  if (fa > 0) text(ctx, 'Free and open source  ·  github.com/UsoguiH/dynamic-island-windows', 289, 236, { size: 7, color: [118, 116, 134], align: 'center', alpha: fa });
  const fo = seg(t, 23.5, 24.0);
  if (fo > 0) { ctx.fillStyle = `rgba(0,0,0,${fo})`; ctx.fillRect(0, 0, SW, SH); }
}
