// Vehicle roster: stats, specials and procedural models. Each body is a side-profile
// extrusion with a tapered greenhouse; its livery is painted on a canvas atlas that is
// box-projected onto the body (left/right sides, top, front, back), so windows, lights,
// stripes, rust and decals all come from code.
import * as THREE from 'three';
import { rng, lerp, clamp } from './core.js';
import { canvas, toTex, grime } from './textures.js';
import { mergeGeometries } from 'three/addons/BufferGeometryUtils.js';

// speeds are mph (base / turbo) like the TM 2012 garage; hp are raw health points
export const VEHICLES = [
  {
    id: 'sweettooth', name: 'Sweet Tooth', driver: 'Needles Kane', hp: 250, mph: [60, 125], mass: 3400, accel: 15, grip: 7.5, turn: 1.9,
    rating: { speed: 2, armor: 4, special: 5 }, special: { name: 'Laughing Ghost', ammo: 2, regen: 9 }, alt: { name: 'Sweet Bot', cost: 2 },
    specialsText: ['Laughing Ghost', 'Sweet Bot'], color: '#d9c3b4', wheelR: 0.48, size: [2.5, 3.2, 6.4],
  },
  {
    id: 'roadkill', name: 'Roadkill', driver: 'Marcus Kane', hp: 160, mph: [90, 135], mass: 1700, accel: 20, grip: 9, turn: 2.3,
    rating: { speed: 3, armor: 3, special: 3 }, special: { name: 'Charge Missiles', ammo: 2, regen: 8 }, alt: { name: 'Gatling', cost: 1 },
    specialsText: ['Charge Missiles', 'Gatling Barrage'], color: '#1c1c1d', wheelR: 0.4, size: [2.0, 1.45, 4.8],
  },
  {
    id: 'kamikaze', name: 'Kamikaze', driver: 'Yuki', hp: 150, mph: [110, 150], mass: 1500, accel: 23, grip: 10, turn: 2.5,
    rating: { speed: 4, armor: 2, special: 3 }, special: { name: 'Flame Thrower', ammo: 100, regen: 14, fuel: true }, alt: { name: 'Shock Freeze', cost: 40 },
    specialsText: ['Flame Thrower', 'Shock Freeze'], color: '#b9b7b2', wheelR: 0.38, size: [1.95, 1.35, 4.6],
  },
  {
    id: 'outlaw', name: 'Outlaw', driver: 'Sgt. Carl Roberts', hp: 200, mph: [85, 135], mass: 2300, accel: 18, grip: 8.5, turn: 2.2,
    rating: { speed: 3, armor: 3, special: 3 }, special: { name: 'SUV Turret', ammo: 100, regen: 10, fuel: true }, alt: { name: 'Tazer', cost: 35 },
    specialsText: ['SUV Turret', 'Tazer'], color: '#141516', wheelR: 0.45, size: [2.15, 1.95, 5.0],
  },
  {
    id: 'meatwagon', name: 'Meat Wagon', driver: 'Dr. Kevorkian', hp: 210, mph: [65, 130], mass: 2600, accel: 16, grip: 8, turn: 2.0,
    rating: { speed: 2, armor: 4, special: 4 }, special: { name: 'Gurney Bomb', ammo: 1, regen: 10 }, alt: { name: 'Guided Gurney', cost: 1 },
    specialsText: ['Gurney Bomb', 'Guided Gurney'], color: '#e7e2d6', wheelR: 0.42, size: [2.1, 1.9, 6.2],
  },
  {
    id: 'axel', name: 'Axel', driver: 'Axel', hp: 180, mph: [85, 135], mass: 1900, accel: 19, grip: 9.5, turn: 3.0,
    rating: { speed: 3, armor: 3, special: 3 }, special: { name: 'Shockwave', ammo: 1, regen: 7 }, alt: { name: 'Axel Smash', cost: 1 },
    specialsText: ['Shockwave', 'Axel Smash'], color: '#5c5650', wheelR: 1.45, size: [3.4, 2.9, 2.0],
  },
  {
    id: 'crimsonfury', name: 'Crimson Fury', driver: 'Agent Stone', hp: 110, mph: [120, 155], mass: 1350, accel: 26, grip: 10.5, turn: 2.6,
    rating: { speed: 5, armor: 1, special: 3 }, special: { name: 'Phantom Shotgun', ammo: 2, regen: 6 }, alt: { name: 'Vanish', cost: 1 },
    specialsText: ['Phantom Shotgun', 'Vanish'], color: '#9e1612', wheelR: 0.37, size: [2.05, 1.15, 4.7],
  },
  {
    id: 'reaper', name: 'Reaper', driver: 'Mr. Grimm', hp: 90, mph: [90, 135], mass: 700, accel: 24, grip: 11, turn: 3.0,
    rating: { speed: 4, armor: 1, special: 5 }, special: { name: 'Flaming Chainsaw', ammo: 2, regen: 7 }, alt: { name: 'RPG', cost: 1 },
    specialsText: ['Flaming Chainsaw', 'RPG'], color: '#1d1c1b', wheelR: 0.36, size: [0.9, 1.6, 3.0], bike: true,
  },
  {
    id: 'darkside', name: 'Darkside', driver: 'Dollface', hp: 280, mph: [55, 115], mass: 6500, accel: 13, grip: 7, turn: 1.6,
    rating: { speed: 1, armor: 5, special: 3 }, special: { name: 'Darkside Slam', ammo: 1, regen: 9 }, alt: { name: 'Ram Shield', cost: 1 },
    specialsText: ['Darkside Slam', 'Ram Shield'], color: '#121213', wheelR: 0.55, size: [2.6, 3.4, 7.2],
  },
  {
    id: 'vermin', name: 'Vermin', driver: 'Rat Man', hp: 180, mph: [75, 130], mass: 2400, accel: 16, grip: 8, turn: 2.0,
    rating: { speed: 2, armor: 3, special: 4 }, special: { name: 'Rat Rocket', ammo: 1, regen: 9 }, alt: { name: 'Rat Mortar', cost: 1 },
    specialsText: ['Rat Rocket', 'Rat Mortar'], color: '#d6b320', wheelR: 0.44, size: [2.2, 2.6, 5.3],
  },
  {
    id: 'shadow', name: 'Shadow', driver: 'The Preacher', hp: 170, mph: [85, 135], mass: 2200, accel: 18, grip: 8.5, turn: 2.2,
    rating: { speed: 3, armor: 3, special: 4 }, special: { name: 'Soul Shadow', ammo: 1, regen: 8 }, alt: { name: 'Death Coffin', cost: 1 },
    specialsText: ['Soul Shadow', 'Death Coffin'], color: '#161417', wheelR: 0.42, size: [2.05, 1.6, 6.0],
  },
  {
    id: 'junkyarddog', name: 'Junkyard Dog', driver: 'Grimm Bros.', hp: 230, mph: [65, 125], mass: 3600, accel: 15, grip: 7.6, turn: 1.9,
    rating: { speed: 2, armor: 4, special: 4 }, special: { name: 'Taxi Slam', ammo: 1, regen: 10 }, alt: { name: 'Repair Hook', cost: 1 },
    specialsText: ['Taxi Slam', 'Repair Hook'], color: '#6d6a3a', wheelR: 0.5, size: [2.4, 2.4, 6.6],
  },
];
export const byId = Object.fromEntries(VEHICLES.map((v) => [v.id, v]));

// ---------- shared part materials ----------
let M = null;
export function partMats(envMap) {
  if (M) return M;
  const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0.2, envMap, envMapIntensity: 0.7, ...o });
  M = {
    gun: std({ color: 0x2b2b2b, metalness: 0.8, roughness: 0.35 }),
    chrome: std({ color: 0xa8a8a6, metalness: 1, roughness: 0.25, envMapIntensity: 0.75 }),
    black: std({ color: 0x151515, roughness: 0.7 }),
    rubber: std({ color: 0x181716, roughness: 0.95, metalness: 0 }),
    rim: std({ color: 0x9a9a96, metalness: 0.85, roughness: 0.3 }),
    rust: std({ color: 0x5a3a22, roughness: 0.95, metalness: 0.2 }),
    skin: std({ color: 0xd8b08c, roughness: 0.8, metalness: 0 }),
    cloth: std({ color: 0x2c2c30, roughness: 0.9, metalness: 0 }),
    red: std({ color: 0xa8201a, roughness: 0.5 }),
    white: std({ color: 0xe8e4da, roughness: 0.55 }),
    yellow: std({ color: 0xd6b320, roughness: 0.5 }),
    glass: std({ color: 0x15191c, roughness: 0.05, metalness: 0.9, envMapIntensity: 1.4 }),
    head: new THREE.MeshBasicMaterial({ color: 0xfff2c8, toneMapped: false }),
    tail: new THREE.MeshBasicMaterial({ color: 0xff2a1a, toneMapped: false }),
    blue: new THREE.MeshBasicMaterial({ color: 0x3a6aff, toneMapped: false }),
    redL: new THREE.MeshBasicMaterial({ color: 0xff2020, toneMapped: false }),
    purple: new THREE.MeshBasicMaterial({ color: 0xb04aff, toneMapped: false }),
  };
  return M;
}

// ---------- body from profile ----------
const ATLAS = 1024;
const REG = {
  L: [0, 0, 1024, 320],
  R: [0, 320, 1024, 320],
  T: [0, 640, 512, 384],
  F: [512, 640, 256, 384],
  B: [768, 640, 256, 384],
};

