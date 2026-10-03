"use strict";
// =====================================================================
//  Blocks & stations module (js/blocks.js)
//  - Furnace (fuel, smelting, XP, lit state), chest / large chest, bed (sleep, spawn point), torches on floors and walls
//  - Block light + sky light: flood fill (level 15/14 falling off by 1) baked into chunk vertex colours; a tiny shader
//    patch keeps valheim.js's day/night tint on the sky part only, so torches stay warm at night and caves are dark
//  - Building shapes: doors, ladders, slabs, stairs, fences (render + collision + step-up), falling sand and gravel
//  Block ids 64..75 are reserved here. Per-block state lives in META (same indexing as world).
//  Public: Stations, Light. Everything else stays inside the closure.
// =====================================================================
const Stations = {}, Light = {};
(() => {
const FURNACE = 64, FURNACE_LIT = 65, CHEST = 66, BED = 67, DOOR = 68, LADDER = 69, OAK_SLAB = 70, COBBLE_SLAB = 71,
  OAK_STAIRS = 72, COBBLE_STAIRS = 73, FENCE = 74, GRAVEL = 75;
const NCELL = WX * WY * WZ, IDX = (x, y, z) => (y * WZ + z) * WX + x;
const META = new Uint8Array(NCELL);
const gm = (x, y, z) => inb(x, y, z) ? META[IDX(x, y, z)] : 0;
const sm = (x, y, z, v) => { if (inb(x, y, z)) META[IDX(x, y, z)] = v; };
const DIR = [[-1, 0], [1, 0], [0, -1], [0, 1]];      // facing codes: 0 -x, 1 +x, 2 -z, 3 +z
const OPP = [1, 0, 3, 2], FACE_OF = [0, 1, 4, 5];      // facing -> FACES index
const dirOf = (dx, dz) => Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 1 : 0) : (dz > 0 ? 3 : 2);
const lookFacing = () => { const P = PL(); return dirOf(-Math.sin(P.yaw), -Math.cos(P.yaw)); };
const hasInv = () => typeof Inv !== 'undefined' && !!Inv.defineItem;
const hasWorld = () => typeof World !== 'undefined';
const rr = mulberry32(6464), rp = a => a[(rr() * a.length) | 0];

// ---------------------------------------------------------------------
//  Textures (16x16 tiles appended to the shared atlas)
// ---------------------------------------------------------------------
const firstTile = tileN;
const px = (g, c, x, y, w = 1, h = 1) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
const noise = (g, pal, x0 = 0, y0 = 0, w = 16, h = 16) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) px(g, rp(pal), x, y); };
const STN = ['#828282', '#7a7a7a', '#8c8c8c', '#747474', '#868686'], STN_D = ['#5e5e5e', '#575757', '#646464'];
const WOOD = ['#a0692b', '#9a6428', '#a8722f', '#94602a'], WOOD_D = '#4a2f12';
const furnaceFace = lit => g => {
  noise(g, STN); px(g, '#9a9a9a', 0, 0, 16, 1); px(g, '#565656', 0, 15, 16, 1); px(g, '#9a9a9a', 0, 0, 1, 16); px(g, '#565656', 15, 0, 1, 16);
  px(g, '#3a3a3a', 3, 3, 10, 1); px(g, '#4a4a4a', 3, 4, 10, 2);                       // top slot
  px(g, '#2a2a2a', 3, 8, 10, 6); px(g, '#5a5a5a', 2, 7, 12, 1); px(g, '#5a5a5a', 2, 14, 12, 1);
  if (lit) { for (let x = 4; x < 12; x++) { const h = 2 + ((rr() * 4) | 0); px(g, '#ff8a1c', x, 14 - h, 1, h); px(g, '#ffd04a', x, 14 - Math.max(1, h - 2), 1, Math.max(1, h - 2)); }
    px(g, '#fff2a8', 6, 12, 4, 2); px(g, '#ffb03a', 3, 4, 10, 1); }
  else { px(g, '#181818', 4, 11, 8, 3); for (let x = 4; x < 12; x += 2) px(g, '#454545', x, 9, 1, 5); }
};
tile('furnace_front', furnaceFace(false));
tile('furnace_front_lit', furnaceFace(true));
tile('furnace_side', g => { noise(g, STN); px(g, '#9a9a9a', 0, 0, 16, 1); px(g, '#565656', 0, 15, 16, 1); px(g, '#9a9a9a', 0, 0, 1, 16); px(g, '#565656', 15, 0, 1, 16); px(g, '#6a6a6a', 1, 4, 14, 1); });
tile('furnace_top', g => { noise(g, STN); px(g, '#5a5a5a', 0, 0, 16, 1); px(g, '#5a5a5a', 0, 15, 16, 1); px(g, '#5a5a5a', 0, 0, 1, 16); px(g, '#5a5a5a', 15, 0, 1, 16);
  noise(g, STN_D, 3, 3, 10, 10); px(g, '#9a9a9a', 3, 3, 10, 1); });
const chestBase = g => { noise(g, WOOD, 1, 2, 14, 13); px(g, WOOD_D, 0, 2, 16, 1); px(g, WOOD_D, 0, 15, 16, 1); px(g, WOOD_D, 0, 2, 1, 14); px(g, WOOD_D, 15, 2, 1, 14);
  px(g, WOOD_D, 0, 6, 16, 1); px(g, '#c08040', 1, 7, 14, 1); for (let y = 3; y < 15; y += 4) px(g, '#8a5622', 1, y + 2, 14, 1); };
tile('chest_side', chestBase);
tile('chest_front', g => { chestBase(g); px(g, '#2a2a2a', 6, 4, 4, 5); px(g, '#c8c8c8', 7, 5, 2, 3); px(g, '#9a9a9a', 7, 7, 2, 1); });
tile('chest_top', g => { noise(g, WOOD); px(g, WOOD_D, 0, 0, 16, 1); px(g, WOOD_D, 0, 15, 16, 1); px(g, WOOD_D, 0, 0, 1, 16); px(g, WOOD_D, 15, 0, 1, 16);
  for (let y = 3; y < 15; y += 4) px(g, '#8a5622', 1, y, 14, 1); });
const RED = ['#a52222', '#9c1f1f', '#b12828'];
tile('bed_head_top', g => { noise(g, RED); px(g, '#e8e8e8', 2, 1, 12, 5); px(g, '#c8c8c8', 2, 5, 12, 1); px(g, '#ffffff', 3, 1, 10, 1); px(g, '#7a1616', 0, 7, 16, 1); px(g, '#7a1616', 0, 0, 1, 16); px(g, '#7a1616', 15, 0, 1, 16); });
tile('bed_foot_top', g => { noise(g, RED); px(g, '#7a1616', 0, 0, 1, 16); px(g, '#7a1616', 15, 0, 1, 16); px(g, '#7a1616', 0, 15, 16, 1); px(g, '#c43232', 1, 3, 14, 1); });
tile('bed_side', g => { g.clearRect(0, 0, 16, 16); noise(g, RED, 0, 7, 16, 3); px(g, '#7a1616', 0, 9, 16, 1); noise(g, ['#8a5a2a', '#7e5226', '#94622e'], 0, 10, 16, 3);
  px(g, '#5a3a18', 0, 12, 16, 1); px(g, '#6e4a22', 0, 13, 3, 3); px(g, '#6e4a22', 13, 13, 3, 3); px(g, '#6e4a22', 3, 13, 10, 3); });
tile('bed_end', g => { g.clearRect(0, 0, 16, 16); noise(g, RED, 0, 7, 16, 3); px(g, '#7a1616', 0, 9, 16, 1); noise(g, ['#8a5a2a', '#7e5226', '#94622e'], 0, 10, 16, 6); px(g, '#5a3a18', 0, 12, 16, 1); });
const DOORW = ['#a2834f', '#9c7f4e', '#b08e59'], DOORD = '#6e5530';
tile('door_top', g => { noise(g, DOORW); px(g, DOORD, 0, 0, 16, 1); px(g, DOORD, 0, 0, 1, 16); px(g, DOORD, 15, 0, 1, 16);
  for (const x of [2, 9]) { px(g, '#3e2c14', x, 2, 5, 6); px(g, '#c7dce8', x + 1, 3, 3, 4); px(g, '#e8f4fa', x + 1, 3, 1, 2); }
  px(g, DOORD, 2, 10, 12, 1); px(g, DOORD, 2, 14, 12, 1); px(g, DOORD, 7, 10, 2, 5); });
tile('door_bottom', g => { noise(g, DOORW); px(g, DOORD, 0, 15, 16, 1); px(g, DOORD, 0, 0, 1, 16); px(g, DOORD, 15, 0, 1, 16);
  px(g, DOORD, 2, 1, 12, 1); px(g, DOORD, 2, 6, 12, 1); px(g, DOORD, 2, 8, 12, 1); px(g, DOORD, 2, 13, 12, 1); px(g, DOORD, 7, 1, 2, 13);
  px(g, '#3a3a3a', 12, 2, 2, 1); px(g, '#8a8a8a', 12, 1, 1, 1); });
tile('ladder', g => { g.clearRect(0, 0, 16, 16); for (const x of [2, 12]) { px(g, '#8a6a3a', x, 0, 2, 16); px(g, '#5e4426', x + 1, 0, 1, 16); }
  for (let y = 1; y < 16; y += 4) { px(g, '#a4844a', 4, y, 8, 2); px(g, '#6e5230', 4, y + 1, 8, 1); } });
tile('gravel', g => { noise(g, ['#857f7c', '#7a7472', '#908986', '#6e6866', '#9a9290']);
  for (let i = 0; i < 14; i++) { const x = (rr() * 15) | 0, y = (rr() * 15) | 0, c = rp(['#5a5452', '#a8a09c', '#6a5c50', '#b4aca8']); px(g, c, x, y, 2, 1); px(g, shade(c, -.2), x, y + 1, 2, 1); } });
{ const d = ag.getImageData(0, 0, 256, 256).data;             // average colours for break particles
  for (let i = firstTile; i < tileN; i++) { let r = 0, gg = 0, b = 0, n = 0; const ox = (i % 16) * 16, oy = Math.floor(i / 16) * 16;
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const k = ((oy + y) * 256 + ox + x) * 4; if (d[k + 3] < 128) continue; r += d[k]; gg += d[k + 1]; b += d[k + 2]; n++; }
    tileColor[i] = new THREE.Color(r / Math.max(1, n) / 255, gg / Math.max(1, n) / 255, b / Math.max(1, n) / 255); } }
atlasTex.needsUpdate = true;

