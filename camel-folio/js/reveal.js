import * as THREE from 'three';

// Before the journey starts, the world is clipped to a small island around the
// camel, floating over a dark patterned void. Starting grows the island's radius
// until it swallows the whole desert.

export const reveal = {
  center: { value: new THREE.Vector2(0, 0) },
  radius: { value: 7.5 },
  glow: { value: 1 }, // glowing band where the island cuts through objects (intro only)
};

const VERT_DECL = 'varying vec3 vRevealWorld;\n';
const VERT_CODE = `
  vec4 rvPos = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
    rvPos = instanceMatrix * rvPos;
  #endif
  vRevealWorld = (modelMatrix * rvPos).xyz;
`;
const FRAG_DECL = 'uniform vec2 uRevealCenter;\nuniform float uRevealRadius;\nuniform float uRevealGlow;\nvarying vec3 vRevealWorld;\n';
const FRAG_CODE = `
  float rvD = distance(vRevealWorld.xz, uRevealCenter);
  if (rvD > uRevealRadius) discard;
  float rvEdge = smoothstep(uRevealRadius - 0.22, uRevealRadius - 0.02, rvD) * uRevealGlow;
`;
const FRAG_END = 'gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1.0, 0.86, 1.0) * 1.8, rvEdge);\n';

function patch(material) {
  if (material.userData.revealPatched || material.isShaderMaterial || material.isPointsMaterial) return;
  material.userData.revealPatched = true;
  const prev = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    if (prev) prev(shader, renderer);
    // Only shaders with both hook points (sprites, for example, have no project_vertex).
    if (!shader.vertexShader.includes('#include <project_vertex>') || !shader.fragmentShader.includes('#include <clipping_planes_fragment>')) return;
    shader.uniforms.uRevealGlow = reveal.glow;
    shader.uniforms.uRevealCenter = reveal.center;
    shader.uniforms.uRevealRadius = reveal.radius;
    shader.vertexShader = VERT_DECL + shader.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n' + VERT_CODE);
    shader.fragmentShader = FRAG_DECL + shader.fragmentShader
      .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n' + FRAG_CODE)
      .replace('#include <dithering_fragment>', FRAG_END + '#include <dithering_fragment>');
  };
  const key = material.customProgramCacheKey ? material.customProgramCacheKey.bind(material) : () => '';
  material.customProgramCacheKey = () => key() + '|reveal';
  material.needsUpdate = true;
}

export function applyReveal(scene, skip = new Set()) {
  scene.traverse((o) => {
    if (skip.has(o) || !o.material) return;
    (Array.isArray(o.material) ? o.material : [o.material]).forEach(patch);
  });
}

// Tileable void pattern: small eight-point stars (khatam) on a dark ground with faint diagonals.
function voidTexture() {
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#17121f';
  ctx.fillRect(0, 0, S, S);
  ctx.strokeStyle = 'rgba(160, 120, 220, 0.16)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(S, S);
  ctx.moveTo(S, 0); ctx.lineTo(0, S);
  ctx.stroke();
  const star = (x, y, r) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#7b5cd6';
    for (const a of [0, Math.PI / 4]) {
      ctx.save();
      ctx.rotate(a);
      ctx.fillRect(-r, -r, r * 2, r * 2);
      ctx.restore();
    }
    ctx.fillStyle = '#17121f';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
  star(S / 4, S / 4, 7);
  star((3 * S) / 4, (3 * S) / 4, 7);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

function glowTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 8;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 512, 0);
  g.addColorStop(0, 'rgba(190,150,255,0)');
  g.addColorStop(0.42, 'rgba(210,170,255,0.35)');
  g.addColorStop(0.5, 'rgba(255,255,255,1)');
  g.addColorStop(0.56, 'rgba(230,200,255,0.45)');
  g.addColorStop(1, 'rgba(190,150,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 8);
  return new THREE.CanvasTexture(c);
}

export class Island {
  constructor(scene) {
    this.group = new THREE.Group();
    scene.add(this.group);

    // Void floor far below, patterned.
    const tex = voidTexture();
    tex.repeat.set(60, 60);
    this.floorMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, fog: false });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), this.floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -4;
    floor.renderOrder = -2;
    this.group.add(floor);

    // Glowing rim on the ground: a thin bright line with a soft halo.
    this.rimMat = new THREE.MeshBasicMaterial({ map: glowTexture(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide });
    const ringGeo = new THREE.RingGeometry(0.9, 1.1, 160, 1);
    // Map u across the ring's width so the gradient runs inner -> outer.
    const uv = ringGeo.attributes.uv, pos = ringGeo.attributes.position;
    for (let i = 0; i < uv.count; i++) {
      const r = Math.hypot(pos.getX(i), pos.getY(i));
      uv.setXY(i, (r - 0.9) / 0.2, 0.5);
    }
    this.rim = new THREE.Mesh(ringGeo, this.rimMat);
    this.rim.rotation.x = -Math.PI / 2;
    this.rim.renderOrder = 5;
    this.group.add(this.rim);
    this.set(reveal.radius.value, 1);
  }

  set(radius, visible) {
    const c = reveal.center.value;
    this.rim.position.set(c.x, 0.06, c.y);
    const rimScale = radius;
    this.rim.scale.set(rimScale, rimScale, 1);
    this.rimMat.opacity = visible;
    this.floorMat.opacity = visible;
    this.group.visible = visible > 0.001;
  }
}
