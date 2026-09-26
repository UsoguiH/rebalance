// Game: canvas setup, main loop, scene switching with iris wipes.
(function () {
  const K = G.ink,
    I = G.input,
    U = G.ui,
    A = G.audio,
    F = G.fx;
  G.scenes = G.scenes || {};

  let canvas, q = 1;
  function resize() {
    const ww = window.innerWidth,
      wh = window.innerHeight;
    const scale = Math.min(ww / G.W, wh / G.H);
    const cw = Math.floor(G.W * scale),
      chh = Math.floor(G.H * scale);
    canvas.style.width = cw + 'px';
    canvas.style.height = chh + 'px';
    const dpr = window.devicePixelRatio || 1;
    q = G.clamp(Math.round(((cw * dpr) / G.W) * 2) / 2, 1, 2);
    canvas.width = G.W * q;
    canvas.height = G.H * q;
  }

  // ---------- transitions ----------
  G.trans = null;
  G.go = (make, o = {}) => {
    if (G.trans) return;
    G.trans = { t: 0, make, dur: o.dur || 0.5, cx: o.cx == null ? G.W / 2 : o.cx, cy: o.cy == null ? G.H / 2 : o.cy, phase: 'out', hold: o.hold || 0.12 };
  };
  G.setScene = (sc) => {
    if (G.scene && G.scene.exit) G.scene.exit();
    U.panel = null;
    U.dialog = null;
    F.clear();
    G.scene = sc;
    if (sc.enter) sc.enter();
  };
  function updateTrans(dt) {
    const tr = G.trans;
    if (!tr) return;
    tr.t += dt;
    if (tr.phase === 'out' && tr.t >= tr.dur) {
      tr.phase = 'hold';
      tr.t = 0;
      G.setScene(tr.make());
      tr.cx = G.W / 2;
      tr.cy = G.H / 2;
      if (G.scene.irisAt) {
        tr.cx = G.scene.irisAt.x;
        tr.cy = G.scene.irisAt.y;
      }
    } else if (tr.phase === 'hold' && tr.t >= tr.hold) {
      tr.phase = 'in';
      tr.t = 0;
    } else if (tr.phase === 'in' && tr.t >= tr.dur) G.trans = null;
  }
  function drawTrans() {
    const tr = G.trans;
    if (!tr) return;
    const M = 1150;
    let r;
    if (tr.phase === 'out') r = M * (1 - G.easeIn(Math.min(1, tr.t / tr.dur)));
    else if (tr.phase === 'hold') r = 0;
    else r = M * G.easeOut(Math.min(1, tr.t / tr.dur));
    F.drawIris(r, tr.cx, tr.cy);
  }

  // ---------- loop ----------
  let last = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    G.dt = dt;
    G.t += dt;
    G.boil = Math.floor(G.t * 10);
    G.animT = Math.floor(G.t * 24) / 24;

    if (I.hit('mute')) {
      A.toggleMute();
      U.toastMsg(A.muted ? 'SOUND OFF' : 'SOUND ON');
    }
    updateTrans(dt);
    let gdt = dt;
    if (F.hitStop > 0) {
      F.hitStop -= dt;
      gdt = 0;
    }
    if (G.scene && (!G.trans || G.trans.phase === 'in')) {
      if (U.dialog) U.updateDialog(dt);
      else if (U.panel) U.panel.update(dt);
      else G.scene.update(gdt);
    }
    F.update(gdt);

    const c = G.ctx;
    c.setTransform(q, 0, 0, q, 0, 0);
    c.fillStyle = K.INK;
    c.fillRect(0, 0, G.W, G.H);
    c.save();
    const sh = F.shake;
    c.translate((Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh + F.gateOffset());
    if (G.scene) G.scene.draw();
    c.restore();
    if (U.panel) U.panel.draw();
    U.drawDialog();
    U.drawToast();
    if (G.scene && G.scene.drawOver) G.scene.drawOver();
    drawTrans();
    F.post();
    I.endFrame();
  }

  G.boot = () => {
    canvas = document.getElementById('screen');
    G.canvas = canvas;
    G.ctx = canvas.getContext('2d');
    G.bindMouse(canvas);
    canvas.addEventListener('mousedown', () => canvas.focus());
    canvas.focus();
    resize();
    window.addEventListener('resize', resize);
    F.init();
    G.setScene(G.scenes.boot());
    requestAnimationFrame(frame);
  };

  // wait for the vintage fonts, but never hang if they are blocked
  const start = () => {
    if (G.started) return;
    G.started = true;
    G.boot();
  };
  window.addEventListener('load', () => {
    const fonts = ['40px Chango', '20px Limelight', '20px "Special Elite"'];
    if (document.fonts && document.fonts.load) {
      Promise.all(fonts.map((f) => document.fonts.load(f))).then(start, start);
      setTimeout(start, 2500);
    } else start();
  });
})();
