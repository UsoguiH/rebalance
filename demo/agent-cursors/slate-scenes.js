// Slate's interactive scenes (slateteams.com), ported from their site's own scripts:
// <c-rive> (their Rive player element) plus the scene controllers <c-rive-collaborate>,
// <c-rive-move-resize-rotate>, <c-rive-image-dragger> and <c-rive-cursor-magic>.
// The logic follows theirs line for line; only the renderer differs (Rive's Canvas2D player,
// so monika.js can take over the cursors) and files load from ./slate-assets/.
(function () {
  'use strict';
  const R = window.rive;

  // ---------------------------------------------------------------- shared helpers (their Layout/deviceStatus/screen/scroll modules)
  function inView(el, cb, { rootMargin = '0px', className = 'is-inview' } = {}) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (className) el.classList.toggle(className, e.isIntersecting);
        cb(e.isIntersecting);
      }
    }, { rootMargin });
    io.observe(el);
    return () => io.disconnect();
  }
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const device = {
    get: () => ({ isReducedMotion: reduced.matches }),
    subscribe(fn) { reduced.addEventListener('change', fn); return () => reduced.removeEventListener('change', fn); },
  };
  const screen = { listen(fn) { addEventListener('resize', fn); return () => removeEventListener('resize', fn); } };
  const scroll = { listen(fn) { addEventListener('scroll', fn, { passive: true }); return () => removeEventListener('scroll', fn); } };
  const breakpoint = (name) => getComputedStyle(document.documentElement).getPropertyValue(`--breakpoint-${name}`).trim() || (name === 'sm' ? '700px' : '1000px');

  // their backing-store rule: device pixel ratio capped at 2
  function surfaceSize(w, h) {
    const cw = Math.max(1, Math.round(w)), ch = Math.max(1, Math.round(h));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    return { width: Math.max(1, Math.round(cw * dpr)), height: Math.max(1, Math.round(ch * dpr)), dpr };
  }

  function rivBuffer(name) {
    const b64 = window.SLATE_RIVS && window.SLATE_RIVS[name];
    if (b64) {
      const bin = atob(b64), out = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
      return Promise.resolve(out.buffer);
    }
    return fetch(`slate-assets/${name}.riv`).then((r) => {
      if (!r.ok) throw new Error(`missing slate-assets/${name}.riv`);
      return r.arrayBuffer();
    });
  }

  // ---------------------------------------------------------------- <c-rive>
  const FITS = new Set(['cover', 'contain', 'fill', 'fitWidth', 'fitHeight', 'none', 'scaleDown', 'layout']);
  const ALIGNS = new Set(['center', 'topLeft', 'topCenter', 'topRight', 'centerLeft', 'centerRight', 'bottomLeft', 'bottomCenter', 'bottomRight']);

  class CRive extends HTMLElement {
    canvas = null; rive = null; ready; resolveReady = null; rejectReady = null;
    resizeObserver = null; unbindVisibility = null; resizeRaf = 0; isInView = false; isMobile = false; gen = 0;
    constructor() { super(); this.resetReadyPromise(); }
    resetReadyPromise() {
      this.ready = new Promise((res, rej) => { this.resolveReady = res; this.rejectReady = rej; });
      this.ready.catch(() => {});
    }
    connectedCallback() {
      this.canvas = this.querySelector('canvas');
      this.isMobile = this.getIsMobile();
      this.onScreen = () => {
        const m = this.getIsMobile();
        if (m !== this.isMobile && (this.dataset.artboardMobile || this.dataset.stateMachineMobile)) { this.isMobile = m; this.recreate(); }
      };
      addEventListener('resize', this.onScreen);
      this.init();
    }
    disconnectedCallback() { removeEventListener('resize', this.onScreen); this.gen++; this.destroy(); }
    getIsMobile() { return matchMedia(`(width < ${breakpoint(this.dataset.mobileBreakpoint === 'sm' ? 'sm' : 'md')})`).matches; }
    activeArtboard() { return this.isMobile && this.dataset.artboardMobile ? this.dataset.artboardMobile : this.dataset.artboard; }
    activeStateMachine() { return this.isMobile && this.dataset.stateMachineMobile ? this.dataset.stateMachineMobile : this.dataset.stateMachine; }
    async init() {
      const gen = ++this.gen;
      if (!this.canvas || !this.isConnected) return;
      let buffer;
      try { buffer = await rivBuffer(this.dataset.rive); } catch (e) { this.rejectReady(e); this.showMissing(); return; }
      if (gen !== this.gen) return;
      const fit = FITS.has(this.dataset.fit) ? this.dataset.fit : 'contain';
      const alignment = ALIGNS.has(this.dataset.alignment) ? this.dataset.alignment : undefined;
      this.prepareBackingStore();
      const sm = this.activeStateMachine();
      const r = (this.rive = new R.Rive({
        canvas: this.canvas,
        buffer,
        layout: new R.Layout(Object.assign({ fit }, alignment ? { alignment } : {})),
        autoplay: false,
        autoBind: this.dataset.autoBind === 'true',
        isTouchScrollEnabled: true,
        artboard: this.activeArtboard(),
        ...(sm ? { stateMachine: sm } : {}),
        onLoad: () => {
          if (gen !== this.gen || !this.rive) return;
          this.syncSurface();
          this.bindResize();
          this.bindVisibility();
          this.syncInViewFromRect();
          this.syncPlayback();
          this.classList.add('is-ready');
          this.resolveReady(r);
          this.dispatchEvent(new CustomEvent('rive-ready', { detail: { rive: r } }));
        },
        onLoadError: () => gen === this.gen && this.rejectReady(new Error('c-rive: failed to load ' + this.dataset.rive)),
      }));
    }
    showMissing() {
      if (this.querySelector('.rive-missing')) return;
      const n = document.createElement('div');
      n.className = 'rive-missing';
      n.textContent = 'Run node demo/agent-cursors/tools/fetch-slate-assets.js to load this scene.';
      this.appendChild(n);
    }
    reset(opts) {
      if (!this.rive) return;
      const sm = this.activeStateMachine();
      this.rive.stopRendering();
      this.rive.reset({ artboard: this.activeArtboard(), ...(sm ? { stateMachine: sm } : {}), autoplay: false, autoBind: this.dataset.autoBind === 'true', ...opts });
      this.syncSurface();
      this.syncInViewFromRect();
      this.syncPlayback();
      this.rive.drawFrame && this.rive.drawFrame();
    }
    async recreate() { this.destroy(); this.resetReadyPromise(); await this.init(); return this.ready; }
    bindResize() {
      this.resizeObserver?.disconnect();
      this.resizeObserver = new ResizeObserver(() => {
        if (this.resizeRaf) return;
        this.resizeRaf = requestAnimationFrame(() => { this.resizeRaf = 0; this.syncSurface(); });
      });
      this.resizeObserver.observe(this.canvas);
    }
    bindVisibility() {
      this.unbindVisibility?.();
      this.unbindVisibility = inView(this.canvas, (v) => { this.isInView = v; this.syncPlayback(); }, { rootMargin: this.dataset.rootMargin || '200px', className: '' });
    }
    prepareBackingStore() {
      const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
      if (w <= 0 || h <= 0) return;
      const s = surfaceSize(w, h);
      if (this.canvas.width !== s.width || this.canvas.height !== s.height) { this.canvas.width = s.width; this.canvas.height = s.height; }
    }
    syncSurface() {
      if (!this.canvas || !this.rive) return;
      const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
      if (w <= 0 || h <= 0) return;
      const s = surfaceSize(w, h);
      const changed = this.canvas.width !== s.width || this.canvas.height !== s.height;
      if (changed) { this.canvas.width = s.width; this.canvas.height = s.height; }
      if (changed || this.rive.devicePixelRatioUsed !== s.dpr) { this.rive.devicePixelRatioUsed = s.dpr; this.rive.resizeToCanvas(); }
      if (this.rive.layout.fit === 'layout') {
        const k = this.rive.layout.layoutScaleFactor || 1;
        if (this.rive.artboardWidth !== w / k || this.rive.artboardHeight !== h / k) { this.rive.artboardWidth = w / k; this.rive.artboardHeight = h / k; }
      }
    }
    syncInViewFromRect() {
      const r = this.canvas.getBoundingClientRect();
      this.isInView = r.width > 0 && r.bottom > 0 && r.top < innerHeight;
    }
    syncPlayback() {
      if (!this.rive) return;
      if (this.isInView && this.dataset.autoplay !== 'false') {
        const sm = this.activeStateMachine() || this.rive.stateMachineNames;
        this.rive.play(sm && sm.length ? sm : undefined);
      } else this.rive.pause();
    }
    destroy() {
      this.unbindVisibility?.(); this.unbindVisibility = null;
      this.resizeObserver?.disconnect(); this.resizeObserver = null;
      if (this.resizeRaf) cancelAnimationFrame(this.resizeRaf), (this.resizeRaf = 0);
      this.rive?.cleanup(); this.rive = null;
      this.classList.remove('is-ready');
    }
  }
  customElements.define('c-rive', CRive);

  // ---------------------------------------------------------------- <c-inline-video>
  customElements.define('c-inline-video', class extends HTMLElement {
    play() { const v = this.querySelector('video'); if (v) v.play().then(() => this.classList.add('is-video-ready'), () => {}); }
    pause() { this.querySelector('video')?.pause(); }
  });

  // ---------------------------------------------------------------- <c-rive-collaborate>
  customElements.define('c-rive-collaborate', class extends HTMLElement {
    abortController = null; unbindVisibility = null; revealRive = null; triggerSender = null; triggerReceiver = null; cursorState = null; hasRevealed = false;
    onTriggerCursorApproval = () => { this.triggerSender?.value && this.forwardTrigger(); };
    onCursorStateChange = () => this.syncCursorState();
    connectedCallback() { this.bind(); }
    disconnectedCallback() { this.cleanup(); }
    cleanup() {
      this.abortController?.abort(); this.abortController = null;
      this.unbindVisibility?.(); this.unbindVisibility = null;
      this.triggerSender?.off(this.onTriggerCursorApproval); this.triggerSender = null; this.triggerReceiver = null;
      this.cursorState?.off(this.onCursorStateChange); this.cursorState = null;
      this.revealRive = null; this.hasRevealed = false; this.removeAttribute('data-cursor-state');
    }
    async bind() {
      this.cleanup();
      this.abortController = new AbortController();
      const { signal } = this.abortController;
      this.bindInView(signal);
      await customElements.whenDefined('c-rive');
      if (signal.aborted || !this.isConnected) return;
      const main = this.querySelector('c-rive[data-artboard="collaborate"]');
      const ui = this.querySelector('c-rive[data-artboard="collaborate-phases-ui"]');
      if (!main || !ui) return;
      main.addEventListener('rive-ready', (e) => { this.bindMain(e.detail.rive); this.hasRevealed && this.setReveal(true); this.triggerSender?.value && this.forwardTrigger(); }, { signal });
      ui.addEventListener('rive-ready', (e) => { this.bindUi(e.detail.rive); this.triggerSender?.value && this.forwardTrigger(); }, { signal });
      const uiVisible = this.isUiVisible();
      try {
        const r = await main.ready;
        if (signal.aborted || !this.isConnected) return;
        this.bindMain(r);
        if (uiVisible) { const u = await ui.ready; if (signal.aborted || !this.isConnected) return; this.bindUi(u); }
        this.hasRevealed && this.setReveal(true);
        this.triggerSender?.value && this.forwardTrigger();
      } catch (e) { if (!signal.aborted) console.error('[c-rive-collaborate]', e); }
    }
    isUiVisible() { const e = this.querySelector('[data-collaborate-ui]'); return e ? getComputedStyle(e).display !== 'none' : false; }
    bindInView(signal) {
      const stage = this.querySelector('[data-collaborate-stage]') ?? this;
      this.unbindVisibility = inView(stage, (v) => { if (v && !this.hasRevealed) { this.hasRevealed = true; this.setReveal(true); } }, { rootMargin: '0px 0px -60% 0px', className: 'is-reveal-ready' });
      signal.addEventListener('abort', () => { this.unbindVisibility?.(); this.unbindVisibility = null; }, { once: true });
    }
    bindMain(r) {
      this.triggerSender?.off(this.onTriggerCursorApproval);
      const vm = r.viewModelInstance;
      this.revealRive = vm?.boolean('revealRive') ?? null;
      this.triggerSender = vm?.boolean('triggerCursorApproval') ?? null;
      this.triggerSender?.on(this.onTriggerCursorApproval);
    }
    bindUi(r) {
      this.cursorState?.off(this.onCursorStateChange);
      const vm = r.viewModelInstance;
      this.triggerReceiver = vm?.boolean('triggerCursorApproval') ?? null;
      this.cursorState = vm?.string('cursorState') ?? null;
      this.cursorState?.on(this.onCursorStateChange);
      this.syncCursorState();
    }
    setReveal(v) { if (this.revealRive) this.revealRive.value = v; }
    forwardTrigger() { if (this.triggerReceiver) this.triggerReceiver.value = true; }
    syncCursorState() { const v = this.cursorState?.value; v ? (this.dataset.cursorState = v) : this.removeAttribute('data-cursor-state'); }
  });

  // ---------------------------------------------------------------- <c-rive-move-resize-rotate>
  const hexToArgb = (hex) => parseInt('FF' + hex.replace('#', '').slice(-6), 16);
  customElements.define('c-rive-move-resize-rotate', class extends HTMLElement {
    abortController = null; unbindVisibility = null; revealRive = null; selectedHexColor = null; typefaceIndex = null;
    selectedColorHex = null; selectedTypeface = 1; selectedImageIndex = 0; hasRevealed = false;
    connectedCallback() { this.bind(); }
    disconnectedCallback() { this.cleanup(); }
    cleanup() {
      this.abortController?.abort(); this.abortController = null;
      this.unbindVisibility?.(); this.unbindVisibility = null;
      this.revealRive = null; this.selectedHexColor = null; this.typefaceIndex = null; this.hasRevealed = false;
    }
    async bind() {
      this.cleanup();
      this.abortController = new AbortController();
      const { signal } = this.abortController;
      this.ensureInitialSelection();
      this.addEventListener('click', this.onConfigClick, { signal });
      this.bindInView(signal);
      await customElements.whenDefined('c-rive');
      if (signal.aborted || !this.isConnected) return;
      const player = this.querySelector('c-rive');
      if (!player) return;
      player.addEventListener('rive-ready', (e) => this.bindRive(e.detail.rive), { signal });
      try { const r = await player.ready; if (signal.aborted || !this.isConnected) return; this.bindRive(r); }
      catch (e) { if (!signal.aborted) console.error('[c-rive-move-resize-rotate]', e); }
    }
    ensureInitialSelection() {
      if (!this.selectedColorHex) this.selectedColorHex = this.querySelector('[data-mrr-color]')?.dataset.mrrColor ?? null;
      this.updatePressedStates(); this.syncImageVisibility();
    }
    bindInView(signal) {
      const stage = this.querySelector('[data-mrr-stage]') ?? this;
      this.unbindVisibility = inView(stage, (v) => { if (v && !this.hasRevealed) { this.hasRevealed = true; this.setReveal(true); } }, { rootMargin: '0px 0px -60% 0px', className: 'is-reveal-ready' });
      signal.addEventListener('abort', () => { this.unbindVisibility?.(); this.unbindVisibility = null; }, { once: true });
    }
    setReveal(v) { if (this.revealRive) this.revealRive.value = v; }
    bindRive(r) {
      const vm = r.viewModelInstance;
      this.revealRive = vm?.boolean('revealRive') ?? null;
      this.selectedHexColor = vm?.color?.('selectedHexColor') ?? vm?.number('selectedHexColor') ?? null;
      this.typefaceIndex = vm?.number('typefaceIndex') ?? null;
      this.hasRevealed && this.setReveal(true);
      this.syncColor(); this.syncTypeface(); this.syncImageVisibility(); this.updatePressedStates();
    }
    onConfigClick = (e) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      const color = t.closest('[data-mrr-color]');
      if (color && this.contains(color)) { const v = color.dataset.mrrColor; if (v) { this.selectedColorHex = v; this.syncColor(); this.updatePressedStates(); } return; }
      const face = t.closest('[data-mrr-typeface]');
      if (face && this.contains(face)) { const v = Number(face.dataset.mrrTypeface); if (v >= 1 && v <= 3) { this.selectedTypeface = v; this.syncTypeface(); this.updatePressedStates(); } return; }
      const img = t.closest('[data-mrr-image]');
      if (img && this.contains(img)) { const v = Number(img.dataset.mrrImage); if (!Number.isNaN(v)) { this.selectedImageIndex = v; this.syncImageVisibility(); this.updatePressedStates(); } }
    };
    syncColor() { if (this.selectedHexColor && this.selectedColorHex) this.selectedHexColor.value = hexToArgb(this.selectedColorHex); }
    syncTypeface() { if (this.typefaceIndex) this.typefaceIndex.value = this.selectedTypeface; }
    syncImageVisibility() { this.querySelectorAll('[data-mrr-image-layer]').forEach((e, i) => e.classList.toggle('invisible', i !== this.selectedImageIndex)); }
    updatePressedStates() {
      this.querySelectorAll('[data-mrr-color]').forEach((e) => e.setAttribute('aria-pressed', String(e.dataset.mrrColor === this.selectedColorHex)));
      this.querySelectorAll('[data-mrr-typeface]').forEach((e) => e.setAttribute('aria-pressed', String(Number(e.dataset.mrrTypeface) === this.selectedTypeface)));
      this.querySelectorAll('[data-mrr-image]').forEach((e) => e.setAttribute('aria-pressed', String(Number(e.dataset.mrrImage) === this.selectedImageIndex)));
    }
  });

  // ---------------------------------------------------------------- <c-rive-image-dragger>
  const HOVERS = ['txt1', 'txt2', 'illustration1', 'illustration2', 'logo'];
  const HOVER_INPUT = { txt1: 'hoverTxt1', txt2: 'hoverTxt2', illustration1: 'hoverIllustration1', illustration2: 'hoverIllustration2', logo: 'hoverLogo' };
  customElements.define('c-rive-image-dragger', class extends HTMLElement {
    abortController = null; unbindVisibility = null; unbindViewport = null; unbindVideoVisibility = null; revealRive = null;
    imgDroppedSender = null; imgDroppedReceiver = null; hoverInputs = {}; hoverListeners = {}; hasRevealed = false;
    pendingDropped = null; hasDropped = false; isVideoVisible = false; needsReset = false;
    onImgDropped = () => this.syncImgDropped(this.imgDroppedSender?.value ?? false);
    connectedCallback() { this.bind(); }
    disconnectedCallback() { this.cleanup(); }
    setHover(k, v) { const i = this.hoverInputs[k]; if (i) i.value = v; }
    cleanup() {
      this.abortController?.abort(); this.abortController = null;
      this.unbindVisibility?.(); this.unbindVisibility = null;
      this.unbindViewport?.(); this.unbindViewport = null;
      this.unbindVideoVisibility?.(); this.unbindVideoVisibility = null;
      this.imgDroppedSender?.off(this.onImgDropped); this.imgDroppedSender = null; this.imgDroppedReceiver = null; this.revealRive = null;
      this.unbindHoverInputs();
      this.hasRevealed = false; this.pendingDropped = null; this.hasDropped = false; this.isVideoVisible = false; this.needsReset = false;
      this.pauseInlineVideo(); this.syncImageVisibility();
    }
    async bind() {
      this.cleanup();
      this.abortController = new AbortController();
      const { signal } = this.abortController;
      this.addEventListener('pointerover', this.onPointerOver, { signal });
      this.addEventListener('pointerout', this.onPointerOut, { signal });
      this.bindInView(signal);
      this.bindVideoVisibility(signal);
      await customElements.whenDefined('c-rive');
      if (signal.aborted || !this.isConnected) return;
      const panel = this.querySelector('c-rive[data-artboard="image-dragger_left-panel"]');
      const dragger = this.querySelector('c-rive[data-artboard="image-dragger_dragger"]');
      if (!panel || !dragger) return;
      panel.addEventListener('rive-ready', (e) => { this.bindPanel(e.detail.rive); this.flushPendingBindings(); }, { signal });
      dragger.addEventListener('rive-ready', (e) => { this.bindDragger(e.detail.rive); this.flushPendingBindings(); }, { signal });
      try {
        const [p, d] = await Promise.all([panel.ready, dragger.ready]);
        if (signal.aborted || !this.isConnected) return;
        this.bindPanel(p); this.bindDragger(d); this.flushPendingBindings();
      } catch (e) { if (!signal.aborted) console.error('[c-rive-image-dragger]', e); }
    }
    bindInView(signal) {
      const stage = this.querySelector('[data-image-dragger-stage]') ?? this;
      this.unbindVisibility = inView(stage, (v) => { if (v && !this.hasRevealed) this.playReveal(); }, { rootMargin: '0px 0px -60% 0px', className: 'is-reveal-ready' });
      // replay from the start when it is scrolled back into view from below
      const io = new IntersectionObserver((entries) => {
        const e = entries[0];
        if (!e) return;
        if (e.isIntersecting) { if (this.needsReset) { this.needsReset = false; this.resetRive(); } return; }
        const top = e.rootBounds?.top ?? 0;
        if (e.boundingClientRect.top >= top) this.markReset();
      }, { rootMargin: '0px 0px 100% 0px' });
      io.observe(stage);
      this.unbindViewport = () => io.disconnect();
      signal.addEventListener('abort', () => { this.unbindVisibility?.(); this.unbindVisibility = null; this.unbindViewport?.(); this.unbindViewport = null; }, { once: true });
    }
    bindVideoVisibility(signal) {
      const v = this.getInlineVideo() ?? this;
      this.unbindVideoVisibility = inView(v, (vis) => { this.isVideoVisible = vis; this.syncVideoPlayback(); });
      signal.addEventListener('abort', () => { this.unbindVideoVisibility?.(); this.unbindVideoVisibility = null; }, { once: true });
    }
    onPointerOver = (e) => {
      const el = this.getHoverElement(e.target);
      if (!el) return;
      if (e.relatedTarget instanceof Node && el.contains(e.relatedTarget)) return;
      const k = el.dataset.imageDraggerHover;
      if (k && HOVERS.includes(k)) this.setHover(k, true);
    };
    onPointerOut = (e) => {
      const el = this.getHoverElement(e.target);
      if (!el) return;
      if (e.relatedTarget instanceof Node && el.contains(e.relatedTarget)) return;
      const k = el.dataset.imageDraggerHover;
      if (k && HOVERS.includes(k)) this.setHover(k, false);
    };
    getHoverElement(t) {
      if (!(t instanceof Element)) return null;
      const el = t.closest('[data-image-dragger-hover]');
      return el && this.contains(el) ? el : null;
    }
    bindPanel(r) {
      this.unbindHoverInputs();
      const vm = r.viewModelInstance;
      this.imgDroppedReceiver = vm?.boolean('imgDropped') ?? null;
      this.setMobileActive(vm?.boolean('mobileActive') ?? null);
      for (const k of HOVERS) this.bindHoverInput(k, vm?.boolean(HOVER_INPUT[k]) ?? null);
    }
    bindHoverInput(k, input) {
      if (!input) return;
      const fn = () => this.syncHoverRow(k, input.value);
      this.hoverInputs[k] = input; this.hoverListeners[k] = fn;
      input.on(fn); this.syncHoverRow(k, input.value);
    }
    unbindHoverInputs() {
      for (const k of HOVERS) { const fn = this.hoverListeners[k]; if (fn) this.hoverInputs[k]?.off(fn); this.syncHoverRow(k, false); }
      this.hoverInputs = {}; this.hoverListeners = {};
    }
    syncHoverRow(k, v) { this.querySelector(`[data-image-dragger-hover="${k}"]`)?.toggleAttribute('data-hover', v); }
    bindDragger(r) {
      this.imgDroppedSender?.off(this.onImgDropped);
      const vm = r.viewModelInstance;
      this.revealRive = vm?.boolean('revealRive') ?? null;
      this.imgDroppedSender = vm?.boolean('imgDropped') ?? null;
      this.imgDroppedSender?.on(this.onImgDropped);
      this.setMobileActive(vm?.boolean('mobileActive') ?? null);
      if (this.imgDroppedSender) this.syncImgDropped(this.imgDroppedSender.value);
    }
    flushPendingBindings() {
      this.hasRevealed && this.setReveal(true);
      if (this.pendingDropped === null) { if (this.imgDroppedSender) this.syncImgDropped(this.imgDroppedSender.value); }
      else this.syncImgDropped(this.pendingDropped);
    }
    syncImgDropped(v) {
      this.pendingDropped = v;
      if (!this.imgDroppedReceiver) return;
      this.imgDroppedReceiver.value = v;
      this.pendingDropped = null;
      if (v) { this.hasDropped = true; this.syncImageVisibility(); this.syncVideoVisibleFromRect(); this.syncVideoPlayback(); }
    }
    setMobileActive(input) { if (input) input.value = matchMedia(`(width < ${breakpoint('sm')})`).matches; }
    setReveal(v) { if (this.revealRive) this.revealRive.value = v; }
    markReset() { this.hasRevealed = false; this.pendingDropped = null; this.hasDropped = false; this.needsReset = true; this.pauseInlineVideo(); this.syncImageVisibility(); }
    playReveal() { if (this.needsReset) { this.needsReset = false; this.resetRive(); } this.hasRevealed = true; this.setReveal(true); }
    resetRive() {
      const p = this.querySelector('c-rive[data-artboard="image-dragger_left-panel"]');
      const d = this.querySelector('c-rive[data-artboard="image-dragger_dragger"]');
      p?.reset(); d?.reset();
      if (p?.rive) this.bindPanel(p.rive);
      if (d?.rive) this.bindDragger(d.rive);
    }
    syncImageVisibility() { this.querySelector('[data-image-dragger-image]')?.classList.toggle('invisible', !this.hasDropped); }
    syncVideoVisibleFromRect() { const r = (this.getInlineVideo() ?? this).getBoundingClientRect(); this.isVideoVisible = r.width > 0 && r.bottom > 0 && r.top < innerHeight; }
    syncVideoPlayback() { this.hasDropped && this.isVideoVisible ? this.playInlineVideo() : this.pauseInlineVideo(); }
    getInlineVideo() { return this.querySelector('c-inline-video'); }
    playInlineVideo() { this.getInlineVideo()?.play?.(); }
    pauseInlineVideo() { this.getInlineVideo()?.pause?.(); }
  });

  // ---------------------------------------------------------------- <c-rive-cursor-magic>
  const ZONE = 50, REF_W = 1512, REF_H = 1000, INSET = 16;
  customElements.define('c-rive-cursor-magic', class extends HTMLElement {
    abortController = null; unbindVisibility = null; unsubscribeScroll = null; unsubscribeScreen = null; unsubscribeMedia = null;
    riveMouseX = null; riveMouseY = null; windowWidth = null; windowHeight = null; ctaHoverActive = null; userCursorActive = null; mobileActive = null;
    resizeObserver = null; mouseX = 0; mouseY = 0; isInView = false; isMobile = false; lastReducedMotion = device.get().isReducedMotion; player = null;
    connectedCallback() {
      this.unsubscribeMedia = device.subscribe(() => {
        const r = device.get().isReducedMotion;
        if (r !== this.lastReducedMotion) { this.lastReducedMotion = r; this.bind(); }
      });
      this.bind();
    }
    disconnectedCallback() { this.unsubscribeMedia?.(); this.unsubscribeMedia = null; this.cleanup(); }
    cleanup() {
      this.abortController?.abort(); this.abortController = null;
      this.unbindVisibility?.(); this.unbindVisibility = null;
      this.unsubscribeScroll?.(); this.unsubscribeScroll = null;
      this.unsubscribeScreen?.(); this.unsubscribeScreen = null;
      this.riveMouseX = this.riveMouseY = this.windowWidth = this.windowHeight = this.ctaHoverActive = this.userCursorActive = this.mobileActive = null;
      this.resizeObserver?.disconnect(); this.resizeObserver = null;
      this.player = null; this.isInView = false; this.isMobile = false;
      this.toggleAttribute('data-user-cursor-active', false);
    }
    async bind() {
      this.cleanup();
      if (device.get().isReducedMotion) { this.toggleAttribute('data-user-cursor-active', false); return; }
      this.abortController = new AbortController();
      const { signal } = this.abortController;
      this.isMobile = this.getIsMobile();
      addEventListener('mousemove', this.onMouseMove, { signal });
      this.addEventListener('pointerover', this.onCtaPointerOver, { signal });
      this.addEventListener('pointerout', this.onCtaPointerOut, { signal });
      this.unsubscribeScroll = scroll.listen(() => { this.isInView && this.syncMouse(); });
      this.unbindVisibility = inView(this, (v) => { this.isInView = v; v ? this.syncMouse() : this.setUserCursorActive(false); });
      this.resizeObserver = new ResizeObserver(() => this.scheduleWindowSizeSync());
      this.resizeObserver.observe(this);
      this.unsubscribeScreen = screen.listen(() => {
        const m = this.getIsMobile();
        if (m !== this.isMobile) { this.isMobile = m; this.syncMobileActive(); this.syncMouse(); }
      });
      await customElements.whenDefined('c-rive');
      if (signal.aborted || !this.isConnected) return;
      this.player = this.querySelector('c-rive');
      if (!this.player) return;
      this.player.addEventListener('rive-ready', (e) => this.bindRive(e.detail.rive), { signal });
      try { const r = await this.player.ready; if (signal.aborted || !this.isConnected) return; this.bindRive(r); }
      catch (e) { if (!signal.aborted) console.error('[c-rive-cursor-magic]', e); }
    }
    bindRive(r) {
      const vm = r.viewModelInstance;
      this.riveMouseX = vm?.number('riveMouseX') ?? null;
      this.riveMouseY = vm?.number('riveMouseY') ?? null;
      this.windowWidth = vm?.number('windowWidth') ?? null;
      this.windowHeight = vm?.number('windowHeight') ?? null;
      this.ctaHoverActive = vm?.boolean('ctaHoverActive') ?? null;
      this.userCursorActive = vm?.boolean('userCursorActive') ?? null;
      this.mobileActive = vm?.boolean('mobileActive') ?? null;
      this.syncMobileActive(); this.scheduleWindowSizeSync(); this.syncMouse();
    }
    syncMobileActive() {
      if (!this.mobileActive) return;
      this.mobileActive.value = this.isMobile;
      if (this.isMobile) { this.setCtaHover(false); this.setUserCursorActive(false); }
    }
    getIsMobile() { return matchMedia(`(width < ${breakpoint('md')})`).matches; }
    scheduleWindowSizeSync() { let n = 0; const f = () => { this.syncWindowSize(); if (++n < 3) requestAnimationFrame(f); }; requestAnimationFrame(f); }
    syncWindowSize() {
      if (!this.isConnected || !this.windowWidth || !this.windowHeight) return;
      const r = this.player?.rive, c = this.player?.canvas ?? this.querySelector('canvas');
      const w = r?.artboardWidth || c?.clientWidth || 0, h = r?.artboardHeight || c?.clientHeight || 0;
      if (w <= 0 || h <= 0) return;
      const fitted = Math.min(Math.max(w - INSET, 1), (Math.max(h - INSET, 1) * REF_W) / REF_H);
      if (Math.abs(this.windowWidth.value - fitted) >= 0.5) this.windowWidth.value = fitted;
    }
    onMouseMove = (e) => {
      this.mouseX = e.clientX; this.mouseY = e.clientY;
      this.isMobile || !this.isInView ? this.setUserCursorActive(false) : this.syncMouse();
    };
    onCtaPointerOver = (e) => {
      if (this.isMobile) return;
      const cta = this.getCta(e.target);
      if (!cta || (e.relatedTarget instanceof Node && cta.contains(e.relatedTarget))) return;
      this.setCtaHover(true);
    };
    onCtaPointerOut = (e) => {
      if (this.isMobile) return;
      const cta = this.getCta(e.target);
      if (!cta || (e.relatedTarget instanceof Node && cta.contains(e.relatedTarget))) return;
      this.setCtaHover(false);
    };
    getCta(t) { if (!(t instanceof Element)) return null; const c = t.closest('[data-cursor-magic-cta]'); return c && this.contains(c) ? c : null; }
    setCtaHover(v) { if (this.ctaHoverActive && this.ctaHoverActive.value !== v) this.ctaHoverActive.value = v; }
    setUserCursorActive(v) {
      this.toggleAttribute('data-user-cursor-active', v);
      if (this.userCursorActive && this.userCursorActive.value !== v) this.userCursorActive.value = v;
    }
    syncMouse() {
      this.syncWindowSize();
      if (this.isMobile) { this.setCtaHover(false); this.setUserCursorActive(false); return; }
      if (!this.riveMouseX || !this.riveMouseY) return;
      const c = this.player?.canvas ?? this.querySelector('canvas');
      if (!c) return;
      const r = c.getBoundingClientRect(), x = this.mouseX - r.left, y = this.mouseY - r.top;
      this.riveMouseX.value = x; this.riveMouseY.value = y;
      this.setUserCursorActive(x >= ZONE && y >= ZONE && x <= r.width - ZONE && y <= r.height - ZONE);
    }
  });
})();
