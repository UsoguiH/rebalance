// Game: main loop, worlds and saving, controls, day/night, sleeping, death,
// statistics, chat commands and the glue between the world and the menus.
(function () {
  const SC = window.SC;
  const B = SC.B, I = SC.I;
  const blocks = SC.blocks;
  const DAY_LEN = 1200; // seconds per full day, like the original
  const INDEX_KEY = 'sidecraft.worlds';
  const WORLD_KEY = (id) => 'sidecraft.w.' + id;
  SC.SMELT_TIME = 8;

  const G = (SC.game = {
    state: 'boot',
    world: null,
    player: null,
    entities: [],
    cam: { x: 0, y: 0 },
    ui: null,
    cursor: null,
    chatLines: [],
    chatHistory: [],
    actionbar: null,
    selName: null,
    debug: false,
    advTips: false,
    hideHud: false,
    creative: false,
    mode: 'survival',
    gamemode: 'survival',
    difficulty: 2,
    cheats: false,
    shakeT: 0,
    shakeAmt: 0,
    fps: 60,
    fluidT: 0,
    saveT: 0,
    sleepT: 0,
    target: null,
    placeAt: null,
    stats: {},
    worldId: null,
    meta: null,
  });
  SC.game.spawnT = 0;
  const GUI = () => SC.gui;

  G.dayFactor = () => {
    const s = Math.sin(G.world.time * Math.PI * 2);
    return SC.clamp(0.2 + (s + 0.25) * 1.2, 0.2, 1);
  };
  G.isNight = () => G.world.time > 0.5 && G.world.time < 0.98;
  SC.shake = (a) => {
    G.shakeAmt = G.shakeT > 0 ? Math.max(G.shakeAmt, a) : a;
    G.shakeT = 0.25;
  };
  G.chat = (text) => {
    G.chatLines.push({ text, age: 0 });
    if (G.chatLines.length > 100) G.chatLines.shift();
  };
  G.actionBar = (text) => (G.actionbar = { text, t: 3 });
  G.msg = G.actionBar;
  G.stat = (k, n = 1) => {
    G.stats[k] = (G.stats[k] || 0) + n;
  };
  G.statMap = (m, k, n = 1) => {
    const o = (G.stats[m] = G.stats[m] || {});
    o[k] = (o[k] || 0) + n;
  };
  G.dropItem = (x, y, id, n, d = 0, vx) => {
    if (!n) return;
    const e = new SC.ItemDrop(x, y, id, n, d);
    if (vx !== undefined) {
      e.vx = vx;
      e.vy = -3;
      e.pickDelay = 1.5;
    }
    G.entities.push(e);
  };
  G.lineOfSight = (x0, y0, x1, y1) => {
    const d = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.ceil(d / 0.25);
    for (let k = 1; k < n; k++) {
      const t = k / n;
      if (G.world.solid(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)) return false;
    }
    return true;
  };
  G.shootArrow = (owner, x, y, tx, ty, speed, dmg) => {
    const dx = tx - x, dy = ty - y;
    const d = Math.max(0.5, Math.hypot(dx, dy));
    const t = d / speed;
    G.entities.push(new SC.Arrow(owner, x, y, dx / t, dy / t - 0.5 * 20 * t, dmg));
    SC.audio.at('bow', x, y);
  };

  // ---------- worlds ----------
  function readIndex() {
    try {
      return JSON.parse(localStorage.getItem(INDEX_KEY) || '[]') || [];
    } catch (e) {
      return [];
    }
  }
  function writeIndex(list) {
    try {
      localStorage.setItem(INDEX_KEY, JSON.stringify(list));
    } catch (e) {
      G.chat('§cCould not save the world list: ' + e.message);
    }
  }
  G.worldList = () => readIndex().sort((a, b) => b.last - a.last);
  G.folderName = (name) => {
    let id = name.replace(/[\\/:*?"<>|.]/g, '_').trim() || 'World';
    const ids = new Set(readIndex().map((w) => w.id));
    while (ids.has(id)) id += '-';
    return id;
  };
  G.updateWorldMeta = (id, patch) => {
    const list = readIndex();
    const w = list.find((x) => x.id === id);
    if (!w) return;
    Object.assign(w, patch);
    writeIndex(list);
    if (G.meta && G.meta.id === id) Object.assign(G.meta, patch);
  };
  G.deleteWorld = (id) => {
    writeIndex(readIndex().filter((w) => w.id !== id));
    try {
      localStorage.removeItem(WORLD_KEY(id));
    } catch (e) {}
  };

  function hookWorld(w) {
    w.onDrop = (x, y, id, n, d) => G.dropItem(x, y, id, n, d);
    w.onFall = (x, y, id) => G.entities.push(new SC.FallingBlock(x, y, id));
    w.onBreakFx = (x, y, id) => SC.debris(x, y, id, 8);
    w.onSound = (name, x, y) => SC.audio.at(name, x + 0.5, y + 0.5);
  }
  function makePlayer(old) {
    const w = G.world;
    const sp = old && old.spawn;
    let x = w.spawn.x, y = w.spawn.y;
    const bedOk = sp && (w.get(Math.floor(sp.x), Math.floor(sp.y)) === B.BED || sp.point);
    if (bedOk) {
      x = sp.x + 0.5;
      y = sp.y + 1;
    } else if (sp) G.chat('You have no home bed or charged respawn anchor, or it was obstructed');
    const p = new SC.Player(x, y);
    p.spawn = bedOk ? sp : null;
    while (p.y > 2 && (w.solid(p.x, p.y - 0.5) || w.solid(p.x, p.y - 1.5))) p.y -= 1;
    return p;
  }

  G.createWorld = (s) => {
    const meta = {
      id: G.folderName(s.name),
      name: s.name,
      mode: s.mode,
      gamemode: s.mode === 'creative' ? 'creative' : 'survival',
      cheats: s.cheats,
      difficulty: s.difficulty,
      seed: s.seed && s.seed.trim() ? SC.seedFromString(s.seed) : (Math.random() * 2e9) | 0,
      type: s.type,
      structures: s.structures,
      bonus: s.bonus,
      last: Date.now(),
      icon: null,
    };
    const ps = new SC.gui.ProgressScreen('Generating world');
    ps.stage = 'Preparing spawn area';
    ps.progress = 0;
    SC.gui.open(ps);
    const w = new SC.World(meta.seed);
    G.genJob = { it: w.genSteps({ type: meta.type, structures: meta.structures, bonus: meta.bonus }), w, meta, ps };
  };
  function stepGen() {
    const job = G.genJob;
    const t0 = performance.now();
    while (performance.now() - t0 < 25) {
      const r = job.it.next();
      if (r.done) {
        G.genJob = null;
        const list = readIndex();
        list.push(job.meta);
        writeIndex(list);
        startWorld(job.w, job.meta, null);
        return;
      }
      job.ps.progress = r.value;
    }
  }
  G.playWorld = (id) => {
    const meta = readIndex().find((w) => w.id === id);
    let data = null;
    try {
      data = JSON.parse(localStorage.getItem(WORLD_KEY(id)));
    } catch (e) {}
    if (!meta || !data) {
      G.chat('§cThat world could not be loaded');
      return;
    }
    const ps = new SC.gui.ProgressScreen('Loading world');
    SC.gui.open(ps);
    setTimeout(() => {
      const w = SC.World.load(data.world);
      startWorld(w, meta, data);
    }, 20);
  };

  function startWorld(world, meta, data) {
    G.world = world;
    hookWorld(world);
    G.worldId = meta.id;
    G.meta = meta;
    G.mode = meta.mode;
    G.difficulty = meta.mode === 'hardcore' ? 3 : meta.difficulty;
    G.cheats = !!meta.cheats && meta.mode !== 'hardcore';
    G.entities = [];
    SC.particles.length = 0;
    G.chatLines = [];
    G.ui = null;
    G.cursor = null;
    G.stats = (data && data.stats) || {};
    let p;
    if (data && data.player) {
      const pd = data.player;
      p = new SC.Player(pd.x, pd.y);
      Object.assign(p, {
        inv: pd.inv, sel: pd.sel, hp: pd.hp, food: pd.food, sat: pd.sat, spawn: pd.spawn,
        xpLevel: pd.xpLevel || 0, xpProg: pd.xpProg || 0, xpTotal: pd.xpTotal || 0, flying: !!pd.flying,
      });
      p.armor = pd.armor || [null, null, null, null];
      p.off = pd.off || [null];
      if (pd.dead || p.hp <= 0) {
        G.player = p;
        p.hp = 20;
        p.food = 20;
        p = makePlayer(p);
      }
      for (const [k, x, y, hp] of data.mobs || []) {
        const m = new SC.Mob(k, x, y);
        m.hp = hp;
        G.entities.push(m);
      }
      for (const [x, y, id, n, d] of data.items || []) {
        const e = new SC.ItemDrop(x, y, id, n, d);
        e.vx = e.vy = 0;
        G.entities.push(e);
      }
    } else p = makePlayer(null);
    G.player = p;
    G.setGamemode(meta.gamemode || (meta.mode === 'creative' ? 'creative' : 'survival'), true);
    G.cam.x = p.x - SC.renderer.vw / 2;
    G.cam.y = p.y - SC.renderer.vh / 2;
    G.state = 'play';
    G.saveT = 0;
    SC.gui.open(null);
    G.updateWorldMeta(meta.id, { last: Date.now() });
    G.save();
  }

  G.setGamemode = (gm, silent) => {
    G.gamemode = gm;
    G.creative = gm === 'creative';
    const p = G.player;
    p.spectator = gm === 'spectator';
    if (!G.creative) p.flying = false;
    if (G.meta) G.updateWorldMeta(G.meta.id, { gamemode: gm });
    if (!silent) G.chat(`Set own game mode to ${gm[0].toUpperCase() + gm.slice(1)} Mode`);
  };

  // ---------- save ----------
  function thumbnail() {
    try {
      const cv = SC.renderer.cv;
      const c = document.createElement('canvas');
      c.width = c.height = 64;
      const s = Math.min(cv.width, cv.height) * 0.7;
      c.getContext('2d').drawImage(cv, (cv.width - s) / 2, (cv.height - s) / 2, s, s, 0, 0, 64, 64);
      return c.toDataURL('image/png');
    } catch (e) {
      return null;
    }
  }
  G.save = (withIcon) => {
    if (!G.world || !G.player || G.state !== 'play' || !G.worldId) return false;
    const p = G.player;
    const data = {
      world: G.world.serialize(),
      player: {
        x: p.x, y: p.y, inv: p.inv, armor: p.armor, off: p.off, sel: p.sel, hp: p.hp, food: p.food, sat: p.sat, spawn: p.spawn,
        dead: p.dead, xpLevel: p.xpLevel, xpProg: p.xpProg, xpTotal: p.xpTotal, flying: p.flying,
      },
      stats: G.stats,
      mobs: G.entities.filter((e) => e instanceof SC.Mob).map((e) => [e.kind, e.x, e.y, e.hp]),
      items: G.entities.filter((e) => e.kind === 'item').map((e) => [e.x, e.y, e.id, e.n, e.d]),
    };
    try {
      localStorage.setItem(WORLD_KEY(G.worldId), JSON.stringify(data));
      const patch = { last: Date.now(), difficulty: G.difficulty };
      if ((withIcon || !G.meta.icon) && G.lastThumb) patch.icon = G.lastThumb;
      G.updateWorldMeta(G.worldId, patch);
      return true;
    } catch (err) {
      G.chat('§cCould not save the world: ' + err.message);
      return false;
    }
  };
  G.quitToTitle = () => {
    G.stat('quits', 1);
    SC.gui.open(null);
    const ps = new SC.gui.ProgressScreen('Saving world');
    G.save(true);
    SC.gui.open(ps);
    if (G.ui) SC.ui.close();
    setTimeout(toTitle, 300);
  };

  // ---------- death ----------
  const CAUSE = {
    zombie: 'was slain by Zombie',
    arrow: 'was shot by Skeleton',
    creeper: 'was blown up by Creeper',
    explosion: 'blew up',
    lava: 'tried to swim in lava',
    fire: 'burned to death',
    drown: 'drowned',
    starve: 'starved to death',
    cactus: 'was pricked to death',
    void: 'fell out of the world',
    kill: 'fell out of the world',
    crush: 'was squashed by a falling block',
  };
  const KILLER = { zombie: 'zombie', arrow: 'skeleton', creeper: 'creeper' };
  G.onPlayerDeath = (cause) => {
    const p = G.player;
    const all = [...p.inv, ...p.armor, ...p.off];
    if (!G.keepInventory)
      for (const s of all)
        if (s) {
          const e = new SC.ItemDrop(p.x, p.y - 1, s.id, s.n, s.d);
          e.vx = (Math.random() - 0.5) * 6;
          e.vy = -2 - Math.random() * 4;
          e.pickDelay = 1;
          G.entities.push(e);
        }
    if (!G.keepInventory) {
      p.inv.fill(null);
      p.armor.fill(null);
      p.off[0] = null;
      SC.dropXP(p.x, p.y - 1, Math.min(p.xpLevel * 7, 100));
    }
    if (G.ui) SC.ui.close();
    SC.puff(p.x, p.y - 0.9, 20, [230, 230, 230]);
    G.stat('deaths', 1);
    G.stats.sinceDeath = 0;
    if (KILLER[cause]) G.statMap('killedBy', KILLER[cause], 1);
    let msg = CAUSE[cause] || 'died';
    if (cause === 'fall') msg = p.lastFall > 5 ? 'fell from a high place' : 'hit the ground too hard';
    G.chat('Steve ' + msg);
    SC.gui.open(new SC.gui.DeathScreen('Steve ' + msg, p.xpTotal, G.mode === 'hardcore'));
  };
  G.respawn = (quiet) => {
    const old = G.player;
    G.player = makePlayer(old);
    if (G.keepInventory) {
      G.player.inv = old.inv;
      G.player.armor = old.armor;
      G.player.off = old.off;
    }
    G.player.spectator = G.gamemode === 'spectator';
    if (!quiet) SC.gui.open(null);
  };
  G.spectate = () => {
    G.respawn();
    G.setGamemode('spectator', true);
    G.player.spectator = true;
  };

  // ---------- commands ----------
  const itemLookup = () => {
    if (G._items) return G._items;
    const m = {};
    for (const it of SC.items) {
      if (!it) continue;
      if (it.block && (it.place === null || it.id === 0)) continue;
      m[it.name.toLowerCase().replace(/ /g, '_')] = it.id;
      const key = it.key || (SC.blocks[it.id] && SC.blocks[it.id].key);
      if (key) m[key.toLowerCase()] = it.id;
    }
    return (G._items = m);
  };
  const coord = (s, base) => (s.startsWith('~') ? base + (Number(s.slice(1)) || 0) : Number(s));
  const COMMANDS = {
    help: [false, '/help', () => G.chat('§eCommands: ' + Object.keys(COMMANDS).map((c) => '/' + c).join(', '))],
    seed: [false, '/seed', () => G.chat('Seed: [§a' + G.world.seed + '§r]')],
    say: [false, '/say <message>', (a) => G.chat('[Steve] ' + a.join(' '))],
    gamemode: [true, '/gamemode <survival|creative|spectator>', (a) => {
      const m = { survival: 'survival', s: 'survival', 0: 'survival', creative: 'creative', c: 'creative', 1: 'creative', spectator: 'spectator', sp: 'spectator', 3: 'spectator' }[a[0]];
      if (!m) return false;
      G.setGamemode(m);
    }],
    time: [true, '/time <set|add> <day|noon|night|midnight|ticks>', (a) => {
      const named = { day: 1000, noon: 6000, night: 13000, midnight: 18000 };
      const v = named[a[1]] !== undefined ? named[a[1]] : Number(a[1]);
      if (isNaN(v)) return false;
      if (a[0] === 'set') G.world.time = ((v / 24000) % 1 + 1) % 1;
      else if (a[0] === 'add') G.world.time = (G.world.time + v / 24000) % 1;
      else return false;
      G.chat('Set the time to ' + Math.round(G.world.time * 24000));
    }],
    give: [true, '/give <item> [count]', (a) => {
      const id = itemLookup()[(a[0] || '').toLowerCase().replace(/^sidecraft:|^minecraft:/, '')];
      if (id === undefined) {
        G.chat("§cUnknown item '" + a[0] + "'");
        return true;
      }
      const n = Math.max(1, Math.min(6400, Number(a[1]) || 1));
      const left = G.player.give(id, n);
      if (left) G.dropItem(G.player.x, G.player.y - 1, id, left);
      G.chat(`Gave ${n} [${SC.itemName(id)}] to Steve`);
    }],
    tp: [true, '/tp <x> <y>', (a) => {
      const p = G.player;
      const x = coord(a[0] || '', p.x), y = coord(a[1] || '~', p.y);
      if (isNaN(x) || isNaN(y)) return false;
      p.x = SC.clamp(x, 0.5, G.world.W - 0.5);
      p.y = SC.clamp(y, 1, G.world.H);
      p.vx = p.vy = 0;
      p.fallY = p.y;
      G.chat(`Teleported Steve to ${p.x.toFixed(1)}, ${p.y.toFixed(1)}`);
    }],
    kill: [true, '/kill', () => {
      G.chat('Killed Steve');
      const p = G.player;
      p.hurtT = 0;
      const c = G.creative;
      G.creative = false;
      p.damage(1000, null, 'kill');
      G.creative = c;
    }],
    summon: [true, '/summon <zombie|skeleton|creeper|pig|sheep|tnt> [x] [y]', (a) => {
      const p = G.player;
      const x = coord(a[1] || '~', p.x + p.facing * 3), y = coord(a[2] || '~', p.y);
      if (a[0] === 'tnt') G.entities.push(new SC.PrimedTNT(Math.floor(x), Math.floor(y) - 1, 4));
      else if (SC.MOBS[a[0]]) G.entities.push(new SC.Mob(a[0], x, y));
      else return false;
      G.chat('Summoned new ' + a[0][0].toUpperCase() + a[0].slice(1));
    }],
    clear: [true, '/clear', () => {
      const p = G.player;
      const n = [...p.inv, ...p.armor, ...p.off].reduce((t, s) => t + (s ? s.n : 0), 0);
      p.inv.fill(null);
      p.armor.fill(null);
      p.off[0] = null;
      G.chat(`Removed ${n} items from player Steve`);
    }],
    spawnpoint: [true, '/spawnpoint', () => {
      const p = G.player;
      p.spawn = { x: Math.floor(p.x), y: Math.floor(p.y) - 1, point: true };
      G.chat(`Set spawn point to ${Math.floor(p.x)}, ${Math.floor(p.y)} for Steve`);
    }],
    difficulty: [true, '/difficulty <peaceful|easy|normal|hard>', (a) => {
      const d = ['peaceful', 'easy', 'normal', 'hard'].indexOf(a[0]);
      if (d < 0 || G.mode === 'hardcore') return false;
      G.difficulty = d;
      G.chat('The difficulty has been set to ' + SC.DIFF_NAMES[d]);
    }],
    xp: [true, '/xp <amount>[L]', (a) => {
      const s = a[0] || '';
      const n = parseInt(s, 10);
      if (isNaN(n)) return false;
      const p = G.player;
      if (/l$/i.test(s)) {
        p.xpLevel = Math.max(0, p.xpLevel + n);
        G.chat(`Gave ${n} experience levels to Steve`);
      } else {
        p.addXP(n);
        G.chat(`Gave ${n} experience points to Steve`);
      }
    }],
    gamerule: [true, '/gamerule keepInventory <true|false>', (a) => {
      if (a[0] !== 'keepInventory' || !['true', 'false'].includes(a[1])) return false;
      G.keepInventory = a[1] === 'true';
      G.chat(`Gamerule keepInventory is now set to: ${a[1]}`);
    }],
  };
  COMMANDS.experience = COMMANDS.xp;
  COMMANDS.teleport = COMMANDS.tp;
  G.commandNames = () => Object.keys(COMMANDS).filter((c) => G.cheats || !COMMANDS[c][0]);
  G.runCommand = (line) => {
    const parts = line.trim().split(/\s+/);
    const name = parts.shift().toLowerCase();
    const c = COMMANDS[name];
    if (!c || (c[0] && !G.cheats)) {
      G.chat('§cUnknown or incomplete command, see below for error');
      G.chat('§7' + line + '§c§o<--[HERE]');
      return;
    }
    if (c[2](parts) === false) G.chat('§cIncorrect argument for command. Usage: ' + c[1]);
  };

  // ---------- screenshots ----------
  G.screenshot = () => {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    const name = `sidecraft_${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}.${p(d.getMinutes())}.${p(d.getSeconds())}.png`;
    try {
      const a = document.createElement('a');
      a.download = name;
      a.href = SC.renderer.cv.toDataURL('image/png');
      a.click();
      G.chat('Saved screenshot as §n' + name);
    } catch (e) {
      G.chat('§cCouldn\'t save screenshot: ' + e.message);
    }
  };

  // ---------- main update ----------
  function controls() {
    return {
      dir: (SC.key('right') || SC.input.down.ArrowRight ? 1 : 0) - (SC.key('left') || SC.input.down.ArrowLeft ? 1 : 0),
      jump: SC.key('jump') || SC.key('up') || !!SC.input.down.ArrowUp,
      up: SC.key('up') || SC.key('jump') || !!SC.input.down.ArrowUp,
      down: SC.key('down') || !!SC.input.down.ArrowDown,
      sneak: SC.key('sneak'),
      sprintTap: SC.key('sprint') || SC.keyDouble('left') || SC.keyDouble('right'),
      flyTap: SC.keyDouble('jump'),
    };
  }

  let f3Used = false, f3Was = false;
  function update(dt) {
    const inp = SC.input;
    const w = G.world;
    const p = G.player;
    const r = SC.renderer;
    const gui = SC.gui;

    if (G.state === 'title') {
      G.cam.x += dt * 3;
      if (G.cam.x > w.W - r.vw - 10) G.cam.x = 10;
      const sx = Math.floor(G.cam.x + r.vw / 2);
      const ty = w.surface[SC.clamp(sx, 0, w.W - 1)] - r.vh * 0.62;
      G.cam.y += (ty - G.cam.y) * (1 - Math.exp(-dt * 0.8));
      w.time = 0.15;
      return;
    }

    const free = !gui.screen;
    if (free) {
      // keys
      if (inp.pressed.Escape) {
        if (G.ui) SC.ui.close();
        else if (!p.dead) gui.open(new gui.PauseScreen());
      }
      if (SC.keyPressed('inventory') && !p.dead && !p.spectator) {
        if (G.ui) SC.ui.close();
        else SC.ui.open('inv');
      }
      if (!G.ui && !p.dead) {
        if (SC.keyPressed('chat')) gui.open(new gui.ChatScreen(''));
        else if (SC.keyPressed('command')) gui.open(new gui.ChatScreen('/'));
        for (let k = 1; k <= 9; k++) if (SC.keyPressed('hot' + k)) p.sel = k - 1;
        if (inp.wheel) p.sel = (p.sel + inp.wheel + 9) % 9;
        if (SC.keyPressed('drop') && p.held()) {
          const s = p.held();
          const n = inp.down.ControlLeft || inp.down.ControlRight ? s.n : 1;
          G.dropItem(p.x, p.eyeY() + 0.2, s.id, n, s.d, p.facing * 5);
          G.stat('dropped', n);
          s.n -= n;
          if (!s.n) p.inv[p.sel] = null;
        }
        if (SC.keyPressed('swap')) {
          const t = p.inv[p.sel];
          p.inv[p.sel] = p.off[0];
          p.off[0] = t;
        }
      }
      // F3 toggles debug; F3 held with H toggles advanced tooltips
      if (inp.down.F3 && inp.pressed.KeyH) {
        G.advTips = !G.advTips;
        f3Used = true;
        G.chat('§e[Debug]:§r Advanced tooltips: ' + (G.advTips ? 'shown' : 'hidden'));
      }
      if (inp.down.F3 && inp.pressed.KeyQ) {
        f3Used = true;
        ['\u00a7e[Debug]:\u00a7r Key bindings:', 'F3 + H = Advanced tooltips', 'F3 + Q = Show this list'].forEach(G.chat);
      }
      if (f3Was && !inp.down.F3) {
        if (!f3Used) G.debug = !G.debug;
        f3Used = false;
      }
      if (inp.pressed.F1) G.hideHud = !G.hideHud;
      if (SC.keyPressed('screenshot')) G.screenshot();
      if (SC.keyPressed('zoomIn') || inp.pressed.NumpadAdd) r.zoomBy(1);
      if (SC.keyPressed('zoomOut') || inp.pressed.NumpadSubtract) r.zoomBy(-1);
    }
    f3Was = !!inp.down.F3;
    const curSel = p.held() ? p.held().id : 0;
    if (curSel !== G.lastSel) {
      G.lastSel = curSel;
      G.selName = curSel ? { text: SC.itemName(curSel), t: 2.5 } : null;
    }
    if (G.selName) G.selName.t -= dt;
    if (G.actionbar) G.actionbar.t -= dt;
    for (const m of G.chatLines) m.age += dt;

    // player
    if (!p.dead) {
      const ctl = controls();
      if (!free || G.ui || G.sleepT > 0) {
        ctl.dir = 0;
        ctl.jump = ctl.up = ctl.down = ctl.sneak = false;
        ctl.sprintTap = ctl.flyTap = false;
      }
      if (G.creative && ctl.flyTap) {
        p.flying = !p.flying;
        p.vy = 0;
      }
      ctl.face = p.faceMouse || 0;
      const x0 = p.x, y0 = p.y;
      p.autoJump = SC.options.autoJump;
      p.update(dt, ctl);
      // statistics
      const dx = Math.abs(p.x - x0), dy = p.y - y0;
      if (p.flying || p.spectator) G.stat('flown', Math.hypot(dx, dy));
      else if (p.inWater) G.stat('swim', Math.hypot(dx, dy));
      else if (p.onGround) G.stat(p.sprint ? 'sprint' : 'walk', dx);
      else if (dy > 0) G.stat('fallen', dy);
      if (free && !G.ui && G.sleepT <= 0 && !p.spectator) SC.play.interact(dt);
      else {
        p.mine = null;
        p.eatT = 0;
        p.bowT = 0;
        G.target = null;
        G.placeAt = null;
      }
      if (G.creative || p.spectator) {
        p.hp = 20;
        p.food = 20;
        p.air = 10;
      }
    }
    if (G.ui) SC.ui.update();
    G.stat('playTime', dt);
    G.stats.sinceDeath = (G.stats.sinceDeath || 0) + dt;

    // world
    for (const e of G.entities) if (!e.dead) e.update(dt);
    G.entities = G.entities.filter((e) => !e.dead);
    if (Math.random() < 0.1) {
      const items = G.entities.filter((e) => e.kind === 'item');
      for (let a = 0; a < items.length; a++)
        for (let b = a + 1; b < items.length; b++) {
          const A = items[a], Bb = items[b];
          if (A.dead || Bb.dead || A.id !== Bb.id || A.d || Bb.d) continue;
          if (Math.abs(A.x - Bb.x) < 0.8 && Math.abs(A.y - Bb.y) < 0.8 && A.n + Bb.n <= SC.maxStack(A.id)) {
            A.n += Bb.n;
            Bb.dead = true;
          }
        }
    }
    SC.updateParticles(dt);
    SC.play.spawnMobs(dt);
    G.fluidT -= dt;
    if (G.fluidT <= 0) {
      G.fluidT = 0.09;
      w.tickFluids();
    }
    w.randomTicks(p.x, 70);
    SC.play.tickFurnaces(dt);
    w.time += dt / DAY_LEN;
    if (w.time >= 1) {
      w.time -= 1;
      w.day++;
    }
    if (G.sleepT > 0) {
      G.sleepT -= dt;
      if (G.sleepT <= 0) {
        w.time = 0.0;
        w.day++;
        G.stat('slept', 1);
        for (const e of G.entities) if (e instanceof SC.Mob && e.def.hostile && Math.hypot(e.x - p.x, e.y - p.y) < 40) e.dead = true;
      }
    }

    // camera
    const tx = p.x - r.vw / 2, ty = p.y - 1 - r.vh / 2;
    const k = 1 - Math.exp(-dt * 9);
    G.cam.x += (tx - G.cam.x) * k;
    G.cam.y += (ty - G.cam.y) * k;
    G.cam.x = SC.clamp(G.cam.x, -2, w.W - r.vw + 2);
    G.cam.y = SC.clamp(G.cam.y, -r.vh * 0.5, w.H - r.vh + 2);
    G.shakeT -= dt;
    G.saveT += dt;
    if (G.saveT > 45) {
      G.saveT = 0;
      G.save();
    }
    SC.audio.update(dt);
  }

  G.debugLines = () => {
    const p = G.player, w = G.world;
    const tx = Math.floor(p.x), ty = Math.floor(p.y - 0.01);
    const ll = SC.renderer.lastLight;
    let sky = 0, blk = 0;
    if (ll) {
      const i = (ty - ll.y0) * ll.w + tx - ll.x0;
      if (i >= 0 && i < ll.L.n) {
        sky = ll.L.sky[i];
        blk = ll.L.blk[i];
      }
    }
    return [
      'Sidecraft 1.0 (1.0/vanilla)',
      `${Math.round(G.fps)} fps T: inf vsync`,
      '',
      `XY: ${p.x.toFixed(3)} / ${p.y.toFixed(3)}`,
      `Block: ${tx} ${ty}`,
      `Facing: ${p.facing > 0 ? 'east (Towards positive X)' : 'west (Towards negative X)'}`,
      `Client Light: ${Math.max(Math.round(sky * G.dayFactor()), blk)} (${sky} sky, ${blk} block)`,
      `Biome: sidecraft:${w.surfaceBiome(tx)}`,
      `Local Difficulty: ${SC.DIFF_NAMES[G.difficulty]} (Day ${w.day})`,
      `E: ${G.entities.length}, P: ${SC.particles.length}, F: ${w.active.length}`,
      '',
      'For help: press F3 + Q',
    ];
  };
  G.debugRight = () => {
    const w = G.world;
    const out = ['JavaScript: ' + (navigator.userAgent.match(/(Chrome|Firefox|Safari)\/[\d.]+/) || ['Browser'])[0], '', `Display: ${SC.renderer.cv.width}x${SC.renderer.cv.height}`, `GUI scale: ${SC.gui.gs}`];
    const t = G.target;
    if (t) {
      const id = t.wall ? w.getBg(t.x, t.y) : w.get(t.x, t.y);
      out.push('', `Targeted ${t.wall ? 'Wall' : 'Block'}: ${t.x}, ${t.y}`, 'sidecraft:' + blocks[id].key.toLowerCase());
    }
    return out;
  };

  // ---------- drawing ----------
  function drawOverlay(ctx) {
    const r = SC.renderer;
    const S = r.S;
    const p = G.player;
    const W = r.cv.width, H = r.cv.height;
    const gui = SC.gui;
    if (G.state === 'play') {
      const outline = (x, y) => {
        ctx.strokeStyle = 'rgba(0,0,0,0.4)';
        ctx.lineWidth = Math.max(2, Math.round(S / 16));
        ctx.strokeRect(x * S - r.camPx + 1, y * S - r.camPy + 1, S - 2, S - 2);
      };
      if (!G.ui && !p.dead && !G.hideHud && G.target) outline(G.target.x, G.target.y);
      if (p.headInWater && !p.spectator) {
        ctx.fillStyle = 'rgba(30,60,170,0.28)';
        ctx.fillRect(0, 0, W, H);
      }
      if (p.inLava && !p.spectator) {
        ctx.fillStyle = 'rgba(255,90,0,0.45)';
        ctx.fillRect(0, 0, W, H);
      }
      if (p.burn > 0 && !p.dead) {
        const t = performance.now() / 80;
        for (let i = 0; i < 12; i++) {
          const fx = (((i * 97 + Math.floor(t) * 31) % 100) / 100) * W;
          const fh = H * (0.08 + ((i * 41 + Math.floor(t) * 17) % 100) / 900);
          ctx.fillStyle = i % 2 ? 'rgba(255,190,40,0.35)' : 'rgba(255,90,10,0.35)';
          ctx.fillRect(fx, H - fh, W / 14, fh);
        }
      }
      if (G.sleepT > 0) {
        ctx.fillStyle = `rgba(0,0,10,${SC.clamp((2.2 - G.sleepT) / 1.4, 0, 1)})`;
        ctx.fillRect(0, 0, W, H);
      }
      ctx.save();
      ctx.scale(gui.gs, gui.gs);
      ctx.imageSmoothingEnabled = false;
      SC.ui.drawHUD(ctx);
      SC.ui.drawScreen(ctx);
      if (!G.ui && !gui.screen && !p.dead && !G.hideHud) SC.ui.drawCrosshair(ctx, Math.floor(SC.input.mx / gui.gs), Math.floor(SC.input.my / gui.gs));
      ctx.restore();
    }
    gui.draw(ctx);
  }

  // ---------- loop ----------
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (dt > 0) G.fps += (1 / dt - G.fps) * 0.05;
    const gui = SC.gui;
    gui.t += dt;
    SC.renderer.resize();
    gui.metrics();
    if (G.genJob) stepGen();
    if (G.world) {
      const paused = G.state === 'play' && gui.screen && gui.screen.pause;
      if (!paused) update(dt);
      SC.renderer.render(G);
      // keep a clean shot of the world (no HUD or menus) for the world list icon
      if (G.state === 'play' && !gui.screen && !G.ui && now - (G.thumbAt || 0) > 5000) {
        G.thumbAt = now;
        G.lastThumb = thumbnail();
      }
    }
    drawOverlay(SC.renderer.ctx);
    const cursor = G.state === 'play' && !gui.screen && !G.ui && !G.player.dead ? 'none' : 'default';
    if (SC.renderer.cv.style.cursor !== cursor) SC.renderer.cv.style.cursor = cursor;
    SC.inputEndFrame();
    requestAnimationFrame(frame);
  }

  function toTitle() {
    G.state = 'title';
    G.ui = null;
    G.worldId = null;
    G.meta = null;
    G.lastThumb = null;
    G.thumbAt = performance.now();
    G.world = new SC.World((Math.random() * 1e9) | 0);
    G.world.generate();
    hookWorld(G.world);
    G.entities = [];
    G.player = new SC.Player(G.world.spawn.x, G.world.spawn.y);
    G.cam.x = 200;
    G.cam.y = G.world.surface[200] - SC.renderer.vh * 0.6;
    SC.gui.open(new SC.gui.TitleScreen());
  }

  SC.boot = () => {
    const cv = document.getElementById('screen');
    SC.buildTextures();
    SC.renderer = new SC.Renderer(cv);
    SC.renderer.applyZoomOption();
    SC.gui.init();
    SC.bindInput(cv);
    addEventListener('resize', () => SC.renderer.resize());
    // Ctrl is the sprint key, so guard against Ctrl+W closing the tab mid-game
    addEventListener('beforeunload', (e) => {
      if (G.state !== 'play') return;
      G.save();
      e.preventDefault();
      e.returnValue = '';
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && G.state === 'play' && !SC.gui.screen && !G.player.dead) SC.gui.open(new SC.gui.PauseScreen());
    });
    toTitle();
    requestAnimationFrame(frame);
  };
})();
