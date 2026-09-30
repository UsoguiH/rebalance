import * as THREE from 'three';
import { reveal, REVEAL_GLSL, revealUniforms } from '../core/reveal.js';
import { sectionAccent } from '../ui/icons.js';

// دوائر الأقسام: a glowing ring on the sand in front of every landmark, so you
// can see where to stop, plus a floating Arabic name above it. Standing in the
// ring fills it like a clock hand; when it's full the section opens.

function padMaterial(color) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
    uniforms: {
      uProgress: { value: 0 },
      uActive: { value: 0 },
      uTime: { value: 0 },
      uTint: { value: new THREE.Color(color) },
      ...revealUniforms(),
    },
    vertexShader: `varying vec2 vP; varying vec3 vW;
      void main(){ vP = position.xy; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform float uProgress, uActive, uTime; uniform vec3 uTint; varying vec2 vP; varying vec3 vW;
      ${REVEAL_GLSL}
      void main(){
        revealClip(vW.xz);
        float r = length(vP);                         // 0 centre … 1 edge
        float aa = fwidth(r) * 1.5;
        float outer = smoothstep(0.9 - aa, 0.9, r) * (1.0 - smoothstep(1.0 - aa, 1.0, r));
        float inner = smoothstep(0.4 - aa, 0.4, r) * (1.0 - smoothstep(0.47 - aa, 0.47, r));
        float band = step(0.47, r) * (1.0 - step(0.9, r));
        float a = fract(atan(vP.x, vP.y) / 6.2831853 + 1.0);  // clockwise from the top
        float filled = step(a, uProgress) * step(0.001, uProgress);
        // Soft pulse so idle rings catch the eye from across the village.
        float pulse = 0.5 + 0.5 * sin(uTime * 2.4 - r * 6.0);
        vec3 white = vec3(1.0, 0.98, 0.92);
        vec3 col = mix(uTint, white, 0.35);
        float ringA = max(outer, inner);
        float fillA = band * mix(0.14 + 0.1 * pulse + 0.12 * uActive, 0.88, filled);
        vec3 c = mix(col, white, ringA);
        float alpha = max(ringA * 0.95, fillA);
        // A halo just outside the ring.
        float halo = (1.0 - smoothstep(1.0, 1.25, r)) * step(1.0, r) * (0.25 + 0.35 * pulse);
        c = mix(c, white, halo * 0.5);
        alpha = max(alpha, halo * 0.5);
        if (alpha < 0.01) discard;
        gl_FragColor = vec4(c, alpha);
      }`,
    extensions: { derivatives: true },
  });
}

function labelTexture(text, color) {
  const c = document.createElement('canvas');
  const W = 512, H = 144;
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const draw = () => {
    g.clearRect(0, 0, W, H);
    g.direction = 'rtl';
    g.font = '700 64px "Reem Kufi", "Cairo", sans-serif';
    const tw = Math.min(W - 60, g.measureText(text).width);
    const bw = tw + 70, bh = 96, x = (W - bw) / 2, y = 8;
    // Pill with a little pointer underneath.
    g.fillStyle = 'rgba(42, 20, 14, 0.25)';
    g.beginPath(); g.roundRect(x + 3, y + 6, bw, bh, 48); g.fill();
    g.fillStyle = '#fbf0dc';
    g.beginPath(); g.roundRect(x, y, bw, bh, 48); g.fill();
    g.beginPath(); g.moveTo(W / 2 - 16, y + bh - 2); g.lineTo(W / 2, y + bh + 26); g.lineTo(W / 2 + 16, y + bh - 2); g.fill();
    g.lineWidth = 6; g.strokeStyle = color;
    g.beginPath(); g.roundRect(x + 5, y + 5, bw - 10, bh - 10, 43); g.stroke();
    g.fillStyle = color;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, W / 2, y + bh / 2 + 4, W - 60);
    tex.needsUpdate = true;
  };
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  draw();
  document.fonts?.load('700 64px "Reem Kufi"', text).then(draw, () => {});
  return tex;
}

export function createPads(ctx) {
  const { scene, content, P, events, heightAt } = ctx;
  const pads = [];
  const disc = new THREE.CircleGeometry(1.25, 72);

  for (const z of content.zones) {
    const color = sectionAccent(z, content, P);
    const y = Math.max(heightAt(z.x, z.z), ...[0, 1, 2, 3].map((i) => heightAt(z.x + Math.cos(i * 1.57) * z.radius, z.z + Math.sin(i * 1.57) * z.radius)));
    const mat = padMaterial(color);
    const mesh = new THREE.Mesh(disc, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(z.x, y + 0.07, z.z);
    mesh.scale.setScalar(z.radius);
    mesh.renderOrder = 2;
    mesh.userData.noReveal = true;
    scene.add(mesh);

    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTexture(z.title, color), transparent: true, depthWrite: false, fog: false }));
    sprite.scale.set(4.2, 4.2 * 144 / 512, 1);
    sprite.center.set(0.5, 0);
    sprite.position.set(z.x, y + 3.2, z.z);
    sprite.renderOrder = 6;
    scene.add(sprite);
    pads.push({ zone: z, mesh, mat, sprite, baseY: y + 3.2, progress: 0, target: 0, active: 0, on: false, phase: Math.random() * 6 });
  }

  const byId = new Map(pads.map((p) => [p.zone.id, p]));
  events.on('zone:enter', (z) => { const p = byId.get(z.id); if (p) p.on = true; });
  events.on('zone:leave', (z) => { const p = byId.get(z.id); if (p) { p.on = false; p.target = 0; } });
  events.on('zone:progress', ({ zone, progress }) => { const p = byId.get(zone.id); if (p) p.target = progress; });
  events.on('zone:open', (z) => { const p = byId.get(z.id); if (p) p.target = 1; });
  events.on('panel:closed', () => { for (const p of pads) p.target = p.on ? 0 : p.target; });

  return {
    pads,
    update(dt, t) {
      const c = reveal.center.value;
      const r = reveal.radius.value;
      for (const p of pads) {
        p.progress += (p.target - p.progress) * Math.min(1, dt * 12);
        p.active += ((p.on ? 1 : 0) - p.active) * Math.min(1, dt * 6);
        p.mat.uniforms.uProgress.value = p.progress;
        p.mat.uniforms.uActive.value = p.active;
        p.mat.uniforms.uTime.value = t;
        // Labels bob gently and wait for the island to open up to them.
        const inside = Math.hypot(p.zone.x - c.x, p.zone.z - c.y) < r - 1;
        p.sprite.visible = inside;
        p.sprite.position.y = p.baseY + Math.sin(t * 1.6 + p.phase) * 0.18 + p.active * 0.35;
        const s = 4.2 * (1 + p.active * 0.12);
        p.sprite.scale.set(s, s * 144 / 512, 1);
      }
    },
  };
}
