import { $, $$, ar, api } from './ui.js';

// Envelope cover → open
const cover = $('#cover'), guest = $('#guest');
const open = () => {
  cover.classList.add('opening');
  guest.classList.remove('closed');
  $$('.poster', guest).forEach((p) => p.getAnimations({ subtree: true }).forEach((a) => { a.currentTime = 0; a.play(); }));
  setTimeout(() => cover.classList.add('gone'), 1150);
};
$('#open')?.addEventListener('click', open);
cover?.addEventListener('keydown', (e) => e.key === 'Enter' && open());

// Countdown
const cd = $('.g-count');
const start = cd?.dataset.start ? new Date(cd.dataset.start) : null;
const tick = () => {
  if (!start) return;
  let s = Math.max(0, Math.floor((start - Date.now()) / 1000));
  const v = { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
  for (const [k, n] of Object.entries(v)) { const el = $(`[data-u="${k}"]`, cd); if (el) el.textContent = ar(n); }
  if (s === 0) $('.g-kicker', cd).textContent = 'حان الموعد 🤍';
};
tick(); setInterval(tick, 1000);

// Share
$('[data-share]')?.addEventListener('click', async (e) => {
  const url = location.href.split('#')[0];
  if (navigator.share) { try { await navigator.share({ title: e.currentTarget.dataset.title, url }); } catch {} }
  else location.href = `https://wa.me/?text=${encodeURIComponent(e.currentTarget.dataset.title + '\n' + url)}`;
});

// RSVP
const form = $('#rsvp-form');
if (form) {
  const key = `rsvp:${form.dataset.slug || 'demo'}`;
  const done = () => { form.hidden = true; $('.rsvp-done').hidden = false; };
  try { if (localStorage.getItem(key)) done(); } catch {}
  const comp = $('[name="companions"]', form);
  form.addEventListener('click', (e) => {
    const b = e.target.closest('[data-step]');
    if (!b || !comp) return;
    comp.value = Math.max(0, Math.min(+comp.max, (+comp.value || 0) + +b.dataset.step));
  });
  form.addEventListener('change', () => {
    const yes = form.attending.value === 'yes';
    $('.companions', form)?.toggleAttribute('hidden', !yes);
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('.error', form), btn = $('button[type=submit]', form);
    err.hidden = true;
    const body = { name: form.name.value, attending: form.attending.value, companions: comp?.value || 0, message: form.message.value };
    if (body.name.trim().length < 2) { err.textContent = 'اكتب اسمك لو سمحت'; err.hidden = false; return; }
    btn.disabled = true;
    try {
      if (form.dataset.demo !== '1') await api(`/api/i/${form.dataset.slug}/rsvp`, body);
      try { localStorage.setItem(key, '1'); } catch {}
      done();
    } catch (ex) { err.textContent = ex.message; err.hidden = false; btn.disabled = false; }
  });
}
