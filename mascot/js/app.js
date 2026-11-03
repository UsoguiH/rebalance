// app.js: the showcase. One clock per character; a clock runs only while its canvas is
// on screen and the tab is visible. Switching drawings is a Duolingo-style pop: the
// current pose squashes, the next drawing takes over inside the squash and springs up.
// Tapping the teacher plays the celebration once, then returns to the chosen pose.
(function () {
  'use strict';
  const { track, clamp, EASE_IN } = Motion;
  const clips = Poses.CLIPS;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const base = (document.currentScript && document.currentScript.src.replace(/js\/app\.js.*$/, '')) || '';

  function fit(canvas) {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  }

  // ── the grid ──────────────────────────────────────────────────────────────
  const grid = document.getElementById('grid');
  const cards = clips.map((clip, i) => {
    const b = document.createElement('button');
    b.className = 'card'; b.type = 'button';
    b.setAttribute('aria-label', `${clip.ar}: اعرضها على المسرح`);
    b.innerHTML = `<div class="cv"><canvas></canvas></div><div class="label"><b>${clip.ar}</b><span>${clip.en}</span></div>`;
    grid.appendChild(b);
    const card = { clip, el: b, canvas: b.querySelector('canvas'), t: i * 173, visible: false };
    b.addEventListener('click', () => {
      select(clip.id);
      document.querySelector('.studio').scrollIntoView({ behavior: reduce.matches ? 'auto' : 'smooth', block: 'start' });
    });
    return card;
  });
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) { const c = cards.find((k) => k.el === e.target); if (c) c.visible = e.isIntersecting; }
    kick();
  }, { rootMargin: '80px' });
  cards.forEach((c) => io.observe(c.el));

  // ── the stage ─────────────────────────────────────────────────────────────
  const hero = { canvas: document.getElementById('hero'), clip: Poses.byId.idle, t: 0, prev: null, prevT: 0, swapAt: -1e9, back: null, visible: true };
  // the pose picker: one tile per drawing, showing the drawing itself
  const picker = document.getElementById('picker');
  const chipEls = {};
  clips.forEach((clip) => {
    const c = document.createElement('button');
    c.className = 'tile'; c.type = 'button';
    c.setAttribute('aria-pressed', 'false');
    c.innerHTML = `<span class="thumb"><img alt="" loading="lazy" src="${base}art/${clip.d.file}"></span><span>${clip.ar}</span>`;
    c.addEventListener('click', () => select(clip.id));
    picker.appendChild(c); chipEls[clip.id] = c;
  });
  new IntersectionObserver((es) => { hero.visible = es[0].isIntersecting; kick(); }).observe(hero.canvas);

  let paused = false, speed = 1, now = 0;
  function label(clip) {
    document.getElementById('now-name').textContent = clip.ar;
    document.getElementById('now-en').textContent = clip.en;
    for (const id in chipEls) chipEls[id].setAttribute('aria-pressed', String(id === clip.id));
    chipEls[clip.id].scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' });
  }
  // the pop between two drawings, in ms from the switch
  const POP = { down: 110, swap: 90, up: 300 };
  function switchTo(clip, t0) {
    if (clip === hero.clip) return;
    hero.prev = hero.clip; hero.prevT = hero.t;
    hero.clip = clip; hero.t = t0 || 0;
    hero.swapAt = now;
    kick();
  }
  function select(id) {
    hero.back = null;
    switchTo(Poses.byId[id]);
    label(Poses.byId[id]);
    try { localStorage.setItem('qudrat-pose', id); } catch (e) { /* storage may be blocked */ }
  }
  function cheer() {
    if (hero.back) return;
    const back = hero.clip;
    const react = back.id === 'jump' ? Poses.byId.champion : Poses.byId.jump;
    hero.back = { clip: back, until: null };
    switchTo(react, 0);
    hero.back.until = react.dur * 2; // two hops, then home
  }
  hero.canvas.addEventListener('click', cheer);
  document.getElementById('cheer').addEventListener('click', cheer);

  const playBtn = document.getElementById('play');
  playBtn.addEventListener('click', () => {
    paused = !paused;
    playBtn.textContent = paused ? 'تشغيل' : 'إيقاف مؤقت';
    playBtn.setAttribute('aria-pressed', String(paused));
    kick();
  });
  const slowBtn = document.getElementById('slow');
  slowBtn.addEventListener('click', () => {
    speed = speed === 1 ? 0.25 : 1;
    slowBtn.setAttribute('aria-pressed', String(speed !== 1));
  });

  function drawHero() {
    fit(hero.canvas);
    const T = (now - hero.swapAt) * (paused ? 1 : speed);
    const still = reduce.matches;
    const tOf = (clip, t) => (still ? 0 : t);
    if (!still && T < POP.down + POP.swap + POP.up && hero.prev) {
      if (T < POP.down) {
        const sq = 1 - 0.1 * EASE_IN(T / POP.down);
        Stage.draw(hero.canvas, hero.prev, tOf(hero.prev, hero.prevT), { squash: sq, zoom: 1 });
      } else if (T < POP.down + POP.swap) {
        const p = (T - POP.down) / POP.swap;
        Stage.draw(hero.canvas, hero.prev, tOf(hero.prev, hero.prevT), { squash: 0.9, alpha: 1 - p, zoom: 1 });
        Stage.draw(hero.canvas, hero.clip, tOf(hero.clip, hero.t), { squash: 0.9, alpha: p, clear: false, zoom: 1 });
      } else {
        const sq = track(T - POP.down - POP.swap, [[0, 0.9], [130, 1.06, 'out'], [300, 1]]);
        Stage.draw(hero.canvas, hero.clip, tOf(hero.clip, hero.t), { squash: sq, zoom: 1 });
      }
      return true;
    }
    hero.prev = null;
    Stage.draw(hero.canvas, hero.clip, tOf(hero.clip, hero.t), { zoom: 1 });
    return false;
  }

  // ── one frame loop for every clock ───────────────────────────────────────
  let raf = 0, last = 0, ready = false;
  function frame(ts) {
    raf = 0;
    const dt = last ? Math.min(64, ts - last) : 16;
    last = ts; now = ts;
    if (!ready) return;
    const still = reduce.matches;
    let again = false;
    if (hero.visible) {
      if (!still && !paused) {
        hero.t += dt * speed;
        if (hero.prev) hero.prevT += dt * speed;
      }
      if (hero.back && hero.back.until != null && hero.t >= hero.back.until) {
        const b = hero.back.clip; hero.back = null; switchTo(b, 0);
      }
      if (drawHero()) again = true;
      if (!still && !paused) again = true;
    }
    for (const c of cards) {
      if (!c.visible) continue;
      fit(c.canvas);
      if (!still && !paused) { c.t += dt; again = true; }
      Stage.draw(c.canvas, c.clip, still ? 0 : c.t);
    }
    if (again && !document.hidden) raf = requestAnimationFrame(frame);
    else last = 0;
  }
  function kick() { if (!raf) { last = 0; raf = requestAnimationFrame(frame); } }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); });
  reduce.addEventListener?.('change', kick);
  window.addEventListener('resize', kick);

  let start = 'idle';
  try { const s = localStorage.getItem('qudrat-pose'); if (s && Poses.byId[s]) start = s; } catch (e) { /* ignore */ }
  hero.clip = Poses.byId[start];
  label(hero.clip);
  const status = document.getElementById('status');
  status.textContent = 'جاري تحميل الرسومات…';
  Promise.all([Stage.load(base + 'art/'), document.fonts ? document.fonts.load('900 16px Tajawal').catch(() => {}) : null])
    .then(() => {
      ready = true; status.textContent = '';
      // every card gets one drawing up front, so the page is complete before anything scrolls
      cards.forEach((c) => { fit(c.canvas); Stage.draw(c.canvas, c.clip, reduce.matches ? 0 : c.t); });
      kick();
    })
    .catch((e) => { status.textContent = 'تعذّر تحميل الرسومات: ' + e.message; });
})();
