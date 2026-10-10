'use strict';
// Island, feature by feature, in the studio's design language. Each scene is
// one Island ability; times are film seconds.

// ------------------------------------------------------------ 1 · the eyes become the island (0–3)
function sIntro(ctx, t) {
  panelBG(ctx);
  const cy = PCY;
  const open = E.ioC(seg(t, 1.25, 1.75));
  if (t < 1.85) {
    const sep = lerp(16, 90, open), h = lerp(26, 10, open);
    pauseBars(ctx, PCX, cy, sep, lerp(7, 5, open), h, INK, blinkAt(t, [0.5, 1.0]));
    return;
  }
  // the island springs open between the eyes, the eyes move inside it
  const [w, h] = springKF(t, [[0, [18, 18]], [1.85, [236, 62]]], 0.7);
  islandShape(ctx, PCX, cy - h / 2, w, h, h / 2);
  const ex = PCX - w / 2 + h / 2 + 6;
  if (w > 60) pauseBars(ctx, ex, cy, h * 0.22, h * 0.1, h * 0.38, [246, 246, 250], blinkAt(t, [2.55]));
  const la = seg(t, 2.05, 2.25);
  if (la > 0) {
    ctx.save(); ctx.globalAlpha *= la;
    for (let i = 0; i < 3; i++) bloub(ctx, PCX + w / 2 - h / 2 - 2 - i * h * 0.34, cy, h * 0.18, { body: AGENTS[2 - i].body, blink: blinkAt(t, [2.4 + i * 0.12]) });
    text(ctx, '3 working', PCX + w / 2 - h / 2 - 3 * h * 0.34 - 4, cy + 4, { size: 11, color: [150, 150, 160], align: 'right' });
    ctx.restore();
  }
  monoLabel(ctx, P.x + 120, P.y + 150, 'C# + DIRECT3D 11', t, 2.1, { sub: 'NATIVE' });
  monoLabel(ctx, P.x + 120, P.y + 320, '144 HZ SPRING PHYSICS', t, 2.2);
  monoLabel(ctx, P.x + 560, P.y + 130, 'NO ELECTRON, NO WEB VIEW', t, 2.3);
  monoLabel(ctx, P.x + 560, P.y + 330, 'LOCAL ONLY', t, 2.4, { sub: 'NO TELEMETRY' });
}

// ------------------------------------------------------------ 2 · wordmark on the tile grid (3–5.6)
function sMark(ctx, t) {
  panelBG(ctx, [247, 246, 244]);
  const u = t - 3;
  const grow = kf(t, [[3, 0.84], [3.5, 1.0, E.outQ], [5.6, 1.35, E.lin]]), mask = kf(t, [[3, 0.5], [3.4, 0.8], [3.9, 1.4, E.outQ]]);
  tileGrid(ctx, grow, mask);
  const size = 30, w = wordmark(ctx, 0, 0, size, 1, 1, t, true);
  wordmark(ctx, PCX - w / 2, PCY - 2, size, seg(t, 3.05, 3.5), seg(t, 3.25, 3.75), t);
  typedLine(ctx, 'tagline', PCX, PCY + 30, t, { size: 13, align: 'center', color: [110, 108, 126] });
  // a lilac wash sweeps in from the right
  const p = seg(t, 5.15, 5.6);
  if (p > 0) layer(ctx, 'sweep', g => {
    g.drawImage(gradImage('mist', 400, 225), P.x, P.y, P.w, P.h);
    const x = P.x + P.w * (1.25 - 1.6 * p), m = g.createLinearGradient(x, 0, x + 380, 0);
    m.addColorStop(0, 'rgba(0,0,0,0)'); m.addColorStop(1, 'rgba(0,0,0,1)');
    g.globalCompositeOperation = 'destination-in'; g.fillStyle = m; g.fillRect(0, 0, SW, SH);
  });
}

