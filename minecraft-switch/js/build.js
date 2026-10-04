"use strict";
// =====================================================================
//  Building and stations (Valheim rules, Minecraft look)
//  - The Hammer: right-click (tap) opens the Build Menu (a Minecraft creative-inventory panel with tabs),
//    pick a piece, a ghost preview follows the crosshair, left-click (Attack) builds it, Q rotates,
//    middle-click (or the Remove tool) takes a piece down and refunds it. Every piece except the
//    Workbench, Campfire and Torch needs a Workbench within 20 blocks.
//  - Structural support: grounded pieces are blue; support drops with every step away (green, yellow,
//    orange, red) and unsupported pieces collapse into their materials.
//  - Stations: Workbench (needs a roof, levels 1-5 from Chopping Block, Tanning Rack, Adze, Tool Shelf),
//    Forge (roof, levels 1-5 from Anvils, Grinding Wheel, Cooler, Toolrack), Cauldron (over a campfire),
//    Campfire + Cooking Spit (meat is done at 25 s and burns to coal at 50 s), Charcoal Kiln (wood to
//    charcoal) and the Smelter fed by hand (charcoal + copper / tin ore).
//  Loaded after darkforest.js (it uses the Smelter block) and blocks.js (Stations.placeList / commitList).
// =====================================================================
const Build = {};
(() => {
const hasInv = () => typeof Inv !== 'undefined' && !!Inv.defineItem;
const S16 = v => v / 16;
const KEY = (x, y, z) => (y * WZ + z) * WX + x;
const unkey = k => { const x = k % WX, z = Math.floor(k / WX) % WZ, y = Math.floor(k / (WX * WZ)); return [x, y, z]; };
const rng = mulberry32(9090), pick = a => a[(rng() * a.length) | 0];
const fill = (g, c, x, y, w = 1, h = 1) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
const noisy = (g, pal, x0 = 0, y0 = 0, w = 16, h = 16) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) fill(g, pick(pal), x, y); };
function addTile(name, draw) {
  tile(name, draw);
  const i = TILE[name], d = ag.getImageData((i % 16) * 16, Math.floor(i / 16) * 16, 16, 16).data; let r = 0, gg = 0, b = 0, n = 0;
  for (let k = 0; k < d.length; k += 4) { if (d[k + 3] < 128) continue; r += d[k]; gg += d[k + 1]; b += d[k + 2]; n++; }
  tileColor[i] = new THREE.Color(r / (n || 1) / 255, gg / (n || 1) / 255, b / (n || 1) / 255); return i;
}
const STONE_P = ['#7f7f7f', '#747474', '#8a8a8a', '#6c6c6c'], DARK_P = ['#3a3a3a', '#333', '#414141', '#2d2d2d'];
const WOOD_P = ['#a0692b', '#9a6428', '#a8722f', '#94602a'], BARK_P = ['#6b5030', '#5f4528', '#735634'];
const COPPER_P = ['#c8743a', '#b8652e', '#d48448'];

// ---------------------------------------------------------------------
//  Tiles
// ---------------------------------------------------------------------
const tCampSide = addTile('bm_camp_side', g => { noisy(g, STONE_P); for (let x = 0; x < 16; x += 4) fill(g, '#4e4e4e', x, 0, 1, 16); fill(g, '#4e4e4e', 0, 7, 16, 1); });
const tCampTop = addTile('bm_camp_top', g => { noisy(g, STONE_P); noisy(g, ['#2a1a10', '#3a2414', '#1e140c'], 3, 3, 10, 10);
  noisy(g, BARK_P, 2, 7, 12, 2); noisy(g, BARK_P, 7, 2, 2, 12); for (const [x, y] of [[5, 5], [10, 6], [6, 10], [9, 9], [4, 9], [11, 4]]) fill(g, pick(['#ff8c1a', '#ffd23a', '#e85a10']), x, y); });
const tLogSide = TILE.log_side, tLogTop = TILE.log_top, tPlanks = TILE.planks;
const tForgeSide = addTile('bm_forge_side', g => { noisy(g, STONE_P); for (let y = 3; y < 16; y += 4) fill(g, '#555', 0, y, 16, 1); for (let y = 0; y < 16; y += 4) fill(g, '#555', (y / 4) % 2 ? 4 : 10, y, 1, 3);
  noisy(g, COPPER_P, 0, 0, 16, 2); fill(g, '#7a4420', 0, 2, 16, 1); });
const tForgeTop = addTile('bm_forge_top', g => { noisy(g, STONE_P); noisy(g, ['#1e1e1e', '#2a2a2a'], 2, 2, 12, 12); for (let k = 0; k < 18; k++) fill(g, pick(['#ff6a00', '#ffb000', '#c83c00', '#3a1a10']), 3 + ((rng() * 10) | 0), 3 + ((rng() * 10) | 0)); });
const tForgeFront = addTile('bm_forge_front', g => { noisy(g, STONE_P); noisy(g, COPPER_P, 0, 0, 16, 2); fill(g, '#2a1a12', 4, 6, 8, 7);
  noisy(g, ['#ff8c1a', '#ffb000', '#ff6a00', '#c83c00'], 5, 9, 6, 3); fill(g, '#555', 3, 5, 10, 1); fill(g, '#555', 3, 13, 10, 1); });
const tKilnSide = addTile('bm_kiln_side', g => { noisy(g, STONE_P); for (let y = 2; y < 16; y += 3) fill(g, '#5c5c5c', 0, y, 16, 1); fill(g, '#2b2b2b', 0, 0, 16, 1); });
const tKilnTop = addTile('bm_kiln_top', g => { noisy(g, STONE_P); fill(g, '#262626', 5, 5, 6, 6); fill(g, '#3a3a3a', 6, 6, 4, 4); });
const tKilnFront = addTile('bm_kiln_front', g => { noisy(g, STONE_P); for (let y = 2; y < 16; y += 3) fill(g, '#5c5c5c', 0, y, 16, 1);
  fill(g, '#1a1a1a', 4, 7, 8, 7); fill(g, '#4a4a4a', 4, 6, 8, 1); noisy(g, ['#ff6a00', '#c83c00', '#401808'], 5, 11, 6, 2); });
const tCauldSide = addTile('bm_cauldron_side', g => { noisy(g, DARK_P); fill(g, '#5a5a5a', 0, 0, 16, 2); fill(g, '#222', 0, 2, 16, 1); fill(g, '#4a4a4a', 0, 13, 16, 1); });
const tCauldTop = addTile('bm_cauldron_top', g => { noisy(g, DARK_P); noisy(g, ['#6b4a2a', '#7a5632', '#5e3f22', '#8a6a3a'], 2, 2, 12, 12); fill(g, '#a08050', 6, 5, 2, 1); fill(g, '#a08050', 9, 9, 1, 1); });
const tChopTop = addTile('bm_chop_top', g => { const t = TILE.log_top; g.drawImage(ATLAS, (t % 16) * 16, Math.floor(t / 16) * 16, 16, 16, 0, 0, 16, 16);
  fill(g, '#8a8a8a', 3, 6, 6, 2); fill(g, '#cfcfcf', 3, 6, 6, 1); fill(g, '#5a3a1a', 9, 6, 5, 1); });
const tTan = addTile('bm_tan', g => { noisy(g, WOOD_P); noisy(g, ['#b58457', '#a87a4e', '#c4936a', '#9c6e44'], 2, 2, 12, 12);
  for (const [x, y] of [[2, 2], [13, 2], [2, 13], [13, 13]]) fill(g, '#4a2f12', x, y); fill(g, '#8a5e38', 5, 6, 2, 1); fill(g, '#8a5e38', 9, 10, 2, 1); });
const tAdze = addTile('bm_adze', g => { noisy(g, WOOD_P); fill(g, '#4a2f12', 0, 0, 16, 1); fill(g, '#5a3a1a', 3, 3, 10, 2); fill(g, '#9a9a9a', 11, 2, 3, 5); fill(g, '#dcdcdc', 11, 6, 3, 1); });
const tShelf = addTile('bm_shelf', g => { noisy(g, WOOD_P); fill(g, '#4a2f12', 0, 7, 16, 1); fill(g, '#4a2f12', 0, 15, 16, 1);
  fill(g, '#9a9a9a', 2, 2, 1, 5); fill(g, '#9a9a9a', 1, 2, 3, 1); fill(g, '#6b4a2a', 6, 1, 1, 6); fill(g, '#bdbdbd', 5, 1, 3, 2); fill(g, '#8a8a8a', 11, 3, 3, 3); fill(g, '#6b4a2a', 12, 6, 1, 1);
  fill(g, '#6b4a2a', 3, 9, 1, 6); fill(g, '#9a9a9a', 2, 9, 3, 2); fill(g, '#c8743a', 9, 10, 4, 3); });
