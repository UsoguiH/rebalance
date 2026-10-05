import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'azeema-'));
process.env.DEMO_MODE = '1';
process.env.RENDER_DISABLED = '1';
const { default: app } = await import('../server.js');
const { stretch, formatDates, renderPoster, DEMOS } = await import('../public/js/shared/invite.js');

let base, srv;
before(() => new Promise((r) => { srv = app.listen(0, () => { base = `http://127.0.0.1:${srv.address().port}`; r(); }); }));
after(() => srv.close());
const post = (u, body, method = 'POST') => fetch(base + u, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

test('kashida stretching keeps ligatures and articles intact', () => {
  assert.equal(stretch('الاستقبال'), 'الاســـتـــقـــبـــال'.replace(/ـــ/g, 'ــ'));
  assert.ok(!stretch('لا').includes('ـ'));
  assert.equal(stretch('ورد'), 'ورد');
});

test('dates render Hijri (Umm al-Qura) and Gregorian in Arabic', () => {
  const d = formatDates('2026-12-17', '20:30');
  assert.equal(d.weekday, 'الخميس');
  assert.match(d.hijri, /رجب ١٤٤٨/);
  assert.match(d.greg, /ديسمبر ٢٠٢٦/);
  assert.match(d.time, /٨:٣٠ مساءً/);
});

test('every theme renders and escapes user input', () => {
  for (const t of Object.keys(DEMOS)) {
    const html = renderPoster({ ...DEMOS[t], template: t, name1: '<script>x</script>' }, { mode: 'static' });
    assert.ok(html.includes(`t-${t}`));
    assert.ok(!html.includes('<script>x'));
  }
});

test('full order flow: create → demo pay → guest RSVP → host stats', async () => {
  let r = await post('/api/invitations', { data: { name1: 'فهد', name2: 'نورة', date: '2026-12-17', time: '20:30', template: 'sage' }, contactPhone: '0500000000' });
  assert.equal(r.status, 200);
  const { slug, key } = await r.json();

  r = await post(`/api/i/${slug}/rsvp`, { name: 'سارة', attending: 'yes' });
  assert.equal(r.status, 404, 'RSVP closed before payment');

  r = await post(`/api/invitations/${slug}/pay?key=${key}`, { demo: true });
  assert.match((await r.json()).redirect, new RegExp(`/host/${slug}`));

  r = await post(`/api/i/${slug}/rsvp`, { name: 'سارة', attending: 'yes', companions: 99 });
  assert.equal(r.status, 200);
  r = await post(`/api/i/${slug}/rsvp`, { name: 'نوف', attending: 'no' });
  assert.equal(r.status, 200);

  const host = await (await fetch(`${base}/api/host/${slug}?key=${key}`)).json();
  assert.deepEqual(host.summary, { responses: 2, yes: 1, no: 1, guests: 4 }, 'companions are capped at maxCompanions (3)');

  assert.equal((await fetch(`${base}/api/host/${slug}?key=wrong`)).status, 404);
  const page = await (await fetch(`${base}/i/${slug}?to=${encodeURIComponent('أبو محمد')}`)).text();
  assert.ok(page.includes('إلى: أبو محمد'));
  const ics = await (await fetch(`${base}/i/${slug}/invite.ics`)).text();
  assert.match(ics, /DTSTART:20261217T173000Z/);
  const csv = await (await fetch(`${base}/host/${slug}/rsvps.csv?key=${key}`)).text();
  assert.ok(csv.includes('سارة'));
});

test('validation rejects missing names and bad phones', async () => {
  assert.equal((await post('/api/invitations', { data: { date: '2026-12-17' }, contactPhone: '0500000000' })).status, 400);
  assert.equal((await post('/api/invitations', { data: { name1: 'x', date: '2026-12-17' }, contactPhone: '12' })).status, 400);
});

test('app screens render and "my invitations" only returns owned invitations', async () => {
  for (const u of ['/', '/designs', '/orders', '/create', '/demo/sage']) assert.equal((await fetch(base + u)).status, 200, u);
  const r = await post('/api/invitations', { data: { name1: 'سلطان', date: '2026-11-26', template: 'arch' }, contactPhone: '0511111111' });
  const { slug, key } = await r.json();
  const mine = await (await post('/api/my', { items: [{ slug, key }, { slug, key: 'stolen' }, { slug: 'nope', key: 'x' }] })).json();
  assert.equal(mine.items.length, 1);
  assert.equal(mine.items[0].status, 'pending');
  assert.equal(mine.items[0].template, 'arch');
});

test('springs settle exactly and overshoot like the reference physics', async () => {
  const { springEasing } = await import('../public/js/motion.js');
  const s = springEasing({ stiffness: 200, damping: 22, mass: 1.2 });
  const pts = s.easing.slice(7, -1).split(',').map(Number);
  assert.equal(pts.at(-1), 1);
  assert.ok(Math.max(...pts) > 1.02, 'underdamped spring overshoots');
  assert.ok(s.duration > 400 && s.duration < 1500);
});

test('renderer page requires the render token', async () => {
  assert.equal((await fetch(`${base}/v/demo-sage`)).status, 404);
});
