// Boot (film leader countdown), studio card and the title screen.
(function () {
  const K = G.ink,
    C = K.C,
    I = G.input,
    A = G.audio,
    U = G.ui,
    CH = G.chars;
  G.scenes = G.scenes || {};

  // ---------- film leader ----------
  G.scenes.boot = () => ({
    t: 0,
    count: -1,
    ct: 0,
    update(dt) {
      this.t += dt;
      if (this.count < 0) {
        if (I.anyPressed || I.mouse.pressed) {
          A.unlock();
          this.count = 3;
          this.ct = 0;
          A.sfx('leader');
        }
        return;
      }
      this.ct += dt;
      if (this.ct >= 0.75) {
        this.ct = 0;
        this.count--;
        if (this.count > 0) A.sfx('leader');
        else G.go(() => G.scenes.studio(), { dur: 0.3 });
      }
    },
    draw() {
      const c = G.ctx;
      c.fillStyle = '#c9bfae';
      c.fillRect(0, 0, G.W, G.H);
      const cx = G.W / 2,
        cy = G.H / 2;
      K.seed(3);
      // sweep wedge
      if (this.count > 0) {
        c.fillStyle = '#8f8676';
        c.beginPath();
        c.moveTo(cx, cy);
        c.arc(cx, cy, 700, -Math.PI / 2, -Math.PI / 2 + (this.ct / 0.75) * Math.PI * 2);
        c.closePath();
        c.fill();
      }
      K.line([[0, cy], [G.W, cy]], 3);
      K.line([[cx, 0], [cx, G.H]], 3);
      K.blob(cx, cy, 200, 200, null, { lw: 5 });
      K.blob(cx, cy, 170, 170, null, { lw: 3 });
      const n = this.count > 0 ? String(this.count) : '';
      if (n) K.text(n, cx, cy + 8, 220, { font: K.F.deco, fill: K.INK, lw: 0, shadow: false });
      else {
        K.text('WICK', cx, cy - 40, 72, { fill: C.cream, wave: 2 });
        K.text('& THE LOST REELS', cx, cy + 20, 26, { font: K.F.deco, fill: C.cream, lw: 4 });
        if (Math.floor(this.t * 2) % 2 === 0) K.text('PRESS ANY KEY TO ROLL FILM', cx, cy + 90, 22, { fill: C.red, lw: 4 });
        K.para('Best with sound on.', cx, cy + 128, 400, 14, { align: 'center', fill: '#4a4036' });
      }
    },
  });

  // ---------- studio card ----------
  G.scenes.studio = () => ({
    t: 0,
    enter() {
      A.sfx('announce');
    },
    update(dt) {
      this.t += dt;
      if (this.t > 2.6 || (this.t > 0.5 && I.anyPressed)) G.go(() => G.scenes.title());
    },
    draw() {
      const c = G.ctx;
      c.fillStyle = K.INK;
      c.fillRect(0, 0, G.W, G.H);
      K.seed(4);
      // the inkpot mascot bows
      const bow = Math.max(0, Math.sin(Math.min(1, this.t / 1.2) * Math.PI)) * 0.4;
      c.save();
      c.translate(G.W / 2, 290);
      c.rotate(bow * 0.3);
      K.rrect(-40, -70, 80, 80, 14, '#2d3350', { lw: 3.5, stroke: C.cream });
      K.rrect(-26, -88, 52, 22, 5, '#2d3350', { lw: 3.5, stroke: C.cream });
      K.pieEye(-13, -34, 8, 12, 0, 0, 0);
      K.pieEye(13, -34, 8, 12, 0, 0, 0);
      K.shape([[-14, -10], [14, -10], [0, 2]], C.red, { lw: 2.5, stroke: C.cream, smooth: true });
      c.restore();
      K.text('INKPOT PICTURES', G.W / 2, 360, 40, { font: K.F.deco, fill: C.cream, lw: 0, shadow: false });
      K.text('presents', G.W / 2, 400, 22, { font: K.F.type, fill: C.cream, lw: 0, shadow: false, alpha: Math.min(1, this.t) });
    },
  });

  // ---------- stage dressing shared with cutscenes ----------
  G.paintCurtains = (t, open = 1) => {
    const c = G.ctx;
    const w = 150 + (1 - open) * 330;
    [0, 1].forEach((side) => {
      c.save();
      if (side) {
        c.translate(G.W, 0);
        c.scale(-1, 1);
      }
      const g = c.createLinearGradient(0, 0, w, 0);
      for (let i = 0; i <= 6; i++) {
        g.addColorStop(i / 6, i % 2 ? '#7d1a17' : '#b52a23');
      }
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(w, 0);
      c.quadraticCurveTo(w - 30 + Math.sin(t) * 6, G.H * 0.6, w - 60, G.H);
      c.lineTo(0, G.H);
      c.fill();
      c.strokeStyle = K.INK;
      c.lineWidth = 4;
      c.stroke();
      // tie-back rope
      K.seed(40 + side);
      K.blob(w - 50, 330, 12, 6, C.gold, { lw: 2.5 });
      c.restore();
    });
    // valance
    c.fillStyle = '#9b221d';
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(G.W, 0);
    c.lineTo(G.W, 50);
    for (let i = 12; i >= 0; i--) c.quadraticCurveTo(i * 80 + 40, 80, i * 80, 50);
    c.fill();
    c.strokeStyle = K.INK;
    c.lineWidth = 4;
    c.stroke();
    for (let i = 0; i < 12; i++) {
      K.seed(60 + i);
      K.blob(i * 80 + 40, 72, 5, 8, C.gold, { lw: 2 });
    }
  };

  G.paintMarquee = (x, y, w, h, t) => {
    K.seed(70);
    K.rrect(x, y, w, h, 18, '#2b1d18', { lw: 4.5 });
    K.rrect(x + 12, y + 12, w - 24, h - 24, 12, null, { lw: 2.5, stroke: C.gold });
    const per = 2 * (w + h);
    const n = Math.floor(per / 26);
    for (let i = 0; i < n; i++) {
      let d = (i / n) * per;
      let bx, by;
      if (d < w) (bx = x + d), (by = y);
      else if ((d -= w) < h) (bx = x + w), (by = y + d);
      else if ((d -= h) < w) (bx = x + w - d), (by = y + h);
      else (d -= w), (bx = x), (by = y + h - d);
      const on = (i + Math.floor(t * 8)) % 3 === 0;
      K.blob(bx, by, 6, 6, on ? '#fff3b0' : '#8a6a2a', { lw: 2, amt: 0.3 });
    }
  };

  // ---------- title ----------
  G.scenes.title = () => {
    const S = {
      t: 0,
      menu: null,
      enter() {
        A.play('title');
      },
      buildMenu() {
        const items = [];
        if (G.hasSave())
          items.push({
            label: 'CONTINUE',
            action: () => {
              G.load();
              G.go(() => G.scenes.town());
            },
          });
        items.push({
          label: 'NEW GAME',
          action: () => {
            const begin = () => {
              G.state = G.newState();
              G.save();
              G.go(() => G.scenes.cutscene('intro', () => G.go(() => G.scenes.town())));
            };
            if (G.hasSave()) U.confirm('Start over? Your saved game will be replaced.', begin);
            else begin();
          },
        });
        items.push({ label: 'HOW TO PLAY', action: () => U.openPause && S.showHelp() });
        items.push({ label: 'OPTIONS', action: () => U.openPause(() => {}) || U.panel.build('opts') });
        this.menu = new U.Menu(items);
      },
      showHelp() {
        U.openPause(() => {});
        U.panel.build('help');
      },
      update(dt) {
        this.t += dt;
        if (!this.menu) {
          if (this.t > 0.6 && (I.anyPressed || I.mouse.pressed)) {
            A.sfx('confirm');
            this.buildMenu();
          }
          return;
        }
        this.menu.update(dt);
      },
      draw() {
        const c = G.ctx;
        const t = this.t;
        // stage backdrop
        const g = c.createRadialGradient(G.W / 2, 200, 40, G.W / 2, 260, 520);
        g.addColorStop(0, '#6a4a6e');
        g.addColorStop(1, '#241629');
        c.fillStyle = g;
        c.fillRect(0, 0, G.W, G.H);
        // spotlight
        c.save();
        c.globalAlpha = 0.25;
        c.fillStyle = '#fff2c4';
        c.beginPath();
        c.moveTo(G.W / 2 - 40, 0);
        c.lineTo(G.W / 2 + 40, 0);
        c.lineTo(G.W / 2 + 220, G.H);
        c.lineTo(G.W / 2 - 220, G.H);
        c.fill();
        c.restore();
        // stage floor
        c.fillStyle = '#6b4128';
        c.fillRect(0, 440, G.W, 100);
        for (let i = 0; i < 12; i++) {
          c.strokeStyle = 'rgba(29,21,16,0.5)';
          c.lineWidth = 2;
          c.beginPath();
          c.moveTo(i * 90, 440);
          c.lineTo(i * 90 - 40, G.H);
          c.stroke();
        }
        K.line([[0, 440], [G.W, 440]], 4);
        K.wash(G.W / 2, 470, 240, 40, 'rgba(255,240,200,0.55)');
        // marquee
        G.paintMarquee(230, 70, 500, 190, t);
        const bounce = Math.abs(Math.sin(G.animT * 3)) * 6;
        K.text('WICK', G.W / 2, 140 - bounce, 92, { fill: C.cream, wave: 3, lw: 12 });
        K.text('& THE LOST REELS', G.W / 2, 216, 34, { font: K.F.deco, fill: C.gold, lw: 6 });
        // dancing duo
        const beat = G.animT * 5.6;
        CH.wick(G.W / 2 - 250, 470 - Math.abs(Math.sin(beat)) * 18, { scale: 1.6, pose: Math.floor(beat / Math.PI) % 2 ? 'cheer' : 'wave', moving: false, fx: 0.3, mood: 'grin', seed: 12 });
        CH.toon(G.W / 2 + 250, 470 - Math.abs(Math.sin(beat + 1.5)) * 10, CH.cast.granny, { scale: 1.6, mood: 'happy', talk: false, moving: true, phase: beat, seed: 30 });
        G.paintCurtains(t, 1);
        if (!this.menu) {
          if (Math.floor(t * 2) % 2 === 0) K.text('PRESS ANY BUTTON', G.W / 2, 350, 30, { fill: C.cream, lw: 5 });
        } else {
          c.save();
          c.fillStyle = 'rgba(20,10,5,0.35)';
          c.fillRect(300, 280, 360, 175);
          c.restore();
          this.menu.draw(G.W / 2, 305, { size: 28, gap: 42 });
        }
        K.text('© INKPOT PICTURES  ·  A CURIO SHOP CARTOON', G.W / 2, 525, 12, { font: K.F.deco, fill: C.cream, lw: 0, shadow: false, alpha: 0.7 });
      },
    };
    return S;
  };
})();
