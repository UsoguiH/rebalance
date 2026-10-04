"use strict";
/* Blockcraft — Chapter III: The Swamp  (js/swamp.js)
 * The south-east corner of the isle behind a channel (index.html SWAMP): black water pools, mud, dead trees, reeds, endless rain and
 * fog. Rotting Dead (warrior + archer), Bog Leeches in the pools, Bog Blobs that burst into poison, Bog Wraiths at night. Sunken crypts
 * locked with the Drowned Key (The Old Root's drop) hold Scrap Iron and Grave Bones; scrap smelts to iron at the Furnace (blocks.js)
 * for the iron tier (sword, mace, axe, armour) and Bogward Mead resists poison. A Waystone reveals the Bone Pit where 10 Grave Bones
 * summon Rotmaw, the flesh maw (3 telegraphed attacks). Its head hangs at the Ring of Oaths for Ironhide (valheim.js Powers).
 * Same structure as js/darkforest.js. Valheim-STYLE, our own names and text. Uses World, Meadows, Inv, Combat, Stations, Save, DarkForest
 * through typeof guards. */
(() => {
const R = Math.random;
const hasInv = () => typeof Inv !== 'undefined' && Inv && typeof Inv.add === 'function';
const MW = () => (typeof Meadows !== 'undefined' && Meadows) || null;
const DFm = () => (typeof DarkForest !== 'undefined' && DarkForest) || null;
const count = id => { try { return hasInv() ? Inv.count(id) | 0 : 0; } catch (e) { return 0; } };
const removeItem = (id, n) => { try { return hasInv() && !!Inv.remove(id, n); } catch (e) { return false; } };
const heldStack = () => { try { return hasInv() && Inv.held ? Inv.held() : null; } catch (e) { return null; } };
const heldTool = () => { const s = heldStack(); return (s && typeof ITEMS !== 'undefined' && ITEMS[s.id] && ITEMS[s.id].tool) || null; };
const drop = (id, n, p) => { if (typeof World !== 'undefined' && World.spawnDrop) World.spawnDrop(id, n, p); else if (hasInv()) Inv.add(id, n); };
const say = (t, s = 3.5) => { const m = MW(); if (m) m.subtitle(t, s); else chat(t); };
const title = (a, b, s, c) => { const m = MW(); if (m) m.bigTitle(a, b, s, c); };
const dlgOpen = () => { const m = MW(); return !!(m && m.dialog && m.dialog.open); };
const isNight = () => typeof World !== 'undefined' && World.isNight ? World.isNight() : false;
let cine = null;
const calm = () => state !== 'play' || dlgOpen() || !!cine;
function compass(dx, dz) { const a = Math.atan2(dx, -dz) * 180 / Math.PI;
  return I18N.L(['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'][((Math.round(a / 45) % 8) + 8) % 8]); }
const timers = [];
const later = (s, fn) => timers.push({ t: s, fn });

// ---------------------------------------------------------------- sounds
const SS = {
  squelch() { if (!AC) return; const t = AC.currentTime; noiseSweep(t, .35, 500, 140, .25, 2, .01, 'lowpass'); thump(t, 120, 60, .25, .2, 'sine'); },
  groan() { if (!AC) return; const t = AC.currentTime; thump(t, 110, 55, 1.2, .35, 'sawtooth'); noiseSweep(t, 1, 400, 120, .2, 1.5, .2, 'lowpass'); },
  roar() { if (!AC) return; const t = AC.currentTime; thump(t, 85, 34, 2, .6, 'sawtooth'); thump(t + .05, 60, 28, 1.8, .5, 'square'); noiseSweep(t, 1.6, 900, 80, .45, 1, .2); },
  bow() { if (!AC) return; const t = AC.currentTime; noiseSweep(t, .18, 2400, 900, .18, 3, .005); click(t, 700, .08); },
  bite() { if (!AC) return; const t = AC.currentTime; click(t, 300, .12); click(t + .05, 220, .1); noiseSweep(t, .15, 1200, 400, .15, 2, .005); },
  pop() { if (!AC) return; const t = AC.currentTime; thump(t, 260, 60, .3, .35, 'sine'); noiseSweep(t, .6, 1400, 200, .3, 1.2, .01); },
  wail() { if (!AC) return; const t = AC.currentTime; thump(t, 520, 380, 1.4, .08, 'sine'); thump(t + .1, 780, 560, 1.2, .05, 'triangle'); },
  chain() { if (!AC) return; const t = AC.currentTime; for (let i = 0; i < 7; i++) click(t + i * .05, 1400 + R() * 900, .06); },
  slam() { if (!AC) return; const t = AC.currentTime; thump(t, 90, 30, .8, .8); noiseSweep(t, .6, 600, 60, .45, .7, .005, 'lowpass'); },
  splash() { if (!AC) return; const t = AC.currentTime; noiseSweep(t, .4, 1400, 300, .22, 2, .005); thump(t, 200, 90, .2, .12, 'sine'); },
  door() { if (!AC) return; const t = AC.currentTime; thump(t, 70, 45, 1.2, .5, 'sawtooth'); for (let i = 0; i < 4; i++) click(t + .3 + i * .09, 900, .07); },
  clink() { if (!AC) return; const t = AC.currentTime; note(t, 1175, .05); note(t + .05, 1568, .04); },
  drink() { if (!AC) return; const t = AC.currentTime; for (let i = 0; i < 4; i++) thump(t + i * .12, 300 + i * 40, 200, .1, .1, 'sine'); },
  chime(ch) { if (!AC) return; const t = AC.currentTime; (ch ? [523.3, 659.3, 784, 1046.5] : [784, 987.8, 1174.7]).forEach((f, i) => note(t + i * .11, f, .07)); },
  rune() { if (!AC) return; const t = AC.currentTime; thump(t, 110, 104, 1.6, .2, 'sine'); note(t, 392, .05); note(t + .18, 587.3, .045); },
};

// ---------------------------------------------------------------- pixel helpers (same as darkforest.js)
const rr = (g, c, x, y, w = 1, h = 1) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
const dots = (g, c, p) => { g.fillStyle = c; for (let i = 0; i < p.length; i += 2) g.fillRect(p[i], p[i + 1], 1, 1); };
function ln(g, c, x0, y0, x1, y1, w = 1) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1; g.fillStyle = c;
  for (let i = 0; i <= n; i++) g.fillRect(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), w, w); }
const TR = mulberry32(31337);
function noiseFill(g, x0, y0, w, h, base, amt = .22, rnd = TR) { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { g.fillStyle = shade(base, (rnd() - .5) * amt); g.fillRect(x, y, 1, 1); } }
function bevel(g, w, h, base) { g.fillStyle = shade(base, .2); g.fillRect(0, 0, w, 1); g.fillRect(0, 0, 1, h); g.fillStyle = shade(base, -.3); g.fillRect(0, h - 1, w, 1); g.fillRect(w - 1, 0, 1, h); }
const TEXC = {};
function tx(key, w, h, base, deco, amt) { return TEXC[key] || (TEXC[key] = charTex(w, h, g => { noiseFill(g, 0, 0, w, h, base, amt, R); bevel(g, w, h, base); if (deco) deco(g, w, h); })); }
const GEO = {};
const boxGeo = (w, h, d) => { const k = w + ',' + h + ',' + d; return GEO[k] || (GEO[k] = new THREE.BoxGeometry(w, h, d)); };
const UNIT = new THREE.BoxGeometry(1, 1, 1);
const GLOWM = {};
const glowMat = hex => GLOWM[hex] || (GLOWM[hex] = new THREE.MeshBasicMaterial({ color: hex, fog: false }));
let haloTex = null;
function halo(hex, size, op = .55) {
  if (!haloTex) haloTex = new THREE.CanvasTexture(pixCanvas(32, 32, g => { const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(.35, 'rgba(255,255,255,.3)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); }));
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, color: hex, blending: THREE.AdditiveBlending, transparent: true, opacity: op, depthWrite: false, fog: false }));
  s.scale.set(size, size, 1); return s;
}
const PXA = (rows, pal) => g => rows.forEach((row, y) => { for (let x = 0; x < 16; x++) { const c = pal[row[x]]; if (c) { g.fillStyle = c; g.fillRect(x, y, 1, 1); } } });
function rim(g) {
  const im = g.getImageData(0, 0, 16, 16), d = im.data, o = new Uint8ClampedArray(d);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const k = (y * 16 + x) * 4; if (d[k + 3]) continue; let best = -1, lum = 1e9;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx > 15 || ny > 15) continue;
      const n = (ny * 16 + nx) * 4; if (d[n + 3] > 128) { const l = d[n] + d[n + 1] + d[n + 2]; if (l < lum) { lum = l; best = n; } } }
    if (best >= 0) { o[k] = d[best] * .35; o[k + 1] = d[best + 1] * .35; o[k + 2] = d[best + 2] * .35; o[k + 3] = 255; }
  }
  im.data.set(o); g.putImageData(im, 0, 0);
}
const ICONC = {};
const art = (key, ...draws) => g => {
  const c = ICONC[key] || (ICONC[key] = pixCanvas(16, 16, gg => { gg.imageSmoothingEnabled = false; for (const f of draws) f(gg); rim(gg); }));
  g.imageSmoothingEnabled = false; g.drawImage(c, 0, 0, 16, 16);
};
const pad = rows => rows.map(r => (r + '................').slice(0, 16));

// =====================================================================================================
//  Tiles and blocks
// =====================================================================================================
function addTile(name, draw) { tile(name, draw);
  const i = TILE[name], d = ag.getImageData((i % 16) * 16, Math.floor(i / 16) * 16, 16, 16).data; let r = 0, g = 0, b = 0, n = 0;
  for (let k = 0; k < d.length; k += 4) { if (d[k + 3] < 128) continue; r += d[k]; g += d[k + 1]; b += d[k + 2]; n++; }
  tileColor[i] = new THREE.Color(r / (n || 1) / 255, g / (n || 1) / 255, b / (n || 1) / 255); return i; }
const SLIME = ['#3d4a22', '#4a5a28', '#2e3a1a'];
const tMud = addTile('sw_mud', g => { noiseFill(g, 0, 0, 16, 16, '#3a2e22', .28); for (let i = 0; i < 14; i++) rr(g, TR() < .5 ? '#2a2018' : '#4a3a2a', (TR() * 15) | 0, (TR() * 15) | 0, 2, 1);
  for (let i = 0; i < 5; i++) rr(g, '#55483a', (TR() * 16) | 0, (TR() * 16) | 0); });
const tBogTop = addTile('sw_bog_top', g => { noiseFill(g, 0, 0, 16, 16, '#3b4426', .3); for (let i = 0; i < 20; i++) rr(g, SLIME[i % 3], (TR() * 16) | 0, (TR() * 16) | 0);
  for (let i = 0; i < 6; i++) rr(g, '#2a2018', (TR() * 15) | 0, (TR() * 15) | 0, 2, 1); });
const tBogSide = addTile('sw_bog_side', g => { noiseFill(g, 0, 0, 16, 16, '#3a2e22', .25);
  for (let x = 0; x < 16; x++) { const h = 2 + ((TR() * 4) | 0); for (let y = 0; y < h; y++) rr(g, shade('#3b4426', (TR() - .5) * .3), x, y); } });
const tDeadSide = addTile('sw_dead_side', g => { noiseFill(g, 0, 0, 16, 16, '#5a564c', .18); for (const x of [2, 5, 9, 12]) for (let y = 0; y < 16; y++) if (TR() < .75) rr(g, '#3e3b34', x, y);
  for (let i = 0; i < 6; i++) rr(g, SLIME[i % 3], (TR() * 16) | 0, 10 + ((TR() * 6) | 0)); });
const tDeadTop = addTile('sw_dead_top', g => { noiseFill(g, 0, 0, 16, 16, '#5a564c', .15); rr(g, '#7a7468', 2, 2, 12, 12); rr(g, '#5e5950', 4, 4, 8, 8); rr(g, '#4a463e', 7, 7, 2, 2); });
const tBrick = addTile('sw_crypt_brick', g => { noiseFill(g, 0, 0, 16, 16, '#4a4d48', .2); for (let y = 0; y < 16; y += 4) { rr(g, '#2a2c28', 0, y + 3, 16, 1); for (let x = (y / 4) % 2 ? 4 : 0; x < 16; x += 8) rr(g, '#2a2c28', x, y, 1, 3); }
  for (let i = 0; i < 22; i++) rr(g, SLIME[i % 3], (TR() * 16) | 0, TR() < .6 ? 12 + ((TR() * 4) | 0) : (TR() * 16) | 0); });
const tDoor = addTile('sw_crypt_door', g => { noiseFill(g, 0, 0, 16, 16, '#3a2a1c', .18); for (const x of [0, 5, 10, 15]) rr(g, '#24180e', x, 0, 1, 16);
  for (const y of [2, 13]) { rr(g, '#5a5e60', 0, y, 16, 2); dots(g, '#9aa0a2', [2, y, 7, y, 12, y]); } rr(g, '#1c3d2c', 6, 6, 4, 5); rr(g, '#4f9a7a', 7, 7, 2, 3); rr(g, '#7fd8b0', 7, 7, 1, 1); });
const tScrap = addTile('sw_scrap', g => { noiseFill(g, 0, 0, 16, 16, '#3a2e22', .25); for (const [x, y, w, h] of [[1, 2, 5, 2], [8, 1, 6, 3], [3, 7, 4, 4], [10, 8, 4, 2], [2, 12, 6, 2], [9, 12, 5, 3]]) {
    rr(g, '#5a3a22', x, y + 1, w, h); rr(g, '#8a5a32', x, y, w, h - 1 || 1); rr(g, '#a8a8a0', x, y); rr(g, '#c87a3a', x + w - 1, y + h - 1); } });
const tBones = addTile('sw_bone_pile', g => { for (const [x0, y0, x1, y1] of [[2, 14, 9, 9], [6, 15, 14, 11], [3, 10, 12, 12], [7, 8, 9, 15]]) { ln(g, '#d8d0b8', x0, y0, x1, y1, 2); rr(g, '#f2ecd8', x0, y0, 2, 2); rr(g, '#a89e84', x1, y1, 2, 2); }
  rr(g, '#e8e2cc', 5, 4, 6, 5); rr(g, '#e8e2cc', 6, 9, 4, 2); rr(g, '#2a2420', 6, 6, 2, 2); rr(g, '#2a2420', 9, 6, 1, 2); rr(g, '#bdb59a', 6, 10, 1, 1); rr(g, '#bdb59a', 8, 10, 1, 1); });
const tReed = addTile('sw_reed', g => { for (const x of [2, 5, 7, 10, 13]) { const h = 6 + ((TR() * 8) | 0); ln(g, TR() < .5 ? '#5a6a2a' : '#46561f', x, 15, x + (TR() < .5 ? -1 : 1), 15 - h); if (TR() < .6) { rr(g, '#4a2e1a', x, 15 - h - 3, 2, 3); rr(g, '#6a4226', x, 15 - h - 3); } } });
const tBloom = addTile('sw_bog_bloom', g => { ln(g, '#3a5a22', 8, 15, 8, 7); ln(g, '#3a5a22', 8, 11, 5, 9); ln(g, '#3a5a22', 8, 12, 11, 10);
  rr(g, '#d8c8f0', 6, 3, 5, 4); rr(g, '#b8a0e0', 5, 4, 7, 2); rr(g, '#fff8a0', 8, 4, 1, 2); dots(g, '#e8e0ff', [6, 3, 10, 3]); rr(g, '#c8b8e8', 3, 8, 2, 2); rr(g, '#c8b8e8', 11, 9, 2, 2); });
const tAltarTop = addTile('sw_altar_top', g => { noiseFill(g, 0, 0, 16, 16, '#4a3a30', .2); rr(g, '#2a1a14', 3, 3, 10, 10); rr(g, '#5a1010', 5, 5, 6, 6); rr(g, '#c81e1e', 6, 6, 4, 4); rr(g, '#ff6a4a', 7, 7, 2, 2);
  for (const [x, y] of [[1, 1], [13, 1], [1, 13], [13, 13]]) rr(g, '#e8e2cc', x, y, 2, 2); });
const tAltarSide = addTile('sw_altar_side', g => { noiseFill(g, 0, 0, 16, 16, '#4a3a30', .2); for (const [x0, y0, x1, y1] of [[1, 3, 6, 5], [9, 2, 14, 4], [2, 10, 7, 12], [9, 11, 14, 9]]) ln(g, '#e8e2cc', x0, y0, x1, y1, 2);
  rr(g, '#e8e2cc', 6, 6, 4, 3); rr(g, '#ff3a2a', 6, 7, 1, 1); rr(g, '#ff3a2a', 9, 7, 1, 1); for (let i = 0; i < 8; i++) rr(g, SLIME[i % 3], (TR() * 16) | 0, 13 + ((TR() * 3) | 0)); });
const tRune = addTile('sw_rune_stone', g => { noiseFill(g, 0, 0, 16, 16, '#3e423c', .16); rr(g, '#555a52', 0, 0, 16, 1); rr(g, '#555a52', 0, 0, 1, 16); rr(g, '#262824', 0, 15, 16, 1); rr(g, '#262824', 15, 0, 1, 16);
  ln(g, '#c8ff6a', 5, 2, 5, 13); ln(g, '#c8ff6a', 5, 3, 10, 6); ln(g, '#c8ff6a', 5, 8, 10, 11); ln(g, '#8aa040', 10, 6, 10, 11); for (let i = 0; i < 16; i++) rr(g, SLIME[i % 3], (TR() * 16) | 0, 11 + ((TR() * 5) | 0)); });
