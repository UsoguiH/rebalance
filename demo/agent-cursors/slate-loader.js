// Slate's loading screen (slateteams.com), ported from their <c-preloader> script.
// Their Rive file loops its idle animation until the view-model flag `siteLoaded` is set,
// then plays the ribbon reveal; the overlay goes once the state machine reaches its
// "loaded" state (or after 3.25s, their fallback). Its cursor is taken over by monika.js.
// MonikaLoader.replay() plays it again.
(function () {
  'use strict';
  const R = window.rive;
  const REVEAL_TIMEOUT = 3250; // Slate's values
  const PLAY_DELAY = 150;
  const MIN_IDLE = 2600; // let Monika fly around for a moment before the reveal
  const portrait = matchMedia('(orientation: portrait)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  function markup() {
    const root = document.createElement('div');
    root.className = 'c-preloader';
    root.setAttribute('role', 'progressbar');
    root.setAttribute('aria-label', 'Loading');
    root.innerHTML = '<div class="c-preloader_placeholder" aria-hidden="true"></div><div class="c-preloader_stage"><canvas class="c-preloader_rive" data-monika-scale="2.6"></canvas></div>';
    document.body.prepend(root);
    return root;
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

  const pageLoaded = new Promise((res) => (document.readyState === 'complete' ? res() : addEventListener('load', res, { once: true })));

  function run(root) {
    root = root || document.querySelector('.c-preloader') || markup();
    const canvas = root.querySelector('canvas');
    const started = performance.now();
    let r = null, dismissed = false, vertical = null;

    const onResize = () => r && r.resizeDrawingSurfaceToCanvas();
    const syncOrientation = () => {
      root.dataset.orientation = portrait.matches ? 'portrait' : 'landscape';
      if (vertical && vertical.value !== portrait.matches) vertical.value = portrait.matches;
      onResize();
    };
    const dismiss = () => {
      if (dismissed) return;
      dismissed = true;
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

    if (reduced.matches || !R) return; // no motion: keep the black screen
    syncOrientation();
    buffer().then((buf) => {
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
      R.Rive.suppressDeprecationWarnings = ['state-change-events'];
    }, () => console.warn('[loader] Slate animation missing: run node demo/agent-cursors/tools/fetch-slate-assets.js'));
    addEventListener('resize', onResize);
    portrait.addEventListener('change', syncOrientation);
  }

  window.MonikaLoader = {
    replay() {
      if (document.querySelector('.c-preloader')) return;
      run(markup());
    },
  };
  run();
})();
