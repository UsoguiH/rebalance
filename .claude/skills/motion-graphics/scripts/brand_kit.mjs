#!/usr/bin/env node
// Build a brand kit from the product's real website:
//   logos (inline SVG baked with colors, <img> logos, transparent element screenshot, favicons, og:image),
//   brand colors + fonts from computed styles, page copy for the script,
//   screenshots (desktop / tablet / mobile, hero + full page + sections), optional scroll recording,
//   and preview.png so the kit can be checked by eye.
//
// Usage: node brand_kit.mjs --url https://example.com --project ./my-video [--name "Example"] [--pages "/pricing,/features"] [--record]
import fs from "node:fs";
import path from "node:path";
import { args, launch } from "./_browser.mjs";

const a = args();
if (!a.url || !a.project) {
  console.error("usage: node brand_kit.mjs --url URL --project DIR [--name NAME] [--pages /a,/b] [--record]");
  process.exit(1);
}
const project = path.resolve(a.project);
const pub = path.join(project, "public");
const brandDir = path.join(pub, "brand");
const shotDir = path.join(pub, "shots");
fs.mkdirSync(brandDir, { recursive: true });
fs.mkdirSync(shotDir, { recursive: true });
const rel = (p) => path.relative(pub, p).split(path.sep).join("/");
const url = /^https?:/.test(a.url) ? a.url : `https://${a.url}`;

const DISMISS = /^(accept( all)?( cookies)?|allow( all)?|agree|i agree|got it|ok(ay)?|continue|close|dismiss|قبول|موافق|أوافق|حسنا)$/i;

async function settle(page) {
  try { await page.waitForLoadState("networkidle", { timeout: 15000 }); } catch { /* busy sites never go idle */ }
  await page.evaluate((re) => {
    const rx = new RegExp(re.source, re.flags);
    for (const b of document.querySelectorAll("button, a[role=button], [role=button]")) {
      const t = (b.innerText || "").trim();
      if (t && t.length < 30 && rx.test(t)) { try { b.click(); } catch {} }
    }
  }, { source: DISMISS.source, flags: DISMISS.flags });
  await page.waitForTimeout(800);
}

async function lazyScroll(page) {
  await page.evaluate(async () => {
    const h = Math.min(document.body.scrollHeight, 20000);
    for (let y = 0; y < h; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); }
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 600));
  });
}

const browser = await launch(project);
const kit = { url, screenshots: [], logos: [], icons: [], colors: {}, fonts: {}, content: {} };

// ---------------------------------------------------------------- desktop
const desk = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, locale: "en-US" });
const page = await desk.newPage();
await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
await settle(page);