// ------------------------------------------------------------ 3 · your agents as a team (5.6–9.6)
const TEAM = [
  { name: 'aurora-web', act: 'Editing theme.ts' }, { name: 'pixel-api', act: 'Running npm test' },
  { name: 'notes-cli', act: 'Reading package.json' }, { name: 'orbit-landing', act: 'Writing Hero.tsx' },
];
function sAgents(ctx, t) {
  silk(ctx, 'mist');
  heading(ctx, 'agents', '01', 'AGENTS', t, 5.75);
  const [w, h, r] = springKF(t, [[0, [150, 34, 17]], [6.05, [338, 178, 30]]], 0.75);
  const top = P.y + 128, x0 = PCX - w / 2;
  guides(ctx, PCX - 190, top - 16, PCX + 190, top + 196, seg(t, 6.3, 6.6));
  islandShape(ctx, PCX, top, w, h, r, { glow: seg(t, 8.6, 8.8) * (0.7 + 0.3 * Math.sin(t * 9)) * 0.6 });
  const ca = seg(t, 6.35, 6.6);
  if (ca <= 0) { islandEyes(ctx, x0 + h / 2 + 3, top + h / 2, h, t); return; }
  ctx.save(); ctx.globalAlpha *= ca;
  pauseBars(ctx, x0 + 22, top + 20, 5, 2.4, 9, [246, 246, 250], blinkAt(t, [7.4]));
  text(ctx, 'Claude Code', x0 + 36, top + 24, { size: 10, weight: 600, color: [246, 246, 250] });
  text(ctx, '4 working', x0 + 101, top + 24, { size: 8, color: [140, 140, 150] });
  TEAM.forEach((m, i) => {
    const col = i % 2, row = (i / 2) | 0;
    const bx = x0 + 32 + col * 160, by = top + 62 + row * 58;
    const pop = spring(seg(t, 6.5 + i * 0.09, 7.1 + i * 0.09));
    if (pop <= 0) return;
    const need = i === 1 ? seg(t, 8.55, 8.7) : 0;
    ctx.save(); ctx.translate(bx, by); ctx.scale(pop, pop);
    const g = ctx.createRadialGradient(0, 3, 2, 0, 3, 26); g.addColorStop(0, rgb(AGENTS[i].body, 0.4)); g.addColorStop(1, rgb(AGENTS[i].body, 0));
    ctx.fillStyle = g; ctx.fillRect(-28, -26, 56, 56);
    bloub(ctx, 0, Math.sin(t * 3 + i) * 1.2, 16, { body: AGENTS[i].body, blink: blinkAt(t, [7.2 + i * 0.4]), look: [Math.sin(t * 1.4 + i) * 0.6, 0.2] });
    ctx.fillStyle = rgb(mix(BLUE, ORANGE, need)); rrect(ctx, -19, -19, 14, 7, 3.5); ctx.fill();
    if (need < 0.5) for (let d = 0; d < 3; d++) { ctx.fillStyle = `rgba(255,255,255,${0.5 + 0.5 * Math.sin(t * 8 - d)})`; ctx.beginPath(); ctx.arc(-15.5 + d * 3.5, -15.5, 0.9, 0, TAU); ctx.fill(); }
    else text(ctx, '!', -12, -13.3, { size: 6.5, weight: 700, color: [255, 255, 255], align: 'center' });
    ctx.restore();
    text(ctx, m.name, bx + 24, by - 2, { size: 9, weight: 600, color: [242, 242, 248], alpha: pop });
    text(ctx, need > 0.5 ? 'Needs you' : m.act, bx + 24, by + 10, { size: 7.4, color: need > 0.5 ? ORANGE : [140, 140, 152], alpha: pop });
  });
  ctx.restore();
  monoLabel(ctx, P.x + 70, P.y + 200, 'READS ~/.CLAUDE/SESSIONS', t, 6.8, { sub: 'ZERO CONFIG' });
  monoLabel(ctx, P.x + 70, P.y + 290, 'LIVE ACTIVITY', t, 7.0, { sub: 'EDITING THEME.TS' });
  monoLabel(ctx, P.x + 600, P.y + 210, 'PLAN  2 OF 5', t, 7.2);
  monoLabel(ctx, P.x + 600, P.y + 300, 'FILES CHANGED  3', t, 7.35, { sub: 'GO TO TERMINAL' });
}

