'use strict';
// Features + Build (reference frames 580–1027): a live call with the agent's
// notes, a drifting collage of calls, the dark "Scanning conversations"
// loader, the proposed change and the proposals table, a mosaic of test
// runs, and the closing sphere.
// The reference's people are filmed photos; here they are painted stand-ins.

// ------------------------------------------------------------ painted portrait stand-ins
const PORTRAITS = [
  { bg: [[188, 196, 206], [214, 216, 222]], skin: [226, 186, 160], hair: [206, 168, 110], top: [214, 198, 176], phone: true },   // caller
  { bg: [[60, 64, 70], [120, 120, 118]], skin: [116, 78, 56], hair: [30, 24, 22], top: [150, 70, 50], phone: false },           // walking
  { bg: [[40, 38, 44], [90, 80, 78]], skin: [222, 180, 150], hair: [200, 170, 130], top: [30, 30, 34], phone: true },             // night call
  { bg: [[210, 206, 200], [160, 150, 144]], skin: [190, 140, 110], hair: [40, 30, 28], top: [236, 232, 226], phone: true },       // office
  { bg: [[200, 190, 180], [230, 222, 214]], skin: [176, 120, 92], hair: [36, 26, 24], top: [40, 40, 44], phone: false },          // braids
];
const portraitCache = {};
function portraitImage(i) {
  if (portraitCache[i]) return portraitCache[i];
  const p = PORTRAITS[i], w = 200, h = 240;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  const bg = g.createLinearGradient(0, 0, w, h); bg.addColorStop(0, rgb(p.bg[0])); bg.addColorStop(1, rgb(p.bg[1]));
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.filter = 'blur(2px)';
  g.fillStyle = rgb(p.top); g.beginPath(); g.ellipse(w * 0.5, h * 1.05, w * 0.48, h * 0.32, 0, 0, TAU); g.fill();
  g.fillStyle = rgb(mix(p.skin, [0, 0, 0], 0.12)); g.fillRect(w * 0.43, h * 0.55, w * 0.14, h * 0.18);
  g.fillStyle = rgb(p.hair); g.beginPath(); g.ellipse(w * 0.5, h * 0.42, w * 0.25, h * 0.27, 0, 0, TAU); g.fill();
  const sk = g.createRadialGradient(w * 0.46, h * 0.38, 4, w * 0.5, h * 0.42, w * 0.22);
  sk.addColorStop(0, rgb(mix(p.skin, [255, 255, 255], 0.2))); sk.addColorStop(1, rgb(mix(p.skin, [0, 0, 0], 0.12)));
  g.fillStyle = sk; g.beginPath(); g.ellipse(w * 0.5, h * 0.44, w * 0.17, h * 0.2, 0, 0, TAU); g.fill();
  // hair falling either side of the face
  g.fillStyle = rgb(p.hair);
  g.beginPath(); g.ellipse(w * 0.33, h * 0.55, w * 0.07, h * 0.18, 0.1, 0, TAU); g.fill();
  g.beginPath(); g.ellipse(w * 0.67, h * 0.55, w * 0.07, h * 0.18, -0.1, 0, TAU); g.fill();
  g.beginPath(); g.ellipse(w * 0.5, h * 0.27, w * 0.2, h * 0.09, 0, 0, TAU); g.fill();
  // soft features
  g.fillStyle = rgb(mix(p.skin, [60, 40, 30], 0.45));
  g.beginPath(); g.ellipse(w * 0.44, h * 0.42, w * 0.018, h * 0.01, 0, 0, TAU); g.fill();
  g.beginPath(); g.ellipse(w * 0.56, h * 0.42, w * 0.018, h * 0.01, 0, 0, TAU); g.fill();
  g.fillStyle = rgb(mix(p.skin, [150, 60, 60], 0.35)); g.beginPath(); g.ellipse(w * 0.5, h * 0.53, w * 0.035, h * 0.008, 0, 0, TAU); g.fill();
  if (p.phone) {
    g.fillStyle = '#3a3634'; rrect(g, w * 0.3, h * 0.38, w * 0.05, h * 0.15, 3); g.fill();
    g.fillStyle = rgb(mix(p.skin, [0, 0, 0], 0.08)); g.beginPath(); g.ellipse(w * 0.32, h * 0.56, w * 0.06, h * 0.07, -0.3, 0, TAU); g.fill();
  }
  portraitCache[i] = c;
  return c;
}
function photo(ctx, i, x, y, w, h, o = {}) {
  ctx.save(); ctx.globalAlpha *= o.alpha ?? 1;
  rrect(ctx, x, y, w, h, o.r ?? 3); ctx.clip();
  const img = portraitImage(i), s = Math.max(w / img.width, h / img.height);
  ctx.drawImage(img, x + (w - img.width * s) / 2, y + (h - img.height * s) / 2, img.width * s, img.height * s);
  if (o.tint) { ctx.fillStyle = rgb([200, 90, 150], o.tint * 0.55); ctx.fillRect(x, y, w, h); }
  ctx.restore();
}
function phoneDot(ctx, x, y, r) {
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  ctx.save(); ctx.translate(x, y); ctx.rotate(0.6); ctx.fillStyle = '#111';
  rrect(ctx, -r * 0.18, -r * 0.5, r * 0.36, r * 1.0, r * 0.15); ctx.fill();
  ctx.fillRect(-r * 0.32, -r * 0.55, r * 0.64, r * 0.2); ctx.fillRect(-r * 0.32, r * 0.35, r * 0.64, r * 0.2); ctx.restore();
}
function noteLabel(ctx, x, y, title, lines, a = 1) {
  monoLabel(ctx, x, y, title, { alpha: a });
  ctx.save(); ctx.globalAlpha *= a;
  lines.forEach((l, i) => text(ctx, l, x + 7, y + 9 + i * 7, { size: 5.2, family: MONO, color: [150, 148, 146], tracking: 0.05 }));
  ctx.fillStyle = 'rgba(0,0,0,0.05)'; rrect(ctx, x + 7, y + 13 + lines.length * 7, 70, 9, 2); ctx.fill();
  ctx.restore();
}

