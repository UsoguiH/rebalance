import { $, $$, ar, api, initSegmented, setLoading, snackbar } from './m3.js';
import { spring, blurIn, springEasing, SPRINGS } from './motion.js';

initSegmented();

// Envelope cover → open
const cover = $('#cover'), guest = $('#guest');
$('#open')?.addEventListener('click', () => {
  cover.classList.add('opening');
  guest.classList.remove('closed');
  $$('.poster', guest).forEach((p) => p.getAnimations({ subtree: true }).forEach((a) => { a.currentTime = 0; a.play(); }));
  setTimeout(() => cover.classList.add('gone'), 1000);
});

// Countdown
const cd = $('.g-count');
const start = cd?.dataset.start ? new Date(cd.dataset.start) : null;
const tick = () => {
  if (!start) return;
  const s = Math.max(0, Math.floor((start - Date.now()) / 1000));
  const v = { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
  for (const [k, n] of Object.entries(v)) { const el = $(`[data-u="${k}"]`, cd); if (el && el.textContent !== ar(n)) { el.textContent = ar(n); if (k !== 's') blurIn(el, { y: 8 }); } }
};
tick(); setInterval(tick, 1000);

// Share
$('[data-share]')?.addEventListener('click', async (e) => {
  const url = location.href.split('#')[0];
  if (navigator.share) { try { await navigator.share({ title: e.currentTarget.dataset.title, url }); } catch {} }
  else { try { await navigator.clipboard.writeText(url); snackbar('انسخ الرابط ✓'); } catch { location.href = `https://wa.me/?text=${encodeURIComponent(url)}`; } }
});

// ---- "View on map": pill morphs into the map card (shared-element, clip-path driven, spring 400/30/0.8) ----
const slot = $('#map-slot'), pill = $('#map-pill'), card = $('#map-card');
let mapOpen = false, busy = false;
async function toggleMap() {
  if (busy) return; busy = true;
  const sr0 = slot.getBoundingClientRect();
  const pr = pill.getBoundingClientRect();
  if (!mapOpen) {
    pill.hidden = true; card.hidden = false;
    const cr = card.getBoundingClientRect();
    const inset = `inset(${pr.top - cr.top}px ${cr.right - pr.right}px ${cr.bottom - pr.bottom}px ${pr.left - cr.left}px round 28px)`;
    if (!card.querySelector('iframe')) {
      const f = document.createElement('iframe');
      f.title = 'الخريطة'; f.loading = 'lazy'; f.referrerPolicy = 'no-referrer-when-downgrade'; f.allowFullscreen = true;
      f.onload = () => { f.classList.add('loaded'); card.classList.add('ready'); };
      card.prepend(f);
      setTimeout(() => (f.src = card.dataset.embed), 150);
    }
    await Promise.all([
      spring(slot, [{ height: sr0.height + 'px' }, { height: cr.height + 'px' }], 'snappy').finished,
      spring(card, [{ clipPath: inset }, { clipPath: 'inset(0 0 0 0 round 32px)' }], 'snappy').finished,
      spring($('#map-close'), [{ opacity: 0, transform: 'scale(.5)' }, { opacity: 1, transform: 'none' }], 'bouncy', { delay: 0.15 }).finished,
    ]);
    slot.getAnimations().forEach((a) => a.cancel());
    mapOpen = true;
  } else {
    const cr = card.getBoundingClientRect();
    pill.hidden = false;
    const pr2 = pill.getBoundingClientRect();
    pill.hidden = true;
    const target = `inset(${pr2.top - cr.top}px ${cr.right - pr2.right}px ${cr.bottom - pr2.bottom}px ${pr2.left - cr.left}px round 28px)`;
    await Promise.all([
      spring(slot, [{ height: cr.height + 'px' }, { height: pr2.height + 'px' }], 'snappy').finished,
      spring(card, [{ clipPath: 'inset(0 0 0 0 round 32px)' }, { clipPath: target }], 'snappy').finished,
    ]);
    card.hidden = true; pill.hidden = false;
    card.getAnimations().forEach((a) => a.cancel()); slot.getAnimations().forEach((a) => a.cancel());
    spring(pill, [{ opacity: 0, transform: 'scale(.9)' }, { opacity: 1, transform: 'none' }], 'snappy');
    mapOpen = false;
  }
  busy = false;
}
pill?.addEventListener('click', toggleMap);
$('#map-close')?.addEventListener('click', toggleMap);

// ---- RSVP ----
const form = $('#rsvp-form');
if (form) {
  const key = `rsvp:${form.dataset.slug || 'demo'}`;
  const done = (animate) => {
    form.hidden = true; const d = $('.rsvp-done'); d.hidden = false;
    if (animate) { blurIn(d, { y: 20 }); spring($('.done-ic'), [{ transform: 'scale(0) rotate(-30deg)' }, { transform: 'none' }], 'bouncy', { delay: 0.1 }); }
  };
  try { if (localStorage.getItem(key)) done(false); } catch {}
  const comp = form.elements.companions, out = $('#comp-out'), box = $('.companions', form);
  form.addEventListener('click', (e) => {
    const b = e.target.closest('[data-step]');
    if (!b || !comp) return;
    const nv = Math.max(0, Math.min(+comp.dataset.max, +comp.value + +b.dataset.step));
    if (nv === +comp.value) { spring(out, [{ transform: 'translateX(-6px)' }, { transform: 'translateX(5px)' }, { transform: 'none' }], 'bouncy'); return; }
    comp.value = nv; out.textContent = ar(nv);
    spring(out, [{ transform: `translateY(${b.dataset.step > 0 ? 10 : -10}px)`, opacity: 0 }, { transform: 'none', opacity: 1 }], 'bouncy');
  });
  form.addEventListener('change', (e) => {
    if (e.target.name !== 'attending' || !box) return;
    const yes = form.attending.value === 'yes';
    const h0 = box.offsetHeight;
    box.hidden = false;
    const h1 = yes ? box.scrollHeight : 0;
    spring(box, [{ height: (yes ? 0 : h0) + 'px', opacity: yes ? 0 : 1 }, { height: h1 + 'px', opacity: yes ? 1 : 0 }], 'smooth').finished.then(() => { box.hidden = !yes; box.getAnimations().forEach((a) => a.cancel()); });
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('button[type=submit]', form);
    const body = { name: form.elements.name.value, attending: form.attending.value, companions: comp?.value || 0, message: form.message.value };
    if (body.name.trim().length < 2) { snackbar('اكتب اسمك لو سمحت'); form.elements.name.focus(); return; }
    setLoading(btn, true);
    try {
      if (form.dataset.demo !== '1') await api(`/api/i/${form.dataset.slug}/rsvp`, body);
      else await new Promise((r) => setTimeout(r, 700));
      try { localStorage.setItem(key, '1'); } catch {}
      done(true);
    } catch (ex) { setLoading(btn, false); snackbar(ex.message); }
  });
}
