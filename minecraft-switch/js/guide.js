"use strict";
// =====================================================================
//  Tutorial guide: shows the player exactly what to do for the current quest step, simple enough for a small child.
//  - World: things to pick up / hit / hunt get a yellow outline and a bouncing arrow; a pointer at the screen edge
//    shows where to walk when the target is off screen.
//  - Building: a yellow blueprint (camp) shows each block to place: the workbench, the walls, the roof, the fire, the bed.
//  - UI: the button / hotbar slot / recipe / build piece to press next glows yellow, with a short hint line at the top.
//  Reads Meadows.step (valheim.js) and the Inv / Build APIs; changes nothing in the game rules.
// =====================================================================
(() => {
if (typeof Meadows === 'undefined' || typeof THREE === 'undefined') return;
const AR = () => typeof I18N !== 'undefined' && I18N.lang === 'ar';
const T = (en, ar) => AR() ? ar : en;
const Y = 0xffd400;
const hasInv = () => typeof Inv !== 'undefined' && !!Inv.count;
const cnt = id => { try { return hasInv() ? Inv.count(id) : 0; } catch (e) { return 0; } };
const heldId = () => { try { const s = hasInv() && Inv.held ? Inv.held() : null; return s ? s.id : null; } catch (e) { return null; } };
const B = () => (typeof Build !== 'undefined' && Build.PIECE ? Build : null);
const $ = id => document.getElementById(id);

// ---------------------------------------------------------------------
//  Styles and DOM
// ---------------------------------------------------------------------
const css = document.createElement('style');
css.textContent = `
.gdHL { outline: 3px solid #ffd400 !important; outline-offset: 1px; box-shadow: 0 0 0 2px #000, 0 0 16px 5px rgba(255,212,0,.9) !important; animation: gdPulse .8s ease-in-out infinite alternate; z-index: 6; }
.gdIn { box-shadow: inset 0 0 0 2px #ffd400, inset 0 0 8px 2px rgba(255,212,0,.8) !important; background-color: rgba(255,212,0,.28) !important; animation: gdPulse .8s ease-in-out infinite alternate; }
@keyframes gdPulse { from { filter: brightness(1); } to { filter: brightness(1.45); } }
.gdArrow { position: absolute; left: 50%; bottom: calc(100% + 6px); width: 0; height: 0; border: 11px solid transparent; border-top: 15px solid #ffd400; border-bottom: 0;
  transform: translateX(-50%); filter: drop-shadow(0 0 2px #000) drop-shadow(0 0 1px #000); pointer-events: none; animation: gdBob .55s ease-in-out infinite alternate; z-index: 7; }
.gdArrow.up { bottom: auto; top: calc(100% + 6px); border-top: 0; border-bottom: 15px solid #ffd400; animation-name: gdBobU; }
@keyframes gdBob { from { margin-bottom: 0; } to { margin-bottom: 9px; } }
@keyframes gdBobU { from { margin-top: 0; } to { margin-top: 9px; } }
#gdHint { position: fixed; left: 50%; top: calc(10px + env(safe-area-inset-top, 0px)); transform: translateX(-50%); z-index: 60; max-width: min(80vw, 560px);
  background: rgba(0,0,0,.66); border: 2px solid #ffd400; color: #ffe866; padding: 4px 12px 6px; font: 17px var(--ui, monospace); line-height: 1.3;
  text-align: center; text-shadow: 2px 2px 0 #3a2a00; pointer-events: none; box-shadow: 0 0 12px rgba(255,212,0,.45); }
#gdHint[hidden], #cbDeath:not([hidden]) ~ #gdHint, #cbDeath:not([hidden]) ~ #gdEdge { display: none; }
html.touch #gdHint { font-size: 14px; max-width: 52%; top: auto; bottom: calc(106px + env(safe-area-inset-bottom, 0px)); }
#gdEdge { position: fixed; z-index: 55; width: 0; height: 0; pointer-events: none; }
#gdEdge i { position: absolute; left: -14px; top: -14px; width: 28px; height: 28px; background: #ffd400; clip-path: polygon(50% 0, 100% 100%, 50% 74%, 0 100%);
  filter: drop-shadow(0 0 3px #000); animation: gdPulse .6s ease-in-out infinite alternate; }
#gdEdge b { position: absolute; left: -40px; width: 80px; top: 18px; text-align: center; color: #ffe866; font: 14px var(--ui, monospace); text-shadow: 2px 2px 0 #000; }
#gdEdge[hidden] { display: none; }
`;
document.head.appendChild(css);
const hintEl = document.createElement('div'); hintEl.id = 'gdHint'; hintEl.hidden = true; document.body.appendChild(hintEl);
const edgeEl = document.createElement('div'); edgeEl.id = 'gdEdge'; edgeEl.hidden = true; edgeEl.innerHTML = '<i></i><b></b>'; document.body.appendChild(edgeEl);
const edgeI = edgeEl.querySelector('i'), edgeB = edgeEl.querySelector('b');
let hintTxt = '';
function setHint(t) {
  if (t === hintTxt) return; hintTxt = t; hintEl.hidden = !t; if (!t) return;
  const fresh = hintEl._shape !== t.replace(/\d+/g, '#'); hintEl._shape = t.replace(/\d+/g, '#');
  if (typeof I18N !== 'undefined' && I18N.words) I18N.words(hintEl, t, { instant: !fresh, cps: 80 }); else hintEl.textContent = t;
}

// UI highlights: kind 'out' (HUD button, gets a bouncing arrow), 'up' (arrow below, for the top bar), 'in' (inside a panel)
let uiOn = [];
function setUI(list) {
  list = list.filter(o => o && o.el);
  for (const o of uiOn) if (!list.some(n => n.el === o.el)) { o.el.classList.remove('gdHL', 'gdIn'); const a = o.el.querySelector(':scope > .gdArrow'); if (a) a.remove(); }
  for (const o of list) {
    const e = o.el;
    if (o.kind === 'in') { if (!e.classList.contains('gdIn')) { e.classList.add('gdIn'); if (!e._gdScrolled) { e._gdScrolled = true; try { e.scrollIntoView({ block: 'nearest' }); } catch (err) { /* old browser */ } } } continue; }
    if (!e.classList.contains('gdHL')) { if (getComputedStyle(e).position === 'static') e.style.position = 'relative'; e.classList.add('gdHL'); }
    if (!e.querySelector(':scope > .gdArrow')) { const a = document.createElement('i'); a.className = 'gdArrow' + (o.kind === 'up' ? ' up' : ''); e.appendChild(a); }
  }
  uiOn = list;
}
const out = el => ({ el, kind: 'out' }), up = el => ({ el, kind: 'up' }), inn = el => ({ el, kind: 'in' });

// ---------------------------------------------------------------------
//  World highlights (yellow outlined boxes) and the bouncing arrow
// ---------------------------------------------------------------------
const box1 = new THREE.BoxGeometry(1, 1, 1), edges = new THREE.EdgesGeometry(box1);
const pool = [];
function mkHL() {
  const g = new THREE.Group();
  const fill = new THREE.Mesh(box1, new THREE.MeshBasicMaterial({ color: Y, transparent: true, opacity: .2, depthWrite: false }));
  fill.renderOrder = 28; g.add(fill);
  const lines = [];
  for (const s of [1, 1.025, 1.05]) { const l = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: Y, transparent: true, depthTest: false })); l.scale.setScalar(s); l.renderOrder = 30; g.add(l); lines.push(l); }
  g.visible = false; scene.add(g); return { g, fill, lines };
}
const arrowTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 16; const g = c.getContext('2d');
  const rows = ['....kkkkkk....', '....kYYYYk....', '....kYYYYk....', '....kYYYYk....', '....kYYYYk....', 'kkkkkYYYYkkkkk', '.kYYYYYYYYYYk.', '..kYYYYYYYYk..', '...kYYYYYYk...', '....kYYYYk....', '.....kYYk.....', '......kk......'];
  rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) { if (r[x] === '.') continue; g.fillStyle = r[x] === 'k' ? '#1a1200' : '#ffd400'; g.fillRect(x + 1, y + 2, 1, 1); } });
  const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; return t;
})();
const arrow = new THREE.Sprite(new THREE.SpriteMaterial({ map: arrowTex, depthTest: false, transparent: true }));
arrow.scale.set(1.1, 1.1, 1); arrow.renderOrder = 31; arrow.visible = false; scene.add(arrow);

