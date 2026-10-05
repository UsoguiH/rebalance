import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { config, PACKAGES, priceOf } from './src/config.js';
import { Invitations, Rsvps } from './src/db.js';
import { createCheckout, verifyMoyasar, paymentMode } from './src/payments.js';
import { enqueueRender, mediaDir, renderProgress } from './src/render.js';
import { OCCASIONS, THEMES, AUDIENCES, eventInstant, titleFor, formatDates } from './public/js/shared/invite.js';
import * as V from './src/views.js';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', true);
app.use(express.json({ limit: '64kb' }));
app.use(express.urlencoded({ extended: false, limit: '64kb' }));
app.use(express.static(path.join(config.root, 'public'), { maxAge: '7d', index: false }));

// ---------- validation ----------
const LIMITS = {
  topLine: 80, verse: 160, hosts: 200, hosts2: 200, inviteText: 140, name1: 40, name2: 40, tag1: 20, tag2: 20,
  subtitle: 120, venue: 90, city: 60, notes: 240, closing: 90,
};
export function cleanData(b = {}) {
  const d = {
    occasion: OCCASIONS[b.occasion] ? b.occasion : 'wedding',
    template: THEMES[b.template] ? b.template : 'sage',
  };
  for (const [k, max] of Object.entries(LIMITS)) if (typeof b[k] === 'string') d[k] = b[k].trim().slice(0, max);
  if (/^\d{4}-\d{2}-\d{2}$/.test(b.date || '')) d.date = b.date;
  if (/^\d{2}:\d{2}$/.test(b.time || '')) d.time = b.time;
  if (typeof b.mapUrl === 'string' && /^https?:\/\//i.test(b.mapUrl.trim())) d.mapUrl = b.mapUrl.trim().slice(0, 500);
  d.audience = Object.hasOwn(AUDIENCES, b.audience) ? b.audience : '';
  d.maxCompanions = Math.max(0, Math.min(10, parseInt(b.maxCompanions ?? 3, 10) || 0));
  return d;
}

const hostAuth = (req, res, next) => {
  const inv = Invitations.bySlug(req.params.slug);
  if (!inv || inv.host_key !== String(req.query.key || req.body?.key || '')) return res.status(404).send(V.notFound());
  req.inv = inv;
  next();
};
const adminAuth = (req, res, next) =>
  req.query.key === config.adminKey || req.get('x-admin-key') === config.adminKey ? next() : res.status(404).send(V.notFound());

// ---------- pages ----------
app.get('/', (req, res) => res.send(V.landing()));
app.get('/create', (req, res) => {
  let edit = null;
  if (req.query.edit) {
    const inv = Invitations.bySlug(req.query.edit);
    if (inv && inv.host_key === req.query.key) edit = inv;
  }
  res.send(V.builder({ edit, template: req.query.template, occasion: req.query.occasion, ref: req.query.ref }));
});
app.get('/designs', (req, res) => res.send(V.designsPage({ q: String(req.query.q || '').slice(0, 60), occasion: req.query.occasion })));
app.get('/orders', (req, res) => res.send(V.ordersPage()));

// "My invitations" — the device keeps {slug,key} pairs; we return a summary for each valid one.
app.post('/api/my', (req, res) => {
  const items = Array.isArray(req.body.items) ? req.body.items.slice(0, 50) : [];
  const out = [];
  for (const { slug, key } of items) {
    const inv = Invitations.bySlug(String(slug || ''));
    if (!inv || inv.host_key !== String(key || '')) continue;
    const dates = formatDates(inv.data.date, inv.data.time);
    out.push({
      slug: inv.slug, key: inv.host_key, title: titleFor(inv.data), template: inv.data.template, status: inv.status,
      price: inv.price, created_at: inv.created_at, video: inv.video_status, date: inv.data.date, when: `${dates.weekday} ${dates.hijri}`,
      summary: PACKAGES[inv.package]?.rsvp ? Rsvps.summary(inv.id) : null,
    });
  }
  res.json({ items: out });
});

app.get('/demo/:theme', (req, res) => {
  if (!THEMES[req.params.theme]) return res.status(404).send(V.notFound());
  res.send(V.guestPage({ demo: req.params.theme, to: req.query.to }));
});

// ---------- invitation lifecycle ----------
app.post('/api/invitations', (req, res) => {
  const data = cleanData(req.body.data);
  if (!data.name1 || !data.date) return res.status(400).json({ error: 'الاسم والتاريخ مطلوبة' });
  const pkg = PACKAGES[req.body.package] ? req.body.package : 'full';
  const phone = String(req.body.contactPhone || '').replace(/[^\d+]/g, '').slice(0, 16);
  if (phone.replace(/\D/g, '').length < 9) return res.status(400).json({ error: 'رقم الجوال غير صحيح' });
  const inv = Invitations.create({
    data, pkg, price: priceOf(pkg), contactPhone: phone,
    contactName: String(req.body.contactName || '').trim().slice(0, 60),
    ref: String(req.body.ref || '').slice(0, 20) || null,
  });
  res.json({ slug: inv.slug, key: inv.host_key, checkout: `/checkout/${inv.slug}?key=${inv.host_key}` });
});

app.put('/api/invitations/:slug', hostAuth, (req, res) => {
  const inv = req.inv;
  if (inv.status === 'paid' && inv.edits_left <= 0) return res.status(403).json({ error: 'انتهت التعديلات المجانية — تواصل معنا' });
  const data = cleanData(req.body.data);
  if (!data.name1 || !data.date) return res.status(400).json({ error: 'الاسم والتاريخ مطلوبة' });
  Invitations.update(inv.slug, { data, ...(inv.status === 'paid' ? { edits_left: inv.edits_left - 1 } : {}) });
  if (inv.status === 'paid') enqueueRender(inv.slug);
  res.json({ ok: true, next: inv.status === 'paid' ? `/host/${inv.slug}?key=${inv.host_key}` : `/checkout/${inv.slug}?key=${inv.host_key}` });
});

app.get('/checkout/:slug', hostAuth, (req, res) => {
  if (req.inv.status === 'paid') return res.redirect(`/host/${req.inv.slug}?key=${req.inv.host_key}`);
  res.send(V.checkout(req.inv, paymentMode()));
});

app.post('/api/invitations/:slug/pay', hostAuth, async (req, res) => {
  const inv = req.inv;
  if (inv.status === 'paid') return res.json({ redirect: `/host/${inv.slug}?key=${inv.host_key}` });
  try {
    if (paymentMode() === 'demo' && req.body.demo) {
      Invitations.markPaid(inv.slug, 'demo');
      enqueueRender(inv.slug);
      return res.json({ redirect: `/host/${inv.slug}?key=${inv.host_key}` });
    }
    const c = await createCheckout(inv);
    if (c.ref) Invitations.update(inv.slug, { payment_ref: c.ref });
    res.json({ redirect: c.url || null, mode: c.mode });
  } catch (e) {
    console.error('[pay]', e);
    res.status(502).json({ error: 'تعذر فتح صفحة الدفع، حاول مرة أخرى' });
  }
});

app.get('/pay/return/:slug', async (req, res) => {
  const inv = Invitations.bySlug(req.params.slug);
  if (!inv) return res.status(404).send(V.notFound());
  if (inv.status !== 'paid' && (await verifyMoyasar(inv.payment_ref))) {
    Invitations.markPaid(inv.slug);
    enqueueRender(inv.slug);
  }
  const fresh = Invitations.bySlug(inv.slug);
  res.redirect(fresh.status === 'paid' ? `/host/${inv.slug}?key=${inv.host_key}&welcome=1` : `/checkout/${inv.slug}?key=${inv.host_key}&failed=1`);
});

// ---------- guest side ----------
app.get('/i/:slug', (req, res) => {
  const inv = Invitations.bySlug(req.params.slug);
  if (!inv) return res.status(404).send(V.notFound());
  if (inv.status === 'paid') Invitations.view(inv.slug);
  res.send(V.guestPage({ inv, to: String(req.query.to || '').slice(0, 40) }));
});

app.get('/i/:slug/invite.ics', (req, res) => {
  const inv = Invitations.bySlug(req.params.slug);
  if (!inv) return res.status(404).end();
  const d = inv.data, start = eventInstant(d.date, d.time);
  const fmt = (t) => t.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const escIcs = (s) => String(s || '').replace(/[,;\\]/g, (m) => '\\' + m).replace(/\n/g, '\\n');
  res.type('text/calendar').set('Content-Disposition', `attachment; filename="invite-${inv.slug}.ics"`).send([
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Azeema//AR', 'BEGIN:VEVENT',
    `UID:${inv.slug}@azeema`, `DTSTAMP:${fmt(new Date())}`, `DTSTART:${fmt(start)}`, `DTEND:${fmt(new Date(start.getTime() + 4 * 3600e3))}`,
    `SUMMARY:${escIcs(titleFor(d))}`, `LOCATION:${escIcs([d.venue, d.city].filter(Boolean).join(' - '))}`,
    `DESCRIPTION:${escIcs(`${config.baseUrl}/i/${inv.slug}`)}`,
    'BEGIN:VALARM', 'TRIGGER:-PT3H', 'ACTION:DISPLAY', 'DESCRIPTION:تذكير بالمناسبة', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR'].join('\r\n'));
});

const rsvpHits = new Map();
app.post('/api/i/:slug/rsvp', (req, res) => {
  const inv = Invitations.bySlug(req.params.slug);
  if (!inv || inv.status !== 'paid' || !PACKAGES[inv.package]?.rsvp) return res.status(404).json({ error: 'غير متاح' });
  const k = `${req.ip}:${inv.slug}`, now = Date.now();
  const hits = (rsvpHits.get(k) || []).filter((t) => now - t < 3600e3);
  if (hits.length >= 8) return res.status(429).json({ error: 'محاولات كثيرة، حاول لاحقاً' });
  rsvpHits.set(k, [...hits, now]);
  const name = String(req.body.name || '').trim().slice(0, 60);
  if (name.length < 2) return res.status(400).json({ error: 'اكتب اسمك' });
  const attending = req.body.attending === true || req.body.attending === 'yes';
  const max = inv.data.maxCompanions ?? 3;
  const companions = attending ? Math.max(0, Math.min(max, parseInt(req.body.companions, 10) || 0)) : 0;
  Rsvps.add(inv.id, { name, attending, companions, message: String(req.body.message || '').trim().slice(0, 300) });
  res.json({ ok: true });
});

// ---------- host dashboard ----------
app.get('/host/:slug', hostAuth, (req, res) => {
  if (req.inv.status !== 'paid') return res.redirect(`/checkout/${req.inv.slug}?key=${req.inv.host_key}`);
  res.send(V.hostPage(req.inv, Rsvps.list(req.inv.id), Rsvps.summary(req.inv.id), { welcome: !!req.query.welcome, progress: renderProgress(req.inv.slug) }));
});
app.get('/api/host/:slug', hostAuth, (req, res) => {
  res.json({ video: req.inv.video_status, progress: renderProgress(req.inv.slug), summary: Rsvps.summary(req.inv.id), views: req.inv.views, rsvps: Rsvps.list(req.inv.id) });
});
app.get('/host/:slug/rsvps.csv', hostAuth, (req, res) => {
  const rows = Rsvps.list(req.inv.id);
  const q = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`;
  const csv = '﻿' + ['الاسم,الحضور,المرافقين,الرسالة,الوقت', ...rows.map((r) =>
    [q(r.name), r.attending ? 'سيحضر' : 'معتذر', r.companions, q(r.message), q(r.created_at)].join(','))].join('\n');
  res.type('text/csv').set('Content-Disposition', `attachment; filename="guests-${req.inv.slug}.csv"`).send(csv);
});

// ---------- media ----------
app.get('/media/:slug/:file(video.mp4|poster.jpg)', (req, res) => {
  const inv = Invitations.bySlug(req.params.slug);
  if (!inv || inv.status !== 'paid') return res.status(404).end();
  const f = path.join(mediaDir(inv.slug), req.params.file);
  if (!fs.existsSync(f)) return res.status(404).end();
  if (req.query.dl) res.set('Content-Disposition', `attachment; filename="azeema-${inv.slug}.mp4"`);
  res.sendFile(f, { maxAge: '1h' });
});

// Video timeline page — consumed only by the headless renderer
app.get('/v/:slug', (req, res) => {
  if (req.query.token !== config.renderToken) return res.status(404).send(V.notFound());
  if (req.params.slug.startsWith('demo-')) return res.send(V.videoPage({ template: req.params.slug.slice(5) }));
  const inv = Invitations.bySlug(req.params.slug);
  if (!inv) return res.status(404).end();
  res.send(V.videoPage({ data: inv.data }));
});

// ---------- admin ----------
app.get('/admin', adminAuth, (req, res) => res.send(V.adminPage(Invitations.all(), Invitations.stats(), config.adminKey)));
app.post('/api/admin/:slug/mark-paid', adminAuth, (req, res) => {
  const inv = Invitations.bySlug(req.params.slug);
  if (!inv) return res.status(404).json({ error: 'not found' });
  Invitations.markPaid(inv.slug, 'manual');
  enqueueRender(inv.slug);
  res.json({ ok: true });
});
app.post('/api/admin/:slug/rerender', adminAuth, (req, res) => {
  if (!Invitations.bySlug(req.params.slug)) return res.status(404).json({ error: 'not found' });
  enqueueRender(req.params.slug);
  res.json({ ok: true });
});

app.get('/healthz', (req, res) => res.json({ ok: true }));
app.use((req, res) => res.status(404).send(V.notFound()));

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  app.listen(config.port, () => console.log(`عزيمة ✦ ${config.baseUrl}  (payments: ${paymentMode()})`));
}
export default app;
