"use strict";
// mobile module (see README). Loaded after the main script; uses its globals and HOOKS.
// Bedrock-style touch controls: floating joystick with sprint, a thumb cluster of stone-textured action
// buttons (jump, attack, use, block, sneak, contextual eat), a top bar (switch, inventory, camera, full screen,
// pause), a bigger touch hotbar with a "..." slot, touch settings in the pause menu, haptics and
// adaptive resolution. Everything here runs only on touch screens; desktop is untouched.
// It replaces the main script's touchDown/touchMove/touchUp/touchTick/joyHome (global functions).
(() => {
if (!TOUCH) return;
const root = document.documentElement;
const hasInv = () => typeof Inv !== 'undefined';
const hasCombat = () => typeof Combat !== 'undefined';
const invOpen = () => { try { return hasInv() && !!Inv.isOpen(); } catch (err) { return false; } };

// ---- settings (saved per device)
const LS_KEY = 'blockcraft.touch.v1';
const DEF_SET = { sens: 1, size: 1, opacity: .62, left: false, haptics: true, autoRes: true };
const SET = { ...DEF_SET };
try { Object.assign(SET, JSON.parse(localStorage.getItem(LS_KEY) || '{}')); } catch (err) { /* private mode or blocked storage */ }
const saveSet = () => { try { localStorage.setItem(LS_KEY, JSON.stringify(SET)); } catch (err) { /* not saved, still applied */ } };
const vib = ms => { if (!SET.haptics || !navigator.vibrate) return; try { navigator.vibrate(ms); } catch (err) { /* unsupported */ } };

// ---- pixel icons: color grids, auto-outlined in near-black, drawn as crisp SVG rects
const PAL = { w: '#ffffff', g: '#c6c6c6', G: '#8b8b8b', l: '#dcdcdc', d: '#9a9a9a', s: '#e0ac7d', S: '#b8875c', c: '#00a8a8',
  b: '#9a6b3b', B: '#6b4523', i: '#d8d8d8', I: '#8e8e8e', L: '#8a5a2b', D: '#5e3b19', y: '#ffd84a', m: '#a8522a', M: '#d4834e',
  o: '#e8e0c8', p: '#2f5f99', h: '#7a4a24', H: '#c79a5a', k: '#1b1b1b' };
function outline(rows) {
  const h = rows.length + 2, w = rows[0].length + 2, G = [];
  for (let y = 0; y < h; y++) { G.push([]); for (let x = 0; x < w; x++) G[y].push(rows[y - 1] && rows[y - 1][x - 1] && rows[y - 1][x - 1] !== '.' ? rows[y - 1][x - 1] : '.'); }
  const O = G.map(r => r.slice());
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (G[y][x] === '.' && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => G[y + b] && G[y + b][x + a] && G[y + b][x + a] !== '.')) O[y][x] = 'k';
  return O.map(r => r.join(''));
}
function svgIcon(rows, noOutline) {
  const R = noOutline ? rows : outline(rows), h = R.length, w = R[0].length; let out = '';
  R.forEach((row, y) => { for (let x = 0; x < w;) { const c = row[x]; if (c === '.') { x++; continue; } let n = 1; while (row[x + n] === c) n++;
    out += `<rect x="${x}" y="${y}" width="${n}" height="1" fill="${PAL[c]}"/>`; x += n; } });
  return `<svg viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges" aria-hidden="true">${out}</svg>`;
}
function sword() {      // iron sword, drawn diagonally like the item sprite
  const G = Array.from({ length: 14 }, () => Array(14).fill('.')), put = (x, y, c) => { if (x >= 0 && y >= 0 && x < 14 && y < 14) G[y][x] = c; };
  for (let y = 0; y < 8; y++) { const x = 12 - y; put(x - 1, y, 'w'); put(x, y, 'l'); put(x + 1, y, 'd'); }
  put(13, 0, '.'); put(12, 0, 'w');
  for (const [x, y] of [[2, 6], [3, 7], [4, 8], [5, 9], [6, 10]]) put(x, y, 'B');      // guard
  put(3, 6, 'h'); put(4, 7, 'h'); put(5, 8, 'h');
  for (let k = 0; k < 3; k++) { put(3 - k, 9 + k, 'H'); put(2 - k, 9 + k, 'h'); }       // grip
  put(0, 12, 'B'); put(0, 13, 'B'); put(1, 13, 'B');
  return G.map(r => r.join(''));
}
const ICON = {
  jump: svgIcon(['....ww....', '...wwww...', '..wwwwww..', '.wwwwwwww.', 'wwwwwwwwww', '...wwww...', '...wwww...', '...wwww...', '...wwww...', '...gggg...']),
  sneak: svgIcon(['...wwww...', '...wwww...', '...wwww...', 'wwwwwwwwww', '.wwwwwwww.', '..wwwwww..', '...wwww...', '....ww....', '..........', 'wwwwwwwwww', 'gggggggggg']),
  attack: svgIcon(sword()),
  use: svgIcon(['....ss......', '....ss.ss...', '.ss.ss.ss...', '.ss.ss.ss.ss', '.ss.ss.ss.ss', '.ssssssss.ss', '.ssssssssss.', 'sssssssssss.', 'sssSsssssss.',
    '.ssSSssssss.', '..ssssssss..', '...cccccc...', '...cccccc...']),
  block: svgIcon(['iiiiiiiiii', 'ibbBbbBbbi', 'ibbBbbBbbi', 'ibbBIIBbbi', 'iiiiIIiiii', 'ibbBIIBbbi', 'ibbBbbBbbi', '.ibBbbBbi.', '.ibBbbBbi.', '..ibbbbi..', '...ibbi...', '....ii....']),
  eat: svgIcon(['......mmm..', '.....mmMMm.', '....mmMMmmm', '....mMmmmmm', '....mmmmmmm', '.....mmmmm.', '....omm....', '...oo......', '..oo.......', 'ooo........', 'oo.........']),
  pause: svgIcon(['www..www', 'www..www', 'www..www', 'www..www', 'www..www', 'www..www', 'www..www', 'ggg..ggg']),
  view: svgIcon(['....wwww....', '..wwwwwwww..', '.wwwwppwwww.', 'wwwwpkkpwwww', 'wwwwpkkpwwww', '.wwwwppwwww.', '..wwwwwwww..', '....wwww....']),
  inv: svgIcon(['....DDDD....', '...D....D...', '..DDDDDDDD..', '.LLLLLLLLLL.', 'LLLLLLLLLLLL', 'LLLLLyyLLLLL', 'LLLLLyyLLLLL', 'LLLLLLLLLLLL', 'LDLLLLLLLLDL', 'LLLLLLLLLLLL', '.LLLLLLLLLL.', '..DDDDDDDD..']),
  full: svgIcon(['www....www', 'w........w', 'w........w', '..........', '..........', '..........', '..........', 'w........w', 'w........w', 'www....www']),
  more: svgIcon(['ww.ww.ww', 'ww.ww.ww']),
  sprint: svgIcon(['...ww...', '..wwww..', '.ww..ww.', 'ww....ww', '...ww...', '..wwww..', '.ww..ww.', 'ww....ww']),
  swap: svgIcon(['..y....', '.yy....', 'yyyyyy.', '.yy..y.', '..y..y.', '.....y.']),
};

// ---- stone button texture (16x16, like the stone block, drawn once)
const STONE = pixCanvas(16, 16, g => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
  const r = Math.random(), v = r < .12 ? 92 : r < .3 ? 108 : r < .75 ? 124 : 138; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x, y, 1, 1); } }).toDataURL();