// a target: { x, y, z } (centre), sx/sy/sz size, solid: false = seen through walls, main: gets the arrow
let targets = [], mainT = null;
function drawTargets(t) {
  const k = .55 + .45 * Math.sin(t * 6);
  for (let i = 0; i < Math.max(pool.length, targets.length); i++) {
    const o = targets[i]; if (!pool[i]) pool.push(mkHL()); const h = pool[i];
    if (!o) { h.g.visible = false; continue; }
    h.g.visible = true; h.g.position.set(o.x, o.y, o.z); h.g.scale.set(o.sx || 1, o.sy || 1, o.sz || 1);
    const dim = o.dim ? .35 : 1;
    h.fill.material.opacity = (o.ghost ? .16 + .14 * k : .1 + .12 * k) * dim; h.fill.material.depthTest = !!o.ghost;
    for (const l of h.lines) { l.material.opacity = (.55 + .45 * k) * dim; l.material.depthTest = !!o.ghost && !o.see; l.material.color.setHex(o.ok ? 0x5cff5c : Y); }
    h.fill.material.color.setHex(o.ok ? 0x5cff5c : Y);
  }
  arrow.visible = !!mainT && Math.hypot(mainT.x - camera.position.x, mainT.z - camera.position.z) > 2.5;
  if (mainT) arrow.position.set(mainT.x, mainT.y + (mainT.sy || 1) / 2 + .9 + Math.abs(Math.sin(t * 4)) * .45, mainT.z);
}

