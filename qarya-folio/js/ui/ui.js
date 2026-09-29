// واجهة القرية: loader/title screen, HUD, zone prompt, panels, menu, help,
// touch buttons, mini-map and toasts. Contract: see ARCHITECTURE.md.
//
// createUI(ctx) runs before the renderer exists (only ctx.events, content, P,
// touch, mobile are there). attach(ctx) is called once player/camera exist.

import { icon, SECTION_ICON, sectionAccent } from './icons.js';
import { sectionHTML, controlsTable, esc } from './sections.js';
import { createMinimap } from './minimap.js';

export function createUI(ctx) {
  const { events, content, P } = ctx;
  const U = content.ui;
  const ar = content.toArabicDigits;
  const root = document.getElementById('ui');
  const touch = !!ctx.touch;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
  };

  // Keep CSS in step with the shared palette.
  const rs = document.documentElement.style;
  for (const [k, v] of Object.entries({
    crimson: P.crimson, saffron: P.saffron, cream: P.cream, sand: P.sand, 'sand-l': P.sandLight,
    brass: P.brass, ink: P.ink, teal: P.teal, indigo: P.indigo, water: P.water, 'water-d': P.waterDeep,
  })) rs.setProperty(`--${k}`, v);
  document.documentElement.classList.toggle('is-touch', touch);

  // Buttons: emit a click sound, and drop focus after a mouse/touch click so
  // a later Enter/Space goes to the game rather than re-pressing the button.
  function onTap(el, fn, { sound = true } = {}) {
    el.addEventListener('click', (e) => {
      if (sound) events.emit('ui:click');
      fn(e);
      if (e.detail > 0) el.blur();
    });
  }

  // ───────────────────────────── Loader / title ─────────────────────────────
  const loader = document.getElementById('loader');
  const $ = (id) => document.getElementById(id);
  const bar = $('load-bar');
  const pct = $('ld-pct');
  const progressEl = $('ld-progress');
  const walker = $('ld-walker');
  const startBtn = $('ld-start');
  if ($('ld-tagline')) $('ld-tagline').textContent = content.profile.tagline;
  if ($('ld-kicker')) $('ld-kicker').textContent = `معرض أعمال ${content.profile.name}`;
  if ($('ld-name')) $('ld-name').textContent = `${content.profile.name} · ${content.profile.role}`;
  if ($('ld-text')) $('ld-text').textContent = U.loading;
  if (startBtn) startBtn.querySelector('span').textContent = U.start;

  let loaded = false;
  let started = false;
  let resolveReady;
  const readyP = new Promise((r) => { resolveReady = r; });
  let shown = 0; // displayed progress, eased toward the real value

  function setProgress(k) {
    k = Math.max(0, Math.min(1, k));
    shown = Math.max(shown, k);
    const p = Math.round(shown * 100);
    if (bar) bar.style.width = `${p}%`;
    if (walker) walker.style.setProperty('--k', shown.toFixed(3));
    if (pct) pct.textContent = `${ar(p)}٪`;
    progressEl?.setAttribute('aria-valuenow', String(p));
    if (k >= 1 && !loaded) showStart();
  }

  function showStart() {
    loaded = true;
    if (!loader) { begin(); return; }
    loader.setAttribute('aria-busy', 'false');
    loader.classList.add('ready');
    if (startBtn) {
      startBtn.hidden = false;
      setTimeout(() => startBtn.focus({ preventScroll: true }), 50);
    }
    loader.addEventListener('click', begin);
    addEventListener('keydown', onStartKey);
  }
  function onStartKey(e) {
    if (e.code === 'Enter' || e.code === 'Space' || e.code === 'NumpadEnter') { e.preventDefault(); begin(); }
  }

  function begin() {
    if (started || !loaded) return;
    started = true;
    removeEventListener('keydown', onStartKey);
    events.emit('ui:click');
    resolveReady();
    startBtn?.blur();
    if (loader) {
      loader.classList.add('leaving');
      setTimeout(() => loader.remove(), reduceMotion ? 350 : 1600);
    }
    setTimeout(showHUD, reduceMotion ? 100 : 650);
  }

  // ──────────────────────────────── HUD ────────────────────────────────
  const hud = document.createElement('div');
  hud.className = 'hud';
  hud.innerHTML = `
    <nav class="hud-bar" aria-label="أدوات">
      <button type="button" class="hud-btn hud-menu" data-k="menu" aria-label="${esc(U.menu)}" aria-haspopup="dialog">${icon('menu')}<span class="lbl">${esc(U.menu)}</span></button>
      <button type="button" class="hud-btn" data-k="help" aria-label="${esc(U.help)}" aria-haspopup="dialog">${icon('help')}<span class="lbl">${esc(U.help)}</span></button>
      <button type="button" class="hud-btn" data-k="sound" aria-label="كتم الصوت" aria-pressed="false">${icon('soundOn', 'i-on')}${icon('soundOff', 'i-off')}</button>
      <button type="button" class="hud-btn" data-k="reset" aria-label="العودة إلى البداية">${icon('reset')}</button>
    </nav>
    <button type="button" class="hud-map" aria-label="الخريطة — افتح قائمة الأقسام"></button>
    <button type="button" class="prompt" aria-live="polite" hidden>
      <span class="prompt-ring" aria-hidden="true">
        <svg viewBox="0 0 48 48"><circle class="r-bg" cx="24" cy="24" r="21"/><circle class="r-fg" cx="24" cy="24" r="21"/></svg>
        <span class="prompt-ico"></span>
      </span>
      <span class="prompt-text"><small class="prompt-kicker"></small><strong class="prompt-title"></strong></span>
      <span class="prompt-key"></span>
    </button>
    <div class="hint" hidden></div>
    <div class="toasts" role="status" aria-live="polite"></div>
    ${touch ? `<div class="pad">
      <button type="button" class="pad-btn pad-camel" aria-label="صوت الجمل">${icon('camel')}</button>
      <button type="button" class="pad-btn pad-jump" aria-label="القفز">${icon('jump')}</button>
    </div>` : ''}`;
  root.appendChild(hud);

  const q = (s) => hud.querySelector(s);
  const btn = (k) => q(`[data-k="${k}"]`);
  onTap(btn('menu'), () => toggleSheet('menu'));
  onTap(btn('help'), () => toggleSheet('help'));
  onTap(btn('sound'), () => events.emit('audio:toggle'));
  onTap(btn('reset'), () => {
    closeSheet();
    events.emit('player:reset');
    toast('عدت إلى مدخل القرية', 'reset');
  });

  let muted = false;
  function setMuted(m) {
    muted = !!m;
    const b = btn('sound');
    b.classList.toggle('muted', muted);
    b.setAttribute('aria-pressed', String(muted));
    b.setAttribute('aria-label', muted ? 'تشغيل الصوت' : 'كتم الصوت');
  }
  events.on('audio:toggle', () => setMuted(!muted));
  events.on('audio:state', (s) => setMuted(s?.muted));

  function showHUD() {
    hud.classList.add('on');
    showFirstHint();
  }

  // Touch pad.
  if (touch) {
    const jump = q('.pad-jump');
    const camel = q('.pad-camel');
    const press = (el, fn) => {
      el.addEventListener('pointerdown', (e) => { e.preventDefault(); el.classList.add('down'); fn(); });
      const up = () => el.classList.remove('down');
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
      el.addEventListener('pointerleave', up);
      el.addEventListener('click', (e) => { if (e.detail === 0) fn(); }); // keyboard
      el.addEventListener('contextmenu', (e) => e.preventDefault());
    };
    press(jump, () => ctx.input?.press('jump'));
    press(camel, () => events.emit('camel:grunt'));
  }

  // ───────────────────────────── Hints ─────────────────────────────
  const hint = q('.hint');
  let hintOn = false;
  let hintT = 0;
  function showFirstHint() {
    const key = touch ? 'qarya-hint-touch' : 'qarya-hint-keys';
    if (store.get(key)) return;
    hint.innerHTML = touch
      ? `<span class="hint-hand">${icon('hand')}</span><span>اسحب على الشاشة للتحرك</span>`
      : `<span class="hint-keys" dir="ltr"><kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd></span><span>للتحرك</span><span class="dot">•</span><span dir="ltr"><kbd>Space</kbd></span><span>للقفز</span>`;
    hint.hidden = false;
    requestAnimationFrame(() => hint.classList.add('on'));
    hintOn = true;
    hintT = 0;
    store.set(key, '1');
  }
  function hideHint() {
    if (!hintOn) return;
    hintOn = false;
    hint.classList.remove('on');
    setTimeout(() => { hint.hidden = true; }, 500);
  }

  // ───────────────────────────── Toasts ─────────────────────────────
  const toasts = q('.toasts');
  function toast(text, kind = 'info', ms = 3200) {
    const el = document.createElement('div');
    el.className = `toast toast-${kind}`;
    const ic = kind === 'achv' ? 'star' : kind === 'reset' ? 'reset' : kind === 'go' ? 'pin' : 'starLine';
    el.innerHTML = `<span class="toast-ico">${icon(ic)}</span><span>${esc(text)}</span>`;
    toasts.appendChild(el);
    while (toasts.children.length > 3) toasts.firstElementChild.remove();
    requestAnimationFrame(() => el.classList.add('on'));
    setTimeout(() => {
      el.classList.remove('on');
      el.classList.add('off');
      setTimeout(() => el.remove(), 450);
    }, ms);
  }

  // ─────────────────────────── Zone prompt ───────────────────────────
  const prompt = q('.prompt');
  const ringFg = prompt.querySelector('.r-fg');
  const RING = 2 * Math.PI * 21;
  ringFg.style.strokeDasharray = `${RING}`;
  ringFg.style.strokeDashoffset = `${RING}`;
  let zoneNow = null;
  onTap(prompt, () => { if (zoneNow) events.emit('zone:request-open'); });

  function kickerFor(zone) {
    if (zone.section === 'project') {
      const pr = content.projects[zone.project];
      return `${U.sections.project} · ${pr?.subtitle || ''}`;
    }
    return U.sections[zone.section] || '';
  }

  function showPrompt(zone) {
    prompt.style.setProperty('--accent', sectionAccent(zone, content, P));
    prompt.querySelector('.prompt-ico').innerHTML = icon(SECTION_ICON[zone.section]);
    prompt.querySelector('.prompt-kicker').textContent = kickerFor(zone);
    prompt.querySelector('.prompt-title').textContent = zone.title;
    prompt.querySelector('.prompt-key').innerHTML = touch
      ? `${icon('hand')}<span>${esc(U.tap)}</span>`
      : esc(U.press).replace('Enter', '<kbd dir="ltr">Enter</kbd>');
    prompt.setAttribute('aria-label', `${zone.title} — ${touch ? U.tap : U.press}`);
    ringFg.style.strokeDashoffset = `${RING}`;
    prompt.hidden = false;
    prompt.classList.remove('off');
    requestAnimationFrame(() => prompt.classList.add('on'));
  }
  function hidePrompt() {
    prompt.classList.remove('on');
    prompt.classList.add('off');
    const z = zoneNow;
    setTimeout(() => { if (!prompt.classList.contains('on') && zoneNow === z) prompt.hidden = true; }, 300);
  }

  let oasisToasted = false;
  events.on('zone:enter', (zone) => {
    zoneNow = zone;
    map?.setActive(zone.id);
    if (!sheet.open) showPrompt(zone);
    if (zone.section === 'oasis' && !oasisToasted) {
      oasisToasted = true;
      toast('وصلت إلى الواحة!', 'achv', 4200);
    }
  });
  events.on('zone:leave', () => {
    zoneNow = null;
    map?.setActive(null);
    hidePrompt();
  });
  events.on('zone:progress', ({ progress }) => {
    ringFg.style.strokeDashoffset = `${RING * (1 - progress)}`;
  });

  // ───────────────────────────── Sheets ─────────────────────────────
  // One modal sheet reused for panels, the menu and help: a bottom sheet on
  // phones, a centred card on wider screens.
  const layer = document.createElement('div');
  layer.className = 'sheet-layer';
  layer.hidden = true;
  layer.innerHTML = `
    <div class="backdrop"></div>
    <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title" tabindex="-1">
      <div class="sheet-grab" aria-hidden="true"><span></span></div>
      <button type="button" class="sheet-close" aria-label="${esc(U.close)}">${icon('close')}</button>
      <div class="sheet-scroll"></div>
      <div class="sheet-frame" aria-hidden="true"></div>
    </div>`;
  root.appendChild(layer);
  const sheetEl = layer.querySelector('.sheet');
  const scrollEl = layer.querySelector('.sheet-scroll');
  const sheet = { open: false, kind: null, zone: null, prevFocus: null, closing: 0 };

  onTap(layer.querySelector('.sheet-close'), () => closeSheet());
  layer.querySelector('.backdrop').addEventListener('click', () => { events.emit('ui:click'); closeSheet(); });
  scrollEl.addEventListener('click', (e) => {
    const a = e.target.closest('[data-act], [data-go], a[href]');
    if (!a) return;
    events.emit('ui:click');
    if (a.dataset.act === 'close') closeSheet();
    else if (a.dataset.act === 'menu') openSheet('menu');
    else if (a.dataset.go) goTo(a.dataset.go);
    else if (a.getAttribute('href') === '#') e.preventDefault();
  });
  events.on('ui:escape', () => { if (sheet.open) closeSheet(); });

  function toggleSheet(kind) {
    if (sheet.open && sheet.kind === kind) closeSheet();
    else openSheet(kind);
  }

  function openSheet(kind, zone = null) {
    clearTimeout(sheet.closing);
    const wasPanel = sheet.open && sheet.kind === 'panel';
    if (!sheet.open) sheet.prevFocus = document.activeElement;
    sheet.kind = kind;
    sheet.zone = zone;
    let html = '';
    if (kind === 'panel') html = sectionHTML(zone, ctx);
    else if (kind === 'menu') html = menuHTML();
    else if (kind === 'help') html = helpHTML();
    scrollEl.innerHTML = html;
    scrollEl.scrollTop = 0;
    sheetEl.dataset.kind = kind;
    sheetEl.style.setProperty('--accent', zone ? sectionAccent(zone, content, P) : P.crimson);
    sheetEl.style.transform = '';
    layer.hidden = false;
    sheet.open = true;
    for (const k of ['menu', 'help']) btn(k).setAttribute('aria-expanded', String(kind === k));
    hud.classList.add('sheet-open');
    if (ctx.input) ctx.input.enabled = false;
    prompt.classList.remove('on');
    prompt.hidden = true;
    requestAnimationFrame(() => requestAnimationFrame(() => layer.classList.add('open')));
    setTimeout(() => layer.querySelector('.sheet-close').focus({ preventScroll: true }), 60);
    if (wasPanel && kind !== 'panel') events.emit('panel:closed');
    if (kind === 'panel') events.emit('panel:open', { zone });
  }

  function closeSheet() {
    if (!sheet.open) return;
    const kind = sheet.kind;
    sheet.open = false;
    layer.classList.remove('open');
    hud.classList.remove('sheet-open');
    for (const k of ['menu', 'help']) btn(k).setAttribute('aria-expanded', 'false');
    sheet.closing = setTimeout(() => { layer.hidden = true; scrollEl.innerHTML = ''; }, reduceMotion ? 10 : 380);
    if (ctx.input && started) ctx.input.enabled = true;
    const pf = sheet.prevFocus;
    if (pf && pf !== document.body && pf.isConnected && pf.matches(':focus-visible, .hud-btn') && !pf.closest('.loader')) {
      pf.focus({ preventScroll: true });
    } else document.activeElement?.blur?.();
    if (kind === 'panel') events.emit('panel:closed');
    if (zoneNow) showPrompt(zoneNow);
  }

  events.on('zone:open', (zone) => {
    if (!zone) return;
    openSheet('panel', zone);
    discover(zone);
  });

  // Drag the phone bottom sheet down to close it.
  {
    let y0 = null; let dy = 0;
    const grab = (e) => e.target.closest('.sheet-grab, .sheet-head');
    sheetEl.addEventListener('pointerdown', (e) => {
      if (!matchMedia('(max-width: 640px)').matches || !grab(e) || e.target.closest('button, a')) return;
      y0 = e.clientY; dy = 0;
      sheetEl.setPointerCapture?.(e.pointerId);
      sheetEl.classList.add('dragging');
    });
    sheetEl.addEventListener('pointermove', (e) => {
      if (y0 === null) return;
      dy = Math.max(0, e.clientY - y0);
      sheetEl.style.transform = `translateY(${dy}px)`;
    });
    const end = () => {
      if (y0 === null) return;
      y0 = null;
      sheetEl.classList.remove('dragging');
      sheetEl.style.transform = '';
      if (dy > 90) closeSheet();
    };
    sheetEl.addEventListener('pointerup', end);
    sheetEl.addEventListener('pointercancel', end);
  }

  // ───────────────────────── Menu / discovery ─────────────────────────
  const visited = new Set();
  function discover(zone) {
    if (visited.has(zone.id)) return;
    visited.add(zone.id);
    const n = visited.size;
    const total = content.zones.length;
    if (n === total) toast('رائع! زرت كل أرجاء القرية', 'achv', 5000);
    else if (zone.section !== 'oasis') toast(`اكتشفت: ${zone.title} (${ar(n)} من ${ar(total)})`, 'info');
  }

  function menuHTML() {
    let html = `
    <header class="sheet-head plain">
      <div class="head-row">
        <span class="head-ico">${icon('menu')}</span>
        <div class="head-text">
          <p class="head-kicker">قرية الواحة</p>
          <h2 class="head-title" id="sheet-title">${esc(U.menu)}</h2>
          <p class="head-sub">اختر مكاناً وسيحملك الجمل إليه · زرت ${ar(visited.size)} من ${ar(content.zones.length)}</p>
        </div>
      </div>
    </header>
    <div class="sheet-body"><ul class="menu-list">`;
    let souq = false;
    for (const z of content.zones) {
      if (z.section === 'project' && !souq) {
        souq = true;
        html += `<li class="menu-group" aria-hidden="true"><span>السوق · المشاريع</span></li>`;
      } else if (z.section !== 'project' && souq) {
        souq = false;
        html += `<li class="menu-group" aria-hidden="true"><span>أرجاء القرية</span></li>`;
      }
      const sub = z.section === 'project'
        ? content.projects[z.project]?.subtitle
        : U.sections[z.section];
      const seen = visited.has(z.id);
      html += `<li><button type="button" class="menu-row${seen ? ' seen' : ''}${zoneNow?.id === z.id ? ' here' : ''}" data-go="${esc(z.id)}" style="--accent:${esc(sectionAccent(z, content, P))}">
        <span class="menu-ico">${icon(SECTION_ICON[z.section])}</span>
        <span class="menu-text"><strong>${esc(z.title)}</strong><small>${esc(sub || '')}</small></span>
        ${seen ? `<span class="menu-seen" title="زرته">${icon('check')}</span>` : ''}
        <span class="menu-go">${icon('chevron')}</span>
      </button></li>`;
    }
    return `${html}</ul></div>`;
  }

  function helpHTML() {
    const rows = touch ? U.helpMobile : U.helpDesktop;
    return `
    <header class="sheet-head plain">
      <div class="head-row">
        <span class="head-ico">${icon('help')}</span>
        <div class="head-text">
          <p class="head-kicker">كيف تتجوّل</p>
          <h2 class="head-title" id="sheet-title">${esc(U.help)}</h2>
          <p class="head-sub">${touch ? 'كل شيء بلمسة إصبع' : 'لوحة المفاتيح تكفي'}</p>
        </div>
      </div>
    </header>
    <div class="sheet-body">
      ${controlsTable(rows)}
      <p class="note">${icon('starLine')} اقترب من أي مَعلَم ليظهر اسمه، ثم ${touch ? 'المسه' : 'اضغط Enter'} أو قف قليلاً ليُفتح.</p>
    </div>`;
  }

  /** Spot just outside a zone, on the side away from its landmark, facing it. */
  function spotFor(zone) {
    const lm = zone.landmark || { x: zone.x, z: zone.z - 1 };
    let dx = zone.x - lm.x; let dz = zone.z - lm.z;
    const len = Math.hypot(dx, dz) || 1;
    dx /= len; dz /= len;
    const d = zone.radius + 1.8;
    return { x: zone.x + dx * d, z: zone.z + dz * d, heading: Math.atan2(-dx, -dz) };
  }

  function goTo(id) {
    const zone = content.zones.find((z) => z.id === id);
    if (!zone) return;
    closeSheet();
    events.emit('player:teleport', spotFor(zone));
    toast(`انتقلت إلى ${zone.title}`, 'go', 2400);
  }

  // ───────────────────────────── Mini-map ─────────────────────────────
  let map = null;
  const mapBtn = q('.hud-map');
  onTap(mapBtn, () => toggleSheet('menu'));
  map = createMinimap(mapBtn, ctx);

  // ───────────────────────────── API ─────────────────────────────
  let attached = false;
  return {
    setProgress,
    ready: () => readyP,
    toast,
    attach(c) {
      attached = true;
      Object.assign(ctx, c === ctx ? {} : c);
    },
    update(dt, t) {
      if (!attached || !ctx.player) return;
      if (sheet.open && ctx.input) ctx.input.enabled = false;
      map.update(ctx.player, t);
      if (hintOn) {
        hintT += dt;
        const moved = touch ? !!ctx.input?.stick : Math.abs(ctx.player.speed || 0) > 1.2;
        if ((moved && hintT > 1.2) || hintT > 10) hideHint();
      }
    },
    noWebGL() {
      loader?.remove();
      hud.remove();
      layer.remove();
      root.appendChild(noWebGLPage());
    },
  };

  // ───────────────────────── No-WebGL page ─────────────────────────
  function noWebGLPage() {
    const page = document.createElement('main');
    page.className = 'paper-page';
    const pf = content.profile;
    page.innerHTML = `
      <header class="pp-hero">
        <div class="pp-sun" aria-hidden="true"></div>
        <p class="pp-kicker">${esc(pf.name)} · ${esc(pf.role)}</p>
        <h1>قرية الواحة</h1>
        <p class="pp-tag">${esc(pf.tagline)}</p>
      </header>
      <div class="pp-note">
        <span class="pp-note-ico">${icon('camel')}</span>
        <p><strong>عذراً، الجمل لا يستطيع السير هنا.</strong>
        متصفحك لا يدعم WebGL، فلا يمكن عرض القرية ثلاثية الأبعاد. لكن لا بأس — إليك كل ما فيها مكتوباً على الورق.</p>
      </div>
      <div class="pp-sections">
        ${content.zones.map((z) => `<article class="pp-card" style="--accent:${esc(sectionAccent(z, content, P))}">${sectionHTML(z, ctx, { standalone: true })}</article>`).join('')}
      </div>
      <footer class="pp-foot">${icon('star')} ${esc(pf.name)} · ${ar(new Date().getFullYear())}</footer>`;
    page.querySelectorAll('#sheet-title').forEach((h) => h.removeAttribute('id'));
    return page;
  }
}