atlasTex.needsUpdate = true;
const newBlock = (name, tiles, sound, o) => { const id = BLOCK.length; def(id, name, tiles, sound, o); return id; };
const MUD = newBlock('Swamp Mud', cube(tMud), 'grass');
const BOG = newBlock('Bog Grass', cube(tBogSide, tBogTop, tMud), 'grass');
const DEAD = newBlock('Dead Wood', cube(tDeadSide, tDeadTop), 'wood');
const CBRICK = newBlock('Crypt Stone', cube(tBrick), 'stone');
const CDOOR = newBlock('Sealed Crypt Door', cube(tDoor), 'wood');
const SCRAP = newBlock('Scrap Iron Pile', cube(tScrap), 'stone');
const BONES = newBlock('Grave Bones', [tBones], 'stone', { kind: 'cross', opaque: false, solid: false });
const REED = newBlock('Reeds', [tReed], 'grass', { kind: 'cross', opaque: false, solid: false });
const BLOOM = newBlock('Bog Bloom', [tBloom], 'grass', { kind: 'cross', opaque: false, solid: false });
const BALTAR = newBlock('Bone Pit Altar', cube(tAltarSide, tAltarTop), 'stone');
const SWRUNE = newBlock('Bog Rune Stone', cube(tRune), 'stone');
const PROTECT = new Set([CBRICK, CDOOR, BALTAR, SWRUNE]);

// =====================================================================================================
//  Items, icons and recipes
// =====================================================================================================
const T_MACE = pad(['         L L', '        LMMML', '       LMLMMMD', '      LMMMMMMD', '       MMMMMD', '      hDMMMD', '     hh D D', '    hh', '   hh', '  hh', ' hh', 'kh', 'k', '', '', '']);
const lump = (L, M, D, F) => g => { rr(g, M, 4, 4, 8, 8); rr(g, M, 3, 6, 10, 5); rr(g, L, 4, 4, 5, 2); rr(g, L, 3, 6, 2, 2); rr(g, D, 6, 11, 6, 1); rr(g, D, 11, 7, 1, 4);
  for (const [x, y] of [[6, 7], [9, 5], [8, 9], [5, 9]]) rr(g, F, x, y, 2, 1); };
const ICONS = {
  scrap_iron: art('si', lump('#9a8a7a', '#6a5040', '#3a2a1e', '#c87a3a'), g => { rr(g, '#c8c8c0', 5, 5, 2, 1); rr(g, '#a8a8a0', 9, 8, 2, 1); }),
  grave_bones: art('gb', g => { for (const [x0, y0, x1, y1] of [[2, 13, 10, 5], [6, 14, 13, 8], [3, 6, 12, 6]]) { ln(g, '#d8d0b8', x0, y0, x1, y1, 2); rr(g, '#f6f0dc', x0, y0, 2, 2); rr(g, '#a89e84', x1, y1, 2, 2); } dots(g, '#4a5a22', [5, 11, 11, 9]); }),
  bog_bloom: art('bl', g => { ln(g, '#3a5a22', 8, 15, 8, 8); ln(g, '#3a5a22', 8, 11, 5, 10); rr(g, '#b8a0e0', 4, 3, 8, 5); rr(g, '#d8c8f0', 5, 2, 6, 5); rr(g, '#fff8a0', 7, 4, 2, 2); dots(g, '#8a70c0', [4, 7, 11, 7]); }),
  ooze: art('oz', g => { rr(g, '#2a5a12', 4, 5, 8, 8); rr(g, '#2a5a12', 3, 7, 10, 5); rr(g, '#5ab82a', 4, 6, 8, 6); rr(g, '#8cff6a', 5, 6, 3, 2); rr(g, '#d8ffb0', 5, 6, 1, 1); rr(g, '#2a5a12', 6, 13, 2, 2); }),
  rotmaw_trophy: art('rm', g => { rr(g, '#6a2a2a', 1, 2, 14, 12); rr(g, '#8a3a34', 2, 2, 12, 4); rr(g, '#2a0a0a', 2, 8, 12, 5); for (let x = 2; x < 14; x += 2) { rr(g, '#e8e2cc', x, 8, 1, 2); rr(g, '#e8e2cc', x + 1, 11, 1, 2); }
    rr(g, '#ff3a2a', 4, 4, 2, 2); rr(g, '#ff3a2a', 10, 4, 2, 2); rr(g, '#5a5e60', 0, 6, 1, 6); rr(g, '#5a5e60', 15, 6, 1, 6); }),
  dowsing_bone: art('db', g => { ln(g, '#e8e2cc', 3, 13, 12, 4, 2); rr(g, '#f6f0dc', 11, 2, 3, 3); rr(g, '#f6f0dc', 2, 12, 3, 3); rr(g, '#bdb59a', 13, 4, 1, 1); rr(g, '#bdb59a', 2, 14, 1, 1);
    dots(g, '#bfe8ff', [7, 7, 8, 8, 9, 6, 6, 9]); }),
  iron_mace: art('im', PXA(T_MACE, { L: '#ffffff', M: '#c8c8c8', D: '#7a7a7a', h: '#7a5634', k: '#4a3220' })),
  bogward_mead: art('bw', g => { rr(g, '#5a3a22', 6, 1, 4, 2); rr(g, '#c8c8c0', 6, 3, 4, 2); rr(g, '#c8c8c0', 4, 5, 8, 9); rr(g, '#c8c8c0', 3, 7, 10, 6); rr(g, '#4a8a2a', 4, 7, 8, 6); rr(g, '#8ccf4a', 4, 7, 3, 2); rr(g, '#d8ffb0', 5, 8, 1, 1);
    rr(g, '#2a5a12', 5, 12, 6, 1); rr(g, '#e8e8e0', 4, 5, 1, 2); }),
};
let GEAR_ST = 'workbench', MEAD_ST = 'workbench';
function defineItems() {
  if (!hasInv() || typeof ITEMS === 'undefined') return;
  const D = d => { try { Inv.defineItem(Object.assign({ icon: ICONS[d.id] }, d)); } catch (e) { console.error('swamp item', d.id, e); } };
  D({ id: 'scrap_iron', name: 'Scrap Iron', weight: 3, desc: 'Rusty junk from the sunken crypts. Smelt it in a Furnace for Iron.' });
  D({ id: 'grave_bones', name: 'Grave Bones', weight: .5, stack: 50, rarity: 'uncommon', desc: 'Wet bones of the drowned. The Bone Pit wants ten.' });
  D({ id: 'bog_bloom', name: 'Bog Bloom', weight: .1, stack: 50, desc: 'A pale flower that grows by black water. Brewed into Bogward Mead.' });
  D({ id: 'ooze', name: 'Ooze', weight: .3, stack: 50, desc: 'What is left of a Bog Blob. It stings.' });
  D({ id: 'rotmaw_trophy', name: 'Rotmaw Trophy', kind: 'trophy', stack: 20, weight: 2, rarity: 'boss', desc: 'A mouth full of chains. Hang it at the Ring of Oaths.' });
  D({ id: 'dowsing_bone', name: 'Dowsing Bone', kind: 'material', stack: 1, weight: .5, rarity: 'boss', desc: 'It hums near silver. Silver sleeps in the Mountains.' });
  D({ id: 'iron_mace', name: 'Iron Mace', kind: 'weapon', rarity: 'rare', tier: 'Iron', tint: '#d8d8d8', durability: 400, weight: 3.5, weapon: { dmg: 17, speed: .85, stamina: 9 },
    desc: 'Blunt. Crushes the dead: extra damage to Rotting Dead.' });
  D({ id: 'bogward_mead', name: 'Bogward Mead', kind: 'material', stack: 10, weight: .5, rarity: 'uncommon', desc: 'Use it (right-click / Use button) to drink: poison barely hurts for 10 minutes.' });
  try { if (typeof Stations !== 'undefined' && Stations && Stations.addSmelt) Stations.addSmelt('scrap_iron', 'iron_ingot', 10, .5);
    else Inv.addRecipe({ out: 'iron_ingot', needs: { scrap_iron: 1, wood: 1 }, station: 'workbench' }); } catch (e) { console.error(e); }
  if (ITEMS.iron_ingot) ITEMS.iron_ingot.desc = 'Smelted from Scrap Iron. Iron weapons and armour.';
}
defineItems();
// iron gear and mead: at the Forge / Cauldron when another module provides them, else at the workbench (checked once everything loaded)
let recipesDone = false;
function lateRecipes() {
  if (recipesDone || !hasInv() || typeof ITEMS === 'undefined') return; recipesDone = true;
  const A = r => { try { Inv.addRecipe(r); } catch (e) { console.error(e); } };
  if (ITEMS.forge) { GEAR_ST = 'forge'; A({ out: 'iron_mace', needs: { iron_ingot: 7, wood: 3, leather: 2 }, station: 'forge', lvl: 2 }); }
  else {
    A({ out: 'iron_mace', needs: { iron_ingot: 7, wood: 3, leather: 2 }, station: 'workbench' });
    for (const [out, needs] of [['iron_sword', { iron_ingot: 6, wood: 2, leather: 2 }], ['iron_axe', { iron_ingot: 6, wood: 4 }], ['iron_pickaxe', { iron_ingot: 6, wood: 3 }],
      ['iron_helmet', { iron_ingot: 5, deer_hide: 2 }], ['iron_chestplate', { iron_ingot: 8, deer_hide: 2 }], ['iron_leggings', { iron_ingot: 7, deer_hide: 2 }], ['iron_boots', { iron_ingot: 4, deer_hide: 2 }]])
      if (ITEMS[out]) A({ out, needs, station: 'workbench' });
  }
  MEAD_ST = ITEMS.cauldron ? 'cauldron' : 'workbench';
  A({ out: 'bogward_mead', n: 2, needs: { bog_bloom: 2, ooze: 2, resin: 1 }, station: MEAD_ST });
}
const stName = s => ({ forge: 'Forge', cauldron: 'Cauldron', workbench: 'Workbench' })[s] || s;
const IRON_WEAPONS = ['iron_sword', 'iron_mace', 'iron_axe'];
const hasAny = ids => ids.some(id => count(id) > 0) || (hasInv() && Inv.armorPieces && Inv.armorPieces().some(s => s && ids.includes(s.id)));

