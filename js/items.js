// Items: every curio you can loot in the Lost Reels and sell in the Emporium.
(function () {
  const K = G.ink,
    C = K.C;
  const IT = (G.items = {});

  // base = the hidden "fair" price customers judge against
  IT.db = {
    // Reel 1: The Pantry Picture
    sugar: { name: 'Sugar Crystal', base: 14, stack: 10, reel: 0, desc: 'Sweet, sparkly and a touch sticky.' },
    spring: { name: 'Copper Spring', base: 26, stack: 10, reel: 0, desc: 'Boing! Hammerstein can forge with these.' },
    spoon: { name: 'Silver Spoon', base: 42, stack: 5, reel: 0, desc: 'Polished to a mirror shine.' },
    jam: { name: "Jar o' Jam", base: 64, stack: 5, reel: 0, desc: 'Strawberry. Still wriggling a bit.' },
    saucer: { name: 'Fancy Saucer', base: 98, stack: 5, reel: 0, desc: 'Gold-rimmed. Fit for a duchess.' },
    // Reel 2: Big Top Blowout
    ticket: { name: 'Prize Ticket', base: 22, stack: 10, reel: 1, desc: 'Good for one (1) goldfish.' },
    balloon: { name: 'Lucky Balloon', base: 48, stack: 5, reel: 1, desc: 'Never, ever pops. Probably.' },
    pin: { name: 'Juggling Pin', base: 75, stack: 5, reel: 1, desc: 'Balanced for three-at-a-time.' },
    nose: { name: 'Clown Nose', base: 115, stack: 5, reel: 1, desc: 'Honk honk. Very collectible.' },
    popcorn: { name: 'Golden Popcorn', base: 160, stack: 5, reel: 1, desc: 'A single kernel of pure butter.' },
    // Reel 3: Tick-Tock Tower
    gear: { name: 'Brass Gear', base: 38, stack: 10, reel: 2, desc: 'Precision teeth. Forge material.' },
    jewel: { name: 'Jewel Bearing', base: 95, stack: 5, reel: 2, desc: 'A ruby that keeps perfect time.' },
    feather: { name: 'Cuckoo Feather', base: 130, stack: 5, reel: 2, desc: 'Chimes softly on the hour.' },
    hourglass: { name: 'Bottled Time', base: 210, stack: 5, reel: 2, desc: 'Five spare minutes, corked.' },
    hand: { name: 'Minute Hand', base: 270, stack: 3, reel: 2, desc: 'Points at whatever you want.' },
    // Reel 4: The Final Cut
    film: { name: 'Nitrate Film', base: 190, stack: 5, reel: 3, desc: 'Highly flammable. Keep away from Wick.' },
    lens: { name: 'Crystal Lens', base: 360, stack: 3, reel: 3, desc: 'Everything looks better through it.' },
    bulb: { name: 'Star Bulb', base: 520, stack: 3, reel: 3, desc: 'The brightest light in show business.' },
  };
  IT.byReel = (r) => Object.keys(IT.db).filter((k) => IT.db[k].reel === r);

  // ---- bag helpers ----
  IT.BAG_SIZE = 16;
  IT.add = (list, id, n = 1, cap = IT.BAG_SIZE) => {
    const st = IT.db[id].stack;
    for (const s of list) {
      if (n <= 0) break;
      if (s.id === id && s.n < st) {
        const k = Math.min(n, st - s.n);
        s.n += k;
        n -= k;
      }
    }
    while (n > 0 && list.length < cap) {
      const k = Math.min(n, st);
      list.push({ id, n: k });
      n -= k;
    }
    return n; // leftover that didn't fit
  };
  IT.count = (list, id) => list.reduce((a, s) => a + (s.id === id ? s.n : 0), 0);
  IT.remove = (list, id, n) => {
    for (let i = list.length - 1; i >= 0 && n > 0; i--) {
      if (list[i].id !== id) continue;
      const k = Math.min(n, list[i].n);
      list[i].n -= k;
      n -= k;
      if (list[i].n <= 0) list.splice(i, 1);
    }
  };
  IT.fits = (list, id, cap = IT.BAG_SIZE) =>
    list.length < cap || list.some((s) => s.id === id && s.n < IT.db[id].stack);

  // ---- ledger: what customers thought of each price ----
  IT.mood = (id, price, rnd = 0) => {
    const r = price / IT.db[id].base + rnd;
    if (r <= 0.82) return 'ecstatic';
    if (r <= 1.08) return 'happy';
    if (r <= 1.3) return 'meh';
    return 'angry';
  };
  IT.record = (id, price, mood) => {
    const L = (G.state.ledger[id] = G.state.ledger[id] || []);
    const ex = L.find((e) => e.price === price);
    if (ex) ex.mood = mood;
    else L.push({ price, mood });
    L.sort((a, b) => a.price - b.price);
    if (L.length > 8) L.splice(0, L.length - 8);
  };
  // a short readable summary of the ledger for the price tag UI
  IT.ledgerHint = (id) => {
    const L = G.state.ledger[id];
    if (!L || !L.length) return null;
    const best = L.filter((e) => e.mood === 'happy').pop();
    const angry = L.find((e) => e.mood === 'angry');
    const cheap = L.filter((e) => e.mood === 'ecstatic').pop();
    return { best, angry, cheap, all: L };
  };
  IT.guessPrice = (id) => {
    const h = IT.ledgerHint(id);
    if (h && h.best) return h.best.price;
    if (h && h.cheap) return Math.round(h.cheap.price * 1.15);
    // first guess is Wick's hunch, deliberately off so the ledger matters
    const hunch = 0.7 + G.hash(id.length * 7.7 + id.charCodeAt(1)) * 0.9;
    return Math.max(5, Math.round((IT.db[id].base * hunch) / 5) * 5);
  };

  // ---- icons ----
  IT.icon = (id, x, y, s = 1) => {
    const c = G.ctx;
    c.save();
    c.translate(x, y);
    c.scale(s, s);
    K.seed(id.length * 13 + id.charCodeAt(0));
    const f = ICONS[id];
    if (f) f();
    else K.blob(0, 0, 12, 12, C.grey, { lw: 2.5 });
    c.restore();
  };
  const ICONS = {
    sugar() {
      K.shape([[-10, -6], [2, -12], [12, -4], [10, 9], [-2, 13], [-12, 5]], C.white, { lw: 2.5 });
      K.line([[-10, -6], [0, 0], [12, -4]], 1.5);
      K.line([[0, 0], [-2, 13]], 1.5);
      K.star(7, -10, 4, C.yellow, 4, 0, { lw: 1 });
    },
    spring() {
      for (let i = 0; i < 5; i++) K.blob(0, -10 + i * 5, 10, 3.5, null, { lw: 3, stroke: '#b86a2f', amt: 0.4 });
      for (let i = 0; i < 5; i++) K.blob(0, -10 + i * 5, 10, 3.5, null, { lw: 1, amt: 0.4 });
    },
    spoon() {
      K.line([[-10, 12], [4, -2]], 4, '#cfd3d8');
      K.line([[-10, 12], [4, -2]], 1.2);
      K.blob(7, -6, 6, 9, '#dde2e8', { lw: 2.4, rot: 0.8, hl: true });
    },
    jam() {
      K.rrect(-10, -6, 20, 18, 4, '#c0303a', { lw: 2.5 });
      K.rrect(-11, -12, 22, 7, 2, '#e8e2d2', { lw: 2.2 });
      K.rrect(-6, 0, 12, 7, 1, C.cream, { lw: 1.5 });
    },
    saucer() {
      K.blob(0, 4, 15, 7, C.white, { lw: 2.5 });
      K.blob(0, 4, 15, 7, null, { lw: 2, stroke: C.gold });
      K.blob(0, 3, 7, 3, null, { lw: 1.5 });
    },
    ticket() {
      K.shape([[-13, -8], [13, -8], [11, 0], [13, 8], [-13, 8], [-11, 0]], '#e6a13a', { lw: 2.4 });
      K.text('ADMIT', 0, 0, 7, { font: K.F.deco, fill: C.dbrown, lw: 0, shadow: false });
    },
    balloon() {
      K.line([[0, 6], [2, 16], [-2, 20]], 1.5, K.INK, { smooth: true });
      K.blob(0, -4, 11, 13, C.red, { lw: 2.5, hl: true });
      K.shape([[0, 8], [-3, 11], [3, 11]], C.red, { lw: 1.5 });
    },
    pin() {
      K.shape([[0, -14], [5, -8], [3, 0], [7, 8], [4, 14], [-4, 14], [-7, 8], [-3, 0], [-5, -8]], C.white, { smooth: true, lw: 2.4 });
      K.line([[-4, 2], [4, 2]], 3, C.red);
      K.line([[-5, 6], [5, 6]], 3, C.blue);
    },
    nose() {
      K.blob(0, 0, 11, 11, C.red, { lw: 2.6, hl: true });
    },
    popcorn() {
      K.blob(-5, 2, 7, 6, C.gold, { lw: 2.2, hl: true });
      K.blob(5, 0, 7, 7, C.gold, { lw: 2.2, hl: true });
      K.blob(0, -6, 7, 6, '#f6d768', { lw: 2.2, hl: true });
      K.star(9, -10, 4, C.white, 4, 0, { lw: 1 });
    },
    gear() {
      const p = [];
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const r = i % 2 ? 9 : 13;
        p.push([Math.cos(a) * r, Math.sin(a) * r]);
      }
      K.shape(p, '#c99a3c', { lw: 2.4 });
      K.blob(0, 0, 4, 4, C.cream, { lw: 2 });
    },
    jewel() {
      K.shape([[-9, -4], [-4, -10], [4, -10], [9, -4], [0, 11]], '#d8304a', { lw: 2.4 });
      K.line([[-9, -4], [9, -4]], 1.4);
      K.line([[-4, -10], [0, -4], [4, -10]], 1.2);
    },
    feather() {
      K.shape([[-8, 12], [-4, 2], [2, -10], [9, -14], [7, -4], [1, 6]], '#5f8fc4', { smooth: true, lw: 2.4 });
      K.line([[-10, 14], [7, -11]], 1.6);
    },
    hourglass() {
      K.rrect(-10, -14, 20, 4, 1, C.brown, { lw: 2 });
      K.rrect(-10, 10, 20, 4, 1, C.brown, { lw: 2 });
      K.shape([[-8, -10], [8, -10], [2, 0], [8, 10], [-8, 10], [-2, 0]], 'rgba(200,230,240,0.9)', { lw: 2 });
      K.shape([[-5, 10], [5, 10], [0, 4]], C.tan, { lw: 0 });
    },
    hand() {
      K.shape([[-2, 14], [2, 14], [3, -4], [7, -4], [0, -15], [-7, -4], [-3, -4]], K.INK, { lw: 1.5 });
      K.blob(0, 10, 3, 3, C.gold, { lw: 1.5 });
    },
    film() {
      K.blob(0, 0, 13, 13, '#3c3a3f', { lw: 2.5 });
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        K.blob(Math.cos(a) * 7, Math.sin(a) * 7, 2.6, 2.6, C.cream, { lw: 1 });
      }
      K.shape([[10, 6], [18, 12], [16, 16], [8, 10]], '#a06b2a', { lw: 1.6 });
    },
    lens() {
      K.blob(0, 0, 12, 12, '#bfe0ec', { lw: 3.2, hl: true });
      K.blob(0, 0, 7, 7, null, { lw: 1.2 });
    },
    bulb() {
      K.rrect(-5, 6, 10, 8, 2, '#9e9aa6', { lw: 2 });
      K.blob(0, -3, 10, 11, '#fff3b0', { lw: 2.5, hl: true });
      K.star(0, -3, 5, C.gold, 5, 0, { lw: 1 });
    },
    // non-item icons used in UI
    potion() {
      K.shape([[-4, -12], [4, -12], [4, -5], [10, 4], [7, 12], [-7, 12], [-10, 4], [-4, -5]], '#e85a74', { lw: 2.4, smooth: true });
      K.rrect(-5, -15, 10, 5, 1, C.brown, { lw: 1.8 });
      K.blob(-3, 3, 2.5, 3.5, 'rgba(255,255,255,0.6)', { lw: 0 });
    },
    bag() {
      K.shape([[-12, -4], [12, -4], [14, 12], [-14, 12]], C.brown, { lw: 2.5, smooth: true });
      K.shape([[-7, -4], [-5, -12], [5, -12], [7, -4]], null, { lw: 2.5 });
    },
    hook() {
      K.line([[0, 14], [0, -6], [4, -12], [10, -10], [10, -4]], 3.5, '#8b6a3e', { smooth: true });
    },
  };
})();
