// Post-processing: HDR scene target (MSAA) -> bloom (bright pass + blurred mips) ->
// composite with turbo radial blur, ACES tone mapping, the warm smoggy Sunsprings grade,
// vignette, hit flash / frozen tint, light chromatic fringe and film grain.
import * as THREE from 'three';

const quadVert = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;
const brightFrag = /* glsl */ `
  uniform sampler2D tDiffuse; uniform float uThreshold;
  varying vec2 vUv;
  void main() {
    vec3 c = texture2D(tDiffuse, vUv).rgb;
    float l = max(c.r, max(c.g, c.b));
    float k = smoothstep(uThreshold, uThreshold + 0.8, l);
    gl_FragColor = vec4(c * k, 1.0);
  }
`;
const blurFrag = /* glsl */ `
  uniform sampler2D tDiffuse; uniform vec2 uDir;
  varying vec2 vUv;
  void main() {
    vec3 s = texture2D(tDiffuse, vUv).rgb * 0.227;
    s += texture2D(tDiffuse, vUv + uDir * 1.385).rgb * 0.316;
    s += texture2D(tDiffuse, vUv - uDir * 1.385).rgb * 0.316;
    s += texture2D(tDiffuse, vUv + uDir * 3.231).rgb * 0.070;
    s += texture2D(tDiffuse, vUv - uDir * 3.231).rgb * 0.070;
    gl_FragColor = vec4(s, 1.0);
  }
`;
const compFrag = /* glsl */ `
  uniform sampler2D tScene, tBloom1, tBloom2;
  uniform float uRadial, uTime, uHit, uFrozen, uExposure, uBloom, uVignette, uGrain, uLowHp, uFade, uDesat;
  uniform vec2 uCenter;
  varying vec2 vUv;
  vec3 aces(vec3 x) {
    const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
    return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
  }
  float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  void main() {
    vec2 uv = vUv;
    vec3 col;
    if (uRadial > 0.001) {
      vec2 dir = uv - uCenter;
      float amt = uRadial * smoothstep(0.08, 0.6, length(dir));
      col = vec3(0.0);
      for (int i = 0; i < 12; i++) {
        float t = float(i) / 11.0;
        col += texture2D(tScene, uv - dir * amt * t * 0.16).rgb;
      }
      col /= 12.0;
    } else {
      // subtle chromatic fringe toward the edges (stronger on hits)
      vec2 d = (uv - 0.5) * (0.0015 + uHit * 0.008);
      col.r = texture2D(tScene, uv + d).r;
      col.g = texture2D(tScene, uv).g;
      col.b = texture2D(tScene, uv - d).b;
    }
    col += (texture2D(tBloom1, uv).rgb * 0.6 + texture2D(tBloom2, uv).rgb * 0.8) * uBloom;
    col *= uExposure;
    col = aces(col);
    // grade: warm smog, lifted blacks, slightly crushed greens
    float l = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(vec3(l), col, 0.86 - uDesat);
    col = col * vec3(1.04, 0.99, 0.9) + vec3(0.014, 0.009, 0.0);
    col = pow(col, vec3(1.04));
    // frozen + low health tints
    col = mix(col, vec3(l) * vec3(0.7, 0.9, 1.25), uFrozen * 0.55);
    col = mix(col, col * vec3(1.25, 0.65, 0.6), uLowHp * (0.18 + 0.12 * sin(uTime * 6.0)));
    col += vec3(0.6, 0.05, 0.02) * uHit * 0.35 * smoothstep(0.2, 0.75, length(uv - 0.5));
    // vignette
    float v = smoothstep(0.95, 0.25, length((uv - 0.5) * vec2(1.15, 1.0)));
    col *= mix(1.0, v, uVignette);
    // grain
    col += (hash(uv * 1000.0 + uTime) - 0.5) * uGrain;
    col *= uFade;
    // linear -> sRGB
    col = clamp(col, 0.0, 1.0);
    col = mix(col * 12.92, 1.055 * pow(col, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, col));
    gl_FragColor = vec4(col, 1.0);
  }
`;

