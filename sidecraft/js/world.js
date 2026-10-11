// The world: terrain generation, block access, fluids, falling blocks,
// random ticks (grass, saplings, leaf decay), lighting and saving.
(function () {
  const SC = window.SC;
  const B = SC.B, I = SC.I;
  const blocks = SC.blocks;
  const OPAQUE = 99;

  SC.WORLD_W = 1600;
  SC.WORLD_H = 256;
  SC.SEA = 100;

  class World {
    constructor(seed, W = SC.WORLD_W, H = SC.WORLD_H) {
      this.seed = seed | 0;
      this.W = W;
      this.H = H;
      this.fg = new Uint8Array(W * H);
      this.bg = new Uint8Array(W * H);
      this.meta = new Uint8Array(W * H);
      this.surface = new Int16Array(W);
      this.flag = new Uint8Array(W * H);
      this.active = [];
      this.ftick = 0;
      this.containers = new Map();
      this.time = 0.07; // fraction of a day; 0 = sunrise
      this.day = 1;
      this.spawn = { x: W / 2, y: 0 };
      // hooks set by the game
      this.onDrop = null; // (x, y, id, n)
      this.onFall = null; // (x, y, id)
      this.onBreakFx = null; // (x, y, id)
      this.onSound = null;
      this.onIgnite = null; // (x, y, fuse)
    }

    // ---------- access ----------
    idx(x, y) {
      return y * this.W + x;
    }
    inb(x, y) {
      return x >= 0 && y >= 0 && x < this.W && y < this.H;
    }
    get(x, y) {
      if (y < 0) return 0;
      if (x < 0 || x >= this.W || y >= this.H) return B.BEDROCK;
      return this.fg[y * this.W + x];
    }
    getBg(x, y) {
      if (!this.inb(x, y)) return 0;
      return this.bg[y * this.W + x];
    }
    getMeta(x, y) {
      if (!this.inb(x, y)) return 0;
      return this.meta[y * this.W + x];
    }
    solid(x, y) {
      x = Math.floor(x);
      y = Math.floor(y);
      if (y < 0) return false;
      if (x < 0 || x >= this.W || y >= this.H) return true;
      const i = y * this.W + x;
      const d = blocks[this.fg[i]];
      if (!d.solid) return false;
      if (d.tree && this.meta[i] & 1) return false;
      return true;
    }
    // can a block be put here (air, fluid, replaceable plant)?
    open(x, y) {
      if (!this.inb(x, y)) return false;
      const d = blocks[this.fg[y * this.W + x]];
      return d.id === 0 || d.repl;
    }
    fluidAt(x, y) {
      const id = this.get(Math.floor(x), Math.floor(y));
      return blocks[id].fluid ? id : 0;
    }

    set(x, y, id, meta = 0) {
      if (!this.inb(x, y)) return;
      const i = y * this.W + x;
      const old = this.fg[i];
      this.fg[i] = id;
      this.meta[i] = meta;
      if (old !== id && this.containers.has(i) && !blocks[id].use) this.containers.delete(i);
      this.activateAround(x, y);
      this.checkFall(x, y - 1);
      if (blocks[old].grav || blocks[id].grav || id === 0) this.checkFall(x, y);
      this.checkSupport(x, y - 1);
      this.checkSupport(x - 1, y);
      this.checkSupport(x + 1, y);
      this.checkSupport(x, y + 1);
      this.checkSupport(x, y);
    }
    setBg(x, y, id) {
      if (!this.inb(x, y)) return;
      this.bg[y * this.W + x] = id;
      this.checkSupport(x, y);
    }

    // ---------- breaking and drops ----------
    dropsFor(id, x, y) {
      const d = blocks[id];
      if (!d || d.drop === null) return [];
      if (d.drop === 'leaves') {
        const out = [];
        if (Math.random() < 1 / 14) out.push([B.SAPLING, 1]);
        if (id === B.LEAVES && Math.random() < 1 / 30) out.push([I.APPLE, 1]);
        return out;
      }
      if (d.drop === 'clay') return [[I.CLAY_BALL, 4]];
      return [[d.drop, 1]];
    }
    // remove a block, spilling drops (when drop is true) and handling multi-part blocks
    breakBlock(x, y, drop = true) {
      if (!this.inb(x, y)) return;
      const i = this.idx(x, y);
      const id = this.fg[i];
      if (!id || blocks[id].fluid) return;
      if (drop) for (const [d, n] of this.dropsFor(id, x, y)) this.onDrop && this.onDrop(x + 0.5, y + 0.5, d, n);
      const c = this.containers.get(i);
      if (c) {
        const list = c.type === 'chest' ? c.items : c.slots;
        for (const s of list) if (s) this.onDrop && this.onDrop(x + 0.5, y + 0.5, s.id, s.n, s.d);
        this.containers.delete(i);
      }
      if (this.onBreakFx) this.onBreakFx(x, y, id);
      this.set(x, y, 0);
      if (id === B.DOOR_B || id === B.DOOR_BO) {
        const t = this.get(x, y - 1);
        if (t === B.DOOR_T || t === B.DOOR_TO) this.set(x, y - 1, 0);
      } else if (id === B.DOOR_T || id === B.DOOR_TO) {
        const b = this.get(x, y + 1);
        if (b === B.DOOR_B || b === B.DOOR_BO) this.breakBlock(x, y + 1, drop);
      }
    }

    checkSupport(x, y) {
      if (!this.inb(x, y)) return;
      const id = this.get(x, y);
      const d = blocks[id];
      if (!d.support && id !== B.DOOR_B && id !== B.DOOR_BO && id !== B.DOOR_T && id !== B.DOOR_TO) return;
      if (!this.supported(x, y, id)) this.breakBlock(x, y, true);
    }
    supported(x, y, id) {
      const below = this.get(x, y + 1);
      const sb = this.solid(x, y + 1) || (blocks[below].tree && blocks[below].solid);
      switch (blocks[id].support) {
        case 'plant':
          return [B.GRASS, B.DIRT, B.SNOW_GRASS, B.SAND, B.CLAY].includes(below);
        case 'cactus':
          return below === B.SAND || below === B.CACTUS;
        case 'floor':
          return sb;
        case 'torch':
          return sb || this.solid(x - 1, y) || this.solid(x + 1, y) || this.getBg(x, y) > 0;
        case 'ladder':
          return this.solid(x - 1, y) || this.solid(x + 1, y) || this.getBg(x, y) > 0 || this.get(x, y + 1) === B.LADDER || this.get(x, y - 1) === B.LADDER;
      }
      if (id === B.DOOR_B || id === B.DOOR_BO) {
        const t = this.get(x, y - 1);
        return sb && (t === B.DOOR_T || t === B.DOOR_TO);
      }
      if (id === B.DOOR_T || id === B.DOOR_TO) {
        return below === B.DOOR_B || below === B.DOOR_BO;
      }
      return true;
    }

    checkFall(x, y) {
      if (!this.inb(x, y) || y + 1 >= this.H) return;
      const id = this.get(x, y);
      if (!blocks[id].grav) return;
      const b = blocks[this.get(x, y + 1)];
      if (b.solid) return;
      this.fg[this.idx(x, y)] = 0;
      this.activateAround(x, y);
      if (this.onFall) this.onFall(x, y, id);
      this.checkFall(x, y - 1);
    }

    // ---------- fluids ----------
    activate(x, y) {
      if (!this.inb(x, y)) return;
      const i = y * this.W + x;
      if (!this.flag[i]) {
        this.flag[i] = 1;
        this.active.push(i);
      }
    }
    activateAround(x, y) {
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) this.activate(x + dx, y + dy);
    }
    tickFluids() {
      this.ftick++;
      const list = this.active;
      this.active = [];
      list.sort((a, b) => b - a);
      for (const i of list) this.flag[i] = 0;
      let n = 0;
      for (const i of list) {
        this.updFluid(i);
        if (++n > 6000) {
          // too much at once: carry the rest over to the next tick
          for (const j of list.slice(n)) this.activate(j % this.W, (j / this.W) | 0);
          break;
        }
      }
    }
    updFluid(i) {
      const fg = this.fg, meta = this.meta, W = this.W;
      const id = fg[i];
      if (id !== B.WATER && id !== B.LAVA) return;
      const x = i % W, y = (i / W) | 0;
      if (id === B.LAVA && this.ftick % 4) {
        this.activate(x, y);
        return;
      }
      let lvl = meta[i] || 8;
      const start = lvl;
      const other = id === B.WATER ? B.LAVA : B.WATER;
      for (const [dx, dy] of [[0, 1], [-1, 0], [1, 0], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (!this.inb(nx, ny)) continue;
        const n = ny * W + nx;
        if (fg[n] !== other) continue;
        const lavaI = id === B.LAVA ? i : n;
        const lx = lavaI % W, ly = (lavaI / W) | 0;
        fg[lavaI] = meta[lavaI] >= 7 ? B.OBSIDIAN : B.COBBLE;
        meta[lavaI] = 0;
        this.activateAround(lx, ly);
        if (this.onSound) this.onSound('fizz', lx, ly);
        if (lavaI === i) return;
      }
      if (y + 1 < this.H) {
        const b = i + W;
        const bd = blocks[fg[b]];
        if (fg[b] === 0 || (bd.repl && !bd.fluid)) {
          fg[b] = id;
          meta[b] = lvl;
          fg[i] = 0;
          meta[i] = 0;
          this.activateAround(x, y);
          this.activateAround(x, y + 1);
          this.checkSupport(x, y + 2);
          return;
        }
        if (fg[b] === id && meta[b] < 8) {
          const t = Math.min(lvl, 8 - meta[b]);
          meta[b] += t;
          lvl -= t;
          this.activate(x, y + 1);
        }
      }
      if (lvl > 0) {
        const dirs = Math.random() < 0.5 ? [-1, 1] : [1, -1];
        for (const d of dirs) {
          const nx = x + d;
          if (nx < 0 || nx >= W || lvl <= 0) continue;
          const n = i + d;
          const nd = blocks[fg[n]];
          let nl;
          if (fg[n] === 0 || (nd.repl && !nd.fluid)) nl = 0;
          else if (fg[n] === id) nl = meta[n];
          else continue;
          let t = 0;
          if (lvl - nl >= 2) t = Math.max(1, Math.floor((lvl - nl) / 3));
          else if (nl === 0 && lvl === 1 && y + 1 < this.H) {
            const bn = fg[n + W];
            if (bn === 0 || (bn === id && meta[n + W] < 8)) t = 1;
          }
          if (t) {
            fg[n] = id;
            meta[n] = nl + t;
            lvl -= t;
            this.activateAround(nx, y);
          }
        }
      }
      if (lvl !== start) {
        if (lvl <= 0) {
          fg[i] = 0;
          meta[i] = 0;
        } else meta[i] = lvl;
        this.activateAround(x, y);
      }
    }

    // ---------- random ticks ----------
    randomTicks(cx, count) {
      for (let k = 0; k < count; k++) {
        const x = Math.floor(cx + (Math.random() - 0.5) * 160);
        const y = Math.floor(Math.random() * this.H);
        if (!this.inb(x, y)) continue;
        const id = this.fg[y * this.W + x];
        switch (id) {
          case B.GRASS:
          case B.SNOW_GRASS: {
            const above = blocks[this.get(x, y - 1)];
            if (above.opaque || above.fluid) {
              this.set(x, y, B.DIRT);
              break;
            }
            const nx = x + (Math.random() < 0.5 ? -1 : 1), ny = y + Math.floor(Math.random() * 3) - 1;
            if (this.get(nx, ny) === B.DIRT) {
              const a = blocks[this.get(nx, ny - 1)];
              if (!a.opaque && !a.fluid) this.set(nx, ny, id);
            }
            break;
          }
          case B.SAPLING:
            if (Math.random() < 0.12) this.growTree(x, y, Math.random() < 0.5 && this.surfaceBiome(x) === 'snow' ? 'spruce' : 'oak', Math.random);
            break;
          case B.LEAVES:
          case B.SPRUCE_LEAVES:
            if (this.meta[y * this.W + x] & 1 && !this.nearLog(x, y)) this.breakBlock(x, y, true);
            break;
          case B.CACTUS:
            if (Math.random() < 0.08 && this.get(x, y - 1) === 0) {
              let h = 1;
              while (this.get(x, y + h) === B.CACTUS) h++;
              if (h < 3) this.set(x, y - 1, B.CACTUS);
            }
            break;
          case B.DIRT:
            // bare surface dirt slowly regrows grass even when no grass is next to it
            if (Math.random() < 0.02 && this.get(x, y - 1) === 0 && y <= this.surface[x] + 1) this.set(x, y, B.GRASS);
            break;
        }
      }
    }
    nearLog(x, y) {
      for (let dy = -5; dy <= 5; dy++)
        for (let dx = -4; dx <= 4; dx++) {
          const id = this.get(x + dx, y + dy);
          if (id === B.LOG || id === B.SPRUCE_LOG) return true;
        }
      return false;
    }
    surfaceBiome(x) {
      return this.biome ? this.biome[SC.clamp(x | 0, 0, this.W - 1)] : 'plains';
    }

    // ---------- trees ----------
    growTree(x, y, kind, r, force) {
      const h = kind === 'spruce' ? 6 + Math.floor(r() * 4) : 4 + Math.floor(r() * 3);
      if (!force) {
        for (let yy = y - h - 2; yy <= y; yy++)
          for (let xx = x - 2; xx <= x + 2; xx++) {
            const id = this.get(xx, yy);
            if (id !== 0 && id !== B.SAPLING && id !== B.TALL_GRASS && !blocks[id].tree) return false;
            if (yy < 2) return false;
          }
      }
      const top = y - h + 1;
      const LOGB = kind === 'spruce' ? B.SPRUCE_LOG : B.LOG;
      const LEAF = kind === 'spruce' ? B.SPRUCE_LEAVES : B.LEAVES;
      const leaf = (xx, yy) => {
        if (!this.inb(xx, yy)) return;
        const i = this.idx(xx, yy);
        const id = this.fg[i];
        if (id === 0 || id === B.TALL_GRASS) {
          this.fg[i] = LEAF;
          this.meta[i] = 1;
        }
      };
      if (kind === 'spruce') {
        leaf(x, top - 1);
        const n = h - 2;
        for (let k = 0; k < n; k++) {
          const w = Math.min(3, 1 + Math.floor(k / 2)) - (k % 2 === 1 && k > 2 ? 1 : 0);
          for (let dx = -w; dx <= w; dx++) leaf(x + dx, top + k);
        }
      } else {
        for (let dy = -2; dy <= 1; dy++) {
          const w = dy === -2 ? 1 : 2;
          for (let dx = -w; dx <= w; dx++) {
            if (Math.abs(dx) === 2 && dy !== 0 && r() < 0.5) continue;
            leaf(x + dx, top + dy);
          }
        }
      }
      for (let k = 0; k < h; k++) {
        const i = this.idx(x, y - k);
        this.fg[i] = LOGB;
        this.meta[i] = 1;
      }
      return true;
    }

    // ---------- generation ----------
    generate(opts = {}) {
      for (const _ of this.genSteps(opts));
    }
    generateFlat() {
      const { W, H } = this;
      this.biome = new Array(W).fill('plains');
      const top = H - 4;
      for (let x = 0; x < W; x++) {
        this.surface[x] = top;
        for (let y = top; y < H; y++) this.fg[y * W + x] = y === top ? B.GRASS : y === H - 1 ? B.BEDROCK : B.DIRT;
      }
      this.spawn = { x: Math.floor(W / 2) + 0.5, y: top };
    }
    bonusChest() {
      const x = Math.floor(this.spawn.x) + 3;
      const y = this.topSolid(x) - 1;
      if (!this.open(x, y)) return;
      this.fg[y * this.W + x] = B.CHEST;
      this.meta[y * this.W + x] = 0;
      const items = new Array(27).fill(null);
      [[300, 1], [301, 1], [B.LOG, 8], [B.PLANKS, 16], [I.STICK, 12], [I.APPLE, 5], [B.SAPLING, 3]].forEach(([id, n], k) => (items[k * 3 + 1] = { id, n, d: 0 }));
      this.containers.set(y * this.W + x, { type: 'chest', items });
    }
    *genSteps(opts = {}) {
      if (opts.type === 'flat') {
        this.generateFlat();
        if (opts.bonus) this.bonusChest();
        yield 1;
        return;
      }
      const { W, H } = this;
      const SEA = SC.SEA;
      const r = SC.rng(this.seed ^ 0x9e3779b9);
      const n = new SC.Noise(this.seed);
      const n2 = new SC.Noise(this.seed + 1);
      const n3 = new SC.Noise(this.seed + 2);
      const fg = this.fg, bg = this.bg, meta = this.meta;
      const heights = new Int16Array(W);
      const biome = (this.biome = new Array(W));

      for (let x = 0; x < W; x++) {
        const edge = Math.min(x, W - 1 - x);
        const temp = n2.f1(x / 260, 3);
        const mount = SC.smooth(0.18, 0.5, n3.f1(x / 340 + 50, 2));
        let h = 92 - n.f1(x / 110, 4) * 14 - n.f1(x / 22, 2) * 2.5;
        h -= mount * (18 + 26 * Math.abs(n.f1(x / 45 + 9, 3)));
        let b = temp < -0.2 ? 'snow' : temp > 0.24 ? 'desert' : n3.f1(x / 120, 2) > 0 ? 'forest' : 'plains';
        if (mount > 0.55) b = 'mountain';
        const oceanT = SC.smooth(140, 60, edge);
        h = SC.lerp(h, SEA + 16 + n.f1(x / 30) * 3, oceanT);
        if (edge < 125 && h > SEA - 3) b = 'beach';
        if (edge < 75) b = 'ocean';
        heights[x] = Math.round(h);
        biome[x] = b;
      }
      // small lakes and ponds in grassy biomes
      for (let k = 0; k < W / 160; k++) {
        const cx = 200 + Math.floor(r() * (W - 400));
        if (!['plains', 'forest'].includes(biome[cx])) continue;
        const half = 4 + Math.floor(r() * 5);
        const depth = 2 + Math.floor(r() * 3);
        const lvl = Math.min(...Array.from({ length: half * 2 + 1 }, (_, i) => heights[cx - half + i] || 999));
        for (let dx = -half; dx <= half; dx++) {
          const xx = cx + dx;
          const d = Math.round(depth * Math.sqrt(1 - (dx / (half + 0.5)) ** 2));
          heights[xx] = Math.max(heights[xx], lvl + d);
          biome[xx] = biome[xx] === 'forest' ? 'forest' : 'plains';
          this.lakeTop = this.lakeTop || {};
          this.lakeTop[xx] = lvl;
        }
      }
      this.surface.set(heights);
      yield 0.1;

      for (let x = 0; x < W; x++) {
        const h = heights[x];
        const b = biome[x];
        if (x % 200 === 0) yield 0.1 + (x / W) * 0.3;
        const dirtDepth = 3 + Math.floor(r() * 2);
        const lakeTop = this.lakeTop && this.lakeTop[x];
        for (let y = 0; y < H; y++) {
          const i = y * W + x;
          let id = 0;
          if (y < h) {
            if (y >= SEA && (b === 'ocean' || b === 'beach')) id = B.WATER;
            else if (lakeTop !== undefined && y >= lakeTop + 1) id = B.WATER;
            if (id === B.WATER) meta[i] = 8;
            if (id === 0 && b === 'snow' && y === h - 1 && h < SEA && r() < 0.0) id = B.SNOW;
          } else {
            const d = y - h;
            const under = (lakeTop !== undefined && h > lakeTop) || ((b === 'ocean' || b === 'beach') && h >= SEA);
            if (b === 'desert' || b === 'beach' || b === 'ocean') {
              id = d < 4 ? (b === 'ocean' && d < 2 && r() < 0.3 ? B.GRAVEL : B.SAND) : d < 8 ? B.SANDSTONE : B.STONE;
              if (b === 'ocean' && d < 3 && n2.n2(x / 9, y / 9) > 0.35) id = B.CLAY;
            } else if (b === 'mountain' && h < 64) {
              id = d === 0 && h < 54 ? B.SNOW : d < 2 && r() < 0.3 ? B.GRAVEL : B.STONE;
            } else {
              const top = under ? (r() < 0.5 ? B.SAND : B.CLAY) : b === 'snow' ? B.SNOW_GRASS : B.GRASS;
              id = d === 0 ? top : d < dirtDepth ? (under ? B.SAND : B.DIRT) : B.STONE;
            }
            if (id === B.STONE && y > 196 + n.n2(x / 12, y / 12) * 6) id = B.DEEPSLATE;
            if (y >= H - 1 || (y >= H - 5 && r() < (y - (H - 6)) / 5)) id = B.BEDROCK;
            if (d >= 2) {
              bg[i] = d < dirtDepth + 2 ? (b === 'desert' || b === 'beach' || b === 'ocean' ? B.SANDSTONE : B.DIRT) : y > 200 ? B.DEEPSLATE : B.STONE;
            }
          }
          fg[i] = id;
        }
      }

      // caves: worm tunnels (two ridged noises crossing) and big caverns deep down
      const cn1 = new SC.Noise(this.seed + 11), cn2 = new SC.Noise(this.seed + 12), cn3 = new SC.Noise(this.seed + 13);
      for (let x = 0; x < W; x++) {
        const h = heights[x];
        if (x % 200 === 0) yield 0.4 + (x / W) * 0.35;
        const entrance = cn3.n2(x / 50, 3.3) > 0.42;
        for (let y = h + (entrance ? 0 : 6); y < H - 2; y++) {
          const i = y * W + x;
          const id = fg[i];
          if (id === B.BEDROCK || id === B.WATER || id === 0) continue;
          const depthF = SC.clamp((y - h) / 60, 0, 1);
          const a = cn1.f2(x / 48, y / 24, 2);
          const b2 = cn2.f2(x / 48, y / 24, 2);
          const worm = a * a + b2 * b2 < 0.0035 + depthF * 0.004;
          const cav = y > h + 30 && cn3.f2(x / 70, y / 34, 3) > 0.3 - depthF * 0.08;
          if (worm || cav) {
            // keep oceans and lakes sealed
            if (fg[i - W] === B.WATER) continue;
            fg[i] = y > H - 26 ? B.LAVA : 0;
            if (fg[i] === B.LAVA) meta[i] = 8;
          }
        }
      }

      yield 0.78;
      // ore veins and pockets
      const vein = (ore, count, ymin, ymax, smin, smax, hosts = [B.STONE, B.DEEPSLATE]) => {
        for (let k = 0; k < count; k++) {
          let x = Math.floor(r() * W), y = Math.floor(ymin + r() * (ymax - ymin));
          const size = smin + Math.floor(r() * (smax - smin + 1));
          for (let s = 0; s < size; s++) {
            if (this.inb(x, y) && hosts.includes(fg[y * W + x])) fg[y * W + x] = ore;
            x += Math.floor(r() * 3) - 1;
            y += Math.floor(r() * 3) - 1;
          }
        }
      };
      vein(B.DIRT, W * 0.25, 105, 190, 10, 26, [B.STONE]);
      vein(B.GRAVEL, W * 0.25, 105, 240, 8, 22);
      vein(B.COAL_ORE, W * 1.1, 95, 200, 4, 12);
      vein(B.IRON_ORE, W * 0.85, 110, 245, 3, 8);
      vein(B.GOLD_ORE, W * 0.22, 160, 245, 3, 7);
      vein(B.DIAMOND_ORE, W * 0.1, 205, 252, 2, 6);

      // sand never floats over a cave
      for (let i = W; i < W * H; i++) {
        if ((fg[i] === B.SAND || fg[i] === B.GRAVEL) && i + W < W * H && !blocks[fg[i + W]].solid) fg[i] = fg[i] === B.SAND ? B.SANDSTONE : B.STONE;
      }

      // dungeons: mossy rooms with a loot chest
      for (let k = 0; k < (opts.structures === false ? 0 : W / 140); k++) {
        const x0 = 20 + Math.floor(r() * (W - 40));
        const y0 = heights[x0] + 30 + Math.floor(r() * 80);
        if (y0 + 6 >= H - 6) continue;
        const w = 9 + Math.floor(r() * 4) * 2, h = 6;
        for (let yy = y0; yy < y0 + h; yy++)
          for (let xx = x0; xx < x0 + w; xx++) {
            const i = yy * W + xx;
            const edge = yy === y0 || yy === y0 + h - 1 || xx === x0 || xx === x0 + w - 1;
            fg[i] = edge ? (r() < 0.5 ? B.MOSSY_COBBLE : B.COBBLE) : 0;
            bg[i] = B.COBBLE;
            meta[i] = 0;
          }
        const cx = x0 + Math.floor(w / 2), cy = y0 + h - 2;
        fg[cy * W + cx] = B.CHEST;
        this.containers.set(cy * W + cx, { type: 'chest', items: this.loot(r) });
        fg[cy * W + cx - 2] = B.TORCH;
        fg[cy * W + cx + 2] = B.TORCH;
      }

      yield 0.9;
      // surface decoration
      let last = -9;
      for (let x = 3; x < W - 3; x++) {
        const h = heights[x];
        const b = biome[x];
        const ground = fg[h * W + x];
        if (fg[(h - 1) * W + x] !== 0) continue;
        if (ground === B.GRASS || ground === B.SNOW_GRASS) {
          const p = b === 'forest' ? 0.3 : b === 'snow' ? 0.14 : 0.05;
          if (x - last > (b === 'forest' ? 3 : 5) && r() < p) {
            if (this.growTree(x, h - 1, b === 'snow' || (b === 'forest' && r() < 0.15) ? 'spruce' : 'oak', r)) {
              last = x;
              continue;
            }
          }
          if (ground === B.GRASS) {
            const q = r();
            if (q < 0.03) fg[(h - 1) * W + x] = B.ROSE;
            else if (q < 0.06) fg[(h - 1) * W + x] = B.DANDELION;
            else if (q < (b === 'plains' ? 0.45 : 0.25)) fg[(h - 1) * W + x] = B.TALL_GRASS;
          }
        } else if (ground === B.SAND && b === 'desert') {
          if (r() < 0.05 && x - last > 2) {
            const ch = 1 + Math.floor(r() * 3);
            for (let k = 1; k <= ch; k++) fg[(h - k) * W + x] = B.CACTUS;
            last = x;
          } else if (r() < 0.04) fg[(h - 1) * W + x] = B.DEAD_BUSH;
        }
      }

      // spawn point: the middle of the map, on dry land
      let sx = Math.floor(W / 2);
      for (let k = 0; k < 200; k++) {
        const x = sx + (k % 2 ? k : -k);
        const top = this.topSolid(x);
        if (!blocks[this.get(x, top - 1)].fluid && !blocks[this.get(x, top)].tree) {
          sx = x;
          break;
        }
      }
      this.spawn = { x: sx + 0.5, y: this.topSolid(sx) };
      if (opts.bonus) this.bonusChest();
      yield 1;
    }

    loot(r) {
      const out = new Array(27).fill(null);
      const table = [
        [I.IRON_INGOT, 1, 5, 0.6],
        [I.GOLD_INGOT, 1, 4, 0.35],
        [I.COAL, 3, 10, 0.6],
        [I.BONE, 2, 6, 0.5],
        [I.GUNPOWDER, 1, 5, 0.45],
        [I.DIAMOND, 1, 2, 0.15],
        [I.APPLE, 1, 4, 0.4],
        [I.BUCKET, 1, 1, 0.25],
        [I.ARROW, 4, 12, 0.35],
        [I.BOW, 1, 1, 0.15],
        [B.TNT, 1, 3, 0.15],
      ];
      for (const [id, a, b, p] of table) {
        if (r() > p) continue;
        let slot;
        do slot = Math.floor(r() * 27);
        while (out[slot]);
        out[slot] = { id, n: a + Math.floor(r() * (b - a + 1)) };
      }
      return out;
    }

    topSolid(x) {
      for (let y = 0; y < this.H; y++) {
        const id = this.get(x, y);
        if (id && blocks[id].solid && !(blocks[id].tree && this.getMeta(x, y) & 1)) return y;
        if (blocks[id].fluid) return y;
      }
      return this.H - 1;
    }

    // ---------- lighting ----------
    // Computes sky and block light (0..15) for a rectangle. Sky light shines
    // straight down until something blocks it, then both channels spread out
    // one step at a time, losing at least 1 per tile.
    light(x0, y0, w, h, dyn) {
      const n = w * h;
      if (!this.L || this.L.n < n) {
        this.L = { n, sky: new Uint8Array(n), blk: new Uint8Array(n), q: new Int32Array(n * 8), cost: new Uint8Array(n) };
      }
      const L = this.L;
      const { sky, blk, q, cost } = L;
      const W = this.W, fg = this.fg, meta = this.meta;
      sky.fill(0, 0, n);
      blk.fill(0, 0, n);
      const costOf = (wx, wy) => {
        if (wy < 0) return 1;
        if (wx < 0 || wx >= W || wy >= this.H) return OPAQUE;
        const i = wy * W + wx;
        const d = blocks[fg[i]];
        if (d.tree && meta[i] & 1) return d.opaque || d.lightCost > 1 ? 2 : 1;
        if (d.opaque) return OPAQUE;
        return d.lightCost;
      };
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) cost[y * w + x] = costOf(x0 + x, y0 + y);

      // sky columns
      for (let x = 0; x < w; x++) {
        const wx = x0 + x;
        let s = 15;
        const yEnd = y0 + h;
        for (let wy = 0; wy < yEnd && s > 0; wy++) {
          const c = wy >= y0 ? cost[(wy - y0) * w + x] : costOf(wx, wy);
          if (c === OPAQUE) s = 0;
          else if (c > 1) s = Math.max(0, s - (c - 1));
          if (wy >= y0) sky[(wy - y0) * w + x] = s;
        }
      }
      // block light sources
      for (let y = 0; y < h; y++) {
        const wy = y0 + y;
        if (wy < 0 || wy >= this.H) continue;
        for (let x = 0; x < w; x++) {
          const wx = x0 + x;
          if (wx < 0 || wx >= W) continue;
          const e = blocks[fg[wy * W + wx]].light;
          if (e) blk[y * w + x] = e;
        }
      }
      if (dyn)
        for (const [lx, ly, lv] of dyn) {
          const x = Math.floor(lx) - x0, y = Math.floor(ly) - y0;
          if (x >= 0 && y >= 0 && x < w && y < h) blk[y * w + x] = Math.max(blk[y * w + x], lv);
        }
      // Light soaks a few tiles into solid ground (so terrain fades into the
      // dark instead of cutting off) but never passes back out of it, so it
      // can't leak through a wall into a cave or a sealed room.
      const spread = (arr) => {
        let head = 0, tail = 0;
        for (let i = 0; i < n; i++) if (arr[i] > 1) q[tail++] = i;
        const QN = q.length;
        while (head !== tail) {
          const i = q[head];
          head = (head + 1) % QN;
          const v = arr[i];
          const x = i % w;
          const fromSolid = cost[i] === OPAQUE;
          for (let k = 0; k < 4; k++) {
            let j;
            if (k === 0) {
              if (x === 0) continue;
              j = i - 1;
            } else if (k === 1) {
              if (x === w - 1) continue;
              j = i + 1;
            } else if (k === 2) {
              if (i < w) continue;
              j = i - w;
            } else {
              j = i + w;
              if (j >= n) continue;
            }
            const c = cost[j];
            if (c === OPAQUE) {
              const nv = v - (fromSolid ? 4 : 2);
              if (nv > arr[j]) {
                arr[j] = nv;
                if (nv > 1) {
                  q[tail] = j;
                  tail = (tail + 1) % QN;
                }
              }
              continue;
            }
            if (fromSolid) continue;
            const nv = v - c;
            if (nv > arr[j]) {
              arr[j] = nv;
              if (nv > 1) {
                q[tail] = j;
                tail = (tail + 1) % QN;
              }
            }
          }
        }
      };
      spread(sky);
      spread(blk);
      return L;
    }

    // rough light level at one spot, used for mob spawning off screen
    approxLight(x, y, dayF) {
      x = Math.floor(x);
      y = Math.floor(y);
      let s = 15;
      for (let wy = 0; wy <= y && s > 0; wy++) {
        const id = this.get(x, wy);
        const d = blocks[id];
        if (d.opaque && !(d.tree && this.getMeta(x, wy) & 1)) s = 0;
        else if (d.lightCost > 1) s -= d.lightCost - 1;
      }
      let b = 0;
      for (let dy = -12; dy <= 12; dy++)
        for (let dx = -12; dx <= 12; dx++) {
          const e = blocks[this.get(x + dx, y + dy)].light;
          if (e) b = Math.max(b, e - Math.abs(dx) - Math.abs(dy));
        }
      return Math.max(s * dayF, b);
    }

    // ---------- save / load ----------
    static rle(a) {
      const out = [];
      let i = 0;
      while (i < a.length) {
        const v = a[i];
        let n = 1;
        while (i + n < a.length && a[i + n] === v && n < 255) n++;
        out.push(n, v);
        i += n;
      }
      const u = new Uint8Array(out);
      let s = '';
      for (let k = 0; k < u.length; k += 0x8000) s += String.fromCharCode.apply(null, u.subarray(k, k + 0x8000));
      return btoa(s);
    }
    static unrle(str, len) {
      const s = atob(str);
      const out = new Uint8Array(len);
      let o = 0;
      for (let k = 0; k < s.length; k += 2) {
        const n = s.charCodeAt(k), v = s.charCodeAt(k + 1);
        out.fill(v, o, o + n);
        o += n;
      }
      return out;
    }
    serialize() {
      return {
        v: 1,
        seed: this.seed,
        W: this.W,
        H: this.H,
        fg: World.rle(this.fg),
        bg: World.rle(this.bg),
        meta: World.rle(this.meta),
        surface: Array.from(this.surface),
        biome: this.biome,
        containers: [...this.containers.entries()],
        time: this.time,
        day: this.day,
        spawn: this.spawn,
        active: this.active.slice(0, 20000),
      };
    }
    static load(o) {
      const w = new World(o.seed, o.W, o.H);
      w.fg = World.unrle(o.fg, o.W * o.H);
      w.bg = World.unrle(o.bg, o.W * o.H);
      w.meta = World.unrle(o.meta, o.W * o.H);
      w.surface = Int16Array.from(o.surface);
      w.biome = o.biome;
      w.containers = new Map(o.containers);
      w.time = o.time;
      w.day = o.day || 1;
      w.spawn = o.spawn;
      for (const i of o.active || []) w.activate(i % w.W, (i / w.W) | 0);
      return w;
    }
  }
  SC.World = World;
})();
