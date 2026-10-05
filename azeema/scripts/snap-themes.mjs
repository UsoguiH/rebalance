// Dev helper: render demo posters side by side → PNG.  node scripts/snap-themes.mjs [mode] [out.png] [themes,csv]
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { renderPoster, DEMOS } from '../public/js/shared/invite.js';
const root = path.resolve(import.meta.dirname, '..', 'public');
const mode = process.argv[2] || 'static';
const only = process.argv[4] ? process.argv[4].split(',') : null;
const items = Object.entries(DEMOS).filter(([t]) => !only || only.includes(t));
const html = `<!doctype html><html dir="rtl"><head><meta charset="utf-8">
<link rel="stylesheet" href="css/fonts.css"><link rel="stylesheet" href="css/invite.css">
<style>body{margin:0;background:#222;display:grid;grid-template-columns:repeat(${Math.min(items.length, 3)},var(--w,360px));gap:16px;padding:16px}</style></head>
<body>${items.map(([t, d]) => renderPoster({ ...d, template: t }, { mode })).join('')}</body></html>`;
const file = path.join(root, '_snap.html');
fs.writeFileSync(file, html.replaceAll('href="css/', `href="file://${root}/css/`));
fs.writeFileSync(path.join(root, 'css', '_fonts_file.css'), fs.readFileSync(path.join(root, 'css/fonts.css'), 'utf8').replaceAll('url(/fonts/', `url(file://${root}/fonts/`));
fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace('css/fonts.css', 'css/_fonts_file.css'));
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 16 + Math.min(items.length, 3) * 376, height: 700 } });
await p.goto('file://' + file, { waitUntil: 'networkidle' });
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(400);
await p.screenshot({ path: process.argv[3] || '/tmp/claude-0/themes.png', fullPage: true });
await b.close();
fs.rmSync(file); fs.rmSync(path.join(root, 'css', '_fonts_file.css'));