// ------------------------------------------------------------ 4 · needs you: Allow / Deny (9.6–12.6)
function sNeeds(ctx, t) {
  paleBG(ctx);
  heading(ctx, 'needs', '02', 'PERMISSIONS', t, 9.75);
  const cy = P.y + 225;
  const allowed = seg(t, 11.55, 11.6);
  const [w, h] = springKF(t, [[0, [150, 34]], [9.85, [420, 64]], [11.62, [230, 40]]], 0.62);
  const glow = (1 - seg(t, 11.5, 11.7)) * (0.75 + 0.25 * Math.sin(t * 7));
  guides(ctx, PCX - 230, cy - 50, PCX + 230, cy + 50, seg(t, 10.1, 10.4) * (1 - allowed * 0.6));
  islandShape(ctx, PCX, cy - h / 2, w, h, h / 2, { glow });
  const x0 = PCX - w / 2, x1 = PCX + w / 2;
  const a = seg(t, 10.15, 10.35) * (1 - allowed);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    ctx.fillStyle = rgb(ORANGE); ctx.beginPath(); ctx.arc(x0 + 30, cy, 11, 0, TAU); ctx.fill();
    text(ctx, '!', x0 + 30, cy + 4.5, { size: 14, weight: 700, color: [0, 0, 0], align: 'center' });
    text(ctx, 'aurora-web', x0 + 50, cy - 4, { size: 11.5, weight: 600, color: [246, 246, 250] });
    text(ctx, 'wants to run', x0 + 50 + measure(ctx, 'aurora-web', 11.5, 'Inter', 600) + 5, cy - 4, { size: 10, color: [140, 140, 150] });
    ctx.fillStyle = 'rgba(255,159,10,0.16)'; rrect(ctx, x0 + 49, cy + 3, 84, 15, 4); ctx.fill();
    text(ctx, 'npm run build', x0 + 54, cy + 14, { size: 9, family: MONO, color: ORANGE });
    const press = t > 11.42 && t < 11.56 ? 1 : 0;
    ctx.fillStyle = '#2c2c30'; rrect(ctx, x1 - 146, cy - 14, 62, 28, 14); ctx.fill();
    text(ctx, 'Deny', x1 - 115, cy + 4, { size: 10, weight: 500, color: [230, 230, 236], align: 'center' });
    ctx.save(); ctx.translate(x1 - 44, cy); ctx.scale(1 - press * 0.08, 1 - press * 0.08);
    ctx.fillStyle = rgb(mix(BLUE, [80, 170, 255], press)); rrect(ctx, -34, -14, 68, 28, 14); ctx.fill();
    text(ctx, 'Allow', 0, 4, { size: 10, weight: 600, color: [255, 255, 255], align: 'center' });
    ctx.restore(); ctx.restore();
  }
  if (allowed > 0) {
    const b = seg(t, 11.7, 11.85);
    ctx.save(); ctx.globalAlpha *= b;
    ctx.fillStyle = rgb(GREEN); ctx.beginPath(); ctx.arc(x0 + 22, cy, 8, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#000'; ctx.lineWidth = 1.8; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(x0 + 18.5, cy); ctx.lineTo(x0 + 21.2, cy + 2.8); ctx.lineTo(x0 + 25.8, cy - 2.8); ctx.stroke();
    text(ctx, 'Allowed · building…', x0 + 37, cy + 3.5, { size: 10, weight: 500, color: [236, 236, 242] });
    bloub(ctx, x1 - 20, cy, 8, { body: AGENTS[0].body });
    ctx.restore();
  }
  ripples(ctx, PCX + 210 - 44, cy, t, 11.5, [130, 190, 255]);
  if (t > 10.6) {
    const [px, py] = kf(t, [[10.6, [PCX + 300, P.y + 400]], [11.35, [PCX + 168, cy + 3], E.ioC], [12.6, [PCX + 172, cy + 10]]]);
    arrow(ctx, px, py, 1.3, seg(t, 10.6, 10.8), t > 11.42 && t < 11.56 ? 1 : 0);
  }
  monoLabel(ctx, P.x + 90, P.y + 340, 'ANSWER PROMPTS IN PLACE', t, 10.5, { sub: 'NO ALT-TAB' });
  monoLabel(ctx, P.x + 560, P.y + 340, 'STOP, MESSAGE OR RESUME', t, 10.65, { sub: 'CLAUDE --RESUME' });
}

// ------------------------------------------------------------ 5 · Bloub's done celebration (12.6–15.4)
function confetti(ctx, x, y, t, t0, col) {
  const p = t - t0;
  if (p < 0 || p > 1.8) return;
  const r = mulberry32(3);
  for (let i = 0; i < 60; i++) {
    const a = -Math.PI / 2 + (r() - 0.5) * 2.8, v = 120 + r() * 160, spin = r() * 8;
    const px = x + Math.cos(a) * v * p, py = y + Math.sin(a) * v * p + 190 * p * p;
    const c = i % 3 === 0 ? [255, 255, 255] : i % 3 === 1 ? col : mix(col, [255, 220, 120], 0.6);
    ctx.save(); ctx.globalAlpha *= clamp(1.5 - p); ctx.translate(px, py); ctx.rotate(spin * p + i);
    ctx.fillStyle = rgb(c); ctx.fillRect(-2.5, -1.2, 5, 2.6); ctx.restore();
  }
}
function sDone(ctx, t) {
  silk(ctx, 'lilac');
  heading(ctx, 'done', '03', 'CELEBRATIONS', t, 12.75);
  const banner = 14.75;
  const [w, h] = springKF(t, [[0, [150, 34]], [12.9, [170, 40]], [13.05, [150, 34]], [banner, [330, 46]]], 0.5);
  const top = P.y + 92;
  islandShape(ctx, PCX + 120, top, w, h, h / 2);
  if (t < 13.0 || (t > 14.6 && t < banner)) islandEyes(ctx, PCX + 120 - w / 2 + h / 2 + 3, top + h / 2, h, t);
  const ba = seg(t, banner + 0.12, banner + 0.3);
  if (ba > 0) {
    ctx.save(); ctx.globalAlpha *= ba;
    const bx = PCX + 120 - w / 2;
    bloub(ctx, bx + 24, top + h / 2, 9);
    text(ctx, 'aurora-web is done', bx + 42, top + h / 2 - 2, { size: 10, weight: 600, color: [246, 246, 250] });
    text(ctx, 'Dark mode for the settings page', bx + 42, top + h / 2 + 10, { size: 8, color: [140, 140, 150] });
    ctx.restore();
  }
  // Bloub leaps out, lands, celebrates, flies home
  const out = seg(t, 13.0, 13.55), home = seg(t, 14.35, 14.75);
  if (t > 13.0 && t < banner) {
    const land = [PCX - 40, P.y + 280];
    let x, y, rr;
    if (home <= 0) { const p = E.outQ(out); x = lerp(PCX + 120 - 50, land[0], p); y = lerp(top + 17, land[1], p) - Math.sin(Math.PI * p) * 90; rr = lerp(9, 46, E.outC(out)); }
    else { const p = E.inC(home); x = lerp(land[0], PCX + 70, p); y = lerp(land[1], top + 17, p) - Math.sin(Math.PI * p) * 60; rr = lerp(46, 9, p); }
    const sq = t > 13.55 && home <= 0 ? Math.exp(-(t - 13.55) * 7) * Math.cos((t - 13.55) * 22) * 0.16 : 0;
    const sh = home <= 0 ? out : 1 - home;
    ctx.fillStyle = `rgba(50,30,100,${0.18 * sh})`; ctx.beginPath(); ctx.ellipse(land[0], land[1] + 52, 40 * sh, 7, 0, 0, TAU); ctx.fill();
    confetti(ctx, land[0], land[1] - 6, t, 13.58, AGENTS[0].body);
    bloub(ctx, x, y, rr, { sx: 1 + sq, sy: 1 - sq, blink: t > 13.85 && t < 14.15 ? 0.8 : 0, look: [0.4, -0.1] });
    if (home <= 0) {
      const b1 = spring(seg(t, 13.6, 14.0)), b2 = spring(seg(t, 13.68, 14.1)), b3 = spring(seg(t, 13.74, 14.15));
      ctx.save(); ctx.translate(x - rr * 0.66, y - rr * 0.66); ctx.scale(b1, b1);
      ctx.fillStyle = rgb(GREEN); ctx.beginPath(); ctx.arc(0, 0, 10, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-4.2, 0); ctx.lineTo(-1, 3.4); ctx.lineTo(4.4, -3.2); ctx.stroke(); ctx.restore();
      ctx.save(); ctx.translate(x + rr + 44, y - rr - 6); ctx.scale(b2, b2);
      ctx.shadowColor = 'rgba(40,20,80,0.2)'; ctx.shadowBlur = 10;
      ctx.fillStyle = '#fff'; rrect(ctx, -42, -16, 84, 32, 16); ctx.fill(); ctx.shadowColor = 'transparent';
      ctx.beginPath(); ctx.moveTo(-26, 13); ctx.lineTo(-34, 24); ctx.lineTo(-14, 15); ctx.fill();
      text(ctx, 'I’m done!', 0, 5, { size: 13, weight: 600, color: [30, 28, 40], align: 'center' });
      ctx.restore();
      ctx.save(); ctx.translate(x, y + rr + 20); ctx.scale(b3, b3);
      ctx.fillStyle = '#16151c'; rrect(ctx, -34, -10, 68, 20, 10); ctx.fill();
      text(ctx, 'aurora-web', 0, 3.5, { size: 9, weight: 500, color: [240, 240, 246], align: 'center' });
      ctx.restore();
    }
  }
  monoLabel(ctx, P.x + 560, P.y + 300, 'AT MOST ONCE EVERY 12 S', t, 13.7, { sub: 'NEVER DURING A GAME' });
}

