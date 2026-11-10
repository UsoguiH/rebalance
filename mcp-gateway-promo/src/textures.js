// Canvas-painted textures: phone lock screen, sketch paper, console screens, cards, stickies.
import { canvasTex } from './kit3d.js';
import { C, rr, text, font, scribbleLine, scribbleRect, hatch, drawLogo } from './draw2d.js';
import { rng, TAU } from './util.js';

export const COPY = {
  product: 'MCP Gateway',
  full: 'Secure MCP Gateway',
  repo: 'github.com/UsoguiH/MCP-Gateway',
  tagline: 'A zero-trust control plane between AI assistants and your internal systems.',
  button: 'Connect',
  chats: [
    ['ai-agent', 'DELETE FROM payroll;', '#ff7a59'],
    ['claude · gitea', 'force-push to main?', '#8b5cf6'],
    ['assistant', 'read hr/salaries.xlsx', '#f6a609'],
    ['local-llm', 'export all IBANs', '#3aa0ff'],
  ],
  hero: ['sec-team', 'Who approved that?!', '#ff5a7a'],
  stickies: ['who called\nthis tool?', 'is it even\nallowed?', 'prompt\ninjection?!', 'who approved\nthe delete?', 'where is the\naudit log?', 'it read the\nIBANs…', 'which model\nwas that?', 'can we kill\nit NOW?', 'rate limits?', 'PII leaving\nthe building?'],
};

// Shield glyph used as the small product icon.
export function shieldPath(g, cx, cy, s) {
  g.beginPath();
  g.moveTo(cx, cy - s);
  g.bezierCurveTo(cx + s * 0.5, cy - s * 0.78, cx + s * 0.8, cy - s * 0.7, cx + s * 0.85, cy - s * 0.62);
  g.bezierCurveTo(cx + s * 0.9, cy + s * 0.1, cx + s * 0.55, cy + s * 0.7, cx, cy + s);
  g.bezierCurveTo(cx - s * 0.55, cy + s * 0.7, cx - s * 0.9, cy + s * 0.1, cx - s * 0.85, cy - s * 0.62);
  g.bezierCurveTo(cx - s * 0.8, cy - s * 0.7, cx - s * 0.5, cy - s * 0.78, cx, cy - s);
  g.closePath();
}
export function shieldIcon(g, cx, cy, s, fill = C.pink, check = '#fff') {
  shieldPath(g, cx, cy, s); g.fillStyle = fill; g.fill();
  g.strokeStyle = check; g.lineWidth = s * 0.2; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(cx - s * 0.36, cy + s * 0.02); g.lineTo(cx - s * 0.08, cy + s * 0.3); g.lineTo(cx + s * 0.4, cy - s * 0.28); g.stroke();
}

export function lockScreenTex() {
  return canvasTex(512, 1090, (g, w, h) => {
    rr(g, 0, 0, w, h, 70); g.clip();
    const grd = g.createLinearGradient(0, 0, w * 0.3, h);
    grd.addColorStop(0, '#ff9bb0'); grd.addColorStop(0.45, '#f4577a'); grd.addColorStop(0.75, '#e2313f'); grd.addColorStop(1, '#b3151f');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    // soft wallpaper shapes
    g.globalAlpha = 0.35; g.fillStyle = '#ffd0c0';
    g.beginPath(); g.ellipse(w * 0.2, h * 0.86, 300, 120, -0.3, 0, TAU); g.fill();
    g.fillStyle = '#7a0d1a'; g.beginPath(); g.ellipse(w * 0.75, h * 0.93, 260, 90, 0.2, 0, TAU); g.fill();
    g.globalAlpha = 1;
    rr(g, w / 2 - 62, 26, 124, 34, 17); g.fillStyle = '#12060a'; g.fill();
    text(g, 'Tue Nov 10', w / 2, 150, { size: 30, weight: 600, color: 'rgba(255,255,255,.9)', align: 'center' });
    text(g, '9:41', w / 2, 300, { size: 158, weight: 700, color: 'rgba(255,255,255,.62)', align: 'center', ls: -4 });
    // notification
    rr(g, 28, 400, w - 56, 150, 34); g.fillStyle = 'rgba(255,255,255,.34)'; g.fill();
    g.beginPath(); g.arc(88, 475, 34, 0, TAU); g.fillStyle = '#fff'; g.fill();
    shieldIcon(g, 88, 475, 20, C.violet);
    text(g, 'AI assistant', 140, 452, { size: 26, weight: 700, color: '#fff' });
    text(g, '142 tool calls today —', 140, 488, { size: 23, weight: 500, color: 'rgba(255,255,255,.92)', family: 'Inter' });
    text(g, 'nobody checked them', 140, 518, { size: 23, weight: 500, color: 'rgba(255,255,255,.92)', family: 'Inter' });
    text(g, 'now', w - 52, 446, { size: 20, weight: 500, color: 'rgba(255,255,255,.75)', align: 'right', family: 'Inter' });
    for (const x of [86, w - 86]) { g.beginPath(); g.arc(x, h - 92, 40, 0, TAU); g.fillStyle = 'rgba(40,0,10,.35)'; g.fill(); }
    rr(g, w / 2 - 80, h - 28, 160, 9, 5); g.fillStyle = 'rgba(255,255,255,.85)'; g.fill();
  });
}

