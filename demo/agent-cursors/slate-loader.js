// Slate's loading screen (slateteams.com), ported from their <c-preloader> script.
// Their Rive file loops its idle animation until the view-model flag `siteLoaded` is set,
// then plays the ribbon reveal; the overlay goes once the state machine reaches its
// "loaded" state (or after 3.25s, their fallback). Its cursor is drawn by monika.js.
//
// No dead first second: the animation player is ~3 MB, so before it is ready this script draws
// the cursor itself from the very first frame. It glides to the middle of the screen and spins
// like a loading spinner, changing name and colour each turn. The moment Slate's cursor first
// appears, the intro cursor glides into it and hands over, so there is never a jump or a pause.
// MonikaLoader.replay() plays it all again.
(function () {
  'use strict';
  const REVEAL_TIMEOUT = 3250; // Slate's values
  const PLAY_DELAY = 150;
  const MIN_IDLE = 5200;       // long enough to see several names before the reveal
  const GIVE_UP = 12000;       // if the animation never loads, fade to the page anyway
  const GLIDE_MS = 520;        // intro: glide to the middle
  const TURN_MS = 900;         // intro: one spin
  const HANDOFF_MS = 420;      // intro cursor -> Slate's cursor
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
        if (location.protocol !== 'file:') { R.RuntimeLoader.setWasmUrl(new URL('vendor/rive-canvas/rive.wasm', location.href).href); return res(R); }
        // opened straight from disk: the browser will not fetch the .wasm, so use the inlined copy
        const s = document.createElement('script');
        s.src = 'vendor/rive-canvas/rive-wasm.js';
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
  function parts(m) {
    const t = m.transformPoint(new DOMPoint(AC.TIP.x, AC.TIP.y));
    return { x: t.x, y: t.y, a: Math.atan2(m.b, m.a), s: Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) };
  }
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const lerp = (a, b, t) => a + (b - a) * t;
  const lerpAngle = (a, b, t) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * t;
  // the arrow spins around its own middle, not its tip
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
    let introOn = true, handoff = null, dpr = 1, W = 0, H = 0, unit = 1;
    const fitIntro = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = Math.round(innerWidth * dpr); H = Math.round(innerHeight * dpr);
      intro.width = W; intro.height = H;
      // the same size Slate's cursor will have: 0.213% of the screen's long side (x2.6)
      unit = 0.00213 * (portrait.matches ? innerHeight : innerWidth) * dpr;
    };
    fitIntro();

    function introPose(now) {
      const t = now - started;
      // tip sits left of the middle so the arrow and its name pill are centred together
      const cx = W / 2 - 46 * unit, cy = H / 2 - 12 * unit;
      if (reduced.matches) return { pose: poseAt(cx, cy, 0, unit), variant: 1 };
      if (t < GLIDE_MS) {
        const k = easeOut(t / GLIDE_MS);
        const x = lerp(-0.08 * W, cx, k), y = lerp(H * 0.78, cy, k) - Math.sin(k * Math.PI) * H * 0.08;
        return { pose: poseAt(x, y, lerp(-0.9, 0, k), unit * lerp(0.7, 1, k)), variant: 1 };
      }
      const turns = (t - GLIDE_MS) / TURN_MS;
      const n = Math.floor(turns);
      const a = (n + ease(turns - n)) * Math.PI * 2;
      // spin about the arrow's middle: that middle stays put, the tip orbits it
      const c = poseAt(cx, cy, 0, unit).transformPoint(new DOMPoint(CENTER[0], CENTER[1]));
      const m = new DOMMatrix().translate(c.x, c.y).rotate((a * 180) / Math.PI).scale(unit).translate(-CENTER[0], -CENTER[1]);
      return { pose: m, variant: 1 + (n % 4) }; // a new colour (and so a new name) each turn
    }

    (function frame(now) {
      if (!introOn || dismissed) { ictx.clearRect(0, 0, W, H); return; }
      requestAnimationFrame(frame);
      ictx.setTransform(1, 0, 0, 1, 0, 0);
      ictx.clearRect(0, 0, W, H);
      let { pose, variant } = introPose(now);
      if (handoff) {
        const k = Math.min(1, (now - handoff.at) / HANDOFF_MS);
        const e = ease(k), a = handoff.from, b = parts(handoff.to);
        pose = poseAt(lerp(a.x, b.x, e), lerp(a.y, b.y, e), lerpAngle(a.a, b.a, e), lerp(a.s, b.s, e));
        variant = handoff.variant;
        if (k >= 1) finishHandoff();
      }
      AC.draw(ictx, rig, pose, 1, variant, now);
    })(performance.now());

    // Slate's cursor drawn in the Rive canvas -> the same pose in intro-canvas pixels
    function toIntro(m) {
      const rect = canvas.getBoundingClientRect();
      const k = (rect.width / canvas.width) * dpr;
      return new DOMMatrix().translate(rect.left * dpr, rect.top * dpr).scale(k).multiply(m);
    }
    function finishHandoff() {
      introOn = false;
      AC.hook = null;
      // Slate's cursor carries on with the same name, colour and pill position
      const rect = canvas.getBoundingClientRect();
      const k = canvas.width / rect.width / dpr;
      const next = Object.assign(AC.newRig(), rig, {
        px: (rig.px - rect.left * dpr) * k, py: (rig.py - rect.top * dpr) * k,
        pxV: (rig.pxV || 0) * k, pyV: (rig.pyV || 0) * k, hsl: rig.hsl && rig.hsl.slice(),
      });
      AC.setRig(canvas, next);
      ictx.clearRect(0, 0, W, H);
      intro.style.display = 'none';
    }
    AC.hook = (cv, pose, variant) => {
      if (cv !== canvas || !introOn) return true;
      // first sight of Slate's cursor: glide the intro cursor into it, hiding Slate's meanwhile
      if (!handoff) handoff = { at: performance.now(), from: parts(introPose(performance.now()).pose) };
      handoff.to = toIntro(pose);
      handoff.variant = variant;
      return false;
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
      removeEventListener('resize', onResize);
      portrait.removeEventListener('change', syncOrientation);
      try { r && r.cleanup(); } catch (e) {}
      root.remove();
    };
    const reveal = () => {
      if (dismissed) return;
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
