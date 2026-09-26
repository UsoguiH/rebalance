// UI: HUD cards, dialog boxes with portraits, menus, and overlay panels
// (bag & chest, pricing table, forge, apothecary, pause).
(function () {
  const K = G.ink,
    C = K.C,
    I = G.input,
    A = G.audio;
  const U = (G.ui = { panel: null, dialog: null, toast: null });

  U.blocking = () => !!(U.panel || U.dialog);

  // ---------- small helpers ----------
  U.key = (label, x, y, s = 1) => {
    const c = G.ctx;
    c.save();
    c.translate(x, y);
    c.scale(s, s);
    K.seed(500 + label.length);
    const w = Math.max(22, label.length * 9 + 10);
    K.rrect(-w / 2, -11, w, 22, 5, C.cream, { lw: 2.4, amt: 0.4 });
    K.text(label, 0, 1, 12, { font: K.F.shout, fill: K.INK, lw: 0, shadow: false });
    c.restore();
  };
  U.prompt = (x, y, key, label) => {
    const b = Math.sin(G.animT * 6) * 2;
    U.key(key, x - 6 - (label.length * 5.5) / 2, y + b, 1);
    K.text(label, x + 12, y + b, 15, { font: K.F.shout, fill: C.cream, lw: 4, align: 'center' });
  };
  U.toastMsg = (str, color = C.cream) => {
    U.toast = { str, t: 0, color };
  };
  U.drawToast = () => {
    const t = U.toast;
    if (!t) return;
    t.t += G.dt;
    if (t.t > 2.4) {
      U.toast = null;
      return;
    }
    const k = Math.min(1, t.t * 5) * (t.t > 2 ? 1 - (t.t - 2) / 0.4 : 1);
    K.text(t.str, G.W / 2, 110 - (1 - k) * 20, 24, { fill: t.color, alpha: k, wave: 1.2 });
  };

  // ---------- HUD (Cuphead-style cards in the corner) ----------
  U.hud = (pl) => {
    const c = G.ctx;
    const s = G.state;
    // HP card
    const low = pl.hp <= 1;
    const flashRed = low && Math.floor(G.t * 4) % 2 === 0;
    c.save();
    c.translate(58, 505);
    c.rotate(-0.06);
    K.seed(1001);
    c.fillStyle = 'rgba(20,10,5,0.4)';
    c.fillRect(-38, -16, 80, 36);
    K.rrect(-42, -20, 80, 36, 4, pl.hp <= 0 ? '#a99' : flashRed ? C.red : C.white, { lw: 3, amt: 0.6 });
    K.text('HP.' + Math.max(0, pl.hp), -2, 0, 20, { font: K.F.shout, fill: flashRed ? C.white : K.INK, lw: 0, shadow: false });
    c.restore();
    // super meter cards
    for (let i = 0; i < 5; i++) {
      const fill = G.clamp(pl.meter - i, 0, 1);
      const x = 120 + i * 26,
        y = 506;
      c.save();
      c.translate(x, y);
      const full = fill >= 1;
      const flip = full ? Math.abs(Math.cos(Math.min(1, (pl.cardFlip[i] || 0) * 4) * Math.PI)) : 1;
      c.scale(flip, 1);
      c.rotate(full ? Math.sin(G.animT * 4 + i) * 0.05 : 0);
      K.seed(1100 + i);
      K.rrect(-10, -16, 20, 32, 3, C.white, { lw: 2.4, amt: 0.4 });
      if (fill > 0 && !full) {
        c.fillStyle = C.pink;
        c.fillRect(-8, 14 - 28 * fill, 16, 28 * fill);
      }
      if (full) {
        K.rrect(-8, -14, 16, 28, 2, C.red, { lw: 1.5, amt: 0.3 });
        CH().flame(0, 8, 0.45);
      }
      c.restore();
    }
    // gold, top-left
    K.seed(1200);
    K.coin(34, 32, 13);
    K.text(String(s.gold), 56, 33, 24, { align: 'left', fill: C.gold });
    // potions & bag & weapon, bottom right
    const bx = G.W - 40;
    G.items.icon('potion', bx - 110, 505, 1.1);
    K.text('x' + s.potions, bx - 90, 508, 16, { align: 'left', fill: C.cream });
    G.items.icon('bag', bx - 30, 505, 1.1);
    const full = s.bag.length >= G.items.BAG_SIZE;
    K.text(s.bag.length + '/' + G.items.BAG_SIZE, bx - 12, 508, 15, { align: 'left', fill: full ? C.red : C.cream });
    K.text(WEAPONS[s.weapon].name.toUpperCase(), 196 + 60, 506, 13, { font: K.F.deco, fill: C.cream, lw: 3, align: 'left' });
  };
  const CH = () => G.chars;

  // ---------- weapons (bought from the forge) ----------
  const WEAPONS = (U.WEAPONS = {
    flicker: { name: 'Flicker Finger', rate: 0.11, dmg: 1, speed: 640, spread: 0, count: 1, life: 0.9, r: 7 },
    sparkler: { name: 'Sparkler Spread', rate: 0.2, dmg: 0.8, speed: 520, spread: 0.26, count: 3, life: 0.42, r: 7 },
    firefly: { name: 'Firefly Chaser', rate: 0.16, dmg: 0.8, speed: 380, spread: 0.1, count: 1, life: 1.6, r: 7, homing: 5 },
  });

  // ---------- dialog ----------
  // lines: [{who:'granny'|'wick'|spec, name, text}]
  U.say = (lines, done) => {
    U.dialog = { lines, i: 0, chars: 0, done, t: 0 };
  };
  U.updateDialog = (dt) => {
    const d = U.dialog;
    if (!d) return;
    d.t += dt;
    const line = d.lines[d.i];
    const prev = Math.floor(d.chars);
    d.chars += dt * 55;
    if (Math.floor(d.chars) > prev && Math.floor(d.chars) % 2 === 0 && d.chars < line.text.length) A.sfx('type');
    if (I.hit('confirm') || I.hit('interact') || I.mouse.pressed) {
      if (d.chars < line.text.length) d.chars = line.text.length;
      else {
        d.i++;
        d.chars = 0;
        A.sfx('select');
        if (d.i >= d.lines.length) {
          U.dialog = null;
          d.done && d.done();
        }
      }
    }
  };
  U.drawDialog = () => {
    const d = U.dialog;
    if (!d) return;
    const line = d.lines[d.i];
    if (!line) return;
    const c = G.ctx;
    const pop = G.easeBack(Math.min(1, d.t * 5));
    c.save();
    c.translate(G.W / 2, 452);
    c.scale(pop, pop);
    c.translate(-G.W / 2, -452);
    K.seed(1300);
    K.card(150, 392, 760, 124, { fill: C.cream, rot: -0.01 });
    const talking = d.chars < line.text.length;
    CH().portrait(line.who, 118, 440, 62, talking);
    const name = line.name || (CH().cast[line.who] ? CH().cast[line.who].name : line.who === 'wick' ? 'Wick' : '');
    c.save();
    c.translate(206, 390);
    c.rotate(-0.04);
    K.rrect(-14, -16, name.length * 13 + 28, 32, 6, C.red, { lw: 3, amt: 0.5 });
    K.text(name.toUpperCase(), name.length * 6.5, 1, 16, { fill: C.cream, lw: 3 });
    c.restore();
    K.para(line.text.slice(0, Math.floor(d.chars)), 200, 424, 680, 19, { lh: 1.3 });
    if (!talking) {
      const b = Math.floor(G.animT * 4) % 2 * 3;
      K.shape([[880, 490 + b], [896, 490 + b], [888, 500 + b]], C.red, { lw: 2 });
    }
    c.restore();
  };

  // ---------- generic vertical menu ----------
  U.Menu = class {
    constructor(items, o = {}) {
      this.items = items;
      this.sel = o.sel || 0;
      this.o = o;
      this.t = 0;
      this.skip();
    }
    skip() {
      let n = 0;
      while (this.items[this.sel] && this.items[this.sel].disabled && n++ < this.items.length) this.sel = (this.sel + 1) % this.items.length;
    }
    update(dt) {
      this.t += dt;
      const n = this.items.length;
      const move = (d) => {
        let k = 0;
        do {
          this.sel = (this.sel + d + n) % n;
          k++;
        } while (this.items[this.sel].disabled && k < n);
        A.sfx('select');
        this.t = 0;
      };
      if (I.hit('up')) move(-1);
      if (I.hit('down')) move(1);
      // mouse hover / click
      if (this.rects) {
        this.rects.forEach((r, i) => {
          const m = I.mouse;
          if (m.x > r[0] && m.x < r[0] + r[2] && m.y > r[1] && m.y < r[1] + r[3] && !this.items[i].disabled) {
            if (G.t - m.lastMove < 0.05 && this.sel !== i) {
              this.sel = i;
              A.sfx('select');
            }
            if (m.pressed) {
              this.sel = i;
              this.fire();
            }
          }
        });
      }
      const it = this.items[this.sel];
      if (it.adjust) {
        if (I.hit('left')) it.adjust(-1);
        if (I.hit('right')) it.adjust(1);
      }
      if (I.hit('confirm')) this.fire();
    }
    fire() {
      const it = this.items[this.sel];
      if (!it || it.disabled) return;
      A.sfx('confirm');
      it.action && it.action();
    }
    draw(x, y, o = {}) {
      const size = o.size || 30,
        gap = o.gap || size * 1.45;
      this.rects = [];
      this.items.forEach((it, i) => {
        const on = i === this.sel;
        const label = typeof it.label === 'function' ? it.label() : it.label;
        const yy = y + i * gap;
        const scale = on ? 1 + Math.sin(this.t * 10) * 0.03 + 0.08 : 1;
        this.rects.push([x - 200, yy - gap / 2, 400, gap]);
        G.ctx.save();
        G.ctx.translate(x, yy);
        G.ctx.scale(scale, scale);
        K.text(label, 0, 0, size, {
          font: o.font || K.F.shout,
          fill: it.disabled ? '#8a7f70' : on ? o.onColor || C.red : o.color || C.cream,
          wave: on ? 1.6 : 0,
          lw: size * 0.16,
          align: o.align || 'center',
        });
        G.ctx.restore();
      });
    }
  };

  // ---------- panel base: a parchment board ----------
  U.board = (x, y, w, h, title, o = {}) => {
    K.seed(1400 + w);
    K.card(x, y, w, h, { fill: o.fill || C.cream, rot: o.rot || 0 });
    if (title) {
      const c = G.ctx;
      c.save();
      c.translate(x + w / 2, y + 2);
      c.rotate(-0.02);
      const tw = title.length * 15 + 40;
      K.rrect(-tw / 2, -20, tw, 40, 8, C.red, { lw: 3.2, amt: 0.6 });
      K.text(title, 0, 1, 22, { fill: C.cream, lw: 4 });
      c.restore();
    }
  };

  // Item slot grid. returns rects for mouse
  U.grid = (x, y, cols, rows, list, sel, o = {}) => {
    const S = o.size || 54;
    const rects = [];
    for (let i = 0; i < cols * rows; i++) {
      const cx = x + (i % cols) * (S + 6),
        cy = y + Math.floor(i / cols) * (S + 6);
      K.seed(1500 + i);
      const on = i === sel && o.active !== false;
      const safe = o.safeRow && i < cols;
      K.rrect(cx, cy, S, S, 6, on ? '#fff7d6' : safe ? '#e9d8ae' : '#e2cfa2', { lw: on ? 3.5 : 2, amt: 0.5, stroke: on ? C.red : K.INK });
      const it = list[i];
      if (it) {
        G.items.icon(it.id, cx + S / 2, cy + S / 2 - 2, S / 40);
        if (it.n > 1) K.text(String(it.n), cx + S - 8, cy + S - 10, 14, { fill: C.cream, lw: 3.5, align: 'right' });
      }
      rects.push([cx, cy, S, S]);
    }
    return rects;
  };

  U.itemInfo = (id, x, y, w) => {
    if (!id) return;
    const d = G.items.db[id];
    K.text(d.name, x, y, 22, { align: 'left', fill: C.red, lw: 3.5 });
    K.para(d.desc, x, y + 18, w, 15, { lh: 1.25 });
    const h = G.items.ledgerHint(id);
    const L = G.state.ledger[id];
    if (L && L.length) {
      K.para('Ledger: ' + L.map((e) => e.price + (MOODCH[e.mood] || '')).join('  '), x, y + 58, w, 14, { fill: C.dbrown });
    } else K.para('Ledger: no sales yet. Try a price!', x, y + 58, w, 14, { fill: C.dbrown });
    return h;
  };
  const MOODCH = { ecstatic: '♥', happy: '$', meh: '~', angry: '✗' };
  U.MOODCH = MOODCH;

  // ---------- Bag / chest panel ----------
  U.openBag = (withChest = false) => {
    A.sfx('select');
    const P = {
      side: 0, // 0 bag, 1 chest
      sel: [0, 0],
      t: 0,
      update(dt) {
        this.t += dt;
        const s = G.state;
        const cols = [4, 6],
          counts = [16, 30];
        const side = this.side;
        const col = cols[side];
        let i = this.sel[side];
        if (I.hit('left')) {
          if (i % col === 0 && withChest && side === 1) {
            this.side = 0;
            this.sel[0] = Math.min(15, Math.floor(i / col) * 4 + 3);
          } else if (i % col > 0) i--;
          A.sfx('select');
        }
        if (I.hit('right')) {
          if (i % col === col - 1 && withChest && side === 0) {
            this.side = 1;
            this.sel[1] = Math.floor(i / col) * 6;
          } else if (i % col < col - 1) i++;
          A.sfx('select');
        }
        if (I.hit('up') && i - col >= 0) {
          i -= col;
          A.sfx('select');
        }
        if (I.hit('down') && i + col < counts[side]) {
          i += col;
          A.sfx('select');
        }
        if (side === this.side) this.sel[side] = i;
        // mouse
        [this.rb, this.rc].forEach((rects, sd) => {
          if (!rects) return;
          rects.forEach((r, k) => {
            const m = I.mouse;
            if (m.pressed && m.x > r[0] && m.x < r[0] + r[2] && m.y > r[1] && m.y < r[1] + r[3]) {
              if (this.side === sd && this.sel[sd] === k) this.transfer();
              this.side = sd;
              this.sel[sd] = k;
            }
          });
        });
        if (withChest && (I.hit('interact') || I.pressed['Enter'] || I.pressed['Space'])) this.transfer();
        if (!withChest && this.side === 0 && (I.pressed['KeyZ'] || I.pressed['Delete'])) {
          const it = s.bag[this.sel[0]];
          if (it) {
            s.bag.splice(this.sel[0], 1);
            A.sfx('back');
            U.toastMsg('Dropped ' + G.items.db[it.id].name, C.cream);
          }
        }
        if (I.hit('back') || I.hit('bag')) {
          A.sfx('back');
          U.panel = null;
          G.save();
        }
      },
      transfer() {
        const s = G.state;
        const from = this.side === 0 ? s.bag : s.chest;
        const to = this.side === 0 ? s.chest : s.bag;
        const cap = this.side === 0 ? 30 : G.items.BAG_SIZE;
        const it = from[this.sel[this.side]];
        if (!it) return;
        const left = G.items.add(to, it.id, it.n, cap);
        if (left === it.n) {
          A.sfx('back');
          U.toastMsg(this.side === 0 ? 'Chest is full!' : 'Bag is full!', C.red);
          return;
        }
        it.n = left;
        if (it.n <= 0) from.splice(this.sel[this.side], 1);
        A.sfx('pickup');
      },
      draw() {
        const s = G.state;
        const c = G.ctx;
        c.fillStyle = 'rgba(20,10,5,0.5)';
        c.fillRect(0, 0, G.W, G.H);
        const pop = G.easeBack(Math.min(1, this.t * 5));
        c.save();
        c.translate(G.W / 2, G.H / 2);
        c.scale(pop, pop);
        c.translate(-G.W / 2, -G.H / 2);
        const bx = withChest ? 60 : 250;
        U.board(bx, 60, 300, 420, 'BAG');
        K.text('SAFE POCKET', bx + 150, 96, 12, { font: K.F.deco, fill: C.dbrown, lw: 0, shadow: false });
        this.rb = U.grid(bx + 32, 108, 4, 4, s.bag, this.sel[0], { safeRow: true, active: this.side === 0 });
        K.para('Top row is kept if you get cut.', bx + 30, 352, 250, 13, { fill: C.dbrown });
        if (withChest) {
          U.board(390, 60, 420, 420, 'STORAGE CHEST');
          this.rc = U.grid(420, 100, 6, 5, s.chest, this.sel[1], { size: 54, active: this.side === 1 });
        }
        const list = this.side === 0 ? s.bag : s.chest;
        const it = list[this.sel[this.side]];
        const ix = withChest ? 76 : 266;
        if (it) U.itemInfo(it.id, ix, 382, withChest ? 270 : 270);
        const hint = withChest ? 'ARROWS move   E transfer   ESC close' : 'ARROWS move   Z drop   ESC close';
        K.text(hint, G.W / 2, 512, 14, { font: K.F.deco, fill: C.cream, lw: 3 });
        c.restore();
      },
    };
    U.panel = P;
  };

  // ---------- Pricing panel (display pedestal) ----------
  U.openShelf = (idx, onDone) => {
    const s = G.state;
    const P = {
      t: 0,
      step: s.shelves[idx] ? 'price' : 'pick',
      pickSel: 0,
      price: s.shelves[idx] ? s.shelves[idx].price : 0,
      hold: 0,
      sources() {
        const out = [];
        s.bag.forEach((it, i) => out.push({ from: 'bag', i, it }));
        s.chest.forEach((it, i) => out.push({ from: 'chest', i, it }));
        return out;
      },
      update(dt) {
        this.t += dt;
        const sh = s.shelves[idx];
        if (this.step === 'pick') {
          const src = this.sources();
          const n = src.length;
          if (n) {
            if (I.hit('left')) this.pickSel = (this.pickSel - 1 + n) % n;
            if (I.hit('right')) this.pickSel = (this.pickSel + 1) % n;
            if (I.hit('up')) this.pickSel = Math.max(0, this.pickSel - 8);
            if (I.hit('down')) this.pickSel = Math.min(n - 1, this.pickSel + 8);
            if (I.hit('left') || I.hit('right') || I.hit('up') || I.hit('down')) A.sfx('select');
            (this.rects || []).forEach((r, k) => {
              const m = I.mouse;
              if (m.pressed && m.x > r[0] && m.x < r[0] + r[2] && m.y > r[1] && m.y < r[1] + r[3]) {
                if (this.pickSel === k) this.choose(src[k]);
                this.pickSel = k;
              }
            });
            if (I.hit('interact') || I.pressed['Space'] || I.pressed['KeyJ']) this.choose(src[this.pickSel]);
          }
          if (I.hit('back')) {
            A.sfx('back');
            U.panel = null;
            onDone && onDone();
          }
        } else {
          let d = 0;
          const up = I.is('up'),
            down = I.is('down');
          if (I.hit('up')) d = 1;
          if (I.hit('down')) d = -1;
          if (I.hit('right')) d = 10;
          if (I.hit('left')) d = -10;
          if (up || down) {
            this.hold += dt;
            if (this.hold > 0.35) {
              this.acc = (this.acc || 0) + dt * (this.hold > 1.2 ? 60 : 18);
              while (this.acc >= 1) {
                d += up ? 1 : -1;
                this.acc--;
              }
            }
          } else this.hold = 0;
          if (d) {
            this.price = G.clamp(this.price + d, 1, 9999);
            A.sfx('select');
          }
          if (I.hit('interact') || I.pressed['Space'] || I.pressed['KeyJ']) {
            sh.price = this.price;
            A.sfx('register');
            U.panel = null;
            G.save();
            onDone && onDone();
          }
          if (I.pressed['KeyT'] || I.pressed['Backspace']) {
            // take the stack back
            const left = G.items.add(s.chest, sh.id, sh.n, 30);
            if (left > 0) G.items.add(s.bag, sh.id, left);
            s.shelves[idx] = null;
            A.sfx('back');
            U.panel = null;
            onDone && onDone();
          }
          if (I.pressed['Escape'] || I.pressed['KeyX']) {
            A.sfx('back');
            sh.price = this.price;
            U.panel = null;
            onDone && onDone();
          }
        }
      },
      choose(src) {
        if (!src) return;
        const it = src.it;
        const list = src.from === 'bag' ? s.bag : s.chest;
        list.splice(src.i, 1);
        s.shelves[idx] = { id: it.id, n: it.n, price: G.items.guessPrice(it.id) };
        this.price = s.shelves[idx].price;
        this.step = 'price';
        A.sfx('pickup');
      },
      draw() {
        const c = G.ctx;
        c.fillStyle = 'rgba(20,10,5,0.5)';
        c.fillRect(0, 0, G.W, G.H);
        const pop = G.easeBack(Math.min(1, this.t * 5));
        c.save();
        c.translate(G.W / 2, G.H / 2);
        c.scale(pop, pop);
        c.translate(-G.W / 2, -G.H / 2);
        if (this.step === 'pick') {
          U.board(80, 70, 800, 400, 'PICK A CURIO TO DISPLAY');
          const src = this.sources();
          this.rects = [];
          if (!src.length) K.para('Your bag and chest are empty. Go loot a Lost Reel tonight!', 130, 200, 700, 20);
          src.forEach((e, k) => {
            const x = 110 + (k % 8) * 92,
              y = 110 + Math.floor(k / 8) * 92;
            if (y > 400) return;
            const on = k === this.pickSel;
            K.seed(1600 + k);
            K.rrect(x, y, 80, 80, 8, on ? '#fff7d6' : e.from === 'bag' ? '#e2cfa2' : '#d6c9ae', { lw: on ? 3.5 : 2, stroke: on ? C.red : K.INK, amt: 0.5 });
            G.items.icon(e.it.id, x + 40, y + 36, 1.5);
            K.text((e.from === 'bag' ? 'BAG' : 'CHEST') + '  x' + e.it.n, x + 40, y + 68, 11, { font: K.F.deco, fill: C.dbrown, lw: 0, shadow: false });
            this.rects.push([x, y, 80, 80]);
          });
          const e = src[this.pickSel];
          if (e) U.itemInfo(e.it.id, 120, 392, 700);
          K.text('ARROWS choose   E place   ESC cancel', G.W / 2, 505, 14, { font: K.F.deco, fill: C.cream, lw: 3 });
        } else {
          const sh = s.shelves[idx];
          U.board(200, 60, 560, 420, 'SET YOUR PRICE');
          G.items.icon(sh.id, 300, 170, 2.6);
          K.text('x' + sh.n, 350, 214, 18, { fill: C.cream });
          const d = G.items.db[sh.id];
          K.text(d.name, 560, 118, 24, { fill: C.red });
          // price tag
          c.save();
          c.translate(560, 190);
          c.rotate(Math.sin(this.t * 3) * 0.03);
          K.seed(1700);
          K.shape([[-110, -38], [90, -38], [120, 0], [90, 38], [-110, 38]], C.white, { lw: 3.2 });
          K.blob(94, 0, 7, 7, '#e2cfa2', { lw: 2 });
          K.coin(-80, 0, 15);
          K.text(String(this.price), 5, 3, 44, { fill: K.INK, lw: 0, shadow: false });
          c.restore();
          K.text('each  (total ' + this.price * sh.n + ')', 560, 250, 14, { font: K.F.deco, fill: C.dbrown, lw: 0, shadow: false });
          // ledger chart: moods at each price tried
          K.text("GRANNY'S LEDGER", 480, 290, 16, { fill: C.cream, lw: 3.5 });
          const L = s.ledger[sh.id] || [];
          if (!L.length) K.para('No customer has seen this yet. Watch their faces when they look at the price!', 240, 312, 480, 15);
          L.forEach((e2, k) => {
            const x = 250 + k * 58,
              y = 330;
            K.seed(1800 + k);
            const col = { ecstatic: C.pink, happy: C.green, meh: C.sky, angry: C.red }[e2.mood];
            K.blob(x + 24, y, 16, 16, col, { lw: 2.4 });
            K.text(MOODCH[e2.mood], x + 24, y + 1, 15, { fill: C.white, lw: 0, shadow: false, font: 'serif' });
            K.text(String(e2.price), x + 24, y + 30, 14, { fill: K.INK, lw: 0, shadow: false });
          });
          K.para('♥ too cheap   $ just right   ~ pricey   ✗ too much', 250, 380, 480, 13, { fill: C.dbrown });
          K.text('UP/DOWN ±1   LEFT/RIGHT ±10   E confirm   T take back', G.W / 2, 505, 14, { font: K.F.deco, fill: C.cream, lw: 3 });
        }
        c.restore();
      },
    };
    U.panel = P;
  };

  // ---------- Shopkeeper panel (forge / apothecary) ----------
  // goods: [{name, desc, gold, mats:{id:n}, can(), buy(), owned()}]
  U.openStore = (who, title, greeting, goodsList) => {
    let goods = typeof goodsList === 'function' ? goodsList() : goodsList;
    const P = {
      t: 0,
      sel: 0,
      line: greeting,
      update(dt) {
        this.t += dt;
        if (typeof goodsList === 'function') goods = goodsList();
        const n = goods.length + 1;
        if (this.sel >= n) this.sel = n - 1;
        if (I.hit('up')) {
          this.sel = (this.sel - 1 + n) % n;
          A.sfx('select');
        }
        if (I.hit('down')) {
          this.sel = (this.sel + 1) % n;
          A.sfx('select');
        }
        (this.rects || []).forEach((r, k) => {
          const m = I.mouse;
          if (m.x > r[0] && m.x < r[0] + r[2] && m.y > r[1] && m.y < r[1] + r[3]) {
            if (G.t - m.lastMove < 0.05) this.sel = k;
            if (m.pressed) {
              this.sel = k;
              this.fire();
            }
          }
        });
        if (I.hit('confirm')) this.fire();
        if (I.hit('back')) this.close();
      },
      close() {
        A.sfx('back');
        U.panel = null;
        G.save();
      },
      fire() {
        if (this.sel === goods.length) return this.close();
        const g = goods[this.sel];
        const s = G.state;
        if (g.owned && g.owned()) {
          this.line = g.ownedLine || 'You already have that one, pal!';
          A.sfx('back');
          return;
        }
        if (g.locked && g.locked()) {
          this.line = g.lockedLine || 'Not ready for that yet.';
          A.sfx('back');
          return;
        }
        const matsOk = Object.keys(g.mats || {}).every((id) => G.items.count(s.bag, id) + G.items.count(s.chest, id) >= g.mats[id]);
        if (s.gold < g.gold || !matsOk) {
          this.line = s.gold < g.gold ? "Ya short on coin, kid. Sell some curios first!" : 'Bring me the materials and we got a deal!';
          A.sfx('angry');
          return;
        }
        s.gold -= g.gold;
        Object.keys(g.mats || {}).forEach((id) => {
          const inBag = Math.min(G.items.count(s.chest, id), g.mats[id]);
          G.items.remove(s.chest, id, inBag);
          G.items.remove(s.bag, id, g.mats[id] - inBag);
        });
        g.buy();
        A.sfx('register');
        this.line = g.thanks || 'Pleasure doin\' business!';
        G.save();
      },
      draw() {
        const c = G.ctx;
        const s = G.state;
        c.fillStyle = 'rgba(20,10,5,0.55)';
        c.fillRect(0, 0, G.W, G.H);
        const pop = G.easeBack(Math.min(1, this.t * 5));
        c.save();
        c.translate(G.W / 2, G.H / 2);
        c.scale(pop, pop);
        c.translate(-G.W / 2, -G.H / 2);
        // shopkeeper stage on the left
        K.seed(1900);
        K.card(40, 60, 300, 420, { fill: '#e9c98f', rot: -0.02 });
        c.save();
        c.beginPath();
        c.rect(52, 72, 276, 396);
        c.clip();
        K.wash(190, 200, 180, 150, '#fff2cf', 0.9);
        const spec = CH().cast[who];
        CH().toon(190, 400, spec, { scale: spec.body === 'walrus' ? 2.2 : 2.4, talk: this.t % 5 < 1.5 });
        c.restore();
        K.card(52, 380, 276, 90, { fill: C.white, rot: 0.01 });
        K.para(this.line, 66, 392, 250, 15, { lh: 1.25 });
        // goods list
        U.board(370, 60, 550, 420, title);
        this.rects = [];
        goods.concat([{ name: 'Leave', close: true }]).forEach((g, k) => {
          const y = 100 + k * 58;
          const on = k === this.sel;
          this.rects.push([380, y - 4, 530, 54]);
          K.seed(2000 + k);
          if (on) K.rrect(384, y - 4, 522, 52, 8, '#fff4cf', { lw: 2.6, stroke: C.red, amt: 0.5 });
          if (g.close) {
            K.text('LEAVE', 645, y + 22, 22, { fill: on ? C.red : C.cream });
            return;
          }
          const owned = g.owned && g.owned();
          const locked = g.locked && g.locked();
          K.text(g.name, 400, y + 12, 18, { align: 'left', fill: owned ? '#8a7f70' : on ? C.red : C.cream, lw: 3.5 });
          K.para(owned ? 'OWNED' : locked ? g.lockedShort || 'LOCKED' : g.desc, 402, y + 26, 300, 12, { fill: C.dbrown });
          if (!owned) {
            K.coin(740, y + 12, 8);
            K.text(String(g.gold), 752, y + 13, 15, { align: 'left', fill: s.gold >= g.gold ? C.gold : C.red, lw: 3 });
            let mx = 740;
            Object.keys(g.mats || {}).forEach((id) => {
              const have = G.items.count(s.bag, id) + G.items.count(s.chest, id);
              G.items.icon(id, mx + 6, y + 36, 0.55);
              K.text(have + '/' + g.mats[id], mx + 18, y + 37, 11, { align: 'left', fill: have >= g.mats[id] ? C.cream : C.red, lw: 2.5 });
              mx += 58;
            });
          }
        });
        K.text('UP/DOWN choose   E buy   ESC leave', G.W / 2 + 150, 505, 14, { font: K.F.deco, fill: C.cream, lw: 3 });
        c.restore();
      },
    };
    U.panel = P;
  };

  // ---------- yes / no confirm ----------
  U.confirm = (question, yes, no) => {
    const P = {
      t: 0,
      menu: new U.Menu([
        { label: 'YES', action: () => ((U.panel = null), yes && yes()) },
        { label: 'NO', action: () => ((U.panel = null), no && no()) },
      ]),
      update(dt) {
        this.t += dt;
        this.menu.update(dt);
        if (I.hit('back')) {
          U.panel = null;
          A.sfx('back');
          no && no();
        }
      },
      draw() {
        const c = G.ctx;
        c.fillStyle = 'rgba(20,10,5,0.5)';
        c.fillRect(0, 0, G.W, G.H);
        const pop = G.easeBack(Math.min(1, this.t * 5));
        c.save();
        c.translate(G.W / 2, G.H / 2);
        c.scale(pop, pop);
        c.translate(-G.W / 2, -G.H / 2);
        U.board(260, 150, 440, 230, null);
        K.seed(2100);
        const lines = K.wrap(question, 380, 22, K.F.type);
        lines.forEach((l, i) => K.text(l, G.W / 2, 200 + i * 28, 22, { font: K.F.type, fill: K.INK, lw: 0, shadow: false }));
        this.menu.draw(G.W / 2, 290 + (lines.length - 1) * 10, { size: 28, gap: 42, color: K.INK });
        c.restore();
      },
    };
    U.panel = P;
  };

  // ---------- pause / options ----------
  U.openPause = (onQuit) => {
    const s = G.settings;
    const vol = (k) => (d) => {
      s[k] = G.clamp(Math.round((s[k] + d * 0.1) * 10) / 10, 0, 1);
      A.applyVolumes();
      G.saveSettings();
    };
    const P = {
      t: 0,
      show: 'main',
      menu: null,
      update(dt) {
        this.t += dt;
        this.menu.update(dt);
        if (I.hit('pause') && this.t > 0.1) {
          if (this.show !== 'main') this.build('main');
          else U.panel = null;
          A.sfx('back');
        }
      },
      build(which) {
        this.show = which;
        if (which === 'main')
          this.menu = new U.Menu([
            { label: 'RESUME', action: () => (U.panel = null) },
            { label: 'HOW TO PLAY', action: () => this.build('help') },
            { label: 'OPTIONS', action: () => this.build('opts') },
            { label: 'QUIT TO TITLE', action: () => ((U.panel = null), onQuit && onQuit()) },
          ]);
        else if (which === 'opts')
          this.menu = new U.Menu([
            { label: () => 'MUSIC  ' + '■'.repeat(Math.round(s.music * 10)) + '□'.repeat(10 - Math.round(s.music * 10)), adjust: vol('music') },
            { label: () => 'SOUND  ' + '■'.repeat(Math.round(s.sfx * 10)) + '□'.repeat(10 - Math.round(s.sfx * 10)), adjust: vol('sfx') },
            { label: () => 'FILM GRAIN  ' + (s.film ? 'ON' : 'OFF'), action: () => ((s.film = !s.film), G.saveSettings()), adjust: () => ((s.film = !s.film), G.saveSettings()) },
            { label: 'BACK', action: () => this.build('main') },
          ]);
        else this.menu = new U.Menu([{ label: 'BACK', action: () => this.build('main') }]);
      },
      draw() {
        const c = G.ctx;
        c.fillStyle = 'rgba(20,10,5,0.6)';
        c.fillRect(0, 0, G.W, G.H);
        const pop = G.easeBack(Math.min(1, this.t * 5));
        c.save();
        c.translate(G.W / 2, G.H / 2);
        c.scale(pop, pop);
        c.translate(-G.W / 2, -G.H / 2);
        if (this.show === 'help') {
          U.board(130, 40, 700, 460, 'HOW TO PLAY');
          U.drawControls(170, 90);
          this.menu.draw(G.W / 2, 470, { size: 24 });
        } else {
          U.board(260, 90, 440, 360, this.show === 'opts' ? 'OPTIONS' : 'PAUSED');
          this.menu.draw(G.W / 2, this.show === 'opts' ? 170 : 170, { size: this.show === 'opts' ? 22 : 30, gap: 60, color: C.cream });
        }
        c.restore();
      },
    };
    P.build('main');
    U.panel = P;
  };

  U.drawControls = (x, y) => {
    const rows = [
      ['WASD / ARROWS', 'Walk and choose'],
      ['J / LEFT CLICK', 'Shoot the Flicker Finger (mouse aims)'],
      ['SPACE / K', 'Dodge roll. Roll into PINK shots to PARRY!'],
      ['L / RIGHT CLICK', 'EX shot: spend a full card'],
      ['E', 'Talk, open doors, use tables'],
      ['Q', 'Drink a health tonic'],
      ['R', 'Stage Hook: yank yourself home, keeping your loot'],
      ['C', 'Swap weapon     I / TAB  Open bag'],
      ['ESC', 'Pause and options      M  Mute'],
    ];
    rows.forEach((r, i) => {
      K.text(r[0], x + 190, y + i * 38, 15, { font: K.F.shout, fill: C.red, lw: 3, align: 'right' });
      K.para(r[1], x + 210, y + i * 38 - 9, 440, 16);
    });
  };
})();
