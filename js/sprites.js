// Sprites: loads the baked sprite sheets listed in assets/atlas.js and plays their
// animations. The hero sprite replaces the procedural hero everywhere it is drawn.
(function () {
  const CH = G.chars;
  const SP = (G.spr = { img: {} });
  const A = () => G.ATLAS || {};

  Object.keys(A()).forEach((name) => {
    const im = new Image();
    im.onload = () => (im.ok = true);
    im.src = 'assets/' + name + '.png';
    SP.img[name] = im;
  });
  SP.ok = (sheet) => !!(SP.img[sheet] && SP.img[sheet].ok);

  // frame index inside an animation, from time (s) or an explicit 0..1 progress
  SP.index = (sheet, anim, t, progress) => {
    const a = A()[sheet].anims[anim];
    if (!a) return 0;
    const n = a.frames.length;
    let k = progress != null ? Math.floor(progress * n) : Math.floor(t * a.fps);
    k = a.loop ? ((k % n) + n) % n : Math.min(n - 1, Math.max(0, k));
    return a.frames[k];
  };
  SP.drawFrame = (sheet, i, x, y, o = {}) => {
    const R = A()[sheet];
    const img = SP.img[sheet];
    const col = i % R.cols,
      row = Math.floor(i / R.cols);
    const s = o.scale || 1;
    const c = G.ctx;
    c.save();
    c.translate(x, y);
    if (o.flip) c.scale(-1, 1);
    if (o.alpha != null) c.globalAlpha *= o.alpha;
    c.drawImage(img, col * R.cw * R.S, row * R.ch * R.S, R.cw * R.S, R.ch * R.S, -R.ax * s, -R.ay * s, R.cw * s, R.ch * s);
    c.restore();
  };
  SP.play = (sheet, anim, t, x, y, o = {}) => SP.drawFrame(sheet, SP.index(sheet, anim, t, o.progress), x, y, o);

  // ---------- hero ----------
  const TAU = Math.PI * 2;
  const viewOf = (fx, fy) => (Math.abs(fx) >= Math.abs(fy) * 0.8 ? 'side' : fy < 0 ? 'up' : 'down');
  const aimOf = (a) => {
    const flip = Math.cos(a) < -0.01;
    const m = Math.atan2(Math.sin(a), Math.abs(Math.cos(a))) * (180 / Math.PI);
    const d = m < -67.5 ? 'up' : m < -22.5 ? 'diagup' : m <= 22.5 ? 'side' : m <= 67.5 ? 'diagdown' : 'down';
    return { d, flip: flip && d !== 'up' && d !== 'down' };
  };

  const proc = CH.wick;
  CH.wickProc = proc;
  CH.wick = (x, y, p = {}) => {
    if (!SP.ok('hero')) return proc(x, y, p);
    const fx = p.fx == null ? 1 : p.fx,
      fy = p.fy || 0;
    const o = { scale: p.scale || 1, alpha: p.alpha };
    let anim,
      t = G.animT + (p.seed || 0) * 0.37,
      progress = null,
      flip = false;
    if (p.rolling) {
      const v = p.rollView || 'side';
      anim = 'dash_' + v;
      progress = Math.min(0.999, p.rollT || 0);
      flip = v === 'side' && (p.rollDir || 1) < 0;
    } else if (p.hurtT != null) {
      anim = 'hurt';
      progress = Math.min(0.999, p.hurtT);
      flip = fx < 0;
    } else if (p.pose === 'cheer') anim = 'cheer';
    else if (p.pose === 'wave' || p.mood === 'talk') anim = 'talk';
    else if (p.pose === 'shrug' || p.mood === 'o') {
      anim = 'hurt';
      progress = 0.6;
      flip = fx < 0;
    } else if (p.aim != null) {
      const q = aimOf(p.aim);
      anim = (p.moving ? 'runshoot_' : 'shoot_') + q.d;
      flip = q.flip;
      if (p.moving) progress = ((p.phase || 0) / TAU) % 1;
    } else {
      const v = viewOf(fx, fy);
      flip = v === 'side' && fx < 0;
      if (p.moving) {
        anim = 'run_' + v;
        progress = ((p.phase || 0) / TAU) % 1;
      } else anim = 'idle_' + v;
    }
    o.flip = flip;
    o.progress = progress;
    SP.play('hero', anim, t, x, y, o);
  };

  const ghostProc = CH.wickGhost;
  CH.wickGhost = (x, y, s = 1) => {
    if (!SP.ok('hero')) return ghostProc(x, y, s);
    SP.play('hero', 'ghost', G.animT, x, y + 20, { scale: s * 0.8 });
  };
  CH.heroDeath = (x, y, t) => {
    if (!SP.ok('hero')) return;
    SP.play('hero', 'death', t, x, y);
  };
})();
