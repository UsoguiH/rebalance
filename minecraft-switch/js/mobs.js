/* Blockcraft — Minecraft mobs & world  (js/mobs.js)
 * Hostile mobs (Zombie, Skeleton, Creeper, Spider) that spawn at night and in dark caves, passive animals
 * (Pig, Sheep, Cow, Chicken) with drops, breeding, shearing and eggs, the Bow with real arrows,
 * cave tunnels + a ravine carved into the world, and the Save API (world diff, time, players, other modules).
 * Public API: window.Mobs, window.Save. Everything is drawn in code. */
(() => {
'use strict';
const R = Math.random;
const hasInv = () => typeof Inv !== 'undefined' && Inv && typeof Inv.add === 'function';
const hasWorld = () => typeof World !== 'undefined' && World;
const isNight = () => hasWorld() ? World.isNight() : false;
const ri = (a, b) => a + Math.floor(R() * (b - a + 1));
const heldId = () => { if (!hasInv()) return null; try { const s = Inv.held(); return s ? s.id : null; } catch (e) { return null; } };
function drop(id, n, p) { n = n | 0; if (n <= 0 || !ITEMS_HAS(id)) return; if (hasWorld()) World.spawnDrop(id, n, p); else if (hasInv()) Inv.add(id, n); }
const ITEMS_HAS = id => typeof ITEMS === 'undefined' || !!ITEMS[id];
function addXP(k) { const d = DEFS[cur]; d.xp = (d.xp || 0) + k; while (d.xp >= 1) { d.xp -= 1; d.lvl = (d.lvl || 0) + 1; } drawStats(); }
const NATURAL = new Set([GRASS, DIRT, STONE, SAND, SANDSTONE, COAL, IRONORE, COBBLE]);
const PLANT = t => BLOCK[t] && BLOCK[t].kind === 'cross';
const solidAt = (x, y, z) => BLOCK[get(x, y, z)].solid;
function groundAt(x, z, fromY) { const xi = Math.floor(x), zi = Math.floor(z);
  for (let y = Math.min(WY - 1, Math.floor(fromY)); y >= 0; y--) if (BLOCK[get(xi, y, zi)].solid) return y + 1; return 0; }
function covered(x, y, z) { const xi = Math.floor(x), zi = Math.floor(z);           // any opaque block between here and the sky
  for (let yy = Math.floor(y); yy < WY; yy++) { const t = get(xi, yy, zi); if (t && BLOCK[t].opaque && t !== LEAVES) return true; } return false; }
const HOMES = [[18, 18, 43, 45], [78, 98, 98, 118], [126, 54, 146, 74]];      // the three character homes (flattened plots in index.html)
const isHome = (x, z) => HOMES.some(([x0, z0, x1, z1]) => x >= x0 && x < x1 + 1 && z >= z0 && z < z1 + 1);
function torchNear(x, y, z, r = 7) {
  if (typeof Light !== 'undefined' && Light && typeof Light.level === 'function') { try { return Light.level(Math.floor(x), Math.floor(y), Math.floor(z)) > 7; } catch (e) { /* fall through */ } }
  x = Math.floor(x); y = Math.floor(y); z = Math.floor(z);
  for (let dy = -3; dy <= 3; dy++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) if (get(x + dx, y + dy, z + dz) === TORCH) return true;
  return false;
}
function chunksOf(cells) { const s = new Set(); for (const [x, z] of cells) s.add(Math.floor(x / CS) + ',' + Math.floor(z / CS)); return s; }
function rebuildChunks(keys) { for (const k of keys) { const [a, b] = k.split(',').map(Number); buildChunk(a, b); } }

// =====================================================================================================
//  Sounds (synthesized, quieter with distance)
// =====================================================================================================
function vol(p) { if (!AC || !p) return AC ? 1 : 0; const d = PL().pos.distanceTo(p); return clamp(1 - d / 30, 0, 1); }
const S = {
  groan(p) { const v = vol(p); if (!v) return; const t = AC.currentTime, f = 95 + R() * 30; thump(t, f * 1.3, f, 1.1, .2 * v, 'sawtooth'); thump(t + .05, f * 1.6, f * 1.1, 1, .1 * v, 'square'); noiseSweep(t, .9, 600, 300, .06 * v, 2, .25); },
  zHurt(p) { const v = vol(p); if (!v) return; const t = AC.currentTime; thump(t, 210, 100, .35, .22 * v, 'sawtooth'); },
  rattle(p, k = 1) { const v = vol(p); if (!v) return; const t = AC.currentTime; for (let i = 0; i < 6; i++) click(t + i * .045 + R() * .02, 1600 + R() * 1800, .05 * v * k); },
  hiss(p) { const v = vol(p); if (!v) return; const t = AC.currentTime; noiseSweep(t, 1.5, 2500, 6500, .28 * v, .8, 1.1, 'highpass'); },
  boom(p) { const v = Math.max(.35, vol(p)); if (!AC) return; const t = AC.currentTime; thump(t, 75, 22, 1.5, .95 * v); noiseSweep(t, 1.7, 1500, 70, .85 * v, .5, .004, 'lowpass'); noiseSweep(t, .4, 4000, 900, .3 * v, .7, .002, 'highpass'); },
  spider(p) { const v = vol(p); if (!v) return; const t = AC.currentTime; noiseSweep(t, .35, 2600, 1400, .1 * v, 3, .02); for (let i = 0; i < 3; i++) click(t + i * .07, 900 + R() * 500, .05 * v); },
  oink(p) { const v = vol(p); if (!v) return; const t = AC.currentTime; for (const d of [0, .16]) { thump(t + d, 300, 170, .14, .14 * v, 'sawtooth'); noiseSweep(t + d, .12, 900, 500, .05 * v, 2, .01); } },
  baa(p) { const v = vol(p); if (!v) return; const t = AC.currentTime; for (let i = 0; i < 5; i++) thump(t + i * .09, 470 - i * 8, 430 - i * 8, .11, .09 * v, 'sawtooth'); },
  moo(p) { const v = vol(p); if (!v) return; const t = AC.currentTime; thump(t, 150, 105, 1.1, .22 * v, 'sawtooth'); thump(t, 300, 210, 1.1, .05 * v, 'square'); },
  cluck(p) { const v = vol(p); if (!v) return; const t = AC.currentTime; for (let i = 0; i < 3; i++) thump(t + i * .08, 950 - i * 60, 700, .06, .08 * v, 'square'); },
  hurtAnimal(p) { const v = vol(p); if (!v) return; const t = AC.currentTime; thump(t, 520, 260, .18, .16 * v, 'square'); },
  poof(p) { const v = vol(p); if (!v) return; const t = AC.currentTime; noiseSweep(t, .4, 2600, 500, .2 * v, .8, .005); },
  draw() { if (!AC) return; const t = AC.currentTime; noiseSweep(t, .7, 250, 900, .06, 3, .5); click(t + .1, 400, .02); },
  twang() { if (!AC) return; const t = AC.currentTime; thump(t, 360, 150, .28, .2, 'triangle'); noiseSweep(t, .18, 3000, 900, .1, 1.5, .003); },
  thunk(p) { const v = vol(p); if (!v) return; const t = AC.currentTime; thump(t, 260, 110, .09, .2 * v); click(t, 700, .05 * v); },
  hitMark() { if (!AC) return; const t = AC.currentTime; click(t, 1800, .06); thump(t, 520, 300, .08, .1, 'square'); },
  snip() { if (!AC) return; const t = AC.currentTime; click(t, 3200, .08); click(t + .06, 2800, .07); noiseSweep(t, .12, 5000, 3000, .06, 2, .003); },
  munch() { if (!AC) return; const t = AC.currentTime; for (let i = 0; i < 3; i++) noiseSweep(t + i * .1, .08, 1200, 600, .1, 1.5, .005); },
  pop() { if (!AC) return; const t = AC.currentTime, f = 520 + R() * 480; thump(t, f, f * 1.9, .09, .14, 'sine'); },
  sizzle(p) { const v = vol(p); if (!v) return; const t = AC.currentTime; noiseSweep(t, .5, 5000, 3000, .05 * v, .7, .05, 'highpass'); },
};

// =====================================================================================================
//  Particles (own list: shared materials must not be disposed by the main particle loop)
// =====================================================================================================
const PARTS = [], UNIT = new THREE.BoxGeometry(1, 1, 1);
const SMOKE = ['#ffffff', '#d8d8d8', '#b0b0b0', '#808080'].map(c => new THREE.MeshBasicMaterial({ color: c }));
const FIRE = [0xffd040, 0xff8a1a, 0xff5010].map(c => new THREE.MeshBasicMaterial({ color: c, fog: false, transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false }));
const heartTex = (() => { const rows = ['.kk.kk.', 'kRRkWRk', 'kRRRRRk', '.kRRRk.', '..kRk..', '...k...'];
  const t = charTex(7, 6, g => rows.forEach((r, y) => [...r].forEach((c, x) => { if (c === '.') return; g.fillStyle = c === 'k' ? '#3a0000' : c === 'W' ? '#ffb0b0' : '#e8202a'; g.fillRect(x, y, 1, 1); }))); return t; })();
const HEART = new THREE.SpriteMaterial({ map: heartTex, transparent: true, depthWrite: false });
function part(mat, p, v, size, life, grav = 0, grow = 0) {
  if (PARTS.length > 220) return null;
  const m = new THREE.Mesh(UNIT, mat); m.scale.setScalar(size); m.position.copy(p); scene.add(m);
  const q = { m, v, life, max: life, grav, grow, size }; PARTS.push(q); return q;
}
function heart(p) { if (PARTS.length > 220) return; const s = new THREE.Sprite(HEART); s.scale.set(.35, .3, 1); s.position.copy(p); scene.add(s);
  PARTS.push({ m: s, v: new V3((R() - .5) * .4, .9, (R() - .5) * .4), life: 1.1, max: 1.1, grav: 0, grow: 0, size: 0, sprite: true }); }
function puff(c, size = 1, n = 12) { for (let i = 0; i < n; i++) part(SMOKE[i % 4], new V3(c.x + (R() - .5) * size * .8, c.y + (R() - .5) * size, c.z + (R() - .5) * size * .8),
  new V3((R() - .5) * 1.4, .6 + R() * 1.2, (R() - .5) * 1.4), .12 + R() * .14 * size, .5 + R() * .5, -.6, .1); }
function updateParts(dt) {
  for (let i = PARTS.length - 1; i >= 0; i--) { const q = PARTS[i]; q.life -= dt;
    if (q.life <= 0) { scene.remove(q.m); PARTS.splice(i, 1); continue; }
    q.v.y -= q.grav * dt; q.m.position.addScaledVector(q.v, dt); if (q.drag) q.v.multiplyScalar(Math.exp(-dt * q.drag));
    if (!q.sprite) q.m.scale.setScalar(Math.max(.01, q.size * (q.grow ? 1 + (1 - q.life / q.max) * q.grow * 10 : q.life / q.max))); }
}

// =====================================================================================================
//  Textures (pixel art in code: noise + bevel, Minecraft-style faces)
// =====================================================================================================
const TX = {};
const px = (g, c, x, y, w = 1, h = 1) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
function noise(g, w, h, pal) { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { g.fillStyle = typeof pal === 'string' ? shade(pal, (R() - .5) * .16) : pal[(R() * pal.length) | 0]; g.fillRect(x, y, 1, 1); } }
function bevel(g, w, h, base) { px(g, shade(base, .14), 0, 0, w, 1); px(g, shade(base, .14), 0, 0, 1, h); px(g, shade(base, -.2), 0, h - 1, w, 1); px(g, shade(base, -.2), w - 1, 0, 1, h); }
function T(key, w, h, pal, deco, bev = true) { return TX[key] || (TX[key] = charTex(w, h, g => { noise(g, w, h, pal); if (bev && typeof pal === 'string') bevel(g, w, h, pal); if (deco) deco(g, w, h); })); }
const CREEPER = ['#5ead4a', '#4f9a3f', '#76c25b', '#3f7f33', '#69b553', '#8acd6f'];
const SPIDER = ['#3b3029', '#2f2620', '#45382f', '#2a221d'];
const TEX = {
  zSkin: () => T('zSkin', 8, 8, '#5f9c4a'),
  zHeadSide: () => T('zHeadSide', 8, 8, '#5f9c4a', g => { px(g, '#3f6d30', 0, 0, 8, 2); px(g, '#3f6d30', 5, 2, 3, 1); }),
  zHeadTop: () => T('zHeadTop', 8, 8, '#3f6d30'),
  zFace: () => T('zFace', 8, 8, '#5f9c4a', g => { px(g, '#3f6d30', 0, 0, 8, 2); px(g, '#121812', 1, 3, 2, 2); px(g, '#121812', 5, 3, 2, 2); px(g, '#4a7d39', 3, 4, 2, 2); px(g, '#2e5226', 2, 6, 4, 1); px(g, '#27451f', 1, 6, 1, 1); }, false),
  zShirt: () => T('zShirt', 8, 12, '#2f8fa0', g => { px(g, '#5f9c4a', 2, 0, 4, 1); px(g, '#25707e', 0, 11, 8, 1); px(g, '#4aa9b8', 6, 4, 1, 3); }),
  zShirtSide: () => T('zShirtSide', 4, 12, '#2f8fa0'),
  zArm: () => T('zArm', 4, 12, '#5f9c4a', g => { px(g, '#2f8fa0', 0, 0, 4, 4); px(g, '#25707e', 0, 4, 4, 1); }),
  zLeg: () => T('zLeg', 4, 12, '#3b3a8f', g => { px(g, '#2c2b6e', 0, 0, 1, 12); px(g, '#4b4a46', 0, 10, 4, 2); }),
  bone: () => T('bone', 4, 12, '#c9c9c4', g => { px(g, '#8f8f8a', 0, 0, 4, 1); px(g, '#8f8f8a', 0, 11, 4, 1); }),
  skFace: () => T('skFace', 8, 8, '#cfcfca', g => { px(g, '#1a1a1a', 1, 3, 2, 2); px(g, '#1a1a1a', 5, 3, 2, 2); px(g, '#3a3a3a', 3, 5, 2, 1); px(g, '#2a2a2a', 1, 6, 6, 1); px(g, '#cfcfca', 2, 6, 1, 1); px(g, '#cfcfca', 4, 6, 1, 1); px(g, '#cfcfca', 6, 6, 1, 1); }, false),
  skHead: () => T('skHead', 8, 8, '#c4c4bf'),
  skRibs: () => T('skRibs', 8, 12, ['#262626', '#1d1d1d'], g => { for (let y = 1; y < 9; y += 2) px(g, y === 1 ? '#d8d8d3' : '#bdbdb8', 1, y, 6, 1); px(g, '#d0d0cb', 3, 0, 2, 12); px(g, '#a0a09b', 1, 10, 6, 2); }),
  cSkin: () => T('cSkin', 8, 8, CREEPER),
  cSkinT: () => T('cSkinT', 8, 12, CREEPER),
  cLeg: () => T('cLeg', 4, 6, CREEPER, g => px(g, '#2f5f26', 0, 5, 4, 1)),
  cFace: () => T('cFace', 8, 8, CREEPER, g => { px(g, '#0d0d0d', 1, 2, 2, 2); px(g, '#0d0d0d', 5, 2, 2, 2); px(g, '#0d0d0d', 3, 4, 2, 3); px(g, '#0d0d0d', 2, 5, 1, 3); px(g, '#0d0d0d', 5, 5, 1, 3); px(g, '#1f1f1f', 3, 7, 2, 1); }),
  sBody: () => T('sBody', 8, 8, SPIDER, g => { px(g, '#5a2a22', 2, 2, 4, 1); px(g, '#4a221c', 3, 4, 2, 1); }),
  sHead: () => T('sHead', 8, 8, SPIDER),
  sLeg: () => T('sLeg', 8, 2, ['#2a221d', '#3b3029']),
  pig: () => T('pig', 8, 8, '#f0a5a2'),
  pigFace: () => T('pigFace', 8, 8, '#f0a5a2', g => { px(g, '#ffffff', 1, 3, 1, 1); px(g, '#111', 2, 3, 1, 1); px(g, '#ffffff', 6, 3, 1, 1); px(g, '#111', 5, 3, 1, 1); }),
  snout: () => T('snout', 4, 3, '#e98a88', g => { px(g, '#9a4b4b', 0, 1, 1, 1); px(g, '#9a4b4b', 3, 1, 1, 1); }, false),
  wool: () => T('wool', 8, 8, ['#f0f0f0', '#e4e4e4', '#d8d8d8', '#fafafa']),
  sheepSkin: () => T('sheepSkin', 8, 8, '#d9cbb8'),
  sheepFace: () => T('sheepFace', 8, 8, '#d6c3ad', g => { px(g, '#ececec', 0, 0, 8, 2); px(g, '#ffffff', 1, 3, 1, 1); px(g, '#111', 2, 3, 1, 1); px(g, '#ffffff', 6, 3, 1, 1); px(g, '#111', 5, 3, 1, 1); px(g, '#b88f86', 3, 5, 2, 1); px(g, '#8c6a60', 3, 6, 2, 1); }),
  cow: () => T('cow', 8, 8, '#3d2b20', g => { px(g, '#e8e8e8', 1, 1, 3, 2); px(g, '#e8e8e8', 2, 3, 1, 1); px(g, '#e8e8e8', 5, 5, 2, 2); }),
  cowB: () => T('cowB', 8, 12, '#3d2b20', g => { px(g, '#e8e8e8', 1, 2, 3, 3); px(g, '#e8e8e8', 4, 7, 3, 3); px(g, '#e8e8e8', 0, 10, 2, 1); }),
  cowFace: () => T('cowFace', 8, 8, '#3d2b20', g => { px(g, '#e8e8e8', 2, 0, 4, 3); px(g, '#ffffff', 1, 3, 1, 1); px(g, '#111', 2, 3, 1, 1); px(g, '#ffffff', 6, 3, 1, 1); px(g, '#111', 5, 3, 1, 1); px(g, '#c9a8a0', 2, 5, 4, 3); px(g, '#5a3a32', 2, 6, 1, 1); px(g, '#5a3a32', 5, 6, 1, 1); }),
  cowLeg: () => T('cowLeg', 4, 8, '#3d2b20', g => { px(g, '#e8e8e8', 0, 4, 4, 2); px(g, '#2a1d15', 0, 7, 4, 1); }),
  udder: () => T('udder', 4, 4, '#e8a3a8'),
  horn: () => T('horn', 2, 4, '#d8d0b8', g => px(g, '#8a8270', 0, 0, 2, 1), false),
  hen: () => T('hen', 8, 8, ['#f6f6f6', '#ebebeb', '#ffffff']),
  henFace: () => T('henFace', 8, 8, ['#f6f6f6', '#ffffff'], g => { px(g, '#111', 1, 2, 1, 1); px(g, '#111', 6, 2, 1, 1); }),
  beak: () => T('beak', 4, 2, '#e8a33c', null, false),
  wattle: () => T('wattle', 2, 2, '#d62a2a', null, false),
  henLeg: () => T('henLeg', 2, 4, '#e8a33c', null, false),
  wood: () => T('woodbow', 2, 8, '#7a5230'),
  string: () => T('stringtex', 1, 4, '#dcdcdc', null, false),
};
const glowM = {}; const glow = hex => glowM[hex] || (glowM[hex] = new THREE.MeshBasicMaterial({ color: hex, fog: false }));

// =====================================================================================================
//  Mob base class (mod-style cubes on pivots; hit flash, knockback, tip-over death with smoke)
// =====================================================================================================
const GEO = {}; const bgeo = (w, h, d) => { const k = w + ',' + h + ',' + d; return GEO[k] || (GEO[k] = new THREE.BoxGeometry(w, h, d)); };
const MOBS = [];
class MCMob {
  constructor(kind, name, hp) {
    this.kind = kind; this.name = name; this.max = this.hp = hp; this.dead = 0; this.flash = 0; this.emis = -1;
    this.yaw = R() * Math.PI * 2; this.moveYaw = null; this.phase = 0; this.speed = 0; this.vy = 0; this.kb = { x: 0, z: 0 };
    this.height = 1; this.rad = .3; this.step = 1.05; this.sc = 1; this.t = R() * 10; this.timer = 0; this.mats = []; this.matMap = new Map();
    this.group = new THREE.Group(); this.pos = this.group.position; this.tipDir = R() < .5 ? 1 : -1; this.ambT = 4 + R() * 8; this.onGround = true;
    this.isMob = true; this.hostile = false; this.burn = 0; this.burnT = 0; this.checkT = R(); this.cave = false; this.staggerT = 0;
  }
  m(tex) { if (Array.isArray(tex)) return tex.map(t => this.m(t)); if (tex && tex.isMaterial) return tex;
    let mm = this.matMap.get(tex); if (!mm) { mm = new THREE.MeshLambertMaterial({ map: tex }); this.matMap.set(tex, mm); this.mats.push(mm); } return mm; }
  box(w, h, d, tex, x, y, z, parent = this.group) { const b = new THREE.Mesh(bgeo(w, h, d), this.m(tex)); b.position.set(x, y, z); parent.add(b); return b; }
  pivot(x, y, z, parent = this.group) { const p = new THREE.Group(); p.position.set(x, y, z); parent.add(p); return p; }
  place(x, y, z) { this.pos.set(x, y, z); this.group.rotation.y = this.yaw; scene.add(this.group); ENTITIES.push(this); MOBS.push(this); return this; }
  center() { return new V3(this.pos.x, this.pos.y + this.height * this.sc * .55, this.pos.z); }
  setEmis(r, g, b) { const k = r * 100 + g * 10 + b; if (k === this.emis) return; this.emis = k; for (const m of this.mats) m.emissive.setRGB(r, g, b); }
  hit(dmg, dir, src) {
    if (this.dead > 0 || this.removed) return;
    this.hp -= +dmg || 0; this.flash = .35;
    if (dir && src !== 'fire') { const kb = this.kbRes ?? 1; this.kb.x += (dir.x || 0) * 6 * kb; this.kb.z += (dir.z || 0) * 6 * kb; this.vy = Math.max(this.vy, 4 * kb); }
    this.hurtSound(); this.onHurt(dir, src);
    if (this.hp <= 0) this.die(src);
  }
  stagger(secs) { if (this.dead > 0) return; this.staggerT = Math.max(this.staggerT, secs); }
  hurtSound() {} onHurt() {} loot() {} ambient() {} think() {} animate() {}
  die(src) { this.dead = 1; this.dying = 0; this.flash = 9; this.killedBy = src; if (src !== 'despawn') addXP(this.xp || .05); }
  deathAnim(dt) {
    this.dying += dt; this.group.rotation.z = Math.min(1, this.dying / .4) * Math.PI / 2 * this.tipDir; this.setEmis(.7, 0, 0);
    if (this.dying > .8) { const c = this.center(); puff(c, this.height * this.sc, 8 + this.height * 5); S.poof(c); if (!this.isBaby) this.loot(c); this.remove(); }
  }
  remove() {
    if (this.removed) return; this.removed = true; this.dead = Math.max(this.dead, 1); scene.remove(this.group); for (const m of this.mats) m.dispose();
    let i = ENTITIES.indexOf(this); if (i >= 0) ENTITIES.splice(i, 1); i = MOBS.indexOf(this); if (i >= 0) MOBS.splice(i, 1);
  }
  blockedAt(x, z, baseY) {
    if (x < 1.5 || z < 1.5 || x > WX - 1.5 || z > WZ - 1.5) return true;
    const gy = groundAt(x, z, baseY + this.step + .05);
    if (gy - baseY > this.step + .05) return true;
    const top = Math.max(gy, baseY), xi = Math.floor(x), zi = Math.floor(z);
    for (let y = Math.floor(top + .01); y < top + this.height * this.sc - .05; y++) if (solidAt(xi, y, zi)) return true;
    if (this.avoidWater && get(xi, Math.floor(gy), zi) === WATER) return true;
    if (this.avoidDrop && baseY - gy > 3.2) return true;
    if (this.noHomes && isHome(x, z) && !isHome(this.pos.x, this.pos.z)) return true;
    return false;
  }
  tryMove(nx, nz) {
    const dx = nx - this.pos.x, dz = nz - this.pos.z, l = Math.hypot(dx, dz) || 1;
    if (this.blockedAt(nx, nz, this.pos.y) || this.blockedAt(nx + dx / l * this.rad, nz + dz / l * this.rad, this.pos.y)) return false;
    this.pos.x = nx; this.pos.z = nz; return true;
  }
  wander(dt, sp = .9) {
    this.timer -= dt;
    if (this.timer <= 0) { this.moving = R() < .5; this.yaw += (R() - .5) * 2.6; this.timer = 2 + R() * 4; }
    if (this.moving) { this.speed = sp; if (this.blocked) { this.yaw += 1.6 + R(); this.timer = Math.min(this.timer, .8); } }
  }
  chase(dx, dz, sp) {      // walk at the player; side-step around obstacles
    this.yaw = Math.atan2(dx, dz); this.speed = sp;
    if (this.sideT > 0) { this.sideT -= this.lastDt; this.moveYaw = this.yaw + this.sideDir * 1.25; }
    else if (this.blocked && !this.climbs) { this.sideT = .7; this.sideDir = R() < .5 ? -1 : 1; }
  }
  update(dt) {
    if (this.removed) return;
    if (this.dead > 0) { this.deathAnim(dt); return; }
    this.t += dt; this.lastDt = dt;
    const P = PL(), dx = P.pos.x - this.pos.x, dz = P.pos.z - this.pos.z, d = Math.hypot(dx, dz);
    this.dist = d;
    if (d > 90 && !this.hostile) { this.group.visible = false; return; }          // far passive animals sleep
    this.group.visible = true;
    if (this.flash > 0) this.flash -= dt;
    this.speed = 0; this.moveYaw = null;
    if (this.staggerT > 0) { this.staggerT -= dt; this.group.rotation.z = Math.sin(this.t * 14) * .08; if (this.staggerT <= 0) this.group.rotation.z = 0; }
    else this.think(dt, P, dx, dz, d);
    if (this.removed) return;
    if ((this.checkT -= dt) <= 0) { this.checkT = .5; this.cave = covered(this.pos.x, this.pos.y + this.height * this.sc, this.pos.z); this.wet = get(Math.floor(this.pos.x), Math.floor(this.pos.y + .2), Math.floor(this.pos.z)) === WATER; this.slowCheck(); }
    if (this.burns) this.burnTick(dt);
    const sp = this.speed, my = this.moveYaw ?? this.yaw; let moved = false;
    if (sp > 0) moved = this.tryMove(this.pos.x + Math.sin(my) * sp * dt, this.pos.z + Math.cos(my) * sp * dt);
    this.blocked = sp > 0 && !moved;
    if (Math.abs(this.kb.x) + Math.abs(this.kb.z) > .05) { this.tryMove(this.pos.x + this.kb.x * dt, this.pos.z + this.kb.z * dt); const f = Math.exp(-dt * 6); this.kb.x *= f; this.kb.z *= f; }
    // separation from other mobs
    for (const o of MOBS) { if (o === this || o.dead > 0) continue; const ox = this.pos.x - o.pos.x, oz = this.pos.z - o.pos.z, l2 = ox * ox + oz * oz, r = this.rad + o.rad;
      if (l2 < r * r && l2 > 1e-6 && Math.abs(this.pos.y - o.pos.y) < 1.5) { const l = Math.sqrt(l2), k = (r - l) * .5; this.tryMove(this.pos.x + ox / l * k, this.pos.z + oz / l * k); } }
    const gy = groundAt(this.pos.x, this.pos.z, this.pos.y + this.step + .05);
    if (this.climbing && !solidAt(Math.floor(this.pos.x), Math.floor(this.pos.y + this.height + .1), Math.floor(this.pos.z))) { this.vy = 2.6; this.pos.y += this.vy * dt; this.onGround = false; }
    else if (this.vy > 0 || this.pos.y > gy + .02) {
      this.vy -= 24 * dt; if (this.slowFall && this.vy < -2.2) this.vy = -2.2;
      if (this.wet) this.vy = Math.max(this.vy, -2);
      const ny = this.pos.y + this.vy * dt;
      if (this.vy > 0 && solidAt(Math.floor(this.pos.x), Math.floor(ny + this.height * this.sc), Math.floor(this.pos.z))) this.vy = 0;
      else this.pos.y = ny;
      if (this.pos.y <= gy) { this.pos.y = gy; this.vy = 0; } this.onGround = this.pos.y <= gy + .02;
    } else { this.pos.y = lerp(this.pos.y, gy, Math.min(1, dt * 14)); this.vy = 0; this.onGround = true; }
    if (this.pos.y < -10) { this.remove(); return; }
    let dr = this.yaw - this.group.rotation.y; dr = Math.atan2(Math.sin(dr), Math.cos(dr)); this.group.rotation.y += dr * Math.min(1, dt * 8);
    if (moved) this.phase += dt * sp * 3.2;
    this.animate(dt, moved ? sp : 0);
    if (this.dead <= 0) { const f = this.flash > 0; if (!this.customEmis) this.setEmis(f ? .75 : 0, 0, 0); }
    if ((this.ambT -= dt) <= 0) { this.ambT = 6 + R() * 10; if (d < 28) this.ambient(); }
  }
  slowCheck() {}
  burnTick(dt) {           // undead burn in daylight unless shaded or in water
    if ((this.burnCheck = (this.burnCheck || 0) - dt) <= 0) { this.burnCheck = .5; this.burn = !isNight() && !this.cave && !this.wet && state === 'play' ? 1 : 0; }
    if (!this.flames) { this.flames = new THREE.Group(); this.group.add(this.flames);
      for (let i = 0; i < 7; i++) { const f = new THREE.Mesh(UNIT, FIRE[i % 3]); f.userData.o = [(R() - .5) * .55, R() * this.height, (R() - .5) * .4, R() * 6]; this.flames.add(f); } }
    this.flames.visible = this.burn > 0;
    if (this.burn > 0) {
      for (const f of this.flames.children) { const o = f.userData.o, k = (this.t * 2.2 + o[3]) % 1; f.position.set(o[0], o[1] * .7 + k * .6, o[2]); f.scale.setScalar(.22 * (1 - k) + .04); }
      if ((this.burnT -= dt) <= 0) { this.burnT = 1; this.hit(1, null, 'fire'); if (R() < .4) S.sizzle(this.pos); }
    }
  }
}

// =====================================================================================================
//  Hostile mobs
// =====================================================================================================
const canAttack = () => state === 'play' && !(typeof Combat !== 'undefined' && Combat.isDead && Combat.isDead());
function seesPlayer(from, P) {
  const to = P.eye.clone().sub(from), d = to.length(); if (d < .5) return true;
  const h = raycast(from, to.normalize(), d);
  return !h || new V3(h.x + .5, h.y + .5, h.z + .5).distanceTo(from) > d - .6;
}
class Humanoid extends MCMob {
  build(T0, thin) {
    const w = thin ? .125 : .25; this.legs = []; this.arms = [];
    for (const s of [-1, 1]) {
      const lp = this.pivot(s * .125, .75, 0); this.box(w, .75, w, T0.leg, 0, -.375, 0, lp); this.legs.push(lp);
      const ap = this.pivot(s * (.25 + w / 2), 1.375, 0); this.box(w, .75, w, T0.arm, 0, -.25, 0, ap); this.arms.push(ap);
    }
    this.body = this.box(.5, .75, thin ? .2 : .25, T0.body, 0, 1.125, 0);
    this.head = this.pivot(0, 1.5, 0); this.box(.5, .5, .5, T0.head, 0, .25, 0, this.head);
    this.height = 1.95; this.rad = .3;
  }
  walkAnim(sp, k = .9) { const sw = Math.sin(this.phase) * k * Math.min(1, sp / 2); this.legs[0].rotation.x = sw; this.legs[1].rotation.x = -sw; return sw; }
}
class Zombie extends Humanoid {
  constructor(baby) {
    super('zombie', 'Zombie', 20); this.hostile = true; this.burns = true; this.xp = .12; this.atkCd = 0; this.swingT = 0;
    const sideT = TEX.zHeadSide(), head = [sideT, sideT, TEX.zHeadTop(), TEX.zSkin(), TEX.zFace(), sideT], sh = TEX.zShirtSide();
    this.build({ leg: TEX.zLeg(), arm: TEX.zArm(), body: [sh, sh, TEX.zShirt(), TEX.zLeg(), TEX.zShirt(), TEX.zShirt()], head });
    this.box(.54, .1, .54, TEX.zHeadTop(), 0, .5, 0, this.head);                                  // ragged hair layer
    if (baby) { this.isBabyZ = true; this.group.scale.setScalar(.55); this.sc = .55; this.head.scale.setScalar(1.35); }
  }
  ambient() { S.groan(this.pos); }
  hurtSound() { S.zHurt(this.pos); }
  onHurt() { this.aggro = 20; }
  think(dt, P, dx, dz, d) {
    this.atkCd -= dt; this.swingT = Math.max(0, this.swingT - dt * 3);
    const dy = P.pos.y - this.pos.y;
    if (canAttack() && (d < 22 || this.aggro > 0)) {
      this.aggro = (this.aggro || 0) - dt;
      if (d > 1.1) this.chase(dx, dz, this.isBabyZ ? 3.4 : 2.1); else this.yaw = Math.atan2(dx, dz);
      if (d < 1.55 && Math.abs(dy) < 1.7 && this.atkCd <= 0) { this.atkCd = 1; this.swingT = 1; hurt(3, 'Zombie', dx / (d || 1) * .6, dz / (d || 1) * .6); }
    } else this.wander(dt, .8);
  }
  loot(c) { drop('rotten_flesh', ri(0, 2), c); if (R() < .025) drop(['carrot', 'iron_ingot', 'potato'][ri(0, 1)], 1, c); }
  animate(dt, sp) {
    const sw = this.walkAnim(sp), s = Math.sin(this.swingT * Math.PI) * .5;
    this.arms[0].rotation.x = -Math.PI / 2 + sw * .15 - s; this.arms[1].rotation.x = -Math.PI / 2 - sw * .15 - s;
    this.arms[0].rotation.z = .05; this.arms[1].rotation.z = -.05;
    this.head.rotation.x = Math.sin(this.t * .7) * .08;
  }
}
class Skeleton extends Humanoid {
  constructor() {
    super('skeleton', 'Skeleton', 20); this.hostile = true; this.burns = true; this.xp = .12; this.drawT = 0; this.strafeT = 0; this.strafeDir = 1;
    const sk = TEX.skHead(), ribs = TEX.skRibs();
    this.build({ leg: TEX.bone(), arm: TEX.bone(), body: [sk, sk, sk, sk, ribs, ribs], head: [sk, sk, sk, sk, TEX.skFace(), sk] }, true);
    // bow in the left hand
    const bw = this.bow = this.pivot(0, -.55, .08, this.arms[1]), wd = TEX.wood();
    this.box(.05, .34, .05, wd, 0, 0, .1, bw); for (const s of [-1, 1]) { const e = this.box(.05, .26, .05, wd, 0, s * .26, .03, bw); e.rotation.x = s * .55; }
    this.box(.015, .7, .015, TEX.string(), 0, 0, -.06, bw);
  }
  ambient() { S.rattle(this.pos, .7); }
  hurtSound() { S.rattle(this.pos, 1.4); }
  onHurt() { this.aggro = 20; }
  think(dt, P, dx, dz, d) {
    if (canAttack() && (d < 18 || this.aggro > 0)) {
      this.aggro = (this.aggro || 0) - dt;
      const eye = new V3(this.pos.x, this.pos.y + 1.6, this.pos.z), sees = seesPlayer(eye, P);
      this.yaw = Math.atan2(dx, dz);
      if (!sees) { this.drawT = 0; this.chase(dx, dz, 1.8); return; }
      if ((this.strafeT -= dt) <= 0) { this.strafeT = 1 + R() * 1.5; this.strafeDir = R() < .5 ? -1 : 1; }
      this.moveYaw = d < 5 ? this.yaw + Math.PI + this.strafeDir * .5 : d > 12 ? this.yaw + this.strafeDir * .4 : this.yaw + this.strafeDir * Math.PI / 2;
      this.speed = 1.5; if (this.blocked) this.strafeDir *= -1;
      this.drawT += dt;
      if (this.drawT > 1.7 && d < 16) { this.drawT = 0; this.shoot(P, d); }
    } else { this.drawT = 0; this.wander(dt, .8); }
  }
  shoot(P, d) {
    const from = new V3(this.pos.x + Math.sin(this.yaw) * .45, this.pos.y + 1.45, this.pos.z + Math.cos(this.yaw) * .45);
    const tgt = P.pos.clone(); tgt.y += 1.1;
    const v = 24, h = Math.hypot(tgt.x - from.x, tgt.z - from.z), t = h / v;
    const dir = new V3(tgt.x - from.x, tgt.y - from.y + .5 * ARROW_G * t * t, tgt.z - from.z).normalize();
    dir.x += (R() - .5) * .06; dir.y += (R() - .5) * .04; dir.z += (R() - .5) * .06; dir.normalize();
    shootArrow(from, dir.multiplyScalar(v), this, ri(2, 4)); S.twang();
  }
  loot(c) { drop('bone', ri(0, 2), c); drop('arrow', ri(0, 2), c); }
  animate(dt, sp) {
    const sw = this.walkAnim(sp, .6), aim = this.drawT > .3 || (this.aggro > 0 && this.dist < 18);
    this.arms[1].rotation.x = lerp(this.arms[1].rotation.x, aim ? -Math.PI / 2 : sw * .5, .2); this.arms[1].rotation.y = aim ? .1 : 0;
    this.arms[0].rotation.x = lerp(this.arms[0].rotation.x, aim ? -Math.PI / 2 + Math.min(1, this.drawT / 1.7) * .25 : -sw * .5, .2); this.arms[0].rotation.y = aim ? -.5 : 0;
    this.bow.rotation.x = aim ? Math.PI / 2 : 0;
  }
}
class Creeper extends MCMob {
  constructor() {
    super('creeper', 'Creeper', 20); this.hostile = true; this.xp = .12; this.fuse = 0; this.customEmis = true; this.height = 1.65; this.rad = .3;
    const sk = TEX.cSkin(), skT = TEX.cSkinT(); this.legs = [];
    for (const [lx, lz] of [[-.125, .25], [.125, .25], [-.125, -.25], [.125, -.25]]) { const p = this.pivot(lx, .375, lz); this.box(.25, .375, .25, TEX.cLeg(), 0, -.1875, 0, p); this.legs.push(p); }
    this.body = this.box(.5, .75, .25, skT, 0, .75, 0);
    this.head = this.pivot(0, 1.125, 0); this.box(.5, .5, .5, [sk, sk, sk, sk, TEX.cFace(), sk], 0, .25, 0, this.head);
  }
  hurtSound() { S.hurtAnimal(this.pos); }
  onHurt() { this.aggro = 20; }
  think(dt, P, dx, dz, d) {
    const dy = Math.abs(P.pos.y - this.pos.y);
    if (this.fuse > 0 || (canAttack() && d < 2.6 && dy < 2.5)) {
      this.yaw = Math.atan2(dx, dz);
      if (d < 6.5 && canAttack()) { if (this.fuse === 0) S.hiss(this.pos); this.fuse += dt; }
      else this.fuse = Math.max(0, this.fuse - dt);
      if (this.fuse >= 1.5) { this.explode(); return; }
      if (d > 1.4 && this.fuse < .3) this.chase(dx, dz, 1.2);
    } else if (canAttack() && (d < 18 || this.aggro > 0)) { this.aggro = (this.aggro || 0) - dt; this.chase(dx, dz, 2.0); }
    else this.wander(dt, .7);
  }
  explode() { const c = this.center(); this.removed = false; this.remove(); explode(c, 3, 'Creeper'); }
  loot(c) { drop('gunpowder', ri(0, 2), c); }
  animate(dt, sp) {
    const sw = Math.sin(this.phase) * .6 * Math.min(1, sp / 2);
    this.legs[0].rotation.x = sw; this.legs[3].rotation.x = sw; this.legs[1].rotation.x = -sw; this.legs[2].rotation.x = -sw;
    const f = this.fuse / 1.5, s = 1 + f * .22 + (f > 0 ? Math.sin(this.t * 40) * .02 : 0);
    this.group.scale.set(s, 1 + f * .12, s);
    const white = f > 0 && Math.sin(f * f * 40) > 0;
    this.setEmis(this.flash > 0 ? .75 : white ? .9 : 0, this.flash > 0 ? 0 : white ? .9 : 0, this.flash > 0 ? 0 : white ? .9 : 0);
  }
}
class Spider extends MCMob {
  constructor() {
    super('spider', 'Spider', 16); this.hostile = true; this.xp = .1; this.height = .9; this.rad = .55; this.climbs = true; this.atkCd = 0; this.leapCd = 0;
    const b = TEX.sBody(), h = TEX.sHead();
    this.box(.5, .45, .45, b, 0, .5, 0);
    this.box(.8, .6, .9, [b, b, b, b, b, b], 0, .58, -.62);
    this.head = this.pivot(0, .5, .22); this.box(.5, .5, .45, h, 0, 0, .22, this.head);
    const eye = glow(0xff2222); for (const [x, y, s] of [[-.12, .08, .08], [.12, .08, .08], [-.18, .16, .05], [.18, .16, .05], [-.06, .17, .05], [.06, .17, .05], [-.2, .03, .04], [.2, .03, .04]]) {
      const e = new THREE.Mesh(bgeo(s, s, .02), eye); e.position.set(x, y, .455); this.head.add(e); }
    this.legs = [];
    for (let i = 0; i < 4; i++) for (const s of [-1, 1]) {
      const p = this.pivot(s * .22, .55, .12 - i * .14); p.rotation.y = s * (.5 - i * .32) * -1; const leg = this.pivot(0, 0, 0, p);
      this.box(.95, .09, .09, TEX.sLeg(), s * .47, 0, 0, leg); leg.rotation.z = s * -.6; leg.userData = { s, i }; this.legs.push(leg);
    }
  }
  ambient() { S.spider(this.pos); }
  hurtSound() { S.spider(this.pos); }
  onHurt() { this.aggro = 25; }
  think(dt, P, dx, dz, d) {
    this.atkCd -= dt; this.leapCd -= dt; this.climbing = false;
    const hostile = isNight() || this.cave || this.aggro > 0;
    if (canAttack() && hostile && (d < 16 || this.aggro > 0)) {
      this.aggro = (this.aggro || 0) - dt;
      this.chase(dx, dz, 2.7);
      if (this.blocked && d > 1.4) this.climbing = true;
      if (this.onGround && d > 1.8 && d < 3.8 && this.leapCd <= 0) { this.leapCd = 2.5; this.vy = 6; this.kb.x += dx / d * 4.5; this.kb.z += dz / d * 4.5; }
      if (d < 1.5 && Math.abs(P.pos.y - this.pos.y) < 1.6 && this.atkCd <= 0) { this.atkCd = 1; hurt(2, 'Spider', dx / (d || 1) * .5, dz / (d || 1) * .5); }
    } else this.wander(dt, .9);
  }
  loot(c) { drop('string', ri(0, 2), c); if (R() < .33) drop('spider_eye', 1, c); }
  animate(dt, sp) {
    for (const l of this.legs) { const { s, i } = l.userData, ph = this.phase * 1.6 + i * 1.3 + (s > 0 ? Math.PI : 0); l.rotation.z = s * (-.6 + Math.max(0, Math.sin(ph)) * .3 * Math.min(1, sp)); l.rotation.y = Math.cos(ph) * .3 * Math.min(1, sp); }
    this.group.rotation.x = this.climbing ? -1.1 : lerp(this.group.rotation.x, 0, .2);
  }
}

// =====================================================================================================
//  Passive animals
// =====================================================================================================
const FOODS = { cow: ['wheat'], sheep: ['wheat'], pig: ['carrot', 'potato', 'beetroot'], chicken: ['wheat_seeds', 'melon_seeds', 'pumpkin_seeds', 'beetroot_seeds'] };
let animalCount = () => MOBS.filter(m => m.animal && !(m.dead > 0)).length;
class Animal extends MCMob {
  constructor(kind, name, hp) { super(kind, name, hp); this.animal = true; this.avoidWater = true; this.avoidDrop = true; this.age = 0; this.love = 0; this.breedCd = 0; this.panic = 0; this.xp = .04; }
  setBaby(on) { this.isBaby = on; this.sc = on ? .5 : 1; this.group.scale.setScalar(this.sc); if (this.head) this.head.scale.setScalar(on ? 1.45 : 1); }
  onHurt(dir) { this.panic = 4; this.timer = 0; }
  think(dt, P, dx, dz, d) {
    if (this.age < 0) { this.age += dt; if (this.age >= 0) this.setBaby(false); }
    if (this.breedCd > 0) this.breedCd -= dt;
    if (this.love > 0) { this.love -= dt; if ((this.heartT = (this.heartT || 0) - dt) <= 0) { this.heartT = .7; const c = this.center(); c.y += .5 * this.sc; heart(c); } }
    if (this.panic > 0) { this.panic -= dt; if ((this.timer -= dt) <= 0) { this.timer = .6 + R() * .6; this.yaw += (R() - .5) * 3; } this.speed = 2.6; if (this.blocked) this.yaw += 2; return; }
    if (this.love > 0 && !this.isBaby) {
      let mate = null, md = 9;
      for (const o of MOBS) if (o !== this && o.kind === this.kind && o.love > 0 && !o.isBaby && !(o.dead > 0)) { const od = o.pos.distanceTo(this.pos); if (od < md) { md = od; mate = o; } }
      if (mate) { this.yaw = Math.atan2(mate.pos.x - this.pos.x, mate.pos.z - this.pos.z); if (md > 1.2) this.speed = 1.3;
        else if (this.uid < mate.uid) breed(this, mate); return; }
    }
    const food = heldId(), tempt = food && FOODS[this.kind].includes(food) && d < 8 && state === 'play';
    if (tempt) { this.yaw = Math.atan2(dx, dz); if (d > 2) this.speed = 1.3; return; }
    this.wander(dt, .9);
    this.special && this.special(dt);
  }
  feed(id) {
    if (!FOODS[this.kind].includes(id)) return false;
    if (this.isBaby) { this.age = Math.min(0, this.age + Math.abs(this.age) * .1 + 10); }
    else if (this.breedCd <= 0 && this.love <= 0) this.love = 30;
    else return false;
    const c = this.center(); for (let i = 0; i < 4; i++) heart(c.clone().add(new V3((R() - .5) * .6, .3, (R() - .5) * .6)));
    S.munch(); return true;
  }
  hurtSound() { S.hurtAnimal(this.pos); }
  quad(bodyW, bodyH, bodyL, legH, legW, Tb, Tl) {
    this.legs = [];
    for (const [lx, lz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) { const p = this.pivot(lx * (bodyW / 2 - legW / 2), legH, lz * (bodyL / 2 - legW / 2 - .02)); this.box(legW, legH, legW, Tl, 0, -legH / 2, 0, p); this.legs.push(p); }
    this.body = this.box(bodyW, bodyH, bodyL, Tb, 0, legH + bodyH / 2, 0);
  }
  animate(dt, sp) {
    const s = Math.sin(this.phase * 1.4) * .6 * Math.min(1, sp);
    if (this.legs.length === 4) { this.legs[0].rotation.x = s; this.legs[3].rotation.x = s; this.legs[1].rotation.x = -s; this.legs[2].rotation.x = -s; }
    if (this.head) this.head.rotation.x = lerp(this.head.rotation.x, this.eatT > 0 ? .9 : 0, .15);
  }
}
let uidN = 1;
function breed(a, b) {
  a.love = b.love = 0; a.breedCd = b.breedCd = 300;
  if (animalCount() >= 16) return;
  const baby = spawnAnimal(a.kind, (a.pos.x + b.pos.x) / 2, (a.pos.z + b.pos.z) / 2, a.pos.y); if (!baby) return;
  baby.age = -600; baby.setBaby(true);
  const c = baby.center(); for (let i = 0; i < 6; i++) heart(c.clone().add(new V3((R() - .5), R() * .5, (R() - .5))));
  addXP(ri(1, 7) * .02); S.pop();
}
class Pig extends Animal {
  constructor() { super('pig', 'Pig', 10); this.height = .9; this.rad = .45;
    const p = TEX.pig(); this.quad(.62, .5, 1, .38, .24, p, p);
    this.head = this.pivot(0, .7, .5); this.box(.5, .5, .5, [p, p, p, p, TEX.pigFace(), p], 0, 0, .12, this.head);
    this.box(.25, .19, .06, TEX.snout(), 0, -.07, .4, this.head); }
  ambient() { S.oink(this.pos); }
  loot(c) { drop('porkchop', ri(1, 3), c); }
}
class Cow extends Animal {
  constructor() { super('cow', 'Cow', 10); this.height = 1.4; this.rad = .45;
    const c = TEX.cow(), cb = TEX.cowB(); this.quad(.72, .62, 1.12, .5, .25, [cb, cb, c, c, c, c], TEX.cowLeg());
    this.head = this.pivot(0, 1.0, .56); this.box(.5, .5, .38, [c, c, c, c, TEX.cowFace(), c], 0, .05, .16, this.head);
    for (const s of [-1, 1]) this.box(.06, .18, .06, TEX.horn(), s * .28, .3, .16, this.head);
    this.box(.25, .12, .3, TEX.udder(), 0, .45, -.25); }
  ambient() { S.moo(this.pos); }
  loot(c) { drop('beef', ri(1, 3), c); drop('leather', ri(0, 2), c); }
}
class Sheep extends Animal {
  constructor() { super('sheep', 'Sheep', 8); this.height = 1.25; this.rad = .45; this.sheared = false; this.eatT = 0; this.grassT = 20 + R() * 40;
    const sk = TEX.sheepSkin(), w = TEX.wool(); this.quad(.55, .5, .9, .5, .2, sk, sk);
    this.fleece = this.box(.74, .64, 1.02, w, 0, .5 + .25, 0);
    this.legWool = this.legs.map(l => this.box(.26, .2, .26, w, 0, -.08, 0, l));
    this.head = this.pivot(0, 1.0, .45); this.box(.38, .38, .45, [sk, sk, sk, sk, TEX.sheepFace(), sk], 0, 0, .18, this.head);
    this.cap = this.box(.42, .14, .38, w, 0, .19, .14, this.head); }
  setSheared(on) { this.sheared = on; this.fleece.visible = !on; this.cap.visible = !on; for (const l of this.legWool) l.visible = !on; }
  ambient() { S.baa(this.pos); }
  special(dt) {
    if (this.eatT > 0) { this.eatT -= dt; this.speed = 0; if (this.eatT <= 0 && this.sheared) { const x = Math.floor(this.pos.x), y = Math.floor(this.pos.y) - 1, z = Math.floor(this.pos.z);
      if (get(x, y, z) === GRASS && !isHome(x, z)) { set(x, y, z, DIRT); rebuildAround(x, z); } this.setSheared(false); } return; }
    if ((this.grassT -= dt) <= 0) { this.grassT = 30 + R() * 60; if (get(Math.floor(this.pos.x), Math.floor(this.pos.y) - 1, Math.floor(this.pos.z)) === GRASS) this.eatT = 1.4; }
  }
  loot(c) { if (!this.sheared) drop('white_wool', 1, c); drop('mutton', ri(1, 2), c); }
}
class Chicken extends Animal {
  constructor() { super('chicken', 'Chicken', 4); this.height = .75; this.rad = .25; this.slowFall = true; this.eggT = 300 + R() * 300;
    const h = TEX.hen(), l = TEX.henLeg(); this.legs = [];
    for (const s of [-1, 1]) { const p = this.pivot(s * .09, .3, 0); this.box(.05, .3, .05, l, 0, -.15, 0, p); this.box(.18, .02, .14, l, 0, -.29, .04, p); this.legs.push(p); }
    this.body = this.box(.38, .38, .5, h, 0, .5, 0);
    this.wings = [-1, 1].map(s => { const p = this.pivot(s * .2, .66, 0); this.box(.06, .25, .38, h, s * .03, -.12, 0, p); return p; });
    this.head = this.pivot(0, .7, .22); this.box(.25, .38, .19, [h, h, h, h, TEX.henFace(), h], 0, .1, .06, this.head);
    this.box(.25, .12, .12, TEX.beak(), 0, .1, .21, this.head); this.box(.12, .12, .06, TEX.wattle(), 0, -.01, .18, this.head); }
  ambient() { S.cluck(this.pos); }
  special(dt) { if (!this.isBaby && (this.eggT -= dt) <= 0) { this.eggT = 300 + R() * 300; drop('egg', 1, this.pos.clone().add(new V3(0, .3, 0))); S.pop(); } }
  animate(dt, sp) {
    const s = Math.sin(this.phase * 2) * .7 * Math.min(1, sp); this.legs[0].rotation.x = s; this.legs[1].rotation.x = -s;
    const flap = this.onGround ? 0 : Math.abs(Math.sin(this.t * 22)) * 1.1; this.wings[0].rotation.z = flap; this.wings[1].rotation.z = -flap;
    this.head.rotation.x = Math.sin(this.t * 3) > .95 ? .4 : 0;
  }
  loot(c) { drop('feather', ri(0, 2), c); drop('chicken', 1, c); }
}

const KINDS = { zombie: Zombie, skeleton: Skeleton, creeper: Creeper, spider: Spider, pig: Pig, cow: Cow, sheep: Sheep, chicken: Chicken };
function spawn(kind, x, z, y) {
  const C = KINDS[kind]; if (!C) return null;
  const e = new C(); e.uid = uidN++;
  const gy = y != null ? groundAt(x, z, y + 1.5) : groundY(x, z).y;
  return e.place(x, gy, z);
}
const spawnAnimal = (kind, x, z, y) => spawn(kind, x, z, y);

// =====================================================================================================
//  Arrows (player and skeletons): fly with gravity, stick in blocks, hit ENTITIES or the player
// =====================================================================================================
const ARROW_G = 20, ARROWS = [];
const AM = { shaft: new THREE.MeshLambertMaterial({ color: 0x8a6a42 }), head: new THREE.MeshLambertMaterial({ color: 0x9a9a9a }), fl: new THREE.MeshLambertMaterial({ color: 0xf2f2f2, side: THREE.DoubleSide }) };
const AG = { shaft: new THREE.BoxGeometry(.035, .035, .62), head: new THREE.BoxGeometry(.07, .07, .1), fl: new THREE.PlaneGeometry(.12, .16) };
function arrowMesh() {
  const g = new THREE.Group(); g.add(new THREE.Mesh(AG.shaft, AM.shaft));
  const h = new THREE.Mesh(AG.head, AM.head); h.position.z = .33; g.add(h);
  for (const [rx, ry] of [[0, Math.PI / 2], [Math.PI / 2, 0]]) { const f = new THREE.Mesh(AG.fl, AM.fl); f.position.z = -.26; f.rotation.set(rx, ry, 0); if (rx) f.scale.set(1, 1, 1); g.add(f); }
  return g;
}
const ZAX = new V3(0, 0, 1);
function shootArrow(from, vel, owner, dmg, crit) {
  const m = arrowMesh(); m.position.copy(from); m.quaternion.setFromUnitVectors(ZAX, vel.clone().normalize()); scene.add(m);
  ARROWS.push({ m, p: m.position, v: vel.clone(), owner, dmg, crit, age: 0, stuck: null });
  while (ARROWS.length > 40) removeArrow(ARROWS.find(a => a.stuck) || ARROWS[0]);
}
function removeArrow(a) { scene.remove(a.m); const i = ARROWS.indexOf(a); if (i >= 0) ARROWS.splice(i, 1); }
function entityHitBy(p, owner) {
  for (const e of ENTITIES) {
    if (e === owner || e.dead > 0 || e.removed || !e.center) continue;
    const c = e.center(), hgt = (e.height || 2) * (e.sc || 1) * (e.group && e.group.scale ? 1 : 1), r = (e.rad || (e.height ? .3 + e.height * .2 : .8)) + .12;
    if (Math.hypot(p.x - c.x, p.z - c.z) < r && Math.abs(p.y - c.y) < Math.max(.45, hgt * .6)) return e;
  }
  return null;
}
function updateArrows(dt) {
  const P = PL();
  for (let i = ARROWS.length - 1; i >= 0; i--) {
    const a = ARROWS[i]; a.age += dt;
    if (a.stuck) {
      if (a.age > (a.owner === 'player' ? 60 : 30)) { removeArrow(a); continue; }
      if (!solidAt(a.stuck[0], a.stuck[1], a.stuck[2])) { a.stuck = null; a.v.set(0, -1, 0); continue; }      // block broken: fall
      if (a.owner === 'player' && a.age > .5 && P.pos.distanceTo(a.p) < 1.6 && state === 'play' && hasInv() && Inv.add('arrow', 1) === 0) { S.pop(); removeArrow(a); }
      continue;
    }
    if (a.age > 12) { removeArrow(a); continue; }
    a.v.y -= ARROW_G * dt;
    const steps = Math.max(1, Math.ceil(a.v.length() * dt / .3)), sdt = dt / steps; let done = false;
    for (let s = 0; s < steps && !done; s++) {
      const np = a.p.clone().addScaledVector(a.v, sdt), bx = Math.floor(np.x), by = Math.floor(np.y), bz = Math.floor(np.z);
      if (!inb(bx, Math.max(0, by), bz) || by < 0) { removeArrow(a); done = true; break; }
      if (solidAt(bx, by, bz)) { a.stuck = [bx, by, bz]; a.age = 0; a.p.addScaledVector(a.v, sdt * .6); S.thunk(a.p); done = true; break; }
      if (a.owner === 'player') {
        const e = entityHitBy(np, null);
        if (e) { const dir = new V3(a.v.x, 0, a.v.z).normalize(); e.hit(a.dmg, dir, 'arrow'); S.hitMark(); if (a.crit) puff(np, .4, 4); removeArrow(a); done = true; break; }
      } else {
        if (a.age > .05 && state === 'play') { const pp = P.pos; if (Math.abs(np.x - pp.x) < PW + .15 && Math.abs(np.z - pp.z) < PW + .15 && np.y > pp.y && np.y < pp.y + PH) {
          const l = Math.hypot(a.v.x, a.v.z) || 1; hurt(a.dmg, a.owner && a.owner.name || 'Skeleton', a.v.x / l * .45, a.v.z / l * .45); removeArrow(a); done = true; break; } }
      }
      a.p.copy(np);
    }
    if (!done && a.v.lengthSq() > .01) a.m.quaternion.setFromUnitVectors(ZAX, a.v.clone().normalize());
  }
}

// =====================================================================================================
//  Explosions (creepers): remove blocks (never inside the three homes), damage, knockback
// =====================================================================================================
const BLAST_PROOF = new Set([BEDROCK, WATER, AIR]);
function blastProof(t) {
  if (BLAST_PROOF.has(t)) return true;
  const b = BLOCK[t]; if (!b || b.blast === Infinity || b.noBlast) return true;
  if (typeof Meadows !== 'undefined' && Meadows.blocks && (t === Meadows.blocks.RUNE || t === Meadows.blocks.ALTAR)) return true;
  return t === WORKBENCH;
}
function explode(c, power, by) {
  S.boom(c); shakeT = Math.max(shakeT, .7 * vol(c) + .1);
  flashEl.style.background = '#ffffff'; fx.flash = Math.max(fx.flash, .35 * vol(c));
  for (let i = 0; i < 26; i++) { const q = part(SMOKE[i % 4], c.clone().add(new V3((R() - .5) * 2, (R() - .5) * 2, (R() - .5) * 2)), new V3((R() - .5) * 7, R() * 5, (R() - .5) * 7), .3 + R() * .4, .6 + R() * .7, -1, .25); if (q) q.drag = 3; }
  for (let i = 0; i < 10; i++) part(FIRE[i % 3], c.clone(), new V3((R() - .5) * 9, R() * 6, (R() - .5) * 9), .25, .35, 0);
  // blocks
  const r = power, cells = [], cx = Math.floor(c.x), cy = Math.floor(c.y), cz = Math.floor(c.z);
  for (let y = -r; y <= r; y++) for (let z = -r; z <= r; z++) for (let x = -r; x <= r; x++) {
    const d = Math.hypot(x, y * 1.1, z); if (d > r * (.75 + R() * .45)) continue;
    const X = cx + x, Y = cy + y, Z = cz + z; if (!inb(X, Y, Z) || isHome(X, Z)) continue;
    const t = get(X, Y, Z); if (blastProof(t)) continue;
    set(X, Y, Z, AIR); cells.push([X, Z]);
    if (R() < .3 && hasInv() && Inv.itemForBlock) { const id = Inv.itemForBlock(t); if (id && !PLANT(t)) drop(id, 1, new V3(X + .5, Y + .5, Z + .5)); }
    if (PLANT(get(X, Y + 1, Z))) set(X, Y + 1, Z, AIR);
  }
  if (cells.length) rebuildChunks(new Set([...chunksOf(cells), ...chunksOf(cells.map(([x, z]) => [x + 1, z + 1])), ...chunksOf(cells.map(([x, z]) => [x - 1, z - 1]))]));
  // damage
  const P = PL(), pc = P.pos.clone(); pc.y += .9; const pd = pc.distanceTo(c), reach = power * 2;
  if (pd < reach && state === 'play') { const k = 1 - pd / reach, l = Math.hypot(pc.x - c.x, pc.z - c.z) || 1;
    hurt(Math.max(1, Math.round(k * 20)), by, (pc.x - c.x) / l * (.6 + k), (pc.z - c.z) / l * (.6 + k)); }
  for (const e of ENTITIES.slice()) { if (e.dead > 0 || e.removed || !e.center) continue; const ec = e.center(), d = ec.distanceTo(c);
    if (d < reach) { const k = 1 - d / reach, dir = new V3(ec.x - c.x, 0, ec.z - c.z).normalize(); e.hit(Math.round(k * 20), dir, 'explosion'); } }
}

// =====================================================================================================
//  Items, recipes and smelting (defined only when no other module already did)
// =====================================================================================================
function rim(g) {
  const im = g.getImageData(0, 0, 16, 16), d = im.data, o = new Uint8ClampedArray(d);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const k = (y * 16 + x) * 4; if (d[k + 3] > 128) continue; let best = -1, lum = 1e9;
    for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + ax, ny = y + ay; if (nx < 0 || ny < 0 || nx > 15 || ny > 15) continue; const n = (ny * 16 + nx) * 4;
      if (d[n + 3] > 128) { const l = d[n] + d[n + 1] + d[n + 2]; if (l < lum) { lum = l; best = n; } } }
    if (best >= 0) { o[k] = d[best] * .3; o[k + 1] = d[best + 1] * .3; o[k + 2] = d[best + 2] * .3; o[k + 3] = 255; } }
  im.data.set(o); g.putImageData(im, 0, 0);
}
const art = fn => g => { fn(g); rim(g); };
function line(g, c, x0, y0, x1, y1, w = 1) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1; g.fillStyle = c;
  for (let i = 0; i <= n; i++) g.fillRect(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), w, w); }