const tAnvil = addTile('bm_anvil', g => { noisy(g, ['#4a4a4a', '#444', '#505050', '#3e3e3e']); fill(g, '#6a6a6a', 0, 0, 16, 1); fill(g, '#2a2a2a', 0, 15, 16, 1); });
const tCoolSide = addTile('bm_cooler_side', g => { noisy(g, WOOD_P); for (let x = 0; x < 16; x += 4) fill(g, '#6b4a2a', x, 0, 1, 16); noisy(g, COPPER_P, 0, 2, 16, 1); noisy(g, COPPER_P, 0, 12, 16, 1); });
const tCoolTop = addTile('bm_cooler_top', g => { noisy(g, WOOD_P); noisy(g, ['#2f5fb4', '#3a6cc4', '#2a54a0'], 2, 2, 12, 12); });
const tGrind = addTile('bm_grind', g => { noisy(g, STONE_P); for (let k = 0; k < 16; k++) fill(g, '#9a9a9a', k, k); fill(g, '#5a3a1a', 7, 0, 2, 16); });
const tRug = addTile('bm_rug', g => { noisy(g, ['#b07a4a', '#a46e40', '#bc8656']); for (let k = 0; k < 9; k++) fill(g, '#f0e0c8', 2 + ((rng() * 12) | 0), 2 + ((rng() * 12) | 0)); fill(g, '#6b4a2a', 0, 0, 16, 1); fill(g, '#6b4a2a', 0, 15, 16, 1); });
const tStake = addTile('bm_stake', g => { for (let x = 0; x < 16; x += 4) { noisy(g, BARK_P, x, 0, 4, 16); fill(g, '#3a2a18', x, 0, 1, 16); } });
const tStakeTop = addTile('bm_stake_top', g => { noisy(g, ['#b8945a', '#a8844e']); for (let x = 0; x < 16; x += 4) fill(g, '#3a2a18', x, 0, 1, 16); });

// ---------------------------------------------------------------------
//  Blocks (shapes in 1/16 units; facing m&3: 0 -x, 1 +x, 2 -z, 3 +z, boxes drawn for +z)
// ---------------------------------------------------------------------
const nb = (name, tiles, sound, o = {}) => { const id = BLOCK.length; def(id, name, tiles, sound, o); return id; };
const B16 = a => a.map(v => v / 16);
function rotF(b, f) {
  let [x0, y0, z0, x1, y1, z1] = b;
  if (f === 2) [z0, z1] = [1 - z1, 1 - z0];
  else if (f === 1) [x0, z0, x1, z1] = [z0, x0, z1, x1];
  else if (f === 0) [x0, z0, x1, z1] = [1 - z1, x0, 1 - z0, x1];
  return [x0, y0, z0, x1, y1, z1];
}
const shaped = (boxes, facing) => { const bx = boxes.map(B16); return facing ? (x, y, z, m) => bx.map(b => rotF(b, m & 3)) : () => bx; };
const CAMP_BOX = [[1, 0, 1, 15, 2, 15], [2, 2, 7, 14, 5, 9], [7, 2, 2, 9, 5, 14]];
const SPIT_BOX = CAMP_BOX.concat([[0, 0, 7, 2, 14, 9], [14, 0, 7, 16, 14, 9], [0, 12, 7.5, 16, 13, 8.5]]);
const CAMPFIRE = nb('Campfire', [tCampSide, tCampSide, tCampSide, tCampTop, tCampSide, tCampSide], 'stone', { opaque: false });
const CAMPFIRE_SPIT = nb('Campfire with Spit', [tCampSide, tCampSide, tCampSide, tCampTop, tCampSide, tCampSide], 'stone', { opaque: false });
const BEAM = nb('Wood Beam', [tLogSide, tLogSide, tLogTop, tLogTop, tLogSide, tLogSide], 'wood', { opaque: false });
const FORGE = nb('Forge', [tForgeSide, tForgeSide, tForgeSide, tForgeTop, tForgeSide, tForgeFront], 'stone');
const KILN = nb('Charcoal Kiln', [tKilnSide, tKilnSide, tKilnSide, tKilnTop, tKilnSide, tKilnFront], 'stone');
const CAULDRON = nb('Cauldron', [tCauldSide, tCauldSide, tCauldSide, tCauldTop, tCauldSide, tCauldSide], 'stone', { opaque: false });
const CHOP = nb('Chopping Block', [tLogSide, tLogSide, tLogTop, tChopTop, tLogSide, tLogSide], 'wood', { opaque: false });
const TANRACK = nb('Tanning Rack', Array(6).fill(tTan), 'wood', { opaque: false });
const ADZE = nb('Adze', [tAdze, tAdze, tPlanks, tAdze, tAdze, tAdze], 'wood', { opaque: false });
const SHELF = nb('Tool Shelf', [tPlanks, tPlanks, tPlanks, tPlanks, tShelf, tShelf], 'wood', { opaque: false });
const ANVILS = nb('Forge Anvils', Array(6).fill(tAnvil), 'stone', { opaque: false });
const GRINDER = nb('Grinding Wheel', Array(6).fill(tGrind), 'stone', { opaque: false });
const COOLER = nb('Forge Cooler', [tCoolSide, tCoolSide, tCoolSide, tCoolTop, tCoolSide, tCoolSide], 'wood', { opaque: false });
const TOOLRACK = nb('Forge Toolrack', [tPlanks, tPlanks, tPlanks, tPlanks, tShelf, tShelf], 'wood', { opaque: false });
const BENCH = nb('Wood Bench', Array(6).fill(tPlanks), 'wood', { opaque: false });
const TABLE = nb('Wood Table', Array(6).fill(tPlanks), 'wood', { opaque: false });
const RUG = nb('Deer Rug', Array(6).fill(tRug), 'wool', { opaque: false });
const STAKES = nb('Stake Wall', [tStake, tStake, tStakeTop, tStakeTop, tStake, tStake], 'wood');
const SHAPE_BOXES = {
  [CAMPFIRE]: [CAMP_BOX, false], [CAMPFIRE_SPIT]: [SPIT_BOX, false],
  [CAULDRON]: [[[2, 0, 2, 14, 9, 14], [1, 7, 1, 15, 9, 15]], false],
  [CHOP]: [[[3, 0, 3, 13, 9, 13]], false],
  [TANRACK]: [[[1, 0, 7, 3, 16, 9], [13, 0, 7, 15, 16, 9], [3, 3, 7.5, 13, 14, 8.5]], true],
  [ADZE]: [[[2, 0, 4, 14, 7, 12], [10, 7, 6, 13, 12, 10]], true],
  [SHELF]: [[[0, 0, 0, 16, 16, 3], [0, 7, 0, 16, 8, 6]], true],
  [ANVILS]: [[[4, 0, 4, 12, 4, 12], [5, 4, 6, 11, 6, 10], [1, 6, 5, 15, 10, 11]], true],
  [GRINDER]: [[[2, 0, 6, 14, 3, 10], [3, 3, 7, 13, 13, 9]], true],
  [COOLER]: [[[2, 0, 2, 14, 12, 14]], false],
  [TOOLRACK]: [[[0, 0, 0, 16, 16, 3], [0, 7, 0, 16, 8, 6]], true],
  [BENCH]: [[[0, 6, 4, 16, 8, 12], [1, 0, 5, 3, 6, 11], [13, 0, 5, 15, 6, 11]], true],
  [TABLE]: [[[0, 13, 0, 16, 16, 16], [6, 0, 6, 10, 13, 10]], false],
  [RUG]: [[[0, 0, 0, 16, 1, 16]], false],
};
for (const t in SHAPE_BOXES) { const [bx, f] = SHAPE_BOXES[t]; BLOCK[t].shape = shaped(bx, f); }
const BEAM_BOX = [B16([5, 0, 5, 11, 16, 11]), B16([0, 5, 5, 16, 11, 11]), B16([5, 5, 0, 11, 11, 16])];
BLOCK[BEAM].shape = (x, y, z, m) => [BEAM_BOX[m % 3]];
BLOCK[FORGE].orient = BLOCK[KILN].orient = true;
BLOCK[CAMPFIRE].emit = BLOCK[CAMPFIRE_SPIT].emit = 14; BLOCK[FORGE].emit = 9;
const SM = () => (typeof DarkForest !== 'undefined' && DarkForest.blocks && DarkForest.blocks.SMELTER) || -1;
if (typeof Stations !== 'undefined' && Stations.iconBoxes) {
  for (const t in SHAPE_BOXES) Stations.iconBoxes(+t, SHAPE_BOXES[t][0].map(B16));
  Stations.iconBoxes(BEAM, [BEAM_BOX[0]]);
}

