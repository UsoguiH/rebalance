import * as THREE from 'three';

// ضوء الشمس: one light full-screen pass after the scene render that gives the
// picture its sunny look: warm highlights and cool, slightly violet shadows
// (split toning), a touch more colour and contrast, a soft sun glow washing in
// from the sun's side of the screen, a bloom-like halo on the brightest spots
// and a warm vignette.

export function createPostFX(renderer, { mobile }) {
  const size = new THREE.Vector2();
  renderer.getDrawingBufferSize(size);
  const target = new THREE.WebGLRenderTarget(size.x, size.y, {
    samples: renderer.capabilities.isWebGL2 ? (mobile ? 2 : 4) : 0,
    type: THREE.HalfFloatType,
    colorSpace: THREE.LinearSRGBColorSpace,
  });

  const material = new THREE.ShaderMaterial({
    depthTest: false,
    depthWrite: false,
    uniforms: {
      tScene: { value: target.texture },
      uTexel: { value: new THREE.Vector2(1 / size.x, 1 / size.y) },
      uSun: { value: new THREE.Vector2(0.05, 1.05) },  // screen-space glow origin
      uStrength: { value: 1 },
      uTime: { value: 0 },
    },
    vertexShader: `varying vec2 vUv; void main(){ vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: `uniform sampler2D tScene; uniform vec2 uTexel; uniform vec2 uSun; uniform float uStrength; uniform float uTime;
      varying vec2 vUv;
      vec3 toSRGB(vec3 c){ return mix(c * 12.92, 1.055 * pow(max(c, 0.0), vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
      float luma(vec3 c){ return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
      void main(){
        vec3 lin = texture2D(tScene, vUv).rgb;
        // Cheap glow: bright neighbours bleed a little warmth outward.
        vec3 glow = vec3(0.0);
        for (int i = 0; i < 8; i++) {
          float a = float(i) * 0.785398;
          vec2 o = vec2(cos(a), sin(a)) * uTexel * 6.0;
          vec3 s = texture2D(tScene, vUv + o).rgb + texture2D(tScene, vUv + o * 2.2).rgb;
          glow += max(s - 1.6, 0.0);
        }
        lin += glow * 0.035 * uStrength;

        vec3 c = toSRGB(lin);
        float l = luma(c);
        // Split toning: shadows lean cool violet-blue, highlights warm gold.
        vec3 shadowTint = vec3(0.86, 0.9, 1.08);
        vec3 lightTint = vec3(1.07, 1.01, 0.9);
        vec3 graded = c * mix(shadowTint, lightTint, smoothstep(0.18, 0.72, l));
        // Saturation and gentle S-curve contrast.
        float gl = luma(graded);
        graded = mix(vec3(gl), graded, 1.12);
        graded = mix(graded, graded * graded * (3.0 - 2.0 * graded), 0.28);
        // Sun wash from the sun's side of the frame.
        float sd = distance(vUv * vec2(1.0, 0.8), uSun * vec2(1.0, 0.8));
        graded += vec3(1.0, 0.8, 0.5) * pow(max(0.0, 1.0 - sd * 0.9), 2.2) * 0.16;
        // Warm vignette.
        float v = smoothstep(1.15, 0.35, length(vUv - 0.5) * 1.45);
        graded = mix(graded * vec3(0.72, 0.58, 0.5), graded, v);
        c = mix(c, graded, uStrength);
        // A whisper of grain keeps the gradients from banding.
        float n = fract(sin(dot(vUv * 1000.0 + uTime, vec2(12.9898, 78.233))) * 43758.5453);
        c += (n - 0.5) / 255.0;
        gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
      }`,
  });
  const quad = new THREE.Mesh(new THREE.BufferGeometry(), material);
  quad.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
  quad.frustumCulled = false;
  const scene = new THREE.Scene();
  scene.add(quad);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  return {
    material,
    resize() {
      renderer.getDrawingBufferSize(size);
      target.setSize(size.x, size.y);
      material.uniforms.uTexel.value.set(1 / size.x, 1 / size.y);
    },
    render(mainScene, mainCamera, t) {
      material.uniforms.uTime.value = t % 10;
      renderer.setRenderTarget(target);
      renderer.render(mainScene, mainCamera);
      renderer.setRenderTarget(null);
      renderer.render(scene, camera);
    },
  };
}
