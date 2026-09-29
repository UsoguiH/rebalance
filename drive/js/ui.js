/* ui.js — all DOM UI: loading/start card, HUD (stamina, compass, minimap, counter),
 * zone panels, settings, toasts. Arabic-first (RTL) with an English mirror. No three.js dependency.
 *
 *   const ui = new UI({ content, lang, onStart, onLangChange, onSoundToggle, onMusicToggle,
 *                       onQualityChange, onTimeToggle, onZoneOpen, onZoneClose, onModalChange });
 *   ui.setWorld({ radius, zones:[{id,x,z,r,color}] });
 *   ui.setProgress(0..1); ui.ready();
 *   every frame: ui.updateHud(rideState);   // x,z,heading,sprintEnergy
 *   ui.setNearZone(id|null);                // shows the "tap to enter" prompt
 *   ui.openZone(id) / ui.closeZone();  ui.toast(text);  ui.setLang('ar'|'en');
 */
import { content as DEFAULT_CONTENT, ZONE_IDS } from './content.js';

const LANGS = ['ar', 'en'];
const PREF_KEY = 'rj-prefs-v1';
const DEFAULT_PREFS = { lang: 'ar', sound: true, music: true, quality: 'auto', night: false };

/* ------------------------------------------------------------------ icons */
const ICON_PATHS = {
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
  grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',
  bolt: '<path d="M13 2.5 5 13.5h6l-1 8 8-11h-6z"/>',
  path: '<circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="6" r="2.5"/><path d="M8.5 18H15a3.5 3.5 0 0 0 0-7H9a3.5 3.5 0 0 1 0-7h6.5"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m4 7.5 8 6 8-6"/>',
  gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/>',
  soundOn: '<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
  soundOff: '<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z"/><path d="m16 9.5 5 5m0-5-5 5"/>',
  music: '<path d="M9 18V5.5l10-2V16"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  star: '<path d="m12 3 2.2 6.3 6.3.2-5 3.9 1.8 6.4L12 16.2 6.7 19.8l1.8-6.4-5-3.9 6.3-.2z"/>',
  coffee: '<path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M17 10h2a2.5 2.5 0 0 1 0 5h-2M8 3v3M12 3v3"/>',
  note: '<path d="M9 18V5.5l10-2V16"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
  fullscreen: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.2 5.2 7 7M17 17l1.8 1.8M5.2 18.8 7 17M17 7l1.8-1.8"/>',
  copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7.5a2 2 0 0 0 2 2h2.5"/>',
  external: '<path d="M14 4h6v6M20 4 10.5 13.5M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.8.4-1.1.9-1.1 1.8M12 17h.01"/>',
  pin: '<path d="M12 21s7-6 7-11.5A7 7 0 0 0 5 9.5C5 15 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  joystick: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.5"/>',
  sprint: '<path d="M13 2.5 5 13.5h6l-1 8 8-11h-6z"/>',
  call: '<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
  brake: '<rect x="6" y="6" width="12" height="12" rx="2.5"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
};
function icon(name, cls = '') {
  const p = ICON_PATHS[name] || ICON_PATHS.star;
  return `<svg class="ico ${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
}

/* ---------------------------------------------------------------- helpers */
function el(tag, props, ...kids) {
  const n = document.createElement(tag);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k === 'html') n.innerHTML = v; // only used with static icon markup
      else if (k === 'style') n.style.cssText = v;
      else if (k === 'dataset') Object.assign(n.dataset, v);
      else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : v);
    }
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    n.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return n;
}
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const readPrefs = () => {
  try {
    const raw = localStorage.getItem(PREF_KEY);
    if (raw) return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch (_) { /* storage unavailable */ }
  return { ...DEFAULT_PREFS };
};
const writePrefs = (p) => {
  try { localStorage.setItem(PREF_KEY, JSON.stringify(p)); } catch (_) { /* ignore */ }
};
const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])';

/* ================================================================== UI */
export class UI {
  constructor(opts = {}) {
    this.opts = opts;
    this.content = opts.content || DEFAULT_CONTENT;
    const saved = readPrefs();
    this.prefs = { ...saved };
    if (opts.lang && LANGS.includes(opts.lang) && !this._hasSavedLang()) this.prefs.lang = opts.lang;
    if (!this.content[this.prefs.lang]) this.prefs.lang = 'ar';
    this.lang = this.prefs.lang;

    this.zones = [];           // [{id,x,z,r,color}]
    this.worldRadius = 140;
    this.visited = new Set();
    this.started = false;
    this._modal = null;        // {kind, id, opener, overlay, panel}
    this._nearZone = null;
    this._celebratePending = false;
    this._celebrated = false;
    this._target = 0; this._shown = 0; this._isReady = false; this._readyShown = false;
    this._hud = { stamina: -1, dist: -1, target: null, arrowDeg: null, mapT: 0, pos: { x: 0, z: 0, h: 0 } };
    this._timers = new Set();
    this._disposers = [];

    this._build();
    this._applyLangToDocument();
    this._renderStatic();
    this._bindGlobal();
    this._startTipRotation();
    this._raf = requestAnimationFrame(this._tickProgress);
    this._applyNight(this.prefs.night, false);
  }

  _hasSavedLang() {
    try { const r = JSON.parse(localStorage.getItem(PREF_KEY) || 'null'); return !!(r && r.lang); } catch (_) { return false; }
  }

  get t() { return this.content[this.lang].ui; }
  get data() { return this.content[this.lang]; }
  get isPanelOpen() { return !!this._modal; }
  get visitedCount() { return this.visited.size; }
  get totalZones() { return ZONE_IDS.length; }

  fmt(n) {
    n = Math.round(n);
    return this.lang === 'ar' ? n.toLocaleString('ar-EG', { useGrouping: false }) : String(n);
  }

  /* ------------------------------------------------------------ building */
  _build() {
    const root = document.getElementById('ui-root') || document.body.appendChild(el('div', { id: 'ui-root' }));
    this.root = root;
    const html = document.documentElement;
    if (!html.dataset.input) {
      html.dataset.input = window.matchMedia && matchMedia('(pointer: coarse)').matches ? 'touch' : 'kbm';
    }

    this.live = el('div', { id: 'sr-live', class: 'sr-only', 'aria-live': 'polite', 'aria-atomic': 'true' });

    /* ---------- HUD ---------- */
    this.hud = el('div', { class: 'hud', id: 'hud', hidden: true });
    this.mapCanvas = el('canvas', { class: 'minimap-canvas', width: 120, height: 120, 'aria-hidden': 'true' });
    this.wfArrow = el('span', { class: 'wf-arrow', html: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5 4.8 20.5 12 16.6l7.2 3.9z" fill="currentColor" stroke="rgba(27,27,47,.55)" stroke-width="1.2" stroke-linejoin="round"/></svg>' });
    this.wfLabel = el('span', { class: 'wf-label' });
    this.wfName = el('b', { class: 'wf-name' });
    this.wfDist = el('span', { class: 'wf-dist' });
    this.wayfinder = el('div', { class: 'wayfinder', role: 'status' },
      this.wfArrow,
      el('span', { class: 'wf-text' }, this.wfLabel, this.wfName, this.wfDist));
    this.counterLabel = el('span', { class: 'zc-label' });
    this.counterDots = el('span', { class: 'zc-dots', 'aria-hidden': 'true' },
      ZONE_IDS.map((id) => el('i', { dataset: { zone: id } })));
    this.counterNum = el('b', { class: 'zc-num' });
    this.counter = el('div', { class: 'zone-counter', role: 'status' }, this.counterLabel, this.counterDots, this.counterNum);
    this.staminaFill = el('i');
    this.staminaLabel = el('span', { class: 'sr-only' });
    this.stamina = el('div', { class: 'stamina', role: 'meter', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': 100 },
      el('span', { class: 'st-ico', html: icon('bolt') }), el('span', { class: 'st-track' }, this.staminaFill), this.staminaLabel);
    this.btnSound = el('button', { class: 'hud-btn', type: 'button', onclick: () => this._toggleSound() });
    this.btnSettings = el('button', { class: 'hud-btn', type: 'button', html: icon('gear'), onclick: () => this.openSettings() });
    this.prompt = el('div', { class: 'prompt', hidden: true });
    this.promptBtn = el('button', { class: 'prompt-btn', type: 'button', onclick: () => this._enterNear() });
    this.prompt.append(this.promptBtn);
    this.toasts = el('div', { class: 'toasts', role: 'status', 'aria-live': 'polite' });
    this.hud.append(
      el('div', { class: 'hud-top' },
        el('div', { class: 'hud-map' },
          el('div', { class: 'minimap', role: 'img' }, this.mapCanvas),
          this.wayfinder),
        el('div', { class: 'hud-center' }, this.counter, this.stamina),
        el('div', { class: 'hud-actions' }, this.btnSound, this.btnSettings)),
      this.prompt, this.toasts);
    this.minimapBox = this.mapCanvas.parentElement;
    this._mapCtx = this.mapCanvas.getContext('2d');

    /* ---------- intro / start card ---------- */
    this.introTitle = el('h1', { class: 'intro-title' });
    this.introSub = el('p', { class: 'intro-sub' });
    this.introBy = el('p', { class: 'intro-by' });
    this.loadFill = el('i');
    this.loadPct = el('span', { class: 'load-pct' });
    this.loadText = el('span', { class: 'load-text' });
    this.loadBar = el('div', { class: 'load-bar', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': 0 }, this.loadFill);
    this.loadStar = el('span', { class: 'load-star', html: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 1.5 2.4 6.1 6.1-2.4-2.4 6.1 6.4 2.4-6.4 2.4 2.4 6.1-6.1-2.4L12 22.5l-2.4-6.1-6.1 2.4 2.4-6.1L1.5 12.3l6.4-2.4-2.4-6.1 6.1 2.4z" fill="currentColor"/></svg>' });
    this.loadWrap = el('div', { class: 'load' },
      el('div', { class: 'load-row' }, this.loadText, this.loadPct),
      el('div', { class: 'load-track' }, this.loadBar, this.loadStar));
    this.startBtn = el('button', { class: 'btn-start', type: 'button', disabled: true, onclick: () => this._start() });
    this.tipEl = el('p', { class: 'tip', 'aria-live': 'off' });
    this.introHelp = el('div', { class: 'intro-help' });
    this.introLang = el('button', { class: 'chip-btn intro-lang', type: 'button', onclick: () => this.setLang(this.lang === 'ar' ? 'en' : 'ar') });
    this.rotateNote = el('p', { class: 'rotate-note' });
    this.intro = el('section', { class: 'intro', id: 'intro', 'aria-labelledby': 'intro-title-h' },
      el('div', { class: 'intro-sky', 'aria-hidden': 'true' }),
      el('div', { class: 'intro-dunes', 'aria-hidden': 'true', html: DUNES_SVG }),
      this.introLang,
      el('div', { class: 'intro-card' },
        el('div', { class: 'emblem', 'aria-hidden': 'true', html: EMBLEM_SVG }),
        this.introTitle, this.introSub, this.introBy,
        el('div', { class: 'intro-action' }, this.loadWrap, this.startBtn), this.introHelp, this.rotateNote, this.tipEl));
    this.introTitle.id = 'intro-title-h';

    root.append(this.live, this.hud, this.intro);
  }

  /* ------------------------------------------------------- static strings */
  _applyLangToDocument() {
    const html = document.documentElement;
    html.lang = this.lang;
    html.dir = this.content[this.lang].dir || (this.lang === 'ar' ? 'rtl' : 'ltr');
    try { document.title = `${this.t.title} | ${this.data.profile.name}`; } catch (_) { /* ignore */ }
  }

  _renderStatic() {
    const t = this.t;
    this.introTitle.textContent = t.title;
    this.introSub.textContent = t.subtitle;
    this.introBy.textContent = t.byline;
    this.startBtn.textContent = t.start;
    this.startBtn.append(el('span', { class: 'btn-start-arrow', 'aria-hidden': 'true', html: icon('arrow') }));
    this.loadText.textContent = this._isReady ? t.ready : t.loading;
    this.loadPct.textContent = this.fmt(this._shown * 100) + (this.lang === 'ar' ? '٪' : '%');
    this.introLang.innerHTML = icon('globe') + '<span></span>';
    this.introLang.lastChild.textContent = this.content[this.lang === 'ar' ? 'en' : 'ar'].langName;
    this.introLang.setAttribute('aria-label', t.settingsPanel.language);
    this.introHelp.replaceChildren(...this._helpChips());
    this.rotateNote.textContent = t.rotateHint;
    this._showTip(true);

    this.counterLabel.textContent = t.hud.zones;
    this.wfLabel.textContent = t.hud.nearest;
    this.stamina.setAttribute('aria-label', t.hud.stamina);
    this.staminaLabel.textContent = t.hud.stamina;
    this.minimapBox.setAttribute('aria-label', t.hud.minimap);
    this.btnSettings.setAttribute('aria-label', t.settings);
    this.btnSettings.title = t.settings;
    this._renderSoundBtn();
    this._renderCounter();
    this._hud.target = null; this._hud.dist = -1; this._hud.stamina = -1;
    this._refreshWayfinder(true);
    this._renderPrompt();
    if (this._modal) this._renderModalContent();
  }

  _renderSoundBtn() {
    const t = this.t;
    this.btnSound.innerHTML = icon(this.prefs.sound ? 'soundOn' : 'soundOff');
    this.btnSound.setAttribute('aria-label', t.settingsPanel.sound);
    this.btnSound.setAttribute('aria-pressed', String(this.prefs.sound));
    this.btnSound.title = t.settingsPanel.sound;
  }

  _helpChips() {
    const t = this.t;
    const kb = t.controlsKeyboard.map((c) =>
      el('span', { class: 'help-chip' },
        el('span', { class: 'keys' }, c.keys.map((k) => el('kbd', null, k))),
        el('span', { class: 'help-label', text: c.label })));
    const tc = t.controlsTouch.map((c) =>
      el('span', { class: 'help-chip' },
        el('span', { class: 'help-ico', html: icon(c.icon) }),
        el('span', { class: 'help-label', text: c.label })));
    return [
      el('div', { class: 'help-set only-kbm' }, kb),
      el('div', { class: 'help-set only-touch' }, tc),
    ];
  }

  /* -------------------------------------------------------------- loading */
  setProgress(p) {
    this._target = clamp(+p || 0, 0, 1);
  }

  _tickProgress = () => {
    if (this._disposed) return;
    const diff = this._target - this._shown;
    if (Math.abs(diff) > 0.0005) this._shown = Math.min(1, this._shown + Math.max(diff * 0.1, 0.002) * Math.sign(diff));
    else this._shown = this._target;
    const pct = Math.round(this._shown * 100);
    if (pct !== this._lastPct) {
      this._lastPct = pct;
      this.loadFill.style.transform = `scaleX(${this._shown})`;
      this.loadStar.style.setProperty('--p', this._shown);
      this.loadBar.setAttribute('aria-valuenow', pct);
      this.loadPct.textContent = this.fmt(pct) + (this.lang === 'ar' ? '٪' : '%');
    }
    if (this._isReady && this._shown >= 0.999 && !this._readyShown) this._finishReady();
    if (!this._readyShown) this._raf = requestAnimationFrame(this._tickProgress);
  };

  /** Call once assets are loaded. Fills the bar, then swaps it for the start button. */
  ready() {
    this._isReady = true;
    this._target = 1;
    this._later(() => this._finishReady(), 1400); // rAF can be throttled in background tabs
  }

  _finishReady() {
    if (this._readyShown) return;
    this._readyShown = true;
    this._shown = 1;
    this.loadFill.style.transform = 'scaleX(1)';
    this.loadPct.textContent = this.fmt(100) + (this.lang === 'ar' ? '٪' : '%');
    this.loadText.textContent = this.t.ready;
    this.intro.classList.add('is-ready');
    this.startBtn.disabled = false;
    this.live.textContent = this.t.ready;
    // focus the start button unless something else already grabbed focus
    this._later(() => { if (!this.started && !this._modal) { try { this.startBtn.focus({ preventScroll: true }); } catch (_) { /* ignore */ } } }, 250);
  }

  _startTipRotation() {
    this._tipIdx = Math.floor(Math.random() * 6);
    this._tipTimer = setInterval(() => { if (!this.started) this._showTip(); }, 4200);
    this._disposers.push(() => clearInterval(this._tipTimer));
  }

  _showTip(instant) {
    const tips = this.t.loadingTips;
    if (!tips || !tips.length) return;
    if (!instant) this._tipIdx = (this._tipIdx + 1) % tips.length;
    else this._tipIdx = this._tipIdx % tips.length;
    this.tipEl.classList.remove('in');
    void this.tipEl.offsetWidth;
    this.tipEl.textContent = tips[this._tipIdx];
    this.tipEl.classList.add('in');
  }

  /* ----------------------------------------------------------------- start */
  _start() {
    if (this.started || this.startBtn.disabled) return;
    this.started = true;
    document.documentElement.dataset.started = '1';
    // The click is the user gesture: run the audio unlock first.
    try { const r = this.opts.onStart && this.opts.onStart(); if (r && r.catch) r.catch(() => {}); } catch (e) { console.warn(e); }
    const html = document.documentElement;
    if (html.dataset.input === 'touch') {
      try {
        const fs = html.requestFullscreen || html.webkitRequestFullscreen;
        if (fs && !document.fullscreenElement) { const r = fs.call(html, { navigationUI: 'hide' }); if (r && r.catch) r.catch(() => {}); }
      } catch (_) { /* iOS Safari: not available */ }
    }
    this.intro.classList.add('is-leaving');
    this.hud.hidden = false;
    requestAnimationFrame(() => this.hud.classList.add('is-on'));
    this._later(() => { this.intro.hidden = true; }, 800);
    this.live.textContent = '';
    this._later(() => this.toast(this.t.toastWelcome), 900);
    if (html.dataset.input === 'touch' && innerHeight > innerWidth) this._later(() => this.toast(this.t.rotateHint, 4200), 4200);
    this._renderPrompt();
  }

  /* ------------------------------------------------------------------ world */
  setWorld({ radius, zones } = {}) {
    if (radius) this.worldRadius = radius;
    if (zones) {
      this.zones = zones.map((z) => ({
        id: z.id, x: z.x, z: z.z, r: z.r || 5,
        color: z.color || (this.data.zones[z.id] && this.data.zones[z.id].color) || '#e0a458',
      }));
    }
    this._hud.target = null;
    this._refreshWayfinder(true);
    this._drawMinimap(true);
  }

  markVisited(id) {
    if (!ZONE_IDS.includes(id) || this.visited.has(id)) return;
    this.visited.add(id);
    this._renderCounter(id);
    this._refreshWayfinder(true);
    if (this.visited.size === ZONE_IDS.length) this._celebratePending = true;
  }
  resetVisited() {
    this.visited.clear(); this._celebrated = false; this._celebratePending = false;
    this._renderCounter(); this._refreshWayfinder(true);
  }

  _renderCounter(justId) {
    const n = this.visited.size, tot = ZONE_IDS.length;
    this.counterNum.textContent = `${this.fmt(n)}/${this.fmt(tot)}`;
    for (const d of this.counterDots.children) {
      const on = this.visited.has(d.dataset.zone);
      d.classList.toggle('on', on);
      if (justId && d.dataset.zone === justId) { d.classList.remove('pop'); void d.offsetWidth; d.classList.add('pop'); }
    }
    this.counter.classList.toggle('all', n === tot);
    this.counter.setAttribute('aria-label', `${this.t.hud.zones} ${this.fmt(n)} / ${this.fmt(tot)}`);
  }

  /* ------------------------------------------------------------------- HUD */
  /** Cheap per-frame update. `state` = ride state (x, z, heading, sprintEnergy). */
  updateHud(state) {
    if (!state) return;
    const h = this._hud;
    h.pos.x = state.x; h.pos.z = state.z; h.pos.h = state.heading || 0;

    const e = clamp(state.sprintEnergy == null ? 1 : state.sprintEnergy, 0, 1);
    if (Math.abs(e - h.stamina) > 0.004) {
      const wasLow = h.stamina >= 0 && h.stamina < 0.12;
      h.stamina = e;
      this.staminaFill.style.transform = `scaleX(${e})`;
      this.stamina.classList.toggle('low', e < 0.22);
      this.stamina.classList.toggle('full', e > 0.995);
      this.stamina.setAttribute('aria-valuenow', Math.round(e * 100));
      document.documentElement.style.setProperty('--stamina', e.toFixed(3));
      if (e < 0.03 && !wasLow && this.started) this._toastOnce('stamina', this.t.toastStamina, 6000);
    }
    this.stamina.classList.toggle('sprinting', !!state.sprint);

    // compass
    const tgt = this._nearestUnvisited(state.x, state.z);
    if (tgt !== h.target) { h.target = tgt; this._refreshWayfinder(true); }
    if (tgt) {
      const dx = tgt.x - state.x, dz = tgt.z - state.z;
      const hd = h.pos.h;
      const fwd = dx * Math.sin(hd) + dz * Math.cos(hd);
      const rgt = -dx * Math.cos(hd) + dz * Math.sin(hd);
      const deg = Math.atan2(rgt, fwd) * 180 / Math.PI;
      if (h.arrowDeg == null || Math.abs(deg - h.arrowDeg) > 0.6) {
        h.arrowDeg = deg;
        this.wfArrow.style.transform = `rotate(${deg.toFixed(1)}deg)`;
      }
      const d = Math.max(0, Math.round(Math.hypot(dx, dz) - tgt.r));
      if (d !== h.dist) {
        h.dist = d;
        this.wfDist.textContent = `${this.fmt(d)} ${this.t.hud.meters}`;
      }
    }

    // minimap ~10 Hz
    const now = performance.now();
    if (now - h.mapT > 100) { h.mapT = now; this._drawMinimap(); }
  }

  _nearestUnvisited(x, z) {
    let best = null, bd = Infinity;
    for (const zn of this.zones) {
      if (this.visited.has(zn.id)) continue;
      const d = (zn.x - x) ** 2 + (zn.z - z) ** 2;
      if (d < bd) { bd = d; best = zn; }
    }
    return best;
  }

  _refreshWayfinder() {
    const tgt = this._hud.target;
    const all = this.visited.size === ZONE_IDS.length;
    this.wayfinder.classList.toggle('none', !tgt);
    this.wayfinder.classList.toggle('done', all);
    if (tgt) {
      this.wfName.textContent = this.data.zones[tgt.id].title;
      this.wfLabel.textContent = this.t.hud.nearest;
      this.wayfinder.style.setProperty('--zc', tgt.color);
      this.wfDist.textContent = `${this.fmt(this._hud.dist < 0 ? 0 : this._hud.dist)} ${this.t.hud.meters}`;
    } else if (all) {
      this.wfLabel.textContent = '';
      this.wfName.textContent = this.t.hud.allVisited;
      this.wfDist.textContent = '';
    } else {
      this.wfName.textContent = '';
      this.wfDist.textContent = '';
    }
  }

  _drawMinimap(force) {
    const c = this.mapCanvas, ctx = this._mapCtx;
    if (!ctx || (this.hud.hidden && !force)) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = Math.max(60, Math.round(c.clientWidth || 110));
    if (c.width !== size * dpr) { c.width = c.height = size * dpr; }
    const S = c.width, R = S / 2;
    const night = document.documentElement.hasAttribute('data-night');
    const k = (R - 8 * dpr) / this.worldRadius;
    const { x: px, z: pz, h } = this._hud.pos;
    ctx.clearRect(0, 0, S, S);
    // disc
    ctx.save();
    ctx.beginPath(); ctx.arc(R, R, R - 1, 0, Math.PI * 2); ctx.clip();
    const g = ctx.createRadialGradient(R, R * 0.8, R * 0.1, R, R, R);
    if (night) { g.addColorStop(0, '#22385a'); g.addColorStop(1, '#0d1728'); }
    else { g.addColorStop(0, '#f6e8c8'); g.addColorStop(1, '#e2c48d'); }
    ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
    // rings
    ctx.strokeStyle = night ? 'rgba(224,164,88,.22)' : 'rgba(15,76,92,.22)';
    ctx.lineWidth = dpr;
    for (const f of [0.33, 0.66, 1]) { ctx.beginPath(); ctx.arc(R, R, (R - 8 * dpr) * f, 0, Math.PI * 2); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(R, 6 * dpr); ctx.lineTo(R, S - 6 * dpr); ctx.moveTo(6 * dpr, R); ctx.lineTo(S - 6 * dpr, R); ctx.stroke();
    // world z maps to screen-up, x maps to screen-left: a true top-down view (not mirrored)
    const mx = (x) => R - x * k, my = (z) => R - z * k;
    const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 320);
    for (const zn of this.zones) {
      const vis = this.visited.has(zn.id);
      const x = mx(zn.x), y = my(zn.z);
      const isTgt = zn === this._hud.target;
      if (isTgt) {
        ctx.beginPath(); ctx.arc(x, y, (7 + 4 * pulse) * dpr, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(224,164,88,.35)'; ctx.fill();
      }
      ctx.beginPath(); ctx.arc(x, y, (vis ? 4 : 5.5) * dpr, 0, Math.PI * 2);
      ctx.fillStyle = vis ? (night ? '#7e8ba3' : '#9aa79f') : zn.color;
      ctx.fill();
      ctx.lineWidth = 1.5 * dpr; ctx.strokeStyle = night ? '#0d1728' : '#fff8e6'; ctx.stroke();
      if (vis) {
        ctx.beginPath(); ctx.moveTo(x - 2 * dpr, y); ctx.lineTo(x - 0.5 * dpr, y + 1.7 * dpr); ctx.lineTo(x + 2.4 * dpr, y - 1.8 * dpr);
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.3 * dpr; ctx.stroke();
      }
    }
    // player: arrow pointing along heading. Heading forward = (sin h, cos h) -> screen (-sin h, -cos h)
    const X = mx(px), Y = my(pz);
    const ax = -Math.sin(h), ay = -Math.cos(h);
    const ang = Math.atan2(ax, -ay); // rotation from screen-up, clockwise
    ctx.save();
    ctx.translate(X, Y); ctx.rotate(ang);
    ctx.beginPath(); ctx.moveTo(0, -8 * dpr); ctx.lineTo(5.5 * dpr, 6 * dpr); ctx.lineTo(0, 3 * dpr); ctx.lineTo(-5.5 * dpr, 6 * dpr); ctx.closePath();
    ctx.fillStyle = night ? '#ffd58a' : '#c8553d'; ctx.fill();
    ctx.lineWidth = 1.5 * dpr; ctx.strokeStyle = night ? '#0d1728' : '#fff8e6'; ctx.stroke();
    ctx.restore();
    ctx.restore();
  }

  /* --------------------------------------------------------------- prompt */
  /** Show/hide the "tap to enter" prompt for the zone the camel is standing in. */
  setNearZone(id) {
    if (id === this._nearZone) return;
    this._nearZone = id || null;
    this._renderPrompt();
    if (id && this.started) this.live.textContent = `${this.data.zones[id].title}: ${this.t.enterPrompt}`;
  }
  _renderPrompt() {
    const id = this._nearZone;
    const show = !!id && this.started && !this._modal;
    this.prompt.hidden = !show;
    if (!id) return;
    const z = this.data.zones[id];
    const touch = document.documentElement.dataset.input === 'touch';
    this.promptBtn.replaceChildren(
      el('span', { class: 'prompt-ico', html: icon(z.icon) }),
      el('span', { class: 'prompt-text' },
        el('b', { text: z.title }),
        el('small', { text: touch ? this.t.enterPrompt : this.t.enterPromptKey })));
    this.promptBtn.style.setProperty('--zc', (this.zones.find((q) => q.id === id) || z).color || z.color);
  }
  _enterNear() { if (this._nearZone) this.openZone(this._nearZone); }

  /* ---------------------------------------------------------------- toasts */
  toast(text, ms = 3200) {
    if (!text) return;
    while (this.toasts.children.length >= 3) this.toasts.firstChild.remove();
    const n = el('div', { class: 'toast', text });
    this.toasts.append(n);
    this._later(() => n.classList.add('out'), ms);
    this._later(() => n.remove(), ms + 400);
    return n;
  }
  _toastOnce(key, text, cooldown) {
    const now = performance.now();
    this._toastAt = this._toastAt || {};
    if (this._toastAt[key] && now - this._toastAt[key] < cooldown) return;
    this._toastAt[key] = now;
    this.toast(text);
  }

  /* --------------------------------------------------------------- modal core */
  _openModal(kind, id, build) {
    if (this._modal) this._closeModal(true);
    const opener = document.activeElement;
    const titleId = `modal-title-${kind}`;
    const panel = el('section', { class: `panel panel-${kind}`, role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId, tabindex: '-1', dataset: { zone: id || '' } });
    const overlay = el('div', { class: `overlay overlay-${kind}` }, panel);
    overlay.addEventListener('pointerdown', (e) => { if (e.target === overlay) this._closeModal(); });
    this.root.append(overlay);
    this._modal = { kind, id, opener, overlay, panel, titleId, build, pushed: false };
    const html = document.documentElement;
    html.setAttribute('data-modal', kind);
    this.hud.inert = true;
    this.intro.inert = true;
    this.prompt.hidden = true;
    this._renderModalContent();
    this._attachSwipe(panel);
    try { history.pushState({ rjModal: kind, id }, ''); this._modal.pushed = true; } catch (_) { /* ignore */ }
    requestAnimationFrame(() => {
      if (!this._modal || this._modal.overlay !== overlay) return;
      overlay.classList.add('is-open');
      panel.classList.add('is-in');
      const first = panel.querySelector('[data-autofocus]') || panel;
      try { first.focus({ preventScroll: true }); } catch (_) { /* ignore */ }
    });
    if (this.opts.onModalChange) { try { this.opts.onModalChange(true, kind, id); } catch (e) { console.warn(e); } }
  }

  _renderModalContent() {
    const m = this._modal;
    if (!m) return;
    const keepScroll = m.panel.querySelector('.panel-body') ? m.panel.querySelector('.panel-body').scrollTop : 0;
    const foc = () => [...m.panel.querySelectorAll(FOCUSABLE)];
    const fi = m.panel.contains(document.activeElement) ? foc().indexOf(document.activeElement) : -1;
    m.panel.replaceChildren(...m.build.call(this, m));
    if (fi >= 0) { const n = foc()[fi]; if (n) try { n.focus({ preventScroll: true }); } catch (_) { /* ignore */ } }
    const body = m.panel.querySelector('.panel-body');
    if (body) body.scrollTop = keepScroll;
    if (m.panel.classList.contains('is-in')) m.panel.classList.add('no-anim');
  }

  _closeModal(silent) {
    const m = this._modal;
    if (!m) return;
    this._modal = null;
    const { overlay, panel, opener } = m;
    document.documentElement.removeAttribute('data-modal');
    this.hud.inert = false;
    this.intro.inert = false;
    overlay.classList.remove('is-open');
    panel.classList.add('is-out');
    panel.style.transform = '';
    const remove = () => overlay.remove();
    if (silent) remove(); else this._later(remove, 320);
    if (m.pushed && history.state && history.state.rjModal && !m._fromPop) {
      this._ignorePop = true;
      try { history.back(); } catch (_) { /* ignore */ }
      setTimeout(() => { this._ignorePop = false; }, 120);
    }
    if (opener && opener.focus && document.contains(opener)) { try { opener.focus({ preventScroll: true }); } catch (_) { /* ignore */ } }
    else if (this.started) { try { this.btnSettings.focus({ preventScroll: true }); } catch (_) { /* ignore */ } }
    this._renderPrompt();
    if (!silent) {
      if (m.kind === 'zone') {
        this.live.textContent = this.t.zoneClosed;
        if (this.opts.onZoneClose) { try { this.opts.onZoneClose(m.id); } catch (e) { console.warn(e); } }
        if (this._celebratePending && !this._celebrated) {
          this._celebrated = true; this._celebratePending = false;
          this._later(() => this._celebrate(), 350);
        }
      }
      if (this.opts.onModalChange) { try { this.opts.onModalChange(false, m.kind, m.id); } catch (e) { console.warn(e); } }
    }
  }

  _trapTab(e) {
    const m = this._modal;
    if (!m) return;
    const list = [...m.panel.querySelectorAll(FOCUSABLE)].filter((n) => n.offsetParent !== null || n === document.activeElement);
    if (!list.length) { e.preventDefault(); m.panel.focus(); return; }
    const first = list[0], last = list[list.length - 1];
    const a = document.activeElement;
    if (!m.panel.contains(a)) { e.preventDefault(); (e.shiftKey ? last : first).focus(); }
    else if (e.shiftKey && (a === first || a === m.panel)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && a === last) { e.preventDefault(); first.focus(); }
  }

  _attachSwipe(panel) {
    let sy = 0, dy = 0, active = false, t0 = 0, scroller = null;
    const canStart = (target) => {
      const body = panel.querySelector('.panel-body');
      const inBody = body && body.contains(target);
      return !inBody || body.scrollTop <= 0;
    };
    panel.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) return;
      sy = e.touches[0].clientY; dy = 0; t0 = performance.now();
      scroller = canStart(e.target);
      active = false;
    }, { passive: true });
    panel.addEventListener('touchmove', (e) => {
      if (!scroller || e.touches.length !== 1) return;
      const d = e.touches[0].clientY - sy;
      if (d > 8) {
        const body = panel.querySelector('.panel-body');
        if (body && body.scrollTop > 0) return;
        active = true; dy = d;
        panel.style.transition = 'none';
        panel.style.transform = `translateY(${dy}px)`;
        panel.parentElement.style.setProperty('--fade', String(1 - Math.min(dy / 400, 0.7)));
      } else if (active && d <= 8) { dy = Math.max(0, d); panel.style.transform = `translateY(${dy}px)`; }
    }, { passive: true });
    const end = () => {
      if (!active) return;
      const v = dy / Math.max(1, performance.now() - t0);
      panel.style.transition = '';
      if (dy > 120 || v > 0.6) this._closeModal();
      else { panel.style.transform = ''; panel.parentElement.style.removeProperty('--fade'); }
      active = false; dy = 0;
    };
    panel.addEventListener('touchend', end, { passive: true });
    panel.addEventListener('touchcancel', end, { passive: true });
  }

  _bindGlobal() {
    const onKey = (e) => {
      if (e.key === 'Escape' && this._modal) { e.preventDefault(); this._closeModal(); return; }
      if (e.key === 'Tab' && this._modal) { this._trapTab(e); return; }
      if ((e.key === 'Enter' || e.code === 'NumpadEnter') && !this._modal && this.started && this._nearZone && !e.repeat) {
        const tn = e.target && e.target.tagName;
        if (tn === 'BUTTON' || tn === 'A' || tn === 'INPUT') return;
        e.preventDefault(); this._enterNear();
      }
    };
    const onPop = () => {
      if (this._ignorePop) return;
      if (this._modal) { this._modal._fromPop = true; this._closeModal(); }
    };
    const onResize = () => this._drawMinimap(true);
    const onFs = () => { if (this._modal && this._modal.kind === 'settings') this._renderModalContent(); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('popstate', onPop);
    window.addEventListener('resize', onResize);
    document.addEventListener('fullscreenchange', onFs);
    this._disposers.push(() => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('fullscreenchange', onFs);
    });
  }

  /* -------------------------------------------------------------- zone panel */
  openZone(id) {
    if (!this.data.zones[id]) return;
    this.markVisited(id);
    this._openModal('zone', id, function build(m) { return this._buildZone(m.id, m.titleId); });
    this.live.textContent = this.t.zoneOpened(this.data.zones[id].title);
    if (this.opts.onZoneOpen) { try { this.opts.onZoneOpen(id); } catch (e) { console.warn(e); } }
  }
  closeZone() { if (this._modal && this._modal.kind === 'zone') this._closeModal(); }

  _panelFrame(titleId, zone, bodyNodes, extraClass = '') {
    const t = this.t;
    const close = el('button', { class: 'panel-close', type: 'button', 'aria-label': t.close, title: t.close, html: icon('close'), onclick: () => this._closeModal(), 'data-autofocus': true });
    const head = el('header', { class: 'panel-head' },
      el('span', { class: 'panel-badge', html: icon(zone.icon), style: `--zc:${zone.color}` }),
      el('div', { class: 'panel-titles' },
        el('span', { class: 'panel-kicker', text: zone.kicker }),
        el('h2', { class: 'panel-title', id: titleId, text: zone.title }),
        zone.blurb ? el('p', { class: 'panel-blurb', text: zone.blurb }) : null),
      close);
    const body = el('div', { class: `panel-body ${extraClass}`, tabindex: '-1' }, bodyNodes);
    return [
      el('span', { class: 'orn orn-tl', 'aria-hidden': 'true' }), el('span', { class: 'orn orn-tr', 'aria-hidden': 'true' }),
      el('span', { class: 'orn orn-bl', 'aria-hidden': 'true' }), el('span', { class: 'orn orn-br', 'aria-hidden': 'true' }),
      el('div', { class: 'panel-grab', 'aria-hidden': 'true' }),
      el('div', { class: 'panel-band', 'aria-hidden': 'true' }),
      head, body,
    ];
  }

  _buildZone(id, titleId) {
    const zone = this.data.zones[id];
    const nodes = ({
      about: () => this._zoneAbout(zone),
      projects: () => this._zoneProjects(zone),
      skills: () => this._zoneSkills(zone),
      experience: () => this._zoneExperience(zone),
      contact: () => this._zoneContact(zone),
    })[id]();
    return this._panelFrame(titleId, zone, nodes, `zone-${id}`);
  }

  _reveal(node, i) { node.classList.add('reveal'); node.style.setProperty('--i', i); return node; }

  _zoneAbout(z) {
    const p = this.data.profile;
    let i = 0;
    return [
      this._reveal(el('div', { class: 'about-hero' },
        el('div', { class: 'avatar', 'aria-hidden': 'true' }, el('span', { text: p.initials })),
        el('div', { class: 'about-id' },
          el('h3', { class: 'about-name', text: p.name }),
          el('p', { class: 'about-role', text: p.role }),
          el('p', { class: 'about-loc' }, el('span', { html: icon('pin') }), el('span', { text: p.location })))), i++),
      ...z.bio.map((b) => this._reveal(el('p', { class: 'para', text: b }), i++)),
      this._reveal(el('h3', { class: 'sub', text: z.factsTitle }), i++),
      el('ul', { class: 'facts' }, z.facts.map((f) =>
        this._reveal(el('li', { class: 'fact' }, el('span', { class: 'fact-ico', html: icon(f.icon) }), el('span', { text: f.text })), i++))),
    ];
  }

  _zoneProjects(z) {
    return [el('div', { class: 'cards' }, z.items.map((p, idx) => {
      const link = el('a', { class: 'card-link', href: p.link || '#', target: '_blank', rel: 'noopener noreferrer' },
        el('span', { text: this.t.openLink }), el('span', { html: icon('external') }));
      link.addEventListener('click', (e) => { if (!p.link || p.link === '#') e.preventDefault(); });
      return this._reveal(el('article', { class: 'card', style: `--h:${p.hue || 30}` },
        el('div', { class: 'card-thumb', 'aria-hidden': 'true' },
          el('span', { class: 'card-num', text: this.fmt(idx + 1).padStart(this.lang === 'ar' ? 0 : 2, '0') }),
          el('span', { class: 'card-year', text: p.year })),
        el('div', { class: 'card-body' },
          el('h3', { class: 'card-title', text: p.title }),
          el('p', { class: 'card-desc', text: p.desc }),
          el('ul', { class: 'tags', dir: 'ltr' }, p.tags.map((tg) => el('li', { text: tg }))),
          link)), idx);
    }))];
  }

  _zoneSkills(z) {
    let i = 0;
    return [el('div', { class: 'skill-groups' }, z.groups.map((g) =>
      this._reveal(el('section', { class: 'skill-group' },
        el('h3', { class: 'sub', text: g.title }),
        el('ul', { class: 'skills' }, g.items.map((s) =>
          el('li', { class: 'skill' },
            el('div', { class: 'skill-top' },
              el('span', { class: 'skill-name', dir: 'auto', text: s.name }),
              el('span', { class: 'skill-val' }, z.levelWord(s.level), ' · ', this.fmt(s.level) + (this.lang === 'ar' ? '٪' : '%'))),
            el('div', { class: 'bar', role: 'progressbar', 'aria-label': s.name, 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': s.level },
              el('i', { style: `--v:${s.level}` })))))), i++)))];
  }

  _zoneExperience(z) {
    return [el('ol', { class: 'timeline' }, z.roles.map((r, i) =>
      this._reveal(el('li', { class: 'tl-item' },
        el('span', { class: 'tl-dot', 'aria-hidden': 'true' }),
        el('div', { class: 'tl-card' },
          el('span', { class: 'tl-period', text: r.period }),
          el('h3', { class: 'tl-role', text: r.role }),
          el('p', { class: 'tl-company', text: r.company }),
          el('p', { class: 'tl-desc', text: r.desc }))), i)))];
  }

  _zoneContact(z) {
    const p = this.data.profile;
    let i = 0;
    const copy = el('button', { class: 'btn-ghost', type: 'button', onclick: async () => {
      try { await navigator.clipboard.writeText(p.email); } catch (_) {
        const ta = el('textarea', { style: 'position:fixed;opacity:0', 'aria-hidden': 'true' }); ta.value = p.email; document.body.append(ta); ta.select();
        try { document.execCommand('copy'); } catch (__) { /* ignore */ } ta.remove();
      }
      this.toast(this.t.copied, 2200);
    } }, el('span', { html: icon('copy') }), el('span', { text: this.t.copy }));
    return [
      this._reveal(el('p', { class: 'para lead', text: z.message }), i++),
      this._reveal(el('div', { class: 'mail-box' },
        el('span', { class: 'mail-label', text: z.emailLabel }),
        el('a', { class: 'mail-addr', href: `mailto:${p.email}`, dir: 'ltr', text: p.email }),
        copy), i++),
      this._reveal(el('p', { class: 'avail' }, el('i', { class: 'dot', 'aria-hidden': 'true' }), el('span', { text: z.availability })), i++),
      this._reveal(el('h3', { class: 'sub', text: z.socialsTitle }), i++),
      el('ul', { class: 'socials' }, z.socials.map((s) => {
        const a = el('a', { class: 'social', href: s.url || '#', target: '_blank', rel: 'noopener noreferrer' },
          el('span', { class: 'social-ico', 'aria-hidden': 'true', text: s.name.slice(0, 1) }),
          el('span', { class: 'social-txt' }, el('b', { text: s.name, dir: 'ltr' }), el('small', { text: s.handle, dir: 'ltr' })));
        a.addEventListener('click', (e) => { if (!s.url || s.url === '#') e.preventDefault(); });
        return this._reveal(el('li', null, a), i++);
      })),
    ];
  }

  /* ---------------------------------------------------------------- settings */
  openSettings() {
    if (!this.started) return;
    this._openModal('settings', null, function build(m) { return this._buildSettings(m.titleId); });
  }
  closeSettings() { if (this._modal && this._modal.kind === 'settings') this._closeModal(); }

  _buildSettings(titleId) {
    const S = this.t.settingsPanel;
    const sw = (label, key, ico) => {
      const b = el('button', { class: 'switch', type: 'button', role: 'switch', 'aria-checked': String(!!this.prefs[key]), 'aria-label': label,
        onclick: () => { this._setPref(key, !this.prefs[key]); b.setAttribute('aria-checked', String(!!this.prefs[key])); state.textContent = this.prefs[key] ? S.on : S.off; } },
        el('i'));
      const state = el('span', { class: 'row-state', text: this.prefs[key] ? S.on : S.off });
      return el('div', { class: 'row' }, el('span', { class: 'row-ico', html: icon(ico) }), el('span', { class: 'row-label', text: label }), state, b);
    };
    const seg = (label, ico, options, current, onPick) => {
      const grp = el('div', { class: 'seg', role: 'radiogroup', 'aria-label': label });
      for (const [val, text] of options) {
        const b = el('button', { class: 'seg-btn', type: 'button', role: 'radio', 'aria-checked': String(val === current), text,
          onclick: () => { onPick(val); for (const s of grp.children) s.setAttribute('aria-checked', String(s === b)); } });
        grp.append(b);
      }
      return el('div', { class: 'row row-col' },
        el('div', { class: 'row-head' }, el('span', { class: 'row-ico', html: icon(ico) }), el('span', { class: 'row-label', text: label })), grp);
    };
    const fsOk = document.fullscreenEnabled || document.webkitFullscreenEnabled;
    const help = el('div', { class: 'help-block' },
      el('h3', { class: 'sub', text: S.helpTitle }),
      el('div', { class: 'help-list' }, this._helpList()));
    const nodes = [
      sw(S.sound, 'sound', 'soundOn'),
      sw(S.music, 'music', 'music'),
      seg(S.language, 'globe', LANGS.map((l) => [l, this.content[l].langName]), this.lang, (v) => this.setLang(v)),
      seg(S.quality, 'gear', [['auto', S.qualityAuto], ['low', S.qualityLow], ['med', S.qualityMed], ['high', S.qualityHigh]], this.prefs.quality, (v) => this._setPref('quality', v)),
      seg(S.time, this.prefs.night ? 'moon' : 'sun', [['day', S.day], ['night', S.night]], this.prefs.night ? 'night' : 'day', (v) => this._setPref('night', v === 'night')),
      fsOk ? el('div', { class: 'row' }, el('span', { class: 'row-ico', html: icon('fullscreen') }), el('span', { class: 'row-label', text: S.fullscreen }),
        el('button', { class: 'btn-ghost', type: 'button', onclick: () => this._toggleFullscreen() }, document.fullscreenElement ? '×' : '⛶')) : null,
      help,
    ];
    const zone = { title: this.t.settings, kicker: this.data.profile.name, blurb: '', icon: 'gear', color: '#0f4c5c' };
    return this._panelFrame(titleId, zone, nodes, 'settings-body');
  }

  _helpList() {
    const t = this.t;
    const kb = t.controlsKeyboard.map((c) =>
      el('div', { class: 'hl-row' }, el('span', { class: 'keys' }, c.keys.map((k) => el('kbd', null, k))), el('span', { text: c.label })));
    const tc = t.controlsTouch.map((c) =>
      el('div', { class: 'hl-row' }, el('span', { class: 'help-ico', html: icon(c.icon) }), el('span', { text: c.label })));
    return [el('div', { class: 'only-kbm' }, kb, el('p', { class: 'hl-pad', text: t.controlsGamepad })), el('div', { class: 'only-touch' }, tc)];
  }

  _toggleFullscreen() {
    try {
      if (document.fullscreenElement) document.exitFullscreen();
      else (document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen).call(document.documentElement);
    } catch (_) { /* ignore */ }
  }

  /* -------------------------------------------------------------- prefs */
  _toggleSound() { this._setPref('sound', !this.prefs.sound); }

  _setPref(key, val, silent) {
    this.prefs[key] = val;
    writePrefs(this.prefs);
    const o = this.opts;
    const call = (fn, ...a) => { if (typeof fn === 'function' && !silent) { try { fn(...a); } catch (e) { console.warn(e); } } };
    if (key === 'sound') { this._renderSoundBtn(); call(o.onSoundToggle, val); }
    else if (key === 'music') call(o.onMusicToggle, val);
    else if (key === 'quality') call(o.onQualityChange, val);
    else if (key === 'night') { this._applyNight(val, true); call(o.onTimeToggle, val); }
  }

  _applyNight(night) {
    const html = document.documentElement;
    if (night) html.setAttribute('data-night', ''); else html.removeAttribute('data-night');
    this._drawMinimap(true);
  }

  /** Programmatic setters that do not fire callbacks (used by main after reading ui.prefs). */
  setNight(n) { this.prefs.night = !!n; writePrefs(this.prefs); this._applyNight(!!n); }

  setLang(lang) {
    if (!this.content[lang] || lang === this.lang) return;
    this.lang = lang;
    this.prefs.lang = lang;
    writePrefs(this.prefs);
    this._applyLangToDocument();
    this._renderStatic();
    this._lastPct = -1;
    if (this.opts.onLangChange) { try { this.opts.onLangChange(lang); } catch (e) { console.warn(e); } }
    this.live.textContent = this.data.langName;
  }

  /* -------------------------------------------------------------- celebrate */
  _celebrate() {
    this.toast(this.t.celebrate, 5200);
    this.counter.classList.add('party');
    this._later(() => this.counter.classList.remove('party'), 6000);
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const box = el('div', { class: 'confetti', 'aria-hidden': 'true' });
    const cols = ['#e0a458', '#c8553d', '#0f4c5c', '#f3e2c0', '#2a9d8f'];
    for (let i = 0; i < 46; i++) {
      const s = el('i');
      s.style.cssText = `--x:${(Math.random() * 100).toFixed(1)}%;--d:${(1.8 + Math.random() * 1.6).toFixed(2)}s;--w:${(Math.random() * 0.6).toFixed(2)}s;--r:${Math.floor(Math.random() * 720 - 360)}deg;--dx:${Math.floor(Math.random() * 160 - 80)}px;background:${cols[i % cols.length]}`;
      box.append(s);
    }
    this.root.append(box);
    this._later(() => box.remove(), 4200);
  }

  /* ----------------------------------------------------------------- misc */
  _later(fn, ms) {
    const id = setTimeout(() => { this._timers.delete(id); fn(); }, ms);
    this._timers.add(id);
    return id;
  }

  dispose() {
    this._disposed = true;
    cancelAnimationFrame(this._raf);
    for (const id of this._timers) clearTimeout(id);
    for (const d of this._disposers.splice(0)) d();
    if (this._modal) this._closeModal(true);
    document.documentElement.removeAttribute('data-modal');
    this.hud.remove(); this.intro.remove(); this.live.remove();
  }
}

/* ------------------------------------------------------------------ art */
const EMBLEM_SVG = `<svg viewBox="0 0 120 120" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round">
<path d="M60 6 72 30 96 18 90 44 114 54 92 68 108 90 82 88 78 114 60 96 42 114 38 88 12 90 28 68 6 54 30 44 24 18 48 30z" fill="currentColor" fill-opacity=".14"/>
<circle cx="60" cy="60" r="26" stroke-opacity=".8"/><path d="M44 66c4-10 8-14 16-14s10 6 14 6M74 58v14M46 66v10" stroke-linecap="round"/><circle cx="82" cy="40" r="3.5" fill="currentColor" stroke="none"/></svg>`;

const DUNES_SVG = `<svg viewBox="0 0 1200 300" preserveAspectRatio="none" width="100%" height="100%">
<path class="d3" d="M0 190C150 120 260 120 420 170S700 230 860 160 1100 110 1200 150V300H0z"/>
<path class="d2" d="M0 230C200 170 330 190 500 225S800 270 980 215 1120 190 1200 205V300H0z"/>
<path class="d1" d="M0 270C170 240 300 245 470 268S780 292 950 262 1120 250 1200 262V300H0z"/></svg>`;
