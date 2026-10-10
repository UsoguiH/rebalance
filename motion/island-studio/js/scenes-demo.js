'use strict';
// Agents: a new agent is launched from the island, its workspace assembles,
// it stops to ask you something, its plan builds step by step, and you
// Allow its command from the island.

// letters of a typed line visible at t (uses the shared cue timing)
function typedText(id, t) { return cueOf(id).text.slice(0, typed(id, t)); }
// a typed line whose freshest letters are still grey
function typedLine(ctx, id, x, y, t, o = {}) {
  const ts = CUE_TIMES[id], s = cueOf(id).text;
  let cx = x;
  const size = o.size || 13.5, w = o.weight || 400, col = o.color || [24, 24, 24];
  const runs = o.runs || []; // [[start, end, colour]]
  for (let i = 0; i < s.length; i++) {
    if (t < ts[i]) break;
    const fresh = 1 - seg(t, ts[i], ts[i] + 0.35);
    const run = runs.find(r => i >= r[0] && i < r[1]);
    const c = mix(run ? run[2] : col, [180, 180, 186], fresh * 0.85);
    text(ctx, s[i], cx, y, { size, weight: w, color: c });
    cx += measure(ctx, s[i], size, 'Inter', w);
  }
  if (o.caret && t >= ts[0] - 0.3 && t < (o.caretEnd ?? Infinity)) {
    ctx.fillStyle = 'rgba(30,30,30,0.85)'; ctx.fillRect(cx + 1.5, y - size * 0.82, Math.max(0.8, size * 0.07), size * 1.05);
  }
  return cx;
}

// ------------------------------------------------------------ prompt card
const CARD0 = { x: 239, y: 212, w: 399, h: 113 }; // final card in the panel
// zoomed: the card's left/top/bottom on screen
const CARDZ = [[FR(238), [152, 76, 460]], [FR(246), [130, 110, 426], E.outQ], [FR(254), [137, 122, 414], E.outQ], [FR(273), [137, 122, 414]],
  [FR(280), [CARD0.x, CARD0.y, CARD0.y + CARD0.h], E.ioC]];
