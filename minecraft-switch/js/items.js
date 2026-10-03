"use strict";
// =====================================================================
//  Items & inventory module (js/items.js)
//  - ITEMS registry (string ids) with 16x16 pixel-art icons drawn in code and Valheim-style stats
//  - Inv: 36 slots (0-8 = hotbar), 4 armor slots and 1 off-hand slot; one bag per character, saved to localStorage
//  - Minecraft inventory screen (E): armor, off hand, 2x2 crafting or 3x3 at a Workbench, recipe book, tooltips
//  - Survival block breaking: hardness x tool break times, 10-stage crack overlay, drops, tool wear
//  - First-person held item: block cube, flat pixel sprite for items, the bare arm for an empty hand
//  Uses the main script's globals (BLOCK, ATLAS, drawIcon, camera, state, hotSel, ...) and its on/emit hooks.
//  Only ITEMS and Inv are global; everything else stays inside the closure below.
// =====================================================================
const ITEMS = {};
const Inv = {};
(() => {
// inventory screen state (declared first: recipes and item changes check it)
let isOpen = false, mode = 'inv', gridN = 4, guiScale = 2, selRecipe = null, nearBench = false, onlyCraftable = false, mx = 0, my = 0, tipT = 0, hoverSlot = null;

// ---------------------------------------------------------------------
//  Workbench and torch blocks (the ids WORKBENCH / TORCH are declared in index.html)
// ---------------------------------------------------------------------
const rr = mulberry32(5150), rp = a => a[(rr() * a.length) | 0];   // own RNG: the world generator's sequence is untouched
const firstNewTile = tileN;
const PLK = ['#a2834f', '#9c7f4e', '#b08e59', '#a88a55'], PLK_D = ['#7d6239', '#765c35', '#86683c'];
const planksFill = (g, y0, y1, pal) => { for (let y = y0; y < y1; y++) for (let x = 0; x < 16; x++) { g.fillStyle = shade(rp(pal), (rr() - .5) * .12); g.fillRect(x, y, 1, 1); } };
tile('workbench_top', g => { planksFill(g, 0, 16, PLK);
  g.fillStyle = '#5e4428'; g.fillRect(0, 0, 16, 1); g.fillRect(0, 15, 16, 1); g.fillRect(0, 0, 1, 16); g.fillRect(15, 0, 1, 16);
  g.fillStyle = '#6e5530'; for (const k of [5, 10]) { g.fillRect(k, 1, 1, 14); g.fillRect(1, k, 14, 1); }
  g.fillStyle = '#c9a76c'; g.fillRect(1, 1, 14, 1); g.fillRect(1, 1, 1, 14); });
const benchSide = tools => g => { planksFill(g, 0, 4, PLK); planksFill(g, 4, 16, PLK_D);
  g.fillStyle = '#5e4428'; g.fillRect(0, 3, 16, 1); g.fillRect(0, 15, 16, 1); g.fillRect(0, 4, 1, 12); g.fillRect(15, 4, 1, 12);
  g.fillStyle = '#c9a76c'; g.fillRect(0, 0, 16, 1); tools(g); };
tile('workbench_side', benchSide(g => {      // hanging saw
  g.fillStyle = '#5a3c1e'; g.fillRect(3, 6, 2, 4); g.fillStyle = '#d0d0d0'; g.fillRect(5, 6, 7, 3); g.fillStyle = '#9a9a9a'; g.fillRect(5, 8, 7, 1);
  g.fillStyle = '#6a6a6a'; for (let x = 5; x < 12; x += 2) g.fillRect(x, 9, 1, 1); }));
tile('workbench_front', benchSide(g => {     // hammer and tongs
  g.fillStyle = '#6b4f2c'; g.fillRect(4, 7, 1, 7); g.fillStyle = '#8a8a8a'; g.fillRect(2, 5, 5, 2); g.fillStyle = '#c0c0c0'; g.fillRect(2, 5, 5, 1);
  g.fillStyle = '#505050'; g.fillRect(10, 5, 1, 8); g.fillRect(12, 5, 1, 8); g.fillRect(11, 9, 1, 1); g.fillStyle = '#7a7a7a'; g.fillRect(10, 5, 1, 2); g.fillRect(12, 5, 1, 2); }));
tile('torch', g => { g.fillStyle = '#6b5133'; g.fillRect(7, 6, 2, 10); g.fillStyle = '#4c3822'; g.fillRect(8, 6, 1, 10);
  g.fillStyle = '#ff9a1f'; g.fillRect(7, 4, 2, 2); g.fillStyle = '#ffd84a'; g.fillRect(7, 5, 2, 1); g.fillStyle = '#fff6b0'; g.fillRect(7, 5, 1, 1); });
{ const d = ag.getImageData(0, 0, 256, 256).data;          // average colours for break particles, like the main atlas
  for (let i = firstNewTile; i < tileN; i++) { let r = 0, gg = 0, b = 0, n = 0; const ox = (i % 16) * 16, oy = Math.floor(i / 16) * 16;
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const k = ((oy + y) * 256 + ox + x) * 4; if (d[k + 3] < 128) continue; r += d[k]; gg += d[k + 1]; b += d[k + 2]; n++; }
    tileColor[i] = new THREE.Color(r / n / 255, gg / n / 255, b / n / 255); } }
atlasTex.needsUpdate = true;
def(WORKBENCH, 'Workbench', [TILE.workbench_side, TILE.workbench_side, TILE.planks, TILE.workbench_top, TILE.workbench_front, TILE.workbench_front], 'wood');
def(TORCH, 'Torch', [TILE.torch], 'wood', { kind: 'cross', opaque: false, solid: false });

// ---------------------------------------------------------------------
//  Pixel-art helpers for item icons (16x16)
// ---------------------------------------------------------------------
// string template -> draw function; letters map to palette colours, anything else stays empty
const PXA = (rows, pal) => g => rows.forEach((row, y) => { for (let x = 0; x < 16; x++) { const c = pal[row[x]]; if (c) { g.fillStyle = c; g.fillRect(x, y, 1, 1); } } });
const R = list => g => { for (const [c, x, y, w = 1, h = 1] of list) { g.fillStyle = c; g.fillRect(x, y, w, h); } };
// Minecraft-style dark rim: empty pixels next to the sprite get a darkened copy of their darkest neighbour
function rim(g) {
  const im = g.getImageData(0, 0, 16, 16), d = im.data, o = new Uint8ClampedArray(d);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const k = (y * 16 + x) * 4; if (d[k + 3]) continue; let best = -1, lum = 1e9;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx > 15 || ny > 15) continue;
      const n = (ny * 16 + nx) * 4; if (d[n + 3] > 128) { const l = d[n] + d[n + 1] + d[n + 2]; if (l < lum) { lum = l; best = n; } } }
    if (best >= 0) { o[k] = d[best] * .3; o[k + 1] = d[best + 1] * .3; o[k + 2] = d[best + 2] * .3; o[k + 3] = 255; }
  }
  im.data.set(o); g.putImageData(im, 0, 0);
}
const art = (...draws) => g => { for (const f of draws) f(g); rim(g); };
// Tools are drawn along the icon's diagonal like Minecraft's: a = position along the handle (bottom-left -15 .. top-right 15),
// c = offset across it (negative = upper-left, the lit side). Pixels where a + c is even do not exist.
const DIAG = fn => g => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const col = fn(x - y, x + y - 15, x, y); if (col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); } } };
const HND = { wood: ['#a07c4a', '#6b4f2c'], dark: ['#7a5a34', '#4c3822'] };
const MAT = { wood: ['#dcb984', '#ad8750', '#6e5530'], stone: ['#a4a4a4', '#7e7e7e', '#575757'], iron: ['#ffffff', '#d8d8d8', '#9c9c9c'],
  flint: ['#9a9aa6', '#5e5e6a', '#3a3a44'], antler: ['#f4ead2', '#d6c8a2', '#a8977a'], club: ['#a88452', '#7f5f36', '#4c3822'] };
const handle = (c, h) => c === 0 ? h[0] : c === 1 ? h[1] : null;
const TOOL_ART = {
  sword: (m, h) => DIAG((a, c) => {
    if (a >= -3 && a <= 12 && c >= -1 && c <= 1) return m[c + 1];
    if (a === 13 && c === 0) return m[0];
    if (a >= -5 && a <= -4 && Math.abs(c) <= 3) return h[1];                       // cross guard
    if (a >= -13 && a < -5) return handle(c, h);
    if (a < -13 && (c === 0 || c === 1)) return m[2];                              // pommel
  }),
  pickaxe: (m, h) => DIAG((a, c) => {
    if (Math.abs(c) <= 9) { const k = Math.round(10 - c * c / 13); if (a >= k - 1 && a <= k + 1) return Math.abs(c) >= 8 ? m[2] : a === k + 1 ? m[0] : a === k ? m[1] : m[2]; }
    if (a <= 9) return handle(c, h);
  }),
  axe: (m, h) => DIAG((a, c) => {
    if (c <= -1 && c >= -7) { const w = 1.6 + (-c) * .5; if (Math.abs(a - 5) <= w && a <= 10) return c <= -6 ? m[0] : c >= -2 ? m[2] : m[1]; }
    if (c >= 2 && c <= 3 && a >= 3 && a <= 7) return m[2];                         // back of the head
    if (a <= 9) return handle(c, h);
  }),
  shovel: (m, h) => DIAG((a, c) => {
    if (a >= 5 && a <= 14) { const w = a >= 12 ? 2.5 - (a - 12) * .8 : 3; if (c >= .5 - w && c <= .5 + w) return c <= -1 ? m[0] : c >= 2 ? m[2] : m[1]; }
    if (a < 5) return handle(c, h);
  }),
  spear: (m, h) => DIAG((a, c) => {
    if (a >= 6 && a <= 14) { const w = 2.4 * Math.sin(Math.PI * (a - 5) / 10); if (Math.abs(c - .5) <= w) return c <= -1 ? m[0] : c >= 2 ? m[2] : m[1]; }
    if (a >= 4 && a <= 5 && Math.abs(c - .5) <= 1.5) return '#7a5a3a';            // leather binding
    if (a < 4) return handle(c, h);
  }),
  club: (m, h) => DIAG((a, c, x, y) => {
    if (a >= -2 && a <= 12) { const w = 1.2 + (a + 2) / 6 - (a > 9 ? (a - 9) * .9 : 0);
      if (Math.abs(c - .5) <= w + .1) return hash2(x * 7, y * 13) < .18 ? m[2] : c <= 0 ? m[0] : m[1]; }
    if (a < -2) return handle(c, h);
  }),
};
// round-ish lumps (stone, coal, raw iron) shaded from the top-left
const lump = (L, M, D, spec) => g => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
  const u = (x + .5 - 8) / 6.2, v = (y + .5 - 9.5) / 4.8 + (hash2(x, 3) - .5) * .25, d = u * u + v * v; if (d > 1) continue;
  const lit = u + v; g.fillStyle = spec && hash2(x * 3, y * 5) < .12 ? spec : lit < -.7 ? L : lit > .55 ? D : M; g.fillRect(x, y, 1, 1); } };
const logs = g => { for (const [cx, cy] of [[8, 6], [5, 11], [11, 11]]) for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
  const d = Math.hypot(x + .5 - cx, y + .5 - cy); if (d > 3.3) continue;
  g.fillStyle = d > 2.4 ? (x < cx ? '#6b5133' : '#4c3822') : d > 1.4 ? '#b8945f' : '#d8b47a'; g.fillRect(x, y, 1, 1); } };

// templates (palette letters; '.' and 'o' are empty, the rim pass draws the outline)
const T_HELM = ['................', '................', '................', '................', '....oooooooo....', '...oLLLLLLLMo...', '..oLMMMMMMMMDo..', '..oLMAMMMMAMDo..',
  '..oLMooooooMDo..', '..oMDo....oMDo..', '..oMDo....oDDo..', '..oooo....oooo..', '................', '................', '................', '................'];
const T_CHEST = ['................', '..ooo......ooo..', '.oLMMo....oMMDo.', '.oLMMMooooMMMDo.', '.oLMMMMMMMMMMDo.', '.oLMMMMAAMMMMDo.', '.ooLMMMAAMMMDoo.', '...oLMMAAMMDo...',
  '...oLMMMMMMDo...', '...oLMMMMMMDo...', '...oLMMMMMMDo...', '...oMMMMMMMDo...', '...oDDDDDDDDo...', '...oooooooooo...', '................', '................'];