// ------------------------------------------------------------ 6 · plan limits (15.4–18.6)
function ringArc(ctx, x, y, r, p, col, w) {
  ctx.save(); ctx.lineCap = 'round'; ctx.lineWidth = w;
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
  if (p > 0.002) { ctx.strokeStyle = rgb(col); ctx.beginPath(); ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + TAU * p); ctx.stroke(); }
  ctx.restore();
}
function sLimits(ctx, t) {
  ctx.fillStyle = '#26262a'; ctx.fillRect(P.x, P.y, P.w, P.h);
  heading(ctx, 'limits', '04', 'PLAN LIMITS', t, 15.55, { color: [236, 236, 240], fresh: [90, 90, 96] });
  // a slow orbit of dots, like the study's loader
  const da = seg(t, 15.5, 15.9);
  for (let i = 0; i < 15; i++) {
    const a = (i / 15) * TAU + t * 0.3, rr = 205 + 18 * Math.sin(i * 1.7 + t);
    ctx.fillStyle = `rgba(255,255,255,${0.7 * da})`; ctx.fillRect(PCX + Math.cos(a) * rr * 1.25 - 1.5, PCY + 20 + Math.sin(a) * rr * 0.62 - 1.5, 3, 3);
  }
  const five = 0.82 * E.outC(seg(t, 15.8, 17.3)), week = 0.63 * E.outC(seg(t, 15.95, 17.2));
  const rings = [[PCX - 115, five, five > 0.8 ? ORANGE : [124, 122, 255], '5-HOUR', 'RESETS IN 2H 14M'], [PCX + 115, week, GREEN, 'WEEKLY', 'RESETS MONDAY']];
  const ra = seg(t, 15.7, 16.0);
  ctx.save(); ctx.globalAlpha *= ra;
  for (const [x, p, col, l1, l2] of rings) {
    ringArc(ctx, x, PCY + 25, 64, p, col, 11);
    text(ctx, `${Math.round(p * 100)}%`, x, PCY + 36, { size: 30, weight: 600, color: [248, 248, 252], align: 'center', tracking: -0.02 });
    text(ctx, l1, x, PCY + 118, { size: 7.5, family: MONO, weight: 500, color: [220, 220, 226], align: 'center', tracking: 0.08 });
    text(ctx, l2, x, PCY + 130, { size: 6, family: MONO, color: [120, 120, 128], align: 'center', tracking: 0.06 });
  }
  ctx.restore();
  // the heads-up drops in once the 5-hour ring passes 80%
  const hb = spring(seg(t, 17.25, 17.85));
  if (hb > 0) {
    const w = 250 * hb;
    islandShape(ctx, PCX, P.y + 96, w, 30, 15, { glow: 0.7 });
    ctx.save(); ctx.globalAlpha *= seg(t, 17.4, 17.55);
    ctx.fillStyle = rgb(ORANGE); ctx.beginPath(); ctx.arc(PCX - w / 2 + 17, P.y + 111, 6, 0, TAU); ctx.fill();
    text(ctx, '!', PCX - w / 2 + 17, P.y + 114, { size: 8, weight: 700, color: [0, 0, 0], align: 'center' });
    text(ctx, '80% of your 5-hour limit used', PCX - w / 2 + 30, P.y + 114.5, { size: 9.4, weight: 500, color: [246, 246, 250] });
    ctx.restore();
  }
}

