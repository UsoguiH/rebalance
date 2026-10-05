// Material 3 component behaviours with spring motion.
import { spring, blurIn, blurOut, springEasing, SPRINGS, reduced } from './motion.js';
import { loadingIndicator } from './shared/shapes.js';
export { loadingIndicator };

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const ar = (n) => new Intl.NumberFormat('en-US').format(n); // app UI digits

// ---------- snackbar ----------
let snackTimer;
export function snackbar(message, { action, onAction, duration = 3200 } = {}) {
  $('.snackbar')?.remove();
  const el = document.createElement('div');
  el.className = 'snackbar';
  el.setAttribute('role', 'status');
  el.innerHTML = `<span></span>${action ? '<button type="button"></button>' : ''}`;
  el.firstChild.textContent = message;
  if (action) { el.lastChild.textContent = action; el.lastChild.onclick = () => { onAction?.(); hide(); }; }
  document.body.append(el);
  spring(el, [{ transform: 'translateY(40px) scale(.96)', opacity: 0 }, { transform: 'none', opacity: 1 }], 'bouncy');
  const hide = () => spring(el, [{ transform: 'none', opacity: 1 }, { transform: 'translateY(24px)', opacity: 0 }], 'gentle').finished.then(() => el.remove());
  clearTimeout(snackTimer);
  snackTimer = setTimeout(hide, duration);
}

// ---------- copy ----------
export async function copyText(text, msg = 'تم النسخ ✓') {
  try { await navigator.clipboard.writeText(text); }
  catch { const t = Object.assign(document.createElement('textarea'), { value: text }); document.body.append(t); t.select(); document.execCommand('copy'); t.remove(); }
  snackbar(msg);
}
export function bindCopy(root = document) {
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-copy],[data-copy-from]');
    if (!b) return;
    e.preventDefault();
    const text = b.dataset.copyFrom ? $(b.dataset.copyFrom).value : b.dataset.copy;
    if (text) copyText(text);
  });
}

// ---------- api ----------
export async function api(url, body, method = 'POST') {
  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'حدث خطأ، حاول مرة أخرى');
  return data;
}

// ---------- button loading morph (Apple-style: label fades, pill shrinks to a circle) ----------
export function setLoading(btn, on) {
  if (on) {
    if (!btn.querySelector('.btn-spin')) btn.insertAdjacentHTML('beforeend', `<span class="btn-spin">${loadingIndicator({ size: 'sm' })}</span>`);
    btn.style.width = btn.offsetWidth + 'px';
    btn.classList.add('is-loading');
    spring(btn, [{ width: btn.offsetWidth + 'px' }, { width: btn.offsetHeight + 'px' }], 'snappy');
    $('.loading-indicator', btn).style.color = getComputedStyle(btn).backgroundColor === 'rgba(0, 0, 0, 0)' ? '' : '#fff';
  } else {
    const anims = btn.getAnimations(); anims.forEach((a) => a.cancel());
    btn.classList.remove('is-loading');
    btn.style.width = '';
  }
}