// ---------------------------------------------------------------------
//  Block definitions and shapes (boxes in 0..1 block units)
// ---------------------------------------------------------------------
const T = TILE;
def(FURNACE, 'Furnace', [T.furnace_side, T.furnace_side, T.furnace_top, T.furnace_top, T.furnace_side, T.furnace_front], 'stone');
def(FURNACE_LIT, 'Furnace', [T.furnace_side, T.furnace_side, T.furnace_top, T.furnace_top, T.furnace_side, T.furnace_front_lit], 'stone');
def(CHEST, 'Chest', [T.chest_side, T.chest_side, T.chest_top, T.chest_top, T.chest_side, T.chest_front], 'wood', { opaque: false });
def(BED, 'Bed', [T.bed_side, T.bed_side, T.planks, T.bed_foot_top, T.bed_end, T.bed_end], 'wool', { opaque: false });
def(DOOR, 'Oak Door', Array(6).fill(T.door_bottom), 'wood', { opaque: false });
def(LADDER, 'Ladder', Array(6).fill(T.ladder), 'wood', { opaque: false });
def(OAK_SLAB, 'Oak Slab', cube(T.planks), 'wood', { opaque: false });
def(COBBLE_SLAB, 'Cobblestone Slab', cube(T.cobble), 'stone', { opaque: false });
def(OAK_STAIRS, 'Oak Stairs', cube(T.planks), 'wood', { opaque: false });
def(COBBLE_STAIRS, 'Cobblestone Stairs', cube(T.cobble), 'stone', { opaque: false });
def(FENCE, 'Oak Fence', cube(T.planks), 'wood', { opaque: false });
def(GRAVEL, 'Gravel', cube(T.gravel), 'sand');
BLOCK[FURNACE].orient = BLOCK[FURNACE_LIT].orient = true;
BLOCK[FURNACE_LIT].emit = 13; BLOCK[TORCH].emit = 14;
const s16 = v => v / 16;
// a box filling the cell except along facing f, where it spans a0..a1 measured from the side opposite to f
function along(f, a0, a1, y0 = 0, y1 = 1) {
  switch (f) { case 1: return [a0, y0, 0, a1, y1, 1]; case 0: return [1 - a1, y0, 0, 1 - a0, y1, 1];
    case 3: return [0, y0, a0, 1, y1, a1]; default: return [0, y0, 1 - a1, 1, y1, 1 - a0]; }
}
const isFenceLink = (x, y, z) => { const t = get(x, y, z); return t === FENCE || (BLOCK[t].opaque && BLOCK[t].solid); };
const SHAPES = {
  [OAK_SLAB]: (x, y, z, m) => [m & 1 ? [0, .5, 0, 1, 1, 1] : [0, 0, 0, 1, .5, 1]],
  [OAK_STAIRS]: (x, y, z, m) => m & 4 ? [[0, .5, 0, 1, 1, 1], along(m & 3, .5, 1, 0, .5)] : [[0, 0, 0, 1, .5, 1], along(m & 3, .5, 1, .5, 1)],
  [DOOR]: (x, y, z, m) => { const f = m & 3; if (!(m & 4)) return [along(f, 0, s16(3))];
    const side = (m & 16) ? [3, 2, 0, 1][f] : [2, 3, 1, 0][f]; return [along(side, s16(13), 1)]; },
  [LADDER]: (x, y, z, m, col) => [along(m & 3, 0, col ? s16(3) : s16(1))],
  [CHEST]: () => [[s16(1), 0, s16(1), s16(15), s16(14), s16(15)]],
  [BED]: () => [[0, 0, 0, 1, s16(9), 1]],
  [FENCE]: (x, y, z, m, col) => {
    const h = col ? 1.5 : 1, out = [[s16(6), 0, s16(6), s16(10), h, s16(10)]];
    DIR.forEach(([dx, dz], f) => { if (!isFenceLink(x + dx, y, z + dz)) return;
      const a = (lo, hi) => { const b = along(f, 0, 1, lo, hi); if (dx) { b[2] = s16(7); b[5] = s16(9); } else { b[0] = s16(7); b[3] = s16(9); }
        if (dx > 0) b[0] = s16(10); if (dx < 0) b[3] = s16(6); if (dz > 0) b[2] = s16(10); if (dz < 0) b[5] = s16(6); return b; };
      if (col) { const b = a(0, 1.5); if (dx) { b[2] = s16(6); b[5] = s16(10); } else { b[0] = s16(6); b[3] = s16(10); } out.push(b); }
      else out.push(a(s16(12), s16(15)), a(s16(6), s16(9))); });
    return out;
  },
};
SHAPES[COBBLE_SLAB] = SHAPES[OAK_SLAB]; SHAPES[COBBLE_STAIRS] = SHAPES[OAK_STAIRS];
for (const t in SHAPES) BLOCK[t].shape = SHAPES[t];
for (const t of [OAK_SLAB, COBBLE_SLAB, OAK_STAIRS, COBBLE_STAIRS]) BLOCK[t].lb = true;     // slabs and stairs stop light
const SLAB_FULL = { [OAK_SLAB]: PLANKS, [COBBLE_SLAB]: COBBLE };
const isFull = t => { const b = BLOCK[t]; return !!b && b.solid && b.opaque && !b.shape; };
const passable = t => t === AIR || t === WATER || (BLOCK[t].kind === 'cross' && t !== TORCH);

// ---------------------------------------------------------------------
//  Items, recipes, smelting
// ---------------------------------------------------------------------
const art = draw => g => { g.imageSmoothingEnabled = false; draw(g); };
const tileIcon = name => art(g => { const i = TILE[name]; g.drawImage(ATLAS, (i % 16) * 16, Math.floor(i / 16) * 16, 16, 16, 0, 0, 16, 16); });
const ICONS = {
  door: art(g => { const i = TILE.door_top, j = TILE.door_bottom; g.drawImage(ATLAS, (i % 16) * 16, Math.floor(i / 16) * 16, 16, 16, 4, 0, 8, 8);
    g.drawImage(ATLAS, (j % 16) * 16, Math.floor(j / 16) * 16, 16, 16, 4, 8, 8, 8); }),
  bed: art(g => { px(g, '#6e4a22', 1, 11, 2, 3); px(g, '#6e4a22', 13, 11, 2, 3); px(g, '#8a5a2a', 1, 9, 14, 2); px(g, '#a52222', 4, 6, 11, 3); px(g, '#c43232', 4, 6, 11, 1);
    px(g, '#e8e8e8', 1, 6, 3, 3); px(g, '#ffffff', 1, 6, 3, 1); px(g, '#7a1616', 4, 8, 11, 1); }),
  charcoal: art(g => { const P2 = [[5, 3, 6, 1], [4, 4, 8, 1], [3, 5, 10, 5], [4, 10, 9, 2], [5, 12, 6, 1]]; for (const [x, y, w, h] of P2) px(g, '#3a3028', x, y, w, h);
    px(g, '#5a4a3a', 5, 5, 3, 2); px(g, '#4a3e32', 9, 7, 2, 2); px(g, '#1e1814', 4, 11, 8, 1); px(g, '#1e1814', 12, 6, 1, 4); }),
};
const SMELT = {}, FUEL = { coal: 80, charcoal: 80, oak_log: 15, wood: 15, oak_planks: 15, stick: 5, workbench: 15, chest: 15, oak_slab: 7.5, oak_stairs: 15,
  oak_fence: 15, ladder: 15, oak_door: 10, bed: 15, resin: 20, wood_club: 10, wooden_sword: 10, wooden_pickaxe: 10, wooden_axe: 10, wooden_shovel: 10, wood_shield: 15 };
function addSmelt(input, output, secs = 10, xp = .1) { SMELT[input] = { out: output, secs: secs || 10, xp }; }
if (hasInv()) {
  const bi = (id, block, o = {}) => Inv.defineItem({ id, name: BLOCK[block].name, kind: 'block', block, ...o });
  bi('furnace', FURNACE, { kind: 'station', weight: 6, desc: 'Smelts ores and cooks food. Burns coal, charcoal or wood.' });
  bi('chest', CHEST, { kind: 'station', weight: 3, desc: 'Holds 27 stacks. Put two side by side for a large chest.' });
  bi('bed', BED, { kind: 'station', stack: 1, weight: 4, icon: ICONS.bed, desc: 'Sleep through the night. Sets your spawn point.' });
  bi('oak_door', DOOR, { icon: ICONS.door, weight: 2 });
  bi('ladder', LADDER, { icon: tileIcon('ladder'), weight: .5 });
  bi('oak_slab', OAK_SLAB, { weight: 1 }); bi('cobblestone_slab', COBBLE_SLAB, { weight: 1 });
  bi('oak_stairs', OAK_STAIRS, { weight: 1.5 }); bi('cobblestone_stairs', COBBLE_STAIRS, { weight: 1.5 });
  bi('oak_fence', FENCE, { weight: 1 }); bi('gravel', GRAVEL, { weight: 1.5, desc: 'Falls when nothing holds it up. Sometimes hides flint.' });
  Inv.defineItem({ id: 'charcoal', name: 'Charcoal', kind: 'material', icon: ICONS.charcoal, tags: ['coal'], weight: .5, desc: 'Burns like coal. Counts as coal in recipes.' });
  const WB = 'workbench';
  [{ out: 'furnace', needs: { cobblestone: 8 }, station: WB }, { out: 'chest', needs: { oak_planks: 8 }, station: WB },
   { out: 'bed', needs: { oak_planks: 3, deer_hide: 3 }, station: WB }, { out: 'oak_door', n: 3, needs: { oak_planks: 6 }, station: WB },
   { out: 'ladder', n: 3, needs: { stick: 7 }, station: WB }, { out: 'oak_slab', n: 6, needs: { oak_planks: 3 }, station: WB },
   { out: 'cobblestone_slab', n: 6, needs: { cobblestone: 3 }, station: WB }, { out: 'oak_stairs', n: 4, needs: { oak_planks: 6 }, station: WB },
   { out: 'cobblestone_stairs', n: 4, needs: { cobblestone: 6 }, station: WB }, { out: 'oak_fence', n: 3, needs: { oak_planks: 4, stick: 2 }, station: WB },
  ].forEach(r => Inv.addRecipe(r));
  if (Inv.defineStation) Inv.defineStation('furnace', { name: 'Furnace', test: () => isNear('furnace'), icon: 'furnace' });
}
addSmelt('raw_iron', 'iron_ingot', 10, .7); addSmelt('iron_ore', 'iron_ingot', 10, .7); addSmelt('sand', 'glass', 10, .1);
addSmelt('raw_meat', 'cooked_meat', 10, .35); addSmelt('cobblestone', 'stone', 10, .1); addSmelt('oak_log', 'charcoal', 10, .15); addSmelt('wood', 'charcoal', 10, .15);
// meats other modules may add (Minecraft names); checked when the game starts so later modules are included
const MEATS = [['beef', 'cooked_beef'], ['raw_beef', 'cooked_beef'], ['porkchop', 'cooked_porkchop'], ['raw_porkchop', 'cooked_porkchop'], ['mutton', 'cooked_mutton'],
  ['raw_mutton', 'cooked_mutton'], ['chicken', 'cooked_chicken'], ['raw_chicken', 'cooked_chicken'], ['cod', 'cooked_cod'], ['raw_cod', 'cooked_cod'], ['rabbit', 'cooked_rabbit'],
  ['raw_rabbit', 'cooked_rabbit'], ['potato', 'baked_potato'], ['clay_ball', 'brick'], ['raw_gold', 'gold_ingot']];
on('start', () => {
  if (typeof ITEMS === 'undefined') return;
  for (const [a, b] of MEATS) if (ITEMS[a] && ITEMS[b] && !SMELT[a]) addSmelt(a, b, 10, .35);
  if (hasInv() && !bedWool) for (const w of ['white_wool', 'wool']) if (ITEMS[w]) { bedWool = true; Inv.addRecipe({ out: 'bed', needs: { oak_planks: 3, [w]: 3 }, station: 'workbench' }); break; }
});
let bedWool = false;

// ---------------------------------------------------------------------
//  Lighting: sky light (15 straight down from the sky) and block light (torch 14, lit furnace 13), 1 less per step.
//  Full flood fill once at load; afterwards only a 33x33 column box around each edit is recomputed.
// ---------------------------------------------------------------------
const SKY = new Uint8Array(NCELL), BL = new Uint8Array(NCELL);
const TR = new Uint8Array(256), EM = new Uint8Array(256), STOP = new Uint8Array(256);
function tables() {
  for (let t = 0; t < 256; t++) { const b = BLOCK[t]; TR[t] = !b ? 1 : (b.opaque || b.lb) ? 0 : 1; EM[t] = b && b.emit || 0;
    STOP[t] = !TR[t] || t === LEAVES || t === WATER ? 1 : 0; }
}
const QN = 1 << 21, Q = new Int32Array(QN), WXZ = WX * WZ;
function flood(L, head, tail) {
  while (head !== tail) {
    const i = Q[head]; head = (head + 1) & (QN - 1); const v = L[i] - 1; if (v <= 0) continue;
    const x = i % WX, z = ((i / WX) | 0) % WZ, y = (i / WXZ) | 0;
    if (x > 0) { const j = i - 1; if (TR[world[j]] && L[j] < v) { L[j] = v; Q[tail] = j; tail = (tail + 1) & (QN - 1); } }
    if (x < WX - 1) { const j = i + 1; if (TR[world[j]] && L[j] < v) { L[j] = v; Q[tail] = j; tail = (tail + 1) & (QN - 1); } }
    if (z > 0) { const j = i - WX; if (TR[world[j]] && L[j] < v) { L[j] = v; Q[tail] = j; tail = (tail + 1) & (QN - 1); } }
    if (z < WZ - 1) { const j = i + WX; if (TR[world[j]] && L[j] < v) { L[j] = v; Q[tail] = j; tail = (tail + 1) & (QN - 1); } }
    if (y > 0) { const j = i - WXZ; if (TR[world[j]] && L[j] < v) { L[j] = v; Q[tail] = j; tail = (tail + 1) & (QN - 1); } }
    if (y < WY - 1) { const j = i + WXZ; if (TR[world[j]] && L[j] < v) { L[j] = v; Q[tail] = j; tail = (tail + 1) & (QN - 1); } }
  }
}
const lights = new Set();          // cells holding torches / lit furnaces (for particles and crackle)
const chunkDirty = new Uint8Array(NCX * NCZ);
function markCell(x, z) { for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { const cx = Math.floor((x + dx) / CS), cz = Math.floor((z + dz) / CS);
  if (cx >= 0 && cz >= 0 && cx < NCX && cz < NCZ) chunkDirty[cz * NCX + cx] = 1; } }