// ------------------------------------------------------------ 7 · 17 tabs (18.6–21.8)
const TABS = ['Servers', 'Battery', 'Calendar', 'Network', 'Tasks', 'Notes', 'Focus', 'Downloads'];
function tabTile(ctx, name, x, y, w, h, t, lit, litX, litY) {
  ctx.save();
  rrect(ctx, x, y, w, h, 12); ctx.fillStyle = '#0b0b0d'; ctx.fill(); ctx.clip();
  if (lit > 0) { // the pin's colour spreads out from the tap
    const g = ctx.createRadialGradient(litX, litY, 0, litX, litY, 260 * lit);
    g.addColorStop(0, rgb(VIOLET, 0.75)); g.addColorStop(0.85, rgb(VIOLET, 0.55)); g.addColorStop(1, rgb(VIOLET, 0));
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  }
  text(ctx, name, x + 12, y + 18, { size: 8, weight: 500, color: [150, 150, 162] });
  const L = x + 12, M = y + h * 0.58;
  if (name === 'Servers') {
    [['localhost:5173', 'Vite'], ['localhost:3000', 'Next.js'], ['localhost:8000', 'uvicorn']].forEach(([a, b], i) => {
      ctx.fillStyle = rgb(GREEN); ctx.beginPath(); ctx.arc(L + 3, y + 37 + i * 19, 2.6, 0, TAU); ctx.fill();
      text(ctx, a, L + 10, y + 40 + i * 19, { size: 8, weight: 500, color: [238, 238, 244] });
      text(ctx, b, L + 80, y + 40 + i * 19, { size: 7, color: [120, 120, 130] });
    });
  } else if (name === 'Battery') {
    ringArc(ctx, L + 26, M, 20, 0.62, GREEN, 5);
    text(ctx, '62%', L + 58, M + 6, { size: 17, weight: 600, color: [246, 246, 250] });
    text(ctx, 'Charging', L + 58, M + 18, { size: 7, color: [120, 200, 140] });
  } else if (name === 'Calendar') {
    text(ctx, 'THURSDAY', L, y + 40, { size: 7, weight: 600, color: [255, 69, 58] });
    text(ctx, '8', L, y + h - 18, { size: 36, weight: 500, color: [246, 246, 250] });
    text(ctx, 'October 2026', L + 30, y + h - 20, { size: 8, color: [140, 140, 150] });
  } else if (name === 'Network') {
    text(ctx, '6.7 MB/s', L, y + 44, { size: 15, weight: 600, color: [246, 246, 250] });
    for (let i = 0; i < 20; i++) { const hh = 2 + 18 * Math.abs(Math.sin(i * 1.3 + t * 3)); ctx.fillStyle = rgb(BLUE); ctx.fillRect(L + i * 6.4, y + h - 12 - hh, 3.4, hh); }
  } else if (name === 'Tasks') {
    ['Review the dark-mode PR', 'Reply to design feedback', 'Ship notes-cli 2.1', 'Fix flaky auth tests'].forEach((s, i) => {
      const done = i === 3;
      ctx.strokeStyle = done ? rgb(GREEN) : '#777'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(L + 4, y + 35 + i * 15, 3.6, 0, TAU); ctx.stroke();
      text(ctx, s, L + 13, y + 38 + i * 15, { size: 7.4, color: done ? [100, 100, 110] : [232, 232, 240] });
    });
  } else if (name === 'Notes') {
    ctx.fillStyle = 'rgba(255,214,10,0.13)'; rrect(ctx, L - 2, y + 28, w - 20, h - 40, 7); ctx.fill();
    text(ctx, 'API key rotation', L + 5, y + 46, { size: 8.4, weight: 500, color: [246, 240, 210] });
    text(ctx, 'is on the 14th', L + 5, y + 58, { size: 8.4, weight: 500, color: [246, 240, 210] });
  } else if (name === 'Focus') {
    ringArc(ctx, L + 26, M, 20, 0.58 + (t - 18.6) * 0.01, GREEN, 5);
    text(ctx, '24:06', L + 58, M + 6, { size: 16, weight: 600, color: [246, 246, 250] });
    text(ctx, 'Deep work', L + 58, M + 18, { size: 7, color: [140, 140, 150] });
  } else {
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(L + 6, y + 32); ctx.lineTo(L + 6, y + 46); ctx.moveTo(L, y + 40); ctx.lineTo(L + 6, y + 46); ctx.lineTo(L + 12, y + 40); ctx.stroke();
    text(ctx, 'IslandLab.exe', L + 22, y + 44, { size: 9, weight: 500, color: [240, 240, 246] });
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; rrect(ctx, L, y + h - 22, w - 24, 3.4, 1.7); ctx.fill();
    ctx.fillStyle = rgb(BLUE); rrect(ctx, L, y + h - 22, (w - 24) * clamp((t - 19.0) / 2.4), 3.4, 1.7); ctx.fill();
  }
  ctx.restore();
}
function sTabs(ctx, t) {
  ctx.fillStyle = '#fafafa'; ctx.fillRect(P.x, P.y, P.w, P.h);
  heading(ctx, 'tabs', '05', 'TABS', t, 18.75);
  const cw = 150, ch = 104, gx = 14, gy = 14, cols = 4;
  const gx0 = PCX - (cols * cw + (cols - 1) * gx) / 2, gy0 = P.y + 104;
  guides(ctx, gx0 - 10, gy0 - 10, gx0 + cols * cw + (cols - 1) * gx + 10, gy0 + 2 * ch + gy + 10, seg(t, 18.8, 19.1));
  const tapI = 5, tap = 20.75;
  TABS.forEach((name, i) => {
    const pop = spring(seg(t, 19.0 + i * 0.07, 19.6 + i * 0.07));
    if (pop <= 0) return;
    const x = gx0 + (i % cols) * (cw + gx), y = gy0 + ((i / cols) | 0) * (ch + gy);
    ctx.save(); ctx.translate(x + cw / 2, y + ch / 2); ctx.scale(pop, pop); ctx.translate(-x - cw / 2, -y - ch / 2);
    ctx.shadowColor = 'rgba(30,20,60,0.18)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 4;
    tabTile(ctx, name, x, y, cw, ch, t, i === tapI ? E.outC(seg(t, tap, tap + 0.5)) : 0, x + 70, y + 60);
    ctx.restore();
  });
  // the pin: the pointer taps Notes and its colour spreads
  const nx = gx0 + (tapI % cols) * (cw + gx) + 70, ny = gy0 + ch + gy + 60;
  if (t > 20.0) {
    const [px, py] = kf(t, [[20.0, [PCX + 330, P.y + 430]], [20.65, [nx, ny], E.ioC], [21.8, [nx + 6, ny + 8]]]);
    arrow(ctx, px, py, 1.25, seg(t, 20.0, 20.2), t > tap && t < tap + 0.12 ? 1 : 0);
    ripples(ctx, nx, ny, t, tap, [190, 180, 255]);
  }
  monoLabel(ctx, gx0, gy0 + 2 * ch + gy + 40, 'PIN UP TO 10  ·  DRAG TO REORDER', t, 19.6, { sub: 'SAVED ON YOUR PC' });
}