// ---------------------------------------------------------------------
//  Pieces: what the Hammer can build
// ---------------------------------------------------------------------
const ids = () => (typeof Stations !== 'undefined' && Stations.ids) || {};
const TABS = [['misc', 'Misc'], ['craft', 'Crafting'], ['build', 'Building'], ['furn', 'Furniture'], ['def', 'Defense']];
// mat: wood / core / stone (support loss); free: no Workbench needed; orient: 'face' | 'beam'; via: Minecraft placing rules from blocks.js
const PIECES = [
  { id: 'campfire', name: 'Campfire', tab: 'misc', block: CAMPFIRE, cost: { stone: 5, wood: 2 }, free: true, mat: 'stone', desc: 'Light, warmth and Rested. Build a Cooking Spit on it.' },
  { id: 'torch', name: 'Standing Torch', tab: 'misc', block: () => TORCH, via: true, cost: { wood: 1, resin: 1 }, free: true, mat: 'wood', desc: 'A torch on the ground or on a wall.' },
  { id: 'remove', name: 'Remove', tab: 'misc', tool: 'remove', cost: {}, free: true, desc: 'Takes a piece down and gives back its materials.' },
  { id: 'workbench', name: 'Workbench', tab: 'craft', block: () => WORKBENCH, cost: { wood: 10 }, free: true, mat: 'wood', orient: 'face', desc: 'Lets you build and craft nearby. Needs a roof.' },
  { id: 'chopping_block', name: 'Chopping Block', tab: 'craft', block: CHOP, cost: { wood: 10, flint: 5 }, mat: 'wood', up: 'workbench', desc: 'Workbench upgrade (+1 level). Within 5 blocks, under the roof.' },
  { id: 'tanning_rack', name: 'Tanning Rack', tab: 'craft', block: TANRACK, cost: { wood: 10, flint: 10, deer_hide: 2 }, mat: 'wood', orient: 'face', up: 'workbench', desc: 'Workbench upgrade (+1 level).' },
  { id: 'adze', name: 'Adze', tab: 'craft', block: ADZE, cost: { wood: 10, flint: 10 }, mat: 'wood', orient: 'face', up: 'workbench', desc: 'Workbench upgrade (+1 level).' },
  { id: 'tool_shelf', name: 'Tool Shelf', tab: 'craft', block: SHELF, cost: { wood: 10, bronze: 2 }, mat: 'wood', orient: 'face', up: 'workbench', desc: 'Workbench upgrade (+1 level).' },
  { id: 'cooking_spit', name: 'Cooking Spit', tab: 'craft', block: CAMPFIRE_SPIT, special: 'spit', cost: { wood: 2 }, free: true, mat: 'stone', desc: 'Build it on a campfire. Hang raw meat on it, take it off before it burns.' },
  { id: 'charcoal_kiln', name: 'Charcoal Kiln', tab: 'craft', block: KILN, cost: { stone: 20, ember_core: 2 }, mat: 'stone', orient: 'face', desc: 'Feed it wood (use it while holding wood). Makes charcoal.' },
  { id: 'smelter', name: 'Smelter', tab: 'craft', block: SM, cost: { stone: 20, resin: 4, ember_core: 2 }, mat: 'stone', orient: 'face', desc: 'Feed it charcoal and copper or tin ore. Makes metal.' },
  { id: 'forge', name: 'Forge', tab: 'craft', block: FORGE, cost: { stone: 4, charcoal: 4, wood: 10, copper: 6 }, mat: 'stone', orient: 'face', desc: 'Makes bronze and metal gear. Needs a roof.' },
  { id: 'forge_anvils', name: 'Forge Anvils', tab: 'craft', block: ANVILS, cost: { wood: 5, bronze: 2 }, mat: 'stone', orient: 'face', up: 'forge', desc: 'Forge upgrade (+1 level).' },
  { id: 'grinding_wheel', name: 'Grinding Wheel', tab: 'craft', block: GRINDER, cost: { wood: 15, stone: 10 }, mat: 'stone', orient: 'face', up: 'forge', desc: 'Forge upgrade (+1 level).' },
  { id: 'forge_cooler', name: 'Forge Cooler', tab: 'craft', block: COOLER, cost: { wood: 10, copper: 10 }, mat: 'wood', up: 'forge', desc: 'Forge upgrade (+1 level).' },
  { id: 'forge_toolrack', name: 'Forge Toolrack', tab: 'craft', block: TOOLRACK, cost: { wood: 10, bronze: 4 }, mat: 'wood', orient: 'face', up: 'forge', desc: 'Forge upgrade (+1 level).' },
  { id: 'cauldron', name: 'Cauldron', tab: 'craft', block: CAULDRON, special: 'overfire', cost: { tin: 10 }, mat: 'stone', desc: 'Build it on top of a campfire. Cooks stews and soups.' },
  { id: 'wood_wall', name: 'Wood Wall', tab: 'build', block: () => PLANKS, cost: { wood: 2 }, mat: 'wood', desc: 'One block of planks.' },
  { id: 'wood_floor', name: 'Wood Floor', tab: 'build', block: () => ids().OAK_SLAB, via: true, cost: { wood: 1 }, mat: 'wood', desc: 'Half a block. Two make a full block.' },
  { id: 'wood_stair', name: 'Wood Roof / Stair', tab: 'build', block: () => ids().OAK_STAIRS, via: true, cost: { wood: 2 }, mat: 'wood', desc: 'Roofs and stairs. Rain stays out.' },
  { id: 'wood_beam', name: 'Wood Beam', tab: 'build', block: BEAM, orient: 'beam', cost: { wood: 1 }, mat: 'wood', desc: 'Upright on floors, sideways out of walls. Q turns it.' },
  { id: 'log_pillar', name: 'Core Wood Pillar', tab: 'build', block: () => LOG, cost: { wood: 4 }, mat: 'core', desc: 'A whole log. Carries weight further up.' },
  { id: 'wood_door', name: 'Wood Door', tab: 'build', block: () => ids().DOOR, via: true, cost: { wood: 4 }, mat: 'wood', desc: 'Two blocks high. Use it to open.' },
  { id: 'ladder', name: 'Ladder', tab: 'build', block: () => ids().LADDER, via: true, cost: { wood: 3 }, mat: 'wood', desc: 'Goes on a wall.' },
  { id: 'stone_wall', name: 'Stone Wall', tab: 'build', block: () => COBBLE, cost: { stone: 4 }, mat: 'stone', desc: 'Strong, but it needs the ground under it.' },
  { id: 'stone_floor', name: 'Stone Floor', tab: 'build', block: () => ids().COBBLE_SLAB, via: true, cost: { stone: 2 }, mat: 'stone', desc: 'Half a block of stone.' },
  { id: 'stone_stair', name: 'Stone Stair', tab: 'build', block: () => ids().COBBLE_STAIRS, via: true, cost: { stone: 3 }, mat: 'stone', desc: 'Stone steps.' },
  { id: 'bed', name: 'Bed', tab: 'furn', block: () => ids().BED, via: true, cost: { wood: 8, deer_hide: 2 }, mat: 'wood', desc: 'Sleep and respawn here. Needs a roof and a fire.' },
  { id: 'chest', name: 'Chest', tab: 'furn', block: () => ids().CHEST, via: true, cost: { wood: 10 }, mat: 'wood', desc: 'Holds 27 stacks.' },
  { id: 'wood_bench', name: 'Wood Bench', tab: 'furn', block: BENCH, orient: 'face', cost: { wood: 4 }, mat: 'wood', desc: 'Comfort +1.' },
  { id: 'wood_table', name: 'Wood Table', tab: 'furn', block: TABLE, cost: { wood: 6 }, mat: 'wood', desc: 'Comfort +1.' },
  { id: 'deer_rug', name: 'Deer Rug', tab: 'furn', block: RUG, cost: { deer_hide: 4 }, mat: 'wood', desc: 'Comfort +1.' },
  { id: 'stake_wall', name: 'Stake Wall', tab: 'def', block: STAKES, cost: { wood: 4 }, mat: 'core', desc: 'Sharp logs. Keeps the grey folk out.' },
  { id: 'wood_fence', name: 'Wood Fence', tab: 'def', block: () => ids().FENCE, via: true, cost: { wood: 2 }, mat: 'wood', desc: 'Joins up with its neighbours.' },
];
const PIECE = {}; for (const p of PIECES) PIECE[p.id] = p;
const blockOf = p => typeof p.block === 'function' ? p.block() : p.block;
// support loss per step: [vertical, horizontal]
const MATL = { wood: [.125, .11], core: [.08, .15], stone: [.05, .5] };
const UPS = { workbench: [CHOP, TANRACK, ADZE, SHELF], forge: [ANVILS, GRINDER, COOLER, TOOLRACK] };

// items for the new blocks (names, icons, quest checks); they are only ever placed by the Hammer
if (hasInv()) {
  const di = (id, block, o = {}) => Inv.defineItem(Object.assign({ id, name: PIECE[id] ? PIECE[id].name : BLOCK[block].name, kind: 'station', block, weight: 5, desc: PIECE[id] ? PIECE[id].desc : '' }, o));
  di('campfire', CAMPFIRE); di('cooking_spit', CAMPFIRE_SPIT); di('forge', FORGE); di('charcoal_kiln', KILN); di('cauldron', CAULDRON);
  di('chopping_block', CHOP); di('tanning_rack', TANRACK); di('adze', ADZE); di('tool_shelf', SHELF); di('forge_anvils', ANVILS); di('grinding_wheel', GRINDER);
  di('forge_cooler', COOLER); di('forge_toolrack', TOOLRACK); di('wood_bench', BENCH, { kind: 'block' }); di('wood_table', TABLE, { kind: 'block' });
  di('deer_rug', RUG, { kind: 'block' }); di('wood_beam', BEAM, { kind: 'block' }); di('stake_wall', STAKES, { kind: 'block' });
}

