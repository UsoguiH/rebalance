"use strict";
/* Blockcraft — Chapter II: The Dark Forest  (js/darkforest.js)
 * A dark pine forest in the north-east of the island (fog, mossy stone, mushrooms, blueberries), copper and tin ore gated behind
 * the Antler Pickaxe, the smelter and the bronze tier, a burial crypt with skeletons and ember cores, Greyling Brutes and Shamans,
 * more Forest Trolls, the Root Shrine and the second boss, The Old Root. Korra carries the story on from Chapter I with a step-by-step
 * quest line, hints when the player is stuck, forest rune stones and advancement toasts. Valheim-STYLE, our own names and text.
 * Uses valheim.js (World, Meadows), items.js (Inv, ITEMS), combat.js (Combat) and blocks.js (Stations) through typeof guards. */
(() => {
const R = Math.random;
const hasInv = () => typeof Inv !== 'undefined' && Inv && typeof Inv.add === 'function';
const MW = () => (typeof Meadows !== 'undefined' && Meadows) || null;
const count = id => { try { return hasInv() ? Inv.count(id) | 0 : 0; } catch (e) { return 0; } };
const removeItem = (id, n) => { try { return hasInv() && !!Inv.remove(id, n); } catch (e) { return false; } };
const heldStack = () => { try { return hasInv() && Inv.held ? Inv.held() : null; } catch (e) { return null; } };
const heldTool = () => { const s = heldStack(); return (s && typeof ITEMS !== 'undefined' && ITEMS[s.id] && ITEMS[s.id].tool) || null; };
const drop = (id, n, p) => { if (typeof World !== 'undefined' && World.spawnDrop) World.spawnDrop(id, n, p); else if (hasInv()) Inv.add(id, n); };
const say = (t, s = 3.5) => { const m = MW(); if (m) m.subtitle(t, s); else chat(t); };
const title = (a, b, s, c) => { const m = MW(); if (m) m.bigTitle(a, b, s, c); };
const dlgOpen = () => { const m = MW(); return !!(m && m.dialog && m.dialog.open); };
let cine = null;
const calm = () => state !== 'play' || dlgOpen() || !!cine;
function compass(dx, dz) { const a = Math.atan2(dx, -dz) * 180 / Math.PI;
  return ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'][((Math.round(a / 45) % 8) + 8) % 8]; }
const timers = [];
const later = (s, fn) => timers.push({ t: s, fn });

// ---------------------------------------------------------------- sounds
const DS = {
  creak() { if (!AC) return; const t = AC.currentTime; thump(t, 70, 52, 1.4, .5, 'sawtooth'); noiseSweep(t, 1.2, 380, 120, .3, 3, .2, 'lowpass'); },
  groan() { if (!AC) return; const t = AC.currentTime; thump(t, 95, 40, 2.2, .55, 'sawtooth'); thump(t + .1, 48, 30, 2, .5, 'square'); noiseSweep(t, 1.8, 600, 90, .3, 1.2, .3); },
  crack() { if (!AC) return; const t = AC.currentTime; for (let i = 0; i < 5; i++) click(t + i * .04, 500 + R() * 600, .06); noiseSweep(t, .5, 900, 120, .45, 1, .005, 'lowpass'); },
  rumble() { if (!AC) return; const t = AC.currentTime; noiseSweep(t, 1.1, 120, 500, .4, 1, .4, 'lowpass'); },
  whoosh() { if (!AC) return; const t = AC.currentTime; noiseSweep(t, .45, 300, 1600, .35, 1.5, .05); },
  vine() { if (!AC) return; const t = AC.currentTime; noiseSweep(t, .5, 1800, 600, .15, 3, .02); for (let i = 0; i < 4; i++) click(t + i * .07, 900, .05); },
  orb() { if (!AC) return; const t = AC.currentTime; thump(t, 300, 620, .4, .12, 'sine'); thump(t, 450, 900, .4, .06, 'triangle'); },
  splash() { if (!AC) return; const t = AC.currentTime; noiseSweep(t, .3, 1400, 300, .18, 2, .005); thump(t, 200, 90, .2, .12, 'sine'); },
  heal() { if (!AC) return; const t = AC.currentTime; [523, 659, 784].forEach((f, i) => note(t + i * .08, f, .04)); },
  bones() { if (!AC) return; const t = AC.currentTime; for (let i = 0; i < 6; i++) click(t + i * .035, 1800 + R() * 1500, .05); },
  brute() { if (!AC) return; const t = AC.currentTime; thump(t, 160, 70, .5, .35, 'sawtooth'); noiseSweep(t, .4, 600, 200, .2, 1.5, .02); },
  slam() { if (!AC) return; const t = AC.currentTime; thump(t, 90, 30, .8, .8); noiseSweep(t, .6, 600, 60, .45, .7, .005, 'lowpass'); },
  clink() { if (!AC) return; const t = AC.currentTime; note(t, 1568, .05); note(t + .05, 2093, .04); },
  chime(ch) { if (!AC) return; const t = AC.currentTime; (ch ? [523.3, 659.3, 784, 1046.5] : [784, 987.8, 1174.7]).forEach((f, i) => note(t + i * .11, f, .07)); },
  rune() { if (!AC) return; const t = AC.currentTime; thump(t, 110, 104, 1.6, .2, 'sine'); note(t, 440, .05); note(t + .18, 659.3, .045); },
};

// ---------------------------------------------------------------- pixel helpers
const rr = (g, c, x, y, w = 1, h = 1) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
const dots = (g, c, p) => { g.fillStyle = c; for (let i = 0; i < p.length; i += 2) g.fillRect(p[i], p[i + 1], 1, 1); };
function ln(g, c, x0, y0, x1, y1, w = 1) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1; g.fillStyle = c;
  for (let i = 0; i <= n; i++) g.fillRect(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), w, w); }
const TR = mulberry32(9127);                                   // own RNG for textures and world gen (the main sequence is untouched)
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
// 16x16 icon helpers: string templates + a Minecraft-style dark rim
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
// icons are drawn on a 16x16 context that may be scaled: draw into our own 16px canvas, then copy it over
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
const MOSS = ['#3f6a2c', '#4d7a34', '#355a26'];
const tPineSide = addTile('df_pine_side', g => { noiseFill(g, 0, 0, 16, 16, '#3b2a1c', .2);
  for (const x of [1, 4, 6, 9, 12, 14]) for (let y = 0; y < 16; y++) if (TR() < .8) rr(g, '#271b11', x, y); for (let i = 0; i < 10; i++) rr(g, '#4c3826', (TR() * 16) | 0, (TR() * 16) | 0, 1, 2);
  for (let i = 0; i < 5; i++) rr(g, MOSS[i % 3], (TR() * 16) | 0, 12 + ((TR() * 4) | 0)); });
const tPineTop = addTile('df_pine_top', g => { noiseFill(g, 0, 0, 16, 16, '#3b2a1c', .15); rr(g, '#6e5236', 2, 2, 12, 12); rr(g, '#5a4229', 4, 4, 8, 8); rr(g, '#6e5236', 6, 6, 4, 4); rr(g, '#4a351f', 7, 7, 2, 2); });
const tNeedles = addTile('df_needles', g => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const r = TR(); if (r < .14) continue;
  rr(g, r < .4 ? '#14301f' : r < .75 ? '#1c3d27' : r < .93 ? '#24502f' : '#2f6339', x, y); } });
const tFloorTop = addTile('df_floor_top', g => { noiseFill(g, 0, 0, 16, 16, '#3a4f26', .3); for (let i = 0; i < 18; i++) rr(g, TR() < .5 ? '#4a3a24' : '#2c3d1d', (TR() * 16) | 0, (TR() * 16) | 0);
  for (let i = 0; i < 6; i++) rr(g, '#5a6a2c', (TR() * 15) | 0, (TR() * 15) | 0, 2, 1); });
const tFloorSide = addTile('df_floor_side', g => { noiseFill(g, 0, 0, 16, 16, '#5d4630', .25); for (let i = 0; i < 12; i++) rr(g, '#4a3726', (TR() * 16) | 0, 4 + ((TR() * 12) | 0));
  for (let x = 0; x < 16; x++) { const h = 2 + ((TR() * 3) | 0); for (let y = 0; y < h; y++) rr(g, shade('#3a4f26', (TR() - .5) * .3), x, y); } });
const tMossStone = addTile('df_mossy_stone', g => { noiseFill(g, 0, 0, 16, 16, '#6a6d68', .22); for (let i = 0; i < 7; i++) rr(g, '#4e514c', (TR() * 14) | 0, (TR() * 14) | 0, 2 + ((TR() * 2) | 0), 1);
  for (let i = 0; i < 40; i++) { const x = (TR() * 16) | 0, y = (TR() * 16) | 0; if (y < 7 || TR() < .3) rr(g, MOSS[i % 3], x, y); } });
const oreTile = (name, fleck, hi) => addTile(name, g => { noiseFill(g, 0, 0, 16, 16, '#6a6d68', .2); for (let i = 0; i < 14; i++) rr(g, MOSS[i % 3], (TR() * 16) | 0, (TR() * 5) | 0);
  for (const [x, y] of [[2, 3], [9, 2], [5, 8], [11, 9], [3, 12], [12, 13]]) { rr(g, shade(fleck, -.35), x, y + 1, 3, 2); rr(g, fleck, x, y, 3, 2); rr(g, hi, x, y); } });
const tCopper = oreTile('df_copper_ore', '#4fae86', '#a8f0c8');
const tCopper2 = addTile('df_copper_ore2', g => { noiseFill(g, 0, 0, 16, 16, '#6a6d68', .2);
  for (const [x, y] of [[1, 2], [8, 4], [4, 9], [11, 11], [6, 13]]) { rr(g, '#a0582c', x, y + 1, 3, 2); rr(g, '#d98a4a', x, y, 3, 2); rr(g, '#4fae86', x + 2, y + 1); } });
const tTin = oreTile('df_tin_ore', '#c9cdd2', '#ffffff');
const tMush = addTile('df_mushroom', g => { rr(g, '#e6dcc8', 7, 9, 2, 6); rr(g, '#bfb39a', 8, 9, 1, 6); rr(g, '#7a1410', 4, 6, 8, 3); rr(g, '#c8241c', 4, 5, 8, 3); rr(g, '#c8241c', 5, 4, 6, 1);
  rr(g, '#e8463a', 5, 5, 3, 1); dots(g, '#f2f2f2', [6, 6, 9, 5, 10, 7, 5, 7]); rr(g, '#e6dcc8', 2, 13, 1, 2); rr(g, '#a83a1e', 1, 12, 3, 1); });
const tBerry = addTile('df_blueberry', g => { for (let i = 0; i < 70; i++) { const a = TR() * 6.28, r = TR() * 6; const x = Math.round(8 + Math.cos(a) * r), y = Math.round(10 + Math.sin(a) * r * .7);
  if (y < 16) rr(g, TR() < .5 ? '#2a5a2a' : '#3a7232', x, y); } for (const [x, y] of [[4, 8], [9, 7], [11, 11], [6, 12], [8, 10], [3, 12], [12, 8]]) { rr(g, '#2a3a8a', x, y, 2, 2); rr(g, '#6a8ae6', x, y); }
  rr(g, '#4a3626', 7, 14, 2, 2); });
const tUrn = addTile('df_urn', g => { rr(g, '#5a2e18', 5, 3, 6, 1); rr(g, '#8a4a26', 6, 2, 4, 1); rr(g, '#9a5a30', 4, 4, 8, 2); rr(g, '#b06a38', 3, 6, 10, 6); rr(g, '#9a5a30', 4, 12, 8, 2); rr(g, '#6a3a1e', 5, 14, 6, 1);
  rr(g, '#3a2414', 3, 8, 10, 1); dots(g, '#e0b070', [4, 7, 5, 6, 7, 10, 10, 10, 11, 7]); rr(g, '#d08a4a', 4, 6, 2, 3); });
const tSmeltSide = addTile('df_smelter_side', g => { noiseFill(g, 0, 0, 16, 16, '#7a6f66', .2); for (let y = 0; y < 16; y += 4) { rr(g, '#4e4640', 0, y + 3, 16, 1); for (let x = (y / 4) % 2 ? 3 : 0; x < 16; x += 6) rr(g, '#4e4640', x, y, 1, 3); }
  rr(g, '#a0522d', 0, 0, 16, 2); rr(g, '#6a3a1e', 0, 2, 16, 1); });
const tSmeltFront = addTile('df_smelter_front', g => { noiseFill(g, 0, 0, 16, 16, '#7a6f66', .2); rr(g, '#a0522d', 0, 0, 16, 2); rr(g, '#2a1a12', 4, 6, 8, 8); rr(g, '#4e4640', 3, 5, 10, 1);
  rr(g, '#ff7a1a', 5, 10, 6, 4); rr(g, '#ffc04a', 6, 11, 4, 2); rr(g, '#fff0a0', 7, 12, 2, 1); dots(g, '#ff9a2a', [6, 9, 9, 8, 8, 7]); });
const tSmeltTop = addTile('df_smelter_top', g => { noiseFill(g, 0, 0, 16, 16, '#7a6f66', .2); rr(g, '#4e4640', 3, 3, 10, 10); rr(g, '#1a120e', 5, 5, 6, 6); rr(g, '#ff7a1a', 6, 6, 4, 4); rr(g, '#ffd060', 7, 7, 2, 2); });
const tShrineSide = addTile('df_shrine_side', g => { noiseFill(g, 0, 0, 16, 16, '#4a3622', .22); for (const x of [2, 5, 10, 13]) ln(g, '#2c1f13', x, 0, x + (TR() < .5 ? 1 : -1), 15);
  ln(g, '#1f6a2a', 8, 2, 8, 13); ln(g, '#1f6a2a', 8, 4, 5, 7); ln(g, '#1f6a2a', 8, 7, 11, 10); dots(g, '#8cff6a', [8, 3, 8, 8, 8, 12, 5, 7, 11, 10]); for (let i = 0; i < 12; i++) rr(g, MOSS[i % 3], (TR() * 16) | 0, 13 + ((TR() * 3) | 0)); });
const tShrineTop = addTile('df_shrine_top', g => { noiseFill(g, 0, 0, 16, 16, '#5a4229', .15); for (const r of [7, 5, 3]) { rr(g, '#3e2c19', 8 - r, 8 - r, r * 2, 1); rr(g, '#3e2c19', 8 - r, 7 + r, r * 2, 1); rr(g, '#3e2c19', 8 - r, 8 - r, 1, r * 2); rr(g, '#3e2c19', 7 + r, 8 - r, 1, r * 2); }
  rr(g, '#2a7a2a', 6, 6, 4, 4); rr(g, '#8cff6a', 7, 7, 2, 2); });
const tRune = addTile('df_rune_stone', g => { noiseFill(g, 0, 0, 16, 16, '#4c4f4a', .16); rr(g, '#62665f', 0, 0, 16, 1); rr(g, '#62665f', 0, 0, 1, 16); rr(g, '#30332e', 0, 15, 16, 1); rr(g, '#30332e', 15, 0, 1, 16);
  ln(g, '#2c302a', 5, 2, 5, 13); ln(g, '#2c302a', 5, 3, 10, 6); ln(g, '#2c302a', 10, 6, 5, 9); ln(g, '#2c302a', 5, 9, 11, 13); for (let i = 0; i < 16; i++) rr(g, MOSS[i % 3], (TR() * 16) | 0, 11 + ((TR() * 5) | 0)); });
atlasTex.needsUpdate = true;
const newBlock = (name, tiles, sound, o) => { const id = BLOCK.length; def(id, name, tiles, sound, o); return id; };
const PINE = newBlock('Dark Pine Log', cube(tPineSide, tPineTop), 'wood');
const NEEDLES = newBlock('Dark Pine Needles', cube(tNeedles), 'grass', { opaque: false });
const FLOOR = newBlock('Forest Floor', cube(tFloorSide, tFloorTop, TILE.dirt), 'grass');
const MSTONE = newBlock('Mossy Stone', cube(tMossStone), 'stone');
const COPPER = newBlock('Copper Ore', [tCopper, tCopper2, tCopper, tCopper, tCopper2, tCopper], 'stone');
const TIN = newBlock('Tin Ore', cube(tTin), 'stone');
const MUSH = newBlock('Forest Mushroom', [tMush], 'grass', { kind: 'cross', opaque: false, solid: false });
const BERRY = newBlock('Blueberry Bush', [tBerry], 'grass', { kind: 'cross', opaque: false, solid: false });
const URN = newBlock('Burial Urn', [tUrn], 'stone', { kind: 'cross', opaque: false, solid: false });
const SMELTER = newBlock('Smelter', [tSmeltSide, tSmeltSide, tSmeltSide, tSmeltTop, tSmeltFront, tSmeltFront], 'stone');
const SHRINE = newBlock('Root Shrine', cube(tShrineSide, tShrineTop, tPineTop), 'wood');
const DFRUNE = newBlock('Forest Rune Stone', cube(tRune), 'stone');
const BRICKS = (MW() && MW().blocks && MW().blocks.MOSSY) || COBBLE;          // Chapter I's mossy stone bricks
const PROTECT = new Set([SHRINE, DFRUNE]);

// =====================================================================================================
//  Items, icons and recipes
// =====================================================================================================
const P = { L: '#f2c27a', M: '#c8873a', D: '#8a5420', h: '#7a5634', k: '#4a3220', W: '#fff0c8', g: '#3a2414' };
const T_SWORD = pad(['', '             LL', '            LMD', '           LMD', '          LMD', '         LMD', '        LMD', '  DD   LMD', '  DMD LMD', '   DMLMD', '    DMD',
  '    hDMD', '   hh  DD', '  hh', ' kk', '']);