let oldS = new Uint8Array(0), oldB = new Uint8Array(0);
// recompute light in columns x0..x1, z0..z1 (all heights); with diff, marks the chunks whose light changed
function relight(x0, x1, z0, z1, diff) {
  tables();
  x0 = Math.max(0, x0); z0 = Math.max(0, z0); x1 = Math.min(WX - 1, x1); z1 = Math.min(WZ - 1, z1);
  const w = x1 - x0 + 1, d = z1 - z0 + 1, n = w * d * WY;
  if (diff) { if (oldS.length < n) { oldS = new Uint8Array(n); oldB = new Uint8Array(n); }
    let k = 0; for (let y = 0; y < WY; y++) for (let z = z0; z <= z1; z++) { const r = (y * WZ + z) * WX; for (let x = x0; x <= x1; x++, k++) { oldS[k] = SKY[r + x]; oldB[k] = BL[r + x]; } } }
  for (let y = 0; y < WY; y++) for (let z = z0; z <= z1; z++) { const r = (y * WZ + z) * WX + x0; SKY.fill(0, r, r + w); BL.fill(0, r, r + w); }
  for (const i of [...lights]) { const x = i % WX, z = ((i / WX) | 0) % WZ; if (x >= x0 && x <= x1 && z >= z0 && z <= z1) lights.delete(i); }
  for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) for (let y = WY - 1; y >= 0; y--) { const i = (y * WZ + z) * WX + x; if (STOP[world[i]]) break; SKY[i] = 15; }
  let tS = 0, tB = 0;
  const pushS = i => { Q[tS] = i; tS = (tS + 1) & (QN - 1); };
  const bq = [];
  for (let y = 0; y < WY; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
    const i = (y * WZ + z) * WX + x, t = world[i];
    if (EM[t]) { BL[i] = EM[t]; bq.push(i); lights.add(i); }
    if (SKY[i] === 15) {        // only sky cells next to a darker transmitting cell need to spread
      if ((x > 0 && SKY[i - 1] < 14 && TR[world[i - 1]]) || (x < WX - 1 && SKY[i + 1] < 14 && TR[world[i + 1]]) || (z > 0 && SKY[i - WX] < 14 && TR[world[i - WX]]) ||
          (z < WZ - 1 && SKY[i + WX] < 14 && TR[world[i + WX]]) || (y > 0 && SKY[i - WXZ] < 14 && TR[world[i - WXZ]])) pushS(i);
    }
  }
  // light flowing in from just outside the box
  const ring = (x, z) => { if (x < 0 || z < 0 || x >= WX || z >= WZ) return; for (let y = 0; y < WY; y++) { const i = (y * WZ + z) * WX + x; if (SKY[i] > 1) pushS(i); if (BL[i] > 1) bq.push(i); } };
  for (let z = z0; z <= z1; z++) { ring(x0 - 1, z); ring(x1 + 1, z); }
  for (let x = x0; x <= x1; x++) { ring(x, z0 - 1); ring(x, z1 + 1); }
  flood(SKY, 0, tS);
  for (const i of bq) { Q[tB] = i; tB = (tB + 1) & (QN - 1); } flood(BL, 0, tB);
  if (diff) { let k = 0; for (let y = 0; y < WY; y++) for (let z = z0; z <= z1; z++) { const r = (y * WZ + z) * WX; for (let x = x0; x <= x1; x++, k++) if (oldS[k] !== SKY[r + x] || oldB[k] !== BL[r + x]) markCell(x, z); } }
}
function rebuildDirty() { for (let k = 0; k < chunkDirty.length; k++) if (chunkDirty[k]) { chunkDirty[k] = 0; buildChunk(k % NCX, (k / NCX) | 0); } }
// brightness curve (Minecraft-like, a little brighter for phones)
const BR = Array.from({ length: 16 }, (_, l) => { const f = l / 15; return Math.max(.045, f / (3 - 2 * f) * .6 + f * .4); });
function cellBr(x, y, z) { if (y >= WY) return [1, 0]; if (!inb(x, y, z)) return [BR[0], 0]; const i = IDX(x, y, z); return [BR[SKY[i]], BR[BL[i]]]; }
const trAt = (x, y, z) => !inb(x, y, z) ? y >= WY : !!TR[world[IDX(x, y, z)]];
// light for a face of a shaped block: the cell it looks into, else its own cell, else the brightest neighbour
function faceBr(x, y, z, f) {
  const n = FACES[f].n, ax = x + n[0], ay = y + n[1], az = z + n[2];
  if (trAt(ax, ay, az)) return cellBr(ax, ay, az);
  if (trAt(x, y, z)) return cellBr(x, y, z);
  let s = BR[0], b = 0; for (const m of FACES) if (trAt(x + m.n[0], y + m.n[1], z + m.n[2])) { const q = cellBr(x + m.n[0], y + m.n[1], z + m.n[2]); s = Math.max(s, q[0]); b = Math.max(b, q[1]); }
  return [s, b];
}

// ---------------------------------------------------------------------
//  Chunk meshing with light. Vertex colour = (ambient occlusion x face shade, sky brightness, block brightness);
//  the patched world materials decode it so only the sky part takes valheim.js's day/night tint.
// ---------------------------------------------------------------------
for (const mat of [opaqueMat, waterMat]) {
  mat.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <color_fragment>',
    'vec3 bcTex = diffuseColor.rgb / max(diffuse, vec3(.001));\n diffuseColor.rgb = bcTex * vColor.r * max(diffuse * vColor.g, vec3(1.2, 1.0, .72) * vColor.b);'); };
  mat.needsUpdate = true;
}
const TORCH_C = new THREE.Color(1.2, 1.0, .72);
function pq(A, P, UV, ti, C) {
  const base = A.pos.length / 3, tu = (ti % 16) / 16, tv = 1 - (Math.floor(ti / 16) + 1) / 16, e = .0006, sz = 1 / 16;
  for (let i = 0; i < 4; i++) { A.pos.push(P[i][0], P[i][1], P[i][2]); A.uv.push(tu + e + UV[i][0] * (sz - 2 * e), tv + e + UV[i][1] * (sz - 2 * e)); A.col.push(C[i][0], C[i][1], C[i][2]); }
  const k = i => C[i][0] * Math.max(C[i][1], C[i][2]);
  if (k(0) + k(3) > k(1) + k(2)) A.idx.push(base, base + 1, base + 3, base, base + 3, base + 2);
  else A.idx.push(base, base + 1, base + 2, base + 2, base + 1, base + 3);
}
const UVF = [(X, Y, Z) => [Z, Y], (X, Y, Z) => [1 - Z, Y], (X, Y, Z) => [X, 1 - Z], (X, Y, Z) => [1 - X, Z], (X, Y, Z) => [1 - X, Y], (X, Y, Z) => [X, Y]];
const rotUV = (uv, k) => { let [u, v] = uv; for (let i = 0; i < k; i++) [u, v] = [v, 1 - u]; return [u, v]; };
// one box (bx in block units). tiles(f) -> tile index. o: { iso, ox, oy, oz, rot (top uv quarter turns), xf (corner transform), uvr: {face: [du, dv]}, noCull }
function emitBox(A, x, y, z, bx, tiles, o = {}) {
  for (let f = 0; f < 6; f++) {
    const F = FACES[f], edge = [bx[0] <= 0, bx[3] >= 1, bx[1] <= 0, bx[4] >= 1, bx[2] <= 0, bx[5] >= 1][f];
    if (!o.iso && edge && !o.noCull) { const n = get(x + F.n[0], y + F.n[1], z + F.n[2]); if (BLOCK[n].opaque && y + F.n[1] >= 0) continue; }
    const ti = tiles(f); if (ti == null) continue;
    const loc = F.c.map(c => [c[0] ? bx[3] : bx[0], c[1] ? bx[4] : bx[1], c[2] ? bx[5] : bx[2]]);
    let uvs = loc.map(p => UVF[f](p[0], p[1], p[2]));
    if (o.uvr && o.uvr[f]) { const r = o.uvr[f]; uvs = uvs.map(([u, v]) => [u + r[0], v + r[1]]); }
    if (o.rot && (f === 2 || f === 3)) uvs = uvs.map(uv => rotUV(uv, o.rot));
    const P = loc.map(p => { const q = o.xf ? o.xf(p) : p; return [x + q[0] + (o.ox || 0), y + q[1] + (o.oy || 0), z + q[2] + (o.oz || 0)]; });
    let c; if (o.iso) c = [F.s, F.s, F.s]; else { const l = faceBr(x, y, z, f); c = [F.s, l[0], l[1]]; }
    pq(A, P, uvs, ti, [c, c, c, c]);
  }
}
// smooth light at a cube corner: average of the transmitting cells around it (the same cells as the AO)
function cornerBr(x, y, z, n, c) {
  const bx = x + n[0], by = y + n[1], bz = z + n[2], d1 = [0, 0, 0], d2 = [0, 0, 0]; let k = 0;
  for (let a = 0; a < 3; a++) { if (n[a]) continue; (k++ ? d2 : d1)[a] = c[a] ? 1 : -1; }
  let s = 0, b = 0, m = 0;
  const add = (X, Y, Z) => { if (!trAt(X, Y, Z)) return false; const q = cellBr(X, Y, Z); s += q[0]; b += q[1]; m++; return true; };
  add(bx, by, bz); const a1 = add(bx + d1[0], by + d1[1], bz + d1[2]), a2 = add(bx + d2[0], by + d2[1], bz + d2[2]);
  if (a1 || a2) add(bx + d1[0] + d2[0], by + d1[1] + d2[1], bz + d1[2] + d2[2]);
  if (!m) return cellBr(bx, by, bz);
  return [s / m, b / m];
}
const _emitBlock = emitBlock;
// wall torch: leans away from the wall, base pushed against it
const wallTorchXf = f => { const nx = DIR[f][0], nz = DIR[f][1], a = .42, ca = Math.cos(a), sa = Math.sin(a);
  return p => { const qx = p[0] - .5, qy = p[1], qz = p[2] - .5, s = qx * nx + qz * nz, rx = qx - s * nx, rz = qz - s * nz;
    const s2 = s * ca + qy * sa, y2 = qy * ca - s * sa; return [.5 - nx * .36 + rx + s2 * nx, .2 + y2, .5 - nz * .36 + rz + s2 * nz]; }; };
