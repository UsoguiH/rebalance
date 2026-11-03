// app.js: the showcase. One clock per character; clocks run only while their canvas
// is on screen and the tab is visible. Switching poses blends from the pose on screen
// to the new clip (never a jump), and tapping the teacher plays a one-shot reaction.
(function () {
  'use strict';
  const { EASE_OUT, clamp } = Motion;
  const clips = Clips.list;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  // The world window every canvas shows: 400 × 500 units, the floor 470 from the top.
  const VIEW = { w: 400, h: 500, floor: 462 };

  function fit(canvas) {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    return { w, h };
  }
  function paint(canvas, P, t) {
    const { w, h } = fit(canvas);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const s = Math.min(w / VIEW.w, h / VIEW.h);
    ctx.setTransform(s, 0, 0, s, w / 2, h - (VIEW.h - VIEW.floor) * s);
    Rig.draw(ctx, P, t);
  }

  // ── the grid ──────────────────────────────────────────────────────────────
  const grid = document.getElementById('grid');
  const cards = clips.map((clip, i) => {
    const b = document.createElement('button');
    b.className = 'card'; b.type = 'button';
    b.setAttribute('aria-label', `${clip.ar}: اعرضها على المسرح`);
    b.innerHTML = `<div class="cv"><canvas></canvas></div><div class="label"><b>${clip.ar}</b><span>${clip.en}</span></div>`;
    grid.appendChild(b);
    const card = { clip, el: b, canvas: b.querySelector('canvas'), t: clip.still || 0, visible: false, i };
    b.addEventListener('click', () => {
      select(clip.id);
      document.querySelector('.studio').scrollIntoView({ behavior: reduce.matches ? 'auto' : 'smooth', block: 'start' });
    });
    return card;
  });
  document.getElementById('count').textContent = `${clips.length} وضعية، كل واحدة حلقة متصلة`;

  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const c = cards.find((k) => k.el === e.target);
      if (c) c.visible = e.isIntersecting;
    }
    kick();
  }, { rootMargin: '80px' });
  cards.forEach((c) => io.observe(c.el));

  // ── the stage ─────────────────────────────────────────────────────────────
  const hero = {
    canvas: document.getElementById('hero'), clip: Clips.byId.idle, t: 0, last: null,
    from: null, blendAt: 0, react: null, back: null, visible: true,
  };
  const chips = document.getElementById('chips');
  const chipEls = {};
  clips.forEach((clip) => {
    const c = document.createElement('button');
    c.className = 'chip'; c.type = 'button'; c.textContent = clip.ar;
    c.setAttribute('aria-pressed', 'false');
    c.addEventListener('click', () => select(clip.id));
    chips.appendChild(c); chipEls[clip.id] = c;
  });
  new IntersectionObserver((es) => { hero.visible = es[0].isIntersecting; kick(); }).observe(hero.canvas);

  let paused = false, speed = 1;
  function label(clip) {
    document.getElementById('now-name').textContent = clip.ar;
    document.getElementById('now-en').textContent = clip.en;
    document.getElementById('now-meta').textContent = `حلقة مدتها ${(clip.dur / 1000).toFixed(1)} ث`;
    for (const id in chipEls) chipEls[id].setAttribute('aria-pressed', String(id === hero.back?.id || (!hero.back && id === clip.id)));
  }
  /** Switch the stage to a clip, blending from whatever is on screen now. */
  function switchTo(clip, start) {
    hero.from = hero.last;
    hero.blendAt = performance.now();
    hero.clip = clip;
    hero.t = start == null ? 0 : start;
    if (reduce.matches) hero.t = clip.still || 0;
    kick();
  }
  function select(id) {
    hero.react = null; hero.back = null;
    switchTo(Clips.byId[id]);
    label(Clips.byId[id]);
    try { localStorage.setItem('qudrat-pose', id); } catch (e) { /* storage may be blocked */ }
  }
  hero.canvas.addEventListener('click', () => {
    if (hero.react) return;
    const back = hero.back || hero.clip;
    const pick = back.id === 'jump' ? 'laughing' : back.id === 'laughing' ? 'correct' : 'jump';
    hero.back = back;
    hero.react = Clips.byId[pick];
    switchTo(hero.react, 0);
    label(back);
  });

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

  // ── one frame loop for every clock ───────────────────────────────────────
  const BLEND_MS = 380;
  let raf = 0, prev = 0;
  function frame(now) {
    raf = 0;
    const dt = prev ? Math.min(64, now - prev) : 16;
    prev = now;
    const still = reduce.matches;
    let again = false;

    if (hero.visible) {
      if (!still && !paused) hero.t += dt * speed;
      if (hero.react && hero.t >= hero.react.dur) {
        const back = hero.back; hero.react = null; hero.back = null;
        switchTo(back, 0);
        label(back);
      }
      let P = Clips.pose(hero.clip, hero.t);
      if (hero.from) {
        const p = clamp((now - hero.blendAt) / BLEND_MS, 0, 1);
        P = Clips.blend(hero.from, P, EASE_OUT(p));
        if (p >= 1) hero.from = null; else again = true;
      }
      hero.last = P;
      paint(hero.canvas, P, hero.t);
      if (!still && !paused) again = true;
    }
    for (const c of cards) {
      if (!c.visible) continue;
      if (!still && !paused) { c.t += dt; again = true; }
      paint(c.canvas, Clips.pose(c.clip, c.t), c.t);
    }
    if (again && !document.hidden) raf = requestAnimationFrame(frame);
    else prev = 0;
  }
  function kick() { if (!raf) { prev = 0; raf = requestAnimationFrame(frame); } }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); });
  reduce.addEventListener?.('change', () => { cards.forEach((c) => { c.t = c.clip.still || 0; }); kick(); });
  window.addEventListener('resize', kick);

  // first frame: reduced motion shows each pose at its key moment
  cards.forEach((c) => { c.t = reduce.matches ? (c.clip.still || 0) : c.i * 137; });
  let start = 'idle';
  try { const s = localStorage.getItem('qudrat-pose'); if (s && Clips.byId[s]) start = s; } catch (e) { /* ignore */ }
  hero.clip = Clips.byId[start];
  hero.t = reduce.matches ? hero.clip.still || 0 : 0;
  label(hero.clip);
  // every card gets one drawing up front, so the page is complete before anything scrolls
  const paintAll = () => { cards.forEach((c) => paint(c.canvas, Clips.pose(c.clip, c.t), c.t)); kick(); };
  paintAll();
  if (document.fonts && document.fonts.load) {
    Promise.all([document.fonts.load('800 15px Tajawal'), document.fonts.load('900 20px Tajawal')]).then(paintAll, paintAll);
  }
})();