const T_LEGS = ['................', '...oooooooooo...', '...oLMMAAMMDo...', '...oLMMMMMMDo...', '...oLMMooMMDo...', '...oLMDooLMDo...', '...oLMDooLMDo...', '...oLMDooLMDo...',
  '...oLMDooLMDo...', '...oLMDooLMDo...', '...oLMDooLMDo...', '...oLMDooLMDo...', '...oooooooooo...', '................', '................', '................'];
const T_BOOTS = ['................', '................', '................', '................', '................', '................', '................', '...oooo..oooo...',
  '...oLMo..oLMo...', '...oLMo..oLMo...', '...oLMo..oLMo...', '..ooLMo.ooLMo...', '..oLMMo.oLMMo...', '..oDDDo.oDDDo...', '..ooooo.ooooo...', '................'];
const T_WSHIELD = ['.....oooooo.....', '...ooMMDMMMoo...', '..oLMMMDMMMMDo..', '.oLMMMMDMMMMMDo.', '.oLMMMMDMMMMMDo.', 'oLMMMMIIIMMMMMDo', 'oLMMMIIBIIMMMMDo', 'oDDDDIBBBIDDDDDo',
  'oLMMMIIBIIMMMMDo', 'oLMMMMIIIMMMMMDo', '.oLMMMMDMMMMMDo.', '.oLMMMMDMMMMMDo.', '..oMMMMDMMMMDo..', '...ooMMDMMMoo...', '.....oooooo.....', '................'];
const T_SHIELD = ['................', '...oooooooooo...', '...oIIIIIIIIo...', '...oIPPPPPPIo...', '...oIPPSSPPIo...', '...oIPSSSSPIo...', '...oIPPSSPPIo...', '...oIPPPPPPIo...',
  '...oIPPPPPPIo...', '...oIPPPPPPIo...', '...ooIPPPPIoo...', '....oIIPPIIo....', '.....ooIIoo.....', '.......oo.......', '................', '................'];
const T_APPLE = ['................', '................', '........k.......', '.......kGG......', '....RRRkRRR.....', '...RWRRRRRRR....', '..RWWRRRRRRRD...', '..RWRRRRRRRRD...',
  '..RRRRRRRRRRD...', '..RRRRRRRRRRD...', '..RRRRRRRRRDD...', '...RRRRRRRDD....', '....DDRDDDD.....', '................', '................', '................'];
const T_BREAD = ['................', '................', '................', '................', '......LLLLL.....', '....LLMMMMMLL...', '...LMMLMMLMMML..', '..LMMMLMMMLMMMD.',
  '..MMMMMLMMMLMMD.', '..DMMMMMMMMMMDD.', '...DDMMMMMMDDD..', '.....DDDDDDD....', '................', '................', '................', '................'];
const T_STEAK = ['................', '................', '....MMMMM.......', '...MLLMMMMM.....', '..MLLMMFMMMMM...', '..MLMMMFFMMMMM..', '.MLMMMMMFMMMMMD.', '.MMMMFMMMMMMMMD.',
  '.MMMMFFMMMMMMDD.', '..MMMMMMMMMMDD..', '..DMMMMMMMMDD...', '...DDMMMMDDD....', '.....DDDDD......', '................', '................', '................'];
const T_FLINT = ['................', '................', '..........o.....', '.........oLo....', '........oLMMo...', '.......oLMMMo...', '......oLMMWMMo..', '.....oLMMMMMDo..',
  '....oLMMMMMMDo..', '...oLMMMMMDDo...', '..oLMMMMDDDo....', '..oMMMDDDoo.....', '...ooooo........', '................', '................', '................'];
const T_RESIN = ['................', '................', '.......o........', '......oLo.......', '......oLMo......', '.....oLMMo......', '....oLWMMMo.....', '....oLMMMMo.....',
  '...oLMMMMMDo....', '...oMMMMMMDo....', '...oMMMMMDDo....', '....oMMMDDo.....', '.....ooooo......', '................', '................', '................'];
const T_HIDE = ['................', '.oo..........oo.', '.oMMo......oMMo.', '..oMMooooooMMo..', '..oMMMMLMMMMMo..', '.oMMLMMMMMLMMMo.', '.oMMMMMMMMMMMMo.', '.oMMMLMMMMMMLMo.',
  '.oMMMMMMLMMMMMo.', '.oMMLMMMMMMMMMo.', '..oMMMMMLMMMMo..', '..oMMooooooMMo..', '.oMMo......oMMo.', '.oo..........oo.', '................', '................'];
const T_SCRAPS = ['................', '................', '...oo...........', '..oMMo....ooo...', '..oMLMo..oMMMo..', '...oMLMooMLMo...', '....oMMMMLMo....', '.....oMMMMo.....',
  '....oMLMMMMo....', '...oMLMooMMMo...', '..oMLMo..oMMMo..', '..oMMo....oMMo..', '...oo......oo...', '................', '................', '................'];
const T_ANTLER = ['................', '..o.......o.....', '.oLo..o..oLo....', '.oLo.oLo.oLo..o.', '.oLMooLo.oLMooLo', '..oLMMLo..oLMMLo', '...oLMMo...oLMo.', '....oLMo..oLMo..',
  '.....oLMooLMo...', '......oLMMMo....', '.......oLMo.....', '.......oLMo.....', '......oLMMo.....', '......oDDDo.....', '.......ooo......', '................'];
const T_INGOT = ['................', '................', '................', '................', '................', '.....LLLLLLLL...', '....LMMMMMMMMD..', '...LMMMMMMMMDD..',
  '..LLLLLLLLLMDD..', '..MMMMMMMMMMDD..', '..MMMMMMMMMMD...', '..DDDDDDDDDD....', '................', '................', '................', '................'];
const ARMOR_PAL = { leather: { L: '#c58c56', M: '#9b6a3c', D: '#6f4a28', A: '#e0c49a' }, troll: { L: '#86a3c7', M: '#5b7ba3', D: '#3c5577', A: '#f2ead2' },
  iron: { L: '#ffffff', M: '#d8d8d8', D: '#a0a0a0', A: '#8a8a8a' } };
const ARMOR_T = { head: T_HELM, chest: T_CHEST, legs: T_LEGS, feet: T_BOOTS };
// trophies: front-facing heads
const HEADS = {
  deer: R([['#e8dcc0', 4, 1, 1, 5], ['#e8dcc0', 3, 2], ['#e8dcc0', 2, 1], ['#e8dcc0', 5, 3], ['#e8dcc0', 11, 1, 1, 5], ['#e8dcc0', 12, 2], ['#e8dcc0', 13, 1], ['#e8dcc0', 10, 3],
    ['#6e4426', 2, 6, 2, 2], ['#6e4426', 12, 6, 2, 2], ['#9a6438', 4, 5, 8, 7], ['#b07a48', 5, 5, 6, 2], ['#c8a070', 6, 10, 4, 4], ['#2a1a10', 7, 12, 2, 1], ['#111', 5, 8], ['#111', 10, 8], ['#fff', 5, 7], ['#fff', 10, 7]]),
  boar: R([['#4a2a20', 3, 4, 2, 2], ['#4a2a20', 11, 4, 2, 2], ['#6e4434', 3, 5, 10, 8], ['#3e2418', 4, 5], ['#3e2418', 7, 5, 2, 1], ['#3e2418', 11, 5], ['#c08070', 5, 10, 6, 4],
    ['#5a2a20', 6, 11], ['#5a2a20', 9, 11], ['#f2ead2', 4, 10, 1, 3], ['#f2ead2', 11, 10, 1, 3], ['#1a0a08', 5, 7], ['#1a0a08', 10, 7]]),
  greyling: R([['#5a432a', 8, 0, 1, 3], ['#6f7d6a', 3, 4, 10, 10], ['#4f7a2f', 3, 3, 10, 2], ['#4f7a2f', 5, 2, 3, 1], ['#ffd84a', 4, 7, 3, 2], ['#ffd84a', 9, 7, 3, 2],
    ['#3a2a00', 5, 8], ['#3a2a00', 10, 8], ['#2a2f28', 5, 11, 6, 1], ['#59654f', 3, 12, 10, 2]]),
  troll: R([['#2c3d55', 5, 1, 6, 2], ['#5b7ba3', 2, 3, 12, 11], ['#2c3d55', 2, 5, 12, 2], ['#ffd24a', 4, 7, 2, 1], ['#ffd24a', 10, 7, 2, 1], ['#41597a', 7, 7, 2, 3],
    ['#1b2433', 4, 11, 8, 1], ['#f2ead2', 4, 10, 1, 2], ['#f2ead2', 11, 10, 1, 2]]),
  stormhorn: R([['#7ff6ff', 4, 0, 1, 6], ['#7ff6ff', 2, 1], ['#7ff6ff', 3, 2], ['#7ff6ff', 1, 3], ['#7ff6ff', 5, 2], ['#7ff6ff', 11, 0, 1, 6], ['#7ff6ff', 13, 1], ['#7ff6ff', 12, 2],
    ['#7ff6ff', 14, 3], ['#7ff6ff', 10, 2], ['#3a4256', 4, 5, 8, 8], ['#4a5470', 5, 6, 6, 2], ['#ffe14a', 7, 6, 2, 1], ['#9ffcff', 5, 8], ['#9ffcff', 10, 8], ['#2a3040', 6, 11, 4, 3]]),
};

// ---------------------------------------------------------------------
//  Item registry
// ---------------------------------------------------------------------
const RARITY = { common: '#FFFFFF', uncommon: '#FFFF55', rare: '#55FFFF', epic: '#FF55FF', boss: '#FFAA00' };
const ICON16 = {}, ICON32 = {}, BI = {};                // icon caches; BI: block id -> item id
function defineItem(d) {
  const it = Object.assign({ kind: 'material', stack: 64, rarity: 'common', weight: 1 }, d);
  if (it.durability || ['weapon', 'tool', 'armor', 'shield'].includes(it.kind)) it.stack = 1;
  ITEMS[it.id] = it; delete ICON16[it.id]; delete ICON32[it.id];
  if (it.block != null && BI[it.block] === undefined) BI[it.block] = it.id;
  return it;
}
const blockItem = (id, block, o = {}) => defineItem({ id, name: BLOCK[block].name, kind: 'block', block, ...o });
blockItem('grass_block', GRASS); blockItem('dirt', DIRT);
blockItem('stone', STONE, { weight: 2, desc: 'Smooth stone. Counts as stone in recipes.' });
blockItem('cobblestone', COBBLE, { weight: 2, tags: ['stone'], desc: 'Counts as stone in recipes.' });
blockItem('sand', SAND); blockItem('oak_log', LOG, { weight: 2, tags: ['wood'], desc: 'Counts as wood in recipes.' });
blockItem('oak_leaves', LEAVES, { weight: .2 }); blockItem('oak_planks', PLANKS); blockItem('glass', GLASS);
blockItem('quartz_block', QUARTZ, { weight: 2 }); blockItem('gray_concrete', ROAD, { weight: 2 }); blockItem('iron_block', IRON, { weight: 6, rarity: 'uncommon' });
blockItem('cactus', CACTUS); blockItem('bricks', BRICK, { weight: 2 }); blockItem('sandstone', SANDSTONE, { weight: 2 });
blockItem('coal_ore', COAL, { weight: 2 }); blockItem('iron_ore', IRONORE, { weight: 2 });
blockItem('tall_grass', TALLGRASS, { weight: .1 }); blockItem('poppy', POPPY, { weight: .1 }); blockItem('dandelion', DANDELION, { weight: .1 });
blockItem('workbench', WORKBENCH, { kind: 'station', weight: 5, desc: 'Place it, then use it to craft on a 3x3 grid.' });
blockItem('torch', TORCH, { weight: .5, desc: 'A burning stick. Place it on the ground.' });