function blob(g, cx, cy, rx, ry, c, hi, lo) { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const u = (x + .5 - cx) / rx, v = (y + .5 - cy) / ry, q = u * u + v * v; if (q > 1) continue;
  g.fillStyle = hi && u + v < -.6 ? hi : lo && u + v > .7 ? lo : c; g.fillRect(x, y, 1, 1); } }
const meat = (c, hi, lo, fat, bone) => art(g => { blob(g, 7, 8, 6, 4.6, c, hi, lo); if (fat) { line(g, fat, 3, 9, 9, 5); line(g, fat, 6, 11, 11, 7); }
  if (bone) { line(g, '#f0ead8', 11, 11, 14, 14, 2); px(g, '#ffffff', 14, 13, 2, 1); } });
const ICONS = {
  bow: art(g => { for (let a = 180; a <= 270; a += 2) { const r = a * Math.PI / 180, x = 13 + Math.cos(r) * 11, y = 13 + Math.sin(r) * 11; px(g, '#6b4423', Math.round(x), Math.round(y), 2, 2); px(g, '#a8794a', Math.round(x), Math.round(y), 1, 1); }
    line(g, '#dcdcdc', 2, 13, 13, 2); px(g, '#8a6a42', 1, 13, 2, 2); px(g, '#8a6a42', 13, 1, 2, 2); }),
  arrow: art(g => { line(g, '#8a6a42', 3, 12, 11, 4); px(g, '#e0e0e0', 11, 2, 3, 1); px(g, '#e0e0e0', 13, 2, 1, 3); px(g, '#9a9a9a', 11, 3, 2, 2); px(g, '#ffffff', 12, 2, 1, 1);
    px(g, '#f2f2f2', 1, 12, 2, 1); px(g, '#f2f2f2', 3, 14, 1, 1); px(g, '#c8c8c8', 2, 13, 1, 2); px(g, '#c8c8c8', 1, 14, 2, 1); }),
  string: art(g => { for (let i = 0; i <= 12; i++) px(g, i % 3 ? '#e8e8e8' : '#b8b8b8', 2 + i, Math.round(13 - i * .85 + Math.sin(i * .9) * 1.4), 1, 1); }),
  bone: art(g => { line(g, '#e8e4d0', 4, 11, 11, 4, 2); px(g, '#f4f0e0', 2, 11, 2, 2); px(g, '#f4f0e0', 4, 13, 2, 2); px(g, '#f4f0e0', 11, 2, 2, 2); px(g, '#f4f0e0', 13, 4, 2, 2); line(g, '#c8c4b0', 5, 12, 12, 5); }),
  gunpowder: art(g => { for (let i = 0; i < 70; i++) { const x = 2 + R() * 12, y = 7 + R() * 7; if (Math.abs(x - 8) > (y - 6) * .95) continue; px(g, ['#5a5a5a', '#7a7a7a', '#3c3c3c', '#8c8c8c'][i % 4], x | 0, y | 0, 1, 1); } }),
  feather: art(g => { line(g, '#d8d8d8', 3, 13, 12, 2); for (let i = 0; i < 9; i++) { px(g, '#ffffff', 4 + i, 11 - i, 1, 2); px(g, '#ececec', 5 + i, 12 - i, 1, 1); } px(g, '#b0b0b0', 2, 14, 1, 1); }),
  egg: art(g => blob(g, 8, 9, 4.6, 5.8, '#e6d5b0', '#f8efd8', '#c8b48a')),
  leather: art(g => { blob(g, 8, 8, 6, 5.5, '#a0643a', '#c08050', '#7a4a28'); px(g, '#ffffff00', 2, 3, 1, 1); g.clearRect(7, 2, 2, 1); g.clearRect(2, 8, 1, 2); g.clearRect(13, 9, 1, 2); }),
  beef: meat('#c8383a', '#e86868', '#8a2222', '#f0d8d0'), cooked_beef: meat('#8a4a2a', '#b06a3a', '#5a3018', '#c8986a'),
  porkchop: meat('#f09090', '#ffb8b8', '#c86868', '#fff0f0', true), cooked_porkchop: meat('#c88a5a', '#e8aa7a', '#8a5a32', '#f0d0a0', true),
  mutton: meat('#c84848', '#e87070', '#902828', null, true), cooked_mutton: meat('#8a4a32', '#aa6a42', '#5a301e', null, true),
  chicken: art(g => { blob(g, 7, 7, 5, 4.5, '#f0c8b0', '#fff0e0', '#d0a088'); line(g, '#f4f0e0', 10, 10, 13, 13, 2); px(g, '#ffffff', 13, 12, 2, 2); }),
  cooked_chicken: art(g => { blob(g, 7, 7, 5, 4.5, '#c08040', '#e0a060', '#8a5020'); line(g, '#f4f0e0', 10, 10, 13, 13, 2); px(g, '#ffffff', 13, 12, 2, 2); }),
  rotten_flesh: art(g => { blob(g, 8, 8, 6, 4.4, '#8a7a3a', '#a8984a', '#5a4a22'); for (const [x, y] of [[5, 7], [9, 6], [7, 10], [11, 9]]) px(g, '#b04a3a', x, y, 1, 1); px(g, '#4a3a1a', 6, 9, 2, 1); }),
  shears: art(g => { line(g, '#d8d8d8', 3, 3, 9, 9, 2); line(g, '#a8a8a8', 9, 3, 5, 7, 2); px(g, '#7a1a1a', 9, 9, 4, 3); px(g, '#7a1a1a', 4, 8, 3, 4); px(g, '#b03030', 10, 10, 2, 1); px(g, '#b03030', 5, 9, 1, 2); }),
  wheat: art(g => { for (const x of [5, 7, 9, 11]) { line(g, '#b89030', x - 1, 15, x, 6); px(g, '#e8c050', x - 1, 2 + (x % 3), 2, 4); px(g, '#c8a040', x, 3 + (x % 3), 1, 3); } }),
  wheat_seeds: art(g => { for (const [x, y] of [[4, 6], [8, 4], [10, 9], [5, 11], [12, 12], [7, 8]]) { px(g, '#5aa02a', x, y, 2, 1); px(g, '#3a7a1a', x, y + 1, 1, 1); } }),
  carrot: art(g => { line(g, '#f08a1a', 3, 13, 10, 6, 2); line(g, '#c86a10', 4, 13, 10, 7); px(g, '#ffb050', 6, 9, 1, 1); px(g, '#3a9a2a', 11, 3, 1, 3); px(g, '#3a9a2a', 12, 4, 3, 1); px(g, '#5ac83a', 12, 2, 1, 2); px(g, '#5ac83a', 13, 3, 2, 1); }),
  spider_eye: art(g => { blob(g, 8, 8, 5, 4.5, '#b02838', '#e05060', '#701820'); px(g, '#2a0a0e', 7, 7, 2, 2); }),
  white_wool: art(g => { noise(g, 16, 16, ['#f0f0f0', '#e4e4e4', '#d8d8d8', '#fafafa']); g.clearRect(0, 0, 16, 1); g.clearRect(0, 15, 16, 1); g.clearRect(0, 0, 1, 16); g.clearRect(15, 0, 1, 16); }),
};
function defineItems() {
  if (!hasInv() || typeof ITEMS === 'undefined') return;
  const def = (id, o) => { if (!ITEMS[id]) Inv.defineItem(Object.assign({ id, icon: ICONS[id] }, o)); };
  const food = (id, name, heal, hunger, stamina, secs, desc) => def(id, { name, kind: 'food', stack: 64, weight: .5, food: { heal, hunger, stamina, secs }, desc });
  def('bow', { name: 'Bow', kind: 'weapon', durability: 384, weight: 1, weapon: { dmg: 1, speed: .5, stamina: 2 }, desc: 'Hold Use to draw, let go to shoot. Needs arrows.' });
  def('arrow', { name: 'Arrow', kind: 'material', weight: .1 });
  def('shears', { name: 'Shears', kind: 'material', durability: 238, weight: .5, desc: 'Use on a sheep to get its wool.' });
  def('string', { name: 'String', weight: .1 }); def('bone', { name: 'Bone', weight: .3 }); def('gunpowder', { name: 'Gunpowder', weight: .2 });
  def('feather', { name: 'Feather', weight: .1 }); def('egg', { name: 'Egg', stack: 16, weight: .2 }); def('leather', { name: 'Leather', weight: .5 });
  def('spider_eye', { name: 'Spider Eye', weight: .2 }); def('wheat', { name: 'Wheat', weight: .2 }); def('wheat_seeds', { name: 'Wheat Seeds', weight: .1 });
  if (!ITEMS.white_wool) def('white_wool', { name: 'White Wool', weight: .5 });
  food('rotten_flesh', 'Rotten Flesh', 1, 4, 5, 120, 'It smells awful.');
  food('beef', 'Raw Beef', 1, 3, 5, 300); food('cooked_beef', 'Steak', 4, 8, 25, 1500);
  food('porkchop', 'Raw Porkchop', 1, 3, 5, 300); food('cooked_porkchop', 'Cooked Porkchop', 4, 8, 25, 1500);
  food('mutton', 'Raw Mutton', 1, 2, 5, 300); food('cooked_mutton', 'Cooked Mutton', 3, 6, 20, 1200);
  food('chicken', 'Raw Chicken', 1, 2, 5, 300); food('cooked_chicken', 'Cooked Chicken', 3, 6, 20, 1200);
  food('carrot', 'Carrot', 1, 3, 8, 300);
  const have = new Set((Inv.recipes ? Inv.recipes() : []).map(r => r.out)), rec = r => { if (!have.has(r.out) && ITEMS[r.out]) { Inv.addRecipe(r); have.add(r.out); } };
  rec({ out: 'bow', needs: { stick: 3, string: 3 }, station: 'workbench' });
  rec({ out: 'arrow', n: 4, needs: { flint: 1, stick: 1, feather: 1 }, station: 'workbench' });
  rec({ out: 'shears', needs: { iron_ingot: 2 } });
  if (ITEMS.white_wool && ITEMS.white_wool.kind === 'material') rec({ out: 'white_wool', needs: { string: 4 } });
  rec({ out: 'bread', needs: { wheat: 3 }, station: 'workbench' });
  const SMELT = [['beef', 'cooked_beef'], ['porkchop', 'cooked_porkchop'], ['mutton', 'cooked_mutton'], ['chicken', 'cooked_chicken']];
  if (typeof Stations !== 'undefined' && Stations && typeof Stations.addSmelt === 'function') { for (const [a, b] of SMELT) try { Stations.addSmelt(a, b, 10); } catch (e) { /* ignore */ } }
  else for (const [a, b] of SMELT) rec({ out: b, needs: { [a]: 1, coal: 1 }, station: 'workbench' });       // fallback until furnaces exist
  // tall grass sometimes drops seeds (and, until farming exists, a little wheat or a carrot)
  if (typeof Inv.onBreak === 'function' && !Inv.onBreak._mobs) {
    const ob = Inv.onBreak; Inv.onBreak = function (h) { const r = ob.apply(this, arguments);
      try { if (h && h.t === TALLGRASS) { const q = R(), p = new V3(h.x + .5, h.y + .5, h.z + .5); if (q < .125) drop('wheat_seeds', 1, p); else if (q < .16) drop('wheat', 1, p); else if (q < .175) drop('carrot', 1, p); } } catch (e) { /* ignore */ }
      return r; };
    Inv.onBreak._mobs = true;
  }
}
defineItems();