// ------------------------------------------------------------ the call (580–632)
const CALLER = [[FR(580), [21, 141, 124, 143, 1]], [FR(585), [23, 85, 180, 216, 0.15], E.outQ], [FR(588), [23, 77, 199, 236, 0]], [FR(600), [52, 64, 207, 242, 0]], [FR(628), [73, 47, 201, 234, 0]], [FR(632), [70, 50, 205, 238, 0.7]]];
const CALLTILE = [[FR(581), [560, 140, 90, 90]], [FR(585), [523, 200, 125, 130], E.outQ], [FR(588), [519, 200, 136, 135]], [FR(600), [492, 199, 136, 136]], [FR(628), [479, 216, 131, 131]]];
function sceneCall(ctx, t) {
  ctx.fillStyle = '#fefefe'; ctx.fillRect(P.x, P.y, P.w, P.h);
  if (t < FR(581)) { // the approve card pulls back and fades
    ctx.save(); ctx.globalAlpha = 1 - seg(t, FR(579.5), FR(581));
    sceneApprove(ctx, t); ctx.restore();
    return;
  }
  const ox = P.x, oy = P.y;
  const [px, py, pw, ph, tint] = kf(t, CALLER);
  photo(ctx, 0, ox + px, oy + py, pw, ph, { tint, r: 3 });
  const [tx, ty, tw, th] = kf(t, CALLTILE);
  gradTile(ctx, 'violet', ox + tx, oy + ty, tw, th, 3);
  if (t > FR(587)) phoneDot(ctx, ox + tx + tw / 2, oy + ty + th / 2, 12 * seg(t, FR(587), FR(590)));
  const la = seg(t, FR(582), FR(586));
  noteLabel(ctx, ox + px + pw + 22, oy + py + ph * 0.79, 'DELIVERY WINDOW', t > FR(596) ? ['CALLER WANTS THE EARLIEST', 'DELIVERY THIS WEEK. TUESDAY', 'IS1'] : ['CALLER WAI'], la);
  noteLabel(ctx, ox + tx, oy + ty + th + 12, 'ACCOUNT UPDATE', t > FR(596) ? ['NEW NUMBER AND ADDRESS SINCE JAI'] : ['NE'], la);
  if (t > FR(606)) noteLabel(ctx, ox + 620, oy + 88, 'BILLING QUERY', ['CHARGE ON THE ACCOUNT LOOKS', 'UNFAMILIAR TO THE CALLER', 'COULDN’T LAST MONTH’S STATEMENT'], seg(t, FR(606), FR(612)));
  // the agent's reply bubble with a typed tool call
  const ba = seg(t, FR(590), FR(596));
  if (ba > 0) {
    ctx.save(); ctx.globalAlpha *= ba;
    ctx.fillStyle = 'rgba(0,0,0,0.035)'; rrect(ctx, ox + 376, oy - 20, 240, 154, 4); ctx.fill();
    ctx.fillStyle = '#fff'; rrect(ctx, ox + 386, oy - 14, 168, 50, 10); ctx.fill();
    text(ctx, 'Good morning John! Of', ox + 400, oy + 2, { size: 9, color: [40, 40, 40] });
    text(ctx, 'course, let me pull up the', ox + 400, oy + 13.5, { size: 9, color: [40, 40, 40] });
    text(ctx, 'pricing details for you.', ox + 400, oy + 25, { size: 9, color: [40, 40, 40] });
    const n = typed('pricing', t);
    if (n > 0 || t > FR(594)) {
      ctx.fillStyle = '#fff'; rrect(ctx, ox + 393, oy + 44, 126, 26, 13); ctx.fill();
      ctx.strokeStyle = '#999'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(ox + 408, oy + 57, 3, 0, TAU); ctx.stroke();
      text(ctx, cueOf('pricing').text.slice(0, n), ox + 421, oy + 60.5, { size: 9.2, color: [60, 70, 120] });
    }
    ctx.restore();
  }
  // a magenta wash floods in on the cut (632–636)
  const wash = seg(t, FR(629), FR(634));
  if (wash > 0) { ctx.fillStyle = `rgba(214,120,170,${0.4 * wash})`; ctx.fillRect(P.x, P.y, P.w, P.h); }
}

