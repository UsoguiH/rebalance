// Storybook cutscenes: an open book whose pages flip, each with a painted
// illustration and typewritten narration. Plus the end credits.
(function () {
  const K = G.ink,
    C = K.C,
    I = G.input,
    A = G.audio,
    CH = G.chars,
    F = G.fx;
  G.scenes = G.scenes || {};

  const PX = 140,
    PY = 58,
    PW = 680,
    PH = 282; // illustration panel
  const cache = {};
  const bg = (name) => {
    if (!cache[name]) {
      if (name === 'town') cache[name] = G.paintTownBg('evening');
      else if (name === 'townDay') cache[name] = G.paintTownBg('morning');
      else if (name === 'shop') cache[name] = G.paintShopBg();
    }
    return cache[name];
  };
  const blit = (name, sx, sy, sw, sh) => G.ctx.drawImage(bg(name), sx * 2, sy * 2, sw * 2, sh * 2, 0, 0, PW, PH);

  // ---------- illustration helpers ----------
  const dark = (col = '#241a2e') => {
    const c = G.ctx;
    const g = c.createRadialGradient(PW / 2, PH / 2, 20, PW / 2, PH / 2, PW * 0.7);
    g.addColorStop(0, K.mix(col, '#ffffff', 0.15));
    g.addColorStop(1, col);
    c.fillStyle = g;
    c.fillRect(0, 0, PW, PH);
  };
  const spotlight = (x, col = 'rgba(255,240,190,0.28)') => {
    const c = G.ctx;
    c.fillStyle = col;
    c.beginPath();
    c.moveTo(x - 30, 0);
    c.lineTo(x + 30, 0);
    c.lineTo(x + 150, PH);
    c.lineTo(x - 150, PH);
    c.fill();
  };
  const reelDoor = (x, y, r, col, glow, t) => {
    if (glow) K.wash(x, y, r * 1.8, r * 1.8, glow, 0.8);
    K.blob(x, y, r, r, col, { lw: 3.5, hl: true });
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + t * 0.6;
      K.blob(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, r * 0.16, r * 0.16, '#2c2522', { lw: 2 });
    }
    K.blob(x, y, r * 0.18, r * 0.18, C.cream, { lw: 2 });
  };

  const SCRIPTS = {
    intro: [
      {
        text: 'Once upon a time, in the jolly town of Flickerton, folks loved two things more than anything: a good bargain, and a good picture show.',
        art(t) {
          blit('town', 120, 0, 840, 348);
          K.seed(1);
          CH.toon(200, 262, CH.customers[0], { scale: 1.1, moving: true, phase: t * 8, fx: 1, seed: 2 });
          CH.toon(520, 270, CH.customers[1], { scale: 1.1, moving: true, phase: t * 8 + 1, fx: -1, seed: 3 });
          CH.toon(600, 262, CH.customers[5], { scale: 1, moving: true, phase: t * 8 + 2, fx: -1, seed: 4 });
        },
      },
      {
        text: 'Young Wick kept the Flicker Emporium with his Granny Tallow. Grandpa Tallow had been a cartoonist, and drew the finest pictures the town had ever seen.',
        art(t) {
          blit('shop', 150, 0, 720, 300);
          CH.wick(250, 260, { scale: 1.6, pose: 'wave', mood: 'grin', fx: 0.4, seed: 5 });
          CH.toon(430, 262, CH.cast.granny, { scale: 1.6, talk: true, seed: 6 });
        },
      },
      {
        text: "But times were lean. The shelves stood empty, and one gloomy morning in walked Mr. Sprocket, the Projectionist, who owned the Picture House and half of Flickerton besides.",
        art(t) {
          dark('#2a1f33');
          spotlight(420);
          CH.toon(420, 272, CH.cast.sprocket, { scale: 1.9, fx: -1, mood: 'angry', seed: 7 });
          K.wash(445, 128, 60, 40, 'rgba(255,245,200,0.8)');
          CH.wick(170, 270, { scale: 1.3, mood: 'o', pose: 'shrug', fx: 1, seed: 8 });
        },
      },
      {
        text: "\"Your Grandpa's reels belong to ME now,\" he sneered. \"And if this dusty shop can't pay its rent, it'll belong to me too!\"",
        art(t) {
          blit('shop', 150, 0, 720, 300);
          G.ctx.fillStyle = 'rgba(40,20,50,0.35)';
          G.ctx.fillRect(0, 0, PW, PH);
          CH.toon(470, 272, CH.cast.sprocket, { scale: 1.8, fx: -1, talk: true, seed: 9 });
          // the rent notice
          G.ctx.save();
          G.ctx.translate(360, 120);
          G.ctx.rotate(-0.15 + Math.sin(t * 3) * 0.05);
          K.seed(10);
          K.rrect(-50, -34, 100, 68, 4, C.cream, { lw: 3 });
          K.text('RENT', 0, -10, 20, { fill: C.red, lw: 3 });
          K.text('DUE!', 0, 14, 20, { fill: C.red, lw: 3 });
          G.ctx.restore();
          CH.toon(180, 268, CH.cast.granny, { scale: 1.5, mood: 'meh', seed: 11 });
          CH.wick(250, 270, { scale: 1.4, mood: 'sad', fx: 1, seed: 12 });
        },
      },
      {
        text: "That night, Wick crept into the Picture House basement. There he found Grandpa's Lost Reels... and the cartoons inside them were very much alive!",
        art(t) {
          dark('#151020');
          ['#d9b27c', '#d65a4a', '#6f8fae', '#6b4f7d'].forEach((col, i) => reelDoor(120 + i * 145, 120, 52, col, i < 3 ? 'rgba(255,230,150,0.5)' : 'rgba(150,100,200,0.4)', t));
          CH.wick(340, 270, { scale: 1.3, mood: 'o', fx: 0, fy: -1, seed: 13 });
          K.wash(340, 190, 140, 90, 'rgba(255,200,110,0.35)');
          // a kettle peeks out of reel one
          K.seed(14);
          K.pieEye(112, 116, 6, 9, 0.5, 0.3, 0);
          K.pieEye(128, 116, 6, 9, 0.5, 0.3, 0);
        },
      },
      {
        text: "\"Those reels are dangerous, dearie,\" said Granny. \"But the curios inside are worth a fortune! Delve by night, sell by day, and we'll save the Emporium yet!\"",
        art(t) {
          dark('#5a3a2a');
          spotlight(PW / 2, 'rgba(255,240,190,0.35)');
          G.paintMarquee(150, 22, 380, 90, t);
          K.text('WICK', PW / 2, 56, 40, { fill: C.cream, wave: 2 });
          K.text('& THE LOST REELS', PW / 2, 92, 18, { font: K.F.deco, fill: C.gold, lw: 3 });
          CH.wick(PW / 2, 272, { scale: 1.6, pose: 'cheer', mood: 'grin', fx: 0.2, seed: 15 });
          CH.toon(PW / 2 + 170, 272, CH.cast.granny, { scale: 1.4, talk: true, seed: 16 });
        },
      },
    ],
    boss1: [
      {
        text: 'Wick came home with the Golden Whistle and a bag stuffed with treasures from the Pantry Picture. The Emporium was humming again!',
        art(t) {
          blit('shop', 150, 0, 720, 300);
          CH.wick(300, 266, { scale: 1.6, pose: 'cheer', mood: 'grin', seed: 17 });
          K.seed(18);
          G.items.icon('saucer', 300, 90 + Math.sin(t * 3) * 6, 2);
          CH.toon(470, 268, CH.customers[2], { scale: 1.3, mood: 'ecstatic', seed: 19 });
          CH.toon(560, 266, CH.customers[3], { scale: 1.3, mood: 'happy', seed: 20 });
        },
      },
      {
        text: "But high in his booth, Mr. Sprocket watched through his lens. \"That little candle is poking around MY reels,\" he growled. \"Somebody ought to snuff him out.\"",
        art(t) {
          dark('#1c1426');
          K.seed(21);
          K.rrect(60, 30, 200, 130, 10, '#3a2c48', { lw: 3.5 });
          CH.toon(400, 272, CH.cast.sprocket, { scale: 1.8, fx: -1, mood: 'angry', seed: 22 });
          G.ctx.save();
          G.ctx.globalAlpha = 0.5;
          G.ctx.fillStyle = '#fff4c0';
          G.ctx.beginPath();
          G.ctx.moveTo(420, 130);
          G.ctx.lineTo(80, 60);
          G.ctx.lineTo(80, 150);
          G.ctx.fill();
          G.ctx.restore();
          CH.wick(160, 140, { scale: 0.8, mood: 'grin', seed: 23 });
        },
      },
    ],
    boss2: [
      {
        text: "In the confetti left behind by Jangles, Wick found the Jester's Key... and a faded sketch signed by Grandpa Tallow himself.",
        art(t) {
          dark('#6a3a3a');
          spotlight(PW / 2);
          CH.wick(260, 270, { scale: 1.6, mood: 'o', aim: -0.4, seed: 24 });
          G.ctx.save();
          G.ctx.translate(420, 120);
          G.ctx.rotate(0.1 + Math.sin(t * 2) * 0.04);
          K.seed(25);
          K.rrect(-70, -55, 140, 110, 3, '#efe0bd', { lw: 3 });
          CH.toon(0, 40, { body: 'granny', color: C.purple }, { scale: 0.7, seed: 26 });
          K.para('love, Grandpa T.', -60, 38, 130, 11);
          G.ctx.restore();
          for (let i = 0; i < 20; i++) K.star((i * 53) % PW, (i * 97 + t * 40) % PH, 4, [C.yellow, C.pink, C.blue][i % 3], 4, i);
        },
      },
      {
        text: "\"Your Grandpa drew those reels to make folks laugh,\" Granny sighed. \"Sprocket stole them from his studio and locked the laughter away. That's why the town's gone so grey.\"",
        art(t) {
          blit('shop', 150, 0, 720, 300);
          G.ctx.fillStyle = 'rgba(40,30,60,0.3)';
          G.ctx.fillRect(0, 0, PW, PH);
          CH.toon(300, 268, CH.cast.granny, { scale: 1.8, talk: true, seed: 27 });
          CH.wick(460, 268, { scale: 1.5, mood: 'sad', fx: -1, seed: 28 });
        },
      },
    ],
    boss3: [
      {
        text: 'With the Pendulum Weight in hand, Wick held all three keys. Deep beneath the Picture House, a fourth door creaked open with a sinister flicker.',
        art(t) {
          dark('#120c1a');
          reelDoor(PW / 2, 120, 80, '#6b4f7d', 'rgba(170,110,220,0.5)', t);
          ['Whistle', 'Key', 'Weight'].forEach((k, i) => {
            const a = t + (i / 3) * Math.PI * 2;
            K.seed(29 + i);
            K.star(PW / 2 + Math.cos(a) * 140, 120 + Math.sin(a) * 50, 14, C.gold, 5, a);
          });
          CH.wick(PW / 2, 276, { scale: 1.3, mood: 'o', fy: -1, fx: 0, seed: 32 });
        },
      },
      {
        text: 'Behind it flickered a reel no one had ever seen: THE FINAL CUT. And up on its silver screen, Mr. Sprocket was waiting.',
        art(t) {
          dark('#0d0a12');
          K.seed(33);
          K.rrect(110, 20, 460, 220, 6, '#dcd6c8', { lw: 4 });
          G.ctx.save();
          G.ctx.globalAlpha = 0.85;
          CH.toon(340, 236, Object.assign({}, CH.cast.sprocket), { scale: 1.6, talk: true, seed: 34 });
          G.ctx.restore();
        },
      },
    ],
    finaldoor: [
      {
        text: "\"So! The little candle wants a starring role?\" boomed Mr. Sprocket. \"Very well. Welcome to MY picture, where the show never, ever ends!\"",
        art(t) {
          dark('#2a1030');
          spotlight(PW / 2, 'rgba(255,220,240,0.3)');
          CH.toon(PW / 2, 276, CH.cast.sprocket, { scale: 2, talk: true, mood: 'angry', seed: 35 });
          for (let i = 0; i < 6; i++) K.star(60 + i * 110, 40 + (i % 2) * 30, 10, C.gold, 5, t + i);
        },
      },
    ],
    ending: [
      {
        text: "With a crack and a fizzle, Mr. Sprocket's projector-head went dark. All the laughter he'd bottled up burst out across Flickerton like fireworks!",
        art(t) {
          dark('#2a1f40');
          for (let i = 0; i < 26; i++) {
            const a = (i / 26) * Math.PI * 2;
            const r = 60 + ((t * 120 + i * 17) % 260);
            K.seed(40 + i);
            K.star(PW / 2 + Math.cos(a) * r, 140 + Math.sin(a) * r * 0.6, 8, [C.yellow, C.pink, C.cream, C.sky][i % 4], 5, t * 3 + i);
          }
          CH.toon(PW / 2, 276, CH.cast.sprocket, { scale: 1.6, mood: 'meh', seed: 41 });
          F.smoke && K.blob(PW / 2 - 10, 60 - ((t * 20) % 30), 16, 12, '#8a8a90', { lw: 2 });
        },
      },
      {
        text: "Grandpa's cartoons were free at last, and every one of them came shopping at the Flicker Emporium, the swellest store in all of Flickerton.",
        art(t) {
          blit('shop', 150, 0, 720, 300);
          CH.wick(250, 268, { scale: 1.5, pose: 'cheer', mood: 'grin', seed: 42 });
          CH.toon(150, 268, CH.cast.granny, { scale: 1.4, mood: 'ecstatic', seed: 43 });
          [0, 1, 2, 4, 5].forEach((k, i) => CH.toon(360 + i * 70, 262 + (i % 2) * 10, CH.customers[k], { scale: 1.1, mood: 'ecstatic', seed: 44 + i }));
        },
      },
      {
        text: 'And Mr. Sprocket? He found honest work at last, running the projector for free Saturday matinees. Folks say that sometimes, just sometimes, he even smiles.',
        art(t) {
          dark('#3a2a48');
          spotlight(420, 'rgba(255,240,200,0.35)');
          CH.toon(200, 272, CH.cast.sprocket, { scale: 1.6, mood: 'happy', fx: 1, seed: 50 });
          K.seed(51);
          K.rrect(360, 40, 280, 160, 6, '#efe7d5', { lw: 3.5 });
          CH.wick(500, 190, { scale: 0.9, pose: 'wave', seed: 52 });
          K.wash(230, 140, 60, 40, 'rgba(255,245,200,0.7)');
        },
      },
      {
        end: true,
        text: '',
        art(t) {
          dark('#1d1510');
          G.paintMarquee(140, 60, 400, 160, t);
          K.text('THE END', PW / 2, 140, 64, { fill: C.cream, wave: 3 });
        },
      },
    ],
  };

  G.scenes.cutscene = (name, done) => {
    const pages = SCRIPTS[name];
    const S = {
      i: 0,
      t: 0,
      chars: 0,
      flip: null,
      skipHold: 0,
      enter() {
        A.play(name === 'finaldoor' ? 'final' : name === 'ending' ? 'victory' : 'story');
      },
      update(dt) {
        this.t += dt;
        if (I.down['Escape']) {
          this.skipHold += dt;
          if (this.skipHold > 0.8) return this.finish();
        } else this.skipHold = 0;
        if (this.flip) {
          this.flip.t += dt / 0.5;
          if (this.flip.t >= 0.5 && !this.flip.swapped) {
            this.flip.swapped = true;
            this.i++;
            this.chars = 0;
            this.t = 0;
          }
          if (this.flip.t >= 1) this.flip = null;
          return;
        }
        const pg = pages[this.i];
        const prev = Math.floor(this.chars);
        this.chars += dt * 38;
        if (Math.floor(this.chars) > prev && Math.floor(this.chars) % 3 === 0 && this.chars < pg.text.length) A.sfx('type');
        if (I.hit('confirm') || I.hit('interact') || I.mouse.pressed) {
          if (this.chars < pg.text.length) this.chars = pg.text.length;
          else if (this.i < pages.length - 1) {
            this.flip = { t: 0 };
            A.sfx('dodge');
          } else this.finish();
        }
        if (pg.end && this.t > 3) this.finish();
      },
      finish() {
        if (this.done) return;
        this.done = true;
        done && done();
      },
      draw() {
        const c = G.ctx;
        // table
        c.fillStyle = '#3a2418';
        c.fillRect(0, 0, G.W, G.H);
        for (let y = 0; y < G.H; y += 60) K.line([[0, y], [G.W, y + 8]], 1.5, 'rgba(0,0,0,0.25)');
        // book cover
        K.seed(2);
        K.rrect(96, 26, 768, 492, 16, '#7d1a17', { lw: 4 });
        K.rrect(106, 36, 748, 472, 12, null, { lw: 2, stroke: C.gold });
        // page (with flip squash anchored at the spine on the left)
        let sx = 1;
        if (this.flip) sx = this.flip.t < 0.5 ? 1 - this.flip.t * 2 : (this.flip.t - 0.5) * 2;
        c.save();
        c.translate(118, 0);
        c.scale(Math.max(0.001, sx), 1);
        c.translate(-118, 0);
        K.rrect(118, 44, 724, 456, 6, '#f4e6c6', { lw: 3 });
        const pg = pages[this.i];
        c.save();
        c.beginPath();
        c.rect(PX, PY, PW, PH);
        c.clip();
        c.translate(PX, PY);
        pg.art(this.t);
        c.restore();
        K.seed(3);
        K.rrect(PX, PY, PW, PH, 4, null, { lw: 4 });
        // drop cap + typewriter
        if (pg.text) {
          const shown = pg.text.slice(0, Math.floor(this.chars));
          K.text(pg.text[0], PX + 18, 372, 44, { font: K.F.deco, fill: C.red, lw: 0, shadow: false });
          K.para(shown.slice(1), PX + 44, 356, PW - 60, 19, { lh: 1.4 });
          if (this.chars >= pg.text.length && !this.flip) {
            const b = Math.floor(G.animT * 4) % 2 * 3;
            K.shape([[PX + PW - 20, 474 + b], [PX + PW - 4, 482 + b], [PX + PW - 20, 490 + b]], C.red, { lw: 2 });
          }
        }
        K.text(String(this.i + 1), G.W / 2, 490, 12, { font: K.F.type, fill: C.dbrown, lw: 0, shadow: false });
        c.restore();
        // spine shadow
        const g = c.createLinearGradient(118, 0, 150, 0);
        g.addColorStop(0, 'rgba(0,0,0,0.35)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = g;
        c.fillRect(118, 44, 32, 456);
        K.text('HOLD ESC TO SKIP', G.W - 20, 530, 11, { align: 'right', font: K.F.deco, fill: C.cream, lw: 0, shadow: false, alpha: 0.6 });
        if (this.skipHold > 0) {
          c.fillStyle = C.red;
          c.fillRect(G.W - 140, 520, 120 * Math.min(1, this.skipHold / 0.8), 3);
        }
      },
    };
    return S;
  };

  // ---------- credits ----------
  G.scenes.credits = () => ({
    t: 0,
    enter() {
      A.play('title');
    },
    update(dt) {
      this.t += dt;
      if (this.t > 2 && (I.anyPressed || I.mouse.pressed)) G.go(() => G.scenes.town('pictures'));
    },
    draw() {
      const c = G.ctx;
      c.fillStyle = K.INK;
      c.fillRect(0, 0, G.W, G.H);
      const lines = [
        ['WICK & THE LOST REELS', 40, C.cream],
        ['', 20],
        ['STARRING', 18, C.gold],
        ['Wick  ·  Granny Tallow  ·  Hammerstein  ·  Dr. Fizzwater', 18, C.cream],
        ['and Mr. Sprocket as The Projectionist', 18, C.cream],
        ['', 20],
        ['WITH', 18, C.gold],
        ["Boilin' Bartholomew  ·  Jangles the Jack  ·  Grandfather Tock", 18, C.cream],
        ['', 20],
        ['MUSIC', 18, C.gold],
        ['A tiny synthesized jazz band, live every frame', 18, C.cream],
        ['', 20],
        ['ANIMATION', 18, C.gold],
        ['Hand-inked lines, boiled at ten frames a second', 18, C.cream],
        ['', 20],
        ['THANKS FOR WATCHING!', 30, C.red],
        ['The Emporium is still open. Keep selling, keep delving.', 16, C.cream],
      ];
      const scroll = Math.min(this.t * 45, 560 + (lines.length - 1) * 34 - 440);
      lines.forEach((l, i) => {
        if (!l[0]) return;
        K.text(l[0], G.W / 2, 560 - scroll + i * 34, l[1], { font: l[1] >= 30 ? K.F.shout : K.F.deco, fill: l[2], lw: l[1] >= 30 ? 5 : 0, shadow: l[1] >= 30 });
      });
      CH.wick(120, 500, { scale: 1.3, pose: Math.floor(this.t * 2) % 2 ? 'cheer' : 'wave', seed: 60 });
      CH.toon(840, 500, CH.cast.granny, { scale: 1.3, moving: true, phase: this.t * 8, seed: 61 });
      if (this.t > 2 && Math.floor(G.t * 2) % 2) K.text('PRESS ANY KEY', G.W / 2, 520, 14, { fill: C.cream, lw: 3 });
    },
  });
})();