// ------------------------------------------------------------ 8 · now playing (21.8–24.6)
function sMusic(ctx, t) {
  silk(ctx, 'magenta');
  heading(ctx, 'music', '06', 'NOW PLAYING', t, 21.95, { color: [255, 255, 255], fresh: [240, 200, 225] });
  // soft waveform across the lower half
  const n = 46;
  for (let i = 0; i < n; i++) {
    const d = Math.abs(i - (n - 1) / 2) / ((n - 1) / 2);
    const v = (0.3 + 0.7 * (1 - d * d)) * (0.5 + 0.3 * Math.sin(t * 7 + i * 1.9) + 0.2 * Math.sin(t * 12 + i * 0.7));
    const hh = 6 + 80 * v * seg(t, 22.0, 22.6);
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; rrect(ctx, P.x + 40 + i * 15.5, P.y + 380 - hh / 2, 7, hh, 3.5); ctx.fill();
  }
  const [w, h, r] = springKF(t, [[0, [150, 34, 17]], [22.1, [400, 150, 32]]], 0.65);
  const top = P.y + 140, x0 = PCX - w / 2;
  islandShape(ctx, PCX, top, w, h, r);
  const a = seg(t, 22.35, 22.55);
  if (a <= 0) { islandEyes(ctx, x0 + h / 2 + 3, top + h / 2, h, t); return; }
  ctx.save(); ctx.globalAlpha *= a;
  ctx.save(); rrect(ctx, x0 + 22, top + 20, 62, 62, 12); ctx.clip(); ctx.drawImage(gradImage('rose', 120, 120), x0 + 22, top + 20, 62, 62); ctx.restore();
  text(ctx, 'Midnight City', x0 + 98, top + 46, { size: 15, weight: 600, color: [248, 248, 252] });
  text(ctx, 'M83', x0 + 98, top + 64, { size: 10, color: [150, 150, 160] });
  for (let k = 0; k < 5; k++) { const hh = 3 + 7 * Math.abs(Math.sin(t * 9 + k * 1.3)); ctx.fillStyle = '#ff5c8a'; ctx.fillRect(x0 + 124 + k * 3.6, top + 64 - hh, 2.2, hh); }
  pauseBars(ctx, x0 + w - 34, top + 32, 6, 3, 11, [246, 246, 250], blinkAt(t, [23.4]));
  const p = 0.48 + (t - 22) * 0.006;
  ctx.fillStyle = 'rgba(255,255,255,0.18)'; rrect(ctx, x0 + 52, top + 100, w - 104, 3.4, 1.7); ctx.fill();
  ctx.fillStyle = '#fff'; rrect(ctx, x0 + 52, top + 100, (w - 104) * p, 3.4, 1.7); ctx.fill();
  text(ctx, '1:56', x0 + 22, top + 104, { size: 8, color: [150, 150, 160] });
  text(ctx, '-2:06', x0 + w - 22, top + 104, { size: 8, color: [150, 150, 160], align: 'right' });
  const cy = top + 128;
  ctx.fillStyle = '#fff';
  for (const s of [-1, 1]) for (const k of [0, 1]) {
    const bx = PCX + s * 46 + s * k * 7;
    ctx.beginPath(); ctx.moveTo(bx + s * 6.5, cy); ctx.lineTo(bx - s * 1, cy - 6); ctx.lineTo(bx - s * 1, cy + 6); ctx.fill();
  }
  ctx.fillRect(PCX - 6, cy - 8, 3.6, 16); ctx.fillRect(PCX + 2.4, cy - 8, 3.6, 16);
  ctx.restore();
}