// ---------- expandable (ExpandDetails behaviour) ----------
// <section class="xp" data-open> <button class="xp-head" aria-expanded> … <div class="xp-body"><div class="xp-inner">
// data-morph: width animates too (open: width → then height after .25s; close: height → then width after .3s)
export function initExpandables(root = document) {
  $$('.xp', root).forEach((xp) => {
    const head = $('.xp-head', xp), body = $('.xp-body', xp), inner = $('.xp-inner', xp);
    const morph = xp.hasAttribute('data-morph');
    const setOpen = (o) => { xp.dataset.open = o ? 'true' : 'false'; head.setAttribute('aria-expanded', o); body.hidden = !o; if (morph) xp.classList.toggle('is-open', o); };
    setOpen(xp.dataset.open !== 'false');
    let busy = false;
    head.addEventListener('click', async () => {
      if (busy) return; busy = true;
      const opening = xp.dataset.open === 'false';
      const h0 = xp.offsetHeight, w0 = xp.offsetWidth;
      xp.getAnimations().forEach((a) => a.cancel());
      if (opening) {
        setOpen(true);
        if (morph) xp.classList.add('is-open');
        const h1 = xp.offsetHeight, w1 = xp.offsetWidth;
        const anims = [spring(xp, [{ height: h0 + 'px' }, { height: h1 + 'px' }], 'smooth', { delay: morph ? 0.25 : 0 })];
        if (morph) anims.push(spring(xp, [{ width: w0 + 'px' }, { width: w1 + 'px' }], 'smooth'));
        blurIn(inner, { y: 40, delay: morph ? 0.3 : 0.1 });
        await Promise.all(anims.map((a) => a.finished));
        anims.forEach((a) => a.cancel());
      } else {
        head.setAttribute('aria-expanded', 'false');
        blurOut(inner);
        const headH = head.offsetHeight + parseFloat(getComputedStyle(xp).paddingTop) + parseFloat(getComputedStyle(xp).paddingBottom);
        if (morph) xp.classList.remove('is-open');
        const w1 = morph ? xp.offsetWidth : w0;
        if (morph) xp.classList.add('is-open');
        const anims = [spring(xp, [{ height: h0 + 'px' }, { height: headH + 'px' }], 'smooth')];
        if (morph) anims.push(spring(xp, [{ width: w0 + 'px' }, { width: w1 + 'px' }], 'smooth', { delay: 0.3 }));
        await Promise.all(anims.map((a) => a.finished));
        setOpen(false);
        if (morph) xp.classList.remove('is-open');
        anims.forEach((a) => a.cancel());
      }
      busy = false;
    });
  });
}

// ---------- segmented buttons: sliding thumb ----------
export function initSegmented(root = document) {
  $$('.segmented', root).forEach((seg) => {
    let thumb = $('.seg-thumb', seg);
    if (!thumb) { thumb = document.createElement('i'); thumb.className = 'seg-thumb'; seg.prepend(thumb); }
    const place = () => {
      const c = $('input:checked', seg)?.closest('label');
      if (!c) return (thumb.style.opacity = 0);
      thumb.style.opacity = 1;
      const sr = seg.getBoundingClientRect(), cr = c.getBoundingClientRect();
      thumb.style.width = cr.width + 'px';
      thumb.style.insetInlineStart = (getComputedStyle(seg).direction === 'rtl' ? sr.right - cr.right : cr.left - sr.left) + 'px';
    };
    seg.addEventListener('change', place);
    new ResizeObserver(place).observe(seg);
    place();
  });
}

// ---------- slider value bubble ----------
export function initSliders(root = document) {
  $$('.slider', root).forEach((s) => {
    const input = $('input', s), bubble = $('.bubble', s);
    const set = () => {
      const p = ((input.value - input.min) / (input.max - input.min)) * 100;
      s.style.setProperty('--p', p + '%');
      input.style.setProperty('--p', p + '%');
      if (bubble) bubble.textContent = ar(input.value);
    };
    input.addEventListener('input', set);
    set();
  });
}

// ---------- bottom sheet (spring, drag-to-dismiss with rubber band) ----------
export function openSheet(sheet) {
  let scrim = sheet.previousElementSibling?.classList.contains('sheet-scrim') ? sheet.previousElementSibling : null;
  if (!scrim) { scrim = document.createElement('div'); scrim.className = 'sheet-scrim'; sheet.before(scrim); }
  scrim.hidden = false; sheet.hidden = false;
  requestAnimationFrame(() => scrim.classList.add('open'));
  spring(sheet, [{ translate: '0 105%' }, { translate: '0 0' }], 'sheet');
  document.documentElement.style.overflow = 'hidden';
  const close = () => closeSheet(sheet);
  scrim.onclick = close;
  sheet._close = close;
  if (!sheet._drag) {
    sheet._drag = true;
    let y0 = null, dy = 0;
    const handle = $('.handle', sheet) || sheet;
    handle.addEventListener('pointerdown', (e) => { y0 = e.clientY; dy = 0; handle.setPointerCapture(e.pointerId); sheet.getAnimations().forEach((a) => a.cancel()); });
    handle.addEventListener('pointermove', (e) => {
      if (y0 == null) return;
      dy = e.clientY - y0;
      const t = dy < 0 ? -Math.sqrt(-dy) * 2 : dy; // rubber band upward
      sheet.style.translate = `0 ${t}px`;
    });
    handle.addEventListener('pointerup', () => {
      if (y0 == null) return; y0 = null;
      if (dy > 110) closeSheet(sheet);
      else spring(sheet, [{ translate: sheet.style.translate }, { translate: '0 0' }], 'bouncy').finished.then(() => (sheet.style.translate = '0 0'));
    });
  }
  sheet.querySelector('[data-close]')?.addEventListener('click', close, { once: true });
  document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); } });
}
export function closeSheet(sheet) {
  const scrim = sheet.previousElementSibling;
  scrim?.classList.remove('open');
  const from = sheet.style.translate || '0 0';
  spring(sheet, [{ translate: from }, { translate: '0 105%' }], 'sheet').finished.then(() => {
    sheet.hidden = true; sheet.style.translate = ''; if (scrim) scrim.hidden = true;
  });
  document.documentElement.style.overflow = '';
}