// =====================================================================================================
//  Bow: hold Use to draw (FOV squeeze), release to shoot
// =====================================================================================================
const bow = { on: false, t: 0, src: 'mouse', pid: null, auto: false, fovD: 0, k: 0 };
const ptr = { id: null, type: 'mouse', down: false };
addEventListener('pointerdown', e => { ptr.id = e.pointerId; ptr.type = e.pointerType; ptr.down = true; }, true);
const ptrUp = e => { if (e.pointerId === ptr.id) ptr.down = false; if (bow.on && !bow.auto && (e.pointerId === bow.pid || (bow.src === 'mouse' && e.pointerType === 'mouse' && (e.button === 2 || !(e.buttons & 2))))) releaseBow(); };
addEventListener('pointerup', ptrUp, true); addEventListener('pointercancel', ptrUp, true);
addEventListener('mouseup', e => { if (bow.on && bow.src === 'mouse' && e.button === 2) releaseBow(); }, true);
addEventListener('mousemove', e => { if (bow.on && bow.src === 'mouse' && !bow.auto && !(e.buttons & 2) && e.buttons !== undefined && ptr.type === 'mouse' && bow.t > .05) releaseBow(); }, true);
const hasArrows = () => hasInv() && Inv.count('arrow') > 0;
function startBow() {
  if (!hasArrows()) { if (AC) click(AC.currentTime, 300, .05); return; }
  bow.on = true; bow.t = 0; bow.src = ptr.type === 'mouse' ? 'mouse' : 'touch'; bow.pid = ptr.down ? ptr.id : null; bow.auto = !ptr.down; S.draw();
}
function releaseBow(cancel) {
  if (!bow.on) return; bow.on = false;
  const f = bow.t, pw = Math.min(1, (f * f + 2 * f) / 3);
  if (cancel || pw < .1 || state !== 'play' || heldId() !== 'bow' || !hasArrows()) return;
  const P = PL(), dir = lookDir(P.yaw, P.pitch), from = P.eye.addScaledVector(dir, .4); from.y -= .1;
  const crit = pw >= 1 && R() < .5, dmg = Math.ceil(pw * 6) + (crit ? ri(1, 3) : 0);
  shootArrow(from, dir.multiplyScalar(pw * 34), 'player', dmg, crit);
  Inv.remove('arrow', 1); if (Inv.damageHeld) Inv.damageHeld(1); S.twang(); P.swing = .3;
}
function bowTick(dt) {
  if (bow.on) {
    if (state !== 'play' || heldId() !== 'bow') releaseBow(true);
    else { bow.t += dt; if (bow.auto && bow.t >= 1) releaseBow(); }
  }
  const k = bow.on ? Math.min(1, bow.t) : 0; bow.k = lerp(bow.k, k, .3);
  // FOV squeeze: undo our last change (the main loop lerps from it), then apply the new one
  if (state === 'play') { camera.fov += bow.fovD * .85; bow.fovD = camera.fov * .16 * bow.k; camera.fov -= bow.fovD; camera.updateProjectionMatrix(); }
  else bow.fovD = 0;
  if (heldMesh && bow.k > .01 && heldId() === 'bow') {
    const sh = bow.t >= 1 ? Math.sin(performance.now() / 25) * .006 : 0;
    heldMesh.position.x = lerp(heldMesh.position.x, .3, bow.k) + sh; heldMesh.position.y = lerp(heldMesh.position.y, -.38, bow.k); heldMesh.position.z = lerp(heldMesh.position.z, -.8 + bow.k * .12, bow.k);
    heldMesh.rotation.z = lerp(heldMesh.rotation.z, -.35, bow.k);
  }
}