// ------------------------------------------------------------ 9 · never in your way (24.6–27.6)
function browser(ctx, y) {
  const x0 = P.x + 70, w = P.w - 140;
  ctx.save(); ctx.shadowColor = 'rgba(30,20,60,0.2)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8;
  ctx.fillStyle = '#fff'; rrect(ctx, x0, y, w, 420, 12); ctx.fill(); ctx.restore();
  ctx.fillStyle = '#ecebf1'; rrect(ctx, x0, y, w, 36, 12); ctx.fill(); ctx.fillRect(x0, y + 24, w, 12);
  ['Island · GitHub', 'Docs', 'localhost:5173', 'Releases'].forEach((s, i) => {
    const tx = x0 + 78 + i * 136;
    ctx.fillStyle = i === 0 ? '#fff' : 'rgba(255,255,255,0.5)'; rrect(ctx, tx, y + 9, 128, 27, 8); ctx.fill();
    text(ctx, s, tx + 12, y + 26, { size: 8.6, weight: 500, color: [60, 58, 76] });
  });
  for (let i = 0; i < 3; i++) { ctx.fillStyle = ['#ff5f57', '#febc2e', '#28c840'][i]; ctx.beginPath(); ctx.arc(x0 + 18 + i * 13, y + 19, 4.4, 0, TAU); ctx.fill(); }
  ctx.fillStyle = '#f3f2f7'; rrect(ctx, x0 + 16, y + 46, w - 32, 20, 10); ctx.fill();
  text(ctx, 'github.com/UsoguiH/dynamic-island-windows', x0 + 30, y + 59.5, { size: 8.4, color: [110, 108, 126] });
  ctx.fillStyle = '#efeef4';
  for (let i = 0; i < 4; i++) { rrect(ctx, x0 + 34, y + 94 + i * 26, w * (0.62 - i * 0.1), 11, 5.5); ctx.fill(); }
}
function sRetract(ctx, t) {
  paleBG(ctx);
  heading(ctx, 'retract', '07', 'AUTO-RETRACT', t, 24.75);
  const by = kf(t, [[24.6, P.y + 470], [25.2, P.y + 128, E.outC]]);
  browser(ctx, by);
  const fold = 25.45, back = 26.45;
  const [w, h, r] = springKF(t, [[0, [150, 34, 17]], [fold, [190, 5, 2.5]], [back, [150, 34, 17]]], 0.55);
  const iy = lerp(P.y + 104, P.y + 133, seg(t, fold - 0.1, fold + 0.2) * (1 - seg(t, back, back + 0.3)));
  islandShape(ctx, PCX, iy, w, h, r);
  if (h > 14) islandEyes(ctx, PCX - w / 2 + h / 2 + 3, iy + h / 2, h, t, [26.9]);
  if (t > 25.9) {
    const [px, py] = kf(t, [[25.9, [PCX + 160, P.y + 300]], [26.4, [PCX + 20, P.y + 138], E.ioC], [27.6, [PCX + 26, P.y + 150], E.outQ]]);
    arrow(ctx, px, py, 1.25, seg(t, 25.9, 26.05));
  }
  const lx = P.x + 450;
  monoLabel(ctx, lx, by + 120, 'FOLDS OVER YOUR TABS', t, 25.5, { sub: 'HOVER TO BRING IT BACK' });
  monoLabel(ctx, lx, by + 160, 'CLICK-THROUGH EVERYWHERE ELSE', t, 25.7);
  monoLabel(ctx, lx, by + 190, 'NEVER STEALS FOCUS', t, 25.85);
  monoLabel(ctx, lx, by + 220, 'HIDES IN FULLSCREEN GAMES', t, 26.0);
}