function personIcon(ctx, x, y, r, col = [90, 90, 96]) {
  ctx.fillStyle = rgb(col); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y - r * 0.22, r * 0.34, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x, y + r * 0.62, r * 0.6, r * 0.42, 0, Math.PI, TAU); ctx.fill();
}
function atIcon(ctx, x, y, size, a = 1) {
  text(ctx, '@', x, y, { size, weight: 600, color: [20, 20, 20], align: 'center', alpha: a });
}
function promptCard(ctx, t, content = 1) {
  const { x, y, w, h } = CARD0;
  ctx.save();
  ctx.shadowColor = 'rgba(30,30,60,0.14)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 4;
  rrect(ctx, x, y, w, h, 10); ctx.fillStyle = '#fff'; ctx.fill(); ctx.restore();
  if (content <= 0) return;
  ctx.save(); ctx.globalAlpha *= content;
  // agent chip
  rrect(ctx, x + 6, y + 7, 155, 21, 6); ctx.strokeStyle = 'rgba(0,0,0,0.08)'; ctx.lineWidth = 0.8; ctx.stroke();
  bloub(ctx, x + 18, y + 17.5, 5, { body: AGENTS[0].body });
  text(ctx, 'New agent \u00b7 aurora-web', x + 27, y + 21, { size: 8.6, weight: 500, color: [36, 36, 36] });
  text(ctx, '×', x + 150, y + 21, { size: 8.5, color: [150, 150, 150], align: 'center' });
  typedLine(ctx, 'prompt', x + 15, y + 52, t, { size: 11.2, caret: true, caretEnd: FR(318) });
  atIcon(ctx, x + 22, y + 98, 12.5);
  // send button
  const press = seg(t, FR(316), FR(319)) * (1 - seg(t, FR(320), FR(324)));
  ctx.fillStyle = rgb(mix([18, 18, 20], [150, 60, 110], press)); ctx.beginPath(); ctx.arc(x + w - 23, y + h - 22, 11.5, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x + w - 23, y + h - 17); ctx.lineTo(x + w - 23, y + h - 27); ctx.moveTo(x + w - 27, y + h - 23); ctx.lineTo(x + w - 23, y + h - 27); ctx.lineTo(x + w - 19, y + h - 23); ctx.stroke();
  ctx.restore();
}
// big black arrow pointer with a thin white edge
function arrow(ctx, x, y, s = 1, a = 1, press = 0) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.scale(s * (1 - press * 0.12), s * (1 - press * 0.12));
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 17); ctx.lineTo(4.4, 13.2); ctx.lineTo(7.4, 19.6); ctx.lineTo(10, 18.4); ctx.lineTo(7.1, 12.2); ctx.lineTo(12.8, 12.2); ctx.closePath();
  ctx.shadowColor = 'rgba(0,0,0,0.25)'; ctx.shadowBlur = 3; ctx.shadowOffsetY = 1;
  ctx.fillStyle = '#0c0c0c'; ctx.fill(); ctx.shadowColor = 'transparent';
  ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 0.9; ctx.lineJoin = 'round'; ctx.stroke();
  ctx.restore();
}
function scenePrompt(ctx, t) {
  // backdrop: mist while zoomed, the deep streaks once it pulls back
  ctx.drawImage(gradImage('mist', 400, 225), P.x, P.y, P.w, P.h);
  const deep = seg(t, FR(272), FR(281));
  if (deep > 0) { ctx.save(); ctx.globalAlpha = deep; ctx.drawImage(gradImage('streak', 400, 225), P.x, P.y, P.w, P.h); ctx.restore(); }
  const [L, T, B] = kf(t, CARDZ);
  const s = (B - T) / CARD0.h;
  ctx.save();
  ctx.translate(L, T); ctx.scale(s, s); ctx.translate(-CARD0.x, -CARD0.y);
  if (t < FR(246)) { // an outline card, then a white wash sweeping in from the right
    rrect(ctx, CARD0.x, CARD0.y, CARD0.w * 1.6, CARD0.h, 10);
    ctx.strokeStyle = `rgba(255,255,255,${0.85 * seg(t, FR(236), FR(239))})`; ctx.lineWidth = 0.6; ctx.stroke();
    const p = seg(t, FR(239), FR(246));
    if (p > 0) {
      const g = ctx.createLinearGradient(CARD0.x + CARD0.w * (1.6 - 1.7 * p), 0, CARD0.x + CARD0.w * (1.6 - 1.7 * p) + 160, 0);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,1)');
      rrect(ctx, CARD0.x, CARD0.y, CARD0.w * 1.6, CARD0.h, 10); ctx.fillStyle = g; ctx.fill();
    }
  } else {
    const content = seg(t, FR(244), FR(252));
    if (content < 1) { // soft focus while it settles: blur the card as one layer
      ctx.restore();
      layer(ctx, 'card', g => { g.translate(L, T); g.scale(s, s); g.translate(-CARD0.x, -CARD0.y); promptCard(g, t, content); }, { blur: (1 - content) * 2 });
      ctx.save();
    } else promptCard(ctx, t, content);
  }
  ctx.restore();
  // the pointer comes in and sends
  if (t > FR(276) && t < FR(324)) {
    const [px, py] = kf(t, [[FR(276), [640, 345]], [FR(286), [624, 316], E.outQ], [FR(310), [619, 311]], [FR(316), [616, 307], E.ioQ]]);
    arrow(ctx, px, py, 1.15, seg(t, FR(276), FR(279)) * (1 - seg(t, FR(321), FR(324))), seg(t, FR(316), FR(318)) * (1 - seg(t, FR(320), FR(322))));
  }
}
// the card fades and folds into a plain white slip (frames 320–330)
function scenePromptOut(ctx, t) {
  ctx.drawImage(gradImage('streak', 400, 225), P.x, P.y, P.w, P.h);
  const wash = seg(t, FR(322), FR(328));
  if (wash > 0) { ctx.save(); ctx.globalAlpha = wash; ctx.drawImage(gradImage('lilac', 400, 225), P.x, P.y, P.w, P.h); ctx.restore(); }
  if (t < FR(324)) {
    ctx.save(); ctx.globalAlpha = 1 - seg(t, FR(321), FR(324));
    promptCard(ctx, t, 0.45);
    ctx.restore();
    return;
  }
  sceneWorkspace(ctx, t);
}