// ------------------------------------------------------------ the collage (632–700)
// [kind, x, y, w, h, drift] — kind: portrait index, or a gradient look, or a UI snippet
const COLLAGE = [
  [3, 152, -10, 148, 82, 1], ['violet', 537, 12, 126, 182, 0.8], [1, 332, 124, 145, 117, 1.1], [2, 537, 255, 128, 95, 0.9],
  ['ui-phone', 113, 142, 125, 75, 1], ['magenta', 22, 277, 75, 55, 1.2], ['ui-grid', 176, 258, 126, 95, 0.9], [4, 332, 393, 104, 60, 1],
  [2, 130, 403, 78, 50, 1.1], [0, 0, 68, 40, 102, 1.3], ['beige', 730, 325, 60, 110, 0.7], ['ui-grid', 506, 405, 70, 50, 1],
];
function uiSnippet(ctx, kind, x, y, w, h) {
  if (kind === 'ui-phone') {
    ctx.fillStyle = 'rgba(0,0,0,0.04)'; ctx.fillRect(x, y, w, h);
    gradTile(ctx, 'violet', x + w * 0.16, y + h * 0.12, w * 0.68, h * 0.95, 8);
    ctx.fillStyle = '#fff'; rrect(ctx, x + w * 0.22, y + h * 0.3, w * 0.56, h * 0.45, 4); ctx.fill();
    ctx.fillStyle = '#111'; rrect(ctx, x + w * 0.27, y + h * 0.36, 14, 6, 3); ctx.fill();
    text(ctx, 'Hey I’m having', x + w * 0.27, y + h * 0.62, { size: 4.6, color: [40, 40, 40] });
  } else {
    ctx.fillStyle = 'rgba(0,0,0,0.03)'; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(0,0,0,0.04)'; ctx.lineWidth = 0.5;
    for (let gx = x; gx < x + w; gx += 6) { ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gx, y + h); ctx.stroke(); }
    ctx.fillStyle = '#fff'; rrect(ctx, x + w * 0.15, y + h * 0.4, w * 0.7, 12, 6); ctx.fill();
  }
}
function collageCard(ctx, c, t, k, dark) {
  const [kind, x0, y0, w0, h0, drift] = c;
  const s = 1 + (t - FR(635)) * 0.012 * drift;
  const x = P.x + PCX - P.x + (x0 + w0 / 2 - P.w / 2) * s - w0 * s / 2, y = P.y + (y0 - (t - FR(635)) * 4 * drift);
  const w = w0 * s, h = h0 * s;
  ctx.save(); ctx.globalAlpha *= k;
  if (typeof kind === 'number') photo(ctx, kind, x, y, w, h, { r: 3, tint: 0.7 * (1 - seg(t, FR(636), FR(644))) });
  else if (kind.startsWith('ui')) uiSnippet(ctx, kind, x, y, w, h);
  else {
    gradTile(ctx, kind, x, y, w, h, 4);
    if (kind === 'violet') { // the agent's speech card
      ctx.fillStyle = '#fff'; rrect(ctx, x + 10, y + 40, w - 20, 26, 6); ctx.fill();
      text(ctx, 'Hi Sarah! Happy to send those', x + 16, y + 50, { size: 4.6, color: [40, 40, 40] });
      text(ctx, 'over — let me just confirm a', x + 16, y + 57, { size: 4.6, color: [140, 140, 140] });
      ctx.fillStyle = '#fff'; rrect(ctx, x + 10, y + 72, 44, 13, 6.5); ctx.fill();
      text(ctx, '↻  Verifying...', x + 15, y + 81, { size: 4.6, color: [40, 40, 40] });
    }
  }
  if (dark > 0) { ctx.fillStyle = `rgba(42,42,42,${dark * 0.85})`; ctx.fillRect(x - 1, y - 1, w + 2, h + 2); }
  ctx.restore();
  if (k > 0.5 && !dark) monoLabel(ctx, x + w + 12, y + h * 0.15, ['DELIVERY REMINDER', 'BILLING QUERY', 'SUPPORT CALL', 'URGENT ISSUE'][(x0 | 0) % 4], { alpha: k * 0.8 });
}
function sceneCollage(ctx, t) {
  const darkK = seg(t, FR(684), FR(689));
  ctx.fillStyle = rgb(mix([254, 254, 254], [42, 42, 42], darkK)); ctx.fillRect(P.x, P.y, P.w, P.h);
  COLLAGE.forEach((c, i) => {
    const k = seg(t, FR(633) + i * 0.06, FR(637) + i * 0.06);
    if (k > 0) collageCard(ctx, c, t, k, darkK * (i === 1 ? 0.15 : 1));
  });
  const wash = 1 - seg(t, FR(633), FR(640));
  if (wash > 0) { ctx.fillStyle = `rgba(214,120,170,${0.35 * wash})`; ctx.fillRect(P.x, P.y, P.w, P.h); }
}

