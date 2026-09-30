import * as THREE from 'three';

// البداية: before the visitor starts, the world is cut down to a small round
// island around the camel, floating in a howling sandstorm. Starting grows the
// island until it swallows the whole village and the storm dies down.
//
// Every world material gets a tiny shader patch: fragments farther than
// `radius` from `center` (on the ground plane) are discarded, and a warm band
// glows where the cut passes through things.

export const reveal = {
  center: { value: new THREE.Vector2(0, 0) },
  radius: { value: 7.5 },
  glow: { value: 1 },
};

export const ISLAND_RADIUS = 7.5;
const FULL_RADIUS = 320;

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
  float rvEdge = smoothstep(uRevealRadius - 0.35, uRevealRadius - 0.02, rvD) * uRevealGlow;
`;
const FRAG_END = 'gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1.0, 0.93, 0.72) * 1.6, rvEdge);\n';

function patchShader(shader) {
  if (!shader.vertexShader.includes('#include <project_vertex>')) return;
  const fragHook = shader.fragmentShader.includes('#include <clipping_planes_fragment>')
    ? '#include <clipping_planes_fragment>'
    : (shader.fragmentShader.includes('#include <alphatest_fragment>') ? '#include <alphatest_fragment>' : null);
  if (!fragHook) return;
  shader.uniforms.uRevealGlow = reveal.glow;
  shader.uniforms.uRevealCenter = reveal.center;
  shader.uniforms.uRevealRadius = reveal.radius;
  shader.vertexShader = VERT_DECL + shader.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n' + VERT_CODE);
  let frag = FRAG_DECL + shader.fragmentShader.replace(fragHook, fragHook + '\n' + FRAG_CODE);
  if (frag.includes('#include <dithering_fragment>')) frag = frag.replace('#include <dithering_fragment>', FRAG_END + '#include <dithering_fragment>');
  shader.fragmentShader = frag;
}

function patch(material) {
  if (!material || !material.isMaterial || material.userData.revealPatched || material.userData.noReveal) return;
  if (material.isShaderMaterial || material.isPointsMaterial || material.isSpriteMaterial) return;
  material.userData.revealPatched = true;
  const prev = material.onBeforeCompile;
  material.onBeforeCompile = function (shader, renderer) {
    if (prev) prev.call(this, shader, renderer);
    patchShader(shader);
  };
  const key = material.customProgramCacheKey ? material.customProgramCacheKey.bind(material) : () => '';
  material.customProgramCacheKey = () => key() + '|reveal';
  material.needsUpdate = true;
}

// Patch every material in the scene (call again after adding objects).
export function applyReveal(scene) {
  scene.traverse((o) => {
    if (!o.material || o.userData.noReveal) return;
    (Array.isArray(o.material) ? o.material : [o.material]).forEach(patch);
  });
}

// GLSL snippet for hand-written ShaderMaterials: declare with REVEAL_GLSL,
// pass world position, then call revealClip(worldPos.xz).
export const REVEAL_GLSL = `
uniform vec2 uRevealCenter; uniform float uRevealRadius;
void revealClip(vec2 p) { if (distance(p, uRevealCenter) > uRevealRadius) discard; }
`;
export const revealUniforms = () => ({ uRevealCenter: reveal.center, uRevealRadius: reveal.radius });

// The start sequence: 0 = island (waiting), then grows to the full world.
export function createRevealController(ctx) {
  const { events } = ctx;
  const state = {
    progress: 0,   // 0 island … 1 whole world
    started: false,
    storm: 1,      // 1 full sandstorm … 0 calm (read by the storm, audio, dust)
    done: false,
  };
  const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
  let t = 0;
  const DURATION = 3.6;

  state.setCenter = (x, z) => reveal.center.value.set(x, z);
  state.start = () => { state.started = true; t = 0; };
  state.update = (dt) => {
    if (!state.started || state.done) return;
    t += dt;
    const k = Math.min(1, t / DURATION);
    state.progress = k;
    // Slow at first so the edge visibly races outward, then a big whoosh.
    const e = ease(k);
    reveal.radius.value = ISLAND_RADIUS + (FULL_RADIUS - ISLAND_RADIUS) * e * e;
    reveal.glow.value = 1 - Math.min(1, k * 1.4);
    state.storm = 1 - Math.min(1, k * 1.25);
    if (k >= 1) {
      state.done = true;
      reveal.radius.value = 1e6;
      reveal.glow.value = 0;
      state.storm = 0;
      events.emit('reveal:done');
    }
  };
  reveal.radius.value = ISLAND_RADIUS;
  reveal.glow.value = 1;
  return state;
}
