// Exports a clickable static copy of the app (all screens) for sharing as a prototype.
// API calls are answered by an in-page mock; links/assets are rewritten to relative files.
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const BASE = 'http://127.0.0.1:3000';
const OUT = process.argv[2];
const ROOT = path.resolve(import.meta.dirname, '..');
const THEMES = ['sage', 'arch', 'lilac', 'royal', 'sadu', 'hijazi', 'bloom', 'editorial', 'oasis'];
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const post = (u, b) => fetch(BASE + u, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }).then((r) => r.json());

// 1) data: the latest paid invitation with a ready video + RSVPs, and a fresh pending one for checkout
const db = new DatabaseSync(path.join(ROOT, 'data', 'azeema.db'));
const paid = db.prepare(`SELECT i.slug, i.host_key FROM invitations i WHERE status='paid' AND video_status='ready'
  AND (SELECT COUNT(*) FROM rsvps r WHERE r.invitation_id=i.id) >= 3 ORDER BY i.id DESC LIMIT 1`).get();
if (!paid) throw new Error('no paid invitation with video + rsvps — run scripts/screens.mjs first');
const pend = await post('/api/invitations', { data: { occasion: 'wedding', template: 'lilac', name1: 'طارق', name2: 'هدى', inviteText: 'نتشرف بدعوتكم لحضور حفل زفاف', date: '2026-12-20', time: '20:30', venue: 'قاعة الأفراح', city: 'الرياض' }, contactPhone: '0500000000', contactName: 'طارق' });
const my = await post('/api/my', { items: [{ slug: paid.slug, key: paid.host_key }, { slug: pend.slug, key: pend.key }] });
const host = await fetch(`${BASE}/api/host/${paid.slug}?key=${paid.host_key}`).then((r) => r.json());
const MOCK = { orders: my.items, host };

// 2) URL rewriting
function mapUrl(raw) {
  const u = raw.replace(/&amp;/g, '&');
  const [p, hash = ''] = u.split('#');
  const [pathname, qs = ''] = p.split('?');
  const q = new URLSearchParams(qs);
  if (/^\/(css|js|img|fonts)\//.test(pathname)) return pathname.slice(1);
  if (pathname.startsWith('/media/')) return pathname.endsWith('.jpg') ? 'media/poster.jpg' : 'media/video.mp4';
  if (pathname === '/') return 'index.html' + (hash ? '#' + hash : '');
  if (pathname === '/designs') return 'designs.html';
  if (pathname === '/orders') return 'orders.html';
  if (pathname === '/create') return q.get('template') && !q.get('edit') ? `create-${q.get('template')}.html` : 'create.html';
  if (pathname.startsWith('/demo/')) return `demo-${pathname.split('/')[2]}.html`;
  if (pathname.startsWith('/checkout/')) return 'checkout.html';
  if (pathname.startsWith('/host/')) return pathname.endsWith('.csv') ? '#' : 'host.html';
  if (pathname.startsWith('/i/')) return pathname.endsWith('.ics') ? '#' : 'invite.html';
  return '#';
}
const MOCK_SCRIPT = `<script>(function(){var M=${JSON.stringify(MOCK).replace(/</g, '\\u003c')};var of=window.fetch.bind(window);
function J(o,s){return Promise.resolve(new Response(JSON.stringify(o),{status:s||200,headers:{'Content-Type':'application/json'}}));}
window.fetch=function(u,o){var s=String(u);if(s.indexOf('/api/')<0)return of(u,o);
if(s.indexOf('/api/my')>=0)return J({items:M.orders});
if(/\\/api\\/invitations\\/[^/]+\\/pay/.test(s))return J({redirect:'host.html'});
if(s.indexOf('/api/invitations')>=0)return J({slug:'demo',key:'demo',checkout:'checkout.html',next:'checkout.html'});
if(s.indexOf('/api/host/')>=0)return J(M.host);
if(s.indexOf('/rsvp')>=0)return J({ok:true});
return J({error:'غير متاح في النسخة التجريبية'},400);};
try{var k='azeema_orders';var l=JSON.parse(localStorage.getItem(k)||'[]');M.orders.forEach(function(o){if(!l.some(function(x){return x.slug===o.slug}))l.push({slug:o.slug,key:o.key});});localStorage.setItem(k,JSON.stringify(l));}catch(e){}
})();</script>`;

function rewriteHtml(html) {
  return html
    .replace(/\b(href|src|poster|action)="(\/[^"]*)"/g, (_, a, u) => `${a}="${mapUrl(u)}"`)
    .replace(/url\((\/(?:img|media)[^)]*)\)/g, (_, u) => `url(${mapUrl(u)})`)
    .replace('</head>', `${MOCK_SCRIPT}\n</head>`);
}