// ---------------------------------------------------------------------
//  World helpers
// ---------------------------------------------------------------------
const air = t => t === AIR || t === WATER || (BLOCK[t] && BLOCK[t].kind === 'cross' && t !== TORCH);
const solidT = t => !!t && t !== WATER && BLOCK[t] && BLOCK[t].solid && BLOCK[t].kind !== 'cross';
function roofed(x, y, z) { for (let yy = y + 1; yy < WY; yy++) if (solidT(get(x, yy, z)) && !/Leaves|Needles/.test(BLOCK[get(x, yy, z)].name)) return true; return false; }
function findNear(ts, p, r, ry = 3) {
  const out = [], bx = Math.floor(p.x), by = Math.floor(p.y), bz = Math.floor(p.z);
  for (let y = -ry; y <= ry; y++) for (let z = -r; z <= r; z++) for (let x = -r; x <= r; x++) { const t = get(bx + x, by + y, bz + z); if (ts.includes(t)) out.push([bx + x, by + y, bz + z, t]); }
  return out;
}
const fireBelow = p => [CAMPFIRE, CAMPFIRE_SPIT].includes(get(p.x, p.y - 1, p.z));
function stationLevel(p, kind) {
  const ups = new Set();
  for (const [x, y, z, t] of findNear(UPS[kind], p, 5, 3)) if (roofed(x, y, z)) ups.add(t);
  return 1 + ups.size;
}
let benchT = 0, benchHit = false;
function benchNear(force) {
  if (!force && benchT > 0) return benchHit;
  benchT = .5; const p = PL().pos, bx = Math.floor(p.x), by = Math.floor(p.y), bz = Math.floor(p.z); benchHit = false;
  for (let y = -8; y <= 8 && !benchHit; y++) for (let z = -20; z <= 20 && !benchHit; z++) for (let x = -20; x <= 20; x++) if (get(bx + x, by + y, bz + z) === WORKBENCH) { benchHit = true; break; }
  return benchHit;
}
function dropAt(id, n, x, y, z) {
  if (!id || !n || !ITEMS[id]) return;
  if (typeof World !== 'undefined' && World.spawnDrop) World.spawnDrop(id, n, new V3(x, y, z)); else if (hasInv()) Inv.add(id, n);
}
const refundId = k => k === 'stone' ? 'stone' : k === 'charcoal' ? 'charcoal' : k;
function giveBack(cost, x, y, z) { for (const [k, n] of Object.entries(cost)) dropAt(refundId(k), n, x + .5, y + .5, z + .5); }
const itemName = k => ITEMS[k] ? ITEMS[k].name : k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
const hasCost = cost => Object.entries(cost).every(([k, n]) => Inv.count(k) >= n);
const heldId = () => { const s = hasInv() && Inv.held(); return s ? (Inv.baseId ? Inv.baseId(s.id) : s.id) : null; };
const hammerHeld = () => heldId() === 'hammer';
const isTag = (id, tag) => !!id && (id === tag || !!(ITEMS[id] && ITEMS[id].tags && ITEMS[id].tags.includes(tag)));
function sfxPlace(t) { try { SFX.block(t, 'place'); } catch (e) { /* audio */ } PL().swing = 1; swingT = 1; }
function pop(f = 900) { if (AC) try { click(AC.currentTime, f, .08); } catch (e) { /* audio */ } }

// action bar text above the hotbar (Minecraft style)
const msgEl = document.createElement('div'); msgEl.id = 'bmMsg'; document.body.appendChild(msgEl);
let msgT = 0;
function msg(t, secs = 2.5) { msgEl.textContent = t; msgEl.style.opacity = 1; msgT = secs; }

// ---------------------------------------------------------------------
//  Structural support
// ---------------------------------------------------------------------
const BUILT = new Map();          // cell key -> { k: piece id, t: block id, s: support }
const N6 = [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, 1, 0], [0, -1, 0]];
function grounded(x, y, z) {
  if (y <= 0) return true;
  for (const [a, b, c] of N6) { const t = get(x + a, y + b, z + c); if (solidT(t) && !BUILT.has(KEY(x + a, y + b, z + c))) return true; }
  return false;
}
const lossOf = (k, vertical) => { const m = MATL[(PIECE[k] && PIECE[k].mat) || 'wood']; return vertical ? m[0] : m[1]; };
function supportFor(x, y, z, k, skip) {
  if (grounded(x, y, z)) return 1;
  let s = 0;
  for (const [a, b, c] of N6) { const key = KEY(x + a, y + b, z + c); if (skip && skip.has(key)) continue; const e = BUILT.get(key); if (e) s = Math.max(s, e.s - lossOf(k, b !== 0)); }
  return s;
}
const supColor = (s, gr) => gr ? 0x3f76e4 : s > .6 ? 0x3fdc3f : s > .35 ? 0xf0e040 : s > .15 ? 0xf09030 : 0xe03030;
function component(seeds) {
  const comp = new Set(), q = [];
  for (const k of seeds) if (BUILT.has(k) && !comp.has(k)) { comp.add(k); q.push(k); }
  while (q.length) { const k = q.pop(), [x, y, z] = unkey(k);
    for (const [a, b, c] of N6) { const n = KEY(x + a, y + b, z + c); if (BUILT.has(n) && !comp.has(n)) { comp.add(n); q.push(n); } } }
  return comp;
}
// recompute support for every piece connected to the seed cells; unsupported pieces fall apart
function recompute(seeds, depth = 0) {
  const comp = component(seeds); if (!comp.size) return;
  for (const k of [...comp]) { const e = BUILT.get(k), [x, y, z] = unkey(k); if (get(x, y, z) !== e.t) { BUILT.delete(k); comp.delete(k); } }
  const q = [];
  for (const k of comp) { const e = BUILT.get(k), [x, y, z] = unkey(k); e.g = grounded(x, y, z); e.s = e.g ? 1 : 0; if (e.g) q.push(k); }
  while (q.length) {
    const k = q.shift(), e = BUILT.get(k), [x, y, z] = unkey(k);
    for (const [a, b, c] of N6) { const n = KEY(x + a, y + b, z + c); if (!comp.has(n)) continue; const f = BUILT.get(n), s = e.s - lossOf(f.k, b !== 0);
      if (s > f.s + 1e-6) { f.s = s; q.push(n); } }
  }
  const fall = [...comp].filter(k => BUILT.get(k).s < .05);
  if (!fall.length || depth > 6) return;
  const next = new Set();
  for (const k of fall) {
    const e = BUILT.get(k), [x, y, z] = unkey(k); BUILT.delete(k);
    if (get(x, y, z) === e.t) { try { burst(x, y, z, e.t); } catch (err) { /* fx */ } set(x, y, z, AIR); spillStation(k, x, y, z); if (PIECE[e.k]) giveBack(PIECE[e.k].cost, x, y, z); rebuildAround(x, z); }
    for (const [a, b, c] of N6) next.add(KEY(x + a, y + b, z + c));
  }
  try { SFX.block(BLOCK[PLANKS] ? PLANKS : 1, 'break'); } catch (err) { /* audio */ }
  recompute(next, depth + 1);
}
function touchAround(x, y, z) { const s = [KEY(x, y, z)]; for (const [a, b, c] of N6) s.push(KEY(x + a, y + b, z + c)); if (s.some(k => BUILT.has(k))) recompute(s); }

// ---------------------------------------------------------------------
//  Placing pieces
// ---------------------------------------------------------------------
let sel = null, rot = 0;
const CYC = [3, 0, 2, 1];
const lookF = () => { const P = PL(), dx = -Math.sin(P.yaw), dz = -Math.cos(P.yaw); return Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 1 : 0) : (dz > 0 ? 3 : 2); };
const OPPF = [1, 0, 3, 2];
function plan(p, h) {
  if (!h) return { list: null, why: 'Aim at a block' };
  const t = blockOf(p); if (!(t > 0)) return { list: null, why: 'Not available' };
  if (p.special === 'spit') return h.t === CAMPFIRE ? { list: [[h.x, h.y, h.z, CAMPFIRE_SPIT, 0]], replace: true } : { list: null, why: 'Build it on a campfire' };
  let list;
  if (p.via) { list = Stations.placeList(t, h); if (!list) return { list: null, why: 'No room here' }; list = list.map(c => c.slice()); }
  else {
    const c = BLOCK[h.t].kind === 'cross' ? [h.x, h.y, h.z] : [h.x + h.nx, h.y + h.ny, h.z + h.nz];
    let m = 0;
    if (p.orient === 'beam') m = rot ? rot % 3 : h.ny ? 0 : h.nx ? 1 : 2;
    else if (p.orient === 'face' || BLOCK[t].orient) m = CYC[(CYC.indexOf(OPPF[lookF()]) + rot) % 4];
    list = [[c[0], c[1], c[2], t, m]];
  }
  for (const [x, y, z] of list) {
    if (!inb(x, y, z)) return { list, why: 'Out of the world' };
    const cur = get(x, y, z);
    if (!air(cur) && !(p.via && list.length === 1 && BUILT.has(KEY(x, y, z)))) return { list, why: 'No room here' };
    if (solidT(t) && chars.some(ch => { const q = ch.pos; return x < q.x + PW && x + 1 > q.x - PW && y < q.y + PH && y + 1 > q.y && z < q.z + PW && z + 1 > q.z - PW; })) return { list, why: 'You are in the way' };
  }
  if (p.special === 'overfire' && !fireBelow({ x: list[0][0], y: list[0][1], z: list[0][2] })) return { list, why: 'Build it on top of a campfire' };
  return { list };
}
function evaluate(p, h) {
  const r = plan(p, h); if (!r.list) return r;
  if (!r.why && !p.free && !benchNear()) r.why = 'Requires a Workbench';
  if (!r.replace) {
    const skip = new Set(r.list.map(([x, y, z]) => KEY(x, y, z)));
    r.s = Math.max(...r.list.map(([x, y, z]) => supportFor(x, y, z, p.id, skip)));
    r.g = r.list.some(([x, y, z]) => grounded(x, y, z));
    if (!r.why && r.s < .05) r.why = 'Not enough support';
  } else { const e = BUILT.get(KEY(h.x, h.y, h.z)); r.s = e ? e.s : 1; r.g = !e || e.g; }
  if (!r.why && !hasCost(p.cost)) r.why = 'Missing materials';
  return r;
}
let lastPlace = 0;
function buildNow() {
  if (!sel || state !== 'play') return false;
  const now = performance.now(); if (now - lastPlace < 250) return true; lastPlace = now;
  const h = targetBlock();
  if (sel.tool === 'remove') { removeAt(h); return true; }
  const r = evaluate(sel, h);
  if (r.why) { msg(r.why === 'Missing materials' ? 'Missing: ' + Object.entries(sel.cost).filter(([k, n]) => Inv.count(k) < n).map(([k, n]) => `${n - Inv.count(k)} ${itemName(k)}`).join(', ') : r.why); PL().swing = 1; swingT = 1; return true; }
  for (const [k, n] of Object.entries(sel.cost)) Inv.remove(k, n);
  if (r.replace) { const [x, y, z, t, m] = r.list[0]; set(x, y, z, t); Stations.setMeta(x, y, z, m); rebuildAround(x, z); const e = BUILT.get(KEY(x, y, z)); if (e) { e.t = t; e.k = 'cooking_spit'; e.extra = 'campfire'; } else BUILT.set(KEY(x, y, z), { k: 'cooking_spit', t, s: 1, extra: 'campfire' }); }
  else {
    Stations.commitList(r.list);
    for (const [x, y, z, t] of r.list) BUILT.set(KEY(x, y, z), { k: sel.id, t: get(x, y, z) || t, s: r.s });
    recompute(r.list.map(([x, y, z]) => KEY(x, y, z)));
  }
  sfxPlace(r.list[0][3]);
  try { Inv.damageHeld(1); } catch (e) { /* items */ }
  if (sel.id === 'campfire' || sel.id === 'cooking_spit') syncFires();
  benchT = 0; dirtySave();
  return true;
}
function removeAt(h) {
  if (!h) return false;
  const k = KEY(h.x, h.y, h.z);
  if (!BUILT.has(k)) { msg('Only pieces you built can be removed'); return false; }
  breakBlock(h); return true;
}
// what a built piece gives back when it breaks (Hammer remove, tools, collapse)
function spillStation(k, x, y, z) {
  const K = KILNS.get(k); if (K) { if (K.wood) dropAt('wood', K.wood, x + .5, y + 1, z + .5); KILNS.delete(k); }
  const M = SMELTERS.get(k); if (M) { if (M.fuel) dropAt('charcoal', M.fuel, x + .5, y + 1, z + .5); for (const o of M.ore.concat(M.cur ? [M.cur] : [])) dropAt(o, 1, x + .5, y + 1, z + .5); SMELTERS.delete(k); }
  const P = SPITS.get(k); if (P) { for (const s of P.slots) if (s) dropAt(s.state === 2 ? burnedId() : s.state === 1 ? s.out : s.id, 1, x + .5, y + 1, z + .5); SPITS.delete(k); }
}
on('blockDrops', (drops, h) => {
  const k = KEY(h.x, h.y, h.z), e = BUILT.get(k);
  if (h.t === SM() || h.t === KILN || h.t === CAMPFIRE_SPIT) spillStation(k, h.x, h.y, h.z);
  if (!e || e.t !== h.t) {
    if (h.t === CAMPFIRE_SPIT) return [['stone', 5], ['wood', 4]];
    return drops;
  }
  BUILT.delete(k);
  const out = Object.entries((PIECE[e.k] || { cost: {} }).cost).map(([id, n]) => [refundId(id), n]);
  if (e.extra && PIECE[e.extra]) for (const [id, n] of Object.entries(PIECE[e.extra].cost)) out.push([refundId(id), n]);
  return out.filter(([id]) => ITEMS[id]);
});
const _breakBlock = breakBlock;
breakBlock = function (h) {
  const r = _breakBlock.apply(this, arguments);
  if (h && get(h.x, h.y, h.z) !== h.t) { touchAround(h.x, h.y, h.z); if (h.t === CAMPFIRE || h.t === CAMPFIRE_SPIT) syncFires(); dirtySave(); }
  return r;
};