// ------------------------------------------------------------ the dark loader (694–780)
function sceneScan(ctx, t) {
  ctx.fillStyle = '#2a2a2a'; ctx.fillRect(P.x, P.y, P.w, P.h);
  const cx = PCX, cy = PCY;
  // soft grey squares that fade as the loader starts
  const sqA = 1 - seg(t, FR(722), FR(732));
  if (sqA > 0) {
    const r = mulberry32(17);
    for (let i = 0; i < 9; i++) {
      const s = 34 + r() * 30, x = P.x + 90 + r() * 600, y = P.y + 40 + r() * 340;
      ctx.fillStyle = `rgba(255,255,255,${0.05 * sqA})`; ctx.fillRect(x, y, s, s);
      if (i % 3 === 0) { ctx.strokeStyle = `rgba(255,255,255,${0.05 * sqA})`; ctx.lineWidth = 0.6; for (let gx = 6; gx < s; gx += 6) { ctx.beginPath(); ctx.moveTo(x + gx, y); ctx.lineTo(x + gx, y + s); ctx.moveTo(x, y + gx); ctx.lineTo(x + s, y + gx); ctx.stroke(); } }
    }
  }
  // the label in a thin box, with corner dots
  const la = seg(t, FR(720), FR(726));
  if (la > 0) {
    ctx.save(); ctx.globalAlpha *= la;
    const s = 'Scanning conversations...', size = 10.5;
    const w = measure(ctx, s, size, 'Inter', 400) + 6;
    ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.fillRect(cx - w / 2, cy - 9, w, 18);
    // a shimmer runs along the text
    const sh = ((t * 0.9) % 1.4) - 0.2;
    const g = ctx.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0);
    g.addColorStop(0, '#6e6c90'); g.addColorStop(clamp(sh), '#c8c8e6'); g.addColorStop(clamp(sh + 0.2), '#6e6c90'); g.addColorStop(1, '#6e6c90');
    ctx.font = `400 ${size}px Inter`; ctx.textAlign = 'center'; ctx.fillStyle = g; ctx.fillText(s, cx, cy + 4);
    ctx.fillStyle = '#ddd';
    for (const [x, y] of [[cx - w / 2, cy - 9], [cx + w / 2, cy - 9], [cx - w / 2, cy + 9], [cx + w / 2, cy + 9]]) ctx.fillRect(x - 1, y - 1, 2, 2);
    ctx.restore();
  }
  // a ring of dots that orbits and breathes
  const da = seg(t, FR(724), FR(731)) * (1 - seg(t, FR(770), FR(777)));
  if (da > 0) {
    for (let i = 0; i < 13; i++) {
      const a = (i / 13) * TAU + t * 0.35 + Math.sin(i * 2.3) * 0.2;
      const rr = (150 + 30 * Math.sin(i * 1.7 + t)) * kf(t, [[FR(724), 0.4], [FR(732), 1, E.outC]]);
      ctx.fillStyle = `rgba(255,255,255,${da})`; ctx.fillRect(cx + Math.cos(a) * rr - 1.6, cy + Math.sin(a) * rr * 0.92 - 1.6, 3.2, 3.2);
    }
  }
  if (t < FR(728)) { // bright flecks as the loader lands
    const f = seg(t, FR(724), FR(727)) * (1 - seg(t, FR(727), FR(730)));
    ctx.fillStyle = `rgba(255,255,255,${f})`;
    for (const [x, y] of [[-140, -80], [-80, -100], [80, -110], [130, -90], [-120, 60], [110, 80]]) ctx.fillRect(cx + x - 2, cy + y - 2, 4, 4);
  }
}