// 3) pages
const pages = {
  'index.html': '/', 'designs.html': '/designs', 'orders.html': '/orders', 'create.html': '/create',
  'checkout.html': `/checkout/${pend.slug}?key=${pend.key}`, 'host.html': `/host/${paid.slug}?key=${paid.host_key}`,
  'invite.html': `/i/${paid.slug}?to=${encodeURIComponent('أبو محمد')}`,
};
for (const t of THEMES) { pages[`create-${t}.html`] = `/create?template=${t}`; pages[`demo-${t}.html`] = `/demo/${t}`; }
for (const [file, route] of Object.entries(pages)) {
  let html = rewriteHtml(await fetch(BASE + route).then((r) => r.text()));
  if (file === 'index.html') {
    // the artifact wraps the main page in its own document skeleton
    const head = html.match(/<head>([\s\S]*)<\/head>/)[1];
    const bodyClass = html.match(/<body class="([^"]*)">/)[1];
    const body = html.match(/<body[^>]*>([\s\S]*)<\/body>/)[1];
    html = `<title>عزيمة</title>\n<script>document.documentElement.dir='rtl';document.documentElement.lang='ar';</script>\n${head.replace(/<meta charset[^>]*>|<meta name="viewport"[^>]*>|<title>[^<]*<\/title>/g, '')}\n<script>(document.body || document.documentElement).classList.add(...${JSON.stringify(bodyClass)}.split(" "));</script>\n${body}`;
  }
  fs.writeFileSync(path.join(OUT, file), html);
}

// 4) assets (+ JS patched for relative URLs and the sandbox)
const copyDir = (from, to, filter = () => true) => {
  fs.mkdirSync(to, { recursive: true });
  for (const f of fs.readdirSync(from, { withFileTypes: true })) {
    if (f.isDirectory()) copyDir(path.join(from, f.name), path.join(to, f.name), filter);
    else if (filter(f.name)) fs.copyFileSync(path.join(from, f.name), path.join(to, f.name));
  }
};
const pub = path.join(ROOT, 'public');
copyDir(path.join(pub, 'fonts'), path.join(OUT, 'fonts'));
copyDir(path.join(pub, 'img', 'designs'), path.join(OUT, 'img', 'designs'));
copyDir(path.join(pub, 'css'), path.join(OUT, 'css'), (n) => !n.startsWith('_'));
copyDir(path.join(pub, 'js'), path.join(OUT, 'js'));
fs.mkdirSync(path.join(OUT, 'media'), { recursive: true });
fs.copyFileSync(path.join(pub, 'media', 'sage-preview.mp4'), path.join(OUT, 'media', 'sage-preview.mp4'));
fs.copyFileSync(path.join(ROOT, 'data', 'media', paid.slug, 'video.mp4'), path.join(OUT, 'media', 'video.mp4'));
fs.copyFileSync(path.join(ROOT, 'data', 'media', paid.slug, 'poster.jpg'), path.join(OUT, 'media', 'poster.jpg'));
const fontsCss = path.join(OUT, 'css', 'fonts.css');
fs.writeFileSync(fontsCss, fs.readFileSync(fontsCss, 'utf8').replaceAll('url(/fonts/', 'url(../fonts/'));

const patch = (rel, pairs) => {
  const f = path.join(OUT, 'js', rel);
  let s = fs.readFileSync(f, 'utf8');
  for (const [a, b] of pairs) { if (!s.includes(a)) throw new Error(`patch miss in ${rel}: ${a}`); s = s.split(a).join(b); }
  fs.writeFileSync(f, s);
};
patch('designs.js', [['`/img/designs/${k}.jpg`', '`img/designs/${k}.jpg`'], ['`/create?template=${k}&occasion=${occ}`', '`create-${k}.html`'], ['`/demo/${k}`', '`demo-${k}.html`']]);
patch('orders.js', [['/img/designs/', 'img/designs/'], ['href="/host/${esc(o.slug)}?key=${esc(o.key)}"', 'href="host.html"'], ['href="/checkout/${esc(o.slug)}?key=${esc(o.key)}"', 'href="checkout.html"']]);
patch('host.js', [['`/media/${slug}/poster.jpg?t=${Date.now()}`', "'media/poster.jpg'"], ['`/media/${slug}/video.mp4?t=${Date.now()}`', "'media/video.mp4'"]]);
patch('guest.js', [['setTimeout(() => (f.src = card.dataset.embed), 150);', "setTimeout(() => card.classList.add('ready'), 700); // map embeds are not allowed in the prototype"],
  ["f.onload = () => { f.classList.add('loaded'); card.classList.add('ready'); };\n      card.prepend(f);", '']]);
patch('motion.js', [['export function revealOnScroll(root = document) {', 'export function revealOnScroll(root = document) {\n  return; // prototype: content is visible at rest']]);

const files = [];
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((f) => (f.isDirectory() ? walk(path.join(d, f.name)) : files.push(path.relative(OUT, path.join(d, f.name)))));
walk(OUT);
fs.writeFileSync(path.join(OUT, '..', 'artifact-files.json'), JSON.stringify(files.filter((f) => f !== 'index.html')));
console.log(files.length, 'files');