function makeBody(spec) {
  const { profile, width, belt = 99, taper = 1, bevel = 0.06 } = spec;
  const shape = new THREE.Shape();
  shape.moveTo(profile[0][0], profile[0][1]);
  for (let i = 1; i < profile.length; i++) shape.lineTo(profile[i][0], profile[i][1]);
  shape.closePath();
  const depth = width - bevel * 2;
  let geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel * 0.8,
    bevelSegments: 2,
    curveSegments: 4,
  });
  geo.rotateY(-Math.PI / 2); // shape x -> +z (forward), extrusion -> -x
  geo.translate(depth / 2, 0, 0);
  if (geo.index) geo = geo.toNonIndexed();
  const p = geo.attributes.position;
  let maxY = -1e9;
  for (let i = 0; i < p.count; i++) maxY = Math.max(maxY, p.getY(i));
  // taper the greenhouse
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    if (y > belt) {
      const t = clamp((y - belt) / (maxY - belt), 0, 1);
      const f = typeof taper === 'function' ? taper(p.getZ(i), y, t) : lerp(1, taper, t);
      p.setX(i, p.getX(i) * f);
    }
  }
  geo.computeVertexNormals();
  geo.computeBoundingBox();
  const bb = geo.boundingBox;
  // box-projected atlas uvs (per triangle by dominant normal)
  const uv = new Float32Array(p.count * 2);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3();
  const len = bb.max.z - bb.min.z, hgt = bb.max.y - bb.min.y, wid = bb.max.x - bb.min.x;
  for (let i = 0; i < p.count; i += 3) {
    a.fromBufferAttribute(p, i);
    b.fromBufferAttribute(p, i + 1);
    c.fromBufferAttribute(p, i + 2);
    n.subVectors(c, b).cross(new THREE.Vector3().subVectors(a, b)).normalize();
    const ax = Math.abs(n.x), ay = Math.abs(n.y), az = Math.abs(n.z);
    for (let k = 0; k < 3; k++) {
      const v = k === 0 ? a : k === 1 ? b : c;
      let cx, cy;
      if (ax >= ay && ax >= az) {
        const reg = n.x < 0 ? REG.L : REG.R;
        const fu = n.x < 0 ? (v.z - bb.min.z) / len : (bb.max.z - v.z) / len;
        cx = reg[0] + fu * reg[2];
        cy = reg[1] + (1 - (v.y - bb.min.y) / hgt) * reg[3];
      } else if (ay >= az) {
        if (n.y < 0) {
          cx = 1015;
          cy = 1015;
        } else {
          const reg = REG.T;
          cx = reg[0] + ((v.z - bb.min.z) / len) * reg[2];
          cy = reg[1] + ((v.x - bb.min.x) / wid) * reg[3];
        }
      } else {
        const reg = n.z > 0 ? REG.F : REG.B;
        const fu = n.z > 0 ? (v.x - bb.min.x) / wid : (bb.max.x - v.x) / wid;
        cx = reg[0] + fu * reg[2];
        cy = reg[1] + (1 - (v.y - bb.min.y) / hgt) * reg[3];
      }
      uv[(i + k) * 2] = cx / ATLAS;
      uv[(i + k) * 2 + 1] = 1 - cy / ATLAS;
    }
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return { geo, bb };
}

// painter helpers in vehicle coordinates
function painter(bb) {
  const col = canvas(ATLAS, ATLAS);
  const rm = canvas(ATLAS, ATLAS);
  const ctx = col.getContext('2d');
  const rtx = rm.getContext('2d');
  const len = bb.max.z - bb.min.z, hgt = bb.max.y - bb.min.y, wid = bb.max.x - bb.min.x;
  const sideMap = (side) => (z, y) => {
    const reg = side === 'L' ? REG.L : REG.R;
    const fu = side === 'L' ? (z - bb.min.z) / len : (bb.max.z - z) / len;
    return [reg[0] + fu * reg[2], reg[1] + (1 - (y - bb.min.y) / hgt) * reg[3]];
  };
  const topMap = (z, x) => [REG.T[0] + ((z - bb.min.z) / len) * REG.T[2], REG.T[1] + ((x - bb.min.x) / wid) * REG.T[3]];
  const frontMap = (x, y) => [REG.F[0] + ((x - bb.min.x) / wid) * REG.F[2], REG.F[1] + (1 - (y - bb.min.y) / hgt) * REG.F[3]];
  const backMap = (x, y) => [REG.B[0] + ((bb.max.x - x) / wid) * REG.B[2], REG.B[1] + (1 - (y - bb.min.y) / hgt) * REG.B[3]];
  const P = {
    ctx, rtx, col, rm, bb, len, hgt, wid,
    sideMap, topMap, frontMap, backMap,
    // fill whole atlas with base paint
    base(color, rough = 0.45, metal = 0.35) {
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, ATLAS, ATLAS);
      rtx.fillStyle = `rgb(0,${Math.round(rough * 255)},${Math.round(metal * 255)})`;
      rtx.fillRect(0, 0, ATLAS, ATLAS);
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(1000, 1000, 24, 24);
    },
    poly(map, pts, fill, rough, metal) {
      const path = () => {
        const [x0, y0] = map(...pts[0]);
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(...map(...pts[i]));
        ctx.closePath();
      };
      path();
      ctx.fillStyle = fill;
      ctx.fill();
      if (rough !== undefined) {
        const [x0, y0] = map(...pts[0]);
        rtx.beginPath();
        rtx.moveTo(x0, y0);
        for (let i = 1; i < pts.length; i++) rtx.lineTo(...map(...pts[i]));
        rtx.closePath();
        rtx.fillStyle = `rgb(0,${Math.round(rough * 255)},${Math.round((metal ?? 0.3) * 255)})`;
        rtx.fill();
      }
    },
    // side polygon drawn on both sides
    side(pts, fill, rough, metal) {
      P.poly(sideMap('L'), pts, fill, rough, metal);
      P.poly(sideMap('R'), pts, fill, rough, metal);
    },
    glassSide(pts) {
      for (const s of ['L', 'R']) {
        const m = sideMap(s);
        P.poly(m, pts, '#101317', 0.06, 0.9);
        // reflection streak
        ctx.save();
        const [x0, y0] = m(...pts[0]);
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(...m(...pts[i]));
        ctx.closePath();
        ctx.clip();
        const g = ctx.createLinearGradient(x0, y0 - 60, x0 + 120, y0 + 40);
        g.addColorStop(0, 'rgba(255,214,160,0.0)');
        g.addColorStop(0.5, 'rgba(255,214,160,0.22)');
        g.addColorStop(1, 'rgba(255,214,160,0.0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, ATLAS, 640);
        ctx.restore();
      }
    },
    // glass band on the top region between z0..z1 (windshield / rear window)
    glassTop(z0, z1, inset = 0.12) {
      P.poly(topMap, [
        [z0, bb.min.x + wid * inset],
        [z1, bb.min.x + wid * inset],
        [z1, bb.max.x - wid * inset],
        [z0, bb.max.x - wid * inset],
      ], '#111418', 0.05, 0.9);
    },
    glassFront(y0, y1, inset = 0.08) {
      P.rectFB('F', bb.min.x + wid * inset, y0, bb.max.x - wid * inset, y1, '#111418', 0.05, 0.9);
      const [x0, yy0] = frontMap(bb.min.x + wid * inset, y1);
      const [x1, yy1] = frontMap(bb.max.x - wid * inset, y0);
      const g = ctx.createLinearGradient(x0, yy0, x1, yy1);
      g.addColorStop(0.2, 'rgba(255,214,160,0)');
      g.addColorStop(0.45, 'rgba(255,214,160,0.25)');
      g.addColorStop(0.6, 'rgba(255,214,160,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x0, yy0, x1 - x0, yy1 - yy0);
    },
    glassBack(y0, y1, inset = 0.1) {
      P.rectFB('B', bb.min.x + wid * inset, y0, bb.max.x - wid * inset, y1, '#111418', 0.05, 0.9);
    },
    stripeTop(z0, z1, x0, x1, color) {
      P.poly(topMap, [
        [z0, x0],
        [z1, x0],
        [z1, x1],
        [z0, x1],
      ], color);
    },
    // filled rectangle on front or back (x,y coords)
    rectFB(which, x0, y0, x1, y1, fill, rough, metal) {
      const map = which === 'F' ? frontMap : backMap;
      P.poly(map, [
        [x0, y0],
        [x1, y0],
        [x1, y1],
        [x0, y1],
      ], fill, rough, metal);
    },
    textSide(text, z, y, size, color, font = 'Oswald, sans-serif', stroke) {
      for (const s of ['L', 'R']) {
        const [x, yy] = sideMap(s)(z, y);
        ctx.save();
        ctx.font = `700 ${size}px ${font}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        if (stroke) {
          ctx.strokeStyle = stroke;
          ctx.lineWidth = size * 0.12;
          ctx.strokeText(text, x, yy);
        }
        ctx.fillStyle = color;
        ctx.fillText(text, x, yy);
        ctx.restore();
      }
    },
    textBack(text, x, y, size, color, font = 'Oswald, sans-serif') {
      const [cx, cy] = backMap(x, y);
      ctx.save();
      ctx.font = `700 ${size}px ${font}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = color;
      ctx.fillText(text, cx, cy);
      ctx.restore();
    },
    // dirt, scratches and rust patches over everything
    weather(seed, amount = 0.4, rust = 0.3) {
      const r = rng(seed);
      for (let i = 0; i < 90 * rust; i++) {
        const x = r() * ATLAS, y = r() * ATLAS;
        const rr = 6 + r() * 26;
        const g = ctx.createRadialGradient(x, y, 0, x, y, rr);
        g.addColorStop(0, 'rgba(92,52,24,0.85)');
        g.addColorStop(0.6, 'rgba(110,64,30,0.45)');
        g.addColorStop(1, 'rgba(110,64,30,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(x, y, rr, rr * (0.5 + r()), r() * 3, 0, Math.PI * 2);
        ctx.fill();
        rtx.fillStyle = 'rgba(0,230,30,0.7)';
        rtx.beginPath();
        rtx.ellipse(x, y, rr * 0.6, rr * 0.4, 0, 0, Math.PI * 2);
        rtx.fill();
      }
      ctx.strokeStyle = 'rgba(200,190,170,0.35)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 160; i++) {
        const x = r() * ATLAS, y = r() * 640;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + (r() - 0.5) * 60, y + (r() - 0.5) * 10);
        ctx.stroke();
      }
      grime(ctx, ATLAS, ATLAS, seed, amount, false);
      // dirt splash along the bottom of the sides
      for (const reg of [REG.L, REG.R]) {
        const g = ctx.createLinearGradient(0, reg[1] + reg[3] * 0.62, 0, reg[1] + reg[3]);
        g.addColorStop(0, 'rgba(70,50,30,0)');
        g.addColorStop(1, 'rgba(70,50,30,0.75)');
        ctx.fillStyle = g;
        ctx.fillRect(reg[0], reg[1] + reg[3] * 0.62, reg[2], reg[3] * 0.38);
      }
    },
    // wheel arch shadows on the sides
    arches(wheels, r) {
      for (const w of wheels) {
        for (const s of ['L', 'R']) {
          const m = sideMap(s);
          const [cx, cy] = m(w.z, r);
          const [ex] = m(w.z + r * 1.15, r);
          const rad = Math.abs(ex - cx);
          ctx.fillStyle = '#0b0b0b';
          ctx.beginPath();
          ctx.arc(cx, cy, rad, Math.PI, 0);
          ctx.lineTo(cx + rad, cy + rad);
          ctx.lineTo(cx - rad, cy + rad);
          ctx.fill();
        }
      }
    },
    build(envMap, opt = {}) {
      const map = toTex(col, { repeat: false });
      const rmt = toTex(rm, { repeat: false, srgb: false });
      return new THREE.MeshStandardMaterial({ map, roughnessMap: rmt, metalnessMap: rmt, roughness: 1, metalness: 1, envMap, envMapIntensity: 1.0, ...opt });
    },
  };
  return P;
}

// ---------- reusable parts ----------
function box(w, h, d, mat, x, y, z, parent, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  parent.add(m);
  return m;
}
function cyl(r1, r2, h, mat, x, y, z, parent, rx = 0, ry = 0, rz = 0, seg = 12) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), mat);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  parent.add(m);
  return m;
}
function gunPair(parent, x, y, z, len = 1.1, spread = 0.18, mats) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  box(0.36, 0.22, 0.5, mats.gun, 0, 0, 0, g);
  for (const s of [-1, 1]) {
    cyl(0.045, 0.05, len, mats.gun, s * spread * 0.5, 0.02, len / 2 + 0.15, g, Math.PI / 2);
    cyl(0.07, 0.07, 0.12, mats.gun, s * spread * 0.5, 0.02, len + 0.1, g, Math.PI / 2);
  }
  mergeStatic(g, new Set());
  parent.add(g);
  return g;
}
function lights(parent, mats, list) {
  for (const [kind, x, y, z, w, h] of list) {
    const m = box(w, h, 0.05, kind === 'head' ? mats.head : mats.tail, x, y, z, parent);
    m.userData.light = kind;
  }
}
function wheelMesh(r, w, mats, style = 'rim', big = false) {
  const g = new THREE.Group();
  if (big) {
    // Axel's giant tires: knobby tread ring, dished rim plate, spokes and a hub
    const tire = new THREE.Mesh(new THREE.TorusGeometry(r * 0.78, r * 0.24, 10, 36), mats.rubber);
    tire.rotation.y = Math.PI / 2;
    tire.scale.set(1, 1, w / (r * 0.48));
    g.add(tire);
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      const lug = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, 0.12, 0.28), mats.rubber);
      lug.position.set(0, Math.cos(a) * r * 0.99, Math.sin(a) * r * 0.99);
      lug.rotation.x = -a;
      g.add(lug);
    }
    for (const s of [-1, 1]) {
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.58, r * 0.62, 0.08, 24), mats.gun);
      plate.rotation.z = Math.PI / 2;
      plate.position.x = s * w * 0.18;
      g.add(plate);
    }
    for (let i = 0; i < 6; i++) {
      const sp = new THREE.Mesh(new THREE.BoxGeometry(0.1, r * 1.1, 0.14), mats.rim);
      sp.rotation.x = (i / 6) * Math.PI;
      sp.position.x = w * 0.3;
      g.add(sp);
    }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.2, r * 0.26, w * 1.1, 10), mats.chrome);
    hub.rotation.z = Math.PI / 2;
    g.add(hub);
    return g;
  }
  const tire = new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, 22, 1), mats.rubber);
  tire.rotation.z = Math.PI / 2;
  g.add(tire);
  // tread blocks
  const tread = new THREE.Mesh(new THREE.TorusGeometry(r * 0.97, w * 0.08, 4, 22), mats.rubber);
  tread.rotation.y = Math.PI / 2;
  tread.scale.set(1, 1, 1);
  g.add(tread);
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.6, r * 0.6, w * 1.02, style === 'steel' ? 10 : 6), style === 'black' ? mats.gun : mats.rim);
  rim.rotation.z = Math.PI / 2;
  g.add(rim);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.2, r * 0.2, w * 1.08, 8), mats.chrome);
  hub.rotation.z = Math.PI / 2;
  g.add(hub);
  mergeStatic(g, new Set());
  return g;
}

