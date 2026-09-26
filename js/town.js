// Town of Flickerton: the hub street with the Emporium, the Forge,
// Fizzwater's Apothecary and the Picture House (gateway to the Lost Reels).
(function () {
  const K = G.ink,
    C = K.C,
    I = G.input,
    A = G.audio,
    U = G.ui,
    CH = G.chars,
    F = G.fx;
  G.scenes = G.scenes || {};

  // paint into an offscreen canvas once (static watercolour backdrops)
  G.paintTo = (fn, w = G.W, h = G.H) => {
    const cv = document.createElement('canvas');
    const q = 2;
    cv.width = w * q;
    cv.height = h * q;
    const cx = cv.getContext('2d');
    cx.scale(q, q);
    const prev = G.ctx;
    G.ctx = cx;
    const b = G.boil;
    G.boil = 0;
    try {
      fn(cx);
    } finally {
      G.ctx = prev;
      G.boil = b;
    }
    return cv;
  };

  const SKIES = {
    morning: ['#a9d3dc', '#f5e7c4', '#fff6d8'],
    evening: ['#6d5a93', '#f0955e', '#ffd08a'],
    night: ['#141c38', '#2f3563', '#4a4a7a'],
  };

  G.REELS = [
    { name: 'THE PANTRY PICTURE', short: 'Pantry', color: '#d9b27c', boss: 'Boilin\' Bartholomew' },
    { name: 'BIG TOP BLOWOUT', short: 'Big Top', color: '#d65a4a', boss: 'Jangles the Jack' },
    { name: 'TICK-TOCK TOWER', short: 'Clocktower', color: '#6f8fae', boss: 'Grandfather Tock' },
    { name: 'THE FINAL CUT', short: 'Final Cut', color: '#6b4f7d', boss: 'Mr. Sprocket' },
  ];

  function paintTown(phase) {
    return G.paintTo((c) => {
      const sky = SKIES[phase];
      const g = c.createLinearGradient(0, 0, 0, 280);
      g.addColorStop(0, sky[0]);
      g.addColorStop(0.7, sky[1]);
      g.addColorStop(1, sky[2]);
      c.fillStyle = g;
      c.fillRect(0, 0, G.W, 300);
      // sun / moon
      if (phase === 'night') {
        K.seed(9);
        K.blob(860, 50, 26, 26, '#f4eccd', { lw: 3 });
        K.blob(872, 44, 22, 24, sky[0], { lw: 0 });
        for (let i = 0; i < 30; i++) K.star((i * 97) % G.W, (i * 53) % 150 + 10, 2 + (i % 3), '#f4eccd', 4, 0, { lw: 0 });
      } else {
        K.wash(phase === 'evening' ? 760 : 120, phase === 'evening' ? 170 : 60, 90, 90, phase === 'evening' ? '#ffcf7a' : '#fff4c0', 0.9);
        K.seed(8);
        K.blob(phase === 'evening' ? 760 : 120, phase === 'evening' ? 170 : 60, 30, 30, phase === 'evening' ? '#ffb45c' : '#fff0a8', { lw: 3 });
      }
      // clouds & hills
      for (let i = 0; i < 5; i++) K.wash(80 + i * 210, 60 + (i % 2) * 30, 110, 30, phase === 'night' ? 'rgba(90,100,150,0.6)' : 'rgba(255,255,255,0.8)');
      c.fillStyle = phase === 'night' ? '#2d3a4a' : phase === 'evening' ? '#8a6a7a' : '#8fb48a';
      c.beginPath();
      c.moveTo(0, 200);
      for (let x = 0; x <= G.W; x += 40) c.lineTo(x, 180 + Math.sin(x * 0.012) * 30 + Math.sin(x * 0.03) * 10);
      c.lineTo(G.W, 300);
      c.lineTo(0, 300);
      c.fill();
      // street
      const sg = c.createLinearGradient(0, 270, 0, G.H);
      sg.addColorStop(0, '#c9b089');
      sg.addColorStop(1, '#a88c68');
      c.fillStyle = sg;
      c.fillRect(0, 270, G.W, 270);
      const r = G.rng(44);
      c.strokeStyle = 'rgba(70,45,25,0.35)';
      c.lineWidth = 1.5;
      for (let y = 300; y < G.H; y += 18) {
        for (let x = (y / 18) % 2 ? 0 : 14; x < G.W; x += 28) {
          c.beginPath();
          c.ellipse(x + r() * 4, y + r() * 3, 11, 6, 0, 0, Math.PI * 2);
          c.stroke();
        }
      }
      // sidewalk
      c.fillStyle = '#d8c7a4';
      c.fillRect(0, 268, G.W, 22);
      K.line([[0, 268], [G.W, 268]], 3);
      K.line([[0, 290], [G.W, 290]], 2.5);
      // buildings
      paintEmporium(c, 30, 60);
      paintForge(c, 330, 90);
      paintApothecary(c, 545, 90);
      paintPictureHouse(c, 735, 30);
    });
  }

  function paintEmporium(c, x, y) {
    K.seed(100);
    K.shape([[x, y + 40], [x + 140, y - 10], [x + 280, y + 40]], '#8e3b2e', { lw: 3.5 });
    K.rrect(x + 10, y + 40, 260, 170, 4, '#a9744c', { lw: 3.5 });
    for (let i = 0; i < 8; i++) K.line([[x + 12, y + 60 + i * 20], [x + 268, y + 60 + i * 20]], 1.2, 'rgba(60,30,15,0.4)');
    // sign
    K.rrect(x + 50, y + 44, 180, 34, 6, C.cream, { lw: 3 });
    K.text('FLICKER EMPORIUM', x + 140, y + 62, 15, { font: K.F.deco, fill: C.red, lw: 0, shadow: false });
    // awning stripes
    for (let i = 0; i < 9; i++) K.shape([[x + 16 + i * 28, y + 90], [x + 44 + i * 28, y + 90], [x + 44 + i * 28, y + 112], [x + 30 + i * 28, y + 118], [x + 16 + i * 28, y + 112]], i % 2 ? C.cream : C.red, { lw: 2.2 });
    // window
    K.rrect(x + 26, y + 128, 110, 62, 4, '#f2dfa6', { lw: 3 });
    K.line([[x + 81, y + 128], [x + 81, y + 190]], 2.5);
    K.rrect(x + 36, y + 170, 30, 14, 2, C.gold, { lw: 1.5 });
    K.rrect(x + 94, y + 166, 26, 18, 2, C.blue, { lw: 1.5 });
    // door
    K.rrect(x + 160, y + 120, 70, 90, 30, '#6a3c24', { lw: 3.5 });
    K.blob(x + 218, y + 170, 4, 4, C.gold, { lw: 1.5 });
    K.rrect(x + 175, y + 134, 40, 26, 10, '#f2dfa6', { lw: 2 });
  }
  function paintForge(c, x, y) {
    K.seed(200);
    K.rrect(x + 150, y - 40, 34, 70, 2, '#7a4a3a', { lw: 3 }); // chimney
    K.rrect(x, y + 20, 200, 160, 4, '#b5553f', { lw: 3.5 });
    for (let row = 0; row < 8; row++)
      for (let col = 0; col < 7; col++) {
        c.strokeStyle = 'rgba(60,20,10,0.35)';
        c.lineWidth = 1;
        c.strokeRect(x + 4 + col * 28 + (row % 2) * 14, y + 24 + row * 19, 28, 19);
      }
    K.shape([[x - 8, y + 24], [x + 100, y - 18], [x + 208, y + 24]], '#4a3a36', { lw: 3.5 });
    K.rrect(x + 30, y + 34, 140, 32, 6, '#3a302c', { lw: 3 });
    K.text('THE FORGE', x + 100, y + 51, 17, { font: K.F.deco, fill: C.orange, lw: 0, shadow: false });
    K.rrect(x + 64, y + 90, 72, 90, 4, '#3a2a22', { lw: 3.5 });
    K.wash(x + 100, y + 150, 40, 30, 'rgba(255,140,40,0.8)');
    // anvil sign
    K.shape([[x + 12, y + 110], [x + 50, y + 110], [x + 42, y + 122], [x + 46, y + 132], [x + 16, y + 132], [x + 20, y + 122]], '#56575c', { lw: 2.5 });
  }
  function paintApothecary(c, x, y) {
    K.seed(300);
    K.rrect(x, y + 20, 170, 160, 4, '#5f8f6a', { lw: 3.5 });
    K.shape([[x - 8, y + 24], [x + 85, y - 22], [x + 178, y + 24]], '#39574a', { lw: 3.5 });
    K.rrect(x + 16, y + 34, 138, 30, 6, C.cream, { lw: 3 });
    K.text('APOTHECARY', x + 85, y + 50, 15, { font: K.F.deco, fill: C.dgreen, lw: 0, shadow: false });
    K.rrect(x + 16, y + 84, 58, 60, 4, '#d8efe0', { lw: 3 });
    ['#e85a74', '#6fb0d8', '#f2c440'].forEach((col, i) => {
      K.rrect(x + 22 + i * 17, y + 116, 12, 22, 4, col, { lw: 1.8 });
    });
    K.rrect(x + 96, y + 96, 58, 84, 26, '#2f4a3a', { lw: 3.5 });
    K.blob(x + 144, y + 140, 3.5, 3.5, C.gold, { lw: 1.4 });
  }
  function paintPictureHouse(c, x, y) {
    K.seed(400);
    K.rrect(x, y + 30, 210, 210, 4, '#6b4f7d', { lw: 3.5 });
    K.shape([[x + 20, y + 30], [x + 105, y - 22], [x + 190, y + 30]], '#4a3558', { lw: 3.5 });
    K.blob(x + 105, y + 10, 16, 16, C.gold, { lw: 3 });
    K.star(x + 105, y + 10, 10, C.cream, 5, 0);
    for (let i = 0; i < 5; i++) K.rrect(x + 14 + i * 40, y + 40, 22, 70, 10, '#56406a', { lw: 2 });
    // door
    K.rrect(x + 70, y + 160, 70, 80, 6, '#2d1f38', { lw: 3.5 });
    K.line([[x + 105, y + 160], [x + 105, y + 240]], 2.5);
  }

  G.paintTownBg = paintTown;

  // ---------- goods ----------
  const forgeGoods = () => {
    const s = G.state;
    const out = [];
    const dmg = [
      null,
      null,
      { lv: 2, gold: 250, mats: { spring: 4 }, desc: 'Hotter shots. +35% damage.' },
      { lv: 3, gold: 800, mats: { gear: 4, jewel: 2 }, desc: 'Blazing shots. +75% damage.' },
      { lv: 4, gold: 1800, mats: { hourglass: 2, nose: 2 }, desc: 'Inferno shots. +120% damage.' },
    ][s.dmgLevel + 1];
    if (dmg) out.push({ name: 'Flicker Finger Lv' + dmg.lv, desc: dmg.desc, gold: dmg.gold, mats: dmg.mats, buy: () => (s.dmgLevel = dmg.lv), thanks: 'HAR! Feel that heat? Go singe somethin\'!' });
    else out.push({ name: 'Flicker Finger Lv4', desc: '', gold: 0, owned: () => true });
    out.push({
      name: 'Sparkler Spread',
      desc: 'Three-way short-range blast.',
      gold: 350,
      mats: { ticket: 5 },
      owned: () => s.weapons.includes('sparkler'),
      buy: () => {
        s.weapons.push('sparkler');
        s.weapon = 'sparkler';
      },
      thanks: 'Sparkler\'s yours. Press C to swap weapons, kid.',
    });
    out.push({
      name: 'Firefly Chaser',
      desc: 'Weak, but they hunt enemies down.',
      gold: 650,
      mats: { feather: 3 },
      owned: () => s.weapons.includes('firefly'),
      buy: () => {
        s.weapons.push('firefly');
        s.weapon = 'firefly';
      },
      thanks: 'Them fireflies\'ll find anybody. Press C to swap!',
    });
    const arm = [
      { gold: 200, mats: { sugar: 5 }, desc: 'Thicker wax. +1 max HP.' },
      { gold: 650, mats: { balloon: 3 }, desc: 'Double-dipped. +1 max HP.' },
      { gold: 1500, mats: { hand: 1, film: 1 }, desc: 'Triple-dipped. +1 max HP.' },
    ][s.hpLevel];
    if (arm)
      out.push({ name: 'Wax Coat ' + ['I', 'II', 'III'][s.hpLevel], desc: arm.desc, gold: arm.gold, mats: arm.mats, buy: () => (s.hpLevel += 1), thanks: 'Snug as a wick in a jar. Stay lit out there!' });
    return out;
  };
  const apothGoods = () => {
    const s = G.state;
    s.potionMax = s.potionMax || 3;
    return [
      {
        name: 'Health Tonic',
        desc: 'Heals 2 HP. Press Q in a pinch.',
        gold: 40,
        owned: () => s.potions >= s.potionMax,
        ownedLine: 'Your pockets are clinkin\' already! Max ' + s.potionMax + '.',
        buy: () => s.potions++,
        thanks: 'Shake well! Fizz responsibly!',
      },
      {
        name: 'Tonic Bandolier',
        desc: 'Carry up to 5 tonics.',
        gold: 300,
        mats: { jam: 2 },
        owned: () => s.potionMax >= 5,
        buy: () => (s.potionMax = 5),
        thanks: 'Now you look like a real adventurer. Fizz!',
      },
    ];
  };

  const HINTS = [
    "Folks say the Picture House basement hums at night. Spooky!",
    'Price a curio too high and customers storm off. Too low, and they grin like fools!',
    'Hammerstein can make your finger-gun hotter, if you bring him the right parts.',
    "If you're about to get snuffed, the Stage Hook (R) yanks you home, loot and all. For a fee!",
    'Pink things can be PARRIED. Roll right into \'em, sonny!',
    "Your bag's top row is a safe pocket. Keep your best loot there!",
    'Mr. Sprocket owns half this town. Never seen him smile, though. Just flicker.',
  ];

  // ---------- scene ----------
  G.scenes.town = (from) => {
    const s = G.state;
    const S = {
      bg: {},
      pl: null,
      folks: [],
      t: 0,
      irisAt: null,
      enter() {
        const spawn = {
          shop: [200, 305],
          pictures: [840, 305],
        }[from] || [200, 305];
        this.pl = new G.Player(spawn[0], spawn[1], false);
        this.pl.fy = 1;
        this.world = {
          bounds: { x0: 10, y0: 282, x1: 950, y1: 530 },
          solids: [
            { x: 480, y: 440, r: 58 },
            { x: 310, y: 300, r: 8 },
            { x: 730, y: 300, r: 8 },
          ],
        };
        A.play(s.phase === 'night' ? 'dungeon' : 'town');
        const r = G.rng(s.day * 7 + 3);
        for (let i = 0; i < 3; i++) {
          const spec = CH.customers[(s.day + i * 3) % CH.customers.length];
          const f = { x: 100 + r() * 760, y: 330 + r() * 170, tx: 0, ty: 0, wait: r() * 2, spec, phase: 0, moving: false, hint: HINTS[(s.day + i) % HINTS.length], r: 12 };
          G.collide(f, this.world);
          this.folks.push(f);
        }
        if (!s.seen.townIntro) {
          s.seen.townIntro = true;
          U.say([
            { who: 'wick', text: "Flickerton! Home sweet home. The Emporium's shelves are bare, though..." },
            { who: 'wick', text: "Granny said the Lost Reels are under the Picture House, over on the right. I'll grab some curios tonight and sell 'em tomorrow!" },
          ]);
        }
      },
      update(dt) {
        this.t += dt;
        const pl = this.pl;
        pl.update(dt, this.world);
        this.folks.forEach((f) => {
          if (f.wait > 0) {
            f.wait -= dt;
            f.moving = false;
            if (f.wait <= 0) {
              f.tx = 60 + Math.random() * 840;
              f.ty = 320 + Math.random() * 190;
            }
            return;
          }
          const d = G.dist(f.x, f.y, f.tx, f.ty);
          if (d < 5) {
            f.wait = 1.5 + Math.random() * 3;
            return;
          }
          f.moving = true;
          f.phase += dt * 10;
          f.x += ((f.tx - f.x) / d) * 60 * dt;
          f.y += ((f.ty - f.y) / d) * 60 * dt;
          G.collide(f, this.world);
        });
        this.near = null;
        DOORS.forEach((d) => {
          if (G.dist(pl.x, pl.y, d.x, d.y) < 48) this.near = d;
        });
        if (!this.near)
          this.folks.forEach((f) => {
            if (G.dist(pl.x, pl.y, f.x, f.y) < 42) this.near = { id: 'folk', f, label: 'TALK', x: f.x, y: f.y - 80 };
          });
        if (this.near && I.hit('interact')) this.use(this.near);
        if (I.hit('bag')) U.openBag(false);
        if (I.hit('pause')) U.openPause(() => G.go(() => G.scenes.title()));
      },
      use(d) {
        if (d.id === 'shop') {
          A.sfx('door');
          G.go(() => G.scenes.shop(), { cx: d.x, cy: d.y - 40 });
        } else if (d.id === 'forge') {
          U.openStore('hammer', 'THE FORGE', "Hammerstein's the name, hammerin's the game! Whaddaya need, kid?", forgeGoods);
        } else if (d.id === 'apoth') {
          U.openStore('fizz', 'APOTHECARY', "Dr. Fizzwater's tonics! Cures what ails ya, and a few things that don't!", apothGoods);
        } else if (d.id === 'pictures') {
          openReelSelect();
        } else if (d.id === 'folk') {
          d.f.wait = 4;
          d.f.moving = false;
          U.say([{ who: d.f.spec, name: d.f.spec.name, text: d.f.hint }]);
        }
      },
      draw() {
        const c = G.ctx;
        const ph = s.phase;
        if (!this.bg[ph]) this.bg[ph] = paintTown(ph);
        c.drawImage(this.bg[ph], 0, 0, G.W, G.H);
        // live details: chimney smoke, marquee, windows
        K.seed(500);
        for (let i = 0; i < 4; i++) {
          const k = (this.t * 0.4 + i / 4) % 1;
          c.save();
          c.globalAlpha = 0.7 * (1 - k);
          K.blob(497 + Math.sin(k * 6 + i) * 10, 40 - k * 80, 10 + k * 16, 8 + k * 12, '#9c928a', { lw: 2 });
          c.restore();
        }
        G.paintMarquee(760, 150, 160, 46, this.t);
        K.text('NOW SHOWING', 840, 166, 11, { font: K.F.deco, fill: C.gold, lw: 0, shadow: false });
        K.text('THE LOST REELS', 840, 183, 13, { font: K.F.shout, fill: C.cream, lw: 3 });
        // fountain
        K.seed(520);
        K.blob(480, 440, 70, 30, '#9aa3a8', { lw: 3.5 });
        K.blob(480, 436, 58, 22, '#6fb0c8', { lw: 2.5 });
        K.rrect(472, 380, 16, 56, 4, '#9aa3a8', { lw: 3 });
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + this.t;
          K.blob(480 + Math.cos(a) * 24, 420 + Math.sin(this.t * 6 + i) * 4, 3, 5, '#cfe8f0', { lw: 1.5 });
        }
        K.blob(480, 376, 12, 10, '#6fb0c8', { lw: 2 });
        // lamp posts
        [310, 730].forEach((x, i) => {
          K.seed(530 + i);
          K.line([[x, 300], [x, 220]], 5, K.INK);
          K.rrect(x - 10, 202, 20, 22, 4, ph === 'morning' ? '#e8e0c0' : '#ffe39a', { lw: 3 });
          if (ph !== 'morning') K.wash(x, 214, 70, 70, 'rgba(255,220,130,0.5)');
        });
        // entities sorted by y
        const ents = this.folks.map((f) => ({ y: f.y, d: () => CH.toon(f.x, f.y, f.spec, { moving: f.moving, phase: f.phase, fx: f.tx > f.x ? 1 : -1, seed: f.spec.name.length, talk: U.dialog && this.near && this.near.f === f }) }));
        ents.push({ y: this.pl.y, d: () => this.pl.draw() });
        ents.sort((a, b) => a.y - b.y).forEach((e) => e.d());
        if (ph === 'night') {
          c.save();
          c.globalCompositeOperation = 'multiply';
          c.fillStyle = '#6a70a8';
          c.fillRect(0, 0, G.W, G.H);
          c.restore();
          [310, 730].forEach((x) => K.wash(x, 214, 90, 90, 'rgba(255,220,130,0.35)'));
          K.wash(840, 170, 140, 60, 'rgba(255,230,150,0.3)');
        } else if (ph === 'evening') {
          c.save();
          c.globalCompositeOperation = 'multiply';
          c.fillStyle = '#f0c8a8';
          c.fillRect(0, 0, G.W, G.H);
          c.restore();
        }
        if (this.near && !U.blocking()) U.prompt(this.near.x, this.near.y - 70, 'E', this.near.label);
        // clock card
        c.save();
        c.translate(G.W - 110, 36);
        c.rotate(0.03);
        K.seed(540);
        K.rrect(-90, -22, 180, 44, 6, C.cream, { lw: 3 });
        K.text('DAY ' + s.day + ' · ' + ph.toUpperCase(), 0, 1, 16, { font: K.F.shout, fill: K.INK, lw: 0, shadow: false });
        c.restore();
        K.seed(541);
        K.coin(34, 32, 13);
        K.text(String(s.gold), 56, 33, 24, { align: 'left', fill: C.gold });
      },
    };
    return S;
  };

  const DOORS = [
    { id: 'shop', x: 225, y: 300, label: 'EMPORIUM' },
    { id: 'forge', x: 430, y: 300, label: 'THE FORGE' },
    { id: 'apoth', x: 671, y: 300, label: 'APOTHECARY' },
    { id: 'pictures', x: 840, y: 300, label: 'LOST REELS' },
  ];

  // ---------- reel select ----------
  function openReelSelect() {
    const s = G.state;
    A.sfx('door');
    const unlocked = (i) => i === 0 || (i < 3 ? s.cleared[i - 1] : s.cleared[0] && s.cleared[1] && s.cleared[2]);
    const P = {
      t: 0,
      sel: Math.max(0, [0, 1, 2, 3].filter(unlocked).pop()),
      update(dt) {
        this.t += dt;
        if (I.hit('left')) {
          this.sel = (this.sel + 3) % 4;
          A.sfx('select');
        }
        if (I.hit('right')) {
          this.sel = (this.sel + 1) % 4;
          A.sfx('select');
        }
        (this.rects || []).forEach((r, k) => {
          const m = I.mouse;
          if (m.x > r[0] && m.x < r[0] + r[2] && m.y > r[1] && m.y < r[1] + r[3]) {
            if (G.t - m.lastMove < 0.05) this.sel = k;
            if (m.pressed) {
              if (this.sel === k) this.go();
              this.sel = k;
            }
          }
        });
        if (I.hit('confirm')) this.go();
        if (I.hit('back')) {
          A.sfx('back');
          U.panel = null;
        }
      },
      go() {
        if (!unlocked(this.sel)) {
          A.sfx('angry');
          U.toastMsg('That reel is chained shut!', C.red);
          return;
        }
        if (G.state.bag.length >= G.items.BAG_SIZE) {
          U.toastMsg('Your bag is full! Stash loot in the chest first.', C.red);
          A.sfx('back');
          return;
        }
        A.sfx('confirm');
        U.panel = null;
        const reel = this.sel;
        const enter = () => G.go(() => G.scenes.dungeon(reel), { dur: 0.6 });
        if (reel === 3 && !s.seen.finalDoor) {
          s.seen.finalDoor = true;
          G.go(() => G.scenes.cutscene('finaldoor', enter));
        } else enter();
      },
      draw() {
        const c = G.ctx;
        c.fillStyle = 'rgba(20,10,5,0.65)';
        c.fillRect(0, 0, G.W, G.H);
        const pop = G.easeBack(Math.min(1, this.t * 5));
        c.save();
        c.translate(G.W / 2, G.H / 2);
        c.scale(pop, pop);
        c.translate(-G.W / 2, -G.H / 2);
        U.board(50, 50, 860, 440, 'THE LOST REELS');
        this.rects = [];
        G.REELS.forEach((R, i) => {
          const x = 90 + i * 205,
            y = 110;
          const on = i === this.sel;
          const open = unlocked(i);
          this.rects.push([x, y, 180, 330]);
          K.seed(600 + i);
          c.save();
          c.translate(x + 90, y + 120);
          if (on) c.rotate(Math.sin(this.t * 4) * 0.03);
          c.scale(on ? 1.06 : 1, on ? 1.06 : 1);
          // film canister
          K.blob(0, 0, 76, 76, open ? R.color : '#7a7068', { lw: on ? 4.5 : 3, stroke: on ? C.red : K.INK, hl: true });
          K.blob(0, 0, 56, 56, null, { lw: 2 });
          for (let k = 0; k < 6; k++) {
            const a = (k / 6) * Math.PI * 2 + (on ? this.t : 0);
            K.blob(Math.cos(a) * 34, Math.sin(a) * 34, 11, 11, '#2c2522', { lw: 2 });
          }
          K.blob(0, 0, 12, 12, C.cream, { lw: 2.5 });
          if (!open) {
            K.line([[-70, -40], [70, 40]], 8, '#4a4a4f');
            K.line([[-70, 40], [70, -40]], 8, '#4a4a4f');
            K.rrect(-16, -8, 32, 28, 4, '#8a8a90', { lw: 3 });
          }
          if (s.cleared[i]) K.star(56, -56, 18, C.gold, 5, 0.2);
          c.restore();
          K.text('REEL ' + (i + 1), x + 90, y + 230, 18, { fill: on ? C.red : C.cream, lw: 3.5 });
          const lines = K.wrap(R.name, 170, 15, K.F.deco);
          lines.forEach((l, k) => K.text(l, x + 90, y + 258 + k * 18, 15, { font: K.F.deco, fill: K.INK, lw: 0, shadow: false }));
          K.para(open ? (s.cleared[i] ? 'Cleared! Loot still lurks.' : 'Boss: ' + R.boss) : 'Locked', x + 90, y + 296, 170, 12, { align: 'center', fill: C.dbrown });
        });
        K.text('LEFT/RIGHT choose   E roll film   ESC back', G.W / 2, 470, 14, { font: K.F.deco, fill: K.INK, lw: 0, shadow: false });
        c.restore();
      },
    };
    U.panel = P;
  }
})();