// ---- styles (all scoped to html.touch so desktop never sees them)
const css = document.createElement('style');
css.textContent = `
html.touch #swBtn { display: none; }
#touchUI { --bop: .62; z-index: 2; }
#touchUI .mb { position: absolute; pointer-events: auto; margin: 0; padding: 0; border: 2px solid rgba(0,0,0,.88); background: none; display: grid; place-items: center;
  box-sizing: border-box; color: #fff; font: 13px var(--ui); transition: opacity .2s; }
#touchUI .mb::before { content: ""; position: absolute; inset: 0; background: url(${STONE}) 0 0 / 32px 32px; image-rendering: pixelated; opacity: var(--bop);
  box-shadow: inset 3px 3px 0 rgba(255,255,255,.5), inset -3px -3px 0 rgba(0,0,0,.5); }
#touchUI .mb::after { content: ""; position: absolute; inset: 0; pointer-events: none; }
#touchUI .mb > svg, #touchUI .mb > img { position: relative; width: 54%; height: 54%; filter: drop-shadow(2px 2px 0 rgba(0,0,0,.5)); image-rendering: pixelated; pointer-events: none; }
#touchUI .mb.big > svg { width: 50%; height: 50%; }
#touchUI .mb.on::before { opacity: calc(var(--bop) + .25); box-shadow: inset 3px 3px 0 rgba(0,0,0,.5), inset -3px -3px 0 rgba(255,255,255,.3); }
#touchUI .mb.on::after { background: rgba(255,255,255,.2); }
#touchUI .mb.on > svg, #touchUI .mb.on > img { transform: translate(1px, 2px); }
#touchUI .mb.tog { border-color: #fff; box-shadow: 0 0 0 2px rgba(0,0,0,.6); }
#touchUI .mb.tog::after { background: rgba(120,230,120,.28); }
#touchUI .mb .lbl { position: absolute; left: 0; right: 0; bottom: 3px; text-align: center; font-size: 11px; line-height: 1; text-shadow: 1px 1px 0 #3f3f3f; pointer-events: none; }
#touchUI .mb.face > img { width: 62%; height: 62%; border: 2px solid var(--fc, #fff); box-sizing: border-box; }
#touchUI .mb.face > svg { position: absolute; right: 3px; bottom: 3px; width: 34%; height: 34%; }
#touchUI.idle .act, #touchUI.inv .act { opacity: 0; pointer-events: none; }
#touchUI .mb[hidden] { display: none; }
#joyBase { width: calc(var(--jr) * 2); height: calc(var(--jr) * 2); margin: calc(var(--jr) * -1) 0 0 calc(var(--jr) * -1); background: radial-gradient(circle, rgba(0,0,0,.08) 30%, rgba(0,0,0,.26) 100%);
  border: 3px solid rgba(255,255,255,.42); box-shadow: 0 0 0 2px rgba(0,0,0,.4), inset 0 0 0 2px rgba(0,0,0,.3); box-sizing: border-box; opacity: .62; transition: opacity .15s, border-color .15s; }
#joyBase.live { opacity: 1; transition: opacity 0s, border-color .15s; }
#joyBase.spr { border-color: #ffd84a; }
#joyKnob { width: calc(var(--jr) * .9); height: calc(var(--jr) * .9); margin: calc(var(--jr) * -.45) 0 0 calc(var(--jr) * -.45); border: 2px solid rgba(0,0,0,.85); box-sizing: border-box; overflow: hidden; }
#joyKnob::before { content: ""; position: absolute; inset: 0; border-radius: 50%; background: url(${STONE}) 0 0 / 24px 24px; image-rendering: pixelated; opacity: .9;
  box-shadow: inset 3px 3px 0 rgba(255,255,255,.5), inset -3px -3px 0 rgba(0,0,0,.45); }
#joyBase .dir { position: absolute; width: 0; height: 0; border: 6px solid transparent; opacity: .55; }
#joyBase .dir.n { left: 50%; top: 5px; margin-left: -6px; border-bottom: 7px solid #fff; border-top: 0; }
#joyBase .dir.s { left: 50%; bottom: 5px; margin-left: -6px; border-top: 7px solid #fff; border-bottom: 0; }
#joyBase .dir.w { top: 50%; left: 5px; margin-top: -6px; border-right: 7px solid #fff; border-left: 0; }
#joyBase .dir.e { top: 50%; right: 5px; margin-top: -6px; border-left: 7px solid #fff; border-right: 0; }
#joySpr { position: absolute; left: 50%; top: -30px; width: 22px; height: 22px; margin-left: -11px; opacity: .45; transition: opacity .1s, transform .1s; }
#joySpr svg { width: 100%; height: 100%; display: block; filter: drop-shadow(1px 1px 0 rgba(0,0,0,.5)); }
#joySpr.ready { opacity: .9; transform: translateY(-3px); }
#joySpr.on { opacity: 1; transform: translateY(-5px); filter: sepia(1) saturate(6) hue-rotate(5deg) brightness(1.1) drop-shadow(0 0 4px rgba(255,216,74,.9)); }
#tHold { position: absolute; width: 46px; height: 46px; margin: -23px 0 0 -23px; border-radius: 50%; pointer-events: none; opacity: 0;
  background: conic-gradient(rgba(255,255,255,.9) calc(var(--p, 0) * 1turn), rgba(255,255,255,.18) 0);
  -webkit-mask: radial-gradient(circle, transparent 54%, #000 56%); mask: radial-gradient(circle, transparent 54%, #000 56%); }
#tHold.mine { animation: tHoldPulse .45s ease-in-out infinite alternate; }
@keyframes tHoldPulse { to { transform: scale(1.18); } }
html.touch #bottom { bottom: calc(6px + var(--ib, 0px)); }
html.touch #hotRow { display: flex; gap: 6px; align-items: stretch; }
html.touch #hotbar .slot { width: var(--hs, 44px); height: var(--hs, 44px); }
html.touch #hotbar .slot canvas { width: calc(var(--hs, 44px) * .74); height: calc(var(--hs, 44px) * .74); }
#hotMore { pointer-events: auto; position: relative; width: var(--hs, 44px); display: grid; place-items: center; background: rgba(0,0,0,.42); border: 2px solid #111; box-shadow: inset 0 0 0 2px #5e5e5e; padding: 2px; }
#hotMore svg { width: 52%; filter: drop-shadow(2px 2px 0 rgba(0,0,0,.5)); }
#hotMore.on { background: rgba(255,255,255,.25); }
html.touch #stats { width: var(--sw, 364px); height: var(--sh, 44px); }
html.touch #chat { top: calc(8px + var(--it, 0px)); left: calc(6px + var(--il, 0px)); max-width: min(46%, 360px); }
html.touch.lefty #chat { left: auto; right: calc(6px + var(--ir, 0px)); top: calc(var(--tb, 56px) + 6px); align-items: flex-end; }
html.touch #toast { top: calc(var(--tb, 56px) + 8px); right: auto; left: 50%; transform: translateX(-50%); width: min(250px, 36%); }
html.touch #toast.out { transform: translate(-50%, -150px); }
#tSetBtn { }
#tSet { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; width: min(600px, 100%); line-height: 1.2; }
#tSet[hidden] { display: none; }
#tSet h3 { grid-column: 1 / -1; margin: 0 0 2px; font: 20px var(--ui); font-weight: 400; text-align: center; text-shadow: 2px 2px 0 var(--mc-shadow); }
#tSet .mcbtn { font-size: 16px; padding: 8px 6px 10px; }
#tSet .full { grid-column: 1 / -1; }
.mcs { position: relative; height: 40px; background: #303030; border: 2px solid #000; box-shadow: inset 2px 2px 0 #1c1c1c, inset -2px -2px 0 #4c4c4c; pointer-events: auto; touch-action: none; }
.mcs i { position: absolute; top: 0; bottom: 0; width: 14px; margin-left: -7px; background: var(--btn); box-shadow: inset 2px 2px 0 var(--btn-hi), inset -2px -3px 0 var(--btn-lo); border: 2px solid #000; top: -2px; bottom: -2px; }
.mcs span { position: absolute; inset: 0; display: grid; place-items: center; font: 16px var(--ui); color: #fff; text-shadow: 2px 2px 0 var(--mc-shadow); pointer-events: none; }
`;
document.head.appendChild(css);