// ---------- the models ----------
const BUILD = {};

BUILD.sweettooth = (g, env, mats) => {
  const prof = [
    [-3.2, 0.42], [3.22, 0.42], [3.28, 1.05], [2.55, 1.32], [1.95, 1.45], [1.55, 2.45], [1.32, 3.12], [-3.12, 3.18], [-3.24, 2.95], [-3.24, 0.55],
  ];
  const { geo, bb } = makeBody({ profile: prof, width: 2.5, belt: 2.6, taper: 0.96, bevel: 0.07 });
  const P = painter(bb);
  P.base('#d4bcad', 0.6, 0.25);
  // two-tone: lower band pink-red, polka dots
  P.side([[-3.3, 0.4], [3.3, 0.4], [3.3, 1.05], [-3.3, 1.05]], '#8a2a24', 0.6, 0.2);
  const r = rng(5);
  for (let i = 0; i < 60; i++) {
    const z = -3 + r() * 4.4, y = 1.3 + r() * 1.7;
    for (const s of ['L', 'R']) {
      const [x, yy] = P.sideMap(s)(z, y);
      P.ctx.fillStyle = r() < 0.5 ? '#a8261c' : '#c0392b';
      P.ctx.beginPath();
      P.ctx.arc(x, yy, 8 + r() * 10, 0, Math.PI * 2);
      P.ctx.fill();
    }
  }
  // serving window + menu board
  P.side([[-1.8, 1.55], [0.6, 1.55], [0.6, 2.6], [-1.8, 2.6]], '#2a1e18', 0.5, 0.2);
  P.glassSide([[-1.7, 1.65], [0.5, 1.65], [0.5, 2.5], [-1.7, 2.5]]);
  P.side([[-1.85, 1.45], [0.65, 1.45], [0.65, 1.55], [-1.85, 1.55]], '#c8c0b0', 0.3, 0.8);
  P.textSide('ICE CREAM', -0.6, 2.85, 46, '#f3e6c8', 'Rye, serif', '#5a1a12');
  // cab door + window
  P.glassSide([[1.6, 1.6], [1.95, 1.55], [1.55, 2.4], [1.32, 2.42], [1.32, 1.6]]);
  P.side([[1.25, 0.6], [1.3, 2.45]], '#000');
  P.glassTop(1.32, 1.58, 0.1);
  // back: weathered plank doors with polka dots, latch rails and the S plate
  P.rectFB('B', -1.25, 0.45, 1.25, 3.2, '#cdb6a4', 0.65, 0.15);
  for (let x = -1.2; x < 1.25; x += 0.2) P.rectFB('B', x, 0.5, x + 0.02, 3.1, 'rgba(70,40,30,0.55)');
  {
    const rb = rng(9);
    for (let i = 0; i < 26; i++) {
      const [cx, cy] = P.backMap(-1.1 + rb() * 2.2, 0.8 + rb() * 2.2);
      P.ctx.fillStyle = rb() < 0.5 ? '#a8261c' : '#bf3a2a';
      P.ctx.beginPath();
      P.ctx.arc(cx, cy, 5 + rb() * 9, 0, Math.PI * 2);
      P.ctx.fill();
    }
  }
  P.rectFB('B', -0.04, 0.5, 0.04, 3.05, '#3a2a22');
  P.rectFB('B', -0.9, 1.5, -0.75, 1.62, '#8a8a84', 0.3, 0.9);
  P.rectFB('B', 0.75, 1.5, 0.9, 1.62, '#8a8a84', 0.3, 0.9);
  P.rectFB('B', -0.42, 1.0, 0.42, 1.55, '#e8dcc6');
  P.textBack('S', 0, 1.27, 70, '#8a1a14', 'Rye, serif');
  P.rectFB('B', -1.2, 0.5, -0.9, 0.75, '#ff3020');
  P.rectFB('B', 0.9, 0.5, 1.2, 0.75, '#ff3020');
  // grille, cab windshield and the destination board above it
  P.rectFB('F', -0.8, 0.55, 0.8, 1.0, '#202020', 0.4, 0.8);
  P.glassFront(1.52, 2.36, 0.07);
  P.rectFB('F', -0.03, 1.5, 0.03, 2.4, '#d4bcad');
  P.rectFB('F', -0.9, 2.55, 0.9, 2.95, '#1a1410');
  {
    const [cx, cy] = P.frontMap(0, 2.75);
    P.ctx.font = '700 22px Rye, serif';
    P.ctx.textAlign = 'center';
    P.ctx.textBaseline = 'middle';
    P.ctx.fillStyle = '#ffb23a';
    P.ctx.fillText('SWEET TOOTH', cx, cy);
  }
  P.weather(11, 0.5, 0.7);
  const body = new THREE.Mesh(geo, P.build(env));
  g.add(body);
  // bumpers
  box(2.6, 0.28, 0.3, mats.chrome, 0, 0.55, 3.3, g);
  box(2.6, 0.28, 0.3, mats.rust, 0, 0.55, -3.3, g);
  lights(g, mats, [
    ['head', -0.85, 1.0, 3.3, 0.36, 0.22],
    ['head', 0.85, 1.0, 3.3, 0.36, 0.22],
    ['tail', -1.05, 0.62, -3.27, 0.24, 0.14],
    ['tail', 1.05, 0.62, -3.27, 0.24, 0.14],
  ]);
  const guns = [gunPair(g, -0.95, 1.2, 2.6, 0.9, 0.2, mats), gunPair(g, 0.95, 1.2, 2.6, 0.9, 0.2, mats)];
  // roof rails
  for (const s of [-1.05, 1.05]) box(0.08, 0.12, 4.2, mats.rust, s, 3.24, -0.9, g);
  // the burning clown head on a spring
  const spring = new THREE.Group();
  spring.position.set(0, 3.2, 0.2);
  const coil = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(Array.from({ length: 40 }, (_, i) => new THREE.Vector3(Math.cos(i * 0.9) * 0.18, i * 0.018, Math.sin(i * 0.9) * 0.18))), 80, 0.035, 5),
    mats.chrome,
  );
  spring.add(coil);
  const head = new THREE.Group();
  head.position.y = 0.95;
  head.scale.setScalar(1.35);
  coil.scale.set(1.2, 1, 1.2);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.42, 18, 14), new THREE.MeshStandardMaterial({ color: 0xe8dccb, roughness: 0.6 }));
  skull.scale.set(1, 1.1, 1);
  head.add(skull);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), new THREE.MeshStandardMaterial({ color: 0xc8140e, roughness: 0.4 }));
  nose.position.set(0, -0.02, 0.42);
  head.add(nose);
  const flameMat = new THREE.MeshStandardMaterial({ color: 0xd8301a, emissive: 0xc8401a, emissiveIntensity: 0.9, roughness: 0.6 });
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.6 + (i % 3) * 0.18, 6), flameMat);
    spike.position.set(Math.cos(a) * 0.36, 0.12 + Math.sin(i) * 0.08, Math.sin(a) * 0.36 - 0.05);
    spike.lookAt(Math.cos(a) * 2, 0.9, Math.sin(a) * 2 - 0.3);
    spike.rotateX(Math.PI / 2);
    head.add(spike);
  }
  for (let i = 0; i < 5; i++) {
    const s = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.75, 6), flameMat);
    s.position.set((i - 2) * 0.16, 0.45, -0.05);
    s.rotation.z = (i - 2) * -0.25;
    head.add(s);
  }
  // grin
  const grin = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.03, 4, 12, Math.PI), new THREE.MeshBasicMaterial({ color: 0x220a06 }));
  grin.position.set(0, -0.14, 0.38);
  grin.rotation.z = Math.PI;
  head.add(grin);
  spring.add(head);
  g.add(spring);
  return {
    guns, head, spring, flamePoint: new THREE.Vector3(0, 4.85, 0.12),
    exhausts: [new THREE.Vector3(-1.0, 0.45, -3.25)],
    missile: new THREE.Vector3(0, 3.6, -1.0),
    wheels: [
      { x: -1.12, z: 2.1, steer: true },
      { x: 1.12, z: 2.1, steer: true },
      { x: -1.12, z: -2.1 },
      { x: 1.12, z: -2.1 },
    ],
    wheelW: 0.36, rimStyle: 'steel',
  };
};