// =====================================================================================================
//  Use: draw the bow, feed or shear animals
// =====================================================================================================
function animalInFront() {
  const P = PL(), eye = P.eye, dir = lookDir(P.yaw, P.pitch); let best = null, bd = 1e9;
  for (const e of MOBS) { if (!e.animal || e.dead > 0) continue; const to = e.center().sub(eye), d = to.length();
    if (d < 4.2 && d < bd && to.normalize().dot(dir) > (d < 1.6 ? .5 : .78)) { best = e; bd = d; } }
  return best;
}
(HOOKS.use || (HOOKS.use = [])).unshift(() => {
  if (state !== 'play') return false;
  if (typeof Meadows !== 'undefined' && Meadows.dialog && Meadows.dialog.open) return false;
  const id = heldId();
  if (id === 'bow') { if (!bow.on) startBow(); return true; }
  if (!id) return false;
  const a = animalInFront(); if (!a) return false;
  if (id === 'shears' && a.kind === 'sheep' && !a.sheared && !a.isBaby) { a.setSheared(true); drop('white_wool', ri(1, 3), a.center()); if (Inv.damageHeld) Inv.damageHeld(1); S.snip(); PL().swing = 1; return true; }
  if (FOODS[a.kind] && FOODS[a.kind].includes(id)) { if (a.feed(id)) { Inv.consumeHeld(1); PL().swing = 1; } return true; }
  return false;
});

