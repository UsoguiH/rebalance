// Blocks and items: the registry, plus every 16x16 texture and icon, painted in code.
(function () {
  const SC = window.SC;
  const B = (SC.B = {});
  const I = (SC.I = {});
  const blocks = (SC.blocks = []);
  const items = (SC.items = []);

  // ---------- block registry ----------
  function blk(id, key, name, o = {}) {
    const solid = o.solid !== undefined ? o.solid : true;
    const d = {
      id,
      key,
      name,
      solid,
      opaque: o.opaque !== undefined ? o.opaque : solid,
      hard: o.hard !== undefined ? o.hard : 1,
      tool: o.tool || null,
      tier: o.tier !== undefined ? o.tier : -1,
      drop: o.drop !== undefined ? o.drop : id,
      light: o.light || 0,
      lightCost: o.lightCost || 1,
      grav: !!o.grav,
      repl: !!o.repl,
      climb: !!o.climb,
      fluid: !!o.fluid,
      sound: o.sound || 'stone',
      tree: !!o.tree,
      support: o.support || null,
      wall: o.wall !== undefined ? o.wall : solid && (o.opaque === undefined || o.opaque),
      use: o.use || null,
      noItem: !!o.noItem,
    };
    B[key] = id;
    blocks[id] = d;
    return d;
  }

  blk(0, 'AIR', 'Air', { solid: false, hard: 0, drop: null, wall: false, noItem: true });
  blk(1, 'GRASS', 'Grass Block', { hard: 0.6, tool: 'shovel', drop: 2, sound: 'grass' });
  blk(2, 'DIRT', 'Dirt', { hard: 0.5, tool: 'shovel', sound: 'dirt' });
  blk(3, 'STONE', 'Stone', { hard: 1.5, tool: 'pick', tier: 0, drop: 4 });
  blk(4, 'COBBLE', 'Cobblestone', { hard: 2, tool: 'pick', tier: 0 });
  blk(5, 'SAND', 'Sand', { hard: 0.5, tool: 'shovel', grav: true, sound: 'sand' });
  blk(6, 'GRAVEL', 'Gravel', { hard: 0.6, tool: 'shovel', grav: true, sound: 'dirt' });
  blk(7, 'LOG', 'Oak Log', { hard: 2, tool: 'axe', sound: 'wood', tree: true });
  blk(8, 'LEAVES', 'Oak Leaves', { hard: 0.2, opaque: false, lightCost: 2, sound: 'grass', tree: true, drop: 'leaves', wall: false });
  blk(9, 'PLANKS', 'Oak Planks', { hard: 2, tool: 'axe', sound: 'wood' });
  blk(10, 'BEDROCK', 'Bedrock', { hard: -1, drop: null });
  blk(11, 'WATER', 'Water', { solid: false, hard: -1, fluid: true, repl: true, lightCost: 2, drop: null, noItem: true });
  blk(12, 'LAVA', 'Lava', { solid: false, hard: -1, fluid: true, repl: true, light: 15, drop: null, noItem: true });
  blk(13, 'COAL_ORE', 'Coal Ore', { hard: 3, tool: 'pick', tier: 0, drop: 257 });
  blk(14, 'IRON_ORE', 'Iron Ore', { hard: 3, tool: 'pick', tier: 1 });
  blk(15, 'GOLD_ORE', 'Gold Ore', { hard: 3, tool: 'pick', tier: 2 });
  blk(16, 'DIAMOND_ORE', 'Diamond Ore', { hard: 3, tool: 'pick', tier: 2, drop: 261 });
  blk(17, 'GLASS', 'Glass', { hard: 0.3, opaque: false, drop: null, sound: 'glass', wall: true });
  blk(18, 'CRAFTING_TABLE', 'Crafting Table', { hard: 2.5, tool: 'axe', sound: 'wood', use: 'craft', wall: false });
  blk(19, 'FURNACE', 'Furnace', { hard: 3.5, tool: 'pick', tier: 0, use: 'furnace', wall: false });
  blk(20, 'FURNACE_LIT', 'Furnace', { hard: 3.5, tool: 'pick', tier: 0, drop: 19, light: 13, use: 'furnace', wall: false, noItem: true });
  blk(21, 'CHEST', 'Chest', { hard: 2.5, tool: 'axe', sound: 'wood', use: 'chest', opaque: false, wall: false });
  blk(22, 'TORCH', 'Torch', { solid: false, hard: 0, light: 14, sound: 'wood', support: 'torch' });
  blk(23, 'TALL_GRASS', 'Tall Grass', { solid: false, hard: 0, repl: true, drop: null, sound: 'grass', support: 'plant' });
  blk(24, 'ROSE', 'Rose', { solid: false, hard: 0, sound: 'grass', support: 'plant' });
  blk(25, 'DANDELION', 'Dandelion', { solid: false, hard: 0, sound: 'grass', support: 'plant' });
  blk(26, 'SAPLING', 'Oak Sapling', { solid: false, hard: 0, sound: 'grass', support: 'plant' });
  blk(27, 'CACTUS', 'Cactus', { solid: false, hard: 0.4, sound: 'wool', support: 'cactus', lightCost: 1 });
  blk(28, 'SANDSTONE', 'Sandstone', { hard: 0.8, tool: 'pick', tier: 0 });
  blk(29, 'SNOW_GRASS', 'Snowy Grass', { hard: 0.6, tool: 'shovel', drop: 2, sound: 'grass' });
  blk(30, 'SNOW', 'Snow Block', { hard: 0.2, tool: 'shovel', sound: 'wool' });
  blk(31, 'ICE', 'Ice', { hard: 0.5, tool: 'pick', opaque: false, lightCost: 2, drop: null, sound: 'glass', wall: true });
  blk(32, 'OBSIDIAN', 'Obsidian', { hard: 50, tool: 'pick', tier: 3 });
  blk(33, 'TNT', 'TNT', { hard: 0, sound: 'grass', use: 'tnt' });
  blk(34, 'LADDER', 'Ladder', { solid: false, hard: 0.4, tool: 'axe', climb: true, sound: 'wood', support: 'ladder' });
  blk(35, 'DOOR_B', 'Door', { hard: 3, tool: 'axe', drop: 274, opaque: false, sound: 'wood', use: 'door', wall: false, noItem: true });
  blk(36, 'DOOR_T', 'Door', { hard: 3, tool: 'axe', drop: null, opaque: false, sound: 'wood', use: 'door', wall: false, noItem: true });
  blk(37, 'DOOR_BO', 'Door', { solid: false, hard: 3, tool: 'axe', drop: 274, sound: 'wood', use: 'door', noItem: true });
  blk(38, 'DOOR_TO', 'Door', { solid: false, hard: 3, tool: 'axe', drop: null, sound: 'wood', use: 'door', noItem: true });
  blk(39, 'BED', 'Bed', { solid: false, hard: 0.2, sound: 'wool', use: 'bed', support: 'floor' });
  blk(40, 'WOOL', 'White Wool', { hard: 0.8, sound: 'wool' });
  blk(41, 'STONE_BRICKS', 'Stone Bricks', { hard: 1.5, tool: 'pick', tier: 0 });
  blk(42, 'SPRUCE_LOG', 'Spruce Log', { hard: 2, tool: 'axe', sound: 'wood', tree: true });
  blk(43, 'SPRUCE_LEAVES', 'Spruce Leaves', { hard: 0.2, opaque: false, lightCost: 2, sound: 'grass', tree: true, drop: 'leaves', wall: false });
  blk(44, 'SPRUCE_PLANKS', 'Spruce Planks', { hard: 2, tool: 'axe', sound: 'wood' });
  blk(45, 'DEEPSLATE', 'Deepslate', { hard: 3, tool: 'pick', tier: 0 });
  blk(46, 'IRON_BLOCK', 'Block of Iron', { hard: 5, tool: 'pick', tier: 1 });
  blk(47, 'GOLD_BLOCK', 'Block of Gold', { hard: 3, tool: 'pick', tier: 2 });
  blk(48, 'DIAMOND_BLOCK', 'Block of Diamond', { hard: 5, tool: 'pick', tier: 2 });
  blk(49, 'DEAD_BUSH', 'Dead Bush', { solid: false, hard: 0, repl: true, drop: 256, sound: 'grass', support: 'plant' });
  blk(50, 'BRICKS', 'Bricks', { hard: 2, tool: 'pick', tier: 0 });
  blk(51, 'MOSSY_COBBLE', 'Mossy Cobblestone', { hard: 2, tool: 'pick', tier: 0 });
  blk(52, 'CLAY', 'Clay', { hard: 0.6, tool: 'shovel', sound: 'dirt', drop: 'clay' });
  blk(53, 'GLOWSTONE', 'Glowstone', { hard: 0.3, light: 15, sound: 'glass' });
  SC.NUM_BLOCKS = 54;

  // ---------- item registry ----------
  for (const d of blocks) {
    if (!d) continue;
    items[d.id] = { id: d.id, name: d.name, stack: 64, place: d.noItem ? null : d.id, block: true };
  }
  function itm(id, key, name, o = {}) {
    I[key] = id;
    items[id] = Object.assign({ id, key, name, stack: 64 }, o);
    return items[id];
  }
  itm(256, 'STICK', 'Stick', { fuel: 5 });
  itm(257, 'COAL', 'Coal', { fuel: 80 });
  itm(258, 'CHARCOAL', 'Charcoal', { fuel: 80 });
  itm(259, 'IRON_INGOT', 'Iron Ingot');
  itm(260, 'GOLD_INGOT', 'Gold Ingot');
  itm(261, 'DIAMOND', 'Diamond');
  itm(262, 'APPLE', 'Apple', { food: [4, 2.4] });
  itm(263, 'PORKCHOP', 'Raw Porkchop', { food: [3, 1.8] });
  itm(264, 'COOKED_PORKCHOP', 'Cooked Porkchop', { food: [8, 12.8] });
  itm(265, 'MUTTON', 'Raw Mutton', { food: [2, 1.2] });
  itm(266, 'COOKED_MUTTON', 'Cooked Mutton', { food: [6, 9.6] });
  itm(267, 'ROTTEN_FLESH', 'Rotten Flesh', { food: [4, 0.8] });
  itm(268, 'BONE', 'Bone');
  itm(269, 'BONE_MEAL', 'Bone Meal');
  itm(270, 'GUNPOWDER', 'Gunpowder');
  itm(271, 'BUCKET', 'Bucket', { stack: 16 });
  itm(272, 'WATER_BUCKET', 'Water Bucket', { stack: 1 });
  itm(273, 'LAVA_BUCKET', 'Lava Bucket', { stack: 1, fuel: 1000 });
  itm(274, 'DOOR', 'Oak Door', { stack: 64 });
  itm(275, 'CLAY_BALL', 'Clay Ball');
  itm(276, 'BRICK', 'Brick');
  itm(278, 'ARROW', 'Arrow');
  itm(279, 'BOW', 'Bow', { stack: 1, dur: 384 });

  // tools: 300 + tier*4 + kind
  const TIERS = [
    { n: 'Wooden', speed: 2, dur: 60, fuel: 10 },
    { n: 'Stone', speed: 4, dur: 132 },
    { n: 'Iron', speed: 6, dur: 251 },
    { n: 'Diamond', speed: 8, dur: 1562 },
  ];
  const KINDS = [
    { k: 'pick', n: 'Pickaxe', dmg: 2 },
    { k: 'axe', n: 'Axe', dmg: 3 },
    { k: 'shovel', n: 'Shovel', dmg: 1.5 },
    { k: 'sword', n: 'Sword', dmg: 4 },
  ];
  const TKEY = ['WOOD', 'STONE', 'IRON', 'DIAMOND'];
  const KKEY = ['PICK', 'AXE', 'SHOVEL', 'SWORD'];
  TIERS.forEach((t, ti) =>
    KINDS.forEach((k, ki) => {
      itm(300 + ti * 4 + ki, TKEY[ti] + '_' + KKEY[ki], t.n + ' ' + k.n, {
        stack: 1,
        tool: k.k,
        tier: ti,
        speed: t.speed,
        dmg: k.dmg + ti + (k.k === 'sword' ? 0 : 0),
        dur: t.dur,
        fuel: t.fuel,
      });
    }),
  );
  items[B.LOG].fuel = 15;
  items[B.SPRUCE_LOG].fuel = 15;
  items[B.PLANKS].fuel = 15;
  items[B.SPRUCE_PLANKS].fuel = 15;
  items[B.SAPLING].fuel = 5;
  items[B.CRAFTING_TABLE].fuel = 15;
  items[B.CHEST].fuel = 15;
  items[B.LADDER].fuel = 15;
  items[I.DOOR].place = 'door';
  items[I.BOW].fuel = 15;

  // armor: 320 + material*4 + piece (0 helmet, 1 chestplate, 2 leggings, 3 boots)
  const AMATS = [
    { n: 'Iron', k: 'IRON', col: [[214, 214, 214], [120, 120, 120], [250, 250, 250]], pts: [2, 6, 5, 2], dur: [165, 240, 225, 195], tough: 0 },
    { n: 'Golden', k: 'GOLDEN', col: [[246, 208, 60], [160, 110, 20], [255, 248, 160]], pts: [2, 5, 3, 1], dur: [77, 112, 105, 91], tough: 0 },
    { n: 'Diamond', k: 'DIAMOND', col: [[74, 226, 206], [24, 128, 116], [180, 255, 245]], pts: [3, 8, 6, 3], dur: [363, 528, 495, 429], tough: 2 },
  ];
  const PIECES = [['HELMET', 'Helmet'], ['CHESTPLATE', 'Chestplate'], ['LEGGINGS', 'Leggings'], ['BOOTS', 'Boots']];
  AMATS.forEach((m, mi) =>
    PIECES.forEach(([pk, pn], pi) =>
      itm(320 + mi * 4 + pi, m.k + '_' + pk, m.n + ' ' + pn, { stack: 1, armor: pi, pts: m.pts[pi], dur: m.dur[pi], tough: m.tough, acol: m.col }),
    ),
  );
  SC.ARMOR_MATS = AMATS;

  // creative inventory tabs
  const DECOR = ['LEAVES', 'SPRUCE_LEAVES', 'CRAFTING_TABLE', 'FURNACE', 'CHEST', 'TORCH', 'TALL_GRASS', 'ROSE', 'DANDELION', 'SAPLING', 'CACTUS', 'LADDER', 'BED', 'DEAD_BUSH', 'TNT', 'GLOWSTONE'];
  for (const it of items) {
    if (!it) continue;
    if (it.block) it.tab = DECOR.includes(blocks[it.id].key) ? 'decoration' : 'building';
    else if (it.armor !== undefined || it.tool === 'sword' || it.id === I.BOW || it.id === I.ARROW) it.tab = 'combat';
    else if (it.tool || [I.BUCKET, I.WATER_BUCKET, I.LAVA_BUCKET].includes(it.id)) it.tab = 'tools';
    else if (it.food) it.tab = 'food';
    else if (it.id === I.DOOR) it.tab = 'decoration';
    else it.tab = 'materials';
  }

  SC.maxStack = (id) => (items[id] ? items[id].stack : 64);
  SC.itemName = (id) => (items[id] ? items[id].name : '?');

  // ---------- painting helpers ----------
  const mk = () => {
    const c = document.createElement('canvas');
    c.width = c.height = 16;
    return c;
  };
  const rgb = (c, f = 1, a = 1) =>
    `rgba(${SC.clamp(Math.round(c[0] * f), 0, 255)},${SC.clamp(Math.round(c[1] * f), 0, 255)},${SC.clamp(Math.round(c[2] * f), 0, 255)},${a})`;
  SC.rgb = rgb;
  const P = (g, x, y, col) => {
    g.fillStyle = col;
    g.fillRect(x, y, 1, 1);
  };
  const noisy = (g, r, base, v = 0.2, x0 = 0, y0 = 0, w = 16, h = 16) => {
    for (let y = y0; y < y0 + h; y++)
      for (let x = x0; x < x0 + w; x++) P(g, x, y, rgb(base, 1 + (r() - 0.5) * v * 2));
  };
  const specks = (g, r, cols, n) => {
    for (let i = 0; i < n; i++) P(g, (r() * 16) | 0, (r() * 16) | 0, rgb(cols[(r() * cols.length) | 0]));
  };

  const T = {};
  const paint = {
    dirt(g, r) {
      noisy(g, r, [134, 96, 67], 0.12);
      specks(g, r, [[105, 75, 52], [92, 66, 46], [156, 116, 84], [120, 88, 60]], 50);
    },
    grass(g, r, top = [92, 158, 54]) {
      paint.dirt(g, r);
      for (let x = 0; x < 16; x++) {
        const d = 3 + (r() < 0.5 ? 1 : 0) + (r() < 0.25 ? 1 : 0);
        for (let y = 0; y < d; y++) P(g, x, y, rgb(top, 0.85 + r() * 0.3));
      }
    },
    stone(g, r, base = [125, 125, 125]) {
      noisy(g, r, base, 0.08);
      for (let i = 0; i < 9; i++) {
        const x = (r() * 14) | 0;
        const y = (r() * 16) | 0;
        const l = 1 + ((r() * 3) | 0);
        for (let k = 0; k < l; k++) P(g, x + k, y, rgb(base, r() < 0.5 ? 0.8 : 1.15));
      }
    },
    cobble(g, r, base = [122, 122, 122], moss) {
      const pts = [];
      for (let i = 0; i < 7; i++) pts.push([r() * 16, r() * 16, 0.75 + r() * 0.45]);
      for (let y = 0; y < 16; y++)
        for (let x = 0; x < 16; x++) {
          let d1 = 99, d2 = 99, c = 0;
          for (const p of pts)
            for (let ox = -16; ox <= 16; ox += 16)
              for (let oy = -16; oy <= 16; oy += 16) {
                const d = Math.hypot(x + 0.5 - p[0] - ox, y + 0.5 - p[1] - oy);
                if (d < d1) {
                  d2 = d1;
                  d1 = d;
                  c = p[2];
                } else if (d < d2) d2 = d;
              }
          const edge = d2 - d1 < 1.1;
          let col = edge ? rgb(base, 0.55) : rgb(base, c * (1 + (r() - 0.5) * 0.12) * (d1 < 1.6 ? 1.12 : 1));
          if (moss && !edge && r() < 0.35) col = rgb([70, 110, 50], 0.9 + r() * 0.3);
          P(g, x, y, col);
        }
    },
    sand(g, r) {
      noisy(g, r, [219, 207, 160], 0.06);
      specks(g, r, [[200, 188, 140], [232, 222, 180]], 30);
    },
    gravel(g, r) {
      noisy(g, r, [128, 122, 118], 0.1);
      const cols = [[95, 90, 88], [160, 154, 150], [120, 100, 90], [80, 78, 76], [145, 140, 132]];
      for (let i = 0; i < 18; i++) {
        const x = (r() * 15) | 0, y = (r() * 15) | 0, c = cols[(r() * cols.length) | 0];
        P(g, x, y, rgb(c));
        P(g, x + 1, y, rgb(c, 0.9));
        P(g, x, y + 1, rgb(c, 0.8));
      }
    },
    log(g, r, base = [104, 82, 50]) {
      for (let x = 0; x < 16; x++) {
        const f = x % 4 === 0 ? 0.7 : x % 4 === 2 ? 1.08 : 0.92;
        for (let y = 0; y < 16; y++) P(g, x, y, rgb(base, f * (1 + (r() - 0.5) * 0.14)));
      }
      for (let i = 0; i < 4; i++) {
        const x = (r() * 15) | 0, y = (r() * 15) | 0;
        P(g, x, y, rgb(base, 0.6));
        P(g, x, y + 1, rgb(base, 0.65));
      }
    },
    leaves(g, r, base = [58, 122, 38]) {
      for (let y = 0; y < 16; y++)
        for (let x = 0; x < 16; x++) {
          if (r() < 0.14) continue;
          P(g, x, y, rgb(base, 0.7 + r() * 0.5));
        }
    },
    planks(g, r, base = [162, 130, 78]) {
      noisy(g, r, base, 0.05);
      for (let b = 0; b < 4; b++) {
        const y0 = b * 4;
        for (let x = 0; x < 16; x++) P(g, x, y0 + 3, rgb(base, 0.62));
        const s = (b * 7 + 3 + ((r() * 4) | 0)) % 16;
        for (let y = y0; y < y0 + 3; y++) P(g, s, y, rgb(base, 0.68));
        for (let k = 0; k < 3; k++) P(g, (r() * 16) | 0, y0 + 1, rgb(base, 0.88));
      }
    },
    bedrock(g, r) {
      const cols = [[85, 85, 85], [40, 40, 40], [60, 60, 60], [110, 110, 110], [25, 25, 25]];
      for (let y = 0; y < 16; y += 2)
        for (let x = 0; x < 16; x += 2) {
          g.fillStyle = rgb(cols[(r() * cols.length) | 0]);
          g.fillRect(x, y, 2, 2);
        }
      specks(g, r, cols, 40);
    },
    ore(g, r, col, hi) {
      paint.stone(g, r);
      for (let i = 0; i < 4; i++) {
        const cx = 2 + ((r() * 12) | 0), cy = 2 + ((r() * 12) | 0);
        const pts = [[0, 0], [1, 0], [0, 1], [1, 1], [-1, 0], [0, -1]];
        for (const [dx, dy] of pts) if (r() < 0.75) P(g, cx + dx, cy + dy, rgb(col, 0.85 + r() * 0.25));
        P(g, cx, cy, rgb(hi));
        P(g, cx + 1, cy + 1, rgb(col, 0.6));
      }
    },
    glass(g) {
      const e = 'rgba(220,240,250,0.95)';
      g.fillStyle = 'rgba(200,230,245,0.12)';
      g.fillRect(0, 0, 16, 16);
      g.fillStyle = e;
      g.fillRect(0, 0, 16, 1);
      g.fillRect(0, 15, 16, 1);
      g.fillRect(0, 0, 1, 16);
      g.fillRect(15, 0, 1, 16);
      for (let i = 0; i < 4; i++) P(g, 3 + i, 6 - i, 'rgba(255,255,255,0.8)');
      for (let i = 0; i < 3; i++) P(g, 9 + i, 12 - i, 'rgba(255,255,255,0.7)');
    },
    table(g, r) {
      paint.planks(g, r);
      for (let y = 0; y < 4; y++) for (let x = 0; x < 16; x++) P(g, x, y, rgb([150, 98, 54], 0.85 + r() * 0.2));
      for (let x = 0; x < 16; x++) P(g, x, 3, rgb([80, 50, 25]));
      for (const x of [5, 10]) for (let y = 0; y < 3; y++) P(g, x, y, rgb([105, 70, 38]));
      for (let y = 4; y < 16; y++) {
        P(g, 0, y, rgb([90, 60, 32]));
        P(g, 15, y, rgb([90, 60, 32]));
      }
      // saw and hammer hanging on the front
      for (let x = 3; x < 8; x++) P(g, x, 7, rgb([190, 190, 190]));
      for (let x = 3; x < 8; x += 2) P(g, x, 8, rgb([150, 150, 150]));
      P(g, 8, 7, rgb([110, 70, 30]));
      P(g, 9, 7, rgb([110, 70, 30]));
      for (let y = 6; y < 13; y++) P(g, 12, y, rgb([110, 70, 30]));
      for (let x = 10; x < 15; x++) P(g, x, 6, rgb([120, 120, 125]));
      P(g, 10, 7, rgb([120, 120, 125]));
    },
    furnace(g, r, lit) {
      paint.stone(g, r, [118, 118, 118]);
      g.fillStyle = rgb([80, 80, 80]);
      g.fillRect(0, 0, 16, 1);
      g.fillRect(0, 15, 16, 1);
      g.fillRect(0, 0, 1, 16);
      g.fillRect(15, 0, 1, 16);
      g.fillStyle = rgb([60, 60, 60]);
      g.fillRect(3, 7, 10, 1);
      g.fillStyle = rgb([28, 26, 26]);
      g.fillRect(4, 8, 8, 5);
      if (lit) {
        for (let x = 4; x < 12; x++)
          for (let y = 10; y < 13; y++) P(g, x, y, r() < 0.5 ? rgb([255, 190, 60]) : rgb([240, 110, 20]));
        for (let x = 4; x < 12; x += 2) P(g, x + ((r() * 2) | 0), 9, rgb([255, 230, 120]));
      }
      g.fillStyle = rgb([95, 95, 95]);
      g.fillRect(3, 13, 10, 1);
    },
    chest(g, r) {
      const o = [58, 38, 16];
      noisy(g, r, [168, 112, 44], 0.06, 1, 2, 14, 14);
      g.fillStyle = rgb(o);
      g.fillRect(1, 2, 14, 1);
      g.fillRect(1, 15, 14, 1);
      g.fillRect(1, 2, 1, 14);
      g.fillRect(14, 2, 1, 14);
      g.fillRect(1, 7, 14, 1);
      for (let x = 2; x < 14; x++) P(g, x, 3, rgb([196, 140, 70]));
      g.fillStyle = rgb([200, 200, 200]);
      g.fillRect(7, 6, 2, 3);
      P(g, 7, 8, rgb([120, 120, 120]));
    },
    torch(g) {
      g.fillStyle = rgb([118, 88, 50]);
      g.fillRect(7, 7, 2, 9);
      g.fillStyle = rgb([84, 62, 34]);
      g.fillRect(8, 7, 1, 9);
      g.fillStyle = rgb([255, 160, 40]);
      g.fillRect(7, 4, 2, 3);
      g.fillStyle = rgb([255, 228, 110]);
      g.fillRect(7, 5, 2, 2);
      P(g, 7, 3, rgb([255, 250, 200]));
    },
    tallgrass(g, r) {
      for (let i = 0; i < 7; i++) {
        let x = 1 + r() * 14;
        const h = 5 + ((r() * 8) | 0);
        const lean = (r() - 0.5) * 0.5;
        for (let k = 0; k < h; k++) {
          P(g, x | 0, 15 - k, rgb([86, 150, 50], 0.75 + r() * 0.4));
          x += lean;
        }
      }
    },
    deadbush(g, r) {
      const c = [122, 86, 46];
      for (let k = 0; k < 8; k++) P(g, 8, 15 - k, rgb(c));
      for (let k = 0; k < 6; k++) P(g, 8 - k, 11 - k, rgb(c, 0.9));
      for (let k = 0; k < 5; k++) P(g, 8 + k, 10 - k, rgb(c, 0.9));
      for (let k = 0; k < 3; k++) P(g, 4 - k, 9, rgb(c, 0.8));
      for (let k = 0; k < 3; k++) P(g, 11, 7 - k, rgb(c, 0.8));
      P(g, 2 + ((r() * 2) | 0), 4, rgb(c));
    },
    flower(g, r, petal, mid) {
      for (let y = 8; y < 16; y++) P(g, 7, y, rgb([60, 130, 40]));
      P(g, 6, 12, rgb([70, 145, 45]));
      P(g, 5, 11, rgb([70, 145, 45]));
      P(g, 8, 13, rgb([70, 145, 45]));
      for (const [x, y] of [[6, 4], [7, 4], [8, 4], [5, 5], [6, 5], [8, 5], [9, 5], [5, 6], [6, 6], [8, 6], [9, 6], [6, 7], [7, 7], [8, 7]])
        P(g, x, y, rgb(petal, 0.85 + r() * 0.25));
      P(g, 7, 5, rgb(mid));
      P(g, 7, 6, rgb(mid, 0.85));
    },
    sapling(g, r) {
      for (let y = 9; y < 16; y++) P(g, 7, y, rgb([100, 72, 40]));
      for (let y = 2; y < 11; y++)
        for (let x = 3; x < 13; x++) {
          const d = Math.hypot(x - 7.5, (y - 6) * 1.2);
          if (d < 4.2 && r() < 0.8) P(g, x, y, rgb([60, 130, 40], 0.7 + r() * 0.5));
        }
    },
    cactus(g, r) {
      for (let y = 0; y < 16; y++)
        for (let x = 2; x < 14; x++) {
          const f = x === 2 || x === 13 ? 0.7 : x % 4 === 1 ? 0.8 : 1;
          P(g, x, y, rgb([46, 128, 42], f * (0.95 + r() * 0.1)));
        }
      for (let y = 1; y < 16; y += 3) {
        P(g, 1, y, rgb([30, 30, 20]));
        P(g, 14, y + 1, rgb([30, 30, 20]));
      }
    },
    sandstone(g, r) {
      noisy(g, r, [216, 202, 152], 0.04);
      for (let x = 0; x < 16; x++) {
        P(g, x, 0, rgb([230, 220, 175]));
        P(g, x, 1, rgb([224, 212, 165]));
        P(g, x, 15, rgb([180, 165, 120]));
        P(g, x, 8, rgb([200, 186, 138]));
      }
    },
    snow(g, r) {
      noisy(g, r, [240, 246, 250], 0.03);
      specks(g, r, [[225, 232, 240]], 14);
    },
    ice(g, r) {
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) P(g, x, y, rgb([150, 188, 248], 0.95 + r() * 0.1, 0.82));
      for (let i = 0; i < 5; i++) P(g, 3 + i, 9 - i, 'rgba(235,245,255,0.9)');
      for (let i = 0; i < 3; i++) P(g, 10 + i, 13 - i, 'rgba(235,245,255,0.9)');
    },
    obsidian(g, r) {
      noisy(g, r, [22, 16, 34], 0.25);
      specks(g, r, [[60, 40, 95], [45, 30, 70], [80, 60, 120]], 22);
    },
    tnt(g, r) {
      for (let y = 0; y < 16; y++)
        for (let x = 0; x < 16; x++) P(g, x, y, rgb(x % 4 === 3 ? [150, 30, 20] : [205, 52, 34], 0.95 + r() * 0.1));
      g.fillStyle = rgb([230, 230, 225]);
      g.fillRect(0, 5, 16, 6);
      const L = ['###.#..#.###', '.#..##.#..#.', '.#..#.##..#.', '.#..#..#..#.'];
      L.forEach((row, y) => [...row].forEach((c, x) => c === '#' && P(g, x + 2, y + 6, rgb([30, 30, 30]))));
    },
    ladder(g) {
      const c = [126, 92, 52];
      g.fillStyle = rgb(c);
      g.fillRect(2, 0, 2, 16);
      g.fillRect(12, 0, 2, 16);
      for (let y = 1; y < 16; y += 4) g.fillRect(2, y, 12, 2);
      g.fillStyle = rgb(c, 0.7);
      for (let y = 2; y < 16; y += 4) g.fillRect(4, y, 8, 1);
    },
    door(g, r, top, open) {
      const c = [160, 124, 74];
      if (open) {
        noisy(g, r, c, 0.05, 0, 0, 3, 16);
        g.fillStyle = rgb(c, 0.6);
        g.fillRect(2, 0, 1, 16);
        return;
      }
      noisy(g, r, c, 0.05, 1, 0, 14, 16);
      g.fillStyle = rgb(c, 0.6);
      g.fillRect(1, 0, 1, 16);
      g.fillRect(14, 0, 1, 16);
      if (top) {
        g.fillRect(1, 0, 14, 1);
        g.fillStyle = 'rgba(190,225,240,0.5)';
        g.clearRect(3, 3, 4, 5);
        g.clearRect(9, 3, 4, 5);
        g.fillRect(3, 3, 4, 5);
        g.fillRect(9, 3, 4, 5);
        g.fillStyle = rgb(c, 0.75);
        g.fillRect(1, 11, 14, 1);
      } else {
        g.fillRect(1, 15, 14, 1);
        g.fillStyle = rgb(c, 0.75);
        for (const y of [4, 10]) g.fillRect(3, y, 10, 1);
        g.fillStyle = rgb([70, 70, 70]);
        g.fillRect(12, 1, 1, 2);
      }
    },
    bed(g) {
      g.fillStyle = rgb([120, 82, 45]);
      g.fillRect(0, 11, 16, 2);
      g.fillRect(1, 13, 2, 3);
      g.fillRect(13, 13, 2, 3);
      g.fillStyle = rgb([235, 235, 235]);
      g.fillRect(1, 7, 5, 4);
      g.fillStyle = rgb([178, 34, 34]);
      g.fillRect(5, 6, 11, 5);
      g.fillStyle = rgb([140, 22, 22]);
      g.fillRect(5, 10, 11, 1);
      g.fillStyle = rgb([205, 60, 60]);
      g.fillRect(5, 6, 11, 1);
    },
    wool(g, r) {
      noisy(g, r, [232, 232, 232], 0.04);
      for (let y = 0; y < 16; y++) for (let x = (y % 4) / 2; x < 16; x += 4) P(g, x | 0, y, rgb([215, 215, 215]));
    },
    bricks(g, r, base = [122, 122, 122], mortar = [88, 88, 88], h = 4) {
      noisy(g, r, base, 0.07);
      for (let row = 0; row < 16 / h; row++) {
        const y0 = row * h;
        for (let x = 0; x < 16; x++) P(g, x, y0 + h - 1, rgb(mortar));
        const off = row % 2 ? 4 : 0;
        for (let x = off; x < 16; x += 8) for (let y = y0; y < y0 + h - 1; y++) P(g, (x + 7) % 16, y, rgb(mortar));
        for (let x = 0; x < 16; x++) P(g, x, y0, rgb(base, 1.1));
      }
    },
    deepslate(g, r) {
      noisy(g, r, [72, 72, 78], 0.08);
      for (let i = 0; i < 10; i++) {
        const x = (r() * 12) | 0, y = (r() * 16) | 0;
        for (let k = 0; k < 4; k++) P(g, x + k, y, rgb([92, 92, 100]));
      }
    },
    metal(g, r, base) {
      noisy(g, r, base, 0.04);
      g.fillStyle = rgb(base, 1.18);
      g.fillRect(0, 0, 16, 1);
      g.fillRect(0, 0, 1, 16);
      g.fillStyle = rgb(base, 0.72);
      g.fillRect(0, 15, 16, 1);
      g.fillRect(15, 0, 1, 16);
      g.fillStyle = rgb(base, 0.9);
      g.fillRect(3, 3, 10, 10);
      g.fillStyle = rgb(base, 1.08);
      g.fillRect(4, 4, 8, 8);
    },
    clay(g, r) {
      noisy(g, r, [160, 166, 178], 0.05);
      specks(g, r, [[145, 150, 162], [175, 180, 190]], 20);
    },
    glowstone(g, r) {
      for (let y = 0; y < 16; y++)
        for (let x = 0; x < 16; x++) {
          const v = r();
          P(g, x, y, rgb(v < 0.3 ? [255, 238, 170] : v < 0.7 ? [220, 170, 90] : [150, 105, 50]));
        }
    },
    water(g, r) {
      noisy(g, r, [52, 98, 226], 0.06);
      for (let i = 0; i < 6; i++) {
        const x = (r() * 12) | 0, y = (r() * 16) | 0;
        for (let k = 0; k < 4; k++) P(g, x + k, y, rgb([90, 140, 245]));
      }
    },
    lava(g, r) {
      noisy(g, r, [212, 84, 18], 0.1);
      for (let i = 0; i < 9; i++) {
        const x = (r() * 14) | 0, y = (r() * 14) | 0;
        P(g, x, y, rgb([255, 190, 50]));
        P(g, x + 1, y, rgb([255, 160, 40]));
        P(g, x, y + 1, rgb([250, 140, 30]));
      }
    },
  };

  const PAINTERS = {
    GRASS: (g, r) => paint.grass(g, r),
    DIRT: paint.dirt,
    STONE: (g, r) => paint.stone(g, r),
    COBBLE: (g, r) => paint.cobble(g, r),
    SAND: paint.sand,
    GRAVEL: paint.gravel,
    LOG: (g, r) => paint.log(g, r),
    LEAVES: (g, r) => paint.leaves(g, r),
    PLANKS: (g, r) => paint.planks(g, r),
    BEDROCK: paint.bedrock,
    WATER: paint.water,
    LAVA: paint.lava,
    COAL_ORE: (g, r) => paint.ore(g, r, [40, 40, 40], [70, 70, 70]),
    IRON_ORE: (g, r) => paint.ore(g, r, [216, 175, 147], [240, 210, 190]),
    GOLD_ORE: (g, r) => paint.ore(g, r, [250, 220, 60], [255, 250, 160]),
    DIAMOND_ORE: (g, r) => paint.ore(g, r, [80, 220, 225], [210, 255, 255]),
    GLASS: paint.glass,
    CRAFTING_TABLE: paint.table,
    FURNACE: (g, r) => paint.furnace(g, r, false),
    FURNACE_LIT: (g, r) => paint.furnace(g, r, true),
    CHEST: paint.chest,
    TORCH: paint.torch,
    TALL_GRASS: paint.tallgrass,
    ROSE: (g, r) => paint.flower(g, r, [215, 30, 30], [120, 20, 20]),
    DANDELION: (g, r) => paint.flower(g, r, [250, 220, 40], [230, 150, 20]),
    SAPLING: paint.sapling,
    CACTUS: paint.cactus,
    SANDSTONE: paint.sandstone,
    SNOW_GRASS: (g, r) => paint.grass(g, r, [242, 248, 252]),
    SNOW: paint.snow,
    ICE: paint.ice,
    OBSIDIAN: paint.obsidian,
    TNT: paint.tnt,
    LADDER: paint.ladder,
    DOOR_B: (g, r) => paint.door(g, r, false, false),
    DOOR_T: (g, r) => paint.door(g, r, true, false),
    DOOR_BO: (g, r) => paint.door(g, r, false, true),
    DOOR_TO: (g, r) => paint.door(g, r, true, true),
    BED: paint.bed,
    WOOL: paint.wool,
    STONE_BRICKS: (g, r) => paint.bricks(g, r),
    SPRUCE_LOG: (g, r) => paint.log(g, r, [70, 50, 30]),
    SPRUCE_LEAVES: (g, r) => paint.leaves(g, r, [44, 86, 56]),
    SPRUCE_PLANKS: (g, r) => paint.planks(g, r, [112, 82, 50]),
    DEEPSLATE: paint.deepslate,
    IRON_BLOCK: (g, r) => paint.metal(g, r, [222, 222, 222]),
    GOLD_BLOCK: (g, r) => paint.metal(g, r, [248, 210, 60]),
    DIAMOND_BLOCK: (g, r) => paint.metal(g, r, [98, 228, 222]),
    DEAD_BUSH: paint.deadbush,
    BRICKS: (g, r) => paint.bricks(g, r, [150, 74, 58], [180, 170, 160]),
    MOSSY_COBBLE: (g, r) => paint.cobble(g, r, [122, 122, 122], true),
    CLAY: paint.clay,
    GLOWSTONE: paint.glowstone,
  };

  // ---------- item icons ----------
  const TIER_COL = [
    [[150, 116, 65], [104, 78, 30], [180, 145, 90]],
    [[132, 132, 132], [80, 80, 80], [165, 165, 165]],
    [[225, 225, 225], [150, 150, 150], [255, 255, 255]],
    [[70, 230, 205], [30, 140, 128], [170, 255, 245]],
  ];
  const HANDLE = [[137, 103, 39], [73, 54, 21]];

  function drawMask(g, mask, col) {
    const has = (x, y) => x >= 0 && y >= 0 && x < 16 && y < 16 && mask[y * 16 + x];
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        if (!has(x, y)) continue;
        const edge = !has(x - 1, y) || !has(x + 1, y) || !has(x, y - 1) || !has(x, y + 1);
        const lit = !has(x - 1, y - 1) && !edge;
        P(g, x, y, rgb(edge ? col[1] : lit ? col[2] : col[0]));
      }
  }
  function handle(g, x0, y0, len) {
    for (let t = 0; t < len; t++) {
      P(g, x0 + t, y0 - t, rgb(HANDLE[0]));
      P(g, x0 + t + 1, y0 - t, rgb(HANDLE[1]));
    }
  }
  function toolIcon(g, kind, tier) {
    const col = TIER_COL[tier];
    const m = new Uint8Array(256);
    const set = (x, y) => x >= 0 && y >= 0 && x < 16 && y < 16 && (m[y * 16 + x] = 1);
    if (kind === 'sword') {
      for (let t = 0; t < 11; t++) {
        set(4 + t, 11 - t);
        set(5 + t, 11 - t);
        set(4 + t, 10 - t);
      }
      for (let t = -2; t <= 2; t++) set(3 + t, 10 + t);
      drawMask(g, m, col);
      for (let t = 0; t < 3; t++) P(g, 2 - t + 0, 13 + t - 0, rgb(HANDLE[t % 2]));
      P(g, 3, 12, rgb(HANDLE[0]));
      P(g, 0, 15, rgb(HANDLE[1]));
      for (let t = 1; t < 10; t++) P(g, 5 + t, 10 - t, rgb(col[2]));
      return;
    }
    handle(g, 1, 14, kind === 'shovel' ? 9 : 10);
    if (kind === 'pick') {
      for (let y = 0; y < 16; y++)
        for (let x = 0; x < 16; x++) {
          const d = Math.hypot(x + 0.5 - 1, 15 - (y + 0.5));
          const a = (Math.atan2(15 - (y + 0.5), x + 0.5 - 1) * 180) / Math.PI;
          if (d > 11 && d < 14.2 && a > 10 && a < 80) set(x, y);
        }
    } else if (kind === 'axe') {
      for (let y = 0; y < 16; y++)
        for (let x = 0; x < 16; x++) {
          const s = x - y, p = x + y - 15;
          if (s >= 1 && s <= 6 && p >= -7 && p <= 0) set(x, y);
        }
    } else if (kind === 'shovel') {
      for (let y = 0; y < 16; y++)
        for (let x = 0; x < 16; x++) if (Math.abs(x - 11.5) + Math.abs(y - 3.5) <= 4) set(x, y);
    }
    drawMask(g, m, col);
  }

  function armorMask(piece) {
    const m = new Uint8Array(256);
    const R = (x0, y0, x1, y1) => {
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) m[y * 16 + x] = 1;
    };
    if (piece === 0) {
      R(3, 3, 12, 6);
      R(3, 7, 5, 9);
      R(10, 7, 12, 9);
    } else if (piece === 1) {
      R(1, 1, 5, 6);
      R(10, 1, 14, 6);
      R(4, 3, 11, 14);
      R(6, 3, 9, 3);
    } else if (piece === 2) {
      R(3, 2, 12, 5);
      R(3, 6, 6, 14);
      R(9, 6, 12, 14);
    } else if (piece === 3) {
      R(2, 7, 5, 12);
      R(1, 11, 5, 13);
      R(10, 7, 13, 12);
      R(10, 11, 14, 13);
    } else {
      // shield outline for the offhand slot
      R(3, 2, 12, 9);
      R(4, 10, 11, 11);
      R(5, 12, 10, 12);
      R(6, 13, 9, 13);
    }
    return m;
  }
  SC.slotIcons = [];
  SC.buildSlotIcons = () => {
    for (let k = 0; k < 5; k++) {
      const c = mk();
      const g = c.getContext('2d');
      const m = armorMask(k);
      for (let i = 0; i < 256; i++) if (m[i]) P(g, i % 16, (i / 16) | 0, 'rgba(60,60,60,0.28)');
      SC.slotIcons.push(c);
    }
  };

  const ICON_PIX = {
    // simple shape icons: [palette, rows]
    COAL: [{ a: [36, 36, 36], b: [70, 70, 70], c: [20, 20, 20] }, blob(5.5, 'a', 'b', 'c')],
    CHARCOAL: [{ a: [60, 48, 38], b: [95, 78, 62], c: [30, 24, 18] }, blob(5.5, 'a', 'b', 'c')],
  };
  function blob(rad, a, b, c) {
    const rows = [];
    for (let y = 0; y < 16; y++) {
      let s = '';
      for (let x = 0; x < 16; x++) {
        const d = Math.hypot((x - 7.5) * 1.05, (y - 8) * 1.2 + ((x * 7) % 3) * 0.15);
        s += d < rad - 1.1 ? (x + y < 14 && (x * 3 + y) % 5 === 0 ? b : a) : d < rad ? c : '.';
      }
      rows.push(s);
    }
    return rows;
  }
  function pix(g, pal, rows) {
    rows.forEach((row, y) => [...row].forEach((ch, x) => ch !== '.' && pal[ch] && P(g, x, y, rgb(pal[ch]))));
  }

  const ITEM_PAINT = {
    STICK: (g) => handle(g, 3, 13, 10),
    COAL: (g) => pix(g, ...ICON_PIX.COAL),
    CHARCOAL: (g) => pix(g, ...ICON_PIX.CHARCOAL),
    IRON_INGOT: (g) => ingot(g, [222, 222, 222]),
    GOLD_INGOT: (g) => ingot(g, [250, 212, 60]),
    BRICK: (g) => ingot(g, [168, 80, 60]),
    DIAMOND: (g) =>
      pix(g, { a: [80, 230, 220], b: [210, 255, 255], c: [20, 120, 120] }, [
        '................', '................', '.....cccccc.....', '....cbbaaaac....', '...cbaaaaaaac...', '..cbaaaaaaaaac..',
        '..caaaaaaaaaac..', '...caaaaaaaac...', '....caaaaaac....', '.....caaaac.....', '......caac......', '.......cc.......',
        '................', '................', '................', '................',
      ]),
    APPLE: (g) => {
      pix(g, { a: [214, 36, 36], b: [255, 120, 110], c: [130, 15, 15] }, blob(5.6, 'a', 'b', 'c').map((r, y) => (y < 4 ? '.'.repeat(16) : r)));
      P(g, 8, 2, rgb([90, 60, 30]));
      P(g, 8, 3, rgb([90, 60, 30]));
      P(g, 9, 2, rgb([70, 150, 40]));
      P(g, 10, 2, rgb([70, 150, 40]));
      P(g, 6, 6, rgb([255, 160, 150]));
    },
    PORKCHOP: (g) => meat(g, [240, 140, 140], [250, 200, 200], [180, 80, 90]),
    COOKED_PORKCHOP: (g) => meat(g, [176, 104, 60], [220, 170, 120], [110, 60, 30]),
    MUTTON: (g) => meat(g, [205, 60, 60], [240, 220, 210], [130, 30, 30]),
    COOKED_MUTTON: (g) => meat(g, [140, 80, 50], [220, 200, 170], [80, 45, 25]),
    ROTTEN_FLESH: (g) => meat(g, [130, 118, 62], [160, 90, 70], [80, 70, 35]),
    BONE: (g) => {
      for (let t = 0; t < 9; t++) P(g, 4 + t, 11 - t, rgb([235, 232, 215]));
      for (let t = 0; t < 9; t++) P(g, 5 + t, 11 - t, rgb([200, 196, 180]));
      for (const [x, y] of [[2, 11], [3, 13], [2, 12], [4, 13], [13, 2], [12, 1], [14, 3], [13, 1]]) P(g, x, y, rgb([235, 232, 215]));
    },
    BONE_MEAL: (g) => pile(g, [238, 236, 228], [200, 198, 190]),
    GUNPOWDER: (g) => pile(g, [110, 110, 110], [60, 60, 60]),
    CLAY_BALL: (g) => pix(g, { a: [160, 166, 180], b: [200, 205, 215], c: [110, 115, 125] }, blob(4.6, 'a', 'b', 'c')),
    BUCKET: (g) => bucket(g, null),
    WATER_BUCKET: (g) => bucket(g, [60, 110, 235]),
    LAVA_BUCKET: (g) => bucket(g, [240, 120, 20]),
    DOOR: (g) => {
      const c = document.createElement('canvas');
      c.width = c.height = 16;
      const cg = c.getContext('2d');
      paint.door(cg, SC.rng(5), true, false);
      g.drawImage(c, 0, 0, 16, 16, 4, 0, 8, 8);
      paint.door(cg, SC.rng(6), false, false);
      g.drawImage(c, 0, 0, 16, 16, 4, 8, 8, 8);
    },
    ARROW: (g) => {
      for (let t = 0; t < 10; t++) P(g, 3 + t, 12 - t, rgb([120, 90, 50]));
      for (const [x, y] of [[12, 2], [13, 2], [13, 3], [12, 1], [14, 3]]) P(g, x, y, rgb([150, 150, 150]));
      for (const [x, y] of [[2, 12], [3, 13], [1, 12], [3, 14], [2, 13]]) P(g, x, y, rgb([235, 235, 235]));
    },
    BOW: (g) => {
      for (let y = 0; y < 16; y++)
        for (let x = 0; x < 16; x++) {
          const d = Math.hypot(x - 1, y - 15);
          if (d > 12.5 && d < 14 && x > 0 && y < 15) P(g, x, y, rgb([120, 82, 40]));
        }
      for (let t = 0; t < 12; t++) P(g, 2 + t, 13 - t, rgb([220, 220, 220]));
    },
  };
  function ingot(g, c) {
    pix(g, { a: c.map((v) => v * 0.9), b: c, c: c.map((v) => v * 0.6), d: c.map((v) => Math.min(255, v * 1.15)) }, [
      '................', '................', '................', '................', '................', '.....cccccc.....',
      '....cddddddc....', '...cbbbbbbbbc...', '..caaaaaaaaaac..', '..caaaaaaaaaac..', '..cccccccccccc..', '................',
      '................', '................', '................', '................',
    ]);
  }
  function meat(g, a, b, c) {
    pix(g, { a, b, c }, [
      '................', '................', '................', '.....cccc.......', '....caaaacc.....', '...caaaaaaacc...',
      '..caaaaaaaaaac..', '..caaaaaaaaaabc.', '..caaaaaaaaaabc.', '...caaaaaaaabc..', '....cbbbbbbbc...', '.....ccccccc....',
      '................', '................', '................', '................',
    ]);
  }
  function pile(g, a, c) {
    pix(g, { a, c, b: a.map((v) => Math.min(255, v * 1.1)) }, [
      '................', '................', '................', '................', '................', '................',
      '.......a........', '......aab.......', '.....aacaa......', '....aaaaaca.....', '...acaaaaaaa....', '..aaaaacaaaca...',
      '..aaaaaaaaaaa...', '................', '................', '................',
    ]);
  }
  function bucket(g, fill) {
    const o = [70, 70, 70], m = [170, 170, 170], l = [210, 210, 210];
    for (let y = 4; y < 14; y++) {
      const inset = Math.floor((y - 4) / 4);
      for (let x = 3 + inset; x <= 12 - inset; x++) {
        const edge = x === 3 + inset || x === 12 - inset || y === 13;
        P(g, x, y, rgb(edge ? o : x < 6 ? l : m));
      }
    }
    for (let x = 4; x < 12; x++) P(g, x, 4, rgb(fill || [40, 40, 40]));
    for (let x = 5; x < 11; x++) P(g, x, 5, rgb(fill ? fill.map((v) => v * 0.8) : [55, 55, 55]));
    for (let x = 3; x < 13; x++) P(g, x, 3, rgb(o));
  }

  // ---------- build everything ----------
  SC.tex = [];
  SC.wallTex = [];
  SC.backTex = [];
  SC.icons = [];
  SC.texColor = [];
  function darken(c, f) {
    const d = mk();
    const g = d.getContext('2d');
    g.drawImage(c, 0, 0);
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = `rgba(0,0,0,${1 - f})`;
    g.fillRect(0, 0, 16, 16);
    return d;
  }
  SC.buildTextures = () => {
    for (const d of blocks) {
      if (!d || d.id === 0) continue;
      const c = mk();
      const g = c.getContext('2d');
      const fn = PAINTERS[d.key];
      if (fn) fn(g, SC.rng(1000 + d.id * 77));
      SC.tex[d.id] = c;
      SC.wallTex[d.id] = darken(c, 0.5);
      SC.backTex[d.id] = darken(c, 0.3);
      // average colour (for particles and the map)
      const px = g.getImageData(0, 0, 16, 16).data;
      let r = 0, gg = 0, b = 0, n = 0;
      for (let i = 0; i < px.length; i += 4)
        if (px[i + 3] > 100) {
          r += px[i];
          gg += px[i + 1];
          b += px[i + 2];
          n++;
        }
      SC.texColor[d.id] = n ? [r / n, gg / n, b / n] : [128, 128, 128];
    }
    for (const it of items) {
      if (!it) continue;
      if (it.block) {
        SC.icons[it.id] = SC.tex[it.id];
        continue;
      }
      const c = mk();
      const g = c.getContext('2d');
      if (it.armor !== undefined) drawMask(g, armorMask(it.armor), it.acol);
      else if (it.tool) toolIcon(g, it.tool, it.tier);
      else if (ITEM_PAINT[it.key]) ITEM_PAINT[it.key](g);
      SC.icons[it.id] = c;
      const px = g.getImageData(0, 0, 16, 16).data;
      let r = 0, gg = 0, b = 0, n = 0;
      for (let i = 0; i < px.length; i += 4)
        if (px[i + 3] > 100) {
          r += px[i];
          gg += px[i + 1];
          b += px[i + 2];
          n++;
        }
      SC.texColor[it.id] = n ? [r / n, gg / n, b / n] : [128, 128, 128];
    }
    SC.buildSlotIcons();
  };

  // ---------- smelting and fuel ----------
  SC.smelt = {
    [B.IRON_ORE]: I.IRON_INGOT,
    [B.GOLD_ORE]: I.GOLD_INGOT,
    [B.SAND]: B.GLASS,
    [B.COBBLE]: B.STONE,
    [B.LOG]: I.CHARCOAL,
    [B.SPRUCE_LOG]: I.CHARCOAL,
    [I.PORKCHOP]: I.COOKED_PORKCHOP,
    [I.MUTTON]: I.COOKED_MUTTON,
    [I.CLAY_BALL]: I.BRICK,
    [B.CLAY]: B.BRICKS,
    [B.DIAMOND_ORE]: I.DIAMOND,
    [B.COAL_ORE]: I.COAL,
  };
  SC.fuelTime = (id) => (items[id] && items[id].fuel) || 0;
})();