const mat = (id, name, icon, o = {}) => defineItem({ id, name, kind: 'material', icon, ...o });
mat('wood', 'Wood', art(logs), { weight: 2, desc: 'Rough timber from felled trees.' });
mat('stick', 'Stick', art(DIAG((a, c) => a >= -12 && a <= 12 ? handle(c, HND.wood) : null)), { weight: .2 });
mat('flint', 'Flint', art(PXA(T_FLINT, { L: '#9a9aa6', M: '#5e5e6a', D: '#3a3a44', W: '#e8e8f0' })), { weight: .5, desc: 'A sharp stone. Look for it in sand by the shore.' });
mat('resin', 'Resin', art(PXA(T_RESIN, { L: '#ffd27a', M: '#e8962a', D: '#a85a10', W: '#fff4c8' })), { weight: .3, desc: 'Sticky tree sap. Burns well.' });
mat('coal', 'Coal', art(lump('#4a4a4a', '#2b2b2b', '#161616', '#5a5a5a')), { weight: .5 });
mat('raw_iron', 'Raw Iron', art(lump('#e2c0a6', '#c8a58a', '#8c6a54', '#f0d8c4')), { weight: 1, desc: 'Smelt it with coal at a Workbench.' });
mat('iron_ingot', 'Iron Ingot', art(PXA(T_INGOT, { L: '#ffffff', M: '#d8d8d8', D: '#9a9a9a' })), { weight: 1, rarity: 'uncommon' });
mat('deer_hide', 'Deer Hide', art(PXA(T_HIDE, { M: '#a06a3a', L: '#c89a68' })), { weight: 1, desc: 'Soft hide from a forest deer.' });
mat('leather_scraps', 'Leather Scraps', art(PXA(T_SCRAPS, { M: '#8b5a2b', L: '#b07a45' })), { weight: .5 });
mat('troll_hide', 'Troll Hide', art(PXA(T_HIDE, { M: '#5b7ba3', L: '#86a3c7' })), { weight: 2, rarity: 'uncommon', desc: 'Thick blue hide. Light, tough, quiet.' });
mat('raw_meat', 'Raw Meat', art(PXA(T_STEAK, { M: '#d4505a', L: '#f08088', D: '#9a2f38', F: '#f4d4d0' })), { weight: .5, desc: 'Cook it over a fire before eating.' });
mat('hard_antler', 'Hard Antler', art(PXA(T_ANTLER, { L: '#f4ead2', M: '#cfc09a', D: '#8a7a5a' })), { weight: 1, rarity: 'rare', desc: 'Storm-charged antler, hard enough to split rock.' });

const food = (id, name, icon, f, o = {}) => defineItem({ id, name, kind: 'food', icon, food: f, stack: 20, weight: .5, ...o });
food('apple', 'Apple', art(PXA(T_APPLE, { R: '#d8231f', W: '#ff8a7a', D: '#9e1414', k: '#5a3a1a', G: '#3f8a2a' })), { heal: 2, hunger: 4, stamina: 10, secs: 300 });
food('bread', 'Bread', art(PXA(T_BREAD, { L: '#e8b860', M: '#c98a35', D: '#8a5a1e' })), { heal: 5, hunger: 10, stamina: 30, secs: 1500 });
food('cooked_meat', 'Cooked Meat', art(PXA(T_STEAK, { M: '#8a5230', L: '#b07040', D: '#5a3218', F: '#c89a6a' })), { heal: 6, hunger: 8, stamina: 20, secs: 1200 });

const trophy = (id, name, head, rarity, desc) => defineItem({ id, name, kind: 'trophy', icon: art(HEADS[head]), stack: 20, weight: .5, rarity, desc });
trophy('deer_trophy', 'Deer Trophy', 'deer', 'uncommon', 'A hunter\'s proof. Some altars hunger for it.');
trophy('boar_trophy', 'Boar Trophy', 'boar', 'uncommon', 'Tusks and bristles.');
trophy('greyling_trophy', 'Greyling Trophy', 'greyling', 'uncommon', 'It still looks surprised.');
trophy('troll_trophy', 'Troll Trophy', 'troll', 'rare', 'The head of a forest troll. Heavy.');
trophy('stormhorn_trophy', 'Stormhorn Trophy', 'stormhorn', 'boss', 'The lightning stag\'s head. It hums with thunder.');

// weapons, tools and shields. Damage is in hit points (player 20 HP, Forest Troll 60 HP); speed = seconds per swing
const gear = (id, name, kind, icon, o) => defineItem({ id, name, kind, icon: art(icon), ...o });
gear('wood_club', 'Wooden Club', 'weapon', TOOL_ART.club(MAT.club, HND.dark), { durability: 100, weight: 2, weapon: { dmg: 6, speed: .8, stamina: 6 }, desc: 'A knotted branch. Blunt but honest.' });
gear('flint_axe', 'Flint Axe', 'tool', TOOL_ART.axe(MAT.flint, HND.wood), { durability: 120, weight: 1.5, weapon: { dmg: 7, speed: 1, stamina: 8 }, tool: { type: 'axe', power: 2 } });
gear('flint_spear', 'Flint Spear', 'weapon', TOOL_ART.spear(MAT.flint, HND.dark), { durability: 150, weight: 1, weapon: { dmg: 9, speed: .7, stamina: 7 }, desc: 'Long reach, quick thrusts.' });
gear('antler_pickaxe', 'Antler Pickaxe', 'tool', TOOL_ART.pickaxe(MAT.antler, HND.wood), { durability: 200, weight: 2.5, rarity: 'uncommon',
  weapon: { dmg: 5, speed: .85, stamina: 7 }, tool: { type: 'pickaxe', power: 2 }, desc: 'Breaks stone and ore.' });
const TIERS = [['wooden', 'Wooden', 'wood', 60, 'common', 1, 0], ['stone', 'Stone', 'stone', 132, 'common', 2, 1], ['iron', 'Iron', 'iron', 250, 'uncommon', 3, 2]];
for (const [tid, tname, m, dur, rarity, power, k] of TIERS) {
  gear(tid + '_sword', tname + ' Sword', 'weapon', TOOL_ART.sword(MAT[m], HND.wood), { durability: dur, rarity, weight: [1, 2, 2.5][k], weapon: { dmg: [5, 7, 10][k], speed: .62, stamina: 5 } });
  gear(tid + '_pickaxe', tname + ' Pickaxe', 'tool', TOOL_ART.pickaxe(MAT[m], HND.wood), { durability: dur, rarity, weight: [1.5, 2.5, 3][k], weapon: { dmg: [3, 4, 5][k], speed: .83, stamina: 6 }, tool: { type: 'pickaxe', power } });
  gear(tid + '_axe', tname + ' Axe', 'tool', TOOL_ART.axe(MAT[m], HND.wood), { durability: dur, rarity, weight: [1.5, 2.5, 3][k], weapon: { dmg: [5, 7, 9][k], speed: 1.1, stamina: 8 }, tool: { type: 'axe', power } });
  gear(tid + '_shovel', tname + ' Shovel', 'tool', TOOL_ART.shovel(MAT[m], HND.wood), { durability: dur, rarity, weight: [1, 1.5, 2][k], weapon: { dmg: [2.5, 3.5, 4.5][k], speed: 1, stamina: 5 }, tool: { type: 'shovel', power } });
}
gear('wood_shield', 'Wood Shield', 'shield', PXA(T_WSHIELD, { L: '#c9a46a', M: '#a17f4c', D: '#6e5530', I: '#9a9a9a', B: '#d8d8d8' }), { durability: 120, weight: 4, shield: { block: 4, parry: 2 }, desc: 'Hold it in your off hand.' });
gear('shield', 'Shield', 'shield', PXA(T_SHIELD, { I: '#a8a8a8', P: '#a2834f', S: '#6e5530' }), { durability: 336, weight: 5, shield: { block: 6, parry: 1.5 }, desc: 'Hold it in your off hand.' });
// armor sets (Minecraft armor points: 20 = the most)
const ARMOR_SETS = [['leather', 'leather', [['leather_cap', 'Leather Cap'], ['leather_tunic', 'Leather Tunic'], ['leather_pants', 'Leather Pants'], ['leather_boots', 'Leather Boots']], [1, 3, 2, 1], [55, 80, 75, 65], 'common', '#8b5a2b'],
  ['troll', 'troll', [['troll_hood', 'Troll Hide Hood'], ['troll_tunic', 'Troll Hide Tunic'], ['troll_leggings', 'Troll Hide Leggings'], ['troll_boots', 'Troll Hide Boots']], [2, 5, 4, 2], [120, 160, 150, 120], 'uncommon', '#5b7ba3'],
  ['iron', 'iron', [['iron_helmet', 'Iron Helmet'], ['iron_chestplate', 'Iron Chestplate'], ['iron_leggings', 'Iron Leggings'], ['iron_boots', 'Iron Boots']], [2, 6, 5, 2], [165, 240, 225, 195], 'uncommon', '#d8d8d8']];
const SLOT_NAMES = ['head', 'chest', 'legs', 'feet'];
for (const [, pal, pieces, pts, durs, rarity, tint] of ARMOR_SETS) pieces.forEach(([id, name], k) => defineItem({ id, name, kind: 'armor', icon: art(PXA(ARMOR_T[SLOT_NAMES[k]], ARMOR_PAL[pal])),
  armor: { slot: SLOT_NAMES[k], armor: pts[k] }, durability: durs[k], rarity, tint, weight: [1, 3, 2.5, 1][k] * (pal === 'iron' ? 2.5 : pal === 'troll' ? 1.2 : 1),
  desc: pal === 'troll' ? 'Light and quiet. Good for sneaking.' : undefined }));

// ---------------------------------------------------------------------
//  Recipes: shapeless, with Valheim-style counts. needs keys are item ids or tags ('wood' accepts Oak Logs, 'stone' Cobblestone).
//  The grid matches the recipe chosen in the recipe book first, then one whose counts match exactly, then the smallest one.
// ---------------------------------------------------------------------
const RECIPES = [];
function addRecipe(r) { const rec = { out: r.out, n: r.n || 1, needs: r.needs, station: r.station || null }; RECIPES.push(rec); if (isOpen) buildBook(); return rec; }
const WB = 'workbench';
[{ out: 'oak_planks', n: 4, needs: { wood: 1 } }, { out: 'stick', n: 4, needs: { oak_planks: 2 } }, { out: 'workbench', needs: { oak_planks: 4 } },
 { out: 'torch', n: 4, needs: { stick: 1, coal: 1 } }, { out: 'torch', n: 2, needs: { wood: 1, resin: 1 } }, { out: 'wood_club', needs: { wood: 6 } },
 { out: 'flint_axe', needs: { wood: 5, flint: 4 }, station: WB }, { out: 'flint_spear', needs: { wood: 5, flint: 10, leather_scraps: 2 }, station: WB },
 { out: 'antler_pickaxe', needs: { wood: 10, hard_antler: 2 }, station: WB }, { out: 'wood_shield', needs: { wood: 8, resin: 4, leather_scraps: 2 }, station: WB },
 { out: 'iron_ingot', needs: { raw_iron: 1, coal: 1 }, station: WB }, { out: 'shield', needs: { oak_planks: 6, iron_ingot: 1 }, station: WB },
].forEach(addRecipe);
for (const [tid, head] of [['wooden', 'oak_planks'], ['stone', 'stone'], ['iron', 'iron_ingot']]) {
  addRecipe({ out: tid + '_sword', needs: { [head]: 2, stick: 1 }, station: WB });
  addRecipe({ out: tid + '_axe', needs: { [head]: 3, stick: 1 }, station: WB });
  addRecipe({ out: tid + '_pickaxe', needs: { [head]: 3, stick: 2 }, station: WB });
  addRecipe({ out: tid + '_shovel', needs: { [head]: 1, stick: 2 }, station: WB });
}
for (const [id, n] of [['iron_helmet', 5], ['iron_chestplate', 8], ['iron_leggings', 7], ['iron_boots', 4]]) addRecipe({ out: id, needs: { iron_ingot: n }, station: WB });
for (const [id, n] of [['leather_cap', 4], ['leather_tunic', 6], ['leather_pants', 5], ['leather_boots', 3]]) addRecipe({ out: id, needs: { deer_hide: n, leather_scraps: 2 }, station: WB });
for (const [id, n] of [['troll_hood', 5], ['troll_tunic', 7], ['troll_leggings', 6], ['troll_boots', 4]]) addRecipe({ out: id, needs: { troll_hide: n, leather_scraps: 3 }, station: WB });