BUILD.roadkill = (g, env, mats) => {
  const prof = [
    [-2.4, 0.32], [2.38, 0.32], [2.45, 0.78], [2.25, 0.92], [0.7, 1.06], [0.45, 1.1], [-0.25, 1.46], [-0.95, 1.46], [-2.15, 1.05], [-2.42, 0.98], [-2.46, 0.45],
  ];
  const { geo, bb } = makeBody({ profile: prof, width: 2.0, belt: 1.08, taper: 0.76, bevel: 0.07 });
  const P = painter(bb);
  P.base('#161617', 0.35, 0.55);
  // white racing stripes over hood, roof and trunk
  P.stripeTop(-2.5, 2.5, -0.38, -0.14, '#e8e4d8');
  P.stripeTop(-2.5, 2.5, 0.14, 0.38, '#e8e4d8');
  P.rectFB('F', -0.38, 0.3, -0.14, 0.95, '#e8e4d8');
  P.rectFB('F', 0.14, 0.3, 0.38, 0.95, '#e8e4d8');
  P.rectFB('B', -0.38, 0.3, -0.14, 1.0, '#e8e4d8');
  P.rectFB('B', 0.14, 0.3, 0.38, 1.0, '#e8e4d8');
  P.glassTop(-0.22, 0.42, 0.14);
  P.glassTop(-2.1, -1.0, 0.16);
  P.glassSide([[0.38, 1.12], [-0.22, 1.42], [-0.9, 1.42], [-1.65, 1.15]]);
  P.side([[-0.55, 1.1], [-0.5, 1.12], [-0.5, 1.44], [-0.55, 1.44]], '#161617');
  // side chrome strip + door seam
  P.side([[-2.4, 0.66], [2.4, 0.66], [2.4, 0.7], [-2.4, 0.7]], '#9a9a96', 0.2, 1);
  P.side([[0.35, 0.4], [0.38, 0.4], [0.38, 1.06], [0.35, 1.06]], '#050505');
  P.rectFB('F', -0.9, 0.5, 0.9, 0.82, '#0c0c0c', 0.4, 0.8);
  P.rectFB('B', -0.95, 0.68, -0.45, 0.88, '#b01510');
  P.rectFB('B', 0.45, 0.68, 0.95, 0.88, '#b01510');
  P.textBack('ROADKILL', 0, 0.55, 30, '#d8d2c4');
  P.weather(21, 0.45, 0.45);
  g.add(new THREE.Mesh(geo, P.build(env)));
  box(2.05, 0.18, 0.2, mats.chrome, 0, 0.45, 2.45, g);
  box(2.05, 0.18, 0.2, mats.chrome, 0, 0.45, -2.48, g);
  // hood scoop + spoiler
  box(0.7, 0.16, 0.9, mats.black, 0, 1.08, 1.2, g, -0.06);
  box(1.9, 0.06, 0.38, mats.black, 0, 1.25, -2.25, g);
  box(0.08, 0.24, 0.2, mats.black, -0.7, 1.12, -2.25, g);
  box(0.08, 0.24, 0.2, mats.black, 0.7, 1.12, -2.25, g);
  lights(g, mats, [
    ['head', -0.72, 0.68, 2.47, 0.3, 0.16],
    ['head', 0.72, 0.68, 2.47, 0.3, 0.16],
    ['tail', -0.7, 0.78, -2.49, 0.5, 0.14],
    ['tail', 0.7, 0.78, -2.49, 0.5, 0.14],
  ]);
  const guns = [gunPair(g, -0.6, 1.12, 0.9, 0.9, 0.16, mats), gunPair(g, 0.6, 1.12, 0.9, 0.9, 0.16, mats)];
  // twin exhaust pipes with nitro
  for (const s of [-0.55, 0.55]) cyl(0.08, 0.08, 0.4, mats.chrome, s, 0.36, -2.5, g, Math.PI / 2);
  // side gunner in pink shirt
  const gunner = new THREE.Group();
  gunner.position.set(1.08, 1.05, 0.2);
  box(0.36, 0.5, 0.3, new THREE.MeshStandardMaterial({ color: 0xd88a8a, roughness: 0.8 }), 0, 0.25, 0, gunner);
  const hd = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), mats.skin);
  hd.position.y = 0.62;
  gunner.add(hd);
  box(0.1, 0.1, 0.6, mats.gun, 0.1, 0.35, 0.35, gunner);
  g.add(gunner);
  return {
    guns, exhausts: [new THREE.Vector3(-0.55, 0.36, -2.65), new THREE.Vector3(0.55, 0.36, -2.65)], nitro: true,
    missile: new THREE.Vector3(0, 1.3, 1.6),
    wheels: [
      { x: -0.92, z: 1.5, steer: true },
      { x: 0.92, z: 1.5, steer: true },
      { x: -0.94, z: -1.45 },
      { x: 0.94, z: -1.45 },
    ],
    wheelW: 0.32, rearWheelW: 0.42,
  };
};

