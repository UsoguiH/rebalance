// Sunsprings, CA: buildings and landmarks. Downtown brick main street, the freestanding
// clock tower roundabout, the courthouse with its cupola, gothic church, water tower,
// hospital with helipad, Bruner's Foodsource (drive-in garage), gas station, diner, the
// high school football stadium (bleachers you can drive up), East High's concrete pylons,
// suburbs, radar dishes on the ridge, wind farm and power lines on the hills.
import * as THREE from 'three';
import { rng, lerp } from './core.js';
import { mat } from './geo.js';
import {
  facadeTex, storefrontTex, signTex, clockTex, roofTex, shingleTex, concreteTex, canvas, toTex, grime, bricks, cached, fieldTex,
} from './textures.js';
import { BLOCKS, CURB, SIDEWALK, ROUNDABOUT, RADAR_SITE, terrainH, outside } from './world.js';

const STYLES = [
  { name: 'brickRed', kind: 'brick', color: '#8c3f2c', trim: '#d9cdb5' },
  { name: 'brickBrown', kind: 'brick', color: '#6f4632', trim: '#cbbd9e' },
  { name: 'brickTan', kind: 'brick', color: '#a77d58', trim: '#e2d6bd', arch: true },
  { name: 'brickDark', kind: 'brick', color: '#5b3426', trim: '#bfae8e', arch: true },
  { name: 'stuccoCream', kind: 'stucco', color: '#c7b28c', trim: '#7d5a3c' },
  { name: 'stuccoGray', kind: 'stucco', color: '#a19a8c', trim: '#ece4d2' },
  { name: 'paintGreen', kind: 'stucco', color: '#6b7556', trim: '#e0d7c0' },
];