// =====================================================================================================
//  World generation: the Swamp in the south-east (index.html SWAMP: low wet ground behind a channel)
// =====================================================================================================
const SW = typeof SWAMP !== 'undefined' ? SWAMP : { cx: 138, cz: 138, r: 19 };
const G0 = SEA;                                                    // top of the swamp floor (you stand at G0 + 1)
const PIT = { cx: 143.5, cz: 144.5, x: 143, z: 144, y: G0, r: 8 };
const CRYPTS = [{ x: 128, z: 140, ax: 0, az: 1 }, { x: 141, z: 128, ax: -1, az: 0 }];
const touched = new Set();
const setB = (x, y, z, t) => { set(x, y, z, t); touched.add(Math.floor(x / CS) + ',' + Math.floor(z / CS)); };
const bio = (x, z) => { x = Math.floor(x); z = Math.floor(z); return x < 0 || z < 0 || x >= WX || z >= WZ ? 0 : biome[z * WX + x]; };
const swk = (x, z) => smoothstep(SW.r + 12, SW.r + 2, Math.hypot(x - SW.cx, z - SW.cz));      // 0..1 how deep in the swamp
const inSwamp = (x, z) => swk(x, z) > .5;
function topY(x, z) { for (let y = WY - 1; y > 0; y--) { const t = get(x, y, z); if (BLOCK[t].solid && t !== LOG && t !== LEAVES && t !== DEAD) return y; } return 0; }
const RINGXZ = () => { const r = MW() && MW().RING; return r ? { x: r.cx, z: r.cz } : { x: 70.5, z: 96.5 }; };
const WALK = (() => { const r = RINGXZ(), dx = r.x - SW.cx, dz = r.z - SW.cz, l = Math.hypot(dx, dz); return { dx: dx / l, dz: dz / l }; })();
const walkPt = t => ({ x: SW.cx + WALK.dx * t, z: SW.cz + WALK.dz * t });
const GATE = walkPt(SW.r + 13), LANDING = walkPt(SW.r - 5);
// crypt local frame: u along the entrance axis (door at u = +5), v across
const cl = (c, u, v) => [c.x + c.ax * u + c.az * v, c.z + c.az * u + c.ax * v];
function cryptLocal(c, x, z) { const dx = x - (c.x + .5), dz = z - (c.z + .5); return { u: dx * c.ax + dz * c.az, v: dx * c.az + dz * c.ax }; }
const inCrypt = (c, p) => { const l = cryptLocal(c, p.x, p.z); return Math.abs(l.u) < 4.7 && Math.abs(l.v) < 3.7 && p.y < G0 + 4; };
const cryptAt = p => CRYPTS.find(c => inCrypt(c, p)) || null;
function zone(x, z) {
  if (Math.hypot(x + .5 - PIT.cx, z + .5 - PIT.cz) < PIT.r + 1.5) return true;
  for (const c of CRYPTS) { const l = cryptLocal(c, x + .5, z + .5); if (l.u > -6.5 && l.u < 9.5 && Math.abs(l.v) < 5.5) return true; }
  const t = (x + .5 - SW.cx) * WALK.dx + (z + .5 - SW.cz) * WALK.dz, px = SW.cx + WALK.dx * t, pz = SW.cz + WALK.dz * t;
  return t > 8 && t < SW.r + 12 && Math.hypot(x + .5 - px, z + .5 - pz) < 2.6;
}
function column(x, z, top, topT, fillT = MUD, clear = 9) {
  for (let y = 1; y < top; y++) if (!BLOCK[get(x, y, z)].solid || get(x, y, z) === WATER) setB(x, y, z, y < top - 3 ? STONE : fillT);
  setB(x, top, z, topT); for (let y = top + 1; y <= top + clear; y++) setB(x, y, z, AIR); hmap[z * WX + x] = top;
}
const SCRAPS = [], BONEP = [];
function buildCrypt(c, i) {
  const S = (u, v, y, t) => { const [x, z] = cl(c, u, v); setB(x, y, z, t); };
  for (let u = -6; u <= 9; u++) for (let v = -5; v <= 5; v++) { const [x, z] = cl(c, u, v); column(x, z, G0, u > 5 || Math.abs(v) > 4 ? MUD : CBRICK, MUD, 12); }
  for (let u = -5; u <= 5; u++) for (let v = -4; v <= 4; v++) {
    const wall = Math.abs(u) === 5 || Math.abs(v) === 4;
    for (let y = G0 + 1; y <= G0 + 3; y++) S(u, v, y, wall ? CBRICK : AIR);
    S(u, v, G0 + 4, CBRICK); if (TR() < .25 && !wall) S(u, v, G0 + 5, MUD);
  }
  // mud heaped against the walls: it looks half swallowed by the bog
  for (let u = -6; u <= 6; u++) for (let v = -5; v <= 5; v++) { if (Math.abs(u) < 6 && Math.abs(v) < 5) continue; if (u === 6 && Math.abs(v) <= 1) continue;
    S(u, v, G0 + 1, MUD); if (TR() < .5) S(u, v, G0 + 2, BOG); }
  // the sealed door (2 high) under an arch
  const [dx, dz] = cl(c, 5, 0); c.door = { x: dx, z: dz, y: G0 + 1 }; S(5, 0, G0 + 1, CDOOR); S(5, 0, G0 + 2, CDOOR);
  for (const v of [-1, 1]) for (let y = G0 + 1; y <= G0 + 5; y++) S(6, v, y, CBRICK); S(6, 0, G0 + 4, CBRICK); S(6, 0, G0 + 5, CBRICK);
  // inside: pillars, a sarcophagus, scrap piles, bone heaps, torches
  for (const v of [-2, 2]) for (let y = G0 + 1; y <= G0 + 3; y++) S(0, v, y, CBRICK);
  S(-4, 0, G0 + 1, CBRICK); S(-3, 0, G0 + 1, CBRICK);
  for (const [u, v, y] of [[-4, -3, 1], [-4, 3, 1], [-2, -3, 1], [-2, 3, 1], [2, -3, 1], [2, 3, 1], [-4, -2, 1], [-4, -3, 2]]) { S(u, v, G0 + y, SCRAP); const [x, z] = cl(c, u, v); SCRAPS.push({ x, y: G0 + y, z, c: i }); }
  for (const [u, v] of [[-3, -1], [-3, 1], [1, -3], [3, 3], [-1, 3]]) { S(u, v, G0 + 1, BONES); const [x, z] = cl(c, u, v); BONEP.push({ x, y: G0 + 1, z }); }
  if (typeof TORCH !== 'undefined') for (const [u, v] of [[-4, -1], [4, -3], [4, 3]]) S(u, v, G0 + 1, TORCH);
  c.cx = c.x + .5; c.cz = c.z + .5;
  const [gx, gz] = cl(c, 8, 0); c.gate = { x: gx + .5, z: gz + .5 };
  const [ix, iz] = cl(c, 3, 0); c.inside = { x: ix + .5, z: iz + .5 };
}
const haloSprites = [];
function buildPit() {
  const { x: cx, z: cz } = PIT;
  for (let dz = -PIT.r - 2; dz <= PIT.r + 2; dz++) for (let dx = -PIT.r - 2; dx <= PIT.r + 2; dx++) {
    const r = Math.hypot(dx, dz); if (r > PIT.r + 1.6) continue; const x = cx + dx, z = cz + dz;
    const ring = r >= PIT.r - 1.6 && r < PIT.r - .4;
    column(x, z, G0, ring ? CBRICK : r > PIT.r - .4 ? BOG : TR() < .35 ? BOG : MUD, MUD, 16);
  }
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) setB(cx + dx, G0 + 1, cz + dz, CBRICK);
  setB(cx, G0 + 2, cz, BALTAR);
  for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + .3, x = Math.round(cx + Math.cos(a) * (PIT.r - 1)), z = Math.round(cz + Math.sin(a) * (PIT.r - 1));
    for (let y = G0 + 1; y <= G0 + 3; y++) setB(x, y, z, CBRICK); const hs = halo(0xff3a2a, 2.2, .35); hs.position.set(x + .5, G0 + 4.5, z + .5); scene.add(hs); haloSprites.push(hs); }
  for (let k = 0; k < 14; k++) { const a = TR() * Math.PI * 2, r = 2.5 + TR() * (PIT.r - 4.5), x = Math.round(cx + Math.cos(a) * r), z = Math.round(cz + Math.sin(a) * r);
    if (get(x, G0 + 1, z) === AIR) setB(x, G0 + 1, z, BONES); }
  const hs = halo(0xff3a2a, 3.4, .45); hs.position.set(cx + .5, G0 + 2.6, cz + .5); scene.add(hs); haloSprites.push(hs);
}
function buildWalk() {
  let posts = 0;
  for (let t = 9; t < SW.r + 14; t += .4) {
    const p = walkPt(t);
    for (const w of [-1, 0, 1]) { const x = Math.round(p.x - WALK.dz * w), z = Math.round(p.z + WALK.dx * w); if (x < 2 || z < 2 || x > WX - 3 || z > WZ - 3) continue;
      const h = topY(x, z);
      if (h < G0 || get(x, G0, z) === WATER) { setB(x, G0, z, PLANKS); for (let y = G0 + 1; y < G0 + 4; y++) if (get(x, y, z) !== AIR) setB(x, y, z, AIR);
        if (w && (posts++ % 7) === 0) { for (let y = G0 - 3; y < G0; y++) setB(x, y, z, LOG); setB(x, G0 + 1, z, LOG); } }
      else if (t < SW.r + 2) { for (let y = h + 1; y < h + 4; y++) if (get(x, y, z) !== AIR && !BLOCK[get(x, y, z)].solid) setB(x, y, z, AIR); }
    }
  }
}
function deadTree(x, h, z, rng) {
  const th = 4 + ((rng() * 5) | 0);
  for (let i = 1; i <= th; i++) setB(x, h + i, z, DEAD);
  const nb = 1 + ((rng() * 3) | 0);
  for (let k = 0; k < nb; k++) { const [ax, az] = [[1, 0], [-1, 0], [0, 1], [0, -1]][(rng() * 4) | 0], y = h + 2 + ((rng() * (th - 2)) | 0), L = 1 + ((rng() * 2) | 0);
    for (let i = 1; i <= L; i++) if (get(x + ax * i, y + (i > 1 ? 1 : 0), z + az * i) === AIR) setB(x + ax * i, y + (i > 1 ? 1 : 0), z + az * i, DEAD); }
  if (rng() < .5) setB(x + (rng() < .5 ? 1 : -1), h + th + 1, z, DEAD);
}
let POOLN = 0;
const wetland = (x, z) => bio(x, z) === 2 || Math.hypot(x + .5 - SW.cx, z + .5 - SW.cz) < SW.r + 9;   // the bog spills over the channel
const isPool = (x, z) => get(Math.floor(x), G0, Math.floor(z)) === WATER && wetland(Math.floor(x), Math.floor(z));
function genSwamp() {
  const rng = TR;
  CRYPTS.forEach(buildCrypt);
  buildPit(); buildWalk();
  // ground: bog grass and mud, black pools
  for (let z = 3; z < WZ - 3; z++) for (let x = 3; x < WX - 3; x++) {
    if (!wetland(x, z) || zone(x, z)) continue;
    const h = topY(x, z), t = get(x, h, z); if ((t !== GRASS && t !== DIRT && t !== SAND) || h > G0 + 3) continue;
    const n = vnoise(x * .17 + 5, z * .17 + 9) + (vnoise(x * .5, z * .5) - .5) * .25;
    if (n > .52 && h <= G0 + 1) {
      for (let y = h; y > G0; y--) setB(x, y, z, AIR); setB(x, G0, z, WATER); setB(x, G0 - 1, z, WATER); setB(x, G0 - 2, z, MUD);
      for (let y = G0 + 1; y < G0 + 3; y++) if (BLOCK[get(x, y, z)].kind === 'cross') setB(x, y, z, AIR);
      hmap[z * WX + x] = G0 - 2; POOLN++; continue;
    }
    setB(x, h, z, rng() < .72 ? BOG : MUD); if (get(x, h - 1, z) === DIRT) setB(x, h - 1, z, MUD);
    if (BLOCK[get(x, h + 1, z)].kind === 'cross') setB(x, h + 1, z, AIR);
  }
  // dead trees, reeds by the water, bog blooms
  const wet = (x, z) => get(x + 1, G0, z) === WATER || get(x - 1, G0, z) === WATER || get(x, G0, z + 1) === WATER || get(x, G0, z - 1) === WATER;
  for (let z = 4; z < WZ - 4; z++) for (let x = 4; x < WX - 4; x++) {
    if (!wetland(x, z) || zone(x, z)) continue;
    const h = topY(x, z), t = get(x, h, z); if ((t !== BOG && t !== MUD) || get(x, h + 1, z) !== AIR) continue;
    const r = rng(), w = wet(x, z);
    if (r < .05 && !w) { let ok = true; for (let dz = -2; dz <= 2 && ok; dz++) for (let dx = -2; dx <= 2; dx++) if (get(x + dx, h + 1, z + dz) === DEAD) { ok = false; break; } if (ok) deadTree(x, h, z, rng); }
    else if (w && r < .4) setB(x, h + 1, z, REED);
    else if (w && r < .47) setB(x, h + 1, z, BLOOM);
    else if (r < .1) setB(x, h + 1, z, TALLGRASS);
    else if (r < .112) setB(x, h + 1, z, BLOOM);
  }
  buildRunes();
}
// ---- bog rune stones (lore)
const LORE = [];
const LORE_TEXT = [
  { name: 'Stone of the Drowned', lines: ['Slime covers the runes. Vesk scrapes it off with his beak and reads:', '"The ship-folk sank here with their iron. The bog kept the iron, and the iron kept them."'] },
  { name: 'Stone of the Maw', lines: ['A wide mouth is carved under the runes, full of chains:', '"It was fed the drowned so that it would not grow old. It is still hungry."'] },
  { name: 'Stone of the Rain', lines: ['The stone is cold and always wet. Vesk reads:', '"The rain here has not stopped since the Watcher wept. Or since he laughed. The runes do not say which."'] },
];
function buildRunes() {
  const spots = [walkPt(SW.r - 9), { x: 152, z: 132 }, { x: PIT.cx - 11, z: PIT.cz + 6 }];
  spots.forEach((s, i) => {
    let best = null;
    for (let dz = -6; dz <= 6; dz++) for (let dx = -6; dx <= 6; dx++) { const x = Math.round(s.x) + dx, z = Math.round(s.z) + dz; if (x < 8 || z < 8 || x > WX - 8 || z > WZ - 8 || zone(x, z)) continue;
      const h = topY(x, z), t = get(x, h, z); if ((t !== BOG && t !== MUD) || h < G0) continue;
      const sc = Math.hypot(dx, dz); if (!best || sc < best.sc) best = { x, z, h, sc }; }
    if (!best) return; const { x, z, h } = best;
    for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { setB(x + a, h, z + b, MUD); const t = get(x + a, h + 1, z + b); if (BLOCK[t].kind === 'cross' || t === DEAD) setB(x + a, h + 1, z + b, AIR); }
    for (let y = h + 1; y <= h + 3; y++) setB(x, y, z, SWRUNE); for (let y = h + 4; y < h + 9; y++) if (get(x, y, z) === DEAD) setB(x, y, z, AIR);
    const hs = halo(0xc8ff6a, 2.2, .3); hs.position.set(x + .5, h + 4.4, z + .5); scene.add(hs); haloSprites.push(hs);
    LORE.push({ x, z, y: h, ...LORE_TEXT[i], read: false });
  });
}
try { genSwamp(); } catch (e) { console.error('swamp: generation failed', e); }
for (const k of touched) { const [a, b] = k.split(',').map(Number); buildChunk(a, b); }
let WAY = null;
try { const m = MW(), c = CRYPTS[1]; if (m && m.addWaystone) { const [wx, wz] = cl(c, 8, 4);
  WAY = m.addWaystone(wx, wz, { name: 'Waystone', who: 'Vesk', lines: ['...the drowned feed it still...', '...it waits under the bones, in the pit where the red lights burn...'],
    pin: () => ({ x: PIT.cx, z: PIT.cz, label: 'Bone Pit' }), onRead: () => { F.waystone = true; advance('waystone'); } }); } } catch (e) { console.error('swamp: waystone', e); }
const loreAt = (x, y, z) => LORE.find(l => l.x === x && l.z === z && y > l.y && y <= l.y + 3);

// =====================================================================================================
//  Particles and effects: puffs, telegraph rings, poison clouds, bile, arrows
// =====================================================================================================
const parts = [], fxObjs = [];
const MUDM = ['#3a2e22', '#4a3a2a', '#2a2018'].map(c => new THREE.MeshLambertMaterial({ color: c }));
const FLESHM = ['#8a3a34', '#6a2a2a', '#b85a4a'].map(c => new THREE.MeshLambertMaterial({ color: c }));
const GREENM = [0x8cff6a, 0x5ab82a, 0xd8ffb0].map(c => new THREE.MeshBasicMaterial({ color: c, fog: false }));
const BONEM = ['#e8e2cc', '#bdb59a'].map(c => new THREE.MeshLambertMaterial({ color: c }));
const PALEM = [0xdfe8ff, 0x9fb4d8].map(c => new THREE.MeshBasicMaterial({ color: c, fog: false, transparent: true, opacity: .7 }));
function puff(c, size = 1, n = 12, mats = MUDM, rise = 1, spread = 1) {
  for (let i = 0; i < n && parts.length < 240; i++) {
    const m = new THREE.Mesh(UNIT, mats[i % mats.length]), s = (.11 + R() * .13) * Math.sqrt(size);
    m.scale.setScalar(s); m.position.set(c.x + (R() - .5) * size * .8, c.y + (R() - .5) * size, c.z + (R() - .5) * size * .8); scene.add(m);
    const life = .5 + R() * .5;
    parts.push({ m, v: new V3((R() - .5) * 1.8 * spread, (.5 + R() * 1.4) * rise, (R() - .5) * 1.8 * spread), life, max: life, s0: s, g: rise > 0 ? -1.2 : 14 });
  }
}
function updateParts(dt) {
  for (let i = parts.length - 1; i >= 0; i--) { const q = parts[i]; q.life -= dt; q.v.y -= q.g * dt; q.m.position.addScaledVector(q.v, dt);
    q.m.scale.setScalar(Math.max(.001, q.s0 * (q.life / q.max))); if (q.life <= 0) { scene.remove(q.m); parts.splice(i, 1); } }
  for (let i = fxObjs.length - 1; i >= 0; i--) { const o = fxObjs[i]; let alive = false; try { alive = o.upd(dt); } catch (e) { console.error(e); alive = false; }
    if (!alive) { try { o.kill(); } catch (e) { /* ignore */ } fxObjs.splice(i, 1); } }
}
function groundAt(x, z, fromY, wet) { const xi = Math.floor(x), zi = Math.floor(z);
  for (let y = Math.min(WY - 1, Math.floor(fromY)); y >= 0; y--) { const t = get(xi, y, zi); if (BLOCK[t].solid || (wet && t === WATER)) return y + 1; } return 0; }
// telegraph ring on the ground (red = get out, green = bile lands here)
const ringTexs = {};
const ringTex = col => ringTexs[col] || (ringTexs[col] = charTex(32, 32, g => { const d = shade(col, -.55);
  for (let a = 0; a < 64; a++) { const x = Math.round(16 + Math.cos(a / 64 * Math.PI * 2) * 13), y = Math.round(16 + Math.sin(a / 64 * Math.PI * 2) * 13); rr(g, d, x - 1, y - 1, 3, 3); }
  for (let a = 0; a < 64; a++) { const x = Math.round(16 + Math.cos(a / 64 * Math.PI * 2) * 13), y = Math.round(16 + Math.sin(a / 64 * Math.PI * 2) * 13); rr(g, col, x, y); }
  for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; ln(g, d, 16 + Math.cos(a) * 5, 16 + Math.sin(a) * 5, 16 + Math.cos(a) * 11, 16 + Math.sin(a) * 11, 2); } }));