// ------------------------------------------------------------ the agent's workspace (dark panels)
function darkPanel(ctx, x, y, w, h, a = 1) {
  ctx.save(); ctx.globalAlpha *= a;
  ctx.shadowColor = 'rgba(10,10,30,0.3)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6;
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, '#202024'); g.addColorStop(1, '#18181b');
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h); ctx.restore();
}
function tinyText(ctx, s, x, y, o = {}) { text(ctx, s, x, y, Object.assign({ size: 5.4, color: [200, 200, 206] }, o)); }
function nodeCard(ctx, x, y, title) {
  ctx.fillStyle = '#2b2b30'; rrect(ctx, x, y, 88, 32, 4); ctx.fill();
  tinyText(ctx, '⚒ ' + title, x + 6, y + 9, { color: [220, 220, 226] });
  for (let i = 0; i < 3; i++) { ctx.fillStyle = '#3a3a40'; rrect(ctx, x + 6 + i * 20, y + 14, 17, 6, 1.5); ctx.fill(); }
  tinyText(ctx, 'aurora-web \u00b7 opus', x + 6, y + 28, { size: 4.4, color: [120, 120, 128] });
}
function toggleRow(ctx, x, y, label, on) {
  ctx.fillStyle = on ? '#e9e9ee' : '#3c3c42'; rrect(ctx, x, y - 4.5, 13, 7, 3.5); ctx.fill();
  ctx.fillStyle = on ? '#18181b' : '#77777e'; ctx.beginPath(); ctx.arc(on ? x + 9.5 : x + 3.5, y - 1, 2.5, 0, TAU); ctx.fill();
  tinyText(ctx, label, x + 20, y + 1, { size: 5.8, color: [210, 210, 216] });
}
function chatMsg(ctx, x, y, who, lines, agent) {
  if (agent) bloub(ctx, x + 6, y + 4, 5.5, { body: AGENTS[0].body }); else { ctx.fillStyle = '#3a3a40'; ctx.beginPath(); ctx.arc(x + 6, y + 4, 5.5, 0, TAU); ctx.fill(); }
  if (agent) { ctx.fillStyle = '#3a3a40'; rrect(ctx, x + 16, y - 1, 15, 6, 1.5); ctx.fill(); tinyText(ctx, 'LIVE', x + 17.5, y + 3.6, { size: 3.6 }); }
  tinyText(ctx, who, x + (agent ? 35 : 16), y + 3.6, { size: 5 });
  lines.forEach((l, i) => tinyText(ctx, l, x + 16, y + 13 + i * 7, { size: 5.2, color: [236, 236, 240] }));
  tinyText(ctx, '0:42    44k context    $0.16', x + 16, y + 15 + lines.length * 7, { size: 4, color: [110, 110, 118] });
}
function gatheringCard(ctx, x, y, t, n) {
  ctx.save(); ctx.shadowColor = 'rgba(20,20,40,0.18)'; ctx.shadowBlur = 12;
  ctx.fillStyle = '#fff'; ctx.fillRect(x, y, 202, 133); ctx.restore();
  ctx.strokeStyle = '#888'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(x + 19, y + 18, 4.4, 0, TAU); ctx.stroke();
  text(ctx, 'Working on it', x + 32, y + 21, { size: 9.4, color: [40, 40, 40] });
  ['Reading theme.ts', 'Writing ThemeToggle.tsx', 'Wiring the settings page'].forEach((s, i) => {
    const a = clamp(n - i);
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha *= a;
    ctx.fillStyle = '#3c3c42'; ctx.beginPath(); ctx.arc(x + 18, y + 55 + i * 30, 5.5, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + 15.6, y + 55 + i * 30); ctx.lineTo(x + 17.4, y + 57 + i * 30); ctx.lineTo(x + 20.6, y + 53 + i * 30); ctx.stroke();
    text(ctx, s, x + 32, y + 58 + i * 30, { size: 7.8, color: [120, 120, 126] });
    ctx.restore();
  });
}
function sceneWorkspace(ctx, t) {
  ctx.drawImage(gradImage('lilac', 400, 225), P.x, P.y, P.w, P.h);
  const ox = P.x, oy = P.y;
  const e = k => E.outC(seg(t, FR(k), FR(k + 8)));
  const leave = E.inC(seg(t, FR(377), FR(381)));
  // white slip and a lavender block (frames 324–334)
  if (t < FR(334) || t > FR(379)) {
    const sw = kf(t, [[FR(324), 400], [FR(327), 166]]), sh = kf(t, [[FR(324), 113], [FR(327), 60]]);
    ctx.fillStyle = 'rgba(120,110,170,0.75)'; ctx.fillRect(ox + 452, oy + 150, 70, 52);
    ctx.fillStyle = '#fbfbfd'; ctx.fillRect(ox + 393 - sw / 2, oy + 218 - sh / 2, sw, sh);
  }
  ctx.save();
  // top-left: workflow nodes
  const a1 = e(330);
  ctx.save(); ctx.translate(-40 * (1 - a1) - 120 * leave, 0); ctx.globalAlpha *= a1;
  darkPanel(ctx, ox, oy, 356, 177);
  if (t > FR(338)) {
    nodeCard(ctx, ox + 28, oy + 22, 'Read theme.ts'); nodeCard(ctx, ox + 28, oy + 108, 'Edit Settings.tsx'); nodeCard(ctx, ox + 228, oy + 70, 'Write ThemeToggle.tsx');
    ctx.strokeStyle = '#55555c'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(ox + 116, oy + 38); ctx.bezierCurveTo(ox + 160, oy + 38, ox + 160, oy + 75, ox + 228, oy + 80); ctx.moveTo(ox + 116, oy + 124); ctx.bezierCurveTo(ox + 160, oy + 124, ox + 170, oy + 95, ox + 228, oy + 92); ctx.stroke();
    for (const [x, y] of [[ox + 154, oy + 70], [ox + 154, oy + 118]]) { ctx.fillStyle = '#4a4a50'; rrect(ctx, x, y, 34, 7, 2); ctx.fill(); }
  }
  ctx.restore();
  // right: the chat transcript
  const a2 = e(328);
  ctx.save(); ctx.translate(60 * (1 - a2) + 160 * leave, 0); ctx.globalAlpha *= a2;
  darkPanel(ctx, ox + 484, oy + 82, 320, 252);
  if (t > FR(334)) {
    chatMsg(ctx, ox + 502, oy + 110, 'aurora-web', ['Reading theme.ts \u2192 found the colour tokens. The settings page already has', 'a section for appearance, so the toggle can live there.'], true);
    if (t > FR(342)) chatMsg(ctx, ox + 502, oy + 160, 'You \u00b7 from the island', ['Keep it to one toggle, and make sure it remembers the choice', 'after a restart.'], false);
    if (t > FR(352)) chatMsg(ctx, ox + 502, oy + 212, 'aurora-web', ['Got it. Writing ThemeToggle.tsx and saving the choice to localStorage.', 'I\u2019ll need to run the build once it\u2019s wired up.'], true);
  }
  ctx.restore();
  // bottom-left: system tools
  const a3 = e(336);
  ctx.save(); ctx.translate(0, 60 * (1 - a3) + 120 * leave); ctx.globalAlpha *= a3;
  darkPanel(ctx, ox + 46, oy + 232, 277, 230);
  text(ctx, 'Your agents', ox + 54, oy + 249, { size: 9.6, color: [240, 240, 244] });
  tinyText(ctx, '4 sessions watched', ox + 61, oy + 276, { size: 5.6 });
  ['aurora-web \u00b7 working', 'pixel-api \u00b7 running tests', 'notes-cli \u00b7 done', 'orbit-landing \u00b7 idle', 'Bloub celebrations'].forEach((s, i) => {
    toggleRow(ctx, ox + 62, oy + 302 + i * 29, s, i !== 3 && (i !== 4 || t > FR(366)));
    if (i < 4) bloub(ctx, ox + 290, oy + 301 + i * 29, 5, { body: AGENTS[i].body });
  });
  ctx.restore();
  // the "Gathering data" card on top
  if (t >= FR(330)) {
    const a4 = e(330) * (1 - seg(t, FR(378), FR(381)));
    ctx.save(); ctx.globalAlpha *= a4;
    gatheringCard(ctx, ox + 293, oy + 155, t, kf(t, [[FR(340), 0], [FR(352), 1], [FR(362), 2], [FR(372), 3]]));
    ctx.restore();
  }
  ctx.restore();
  // the island watches from the top edge
  if (t >= FR(332)) {
    const ia = seg(t, FR(332), FR(338)) * (1 - seg(t, FR(377), FR(381)));
    islandPill(ctx, PCX + 92, oy + 16, 132, 24, { alpha: ia, dots: [AGENTS[2].body, AGENTS[1].body, AGENTS[0].body], blink: blinkAt(t, [FR(350)]) });
  }
  // fade toward the pale page (frames 380–388)
  const pale = seg(t, FR(381), FR(388));
  if (pale > 0) { ctx.fillStyle = `rgba(238,236,234,${pale})`; ctx.fillRect(ox, oy, P.w, P.h); }
}