// pointer at the screen edge when the main target is not on screen
const V = new THREE.Vector3();
function drawEdge() {
  const P = PL();
  if (!mainT || state !== 'play') { edgeEl.hidden = true; return; }
  const d = Math.hypot(mainT.x - P.pos.x, mainT.z - P.pos.z);
  V.set(mainT.x, mainT.y, mainT.z).project(camera);
  const behind = V.z > 1, on = !behind && Math.abs(V.x) < .85 && Math.abs(V.y) < .8;
  if (on) { edgeEl.hidden = true; return; }
  let x = V.x, y = V.y; if (behind) { x = -x; y = -y; }
  if (Math.abs(x) < 1e-3 && Math.abs(y) < 1e-3) y = -1;
  const m = Math.max(Math.abs(x) / .86, Math.abs(y) / .78); x /= m; y /= m; y = Math.max(-.35, Math.min(.55, y));   // keep clear of the hotbar and top bar
  const W = typeof vw === 'function' ? vw() : innerWidth, H = typeof vh === 'function' ? vh() : innerHeight;
  edgeEl.style.left = ((x + 1) / 2 * W) + 'px'; edgeEl.style.top = ((1 - y) / 2 * H) + 'px';
  edgeI.style.transform = `rotate(${Math.atan2(x, y)}rad)`;
  edgeB.textContent = Math.round(d) + (AR() ? ' م' : ' m'); edgeEl.hidden = false;
}

// ---------------------------------------------------------------------
//  Finding things in the world
// ---------------------------------------------------------------------
const P0 = () => PL().pos;
const dist = (o, p = P0()) => Math.hypot(o.x - p.x, o.z - p.z);
function picks(item, n = 3, r = 70) {
  const p = P0(); return (Meadows.PICKS || []).filter(k => k.item === item && Math.hypot(k.x - p.x, k.z - p.z) < r)
    .sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z)).slice(0, n)
    .map(k => ({ x: k.m.position.x, y: k.m.position.y, z: k.m.position.z, sx: .7, sy: .5, sz: .7 }));
}
const LOGS = BLOCK.map((b, i) => (b && (i === LOG || /(^| )log$/i.test(b.name || '')) ? i : -1)).filter(i => i >= 0);
let trunkC = null, trunkT = 0;
function trunk() {                                  // the nearest tree: a log standing on the ground
  if (trunkT > 0 && trunkC && LOGS.includes(get(trunkC.bx, trunkC.by, trunkC.bz))) return trunkC;
  trunkT = 1; trunkC = null;
  const p = P0(), bx = Math.floor(p.x), by = Math.floor(p.y), bz = Math.floor(p.z); let best = 1e9;
  for (let dz = -18; dz <= 18; dz++) for (let dx = -18; dx <= 18; dx++) {
    const d = dx * dx + dz * dz; if (d >= best) continue;
    for (let dy = -4; dy <= 4; dy++) { const x = bx + dx, y = by + dy, z = bz + dz;
      if (LOGS.includes(get(x, y, z)) && !LOGS.includes(get(x, y - 1, z)) && BLOCK[get(x, y - 1, z)].solid) { best = d; trunkC = { bx: x, by: y, bz: z, x: x + .5, y: y + 1, z: z + .5, sx: 1.06, sy: 2.06, sz: 1.06 }; break; } }
  }
  return trunkC;
}
function creature(kind) {
  const p = P0(); let best = null, bd = 120;
  for (const e of Meadows.creatures || []) { if (e.kind !== kind || e.dead || e.removed || !e.pos) continue; const d = Math.hypot(e.pos.x - p.x, e.pos.z - p.z); if (d < bd) { bd = d; best = e; } }
  return best ? { x: best.pos.x, y: best.pos.y + .8, z: best.pos.z, sx: 1.6, sy: 1.8, sz: 1.6 } : null;
}
function blockNear(ids, r = 20) {
  const p = P0(), bx = Math.floor(p.x), by = Math.floor(p.y), bz = Math.floor(p.z); let best = null, bd = 1e9;
  for (let y = -6; y <= 6; y++) for (let z = -r; z <= r; z++) for (let x = -r; x <= r; x++) {
    if (!ids.includes(get(bx + x, by + y, bz + z))) continue; const d = x * x + y * y + z * z; if (d < bd) { bd = d; best = { bx: bx + x, by: by + y, bz: bz + z }; }
  }
  return best;
}
const cellT = (c, o) => Object.assign({ x: c.bx + .5, y: c.by + .5, z: c.bz + .5, sx: 1.04, sy: 1.04, sz: 1.04 }, o);