// ------------------------------------------------------------ alternate verification (780–856)
function cornerFrame(ctx, x0, y0, x1, y1, a = 1) {
  ctx.save(); ctx.globalAlpha *= a;
  ctx.strokeStyle = 'rgba(0,0,0,0.06)'; ctx.lineWidth = 0.7;
  ctx.beginPath(); ctx.moveTo(P.x, y0); ctx.lineTo(P.x + P.w, y0); ctx.moveTo(P.x, y1); ctx.lineTo(P.x + P.w, y1); ctx.stroke();
  ctx.fillStyle = '#222';
  for (const [x, y] of [[x0, y0], [x1, y0], [x0, y1], [x1, y1]]) ctx.fillRect(x - 1.2, y - 1.2, 2.4, 2.4);
  ctx.restore();
}
const VERIFY = [
  ['h', 'Alternate verification', 26], ['p', 'Trigger: Run this procedure when account lookup fails', 55],
  ['s', 'Tools', 95], ['r', [['send_whatsapp_confirmation', 'code'], ['Added', 'ink']], 127], ['r', [['order_lookup', 'code'], ['→  If Tool Fails:', 'grey'], ['Transfer', 'del'], ['→  Retry once, then continue', 'grey']], 152],
  ['s', 'LLM', 194], ['r', [['LLM:', 'grey'], ['gpt-5.6-luna', 'del'], ['→', 'grey'], ['claude-opus-4-8', 'ink']], 223],
  ['r', [['Order:', 'grey'], ['gpt-5.6-luna, claude-sonnet-5', 'del'], ['→', 'grey'], ['claude-opus-4-8, claude-sonnet-5, gpt-5.6-terra', 'ink']], 244],
  ['s', 'Turn taking', 284], ['r', [['Turn Model:', 'grey'], ['turn_v2', 'del'], ['→', 'grey'], ['turn_v3', 'ink']], 314],
  ['s', 'Guardrails', 354], ['r', [['Custom  →  Out Of Scope Requests  →  Is Enabled:', 'grey'], ['Off', 'del'], ['On', 'ink']], 384],
  ['r', [['Custom  →  Config  →  Configs', 'grey'], ['Modified', 'tag']], 404],
];
function verifyCard(ctx, t, x, y, w, h, s, a) {
  ctx.save(); ctx.globalAlpha *= a;
  ctx.shadowColor = 'rgba(0,0,0,0.05)'; ctx.shadowBlur = 10;
  rrect(ctx, x, y, w, h, 6); ctx.fillStyle = '#fff'; ctx.fill(); ctx.restore();
  ctx.save(); ctx.globalAlpha *= a;
  rrect(ctx, x, y, w, h, 6); ctx.clip();
  const reveal = (t - FR(798)) * 48; // rows appear over ~2 s
  VERIFY.forEach(([kind, v, yy], i) => {
    const k = clamp((reveal - i * 3.2) / 4);
    if (k <= 0) return;
    ctx.save(); ctx.globalAlpha *= k;
    const ry = y + yy * s, sz = 9 * s;
    if (kind === 'h') { text(ctx, '⌄', x + 10 * s, ry, { size: sz, color: [150, 150, 150] }); text(ctx, v, x + 24 * s, ry, { size: sz, weight: 500, color: [30, 30, 30] }); }
    else if (kind === 'p') text(ctx, v, x + 12 * s, ry, { size: sz, color: [40, 40, 40] });
    else if (kind === 's') {
      ctx.fillStyle = 'rgba(0,0,0,0.02)'; ctx.fillRect(x + 8 * s, ry - 13 * s, w - 16 * s, 20 * s);
      text(ctx, '⌄   ○  ' + v, x + 12 * s, ry, { size: sz, weight: 500, color: [30, 30, 30] });
    } else {
      let cx = x + 12 * s;
      for (const [str, style] of v) {
        const col = style === 'del' ? [220, 30, 70] : style === 'ink' ? [40, 40, 40] : style === 'code' ? [150, 150, 150] : style === 'tag' ? [190, 150, 40] : [150, 150, 152];
        const sw = measure(ctx, str, sz * 0.92, 'Inter', 400);
        if (style === 'code') { ctx.fillStyle = 'rgba(0,0,0,0.05)'; rrect(ctx, cx - 2, ry - 9 * s, sw + 4, 12 * s, 2); ctx.fill(); }
        if (style === 'tag') { ctx.fillStyle = 'rgba(250,230,140,0.6)'; rrect(ctx, cx - 2, ry - 9 * s, sw + 4, 12 * s, 2); ctx.fill(); }
        text(ctx, str, cx, ry, { size: sz * 0.92, color: col });
        if (style === 'del') { ctx.fillStyle = rgb(col); ctx.fillRect(cx, ry - 3 * s, sw, 0.9 * s); }
        cx += sw + 8 * s;
      }
    }
    ctx.restore();
  });
  ctx.restore();
}
function sceneVerify(ctx, t) {
  paleBG(ctx);
  // a framed area opens from a line, then the card fills it
  const open = E.ioC(seg(t, FR(789), FR(798)));
  const fx0 = lerp(PCX - 150, P.x + 150, open), fx1 = lerp(PCX + 150, P.x + 640, open);
  const fy0 = lerp(PCY - 2.5, P.y + 10, open), fy1 = lerp(PCY + 2.5, P.y + 450, open);
  if (t < FR(797)) { ctx.fillStyle = `rgba(255,255,255,${seg(t, FR(781), FR(786))})`; ctx.fillRect(fx0, fy0, fx1 - fx0, fy1 - fy0); }
  if (t < FR(810)) cornerFrame(ctx, fx0, fy0, fx1, fy1, 1 - seg(t, FR(804), FR(810)));
  const ca = seg(t, FR(796), FR(801));
  if (ca > 0) {
    const z = kf(t, [[FR(796), 0.62], [FR(812), 1.0, E.ioC], [FR(850), 1.02]]);
    const w = 552 * z, h = 445 * z, x = P.x + 117 + (552 - w) / 2 + kf(t, [[FR(796), 30], [FR(812), 0, E.ioC]]), y = P.y + 8 + (1 - z) * 160;
    const blank = seg(t, FR(849), FR(853));
    verifyCard(ctx, t, x, y, w, h, z, ca);
    if (blank > 0) { ctx.fillStyle = `rgba(255,255,255,${blank})`; rrect(ctx, x, y, w, h, 6); ctx.fill(); }
  }
}