// ---------- menu ----------
export function openMenu(anchor, items, onPick) {
  $('.menu')?.remove();
  const m = document.createElement('div');
  m.className = 'menu';
  m.setAttribute('role', 'menu');
  for (const it of items) {
    const b = document.createElement('button');
    b.type = 'button'; b.setAttribute('role', 'menuitemradio'); b.setAttribute('aria-checked', !!it.checked);
    b.innerHTML = `<span>${it.icon || ''}</span><span></span>`;
    b.lastChild.textContent = it.label;
    b.onclick = () => { onPick(it); close(); };
    m.append(b);
  }
  document.body.append(m);
  const r = anchor.getBoundingClientRect();
  m.style.top = r.bottom + scrollY + 8 + 'px';
  m.style.right = Math.max(8, innerWidth - r.right) + 'px';
  spring(m, [{ opacity: 0, transform: 'scale(.85) translateY(-8px)' }, { opacity: 1, transform: 'none' }], 'snappy');
  const close = () => spring(m, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.92)' }], 'gentle').finished.then(() => m.remove());
  setTimeout(() => document.addEventListener('click', (e) => { if (!m.contains(e.target)) close(); }, { once: true }));
}

// ---------- floating nav: sliding indicator ----------
export function initNav() {
  const g = $('.nav-group');
  if (!g) return;
  const ind = $('.nav-indicator', g);
  const place = (item, animate) => {
    if (!item) return;
    const gr = g.getBoundingClientRect(), ir = item.getBoundingClientRect();
    const x = ir.left - gr.left + ir.width / 2 - ind.offsetWidth / 2;
    if (!animate) ind.style.transition = 'none';
    ind.style.transform = `translateX(${x}px)`;
    if (!animate) requestAnimationFrame(() => (ind.style.transition = ''));
  };
  place($('[aria-current="page"]', g), false);
  g.addEventListener('click', (e) => {
    const a = e.target.closest('.nav-item');
    if (!a || a.getAttribute('aria-current') === 'page') return;
    $$('.nav-item', g).forEach((x) => x.removeAttribute('aria-current'));
    a.setAttribute('aria-current', 'page');
    place(a, true);
  });
  addEventListener('resize', () => place($('[aria-current="page"]', g), false));
}

// ---------- my invitations (stored on this device) ----------
export const myOrders = {
  list() { try { return JSON.parse(localStorage.getItem('azeema_orders') || '[]'); } catch { return []; } },
  add(slug, key) {
    try {
      const l = myOrders.list().filter((o) => o.slug !== slug);
      l.unshift({ slug, key, at: Date.now() });
      localStorage.setItem('azeema_orders', JSON.stringify(l.slice(0, 50)));
    } catch {}
  },
};

export function initCommon() {
  initNav();
  initExpandables();
  initSegmented();
  initSliders();
  bindCopy();
  const n = myOrders.list().length;
  $$('[data-orders-badge]').forEach((b) => { b.textContent = n ? ar(n) : ''; b.dataset.n = n; });
}