BUILD.kamikaze = (g, env, mats) => {
  const prof = [
    [-2.28, 0.3], [2.25, 0.3], [2.32, 0.68], [2.0, 0.84], [0.65, 0.98], [0.15, 1.3], [-0.85, 1.32], [-1.95, 1.0], [-2.32, 0.92], [-2.32, 0.42],
  ];
  const { geo, bb } = makeBody({ profile: prof, width: 1.95, belt: 0.98, taper: 0.74, bevel: 0.08 });
  const P = painter(bb);
  P.base('#b2b0aa', 0.32, 0.65);
  // rising sun on hood
  {
    const [cx, cy] = P.topMap(2.3, 0);
    const ctx = P.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.rect(P.topMap(0.6, -1)[0], REG.T[1], P.topMap(2.4, 0)[0] - P.topMap(0.6, -1)[0], REG.T[3]);
    ctx.clip();
    for (let i = 0; i < 16; i++) {
      if (i % 2) continue;
      const a0 = Math.PI * 0.5 + (i / 16) * Math.PI, a1 = Math.PI * 0.5 + ((i + 1) / 16) * Math.PI;
      ctx.fillStyle = '#b5161a';
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, 600, a0, a1);
      ctx.fill();
    }
    ctx.fillStyle = '#c0141a';
    ctx.beginPath();
    ctx.arc(cx, cy, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // diagonal red/white side stripes
  for (let i = 0; i < 3; i++) {
    const z0 = 1.6 - i * 0.9;
    P.side([[z0, 0.3], [z0 + 0.35, 0.3], [z0 - 0.35, 1.0], [z0 - 0.7, 1.0]], i % 2 ? '#e8e4da' : '#b5161a');
  }
  P.side([[-2.3, 0.3], [-1.4, 0.3], [-1.9, 1.0], [-2.3, 1.0]], '#b5161a');
  P.glassTop(0.15, 0.62, 0.15);
  P.glassTop(-1.9, -0.9, 0.18);
  P.glassSide([[0.55, 1.0], [0.12, 1.26], [-0.82, 1.28], [-1.6, 1.02]]);
  P.rectFB('F', -0.75, 0.42, 0.75, 0.6, '#0e0e0e', 0.4, 0.8);
  P.rectFB('B', -0.85, 0.64, 0.85, 0.82, '#a01410');
  P.weather(31, 0.4, 0.45);
  g.add(new THREE.Mesh(geo, P.build(env)));
  box(1.95, 0.2, 0.2, mats.gun, 0, 0.4, 2.33, g);
  // roof light bar with 4 spotlights and roof guns
  box(1.3, 0.1, 0.25, mats.gun, 0, 1.38, -0.05, g);
  for (let i = 0; i < 4; i++) {
    const l = cyl(0.09, 0.11, 0.14, mats.head, -0.5 + i * 0.33, 1.45, 0.02, g, Math.PI / 2);
    l.userData.light = 'head';
  }
  const guns = [gunPair(g, -0.55, 1.36, 0.25, 1.4, 0.16, mats), gunPair(g, 0.55, 1.36, 0.25, 1.4, 0.16, mats)];
  lights(g, mats, [
    ['head', -0.68, 0.62, 2.29, 0.4, 0.12],
    ['head', 0.68, 0.62, 2.29, 0.4, 0.12],
    ['tail', -0.68, 0.74, -2.34, 0.4, 0.12],
    ['tail', 0.68, 0.74, -2.34, 0.4, 0.12],
  ]);
  return {
    guns, exhausts: [new THREE.Vector3(0.5, 0.35, -2.36)], flameNozzle: new THREE.Vector3(0, 0.6, 2.4),
    missile: new THREE.Vector3(0, 1.2, 1.4),
    wheels: [
      { x: -0.88, z: 1.42, steer: true },
      { x: 0.88, z: 1.42, steer: true },
      { x: -0.88, z: -1.4 },
      { x: 0.88, z: -1.4 },
    ],
    wheelW: 0.3,
  };
};

BUILD.outlaw = (g, env, mats) => {
  const prof = [
    [-2.5, 0.48], [2.45, 0.48], [2.52, 1.1], [2.2, 1.22], [1.15, 1.32], [0.65, 1.9], [-2.35, 1.95], [-2.52, 1.75], [-2.55, 0.6],
  ];
  const { geo, bb } = makeBody({ profile: prof, width: 2.15, belt: 1.35, taper: 0.9, bevel: 0.08 });
  const P = painter(bb);
  P.base('#121314', 0.4, 0.5);
  // white doors
  P.side([[-0.7, 0.55], [1.2, 0.55], [1.2, 1.33], [-0.7, 1.33]], '#e2ded4', 0.45, 0.3);
  P.textSide('POLICE', 0.25, 0.95, 64, '#121314');
  P.glassTop(0.65, 1.15, 0.1);
  P.glassSide([[1.05, 1.38], [0.62, 1.86], [-2.2, 1.88], [-2.3, 1.38]]);
  P.side([[-0.72, 1.36], [-0.62, 1.36], [-0.62, 1.88], [-0.72, 1.88]], '#121314');
  P.side([[0.42, 1.36], [0.5, 1.36], [0.5, 1.88], [0.42, 1.88]], '#121314');
  P.rectFB('B', -0.85, 1.35, 0.85, 1.85, '#0d0f11', 0.05, 0.9);
  P.textBack('POLICE', 0, 1.0, 56, '#efebe2');
  P.rectFB('B', -1.05, 0.95, -0.85, 1.4, '#b01510');
  P.rectFB('B', 0.85, 0.95, 1.05, 1.4, '#b01510');
  P.rectFB('F', -0.7, 0.75, 0.7, 1.1, '#0b0b0b', 0.4, 0.8);
  P.glassFront(1.36, 1.86, 0.1);
  P.weather(41, 0.45, 0.35);
  g.add(new THREE.Mesh(geo, P.build(env)));
  // push bar
  box(1.9, 0.12, 0.12, mats.gun, 0, 0.7, 2.7, g);
  box(1.9, 0.12, 0.12, mats.gun, 0, 1.05, 2.7, g);
  for (const s of [-0.6, 0.6]) box(0.12, 0.6, 0.35, mats.gun, s, 0.85, 2.58, g);
  box(2.2, 0.25, 0.25, mats.gun, 0, 0.6, -2.58, g);
  // light bar
  box(1.4, 0.14, 0.32, mats.black, 0, 2.02, 0.4, g);
  const lb = [];
  for (let i = 0; i < 4; i++) {
    const m = box(0.3, 0.12, 0.28, i < 2 ? mats.redL : mats.blue, -0.5 + i * 0.33, 2.12, 0.4, g);
    lb.push(m);
  }
  // turret + gunner on the roof rear
  const turret = new THREE.Group();
  turret.position.set(0, 1.98, -1.3);
  cyl(0.45, 0.5, 0.25, mats.gun, 0, 0.12, 0, turret);
  const gunner = new THREE.Group();
  box(0.42, 0.55, 0.3, new THREE.MeshStandardMaterial({ color: 0x3a4a6a, roughness: 0.8 }), 0, 0.5, -0.1, gunner);
  const hd = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), mats.skin);
  hd.position.set(0, 0.92, -0.1);
  gunner.add(hd);
  const tg = gunPair(gunner, 0, 0.62, 0.2, 1.0, 0.16, mats);
  turret.add(gunner);
  g.add(turret);
  lights(g, mats, [
    ['head', -0.78, 1.0, 2.53, 0.36, 0.2],
    ['head', 0.78, 1.0, 2.53, 0.36, 0.2],
    ['tail', -0.95, 1.2, -2.56, 0.15, 0.4],
    ['tail', 0.95, 1.2, -2.56, 0.15, 0.4],
  ]);
  const guns = [gunPair(g, -0.75, 1.42, 1.6, 0.8, 0.16, mats), gunPair(g, 0.75, 1.42, 1.6, 0.8, 0.16, mats)];
  return {
    guns, turret, turretGun: tg, lightbar: lb, exhausts: [new THREE.Vector3(0.6, 0.5, -2.6)],
    missile: new THREE.Vector3(0, 2.1, 1.0),
    wheels: [
      { x: -0.98, z: 1.6, steer: true },
      { x: 0.98, z: 1.6, steer: true },
      { x: -0.98, z: -1.55 },
      { x: 0.98, z: -1.55 },
    ],
    wheelW: 0.38, rimStyle: 'black',
  };
};