// ------------------------------------------------------------ thought + reply
function paleBG(ctx) {
  const g = ctx.createLinearGradient(0, P.y, 0, P.y + P.h);
  g.addColorStop(0, '#efedeb'); g.addColorStop(0.6, '#ecebea'); g.addColorStop(1, '#e4e4e5');
  ctx.fillStyle = g; ctx.fillRect(P.x, P.y, P.w, P.h);
}
// reveal text with a soft left-to-right wipe
function wipeText(ctx, s, x, y, k, o) {
  if (k <= 0) return;
  const w = measure(ctx, s, o.size, 'Inter', o.weight || 400);
  ctx.save(); ctx.beginPath(); ctx.rect(x - 2, y - o.size * 1.2, (w + 40) * k, o.size * 1.8); ctx.clip();
  text(ctx, s, x, y, o);
  ctx.restore();
}
function chip(ctx, x, y, label) {
  const w = measure(ctx, label, 9, 'Inter', 500) + 26;
  rrect(ctx, x, y, w, 19, 4); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.1)'; ctx.lineWidth = 0.8; ctx.stroke();
  ctx.strokeStyle = '#444'; ctx.lineWidth = 0.9; ctx.strokeRect(x + 7, y + 6, 4, 4); ctx.strokeRect(x + 12, y + 6, 4, 4); ctx.strokeRect(x + 7, y + 11, 4, 4);
  text(ctx, label, x + 21, y + 13, { size: 9, weight: 500, color: [36, 36, 36] });
  return w;
}
function sceneThought(ctx, t) {
  paleBG(ctx);
  ctx.save();
  const z = kf(t, [[FR(430), 1], [FR(470), 1.07, E.ioQ]]);
  ctx.translate(PCX, PCY); ctx.scale(z, z); ctx.translate(-PCX, -PCY);
  const ox = P.x, oy = P.y;
  const k0 = seg(t, FR(388), FR(394));
  if (k0 > 0) {
    ctx.save(); ctx.globalAlpha *= k0;
        bloub(ctx, ox + 130, oy + 80, 5, { body: AGENTS[0].body }); text(ctx, 'aurora-web asked', ox + 139, oy + 83, { size: 9.6, color: [110, 110, 112] });
    ctx.restore();
  }
  wipeText(ctx, 'Should the toggle follow the system', ox + 124, oy + 112, seg(t, FR(391), FR(398)), { size: 12.6, color: [26, 26, 26] });
  wipeText(ctx, 'theme, or always start light?', ox + 124, oy + 131, seg(t, FR(396), FR(405)), { size: 12.6, color: [26, 26, 26] });
  const pk = seg(t, FR(393), FR(402));
  if (pk > 0) {
    ctx.save(); ctx.globalAlpha *= pk;
    rrect(ctx, ox + 125, oy + 150, 315, 60, 5); ctx.fillStyle = `rgba(${lerp(226, 240, seg(t, FR(398), FR(410)))},${lerp(236, 239, seg(t, FR(398), FR(410)))},${lerp(246, 238, seg(t, FR(398), FR(410)))},0.9)`; ctx.fill();
    text(ctx, 'Suggested: Follow the system', ox + 138, oy + 174, { size: 11.6, weight: 500, color: [26, 26, 26] });
    text(ctx, 'Light and dark stay one click away in Settings', ox + 138, oy + 193, { size: 8.8, color: [130, 130, 132] });
    ctx.restore();
  }
  // the reply card types in with linked mentions
  const rk = seg(t, FR(413), FR(419));
  if (rk > 0) {
    ctx.save(); ctx.globalAlpha *= rk;
    ctx.shadowColor = 'rgba(0,0,0,0.05)'; ctx.shadowBlur = 8;
    rrect(ctx, ox + 296, oy + 246, 366, 107, 6); ctx.fillStyle = rgb(mix([228, 238, 250], [255, 255, 255], seg(t, FR(416), FR(424)))); ctx.fill();
    ctx.shadowColor = 'transparent';
    const BLUE = [64, 140, 196];
    const line1 = 'Go ahead. Match the colours in @theme.ts', full = cueOf('reply').text;
    const n = typed('reply', t);
    // draw with the line break where the reference wraps
    const ts = CUE_TIMES.reply;
    let cx = ox + 307, cy = oy + 271;
    for (let i = 0; i < n; i++) {
      if (i === line1.length) { cx = ox + 307; cy += 20; }
      const ch = full[i];
      if (i === line1.length && ch === ' ') continue;
      const inMention = /@salesforce|@whatsapp/;
      const word = full.slice(0, i + 1).split(' ').pop();
      const isM = full.slice(Math.max(0, full.lastIndexOf('@', i)), i + 1).match(/^@[a-z.]*$/) && full.lastIndexOf('@', i) > full.lastIndexOf(' ', i);
      const fresh = 1 - seg(t, ts[i], ts[i] + 0.35);
      if (isM) { ctx.fillStyle = 'rgba(64,140,196,0.12)'; ctx.fillRect(cx - 0.5, cy - 11, measure(ctx, ch, 12, 'Inter', 400) + 1, 14.5); }
      text(ctx, ch, cx, cy, { size: 12, color: mix(isM ? BLUE : [26, 26, 26], [190, 190, 194], fresh * 0.8) });
      cx += measure(ctx, ch, 12, 'Inter', 400);
    }
    let x = ox + 306;
    const ca = seg(t, FR(415), FR(420));
    ctx.globalAlpha *= ca;
    x += chip(ctx, x, oy + 318, 'theme.ts') + 6; chip(ctx, x, oy + 318, 'Island');
    ctx.restore();
  }
  ctx.restore();
}

