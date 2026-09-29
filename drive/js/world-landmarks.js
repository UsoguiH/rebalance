// world-landmarks.js - the five zone landmarks (all procedural, vertex-coloured, merged per landmark).
//   about      = Bedouin majlis tent          projects   = gallery of stone archways + mashrabiya wall
//   skills     = oasis (pool, palms, tiles)   experience = stepped caravanserai tower with flags
//   contact    = minaret + campfire
import * as THREE from 'three';
import { GeoBuilder, xf, archSlabGeometry } from './world-util.js';
import { makeMashrabiyaTexture, makeTileAtlas, whenFontsReady } from './world-textures.js';

const C = (h) => new THREE.Color(h);
const SAND = 0xd9b27c, SANDSTONE = 0xcfa06a, DARK = 0x2b2233, TERRA = 0xc8553d, TEAL = 0x0f7c86, GOLD = 0xe0a458, CREAM = 0xf3e2c0, WOOD = 0x6b4630, RED = 0x8f2d2a;

function stripes(a, b, n) {
  const ca = C(a), cb = C(b);
  return (p, nn, out) => out.copy(Math.floor(((Math.atan2(p.z, p.x) + Math.PI) / (Math.PI * 2)) * n) % 2 ? ca : cb);
}
/** vertical brick-ish banding for sandstone: alternates subtly by height */
function bands(a, b, step = 0.9) {
  const ca = C(a), cb = C(b);
  return (p, nn, out) => out.copy(Math.floor(p.y / step) % 2 ? ca : cb);
}
function glowGeo(r, color, ws = 10, hs = 8) {
  const g = new THREE.SphereGeometry(r, ws, hs);
  const c = C(color), n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return g;
}