BUILD.meatwagon = (g, env, mats) => {
  const prof = [
    [-3.1, 0.4], [3.05, 0.4], [3.12, 0.92], [2.9, 1.02], [1.6, 1.12], [1.05, 1.62], [0.85, 1.72], [-2.7, 1.74], [-3.0, 1.5], [-3.15, 1.1], [-3.15, 0.5],
  ];
  const { geo, bb } = makeBody({ profile: prof, width: 2.1, belt: 1.12, taper: 0.9, bevel: 0.09 });
  const P = painter(bb);
  P.base('#e5e0d4', 0.45, 0.3);
  P.side([[-3.2, 0.82], [3.2, 0.82], [3.2, 0.98], [-3.2, 0.98]], '#9c1a16', 0.45, 0.3);
  P.side([[-3.2, 1.1], [1.6, 1.1], [1.6, 1.14], [-3.2, 1.14]], '#9c1a16');
  // red cross on rear side windows area
  P.glassTop(1.05, 1.55, 0.1);
  P.glassSide([[1.45, 1.18], [1.0, 1.62], [0.4, 1.66], [0.4, 1.18]]);
  P.glassSide([[0.25, 1.18], [0.25, 1.66], [-0.75, 1.66], [-0.75, 1.18]]);
  P.side([[-2.65, 1.18], [-0.95, 1.18], [-0.95, 1.66], [-2.65, 1.66]], '#f0ece2');
  for (const s of ['L', 'R']) {
    const [cx, cy] = P.sideMap(s)(-1.8, 1.42);
    P.ctx.fillStyle = '#b01a16';
    P.ctx.fillRect(cx - 34, cy - 10, 68, 20);
    P.ctx.fillRect(cx - 10, cy - 34, 20, 68);
  }
  P.textSide('MEAT WAGON', 0.2, 0.62, 36, '#9c1a16', 'Rye, serif');
  P.rectFB('B', -0.7, 0.75, 0.7, 1.55, '#d8d2c4');
  P.rectFB('B', -0.55, 1.15, 0.55, 1.5, '#101316', 0.05, 0.9);
  P.rectFB('F', -0.85, 0.48, 0.85, 0.85, '#9a9a96', 0.2, 1);
  P.weather(51, 0.45, 0.5);
  g.add(new THREE.Mesh(geo, P.build(env)));
  // chrome bumpers, tailfins, beacon
  box(2.15, 0.22, 0.24, mats.chrome, 0, 0.5, 3.12, g);
  box(2.15, 0.22, 0.24, mats.chrome, 0, 0.5, -3.18, g);
  for (const s of [-1, 1]) {
    const fin = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.9, 4), new THREE.MeshStandardMaterial({ color: 0xe5e0d4, roughness: 0.4 }));
    fin.rotation.x = -Math.PI / 2 - 0.25;
    fin.position.set(s * 0.98, 1.15, -2.8);
    g.add(fin);
    const tl = cyl(0.07, 0.07, 0.12, mats.tail, s * 0.98, 1.2, -3.22, g, Math.PI / 2);
    tl.userData.light = 'tail';
  }
  const beacon = cyl(0.16, 0.2, 0.3, mats.redL, 0, 1.9, 0.6, g);
  cyl(0.12, 0.12, 0.25, mats.redL, -0.75, 1.82, 0.95, g);
  cyl(0.12, 0.12, 0.25, mats.redL, 0.75, 1.82, 0.95, g);
  lights(g, mats, [
    ['head', -0.75, 0.82, 3.1, 0.3, 0.2],
    ['head', 0.75, 0.82, 3.1, 0.3, 0.2],
  ]);
  const guns = [gunPair(g, -0.7, 1.2, 2.0, 0.8, 0.16, mats), gunPair(g, 0.7, 1.2, 2.0, 0.8, 0.16, mats)];
  // gurney launcher on the back
  box(0.9, 0.15, 1.6, mats.chrome, 0, 1.8, -1.6, g);
  return {
    guns, beacon, exhausts: [new THREE.Vector3(0.7, 0.42, -3.2)], missile: new THREE.Vector3(0, 1.9, 1.2),
    wheels: [
      { x: -0.95, z: 2.0, steer: true },
      { x: 0.95, z: 2.0, steer: true },
      { x: -0.95, z: -1.9 },
      { x: 0.95, z: -1.9 },
    ],
    wheelW: 0.34, rimStyle: 'chrome',
  };
};

BUILD.axel = (g, env, mats) => {
  // central axle frame + strapped driver; the wheels are the body
  const frame = new THREE.Group();
  g.add(frame);
  cyl(0.18, 0.18, 2.4, mats.gun, 0, 1.45, 0, frame, 0, 0, Math.PI / 2);
  box(0.9, 0.9, 1.2, mats.gun, 0, 1.2, -0.2, frame);
  box(0.6, 0.5, 0.9, mats.rust, 0, 0.75, -0.4, frame);
  cyl(0.1, 0.1, 0.8, mats.chrome, -0.25, 0.6, -0.9, frame, Math.PI / 2);
  cyl(0.1, 0.1, 0.8, mats.chrome, 0.25, 0.6, -0.9, frame, Math.PI / 2);
  // driver: torso stretched between the hubs
  const torso = box(0.55, 0.75, 0.35, mats.skin, 0, 2.0, 0.15, frame);
  torso.rotation.x = -0.1;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), mats.skin);
  head.position.set(0, 2.55, 0.15);
  frame.add(head);
  box(0.62, 0.16, 0.38, mats.black, 0, 2.62, 0.15, frame);
  box(1.6, 0.14, 0.14, mats.skin, 0, 2.25, 0.15, frame);
  box(0.6, 0.35, 0.4, mats.cloth, 0, 1.6, 0.15, frame);
  const guns = [gunPair(frame, -0.45, 1.85, 0.5, 0.8, 0.14, mats), gunPair(frame, 0.45, 1.85, 0.5, 0.8, 0.14, mats)];
  return {
    guns, frame, exhausts: [new THREE.Vector3(-0.25, 0.6, -1.3), new THREE.Vector3(0.25, 0.6, -1.3)], missile: new THREE.Vector3(0, 2.3, 0.6),
    wheels: [
      { x: -1.35, z: 0, steer: false, r: 1.45, w: 0.75 },
      { x: 1.35, z: 0, steer: false, r: 1.45, w: 0.75 },
    ],
    wheelW: 0.75, rimStyle: 'black', bigWheels: true,
  };
};

BUILD.crimsonfury = (g, env, mats) => {
  const prof = [
    [-2.35, 0.28], [2.3, 0.28], [2.36, 0.5], [2.05, 0.66], [0.7, 0.82], [0.0, 1.13], [-0.75, 1.15], [-1.9, 0.95], [-2.38, 0.86], [-2.4, 0.4],
  ];
  const { geo, bb } = makeBody({ profile: prof, width: 2.05, belt: 0.85, taper: 0.66, bevel: 0.08 });
  const P = painter(bb);
  P.base('#9a1410', 0.28, 0.6);
  P.side([[-2.4, 0.28], [2.4, 0.28], [2.4, 0.44], [-2.4, 0.44]], '#1a1a1a', 0.5, 0.3);
  P.stripeTop(-2.4, 2.4, -0.05, 0.05, '#1a1a1a');
  P.glassTop(-0.0, 0.66, 0.16);
  P.glassTop(-1.85, -0.75, 0.22);
  P.glassSide([[0.6, 0.86], [-0.02, 1.1], [-0.72, 1.12], [-1.45, 0.88]]);
  // side intakes
  P.side([[-1.3, 0.5], [-0.7, 0.5], [-0.8, 0.78], [-1.2, 0.8]], '#0c0c0c', 0.6, 0.2);
  P.rectFB('F', -0.85, 0.36, 0.85, 0.5, '#0c0c0c');
  P.rectFB('B', -0.9, 0.5, 0.9, 0.7, '#121212');
  P.weather(61, 0.3, 0.25);
  g.add(new THREE.Mesh(geo, P.build(env)));
  box(1.9, 0.05, 0.4, mats.black, 0, 1.0, -2.15, g);
  for (const s of [-0.7, 0.7]) box(0.06, 0.18, 0.12, mats.black, s, 0.9, -2.15, g);
  lights(g, mats, [
    ['head', -0.72, 0.52, 2.3, 0.42, 0.08],
    ['head', 0.72, 0.52, 2.3, 0.42, 0.08],
    ['tail', -0.7, 0.66, -2.4, 0.5, 0.06],
    ['tail', 0.7, 0.66, -2.4, 0.5, 0.06],
  ]);
  const guns = [gunPair(g, -0.55, 0.98, 0.9, 0.8, 0.14, mats), gunPair(g, 0.55, 0.98, 0.9, 0.8, 0.14, mats)];
  for (const s of [-0.3, 0.3]) cyl(0.09, 0.09, 0.3, mats.chrome, s, 0.4, -2.45, g, Math.PI / 2);
  return {
    guns, exhausts: [new THREE.Vector3(-0.3, 0.4, -2.6), new THREE.Vector3(0.3, 0.4, -2.6)], fireExhaust: true, missile: new THREE.Vector3(0, 1.1, 1.2),
    wheels: [
      { x: -0.9, z: 1.45, steer: true },
      { x: 0.9, z: 1.45, steer: true },
      { x: -0.92, z: -1.42 },
      { x: 0.92, z: -1.42 },
    ],
    wheelW: 0.3, rearWheelW: 0.42, rimStyle: 'black',
  };
};

BUILD.reaper = (g, env, mats) => {
  const bike = new THREE.Group();
  g.add(bike);
  // frame, tank, engine, fork
  box(0.28, 0.32, 1.5, mats.gun, 0, 0.75, 0, bike);
  const tank = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 8), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.6, roughness: 0.3, envMap: env }));
  tank.scale.set(0.9, 0.6, 1.5);
  tank.position.set(0, 1.0, 0.35);
  bike.add(tank);
  box(0.45, 0.42, 0.55, mats.chrome, 0, 0.62, 0.0, bike);
  const fork = cyl(0.04, 0.04, 1.3, mats.chrome, 0, 0.95, 1.05, bike, 0.6);
  void fork;
  box(0.9, 0.05, 0.05, mats.chrome, 0, 1.55, 0.78, bike);
  cyl(0.06, 0.06, 1.1, mats.chrome, 0.18, 0.45, -0.75, bike, Math.PI / 2 - 0.15);
  box(0.36, 0.08, 0.5, mats.black, 0, 1.05, -0.4, bike);
  // rider: Mr. Grimm with skull mask
  const rider = new THREE.Group();
  rider.position.set(0, 1.1, -0.35);
  box(0.42, 0.62, 0.32, mats.cloth, 0, 0.42, 0.05, rider, 0.35);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), new THREE.MeshStandardMaterial({ color: 0xe8e2d0, roughness: 0.6 }));
  skull.position.set(0, 0.9, 0.18);
  rider.add(skull);
  box(0.06, 0.05, 0.02, mats.black, -0.06, 0.92, 0.33, rider);
  box(0.06, 0.05, 0.02, mats.black, 0.06, 0.92, 0.33, rider);
  box(0.12, 0.45, 0.12, mats.cloth, -0.22, 0.5, 0.35, rider, 1.0);
  box(0.12, 0.45, 0.12, mats.cloth, 0.22, 0.5, 0.35, rider, 1.0);
  box(0.14, 0.5, 0.14, mats.cloth, -0.18, -0.12, 0.25, rider, 1.2);
  box(0.14, 0.5, 0.14, mats.cloth, 0.18, -0.12, 0.25, rider, 1.2);
  // chainsaw on the side
  const saw = new THREE.Group();
  saw.position.set(0.35, 0.95, 0.1);
  box(0.18, 0.22, 0.38, mats.yellow, 0, 0, 0, saw);
  box(0.04, 0.14, 0.9, mats.chrome, 0, 0, 0.6, saw);
  bike.add(saw);
  bike.add(rider);
  const guns = [gunPair(bike, -0.28, 0.85, 0.75, 0.6, 0.1, mats), gunPair(bike, 0.28, 0.85, 0.75, 0.6, 0.1, mats)];
  return {
    guns, bike, saw, exhausts: [new THREE.Vector3(0.18, 0.4, -1.3)], missile: new THREE.Vector3(0, 1.3, 0.8),
    wheels: [
      { x: 0, z: 1.25, steer: true, r: 0.36, w: 0.16 },
      { x: 0, z: -0.95, r: 0.38, w: 0.26 },
    ],
    wheelW: 0.2, rimStyle: 'chrome',
  };
};