// =====================================================================================================
//  Caves and a ravine (carved after the main world generation, before anything is saved)
// =====================================================================================================
const caveRng = mulberry32(51061);
function carveWorld() {
  const rng = caveRng, touched = new Set(), mark = (x, z) => touched.add(Math.floor(x / CS) + ',' + Math.floor(z / CS));
  const keep = new Uint8Array(WX * WZ);                  // columns we must not touch: homes, roads, the altar, built things
  const ALT = typeof Meadows !== 'undefined' && Meadows.ALT ? Meadows.ALT : null;
  for (let z = 0; z < WZ; z++) for (let x = 0; x < WX; x++) {
    let k = 0; for (let dz = -2; dz <= 2 && !k; dz++) for (let dx = -2; dx <= 2; dx++) { const X = x + dx, Z = z + dz; if (X >= 0 && Z >= 0 && X < WX && Z < WZ && reserved[Z * WX + X]) { k = 1; break; } }
    if (!k && ALT && Math.hypot(x - ALT.cx, z - ALT.cz) < 14) k = 1;
    if (!k) for (let y = Math.max(1, hmap[z * WX + x] - 1); y < WY; y++) { const t = get(x, y, z); if (t > DANDELION && t !== TORCH) { k = 1; break; } }   // rune stones, altars, stations
    keep[z * WX + x] = k;
  }
  const nearWater = (x, y, z) => get(x + 1, y, z) === WATER || get(x - 1, y, z) === WATER || get(x, y, z + 1) === WATER || get(x, y, z - 1) === WATER || get(x, y + 1, z) === WATER;
  function carveCell(x, y, z, surface) {
    if (!inb(x, y, z) || y < 1 || keep[z * WX + x]) return;
    const t = get(x, y, z); if (!NATURAL.has(t) && !(surface && (t === LOG || t === LEAVES || PLANT(t)))) return;
    if (!surface && y > hmap[z * WX + x] - 2) return;
    if (nearWater(x, y, z)) return;
    set(x, y, z, AIR); mark(x, z);
    if (PLANT(get(x, y + 1, z))) set(x, y + 1, z, AIR);
  }
  function sphere(cx, cy, cz, r, surface) {
    for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let z = Math.floor(cz - r); z <= cz + r; z++) for (let x = Math.floor(cx - r); x <= cx + r; x++) {
      const dx = x + .5 - cx, dy = (y + .5 - cy) * 1.3, dz = z + .5 - cz; if (dx * dx + dy * dy + dz * dz <= r * r) carveCell(x, y, z, surface); }
  }
  function oreAt(x, y, z) {               // a small ore cluster in a wall
    const t = y < 9 && rng() < .45 ? IRONORE : COAL, n = 2 + (rng() * 4 | 0);
    for (let i = 0; i < n; i++) { const X = x + ((rng() * 3 | 0) - 1), Y = y + ((rng() * 3 | 0) - 1), Z = z + ((rng() * 3 | 0) - 1); if (get(X, Y, Z) === STONE) { set(X, Y, Z, t); mark(X, Z); } }
  }
  function wallOre(cx, cy, cz, r) {
    const a = rng() * Math.PI * 2, b = (rng() - .5) * 1.4;
    for (let s = r; s < r + 3; s += .5) { const x = Math.floor(cx + Math.cos(a) * Math.cos(b) * s), y = Math.floor(cy + Math.sin(b) * s), z = Math.floor(cz + Math.sin(a) * Math.cos(b) * s);
      if (get(x, y, z) === STONE) { oreAt(x, y, z); return; } }
  }
  // worm tunnels
  const worms = []; let tries = 0;
  while (worms.length < 9 && tries++ < 400) {
    const x = 10 + rng() * (WX - 20), z = 10 + rng() * (WZ - 20), xi = x | 0, zi = z | 0, h = hmap[zi * WX + xi];
    if (keep[zi * WX + xi] || h < 9) continue;
    const mouth = worms.length < 3;
    worms.push({ x, z, y: mouth ? h + 1 : 2.5 + rng() * Math.max(1, h - 7), mouth });
  }
  for (const w of worms) {
    let { x, y, z } = w, yaw = rng() * Math.PI * 2, pitch = w.mouth ? -.55 : (rng() - .5) * .3; const len = 70 + rng() * 80;
    for (let i = 0; i < len; i++) {
      const r = 1.25 + Math.sin(i * .17) * .35 + rng() * .5 + (i % 37 === 0 ? 1.3 : 0);
      const surf = w.mouth && i < 14;
      sphere(x, y, z, r, surf);
      if (rng() < .22) wallOre(x, y, z, r);
      yaw += (rng() - .5) * .42; pitch = clamp(pitch * .92 + (rng() - .5) * .22, -.6, .6);
      x += Math.cos(yaw) * Math.cos(pitch); z += Math.sin(yaw) * Math.cos(pitch); y += Math.sin(pitch);
      const xi = clamp(x | 0, 0, WX - 1), zi = clamp(z | 0, 0, WZ - 1), h = hmap[zi * WX + xi];
      if (!surf && y > h - 3) { pitch = -Math.abs(pitch) - .1; y = Math.min(y, h - 3); }
      if (y < 2.2) { pitch = Math.abs(pitch) + .05; y = 2.2; }
      if (x < 6 || z < 6 || x > WX - 6 || z > WZ - 6) yaw += Math.PI * .8;
    }
  }
  // one ravine: pick the highest, emptiest straight-ish line
  let best = null, bs = -1e9;
  for (let k = 0; k < 60; k++) {
    const x0 = 12 + rng() * (WX - 24), z0 = 12 + rng() * (WZ - 24), a = rng() * Math.PI * 2, L = 30 + rng() * 10, x1 = x0 + Math.cos(a) * L, z1 = z0 + Math.sin(a) * L;
    if (x1 < 10 || z1 < 10 || x1 > WX - 10 || z1 > WZ - 10) continue;
    let s = 0, bad = 0; for (let t = 0; t <= 1; t += .05) { const xi = (x0 + (x1 - x0) * t) | 0, zi = (z0 + (z1 - z0) * t) | 0; for (let dz = -4; dz <= 4; dz++) for (let dx = -4; dx <= 4; dx++) if (keep[(zi + dz) * WX + xi + dx]) bad++; s += hmap[zi * WX + xi]; }
    s -= bad * 30; if (s > bs) { bs = s; best = { x0, z0, x1, z1, a, L }; }
  }
  if (best && bs > 0) {
    const { x0, z0, x1, z1, L } = best, nx = -(z1 - z0) / L, nz = (x1 - x0) / L;
    for (let s = 0; s <= L; s += .4) {
      const t = s / L, cx = x0 + (x1 - x0) * t + Math.sin(t * 7) * 1.2, cz = z0 + (z1 - z0) * t + Math.cos(t * 5) * 1.2, half = .6 + Math.sin(t * Math.PI) * 2.1;
      const floorY = 2 + Math.round(Math.abs(Math.sin(t * 9)) * 1.5);
      for (let o = -half - 1; o <= half + 1; o += .5) {
        const x = Math.floor(cx + nx * o), z = Math.floor(cz + nz * o); if (!inb(x, 1, z)) continue;
        const h = hmap[z * WX + x], widen = Math.abs(o) <= half ? 0 : 1;           // walls widen near the top
        for (let y = floorY + (widen ? Math.max(0, h - 3 - floorY) : 0); y < WY; y++) carveCell(x, y, z, true);
        if (rng() < .05) wallOre(cx, floorY + rng() * (h - floorY), cz, half);
      }
    }
    for (let s = 0; s <= L; s += 1) { const t = s / L; for (let o = -5; o <= 5; o++) { const x = Math.floor(x0 + (x1 - x0) * t + nx * o), z = Math.floor(z0 + (z1 - z0) * t + nz * o); if (!inb(x, 1, z)) continue;
      let y = WY - 1; while (y > 0 && !solidAt(x, y, z)) y--; hmap[z * WX + x] = Math.min(hmap[z * WX + x], y); } }
    RAVINE = { x: (x0 + x1) / 2, z: (z0 + z1) / 2, a: best.a, len: L };
  }
  rebuildChunks(touched);
  return touched.size;
}
let RAVINE = null;
// The flat ocean plane spans the whole map at sea level, so it showed through caves, ravines and deep holes.
// Cut the island out of it: inside the island the real water blocks draw the sea.
(() => { const sea = scene.children.find(o => o.isMesh && o.geometry && o.geometry.type === 'PlaneGeometry' && o.material && o.material.color && o.material.color.getHex() === 0x3a64d6);
  if (!sea) return; const S2 = new THREE.Shape([new THREE.Vector2(-450, -450), new THREE.Vector2(450, -450), new THREE.Vector2(450, 450), new THREE.Vector2(-450, 450)]);
  S2.holes.push(new THREE.Path([new THREE.Vector2(-WX / 2, -WZ / 2), new THREE.Vector2(-WX / 2, WZ / 2), new THREE.Vector2(WX / 2, WZ / 2), new THREE.Vector2(WX / 2, -WZ / 2)]));
  sea.geometry.dispose(); sea.geometry = new THREE.ShapeGeometry(S2); sea.material.side = THREE.DoubleSide; })();