// ---------------------------------------------------------------------
//  Ghost preview and the support tint of the piece you look at
// ---------------------------------------------------------------------
const ghostMat = new THREE.MeshBasicMaterial({ color: 0x3fdc3f, transparent: true, opacity: .42, depthWrite: false });
const tintMat = new THREE.MeshBasicMaterial({ color: 0x3fdc3f, transparent: true, opacity: .2, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 });
const ghost = new THREE.Group(); ghost.renderOrder = 20; ghost.visible = false; scene.add(ghost);
const tintMesh = new THREE.Mesh(new THREE.BoxGeometry(1.02, 1.02, 1.02), tintMat); tintMesh.visible = false; tintMesh.renderOrder = 19; scene.add(tintMesh);
const boxGeo = new THREE.BoxGeometry(1, 1, 1);
let ghostKey = '';
function setGhost(list) {
  const key = JSON.stringify(list);
  if (key === ghostKey) return; ghostKey = key;
  while (ghost.children.length) ghost.remove(ghost.children[0]);
  for (const [x, y, z, t, m] of list) {
    const b = BLOCK[t], boxes = b && b.shape ? b.shape(x, y, z, m | 0, false) : [[0, 0, 0, 1, 1, 1]];
    for (const q of boxes) { const me = new THREE.Mesh(boxGeo, ghostMat); me.scale.set(Math.max(.02, q[3] - q[0]) + .01, Math.max(.02, q[4] - q[1]) + .01, Math.max(.02, q[5] - q[2]) + .01);
      me.position.set(x + (q[0] + q[3]) / 2, y + (q[1] + q[4]) / 2, z + (q[2] + q[5]) / 2); me.renderOrder = 20; ghost.add(me); }
  }
}
let ghostState = null;
function updateGhost() {
  ghost.visible = false; tintMesh.visible = false; ghostState = null;
  if (state !== 'play' || !hammerHeld() || hudHidden) return;
  const h = targetBlock();
  if (h) { const e = BUILT.get(KEY(h.x, h.y, h.z));
    if (e) { tintMesh.visible = true; tintMesh.position.set(h.x + .5, h.y + .5, h.z + .5); tintMat.color.setHex(sel && sel.tool === 'remove' ? 0xe03030 : supColor(e.s, e.g)); } }
  if (!sel || sel.tool) return;
  const r = evaluate(sel, h); ghostState = r;
  if (!r.list) return;
  setGhost(r.list); ghost.visible = true;
  ghostMat.color.setHex(r.why ? 0xe03030 : supColor(r.s, r.g));
}

// ---------------------------------------------------------------------
//  Build Menu (Minecraft creative inventory: tabs, 9 x 3 piece grid)
// ---------------------------------------------------------------------
const css = document.createElement('style');
css.textContent = `
  #bmRoot { position: fixed; inset: 0; z-index: 15; background: rgba(16,16,16,.55); font-family: var(--ui); color: #404040; --s: 2; touch-action: none; }
  #bmRoot .bmw { position: absolute; left: 50%; top: 50%; width: 176px; height: 136px; transform: translate(-50%, -50%) scale(var(--s)); }
  #bmRoot .ipn { position: absolute; left: 0; top: 26px; height: 110px; }
  #bmRoot .bmtab { position: absolute; top: 0; width: 28px; height: 28px; background: #a8a8a8; border-radius: 3px 3px 0 0; box-sizing: border-box;
    box-shadow: inset 2px 2px 0 #e0e0e0, inset -2px 0 0 #6a6a6a, 0 0 0 1px #000; cursor: pointer; }
  #bmRoot .bmtab.on { background: #c6c6c6; height: 30px; z-index: 2; box-shadow: inset 2px 2px 0 #fff, inset -2px 0 0 #555, 0 -1px 0 0 #000, -1px 0 0 0 #000, 1px 0 0 0 #000; }
  #bmRoot .bmtab canvas { position: absolute; left: 6px; top: 6px; width: 16px; height: 16px; image-rendering: pixelated; pointer-events: none; }
  #bmRoot .is.sel::before { content: ""; position: absolute; inset: -1px; border: 1px solid #fff; pointer-events: none; z-index: 1; }
  #bmRoot .is canvas.no { opacity: .45; }
  #bmRoot .is .x { position: absolute; inset: 1px; background: rgba(170,20,20,.38); pointer-events: none; }
  #bmRoot .bminfo { position: absolute; left: 8px; top: 75px; width: 160px; font-size: 8px; line-height: 9px; white-space: nowrap; overflow: hidden; }
  html[lang="ar"] #bmRoot .bminfo { font-size: 7px; line-height: 10.5px; top: 73px; }
  #bmRoot .bminfo .c { display: inline-block; margin-right: 4px; } #bmRoot .bminfo .ok { color: #1e7a1e; } #bmRoot .bminfo .bad { color: #b02020; }
  #bmTip { position: fixed; z-index: 16; pointer-events: none; background: rgba(16,0,16,.94); padding: 3px 4px; border: 1px solid; border-image: linear-gradient(#5000ff, #28007f) 1;
    font: 16px/1.3 var(--ui); color: #aaa; white-space: nowrap; text-shadow: 2px 2px 0 rgba(0,0,0,.55); }
  #bmTip .tn { color: #fff; } #bmTip .ok { color: #55ff55; } #bmTip .bad { color: #ff5555; } #bmTip .ds { font-style: italic; color: #a8a8a8; }
  #bmMsg { position: fixed; left: 50%; bottom: 96px; transform: translateX(-50%); z-index: 9; color: #fff; font: 16px/1 var(--ui); text-shadow: 2px 2px 0 #3f3f3f;
    pointer-events: none; opacity: 0; transition: opacity .3s; white-space: nowrap; }
  html.touch #bmMsg { bottom: 30%; }
  #bmInfo { position: fixed; z-index: 8; pointer-events: none; background: #c6c6c6; color: #404040; font: 14px/1.2 var(--ui); padding: 4px 6px 3px; border-radius: 2px;
    box-shadow: inset 2px 2px 0 #fff, inset -2px -2px 0 #555, 0 0 0 2px #000; transform: translate(-50%, -100%); white-space: nowrap; }
  #bmInfo .r { display: flex; align-items: center; gap: 4px; } #bmInfo canvas { width: 16px; height: 16px; image-rendering: pixelated; }
  #bmInfo .t { font-size: 12px; color: #404040; }
  #bmRot { position: fixed; right: 26%; bottom: 74px; z-index: 9; width: auto; min-width: 0; padding: 4px 10px; font-size: 14px; }
`;
document.head.appendChild(css);
const root = document.createElement('div'); root.id = 'bmRoot'; root.hidden = true; document.body.appendChild(root);
const wrap = document.createElement('div'); wrap.className = 'bmw'; root.appendChild(wrap);
const panel = document.createElement('div'); panel.className = 'ipn'; wrap.appendChild(panel);
const tipEl = document.createElement('div'); tipEl.id = 'bmTip'; tipEl.hidden = true; document.body.appendChild(tipEl);
const infoEl = document.createElement('div'); infoEl.id = 'bmInfo'; infoEl.hidden = true; document.body.appendChild(infoEl);
const rotBtn = document.createElement('button'); rotBtn.id = 'bmRot'; rotBtn.className = 'mcbtn'; rotBtn.type = 'button'; rotBtn.textContent = 'Rotate'; rotBtn.hidden = true; document.body.appendChild(rotBtn);
rotBtn.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); turn(1); });
let tab = 'misc', menuOpen = false, tapSel = null;
const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const REMOVE_ICON = pixCanvas(32, 32, g => { g.imageSmoothingEnabled = false; const P = (c, x, y, w = 1, h = 1) => { g.fillStyle = c; g.fillRect(x * 2, y * 2, w * 2, h * 2); };
  for (let k = 0; k < 10; k++) { P('#6b4a2a', 3 + k, 12 - k); P('#4a2f12', 4 + k, 12 - k); } P('#9a9a9a', 10, 1, 5, 3); P('#d0d0d0', 10, 1, 5, 1); P('#ff5555', 2, 2, 2, 2); P('#ff5555', 1, 1); P('#ff5555', 4, 4); });