const TORCH_BOX = [s16(7), 0, s16(7), s16(9), s16(12), s16(9)];
const TORCH_UVR = { 3: [0, s16(3)] };     // the top face shows the flame pixels
function shapeTiles(t, m) {
  const b = BLOCK[t];
  if (t === DOOR) { const ti = m & 8 ? T.door_top : T.door_bottom; return () => ti; }
  if (t === BED) { const head = m & 4; return f => f === 3 ? (head ? T.bed_head_top : T.bed_foot_top) : f === 2 ? T.planks : (f === 0 || f === 1) ? T.bed_side : T.bed_end; }
  return f => b.tiles[f];
}
const ISO_META = { [BED]: 3, [LADDER]: 3, [OAK_STAIRS]: 1, [COBBLE_STAIRS]: 1 };
emitBlock = function (A, W, x, y, z, t, ox = 0, oy = 0, oz = 0, isolated = false) {
  const b = BLOCK[t]; if (!b || b.kind === 'air') return;
  if (t === TORCH) {
    const m = isolated ? 0 : gm(x, y, z), o = { iso: isolated, ox, oy, oz, uvr: TORCH_UVR, noCull: true };
    if (m) o.xf = wallTorchXf(m - 1);
    emitBox(A, x, y, z, TORCH_BOX, () => b.tiles[0], o); return;
  }
  if (b.shape) {
    if (t === CHEST && !isolated) return;               // chests are animated meshes
    const m = isolated ? (ISO_META[t] || 0) : gm(x, y, z), o = { iso: isolated, ox, oy, oz };
    if (t === BED) o.rot = [3, 1, 2, 0][m & 3];
    const tl = shapeTiles(t, m);
    for (const bx of b.shape(x, y, z, m, false)) emitBox(A, x, y, z, bx, tl, o);
    return;
  }
  if (isolated) return _emitBlock(A, W, x, y, z, t, ox, oy, oz, isolated);
  if (b.kind === 'cross') {
    const s = .85 + hash2(x, z) * .15, l = cellBr(x, y, z), c = [s, l[0], l[1]], C = [c, c, c, c], uv = [[0, 0], [1, 0], [0, 1], [1, 1]], uvB = [[1, 0], [0, 0], [1, 1], [0, 1]];
    for (const q of [[[x + .15, y, z + .15], [x + .85, y, z + .85], [x + .15, y + 1, z + .15], [x + .85, y + 1, z + .85]],
                     [[x + .15, y, z + .85], [x + .85, y, z + .15], [x + .15, y + 1, z + .85], [x + .85, y + 1, z + .15]]]) {
      pq(A, q, uv, b.tiles[0], C); pq(A, [q[1], q[0], q[3], q[2]], uvB, b.tiles[0], C);
    }
    return;
  }
  const isW = b.kind === 'water', low = isW && get(x, y + 1, z) !== WATER, front = b.orient ? FACE_OF[gm(x, y, z) & 3] : -1;
  for (let f = 0; f < 6; f++) {
    const F = FACES[f], ny = y + F.n[1]; if (ny < 0) continue;
    const n = get(x + F.n[0], ny, z + F.n[2]), nb = BLOCK[n];
    if (nb.opaque || (n === t && (isW || t === GLASS)) || (isW && nb.solid && !nb.shape)) continue;
    const P = F.c.map(c => [x + c[0], y + (low && c[1] ? .875 : c[1]), z + c[2]]);
    const ti = front < 0 ? b.tiles[f] : f === front ? b.tiles[5] : (f === 2 || f === 3) ? b.tiles[f] : b.tiles[0];
    let C;
    if (isW) { const l = cellBr(x + F.n[0], ny, z + F.n[2]), c = [F.s, l[0], l[1]]; C = [c, c, c, c]; }
    else C = F.c.map(c => { const l = cornerBr(x, y, z, F.n, c); return [F.s * aoLight(x, y, z, F.n, c), l[0], l[1]]; });
    pq(isW ? W : A, P, F.uv, ti, C);
  }
};

// every edit that goes through rebuildAround (main script, other modules) relights a box around it first
const _rebuildAround = rebuildAround;
rebuildAround = function (x, z) {
  x = Math.floor(x); z = Math.floor(z);
  relight(x - 16, x + 16, z - 16, z + 16, true); markCell(x, z); rebuildDirty();
  syncChests(x - 2, x + 2, z - 2, z + 2);
};

// ---------------------------------------------------------------------
//  Collision with shaped blocks, stepping up slabs and stairs, climbing ladders
// ---------------------------------------------------------------------
collides = function (p) {
  const ax0 = p.x - PW + 1e-4, ax1 = p.x + PW - 1e-4, ay0 = p.y + 1e-4, ay1 = p.y + PH - 1e-4, az0 = p.z - PW + 1e-4, az1 = p.z + PW - 1e-4;
  const x0 = Math.floor(ax0), x1 = Math.floor(ax1), y0 = Math.floor(ay0), y1 = Math.floor(ay1), z0 = Math.floor(az0), z1 = Math.floor(az1);
  for (let y = y0 - 1; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
    const t = get(x, y, z), b = BLOCK[t]; if (!b.solid) continue;
    if (!b.shape) { if (y >= y0) return true; continue; }
    for (const q of b.shape(x, y, z, gm(x, y, z), true))
      if (ax0 < x + q[3] && ax1 > x + q[0] && ay0 < y + q[4] && ay1 > y + q[1] && az0 < z + q[5] && az1 > z + q[2]) return true;
  }
  return false;
};
const _moveAxis = moveAxis;
moveAxis = function (p, ax, d) {
  if (ax === 'y' || !d) return _moveAxis(p, ax, d);
  const sx = p.x, sy = p.y, sz = p.z;
  if (!_moveAxis(p, ax, d)) return false;
  // blocked: step up to 0.6 blocks (slabs, stairs) when standing on something
  const bx = p.x, bz = p.z;
  p.y = sy - .06; const grounded = collides(p); p.y = sy;
  if (!grounded) return true;
  p.y = sy + .6; if (collides(p)) { p.y = sy; return true; }
  const done = ax === 'x' ? bx - sx : bz - sz; _moveAxis(p, ax, d - done);
  if (Math.abs(ax === 'x' ? p.x - bx : p.z - bz) < .02) { p.x = bx; p.z = bz; p.y = sy; return true; }
  _moveAxis(p, 'y', -.62);
  return false;
};
function onLadder(ch) { const p = ch.pos, x = Math.floor(p.x), z = Math.floor(p.z); return get(x, Math.floor(p.y + .1), z) === LADDER || get(x, Math.floor(p.y + 1), z) === LADDER; }
const _physics = physics;
physics = function (ch, dt, input) {
  if (!onLadder(ch)) return _physics(ch, dt, input);
  const up = input && (input.jump || input.f > 0);
  ch.vel.y = up ? 2.6 + 30 * dt : ch.sneak ? 30 * dt : Math.max(ch.vel.y, -2.6) + 30 * dt * .8;
  ch.onGround = false;
  const r = _physics(ch, dt, input);
  ch.onGround = true;                 // no fall damage on ladders
  return r;
};

// ---------------------------------------------------------------------
//  Icons for shaped blocks (isometric boxes, like the main drawIcon)
// ---------------------------------------------------------------------
const ICON_BOXES = {
  [OAK_SLAB]: [[0, 0, 0, 1, .5, 1]], [OAK_STAIRS]: [[.5, .5, 0, 1, 1, 1], [0, 0, 0, 1, .5, 1]],
  [FENCE]: [[s16(6), 0, s16(1), s16(10), 1, s16(5)], [s16(7), s16(12), s16(4), s16(9), s16(15), s16(12)], [s16(7), s16(6), s16(4), s16(9), s16(9), s16(12)], [s16(6), 0, s16(11), s16(10), 1, s16(15)]],
  [CHEST]: [[s16(1), 0, s16(1), s16(15), s16(14), s16(15)]],
};
ICON_BOXES[COBBLE_SLAB] = ICON_BOXES[OAK_SLAB]; ICON_BOXES[COBBLE_STAIRS] = ICON_BOXES[OAK_STAIRS];
const _drawIcon = drawIcon;
drawIcon = function (c, t) {
  const boxes = ICON_BOXES[t]; if (!boxes) return _drawIcon(c, t);
  const g = c.getContext('2d'), b = BLOCK[t]; g.imageSmoothingEnabled = false; g.clearRect(0, 0, 32, 32);
  const face = (ti, dark) => pixCanvas(16, 16, fg => { fg.drawImage(ATLAS, (ti % 16) * 16, Math.floor(ti / 16) * 16, 16, 16, 0, 0, 16, 16);
    if (dark) { fg.globalCompositeOperation = 'source-atop'; fg.fillStyle = `rgba(0,0,0,${dark})`; fg.fillRect(0, 0, 16, 16); } });
  const top = face(b.tiles[3], 0), left = face(b.tiles[0], .3), right = face(b.tiles[5], .45);
  const crop = (img, u0, v0, u1, v1) => { const w = u1 - u0, h = v1 - v0; if (w > 0 && h > 0) g.drawImage(img, u0, v0, w, h, u0, v0, w, h); };
  const order = boxes.slice().sort((p, q) => ((q[0] + q[3]) - (q[2] + q[5]) - (q[1] + q[4])) - ((p[0] + p[3]) - (p[2] + p[5]) - (p[1] + p[4])));
  for (const q of order) {
    const [x0, y0, z0, x1, y1, z1] = q.map(v => v * 16);
    g.setTransform(.9375, .46875, -.9375, .46875, 16, 1 + .96875 * (16 - y1)); crop(top, z0, 16 - x1, z1, 16 - x0);
    g.setTransform(.9375, .46875, 0, .96875, 1 + .9375 * x0, 8.5 - .46875 * x0); crop(left, z0, 16 - y1, z1, 16 - y0);
    g.setTransform(.9375, -.46875, 0, .96875, 1 + .9375 * z1, 8.5 + .46875 * z1); crop(right, x0, 16 - y1, x1, 16 - y0);
  }
  g.setTransform(1, 0, 0, 1, 0, 0);
};

// ---------------------------------------------------------------------
//  Chests: animated meshes (lid opens while the screen is open); two side by side make one large chest
// ---------------------------------------------------------------------
const CHESTS = new Map(), FURN = new Map();          // cell index -> contents
const chestMeshes = new Map();                       // cell index -> { g, lid, mat, ang, open }
// chest meta: bits 0-1 facing, 4 = left half of a pair (partner at +side), 8 = right half (partner at -side)
const pairDir = f => [3, 2, 0, 1][f];                // "right" of a chest facing f, as a facing code
function partnerOf(x, y, z) {
  const m = gm(x, y, z); if (get(x, y, z) !== CHEST || !(m & 12)) return null;
  const d = DIR[pairDir(m & 3)], s = m & 4 ? 1 : -1, px2 = x + d[0] * s, pz2 = z + d[1] * s;
  return get(px2, y, pz2) === CHEST && (gm(px2, y, pz2) & 3) === (m & 3) ? [px2, y, pz2] : null;
}
const chestMat0 = () => new THREE.MeshBasicMaterial({ map: atlasTex, vertexColors: true, alphaTest: .5 });
function chestGeo(lid, double) {
  const A = newArrays(), T6 = f => f === 5 ? T.chest_side : BLOCK[CHEST].tiles[f], w = double ? 2 : 1;
  for (let k = 0; k < w; k++) {
    const xa = k === 0 ? s16(1) : 0, xb = k === w - 1 ? s16(15) : 1;
    if (!lid) emitBox(A, 0, 0, 0, [xa, 0, s16(1), xb, s16(10), s16(15)], T6, { iso: true, ox: k - .5, oy: 0, oz: -.5 });
    else emitBox(A, 0, 0, 0, [xa, s16(10), s16(1), xb, s16(14), s16(15)], T6, { iso: true, ox: k - .5, oy: -s16(10), oz: -s16(1) });
  }
  if (lid) { const L = newArrays(); emitBox(L, 0, 0, 0, [s16(7), s16(7), s16(15), s16(9), s16(11), 1], () => TILE.iron, { iso: true, ox: w / 2 - 1, oy: -s16(10), oz: -s16(1) });
    for (const k of ['pos', 'uv', 'col']) A[k].push(...L[k]); const base = A.idx.length ? Math.max(...A.idx) + 1 : 0; A.idx.push(...L.idx.map(i => i + base)); }
  return makeGeo(A);
}
function syncChest(x, y, z) {
  const i = IDX(x, y, z), have = chestMeshes.get(i), isC = get(x, y, z) === CHEST, m = gm(x, y, z);
  const want = isC && !(m & 8 && partnerOf(x, y, z)) ? (m & 4 && partnerOf(x, y, z) ? 2 : 1) : 0;
  if (have && (have.w !== want || have.f !== (m & 3))) { scene.remove(have.g); have.g.traverse(o => o.geometry && o.geometry.dispose()); chestMeshes.delete(i); }
  else if (have) return;
  if (!want) return;
  const f = m & 3, g = new THREE.Group(), mat = chestMat0();
  const base = new THREE.Mesh(chestGeo(false, want === 2), mat), lid = new THREE.Group(), lm = new THREE.Mesh(chestGeo(true, want === 2), mat);
  lid.position.set(0, s16(10), -.5 + s16(1)); lid.add(lm); g.add(base, lid);
  g.position.set(x + .5, y, z + .5); g.rotation.y = [-Math.PI / 2, Math.PI / 2, Math.PI, 0][f];
  scene.add(g); chestMeshes.set(i, { g, lid, mat, ang: 0, open: false, w: want, f, x, y, z });
}
function syncChests(x0, x1, z0, z1) {
  for (const [i, c] of chestMeshes) if (c.x >= x0 && c.x <= x1 && c.z >= z0 && c.z <= z1) syncChest(c.x, c.y, c.z);
  for (let z = Math.max(0, z0); z <= Math.min(WZ - 1, z1); z++) for (let x = Math.max(0, x0); x <= Math.min(WX - 1, x1); x++)
    for (let y = 0; y < WY; y++) if (world[IDX(x, y, z)] === CHEST) syncChest(x, y, z);
}
// light colour for a free-standing mesh at a cell: day-tinted sky light or warm block light, whichever is brighter
function meshLight(col, x, y, z) {
  const l = trAt(x, y, z) ? cellBr(x, y, z) : faceBr(x, y, z, 3), d = opaqueMat.color;
  col.setRGB(Math.max(d.r * l[0], TORCH_C.r * l[1]), Math.max(d.g * l[0], TORCH_C.g * l[1]), Math.max(d.b * l[0], TORCH_C.b * l[1]));
}
function chestSound(open) {
  if (!AC) return; const t = AC.currentTime;
  if (open) { thump(t, 140, 90, .18, .25); noiseSweep(t + .02, .35, 600, 300, .12, 3, .05); }
  else { thump(t, 110, 60, .14, .35); click(t + .02, 300, .08); }
}

