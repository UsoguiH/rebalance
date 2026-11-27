// Slate's loading screen (slateteams.com), ported from their <c-preloader> script.
// Their Rive file loops its idle animation until the view-model flag `siteLoaded` is set,
// then plays the ribbon reveal; the overlay goes once the state machine reaches its
// "loaded" state (or after 3.25s, their fallback). Its cursor is drawn by monika.js.
//
// No dead first second: until the animation player is in, this script draws the cursor itself
// from the very first frame. It enters from the left with exactly the motion Slate's cursor has
// when it sweeps in to open the site (recorded from it), reaches the middle and spins there
// (a new colour and name each turn). It never goes backward: Slate's own cursor stays hidden
// while it idles, spins and dives back to the left edge; when the opening sweep comes in from
// its edge (the left, or the top on a phone) and its tip reaches the cursor, the cursor joins it
// and leads it off. During the opening sweep the spring
// tightens so the cursor rides the ribbons' tip.
// MonikaLoader.replay() plays it again.
(function () {
  'use strict';
  const REVEAL_TIMEOUT = 3250; // Slate's values
  const PLAY_DELAY = 150;
  const ENTRY_MS = 820;        // intro: enter from the left to the middle (Slate's sweep motion)
  const TURN_MS = 900;         // intro: one spin
  const SWEEP_ETA = 620;       // Slate's sweep takes about this long from the left edge to the cursor
  const MIN_IDLE = 0;          // open as soon as everything is in: the intro covers the wait
  const GIVE_UP = 12000;       // if the animation never loads, fade to the page anyway
  const HONEY = 5;             // how runny the cursor is while loading (see AgentCursor.smooth)
  const TIGHT = 0.5;           // ...and during the opening sweep, so it stays on the ribbons' tip
  const GROW = 2.6;            // matches data-monika-scale on the loader canvas
  const portrait = matchMedia('(orientation: portrait)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const AC = window.AgentCursor;

  function markup() {
    const root = document.createElement('div');
    root.className = 'c-preloader';
    root.setAttribute('role', 'progressbar');
    root.setAttribute('aria-label', 'Loading');
    root.innerHTML = '<div class="c-preloader_placeholder" aria-hidden="true"></div><div class="c-preloader_stage"><canvas class="c-preloader_rive" data-monika-scale="' + GROW + '"></canvas></div><canvas class="c-preloader_intro" aria-hidden="true"></canvas>';
    document.body.prepend(root);
    return root;
  }

  // ---------------------------------------------------------------- Rive player, loaded in the background
  const pageLoaded = new Promise((res) => (document.readyState === 'complete' ? res() : addEventListener('load', res, { once: true })));
  let riveReady = null;
  function whenRive() {
    if (riveReady) return riveReady;
    riveReady = new Promise((res, rej) => {
      const go = () => {
        const R = window.rive;
        if (!R) return rej(new Error('Rive player missing'));
        R.Rive.suppressDeprecationWarnings = ['state-change-events'];
        if (window.RIVE_WASM_URL_OVERRIDE) { R.RuntimeLoader.setWasmUrl(window.RIVE_WASM_URL_OVERRIDE); return res(R); }
        if (location.protocol !== 'file:') { R.RuntimeLoader.setWasmUrl(new URL('vendor/rive-canvas-lite/rive.wasm', location.href).href); return res(R); }
        // opened straight from disk: the browser will not fetch the .wasm, so use the inlined copy
        const s = document.createElement('script');
        s.src = 'vendor/rive-canvas-lite/rive-wasm.js';
        s.onload = () => { R.RuntimeLoader.setWasmUrl(window.RIVE_CANVAS_WASM_URL); res(R); };
        s.onerror = () => rej(new Error('rive-wasm.js missing'));
        document.head.appendChild(s);
      };
      if (window.rive) go();
      else if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go, { once: true });
      else pageLoaded.then(go);
    });
    return riveReady;
  }
  function buffer() {
    const b64 = window.SLATE_RIVS && window.SLATE_RIVS.preloader;
    if (b64) {
      const bin = atob(b64), out = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
      return Promise.resolve(out.buffer);
    }
    return fetch('slate-assets/preloader.riv').then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error('missing preloader.riv'))));
  }

  // ---------------------------------------------------------------- pose helpers
  // a pose maps cursor units to canvas pixels: tip at (x, y), turned by a, scaled by s
  const poseAt = (x, y, a, s) => new DOMMatrix().translate(x, y).rotate((a * 180) / Math.PI).scale(s).translate(-AC.TIP.x, -AC.TIP.y);
  // the arrow's own middle, which it spins about
  const CENTER = AC.ARROW.reduce((c, p) => [c[0] + p[0] / AC.ARROW.length, c[1] + p[1] / AC.ARROW.length], [0, 0]);

  // ---------------------------------------------------------------- one run
  function run(root) {
    root = root || document.querySelector('.c-preloader') || markup();
    const canvas = root.querySelector('.c-preloader_rive');
    const intro = root.querySelector('.c-preloader_intro');
    const ictx = intro.getContext('2d');
    const started = performance.now();
    let r = null, dismissed = false, vertical = null;

    // ------------------------------------------------ intro cursor
    const rig = AC.newRig();
    let introOn = true, dpr = 1, W = 0, H = 0, unit = 1;
    const fitIntro = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = Math.round(innerWidth * dpr); H = Math.round(innerHeight * dpr);
      intro.width = W; intro.height = H;
      // the same size Slate's cursor will have: 0.213% of the screen's long side (x2.6)
      unit = 0.00213 * (portrait.matches ? innerHeight : innerWidth) * dpr;
    };
    fitIntro();

    // Entrance: the path Slate's cursor takes when it sweeps in from the left to open the site,
    // recorded frame by frame from their animation: [time 0..1, x (1 = the middle), y offset in
    // screen heights, size]. Its speed is kept as recorded for the first 60% of the time, then it
    // eases to a stop in the middle so it can spin there.
    const ENTRY = [[0.0,0.0045,0.0052,0.715],[0.0219,0.0059,0.0052,0.719],[0.0436,0.0079,0.0052,0.724],[0.066,0.0103,0.0052,0.73],[0.0883,0.0132,0.0052,0.737],[0.1096,0.0168,0.0051,0.744],[0.1316,0.0209,0.0048,0.752],[0.153,0.0257,0.0043,0.761],[0.1741,0.0312,0.0036,0.77],[0.1958,0.0371,0.0025,0.779],[0.2184,0.0438,0.0013,0.789],[0.2403,0.0511,-0.0003,0.8],[0.2618,0.0592,-0.0023,0.811],[0.2839,0.0681,-0.0046,0.822],[0.3052,0.0776,-0.0072,0.833],[0.3276,0.0881,-0.01,0.845],[0.3489,0.0991,-0.013,0.856],[0.3701,0.111,-0.016,0.868],[0.3917,0.1238,-0.0188,0.879],[0.4134,0.1374,-0.0212,0.891],[0.4352,0.1521,-0.0233,0.901],[0.4567,0.1677,-0.0248,0.912],[0.4786,0.184,-0.026,0.922],[0.5005,0.2016,-0.0268,0.932],[0.5222,0.2202,-0.0272,0.941],[0.544,0.2397,-0.0273,0.949],[0.5655,0.2607,-0.0266,0.957],[0.5871,0.2824,-0.0248,0.964],[0.6088,0.3057,-0.0217,0.971],[0.6306,0.3302,-0.0174,0.977],[0.6524,0.3558,-0.012,0.982],[0.6741,0.3829,-0.0055,0.986],[0.6957,0.4115,0.0016,0.99],[0.7178,0.4415,0.0089,0.994],[0.7394,0.4731,0.0161,0.996],[0.7613,0.5061,0.0226,0.998],[0.7828,0.5411,0.0281,1],[0.8046,0.5776,0.0325,1],[0.8265,0.6165,0.0357,1.001],[0.848,0.6566,0.0376,1.001],[0.8698,0.6991,0.0383,1.001],[0.8916,0.7435,0.0376,1.001],[0.9131,0.7901,0.0345,1.001],[0.935,0.8391,0.0287,1.001],[0.9568,0.89,0.0206,1.001],[0.9786,0.9435,0.0107,1.001],[1.0,1.0,0.0,1.001]];
    const A_IN = -0.1842; // the angle Slate's cursor holds through the sweep
    const SPLIT = 0.6, K = 1 / (SPLIT + (1 - SPLIT) / 2);
    const entryTime = (tau) => (tau <= SPLIT ? K * tau : K * SPLIT + K * (tau - SPLIT) - (K * (tau - SPLIT) ** 2) / (2 * (1 - SPLIT)));
    function entryAt(u) {
      let i = 1;
      while (i < ENTRY.length - 1 && ENTRY[i][0] < u) i++;
      const a = ENTRY[i - 1], b = ENTRY[i], k = Math.min(1, Math.max(0, (u - a[0]) / (b[0] - a[0] || 1)));
      return [a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k, a[3] + (b[3] - a[3]) * k];
    }
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    let turnFrac = 0, introTipX = 0, introTipY = 0, lastSlateAlong = null, slateCross = null, slateDived = false, sweepAt = null, sweepFrom = null, sweepTo = null, revealAt = null;
    function introPose(now) {
      const t = reduced.matches ? ENTRY_MS : now - started;
      const cx = W / 2 - 46 * unit, cy = H / 2 - 12 * unit; // tip spot that centres arrow + pill
      if (t < ENTRY_MS) {
        const tau = t / ENTRY_MS;
        const [rx, ry, rs] = entryAt(entryTime(tau));
        // the recorded path, from the left edge (where Slate's starts) to the middle spot
        const x = rx * cx, y = cy + ry * H;
        const settle = tau <= SPLIT ? 0 : ease((tau - SPLIT) / (1 - SPLIT));
        introTipX = x; introTipY = y;
        return { pose: poseAt(x, y, A_IN * (1 - settle), unit * (rs / 1.001)), variant: 1 };
      }
      // spin in place about the arrow's middle, easing in and out of each turn. Once the opening
      // sweep starts in from the left, the turns are timed to end, upright, just as its tip
      // reaches the cursor, so it never stands still
      let turns = (t - ENTRY_MS) / TURN_MS;
      if (sweepAt != null) {
        if (sweepFrom == null) {
          sweepFrom = Math.max(0, (sweepAt - started - ENTRY_MS) / TURN_MS);
          sweepTo = Math.max(1, Math.ceil(sweepFrom + 0.35));
        }
        turns = sweepFrom + (sweepTo - sweepFrom) * Math.min(1, (now - sweepAt) / SWEEP_ETA);
      }
      const n = Math.floor(turns);
      turnFrac = turns - n;
      const a = (n + ease(turnFrac)) * Math.PI * 2;
      // during the last turn, drift onto the line the sweep's tip is running along, to meet it exactly
      let tx = cx, ty = cy;
      if (sweepAt != null && slateCross != null) {
        const k = ease(Math.min(1, (now - sweepAt) / SWEEP_ETA));
        if (portrait.matches) tx = cx + (slateCross - cx) * k; else ty = cy + (slateCross - cy) * k;
      }
      introTipX = tx; introTipY = ty;
      const c = poseAt(tx, ty, 0, unit).transformPoint(new DOMPoint(CENTER[0], CENTER[1]));
      const m = new DOMMatrix().translate(c.x, c.y).rotate((a * 180) / Math.PI).scale(unit).translate(-CENTER[0], -CENTER[1]);
      return { pose: m, variant: 1 + (Math.min(n, sweepTo == null ? n : sweepTo - 1) % 4) }; // a new colour (and so a new name) each turn
    }

    AC.smooth = HONEY;
    rig.smooth = 0; // the intro follows its own path exactly
    rig.pillK = 520; rig.pillZ = 0.8; // and its name pill keeps close, as in the original spin
    (function frame(now) {
      if (!introOn || dismissed) { ictx.clearRect(0, 0, W, H); return; }
      requestAnimationFrame(frame);
      ictx.setTransform(1, 0, 0, 1, 0, 0);
      ictx.clearRect(0, 0, W, H);
      const { pose, variant } = introPose(now);
      AC.draw(ictx, rig, pose, 1, variant, now);
    })(performance.now());

    // first sight of Slate's cursor: hand the intro cursor's state (where it is, how fast it is
    // moving, its name, colour and pill) to Slate's canvas; the honey spring carries it on from
    // exactly there toward Slate's cursor, so there is no seam
    function handOver(variant) {
      introOn = false;
      AC.hook = null;
      const rect = canvas.getBoundingClientRect();
      const k = canvas.width / rect.width / dpr, ox = rect.left * dpr, oy = rect.top * dpr;
      const sm = rig.sm && Object.assign({}, rig.sm, {
        x: (rig.sm.x - ox) * k, y: (rig.sm.y - oy) * k, xV: rig.sm.xV * k, yV: rig.sm.yV * k,
        sx: rig.sm.sx * k, sy: rig.sm.sy * k, sxV: rig.sm.sxV * k, syV: rig.sm.syV * k,
      });
      AC.setRig(canvas, Object.assign(AC.newRig(), rig, {
        sm, smooth: undefined, pillK: undefined, pillZ: undefined, hsl: rig.hsl && rig.hsl.slice(),
        // keep the name it has; only the colour eases over to Slate's
        v: Math.round(variant), seen: Math.round(variant), seenAt: performance.now(),
        px: (rig.px - ox) * k, py: (rig.py - oy) * k, pxV: (rig.pxV || 0) * k, pyV: (rig.pyV || 0) * k,
      }));
      ictx.clearRect(0, 0, W, H);
      intro.style.display = 'none';
    }
    AC.hook = (cv, pose, variant) => {
      if (cv !== canvas || !introOn) return true;
      // hide Slate's cursor while it idles, spins and dives back to its starting edge; take over
      // when the opening sweep, coming in from that edge, reaches the intro cursor. Wide screens
      // sweep from the left, tall (portrait) screens from the top.
      if (!root.classList.contains('is-revealing')) return false;
      const rect = canvas.getBoundingClientRect(), k = rect.width / canvas.width;
      const x = (pose.a * AC.TIP.x + pose.c * AC.TIP.y + pose.e) * k + rect.left;
      const y = (pose.b * AC.TIP.x + pose.d * AC.TIP.y + pose.f) * k + rect.top;
      const tall = portrait.matches;
      const along = tall ? y : x, size = tall ? innerHeight : innerWidth;
      slateCross = (tall ? x : y) * dpr; // where across the screen the sweep's tip runs
      if (along < size * 0.08) slateDived = true;
      const forward = lastSlateAlong != null && along > lastSlateAlong;
      lastSlateAlong = along;
      // the sweep has really started (not just the small nudges while Slate pauses at the edge)
      if (slateDived && forward && along > size * 0.02 && sweepAt == null) sweepAt = performance.now();
      // safety net: never leave the intro cursor behind once the site is opening
      const late = revealAt != null && performance.now() - revealAt > 3000;
      if (!late && (!slateDived || !forward || along * dpr < (tall ? introTipY : introTipX))) return false;
      handOver(variant);
      return true;
    };

    // ------------------------------------------------ Slate's loader
    const onResize = () => { fitIntro(); r && r.resizeDrawingSurfaceToCanvas(); };
    const syncOrientation = () => {
      root.dataset.orientation = portrait.matches ? 'portrait' : 'landscape';
      if (vertical && vertical.value !== portrait.matches) vertical.value = portrait.matches;
      onResize();
    };
    const dismiss = () => {
      if (dismissed) return;
      dismissed = true;
      if (AC.hook && introOn) AC.hook = null;
      AC.smooth = 0;
      removeEventListener('resize', onResize);
      portrait.removeEventListener('change', syncOrientation);
      try { r && r.cleanup(); } catch (e) {}
      root.remove();
    };
    const reveal = () => {
      if (dismissed) return;
      revealAt = performance.now();
      // tighten the honey over a moment so the cursor rides the tip of the sweep
      const from = performance.now();
      (function tighten(now) {
        const k = Math.min(1, (now - from) / 350);
        AC.smooth = HONEY + (TIGHT - HONEY) * k;
        if (k < 1 && !dismissed) requestAnimationFrame(tighten);
      })(from);
      const loaded = r.viewModelInstance && r.viewModelInstance.boolean('siteLoaded');
      if (loaded) loaded.value = true;
      root.classList.add('is-revealing');
      setTimeout(dismiss, REVEAL_TIMEOUT);
    };
    // never strand the visitor: without the animation, fade straight to the page
    const giveUp = setTimeout(() => {
      if (dismissed || r) return;
      root.style.transition = 'opacity .4s';
      root.style.opacity = '0';
      setTimeout(dismiss, 420);
    }, GIVE_UP);

    syncOrientation();
    addEventListener('resize', onResize);
    portrait.addEventListener('change', syncOrientation);
    if (reduced.matches) { pageLoaded.then(() => setTimeout(dismiss, 900)); return; }

    // the .riv rides in on a deferred script too, so read it once the player is in
    whenRive().then((R) => buffer().then((buf) => [R, buf])).then(([R, buf]) => {
      if (dismissed) return;
      r = new R.Rive({
        buffer: buf,
        canvas,
        artboard: 'preloader',
        stateMachine: 'preloader',
        autoplay: true,
        autoBind: true,
        layout: new R.Layout({ fit: R.Fit.Fill }),
        onLoad() {
          if (dismissed) return;
          clearTimeout(giveUp);
          if (r.artboardWidth && r.artboardHeight) canvas.style.aspectRatio = `${r.artboardWidth} / ${r.artboardHeight}`;
          vertical = (r.viewModelInstance && r.viewModelInstance.boolean('aspectRatioVertical')) || null;
          syncOrientation();
          setTimeout(() => !dismissed && root.classList.add('is-playing'), PLAY_DELAY);
          pageLoaded.then(() => setTimeout(reveal, Math.max(0, MIN_IDLE - (performance.now() - started))));
        },
        onLoadError() { console.warn('[loader] could not load preloader.riv'); },
        onStateChange(e) {
          const states = (e && e.data) || [];
          if (root.classList.contains('is-revealing') && states.some((s) => typeof s === 'string' && s.toLowerCase().includes('loaded'))) dismiss();
        },
      });
    }, (e) => console.warn('[loader]', e.message, '- run node demo/agent-cursors/tools/fetch-slate-assets.js'));
  }

  window.MonikaLoader = {
    replay() {
      if (document.querySelector('.c-preloader')) return;
      run(markup());
    },
  };
  run();
})();