function pieceIcon(p) {
  if (p.tool) return REMOVE_ICON;
  const c = document.createElement('canvas'); c.width = c.height = 32; const t = blockOf(p);
  try { if (ITEMS[p.id] && Inv.icon) c.getContext('2d').drawImage(Inv.icon(p.id), 0, 0); else if (t > 0) drawIcon(c, t); } catch (e) { if (t > 0) drawIcon(c, t); }
  return c;
}
const iconCache = {};
const iconOf = p => iconCache[p.id] || (iconCache[p.id] = pieceIcon(p));
function canPiece(p) { return p.tool ? '' : (blockOf(p) > 0 ? '' : 'Not available') || (!p.free && !benchNear(true) ? 'Requires a Workbench' : '') || (!hasCost(p.cost) ? 'Missing materials' : ''); }
function costHtml(p, cls) { return Object.entries(p.cost).map(([k, n]) => `<span class="c ${Inv.count(k) >= n ? 'ok' : 'bad'}">${n} ${esc(itemName(k))}</span>`).join(cls || ' '); }
function tipHtml(p) {
  const L = [`<div class="tn">${esc(p.name)}</div>`];
  for (const [k, n] of Object.entries(p.cost)) L.push(`<div class="${Inv.count(k) >= n ? 'ok' : 'bad'}">${n} ${esc(itemName(k))} (${Inv.count(k)})</div>`);
  if (!p.tool && !p.free && !benchNear()) L.push('<div class="bad">Requires a Workbench</div>');
  if (p.desc) L.push(`<div class="ds">${esc(p.desc)}</div>`);
  return L.join('');
}
function renderMenu() {
  panel.innerHTML = ''; wrap.querySelectorAll('.bmtab').forEach(e => e.remove());
  TABS.forEach(([id, name], i) => {
    const d = document.createElement('div'); d.className = 'bmtab' + (id === tab ? ' on' : ''); d.dataset.tab = id; d.style.left = (i * 29) + 'px'; d.title = name;
    const first = PIECES.find(p => p.tab === id && !p.tool && blockOf(p) > 0) || PIECES.find(p => p.tab === id);
    const c = document.createElement('canvas'); c.width = c.height = 32; c.getContext('2d').drawImage(iconOf(first), 0, 0); d.appendChild(c); wrap.appendChild(d);
    d.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); tab = id; tapSel = null; uiClick(); renderMenu(); });
  });
  const title = document.createElement('div'); title.className = 'ilb'; title.style.left = '8px'; title.style.top = '6px';
  title.textContent = 'Build: ' + TABS.find(t => t[0] === tab)[1]; panel.appendChild(title);
  const lv = document.createElement('div'); lv.className = 'ilb'; lv.style.right = '22px'; lv.style.top = '6px'; lv.style.color = benchNear(true) ? '#404040' : '#b02020';
  lv.textContent = benchNear() ? 'Workbench near' : 'No Workbench'; panel.appendChild(lv);
  const list = PIECES.filter(p => p.tab === tab && (p.tool || blockOf(p) > 0));
  for (let i = 0; i < 27; i++) {
    const d = document.createElement('div'); d.className = 'is'; d.style.left = (7 + (i % 9) * 18) + 'px'; d.style.top = (17 + Math.floor(i / 9) * 18) + 'px'; panel.appendChild(d);
    const p = list[i]; if (!p) continue; d.dataset.piece = p.id;
    if (sel === p || tapSel === p) d.classList.add('sel');
    const why = canPiece(p), c = document.createElement('canvas'); c.width = c.height = 32; c.getContext('2d').drawImage(iconOf(p), 0, 0);
    if (why) c.classList.add('no'); d.appendChild(c);
    if (why === 'Requires a Workbench') { const x = document.createElement('div'); x.className = 'x'; d.appendChild(x); }
    d.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { tipEl.innerHTML = tipHtml(p); tipEl.hidden = false; showInfo(p); } });
    d.addEventListener('pointerleave', () => { tipEl.hidden = true; });
    d.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault();
      if (e.pointerType !== 'mouse' && tapSel !== p) { tapSel = p; uiClick(); renderMenu(); showInfo(p); return; }
      choose(p); });
  }
  const info = document.createElement('div'); info.className = 'bminfo'; panel.appendChild(info);
  const x = document.createElement('div'); x.className = 'ibtn'; x.textContent = 'X'; x.style.left = '157px'; x.style.top = '3px'; x.title = 'Close'; panel.appendChild(x);
  x.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); closeMenu(false); });
  showInfo(tapSel || sel);
}
function showInfo(p) {
  const el = panel.querySelector('.bminfo'); if (!el) return;
  if (!p) { el.innerHTML = `<div>${TOUCH ? 'Tap a piece, tap again to pick it' : 'Click a piece to pick it'}</div><div>${TOUCH ? 'Attack builds it' : 'Left-click builds, Q turns it'}</div>`; return; }
  const why = canPiece(p);
  el.innerHTML = `<div>${esc(p.name)}${why && why !== 'Missing materials' ? ` <span class="bad">${esc(why)}</span>` : ''}</div><div>${p.tool ? esc(p.desc) : costHtml(p)}</div>`;
}
function uiClick() { if (AC) try { click(AC.currentTime, 1300, .03); } catch (e) { /* audio */ } }
function choose(p) {
  sel = p; rot = 0; uiClick(); closeMenu(!TOUCH);
  msg(p.tool ? 'Remove: aim at a piece you built and attack' : `${p.name}: ${TOUCH ? 'press Attack to build' : 'left-click to build, Q to turn'}`, 3);
}
function layoutMenu() { const raw = Math.min((vw() - 16) / 176, (vh() - 8) / 140); root.style.setProperty('--s', clamp(Math.floor(raw * 4) / 4, .75, 4)); }
function openMenu() {
  if (state !== 'play' || menuOpen) return false;
  menuOpen = true; state = 'build'; mining = false; root.hidden = false; tipEl.hidden = true; tapSel = null;
  if (sel && !sel.tool) tab = sel.tab;
  if (document.pointerLockElement) try { document.exitPointerLock(); } catch (e) { /* not locked */ }
  benchT = 0; layoutMenu(); renderMenu(); uiClick(); return true;
}
function closeMenu(relock) {
  if (!menuOpen) return; menuOpen = false; root.hidden = true; tipEl.hidden = true;
  if (state === 'build') state = 'play';
  if (relock && !TOUCH && !noLock) try { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) { /* click to capture */ }
  canvas.focus();
}
root.addEventListener('pointerdown', e => { if (e.target === root) closeMenu(false); });
root.addEventListener('pointermove', e => { if (!tipEl.hidden) { const w = tipEl.offsetWidth; let x = e.clientX + 14; if (x + w > vw() - 4) x = e.clientX - 14 - w; tipEl.style.left = Math.max(4, x) + 'px'; tipEl.style.top = Math.max(4, e.clientY - 30) + 'px'; } });
addEventListener('resize', () => { if (menuOpen) layoutMenu(); });
function turn(d) { if (!sel || sel.tool) return; rot = (rot + d + 12) % 12; uiClick(); ghostKey = ''; }

