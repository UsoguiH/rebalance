import * as THREE from 'three';

// A soft "clay" look: objects are shaded with a matcap painted in code, while
// the ground keeps real lighting so shadows still land on it.

// Clay matcaps for the two ends of the day cycle: warm dusk and moonlit night.
// Each has a key light from the upper left, a shadow tone, and a warm bounce
// from the lanterns along the lower right.
const PALETTES = {
  dusk: { base: '#4a2a4a', stops: ['#fff1e6', '#ffc9a8', '#b8667a', '#4a2a4a'], bounce: 'rgba(255, 170, 90, 0.35)', rim: 'rgba(255, 225, 200, 0.5)' },
  night: { base: '#2c2352', stops: ['#f3eeff', '#c7bdf2', '#6d5fae', '#2c2352'], bounce: 'rgba(255, 150, 80, 0.45)', rim: 'rgba(220, 210, 255, 0.5)' },
};

function paintMatcap(pal, size = 128) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const r = size / 2;
  ctx.fillStyle = pal.base;
  ctx.fillRect(0, 0, size, size);
  let g = ctx.createRadialGradient(r * 0.7, r * 0.6, 0, r * 0.9, r * 0.85, r * 1.15);
  [0, 0.4, 0.78, 1].forEach((k, i) => g.addColorStop(k, pal.stops[i]));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(r, r, r, 0, Math.PI * 2);
  ctx.fill();
  g = ctx.createRadialGradient(r * 1.55, r * 1.55, 0, r * 1.55, r * 1.55, r * 0.9);
  g.addColorStop(0, pal.bounce);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(r, r, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = size * 0.03;
  ctx.strokeStyle = pal.rim;
  ctx.beginPath();
  ctx.arc(r, r, r - ctx.lineWidth / 2, Math.PI * 1.05, Math.PI * 1.75);
  ctx.stroke();
  return c;
}

// One live matcap that blends between dusk and night.
function cycleMatcap() {
  const dusk = paintMatcap(PALETTES.dusk);
  const night = paintMatcap(PALETTES.night);
  const c = document.createElement('canvas');
  c.width = c.height = dusk.width;
  const ctx = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  let last = -1;
  const set = (k) => {
    if (Math.abs(k - last) < 0.01) return;
    last = k;
    ctx.globalAlpha = 1;
    ctx.drawImage(dusk, 0, 0);
    ctx.globalAlpha = k;
    ctx.drawImage(night, 0, 0);
    tex.needsUpdate = true;
  };
  set(0);
  return { tex, set };
}

export function stylize(scene) {
  const cycle = cycleMatcap();
  const matcap = cycle.tex;
  const cache = new Map();
  const convert = (m) => {
    if (!m || !m.isMeshStandardMaterial) return m;
    if (cache.has(m)) return cache.get(m);
    const n = new THREE.MeshMatcapMaterial({
      matcap,
      color: m.color,
      map: m.map,
      vertexColors: m.vertexColors,
      flatShading: m.flatShading,
      side: m.side,
      transparent: m.transparent,
      opacity: m.opacity,
    });
    cache.set(m, n);
    return n;
  };
  scene.traverse((o) => {
    // Only solid objects; receive-only surfaces (ground, rugs, labels) keep real light and shadows.
    if (!o.isMesh || !o.castShadow) return;
    o.material = Array.isArray(o.material) ? o.material.map(convert) : convert(o.material);
    o.receiveShadow = false;
  });
  return { setNight: cycle.set };
}