// ------------------------------------------------------------ proposals (853–905)
const PROPOSALS = [
  ['Add alternate verification when account lookup fails', 'aptos_04U1fn0qmbz6...', 'Architect'],
  ['Update knowledge base for the new returns window', 'aptos_1001rn0go09ka...', 'Architect'],
  ['Tighten guardrail for out of scope requests', 'aptos_8A01ln0nkdhf...', 'Manual'],
];
function sceneProposals(ctx, t) {
  paleBG(ctx);
  const ox = P.x, oy = P.y;
  const shrink = E.ioC(seg(t, FR(853), FR(862)));
  const x0 = lerp(117, 165, shrink), x1 = lerp(669, 623, shrink), y0 = lerp(8, 123, shrink), y1 = lerp(453, 318, shrink);
  cornerFrame(ctx, ox + x0 - 18, oy + y0 - 12, ox + x1 + 18, oy + y1 + 12, seg(t, FR(856), FR(862)));
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.04)'; ctx.shadowBlur = 8;
  ctx.fillStyle = '#fff'; ctx.fillRect(ox + x0, oy + y0, x1 - x0, y1 - y0); ctx.restore();
  const a = seg(t, FR(860), FR(866));
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha *= a;
  text(ctx, 'Proposals', ox + x0 + 10, oy + y0 + 31, { size: 18.5, color: [26, 26, 26], tracking: -0.02 });
  text(ctx, 'TITLE', ox + x0 + 22, oy + y0 + 60, { size: 5.6, color: [160, 160, 160], tracking: 0.08 });
  text(ctx, 'SOURCE', ox + x0 + 328, oy + y0 + 60, { size: 5.6, color: [160, 160, 160], tracking: 0.08 });
  text(ctx, 'STATUS', ox + x0 + 400, oy + y0 + 60, { size: 5.6, color: [160, 160, 160], tracking: 0.08 });
  PROPOSALS.forEach(([title, id, src], i) => {
    const k = seg(t, FR(864) + i * 0.12, FR(870) + i * 0.12);
    if (k <= 0) return;
    ctx.save(); ctx.globalAlpha *= k;
    const ry = oy + y0 + 84 + i * 38;
    text(ctx, title, ox + x0 + 22, ry, { size: 8.4, weight: 500, color: [30, 30, 30] });
    text(ctx, id + '  ·  Aug 20, 3:52 PM', ox + x0 + 22, ry + 12, { size: 5.6, color: [170, 170, 170] });
    const purple = src === 'Architect';
    ctx.fillStyle = purple ? 'rgba(150,120,230,0.15)' : 'rgba(0,0,0,0.05)'; rrect(ctx, ox + x0 + 326, ry - 8, 38, 13, 3); ctx.fill();
    text(ctx, src, ox + x0 + 345, ry + 1.5, { size: 5.8, color: purple ? [130, 90, 210] : [100, 100, 100], align: 'center' });
    ctx.fillStyle = 'rgba(250,220,120,0.4)'; rrect(ctx, ox + x0 + 398, ry - 8, 34, 13, 3); ctx.fill();
    text(ctx, 'Pending', ox + x0 + 415, ry + 1.5, { size: 5.8, color: [190, 150, 40], align: 'center' });
    ctx.restore();
  });
  ctx.restore();
}