// crafting stations: a block that must be within reach, or a custom test (other modules can add their own)
const STATIONS = { workbench: { name: 'Workbench', block: WORKBENCH, r: 4 } };
function nearStation(name) {
  const st = STATIONS[name]; if (!st) return false; if (st.test) return !!st.test();
  const p = PL().pos, r = st.r || 4, bx = Math.floor(p.x), by = Math.floor(p.y), bz = Math.floor(p.z);
  for (let y = -2; y <= 3; y++) for (let z = -r; z <= r; z++) for (let x = -r; x <= r; x++) if (get(bx + x, by + y, bz + z) === st.block) return true;
  return false;
}

// ---------------------------------------------------------------------
//  Icons
// ---------------------------------------------------------------------
function missing(g) { g.fillStyle = '#000'; g.fillRect(0, 0, 16, 16); g.fillStyle = '#f800f8'; g.fillRect(0, 0, 8, 8); g.fillRect(8, 8, 8, 8); }
function icon16(id) {
  if (ICON16[id]) return ICON16[id];
  const it = ITEMS[id];
  return ICON16[id] = pixCanvas(16, 16, g => {
    if (!it) return missing(g);
    if (it.icon) return it.icon(g);
    const b = it.block != null && BLOCK[it.block];
    if (b && b.kind === 'cross') { const i = b.tiles[0]; g.drawImage(ATLAS, (i % 16) * 16, Math.floor(i / 16) * 16, 16, 16, 0, 0, 16, 16); }
    else if (b) g.drawImage(icon32(id), 0, 0, 16, 16); else missing(g);
  });
}
function icon32(id) {
  if (ICON32[id]) return ICON32[id];
  const c = document.createElement('canvas'); c.width = c.height = 32; const it = ITEMS[id];
  if (it && !it.icon && it.block != null && BLOCK[it.block]) drawIcon(c, it.block);
  else { const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(icon16(id), 0, 0, 32, 32); }
  return ICON32[id] = c;
}

// ---------------------------------------------------------------------
//  Bags: one per character. A stack is { id, n, dur? } (dur only on items with durability)
// ---------------------------------------------------------------------
const newBag = () => ({ main: Array(36).fill(null), armor: Array(4).fill(null), off: [null], sel: 0 });
function starterBag() { const b = newBag(); b.main[0] = mk('wood_club'); b.main[1] = mk('oak_planks', 8); b.main[2] = mk('torch', 4); b.main[3] = mk('apple', 4); return b; }
const bags = DEFS.map(() => starterBag());
let bagCur = cur, bag = bags[cur], carry = null, lastHeldId, dirty = false, saveT = 0;
const grid = Array(9).fill(null);
const maxStack = id => ITEMS[id] ? ITEMS[id].stack : 64;
function mk(id, n = 1) { const s = { id, n }; const d = ITEMS[id] && ITEMS[id].durability; if (d) s.dur = d; return s; }
const matches = (id, key) => id === key || !!(ITEMS[id] && ITEMS[id].tags && ITEMS[id].tags.includes(key));
const held = () => bag.main[hotSel] || null;
const ALL = [...Array(36).keys()], STORAGE = ALL.slice(9), HOTBAR_I = ALL.slice(0, 9);

// put a stack into bag.main at the given slots (merge first, then empty slots); returns what did not fit, or null
function moveInto(st, idxs = ALL) {
  const ms = maxStack(st.id);
  if (ms > 1) for (const i of idxs) { const s = bag.main[i]; if (s && s.id === st.id && s.n < ms) { const k = Math.min(st.n, ms - s.n); s.n += k; st.n -= k; if (!st.n) return null; } }
  for (const i of idxs) if (!bag.main[i]) { const k = Math.min(st.n, ms); bag.main[i] = { ...st, n: k }; st.n -= k; if (!st.n) return null; }
  return st;
}
function add(id, n = 1) {
  if (!ITEMS[id] || !(n > 0)) return n || 0;
  let left = n;
  while (left > 0) { const st = mk(id, Math.min(left, maxStack(id))), k = st.n, rest = moveInto(st); left -= k - (rest ? rest.n : 0); if (rest) break; }
  if (left !== n) changed();
  return left;
}
function count(id) { let n = 0; for (const s of [...bag.main, bag.off[0]]) if (s && matches(s.id, id)) n += s.n; return n; }
function remove(id, n = 1) {
  if (count(id) < n) return false;
  const take = (arr, i) => { const s = arr[i]; const k = Math.min(n, s.n); s.n -= k; n -= k; if (!s.n) arr[i] = null; };
  for (const exact of [true, false]) {           // exact ids before tagged ones
    for (let i = 0; i < 36 && n; i++) { const s = bag.main[i]; if (s && (exact ? s.id === id : matches(s.id, id))) take(bag.main, i); }
    if (n && bag.off[0] && (exact ? bag.off[0].id === id : matches(bag.off[0].id, id))) take(bag.off, 0);
  }
  changed(); return true;
}
function wearOut(arr, i, n) {
  const s = arr[i]; if (!s || s.dur == null || !(n > 0)) return;
  s.dur -= n;
  if (s.dur <= 0) { arr[i] = null; if (AC) { const t = AC.currentTime; noiseSweep(t, .25, 2600, 900, .3, 2, .004); click(t, 900, .08); click(t + .06, 600, .06); }
    if (state === 'play' || state === 'inv') chat(`${ITEMS[s.id] ? ITEMS[s.id].name : s.id} broke!`); }
  changed();
}
function pop() { if (AC) click(AC.currentTime, 1700 + Math.random() * 500, .025); }
function uiTick() { if (AC) click(AC.currentTime, 1300, .03); }

// keep the HUD hotbar, the held model and the main script's HOTBAR mirror up to date after any change
function changed() {
  for (let k = 0; k < 9; k++) { const s = bag.main[k], it = s && ITEMS[s.id]; HOTBAR[k] = it && it.block != null ? it.block : AIR; }
  drawHotbar();
  if (isOpen) render();
  const hid = held() ? held().id : null; if (hid !== lastHeldId) { lastHeldId = hid; updateHeld(); }
  dirty = true; emit('invChange');
}

// ---------------------------------------------------------------------
//  Saving (per character, in localStorage)
// ---------------------------------------------------------------------
const SAVE_KEY = 'blockcraft.inventory.v1';
const packS = s => s ? [s.id, s.n, s.dur] : 0;
const unpackS = a => { if (!Array.isArray(a) || !ITEMS[a[0]]) return null; const s = { id: a[0], n: Math.max(1, Math.min(a[1] | 0, maxStack(a[0]))) }; if (ITEMS[a[0]].durability) s.dur = a[2] > 0 ? a[2] : ITEMS[a[0]].durability; return s; };
function save() {
  dirty = false; saveT = 0;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ v: 1, bags: Object.fromEntries(DEFS.map((d, i) => [d.name,
    { main: bags[i].main.map(packS), armor: bags[i].armor.map(packS), off: bags[i].off.map(packS), sel: bags[i].sel }])) })); } catch (e) { /* storage blocked or full */ }
}
function load() {
  let data = null; try { data = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { data = null; }
  DEFS.forEach((d, i) => { const s = data && data.bags && data.bags[d.name]; if (!s) return;
    const b = newBag(); (s.main || []).slice(0, 36).forEach((a, k) => b.main[k] = unpackS(a)); (s.armor || []).slice(0, 4).forEach((a, k) => b.armor[k] = unpackS(a));
    b.off[0] = unpackS((s.off || [])[0]); b.sel = (s.sel | 0) % 9; bags[i] = b; });
  bag = bags[cur]; bagCur = cur; changed(); dirty = false;
}
addEventListener('pagehide', () => { if (dirty) save(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && dirty) save(); });

// ---------------------------------------------------------------------
//  HUD hotbar: icons, counts, durability bars, and the "..." inventory button on touch screens
// ---------------------------------------------------------------------
const hudCss = document.createElement('style');
hudCss.textContent = `
  .slot .ic { position: absolute; right: 1px; bottom: -3px; font: 600 17px var(--ui); color: #fff; text-shadow: 2px 2px 0 #3f3f3f; pointer-events: none; }
  .slot .du { position: absolute; left: 6px; bottom: 5px; width: 26px; height: 4px; background: #000; pointer-events: none; }
  .slot .du u { display: block; height: 2px; }
  .slot.invBtn { font: 600 22px/1 var(--ui); color: #fff; text-shadow: 2px 2px 0 #3f3f3f; margin-left: 4px; background: rgba(0,0,0,.25); padding-bottom: 8px; box-sizing: border-box; }
  html:not(.touch) .slot.invBtn { display: none; }
  @media (max-width: 560px) { .slot .ic { font-size: 13px; bottom: -2px; } .slot .du { left: 4px; bottom: 3px; width: 20px; height: 3px; } .slot .du u { height: 1.5px; } }`;
document.head.appendChild(hudCss);
const hudParts = slotDivs.map(d => {
  const ic = document.createElement('b'); ic.className = 'ic'; d.appendChild(ic);
  const du = document.createElement('i'); du.className = 'du'; du.hidden = true; const u = document.createElement('u'); du.appendChild(u); d.appendChild(du);
  return { g: d.querySelector('canvas').getContext('2d'), ic, du, u };
});
{ const b = document.createElement('div'); b.className = 'slot invBtn'; b.textContent = '...'; b.title = 'Inventory';
  b.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); if (state === 'play') openInv(); }); hotbarEl.appendChild(b); }
const durColor = f => `hsl(${Math.round(120 * f)}, 100%, 45%)`;
function drawHotbar() {
  hudParts.forEach((p, k) => {
    const s = bag.main[k]; p.g.clearRect(0, 0, 32, 32); if (s) p.g.drawImage(icon32(s.id), 0, 0);
    p.ic.textContent = s && s.n > 1 ? s.n : '';
    const max = s && ITEMS[s.id] && ITEMS[s.id].durability, show = !!(max && s.dur < max); p.du.hidden = !show;
    if (show) { const f = Math.max(0, s.dur / max); p.u.style.width = Math.max(1, Math.round(f * 100)) + '%'; p.u.style.background = durColor(f); }
  });
}

// ---------------------------------------------------------------------
//  Block breaking: hardness, tools, crack overlay, drops
// ---------------------------------------------------------------------
const HARD = { [GRASS]: .6, [DIRT]: .5, [STONE]: 1.5, [SAND]: .5, [LOG]: 2, [LEAVES]: .2, [PLANKS]: 2, [GLASS]: .3, [QUARTZ]: .8, [ROAD]: 1.8, [IRON]: 5,
  [CACTUS]: .4, [BRICK]: 2, [SANDSTONE]: .8, [COBBLE]: 2, [COAL]: 3, [IRONORE]: 3, [WORKBENCH]: 2.5 };