// ---------------------------------------------------------------------
//  Particles: torch flames and smoke, furnace fire
// ---------------------------------------------------------------------
const pGeo = new THREE.BoxGeometry(1, 1, 1);
const FLAME = [new THREE.MeshBasicMaterial({ color: 0xffb030, fog: false }), new THREE.MeshBasicMaterial({ color: 0xffe080, fog: false })];
const SMOKE = [new THREE.MeshBasicMaterial({ color: 0x3a3a3a, transparent: true, opacity: .7 }), new THREE.MeshBasicMaterial({ color: 0x555555, transparent: true, opacity: .6 })];
const parts = [];
function spark(x, y, z, smoke) {
  if (parts.length > 140) return;
  const m = new THREE.Mesh(pGeo, (smoke ? SMOKE : FLAME)[Math.random() < .5 ? 0 : 1]), s = smoke ? .07 + Math.random() * .05 : .04 + Math.random() * .03;
  m.scale.setScalar(s); m.position.set(x, y, z); scene.add(m);
  const life = smoke ? .9 + Math.random() * .7 : .25 + Math.random() * .3;
  parts.push({ m, life, max: life, s, vy: smoke ? .55 + Math.random() * .3 : .25 + Math.random() * .2, vx: (Math.random() - .5) * .06, vz: (Math.random() - .5) * .06 });
}
function torchTop(i) {
  const x = i % WX, z = ((i / WX) | 0) % WZ, y = (i / WXZ) | 0, m = META[i];
  if (!m) return [x + .5, y + .78, z + .5];
  const q = wallTorchXf(m - 1)([.5, .78, .5]); return [x + q[0], y + q[1], z + q[2]];
}
let crackleT = 0;
function updateParticles(dt) {
  for (let i = parts.length - 1; i >= 0; i--) { const q = parts[i]; q.life -= dt; q.m.position.x += q.vx * dt; q.m.position.y += q.vy * dt; q.m.position.z += q.vz * dt;
    q.m.scale.setScalar(Math.max(.001, q.s * (.4 + .6 * q.life / q.max))); if (q.life <= 0) { scene.remove(q.m); parts.splice(i, 1); } }
  const P = PL().pos; let nearFire = 99;
  for (const i of lights) {
    const t = world[i], x = i % WX, z = ((i / WX) | 0) % WZ, y = (i / WXZ) | 0, d = Math.abs(x - P.x) + Math.abs(z - P.z) + Math.abs(y - P.y);
    if (d > 28) continue;
    if (t === TORCH) { const [tx, ty, tz] = torchTop(i); if (Math.random() < dt * 2.2) spark(tx + (Math.random() - .5) * .04, ty, tz + (Math.random() - .5) * .04, false);
      if (Math.random() < dt * 1.1) spark(tx, ty + .08, tz, true); }
    else if (t === FURNACE_LIT) { nearFire = Math.min(nearFire, d); const f = META[i] & 3, fx = x + .5 + DIR[f][0] * .53, fz = z + .5 + DIR[f][1] * .53;
      if (Math.random() < dt * 3) spark(fx + (DIR[f][1] ? (Math.random() - .5) * .6 : 0), y + .15 + Math.random() * .3, fz + (DIR[f][0] ? (Math.random() - .5) * .6 : 0), Math.random() < .4); }
  }
  if (nearFire < 8 && AC && (crackleT -= dt) <= 0) { crackleT = .15 + Math.random() * .6; click(AC.currentTime, 1800 + Math.random() * 2400, .02 * (1 - nearFire / 8)); }
}

// ---------------------------------------------------------------------
//  Falling sand and gravel
// ---------------------------------------------------------------------
const FALLS = new Set([SAND, GRAVEL]), falling = [];
const fallMat = new THREE.MeshBasicMaterial({ map: atlasTex, vertexColors: true, alphaTest: .5 });
function checkFall(x, y, z) {
  const t = get(x, y, z); if (!FALLS.has(t) || y <= 0) return;
  const below = get(x, y - 1, z); if (!passable(below) && below !== TORCH) return;
  set(x, y, z, AIR); sm(x, y, z, 0);
  const A = newArrays(); _emitBlock(A, A, 0, 0, 0, t, -.5, 0, -.5, true);
  const m = new THREE.Mesh(makeGeo(A), fallMat); m.position.set(x + .5, y, z + .5); scene.add(m);
  falling.push({ m, t, x, z, y, vy: 0 });
  rebuildAround(x, z);
  checkFall(x, y + 1, z);
}
function updateFalling(dt) {
  for (let i = falling.length - 1; i >= 0; i--) {
    const f = falling[i]; f.vy = Math.max(-40, f.vy - 30 * dt); const ny = f.y + f.vy * dt, cy = Math.floor(ny);
    const below = get(f.x, cy, f.z);
    if (cy < 0 || (!passable(below) && below !== TORCH)) {
      const ly = cy + 1; scene.remove(f.m); f.m.geometry.dispose(); falling.splice(i, 1);
      const at = get(f.x, ly, f.z);
      if (ly < WY && passable(at)) { set(f.x, ly, f.z, f.t); sm(f.x, ly, f.z, 0); SFX.block(f.t, 'place'); rebuildAround(f.x, f.z); }
      else drop(hasInv() && Inv.itemForBlock ? Inv.itemForBlock(f.t) : null, 1, f.x + .5, ly + .5, f.z + .5);
      continue;
    }
    if (below === TORCH && Math.floor(f.y) !== cy) { set(f.x, cy, f.z, AIR); drop('torch', 1, f.x + .5, cy + .5, f.z + .5); rebuildAround(f.x, f.z); }
    f.y = ny; f.m.position.y = ny; f.m.material.color.copy(opaqueMat.color);
  }
}
function drop(id, n, x, y, z) {
  if (!id || !n) return;
  if (hasWorld() && World.spawnDrop) World.spawnDrop(id, n, new V3(x, y, z)); else if (hasInv()) Inv.add(id, n);
}

