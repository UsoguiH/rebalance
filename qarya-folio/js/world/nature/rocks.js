import * as THREE from 'three';
import { Builder } from '../../core/builder.js';
import { addSway, rng } from './util.js';

// الصخور والعظام: faceted boulders, layered outcrops, bleached camel bones
// and sun-greyed driftwood.

// A lumpy faceted boulder (unit-ish radius), jittered consistently so the
// facets stay closed.
export function lumpGeometry(seed, detail = 0, flat = 0.7) {
  const rand = rng(seed);
  const g = new THREE.IcosahedronGeometry(1, detail);
  const p = g.attributes.position;
  const jit = new Map();
  for (let i = 0; i < p.count; i++) {
    const k = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
    if (!jit.has(k)) jit.set(k, 0.78 + rand() * 0.42);
    const f = jit.get(k);
    let y = p.getY(i) * f * flat;
    if (y < -0.25) y = -0.25 - (y + 0.25) * 0.3; // flattened underside
    p.setXYZ(i, p.getX(i) * f, y, p.getZ(i) * f);
  }
  g.computeVertexNormals();
  return g;
}

export function boulderGeometry(P, variant) {
  const b = new Builder();
  const cols = [P.rock, '#c79a70', P.rockDark];
  b.add(lumpGeometry(10 + variant, variant === 2 ? 1 : 0, variant === 1 ? 0.5 : 0.75), cols[variant], { position: [0, 0.2, 0] });
  if (variant === 0) b.add(lumpGeometry(20, 0, 0.6), P.rockDark, { position: [0.8, 0.05, 0.3], scale: 0.42 });
  return addSway(b.build().geometry, () => 0);
}

// A stacked sandstone outcrop: slabs in bands of colour.
export function outcropGeometry(P, variant) {
  const rand = rng(50 + variant);
  const b = new Builder();
  const bands = [P.rock, '#c99a6c', P.rockDark, '#d8ad7e'];
  let y = 0;
  const layers = 3 + variant;
  for (let i = 0; i < layers; i++) {
    const w = 2.6 - i * 0.45 + rand() * 0.4, h = 0.55 + rand() * 0.35;
    b.add(lumpGeometry(60 + i + variant * 7, 0, 0.5), bands[i % 4], {
      position: [(rand() - 0.5) * 0.5, y + h * 0.35, (rand() - 0.5) * 0.5],
      scale: [w, h, w * (0.7 + rand() * 0.3)], rotation: [0, rand() * 3, 0],
    });
    y += h * 0.7;
  }
  for (let i = 0; i < 3; i++) {
    const a = rand() * Math.PI * 2;
    b.add(lumpGeometry(80 + i, 0, 0.7), P.rockDark, { position: [Math.cos(a) * 2.3, 0.1, Math.sin(a) * 2.3], scale: 0.35 + rand() * 0.25 });
  }
  return { geometry: addSway(b.build().geometry, () => 0), height: y };
}

export function pebbleGeometry(P) {
  const b = new Builder();
  b.add(lumpGeometry(90, 0, 0.6), P.rockDark, { scale: 0.22, position: [0, 0.05, 0] });
  b.add(lumpGeometry(91, 0, 0.6), P.rock, { scale: 0.15, position: [0.3, 0.03, 0.1] });
  b.add(lumpGeometry(92, 0, 0.6), '#c79a70', { scale: 0.12, position: [-0.2, 0.02, 0.25] });
  return addSway(b.build().geometry, () => 0);
}

// Bleached camel remains: a skull, a spine and a few ribs half in the sand.
export function bonesGeometry() {
  const b = new Builder();
  const bone = '#efe6d2', shade = '#d8ccb2';
  for (let i = 0; i < 7; i++) {
    const x = -1.4 + i * 0.42;
    b.sphere(0.09, shade, { position: [x, 0.08, 0] }, 0);
    if (i > 0 && i < 6) {
      const s = 0.55 + Math.sin((i / 6) * Math.PI) * 0.35;
      b.add(new THREE.TorusGeometry(s, 0.035, 3, 7, Math.PI * 0.8), bone, { position: [x, 0.0, 0], rotation: [0, Math.PI / 2, 0.15], scale: [1, 1.0, 1] });
    }
  }
  b.cylinder(0.05, 0.05, 2.6, bone, { position: [-0.1, 0.08, 0], rotation: [0, 0, Math.PI / 2] }, 5);
  // Skull, a little apart.
  b.box([0.55, 0.28, 0.26], bone, { position: [2.2, 0.14, 0.4], rotation: [0, 0.4, 0.1] });
  b.box([0.34, 0.2, 0.2], shade, { position: [2.55, 0.1, 0.55], rotation: [0, 0.4, 0.05] });
  b.sphere(0.05, '#6b5a48', { position: [2.1, 0.22, 0.52] }, 0);
  b.cylinder(0.04, 0.04, 1.1, bone, { position: [0.4, 0.05, 1.1], rotation: [0, 0.8, Math.PI / 2] }, 5);
  return addSway(b.build().geometry, () => 0);
}

// A bent, weathered branch lying in the sand.
export function driftwoodGeometry(variant) {
  const rand = rng(700 + variant);
  const b = new Builder();
  const cols = ['#8f7a63', '#a8927a', '#7a6552'];
  let x = 0, z = 0, a = 0;
  for (let i = 0; i < 4; i++) {
    const len = 0.8 + rand() * 0.6;
    const r = 0.13 - i * 0.025;
    const nx = x + Math.cos(a) * len, nz = z + Math.sin(a) * len;
    b.cylinder(r * 0.85, r, len, cols[i % 3], { position: [(x + nx) / 2, r * 0.8, (z + nz) / 2], rotation: [0, -a, Math.PI / 2] }, 5);
    if (i === 1) b.cylinder(0.03, 0.06, 0.8, cols[2], { position: [nx + 0.2, 0.3, nz + 0.1], rotation: [0.3, -a + 0.9, Math.PI / 2 - 0.5] }, 4);
    x = nx; z = nz; a += (rand() - 0.5) * 0.9;
  }
  b.sphere(0.2, cols[2], { position: [-0.05, 0.15, 0], scale: [0.8, 0.8, 1.2] }, 0);
  return addSway(b.build().geometry, () => 0);
}
