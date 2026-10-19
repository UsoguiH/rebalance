// Main: the master timeline, the letterbox, and the player (play/pause,
// scrubbing, frame stepping). M.renderAt(t) draws any frame on demand.
(function () {
  const S = M.scenes;
  const { W, H } = M;
  M.DURATION = 26.6;

  // [start, scene] in seconds; each scene runs until the next one starts
  const TIMELINE = [
    [0, S.intro],
    [3.345, S.montage],
    [7.613, S.but],
    [9.904, S.lifeSaver],
    [12.74, S.noMore],
    [15.135, S.costs],
    [17.056, S.payOnce],
    [18.714, S.video],
    [20.082, S.image],
    [23.05, S.allInOne],
  ];

  // letterbox bar height per side, measured off the original
  const BARS = [
    [0, 0], [1.75, 0], [2.01, 20, 'inQuad'], [2.28, 45, 'linear'], [2.6, 51, 'outQuad'],
    [7.98, 51], [8.21, 62, 'inQuad'], [8.39, 93, 'inQuad'], [8.52, 155, 'linear'], [8.74, 198, 'outQuad'], [8.95, 206, 'outQuad'],
    [9.55, 206], [9.74, 190, 'inQuad'], [9.87, 144, 'inQuad'], [9.94, 90, 'linear'], [10.08, 57, 'outQuad'], [10.36, 43, 'outQuad'],
    [13.86, 44], [14.54, 51, 'inQuad'], [14.94, 66, 'inQuad'], [15.13, 80, 'linear'],
    [15.135, 105], [15.36, 131, 'outQuad'], [15.7, 147, 'outQuad'], [16.5, 157, 'outQuad'],
    [16.95, 157], [17.06, 122, 'inQuad'], [17.25, 95, 'outQuad'], [17.66, 69, 'outQuad'], [18.18, 52, 'outQuad'], [18.84, 42, 'outQuad'],
    [25.5, 42],
  ];

  const sceneAt = (t) => {
    let i = TIMELINE.length - 1;
    while (i > 0 && t < TIMELINE[i][0]) i--;
    return TIMELINE[i][1];
  };

  M.renderAt = (c, t) => {
    M.releaseAll();
    c.save();
    c.fillStyle = '#000';
    c.fillRect(0, 0, W, H);
    const scene = sceneAt(t);
    if (scene) scene(c, t);
    c.restore();
    const b = M.key(t, BARS);
    M.bars(c, b, b);
  };

  // ---------- player ----------
  M.boot = async (canvas) => {
    const c = canvas.getContext('2d');
    const weights = [400, 500, 600, 700, 800];
    try {
      await Promise.all(weights.map((w) => document.fonts.load(`${w} 40px Inter`)));
      await document.fonts.load('italic 500 40px Inter');
    } catch (e) {}
    const q = new URLSearchParams(location.search);
    const state = { t: parseFloat(q.get('t') || '0') || 0, playing: !q.has('paused'), rate: 1, last: 0 };
    M.player = state;
    if (q.has('render')) {
      // headless rendering: the caller drives M.frame(t)
      M.frame = (t) => M.renderAt(c, t);
      window.motionReady = true;
      return;
    }
    const ui = {
      play: document.getElementById('play'),
      scrub: document.getElementById('scrub'),
      time: document.getElementById('time'),
      rate: document.getElementById('rate'),
    };
    const fmt = (t) => `${t.toFixed(2).padStart(5, '0')}s  ·  frame ${Math.round(t * M.FPS)}`;
    const show = () => {
      ui.scrub.value = String(state.t / M.DURATION);
      ui.time.textContent = fmt(state.t);
      ui.play.textContent = state.playing ? 'Pause' : 'Play';
    };
    const step = (dt) => {
      state.playing = false;
      state.t = M.clamp(state.t + dt, 0, M.DURATION);
      M.renderAt(c, state.t);
      show();
    };
    ui.play.onclick = () => {
      if (state.t >= M.DURATION - 0.01) state.t = 0;
      state.playing = !state.playing;
      show();
    };
    ui.scrub.oninput = () => {
      state.t = parseFloat(ui.scrub.value) * M.DURATION;
      state.playing = false;
      M.renderAt(c, state.t);
      show();
    };
    ui.rate.onclick = () => {
      state.rate = state.rate === 1 ? 0.25 : state.rate === 0.25 ? 0.5 : 1;
      ui.rate.textContent = `${state.rate}x`;
    };
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        ui.play.onclick();
      } else if (e.code === 'ArrowRight') step(e.shiftKey ? 1 : 1 / M.FPS);
      else if (e.code === 'ArrowLeft') step(e.shiftKey ? -1 : -1 / M.FPS);
      else if (e.code === 'Home') step(-M.DURATION);
    });
    const tick = (now) => {
      const dt = state.last ? Math.min(0.1, (now - state.last) / 1000) : 0;
      state.last = now;
      if (state.playing) {
        state.t += dt * state.rate;
        if (state.t >= M.DURATION) {
          state.t = q.has('loop') ? 0 : M.DURATION;
          if (!q.has('loop')) state.playing = false;
        }
        M.renderAt(c, state.t);
        show();
      }
      requestAnimationFrame(tick);
    };
    M.renderAt(c, state.t);
    show();
    requestAnimationFrame(tick);
  };
})();