BUILD.darkside = (g, env, mats) => {
  const prof = [
    [-3.6, 0.6], [3.55, 0.6], [3.6, 1.55], [3.3, 1.75], [1.55, 1.9], [1.35, 3.0], [0.9, 3.25], [-0.6, 3.3], [-0.75, 1.6], [-3.6, 1.45],
  ];
  const { geo, bb } = makeBody({ profile: prof, width: 2.55, belt: 2.0, taper: 0.93, bevel: 0.08 });
  const P = painter(bb);
  P.base('#121213', 0.3, 0.6);
  P.glassTop(1.2, 1.55, 0.08);
  P.glassSide([[1.3, 2.05], [1.15, 2.85], [0.55, 2.95], [0.45, 2.05]]);
  P.side([[0.35, 0.7], [0.4, 0.7], [0.4, 3.0], [0.35, 3.0]], '#050505');
  P.textSide('DARKSIDE', -2.2, 1.2, 40, '#6a6a66', 'Black Ops One, sans-serif');
  P.rectFB('F', -1.0, 0.75, 1.0, 1.7, '#c9c9c4', 0.15, 1);
  for (let i = 0; i < 9; i++) P.rectFB('F', -0.95 + i * 0.22, 0.8, -0.9 + i * 0.22, 1.65, '#202020');
  P.glassFront(2.0, 2.9, 0.08);
  P.rectFB('F', -0.04, 1.95, 0.04, 2.95, '#121213');
  P.weather(71, 0.35, 0.3);
  g.add(new THREE.Mesh(geo, P.build(env)));
  // exhaust stacks, sleeper, fuel tanks, ram plow
  for (const s of [-1.15, 1.15]) {
    cyl(0.14, 0.14, 3.2, mats.chrome, s, 2.6, 0.95, g);
    cyl(0.4, 0.4, 1.4, mats.chrome, s, 0.95, -0.8, g, Math.PI / 2);
  }
  const plow = new THREE.Group();
  plow.position.set(0, 0.9, 3.75);
  box(2.8, 1.2, 0.25, mats.gun, 0, 0, 0, plow, -0.2);
  for (let i = 0; i < 6; i++) {
    const sp = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.6, 6), mats.chrome);
    sp.rotation.x = Math.PI / 2;
    sp.position.set(-1.1 + i * 0.44, -0.1, 0.35);
    plow.add(sp);
  }
  g.add(plow);
  lights(g, mats, [
    ['head', -1.1, 1.3, 3.62, 0.36, 0.25],
    ['head', 1.1, 1.3, 3.62, 0.36, 0.25],
    ['tail', -1.1, 1.0, -3.62, 0.2, 0.15],
    ['tail', 1.1, 1.0, -3.62, 0.2, 0.15],
  ]);
  for (let i = 0; i < 5; i++) {
    const m = box(0.12, 0.08, 0.08, mats.head, -0.5 + i * 0.25, 3.33, 0.95, g);
    m.userData.light = 'head';
  }
  const guns = [gunPair(g, -0.8, 2.0, 2.4, 1.0, 0.18, mats), gunPair(g, 0.8, 2.0, 2.4, 1.0, 0.18, mats)];
  return {
    guns, plow, exhausts: [new THREE.Vector3(-1.15, 4.25, 0.95), new THREE.Vector3(1.15, 4.25, 0.95)], stacks: true, missile: new THREE.Vector3(0, 3.4, 1.2),
    wheels: [
      { x: -1.05, z: 2.4, steer: true },
      { x: 1.05, z: 2.4, steer: true },
      { x: -1.05, z: -1.8 },
      { x: 1.05, z: -1.8 },
      { x: -1.05, z: -3.0 },
      { x: 1.05, z: -3.0 },
    ],
    wheelW: 0.42, rimStyle: 'chrome',
  };
};

BUILD.vermin = (g, env, mats) => {
  const prof = [
    [-2.65, 0.45], [2.6, 0.45], [2.66, 1.05], [2.35, 1.2], [1.95, 1.3], [1.6, 2.45], [-2.6, 2.5], [-2.7, 2.3], [-2.7, 0.55],
  ];
  const { geo, bb } = makeBody({ profile: prof, width: 2.2, belt: 2.2, taper: 0.96, bevel: 0.08 });
  const P = painter(bb);
  P.base('#d6b320', 0.5, 0.3);
  P.side([[-2.7, 0.45], [2.7, 0.45], [2.7, 0.75], [-2.7, 0.75]], '#3a3020');
  P.glassTop(1.6, 1.95, 0.08);
  P.glassSide([[1.85, 1.38], [1.58, 2.35], [1.0, 2.38], [1.0, 1.38]]);
  P.textSide('RAT-A-TAT', -0.9, 1.95, 56, '#2a2018', 'Rye, serif');
  P.textSide('EXTERMINATORS', -0.9, 1.4, 34, '#7a1a12');
  P.rectFB('B', -0.95, 0.75, 0.95, 2.25, '#c8a41e');
  P.rectFB('B', -0.03, 0.75, 0.03, 2.25, '#3a3020');
  P.rectFB('F', -0.8, 0.6, 0.8, 1.0, '#202020', 0.4, 0.8);
  P.glassFront(1.34, 2.34, 0.08);
  P.rectFB('F', -0.03, 1.3, 0.03, 2.4, '#d6b320');
  // rear: barn doors with small windows, bumper shadow, dirt
  P.glassBack(1.7, 2.2, 0.16);
  P.rectFB('B', -0.03, 0.75, 0.03, 2.3, '#3a3020');
  P.rectFB('B', -0.95, 1.15, 0.95, 1.2, 'rgba(60,40,20,0.6)');
  P.textBack('RAT-A-TAT', 0, 1.45, 34, '#2a2018', 'Rye, serif');
  P.weather(81, 0.5, 0.6);
  g.add(new THREE.Mesh(geo, P.build(env)));
  box(2.25, 0.25, 0.25, mats.rust, 0, 0.55, 2.68, g);
  box(2.25, 0.25, 0.25, mats.rust, 0, 0.55, -2.72, g);
  // rocket + rat rider on the roof
  const rocket = new THREE.Group();
  rocket.position.set(0, 2.85, -0.4);
  cyl(0.28, 0.28, 2.0, mats.red, 0, 0, 0, rocket, Math.PI / 2);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.6, 12), mats.white);
  nose.rotation.x = Math.PI / 2;
  nose.position.z = 1.3;
  rocket.add(nose);
  for (let i = 0; i < 3; i++) {
    const fin = box(0.04, 0.4, 0.4, mats.white, 0, 0, -0.85, rocket);
    fin.rotation.z = (i / 3) * Math.PI * 2;
    fin.position.set(Math.sin((i / 3) * Math.PI * 2) * 0.3, Math.cos((i / 3) * Math.PI * 2) * 0.3, -0.85);
  }
  const rat = new THREE.Group();
  rat.position.set(0, 0.45, 0.1);
  box(0.4, 0.5, 0.35, new THREE.MeshStandardMaterial({ color: 0x5a5048, roughness: 0.9 }), 0, 0.15, 0, rat, 0.2);
  const rh = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.45, 8), new THREE.MeshStandardMaterial({ color: 0x6a6058, roughness: 0.9 }));
  rh.rotation.x = Math.PI / 2;
  rh.position.set(0, 0.55, 0.2);
  rat.add(rh);
  rocket.add(rat);
  g.add(rocket);
  for (const s of [-1.05, 1.05]) box(0.08, 0.4, 0.08, mats.gun, s * 0.2, 2.6, -0.4, g);
  lights(g, mats, [
    ['head', -0.8, 0.95, 2.62, 0.3, 0.22],
    ['head', 0.8, 0.95, 2.62, 0.3, 0.22],
    ['tail', -1.0, 0.75, -2.72, 0.2, 0.3],
    ['tail', 1.0, 0.75, -2.72, 0.2, 0.3],
  ]);
  const guns = [gunPair(g, -0.75, 1.42, 2.1, 0.8, 0.16, mats), gunPair(g, 0.75, 1.42, 2.1, 0.8, 0.16, mats)];
  return {
    guns, rocket, exhausts: [new THREE.Vector3(0.7, 0.45, -2.75)], missile: new THREE.Vector3(0, 3.1, 0.8),
    wheels: [
      { x: -1.0, z: 1.75, steer: true },
      { x: 1.0, z: 1.75, steer: true },
      { x: -1.0, z: -1.75 },
      { x: 1.0, z: -1.75 },
    ],
    wheelW: 0.36, rimStyle: 'steel',
  };
};

