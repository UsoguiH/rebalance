"use strict";
// =====================================================================
//  Combat & survival module (Valheim-style rules, Minecraft-style look)
//  Stamina, melee with crits / sweep / knockback / damage numbers, shields with block + parry,
//  dodge roll, armor, hunger + regen + starvation, eating with food buffs and status icons,
//  fall damage, drowning, the "You died!" screen and hurt feedback.
//  Loaded after the main script; uses its globals (see CONTRACT.md) and exposes `Combat`.
// =====================================================================
const Combat = (() => {
  const CFG = {
    stamina: 50, regen: 12, regenDelay: 1, exhaustedUntil: .25,   // base max, per second, delay after use (s), recover fraction
    sprintDrain: 7, jumpCost: 5, dodgeCost: 14, dodgeTime: .38, iframes: .3,
    handStamina: 3, parryWindow: .25, blockScale: .4, guardBreak: 1.2, staggerSecs: 2.2,
    maxFoods: 3, eatTime: 1.6, airMax: 15, fallPerBlock: 2,   // fall: 1 heart (2 hp) per block above 3
  };
  const hasInv = () => typeof Inv !== 'undefined' && Inv;
  const itemDef = st => st && typeof ITEMS !== 'undefined' && ITEMS ? ITEMS[st.id] || null : null;
  const held = () => { try { return hasInv() && Inv.held ? Inv.held() : null; } catch (e) { return null; } };
  const offhand = () => { try { return hasInv() && Inv.offhand ? Inv.offhand() : null; } catch (e) { return null; } };
  const heldItem = () => itemDef(held());
  function shieldItem() {
    const h = heldItem(); if (h && h.kind === 'shield') return h;
    const o = itemDef(offhand()); return o && o.kind === 'shield' ? o : null;
  }
  const armorPoints = () => { try { return hasInv() && Inv.armor ? clamp(+Inv.armor() || 0, 0, 30) : 0; } catch (e) { return 0; } };
  const inWater = ch => get(Math.floor(ch.pos.x), Math.floor(ch.pos.y + .4), Math.floor(ch.pos.z)) === WATER;
  const headInWater = ch => { const e = ch.eye; return get(Math.floor(e.x), Math.floor(e.y), Math.floor(e.z)) === WATER; };

  // ---- per-character survival state (lives on the DEFS entry so each character keeps their own)
  function ST(d = DEFS[cur]) {
    return d._cb || (d._cb = { stamina: CFG.stamina, wait: 0, exhausted: false, exh: 0, foods: [], air: CFG.airMax, regenT: 0, starveT: 0, drownT: 0 });
  }
  const maxStamina = (d = DEFS[cur]) => CFG.stamina + ST(d).foods.reduce((a, f) => a + f.stamina, 0);
  let barFlash = 0, breathT = 0;
  function useStamina(n) {
    const s = ST();
    if (s.exhausted || s.stamina < n) { barFlash = .5; if (breathT <= 0) { SND.breath(); breathT = 1.2; } return false; }
    s.stamina -= n; s.wait = CFG.regenDelay; if (s.stamina <= .01) { s.stamina = 0; s.exhausted = true; }
    return true;
  }
  function drainStamina(n) {
    const s = ST(); s.stamina = Math.max(0, s.stamina - n); s.wait = CFG.regenDelay;
    if (s.stamina <= 0) { s.exhausted = true; barFlash = .5; }
  }
  const exhaust = n => { ST().exh += n; };

  // ---- sounds (synthesized, like the rest of the game)
  function tone(t, f0, f1, dur, peak, type = 'sine', wet = .3) {
    const o = AC.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = AC.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + .008); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); out(g, wet); o.start(t); o.stop(t + dur + .05);
  }
  function voice(t, f0, f1, dur, peak, formants) {      // a sawtooth through vowel formants: "oof", burps
    const o = AC.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = AC.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + .015); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    for (const [f, q] of formants) { const bp = AC.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q; o.connect(bp); bp.connect(g); }
    out(g, .2); o.start(t); o.stop(t + dur + .05);
  }
  const SND = {
    swing() { if (!AC) return; noiseSweep(AC.currentTime, .2, 500, 1900, .2, 1.1, .06); },
    hit(crit) { if (!AC) return; const t = AC.currentTime; noiseSweep(t, .09, 2200, 700, .35, 1, .002); thump(t, 210, 85, .1, .3);
      if (crit) { click(t, 2600, .06); noiseSweep(t + .02, .12, 5000, 2500, .25, 2, .002, 'highpass'); } },
    sweep() { if (!AC) return; noiseSweep(AC.currentTime, .28, 1400, 400, .22, .8, .03); },
    block() { if (!AC) return; const t = AC.currentTime; thump(t, 190, 80, .16, .6, 'triangle'); noiseSweep(t, .13, 1000, 380, .4, 1.4, .003); },
    parry() { if (!AC) return; const t = AC.currentTime;
      for (const [f, a, d] of [[1250, .22, 1], [1873, .16, .8], [2690, .12, .55], [3410, .08, .4]]) tone(t, f, f * .995, d, a, 'sine', .7);
      noiseSweep(t, .16, 7000, 2500, .45, 1, .002, 'highpass'); thump(t, 230, 110, .22, .45); },
    guardBreak() { if (!AC) return; const t = AC.currentTime; thump(t, 110, 40, .45, .6, 'square'); noiseSweep(t, .35, 900, 120, .45, .8, .004); },
    raise() { if (!AC) return; noiseSweep(AC.currentTime, .1, 600, 300, .12, 1, .01, 'lowpass'); },
    oof(deep) { if (!AC) return; const t = AC.currentTime; voice(t, deep ? 150 : 215, deep ? 80 : 135, deep ? .4 : .22, .9, [[640, 4], [1080, 6]]); thump(t, 120, 70, .12, .25); },
    crunch() { if (!AC) return; const t = AC.currentTime; noiseSweep(t, .09, 1500 + Math.random() * 900, 800, .3, 1.6, .004); click(t, 900 + Math.random() * 500, .03); },
    burp() { if (!AC) return; voice(AC.currentTime, 105, 70, .38, .7, [[480, 3], [800, 5]]); },
    bubble() { if (!AC) return; tone(AC.currentTime, 480, 1300, .08, .12); },
    dodge() { if (!AC) return; const t = AC.currentTime; noiseSweep(t, .32, 300, 1300, .25, .8, .08); noiseSweep(t + .3, .12, 600, 300, .15, 1, .01, 'lowpass'); },
    land() { if (!AC) return; const t = AC.currentTime; thump(t, 130, 45, .25, .6); noiseSweep(t, .15, 700, 200, .3, 1, .003, 'lowpass'); },
    breath() { if (!AC) return; noiseSweep(AC.currentTime, .45, 700, 420, .08, .7, .18); },
    whiff() { if (!AC) return; noiseSweep(AC.currentTime, .15, 2500, 1200, .1, 2, .01, 'highpass'); },
  };

  // ---- effects: floating damage numbers, crit stars, sparks, sweep arc, eating bits
  const FXL = [];
  function addFx(obj, o) {
    scene.add(obj); FXL.push(Object.assign({ obj, v: new V3(), life: 1, max: 1, grav: 0, drag: 0, fade: false, shrink: false, s0: obj.scale.x, own: true }, o));
    if (FXL.length > 260) killFx(0);
  }
  function killFx(i) { const q = FXL[i]; scene.remove(q.obj); if (q.own) { if (q.obj.material.map && q.ownMap) q.obj.material.map.dispose(); q.obj.material.dispose(); } FXL.splice(i, 1); }
  function updateFx(dt) {
    for (let i = FXL.length - 1; i >= 0; i--) {
      const q = FXL[i]; q.life -= dt; if (q.life <= 0) { killFx(i); continue; }
      q.v.y -= q.grav * dt; if (q.drag) q.v.multiplyScalar(Math.max(0, 1 - q.drag * dt)); q.obj.position.addScaledVector(q.v, dt);
      const k = q.life / q.max;
      if (q.fade) q.obj.material.opacity = clamp(q.life / Math.min(.35, q.max * .5), 0, 1);
      if (q.shrink) { const s = q.s0 * Math.max(.05, k); q.obj.scale.set(s * (q.ax || 1), s * (q.ay || 1), s); }
    }
  }
  const nearestTex = c => { const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; return t; };
  const STAR = nearestTex(pixCanvas(7, 7, g => { g.fillStyle = '#fff'; g.fillRect(3, 0, 1, 7); g.fillRect(0, 3, 7, 1); g.fillRect(2, 2, 3, 3); }));
  const SWEEP = nearestTex(pixCanvas(32, 16, g => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 32; x++) {
      const nx = (x + .5 - 16) / 16, ny = (y + .5 - 16) / 15, r = Math.hypot(nx, ny); if (r < .68 || r > 1) continue;
      const edge = 1 - Math.abs(Math.atan2(nx, -ny)) / 1.7; if (edge <= 0) continue;
      const v = r > .9 ? 255 : r > .8 ? 225 : 175; g.fillStyle = `rgba(${v},${v},${v},${Math.min(1, edge * 1.6).toFixed(2)})`; g.fillRect(x, y, 1, 1);
    } }));
  function spriteAt(tex, pos, sx, sy, color = 0xffffff, ownMap = false) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color, transparent: true, depthTest: false, depthWrite: false, fog: false }));
    s.position.copy(pos); s.scale.set(sx, sy, 1); s.renderOrder = 40; return s;
  }
  function floatText(text, pos, color = '#ff5555', big = false) {
    const w = Math.max(16, text.length * 8 + 4);
    const c = pixCanvas(w, 12, g => { g.font = '8px "Press Start 2P", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = '#000'; for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1]]) g.fillText(text, w / 2 + ox, 6.5 + oy);
      g.fillStyle = '#3f0000'; g.fillText(text, w / 2 + 1, 7.5); g.fillStyle = color; g.fillText(text, w / 2, 6.5); });
    const sc = big ? .052 : .04, s = spriteAt(nearestTex(c), pos, w * sc, 12 * sc);
    addFx(s, { v: new V3((Math.random() - .5) * .5, 1.6, (Math.random() - .5) * .5), drag: 2.2, life: 1.05, max: 1.05, fade: true, ownMap: true });
  }
  function critStars(pos, n = 14, color = 0xd8d8ff) {
    for (let i = 0; i < n; i++) {
      const s = spriteAt(STAR, pos.clone().add(new V3((Math.random() - .5) * .8, (Math.random() - .5) * 1.2, (Math.random() - .5) * .8)), .2, .2, color);
      const v = new V3(Math.random() - .5, Math.random() * .8 + .1, Math.random() - .5).normalize().multiplyScalar(2.5 + Math.random() * 2.5);
      addFx(s, { v, drag: 3.5, grav: 2, life: .45 + Math.random() * .35, max: .8, shrink: true });
    }
  }
  const SPARK_MATS = ['#fff6c0', '#ffd23f', '#ff9a1f', '#ffffff'].map(c => new THREE.MeshBasicMaterial({ color: c, fog: false }));
  function sparks(pos, n, speed = 5) {
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(partGeo, SPARK_MATS[i % SPARK_MATS.length]); m.position.copy(pos); m.scale.setScalar(.5 + Math.random() * .6);
      addFx(m, { v: new V3(Math.random() - .5, Math.random() * .9, Math.random() - .5).normalize().multiplyScalar(speed * (.4 + Math.random() * .8)), grav: 14, drag: 1.5, life: .3 + Math.random() * .35, max: .6, shrink: true, own: false });
    }
  }
  function sweepArc(pos) { addFx(spriteAt(SWEEP, pos, 2.6, 1.3), { life: .26, max: .26, fade: true }); }
  function crumbs(pos, cols, n = 4) {
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(partGeo, new THREE.MeshBasicMaterial({ color: cols[(Math.random() * cols.length) | 0], depthTest: false, fog: false }));
      m.renderOrder = 55; m.position.copy(pos).add(new V3((Math.random() - .5) * .12, 0, (Math.random() - .5) * .12)); m.scale.setScalar(.45 + Math.random() * .35);
      addFx(m, { v: new V3((Math.random() - .5) * 1.4, .6 + Math.random() * 1.6, (Math.random() - .5) * 1.4), grav: 12, life: .45 + Math.random() * .3, max: .7 });
    }
  }

  // ---- melee
  let atkCd = 0, atkMax = .5, setMineCd = false;
  const staggerUntil = new WeakMap();
  const now = () => performance.now() / 1000;
  function weapon() {
    const st = held(), it = itemDef(st);
    if (it && it.weapon) return { dmg: +it.weapon.dmg || 4, speed: +it.weapon.speed || .6, stamina: it.weapon.stamina ?? 6, it, sword: /sword/.test(it.id), wear: 1 };
    if (it && it.tool) return { dmg: 2 + (+it.tool.power || 1), speed: .75, stamina: 5, it, wear: 2 };
    return { dmg: 2 + Math.floor(Math.random() * 5), speed: .42, stamina: CFG.handStamina, it: null, wear: 0 };   // bare hand (or a block): 2-6
  }
  function findTarget(reach = 4.2) {
    const pl = PL(), eye = pl.eye, dir = lookDir(pl.yaw, pl.pitch); let best = null, bd = 1e9;
    for (const e of ENTITIES) {
      if (e.dead > 0 || !e.center) continue;
      const to = e.center().sub(eye), dist = to.length();
      if (dist < reach && dist < bd && to.normalize().dot(dir) > (dist < 1.6 ? .55 : .8)) { best = e; bd = dist; }
    }
    if (!best) return null;
    const h = raycast(eye, dir, bd);                       // a solid block in the way blocks the swing (grass and leaves do not)
    if (h && BLOCK[h.t].kind !== 'cross' && !/Leaves|Needles/.test(BLOCK[h.t].name) && new V3(h.x + .5, h.y + .5, h.z + .5).distanceTo(eye) < bd - .7) return null;
    return best;
  }
  function hitEntity(e, dmg, dir, color, big) {
    e.hit(dmg, dir);
    const c = e.center(); c.y += 1 + Math.random() * .3;
    floatText(String(Math.round(dmg * 10) / 10), c, color, big);
  }
  function doAttack(target) {
    const pl = PL();
    if (atkCd > 0 || blocking || eating || dead) return false;
    const w = weapon();
    if (!useStamina(w.stamina)) return false;
    atkCd = atkMax = w.speed; pl.swing = 1; swingT = 1; exhaust(.1);
    if (!target) { SND.swing(); return false; }
    const eye = pl.eye, to = target.center().sub(eye), dir = new V3(to.x, 0, to.z).normalize();
    const crit = !pl.onGround && pl.vel.y < -.5 && !inWater(pl) && !pl.sprint;
    const stag = (staggerUntil.get(target) || 0) > now();
    let dmg = filter('meleeDamage', w.dmg, target);
    dmg *= (crit ? 1.5 : 1) * (stag ? 2 : 1);
    dmg = Math.max(1, Math.round(dmg));
    hitEntity(target, dmg, dir, crit ? '#ffaa00' : stag ? '#ffff55' : '#ff5555', crit || stag);
    SND.hit(crit || stag);
    if (crit) critStars(target.center());
    if (stag) critStars(target.center(), 10, 0xffff77);
    if (pl.sprint && target.dead <= 0 && target.pos) {   // sprint hit: extra knockback, ends the sprint (Minecraft)
      target.pos.x += dir.x * .8; target.pos.z += dir.z * .8; pl.sprint = false; pl.vel.x *= .4; pl.vel.z *= .4;
    }
    if (w.sword && pl.onGround && !pl.sprint && !crit) {   // sword sweep hits everything close to the target
      const tc = target.center(); let swept = 0;
      for (const e of ENTITIES) {
        if (e === target || e.dead > 0 || !e.center) continue; const c = e.center();
        if (Math.hypot(c.x - tc.x, c.z - tc.z) < 1.8 && c.distanceTo(eye) < 4.6) { hitEntity(e, Math.max(1, Math.round(dmg * .3)), new V3(c.x - pl.pos.x, 0, c.z - pl.pos.z).normalize(), '#ff8888'); swept++; }
      }
      sweepArc(eye.clone().addScaledVector(lookDir(pl.yaw, pl.pitch), 1.7).add(new V3(0, -.25, 0))); SND.sweep();
    }
    if (w.it && w.wear && (w.it.durability || held()?.dur != null) && hasInv() && Inv.damageHeld) { try { Inv.damageHeld(w.wear); } catch (e) { /* items module owns durability */ } }
    return true;
  }
  on('attack', () => {
    if (state !== 'play') return false;
    const t = findTarget(); if (!t) return false;
    doAttack(t); setMineCd = true; return true;       // handled: no block breaking while a mob is in front of you
  });

  // ---- shields: block and parry
  let blocking = false, blockT = 0, blockSrc = null, guardT = 0, lift = 0;
  function setBlocking(v, src = 'api') {
    if (!v) { blocking = false; blockSrc = null; return false; }
    if (blocking) return true;
    if (state !== 'play' || dead || eating || guardT > 0 || dodge) return false;
    if (!shieldItem()) return false;
    const s = ST(); if (s.exhausted || s.stamina <= 0) { barFlash = .5; return false; }
    blocking = true; blockT = 0; blockSrc = src; PL().sprint = false; SND.raise();
    return true;
  }
  function attackerFor(by) {
    const pp = PL().pos; let best = null, bd = 1e9;
    for (const e of ENTITIES) { if (e.dead > 0 || !e.pos) continue; const d = e.pos.distanceTo(pp) - (e.name === by ? 100 : 0); if (d < bd) { bd = d; best = e; } }
    return best && (best.name === by || bd < 6) ? best : null;
  }
  function stagger(e, secs) {
    if (!e) return; staggerUntil.set(e, now() + secs);
    if (typeof e.stagger === 'function') e.stagger(secs);
  }
  const shieldPos = () => { const pl = PL(); return pl.eye.addScaledVector(lookDir(pl.yaw, pl.pitch), .9).add(new V3(0, -.2, 0)); };

  // ---- dodge roll
  let dodge = null, invulnT = 0;
  function doDodge(f, r) {
    const pl = PL();
    if (state !== 'play' || dead || dodge || (!pl.onGround && !inWater(pl))) return false;
    if (!f && !r) f = -1;
    const fx = -Math.sin(pl.yaw), fz = -Math.cos(pl.yaw), rx = Math.cos(pl.yaw), rz = -Math.sin(pl.yaw);
    let dx = fx * f + rx * r, dz = fz * f + rz * r; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    if (!useStamina(CFG.dodgeCost)) return false;
    if (blocking) setBlocking(false); if (eating) cancelEat();
    dodge = { t: 0, dx, dz, side: Math.sign(r) || (Math.random() < .5 ? -1 : 1), f: Math.sign(f) };
    exhaust(.1); SND.dodge(); return true;
  }
  const dirKeys = () => ({ f: (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0), r: (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0) });
  let lastTap = { code: '', t: 0 };
  const TAP = { KeyA: [0, -1], KeyD: [0, 1], KeyS: [-1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowDown: [-1, 0] };
  on('key', e => {
    if (state !== 'play') return false;
    if (e.code === 'AltLeft' || e.code === 'AltRight') { e.preventDefault(); const k = dirKeys(); doDodge(k.f, k.r); return true; }
    if (TAP[e.code]) {
      const t = performance.now();
      if (lastTap.code === e.code && t - lastTap.t < 260) { doDodge(...TAP[e.code]); lastTap.t = 0; } else lastTap = { code: e.code, t };
    }
    return false;
  });
  addEventListener('keyup', e => { if ((e.code === 'AltLeft' || e.code === 'AltRight') && state === 'play') e.preventDefault(); });

  // ---- eating
  let eating = null;
  function foodColors(it) {
    const cols = [];
    if (it && it.icon) { try { const c = pixCanvas(16, 16, g => it.icon(g)); const d = c.getContext('2d').getImageData(0, 0, 16, 16).data;
      for (let i = 0; i < 256; i += 3) if (d[i * 4 + 3] > 128) cols.push(`rgb(${d[i * 4]},${d[i * 4 + 1]},${d[i * 4 + 2]})`); } catch (e) { /* icon optional */ } }
    return cols.length ? cols : ['#c8643c', '#8e3b1e', '#e8b070', '#5e2a12'];
  }
  function startEat(src = 'api') {
    if (state !== 'play' || dead || eating) return !!eating;
    const st = held(), it = itemDef(st); if (!it || it.kind !== 'food') return false;
    const d = DEFS[cur], s = ST(), fd = it.food || {};
    const has = s.foods.find(f => f.id === it.id);
    if (d.food >= 20 && has && has.t > has.max * .5) { chat("You can't eat any more " + it.name + ' yet'); return false; }
    if (blocking) setBlocking(false);
    eating = { id: it.id, it, fd, t: 0, src, crunchT: .15, cols: foodColors(it) };
    return true;
  }
  function cancelEat() { eating = null; }
  function finishEat() {
    const e = eating; eating = null; const d = DEFS[cur], s = ST(), fd = e.fd;
    if (hasInv() && Inv.consumeHeld) { try { Inv.consumeHeld(1); } catch (err) { /* items module */ } }
    d.food = clamp(d.food + (fd.hunger ?? 4), 0, 20);
    if (fd.heal) d.hp = clamp(d.hp + fd.heal, 0, 20);
    if (fd.stamina) {
      const secs = fd.secs || 300, old = s.foods.find(f => f.id === e.id);
      if (old) { old.t = old.max = secs; old.stamina = fd.stamina; }
      else { if (s.foods.length >= CFG.maxFoods) { s.foods.sort((a, b) => a.t - b.t); s.foods.shift(); } s.foods.push({ id: e.id, name: e.it.name, stamina: fd.stamina, t: secs, max: secs, icon: e.it.icon }); }
      s.stamina = Math.min(maxStamina(), s.stamina + fd.stamina); s.exhausted = false;
    }
    SND.burp(); drawStats(); statusDirty = true;
  }

  // ---- damage in: dodge i-frames, block / parry, armor (Minecraft formula)
  let carry = 0, dead = false;
  const ENV = { fall: 1, starvation: 1, drowning: 1 };
  on('damage', (n, by, kx = 0, kz = 0) => {
    if (n <= 0) return n;
    if (dead || state === 'title' || state === 'dead') return 0;
    const env = ENV[by], pl = PL();
    if (!env && (invulnT > 0 || (dodge && dodge.t < CFG.iframes))) { if (dodge) { SND.whiff(); floatText('DODGE', pl.eye.addScaledVector(lookDir(pl.yaw, 0), 1.6), '#aaaaaa'); } return 0; }
    if (!env && blocking) {
      const look = lookDir(pl.yaw, 0), front = kx || kz ? -(look.x * kx + look.z * kz) > .15 : true;
      const sh = shieldItem(), sp = (sh && sh.shield) || { block: 10, parry: 2 };
      if (front) {
        const att = attackerFor(by), at = shieldPos();
        if (blockT < CFG.parryWindow) {                     // PARRY: no damage, attacker staggered
          drainStamina(3); stagger(att, CFG.staggerSecs * Math.max(1, (sp.parry || 2) / 2));
          SND.parry(); sparks(at, 26, 7); critStars(at, 8, 0xfff2a0); shakeT = .2;
          flashEl.style.background = '#ffffff'; fx.flash = .3;
          if (att) floatText('PARRY!', att.center().add(new V3(0, 1.4, 0)), '#ffff55', true);
          return 0;
        }
        const power = (sp.block || 10) * CFG.blockScale, blocked = Math.min(n, power), cost = 5 + blocked * 1.6, s = ST();
        if (s.stamina >= cost) {
          drainStamina(cost); n -= blocked; SND.block(); sparks(at, 8, 4);
          pl.vel.x += kx * 2.5; pl.vel.z += kz * 2.5;
          if (n <= .01) return 0;
        } else {                                          // guard broken: the hit gets through, can't block for a moment
          n -= blocked * (s.stamina / cost); drainStamina(s.stamina + 1); guardT = CFG.guardBreak; setBlocking(false);
          SND.guardBreak(); sparks(at, 14, 5); chat('Guard broken!');
        }
      }
    }
    if (!env) {
      const a = armorPoints();
      if (a > 0) n *= 1 - Math.min(20, Math.max(a / 5, a - n / 2)) / 25;
      exhaust(.1);
    }
    if (n < .5) { carry += n; if (carry < 1) return 0; carry -= 1; return 1; }
    return Math.round(n);
  });

  // ---- hurt feedback: red flash (main), camera tilt jolt, "oof"
  let tiltT = 0, tiltDir = 1;
  on('hurt', (n, by, kx = 0, kz = 0) => {
    const pl = PL(), right = { x: Math.cos(pl.yaw), z: -Math.sin(pl.yaw) };
    tiltDir = kx || kz ? (right.x * kx + right.z * kz > 0 ? 1 : -1) : (Math.random() < .5 ? -1 : 1); tiltT = .45;
    if (DEFS[cur].hp > 0) SND.oof(false);
    statusDirty = true;
  });

  // ---- death screen
  const css = document.createElement('style');
  css.textContent = `
  #stats { height: auto !important; }
  #cbStatus { position: absolute; left: calc(6px + env(safe-area-inset-left, 0px)); top: calc(6px + env(safe-area-inset-top, 0px)); display: flex; gap: 6px; }
  .cbEff { display: flex; flex-direction: column; align-items: center; gap: 1px; font-size: 14px; line-height: 1; }
  .cbEff canvas { width: 44px; height: 44px; image-rendering: pixelated; }
  .cbEff.low span { animation: cbBlink .5s steps(1) infinite; }
  @keyframes cbBlink { 50% { opacity: .2; } }
  html.touch #cbStatus { left: auto; right: calc(10px + env(safe-area-inset-right, 0px)); top: calc(58px + env(safe-area-inset-top, 0px)); flex-direction: row-reverse; }
  html.touch .cbEff canvas { width: 34px; height: 34px; }
  html.touch .cbEff { font-size: 12px; }
  #cbAtk { position: absolute; left: 50%; top: calc(50% + 15px); width: 32px; height: 8px; transform: translateX(-50%); image-rendering: pixelated; }
  #cbDeath { background: linear-gradient(rgba(80,0,0,.38), rgba(128,48,48,.63)); z-index: 12; gap: 10px; }
  #cbDeath h1 { font: 400 clamp(34px, 7vw, 62px) var(--ui); margin: 0 0 6px; text-shadow: 4px 4px 0 #3f3f3f; }
  #cbDeath p { font-size: 20px; margin: 0 0 24px; }
  #cbDeath p b { color: #ffff55; font-weight: 400; }
  #cbDeath .mcbtn[disabled] { color: #a0a0a0; background: #2c2c2c; box-shadow: none; border-color: #000; cursor: default; }`;
  document.head.appendChild(css);
  const deathEl = document.createElement('div'); deathEl.id = 'cbDeath'; deathEl.className = 'screen'; deathEl.hidden = true;
  deathEl.innerHTML = '<h1 class="mc">You died!</h1><p class="mc" id="cbCause"></p><p class="mc">Score: <b id="cbScore">0</b></p>' +
    '<div class="menu"><button class="mcbtn" id="cbRespawn" type="button">Respawn</button><button class="mcbtn" id="cbTitle" type="button">Title Screen</button></div>';
  document.body.appendChild(deathEl);
  const respawnBtn = deathEl.querySelector('#cbRespawn'), titleBtn = deathEl.querySelector('#cbTitle');
  let deathT = 0;
  function xpScore(d) {
    const L = d.lvl | 0, tot = l => l <= 16 ? l * l + 6 * l : l <= 31 ? 2.5 * l * l - 40.5 * l + 360 : 4.5 * l * l - 162.5 * l + 2220;
    return Math.round(tot(L) + (d.xp || 0) * (tot(L + 1) - tot(L)));
  }
  const CAUSE = { fall: 'hit the ground too hard', drowning: 'drowned', starvation: 'starved to death' };
  function die(by) {
    const d = DEFS[cur];
    dead = true; deathT = 0; blocking = false; blockSrc = null; eating = null; dodge = null; mining = false;
    if (state === 'wheel') wheelEl.classList.remove('on');
    state = 'dead';
    const msg = `${d.name} ${CAUSE[by] || 'was slain by ' + by}`; chat(msg);
    deathEl.querySelector('#cbCause').textContent = msg; deathEl.querySelector('#cbScore').textContent = xpScore(d);
    respawnBtn.disabled = titleBtn.disabled = true; setTimeout(() => { respawnBtn.disabled = titleBtn.disabled = false; }, 1000);
    deathEl.hidden = false; SND.oof(true);
    if (document.exitPointerLock && document.pointerLockElement) document.exitPointerLock();
  }
  on('death', by => { die(by); return true; });
  function respawn(toTitle) {
    const d = DEFS[cur], pl = PL(), s = ST();
    d.hp = 20; d.food = 20; s.foods = []; s.stamina = maxStamina(); s.exhausted = false; s.air = CFG.airMax; s.exh = 0; carry = 0;
    pl.pos.set(d.pos[0], groundY(d.pos[0], d.pos[1]).y + .2, d.pos[1]); pl.vel.set(0, 0, 0); pl.sprint = false;
    fallStart = pl.pos.y; wasAir = false; invulnT = 3; tiltT = 0; dead = false; deathEl.hidden = true;
    drawStats(); statusDirty = true;
    if (toTitle) { state = 'title'; titleEl.hidden = false; hudEl.hidden = true; touchUI.hidden = true; pauseEl.hidden = true; }
    else { state = 'play'; lockPointer(); canvas.focus(); }
    emit('respawn', toTitle);
  }
  respawnBtn.addEventListener('click', e => { e.stopPropagation(); if (!dead) return; SFX.uiClick(); respawn(false); });
  titleBtn.addEventListener('click', e => { e.stopPropagation(); if (!dead) return; SFX.uiClick(); respawn(true); });

  // ---- input: stamina gates sprint and jumps; blocking/eating slow you; the dodge roll drives movement
  on('input', (inp, pl) => {
    if (!inp) return inp;
    const s = ST();
    if (dodge) {
      const yaw = pl.yaw, k = dodge.t / CFG.dodgeTime;
      inp.f = dodge.dx * -Math.sin(yaw) + dodge.dz * -Math.cos(yaw); inp.r = dodge.dx * Math.cos(yaw) + dodge.dz * -Math.sin(yaw);
      inp.mag = 2.35 * (1 - k * .55); inp.jump = false; inp.autoJump = false; pl.sprint = false; pl.sneak = false; return inp;
    }
    if (blocking || eating) { inp.mag = (inp.mag ?? 1) * (eating ? .3 : .4); pl.sprint = false; }
    if (pl.sprint && (s.exhausted || s.stamina <= 0)) { pl.sprint = false; barFlash = Math.max(barFlash, .3); }
    if (inp.jump && pl.onGround && !inWater(pl)) { if (useStamina(CFG.jumpCost)) exhaust(.05); else inp.jump = false; }
    return inp;
  });

  // ---- mouse: right button held = block (or eat); releasing it stops
  let lastPointer = 'mouse';
  addEventListener('pointerdown', e => { lastPointer = e.pointerType; }, true);
  const releaseRight = () => { if (blockSrc === 'mouse') setBlocking(false); if (eating && eating.src === 'mouse') cancelEat(); };
  addEventListener('mouseup', e => { if (e.button === 2) releaseRight(); });
  addEventListener('mousemove', e => { if ((blockSrc === 'mouse' || (eating && eating.src === 'mouse')) && !(e.buttons & 2)) releaseRight(); });
  on('use', () => {
    if (state !== 'play' || dead) return false;
    const src = lastPointer === 'touch' ? 'tap' : 'mouse', it = heldItem();
    if (it && it.kind === 'food') { startEat(src); return true; }
    if (it && it.kind === 'block') return false;       // placing a block wins over raising the offhand shield
    if (shieldItem()) { setBlocking(true, src); return true; }
    return false;
  });

  // ---- Troll: stagger support (parry stuns it; staggered enemies take double damage)
  if (typeof Troll !== 'undefined') {
    const up = Troll.prototype.update;
    Troll.prototype.stagger = function (secs) {
      if (this.dead > 0) return; this.staggerT = Math.max(this.staggerT || 0, secs); this.wind = 0; this.slamT = 0; this.cd = Math.max(this.cd || 0, 1);
      this.starT = 0;
    };
    Troll.prototype.update = function (dt) {
      if (!(this.staggerT > 0) || this.dead > 0) return up.call(this, dt);
      this.staggerT -= dt; const t = performance.now() / 1000, k = Math.min(1, this.staggerT * 2);
      this.group.rotation.z = Math.sin(t * 9) * .07 * k;
      this.head.rotation.y = Math.sin(t * 13) * .45 * k; this.head.rotation.x = .25 * k;
      this.arms[0].rotation.x = lerp(this.arms[0].rotation.x, .35, Math.min(1, dt * 6)); this.arms[1].rotation.x = lerp(this.arms[1].rotation.x, .45, Math.min(1, dt * 6));
      this.legs[0].rotation.x = this.legs[1].rotation.x = 0;
      this.pos.y = lerp(this.pos.y, groundY(this.pos.x, this.pos.z).y, Math.min(1, dt * 8));
      this.flash = Math.max(0, this.flash - dt * 4); for (const m of this.mats) m.emissive.setRGB(this.flash * .7, 0, 0);
      this.starT = (this.starT || 0) - dt;
      if (this.starT <= 0) { this.starT = .22; const c = this.center(); c.y += 1.1; critStars(c, 3, 0xffee66); }
      if (this.staggerT <= 0) { this.group.rotation.z = 0; this.head.rotation.x = 0; }
    };
  }

  // ---- HUD: armor + stamina row above hearts/hunger, air bubbles above that (drawn in the #stats canvas)
  const TOP = 17, baseDraw = drawStats;
  statsCv.height = 22 + TOP;
  const ARMOR = ["kkk...kkk", "kWSk.kSDk", "kSSSkSSDk", ".kSSSSDk.", ".kSSSSDk.", ".kSSSSDk.", ".kSSSSDk.", ".kkkkkkk."];
  const BUBBLE = ["..kkkk...", ".kBBBBk..", "kBWWBBBk.", "kBWBBBBk.", "kBBBBBBk.", "kBBBBBDk.", ".kBBBDk..", "..kkkk..."];
  const BOLT = ["....kkk", "...kYYk", "..kYYk.", ".kYYkkk", "kYYYYYk", "kkkYYk.", "..kYk..", "..kk..."];
  drawStats = function () {
    sg.setTransform(1, 0, 0, 1, 0, TOP);
    try { baseDraw(); } finally { sg.setTransform(1, 0, 0, 1, 0, 0); }
    sg.clearRect(0, 0, 182, TOP);
    drawTopRow();
  };
  let hud = { armor: 0, key: '' };
  function drawTopRow() {
    const d = DEFS[cur], s = ST(d), mx = maxStamina(d), a = hud.armor;
    if (a > 0) for (let i = 0; i < 10; i++) {
      const v = a - i * 2; sprite(ARMOR, i * 8, 9, { k: '#000', W: '#3a3a3a', S: '#3a3a3a', D: '#3a3a3a' });
      if (v > 0) sprite(ARMOR, i * 8, 9, { k: '#000', W: '#ffffff', S: '#c6c6c6', D: '#8b8b8b', e: '#3a3a3a' }, v === 1);
    }
    // stamina: Valheim-style yellow bar, Minecraft pixel framing
    const fl = barFlash > 0 && Math.floor(barFlash * 10) % 2 === 0;
    sprite(BOLT, 92, 10, { k: '#000', Y: s.exhausted ? '#c97a00' : '#ffd23f' });
    sg.fillStyle = '#000'; sg.fillRect(100, 11, 82, 7);
    sg.fillStyle = fl ? '#6e1010' : '#3a3000'; sg.fillRect(101, 12, 80, 5);
    const w = Math.round(80 * clamp(s.stamina / mx, 0, 1));
    if (w > 0) {
      sg.fillStyle = s.exhausted ? '#c97a00' : '#f5c400'; sg.fillRect(101, 12, w, 5);
      sg.fillStyle = s.exhausted ? '#f0a840' : '#fff27a'; sg.fillRect(101, 12, w, 1);
      sg.fillStyle = s.exhausted ? '#7a4400' : '#b08600'; sg.fillRect(101, 16, w, 1);
    }
    if (mx > CFG.stamina) { sg.fillStyle = 'rgba(0,0,0,.55)'; sg.fillRect(101 + Math.round(80 * CFG.stamina / mx), 12, 1, 5); }
    // air bubbles (only while short of breath)
    if (s.air < CFG.airMax - .01) {
      const n = Math.ceil(s.air / CFG.airMax * 10 - .001);
      for (let i = 0; i < n; i++) sprite(BUBBLE, 182 - 9 - i * 8, 0, { k: '#1b2f5c', B: '#4f8fe8', W: '#ffffff', D: '#2f5fb8' });
    }
  }
  function hudKey() {
    const d = DEFS[cur], s = ST(d);
    return [cur, Math.round(s.stamina * 2), Math.round(maxStamina(d)), s.exhausted, hud.armor, Math.ceil(s.air / CFG.airMax * 10 - .001), s.air < CFG.airMax - .01, barFlash > 0 ? Math.floor(barFlash * 10) % 2 : -1].join('|');
  }

  // ---- status icons (Minecraft potion-icon style) for food buffs and anything other modules add
  const statusEl = document.createElement('div'); statusEl.id = 'cbStatus'; hudEl.appendChild(statusEl);
  const atkCv = document.createElement('canvas'); atkCv.id = 'cbAtk'; atkCv.width = 16; atkCv.height = 4; atkCv.hidden = true; hudEl.appendChild(atkCv);
  const atkG = atkCv.getContext('2d');
  const extra = new Map();     // key -> {name, t, max, icon}
  let statusDirty = true, statusT = 0, statusSig = '';
  const DRUM = ["......kkk.", ".....kRRRk", "....kRRrRk", "...kRRRRRk", "..kRRRRrk.", ".kRRrRRk..", ".kRRRRk...", "kWkkkk....", "kWWk......", ".kk......."];
  function iconCanvas(st) {
    return pixCanvas(24, 24, g => {
      g.fillStyle = '#000'; g.fillRect(1, 0, 22, 24); g.fillRect(0, 1, 24, 22);
      g.fillStyle = '#c6c6c6'; g.fillRect(1, 1, 22, 22); g.fillStyle = '#ffffff'; g.fillRect(1, 1, 21, 2); g.fillRect(1, 1, 2, 21);
      g.fillStyle = '#555555'; g.fillRect(3, 21, 20, 2); g.fillRect(21, 3, 2, 20); g.fillStyle = '#8b8b8b'; g.fillRect(3, 3, 18, 18);
      g.save(); g.translate(4, 4);
      if (st.icon) { try { st.icon(g); } catch (e) { /* custom icon failed */ } }
      else DRUM.forEach((r, y) => { for (let x = 0; x < r.length; x++) { const c = { k: '#2a1408', R: '#c8643c', r: '#8e3b1e', W: '#f0e6d0' }[r[x]]; if (c) { g.fillStyle = c; g.fillRect(3 + x, 3 + y, 1, 1); } } });
      g.restore();
      if (st.color) { g.fillStyle = st.color; g.fillRect(3, 19, 18, 2); }
    });
  }
  const fmt = t => t == null ? '' : `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  function statusList() {
    const s = ST();
    return s.foods.map(f => ({ key: 'food:' + f.id, name: f.name + ' (+' + f.stamina + ' stamina)', t: f.t, max: f.max, icon: f.icon, color: '#ffd23f' }))
      .concat([...extra.entries()].map(([key, v]) => Object.assign({ key }, v)));
  }
  function renderStatus() {
    const list = statusList(), sig = cur + ':' + list.map(x => x.key).join(',');
    if (sig !== statusSig) {
      statusSig = sig; statusEl.textContent = '';
      for (const st of list) { const w = document.createElement('div'); w.className = 'cbEff mc'; w.title = st.name || ''; w.dataset.key = st.key;
        w.appendChild(iconCanvas(st)); const sp = document.createElement('span'); w.appendChild(sp); statusEl.appendChild(w); }
    }
    list.forEach((st, i) => { const w = statusEl.children[i]; if (!w) return; w.lastChild.textContent = fmt(st.t); w.classList.toggle('low', st.t != null && st.t < 10); });
    statusEl.style.display = showDebug || !list.length ? 'none' : 'flex';
  }

  // ---- first-person shield (raised while blocking)
  const shieldMesh = (() => {
    const front = charTex(12, 18, g => {
      for (let y = 0; y < 18; y++) for (let x = 0; x < 12; x++) { g.fillStyle = shade(x % 4 === 3 ? '#7e6237' : '#a2834f', (Math.random() - .5) * .14); g.fillRect(x, y, 1, 1); }
      g.fillStyle = '#4a4a4a'; g.fillRect(0, 0, 12, 1); g.fillRect(0, 17, 12, 1); g.fillRect(0, 0, 1, 18); g.fillRect(11, 0, 1, 18);
      g.fillStyle = '#8b8b8b'; g.fillRect(1, 0, 10, 1); g.fillRect(0, 1, 1, 16);
      g.fillStyle = '#4a4a4a'; g.fillRect(4, 7, 4, 4); g.fillStyle = '#9a9a9a'; g.fillRect(5, 8, 2, 2);
    });
    const side = new THREE.MeshBasicMaterial({ color: 0x5e4a2c, depthTest: false, fog: false });
    const m = new THREE.Mesh(new THREE.BoxGeometry(.42, .62, .05), [side, side, side, side, new THREE.MeshBasicMaterial({ map: front, depthTest: false, fog: false }), side]);
    m.renderOrder = 51; m.visible = false; camera.add(m); return m;
  })();

  // ---- fall damage tracking
  let fallStart = 0, wasAir = false, lastCur = -1, armorT = 0;

  // =====================================================================
  //  Per-frame logic
  // =====================================================================
  on('start', () => { lastCur = -1; statusDirty = true; drawStats(); });
  on('frame', dt => {
    updateFx(dt);
    barFlash = Math.max(0, barFlash - dt); breathT -= dt;
    // other characters rest: their stamina refills and food timers keep running
    for (const d of DEFS) {
      const s = ST(d);
      for (let i = s.foods.length - 1; i >= 0; i--) { s.foods[i].t -= dt; if (s.foods[i].t <= 0) { s.foods.splice(i, 1); statusDirty = true; } }
      const mx = maxStamina(d); if (s.stamina > mx) s.stamina = mx;
      if (d !== DEFS[cur]) { s.stamina = Math.min(mx, s.stamina + CFG.regen * dt); s.exhausted = false; s.wait = 0; }
    }
    if (state !== 'play' && state !== 'wheel') { if (blocking) setBlocking(false); if (eating && state !== 'dead') cancelEat(); return; }
    const pl = PL(), d = DEFS[cur], s = ST(d);
    if (lastCur !== cur) { lastCur = cur; fallStart = pl.pos.y; wasAir = false; blocking = false; eating = null; dodge = null; statusDirty = true; drawStats(); }
    invulnT = Math.max(0, invulnT - dt); guardT = Math.max(0, guardT - dt); atkCd = Math.max(0, atkCd - dt); tiltT = Math.max(0, tiltT - dt);

    // stamina: sprint drain, regen after a short delay (slower while blocking)
    const swim = inWater(pl);
    if (pl.sprint && pl.hspeed > 4.45 && !dodge) { drainStamina(CFG.sprintDrain * dt); exhaust(.08 * pl.hspeed * dt); if (s.exhausted) pl.sprint = false; }
    else if (swim && pl.hspeed > .5) exhaust(.015 * pl.hspeed * dt);
    if (s.wait > 0) s.wait -= dt;
    else if (s.stamina < maxStamina()) s.stamina = Math.min(maxStamina(), s.stamina + CFG.regen * (blocking ? .4 : 1) * dt);
    if (s.exhausted && s.stamina >= maxStamina() * CFG.exhaustedUntil) s.exhausted = false;

    // blocking
    if (blocking) {
      blockT += dt;
      if (!shieldItem() || dead || (blockSrc === 'tap' && blockT > .5) || s.stamina <= 0) setBlocking(false);
      if (blocking) pl.sprint = false;
    }
    // dodge roll
    if (dodge) { dodge.t += dt; if (dodge.t >= CFG.dodgeTime) dodge = null; }
    // eating
    if (eating) {
      const st = held();
      if (!st || st.id !== eating.id || state !== 'play') cancelEat();
      else {
        eating.t += dt; eating.crunchT -= dt;
        if (eating.crunchT <= 0) { eating.crunchT = .21; SND.crunch(); const e = pl.eye.addScaledVector(lookDir(pl.yaw, pl.pitch), .5); e.y -= .22; crumbs(e, eating.cols); }
        if (eating.t >= CFG.eatTime) finishEat();
      }
    }

    // hunger: exhaustion turns into lost food points; full = regen, empty = starving
    s.exh += .01 * dt;
    if (s.exh >= 4) { s.exh -= 4; if (d.food > 0) { d.food--; drawStats(); } }
    if (d.hp > 0 && d.hp < 20 && (d.food >= 18 || (s.foods.length && d.food > 6))) {
      s.regenT += dt; if (s.regenT >= (d.food >= 18 ? 4 : 7)) { s.regenT = 0; d.hp = Math.min(20, d.hp + 1); exhaust(3); drawStats(); }
    } else s.regenT = 0;
    if (d.food <= 0 && d.hp > 1) { s.starveT += dt; if (s.starveT >= 4) { s.starveT = 0; envHurt(1, 'starvation'); } } else s.starveT = 0;

    // fall damage: 1 heart per block above 3, water breaks the fall
    if (pl.onGround || swim) {
      if (wasAir && !swim) { const h = fallStart - pl.pos.y, n = Math.ceil(h - 3.2); if (n > 0) { SND.land(); envHurt(n * CFG.fallPerBlock, 'fall'); } }
      fallStart = pl.pos.y;
    } else fallStart = Math.max(fallStart, pl.pos.y);
    wasAir = !pl.onGround && !swim;

    // drowning: 10 bubbles of air, then a heart per second
    if (headInWater(pl)) {
      const before = Math.ceil(s.air / CFG.airMax * 10 - .001);
      s.air = Math.max(0, s.air - dt);
      if (Math.ceil(s.air / CFG.airMax * 10 - .001) < before) SND.bubble();
      if (s.air <= 0) { s.drownT += dt; if (s.drownT >= 1) { s.drownT = 0; envHurt(2, 'drowning'); } }
    } else { s.air = Math.min(CFG.airMax, s.air + dt * 5); s.drownT = 0; }

    // third-person pose: shield arm forward while blocking
    if (blocking && pl.arms) { pl.arms[1].rotation.x = -1.25; pl.arms[1].rotation.z = .35; }
  });
  function envHurt(n, by) {
    const pl = PL(), vy = pl.vel.y; hurt(n, by, 0, 0);
    if (!dead) pl.vel.y = Math.min(vy, 0);                   // environmental damage has no knockback hop
  }

  on('tick', rawDt => {
    if (setMineCd) { setMineCd = false; mineCd = Math.max(.04, atkCd); }
    const pl = PL();
    // HUD rows
    armorT -= rawDt; if (armorT <= 0) { armorT = .25; hud.armor = Math.round(armorPoints()); }
    if (state !== 'title') { const k = hudKey(); if (k !== hud.key) { hud.key = k; drawStats(); } }
    statusT -= rawDt; if (statusDirty || statusT <= 0) { statusDirty = false; statusT = .25; renderStatus(); }
    // attack cooldown indicator under the crosshair
    const showAtk = state === 'play' && atkCd > 0 && atkMax >= .3 && !hudHidden;
    atkCv.hidden = !showAtk;
    if (showAtk) { atkG.clearRect(0, 0, 16, 4); atkG.fillStyle = '#1c1c1c'; atkG.fillRect(0, 0, 16, 4); atkG.fillStyle = '#5e5e5e'; atkG.fillRect(1, 1, 14, 2);
      atkG.fillStyle = '#e0e0e0'; atkG.fillRect(1, 1, Math.round(14 * (1 - atkCd / atkMax)), 2); }

    // first-person shield / eating poses
    const fp = viewMode === 0 && !hudHidden && (state === 'play' || state === 'pause' || state === 'wheel');
    lift = clamp(lift + (blocking ? 1 : -1) * rawDt * 9, 0, 1);
    const sh = shieldItem(), shieldInMain = sh && heldItem() === sh;
    shieldMesh.visible = fp && lift > 0 && !!sh;
    if (shieldMesh.visible) {
      const e = 1 - Math.pow(1 - lift, 3);
      shieldMesh.position.set(lerp(-.75, -.4, e), lerp(-1, -.4, e), lerp(-1, -.88, e)); shieldMesh.rotation.set(lerp(.2, 0, e), lerp(.55, .22, e), 0);
      if (shieldInMain && heldMesh) heldMesh.visible = false;
    }
    if (eating && heldMesh && heldMesh.visible) {
      const k = Math.min(1, eating.t * 5), b = Math.abs(Math.sin(eating.t * 18)) * .045;
      heldMesh.position.set(lerp(heldMesh.position.x, .22, k), lerp(heldMesh.position.y, -.36 + b, k), lerp(heldMesh.position.z, -.62, k));
      heldMesh.rotation.set(.35, .4, -.25);
    }

    // camera: hurt tilt jolt, dodge dip and roll, the death fall-over
    if (state === 'title' || state === 'switching') return;
    let roll = 0;
    if (tiltT > 0) { const k = tiltT / .45; roll += tiltDir * .24 * Math.sin(k * Math.PI) * k; }
    if (dodge) { const k = Math.sin(Math.PI * dodge.t / CFG.dodgeTime); camera.position.y -= k * .55; roll += dodge.side * .3 * k * (dodge.f ? .35 : 1); }
    if (dead) { deathT += rawDt; const k = Math.min(1, deathT / .6), e = 1 - Math.pow(1 - k, 3); camera.position.y -= e * 1.25; roll += e * 1.2; }
    if (roll) camera.rotateZ(roll);
  });

  // =====================================================================
  //  Public API (see CONTRACT.md)
  // =====================================================================
  return {
    attack() { if (state !== 'play') return false; return doAttack(findTarget()); },
    setBlocking(v) { return setBlocking(!!v, 'api'); },
    isBlocking: () => blocking,
    eat: () => startEat('api'),
    cancelEat, isEating: () => !!eating,
    dodge(f = 0, r = 0) { return doDodge(f, r); },
    useStamina,
    get stamina() { return ST().stamina; },
    set stamina(v) { ST().stamina = clamp(+v || 0, 0, maxStamina()); },
    get maxStamina() { return maxStamina(); },
    isDead: () => dead,
    respawn: () => { if (dead) respawn(false); },
    addStatus(key, o = {}) { extra.set(key, { name: o.name || key, t: o.secs ?? null, max: o.secs ?? null, icon: o.icon, color: o.color }); statusDirty = true; },
    removeStatus(key) { extra.delete(key); statusDirty = true; },
    stagger,
    cfg: CFG,
    _tickStatus(dt) { for (const [k, v] of extra) if (v.t != null) { v.t -= dt; if (v.t <= 0) { extra.delete(k); statusDirty = true; } } },
  };
})();
on('frame', dt => Combat._tickStatus(dt));