const PLANE = new THREE.PlaneGeometry(1, 1);
function ring(x, z, py, size, dur, col = '#ff3a2a') {
  const y = groundAt(x, z, py + 3, true) + .07;
  const m = new THREE.Mesh(PLANE, new THREE.MeshBasicMaterial({ map: ringTex(col), transparent: true, opacity: .3, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.scale.setScalar(size); scene.add(m); let t = 0;
  const mk = { x, y, z, dead: false, m, kill() { if (mk.dead) return; mk.dead = true; scene.remove(m); m.material.dispose(); } };
  fxObjs.push({ upd(dt) { if (mk.dead) return false; t += dt; const k = Math.min(1, t / dur); m.rotation.z += dt * (1 + k * 3); m.material.opacity = .3 + k * .7 * (.7 + .3 * Math.sin(t * 30)); return t < dur + .2; }, kill() { mk.kill(); } });
  return mk;
}
// a red stripe on the ground: Rotmaw's charge line
function stripe(x0, z0, x1, z1, py, dur) {
  const L = Math.hypot(x1 - x0, z1 - z0), m = new THREE.Mesh(PLANE, new THREE.MeshBasicMaterial({ color: 0xff3a2a, transparent: true, opacity: .2, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide }));
  m.rotation.order = 'YXZ'; m.rotation.set(-Math.PI / 2, Math.atan2(x1 - x0, z1 - z0), 0); m.scale.set(2.6, L, 1);
  m.position.set((x0 + x1) / 2, groundAt((x0 + x1) / 2, (z0 + z1) / 2, py + 3, true) + .08, (z0 + z1) / 2); scene.add(m); let t = 0;
  fxObjs.push({ upd(dt) { t += dt; m.material.opacity = .2 + Math.min(1, t / dur) * .6 * (.7 + .3 * Math.sin(t * 28)); return t < dur; }, kill() { scene.remove(m); m.material.dispose(); } });
}

// ---- poison (blob clouds, bile): damage over time; Bogward Mead resists it
let poisonT = 0, poisonTick = 0, meadT = 0;
const poisonIcon = g => { rr(g, '#1a3a12', 4, 2, 8, 12); rr(g, '#4e9331', 5, 3, 6, 10); rr(g, '#8cff6a', 6, 4, 2, 3); rr(g, '#2a5a1a', 5, 1, 6, 2); };
const meadIcon = g => { rr(g, '#c8c8c0', 5, 2, 6, 3); rr(g, '#c8c8c0', 3, 5, 10, 9); rr(g, '#4a8a2a', 4, 7, 8, 6); rr(g, '#d8ffb0', 5, 8, 2, 1); };
const wetIcon = g => { for (const [x, y] of [[4, 2], [10, 4], [6, 9], [11, 10]]) { rr(g, '#3a6ad8', x, y + 1, 2, 3); rr(g, '#9ac0ff', x, y, 1, 2); } };
const status = (k, o) => { try { if (typeof Combat !== 'undefined' && Combat.addStatus) Combat.addStatus(k, o); } catch (e) { /* optional */ } };
const unstatus = k => { try { if (typeof Combat !== 'undefined' && Combat.removeStatus) Combat.removeStatus(k); } catch (e) { /* optional */ } };
function poison(secs) {
  if (meadT > 0) secs *= .25;
  poisonT = Math.max(poisonT, secs); status('sw_poison', { name: 'Poisoned', secs: poisonT, icon: poisonIcon, color: '#4e9331' });
}
function poisonUpdate(dt) {
  if (meadT > 0) { meadT -= dt; if (meadT <= 0) { unstatus('sw_mead'); say('Your Bogward Mead wore off.', 2.5); } }
  if (poisonT <= 0) return; poisonT -= dt; poisonTick -= dt;
  if (poisonTick <= 0) { poisonTick = meadT > 0 ? 3.6 : 1.2; const d = DEFS[cur]; if (d.hp > 1) { d.hp -= 1; drawStats(); flashEl.style.background = '#2f8a1a'; fx.flash = Math.max(fx.flash, .25); } }
  if (poisonT <= 0) unstatus('sw_poison');
}
function drinkMead() {
  if (!removeItem('bogward_mead', 1)) return false;
  meadT = 600; poisonT = Math.min(poisonT, 1); SS.drink(); status('sw_mead', { name: 'Bogward', secs: 600, icon: meadIcon, color: '#8ccf4a' });
  say('Bogward Mead: poison barely hurts for 10 minutes.', 3); F.mead = true; advance('mead'); return true;
}
const P_HIT = (x, z, y, r, h = 2.2) => { const P = PL(); return !calm() && Math.hypot(P.pos.x - x, P.pos.z - z) < r && Math.abs(P.pos.y - y) < h; };
// a green cloud that lingers where a blob burst (or bile landed)
function cloud(x, y, z, r = 2.4, secs = 5, by = 'Poison') {
  const g = new THREE.Group(); g.position.set(x, y, z); const bits = [];
  for (let i = 0; i < 14; i++) { const m = new THREE.Mesh(UNIT, GREENM[i % 2]); m.scale.setScalar(.25 + R() * .3); m.position.set((R() - .5) * r * 1.6, R() * 1.2, (R() - .5) * r * 1.6); g.add(m); bits.push({ m, ph: R() * 6 }); }
  const h = halo(0x8cff6a, r * 2.6, .35); h.position.y = .6; g.add(h); scene.add(g);
  const mk = ring(x, z, y, r * 2, .01, '#8cff6a'); let t = 0, tick = 0;
  fxObjs.push({ upd(dt) { t += dt; tick -= dt; const k = t < secs - 1 ? 1 : Math.max(0, secs - t);
      for (const b of bits) { b.m.position.y += dt * .25; if (b.m.position.y > 1.6) b.m.position.y = 0; b.m.rotation.y += dt; }
      g.scale.setScalar(.5 + .5 * Math.min(1, t * 3)); h.material.opacity = .35 * k; mk.m.material.opacity = .5 * k;
      if (tick <= 0 && P_HIT(x, z, y, r, 2.4)) { tick = .9; poison(5); hurt(1, by, 0, 0); }
      return t < secs; }, kill() { scene.remove(g); h.material.dispose(); mk.kill(); } });
}
// arrows (Rotting Archer): a straight shaft with a little drop
const ARROW_M = new THREE.MeshLambertMaterial({ color: 0x6a4a2a });
const shots = [];
function shoot(from, to, by, speed = 16, dmg = 4) {
  const g = new THREE.Group(); const sh = new THREE.Mesh(boxGeo(.05, .05, .7), ARROW_M); g.add(sh); const tip = new THREE.Mesh(boxGeo(.08, .08, .12), glowMat(0x9a9a9a)); tip.position.z = .38; g.add(tip);
  g.position.copy(from); const v = to.clone().sub(from).normalize().multiplyScalar(speed); v.y += .9; g.lookAt(from.clone().add(v)); scene.add(g);
  shots.push({ g, v, life: 3, by, dmg }); SS.bow();
}
function updateShots(dt) {
  const P = PL();
  for (let i = shots.length - 1; i >= 0; i--) { const s = shots[i], p = s.g.position; s.life -= dt; s.v.y -= 3 * dt; p.addScaledVector(s.v, dt); s.g.lookAt(p.clone().add(s.v));
    let gone = s.life <= 0;
    if (!gone && !calm()) { const ex = p.x - P.pos.x, ez = p.z - P.pos.z, ey = p.y - (P.pos.y + .9);
      if (ex * ex + ez * ez < .4 && Math.abs(ey) < 1.1) { const l = Math.hypot(s.v.x, s.v.z) || 1; hurt(s.dmg, s.by, s.v.x / l * .5, s.v.z / l * .5); gone = true; } }
    if (!gone && BLOCK[get(Math.floor(p.x), Math.floor(p.y), Math.floor(p.z))].solid) gone = true;
    if (gone) { scene.remove(s.g); shots.splice(i, 1); } }
}

// =====================================================================================================
//  Creatures (mod style: cubes, strong silhouettes, 2-3 colours + 1 glowing accent)
// =====================================================================================================
const CREATURES = [];
class Creature {
  constructor(kind, name, hp) {
    this.kind = kind; this.name = name; this.max = this.hp = hp; this.dead = 0; this.flash = 0; this.flashOn = false;
    this.yaw = R() * Math.PI * 2; this.phase = 0; this.timer = 0; this.speed = 0; this.vy = 0; this.kb = { x: 0, z: 0 }; this.stun = 0;
    this.step = 1; this.turn = 7; this.stride = 3; this.height = 1; this.matMap = new Map(); this.mats = []; this.dying = 0; this.t = R() * 10;
    this.group = new THREE.Group(); this.pos = this.group.position; this.tipDir = R() < .5 ? 1 : -1;
  }
  m(tex) { if (Array.isArray(tex)) return tex.map(t => this.m(t)); if (tex && tex.isMaterial) return tex;
    let mm = this.matMap.get(tex); if (!mm) { mm = new THREE.MeshLambertMaterial({ map: tex }); this.matMap.set(tex, mm); this.mats.push(mm); } return mm; }
  box(w, h, d, tex, x, y, z, parent = this.group) { const b = new THREE.Mesh(boxGeo(w, h, d), this.m(tex)); b.position.set(x, y, z); parent.add(b); return b; }
  pivot(x, y, z, parent = this.group) { const p = new THREE.Group(); p.position.set(x, y, z); parent.add(p); return p; }
  spawnAt(x, z, y) { this.pos.set(x, y != null ? groundAt(x, z, y + 1.5) : topY(Math.floor(x), Math.floor(z)) + 1, z); this.group.rotation.y = this.yaw; scene.add(this.group);
    ENTITIES.push(this); CREATURES.push(this); return this; }
  center() { return new V3(this.pos.x, this.pos.y + this.height * .55, this.pos.z); }
  hit(dmg, dir) {
    if (this.dead > 0 || this.removed || this.immune) return;
    if (this.isBoss && (dlgOpen() || cine)) return;
    this.hp -= +dmg || 0; this.flash = .35; this.aggro = 20;
    const kb = this.kbRes ?? 1;
    if (dir && kb > 0) { this.kb.x += (dir.x || 0) * 5 * kb; this.kb.z += (dir.z || 0) * 5 * kb; this.vy = Math.max(this.vy, 3.2 * kb); }
    this.onHurt(dir); if (this.hp <= 0) this.die();
  }
  stagger(secs) { this.stun = Math.max(this.stun, this.isBoss ? Math.min(secs, 1) : secs); this.wind = 0; }
  onHurt() {}
  die() { this.dead = 1; this.dying = 0; this.setFlash(true); try { onKill(this); } catch (e) { console.error(e); } }
  setFlash(on) { if (on === this.flashOn) return; this.flashOn = on; for (const m of this.mats) if (m.emissive) m.emissive.setRGB(on ? .75 : 0, 0, 0); }
  loot() {}
  deathAnim(dt) { this.dying += dt; this.group.rotation.z = Math.min(1, this.dying / .45) * Math.PI / 2 * this.tipDir;
    if (this.dying > .8) { const c = this.center(); puff(c, this.height, 10 + this.height * 6); this.loot(c); this.remove(); } }
  remove() { if (this.removed) return; this.removed = true; this.dead = Math.max(this.dead, 1); scene.remove(this.group); for (const m of this.mats) m.dispose(); }
  tryMove(nx, nz) {
    if (nx < 3 || nz < 3 || nx > WX - 3 || nz > WZ - 3) return false;
    const gy = groundAt(nx, nz, this.pos.y + this.step + .2);
    if (gy - this.pos.y > this.step + .05) return false;
    if (get(Math.floor(nx), Math.floor(gy), Math.floor(nz)) === WATER) return false;
    if (this.headroom) { for (let y = Math.floor(gy); y < gy + this.headroom; y++) if (BLOCK[get(Math.floor(nx), y, Math.floor(nz))].solid) return false; }
    this.pos.x = nx; this.pos.z = nz; return true;
  }
  face(dx, dz) { this.yaw = Math.atan2(dx, dz); }
  wander(dt, sp = 1.1) { this.timer -= dt; if (this.timer <= 0) { this.moving = R() < .55; this.yaw += (R() - .5) * 2.6; this.timer = 2 + R() * 4; }
    if (this.moving) { this.speed = sp; if (this.blocked) { this.yaw += 1.8 + R(); this.timer = Math.min(this.timer, .8); } } }
  physics(dt) {
    const gy = groundAt(this.pos.x, this.pos.z, this.pos.y + this.step + .1);
    if (this.vy > 0 || this.pos.y > gy + .02) { this.vy -= 24 * dt; this.pos.y += this.vy * dt; if (this.pos.y <= gy) { this.pos.y = gy; this.vy = 0; } }
    else { this.pos.y = lerp(this.pos.y, gy, Math.min(1, dt * 14)); this.vy = 0; }
  }
  update(dt) {
    if (this.removed) return;
    if (this.dead > 0) { this.deathAnim(dt); return; }
    this.t += dt;
    const P = PL(), dx = P.pos.x - this.pos.x, dz = P.pos.z - this.pos.z, d = Math.hypot(dx, dz);
    this.dist = d; this.group.visible = d < 100;
    if (this.flash > 0) this.flash -= dt; this.setFlash(this.flash > 0);
    this.speed = 0; if (this.aggro > 0) this.aggro -= dt;
    if (this.stun > 0) { this.stun -= dt; this.wind = 0; } else this.think(dt, P, dx, dz, d);
    const sp = this.speed; let moved = false;
    if (sp > 0) moved = this.tryMove(this.pos.x + Math.sin(this.yaw) * sp * dt, this.pos.z + Math.cos(this.yaw) * sp * dt);
    this.blocked = sp > 0 && !moved;
    if (Math.abs(this.kb.x) + Math.abs(this.kb.z) > .05) { this.tryMove(this.pos.x + this.kb.x * dt, this.pos.z + this.kb.z * dt); const f = Math.exp(-dt * 7); this.kb.x *= f; this.kb.z *= f; }
    this.physics(dt);
    let dr = this.yaw - this.group.rotation.y; dr = Math.atan2(Math.sin(dr), Math.cos(dr)); this.group.rotation.y += dr * Math.min(1, dt * this.turn);
    if (moved) this.phase += dt * sp * this.stride;
    this.animate(dt, moved ? sp : 0);
  }
  think() {} animate() {}
}
const near = (P, e, r) => Math.abs(P.pos.y - e.pos.y) < r;
// ---- Rotting Dead: a drowned warrior. Grey-green flesh, a rusty helm, a notched axe, yellow-green eyes.
function deadT() { return {
  flesh: tx('rd_flesh', 8, 8, '#5d6b4c', g => dots(g, '#3e4a32', [1, 2, 5, 1, 3, 5, 6, 6, 2, 7]), .3),
  face: tx('rd_face', 8, 8, '#5d6b4c', g => { rr(g, '#2a3020', 1, 3, 2, 1); rr(g, '#2a3020', 5, 3, 2, 1); rr(g, '#2a1a14', 2, 5, 4, 2); dots(g, '#d8d0b8', [2, 5, 4, 5, 5, 6]); }, .25),
  helm: tx('rd_helm', 8, 8, '#6e6a62', g => { rr(g, '#8a5a32', 0, 6, 8, 2); dots(g, '#a86a3a', [1, 1, 5, 2, 3, 4]); rr(g, '#4a4640', 3, 0, 2, 8); }, .25),
  cloth: tx('rd_cloth', 8, 8, '#3a3026', g => { for (let x = 0; x < 8; x += 2) rr(g, '#2a221a', x, 5, 1, 3); dots(g, '#4a5a22', [1, 1, 5, 3]); }, .3),
  belt: tx('rd_belt', 8, 4, '#4a3220', g => rr(g, '#8a8a80', 3, 1, 2, 2), .2), rust: tx('rd_rust', 4, 8, '#7a5a3a', g => dots(g, '#4a3220', [1, 1, 2, 4, 1, 6]), .3),
  blade: tx('rd_blade', 8, 8, '#8a8a84', g => { rr(g, '#6a4a2a', 0, 0, 2, 8); dots(g, '#a86a3a', [3, 2, 6, 5, 4, 6]); rr(g, '#c8c8c0', 7, 1, 1, 6); }, .2),
  hood: tx('rd_hood', 8, 8, '#3e3a2e', g => dots(g, '#4a5a22', [1, 1, 3, 2, 6, 1, 5, 5]), .3), bow: tx('rd_bow', 4, 8, '#5a3e22', null, .25),
}; }
class RottingDead extends Creature {
  constructor(archer) {
    super(archer ? 'rotting_archer' : 'rotting_dead', archer ? 'Rotting Archer' : 'Rotting Dead', archer ? 34 : 52);
    this.archer = !!archer; this.height = 1.95; this.stride = 3.5; this.turn = 7; this.cd = 1 + R(); this.wind = 0; this.headroom = 2;
    const T = deadT(), eye = glowMat(0xd8ff4a); this.legs = [];
    for (const s of [-1, 1]) { const p = this.pivot(s * .13, .8, 0); this.box(.16, .8, .18, T.flesh, 0, -.4, 0, p); this.legs.push(p); }
    this.box(.46, .26, .28, T.cloth, 0, .76, 0); this.box(.48, .08, .3, T.belt, 0, .9, 0);
    this.body = this.pivot(0, .9, 0); this.body.rotation.x = .2;
    this.box(.46, .58, .26, [T.flesh, T.flesh, T.cloth, T.flesh, T.cloth, T.flesh], 0, .3, 0, this.body);
    this.head = this.pivot(0, .6, .04, this.body);
    this.box(.4, .4, .38, [T.flesh, T.flesh, T.flesh, T.flesh, T.face, T.flesh], 0, .2, 0, this.head);
    if (archer) { this.box(.48, .34, .46, T.hood, 0, .34, -.02, this.head); this.box(.3, .22, .2, T.hood, 0, .5, -.18, this.head).rotation.x = -.5; }
    else { this.box(.46, .22, .44, T.helm, 0, .38, 0, this.head); this.box(.06, .14, .06, T.rust, -.2, .54, 0, this.head).rotation.z = .4; this.box(.06, .14, .06, T.rust, .2, .54, 0, this.head).rotation.z = -.4;
      this.box(.06, .22, .04, T.helm, 0, .2, .21, this.head); }
    for (const s of [-1, 1]) this.box(.08, .05, .02, eye, s * .1, .22, .195, this.head);
    const h = halo(0xd8ff4a, .5, .25); h.position.set(0, .22, .25); this.head.add(h);
    this.arms = [];
    for (const s of [-1, 1]) { const p = this.pivot(s * .31, .5, 0, this.body); this.box(.14, .66, .14, T.flesh, 0, -.3, 0, p); if (!archer) this.box(.2, .14, .2, T.helm, 0, .02, 0, p); this.arms.push(p); }
    if (archer) { const b = this.pivot(0, -.6, .1, this.arms[0]); this.box(.06, 1.1, .06, T.bow, 0, 0, 0, b); this.box(.06, .3, .06, T.bow, 0, .6, -.1, b).rotation.x = .5; this.box(.06, .3, .06, T.bow, 0, -.6, -.1, b).rotation.x = -.5;
      this.arrowGlow = this.box(.05, .05, .5, glowMat(0xd8ff4a), 0, 0, .2, b); this.arrowGlow.visible = false; this.bowP = b; }
    else { const a = this.box(.06, .7, .06, T.rust, 0, -.62, .22, this.arms[1]); a.rotation.x = 1.3; this.box(.08, .36, .26, T.blade, 0, -.78, .52, this.arms[1]).rotation.x = 1.3; }
  }
  onHurt() { SS.squelch(); puff(this.center(), .6, 3, MUDM, 1, 1); }
  think(dt, P, dx, dz, d) {
    this.cd -= dt;
    const sight = this.archer ? 24 : 20;
    if (calm() || (d > sight && !(this.aggro > 0)) || !near(P, this, 5)) { this.wind = 0; this.wander(dt, .7); return; }
    this.face(dx, dz);
    if (this.archer) {
      if (this.wind > 0) { this.wind -= dt; if (this.wind <= 0) { const p = new V3(); this.bowP.getWorldPosition(p); shoot(p, new V3(P.pos.x, P.pos.y + 1.2, P.pos.z), this.name); this.cd = 2.4 + R(); this.loose = .3; } return; }
      if (d < 6) { this.yaw = Math.atan2(-dx, -dz) + Math.sin(this.t) * .5; this.speed = 2.2; }
      else if (d > 15) this.speed = 2.3;
      else if (this.cd <= 0) { this.wind = 1.1; SS.groan(); }
    } else {
      if (this.wind > 0) { this.wind -= dt; if (this.wind <= 0) { this.swing = .25; SS.chain(); if (d < 2.5 && near(P, this, 2)) hurt(6, this.name, dx / (d || 1), dz / (d || 1)); this.cd = 1.4; } return; }
      if (d < 2.1 && this.cd <= 0) { this.wind = .55; SS.groan(); } else if (d > 1.6) this.speed = 2.5;
    }
    if (this.blocked) { this.yaw += (R() < .5 ? 1 : -1); this.speed = 2.4; }
  }
  animate(dt, sp) {
    const sw = Math.sin(this.phase) * .6 * Math.min(1, sp / 2); this.legs[0].rotation.x = sw; this.legs[1].rotation.x = -sw;
    this.swing = Math.max(0, (this.swing || 0) - dt); this.loose = Math.max(0, (this.loose || 0) - dt); const k = Math.min(1, dt * 14);
    if (this.archer) { const aim = this.wind > 0 || this.loose > 0; this.arms[0].rotation.x = lerp(this.arms[0].rotation.x, aim ? -1.5 : sw * .5, k); this.arms[1].rotation.x = lerp(this.arms[1].rotation.x, this.wind > 0 ? -1.4 : sw * .5, k);
      this.arms[1].rotation.z = this.wind > 0 ? .5 : 0; this.arrowGlow.visible = this.wind > 0; }
    else { this.arms[1].rotation.x = lerp(this.arms[1].rotation.x, this.wind > 0 ? -2.5 : this.swing > 0 ? .3 : -sw * .5 - .5, k); this.arms[0].rotation.x = lerp(this.arms[0].rotation.x, -.9 + sw * .3, k); }
    this.head.rotation.z = Math.sin(this.t * 1.3) * .15;
  }
  loot(c) { if (R() < .55) drop('grave_bones', 1 + (R() < .3 ? 1 : 0), c); if (R() < .3) drop('scrap_iron', 1, c); if (this.archer && R() < .5) drop('arrow', 2 + ((R() * 4) | 0), c); }
}
// ---- Bog Leech: lives in the black pools; a segmented black worm with a red ring mouth
const LEECH_T = () => ({ skin: tx('lc_skin', 8, 8, '#2a1e2a', g => { for (let y = 1; y < 8; y += 3) rr(g, '#1a121a', 0, y, 8, 1); dots(g, '#4a2a3a', [1, 0, 5, 2, 3, 5]); }, .3),
  belly: tx('lc_belly', 8, 8, '#5a3a3a', null, .25), mouth: tx('lc_mouth', 8, 8, '#2a1e2a', g => { rr(g, '#8a1a1a', 1, 1, 6, 6); rr(g, '#1a0606', 2, 2, 4, 4); dots(g, '#e8e2cc', [2, 1, 5, 1, 1, 4, 6, 3]); }, .2) });
class Leech extends Creature {
  constructor() {
    super('bog_leech', 'Bog Leech', 22); this.height = .5; this.stride = 6; this.turn = 6; this.cd = 1; this.kbRes = .3;
    const T = LEECH_T(); this.segs = [];
    for (let i = 0; i < 5; i++) { const s = this.pivot(0, .2, -i * .32); const w = .42 - i * .05; this.box(w, w * .8, .34, i === 0 ? [T.skin, T.skin, T.belly, T.skin, T.mouth, T.skin] : [T.skin, T.skin, T.belly, T.skin, T.skin, T.skin], 0, 0, 0, s); this.segs.push(s); }
    const g = this.box(.2, .06, .02, glowMat(0xff3a2a), 0, .04, .18, this.segs[0]); const h = halo(0xff3a2a, .6, .3); h.position.z = .2; this.segs[0].add(h); this.mouthG = g;
  }
  tryMove(nx, nz) { if (!isPool(nx, nz) || nx < 3 || nz < 3 || nx > WX - 3 || nz > WZ - 3) return false; this.pos.x = nx; this.pos.z = nz; return true; }
  physics(dt) { this.pos.y = G0 + .55 + Math.sin(this.t * 2) * .06; }
  onHurt() { SS.squelch(); puff(this.center(), .5, 4, MUDM, 1, 1); }
  think(dt, P, dx, dz, d) {
    this.cd -= dt;
    if (calm() || d > 12 || !near(P, this, 3)) { this.wander(dt, 1.2); return; }
    this.face(dx, dz); if (d > 1.2) this.speed = 3.2;
    if (d < 1.9 && this.cd <= 0) { this.cd = 1.3; this.bite = .25; SS.bite(); hurt(3, this.name, dx / (d || 1), dz / (d || 1)); }
    if (this.blocked) { this.yaw += (R() < .5 ? 1.5 : -1.5); this.speed = 2; }
  }
  animate(dt, sp) { for (let i = 1; i < this.segs.length; i++) this.segs[i].position.x = Math.sin(this.t * 6 - i * .9) * .12 * (sp > 0 ? 1.5 : .6);
    this.bite = Math.max(0, (this.bite || 0) - dt); this.segs[0].rotation.x = this.bite > 0 ? -.5 : 0; }
  deathAnim(dt) { this.dying += dt; this.group.scale.y = Math.max(.1, 1 - this.dying * 1.5); if (this.dying > .6) { const c = this.center(); puff(c, .8, 8, MUDM, 1, 1); SS.splash(); this.loot(c); this.remove(); } }
  loot(c) { if (R() < .5) drop('ooze', 1, c); }
}
// ---- Bog Blob: a hopping cube of green ooze with a dark core. It bursts into a poison cloud when it dies.
const BLOB_M = new THREE.MeshLambertMaterial({ color: 0x5ab82a, transparent: true, opacity: .72 });
class Blob extends Creature {
  constructor() {
    super('bog_blob', 'Bog Blob', 20); this.height = .9; this.turn = 5; this.cd = 1.5 + R(); this.hop = 0;
    this.body = this.pivot(0, 0, 0);
    this.shell = new THREE.Mesh(boxGeo(.9, .8, .9), BLOB_M); this.shell.position.y = .4; this.body.add(this.shell);
    this.box(.4, .36, .4, tx('bb_core', 8, 8, '#1f4a10', g => dots(g, '#8cff6a', [2, 2, 5, 5]), .3), 0, .36, 0, this.body);
    for (const s of [-1, 1]) this.box(.12, .14, .02, glowMat(0xd8ffb0), s * .2, .55, .455, this.body);
    this.box(.3, .06, .02, glowMat(0x1a3a0a), 0, .34, .455, this.body);
    const h = halo(0x8cff6a, 1.4, .25); h.position.y = .4; this.body.add(h);
  }
  onHurt() { SS.squelch(); puff(this.center(), .5, 4, GREENM, 1, 1); }
  think(dt, P, dx, dz, d) {
    this.cd -= dt;
    if (calm() || d > 18 || !near(P, this, 4)) { this.wander(dt, .8); return; }
    this.face(dx, dz);
    if (this.vy === 0 && this.cd <= 0) { this.vy = 6.5; this.hop = 1; this.cd = .9 + R() * .6; SS.squelch(); }
    if (this.hop > 0) this.speed = 3.4;
    if (d < 1.4 && near(P, this, 1.6) && !(this.touchCd > 0)) { this.touchCd = 1.2; hurt(3, this.name, dx / (d || 1), dz / (d || 1)); poison(4); }
    this.touchCd = (this.touchCd || 0) - dt;
  }
  physics(dt) { super.physics(dt); if (this.vy === 0) this.hop = 0; }
  animate(dt) { const sq = this.vy > 0 ? 1.15 : this.vy < 0 ? 1.05 : .85 + Math.sin(this.t * 5) * .05; this.body.scale.set(2 - sq, sq, 2 - sq); }
  deathAnim(dt) { this.dying += dt; this.body.scale.setScalar(1 + this.dying * 1.4);
    if (this.dying > .3) { const c = this.center(); SS.pop(); puff(c, 1.6, 16, GREENM, 1, 2); cloud(this.pos.x, this.pos.y, this.pos.z, 2.3, 5, this.name); this.loot(c); this.remove(); } }
  loot(c) { drop('ooze', 1 + (R() < .5 ? 1 : 0), c); }
}
// ---- Bog Wraith: a floating, legless robe with a pale glow. It only comes out at night.
const WRAITH_T = () => ({ robe: tx('bw_robe', 8, 8, '#4a5266', g => { for (let x = 1; x < 8; x += 3) rr(g, '#363c4c', x, 0, 1, 8); }, .25),
  rag: tx('bw_rag', 8, 8, '#363c4c', g => { for (let x = 0; x < 8; x += 2) rr(g, '#262a36', x, 6, 1, 2); }, .25),
  face: tx('bw_face', 8, 8, '#1a1c24', g => { rr(g, '#4a5266', 0, 0, 8, 2); rr(g, '#4a5266', 0, 0, 1, 8); rr(g, '#4a5266', 7, 0, 1, 8); }, .1),
  skin: tx('bw_skin', 4, 8, '#b8c4d8', null, .2) });
class Wraith extends Creature {
  constructor() {
    super('bog_wraith', 'Bog Wraith', 42); this.height = 2; this.turn = 4; this.cd = 1.5; this.wind = 0; this.kbRes = .6;
    const T = WRAITH_T(); this.rig = this.pivot(0, .4, 0);
    this.box(.62, 1.1, .5, T.robe, 0, .95, 0, this.rig); this.tail = this.pivot(0, .4, 0, this.rig);
    this.box(.5, .5, .4, T.robe, 0, -.15, 0, this.tail); this.box(.3, .45, .28, T.rag, 0, -.55, -.05, this.tail);
    this.head = this.pivot(0, 1.5, .02, this.rig); this.box(.5, .5, .5, [T.robe, T.robe, T.robe, T.robe, T.face, T.robe], 0, .22, 0, this.head);
    this.box(.56, .14, .56, T.robe, 0, .5, -.02, this.head);
    for (const s of [-1, 1]) this.box(.09, .06, .02, glowMat(0xdfe8ff), s * .1, .22, .255, this.head);
    this.arms = []; for (const s of [-1, 1]) { const p = this.pivot(s * .38, 1.35, 0, this.rig); this.box(.14, .8, .14, T.robe, 0, -.35, 0, p); this.box(.1, .28, .1, T.skin, 0, -.86, 0, p); this.arms.push(p); }
    this.glow = halo(0xbfd4ff, 2.6, .3); this.glow.position.y = 1.4; this.rig.add(this.glow);
  }
  tryMove(nx, nz) { if (nx < 3 || nz < 3 || nx > WX - 3 || nz > WZ - 3) return false; const gy = groundAt(nx, nz, this.pos.y + 3, true); if (gy - this.pos.y > 2.5) return false; this.pos.x = nx; this.pos.z = nz; return true; }
  physics(dt) { const gy = groundAt(this.pos.x, this.pos.z, this.pos.y + 3, true); this.pos.y = lerp(this.pos.y, gy + .5 + Math.sin(this.t * 1.7) * .2, Math.min(1, dt * 4)); }
  onHurt() { SS.wail(); puff(this.center(), .7, 4, PALEM, 1, 1); }
  think(dt, P, dx, dz, d) {
    this.cd -= dt;
    if (!isNight() && !this.fading) { this.fading = 1.5; }
    if (this.fading > 0) { this.fading -= dt; this.glow.material.opacity = .3 * this.fading / 1.5; this.group.scale.setScalar(Math.max(.05, this.fading / 1.5)); if (this.fading <= 0) this.remove(); return; }
    if (calm() || d > 26 || !near(P, this, 6)) { this.wind = 0; this.wander(dt, .9); return; }
    this.face(dx, dz);
    if (this.wind > 0) { this.wind -= dt; if (this.wind <= 0) { this.swing = .3; SS.wail(); if (d < 2.6 && near(P, this, 2.5)) hurt(5, this.name, dx / (d || 1), dz / (d || 1)); this.cd = 1.6; } return; }
    if (d < 2.2 && this.cd <= 0) { this.wind = .6; } else if (d > 1.6) this.speed = 3;
  }
  animate(dt) { const k = Math.min(1, dt * 10); this.swing = Math.max(0, (this.swing || 0) - dt);
    for (const a of this.arms) a.rotation.x = lerp(a.rotation.x, this.wind > 0 ? -2.6 : this.swing > 0 ? -.2 : -.5 + Math.sin(this.t * 2) * .2, k);
    this.tail.rotation.x = Math.sin(this.t * 3) * .25; this.rig.rotation.x = this.speed > 0 ? .25 : .05; }
  deathAnim(dt) { this.dying += dt; this.group.scale.setScalar(Math.max(.05, 1 - this.dying * 1.6)); this.pos.y += dt * 1.5;
    if (this.dying > .6) { const c = this.center(); puff(c, 1.5, 14, PALEM, 1, 1.5); this.loot(c); this.remove(); } }
  loot(c) { if (R() < .5) drop('grave_bones', 1, c); }
}

// =====================================================================================================
//  Rotmaw, the flesh maw: a hunched hill of flesh that is mostly mouth, hung with chains, glowing red
// =====================================================================================================
function mawT() { return {
  flesh: tx('rm_flesh', 16, 16, '#8a3a34', g => { for (let i = 0; i < 14; i++) rr(g, '#6a2a2a', (R() * 15) | 0, (R() * 15) | 0, 2, 2); for (let i = 0; i < 4; i++) ln(g, '#5a1a1a', (R() * 16) | 0, 0, (R() * 16) | 0, 15); dots(g, '#b85a4a', [3, 3, 9, 6, 12, 11, 5, 12]); }, .2),
  belly: tx('rm_belly', 16, 16, '#b85a4a', g => { for (let y = 2; y < 16; y += 4) rr(g, '#8a3a34', 0, y, 16, 1); }, .2),
  hump: tx('rm_hump', 16, 16, '#6a2a2a', g => { for (let i = 0; i < 18; i++) rr(g, '#3a5a22', (R() * 16) | 0, (R() * 8) | 0); for (let i = 0; i < 6; i++) rr(g, '#e8e2cc', (R() * 15) | 0, 4 + ((R() * 11) | 0), 2, 1); }, .25),
  jaw: tx('rm_jaw', 16, 8, '#7a3030', g => { rr(g, '#4a1a1a', 0, 6, 16, 2); dots(g, '#a84a40', [2, 1, 7, 2, 12, 1]); }, .2),
  gum: tx('rm_gum', 16, 8, '#5a0a0a', g => { for (let x = 1; x < 16; x += 3) rr(g, '#e8e2cc', x, 0, 2, 3); }, .15),
  throat: tx('rm_throat', 8, 8, '#2a0404', g => dots(g, '#8a1a1a', [2, 2, 5, 5, 3, 6]), .2),
  leg: tx('rm_leg', 8, 8, '#6a2a2a', g => rr(g, '#3a1414', 0, 6, 8, 2), .25),
  tooth: tx('rm_tooth', 4, 4, '#e8e2cc', null, .12),
  iron: tx('rm_iron', 4, 8, '#4a4c4e', g => { rr(g, '#2a2c2e', 1, 2, 2, 4); dots(g, '#8a5a32', [0, 1, 3, 6]); }, .2),
}; }
const CHAIN_M = new THREE.MeshLambertMaterial({ map: tx('rm_chain', 4, 8, '#5a5e60', g => { rr(g, '#2a2c2e', 1, 2, 2, 4); dots(g, '#8a5a32', [0, 1, 3, 6]); }, .2) });
class Rotmaw extends Creature {
  constructor() {
    super('rotmaw', 'Rotmaw', 900); this.isBoss = true; this.height = 6; this.step = 1.3; this.kbRes = 0; this.turn = 1.6; this.stride = 1.2;
    this.mode = 'intro'; this.mt = 0; this.cd = 2; this.awayT = 0;
    const T = mawT(), red = glowMat(0xff3a2a);
    this.rig = this.pivot(0, 0, 0); const G = this.rig; this.legs = [];
    for (const [x, z] of [[-1.9, 1.3], [1.9, 1.3], [-1.9, -1.4], [1.9, -1.4]]) { const p = this.pivot(x, 1.4, z, G); this.box(1.1, 1.5, 1.1, T.leg, 0, -.7, 0, p); this.box(1.3, .3, 1.5, T.leg, 0, -1.3, .15, p); this.legs.push(p); }
    this.body = this.pivot(0, 1.3, 0, G);
    this.box(4.8, 3.2, 4.2, [T.flesh, T.flesh, T.belly, T.flesh, T.flesh, T.flesh], 0, 1.7, -.4, this.body);
    this.box(3.6, 1.6, 3, T.hump, 0, 3.8, -.9, this.body); this.box(2, 1, 1.8, T.hump, .4, 4.9, -1.2, this.body);
    for (const [x, y, z] of [[-1.2, 4.7, -.2], [1.5, 4.4, -1.9], [-.4, 5.6, -1.4]]) this.box(.3, .9, .3, T.tooth, x, y, z, this.body).rotation.z = (x > 0 ? -.3 : .3);
    // the maw: upper and lower jaws hinge at the front of the body
    this.upper = this.pivot(0, 2.5, 1.5, this.body); this.box(4.6, 1.3, 2.6, [T.flesh, T.flesh, T.gum, T.flesh, T.jaw, T.flesh], 0, .5, 1.1, this.upper);
    for (let i = 0; i < 7; i++) this.box(.32, .55, .3, T.tooth, -1.9 + i * .63, -.3, 2.2, this.upper);
    for (const s of [-1, 0, 1]) { this.box(.36, .24, .06, red, s * .55, .9 + (s ? 0 : .2), 2.43, this.upper); }
    const eh = halo(0xff3a2a, 1.6, .5); eh.position.set(0, 1, 2.6); this.upper.add(eh);
    this.lower = this.pivot(0, .9, 1.5, this.body); this.box(4.3, .9, 2.4, [T.flesh, T.flesh, T.belly, T.gum, T.jaw, T.flesh], 0, -.2, 1, this.lower);
    for (let i = 0; i < 6; i++) this.box(.3, .5, .3, T.tooth, -1.6 + i * .64, .45, 2, this.lower);
    this.box(3.6, 1.4, .3, T.throat, 0, 1.8, 1.35, this.body);
    this.bileM = new THREE.MeshBasicMaterial({ color: 0xff3a2a, fog: false }); this.box(1.4, .5, .3, this.bileM, 0, 1.75, 1.55, this.body);
    this.bileH = halo(0xff3a2a, 2.4, .5); this.bileH.position.set(0, 1.8, 2); this.body.add(this.bileH);
    // chains hang from iron rings on the sides
    this.chains = [];
    for (const [x, z] of [[-2.45, 1], [-2.45, -.6], [-2.45, -2], [2.45, 1], [2.45, -.6], [2.45, -2]]) {
      this.box(.12, .5, .5, red, x + Math.sign(x) * .06, 2.8, z, this.body);
      const p = this.pivot(x + Math.sign(x) * .2, 2.8, z, this.body);
      for (let i = 0; i < 5; i++) { const l = new THREE.Mesh(boxGeo(i % 2 ? .1 : .22, .36, i % 2 ? .22 : .1), CHAIN_M); l.position.y = -.25 - i * .32; p.add(l); }
      this.box(.4, .4, .4, T.iron, 0, -1.9, 0, p); this.chains.push({ p, s: Math.sign(x) });
    }
    this.rig.position.y = -7;
  }
  center() { const P = PL(); return new V3(this.pos.x, clamp(P.pos.y + 1.2, this.pos.y + 1.2, this.pos.y + 5), this.pos.z); }
  onHurt() { SS.squelch(); puff(this.center(), 1, 4, FLESHM, -1, 1.5); }
  think(dt, P, dx, dz, d) {
    const enr = this.hp < this.max * .5;
    if (this.mode === 'intro') { this.mt += dt; this.face(dx, dz); this.rig.position.y = Math.min(0, -7 + this.mt * 1.8);
      if (R() < dt * 25) puff(new V3(this.pos.x + (R() - .5) * 5, this.pos.y + .3, this.pos.z + (R() - .5) * 5), 1.5, 3, MUDM, -1, 2);
      if (this.mt > 4.2) { this.mode = 'chase'; this.immune = false; this.cd = 1.5; this.rig.position.y = 0; } return; }
    this.awayT = Math.hypot(P.pos.x - PIT.cx, P.pos.z - PIT.cz) > 40 ? this.awayT + dt : 0;
    if (this.awayT > 10) { despawnBoss(true); return; }
    if (calm()) { if (this.mode !== 'chase' && this.mode !== 'lunge') { this.mode = 'chase'; this.cd = 1.5; } if (this.mode !== 'lunge') return; }
    if (d < 3.4) { const l = d || 1, k = (3.4 - d) * Math.min(1, dt * 10); P.pos.x += dx / l * k; P.pos.z += dz / l * k; }
    if (enr && !this.enraged) { this.enraged = true; SS.roar(); shakeT = Math.max(shakeT, .8); say('Rotmaw retches up its last meals. The blobs are coming!', 3);
      for (const s of [-1, 1]) spawn('bog_blob', this.pos.x + Math.cos(this.yaw) * 4 * s, this.pos.z - Math.sin(this.yaw) * 4 * s); }
    switch (this.mode) {
      case 'chase': {
        const home = Math.hypot(this.pos.x - PIT.cx, this.pos.z - PIT.cz);
        if (home > 18) this.face(PIT.cx - this.pos.x, PIT.cz - this.pos.z); else this.face(dx, dz);
        if (d > 4.5 || home > 18) this.speed = enr ? 2.5 : 1.9;
        this.cd -= dt;
        if (this.cd <= 0) { const r = R();
          if (d < 7) this.begin(r < .55 ? 'chainWind' : r < .8 ? 'bileWind' : 'lungeWind');
          else if (d < 22) this.begin(r < .55 ? 'bileWind' : 'lungeWind');
          else this.begin('lungeWind'); }
        break; }
      case 'bileWind': this.mt -= dt; if (this.mt > .3) this.face(this.aim.x - this.pos.x, this.aim.z - this.pos.z);
        if (this.mt <= 0) { this.bile(); this.mode = 'recover'; this.mt = .9; } break;
      case 'chainWind': this.mt -= dt;
        if (this.mt <= 0) { this.chainSlam(enr); this.mode = 'recover'; this.mt = 1; } break;
      case 'lungeWind': this.mt -= dt;
        if (this.mt <= 0) { this.mode = 'lunge'; this.mt = 1; this.hitDone = false; SS.roar(); } break;
      case 'lunge': { this.mt -= dt; const sp = 14, nx = this.pos.x + this.ldir.x * sp * dt, nz = this.pos.z + this.ldir.z * sp * dt;
        if (!this.tryMove(nx, nz)) this.mt = 0; if (R() < dt * 30) puff(new V3(this.pos.x, this.pos.y + .3, this.pos.z), 2, 3, MUDM, -1, 2);
        if (!this.hitDone && d < 3.3 && near(P, this, 3) && !calm()) { this.hitDone = true; hurt(enr ? 10 : 9, this.name, this.ldir.x, this.ldir.z); P.vel.y = 8; shakeT = Math.max(shakeT, .6); }
        if (this.mt <= 0) { this.mode = 'recover'; this.mt = 1.3; } break; }
      case 'recover': this.mt -= dt; if (this.mt <= 0) { this.mode = 'chase'; this.cd = enr ? .7 : 1.3; } break;
    }
  }
  begin(m) {
    this.mode = m; const P = PL();
    if (m === 'bileWind') { this.mt = 1.3; SS.groan(); this.aim = { x: P.pos.x, z: P.pos.z };
      const a0 = Math.atan2(this.aim.x - this.pos.x, this.aim.z - this.pos.z), n = this.enraged ? 3 : 1; this.spots = [];
      for (let k = 0; k < n; k++) { const a = a0 + (k - (n - 1) / 2) * .42; for (let i = 0; i < 6; i++) { const dist = 4 + i * 2.3, x = this.pos.x + Math.sin(a) * dist, z = this.pos.z + Math.cos(a) * dist;
        this.spots.push({ x, z, mk: ring(x, z, this.pos.y + 1, 2.6, 1.25, '#8cff6a') }); } } }
    if (m === 'chainWind') { this.mt = 1.25; SS.chain(); this.slamRing = ring(this.pos.x, this.pos.z, this.pos.y + 1, 15.5, 1.2, '#ff3a2a'); }
    if (m === 'lungeWind') { this.mt = 1.05; SS.groan(); const dx = P.pos.x - this.pos.x, dz = P.pos.z - this.pos.z, l = Math.hypot(dx, dz) || 1; this.ldir = { x: dx / l, z: dz / l }; this.face(dx, dz);
      stripe(this.pos.x, this.pos.z, this.pos.x + this.ldir.x * 15, this.pos.z + this.ldir.z * 15, this.pos.y + 1, 1.05); }
  }
  bile() {
    SS.pop(); const y = this.pos.y;
    for (const s of this.spots || []) { s.mk.kill(); const gy = groundAt(s.x, s.z, y + 4, true);
      puff(new V3(s.x, gy + .3, s.z), 1.2, 6, GREENM, 1, 1.5);
      if (P_HIT(s.x, s.z, gy, 1.5, 2.4)) { hurt(4, this.name, 0, 0); poison(7); } }
    const last = (this.spots || [])[2]; if (last) cloud(last.x, groundAt(last.x, last.z, y + 4, true), last.z, 1.8, 3.5, this.name);
    this.spots = null;
  }
  chainSlam(enr) {
    if (this.slamRing) { this.slamRing.kill(); this.slamRing = null; }
    SS.slam(); SS.chain(); shakeT = Math.max(shakeT, .7); puff(new V3(this.pos.x, this.pos.y + .3, this.pos.z), 7, 24, MUDM, -1, 4);
    const P = PL(), dx = P.pos.x - this.pos.x, dz = P.pos.z - this.pos.z, d = Math.hypot(dx, dz) || 1;
    if (!calm() && d < 7.7 && near(P, this, 3.5)) { hurt(enr ? 8 : 7, this.name, dx / d * 1.5, dz / d * 1.5); P.vel.y = 7; }
  }
  animate(dt, sp) {
    const m = this.mode, k = Math.min(1, dt * 7), sw = Math.sin(this.phase) * .35 * Math.min(1, sp / 1.5);
    this.legs[0].rotation.x = sw; this.legs[3].rotation.x = sw; this.legs[1].rotation.x = -sw; this.legs[2].rotation.x = -sw;
    const open = m === 'bileWind' ? .75 : m === 'lungeWind' || m === 'lunge' ? .6 : m === 'intro' ? .5 + Math.sin(this.t * 4) * .2 : .12 + Math.sin(this.t * 1.5) * .06;
    this.upper.rotation.x = lerp(this.upper.rotation.x, -open * .6, k); this.lower.rotation.x = lerp(this.lower.rotation.x, open * .45, k);
    const bileOn = m === 'bileWind'; this.bileM.color.setHex(bileOn ? 0x8cff6a : 0xff3a2a); this.bileH.material.color.setHex(bileOn ? 0x8cff6a : 0xff3a2a);
    this.bileH.material.opacity = bileOn ? .6 + Math.sin(this.t * 30) * .3 : .35;
    const chainHot = m === 'chainWind'; CHAIN_M.emissive.setRGB(chainHot ? .9 * (.6 + .4 * Math.sin(this.t * 30)) : 0, 0, 0);
    for (const c of this.chains) { c.p.rotation.z = lerp(c.p.rotation.z, chainHot ? -c.s * 1.3 : -c.s * (.1 + Math.sin(this.t * 2 + c.s) * .08), k); c.p.rotation.x = Math.sin(this.t * 1.7 + c.s) * .15; }
    this.body.rotation.x = lerp(this.body.rotation.x, m === 'lungeWind' ? .25 : m === 'bileWind' ? -.15 : m === 'chainWind' ? -.1 : 0, k);
    this.body.position.y = 1.3 + Math.sin(this.t * 2) * .06 + (m === 'chainWind' ? Math.max(0, 1.25 - this.mt) * .4 : 0);
  }
  deathAnim(dt) {
    this.dying += dt; this.group.rotation.z = Math.min(1, this.dying / 2) * Math.PI / 2 * .7 * this.tipDir; this.rig.position.y = -Math.max(0, this.dying - 1.6) * 2;
    if (R() < dt * 25) puff(new V3(this.pos.x + (R() - .5) * 4, this.pos.y + R() * 4, this.pos.z + (R() - .5) * 4), 1.5, 3, FLESHM, -1, 2);
    if (!this.thud && this.dying > 1.8) { this.thud = true; shakeT = Math.max(shakeT, 1); SS.slam(); SS.chain(); }
    if (this.dying > 2.6) { const c = new V3(this.pos.x, this.pos.y + 2, this.pos.z); puff(c, 6, 40, FLESHM, 1, 3); puff(c, 4, 24, BONEM, 1, 2);
      flashEl.style.background = '#ffb0a0'; fx.flash = Math.max(fx.flash, .6); this.loot(c); this.remove(); }
  }
  loot(c) { drop('rotmaw_trophy', 1, c); drop('dowsing_bone', 1, c); drop('scrap_iron', 6, c); drop('ooze', 4, c); }
  remove() { if (this.slamRing) this.slamRing.kill(); for (const s of this.spots || []) s.mk.kill(); CHAIN_M.emissive.setRGB(0, 0, 0); super.remove(); }
}

// =====================================================================================================
//  Spawning (tuned for phones): the dead and blobs on the mud, leeches in the pools, wraiths at night, the crypts wake
// =====================================================================================================
const KINDS = { rotting_dead: () => new RottingDead(false), rotting_archer: () => new RottingDead(true), bog_leech: () => new Leech(), bog_blob: () => new Blob(), bog_wraith: () => new Wraith() };
function spawn(kind, x, z, y) { const C = KINDS[kind]; if (!C) return null; const e = C(); if (kind === 'bog_wraith') { e.spawnAt(x, z, y); e.pos.y = groundAt(x, z, WY - 1, true) + .5; return e; } return e.spawnAt(x, z, y); }
function spawnSpot(P, r0, r1, pool) {
  for (let k = 0; k < 14; k++) {
    const a = R() * Math.PI * 2, r = r0 + R() * (r1 - r0), x = Math.floor(P.pos.x + Math.cos(a) * r), z = Math.floor(P.pos.z + Math.sin(a) * r);
    if (x < 5 || z < 5 || x > WX - 5 || z > WZ - 5 || !wetland(x, z)) continue;
    if (Math.hypot(x - PIT.cx, z - PIT.cz) < PIT.r + 1 || CRYPTS.some(c => { const l = cryptLocal(c, x + .5, z + .5); return Math.abs(l.u) < 7 && Math.abs(l.v) < 6; })) continue;
    if (pool) { if (isPool(x, z)) return { x: x + .5, z: z + .5 }; continue; }
    const h = topY(x, z), t = get(x, h, z); if ((t !== BOG && t !== MUD) || get(x, h + 1, z) === WATER) continue;
    return { x: x + .5, z: z + .5 };
  }
  return null;
}
let spawnT = 3;
function spawnTick(dt) {
  spawnT -= dt; for (const c of CRYPTS) c.wakeT = (c.wakeT || 0) - dt; if (spawnT > 0) return; spawnT = 2;
  const P = PL(), cnt = {};
  for (const e of CREATURES) { if (e.removed || e.dead > 0) continue;
    const far = Math.hypot(e.pos.x - P.pos.x, e.pos.z - P.pos.z);
    if (!e.isBoss && far > 70) { e.remove(); continue; } cnt[e.kind] = (cnt[e.kind] || 0) + 1; }
  // a crypt wakes when you walk into it
  const c = cryptAt(P.pos);
  if (c && c.wakeT <= 0 && !CREATURES.some(e => !e.removed && e.dead <= 0 && inCrypt(c, e.pos))) {
    c.wakeT = 300; SS.groan(); say('Something stirs in the wet dark...', 2.5);
    for (const [u, v, k] of [[-3, -2, 'rotting_dead'], [-3, 2, 'rotting_dead'], [-1, 0, 'rotting_archer']]) { const [x, z] = cl(c, u, v); spawn(k, x + .5, z + .5, G0 + 1); }
  }
  if (cine || (boss && !boss.removed) || sk < .4) return;
  let total = 0; for (const e of ENTITIES) if (!(e.dead > 0) && !e.removed) total++;
  if (total >= 22) return;
  const ch = F.started, night = isNight();
  const want = [['rotting_dead', ch ? 2 : 1, 16, 30, .35, 0], ['rotting_archer', 1, 18, 30, .2, 0], ['bog_blob', 2, 14, 26, .3, 0], ['bog_leech', 2, 6, 18, .4, 1]];
  if (night) want.push(['bog_wraith', 2, 18, 30, .4, 0]);
  for (const [k, cap, r0, r1, p, pool] of want) if ((cnt[k] || 0) < cap && R() < p) { const s = spawnSpot(P, r0, r1, pool); if (s) { spawn(k, s.x, s.z); return; } }
}

// =====================================================================================================
//  UI: advancement toasts (same look as Chapters I and II)
// =====================================================================================================
const css = document.createElement('style');
css.textContent = `
#swAdv { position: fixed; z-index: 6; right: 12px; top: calc(12px + env(safe-area-inset-top, 0px)); width: 300px; display: flex; gap: 10px; align-items: center; padding: 10px 12px; box-sizing: border-box;
  background: #212121; border: 2px solid #000; box-shadow: inset 0 0 0 2px #555; transition: transform .5s, opacity .5s; font-family: var(--ui); color: #fff; pointer-events: none; }
#swAdv.out { transform: translateX(340px); opacity: 0; }
#swAdv b { display: block; color: #ffff55; font-weight: 600; font-size: 17px; }
#swAdv.ch b { color: #ff55ff; }
#swAdv span { font-size: 15px; color: #fff; }
#swAdv canvas { width: 32px; height: 32px; image-rendering: pixelated; flex: none; }
html.touch #swAdv { top: calc(56px + env(safe-area-inset-top, 0px)); right: 10px; width: min(250px, 40%); padding: 6px 8px; }
html.touch #swAdv b { font-size: 14px; } html.touch #swAdv span { font-size: 13px; }
`;
document.head.appendChild(css);
const advEl = document.createElement('div'); advEl.id = 'swAdv'; advEl.className = 'out';
advEl.innerHTML = '<canvas width="32" height="32"></canvas><div><b>Advancement Made!</b><span></span></div>'; document.body.appendChild(advEl);
const ADV = {
  swamp: ['Into the Bog', 'bog_bloom'], crypt: ['Sunken Stones', 'grave_bones'], open: ['The Drowned Key', 'drowned_key'], scrap: ['Rust and Ruin', 'scrap_iron'],
  iron: ['Iron Age', 'iron_ingot'], gear: ['Heavy Metal', 'iron_mace'], armor: ['Cover Me in Iron', 'iron_chestplate'], mead: ['Bogward', 'bogward_mead'],
  dead: ['Back to the Grave', 'grave_bones'], leech: ['Bloodsucker', 'ooze'], blob: ['Holding My Breath', 'ooze'], wraith: ['Ghost Story', 'grave_bones'],
  rune: ['Wet Runes', 'bog_bloom'], lore: ['Bog Lore', 'bog_bloom', 1], waystone: ['Vesk Smells the Bones', 'grave_bones'], pit: ['The Bone Pit', 'grave_bones'],
  summon: ['Feeding Time', 'grave_bones'], rotmaw: ['Shut Your Mouth', 'rotmaw_trophy', 1],
};
const advDone = {}, advQ = []; let advT = 0;
function advance(key) {
  const a = ADV[key]; if (!a || advDone[key]) return; advDone[key] = true; advQ.push({ title: a[0], icon: a[1], ch: !!a[2] });
  chat(`${DEFS[cur].name} has ${a[2] ? 'completed the challenge' : 'made the advancement'} [${a[0]}]`, a[2] ? 'vhC' : 'vhA');
}
function advTick(dt) {
  if (advT > 0) { advT -= dt; if (advT <= 0) { advEl.classList.add('out'); advT = -.7; } return; }
  if (advT < 0) { advT = Math.min(0, advT + dt); return; }
  const busy = ['vhAdv', 'dfAdv'].some(id => { const o = document.getElementById(id); return o && !o.classList.contains('out'); });
  if (!advQ.length || state === 'switching' || state === 'title' || busy || (typeof toastEl !== 'undefined' && !toastEl.classList.contains('out'))) return;
  const a = advQ.shift();
  advEl.classList.toggle('ch', a.ch); advEl.querySelector('b').textContent = a.ch ? 'Challenge Complete!' : 'Advancement Made!'; advEl.querySelector('span').textContent = a.title; I18N.glow(advEl.querySelector('span'));
  const g = advEl.querySelector('canvas').getContext('2d'); g.imageSmoothingEnabled = false; g.clearRect(0, 0, 32, 32);
  try { if (hasInv() && Inv.icon) g.drawImage(Inv.icon(a.icon), 0, 0, 32, 32); } catch (e) { /* no icon */ }
  advEl.classList.remove('out'); advT = 4.5; SS.chime(a.ch);
}

// =====================================================================================================
//  Story: Korra's lines, the quest line and hints
// =====================================================================================================
const F = { started: false };                      // sticky quest flags (saved)
const mined = { scrap: 0 };
function dirTo(x, z) { const P = PL(), dx = x - P.pos.x, dz = z - P.pos.z; return { m: Math.round(Math.hypot(dx, dz)), dir: compass(dx, dz) }; }
const where = (x, z) => { const d = dirTo(x, z); return `${d.m} m ${d.dir}`; };
const K = (pc, touch) => TOUCH ? touch : pc;
function korra(lines, done, target) {
  const m = MW(); if (!m) { chat('Korra: ' + lines.join(' ')); if (done) done(); return; }
  const t = target ? dirTo(target.x, target.z) : null;
  m.korra(lines.map(s => (s = I18N.L(s), t ? s.replace(/\{dir\}/g, t.dir).replace(/\{m\}/g, t.m) : s).replace(/\{st\}/g, I18N.L(stName(GEAR_ST))).replace(/\{mst\}/g, I18N.L(stName(MEAD_ST)))), done);
}
const STORY = {
  start: ['Kraa! Two heads on the stones, {name}. Hear how the Ring hums now?',
    'The key the Old Root dropped is cold for a reason. It belongs to the Swamp, in the south-east corner of the isle, {dir} of here.',
    'Black water, dead trees, rain that never stops. An old boardwalk crosses the channel into it. The dead built it... and the dead still walk it.',
    'In the sunken crypts there lies scrap iron. Iron comes after bronze. And something in that bog eats the drowned. Kraa!'],
  enter: ['Smell that? Rot and rain. Stay out of the black pools: leeches live in them.',
    'Green blobs burst into poison when they die. Hit them, then step back out of the green cloud.',
    'The crypts are half sunk in the mud: stone huts with a green lock. And at night the wraiths come out of the fog. Kraa.'],
  crypt: ['A sunken crypt! The door is sealed with green bronze.', 'The Drowned Key fits that lock. Stand at the door and use it: ' + (typeof TOUCH !== 'undefined' && TOUCH ? 'tap the Use button.' : 'right-click it.')],
  inside: ['Scrap iron! Those rusty heaps by the walls. Break them with your pickaxe.', 'The dead guard their scrap. Bring them down first, then dig. Bones grow in here too: take them, you will need them.'],
  scrap: ['That is enough scrap for a start. Rust and all, it is still iron.', 'Smelt it in a Furnace with wood or charcoal for fuel. Every scrap gives one bar of Iron.'],
  iron: ['Iron! Heavy and honest.', 'At the {st}: an Iron Mace crushes the dead, an Iron Sword is quick, and iron armour keeps you standing.'],
  gear: ['Now the dead should fear you, not the other way round.', 'Whatever rules this bog spits poison. Brew Bogward Mead at the {mst}: two bog blooms from the pools, two ooze from the blobs, one resin.',
    'Drink it before a hard fight. Poison will barely touch you. Kraa!'],
  mead: ['Good. Now: where does the maw sleep? Vesk knows the old stones.', 'Follow him. He circles a Waystone by the second crypt, {dir} of here. Kraa.'],
  pit: ['The Bone Pit. Everything here was eaten once.', 'Lay ten Grave Bones on the altar and Rotmaw will crawl up to feed.',
    'Watch it! Green rings on the ground: bile lands there, step aside. A red ring around it: the chains swing, get away from it.',
    'And when it lowers its head and a red line points at you, it charges: dodge sideways. Kraa!'],
  bones: ['Ten bones. Still wet. Ugh.', 'Go to the Bone Pit, {dir} of here. Drink your mead before you lay the bones down.'],
  end: ['Rotmaw is dead! The bog is quiet. Even the rain is softer.', 'Its head belongs on the third stone at the Ring of Oaths.',
    'And that bone it coughed up... a Dowsing Bone. It hums when silver is near.',
    'Silver sleeps in the Mountains, above the snow line. Something with wings circles the peaks there. It will be cold, {name}. Very cold. Kraa!'],
};
const HINT = {
  travel: ['The Swamp is {dir} of here, about {m} blocks. Look for the dead trees and the old boardwalk over the channel.'],
  crypt: ['The sunken crypts are stone huts half swallowed by mud. The nearest is {dir} of here, about {m} blocks.'],
  key: ['You need the Drowned Key. The Old Root dropped it. Check your chests, or the ground at the Root Shrine.'],
  open: ['Stand at the crypt door with the Drowned Key in your bag and ' + (typeof TOUCH !== 'undefined' && TOUCH ? 'tap Use.' : 'right-click it.')],
  scrap: ['Scrap iron piles are the rusty heaps inside the crypts. Hold attack on them with the Antler Pickaxe or better.'],
  smelt: ['A Furnace smelts Scrap Iron into Iron. Put the scrap on top and wood or charcoal below.'],
  gear: ['Iron gear is made at the {st}. An Iron Mace needs seven iron. An Iron Sword six.'],
  mead: ['Bog blooms grow at the edge of the black pools. Blobs drop ooze. Resin comes from Greylings and trees. Brew it at the {mst}.'],
  waystone: ['Look up for Vesk. He circles the Waystone by the second crypt, {dir} of here, about {m} blocks.'],
  pit: ['The Bone Pit is {dir} of here, about {m} blocks, in a ring of red lights.'],
  bones: ['Grave Bones lie in heaps inside the crypts, and the Rotting Dead drop them. They grow back in time.'],
  offer: ['You have the bones. Go to the Bone Pit, {dir} of here, and use its altar.'],
  hang: ['The Ring of Oaths is {dir} of here. Use the third stone\'s mount with the Rotmaw Trophy in your bag.'],
};
const hungMaw = () => { const m = MW(); return !!(m && m.flags && m.flags.hung && m.flags.hung.rotmaw_trophy); };
const nearestCrypt = (open) => { const P = PL(); let best = CRYPTS[0], bd = 1e9; for (const c of CRYPTS) { if (open != null && !!c.open !== open) continue; const d = Math.hypot(c.gate.x - P.pos.x, c.gate.z - P.pos.z); if (d < bd) { bd = d; best = c; } } return best; };
const QUEST_TARGET = { travel: () => GATE, crypt: () => nearestCrypt().gate, key: () => nearestCrypt().gate, open: () => nearestCrypt(false).gate, scrap: () => nearestCrypt(true).gate,
  bones: () => nearestCrypt(true).gate, waystone: () => (WAY ? { x: WAY.cx, z: WAY.cz } : CRYPTS[1].gate), pit: () => PIT, offer: () => PIT, hang: RINGXZ };
const IRON_ALL = IRON_WEAPONS.concat(['iron_pickaxe', 'iron_helmet', 'iron_chestplate', 'iron_leggings', 'iron_boots']);
function step() {
  if (!F.started) return 'pre';
  if (F.bossDead) return hungMaw() ? 'done' : 'hang';
  if (boss && !boss.removed) return 'boss';
  if (!F.enter) return 'travel';
  if (!F.crypt) return 'crypt';
  if (!F.opened) return count('drowned_key') > 0 ? 'open' : 'key';
  if (!F.scrap && (mined.scrap >= 10 || F.iron)) F.scrap = true;
  if (!F.scrap) return 'scrap';
  if (!F.iron && (count('iron_ingot') >= 6 || hasAny(IRON_ALL))) F.iron = true;
  if (!F.iron) return 'smelt';
  if (!F.gear && hasAny(IRON_WEAPONS)) F.gear = true;
  if (!F.gear) return 'gear';
  if (!F.mead && (count('bogward_mead') > 0 || meadT > 0)) F.mead = true;
  if (!F.mead) return 'mead';
  if (!F.waystone && !F.pit && WAY) return 'waystone';
  if (!F.pit) return 'pit';
  return count('grave_bones') >= 10 ? 'offer' : 'bones';
}
function questText(s = step()) {
  switch (s) {
    case 'travel': return `Travel to the Swamp (${where(GATE.x, GATE.z)}): cross the old boardwalk over the channel`;
    case 'crypt': { const c = nearestCrypt(); return `Find a Sunken Crypt in the Swamp (${where(c.gate.x, c.gate.z)})`; }
    case 'key': return 'Find the Drowned Key (The Old Root dropped it) to open the crypt';
    case 'open': return `Open the crypt door: ${K('right-click', 'tap Use on')} it with the Drowned Key in your bag`;
    case 'scrap': return `Mine Scrap Iron in the crypts: ${Math.min(10, mined.scrap)}/10 (pickaxe)`;
    case 'smelt': return `Smelt Scrap Iron in a Furnace (wood or charcoal as fuel): Iron ${Math.min(6, count('iron_ingot'))}/6`;
    case 'gear': return `Make an iron weapon at the ${stName(GEAR_ST)} (Iron Mace, Sword or Axe)`;
    case 'mead': return `Brew Bogward Mead at the ${stName(MEAD_ST)}: Bog Bloom ${Math.min(2, count('bog_bloom'))}/2, Ooze ${Math.min(2, count('ooze'))}/2 (blobs), Resin 1`;
    case 'waystone': return 'Read the Waystone by the second crypt (Vesk circles it)';
    case 'pit': return `Find the Bone Pit (${where(PIT.cx, PIT.cz)})`;
    case 'bones': return `Gather Grave Bones: ${count('grave_bones')}/10 (crypt bone heaps, Rotting Dead)`;
    case 'offer': return `Offer 10 Grave Bones at the Bone Pit altar (${where(PIT.cx, PIT.cz)})`;
    case 'boss': return 'Defeat Rotmaw! Green rings: step aside. Red ring: get away. Red line: dodge';
    case 'hang': { const r = RINGXZ(); return `Hang the Rotmaw Trophy at the Ring of Oaths (${where(r.x, r.z)})`; }
    case 'done': return 'Chapter III complete. Next: the Mountains. The Dowsing Bone hums near silver';
  }
  return '';
}
const STEP_TALK = { smelt: 'scrap', gear: 'iron', mead: 'gear', waystone: 'mead', offer: 'bones' };
let lastStep = '', stuckT = 0, ch2T = 0;
function startChapter() {
  if (F.started) return; F.started = true; lastStep = '';
  title('CHAPTER III', 'The Swamp', 5, '#9acd32'); SS.chime(true);
  later(3, () => korra(STORY.start, null, GATE));
}
function questTick(dt) {
  const m = MW();
  if (!F.started) {
    const D = DFm();                                // Chapter II ends when the Old Root's head hangs at the Ring
    if (D && D.step === 'done') { ch2T += dt; const quiet = !dlgOpen() && (!m || !m.raven || m.raven.mode === 'gone');
      if ((quiet && ch2T > 16) || ch2T > 90) startChapter(); }
    return;
  }
  const s = step();
  if (s !== lastStep) {
    const prev = lastStep; lastStep = s; stuckT = 0;
    if (m && m.vesk) { if (s === 'waystone' && WAY) m.vesk.circle({ x: WAY.cx, y: WAY.y + 4, z: WAY.cz }); else if (prev === 'waystone') m.vesk.leave(); }
    if (prev && STEP_TALK[s] && !F['said_' + s]) { F['said_' + s] = true; const tg = QUEST_TARGET[s] && QUEST_TARGET[s](); later(1.2, () => korra(STORY[STEP_TALK[s]], null, tg)); }
  }
  if (s === 'boss' || s === 'done' || dlgOpen() || cine) return;
  if (s === 'hang' && m && m.RING && !F.said_hang2 && Math.hypot(PL().pos.x - m.RING.cx, PL().pos.z - m.RING.cz) < 14) { F.said_hang2 = true; if (m.tip) m.tip('The third stone. Let the Watcher see what you pulled out of the bog.'); }
  stuckT += dt;
  if (stuckT > 150 && HINT[s]) { stuckT = -150; const tg = QUEST_TARGET[s] && QUEST_TARGET[s](); korra(HINT[s], null, tg); }
}
function milestones() {
  const P = PL(), k = swk(P.pos.x, P.pos.z);
  if (k > .6 && !F.enter) {
    if (F.started) { F.enter = true; title('THE SWAMP', 'Black water. Endless rain.', 3.5, '#9acd32'); advance('swamp'); later(2, () => korra(STORY.enter)); }
    else if (!F.warned) { F.warned = true; title('THE SWAMP', 'Black water. Endless rain.', 3.5, '#9acd32'); say('The air is thick and smells of rot. Sealed crypts sink in the mud... Come back when you carry the right key.', 5); }
  }
  if (F.started && !F.crypt && CRYPTS.some(c => Math.hypot(P.pos.x - c.gate.x, P.pos.z - c.gate.z) < 7)) { F.crypt = true; advance('crypt'); if (!F.opened) korra(STORY.crypt); }
  if (!F.pit && Math.hypot(P.pos.x - PIT.cx, P.pos.z - PIT.cz) < PIT.r + 2) {
    if (F.started && F.mead) { F.pit = true; F.waystone = true; advance('pit'); korra(STORY.pit); }
    else if (!F.pitPeek) { F.pitPeek = true; say('Bones everywhere, and red lights on old stones. Something under here is hungry... You are not ready yet.', 5); }
  }
  if (count('scrap_iron') > 0) advance('scrap');
  if (count('iron_ingot') > 0 && F.started) advance('iron');
  if (hasAny(IRON_WEAPONS)) advance('gear');
  if (hasAny(['iron_helmet', 'iron_chestplate', 'iron_leggings', 'iron_boots'])) advance('armor');
}
function onKill(e) {
  const k = e.kind;
  if (k === 'rotting_dead' || k === 'rotting_archer') advance('dead');
  if (k === 'bog_leech') advance('leech'); if (k === 'bog_blob') advance('blob'); if (k === 'bog_wraith') advance('wraith');
  if (k === 'rotmaw') bossDefeated(e);
  try { const d = DEFS[cur]; d.xp += { rotting_dead: .35, rotting_archer: .35, bog_leech: .15, bog_blob: .2, bog_wraith: .45, rotmaw: 5 }[k] || 0; while (d.xp >= 1) { d.xp -= 1; d.lvl++; } drawStats(); } catch (e2) { /* ignore */ }
}

// =====================================================================================================
//  The Bone Pit and the boss fight
// =====================================================================================================
let boss = null;
function useAltar() {
  if (boss && !boss.removed) { say('Rotmaw is already up!', 2.5); return; }
  if (F.bossDead) { say('The pit is still. Nothing down there is hungry any more.', 3); return; }
  const n = count('grave_bones');
  if (n >= 10) { if (!removeItem('grave_bones', 10)) { say('The altar wants ten Grave Bones.', 3); return; } summonBoss(); }
  else { SS.rune(); say(`A wet stone with a red glow. It wants ten Grave Bones (${n}/10). The crypts are full of them.`, 4); }
}
function summonBoss() {
  if (boss && !boss.removed) return boss;
  const P = PL(); let dx = PIT.cx - P.pos.x, dz = PIT.cz - P.pos.z; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
  const bx = PIT.cx + dx * 4.5, bz = PIT.cz + dz * 4.5;
  boss = new Rotmaw(); boss.yaw = Math.atan2(-dx, -dz); boss.immune = true; boss.spawnAt(bx, bz); boss.pos.y = G0 + 1;
  F.summoned = true; advance('summon'); shakeT = Math.max(shakeT, 1.5); SS.roar(); flashEl.style.background = '#4a0a0a'; fx.flash = Math.max(fx.flash, .6);
  cine = { t: 0, dur: 4.6, boss };
  title('ROTMAW', 'The Flesh Maw', 4.8, '#ff5a4a');
  say('The mud boils. Chains rattle up from below... and a mouth comes with them.', 4.8);
  later(1.6, () => { SS.chain(); shakeT = Math.max(shakeT, .8); });
  later(3.2, () => { SS.roar(); shakeT = Math.max(shakeT, .6); });
  return boss;
}
function despawnBoss(refund) {
  if (!boss) return; const b = boss; boss = null; puff(b.center(), 5, 30, FLESHM, 1, 2); b.remove(); SS.groan();
  if (refund) { drop('grave_bones', 10, new V3(PIT.cx, G0 + 3.2, PIT.cz)); chat('Rotmaw sinks back into the mud... the bones lie on the altar again.'); }
  F.summoned = false;
}
function bossDefeated(b) {
  F.bossDead = true; chat(`Rotmaw was slain by ${DEFS[cur].name}`);
  title('ROTMAW HAS FALLEN', 'Carry its head to the Ring of Oaths', 4.5, '#ff5a4a');
  later(.3, () => advance('rotmaw'));
  later(6, () => korra(STORY.end));
  const waitHang = () => { if (hungMaw()) later(7, () => { title('CHAPTER III COMPLETE', 'Next: The Mountains. Frostwing circles the peaks...', 8, '#ffaa00'); later(1.5, () => say('Pack something warm. To be continued...', 6)); });
    else later(2, waitHang); };
  later(8, waitHang);
  later(3, () => { if (boss === b) boss = null; });
}

// =====================================================================================================
//  Blocks: mining rules, drops, doors, bones, blooms, rune stones, mead
// =====================================================================================================
const TIER = [1, 2, 4, 6, 8, 10];
let refuseT = 0;
function refuse(msg) { const P = PL(); P.swing = 1; swingT = 1; if (performance.now() - refuseT > 2500) { refuseT = performance.now(); say(msg, 2.6); if (AC) SS.clink(); } return false; }
if (hasInv() && typeof Inv.mine === 'function') {
  const oMine = Inv.mine;
  Inv.mine = function (h, dt) {
    if (!h) return oMine.call(this, h, dt);
    const t = h.t, tl = heldTool();
    if (PROTECT.has(t)) return refuse(t === CDOOR ? 'Sealed tight with green bronze. Use the door with the Drowned Key.' : t === CBRICK ? 'The crypt stones are bound with old iron. Find the door.' : 'It will not crack.');
    if (t === SCRAP) { if (!tl || tl.type !== 'pickaxe' || tl.power < 2) return refuse('Too hard! Break scrap piles with the Antler Pickaxe or better.'); dt *= (TIER[tl.power] || 4) / 4; }
    else if (t === DEAD && tl && tl.type === 'axe') dt *= (TIER[tl.power] || 2) / 1.5;
    return oMine.call(this, h, dt);
  };
}
const regrow = [];
const inPit = h => Math.hypot(h.x + .5 - PIT.cx, h.z + .5 - PIT.cz) < PIT.r + 1;
on('blockDrops', (drops, h) => {
  if (!h) return drops; const t = h.t, tl = heldTool(), r = R();
  switch (t) {
    case DEAD: return r < .2 ? [['wood', 4], ['resin', 1]] : [['wood', 4]];
    case MUD: case BOG: return [['dirt', 1]];
    case SCRAP: if (!tl || tl.type !== 'pickaxe' || tl.power < 2) return []; mined.scrap += 2; SS.clink(); regrow.push({ x: h.x, y: h.y, z: h.z, t, at: 900 }); return [['scrap_iron', 2]];
    case BONES: if (inPit(h)) { say('The old bones crumble to dust. Fresh ones lie in the crypts.', 2.5); return []; }
      regrow.push({ x: h.x, y: h.y, z: h.z, t, at: 300 }); return r < .3 ? [['grave_bones', 2], ['scrap_iron', 1]] : [['grave_bones', 2]];
    case BLOOM: regrow.push({ x: h.x, y: h.y, z: h.z, t, at: 240 + R() * 120 }); return [['bog_bloom', 1 + (r < .4 ? 1 : 0)]];
    case REED: return [];
  }
  return drops;
});
function regrowTick(dt) {
  for (let i = regrow.length - 1; i >= 0; i--) { const q = regrow[i]; q.at -= dt; if (q.at > 0) continue; regrow.splice(i, 1);
    if (get(q.x, q.y, q.z) === AIR && BLOCK[get(q.x, q.y - 1, q.z)].solid) { set(q.x, q.y, q.z, q.t); rebuildAround(q.x, q.z); } }
}
function pickPlant(h) {
  if (typeof breakBlock === 'function') breakBlock(h); else { set(h.x, h.y, h.z, AIR); rebuildAround(h.x, h.z); }
  PL().swing = 1; swingT = 1;
}
function openDoor(c) {
  if (!c || c.open) return; c.open = true;
  for (const y of [c.door.y, c.door.y + 1]) if (get(c.door.x, y, c.door.z) === CDOOR) set(c.door.x, y, c.door.z, AIR);
  rebuildAround(c.door.x, c.door.z); try { if (typeof Light !== 'undefined' && Light.update) Light.update(c.door.x, c.door.z); } catch (e) { /* optional */ }
  SS.door(); shakeT = Math.max(shakeT, .3); puff(new V3(c.door.x + .5, c.door.y + 1, c.door.z + .5), 1.5, 14, MUDM, 1, 1.5);
  if (!F.opened) { F.opened = true; advance('open'); if (F.started) later(1, () => korra(STORY.inside)); }
  say('The green lock turns with a groan. The door sinks into the mud.', 3);
}
function useDoor(h) {
  const c = CRYPTS.find(q => q.door && q.door.x === h.x && q.door.z === h.z); if (!c) return;
  if (count('drowned_key') > 0) openDoor(c);
  else { SS.clink(); say('Sealed with a lock of green bronze. It needs the Drowned Key, which The Old Root carries.', 4); }
}
function readRune(l) {
  SS.rune(); const m = MW(); if (m) m.talk(l.name, 'rune', l.lines); else chat(l.lines.join(' '));
  if (!l.read) { l.read = true; advance('rune'); if (LORE.every(o => o.read)) advance('lore'); }
}
(HOOKS.use || (HOOKS.use = [])).unshift(() => {
  if (state !== 'play' || dlgOpen()) return false;
  const s = heldStack(); if (s && s.id === 'bogward_mead') { drinkMead(); return true; }
  const h = targetBlock(); if (!h) return false;
  if (h.t === BALTAR) { useAltar(); return true; }
  if (h.t === CDOOR) { useDoor(h); return true; }
  if (h.t === SWRUNE) { const l = loreAt(h.x, h.y, h.z); if (l) readRune(l); return true; }
  if (h.t === BONES || h.t === BLOOM) { pickPlant(h); return true; }
  return false;
});
// blunt weapons crush the dead; Ironhide (Rotmaw's power) shrugs off physical hits
on('meleeDamage', (dmg, e) => { if (e && (e.kind === 'rotting_dead' || e.kind === 'rotting_archer')) { const s = heldStack(); if (s && /mace|club/.test(s.id)) return dmg * (s.id === 'iron_mace' ? 1.6 : 1.4); } return dmg; });
on('damage', (n, by) => (n > 0 && typeof Powers !== 'undefined' && Powers && Powers.active === 'ironhide' && !/poison/i.test(by || '') ? Math.max(1, Math.round(n * .2)) : n));

// =====================================================================================================
//  Atmosphere: green-grey fog, a darker light, black water and endless rain (the Wet status)
// =====================================================================================================
let sk = 0;
const FOG0 = scene.fog.color.clone(), FOGS = new THREE.Color('#3a4634'), fogTmp = new THREE.Color();
let fogTouched = false;
const RAIN_N = 240, rainPos = new Float32Array(RAIN_N * 6), rainD = [];
const rainGeo = new THREE.BufferGeometry(); rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
const rainMat = new THREE.LineBasicMaterial({ color: 0x9fb0c0, transparent: true, opacity: 0, depthWrite: false });
const rain = new THREE.LineSegments(rainGeo, rainMat); rain.frustumCulled = false; rain.visible = false; scene.add(rain);
for (let i = 0; i < RAIN_N; i++) rainD.push({ x: 0, y: -99, z: 0, s: 14 + R() * 6 });
let wetT = 0;
const roofed = p => { const x = Math.floor(p.x), z = Math.floor(p.z); for (let y = Math.floor(p.y + 2); y < Math.min(WY, p.y + 14); y++) if (BLOCK[get(x, y, z)].opaque && get(x, y, z) !== AIR) return true; return false; };
function atmosphere(dt) {
  const P = PL(), want = state === 'title' ? 0 : swk(P.pos.x, P.pos.z) * (P.pos.y < 40 ? 1 : 0);
  sk = lerp(sk, want, Math.min(1, dt * 1.5)); if (sk < .002 && want === 0) sk = 0;
  if (sk > 0 && MW()) { const k = 1 - .3 * sk; opaqueMat.color.multiplyScalar(k); opaqueMat.color.r *= 1 - .06 * sk; opaqueMat.color.b *= 1 - .1 * sk; waterMat.color.multiplyScalar(1 - .6 * sk); }
  // rain: short grey lines falling around the player
  const on = sk > .05, inside = on && roofed(P.pos); rain.visible = on; rainMat.opacity = .45 * sk;
  if (on) { const cx = P.pos.x, cy = P.pos.y, cz = P.pos.z;
    for (let i = 0; i < RAIN_N; i++) { const d = rainD[i]; d.y -= d.s * dt;
      if (d.y < cy - 4 || Math.abs(d.x - cx) > 14 || Math.abs(d.z - cz) > 14) { d.x = cx + (R() - .5) * 28; d.z = cz + (R() - .5) * 28; d.y = cy + 4 + R() * 10; }
      const k = i * 6; rainPos[k] = d.x; rainPos[k + 1] = d.y; rainPos[k + 2] = d.z; rainPos[k + 3] = d.x + .06; rainPos[k + 4] = d.y + .7; rainPos[k + 5] = d.z; }
    rainGeo.attributes.position.needsUpdate = true;
    if (R() < dt * 2 && AC) noiseSweep(AC.currentTime, .5, 3000, 1800, .015 * sk, 1, .2);
  }
  if (sk > .6 && !inside && state === 'play') { if (wetT <= 0) status('sw_wet', { name: 'Wet', secs: 30, icon: wetIcon, color: '#3a6ad8' }); wetT = 30; }
  else if (wetT > 0) { wetT -= dt; if (wetT <= 0) unstatus('sw_wet'); }
}
function fogTick() {
  if (sk > .001) {
    const light = typeof World !== 'undefined' && World.light ? World.light() : 1;
    fogTmp.copy(FOGS).multiplyScalar(.4 + .6 * light);
    scene.fog.color.copy(FOG).lerp(fogTmp, .85 * sk); fogTouched = true;
    scene.fog.near *= 1 - .85 * sk; scene.fog.far *= 1 - .68 * sk;
  } else if (fogTouched) { scene.fog.color.copy(FOG0); fogTouched = false; }
}

// =====================================================================================================
//  Saving (mobs.js Save hooks): opened doors also stay open through the world diff
// =====================================================================================================
on('save', data => { if (!data) return; data.swamp = { F: Object.assign({}, F, { summoned: false }), mined: Object.assign({}, mined), adv: Object.keys(advDone), lore: LORE.map(l => l.read),
  open: CRYPTS.map(c => !!c.open), meadT, bonesBack: !!(boss && !boss.removed && !F.bossDead) }; });
on('load', data => {
  const d = data && data.swamp; if (!d) return;
  Object.assign(F, d.F || {}); Object.assign(mined, d.mined || {}); for (const k of d.adv || []) advDone[k] = true;
  (d.lore || []).forEach((r, i) => { if (LORE[i]) LORE[i].read = !!r; }); lastStep = '';
  (d.open || []).forEach((o, i) => { const c = CRYPTS[i]; if (o && c && !c.open) { c.open = true; for (const y of [c.door.y, c.door.y + 1]) if (get(c.door.x, y, c.door.z) === CDOOR) set(c.door.x, y, c.door.z, AIR); rebuildAround(c.door.x, c.door.z); } });
  if (d.meadT > 0) { meadT = d.meadT; status('sw_mead', { name: 'Bogward', secs: meadT, icon: meadIcon, color: '#8ccf4a' }); }
  if (d.bonesBack) try { Inv.add('grave_bones', 10); } catch (e) { /* ignore */ }   // saved mid-fight: the boss is not saved, give the offering back
});

// =====================================================================================================
//  Main hooks
// =====================================================================================================
on('start', lateRecipes);
if (document.readyState !== 'loading') setTimeout(lateRecipes, 0); else document.addEventListener('DOMContentLoaded', () => setTimeout(lateRecipes, 0));
const bossNameEl = bossEl.querySelector('.mc'), bossTrack = bossEl.querySelector('i');
const goalSpan = document.querySelector('#vhGoal span');
let ourBar = false;
on('frame', (dt) => {
  if (state === 'title') return;
  for (let i = timers.length - 1; i >= 0; i--) { const q = timers[i]; q.t -= dt; if (q.t <= 0) { timers.splice(i, 1); try { q.fn(); } catch (e) { console.error(e); } } }
  updateParts(dt); updateShots(dt); poisonUpdate(dt); atmosphere(dt); regrowTick(dt);
  if (state === 'play') { spawnTick(dt); milestones(); questTick(dt); }
  for (let i = CREATURES.length - 1; i >= 0; i--) if (CREATURES[i].removed) CREATURES.splice(i, 1);
  if (boss && boss.removed) boss = null;
});
on('tick', rawDt => {
  fogTick(); advTick(rawDt);
  if (F.started && goalSpan && state !== 'title') (typeof Meadows !== 'undefined' && Meadows.questText ? Meadows.questText(goalSpan, questText()) : (goalSpan.textContent = questText()));
  const P0 = PL();
  if (boss && !boss.removed && boss.dead <= 0 && (state === 'play' || state === 'wheel') && boss.pos.distanceTo(P0.pos) < 70) {
    bossEl.hidden = false; bossFill.style.width = Math.max(0, boss.hp / boss.max * 100) + '%';
    if (!ourBar) { ourBar = true; bossNameEl.textContent = 'Rotmaw'; I18N.glow(bossNameEl); bossFill.style.background = 'linear-gradient(#ffa08a, #a81e1e)'; bossTrack.style.background = '#300808'; bossTrack.style.borderColor = '#140202'; }
  } else if (ourBar) { ourBar = false; bossNameEl.textContent = 'Forest Troll'; bossFill.style.background = ''; bossTrack.style.background = ''; bossTrack.style.borderColor = ''; }
  if (cine) {
    if (state === 'play' && cine.boss && !cine.boss.removed) {
      cine.t += rawDt; const b = cine.boss, k = clamp(cine.t / cine.dur, 0, 1);
      let dx = P0.pos.x - b.pos.x, dz = P0.pos.z - b.pos.z; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
      const ang = .7 - .3 * easeInOutSine(k), dist = 14 - 3 * easeInOutSine(k), ca = Math.cos(ang), sa = Math.sin(ang);
      const ox = dx * ca - dz * sa, oz = dz * ca + dx * sa, target = new V3(b.pos.x + ox * dist, b.pos.y + 1, b.pos.z + oz * dist);
      camCollide(new V3(b.pos.x, b.pos.y + 3, b.pos.z), target); camera.position.copy(target);
      if (shakeT > 0) { camera.position.x += (Math.random() - .5) * shakeT * .6; camera.position.y += (Math.random() - .5) * shakeT * .6; }
      camera.lookAt(b.pos.x, b.pos.y + 4.5 - k * 1.8, b.pos.z); camera.fov = 64; camera.updateProjectionMatrix();
      if (heldMesh) heldMesh.visible = false; P0.group.visible = true; hudEl.style.opacity = 0; touchUI.style.opacity = 0; outline.visible = false;
      if (cine.t >= cine.dur) cine = null;
    } else if (state === 'play') cine = null;
  }
});

// ---------------------------------------------------------------- public API + helpers for the lead/tests
function tp(where) {
  const P = PL(); let x, z, y = null;
  if (where === 'pit') { x = PIT.cx + 6; z = PIT.cz; }
  else if (where === 'gate') { x = GATE.x; z = GATE.z; }
  else if (where === 'swamp') { x = LANDING.x; z = LANDING.z; }
  else if (/^crypt\d$/.test(where)) { const c = CRYPTS[+where[5]]; x = c.gate.x; z = c.gate.z; }
  else if (/^inside\d$/.test(where)) { const c = CRYPTS[+where[6]]; x = c.inside.x; z = c.inside.z; y = G0 + 1; }
  else if (where === 'waystone' && WAY) { x = WAY.cx + 2; z = WAY.cz; }
  else if (where === 'ring') { const r = RINGXZ(); x = r.x + 3; z = r.z + 3; }
  else return false;
  P.pos.set(x, y != null ? y : groundAt(x, z, WY - 1, true) + .02, z); P.vel.set(0, 0, 0); return true;
}
window.Swamp = {
  SW, PIT, CRYPTS, LORE, SCRAPS, GATE, LANDING, flags: F, mined, blocks: { MUD, BOG, DEAD, CBRICK, CDOOR, SCRAP, BONES, REED, BLOOM, BALTAR, SWRUNE },
  inSwamp, swamp: swk, get fog() { return sk; }, get step() { return step(); }, questText, startChapter, advance,
  spawn, summonBoss, despawnBoss, get boss() { return boss; }, get creatures() { return CREATURES; }, get cine() { return cine; },
  get poisoned() { return poisonT; }, get mead() { return meadT; }, get pools() { return POOLN; }, get way() { return WAY; },
  tp, korra, useAltar, openDoor: i => openDoor(CRYPTS[i]), drinkMead, cloud, poison, stations: () => ({ gear: GEAR_ST, mead: MEAD_ST }),
};
})();