// ---- DOM: joystick extras, buttons, top bar, hold ring, hotbar "..." slot
const ui = touchUI;
joyBase.insertAdjacentHTML('afterbegin', '<b class="dir n"></b><b class="dir s"></b><b class="dir w"></b><b class="dir e"></b>');
const spr = document.createElement('div'); spr.id = 'joySpr'; spr.innerHTML = ICON.sprint; joyBase.appendChild(spr);
joyBase.classList.add('act');            // hidden with the action buttons outside play
const holdRing = document.createElement('div'); holdRing.id = 'tHold'; ui.appendChild(holdRing);
function mkBtn(id, label, icon, cls) {
  const b = document.createElement('button'); b.type = 'button'; b.id = id; b.className = 'mb ' + (cls || ''); b.setAttribute('aria-label', label); b.innerHTML = icon;
  ui.appendChild(b); return b;
}
// action cluster (fx/fy: centre offset from the bottom-right corner, in px at size 1; mirrored when left-handed)
const ACT = [
  { id: 'tJump', label: 'Jump', icon: ICON.jump, size: 72, fx: 50, fy: 50, big: true },
  { id: 'tAttack', label: 'Attack / break (hold)', icon: ICON.attack, size: 76, fx: 132, fy: 96, big: true },
  { id: 'tUse', label: 'Use / place', icon: ICON.use, size: 64, fx: 50, fy: 142 },
  { id: 'tBlock', label: 'Block (hold)', icon: ICON.block, size: 58, fx: 138, fy: 184 },
  { id: 'tSneak', label: 'Sneak', icon: ICON.sneak, size: 56, fx: 50, fy: 222 },
  { id: 'tEat', label: 'Eat', icon: ICON.eat, size: 58, fx: 214, fy: 150 },
];
const B = {};
for (const a of ACT) { B[a.id] = mkBtn(a.id, a.label, a.icon, 'act' + (a.big ? ' big' : '')); }
B.tEat.hidden = true;
// top bar, right to left
const TOP = [
  { id: 'tPause', label: 'Pause', icon: ICON.pause },
  { id: 'tSwitch', label: 'Switch character', icon: '<img alt="">' + ICON.swap, cls: 'face' },
  { id: 'tInv', label: 'Inventory', icon: ICON.inv },
  { id: 'tView', label: 'Change camera view', icon: ICON.view },
  { id: 'tFull', label: 'Full screen', icon: ICON.full },
];
for (const t of TOP) B[t.id] = mkBtn(t.id, t.label, t.icon, 'top ' + (t.cls || ''));

