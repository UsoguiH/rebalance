// Shaped crafting recipes (2x2 and 3x3 grids, mirrored patterns match too).
(function () {
  const SC = window.SC;
  const B = SC.B, I = SC.I;
  const PLANKS = [B.PLANKS, B.SPRUCE_PLANKS];
  const R = (SC.recipes = []);
  const add = (p, k, id, n = 1) => R.push({ p, k, out: [id, n] });

  add(['L'], { L: B.LOG }, B.PLANKS, 4);
  add(['L'], { L: B.SPRUCE_LOG }, B.SPRUCE_PLANKS, 4);
  add(['P', 'P'], { P: PLANKS }, I.STICK, 4);
  add(['PP', 'PP'], { P: PLANKS }, B.CRAFTING_TABLE);
  add(['C', '|'], { C: [I.COAL, I.CHARCOAL], '|': I.STICK }, B.TORCH, 4);
  add(['CCC', 'C C', 'CCC'], { C: [B.COBBLE, B.DEEPSLATE] }, B.FURNACE);
  add(['PPP', 'P P', 'PPP'], { P: PLANKS }, B.CHEST);
  add(['| |', '|||', '| |'], { '|': I.STICK }, B.LADDER, 3);
  add(['PP', 'PP', 'PP'], { P: PLANKS }, I.DOOR, 3);
  add(['GSG', 'SGS', 'GSG'], { G: I.GUNPOWDER, S: B.SAND }, B.TNT);
  add(['WWW', 'PPP'], { W: B.WOOL, P: PLANKS }, B.BED);
  add(['SS', 'SS'], { S: B.STONE }, B.STONE_BRICKS, 4);
  add(['SS', 'SS'], { S: B.SAND }, B.SANDSTONE);
  add(['SS', 'SS'], { S: B.SNOW }, B.ICE);
  add(['BB', 'BB'], { B: I.BRICK }, B.BRICKS);
  add(['CC', 'CC'], { C: I.CLAY_BALL }, B.CLAY);
  add(['I I', ' I '], { I: I.IRON_INGOT }, I.BUCKET);
  add(['B'], { B: I.BONE }, I.BONE_MEAL, 3);
  add(['CM'], { C: B.COBBLE, M: I.BONE_MEAL }, B.MOSSY_COBBLE);
  add([' T ', 'TGT', ' T '], { T: B.TORCH, G: B.GLASS }, B.GLOWSTONE);
  add([' |W', '| W', ' |W'], { '|': I.STICK, W: B.WOOL }, I.BOW);
  add(['F', '|', 'W'], { F: B.GRAVEL, '|': I.STICK, W: B.WOOL }, I.ARROW, 4);
  for (const [ing, blk] of [[I.IRON_INGOT, B.IRON_BLOCK], [I.GOLD_INGOT, B.GOLD_BLOCK], [I.DIAMOND, B.DIAMOND_BLOCK]]) {
    add(['XXX', 'XXX', 'XXX'], { X: ing }, blk);
    add(['X'], { X: blk }, ing, 9);
  }
  [I.IRON_INGOT, I.GOLD_INGOT, I.DIAMOND].forEach((m, mi) => {
    const base = 320 + mi * 4;
    add(['XXX', 'X X'], { X: m }, base);
    add(['X X', 'XXX', 'XXX'], { X: m }, base + 1);
    add(['XXX', 'X X', 'X X'], { X: m }, base + 2);
    add(['X X', 'X X'], { X: m }, base + 3);
  });
  const MATS = [PLANKS, [B.COBBLE, B.DEEPSLATE], [I.IRON_INGOT], [I.DIAMOND]];
  MATS.forEach((m, t) => {
    const base = 300 + t * 4;
    add(['MMM', ' | ', ' | '], { M: m, '|': I.STICK }, base + 0);
    add(['MM', 'M|', ' |'], { M: m, '|': I.STICK }, base + 1);
    add(['M', '|', '|'], { M: m, '|': I.STICK }, base + 2);
    add(['M', 'M', '|'], { M: m, '|': I.STICK }, base + 3);
  });

  const okKey = (want, id) => (Array.isArray(want) ? want.includes(id) : want === id);

  // grid: array of stacks (or null), size n*n. Returns [id, count] or null.
  SC.matchRecipe = (grid, n) => {
    let x0 = n, y0 = n, x1 = -1, y1 = -1;
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++)
        if (grid[y * n + x]) {
          x0 = Math.min(x0, x);
          y0 = Math.min(y0, y);
          x1 = Math.max(x1, x);
          y1 = Math.max(y1, y);
        }
    if (x1 < 0) return null;
    const w = x1 - x0 + 1, h = y1 - y0 + 1;
    const at = (x, y) => {
      const s = grid[(y0 + y) * n + x0 + x];
      return s ? s.id : 0;
    };
    for (const r of R) {
      if (r.p.length !== h) continue;
      const rw = Math.max(...r.p.map((s) => s.length));
      if (rw !== w) continue;
      for (const mirror of [false, true]) {
        let ok = true;
        for (let y = 0; y < h && ok; y++)
          for (let x = 0; x < w && ok; x++) {
            const ch = r.p[y][mirror ? w - 1 - x : x] || ' ';
            const id = at(x, y);
            if (ch === ' ') ok = id === 0;
            else ok = id !== 0 && okKey(r.k[ch], id);
          }
        if (ok) return r.out;
      }
    }
    return null;
  };
})();