// Pencil architecture sketch: AI -> ??? -> prod, no checks.
export function sketchTex(seed = 3, variant = 0) {
  return canvasTex(768, 1000, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = '#f6f1ea'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(60,54,70,.75)'; g.lineWidth = 3; g.lineCap = 'round';
    const hand = (s, x, y, size = 46, col = 'rgba(50,44,62,.85)') => text(g, s, x, y, { size, weight: 700, family: 'Caveat', color: col });
    if (variant === 0) {
      hand('tool calls → prod', 90, 110, 62);
      scribbleLine(g, 90, 128, 520, 132, r, 5);
      const bx = [[90, 220, 170, 110, 'AI'], [330, 220, 150, 110, '???'], [540, 220, 150, 110, 'DB']];
      for (const [x, y, bw, bh, s] of bx) { scribbleRect(g, x, y, bw, bh, r, 5); hand(s, x + 34, y + 72, 58); }
      scribbleLine(g, 262, 275, 326, 275, r, 4); scribbleLine(g, 310, 262, 326, 275, r, 2, 3); scribbleLine(g, 310, 288, 326, 275, r, 2, 3);
      scribbleLine(g, 482, 275, 536, 275, r, 4); scribbleLine(g, 520, 262, 536, 275, r, 2, 3); scribbleLine(g, 520, 288, 536, 275, r, 2, 3);
      hand('no auth?', 110, 420, 50); hand('no audit?', 110, 480, 50); hand('no approvals?!', 110, 540, 50, 'rgba(214,40,90,.9)');
      scribbleRect(g, 430, 400, 250, 170, r, 5); hatch(g, 438, 408, 234, 154, r, 12, 'rgba(60,54,70,.35)');
      scribbleRect(g, 100, 640, 180, 120, r, 5); scribbleRect(g, 310, 640, 180, 120, r, 5); scribbleRect(g, 520, 640, 160, 120, r, 5);
      hand('hr', 160, 715, 54); hand('git', 365, 715, 54); hand('files', 548, 715, 54);
      for (let i = 0; i < 5; i++) scribbleLine(g, 100, 820 + i * 30, 300 + r() * 360, 820 + i * 30, r, 4);
    } else {
      hand('18-stage pipeline', 80, 110, 60);
      for (let i = 0; i < 6; i++) {
        const x = 80 + (i % 3) * 215, y = 170 + Math.floor(i / 3) * 190;
        scribbleRect(g, x, y, 180, 130, r, 5);
        hand(['auth', 'ABAC', 'taint', 'HITL', 'DLP', 'audit'][i], x + 36, y + 82, 54);
      }
      for (let i = 0; i < 8; i++) scribbleLine(g, 80, 600 + i * 42, 240 + r() * 440, 600 + i * 42, r, 5);
    }
  });
}

// Chat-style notification card (transparent corners).
export function notifTex(sender, msg, color, big = false) {
  return canvasTex(900, 250, (g, w, h) => {
    rr(g, 6, 6, w - 12, h - 12, 62);
    const grd = g.createLinearGradient(0, 0, w, h);
    grd.addColorStop(0, 'rgba(255,150,205,.96)'); grd.addColorStop(1, 'rgba(240,96,170,.96)');
    g.fillStyle = grd; g.fill();
    g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 5; g.stroke();
    g.beginPath(); g.arc(126, h / 2, 62, 0, TAU); g.fillStyle = color; g.fill();
    g.lineWidth = 6; g.strokeStyle = 'rgba(255,255,255,.9)'; g.stroke();
    shieldIcon(g, 126, h / 2, 30, 'rgba(255,255,255,.95)', color);
    text(g, sender, 220, 98, { size: 40, weight: 600, color: 'rgba(255,255,255,.82)' });
    text(g, 'now', w - 60, 92, { size: 30, weight: 500, color: 'rgba(255,255,255,.7)', align: 'right' });
    text(g, msg, 220, 172, { size: big ? 64 : 58, weight: 700, color: '#fff' });
  });
}

export function stickyTex(msg, color, ink = 'rgba(40,30,50,.85)') {
  return canvasTex(360, 360, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, color); grd.addColorStop(1, color);
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(0,0,0,.06)'; g.fillRect(0, 0, w, 44);
    const lines = msg.split('\n');
    lines.forEach((s, i) => text(g, s, 30, 140 + i * 74, { size: 66, weight: 700, family: 'Caveat', color: ink }));
  });
}