// ---------------------------------------------------------------------
//  Placing blocks with orientation, using doors / beds / stations, breaking linked blocks
// ---------------------------------------------------------------------
function hitFrac(h) {         // height (0..1) where the look ray meets the clicked side face
  const P = PL(), o = P.eye, d = lookDir(P.yaw, P.pitch);
  const t = h.nx ? (h.x + (h.nx > 0 ? 1 : 0) - o.x) / d.x : (h.z + (h.nz > 0 ? 1 : 0) - o.z) / d.z;
  return o.y + d.y * t - h.y;
}
const placeCell = h => BLOCK[h.t].kind === 'cross' && h.t !== TORCH ? [h.x, h.y, h.z] : [h.x + h.nx, h.y + h.ny, h.z + h.nz];
const bodyIn = (x, y, z) => chars.some(ch => { const p = ch.pos; return x < p.x + PW && x + 1 > p.x - PW && y < p.y + PH && y + 1 > p.y && z < p.z + PW && z + 1 > p.z - PW; });
const supports = (x, y, z) => { const t = get(x, y, z), b = BLOCK[t]; return b.solid && (!b.shape || ((t === OAK_SLAB || t === COBBLE_SLAB) && (gm(x, y, z) & 1)) || t === OAK_STAIRS || t === COBBLE_STAIRS); };
function freeCell(c, body = true) { const [x, y, z] = c; return inb(x, y, z) && passable(get(x, y, z)) && !(body && bodyIn(x, y, z)); }
function single(h, t, m) { const c = placeCell(h); return freeCell(c) ? [[...c, t, m]] : false; }
const PLACE = {
  [TORCH]: h => { if (h.ny < 0 || !isFull(h.t)) return false; const c = [h.x + h.nx, h.y + h.ny, h.z + h.nz]; if (!freeCell(c, false)) return false;
    return [[...c, TORCH, h.ny > 0 ? 0 : 1 + dirOf(h.nx, h.nz)]]; },
  [LADDER]: h => { if (h.ny || !isFull(h.t)) return false; const c = [h.x + h.nx, h.y, h.z + h.nz]; return freeCell(c, false) ? [[...c, LADDER, dirOf(h.nx, h.nz)]] : false; },
  [FURNACE]: h => single(h, FURNACE, OPP[lookFacing()]),
  [CHEST]: h => {
    const c = placeCell(h); if (!freeCell(c)) return false;
    let f = OPP[lookFacing()]; const out = [];
    for (let k = 0; k < 4; k++) { const nx = c[0] + DIR[k][0], nz = c[2] + DIR[k][1]; if (get(nx, c[1], nz) !== CHEST) continue; const nm = gm(nx, c[1], nz); if (nm & 12) continue;
      const fn = nm & 3, pd = pairDir(fn); if (k !== pd && k !== OPP[pd]) continue;
      f = fn; const left = k === pd; out.push([nx, c[1], nz, CHEST, fn | (left ? 8 : 4)]); return [[...c, CHEST, f | (left ? 4 : 8)], ...out]; }
    return [[...c, CHEST, f]];
  },
  [BED]: h => { const c = placeCell(h), f = lookFacing(), hd = [c[0] + DIR[f][0], c[1], c[2] + DIR[f][1]];
    if (!freeCell(c) || !freeCell(hd) || !supports(c[0], c[1] - 1, c[2]) || !supports(hd[0], hd[1] - 1, hd[2])) return false;
    return [[...c, BED, f], [...hd, BED, f | 4]]; },
  [DOOR]: h => { const c = placeCell(h), up = [c[0], c[1] + 1, c[2]], f = lookFacing();
    if (!freeCell(c) || !freeCell(up) || !supports(c[0], c[1] - 1, c[2])) return false;
    // hinge on the side with a wall next to it, like Minecraft's simple rule
    const r = DIR[[3, 2, 0, 1][f]], hinge = isFull(get(c[0] - r[0], c[1], c[2] - r[1])) && !isFull(get(c[0] + r[0], c[1], c[2] + r[1])) ? 16 : 0;
    return [[...c, DOOR, f | hinge], [...up, DOOR, f | hinge | 8]]; },
};
for (const t of [OAK_SLAB, COBBLE_SLAB]) PLACE[t] = h => {
  if (h.t === t) { const m = gm(h.x, h.y, h.z); if ((h.ny > 0 && !(m & 1)) || (h.ny < 0 && (m & 1))) return [[h.x, h.y, h.z, SLAB_FULL[t], 0]]; }
  const c = placeCell(h);
  if (get(...c) === t) return [[...c, SLAB_FULL[t], 0]];
  if (!freeCell(c)) return false;
  return [[...c, t, h.ny < 0 || (h.ny === 0 && hitFrac(h) > .5) ? 1 : 0]];
};
for (const t of [OAK_STAIRS, COBBLE_STAIRS]) PLACE[t] = h => single(h, t, lookFacing() | (h.ny < 0 || (h.ny === 0 && hitFrac(h) > .5) ? 4 : 0));
function finishPlace(list) {
  const cols = new Set();
  for (const [x, y, z, t, m] of list) { set(x, y, z, t); sm(x, y, z, m); cols.add(x + ',' + z); }
  Inv.consumeHeld(1); SFX.block(list[0][3], 'place'); PL().swing = 1; swingT = 1;
  for (const k of cols) { const [x, z] = k.split(',').map(Number); rebuildAround(x, z); }
}
function toggleDoor(x, y, z) {
  const m = gm(x, y, z), by = m & 8 ? y - 1 : y;
  for (const yy of [by, by + 1]) if (get(x, yy, z) === DOOR) sm(x, yy, z, gm(x, yy, z) ^ 4);
  if (AC) { const t = AC.currentTime, open = gm(x, by, z) & 4; noiseSweep(t, .22, open ? 500 : 380, open ? 900 : 260, .2, 4, .01); thump(t + (open ? .12 : .02), 160, 90, .1, .2); }
  rebuildAround(x, z);
}
const HOSTILE = /troll|greyling|zombie|skeleton|creeper|spider|wraith|drowned|witch|husk|phantom|slime|draugr|ghoul/i;
function monstersNear(p) {
  return ENTITIES.some(e => e && !(e.dead > 0) && e.pos && (e.hostile || HOSTILE.test((e.kind || '') + ' ' + (e.name || ''))) &&
    Math.abs(e.pos.x - p.x) < 8 && Math.abs(e.pos.z - p.z) < 8 && Math.abs(e.pos.y - p.y) < 5);
}
function useBed(x, y, z) {
  const P = PL();
  if (monstersNear(P.pos)) { chat('You may not rest now; there are monsters nearby'); return; }
  const d = DEFS[cur], np = [x + .5, z + .5];
  if (!d.pos || d.pos[0] !== np[0] || d.pos[1] !== np[1]) { d.pos = np; chat('Respawn point set'); }
  if (!hasWorld() || !World.isNight || !World.isNight()) { chat('You can sleep only at night'); return; }
  startSleep(x, y, z);
}
function interact(h) {
  const t = h.t;
  if (t === FURNACE || t === FURNACE_LIT) { openGui('furnace', h.x, h.y, h.z); return true; }
  if (t === CHEST) { if (!BLOCK[get(h.x, h.y + 1, h.z)].opaque) openGui('chest', h.x, h.y, h.z); return true; }
  if (t === BED) { useBed(h.x, h.y, h.z); return true; }
  if (t === DOOR) { toggleDoor(h.x, h.y, h.z); PL().swing = 1; swingT = 1; return true; }
  return false;
}
function onUse() {
  if (state !== 'play') return false;
  const h = targetBlock();
  if (h && !PL().sneak && interact(h)) return true;
  if (!h || !hasInv()) return false;
  const pl = PLACE[Inv.heldBlock()]; if (!pl) return false;
  const list = pl(h); if (list) finishPlace(list);
  return true;
}
(HOOKS.use || (HOOKS.use = [])).unshift(onUse);       // before eating / shield raising, so stations open with anything in hand
const _useItem = useItem;
useItem = function () {          // placed sand and gravel fall when nothing holds them
  const h = state === 'play' ? targetBlock() : null; const r = _useItem.apply(this, arguments);
  if (h) checkFall(...placeCell(h));
  return r;
};
const spill = (arr, x, y, z) => { for (const s of arr) if (s) drop(s.id, s.n, x + .5, y + .5, z + .5); };
const _breakBlock = breakBlock;
breakBlock = function (h) {
  const t = h.t, x = h.x, y = h.y, z = h.z, m = gm(x, y, z), i = IDX(x, y, z);
  if (t !== BEDROCK && get(x, y, z) === t) {
    if (t === DOOR) { const oy = m & 8 ? y - 1 : y + 1; if (get(x, oy, z) === DOOR) set(x, oy, z, AIR); }
    if (t === BED) { const d = DIR[m & 3], s = m & 4 ? -1 : 1; if (get(x + d[0] * s, y, z + d[1] * s) === BED) set(x + d[0] * s, y, z + d[1] * s, AIR); }
    if (t === CHEST) { const p = partnerOf(x, y, z); if (p) sm(p[0], p[1], p[2], gm(p[0], p[1], p[2]) & 3);
      if (G && G.cells.includes(i)) closeGui(false); if (CHESTS.has(i)) { spill(CHESTS.get(i), x, y, z); CHESTS.delete(i); } }
    if (t === FURNACE || t === FURNACE_LIT) { if (G && G.cells.includes(i)) closeGui(false); if (FURN.has(i)) { spill(FURN.get(i).s, x, y, z); FURN.delete(i); } }
    for (let k = 0; k < 4; k++) {           // torches and ladders hanging on this block fall off
      const ax = x + DIR[k][0], az = z + DIR[k][1], at = get(ax, y, az), am = gm(ax, y, az);
      if ((at === TORCH && am === k + 1) || (at === LADDER && (am & 3) === k)) { set(ax, y, az, AIR); sm(ax, y, az, 0); drop(at === TORCH ? 'torch' : 'ladder', 1, ax + .5, y + .5, az + .5); }
    }
    const up = get(x, y + 1, z), um = gm(x, y + 1, z);
    if (up === TORCH && !um) drop('torch', 1, x + .5, y + 1.3, z + .5);
    if (up === DOOR && !(um & 8)) { set(x, y + 1, z, AIR); set(x, y + 2, z, AIR); drop('oak_door', 1, x + .5, y + 1.5, z + .5); }
  }
  const r = _breakBlock(h);
  if (get(x, y, z) !== t) { sm(x, y, z, 0); checkFall(x, y + 1, z); }
  return r;
};
on('blockDrops', (drops, h) => {
  switch (h.t) {
    case DOOR: return [['oak_door', 1]];
    case BED: return [['bed', 1]];
    case FURNACE_LIT: return [['furnace', 1]];
    case GRAVEL: return Math.random() < .1 ? [['flint', 1]] : [['gravel', 1]];
  }
  return drops;
});

// ---------------------------------------------------------------------
//  Sleeping: fade to black, skip to morning, wake up
// ---------------------------------------------------------------------
const sleepCss = document.createElement('style');
sleepCss.textContent = `
  #bcFade { position: fixed; inset: 0; z-index: 30; background: #000; opacity: 0; pointer-events: none; }
  #bcLeave { position: fixed; left: 50%; bottom: 14%; transform: translateX(-50%); z-index: 31; width: 200px; padding: 6px 0; }
  #bcGui { position: fixed; inset: 0; z-index: 15; background: rgba(16,16,16,.55); font-family: var(--ui); color: #404040; --s: 2; touch-action: none; }
  #bcGui .bcw { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%) scale(var(--s)); }
  #bcGui .bcpx { position: absolute; image-rendering: pixelated; pointer-events: none; }
  #bcGui .ilb.c { left: 0 !important; width: 176px; text-align: center; }
  #bcCarry { position: absolute; width: calc(16px * var(--s)); height: calc(16px * var(--s)); margin: calc(-8px * var(--s)) 0 0 calc(-8px * var(--s)); pointer-events: none; }
  #bcCarry canvas { width: 100%; height: 100%; image-rendering: pixelated; }
  #bcCarry b { position: absolute; right: 0; bottom: 0; color: #fff; font: 600 calc(8px * var(--s))/1 var(--ui); text-shadow: calc(1px * var(--s)) calc(1px * var(--s)) 0 #3f3f3f; }
  #bcTip { position: absolute; pointer-events: none; background: rgba(16,0,16,.94); padding: calc(2px * var(--s)) calc(3px * var(--s));
    border: calc(1px * var(--s)) solid; border-image: linear-gradient(#5000ff, #28007f) 1; box-shadow: 0 0 0 calc(1px * var(--s)) rgba(16,0,16,.94);
    font-size: calc(8px * var(--s)); line-height: 1.3; color: #aaa; white-space: nowrap; text-shadow: calc(1px * var(--s)) calc(1px * var(--s)) 0 rgba(0,0,0,.55); }
  #bcTip .ds { font-style: italic; }`;
document.head.appendChild(sleepCss);
const mk = (tag, cls, parent, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; if (parent) parent.appendChild(e); return e; };
const fadeEl = mk('div', '', document.body); fadeEl.id = 'bcFade'; fadeEl.hidden = true;
const leaveBtn = mk('button', 'mcbtn', document.body, 'Leave Bed'); leaveBtn.id = 'bcLeave'; leaveBtn.hidden = true; leaveBtn.type = 'button';
leaveBtn.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); endSleep(); });
let sleep = null;
function startSleep(x, y, z) {
  const P = PL(); state = 'sleep'; mining = false;
  sleep = { t: 0, x, y, z, wake: 0, pos: new V3(x + .5, y + s16(9), z + .5) };
  P.pos.copy(sleep.pos); P.vel.set(0, 0, 0); P.pitch = .6;
  fadeEl.hidden = false; leaveBtn.hidden = false;
  if (document.pointerLockElement) try { document.exitPointerLock(); } catch (e) { /* not locked */ }
}
function endSleep() {
  if (!sleep) return; sleep = null; fadeEl.hidden = true; fadeEl.style.opacity = 0; leaveBtn.hidden = true;
  if (state === 'sleep') state = 'play';
  if (!TOUCH && !noLock) try { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) { /* click to capture */ }
}
function updateSleep(dt) {
  if (!sleep) return;
  sleep.t += dt; const P = PL(); P.pos.copy(sleep.pos); P.vel.set(0, 0, 0);
  if (!sleep.wake) {
    fadeEl.style.opacity = Math.min(1, sleep.t / 1.8);
    if (sleep.t > 2.4) { sleep.wake = sleep.t; if (hasWorld() && World.setTime) World.setTime(.02); }
  } else {
    const k = sleep.t - sleep.wake; fadeEl.style.opacity = Math.max(0, 1 - (k - .4) / .8);
    if (k > 1.3) endSleep();
  }
}

