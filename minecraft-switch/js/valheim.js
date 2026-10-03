/* Blockcraft — Chapter I: The Meadows of Skarnholm  (js/valheim.js)
 * Day/night cycle and the shared World API (time, night, item drops), meadow creatures
 * (Deer, Boar, Greyling), Forest Troll loot, the Stag Altar and the Stormhorn boss,
 * Korra the raven guide, rune stones, quest tracker and advancement toasts.
 * Valheim-STYLE progression with our own names and text. Everything is drawn in code. */
(() => {
'use strict';
const R = Math.random;
const hasInv = () => typeof Inv !== 'undefined' && Inv && typeof Inv.add === 'function';
const itemDef = id => { try { return (typeof ITEMS !== 'undefined' && ITEMS && ITEMS[id]) || null; } catch (e) { return null; } };
const NAMES = { raw_meat: 'Raw Meat', deer_hide: 'Deer Hide', leather_scraps: 'Leather Scraps', resin: 'Resin', troll_hide: 'Troll Hide',
  deer_trophy: 'Deer Trophy', boar_trophy: 'Boar Trophy', greyling_trophy: 'Greyling Trophy', troll_trophy: 'Troll Trophy',
  stormhorn_trophy: 'Stormhorn Trophy', hard_antler: 'Hard Antler', stone: 'Stone', flint: 'Flint', wood: 'Wood' };
const itemName = id => { const d = itemDef(id); return (d && d.name) || NAMES[id] || String(id).replace(/_/g, ' '); };
const bag = {};                                   // fallback inventory when items.js is missing
function countItem(id) { if (hasInv()) { try { return Inv.count(id) | 0; } catch (e) { return 0; } } return bag[id] | 0; }
function removeItem(id, n) { if (hasInv()) { try { return !!Inv.remove(id, n); } catch (e) { return false; } }
  if ((bag[id] | 0) < n) return false; bag[id] -= n; return true; }

// ---------------------------------------------------------------- small scheduler (game time, not wall time)
const timers = [];
const later = (s, fn) => timers.push({ t: s, fn });
function runTimers(dt) { for (let i = timers.length - 1; i >= 0; i--) { const q = timers[i]; q.t -= dt;
  if (q.t <= 0) { timers.splice(i, 1); try { q.fn(); } catch (e) { console.error(e); } } } }

// ---------------------------------------------------------------- sounds (synthesized, like the rest of the game)
const VS = {
  pop() { if (!AC) return; const t = AC.currentTime, f = 520 + R() * 480; thump(t, f, f * 1.9, .09, .16, 'sine'); },
  deer() { if (!AC) return; const t = AC.currentTime; thump(t, 950, 480, .16, .16, 'triangle'); noiseSweep(t, .12, 3200, 2000, .07, 2, .005); },
  boar() { if (!AC) return; const t = AC.currentTime; thump(t, 190, 85, .32, .32, 'sawtooth'); noiseSweep(t, .25, 520, 240, .18, 2, .01); },
  grey() { if (!AC) return; const t = AC.currentTime; for (let i = 0; i < 4; i++) click(t + i * .055, 1500 + R() * 1000, .045); thump(t, 520, 300, .12, .1, 'square'); },
  toss() { if (!AC) return; const t = AC.currentTime; noiseSweep(t, .22, 700, 2600, .1, 2, .02); },
  pebble() { if (!AC) return; const t = AC.currentTime; noiseSweep(t, .1, 2600, 1500, .18, 2, .003); click(t, 1900, .04); },
  poof() { if (!AC) return; const t = AC.currentTime; noiseSweep(t, .4, 2600, 500, .2, .8, .005); },
  thunder(k = 1) { if (!AC) return; const t = AC.currentTime; noiseSweep(t, .25, 4200, 1500, .45 * k, .7, .003, 'highpass');
    noiseSweep(t + .04, 1.9, 900, 50, .9 * k, .4, .02, 'lowpass'); thump(t, 72, 28, 1.8, .8 * k); noiseSweep(t + .6, 1.6, 320, 40, .45 * k, .5, .3, 'lowpass'); },
  bellow() { if (!AC) return; const t = AC.currentTime; thump(t, 160, 70, 1.5, .45, 'sawtooth'); thump(t, 80, 38, 1.5, .45, 'square'); noiseSweep(t, 1.3, 700, 200, .28, 1.5, .2); },
  stagHurt() { if (!AC) return; const t = AC.currentTime; thump(t, 140, 70, .35, .4, 'sawtooth'); noiseSweep(t, .2, 1600, 700, .2, 1, .005); click(t, 3000, .04); },
  stomp() { if (!AC) return; const t = AC.currentTime; thump(t, 85, 24, 1, 1); noiseSweep(t, .9, 700, 60, .6, .6, .005, 'lowpass'); },
  zap() { if (!AC) return; const t = AC.currentTime; for (let i = 0; i < 7; i++) click(t + i * .03, 2400 + R() * 3200, .03); },
  rumble() { if (!AC) return; const t = AC.currentTime; noiseSweep(t, .9, 160, 700, .35, 1, .5, 'lowpass'); },
  caw() { if (!AC) return; const t = AC.currentTime; for (const d of [0, .27]) { thump(t + d, 840, 540, .2, .11, 'sawtooth'); noiseSweep(t + d, .2, 1900, 1100, .12, 3, .01); } },
  chime(ch) { if (!AC) return; const t = AC.currentTime; const n = ch ? [523.3, 659.3, 784, 1046.5] : [784, 987.8, 1174.7];
    n.forEach((f, i) => note(t + i * .11, f, .07)); },
  rune() { if (!AC) return; const t = AC.currentTime; thump(t, 110, 104, 1.6, .2, 'sine'); note(t, 523.3, .05); note(t + .18, 784, .045); },
  page() { if (!AC) return; const t = AC.currentTime; click(t, 1300, .035); },
};

// ---------------------------------------------------------------- pixel helpers
const rr = (g, c, x, y, w = 1, h = 1) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
const dots = (g, c, p) => { g.fillStyle = c; for (let i = 0; i < p.length; i += 2) g.fillRect(p[i], p[i + 1], 1, 1); };
function ln(g, c, x0, y0, x1, y1, w = 1) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1; g.fillStyle = c;
  for (let i = 0; i <= n; i++) g.fillRect(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), w, w); }
function noiseFill(g, x0, y0, w, h, base, amt = .22) { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { g.fillStyle = shade(base, (R() - .5) * amt); g.fillRect(x, y, 1, 1); } }
function bevel(g, w, h, base) { g.fillStyle = shade(base, .2); g.fillRect(0, 0, w, 1); g.fillRect(0, 0, 1, h);
  g.fillStyle = shade(base, -.3); g.fillRect(0, h - 1, w, 1); g.fillRect(w - 1, 0, 1, h); }
