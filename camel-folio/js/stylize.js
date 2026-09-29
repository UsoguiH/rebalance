import * as THREE from 'three';

// A soft "clay" look: objects are shaded with a matcap painted in code, while
// the ground keeps real lighting so shadows still land on it.

// Moonlit clay: cool violet key light from the upper left, deep indigo shadow,
// and a faint warm bounce from the lanterns along the lower right.
function clayMatcap(size = 256) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const r = size / 2;
  ctx.fillStyle = '#2c2352';
  ctx.fillRect(0, 0, size, size);
  let g = ctx.createRadialGradient(r * 0.7, r * 0.6, 0, r * 0.9, r * 0.85, r * 1.15);
  g.addColorStop(0, '#f3eeff');
  g.addColorStop(0.4, '#c7bdf2');
  g.addColorStop(0.78, '#6d5fae');
  g.addColorStop(1, '#2c2352');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(r, r, r, 0, Math.PI * 2);
  ctx.fill();
  g = ctx.createRadialGradient(r * 1.55, r * 1.55, 0, r * 1.55, r * 1.55, r * 0.9);
  g.addColorStop(0, 'rgba(255, 150, 80, 0.45)');
  g.addColorStop(1, 'rgba(255, 150, 80, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(r, r, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = size * 0.03;
  ctx.strokeStyle = 'rgba(220, 210, 255, 0.5)';
  ctx.beginPath();
  ctx.arc(r, r, r - ctx.lineWidth / 2, Math.PI * 1.05, Math.PI * 1.75);
  ctx.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function stylize(scene) {
  const matcap = clayMatcap();
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
}