const carveT0 = performance.now(), carvedChunks = carveWorld(), carveMs = Math.round(performance.now() - carveT0);

// =====================================================================================================
//  Animals at start (replace the old wander-only pigs and sheep) and the spawner
// =====================================================================================================
function grassSpot(cx, cz, r0, r1) {
  for (let k = 0; k < 14; k++) {
    const a = R() * Math.PI * 2, r = r0 + R() * (r1 - r0), x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
    if (x < 5 || z < 5 || x > WX - 5 || z > WZ - 5) continue; const xi = Math.floor(x), zi = Math.floor(z); if (reserved[zi * WX + xi]) continue;
    const g = groundY(x, z); if (g.t !== GRASS || g.y <= SEA + 1) continue; return { x: xi + .5, z: zi + .5, y: g.y };
  }
  return null;
}
function initAnimals() {
  const old = (typeof mobs !== 'undefined' && Array.isArray(mobs)) ? mobs.splice(0) : [];
  for (const m of old) if (m.group) scene.remove(m.group);
  const plan = ['pig', 'sheep', 'cow', 'chicken', 'pig', 'sheep', 'cow', 'chicken', 'pig', 'sheep'];
  plan.forEach((k, i) => { const o = old[i]; let s = o ? { x: o.pos.x, z: o.pos.z } : null;
    if (!s) { const c = grassSpot(WX / 2, WZ / 2, 10, 70); if (c) s = c; }
    if (s) spawn(k, s.x, s.z); });
}
initAnimals();
function caveSpot(P) {
  for (let k = 0; k < 10; k++) {
    const a = R() * Math.PI * 2, r = 10 + R() * 16, x = Math.floor(P.pos.x + Math.cos(a) * r), z = Math.floor(P.pos.z + Math.sin(a) * r);
    if (x < 3 || z < 3 || x > WX - 4 || z > WZ - 4 || isHome(x, z)) continue;
    const top = Math.min(WY - 3, Math.floor(P.pos.y) + 8);
    for (let y = top; y >= 1; y--) {
      if (!solidAt(x, y - 1, z) || solidAt(x, y, z) || solidAt(x, y + 1, z) || get(x, y, z) === WATER) continue;
      if (y > hmap[z * WX + x] - 2 || !covered(x, y + 2, z) || torchNear(x, y, z, 6)) continue;
      return { x: x + .5, y, z: z + .5 };
    }
  }
  return null;
}
function nightSpot(P) {
  for (let k = 0; k < 10; k++) {
    const a = R() * Math.PI * 2, r = 16 + R() * 18, x = P.pos.x + Math.cos(a) * r, z = P.pos.z + Math.sin(a) * r;
    if (x < 4 || z < 4 || x > WX - 4 || z > WZ - 4 || isHome(x, z)) continue;
    const g = groundY(x, z); if (![GRASS, SAND, DIRT, STONE, SANDSTONE, ROAD].includes(g.t) || g.y <= SEA) continue;
    if (torchNear(x, g.y, z, 7)) continue;
    return { x: Math.floor(x) + .5, y: g.y, z: Math.floor(z) + .5 };
  }
  return null;
}
const HOSTILE_W = [['zombie', .36], ['skeleton', .26], ['creeper', .22], ['spider', .16]];
const pickHostile = () => { let q = R(); for (const [k, w] of HOSTILE_W) if ((q -= w) < 0) return k; return 'zombie'; };
let spawnT = 2, animalT = 30, enabled = true;
function spawnTick(dt) {
  if ((spawnT -= dt) > 0) return; spawnT = 1.5;
  const P = PL(), night = isNight(); let alive = 0, surf = 0, cave = 0;
  for (const e of ENTITIES) if (!(e.dead > 0) && !e.removed) alive++;
  for (const m of MOBS.slice()) {
    if (!m.hostile || m.dead > 0) continue;
    const d = Math.hypot(m.pos.x - P.pos.x, m.pos.z - P.pos.z);
    if (d > 64 || (!night && !m.cave && d > 28 && R() < .08)) { m.remove(); continue; }
    if (m.cave) cave++; else surf++;
  }
  if (!enabled || alive >= 24) return;
  if (night && surf < 5 && R() < .6) { const s = nightSpot(P); if (s) { const k = pickHostile(), e = spawn(k, s.x, s.z, s.y); if (e && k === 'zombie' && R() < .05) { e.remove(); spawn('zombie', s.x, s.z, s.y); } return; } }
  if (cave < 3 && R() < .35) { const s = caveSpot(P); if (s) { const e = spawn(pickHostile(), s.x, s.z, s.y); if (e) e.cave = true; return; } }
  if ((animalT -= 1.5) <= 0) { animalT = 60; if (!night && animalCount() < 6) { const s = grassSpot(P.pos.x, P.pos.z, 30, 50); if (s) spawn(['pig', 'sheep', 'cow', 'chicken'][ri(0, 3)], s.x, s.z); } }
}