const T_AXE = pad(['', '         LLL', '        LMMMD', '       LMMMMD', '      hhMMMMD', '     hh LMMD', '    hh   DD', '   hh', '  hh', ' hh', 'kh', 'k', '', '', '', '']);
const T_MACE = pad(['         L L', '        LMMML', '       LMLMMMD', '      LMMMMMMD', '       MMMMMD', '      hDMMMD', '     hh D D', '    hh', '   hh', '  hh', ' hh', 'kh', 'k', '', '', '']);
const T_PICK = pad(['', '    LLLLLL', '   LMMMMMMD', '  LMD   hhMD', '  MD   hh MD', ' MD   hh   D', ' D   hh', '    hh', '   hh', '  hh', ' hh', 'kh', 'k', '', '', '']);
const T_BUCK = pad(['', '     DDDDDD', '   DDMMMMMMDD', '  DMMLLLLLLMMD', '  DMLMMMMMMLMD', ' DMLMMDDDDMMLMD', ' DMLMDWLLMDMLMD', ' DMLMDLMMMDMLMD', ' DMLMDLMMMDMLMD', ' DMLMMDDDDMMLMD',
  '  DMLMMMMMMLMD', '  DMMLLLLLLMMD', '   DDMMMMMMDD', '     DDDDDD', '', '']);
const T_HELM = pad(['', '', '    LLLLLLLL', '   LMMMMMMMMD', '  LMMMMMMMMMMD', '  LMDDDDDDDDMD', '  LMD      MD', '  LMD      MD', '  DDD      DD', '', '', '', '', '', '', '']);
const T_CHEST = pad(['', ' LLL      LLL', ' LMMLLLLLLMMD', ' LMMMMMMMMMMD', ' DDLMMMMMMMDDD', '   LMMMMMMD', '   LMMDDMMMD', '   LMMMMMMMD', '   LMMMMMMMD', '   LMMMMMMMD', '   LMMMMMMMD', '   DDDDDDDDD', '', '', '', '']);
const T_LEGS = pad(['', '  LLLLLLLLLL', '  LMMMMMMMMD', '  LMMMDDMMMD', '  LMMD  LMMD', '  LMMD  LMMD', '  LMMD  LMMD', '  LMMD  LMMD', '  LMMD  LMMD', '  LMMD  LMMD', '  DDDD  DDDD', '', '', '', '', '']);
const T_BOOTS = pad(['', '', '', '', '', '   LMD   LMD', '   LMD   LMD', '   LMD   LMD', '  LMMD  LMMD', ' LMMMD LMMMD', ' DDDDD DDDDD', '', '', '', '', '']);
const T_INGOT = pad(['', '', '', '', '', '     LLLLLLLL', '    LMMMMMMMMD', '   LMMMMMMMMDD', '  LLLLLLLLLMDD', '  MMMMMMMMMMDD', '  MMMMMMMMMMD', '  DDDDDDDDDD', '', '', '', '']);
const lump = (L, M, D, F) => g => { rr(g, M, 4, 4, 8, 8); rr(g, M, 3, 6, 10, 5); rr(g, L, 4, 4, 5, 2); rr(g, L, 3, 6, 2, 2); rr(g, D, 6, 11, 6, 1); rr(g, D, 11, 7, 1, 4);
  for (const [x, y] of [[6, 7], [9, 5], [8, 9], [5, 9]]) rr(g, F, x, y, 2, 1); };
const ICONS = {
  copper_ore: art('co', lump('#9a9d98', '#6a6d68', '#4a4c48', '#4fae86')),
  tin_ore: art('to', lump('#9a9d98', '#6a6d68', '#4a4c48', '#e6eaee')),
  copper: art('cu', PXA(T_INGOT, { L: '#ffb27a', M: '#d9733a', D: '#8a3e1c' })),
  tin: art('sn', PXA(T_INGOT, { L: '#ffffff', M: '#cfd4da', D: '#8a9098' })),
  bronze: art('bz', PXA(T_INGOT, { L: '#ffd9a0', M: '#c8873a', D: '#7a4a1a' })),
  ember_core: art('ec', g => { rr(g, '#5a1a0a', 4, 4, 8, 8); rr(g, '#5a1a0a', 3, 5, 10, 6); rr(g, '#5a1a0a', 5, 3, 6, 10); rr(g, '#d8461a', 4, 5, 8, 6); rr(g, '#d8461a', 5, 4, 6, 8);
    rr(g, '#ff9a2a', 5, 5, 5, 5); rr(g, '#ffe070', 6, 6, 3, 3); rr(g, '#fff8d0', 6, 6, 1, 1); dots(g, '#2a0a04', [10, 9, 5, 10, 11, 6]); }),
  ancient_seed: art('as', g => { rr(g, '#3a2414', 5, 3, 6, 10); rr(g, '#3a2414', 4, 5, 8, 6); rr(g, '#6a4a26', 5, 4, 6, 8); rr(g, '#8a6a3a', 6, 4, 3, 3); ln(g, '#3a2414', 8, 5, 8, 11);
    dots(g, '#8cff6a', [6, 8, 10, 7, 7, 11]); rr(g, '#4a8a2a', 7, 1, 2, 3); rr(g, '#6ad040', 9, 1, 2, 1); }),
  bone_fragments: art('bf', g => { for (const [x0, y0, x1, y1] of [[3, 12, 9, 6], [7, 13, 12, 9], [5, 4, 11, 4]]) { ln(g, '#e8e2cc', x0, y0, x1, y1, 2); rr(g, '#ffffff', x0, y0, 2, 2); rr(g, '#bdb59a', x1, y1, 2, 2); } }),
  old_coins: art('oc', g => { for (const [x, y] of [[3, 8], [8, 9], [6, 4]]) { rr(g, '#8a6a10', x, y + 1, 6, 4); rr(g, '#e8c040', x, y, 6, 4); rr(g, '#fff090', x + 1, y, 3, 1); rr(g, '#b8901a', x + 2, y + 1, 2, 2); } }),
  blueberries: art('bb', g => { for (const [x, y] of [[3, 7], [7, 5], [10, 8], [5, 10], [9, 11], [6, 7]]) { rr(g, '#1e2a6a', x, y, 3, 3); rr(g, '#3a52c0', x, y, 2, 2); rr(g, '#9ab0ff', x, y); } rr(g, '#3a7232', 8, 2, 3, 2); rr(g, '#2a5a2a', 6, 3, 2, 2); }),
  mushroom: art('mu', g => { rr(g, '#e6dcc8', 7, 8, 3, 6); rr(g, '#bfb39a', 9, 8, 1, 6); rr(g, '#c8241c', 3, 4, 10, 4); rr(g, '#c8241c', 5, 3, 6, 1); rr(g, '#e8463a', 4, 4, 4, 2); dots(g, '#f2f2f2', [5, 5, 9, 4, 11, 6, 7, 6]); }),
  old_root_trophy: art('rt', g => { rr(g, '#1c3d27', 2, 0, 12, 4); rr(g, '#2f6339', 4, 0, 3, 2); rr(g, '#2f6339', 9, 1, 3, 2); rr(g, '#4a3622', 3, 4, 10, 10); rr(g, '#5e4630', 4, 4, 8, 2);
    rr(g, '#2c1f13', 4, 7, 8, 1); rr(g, '#8cff6a', 5, 8, 2, 1); rr(g, '#8cff6a', 9, 8, 2, 1); rr(g, '#1a120a', 6, 11, 4, 2); rr(g, '#3f6a2c', 4, 13, 8, 2); rr(g, '#4d7a34', 6, 14, 4, 2); }),
  root_heart: art('rh', g => { rr(g, '#2c1f13', 4, 3, 8, 10); rr(g, '#2c1f13', 3, 5, 10, 6); rr(g, '#1f6a2a', 5, 4, 6, 8); rr(g, '#1f6a2a', 4, 6, 8, 4); rr(g, '#4ad04a', 6, 5, 4, 6); rr(g, '#b8ff9a', 7, 6, 2, 3);
    ln(g, '#4a3622', 2, 2, 5, 5); ln(g, '#4a3622', 13, 2, 10, 5); ln(g, '#4a3622', 8, 13, 8, 15); }),
  bronze_sword: art('bs', PXA(T_SWORD, P)), bronze_axe: art('ba', PXA(T_AXE, P)), bronze_mace: art('bm', PXA(T_MACE, P)), bronze_pickaxe: art('bp', PXA(T_PICK, P)),
  bronze_buckler: art('bk', PXA(T_BUCK, P)), bronze_helmet: art('bh', PXA(T_HELM, P)), bronze_chestplate: art('bc', PXA(T_CHEST, P)),
  bronze_leggings: art('bl', PXA(T_LEGS, P)), bronze_boots: art('bo', PXA(T_BOOTS, P)),
};
function defineItems() {
  if (!hasInv() || typeof ITEMS === 'undefined') return;
  const D = d => { try { Inv.defineItem(Object.assign({ icon: ICONS[d.id] }, d)); } catch (e) { console.error('darkforest item', d.id, e); } };
  D({ id: 'copper_ore', name: 'Copper Ore', weight: 2, desc: 'Green-veined rock. Smelt it.' });
  D({ id: 'tin_ore', name: 'Tin Ore', weight: 2, desc: 'Pale, soft ore from the north shore. Smelt it.' });
  D({ id: 'copper', name: 'Copper', weight: 1, desc: 'Two parts of bronze.' });
  D({ id: 'tin', name: 'Tin', weight: 1, desc: 'One part of bronze.' });
  D({ id: 'bronze', name: 'Bronze', weight: 1, rarity: 'uncommon', desc: 'Copper and tin, wed in fire.' });
  D({ id: 'ember_core', name: 'Ember Core', weight: .5, rarity: 'rare', desc: 'A coal that never cools. Smelters need them.' });
  D({ id: 'ancient_seed', name: 'Ancient Seed', weight: .3, rarity: 'rare', stack: 20, desc: 'Stolen from the first tree. The Root Shrine wants three.' });
  D({ id: 'bone_fragments', name: 'Bone Fragments', weight: .3, desc: 'What is left of the ship-folk.' });
  D({ id: 'old_coins', name: 'Old Coins', weight: .1, stack: 99, rarity: 'uncommon', desc: 'Stamped with ships nobody remembers.' });
  D({ id: 'blueberries', name: 'Blueberries', kind: 'food', stack: 20, weight: .1, food: { heal: 2, hunger: 3, stamina: 15, secs: 600 }, desc: 'Sweet and cold. Grows under the dark pines.' });
  D({ id: 'mushroom', name: 'Forest Mushroom', kind: 'food', stack: 20, weight: .1, food: { heal: 3, hunger: 2, stamina: 10, secs: 600 }, desc: 'Red cap, white spots. Tastes of earth.' });
  D({ id: 'old_root_trophy', name: 'Old Root Trophy', kind: 'trophy', stack: 20, weight: 2, rarity: 'boss', desc: 'A face of bark. The eyes still glow.' });
  D({ id: 'drowned_key', name: 'Drowned Key', kind: 'material', stack: 1, weight: .5, rarity: 'boss', desc: 'Green bronze, cold as river water. It opens the sunken crypts of the Swamp.',
    icon: g => { rr(g, '#1c3d2c', 2, 2, 6, 6); rr(g, '#4f9a7a', 3, 3, 4, 4); rr(g, '#1c3d2c', 4, 4, 2, 2); rr(g, '#1c3d2c', 7, 4, 7, 2); rr(g, '#4f9a7a', 7, 5, 6, 1);
      rr(g, '#1c3d2c', 11, 6, 2, 3); rr(g, '#1c3d2c', 13, 6, 1, 2); rr(g, '#7fd8b0', 3, 3, 2, 1); } });
  D({ id: 'root_heart', name: 'Rootheart', weight: 1, stack: 1, rarity: 'boss', desc: 'It beats, very slowly. Korra says it opens the way south, to the swamp.' });
  D({ id: 'smelter', name: 'Smelter', kind: 'station', block: SMELTER, weight: 8, desc: 'Place it, then smelt ore and make bronze near it.', icon: undefined });
  const W = (id, name, o) => D(Object.assign({ id, name, rarity: 'uncommon', tint: '#c8873a' }, o));
  W('bronze_sword', 'Bronze Sword', { kind: 'weapon', durability: 260, weight: 2, weapon: { dmg: 12, speed: .62, stamina: 7 }, desc: 'Quick and sharp. Sweeps on a ground swing.' });
  W('bronze_mace', 'Bronze Mace', { kind: 'weapon', durability: 280, weight: 3.5, weapon: { dmg: 13, speed: .85, stamina: 9 }, desc: 'Blunt. Cracks bones: extra damage to skeletons.' });
  W('bronze_axe', 'Bronze Axe', { kind: 'tool', durability: 260, weight: 2.5, weapon: { dmg: 10, speed: 1, stamina: 8 }, tool: { type: 'axe', power: 3 }, desc: 'Fells the dark pines fast.' });
  W('bronze_pickaxe', 'Bronze Pickaxe', { kind: 'tool', durability: 300, weight: 3, weapon: { dmg: 6, speed: .85, stamina: 7 }, tool: { type: 'pickaxe', power: 3 }, desc: 'Mines ore faster than antler.' });
  W('bronze_buckler', 'Bronze Buckler', { kind: 'shield', durability: 300, weight: 3, shield: { block: 8, parry: 2.5 }, desc: 'Small and fast. Great for parries.' });
  [['bronze_helmet', 'Bronze Helmet', 'head', 3, 200], ['bronze_chestplate', 'Bronze Chestplate', 'chest', 6, 260], ['bronze_leggings', 'Bronze Leggings', 'legs', 5, 240], ['bronze_boots', 'Bronze Boots', 'feet', 2, 200]]
    .forEach(([id, name, slot, pts, dur]) => W(id, name, { kind: 'armor', armor: { slot, armor: pts }, durability: dur, weight: [2, 6, 5, 2][['head', 'chest', 'legs', 'feet'].indexOf(slot)] }));
  // stations and recipes
  try { if (Inv.defineStation) Inv.defineStation('smelter', { name: 'Smelter', block: SMELTER, r: 4, icon: 'smelter' }); } catch (e) { /* older items.js */ }
  const WB = 'workbench', SM = Inv.defineStation ? 'smelter' : WB;
  const A = r => { try { Inv.addRecipe(r); } catch (e) { console.error(e); } };
  A({ out: 'smelter', needs: { stone: 20, resin: 4, ember_core: 2 }, station: WB });
  A({ out: 'copper', needs: { copper_ore: 1, wood: 1 }, station: SM });
  A({ out: 'tin', needs: { tin_ore: 1, wood: 1 }, station: SM });
  A({ out: 'bronze', n: 2, needs: { copper: 2, tin: 1 }, station: SM });
  A({ out: 'bronze_sword', needs: { bronze: 4, wood: 2, leather_scraps: 2 }, station: WB });
  A({ out: 'bronze_mace', needs: { bronze: 5, wood: 3, leather_scraps: 2 }, station: WB });
  A({ out: 'bronze_axe', needs: { bronze: 4, wood: 4 }, station: WB });
  A({ out: 'bronze_pickaxe', needs: { bronze: 3, wood: 3 }, station: WB });
  A({ out: 'bronze_buckler', needs: { bronze: 4, wood: 6 }, station: WB });
  A({ out: 'bronze_helmet', needs: { bronze: 5, deer_hide: 2 }, station: WB });
  A({ out: 'bronze_chestplate', needs: { bronze: 7, deer_hide: 2 }, station: WB });
  A({ out: 'bronze_leggings', needs: { bronze: 6, deer_hide: 2 }, station: WB });
  A({ out: 'bronze_boots', needs: { bronze: 4, deer_hide: 2 }, station: WB });
  // furnace (blocks.js), when it exists: ore smelts there as well
  try { if (typeof Stations !== 'undefined' && Stations && Stations.addSmelt) { Stations.addSmelt('copper_ore', 'copper', 6); Stations.addSmelt('tin_ore', 'tin', 6); } } catch (e) { console.error(e); }
}
defineItems();
const BRONZE_WEAPONS = ['bronze_sword', 'bronze_mace', 'bronze_axe'];
const BRONZE_ALL = BRONZE_WEAPONS.concat(['bronze_pickaxe', 'bronze_buckler', 'bronze_helmet', 'bronze_chestplate', 'bronze_leggings', 'bronze_boots']);
const hasAny = ids => ids.some(id => count(id) > 0) || (hasInv() && Inv.armorPieces && Inv.armorPieces().some(s => s && ids.includes(s.id)));

