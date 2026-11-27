#!/usr/bin/env node
// Downloads Slate's (slateteams.com) loading-screen animation for local, private use,
// turns its navy ground black, and recolours its cursor so monika.js can take it over.
// Slate's files are theirs, so they are written to ./slate-assets/, which git ignores.
//
//   node demo/agent-cursors/tools/fetch-slate-assets.js
//
// Recolouring: every colour in a .riv file is a fixed 4-byte field, so the cursor's colours
// are swapped in place for "marker" colours and nothing else in the file changes.
'use strict';
const fs = require('fs');
const path = require('path');

const SITE = 'https://slateteams.com';
const OUT = path.join(__dirname, '..', 'slate-assets');
const FORMAT = require('./rive-format.json');

// Slate's palette -> index used by monika.js (1 is Monika's blue)
const PALETTE = { 0x2796f1: 1, 0x00b72b: 2, 0xfa5d1e: 3, 0xc88afa: 4, 0xff6791: 5 };

// The scenes, by the file name prefix on Slate (the hash is looked up on the live page).
// `bubbles`: comment bubbles that sit beside a cursor, by artboard -> SolidColor component index.
const RIVS = {
  // the loading screen, with Slate's navy ground turned black
  preloader: { recolor: { '0d324f': '000000' } },
};
const MEDIA = [];

async function get(url, { tries = 4, html = false } = {}) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (asset fetch)' } });
      const buf = Buffer.from(await res.arrayBuffer());
      // the site sometimes answers with an HTML page instead of the file; retry those
      if (res.ok && (html || !buf.subarray(0, 15).toString().toLowerCase().includes('<!doctype'))) return buf;
      last = new Error(`${url} -> HTTP ${res.status}`);
    } catch (e) {
      last = e;
    }
    await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
  }
  throw last;
}

// ------------------------------------------------------------ .riv reader
function readRiv(d) {
  let i = 0;
  const vu = () => {
    let r = 0, s = 0, b;
    do { b = d[i++]; r += (b & 0x7f) * 2 ** s; s += 7; } while (b >= 0x80);
    return r;
  };
  if (d.subarray(0, 4).toString() !== 'RIVE') throw new Error('not a Rive file');
  i = 4; vu(); vu(); vu();
  const keys = [];
  for (let k = vu(); k !== 0; k = vu()) keys.push(k);
  const toc = {};
  let cur = 0, bit = 8;
  for (const k of keys) {
    if (bit === 8) { cur = d.readUInt32LE(i); i += 4; bit = 0; }
    toc[k] = (cur >>> bit) & 3; bit += 2;
  }
  const objs = [];
  while (i < d.length) {
    const t = vu(), p = {}, off = {};
    for (let k = vu(); k !== 0; k = vu()) {
      let ft = FORMAT.props[k];
      if (ft === undefined) ft = toc[k];
      if (ft === undefined) throw new Error(`unknown property ${k}`);
      off[k] = i;
      if (ft === 0) p[k] = vu();
      else if (ft === 4) p[k] = d[i++];
      else if (ft === 1) { const n = vu(); p[k] = d.subarray(i, i + n); i += n; }
      else if (ft === 2) { p[k] = d.readFloatLE(i); i += 4; }
      else { p[k] = d.readUInt32LE(i); i += 4; }
    }
    objs.push({ t, p, off });
  }
  return objs;
}

function artboards(objs) {
  const comps = new Set(FORMAT.components);
  const out = [];
  let cur = null;
  for (const o of objs) {
    if (o.t === FORMAT.types.ArtboardBase) {
      cur = { name: o.p[4] ? o.p[4].toString() : '', objs: [o], comps: [o] };
      out.push(cur);
    } else if (cur) {
      cur.objs.push(o);
      if (comps.has(o.t)) cur.comps.push(o);
    }
  }
  return out;
}

