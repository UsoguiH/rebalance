// Player: play/pause, scrubbing, frame stepping, and an optional voiceover
// track kept in sync with the timeline. A piece defines M.DURATION and
// M.renderAt(c, t), and may set M.AUDIO to the URL of its soundtrack.
(function () {
  M.boot = async (canvas) => {
    const c = canvas.getContext('2d');
    const weights = [400, 500, 600, 700, 800];
    try {
      await Promise.all(weights.map((w) => document.fonts.load(`${w} 40px Inter`)));
      await document.fonts.load('italic 500 40px Inter');
      await Promise.all((M.EXTRA_FONTS || []).map((f) => document.fonts.load(f)));
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

    // soundtrack: optional; the piece still plays silently if it is missing
    let audio = null;
    if (M.AUDIO) {
      const a = new Audio();
      a.preload = 'auto';
      a.oncanplay = () => (audio = a);
      a.src = M.AUDIO;
    }
    const syncAudio = () => {
      if (!audio) return;
      if (state.playing && state.t < M.DURATION) {
        audio.playbackRate = state.rate;
        if (Math.abs(audio.currentTime - state.t) > 0.08) audio.currentTime = state.t;
        // autoplay with sound may be blocked until the viewer clicks Play
        if (audio.paused) audio.play().catch(() => {});
      } else if (!audio.paused) audio.pause();
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
      syncAudio();
      M.renderAt(c, state.t);
      show();
    };
    ui.play.onclick = () => {
      if (state.t >= M.DURATION - 0.01) state.t = 0;
      state.playing = !state.playing;
      syncAudio();
      show();
    };
    ui.scrub.oninput = () => {
      state.t = parseFloat(ui.scrub.value) * M.DURATION;
      state.playing = false;
      syncAudio();
      M.renderAt(c, state.t);
      show();
    };
    ui.rate.onclick = () => {
      state.rate = state.rate === 1 ? 0.25 : state.rate === 0.25 ? 0.5 : 1;
      ui.rate.textContent = `${state.rate}x`;
      syncAudio();
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
        // the soundtrack is the clock while it plays
        state.t = audio && !audio.paused ? audio.currentTime : state.t + dt * state.rate;
        if (state.t >= M.DURATION) {
          state.t = q.has('loop') ? 0 : M.DURATION;
          if (!q.has('loop')) state.playing = false;
          syncAudio();
        }
        M.renderAt(c, state.t);
        show();
      }
      syncAudio();
      requestAnimationFrame(tick);
    };
    M.renderAt(c, state.t);
    show();
    requestAnimationFrame(tick);
  };
})();