// ---------------------------------------------------------------------
//  Stations: Cooking Spit, Charcoal Kiln, Smelter (fed by hand), Workbench / Forge / Cauldron rules
// ---------------------------------------------------------------------
const SPITS = new Map(), KILNS = new Map(), SMELTERS = new Map();
const KILN_MAX = 25, KILN_SECS = 15, SM_FUEL = 20, SM_ORE = 10, SM_SECS = 30, SM_COAL = 2, COOK_SECS = 25;
const ORE_OUT = { copper_ore: 'copper', tin_ore: 'tin', scrap_iron: 'iron_ingot', raw_iron: 'iron_ingot', iron_ore: 'iron_ingot' };
const MEAT_OUT = { raw_meat: 'cooked_meat', beef: 'cooked_beef', porkchop: 'cooked_porkchop', mutton: 'cooked_mutton', chicken: 'cooked_chicken', rabbit: 'cooked_rabbit', cod: 'cooked_cod' };
const cookOf = id => { if (!id) return null; if (MEAT_OUT[id] && ITEMS[MEAT_OUT[id]]) return MEAT_OUT[id]; const m = /^raw_(.+)$/.exec(id); return m && ITEMS['cooked_' + m[1]] ? 'cooked_' + m[1] : null; };
const burnedId = () => ITEMS.coal ? 'coal' : 'charcoal';
const frontOf = (x, y, z) => { const f = Stations.getMeta(x, y, z) & 3, d = [[-1, 0], [1, 0], [0, -1], [0, 1]][f]; return [x + .5 + d[0] * .85, y + .3, z + .5 + d[1] * .85]; };
const kilnAt = k => KILNS.get(k) || (KILNS.set(k, { wood: 0, t: 0 }), KILNS.get(k));
const smelterAt = k => SMELTERS.get(k) || (SMELTERS.set(k, { fuel: 0, ore: [], cur: null, t: 0 }), SMELTERS.get(k));
const spitAt = k => SPITS.get(k) || (SPITS.set(k, { slots: [null, null] }), SPITS.get(k));
function feed(h) {
  const id = heldId(), s = Inv.held(), k = KEY(h.x, h.y, h.z);
  if (h.t === KILN) {
    const K = kilnAt(k);
    if (!isTag(id, 'wood')) { msg('The kiln burns wood into charcoal'); return true; }
    const n = Math.min(s.n, KILN_MAX - K.wood); if (n <= 0) { msg('The kiln is full'); return true; }
    Inv.consumeHeld(n); K.wood += n; pop(500); msg(`Added ${n} wood (${K.wood}/${KILN_MAX})`); dirtySave(); return true;
  }
  if (h.t === SM()) {
    const M = smelterAt(k);
    if (isTag(id, 'charcoal') || isTag(id, 'coal')) { const n = Math.min(s.n, SM_FUEL - M.fuel); if (n <= 0) { msg('The smelter has all the charcoal it can hold'); return true; }
      Inv.consumeHeld(n); M.fuel += n; pop(500); msg(`Added ${n} charcoal (${M.fuel}/${SM_FUEL})`); dirtySave(); return true; }
    if (ORE_OUT[id]) { const n = Math.min(s.n, SM_ORE - M.ore.length - (M.cur ? 1 : 0)); if (n <= 0) { msg('The smelter is full of ore'); return true; }
      Inv.consumeHeld(n); for (let i = 0; i < n; i++) M.ore.push(id); pop(600); msg(`Added ${n} ${itemName(id)}`); dirtySave(); return true; }
    msg(isTag(id, 'wood') ? 'Needs charcoal' : 'The smelter takes charcoal and ore'); return true;
  }
  if (h.t === CAMPFIRE_SPIT) {
    const P = spitAt(k), out = cookOf(id);
    if (out) { const i = P.slots.findIndex(x => !x); if (i < 0) { msg('The spit is full'); return true; }
      Inv.consumeHeld(1); P.slots[i] = { id, out, t: 0, state: 0 }; pop(400); msg(`${itemName(id)} hangs over the fire`); dirtySave(); return true; }
    const i = P.slots.findIndex(x => x && x.state > 0) >= 0 ? P.slots.findIndex(x => x && x.state > 0) : P.slots.findIndex(x => x);
    if (i < 0) { msg('Hang raw meat on the spit'); return true; }
    const x = P.slots[i]; P.slots[i] = null; const got = x.state === 2 ? burnedId() : x.state === 1 ? x.out : x.id;
    const left = Inv.add(got, 1); if (left) dropAt(got, 1, h.x + .5, h.y + 1, h.z + .5);
    pop(700); msg(x.state === 2 ? 'Burned to coal!' : x.state === 1 ? `${itemName(got)}!` : `Took the ${itemName(got)} off`); dirtySave(); return true;
  }
  if (h.t === CAMPFIRE && cookOf(id)) { msg('Build a Cooking Spit on the fire (Hammer, 2 Wood)'); return true; }
  return false;
}
// station rules for items.js (levels, roofs, fire)
if (hasInv() && Inv.defineStation) {
  Inv.defineStation('workbench', { level: p => stationLevel(p, 'workbench'), check: p => roofed(p.x, p.y, p.z) ? '' : 'Needs a roof' });
  Inv.defineStation('forge', { name: 'Forge', block: FORGE, r: 5, icon: 'forge', level: p => stationLevel(p, 'forge'), check: p => roofed(p.x, p.y, p.z) ? '' : 'Needs a roof' });
  Inv.defineStation('cauldron', { name: 'Cauldron', block: CAULDRON, r: 4, icon: 'cauldron', check: p => fireBelow(p) ? '' : 'Needs a fire under it' });
}

// ---------------------------------------------------------------------
//  Fire, smoke and meat on the spit (small cubes, like Minecraft particles)
// ---------------------------------------------------------------------
const FIRES = new Set();
function syncFires() { FIRES.clear(); for (const [k, e] of BUILT) if (e.t === CAMPFIRE || e.t === CAMPFIRE_SPIT) FIRES.add(k); }
const flameMats = [0xffb030, 0xffe080, 0xff7a20].map(c => new THREE.MeshBasicMaterial({ color: c, fog: false }));
const smokeMat = new THREE.MeshBasicMaterial({ color: 0x4a4a4a, transparent: true, opacity: .6 });
const pGeo = new THREE.BoxGeometry(1, 1, 1), parts = [];
function puff(x, y, z, smoke) {
  if (parts.length > 60) return;
  const m = new THREE.Mesh(pGeo, smoke ? smokeMat : flameMats[(Math.random() * 3) | 0]); const s = smoke ? .14 : .1 + Math.random() * .06;
  m.scale.set(s, s, s); m.position.set(x, y, z); scene.add(m); parts.push({ m, life: smoke ? 1.6 : .5 + Math.random() * .3, vy: smoke ? .7 : .9 + Math.random() * .5, s });
}
const meatMeshes = new Map();
const MEAT_COL = [0xd4505a, 0x8a5230, 0x1e1a18];
function syncMeat() {
  const seen = new Set();
  for (const [k, P] of SPITS) P.slots.forEach((s, i) => {
    const key = k + ':' + i; if (!s) return; seen.add(key);
    let m = meatMeshes.get(key); if (!m) { m = new THREE.Mesh(pGeo, new THREE.MeshLambertMaterial({ color: MEAT_COL[0] })); m.scale.set(.18, .22, .14); scene.add(m); meatMeshes.set(key, m);
      const [x, y, z] = unkey(k); m.position.set(x + (i ? .68 : .32), y + .62, z + .5); }
    m.material.color.setHex(MEAT_COL[s.state]); m.rotation.x = performance.now() / 900;
  });
  for (const [key, m] of meatMeshes) if (!seen.has(key)) { scene.remove(m); m.material.dispose(); meatMeshes.delete(key); }
}
let fxT = 0;
function fxFrame(dt) {
  for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.life -= dt; p.m.position.y += p.vy * dt; const k = Math.max(.01, p.s * Math.min(1, p.life * 2)); p.m.scale.set(k, k, k);
    if (p.life <= 0) { scene.remove(p.m); parts.splice(i, 1); } }
  if ((fxT -= dt) > 0) return; fxT = .09;
  const pp = PL().pos;
  for (const k of FIRES) { const [x, y, z] = unkey(k); if (Math.abs(x - pp.x) > 28 || Math.abs(z - pp.z) > 28) continue;
    puff(x + .3 + Math.random() * .4, y + .25, z + .3 + Math.random() * .4, false); if (Math.random() < .25) puff(x + .5, y + .7, z + .5, true); }
  for (const [k, K] of KILNS) if (K.wood > 0 && Math.random() < .4) { const [x, y, z] = unkey(k); puff(x + .5, y + 1.05, z + .5, true); }
  for (const [k, M] of SMELTERS) if (M.cur && Math.random() < .5) { const [x, y, z] = unkey(k); puff(x + .5, y + 1.05, z + .5, Math.random() < .7); }
}
function stationsFrame(dt) {
  for (const [k, K] of KILNS) {
    const [x, y, z] = unkey(k); if (get(x, y, z) !== KILN) { KILNS.delete(k); continue; }
    if (K.wood <= 0) { K.t = 0; continue; }
    if ((K.t += dt) >= KILN_SECS) { K.t = 0; K.wood--; const [fx, fy, fz] = frontOf(x, y, z); dropAt('charcoal', 1, fx, fy, fz); pop(1100); dirtySave(); }
  }
  for (const [k, M] of SMELTERS) {
    const [x, y, z] = unkey(k); if (get(x, y, z) !== SM()) { SMELTERS.delete(k); continue; }
    if (!M.cur) { if (M.ore.length && M.fuel >= SM_COAL) { M.fuel -= SM_COAL; M.cur = M.ore.shift(); M.t = 0; } else continue; }
    if ((M.t += dt) >= SM_SECS) { const [fx, fy, fz] = frontOf(x, y, z); dropAt(ORE_OUT[M.cur], 1, fx, fy, fz); M.cur = null; M.t = 0; pop(1300); dirtySave(); }
  }
  for (const [k, P] of SPITS) {
    const [x, y, z] = unkey(k); if (get(x, y, z) !== CAMPFIRE_SPIT) { SPITS.delete(k); continue; }
    for (const s of P.slots) { if (!s || s.state === 2) continue; s.t += dt;
      if (s.state === 0 && s.t >= COOK_SECS) { s.state = 1; pop(900); if (Math.hypot(PL().pos.x - x, PL().pos.z - z) < 12) msg(`${itemName(s.out)} is done!`); }
      else if (s.state === 1 && s.t >= COOK_SECS * 2) { s.state = 2; pop(300); } }
  }
}
// the tiny Minecraft panel over a kiln, smelter or spit you look at
const icon16 = id => { const c = document.createElement('canvas'); c.width = c.height = 32; try { c.getContext('2d').drawImage(Inv.icon(id), 0, 0); } catch (e) { /* icon */ } return c; };
let infoKey = '';
function infoFrame() {
  if (state !== 'play' || hudHidden) { infoEl.hidden = true; infoKey = ''; return; }
  const h = targetBlock(); let rows = null, title = '';
  if (h) { const k = KEY(h.x, h.y, h.z);
    if (h.t === KILN) { const K = KILNS.get(k) || { wood: 0, t: 0 }; title = 'Charcoal Kiln'; rows = [['wood', `${K.wood}/${KILN_MAX}`]]; if (K.wood) rows.push(['charcoal', `${Math.ceil(KILN_SECS - K.t)}s`]); }
    else if (h.t === SM()) { const M = SMELTERS.get(k) || { fuel: 0, ore: [], cur: null, t: 0 }; title = 'Smelter'; rows = [['charcoal', `${M.fuel}/${SM_FUEL}`], [M.cur || M.ore[0] || 'copper_ore', `${M.ore.length + (M.cur ? 1 : 0)}/${SM_ORE}`]];
      if (M.cur) rows.push([ORE_OUT[M.cur], `${Math.ceil(SM_SECS - M.t)}s`]); }
    else if (h.t === CAMPFIRE_SPIT) { const P = SPITS.get(k) || { slots: [null, null] }; title = 'Cooking Spit';
      rows = P.slots.map(s => s ? [s.state === 2 ? burnedId() : s.state === 1 ? s.out : s.id, s.state === 2 ? 'Burned' : s.state === 1 ? `Done (${Math.max(0, Math.ceil(COOK_SECS * 2 - s.t))}s)` : `${Math.ceil(COOK_SECS - s.t)}s`] : [null, 'Empty']); }
    if (rows) { const p = new V3(h.x + .5, h.y + 1.15, h.z + .5).project(camera);
      if (p.z < 1) { infoEl.style.left = ((p.x + 1) / 2 * vw()) + 'px'; infoEl.style.top = ((1 - p.y) / 2 * vh()) + 'px'; } else rows = null; } }
  if (!rows) { infoEl.hidden = true; infoKey = ''; return; }
  const key = title + JSON.stringify(rows); infoEl.hidden = false; if (key === infoKey) return; infoKey = key;
  infoEl.innerHTML = `<div class="t">${esc(title)}</div>`;
  for (const [id, txt] of rows) { const r = document.createElement('div'); r.className = 'r'; if (id) r.appendChild(icon16(id)); const s = document.createElement('span'); s.textContent = txt; r.appendChild(s); infoEl.appendChild(r); }
}