// =====================================================================================================
//  World generation: the Dark Forest in the north-east
// =====================================================================================================
const DF = { cx: 92, cz: 24, rx: 26, rz: 21, x0: 62, x1: 122, z0: 3, z1: 50 };
const SHR = { x: 96, z: 22, y: 10, cx: 96.5, cz: 22.5 };
const CRY = { x: 76, z: 20, y: 10, fy: 6, cx: 76.5, cz: 20.5 };
const touched = new Set();
const setB = (x, y, z, t) => { set(x, y, z, t); touched.add(Math.floor(x / CS) + ',' + Math.floor(z / CS)); };
const FW = new Float32Array(WX * WZ);
for (let z = DF.z0; z <= DF.z1; z++) for (let x = DF.x0; x <= DF.x1; x++) {
  const n = (vnoise(x * .13 + 40, z * .13 + 9) - .5) * .42, d = Math.hypot((x - DF.cx) / DF.rx, (z - DF.cz) / DF.rz) + n;
  FW[z * WX + x] = biome[z * WX + x] ? 0 : clamp((1 - d) / .16, 0, 1);
}
const fw = (x, z) => { x = Math.floor(x); z = Math.floor(z); return x < 0 || z < 0 || x >= WX || z >= WZ ? 0 : FW[z * WX + x]; };
const inForest = (x, z) => fw(x, z) > .5;
function topY(x, z) { for (let y = WY - 1; y > 0; y--) { const t = get(x, y, z); if (BLOCK[t].solid && t !== LOG && t !== LEAVES && t !== PINE && t !== NEEDLES) return y; } return 0; }
const free = (x, z) => !reserved[z * WX + x];
function scoreFlat(cx, cz, r) {
  let mn = 99, mx = -99, bad = 0;
  for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) { if (dx * dx + dz * dz > r * r) continue; const x = cx + dx, z = cz + dz, i = z * WX + x;
    if (reserved[i] || FW[i] < .4) { bad++; continue; } const h = hmap[i]; if (h <= SEA + 1) bad++; mn = Math.min(mn, h); mx = Math.max(mx, h); }
  return { s: bad * 40 + (mx - mn) * 6, mn, mx };
}
function genForest() {
  const rng = TR;
  // 1) clear the meadow oaks and flowers, darken the ground
  for (let z = DF.z0; z <= DF.z1; z++) for (let x = DF.x0; x <= DF.x1; x++) {
    const w = FW[z * WX + x]; if (w <= 0) continue;
    if (w > .35) for (let y = 1; y < WY; y++) { const t = get(x, y, z); if (t === LOG || t === LEAVES || ((t === TALLGRASS || t === POPPY || t === DANDELION) && w > .5)) setB(x, y, z, AIR); }
    if (!free(x, z)) continue;
    const h = hmap[z * WX + x];
    const top = get(x, h, z);
    if ((top === GRASS && rng() < w * 1.3) || (top === SAND && h === SEA + 1 && w > .55 && rng() < w)) setB(x, h, z, FLOOR);
  }
  // 2) the Root Shrine arena at the heart of the forest
  { let best = null; for (let cz = 14; cz <= 32; cz += 2) for (let cx = 88; cx <= 106; cx += 2) { const s = scoreFlat(cx, cz, 9); s.s += Math.hypot(cx - 97, cz - 22) * .4; if (!best || s.s < best.s) best = Object.assign(s, { cx, cz }); }
    buildShrine(best.cx, best.cz, Math.max(SEA + 2, Math.round((best.mn + best.mx) / 2))); }
  // 3) the burial crypt in the western part
  { let best = null; for (let cz = 12; cz <= 34; cz += 2) for (let cx = 68; cx <= 84; cx += 2) { if (Math.hypot(cx - SHR.x, cz - SHR.z) < 20) continue;
      const s = scoreFlat(cx, cz, 6); if (!best || s.s < best.s) best = Object.assign(s, { cx, cz }); }
    if (best) buildCrypt(best.cx, best.cz, Math.max(SEA + 6, best.mx)); }
  // 4) copper boulders and tin on the north shore
  const farFrom = (x, z, r) => Math.hypot(x - SHR.x, z - SHR.z) > 13 + r && Math.hypot(x - CRY.x, z - CRY.z) > 10 + r;
  ORES.length = 0;
  for (let k = 0, tries = 0; k < 9 && tries < 600; tries++) {
    const x = DF.x0 + 4 + ((rng() * (DF.x1 - DF.x0 - 8)) | 0), z = DF.z0 + 6 + ((rng() * (DF.z1 - DF.z0 - 10)) | 0);
    if (FW[z * WX + x] < .75 || !free(x, z) || !farFrom(x, z, 2) || ORES.some(o => Math.hypot(o.x - x, o.z - z) < 9)) continue;
    const h = topY(x, z); if (h <= SEA + 1) continue;
    const r = 1.7 + rng() * .8; boulder(x, h, z, r, () => rng() < .72 ? COPPER : MSTONE); ORES.push({ x, z, y: h, kind: 'copper' }); k++;
  }
  for (let k = 0, tries = 0; k < 6 && tries < 600; tries++) {
    const x = DF.x0 + 6 + ((rng() * (DF.x1 - DF.x0 - 12)) | 0), z = 6 + ((rng() * 9) | 0);
    if (FW[z * WX + x] < .3 || !free(x, z) || !farFrom(x, z, 1) || ORES.some(o => Math.hypot(o.x - x, o.z - z) < 7)) continue;
    const h = topY(x, z); if (h < SEA) continue;
    boulder(x, h, z, 1.2 + rng() * .5, () => rng() < .75 ? TIN : STONE); ORES.push({ x, z, y: h, kind: 'tin' }); k++;
  }
  // 5) mossy rocks, fallen logs, pines, plants
  for (let z = DF.z0 + 2; z <= DF.z1 - 2; z++) for (let x = DF.x0 + 2; x <= DF.x1 - 2; x++) {
    const w = FW[z * WX + x]; if (w < .5 || !free(x, z)) continue;
    if (Math.hypot(x - SHR.x, z - SHR.z) < 11.5 || (Math.abs(x - CRY.x) < 7 && z > CRY.z - 9 && z < CRY.z + 13)) continue;
    const h = topY(x, z), t = get(x, h, z); if (t !== FLOOR && t !== GRASS) continue;
    if (get(x, h + 1, z) !== AIR) continue;
    const r = rng();
    if (r < .006) boulder(x, h, z, 1 + rng() * .8, () => MSTONE);
    else if (r < .009) { const dx = rng() < .5 ? 1 : 0, dz = 1 - dx, L = 3 + ((rng() * 3) | 0); let ok = true;
      for (let i = 0; i < L; i++) if (get(x + dx * i, h + 1, z + dz * i) !== AIR || topY(x + dx * i, z + dz * i) !== h) ok = false;
      if (ok) for (let i = 0; i < L; i++) setB(x + dx * i, h + 1, z + dz * i, PINE); }
    else if (r < .009 + .23 * w && clearAround(x, h, z)) pine(x, h, z, rng);
  }
  for (let z = DF.z0 + 1; z <= DF.z1 - 1; z++) for (let x = DF.x0 + 1; x <= DF.x1 - 1; x++) {
    const w = FW[z * WX + x]; if (w < .45 || !free(x, z)) continue;
    const h = topY(x, z); if (get(x, h, z) !== FLOOR || get(x, h + 1, z) !== AIR) continue;
    const r = rng();
    if (r < .018) setB(x, h + 1, z, MUSH); else if (r < .034) setB(x, h + 1, z, BERRY); else if (r < .12) setB(x, h + 1, z, TALLGRASS);
  }
  buildRunes();
}
function clearAround(x, y, z) { for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) { const t = get(x + dx, y + 1, z + dz); if (t === PINE || t === LOG) return false; } return true; }
function pine(x, y, z, rng) {
  const th = 7 + ((rng() * 6) | 0);
  for (let i = 1; i <= th; i++) setB(x, y + i, z, PINE);
  for (let yy = y + 3; yy <= y + th; yy++) {
    const f = y + th - yy, r = f === 0 ? 1 : f % 2 ? Math.min(3, 1 + (f >> 1)) : Math.max(1, Math.min(3, f >> 1)) + (f > 5 ? 0 : 0);
    for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) { if (dx * dx + dz * dz > r * r + .6) continue; if (get(x + dx, yy, z + dz) === AIR) setB(x + dx, yy, z + dz, NEEDLES); }
  }
  setB(x, y + th + 1, z, NEEDLES); setB(x, y + th + 2, z, NEEDLES);
}
function boulder(cx, h, cz, r, pick) {
  const R2 = Math.ceil(r);
  for (let dy = -1; dy <= R2; dy++) for (let dz = -R2; dz <= R2; dz++) for (let dx = -R2; dx <= R2; dx++) {
    const d = Math.hypot(dx, dy * 1.25, dz); if (d > r) continue; const x = cx + dx, z = cz + dz, y = h + dy;
    if (!inb(x, y, z) || !free(x, z)) continue; const t = get(x, y, z); if (t === PINE || t === SHRINE || t === BRICKS) continue;
    setB(x, y, z, pick()); if (BLOCK[get(x, y + 1, z)].kind === 'cross') setB(x, y + 1, z, AIR);
  }
}
const ORES = [];
// ---- the Root Shrine: a round mossy clearing, a raised dais, giant roots and a glowing shrine block
const glowQuads = { pos: [], uv: [], idx: [] };
function glowFace(x, y, z, f, variant) {
  const F = FACES[f], o = .02, base = glowQuads.pos.length / 3;
  for (let i = 0; i < 4; i++) { const c = F.c[i]; glowQuads.pos.push(x + c[0] + F.n[0] * o, y + c[1] + F.n[1] * o, z + c[2] + F.n[2] * o); glowQuads.uv.push((variant + F.uv[i][0]) / 4, F.uv[i][1]); }
  glowQuads.idx.push(base, base + 1, base + 2, base + 2, base + 1, base + 3);
}
const SIDES = [0, 1, 4, 5];
const haloSprites = [];
function buildShrine(cx, cz, y0) {
  Object.assign(SHR, { x: cx, z: cz, y: y0, cx: cx + .5, cz: cz + .5 });
  for (let dz = -13; dz <= 13; dz++) for (let dx = -13; dx <= 13; dx++) { if (dx * dx + dz * dz > 169) continue;
    for (let y = 1; y < WY; y++) { const t = get(cx + dx, y, cz + dz); if (t === LOG || t === LEAVES || t === PINE || t === NEEDLES) setB(cx + dx, y, cz + dz, AIR); } }
  for (let dz = -11; dz <= 11; dz++) for (let dx = -11; dx <= 11; dx++) {
    const r = Math.hypot(dx, dz); if (r > 10.6) continue; const x = cx + dx, z = cz + dz; if (!free(x, z)) continue;
    const ring = r >= 7.3 && r < 8.2, inner = r < 7.3;
    for (let y = y0 - 3; y <= y0; y++) setB(x, y, z, y === y0 ? (ring ? DFRUNE : inner ? (TR() < .3 ? MSTONE : FLOOR) : FLOOR) : y > y0 - 2 ? DIRT : STONE);
    for (let y = y0 + 1; y < y0 + 16; y++) setB(x, y, z, AIR);
    hmap[z * WX + x] = y0;
    if (ring) glowFace(x, y0, z, 3, (Math.round(Math.atan2(dz, dx) * 4) % 4 + 4) % 4);
  }
  for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) if (Math.abs(dx) + Math.abs(dz) < 4) setB(cx + dx, y0 + 1, cz + dz, MSTONE);
  setB(cx, y0 + 2, cz, SHRINE); setB(cx, y0 + 3, cz, PINE); setB(cx, y0 + 4, cz, NEEDLES);
  for (const f of SIDES) glowFace(cx, y0 + 2, cz, f, 3);
  // four giant roots crawl out of the dais
  for (const [ax, az] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (let i = 2; i <= 7; i++) {
    const x = cx + ax * i + (i > 4 ? az : 0), z = cz + az * i + (i > 4 ? ax : 0), y = y0 + (i < 4 ? 2 : 1);
    setB(x, y, z, PINE); if (i < 3) setB(x, y - 1, z, PINE);
  }
  for (const [px, pz] of [[-6, -6], [6, -6], [-6, 6], [6, 6]]) {
    for (let y = y0 + 1; y <= y0 + 3; y++) { setB(cx + px, y, cz + pz, DFRUNE); for (const f of SIDES) glowFace(cx + px, y, cz + pz, f, (y + px + f + 40) % 3); }
    setB(cx + px, y0 + 4, cz + pz, NEEDLES);
    const hs = halo(0x8cff6a, 2.6, .35); hs.position.set(cx + px + .5, y0 + 5.2, cz + pz + .5); scene.add(hs); haloSprites.push(hs);
  }
  const hs = halo(0x8cff6a, 3.4, .45); hs.position.set(cx + .5, y0 + 2.5, cz + .5); scene.add(hs); haloSprites.push(hs);
}
// ---- the burial crypt: a sunken stair under a stone arch, a hall of mossy bricks with urns
const URNS = [];
function buildCrypt(cx, cz, y0) {
  const fy = y0 - 4; Object.assign(CRY, { x: cx, z: cz, y: y0, fy, cx: cx + .5, cz: cz + .5 });
  for (let dz = -9; dz <= 13; dz++) for (let dx = -7; dx <= 7; dx++) for (let y = 1; y < WY; y++) { const t = get(cx + dx, y, cz + dz); if (t === LOG || t === LEAVES || t === PINE || t === NEEDLES) setB(cx + dx, y, cz + dz, AIR); }
  // level the ground around it
  for (let dz = -7; dz <= 12; dz++) for (let dx = -5; dx <= 5; dx++) { const x = cx + dx, z = cz + dz; if (!free(x, z)) continue;
    for (let y = fy - 1; y <= y0; y++) if (get(x, y, z) === AIR || y === y0) setB(x, y, z, y === y0 ? FLOOR : DIRT);
    for (let y = y0 + 1; y < y0 + 10; y++) setB(x, y, z, AIR); hmap[z * WX + x] = y0; }
  // hall shell
  for (let dz = -6; dz <= 6; dz++) for (let dx = -4; dx <= 4; dx++) for (let y = fy; y <= y0; y++) {
    const inside = Math.abs(dx) <= 3 && Math.abs(dz) <= 5 && y > fy && y < fy + 4;
    setB(cx + dx, y, cz + dz, inside ? AIR : y === y0 ? (Math.abs(dx) <= 3 && Math.abs(dz) <= 5 ? BRICKS : FLOOR) : y === fy ? MSTONE : BRICKS);
  }
  // pillars inside and a sarcophagus
  for (const [px, pz] of [[-2, -3], [2, -3], [-2, 2], [2, 2]]) for (let y = fy + 1; y < fy + 4; y++) setB(cx + px, y, cz + pz, BRICKS);
  setB(cx, fy + 1, cz - 4, MSTONE); setB(cx, fy + 1, cz - 3, MSTONE); setB(cx, fy + 2, cz - 4, DFRUNE); for (const f of SIDES) glowFace(cx, fy + 2, cz - 4, f, 2);
  // stairs up to the surface towards +z
  for (let i = 0; i < 4; i++) { const z = cz + 6 + i, L = fy + 2 + i;
    for (let dx = -2; dx <= 2; dx++) { const side = Math.abs(dx) === 2;
      for (let y = fy; y <= y0 + 3; y++) { if (side) { if (y <= y0 + (i < 3 ? 0 : 1)) setB(cx + dx, y, z, BRICKS); else setB(cx + dx, y, z, AIR); }
        else setB(cx + dx, y, z, y < L ? (y === L - 1 ? BRICKS : DIRT) : AIR); } } }
  for (let dx = -1; dx <= 1; dx++) for (let y = fy + 1; y < fy + 4; y++) setB(cx + dx, y, cz + 6, y < fy + 2 ? BRICKS : AIR);
  // the arch over the entrance
  for (const px of [-2, 2]) for (let y = y0 + 1; y <= y0 + 3; y++) setB(cx + px, y, cz + 10, BRICKS);
  for (let dx = -2; dx <= 2; dx++) setB(cx + dx, y0 + 4, cz + 10, BRICKS); setB(cx, y0 + 5, cz + 10, DFRUNE); for (const f of SIDES) glowFace(cx, y0 + 5, cz + 10, f, 1);
  // ruined pillars on top
  for (const [px, pz, hh] of [[-4, -6, 3], [4, -6, 2], [-4, 4, 2], [4, 3, 1]]) for (let y = y0 + 1; y <= y0 + hh; y++) setB(cx + px, y, cz + pz, BRICKS);
  // urns and torches
  URNS.length = 0;
  for (const [ux, uz] of [[-3, -5], [3, -5], [-3, 0], [3, 0], [-3, 4], [3, 4]]) { setB(cx + ux, fy + 1, cz + uz, URN); URNS.push({ x: cx + ux, y: fy + 1, z: cz + uz }); }
  if (typeof TORCH !== 'undefined') for (const [tx0, tz0] of [[-1, -5], [1, -5], [0, 5]]) if (get(cx + tx0, fy + 1, cz + tz0) === AIR) setB(cx + tx0, fy + 1, cz + tz0, TORCH);
}
// ---- forest rune stones (lore)
const LORE = [];
const LORE_TEXT = [
  { name: 'Stone of the Pines', lines: ['Moss covers most of the runes. You scrape it away:', '"Before the storm there was the root. The pines are its fingers, and they remember every axe."'] },
  { name: 'Stone of the Smiths', lines: ['A hammer and two stones are carved here, one green, one pale:', '"Green stone and white stone, wed in fire, make a metal that does not bend. But the fire must be fed a living ember."'] },
  { name: 'Stone of the Dead', lines: ['The runes are cut deep, as if in anger:', '"Here lie the ship-folk who would not leave. They keep their embers in clay, and their bones still keep watch."'] },
  { name: 'Stone of the First Tree', lines: ['The stone is warm, and roots have grown around it:', '"Three seeds the grey shamans carry, stolen from the first tree. Return them to the shrine, and its keeper will rise to take them back."'] },
];
function buildRunes() {
  const spots = [[90, 44], [100, 10], [CRY.x + 4, CRY.z + 13], [SHR.x - 11, SHR.z + 9]];
  spots.forEach((s, i) => {
    let best = null;
    for (let dz = -6; dz <= 6; dz++) for (let dx = -6; dx <= 6; dx++) { const x = s[0] + dx, z = s[1] + dz; if (x < 6 || z < 6 || x > WX - 6 || z > WZ - 6 || !free(x, z)) continue;
      const h = topY(x, z), t = get(x, h, z); if ((t !== FLOOR && t !== GRASS) || h <= SEA) continue; if (get(x, h + 1, z) !== AIR && BLOCK[get(x, h + 1, z)].kind !== 'cross') continue;
      const sc = Math.hypot(dx, dz) + (i === 3 && Math.hypot(x - SHR.x, z - SHR.z) < 11 ? 50 : 0); if (!best || sc < best.sc) best = { x, z, h, sc }; }
    if (!best) return; const { x, z, h } = best;
    for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { setB(x + a, h, z + b, MSTONE); if (BLOCK[get(x + a, h + 1, z + b)].kind === 'cross' || get(x + a, h + 1, z + b) === PINE) setB(x + a, h + 1, z + b, AIR); }
    for (let y = h + 1; y <= h + 3; y++) { setB(x, y, z, DFRUNE); if (y > h + 1) for (const f of SIDES) glowFace(x, y, z, f, (y + i + f) % 3); }
    for (let y = h + 4; y < h + 6; y++) if (get(x, y, z) === NEEDLES) setB(x, y, z, AIR);
    const hs = halo(0x8cff6a, 2.2, .3); hs.position.set(x + .5, h + 4.4, z + .5); scene.add(hs); haloSprites.push(hs);
    LORE.push({ x, z, y: h, ...LORE_TEXT[i], read: false });
  });
}
try { genForest(); } catch (e) { console.error('darkforest: generation failed', e); }
for (const k of touched) { const [a, b] = k.split(',').map(Number); buildChunk(a, b); }
let WAY = null;
try { const m = MW(); if (m && m.addWaystone) WAY = m.addWaystone(91 + 3, 38 - 9, { name: 'Waystone', who: 'Vesk',
  lines: ['...the root that held the hall...', '...sleeps where the stones glow green, in the heart of the pines...'],
  pin: () => ({ x: SHR.cx, z: SHR.cz, label: 'Root Shrine' }), onRead: () => { F.waystone = true; advance('waystone'); } }); } catch (e) { console.error('darkforest: waystone', e); }
