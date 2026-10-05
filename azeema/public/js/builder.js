import { renderPoster, OCCASIONS, formatDates } from './shared/invite.js';
import { $, $$, api, initCommon, myOrders, openSheet, setLoading, snackbar } from './m3.js';
import { spring, blurIn } from './motion.js';

initCommon();
const init = window.__INITIAL__ || { data: {} };
const form = $('#builder');
const TEXT = ['topLine', 'verse', 'hosts', 'hosts2', 'inviteText', 'subtitle', 'notes', 'closing'];
const FIELDS = ['name1', 'name2', ...TEXT, 'date', 'time', 'venue', 'city', 'mapUrl', 'audience', 'maxCompanions'];
const TOGGLED = ['topLine', 'verse', 'notes'];
const dirty = new Set();

const setRadio = (name, value) => { const r = form.querySelector(`[name="${name}"][value="${value}"]`); if (r) r.checked = true; };
const val = (name) => form.elements[name]?.value ?? '';
const toggleOf = (k) => form.querySelector(`[data-toggle="${k}"]`);

function applyOccasion(occ, { force = false } = {}) {
  const o = OCCASIONS[occ] || OCCASIONS.wedding;
  for (const k of TEXT) if (force || !dirty.has(k)) form.elements[k].value = o.defaults[k] ?? '';
  for (const k of TOGGLED) if (force || !dirty.has(k)) setToggle(k, !!form.elements[k].value, false);
  $('[data-label="name1"]').textContent = o.name1;
  $('[data-label="name2"]').textContent = o.name2 || '';
  $('[data-show="name2"]').hidden = !o.hasName2;
  form.name1.placeholder = `مثال: ${o.sample[0]}`;
  form.name2.placeholder = o.sample[1] ? `مثال: ${o.sample[1]}` : '';
}

// Switch + collapsible field (spring height, content blur-in)
function setToggle(k, on, animate = true) {
  const sw = toggleOf(k), body = sw.closest('.tg').querySelector('.tg-body');
  sw.checked = on;
  if (!animate) { body.hidden = !on; return; }
  const h0 = body.hidden ? 0 : body.offsetHeight;
  body.hidden = false;
  const h1 = on ? body.scrollHeight : 0;
  spring(body, [{ height: h0 + 'px' }, { height: h1 + 'px' }], 'smooth').finished.then((a) => { body.hidden = !on; body.getAnimations().forEach((x) => x.cancel()); });
  if (on) { blurIn(body.firstElementChild, { y: 20, delay: 0.1 }); setTimeout(() => form.elements[k].focus({ preventScroll: true }), 250); }
}
TOGGLED.forEach((k) => toggleOf(k).addEventListener('change', (e) => { dirty.add(k); setToggle(k, e.target.checked); draw(); }));

function collect() {
  const d = { occasion: form.occasion.value, template: form.template.value };
  for (const k of FIELDS) d[k] = val(k);
  for (const k of TOGGLED) if (!toggleOf(k).checked) d[k] = '';
  if (!OCCASIONS[d.occasion]?.hasName2) d.name2 = '';
  return d;
}

let animateNext = true, raf = 0;
function draw() {
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(() => {
    const d = collect();
    const o = OCCASIONS[d.occasion] || OCCASIONS.wedding;
    const shown = { ...d, name1: d.name1 || o.sample[0], name2: o.hasName2 ? d.name2 || o.sample[1] : '' };
    const html = renderPoster(shown, { mode: animateNext ? 'page' : 'static' });
    $('#preview').innerHTML = html;
    if (!$('#preview-sheet').hidden) $('#preview-m').innerHTML = html;
    animateNext = false;
    const f = formatDates(d.date, d.time);
    $('#hijri-hint').textContent = f.hijri ? `يوافق ${f.weekday} ${f.hijri}` : '';
  });
}

// ---- init ----
const d0 = init.data || {};
setRadio('occasion', d0.occasion || 'wedding');
setRadio('template', d0.template || 'sage');
setRadio('package', new URLSearchParams(location.search).get('package') || init.package || 'full');
if (init.edit) {
  for (const k of FIELDS) if (d0[k] !== undefined && form.elements[k]) form.elements[k].value = d0[k];
  TEXT.forEach((k) => dirty.add(k));
  applyOccasion(d0.occasion);
  TOGGLED.forEach((k) => setToggle(k, !!d0[k], false));
} else {
  applyOccasion(d0.occasion || 'wedding', { force: true });
  form.date.value = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
}
setRadio('audience', d0.audience || '');
if (init.contactName) form.contactName.value = init.contactName;
if (init.contactPhone) form.contactPhone.value = init.contactPhone;
form.dispatchEvent(new Event('change'));
$$('.segmented').forEach((s) => s.dispatchEvent(new Event('change')));
$$('.slider input').forEach((s) => s.dispatchEvent(new Event('input')));
draw();
$('.d-opt:has(input:checked)')?.scrollIntoView({ inline: 'center', block: 'nearest' });

// ---- events ----
form.addEventListener('input', (e) => { if (TEXT.includes(e.target.name)) dirty.add(e.target.name); draw(); });
form.addEventListener('change', (e) => {
  if (e.target.name === 'occasion') applyOccasion(e.target.value);
  if (e.target.name === 'template' || e.target.name === 'occasion') animateNext = true;
  draw();
});

// Step progress follows scroll
const secs = $$('.b-sec');
$('#step-progress').style.setProperty('--v', 100 / secs.length + '%');
addEventListener('scroll', () => {
  const mid = innerHeight * 0.4; let i = 0;
  secs.forEach((s, k) => { if (s.getBoundingClientRect().top < mid) i = k; });
  $('#step-progress').style.setProperty('--v', ((i + 1) / secs.length) * 100 + '%');
}, { passive: true });

// Mobile preview → bottom sheet
$('#preview-open').addEventListener('click', () => {
  animateNext = true;
  $('#preview-sheet').hidden = false;
  draw();
  openSheet($('#preview-sheet'));
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = collect();
  const fail = (msg, field) => {
    snackbar(msg);
    const el = form.elements[field];
    if (el) { el.focus(); spring(el, [{ transform: 'translateX(0)' }, { transform: 'translateX(-8px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }], 'bouncy'); }
  };
  if (!data.name1.trim()) return fail('اكتب الاسم أولاً', 'name1');
  if (!data.date) return fail('اختر تاريخ المناسبة', 'date');
  const phone = val('contactPhone');
  if (phone.replace(/\D/g, '').length < 9) return fail('اكتب رقم جوال صحيح عشان نرسل لك الدعوة', 'contactPhone');
  const btn = $('.submit', form);
  setLoading(btn, true);
  try {
    let ref = init.ref;
    try { ref ||= localStorage.getItem('azeema_ref'); } catch {}
    const payload = { data, package: form.package.value, contactName: val('contactName'), contactPhone: phone, ref };
    const r = init.edit
      ? await api(`/api/invitations/${init.edit.slug}?key=${init.edit.key}`, payload, 'PUT')
      : await api('/api/invitations', payload);
    if (r.slug) myOrders.add(r.slug, r.key);
    location.href = r.next || r.checkout;
  } catch (ex) { setLoading(btn, false); snackbar(ex.message); }
});