export function buildLandmarks(ctx, { group, zones, mats }) {
  const { heightAt, colliders, quality } = ctx;
  const low = quality === 'low';
  const tickers = [];   // per-frame fns for setNight-aware flicker
  let night = 0;
  const byId = Object.fromEntries(zones.map((z) => [z.id, z]));

  function frame(zone) {
    const l = zone.layout;
    const g = new THREE.Group(); g.name = 'landmark:' + zone.id;
    g.position.set(l.lx, zone.y, l.lz); g.rotation.y = l.yaw;
    group.add(g);
    const cy = Math.cos(l.yaw), sy = Math.sin(l.yaw);
    const W = (x, z) => ({ x: l.lx + x * cy + z * sy, z: l.lz - x * sy + z * cy });
    return {
      g, zone, W,
      box(x, z, hx, hz, rot = 0) { const w = W(x, z); colliders.push({ type: 'box', x: w.x, z: w.z, hx, hz, rot: l.yaw + rot }); },
      circle(x, z, r) { const w = W(x, z); colliders.push({ type: 'circle', x: w.x, z: w.z, r }); },
    };
  }
  const builders = () => ({
    std: new GeoBuilder({ ao: 0.45, jitter: 0.05 }),
    cloth: new GeoBuilder({ ao: 0.0, jitter: 0.03 }),
    glow: new GeoBuilder({ ao: 0, jitter: 0 }),
  });
  function commit(f, b) {
    const mk = (gb, mat, cast) => { const m = new THREE.Mesh(gb.build(), mat); m.castShadow = cast; m.receiveShadow = true; f.g.add(m); return m; };
    if (b.std.p.length) mk(b.std, mats.std, true);
    if (b.cloth.p.length) mk(b.cloth, mats.cloth, true);
    if (b.glow.p.length) { const m = mk(b.glow, mats.glow, false); m.castShadow = false; m.receiveShadow = false; }
  }
  const addGlowMesh = (f, r, color, x, y, z) => {
    const m = new THREE.Mesh(glowGeo(r, color), mats.glow); m.position.set(x, y, z); f.g.add(m); return m;
  };
  const sign = (f, w, h, y, z, sub) => ctx.addSign({ text: f.zone.title, color: f.zone.color, w, h, x: 0, y, z, parent: f.g, yaw: 0, sub });

  // ======================================================================= about: majlis tent
  {
    const f = frame(byId.about); const b = builders();
    // rug (layered thin boxes)
    b.std.box(9, 0.05, 7, 0, 0.0, 0.5, RED);
    b.std.box(8.2, 0.05, 6.2, 0, 0.03, 0.5, CREAM);
    b.std.box(7.6, 0.05, 5.6, 0, 0.06, 0.5, TEAL);
    b.std.box(6.4, 0.05, 4.4, 0, 0.09, 0.5, TERRA);
    b.std.box(4.2, 0.05, 2.6, 0, 0.12, 0.5, GOLD);
    b.std.box(1.8, 0.05, 1.0, 0, 0.15, 0.5, DARK);
    // back + side walls (cloth)
    const wallC = stripes(CREAM, TERRA, 1);
    b.cloth.box(12.2, 3.2, 0.25, 0, 0, -6, CREAM);
    b.cloth.box(0.25, 3.2, 8.2, -6, 0, -1.9, CREAM);
    b.cloth.box(0.25, 3.2, 8.2, 6, 0, -1.9, CREAM);
    b.cloth.box(12.2, 0.5, 0.3, 0, 3.0, -6, TERRA);
    // striped pyramid roof
    b.cloth.add(new THREE.ConeGeometry(8.7, 4.2, 4, 1, true), xf(0, 3.2 + 2.1, -1.9, 0, Math.PI / 4, 0), stripes(TERRA, CREAM, 16));
    b.cloth.add(new THREE.ConeGeometry(3.4, 1.2, 4, 1, true), xf(0, 7.4 + 0.6 - 0.2, -1.9, 0, Math.PI / 4, 0), stripes(TEAL, GOLD, 8));
    // front awning
    b.cloth.add(new THREE.BoxGeometry(12.6, 0.16, 2.4), xf(0, 3.55, 3.15, 0.18, 0, 0), stripes(TERRA, CREAM, 2));
    // poles
    for (const [x, z, h] of [[-6, 2.2, 3.7], [6, 2.2, 3.7], [-6, -6, 3.4], [6, -6, 3.4]]) b.std.cyl(0.16, 0.2, h, 6, x, 0, z, WOOD);
    b.std.cyl(0.1, 0.14, 4.2, 6, 0, 7.0, -1.9, WOOD);
    // cushions & low table & coffee set
    const cushions = [[-3.4, -4.6, 0], [-1.1, -4.9, 0.1], [1.1, -4.9, -0.1], [3.4, -4.6, 0], [-4.8, -2.4, 1.5], [4.8, -2.4, -1.5]];
    cushions.forEach(([x, z, ry], i) => b.cloth.box(1.5, 0.45, 1.1, x, 0.1, z, [TEAL, TERRA, GOLD, RED][i % 4], ry));
    b.std.cyl(0.9, 0.9, 0.45, 12, 0, 0.16, 0.4, WOOD);
    b.std.cyl(0.95, 0.95, 0.06, 12, 0, 0.6, 0.4, GOLD);
    b.std.cyl(0.13, 0.2, 0.5, 8, 0.25, 0.66, 0.35, GOLD); b.std.cyl(0.05, 0.1, 0.22, 8, 0.25, 1.14, 0.35, GOLD);
    for (const dx of [-0.5, -0.75]) b.std.cyl(0.07, 0.06, 0.13, 8, dx, 0.66, 0.5, CREAM);
    // fire pit with stones
    for (let i = 0; i < 9; i++) { const a = (i / 9) * 6.283; b.std.sph(0.3, 7.6 + Math.cos(a) * 0.9, 0.15, 3.2 + Math.sin(a) * 0.9, 0x7a6a5a, 1, 0.7, 1, 6, 4); }
    b.glow.cone(0.5, 1.0, 6, 7.6, 0.1, 3.2, 0xff8a2a);
    b.glow.cone(0.3, 1.5, 6, 7.6, 0.1, 3.2, 0xffd166);
    // hanging lantern + floor lanterns
    b.glow.sph(0.32, 0, 4.3, -1.9, 0xffc46b, 1, 1.25, 1, 10, 8);
    b.std.cyl(0.02, 0.02, 2.6, 4, 0, 4.6, -1.9, DARK);
    for (const [x, z] of [[-4.6, 0.4], [4.6, 0.4]]) { b.std.cyl(0.18, 0.22, 0.12, 8, x, 0, z, DARK); b.glow.sph(0.24, x, 0.34, z, 0xffc46b, 1, 1.3, 1, 8, 6); }
    commit(f, b);
    sign(f, 8.2, 3.1, 10.4, 1.5);
    f.box(0, -6, 6.1, 0.25); f.box(-6, -1.9, 0.25, 4.1); f.box(6, -1.9, 0.25, 4.1);
    f.circle(7.6, 3.2, 1.3);
    for (const [x, z] of [[-6, 2.2], [6, 2.2]]) f.circle(x, z, 0.28);
    // lamp flicker
    const lamp = addGlowMesh(f, 0.01, 0xffffff, 0, 0, 0); lamp.visible = false;
    tickers.push((t) => { const s = 1 + Math.sin(t * 9) * 0.05 + Math.sin(t * 23) * 0.03; lamp.scale.setScalar(s); });
  }

  // ======================================================================= projects: arch gallery
  {
    const f = frame(byId.projects); const b = builders();
    const archGeo = archSlabGeometry({ w: 5.4, h: 6.6, openW: 3.2, openH: 5.2, straight: 3.0, depth: 1.2 });
    const zs = [3.5, -3.5, -10.5];
    zs.forEach((z, i) => {
      b.std.add(archGeo, xf(0, 0, z), bands(SANDSTONE, 0xc79358, 1.1));
      b.std.box(6.4, 0.5, 1.7, 0, 6.6, z, 0xc79358);           // cornice
      b.glow.box(6.5, 0.12, 1.8, 0, 6.55, z, C(byId.projects.color).multiplyScalar(0.85));
      b.std.box(6.0, 0.5, 1.7, 0, -0.05, z, 0xb08454);         // plinth
      f.box(-2.15, z, 0.6, 0.62); f.box(2.15, z, 0.6, 0.62);
    });
    // mashrabiya wall at the end
    b.std.box(11, 7.4, 0.5, 0, 0, -15, DARK);
    b.std.box(11.6, 0.6, 0.9, 0, 7.4, -15, 0xc79358);
    f.box(0, -15, 5.6, 0.5);
    // side walls to funnel visitors through the gallery
    for (const s of [-1, 1]) { b.std.box(0.6, 3.2, 20, s * 5.6, 0, -6.5, SANDSTONE); f.box(s * 5.6, -6.5, 0.4, 10); }
    commit(f, b);
    const lat = makeMashrabiyaTexture(); lat.repeat.set(2.4, 1.6); lat.wrapS = lat.wrapT = THREE.RepeatWrapping;
    const latMat = new THREE.MeshBasicMaterial({ map: lat, color: C(byId.projects.color), transparent: true, alphaTest: 0.35, side: THREE.DoubleSide });
    const lattice = new THREE.Mesh(new THREE.PlaneGeometry(10.2, 6.6), latMat);
    lattice.position.set(0, 3.8, -14.68); f.g.add(lattice);
    // floating lanterns
    const lanterns = [];
    zs.forEach((z, i) => {
      for (const s of [-1, 1]) {
        const m = addGlowMesh(f, 0.38, i % 2 ? 0xffc46b : C(byId.projects.color).getHex(), s * 1.25, 4.4 + i * 0.25, z + 3.5 - 0);
        m.scale.set(1, 1.35, 1);
        lanterns.push({ m, y0: m.position.y, ph: i * 1.7 + s });
      }
    });
    tickers.push((t) => { for (const l of lanterns) l.m.position.y = l.y0 + Math.sin(t * 1.3 + l.ph) * 0.22; latMat.color.setScalar(1 + night * 0.4).multiply(C(byId.projects.color)); });
    sign(f, 8.6, 3.2, 10.2, 5.5);
  }

  // ======================================================================= skills: oasis
  {
    const f = frame(byId.skills); const b = builders();
    const poolY = heightAt(byId.skills.layout.lx, byId.skills.layout.lz) - byId.skills.y + 0.42;
    // water
    const water = new THREE.Mesh(new THREE.CircleGeometry(6, 48), new THREE.ShaderMaterial({
      uniforms: { uTime: ctx.uniforms.uTime, uNight: ctx.uniforms.uNight },
      transparent: true, depthWrite: false, fog: false,
      vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: `varying vec2 vP; uniform float uTime, uNight;
        void main(){ float d = length(vP)/6.0;
          float rip = sin(d*38.0 - uTime*2.2)*0.5+0.5; float rip2 = sin((vP.x+vP.y)*3.0 + uTime*1.3)*sin((vP.x-vP.y)*2.6 - uTime)*0.5+0.5;
          vec3 deep = vec3(0.04,0.36,0.44), shallow = vec3(0.32,0.78,0.72);
          vec3 c = mix(deep, shallow, smoothstep(0.2,1.0,d)*0.8 + rip2*0.15);
          c += vec3(0.75,0.92,0.9)*pow(rip,10.0)*0.25*(1.0-d);
          c *= 1.0 + uNight*0.35;
          float a = smoothstep(1.0,0.9,d)*0.92;
          gl_FragColor = vec4(c, a);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    }));
    water.rotation.x = -Math.PI / 2; water.position.set(0, poolY, 0); water.renderOrder = 1; f.g.add(water);
    // stone rim
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * 6.283, r = 6.2 + (i % 3) * 0.12;
      b.std.sph(0.5 + (i % 4) * 0.08, Math.cos(a) * r, poolY - 0.3, Math.sin(a) * r, i % 2 ? 0x9c8a74 : 0x8a7a66, 1.2, 0.7, 1, 6, 4);
    }
    // reeds + lilies
    for (let i = 0; i < 16; i++) {
      const a = 0.4 + (i / 16) * 4.8, r = 5.4 + (i % 3) * 0.2;
      b.std.cone(0.06, 1.4 + (i % 4) * 0.25, 4, Math.cos(a) * r, poolY, Math.sin(a) * r, 0x5c8a3a);
    }
    for (let i = 0; i < 7; i++) { const a = i * 2.1, r = 1 + (i % 4) * 1.1; b.std.cyl(0.42, 0.42, 0.04, 8, Math.cos(a) * r, poolY, Math.sin(a) * r, 0x3f8a4a); b.glow.sph(0.1, Math.cos(a) * r, poolY + 0.08, Math.sin(a) * r, 0xffb3d1, 1, 0.6, 1, 5, 4); }
    // seat stones + small shade shelter
    b.std.box(2.8, 0.4, 0.9, -8.5, 0, 3, SANDSTONE, 0.4); b.std.box(2.8, 0.4, 0.9, 8.5, 0, 3, SANDSTONE, -0.4);
    commit(f, b);
    // palms: registered for decor's instanced palms (world coords)
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * 6.283 + 0.35, r = 8.6 + (i % 2) * 1.2;
      if (Math.sin(a) > 0.55) continue;                          // keep the entrance side open
      const w = f.W(Math.cos(a) * r, Math.sin(a) * r);
      ctx.palmList.push({ x: w.x, z: w.z, s: 1.05 + (i % 3) * 0.14, lean: 0.35 + (i % 4) * 0.1, yaw: a });
    }
    // floating calligraphy tiles
    const words = ['برمجة', 'تصميم', 'ثلاثي الأبعاد', 'واجهات', 'حركة', 'صوت', 'أداء', 'ويب'];
    const atlas = makeTileAtlas(words, byId.skills.color, 4, 2);
    ctx.texRedraws.push(atlas.draw);
    whenFontsReady(() => atlas.draw());
    const ring = new THREE.Group(); ring.position.set(0, 0, 0); f.g.add(ring);
    const tileMat = new THREE.MeshBasicMaterial({ map: atlas.texture, alphaTest: 0.4, side: THREE.DoubleSide });
    const tiles = [];
    for (let i = 0; i < 8; i++) {
      const col = i % 4, row = Math.floor(i / 4);
      const geo = new THREE.PlaneGeometry(2.6, 1.6);
      const uv = geo.attributes.uv;
      for (let k = 0; k < uv.count; k++) uv.setXY(k, (col + uv.getX(k)) / 4, 1 - (row + 1 - uv.getY(k)) / 2);
      const m = new THREE.Mesh(geo, tileMat);
      const a = (i / 8) * 6.283, R = 10.5;
      m.position.set(Math.cos(a) * R, 3.4 + (i % 2) * 0.9, Math.sin(a) * R);
      m.rotation.y = Math.PI / 2 - a;
      ring.add(m); tiles.push({ m, y0: m.position.y, ph: i });
    }
    tickers.push((t) => { ring.rotation.y = t * 0.06; for (const q of tiles) q.m.position.y = q.y0 + Math.sin(t * 1.1 + q.ph) * 0.25; });
    f.circle(0, 0, 5.8);
    sign(f, 7.6, 2.9, 7.4, 8.5);
  }

  // ======================================================================= experience: caravanserai tower
  {
    const f = frame(byId.experience); const b = builders();
    const tiers = [[9.4, 3.4], [7.8, 3.2], [6.2, 3.0], [4.6, 2.8]];
    let y = 0;
    const crenel = (w, y0, col, zc = -4) => {
      const n = Math.round(w / 1.1);
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n * w - w / 2;
        for (const [x, z] of [[t, w / 2], [t, -w / 2], [w / 2, t], [-w / 2, t]]) b.std.box(0.55, 0.6, 0.55, x, y0, z + zc, col);
      }
    };
    tiers.forEach(([w, h], i) => {
      b.std.box(w, h, w, 0, y, -4, bands(SANDSTONE, 0xc99a63, 1.0));
      b.std.box(w + 0.5, 0.4, w + 0.5, 0, y + h, -4, 0xb98a55);
      crenel(w + 0.3, y + h + 0.4, i % 2 ? 0xc99a63 : SANDSTONE);
      // window slits
      for (const s of [-1, 1]) b.std.box(0.5, 1.2, 0.12, s * w * 0.22, y + h * 0.45, -4 + w / 2 + 0.03, DARK);
      y += h + 0.4;
    });
    // door: dark box with arched top
    b.std.box(2.6, 2.9, 0.4, 0, 0, -4 + 4.7, DARK);
    b.std.add(new THREE.CylinderGeometry(1.3, 1.3, 0.4, 14), xf(0, 2.9, -4 + 4.7, Math.PI / 2, 0, 0), DARK);
    b.glow.box(2.0, 0.12, 0.1, 0, 3.75, -4 + 4.95, GOLD);
    // top lantern room + dome
    b.std.cyl(1.0, 1.1, 1.5, 10, 0, y, -4, CREAM);
    b.std.sph(1.25, 0, y + 1.5, -4, TEAL, 1, 0.9, 1, 12, 8);
    b.std.cone(0.08, 1.2, 5, 0, y + 2.5, -4, GOLD);
    b.glow.sph(0.35, 0, y + 0.8, -4, 0xffd166, 1, 1.2, 1, 8, 6);
    // courtyard walls with crenels
    for (const s of [-1, 1]) {
      b.std.box(0.9, 2.6, 11, s * 7.5, 0, 1.2, SANDSTONE);
      for (let i = 0; i < 8; i++) b.std.box(0.9, 0.55, 0.6, s * 7.5, 2.6, -3.6 + i * 1.5, 0xc99a63);
    }
    // camel-hitching posts & barrels in the forecourt
    for (const s of [-1, 1]) { b.std.cyl(0.14, 0.14, 1.5, 6, s * 3.4, 0, 3.8, WOOD); b.std.box(0.8, 0.14, 0.14, s * 3.4, 1.3, 3.8, WOOD); }
    commit(f, b);
    f.box(0, -4, 4.8, 4.8);
    for (const s of [-1, 1]) f.box(s * 7.5, 1.2, 0.55, 5.6);
    // flags on poles
    const flags = [];
    const flagCols = [byId.experience.color, '#f3e2c0', '#0f7c86', '#e0a458'];
    [[-4.4, -4, 0], [4.4, -4, 1], [-7.5, 5.2, 2], [7.5, 5.2, 3]].forEach(([x, z, k]) => {
      const top = k < 2 ? y - 0.6 : 3.6;
      const poleB = new GeoBuilder({ ao: 0, jitter: 0 });
      poleB.cyl(0.07, 0.09, k < 2 ? 3.6 : 3.4, 5, x, k < 2 ? y - 0.9 : 2.6, z, WOOD);
      const pm = new THREE.Mesh(poleB.build(), mats.std); pm.castShadow = true; f.g.add(pm);
      const geo = new THREE.PlaneGeometry(2.3, 1.3, 10, 4); geo.translate(1.15, 0, 0);
      const n = geo.attributes.position.count, col = new Float32Array(n * 3);
      const c1 = C(flagCols[k]), c2 = C(flagCols[(k + 1) % 4]);
      for (let i = 0; i < n; i++) { const c = geo.attributes.position.getY(i) > 0 ? c1 : c2; col.set([c.r, c.g, c.b], i * 3); }
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const base = geo.attributes.position.array.slice();
      const fm = new THREE.Mesh(geo, mats.cloth); fm.position.set(x, top + 2.2, z); fm.castShadow = false; f.g.add(fm);
      flags.push({ fm, base, ph: k * 1.3 });
    });
    tickers.push((t) => {
      for (const fl of flags) {
        const pa = fl.fm.geometry.attributes.position, a = pa.array;
        for (let i = 0; i < a.length; i += 3) {
          const x = fl.base[i], w = x / 2.3;
          a[i + 2] = Math.sin(x * 2.6 - t * 5 + fl.ph) * 0.22 * w;
          a[i + 1] = fl.base[i + 1] + Math.sin(x * 2 - t * 4 + fl.ph) * 0.06 * w;
        }
        pa.needsUpdate = true;
      }
    });
    sign(f, 8.4, 3.1, 8.6, 6.8);
  }

  // ======================================================================= contact: minaret + campfire
  {
    const f = frame(byId.contact); const b = builders();
    const mz = -6;
    b.std.cyl(2.7, 3.0, 1.2, 12, 0, 0, mz, 0xb98a55);
    b.std.cyl(2.3, 2.6, 3.6, 12, 0, 1.2, mz, bands(SANDSTONE, 0xc99a63, 0.8));
    b.std.cyl(1.35, 2.1, 13.5, 12, 0, 4.8, mz, bands(0xe9d2a6, 0xdcc08e, 1.1));
    for (const yy of [6.4, 9.8, 13.2]) b.glow.cyl(1.36 - (yy - 4.8) * 0.04, 1.36 - (yy - 4.8) * 0.04, 0.16, 12, 0, yy, mz, C(byId.contact.color).multiplyScalar(0.9));
    b.std.cyl(1.9, 1.6, 0.6, 12, 0, 18.3, mz, TEAL);
    b.std.cyl(1.85, 1.85, 0.12, 12, 0, 18.9, mz, GOLD);
    for (let i = 0; i < 12; i++) { const a = (i / 12) * 6.283; b.std.cyl(0.05, 0.05, 0.9, 4, Math.cos(a) * 1.75, 19.0, mz + Math.sin(a) * 1.75, GOLD); }
    b.std.cyl(1.05, 1.2, 2.6, 12, 0, 19.0, mz, CREAM);
    b.std.sph(1.25, 0, 21.6, mz, TEAL, 1, 1.05, 1, 14, 10);
    b.std.cone(0.12, 1.6, 6, 0, 22.7, mz, GOLD);
    b.glow.sph(0.3, 0, 24.6, mz, 0xffd166, 1, 1, 1, 8, 6);
    for (let i = 0; i < 4; i++) { const a = (i / 4) * 6.283 + 0.785; b.std.box(0.5, 1.2, 0.2, Math.cos(a) * 1.1, 19.6, mz + Math.sin(a) * 1.1, DARK, -a + Math.PI / 2); }
    for (const yy of [4, 8, 11.5, 15]) b.std.box(0.35, 1.1, 0.1, 0, yy, mz + 1.55 - (yy - 4.8) * 0.04, DARK);
    // campfire
    const fx = 0, fz = 4.5;
    for (let i = 0; i < 10; i++) { const a = (i / 10) * 6.283; b.std.sph(0.36, fx + Math.cos(a) * 1.15, 0.2, fz + Math.sin(a) * 1.15, i % 2 ? 0x807060 : 0x6e6050, 1, 0.75, 1, 6, 4); }
    for (let i = 0; i < 5; i++) { const a = (i / 5) * 6.283 + 0.3; b.std.tube(fx + Math.cos(a) * 0.9, 0.12, fz + Math.sin(a) * 0.9, fx - Math.cos(a) * 0.2, 0.6, fz - Math.sin(a) * 0.2, 0.13, 0x4a3020, 5); }
    // log seats
    for (let i = 0; i < 4; i++) {
      const a = 0.8 + i * 1.5, r = 3.6;
      b.std.cyl(0.42, 0.42, 0.55, 8, fx + Math.cos(a) * r, 0, fz + Math.sin(a) * r, 0x6b4630);
      b.cloth.box(0.9, 0.12, 0.9, fx + Math.cos(a) * r, 0.55, fz + Math.sin(a) * r, [TERRA, TEAL, GOLD, RED][i], a);
    }
    // string lights from minaret base to fire
    for (let i = 0; i < 9; i++) { const t = i / 8; b.glow.sph(0.13, -3.2 + t * 6.4, 3.6 - Math.sin(t * Math.PI) * 0.8 + 0, 0.5 + Math.sin(t * Math.PI) * 0.0, i % 2 ? 0xffd166 : C(byId.contact.color).getHex(), 1, 1, 1, 5, 4); }
    b.std.cyl(0.07, 0.09, 3.7, 5, -3.2, 0, 0.5, WOOD); b.std.cyl(0.07, 0.09, 3.7, 5, 3.2, 0, 0.5, WOOD);
    commit(f, b);
    // flames (animated)
    const flameMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.94, depthWrite: false });
    const fl = [];
    [[0.55, 1.5, 0xff7a20, 0], [0.4, 1.9, 0xffb03a, 1], [0.26, 1.4, 0xffe27a, 2]].forEach(([r, h, col, k]) => {
      const g = new THREE.ConeGeometry(r, h, 7, 1, false); g.translate(0, h / 2, 0);
      const c = C(col), n = g.attributes.position.count, a = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3);
      g.setAttribute('color', new THREE.BufferAttribute(a, 3));
      const m = new THREE.Mesh(g, flameMat); m.position.set(fx, 0.35, fz); f.g.add(m); fl.push({ m, k });
    });
    tickers.push((t) => { for (const q of fl) { const s = 1 + Math.sin(t * (9 + q.k * 3) + q.k) * 0.13 + Math.sin(t * 21 + q.k * 2) * 0.07; q.m.scale.set(1 + (s - 1) * 0.6, s + night * 0.12, 1 + (s - 1) * 0.6); q.m.rotation.y = t * (1 + q.k); } });
    // embers rising
    const N = low ? 14 : 30; const ep = new Float32Array(N * 3), es = new Float32Array(N);
    for (let i = 0; i < N; i++) es[i] = ctx.rng();
    const eg = new THREE.BufferGeometry(); eg.setAttribute('position', new THREE.BufferAttribute(ep, 3));
    const embers = new THREE.Points(eg, new THREE.PointsMaterial({ color: 0xffb347, size: 0.16, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    embers.frustumCulled = false; f.g.add(embers);
    tickers.push((t) => {
      for (let i = 0; i < N; i++) {
        const p = (t * (0.25 + es[i] * 0.3) + es[i] * 9) % 1;
        ep[i * 3] = fx + Math.sin(es[i] * 40 + t * 0.7) * 0.5 * (0.4 + p); ep[i * 3 + 1] = 0.8 + p * 4.5; ep[i * 3 + 2] = fz + Math.cos(es[i] * 31 + t * 0.6) * 0.5 * (0.4 + p);
      }
      eg.attributes.position.needsUpdate = true;
    });
    f.circle(0, mz, 3.0); f.circle(fx, fz, 1.5);
    f.circle(-3.2, 0.5, 0.25); f.circle(3.2, 0.5, 0.25);
    sign(f, 8.8, 3.3, 9.4, 1.2);
  }

  // one shared updater for animated bits (added to the zones' updaters list)
  ctx.updaters.push((dt, time) => { for (const fn of tickers) fn(time); });

  return { setNight(n) { night = n; } };
}