// what to fetch when a material is missing: { hint, targets }
function fetchMat(id, n) {
  const have = cnt(id), more = `${have}/${n}`;
  if (id === 'wood') { const t = trunk(), pk = picks('wood', 2);
    return { hint: T(`Get wood (${more}): hit the yellow tree, or pick up yellow sticks`, `اجمع خشبًا (${more}): اضرب الشجرة الصفراء أو التقط الأغصان الصفراء`), targets: [t, ...pk].filter(Boolean), atk: !!t }; }
  if (id === 'stone') return { hint: T(`Get stones (${more}): walk over the yellow pebbles`, `اجمع حجارة (${more}): امشِ فوق الحصى الصفراء`), targets: picks('stone') };
  if (id === 'resin') return { hint: T(`Get resin (${more}): pick up the yellow orange lump`, `اجمع الراتنج (${more}): التقط الكتلة البرتقالية الصفراء`), targets: picks('resin') };
  if (id === 'flint') return { hint: T(`Get flint (${more}): walk to the yellow stones by the sea`, `اجمع الصوّان (${more}): امشِ إلى الحجارة الصفراء عند البحر`), targets: picks('flint') };
  if (id === 'deer_hide' || id === 'raw_meat') { const d = creature('deer');
    return { hint: T(`Hunt a deer (${more}): sneak up and hit the yellow deer`, `اصطد غزالًا (${more}): اقترب بهدوء واضرب الغزال الأصفر`), targets: [d].filter(Boolean), atk: true }; }
  return { hint: T(`You need more ${id} (${more})`, `تحتاج المزيد (${more})`), targets: [] };
}
function missing(cost) { for (const [k, n] of Object.entries(cost || {})) if (cnt(k) < n) return [k, n]; return null; }
function recipeOf(outId) { try { return (Inv.recipes() || []).find(r => r && r.out === outId) || null; } catch (e) { return null; } }

// ---------------------------------------------------------------------
//  The camp blueprint: a small hut, open at the front.
//  Local cells (u across 0-3, v from the back 0-3, h up): walls h 0-1 on the back row and both sides,
//  roof (wood floor) at h 2 over v 0-2, workbench at (1,1), campfire at (2,2), bed at (1,2).
// ---------------------------------------------------------------------
const W = (() => { const a = []; for (let h = 0; h < 2; h++) { for (let u = 0; u < 4; u++) a.push([u, 0, h]); for (const u of [0, 3]) for (const v of [1, 2]) a.push([u, v, h]); } return a; })();
const ROOF = (() => { const a = []; for (let v = 0; v < 3; v++) for (let u = 0; u < 4; u++) a.push([u, v, 2]); return a; })();
const SPOT = { bench: [1, 1, 0], fire: [2, 2, 0], bed: [1, 2, 0], stand: [2, 1, 0] };
const isAir = t => !BLOCK[t] || !BLOCK[t].solid;
const isGround = t => BLOCK[t] && BLOCK[t].solid && t !== LEAVES && !LOGS.includes(t);
function cellOf(c, [u, v, h]) { const rx = -c.fz, rz = c.fx; return { bx: c.x + u * rx + v * c.fx, by: c.y + h, bz: c.z + u * rz + v * c.fz }; }
function axisToward(fromX, fromZ, toX, toZ) { const dx = toX - fromX, dz = toZ - fromZ; return Math.abs(dx) > Math.abs(dz) ? { fx: Math.sign(dx) || 1, fz: 0 } : { fx: 0, fz: Math.sign(dz) || 1 }; }
function flatOK(c) {
  for (let u = 0; u < 4; u++) for (let v = 0; v < 4; v++) {
    const q = cellOf(c, [u, v, 0]); if (!isGround(get(q.bx, q.by - 1, q.bz))) return false;
    for (let h = 0; h < 3; h++) if (!isAir(get(q.bx, q.by + h, q.bz))) return false;
  }
  return true;
}
function topY(x, z) { for (let y = WY - 2; y > 0; y--) { const t = get(x, y, z); if (isGround(t)) return y + 1; if (t !== AIR && BLOCK[t].solid) return -1; } return -1; }
function findCamp() {
  const f = Meadows.flags, p = P0();
  const bench = blockNear([WORKBENCH], 20);
  if (bench) { const ax = axisToward(bench.bx, bench.bz, p.x, p.z), rx = -ax.fz, rz = ax.fx;
    return { x: bench.bx - rx - ax.fx, y: bench.by, z: bench.bz - rz - ax.fz, fx: ax.fx, fz: ax.fz }; }
  const R = Meadows.RING, cx = Math.floor(p.x), cz = Math.floor(p.z);
  for (let r = 3; r <= 18; r++) for (let a = 0; a < 8 * r; a++) {
    const ang = a / (8 * r) * Math.PI * 2, x = cx + Math.round(Math.cos(ang) * r), z = cz + Math.round(Math.sin(ang) * r);
    if (R && Math.hypot(x - R.cx, z - R.cz) < 9) continue;                    // keep clear of the Ring's stones
    const y = topY(x, z); if (y < 0) continue;
    const ax = axisToward(x, z, p.x, p.z), rx = -ax.fz, rz = ax.fx;
    const c = { x: x - rx - ax.fx, y, z: z - rz - ax.fz, fx: ax.fx, fz: ax.fz };
    if (flatOK(c)) return c;
  }
  return null;
}
function camp() {
  const f = Meadows.flags;
  if (f.camp) {                                            // a workbench built somewhere else moves the camp to it
    const b = cellOf(f.camp, SPOT.bench);
    if (get(b.bx, b.by, b.bz) !== WORKBENCH && f.workbench) { const nb = blockNear([WORKBENCH], 20); if (nb) f.camp = null; }
  }
  if (!f.camp) f.camp = findCamp();
  return f.camp;
}
const fireIds = () => { const bb = B(); return bb ? [bb.blocks.CAMPFIRE, bb.blocks.CAMPFIRE_SPIT].filter(v => v != null) : []; };