const TOOLFOR = {}, PICK_ONLY = new Set([STONE, QUARTZ, ROAD, IRON, BRICK, SANDSTONE, COBBLE, COAL, IRONORE]), MIN_POWER = { [IRONORE]: 2, [IRON]: 2 };
for (const t of PICK_ONLY) TOOLFOR[t] = 'pickaxe';
for (const t of [LOG, PLANKS, WORKBENCH]) TOOLFOR[t] = 'axe';
for (const t of [GRASS, DIRT, SAND]) TOOLFOR[t] = 'shovel';
const TIER_SPEED = [1, 2, 4, 6, 8, 10];               // tool power -> mining speed multiplier (wood 2, stone/flint 4, iron 6)
const heldTool = () => { const s = held(); return s && ITEMS[s.id] && ITEMS[s.id].tool || null; };
// seconds to break block t with the held item: 0 = instant, Infinity = unbreakable
function breakTime(t) {
  const b = BLOCK[t]; if (!b || t === BEDROCK || b.kind === 'air' || b.kind === 'water') return Infinity;
  if (b.kind === 'cross') return 0;
  const hard = HARD[t] ?? 1, tl = heldTool();
  if (tl && TOOLFOR[t] === tl.type) return hard * 1.5 / (TIER_SPEED[tl.power] || 2);
  return hard * (PICK_ONLY.has(t) ? 5 : 1.5);
}
// stone-like blocks only drop when mined with a strong enough pickaxe
function canHarvest(t) { if (!PICK_ONLY.has(t)) return true; const tl = heldTool(); return !!tl && tl.type === 'pickaxe' && tl.power >= (MIN_POWER[t] || 1); }
function dropsFor(h) {
  const t = h.t; if (!canHarvest(t)) return [];
  const r = Math.random();
  switch (t) {
    case GRASS: return [['dirt', 1]];
    case STONE: return [['cobblestone', 1]];
    case GLASS: case TALLGRASS: return [];
    case LEAVES: return r < .1 ? [['apple', 1]] : r < .16 ? [['stick', 1]] : [];
    case LOG: return r < .15 ? [['oak_log', 1], ['resin', 1]] : [['oak_log', 1]];
    case SAND: return r < .1 ? [['sand', 1], ['flint', 1]] : [['sand', 1]];
    case COAL: return [['coal', 1]];
    case IRONORE: return [['raw_iron', 1]];
  }
  return BI[t] ? [[BI[t], 1]] : [];
}
function onBreak(h) {
  const wear = breakTime(h.t) > 0;
  const drops = filter('blockDrops', dropsFor(h), h);          // other modules may change what a block drops
  let got = false;
  for (const [id, n] of drops) { const left = add(id, n); if (left < n) got = true;
    if (left > 0 && typeof World !== 'undefined' && World.spawnDrop) World.spawnDrop(id, left, new V3(h.x + .5, h.y + .5, h.z + .5)); }
  if (got) pop();
  if (wear) wearOut(bag.main, hotSel, 1);
}
// 10 crack stages: random cracks grow from the centre; each pixel knows the stage it appears in
const crackTex = (() => {
  const cr = mulberry32(4242), pts = [];
  for (let k = 0; k < 7; k++) { let x = 7.5 + (cr() - .5) * 3, y = 7.5 + (cr() - .5) * 3, ang = k / 7 * Math.PI * 2 + cr();
    for (let s = 0; s < 12; s++) { ang += (cr() - .5) * 1.2; x += Math.cos(ang); y += Math.sin(ang); if (x < 0 || y < 0 || x >= 16 || y >= 16) break;
      pts.push([x | 0, y | 0, (s + cr() * 2.5) / 13]);
      if (cr() < .25) pts.push([(x + (cr() < .5 ? 1 : -1)) | 0, y | 0, (s + 3 + cr() * 3) / 13]); } }
  return [...Array(10).keys()].map(st => { const t = new THREE.CanvasTexture(pixCanvas(16, 16, g => {
    for (const [x, y, w] of pts) if (w < (st + 1) / 10) { g.fillStyle = w < (st - 3) / 10 ? 'rgba(0,0,0,.72)' : 'rgba(0,0,0,.5)'; g.fillRect(x, y, 1, 1); } }));
    t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; return t; });
})();
const crackMat = new THREE.MeshBasicMaterial({ map: crackTex[0], transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 });
const crackMesh = new THREE.Mesh(new THREE.BoxGeometry(1.002, 1.002, 1.002), crackMat); crackMesh.visible = false; crackMesh.renderOrder = 3; scene.add(crackMesh);
let mineKey = '', mineT = 0, mineTotal = 0, mineFrame = -1, frameNo = 0, mineSnd = 0;
// called by the main loop every frame while the player holds attack on a block; returns true when the block broke
function mine(h, dt) {
  const key = h.x + ',' + h.y + ',' + h.z + ',' + h.t + ',' + hotSel;     // a new block or a new tool restarts the progress
  if (key !== mineKey) { mineKey = key; mineT = 0; mineTotal = breakTime(h.t); mineSnd = 0; }
  mineFrame = frameNo;
  if (mineTotal === 0) { breakBlock(h); mineKey = ''; return true; }
  if (!isFinite(mineTotal)) { if ((mineSnd -= dt) <= 0) { mineSnd = .3; PL().swing = 1; swingT = 1; } return false; }
  mineT += dt; mineSnd -= dt;
  if (mineSnd <= 0) { mineSnd = .24; SFX.block(h.t, 'step'); PL().swing = 1; swingT = 1; }
  if (mineT >= mineTotal) { breakBlock(h); mineKey = ''; crackMesh.visible = false; return true; }
  crackMat.map = crackTex[Math.min(9, Math.floor(mineT / mineTotal * 10))];
  crackMesh.position.set(h.x + .5, h.y + .5, h.z + .5); crackMesh.visible = true;
  return false;
}

// ---------------------------------------------------------------------
//  First-person models: block cube, extruded pixel sprite, bare arm; plus the off-hand item on the left
// ---------------------------------------------------------------------
const spriteMats = {};
function spriteMat(id) {
  if (spriteMats[id]) return spriteMats[id];
  const t = new THREE.CanvasTexture(icon16(id)); t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
  return spriteMats[id] = new THREE.MeshBasicMaterial({ map: t, vertexColors: true, alphaTest: .5, depthTest: false, fog: false });
}
// 16x16 icon -> 1x1 plate, one pixel thick, with side walls on the outline like Minecraft's held items
function spriteGeo(cv) {
  const d = cv.getContext('2d').getImageData(0, 0, 16, 16).data, on = (x, y) => x >= 0 && y >= 0 && x < 16 && y < 16 && d[(y * 16 + x) * 4 + 3] > 128;
  const pos = [], uv = [], col = [], idx = [], h = 1 / 32, q = 1 / 16;
  const quad = (p, u, c) => { const b = pos.length / 3; for (let i = 0; i < 4; i++) { pos.push(...p[i]); uv.push(...u[i]); col.push(c, c, c); } idx.push(b, b + 1, b + 2, b, b + 2, b + 3); };
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    if (!on(x, y)) continue;
    const X0 = x * q - .5, X1 = X0 + q, Y1 = .5 - y * q, Y0 = Y1 - q, U = (x + .5) / 16, V = 1 - (y + .5) / 16, uu = [[U, V], [U, V], [U, V], [U, V]];
    if (!on(x - 1, y)) quad([[X0, Y0, -h], [X0, Y0, h], [X0, Y1, h], [X0, Y1, -h]], uu, .62);
    if (!on(x + 1, y)) quad([[X1, Y0, h], [X1, Y0, -h], [X1, Y1, -h], [X1, Y1, h]], uu, .62);
    if (!on(x, y - 1)) quad([[X0, Y1, h], [X1, Y1, h], [X1, Y1, -h], [X0, Y1, -h]], uu, .85);
    if (!on(x, y + 1)) quad([[X0, Y0, -h], [X1, Y0, -h], [X1, Y0, h], [X0, Y0, h]], uu, .5);
  }
  quad([[.5, -.5, -h], [-.5, -.5, -h], [-.5, .5, -h], [.5, .5, -h]], [[1, 0], [0, 0], [0, 1], [1, 1]], .8);   // back (mirrored)
  quad([[-.5, -.5, h], [.5, -.5, h], [.5, .5, h], [-.5, .5, h]], [[0, 0], [1, 0], [1, 1], [0, 1]], 1);     // front, drawn last
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); return g;
}
function shadedBox(w, h, d, color) {
  const g = new THREE.BoxGeometry(w, h, d), c = new THREE.Color(color), cols = [];
  for (const k of [.75, .6, 1, .5, .9, .7]) for (let i = 0; i < 4; i++) cols.push(c.r * k, c.g * k, c.b * k);   // +x -x +y -y +z -z
  g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  return new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, depthTest: false, fog: false }));
}
// The main loop poses the held group at (.62, -.5, -1) turned by (.2, .75, 0) plus the swing; camPose places a child
// at a camera-space position and orientation for the rest pose, so the swing still moves it.
const G0 = new V3(.62, -.5, -1), Q0i = new THREE.Quaternion().setFromEuler(new THREE.Euler(.2, .75, 0)).invert();
function camPose(o, p, q) { o.quaternion.copy(Q0i).multiply(q); o.position.copy(p).sub(G0).applyQuaternion(Q0i); }
const ARM_DIR = new V3(-.357, .671, -.649).normalize(), HAND_AT = new V3(.62, -.4, -.9);
const SPRITE_Q = new THREE.Quaternion().setFromEuler(new THREE.Euler(.15, Math.PI - .7, .1, 'YXZ'));   // back face (mirrored): tip points up-left
function model(stack, left) {
  const g = new THREE.Group(), it = stack && ITEMS[stack.id], b = it && it.block != null ? BLOCK[it.block] : null;
  const add3 = m => { m.renderOrder = 50; g.add(m); return m; };
  if (!stack) {                                         // bare arm: sleeve and skin of the current character
    const d = DEFS[cur], sl = d.sleeve / 12 * .75, sk = .75 - sl, arm = new THREE.Group();
    if (sl > 0) { const a = shadedBox(.25, sl, .25, d.top); a.position.y = -sl / 2; arm.add(a); }
    const hand = shadedBox(.25, sk, .25, d.skin); hand.position.y = -sl - sk / 2; arm.add(hand);
    arm.children.forEach(m => m.renderOrder = 50);
    camPose(arm, HAND_AT.clone().addScaledVector(ARM_DIR, -.75), new THREE.Quaternion().setFromUnitVectors(new V3(0, -1, 0), ARM_DIR)); g.add(arm);
  } else if (b && b.kind !== 'cross') {
    const A = newArrays(); emitBlock(A, A, 0, 0, 0, it.block, -.5, -.5, -.5, true); add3(new THREE.Mesh(makeGeo(A), heldMat)); g.scale.setScalar(.3);
  } else {
    const m = add3(new THREE.Mesh(spriteGeo(icon16(stack.id)), spriteMat(stack.id)));
    if (left) { m.rotation.set(0, .45, 0); m.scale.setScalar(.5); }                // off hand: posed by syncOffhand / the tick hook
    else { camPose(m, new V3(.5, -.3, -.85), SPRITE_Q); m.scale.setScalar(.3); }
  }
  return g;
}
let offMesh = null, offId, blockK = 0;
function syncOffhand() {
  const s = bag.off[0], id = s ? s.id : null; if (id === offId) return; offId = id;
  if (offMesh) { camera.remove(offMesh); offMesh.traverse(o => { if (o.geometry) o.geometry.dispose(); }); offMesh = null; }
  if (s) { offMesh = model(s, true); camera.add(offMesh); }
}