// hotbar row with a "..." slot that opens the inventory
const bottomEl = document.getElementById('bottom'), hotRow = document.createElement('div'); hotRow.id = 'hotRow';
bottomEl.insertBefore(hotRow, hotbarEl); hotRow.appendChild(hotbarEl);
const hotMore = document.createElement('div'); hotMore.id = 'hotMore'; hotMore.setAttribute('role', 'button'); hotMore.setAttribute('aria-label', 'Open inventory');
hotMore.innerHTML = ICON.more; hotRow.appendChild(hotMore);

// ---- actions
const lookBy = (dx, dy) => { const k = .0065 * SET.sens, P = PL(); P.yaw -= dx * k; P.pitch = clamp(P.pitch - dy * k, -1.55, 1.55); };
function openInv() { if (hasInv() && Inv.toggle) { Inv.toggle(); SFX.uiClick(); } else chat('The inventory is not available yet'); }
let atkHeld = false, useHeld = null, blocking = false, localBlock = false;
const anyLookMining = () => [...lookTouches.values()].some(o => o.mining);
function attackDown() { atkHeld = true; mining = true; mineCd = 0; PL().swing = 1; swingT = 1; }
function attackUp() { atkHeld = false; if (!anyLookMining()) mining = false; }
function setBlocking(v) {
  if (blocking === v) return; blocking = v;
  if (hasCombat() && Combat.setBlocking) Combat.setBlocking(v); else localBlock = v;
}
function eat() { if (hasCombat() && Combat.eat) Combat.eat(); else useItem(); }
// stand-in for the combat module: blocking takes most of the hit
on('damage', n => localBlock && !hasCombat() ? Math.floor(n * .35) : n);

