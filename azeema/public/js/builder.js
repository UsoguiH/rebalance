import { renderPoster, OCCASIONS, formatDates } from './shared/invite.js';
import { $, $$, api } from './ui.js';

const init = window.__INITIAL__ || { data: {} };
const form = $('#builder');
const preview = $('#preview');
const TEXT = ['topLine', 'verse', 'hosts', 'hosts2', 'inviteText', 'subtitle', 'notes', 'closing'];
const FIELDS = ['name1', 'name2', ...TEXT, 'date', 'time', 'venue', 'city', 'mapUrl', 'audience', 'maxCompanions'];
const dirty = new Set();

const setRadio = (name, value) => { const r = form.querySelector(`[name="${name}"][value="${value}"]`); if (r) r.checked = true; };
const val = (name) => form.elements[name]?.value ?? '';

function applyOccasion(occ, { force = false } = {}) {
  const o = OCCASIONS[occ] || OCCASIONS.wedding;
  for (const k of TEXT) if (force || !dirty.has(k)) form.elements[k].value = o.defaults[k] ?? '';
  $('[data-label="name1"]').textContent = o.name1;
  $('[data-label="name2"]').textContent = o.name2 || '';
  $('[data-show="name2"]').hidden = !o.hasName2;
  form.name1.placeholder = `مثال: ${o.sample[0]}`;
  form.name2.placeholder = o.sample[1] ? `مثال: ${o.sample[1]}` : '';
}

function collect() {
  const d = { occasion: form.occasion.value, template: form.template.value };
  for (const k of FIELDS) d[k] = val(k);
  if (!OCCASIONS[d.occasion]?.hasName2) d.name2 = '';
  return d;
}

let first = true, raf = 0;
function draw() {
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(() => {
    const d = collect();
    const o = OCCASIONS[d.occasion] || OCCASIONS.wedding;
    const shown = { ...d, name1: d.name1 || o.sample[0], name2: o.hasName2 ? d.name2 || o.sample[1] : '' };
    preview.innerHTML = renderPoster(shown, { mode: first ? 'page' : 'static' });
    first = false;
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
} else {
  applyOccasion(d0.occasion || 'wedding', { force: true });
  const dt = new Date(Date.now() + 30 * 864e5);
  form.date.value = dt.toISOString().slice(0, 10);
}
if (init.contactName) form.contactName.value = init.contactName;
if (init.contactPhone) form.contactPhone.value = init.contactPhone;
draw();

// ---- events ----
form.addEventListener('input', (e) => {
  if (TEXT.includes(e.target.name)) dirty.add(e.target.name);
  draw();
});
form.addEventListener('change', (e) => {
  if (e.target.name === 'occasion') applyOccasion(e.target.value);
  if (e.target.name === 'template' || e.target.name === 'occasion') { first = true; }
  draw();
});

$('#preview-toggle').addEventListener('click', () => $('.b-preview').classList.toggle('open'));
$('.b-preview').addEventListener('click', (e) => { if (e.target === e.currentTarget) e.currentTarget.classList.remove('open'); });

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const err = $('#form-error');
  err.hidden = true;
  const data = collect();
  const fail = (msg, field) => { err.textContent = msg; err.hidden = false; form.elements[field]?.focus(); };
  if (!data.name1.trim()) return fail('اكتب الاسم أولاً', 'name1');
  if (!data.date) return fail('اختر تاريخ المناسبة', 'date');
  const phone = val('contactPhone');
  if (phone.replace(/\D/g, '').length < 9) return fail('اكتب رقم جوال صحيح عشان نرسل لك الدعوة', 'contactPhone');
  const btn = $('button[type=submit]', form);
  btn.disabled = true;
  try {
    let ref = init.ref;
    try { ref ||= localStorage.getItem('azeema_ref'); } catch {}
    const payload = { data, package: form.package.value, contactName: val('contactName'), contactPhone: phone, ref };
    const r = init.edit
      ? await api(`/api/invitations/${init.edit.slug}?key=${init.edit.key}`, payload, 'PUT')
      : await api('/api/invitations', payload);
    location.href = r.next || r.checkout;
  } catch (ex) { fail(ex.message); btn.disabled = false; }
});
