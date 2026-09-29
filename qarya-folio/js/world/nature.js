import * as THREE from 'three';
import { rng, makeGroundHeight, makeKeepOut, makeShore, swayMaterial, windUniforms, Layer } from './nature/util.js';
import { palmGeometry, shrubGeometry, grassGeometry, cactusGeometry, agaveGeometry, reedGeometry, lilyGeometry } from './nature/plants.js';
import { boulderGeometry, outcropGeometry, pebbleGeometry, bonesGeometry, driftwoodGeometry } from './nature/rocks.js';
import { createSky } from './nature/sky.js';
import { createWater } from './nature/water.js';
import { createDust } from './nature/dust.js';
import { createLife } from './nature/life.js';

// الطبيعة والأجواء: sky, light and haze; the oasis pond with its palm grove;
// palms, shrubs, rocks and bones across the dunes; blowing sand; birds,
// insects and the camel's footprints. Everything repeated is instanced, so
// the whole module is ~25 draw calls.

export function createNature(ctx) {
  const { scene, P, LAYOUT, mobile, physics } = ctx;
  const { oasis, village, bounds } = LAYOUT;
  const groundH = makeGroundHeight(ctx);
  const keepOut = makeKeepOut(ctx);
  const shore = makeShore(ctx, groundH);
  const rand = rng(20260929);
  const K = mobile ? 0.55 : 1; // density factor

  // Wind shared by the shaders, dust, clouds (and anyone who wants ctx.wind).
  const wind = { dir: new THREE.Vector2(1, -0.35).normalize(), strength: 0.6, gust: 0, baseAngle: Math.atan2(-0.35, 1) };
  ctx.wind = wind;
  let gustT = 4, gustPhase = 0, gustPeak = 0.8;

  const sky = createSky(ctx);
  createWater(ctx, groundH, shore);

  // ---------- instanced layers ----------
  const sway = swayMaterial();
  const sway2 = swayMaterial({ side: THREE.DoubleSide });
  const layers = [];
  const layer = (geo, mat, opts = {}) => { const l = new Layer(geo, mat.material, { depth: mat.depth, ...opts }); layers.push(l); return l; };

  const palms = [0, 1, 2].map((v) => {
    const g = palmGeometry(P, v);
    const l = layer(g.geometry, sway2, { name: 'palms-' + v });
    l.info = g;
    return l;
  });
  const shrubs = [0, 1].map((v) => layer(shrubGeometry(P, v), sway, { name: 'shrub-' + v }));
  const dryGrass = layer(grassGeometry(P, false), sway, { name: 'dry-grass', castShadow: false });
  const greenGrass = layer(grassGeometry(P, true), sway, { name: 'grass', castShadow: false });
  const flowers = layer(grassGeometry(P, true, true), sway, { name: 'flowers', castShadow: false });
  const cacti = [0, 1].map((v) => layer(cactusGeometry(P, v), sway, { name: 'cactus-' + v }));
  const agave = layer(agaveGeometry(P), sway, { name: 'agave' });
  const reeds = layer(reedGeometry(P), sway, { name: 'reeds' });
  const lilies = [false, true].map((f) => layer(lilyGeometry(P, f), sway, { name: 'lily', castShadow: false }));
  const boulders = [0, 1, 2].map((v) => layer(boulderGeometry(P, v), sway, { name: 'boulder-' + v }));
  const outcrops = [0, 1].map((v) => { const o = outcropGeometry(P, v); const l = layer(o.geometry, sway, { name: 'outcrop-' + v }); l.h = o.height; return l; });
  const pebbles = layer(pebbleGeometry(P), sway, { name: 'pebbles', castShadow: false });
  const bones = layer(bonesGeometry(), sway, { name: 'bones' });
  const drift = [0, 1].map((v) => layer(driftwoodGeometry(v), sway, { name: 'driftwood-' + v }));

  // ---------- placement ----------
  const taken = []; // {x,z,r} of big things so they don't overlap
  const free = (x, z, r) => { for (const t of taken) if (Math.hypot(x - t.x, z - t.z) < r + t.r) return false; return true; };
  const inPond = (x, z, pad = 0.3) => groundH(x, z) < oasis.water + pad;
  const dOasis = (x, z) => Math.hypot(x - oasis.x, z - oasis.z);
  const oasisZone = ctx.content.zones.find((z) => z.id === 'oasis');

  // Try `n` placements from sampler() that pass check(); returns count placed.
  function scatter(n, sampler, check, place, tries = 30) {
    let placed = 0;
    for (let i = 0; i < n; i++) {
      for (let k = 0; k < tries; k++) {
        const p = sampler();
        if (!p || !check(p.x, p.z)) continue;
        place(p.x, p.z, p);
        placed++;
        break;
      }
    }
    return placed;
  }
  const ring = (r0, r1, cx = 0, cz = 0) => () => {
    const a = rand() * Math.PI * 2, r = Math.sqrt(r0 * r0 + rand() * (r1 * r1 - r0 * r0));
    return { x: cx + Math.cos(a) * r, z: cz + Math.sin(a) * r, a, r };
  };
  const shoreRing = (d0, d1) => () => {
    const a = rand() * Math.PI * 2, r = shore.at(a) + d0 + rand() * (d1 - d0);
    return { x: oasis.x + Math.cos(a) * r, z: oasis.z + Math.sin(a) * r, a, r };
  };

  function placePalm(x, z, s = 0.85 + rand() * 0.4) {
    const v = Math.floor(rand() * 3);
    const y = groundH(x, z) - 0.1;
    palms[v].add(x, y, z, { yaw: rand() * Math.PI * 2, scale: s, collider: { type: 'cyl', r: 0.38 * s, h: 4 * s }, r: 1.6 });
    taken.push({ x, z, r: 2.6 });
  }
  const oasisOk = (x, z) => !inPond(x, z, 0.15) && dOasis(x, z) > 6 &&
    (!oasisZone || Math.hypot(x - oasisZone.x, z - oasisZone.z) > oasisZone.radius + 5);

  // The oasis grove: ~11 palms just back from the shore, leaning over the water.
  const grove = mobile ? 9 : 12;
  for (let i = 0; i < grove; i++) {
    const a0 = (i / grove) * Math.PI * 2 + rand() * 0.35;
    for (let k = 0; k < 12; k++) {
      const a = a0 + (rand() - 0.5) * 0.3, r = shore.at(a) + 1.2 + rand() * 3.5;
      const x = oasis.x + Math.cos(a) * r, z = oasis.z + Math.sin(a) * r;
      if (!oasisOk(x, z) || !free(x, z, 2.4) || !keepOut(x, z, 3, 2.5)) continue;
      // Face the lean toward the water: palm local +X leans, so yaw so +X points inward.
      const v = Math.floor(rand() * 3), s = 0.9 + rand() * 0.35;
      const inward = Math.atan2(-(oasis.z - z), oasis.x - x); // yaw mapping +X → inward
      palms[v].add(x, groundH(x, z) - 0.1, z, { yaw: inward + (rand() - 0.5) * 0.6, scale: s, collider: { type: 'cyl', r: 0.38 * s, h: 4 * s }, r: 1.6 });
      taken.push({ x, z, r: 2.6 });
      break;
    }
  }
  // A second, looser ring of palms further out.
  scatter(Math.round(8 * K), shoreRing(5, 12), (x, z) => oasisOk(x, z) && free(x, z, 2.8) && keepOut(x, z, 5, 3), (x, z) => placePalm(x, z));
  // Village palms (filtered later against buildings).
  scatter(Math.round(12 * K), ring(9, village.r - 3), (x, z) => free(x, z, 3) && keepOut(x, z, 6, 3.2) && dOasis(x, z) > oasis.r + 3, (x, z) => placePalm(x, z, 0.8 + rand() * 0.3));
  // Around the village edge and out on the dunes.
  scatter(Math.round(12 * K), ring(village.r - 2, village.r + 18), (x, z) => free(x, z, 3.5) && keepOut(x, z, 6, 3.2) && dOasis(x, z) > oasis.r + 4, (x, z) => placePalm(x, z));
  scatter(Math.round(6 * K), ring(village.r + 18, bounds - 6), (x, z) => free(x, z, 6) && dOasis(x, z) > oasis.r + 8, (x, z) => placePalm(x, z, 0.8 + rand() * 0.4));

  // Oasis shore: reeds in the shallows, grass and flowers on the bank, lily pads.
  scatter(Math.round(46 * K), shoreRing(-0.5, 0.6), (x, z) => groundH(x, z) > oasis.water - 0.35 && keepOut(x, z, 1, 1) && free(x, z, 0.3), (x, z) => {
    reeds.add(x, groundH(x, z) - 0.05, z, { yaw: rand() * 6.28, scale: 0.7 + rand() * 0.6 });
  });
  scatter(Math.round(70 * K), shoreRing(0.4, 6), (x, z) => !inPond(x, z, 0.05) && keepOut(x, z, 1.5, 1.5) && free(x, z, 0.4), (x, z) => {
    (rand() < 0.28 ? flowers : greenGrass).add(x, groundH(x, z) - 0.03, z, { yaw: rand() * 6.28, scale: 0.8 + rand() * 0.6 });
  });
  scatter(Math.round(16 * K), shoreRing(0.6, 5), (x, z) => !inPond(x, z, 0.1) && keepOut(x, z, 2, 2) && free(x, z, 1), (x, z) => {
    shrubs[0].add(x, groundH(x, z) - 0.05, z, { yaw: rand() * 6.28, scale: 0.8 + rand() * 0.5 });
  });
  const lilyN = Math.round(22 * K);
  for (let i = 0; i < lilyN; i++) {
    const a = rand() * Math.PI * 2, r = shore.at(a) * (0.55 + rand() * 0.35);
    const x = oasis.x + Math.cos(a) * r, z = oasis.z + Math.sin(a) * r;
    if (oasis.water - groundH(x, z) < 0.25 || dOasis(x, z) < 5) continue;
    lilies[rand() < 0.3 ? 1 : 0].add(x, oasis.water + 0.005, z, { yaw: rand() * 6.28, scale: 0.6 + rand() * 0.6 });
  }
  // Rocks at the waterline.
  scatter(Math.round(12 * K), shoreRing(-0.4, 1.2), (x, z) => keepOut(x, z, 2, 2) && free(x, z, 1.2), (x, z) => {
    const v = Math.floor(rand() * 3), s = 0.45 + rand() * 0.55;
    boulders[v].add(x, groundH(x, z) - 0.15 * s, z, { yaw: rand() * 6.28, scale: s, color: tint(), collider: s > 0.7 ? { type: 'sphere', r: 0.7 * s } : null, r: s });
    taken.push({ x, z, r: s + 0.3 });
  });

  function tint() { const l = 0.88 + rand() * 0.2; return new THREE.Color(l, l * (0.97 + rand() * 0.05), l * (0.94 + rand() * 0.06)); }

  // Dunes and village: rocks, outcrops, shrubs, dry grass, desert plants.
  const desert = (r0, r1) => ring(r0, r1);
  const notPondish = (x, z) => dOasis(x, z) > shore.max + 2;
  scatter(Math.round(36 * K), desert(village.r + 4, bounds + 12), (x, z) => notPondish(x, z) && free(x, z, 2) && keepOut(x, z, 6, 3), (x, z) => {
    const v = Math.floor(rand() * 3), s = 0.7 + rand() * 1.3;
    boulders[v].add(x, groundH(x, z) - 0.2 * s, z, { yaw: rand() * 6.28, scale: s, color: tint(), collider: s > 0.9 ? { type: 'sphere', r: 0.75 * s, dy: 0.1 * s } : null, r: s });
    taken.push({ x, z, r: s + 0.8 });
  });
  scatter(Math.round(10 * K), desert(village.r + 12, bounds + 18), (x, z) => notPondish(x, z) && free(x, z, 4) && keepOut(x, z, 8, 3), (x, z) => {
    const v = rand() < 0.5 ? 0 : 1, s = 0.9 + rand() * 0.8;
    outcrops[v].add(x, groundH(x, z) - 0.3, z, { yaw: rand() * 6.28, scale: s, color: tint(), collider: { type: 'box', w: 2.6 * s, h: outcrops[v].h * s, d: 2.2 * s }, r: 2.2 * s });
    taken.push({ x, z, r: 3 * s + 1 });
  });
  scatter(Math.round(10 * K), desert(12, village.r - 2), (x, z) => free(x, z, 1.5) && keepOut(x, z, 6, 3.2) && dOasis(x, z) > oasis.r + 3, (x, z) => {
    const v = Math.floor(rand() * 3), s = 0.4 + rand() * 0.4;
    boulders[v].add(x, groundH(x, z) - 0.15 * s, z, { yaw: rand() * 6.28, scale: s, color: tint(), r: s + 0.3 });
    taken.push({ x, z, r: s + 0.5 });
  });
  scatter(Math.round(70 * K), desert(village.r - 6, bounds + 10), (x, z) => notPondish(x, z) && free(x, z, 0.8) && keepOut(x, z, 4, 2.5), (x, z) => {
    shrubs[rand() < 0.4 ? 0 : 1].add(x, groundH(x, z) - 0.05, z, { yaw: rand() * 6.28, scale: 0.6 + rand() * 0.8, r: 0.8 });
  });
  scatter(Math.round(18 * K), desert(10, village.r - 3), (x, z) => free(x, z, 1.2) && keepOut(x, z, 5, 3) && dOasis(x, z) > oasis.r + 3, (x, z) => {
    shrubs[rand() < 0.6 ? 0 : 1].add(x, groundH(x, z) - 0.05, z, { yaw: rand() * 6.28, scale: 0.6 + rand() * 0.5, r: 0.8 });
  });
  scatter(Math.round(150 * K), desert(village.r - 10, bounds + 14), (x, z) => notPondish(x, z) && free(x, z, 0.4) && keepOut(x, z, 3, 2.2), (x, z) => {
    dryGrass.add(x, groundH(x, z) - 0.04, z, { yaw: rand() * 6.28, scale: 0.7 + rand() * 0.7, r: 0.4 });
  });
  scatter(Math.round(40 * K), desert(6, village.r - 4), (x, z) => free(x, z, 0.4) && keepOut(x, z, 3.5, 2.5) && dOasis(x, z) > oasis.r + 3, (x, z) => {
    dryGrass.add(x, groundH(x, z) - 0.04, z, { yaw: rand() * 6.28, scale: 0.6 + rand() * 0.5, r: 0.4 });
  });
  scatter(Math.round(14 * K), desert(village.r + 6, bounds + 5), (x, z) => notPondish(x, z) && free(x, z, 1.5) && keepOut(x, z, 6, 3), (x, z) => {
    const s = 0.8 + rand() * 0.5;
    cacti[rand() < 0.5 ? 0 : 1].add(x, groundH(x, z) - 0.1, z, { yaw: rand() * 6.28, scale: s, collider: { type: 'cyl', r: 0.3 * s, h: 2 * s }, r: 0.8 });
    taken.push({ x, z, r: 1.2 });
  });
  scatter(Math.round(20 * K), desert(village.r - 4, bounds + 5), (x, z) => notPondish(x, z) && free(x, z, 1) && keepOut(x, z, 5, 3), (x, z) => {
    agave.add(x, groundH(x, z) - 0.05, z, { yaw: rand() * 6.28, scale: 0.7 + rand() * 0.6, r: 0.8 });
    taken.push({ x, z, r: 0.9 });
  });
  scatter(Math.round(60 * K), desert(5, bounds + 15), (x, z) => !inPond(x, z) && free(x, z, 0.3) && keepOut(x, z, 2.5, 2), (x, z) => {
    pebbles.add(x, groundH(x, z) - 0.02, z, { yaw: rand() * 6.28, scale: 0.8 + rand() * 1.4, r: 0.4 });
  });
  scatter(mobile ? 3 : 5, desert(village.r + 10, bounds - 4), (x, z) => notPondish(x, z) && free(x, z, 3) && keepOut(x, z, 8, 3), (x, z) => {
    bones.add(x, groundH(x, z) - 0.06, z, { yaw: rand() * 6.28, scale: 0.9 + rand() * 0.3, r: 2.5 });
    taken.push({ x, z, r: 3 });
  });
  scatter(mobile ? 5 : 9, desert(village.r + 6, bounds + 4), (x, z) => free(x, z, 2) && keepOut(x, z, 6, 3), (x, z) => {
    drift[rand() < 0.5 ? 0 : 1].add(x, groundH(x, z) - 0.08, z, { yaw: rand() * 6.28, scale: 0.8 + rand() * 0.5, r: 2 });
    taken.push({ x, z, r: 2 });
  });

  for (const l of layers) l.build(scene);

  // ---------- sand ripples: one conforming merged mesh ----------
  buildRipples();
  function buildRipples() {
    const pos = [], col = [];
    const cHi = new THREE.Color('#fff2d2'), cLo = new THREE.Color('#b77e4c');
    const patches = Math.round(90 * K);
    const perp = new THREE.Vector2(-wind.dir.y, wind.dir.x); // ripples run across the wind
    for (let p = 0; p < patches; p++) {
      let cx, cz;
      for (let k = 0; k < 20; k++) {
        const a = rand() * Math.PI * 2, r = village.r + 2 + rand() * (bounds + 8 - village.r);
        cx = Math.cos(a) * r; cz = Math.sin(a) * r;
        if (dOasis(cx, cz) > shore.max + 6 && free(cx, cz, 1.5)) break;
        cx = undefined;
      }
      if (cx === undefined) continue;
      const lines = 4 + Math.floor(rand() * 4), len = 3 + rand() * 4, gap = 0.5 + rand() * 0.2;
      const turn = (rand() - 0.5) * 0.5;
      const ax = perp.x * Math.cos(turn) - perp.y * Math.sin(turn), az = perp.x * Math.sin(turn) + perp.y * Math.cos(turn);
      const nx = -az, nz = ax; // across the lines
      for (let l = 0; l < lines; l++) {
        const off = (l - lines / 2) * gap;
        const L = len * (0.6 + 0.4 * Math.sin(((l + 0.5) / lines) * Math.PI));
        const segs = 8;
        for (const band of [0, 1]) {
          const w0 = band ? 0.0 : -0.1, w1 = band ? 0.08 : 0.0;
          const c = band ? cHi : cLo;
          for (let s = 0; s < segs; s++) {
            const pts = [];
            for (const u of [s / segs, (s + 1) / segs]) {
              const along = (u - 0.5) * L;
              const wav = Math.sin(u * Math.PI * 2 + l) * 0.18;
              const taper = Math.sin(u * Math.PI);
              for (const w of [w0 * taper, w1 * taper]) {
                const x = cx + ax * along + nx * (off + wav + w), z = cz + az * along + nz * (off + wav + w);
                pts.push([x, groundH(x, z) + 0.035, z]);
              }
            }
            // pts: [u0w0, u0w1, u1w0, u1w1]
            const [a, b, c2, d] = pts;
            pos.push(...a, ...b, ...c2, ...b, ...d, ...c2);
            for (let k = 0; k < 6; k++) col.push(c.r, c.g, c.b);
          }
        }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.computeVertexNormals();
    const mesh = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, transparent: true, opacity: 0.42, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
    mesh.receiveShadow = true;
    mesh.renderOrder = 1;
    mesh.name = 'sand-ripples';
    scene.add(mesh);
  }

  const dust = createDust(ctx, groundH);
  const life = createLife(ctx, groundH, shore);

  // ---------- after the village exists: drop anything inside buildings, add colliders ----------
  let settled = false;
  function settle() {
    settled = true;
    const probe = new THREE.Vector3();
    const blocked = (x, z, r) => {
      const offs = [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r]];
      for (const [ox, oz] of offs) {
        const gx = x + ox, gz = z + oz;
        const top = ctx.heightAt(gx, gz) + 30;
        const d = physics.rayDown(probe.set(gx, top, gz), 34);
        if (d < 30 - 0.6) return true;
      }
      return false;
    };
    for (const l of layers) {
      l.items.forEach((it, i) => {
        if (Math.hypot(it.x, it.z) < village.r + 6 && blocked(it.x, it.z, Math.min(it.r, 1.6))) l.hide(i);
      });
    }
    for (const l of layers) {
      for (const it of l.items) {
        if (!it.alive || !it.collider) continue;
        const c = it.collider;
        if (c.type === 'cyl') physics.addCylinder({ radius: c.r, height: c.h, position: [it.x, it.y + c.h / 2, it.z], kind: 'wood' });
        else if (c.type === 'sphere') physics.addSphere({ radius: c.r, position: [it.x, it.y + (c.dy || 0), it.z] });
        else if (c.type === 'box') physics.addBox({ size: [c.w, c.h, c.d], position: [it.x, it.y + c.h / 2, it.z], rotationY: it.yaw });
      }
    }
  }

  return {
    update(dt, t) {
      if (!settled) settle();

      // Gusts: every so often the wind rises, holds, and falls away.
      if (gustPhase === 0 && (gustT -= dt) <= 0) { gustPhase = 1; gustPeak = 0.55 + Math.random() * 0.45; }
      if (gustPhase === 1) { wind.gust = Math.min(gustPeak, wind.gust + dt * 0.5); if (wind.gust >= gustPeak) { gustPhase = 2; gustT = 2 + Math.random() * 2.5; } }
      else if (gustPhase === 2) { if ((gustT -= dt) <= 0) gustPhase = 3; }
      else if (gustPhase === 3) { wind.gust = Math.max(0, wind.gust - dt * 0.3); if (wind.gust <= 0) { gustPhase = 0; gustT = 6 + Math.random() * 9; } }
      wind.strength = 0.55 + Math.sin(t * 0.23) * 0.15 + Math.sin(t * 0.61) * 0.08;
      const ang = wind.baseAngle + Math.sin(t * 0.05) * 0.25;
      wind.dir.set(Math.cos(ang), Math.sin(ang));
      windUniforms.uTime.value = t;
      windUniforms.uWind.value.set(wind.dir.x, wind.dir.y, wind.strength, wind.gust);

      sky.update(dt, t, wind);
      dust.update(dt, t, wind);
      life.update(dt, t);
    },
  };
}