function press(b, down, up, look) {
  b.addEventListener('pointerdown', e => {
    e.preventDefault(); e.stopPropagation();
    if (b._pid != null) return; b._pid = e.pointerId;
    try { b.setPointerCapture(e.pointerId); } catch (err) { /* synthetic or already released */ }
    const q = tpt(e); b._lx = q.x; b._ly = q.y; b.classList.add('on'); if (down) down(e);
  });
  const end = e => { if (e.pointerId !== b._pid) return; e.stopPropagation(); b._pid = null; b.classList.remove('on'); if (up) up(e); };
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(ev, end);
  if (look) b.addEventListener('pointermove', e => {      // slide the thumb on attack/use to aim, like the mobile edition
    if (e.pointerId !== b._pid || state !== 'play') return; const q = tpt(e); lookBy(q.x - b._lx, q.y - b._ly); b._lx = q.x; b._ly = q.y; });
  b.addEventListener('contextmenu', e => e.preventDefault());
}
const inPlay = fn => e => { if (state === 'play') fn(e); };
press(B.tJump, inPlay(() => { touchJump = true; }), () => { touchJump = false; });
press(B.tSneak, inPlay(() => { touchSneak = !touchSneak; B.tSneak.classList.toggle('tog', touchSneak); vib(8); }));
press(B.tAttack, inPlay(attackDown), attackUp, true);
press(B.tUse, inPlay(() => { useItem(); useHeld = { next: performance.now() + 360 }; }), () => { useHeld = null; }, true);
press(B.tBlock, inPlay(() => setBlocking(true)), () => setBlocking(false));
press(B.tEat, inPlay(eat));
press(B.tPause, inPlay(() => { releaseAll(); showPause(); }));
press(B.tSwitch, () => { if (state === 'play') { releaseAll(); openWheel(true); } else if (state === 'wheel') closeWheel(false); });
press(B.tInv, () => { if (state === 'play' || invOpen()) { releaseAll(); openInv(); } });
press(B.tView, inPlay(() => { viewMode = (viewMode + 1) % 3; }));
press(B.tFull, () => goFull());
hotMore.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); if (state === 'play' || invOpen()) { hotMore.classList.add('on'); openInv(); setTimeout(() => hotMore.classList.remove('on'), 150); } });
slotDivs.forEach(d => d.addEventListener('pointerdown', () => vib(5)));

function releaseAll() {
  touchJump = false; if (atkHeld) attackUp(); useHeld = null; setBlocking(false);
  for (const b of Object.values(B)) { b._pid = null; b.classList.remove('on'); }
  if (TJ.id !== null) { TJ.id = null; TJ.x = TJ.y = 0; joyBase.classList.remove('live', 'spr'); joyHome(); }
  for (const t of lookTouches.values()) t.mining = false; lookTouches.clear(); mining = false; holdRing.style.opacity = 0;
}

// ---- layout (game coordinates: on an upright phone the page is turned, see vw/vh/tpt in the main script)
const probe = document.createElement('div');
probe.style.cssText = 'position:fixed;left:0;top:0;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)';
document.body.appendChild(probe);
function insets() {
  const cs = getComputedStyle(probe), t = parseFloat(cs.paddingTop) || 0, r = parseFloat(cs.paddingRight) || 0, b = parseFloat(cs.paddingBottom) || 0, l = parseFloat(cs.paddingLeft) || 0;
  return isRot() ? { l: t, r: b, t: r, b: l } : { l, r, t, b };     // the body is turned 90deg clockwise
}
let L = { jx: 100, jy: 200, jr: 60, s: 1 };
const place = (el, cx, cy, w, h = w) => { el.style.left = Math.round(cx - w / 2) + 'px'; el.style.top = Math.round(cy - h / 2) + 'px'; el.style.width = Math.round(w) + 'px'; el.style.height = Math.round(h) + 'px'; };
function hudRects() {
  // the hotbar, hearts and anything else in #bottom (layout offsets ignore the CSS rotation, so they are game coordinates)
  const out = []; if (hudEl.hidden) return out;
  const bx = bottomEl.offsetLeft - bottomEl.offsetWidth / 2, by = bottomEl.offsetTop;
  for (const c of bottomEl.children) { if (c.id === 'itemName' || !c.offsetWidth) continue;
    out.push({ x: bx + c.offsetLeft, y: by + c.offsetTop, w: c.offsetWidth, h: c.offsetHeight }); }
  return out;
}
const hits = (a, b, pad) => a.x < b.x + b.w + pad && a.x + a.w + pad > b.x && a.y < b.y + b.h + pad && a.y + a.h + pad > b.y;
function layout() {
  const W = vw(), H = vh(), I = insets(), m = 10, s = clamp(SET.size, .7, 1.4) * clamp(H / 380, .8, 1.15);
  root.classList.toggle('lefty', !!SET.left);
  root.style.setProperty('--ib', I.b + 'px'); root.style.setProperty('--it', I.t + 'px'); root.style.setProperty('--il', I.l + 'px'); root.style.setProperty('--ir', I.r + 'px');
  ui.style.setProperty('--bop', SET.opacity);
  // hotbar: as big as fits between the jump button and the joystick column
  const side = Math.max(I.l, I.r) + m + 92 * s, hs = clamp(Math.floor((W - 2 * side - 24) / 10), 32, 52);
  root.style.setProperty('--hs', hs + 'px');
  const big = hs >= 42 && W >= 600; root.style.setProperty('--sw', big ? '364px' : '273px'); root.style.setProperty('--sh', big ? '44px' : '33px');
  // top bar
  const tb = Math.round(clamp(52 * s, 46, 58)), ty = I.t + 8 + tb / 2;
  root.style.setProperty('--tb', (I.t + 8 + tb) + 'px');
  TOP.forEach((t, i) => place(B[t.id], W - I.r - m - tb / 2 - i * (tb + 6), ty, tb));
  const topBottom = I.t + 8 + tb + 6;
  // action cluster around the right thumb (left thumb when left-handed), kept clear of the HUD
  const avoid = hudRects(), hudN = avoid.length, mx = x => SET.left ? x : W - x;
  for (const a of ACT) {
    const sz = Math.round(a.size * s), cx = mx(I[SET.left ? 'l' : 'r'] + m + a.fx * s); let cy = H - I.b - m - a.fy * s;
    for (let k = 0; k < 6; k++) { const r = { x: cx - sz / 2, y: cy - sz / 2, w: sz, h: sz }, o = avoid.find(v => hits(r, v, 4)); if (!o) break; cy = o.y - 6 - sz / 2; }
    cy = Math.max(cy, topBottom + sz / 2);
    place(B[a.id], cx, cy, sz); a.cx = cx; a.cy = cy; a.sz = sz;
    avoid.push({ x: cx - sz / 2, y: cy - sz / 2, w: sz, h: sz });       // later buttons keep clear of this one
  }
  // joystick resting ring on the other side
  const jr = Math.round(62 * s), jx = SET.left ? W - I.r - m - 26 * s - jr : I.l + m + 26 * s + jr; let jy = H - I.b - m - 34 * s - jr;
  for (let k = 0; k < 4; k++) { const r = { x: jx - jr * .8, y: jy - jr * .8, w: jr * 1.6, h: jr * 1.6 }, o = avoid.slice(0, hudN).find(v => hits(r, v, 2)); if (!o) break; jy = o.y - 4 - jr * .8; }
  ui.style.setProperty('--jr', jr + 'px');
  L = { jx, jy, jr, s, W, H };
}
// resting position of the joystick (called by the main script on start and resize)
joyHome = function () { layout(); joyBase.style.left = L.jx + 'px'; joyBase.style.top = L.jy + 'px'; joyKnob.style.transform = ''; };