const info = await page.evaluate(() => {
  const vis = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 4 && r.height > 4 && s.visibility !== "hidden" && s.display !== "none" && +s.opacity > 0.05; };
  const abs = (u) => { try { return new URL(u, location.href).href; } catch { return null; } };
  const home = (href) => { try { const u = new URL(href, location.href); return u.origin === location.origin && (u.pathname === "/" || u.pathname === "" || /^\/[a-z]{2}(-[a-z]{2})?\/?$/i.test(u.pathname)); } catch { return false; } };

  // --- logo candidates
  const cands = [];
  const seen = new Set();
  const push = (el, score, why) => {
    if (!el || seen.has(el) || !vis(el)) return;
    seen.add(el);
    const r = el.getBoundingClientRect();
    if (r.top > 260 && score < 5) return;
    if (el.tagName.toLowerCase() === "svg") {
      const clone = el.cloneNode(true);
      const src = [el, ...el.querySelectorAll("*")];
      const dst = [clone, ...clone.querySelectorAll("*")];
      src.forEach((s, i) => {
        const cs = getComputedStyle(s);
        const d = dst[i];
        if (!d.setAttribute) return;
        if (cs.fill && cs.fill !== "none" && !/url\(/.test(cs.fill)) d.setAttribute("fill", cs.fill);
        if (cs.stroke && cs.stroke !== "none" && !/url\(/.test(cs.stroke)) d.setAttribute("stroke", cs.stroke);
        if (cs.opacity !== "1") d.setAttribute("opacity", cs.opacity);
      });
      clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      if (!clone.getAttribute("viewBox")) clone.setAttribute("viewBox", `0 0 ${r.width} ${r.height}`);
      clone.setAttribute("width", String(Math.round(r.width)));
      clone.setAttribute("height", String(Math.round(r.height)));
      // <use href="#id"> references must be inlined to survive outside the page
      clone.querySelectorAll("use").forEach((u) => {
        const id = (u.getAttribute("href") || u.getAttribute("xlink:href") || "").replace(/^#/, "");
        const ref = id && document.getElementById(id);
        if (ref) { const g = document.createElementNS("http://www.w3.org/2000/svg", "g"); g.innerHTML = ref.innerHTML; u.replaceWith(g); }
      });
      cands.push({ kind: "svg", svg: clone.outerHTML, w: r.width, h: r.height, x: r.left, y: r.top, score, why });
    } else if (el.tagName.toLowerCase() === "img") {
      cands.push({ kind: "img", src: abs(el.currentSrc || el.src), w: r.width, h: r.height, x: r.left, y: r.top, score, why, alt: el.alt });
    }
  };
  const re = /logo|brand|wordmark/i;
  document.querySelectorAll("header a, nav a, [class*=header] a, [class*=Header] a, [class*=nav] a").forEach((link) => {
    if (!home(link.getAttribute("href") || "")) return;
    link.querySelectorAll("svg, img").forEach((el) => push(el, 10 + (re.test(link.outerHTML.slice(0, 400)) ? 3 : 0), "home link in header"));
  });
  document.querySelectorAll("svg, img").forEach((el) => {
    const hay = [el.getAttribute("class"), el.id, el.getAttribute("alt"), el.getAttribute("aria-label"), el.getAttribute("src"), el.parentElement?.getAttribute("class"), el.parentElement?.getAttribute("aria-label")].join(" ");
    if (re.test(hay)) push(el, 6, "logo-ish attribute");
  });
  // --- icons & social images
  const icons = [...document.querySelectorAll("link[rel*=icon], link[rel=apple-touch-icon], link[rel=mask-icon]")]
    .map((l) => ({ href: abs(l.href), rel: l.rel, sizes: l.getAttribute("sizes") || "" }));
  const meta = (n) => document.querySelector(`meta[property="${n}"], meta[name="${n}"]`)?.content || null;
  const manifest = document.querySelector("link[rel=manifest]")?.href || null;

  // --- colors
  const parse = (c) => { const m = c && c.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/); return m ? { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] } : null; };
  const hex = ({ r, g, b }) => "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
  const sat = ({ r, g, b }) => { const mx = Math.max(r, g, b), mn = Math.min(r, g, b); return mx === 0 ? 0 : (mx - mn) / mx; };
  const tally = {};
  const add = (c, w) => { const p = parse(c); if (!p || p.a < 0.5) return; const h = hex(p); tally[h] = tally[h] || { w: 0, sat: sat(p) }; tally[h].w += w; };
  document.querySelectorAll("button, a, [role=button], [class*=btn], [class*=button], [class*=Button]").forEach((el) => {
    if (!vis(el)) return;
    const r = el.getBoundingClientRect();
    if (r.top > 2500) return;
    const cs = getComputedStyle(el);
    add(cs.backgroundColor, r.width * r.height);
    add(cs.color, 200);
  });
  const bodyBg = parse(getComputedStyle(document.body).backgroundColor);
  const htmlBg = parse(getComputedStyle(document.documentElement).backgroundColor);
  const bg = bodyBg && bodyBg.a > 0.5 ? hex(bodyBg) : htmlBg && htmlBg.a > 0.5 ? hex(htmlBg) : "#ffffff";
  const h1 = document.querySelector("h1");
  const fg = h1 ? hex(parse(getComputedStyle(h1).color) || { r: 17, g: 17, b: 17 }) : "#111111";
  let accentCands = Object.entries(tally).filter(([, v]) => v.sat > 0.28).sort((x, y) => y[1].w - x[1].w).map(([k]) => k);
  if (accentCands.length < 2) {
    // Neutral buttons: look at every visible element (text, fills, borders, gradients' solid parts)
    const all = {};
    const add2 = (c, w) => { const p = parse(c); if (!p || p.a < 0.5 || sat(p) < 0.35) return; const lum = (p.r + p.g + p.b) / 3; if (lum < 30 || lum > 245) return; const h = hex(p); all[h] = (all[h] || 0) + w; };
    for (const el of document.querySelectorAll("body *")) {
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2 || r.top > 4000) continue;
      const cs = getComputedStyle(el);
      const area = Math.min(r.width * r.height, 60000);
      add2(cs.backgroundColor, area);
      add2(cs.color, Math.min(area, 3000));
      add2(cs.borderTopColor, r.width * 2);
      if (el instanceof SVGElement) add2(cs.fill, area);
    }
    accentCands = [...accentCands, ...Object.entries(all).sort((x, y) => y[1] - x[1]).map(([k]) => k)].slice(0, 8);
  }

  // --- fonts
  const fam = (el) => el ? getComputedStyle(el).fontFamily.split(",")[0].replace(/["']/g, "").trim() : null;

  // --- copy
  const txt = (sel, n) => [...document.querySelectorAll(sel)].filter(vis).map((e) => e.innerText.trim().replace(/\s+/g, " ")).filter(Boolean).slice(0, n);
  return {
    cands, icons, manifest,
    og: { image: abs(meta("og:image") || meta("twitter:image") || ""), title: meta("og:title"), description: meta("og:description") || meta("description"), site: meta("og:site_name") },
    themeColor: meta("theme-color"),
    colors: { bg, fg, accentCandidates: accentCands.slice(0, 6) },
    fonts: { heading: fam(h1 || document.querySelector("h2")), body: fam(document.querySelector("p") || document.body), button: fam(document.querySelector("button, a[class*=button]")) },
    content: { title: document.title, h1: txt("h1", 3), h2: txt("h2", 14), h3: txt("h3", 18), ctas: txt("a[class*=button], a[class*=btn], button", 12).filter((t) => t.length < 40),
      nav: txt("nav a", 16).filter((t) => t.length < 30), paragraphs: txt("p", 40).filter((t) => t.length > 60).slice(0, 10), lang: document.documentElement.lang || null },
  };
});

// Name
kit.name = a.name || info.og.site || (info.content.title || "").split(/[|\-–—:·]/)[0].trim() || new URL(url).hostname.replace(/^www\./, "");
kit.content = info.content;
kit.og = info.og;
kit.fonts = info.fonts;
kit.colors = {
  bg: info.colors.bg, fg: info.colors.fg,
  accent: info.colors.accentCandidates[0] || info.themeColor || "#3b82f6",
  accentCandidates: info.colors.accentCandidates, themeColor: info.themeColor,
};

// Save logo candidates
const logoHandles = [];
info.cands.sort((x, y) => y.score - x.score || x.y - y.y);
let li = 0;
for (const c of info.cands.slice(0, 8)) {
  li++;
  if (c.kind === "svg") {
    const f = path.join(brandDir, `logo-${li}.svg`);
    fs.writeFileSync(f, c.svg);
    kit.logos.push({ file: rel(f), kind: "svg", score: c.score, why: c.why, w: Math.round(c.w), h: Math.round(c.h) });
  } else if (c.src) {
    try {
      const r = await desk.request.get(c.src, { timeout: 20000 });
      if (r.ok()) {
        const ext = (r.headers()["content-type"] || "").includes("svg") ? "svg" : (c.src.split("?")[0].split(".").pop() || "png").slice(0, 4);
        const f = path.join(brandDir, `logo-${li}.${ext}`);
        fs.writeFileSync(f, await r.body());
        kit.logos.push({ file: rel(f), kind: "img", score: c.score, why: c.why, alt: c.alt, w: Math.round(c.w), h: Math.round(c.h) });
      }
    } catch { /* skip */ }
  }
}
// Transparent screenshot of the best on-page logo: always matches what visitors see
const best = info.cands[0];
if (best) {
  try {
    const clip = { x: Math.max(0, best.x - 2), y: Math.max(0, best.y - 2), width: best.w + 4, height: best.h + 4 };
    const f = path.join(brandDir, "logo-shot.png");
    await page.screenshot({ path: f, clip, omitBackground: true });
    kit.logos.push({ file: rel(f), kind: "screenshot", score: best.score - 1, why: "screenshot of the top candidate (keeps page background if not transparent)" });
  } catch { /* skip */ }
}
// Icons: apple-touch-icon / largest favicon / manifest icons / og:image
const iconUrls = [...info.icons.map((i) => i.href)];
if (info.manifest) {
  try {
    const m = await (await desk.request.get(info.manifest)).json();
    for (const ic of m.icons || []) iconUrls.push(new URL(ic.src, info.manifest).href);
  } catch { /* skip */ }
}
let ii = 0;
for (const u of [...new Set(iconUrls)].slice(0, 8)) {
  try {
    const r = await desk.request.get(u, { timeout: 15000 });
    if (!r.ok()) continue;
    const ct = r.headers()["content-type"] || "";
    const ext = ct.includes("svg") ? "svg" : ct.includes("png") ? "png" : ct.includes("icon") ? "ico" : (u.split("?")[0].split(".").pop() || "png").slice(0, 4);
    const f = path.join(brandDir, `icon-${++ii}.${ext}`);
    fs.writeFileSync(f, await r.body());
    kit.icons.push({ file: rel(f), source: u });
  } catch { /* skip */ }
}
if (info.og.image) {
  try {
    const r = await desk.request.get(info.og.image, { timeout: 20000 });
    if (r.ok()) {
      const f = path.join(brandDir, "og-image." + ((r.headers()["content-type"] || "").includes("png") ? "png" : "jpg"));
      fs.writeFileSync(f, await r.body());
      kit.ogImage = rel(f);
    }
  } catch { /* skip */ }
}

// Desktop screenshots
const shot = async (pg, name, { meta, ...opts } = {}) => {
  const f = path.join(shotDir, name);
  await pg.screenshot({ path: f, ...opts, ...(name.endsWith(".jpg") ? { type: "jpeg", quality: 88 } : {}) });
  kit.screenshots.push({ file: rel(f), ...meta });
  return f;
};
// Full-page captures are for scrolling inside device screens. Very tall, very sharp images (50+ MP)
// fail to decode in the renderer, so cap the height and keep them around 10-15 MP.
const fullShot = async (pg, name, meta, maxCss, scale) => {
  const h = await pg.evaluate(() => document.documentElement.scrollHeight);
  const vw = pg.viewportSize().width;
  return shot(pg, name, { fullPage: true, clip: { x: 0, y: 0, width: vw, height: Math.min(h, maxCss) }, scale, meta });
};
await shot(page, "desktop-hero.png", { meta: { view: "desktop", part: "hero" } });
await lazyScroll(page);
await fullShot(page, "desktop-full.jpg", { view: "desktop", part: "full page" }, 9000, "css");
// Section screenshots (good material for floating UI cards)
const boxes = await page.evaluate(() => {
  const out = [];
  const all = [...document.querySelectorAll("section, main > div, main > section, [class*=section], [class*=Section], [class*=feature], [class*=Feature]")];
  for (const el of all) {
    const r = el.getBoundingClientRect();
    const y = r.top + window.scrollY;
    if (r.width < 900 || r.height < 280 || r.height > 1500 || y < 120) continue;
    if (out.some((o) => Math.abs(o.y - y) < 150)) continue;
    out.push({ x: r.left, y, width: r.width, height: r.height });
  }
  return out.sort((p, q) => p.y - q.y).slice(0, 10);
});
let si = 0;
for (const b of boxes) {
  try {
    await page.evaluate((y) => window.scrollTo(0, y - 40), b.y);
    await page.waitForTimeout(250);
    await shot(page, `section-${String(++si).padStart(2, "0")}.jpg`, { fullPage: true, clip: { x: b.x, y: b.y, width: b.width, height: b.height }, meta: { view: "desktop", part: "section" } });
  } catch { /* skip */ }
}
// Extra pages
for (const p of (a.pages && a.pages !== true ? String(a.pages).split(",") : [])) {
  try {
    await page.goto(new URL(p.trim(), url).href, { waitUntil: "domcontentloaded", timeout: 45000 });
    await settle(page);
    const slug = p.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "page";
    await shot(page, `desktop-${slug}.png`, { meta: { view: "desktop", part: p } });
  } catch (e) { console.warn("page failed", p, e.message); }
}
await desk.close();

// ---------------------------------------------------------------- mobile + tablet
for (const [view, vp, dsf, ua] of [
  ["mobile", { width: 390, height: 844 }, 3, "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"],
  ["tablet", { width: 820, height: 1180 }, 2, "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"],
]) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: dsf, isMobile: true, hasTouch: true, userAgent: ua, locale: "en-US" });
  const pg = await ctx.newPage();
  try {
    await pg.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await settle(pg);
    await shot(pg, `${view}-hero.png`, { meta: { view, part: "hero" } });
    await lazyScroll(pg);
    await fullShot(pg, `${view}-full.jpg`, { view, part: "full page" }, view === "mobile" ? 4000 : 6000, view === "mobile" ? "device" : "css");
  } catch (e) { console.warn(view, "failed:", e.message); }
  await ctx.close();
}