// ---------------------------------------------------------------------
//  Container screens: Furnace, Chest, Large Chest (Minecraft layout in GUI pixels, items.js slot styling)
// ---------------------------------------------------------------------
const RARITY = { common: '#FFFFFF', uncommon: '#FFFF55', rare: '#55FFFF', epic: '#FF55FF', boss: '#FFAA00' };
const maxStack = id => (typeof ITEMS !== 'undefined' && ITEMS[id] && ITEMS[id].stack) || 64;
const mkStack = (id, n) => { const s = { id, n }; const d = typeof ITEMS !== 'undefined' && ITEMS[id] && ITEMS[id].durability; if (d) s.dur = d; return s; };
const fuelOf = id => FUEL[id] || 0;
const groot = mk('div', '', document.body); groot.id = 'bcGui'; groot.hidden = true;
const gwrap = mk('div', 'bcw', groot), gpanel = mk('div', 'ipn', gwrap);
const carryEl = mk('div', '', groot); carryEl.id = 'bcCarry'; const carryCv = mk('canvas', '', carryEl); carryCv.width = carryCv.height = 32; const carryN = mk('b', '', carryEl);
const tipEl = mk('div', '', groot); tipEl.id = 'bcTip'; tipEl.hidden = true;
let G = null, carry = null, gx = 0, gy = 0, gscale = 2, tipT = 0, hover = null, gSlots = [], flameG = null, arrowG = null, furnT = 0;
const ARROW_IN = (x, y) => (y >= 6 && y <= 10 && x <= 15) || (x >= 15 && x <= 23 && Math.abs(y - 8) <= 23 - x);
const FLAME_IN = (x, y) => { const c = 6.5, w = y < 2 ? 0 : y < 11 ? (y - 1) * .62 : 6.2 - (y - 11) * 1.2; return Math.abs(x - c) < w && !(y < 6 && x > 9 && y < 4); };
function uiSnd() { if (AC) click(AC.currentTime, 1300, .03); }
function refreshInv() { if (hasInv()) Inv.remove('', 0); }          // Inv.remove with 0 items just runs items.js's change hook (HUD, save)
function moveInto(arr, idxs, st) {
  const ms = maxStack(st.id);
  if (ms > 1) for (const i of idxs) { const s = arr[i]; if (s && s.id === st.id && s.n < ms) { const k = Math.min(st.n, ms - s.n); s.n += k; st.n -= k; if (!st.n) return null; } }
  for (const i of idxs) if (!arr[i]) { const k = Math.min(st.n, ms); arr[i] = { ...st, n: k }; st.n -= k; if (!st.n) return null; }
  return st;
}
const range = (a, b) => Array.from({ length: b - a }, (_, k) => a + k);
const INV_ORDER = [...range(9, 36), ...range(0, 9)];
function gslot(x, y, ref, big) {
  const d = mk('div', 'is' + (big ? ' big' : ''), gpanel); d.style.left = x + 'px'; d.style.top = y + 'px';
  const c = mk('canvas', '', d); c.width = c.height = 32; const b = mk('b', '', d), bar = mk('i', '', d), u = mk('u', '', bar);
  const S = { d, c, g: c.getContext('2d'), b, bar, u, ref }; gSlots.push(S); hookSlot(S); return S;
}
const glabel = (txt, x, y, center) => { const l = mk('div', 'ilb' + (center ? ' c' : ''), gpanel, txt); l.style.left = x + 'px'; l.style.top = y + 'px'; return l; };
function pxCanvas(w, h, x, y) { const c = mk('canvas', 'bcpx', gpanel); c.width = w; c.height = h; c.style.left = x + 'px'; c.style.top = y + 'px'; c.style.width = w + 'px'; c.style.height = h + 'px'; return c.getContext('2d'); }
function buildGui() {
  gpanel.innerHTML = ''; gSlots = []; flameG = arrowG = null;
  const bag = Inv.bag(); let off = 0;
  if (G.kind === 'furnace') {
    gpanel.style.height = '166px'; glabel('Furnace', 0, 6, true);
    const F = G.F; gslot(55, 16, { arr: F.s, i: 0, kind: 'fin' }); gslot(55, 52, { arr: F.s, i: 1, kind: 'ffuel' }); gslot(111, 30, { arr: F.s, i: 2, kind: 'fout' }, true);
    flameG = pxCanvas(14, 14, 56, 36); arrowG = pxCanvas(24, 17, 79, 34);
  } else {
    const rows = G.arrs.length * 3; off = (rows - 3) * 18; gpanel.style.height = (166 + off) + 'px';
    glabel(rows > 3 ? 'Large Chest' : 'Chest', 8, 6);
    G.arrs.forEach((arr, h) => { for (let k = 0; k < 27; k++) gslot(7 + (k % 9) * 18, 17 + (h * 3 + Math.floor(k / 9)) * 18, { arr, i: k, kind: 'cont' }); });
  }
  glabel('Inventory', 8, 73 + off);
  for (let k = 0; k < 27; k++) gslot(7 + (k % 9) * 18, 83 + off + Math.floor(k / 9) * 18, { arr: bag.main, i: 9 + k, kind: 'main' });
  for (let k = 0; k < 9; k++) gslot(7 + k * 18, 141 + off, { arr: bag.main, i: k, kind: 'main' });
  const x = mk('div', 'ibtn', gpanel, 'X'); x.style.left = '157px'; x.style.top = '3px'; x.title = 'Close';
  x.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); closeGui(false); });
  const raw = Math.min((vw() - 16) / 176, (vh() - 8) / (166 + off)); gscale = clamp(Math.floor(raw * 4) / 4, .75, 4); groot.style.setProperty('--s', gscale);
}
function drawGauges() {
  if (!G || G.kind !== 'furnace' || !flameG) return;
  const F = G.F, r = F.s[0] && SMELT[F.s[0].id], fl = F.burnMax > 0 ? clamp(F.burn / F.burnMax, 0, 1) : 0, ar = r ? clamp(F.cook / r.secs, 0, 1) : 0;
  flameG.clearRect(0, 0, 14, 14); arrowG.clearRect(0, 0, 24, 17);
  const cut = 14 - Math.ceil(fl * 14);
  for (let y = 0; y < 14; y++) for (let x = 0; x < 14; x++) if (FLAME_IN(x, y)) {
    if (F.burn > 0 && y >= cut) { const e = Math.abs(x - 6.5) / ((y < 11 ? (y - 1) * .62 : 6.2 - (y - 11) * 1.2) || 1);
      flameG.fillStyle = e > .72 ? '#c83c00' : e > .4 || y < 5 ? '#ff8c00' : '#ffd800'; } else flameG.fillStyle = '#8b8b8b';
    flameG.fillRect(x, y, 1, 1); }
  const w = Math.round(ar * 24);
  for (let y = 0; y < 17; y++) for (let x = 0; x < 24; x++) if (ARROW_IN(x, y)) { arrowG.fillStyle = x < w ? '#ffffff' : '#8b8b8b'; arrowG.fillRect(x, y, 1, 1); }
}
function drawGSlot(S) {
  const st = S.ref.arr[S.ref.i], g = S.g; g.clearRect(0, 0, 32, 32);
  if (st) g.drawImage(Inv.icon(st.id), 0, 0);
  S.b.textContent = st && st.n > 1 ? st.n : '';
  const max = st && ITEMS[st.id] && ITEMS[st.id].durability, show = !!(max && st.dur < max); S.bar.hidden = !show;
  if (show) { const f = Math.max(0, st.dur / max); S.u.style.width = Math.max(1, Math.round(13 * f)) + 'px'; S.u.style.background = `hsl(${Math.round(120 * f)}, 100%, 45%)`; }
}
function renderGui() {
  if (!G) return;
  for (const S of gSlots) drawGSlot(S);
  drawGauges();
  carryEl.hidden = !carry;
  if (carry) { const g = carryCv.getContext('2d'); g.clearRect(0, 0, 32, 32); g.drawImage(Inv.icon(carry.id), 0, 0); carryN.textContent = carry.n > 1 ? carry.n : ''; }
  placeFloat();
}
function placeFloat() {
  carryEl.hidden = !carry; if (carry) { carryEl.style.left = gx + 'px'; carryEl.style.top = gy + 'px'; }
  if (!tipEl.hidden) { const w = tipEl.offsetWidth, h = tipEl.offsetHeight, o = 10 * gscale; let x = gx + o, y = gy - h - o * .4;
    if (x + w > vw() - 4) x = gx - o - w; if (y < 4) y = gy + o;
    tipEl.style.left = clamp(x, 4, Math.max(4, vw() - w - 4)) + 'px'; tipEl.style.top = clamp(y, 4, Math.max(4, vh() - h - 4)) + 'px'; }
}
const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function tipFor(st) {
  const it = ITEMS[st.id]; if (!it) return esc(st.id);
  const L = [`<div style="color:${RARITY[it.rarity] || '#fff'}">${esc(it.name)}</div>`];
  if (SMELT[st.id] && ITEMS[SMELT[st.id].out]) L.push(`<div>Smelts into ${esc(ITEMS[SMELT[st.id].out].name)}</div>`);
  if (fuelOf(st.id)) L.push(`<div>Fuel: smelts ${fuelOf(st.id) / 10} item${fuelOf(st.id) === 10 ? '' : 's'}</div>`);
  if (it.durability) L.push(`<div>Durability: ${Math.max(0, Math.ceil(st.dur ?? it.durability))} / ${it.durability}</div>`);
  if (it.desc) L.push(`<div class="ds">${esc(it.desc)}</div>`);
  return L.join('');
}
function showTip(st, flash) { if (!st || carry) { tipEl.hidden = true; return; } tipEl.innerHTML = tipFor(st); tipEl.hidden = false; tipT = flash ? 2.2 : 0; placeFloat(); }
const accepts = (ref, st) => ref.kind === 'fout' ? false : ref.kind === 'ffuel' ? fuelOf(st.id) > 0 : true;
function giveXp(pts) {
  const d = DEFS[cur]; if (!(pts > 0)) return;
  while (pts > 0) { const need = d.lvl < 16 ? 2 * d.lvl + 7 : d.lvl < 31 ? 5 * d.lvl - 38 : 9 * d.lvl - 158, want = (1 - (d.xp || 0)) * need;
    if (pts >= want) { pts -= want; d.lvl++; d.xp = 0; } else { d.xp = (d.xp || 0) + pts / need; pts = 0; } }
  drawStats(); if (AC) { const t = AC.currentTime; click(t, 2200 + Math.random() * 600, .05); click(t + .05, 2900 + Math.random() * 600, .04); }
}
function payXp() { const F = G && G.F; if (!F || !(F.xp > 0)) return; const whole = Math.floor(F.xp) + (Math.random() < F.xp % 1 ? 1 : 0); F.xp = 0; giveXp(whole); }
function quickMove(ref) {
  const s = ref.arr[ref.i]; if (!s) return;
  const bag = Inv.bag(); ref.arr[ref.i] = null; let left;
  if (ref.kind === 'main') {
    if (G.kind === 'furnace') {
      const F = G.F;
      if (SMELT[s.id]) left = moveInto(F.s, [0], s); else if (fuelOf(s.id)) left = moveInto(F.s, [1], s);
      else left = moveInto(bag.main, ref.i < 9 ? range(9, 36) : range(0, 9), s);
      if (left && (SMELT[s.id] || fuelOf(s.id))) left = moveInto(bag.main, ref.i < 9 ? range(9, 36) : range(0, 9), left);
    } else { left = s; for (const arr of G.arrs) { left = moveInto(arr, range(0, 27), left); if (!left) break; } }
  } else { if (ref.kind === 'fout') payXp(); left = moveInto(bag.main, INV_ORDER, s); }
  if (left) ref.arr[ref.i] = left;
}
function act(S, right, shift) {
  const ref = S.ref, s = ref.arr[ref.i];
  if (shift) quickMove(ref);
  else if (ref.kind === 'fout') {
    if (!s) return;
    if (!carry) { carry = s; ref.arr[ref.i] = null; payXp(); }
    else if (carry.id === s.id && carry.n < maxStack(s.id)) { const k = Math.min(s.n, maxStack(s.id) - carry.n); carry.n += k; s.n -= k; if (!s.n) ref.arr[ref.i] = null; payXp(); }
    else return;
  } else if (!carry) {
    if (!s) return;
    if (right && s.n > 1) { const h = Math.ceil(s.n / 2); carry = { ...s, n: h }; s.n -= h; } else { carry = s; ref.arr[ref.i] = null; }
  } else {
    if (!accepts(ref, carry)) return;
    if (!s) { if (right && carry.n > 1) { ref.arr[ref.i] = { ...carry, n: 1 }; carry.n--; } else { ref.arr[ref.i] = carry; carry = null; } }
    else if (s.id === carry.id && maxStack(s.id) > 1) { const k = Math.min(maxStack(s.id) - s.n, right ? 1 : carry.n); s.n += k; carry.n -= k; if (!carry.n) carry = null; }
    else { ref.arr[ref.i] = carry; carry = s; }
  }
  uiSnd(); refreshInv(); renderGui();
}
// mouse: left / right / shift-click like Minecraft. Touch: tap moves a stack across (or places the held stack), hold picks it up
function hookSlot(S) {
  let timer = null, fired = false;
  S.d.addEventListener('pointerdown', e => {
    e.stopPropagation(); e.preventDefault(); const q = tpt(e); gx = q.x; gy = q.y;
    if (e.pointerType === 'touch') { fired = false; clearTimeout(timer);
      timer = setTimeout(() => { timer = null; fired = true; act(S, !!carry, false); if (navigator.vibrate) try { navigator.vibrate(12); } catch (err) { /* optional */ } }, 380); }
    else { act(S, e.button === 2, e.shiftKey); showTip(S.ref.arr[S.ref.i]); }
    placeFloat();
  });
  S.d.addEventListener('pointerup', e => {
    if (e.pointerType !== 'touch' || !timer) return; clearTimeout(timer); timer = null; if (fired) return;
    const st = S.ref.arr[S.ref.i];
    if (carry) act(S, false, false); else if (st) { act(S, false, true); showTip(st, true); }
  });
  S.d.addEventListener('pointercancel', () => { clearTimeout(timer); timer = null; });
  S.d.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { hover = S; showTip(S.ref.arr[S.ref.i]); } });
  S.d.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') { if (hover === S) hover = null; tipEl.hidden = true; } });
}
groot.addEventListener('pointermove', e => { const q = tpt(e); gx = q.x; gy = q.y; placeFloat(); });
groot.addEventListener('pointerdown', e => {
  if (e.target !== groot) return;
  if (carry) { const left = moveInto(Inv.bag().main, INV_ORDER, carry); carry = left; refreshInv(); renderGui(); }
  else if (e.pointerType === 'touch') closeGui(false);
});
groot.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('pointerlockchange', () => { if (G && document.pointerLockElement) try { document.exitPointerLock(); } catch (e) { /* ignore */ } });
addEventListener('resize', () => { if (G) { buildGui(); renderGui(); } });
on('invChange', () => { if (G) renderGui(); });
function furnaceAt(i) { let F = FURN.get(i); if (!F) FURN.set(i, F = { s: [null, null, null], burn: 0, burnMax: 0, cook: 0, xp: 0 }); return F; }
function chestAt(i) { let a = CHESTS.get(i); if (!a) CHESTS.set(i, a = Array(27).fill(null)); return a; }
function openGui(kind, x, y, z) {
  if (state !== 'play' || G || !hasInv() || (Inv.isOpen && Inv.isOpen())) return;
  const i = IDX(x, y, z);
  if (kind === 'furnace') G = { kind, x, y, z, cells: [i], F: furnaceAt(i), who: cur };
  else {
    const p = partnerOf(x, y, z), cells = [i];
    if (p) { const j = IDX(...p); if (gm(x, y, z) & 4) cells.push(j); else cells.unshift(j); }
    G = { kind, x, y, z, cells, arrs: cells.map(chestAt), who: cur };
    for (const c of cells) { const cx = c % WX, cz = ((c / WX) | 0) % WZ, cy = (c / WXZ) | 0; const mesh = chestMeshes.get(IDX(cx, cy, cz)); if (mesh) mesh.open = true; }
    chestSound(true);
  }
  state = 'gui'; mining = false; groot.hidden = false; carry = null; tipEl.hidden = true;
  if (document.pointerLockElement) try { document.exitPointerLock(); } catch (e) { /* not locked */ }
  buildGui(); renderGui(); uiSnd();
}
function closeGui(relock) {
  if (!G) return;
  if (carry) { const left = moveInto(Inv.bag().main, INV_ORDER, carry); if (left) drop(left.id, left.n, PL().eye.x, PL().eye.y, PL().eye.z); carry = null; }
  if (G.kind === 'chest') { for (const c of chestMeshes.values()) c.open = false; chestSound(false); }
  G = null; groot.hidden = true; tipEl.hidden = true; hover = null;
  if (state === 'gui') state = 'play';
  if (relock && !TOUCH && !noLock) try { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) { /* click to capture */ }
  canvas.focus(); refreshInv();
}
on('key', e => {
  if (state === 'sleep') return true;
  if (state !== 'gui' || !G) return false;
  if (e.code === 'KeyE' || e.code === 'Escape') closeGui(e.code === 'KeyE');
  else if (/^Digit[1-9]$/.test(e.code) && hover) {       // hover a slot and press 1-9 to swap with that hotbar slot
    const k = +e.code.slice(5) - 1, ref = hover.ref, bag = Inv.bag(), a = ref.arr[ref.i], b = bag.main[k];
    if ((!b || accepts(ref, b)) && !(ref.arr === bag.main && ref.i === k) && ref.kind !== 'fout') { ref.arr[ref.i] = b; bag.main[k] = a; uiSnd(); refreshInv(); renderGui(); }
  }
  return true;
});

