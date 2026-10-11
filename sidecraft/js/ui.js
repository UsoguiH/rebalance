// In-game UI in the classic layout: hotbar, offhand slot, experience bar,
// hearts, armor, hunger, air, chat, action bar, crosshair and debug screen;
// plus the container screens (inventory, crafting table, chest, furnace) and
// the tabbed creative inventory. Everything is drawn in GUI pixels.
(function () {
  const SC = window.SC;
  const B = SC.B, I = SC.I;
  const F = SC.font;
  const GUI = SC.gui;
  const UI = (SC.ui = {});
  const game = () => SC.game;
  const TITLE = '#404040';

  // ---------- HUD icons (9x9) ----------
  const PIX = {
    heart: ['.##...##.', '#hh#.#rr#', '#hrr#rrr#', '#rrrrrrr#', '#rrrrrrd#', '.#rrrdd#.', '..#rdd#..', '...#d#...', '....#....'],
    heartC: ['.##...##.', '#ii#.#ii#', '#iiiiiii#', '#iiiiiii#', '#iiiiiii#', '.#iiiii#.', '..#iii#..', '...#i#...', '....#....'],
    hard: ['.##...##.', '#hh#.#rr#', '#h#r#r#r#', '#rrrrrrr#', '#r#####d#', '.#rrrdd#.', '..#rdd#..', '...#d#...', '....#....'],
    food: ['.....###.', '....#bbb#', '...#bbbbb', '...#bbbb#', '..#bbbbd#', '.#w#bdd#.', '#ww.###..', '#w#......', '.#.......'],
    foodC: ['.....###.', '....#iii#', '...#iiiii', '...#iiii#', '..#iiiii#', '.#i#iii#.', '#ii.###..', '#i#......', '.#.......'],
    bubble: ['..###....', '.#wbb#...', '#wbbbb#..', '#bbbbb#..', '#bbbbb#..', '.#bbb#...', '..###....', '.........', '.........'],
    armor: ['.##...##.', '#ww###ww#', '#wwwwwww#', '.#wwwww#.', '.#wwwww#.', '.#wwwww#.', '.#wwwww#.', '.#######.', '.........'],
    armorC: ['.##...##.', '#ii###ii#', '#iiiiiii#', '.#iiiii#.', '.#iiiii#.', '.#iiiii#.', '.#iiiii#.', '.#######.', '.........'],
  };
  const PAL = { '#': '#000000', r: '#D41616', h: '#FF9C9C', d: '#8C0E0E', i: '#3a3a3a', b: '#B8682A', w: '#E8DCC8' };
  const PAL2 = { bubble: { '#': '#203a80', b: '#6aa0ff', w: '#ffffff' }, armor: { '#': '#000', w: '#E0E0E0' } };
  const iconC = {};
  function icon(name, half, white) {
    const key = name + (half || '') + (white ? 'W' : '');
    if (iconC[key]) return iconC[key];
    const c = document.createElement('canvas');
    c.width = c.height = 9;
    const g = c.getContext('2d');
    PIX[name].forEach((row, y) =>
      [...row].forEach((ch, x) => {
        if (ch === '.') return;
        if (half === 'L' && x > 4 && ch !== '#') return;
        let col = (PAL2[name] && PAL2[name][ch]) || PAL[ch];
        if (white && ch === '#') col = '#FFFFFF';
        g.fillStyle = col;
        g.fillRect(x, y, 1, 1);
      }),
    );
    return (iconC[key] = c);
  }

  // ---------- shared drawing ----------
  UI.scale = () => GUI.gs;
  UI.drawStack = (ctx, s, x, y, count = true) => {
    if (!s) return;
    const ic = SC.icons[s.id];
    if (ic) ctx.drawImage(ic, x, y, 16, 16);
    const it = SC.items[s.id];
    if (it && it.dur && s.d > 0) {
      const f = 1 - s.d / it.dur;
      ctx.fillStyle = '#000';
      ctx.fillRect(x + 2, y + 13, 13, 2);
      ctx.fillStyle = `hsl(${Math.round(f * 120)},100%,50%)`;
      ctx.fillRect(x + 2, y + 13, Math.max(1, Math.round(13 * f)), 1);
    }
    if (count && s.n > 1) F.right(ctx, String(s.n), x + 17, y + 9, '#FFFFFF');
  };
  function panel(ctx, x, y, w, h) {
    ctx.fillStyle = '#000';
    ctx.fillRect(x + 2, y, w - 4, 1);
    ctx.fillRect(x + 2, y + h - 1, w - 4, 1);
    ctx.fillRect(x, y + 2, 1, h - 4);
    ctx.fillRect(x + w - 1, y + 2, 1, h - 4);
    ctx.fillRect(x + 1, y + 1, 1, 1);
    ctx.fillRect(x + w - 2, y + 1, 1, 1);
    ctx.fillRect(x + 1, y + h - 2, 1, 1);
    ctx.fillRect(x + w - 2, y + h - 2, 1, 1);
    ctx.fillStyle = '#C6C6C6';
    ctx.fillRect(x + 1, y + 2, w - 2, h - 4);
    ctx.fillRect(x + 2, y + 1, w - 4, h - 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x + 2, y + 1, w - 5, 2);
    ctx.fillRect(x + 1, y + 2, 2, h - 5);
    ctx.fillRect(x + 3, y + 3, 1, 1);
    ctx.fillStyle = '#555555';
    ctx.fillRect(x + 3, y + h - 3, w - 5, 2);
    ctx.fillRect(x + w - 3, y + 3, 2, h - 5);
    ctx.fillRect(x + w - 4, y + h - 4, 1, 1);
  }
  UI.panel = panel;
  function slotBox(ctx, x, y, big) {
    const s = big ? 26 : 18;
    const ox = big ? x - 5 : x - 1, oy = big ? y - 5 : y - 1;
    ctx.fillStyle = '#373737';
    ctx.fillRect(ox, oy, s - 1, 1);
    ctx.fillRect(ox, oy, 1, s - 1);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(ox + 1, oy + s - 1, s - 1, 1);
    ctx.fillRect(ox + s - 1, oy + 1, 1, s - 1);
    ctx.fillStyle = '#8B8B8B';
    ctx.fillRect(ox + 1, oy + 1, s - 2, s - 2);
    ctx.fillRect(ox, oy + s - 1, 1, 1);
    ctx.fillRect(ox + s - 1, oy, 1, 1);
  }
  function arrow(ctx, x, y, f) {
    const shape = ['..........##..........', '..........###.........', '###################...', '####################..', '###################...', '..........###.........', '..........##..........'];
    shape.forEach((row, yy) =>
      [...row].forEach((ch, xx) => {
        if (ch !== '#') return;
        ctx.fillStyle = xx / 20 < f ? '#FFFFFF' : '#8B8B8B';
        ctx.fillRect(x + xx, y + yy + 4, 1, 1);
      }),
    );
  }
  function flame(ctx, x, y, f) {
    const shape = ['......#.......', '.....##.......', '.....###......', '....####......', '....#####.....', '...######.....', '..########....', '..#########...', '.###########..', '.############.', '##############', '##############', '.############.', '..##########..'];
    const H = shape.length;
    shape.forEach((row, yy) =>
      [...row].forEach((ch, xx) => {
        if (ch !== '#') return;
        const lit = (H - yy) / H <= f;
        ctx.fillStyle = lit ? (yy > 9 ? '#FFD040' : yy > 5 ? '#FF9A10' : '#FF5A10') : '#8B8B8B';
        ctx.fillRect(x + xx, y + yy, 1, 1);
      }),
    );
  }
  UI.tooltip = (ctx, lines, x, y) => {
    const w = Math.max(...lines.map((l) => F.width(l)));
    const h = lines.length === 1 ? 8 : 8 + 2 + (lines.length - 1) * 10;
    x = Math.min(x, GUI.W - w - 4);
    if (y + h + 6 > GUI.H) y = GUI.H - h - 6;
    y = Math.max(4, y);
    ctx.fillStyle = 'rgba(16,0,16,0.94)';
    ctx.fillRect(x - 3, y - 4, w + 6, 1);
    ctx.fillRect(x - 3, y + h + 3, w + 6, 1);
    ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
    ctx.fillRect(x - 4, y - 3, 1, h + 6);
    ctx.fillRect(x + w + 3, y - 3, 1, h + 6);
    const grd = ctx.createLinearGradient(0, y - 3, 0, y + h + 3);
    grd.addColorStop(0, 'rgba(80,0,255,0.31)');
    grd.addColorStop(1, 'rgba(40,0,127,0.31)');
    ctx.fillStyle = grd;
    ctx.fillRect(x - 3, y - 2, 1, h + 4);
    ctx.fillRect(x + w + 2, y - 2, 1, h + 4);
    ctx.fillRect(x - 3, y - 3, w + 6, 1);
    ctx.fillRect(x - 3, y + h + 2, w + 6, 1);
    lines.forEach((l, k) => F.draw(ctx, l, x, y + (k ? 10 * k + 2 : 0), '#FFFFFF'));
  };
  function tipLines(s) {
    const it = SC.items[s.id];
    const lines = [SC.itemName(s.id)];
    if (it && it.tool) {
      const spd = { sword: 1.6, pick: 1.2, axe: 0.9, shovel: 1.0 }[it.tool];
      lines.push('', '§7When in Main Hand:', `§2 ${it.dmg + 1} Attack Damage`, `§2 ${spd} Attack Speed`);
    }
    if (it && it.armor !== undefined) {
      lines.push('', '§7' + ['When on Head:', 'When on Body:', 'When on Legs:', 'When on Feet:'][it.armor], `§9+${it.pts} Armor`);
      if (it.tough) lines.push(`§9+${it.tough} Armor Toughness`);
    }
    if (game().advTips) {
      if (it && it.dur) lines.push(`Durability: ${it.dur - (s.d || 0)} / ${it.dur}`);
      const key = it.key || (SC.blocks[s.id] && SC.blocks[s.id].key) || '';
      lines.push(`§8sidecraft:${key.toLowerCase()} (#${String(s.id).padStart(4, '0')})`);
    }
    return lines;
  }

  // ---------- screens: open / close ----------
  UI.open = (type, data = {}) => {
    const g = game();
    if (type === 'inv' && g.creative) type = 'creative';
    g.ui = Object.assign({ type, grid: new Array(type === 'craft' ? 9 : 4).fill(null), scroll: 0, tab: UI.lastTab || 'building', search: '' }, data);
    SC.input.lmb = SC.input.rmb = false;
    UI.drag = null;
    SC.renderer.cv.style.cursor = 'default';
  };
  UI.close = () => {
    const g = game();
    const ui = g.ui;
    if (!ui) return;
    const p = g.player;
    const back = (s) => {
      if (!s) return;
      const left = p.give(s.id, s.n, s.d);
      if (left) g.dropItem(p.x, p.y - 1.4, s.id, left, s.d, p.facing * 4);
    };
    ui.grid.forEach(back);
    back(g.cursor);
    g.cursor = null;
    g.ui = null;
    UI.drag = null;
    SC.renderer.cv.style.cursor = SC.gui.screen ? 'default' : 'none';
  };

  // ---------- layouts ----------
  const TABS = [
    { id: 'building', name: 'Building Blocks', icon: () => B.BRICKS, row: 0, col: 0 },
    { id: 'decoration', name: 'Decoration Blocks', icon: () => B.ROSE, row: 0, col: 1 },
    { id: 'search', name: 'Search Items', icon: () => 0, row: 0, col: 5 },
    { id: 'materials', name: 'Miscellaneous', icon: () => I.STICK, row: 1, col: 0 },
    { id: 'food', name: 'Foodstuffs', icon: () => I.APPLE, row: 1, col: 1 },
    { id: 'tools', name: 'Tools', icon: () => 309, row: 1, col: 2 },
    { id: 'combat', name: 'Combat', icon: () => 311, row: 1, col: 3 },
    { id: 'inventory', name: 'Survival Inventory', icon: () => B.CHEST, row: 1, col: 5 },
  ];
  const tabX = (t) => (t.col === 5 ? 195 - 28 : t.col * 28);
  function dims() {
    const ui = game().ui;
    if (ui.type === 'creative') return [195, 136];
    if (ui.type === 'chest') return [176, 168];
    return [176, 166];
  }
  function origin() {
    const [w, h] = dims();
    return [Math.floor((GUI.W - w) / 2), Math.floor((GUI.H - h) / 2)];
  }
  function playerSlots(slots, y0) {
    const p = game().player;
    for (let i = 9; i < 36; i++) slots.push({ arr: p.inv, i, x: 8 + ((i - 9) % 9) * 18, y: y0 + Math.floor((i - 9) / 9) * 18, sec: 'main' });
    for (let i = 0; i < 9; i++) slots.push({ arr: p.inv, i, x: 8 + i * 18, y: y0 + 58, sec: 'hot' });
  }
  function paletteItems() {
    const ui = game().ui;
    const out = [];
    for (const it of SC.items) {
      if (!it || (it.block && (it.place === null || it.id === 0))) continue;
      if (ui.tab === 'search') {
        if (!ui.search || it.name.toLowerCase().includes(ui.search.toLowerCase())) out.push(it.id);
      } else if (it.tab === ui.tab) out.push(it.id);
    }
    return out;
  }
  function layout() {
    const g = game();
    const ui = g.ui;
    const p = g.player;
    const slots = [];
    if (ui.type === 'creative') {
      if (ui.tab === 'inventory') {
        [[54, 6], [54, 33], [108, 6], [108, 33]].forEach(([x, y], k) => slots.push({ arr: p.armor, i: k, x, y, sec: 'armor', armor: k }));
        slots.push({ arr: p.off, i: 0, x: 35, y: 20, sec: 'off' });
        for (let i = 9; i < 36; i++) slots.push({ arr: p.inv, i, x: 9 + ((i - 9) % 9) * 18, y: 54 + Math.floor((i - 9) / 9) * 18, sec: 'main' });
        slots.push({ destroy: true, x: 173, y: 112, sec: 'destroy' });
      } else {
        const list = paletteItems();
        const rows = Math.ceil(list.length / 9);
        ui.maxScroll = Math.max(0, rows - 5);
        ui.scroll = SC.clamp(ui.scroll, 0, ui.maxScroll);
        for (let k = 0; k < 45; k++) {
          const id = list[k + ui.scroll * 9];
          if (id === undefined) break;
          slots.push({ pal: true, id, x: 9 + (k % 9) * 18, y: 18 + Math.floor(k / 9) * 18, sec: 'pal' });
        }
      }
      for (let i = 0; i < 9; i++) slots.push({ arr: p.inv, i, x: 9 + i * 18, y: 112, sec: 'hot' });
      return slots;
    }
    if (ui.type === 'chest') playerSlots(slots, 85);
    else playerSlots(slots, 84);
    if (ui.type === 'inv') {
      for (let k = 0; k < 4; k++) slots.push({ arr: p.armor, i: k, x: 8, y: 8 + k * 18, sec: 'armor', armor: k });
      slots.push({ arr: p.off, i: 0, x: 77, y: 62, sec: 'off' });
      for (let k = 0; k < 4; k++) slots.push({ arr: ui.grid, i: k, x: 98 + (k % 2) * 18, y: 18 + Math.floor(k / 2) * 18, sec: 'grid' });
      slots.push({ out: true, x: 154, y: 28, sec: 'out' });
    } else if (ui.type === 'craft') {
      for (let k = 0; k < 9; k++) slots.push({ arr: ui.grid, i: k, x: 30 + (k % 3) * 18, y: 17 + Math.floor(k / 3) * 18, sec: 'grid' });
      slots.push({ out: true, x: 124, y: 35, sec: 'out', big: true });
    } else if (ui.type === 'chest') {
      for (let k = 0; k < 27; k++) slots.push({ arr: ui.c.items, i: k, x: 8 + (k % 9) * 18, y: 18 + Math.floor(k / 9) * 18, sec: 'cont' });
    } else if (ui.type === 'furnace') {
      slots.push({ arr: ui.c.slots, i: 0, x: 56, y: 17, sec: 'fin' });
      slots.push({ arr: ui.c.slots, i: 1, x: 56, y: 53, sec: 'ffuel' });
      slots.push({ arr: ui.c.slots, i: 2, x: 116, y: 35, sec: 'fout', big: true });
    }
    return slots;
  }

  function craftResult() {
    const ui = game().ui;
    if (ui.type !== 'inv' && ui.type !== 'craft') return null;
    return SC.matchRecipe(ui.grid, ui.type === 'craft' ? 3 : 2);
  }
  function consumeGrid() {
    const ui = game().ui;
    for (let k = 0; k < ui.grid.length; k++) {
      const s = ui.grid[k];
      if (!s) continue;
      if (s.id === I.WATER_BUCKET || s.id === I.LAVA_BUCKET) {
        ui.grid[k] = { id: I.BUCKET, n: 1 };
        continue;
      }
      s.n--;
      if (s.n <= 0) ui.grid[k] = null;
    }
  }
  const accepts = (sl, s) => {
    if (!s) return true;
    if (sl.sec === 'armor') return SC.items[s.id].armor === sl.armor;
    if (sl.sec === 'fout' || sl.out || sl.pal || sl.destroy) return false;
    return true;
  };
  const crafted = (id, n) => game().statMap && game().statMap('crafted', id, n);

  function shiftClick(sl) {
    const g = game();
    const ui = g.ui;
    const p = g.player;
    const s = sl.arr[sl.i];
    if (!s) return;
    const MAIN = Array.from({ length: 27 }, (_, i) => i + 9);
    const HOT = [...Array(9).keys()];
    let left = s.n;
    const put = (arr, idxs) => {
      left = SC.addToSlots(arr, s.id, left, s.d, idxs);
    };
    const it = SC.items[s.id];
    if (sl.sec === 'hot' || sl.sec === 'main') {
      if (ui.type === 'chest') put(ui.c.items, null);
      else if (ui.type === 'furnace') {
        if (SC.smelt[s.id] !== undefined) put(ui.c.slots, [0]);
        else if (SC.fuelTime(s.id)) put(ui.c.slots, [1]);
        if (left) put(p.inv, sl.sec === 'hot' ? MAIN : HOT);
      } else if (it.armor !== undefined && !p.armor[it.armor] && (ui.type === 'inv' || (ui.type === 'creative' && ui.tab === 'inventory'))) {
        p.armor[it.armor] = s;
        sl.arr[sl.i] = null;
        return;
      } else if (ui.type === 'creative' && ui.tab !== 'inventory') {
        sl.arr[sl.i] = null;
        return;
      } else put(p.inv, sl.sec === 'hot' ? MAIN : HOT);
    } else put(p.inv, sl.sec === 'grid' || sl.sec === 'cont' ? [...MAIN, ...HOT] : [...HOT, ...MAIN]);
    if (left) s.n = left;
    else sl.arr[sl.i] = null;
  }

  let lastClick = { t: 0, sl: null };
  function clickSlot(sl, button, shift) {
    const g = game();
    const ui = g.ui;
    const c = g.cursor;
    if (sl.pal) {
      const max = SC.maxStack(sl.id);
      if (c) g.cursor = null;
      else if (shift) g.player.give(sl.id, max);
      else g.cursor = { id: sl.id, n: button === 2 ? 1 : max, d: 0 };
      return;
    }
    if (sl.destroy) {
      if (c) g.cursor = null;
      else if (shift) {
        g.player.inv.fill(null);
        g.player.armor.fill(null);
        g.player.off[0] = null;
      }
      return;
    }
    if (sl.out) {
      const r = craftResult();
      if (!r) return;
      if (shift) {
        for (let k = 0; k < 64; k++) {
          const rr = craftResult();
          if (!rr || rr[0] !== r[0]) break;
          const left = g.player.give(rr[0], rr[1]);
          consumeGrid();
          crafted(rr[0], rr[1]);
          if (left) {
            g.dropItem(g.player.x, g.player.y - 1.4, rr[0], left);
            break;
          }
        }
        return;
      }
      if (!c) g.cursor = { id: r[0], n: r[1], d: 0 };
      else if (c.id === r[0] && c.n + r[1] <= SC.maxStack(c.id)) c.n += r[1];
      else return;
      consumeGrid();
      crafted(r[0], r[1]);
      return;
    }
    const arr = sl.arr, i = sl.i;
    const s = arr[i];
    if (shift) {
      shiftClick(sl);
      return;
    }
    // double click gathers matching items into the cursor
    const now = performance.now();
    if (button === 0 && c && lastClick.sl && lastClick.sl.arr === arr && lastClick.sl.i === i && now - lastClick.t < 300) {
      const max = SC.maxStack(c.id);
      const pools = [g.player.inv, ...(ui.c && ui.c.items ? [ui.c.items] : []), ui.grid];
      for (const pool of pools)
        for (let k = 0; k < pool.length && c.n < max; k++) {
          const t = pool[k];
          if (t && t.id === c.id && !t.d) {
            const m = Math.min(t.n, max - c.n);
            c.n += m;
            t.n -= m;
            if (!t.n) pool[k] = null;
          }
        }
      lastClick = { t: 0, sl: null };
      return;
    }
    lastClick = { t: now, sl };
    if (sl.sec === 'fout') {
      if (!s) return;
      if (!c) {
        g.cursor = s;
        arr[i] = null;
      } else if (c.id === s.id && c.n + s.n <= SC.maxStack(c.id)) {
        c.n += s.n;
        arr[i] = null;
      } else return;
      if (ui.c.xp >= 1) {
        SC.dropXP(g.player.x, g.player.y - 1, Math.floor(ui.c.xp));
        ui.c.xp -= Math.floor(ui.c.xp);
      }
      return;
    }
    if (button === 0) {
      if (!c) {
        g.cursor = s;
        arr[i] = null;
      } else if (!s) {
        if (!accepts(sl, c)) return;
        if (sl.sec === 'armor') {
          arr[i] = { id: c.id, n: 1, d: c.d };
          c.n -= 1;
          if (!c.n) g.cursor = null;
        } else {
          arr[i] = c;
          g.cursor = null;
        }
      } else if (s.id === c.id && SC.maxStack(s.id) > 1) {
        const t = Math.min(c.n, SC.maxStack(s.id) - s.n);
        s.n += t;
        c.n -= t;
        if (!c.n) g.cursor = null;
      } else if (accepts(sl, c) && (sl.sec !== 'armor' || c.n === 1)) {
        arr[i] = c;
        g.cursor = s;
      }
    } else {
      if (!c) {
        if (!s) return;
        const h = Math.ceil(s.n / 2);
        g.cursor = { id: s.id, n: h, d: s.d };
        s.n -= h;
        if (!s.n) arr[i] = null;
      } else if (!s) {
        if (!accepts(sl, c)) return;
        arr[i] = { id: c.id, n: 1, d: c.d };
        c.n--;
        if (!c.n) g.cursor = null;
      } else if (s.id === c.id && s.n < SC.maxStack(s.id)) {
        s.n++;
        c.n--;
        if (!c.n) g.cursor = null;
      } else if (accepts(sl, c) && (sl.sec !== 'armor' || c.n === 1)) {
        arr[i] = c;
        g.cursor = s;
      }
    }
  }

  function hitTest(mx, my) {
    const [ox, oy] = origin();
    for (const sl of layout()) {
      const sx = ox + sl.x, sy = oy + sl.y;
      if (mx >= sx - 1 && mx < sx + 17 && my >= sy - 1 && my < sy + 17) return sl;
    }
    return null;
  }
  function tabAt(mx, my) {
    const ui = game().ui;
    if (!ui || ui.type !== 'creative') return null;
    const [ox, oy] = origin();
    for (const t of TABS) {
      const x = ox + tabX(t), y = t.row === 0 ? oy - 28 : oy + 136 - 4;
      if (mx >= x && mx < x + 28 && my >= y && my < y + 32) return t;
    }
    return null;
  }
  function insidePanel(mx, my) {
    const [ox, oy] = origin();
    const [w, h] = dims();
    return (mx >= ox && mx < ox + w && my >= oy && my < oy + h) || !!tabAt(mx, my);
  }

  // left/right drag spreads the held stack across several slots
  UI.drag = null;
  function finishDrag() {
    const g = game();
    const d = UI.drag;
    UI.drag = null;
    const c = g.cursor;
    if (!c) return;
    if (d.slots.length <= 1) {
      if (d.slots.length === 1) clickSlot(d.slots[0], d.button, false);
      return;
    }
    const each = d.button === 0 ? Math.floor(c.n / d.slots.length) : 1;
    if (!each) return;
    for (const sl of d.slots) {
      const s = sl.arr[sl.i];
      const max = SC.maxStack(c.id);
      const room = s ? max - s.n : max;
      const t = Math.min(each, room, c.n);
      if (t <= 0) continue;
      if (s) s.n += t;
      else sl.arr[sl.i] = { id: c.id, n: t, d: c.d };
      c.n -= t;
    }
    if (c.n <= 0) g.cursor = null;
  }

  UI.update = () => {
    const g = game();
    const inp = SC.input;
    const ui = g.ui;
    if (!ui) return;
    const mx = inp.mx / GUI.gs, my = inp.my / GUI.gs;
    const shift = inp.down.ShiftLeft || inp.down.ShiftRight;
    if (UI.drag) {
      const held = UI.drag.button === 0 ? inp.lmb : inp.rmb;
      const sl = hitTest(mx, my);
      const c = g.cursor;
      if (
        sl && sl.arr && !sl.out && sl.sec !== 'fout' && c && accepts(sl, c) && (!sl.arr[sl.i] || sl.arr[sl.i].id === c.id) &&
        !UI.drag.slots.some((o) => o.arr === sl.arr && o.i === sl.i) && UI.drag.slots.length < c.n
      )
        UI.drag.slots.push(sl);
      if (!held) finishDrag();
      return;
    }
    if (inp.lpress || inp.rpress) {
      const button = inp.lpress ? 0 : 2;
      const tab = tabAt(mx, my);
      if (tab) {
        ui.tab = tab.id;
        UI.lastTab = tab.id;
        ui.scroll = 0;
        SC.audio.play('click', { v: 0.5 });
        return;
      }
      if (ui.type === 'creative' && ui.tab !== 'inventory') {
        const [ox, oy] = origin();
        if (mx >= ox + 175 && mx < ox + 189 && my >= oy + 18 && my < oy + 130) ui.dragScroll = true;
      }
      const sl = hitTest(mx, my);
      if (sl) {
        if (g.cursor && !shift && sl.arr && !sl.out && sl.sec !== 'fout' && inp.lmb + inp.rmb > 0) {
          UI.drag = { button, slots: [sl] };
          return;
        }
        clickSlot(sl, button, shift);
      } else if (!insidePanel(mx, my) && g.cursor) {
        const p = g.player;
        const c = g.cursor;
        const n = button === 0 ? c.n : 1;
        g.dropItem(p.x, p.y - 1.4, c.id, n, c.d, p.facing * 5);
        if (g.stat) g.stat('dropped', n);
        c.n -= n;
        if (!c.n) g.cursor = null;
      } else if (ui.type === 'creative' && ui.tab !== 'inventory' && g.cursor && insidePanel(mx, my)) g.cursor = null;
    }
    if (ui.dragScroll) {
      if (!inp.lmb) ui.dragScroll = false;
      else {
        const [, oy] = origin();
        ui.scroll = Math.round(SC.clamp((my - oy - 18 - 7) / (112 - 15), 0, 1) * (ui.maxScroll || 0));
      }
    }
    for (let k = 1; k <= 9; k++)
      if (inp.pressed[SC.options.keys['hot' + k]]) {
        const sl = hitTest(mx, my);
        const inv = g.player.inv;
        if (sl && sl.arr && !sl.out) {
          const a = sl.arr[sl.i];
          if (accepts(sl, inv[k - 1])) {
            sl.arr[sl.i] = inv[k - 1];
            inv[k - 1] = a;
          }
        } else if (sl && sl.pal) inv[k - 1] = { id: sl.id, n: SC.maxStack(sl.id), d: 0 };
      }
    if (inp.pressed[SC.options.keys.drop] && !(ui.type === 'creative' && ui.tab === 'search')) {
      const sl = hitTest(mx, my);
      if (sl && sl.arr && sl.arr[sl.i] && !g.cursor) {
        const s = sl.arr[sl.i];
        const n = inp.down.ControlLeft || inp.down.ControlRight ? s.n : 1;
        const p = g.player;
        g.dropItem(p.x, p.y - 1.4, s.id, n, s.d, p.facing * 5);
        s.n -= n;
        if (!s.n) sl.arr[sl.i] = null;
      }
    }
    if (inp.wheel && ui.type === 'creative') ui.scroll = SC.clamp(ui.scroll + inp.wheel, 0, ui.maxScroll || 0);
  };
  // typing into the creative search box
  UI.keyDown = (e) => {
    const ui = game().ui;
    if (!ui || ui.type !== 'creative' || ui.tab !== 'search') return false;
    if (e.key === 'Escape') return false;
    if (e.key === 'Backspace') ui.search = ui.search.slice(0, -1);
    else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) ui.search = (ui.search + e.key).slice(0, 50);
    else return false;
    ui.scroll = 0;
    return true;
  };

  // ---------- drawing the container screens ----------
  UI.drawScreen = (ctx) => {
    const g = game();
    const ui = g.ui;
    if (!ui) return;
    GUI.dim(ctx);
    const [ox, oy] = origin();
    const [pw, ph] = dims();
    const p = g.player;
    const T = (s, x, y) => F.draw(ctx, s, ox + x, oy + y, TITLE, false);
    const mx = SC.input.mx / GUI.gs, my = SC.input.my / GUI.gs;

    if (ui.type === 'creative') {
      for (const t of TABS) if (t.id !== ui.tab) drawTab(ctx, ox, oy, t, false);
      panel(ctx, ox, oy, pw, ph);
      const cur = TABS.find((t) => t.id === ui.tab);
      if (ui.tab !== 'inventory') {
        for (let k = 0; k < 45; k++) slotBox(ctx, ox + 9 + (k % 9) * 18, oy + 18 + Math.floor(k / 9) * 18);
        ctx.fillStyle = '#373737';
        ctx.fillRect(ox + 174, oy + 17, 14, 1);
        ctx.fillRect(ox + 174, oy + 17, 1, 113);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(ox + 175, oy + 130, 14, 1);
        ctx.fillRect(ox + 188, oy + 18, 1, 112);
        ctx.fillStyle = '#8B8B8B';
        ctx.fillRect(ox + 175, oy + 18, 13, 112);
        const ky = oy + 18 + Math.round((ui.maxScroll ? ui.scroll / ui.maxScroll : 0) * (112 - 15));
        GUI.drawButtonTex(ctx, ox + 175, ky, 12, 15, ui.maxScroll ? 0 : 2);
        if (ui.tab === 'search') {
          ctx.fillStyle = '#A0A0A0';
          ctx.fillRect(ox + 80, oy + 3, 91, 14);
          ctx.fillStyle = '#000';
          ctx.fillRect(ox + 81, oy + 4, 89, 12);
          F.draw(ctx, ui.search + (Math.floor(GUI.t * 3) % 2 ? '_' : ''), ox + 83, oy + 6, '#FFFFFF');
        }
        T(cur.name, 8, 6);
      } else {
        ctx.fillStyle = '#000';
        ctx.fillRect(ox + 72, oy + 5, 34, 45);
        ctx.fillStyle = '#8B8B8B';
        ctx.fillRect(ox + 73, oy + 6, 32, 43);
        SC.drawHumanoid(ctx, ox + 89, oy + 47, 1.25, mx > ox + 89 ? 1 : -1, playerLook(p));
      }
      for (const sl of layout()) {
        if (sl.pal) {
          UI.drawStack(ctx, { id: sl.id, n: 1 }, ox + sl.x, oy + sl.y);
          continue;
        }
        slotBox(ctx, ox + sl.x, oy + sl.y);
        if (sl.destroy) {
          ctx.fillStyle = '#C04040';
          for (let k = 0; k < 10; k++) {
            ctx.fillRect(ox + sl.x + 3 + k, oy + sl.y + 3 + k, 1, 1);
            ctx.fillRect(ox + sl.x + 12 - k, oy + sl.y + 3 + k, 1, 1);
          }
          continue;
        }
        const s = sl.arr[sl.i];
        if (!s && sl.sec === 'armor') ctx.drawImage(SC.slotIcons[sl.armor], ox + sl.x, oy + sl.y);
        if (!s && sl.sec === 'off') ctx.drawImage(SC.slotIcons[4], ox + sl.x, oy + sl.y);
        UI.drawStack(ctx, s, ox + sl.x, oy + sl.y);
      }
      drawTab(ctx, ox, oy, cur, true);
    } else {
      panel(ctx, ox, oy, pw, ph);
      if (ui.type === 'inv') {
        ctx.fillStyle = '#000';
        ctx.fillRect(ox + 25, oy + 7, 51, 72);
        SC.drawHumanoid(ctx, ox + 51, oy + 75, 2, mx > ox + 51 ? 1 : -1, playerLook(p));
        T('Crafting', 97, 8);
        arrow(ctx, ox + 134, oy + 28, 0);
      } else if (ui.type === 'craft') {
        T('Crafting', 28, 6);
        arrow(ctx, ox + 90, oy + 31, 0);
        T('Inventory', 8, 72);
      } else if (ui.type === 'chest') {
        T('Chest', 8, 6);
        T('Inventory', 8, 74);
      } else if (ui.type === 'furnace') {
        const c = ui.c;
        F.center(ctx, 'Furnace', ox + 88, oy + 6, TITLE, false);
        flame(ctx, ox + 56, oy + 36, c.burn > 0 ? c.burn / (c.burnMax || 1) : 0);
        arrow(ctx, ox + 79, oy + 30, c.cook / SC.SMELT_TIME);
        T('Inventory', 8, 72);
      }
      for (const sl of layout()) {
        slotBox(ctx, ox + sl.x, oy + sl.y, sl.big);
        const s = sl.out ? (craftResult() ? { id: craftResult()[0], n: craftResult()[1] } : null) : sl.arr[sl.i];
        if (!s && sl.sec === 'armor') ctx.drawImage(SC.slotIcons[sl.armor], ox + sl.x, oy + sl.y);
        if (!s && sl.sec === 'off') ctx.drawImage(SC.slotIcons[4], ox + sl.x, oy + sl.y);
        UI.drawStack(ctx, s, ox + sl.x, oy + sl.y);
      }
    }
    if (UI.drag && UI.drag.slots.length > 1)
      for (const sl of UI.drag.slots) {
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillRect(ox + sl.x, oy + sl.y, 16, 16);
      }
    const hov = hitTest(mx, my);
    if (hov && !hov.destroy) {
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillRect(ox + hov.x, oy + hov.y, 16, 16);
    }
    if (g.cursor) UI.drawStack(ctx, g.cursor, mx - 8, my - 8);
    else if (hov) {
      const s = hov.pal ? { id: hov.id } : hov.destroy ? null : hov.out ? (craftResult() ? { id: craftResult()[0] } : null) : hov.arr[hov.i];
      if (s) UI.tooltip(ctx, tipLines(s), mx + 12, my - 12);
      else if (hov.destroy) UI.tooltip(ctx, ['Destroy Item'], mx + 12, my - 12);
    } else {
      const t = tabAt(mx, my);
      if (t) UI.tooltip(ctx, [t.name], mx + 12, my - 12);
    }
  };
  function drawTab(ctx, ox, oy, t, sel) {
    const x = ox + tabX(t);
    const top = t.row === 0;
    const y = top ? oy - 28 : oy + 136 - 4;
    const h = 32;
    ctx.fillStyle = '#000';
    ctx.fillRect(x + 1, top ? y : y + h - 1, 26, 1);
    ctx.fillRect(x, top ? y + 1 : y, 1, h - 1);
    ctx.fillRect(x + 27, top ? y + 1 : y, 1, h - 1);
    ctx.fillStyle = sel ? '#C6C6C6' : '#A8A8A8';
    ctx.fillRect(x + 1, top ? y + 1 : y, 26, h - 1);
    ctx.fillStyle = sel ? '#FFFFFF' : '#C6C6C6';
    ctx.fillRect(x + 1, top ? y + 1 : y, 2, h - (sel ? 1 : 5));
    if (top) ctx.fillRect(x + 1, y + 1, 25, 2);
    ctx.fillStyle = sel ? '#555555' : '#7A7A7A';
    ctx.fillRect(x + 25, top ? y + 3 : y, 2, h - (sel ? 3 : 7));
    if (!top) ctx.fillRect(x + 3, y + h - 3, 22, 2);
    if (t.id === 'search') {
      const gx = x + 6, gy = y + 9;
      ctx.fillStyle = '#9ad0ff';
      ctx.fillRect(gx + 3, gy + 2, 6, 4);
      ctx.fillRect(gx + 4, gy + 1, 4, 6);
      ctx.fillStyle = '#404040';
      for (const [a, b] of [[4, 0], [5, 0], [6, 0], [7, 0], [3, 1], [8, 1], [2, 2], [9, 2], [2, 3], [9, 3], [2, 4], [9, 4], [2, 5], [9, 5], [3, 6], [8, 6], [4, 7], [5, 7], [6, 7], [7, 7], [8, 8], [9, 9], [10, 10], [11, 11], [12, 12], [9, 8], [10, 9], [11, 10], [12, 11], [13, 12]])
        ctx.fillRect(gx + a, gy + b, 1, 1);
      return;
    }
    const ic = SC.icons[t.icon()];
    if (ic) ctx.drawImage(ic, x + 6, top ? y + 9 : y + 7, 16, 16);
  }
  function playerLook(p) {
    return {
      skin: [199, 150, 110], hair: [72, 46, 26], shirt: [0, 168, 168], pants: [62, 62, 160], shoes: [70, 70, 70],
      walk: 0, swing: 0, held: p.held() ? p.held().id : 0, offhand: p.offhand ? p.offhand.id : 0, armor: p.armorColors(),
    };
  }

  // ---------- HUD ----------
  let hotbarTex = null, selTex = null;
  function makeHotbar() {
    const c = document.createElement('canvas');
    c.width = 182;
    c.height = 22;
    const g = c.getContext('2d');
    g.fillStyle = 'rgba(0,0,0,0.75)';
    g.fillRect(0, 0, 182, 22);
    for (let i = 0; i < 9; i++) {
      const x = 1 + i * 20;
      g.fillStyle = '#7B7B7B';
      g.fillRect(x, 1, 20, 20);
      g.fillStyle = '#9C9C9C';
      g.fillRect(x, 1, 20, 1);
      g.fillRect(x, 1, 1, 20);
      g.fillStyle = '#4A4A4A';
      g.fillRect(x + 1, 20, 19, 1);
      g.fillRect(x + 19, 2, 1, 19);
      g.clearRect(x + 2, 3, 17, 17);
      g.fillStyle = 'rgba(35,35,35,0.62)';
      g.fillRect(x + 2, 3, 17, 17);
      g.fillStyle = 'rgba(20,20,20,0.6)';
      g.fillRect(x + 2, 2, 17, 1);
      g.fillRect(x + 1, 2, 1, 18);
    }
    return c;
  }
  function makeSel() {
    const c = document.createElement('canvas');
    c.width = c.height = 24;
    const g = c.getContext('2d');
    g.fillStyle = '#000';
    g.fillRect(0, 0, 24, 24);
    g.fillStyle = '#FFFFFF';
    g.fillRect(1, 1, 22, 2);
    g.fillRect(1, 1, 2, 22);
    g.fillStyle = '#C6C6C6';
    g.fillRect(1, 21, 22, 2);
    g.fillRect(21, 1, 2, 22);
    g.fillStyle = '#E8E8E8';
    g.fillRect(3, 3, 18, 1);
    g.fillRect(3, 3, 1, 18);
    g.fillStyle = '#A0A0A0';
    g.fillRect(3, 20, 18, 1);
    g.fillRect(20, 3, 1, 18);
    g.clearRect(4, 4, 16, 16);
    return c;
  }

  UI.drawHUD = (ctx) => {
    const g = game();
    const p = g.player;
    const { W, H } = GUI;
    if (!hotbarTex) {
      hotbarTex = makeHotbar();
      selTex = makeSel();
    }
    const survival = !g.creative && !p.spectator;
    if (g.hideHud) {
      drawChat(ctx);
      return;
    }
    if (!p.spectator) {
      const hx = Math.floor(W / 2) - 91;
      ctx.drawImage(hotbarTex, hx, H - 22);
      ctx.drawImage(selTex, hx - 1 + p.sel * 20, H - 23);
      for (let i = 0; i < 9; i++) UI.drawStack(ctx, p.inv[i], hx + 3 + i * 20, H - 19);
      if (p.offhand) {
        ctx.drawImage(hotbarTex, 0, 0, 21, 22, hx - 29, H - 23, 21, 22);
        ctx.drawImage(hotbarTex, 180, 0, 2, 22, hx - 8, H - 23, 2, 22);
        UI.drawStack(ctx, p.offhand, hx - 26, H - 20);
      }
      if (survival) {
        const xy = H - 29;
        ctx.fillStyle = '#000';
        ctx.fillRect(hx, xy, 182, 5);
        ctx.fillStyle = '#2B2B2B';
        ctx.fillRect(hx + 1, xy + 1, 180, 3);
        const fw = Math.round(182 * p.xpProg);
        if (fw > 1) {
          ctx.fillStyle = '#80FF20';
          ctx.fillRect(hx + 1, xy + 1, fw - 2, 3);
          ctx.fillStyle = '#C0FF90';
          ctx.fillRect(hx + 1, xy + 1, fw - 2, 1);
          ctx.fillStyle = '#4AA010';
          ctx.fillRect(hx + 1, xy + 3, fw - 2, 1);
        }
        ctx.fillStyle = '#000';
        for (let k = 1; k < 10; k++) ctx.fillRect(hx + Math.round((k * 182) / 10), xy + 1, 1, 3);
        if (p.xpLevel > 0) {
          const s = String(p.xpLevel);
          F.outlined(ctx, s, Math.floor(W / 2 - F.width(s) / 2), H - 35, '#80FF20');
        }
        const hp = Math.ceil(p.hp);
        const blink = p.hurtT > 0 && Math.floor(p.hurtT * 10) % 2 === 0;
        const nm = g.mode === 'hardcore' ? 'hard' : 'heart';
        for (let i = 0; i < 10; i++) {
          let y = H - 39;
          if (hp <= 4) y += Math.round(Math.random() * 2) - 1;
          if (i === p.regenWave) y -= 2;
          const x = hx + i * 8;
          ctx.drawImage(icon('heartC', null, blink), x, y);
          const v = hp - i * 2;
          if (v >= 2) ctx.drawImage(icon(nm), x, y);
          else if (v === 1) ctx.drawImage(icon(nm, 'L'), x, y);
        }
        const [a] = p.armorPoints();
        if (a > 0)
          for (let i = 0; i < 10; i++) {
            const x = hx + i * 8;
            const v = a - i * 2;
            ctx.drawImage(icon('armorC'), x, H - 49);
            if (v >= 2) ctx.drawImage(icon('armor'), x, H - 49);
            else if (v === 1) ctx.drawImage(icon('armor', 'L'), x, H - 49);
          }
        for (let i = 0; i < 10; i++) {
          let y = H - 39;
          if (p.sat <= 0 && Math.random() < 0.04) y += Math.round(Math.random() * 2) - 1;
          const x = hx + 182 - i * 8 - 9;
          ctx.drawImage(icon('foodC'), x, y);
          const v = p.food - i * 2;
          if (v >= 2) ctx.drawImage(icon('food'), x, y);
          else if (v === 1) ctx.drawImage(icon('food', 'L'), x, y);
        }
        if (p.headInWater || p.air < 10) {
          const n = Math.ceil(p.air);
          for (let i = 0; i < n; i++) ctx.drawImage(icon('bubble'), hx + 182 - i * 8 - 9, H - 49);
        }
      }
      if (g.selName && g.selName.t > 0) {
        ctx.globalAlpha = SC.clamp(g.selName.t, 0, 1);
        F.center(ctx, g.selName.text, W / 2, H - (survival ? 59 : 45), '#FFFFFF');
        ctx.globalAlpha = 1;
      }
    }
    if (g.actionbar && g.actionbar.t > 0) {
      ctx.globalAlpha = SC.clamp(g.actionbar.t, 0, 1);
      F.center(ctx, g.actionbar.text, W / 2, H - 68, '#FFFFFF');
      ctx.globalAlpha = 1;
    }
    drawChat(ctx);
    if (g.debug) drawDebug(ctx);
  };

  function drawChat(ctx) {
    const g = game();
    if (!SC.options.chat) return;
    const open = SC.gui.screen instanceof SC.gui.ChatScreen;
    const { H } = GUI;
    const w = Math.min(320, GUI.W - 8);
    const lines = [];
    for (const m of g.chatLines) for (const l of F.wrap(m.text, w - 4)) lines.push({ text: l, age: m.age });
    let y = H - 48 + (open ? 22 : 0);
    let shown = 0;
    for (let k = lines.length - 1; k >= 0 && shown < (open ? 20 : 10); k--) {
      const l = lines[k];
      let a = 1;
      if (!open) {
        if (l.age > 10) continue;
        a = SC.clamp(10 - l.age, 0, 1);
      }
      ctx.globalAlpha = a;
      ctx.fillStyle = `rgba(0,0,0,${SC.options.chatBg})`;
      ctx.fillRect(2, y - 1, w, 9);
      F.draw(ctx, l.text, 3, y, '#FFFFFF');
      ctx.globalAlpha = 1;
      y -= 9;
      shown++;
    }
  }

  function drawDebug(ctx) {
    const g = game();
    const line = (s, y, right) => {
      if (!s) return;
      const w = F.width(s);
      const x = right ? GUI.W - 2 - w : 2;
      ctx.fillStyle = 'rgba(80,80,80,0.56)';
      ctx.fillRect(x - 1, y - 1, w + 2, 9);
      F.draw(ctx, s, x, y, '#E0E0E0', false);
    };
    g.debugLines().forEach((s, i) => line(s, 2 + i * 9));
    g.debugRight().forEach((s, i) => line(s, 2 + i * 9, true));
  }

  UI.drawCrosshair = (ctx, x, y) => {
    ctx.save();
    ctx.globalCompositeOperation = 'difference';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x - 4, y, 9, 1);
    ctx.fillRect(x, y - 4, 1, 4);
    ctx.fillRect(x, y + 1, 1, 4);
    ctx.restore();
  };
})();
