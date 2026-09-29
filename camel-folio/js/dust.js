import * as THREE from 'three';
import { reveal } from './reveal.js';

// Desert dust (غبار): fine sand motes drifting through the air, and low puffs of
// blowing sand skimming the ground. Particles live in a box around the camera
// target and wrap around its edges, so the dust always surrounds the camel.

function dotTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.45, 'rgba(255,255,255,0.45)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

class Layer {
  constructor(scene, { count, box, height, size, opacity, speed, color, map }) {
    this.count = count;
    this.box = box;
    this.height = height;
    this.speed = speed;
    this.baseOpacity = opacity;
    this.pos = new Float32Array(count * 3);
    this.seed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      this.pos[i * 3] = (Math.random() - 0.5) * box;
      this.pos[i * 3 + 1] = height[0] + Math.random() * (height[1] - height[0]);
      this.pos[i * 3 + 2] = (Math.random() - 0.5) * box;
      this.seed[i] = Math.random();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(this.seed, 1));
    this.geo = geo;
    this.material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        map: { value: map },
        tint: { value: new THREE.Color(color) },
        opacity: { value: opacity },
        size: { value: size },
        scale: { value: 300 },
        time: { value: 0 },
      },
      vertexShader: `attribute float aSeed; uniform float size; uniform float scale; uniform float time;
        varying float vA;
        void main(){
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          float flicker = 0.6 + 0.4 * sin(time * (1.0 + aSeed * 2.0) + aSeed * 40.0);
          vA = flicker;
          gl_PointSize = size * (0.6 + aSeed * 0.8) * scale / -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `uniform sampler2D map; uniform vec3 tint; uniform float opacity; varying float vA;
        void main(){
          float a = texture2D(map, gl_PointCoord).a * opacity * vA;
          if (a < 0.01) discard;
          gl_FragColor = vec4(tint, a);
        }`,
    });
    this.points = new THREE.Points(geo, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 3;
    scene.add(this.points);
  }

  update(dt, t, center, wind) {
    const half = this.box / 2;
    const p = this.pos;
    for (let i = 0; i < this.count; i++) {
      const j = i * 3;
      const s = this.seed[i];
      p[j] += wind.x * this.speed * (0.7 + s * 0.6) * dt;
      p[j + 2] += wind.z * this.speed * (0.7 + s * 0.6) * dt;
      p[j + 1] += Math.sin(t * (0.6 + s) + s * 20) * 0.25 * dt;
      // Wrap around the box centred on the camera target.
      const lx = p[j] - center.x, lz = p[j + 2] - center.z;
      if (lx > half) p[j] -= this.box; else if (lx < -half) p[j] += this.box;
      if (lz > half) p[j + 2] -= this.box; else if (lz < -half) p[j + 2] += this.box;
      if (p[j + 1] < this.height[0]) p[j + 1] = this.height[1];
      if (p[j + 1] > this.height[1]) p[j + 1] = this.height[0];
    }
    this.geo.attributes.position.needsUpdate = true;
    this.material.uniforms.time.value = t;
  }
}

export class Dust {
  constructor(scene, { mobile = false } = {}) {
    const map = dotTexture();
    this.motes = new Layer(scene, {
      count: mobile ? 600 : 1300, box: 70, height: [0.3, 9], size: 0.6,
      opacity: 0.85, speed: 1.0, color: '#fff3dc', map,
    });
    this.drift = new Layer(scene, {
      count: mobile ? 110 : 220, box: 60, height: [0.1, 1.8], size: 4.5,
      opacity: 0.28, speed: 2.4, color: '#f6dcb4', map,
    });
    this.wind = new THREE.Vector3(1, 0, 0.35).normalize().multiplyScalar(4);
    this.visible = 0;
  }

  // night: 0 (dusk) .. 1 (night). Dust fades in once the island opens.
  update(dt, t, center, night) {
    // Gusts: the wind swells and eases, and slowly swings direction.
    const gust = 3 + Math.sin(t * 0.23) * 1.5 + Math.max(0, Math.sin(t * 0.61)) * 2.5;
    const angle = 0.35 + Math.sin(t * 0.05) * 0.3;
    this.wind.set(Math.cos(angle), 0, Math.sin(angle)).multiplyScalar(gust);

    const open = reveal.radius.value > 40 ? 1 : 0;
    this.visible += (open - this.visible) * Math.min(1, dt * 1.5);
    const dim = 1 - night * 0.45;
    for (const layer of [this.motes, this.drift]) {
      layer.update(dt, t, center, this.wind);
      layer.material.uniforms.opacity.value = layer.baseOpacity * this.visible * dim * (0.8 + gust * 0.06);
      layer.points.visible = this.visible > 0.01;
    }
  }
}