// ---------------------------------------------------------------------
//  Furnaces keep smelting with the screen closed
// ---------------------------------------------------------------------
function tickFurnaces(dt) {
  for (const [i, F] of FURN) {
    const t = world[i]; if (t !== FURNACE && t !== FURNACE_LIT) { FURN.delete(i); continue; }
    const r = F.s[0] && SMELT[F.s[0].id], out = F.s[2];
    const can = !!r && typeof ITEMS !== 'undefined' && !!ITEMS[r.out] && (!out || (out.id === r.out && out.n < maxStack(r.out)));
    if (F.burn <= 0 && can && F.s[1] && fuelOf(F.s[1].id)) { F.burnMax = F.burn = fuelOf(F.s[1].id); if (!--F.s[1].n) F.s[1] = null; }
    if (F.burn > 0) {
      F.burn -= dt;
      if (can) { F.cook += dt; if (F.cook >= r.secs) { F.cook = 0; if (!--F.s[0].n) F.s[0] = null; if (out) out.n++; else F.s[2] = mkStack(r.out, 1); F.xp += r.xp; } }
      else F.cook = 0;
    } else { F.burn = 0; F.cook = Math.max(0, F.cook - dt * 2); }
    const lit = F.burn > 0;
    if (lit !== (t === FURNACE_LIT)) { world[i] = lit ? FURNACE_LIT : FURNACE; rebuildAround(i % WX, ((i / WX) | 0) % WZ); }
  }
}

// ---------------------------------------------------------------------
//  Per-frame work and hooks
// ---------------------------------------------------------------------
const tmpC = new THREE.Color();
on('frame', (dt, rawDt) => {
  tickFurnaces(rawDt);
  updateFalling(rawDt);
  updateParticles(rawDt);
  for (const c of chestMeshes.values()) {
    const target = c.open ? 1 : 0; c.ang += (target - c.ang) * Math.min(1, rawDt * 9); c.lid.rotation.x = -c.ang * 1.45;
    meshLight(c.mat.color, c.x, c.y, c.z);
  }
  if (G) {
    const P = PL(), cx = G.x + .5, cz = G.z + .5, gone = !G.cells.every(i => G.kind === 'furnace' ? world[i] === FURNACE || world[i] === FURNACE_LIT : world[i] === CHEST);
    if (gone || G.who !== cur || Math.hypot(P.pos.x - cx, P.pos.z - cz, P.pos.y - G.y) > 8) closeGui(false);
    else if ((furnT -= rawDt) <= 0 && G.kind === 'furnace') { furnT = .2; renderGui(); }
  }
  if (tipT > 0 && (tipT -= rawDt) <= 0) tipEl.hidden = true;
});
on('tick', rawDt => {
  updateSleep(rawDt);
  // shaped blocks get a fitted selection box
  if (state === 'play' && outline.visible) {
    const h = targetBlock(), b = h && BLOCK[h.t];
    if (b && (b.shape || (h.t === TORCH && !gm(h.x, h.y, h.z)))) {
      const bx = h.t === TORCH ? [TORCH_BOX] : b.shape(h.x, h.y, h.z, gm(h.x, h.y, h.z), false), u = [1, 1, 1, 0, 0, 0];
      for (const q of bx) for (let k = 0; k < 3; k++) { u[k] = Math.min(u[k], q[k]); u[k + 3] = Math.max(u[k + 3], q[k + 3]); }
      outline.scale.set(u[3] - u[0], Math.min(1, u[4]) - u[1], u[5] - u[2]);
      outline.position.set(h.x + (u[0] + u[3]) / 2, h.y + (u[1] + Math.min(1, u[4])) / 2, h.z + (u[2] + u[5]) / 2);
    }
  }
});

// ---------------------------------------------------------------------
//  Saving (through mobs.js's Save hooks when present)
// ---------------------------------------------------------------------
const pk = s => s ? [s.id, s.n, s.dur] : 0;
const upk = a => { if (!Array.isArray(a) || typeof ITEMS === 'undefined' || !ITEMS[a[0]]) return null; const s = { id: a[0], n: Math.max(1, a[1] | 0) }; if (ITEMS[a[0]].durability) s.dur = a[2] > 0 ? a[2] : ITEMS[a[0]].durability; return s; };
on('save', data => {
  if (!data) return;
  const meta = []; for (let i = 0; i < NCELL; i++) if (META[i]) meta.push(i, META[i]);
  data.blocks = { v: 1, meta, chests: [...CHESTS].map(([i, a]) => [i, a.map(pk)]), furn: [...FURN].map(([i, F]) => [i, F.s.map(pk), F.burn, F.burnMax, F.cook, F.xp]),
    spawns: DEFS.map(d => d.pos ? d.pos.slice() : null) };
});
on('load', data => {
  const b = data && data.blocks;
  META.fill(0); CHESTS.clear(); FURN.clear();
  if (b && b.v === 1) {
    for (let k = 0; k + 1 < (b.meta || []).length; k += 2) META[b.meta[k]] = b.meta[k + 1];
    for (const [i, a] of b.chests || []) CHESTS.set(i, Array.from({ length: 27 }, (_, k) => upk(a[k])));
    for (const [i, s, burn, burnMax, cook, xp] of b.furn || []) FURN.set(i, { s: [0, 1, 2].map(k => upk(s[k])), burn: +burn || 0, burnMax: +burnMax || 0, cook: +cook || 0, xp: +xp || 0 });
    (b.spawns || []).forEach((p, k) => { if (DEFS[k] && Array.isArray(p)) DEFS[k].pos = p; });
  }
  relightAll();
});
function relightAll() {
  relight(0, WX - 1, 0, WZ - 1, false);
  for (let cz = 0; cz < NCZ; cz++) for (let cx = 0; cx < NCX; cx++) buildChunk(cx, cz);
  syncChests(0, WX - 1, 0, WZ - 1);
}

// ---------------------------------------------------------------------
//  World touches: a few gravel patches on beaches and sea floors, then light everything
// ---------------------------------------------------------------------
for (let k = 0; k < 60; k++) {
  const x = 4 + ((rr() * (WX - 8)) | 0), z = 4 + ((rr() * (WZ - 8)) | 0), g = groundY(x, z);
  if (g.t !== SAND || g.y - 1 > SEA + 1) continue;
  const r = 1 + ((rr() * 2) | 0);
  for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) { if (dx * dx + dz * dz > r * r + 1 || rr() < .2) continue;
    const gy = groundY(x + dx, z + dz); if (gy.t === SAND) { set(x + dx, gy.y - 1, z + dz, GRAVEL); if (get(x + dx, gy.y - 2, z + dz) === SAND) set(x + dx, gy.y - 2, z + dz, GRAVEL); } }
}
relightAll();
// modules loaded after this one may have edited the world: relight once more when the game starts
on('start', () => { relight(0, WX - 1, 0, WZ - 1, true); rebuildDirty(); syncChests(0, WX - 1, 0, WZ - 1); });

// ---------------------------------------------------------------------
//  Public API
// ---------------------------------------------------------------------
const KINDS = { furnace: [FURNACE, FURNACE_LIT], chest: [CHEST], bed: [BED], workbench: [WORKBENCH], door: [DOOR] };
function isNear(kind, r = 4) {
  const ids = typeof kind === 'number' ? [kind] : KINDS[kind] || []; if (!ids.length) return false;
  const p = PL().pos, bx = Math.floor(p.x), by = Math.floor(p.y), bz = Math.floor(p.z);
  for (let y = -2; y <= 3; y++) for (let z = -r; z <= r; z++) for (let x = -r; x <= r; x++) if (ids.includes(get(bx + x, by + y, bz + z))) return true;
  return false;
}
Object.assign(Stations, {
  addSmelt, addFuel: (id, secs) => { FUEL[id] = secs; }, smeltResult: id => SMELT[id] ? { ...SMELT[id] } : null, fuelTime: fuelOf, isNear,
  open: (x, y, z) => { const t = get(x, y, z); if (t === CHEST) openGui('chest', x, y, z); else if (t === FURNACE || t === FURNACE_LIT) openGui('furnace', x, y, z); },
  isOpen: () => !!G, close: () => closeGui(!TOUCH), isSleeping: () => !!sleep,
  ids: { FURNACE, FURNACE_LIT, CHEST, BED, DOOR, LADDER, OAK_SLAB, COBBLE_SLAB, OAK_STAIRS, COBBLE_STAIRS, FENCE, GRAVEL },
  getMeta: gm, setMeta: sm, chest: (x, y, z) => CHESTS.get(IDX(x, y, z)) || null, furnace: (x, y, z) => FURN.get(IDX(x, y, z)) || null,
  checkFall,
});
Object.assign(Light, {
  sky: (x, y, z) => inb(x, y, z) ? SKY[IDX(x, y, z)] : y >= WY ? 15 : 0,
  block: (x, y, z) => inb(x, y, z) ? BL[IDX(x, y, z)] : 0,
  // combined level 0..15 like Minecraft's: sky light is dimmed at night (by up to 11)
  level(x, y, z) {
    x = Math.floor(x); y = Math.floor(y); z = Math.floor(z);
    const t = hasWorld() && World.time01 ? World.time01() : .25, s = Math.sin(t * Math.PI * 2), dk = clamp((s + .22) / .47, 0, 1);
    return Math.max(Light.block(x, y, z), Math.round(Light.sky(x, y, z) - (1 - dk) * 11));
  },
  update: (x, z) => rebuildAround(x, z), recompute: relightAll,
});
})();