const runeGlowTex = charTex(64, 16, g => {
  const glyphs = [[[7, 2, 7, 13], [7, 3, 11, 7], [7, 7, 11, 11]], [[4, 2, 4, 13], [11, 2, 11, 13], [4, 3, 11, 12]], [[7, 2, 7, 13], [7, 4, 4, 7], [4, 7, 7, 10], [7, 10, 10, 7], [10, 7, 7, 4]],
    [[8, 2, 8, 13], [8, 5, 4, 2], [8, 5, 12, 2], [8, 9, 4, 6], [8, 9, 12, 6]]];
  glyphs.forEach((gl, k) => { for (const [a, b, c, d] of gl) ln(g, '#1a5a1a', k * 16 + a - 1, b - 1, k * 16 + c - 1, d - 1, 3); for (const [a, b, c, d] of gl) ln(g, '#8cff6a', k * 16 + a, b, k * 16 + c, d, 1); });
});
const runeGlowMat = new THREE.MeshBasicMaterial({ map: runeGlowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide });
const glowMesh = (() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(glowQuads.pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(glowQuads.uv, 2)); g.setIndex(glowQuads.idx); g.computeBoundingSphere();
  const m = new THREE.Mesh(g, runeGlowMat); m.renderOrder = 3; scene.add(m); return m; })();
const loreAt = (x, y, z) => LORE.find(l => l.x === x && l.z === z && y > l.y && y <= l.y + 3);
const inCrypt = p => Math.abs(p.x - CRY.cx) < 4.6 && p.z > CRY.cz - 6.5 && p.z < CRY.cz + 6.5 && p.y < CRY.y - .5;

