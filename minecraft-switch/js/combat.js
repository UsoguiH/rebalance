"use strict";
// =====================================================================
//  Combat & survival module (Valheim-style rules, Minecraft-style look)
//  Stamina, melee with crits / sweep / knockback / damage types / skill bonus, shields with block + parry,
//  dodge roll, armor, the Valheim 3-food system (no hunger), skills that level by use (K), death with a
//  tombstone + skill drain, carry weight, shelter / comfort / Rested, weather with Wet / Cold / Freezing,
//  creature stars, fall damage, drowning, and the exact Minecraft Java HUD (hearts, armor, food, XP, hotbar).
//  Loaded after the main script; uses its globals (see CONTRACT.md) and exposes `Combat`, `Skills`, `Survival`.
// =====================================================================
const Combat = (() => {
  const CFG = {
    stamina: 50, regen: 12, regenDelay: 1, exhaustedUntil: .25,   // base max, per second, delay after use (s), recover fraction
    sprintDrain: 7, jumpCost: 5, dodgeCost: 14, dodgeTime: .38, iframes: .3,
    handStamina: 3, parryWindow: .25, blockScale: .4, guardBreak: 1.2, staggerSecs: 2.2,
    maxFoods: 3, eatTime: 1.6, airMax: 15, fallPerBlock: 2,   // fall: 1 heart (2 hp) per block above 3
    baseHp: 25, regenEvery: 10, carryMax: 300, sparedSecs: 600, secondWindSecs: 50, skillLoss: .05,
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
    return d._cb || (d._cb = { stamina: CFG.stamina, wait: 0, exhausted: false, exh: 0, foods: [], air: CFG.airMax, regenT: 0, drownT: 0 });
  }
  // Valheim food: each food adds +hp / +stamina; the bonus fades linearly over the last third of its time
  const foodK = f => clamp(f.t / f.max * 3, 0, 1);
  const maxStamina = (d = DEFS[cur]) => CFG.stamina + ST(d).foods.reduce((a, f) => a + f.stamina * foodK(f), 0);
  const maxHp = (d = DEFS[cur]) => CFG.baseHp + ST(d).foods.reduce((a, f) => a + (f.hp || 0) * foodK(f), 0);
  // one player now: no per-character starting levels, health is the Valheim base
  for (const d of DEFS) { d.lvl = 0; d.xp = 0; d.hp = CFG.baseHp; d.food = 0; }
  let barFlash = 0, breathT = 0;
  // Stamina is switched off (user request): actions never cost or wait on stamina, and the bar stays hidden.
  const NO_STAMINA = true;
  function useStamina(n) {
    if (NO_STAMINA) return true;
    const s = ST();
    if (s.exhausted || s.stamina < n) { barFlash = .5; if (breathT <= 0) { SND.breath(); breathT = 1.2; } return false; }
    s.stamina -= n; s.wait = CFG.regenDelay; if (s.stamina <= .01) { s.stamina = 0; s.exhausted = true; }
    return true;
  }
  function drainStamina(n) {
    if (NO_STAMINA) return;
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
    text = L(text); const ar = /[\u0600-\u06ff]/.test(text);
    const w = Math.max(16, text.length * 8 + 4);
    const c = pixCanvas(w, 12, g => { g.font = ar ? '400 11px "BC Pixel AE", "Noto Kufi Arabic", sans-serif' : '8px "Press Start 2P", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
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
  // weapon class -> skill and damage type (an item may set weapon.skill / weapon.type itself)
  function weaponClass(it) {
    const id = it ? it.id : '', w = (it && it.weapon) || {};
    const skill = w.skill || (!it ? 'unarmed' : /sword/.test(id) ? 'swords' : /knife|dagger/.test(id) ? 'knives' : /club|mace|hammer/.test(id) ? 'clubs'
      : /spear/.test(id) ? 'spears' : /atgeir|polearm/.test(id) ? 'polearms' : /bow/.test(id) ? 'bows' : /pickaxe/.test(id) ? 'pickaxes' : /axe/.test(id) ? 'axes' : 'unarmed');
    const type = w.type || ({ clubs: 'blunt', unarmed: 'blunt', pickaxes: 'pierce', spears: 'pierce', knives: 'pierce', bows: 'pierce', polearms: 'slash' }[skill] || 'slash');
    return { skill, type };
  }
  function weapon() {
    const st = held(), it = itemDef(st), wc = weaponClass(it && (it.weapon || it.tool) ? it : null);
    let w;
    if (it && it.weapon) w = { dmg: +it.weapon.dmg || 4, speed: +it.weapon.speed || .6, stamina: it.weapon.stamina ?? 6, it, sword: /sword/.test(it.id), wear: 1 };
    else if (it && it.tool) w = { dmg: 2 + (+it.tool.power || 1), speed: .75, stamina: 5, it, wear: 2 };
    else w = { dmg: 2 + Math.floor(Math.random() * 5), speed: .42, stamina: CFG.handStamina, it: null, wear: 0 };   // bare hand (or a block): 2-6
    return Object.assign(w, wc);
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
    if (!useStamina(w.stamina * skillCost(w.skill))) return false;
    atkCd = atkMax = w.speed; pl.swing = 1; swingT = 1; exhaust(.1);
    if (!target) { SND.swing(); return false; }
    const eye = pl.eye, to = target.center().sub(eye), dir = new V3(to.x, 0, to.z).normalize();
    const crit = !pl.onGround && pl.vel.y < -.5 && !inWater(pl) && !pl.sprint;
    const stag = (staggerUntil.get(target) || 0) > now();
    let dmg = filter('meleeDamage', w.dmg, target);
    dmg *= (crit ? 1.5 : 1) * (stag ? 2 : 1) * skillDmg(w.skill) * resistOf(target, w.type);
    gain(w.skill, .5);
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
    const s = ST(); if (!NO_STAMINA && (s.exhausted || s.stamina <= 0)) { barFlash = .5; return false; }
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
    const s = ST(), fd = it.food || {};
    const had = s.foods.find(f => f.id === it.id);
    if (had && had.t > had.max * .5) { chat("You can't eat any more " + it.name + ' yet'); return false; }
    if (!had && s.foods.length >= CFG.maxFoods) { chat("You are too full to eat " + it.name); return false; }
    if (blocking) setBlocking(false);
    eating = { id: it.id, it, fd, t: 0, src, crunchT: .15, cols: foodColors(it) };
    return true;
  }
  function cancelEat() { eating = null; }
  function finishEat() {
    const e = eating; eating = null; const d = DEFS[cur], s = ST(), fd = e.fd;
    if (hasInv() && Inv.consumeHeld) { try { Inv.consumeHeld(1); } catch (err) { /* items module */ } }
    // Valheim food: +max health and +max stamina for a while (raw "heal" from Minecraft foods scales to +hp)
    const secs = fd.secs || 300, hp = fd.hp ?? Math.round((fd.heal || 2) * 2.5), sta = fd.stamina ?? Math.round((fd.heal || 2) * 4);
    const old = s.foods.find(f => f.id === e.id);
    if (old) { old.t = old.max = secs; old.stamina = sta; old.hp = hp; }
    else { if (s.foods.length >= CFG.maxFoods) { s.foods.sort((a, b) => a.t - b.t); s.foods.shift(); } s.foods.push({ id: e.id, name: e.it.name, hp, stamina: sta, t: secs, max: secs, icon: e.it.icon }); }
    s.stamina = Math.min(maxStamina(), s.stamina + sta); s.exhausted = false;
    d.hp = Math.min(maxHp(d), d.hp + Math.max(1, Math.round(hp * .2)));
    SND.burp(); drawStats(); statusDirty = true;
  }

  // ---- damage in: dodge i-frames, block / parry, armor (Minecraft formula)
  let carry = 0, dead = false;
  const ENV = { fall: 1, starvation: 1, drowning: 1 };
  on('damage', (n, by, kx = 0, kz = 0) => {
    if (n <= 0) return n;
    if (dead || state === 'title' || state === 'dead') return 0;
    const env = ENV[by], pl = PL();
    if (!env) { const att = attackerFor(by); if (att && att.stars > 0) n *= 1 + .5 * att.stars; }   // starred creatures hit harder
    if (!env && (invulnT > 0 || (dodge && dodge.t < CFG.iframes))) { if (dodge) { SND.whiff(); floatText('DODGE', pl.eye.addScaledVector(lookDir(pl.yaw, 0), 1.6), '#aaaaaa'); } return 0; }
    if (!env && blocking) {
      const look = lookDir(pl.yaw, 0), front = kx || kz ? -(look.x * kx + look.z * kz) > .15 : true;
      const sh = shieldItem(), sp = (sh && sh.shield) || { block: 10, parry: 2 };
      if (front) {
        const att = attackerFor(by), at = shieldPos();
        if (blockT < CFG.parryWindow) {                     // PARRY: no damage, attacker staggered
          drainStamina(3); stagger(att, CFG.staggerSecs * Math.max(1, (sp.parry || 2) / 2)); gain('blocking', 1);
          SND.parry(); sparks(at, 26, 7); critStars(at, 8, 0xfff2a0); shakeT = .2;
          flashEl.style.background = '#ffffff'; fx.flash = .3;
          if (att) floatText('PARRY!', att.center().add(new V3(0, 1.4, 0)), '#ffff55', true);
          return 0;
        }
        const power = (sp.block || 10) * CFG.blockScale * (1 + level('blocking') / 100), blocked = Math.min(n, power), cost = (5 + blocked * 1.6) * skillCost('blocking'), s = ST();
        if (s.stamina >= cost) {
          drainStamina(cost); n -= blocked; SND.block(); sparks(at, 8, 4); gain('blocking', .5);
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
  #cbStatus { position: absolute; right: calc(6px + env(safe-area-inset-right, 0px)); top: calc(6px + env(safe-area-inset-top, 0px)); display: flex; flex-direction: row-reverse; gap: 6px; }
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
  deathEl.innerHTML = '<h1 class="mc">You died!</h1><p class="mc" id="cbCause"></p><p class="mc" id="cbLoss"></p>' +
    '<div class="menu"><button class="mcbtn" id="cbRespawn" type="button">Respawn</button><button class="mcbtn" id="cbTitle" type="button">Title Screen</button></div>';
  document.body.appendChild(deathEl);
  const respawnBtn = deathEl.querySelector('#cbRespawn'), titleBtn = deathEl.querySelector('#cbTitle');
  let deathT = 0;
  const CAUSE = { fall: 'hit the ground too hard', drowning: 'drowned', freezing: 'froze to death' };
  function die(by) {
    const d = DEFS[cur];
    dead = true; deathT = 0; blocking = false; blockSrc = null; eating = null; dodge = null; mining = false;
    if (state === 'wheel') wheelEl.classList.remove('on');
    state = 'dead';
    const msg = `${d.name} ${CAUSE[by] || 'was slain by ' + by}`; chat(msg);
    deathEl.querySelector('#cbCause').textContent = msg;
    // Valheim death: everything you carry goes into a tombstone here; skills drain unless "Spared" is active
    let lost = 0;
    try { dropTombstone(d); } catch (e) { console.error(e); }
    if (extra.has('spared')) deathEl.querySelector('#cbLoss').textContent = 'Spared: your skills are safe';
    else { lost = drainSkills(); deathEl.querySelector('#cbLoss').textContent = lost > 0 ? 'Your skills weakened' : ''; }
    respawnBtn.disabled = titleBtn.disabled = true; setTimeout(() => { respawnBtn.disabled = titleBtn.disabled = false; }, 1000);
    deathEl.hidden = false; SND.oof(true);
    if (document.exitPointerLock && document.pointerLockElement) document.exitPointerLock();
  }
  on('death', by => { die(by); return true; });
  function respawn(toTitle) {
    const d = DEFS[cur], pl = PL(), s = ST();
    s.foods = []; d.hp = maxHp(d); d.food = 0; s.stamina = maxStamina(); s.exhausted = false; s.air = CFG.airMax; s.exh = 0; carry = 0;
    for (const k of ['wet', 'cold', 'freezing', 'rested', 'resting']) extra.delete(k);
    setStatus('spared', { secs: CFG.sparedSecs });
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
    if (overloaded) { pl.sprint = false; inp.jump = false; inp.autoJump = false; inp.mag = (inp.mag ?? 1) * .7; }   // Overloaded: walk only
    if (pl.sprint) inp.mag = (inp.mag ?? 1) * (1 + .25 * level('run') / 100);
    if (inp.jump && pl.onGround && !inWater(pl)) { if (useStamina(CFG.jumpCost * skillCost('jump'))) { exhaust(.05); gain('jump', .2); } else inp.jump = false; }
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
    if (tryTomb()) return true;
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

  // =====================================================================
  //  HUD: an exact Minecraft Java survival HUD at GUI scale 2 (auto 1.5 / 1 on small phones)
  //  #stats canvas (182 GUI px wide, bottom edge on the hotbar): armor row, heart rows, food row, air,
  //  XP bar + level. Hotbar: Minecraft slot texture, selection bracket, item counts + durability bars.
  //  Valheim stamina: a slim yellow bar under the crosshair, shown only while it is not full.
  // =====================================================================
  const px = (g, c, x, y, w = 1, h = 1) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  function spr(g, rows, x, y, pal, x0 = 0, x1 = 99) {
    for (let j = 0; j < rows.length; j++) { const r = rows[j]; for (let i = Math.max(0, x0); i < Math.min(r.length, x1); i++) { const c = pal[r[i]]; if (c) px(g, c, x + i, y + j); } }
  }
  // Minecraft font digits (5x7), advance 6
  const DIG = {
    0: ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'], 1: ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '#####'],
    2: ['.###.', '#...#', '....#', '..##.', '.#...', '#...#', '#####'], 3: ['.###.', '#...#', '....#', '..##.', '....#', '#...#', '.###.'],
    4: ['...##', '..#.#', '.#..#', '#...#', '#####', '....#', '....#'], 5: ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
    6: ['..##.', '.#...', '#....', '####.', '#...#', '#...#', '.###.'], 7: ['#####', '#...#', '....#', '...#.', '..#..', '..#..', '..#..'],
    8: ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'], 9: ['.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..'],
  };
  const textW = t => String(t).length * 6 - 1;
  function digits(g, t, x, y, col, mode) {      // mode: 'shadow' (item counts) or 'outline' (XP level)
    t = String(t);
    const put = (ox, oy, c) => { for (let k = 0; k < t.length; k++) { const gl = DIG[t[k]]; if (gl) spr(g, gl, x + k * 6 + ox, y + oy, { '#': c }); } };
    if (mode === 'outline') { for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) put(ox, oy, '#000'); }
    else put(1, 1, '#3f3f3f');
    put(0, 0, col);
  }
  const HEART_C = ['.kkk.kkk.', 'k...k...k', 'k.......k', 'k.......k', '.k.....k.', '..k...k..', '...k.k...', '....k....'];
  const HEART_F = ['.........', '.RWR.RRR.', '.WRRRRRR.', '.RRRRRRr.', '..RRRRr..', '...RRr...', '....r....', '.........'];
  const ARMOR_C = ['kkk...kkk', 'k..k.k..k', 'k...k...k', 'kk.....kk', '.k.....k.', '.k.....k.', '.k.....k.', '.kkkkkkk.'];
  const ARMOR_F = ['.........', '.WW...WS.', '.WSS.SSS.', '..WSSSS..', '..WSSSS..', '..SSSSS..', '..SSSSD..', '.........'];
  const FOOD_C = ['.....kkk.', '....k...k', '...k....k', '..k.....k', '.k.....k.', 'k.k...k..', 'k..kkk...', '.kk......'];
  const FOOD_F = ['.........', '.....RLR.', '....RLRR.', '...RRRRr.', '..RRRRr..', '.W.RRr...', '.WW......', '.........'];
  const BUBBLE = ['..kkkk...', '.kBBBBk..', 'kBWWBBBk.', 'kBWBBBBk.', 'kBBBBBBk.', 'kBBBBBDk.', '.kBBBDk..', '..kkkk...'];
  const pixURL = (w, h, draw) => pixCanvas(w, h, draw).toDataURL();
  const HOTBAR_TEX = pixURL(182, 22, g => {
    px(g, 'rgba(0,0,0,.85)', 1, 0, 180, 1); px(g, 'rgba(0,0,0,.85)', 1, 21, 180, 1); px(g, 'rgba(0,0,0,.85)', 0, 1, 1, 20); px(g, 'rgba(0,0,0,.85)', 181, 1, 1, 20);
    for (let k = 0; k < 9; k++) {
      const x = 1 + k * 20;
      px(g, 'rgba(34,34,34,.55)', x, 1, 20, 20);
      px(g, 'rgba(150,150,150,.95)', x, 1, 20, 1); px(g, 'rgba(150,150,150,.95)', x, 1, 1, 20);
      px(g, 'rgba(98,98,98,.95)', x, 20, 20, 1); px(g, 'rgba(98,98,98,.95)', x + 19, 1, 1, 20);
      px(g, 'rgba(0,0,0,.35)', x + 1, 2, 18, 1); px(g, 'rgba(0,0,0,.35)', x + 1, 2, 1, 18);
    }
  });
  const SEL_TEX = pixURL(24, 24, g => {
    px(g, '#000', 1, 0, 22, 1); px(g, '#000', 1, 22, 22, 1); px(g, '#000', 0, 1, 1, 21); px(g, '#000', 23, 1, 1, 21);
    px(g, '#ffffff', 1, 1, 22, 2); px(g, '#ffffff', 1, 1, 2, 21); px(g, '#d0d0d0', 1, 20, 22, 2); px(g, '#d0d0d0', 21, 1, 2, 21);
    px(g, '#ffffff', 1, 1, 2, 2); px(g, '#555555', 3, 3, 18, 1); px(g, '#555555', 3, 3, 1, 17); px(g, '#8b8b8b', 3, 19, 18, 1); px(g, '#8b8b8b', 20, 3, 1, 17);
  });
  const hudCss = document.createElement('style');
  hudCss.textContent = `
  :root { --gs: 2; }
  #hud #crosshair { width: calc(15px * var(--gs)); height: calc(15px * var(--gs)); }
  #hud #crosshair::before { left: calc(7px * var(--gs)); top: 0; width: calc(1px * var(--gs)); height: 100%; }
  #hud #crosshair::after { top: calc(7px * var(--gs)); left: 0; height: calc(1px * var(--gs)); width: 100%; }
  #hud #bottom { gap: 0; }
  #hud #itemName { height: auto; min-height: calc(9px * var(--gs)); font-size: calc(9px * var(--gs)); line-height: 1; margin-bottom: calc(4px * var(--gs)); }
  html #hud #stats { display: block; width: calc(182px * var(--gs)); image-rendering: pixelated; }
  html #hud #hotbar { display: flex; box-sizing: border-box; width: calc(182px * var(--gs)); height: calc(22px * var(--gs)); padding: calc(1px * var(--gs));
    border: 0; box-shadow: none; background: url(${HOTBAR_TEX}) 0 0 / 100% 100% no-repeat; image-rendering: pixelated; }
  html #hud #hotbar .slot { flex: none; width: calc(20px * var(--gs)); height: calc(20px * var(--gs)); box-shadow: none; }
  html #hud #hotbar .slot > canvas { position: relative; z-index: 2; width: calc(16px * var(--gs)); height: calc(16px * var(--gs)); image-rendering: pixelated; }
  html #hud #hotbar .slot > canvas.cbOv { position: absolute; left: 0; top: 0; width: 100%; height: 100%; z-index: 3; pointer-events: none; }
  html #hud #hotbar .slot .ic, html #hud #hotbar .slot .du { display: none; }
  html #hud #hotbar .slot.sel::after { content: ""; position: absolute; inset: auto; left: calc(-2px * var(--gs)); top: calc(-2px * var(--gs)); width: calc(24px * var(--gs)); height: calc(24px * var(--gs));
    border: 0; box-shadow: none; background: url(${SEL_TEX}) 0 0 / 100% 100% no-repeat; image-rendering: pixelated; z-index: 1; pointer-events: none; }
  html #hud #hotRow .slot.invBtn { display: none; }
  html #hud #hotbar .slot.invBtn { width: calc(20px * var(--gs)); font-size: calc(11px * var(--gs)); }
  html #hud #hotMore { box-sizing: border-box; width: calc(22px * var(--gs)); height: calc(22px * var(--gs)); align-self: flex-end; padding: 0; border: 0;
    background: url(${HOTBAR_TEX}) 0 0 / 827% 100% no-repeat; image-rendering: pixelated; box-shadow: none; }
  html #hud #hotRow { align-items: flex-end; gap: calc(3px * var(--gs)); }
  #cbSta { position: absolute; left: 50%; top: calc(50% + 9px * var(--gs)); width: calc(42px * var(--gs)); height: calc(4px * var(--gs)); transform: translateX(-50%); image-rendering: pixelated; transition: opacity .4s; }
  #cbAtk { top: calc(50% + 15px * var(--gs)) !important; width: calc(16px * var(--gs)) !important; height: calc(4px * var(--gs)) !important; }`;
  document.head.appendChild(hudCss);

  let GS = 2;
  function guiScale() {
    const rot = document.documentElement.classList.contains('rot'), W = rot ? innerHeight : innerWidth, H = rot ? innerWidth : innerHeight;
    return W < 400 || H < 260 ? 1 : W < 520 || H < 340 ? 1.5 : 2;          // Minecraft "Auto": 2 unless the screen is too small
  }
  function applyScale() {
    const s = guiScale(); if (s === GS && document.documentElement.style.getPropertyValue('--gs')) return;
    GS = s; document.documentElement.style.setProperty('--gs', s); hud.B = 0; hudDirty = true;
    if (typeof joyHome === 'function') try { joyHome(); } catch (e) { /* mobile layout */ }
  }
  addEventListener('resize', () => setTimeout(applyScale, 50));

  // hotbar overlays: item count (white Minecraft digits with shadow) and the durability bar
  const ovs = slotDivs.map(d => { const c = document.createElement('canvas'); c.className = 'cbOv'; c.width = c.height = 20; d.appendChild(c); return c.getContext('2d'); });
  function drawHotbarOverlay() {
    const b = hasInv() && Inv.bag ? Inv.bag() : null;
    ovs.forEach((g, k) => {
      g.clearRect(0, 0, 20, 20); const s = b && b.main[k]; if (!s) return;
      const it = itemDef(s), max = it && it.durability;
      if (max && s.dur != null && s.dur < max) {
        const f = clamp(s.dur / max, 0, 1); px(g, '#000', 4, 15, 13, 2);
        px(g, `hsl(${Math.round(120 * f)},100%,50%)`, 4, 15, Math.max(1, Math.round(13 * f)), 1);
      }
      if (s.n > 1) { const t = String(s.n); digits(g, t, 19 - textW(t) - 1, 11, '#ffffff', 'shadow'); }
    });
  }
  on('invChange', () => { drawHotbarOverlay(); invDirty = true; });

  // the slim Valheim stamina bar under the crosshair
  const staCv = document.createElement('canvas'); staCv.id = 'cbSta'; staCv.width = 42; staCv.height = 4; hudEl.appendChild(staCv);
  const staG = staCv.getContext('2d'); let staShowT = 0, staKey = '';
  function drawStamina(rawDt) {
    if (NO_STAMINA) { staCv.style.opacity = 0; return; }
    const s = ST(), mx = maxStamina(), f = clamp(s.stamina / mx, 0, 1), fl = barFlash > 0 && Math.floor(barFlash * 10) % 2 === 0;
    staShowT = f < .999 || fl ? 1.5 : Math.max(0, staShowT - rawDt);
    staCv.style.opacity = state === 'play' && staShowT > 0 && !hudHidden ? Math.min(1, staShowT / .4) : 0;
    const k = [Math.round(f * 40), s.exhausted, fl].join('|'); if (k === staKey) return; staKey = k;
    staG.clearRect(0, 0, 42, 4); px(staG, '#000', 1, 0, 40, 1); px(staG, '#000', 1, 3, 40, 1); px(staG, '#000', 0, 1, 1, 2); px(staG, '#000', 41, 1, 1, 2);
    px(staG, fl ? '#6e1010' : 'rgba(58,48,0,.85)', 1, 1, 40, 2);
    const w = Math.round(40 * f);
    if (w > 0) { px(staG, s.exhausted ? '#c97a00' : '#ffd23f', 1, 1, w, 1); px(staG, s.exhausted ? '#8a4a00' : '#d9a400', 1, 2, w, 1); }
  }

  // ---- #stats canvas
  const hud = { armor: 0, key: '', B: 0, flashT: 0, flashHp: 0, lastHp: -1, wave: -1, waveT: 0, tick: 0 };
  let hudDirty = true, invDirty = true;
  drawStats = function () { hudDirty = true; };            // other modules call this after changing hp etc.; we repaint on the next tick
  function paintStats() {
    const d = DEFS[cur], s = ST(d), mh = maxHp(d), hp = clamp(d.hp, 0, mh), g = sg;
    // always one row of 10 hearts (like vanilla 20 hp); each heart is a tenth of your max health, which foods raise
    const hearts = 10, rows = 1, rh = 10, B = 27, halves = v => v > 0 ? Math.max(1, Math.round(v / mh * 20)) : 0;
    const hpH = halves(hp), ghostH = hud.flashT > 0 ? halves(Math.min(mh, hud.flashHp)) : 0;
    if (hud.B !== B) { hud.B = B; statsCv.width = 182; statsCv.height = B; statsCv.style.height = (B * GS) + 'px'; }
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, 182, B);
    const rnd = n => Math.floor(Math.random() * n);
    // armor (only when you wear some), directly above the top heart row
    const a = hud.armor, ay = B - 17 - (rows - 1) * rh - 10;
    if (a > 0) for (let i = 0; i < 10; i++) {
      const v = a - i * 2; spr(g, ARMOR_C, i * 8, ay, { k: '#000' });
      spr(g, ARMOR_F, i * 8, ay, { W: '#3d3d3d', S: '#2d2d2d', D: '#2d2d2d' });
      if (v > 0) spr(g, ARMOR_F, i * 8, ay, { W: '#ffffff', S: '#c6c6c6', D: '#8b8b8b' }, 0, v === 1 ? 5 : 99);
    }
    // hearts: rows of 10 like Health Boost; blink white after a hit, shake when low
    const blink = hud.flashT > 0 && Math.floor(hud.flashT * 20 / 3) % 2 === 1, low = hpH <= 4 && hp > 0;
    for (let i = hearts - 1; i >= 0; i--) {
      const row = Math.floor(i / 10), x = (i % 10) * 8; let y = B - 17 - row * rh;
      if (low) y += rnd(2); if (hud.wave === i) y -= 2;
      spr(g, HEART_C, x, y, { k: blink ? '#ffffff' : '#000' }); spr(g, HEART_F, x, y, { R: '#262626', W: '#262626', r: '#262626' });
      const ghost = ghostH - i * 2, hv = hpH - i * 2;
      if (ghost > 0 && ghost > hv) spr(g, HEART_F, x, y, { R: '#ffffff', W: '#ffffff', r: '#d8d8d8' }, 0, ghost === 1 ? 5 : 99);
      if (hv > 0) spr(g, HEART_F, x, y, { R: '#ff1313', W: '#ffffff', r: '#b80b0b' }, 0, hv === 1 ? 5 : 99);
    }
    // food row (right): the Valheim food slots as Minecraft shanks; 20 halves = 3 fresh foods, each food a third of the bar
    const full = s.foods.reduce((acc, f) => acc + clamp(f.t / f.max, 0, 1), 0), fv = Math.round(full / CFG.maxFoods * 20);
    d.food = fv;
    for (let i = 0; i < 10; i++) {
      const x = 182 - 9 - i * 8; let y = B - 17; if (!s.foods.length && hud.tick % 20 === i) y += rnd(3) - 1;
      spr(g, FOOD_C, x, y, { k: '#000' }); spr(g, FOOD_F, x, y, { R: '#2e2a26', L: '#2e2a26', r: '#2e2a26', W: '#2e2a26' });
      const v = fv - i * 2;
      if (v > 0) spr(g, FOOD_F, x, y, { R: '#c0742e', L: '#e0a050', r: '#7a4416', W: '#f0e8d8' }, v === 1 ? 4 : 0);
    }
    // air bubbles above the food row while under water
    if (s.air < CFG.airMax - .01) {
      const n = Math.ceil(s.air / CFG.airMax * 10 - .001);
      for (let i = 0; i < n; i++) spr(g, BUBBLE, 182 - 9 - i * 8, B - 27, { k: '#1b2f5c', B: '#4f8fe8', W: '#ffffff', D: '#2f5fb8' });
    }
    // XP bar (182x5) with the level in green, black outline, centered above it
    const xb = B - 7, xf = clamp(d.xp || 0, 0, 1);
    px(g, '#000', 0, xb, 182, 5); px(g, '#2a2a2a', 1, xb + 1, 180, 3);
    for (let k = 1; k < 18; k++) px(g, '#000', k * 10 + 1, xb + 1, 1, 3);
    const xw = Math.round(180 * xf);
    if (xw > 0) { px(g, '#80ff20', 1, xb + 1, xw, 3); px(g, '#c8ff8a', 1, xb + 1, xw, 1); px(g, '#4a9a10', 1, xb + 3, xw, 1);
      for (let k = 1; k < 18; k++) if (k * 10 + 1 < xw) px(g, '#3d7a0c', k * 10 + 1, xb + 1, 1, 3); }
    const L = d.lvl | 0; if (L > 0) digits(g, L, 91 - Math.floor(textW(L) / 2), B - 13, '#80ff20', 'outline');
  }
  function hudKey() {
    const d = DEFS[cur], s = ST(d), shaky = (d.hp <= maxHp(d) * .2 && d.hp > 0) || !s.foods.length;
    return [cur, d.hp, Math.round(maxHp(d) * 2), hud.armor, d.lvl, Math.round((d.xp || 0) * 180), s.foods.map(f => Math.round(f.t / f.max * 60)).join(','),
      Math.ceil(s.air / CFG.airMax * 10 - .001), s.air < CFG.airMax - .01, hud.flashT > 0 ? Math.floor(hud.flashT * 20 / 3) : -1, hud.wave, shaky ? hud.tick : 0].join('|');
  }
  function hudTick(rawDt) {
    const d = DEFS[cur];
    hud.tick = Math.floor(performance.now() / 50);
    if (hud.lastHp >= 0 && d.hp < hud.lastHp) { hud.flashHp = Math.max(hud.flashT > 0 ? hud.flashHp : 0, hud.lastHp); hud.flashT = 1; }
    if (hud.lastHp >= 0 && d.hp > hud.lastHp && hud.waveT <= 0) hud.waveT = .6;
    hud.lastHp = d.hp; hud.flashT = Math.max(0, hud.flashT - rawDt);
    if (hud.waveT > 0) { hud.waveT -= rawDt; hud.wave = hud.waveT > 0 ? Math.floor((1 - hud.waveT / .6) * 10) : -1; }
    const k = hudKey(); if (k !== hud.key || hudDirty) { hud.key = k; hudDirty = false; paintStats(); }
    drawStamina(rawDt);
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
    return s.foods.map(f => ({ key: 'food:' + f.id, name: `${f.name} (+${f.hp} health, +${f.stamina} stamina)`, t: f.t, max: f.max, icon: f.icon, color: '#ffd23f', pie: true }))
      .concat([...extra.entries()].map(([key, v]) => Object.assign({ key }, v)));
  }
  function renderStatus() {
    const list = statusList(), sig = cur + ':' + list.map(x => x.key).join(',');
    if (sig !== statusSig) {
      statusSig = sig; statusEl.textContent = '';
      for (const st of list) { const w = document.createElement('div'); w.className = 'cbEff mc'; w.title = st.name || ''; w.dataset.key = st.key;
        w.appendChild(iconCanvas(st)); const sp = document.createElement('span'); w.appendChild(sp); statusEl.appendChild(w); }
    }
    list.forEach((st, i) => { const w = statusEl.children[i]; if (!w) return; w.lastChild.textContent = fmt(st.t); w.classList.toggle('low', st.t != null && st.t < 10);
      if (st.pie && st.max) {                       // food: a pie timer over the icon (dark wedge = time eaten away)
        const f = Math.round((1 - st.t / st.max) * 24) / 24; if (w._pie === f) return; w._pie = f;
        const c = w.firstChild, g = c.getContext('2d'); if (!w._base) w._base = pixCanvas(24, 24, gg => gg.drawImage(c, 0, 0));
        g.clearRect(0, 0, 24, 24); g.drawImage(w._base, 0, 0);
        if (f > 0) { g.save(); g.beginPath(); g.rect(3, 3, 18, 18); g.clip(); g.fillStyle = 'rgba(0,0,0,.5)'; g.beginPath(); g.moveTo(12, 12);
          g.arc(12, 12, 14, -Math.PI / 2, -Math.PI / 2 + f * Math.PI * 2); g.closePath(); g.fill(); g.restore(); }
      }
      if (st.pulse) w.style.opacity = .55 + .45 * Math.abs(Math.sin(performance.now() / 300));
    });
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
      if (state !== 'title' && state !== 'pause' && state !== 'dead') for (let i = s.foods.length - 1; i >= 0; i--) { s.foods[i].t -= dt; if (s.foods[i].t <= 0) { s.foods.splice(i, 1); statusDirty = true; } }
      const mx = maxStamina(d); if (s.stamina > mx) s.stamina = mx;
      if (d !== DEFS[cur]) { s.stamina = Math.min(mx, s.stamina + CFG.regen * dt); s.exhausted = false; s.wait = 0; }
    }
    if (state !== 'play' && state !== 'wheel') { if (blocking) setBlocking(false); if (eating && state !== 'dead') cancelEat(); return; }
    const pl = PL(), d = DEFS[cur], s = ST(d);
    if (lastCur !== cur) { lastCur = cur; fallStart = pl.pos.y; wasAir = false; blocking = false; eating = null; dodge = null; statusDirty = true; drawStats(); }
    invulnT = Math.max(0, invulnT - dt); guardT = Math.max(0, guardT - dt); atkCd = Math.max(0, atkCd - dt); tiltT = Math.max(0, tiltT - dt);

    // stamina: sprint drain, regen after a short delay (slower while blocking)
    const swim = inWater(pl);
    if (pl.sprint && pl.hspeed > 4.45 && !dodge) { drainStamina(CFG.sprintDrain * skillCost('run') * dt); gain('run', dt / 4); if (s.exhausted) pl.sprint = false; }
    else if (swim && pl.hspeed > .5) gain('swim', dt / 4);
    else if (pl.sneak && pl.hspeed > .3) gain('sneak', dt / 6);
    if (s.wait > 0) s.wait -= dt;
    else if (s.stamina < maxStamina()) s.stamina = Math.min(maxStamina(), s.stamina + CFG.regen * (blocking ? .4 : 1) * staRegenMul() * dt);
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

    // Valheim health: no hunger, no starving. Each active food heals 1 hp every 10 s (faster Rested, slower Wet / Cold)
    const mh = maxHp(d);
    if (d.hp > mh) { d.hp = mh; drawStats(); }
    if (d.hp > 0 && d.hp < mh && s.foods.length) {
      s.regenT += dt * s.foods.length * hpRegenMul(); if (s.regenT >= CFG.regenEvery) { s.regenT -= CFG.regenEvery; d.hp = Math.min(mh, d.hp + 1); drawStats(); }
    } else s.regenT = 0;
    survivalFrame(dt, pl, d, s, swim);

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
    armorT -= rawDt; if (armorT <= 0) { armorT = .25; hud.armor = Math.round(armorPoints()); applyScale(); }
    if (state !== 'title') hudTick(rawDt);
    survivalTick(rawDt);
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
  //  Valheim survival rules: skills, status effects, death + tombstone, carry weight,
  //  shelter / comfort / Rested, weather + Wet / Cold / Freezing, creature stars, damage types
  // =====================================================================
  const solidAt = (x, y, z) => { const t = get(x, y, z), b = BLOCK[t]; return !!(t && t !== WATER && b && b.kind !== 'cross' && !/Leaves|Needles|Torch|Water/.test(b.name || '')); };

  // ---- status effects (Minecraft potion-icon style; drawn 16x16 at offset 4 into the 24x24 frame)
  const IC = (rows, pal, ox = 3, oy = 3) => g => spr(g, rows, ox, oy, pal);
  const STATUS = {
    spared: { name: 'Spared: no skill loss if you die', icon: IC(['..gggggg..', '.gWWWWWWg.', 'gWWWWWWWWg', 'gWkkWWkkWg', 'gWkkWWkkWg', 'gWWWkkWWWg', '.gWWWWWWg.', '..gWkWkg..', '...gggg...'], { g: '#3fd13f', W: '#f0f0f0', k: '#1a1a1a' }) },
    secondwind: { name: 'Second Wind: stamina regen +50%, carry weight +150', icon: IC(['..WWWWW...', '.W.....W..', '.....WW...', '...WW.....', '..W....WW.', '.W....W..W', '.W.....WW.', '..WWW.....', '.....WWWW.'], { W: '#e8f4ff' }) },
    rested: { name: 'Rested: health and stamina regen +50%, skills learn faster', icon: IC(['......ZZZZ', '........Z.', '.......Z..', '......ZZZZ', 'ZZZZZ.....', '...Z......', '..Z.......', '.Z........', 'ZZZZZ.....'], { Z: '#ffffff' }) },
    resting: { name: 'Resting...', pulse: true, icon: IC(['......ZZZZ', '........Z.', '.......Z..', '......ZZZZ', 'ZZZZZ.....', '...Z......', '..Z.......', '.Z........', 'ZZZZZ.....'], { Z: '#ffe08a' }) },
    shelter: { name: 'Shelter', icon: IC(['....kk....', '...kRRk...', '..kRRRRk..', '.kRRRRRRk.', 'kkkkkkkkkk', '.kWWWWWWk.', '.kWkkWWWk.', '.kWkkWBBk.', '.kWWWWBBk.', '.kkkkkkkk.'], { k: '#2a1a0a', R: '#a8432a', W: '#c9a46a', B: '#6b4a22' }) },
    wet: { name: 'Wet: health and stamina regen -25%', icon: IC(['....k.....', '...kBk....', '...kBk....', '..kBBBk...', '.kBWBBBk..', '.kBWBBBk..', '.kBBBBBk..', '..kBBBk...', '...kkk....'], { k: '#10305a', B: '#3f7fe0', W: '#cfe4ff' }) },
    cold: { name: 'Cold: health regen -50%', icon: IC(['....W.....', '.W..W..W..', '..W.W.W...', '...WWW....', 'WWWWWWWWW.', '...WWW....', '..W.W.W...', '.W..W..W..', '....W.....'], { W: '#bfe6ff' }) },
    freezing: { name: 'Freezing: you lose health', icon: IC(['....W.....', '.W..W..W..', '..W.W.W...', '...WWW....', 'WWWWWWWWW.', '...WWW....', '..W.W.W...', '.W..W..W..', '....W.....'], { W: '#ff5a5a' }) },
    overloaded: { name: 'Overloaded: you carry too much (no sprint, no jump)', icon: IC(['...kkkk...', '...k..k...', '.kkkkkkkk.', '.kGGGGGGk.', 'kGGWGGGGGk', 'kGGGGGGGGk', 'kGGGGGGGGk', 'kkkkkkkkkk'], { k: '#1a1a1a', G: '#6a6a6a', W: '#b0b0b0' }) },
  };
  function setStatus(key, o = {}) {
    const def = STATUS[key] || {}, secs = o.secs ?? null;
    const old = extra.get(key);
    if (old && secs == null && old.t == null) return;
    extra.set(key, { name: o.name || def.name || key, t: secs, max: secs, icon: o.icon || def.icon, color: o.color, pulse: def.pulse });
    if (!old) statusDirty = true;
  }
  const clearStatus = key => { if (extra.delete(key)) statusDirty = true; };
  const has = key => extra.has(key);

  // ---- skills that level by use
  const SKILL_LIST = [['swords', 'Swords'], ['knives', 'Knives'], ['clubs', 'Clubs'], ['spears', 'Spears'], ['axes', 'Axes'], ['polearms', 'Polearms'],
    ['bows', 'Bows'], ['unarmed', 'Unarmed'], ['blocking', 'Blocking'], ['woodcutting', 'Woodcutting'], ['pickaxes', 'Pickaxes'], ['run', 'Run'],
    ['jump', 'Jump'], ['swim', 'Swim'], ['sneak', 'Sneak'], ['cooking', 'Cooking'], ['farming', 'Farming']];
  const SKILL_NAME = Object.fromEntries(SKILL_LIST);
  const SKILL_ITEM = { swords: ['bronze_sword', 'iron_sword', 'stone_sword', 'wooden_sword', 'wood_sword'], knives: ['flint_knife', 'copper_knife', 'knife'],
    clubs: ['wood_club', 'bronze_mace'], spears: ['flint_spear'], axes: ['flint_axe', 'stone_axe', 'wooden_axe'], polearms: ['atgeir'], bows: ['crude_bow', 'bow'],
    blocking: ['wood_shield', 'shield'], woodcutting: ['oak_log', 'wood'], pickaxes: ['antler_pickaxe', 'stone_pickaxe', 'wooden_pickaxe'], cooking: ['cooked_meat'], farming: ['bread', 'wheat'] };
  const SKILL_ART = {     // fallbacks for skills without an item
    unarmed: [['..kkkk....', '.kSSSSk...', 'kSSSSSSk..', 'kSkSkSSk..', 'kSSSSSSkk.', 'kSSSSSSSk.', '.kSSSSSk..', '..kSSSk...', '..kkkkk...'], { k: '#2a1a10', S: '#c68e62' }],
    run: [['....kk....', '...kBBk...', '...kBBk...', '..kBBBk...', '..kBBBBkk.', '.kBBBBBBBk', '.kkkkkkkkk'], { k: '#2a1a10', B: '#8a5a2a' }],
    jump: [['....W.....', '...WWW....', '..WWWWW...', '.WWWWWWW..', '...WWW....', '...WWW....', '...WWW....', '..........', 'GGGGGGGGG.'], { W: '#ffffff', G: '#5a9a3a' }],
    swim: [['..........', '.B...B...B', 'B.B.B.B.B.', '...B...B..', '..........', '.B...B...B', 'B.B.B.B.B.', '...B...B..'], { B: '#4f8fe8' }],
    sneak: [['..........', '..kkkkkk..', '.kWWWWWWk.', 'kWWkkkWWWk', 'kWWkGkWWWk', 'kWWkkkWWWk', '.kWWWWWWk.', '..kkkkkk..'], { k: '#1a1a1a', W: '#e8e8e8', G: '#3fbf5f' }],
    knives: [['........W.', '.......WW.', '......WW..', '.....WW...', '....WW....', '..kWW.....', '..kk......', '.kk.......', 'kk........'], { W: '#d8d8d8', k: '#5a3a1a' }],
    polearms: [['.......WW', '......WWW', '.....kWW.', '....k....', '...k.....', '..k......', '.k.......', 'k........'], { W: '#d8d8d8', k: '#6b4a22' }],
    bows: [['..kk.....', '..k.k....', '..k..k...', '..k...k..', '..W....k.', '..k...k..', '..k..k...', '..k.k....', '..kk.....'], { k: '#8a5a2a', W: '#e8e8e8' }],
  };
  function skillIcon(id) {
    for (const it of SKILL_ITEM[id] || []) if (typeof ITEMS !== 'undefined' && ITEMS[it] && hasInv() && Inv.icon) { try { return Inv.icon(it); } catch (e) { /* next */ } }
    const a = SKILL_ART[id] || SKILL_ART.unarmed; return pixCanvas(16, 16, g => spr(g, a[0], 3, 3, a[1]));
  }
  const need = l => Math.pow(l + 1, 1.5) * .5 + .5;
  const SKD = (d = DEFS[cur]) => d._sk || (d._sk = {});
  const level = id => { const k = SKD()[id]; return k ? k.l : 0; };
  const levelF = id => { const k = SKD()[id]; return k ? k.l + (k.l < 100 ? k.x / need(k.l) : 0) : 0; };
  const skillDmg = id => 1 + level(id) / 100;
  const skillCost = id => 1 - .33 * level(id) / 100;
  let skillsDirty = false;
  function gain(id, amt) {
    if (!SKILL_NAME[id] || !(amt > 0) || dead) return;
    const sk = SKD(), k = sk[id] || (sk[id] = { l: 0, x: 0 }); if (k.l >= 100) return;
    k.x += amt * (has('rested') ? 1.5 : 1);
    while (k.l < 100 && k.x >= need(k.l)) { k.x -= need(k.l); k.l++; levelUp(id, k.l); }
    skillsDirty = true;
  }
  function drainSkills() {
    let lost = 0;
    for (const [id, k] of Object.entries(SKD())) {
      const f = levelF(id), nf = f * (1 - CFG.skillLoss); lost += f - nf;
      k.l = Math.floor(nf); k.x = (nf - k.l) * need(k.l);
    }
    skillsDirty = true; return lost;
  }
  function chime() { if (!AC) return; const t = AC.currentTime; [523.3, 659.3, 784, 1046.5].forEach((f, i) => tone(t + i * .07, f, f, .35, .12, 'triangle', .4)); }
  // advancement-style toast: "Skill improved!" / "Swords 12"
  const toastCss = document.createElement('style');
  toastCss.textContent = `
  #cbToasts { position: absolute; right: calc(8px + env(safe-area-inset-right, 0px)); top: calc(76px + env(safe-area-inset-top, 0px)); display: flex; flex-direction: column; gap: 4px; z-index: 6; pointer-events: none; }
  .cbToast { display: flex; gap: 8px; align-items: center; width: 160px; padding: 6px 8px; background: #212121; border: 2px solid #000; box-shadow: inset 0 0 0 2px #555; transition: transform .4s, opacity .4s; }
  .cbToast.out { transform: translateX(200px); opacity: 0; }
  .cbToast canvas { width: 32px; height: 32px; image-rendering: pixelated; flex: none; }
  .cbToast b { display: block; color: #ffff55; font: 400 14px var(--ui); } .cbToast span { font: 400 16px var(--ui); color: #fff; }
  #cbSkills, #cbTomb { position: fixed; inset: 0; z-index: 15; background: rgba(16,16,16,.55); font-family: var(--ui); color: #404040; touch-action: none; --s: 2; }
  .cbPn { position: absolute; left: 50%; top: 50%; width: 176px; transform: translate(-50%, -50%) scale(var(--s)); background: #c6c6c6; border-radius: 3px;
    box-shadow: inset 2px 2px 0 #fff, inset -2px -2px 0 #555, 0 0 0 1px #000; }
  .cbPn .tt { position: absolute; left: 8px; top: 6px; font-size: 8px; line-height: 8px; }
  .cbPn .x { position: absolute; right: 5px; top: 3px; width: 12px; height: 12px; font-size: 8px; line-height: 12px; text-align: center; color: #fff; background: #727272;
    box-shadow: inset 1px 1px 0 #aaa, inset -1px -1px 0 #4a4a4a, 0 0 0 1px #000; cursor: pointer; }
  .cbPn .ls { position: absolute; left: 7px; top: 17px; right: 7px; bottom: 7px; overflow-y: auto; background: #8b8b8b; box-shadow: inset 1px 1px 0 #373737, inset -1px -1px 0 #fff; scrollbar-width: thin; }
  .cbRow { position: relative; height: 20px; border-bottom: 1px solid #7a7a7a; }
  .cbRow canvas.i { position: absolute; left: 2px; top: 2px; width: 16px; height: 16px; image-rendering: pixelated; }
  .cbRow .n { position: absolute; left: 21px; top: 2px; font-size: 8px; line-height: 8px; color: #fff; text-shadow: 1px 1px 0 #3f3f3f; }
  .cbRow .v { position: absolute; right: 4px; top: 2px; font-size: 8px; line-height: 8px; color: #80ff20; text-shadow: 1px 1px 0 #1f3f08; }
  .cbRow canvas.b { position: absolute; left: 21px; top: 12px; width: 120px; height: 5px; image-rendering: pixelated; }
  .cbGrid { position: absolute; left: 7px; top: 17px; display: grid; grid-template-columns: repeat(9, 18px); }
  .cbGrid .is { position: relative; width: 18px; height: 18px; background: #8b8b8b; box-shadow: inset 1px 1px 0 #373737, inset -1px -1px 0 #fff; cursor: pointer; }
  .cbGrid .is canvas { position: absolute; left: 1px; top: 1px; width: 16px; height: 16px; image-rendering: pixelated; pointer-events: none; }
  .cbBtn { position: absolute; height: 14px; padding: 0 6px; font-size: 8px; line-height: 14px; color: #fff; text-shadow: 1px 1px 0 #3f3f3f; background: #727272; cursor: pointer;
    box-shadow: inset 1px 1px 0 #aaa, inset -1px -1px 0 #4a4a4a, 0 0 0 1px #000; }
  #cbWeight { position: absolute; left: 97px; top: 56px; font-size: 8px; line-height: 8px; white-space: nowrap; }
  html.touch #cbToasts { top: calc(var(--tb, 56px) + 56px); }
  #cbSkBtn { left: 97px; top: 66px; height: 11px; line-height: 11px; font-size: 7px; padding: 0 4px; }`;
  document.head.appendChild(toastCss);
  const toastsEl = document.createElement('div'); toastsEl.id = 'cbToasts'; hudEl.appendChild(toastsEl);
  function levelUp(id, l) {
    chime();
    const t = document.createElement('div'); t.className = 'cbToast out';
    const c = document.createElement('canvas'); c.width = c.height = 16; c.getContext('2d').drawImage(skillIcon(id), 0, 0, 16, 16); t.appendChild(c);
    const w = document.createElement('div'); w.innerHTML = '<b>Skill improved!</b><span></span>'; w.lastChild.textContent = `${SKILL_NAME[id]} ${l}`; t.appendChild(w);
    toastsEl.appendChild(t); while (toastsEl.children.length > 3) toastsEl.firstChild.remove();
    requestAnimationFrame(() => t.classList.remove('out')); setTimeout(() => t.classList.remove('out'), 30);
    setTimeout(() => t.classList.add('out'), 3200); setTimeout(() => t.remove(), 3700);
    emit('skillUp', id, l);
  }
  // woodcutting / pickaxes from breaking blocks, cooking from crafting food
  on('blockDrops', (drops, h) => {
    const n = (BLOCK[h.t] && BLOCK[h.t].name) || '', it = heldItem();
    if (/Log|Wood|Stump/.test(n)) gain('woodcutting', 1);
    else if (/Stone|Cobble|Ore|Copper|Tin|Rock/.test(n) && it && /pickaxe/.test(it.id)) gain('pickaxes', 1);
    return drops;
  });
  on('craft', made => { const id = made && (made.id || made.out || made); if (typeof id === 'string' && ITEMS[id] && ITEMS[id].kind === 'food') gain('cooking', 1); });

  // ---- Minecraft-style panels (skills, tombstone)
  function panelScale(w, h) { return clamp(Math.floor(Math.min((innerWidth - 24) / w, (innerHeight - 12) / h) * 4) / 4, .75, 3); }
  const isRotUI = () => document.documentElement.classList.contains('rot');
  function mkPanel(id, w, h, title, close) {
    const root = document.createElement('div'); root.id = id; root.hidden = true; document.body.appendChild(root);
    const pn = document.createElement('div'); pn.className = 'cbPn'; pn.style.height = h + 'px'; pn.style.width = w + 'px'; root.appendChild(pn);
    const tt = document.createElement('div'); tt.className = 'tt'; tt.textContent = title; pn.appendChild(tt);
    const x = document.createElement('div'); x.className = 'x'; x.textContent = 'x'; pn.appendChild(x);
    x.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); close(); });
    root.addEventListener('pointerdown', e => { if (e.target === root) { e.preventDefault(); close(); } });
    pn.addEventListener('pointerdown', e => e.stopPropagation());
    root.fit = () => { const W = isRotUI() ? innerHeight : innerWidth, H = isRotUI() ? innerWidth : innerHeight;
      root.style.setProperty('--s', clamp(Math.floor(Math.min((W - 24) / w, (H - 12) / h) * 4) / 4, .75, 3)); };
    return { root, pn, tt };
  }
  function openPanel(P, st) {
    if (state !== 'play') return false;
    state = st; mining = false; P.root.fit(); P.root.hidden = false;
    if (document.pointerLockElement) try { document.exitPointerLock(); } catch (e) { /* ignore */ }
    SFX.uiClick && SFX.uiClick(); return true;
  }
  function closePanel(P, st, relock) {
    if (state !== st) return; P.root.hidden = true; state = 'play';
    if (relock && !TOUCH && !noLock) try { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) { /* click to capture */ }
    canvas.focus();
  }
  // Skills screen (K)
  const SKP = mkPanel('cbSkills', 176, 166, 'Skills', () => closePanel(SKP, 'skills', false));
  const skList = document.createElement('div'); skList.className = 'ls'; SKP.pn.appendChild(skList);
  const xpBar = (c, f) => { const g = c.getContext('2d'); g.clearRect(0, 0, 120, 5); px(g, '#000', 0, 0, 120, 5); px(g, '#2a2a2a', 1, 1, 118, 3);
    const w = Math.round(118 * clamp(f, 0, 1)); if (w) { px(g, '#80ff20', 1, 1, w, 3); px(g, '#c8ff8a', 1, 1, w, 1); px(g, '#4a9a10', 1, 3, w, 1); } };
  const skRows = SKILL_LIST.map(([id, name]) => {
    const r = document.createElement('div'); r.className = 'cbRow'; r.title = name;
    const ic = document.createElement('canvas'); ic.className = 'i'; ic.width = ic.height = 16; r.appendChild(ic);
    const n = document.createElement('div'); n.className = 'n'; n.textContent = name; r.appendChild(n);
    const v = document.createElement('div'); v.className = 'v'; r.appendChild(v);
    const b = document.createElement('canvas'); b.className = 'b'; b.width = 120; b.height = 5; r.appendChild(b);
    skList.appendChild(r); return { id, ic, v, b, drawn: false };
  });
  function renderSkills() {
    for (const r of skRows) {
      if (!r.drawn) { const g = r.ic.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(skillIcon(r.id), 0, 0, 16, 16); r.drawn = true; }
      const k = SKD()[r.id] || { l: 0, x: 0 }; r.v.textContent = k.l; xpBar(r.b, k.l >= 100 ? 1 : k.x / need(k.l));
    }
  }
  function openSkills() { if (openPanel(SKP, 'skills')) { skRows.forEach(r => r.drawn = false); renderSkills(); } }

  // ---- death: tombstone with everything you carried
  const TOMBS = [];
  const tombMat = (() => {
    const t = charTex(16, 16, g => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { g.fillStyle = shade('#8a8a8a', (Math.random() - .5) * .25); g.fillRect(x, y, 1, 1); }
      g.fillStyle = '#5a5a5a'; g.fillRect(4, 4, 8, 1); g.fillRect(7, 2, 2, 9); });
    return new THREE.MeshLambertMaterial({ map: t });
  })();
  const baseMat = new THREE.MeshLambertMaterial({ color: 0x5c5c5c });
  function tombMesh(t) {
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(.8, .16, .5), baseMat); base.position.y = .08; g.add(base);
    const slab = new THREE.Mesh(new THREE.BoxGeometry(.56, .78, .14), tombMat); slab.position.y = .55; g.add(slab);
    const top = new THREE.Mesh(new THREE.BoxGeometry(.4, .1, .14), tombMat); top.position.y = .99; g.add(top);
    if (typeof nameTag === 'function') { const tag = nameTag(t.name); tag.position.y = 1.45; g.add(tag); }
    g.position.set(t.x, t.y, t.z); g.rotation.y = t.ry || 0; scene.add(g); return g;
  }
  const triggerInv = () => { try { Inv.remove('__none__', 0); } catch (e) { /* items module */ } };
  function dropTombstone(d) {
    if (!(hasInv() && Inv.bag)) return;
    const b = Inv.bag(), items = [];
    b.main.forEach((s, i) => { if (s) items.push({ slot: 'main', i, s }); b.main[i] = null; });
    b.armor.forEach((s, i) => { if (s) items.push({ slot: 'armor', i, s }); b.armor[i] = null; });
    b.off.forEach((s, i) => { if (s) items.push({ slot: 'off', i, s }); b.off[i] = null; });
    if (!items.length) return;
    triggerInv();
    const pl = PL(); let x = pl.pos.x, z = pl.pos.z, y = Math.floor(pl.pos.y + .01);
    if (headInWater(pl) || !pl.onGround) { const gy = groundY(x, z); y = gy && gy.y != null ? gy.y : y; }
    const t = { x, y, z, ry: pl.yaw, name: `${d.name}'s Tombstone`, items };
    t.mesh = tombMesh(t); TOMBS.push(t);
    chat('Your belongings lie in a tombstone where you fell.');
    emit('pins');
  }
  function removeTomb(t) { const i = TOMBS.indexOf(t); if (i >= 0) TOMBS.splice(i, 1); if (t.mesh) scene.remove(t.mesh); emit('pins'); }
  const TBP = mkPanel('cbTomb', 176, 112, 'Tombstone', () => closePanel(TBP, 'tomb', false));
  const tGrid = document.createElement('div'); tGrid.className = 'cbGrid'; TBP.pn.appendChild(tGrid);
  const takeBtn = document.createElement('div'); takeBtn.className = 'cbBtn'; takeBtn.textContent = 'Take all'; takeBtn.style.left = '7px'; takeBtn.style.top = '92px'; TBP.pn.appendChild(takeBtn);
  let tombOpen = null;
  function placeStack(e) {
    const b = Inv.bag();
    if (e.slot !== 'main' && b[e.slot] && !b[e.slot][e.i]) { b[e.slot][e.i] = e.s; return true; }
    if (e.slot === 'main' && !b.main[e.i]) { b.main[e.i] = e.s; return true; }
    const k = b.main.findIndex(s => !s); if (k >= 0) { b.main[k] = e.s; return true; }
    const left = Inv.add(e.s.id, e.s.n); if (left <= 0) return true; e.s.n = left; return false;
  }
  function takeFromTomb(t, list) {
    for (const e of list) if (placeStack(e)) t.items.splice(t.items.indexOf(e), 1);
    triggerInv();
    if (!t.items.length) { removeTomb(t); setStatus('secondwind', { secs: CFG.secondWindSecs }); chat('You recovered your belongings. Second Wind!'); closePanel(TBP, 'tomb', !TOUCH); }
    else renderTomb();
  }
  function renderTomb() {
    const t = tombOpen; tGrid.textContent = ''; if (!t) return;
    TBP.tt.textContent = t.name;
    t.items.slice(0, 36).forEach(e => {
      const d = document.createElement('div'); d.className = 'is'; d.title = ITEMS[e.s.id] ? ITEMS[e.s.id].name : e.s.id;
      const c = document.createElement('canvas'); c.width = c.height = 20; const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
      try { g.drawImage(Inv.icon(e.s.id), 0, 0, 32, 32, 2, 2, 16, 16); } catch (err) { /* icon */ }
      if (e.s.n > 1) digits(g, e.s.n, 19 - textW(e.s.n) - 1, 11, '#fff', 'shadow');
      c.style.left = '-1px'; c.style.top = '-1px'; c.style.width = c.style.height = '20px';
      d.appendChild(c); tGrid.appendChild(d);
      d.addEventListener('pointerdown', ev => { ev.stopPropagation(); ev.preventDefault(); takeFromTomb(t, [e]); });
    });
  }
  takeBtn.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); if (tombOpen) takeFromTomb(tombOpen, tombOpen.items.slice()); });
  function tombInReach() {
    const pl = PL(), eye = pl.eye, dir = lookDir(pl.yaw, pl.pitch);
    let best = null, bd = 3.2;
    for (const t of TOMBS) { const c = new V3(t.x, t.y + .6, t.z), to = c.sub(eye), dist = to.length(); if (dist < bd && (dist < 1.4 || to.normalize().dot(dir) > .6)) { best = t; bd = dist; } }
    return best;
  }
  function tryTomb() { const t = tombInReach(); if (!t) return false; tombOpen = t; if (openPanel(TBP, 'tomb')) renderTomb(); return true; }

  // ---- carry weight
  let weight = 0, overloaded = false;
  const maxCarry = () => {
    let m = CFG.carryMax + (has('secondwind') ? 150 : 0);
    const b = hasInv() && Inv.bag ? Inv.bag() : null;
    if (b && [...b.armor, ...b.main].some(s => s && /strength_belt|megingjord/.test(s.id))) m += 150;
    return m;
  };
  function calcWeight() {
    const b = hasInv() && Inv.bag ? Inv.bag() : null; if (!b) return 0;
    let w = 0; for (const s of [...b.main, ...b.armor, ...b.off]) if (s && ITEMS[s.id]) w += (+ITEMS[s.id].weight || 0) * s.n;
    return w;
  }
  function syncInvPanel() {
    if (!(hasInv() && Inv.isOpen && Inv.isOpen())) return;
    const pn = document.querySelector('#inv .ipn'); if (!pn || !pn.querySelector('.ipv')) return;
    let w = pn.querySelector('#cbWeight');
    if (!w) {
      w = document.createElement('div'); w.id = 'cbWeight'; pn.appendChild(w);
      const b = document.createElement('div'); b.id = 'cbSkBtn'; b.className = 'cbBtn'; b.textContent = 'Skills [K]'; pn.appendChild(b);
      b.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); try { Inv.close(); } catch (err) { /* ignore */ } setTimeout(openSkills, 0); });
    }
    const mc = maxCarry(); w.textContent = `Weight ${Math.round(weight)}/${mc}`; w.style.color = weight > mc ? '#ff3f3f' : '#404040';
  }

  // ---- weather: Clear / Rain / Storm / Fog (Snow comes with the Mountains)
  const WX_ = { state: 'clear', t: 150, k: 0 };
  const WEATHERS = [['clear', .5], ['rain', .24], ['storm', .1], ['fog', .16]];
  function setWeather(w, secs) { WX_.state = w; WX_.t = secs || 120 + Math.random() * 180; emit('weather', w); }
  function rollWeather() { let r = Math.random(); for (const [w, p] of WEATHERS) { if ((r -= p) <= 0) return setWeather(w); } setWeather('clear'); }
  const raining = () => WX_.state === 'rain' || WX_.state === 'storm';
  function hookWorld() {
    if (typeof World === 'undefined' || !World || Object.getOwnPropertyDescriptor(World, 'weather')) return;
    Object.defineProperty(World, 'weather', { get: () => WX_.state, set: v => setWeather(String(v)), configurable: true, enumerable: true });
    World.setWeather = setWeather;
  }
  const RAIN_N = 900;
  const rainGeo = new THREE.BufferGeometry(), rainPos = new Float32Array(RAIN_N * 6);
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rainMat = new THREE.LineBasicMaterial({ color: 0x9fb4d0, transparent: true, opacity: 0, depthWrite: false, fog: true });
  const rain = new THREE.LineSegments(rainGeo, rainMat); rain.frustumCulled = false; rain.visible = false; scene.add(rain);
  const drops = []; for (let i = 0; i < RAIN_N; i++) drops.push({ x: (Math.random() - .5) * 36, y: Math.random() * 26 - 8, z: (Math.random() - .5) * 36, v: 18 + Math.random() * 8 });
  let fogBase = null, fogK = 1;
  function weatherFrame(dt) {
    WX_.t -= dt; if (WX_.t <= 0) rollWeather();
    const want = WX_.state === 'storm' ? 1 : WX_.state === 'rain' ? .6 : 0;
    WX_.k += clamp(want - WX_.k, -dt * .25, dt * .25);
    rain.visible = WX_.k > .01 && state !== 'title';
    if (rain.visible) {
      const c = camera.getWorldPosition(new V3()), n = Math.floor(RAIN_N * WX_.k), slant = WX_.state === 'storm' ? .35 : .08;
      rainMat.opacity = .35 + .25 * WX_.k;
      for (let i = 0; i < RAIN_N; i++) {
        const q = drops[i], o = i * 6;
        if (i >= n) { rainPos.fill(0, o, o + 6); continue; }
        q.y -= q.v * dt; if (q.y < -8) { q.y = 18; q.x = (Math.random() - .5) * 36; q.z = (Math.random() - .5) * 36; }
        const x = c.x + q.x, y = c.y + q.y, z = c.z + q.z;
        rainPos[o] = x; rainPos[o + 1] = y; rainPos[o + 2] = z; rainPos[o + 3] = x + slant; rainPos[o + 4] = y + .55; rainPos[o + 5] = z;
      }
      rainGeo.attributes.position.needsUpdate = true;
    }
    // fog and storms pull the fog in (relative to whatever distance the other modules set)
    if (scene.fog && scene.fog.far) {
      const k = WX_.state === 'fog' ? .45 : WX_.state === 'storm' ? .7 : 1;
      if (fogBase === null || Math.abs(scene.fog.far - fogBase.far * fogK) > .5) fogBase = { near: scene.fog.near / fogK, far: scene.fog.far / fogK };
      fogK += clamp(k - fogK, -dt * .1, dt * .1);
      scene.fog.near = fogBase.near * fogK; scene.fog.far = fogBase.far * fogK;
    }
  }

  // ---- shelter, fire, comfort, Rested; Wet / Cold / Freezing
  const ENVS = { roof: false, shelter: false, fire: false, comfort: 1, restT: 0, scanT: 0, freezing: false };
  const nameOf = t => (BLOCK[t] && BLOCK[t].name) || '';
  const FIRE_RE = /campfire|hearth|bonfire|fire pit|brazier/i;
  function isFire(t) { return FIRE_RE.test(nameOf(t)) || (typeof Stations !== 'undefined' && Stations.ids && t === Stations.ids.FURNACE_LIT); }
  function scanEnv() {
    const pl = PL(), hx = Math.floor(pl.pos.x), hy = Math.floor(pl.pos.y + 1.5), hz = Math.floor(pl.pos.z), fy = Math.floor(pl.pos.y + .2);
    let roof = false; for (let y = hy + 1; y < WY; y++) if (solidAt(hx, y, hz)) { roof = true; break; }
    let enc = 0;
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
    const hit = (dx, dz, y) => { for (let r = 1; r <= 4; r++) if (solidAt(hx + dx * r, y, hz + dz * r)) return true; return false; };
    for (const [dx, dz] of dirs) if (hit(dx, dz, hy)) enc++;
    for (const [dx, dz] of dirs.slice(0, 4)) if (hit(dx, dz, fy)) enc++;
    let fire = false, hearth = false; const kinds = new Set();
    for (let y = -3; y <= 4; y++) for (let z = -10; z <= 10; z++) for (let x = -10; x <= 10; x++) {
      const t = get(hx + x, fy + y, hz + z); if (!t || t === WATER) continue;
      const n = nameOf(t);
      if (isFire(t)) { if (Math.abs(x) <= 5 && Math.abs(z) <= 5 && Math.abs(y) <= 3) fire = true; kinds.add('fire'); if (/hearth/i.test(n)) hearth = true; }
      else if (/^Bed/.test(n)) kinds.add('bed');
      else if (/chair|bench|stool|throne/i.test(n)) kinds.add('seat');
      else if (/table/i.test(n) && !/crafting/i.test(n)) kinds.add('table');
      else if (/rug|banner|carpet/i.test(n)) kinds.add('deco:' + n);
    }
    ENVS.roof = roof; ENVS.shelter = roof && enc >= 8; ENVS.fire = fire;
    ENVS.comfort = Math.min(17, 1 + kinds.size + (hearth ? 1 : 0));
    ENVS.freezing = typeof World !== 'undefined' && typeof World.biome === 'function' && (() => { try { return World.biome(pl.pos.x, pl.pos.z) === 'mountains'; } catch (e) { return false; } })();
  }
  const frostRes = () => { const b = hasInv() && Inv.bag ? Inv.bag() : null; return !!(b && [...b.armor, ...b.off].some(s => s && ITEMS[s.id] && (ITEMS[s.id].frost || /wolf|frost/.test(s.id)))) || has('frostmead'); };
  const isNightNow = () => typeof World !== 'undefined' && World.isNight ? World.isNight() : false;
  function hpRegenMul() { return (has('rested') ? 1.5 : 1) * (has('wet') ? .75 : 1) * (has('cold') ? .5 : 1); }
  function staRegenMul() { return (has('rested') ? 1.5 : 1) * (has('wet') ? .75 : 1) * (has('freezing') ? .5 : 1) * (has('secondwind') ? 1.5 : 1); }
  let freezeT = 0;
  function survivalFrame(dt, pl, d, s, swim) {
    weatherFrame(dt);
    ENVS.scanT -= dt;
    if (ENVS.scanT <= 0) {
      ENVS.scanT = 1; scanEnv();
      if (ENVS.shelter) setStatus('shelter'); else clearStatus('shelter');
      // Rested: 20 s sheltered by a fire, lasts 8 min + 1 min per comfort level
      if (ENVS.shelter && ENVS.fire) {
        const secs = (8 + ENVS.comfort) * 60;
        if (has('rested')) { const r = extra.get('rested'); r.t = r.max = secs; r.name = `Rested (comfort ${ENVS.comfort})`; clearStatus('resting'); }
        else { ENVS.restT += 1; setStatus('resting'); if (ENVS.restT >= 20) { clearStatus('resting'); setStatus('rested', { secs, name: `Rested (comfort ${ENVS.comfort})` }); chat(`You feel rested. Comfort level ${ENVS.comfort}.`); } }
      } else { ENVS.restT = 0; clearStatus('resting'); }
      // Wet: rain without a roof, or after swimming; Cold: night / wet in a storm outdoors, unless a fire is near
      if ((raining() && !ENVS.roof) || swim) setStatus('wet', { secs: 60 });
      const cold = !ENVS.fire && !frostRes() && ((isNightNow() && !ENVS.shelter) || (has('wet') && WX_.state === 'storm' && !ENVS.roof));
      if (cold && !ENVS.freezing) setStatus('cold'); else clearStatus('cold');
      if (ENVS.freezing && !frostRes() && !ENVS.fire) { setStatus('freezing'); clearStatus('cold'); } else clearStatus('freezing');
    }
    if (has('freezing') && d.hp > 1) { freezeT += dt; if (freezeT >= 1) { freezeT = 0; envHurt(1, 'freezing'); } } else freezeT = 0;
  }

  // ---- creature stars: 10% one star (2x hp, +50% damage), 1% two stars (3x hp, +100% damage)
  const STAR_TEX = {};
  function starTex(n) {
    return STAR_TEX[n] || (STAR_TEX[n] = nearestTex(pixCanvas(n * 8, 8, g => {
      for (let k = 0; k < n; k++) spr(g, ['...k...', '..kYk..', 'kkkYkkk', 'kYYYYYk', '.kYYYk.', '.kYkYk.', 'kYk.kYk', 'kk...kk'], k * 8, 0, { k: '#3a2a00', Y: '#ffcc22' });
    })));
  }
  const BOSSY = /stormhorn|old root|stag|boss/i;
  function rollStars(e, force) {
    if (!e || e._starRolled) return e ? e.stars || 0 : 0; e._starRolled = true;
    if (e.isBoss || e.boss || e.noStars || BOSSY.test((e.name || '') + ' ' + (e.kind || ''))) return 0;
    let n = force | 0;
    if (force == null) {
      const late = /greyling_brute|greyling_shaman|skeleton|troll|wolf|draugr|blob/.test(e.kind || '') ? 1.5 : 1, m = (isNightNow() ? 2 : 1) * late, r = Math.random();
      n = r < .01 * m ? 2 : r < .1 * m ? 1 : 0;
    }
    if (!n) return 0;
    e.stars = n; e.lootMul = n + 1;
    if (typeof e.max === 'number') { const full = e.hp >= e.max; e.max *= n + 1; if (full) e.hp = e.max; else e.hp *= n + 1; }
    if (e.group) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex(n), depthTest: false, fog: false, transparent: true }));
      sp.scale.set(.24 * n, .24, 1); sp.position.y = (e.height || 1.8) + .5; sp.renderOrder = 21; e.group.add(sp); e._starSprite = sp; }
    return n;
  }
  let starScanT = 0;

  // ---- damage types and resistances
  const RESIST = { skeleton: { pierce: .5 }, troll: { pierce: .75 } };
  function resistOf(e, type) { const r = (e && e.resist) || (e && RESIST[e.kind]) || null; return r && r[type] != null ? r[type] : 1; }
  function hitWithType(e, dmg, type = 'slash', src) {
    if (!e || e.dead > 0) return 0;
    const n = Math.max(0, dmg * resistOf(e, type)); const c = e.center ? e.center() : PL().pos, dir = new V3(c.x - PL().pos.x, 0, c.z - PL().pos.z).normalize();
    hitEntity(e, n, dir, type === 'blunt' ? '#ffd27a' : '#ff5555'); if (src) e.lastHitBy = src; return n;
  }

  // ---- per-tick upkeep: weight, inventory line, stars, statuses that depend on state
  let upkeepT = 0;
  function survivalTick(rawDt) {
    hookWorld();
    upkeepT -= rawDt;
    if (upkeepT <= 0) {
      upkeepT = .25;
      if (invDirty) { invDirty = false; weight = calcWeight(); }
      const ov = weight > maxCarry();
      if (ov !== overloaded) { overloaded = ov; if (ov) { setStatus('overloaded'); chat('You are carrying too much.'); } else clearStatus('overloaded'); }
      syncInvPanel();
      if (state === 'skills' && skillsDirty) { skillsDirty = false; renderSkills(); }
      if (state === 'tomb' && (!tombOpen || !TOMBS.includes(tombOpen))) closePanel(TBP, 'tomb', false);
    }
    starScanT -= rawDt;
    if (starScanT <= 0 && state !== 'title') { starScanT = .5; for (const e of ENTITIES) if (e && !e._starRolled && !(e.dead > 0)) rollStars(e); }
  }

  // ---- keys: K = skills; panels close with Escape / their key
  on('key', e => {
    if (state === 'skills') { if (e.code === 'KeyK' || e.code === 'Escape' || e.code === 'KeyE') closePanel(SKP, 'skills', e.code !== 'Escape'); return true; }
    if (state === 'tomb') { if (e.code === 'Escape' || e.code === 'KeyE') closePanel(TBP, 'tomb', e.code !== 'Escape');
      else if (e.code === 'KeyR' && tombOpen) takeFromTomb(tombOpen, tombOpen.items.slice()); return true; }
    if (state === 'play' && e.code === 'KeyK') { openSkills(); return true; }
    return false;
  });

  // ---- save / load / new world
  const packSt = s => [s.id, s.n, s.dur];
  on('save', data => {
    const d = DEFS[cur], s = ST(d);
    data.survival = {
      v: 1, skills: SKD(d), weather: [WX_.state, Math.round(WX_.t)],
      foods: s.foods.map(f => [f.id, Math.round(f.t), f.max, f.hp, f.stamina]),
      status: ['spared', 'rested', 'secondwind', 'wet'].filter(has).map(k => [k, Math.round(extra.get(k).t || 0)]),
      tombs: TOMBS.map(t => ({ x: +t.x.toFixed(2), y: t.y, z: +t.z.toFixed(2), ry: +(t.ry || 0).toFixed(2), name: t.name, items: t.items.map(e => [e.slot, e.i, ...packSt(e.s)]) })),
    };
  });
  function clearAll() { for (const t of TOMBS.slice()) removeTomb(t); for (const k of [...extra.keys()]) if (STATUS[k]) extra.delete(k); statusDirty = true; }
  on('load', data => {
    const sv = data && data.survival; if (!sv) return;
    const d = DEFS[cur], s = ST(d); clearAll();
    d._sk = {}; for (const [id, k] of Object.entries(sv.skills || {})) if (SKILL_NAME[id] && k) d._sk[id] = { l: clamp(k.l | 0, 0, 100), x: +k.x || 0 };
    if (Array.isArray(sv.weather)) setWeather(sv.weather[0], sv.weather[1]);
    s.foods = (sv.foods || []).filter(f => ITEMS[f[0]]).map(([id, t, max, hp, sta]) => ({ id, name: ITEMS[id].name, t, max, hp, stamina: sta, icon: ITEMS[id].icon }));
    for (const [k, t] of sv.status || []) if (STATUS[k]) setStatus(k, { secs: t || null });
    for (const tb of sv.tombs || []) {
      const t = { x: tb.x, y: tb.y, z: tb.z, ry: tb.ry, name: tb.name, items: (tb.items || []).filter(a => ITEMS[a[2]]).map(([slot, i, id, n, dur]) => ({ slot, i, s: dur != null ? { id, n, dur } : { id, n } })) };
      if (t.items.length) { t.mesh = tombMesh(t); TOMBS.push(t); }
    }
    hud.lastHp = -1; hudDirty = true; emit('pins');
  });
  on('newworld', () => {
    clearAll();
    for (const d of DEFS) { d._sk = {}; d.lvl = 0; d.xp = 0; const s = ST(d); s.foods = []; d.hp = CFG.baseHp; d.food = 0; s.stamina = CFG.stamina; }
    setWeather('clear', 200); hud.lastHp = -1; hudDirty = true;
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
    rollStars: (e, n) => rollStars(e, n),
    hit: (e, dmg, type, src) => hitWithType(e, dmg, type, src),
    resist: resistOf,
    get maxHp() { return maxHp(); },
    get weight() { return weight; }, get maxWeight() { return maxCarry(); }, isOverloaded: () => overloaded,
    cfg: CFG,
    _skills: { gain: (id, n = 1) => gain(id, n), level, levelF, list: () => SKILL_LIST.map(([id, name]) => ({ id, name, level: level(id), progress: levelF(id) - level(id) })),
      open: () => openSkills(), drain: () => drainSkills() },
    _survival: {
      get weather() { return WX_.state; }, setWeather, get shelter() { return ENVS.shelter; }, get comfort() { return ENVS.comfort; }, get fire() { return ENVS.fire; },
      get tombstones() { return TOMBS.map(t => ({ x: t.x, y: t.y, z: t.z, name: t.name, items: t.items.length })); },
      pins: () => TOMBS.map(t => ({ kind: 'tombstone', label: 'Tombstone', x: t.x, z: t.z })),
      setStatus, clearStatus, hasStatus: has, setFreezing: v => { ENVS.freezing = !!v; },
      get weight() { return weight; }, maxWeight: maxCarry, isOverloaded: () => overloaded,
      openTomb: () => tryTomb(),
    },
    _tickStatus(dt) { for (const [k, v] of extra) if (v.t != null) { v.t -= dt; if (v.t <= 0) { extra.delete(k); statusDirty = true; } } },
  };
})();
on('frame', dt => Combat._tickStatus(dt));
// Skills and Survival: small public facades over the Combat closure (other modules guard with typeof)
const Skills = Combat._skills, Survival = Combat._survival;
