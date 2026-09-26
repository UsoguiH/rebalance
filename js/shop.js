// The Flicker Emporium: display curios, set prices, read customer faces,
// ring them up at the register. Also Wick's bed (sleep to start a new day).
(function () {
  const K = G.ink,
    C = K.C,
    I = G.input,
    A = G.audio,
    U = G.ui,
    CH = G.chars,
    F = G.fx;
  G.scenes = G.scenes || {};

  const SHELVES = [
    { x: 470, y: 275 },
    { x: 640, y: 275 },
    { x: 470, y: 405 },
    { x: 640, y: 405 },
  ];
  const DOOR = { x: 480, y: 515 };
  const COUNTER = { x: 70, y: 262, w: 200, h: 44 };
  const QUEUE = { x: 200, y: 345 };
  const CHEST = { x: 60, y: 160, w: 70, h: 44 };
  const BED = { x: 810, y: 150, w: 120, h: 70 };
  const GRANNY = { x: 330, y: 200 };
  const SIGN = { x: 590, y: 505 };

  function paintShop() {
    return G.paintTo((c) => {
      // wallpaper
      c.fillStyle = '#7e2f2a';
      c.fillRect(0, 0, G.W, 160);
      for (let x = 0; x < G.W; x += 40) {
        c.fillStyle = 'rgba(255,230,190,0.12)';
        c.fillRect(x, 0, 18, 160);
      }
      K.line([[0, 160], [G.W, 160]], 4);
      c.fillStyle = '#5b2b22';
      c.fillRect(0, 140, G.W, 20);
      // floorboards
      c.fillStyle = '#b98457';
      c.fillRect(0, 160, G.W, 380);
      for (let y = 160; y < G.H; y += 30) {
        K.line([[0, y], [G.W, y]], 1.6, 'rgba(70,35,15,0.45)');
        for (let x = ((y / 30) % 3) * 70; x < G.W; x += 210) K.line([[x, y], [x, y + 30]], 1.4, 'rgba(70,35,15,0.4)');
      }
      // rug
      K.seed(700);
      K.rrect(400, 230, 330, 230, 20, '#3f6a8a', { lw: 3 });
      K.rrect(414, 244, 302, 202, 14, null, { lw: 2, stroke: C.gold });
      // window with Flickerton street view
      K.rrect(400, 20, 160, 100, 6, '#bfe0e6', { lw: 3.5 });
      K.wash(480, 90, 90, 40, '#8fb48a');
      K.line([[480, 20], [480, 120]], 3);
      K.line([[400, 70], [560, 70]], 3);
      // wall shelves with jars
      [[140, 70], [640, 70]].forEach(([x, y], i) => {
        K.rrect(x, y + 30, 180, 10, 2, '#5b3a26', { lw: 2.5 });
        for (let k = 0; k < 5; k++) K.rrect(x + 10 + k * 34, y + 2 + (k % 2) * 6, 22, 28 - (k % 2) * 6, 5, ['#e8b04a', '#6fb0d8', '#e85a74', '#9ccf8a', '#c9a0e0'][(k + i) % 5], { lw: 2 });
      });
      // grandpa's portrait (he drew the reels)
      K.rrect(310, 18, 64, 80, 4, C.gold, { lw: 3 });
      K.rrect(318, 26, 48, 64, 3, '#e9d8ae', { lw: 2 });
      K.seed(701);
      K.rrect(332, 46, 20, 34, 6, C.cream, { lw: 2 });
      K.pieEye(338, 56, 2.5, 4, 0, 0, 0);
      K.pieEye(346, 56, 2.5, 4, 0, 0, 0);
      K.shape([[334, 64], [350, 64], [342, 70]], C.white, { lw: 1.5 });
      K.line([[342, 46], [342, 40]], 2);
      // wall clock
      K.blob(600, 44, 22, 22, C.cream, { lw: 3 });
      K.line([[600, 44], [600, 30]], 2.5);
      K.line([[600, 44], [610, 48]], 2.5);
      // counter
      K.rrect(COUNTER.x, COUNTER.y - 26, COUNTER.w, COUNTER.h + 26, 6, '#7a4a2e', { lw: 3.5 });
      K.rrect(COUNTER.x - 6, COUNTER.y - 34, COUNTER.w + 12, 16, 4, '#a4683f', { lw: 3 });
      // chest
      K.rrect(CHEST.x, CHEST.y, CHEST.w, CHEST.h, 6, '#8a5a3b', { lw: 3.5 });
      K.rrect(CHEST.x - 3, CHEST.y - 8, CHEST.w + 6, 18, 8, '#a06a44', { lw: 3 });
      K.rrect(CHEST.x + 28, CHEST.y + 4, 14, 14, 2, C.gold, { lw: 2 });
      // bed
      K.rrect(BED.x, BED.y, BED.w, BED.h, 8, '#6a3c24', { lw: 3.5 });
      K.rrect(BED.x + 6, BED.y + 6, BED.w - 12, BED.h - 12, 6, '#d65a4a', { lw: 2.5 });
      for (let i = 0; i < 4; i++) K.line([[BED.x + 30 + i * 22, BED.y + 8], [BED.x + 30 + i * 22, BED.y + BED.h - 8]], 1.5, 'rgba(255,240,220,0.6)');
      K.rrect(BED.x + 8, BED.y + 8, 30, BED.h - 16, 8, C.cream, { lw: 2.2 });
      // doormat
      K.rrect(DOOR.x - 50, 500, 100, 40, 6, '#8a6a3a', { lw: 2.5 });
    });
  }

  G.paintShopBg = paintShop;

  G.scenes.shop = () => {
    const s = G.state;
    const S = {
      t: 0,
      bg: null,
      pl: null,
      open: false,
      customers: [],
      visitors: 0,
      earned: 0,
      soldList: [],
      card: null,
      irisAt: { x: DOOR.x, y: DOOR.y - 40 },
      enter() {
        this.bg = paintShop();
        this.pl = new G.Player(DOOR.x, 470, false);
        this.pl.fy = -1;
        this.world = {
          bounds: { x0: 20, y0: 170, x1: 940, y1: 530 },
          solids: [
            ...SHELVES.map((p) => ({ x: p.x, y: p.y, r: 30 })),
            { x: COUNTER.x, y: COUNTER.y - 20, w: COUNTER.w, h: COUNTER.h + 20 },
            { x: CHEST.x, y: CHEST.y - 10, w: CHEST.w, h: CHEST.h + 10 },
            { x: BED.x, y: BED.y - 10, w: BED.w, h: BED.h + 10 },
            { x: GRANNY.x, y: GRANNY.y, r: 24 },
          ],
        };
        A.play('shop');
        if (!s.seen.shopIntro) {
          s.seen.shopIntro = true;
          U.say([
            { who: 'granny', text: "Welcome home, dearie! Let's get this old Emporium hoppin' again." },
            { who: 'granny', text: "Our chest has a few curios in it. Put 'em out on the display tables and set a price." },
            { who: 'granny', text: "Then flip the sign by the door to OPEN. Watch the customers' faces when they see a price!" },
            { who: 'granny', text: "A heart means you went too cheap. A coin means just right. A sweat drop means pricey. A storm cloud means they'll walk!" },
            { who: 'granny', text: 'I write every reaction down in my ledger, so you can find the sweet spot. Now scoot!' },
          ]);
        }
      },
      update(dt) {
        this.t += dt;
        const pl = this.pl;
        if (this.card) {
          this.card.t += dt;
          if (this.card.t > 0.8 && (I.hit('confirm') || I.mouse.pressed)) {
            const done = this.card.done;
            this.card = null;
            done && done();
          }
          return;
        }
        pl.update(dt, this.world);
        if (this.open) this.runShop(dt);
        // what's nearby?
        this.near = null;
        const opts = [];
        SHELVES.forEach((p, i) => opts.push({ id: 'shelf', i, x: p.x, y: p.y + 20, label: s.shelves[i] ? 'PRICE' : 'DISPLAY', r: 58 }));
        opts.push({ id: 'register', x: COUNTER.x + 150, y: COUNTER.y + 60, label: 'RING UP', r: 60 });
        opts.push({ id: 'chest', x: CHEST.x + 35, y: CHEST.y + 50, label: 'CHEST', r: 50 });
        opts.push({ id: 'bed', x: BED.x + 60, y: BED.y + 90, label: 'SLEEP', r: 60 });
        opts.push({ id: 'granny', x: GRANNY.x, y: GRANNY.y + 30, label: 'TALK', r: 50 });
        opts.push({ id: 'sign', x: SIGN.x, y: SIGN.y - 10, label: this.open ? 'CLOSE SHOP' : 'OPEN SHOP', r: 44 });
        opts.push({ id: 'door', x: DOOR.x, y: 520, label: 'TO TOWN', r: 44 });
        let best = 1e9;
        opts.forEach((o) => {
          const d = G.dist(pl.x, pl.y, o.x, o.y);
          if (d < o.r && d < best) {
            best = d;
            this.near = o;
          }
        });
        if (this.near && this.near.id === 'register' && !this.waiting()) this.near = null;
        if (this.near && this.open && (this.near.id === 'shelf' || this.near.id === 'chest')) this.near = null;
        if (this.near && I.hit('interact')) this.use(this.near);
        if (I.hit('bag')) U.openBag(!this.open);
        if (I.hit('pause')) U.openPause(() => G.go(() => G.scenes.title()));
      },
      waiting() {
        return this.customers.find((c) => c.state === 'wait');
      },
      use(o) {
        if (o.id === 'shelf') U.openShelf(o.i);
        else if (o.id === 'chest') U.openBag(true);
        else if (o.id === 'register') this.ring();
        else if (o.id === 'granny') this.talkGranny();
        else if (o.id === 'door') {
          if (this.open) U.toastMsg('Close the shop first! (the sign)', C.red);
          else {
            A.sfx('door');
            G.save();
            G.go(() => G.scenes.town('shop'), { cx: DOOR.x, cy: DOOR.y - 30 });
          }
        } else if (o.id === 'sign') {
          if (this.open) U.confirm('Close up early for today?', () => this.closeShop());
          else this.tryOpen();
        } else if (o.id === 'bed') this.sleep();
      },
      tryOpen() {
        if (s.phase === 'night') return U.say([{ who: 'wick', text: "It's the middle of the night. Everybody's snoozin'. I should hit the hay." }]);
        if (s.shopOpenedToday) return U.say([{ who: 'wick', text: "We already had our business day. Tonight's for the Lost Reels, or bed!" }]);
        if (!s.shelves.some((x) => x)) return U.say([{ who: 'wick', text: "The tables are empty! I should put some curios on display first." }]);
        this.open = true;
        s.shopOpenedToday = true;
        this.visitors = 5 + Math.min(4, s.day - 1) + s.cleared.filter((x) => x).length * 2;
        this.spawnT = 1.5;
        this.earned = 0;
        this.soldList = [];
        A.sfx('bell');
        U.toastMsg('WE\'RE OPEN!', C.gold);
        A.play('shop');
      },
      runShop(dt) {
        this.spawnT -= dt;
        const avail = s.shelves.some((x, i) => x && !this.customers.some((c) => c.shelf === i && c.state !== 'leave'));
        if (this.spawnT <= 0 && this.visitors > 0 && avail && this.customers.length < 4) {
          this.visitors--;
          this.spawnT = 4 + Math.random() * 4;
          const spec = CH.customers[Math.floor(Math.random() * CH.customers.length)];
          this.customers.push({ spec, x: DOOR.x, y: 540, state: 'enter', t: 0, phase: 0, seed: Math.random() * 50, r: 12, shelf: -1, emote: null, emoteT: 0, patience: 18 });
          A.sfx('bell');
        }
        this.customers.forEach((cu) => this.updCustomer(cu, dt));
        this.customers = this.customers.filter((cu) => !cu.gone);
        const empty = !s.shelves.some((x) => x);
        if (this.customers.length === 0 && (this.visitors <= 0 || empty)) this.closeShop();
      },
      walk(cu, tx, ty, dt, sp = 90) {
        const d = G.dist(cu.x, cu.y, tx, ty);
        if (d < 4) {
          cu.moving = false;
          return true;
        }
        cu.moving = true;
        cu.phase += dt * 11;
        cu.fx = tx > cu.x ? 1 : -1;
        cu.x += ((tx - cu.x) / d) * Math.min(d, sp * dt);
        cu.y += ((ty - cu.y) / d) * Math.min(d, sp * dt);
        return false;
      },
      updCustomer(cu, dt) {
        cu.t += dt;
        cu.emoteT += dt;
        switch (cu.state) {
          case 'enter': {
            const choices = s.shelves.map((x, i) => i).filter((i) => s.shelves[i] && !this.customers.some((o) => o !== cu && o.shelf === i && o.state !== 'leave'));
            if (!choices.length) {
              cu.state = 'leave';
              cu.emote = 'meh';
              cu.emoteT = 0;
              break;
            }
            cu.shelf = choices[Math.floor(Math.random() * choices.length)];
            cu.state = 'browse';
            break;
          }
          case 'browse': {
            const p = SHELVES[cu.shelf];
            if (!s.shelves[cu.shelf]) {
              cu.state = 'enter';
              break;
            }
            if (this.walk(cu, p.x + (p.x > 550 ? 44 : -44), p.y + 20, dt)) {
              cu.state = 'think';
              cu.t = 0;
              cu.emote = 'think';
              cu.emoteT = 0;
              cu.fx = p.x > cu.x ? 1 : -1;
            }
            break;
          }
          case 'think':
            if (cu.t > 1.8) {
              const sh = s.shelves[cu.shelf];
              if (!sh) {
                cu.state = 'enter';
                break;
              }
              const mood = G.items.mood(sh.id, sh.price, (Math.random() - 0.5) * 0.06);
              G.items.record(sh.id, sh.price, mood);
              cu.mood = mood;
              cu.emote = mood;
              cu.emoteT = 0;
              cu.t = 0;
              cu.state = 'react';
              A.sfx(mood === 'ecstatic' || mood === 'happy' ? 'happy' : mood);
            }
            break;
          case 'react':
            if (cu.t > 1.3) {
              const sh = s.shelves[cu.shelf];
              if (cu.mood === 'angry' || !sh) {
                cu.state = 'leave';
                cu.emote = 'angry';
                break;
              }
              cu.carry = sh.id;
              cu.deal = { id: sh.id, n: sh.n, price: sh.price };
              s.shelves[cu.shelf] = null;
              cu.state = 'queue';
              cu.emote = null;
            }
            break;
          case 'queue': {
            const idx = this.customers.filter((o) => o.state === 'queue' || o.state === 'wait').indexOf(cu);
            if (this.walk(cu, QUEUE.x + idx * 46, QUEUE.y + idx * 8, dt)) {
              if (idx === 0) {
                cu.state = 'wait';
                cu.t = 0;
                cu.emote = 'wait';
                cu.emoteT = 0;
                cu.fx = -1;
              }
            }
            break;
          }
          case 'wait':
            if (cu.t > cu.patience) this.pay(cu, true);
            break;
          case 'leave':
            if (this.walk(cu, DOOR.x, 560, dt, 110)) cu.gone = true;
            break;
        }
      },
      ring() {
        const cu = this.waiting();
        if (cu) this.pay(cu, false);
      },
      pay(cu, impatient) {
        const d = cu.deal;
        const total = d.price * d.n;
        s.gold += total;
        s.stats.sold += d.n;
        s.stats.earned += total;
        this.earned += total;
        this.soldList.push(d);
        A.sfx('register');
        F.coinBurst(COUNTER.x + 150, COUNTER.y - 30, 6);
        F.popText(COUNTER.x + 150, COUNTER.y - 60, '+' + total, C.gold, 26);
        cu.carry = null;
        cu.state = 'leave';
        cu.emote = impatient ? 'meh' : cu.mood;
        cu.emoteT = 0;
        if (impatient) U.toastMsg('Don\'t keep customers waiting at the register!', C.cream);
      },
      closeShop() {
        this.open = false;
        this.customers.forEach((cu) => {
          if (cu.deal && cu.state !== 'leave') {
            // unpaid stack goes back on its table
            s.shelves[cu.shelf] = s.shelves[cu.shelf] || cu.deal;
          }
        });
        this.customers = [];
        s.phase = 'evening';
        G.save();
        A.sfx('bell');
        this.card = {
          t: 0,
          kind: 'closed',
          done: () => {
            if (!s.seen.firstClose) {
              s.seen.firstClose = true;
              U.say([
                { who: 'granny', text: "Not bad for a first day, dearie! But we'll need fancier curios to really get the Emporium back on its feet." },
                { who: 'granny', text: "Night's falling. The Picture House basement... that's where the Lost Reels are. Your Grandpa drew every one of 'em." },
                { who: 'wick', text: "I'll bring back the best loot in Flickerton, Granny! Just you watch!" },
              ]);
            }
          },
        };
      },
      sleep() {
        if (this.open) return U.toastMsg('Not while the shop is open!', C.red);
        const q = s.phase === 'night' ? 'Go to bed and start a new day?' : 'Skip ahead and sleep until tomorrow?';
        U.confirm(q, () => {
          s.day++;
          s.phase = 'morning';
          s.shopOpenedToday = false;
          G.save();
          A.sfx('whistle');
          this.card = { t: 0, kind: 'morning' };
        });
      },
      talkGranny() {
        const lines = [];
        const cl = s.cleared.filter((x) => x).length;
        if (cl === 0) lines.push({ who: 'granny', text: 'The first reel is "The Pantry Picture". Your Grandpa loved drawin\' kitchens. Watch out for that ornery kettle, Bartholomew!' });
        else if (cl === 1) lines.push({ who: 'granny', text: "The Big Top reel's open now. That Jangles fella... your Grandpa based him on a clown who owed him money!" });
        else if (cl === 2) lines.push({ who: 'granny', text: 'Tick-Tock Tower is the last of Grandpa\'s reels. After that... whatever Sprocket\'s hiding.' });
        else if (cl === 3) lines.push({ who: 'granny', text: 'Three keys, three reels. Sprocket\'s Final Cut is waiting. Be careful, dearie. Bring tonics!' });
        else lines.push({ who: 'granny', text: "You did it, dearie. The Emporium's the talk of the town! Grandpa would be flickerin' with pride." });
        const tips = [
          'Tip: try one price, watch the face, then nudge it. My ledger remembers every reaction.',
          'Tip: the top row of your bag is a safe pocket. If you get snuffed, you keep what\'s in it.',
          'Tip: Hammerstein wants materials: springs, gears, tickets. Don\'t sell every last one!',
          'Tip: customers get impatient at the register. Ring \'em up quick at the counter!',
          'Tip: the more reels you clear, the more folks come shopping.',
        ];
        lines.push({ who: 'granny', text: tips[(s.day + Math.floor(this.t)) % tips.length] });
        U.say(lines);
      },
      draw() {
        const c = G.ctx;
        c.drawImage(this.bg, 0, 0, G.W, G.H);
        const shelfItems = s.shelves;
        // register
        K.seed(710);
        K.rrect(COUNTER.x + 128, COUNTER.y - 64, 48, 36, 5, C.gold, { lw: 3 });
        K.rrect(COUNTER.x + 134, COUNTER.y - 76, 36, 14, 3, '#c9942c', { lw: 2.5 });
        K.text(this.open ? 'OPEN' : '', COUNTER.x + 152, COUNTER.y - 69, 8, { font: K.F.deco, fill: K.INK, lw: 0, shadow: false });
        // sign
        c.save();
        c.translate(SIGN.x, SIGN.y - 30);
        c.rotate(Math.sin(this.t * 2) * 0.05);
        K.seed(711);
        K.line([[0, -16], [0, -30]], 2);
        K.rrect(-34, -16, 68, 30, 5, this.open ? C.green : C.red, { lw: 3 });
        K.text(this.open ? 'OPEN' : 'CLOSED', 0, 0, 12, { fill: C.cream, lw: 2.5 });
        c.restore();
        const ents = [];
        SHELVES.forEach((p, i) =>
          ents.push({
            y: p.y,
            d: () => {
              K.seed(720 + i);
              K.shadow(p.x, p.y + 6, 34, 10);
              K.rrect(p.x - 32, p.y - 34, 64, 40, 6, '#8a5a3b', { lw: 3.2 });
              K.rrect(p.x - 38, p.y - 44, 76, 16, 5, '#e2cfa2', { lw: 3 });
              const it = shelfItems[i];
              if (it) {
                G.items.icon(it.id, p.x, p.y - 58 + Math.sin(this.t * 3 + i) * 2, 1.2);
                if (it.n > 1) K.text('x' + it.n, p.x + 22, p.y - 46, 12, { fill: C.cream, lw: 3 });
                // price tag
                c.save();
                c.translate(p.x + 30, p.y - 18);
                c.rotate(0.2 + Math.sin(this.t * 2 + i) * 0.05);
                K.shape([[-4, -9], [34, -9], [42, 0], [34, 9], [-4, 9]], C.white, { lw: 2 });
                K.text(String(it.price), 18, 1, 11, { fill: K.INK, lw: 0, shadow: false });
                c.restore();
              }
            },
          })
        );
        ents.push({ y: GRANNY.y, d: () => this.drawGranny() });
        this.customers.forEach((cu) => ents.push({ y: cu.y, d: () => CH.toon(cu.x, cu.y, cu.spec, { moving: cu.moving, phase: cu.phase, fx: cu.fx, seed: cu.seed, mood: cu.state === 'think' ? 'think' : cu.state === 'react' ? cu.mood : cu.mood === 'angry' ? 'angry' : null, carry: cu.carry, emote: cu.emote, emoteT: cu.emoteT }) }));
        ents.push({ y: this.pl.y, d: () => this.pl.draw() });
        ents.sort((a, b) => a.y - b.y).forEach((e) => e.d());
        // counter front drawn over customers standing behind? (customers stand in front, so no)
        F.draw();
        if (this.near && !U.blocking() && !this.card) U.prompt(this.near.x, this.near.y - 90, 'E', this.near.label);
        // status card
        c.save();
        c.translate(G.W - 120, 36);
        c.rotate(0.03);
        K.seed(730);
        K.rrect(-100, -22, 200, 44, 6, C.cream, { lw: 3 });
        K.text(this.open ? 'CUSTOMERS LEFT: ' + (this.visitors + this.customers.length) : 'DAY ' + s.day + ' · ' + s.phase.toUpperCase(), 0, 1, 14, { font: K.F.shout, fill: K.INK, lw: 0, shadow: false });
        c.restore();
        K.seed(731);
        K.coin(34, 32, 13);
        K.text(String(s.gold), 56, 33, 24, { align: 'left', fill: C.gold });
        if (this.card) this.drawCard();
      },
      drawGranny() {
        const rock = Math.sin(this.t * 1.8) * 0.06;
        const c = G.ctx;
        c.save();
        c.translate(GRANNY.x, GRANNY.y + 10);
        c.rotate(rock);
        K.seed(740);
        K.rrect(-26, -70, 52, 64, 10, '#6a3c24', { lw: 3 });
        K.line([[-30, 6], [30, 6]], 5, '#6a3c24');
        c.restore();
        CH.toon(GRANNY.x, GRANNY.y + 8, CH.cast.granny, { seed: 30, talk: U.dialog && U.dialog.lines[U.dialog.i] && U.dialog.lines[U.dialog.i].who === 'granny' });
        // knitting
        K.blob(GRANNY.x, GRANNY.y - 20, 8, 6, C.red, { lw: 2 });
      },
      drawCard() {
        const c = G.ctx;
        const k = G.easeBack(Math.min(1, this.card.t * 3));
        c.fillStyle = 'rgba(20,10,5,0.55)';
        c.fillRect(0, 0, G.W, G.H);
        c.save();
        c.translate(G.W / 2, G.H / 2);
        c.scale(k, k);
        c.rotate(-0.03);
        if (this.card.kind === 'closed') {
          K.card(-250, -170, 500, 340, { fill: C.cream });
          K.text("THAT'S A WRAP ON TODAY!", 0, -130, 26, { fill: C.red, wave: 1.5 });
          if (!this.soldList.length) K.para('Nobody bought a thing. Try friendlier prices tomorrow!', -200, -80, 400, 18, { align: 'left' });
          this.soldList.slice(0, 6).forEach((d, i) => {
            G.items.icon(d.id, -190, -80 + i * 34, 0.8);
            K.para(G.items.db[d.id].name + ' x' + d.n, -165, -90 + i * 34, 260, 16);
            K.text(String(d.price * d.n), 190, -80 + i * 34, 18, { align: 'right', fill: C.gold, lw: 3 });
          });
          K.line([[-200, 125], [200, 125]], 2.5);
          K.text('TOTAL', -190, 145, 22, { align: 'left', fill: K.INK, lw: 0, shadow: false });
          K.coin(110, 145, 11);
          K.text(String(this.earned), 190, 146, 26, { align: 'right', fill: C.gold });
        } else {
          K.card(-220, -120, 440, 240, { fill: '#fff4cf' });
          K.seed(750);
          K.blob(0, -50, 34, 34, '#ffd96a', { lw: 3.5 });
          for (let i = 0; i < 10; i++) {
            const a = (i / 10) * Math.PI * 2 + this.card.t;
            K.line([[Math.cos(a) * 44, -50 + Math.sin(a) * 44], [Math.cos(a) * 58, -50 + Math.sin(a) * 58]], 3.5);
          }
          K.pieEye(-10, -54, 5, 8, 0, 0, 0);
          K.pieEye(10, -54, 5, 8, 0, 0, 0);
          K.shape([[-12, -38], [12, -38], [0, -28]], C.red, { lw: 2, smooth: true });
          K.text('DAY ' + s.day, 0, 30, 48, { fill: C.red, wave: 2 });
          K.text('Rise and shine, Flickerton!', 0, 76, 18, { font: K.F.type, fill: K.INK, lw: 0, shadow: false });
        }
        c.restore();
        if (this.card.t > 0.8 && Math.floor(G.t * 2) % 2) K.text('PRESS E', G.W / 2, 510, 16, { fill: C.cream, lw: 3 });
      },
    };
    return S;
  };
})();