// =====================================================================================================
//  Particles and effects
// =====================================================================================================
const parts = [], fxObjs = [];
const PUFF = ['#ffffff', '#e2e2e2', '#c4c4c4'].map(c => new THREE.MeshBasicMaterial({ color: c }));
const DIRTM = ['#5d4630', '#3a4f26', '#4a3726'].map(c => new THREE.MeshLambertMaterial({ color: c }));
const BARKM = ['#4a3622', '#2c1f13', '#3f6a2c'].map(c => new THREE.MeshLambertMaterial({ color: c }));
const GREENM = [0x8cff6a, 0x4ad04a, 0xd8ffb0].map(c => new THREE.MeshBasicMaterial({ color: c, fog: false }));
const BONEM = ['#e8e2cc', '#bdb59a'].map(c => new THREE.MeshLambertMaterial({ color: c }));
function puff(c, size = 1, n = 12, mats = PUFF, rise = 1, spread = 1) {
  for (let i = 0; i < n && parts.length < 260; i++) {
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
function groundAt(x, z, fromY) { const xi = Math.floor(x), zi = Math.floor(z);
  for (let y = Math.min(WY - 1, Math.floor(fromY)); y >= 0; y--) if (BLOCK[get(xi, y, zi)].solid) return y + 1; return 0; }
const ringTex = charTex(32, 32, g => { const c = '#8cff6a', d = '#1f5a1a';
  for (let a = 0; a < 64; a++) { const x = Math.round(16 + Math.cos(a / 64 * Math.PI * 2) * 13), y = Math.round(16 + Math.sin(a / 64 * Math.PI * 2) * 13); rr(g, d, x - 1, y - 1, 3, 3); }
  for (let a = 0; a < 64; a++) { const x = Math.round(16 + Math.cos(a / 64 * Math.PI * 2) * 13), y = Math.round(16 + Math.sin(a / 64 * Math.PI * 2) * 13); rr(g, c, x, y); }
  for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; ln(g, d, 16 + Math.cos(a) * 4, 16 + Math.sin(a) * 4, 16 + Math.cos(a + .5) * 11, 16 + Math.sin(a + .5) * 11, 2); } });
const RING_GEO = new THREE.PlaneGeometry(1, 1);
function ring(x, z, py, size, dur) {
  const y = groundAt(x, z, py + 3) + .06;
  const m = new THREE.Mesh(RING_GEO, new THREE.MeshBasicMaterial({ map: ringTex, transparent: true, opacity: .3, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.scale.setScalar(size); scene.add(m); let t = 0;
  const mk = { x, y, z, dead: false, kill() { if (mk.dead) return; mk.dead = true; scene.remove(m); m.material.dispose(); } };
  fxObjs.push({ upd(dt) { if (mk.dead) return false; t += dt; const k = Math.min(1, t / dur); m.rotation.z += dt * (1 + k * 4); m.material.opacity = .3 + k * .7 * (.7 + .3 * Math.sin(t * 30)); return t < dur + 1; }, kill() { mk.kill(); } });
  return mk;
}

// ---- poison (Greyling Shaman orbs): a slow green orb, then damage over time
let poisonT = 0, poisonTick = 0;
const poisonIcon = g => { rr(g, '#1a3a12', 4, 2, 8, 12); rr(g, '#4e9331', 5, 3, 6, 10); rr(g, '#8cff6a', 6, 4, 2, 3); rr(g, '#2a5a1a', 5, 1, 6, 2); };
function poison(secs) {
  poisonT = Math.max(poisonT, secs);
  try { if (typeof Combat !== 'undefined' && Combat.addStatus) Combat.addStatus('df_poison', { name: 'Poisoned', secs: poisonT, icon: poisonIcon, color: '#4e9331' }); } catch (e) { /* optional */ }
}
function poisonUpdate(dt) {
  if (poisonT <= 0) return; poisonT -= dt; poisonTick -= dt;
  if (poisonTick <= 0) { poisonTick = 1.2; const d = DEFS[cur]; if (d.hp > 1) { d.hp -= 1; drawStats(); flashEl.style.background = '#2f8a1a'; fx.flash = Math.max(fx.flash, .25); } }
  if (poisonT <= 0) try { Combat.removeStatus('df_poison'); } catch (e) { /* optional */ }
}
const orbs = [];
const ORB_GEO = new THREE.BoxGeometry(.32, .32, .32);
function fireOrb(from, by) {
  const m = new THREE.Mesh(ORB_GEO, GREENM[1]); m.position.copy(from); const h = halo(0x8cff6a, 1.2, .6); m.add(h); scene.add(m);
  const P = PL(), to = new V3(P.pos.x, P.pos.y + 1.1, P.pos.z), v = to.sub(from).normalize().multiplyScalar(5.5);
  orbs.push({ m, v, life: 6, by }); DS.orb();
}
function updateOrbs(dt) {
  const P = PL();
  for (let i = orbs.length - 1; i >= 0; i--) {
    const o = orbs[i], p = o.m.position; o.life -= dt;
    const want = new V3(P.pos.x - p.x, P.pos.y + 1.1 - p.y, P.pos.z - p.z).normalize().multiplyScalar(5.5); o.v.lerp(want, Math.min(1, dt * .7));
    p.addScaledVector(o.v, dt); o.m.rotation.x += dt * 4; o.m.rotation.y += dt * 5;
    if (R() < dt * 20) puff(p, .3, 1, GREENM, .3, .4);
    let gone = o.life <= 0;
    if (!gone && !calm()) { const ex = p.x - P.pos.x, ez = p.z - P.pos.z, ey = p.y - (P.pos.y + .9);
      if (ex * ex + ez * ez < .5 && Math.abs(ey) < 1.1) { const l = Math.hypot(o.v.x, o.v.z) || 1, hp0 = DEFS[cur].hp; hurt(3, o.by, o.v.x / l, o.v.z / l);
        if (DEFS[cur].hp < hp0) poison(6); gone = true; } }
    if (!gone && BLOCK[get(Math.floor(p.x), Math.floor(p.y), Math.floor(p.z))].solid) gone = true;
    if (gone) { puff(p, .6, 8, GREENM, .6, 1.2); DS.splash(); scene.remove(o.m); orbs.splice(i, 1); }
  }
}

// =====================================================================================================
//  Creatures (same mod style as Chapter I: cubes, strong silhouettes, 2-3 colours + 1 glowing accent)
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
  stagger(secs) { this.stun = Math.max(this.stun, this.isBoss ? Math.min(secs, 1.2) : secs); this.wind = 0; }
  onHurt() {}
  die() { this.dead = 1; this.dying = 0; this.setFlash(true); try { onKill(this); } catch (e) { console.error(e); } }
  setFlash(on) { if (on === this.flashOn) return; this.flashOn = on; for (const m of this.mats) m.emissive.setRGB(on ? .75 : 0, 0, 0); }
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
  update(dt) {
    if (this.removed) return;
    if (this.dead > 0) { this.deathAnim(dt); return; }
    this.t += dt;
    const P = PL(), dx = P.pos.x - this.pos.x, dz = P.pos.z - this.pos.z, d = Math.hypot(dx, dz);
    this.dist = d; this.group.visible = d < 110;
    if (this.flash > 0) this.flash -= dt; this.setFlash(this.flash > 0);
    this.speed = 0; if (this.aggro > 0) this.aggro -= dt;
    if (this.stun > 0) { this.stun -= dt; this.wind = 0; } else this.think(dt, P, dx, dz, d);
    const sp = this.speed; let moved = false;
    if (sp > 0) moved = this.tryMove(this.pos.x + Math.sin(this.yaw) * sp * dt, this.pos.z + Math.cos(this.yaw) * sp * dt);
    this.blocked = sp > 0 && !moved;
    if (Math.abs(this.kb.x) + Math.abs(this.kb.z) > .05) { this.tryMove(this.pos.x + this.kb.x * dt, this.pos.z + this.kb.z * dt); const f = Math.exp(-dt * 7); this.kb.x *= f; this.kb.z *= f; }
    const gy = groundAt(this.pos.x, this.pos.z, this.pos.y + this.step + .1);
    if (this.vy > 0 || this.pos.y > gy + .02) { this.vy -= 24 * dt; this.pos.y += this.vy * dt; if (this.pos.y <= gy) { this.pos.y = gy; this.vy = 0; } }
    else { this.pos.y = lerp(this.pos.y, gy, Math.min(1, dt * 14)); this.vy = 0; }
    let dr = this.yaw - this.group.rotation.y; dr = Math.atan2(Math.sin(dr), Math.cos(dr)); this.group.rotation.y += dr * Math.min(1, dt * this.turn);
    if (moved) this.phase += dt * sp * this.stride;
    this.animate(dt, moved ? sp : 0);
  }
  think() {} animate() {}
}
// ---- Greyling Brute: a big, mossy bark greyling with stone fists. Slow wind-up, heavy slam.
function bruteT() { return {
  bark: tx('gb_bark', 16, 16, '#3a4232', g => { for (let x = 1; x < 16; x += 3) rr(g, '#262c20', x, 0, 1, 16); for (let i = 0; i < 20; i++) rr(g, MOSS[i % 3], (R() * 16) | 0, (R() * 6) | 0); }, .3),
  skin: tx('gb_skin', 8, 8, '#6a775a', null, .26), moss: tx('gb_moss', 8, 8, '#3f6a2c', g => dots(g, '#5a8a3a', [1, 1, 4, 2, 6, 5, 2, 6]), .35),
  face: tx('gb_face', 8, 8, '#6a775a', g => { rr(g, '#3a4232', 0, 1, 8, 2); rr(g, '#262c20', 1, 5, 6, 2); dots(g, '#e8e2cc', [1, 5, 6, 5, 3, 6]); rr(g, '#4f5a44', 3, 3, 2, 2); }, .26),
  stone: tx('gb_stone', 8, 8, '#6a6d68', g => dots(g, '#4e514c', [1, 2, 5, 1, 3, 5, 6, 6]), .25), leg: tx('gb_leg', 4, 8, '#4f5a44', g => rr(g, '#262c20', 0, 6, 4, 2)),
  twig: tx('gb_twig', 4, 8, '#4a3a26', null, .3),
}; }
class Brute extends Creature {
  constructor() {
    super('greyling_brute', 'Greyling Brute', 44); this.height = 1.9; this.stride = 3; this.turn = 5; this.cd = 1; this.wind = 0; this.kbRes = .35;
    const T = bruteT(), eye = glowMat(0xd8ff4a); this.legs = []; this.arms = [];
    for (const s of [-1, 1]) { const p = this.pivot(s * .2, .55, 0); this.box(.26, .55, .26, T.leg, 0, -.27, 0, p); this.legs.push(p); }
    this.body = this.pivot(0, .55, 0); this.body.rotation.x = .35;
    this.box(.86, .78, .56, [T.bark, T.bark, T.moss, T.skin, T.skin, T.bark], 0, .4, 0, this.body);
    this.box(.9, .22, .6, T.moss, 0, .84, -.04, this.body);
    for (const [x, z, rx, rz] of [[-.25, -.2, -.5, .3], [.05, -.25, -.7, 0], [.3, -.2, -.5, -.4]]) { const tw = this.box(.08, .4, .08, T.twig, x, 1.0, z, this.body); tw.rotation.set(rx, 0, rz); }
    this.head = this.pivot(0, .78, .22, this.body);
    this.box(.6, .52, .5, [T.skin, T.skin, T.moss, T.skin, T.face, T.bark], 0, .16, .08, this.head);
    for (const s of [-1, 1]) { this.box(.12, .06, .02, eye, s * .14, .22, .335, this.head); this.box(.08, .2, .08, T.twig, s * .26, .48, 0, this.head).rotation.z = -s * .5; }
    for (const s of [-1, 1]) { const p = this.pivot(s * .58, .62, 0, this.body); this.box(.26, .9, .26, T.skin, 0, -.42, 0, p); this.box(.4, .36, .4, T.stone, 0, -.94, 0, p);
      this.box(.3, .2, .34, T.moss, 0, .02, 0, p); this.arms.push(p); }
    this.group.scale.setScalar(1.1);
  }
  onHurt() { DS.brute(); }
  think(dt, P, dx, dz, d) {
    this.cd -= dt;
    if (calm() || (d > 26 && !(this.aggro > 0))) { this.wind = 0; this.wander(dt, .8); return; }
    this.face(dx, dz);
    if (this.wind > 0) { this.wind -= dt;
      if (this.wind <= 0) { this.slam = .3; shakeT = Math.max(shakeT, .4); DS.slam(); const f = { x: Math.sin(this.yaw), z: Math.cos(this.yaw) };
        puff(new V3(this.pos.x + f.x * 1.3, this.pos.y + .2, this.pos.z + f.z * 1.3), 1.6, 10, DIRTM, -1, 2);
        if (d < 3 && Math.abs(P.pos.y - this.pos.y) < 2.2) hurt(6, this.name, dx / (d || 1), dz / (d || 1)); this.cd = 1.8; }
      return; }
    if (d < 2.6 && this.cd <= 0) { this.wind = .75; DS.brute(); } else if (d > 2) this.speed = 2.7;
    if (this.blocked) { this.yaw += (R() < .5 ? 1 : -1); this.speed = 2.7; }
  }
  animate(dt, sp) {
    const sw = Math.sin(this.phase) * .6 * Math.min(1, sp / 2); this.legs[0].rotation.x = sw; this.legs[1].rotation.x = -sw;
    this.slam = Math.max(0, (this.slam || 0) - dt); const k = Math.min(1, dt * (this.slam > 0 ? 30 : 10));
    for (const a of this.arms) a.rotation.x = lerp(a.rotation.x, this.wind > 0 ? -2.9 : this.slam > 0 ? -.2 : -sw * .7, k);
    this.body.rotation.x = lerp(this.body.rotation.x, this.wind > 0 ? .05 : this.slam > 0 ? .7 : .35, k);
  }
  loot(c) { drop('wood', 2 + (R() < .5 ? 1 : 0), c); drop('resin', 1 + (R() < .5 ? 1 : 0), c); if (R() < .3) drop('greyling_trophy', 1, c); if (R() < .15) drop('ancient_seed', 1, c); }
}
// ---- Greyling Shaman: hooded with leaves, a staff with a glowing seed. Heals its kin, throws slow poison orbs.
function shamanT() { return {
  robe: tx('gs_robe', 8, 8, '#2f4a24', g => { for (let x = 0; x < 8; x += 2) rr(g, '#24391b', x, 0, 1, 8); dots(g, '#4d7a34', [1, 2, 5, 4, 3, 6]); }, .3),
  skin: tx('g_skin2', 8, 8, '#6f7d5e', null, .26), hood: tx('gs_hood', 8, 8, '#3f6a2c', g => dots(g, '#5a8a3a', [1, 1, 3, 2, 6, 1, 5, 5]), .35),
  face: tx('gs_face', 8, 8, '#6f7d5e', g => { rr(g, '#2f4a24', 0, 0, 8, 3); rr(g, '#2a3122', 2, 6, 4, 1); rr(g, '#e8e2cc', 1, 4, 1, 1); rr(g, '#e8e2cc', 6, 4, 1, 1); }, .26),
  staff: tx('gs_staff', 4, 8, '#4a3622', null, .3), leg: tx('g_leg2', 4, 8, '#5d6a4e', g => rr(g, '#2a3122', 0, 6, 4, 2)),
}; }
class Shaman extends Creature {
  constructor() {
    super('greyling_shaman', 'Greyling Shaman', 24); this.height = 1.1; this.stride = 6; this.turn = 9; this.cd = 2 + R() * 2; this.healCd = 3 + R() * 3; this.wind = 0;
    const T = shamanT(), eye = glowMat(0x8cff6a); this.legs = [];
    for (const s of [-1, 1]) { const p = this.pivot(s * .09, .3, 0); this.box(.12, .3, .12, T.leg, 0, -.15, 0, p); this.legs.push(p); }
    this.body = this.pivot(0, .3, 0); this.body.rotation.x = .25;
    this.box(.38, .42, .28, T.robe, 0, .2, 0, this.body); this.box(.46, .18, .34, T.robe, 0, .02, 0, this.body);
    this.head = this.pivot(0, .42, .04, this.body);
    this.box(.4, .36, .34, [T.skin, T.skin, T.hood, T.skin, T.face, T.hood], 0, .16, .04, this.head);
    this.box(.48, .2, .44, T.hood, 0, .38, 0, this.head); const tip = this.box(.22, .2, .22, T.hood, 0, .52, -.06, this.head); tip.rotation.x = -.4;
    for (const s of [-1, 1]) this.box(.07, .05, .02, eye, s * .1, .19, .215, this.head);
    this.arm = this.pivot(.22, .34, 0, this.body); this.box(.09, .4, .09, T.skin, 0, -.18, 0, this.arm);
    this.staff = this.pivot(0, -.36, .04, this.arm); this.box(.06, 1.2, .06, T.staff, 0, .2, 0, this.staff);
    this.orbM = this.box(.16, .16, .16, glowMat(0x8cff6a), 0, .86, 0, this.staff); const h = halo(0x8cff6a, .8, .5); h.position.y = .86; this.staff.add(h);
    const a2 = this.pivot(-.22, .34, 0, this.body); this.box(.09, .4, .09, T.skin, 0, -.18, 0, a2);
  }
  onHurt() { DS.bones(); this.cd = Math.min(this.cd, 1); }
  think(dt, P, dx, dz, d) {
    this.cd -= dt; this.healCd -= dt;
    if (calm() || (d > 28 && !(this.aggro > 0))) { this.wind = 0; this.wander(dt, .9); return; }
    if (this.healCd <= 0) {
      this.healCd = 6; let healed = false;
      for (const e of CREATURES) if (e !== this && !e.removed && e.dead <= 0 && !e.isBoss && e.hp < e.max && e.pos.distanceTo(this.pos) < 10) {
        e.hp = Math.min(e.max, e.hp + 12); healed = true; puff(e.center(), e.height, 8, GREENM, 1.2, .6); }
      for (const t of trollsNear(this.pos, 10)) if (t.hp < t.max) { t.hp = Math.min(t.max, t.hp + 12); healed = true; puff(t.center(), 2, 8, GREENM, 1.2, .6); }
      if (healed) { DS.heal(); this.cast = .5; puff(this.center(), 1, 10, GREENM, 1.5, 1); }
    }
    this.face(dx, dz);
    if (this.wind > 0) { this.wind -= dt; if (this.wind <= 0) { const p = new V3(); this.orbM.getWorldPosition(p); fireOrb(p, this.name); this.cd = 3.2 + R() * 1.5; this.cast = .3; } return; }
    if (d < 5.5) { this.yaw = Math.atan2(-dx, -dz) + Math.sin(this.t) * .6; this.speed = 3; }
    else if (d > 12) this.speed = 2.6;
    else if (this.cd <= 0) this.wind = .8;
    if (this.blocked) { this.yaw += (R() < .5 ? 1.2 : -1.2); this.speed = 3; }
  }
  animate(dt, sp) {
    const sw = Math.sin(this.phase) * .8 * Math.min(1, sp / 2); this.legs[0].rotation.x = sw; this.legs[1].rotation.x = -sw;
    this.cast = Math.max(0, (this.cast || 0) - dt);
    this.arm.rotation.x = lerp(this.arm.rotation.x, this.wind > 0 ? -2.5 : this.cast > 0 ? -1.4 : -.3, Math.min(1, dt * 10));
    this.orbM.scale.setScalar(this.wind > 0 ? 1.4 + Math.sin(this.t * 30) * .2 : 1); this.head.rotation.z = Math.sin(this.t * 2) * .1;
  }
  loot(c) { drop('ancient_seed', 1 + (R() < .3 ? 1 : 0), c); drop('resin', 1, c); if (R() < .2) drop('greyling_trophy', 1, c); }
}
// ---- Crypt Skeleton: bone white, red eyes, a rusty sword. Takes extra damage from blunt weapons.
function skelT() { return {
  bone: tx('sk_bone', 4, 8, '#e8e2cc', g => rr(g, '#bdb59a', 0, 3, 4, 1), .12), skull: tx('sk_skull', 8, 8, '#e8e2cc', null, .12),
  face: tx('sk_face', 8, 8, '#e8e2cc', g => { rr(g, '#2a2420', 1, 3, 2, 2); rr(g, '#2a2420', 5, 3, 2, 2); rr(g, '#2a2420', 3, 5, 2, 1); for (let x = 1; x < 7; x += 2) rr(g, '#bdb59a', x, 6, 1, 2); }, .12),
  ribs: tx('sk_ribs', 8, 8, '#2a2420', g => { for (let y = 1; y < 8; y += 2) rr(g, '#e8e2cc', 0, y, 8, 1); rr(g, '#d8d0b8', 3, 0, 2, 8); }, .05),
  rust: tx('sk_rust', 4, 8, '#8a5a3a', g => dots(g, '#5a3a22', [1, 1, 2, 4, 1, 6]), .3), cloth: tx('sk_cloth', 8, 4, '#4a2a2a', null, .3),
}; }
class Skeleton extends Creature {
  constructor() {
    super('skeleton', 'Crypt Skeleton', 28); this.height = 1.9; this.stride = 4; this.turn = 8; this.cd = .6 + R(); this.wind = 0; this.headroom = 2;
    const T = skelT(), eye = glowMat(0xff3a2a); this.legs = [];
    for (const s of [-1, 1]) { const p = this.pivot(s * .12, .85, 0); this.box(.1, .85, .1, T.bone, 0, -.42, 0, p); this.legs.push(p); }
    this.box(.4, .14, .22, T.cloth, 0, .9, 0);
    this.body = this.pivot(0, .9, 0); this.box(.42, .55, .2, T.ribs, 0, .32, 0, this.body); this.box(.08, .2, .08, T.bone, 0, .02, 0, this.body);
    this.head = this.pivot(0, .62, 0, this.body); this.box(.4, .38, .38, [T.skull, T.skull, T.skull, T.skull, T.face, T.skull], 0, .2, 0, this.head);
    for (const s of [-1, 1]) this.box(.08, .06, .02, eye, s * .1, .2, .195, this.head);
    this.arms = [];
    for (const s of [-1, 1]) { const p = this.pivot(s * .27, .55, 0, this.body); this.box(.09, .7, .09, T.bone, 0, -.33, 0, p); this.arms.push(p); }
    const sw = this.box(.08, .9, .14, T.rust, 0, -.75, .38, this.arms[1]); sw.rotation.x = 1.4; this.box(.26, .06, .08, T.rust, 0, -.68, .02, this.arms[1]);
  }
  onHurt() { DS.bones(); puff(this.center(), .6, 3, BONEM, 1, 1); }
  think(dt, P, dx, dz, d) {
    this.cd -= dt;
    if (calm() || d > 22) { this.wind = 0; this.wander(dt, .6); return; }
    this.face(dx, dz);
    if (this.wind > 0) { this.wind -= dt; if (this.wind <= 0) { this.swing = .25; DS.whoosh(); if (d < 2.3 && Math.abs(P.pos.y - this.pos.y) < 2) hurt(4, this.name, dx / (d || 1), dz / (d || 1)); this.cd = 1.3; } return; }
    if (d < 2 && this.cd <= 0) { this.wind = .45; DS.bones(); } else if (d > 1.5) this.speed = 2.6;
    if (this.blocked) { this.yaw += (R() < .5 ? 1 : -1); this.speed = 2.6; }
  }
  animate(dt, sp) {
    const sw = Math.sin(this.phase) * .7 * Math.min(1, sp / 2); this.legs[0].rotation.x = sw; this.legs[1].rotation.x = -sw;
    this.swing = Math.max(0, (this.swing || 0) - dt); const k = Math.min(1, dt * 14);
    this.arms[1].rotation.x = lerp(this.arms[1].rotation.x, this.wind > 0 ? -2.4 : this.swing > 0 ? .3 : -sw * .5 - .3, k); this.arms[0].rotation.x = sw * .5;
    this.head.rotation.y = Math.sin(this.t * 1.7) * .2;
  }
  deathAnim(dt) { this.dying += dt; this.group.scale.y = Math.max(.1, 1 - this.dying * 1.4);
    if (this.dying > .6) { const c = this.center(); puff(c, 1.5, 14, BONEM, -1, 2); DS.bones(); this.loot(c); this.remove(); } }
  loot(c) { drop('bone_fragments', 1 + (R() < .5 ? 1 : 0), c); if (R() < .35) drop('old_coins', 1 + ((R() * 4) | 0), c); if (R() < .12) drop('ember_core', 1, c); }
}

// =====================================================================================================
//  The Old Root: a walking tree giant with a log club, glowing green eyes and roots for feet
// =====================================================================================================
function rootT() { return {
  bark: tx('or_bark', 16, 16, '#4a3622', g => { for (const x of [1, 4, 7, 10, 13]) for (let y = 0; y < 16; y++) if (R() < .8) rr(g, '#2c1f13', x + (y % 5 === 0 ? 1 : 0), y); for (let i = 0; i < 8; i++) rr(g, '#5e4630', (R() * 16) | 0, (R() * 16) | 0, 1, 3); }, .2),
  barkM: tx('or_barkm', 16, 16, '#4a3622', g => { for (const x of [2, 6, 11, 14]) ln(g, '#2c1f13', x, 0, x + 1, 15); for (let i = 0; i < 50; i++) rr(g, MOSS[i % 3], (R() * 16) | 0, (R() * 7) | 0); }, .2),
  chest: tx('or_chest', 16, 16, '#4a3622', g => { for (const x of [1, 5, 10, 14]) ln(g, '#2c1f13', x, 0, x, 15); ln(g, '#1f6a2a', 8, 3, 8, 12); ln(g, '#1f6a2a', 8, 6, 4, 9); ln(g, '#1f6a2a', 8, 8, 12, 11); dots(g, '#8cff6a', [8, 4, 8, 9, 5, 8, 11, 10]); }, .2),
  face: tx('or_face', 16, 16, '#4a3622', g => { rr(g, '#2c1f13', 0, 3, 16, 2); rr(g, '#1a120a', 3, 6, 4, 3); rr(g, '#1a120a', 9, 6, 4, 3); rr(g, '#1a120a', 4, 11, 8, 3); rr(g, '#2c1f13', 7, 7, 2, 4); for (let x = 5; x < 12; x += 2) rr(g, '#5e4630', x, 11, 1, 1); }, .2),
  moss: tx('or_moss', 8, 8, '#3f6a2c', g => dots(g, '#5a8a3a', [1, 1, 4, 2, 6, 5, 2, 6, 3, 4]), .35),
  needles: tx('or_needles', 16, 16, '#1c3d27', g => { for (let i = 0; i < 80; i++) rr(g, R() < .5 ? '#14301f' : '#2f6339', (R() * 16) | 0, (R() * 16) | 0); }, .3),
  log: tx('or_log', 16, 8, '#3b2a1c', g => { for (const y of [1, 4, 6]) rr(g, '#271b11', 0, y, 16, 1); }, .2), logEnd: tx('or_logend', 8, 8, '#6e5236', g => { rr(g, '#5a4229', 2, 2, 4, 4); rr(g, '#4a351f', 3, 3, 2, 2); }),
}; }
class OldRoot extends Creature {
  constructor() {
    super('old_root', 'The Old Root', 560); this.isBoss = true; this.height = 9; this.step = 1.6; this.kbRes = 0; this.turn = 1.8; this.stride = .8;
    this.mode = 'intro'; this.mt = 0; this.cd = 2; this.awayT = 0;
    const T = rootT(), eye = glowMat(0x8cff6a);
    this.rig = this.pivot(0, 0, 0); const G = this.rig; this.legs = [];
    for (const s of [-1, 1]) { const p = this.pivot(s * 1.05, 3.2, 0, G); this.box(1.2, 1.9, 1.2, T.bark, 0, -.9, 0, p); this.box(1, 1.5, 1, T.barkM, 0, -2.4, .05, p);
      for (const ry of [0, 2.1, -2.1]) { const r = this.pivot(0, -3.05, 0, p); r.rotation.set(0, ry, 0); const b = this.box(.36, .36, 1.5, T.bark, 0, 0, .7, r); b.rotation.x = .35; }
      this.legs.push(p); }
    this.body = this.pivot(0, 3.2, 0, G);
    this.box(3, 3.6, 2.2, [T.bark, T.bark, T.barkM, T.bark, T.chest, T.bark], 0, 1.8, 0, this.body);
    for (const [x, y, w, h] of [[-.6, 2.2, .1, 1.2], [.4, 1.5, .1, .9], [.1, 2.9, .5, .1]]) this.box(w, h, .06, eye, x, y, 1.12, this.body);
    this.box(3.3, .8, 2.5, T.moss, 0, 3.5, 0, this.body);
    for (const s of [-1, 1]) this.box(1.3, 1.1, 1.3, T.barkM, s * 1.9, 3.3, 0, this.body);
    for (const [x, z, h] of [[-1.1, .9, 1.6], [.6, 1, 1.2], [1.2, -.9, 1.8], [-.4, -1, 1.4]]) this.box(.18, h, .18, T.bark, x, -h / 2 + .2, z, this.body);
    this.arms = [];
    for (const s of [-1, 1]) {
      const a = this.pivot(s * 2.05, 3.1, 0, this.body); this.box(.95, 2.7, .95, T.bark, 0, -1.3, 0, a);
      const f = this.pivot(0, -2.6, 0, a); this.box(.8, 2.4, .8, T.barkM, 0, -1.15, 0, f);
      for (const [fx, fz] of [[-.25, .2], [.25, .2], [0, -.25]]) { const t = this.box(.22, 1, .22, T.bark, fx, -2.6, fz, f); t.rotation.x = fz > 0 ? .35 : -.35; }
      this.arms.push({ a, f });
    }
    const club = this.pivot(0, -2.5, .3, this.arms[1].f);
    this.box(1, 1, 5.6, [T.log, T.log, T.log, T.log, T.logEnd, T.logEnd], 0, 0, 2.2, club);
    this.head = this.pivot(0, 3.7, .2, this.body);
    this.box(2.1, 1.9, 1.9, [T.bark, T.bark, T.barkM, T.bark, T.face, T.bark], 0, .95, 0, this.head);
    for (const s of [-1, 1]) { this.box(.52, .28, .08, eye, s * .5, 1.18, .97, this.head); const h = halo(0x8cff6a, 1.1, .6); h.position.set(s * .5, 1.18, 1.05); this.head.add(h); }
    this.box(1.6, .9, .3, T.moss, 0, .1, 1, this.head);
    this.box(2.8, 1, 2.6, T.needles, 0, 2.3, 0, this.head); this.box(1.9, .9, 1.9, T.needles, 0, 3.2, 0, this.head); this.box(.9, .8, .9, T.needles, 0, 4, 0, this.head);
    for (const s of [-1, 1]) { const b = this.pivot(s * .9, 1.8, 0, this.head); b.rotation.z = -s * .8; this.box(.3, 2, .3, T.bark, 0, 1, 0, b); this.box(1.1, .6, 1.1, T.needles, 0, 2, 0, b); }
    this.rig.position.y = -9;
  }
  center() { const P = PL(); return new V3(this.pos.x, clamp(P.pos.y + 1.4, this.pos.y + 1.5, this.pos.y + 7), this.pos.z); }
  onHurt() { DS.crack(); puff(this.center(), 1, 4, BARKM, -1, 1.5); }
  think(dt, P, dx, dz, d) {
    const enr = this.hp < this.max * .5;
    if (this.mode === 'intro') { this.mt += dt; this.face(dx, dz); this.rig.position.y = Math.min(0, -9 + this.mt * 3);
      if (R() < dt * 25) puff(new V3(this.pos.x + (R() - .5) * 4, this.pos.y + .3, this.pos.z + (R() - .5) * 4), 1.5, 3, DIRTM, -1, 2);
      if (this.mt > 4.4) { this.mode = 'chase'; this.immune = false; this.cd = 1.5; this.rig.position.y = 0; } return; }
    const ad = Math.hypot(P.pos.x - SHR.cx, P.pos.z - SHR.cz);
    this.awayT = ad > 46 ? this.awayT + dt : 0;
    if (this.awayT > 10) { despawnBoss(true); return; }
    if (calm()) { if (this.mode !== 'chase') { this.mode = 'chase'; this.cd = 1.5; } return; }
    if (d < 2.6) { const l = d || 1, k = (2.6 - d) * Math.min(1, dt * 10); P.pos.x += dx / l * k; P.pos.z += dz / l * k; }
    if (enr && !this.enraged) { this.enraged = true; DS.groan(); say('The Old Root tears its roots free. It is angry now!', 3); shakeT = Math.max(shakeT, .8); }
    switch (this.mode) {
      case 'chase': {
        const home = Math.hypot(this.pos.x - SHR.cx, this.pos.z - SHR.cz);
        if (home > 22) this.face(SHR.cx - this.pos.x, SHR.cz - this.pos.z); else this.face(dx, dz);
        if (d > 5 || home > 22) this.speed = enr ? 2.8 : 2.2;
        this.cd -= dt;
        if (this.cd <= 0) { const r = R();
          if (d < 7.5) this.begin(r < .55 ? 'sweepWind' : r < .8 ? 'rootWind' : 'vineWind');
          else if (d < 24) this.begin(r < .6 ? 'rootWind' : 'vineWind');
          else this.begin('rootWind'); }
        break; }
      case 'sweepWind': this.mt -= dt; if (this.mt > .25) this.face(dx, dz);
        if (this.mt <= 0) { this.mode = 'sweep'; this.mt = .4; this.hitDone = false; DS.whoosh(); } break;
      case 'sweep': { this.mt -= dt;
        if (!this.hitDone && this.mt < .25) { this.hitDone = true; const f = { x: Math.sin(this.yaw), z: Math.cos(this.yaw) }, along = (dx * f.x + dz * f.z) / (d || 1);
          if (d < 8.5 && along > .2 && Math.abs(P.pos.y - this.pos.y) < 4) { hurt(enr ? 8 : 7, this.name, dx / (d || 1), dz / (d || 1)); P.vel.y = 7; }
          shakeT = Math.max(shakeT, .4); puff(new V3(this.pos.x + f.x * 5, this.pos.y + .4, this.pos.z + f.z * 5), 3, 12, DIRTM, -1, 3); }
        if (this.mt <= 0) { this.mode = 'recover'; this.mt = .9; } break; }
      case 'rootWind': this.mt -= dt; this.face(dx, dz);
        if (this.mt <= 0) { this.eruptLines(enr ? 3 : 1); this.mode = 'recover'; this.mt = 1; } break;
      case 'vineWind': this.mt -= dt; if (this.mt <= 0) { this.vines(); this.mode = 'recover'; this.mt = .8; } break;
      case 'recover': this.mt -= dt; if (this.mt <= 0) { this.mode = 'chase'; this.cd = enr ? .7 : 1.4; } break;
    }
  }
  begin(m) {
    this.mode = m; const P = PL();
    if (m === 'sweepWind') { this.mt = .95; DS.groan(); }
    if (m === 'rootWind') { this.mt = 1.1; DS.rumble(); shakeT = Math.max(shakeT, .3); this.aim = { x: P.pos.x, z: P.pos.z }; }
    if (m === 'vineWind') { this.mt = .5; DS.groan(); this.vineAt = ring(P.pos.x, P.pos.z, P.pos.y, 3.6, 1.2); }
  }
  eruptLines(n) {
    DS.rumble(); const a0 = Math.atan2(this.aim.x - this.pos.x, this.aim.z - this.pos.z), ox = this.pos.x, oz = this.pos.z, oy = this.pos.y;
    for (let k = 0; k < n; k++) { const a = a0 + (k - (n - 1) / 2) * .38, fx = Math.sin(a), fz = Math.cos(a);
      for (let i = 0; i < 14; i++) { const dist = 2.5 + i * 1.3, x = ox + fx * dist, z = oz + fz * dist;
        later(.03 * i, () => puff(new V3(x, groundAt(x, z, oy + 4) + .2, z), .8, 3, DIRTM, -1, 1));
        later(.45 + .06 * i, () => { if (!this.removed && this.dead <= 0) spike(x, z, oy, this.name); }); } }
  }
  vines() { const mk = this.vineAt; if (!mk) return; this.vineAt = null;
    later(.7, () => { mk.kill(); if (!this.removed && this.dead <= 0) vineBurst(mk.x, mk.y, mk.z, this.name); }); }
  animate(dt, sp) {
    const sw = Math.sin(this.phase) * .35 * Math.min(1, sp / 1.5), k = Math.min(1, dt * 6), m = this.mode;
    this.legs[0].rotation.x = sw; this.legs[1].rotation.x = -sw;
    const L = this.arms[0], A = this.arms[1];
    let ra = -sw * .4, ry = 0, la = sw * .4;
    if (m === 'sweepWind') { ra = -1.6; ry = 1.4; } if (m === 'sweep') { ra = -1.5; ry = -1.2; }
    if (m === 'rootWind') { la = -2.6; ra = -2.6; } if (m === 'vineWind') { la = -1.2; ra = -.4; }
    if (m === 'intro') { la = -2.8 + Math.sin(this.t * 3) * .2; ra = -2.8; }
    const fast = m === 'sweep' ? Math.min(1, dt * 16) : k;
    A.a.rotation.x = lerp(A.a.rotation.x, ra, fast); A.a.rotation.y = lerp(A.a.rotation.y, ry, fast);
    L.a.rotation.x = lerp(L.a.rotation.x, la, k); L.f.rotation.x = lerp(L.f.rotation.x, m === 'rootWind' ? 1 : -.3, k); A.f.rotation.x = lerp(A.f.rotation.x, -.4, k);
    this.body.rotation.x = lerp(this.body.rotation.x, m === 'rootWind' && this.mt < .4 ? .35 : m === 'sweepWind' ? -.12 : 0, k);
    this.body.rotation.y = lerp(this.body.rotation.y, m === 'sweepWind' ? .4 : m === 'sweep' ? -.5 : 0, k);
    this.head.rotation.z = Math.sin(this.t * .7) * .05;
    if (m === 'rootWind' && this.aim && R() < dt * 30) { const t = R(), x = lerp(this.pos.x, this.aim.x, t), z = lerp(this.pos.z, this.aim.z, t); puff(new V3(x, groundAt(x, z, this.pos.y + 4) + .2, z), .6, 2, DIRTM, -1, 1); }
  }
  deathAnim(dt) {
    this.dying += dt; this.group.rotation.x = -Math.min(1, this.dying / 2) * Math.PI / 2 * .95;
    if (R() < dt * 25) puff(new V3(this.pos.x + (R() - .5) * 3, this.pos.y + R() * 6, this.pos.z + (R() - .5) * 3), 1.5, 3, BARKM, -1, 2);
    if (!this.thud && this.dying > 1.9) { this.thud = true; shakeT = Math.max(shakeT, 1); DS.slam(); DS.crack(); }
    if (this.dying > 2.6) { const c = new V3(this.pos.x, this.pos.y + 2, this.pos.z); puff(c, 6, 50, BARKM, 1, 3); puff(c, 4, 30, GREENM, 1.5, 2);
      flashEl.style.background = '#c8ffb0'; fx.flash = Math.max(fx.flash, .6); this.loot(c); this.remove(); }
  }
  loot(c) { drop('old_root_trophy', 1, c); drop('drowned_key', 1, c); drop('wood', 12, c); }
  remove() { if (this.vineAt) { this.vineAt.kill(); this.vineAt = null; } super.remove(); }
}
// root spike: three stacked bark boxes burst out of the ground
const SPIKE_M = new THREE.MeshLambertMaterial({ map: tx('or_spike', 8, 8, '#4a3622', g => { ln(g, '#2c1f13', 2, 0, 2, 7); ln(g, '#2c1f13', 5, 0, 6, 7); dots(g, '#3f6a2c', [1, 6, 4, 7, 6, 5]); }, .2) });
function spike(x, z, py, by) {
  const y = groundAt(x, z, py + 4); if (!y) return;
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.set((R() - .5) * .4, R() * 3, (R() - .5) * .4);
  for (const [w, h, yy] of [[.8, 1, .5], [.55, .9, 1.4], [.3, .8, 2.2]]) { const b = new THREE.Mesh(boxGeo(w, h, w), SPIKE_M); b.position.y = yy; g.add(b); }
  scene.add(g); puff(new V3(x, y + .3, z), 1, 5, DIRTM, -1, 2); DS.crack();
  const P = PL(); if (!calm() && Math.hypot(P.pos.x - x, P.pos.z - z) < 1.2 && Math.abs(P.pos.y - y) < 2.2) { hurt(6, by, (P.pos.x - x) || .1, (P.pos.z - z) || .1); P.vel.y = 9; }
  let t = 0; fxObjs.push({ upd(dt) { t += dt; const k = t < .12 ? t / .12 : t < 1 ? 1 : Math.max(0, 1 - (t - 1) / .5); g.scale.set(1, Math.max(.01, k), 1); return t < 1.5; }, kill() { scene.remove(g); } });
}
// vines rise in a ring and hold the player if they did not step out
let held = 0;
const VINE_M = new THREE.MeshLambertMaterial({ map: tx('or_vine', 4, 8, '#2f6a24', g => dots(g, '#8cff6a', [1, 2, 2, 5]), .3) });
function vineBurst(x, y, z, by) {
  const g = new THREE.Group(); g.position.set(x, y, z); const vs = [];
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, p = new THREE.Group(); p.position.set(Math.cos(a) * 1.5, 0, Math.sin(a) * 1.5); p.rotation.y = -a;
    const b = new THREE.Mesh(boxGeo(.2, 2.4, .2), VINE_M); b.position.y = 1.2; p.add(b); const t2 = new THREE.Mesh(boxGeo(.14, 1, .14), VINE_M); t2.position.set(0, 2.6, 0); t2.rotation.z = .6; p.add(t2); g.add(p); vs.push(p); }
  scene.add(g); DS.vine(); puff(new V3(x, y + .3, z), 2, 10, DIRTM, -1, 2);
  const P = PL(), caught = !calm() && Math.hypot(P.pos.x - x, P.pos.z - z) < 1.9 && Math.abs(P.pos.y - y) < 2;
  if (caught) { held = 2.2; hurt(2, by, 0, 0); P.vel.set(0, 0, 0); say('Vines hold you fast! Struggle (move) to break free.', 2.2); }
  let t = 0;
  fxObjs.push({ upd(dt) { t += dt; const k = t < .2 ? t / .2 : caught ? (held > 0 ? 1 : Math.max(0, 1 - (t - .2) * 3)) : Math.max(0, 1 - (t - .9) / .4);
    for (const p of vs) { p.scale.y = Math.max(.01, k); p.rotation.x = caught ? -.55 * k : -.2; }
    if (caught && held > 0) g.position.set(PL().pos.x, PL().pos.y, PL().pos.z);
    return t < .3 || (caught ? (held > 0 || k > 0) && t < 6 : t < 1.4); }, kill() { scene.remove(g); } });
}
on('input', (inp, pl) => {
  if (!inp || held <= 0) return inp;
  if (inp.f || inp.r || inp.jump) held -= .016;                     // struggling breaks free faster
  pl.vel.x = 0; pl.vel.z = 0; inp.f = 0; inp.r = 0; inp.jump = false; return inp;
});

// ---- more Forest Trolls roam the Dark Forest (the main script's Troll class, with loot and a clean despawn)
const TROLLS = [];
function trollsNear(p, r) { const out = []; if (typeof troll !== 'undefined' && troll && troll.dead <= 0 && troll.pos.distanceTo(p) < r) out.push(troll);
  for (const t of TROLLS) if (!t.removed && t.dead <= 0 && t.pos.distanceTo(p) < r) out.push(t); return out; }
function removeTroll(t) { if (t.removed) return; t.removed = true; t.dead = 9999; scene.remove(t.group); for (const m of t.mats || []) m.dispose(); const i = TROLLS.indexOf(t); if (i >= 0) TROLLS.splice(i, 1); }
function spawnTroll(x, z) {
  if (typeof Troll === 'undefined') return null;
  const t = new Troll(x, z); t.name = 'Forest Troll'; t.kind = 'troll'; t.extra = true; t.pos.y = topY(Math.floor(x), Math.floor(z)) + 1;
  const oHit = t.hit.bind(t), oUpd = t.update.bind(t);
  t.hit = function (dmg, dir) { if (this.removed || this.dead > 0) return; oHit(dmg, dir || new V3());
    if (this.hp <= 0) { const c = this.center(); drop('troll_hide', 3, c); if (R() < .5) drop('troll_trophy', 1, c); try { onKill(this); } catch (e) { console.error(e); } later(.05, () => removeTroll(this)); } };
  t.update = function (dt) { if (this.removed) return; if (!(this.dead > 0) && calm()) { this.wind = 0; return; } oUpd(dt); };
  ENTITIES.push(t); TROLLS.push(t); return t;
}
// the main script's Forest Troll lived next to the spawn meadow and killed new players in their first minute;
// like in Valheim, trolls belong to the dark forest, so move its home to an open clearing here
if (typeof troll !== 'undefined' && troll && troll.home) {
  let spot = null;
  for (let r = 0; r < 24 && !spot; r++) for (let a = 0; a < 16 && !spot; a++) {
    const x = Math.floor(84 + Math.cos(a / 16 * Math.PI * 2) * r), z = Math.floor(30 + Math.sin(a / 16 * Math.PI * 2) * r), ty = topY(x, z);
    if (ty > SEA && inForest(x + .5, z + .5) && Math.hypot(x - 91, z - 38) > 20 && BLOCK[get(x, ty, z)].solid && !BLOCK[get(x, ty + 1, z)].solid && !BLOCK[get(x, ty + 2, z)].solid && Math.hypot(x - SHR.cx, z - SHR.cz) > 14 && Math.hypot(x - CRY.cx, z - CRY.cz) > 14) spot = { x: x + .5, z: z + .5, y: ty + 1 };
  }
  if (spot) { troll.home.set(spot.x, 0, spot.z); troll.pos.set(spot.x, spot.y, spot.z);
    const u = troll.update; troll.update = function (dt) { const was = this.dead > 0; u.call(this, dt); if (was && !(this.dead > 0)) this.pos.y = spot.y; };   // respawn under the pines, not on top
  }
}

// =====================================================================================================
//  Spawning (tuned for phones): brutes, shamans and trolls in the forest, skeletons in the crypt
// =====================================================================================================
const KINDS = { greyling_brute: Brute, greyling_shaman: Shaman, skeleton: Skeleton };
function spawn(kind, x, z, y) { if (kind === 'troll') return spawnTroll(x, z); const C = KINDS[kind]; if (!C) return null; return new C().spawnAt(x, z, y); }
function spawnSpot(P, r0, r1) {
  for (let k = 0; k < 12; k++) {
    const a = R() * Math.PI * 2, r = r0 + R() * (r1 - r0), x = Math.floor(P.pos.x + Math.cos(a) * r), z = Math.floor(P.pos.z + Math.sin(a) * r);
    if (x < 5 || z < 5 || x > WX - 5 || z > WZ - 5 || fw(x, z) < .6 || !free(x, z)) continue;
    if (Math.hypot(x - SHR.cx, z - SHR.cz) < 12 || (Math.abs(x - CRY.cx) < 7 && z > CRY.cz - 9 && z < CRY.cz + 13)) continue;
    const h = topY(x, z); if (get(x, h, z) !== FLOOR || h <= SEA + 1) continue;
    return { x: x + .5, z: z + .5 };
  }
  return null;
}
let spawnT = 3, trollCd = 40;
const crypt = { skelT: 0 };
function spawnTick(dt) {
  spawnT -= dt; trollCd -= dt; crypt.skelT -= dt; if (spawnT > 0) return; spawnT = 2;
  const P = PL(), cnt = { greyling_brute: 0, greyling_shaman: 0, skeleton: 0 };
  for (const e of CREATURES) { if (e.removed || e.dead > 0) continue;
    const far = Math.hypot(e.pos.x - P.pos.x, e.pos.z - P.pos.z);
    if (!e.isBoss && (far > 80 || (e.kind === 'skeleton' && far > 50))) { e.remove(); continue; }
    if (cnt[e.kind] !== undefined) cnt[e.kind]++; }
  for (const t of TROLLS.slice()) if (t.dead <= 0 && t.pos.distanceTo(P.pos) > 90) removeTroll(t);
  // the crypt wakes when you walk into it
  if (inCrypt(P.pos) && cnt.skeleton === 0 && crypt.skelT <= 0) {
    crypt.skelT = 300; DS.bones(); say('Bones rattle in the dark...', 2.5);
    for (const [ox, oz] of [[-1.5, -4], [1.5, -4], [0, -1.5]]) spawn('skeleton', CRY.cx + ox, CRY.cz + oz, CRY.fy + 1);
  }
  if (cine || boss || fk < .3) return;
  let total = 0; for (const e of ENTITIES) if (!(e.dead > 0) && !e.removed) total++;
  if (total >= 22) return;
  const ch = started(), needSeeds = ch && !F.summoned && count('ancient_seed') < 3;
  const want = [['greyling_shaman', needSeeds ? 2 : 1, 16, 30, needSeeds ? .5 : .25], ['greyling_brute', ch ? 2 : 1, 18, 32, .3]];
  for (const [k, cap, r0, r1, p] of want) if (cnt[k] < cap && R() < p) { const s = spawnSpot(P, r0, r1); if (s) { spawn(k, s.x, s.z); return; } }
  if (trollCd <= 0 && !TROLLS.some(t => !t.removed && t.dead <= 0)) { trollCd = 110 + R() * 60; const s = spawnSpot(P, 24, 36); if (s) spawnTroll(s.x, s.z); }
}

// =====================================================================================================
//  UI: advancement toasts (same look as Chapter I)
// =====================================================================================================
const css = document.createElement('style');
css.textContent = `
#dfAdv { position: fixed; z-index: 6; right: 12px; top: calc(12px + env(safe-area-inset-top, 0px)); width: 300px; display: flex; gap: 10px; align-items: center; padding: 10px 12px; box-sizing: border-box;
  background: #212121; border: 2px solid #000; box-shadow: inset 0 0 0 2px #555; transition: transform .5s, opacity .5s; font-family: var(--ui); color: #fff; pointer-events: none; }
#dfAdv.out { transform: translateX(340px); opacity: 0; }
#dfAdv b { display: block; color: #ffff55; font-weight: 600; font-size: 17px; }
#dfAdv.ch b { color: #ff55ff; }
#dfAdv span { font-size: 15px; color: #fff; }
#dfAdv canvas { width: 32px; height: 32px; image-rendering: pixelated; flex: none; }
html.touch #dfAdv { top: calc(56px + env(safe-area-inset-top, 0px)); right: 10px; width: min(250px, 40%); padding: 6px 8px; }
html.touch #dfAdv b { font-size: 14px; } html.touch #dfAdv span { font-size: 13px; }
`;
document.head.appendChild(css);
const advEl = document.createElement('div'); advEl.id = 'dfAdv'; advEl.className = 'out';
advEl.innerHTML = '<canvas width="32" height="32"></canvas><div><b>Advancement Made!</b><span></span></div>'; document.body.appendChild(advEl);
const ADV = {
  forest: ['Into the Pines', 'blueberries'], copper: ['Green Stone', 'copper_ore'], tin: ['Pale Stone', 'tin_ore'], crypt: ['Among the Dead', 'bone_fragments'],
  core: ['Living Ember', 'ember_core'], smelter: ['Hot Work', 'smelter'], bronze: ['Wed in Fire', 'bronze'], gear: ['Bronze Age', 'bronze_sword'],
  armor: ['Bright as a Bell', 'bronze_chestplate'], brute: ['Bigger They Come', 'greyling_trophy'], shaman: ['Seed Thief', 'ancient_seed'], bones: ['Bone Breaker', 'bone_fragments'],
  rune: ['Moss and Runes', 'ancient_seed'], lore: ['Forest Lore', 'ancient_seed', 1], shrine: ['The Root Shrine', 'ancient_seed'], summon: ['Waking the Keeper', 'ancient_seed'],
  root: ['Heartwood', 'old_root_trophy', 1], waystone: ['Vesk Knows the Way', 'ancient_seed'],
};
const advDone = {}, advQ = []; let advT = 0;
function advance(key) {
  const a = ADV[key]; if (!a || advDone[key]) return; advDone[key] = true; advQ.push({ title: a[0], icon: a[1], ch: !!a[2] });
  chat(`${DEFS[cur].name} has ${a[2] ? 'completed the challenge' : 'made the advancement'} [${a[0]}]`, a[2] ? 'vhC' : 'vhA');
}
function advTick(dt) {
  if (advT > 0) { advT -= dt; if (advT <= 0) { advEl.classList.add('out'); advT = -.7; } return; }
  if (advT < 0) { advT = Math.min(0, advT + dt); return; }
  const other = document.getElementById('vhAdv');
  if (!advQ.length || state === 'switching' || state === 'title' || (other && !other.classList.contains('out')) || !toastEl.classList.contains('out')) return;
  const a = advQ.shift();
  advEl.classList.toggle('ch', a.ch); advEl.querySelector('b').textContent = a.ch ? 'Challenge Complete!' : 'Advancement Made!'; advEl.querySelector('span').textContent = a.title;
  const g = advEl.querySelector('canvas').getContext('2d'); g.imageSmoothingEnabled = false; g.clearRect(0, 0, 32, 32);
  try { if (hasInv() && Inv.icon) g.drawImage(Inv.icon(a.icon), 0, 0, 32, 32); else if (ICONS[a.icon]) { g.scale(2, 2); ICONS[a.icon](g); g.setTransform(1, 0, 0, 1, 0, 0); } } catch (e) { /* no icon */ }
  advEl.classList.remove('out'); advT = 4.5; DS.chime(a.ch);
}

// =====================================================================================================
//  Story: Korra's lines, the quest line and hints
// =====================================================================================================
const F = { started: false };                      // sticky quest flags (saved)
const mined = { copper: 0, tin: 0 };
let urnN = 0;
const started = () => F.started;
function dirTo(x, z) { const P = PL(), dx = x - P.pos.x, dz = z - P.pos.z; return { m: Math.round(Math.hypot(dx, dz)), dir: compass(dx, dz) }; }
const where = (x, z) => { const d = dirTo(x, z); return `${d.m} m ${d.dir}`; };
const FOREST_GATE = { x: 91, z: 38 };
function korra(lines, done, target) {
  const m = MW(); if (!m) { chat('Korra: ' + lines.join(' ')); if (done) done(); return; }
  const t = target ? dirTo(target.x, target.z) : null;
  m.korra(lines.map(s => t ? s.replace(/\{dir\}/g, t.dir).replace(/\{m\}/g, t.m) : s), done);
}
const STORY = {
  start: ['Kraa! {name}. While you rested, the isle shifted its weight. Can you feel it?',
    'The antlers you took from the storm make a pick that bites hard stone. Build one at a workbench: ten wood, two hard antlers.',
    'Then go {dir}, where the pines grow black. The Dark Forest. Green copper and pale tin sleep in its rocks.',
    'Copper and tin, wed in fire, become bronze. Bronze is how you will survive what lives under those trees. Kraa!'],
  forest: ['These are the old pines. Mind your step... and your back.',
    'Boulders with green veins hold copper. Tin glints near the cold north shore.',
    'Brutes guard these woods, and their shamans throw poison. Kill the shamans first. Kraa.'],
  ore: ['Good ore, {name}! But ore alone is just heavy rock.',
    'A smelter needs a living ember. The dead keep embers in their crypt, {dir} of here. Bring a blunt weapon if you have one: bones crack, they do not bleed.'],
  crypt: ['A crypt of the ship-folk. Their bones still walk, and they guard their burial urns.', 'Break the urns. Ember cores sleep inside. Kraa!'],
  cores: ['Embers! Warm as a heartbeat.', 'With the Hammer, near a workbench: twenty stone, four resin and two ember cores build a smelter. Twenty stone and two more cores build a charcoal kiln to feed it.'],
  smelter: ['A smelter! Feed it charcoal and ore. Copper and tin first, then two copper and one tin make bronze at a forge.'],
  bronze: ['Bronze! It rings like a bell.', 'Now forge something worth swinging at a workbench. A mace cracks bones, a sword sings, a buckler keeps your teeth.'],
  gear: ['Now you look like a warrior and not a castaway. Kraa.',
    'Something old sleeps at the heart of the forest, under a shrine of roots. The forest hides it well.',
    'But Vesk knows the old stones. Follow him: he circles a Waystone, {dir} of here. Kraa.'],
  shrine: ['The Root Shrine. The ground breathes here.',
    'The grey shamans stole three seeds from the first tree. Lay them on this shrine, and its keeper, the Old Root, will rise to take them back.',
    'It is slow, but its roots run everywhere. When the ground boils in a line, step aside. When a green ring glows under you, get out of it. Kraa!'],
  seeds: ['Three seeds. They are warm, as if they are dreaming.', 'Go to the shrine when you are ready, {dir} of here. Eat well first: blueberries and mushrooms grow all over the forest.'],
  end: ['The Old Root is down! Even the pines are quiet.', 'Carry its head to the Ring of Oaths and hang it on the second stone.',
    'And that key it dropped... green bronze, cold as river water. A Drowned Key. It opens the sunken crypts of the Swamp.',
    'The Swamp lies across the water, past the meadows. Something there feeds on the drowned. The shamans call it Rotmaw.',
    'You will need a Skiff or a portal to get there, and iron after bronze. Kraa!'],
};
const HINT = {
  pick: ['Stuck, {name}? Stand at a workbench and open your inventory: ten wood and two hard antlers make the Antler Pickaxe.'],
  enter: ['The Dark Forest is {dir} of here, about {m} blocks. Look for the black pines.'],
  ore: ['Copper boulders are mossy rocks with green veins, all over the forest. Tin sits on the north shore. Hold attack on them with the Antler Pickaxe.'],
  core: ['The crypt is {dir} of here, about {m} blocks: a stone arch over a stair going down. Break the clay urns inside.'],
  smelter: ['A smelter needs twenty stone, four resin and two ember cores. Build it with the Hammer near your workbench.'],
  bronze: ['Charcoal comes from a kiln fed with wood. Use the smelter with charcoal, then with ore. Two copper and one tin make bronze at a forge.'],
  gear: ['Bronze gear is made at a workbench. Try a Bronze Mace or Sword. Four bronze is enough for a sword.'],
  shrine: ['The Root Shrine is {dir} of here, about {m} blocks, in a ring of glowing stones.'],
  seeds: ['Greyling Shamans carry the seeds: small, hooded, with a glowing staff. They hide behind the brutes. Hunt them in the forest.'],
  offer: ['You have the seeds. Go to the Root Shrine, {dir} of here, and use it.'],
  waystone: ['Look up for Vesk. He circles the forest Waystone, {dir} of here, about {m} blocks.'],
  hang: ['The Ring of Oaths is {dir} of here. Use the second stone\'s mount with the Old Root Trophy in your bag.'],
};
const RINGP = () => { const r = MW() && MW().RING; return r ? { x: r.cx, z: r.cz } : { x: 70, z: 96 }; };
const hungRoot = () => { const m = MW(); return !!(m && m.flags && m.flags.hung && m.flags.hung.old_root_trophy); };
const QUEST_TARGET = { waystone: () => (WAY ? { x: WAY.cx, z: WAY.cz } : FOREST_GATE), hang: RINGP, enter: () => FOREST_GATE, core: () => ({ x: CRY.cx, z: CRY.cz + 10 }), shrine: () => ({ x: SHR.cx, z: SHR.cz }), offer: () => ({ x: SHR.cx, z: SHR.cz }), ore: () => nearestOre() };
function nearestOre() { const P = PL(); let best = null, bd = 1e9; const want = mined.copper < 6 ? 'copper' : 'tin';
  for (const o of ORES) { if (o.kind !== want) continue; const d = Math.hypot(o.x - P.pos.x, o.z - P.pos.z); if (d < bd) { bd = d; best = o; } } return best; }
const pickOk = () => ['antler_pickaxe', 'bronze_pickaxe', 'iron_pickaxe'].some(id => count(id) > 0) || ((heldTool() || {}).type === 'pickaxe' && heldTool().power >= 2);
function step() {
  if (!F.started) return 'pre';
  if (F.bossDead) return hungRoot() ? 'done' : 'hang';
  if (boss && !boss.removed) return 'boss';
  if (!F.pick && pickOk()) F.pick = true;
  if (!F.pick) return 'pick';
  if (!F.enter) return 'enter';
  if (!F.ore && ((mined.copper >= 6 && mined.tin >= 3) || F.bronze)) F.ore = true;
  if (!F.ore) return 'ore';
  if (!F.core && (count('ember_core') >= 4 || F.smelter)) F.core = true;
  if (!F.core) return 'core';
  if (!F.smelter) return 'smelter';
  if (!F.bronze && (count('bronze') > 0 || hasAny(BRONZE_ALL))) F.bronze = true;
  if (!F.bronze) return 'bronze';
  if (!F.gear && hasAny(BRONZE_WEAPONS)) F.gear = true;
  if (!F.gear) return 'gear';
  if (!F.waystone && !F.shrine && WAY) return 'waystone';
  if (!F.shrine) return 'shrine';
  return count('ancient_seed') >= 3 ? 'offer' : 'seeds';
}
function questText(s = step()) {
  switch (s) {
    case 'pick': return `Craft an Antler Pickaxe (workbench: 10 Wood, 2 Hard Antler)`;
    case 'enter': return `Travel to the Dark Forest (${where(FOREST_GATE.x, FOREST_GATE.z)})`;
    case 'ore': return `Mine Copper Ore ${Math.min(6, mined.copper)}/6 and Tin Ore ${Math.min(3, mined.tin)}/3 with the Antler Pickaxe`;
    case 'core': return `Find Ember Cores in the burial crypt: ${Math.min(4, count('ember_core'))}/4 (${where(CRY.cx, CRY.cz + 10)})`;
    case 'smelter': return 'Build a Smelter with the Hammer (20 Stone, 4 Resin, 2 Ember Core)';
    case 'bronze': return 'Feed the Smelter charcoal (Kiln) and Copper + Tin Ore, then make Bronze at a Forge';
    case 'gear': return 'Forge a bronze weapon at a workbench (Sword, Mace or Axe)';
    case 'waystone': return 'Find the Waystone in the Dark Forest (Vesk circles it)';
    case 'shrine': return `Find the Root Shrine (${where(SHR.cx, SHR.cz)})`;
    case 'seeds': return `Take Ancient Seeds from Greyling Shamans: ${count('ancient_seed')}/3`;
    case 'offer': return `Offer 3 Ancient Seeds at the Root Shrine (${where(SHR.cx, SHR.cz)})`;
    case 'boss': return 'Defeat The Old Root!';
    case 'hang': { const r = RINGP(); return `Hang the Old Root Trophy at the Ring of Oaths (${where(r.x, r.z)})`; }
    case 'done': return 'Chapter II complete. Find the Swamp and its sunken crypts: the Drowned Key opens them';
  }
  return '';
}
const STEP_TALK = { core: 'ore', smelter: 'cores', bronze: 'smelter', gear: 'bronze', waystone: 'gear', offer: 'seeds' };
let lastStep = '', stuckT = 0, ch1T = 0, sawEnd = false;
function startChapter() {
  if (F.started) return; F.started = true; lastStep = '';
  title('CHAPTER II', 'The Dark Forest', 5, '#8cff6a'); DS.chime(true);
  later(3, () => korra(STORY.start, null, FOREST_GATE));
}
function questTick(dt) {
  const m = MW();
  // Chapter I ends with Stormhorn; wait for Korra's farewell and the chapter title, then begin
  if (!F.started) {
    // Chapter I now ends when the Stormhorn head hangs at the Ring and its power was used once (Meadows.questDone)
    if (m && m.stage >= 3 && m.questDone !== false) { ch1T += dt;
      const quiet = !m.dialog.open && (!m.raven || m.raven.mode === 'gone');
      if ((quiet && ch1T > 14) || ch1T > 90) startChapter(); }
    return;
  }
  const s = step();
  if (s !== lastStep) {
    const prev = lastStep; lastStep = s; stuckT = 0;
    if (m && m.vesk) { if (s === 'waystone' && WAY) m.vesk.circle({ x: WAY.cx, y: WAY.y + 4, z: WAY.cz }); else if (prev === 'waystone') m.vesk.leave(); }
    if (s === 'hang' && !F.said_hang) { F.said_hang = true; }
    if (prev && STEP_TALK[s] && !F['said_' + s]) { F['said_' + s] = true; const tg = QUEST_TARGET[s] && QUEST_TARGET[s]();
      later(1.2, () => korra(STORY[STEP_TALK[s]], null, s === 'core' ? { x: CRY.cx, z: CRY.cz + 10 } : s === 'waystone' ? QUEST_TARGET.waystone() : tg)); }
    if (s === 'core' && prev) advance('copper');
  }
  if (s === 'boss' || s === 'done' || dlgOpen() || cine) return;
  if (s === 'hang' && m && m.RING && !F.said_hang2 && Math.hypot(PL().pos.x - m.RING.cx, PL().pos.z - m.RING.cz) < 14) { F.said_hang2 = true; if (m.tip) m.tip('Hang it. Let the Watcher see.'); }
  stuckT += dt;
  if (stuckT > 150 && HINT[s]) { stuckT = -150; const tg = QUEST_TARGET[s] && QUEST_TARGET[s](); korra(HINT[s], null, tg); }
}
function milestones() {
  const P = PL(), k = fw(P.pos.x, P.pos.z);
  if (k > .6 && !F.enter) {
    if (F.started) { F.enter = true; title('THE DARK FOREST', 'Old pines. Older roots.', 3.5, '#8cff6a'); advance('forest'); later(2, () => korra(STORY.forest)); }
    else if (!F.warned) { F.warned = true; title('THE DARK FOREST', 'Old pines. Older roots.', 3.5, '#8cff6a'); say('These pines feel older than the island. Something here is far stronger than the meadows...', 5); }
  }
  if (F.started && !F.cryptSeen && Math.hypot(P.pos.x - CRY.cx, P.pos.z - (CRY.cz + 8)) < 9) { F.cryptSeen = true; advance('crypt'); if (!F.core) korra(STORY.crypt); }
  if (!F.shrine && Math.hypot(P.pos.x - SHR.cx, P.pos.z - SHR.cz) < 11) {
    if (F.started && F.gear) { F.shrine = true; F.waystone = true; advance('shrine'); korra(STORY.shrine); }
    else if (!F.shrinePeek) { F.shrinePeek = true; say('A ring of glowing stones around a shrine of roots. The ground breathes here... You are not ready yet.', 5); }
  }
  if (count('ember_core') > 0) advance('core');
  if (count('bronze') > 0) advance('bronze');
  if (hasAny(BRONZE_WEAPONS)) advance('gear');
  if (hasAny(['bronze_helmet', 'bronze_chestplate', 'bronze_leggings', 'bronze_boots'])) advance('armor');
}
let scanT = 0;
function smelterScan(dt) {
  if (F.smelter || (scanT -= dt) > 0) return; scanT = 1;
  const p = PL().pos, bx = Math.floor(p.x), by = Math.floor(p.y), bz = Math.floor(p.z);
  for (let y = -3; y <= 3; y++) for (let z = -7; z <= 7; z++) for (let x = -7; x <= 7; x++) if (get(bx + x, by + y, bz + z) === SMELTER) { F.smelter = true; advance('smelter'); return; }
}
function onKill(e) {
  const k = e.kind;
  if (k === 'greyling_brute') advance('brute');
  if (k === 'greyling_shaman') advance('shaman');
  if (k === 'skeleton') advance('bones');
  if (k === 'troll' && MW()) MW().advance('troll');
  if (k === 'old_root') bossDefeated(e);
  try { const d = DEFS[cur]; d.xp += { greyling_brute: .35, greyling_shaman: .3, skeleton: .25, troll: .6, old_root: 4 }[k] || 0; while (d.xp >= 1) { d.xp -= 1; d.lvl++; } drawStats(); } catch (e2) { /* ignore */ }
}

// =====================================================================================================
//  The Root Shrine and the boss fight
// =====================================================================================================
let boss = null;
function useShrine() {
  if (boss && !boss.removed) { say('The Old Root is already awake!', 2.5); return; }
  if (F.bossDead) { say('The shrine is silent. Its keeper sleeps for good.', 3); return; }
  const n = count('ancient_seed');
  if (n >= 3) { if (!removeItem('ancient_seed', 3)) { say('The shrine wants three Ancient Seeds.', 3); return; } summonBoss(); }
  else { DS.rune(); say(`Roots curl around the stone. It wants three Ancient Seeds (${n}/3). Greyling Shamans carry them.`, 4); }
}
function summonBoss() {
  if (boss && !boss.removed) return boss;
  const P = PL(); let dx = SHR.cx - P.pos.x, dz = SHR.cz - P.pos.z; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
  const bx = SHR.cx + dx * 5.5, bz = SHR.cz + dz * 5.5;
  boss = new OldRoot(); boss.yaw = Math.atan2(-dx, -dz); boss.immune = true; boss.spawnAt(bx, bz); boss.pos.y = SHR.y + 1;
  F.summoned = true; advance('summon'); shakeT = Math.max(shakeT, 1.5); DS.rumble(); DS.groan(); flashEl.style.background = '#1a4a12'; fx.flash = Math.max(fx.flash, .6);
  cine = { t: 0, dur: 4.6, boss };
  title('THE OLD ROOT', 'Keeper of the First Tree', 4.8, '#8cff6a');
  say('The ground splits. The forest itself stands up to take its seeds back.', 4.8);
  later(1.6, () => { DS.groan(); shakeT = Math.max(shakeT, .8); });
  later(3.2, () => { DS.crack(); shakeT = Math.max(shakeT, .6); });
  return boss;
}
function despawnBoss(refund) {
  if (!boss) return; const b = boss; boss = null; puff(b.center(), 5, 30, BARKM, 1, 2); b.remove(); DS.groan();
  if (refund) { drop('ancient_seed', 3, new V3(SHR.cx, SHR.y + 3.2, SHR.cz)); chat('The Old Root sinks back into the earth... the seeds lie on the shrine again.'); }
  F.summoned = false;
}
function bossDefeated(b) {
  F.bossDead = true; chat(`The Old Root was slain by ${DEFS[cur].name}`);
  title('THE OLD ROOT HAS FALLEN', 'Carry its head to the Ring of Oaths', 4.5, '#8cff6a');
  later(.3, () => advance('root'));
  later(6, () => korra(STORY.end));
  const waitHang = () => { if (hungRoot()) later(6, () => { title('CHAPTER II COMPLETE', 'Next: The Swamp. Rotmaw stirs in the black water...', 8, '#ffaa00'); later(1.5, () => say('To be continued...', 6)); }); else later(2, waitHang); };
  later(8, waitHang);
  later(3, () => { if (boss === b) boss = null; });
}

// =====================================================================================================
//  Blocks: mining rules (ore needs the Antler Pickaxe), drops, urns, berries and rune stones
// =====================================================================================================
const TIER = [1, 2, 4, 6, 8, 10];
let refuseT = 0;
function refuse(msg) { const P = PL(); P.swing = 1; swingT = 1; if (performance.now() - refuseT > 2500) { refuseT = performance.now(); say(msg, 2.6); if (AC) DS.clink(); } return false; }
if (hasInv() && typeof Inv.mine === 'function') {
  const oMine = Inv.mine;
  Inv.mine = function (h, dt) {
    if (!h) return oMine.call(this, h, dt);
    const t = h.t, tl = heldTool();
    if (PROTECT.has(t)) return refuse(t === SHRINE ? 'The shrine\'s roots are harder than any blade.' : 'The rune stone will not crack.');
    if (t === COPPER || t === TIN) {
      if (!tl || tl.type !== 'pickaxe' || tl.power < 2) return refuse(F.started ? 'Too hard! Mine ore with the Antler Pickaxe.' : 'This ore is too hard. You need a pickaxe stronger than stone.');
      dt *= (TIER[tl.power] || 4) / 4;
    } else if (t === MSTONE) dt *= tl && tl.type === 'pickaxe' ? 1.5 * (TIER[tl.power] || 2) / 2 : .5;
    else if (t === PINE && tl && tl.type === 'axe') dt *= (TIER[tl.power] || 2) / 1.5;
    return oMine.call(this, h, dt);
  };
}
const regrow = [];
on('blockDrops', (drops, h) => {
  if (!h) return drops; const t = h.t, tl = heldTool(), r = R();
  switch (t) {
    case PINE: return r < .15 ? [['wood', 1], ['resin', 1]] : [['wood', 1]];
    case NEEDLES: return r < .06 ? [['stick', 1]] : [];
    case FLOOR: return [['dirt', 1]];
    case MSTONE: return tl && tl.type === 'pickaxe' ? [['cobblestone', 1]] : [];
    case COPPER: if (!tl || tl.type !== 'pickaxe' || tl.power < 2) return []; mined.copper++; if (mined.copper === 1) advance('copper'); return [['copper_ore', 1]];
    case TIN: if (!tl || tl.type !== 'pickaxe' || tl.power < 2) return []; mined.tin++; if (mined.tin === 1) advance('tin'); return [['tin_ore', 1]];
    case MUSH: regrow.push({ x: h.x, y: h.y, z: h.z, t, at: 240 + R() * 120 }); return [['mushroom', 1]];
    case BERRY: regrow.push({ x: h.x, y: h.y, z: h.z, t, at: 300 + R() * 120 }); return [['blueberries', 2 + (r < .5 ? 1 : 0)]];
    case URN: return urnLoot(h);
  }
  return drops;
});
// note: HOOKS 'blockDrops' is used through filter(), which reduces over the handlers; on() pushes ours in
function urnLoot(h) {
  urnN++; DS.clink(); puff(new V3(h.x + .5, h.y + .4, h.z + .5), .8, 8, DIRTM, -1, 1.5);
  const out = []; if (urnN <= 3 || R() < .4) out.push(['ember_core', 1]);
  if (R() < .6) out.push(['old_coins', 2 + ((R() * 6) | 0)]); if (R() < .5) out.push(['bone_fragments', 1]);
  return out;
}
function regrowTick(dt) {
  for (let i = regrow.length - 1; i >= 0; i--) { const q = regrow[i]; q.at -= dt; if (q.at > 0) continue; regrow.splice(i, 1);
    if (get(q.x, q.y, q.z) === AIR && get(q.x, q.y - 1, q.z) === FLOOR) { set(q.x, q.y, q.z, q.t); rebuildAround(q.x, q.z); } }
}
function pickPlant(h) {
  if (typeof breakBlock === 'function') breakBlock(h); else { set(h.x, h.y, h.z, AIR); rebuildAround(h.x, h.z); }
  PL().swing = 1; swingT = 1;
}
function readRune(l) {
  DS.rune(); const m = MW(); if (m) m.talk(l.name, 'rune', l.lines); else chat(l.lines.join(' '));
  if (!l.read) { l.read = true; advance('rune'); if (LORE.every(o => o.read)) advance('lore'); }
}
(HOOKS.use || (HOOKS.use = [])).unshift(() => {
  if (state !== 'play' || dlgOpen()) return false;
  const h = targetBlock(); if (!h) return false;
  if (h.t === SHRINE) { useShrine(); return true; }
  if (h.t === DFRUNE) {
    const l = loreAt(h.x, h.y, h.z); if (l) { readRune(l); return true; }
    const m = MW(); DS.rune();
    if (Math.hypot(h.x - SHR.x, h.z - SHR.z) < 12) { if (m) m.talk('Root Pillar', 'rune', ['Roots have grown through the runes:', '"Three seeds of the first tree, laid upon the shrine, wake the keeper of the pines."']); }
    else if (m) m.talk('Crypt Stone', 'rune', ['Cold runes, cut long ago:', '"The ship-folk sleep here with their embers. Let them sleep, or face them."']);
    return true;
  }
  if (h.t === URN || h.t === BERRY || h.t === MUSH) { pickPlant(h); return true; }
  return false;
});
// blunt weapons crack bones
on('meleeDamage', (dmg, e) => { if (e && e.kind === 'skeleton') { const s = heldStack(); if (s && /mace|club/.test(s.id)) return dmg * 1.75; } return dmg; });

// =====================================================================================================
//  Atmosphere: blue fog, a darker light and drifting spores under the pines
// =====================================================================================================
let fk = 0;
const FOG0 = scene.fog.color.clone(), FOGF = new THREE.Color('#2e3f55'), fogTmp = new THREE.Color();
let fogTouched = false;
const SPORE_M = new THREE.MeshBasicMaterial({ color: 0xc8ff8a, fog: false, transparent: true, opacity: .8 });
const spores = [];
for (let i = 0; i < 18; i++) { const m = new THREE.Mesh(boxGeo(.06, .06, .06), SPORE_M); m.visible = false; scene.add(m); spores.push({ m, t: R() * 10, ox: 0, oz: 0, oy: 0 }); }
function atmosphere(dt) {
  const P = PL(), want = state === 'title' ? 0 : fw(P.pos.x, P.pos.z) * (P.pos.y < 40 ? 1 : 0);
  fk = lerp(fk, want, Math.min(1, dt * 1.5)); if (fk < .002 && want === 0) fk = 0;
  if (fk > 0 && MW()) { const k = 1 - .2 * fk; opaqueMat.color.multiplyScalar(k); opaqueMat.color.b = Math.min(1, opaqueMat.color.b * (1 + .06 * fk)); waterMat.color.multiplyScalar(k); }
  const night = typeof World !== 'undefined' && World.isNight ? World.isNight() : false;
  SPORE_M.color.setHex(night ? 0xd8ff4a : 0xc8ffb0); SPORE_M.opacity = (night ? .95 : .55) * fk;
  for (const s of spores) {
    s.t += dt; if (fk < .2) { s.m.visible = false; continue; }
    if (!s.m.visible || s.m.position.distanceTo(P.pos) > 14) { s.ox = P.pos.x + (R() - .5) * 20; s.oz = P.pos.z + (R() - .5) * 20; s.oy = groundAt(s.ox, s.oz, P.pos.y + 6) + .5 + R() * 3; s.m.visible = true; }
    s.m.position.set(s.ox + Math.sin(s.t * .6) * .8, s.oy + Math.sin(s.t * .9) * .4, s.oz + Math.cos(s.t * .5) * .8);
  }
}
function fogTick() {
  if (fk > .001) {
    const light = typeof World !== 'undefined' && World.light ? World.light() : 1;
    fogTmp.copy(FOGF).multiplyScalar(.45 + .55 * light);
    scene.fog.color.copy(FOG).lerp(fogTmp, .85 * fk); fogTouched = true;
    scene.fog.near *= 1 - .75 * fk; scene.fog.far *= 1 - .55 * fk;
  } else if (fogTouched) { scene.fog.color.copy(FOG0); fogTouched = false; }
}

// =====================================================================================================
//  Saving (mobs.js Save hooks, when present)
// =====================================================================================================
on('save', data => { if (!data) return; data.darkforest = { F: Object.assign({}, F, { summoned: false }), mined: Object.assign({}, mined), urnN, adv: Object.keys(advDone), lore: LORE.map(l => l.read), seedsBack: !!(boss && !boss.removed && !F.bossDead) }; });
on('load', data => {
  const d = data && data.darkforest; if (!d) return;
  Object.assign(F, d.F || {}); Object.assign(mined, d.mined || {}); urnN = d.urnN | 0; for (const k of d.adv || []) advDone[k] = true;
  (d.lore || []).forEach((r, i) => { if (LORE[i]) LORE[i].read = !!r; }); lastStep = '';
  if (d.seedsBack) try { Inv.add('ancient_seed', 3); } catch (e) { /* ignore */ }   // saved mid-fight: the boss is not saved, give the offering back
});

// =====================================================================================================
//  Main hooks
// =====================================================================================================
const bossNameEl = bossEl.querySelector('.mc'), bossTrack = bossEl.querySelector('i');
const goalSpan = document.querySelector('#vhGoal span');
let ourBar = false;
on('frame', (dt) => {
  if (state === 'title') return;
  for (let i = timers.length - 1; i >= 0; i--) { const q = timers[i]; q.t -= dt; if (q.t <= 0) { timers.splice(i, 1); try { q.fn(); } catch (e) { console.error(e); } } }
  updateParts(dt); updateOrbs(dt); poisonUpdate(dt); atmosphere(dt); regrowTick(dt);
  if (held > 0) held -= dt;
  if (state === 'play') { spawnTick(dt); milestones(); questTick(dt); smelterScan(dt); }
  for (let i = CREATURES.length - 1; i >= 0; i--) if (CREATURES[i].removed) CREATURES.splice(i, 1);
  if (boss && boss.removed) boss = null;
});
on('tick', rawDt => {
  fogTick(); advTick(rawDt);
  if (F.started && goalSpan && state !== 'title') goalSpan.textContent = questText();
  const P0 = PL();
  if (boss && !boss.removed && boss.dead <= 0 && (state === 'play' || state === 'wheel') && boss.pos.distanceTo(P0.pos) < 70) {
    bossEl.hidden = false; bossFill.style.width = Math.max(0, boss.hp / boss.max * 100) + '%';
    if (!ourBar) { ourBar = true; bossNameEl.textContent = 'The Old Root'; bossFill.style.background = 'linear-gradient(#c8ff9a, #2f8a1a)'; bossTrack.style.background = '#123012'; bossTrack.style.borderColor = '#061406'; }
  } else if (ourBar) { ourBar = false; bossNameEl.textContent = 'Forest Troll'; bossFill.style.background = ''; bossTrack.style.background = ''; bossTrack.style.borderColor = ''; }
  if (cine) {
    if (state === 'play' && cine.boss && !cine.boss.removed) {
      cine.t += rawDt; const b = cine.boss, k = clamp(cine.t / cine.dur, 0, 1);
      let dx = P0.pos.x - b.pos.x, dz = P0.pos.z - b.pos.z; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
      const ang = .8 - .3 * easeInOutSine(k), dist = 15 - 3 * easeInOutSine(k), ca = Math.cos(ang), sa = Math.sin(ang);
      const ox = dx * ca - dz * sa, oz = dz * ca + dx * sa, target = new V3(b.pos.x + ox * dist, b.pos.y + 1.2, b.pos.z + oz * dist);
      camCollide(new V3(b.pos.x, b.pos.y + 3, b.pos.z), target); camera.position.copy(target);
      if (shakeT > 0) { camera.position.x += (Math.random() - .5) * shakeT * .6; camera.position.y += (Math.random() - .5) * shakeT * .6; }
      camera.lookAt(b.pos.x, b.pos.y + 7 - k * 2.2, b.pos.z); camera.fov = 64; camera.updateProjectionMatrix();
      if (heldMesh) heldMesh.visible = false; P0.group.visible = true; hudEl.style.opacity = 0; touchUI.style.opacity = 0; outline.visible = false;
      if (cine.t >= cine.dur) cine = null;
    } else if (state === 'play') cine = null;
  }
});

// ---------------------------------------------------------------- public API + helpers for the lead/tests
function tp(where) {
  const P = PL(); let x, z, y = null;
  if (where === 'shrine') { x = SHR.cx + 7; z = SHR.cz; }
  else if (where === 'crypt') { x = CRY.cx; z = CRY.cz; y = CRY.fy + 1; }
  else if (where === 'crypt_gate') { x = CRY.cx; z = CRY.cz + 11.5; }
  else if (where === 'copper' || where === 'tin') { const o = ORES.find(q => q.kind === where); if (!o) return false; x = o.x + 3.5; z = o.z + .5; }
  else { x = FOREST_GATE.x + .5; z = FOREST_GATE.z - 4.5; }
  P.pos.set(x, y != null ? y : groundAt(x, z, WY - 1) + .02, z); P.vel.set(0, 0, 0); return true;
}
window.DarkForest = {
  DF, SHR, CRY, ORES, LORE, URNS, flags: F, mined, blocks: { PINE, NEEDLES, FLOOR, MSTONE, COPPER, TIN, MUSH, BERRY, URN, SMELTER, SHRINE, DFRUNE },
  inForest, forest: (x, z) => fw(x, z), get fog() { return fk; }, get step() { return step(); }, questText, startChapter, advance,
  spawn, spawnTroll, summonBoss, despawnBoss, get boss() { return boss; }, get creatures() { return CREATURES; }, get trolls() { return TROLLS; },
  get cine() { return cine; }, get held() { return held; }, get poisoned() { return poisonT; }, tp, korra, useShrine, fireOrb, spike, vineBurst,
};
})();