// ------------------------------------------------------------ icon column → procedure steps
const STEP_KIND = {
  Tell: { fg: [130, 40, 210], bg: [240, 228, 252] }, Ask: { fg: [40, 130, 190], bg: [224, 240, 250] },
  Tool: { fg: [220, 110, 40], bg: [253, 234, 220] }, Say: { fg: [40, 170, 80], bg: [224, 248, 230] },
  If: { fg: [220, 40, 100], bg: [252, 224, 234] }, 'Else if': { fg: [220, 40, 100], bg: [252, 224, 234] },
};
function kindIcon(ctx, kind, x, y, s) { // glyph centred on x, y, in a box of size s
  const c = STEP_KIND[kind].fg;
  ctx.save(); ctx.strokeStyle = rgb(c); ctx.fillStyle = rgb(c); ctx.lineWidth = s * 0.075; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const u = s * 0.22;
  if (kind === 'Tell') { rrect(ctx, x - u * 1.3, y - u, u * 2.6, u * 1.8, u * 0.4); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x - u * 0.7, y + u * 0.8); ctx.lineTo(x - u * 0.9, y + u * 1.4); ctx.lineTo(x - u * 0.1, y + u * 0.8); ctx.stroke(); }
  else if (kind === 'Ask') { ctx.beginPath(); ctx.arc(x, y, u * 1.35, 0, TAU); ctx.stroke(); text(ctx, '?', x, y + u * 0.6, { size: u * 1.8, weight: 600, color: c, align: 'center' }); }
  else if (kind === 'Tool') { ctx.beginPath(); ctx.moveTo(x - u * 1.1, y + u * 1.1); ctx.lineTo(x + u * 0.3, y - u * 0.3); ctx.stroke(); ctx.beginPath(); ctx.arc(x + u * 0.65, y - u * 0.65, u * 0.6, Math.PI * 0.9, Math.PI * 2.4); ctx.stroke(); }
  else if (kind === 'Say') { text(ctx, '99', x, y + u * 1.1, { size: u * 3.2, weight: 700, color: c, align: 'center' }); }
  else { // if / else if: four little shapes
    ctx.beginPath(); ctx.arc(x + u * 0.65, y - u * 0.6, u * 0.42, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - u, y - u * 0.6); ctx.lineTo(x - u * 0.2, y - u * 0.6); ctx.moveTo(x - u * 0.6, y - u); ctx.lineTo(x - u * 0.6, y - u * 0.2);
    ctx.moveTo(x + u * 0.3, y + u * 0.3); ctx.lineTo(x + u, y + u); ctx.moveTo(x + u, y + u * 0.3); ctx.lineTo(x + u * 0.3, y + u);
    ctx.moveTo(x - u, y + u * 0.45); ctx.lineTo(x - u * 0.2, y + u * 0.45); ctx.moveTo(x - u, y + u * 0.85); ctx.lineTo(x - u * 0.2, y + u * 0.85); ctx.stroke();
  }
  ctx.restore();
}
function iconTile(ctx, kind, x, y, s) {
  rrect(ctx, x - s / 2, y - s / 2, s, s, s * 0.18); ctx.fillStyle = rgb(STEP_KIND[kind].bg); ctx.fill();
  kindIcon(ctx, kind, x, y, s);
}
// guide lines that frame the active tile
function guides(ctx, x0, y0, x1, y1, a = 1) {
  ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = 'rgba(0,0,0,0.09)'; ctx.lineWidth = 0.7;
  ctx.beginPath(); ctx.moveTo(P.x, y0); ctx.lineTo(P.x + P.w, y0); ctx.moveTo(P.x, y1); ctx.lineTo(P.x + P.w, y1);
  ctx.moveTo(x0, P.y); ctx.lineTo(x0, P.y + P.h); ctx.moveTo(x1, P.y); ctx.lineTo(x1, P.y + P.h); ctx.stroke();
  ctx.fillStyle = '#111';
  for (const [x, y] of [[x0, y0], [x1, y0], [x0, y1], [x1, y1]]) ctx.fillRect(x - 1.2, y - 1.2, 2.4, 2.4);
  ctx.restore();
}
const COLUMN = ['Tell', 'Ask', 'Tool', 'Say', 'If'];
function sceneIcons(ctx, t) {
  ctx.fillStyle = '#fbfbfb'; ctx.fillRect(P.x, P.y, P.w, P.h);
  const cx = P.x + 346;
  if (t < FR(482)) { // one tile, framed by guides, settling smaller
    const s = kf(t, [[FR(469), 56], [FR(474), 63], [FR(481), 42, E.ioQ]]);
    const cy = P.y + 222 - kf(t, [[FR(476), 0], [FR(482), 0]]);
    guides(ctx, cx - s / 2 - 12, cy - s / 2 - 12, cx + s / 2 + 12, cy + s / 2 + 12);
    iconTile(ctx, 'Tell', cx, cy, s);
    return;
  }
  // the column of five
  const sp = kf(t, [[FR(482), 46], [FR(486), 61, E.outQ]]);
  const top = P.y + 221 - sp * 2;
  guides(ctx, cx - 28, top - 30, cx + 28, top + sp * 4 + 30, 1 - seg(t, FR(493), FR(497)));
  COLUMN.forEach((k, i) => {
    const a = seg(t, FR(482) + i * 0.03, FR(484) + i * 0.03);
    if (a > 0) { ctx.save(); ctx.globalAlpha *= a; iconTile(ctx, k, cx, top + i * sp, 40); ctx.restore(); }
  });
}
// the procedure: [number, indent x, kind, label (coloured), text]
// the agent's plan: [number, indent x, glyph kind, label, body, chip name]
const STEPS = [
  ['1.', 195, 'Tell', '', 'theme.ts and the settings page', 'Read'],
  ['2.', 195, 'Ask', '', 'which theme it should start on', 'Ask'],
  ['3.', 195, 'Tool', 'Settings.tsx', 'add one toggle under Appearance', 'Edit'],
  ['', 260, 'If', 'build fails', 'fix it and run it once more', 'If'],
  ['4.', 195, 'If', '', 'npm test passes', 'If'],
  ['4.1.', 262, 'Say', '', 'I\u2019m done! (and wink)', 'Bloub'],
  ['4.2.', 262, 'Tool', 'island_banner', '', 'Run'],
  ['', 195, 'Else if', '', 'tests still fail', 'Else if'],
  ['4.3.', 262, 'Tool', 'ping_you_in_the_island', '', 'Run'],
];
const STEP_Y = [74, 114, 152, 191, 231, 269, 311, 351, 390];
function sceneSteps(ctx, t) {
  ctx.fillStyle = '#fbfbfb'; ctx.fillRect(P.x, P.y, P.w, P.h);
  const dx = kf(t, [[FR(497), 70], [FR(512), 0, E.outC]]);
  const ox = P.x + dx, oy = P.y;
  // sidebar
  const sa = seg(t, FR(499), FR(504));
  ctx.save(); ctx.globalAlpha *= sa;
  ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.fillRect(ox + 133, oy, 0.8, P.h);
  text(ctx, 'aurora-web \u00b7 plan', ox + 4 - 118, oy + 69, { size: 12.5, color: [60, 60, 60] });
  ctx.fillStyle = 'rgba(0,0,0,0.035)'; rrect(ctx, ox - 20, oy + 96, 145, 36, 5); ctx.fill();
  for (let i = 0; i < 3; i++) { ctx.fillStyle = '#666'; ctx.beginPath(); ctx.arc(ox + 105, oy + 108 + i * 5, 1, 0, TAU); ctx.fill(); }
  text(ctx, 'Plan  2 of 5', ox + 168, oy + 41, { size: 11, color: [140, 140, 142] });
  ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.fillRect(ox + 168, oy + 15, 560, 0.7);
  ctx.restore();
  // the tree's guide lines
  ctx.save(); ctx.globalAlpha *= seg(t, FR(504), FR(510)); ctx.fillStyle = 'rgba(0,0,0,0.1)';
  ctx.fillRect(ox + 206, oy + 161, 0.8, 38); ctx.fillRect(ox + 206, oy + 240, 0.8, 85); ctx.fillRect(ox + 206, oy + 360, 0.8, 38);
  ctx.restore();
  STEPS.forEach(([num, x, kind, label, body, name], i) => {
    const y = oy + STEP_Y[i];
    const t0 = FR(498) + i * 0.09;
    const a = seg(t, t0, t0 + 0.12);
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha *= a;
    if (num) text(ctx, num, ox + (num.length > 2 ? x - 37 : 168), y + 4.5, { size: 12, color: [150, 150, 152] });
    // chip with the kind's name, then the label and body typing in
    const cw = 20 + measure(ctx, name, 12.5, 'Inter', 500) + 6;
    rrect(ctx, ox + x, y - 10, cw, 21, 4); ctx.fillStyle = rgb(STEP_KIND[kind].bg); ctx.fill();
    kindIcon(ctx, kind, ox + x + 11, y, 17);
    const kN = Math.round(name.length * seg(t, t0 + 0.05, t0 + 0.25));
    text(ctx, name.slice(0, kN), ox + x + 21, y + 4.5, { size: 12.5, weight: 500, color: STEP_KIND[kind].fg });
    let tx = ox + x + cw + 9;
    const prog = seg(t, t0 + 0.12, t0 + 0.55 + i * 0.06);
    if (label) {
      const n = Math.round(label.length * prog);
      const lw = measure(ctx, label, 12.5, 'Inter', 400);
      if (n > 0) { rrect(ctx, tx - 4, y - 10, lw + 8, 21, 4); ctx.fillStyle = 'rgba(250,236,226,0.8)'; ctx.fill(); }
      text(ctx, label.slice(0, n), tx, y + 4.5, { size: 12.5, color: [160, 150, 146] });
      tx += lw + 14;
    }
    if (body) text(ctx, body.slice(0, Math.round(body.length * prog)), tx, y + 4.5, { size: 12.5, color: [30, 30, 30] });
    ctx.restore();
  });
  const add = seg(t, FR(514), FR(520));
  if (add > 0) text(ctx, '+  Message aurora-web', ox + 200, oy + 435, { size: 12, weight: 500, color: [40, 40, 40], alpha: add });
}