// ---------------------------------------------------------------------
//  Inventory screen (Minecraft GUI at an integer-ish scale, laid out in GUI pixels)
// ---------------------------------------------------------------------
const W_BOOK = 132, W_PANEL = 176, H_GUI = 166;
const css = document.createElement('style');
css.textContent = `
  #inv { position: fixed; inset: 0; z-index: 15; background: rgba(16,16,16,.55); font-family: var(--ui); color: #404040; --s: 2; touch-action: none; }
  #invGui { position: absolute; left: 50%; top: 50%; display: flex; gap: 4px; transform: translate(-50%, -50%) scale(var(--s)); }
  .ipn, .ibk { position: relative; height: ${H_GUI}px; background: #c6c6c6; border-radius: 3px; box-sizing: border-box;
    box-shadow: inset 2px 2px 0 #fff, inset -2px -2px 0 #555, 0 0 0 1px #000; }
  .ipn { width: ${W_PANEL}px; } .ibk { width: ${W_BOOK}px; }
  .ilb { position: absolute; font-size: 8px; line-height: 8px; white-space: nowrap; color: #404040; }
  .is { position: absolute; width: 18px; height: 18px; background: #8b8b8b; box-shadow: inset 1px 1px 0 #373737, inset -1px -1px 0 #fff; }
  .is.big { width: 26px; height: 26px; }
  .is canvas { position: absolute; left: 1px; top: 1px; width: 16px; height: 16px; image-rendering: pixelated; pointer-events: none; }
  .is.big canvas { left: 5px; top: 5px; }
  .is canvas.sil { opacity: .55; }
  .is b, #invCarry b { position: absolute; right: 0; bottom: 0; font: 600 8px/7px var(--ui); color: #fff; text-shadow: 1px 1px 0 #3f3f3f; pointer-events: none; }
  .is.big b { right: 4px; bottom: 4px; }
  .is i { position: absolute; left: 2px; top: 14px; width: 13px; height: 2px; background: #000; pointer-events: none; }
  .is i u { display: block; height: 1px; }
  @media (hover: hover) { .is:hover::after, .ir:hover::after, .ibtn:hover::after { content: ""; position: absolute; inset: 1px; background: rgba(255,255,255,.45); pointer-events: none; } }
  .ipv { position: absolute; left: 25px; top: 7px; width: 51px; height: 72px; background: #000; box-shadow: inset 1px 1px 0 #373737, inset -1px -1px 0 #fff; }
  .ipv canvas { position: absolute; left: 9.5px; top: 4px; width: 32px; height: 64px; image-rendering: pixelated; }
  .iar { position: absolute; width: 22px; height: 15px; image-rendering: pixelated; }
  .ibtn { position: absolute; width: 16px; height: 16px; background: #727272; box-shadow: inset 1px 1px 0 #aaa, inset -1px -1px 0 #4a4a4a, 0 0 0 1px #000; cursor: pointer;
    font: 8px/16px var(--ui); color: #fff; text-align: center; text-shadow: 1px 1px 0 #3f3f3f; }
  .ibtn canvas { position: absolute; left: 2px; top: 2px; width: 12px; height: 12px; image-rendering: pixelated; pointer-events: none; }
  .ibtn.wide { width: auto; padding: 0 4px; height: 12px; line-height: 12px; font-size: 7px; }
  .ibl { position: absolute; left: 4px; right: 4px; top: 20px; bottom: 4px; overflow: hidden; background: #8b8b8b; box-shadow: inset 1px 1px 0 #373737, inset -1px -1px 0 #fff; }
  .ibl > div { padding: 1px; }
  .ir { position: relative; height: 20px; margin-bottom: 1px; background: #a8a8a8; box-shadow: inset 1px 1px 0 #d8d8d8, inset -1px -1px 0 #5a5a5a; cursor: pointer; }
  .ir.no { background: #a87070; box-shadow: inset 1px 1px 0 #d09a9a, inset -1px -1px 0 #5a3030; }
  .ir.far { background: #7e7e7e; box-shadow: inset 1px 1px 0 #9a9a9a, inset -1px -1px 0 #4a4a4a; }
  .ir > canvas { position: absolute; left: 2px; top: 2px; width: 16px; height: 16px; image-rendering: pixelated; pointer-events: none; }
  .ir .irn { position: absolute; left: 21px; top: 2px; right: 2px; font-size: 7px; line-height: 7px; color: #fff; text-shadow: 1px 1px 0 #3f3f3f; white-space: nowrap; overflow: hidden; pointer-events: none; }
  .ir .irq { position: absolute; left: 21px; top: 11px; display: flex; gap: 1px; pointer-events: none; }
  .ir .irq span { position: relative; display: inline-flex; align-items: center; font-size: 6px; line-height: 6px; color: #fff; text-shadow: 1px 1px 0 #3f3f3f; margin-right: 2px; }
  .ir .irq span.miss { color: #ff7070; }
  .ir .irq canvas { width: 7px; height: 7px; image-rendering: pixelated; margin-right: 1px; }
  .ir .irs { position: absolute; right: 2px; top: 10px; width: 8px; height: 8px; image-rendering: pixelated; opacity: .85; }
  #invCarry { position: absolute; width: calc(16px * var(--s)); height: calc(16px * var(--s)); margin: calc(-8px * var(--s)) 0 0 calc(-8px * var(--s)); pointer-events: none; }
  #invCarry canvas { width: 100%; height: 100%; image-rendering: pixelated; }
  #invCarry b { font-size: calc(8px * var(--s)); line-height: 1; text-shadow: calc(1px * var(--s)) calc(1px * var(--s)) 0 #3f3f3f; }
  #invTip { position: absolute; pointer-events: none; background: rgba(16,0,16,.94); padding: calc(2px * var(--s)) calc(3px * var(--s));
    border: calc(1px * var(--s)) solid; border-image: linear-gradient(#5000ff, #28007f) 1; box-shadow: 0 0 0 calc(1px * var(--s)) rgba(16,0,16,.94);
    font-size: calc(8px * var(--s)); line-height: 1.3; color: #aaa; white-space: nowrap; text-shadow: calc(1px * var(--s)) calc(1px * var(--s)) 0 rgba(0,0,0,.55); }
  #invTip .tn { margin-bottom: calc(2px * var(--s)); } #invTip .bl { color: #5555ff; } #invTip .rd { color: #ff5555; } #invTip .ds { font-style: italic; }`;
document.head.appendChild(css);
const mkEl = (tag, cls, parent, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; if (parent) parent.appendChild(e); return e; };
const root = mkEl('div', '', document.body); root.id = 'inv'; root.hidden = true;
const gui = mkEl('div', '', root); gui.id = 'invGui';
const book = mkEl('div', 'ibk', gui), panel = mkEl('div', 'ipn', gui);
const carryEl = mkEl('div', '', root); carryEl.id = 'invCarry'; const carryCv = mkEl('canvas', '', carryEl); carryCv.width = carryCv.height = 32; const carryN = mkEl('b', '', carryEl);
const tipEl = mkEl('div', '', root); tipEl.id = 'invTip'; tipEl.hidden = true;
let slots = [], preview = null;
const ARROW = pixCanvas(22, 15, g => { g.fillStyle = '#8b8b8b'; g.fillRect(0, 5, 14, 5); for (let i = 0; i < 8; i++) g.fillRect(14 + i, i, 1, 15 - i * 2); });
// faint silhouettes for empty armor and off-hand slots
const SIL = [...SLOT_NAMES.map(n => ARMOR_T[n]), T_SHIELD].map(t => pixCanvas(16, 16, PXA(t, new Proxy({}, { get: (o, k) => k === '.' || k === 'o' ? null : '#a3a3a3' }))));

function layout() {
  const raw = Math.min((vw() - 24) / (W_BOOK + 4 + W_PANEL), (vh() - 12) / H_GUI);
  guiScale = clamp(Math.floor(raw * 4) / 4, .75, 4); root.style.setProperty('--s', guiScale);
}
function slotEl(x, y, ref, big) {
  const d = mkEl('div', 'is' + (big ? ' big' : ''), panel); d.style.left = x + 'px'; d.style.top = y + 'px';
  const c = mkEl('canvas', '', d); c.width = c.height = 32; const b = mkEl('b', '', d); const bar = mkEl('i', '', d); const u = mkEl('u', '', bar);
  const S = { d, c, g: c.getContext('2d'), b, bar, u, ref }; slots.push(S); hookSlot(S); return S;
}
const label = (txt, x, y) => { const l = mkEl('div', 'ilb', panel, txt); l.style.left = x + 'px'; l.style.top = y + 'px'; return l; };
function buildPanel() {
  panel.innerHTML = ''; slots = []; preview = null;
  if (mode === 'inv') {
    SLOT_NAMES.forEach((n, k) => slotEl(7, 7 + k * 18, { arr: bag.armor, i: k, kind: 'armor', sil: SIL[k] }));
    const pv = mkEl('div', 'ipv', panel); const pc = mkEl('canvas', '', pv); pc.width = 16; pc.height = 32; preview = pc.getContext('2d');
    slotEl(76, 61, { arr: bag.off, i: 0, kind: 'off', sil: SIL[4] });
    label('Crafting', 97, 6);
    for (let k = 0; k < 4; k++) slotEl(97 + (k % 2) * 18, 17 + (k >> 1) * 18, { arr: grid, i: k, kind: 'grid' });
    const ar = mkEl('canvas', 'iar', panel); ar.width = 22; ar.height = 15; ar.getContext('2d').drawImage(ARROW, 0, 0); ar.style.left = '134px'; ar.style.top = '28px';
    slotEl(153, 27, { kind: 'result' });
  } else {
    label('Crafting', 28, 6);
    for (let k = 0; k < 9; k++) slotEl(29 + (k % 3) * 18, 16 + Math.floor(k / 3) * 18, { arr: grid, i: k, kind: 'grid' });
    const ar = mkEl('canvas', 'iar', panel); ar.width = 22; ar.height = 15; ar.getContext('2d').drawImage(ARROW, 0, 0); ar.style.left = '89px'; ar.style.top = '35px';
    slotEl(119, 30, { kind: 'result' }, true);
    label('Inventory', 8, 73);
  }
  for (let k = 0; k < 27; k++) slotEl(7 + (k % 9) * 18, 83 + Math.floor(k / 9) * 18, { arr: bag.main, i: 9 + k, kind: 'main' });
  for (let k = 0; k < 9; k++) slotEl(7 + k * 18, 141, { arr: bag.main, i: k, kind: 'main' });
  if (nearBench) {                                      // switch between the equipment view and the workbench grid
    const b = mkEl('div', 'ibtn', panel); b.style.left = '155px'; b.style.top = '5px'; b.title = mode === 'inv' ? 'Workbench' : 'Equipment';
    const c = mkEl('canvas', '', b); c.width = c.height = 32; c.getContext('2d').drawImage(icon32(mode === 'inv' ? 'workbench' : 'iron_chestplate'), 0, 0);
    b.addEventListener('pointerdown', e => { e.stopPropagation(); setMode(mode === 'inv' ? 'table' : 'inv'); });
  }
}
function setMode(m) { returnGrid(); mode = m; gridN = m === 'table' ? 9 : 4; selRecipe = null; uiTick(); buildPanel(); buildBook(); render(); }

// recipe book: tap a recipe to move its ingredients into the grid (again to add another set, shift / long-press for as many as fit)
const bookHead = mkEl('div', '', book), bookList = mkEl('div', 'ibl', book), bookInner = mkEl('div', '', bookList);
{ const t = mkEl('div', 'ilb', bookHead, 'Recipes'); t.style.left = '6px'; t.style.top = '7px'; }
const filterBtn = mkEl('div', 'ibtn wide', bookHead, 'All'); filterBtn.style.left = '48px'; filterBtn.style.top = '5px';
filterBtn.addEventListener('pointerdown', e => { e.stopPropagation(); onlyCraftable = !onlyCraftable; filterBtn.textContent = onlyCraftable ? 'Can craft' : 'All'; uiTick(); buildBook(); });
const closeBtn = mkEl('div', 'ibtn', bookHead, 'X'); closeBtn.style.left = '113px'; closeBtn.style.top = '3px'; closeBtn.title = 'Close';
closeBtn.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); closeInv(false); });
let rows = [];
function stationOk(r) { return !r.station || (r.station === WB ? nearBench : nearStation(r.station)); }
function haveFor(k) { let n = count(k); for (let i = 0; i < gridN; i++) if (grid[i] && matches(grid[i].id, k)) n += grid[i].n; return n; }
const canMake = r => Object.keys(r.needs).every(k => haveFor(k) >= r.needs[k]);
const fits = r => Object.keys(r.needs).length <= gridN;
function buildBook() {
  bookInner.innerHTML = '';
  const rank = r => !stationOk(r) || !fits(r) ? 2 : canMake(r) ? 0 : 1;
  const list = RECIPES.map((r, i) => ({ r, i, k: rank(r) })).filter(o => !onlyCraftable || o.k === 0).sort((a, b) => a.k - b.k || a.i - b.i);
  rows = list.map(({ r }) => {
    const d = mkEl('div', 'ir', bookInner); const c = mkEl('canvas', '', d); c.width = c.height = 32; c.getContext('2d').drawImage(icon32(r.out), 0, 0);
    mkEl('div', 'irn', d, (r.n > 1 ? r.n + ' ' : '') + (ITEMS[r.out] ? ITEMS[r.out].name : r.out));
    const q = mkEl('div', 'irq', d), parts = [];
    for (const k in r.needs) { const sp = mkEl('span', '', q); const ic = mkEl('canvas', '', sp); ic.width = ic.height = 16; ic.getContext('2d').drawImage(icon16(ITEMS[k] ? k : tagIcon(k)), 0, 0);
      sp.appendChild(document.createTextNode(r.needs[k])); parts.push([k, sp]); }
    if (r.station) { const s = mkEl('canvas', 'irs', d); s.width = s.height = 32; s.getContext('2d').drawImage(icon32(r.station === WB ? 'workbench' : (STATIONS[r.station] && STATIONS[r.station].icon) || 'workbench'), 0, 0); }
    return { d, r, parts };
  });
  updateBook();
}
const tagIcon = k => Object.keys(ITEMS).find(id => matches(id, k)) || k;
function updateBook() {
  for (const { d, r, parts } of rows) {
    const far = !stationOk(r) || !fits(r); d.classList.toggle('far', far); d.classList.toggle('no', !far && !canMake(r));
    for (const [k, sp] of parts) sp.classList.toggle('miss', haveFor(k) < r.needs[k]);
  }
}
// scroll the list by dragging (touch or mouse) or with the wheel; a short press is a tap on the row
let bookDrag = null;
bookList.addEventListener('pointerdown', e => { e.stopPropagation(); const q = tpt(e); bookDrag = { y: q.y, top: bookList.scrollTop, moved: 0, row: e.target.closest('.ir'), id: e.pointerId }; });
root.addEventListener('pointermove', e => {
  const q = tpt(e); mx = q.x; my = q.y; placeFloat();
  if (bookDrag && e.pointerId === bookDrag.id) { const dy = q.y - bookDrag.y; bookDrag.moved = Math.max(bookDrag.moved, Math.abs(dy)); if (bookDrag.moved > 5) bookList.scrollTop = bookDrag.top - dy / guiScale; }
});
addEventListener('pointerup', e => {
  if (!bookDrag || e.pointerId !== bookDrag.id) return; const b = bookDrag; bookDrag = null;
  if (b.moved <= 5 && b.row && isOpen) { const row = rows.find(o => o.d === b.row); if (row) fillRecipe(row.r, e.shiftKey); }
});
bookList.addEventListener('wheel', e => { bookList.scrollTop += e.deltaY / guiScale; e.preventDefault(); }, { passive: false });
bookList.addEventListener('pointerover', e => { const d = e.target.closest('.ir'); if (e.pointerType === 'mouse' && d) { const row = rows.find(o => o.d === d); if (row) showTip(recipeTip(row.r)); } });
bookList.addEventListener('pointerout', e => { if (e.pointerType === 'mouse') hideTip(); });