export function buildTown(world, batch, paint) {
  const r = rng(77);
  const mats = {};
  const std = (o) => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0, ...o });
  const K = (key, make) => {
    if (!mats[key]) {
      mats[key] = make();
      batch.group(key, mats[key]);
    }
    return key;
  };
  const facK = (style, seed = 1) => K(`fac-${style.name}-${seed}`, () => std({ map: facadeTex(style, seed) }));
  const plainK = (style) => K(`plain-${style.name}`, () => std({ map: facadeTex({ ...style, name: style.name + '-plain', noWindow: true }, 9) }));
  const storeK = (seed, brick) => K(`store-${seed}-${brick || ''}`, () => std({ map: storefrontTex(seed, { brick }) }));
  const TRIM = K('trim', () => std({ roughness: 0.75 }));
  const METAL = K('metal', () => std({ roughness: 0.45, metalness: 0.65 }));
  const ROOF = K('roof', () => std({ map: roofTex() }));
  const CONC = K('concrete', () => std({ map: concreteTex('#a39a8b', 0) }));
  const GLASS = K('glass', () => std({ color: 0x2a2f33, roughness: 0.12, metalness: 0.9 }));
  const NEON = K('neon', () => {
    const m = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
    m.userData.noShadow = true;
    return m;
  });
  const signK = (text, o = {}) =>
    K('sign-' + text + (o.bg || ''), () => {
      const m = std({ map: signTex(text, o), roughness: 0.7 });
      m.userData.noShadow = true;
      return m;
    });
  const shingleK = (c) => K('shingle-' + c, () => std({ map: shingleTex(c) }));
  const sidingK = (c, trim = '#ece6d8') => K('siding-' + c, () => std({ map: facadeTex({ name: 'siding' + c, kind: 'siding', color: c, trim, winW: 64, winH: 92, winY: 70, dirt: 0.25 }, 3) }));
  const awningK = (c) =>
    K('awning-' + c, () => {
      const t = cached('awning' + c, () => {
        const cv = canvas(128, 64);
        const x = cv.getContext('2d');
        for (let i = 0; i < 8; i++) {
          x.fillStyle = i % 2 ? '#e4dccb' : c;
          x.fillRect(i * 16, 0, 16, 64);
        }
        grime(x, 128, 64, c.length, 0.35, false);
        return toTex(cv);
      });
      const m = std({ map: t, side: THREE.DoubleSide });
      return m;
    });
  const corrK = (c) =>
    K('corr-' + c, () => {
      const t = cached('corr' + c, () => {
        const cv = canvas(128, 128);
        const x = cv.getContext('2d');
        for (let i = 0; i < 16; i++) {
          const g = x.createLinearGradient(i * 8, 0, i * 8 + 8, 0);
          g.addColorStop(0, c);
          g.addColorStop(0.5, '#ffffff22');
          g.addColorStop(1, c);
          x.fillStyle = c;
          x.fillRect(i * 8, 0, 8, 128);
          x.fillStyle = 'rgba(0,0,0,0.25)';
          x.fillRect(i * 8 + 6, 0, 2, 128);
        }
        grime(x, 128, 128, 5, 0.5, true);
        return toTex(cv);
      });
      return std({ map: t, metalness: 0.3, roughness: 0.6 });
    });

  const col = (h) => {
    const c = new THREE.Color(h);
    return [c.r, c.g, c.b];
  };
  const g = {
    box: (geoW, geoH, geoD) => new THREE.BoxGeometry(geoW, geoH, geoD),
    cyl: (r1, r2, h, s = 12) => new THREE.CylinderGeometry(r1, r2, h, s),
  };
  const addGeo = (key, geo, x, y, z, ry = 0, c, rx = 0, rz = 0, sx = 1, sy = 1, sz = 1) => batch.geo(key, geo, mat(x, y, z, ry, sx, sy, sz, rx, rz), c ? col(c) : null);
  // local-frame helper for a building rotated by rot around (cx, cz)
  const frame = (cx, cz, rot) => {
    const c = Math.cos(rot), s = Math.sin(rot);
    return (lx, lz) => [cx + lx * c + lz * s, cz - lx * s + lz * c];
  };

  // gable roof prism (ridge along local x)
  const gable = (key, cx, cz, w, d, y, h, rot, overhang = 0.5) => {
    const shape = new THREE.Shape();
    const hd = d / 2 + overhang;
    shape.moveTo(-hd, 0);
    shape.lineTo(hd, 0);
    shape.lineTo(0, h);
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: w + overhang * 2, bevelEnabled: false });
    geo.translate(0, 0, -(w + overhang * 2) / 2);
    // shape x -> local z, extrude z -> local x
    geo.rotateY(Math.PI / 2);
    // planar UVs in meters for shingles
    const p = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 3, (p.getY(i) + Math.abs(p.getZ(i))) / 3);
    batch.geo(key, geo, mat(cx, y, cz, rot));
  };

  // ---------- generic commercial building ----------
  const building = (o) => {
    const { x, z, w, d, rot } = o;
    const style = o.style || r.pick(STYLES);
    const floors = o.floors ?? r.int(1, 3);
    const groundH = 4.4;
    const fh = 3.6;
    const y0 = CURB;
    const fk = facK(style, o.seed || r.int(1, 2));
    const pk = plainK(style);
    const sk = storeK(o.storeSeed ?? r.int(1, 6), style.kind === 'brick' ? style.color : null);
    // ground floor: storefront on the front face
    batch.walls(sk, x, z, w, d, y0, groundH, rot, 6, groundH, { faceKeys: [sk, pk, pk, pk], snapU: true });
    let top = y0 + groundH;
    if (floors > 0) {
      batch.walls(fk, x, z, w, d, top, floors * fh, rot, 3.2, fh, { snapU: true, faceKeys: [fk, o.blindSides ? pk : fk, pk, o.blindSides ? pk : fk] });
      top += floors * fh;
    }
    const L = frame(x, z, rot);
    const tc = col(style.trim);
    // belt course + cornice + parapet
    batch.box(TRIM, x, y0 + groundH - 0.25, z, w + 0.3, 0.3, d + 0.3, rot, 1, tc);
    batch.box(TRIM, x, top, z, w + 0.7, 0.45, d + 0.7, rot, 1, tc);
    batch.box(TRIM, x, top + 0.45, z, w + 0.2, 0.7, d + 0.2, rot, 1, col(style.kind === 'brick' ? style.color : style.trim));
    batch.top(ROOF, x, z, w, d, top + 0.5, rot, 6);
    // dentils under cornice on the front
    if (style.kind === 'brick' && floors > 0) {
      for (let i = -w / 2 + 0.4; i < w / 2 - 0.3; i += 0.8) {
        const [px, pz] = L(i, d / 2 + 0.2);
        batch.box(TRIM, px, top - 0.35, pz, 0.35, 0.3, 0.35, rot, 1, tc);
      }
    }
    // sign band
    if (o.sign) {
      const sw = Math.min(w - 1.5, Math.max(6, o.sign.length * 0.9));
      const [sx, sz] = L(0, d / 2 + 0.08);
      const key = signK(o.sign, o.signOpt || { bg: r.pick(['#d8cdb1', '#2c3b2e', '#6d1f1a', '#e8e0c8', '#1f2a3a']), fg: r.pick(['#7a1a12', '#e9dcae', '#f0e6c8', '#1d1d1d']) });
      quadOnFace(key, sx, y0 + 3.45, sz, sw, 0.95, rot);
    }
    // awning over the glass
    if (o.awning ?? r() < 0.6) {
      const ak = awningK(r.pick(['#8b2a22', '#2b4a32', '#24405e', '#7a5a22', '#5a2a4a']));
      const a1 = L(-w / 2 + 0.6, d / 2), a2 = L(w / 2 - 0.6, d / 2), a3 = L(w / 2 - 0.6, d / 2 + 1.7), a4 = L(-w / 2 + 0.6, d / 2 + 1.7);
      batch.quad(ak, [a4[0], y0 + 2.75, a4[1]], [a3[0], y0 + 2.75, a3[1]], [a2[0], y0 + 3.35, a2[1]], [a1[0], y0 + 3.35, a1[1]], [
        [0, 0],
        [(w - 1.2) / 2, 0],
        [(w - 1.2) / 2, 1],
        [0, 1],
      ]);
    }
    // rooftop clutter
    const n = r.int(0, 3);
    for (let i = 0; i < n; i++) {
      const [ax, az] = L((r() - 0.5) * (w - 4), (r() - 0.5) * (d - 4));
      batch.box(METAL, ax, top + 0.5, az, 1.6 + r() * 1.5, 1 + r() * 0.8, 1.4 + r(), rot, 1, col('#8f8a82'));
    }
    if (r() < 0.18 && floors >= 1) {
      // wooden rooftop water tank
      const [ax, az] = L((r() - 0.5) * (w - 6), (r() - 0.5) * (d - 6));
      addGeo(TRIM, g.cyl(1.6, 1.6, 2.6, 12), ax, top + 3.4, az, 0, '#6a4d33');
      addGeo(TRIM, new THREE.ConeGeometry(1.8, 1.1, 12), ax, top + 5.2, az, 0, '#4a3a2c');
      for (const [lx, lz] of [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ])
        addGeo(METAL, g.box(0.15, 2.1, 0.15), ax + lx, top + 1.5, az + lz, 0, '#3c3a36');
    }
    world.addBox(x, z, w, d, rot, 0, top + 1.2);
    return { top, L };
  };
  // vertical quad flush with a building face rotated by rot (faces local +z)
  function quadOnFace(key, cx, cy, cz, w, h, rot, uv) {
    const c = Math.cos(rot), s = Math.sin(rot);
    const hx = (w / 2) * c, hz = (-w / 2) * s;
    batch.quad(key, [cx - hx, cy - h / 2, cz - hz], [cx + hx, cy - h / 2, cz + hz], [cx + hx, cy + h / 2, cz + hz], [cx - hx, cy + h / 2, cz - hz], uv);
  }

  // fill a frontage line with buildings. line runs from (x0,z0) to (x1,z1) along the block edge,
  // rot is the facing, depth range for the lots
  const frontage = (x0, z0, x1, z1, rot, depth, specials = {}) => {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const dx = (x1 - x0) / len, dz = (z1 - z0) / len;
    const fx = Math.sin(rot), fz = Math.cos(rot); // facing direction
    let t = 0;
    let idx = 0;
    while (t < len - 6) {
      const sp = specials[idx];
      let w = sp?.w ?? r.range(9, 17);
      if (len - t - w < 7) w = len - t;
      const d = sp?.d ?? depth * r.range(0.8, 1);
      const cx = x0 + dx * (t + w / 2) - fx * (d / 2);
      const cz = z0 + dz * (t + w / 2) - fz * (d / 2);
      building({ x: cx, z: cz, w: w - 0.1, d, rot, ...(sp || {}), sign: sp?.sign ?? (r() < 0.75 ? r.pick(SHOPS) : null) });
      t += w;
      idx++;
    }
  };
  const SHOPS = ['HARDWARE', 'BARBER', 'ANTIQUES', 'PAWN SHOP', 'BAKERY', 'BOOKS', 'TAVERN', 'DRUGS', 'SHOES', 'RADIO & TV', 'FLORIST', 'LAUNDROMAT', 'CAFE', 'BANK', 'FURNITURE', 'GUNS & AMMO', 'LIQUOR', 'TAILOR', 'HOBBY SHOP', 'DRY GOODS'];

  // ---------- downtown ----------
  const IN = SIDEWALK;
  // dtNW: Main St frontage faces +x
  frontage(-10 - IN, -142 + IN, -10 - IN, -57 - IN, Math.PI / 2, 20, {
    0: { sign: 'HOTEL SUNSPRINGS', floors: 3, w: 18, style: STYLES[0] },
    2: { sign: 'THEATER', floors: 2, w: 16, style: STYLES[4], theater: true },
  });
  frontage(-103 + IN, -142 + IN, -36, -142 + IN, Math.PI, 16);
  frontage(-36, -57 - IN, -103 + IN, -57 - IN, 0, 16);
  // dtNE: faces -x
  frontage(10 + IN, -57 - IN, 10 + IN, -142 + IN, -Math.PI / 2, 20, { 3: { sign: 'SUNSPRINGS BANK', floors: 3, w: 16, style: STYLES[3] } });
  frontage(36, -142 + IN, 113 - IN, -142 + IN, Math.PI, 16);
  frontage(113 - IN, -57 - IN, 36, -57 - IN, 0, 16);
  // dtW
  frontage(-10 - IN, -43 + IN, -10 - IN, 43 - IN, Math.PI / 2, 20, { 1: { sign: 'OPTICAL PHARMACY', floors: 2, w: 17 }, 3: { sign: 'HARDWARE', w: 14 } });
  frontage(-103 + IN, -43 + IN, -36, -43 + IN, Math.PI, 16);
  frontage(-36, 43 - IN, -103 + IN, 43 - IN, 0, 16);
  // dtE
  frontage(10 + IN, 43 - IN, 10 + IN, -43 + IN, -Math.PI / 2, 20, { 0: { sign: 'DAIRY BARN', floors: 1, w: 16, signOpt: { bg: '#e8e0c8', fg: '#b3221b', font: 'Rye, serif' } } });
  frontage(36, -43 + IN, 113 - IN, -43 + IN, Math.PI, 16);
  frontage(113 - IN, 43 - IN, 36, 43 - IN, 0, 16);

  // back lots: parking
  const lot = (x0, z0, x1, z1, rows = 'x') => {
    paint.asphalt(x0, z0, x1, z1, 1.05);
    const { ctx, X, Z, k } = paint;
    ctx.strokeStyle = 'rgba(225,220,205,0.75)';
    ctx.lineWidth = 0.14 * k;
    if (rows === 'x') {
      for (let x = x0 + 1; x < x1 - 1; x += 2.8) {
        ctx.beginPath();
        ctx.moveTo(X(x), Z(z0 + 0.5));
        ctx.lineTo(X(x), Z(z0 + 5.5));
        ctx.moveTo(X(x), Z(z1 - 0.5));
        ctx.lineTo(X(x), Z(z1 - 5.5));
        ctx.stroke();
      }
    } else {
      for (let z = z0 + 1; z < z1 - 1; z += 2.8) {
        ctx.beginPath();
        ctx.moveTo(X(x0 + 0.5), Z(z));
        ctx.lineTo(X(x0 + 5.5), Z(z));
        ctx.moveTo(X(x1 - 0.5), Z(z));
        ctx.lineTo(X(x1 - 5.5), Z(z));
        ctx.stroke();
      }
    }
    world.parkingLots = world.parkingLots || [];
    world.parkingLots.push({ x0, z0, x1, z1, rows });
  };
  lot(-98, -120, -36, -78);
  lot(36, -120, 108, -78);
  lot(-98, -22, -36, 22);
  lot(36, -22, 108, 22);

  // ---------- clock tower (roundabout) ----------
  {
    const { x, z } = ROUNDABOUT;
    const brick = { name: 'clockBrick', kind: 'brick', color: '#7d3523', trim: '#d6c8ad' };
    const bk = plainK(brick);
    const stone = col('#b9ad96');
    batch.box(TRIM, x, 0.17, z, 9, 1.2, 9, 0, 1, stone);
    batch.walls(bk, x, z, 6.6, 6.6, 1.37, 18, 0, 3.2, 3.6);
    for (const y of [1.37, 7, 13, 19.2]) batch.box(TRIM, x, y, z, 7.2, 0.5, 7.2, 0, 1, stone);
    // clock stage
    batch.walls(bk, x, z, 7.4, 7.4, 19.7, 5, 0, 3.2, 3.6);
    const ck = K('clockface', () => std({ map: clockTex(), roughness: 0.6 }));
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      quadOnFace(ck, x + Math.sin(a) * 3.73, 22.2, z + Math.cos(a) * 3.73, 4.2, 4.2, a);
    }
    batch.box(TRIM, x, 24.7, z, 8, 0.5, 8, 0, 1, stone);
    // belfry posts
    for (const [px, pz] of [
      [-3, -3],
      [3, -3],
      [3, 3],
      [-3, 3],
    ])
      batch.box(bk, x + px, 25.2, z + pz, 1.2, 4, 1.2, 0, 1);
    batch.box(TRIM, x, 29.2, z, 8, 0.6, 8, 0, 1, stone);
    addGeo(shingleK('#2f3436'), new THREE.ConeGeometry(5.9, 8, 4, 1), x, 33.8, z, Math.PI / 4);
    addGeo(METAL, new THREE.ConeGeometry(0.25, 5, 6), x, 40.2, z, 0, '#3a3a33');
    addGeo(METAL, new THREE.SphereGeometry(0.45, 8, 6), x, 38, z, 0, '#8a7a3a');
    world.addCircle(x, z, 4.9, 0, 45, { name: 'Clock Tower' });
  }

  // ---------- courthouse ----------
  {
    const cx = 0, cz = -224, rot = 0;
    const brick = STYLES[0];
    const fk = facK({ ...brick, name: 'courtBrick', arch: true, trim: '#ece4d2' }, 2);
    const pk = plainK(brick);
    const white = col('#e6e0d2');
    // wings
    for (const sx of [-1, 1]) {
      const wx = cx + sx * 24;
      batch.walls(fk, wx, cz, 28, 30, CURB, 3 * 4, rot, 3.2, 4, { snapU: true });
      batch.box(TRIM, wx, CURB + 12, cz, 28.8, 0.6, 30.8, rot, 1, white);
      batch.box(TRIM, wx, CURB + 12.6, cz, 28.2, 0.9, 30.2, rot, 1, col('#8c3f2c'));
      batch.top(ROOF, wx, cz, 28, 30, CURB + 13.5, 0, 6);
      batch.box(TRIM, wx, CURB, cz, 28.6, 1.1, 30.6, rot, 1, white);
    }
    // central pavilion
    batch.walls(fk, cx, cz + 3, 20, 36, CURB, 16, rot, 3.2, 4, { snapU: true });
    batch.box(TRIM, cx, CURB + 16, cz + 3, 21, 0.7, 37, rot, 1, white);
    batch.top(ROOF, cx, cz + 3, 20, 36, CURB + 16.7, 0, 6);
    // portico: steps, columns, pediment
    for (let i = 0; i < 4; i++) batch.box(TRIM, cx, CURB + i * 0.35, cz + 21 + 4 - i * 0.9, 18, 0.35, 8 - i * 1.8, 0, 1, col('#cfc7b5'));
    world.addPlatform({ type: 'rect', cx, cz: cz + 23.5, hx: 9, hz: 4, rot: 0, y: CURB + 1.0, ramp: true, yA: CURB + 1.4, yB: CURB + 0.2 });
    for (let i = 0; i < 6; i++) {
      const px = cx - 7.5 + i * 3;
      addGeo(TRIM, g.cyl(0.55, 0.62, 11, 14), px, CURB + 1.4 + 5.5, cz + 21.6, 0, '#ece6d8');
      addGeo(TRIM, g.box(1.5, 0.5, 1.5), px, CURB + 1.4 + 11.2, cz + 21.6, 0, '#ece6d8');
      world.addCircle(px, cz + 21.6, 0.65, 0, 14, { minimap: false });
    }
    batch.box(TRIM, cx, CURB + 12.6, cz + 21.6, 19, 1.4, 2.4, 0, 1, white);
    {
      const sh = new THREE.Shape();
      sh.moveTo(-9.8, 0);
      sh.lineTo(9.8, 0);
      sh.lineTo(0, 3.4);
      sh.closePath();
      const pg = new THREE.ExtrudeGeometry(sh, { depth: 2.6, bevelEnabled: false });
      addGeo(TRIM, pg, cx, CURB + 14, cz + 20.3, 0, '#ece6d8');
    }
    const ck2 = signK('SUNSPRINGS COUNTY COURTHOUSE', { bg: '#e6e0d2', fg: '#3a2a20', border: false, w: 1024, h: 96, font: 'Georgia, serif' });
    quadOnFace(ck2, cx, CURB + 13.2, cz + 22.85, 15, 0.9, 0);
    // cupola with clock
    const cy = CURB + 16.7;
    batch.box(TRIM, cx, cy, cz + 3, 9, 4, 9, 0, 1, white);
    addGeo(TRIM, g.cyl(3.8, 3.8, 6, 8), cx, cy + 7, cz + 3, Math.PI / 8, '#ece6d8');
    const ck = K('clockface', () => std({ map: clockTex(), roughness: 0.6 }));
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      quadOnFace(ck, cx + Math.sin(a) * 3.62, cy + 7, cz + 3 + Math.cos(a) * 3.62, 3, 3, a);
    }
    addGeo(TRIM, new THREE.SphereGeometry(4.1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), cx, cy + 10, cz + 3, 0, '#6f8c78');
    addGeo(TRIM, g.cyl(0.9, 1.1, 2.2, 8), cx, cy + 15, cz + 3, 0, '#ece6d8');
    addGeo(METAL, new THREE.ConeGeometry(0.2, 3.5, 6), cx, cy + 17.6, cz + 3, 0, '#7a6a3a');
    world.addBox(cx, cz, 76, 30, 0, 0, 16);
    world.addBox(cx, cz + 3, 20, 36, 0, 0, 30);
    // plaza paving + lawn + fountain
    {
      const { ctx, X, Z, k } = paint;
      ctx.fillStyle = '#8a5a44';
      ctx.fillRect(X(-65.5), Z(-205), 131 * k, 40.5 * k);
      ctx.strokeStyle = 'rgba(50,30,22,0.5)';
      ctx.lineWidth = 1;
      for (let x = -65; x < 66; x += 0.6) {
        ctx.beginPath();
        ctx.moveTo(X(x), Z(-205));
        ctx.lineTo(X(x), Z(-164.5));
        ctx.stroke();
      }
      for (let z = -205; z < -164; z += 1.2) {
        ctx.beginPath();
        ctx.moveTo(X(-65.5), Z(z));
        ctx.lineTo(X(65.5), Z(z));
        ctx.stroke();
      }
      paint.lawn(-60, -200, -14, -172);
      paint.lawn(14, -200, 60, -172);
      paint.lawn(-65.5, -245.5, -38, -205);
      paint.lawn(38, -245.5, 65.5, -205);
    }
    const fx = 0, fz = -186;
    addGeo(TRIM, g.cyl(6.5, 6.8, 0.9, 32), fx, CURB + 0.45, fz, 0, '#bdb3a0');
    addGeo(K('water', () => std({ color: 0x3c4a4c, roughness: 0.08, metalness: 0.3 })), g.cyl(6, 6, 0.1, 32), fx, CURB + 0.8, fz);
    addGeo(TRIM, g.cyl(0.8, 1.2, 3, 12), fx, CURB + 1.5, fz, 0, '#bdb3a0');
    addGeo(TRIM, g.cyl(2.2, 0.6, 0.6, 16), fx, CURB + 3.2, fz, 0, '#bdb3a0');
    world.addCircle(fx, fz, 6.6, 0, 1.0, { minimap: false, low: true });
    world.addPlatform({ type: 'circle', cx: fx, cz: fz, r: 6.6, y: CURB + 0.9 });
    world.addCircle(fx, fz, 1.2, 0, 4, { minimap: false });
    // flagpoles
    for (const sx of [-12, 12]) {
      addGeo(METAL, g.cyl(0.12, 0.16, 14, 8), sx, CURB + 7, -197, 0, '#cfcac0');
      world.flagPoles = world.flagPoles || [];
      world.flagPoles.push(new THREE.Vector3(sx, CURB + 13.2, -197));
    }
    world.landmarks = world.landmarks || {};
    world.landmarks.courthouse = new THREE.Vector3(cx, 20, cz);
  }

  // ---------- water tower (NW) ----------
  {
    const x = -175, z = -98;
    const legs = 6, R = 6.2, H = 30;
    for (let i = 0; i < legs; i++) {
      const a = (i / legs) * Math.PI * 2;
      const lx = x + Math.cos(a) * (R + 1.2), lz = z + Math.sin(a) * (R + 1.2);
      const tx = x + Math.cos(a) * R, tz = z + Math.sin(a) * R;
      const len = Math.hypot(lx - tx, H, lz - tz);
      const geo = g.cyl(0.32, 0.42, len, 8);
      const m4 = new THREE.Matrix4().lookAt(new THREE.Vector3(lx, CURB, lz), new THREE.Vector3(tx, CURB + H, tz), new THREE.Vector3(0, 0, 1));
      const q = new THREE.Quaternion().setFromRotationMatrix(m4).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2));
      batch.geo(METAL, geo, new THREE.Matrix4().compose(new THREE.Vector3((lx + tx) / 2, CURB + H / 2, (lz + tz) / 2), q, new THREE.Vector3(1, 1, 1)), col('#b9b6ad'));
      world.addCircle(lx, lz, 0.6, 0, 32, { minimap: false });
      // braces between legs
      const b = ((i + 1) / legs) * Math.PI * 2;
      for (const hy of [9, 19]) {
        const rr = lerp(R + 1.2, R, hy / H);
        const ax = x + Math.cos(a) * rr, az = z + Math.sin(a) * rr, bx = x + Math.cos(b) * rr, bz = z + Math.sin(b) * rr;
        const bl = Math.hypot(bx - ax, bz - az);
        addGeo(METAL, g.box(bl, 0.25, 0.25), (ax + bx) / 2, CURB + hy, (az + bz) / 2, -Math.atan2(bz - az, bx - ax), '#a8a49a');
      }
    }
    addGeo(METAL, g.cyl(1.1, 1.1, H, 10), x, CURB + H / 2, z, 0, '#9c988f');
    world.addCircle(x, z, 1.3, 0, 40, { minimap: false });
    // catwalk
    addGeo(METAL, new THREE.TorusGeometry(R + 1.2, 0.18, 6, 32), x, CURB + H + 1, z, 0, '#7b786f', Math.PI / 2);
    addGeo(METAL, g.cyl(R + 1.3, R + 1.3, 0.2, 32), x, CURB + H + 0.1, z, 0, '#6f6b63');
    // tank with lettering
    const tankTex = cached('tank', () => {
      const cv = canvas(1024, 256);
      const c2 = cv.getContext('2d');
      c2.fillStyle = '#bfbbb2';
      c2.fillRect(0, 0, 1024, 256);
      c2.fillStyle = '#7a2a1e';
      c2.font = 'bold 54px Oswald, sans-serif';
      c2.textAlign = 'center';
      for (const u of [256, 768]) c2.fillText('SUNSPRINGS', u, 150);
      grime(c2, 1024, 256, 41, 0.55, true);
      return toTex(cv);
    });
    const tk = K('tank', () => std({ map: tankTex, metalness: 0.5, roughness: 0.55 }));
    const tank = new THREE.SphereGeometry(8.6, 32, 20);
    addGeo(tk, tank, x, CURB + H + 7.2, z, 0, null, 0, 0, 1, 0.82, 1);
    addGeo(METAL, new THREE.ConeGeometry(2.2, 1.6, 12), x, CURB + H + 14.7, z, 0, '#8d897f');
    world.landmarks.waterTower = new THREE.Vector3(x, 40, z);
    // fenced pump house + warehouses
    building({ x: -150, z: -126, w: 14, d: 10, rot: Math.PI, floors: 0, style: STYLES[5], sign: 'SUNSPRINGS WATER DEPT', awning: false });
    const ck = corrK('#7d7a70');
    batch.walls(ck, -212, -126, 32, 20, CURB, 9, 0, 4, 9);
    batch.top(ROOF, -212, -126, 32, 20, CURB + 9, 0, 6);
    world.addBox(-212, -126, 32, 20, 0, 0, 9.5);
    batch.walls(corrK('#6f5240'), -214, -73, 24, 16, CURB, 7, 0, 4, 7);
    batch.top(ROOF, -214, -73, 24, 16, CURB + 7, 0, 6);
    world.addBox(-214, -73, 24, 16, 0, 0, 7.5);
  }

  // ---------- church (east of downtown, faces west to 3rd Ave) ----------
  {
    const cx = 182, cz = -100, rot = -Math.PI / 2;
    const stone = { name: 'churchStone', kind: 'brick', color: '#4a3b33', trim: '#9a8c78', arch: true, winW: 56, winH: 140, winY: 60 };
    const fk = facK(stone, 4);
    const pk = plainK(stone);
    // nave: local width 18 (x), length 44 (z)
    batch.walls(fk, cx, cz, 20, 44, CURB, 12, rot, 3.6, 12, { faceKeys: [pk, fk, pk, fk], snapU: true });
    gable(shingleK('#2e2a28'), cx, cz, 44, 20, CURB + 12, 10, rot + Math.PI / 2, 0.8);
    // gable end walls (triangles) as extrusions
    const L = frame(cx, cz, rot);
    for (const s of [1, -1]) {
      const sh = new THREE.Shape();
      sh.moveTo(-10, 0);
      sh.lineTo(10, 0);
      sh.lineTo(0, 10);
      sh.closePath();
      const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.6, bevelEnabled: false });
      const [gx, gz] = L(0, s * 21.7);
      addGeo(pk, geo, gx, CURB + 12, gz, rot, null);
    }
    // rose window
    const rose = cached('rose', () => {
      const cv = canvas(256, 256);
      const c2 = cv.getContext('2d');
      c2.fillStyle = '#2a2420';
      c2.fillRect(0, 0, 256, 256);
      const cols = ['#7a1d2a', '#203a7a', '#8a6a1a', '#2a5a3a'];
      for (let i = 0; i < 16; i++) {
        c2.fillStyle = cols[i % 4];
        c2.beginPath();
        c2.moveTo(128, 128);
        c2.arc(128, 128, 118, (i / 16) * Math.PI * 2, ((i + 1) / 16) * Math.PI * 2);
        c2.fill();
      }
      c2.strokeStyle = '#a89a80';
      c2.lineWidth = 8;
      c2.beginPath();
      c2.arc(128, 128, 120, 0, Math.PI * 2);
      c2.stroke();
      c2.beginPath();
      c2.arc(128, 128, 50, 0, Math.PI * 2);
      c2.stroke();
      return toTex(cv, { repeat: false });
    });
    const rk = K('rose', () => std({ map: rose, roughness: 0.4, emissive: new THREE.Color('#2a1a10'), emissiveMap: rose }));
    {
      const [gx, gz] = L(0, 22.35);
      quadOnFace(rk, gx, CURB + 15.5, gz, 5, 5, rot);
    }
    // bell tower + spire at the front
    const [tx, tz] = L(0, 25);
    batch.walls(fk, tx, tz, 8, 8, CURB, 26, rot, 4, 13, { snapU: true });
    batch.box(TRIM, tx, CURB + 26, tz, 9, 0.8, 9, rot, 1, col('#8a7c68'));
    for (const [px, pz] of [
      [-3.6, -3.6],
      [3.6, -3.6],
      [3.6, 3.6],
      [-3.6, 3.6],
    ]) {
      const [qx, qz] = frame(tx, tz, rot)(px, pz);
      addGeo(pk, new THREE.ConeGeometry(0.7, 4, 4), qx, CURB + 28.8, qz, Math.PI / 4);
    }
    addGeo(shingleK('#2e2a28'), new THREE.ConeGeometry(5.4, 22, 8), tx, CURB + 37.8, tz, Math.PI / 8);
    addGeo(METAL, g.box(0.25, 3, 0.25), tx, CURB + 50, tz, 0, '#2a2622');
    addGeo(METAL, g.box(1.6, 0.25, 0.25), tx, CURB + 50.6, tz, rot, '#2a2622');
    world.addBox(cx, cz, 20, 44, rot, 0, 22);
    world.addBox(tx, tz, 8, 8, rot, 0, 50);
    // doors
    const dk = K('door', () => std({ color: 0x3a2216, roughness: 0.7 }));
    const [dx, dz] = L(0, 29.05);
    quadOnFace(dk, dx, CURB + 2.6, dz, 3.2, 5.2, rot);
    // headstones behind the church
    const hs = g.box(0.9, 1.3, 0.25);
    for (let i = 0; i < 40; i++) {
      const hx = 214 + (i % 5) * 3.6 + r() * 0.6, hz = -134 + Math.floor(i / 5) * 4.2 + r() * 0.6;
      addGeo(TRIM, hs, hx, CURB + 0.5, hz, Math.PI / 2 + (r() - 0.5) * 0.3, '#8d877c', (r() - 0.5) * 0.2);
    }
    world.landmarks.church = new THREE.Vector3(cx, 30, cz);
  }

  // ---------- hospital (faces west) ----------
  {
    const cx = 196, cz = -2, rot = -Math.PI / 2;
    const st = { name: 'hospital', kind: 'concrete', color: '#c8c2b4', trim: '#8a8478', winW: 200, winH: 70, winY: 90, dirt: 0.3 };
    const fk = facK(st, 5);
    batch.walls(fk, cx, cz, 70, 50, CURB, 16, rot, 4, 4, { snapU: true });
    batch.box(TRIM, cx, CURB + 16, cz, 70.6, 0.8, 50.6, rot, 1, col('#9d978b'));
    batch.top(ROOF, cx, cz, 70, 50, CURB + 16.8, 0, 6);
    world.addBox(cx, cz, 70, 50, rot, 0, 17.5);
    // helipad: walkable roof
    const hp = cached('helipad', () => {
      const cv = canvas(256, 256);
      const c2 = cv.getContext('2d');
      c2.fillStyle = '#3c3c3a';
      c2.fillRect(0, 0, 256, 256);
      c2.strokeStyle = '#d8d0b8';
      c2.lineWidth = 10;
      c2.beginPath();
      c2.arc(128, 128, 100, 0, Math.PI * 2);
      c2.stroke();
      c2.fillStyle = '#d8d0b8';
      c2.fillRect(80, 70, 22, 116);
      c2.fillRect(154, 70, 22, 116);
      c2.fillRect(80, 118, 96, 20);
      grime(c2, 256, 256, 8, 0.4, false);
      return toTex(cv, { repeat: false });
    });
    const hk = K('helipad', () => std({ map: hp }));
    batch.top(hk, cx, cz, 18, 18, CURB + 16.85, 0, 18);
    const sign = signK('SUNSPRINGS GENERAL HOSPITAL', { bg: '#e8e4da', fg: '#1d3a6a', w: 1024, h: 128 });
    const L = frame(cx, cz, rot);
    const [sx, sz] = L(0, 25.1);
    quadOnFace(sign, sx, CURB + 14.3, sz, 26, 2.2, rot);
    const cross = signK('+', { bg: '#e8e4da', fg: '#c01818', w: 128, h: 128, size: 150, border: false });
    const [crx, crz] = L(-28, 25.1);
    quadOnFace(cross, crx, CURB + 12, crz, 5, 5, rot);
    // ER canopy on posts
    const [ex, ez] = L(14, 31);
    batch.box(TRIM, ex, CURB + 4.2, ez, 14, 0.6, 12, rot, 1, col('#d9d4c8'));
    for (const [px, pz] of [
      [-6, 5],
      [6, 5],
    ]) {
      const [qx, qz] = frame(ex, ez, rot)(px, pz);
      addGeo(TRIM, g.cyl(0.3, 0.3, 4.2, 8), qx, CURB + 2.1, qz, 0, '#d9d4c8');
      world.addCircle(qx, qz, 0.4, 0, 5, { minimap: false });
    }
    const erk = signK('EMERGENCY', { bg: '#b01a1a', fg: '#ffffff', w: 512, h: 96, border: false });
    const [erx, erz] = frame(ex, ez, rot)(0, 6.02);
    quadOnFace(erk, erx, CURB + 4.5, erz, 7, 0.55, rot);
    lot(131, -38, 160, 38, 'z');
    world.landmarks.hospital = new THREE.Vector3(cx, 18, cz);
  }

  // ---------- Bruner's Foodsource (drive-in supermarket with health bay) ----------
  {
    const x0 = 56, x1 = 108, z0 = 62, z1 = 138;
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, H = 9.5;
    const wall = { name: 'market', kind: 'stucco', color: '#b9a98a', trim: '#6b4a32', noWindow: true };
    const wk = plainK(wall);
    const t = 0.6;
    const door0 = 92, door1 = 108;
    // back, sides
    batch.walls(wk, x1 - t / 2, cz, t, z1 - z0, CURB, H, 0, 3.2, 3.6);
    batch.walls(wk, cx, z0 + t / 2, x1 - x0, t, CURB, H, 0, 3.2, 3.6);
    batch.walls(wk, cx, z1 - t / 2, x1 - x0, t, CURB, H, 0, 3.2, 3.6);
    world.addBox(x1 - t / 2, cz, t, z1 - z0, 0, 0, H + 1);
    world.addBox(cx, z0 + t / 2, x1 - x0, t, 0, 0, H + 1);
    world.addBox(cx, z1 - t / 2, x1 - x0, t, 0, 0, H + 1);
    // front with glass and a wide opening
    const fk = storeK(11, null);
    for (const [a, b] of [
      [z0, door0],
      [door1, z1],
    ]) {
      const mz = (a + b) / 2;
      batch.walls(fk, x0 + t / 2, mz, b - a, t, CURB, 4.4, -Math.PI / 2, 6, 4.4, { snapU: true, faceKeys: [fk, wk, wk, wk] });
      world.addBox(x0 + t / 2, mz, t, b - a, 0, 0, H + 1);
    }
    batch.walls(wk, x0 + t / 2, cz, z1 - z0, t, CURB + 4.4, H - 4.4, -Math.PI / 2, 3.2, 3.6);
    batch.box(TRIM, x0 - 0.2, CURB + 4.2, cz, 1.2, 0.5, z1 - z0, 0, 1, col('#6b4a32'));
    // interior ceiling (faces down) + roof
    batch.top(ROOF, cx, cz, x1 - x0, z1 - z0, CURB + H, 0, 6);
    const ceil = K('ceiling', () => std({ color: 0x9e9a90, side: THREE.BackSide, roughness: 0.9 }));
    batch.top(ceil, cx, cz, x1 - x0, z1 - z0, CURB + H - 0.05, 0, 4);
    // big sign
    const bs = signK("BRUNER'S FOODSOURCE", { bg: '#efe6cf', fg: '#7a1f17', w: 1024, h: 160, font: 'Rye, serif' });
    quadOnFace(bs, x0 - 0.05, CURB + 7.1, cz, 34, 3.6, -Math.PI / 2);
    for (const [txt, z] of [
      ['PHARMACY', 72],
      ['BAKERY', 128],
    ]) {
      const k2 = signK(txt, { bg: '#2c3b2e', fg: '#e9dcae', w: 512, h: 96 });
      quadOnFace(k2, x0 - 0.05, CURB + 5.6, z, 8, 1.3, -Math.PI / 2);
    }
    // aisles
    for (let i = 0; i < 5; i++) {
      const sz = 70 + i * 13;
      if (sz > 88 && sz < 112) continue;
      batch.box(METAL, 86, CURB, sz, 30, 2.2, 1.6, 0, 1, col('#8a7d6a'));
      world.addBox(86, sz, 30, 1.6, 0, 0, 2.4, { minimap: false });
      // goods on shelves
      for (let j = 0; j < 12; j++) batch.box(TRIM, 72 + j * 2.4, CURB + 2.2, sz, 1.6, 0.5, 1.2, 0, 1, col(r.pick(['#b3402b', '#d9b13a', '#3a6aa3', '#e6e0d0', '#4b8a3a'])));
    }
    // checkout counters near the front
    for (let i = 0; i < 4; i++) {
      const sz = 66 + i * 6;
      batch.box(METAL, 64, CURB, sz, 5, 1.1, 1.2, 0, 1, col('#5c5650'));
      world.addBox(64, sz, 5, 1.2, 0, 0, 1.2, { minimap: false });
    }
    // interior light panels
    const lk = NEON;
    for (let i = 0; i < 4; i++) for (let j = 0; j < 5; j++) batch.quad(lk, [62 + i * 12, CURB + H - 0.1, 68 + j * 15], [66 + i * 12, CURB + H - 0.1, 68 + j * 15], [66 + i * 12, CURB + H - 0.1, 70 + j * 15], [62 + i * 12, CURB + H - 0.1, 70 + j * 15], null, col('#fff3d6'));
    // health bay at the back of the store
    world.healthBays.push({ x: 100, z: 100, r: 6, name: "Bruner's Garage" });
    lot(14.5, 61.5, 52, 138.5, 'z');
    world.landmarks.market = new THREE.Vector3(cx, 10, cz);
    world.interiors = world.interiors || [];
    world.interiors.push({ x0, z0, x1, z1, y: CURB + H });
  }

  // ---------- gas station + diner with mascot ----------
  {
    const cx = -40, cz = 84;
    // canopy
    batch.box(TRIM, cx, CURB + 5, cz, 24, 0.9, 15, 0, 1, col('#d8d2c4'));
    const stripe = K('gasStripe', () => std({ color: 0xb01d16, roughness: 0.6 }));
    batch.walls(stripe, cx, cz, 24.1, 15.1, CURB + 5.15, 0.5, 0, 1, 1);
    for (const [px, pz] of [
      [-8, -4],
      [8, -4],
      [-8, 4],
      [8, 4],
    ]) {
      addGeo(TRIM, g.box(0.5, 5, 0.5), cx + px, CURB + 2.5, cz + pz, 0, '#c9c3b5');
      world.addCircle(cx + px, cz + pz, 0.5, 0, 6, { minimap: false });
    }
    world.gasPumps = [
      [cx - 4, cz - 4],
      [cx + 4, cz - 4],
      [cx - 4, cz + 4],
      [cx + 4, cz + 4],
    ];
    for (const [px, pz] of world.gasPumps) batch.box(CONC, px, CURB, pz, 3.4, 0.25, 1.4, 0, 1);
    building({ x: -78, z: 72, w: 20, d: 12, rot: Math.PI / 2, floors: 0, style: STYLES[5], sign: 'GAS-N-GO', signOpt: { bg: '#b01d16', fg: '#ffffff' }, awning: false });
    // price sign
    addGeo(METAL, g.box(0.4, 7, 0.4), -18, CURB + 3.5, 64, 0, '#5a5650');
    const ps = signK('GAS 4.99', { bg: '#1a1a1a', fg: '#f2d14a', w: 256, h: 128 });
    quadOnFace(ps, -18, CURB + 7.2, 64.25, 3.2, 1.6, 0);
    quadOnFace(ps, -18, CURB + 7.2, 63.75, 3.2, 1.6, Math.PI);
    world.addCircle(-18, 64, 0.5, 0, 9, { minimap: false });
    paint.asphalt(-60, 62, -14.5, 108, 1.1);
    // diner
    const dw = { name: 'diner', kind: 'stucco', color: '#d8d0bc', trim: '#b01d16' };
    const fk = facK({ ...dw, winW: 150, winH: 80, winY: 90 }, 6);
    batch.walls(fk, -62, 126, 26, 12, CURB, 5, 0, 3.2, 5, { snapU: true });
    batch.box(METAL, -62, CURB + 1.2, 126, 26.3, 0.5, 12.3, 0, 1, col('#cfd2d4'));
    batch.box(stripe, -62, CURB + 4.6, 126, 26.6, 0.8, 12.6, 0, 1);
    batch.top(ROOF, -62, 126, 26, 12, CURB + 5.4, 0, 6);
    world.addBox(-62, 126, 26, 12, 0, 0, 6);
    const dsk = signK('DINER', { bg: '#1a1a1a', fg: '#ff4a2a', w: 512, h: 128, font: 'Rye, serif' });
    quadOnFace(dsk, -62, CURB + 7.4, 132.2, 8, 2, 0);
    addGeo(METAL, g.box(0.3, 2.2, 0.3), -66, CURB + 6.4, 132, 0, '#4a4642');
    addGeo(METAL, g.box(0.3, 2.2, 0.3), -58, CURB + 6.4, 132, 0, '#4a4642');
    // mascot statue (head is a prop that can be knocked off)
    const mx = -26, mz = 128;
    addGeo(CONC, g.box(4, 1.2, 4), mx, CURB + 0.6, mz, 0);
    addGeo(TRIM, g.box(1.1, 3.8, 1.2), mx - 0.9, CURB + 3.1, mz, 0, '#2a3a6a');
    addGeo(TRIM, g.box(1.1, 3.8, 1.2), mx + 0.9, CURB + 3.1, mz, 0, '#2a3a6a');
    addGeo(TRIM, g.box(3.4, 3.4, 2.2), mx, CURB + 6.6, mz, 0, '#e8e4dc');
    addGeo(TRIM, g.box(3.5, 1, 2.3), mx, CURB + 5.2, mz, 0, '#b01d16');
    addGeo(TRIM, g.box(0.9, 3.2, 0.9), mx - 2.3, CURB + 7.2, mz, 0, '#e8c9a8', 0, 0.5);
    addGeo(TRIM, g.box(0.9, 3.2, 0.9), mx + 2.4, CURB + 8.6, mz + 0.4, 0, '#e8c9a8', 0.4, -1.2);
    world.addCircle(mx, mz, 2.2, 0, 8.4, { name: 'Statue' });
    world.statueHead = new THREE.Vector3(mx, CURB + 9.6, mz);
  }

  // ---------- high school A + football stadium ----------
  {
    const st = { name: 'school', kind: 'brick', color: '#8a4a34', trim: '#d9cdb5', winW: 120, winH: 100, winY: 80 };
    const fk = facK(st, 7);
    const sx = -176, sz = -26, rot = Math.PI;
    batch.walls(fk, sx, sz, 104, 20, CURB, 9, rot, 4, 4.5, { snapU: true });
    batch.box(TRIM, sx, CURB + 9, sz, 104.6, 0.6, 20.6, rot, 1, col('#d9cdb5'));
    batch.top(ROOF, sx, sz, 104, 20, CURB + 9.6, 0, 6);
    world.addBox(sx, sz, 104, 20, rot, 0, 10);
    // entrance portico + sign
    batch.box(TRIM, sx, CURB, sz - 12.5, 16, 0.4, 5, 0, 1, col('#cfc7b5'));
    for (let i = 0; i < 4; i++) {
      addGeo(TRIM, g.cyl(0.4, 0.45, 7, 10), sx - 6 + i * 4, CURB + 3.9, sz - 14.2, 0, '#ece6d8');
      world.addCircle(sx - 6 + i * 4, sz - 14.2, 0.5, 0, 8, { minimap: false });
    }
    batch.box(TRIM, sx, CURB + 7.4, sz - 12.5, 16.5, 0.9, 5.4, 0, 1, col('#ece6d8'));
    const sk = signK('SUNSPRINGS HIGH SCHOOL', { bg: '#e6e0d2', fg: '#6a1a12', w: 1024, h: 96, border: false, font: 'Georgia, serif' });
    quadOnFace(sk, sx, CURB + 7.85, sz - 15.25, 14, 0.8, Math.PI);
    // football field
    const fx = -176, fz = 74, FW = 48, FL = 104;
    const ftk = K('field', () => std({ map: fieldTex(), roughness: 0.95 }));
    batch.top(ftk, fx, fz, FW, FL, CURB + 0.03, 0, 1);
    {
      // fix field uvs to 0..1
      const gg = batch.group(ftk);
      const n = gg.uv.length;
      gg.uv.splice(n - 8, 8, 0, 0, 1, 0, 1, 1, 0, 1);
    }
    paint.ctx.fillStyle = '#8a4a36';
    paint.ctx.fillRect(paint.X(fx - FW / 2 - 6), paint.Z(fz - FL / 2 - 6), (FW + 12) * paint.k, (FL + 12) * paint.k);
    // bleachers: ramps rising outward from the field
    const bl = K('bleacher', () => std({ color: 0xb9b7b0, metalness: 0.5, roughness: 0.5 }));
    for (const side of [-1, 1]) {
      const bx = fx + side * (FW / 2 + 6 + 9);
      const steps = 12, depth = 18, Hb = 7;
      for (let i = 0; i < steps; i++) {
        const t0 = i / steps;
        const lx = bx - side * (depth / 2) + side * (t0 * depth) + side * (depth / steps / 2);
        batch.box(bl, lx, CURB, fz, depth / steps + 0.02, CURB + (i + 1) * (Hb / steps) - CURB, 70, 0, 1, col(i % 2 ? '#b9b7b0' : '#a4a29b'));
      }
      // ramp platform: yA at local -hz .. so orient along x using rot = +-PI/2
      world.addPlatform({ type: 'rect', cx: bx, cz: fz, hx: 35, hz: depth / 2, rot: side > 0 ? Math.PI / 2 : -Math.PI / 2, ramp: true, yA: CURB + 0.3, yB: CURB + Hb });
      // back wall + rail
      const wx = bx + side * (depth / 2 + 0.4);
      batch.box(CONC, wx, CURB, fz, 0.8, Hb + 1.6, 70, 0, 4);
      world.addBox(wx, fz, 0.8, 70, 0, 0, Hb + 1.5);
      // end walls
      for (const ez of [-35.4, 35.4]) {
        world.addBox(bx, fz + ez, depth, 0.8, 0, 0, 3.5, { minimap: false });
        batch.box(CONC, bx, CURB, fz + ez, depth, 1.1, 0.8, 0, 4);
      }
    }
    // press box on the west bleachers
    const pbx = fx - (FW / 2 + 6 + 9) - 5, pbz = fz;
    batch.box(TRIM, pbx, CURB + 7, pbz, 6, 4, 18, 0, 1, col('#c9c1ae'));
    batch.walls(GLASS, pbx + 3.05, pbz, 0.1, 16, CURB + 8.4, 1.8, 0, 1, 1);
    world.addBox(pbx, pbz, 6, 18, 0, 7, 11.5, { minimap: false });
    // goal posts
    for (const ez of [-1, 1]) {
      const gz = fz + ez * (FL / 2 + 1);
      addGeo(METAL, g.cyl(0.18, 0.18, 3.2, 8), fx, CURB + 1.6, gz, 0, '#e2c23a');
      addGeo(METAL, g.box(5.6, 0.2, 0.2), fx, CURB + 3.2, gz, 0, '#e2c23a');
      addGeo(METAL, g.cyl(0.1, 0.1, 6, 6), fx - 2.8, CURB + 6.2, gz, 0, '#e2c23a');
      addGeo(METAL, g.cyl(0.1, 0.1, 6, 6), fx + 2.8, CURB + 6.2, gz, 0, '#e2c23a');
      world.addCircle(fx, gz, 0.3, 0, 9, { minimap: false });
    }
    // light towers
    for (const [lx, lz] of [
      [-206, 20],
      [-206, 128],
      [-146, 20],
      [-146, 128],
    ]) {
      addGeo(METAL, g.cyl(0.35, 0.5, 26, 8), lx, CURB + 13, lz, 0, '#8a877f');
      addGeo(METAL, g.box(4, 2.4, 0.4), lx, CURB + 26.5, lz, Math.atan2(fx - lx, fz - lz), '#4a4842');
      world.addCircle(lx, lz, 0.6, 0, 28, { minimap: false });
    }
    world.landmarks.stadium = new THREE.Vector3(fx, 8, fz);
  }

  // ---------- East High: concrete with two tall pylons ----------
  {
    const st = { name: 'easthigh', kind: 'concrete', color: '#bdb6a6', trim: '#7d776b', winW: 180, winH: 60, winY: 100, dirt: 0.25 };
    const fk = facK(st, 8);
    const cx = 182, cz = 215, rot = Math.PI;
    batch.walls(fk, cx, cz, 84, 30, CURB, 10, rot, 4, 5, { snapU: true });
    batch.box(TRIM, cx, CURB + 10, cz, 85, 0.8, 31, rot, 1, col('#a39c8c'));
    batch.top(ROOF, cx, cz, 84, 30, CURB + 10.8, 0, 6);
    world.addBox(cx, cz, 84, 30, rot, 0, 11.5);
    const pk = K('pylon', () => std({ map: concreteTex('#d6d0c2', 0), roughness: 0.8 }));
    for (const px of [cx - 30, cx + 30]) {
      batch.box(pk, px, CURB, cz - 18, 2.2, 28, 7, 0, 3);
      world.addBox(px, cz - 18, 2.2, 7, 0, 0, 29);
    }
    const sk = signK('EAST HIGH', { bg: '#d6d0c2', fg: '#1d3a6a', w: 512, h: 128, border: false });
    quadOnFace(sk, cx, CURB + 8, cz - 15.1, 16, 3.5, Math.PI);
    // track + small field
    paint.ctx.fillStyle = '#8a4a36';
    paint.ctx.fillRect(paint.X(132), paint.Z(162), 97 * paint.k, 33 * paint.k);
    paint.lawn(140, 168, 222, 192, 'rgba(92,100,48,0.95)');
    world.landmarks.eastHigh = new THREE.Vector3(cx, 14, cz);
  }

  // ---------- park with gazebo ----------
  {
    paint.lawn(14.5, 161.5, 108.5, 239.5, 'rgba(90,96,46,0.95)');
    const { ctx, X, Z, k } = paint;
    ctx.strokeStyle = '#a69d8a';
    ctx.lineWidth = 2.4 * k;
    ctx.beginPath();
    ctx.moveTo(X(14.5), Z(200));
    ctx.quadraticCurveTo(X(60), Z(170), X(108.5), Z(200));
    ctx.moveTo(X(60), Z(161.5));
    ctx.lineTo(X(60), Z(239.5));
    ctx.stroke();
    // gazebo
    const gx = 60, gz = 200;
    addGeo(TRIM, g.cyl(5.2, 5.4, 0.6, 8), gx, CURB + 0.3, gz, Math.PI / 8, '#d9d2c2');
    world.addPlatform({ type: 'circle', cx: gx, cz: gz, r: 5.3, y: CURB + 0.6 });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      addGeo(TRIM, g.cyl(0.15, 0.15, 3.2, 6), gx + Math.cos(a) * 4.8, CURB + 2.2, gz + Math.sin(a) * 4.8, 0, '#efeadf');
      world.addCircle(gx + Math.cos(a) * 4.8, gz + Math.sin(a) * 4.8, 0.25, 0, 4, { minimap: false });
    }
    addGeo(shingleK('#5a3a2a'), new THREE.ConeGeometry(6, 2.6, 8), gx, CURB + 5.1, gz, Math.PI / 8);
    world.landmarks.park = new THREE.Vector3(gx, 4, gz);
  }

  // ---------- houses ----------
  const SIDING = ['#d9d3c3', '#a9b8c0', '#d6c58f', '#b9a58a', '#a8b59a', '#c9a99a', '#9a8f84'];
  const ROOFC = ['#4a3d36', '#3a3f44', '#5a3a2a', '#2f2f2f', '#5d4c3c'];
  const house = (cx, cz, rot) => {
    const sc = r.pick(SIDING);
    const sk = sidingK(sc);
    const floors = r() < 0.35 ? 2 : 1;
    const w = r.range(10, 13), d = r.range(8, 10), h = floors * 3.1;
    batch.walls(sk, cx, cz, w, d, CURB, h, rot, 3, 3.1, { snapU: true });
    const rh = r.range(2.4, 3.6);
    gable(shingleK(r.pick(ROOFC)), cx, cz, w, d, CURB + h, rh, rot, 0.6);
    const L = frame(cx, cz, rot);
    // gable end fill
    for (const s of [-1, 1]) {
      const sh = new THREE.Shape();
      sh.moveTo(-d / 2, 0);
      sh.lineTo(d / 2, 0);
      sh.lineTo(0, rh);
      sh.closePath();
      const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.1, bevelEnabled: false });
      geo.rotateY(Math.PI / 2);
      const [gx, gz] = L(s * (w / 2) - 0.05, 0);
      addGeo(sk, geo, gx, CURB + h, gz, rot, null);
    }
    // porch
    const [px, pz] = L(-w * 0.15, d / 2 + 1.4);
    batch.box(TRIM, px, CURB, pz, w * 0.45, 0.35, 2.8, rot, 1, col('#8a7a66'));
    batch.box(TRIM, px, CURB + 2.6, pz, w * 0.5, 0.25, 3.2, rot, 1, col('#5a4d42'));
    for (const s of [-1, 1]) {
      const [qx, qz] = frame(px, pz, rot)(s * w * 0.22, 1.3);
      addGeo(TRIM, g.box(0.18, 2.4, 0.18), qx, CURB + 1.4, qz, rot, '#efeadf');
    }
    const dk = K('door', () => std({ color: 0x3a2216, roughness: 0.7 }));
    const [dx, dz] = L(-w * 0.15, d / 2 + 0.03);
    quadOnFace(dk, dx, CURB + 1.15, dz, 1.0, 2.1, rot);
    // garage
    if (r() < 0.6) {
      const [gx, gz] = L(w / 2 + 3.2, 0.5);
      batch.walls(sk, gx, gz, 6.2, 7, CURB, 2.9, rot, 3, 3.1, { snapU: true });
      batch.top(ROOF, gx, gz, 6.4, 7.2, CURB + 2.95, rot, 6);
      const gd = K('garageDoor', () => {
        const cv = canvas(128, 128);
        const c2 = cv.getContext('2d');
        c2.fillStyle = '#d8d2c4';
        c2.fillRect(0, 0, 128, 128);
        c2.fillStyle = 'rgba(0,0,0,0.18)';
        for (let i = 0; i < 4; i++) c2.fillRect(0, i * 32 + 28, 128, 4);
        grime(c2, 128, 128, 66, 0.4, true);
        return std({ map: toTex(cv, { repeat: false }) });
      });
      const [ddx, ddz] = frame(gx, gz, rot)(0, 3.53);
      quadOnFace(gd, ddx, CURB + 1.15, ddz, 4.6, 2.3, rot);
      world.addBox(gx, gz, 6.2, 7, rot, 0, 3.2, { minimap: true });
      // driveway
      const { ctx, X, Z, k } = paint;
      const [a1, b1] = frame(gx, gz, rot)(0, 3.5);
      const [a2, b2] = frame(gx, gz, rot)(0, 3.5 + 9);
      ctx.strokeStyle = '#a49e92';
      ctx.lineWidth = 4.8 * k;
      ctx.beginPath();
      ctx.moveTo(X(a1), Z(b1));
      ctx.lineTo(X(a2), Z(b2));
      ctx.stroke();
    }
    // chimney
    if (r() < 0.5) {
      const [cx2, cz2] = L(-w / 2 + 1, 0);
      addGeo(plainK(STYLES[1]), g.box(1, h + 4, 1.2), cx2, CURB + (h + 4) / 2, cz2, rot);
    }
    world.addBox(cx, cz, w, d, rot, 0, h + 2);
  };
  const houseBlock = (b) => {
    const ix0 = b.x0 + IN + 2, ix1 = b.x1 - IN - 2;
    const iz0 = b.z0 + IN, iz1 = b.z1 - IN;
    const n = Math.floor((ix1 - ix0) / 23);
    const step = (ix1 - ix0) / n;
    for (let i = 0; i < n; i++) {
      const hx = ix0 + step * (i + 0.42);
      paint.lawn(ix0 + step * i + 0.6, iz0, ix0 + step * (i + 1) - 0.6, (iz0 + iz1) / 2 - 0.6, 'rgba(86,108,42,0.95)');
      paint.lawn(ix0 + step * i + 0.6, (iz0 + iz1) / 2 + 0.6, ix0 + step * (i + 1) - 0.6, iz1, 'rgba(86,108,42,0.95)');
      house(hx, iz0 + 13, Math.PI);
      house(hx, iz1 - 13, 0);
    }
  };
  for (const id of ['housesE', 'housesSW', 'housesS']) houseBlock(BLOCKS.find((b) => b.id === id));

  // ---------- radar dishes on the NE ridge (destructible) ----------
  {
    const dishMat = new THREE.MeshStandardMaterial({ color: 0xd8d4ca, roughness: 0.55, metalness: 0.2, side: THREE.DoubleSide });
    const metal = new THREE.MeshStandardMaterial({ color: 0x8c8a84, roughness: 0.5, metalness: 0.6 });
    const pts = [];
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      pts.push(new THREE.Vector2(t * 9, t * t * 2.6));
    }
    const dishGeo = new THREE.LatheGeometry(pts, 32);
    const spots = [
      [-20, 12],
      [10, -16],
      [22, 16],
    ];
    for (const [ox, oz] of spots) {
      const x = RADAR_SITE.x + ox, z = RADAR_SITE.z + oz;
      const y = terrainH(x, z);
      const grp = new THREE.Group();
      grp.position.set(x, y, z);
      const ped = new THREE.Mesh(new THREE.BoxGeometry(4, 4, 4), new THREE.MeshStandardMaterial({ map: concreteTex('#a39a8b', 0), roughness: 0.9 }));
      ped.position.y = 2;
      grp.add(ped);
      const yoke = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.2, 4, 10), metal);
      yoke.position.y = 6;
      grp.add(yoke);
      const head = new THREE.Group();
      head.position.y = 8.2;
      head.rotation.y = Math.atan2(-x, -z) + (r() - 0.5) * 0.6;
      const tilt = new THREE.Group();
      tilt.rotation.x = -0.75;
      const dish = new THREE.Mesh(dishGeo, dishMat);
      dish.rotation.x = Math.PI / 2;
      dish.position.z = 0.5;
      tilt.add(dish);
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2;
        const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 7.5, 5), metal);
        strut.position.set(Math.cos(a) * 3, Math.sin(a) * 3, 3.6);
        strut.lookAt(0, 0, 7.6);
        strut.rotateX(Math.PI / 2);
        tilt.add(strut);
      }
      const feed = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, 1.4, 8), metal);
      feed.rotation.x = Math.PI / 2;
      feed.position.z = 7.6;
      tilt.add(feed);
      head.add(tilt);
      grp.add(head);
      grp.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
        }
      });
      world.scene.add(grp);
      const c = world.addCircle(x, z, 3, y - 1, y + 14, { name: 'Radar Dish' });
      world.targets.push({ name: 'Radar Dish', pos: new THREE.Vector3(x, y + 8, z), r: 6, hp: 120, maxHp: 120, group: grp, tilt, head, collider: c, dead: false });
    }
    world.landmarks.radar = new THREE.Vector3(RADAR_SITE.x, 20, RADAR_SITE.z);
  }

  // ---------- wind farm on the hills ----------
  {
    const towerMat = new THREE.MeshStandardMaterial({ color: 0xe0dcd2, roughness: 0.6 });
    const towerGeo = new THREE.CylinderGeometry(0.9, 2, 1, 12);
    const bladeGeo = new THREE.BoxGeometry(1.4, 26, 0.4);
    bladeGeo.translate(0, 13.5, 0);
    const navGeo = new THREE.BoxGeometry(2.4, 2.4, 6);
    const spots = [];
    for (let i = 0; i < 26; i++) {
      const a = lerp(-2.6, 0.9, i / 25) + (r() - 0.5) * 0.06;
      const dist = 470 + r() * 120;
      spots.push([Math.cos(a) * dist, Math.sin(a) * dist]);
    }
    for (const [x, z] of spots) {
      const y = terrainH(x, z) - 1;
      const h = 48 + r() * 10;
      const tower = new THREE.Mesh(towerGeo, towerMat);
      tower.scale.y = h;
      tower.position.set(x, y + h / 2, z);
      world.scene.add(tower);
      const hub = new THREE.Group();
      hub.position.set(x, y + h + 1, z);
      hub.rotation.y = Math.atan2(-x, -z) + 0.6;
      const nav = new THREE.Mesh(navGeo, towerMat);
      hub.add(nav);
      const rotor = new THREE.Group();
      rotor.position.z = 3.4;
      for (let b = 0; b < 3; b++) {
        const bl = new THREE.Mesh(bladeGeo, towerMat);
        bl.rotation.z = (b / 3) * Math.PI * 2;
        rotor.add(bl);
      }
      rotor.rotation.z = r() * 6;
      hub.add(rotor);
      world.scene.add(hub);
      const speed = 0.5 + r() * 0.5;
      world.animated.push((dt) => (rotor.rotation.z += dt * speed));
    }
  }

  // ---------- power lines along the outer roads ----------
  {
    const poleGeo = new THREE.CylinderGeometry(0.16, 0.22, 11, 6);
    const armGeo = new THREE.BoxGeometry(3.2, 0.18, 0.18);
    const wirePts = [];
    for (const side of [-1, 1]) {
      const x = side * 252;
      let prev = null;
      for (let z = -170; z <= 270; z += 40) {
        addGeo(TRIM, poleGeo, x, 5.5, z, 0, '#4f3d2c');
        addGeo(TRIM, armGeo, x, 10.2, z, 0, '#4f3d2c');
        world.addCircle(x, z, 0.35, 0, 11, { minimap: false });
        if (prev) for (const o of [-1.4, 0, 1.4]) wirePts.push([new THREE.Vector3(x + o, 10.4, prev), new THREE.Vector3(x + o, 10.4, z)]);
        prev = z;
      }
    }
    const pos = [];
    for (const [a, b] of wirePts) {
      const N = 8;
      for (let i = 0; i < N; i++) {
        const t0 = i / N, t1 = (i + 1) / N;
        const sag = (t) => -Math.sin(t * Math.PI) * 1.4;
        pos.push(lerp(a.x, b.x, t0), a.y + sag(t0), lerp(a.z, b.z, t0), lerp(a.x, b.x, t1), a.y + sag(t1), lerp(a.z, b.z, t1));
      }
    }
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    world.scene.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0x1e1a16 })));
  }

  // ---------- billboards on the outer belt ----------
  {
    const boards = [
      ['WELCOME TO SUNSPRINGS', -150, 282, 0],
      ['VOTE CALYPSO', 150, -282, Math.PI],
      ['EAT AT THE DINER', 282, 60, -Math.PI / 2],
      ['GO EAGLES! BEAT EAST HIGH', -282, -40, Math.PI / 2],
    ];
    for (const [txt, x, z, rot] of boards) {
      const k2 = signK(txt, { bg: '#e2d6b6', fg: '#3a2418', w: 1024, h: 384, size: 110, font: 'Rye, serif' });
      quadOnFace(k2, x, 7.5, z, 14, 5.2, rot + Math.PI);
      quadOnFace(K('boardBack', () => std({ color: 0x4a4038 })), x, 7.5, z, 14.2, 5.4, rot);
      const L = frame(x, z, rot);
      for (const s of [-4, 4]) {
        const [px, pz] = L(s, 0.2);
        addGeo(TRIM, g.box(0.4, 7.5, 0.4), px, 3.75, pz, rot, '#4f3d2c');
        world.addCircle(px, pz, 0.4, 0, 10, { minimap: false });
      }
    }
  }

  // ---------- spawn points, pickups, health ----------
  world.spawns = [
    [0, 200, Math.PI],
    [0, -120, 0],
    [-110, 100, Math.PI],
    [120, -100, 0],
    [-240, -20, 0],
    [240, 20, Math.PI],
    [-60, -150, Math.PI / 2],
    [60, 150, -Math.PI / 2],
    [-200, 250, Math.PI / 2],
    [200, -150, -Math.PI / 2],
    [30, 100, Math.PI / 2],
    [-175, 74, 0],
    [275, -275, Math.PI * 0.75],
    [-275, 270, -Math.PI * 0.25],
  ].map(([x, z, a]) => ({ x, z, a }));

  const P = (x, z, kind = 'weapon') => world.pickupSpots.push({ x, z, kind });
  // weapon pickups on roads, lots, plaza, stadium and up the ridge
  [
    [0, -100], [0, 0], [0, 100], [0, 200], [-110, -100], [-110, 0], [-110, 200], [120, -100], [120, 0], [120, 100], [120, 200],
    [-240, -100], [-240, 100], [-240, 200], [240, -100], [240, 100], [240, 200], [-60, -150], [60, -150], [-180, -150], [180, -150],
    [-60, 150], [60, 150], [-180, 150], [180, 150], [-60, 250], [60, 250], [-180, 250], [180, 250], [-60, -50], [60, -50], [-180, -50], [180, -50],
    [60, 50], [180, 50], [-45, -185], [45, -185], [-176, 74], [-176, 40], [-176, 110], [35, 85], [35, 120], [-40, 84], [RADAR_SITE.x - 10, RADAR_SITE.z + 5],
    [-275, -275], [275, 270], [-275, 270], [275, -150], [-275, 0], [0, -278], [0, 280], [146, -6], [-67, -100], [67, 0], [-67, 0], [72, -100],
  ].forEach(([x, z]) => P(x, z));
  [
    [0, -20], [-110, 60], [120, -40], [-240, 60], [240, -40], [0, 230], [-176, 74], [80, 200], [-60, -185],
  ].forEach(([x, z]) => P(x, z, 'health'));
  [
    [0, 140], [-110, -140], [120, 140], [-240, 240], [240, -140], [60, -100],
  ].forEach(([x, z]) => P(x, z, 'turbo'));
}

export { STYLES };
// keep imports referenced for tree-shaking linters
void bricks;
void outside;
