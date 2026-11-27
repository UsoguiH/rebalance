#!/usr/bin/env node
// Downloads Slate's loading-screen animation (slateteams.com) for local, private use.
// The file belongs to Slate, so it is kept out of git (see .gitignore): run this once
// on each machine that should show the loader.
//
//   node tools/fetch-slate-loader.js
//
// Writes assets/slate/preloader.riv and assets/slate/preloader.riv.js (the same bytes
// as base64, so the loader also works when index.html is opened from disk).
const fs = require('fs');
const path = require('path');

const SITE = 'https://slateteams.com';
const KNOWN = '/_astro/preloader.B_5LkbCw.riv';
const OUT = path.join(__dirname, '..', 'assets', 'slate');

async function get(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res;
}

(async () => {
  let rivPath = KNOWN;
  try {
    // the file name carries a build hash, so look it up on the live page first
    const html = await (await get(SITE + '/')).text();
    const m = html.match(/\/_astro\/preloader\.[\w-]+\.riv/);
    if (m) rivPath = m[0];
  } catch (e) {
    console.warn('Could not read the home page, trying the known file name:', e.message);
  }
  const buf = Buffer.from(await (await get(SITE + rivPath)).arrayBuffer());
  if (buf.subarray(0, 4).toString() !== 'RIVE') throw new Error('Downloaded file is not a Rive file');
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'preloader.riv'), buf);
  fs.writeFileSync(path.join(OUT, 'preloader.riv.js'), `window.SLATE_PRELOADER_RIV = "${buf.toString('base64')}";\n`);
  console.log(`Saved ${rivPath} (${buf.length} bytes) to ${path.relative(process.cwd(), OUT) || OUT}`);
})().catch((e) => {
  console.error('Failed:', e.message);
  process.exit(1);
});