const TEXC = {};
// a pixel-shaded plate: noisy fill, light top-left edge, dark bottom-right edge, then decoration
function tx(key, w, h, base, deco, amt) { return TEXC[key] || (TEXC[key] = charTex(w, h, g => { noiseFill(g, 0, 0, w, h, base, amt); bevel(g, w, h, base); if (deco) deco(g, w, h); })); }
const GEO = {};
const boxGeo = (w, h, d) => { const k = w + ',' + h + ',' + d; return GEO[k] || (GEO[k] = new THREE.BoxGeometry(w, h, d)); };
const UNIT = new THREE.BoxGeometry(1, 1, 1);
const GLOWM = {};
const glowMat = hex => GLOWM[hex] || (GLOWM[hex] = new THREE.MeshBasicMaterial({ color: hex, fog: false }));
let haloTex = null;
function halo(hex, size, op = .55) {
  if (!haloTex) { haloTex = new THREE.CanvasTexture(pixCanvas(32, 32, g => { const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(.35, 'rgba(255,255,255,.3)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); })); }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, color: hex, blending: THREE.AdditiveBlending, transparent: true, opacity: op, depthWrite: false, fog: false }));
  s.scale.set(size, size, 1); return s;
}
function surfaceAt(x, z) { const xi = Math.floor(x), zi = Math.floor(z);                 // top ground, ignoring tree canopies
  for (let y = WY - 1; y >= 0; y--) { const t = get(xi, y, zi); if (BLOCK[t].solid && t !== LEAVES && t !== LOG) return y + 1; } return 0; }
function groundAt(x, z, fromY) { const xi = Math.floor(x), zi = Math.floor(z);
  for (let y = Math.min(WY - 1, Math.floor(fromY)); y >= 0; y--) if (BLOCK[get(xi, y, zi)].solid) return y + 1; return 0; }
function compass(dx, dz) { const a = Math.atan2(dx, -dz) * 180 / Math.PI;
  return ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'][((Math.round(a / 45) % 8) + 8) % 8]; }

// ---------------------------------------------------------------- 16x16 icons (fallbacks when items.js has none)
function head(g, out, base, x, y, w, h) { rr(g, out, x, y, w, h); rr(g, base, x + 1, y + 1, w - 2, h - 2); rr(g, shade(base, .18), x + 1, y + 1, w - 2, 1); }
const ICON = {
  raw_meat(g) { rr(g, '#3d0b0b', 2, 4, 12, 9); rr(g, '#a3201e', 3, 5, 10, 7); rr(g, '#c8423c', 4, 5, 7, 3); dots(g, '#e8807a', [5, 6, 6, 6, 9, 6, 8, 7, 4, 9, 7, 10, 10, 9]);
    rr(g, '#f2e6d6', 3, 11, 10, 1); rr(g, '#f2e6d6', 12, 5, 1, 6); },
  deer_hide(g) { rr(g, '#4a2f17', 2, 3, 12, 11); for (const [x, y] of [[1, 2], [13, 2], [1, 12], [13, 12]]) rr(g, '#4a2f17', x, y, 2, 2);
    rr(g, '#a8743f', 3, 4, 10, 9); dots(g, '#e2c08a', [5, 6, 8, 5, 10, 8, 6, 10, 9, 11]); rr(g, '#c89a62', 3, 4, 10, 1); rr(g, '#7e5530', 3, 12, 10, 1); },
  leather_scraps(g) { rr(g, '#3a2412', 2, 3, 7, 4); rr(g, '#8a5a30', 3, 4, 5, 2); rr(g, '#3a2412', 6, 7, 8, 4); rr(g, '#a06c3c', 7, 8, 6, 2); rr(g, '#3a2412', 3, 11, 6, 3); rr(g, '#7a4c26', 4, 12, 4, 1); },
  resin(g) { rr(g, '#5a2a00', 5, 3, 6, 10); rr(g, '#5a2a00', 4, 5, 8, 6); rr(g, '#c86a0a', 5, 4, 6, 8); rr(g, '#c86a0a', 5, 5, 6, 5); rr(g, '#f0a030', 6, 5, 3, 3); rr(g, '#ffe08a', 6, 5, 1, 2); rr(g, '#c86a0a', 8, 12, 1, 2); },
  troll_hide(g) { rr(g, '#1b2433', 2, 3, 12, 11); for (const [x, y] of [[1, 2], [13, 2], [1, 12], [13, 12]]) rr(g, '#1b2433', x, y, 2, 2);
    rr(g, '#5b7ba3', 3, 4, 10, 9); dots(g, '#7b97ba', [5, 6, 6, 6, 9, 5, 10, 9, 6, 10, 7, 10]); rr(g, '#2c3d55', 3, 12, 10, 1); },
  hard_antler(g) { ln(g, '#4a4436', 3, 14, 11, 4, 2); ln(g, '#4a4436', 6, 11, 4, 6, 2); ln(g, '#4a4436', 9, 7, 13, 7, 2);
    ln(g, '#e6dcc4', 3, 13, 11, 3); ln(g, '#e6dcc4', 6, 10, 4, 5); ln(g, '#e6dcc4', 9, 6, 13, 6); dots(g, '#7ff6ff', [11, 2, 12, 2, 4, 4, 14, 6]); },
  stone(g) { rr(g, '#3a3a3a', 4, 5, 8, 7); rr(g, '#8a8a8a', 5, 6, 6, 5); rr(g, '#a8a8a8', 5, 6, 3, 1); rr(g, '#6a6a6a', 8, 9, 3, 2); },
  deer_trophy(g) { ln(g, '#d8ccb0', 5, 5, 3, 0); ln(g, '#d8ccb0', 4, 3, 1, 2); ln(g, '#d8ccb0', 10, 5, 12, 0); ln(g, '#d8ccb0', 11, 3, 14, 2);
    head(g, '#4a2f17', '#a5733f', 4, 4, 8, 10); rr(g, '#a5733f', 2, 5, 2, 2); rr(g, '#a5733f', 12, 5, 2, 2); dots(g, '#7ff6ff', [6, 7, 9, 7]); rr(g, '#e6d3ae', 6, 10, 4, 3); rr(g, '#2b2018', 7, 11, 2, 1); },
  boar_trophy(g) { head(g, '#21160e', '#4a3426', 2, 4, 12, 10); for (const x of [5, 7, 9]) rr(g, '#21160e', x, 2, 1, 2); dots(g, '#ff6a2a', [5, 7, 10, 7]);
    rr(g, '#8a6a5a', 5, 9, 6, 3); dots(g, '#3a2a22', [6, 10, 9, 10]); rr(g, '#f2ead2', 3, 9, 1, 3); rr(g, '#f2ead2', 12, 9, 1, 3); },
  greyling_trophy(g) { ln(g, '#4a3a26', 5, 4, 2, 0); ln(g, '#4a3a26', 8, 4, 8, 0); ln(g, '#4a3a26', 11, 4, 14, 1); head(g, '#2a3122', '#6f7d5e', 3, 4, 10, 10);
    rr(g, '#3f4a36', 4, 7, 8, 1); rr(g, '#d8ff4a', 5, 8, 2, 1); rr(g, '#d8ff4a', 9, 8, 2, 1); rr(g, '#2a3122', 6, 11, 4, 1); dots(g, '#c9c9b0', [7, 11]); },
  troll_trophy(g) { head(g, '#1b2433', '#5b7ba3', 2, 3, 12, 11); rr(g, '#2c3d55', 3, 3, 10, 2); rr(g, '#ffd24a', 4, 7, 2, 1); rr(g, '#ffd24a', 10, 7, 2, 1);
    rr(g, '#41597a', 7, 7, 2, 3); rr(g, '#1b2433', 4, 11, 8, 1); rr(g, '#f2ead2', 4, 10, 1, 2); rr(g, '#f2ead2', 11, 10, 1, 2); },
  stormhorn_trophy(g) { ln(g, '#d4d8de', 5, 6, 2, 1); ln(g, '#d4d8de', 3, 3, 0, 3); ln(g, '#d4d8de', 10, 6, 13, 1); ln(g, '#d4d8de', 12, 3, 15, 3);
    dots(g, '#7ff6ff', [2, 0, 0, 2, 13, 0, 15, 2]); head(g, '#1a1e26', '#3b4250', 4, 5, 8, 10); dots(g, '#7ff6ff', [6, 8, 9, 8]); rr(g, '#5a6272', 6, 11, 4, 3); rr(g, '#15181e', 7, 12, 2, 1); },
  raven(g) { rr(g, '#38485e', 0, 0, 16, 16); drawRavenHead(g); },
  rune(g) { rr(g, '#23272e', 3, 1, 10, 15); rr(g, '#4a4f57', 4, 2, 8, 13); rr(g, '#5d636c', 4, 2, 8, 1); ln(g, '#7ff6ff', 8, 4, 8, 12); ln(g, '#7ff6ff', 8, 5, 11, 8); ln(g, '#7ff6ff', 8, 8, 11, 11); },
  moon(g) { rr(g, '#0b1030', 0, 0, 16, 16); rr(g, '#e8ecf4', 4, 4, 8, 8); dots(g, '#b8c0cc', [5, 6, 6, 6, 9, 9, 10, 8, 7, 10]); },
  _(g) { rr(g, '#222', 3, 3, 10, 10); rr(g, '#c8a040', 4, 4, 8, 8); rr(g, '#ffe08a', 4, 4, 8, 1); },
};
function drawRavenHead(g) {
  rr(g, '#14141c', 3, 3, 9, 9); rr(g, '#14141c', 2, 11, 11, 5); rr(g, '#2c2c44', 4, 4, 5, 1); rr(g, '#2c2c44', 4, 4, 1, 4); rr(g, '#14141c', 2, 4, 1, 3);
  rr(g, '#4a4a55', 12, 7, 3, 2); rr(g, '#4a4a55', 12, 9, 2, 1); rr(g, '#6a6a78', 12, 7, 3, 1); rr(g, '#1f8a9a', 8, 5, 3, 3); rr(g, '#6ff3ff', 9, 6, 1, 1); rr(g, '#262638', 4, 12, 6, 1);
}
function iconCanvas(id, size = 16) {
  return pixCanvas(size, size, g => { g.imageSmoothingEnabled = false; if (size !== 16) g.scale(size / 16, size / 16);
    try { const d = itemDef(id);
      if (d && typeof d.icon === 'function') { d.icon(g); return; }
      if (d && d.block != null && BLOCK[d.block]) { const c = document.createElement('canvas'); c.width = c.height = 32; drawIcon(c, d.block); g.drawImage(c, 0, 0, 16, 16); return; }
    } catch (e) { /* fall back to our own icon */ }
    (ICON[id] || ICON._)(g); });
}

// =====================================================================================================
//  Day / night cycle
// =====================================================================================================
const DAY_LEN = 600, DAY_SHARE = .62;      // 10 minutes per day; daylight is 62% of it
let phase = .124, dayN = 1;
const phaseToT = p => p < DAY_SHARE ? p / DAY_SHARE * .5 : .5 + (p - DAY_SHARE) / (1 - DAY_SHARE) * .5;
const tToPhase = t => t < .5 ? t * 2 * DAY_SHARE : DAY_SHARE + (t - .5) * 2 * (1 - DAY_SHARE);
const time01 = () => phaseToT(phase);                         // 0 sunrise, .25 noon, .5 sunset, .75 midnight
const sunH = () => Math.sin(time01() * Math.PI * 2);
const isNight = () => sunH() < -.12;
const COL = h => new THREE.Color(h);
const SKYC = { dayTop: COL('#78a7ff'), dayFog: COL('#c0d8ff'), nightTop: COL('#050816'), nightFog: COL('#141a33'), duskFog: COL('#f2a46a'), duskTop: COL('#4d5fa8'), glow: COL('#ff8a3c') };
const fogC = new THREE.Color(), topC = new THREE.Color(), tmpC = new THREE.Color();
const seaMesh = scene.children.find(o => o.isMesh && o.geometry && o.geometry.type === 'PlaneGeometry' && o.material && o.material.color && o.material.color.getHex() === 0x3a64d6);
const hemi = scene.children.find(o => o.isHemisphereLight);
const SEA_BASE = new THREE.Color(0x3a64d6);
const moonDir = new V3();
const moon = new THREE.Mesh(new THREE.PlaneGeometry(46, 46), new THREE.MeshBasicMaterial({ fog: false, depthWrite: false, transparent: true, opacity: 0,
  map: charTex(32, 32, g => { rr(g, 'rgba(200,215,255,.16)', 4, 4, 24, 24); rr(g, '#cfd6e2', 8, 8, 16, 16); noiseFill(g, 9, 9, 14, 14, '#e8ecf4', .08);
    for (const [x, y, w] of [[11, 11, 3], [17, 13, 2], [13, 18, 4], [19, 19, 2], [10, 16, 1]]) rr(g, '#b4bccb', x, y, w, w); }) }));
moon.renderOrder = -1; scene.add(moon);
const stars = (() => { const pts = [];
  for (let i = 0; i < 420; i++) { const u = R() * 2 - 1, a = R() * Math.PI * 2, s = Math.sqrt(1 - u * u); pts.push(Math.cos(a) * s * 800, u * 800, Math.sin(a) * s * 800); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const p = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
  p.renderOrder = -1; scene.add(p); return p; })();
const skyPos = sky.geometry.attributes.position, skyCol = sky.geometry.attributes.color;
let lightK = 1, dayK = 1, duskK = 0, skyT = 0;
function recolorSky() {
  const sx = SUN_DIR.x, sz = SUN_DIR.z, sl = Math.hypot(sx, sz) || 1;
  for (let i = 0; i < skyPos.count; i++) {
    const x = skyPos.getX(i), y = skyPos.getY(i), z = skyPos.getZ(i), k = clamp(y / 900, 0, 1);
    tmpC.copy(fogC).lerp(topC, Math.pow(k, .45));
    if (duskK > .01) { const hl = Math.hypot(x, z) || 1, w = Math.max(0, (x * sx + z * sz) / (hl * sl)); tmpC.lerp(SKYC.glow, w * w * duskK * Math.pow(1 - k, 2.2) * .8); }
    skyCol.setXYZ(i, tmpC.r, tmpC.g, tmpC.b);
  }
  skyCol.needsUpdate = true;
}
function applyDay(force) {
  const t = time01(), s = Math.sin(t * Math.PI * 2);
  dayK = smoothstep(-.22, .25, s);
  duskK = Math.max(0, 1 - Math.abs(s + .02) / .3);
  lightK = lerp(.36, 1, dayK);
  fogC.copy(SKYC.nightFog).lerp(SKYC.dayFog, dayK).lerp(SKYC.duskFog, duskK * .5);
  topC.copy(SKYC.nightTop).lerp(SKYC.dayTop, dayK).lerp(SKYC.duskTop, duskK * .3);
  FOG.copy(fogC);
  // the voxel world, water, the held block and the sea all darken and turn blue at night, warm at dusk (kept readable on phones)
  const r = lerp(.42, 1, dayK), gg = lerp(.47, 1, dayK) * (1 - duskK * .08), b = lerp(.68, 1, dayK) * (1 - duskK * .18);
  opaqueMat.color.setRGB(r, gg, b); waterMat.color.setRGB(r, gg, b);
  heldMat.color.setRGB(lerp(.62, 1, dayK), lerp(.66, 1, dayK), lerp(.8, 1, dayK));
  if (seaMesh) seaMesh.material.color.copy(SEA_BASE).multiply(opaqueMat.color);
  clouds.material.color.setRGB(clamp(lerp(.2, 1, dayK) + duskK * .25, 0, 1), clamp(lerp(.22, 1, dayK) + duskK * .05, 0, 1), clamp(lerp(.34, 1, dayK) - duskK * .1, 0, 1));
  if (hemi) hemi.intensity = lerp(.24, .8, dayK);
  sunLight.intensity = lerp(.14, .55, dayK);
  sunLight.color.setRGB(lerp(.6, 1, dayK), lerp(.7, 1 - duskK * .15, dayK), lerp(1, 1 - duskK * .3, dayK));
  const a = t * Math.PI * 2; SUN_DIR.set(Math.cos(a), Math.sin(a), -.35).normalize(); moonDir.copy(SUN_DIR).negate();
  sunLight.position.copy(s > -.05 ? SUN_DIR : moonDir);
  sunMesh.material.opacity = clamp((s + .06) * 7, 0, 1);
  moon.material.opacity = clamp((-s + .06) * 7, 0, 1);
  stars.material.opacity = clamp((.04 - s) * 2.6, 0, .95);
  for (const k in dropMats) dropMats[k].color.setScalar(lightK);
  if (force || skyT <= 0) { skyT = .2; recolorSky(); }
}

// =====================================================================================================
//  Particles and effects
// =====================================================================================================
const vparts = [], fxObjs = [];
const PUFF = ['#ffffff', '#e2e2e2', '#c4c4c4'].map(c => new THREE.MeshBasicMaterial({ color: c }));
const SPARK = [new THREE.MeshBasicMaterial({ color: 0x7ff6ff, fog: false }), new THREE.MeshBasicMaterial({ color: 0xdfffff, fog: false })];
const PEBBLE = [new THREE.MeshLambertMaterial({ color: 0x7a7a7a }), new THREE.MeshLambertMaterial({ color: 0x5e5e5e })];
function puff(c, size = 1, n = 14, mats = PUFF, rise = 1, spread = 1) {
  for (let i = 0; i < n && vparts.length < 280; i++) {
    const m = new THREE.Mesh(UNIT, mats[i % mats.length]), s = (.11 + R() * .13) * Math.sqrt(size);
    m.scale.setScalar(s); m.position.set(c.x + (R() - .5) * size * .8, c.y + (R() - .5) * size, c.z + (R() - .5) * size * .8); scene.add(m);
    const life = .5 + R() * .5;
    vparts.push({ m, v: new V3((R() - .5) * 1.8 * spread, (.5 + R() * 1.4) * rise, (R() - .5) * 1.8 * spread), life, max: life, s0: s, g: rise > 0 ? -1.2 : 14 });
  }
}
function sparks(p, n = 4, speed = 2.5) { for (let i = 0; i < n && vparts.length < 280; i++) { const m = new THREE.Mesh(UNIT, SPARK[i % 2]), s = .07 + R() * .08;
  m.scale.setScalar(s); m.position.copy(p); scene.add(m); const life = .18 + R() * .25;
  vparts.push({ m, v: new V3((R() - .5) * speed, (R() - .2) * speed, (R() - .5) * speed), life, max: life, s0: s, g: 0 }); } }
function updateParts(dt) {
  for (let i = vparts.length - 1; i >= 0; i--) { const q = vparts[i]; q.life -= dt; q.v.y -= q.g * dt; q.m.position.addScaledVector(q.v, dt);
    q.m.scale.setScalar(Math.max(.001, q.s0 * (q.life / q.max)));
    if (q.life <= 0) { scene.remove(q.m); vparts.splice(i, 1); } }
  for (let i = fxObjs.length - 1; i >= 0; i--) { const o = fxObjs[i]; let alive = false; try { alive = o.upd(dt); } catch (e) { console.error(e); }
    if (!alive) { o.kill(); fxObjs.splice(i, 1); } }
}
const boltCore = new THREE.MeshBasicMaterial({ color: 0xeaffff, fog: false, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
const boltGlow = new THREE.MeshBasicMaterial({ color: 0x2fc8ff, fog: false, transparent: true, opacity: .45, blending: THREE.AdditiveBlending, depthWrite: false });
const UPV = new V3(0, 1, 0);
function bolt(x, y, z, h = 32) {
  const g = new THREE.Group(); let px = x + (R() - .5) * 4, py = y + h, pz = z + (R() - .5) * 4;
  const seg = (a, b, thin) => { const mid = a.clone().add(b).multiplyScalar(.5), len = a.distanceTo(b), dir = b.clone().sub(a).normalize();
    for (const [mat, th] of [[boltCore, thin ? .12 : .24], [boltGlow, thin ? .35 : .75]]) { const m = new THREE.Mesh(UNIT, mat); m.position.copy(mid);
      m.scale.set(th, len + th * .5, th); m.quaternion.setFromUnitVectors(UPV, dir); g.add(m); } };
  const n = 9;
  for (let i = 1; i <= n; i++) { const k = i / n, a = new V3(px, py, pz);
    const nx = i === n ? x : x + (R() - .5) * 3.2 * (1 - k * .8), ny = y + h * (1 - k), nz = i === n ? z : z + (R() - .5) * 3.2 * (1 - k * .8);
    const b = new V3(nx, ny, nz); seg(a, b, false);
    if (i > 2 && i < n - 1 && R() < .45) seg(b, b.clone().add(new V3((R() - .5) * 5, -2 - R() * 3, (R() - .5) * 5)), true);
    px = nx; py = ny; pz = nz; }
  scene.add(g);
  let t = 0; fxObjs.push({ upd(dt) { t += dt; g.visible = t < .08 || Math.sin(t * 70) > -.2; return t < .42; }, kill() { scene.remove(g); } });
  sparks(new V3(x, y + .3, z), 14, 6);
}
function flashScreen(color, amt) { flashEl.style.background = color; fx.flash = Math.max(fx.flash, amt); }

// =====================================================================================================
//  Item drops: bobbing, spinning 3D items you pick up by walking over them (Minecraft style)
// =====================================================================================================
const drops = [], DROP_GEO = new THREE.PlaneGeometry(.42, .42), dropMats = {};
function dropMat(id) {
  if (!dropMats[id]) { const tex = new THREE.CanvasTexture(iconCanvas(id)); tex.magFilter = tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false;
    dropMats[id] = new THREE.MeshBasicMaterial({ map: tex, alphaTest: .5, side: THREE.DoubleSide }); dropMats[id].color.setScalar(lightK); }
  return dropMats[id];
}
function spawnDrop(id, n = 1, pos) {
  n = Math.max(0, Math.floor(n)); if (!id || !n) return null;
  let p;
  if (!pos) { const P = PL(); p = new V3(P.pos.x - Math.sin(P.yaw) * 1.6, P.pos.y + 1, P.pos.z - Math.cos(P.yaw) * 1.6); }
  else if (Array.isArray(pos)) p = new V3(pos[0], pos[1], pos[2]);
  else p = new V3(pos.x, pos.y, pos.z);
  if (!isFinite(p.x + p.y + p.z)) return null;
  const g = new THREE.Group(), inner = new THREE.Group(); g.add(inner);
  const k = n > 4 ? 3 : n > 1 ? 2 : 1;
  for (let i = 0; i < k; i++) { const m = new THREE.Mesh(DROP_GEO, dropMat(id)); m.position.set(i * .07, i * .06, -i * .07); inner.add(m); }
  g.position.copy(p); scene.add(g);
  const d = { id, n, g, inner, v: new V3((R() - .5) * 3, 3.5 + R() * 2, (R() - .5) * 3), age: 0, t: R() * 6, rest: false, fullT: 0 };
  drops.push(d);
  while (drops.length > 64) removeDrop(drops[0]);
  return d;
}
function removeDrop(d) { scene.remove(d.g); const i = drops.indexOf(d); if (i >= 0) drops.splice(i, 1); }
function collect(d) {
  let left = d.n;
  if (hasInv()) { try { const r = Inv.add(d.id, d.n); left = typeof r === 'number' ? r : 0; } catch (e) { left = d.n; } }
  else { bag[d.id] = (bag[d.id] | 0) + d.n; left = 0; chat(`+${d.n} ${itemName(d.id)}`); }
  const got = d.n - left;
  if (got > 0) { VS.pop(); onPickup(d.id, got); }
  if (left > 0) { d.n = left; d.fullT = 2; return false; }
  return true;
}
function updateDrops(dt) {
  const P = PL(), pc = P.pos;
  for (let i = drops.length - 1; i >= 0; i--) {
    const d = drops[i], gp = d.g.position; d.age += dt; d.t += dt; d.fullT -= dt;
    if (d.age > 300) { removeDrop(d); continue; }
    const dx = pc.x - gp.x, dy = pc.y + .8 - gp.y, dz = pc.z - gp.z, dist = Math.hypot(dx, dy, dz);
    if (state === 'play' && d.age > .6 && d.fullT <= 0 && dist < 2.3) {           // magnet into the player, then pop
      const k = Math.min(1, dt * 12); gp.x += dx * k; gp.y += dy * k; gp.z += dz * k; d.rest = false;
      if (dist < .75 && collect(d)) { removeDrop(d); continue; }
    } else if (!d.rest) {
      d.v.y -= 20 * dt; gp.addScaledVector(d.v, dt); d.v.x *= Math.exp(-dt * 2); d.v.z *= Math.exp(-dt * 2);
      const gy = groundAt(gp.x, gp.z, gp.y + .4);
      if (gp.y <= gy + .02) { gp.y = gy + .02; d.v.set(0, 0, 0); d.rest = true; }
    } else if (groundAt(gp.x, gp.z, gp.y + .5) < gp.y - .1) d.rest = false;     // block below was broken
    d.inner.rotation.y += dt * 1.8; d.inner.position.y = .2 + Math.sin(d.t * 2.4) * .07;
    d.g.visible = d.age < 290 || Math.sin(d.age * 20) > 0;
  }
}

// =====================================================================================================
//  Creatures (mod-style mobs: cubes, strong silhouettes, 2–3 colours + 1 glowing accent)
// =====================================================================================================
const CREATURES = [];
let boss = null, cine = null;
const calm = () => state !== 'play' || dlg.open || !!cine;
class Creature {
  constructor(kind, name, hp) {
    this.kind = kind; this.name = name; this.max = this.hp = hp; this.dead = 0; this.flash = 0; this.flashOn = false;
    this.yaw = R() * Math.PI * 2; this.phase = 0; this.timer = 0; this.speed = 0; this.vy = 0; this.kb = { x: 0, z: 0 };
    this.step = 1; this.turn = 7; this.stride = 3; this.height = 1; this.matMap = new Map(); this.mats = []; this.dying = 0; this.t = R() * 10;
    this.group = new THREE.Group(); this.pos = this.group.position; this.tipDir = R() < .5 ? 1 : -1;
  }
  m(tex) { if (Array.isArray(tex)) return tex.map(t => this.m(t)); if (tex && tex.isMaterial) return tex;
    let mm = this.matMap.get(tex); if (!mm) { mm = new THREE.MeshLambertMaterial({ map: tex }); this.matMap.set(tex, mm); this.mats.push(mm); } return mm; }
  box(w, h, d, tex, x, y, z, parent = this.group) { const b = new THREE.Mesh(boxGeo(w, h, d), this.m(tex)); b.position.set(x, y, z); parent.add(b); return b; }
  pivot(x, y, z, parent = this.group) { const p = new THREE.Group(); p.position.set(x, y, z); parent.add(p); return p; }
  spawnAt(x, z) { this.pos.set(x, surfaceAt(x, z), z); this.group.rotation.y = this.yaw; scene.add(this.group); ENTITIES.push(this); CREATURES.push(this); return this; }
  center() { return new V3(this.pos.x, this.pos.y + this.height * .55, this.pos.z); }
  hit(dmg, dir) {
    if (this.dead > 0 || this.removed || this.immune) return;
    dmg = +dmg || 0; this.hp -= dmg; this.flash = .35;
    const kb = this.kbRes ?? 1;
    if (dir && kb > 0) { this.kb.x += (dir.x || 0) * 5 * kb; this.kb.z += (dir.z || 0) * 5 * kb; this.vy = Math.max(this.vy, 3.2 * kb); }
    this.onHurt(dir);
    if (this.hp <= 0) this.die();
  }
  onHurt() {}
  die() { this.dead = 1; this.dying = 0; this.flash = 9; this.setFlash(true); try { onKill(this); } catch (e) { console.error(e); } }
  setFlash(on) { if (on === this.flashOn) return; this.flashOn = on; for (const m of this.mats) m.emissive.setRGB(on ? .75 : 0, 0, 0); }
  loot() {}
  deathAnim(dt) {
    this.dying += dt; this.group.rotation.z = Math.min(1, this.dying / .45) * Math.PI / 2 * this.tipDir;
    if (this.dying > .8) { const c = this.center(); puff(c, this.height, 10 + this.height * 6); VS.poof(); this.loot(c); this.remove(); }
  }
  remove() { if (this.removed) return; this.removed = true; this.dead = Math.max(this.dead, 1); scene.remove(this.group); for (const m of this.mats) m.dispose(); }
  vanish() { puff(this.center(), this.height, 10); this.remove(); }
  tryMove(nx, nz) {
    if (nx < 3 || nz < 3 || nx > WX - 3 || nz > WZ - 3) return false;
    const gy = groundAt(nx, nz, this.pos.y + this.step + .2);
    if (gy - this.pos.y > this.step + .05) return false;
    if (!this.swims && get(Math.floor(nx), Math.floor(gy), Math.floor(nz)) === WATER) return false;
    this.pos.x = nx; this.pos.z = nz; return true;
  }
  face(dx, dz) { this.yaw = Math.atan2(dx, dz); }
  wander(dt, sp = 1.1) {
    this.timer -= dt;
    if (this.timer <= 0) { this.moving = R() < .55; this.yaw += (R() - .5) * 2.6; this.timer = 2 + R() * 4; }
    if (this.moving) { this.speed = sp; if (this.blocked) { this.yaw += 1.8 + R(); this.timer = Math.min(this.timer, .8); } }
  }
  update(dt) {
    if (this.removed) return;
    if (this.dead > 0) { this.deathAnim(dt); return; }
    this.t += dt;
    const P = PL(), dx = P.pos.x - this.pos.x, dz = P.pos.z - this.pos.z, d = Math.hypot(dx, dz);
    this.dist = d; this.group.visible = d < 110;
    if (this.flash > 0) this.flash -= dt; this.setFlash(this.flash > 0);
    this.speed = 0;
    this.think(dt, P, dx, dz, d);
    const sp = this.speed; let moved = false;
    if (sp > 0) moved = this.tryMove(this.pos.x + Math.sin(this.yaw) * sp * dt, this.pos.z + Math.cos(this.yaw) * sp * dt);
    this.blocked = sp > 0 && !moved;
    if (Math.abs(this.kb.x) + Math.abs(this.kb.z) > .05) { this.tryMove(this.pos.x + this.kb.x * dt, this.pos.z + this.kb.z * dt); const f = Math.exp(-dt * 7); this.kb.x *= f; this.kb.z *= f; }
    const gy = groundAt(this.pos.x, this.pos.z, this.pos.y + this.step + .1);
    if (this.vy > 0 || this.pos.y > gy + .02) { this.vy -= 24 * dt; this.pos.y += this.vy * dt; if (this.pos.y <= gy) { this.pos.y = gy; this.vy = 0; } }
    else { this.pos.y = lerp(this.pos.y, gy, Math.min(1, dt * 14)); this.vy = 0; }
    let dr = this.yaw - this.group.rotation.y; dr = Math.atan2(Math.sin(dr), Math.cos(dr)); this.group.rotation.y += dr * Math.min(1, dt * this.turn);
    if (moved) this.phase += dt * sp * this.stride;
    this.animate(dt, moved ? sp : 0);
  }
  think() {} animate() {}
}

// ---- Deer: skittish, flees when you come close
function deerT() { return {
  hide: tx('d_hide', 16, 8, '#9c6b3a', g => dots(g, '#d9b07c', [3, 2, 7, 3, 11, 2, 5, 5, 13, 5, 9, 6])),
  top: tx('d_top', 8, 16, '#8a5c30', g => dots(g, '#c99a62', [2, 3, 5, 6, 2, 10, 5, 13])),
  belly: tx('d_belly', 8, 8, '#e6d3ae'), rump: tx('d_rump', 8, 8, '#9c6b3a', g => rr(g, '#efe6d4', 2, 2, 4, 5)),
  leg: tx('d_leg', 4, 12, '#9c6b3a', g => { rr(g, '#b98a55', 0, 6, 4, 4); rr(g, '#2a1e14', 0, 10, 4, 2); }),
  neck: tx('d_neck', 8, 8, '#a5733f', g => rr(g, '#e6d3ae', 2, 5, 4, 3)), head: tx('d_head', 8, 8, '#a5733f'),
  face: tx('d_face', 8, 8, '#a5733f', g => { rr(g, '#5a3a1c', 1, 2, 6, 1); rr(g, '#c49a66', 2, 5, 4, 3); }),
  nose: tx('d_nose', 8, 8, '#c49a66', g => { rr(g, '#2b2018', 2, 1, 4, 3); rr(g, '#e6d3ae', 1, 5, 6, 3); }),
  tail: tx('d_tail', 4, 4, '#efe6d4'), antler: tx('d_ant', 4, 8, '#d8ccb0'),
}; }
class Deer extends Creature {
  constructor() {
    super('deer', 'Deer', 14); this.height = 1.5; this.stride = 2.4; this.buck = R() < .55; this.fleeT = 0;
    const T = deerT(); this.legs = [];
    for (const [lx, lz] of [[-.16, .36], [.16, .36], [-.16, -.36], [.16, -.36]]) { const p = this.pivot(lx, .74, lz); this.box(.14, .74, .14, T.leg, 0, -.37, 0, p); this.legs.push(p); }
    this.box(.46, .46, 1.0, [T.hide, T.hide, T.top, T.belly, T.hide, T.rump], 0, .97, 0);
    this.box(.1, .16, .08, T.tail, 0, 1.1, -.53);
    this.neck = this.pivot(0, 1.08, .4); this.box(.2, .52, .2, T.neck, 0, .22, .04, this.neck);
    this.head = this.pivot(0, .46, .06, this.neck);
    this.box(.26, .26, .28, [T.head, T.head, T.head, T.head, T.face, T.head], 0, .02, .06, this.head);
    this.box(.16, .14, .16, [T.head, T.head, T.head, T.belly, T.nose, T.head], 0, -.04, .27, this.head);
    for (const s of [-1, 1]) { const e = this.box(.06, .15, .04, T.head, s * .16, .16, -.02, this.head); e.rotation.z = -s * .7;
      this.box(.02, .05, .05, glowMat(0x9ff3ff), s * .135, .06, .11, this.head); }
    if (this.buck) for (const s of [-1, 1]) {
      const a = this.pivot(s * .08, .14, 0, this.head); a.rotation.set(-.25, 0, -s * .38);
      this.box(.045, .36, .045, T.antler, 0, .18, 0, a);
      const t1 = this.box(.04, .16, .04, T.antler, 0, .2, .07, a); t1.rotation.x = .8;
      const t2 = this.box(.04, .16, .04, T.antler, s * .05, .36, 0, a); t2.rotation.z = -s * .7;
    }
    this.neck.rotation.x = .35; this.head.rotation.x = -.3;
  }
  onHurt(dir) { VS.deer(); this.fleeT = 6; this.moving = true; }
  think(dt, P, dx, dz, d) {
    const alertR = P.sneak ? 5 : 10;
    if (this.fleeT > 0) {
      this.fleeT -= dt; if (this.blocked) this.jink = (this.jink || 0) + (R() < .5 ? 1.3 : -1.3);
      this.yaw = Math.atan2(-dx, -dz) + (this.jink || 0) * .6; this.speed = 6.8; this.graze = false;
    } else if (d < alertR && state === 'play') { this.fleeT = 3 + R() * 2; this.jink = 0; }
    else { this.wander(dt, 1.2); this.graze = !this.moving && Math.sin(this.t * .7) > -.2; }
  }
  animate(dt, sp) {
    const sw = Math.sin(this.phase) * (sp > 4 ? 1 : .7) * Math.min(1, sp / 2.5);
    this.legs[0].rotation.x = sw; this.legs[1].rotation.x = -sw; this.legs[2].rotation.x = -sw; this.legs[3].rotation.x = sw;
    const k = Math.min(1, dt * 5);
    this.neck.rotation.x = lerp(this.neck.rotation.x, this.graze ? 1.95 : sp > 4 ? .7 : .35, k);
    this.head.rotation.x = lerp(this.head.rotation.x, this.graze ? -.5 : -.3, k);
    this.head.rotation.y = this.graze ? Math.sin(this.t * 3) * .15 : 0;
  }
  loot(c) { spawnDrop('raw_meat', 1 + (R() < .5 ? 1 : 0), c); spawnDrop('deer_hide', 1 + (R() < .3 ? 1 : 0), c); if (countItem('deer_trophy') < 2 || R() < .5) spawnDrop('deer_trophy', 1, c); }
}

// ---- Boar: neutral; charges back when hit
function boarT() { return {
  hide: tx('b_hide', 16, 8, '#4a3426', g => { for (let x = 1; x < 15; x += 3) rr(g, '#3a281c', x, 1, 1, 5); }, .3),
  top: tx('b_top', 8, 16, '#3a281c', null, .3), belly: tx('b_belly', 8, 8, '#6e5038'),
  leg: tx('b_leg', 4, 8, '#3e2a1e', g => rr(g, '#1a120c', 0, 6, 4, 2)), mane: tx('b_mane', 4, 4, '#241810', null, .35),
  head: tx('b_head', 8, 8, '#4a3426', null, .3), face: tx('b_face', 8, 8, '#4a3426', g => { rr(g, '#241810', 0, 2, 8, 1); }, .3),
  snout: tx('b_snout', 8, 8, '#8a6a5a', g => { rr(g, '#3a2a22', 2, 3, 1, 2); rr(g, '#3a2a22', 5, 3, 1, 2); }), tusk: tx('b_tusk', 4, 4, '#f2ead2'),
}; }
class Boar extends Creature {
  constructor() {
    super('boar', 'Boar', 20); this.height = 1.05; this.stride = 4; this.aggro = 0; this.cd = 0; this.wind = 0;
    const T = boarT(); this.legs = [];
    for (const [lx, lz] of [[-.21, .34], [.21, .34], [-.21, -.36], [.21, -.36]]) { const p = this.pivot(lx, .34, lz); this.box(.18, .34, .18, T.leg, 0, -.17, 0, p); this.legs.push(p); }
    this.body = this.pivot(0, .34, 0);
    this.box(.66, .58, 1.1, [T.hide, T.hide, T.top, T.belly, T.hide, T.hide], 0, .3, 0, this.body);
    for (let i = 0; i < 4; i++) { const s = this.box(.12, .22, .16, T.mane, 0, .64 - i * .03, .38 - i * .2, this.body); s.rotation.x = -.45; }
    this.box(.08, .16, .06, T.mane, 0, .42, -.57, this.body);
    this.head = this.pivot(0, .34, .52, this.body);
    this.box(.5, .46, .42, [T.head, T.head, T.head, T.head, T.face, T.head], 0, 0, .18, this.head);
    this.box(.3, .22, .16, [T.snout, T.snout, T.snout, T.snout, T.snout, T.snout], 0, -.08, .46, this.head);
    for (const s of [-1, 1]) { const tu = this.box(.05, .16, .05, T.tusk, s * .17, .0, .45, this.head); tu.rotation.x = .3;
      this.box(.1, .12, .06, T.head, s * .21, .27, .04, this.head); this.box(.07, .05, .02, glowMat(0xff5a22), s * .12, .08, .395, this.head); }
  }
  onHurt() { VS.boar(); this.aggro = 14; }
  think(dt, P, dx, dz, d) {
    this.cd -= dt;
    if (this.aggro > 0 && d < 26) {
      this.aggro -= dt;
      if (calm()) { this.wind = 0; return; }
      this.face(dx, dz);
      if (this.wind > 0) { this.wind -= dt; if (this.wind <= 0) { this.lunge = .25; if (d < 2.3) hurt(3, 'Boar', dx / (d || 1), dz / (d || 1)); this.cd = 1.3; } }
      else if (d < 1.9 && this.cd <= 0) { this.wind = .35; VS.boar(); }
      else if (d > 1.6) this.speed = 5.2;
    } else { this.aggro = 0; this.wander(dt, 1); }
  }
  animate(dt, sp) {
    const sw = Math.sin(this.phase) * .7 * Math.min(1, sp / 2);
    this.legs[0].rotation.x = sw; this.legs[1].rotation.x = -sw; this.legs[2].rotation.x = -sw; this.legs[3].rotation.x = sw;
    this.lunge = Math.max(0, (this.lunge || 0) - dt);
    this.head.rotation.x = lerp(this.head.rotation.x, this.wind > 0 ? .45 : this.lunge > 0 ? -.4 : Math.sin(this.t * 1.3) * .06, Math.min(1, dt * 12));
    this.body.position.z = this.lunge > 0 ? .15 : 0;
  }
  loot(c) { spawnDrop('raw_meat', 1 + (R() < .5 ? 1 : 0), c); spawnDrop('leather_scraps', 1 + (R() < .5 ? 1 : 0), c); if (R() < .25) spawnDrop('boar_trophy', 1, c); }
}

// ---- Greyling: small grey-green forest goblin with glowing eyes; comes at night and throws stones
function greyT() { return {
  skin: tx('g_skin', 8, 8, '#6f7d5e', null, .26), bark: tx('g_bark', 8, 8, '#3a4232', g => { for (let x = 1; x < 8; x += 2) rr(g, '#2a3122', x, 0, 1, 8); }, .3),
  twig: tx('g_twig', 4, 8, '#4a3a26', null, .3), leg: tx('g_leg', 4, 8, '#5d6a4e', g => rr(g, '#2a3122', 0, 6, 4, 2)),
  face: tx('g_face', 8, 8, '#6f7d5e', g => { rr(g, '#3f4a36', 0, 2, 8, 1); rr(g, '#2a3122', 2, 6, 4, 1); dots(g, '#c9c9b0', [3, 6]); rr(g, '#5d6a4e', 3, 4, 2, 2); }, .26),
  arm: tx('g_arm', 4, 8, '#6f7d5e', g => rr(g, '#3a4232', 0, 6, 4, 2), .26), moss: tx('g_moss', 8, 4, '#4f6a32', null, .35),
}; }
class Greyling extends Creature {
  constructor() {
    super('greyling', 'Greyling', 12); this.height = .95; this.stride = 6; this.turn = 10; this.cd = 1 + R() * 1.5; this.wind = 0; this.melee = 0; this.dayT = 0;
    const T = greyT(), eye = glowMat(0xd8ff4a); this.legs = []; this.arms = [];
    for (const s of [-1, 1]) { const p = this.pivot(s * .09, .28, 0); this.box(.12, .28, .12, T.leg, 0, -.14, 0, p); this.legs.push(p); }
    this.body = this.pivot(0, .28, 0); this.body.rotation.x = .3;
    this.box(.34, .36, .24, [T.bark, T.bark, T.skin, T.skin, T.skin, T.bark], 0, .18, 0, this.body);
    this.box(.38, .3, .05, T.bark, 0, .12, -.14, this.body);
    this.head = this.pivot(0, .36, .05, this.body);
    this.box(.42, .38, .36, [T.skin, T.skin, T.bark, T.skin, T.face, T.bark], 0, .16, .04, this.head);
    this.box(.3, .08, .06, T.moss, 0, -.04, .2, this.head);
    for (const s of [-1, 1]) this.box(.08, .05, .02, eye, s * .1, .19, .225, this.head);
    for (const [x, rz, rx, h] of [[-.14, .7, -.2, .26], [.0, 0, -.45, .3], [.14, -.6, -.1, .24], [-.06, .25, .35, .2]]) {
      const tw = this.box(.05, h, .05, T.twig, x, .38 + h * .3, -.02, this.head); tw.rotation.set(rx, 0, rz); }
    for (const s of [-1, 1]) { const p = this.pivot(s * .22, .32, 0, this.body); this.box(.09, .5, .09, T.arm, 0, -.24, 0, p); this.box(.12, .1, .12, T.bark, 0, -.5, 0, p); this.arms.push(p); }
    this.rock = new THREE.Mesh(boxGeo(.14, .14, .14), PEBBLE[0]); this.rock.position.set(0, -.56, .04); this.rock.visible = false; this.arms[1].add(this.rock);
  }
  onHurt() { VS.grey(); this.cd = Math.min(this.cd, .6); }
  think(dt, P, dx, dz, d) {
    this.cd -= dt;
    if (!isNight()) {                          // daylight: scurry away and vanish into the trees
      this.dayT += dt; this.yaw = Math.atan2(-dx, -dz); this.speed = 3.4; this.wind = 0;
      if (this.dayT > 5 || d > 40) this.vanish(); return;
    }
    if (calm() || d > 34) { this.wind = 0; this.wander(dt, .9); return; }
    this.face(dx, dz);
    if (this.wind > 0) {
      this.wind -= dt;
      if (this.wind <= 0) {
        if (this.windKind === 'throw') { const h = new V3(); this.rock.getWorldPosition(h); throwStone(h, new V3(P.pos.x + P.vel.x * .25, P.pos.y + 1.1, P.pos.z + P.vel.z * .25), 'Greyling'); VS.toss(); this.cd = 2.2 + R() * 1.4; }
        else { this.swipe = .2; if (d < 2.1) hurt(2, 'Greyling', dx / (d || 1), dz / (d || 1)); this.cd = 1.2; }
      }
      return;
    }
    if (d <= 2 && this.cd <= 0) { this.wind = .3; this.windKind = 'melee'; VS.grey(); }
    else if (d > 3.5 && d < 12 && this.cd <= 0) { this.wind = .5; this.windKind = 'throw'; VS.grey(); }
    else if (d > 1.6 && (d > 9 || this.cd < .8)) this.speed = 3.1;
    if (this.blocked && d > 3) { this.yaw += (R() < .5 ? 1 : -1); this.speed = 3.1; }
  }
  animate(dt, sp) {
    const sw = Math.sin(this.phase) * .8 * Math.min(1, sp / 2);
    this.legs[0].rotation.x = sw; this.legs[1].rotation.x = -sw;
    this.swipe = Math.max(0, (this.swipe || 0) - dt);
    const k = Math.min(1, dt * 14), throwing = this.wind > 0 && this.windKind === 'throw';
    this.rock.visible = throwing;
    this.arms[1].rotation.x = lerp(this.arms[1].rotation.x, throwing ? -2.6 : this.wind > 0 ? -1.8 : this.swipe > 0 ? .4 : -sw * .8, k);
    this.arms[0].rotation.x = lerp(this.arms[0].rotation.x, this.wind > 0 && !throwing ? -1.8 : sw * .8 - .2, k);
    this.head.rotation.z = Math.sin(this.t * 2.3) * .12;
  }
  loot(c) { spawnDrop('resin', 1 + (R() < .5 ? 1 : 0), c); if (R() < .2) spawnDrop('greyling_trophy', 1, c); }
}
const stones = [];
function throwStone(from, to, by, dmg = 2) {
  const m = new THREE.Mesh(boxGeo(.16, .16, .16), PEBBLE[stones.length % 2]); m.position.copy(from); scene.add(m);
  const dx = to.x - from.x, dy = to.y - from.y, dz = to.z - from.z, T = clamp(Math.hypot(dx, dz) / 12, .3, 1.3), g = 16;
  stones.push({ m, v: new V3(dx / T, (dy + .5 * g * T * T) / T, dz / T), g, life: 4, by, dmg });
}
function updateStones(dt) {
  const P = PL().pos;
  for (let i = stones.length - 1; i >= 0; i--) {
    const s = stones[i], p = s.m.position; s.life -= dt; s.v.y -= s.g * dt; p.addScaledVector(s.v, dt); s.m.rotation.x += dt * 9; s.m.rotation.z += dt * 7;
    let gone = s.life <= 0;
    if (!gone && !calm()) { const ex = p.x - P.x, ez = p.z - P.z, ey = p.y - (P.y + .9);
      if (ex * ex + ez * ez < .42 && Math.abs(ey) < 1.05) { const l = Math.hypot(s.v.x, s.v.z) || 1; hurt(s.dmg, s.by, s.v.x / l, s.v.z / l); VS.pebble(); gone = true; } }
    if (!gone && BLOCK[get(Math.floor(p.x), Math.floor(p.y), Math.floor(p.z))].solid) { puff(p, .4, 4, PEBBLE, -1, 1.5); VS.pebble(); gone = true; }
    if (gone) { scene.remove(s.m); stones.splice(i, 1); }
  }
}

// ---- Stormhorn: the first boss, a huge lightning stag
function stagT() { return {
  body: tx('s_body', 16, 8, '#3b4250', g => { for (let i = 0; i < 4; i++) { const x = 2 + i * 4; ln(g, '#3f8f9f', x, 1, x + 2, 4); ln(g, '#3f8f9f', x + 2, 4, x + 1, 7); } }, .2),
  top: tx('s_top', 8, 16, '#323845', null, .2), belly: tx('s_belly', 8, 8, '#5a6272'),
  mane: tx('s_mane', 16, 16, '#8b96a8', g => { for (let x = 0; x < 16; x += 2) rr(g, '#646f80', x, 4 + (x * 7) % 9, 1, 4); }, .35),
  leg: tx('s_leg', 4, 12, '#323845', g => { rr(g, '#4a5363', 0, 0, 4, 3); }), hoof: tx('s_hoof', 4, 4, '#15181e'),
  head: tx('s_head', 8, 8, '#3b4250'), face: tx('s_face', 8, 8, '#3b4250', g => { rr(g, '#1a1e26', 0, 2, 8, 1); rr(g, '#5a6272', 2, 5, 4, 3); }),
  muzzle: tx('s_muz', 8, 8, '#5a6272', g => { rr(g, '#15181e', 2, 1, 4, 3); rr(g, '#a9b4c4', 1, 6, 6, 2); }),
  antler: tx('s_ant', 4, 8, '#d4d8de', g => { rr(g, '#a0a6b0', 0, 6, 4, 2); }),
}; }
class Stormhorn extends Creature {
  constructor() {
    super('stormhorn', 'Stormhorn', 280); this.isBoss = true; this.S = 2.4; this.height = 6; this.step = 1.6; this.kbRes = 0; this.turn = 3.2; this.stride = .95;
    this.mode = 'intro'; this.mt = 0; this.cd = 1.5; this.tips = []; this.markers = []; this.sparkT = 0; this.awayT = 0;
    const T = stagT(), cyan = 0x7ff6ff;
    this.tipMat = new THREE.MeshBasicMaterial({ color: cyan, fog: false });
    this.rig = new THREE.Group(); this.rig.scale.setScalar(this.S); this.group.add(this.rig);
    const P = this.rig; this.legs = [];
    for (const [lx, lz] of [[-.22, .44], [.22, .44], [-.22, -.46], [.22, -.46]]) { const p = this.pivot(lx, .95, lz, P);
      this.box(.2, .56, .2, T.leg, 0, -.27, 0, p); this.box(.15, .42, .15, T.leg, 0, -.7, .02, p); this.box(.2, .12, .2, T.hoof, 0, -.9, .03, p); this.legs.push(p); }
    this.box(.66, .66, 1.3, [T.body, T.body, T.top, T.belly, T.body, T.body], 0, 1.27, -.05, P);
    this.box(.82, .8, .62, T.mane, 0, 1.4, .38, P);
    for (const s of [-1, 1]) for (const [y, z, rx] of [[1.42, -.05, .7], [1.3, -.2, -.7], [1.18, -.35, .7]]) { const z0 = this.box(.02, .05, .2, this.tipMat, s * .335, y, z, P); z0.rotation.x = rx; }
    this.box(.32, .42, .32, T.mane, 0, 1.02, .66, P);
    this.box(.16, .26, .1, T.mane, 0, 1.48, -.74, P);
    this.neck = this.pivot(0, 1.55, .58, P); this.box(.32, .64, .32, T.mane, 0, .27, .06, this.neck); this.neck.rotation.x = .45;
    this.head = this.pivot(0, .6, .1, this.neck); this.head.rotation.x = -.45;
    this.box(.36, .34, .42, [T.head, T.head, T.head, T.belly, T.face, T.head], 0, .02, .08, this.head);
    this.box(.26, .24, .3, [T.head, T.head, T.head, T.belly, T.muzzle, T.head], 0, -.06, .4, this.head);
    for (const s of [-1, 1]) { this.box(.03, .07, .12, this.tipMat, s * .185, .07, .14, this.head);
      const e = this.box(.08, .24, .05, T.head, s * .22, .18, -.03, this.head); e.rotation.z = -s * 1.0;
      const h = halo(cyan, .35, .5); h.position.set(s * .2, .07, .15); this.head.add(h); }
    const seg = (parent, len, th, rx, rz, x = 0, y = 0, z = 0) => { const p = this.pivot(x, y, z, parent); p.rotation.set(rx, 0, rz);
      this.box(th, len, th, T.antler, 0, len / 2, 0, p); const end = this.pivot(0, len, 0, p); return { p, end }; };
    const tip = e => { const b = this.box(.1, .13, .1, this.tipMat, 0, .03, 0, e); this.tips.push(b); if (this.tips.length % 2) { const h = halo(cyan, .45, .45); e.add(h); } };
    for (const s of [-1, 1]) {
      const a = seg(this.head, .6, .085, -.35, -s * .62, s * .12, .18, -.02);
      tip(seg(a.p, .32, .06, 1.05, 0, 0, .2, 0).end);
      const b = seg(a.end, .55, .075, -.15, s * .55); tip(seg(b.p, .3, .06, .9, -s * .4, 0, .28, 0).end);
      const c = seg(b.end, .42, .065, -.1, s * .25); tip(c.end); tip(seg(c.p, .26, .055, .25, -s * .85, 0, .2, 0).end);
      tip(seg(a.end, .32, .06, .65, -s * .75).end);
    }
  }
  center() { return new V3(this.pos.x, this.pos.y + 2.3, this.pos.z); }
  onHurt() { VS.stagHurt(); const c = this.center(); sparks(c, 6, 4); }
  tipPos(i) { const v = new V3(); this.tips[i % this.tips.length].getWorldPosition(v); return v; }
  crackle(dt, rate) { this.sparkT -= dt; if (this.sparkT > 0 || !this.group.visible) return; this.sparkT = rate; sparks(this.tipPos((R() * this.tips.length) | 0), 2, 2.5);
    this.tipMat.color.setRGB(.5 + R() * .5, .96, 1); }
  think(dt, P, dx, dz, d) {
    const enr = this.hp < this.max * .5;
    this.crackle(dt, this.mode === 'boltWind' ? .03 : enr ? .06 : .12);
    if (this.mode === 'intro') { this.mt += dt; this.face(dx, dz); if (this.mt > 4.2) { this.mode = 'chase'; this.immune = false; this.cd = 1.2; } return; }
    // leash: if the player runs far from the altar, the storm fades and the offering is returned
    const ad = Math.hypot(P.pos.x - ALT.cx, P.pos.z - ALT.cz);
    this.awayT = ad > 48 ? this.awayT + dt : 0;
    if (this.awayT > 10) { despawnBoss(true); return; }
    if (calm()) { this.clearMarkers(); if (this.mode !== 'chase') { this.mode = 'chase'; this.cd = 1.5; } return; }
    const f = { x: Math.sin(this.yaw), z: Math.cos(this.yaw) };
    switch (this.mode) {
      case 'chase': {
        const home = Math.hypot(this.pos.x - ALT.cx, this.pos.z - ALT.cz);
        if (home > 30) this.face(ALT.cx - this.pos.x, ALT.cz - this.pos.z); else this.face(dx, dz);
        if (d > 4.5 || home > 30) this.speed = enr ? 5 : 4.2;
        this.cd -= dt;
        if (this.cd <= 0) { const r = R();
          if (d < 7) this.begin(r < .55 ? 'stompWind' : r < .8 ? 'chargeWind' : 'boltWind');
          else if (d < 22) this.begin(r < .5 ? 'chargeWind' : 'boltWind');
          else this.begin('boltWind'); }
        break; }
      case 'chargeWind': this.mt -= dt; if (this.mt > .3) this.face(dx, dz); if (R() < dt * 10) puff(new V3(this.pos.x + f.x * 1.2, this.pos.y + .2, this.pos.z + f.z * 1.2), .5, 2, PEBBLE, -1);
        if (this.mt <= 0) { this.mode = 'charge'; this.mt = 1.15; this.hitDone = false; VS.bellow(); } break;
      case 'charge': {
        this.mt -= dt; this.speed = enr ? 16 : 14;
        const along = dx * f.x + dz * f.z, side = Math.abs(dx * f.z - dz * f.x);
        if (!this.hitDone && along > -1 && along < 3.8 && side < 1.9 && Math.abs(P.pos.y - this.pos.y) < 3) { this.hitDone = true; hurt(6, 'Stormhorn', f.x, f.z); P.vel.y = 8; }
        if (this.blocked) { this.mode = 'stun'; this.mt = 1.3; shakeT = Math.max(shakeT, .45); VS.stomp(); puff(this.center(), 2, 10, PEBBLE, -1, 2); }
        else if (this.mt <= 0) { this.mode = 'recover'; this.mt = .7; }
        break; }
      case 'stompWind': this.mt -= dt; this.face(dx, dz);
        if (this.mt <= 0) { this.mode = 'recover'; this.mt = .9; shakeT = Math.max(shakeT, .7); VS.stomp(); shockwave(this.pos.x + f.x * 1.4, this.pos.y, this.pos.z + f.z * 1.4, enr ? 5 : 4);
          puff(new V3(this.pos.x + f.x * 1.4, this.pos.y + .3, this.pos.z + f.z * 1.4), 3, 16, PEBBLE, -1, 3); } break;
      case 'boltWind': this.mt -= dt; this.face(dx, dz);
        for (const mk of this.markers) mk.k = 1 - this.mt / mk.dur;
        if (this.mt <= 0) { this.strike(); this.mode = 'recover'; this.mt = .8; } break;
      case 'stun': case 'recover': this.mt -= dt; if (this.mt <= 0) { this.mode = 'chase'; this.cd = enr ? .5 : 1; } break;
    }
  }
  begin(m) {
    this.mode = m;
    if (m === 'chargeWind') { this.mt = .9; VS.rumble(); }
    if (m === 'stompWind') { this.mt = .8; VS.bellow(); }
    if (m === 'boltWind') { this.mt = 1.15; VS.zap(); const P = PL(), n = this.hp < this.max * .5 ? 3 : 1;
      for (let i = 0; i < n; i++) { const a = R() * Math.PI * 2, r = i ? 3 + R() * 2.5 : 0; this.markers.push(marker(P.pos.x + Math.cos(a) * r, P.pos.z + Math.sin(a) * r, P.pos.y, this.mt)); } }
  }
  strike() {
    const P = PL(); flashScreen('#d8f6ff', .55); VS.thunder(.8); shakeT = Math.max(shakeT, .5);
    for (const mk of this.markers) { bolt(mk.x, mk.y, mk.z);
      if (!calm() && Math.hypot(P.pos.x - mk.x, P.pos.z - mk.z) < 2.3 && Math.abs(P.pos.y - mk.y) < 3) { const dx = P.pos.x - mk.x, dz = P.pos.z - mk.z, l = Math.hypot(dx, dz) || 1; hurt(6, 'Stormhorn', dx / l, dz / l); }
      mk.kill(); }
    this.markers = [];
  }
  clearMarkers() { for (const mk of this.markers) mk.kill(); this.markers = []; }
  animate(dt, sp) {
    const sw = Math.sin(this.phase) * .5 * Math.min(1, sp / 3), k = Math.min(1, dt * 7), m = this.mode;
    const rear = m === 'stompWind' || (m === 'intro' && this.mt > 1.3 && this.mt < 2.6);
    this.rig.rotation.x = lerp(this.rig.rotation.x, rear ? -.42 : 0, Math.min(1, dt * (rear ? 5 : 16)));
    this.rig.position.z = this.rig.rotation.x * 1.6;
    const fl = rear ? -1 : 0;
    this.legs[0].rotation.x = lerp(this.legs[0].rotation.x, rear ? fl : sw, k); this.legs[1].rotation.x = lerp(this.legs[1].rotation.x, rear ? fl * .7 : -sw, k);
    this.legs[2].rotation.x = -sw + (rear ? .4 : 0); this.legs[3].rotation.x = sw + (rear ? .4 : 0);
    if (m === 'chargeWind') this.legs[0].rotation.x = Math.sin(this.t * 14) * .5;
    const nk = m === 'charge' || m === 'chargeWind' ? 1.15 : m === 'boltWind' ? -.1 : m === 'stun' ? .9 : .45 + Math.sin(this.t * 1.2) * .05;
    this.neck.rotation.x = lerp(this.neck.rotation.x, nk, k);
    this.head.rotation.z = m === 'stun' ? Math.sin(this.t * 9) * .2 : 0;
    this.tipMat.color.lerp(tmpC.setRGB(.5, .96, 1), .1);
    if (m === 'boltWind') this.tipMat.color.setRGB(1, 1, 1);
  }
  deathAnim(dt) {
    this.dying += dt; this.clearMarkers();
    this.group.rotation.z = Math.min(1, this.dying / 1.1) * Math.PI / 2 * this.tipDir;
    if (R() < dt * 20) sparks(this.tipPos((R() * this.tips.length) | 0), 3, 4);
    if (this.dying > 1.7) { const c = this.center(); puff(c, 5, 50); VS.poof(); VS.thunder(1); flashScreen('#e8fbff', .7); bolt(c.x, this.pos.y, c.z, 36); this.loot(c); this.remove(); }
  }
  loot(c) { spawnDrop('stormhorn_trophy', 1, c); spawnDrop('hard_antler', 3, c); }
  remove() { this.clearMarkers(); super.remove(); }
}
const markTex = charTex(32, 32, g => { const c = '#7ff6ff', d = '#1a6a7a';
  for (let a = 0; a < 64; a++) { const x = Math.round(16 + Math.cos(a / 64 * Math.PI * 2) * 13), y = Math.round(16 + Math.sin(a / 64 * Math.PI * 2) * 13); rr(g, d, x - 1, y - 1, 3, 3); }
  for (let a = 0; a < 64; a++) { const x = Math.round(16 + Math.cos(a / 64 * Math.PI * 2) * 13), y = Math.round(16 + Math.sin(a / 64 * Math.PI * 2) * 13); rr(g, c, x, y, 1, 1); }
  for (const [x, y, w, h] of [[15, 2, 2, 6], [15, 24, 2, 6], [2, 15, 6, 2], [24, 15, 6, 2]]) rr(g, c, x, y, w, h); ln(g, d, 11, 11, 21, 21, 2); ln(g, d, 21, 11, 11, 21, 2); });
const MARK_GEO = new THREE.PlaneGeometry(4.6, 4.6);
function marker(x, z, py, dur) {
  const y = groundAt(x, z, py + 3) + .06;
  const m = new THREE.Mesh(MARK_GEO, new THREE.MeshBasicMaterial({ map: markTex, transparent: true, opacity: .2, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); scene.add(m);
  const mk = { x, y, z, dur, k: 0, dead: false, kill() { if (mk.dead) return; mk.dead = true; scene.remove(m); m.material.dispose(); } };
  fxObjs.push({ upd(dt) { if (mk.dead) return false; m.rotation.z += dt * (1 + mk.k * 5); m.material.opacity = .25 + mk.k * .75 * (.7 + .3 * Math.sin(mk.k * 40)); m.scale.setScalar(1.25 - mk.k * .25);
    if (R() < dt * 12) sparks(new V3(x + (R() - .5) * 3, y + .1, z + (R() - .5) * 3), 1, 2); return true; }, kill() { mk.kill(); } });
  return mk;
}
const WAVE = [new THREE.MeshBasicMaterial({ color: 0x7ff6ff, fog: false }), new THREE.MeshLambertMaterial({ color: 0x6b5a44 }), new THREE.MeshLambertMaterial({ color: 0x5d9b37 })];
function shockwave(cx, cy, cz, dmg) {
  const g = new THREE.Group(), cubes = [], N = 40;
  for (let i = 0; i < N; i++) { const m = new THREE.Mesh(UNIT, WAVE[i % 3]); g.add(m); cubes.push(m); }
  g.position.set(cx, cy, cz); scene.add(g); let r = .6, hit = false;
  fxObjs.push({ upd(dt) { r += dt * 10.5;
    for (let i = 0; i < N; i++) { const a = i / N * Math.PI * 2; cubes[i].position.set(Math.cos(a) * r, .25 + Math.abs(Math.sin(r * 2 + i)) * .25, Math.sin(a) * r); cubes[i].scale.set(.45, .5 * (1 - r / 13) + .1, .45); }
    const P = PL(), d = Math.hypot(P.pos.x - cx, P.pos.z - cz);
    if (!hit && !calm() && Math.abs(d - r) < .9 && P.pos.y - cy < 1.1 && P.onGround) { hit = true; hurt(dmg, 'Stormhorn', (P.pos.x - cx) / (d || 1), (P.pos.z - cz) / (d || 1)); }
    return r < 12; }, kill() { scene.remove(g); } });
}

// ---- Forest Troll (main script): loot + no attacks during the switch, dialog or cinematic
if (typeof troll !== 'undefined' && troll) {
  const oHit = troll.hit.bind(troll), oUpd = troll.update.bind(troll);
  troll.max = troll.max || 60;
  troll.hit = function (dmg, dir) { const alive = !(this.dead > 0) && this.hp > 0; oHit(dmg, dir || new V3());
    if (alive && this.hp <= 0) { const c = this.center(); spawnDrop('troll_hide', 3, c); spawnDrop('troll_trophy', 1, c); onKill(this); } };
  troll.update = function (dt) { if (!(this.dead > 0) && calm()) { this.wind = 0; return; } oUpd(dt); };
  troll.kind = 'troll';
}

// =====================================================================================================
//  Rune blocks, the Stag Altar and the lore stones (built from voxels)
// =====================================================================================================
function addTile(name, draw) { tile(name, draw);
  const i = TILE[name], d = ag.getImageData((i % 16) * 16, Math.floor(i / 16) * 16, 16, 16).data; let r = 0, g = 0, b = 0, n = 0;
  for (let k = 0; k < d.length; k += 4) { if (d[k + 3] < 128) continue; r += d[k]; g += d[k + 1]; b += d[k + 2]; n++; }
  tileColor[i] = new THREE.Color(r / (n || 1) / 255, g / (n || 1) / 255, b / (n || 1) / 255); return i; }
const MOSS = ['#5f7a3a', '#6b8a40', '#4f6a30'];
const tMoss = addTile('vh_mossy_bricks', g => { noiseFill(g, 0, 0, 16, 16, '#7d7d7d', .18);
  for (let y = 0; y < 16; y += 4) { rr(g, '#4e4e4e', 0, y + 3, 16, 1); for (let x = (y / 4) % 2 ? 4 : 0; x < 16; x += 8) rr(g, '#4e4e4e', x, y, 1, 3); rr(g, '#9a9a9a', 0, y, 16, 1); }
  for (let i = 0; i < 26; i++) rr(g, MOSS[i % 3], (R() * 16) | 0, (R() * 16) | 0, 1 + (R() < .4 ? 1 : 0), 1); });
const tRune = addTile('vh_rune_stone', g => { noiseFill(g, 0, 0, 16, 16, '#4a4f57', .16); rr(g, '#5d636c', 0, 0, 16, 1); rr(g, '#5d636c', 0, 0, 1, 16); rr(g, '#2e3238', 0, 15, 16, 1); rr(g, '#2e3238', 15, 0, 1, 16);
  ln(g, '#30343a', 7, 2, 7, 13); ln(g, '#30343a', 7, 4, 11, 8); ln(g, '#30343a', 7, 8, 11, 12); dots(g, '#3e7f8a', [7, 6, 9, 6, 9, 10]); });
const tAltarTop = addTile('vh_altar_top', g => { noiseFill(g, 0, 0, 16, 16, '#6e7178', .14); rr(g, '#3a3d44', 1, 1, 14, 1); rr(g, '#3a3d44', 1, 14, 14, 1); rr(g, '#3a3d44', 1, 1, 1, 14); rr(g, '#3a3d44', 14, 1, 1, 14);
  ln(g, '#2e3238', 8, 12, 8, 7); ln(g, '#2e3238', 8, 7, 4, 3); ln(g, '#2e3238', 8, 7, 12, 3); ln(g, '#2e3238', 6, 5, 4, 6); ln(g, '#2e3238', 10, 5, 12, 6); });
const tAltarSide = addTile('vh_altar_side', g => { noiseFill(g, 0, 0, 16, 16, '#6e7178', .14); rr(g, '#8a8d94', 0, 0, 16, 2); rr(g, '#3a3d44', 0, 2, 16, 1); rr(g, '#3a3d44', 0, 13, 16, 1);
  for (let x = 1; x < 16; x += 3) dots(g, '#2e3238', [x, 7, x + 1, 8]); dots(g, MOSS[0], [2, 14, 3, 15, 11, 14, 12, 15, 13, 14]); });
atlasTex.needsUpdate = true;
const MOSSY = BLOCK.length; def(MOSSY, 'Mossy Stone Bricks', cube(tMoss), 'stone');
const RUNE = BLOCK.length; def(RUNE, 'Rune Stone', cube(tRune), 'stone');
const ALTAR = BLOCK.length; def(ALTAR, 'Stag Altar', cube(tAltarSide, tAltarTop, tAltarSide), 'stone');

// glow overlays: unlit, additive rune quads that sit just outside rune faces
const runeGlowTex = charTex(80, 16, g => {
  const glyphs = [
    [[7, 2, 7, 13], [7, 3, 11, 7], [7, 7, 11, 11]], [[7, 2, 7, 13], [7, 3, 3, 7], [7, 3, 11, 7]], [[4, 2, 4, 13], [11, 2, 11, 13], [4, 3, 11, 12]],
    [[7, 2, 7, 13], [7, 4, 4, 7], [4, 7, 7, 10], [7, 10, 10, 7], [10, 7, 7, 4]], [[8, 13, 8, 8], [8, 8, 4, 3], [8, 8, 12, 3], [6, 5, 3, 6], [10, 5, 13, 6]]];
  glyphs.forEach((gl, k) => { for (const [a, b, c, d] of gl) ln(g, '#0f4a56', k * 16 + a - 1, b - 1, k * 16 + c - 1, d - 1, 3);
    for (const [a, b, c, d] of gl) ln(g, '#37d8f0', k * 16 + a, b, k * 16 + c, d, 1); });
  dots(g, '#bffcff', [7, 2, 23, 3, 36, 2, 55, 2, 72, 8]); });
const runeGlowMat = new THREE.MeshBasicMaterial({ map: runeGlowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide });
const glowQuads = { pos: [], uv: [], idx: [] };
function glowFace(x, y, z, f, variant) {
  const F = FACES[f], o = .02, base = glowQuads.pos.length / 3;
  for (let i = 0; i < 4; i++) { const c = F.c[i]; glowQuads.pos.push(x + c[0] + F.n[0] * o, y + c[1] + F.n[1] * o, z + c[2] + F.n[2] * o);
    glowQuads.uv.push((variant + F.uv[i][0]) / 5, F.uv[i][1]); }
  glowQuads.idx.push(base, base + 1, base + 2, base + 2, base + 1, base + 3);
}
const SIDES = [0, 1, 4, 5];
const touched = new Set();
const setB = (x, y, z, t) => { set(x, y, z, t); touched.add(Math.floor(x / CS) + ',' + Math.floor(z / CS)); };
const ALT = { cx: 40, cz: 130, y: 10, x: 40, z: 130 };
const LORE = [];
const haloSprites = [];
function findSpot(cx, cz, rad) {
  let best = null, bs = 1e9;
  for (let dz = -rad; dz <= rad; dz++) for (let dx = -rad; dx <= rad; dx++) {
    const x = Math.round(cx + dx), z = Math.round(cz + dz); if (x < 8 || z < 8 || x > WX - 8 || z > WZ - 8) continue;
    let ok = true, mn = 99, mx = -99;
    for (let a = -2; a <= 2 && ok; a++) for (let b = -2; b <= 2; b++) { const i = (z + b) * WX + x + a; if (reserved[i]) { ok = false; break; } const h = hmap[i]; mn = Math.min(mn, h); mx = Math.max(mx, h);
      const tp = groundY(x + a, z + b).t; if (tp !== GRASS) { ok = false; break; } }
    if (!ok || mn <= SEA + 1) continue;
    const s = (mx - mn) * 4 + Math.hypot(dx, dz) * .3; if (s < bs) { bs = s; best = { x, z }; }
  }
  return best;
}
function buildAltar() {
  let best = null, bs = 1e9;
  for (let cz = 112; cz <= 146; cz += 2) for (let cx = 18; cx <= 66; cx += 2) {
    let mn = 99, mx = -99, bad = 0, grass = 0;
    for (let dz = -7; dz <= 7; dz++) for (let dx = -7; dx <= 7; dx++) { if (dx * dx + dz * dz > 56) continue; const x = cx + dx, z = cz + dz, i = z * WX + x;
      if (reserved[i]) { bad++; continue; } const h = hmap[i]; mn = Math.min(mn, h); mx = Math.max(mx, h); if (h <= SEA + 1) bad++; else if (get(x, h, z) === GRASS) grass++; }
    const s = bad * 50 + (mx - mn) * 6 - grass * .3 + Math.hypot(cx - 40, cz - 130) * .3;
    if (s < bs) { bs = s; best = { cx, cz, mn, mx }; }
  }
  const cx = best.cx, cz = best.cz, y0 = Math.max(SEA + 2, Math.round((best.mn + best.mx) / 2));
  Object.assign(ALT, { cx: cx + .5, cz: cz + .5, x: cx, z: cz, y: y0 });
  for (let dz = -12; dz <= 12; dz++) for (let dx = -12; dx <= 12; dx++) { if (dx * dx + dz * dz > 144) continue;
    for (let y = 1; y < WY; y++) { const t = get(cx + dx, y, cz + dz); if (t === LOG || t === LEAVES) setB(cx + dx, y, cz + dz, AIR); } }
  for (let dz = -9; dz <= 9; dz++) for (let dx = -9; dx <= 9; dx++) {
    const r = Math.hypot(dx, dz); if (r > 8.4) continue; const x = cx + dx, z = cz + dz, edge = r > 6.6;
    const ring = r >= 5.35 && r < 6.25;
    for (let y = y0 - 3; y <= y0; y++) setB(x, y, z, y === y0 ? (edge ? GRASS : ring ? RUNE : MOSSY) : edge ? DIRT : STONE);
    for (let y = y0 + 1; y < y0 + 18; y++) setB(x, y, z, AIR);
    hmap[z * WX + x] = y0;
    if (ring) glowFace(x, y0, z, 3, (Math.round(Math.atan2(dz, dx) * 3) % 4 + 4) % 4);
  }
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) setB(cx + dx, y0 + 1, cz + dz, MOSSY);
  setB(cx, y0 + 2, cz, ALTAR); glowFace(cx, y0 + 2, cz, 3, 4);
  for (const f of SIDES) glowFace(cx, y0 + 2, cz, f, 4);
  for (const [px, pz] of [[-4, -4], [4, -4], [-4, 4], [4, 4]]) {
    for (let y = y0 + 1; y <= y0 + 4; y++) { setB(cx + px, y, cz + pz, RUNE); for (const f of SIDES) glowFace(cx + px, y, cz + pz, f, (y + px + pz * 2 + f + 40) % 4); }
    setB(cx + px, y0 + 5, cz + pz, MOSSY);
    const h = halo(0x5ff0ff, 3.2, .35); h.position.set(cx + px + .5, y0 + 6.3, cz + pz + .5); scene.add(h); haloSprites.push(h);
  }
}
const LORE_TEXT = [
  { name: 'Stone of Landing', lines: ['The runes are worn, but they still glow:', '"Many ships found Skarnholm. None sailed away. The isle keeps the weak and lets only the proven go."'] },
  { name: 'Stone of the Stag', lines: ['A great stag is carved under the runes:', '"The stag drank the lightning and never stopped. Lay two crowns of its kin upon the altar stone, and the storm will walk."'] },
  { name: 'Stone of the Grey Folk', lines: ['Small grey figures are scratched into the rock:', '"When the sun sleeps, the grey folk wake. They hoard pine sap and throw stones at the bold. Meet them with steel."'] },
];
function buildLore() {
  const start = DEFS[1] ? DEFS[1].pos : [88, 113];
  const spots = [[start[0] + 14, start[1] + 12], [54, 64], [(start[0] + ALT.cx) / 2, (start[1] + ALT.cz) / 2 - 6]];
  spots.forEach((s, i) => { const p = findSpot(s[0], s[1], 12); if (!p) return; const h = groundY(p.x, p.z).y - 1;
    for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { setB(p.x + a, h, p.z + b, MOSSY); if (BLOCK[get(p.x + a, h + 1, p.z + b)].kind === 'cross') setB(p.x + a, h + 1, p.z + b, AIR); }
    for (let y = h + 1; y <= h + 3; y++) { setB(p.x, y, p.z, RUNE); if (y > h + 1) for (const f of SIDES) glowFace(p.x, y, p.z, f, (y + i + f) % 4); }
    const hs = halo(0x5ff0ff, 2.2, .3); hs.position.set(p.x + .5, h + 4.4, p.z + .5); scene.add(hs); haloSprites.push(hs);
    LORE.push({ x: p.x, z: p.z, y: h, ...LORE_TEXT[i], read: false }); });
}
try { buildAltar(); buildLore(); } catch (e) { console.error('valheim: build failed', e); }
for (const k of touched) { const [a, b] = k.split(',').map(Number); buildChunk(a, b); }
const glowMesh = (() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(glowQuads.pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(glowQuads.uv, 2)); g.setIndex(glowQuads.idx); g.computeBoundingSphere();
  const m = new THREE.Mesh(g, runeGlowMat); m.renderOrder = 3; scene.add(m); return m; })();
const loreAt = (x, z) => LORE.find(l => Math.abs(l.x - x) <= 1 && Math.abs(l.z - z) <= 1);
const isAltarBlock = h => Math.abs(h.x - ALT.x) <= 4 && Math.abs(h.z - ALT.z) <= 4 && h.y > ALT.y && (h.t === ALTAR || h.t === MOSSY || h.t === RUNE);

// =====================================================================================================
//  UI: dialog (Korra / rune stones), titles, subtitles, advancement toasts, quest line
// =====================================================================================================
const css = document.createElement('style');
css.textContent = `
#vhUI { position: fixed; inset: 0; pointer-events: none; z-index: 6; font-family: var(--ui); color: #fff; }
#vhFade { position: absolute; inset: 0; background: #000; opacity: 0; }
#vhDlg { position: absolute; left: 50%; bottom: calc(132px + env(safe-area-inset-bottom, 0px)); transform: translateX(-50%); width: min(580px, 92%); box-sizing: border-box;
  display: flex; gap: 12px; align-items: flex-start; padding: 10px 14px 24px 10px; background: rgba(0,0,0,.74); border: 2px solid #111; box-shadow: inset 0 0 0 2px #555;
  pointer-events: auto; cursor: pointer; touch-action: none; }
#vhDlg canvas { width: 64px; height: 64px; image-rendering: pixelated; flex: none; box-shadow: 0 0 0 2px #111, inset 0 0 0 2px #555; }
#vhDlg .who { color: #ffff55; font-size: 17px; font-weight: 600; text-shadow: 2px 2px 0 #3f3f00; }
#vhDlg .txt { font-size: 18px; line-height: 1.3; min-height: 2.6em; text-shadow: 2px 2px 0 #3f3f3f; }
#vhDlg .more { position: absolute; right: 10px; bottom: 4px; font-size: 13px; color: #aaa; animation: vhBlink 1s steps(2) infinite; }
@keyframes vhBlink { 50% { opacity: 0; } }
#vhTitle { position: absolute; left: 0; right: 0; top: 24%; text-align: center; opacity: 0; transition: opacity .6s; }
#vhTitle b { display: block; font-weight: 600; font-size: clamp(30px, 6.5vmin, 58px); letter-spacing: 2px; text-shadow: 4px 4px 0 #3f3f3f; }
#vhTitle span { display: block; margin-top: 8px; font-size: clamp(15px, 2.8vmin, 22px); text-shadow: 2px 2px 0 #3f3f3f; }
#vhSub { position: absolute; left: 50%; top: calc(100px + env(safe-area-inset-top, 0px)); transform: translateX(-50%); width: min(640px, 92%); text-align: center;
  font-size: 19px; line-height: 1.3; opacity: 0; transition: opacity .5s; text-shadow: 2px 2px 0 #3f3f3f; }
#vhAdv { position: absolute; right: 12px; top: calc(12px + env(safe-area-inset-top, 0px)); width: 300px; display: flex; gap: 10px; align-items: center; padding: 10px 12px; box-sizing: border-box;
  background: #212121; border: 2px solid #000; box-shadow: inset 0 0 0 2px #555; transition: transform .5s, opacity .5s; }
#vhAdv.out { transform: translateX(340px); opacity: 0; }
#vhAdv b { display: block; color: #ffff55; font-weight: 600; font-size: 17px; }
#vhAdv.ch b { color: #ff55ff; }
#vhAdv span { font-size: 15px; color: #fff; }
#vhAdv canvas { width: 32px; height: 32px; image-rendering: pixelated; flex: none; }
#vhGoal { position: absolute; left: 8px; top: calc(8px + env(safe-area-inset-top, 0px)); max-width: 260px; background: rgba(0,0,0,.42); padding: 3px 8px 5px; font-size: 15px; line-height: 1.25; text-shadow: 2px 2px 0 #3f3f3f; }
#vhGoal b { display: block; color: #ffaa00; font-weight: 600; font-size: 13px; }
.msg.vhA { color: #55ff55; } .msg.vhC { color: #ff55ff; }
html.touch #vhDlg { bottom: calc(152px + env(safe-area-inset-bottom, 0px)); width: min(480px, 56%); padding: 8px 10px 20px 8px; gap: 8px; }
html.touch #vhDlg .more { font-size: 11px; }
html.touch #vhDlg canvas { width: 48px; height: 48px; }
html.touch #vhDlg .txt { font-size: 15px; } html.touch #vhDlg .who { font-size: 14px; }
html.touch #vhSub { top: auto; bottom: calc(152px + env(safe-area-inset-bottom, 0px)); font-size: 15px; width: min(560px, 60%); }
html.touch #vhAdv { top: calc(56px + env(safe-area-inset-top, 0px)); right: 10px; width: min(250px, 40%); padding: 6px 8px; }
html.touch #vhAdv b { font-size: 14px; } html.touch #vhAdv span { font-size: 13px; }
html.touch #vhGoal { left: auto; top: auto; bottom: calc(184px + env(safe-area-inset-bottom, 0px)); right: 8px; max-width: 30%; font-size: 13px; }
html.touch #vhTitle { top: 20%; }
`;
document.head.appendChild(css);
const ui = document.createElement('div'); ui.id = 'vhUI'; ui.hidden = true;
ui.innerHTML = `<div id="vhFade"></div><div id="vhTitle"><b></b><span></span></div><div id="vhSub"></div>
<div id="vhGoal" hidden><b>Quest</b><span></span></div>
<div id="vhAdv" class="out"><canvas width="32" height="32"></canvas><div><b>Advancement Made!</b><span></span></div></div>
<div id="vhDlg" hidden role="dialog" aria-live="polite"><canvas width="16" height="16"></canvas><div><div class="who"></div><div class="txt"></div></div><div class="more"></div></div>`;
document.body.appendChild(ui);
const $ = s => ui.querySelector(s);
const fadeEl = $('#vhFade'), titleBox = $('#vhTitle'), subEl = $('#vhSub'), goalEl = $('#vhGoal'), advEl = $('#vhAdv'), dlgEl = $('#vhDlg');
$('#vhDlg .more').textContent = TOUCH ? 'Tap to continue ▼' : 'Click or Enter ▼';
const PORTRAIT = { korra: g => { rr(g, '#38485e', 0, 0, 16, 16); rr(g, '#4a5d78', 0, 0, 16, 3); drawRavenHead(g); },
  rune: g => { rr(g, '#1c2230', 0, 0, 16, 16); ICON.rune(g); }, altar: g => { rr(g, '#1c2230', 0, 0, 16, 16); ICON.hard_antler(g); } };

const dlg = { open: false, q: [], cur: null, idx: 0, text: '', shown: 0, openedAt: 0 };
function talk(who, portrait, lines, done) { dlg.q.push({ who, portrait, lines, done }); if (!dlg.open) nextConv(); }
function fill(s) { const a = ALT, P = PL(); return s.replace(/\{name\}/g, DEFS[cur].name).replace(/\{dir\}/g, compass(a.cx - P.pos.x, a.cz - P.pos.z)); }
function nextConv() {
  const c = dlg.q.shift(); if (!c) { dlg.open = false; dlgEl.hidden = true; return; }
  dlg.cur = c; dlg.idx = 0; dlg.open = true; dlgEl.hidden = false; dlg.openedAt = performance.now(); mining = false;
  $('#vhDlg .who').textContent = c.who;
  const cv = $('#vhDlg canvas'), g = cv.getContext('2d'); g.clearRect(0, 0, 16, 16); (PORTRAIT[c.portrait] || PORTRAIT.korra)(g);
  showLine();
}
function showLine() { dlg.text = fill(dlg.cur.lines[dlg.idx]); dlg.shown = 0; $('#vhDlg .txt').textContent = ''; }
function dlgAdvance() {
  if (!dlg.open || performance.now() - dlg.openedAt < 180) return;
  if (dlg.shown < dlg.text.length) { dlg.shown = dlg.text.length; $('#vhDlg .txt').textContent = dlg.text; return; }
  VS.page(); dlg.idx++;
  if (dlg.idx < dlg.cur.lines.length) { showLine(); return; }
  const done = dlg.cur.done; dlg.cur = null; dlg.open = false; dlgEl.hidden = true;
  try { if (done) done(); } catch (e) { console.error(e); }
  if (!dlg.open) nextConv();
}
dlgEl.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); dlgAdvance(); });
addEventListener('pointerdown', e => {                       // desktop: any click on the game advances the dialog
  if (!dlg.open || state !== 'play' || e.pointerType === 'touch' || e.target !== canvas) return;
  if (!locked && !noLock) return;
  e.stopPropagation(); e.preventDefault(); dlgAdvance();
}, true);

let subT = 0, titleT = 0, fadeT = 0;
function subtitle(text, secs = 4) { subEl.textContent = text; subT = secs; }
function bigTitle(title, sub, secs = 4, color = '#fff') { titleBox.querySelector('b').textContent = title; titleBox.querySelector('b').style.color = color; titleBox.querySelector('span').textContent = sub || ''; titleT = secs; }

const ADV = {
  washed: ['Washed Ashore', 'raven'], hunt: ['First Hunt', 'raw_meat'], trophy: ['Proof of Strength', 'deer_trophy'], rune: ['Old Words', 'rune'],
  lore: ['Lore Keeper', 'rune'], night: ['Sunrise Survivor', 'moon'], greyling: ['Stones and Sap', 'resin'], altar: ['The Stag Altar', 'rune'],
  summon: ['Storm Caller', 'hard_antler'], troll: ['Giant Slayer', 'troll_trophy', 1], boss: ['Stormbreaker', 'stormhorn_trophy', 1],
};
const advDone = {}, advQ = []; let advT = 0;
function advance(key) {
  const a = ADV[key]; if (!a || advDone[key]) return; advDone[key] = true;
  advQ.push({ title: a[0], icon: a[1], ch: !!a[2] });
  chat(`${DEFS[cur].name} has ${a[2] ? 'completed the challenge' : 'made the advancement'} [${a[0]}]`, a[2] ? 'vhC' : 'vhA');
}
function advTick(dt) {

  if (advT > 0) { advT -= dt; if (advT <= 0) { advEl.classList.add('out'); advT = -.7; } return; }
  if (advT < 0) { advT = Math.min(0, advT + dt); return; }
  if (!advQ.length || state === 'switching' || !toastEl.classList.contains('out')) return;   // wait for the main game's toast to leave
  const a = advQ.shift();
  advEl.classList.toggle('ch', a.ch); advEl.querySelector('b').textContent = a.ch ? 'Challenge Complete!' : 'Advancement Made!'; advEl.querySelector('span').textContent = a.title;
  const g = advEl.querySelector('canvas').getContext('2d'); g.imageSmoothingEnabled = false; g.clearRect(0, 0, 32, 32); g.drawImage(iconCanvas(a.icon), 0, 0, 32, 32);
  advEl.classList.remove('out'); advT = 4.5; VS.chime(a.ch);
}

// =====================================================================================================
//  Korra, the raven guide
// =====================================================================================================
class Raven {
  constructor() {
    const g = this.group = new THREE.Group(); g.visible = false; scene.add(g);
    const M = t => new THREE.MeshLambertMaterial({ map: t });
    const black = M(tx('r_black', 8, 8, '#17171f', g2 => dots(g2, '#2c2c44', [1, 1, 2, 1, 1, 2, 5, 3])));
    const wingT = M(tx('r_wing', 8, 8, '#14141c', g2 => { for (let x = 0; x < 8; x += 2) rr(g2, '#262638', x, 0, 1, 8); }));
    const face = M(tx('r_face', 8, 8, '#17171f', g2 => rr(g2, '#262638', 0, 1, 8, 1)));
    const beak = M(tx('r_beak', 4, 4, '#4a4a55'));
    const B = (w, h, d, m, x, y, z, p = g) => { const b = new THREE.Mesh(boxGeo(w, h, d), m); b.position.set(x, y, z); p.add(b); return b; };
    this.body = new THREE.Group(); g.add(this.body);
    B(.26, .24, .42, black, 0, .3, 0, this.body);
    const tail = B(.16, .04, .24, wingT, 0, .33, -.3, this.body); tail.rotation.x = -.35;
    this.head = new THREE.Group(); this.head.position.set(0, .42, .18); this.body.add(this.head);
    B(.2, .2, .2, [black, black, black, black, face, black], 0, .05, .04, this.head);
    B(.07, .06, .16, beak, 0, .02, .2, this.head);
    for (const s of [-1, 1]) B(.02, .04, .04, glowMat(0x6ff3ff), s * .101, .08, .08, this.head);
    this.wings = [];
    for (const s of [-1, 1]) { const p = new THREE.Group(); p.position.set(s * .13, .4, .02); this.body.add(p); B(.42, .03, .3, wingT, s * .21, 0, -.02, p); this.wings.push(p); }
    for (const s of [-1, 1]) B(.03, .16, .03, beak, s * .06, .08, .03, this.body);
    g.scale.setScalar(1.15);
    this.mode = 'gone'; this.t = 0; this.p0 = new V3(); this.p1 = new V3();
  }
  arrive(cb) {
    const P = PL(), fx0 = -Math.sin(P.yaw), fz0 = -Math.cos(P.yaw), rx = Math.cos(P.yaw), rz = -Math.sin(P.yaw);
    let lx = P.pos.x + fx0 * 3.4 + rx * .8, lz = P.pos.z + fz0 * 3.4 + rz * .8, ly = groundAt(lx, lz, P.pos.y + 2.5);
    if (Math.abs(ly - P.pos.y) > 1.6) { lx = P.pos.x + rx * 1.2; lz = P.pos.z + rz * 1.2; ly = groundAt(lx, lz, P.pos.y + 1.5); }
    this.p1.set(lx, ly, lz); this.p0.set(lx - fx0 * 7 + rx * 5, ly + 10, lz - fz0 * 7 + rz * 5);
    this.group.position.copy(this.p0); this.group.visible = true; this.mode = 'in'; this.t = 0; this.cb = cb; VS.caw();
  }
  leave() { if (this.mode === 'gone') return; const P = PL(); this.p0.copy(this.group.position);
    const dx = this.p0.x - P.pos.x, dz = this.p0.z - P.pos.z, l = Math.hypot(dx, dz) || 1;
    this.p1.set(this.p0.x + dx / l * 16, this.p0.y + 14, this.p0.z + dz / l * 16); this.mode = 'out'; this.t = 0; VS.caw(); }
  update(dt) {
    if (this.mode === 'gone') return;
    const g = this.group, P = PL(); this.t += dt;
    if (this.mode === 'in' || this.mode === 'out') {
      const k = clamp(this.t / (this.mode === 'in' ? 1.8 : 2.6), 0, 1), e = this.mode === 'in' ? 1 - Math.pow(1 - k, 2) : k * k;
      const px = g.position.x, pz = g.position.z;
      g.position.lerpVectors(this.p0, this.p1, e); g.position.y += Math.sin(Math.PI * k) * 1.2;
      const mx = g.position.x - px, mz = g.position.z - pz; if (Math.abs(mx) + Math.abs(mz) > 1e-4) g.rotation.y = Math.atan2(mx, mz);
      const fl = Math.sin(this.t * 22) * .9; this.wings[0].rotation.z = fl; this.wings[1].rotation.z = -fl; this.body.rotation.x = -.15;
      if (k >= 1) { if (this.mode === 'in') { this.mode = 'land'; this.t = 0; const cb = this.cb; this.cb = null; if (cb) cb(); } else { this.mode = 'gone'; g.visible = false; } }
    } else {
      g.rotation.y = Math.atan2(P.pos.x - g.position.x, P.pos.z - g.position.z);
      this.wings[0].rotation.z = lerp(this.wings[0].rotation.z, -1.3, .3); this.wings[1].rotation.z = lerp(this.wings[1].rotation.z, 1.3, .3);
      this.body.rotation.x = 0; this.head.rotation.x = Math.sin(this.t * 3) > .7 ? .35 : 0; this.head.rotation.y = Math.sin(this.t * 1.3) * .3;
      const hop = (this.t % 2.6) < .25; g.position.y = this.p1.y + (hop ? Math.sin((this.t % 2.6) / .25 * Math.PI) * .18 : 0);
      if (P.pos.distanceTo(g.position) > 16) this.leave();
    }
  }
}
const raven = new Raven();
const korraQ = []; let korraBusy = false;
function korra(lines, done) { korraQ.push({ lines, done }); }
function korraTick() {
  if (korraBusy || !korraQ.length || state !== 'play' || dlg.open || cine) return;
  korraBusy = true; const v = korraQ.shift();
  raven.arrive(() => talk('Korra', 'korra', v.lines, () => { raven.leave(); korraBusy = false; if (v.done) v.done(); }));
}
const STORY = {
  intro: ['Kraa! Awake at last, {name}. The sea spat you onto Skarnholm, the island at the edge of the north.',
    'No ship leaves this place by luck. The isle keeps the weak. Only the proven may sail away.',
    'So prove yourself. Hunt the deer of the meadows and take their crowned heads as trophies.',
    'Your hands still work. Break trees for wood, open your bag and make planks and a workbench. Torches and a bed make the nights kinder.',
    'Bring two to the Stag Altar, {dir} of here. What answers there... you will see. I am Korra. I watch. Kraa!'],
  night: ['Night falls, {name}. Listen... the grey folk are crawling out of the pines.',
    'Greylings. Small and sneaky, and they throw stones. Keep moving and hit back hard. Kraa!'],
  trophy1: ['A trophy! The isle has noticed you, {name}.', 'One more deer crown and the Stag Altar will listen.'],
  trophy2: ['A trophy! The isle has noticed you, {name}.', 'You carry enough now. Go to the Stag Altar, {dir} of here.'],
  altar: ['This is the Stag Altar. Feel the air buzz? The storm sleeps under these stones.',
    'Lay two deer trophies on the altar (use it) and stand ready. It wakes angry. Kraa!'],
  end: ['The storm is broken! Did you feel the isle loosen its grip? Only a little. Kraa.',
    'Those antlers are harder than iron. At a workbench they will make a pick that bites stone.',
    'But past the meadows the pines grow dark and old, and something there has roots deeper than this isle.',
    'Rest, {name}. Then we go on.'],
};

// =====================================================================================================
//  Quest progress, milestones, kills and pickups
// =====================================================================================================
const flags = {}; let stage = 0;
function addXP(k) { const d = DEFS[cur]; d.xp += k; while (d.xp >= 1) { d.xp -= 1; d.lvl++; } drawStats(); }
function onKill(e) {
  const k = e.kind;
  if (k === 'deer' || k === 'boar') { advance('hunt'); addXP(k === 'deer' ? .12 : .15); }
  if (k === 'greyling') { advance('greyling'); addXP(.2); }
  if (k === 'troll') { advance('troll'); addXP(.6); }
  if (k === 'stormhorn') bossDefeated(e);
}
function onPickup(id) {
  if (/_trophy$/.test(id)) advance('trophy');
  if (id === 'deer_trophy' && !flags.trophy && stage < 2) { flags.trophy = true; const two = countItem('deer_trophy') >= 2; if (two) flags.trophy2 = true; korra(two ? STORY.trophy2 : STORY.trophy1); }
  else if (id === 'deer_trophy' && !flags.trophy2 && stage < 2 && countItem('deer_trophy') >= 2) { flags.trophy2 = true; const q = korraQ.find(o => o.lines === STORY.trophy1); if (q) q.lines = STORY.trophy2; else korra(STORY.trophy2.slice(1)); }
}
function milestones() {
  const P = PL(), night = isNight();
  if (night && !flags.night && flags.intro) { flags.night = true; korra(STORY.night); }
  if (!night && flags.night && !flags.dawn) { flags.dawn = true; advance('night'); }
  if (!flags.altar && Math.hypot(P.pos.x - ALT.cx, P.pos.z - ALT.cz) < 13) { flags.altar = true; advance('altar'); if (stage < 2) korra(STORY.altar); }
}
let goalT = 0;
function updateGoal() {
  let txt;
  const P = PL(), dx = ALT.cx - P.pos.x, dz = ALT.cz - P.pos.z, dist = Math.round(Math.hypot(dx, dz));
  if (stage >= 3) txt = 'Chapter I complete. The Dark Forest awaits...';
  else if (boss && !boss.removed) txt = 'Defeat Stormhorn!';
  else { const n = countItem('deer_trophy');
    txt = n < 2 ? `Hunt deer for trophies: ${n}/2` : `Offer 2 deer trophies at the Stag Altar (${dist} m ${compass(dx, dz)})`; }
  goalEl.hidden = !flags.intro || showDebug || (TOUCH && dlg.open);   // phones: the dialog box would cover it
  goalEl.querySelector('span').textContent = txt;
}

// =====================================================================================================
//  The altar, rune stones and the boss fight
// =====================================================================================================
function useAltar() {
  if (boss && !boss.removed) { subtitle('The altar crackles. Stormhorn is already here!', 3); return; }
  if (stage >= 3) { subtitle('The altar is quiet now. The storm has passed.', 3); return; }
  const held = hasInv() && Inv.held ? (() => { try { return Inv.held(); } catch (e) { return null; } })() : null;
  if (countItem('deer_trophy') >= 2 || (held && held.id === 'deer_trophy' && held.n >= 2)) {
    if (!removeItem('deer_trophy', 2)) { subtitle('The altar wants two deer trophies.', 3); return; }
    summonBoss();
  } else { subtitle(`The stone is cold. Two deer trophies must be laid here (${countItem('deer_trophy')}/2).`, 3.5); VS.rune(); }
}
function readRune(l) {
  VS.rune(); talk(l.name, 'rune', l.lines);
  if (!l.read) { l.read = true; advance('rune'); if (LORE.every(o => o.read)) advance('lore'); }
}
function summonBoss() {
  const P = PL(); let dx = P.pos.x - ALT.cx, dz = P.pos.z - ALT.cz; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
  const bx = ALT.cx + dx * 3.6, bz = ALT.cz + dz * 3.6;
  bolt(ALT.cx, ALT.y + 3, ALT.cz, 40); bolt(bx, ALT.y + 1, bz, 40); flashScreen('#e8fbff', .9); VS.thunder(1.2); shakeT = Math.max(shakeT, 1.2);
  boss = new Stormhorn(); boss.yaw = Math.atan2(dx, dz); boss.immune = true; boss.spawnAt(bx, bz); puff(boss.center(), 5, 40);
  cine = { t: 0, dur: 4.3, boss };
  bigTitle('STORMHORN', 'Thunder of the Meadows', 4.6, '#7ff6ff');
  subtitle('The sky splits open. Something old answers the offering.', 4.6);
  later(1.5, () => { VS.bellow(); shakeT = Math.max(shakeT, .6); });
  later(2.6, () => { if (boss) bolt(boss.pos.x + 3, boss.pos.y, boss.pos.z - 2, 30); VS.thunder(.6); flashScreen('#d8f6ff', .4); });
  advance('summon'); stage = 2;
}
function despawnBoss(refund) {
  if (!boss) return; const b = boss; boss = null; puff(b.center(), 5, 30); b.remove(); VS.thunder(.5);
  if (refund) { spawnDrop('deer_trophy', 2, new V3(ALT.cx, ALT.y + 3.2, ALT.cz)); chat('Stormhorn fades into the clouds... the offering lies on the altar again.'); stage = 1; }
}
function bossDefeated(b) {
  stage = 3; chat(`Stormhorn was slain by ${DEFS[cur].name}`); addXP(3);
  bigTitle('STORMHORN DEFEATED', 'The storm over Skarnholm breaks', 4.5, '#7ff6ff');
  later(.3, () => advance('boss'));
  later(5, () => korra(STORY.end, () => {
    bigTitle('CHAPTER I COMPLETE', 'Next: The Dark Forest. The Old Root stirs beneath the pines...', 8, '#ffaa00');
    later(1.5, () => subtitle('To be continued...', 6));
  }));
  later(2.2, () => { if (boss === b) boss = null; });
}

// =====================================================================================================
//  Spawning and despawning (tuned for phones)
// =====================================================================================================
const KINDS = { deer: Deer, boar: Boar, greyling: Greyling };
const CAP = { deer: 5, boar: 4, greyling: 5 }, TOTAL_CAP = 20;
let spawnT = 0;
function spawnSpot(P, r0, r1) {
  for (let k = 0; k < 10; k++) {
    const a = R() * Math.PI * 2, r = r0 + R() * (r1 - r0), x = P.pos.x + Math.cos(a) * r, z = P.pos.z + Math.sin(a) * r;
    if (x < 5 || z < 5 || x > WX - 5 || z > WZ - 5) continue;
    const xi = Math.floor(x), zi = Math.floor(z); if (reserved[zi * WX + xi]) continue;
    if (Math.hypot(x - ALT.cx, z - ALT.cz) < 11) continue;
    const gy = groundY(x, z); if (gy.t !== GRASS || gy.y <= SEA + 1) continue;
    return { x: xi + .5, z: zi + .5 };
  }
  return null;
}
function spawn(kind, x, z) { const C = KINDS[kind]; if (!C) return null; const e = new C(); return e.spawnAt(x, z); }
function spawnTick(dt) {
  spawnT -= dt; if (spawnT > 0) return; spawnT = 1.5;
  const P = PL(), cnt = { deer: 0, boar: 0, greyling: 0 }; let total = 0;
  for (const e of ENTITIES) if (!(e.dead > 0) && !e.removed) total++;
  for (const e of CREATURES) {
    if (e.removed || e.dead > 0) continue;
    if (!e.isBoss && Math.hypot(e.pos.x - P.pos.x, e.pos.z - P.pos.z) > 76) { e.remove(); continue; }
    if (cnt[e.kind] !== undefined) cnt[e.kind]++;
  }
  if (total >= TOTAL_CAP || cine) return;
  const night = isNight();
  const want = night ? [['greyling', CAP.greyling, 14, 26], ['deer', 3, 26, 44], ['boar', 3, 26, 44]] : [['deer', CAP.deer, 22, 42], ['boar', CAP.boar, 22, 42]];
  for (const [k, cap, r0, r1] of want) if (cnt[k] < cap && R() < (k === 'greyling' ? .55 : .35)) { const s = spawnSpot(P, r0, r1); if (s) { spawn(k, s.x, s.z); return; } }
}

// =====================================================================================================
//  Hooks into the main game
// =====================================================================================================
(HOOKS.use || (HOOKS.use = [])).unshift(() => {
  if (state !== 'play') return false;
  if (dlg.open) { dlgAdvance(); return true; }
  const h = targetBlock(); if (!h) return false;
  if (h.t === RUNE) { const l = loreAt(h.x, h.z); if (l) { readRune(l); return true; } }
  if (isAltarBlock(h)) {
    if (h.t === RUNE && (Math.abs(h.x - ALT.x) === 4 && Math.abs(h.z - ALT.z) === 4)) { VS.rune(); talk('Rune Pillar', 'rune', ['The pillar hums with stored lightning:', '"Two crowns of the deer, laid upon the stone, wake the storm."']); return true; }
    useAltar(); return true;
  }
  return false;
});
const entityInFront = () => { const P = PL(), eye = P.eye, dir = lookDir(P.yaw, P.pitch);
  return ENTITIES.some(e => { if (e.dead > 0) return false; const to = e.center().sub(eye), d = to.length(); return d < 4.2 && to.normalize().dot(dir) > .8; }); };
(HOOKS.attack || (HOOKS.attack = [])).unshift(() => {
  if (state !== 'play') return false;
  if (dlg.open) return true;                                     // no swinging while reading
  if (entityInFront()) return false;
  const h = targetBlock();                                       // the altar and rune stones can't be broken
  if (h && (h.t === RUNE || h.t === ALTAR || isAltarBlock(h))) { mining = false; if (AC) VS.pebble(); return true; }
  return false;
});
(HOOKS.key || (HOOKS.key = [])).unshift(e => {
  if (!dlg.open) return false;
  if (['Enter', 'NumpadEnter', 'KeyE', 'KeyF', 'Space'].includes(e.code)) { dlgAdvance(); return true; }
  return false;
});

on('start', () => {
  fadeT = 3.2;
  later(.9, () => subtitle('You wake on a cold shore. The wind smells of salt and pine.', 4));
  const P = PL();
  for (const k of ['deer', 'deer', 'deer', 'boar', 'boar']) { const s = spawnSpot(P, 12, 30); if (s) spawn(k, s.x, s.z); }
  later(3.6, () => korra(STORY.intro, () => { flags.intro = true; stage = Math.max(stage, 1); advance('washed'); updateGoal(); }));
});

let lastBossName = '';
const bossNameEl = bossEl.querySelector('.mc'), bossTrack = bossEl.querySelector('i');
on('frame', (dt) => {
  if (state === 'title') return;
  const ph = phase + dt / DAY_LEN; if (ph >= 1) dayN++; phase = ph % 1;
  skyT -= dt; applyDay(false);
  updateDrops(dt); updateStones(dt); updateParts(dt); raven.update(dt);
  const pulse = .7 + .3 * Math.sin(performance.now() / 600); runeGlowMat.opacity = pulse * lerp(1, .75, dayK);
  for (const h of haloSprites) h.material.opacity = lerp(.55, .18, dayK) * pulse;
  if (state === 'play') { spawnTick(dt); milestones(); korraTick(); }
  for (let i = ENTITIES.length - 1; i >= 0; i--) if (ENTITIES[i].removed) ENTITIES.splice(i, 1);
  for (let i = CREATURES.length - 1; i >= 0; i--) if (CREATURES[i].removed) CREATURES.splice(i, 1);
  if (boss && boss.removed) boss = null;
});

on('tick', rawDt => {
  ui.hidden = state === 'title';
  ui.style.visibility = state === 'switching' || state === 'wheel' ? 'hidden' : '';
  if (state !== 'pause' && state !== 'title') runTimers(rawDt);
  // dialog typewriter
  if (dlg.open && dlg.shown < dlg.text.length) { const n0 = Math.floor(dlg.shown); dlg.shown = Math.min(dlg.text.length, dlg.shown + rawDt * 48);
    if (Math.floor(dlg.shown) !== n0) $('#vhDlg .txt').textContent = dlg.text.slice(0, Math.floor(dlg.shown)); }
  if (subT > 0) subT -= rawDt; subEl.style.opacity = subT > 0 && !dlg.open ? 1 : 0;
  if (titleT > 0) titleT -= rawDt; titleBox.style.opacity = titleT > 0 ? 1 : 0;
  if (fadeT > 0 && state !== 'pause') { fadeT -= rawDt; fadeEl.style.opacity = clamp(fadeT / 2.6, 0, 1).toFixed(3); }
  advTick(rawDt);
  goalT -= rawDt; if (goalT <= 0 && state !== 'title') { goalT = .5; updateGoal(); }
  // sky: moon and stars follow the camera
  moon.position.copy(camera.position).addScaledVector(moonDir, 560); moon.lookAt(camera.position);
  stars.position.copy(camera.position); stars.rotation.set(.4, 0, time01() * Math.PI * 2);
  // boss bar: Stormhorn when it is up, otherwise the main game's Forest Troll bar
  const P0 = PL();
  if (boss && !boss.removed && boss.dead <= 0 && (state === 'play' || state === 'wheel') && boss.pos.distanceTo(P0.pos) < 70) {
    bossEl.hidden = false; bossFill.style.width = Math.max(0, boss.hp / boss.max * 100) + '%';
    if (lastBossName !== 'storm') { lastBossName = 'storm'; bossNameEl.textContent = 'Stormhorn'; bossFill.style.background = 'linear-gradient(#b4fbff, #1fa3c6)'; bossTrack.style.background = '#0b2f3a'; bossTrack.style.borderColor = '#03141a'; }
  } else if (lastBossName !== 'troll') { lastBossName = 'troll'; bossNameEl.textContent = 'Forest Troll'; bossFill.style.background = ''; bossTrack.style.background = ''; bossTrack.style.borderColor = ''; }
  // boss intro: low dramatic camera
  if (cine) {
    if (state === 'play' && cine.boss && !cine.boss.removed) {
      cine.t += rawDt; const b = cine.boss, k = clamp(cine.t / cine.dur, 0, 1);
      let dx = P0.pos.x - b.pos.x, dz = P0.pos.z - b.pos.z; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
      const ang = .95 - .35 * easeInOutSine(k), dist = 12.5 - 3 * easeInOutSine(k), ca = Math.cos(ang), sa = Math.sin(ang);
      const ox = dx * ca - dz * sa, oz = dz * ca + dx * sa;           // swing the camera off the player's line of sight
      const target = new V3(b.pos.x + ox * dist, b.pos.y + .7, b.pos.z + oz * dist);
      const from = new V3(b.pos.x, b.pos.y + 3, b.pos.z); camCollide(from, target);
      camera.position.copy(target);
      if (shakeT > 0) { camera.position.x += (Math.random() - .5) * shakeT * .6; camera.position.y += (Math.random() - .5) * shakeT * .6; }
      camera.lookAt(b.pos.x, b.pos.y + 5.2 - k * 1.6, b.pos.z); camera.fov = 62; camera.updateProjectionMatrix();
      if (heldMesh) heldMesh.visible = false; P0.group.visible = true; hudEl.style.opacity = 0; touchUI.style.opacity = 0; outline.visible = false;
      if (cine.t >= cine.dur) cine = null;
    } else if (state === 'play') cine = null;
  }
});

applyDay(true);
// draw the first-person held item after the glowing runes / water (it ignores depth, so it must come last)
heldMat.transparent = true; heldMat.needsUpdate = true;

// ---------------------------------------------------------------- public API (contract) + helpers for the lead/tests
const World = {
  time01, isNight, spawnDrop,
  setTime(t) { phase = tToPhase(((t % 1) + 1) % 1); applyDay(true); },
  day: () => dayN, light: () => lightK,
  altar: () => ({ x: ALT.cx, y: ALT.y, z: ALT.cz }),
};
window.World = World;
window.Meadows = {
  skipIntro() { fadeT = 0; fadeEl.style.opacity = 0; korraQ.length = 0; timers.length = 0; flags.intro = true; stage = Math.max(stage, 1); },
  // Continue: put the quest back where it was; a save made mid-fight gets the offering back (the boss is not saved)
  restore(s) { s = s | 0; if (s === 2) { s = 1; if (hasInv()) try { Inv.add('deer_trophy', 2); } catch (e) { /* ignore */ } } stage = Math.max(stage, s); updateGoal(); },
  spawn, summonBoss, despawnBoss, advance, korra, talk, subtitle, bigTitle, bolt,
  get boss() { return boss; }, get stones() { return stones; }, get creatures() { return CREATURES; }, get drops() { return drops; }, get dialog() { return dlg; },
  get stage() { return stage; }, flags, bag, LORE, ALT, raven, dlgAdvance, blocks: { MOSSY, RUNE, ALTAR },
};
})();