// ---- crafting logic
function gridTotals() { const t = {}; for (let i = 0; i < gridN; i++) { const s = grid[i]; if (s) t[s.id] = (t[s.id] || 0) + s.n; } return t; }
function avail(r, tot, k) { let a = 0; for (const id in tot) if (matches(id, k)) a += tot[id]; return a; }
function satisfies(r, tot, exact) {
  for (const id in tot) if (!Object.keys(r.needs).some(k => matches(id, k))) return false;
  for (const k in r.needs) { const a = avail(r, tot, k); if (exact ? a !== r.needs[k] : a < r.needs[k]) return false; }
  return true;
}
const recipeSize = r => Object.values(r.needs).reduce((a, b) => a + b, 0);
function currentRecipe() {
  const tot = gridTotals(); if (!Object.keys(tot).length) return null;
  const ok = RECIPES.filter(r => stationOk(r) && satisfies(r, tot)); if (!ok.length) return null;
  if (selRecipe && ok.includes(selRecipe)) return selRecipe;
  return ok.find(r => satisfies(r, tot, true)) || ok.reduce((a, b) => recipeSize(b) < recipeSize(a) ? b : a);
}
function consumeGrid(r) {
  for (const k in r.needs) { let need = r.needs[k];
    for (let i = 0; i < gridN && need; i++) { const s = grid[i]; if (!s || !matches(s.id, k)) continue; const t = Math.min(need, s.n); s.n -= t; need -= t; if (!s.n) grid[i] = null; } }
}
function resultStack() { const r = currentRecipe(); return r ? mk(r.out, r.n) : null; }
// take the crafted item: 'cursor' (click), 'one' (tap: straight into the inventory) or 'all' (shift-click / long-press)
function takeResult(how) {
  let made = 0;
  for (let guard = 0; guard < 64; guard++) {
    const r = currentRecipe(); if (!r) break;
    const out = mk(r.out, r.n);
    if (how === 'cursor') {
      if (carry && !(carry.id === out.id && maxStack(out.id) > 1 && carry.n + out.n <= maxStack(out.id))) break;
      consumeGrid(r); if (carry) carry.n += out.n; else carry = out; made++; break;
    }
    let room = 0; for (const s of bag.main) room += !s ? maxStack(out.id) : s.id === out.id && maxStack(out.id) > 1 ? maxStack(out.id) - s.n : 0;
    if (room < out.n) { if (!made) flashTip('<span class="rd">Inventory full</span>'); break; }
    consumeGrid(r); moveInto(out); made++;
    if (how === 'one') break;
  }
  if (made) { if (AC) { click(AC.currentTime, 900, .05); click(AC.currentTime + .05, 1300, .04); } emit('craft', made); changed(); }
}
function returnGrid() {
  for (let i = 0; i < 9; i++) if (grid[i]) { const left = moveInto(grid[i]); grid[i] = null;
    if (left && typeof World !== 'undefined' && World.spawnDrop) World.spawnDrop(left.id, left.n, PL().eye); }
}
// move one set of a recipe's ingredients from the inventory into the grid; false if something is missing or does not fit
function pullSet(r) {
  const plan = [];
  for (const k in r.needs) { let need = r.needs[k];
    for (const exact of [true, false]) for (let i = 0; i < 36 && need; i++) { const s = bag.main[i]; if (!s || (exact ? s.id !== k : s.id === k || !matches(s.id, k))) continue;
      const left = s.n - plan.filter(p => p[0] === i).reduce((a, p) => a + p[1], 0), t = Math.min(need, left); if (t > 0) { plan.push([i, t]); need -= t; } }
    if (need > 0) return false; }
  const sim = grid.map(s => s && { id: s.id, n: s.n });
  const place = (arr, id, n, real, src) => {
    const ms = maxStack(id);
    for (let g = 0; g < gridN && n; g++) if (arr[g] && arr[g].id === id && ms > 1) { const k = Math.min(n, ms - arr[g].n); arr[g].n += k; n -= k; }
    for (let g = 0; g < gridN && n; g++) if (!arr[g]) { const k = Math.min(n, ms); arr[g] = real ? { ...src, n: k } : { id, n: k }; n -= k; }
    return n;
  };
  for (const [i, t] of plan) if (place(sim, bag.main[i].id, t, false)) return false;
  for (const [i, t] of plan) { const s = bag.main[i]; place(grid, s.id, t, true, s); s.n -= t; if (!s.n) bag.main[i] = null; }
  return true;
}
function fillRecipe(r, all) {
  if (!stationOk(r)) { flashTip(recipeTip(r)); return; }
  if (selRecipe !== r || !satisfies(r, gridTotals())) returnGrid();
  selRecipe = r; let sets = 0;
  do { if (!pullSet(r)) break; sets++; } while (all && sets < 64);
  if (!sets) flashTip(recipeTip(r)); else uiTick();
  changed();
}

// ---- slot clicks (Minecraft rules)
function accepts(ref, st) {
  if (ref.kind === 'armor') { const a = ITEMS[st.id] && ITEMS[st.id].armor; return !!a && a.slot === SLOT_NAMES[ref.i]; }
  return ref.kind !== 'result';
}
function quickMove(ref) {
  const s = ref.arr[ref.i]; if (!s) return;
  ref.arr[ref.i] = null; let left = s;
  if (ref.kind === 'main') {
    const a = ITEMS[s.id] && ITEMS[s.id].armor, k = a ? SLOT_NAMES.indexOf(a.slot) : -1;
    if (k >= 0 && !bag.armor[k]) { bag.armor[k] = s; left = null; }
    else left = moveInto(s, ref.i < 9 ? STORAGE : HOTBAR_I);
  } else left = moveInto(s, [...STORAGE, ...HOTBAR_I]);
  if (left) ref.arr[ref.i] = left;
}
function act(S, right, shift, touch) {
  const ref = S.ref;
  if (ref.kind === 'result') { takeResult(touch ? (right ? 'all' : 'one') : shift ? 'all' : 'cursor'); return; }
  if (shift) { quickMove(ref); uiTick(); changed(); return; }
  const s = ref.arr[ref.i];
  if (!carry) {
    if (!s) return;
    if (right && s.n > 1) { const h = Math.ceil(s.n / 2); carry = { ...s, n: h }; s.n -= h; } else { carry = s; ref.arr[ref.i] = null; }
  } else {
    if (!accepts(ref, carry)) return;
    if (!s) { if (right && carry.n > 1) { ref.arr[ref.i] = { ...carry, n: 1 }; carry.n--; } else { ref.arr[ref.i] = carry; carry = null; } }
    else if (s.id === carry.id && maxStack(s.id) > 1) { const k = Math.min(maxStack(s.id) - s.n, right ? 1 : carry.n); s.n += k; carry.n -= k; if (!carry.n) carry = null; }
    else { ref.arr[ref.i] = carry; carry = s; }                   // swap
  }
  if (ref.kind === 'grid') selRecipe = selRecipe && currentRecipe() === selRecipe ? selRecipe : null;
  uiTick(); changed();
}
function hookSlot(S) {
  let timer = null, fired = false;
  S.d.addEventListener('pointerdown', e => {
    e.stopPropagation(); e.preventDefault(); const q = tpt(e); mx = q.x; my = q.y;
    if (e.pointerType === 'touch') { fired = false; clearTimeout(timer);
      timer = setTimeout(() => { timer = null; fired = true; act(S, true, false, true); if (navigator.vibrate) try { navigator.vibrate(12); } catch (err) { /* optional */ } placeFloat(); }, 380); }
    else { act(S, e.button === 2, e.shiftKey, false); showSlotTip(S); }
    placeFloat();
  });
  S.d.addEventListener('pointerup', e => {
    if (e.pointerType !== 'touch' || !timer) return;
    clearTimeout(timer); timer = null; if (fired) return;
    act(S, false, false, true); const st = slotStack(S); if (st && !carry) flashTip(itemTip(st)); else hideTip();
  });
  S.d.addEventListener('pointercancel', () => { clearTimeout(timer); timer = null; });
  S.d.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { hoverSlot = S; showSlotTip(S); } });
  S.d.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') { if (hoverSlot === S) hoverSlot = null; hideTip(); } });
}
const slotStack = S => S.ref.kind === 'result' ? resultStack() : S.ref.arr[S.ref.i];
function showSlotTip(S) { const st = slotStack(S); if (st && !carry) showTip(itemTip(st)); else hideTip(); }

// ---- tooltips
const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = n => Number.isInteger(n) ? String(n) : n.toFixed(1);
function itemTip(st) {
  const it = ITEMS[st.id]; if (!it) return esc(st.id);
  const L = [`<div class="tn" style="color:${RARITY[it.rarity] || '#fff'}">${esc(it.name)}</div>`];
  if (it.weapon) L.push(`<div class="bl">Damage: ${fmt(it.weapon.dmg)}</div>`, `<div>Attack speed: ${fmt(it.weapon.speed)} s</div>`, `<div>Stamina: ${fmt(it.weapon.stamina)} per swing</div>`);
  if (it.tool) L.push(`<div>${it.tool.type[0].toUpperCase() + it.tool.type.slice(1)}, tier ${it.tool.power}</div>`);
  if (it.armor) L.push(`<div class="bl">+${it.armor.armor} Armor</div>`, `<div>Slot: ${it.armor.slot}</div>`);
  if (it.shield) L.push(`<div class="bl">Block power: ${fmt(it.shield.block)}</div>`, `<div>Parry bonus: ${fmt(it.shield.parry)}x</div>`);
  if (it.food) L.push(`<div>Food: +${it.food.heal} health, +${it.food.stamina} stamina, ${Math.round(it.food.secs / 60)} min</div>`, `<div>Hunger: +${it.food.hunger}</div>`);
  if (it.durability) L.push(`<div>Durability: ${Math.max(0, Math.ceil(st.dur ?? it.durability))} / ${it.durability}</div>`);
  L.push(`<div>Weight: ${it.weight.toFixed(1)}</div>`);
  if (it.desc) L.push(`<div class="ds">${esc(it.desc)}</div>`);
  return L.join('');
}
function recipeTip(r) {
  const it = ITEMS[r.out] || { name: r.out, rarity: 'common' };
  const L = [`<div class="tn" style="color:${RARITY[it.rarity] || '#fff'}">${esc((r.n > 1 ? r.n + ' x ' : '') + it.name)}</div>`];
  for (const k in r.needs) { const h = haveFor(k), name = ITEMS[k] ? ITEMS[k].name : k[0].toUpperCase() + k.slice(1);
    L.push(`<div class="${h < r.needs[k] ? 'rd' : ''}">${esc(name)}: ${Math.min(h, r.needs[k])} / ${r.needs[k]}</div>`); }
  if (r.station && !stationOk(r)) L.push(`<div class="rd">Needs a ${esc(STATIONS[r.station] ? STATIONS[r.station].name : r.station)} nearby</div>`);
  else if (!fits(r)) L.push(`<div class="rd">Needs a bigger crafting grid</div>`);
  if (it.weapon) L.push(`<div class="bl">Damage: ${fmt(it.weapon.dmg)}</div>`);
  if (it.armor) L.push(`<div class="bl">+${it.armor.armor} Armor</div>`);
  return L.join('');
}
function showTip(html) { tipEl.innerHTML = html; tipEl.hidden = false; tipT = 0; placeFloat(); }
function flashTip(html) { showTip(html); tipT = 2.6; }
function hideTip() { tipEl.hidden = true; tipT = 0; }
// carried stack and tooltip follow the pointer; positions are in page coordinates (tpt handles the rotated phone layout)
function placeFloat() {
  carryEl.hidden = !carry;
  if (carry) { carryEl.style.left = mx + 'px'; carryEl.style.top = my + 'px'; }
  if (!tipEl.hidden) {
    const w = tipEl.offsetWidth, h = tipEl.offsetHeight, off = 10 * guiScale;
    let x = mx + off, y = my - h - off * .4; if (x + w > vw() - 4) x = mx - off - w; if (y < 4) y = my + off;
    tipEl.style.left = clamp(x, 4, Math.max(4, vw() - w - 4)) + 'px'; tipEl.style.top = clamp(y, 4, Math.max(4, vh() - h - 4)) + 'px';
  }
}

