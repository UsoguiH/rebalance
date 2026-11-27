// Loader: Slate's own loading screen (slateteams.com), played with the Rive runtime.
// This mirrors their <c-preloader> element: the Rive file loops its idle animation
// until we set the view-model flag `siteLoaded`, which plays the exit; the overlay is
// removed once the state machine reaches its "loaded" state (or after 3.25s).
// The .riv file is not in git; fetch it with `node tools/fetch-slate-loader.js`.
(function () {
  const root = document.getElementById('loader');
  if (!root) return;
  const canvas = root.querySelector('canvas');
  const REVEAL_TIMEOUT = 3250; // same fallbacks as Slate's script
  const PLAY_DELAY = 150;
  const MAX_WAIT = 9000; // never hold the game behind the loader longer than this
  const portrait = matchMedia('(orientation: portrait)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  let r = null,
    dismissed = false,
    vertical = null;

  function dismiss() {
    if (dismissed) return;
    dismissed = true;
    window.removeEventListener('resize', onResize);
    portrait.removeEventListener('change', syncOrientation);
    try {
      if (r) r.cleanup();
    } catch (e) {}
    root.remove();
    const screen = document.getElementById('screen');
    if (screen) screen.focus();
  }

  function syncOrientation() {
    const p = portrait.matches;
    root.dataset.orientation = p ? 'portrait' : 'landscape';
    if (vertical && vertical.value !== p) vertical.value = p;
    onResize();
  }
  function onResize() {
    if (r) r.resizeDrawingSurfaceToCanvas();
  }

  const gameReady = () => window.G && window.G.started;
  function whenGameReady(fn) {
    const t0 = performance.now();
    (function poll() {
      if (dismissed) return;
      if (gameReady() || performance.now() - t0 > MAX_WAIT) fn();
      else setTimeout(poll, 50);
    })();
  }

  function reveal() {
    const vm = r.viewModelInstance;
    const loaded = vm && vm.boolean('siteLoaded');
    if (loaded) loaded.value = true;
    root.classList.add('is-revealing');
    setTimeout(dismiss, REVEAL_TIMEOUT);
  }

  if (reduced.matches || !window.rive || !window.SLATE_PRELOADER_RIV) {
    if (!window.SLATE_PRELOADER_RIV) console.warn('[loader] Slate animation missing: run `node tools/fetch-slate-loader.js`');
    // no animation: hold the navy screen until the game is up, like Slate's fallback
    whenGameReady(dismiss);
    return;
  }

  const R = window.rive;
  // Slate's script also watches state changes to know when the exit has finished
  R.Rive.suppressDeprecationWarnings = ['state-change-events'];
  if (window.RIVE_WASM_URL) R.RuntimeLoader.setWasmUrl(window.RIVE_WASM_URL);
  const bin = atob(window.SLATE_PRELOADER_RIV);
  const buffer = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buffer[i] = bin.charCodeAt(i);

  const failSafe = setTimeout(dismiss, 4000 + MAX_WAIT);
  try {
    r = new R.Rive({
      buffer: buffer.buffer,
      canvas,
      artboard: 'preloader',
      stateMachine: 'preloader',
      autoplay: true,
      autoBind: true,
      layout: new R.Layout({ fit: R.Fit.Fill }),
      onLoad() {
        if (dismissed) return;
        const w = r.artboardWidth,
          h = r.artboardHeight;
        if (w && h) canvas.style.aspectRatio = `${w} / ${h}`;
        const vm = r.viewModelInstance;
        vertical = (vm && vm.boolean('aspectRatioVertical')) || null;
        syncOrientation();
        setTimeout(() => !dismissed && root.classList.add('is-playing'), PLAY_DELAY);
        whenGameReady(() => {
          clearTimeout(failSafe);
          if (!dismissed) reveal();
        });
      },
      onLoadError(e) {
        console.error('[loader]', e);
        whenGameReady(dismiss);
      },
      onStateChange(e) {
        const states = (e && e.data) || [];
        if (root.classList.contains('is-revealing') && states.some((s) => typeof s === 'string' && s.toLowerCase().includes('loaded'))) dismiss();
      },
    });
  } catch (e) {
    console.error('[loader]', e);
    whenGameReady(dismiss);
  }

  window.addEventListener('resize', onResize);
  portrait.addEventListener('change', syncOrientation);
})();
