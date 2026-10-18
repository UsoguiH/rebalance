/* Goals — a small goal tracker styled after the Revolut app (see /DESIGN.md).
   Vanilla JS, no build step. Data lives in localStorage on this device. */
(() => {
  'use strict';

  // ---------- constants ----------
  const STORE_KEY = 'goals.v1';
  const COLORS = ['#494fdf', '#00a87e', '#7c57f4', '#de1b87', '#d67200', '#08a4af', '#007bc2', '#e61e49'];
  const EMOJIS = ['🏝️', '🏠', '🚗', '💻', '🛟', '✈️', '💍', '🎓', '🎸', '🎁', '📱', '🚲', '🐶', '👶', '🏋️', '📚'];
  const CURRENCIES = ['GBP', 'USD', 'EUR'];
  const DAY = 864e5;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

  // ---------- state ----------
  let state = load();
  let current = 0;          // carousel index; 0 is "All goals"
  let query = '';
  let showAllActivity = false;
  let firstRender = true;
  const shown = new Map();  // last displayed number per key, for count-up and bar transitions

  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(STORE_KEY));
      if (s && Array.isArray(s.goals)) return s;
    } catch (e) { /* storage unavailable or corrupt */ }
    return { currency: 'GBP', goals: [], activity: [] };
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  // ---------- helpers ----------
  const $ = (s, el = document) => el.querySelector(s);
  const uid = () => Math.random().toString(36).slice(2, 10);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const round2 = n => Math.round(n * 100) / 100;
  const pct = g => g.target > 0 ? Math.min(1, g.saved / g.target) : 0;
  const isDone = g => g.saved >= g.target;
  const goalById = id => state.goals.find(g => g.id === id);

  const fmtCache = {};
  function fmt(n, decimals = 2) {
    const key = state.currency + decimals;
    fmtCache[key] ||= new Intl.NumberFormat('en-GB', { style: 'currency', currency: state.currency, minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    return fmtCache[key].format(n);
  }
  const fmtShort = n => fmt(n, Number.isInteger(round2(n)) ? 0 : 2);
  function splitMoney(n) {
    fmt(0); // make sure the 2-decimal formatter for this currency exists
    const parts = fmtCache[state.currency + 2].formatToParts(n);
    let int = '', dec = '';
    for (const p of parts) (p.type === 'decimal' || p.type === 'fraction' ? (dec += p.value) : (int += p.value));
    return { int, dec };
  }
  const symbol = () => splitMoney(0).int.replace(/[\d\s.,]/g, '');
  const moneyHTML = n => { const { int, dec } = splitMoney(n); return `<span class="int">${int}</span><span class="dec">${dec}</span>`; };

  function daysLeft(g) {
    if (!g.deadline) return null;
    const end = new Date(g.deadline + 'T23:59:59');
    return Math.ceil((end - Date.now()) / DAY);
  }
  function whenLabel(ts) {
    const d = new Date(ts), now = new Date();
    const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    if (ts >= startToday) return `Today, ${time}`;
    if (ts >= startToday - DAY) return `Yesterday, ${time}`;
    return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}, ${time}`;
  }
  function monthNet(offset) {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - offset, 1).getTime();
    const end = new Date(now.getFullYear(), now.getMonth() - offset + 1, 1).getTime();
    return state.activity.filter(a => a.at >= start && a.at < end).reduce((s, a) => s + a.amount, 0);
  }

  // cubic-bezier solver so JS-driven motion uses the same curve as the CSS tokens
  function bezier(x1, y1, x2, y2) {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
    const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const sx = t => ((ax * t + bx) * t + cx) * t, sy = t => ((ay * t + by) * t + cy) * t, dx = t => (3 * ax * t + 2 * bx) * t + cx;
    return x => {
      let t = x;
      for (let i = 0; i < 8; i++) {
        const e = sx(t) - x, d = dx(t);
        if (Math.abs(e) < 1e-5 || Math.abs(d) < 1e-6) break;
        t -= e / d;
      }
      return sy(Math.min(1, Math.max(0, t)));
    };
  }
  const ease = bezier(.15, .5, .5, 1);
  const wait = ms => new Promise(r => setTimeout(r, reduceMotion.matches ? Math.min(ms, 120) : ms));

  function countUp(el, from, to, dur = 900) {
    if (from === to || reduceMotion.matches) { el.innerHTML = moneyHTML(to); return; }
    const t0 = performance.now();
    const step = now => {
      const k = Math.min(1, (now - t0) / dur);
      el.innerHTML = moneyHTML(from + (to - from) * ease(k));
      if (k < 1 && el.isConnected) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // ---------- derived ----------
  const sortedGoals = () => [...state.goals].sort((a, b) =>
    (isDone(a) - isDone(b)) ||
    ((daysLeft(a) ?? 1e9) - (daysLeft(b) ?? 1e9)) ||
    (a.created - b.created));
  function totals() {
    const saved = state.goals.reduce((s, g) => s + g.saved, 0);
    const target = state.goals.reduce((s, g) => s + g.target, 0);
    return { saved, target, p: target ? Math.min(1, saved / target) : 0 };
  }
  const slides = () => [null, ...sortedGoals()]; // null is the "All goals" slide

  // ---------- rendering ----------
  const carousel = $('#carousel'), dots = $('#dots'), content = $('#content');
  const bgA = $('#heroBgA'), bgB = $('#heroBgB');
  let bgFront = bgA;

  function heroGradient(color) {
    const c = color || '#55789b';
    return `radial-gradient(140% 100% at 50% 0%, ${c}d9 0%, ${c}59 38%, ${c}14 66%, transparent 86%), #000`;
  }
  function setHeroBg(color) {
    const back = bgFront === bgA ? bgB : bgA;
    back.style.background = heroGradient(color);
    back.style.opacity = 1;
    bgFront.style.opacity = 0;
    bgFront = back;
  }

  function render() {
    renderCarousel();
    renderContent();
    firstRender = false;
  }

  function renderCarousel() {
    const list = slides();
    current = Math.min(current, list.length - 1);
    const t = totals();
    carousel.innerHTML = list.map((g, i) => {
      if (!g) {
        const n = state.goals.length;
        return `<article class="slide" data-i="0">
          <p class="slide-label">All goals · ${state.currency}</p>
          <p class="balance num" data-key="all" data-value="${t.saved}">${moneyHTML(t.saved)}</p>
          <button class="pill press" data-pill="all">${n ? `${n} goal${n > 1 ? 's' : ''} · ${Math.round(t.p * 100)}%` : 'No goals yet'}</button>
        </article>`;
      }
      return `<article class="slide" data-i="${i}">
        <p class="slide-label">${g.emoji} ${esc(g.name)}</p>
        <p class="balance num" data-key="${g.id}" data-value="${g.saved}">${moneyHTML(g.saved)}</p>
        <button class="pill press" data-pill="${g.id}">${isDone(g) ? 'Goal reached ✓' : `of ${fmtShort(g.target)} · ${Math.round(pct(g) * 100)}%`}</button>
      </article>`;
    }).join('');
    dots.innerHTML = list.length > 1 ? list.map((_, i) => `<i class="${i === current ? 'on' : ''}"></i>`).join('') : '';
    carousel.scrollLeft = current * carousel.clientWidth;

    carousel.querySelectorAll('.balance').forEach(el => {
      const key = el.dataset.key, to = +el.dataset.value;
      const from = shown.has(key) ? shown.get(key) : (firstRender ? 0 : to);
      shown.set(key, to);
      countUp(el, from, to);
    });
    onSlideChange(true);
  }

  function goalRow(g, i) {
    const dl = daysLeft(g);
    const left = Math.max(0, g.target - g.saved);
    const sub = isDone(g) ? 'Goal reached'
      : `${fmtShort(left)} to go${dl == null ? '' : dl < 0 ? ' · overdue' : dl === 0 ? ' · due today' : ` · ${dl} day${dl === 1 ? '' : 's'} left`}`;
    return `<button class="row press ${firstRender ? 'rise' : ''}" style="--i:${i};--c:${g.color}" data-goal="${g.id}">
      <span class="row-icon">${g.emoji}</span>
      <span class="row-main"><span class="row-title">${esc(g.name)}</span><span class="row-sub">${sub}</span></span>
      <span class="row-end"><span class="row-amt">${fmtShort(g.saved)}</span><span class="row-pct ${isDone(g) ? 'done' : ''}">${Math.round(pct(g) * 100)}%</span></span>
      <span class="bar"><i data-key="bar-${g.id}" data-p="${pct(g)}"></i></span>
    </button>`;
  }

  function activityRow(a) {
    const g = goalById(a.goalId);
    return `<div class="row">
      <span class="row-icon" style="--c:${g ? g.color : '#505a63'}">${g ? g.emoji : '•'}</span>
      <span class="row-main"><span class="row-title">${g ? esc(g.name) : 'Deleted goal'}</span><span class="row-sub">${whenLabel(a.at)}</span></span>
      <span class="row-end"><span class="row-amt ${a.amount < 0 ? 'neg' : ''}">${a.amount < 0 ? '−' : '+'}${fmtShort(Math.abs(a.amount))}</span></span>
    </div>`;
  }

  function renderContent() {
    if (!state.goals.length) {
      content.innerHTML = `<section class="widget empty rise">
        <span class="row-icon" style="--c:#494fdf;width:56px;height:56px;font-size:26px">🎯</span>
        <h2>Set your first goal</h2>
        <p>Save towards a trip, a laptop, a safety net — and watch it grow.</p>
        <button class="btn small press" data-act="new">Create a goal</button>
        <button class="btn small secondary press" data-act="examples">Try with examples</button>
      </section>`;
      return;
    }
    const q = query.trim().toLowerCase();
    const goals = sortedGoals().filter(g => !q || g.name.toLowerCase().includes(q));
    const thisM = monthNet(0), lastM = monthNet(1), delta = thisM - lastM;
    const done = state.goals.filter(isDone).length;
    const acts = [...state.activity].sort((a, b) => b.at - a.at);
    const visibleActs = showAllActivity ? acts.slice(0, 50) : acts.slice(0, 4);

    content.innerHTML = `
      <section class="widget ${firstRender ? 'rise' : ''}" id="goalsWidget" style="--i:0">
        <header class="widget-head"><h2>Goals</h2><span>${q ? `${goals.length} found` : `${state.goals.length - done} active`}</span></header>
        ${goals.length ? goals.map(goalRow).join('') : `<p class="row-sub" style="padding:12px 16px">No goals match “${esc(query)}”.</p>`}
      </section>
      <div class="stats ${firstRender ? 'rise' : ''}" style="--i:2">
        <div class="stat"><small>Saved this month</small><b>${fmtShort(thisM)}</b>
          <em class="${delta >= 0 ? 'up' : 'down'}">${delta >= 0 ? '▲' : '▼'} ${fmtShort(Math.abs(delta))} vs last month</em></div>
        <div class="stat"><small>Completed</small><b>${done} of ${state.goals.length}</b><em>${done ? 'goals reached' : 'keep going'}</em></div>
      </div>
      <section class="widget ${firstRender ? 'rise' : ''}" style="--i:3">
        <header class="widget-head"><h2>Recent activity</h2></header>
        ${visibleActs.length ? visibleActs.map(activityRow).join('') : '<p class="row-sub" style="padding:8px 16px 12px">Money you add or withdraw shows up here.</p>'}
        ${acts.length > 4 ? `<button class="see-all press" data-act="toggle-activity">${showAllActivity ? 'Show less' : 'See all'}</button>` : ''}
      </section>`;
    animateBars(content);
  }

  // bars start at their last shown value and transition to the new one
  function animateBars(root) {
    const bars = [...root.querySelectorAll('.bar i')];
    bars.forEach(b => { b.style.setProperty('--p', shown.get(b.dataset.key) ?? 0); });
    requestAnimationFrame(() => requestAnimationFrame(() => bars.forEach(b => {
      b.style.setProperty('--p', b.dataset.p);
      shown.set(b.dataset.key, +b.dataset.p);
    })));
  }

  function currentGoal() { return slides()[current] || null; }

  function onSlideChange(force) {
    const idx = Math.round(carousel.scrollLeft / Math.max(1, carousel.clientWidth));
    if (idx === current && !force) return;
    current = Math.max(0, Math.min(idx, slides().length - 1));
    [...dots.children].forEach((d, i) => d.classList.toggle('on', i === current));
    const g = currentGoal();
    setHeroBg(g ? g.color : null);
    const has = state.goals.length > 0;
    $('#actAdd').disabled = !has;
    $('#actWithdraw').disabled = !has || (g ? g.saved <= 0 : !state.goals.some(x => x.saved > 0));
  }

  function goToGoal(id, smooth = true) {
    const i = slides().findIndex(g => g && g.id === id);
    if (i < 0) return;
    carousel.scrollTo({ left: i * carousel.clientWidth, behavior: smooth && !reduceMotion.matches ? 'smooth' : 'auto' });
    window.scrollTo({ top: 0, behavior: smooth && !reduceMotion.matches ? 'smooth' : 'auto' });
  }

  // ---------- sheet ----------
  const sheet = $('#sheet'), sheetBody = $('#sheetBody'), scrim = $('#scrim');
  let sheetCleanup = null, lastFocus = null, sheetOpen = false;

  function openSheet(html, mount) {
    if (sheetCleanup) { sheetCleanup(); sheetCleanup = null; }
    sheetBody.innerHTML = html;
    if (!sheetOpen) {
      lastFocus = document.activeElement;
      scrim.hidden = false; sheet.hidden = false;
      sheet.style.transform = '';
      requestAnimationFrame(() => requestAnimationFrame(() => { scrim.classList.add('on'); sheet.classList.add('on'); }));
      sheetOpen = true;
    } else {
      sheetBody.classList.remove('swap'); void sheetBody.offsetWidth; sheetBody.classList.add('swap');
    }
    sheetCleanup = mount ? mount(sheetBody) || null : null;
    setTimeout(() => (sheetBody.querySelector('[autofocus]') || sheetBody.querySelector('button, input'))?.focus({ preventScroll: true }), 60);
  }
  function closeSheet() {
    if (!sheetOpen) return;
    sheetOpen = false;
    if (sheetCleanup) { sheetCleanup(); sheetCleanup = null; }
    scrim.classList.remove('on'); sheet.classList.remove('on');
    sheet.style.transform = '';
    setTimeout(() => { if (!sheetOpen) { scrim.hidden = true; sheet.hidden = true; sheetBody.innerHTML = ''; } }, reduceMotion.matches ? 130 : 460);
    lastFocus?.focus?.({ preventScroll: true });
  }
  scrim.addEventListener('click', closeSheet);

  // drag the grabber down to dismiss
  (() => {
    const grab = $('#grabber');
    let y0 = null, dy = 0;
    grab.addEventListener('pointerdown', e => { y0 = e.clientY; dy = 0; grab.setPointerCapture(e.pointerId); sheet.classList.add('dragging'); });
    grab.addEventListener('pointermove', e => {
      if (y0 == null) return;
      dy = Math.max(0, e.clientY - y0);
      sheet.style.transform = `translateY(${dy}px)`;
    });
    const end = () => {
      if (y0 == null) return;
      y0 = null; sheet.classList.remove('dragging');
      if (dy > 110) closeSheet(); else sheet.style.transform = '';
    };
    grab.addEventListener('pointerup', end);
    grab.addEventListener('pointercancel', end);
  })();

  // ---------- toast ----------
  const toast = $('#toast');
  let toastTimer;
  function showToast(msg) {
    toast.innerHTML = `<span class="tick"><svg viewBox="0 0 24 24"><path d="m6 12.5 4 4 8-9"/></svg></span><span>${esc(msg)}</span>`;
    toast.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('on'), 2600);
  }

  // ---------- amount sheet ----------
  function openAmount(mode, goalId) {
    let g = goalById(goalId);
    if (!g) return;
    let str = '';
    const value = () => round2(parseFloat(str || '0') || 0);
    const verb = mode === 'add' ? 'Add' : 'Withdraw';
    const chips = mode === 'add' ? [10, 50, 100] : [10, 50];

    openSheet(`
      <div class="amount-head"><button class="goal-chip press" id="pickGoal" style="--c:${g.color}"><i>${g.emoji}</i>${esc(g.name)} ▾</button></div>
      <div class="amount-display" id="amtBox"><p class="balance num zero" id="amt"></p></div>
      <p class="amount-sub" id="amtSub"></p>
      <div class="chips" style="justify-content:center">
        ${chips.map(c => `<button class="chip press" data-chip="${c}">+${fmtShort(c)}</button>`).join('')}
        ${mode === 'add' ? `<button class="chip press" data-chip="rest">Finish goal</button>` : `<button class="chip press" data-chip="all">All</button>`}
      </div>
      <div class="keypad" id="keypad">
        ${['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'].map(k => `<button class="key" data-key="${k}" aria-label="${k === '⌫' ? 'Delete' : k}">${k}</button>`).join('')}
      </div>
      <button class="btn press" id="amtGo" disabled>${verb}</button>
    `, body => {
      const amt = $('#amt', body), sub = $('#amtSub', body), go = $('#amtGo', body), box = $('#amtBox', body);
      const left = () => Math.max(0, round2(g.target - g.saved));

      function paint() {
        const v = value();
        const [i, d] = str.split('.');
        const intTxt = (+(i || 0)).toLocaleString('en-GB');
        amt.innerHTML = `${symbol()}${intTxt}${d !== undefined ? `<span class="dec">.${d}</span>` : ''}<span class="caret"></span>`;
        amt.classList.toggle('zero', !str);
        const over = mode === 'withdraw' && v > g.saved;
        sub.classList.toggle('warn', over);
        sub.textContent = over ? `You only have ${fmt(g.saved)} in this goal`
          : mode === 'add' && v > 0 && v >= left() && left() > 0 ? 'This completes your goal 🎉'
          : `${fmt(g.saved)} saved${isDone(g) ? ' · goal reached' : ` · ${fmtShort(left())} to go`}`;
        go.disabled = v <= 0 || over;
        go.textContent = v > 0 ? `${verb} ${fmt(v)}` : verb;
      }
      function press(k) {
        if (k === '⌫') str = str.slice(0, -1);
        else if (k === '.') { if (!str.includes('.')) str = (str || '0') + '.'; }
        else {
          const [i, d] = str.split('.');
          if (d !== undefined && d.length >= 2) return bump();
          if (d === undefined && (i || '').length >= 9) return bump();
          str = str === '0' ? k : str + k;
        }
        paint();
      }
      function bump() { box.classList.remove('shake'); void box.offsetWidth; box.classList.add('shake'); }
      function setValue(v) { v = round2(Math.max(0, v)); str = v ? String(v) : ''; paint(); }

      body.querySelector('#keypad').addEventListener('click', e => { const k = e.target.closest('[data-key]'); if (k) press(k.dataset.key); });
      body.querySelectorAll('[data-chip]').forEach(c => c.addEventListener('click', () => {
        const k = c.dataset.chip;
        if (k === 'rest') setValue(left());
        else if (k === 'all') setValue(g.saved);
        else setValue(value() + +k);
      }));
      $('#pickGoal', body).addEventListener('click', () => openPicker(mode, id => openAmount(mode, id)));
      go.addEventListener('click', () => {
        const v = value();
        if (v <= 0 || (mode === 'withdraw' && v > g.saved)) return bump();
        commit(g.id, mode === 'add' ? v : -v);
      });
      const onKey = e => {
        if (/^[0-9]$/.test(e.key)) press(e.key);
        else if (e.key === '.' || e.key === ',') press('.');
        else if (e.key === 'Backspace') press('⌫');
        else if (e.key === 'Enter' && !go.disabled) go.click();
        else return;
        e.preventDefault();
      };
      document.addEventListener('keydown', onKey);
      paint();
      return () => document.removeEventListener('keydown', onKey);
    });
  }

  function commit(goalId, amount) {
    const g = goalById(goalId);
    const wasDone = isDone(g);
    g.saved = round2(Math.max(0, g.saved + amount));
    state.activity.push({ id: uid(), goalId, amount, at: Date.now() });
    save();
    closeSheet();
    render();
    goToGoal(goalId);
    if (!wasDone && isDone(g)) showToast(`Goal reached — ${g.name} 🎉`);
    else showToast(amount > 0 ? `${fmt(amount)} added to ${g.name}` : `${fmt(-amount)} withdrawn from ${g.name}`);
  }

  function openPicker(mode, onPick) {
    const list = sortedGoals().filter(g => mode === 'withdraw' ? g.saved > 0 : true);
    openSheet(`<h3>Choose a goal</h3>
      <div class="list-in-sheet">${list.map(g => `<button class="row press" data-pick="${g.id}" style="--c:${g.color}">
        <span class="row-icon">${g.emoji}</span>
        <span class="row-main"><span class="row-title">${esc(g.name)}</span><span class="row-sub">${fmt(g.saved)} of ${fmtShort(g.target)}</span></span>
        <span class="row-end"><span class="row-pct">${Math.round(pct(g) * 100)}%</span></span></button>`).join('')}</div>`,
    body => { body.addEventListener('click', e => { const b = e.target.closest('[data-pick]'); if (b) onPick(b.dataset.pick); }); });
  }

  // ---------- new goal ----------
  function openNewGoal() {
    let emoji = EMOJIS[state.goals.length % EMOJIS.length];
    let color = COLORS[state.goals.length % COLORS.length];
    const today = new Date().toISOString().slice(0, 10);
    openSheet(`
      <h3>New goal</h3>
      <div class="field"><span class="field-label">Icon</span>
        <div class="emoji-row" id="emojis">${EMOJIS.map(e => `<button class="emoji-opt press" data-emoji="${e}" aria-pressed="${e === emoji}">${e}</button>`).join('')}</div></div>
      <div class="field"><span class="field-label">Colour</span>
        <div class="color-row" id="colors">${COLORS.map(c => `<button class="color-opt press" style="--c:${c}" data-color="${c}" aria-label="Colour ${c}" aria-pressed="${c === color}"></button>`).join('')}</div></div>
      <div class="field"><label for="gName">Name</label><input class="input" id="gName" maxlength="40" placeholder="e.g. Holiday in Lisbon" autofocus></div>
      <div class="field"><label for="gTarget">Target</label><div class="input-wrap"><span>${symbol()}</span><input class="input num" id="gTarget" inputmode="decimal" placeholder="0"></div></div>
      <div class="field"><label for="gDate">Deadline (optional)</label><input class="input" id="gDate" type="date" min="${today}"></div>
      <button class="btn press" id="gCreate" disabled>Create goal</button>
    `, body => {
      const name = $('#gName', body), target = $('#gTarget', body), date = $('#gDate', body), go = $('#gCreate', body);
      const parsed = () => round2(parseFloat(target.value.replace(/[^\d.]/g, '')) || 0);
      const check = () => { go.disabled = !name.value.trim() || parsed() <= 0; };
      name.addEventListener('input', check); target.addEventListener('input', check);
      $('#emojis', body).addEventListener('click', e => {
        const b = e.target.closest('[data-emoji]'); if (!b) return;
        emoji = b.dataset.emoji; body.querySelectorAll('[data-emoji]').forEach(x => x.setAttribute('aria-pressed', x === b));
      });
      $('#colors', body).addEventListener('click', e => {
        const b = e.target.closest('[data-color]'); if (!b) return;
        color = b.dataset.color; body.querySelectorAll('[data-color]').forEach(x => x.setAttribute('aria-pressed', x === b));
        setHeroBg(color);
      });
      const submit = () => {
        if (go.disabled) return;
        const g = { id: uid(), name: name.value.trim(), emoji, color, target: parsed(), saved: 0, deadline: date.value || null, created: Date.now() };
        state.goals.push(g);
        save(); closeSheet(); render(); goToGoal(g.id);
        showToast(`${g.name} created`);
      };
      go.addEventListener('click', submit);
      body.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') submit(); });
      return () => { const g = currentGoal(); setHeroBg(g ? g.color : null); };
    });
  }

  // ---------- goal detail ----------
  function openDetail(id) {
    const g = goalById(id);
    if (!g) return;
    const dl = daysLeft(g);
    const left = Math.max(0, g.target - g.saved);
    const perWeek = dl != null && dl > 0 && left > 0 ? left / Math.max(1, dl / 7) : null;
    const hist = state.activity.filter(a => a.goalId === id).sort((a, b) => b.at - a.at).slice(0, 8);
    const C = 2 * Math.PI * 80;
    openSheet(`
      <div class="detail-top" style="--c:${g.color}">
        <div class="ring"><svg viewBox="0 0 180 180"><circle class="track" cx="90" cy="90" r="80"/><circle class="val" cx="90" cy="90" r="80" stroke-dasharray="${C}" stroke-dashoffset="${C}" id="ringVal"/></svg>
          <div class="ring-center"><span class="emoji">${g.emoji}</span><b class="num">${fmtShort(g.saved)}</b><small>${Math.round(pct(g) * 100)}% of ${fmtShort(g.target)}</small></div></div>
        <h3 style="margin:0">${esc(g.name)}</h3>
      </div>
      <div class="facts">
        <div class="fact"><span>Remaining</span><span>${isDone(g) ? 'Done 🎉' : fmt(left)}</span></div>
        <div class="fact"><span>Deadline</span><span>${g.deadline ? `${new Date(g.deadline + 'T00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}${dl != null ? ` · ${dl < 0 ? 'overdue' : `${dl}d`}` : ''}` : 'None'}</span></div>
        ${perWeek ? `<div class="fact"><span>To stay on track</span><span>${fmt(perWeek)} / week</span></div>` : ''}
      </div>
      <div class="btn-row">
        <button class="btn press" data-act="add">Add money</button>
        <button class="btn secondary press" data-act="withdraw" ${g.saved <= 0 ? 'disabled' : ''}>Withdraw</button>
      </div>
      ${hist.length ? `<div class="list-in-sheet">${hist.map(activityRow).join('')}</div>` : ''}
      <button class="btn danger press" data-act="delete">Delete goal</button>
    `, body => {
      requestAnimationFrame(() => requestAnimationFrame(() => { $('#ringVal', body).style.strokeDashoffset = C * (1 - pct(g)); }));
      let armed = false;
      body.addEventListener('click', e => {
        const b = e.target.closest('[data-act]'); if (!b) return;
        if (b.dataset.act === 'add') openAmount('add', id);
        if (b.dataset.act === 'withdraw') openAmount('withdraw', id);
        if (b.dataset.act === 'delete') {
          if (!armed) { armed = true; b.textContent = 'Tap again to delete'; return; }
          state.goals = state.goals.filter(x => x.id !== id);
          save(); closeSheet(); render(); showToast(`${g.name} deleted`);
        }
      });
    });
  }

  // ---------- more ----------
  function openMore() {
    openSheet(`
      <h3>Settings</h3>
      <div class="field"><span class="field-label">Currency</span>
        <div class="chips" id="cur">${CURRENCIES.map(c => `<button class="chip press" data-cur="${c}" aria-pressed="${c === state.currency}">${c}</button>`).join('')}</div></div>
      <button class="btn secondary press" data-act="examples">Load example goals</button>
      <button class="btn danger press" data-act="clear">Clear all data</button>
      <p class="row-sub" style="text-align:center">Your goals are stored on this device only.</p>
    `, body => {
      let armed = false;
      body.addEventListener('click', e => {
        const c = e.target.closest('[data-cur]');
        if (c) {
          state.currency = c.dataset.cur; save();
          body.querySelectorAll('[data-cur]').forEach(x => x.setAttribute('aria-pressed', x === c));
          render(); return;
        }
        const b = e.target.closest('[data-act]'); if (!b) return;
        if (b.dataset.act === 'examples') { loadExamples(); closeSheet(); }
        if (b.dataset.act === 'clear') {
          if (!armed) { armed = true; b.textContent = 'Tap again to clear everything'; return; }
          state = { currency: state.currency, goals: [], activity: [] };
          shown.clear(); save(); closeSheet(); current = 0; render(); showToast('All data cleared');
        }
      });
    });
  }

  function loadExamples() {
    const now = Date.now();
    const iso = d => new Date(now + d * DAY).toISOString().slice(0, 10);
    const defs = [
      ['Holiday in Lisbon', '🏝️', '#00a87e', 1800, iso(70), [[74, 200], [60, 150], [45, 120], [31, 200], [17, 150], [3, 100]]],
      ['Emergency fund', '🛟', '#494fdf', 5000, null, [[80, 500], [66, 400], [52, 300], [38, 350], [24, 300], [20, -120], [10, 400], [1, 250]]],
      ['New laptop', '💻', '#7c57f4', 1400, iso(120), [[58, 100], [40, 150], [26, 80], [12, 120], [2, 60]]],
      ['Concert tickets', '🎸', '#de1b87', 240, iso(9), [[35, 80], [21, 80], [7, 80]]],
    ];
    state.goals = []; state.activity = [];
    defs.forEach(([name, emoji, color, target, deadline, hist], k) => {
      const id = uid();
      state.goals.push({ id, name, emoji, color, target, deadline, saved: round2(hist.reduce((s, h) => s + h[1], 0)), created: now - 90 * DAY + k });
      hist.forEach(([daysAgo, amount]) => state.activity.push({ id: uid(), goalId: id, amount, at: now - daysAgo * DAY - (k * 37 + daysAgo * 13) % 600 * 60e3 }));
    });
    shown.clear(); firstRender = true; current = 0;
    save(); render(); showToast('Example goals loaded');
  }

  // ---------- insights (the long-press → AIR-style transition) ----------
  const insights = $('#insights'), glow = $('#glow'), chat = $('#chat'), prompts = $('#prompts');
  let insightsOpen = false, insightsBusy = false;
  const PROMPTS = [
    ['overall', 'How am I doing overall?'],
    ['focus', 'What should I focus on next?'],
    ['finish', 'When will I finish my goals?'],
  ];

  function placeGlow(x, y) { glow.style.left = x + 'px'; glow.style.top = y + 'px'; }

  async function openInsights(x, y) {
    if (insightsOpen || sheetOpen) return;
    insightsOpen = true;
    placeGlow(x, y);
    glow.style.transform = '';
    glow.style.opacity = 1;
    glow.style.setProperty('--touch', 1);
    document.body.classList.remove('pressing');
    document.body.classList.add('leaving');

    chat.innerHTML = `<p class="chat-hello">How are your<br>goals going?</p>`;
    prompts.innerHTML = PROMPTS.map(([k, t], i) => `<button class="prompt press" style="--i:${i}" data-q="${k}">
      <svg viewBox="0 0 24 24"><path d="M6 19v-6M12 19V6M18 19v-9"/></svg><span>${t}</span>
      <i class="send"><svg viewBox="0 0 24 24"><path d="M12 19V5M6 11l6-6 6 6"/></svg></i></button>`).join('');
    insights.hidden = false;
    void insights.offsetWidth;
    insights.classList.add('on');

    await wait(260);
    glow.style.setProperty('--touch', 0);
    glow.style.transform = 'translateY(220px) scale(.8)';
    glow.style.opacity = 0;
    setTimeout(() => $('#insightsClose').focus({ preventScroll: true }), 300);
  }

  async function closeInsights() {
    if (!insightsOpen) return;
    insightsOpen = false;
    insights.classList.remove('on');
    await wait(180);
    document.body.classList.remove('leaving');
    await wait(300);
    if (!insightsOpen) { insights.hidden = true; glow.style.transform = ''; }
    $('#insightsBtn').focus({ preventScroll: true });
  }

  function answer(kind) {
    const t = totals();
    const active = sortedGoals().filter(g => !isDone(g));
    if (!state.goals.length) return { text: 'You haven’t set any goals yet. Tap “New goal” to start one — I’ll keep track from there.' };
    if (kind === 'overall') {
      const m = monthNet(0);
      return {
        text: `You’ve saved ${fmt(t.saved)} across ${state.goals.length} goal${state.goals.length > 1 ? 's' : ''} — ${Math.round(t.p * 100)}% of ${fmtShort(t.target)}. ${m > 0 ? `This month you’ve put in ${fmt(m)}.` : 'Nothing added this month yet.'}`,
        chart: true,
      };
    }
    if (kind === 'focus') {
      if (!active.length) return { text: 'Every goal is complete. Time to set a new one? 🎉' };
      const dated = active.filter(g => daysLeft(g) != null && daysLeft(g) >= 0).sort((a, b) => daysLeft(a) - daysLeft(b))[0];
      if (dated) {
        const dl = daysLeft(dated), left = dated.target - dated.saved;
        return { text: `${dated.emoji} ${dated.name} is due in ${dl} day${dl === 1 ? '' : 's'}. Put aside ${fmt(left / Math.max(1, dl / 7))} a week and you’ll make it.` };
      }
      const near = [...active].sort((a, b) => pct(b) - pct(a))[0];
      return { text: `You’re ${Math.round(pct(near) * 100)}% of the way to ${near.emoji} ${near.name}. ${fmt(near.target - near.saved)} more finishes it.` };
    }
    // finish: project each active goal from its last-90-day pace
    if (!active.length) return { text: 'All done — every goal is reached. 🎉' };
    const since = Date.now() - 90 * DAY;
    const lines = active.slice(0, 4).map(g => {
      const pace = state.activity.filter(a => a.goalId === g.id && a.at >= since).reduce((s, a) => s + a.amount, 0) / 3;
      if (pace <= 0) return `${g.emoji} ${g.name}: no recent deposits, so no estimate yet.`;
      const months = Math.ceil((g.target - g.saved) / pace);
      return `${g.emoji} ${g.name}: about ${months} month${months === 1 ? '' : 's'} at ${fmtShort(round2(pace))}/month.`;
    });
    return { text: lines.join('\n') };
  }

  let chartN = 0;
  function chartCard() {
    const days = 30, now = Date.now();
    const start = now - days * DAY;
    const t = totals();
    const inWindow = state.activity.filter(a => a.at >= start);
    let run = t.saved - inWindow.reduce((s, a) => s + a.amount, 0);
    const base = run;
    const pts = [];
    for (let d = 0; d <= days; d++) {
      const dayEnd = start + (d + 1) * DAY;
      run += inWindow.filter(a => a.at >= dayEnd - DAY && a.at < dayEnd).reduce((s, a) => s + a.amount, 0);
      pts.push(run);
    }
    const w = Math.max(200, chat.clientWidth - 28), h = 120;
    const min = Math.min(...pts, base), max = Math.max(...pts, base + 1);
    const X = i => (i / days) * w, Y = v => h - 6 - ((v - min) / (max - min)) * (h - 18);
    const line = pts.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join('');
    const id = `areaGrad${++chartN}`;
    const change = t.saved - base;
    const el = document.createElement('div');
    el.className = 'chart-card';
    el.innerHTML = `<small>Total saved · last 30 days</small><b>${fmt(t.saved)}</b>
      <em style="color:${change >= 0 ? 'var(--up)' : 'var(--down)'}">${change >= 0 ? '+' : '−'}${fmt(Math.abs(change))} ${change >= 0 ? '▲' : '▼'} ${base ? Math.abs(Math.round(change / base * 100)) : 100}%</em>
      <svg viewBox="0 0 ${w} ${h}" aria-hidden="true">
        <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2fd08f" stop-opacity=".28"/><stop offset="1" stop-color="#2fd08f" stop-opacity="0"/></linearGradient></defs>
        <path class="area" style="fill:url(#${id})" d="${line}L${w},${h}L0,${h}Z"/>
        <path class="base" d="M0,${Y(base).toFixed(1)}H${w}"/>
        <path class="line" d="${line}"/>
      </svg>`;
    return el;
  }

  function bubble(cls, text) {
    const b = document.createElement('div');
    b.className = `bubble ${cls}`;
    if (cls === 'typing ai') b.innerHTML = '<i></i><i></i><i></i>';
    else b.textContent = text;
    b.style.whiteSpace = 'pre-line';
    chat.appendChild(b);
    chat.scrollTo({ top: chat.scrollHeight, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
    return b;
  }

  async function ask(kind) {
    if (insightsBusy) return;
    insightsBusy = true;
    $('.chat-hello', chat)?.remove();
    bubble('me', PROMPTS.find(p => p[0] === kind)[1]);
    await wait(240);
    const typing = bubble('typing ai');
    await wait(800);
    typing.remove();
    const a = answer(kind);
    bubble('ai', a.text);
    if (a.chart) {
      chat.appendChild(chartCard());
      const line = chat.lastElementChild.querySelector('.line');
      line.style.setProperty('--len', line.getTotalLength());
      chat.scrollTo({ top: chat.scrollHeight, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
    }
    insightsBusy = false;
  }

  prompts.addEventListener('click', e => { const b = e.target.closest('[data-q]'); if (b) ask(b.dataset.q); });
  $('#insightsClose').addEventListener('click', closeInsights);
  $('#insightsBtn').addEventListener('click', e => {
    const r = e.currentTarget.getBoundingClientRect();
    openInsights(r.left + r.width / 2, r.top + r.height / 2);
  });

  // long-press the balance: push in + glow, then dissolve into Insights
  (() => {
    let timer = null, start = null;
    const cancel = () => {
      clearTimeout(timer); timer = null; start = null;
      if (!insightsOpen) {
        document.body.classList.remove('pressing');
        glow.style.opacity = 0; glow.style.setProperty('--touch', 0);
      }
    };
    carousel.addEventListener('pointerdown', e => {
      if (!e.target.closest('.balance') || insightsOpen) return;
      start = { x: e.clientX, y: e.clientY };
      placeGlow(e.clientX, e.clientY);
      glow.style.transform = '';
      timer = setTimeout(() => {
        document.body.classList.add('pressing');
        glow.style.opacity = '';
        glow.style.setProperty('--touch', 1);
        timer = setTimeout(() => { const p = start; cancel(); if (p) openInsights(p.x, p.y); }, 480);
      }, 140);
    });
    carousel.addEventListener('pointermove', e => {
      if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 10) cancel();
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => carousel.addEventListener(t, cancel));
    carousel.addEventListener('contextmenu', e => { if (e.target.closest('.balance')) e.preventDefault(); });
  })();

  // ---------- wiring ----------
  let scrollRaf = 0;
  carousel.addEventListener('scroll', () => {
    cancelAnimationFrame(scrollRaf);
    scrollRaf = requestAnimationFrame(() => onSlideChange(false));
  }, { passive: true });
  addEventListener('resize', () => { carousel.scrollLeft = current * carousel.clientWidth; });

  carousel.addEventListener('click', e => {
    const p = e.target.closest('[data-pill]');
    if (!p) return;
    if (p.dataset.pill === 'all') {
      if (!state.goals.length) openNewGoal();
      else $('#goalsWidget')?.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'start' });
    } else openDetail(p.dataset.pill);
  });

  function withGoal(mode) {
    const g = currentGoal();
    if (g) return openAmount(mode, g.id);
    const list = state.goals.filter(x => mode === 'withdraw' ? x.saved > 0 : true);
    if (list.length === 1) return openAmount(mode, list[0].id);
    openPicker(mode, id => openAmount(mode, id));
  }
  $('#actAdd').addEventListener('click', () => withGoal('add'));
  $('#actWithdraw').addEventListener('click', () => withGoal('withdraw'));
  $('#actNew').addEventListener('click', openNewGoal);
  $('#newTop').addEventListener('click', openNewGoal);
  $('#actMore').addEventListener('click', openMore);
  $('#moreTop').addEventListener('click', openMore);

  content.addEventListener('click', e => {
    const row = e.target.closest('[data-goal]');
    if (row) return openDetail(row.dataset.goal);
    const b = e.target.closest('[data-act]');
    if (!b) return;
    if (b.dataset.act === 'new') openNewGoal();
    if (b.dataset.act === 'examples') loadExamples();
    if (b.dataset.act === 'toggle-activity') { showAllActivity = !showAllActivity; renderContent(); }
  });

  $('#search').addEventListener('input', e => { query = e.target.value; renderContent(); });

  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (sheetOpen) closeSheet();
    else if (insightsOpen) closeInsights();
  });

  render();
})();