// Admin console as seen on the laptop. state: 'idle' | 'live'
export function consoleTex(state = 'idle') {
  return canvasTex(1600, 1000, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, w, h);
    grd.addColorStop(0, '#fffaf6'); grd.addColorStop(1, '#ffe9ee');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    // top bar
    g.fillStyle = 'rgba(255,255,255,.9)'; g.fillRect(0, 0, w, 86);
    for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(46 + i * 34, 43, 10, 0, TAU); g.fillStyle = ['#ff6b6b', '#ffc24b', '#4cd37b'][i]; g.fill(); }
    shieldIcon(g, 180, 43, 20, C.pink);
    text(g, COPY.full, 214, 56, { size: 34, weight: 800, color: C.ink });
    ['Overview', 'Tools', 'Approvals', 'Audit'].forEach((s, i) => text(g, s, 900 + i * 165, 54, { size: 26, weight: 600, color: 'rgba(27,22,64,.55)', family: 'Inter' }));
    // hero
    text(g, state === 'live' ? 'Gateway is live.' : 'MCP Gateway', w / 2, 300, { size: 150, weight: 900, color: state === 'live' ? C.ink : C.coral, align: 'center', ls: -4 });
    text(g, 'Every AI tool call — authenticated, authorized, audited.', w / 2, 384, { size: 40, weight: 500, color: 'rgba(27,22,64,.6)', align: 'center', family: 'Inter' });
    // art row
    const cols = ['#ffb08a', '#ff8fb8', '#c9a5f2', '#8fd0f2'];
    cols.forEach((c, i) => {
      rr(g, 150 + i * 335, 470, 295, 190, 28); g.fillStyle = c; g.fill();
      g.fillStyle = 'rgba(255,255,255,.6)'; rr(g, 180 + i * 335, 500, 120, 22, 11); g.fill(); rr(g, 180 + i * 335, 540, 200, 16, 8); g.fill(); rr(g, 180 + i * 335, 570, 160, 16, 8); g.fill();
    });
    // button
    rr(g, w / 2 - 210, 740, 420, 120, 60);
    const bg = g.createLinearGradient(0, 740, 0, 860); bg.addColorStop(0, '#f6a8ef'); bg.addColorStop(1, '#d985ee');
    g.fillStyle = bg; g.fill();
    text(g, state === 'live' ? 'Connected' : COPY.button, w / 2, 822, { size: 64, weight: 800, color: '#8a3fd0', align: 'center' });
    if (state === 'live') {
      for (let i = 0; i < 26; i++) { const r = rng(i + 5); g.fillStyle = cols[i % 4]; g.fillRect(r() * w, 100 + r() * 600, 14, 26); }
    }
  });
}

export function pillLabelTex(label, color = '#8a3fd0') {
  return canvasTex(1400, 420, (g, w, h) => {
    text(g, label, w / 2, h / 2 + 8, { size: 300, weight: 800, color, align: 'center', baseline: 'middle', ls: -6 });
  });
}

export function fileCardTex(label, tint) {
  return canvasTex(700, 500, (g, w, h) => {
    rr(g, 4, 4, w - 8, h - 8, 44);
    const grd = g.createLinearGradient(0, 0, w, h); grd.addColorStop(0, '#ffffff'); grd.addColorStop(1, tint);
    g.fillStyle = grd; g.fill();
    text(g, label, 46, 120, { size: 92, weight: 800, color: C.ink, ls: -2 });
    g.fillStyle = 'rgba(27,22,64,.14)';
    for (let i = 0; i < 4; i++) { rr(g, 46, 190 + i * 62, 300 + ((i * 97) % 260), 26, 13); g.fill(); }
  });
}

export function logoTex(color = '#c2185b') {
  return canvasTex(512, 512, (g, w, h) => { drawLogo(g, w / 2, h / 2 + 6, 2.1, 1, color, 15); });
}

export function gradientTex(stops, speckle = 0, w = 64, h = 512) {
  return canvasTex(w, h, (g) => {
    const grd = g.createLinearGradient(0, 0, 0, h);
    stops.forEach(([p, c]) => grd.addColorStop(p, c));
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    const r = rng(11);
    for (let i = 0; i < speckle; i++) { g.fillStyle = `rgba(255,255,255,${0.3 + r() * 0.6})`; g.fillRect(r() * w, r() * h, 1.5, 1.5); }
  });
}

export function meshAlphaTex() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#fff'; g.lineWidth = 5;
    for (let i = -8; i < 16; i++) {
      g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32 + h, h); g.stroke();
      g.beginPath(); g.moveTo(i * 32, h); g.lineTo(i * 32 + h, 0); g.stroke();
    }
    g.fillStyle = '#fff'; g.fillRect(0, 0, w, 14); g.fillRect(0, h - 14, w, 14);
  });
}

export function deskTex(base = '#caa6f5', line = 'rgba(120,70,200,.16)') {
  return canvasTex(1024, 1024, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    const r = rng(5);
    g.strokeStyle = line; g.lineWidth = 3;
    for (let i = 0; i < 6; i++) { const y = (i / 6) * h + 40; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(w * 0.3, y + 30 * (r() - 0.5), w * 0.6, y + 30 * (r() - 0.5), w, y + 10); g.stroke(); }
    for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(90,40,170,${0.05 + r() * 0.12})`; g.beginPath(); g.arc(r() * w, r() * h, 1 + r() * 2.2, 0, TAU); g.fill(); }
  });
}