// ------------------------------------------------------------ 10 · outro: everything → Bloub (27.6–32)
const RECAP = [['mist', 0], ['dark', 1], ['magenta', 2], ['lilac', 3], ['dark', 4], ['peach', 5]];
function recapCell(ctx, kind, i, x, y, w, h, t) {
  if (kind !== 'dark') { ctx.drawImage(gradImage(kind, 300, 200), x, y, w, h); }
  else { ctx.fillStyle = '#1c1c20'; ctx.fillRect(x, y, w, h); }
  const cx = x + w / 2, cy = y + h / 2;
  if (i === 0) { islandShape(ctx, cx, cy - 26, 160, 52, 20); AGENTS.forEach((a, k) => bloub(ctx, cx - 54 + k * 36, cy, 11, { body: a.body })); }
  if (i === 1) { ringArc(ctx, cx - 50, cy, 34, 0.82, ORANGE, 7); ringArc(ctx, cx + 50, cy, 34, 0.63, GREEN, 7); }
  if (i === 2) { islandShape(ctx, cx, cy - 22, 190, 44, 22); text(ctx, 'Midnight City', cx - 40, cy + 4, { size: 11, weight: 600, color: [246, 246, 250] }); }
  if (i === 3) bloub(ctx, cx, cy, 30, { look: [0.4, 0] });
  if (i === 4) { islandShape(ctx, cx, cy - 18, 220, 36, 18, { glow: 0.6 }); text(ctx, 'Allow', cx + 72, cy + 4, { size: 10, weight: 600, color: [120, 180, 255] }); }
  if (i === 5) tabTile(ctx, 'Battery', cx - 75, cy - 50, 150, 100, t, 0, 0, 0);
}
function sOutro(ctx, t) {
  panelBG(ctx, [244, 243, 241]);
  const cols = [0, 262, 525, 787], rows = [0, 221, 442];
  const collapse = E.ioC(seg(t, 28.75, 29.35));
  if (collapse < 1) {
    RECAP.forEach(([kind], i) => {
      const k = seg(t, 27.6 + i * 0.08, 27.8 + i * 0.08);
      if (k <= 0) return;
      const c = i % 3, r = (i / 3) | 0;
      let x = P.x + cols[c], y = P.y + rows[r], w = cols[c + 1] - cols[c], h = rows[r + 1] - rows[r];
      if (i === 2) { x = lerp(x, PCX - 150, collapse); y = lerp(y, PCY - 90, collapse); w = lerp(w, 300, collapse); h = lerp(h, 180, collapse); }
      ctx.save(); ctx.globalAlpha *= k * (i === 2 ? 1 : 1 - collapse);
      ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
      recapCell(ctx, kind, i, x, y, w, h, t);
      ctx.restore();
    });
    return;
  }
  // the pink tile rounds into a sphere with eyes: it's Bloub
  const ga = seg(t, 29.4, 29.9);
  tileGrid(ctx, kf(t, [[29.3, 1.0], [32, 1.3]]), kf(t, [[29.3, 0.6], [30, 1.4, E.outQ]]), ga * 0.85);
  const r2 = mulberry32(23);
  for (let i = 0; i < 46; i++) {
    const a = r2() * TAU, d = 50 + r2() * 420, k = E.outC(seg(t, 29.45 + r2() * 0.1, 30.4));
    ctx.fillStyle = `rgba(20,20,20,${ga})`; ctx.fillRect(PCX + Math.cos(a) * d * k - 1.3, PCY + Math.sin(a) * d * 0.62 * k - 1.3, 2.6, 2.6);
  }
  const [w, h, rr] = kf(t, [[29.35, [300, 180, 24]], [29.95, [64, 64, 32], E.ioC]]);
  const lift = E.ioC(seg(t, 30.0, 30.5));
  const cx = PCX, cy = PCY - 34 * lift;
  ctx.save(); rrect(ctx, cx - w / 2, cy - h / 2, w, h, rr); ctx.clip();
  ctx.drawImage(gradImage('magenta', 300, 200), cx - w / 2, cy - h / 2, w, h);
  const g = ctx.createRadialGradient(cx - w * 0.2, cy - h * 0.25, 1, cx, cy, w * 0.65);
  g.addColorStop(0, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(90,0,50,0.25)');
  ctx.fillStyle = g; ctx.fillRect(cx - w / 2, cy - h / 2, w, h);
  ctx.restore();
  const eyes = seg(t, 29.85, 30.1);
  if (eyes > 0) {
    ctx.save(); ctx.globalAlpha *= eyes;
    pauseBars(ctx, cx + Math.sin(t * 1.5) * 1.5, cy, 16, 5.4, 14, [20, 12, 24], blinkAt(t, [30.6, 31.6]));
    ctx.restore();
  }
  const pL = seg(t, 30.15, 30.55), pR = seg(t, 30.3, 30.7);
  if (pL > 0) { const size = 27, ww = wordmark(ctx, 0, 0, size, 1, 1, t, true); wordmark(ctx, PCX - ww / 2, PCY + 34, size, pL, pR, t); }
  typedLine(ctx, 'url', PCX, PCY + 62, t, { size: 11, align: 'center', color: [120, 118, 130] });
}