// ---- canvas touches: joystick on the movement side, look / tap to place / hold to break everywhere else
const travel = () => L.jr * .78;
touchDown = function (e) {
  e.preventDefault();
  if (state !== 'play' || invOpen()) return;
  try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* capture is best-effort */ }
  const q = tpt(e), W = vw(), H = vh();
  const zone = (SET.left ? q.x > W * .55 : q.x < W * .45) && q.y > H * .28;
  if (TJ.id === null && zone) {
    const r = L.jr; TJ.id = e.pointerId; TJ.ox = clamp(q.x, r + 4, W - r - 4); TJ.oy = clamp(q.y, r + 4, H - r - 4); TJ.x = TJ.y = 0;
    joyBase.style.left = TJ.ox + 'px'; joyBase.style.top = TJ.oy + 'px'; joyBase.classList.add('live'); touchMove(e); return;
  }
  lookTouches.set(e.pointerId, { lx: q.x, ly: q.y, x0: q.x, y0: q.y, t0: performance.now(), moved: 0, mining: false });
};
touchMove = function (e) {
  const q = tpt(e);
  if (e.pointerId === TJ.id) {
    const T = travel(); let dx = q.x - TJ.ox, dy = q.y - TJ.oy, l = Math.hypot(dx, dy);
    if (l > T * 1.7) { const k = (l - T * 1.7) / l; TJ.ox += dx * k; TJ.oy += dy * k; dx = q.x - TJ.ox; dy = q.y - TJ.oy; l = Math.hypot(dx, dy);    // the ring follows a runaway thumb
      joyBase.style.left = TJ.ox + 'px'; joyBase.style.top = TJ.oy + 'px'; }
    if (l > T) { dx *= T / l; dy *= T / l; }
    TJ.x = dx / T; TJ.y = dy / T; joyKnob.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`; return;
  }
  const t = lookTouches.get(e.pointerId); if (!t || state !== 'play') return;
  const dx = q.x - t.lx, dy = q.y - t.ly; t.lx = q.x; t.ly = q.y; t.moved += Math.abs(dx) + Math.abs(dy);
  lookBy(dx, dy);
};
touchUp = function (e, cancel) {
  if (e.pointerId === TJ.id) { TJ.id = null; TJ.x = TJ.y = 0; joyBase.classList.remove('live', 'spr'); joyHome(); return; }
  const t = lookTouches.get(e.pointerId); if (!t) return;
  lookTouches.delete(e.pointerId);
  if (!cancel && state === 'play' && !t.mining && t.moved < 14 && performance.now() - t.t0 < 300) useItem();
  if (t.mining && !anyLookMining() && !atkHeld) mining = false;
};

// ---- per-frame touch logic and HUD state
const HOLD_MS = 320;
let lastUi = '', faceFor = -1, eatOn = false;
function heldFood() {
  if (!hasInv() || typeof ITEMS === 'undefined') return false;
  try { const h = Inv.held(); return !!(h && ITEMS[h.id] && ITEMS[h.id].kind === 'food'); } catch (err) { return false; }
}
touchTick = function () {
  const now = performance.now();
  if (state !== 'play' || invOpen()) {
    if (touchJump || atkHeld || useHeld || blocking || TJ.id !== null || lookTouches.size) releaseAll();
  } else {
    // a finger held still on the world starts breaking blocks; show a filling ring while it waits
    let ring = null;
    for (const t of lookTouches.values()) {
      if (!t.mining && t.moved < 14 && now - t.t0 > HOLD_MS) { t.mining = true; mining = true; mineCd = 0; }
      if (!ring && t.moved < 14) ring = t;
    }
    if (ring && now - ring.t0 > 90) {
      holdRing.style.left = ring.x0 + 'px'; holdRing.style.top = ring.y0 + 'px'; holdRing.style.opacity = 1;
      holdRing.style.setProperty('--p', Math.min(1, (now - ring.t0) / HOLD_MS).toFixed(3)); holdRing.classList.toggle('mine', ring.mining);
    } else if (holdRing.style.opacity !== '0') { holdRing.style.opacity = 0; holdRing.classList.remove('mine'); }
    if (useHeld && now >= useHeld.next) { useItem(); useHeld.next = now + 260; }
    // sprint feedback on the joystick
    const m = Math.hypot(TJ.x, TJ.y), ready = TJ.id !== null && m > .8 && -TJ.y > .6, on = PL().sprint && TJ.id !== null;
    spr.classList.toggle('ready', ready && !on); spr.classList.toggle('on', on); joyBase.classList.toggle('spr', on);
  }
  const uiState = (state === 'play' ? 'play' : 'idle') + (invOpen() ? ' inv' : '');
  if (uiState !== lastUi) { lastUi = uiState; ui.classList.toggle('idle', state !== 'play'); ui.classList.toggle('inv', invOpen()); }
  if (cur !== faceFor) { faceFor = cur; const img = B.tSwitch.querySelector('img'); img.src = portrait(DEFS[cur]); B.tSwitch.style.setProperty('--fc', DEFS[cur].color); }
  const food = state === 'play' && heldFood(); if (food !== eatOn) { eatOn = food; B.tEat.hidden = !food; }
};

// ---- haptics: block breaks, hits on creatures, taking damage
const _breakBlock = breakBlock;
breakBlock = function (h) { const r = _breakBlock.apply(this, arguments); if (h && get(h.x, h.y, h.z) !== h.t) vib(12); return r; };
let lastHp = null, lastCur = -1;
on('frame', () => {
  for (const e of ENTITIES) { if (typeof e.hp !== 'number') continue; if (e._touchHp !== undefined && e.hp < e._touchHp) vib(28); e._touchHp = e.hp; }
  const hp = DEFS[cur].hp; if (cur === lastCur && lastHp !== null && hp < lastHp) vib([40, 30, 40]); lastHp = hp; lastCur = cur;
});

// ---- adaptive resolution and quality: drop the pixel ratio when fps stays under 40, raise it again when stable
const PR_MAX = Math.min(devicePixelRatio || 1, 1.5);
const LEVELS = [{ pr: PR_MAX, fog: 1, parts: 16 }];
for (const pr of [1.25, 1, .8, .65]) if (pr < PR_MAX - .01) LEVELS.push({ pr, fog: 1, parts: 16 });
LEVELS.push({ pr: LEVELS[LEVELS.length - 1].pr, fog: .74, parts: 6 }, { pr: LEVELS[LEVELS.length - 1].pr, fog: .58, parts: 4 });
for (let i = 2; i < LEVELS.length - 2; i++) LEVELS[i].parts = 10;                         // fewer particles once the resolution is down
const Q = { lvl: 0, acc: 0, n: 0, low: 0, high: 0, lastUp: -1e9, noUpUntil: 0, fps: 60 };
function setQuality(l) {
  l = clamp(l, 0, LEVELS.length - 1); if (l === Q.lvl) return;
  const now = performance.now();
  if (l < Q.lvl) Q.lastUp = now; else if (now - Q.lastUp < 10000) Q.noUpUntil = now + 60000;  // a raise that did not hold: stay down for a while
  Q.lvl = l; renderer.setPixelRatio(LEVELS[l].pr); resize();
}
const _burst = burst;
burst = function () {
  const n0 = particles.length; _burst.apply(this, arguments);
  const keep = LEVELS[Q.lvl].parts; if (keep >= 16) return;
  for (const q of particles.splice(n0 + keep)) { scene.remove(q.m); q.m.material.dispose(); }
};
on('tick', raw => {
  if (state === 'play' && SET.autoRes && !document.hidden) {
    Q.acc += raw; Q.n++;
    if (Q.acc >= 1) {
      Q.fps = Q.n / Q.acc; Q.acc = Q.n = 0;
      if (Q.fps < 40) { Q.low++; Q.high = 0; } else if (Q.fps > 55) { Q.high++; Q.low = 0; } else Q.low = Q.high = 0;
      if (Q.low >= 3) { Q.low = 0; setQuality(Q.lvl + 1); }
      else if (Q.high >= 8 && performance.now() > Q.noUpUntil) { Q.high = 0; setQuality(Q.lvl - 1); }
    }
  } else { Q.acc = Q.n = 0; if (!SET.autoRes && Q.lvl) setQuality(0); }
  // shorter fog and view distance on slow phones (fewer chunks drawn); the sky dome and sun shrink to stay inside it
  const k = LEVELS[Q.lvl].fog;
  if (k < 1) {
    scene.fog.near *= k; scene.fog.far *= k; camera.far = scene.fog.far + 12; camera.updateProjectionMatrix();
    const r = camera.far * .9; sky.scale.setScalar(r / 900); sunMesh.position.copy(camera.position).addScaledVector(SUN_DIR, r * .8); sunMesh.scale.setScalar(r * .8 / 600);
    clouds.visible = false;
  } else if (camera.far !== 1500) { camera.far = 1500; camera.updateProjectionMatrix(); sky.scale.setScalar(1); sunMesh.scale.setScalar(1); clouds.visible = true; }
  const cap = LEVELS[Q.lvl].parts * 8; if (particles.length > cap && cap < 128) for (const q of particles.splice(0, particles.length - cap)) { scene.remove(q.m); q.m.material.dispose(); }
});

// ---- touch settings in the pause menu
const pauseMenu = pauseEl.querySelector('.menu'), pauseH2 = pauseEl.querySelector('h2');
const setBtn = document.createElement('button'); setBtn.className = 'mcbtn'; setBtn.id = 'tSetBtn'; setBtn.type = 'button'; setBtn.textContent = 'Touch Controls...';
pauseMenu.insertBefore(setBtn, document.getElementById('ctrlBtn2'));
const panel = document.createElement('div'); panel.className = 'panel'; panel.id = 'tSet'; panel.hidden = true;
panel.innerHTML = '<h3>Touch Controls</h3>';
pauseEl.appendChild(panel);
function slider(label, key, min, max, fmt) {
  const el = document.createElement('div'); el.className = 'mcs'; el.setAttribute('role', 'slider'); el.setAttribute('aria-label', label);
  el.innerHTML = '<i></i><span></span>'; panel.appendChild(el);
  const draw = () => { const f = (SET[key] - min) / (max - min); el.firstChild.style.left = `calc(7px + ${(f * 100).toFixed(1)}% - ${(f * 14).toFixed(1)}px)`; el.lastChild.textContent = `${label}: ${fmt(SET[key])}`;
    el.setAttribute('aria-valuenow', SET[key]); };
  const set = e => {
    const r = el.getBoundingClientRect(), q = tpt(e), left = isRot() ? r.top : r.left, w = isRot() ? r.height : r.width;
    const f = clamp((q.x - left - 7) / (w - 14), 0, 1); SET[key] = +(min + f * (max - min)).toFixed(2); draw(); applySet(false);
  };
  el.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); el._d = true; try { el.setPointerCapture(e.pointerId); } catch (err) { /* best-effort */ } set(e); });
  el.addEventListener('pointermove', e => { if (el._d) set(e); });
  for (const ev of ['pointerup', 'pointercancel']) el.addEventListener(ev, () => { if (el._d) { el._d = false; saveSet(); SFX.uiClick(); } });
  draw(); return draw;
}
function toggle(label, key, onTxt = 'ON', offTxt = 'OFF') {
  const b = document.createElement('button'); b.type = 'button'; b.className = 'mcbtn';
  const draw = () => { b.textContent = `${label}: ${SET[key] ? onTxt : offTxt}`; };
  b.addEventListener('click', () => { SET[key] = !SET[key]; draw(); SFX.uiClick(); saveSet(); applySet(true); if (key === 'haptics') vib(30); });
  panel.appendChild(b); draw(); return draw;
}
const pct = v => Math.round(v * 100) + '%';
const redraw = [
  slider('Look Sensitivity', 'sens', .3, 2.5, pct), toggle('Hand', 'left', 'Left', 'Right'),
  slider('Button Size', 'size', .75, 1.3, pct), toggle('Vibration', 'haptics'),
  slider('Button Opacity', 'opacity', .25, 1, pct), toggle('Auto Quality', 'autoRes'),
];
const resetB = document.createElement('button'); resetB.type = 'button'; resetB.className = 'mcbtn'; resetB.textContent = 'Reset to Defaults';
const doneB = document.createElement('button'); doneB.type = 'button'; doneB.className = 'mcbtn'; doneB.textContent = 'Done';
panel.append(resetB, doneB);
resetB.addEventListener('click', () => { Object.assign(SET, DEF_SET); saveSet(); redraw.forEach(f => f()); applySet(true); SFX.uiClick(); });
const showSet = v => { panel.hidden = !v; pauseMenu.hidden = v; pauseH2.hidden = v; if (v) ctrlPanel2.hidden = true; };
setBtn.addEventListener('click', () => { SFX.uiClick(); showSet(true); });
doneB.addEventListener('click', () => { SFX.uiClick(); showSet(false); });
document.getElementById('resumeBtn').addEventListener('click', () => showSet(false));
function applySet() { if (TJ.id === null) joyHome(); else layout(); }

// ---- misc: help text, toast, no zoom / long-press menus
const help = '<b>Touch:</b> left stick moves (push to the edge to sprint) · drag anywhere to look · tap the world to place, hold it to break · ' +
  'right buttons: jump, attack (hold to keep mining), use, block, sneak · tap a hotbar slot, "..." opens the inventory · Touch Controls in the pause menu';
for (const p of [ctrlPanel, ctrlPanel2]) for (const el of p.querySelectorAll('p')) if (el.textContent.startsWith('Touch:') || el.textContent.startsWith(I18N.L('Touch:'))) el.innerHTML = help;
on('start', () => { const sp = toastEl.querySelector('span'); if (sp) sp.textContent = 'Tap your face at the top right'; joyHome(); });
for (const ev of ['gesturestart', 'gesturechange', 'dblclick']) document.addEventListener(ev, e => e.preventDefault(), { passive: false });
document.addEventListener('contextmenu', e => e.preventDefault());
if (document.fonts) document.fonts.ready.then(() => { if (!hudEl.hidden && TJ.id === null) joyHome(); });

window.Mobile = { settings: SET, layout: joyHome, quality: () => ({ level: Q.lvl, pixelRatio: LEVELS[Q.lvl].pr, fog: LEVELS[Q.lvl].fog, fps: Math.round(Q.fps) }), setQuality, vibrate: vib };
})();