// =====================================================================================================
//  Save / Load: world diff (run-length), time, character, positions, stats, animals and other modules
// =====================================================================================================
const SAVE_KEY = 'blockcraft.world.v1', INV_KEY = 'blockcraft.inventory.v1';
let GEN = null, started = false, pendingLoad = null, autoT = 0, lastState = state;
function snapshot() { if (!GEN) GEN = world.slice(); }
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', snapshot); else setTimeout(snapshot, 0);
function encodeDiff() {
  if (!GEN) return ''; const out = [], N = world.length; let i = 0;
  while (i < N) {
    if (world[i] === GEN[i]) { i++; continue; }
    const start = i, vals = []; let gap = 0;
    while (i < N && gap <= 3) { if (world[i] !== GEN[i]) { for (let g = gap; g > 0; g--) vals.push(world[i - g]); gap = 0; vals.push(world[i]); } else gap++; i++; }
    let s = start.toString(36) + ':', last = -1, n = 0; const parts = [];
    const flush = () => { if (n) parts.push(last.toString(36) + (n > 1 ? '*' + n.toString(36) : '')); };
    for (const v of vals) { if (v === last) n++; else { flush(); last = v; n = 1; } } flush();
    out.push(s + parts.join(','));
  }
  return out.join(';');
}
function applyDiff(str) {
  const chunks = new Set(); if (!str) return chunks;
  for (const run of str.split(';')) {
    const [a, b] = run.split(':'); if (!b) continue; let i = parseInt(a, 36);
    for (const p of b.split(',')) { const [v, n] = p.split('*'); const val = parseInt(v, 36), cnt = n ? parseInt(n, 36) : 1;
      for (let k = 0; k < cnt && i < world.length; k++, i++) { world[i] = val; const x = i % WX, z = Math.floor(i / WX) % WZ; chunks.add(Math.floor(x / CS) + ',' + Math.floor(z / CS)); } }
  }
  return chunks;
}
function readSave() { try { const s = localStorage.getItem(SAVE_KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; } }
const savingEl = document.createElement('div');
savingEl.className = 'mc'; savingEl.textContent = 'Saving world...';
savingEl.style.cssText = 'position:fixed;right:12px;bottom:10px;color:#fff;font:16px var(--ui, monospace);text-shadow:2px 2px 0 #3f3f3f;opacity:0;transition:opacity .3s;pointer-events:none;z-index:40';
document.body.appendChild(savingEl);
let savingT = 0;
function save(quiet) {
  if (!started || state === 'title') return false;
  const data = { v: 1, at: Date.now(), diff: encodeDiff(), cur,
    time: hasWorld() ? World.time01() : null, day: hasWorld() && World.day ? World.day() : 1,
    chars: chars.map((c, i) => ({ p: [+c.pos.x.toFixed(2), +c.pos.y.toFixed(2), +c.pos.z.toFixed(2)], yaw: +c.yaw.toFixed(3), pitch: +c.pitch.toFixed(3),
      hp: DEFS[i].hp, food: DEFS[i].food, lvl: DEFS[i].lvl, xp: DEFS[i].xp, stamina: DEFS[i].stamina })),
    animals: MOBS.filter(m => m.animal && !(m.dead > 0)).map(m => [m.kind, +m.pos.x.toFixed(2), +m.pos.y.toFixed(2), +m.pos.z.toFixed(2), Math.round(m.age), m.sheared ? 1 : 0, Math.round(m.hp)]),
  };
  if (typeof Meadows !== 'undefined' && Meadows.flags) data.meadows = { flags: Object.assign({}, Meadows.flags), stage: Meadows.stage };
  try { emit('save', data); } catch (e) { console.error(e); }
  try { if (hasInv() && Inv.save) Inv.save(); } catch (e) { /* ignore */ }
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch (e) { return false; }
  if (!quiet) { savingT = 1.6; savingEl.style.opacity = 1; }
  return true;
}
function load(data) {
  data = data || readSave(); if (!data) return false;
  rebuildChunks(applyDiff(data.diff));
  if (hasWorld() && data.time != null && World.setTime) World.setTime(data.time);
  (data.chars || []).forEach((s, i) => { const c = chars[i], d = DEFS[i]; if (!c || !s) return;
    c.pos.set(s.p[0], s.p[1], s.p[2]); c.yaw = s.yaw || 0; c.pitch = s.pitch || 0; c.vel.set(0, 0, 0); c.group.rotation.y = c.yaw + Math.PI;
    if (collides(c.pos)) c.pos.y = groundY(c.pos.x, c.pos.z).y;
    for (const k of ['hp', 'food', 'lvl', 'xp', 'stamina']) if (s[k] != null) d[k] = s[k]; });
  if (data.cur != null && chars[data.cur]) cur = data.cur;
  if (Array.isArray(data.animals)) {
    for (const m of MOBS.slice()) if (m.animal) m.remove();
    for (const [k, x, y, z, age, sheared, hp] of data.animals) { const e = spawn(k, x, z, y); if (!e) continue; e.pos.y = y; e.age = age || 0; if (e.age < 0) e.setBaby(true); if (sheared && e.setSheared) e.setSheared(true); if (hp) e.hp = Math.min(e.max, hp); }
  }
  if (data.meadows && typeof Meadows !== 'undefined') { Object.assign(Meadows.flags, data.meadows.flags || {}); if ((data.meadows.stage || 0) >= 1 || (data.meadows.flags || {}).intro) Meadows.skipIntro(); }
  for (const m of MOBS.slice()) if (m.hostile) m.remove();
  drawStats(); if (typeof selectHot === 'function') selectHot(hotSel);
  try { emit('load', data); } catch (e) { console.error(e); }
  return true;
}
function clearSave() { try { localStorage.removeItem(SAVE_KEY); localStorage.removeItem(INV_KEY); } catch (e) { /* ignore */ } }

// title screen: Continue / New World; pause menu: Save and Quit to Title
const playBtn = document.getElementById('playBtn');
if (playBtn) {
  const cont = document.createElement('button'); cont.className = 'mcbtn'; cont.id = 'continueBtn'; cont.type = 'button'; cont.textContent = 'Continue';
  playBtn.parentNode.insertBefore(cont, playBtn);
  const refresh = () => { const has = !!readSave(); cont.hidden = !has; playBtn.textContent = has ? 'New World' : 'Singleplayer'; };
  refresh();
  cont.addEventListener('click', () => { pendingLoad = readSave(); playBtn.click(); });
  playBtn.addEventListener('click', () => {
    if (pendingLoad) return;
    if (readSave()) {      // New World: forget the old save
      clearSave();
      try { const b = hasInv() && Inv.bag && Inv.bag(); if (b) { b.main.fill(null); b.armor.fill(null); b.off.fill(null); Inv.remove('arrow', 0); } } catch (e) { /* ignore */ }
      try { emit('newworld'); } catch (e) { console.error(e); }
    }
  }, true);
}
const resumeBtn = document.getElementById('resumeBtn');
if (resumeBtn) {
  const q = document.createElement('button'); q.className = 'mcbtn'; q.id = 'saveQuitBtn'; q.type = 'button'; q.textContent = 'Save and Quit to Title';
  resumeBtn.parentNode.appendChild(q);
  q.addEventListener('click', () => { SFX.uiClick && SFX.uiClick(); save(); setTimeout(() => location.reload(), 150); });
}
addEventListener('pagehide', () => { if (started) save(true); });
document.addEventListener('visibilitychange', () => { if (document.hidden && started) save(true); });

// =====================================================================================================
//  Hooks
// =====================================================================================================
on('start', () => {
  started = true; autoT = 0;
  if (pendingLoad) { const d = pendingLoad; pendingLoad = null; load(d); chat('Loaded saved world'); }
});
on('frame', dt => {
  if (state === 'title') return;
  if (state === 'play') spawnTick(dt);
  updateArrows(dt); updateParts(dt);
});
on('tick', rawDt => {
  bowTick(rawDt);
  if (started && state === 'play') { autoT += rawDt; if (autoT >= 60) { autoT = 0; save(); } }
  if (started && state === 'pause' && lastState !== 'pause') save();
  lastState = state;
  if (savingT > 0) { savingT -= rawDt; if (savingT <= 0) savingEl.style.opacity = 0; }
});

// =====================================================================================================
//  Public API
// =====================================================================================================
window.Mobs = {
  spawn, kinds: Object.keys(KINDS), get list() { return MOBS; }, get arrows() { return ARROWS; }, explode, shootArrow,
  get bow() { return bow; }, get ravine() { return RAVINE; }, carvedChunks, carveMs, setSpawning(v) { enabled = !!v; },
  animals: () => MOBS.filter(m => m.animal), hostiles: () => MOBS.filter(m => m.hostile),
};
window.Save = { save: () => save(), load: d => load(d), has: () => !!readSave(), clear: clearSave, read: readSave, encodeDiff, applyDiff, get started() { return started; } };
})();