// ------------------------------------------------------------ approve
// button rect (panel px) settles as the camera eases in
const APPROVE = [[FR(541), [370, 236, 154, 64]], [FR(546), [340, 215, 155, 64]], [FR(550), [320, 199, 150, 64], E.outQ], [FR(556), [311, 193, 150, 64], E.outQ], [FR(562), [308, 191, 155, 65], E.outQ], [FR(580), [309, 191, 154, 65]]];
function sceneApprove(ctx, t) {
  ctx.fillStyle = '#fafafa'; ctx.fillRect(P.x, P.y, P.w, P.h);
  const [bx, by, bw, bh] = kf(t, APPROVE).map((v, i) => v + (i === 0 ? P.x : i === 1 ? P.y : 0));
  const k = bw / 52; // zoom relative to the card's own scale
  const tint = seg(t, FR(566), FR(569)) * (1 - seg(t, FR(574), FR(577)));
  // the card behind the buttons
  const cardR = bx + bw + 12 * k, cardB = by + bh + 12 * k;
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.06)'; ctx.shadowBlur = 10;
  rrect(ctx, P.x - 200, P.y - 300, cardR - P.x + 200, cardB - P.y + 300, 6 * k);
  const g = ctx.createLinearGradient(P.x, 0, cardR, 0);
  g.addColorStop(0, rgb(mix([252, 252, 252], [214, 228, 250], seg(t, FR(570), FR(573)) * (1 - seg(t, FR(578), FR(580)))))); g.addColorStop(1, '#fefefe');
  ctx.fillStyle = g; ctx.fill(); ctx.restore();
  ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 1; ctx.stroke();
  // inner text field above the buttons
  rrect(ctx, P.x - 200, P.y - 300, cardR - 4 * k - P.x + 200 - 5 * k, by - 9 * k - P.y + 300, 5 * k);
  ctx.strokeStyle = 'rgba(0,0,0,0.1)'; ctx.stroke();
  text(ctx, 'Deny', bx - 18 * k, by + bh * 0.64, { size: 7.4 * k, weight: 500, color: [40, 40, 40], align: 'right' });
  rrect(ctx, bx, by, bw, bh, 5 * k); ctx.fillStyle = rgb(mix(BLUE, [0, 84, 190], tint)); ctx.fill();
  text(ctx, 'Allow', bx + bw / 2, by + bh * 0.64, { size: 7.4 * k, weight: 500, color: [255, 255, 255], align: 'center' });
  const [px, py] = kf(t, [[FR(541), [P.x + 560, P.y + 460]], [FR(546), [P.x + 519, P.y + 343]], [FR(550), [P.x + 465, P.y + 279], E.outQ], [FR(556), [P.x + 447, P.y + 258], E.outQ],
    [FR(562), [P.x + 440, P.y + 247], E.outQ], [FR(568), [P.x + 429, P.y + 236], E.ioQ], [FR(572), [P.x + 436, P.y + 259], E.outQ], [FR(576), [P.x + 444, P.y + 277]]]);
  arrow(ctx, px, py, 2.7, 1, seg(t, FR(565), FR(567)) * (1 - seg(t, FR(569), FR(571))));
}