// ---------------------------------------------------------------------
//  Flows: craft in the inventory, craft at a station, place a build piece
// ---------------------------------------------------------------------
const hotSlot = id => { try { const m = Inv.bag().main; for (let i = 0; i < 9; i++) if (m[i] && m[i].id === id) return slotDivs[i]; } catch (e) { /* no bag */ } return null; };
const bagBtn = () => TOUCH ? [up($('tInv')), out($('hotMore'))] : [];
const row = id => document.querySelector(`#inv .ir[data-out="${id}"]`);
const itemN = id => { const n = typeof ITEMS !== 'undefined' && ITEMS[id] ? ITEMS[id].name : id.replace(/_/g, ' '); return AR() && typeof L === 'function' ? L(n) : n; };

function craftFlow(id, r) {
  const rec = recipeOf(id), miss = rec && missing(rec.needs);
  if (miss && !Inv.isOpen()) return fetchMat(miss[0], miss[1]);
  const name = itemN(id);
  if (!Inv.isOpen()) return { hint: TOUCH ? T(`Make a ${name}: tap the bag button`, `اصنع ${name}: اضغط زر الحقيبة`) : T(`Make a ${name}: press E to open your bag`, `اصنع ${name}: اضغط E لفتح الحقيبة`), ui: bagBtn() };
  if (miss) return { hint: T('Not enough. Close the bag and collect more', 'لا يكفي. أغلق الحقيبة واجمع المزيد'), ui: bagBtn() };
  if (Inv.mode && Inv.mode() === 'station') {
    const rw = row(id), btn = $('stCraftBtn');
    return { hint: T(`Tap ${name} in the list, then tap Craft`, `اضغط على ${name} في المربع الأصفر، ثم اضغط زر الصنع`), ui: [rw && inn(rw), btn && inn(btn)] };
  }
  if (Inv.resultReady && Inv.resultReady() && $('invResult')) return { hint: T(`Tap the new ${name} on the right to take it!`, `اضغط على ${name} في المربع الأصفر لتأخذه!`), ui: [inn($('invResult'))] };
  const rw = row(id);
  return { hint: T(`Tap the yellow ${name} in the recipe list`, `اضغط على ${name} في المربع الأصفر`), ui: [rw && inn(rw)] };
}

function stationFlow(id, benchCell) {
  const rec = recipeOf(id), miss = rec && missing(rec.needs);
  if (miss && !Inv.isOpen()) return fetchMat(miss[0], miss[1]);
  if (Inv.isOpen()) return craftFlow(id);
  if (!benchCell) return { hint: T('Find your workbench', 'اذهب إلى طاولة العمل') };
  const t = cellT(benchCell), near = dist(t) < 4;
  return { hint: near ? (TOUCH ? T('Look at the workbench and tap Use', 'انظر إلى طاولة العمل واضغط زر الاستخدام') : T('Look at the workbench and right-click', 'انظر إلى طاولة العمل وانقر بالزر الأيمن'))
    : T('Walk to your workbench (yellow)', 'امشِ إلى طاولة العمل الصفراء'), targets: [t], ui: near && TOUCH ? [out($('tUse'))] : [] };
}

// place piece `pid` on one of `cells` ([{bx,by,bz}]); `what` names it for the hint
function placeFlow(pid, cells, what) {
  const bb = B(); if (!bb) return null; const pc = bb.PIECE[pid]; if (!pc) return null;
  const miss = missing(pc.cost);
  if (miss && !bb.isOpen()) { const f = fetchMat(miss[0], miss[1]); f.targets = (f.targets || []).concat(cells.map(c => cellT(c, { ghost: true, dim: true }))); return f; }
  const ghosts = cells.map(c => cellT(c, { ghost: true }));
  if (Inv.isOpen()) return { hint: T('Close the bag first', 'أغلق الحقيبة أولًا'), ui: bagBtn(), targets: ghosts };
  if (heldId() !== 'hammer') {
    const s = hotSlot('hammer');
    return { hint: s ? T('Pick the hammer: tap the yellow slot', 'اختر المطرقة: اضغط الخانة الصفراء') : T('Put the hammer in your hotbar', 'ضع المطرقة في الشريط السفلي'), ui: s ? [out(s)] : bagBtn(), targets: ghosts };
  }
  if (bb.isOpen()) {
    if (bb.curTab() !== pc.tab) { const tb = document.querySelector(`#bmRoot .bmtab[data-tab="${pc.tab}"]`) || document.querySelector(`.bmtab[data-tab="${pc.tab}"]`);
      return { hint: T('Tap the yellow tab', 'اضغط على التبويب الأصفر'), ui: [tb && inn(tb)] }; }
    const pe = document.querySelector(`[data-piece="${pid}"]`);
    const again = TOUCH && bb.tapped && bb.tapped() === pid;
    return { hint: again ? T(`Tap the ${what} again to pick it`, `اضغط على ${what} مرة ثانية لتختارها`) : T(`Tap the yellow ${what}`, `اضغط على ${what} في المربع الأصفر`), ui: [pe && inn(pe)] };
  }
  if (bb.selId() !== pid) return { hint: TOUCH ? T('Tap the Use button to open the build menu', 'اضغط زر الاستخدام لفتح قائمة البناء') : T('Right-click to open the build menu', 'انقر بالزر الأيمن لفتح قائمة البناء'), ui: TOUCH ? [out($('tUse'))] : [], targets: ghosts };
  const g = bb.ghost && bb.ghost(), on = g && g.list && !g.why && g.list.some(([x, y, z]) => cells.some(c => c.bx === x && c.by === y && c.bz === z));
  if (on) { for (const t of ghosts) t.ok = true;
    return { hint: TOUCH ? T('Great! Tap Attack to build it', 'ممتاز! اضغط زر الهجوم للبناء') : T('Great! Left-click to build it', 'ممتاز! انقر بالزر الأيسر للبناء'), ui: TOUCH ? [out($('tAttack'))] : [], targets: ghosts }; }
  const far = cells.length && Math.min(...cells.map(c => dist(cellT(c)))) > 5;
  return { hint: far ? T(`Walk to the yellow square to place the ${what}`, `امشِ إلى المربع الأصفر لتضع ${what}`) : T('Aim the + at the yellow square', 'وجّه علامة + نحو المربع الأصفر'), targets: ghosts };
}