BUILD.shadow = (g, env, mats) => {
  const prof = [
    [-3.0, 0.4], [2.95, 0.4], [3.02, 0.85], [2.75, 0.98], [1.4, 1.08], [0.85, 1.55], [-2.75, 1.58], [-3.02, 1.4], [-3.05, 0.5],
  ];
  const { geo, bb } = makeBody({ profile: prof, width: 2.05, belt: 1.08, taper: 0.9, bevel: 0.08 });
  const P = painter(bb);
  P.base('#141216', 0.25, 0.65);
  P.glassTop(0.85, 1.35, 0.1);
  P.glassSide([[1.3, 1.12], [0.85, 1.5], [0.1, 1.52], [0.1, 1.12]]);
  // landau bars + curtained rear windows
  P.side([[-2.6, 1.12], [-0.1, 1.12], [-0.1, 1.52], [-2.6, 1.52]], '#2a2228');
  for (const s of ['L', 'R']) {
    const m = P.sideMap(s);
    P.ctx.strokeStyle = '#a9a39a';
    P.ctx.lineWidth = 5;
    const [x0, y0] = m(-2.2, 1.45), [x1, y1] = m(-1.0, 1.2);
    P.ctx.beginPath();
    P.ctx.moveTo(x0, y0);
    P.ctx.quadraticCurveTo((x0 + x1) / 2, y0 - 30, x1, y1);
    P.ctx.stroke();
  }
  P.side([[-3.05, 0.7], [3.05, 0.7], [3.05, 0.74], [-3.05, 0.74]], '#8a6aa8', 0.3, 0.8);
  P.rectFB('B', -0.85, 0.8, 0.85, 1.45, '#1d1a1e');
  P.rectFB('F', -0.8, 0.55, 0.8, 0.85, '#9a9a96', 0.2, 1);
  P.glassFront(1.12, 1.5, 0.1);
  P.weather(91, 0.35, 0.2);
  g.add(new THREE.Mesh(geo, P.build(env)));
  box(2.1, 0.2, 0.22, mats.chrome, 0, 0.48, 3.02, g);
  box(2.1, 0.2, 0.22, mats.chrome, 0, 0.48, -3.08, g);
  // coffin on the roof rack + purple underglow
  const coffin = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.45, 2.1), new THREE.MeshStandardMaterial({ color: 0x3a2418, roughness: 0.6 }));
  coffin.position.set(0, 1.85, -1.1);
  g.add(coffin);
  box(0.8, 0.06, 0.4, mats.chrome, 0, 2.1, -0.4, g);
  const glow = box(1.8, 0.02, 5.2, mats.purple, 0, 0.22, 0, g);
  glow.userData.glow = true;
  lights(g, mats, [
    ['head', -0.75, 0.75, 3.0, 0.3, 0.16],
    ['head', 0.75, 0.75, 3.0, 0.3, 0.16],
    ['tail', -0.85, 0.9, -3.05, 0.2, 0.2],
    ['tail', 0.85, 0.9, -3.05, 0.2, 0.2],
  ]);
  const guns = [gunPair(g, -0.7, 1.15, 1.9, 0.8, 0.16, mats), gunPair(g, 0.7, 1.15, 1.9, 0.8, 0.16, mats)];
  return {
    guns, coffin, exhausts: [new THREE.Vector3(0.7, 0.42, -3.1)], missile: new THREE.Vector3(0, 1.9, 1.0),
    wheels: [
      { x: -0.93, z: 1.9, steer: true },
      { x: 0.93, z: 1.9, steer: true },
      { x: -0.93, z: -1.85 },
      { x: 0.93, z: -1.85 },
    ],
    wheelW: 0.32, rimStyle: 'chrome',
  };
};

BUILD.junkyarddog = (g, env, mats) => {
  const prof = [
    [-3.3, 0.6], [3.25, 0.6], [3.3, 1.35], [2.9, 1.5], [2.0, 1.62], [1.7, 2.45], [0.6, 2.5], [0.5, 1.6], [-3.3, 1.5],
  ];
  const { geo, bb } = makeBody({ profile: prof, width: 2.35, belt: 1.65, taper: 0.9, bevel: 0.07 });
  const P = painter(bb);
  P.base('#6d6a3a', 0.7, 0.3);
  P.glassTop(1.7, 2.0, 0.1);
  P.glassSide([[1.85, 1.7], [1.62, 2.35], [0.75, 2.38], [0.7, 1.7]]);
  P.textSide("JOE'S TOWING", -1.4, 1.1, 44, '#e8d8a0', 'Rye, serif', '#2a2010');
  P.rectFB('F', -0.9, 0.8, 0.9, 1.4, '#1a1a1a', 0.4, 0.8);
  P.glassFront(1.7, 2.36, 0.1);
  P.glassBack(1.75, 2.3, 0.2);
  P.weather(101, 0.6, 1.0);
  g.add(new THREE.Mesh(geo, P.build(env)));
  // tow boom + hook + cab light bar
  const boom = new THREE.Group();
  boom.position.set(0, 1.6, -2.4);
  box(0.35, 0.35, 2.6, mats.yellow, 0, 0.7, 0.2, boom, 0.55);
  box(0.12, 0.12, 0.9, mats.gun, 0, 0.9, -1.0, boom, Math.PI / 2);
  g.add(boom);
  // carried taxi (launched by the special)
  const taxi = new THREE.Group();
  taxi.position.set(0, 1.4, -4.1);
  taxi.rotation.x = 0.35;
  box(1.8, 0.65, 4.2, new THREE.MeshStandardMaterial({ color: 0xd6a618, roughness: 0.5 }), 0, 0.5, 0, taxi);
  box(1.6, 0.55, 2.0, new THREE.MeshStandardMaterial({ color: 0xd6a618, roughness: 0.5 }), 0, 1.05, -0.2, taxi);
  box(1.62, 0.4, 1.9, mats.glass, 0, 1.08, -0.2, taxi);
  box(0.6, 0.2, 0.3, mats.white, 0, 1.45, -0.2, taxi);
  g.add(taxi);
  for (let i = 0; i < 3; i++) {
    const m = box(0.25, 0.1, 0.1, i === 1 ? mats.redL : mats.head, -0.3 + i * 0.3, 2.55, 1.2, g);
    m.userData.light = 'head';
  }
  box(2.4, 0.3, 0.3, mats.rust, 0, 0.75, 3.32, g);
  lights(g, mats, [
    ['head', -0.95, 1.15, 3.32, 0.3, 0.25],
    ['head', 0.95, 1.15, 3.32, 0.3, 0.25],
  ]);
  const guns = [gunPair(g, -0.8, 1.7, 2.6, 0.9, 0.16, mats), gunPair(g, 0.8, 1.7, 2.6, 0.9, 0.16, mats)];
  return {
    guns, taxi, boom, exhausts: [new THREE.Vector3(-1.1, 2.6, 0.4)], stacks: true, missile: new THREE.Vector3(0, 2.6, 1.6),
    wheels: [
      { x: -1.05, z: 2.2, steer: true },
      { x: 1.05, z: 2.2, steer: true },
      { x: -1.05, z: -1.6 },
      { x: 1.05, z: -1.6 },
    ],
    wheelW: 0.4, rimStyle: 'steel',
  };
};

// bake the loose static parts of a body (bumpers, frames, guns' mounts...) into one mesh per
// material so each car costs a handful of draw calls instead of dozens
function mergeStatic(body, keep) {
  body.updateMatrix();
  const byMat = new Map();
  for (const c of body.children.slice()) {
    if (!c.isMesh || c.userData.light || c.userData.glow || keep.has(c)) continue;
    const key = c.material.uuid;
    if (!byMat.has(key)) byMat.set(key, { mat: c.material, list: [] });
    byMat.get(key).list.push(c);
  }
  for (const { mat, list } of byMat.values()) {
    if (list.length < 2) continue;
    const geos = list.map((m) => {
      m.updateMatrix();
      let g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
      g.applyMatrix4(m.matrix);
      for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
      if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
      return g;
    });
    const merged = mergeGeometries(geos, false);
    if (!merged) continue;
    for (const m of list) body.remove(m);
    body.add(new THREE.Mesh(merged, mat));
  }
}

// assemble a vehicle model; returns { root, body, wheels, parts }
export function buildVehicle(id, envMap) {
  const def = byId[id];
  const mats = partMats(envMap);
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const parts = BUILD[id](body, envMap, mats);
  // anything the game animates or toggles (light bars, beacons, glow) stays a separate mesh
  const keep = new Set();
  for (const v of Object.values(parts)) {
    if (v && v.isObject3D) keep.add(v);
    if (Array.isArray(v)) for (const x of v) if (x && x.isObject3D) keep.add(x);
  }
  mergeStatic(body, keep);
  const wheels = [];
  for (const w of parts.wheels) {
    const r = w.r || def.wheelR;
    const isRear = w.z < 0;
    const width = w.w || (isRear && parts.rearWheelW) || parts.wheelW || 0.3;
    const pivot = new THREE.Group();
    pivot.position.set(w.x, r, w.z);
    const spin = wheelMesh(r, width, mats, parts.rimStyle, !!parts.bigWheels);
    pivot.add(spin);
    root.add(pivot);
    wheels.push({ pivot, spin, r, x: w.x, z: w.z, steer: !!w.steer, baseY: r });
  }
  root.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  const headLights = [], tailLights = [];
  body.traverse((o) => {
    if (o.userData.light === 'head') headLights.push(o);
    if (o.userData.light === 'tail') tailLights.push(o);
  });
  return { root, body, wheels, parts, def, headLights, tailLights };
}