export class Post {
  constructor(renderer, samples = 4) {
    this.r = renderer;
    // some mobile GPUs can't render to half-float targets: fall back to 8-bit
    const ext = renderer.extensions;
    this.hdrType = ext.has('EXT_color_buffer_half_float') || ext.has('EXT_color_buffer_float') ? THREE.HalfFloatType : THREE.UnsignedByteType;
    const opts = { type: this.hdrType, depthBuffer: true };
    this.main = new THREE.WebGLRenderTarget(4, 4, { ...opts, samples });
    this.b0 = new THREE.WebGLRenderTarget(4, 4, { type: this.hdrType, depthBuffer: false });
    this.b1 = new THREE.WebGLRenderTarget(4, 4, { type: this.hdrType, depthBuffer: false });
    this.c0 = new THREE.WebGLRenderTarget(4, 4, { type: this.hdrType, depthBuffer: false });
    this.c1 = new THREE.WebGLRenderTarget(4, 4, { type: this.hdrType, depthBuffer: false });
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    this.quad.frustumCulled = false;
    this.scene = new THREE.Scene();
    this.scene.add(this.quad);
    this.bright = new THREE.ShaderMaterial({ uniforms: { tDiffuse: { value: null }, uThreshold: { value: 1.1 } }, vertexShader: quadVert, fragmentShader: brightFrag });
    this.blur = new THREE.ShaderMaterial({ uniforms: { tDiffuse: { value: null }, uDir: { value: new THREE.Vector2() } }, vertexShader: quadVert, fragmentShader: blurFrag });
    this.comp = new THREE.ShaderMaterial({
      uniforms: {
        tScene: { value: null }, tBloom1: { value: null }, tBloom2: { value: null },
        uRadial: { value: 0 }, uCenter: { value: new THREE.Vector2(0.5, 0.45) }, uTime: { value: 0 }, uHit: { value: 0 }, uFrozen: { value: 0 },
        uExposure: { value: 1.0 }, uBloom: { value: 0.55 }, uVignette: { value: 0.55 }, uGrain: { value: 0.025 }, uLowHp: { value: 0 }, uFade: { value: 1 }, uDesat: { value: 0 },
      },
      vertexShader: quadVert,
      fragmentShader: compFrag,
      depthTest: false,
      depthWrite: false,
    });
    this.u = this.comp.uniforms;
  }
  setSamples(n) {
    const w = this.main.width, h = this.main.height;
    this.main.dispose();
    this.main = new THREE.WebGLRenderTarget(w, h, { type: this.hdrType, depthBuffer: true, samples: n });
  }
  setSize(w, h) {
    this.main.setSize(w, h);
    const hw = Math.max(1, w >> 1), hh = Math.max(1, h >> 1);
    const qw = Math.max(1, w >> 2), qh = Math.max(1, h >> 2);
    this.b0.setSize(hw, hh);
    this.b1.setSize(hw, hh);
    this.c0.setSize(qw, qh);
    this.c1.setSize(qw, qh);
    this.w = w;
    this.h = h;
  }
  pass(mat, target) {
    this.quad.material = mat;
    this.r.setRenderTarget(target);
    this.r.render(this.scene, this.cam);
  }
  render(scene, camera) {
    const r = this.r;
    r.setRenderTarget(this.main);
    r.render(scene, camera);
    this.stats = { calls: r.info.render.calls, tris: r.info.render.triangles };
    // bloom
    this.bright.uniforms.tDiffuse.value = this.main.texture;
    this.pass(this.bright, this.b0);
    const blur = (src, dst, w, h, dx, dy) => {
      this.blur.uniforms.tDiffuse.value = src.texture;
      this.blur.uniforms.uDir.value.set(dx / w, dy / h);
      this.pass(this.blur, dst);
    };
    blur(this.b0, this.b1, this.b0.width, this.b0.height, 1, 0);
    blur(this.b1, this.b0, this.b0.width, this.b0.height, 0, 1);
    this.blur.uniforms.tDiffuse.value = this.b0.texture;
    this.blur.uniforms.uDir.value.set(1 / this.c0.width, 0);
    this.pass(this.blur, this.c1);
    blur(this.c1, this.c0, this.c0.width, this.c0.height, 0, 1.5);
    blur(this.c0, this.c1, this.c0.width, this.c0.height, 1.5, 0);
    blur(this.c1, this.c0, this.c0.width, this.c0.height, 0, 2.5);
    this.u.tScene.value = this.main.texture;
    this.u.tBloom1.value = this.b0.texture;
    this.u.tBloom2.value = this.c0.texture;
    this.pass(this.comp, null);
  }
}