// ------------------------------------------------------------ marking
function markCursors(buf, opts) {
  const T = FORMAT.types;
  const objs = readRiv(buf);
  const abs = artboards(objs);
  const ab = abs.find((a) => a.name === 'cursor');
  if (!ab) throw new Error('no cursor artboard');
  const { comps, objs: all } = ab;
  const shapeOf = (i) => { while (i != null && comps[i] && comps[i].t !== T.ShapeBase) i = comps[i].p[5]; return i; };
  const feather = comps.find((o) => o.t === T.FeatherBase);
  if (!feather) throw new Error('cursor arrow not found');
  const arrow = shapeOf(feather.p[5]);
  const variant = (rgb) => PALETTE[rgb] || 6;
  const marker = (ci, argb) => {
    const a = argb >>> 24, rgb = argb & 0xffffff;
    const paint = comps[comps[ci].p[5]];
    const onArrow = shapeOf(paint.p[5]) === arrow;
    const isStroke = paint.t === T.StrokeBase;
    const hasFeather = comps.some((o) => o.t === T.FeatherBase && o.p[5] === comps[ci].p[5]);
    let g, b = 0;
    if (onArrow && hasFeather) return ((1 << 16) | (252 << 8)) >>> 0; // shadow: transparent, Monika glows instead
    if (onArrow && isStroke) g = 253;
    else if (onArrow) { g = 254; b = variant(rgb); }
    else { g = isStroke ? 249 : 250; b = variant(rgb); }
    return ((a << 24) | (1 << 16) | (g << 8) | b) >>> 0;
  };
  let n = 0;
  comps.forEach((o, i) => {
    if (o.t !== T.SolidColorBase) return;
    if (!(37 in o.off)) throw new Error(`cursor colour ${i} has no stored value`);
    buf.writeUInt32LE(marker(i, o.p[37]), o.off[37]); n++;
  });
  let target = null, prop = null;
  for (const o of all) {
    if (o.t === T.KeyedObjectBase) { target = o.p[51]; prop = null; }
    else if (o.t === T.KeyedPropertyBase) prop = o.p[53];
    else if (o.t === T.KeyFrameColorBase && prop === 37 && target != null && 88 in o.off) {
      buf.writeUInt32LE(marker(target, o.p[88]), o.off[88]); n++;
    }
  }
  for (const [name, list] of Object.entries(opts.bubbles || {})) {
    const b = abs.find((a) => a.name === name);
    for (const i of list) {
      const o = b && b.comps[i];
      if (!o || o.t !== T.SolidColorBase) throw new Error(`bubble ${name}#${i} is not a colour`);
      const v = o.p[37];
      buf.writeUInt32LE(((v & 0xff000000) | (1 << 16) | (248 << 8) | variant(v & 0xffffff)) >>> 0, o.off[37]); n++;
    }
  }
  return n;
}

// recolour every fill and colour keyframe of one RGB to another, keeping alpha
function recolor(buf, map) {
  const T = FORMAT.types;
  const swap = Object.fromEntries(Object.entries(map).map(([a, b]) => [parseInt(a, 16), parseInt(b, 16)]));
  let n = 0;
  for (const o of readRiv(buf)) {
    const key = o.t === T.SolidColorBase ? 37 : o.t === T.KeyFrameColorBase ? 88 : null;
    if (key == null || !(key in o.off)) continue;
    const v = o.p[key], to = swap[v & 0xffffff];
    if (to === undefined) continue;
    buf.writeUInt32LE(((v & 0xff000000) | to) >>> 0, o.off[key]); n++;
  }
  return n;
}

// ------------------------------------------------------------ main
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  let html = '';
  try { html = (await get(SITE + '/', { html: true })).toString(); } catch (e) { console.warn('Could not read the home page:', e.message); }
  const known = { preloader: 'B_5LkbCw' };
  const bundle = {};
  for (const [name, opts] of Object.entries(RIVS)) {
    const m = html.match(new RegExp(`/_astro/${name}\\.[\\w-]+\\.riv`));
    const url = SITE + (m ? m[0] : `/_astro/${name}.${known[name]}.riv`);
    const buf = await get(url);
    fs.writeFileSync(path.join(OUT, `${name}.original.riv`), buf);
    const n = markCursors(buf, opts);
    if (opts.recolor) console.log(`${name}.riv  ${recolor(buf, opts.recolor)} colours recoloured`);
    fs.writeFileSync(path.join(OUT, `${name}.riv`), buf);
    bundle[name] = buf.toString('base64');
    console.log(`${name}.riv  ${buf.length} bytes, ${n} cursor colours marked`);
  }
  // also as a script, so the demo works when index.html is opened straight from disk
  fs.writeFileSync(path.join(OUT, 'rivs.js'), `window.SLATE_RIVS = ${JSON.stringify(bundle)};\n`);
  for (const [file, url] of MEDIA) {
    const buf = await get(url);
    fs.writeFileSync(path.join(OUT, file), buf);
    console.log(`${file}  ${buf.length} bytes`);
  }
  console.log(`Done: ${path.relative(process.cwd(), OUT) || OUT}`);
})().catch((e) => {
  console.error('Failed:', e.message);
  process.exit(1);
});