// ------------------------------------------------------------ mosaic (905–985)
// a 4×3 grid of cells; each cell is a gradient, a dark test panel or blank
const MOSAIC_COLS = [0, 187, 266, 519, 787], MOSAIC_ROWS = [0, 147, 297, 442];
const MOSAIC = [
  ['dark-chat', 0, 0, 1, 1, 906], ['mist', 1, 0, 1, 1, 908], ['dark-eval', 2, 0, 1, 1, 912], ['dark-top', 3, 0, 1, 1, 916],
  ['white', 0, 1, 1, 1, 0], ['mist', 1, 1, 1, 1, 906], ['magenta', 2, 1, 1, 1, 906], ['dark-pass', 3, 1, 1, 1, 918],
  ['green', 0, 2, 1, 1, 906], ['white', 1, 2, 1, 1, 0], ['streak', 2, 2, 2, 1, 906],
];
function testPanel(ctx, kind, x, y, w, h, t) {
  ctx.fillStyle = '#202022'; ctx.fillRect(x, y, w, h);
  const mono = (s, xx, yy, c = [210, 210, 214]) => text(ctx, s, xx, yy, { size: 5.2, family: MONO, color: c, tracking: 0.05 });
  if (kind === 'dark-chat') {
    ctx.fillStyle = '#3a3a3e'; rrect(ctx, x + 12, y + 11, 18, 7, 2); ctx.fill(); mono('PROD', x + 14, y + 16.5);
    text(ctx, 'Customer Support Agent', x + 35, y + 17, { size: 5.8, color: [200, 200, 204] });
    text(ctx, '[sympathetic] I am so sorry you’re dealing with', x + 12, y + 32, { size: 5.8, color: [236, 236, 240] });
    text(ctx, 'that. I can definitely help you get this', x + 12, y + 41, { size: 5.8, color: [140, 140, 146] });
    text(ctx, 'sorted out though.', x + 12, y + 50, { size: 5.8, color: [140, 140, 146] });
  } else if (kind === 'dark-eval') {
    mono('◯  EVALUATION SUCCEEDED', x + 12, y + 17, [220, 220, 224]);
    mono('CRITERION 1: THE AGENT OFFERED EMAIL AND ORDER NUMBER', x + 12, y + 33, [150, 150, 156]);
    mono('CRITERION 2: THE CUSTOMER WAS VERIFIED, RESOLVED', x + 12, y + 50, [150, 150, 156]);
    ctx.fillStyle = '#000'; ctx.fillRect(x, y + h - 10, w * 0.5, 10); mono('RUNNING  TEST STATUS FOR BILLING AGENT', x + 4, y + h - 3, [220, 220, 224]);
  } else if (kind === 'dark-top') {
    ctx.fillStyle = '#18181a'; ctx.fillRect(x, y, w, h);
    mono('RUNNING  TEST STATUS FOR SHOPPING AGENT', x + 4, y + 33, [220, 220, 224]);
  } else if (kind === 'dark-pass') {
    mono('◯  PASSED', x + 32, y + 18, [220, 220, 224]);
    for (let i = 0; i < 7; i++) {
      ctx.strokeStyle = '#aaa'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(x + 36, y + 37 + i * 19, 3, 0, TAU); ctx.stroke();
      mono(i ? 'TRIAL_8661YKNHP4CDE27HKGFTGFJHBFJX' : 'RUN_2701KYNMP4CDE27HKGFTGFJHBFJX', x + 46, y + 39 + i * 19, i ? [90, 90, 96] : [220, 220, 224]);
    }
  }
}
function sceneMosaic(ctx, t) {
  const out = E.ioC(seg(t, FR(972), FR(984)));
  ctx.fillStyle = rgb(mix([255, 255, 255], [242, 241, 239], seg(t, FR(974), FR(977)))); ctx.fillRect(P.x, P.y, P.w, P.h);
  ctx.save();
  // pull back toward the magenta cell as it ends
  const z = lerp(1, 1.05, out);
  const fx = P.x + 392, fy = P.y + 222;
  ctx.translate(fx, fy); ctx.scale(z, z); ctx.translate(-fx, -fy);
  for (const [kind, c, r, cw, rh, f0] of MOSAIC) {
    const x = P.x + MOSAIC_COLS[c], y = P.y + MOSAIC_ROWS[r], h = MOSAIC_ROWS[r + rh] - MOSAIC_ROWS[r];
    let w = MOSAIC_COLS[c + cw] - MOSAIC_COLS[c];
    if (kind === 'streak' && t > FR(974)) w = 253; // the right half drops away first
    const k = f0 ? seg(t, FR(f0), FR(f0 + 3)) : 1;
    if (k <= 0) continue;
    const keep = kind === 'magenta' ? 1 : (kind === 'dark-pass' || kind === 'streak') ? 1 - seg(t, FR(981), FR(984)) : 1 - seg(t, FR(974), FR(977));
    ctx.save(); ctx.globalAlpha *= k * keep;
    if (kind === 'white') { ctx.fillStyle = '#fff'; ctx.fillRect(x, y, w, h); }
    else if (kind === 'green') {
      const g = ctx.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, '#9ccf8c'); g.addColorStop(0.5, '#c8e6b8'); g.addColorStop(1, '#7fb876');
      ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
      if (t > FR(924)) { ctx.fillStyle = '#fff'; rrect(ctx, x + 42, y + 64, 98, 22, 6); ctx.fill(); text(ctx, '✦  Improve response', x + 52, y + 78, { size: 7, weight: 500, color: [40, 40, 40] }); }
    } else if (kind.startsWith('dark')) testPanel(ctx, kind, x, y, w, h, t);
    else ctx.drawImage(gradImage(kind, 300, 200), x, y, w, h);
    ctx.restore();
  }
  ctx.fillStyle = '#000'; if (t > FR(920) && t < FR(975)) { ctx.fillRect(P.x + 66, P.y + 280, 120, 12); text(ctx, '▸  TEST STATUS FOR SUPPORT AGENT', P.x + 70, P.y + 288.5, { size: 5, family: MONO, color: [230, 230, 234] }); }
  ctx.restore();

}