// ---------------------------------------------------------------------
//  Input: Hammer use / attack / remove / rotate
// ---------------------------------------------------------------------
const INTERACT = () => { const I = ids(); return [I.DOOR, I.CHEST, I.BED, I.FURNACE, I.FURNACE_LIT, WORKBENCH, FORGE, CAULDRON]; };
(HOOKS.use || (HOOKS.use = [])).unshift(() => {
  if (state !== 'play' || !hasInv()) return false;
  const h = targetBlock();
  if (h && !PL().sneak && feed(h)) return true;
  if (!hammerHeld()) return false;
  if (h && !PL().sneak && INTERACT().includes(h.t)) return false;       // doors, chests, beds and crafting stations open as usual
  return openMenu();
});
(HOOKS.attack || (HOOKS.attack = [])).unshift(() => (state === 'play' && hammerHeld() && sel) ? buildNow() : false);
canvas.addEventListener('pointerdown', e => {
  if (e.pointerType === 'touch' || e.button !== 1 || state !== 'play' || !hammerHeld()) return;
  e.preventDefault(); e.stopImmediatePropagation(); removeAt(targetBlock());
}, true);
on('key', e => {
  if (state === 'build') { if (e.code === 'Escape' || e.code === 'KeyE' || e.code === 'Tab') closeMenu(e.code !== 'Escape');
    else if (/^Digit[1-5]$/.test(e.code)) { tab = TABS[+e.code.slice(5) - 1][0]; tapSel = null; renderMenu(); } return true; }
  if (state === 'play' && e.code === 'KeyQ' && hammerHeld() && sel && !sel.tool) { turn(e.shiftKey ? -1 : 1); return true; }
  return false;
});

// ---------------------------------------------------------------------
//  Furnace: glass and stone only now (ore goes to the Smelter, meat to the Spit, charcoal comes from the Kiln)
// ---------------------------------------------------------------------
function cleanFurnace() {
  if (typeof Stations === 'undefined' || !Stations.removeSmelt) return;
  for (const id of Stations.smelts()) if (ORE_OUT[id] || cookOf(id) || /^(oak_log|wood|raw_|copper|tin)/.test(id)) Stations.removeSmelt(id);
  if (ITEMS.furnace) ITEMS.furnace.desc = 'Smelts sand into glass and cobblestone into stone. Burns coal, charcoal or wood.';
  if (hasInv() && Inv.removeRecipe) Inv.removeRecipe(r => r.station === 'smelter');
}
cleanFurnace();

// ---------------------------------------------------------------------
//  Save / load (through mobs.js Save)
// ---------------------------------------------------------------------
function dirtySave() { /* mobs.js autosaves; the 'save' hook below writes our state */ }
on('save', data => {
  if (!data) return;
  data.build = { v: 1, built: [...BUILT].map(([k, e]) => [k, e.k, e.t, e.extra || 0]), kilns: [...KILNS].map(([k, K]) => [k, K.wood, +K.t.toFixed(1)]),
    smelters: [...SMELTERS].map(([k, M]) => [k, M.fuel, M.ore, M.cur, +M.t.toFixed(1)]), spits: [...SPITS].map(([k, P]) => [k, P.slots]) };
});
function clearAll() { BUILT.clear(); KILNS.clear(); SMELTERS.clear(); SPITS.clear(); FIRES.clear(); sel = null; }
on('load', data => {
  clearAll(); const b = data && data.build; if (!b || b.v !== 1) return;
  for (const [k, pk, t, ex] of b.built || []) { const [x, y, z] = unkey(k); if (get(x, y, z) === t) BUILT.set(k, { k: pk, t, s: 1, extra: ex || undefined }); }
  for (const [k, w, t] of b.kilns || []) KILNS.set(k, { wood: w | 0, t: +t || 0 });
  for (const [k, f, ore, cur, t] of b.smelters || []) SMELTERS.set(k, { fuel: f | 0, ore: Array.isArray(ore) ? ore : [], cur: cur || null, t: +t || 0 });
  for (const [k, slots] of b.spits || []) SPITS.set(k, { slots: Array.isArray(slots) ? slots.slice(0, 2) : [null, null] });
  recompute([...BUILT.keys()]); syncFires();
});
on('newworld', clearAll);
on('start', () => { cleanFurnace(); });

// ---------------------------------------------------------------------
//  Per-frame
// ---------------------------------------------------------------------
on('frame', dt => { stationsFrame(dt); });
on('tick', rawDt => {
  if (benchT > 0) benchT -= rawDt;
  if (msgT > 0 && (msgT -= rawDt) <= 0) msgEl.style.opacity = 0;
  if (state !== 'play' && state !== 'build' && menuOpen) closeMenu(false);
  if (state === 'play' && !hammerHeld() && sel && sel.tool) sel = null;
  updateGhost(); fxFrame(rawDt); syncMeat(); infoFrame();
  rotBtn.hidden = !(TOUCH && state === 'play' && hammerHeld() && sel && !sel.tool && (sel.orient || blockOf(sel) === BEAM));
});

Object.assign(Build, {
  PIECES, PIECE, BUILT, KILNS, SMELTERS, SPITS, blocks: { CAMPFIRE, CAMPFIRE_SPIT, BEAM, FORGE, KILN, CAULDRON, CHOP, TANRACK, ADZE, SHELF, ANVILS, GRINDER, COOLER, TOOLRACK, BENCH, TABLE, RUG, STAKES },
  select: id => { sel = id ? PIECE[id] || null : null; rot = 0; return !!sel; }, get selected() { return sel ? sel.id : null; }, rotate: turn,
  build: () => { lastPlace = 0; return buildNow(); }, remove: () => removeAt(targetBlock()), open: openMenu, close: () => closeMenu(false), isOpen: () => menuOpen, curTab: () => tab, selId: () => (sel ? sel.id : null), tapped: () => tapSel ? tapSel.id : null,
  evaluate: id => { const r = evaluate(PIECE[id], targetBlock()); return { why: r.why || '', s: r.s, grounded: r.g, cells: r.list }; },
  supportAt: (x, y, z) => { const e = BUILT.get(KEY(x, y, z)); return e ? +e.s.toFixed(3) : null; }, benchNear: () => benchNear(true),
  stationLevel: (kind, x, y, z) => stationLevel({ x, y, z }, kind), feed: h => feed(h), ghost: () => ghostState,
});
})();
