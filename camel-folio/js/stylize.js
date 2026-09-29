import * as THREE from 'three';

// A soft "clay" look: objects are shaded with a matcap painted in code (warm key
// light from the upper left, cool bounce underneath, a thin rim), while the
// ground keeps real lighting so shadows still land on it.

function clayMatcap(size = 256) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const r = size / 2;
  // Base: cool, slightly purple shadow side.
  ctx.fillStyle = '#8f7f86';
  ctx.fillRect(0, 0, size, size);
  // Key light.
  let g = ctx.createRadialGradient(r * 0.72, r * 0.62, 0, r * 0.9, r * 0.85, r * 1.15);
  g.addColorStop(0, '#fff6e8');
  g.addColorStop(0.45, '#f1dcc6');
  g.addColorStop(0.8, '#c3a99e');
  g.addColorStop(1, '#8f7f86');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(r, r, r, 0, Math.PI * 2);
  ctx.fill();
  // Warm bounce from the sand along the bottom edge.
  g = ctx.createLinearGradient(0, size * 0.65, 0, size);
  g.addColorStop(0, 'rgba(240, 180, 110, 0)');
  g.addColorStop(1, 'rgba(240, 180, 110, 0.35)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(r, r, r, 0, Math.PI * 2);
  ctx.fill();
  // Rim.
  ctx.lineWidth = size * 0.035;
  ctx.strokeStyle = 'rgba(255, 238, 215, 0.45)';
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