// ------------------------------------------------------------ outro: tile → sphere (985–1027)
function sceneOutro(ctx, t) {
  panelBG(ctx, [244, 243, 241]);
  const cx = PCX, cy = PCY;
  // rounded outline frame around the tile
  const fa = seg(t, FR(985), FR(990)) * (1 - seg(t, FR(1004), FR(1010)));
  const fz = kf(t, [[FR(985), 1], [FR(1008), 0.45, E.ioC]]);
  if (fa > 0) {
    ctx.save(); ctx.globalAlpha *= fa;
    rrect(ctx, cx - 221 * fz, cy - 153 * fz, 442 * fz, 306 * fz, 22 * fz); ctx.strokeStyle = 'rgba(0,0,0,0.13)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();
  }
  // the magenta tile rounds into a sphere
  const [w, h, r] = kf(t, [[FR(984), [286, 170, 4]], [FR(988), [325, 190, 24], E.outQ], [FR(1001), [300, 176, 28]], [FR(1007), [46, 46, 23], E.ioC], [FR(1027), [42, 42, 21]]]);
  ctx.save();
  rrect(ctx, cx - w / 2, cy - h / 2, w, h, r); ctx.clip();
  ctx.drawImage(gradImage('magenta', 300, 200), cx - w / 2, cy - h / 2, w, h);
  if (r > 18) { // sphere shading
    const g = ctx.createRadialGradient(cx - w * 0.2, cy - h * 0.25, 1, cx, cy, w * 0.6);
    g.addColorStop(0, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(90,0,50,0.25)');
    ctx.fillStyle = g; ctx.fillRect(cx - w / 2, cy - h / 2, w, h);
  }
  ctx.restore();
  // the tile grid returns with dots scattered across it
  const ga = seg(t, FR(1007), FR(1013));
  if (ga > 0) {
    ctx.save(); ctx.globalAlpha *= ga * 0.8;
    tileGrid(ctx, FR(170));
    ctx.restore();
    const r2 = mulberry32(23);
    for (let i = 0; i < 44; i++) {
      const a = r2() * TAU, d = 40 + r2() * 420;
      const k = E.outC(seg(t, FR(1008) + r2() * 0.1, FR(1020)));
      const x = cx + Math.cos(a) * d * k, y = cy + Math.sin(a) * d * 0.62 * k;
      ctx.fillStyle = `rgba(20,20,20,${ga})`; ctx.fillRect(x - 1.3, y - 1.3, 2.6, 2.6);
    }
  }
}
