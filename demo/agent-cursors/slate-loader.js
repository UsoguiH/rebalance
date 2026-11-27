// Slate's loading screen (slateteams.com), ported from their <c-preloader> script.
// Their Rive file loops its idle animation until the view-model flag `siteLoaded` is set,
// then plays the ribbon reveal; the overlay goes once the state machine reaches its
// "loaded" state (or after 3.25s, their fallback). Its cursor is drawn by monika.js.
//
// No dead first second: until the animation player is in, this script draws the cursor itself
// from the very first frame, spinning in the middle of the screen like a juggled club while it
// drifts round a small figure-eight (a new colour and name each turn). Everything is pulled through a soft
// spring, so the motion runs like honey: the intro, the handover to Slate's cursor (which just
// keeps the same position and speed) and Slate's own hops. During the opening sweep the spring
// tightens so the cursor rides the ribbons' tip.
// MonikaLoader.replay() plays it again.
(function () {
  'use strict';
  const REVEAL_TIMEOUT = 3250; // Slate's values
  const PLAY_DELAY = 150;
  const MIN_IDLE = 2000;       // the loader shows at least this long, then opens as soon as it can
  const INTRO_MIN = 1300;      // the spinning intro shows at least this long before Slate's cursor takes over
  const SPIN_MS = 1100;        // intro: one full turn
  const GIVE_UP = 12000;       // if the animation never loads, fade to the page anyway
  const LOOP_MS = 3400;        // intro: one small figure-eight, like a juggling cascade
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

    // juggling: the arrow spins about its own middle, like a club in the air, while that middle
    // drifts round a small figure-eight (a lemniscate) at the centre of the screen. Both start
    // from rest and ease up to speed.
    const TAU = 0.45; // seconds to ease up to speed from a standstill
    const ramp = (t, periodMs) => { const sec = t / 1000; return ((2 * Math.PI) / (periodMs / 1000)) * (sec - TAU * (1 - Math.exp(-sec / TAU))); };
    function introPose(now) {
      const t = reduced.matches ? 0 : now - started;
      // centre the arrow and its name pill together
      const mid = poseAt(W / 2 - 46 * unit, H / 2 - 12 * unit, 0, unit).transformPoint(new DOMPoint(CENTER[0], CENTER[1]));
      const A = Math.min(W, H) * 0.08, th = ramp(t, LOOP_MS);
      const cx = mid.x + A * Math.sin(th), cy = mid.y + A * 0.55 * Math.sin(2 * th);
      const spin = ramp(t, SPIN_MS);
      const pose = new DOMMatrix().translate(cx, cy).rotate((spin * 180) / Math.PI).scale(unit).translate(-CENTER[0], -CENTER[1]);
      return { pose, variant: 1 + (Math.floor(spin / (2 * Math.PI)) % 4) }; // a new colour (and name) each turn
    }

    AC.smooth = HONEY;
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
    function handOver() {
      introOn = false;
      AC.hook = null;
      const rect = canvas.getBoundingClientRect();
      const k = canvas.width / rect.width / dpr, ox = rect.left * dpr, oy = rect.top * dpr;
      const sm = rig.sm && Object.assign({}, rig.sm, {
        x: (rig.sm.x - ox) * k, y: (rig.sm.y - oy) * k, xV: rig.sm.xV * k, yV: rig.sm.yV * k,
        sx: rig.sm.sx * k, sy: rig.sm.sy * k, sxV: rig.sm.sxV * k, syV: rig.sm.syV * k,
      });
      AC.setRig(canvas, Object.assign(AC.newRig(), rig, {
        sm, hsl: rig.hsl && rig.hsl.slice(),
        px: (rig.px - ox) * k, py: (rig.py - oy) * k, pxV: (rig.pxV || 0) * k, pyV: (rig.pyV || 0) * k,
      }));
      ictx.clearRect(0, 0, W, H);
      intro.style.display = 'none';
    }
    AC.hook = (cv) => {
      if (cv !== canvas || !introOn) return true;
      // let the spin play for a moment even when the animation loads instantly
      if (performance.now() - started < INTRO_MIN) return false;
      handOver();
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