// ---------------------------------------------------------------- optional scroll recording (real footage)
if (a.record) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, recordVideo: { dir: shotDir, size: { width: 1440, height: 900 } } });
  const pg = await ctx.newPage();
  await pg.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await settle(pg);
  await pg.evaluate(async () => {
    const h = Math.min(document.body.scrollHeight - innerHeight, 6000);
    const t0 = performance.now();
    await new Promise((res) => {
      const step = (t) => { const p = Math.min(1, (t - t0) / 9000); window.scrollTo(0, h * (0.5 - Math.cos(Math.PI * p) / 2)); p < 1 ? requestAnimationFrame(step) : res(); };
      requestAnimationFrame(step);
    });
  });
  await pg.waitForTimeout(500);
  const vpath = await pg.video().path();
  await ctx.close();
  const f = path.join(shotDir, "desktop-scroll.webm");
  fs.renameSync(vpath, f);
  kit.screenshots.push({ file: rel(f), view: "desktop", part: "scroll recording (webm)" });
}

// ---------------------------------------------------------------- preview sheet
kit.logo = kit.logos.find((l) => l.kind === "svg")?.file || kit.logos[0]?.file || null;
const esc = (s) => String(s ?? "").replace(/</g, "&lt;");
const fileUrl = (r) => "file://" + path.join(pub, r);
const html = `<!doctype html><meta charset=utf-8><style>
body{margin:0;font:14px system-ui;background:#fafafa;color:#111;padding:24px;width:1552px}
h2{margin:18px 0 8px;font-size:16px} .row{display:flex;gap:12px;flex-wrap:wrap}
.tile{width:230px;border:1px solid #ddd;border-radius:10px;overflow:hidden;background:#fff}
.tile .a,.tile .b{height:90px;display:flex;align-items:center;justify-content:center;padding:8px}
.tile .b{background:#111}.tile img{max-width:90%;max-height:70px}.tile .c{padding:6px 8px;font-size:11px;color:#555;border-top:1px solid #eee}
.sw{width:120px;height:70px;border-radius:8px;display:flex;align-items:flex-end;padding:6px;font:12px monospace;box-shadow:inset 0 0 0 1px #0002}
.shot{height:180px;border:1px solid #ddd;border-radius:6px}
</style>
<h1 style="margin:0">${esc(kit.name)} · brand kit</h1><div>${esc(url)}</div>
<h2>Logo candidates (light / dark)</h2><div class=row>${kit.logos.map((l, i) => `<div class=tile><div class=a><img src="${fileUrl(l.file)}"></div><div class=b><img src="${fileUrl(l.file)}"></div><div class=c>#${i + 1} ${esc(l.file)}<br>${esc(l.kind)} · score ${l.score} · ${esc(l.why)}</div></div>`).join("")}</div>
<h2>Icons</h2><div class=row>${kit.icons.map((l) => `<div class=tile><div class=a><img src="${fileUrl(l.file)}"></div><div class=c>${esc(l.file)}</div></div>`).join("")}${kit.ogImage ? `<img class=shot src="${fileUrl(kit.ogImage)}">` : ""}</div>
<h2>Colors</h2><div class=row>${[["bg", kit.colors.bg], ["fg", kit.colors.fg], ...kit.colors.accentCandidates.map((c, i) => ["accent" + (i || ""), c]), ["theme", kit.colors.themeColor]].filter((x) => x[1]).map(([n, c]) => `<div class=sw style="background:${c};color:${/^#(f|e|d)/i.test(c) ? "#000" : "#fff"}">${n}<br>${c}</div>`).join("")}</div>
<h2>Fonts</h2><div>heading: <b>${esc(kit.fonts.heading)}</b> · body: <b>${esc(kit.fonts.body)}</b> · button: <b>${esc(kit.fonts.button)}</b></div>
<h2>Screenshots</h2><div class=row>${kit.screenshots.filter((s) => !s.file.endsWith(".webm")).map((s) => `<div><img class=shot src="${fileUrl(s.file)}" style="${s.part === "full page" ? "height:180px;width:120px;object-fit:cover;object-position:top" : ""}"><div style="font-size:11px">${esc(s.file)}</div></div>`).join("")}</div>
<h2>Copy</h2><div style="font-size:12px;white-space:pre-wrap">${esc(JSON.stringify({ h1: kit.content.h1, h2: kit.content.h2.slice(0, 8), ctas: kit.content.ctas }, null, 1))}</div>`;
const htmlPath = path.join(brandDir, "preview.html");
fs.writeFileSync(htmlPath, html);
const pv = await browser.newPage({ viewport: { width: 1600, height: 900 } });
await pv.goto("file://" + htmlPath);
await pv.waitForTimeout(500);
await pv.screenshot({ path: path.join(brandDir, "preview.png"), fullPage: true });
await browser.close();

fs.writeFileSync(path.join(project, "brand.json"), JSON.stringify(kit, null, 2));
console.log(`Brand kit for ${kit.name}: ${kit.logos.length} logo candidates, ${kit.icons.length} icons, ${kit.screenshots.length} screenshots`);
console.log(`colors bg ${kit.colors.bg} fg ${kit.colors.fg} accent ${kit.colors.accent} (candidates ${kit.colors.accentCandidates.join(" ")})`);
console.log(`fonts heading ${kit.fonts.heading} / body ${kit.fonts.body}`);
console.log(`Look at ${path.join(brandDir, "preview.png")} to pick the logo and confirm colors. Details: ${path.join(project, "brand.json")}`);