// ---------------------------------------------------------------------
//  One plan per quest step: { hint, targets, ui, atk }
// ---------------------------------------------------------------------
function planStep(step) {
  const f = Meadows.flags;
  switch (step) {
    case 'gather': {
      const need = [];
      if (cnt('wood') < 3) need.push(...picks('wood', 2));
      if (cnt('stone') < 3) need.push(...picks('stone', 2));
      return { hint: T('Walk over the yellow sticks and stones to pick them up', 'امشِ فوق الأغصان والحجارة الصفراء لتلتقطها'), targets: need };
    }
    case 'club': return craftFlow('wood_club');
    case 'torch': return craftFlow('torch');
    case 'hammer': return craftFlow('hammer');
    case 'chop': { const t = trunk();
      return { hint: TOUCH ? T('Hold the Attack button on the yellow tree', 'اضغط مطولًا على زر الهجوم أمام الشجرة الصفراء') : T('Hold left-click on the yellow tree', 'اضغط مطولًا بالزر الأيسر على الشجرة الصفراء'), targets: [t].filter(Boolean), atk: true }; }
    case 'workbench': { const c = camp(); if (!c) return { hint: T('Find a flat open place', 'ابحث عن مكان مستوٍ') };
      return placeFlow('workbench', [cellOf(c, SPOT.bench)], T('workbench', 'طاولة العمل')); }
    case 'shelter': case 'rested': {
      const c = camp(); if (!c) return null;
      const wallsLeft = W.map(q => cellOf(c, q)).filter(q => isAir(get(q.bx, q.by, q.bz)));
      const low = wallsLeft.filter(q => q.by === c.y);
      if (wallsLeft.length) { const r = placeFlow('wood_wall', low.length ? low : wallsLeft, T('wood wall', 'الجدار الخشبي'));
        if (r && r.hint && !r.ui?.length && bbSelected('wood_wall')) r.hint += T(` (walls left: ${wallsLeft.length})`, ` (باقي ${wallsLeft.length} جدار)`); return r; }
      const roofLeft = ROOF.map(q => cellOf(c, q)).filter(q => isAir(get(q.bx, q.by, q.bz)));
      if (roofLeft.length) { const r = placeFlow('wood_floor', roofLeft, T('wood floor (roof)', 'الأرضية الخشبية (للسقف)'));
        if (r && r.hint && bbSelected('wood_floor')) r.hint += T(` (roof left: ${roofLeft.length})`, ` (باقي ${roofLeft.length} للسقف)`); return r; }
      const fc = cellOf(c, SPOT.fire);
      if (!fireIds().includes(get(fc.bx, fc.by, fc.bz)) && !blockNear(fireIds(), 4)) return placeFlow('campfire', [fc], T('campfire', 'نار المخيم'));
      const st = cellOf(c, SPOT.stand), t = cellT(st, { ghost: true, sy: .1, y: st.by + .05, see: true }), inside = dist(t) < 1.3;
      return { hint: inside ? T('Stay here by the fire and rest...', 'ابقَ هنا قرب النار واسترح...') : T('Go inside your hut: stand on the yellow spot', 'ادخل بيتك: قف على المربع الأصفر'), targets: inside ? [] : [t] };
    }
    case 'flint': {
      if (cnt('flint') < 4) return fetchMat('flint', 4);
      return stationFlow('flint_axe', blockNear([WORKBENCH], 30));
    }
    case 'hunt': case 'trophies': { const d = creature('deer');
      return { hint: d ? T('Sneak up and hit the yellow deer', 'اقترب بهدوء واضرب الغزال الأصفر') : T('Look for deer in the open meadows', 'ابحث عن الغزلان في المروج'), targets: [d].filter(Boolean), atk: !!d }; }
    case 'cook': {
      const bb = B(); if (!bb) return null;
      if (cnt('raw_meat') < 1 && !spitBusy()) return fetchMat('raw_meat', 1);
      const spit = blockNear([bb.blocks.CAMPFIRE_SPIT], 20);
      if (!spit) { const fire = blockNear([bb.blocks.CAMPFIRE], 20);
        if (!fire) { const c = camp(); return placeFlow('campfire', [cellOf(c || { x: 0, y: 0, z: 0, fx: 1, fz: 0 }, SPOT.fire)], T('campfire', 'نار المخيم')); }
        return placeFlow('cooking_spit', [fire], T('cooking spit', 'سيخ الشواء')); }
      const t = cellT(spit), near = dist(t) < 4;
      if (spitBusy()) return { hint: TOUCH ? T('Meat is cooking! When it is brown, tap Use to take it', 'اللحم على النار! عندما يصير بنيًا اضغط الاستخدام لتأخذه') : T('Meat is cooking! When it is brown, right-click to take it', 'اللحم على النار! عندما يصير بنيًا انقر بالزر الأيمن لتأخذه'), targets: [t], ui: near && TOUCH ? [out($('tUse'))] : [] };
      if (heldId() !== 'raw_meat') { const s = hotSlot('raw_meat'); return { hint: T('Hold the raw meat: tap the yellow slot', 'امسك اللحم النيء: اضغط الخانة الصفراء'), ui: s ? [out(s)] : bagBtn(), targets: [t] }; }
      return { hint: near ? (TOUCH ? T('Look at the spit and tap Use', 'انظر إلى السيخ واضغط زر الاستخدام') : T('Look at the spit and right-click', 'انظر إلى السيخ وانقر بالزر الأيمن')) : T('Walk to the yellow cooking spit', 'امشِ إلى سيخ الشواء الأصفر'), targets: [t], ui: near && TOUCH ? [out($('tUse'))] : [] };
    }
    case 'eat': {
      const foods = ['cooked_meat', 'raspberries', 'blueberries', 'berries', 'honey', 'apple'].filter(id => cnt(id) > 0);
      if (!foods.length) return { hint: T('Find red berry bushes or cook more meat', 'ابحث عن شجيرات التوت أو اشوِ لحمًا') };
      const id = foods.find(k => k !== heldId()) || foods[0], s = hotSlot(id);
      if (heldId() && foods.includes(heldId())) return { hint: TOUCH ? T('Tap the Eat button', 'اضغط زر الأكل') : T('Hold right-click to eat', 'اضغط مطولًا بالزر الأيمن لتأكل'), ui: TOUCH ? [out($('tEat'))] : [] };
      return { hint: T('Pick the food: tap the yellow slot', 'اختر الطعام: اضغط الخانة الصفراء'), ui: s ? [out(s)] : bagBtn() };
    }
    case 'bed': { const c = camp(); if (!c) return null; return placeFlow('bed', [cellOf(c, SPOT.bed)], T('bed', 'السرير')); }
    case 'waystone': {
      const ws = (Meadows.WAYS || []).filter(w => !w.read).sort((a, b) => dist(a) - dist(b))[0];
      if (!ws) return { hint: T('Look up for Vesk the raven', 'انظر للأعلى وابحث عن الغراب فيسك') };
      const t = { x: ws.cx != null ? ws.cx : ws.x + .5, y: ws.y + 1, z: ws.cz != null ? ws.cz : ws.z + .5, sx: 1.4, sy: 2.2, sz: 1.4 }, near = dist(t) < 4;
      return { hint: near ? (TOUCH ? T('Look at the stone and tap Use to read it', 'انظر إلى الحجر واضغط الاستخدام لتقرأه') : T('Look at the stone and right-click to read it', 'انظر إلى الحجر وانقر بالزر الأيمن لتقرأه')) : T('Walk to the yellow Waystone', 'امشِ إلى حجر الطريق الأصفر'), targets: [t], ui: near && TOUCH ? [out($('tUse'))] : [] };
    }
    case 'summon': {
      const A = Meadows.ALT, t = { x: A.cx, y: A.y + 1.5, z: A.cz, sx: 2, sy: 3, sz: 2 }, near = dist(t) < 5;
      if (!near) return { hint: T('Walk to the Stag Altar (yellow)', 'امشِ إلى مذبح الأيل الأصفر'), targets: [t] };
      if (heldId() !== 'deer_trophy') { const s = hotSlot('deer_trophy'); return { hint: T('Hold the deer trophy: tap the yellow slot', 'امسك رأس الغزال: اضغط الخانة الصفراء'), ui: s ? [out(s)] : bagBtn(), targets: [t] }; }
      return { hint: TOUCH ? T('Look at the altar and tap Use', 'انظر إلى المذبح واضغط زر الاستخدام') : T('Look at the altar and right-click', 'انظر إلى المذبح وانقر بالزر الأيمن'), targets: [t], ui: TOUCH ? [out($('tUse'))] : [] };
    }
    case 'boss': { const b = Meadows.boss; if (!b || b.removed || !b.pos) return null;
      return { hint: T('Hit Stormhorn! Block his charge with the shield', 'اضرب ستورمهورن! وصدّ هجومه بالدرع'), targets: [{ x: b.pos.x, y: b.pos.y + 2, z: b.pos.z, sx: 3, sy: 4, sz: 3 }], atk: true }; }
    case 'hang': {
      const m = (Meadows.MOUNTS || [])[0]; if (!m) return null;
      const t = { x: m.x + .5, y: m.y + .5, z: m.z + .5, sx: 1.2, sy: 1.2, sz: 1.2 }, near = dist(t) < 4;
      if (!near) return { hint: T('Walk to the Ring of Oaths (yellow)', 'امشِ إلى حلقة العهود الصفراء'), targets: [t] };
      const s = hotSlot('stormhorn_trophy');
      if (heldId() !== 'stormhorn_trophy' && s) return { hint: T('Hold the Stormhorn trophy: tap the yellow slot', 'امسك رأس ستورمهورن: اضغط الخانة الصفراء'), ui: [out(s)], targets: [t] };
      return { hint: TOUCH ? T('Look at the stone and tap Use', 'انظر إلى الحجر واضغط زر الاستخدام') : T('Look at the stone and right-click', 'انظر إلى الحجر وانقر بالزر الأيمن'), targets: [t], ui: TOUCH ? [out($('tUse'))] : [] };
    }
    case 'power': return { hint: TOUCH ? T('Tap the yellow power button', 'اضغط زر القوة الأصفر') : T('Press R to use your power', 'اضغط R لتستخدم قوتك'), ui: TOUCH ? [up($('tSwitch'))] : [] };
  }
  return null;
}
// after a death: the tombstone with your things comes first, in every chapter
function tombPlan() {
  let list = null; try { list = Combat._survival.tombstones; } catch (e) { return null; }
  const p = P0(), t = (list || []).filter(o => o.items > 0).sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0];
  if (!t) return null;
  const tg = { x: t.x, y: t.y + .6, z: t.z, sx: 1, sy: 1.3, sz: 1, see: true }, d = dist(tg), near = d < 3;
  if (state === 'tomb') { const tb = [...document.querySelectorAll('#cbTomb .cbBtn')].find(e => !e.hidden); return { hint: T('Tap Take all to get your things back', 'اضغط «خذ الكل» لتسترجع أغراضك'), ui: [tb && inn(tb)] }; }
  return { hint: near ? (TOUCH ? T('Look at the tombstone and tap Use', 'انظر إلى شاهد القبر واضغط زر الاستخدام') : T('Look at the tombstone and right-click', 'انظر إلى شاهد القبر وانقر بالزر الأيمن'))
    : T(`Your things are where you died: follow the arrow (${Math.round(d)} m)`, `أغراضك في مكان موتك: اتبع السهم (${Math.round(d)} م)`), targets: [tg], ui: near && TOUCH ? [out($('tUse'))] : [] };
}
function bbSelected(id) { const bb = B(); return !!bb && bb.selId() === id && !bb.isOpen(); }
function spitBusy() { const bb = B(); if (!bb || !bb.SPITS) return false; for (const s of bb.SPITS.values()) if (s && s.slots && s.slots.some(Boolean)) return true; return false; }