// ---- drawing
function drawSlot(S) {
  const st = slotStack(S), g = S.g; g.clearRect(0, 0, 32, 32); S.c.classList.toggle('sil', !st && !!S.ref.sil);
  if (st) g.drawImage(icon32(st.id), 0, 0); else if (S.ref.sil) { g.imageSmoothingEnabled = false; g.drawImage(S.ref.sil, 0, 0, 32, 32); }
  S.b.textContent = st && st.n > 1 ? st.n : '';
  const max = st && ITEMS[st.id] && ITEMS[st.id].durability, show = !!(max && st.dur < max); S.bar.hidden = !show;
  if (show) { const f = Math.max(0, st.dur / max); S.u.style.width = Math.max(1, Math.round(13 * f)) + 'px'; S.u.style.background = durColor(f); }
}
function drawPreview() {
  if (!preview) return; const d = DEFS[cur], g = preview; g.clearRect(0, 0, 16, 32);
  g.drawImage(pixCanvas(8, 8, gg => drawFace(gg, d)), 4, 0);
  g.fillStyle = d.top; g.fillRect(4, 8, 8, 12);
  for (const x of [0, 12]) { g.fillStyle = d.top; g.fillRect(x, 8, 4, d.sleeve); g.fillStyle = d.skin; g.fillRect(x, 8 + d.sleeve, 4, 12 - d.sleeve); }
  g.fillStyle = d.pants; g.fillRect(4, 20, 8, 12); g.fillStyle = shade(d.pants, -.2); g.fillRect(8, 20, 1, 10); g.fillStyle = d.shoes; g.fillRect(4, 30, 8, 2);
  const tint = k => { const s = bag.armor[k]; return s && ITEMS[s.id] && ITEMS[s.id].tint; };
  let c;
  if ((c = tint(0))) { g.fillStyle = c; g.fillRect(4, 0, 8, 2); g.fillRect(4, 2, 1, 4); g.fillRect(11, 2, 1, 4); g.fillStyle = shade(c, -.25); g.fillRect(4, 2, 8, 1); }
  if ((c = tint(1))) { g.fillStyle = c; g.fillRect(4, 8, 8, 11); g.fillRect(0, 8, 4, 4); g.fillRect(12, 8, 4, 4); g.fillStyle = shade(c, -.25); g.fillRect(4, 18, 8, 1); g.fillRect(7, 9, 2, 6); }
  if ((c = tint(2))) { g.fillStyle = c; g.fillRect(4, 19, 8, 10); g.fillStyle = shade(c, -.25); g.fillRect(4, 19, 8, 1); g.fillRect(8, 21, 1, 8); }
  if ((c = tint(3))) { g.fillStyle = c; g.fillRect(4, 28, 8, 4); g.fillStyle = shade(c, -.25); g.fillRect(8, 28, 1, 4); }
}
function render() {
  for (const S of slots) drawSlot(S);
  drawPreview(); updateBook();
  carryEl.hidden = !carry;
  if (carry) { const g = carryCv.getContext('2d'); g.clearRect(0, 0, 32, 32); g.drawImage(icon32(carry.id), 0, 0); carryN.textContent = carry.n > 1 ? carry.n : ''; }
  placeFloat();
}

// ---- open / close
function openInv(forceMode) {
  if (state !== 'play' || isOpen) return;
  isOpen = true; state = 'inv'; mining = false; root.hidden = false;
  if (document.pointerLockElement) try { document.exitPointerLock(); } catch (e) { /* already unlocked */ }
  nearBench = nearStation(WB); mode = forceMode || (nearBench ? 'table' : 'inv'); gridN = mode === 'table' ? 9 : 4; selRecipe = null;
  layout(); buildPanel(); buildBook(); render(); hideTip(); bookList.scrollTop = 0;
  if (AC) { const t = AC.currentTime; click(t, 700, .04); }
}
function closeInv(relock) {
  if (!isOpen) return;
  if (carry) { const left = moveInto(carry); if (left && typeof World !== 'undefined' && World.spawnDrop) World.spawnDrop(left.id, left.n, PL().eye); carry = null; }
  returnGrid(); isOpen = false; root.hidden = true; hideTip(); hoverSlot = null; selRecipe = null;
  if (state === 'inv') state = 'play';
  // keydown E counts as a user gesture, so the mouse can be captured again right away (Escape does not: click to resume)
  if (relock && !TOUCH && !noLock) try { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) { /* click the world to capture */ }
  canvas.focus(); changed();
}
root.addEventListener('pointerdown', e => { if (e.target === root && carry) { const left = moveInto(carry); carry = left; changed(); } });
root.addEventListener('contextmenu', e => e.preventDefault());
// a pointer-lock request that resolves after the screen opened would hide the cursor: release it again
document.addEventListener('pointerlockchange', () => { if (isOpen && document.pointerLockElement) try { document.exitPointerLock(); } catch (e) { /* ignore */ } });
addEventListener('resize', () => { if (isOpen) { layout(); placeFloat(); } });

// ---------------------------------------------------------------------
//  Hooks into the main game
// ---------------------------------------------------------------------
on('key', e => {
  if (state === 'inv') {
    if (e.code === 'KeyE' || e.code === 'Escape') closeInv(e.code === 'KeyE');
    else if (/^Digit[1-9]$/.test(e.code) && hoverSlot && hoverSlot.ref.arr) {     // Minecraft: hover a slot and press 1-9 to swap with the hotbar
      const k = +e.code.slice(5) - 1, ref = hoverSlot.ref, a = ref.arr[ref.i], b = bag.main[k];
      if ((!b || accepts(ref, b)) && !(ref.arr === bag.main && ref.i === k)) { ref.arr[ref.i] = b; bag.main[k] = a; uiTick(); changed(); showSlotTip(hoverSlot); }
    }
    return true;
  }
  if (state !== 'play') return false;
  if (e.code === 'KeyE') { openInv(); return true; }
  if (e.code === 'KeyF') { const a = bag.main[hotSel]; bag.main[hotSel] = bag.off[0]; bag.off[0] = a; uiTick(); changed(); return true; }
  return false;
});
// right-click / tap a placed workbench to open the 3x3 grid (sneak to place a block against it instead)
on('use', () => {
  if (state !== 'play' || PL().sneak) return false;
  const h = targetBlock(); if (!h || h.t !== WORKBENCH) return false;
  openInv('table'); return true;
});
on('start', () => { selectHot(bag.sel || 0); });
// desktop without pointer lock: holding the left button still mines (a quick click only breaks plants)
let hold = null;
canvas.addEventListener('pointerdown', e => { if (e.pointerType !== 'touch' && noLock && e.button === 0 && state === 'play') hold = { t0: performance.now(), x: e.clientX, y: e.clientY, on: false }; });
addEventListener('pointerup', e => { if (e.pointerType !== 'touch' && hold) { if (hold.on) mining = false; hold = null; } });
addEventListener('pointermove', e => { if (hold && !hold.on && Math.abs(e.clientX - hold.x) + Math.abs(e.clientY - hold.y) > 6) hold = null; });
on('tick', rawDt => {
  // crack overlay only while the main loop kept mining this frame
  if (mineFrame !== frameNo || state !== 'play') { mineKey = ''; crackMesh.visible = false; }
  frameNo++;
  if (hold && !hold.on && state === 'play' && performance.now() - hold.t0 > 220) { hold.on = true; mining = true; mineCd = 0; }
  // character switched: swap to that character's bag
  bags[bagCur].sel = hotSel;
  if (cur !== bagCur) { if (isOpen) closeInv(false); bagCur = cur; bag = bags[cur]; carry = null; save(); selectHot(bag.sel); lastHeldId = undefined; changed(); }
  // off-hand item on the left, raised to the middle while blocking
  syncOffhand();
  if (offMesh) {
    const P0 = PL(); offMesh.visible = viewMode === 0 && (state === 'play' || state === 'wheel' || state === 'pause') && !hudHidden;
    const blocking = typeof Combat !== 'undefined' && Combat.isBlocking && Combat.isBlocking();
    blockK = lerp(blockK, blocking ? 1 : 0, Math.min(1, rawDt * 14));
    const bob = Math.sin(P0.phase) * Math.min(P0.hspeed / 4.3, 1) * .03;
    offMesh.position.set(lerp(-.62, -.26, blockK) - bob, lerp(-.52, -.36, blockK) - Math.abs(bob), lerp(-1, -.8, blockK)); offMesh.rotation.set(lerp(.15, 0, blockK), lerp(-.35, .35, blockK), 0);
    offMesh.children.forEach(m => m.renderOrder = 50);
  }
  if (tipT > 0 && (tipT -= rawDt) <= 0) hideTip();
  if (dirty && (saveT += rawDt) > 1.5) save();
});

// ---------------------------------------------------------------------
//  Public API (see CONTRACT): other modules guard with typeof Inv !== 'undefined'
// ---------------------------------------------------------------------
Object.assign(Inv, {
  defineItem, addRecipe, add, remove, count,
  held, offhand: () => bag.off[0] || null,
  armor: () => bag.armor.reduce((a, s) => a + (s && ITEMS[s.id] && ITEMS[s.id].armor ? ITEMS[s.id].armor.armor : 0), 0),
  armorPieces: () => bag.armor.slice(),                  // [head, chest, legs, feet] stacks or null
  weapon: () => { const s = held(), w = s && ITEMS[s.id] && ITEMS[s.id].weapon; return w ? { id: s.id, ...w } : { id: null, dmg: 2, speed: .5, stamina: 4 }; },   // bare fist fallback
  shield: () => { const s = bag.off[0], sh = s && ITEMS[s.id] && ITEMS[s.id].shield; return sh ? { id: s.id, ...sh } : null; },
  damageHeld: (n = 1) => wearOut(bag.main, hotSel, n),
  damageOffhand: (n = 1) => wearOut(bag.off, 0, n),
  damageArmor: (n = 1) => { for (let k = 0; k < 4; k++) wearOut(bag.armor, k, n); },
  consumeHeld: (n = 1) => { const s = held(); if (!s || s.n < n) return false; s.n -= n; if (!s.n) bag.main[hotSel] = null; changed(); return true; },
  isOpen: () => isOpen, open: m => openInv(m), close: () => closeInv(!TOUCH), toggle: () => isOpen ? closeInv(!TOUCH) : openInv(),
  heldName: () => { const s = held(); return s && ITEMS[s.id] ? ITEMS[s.id].name : ''; },
  heldBlock: () => { const s = held(), it = s && ITEMS[s.id]; return it && it.block != null ? it.block : AIR; },
  heldModel: () => model(held(), false),
  breakTime, mine, onBreak, icon: icon32, icon16, nearStation,
  defineStation: (name, d) => { STATIONS[name] = d; },   // { name, block, r } or { name, test: () => bool, icon: itemId }
  itemForBlock: t => BI[t] || null,
  bag: () => bag, save, recipes: () => RECIPES.slice(),
  reset() { DEFS.forEach((d, i) => { bags[i] = starterBag(); }); bag = bags[cur]; bagCur = cur; carry = null; lastHeldId = undefined; save(); changed(); },   // New World: every character starts over
});
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load); else load();
changed();
})();