// ---------------------------------------------------------------------
//  Per frame
// ---------------------------------------------------------------------
let planT = 0, clock = 0, cur = null;
const off = () => { cur = null; targets = []; mainT = null; setUI([]); setHint(''); };
on('tick', dt => {
  clock += dt; trunkT -= dt;
  const ui0 = (state === 'play' || state === 'tomb' || state === 'inv' || state === 'build' || (hasInv() && Inv.isOpen()) || (B() && B().isOpen()))
    && Meadows.flags.intro && !Meadows.arrival && !(Meadows.dialog && Meadows.dialog.open);
  const tomb = ui0 && tombPlan();
  const live = ui0 && (tomb || !(typeof DarkForest !== 'undefined' && DarkForest.flags && DarkForest.flags.started));
  if (!live) { if (cur || hintTxt) off(); drawTargets(clock); edgeEl.hidden = true; return; }
  if ((planT -= dt) <= 0) {
    planT = .25; let r = null;
    try { r = tomb || planStep(Meadows.step); } catch (e) { console.error(e); r = null; }
    cur = r;
    targets = (r && r.targets || []).filter(Boolean).slice(0, 40);
    mainT = targets.find(o => !o.dim) || targets[0] || null;
    const ui = (r && r.ui || []).slice();
    if (r && r.atk && TOUCH && mainT && dist(mainT) < 4 && state === 'play') ui.push(out($('tAttack')));
    setUI(ui); setHint(r && r.hint || '');
  }
  drawTargets(clock); drawEdge();
});
window.Guide = { plan: () => cur, step: () => Meadows.step, camp: () => Meadows.flags.camp, reset: () => { Meadows.flags.camp = null; } };
})();
