"use strict";
// shaders module: a light "shader pack" for Blockcraft.
// Post-processing (bloom, sun rays, lens flare, golden-hour grading, ACES tone mapping, vignette)
// plus animated water with sun glints and sky reflections. Toggle with O or the pause-menu button.
(function () {
  const Shaders = window.Shaders = { on: true };
  try { const v = localStorage.getItem('bc_shaders'); if (v !== null) Shaders.on = v === '1'; } catch (e) { /* storage blocked */ }

  // ---------- animated water (patches the shared water material and the open sea) ----------
  const U = { uTime: { value: 0 }, uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSkyCol: { value: new THREE.Color('#c0d8ff') }, uFx: { value: 1 } };
  function patchWater(mat) {
    mat.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = 'uniform float uTime; uniform float uFx; varying vec3 vWPos;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        if (uFx > 0.5 && fract(position.y) > 0.8) transformed.y += (sin(position.x * 1.3 + uTime) * 0.04 + cos(position.z * 1.1 + uTime * 1.3) * 0.04) - 0.04;
        vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`);
      sh.fragmentShader = 'uniform float uTime; uniform float uFx; uniform vec3 uSunDir; uniform vec3 uSkyCol; varying vec3 vWPos;\n' +
        sh.fragmentShader.replace('gl_FragColor = vec4( outgoingLight, diffuseColor.a );', `
        float alpha = diffuseColor.a;
        if (uFx > 0.5) {
          vec2 p = vWPos.xz; float t = uTime;
          float dx = 0.052 * cos(p.x * 1.3 + t) + 0.018 * cos(p.x * 0.6 + p.y * 0.8 + t * 0.7) + 0.02 * sin(p.x * 3.1 - t * 1.7);
          float dz = -0.044 * sin(p.y * 1.1 + t * 1.3) + 0.024 * cos(p.x * 0.6 + p.y * 0.8 + t * 0.7) + 0.02 * cos(p.y * 2.7 + t * 1.9);
          vec3 n = normalize(vec3(-dx * 5.0, 1.0, -dz * 5.0));
          vec3 V = normalize(cameraPosition - vWPos);
          float fres = pow(1.0 - max(dot(n, V), 0.0), 3.0);
          float spec = pow(max(dot(reflect(-V, n), uSunDir), 0.0), 90.0) * smoothstep(-0.05, 0.15, uSunDir.y);
          outgoingLight = mix(outgoingLight, uSkyCol, fres * 0.55) + vec3(1.0, 0.86, 0.62) * spec * 2.4;
          alpha = mix(alpha, 1.0, fres * 0.5);
        }
        gl_FragColor = vec4( outgoingLight, alpha );`);
    };
    mat.needsUpdate = true;
  }
  patchWater(waterMat);
  scene.traverse(o => { if (o.isMesh && o.material && o.material !== waterMat && o.material.color && o.material.color.getHex() === 0x3a64d6) patchWater(o.material); });

  // ---------- post-processing pipeline ----------
  const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), quadScene = new THREE.Scene();
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); quad.frustumCulled = false; quadScene.add(quad);
  const VERT = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
  const pass = (frag, uniforms) => new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false });
  const brightMat = pass(`uniform sampler2D t; varying vec2 vUv;
    void main() { vec3 c = texture2D(t, vUv).rgb; float l = max(c.r, max(c.g, c.b)); gl_FragColor = vec4(c * smoothstep(0.88, 1.0, l), 1.0); }`, { t: { value: null } });
  const blurMat = pass(`uniform sampler2D t; uniform vec2 dir; varying vec2 vUv;
    void main() { vec3 s = texture2D(t, vUv).rgb * 0.227;
      s += (texture2D(t, vUv + dir * 1.385).rgb + texture2D(t, vUv - dir * 1.385).rgb) * 0.316;
      s += (texture2D(t, vUv + dir * 3.231).rgb + texture2D(t, vUv - dir * 3.231).rgb) * 0.070;
      gl_FragColor = vec4(s, 1.0); }`, { t: { value: null }, dir: { value: new THREE.Vector2() } });
  const finalMat = pass(`uniform sampler2D tScene, tBloom; uniform vec2 uSun; uniform float uSunVis, uWarm, uNight, uAspect; varying vec2 vUv;
    vec3 aces(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
    void main() {
      vec3 c = texture2D(tScene, vUv).rgb, b = texture2D(tBloom, vUv).rgb;
      vec3 rays = vec3(0.0);
      if (uSunVis > 0.0) {                                   // screen-space light shafts from the sun
        vec2 d = (vUv - uSun) / 32.0, uv = vUv; float w = 1.0;
        for (int i = 0; i < 32; i++) { uv -= d; rays += texture2D(tBloom, uv).rgb * w; w *= 0.94; }
        rays *= uSunVis / 45.0;
        vec2 axis = vec2(0.5) - uSun;                          // lens flare ghosts
        for (int i = 1; i < 4; i++) { vec2 q = (vUv - (uSun + axis * float(i) * 0.6)) * vec2(uAspect, 1.0);
          c += vec3(0.55, 0.65, 1.0) * smoothstep(0.045 * float(i), 0.0, length(q)) * 0.07 * uSunVis; }
      }
      c += b * (0.45 - uNight * 0.25) + rays * mix(vec3(1.0, 0.92, 0.75), vec3(1.0, 0.68, 0.35), uWarm);
      c = mix(c, c * vec3(1.14, 1.0, 0.8), uWarm * 0.75);     // golden hour
      c = mix(c, c * vec3(0.82, 0.9, 1.15), uNight * 0.5);     // cool night
      c = mix(c, aces(c * 1.25), 0.75);
      float l = dot(c, vec3(0.299, 0.587, 0.114)); c = mix(vec3(l), c, 1.15);
      vec2 v = vUv - 0.5; c *= 1.0 - dot(v, v) * 0.55;
      gl_FragColor = vec4(c, 1.0);
    }`, { tScene: { value: null }, tBloom: { value: null }, uSun: { value: new THREE.Vector2() }, uSunVis: { value: 0 }, uWarm: { value: 0 }, uNight: { value: 0 }, uAspect: { value: 1 } });

  let rtScene = null, rtA = null, rtB = null, w = 0, h = 0;
  const size = new THREE.Vector2();
  function ensureTargets() {
    renderer.getDrawingBufferSize(size);
    if (rtScene && size.x === w && size.y === h) return;
    w = size.x; h = size.y; [rtScene, rtA, rtB].forEach(r => r && r.dispose());
    rtScene = new THREE.WebGLRenderTarget(w, h, { depthBuffer: true });
    const bw = Math.max(1, w >> 2), bh = Math.max(1, h >> 2);
    rtA = new THREE.WebGLRenderTarget(bw, bh); rtB = new THREE.WebGLRenderTarget(bw, bh);
  }
  const tmp = new THREE.Vector3(), camDir = new THREE.Vector3();
  const orig = renderer.render.bind(renderer);
  function draw(mat, target) { quad.material = mat; renderer.setRenderTarget(target); orig(quadScene, quadCam); }
  renderer.render = (s, c) => {
    if (!Shaders.on || s !== scene) return orig(s, c);
    ensureTargets();
    // sun position on screen and how strongly it shows
    const sunDir = tmp.copy(sunMesh.position).sub(camera.position).normalize();
    camera.getWorldDirection(camDir);
    const night = typeof World !== 'undefined' && World.isNight ? (World.isNight() ? 1 : 0) : 0;
    finalMat.uniforms.uNight.value += (night - finalMat.uniforms.uNight.value) * .05;
    finalMat.uniforms.uWarm.value = clamp(1 - (sunDir.y - .05) / .45, 0, 1) * (sunDir.y > -.1 ? 1 : 0) * .9 + .1;
    const p = sunMesh.position.clone().project(camera), front = camDir.dot(sunDir);
    const edge = clamp(1.25 - Math.max(Math.abs(p.x), Math.abs(p.y)), 0, 1);
    finalMat.uniforms.uSunVis.value = sunMesh.visible && front > 0 && sunDir.y > -.05 ? edge * clamp(front * 2, 0, 1) : 0;
    finalMat.uniforms.uSun.value.set(p.x * .5 + .5, p.y * .5 + .5);
    finalMat.uniforms.uAspect.value = w / h;
    // render the world, then bright-pass + blur at quarter resolution, then composite
    renderer.setRenderTarget(rtScene); orig(s, c);
    brightMat.uniforms.t.value = rtScene.texture; draw(brightMat, rtA);
    blurMat.uniforms.t.value = rtA.texture; blurMat.uniforms.dir.value.set(1 / rtA.width, 0); draw(blurMat, rtB);
    blurMat.uniforms.t.value = rtB.texture; blurMat.uniforms.dir.value.set(0, 1 / rtA.height); draw(blurMat, rtA);
    finalMat.uniforms.tScene.value = rtScene.texture; finalMat.uniforms.tBloom.value = rtA.texture;
    draw(finalMat, null);
  };

  // water uniforms follow the sun and sky every frame
  on('tick', dt => {
    U.uTime.value += dt; U.uFx.value = Shaders.on ? 1 : 0;
    U.uSunDir.value.copy(sunMesh.position).sub(camera.position).normalize();
    if (scene.fog) U.uSkyCol.value.copy(scene.fog.color);
  });

  // ---------- toggle: O key and a pause-menu button ----------
  function setOn(v) { Shaders.on = v; btn.textContent = 'Shaders: ' + (v ? 'ON' : 'OFF'); try { localStorage.setItem('bc_shaders', v ? '1' : '0'); } catch (e) { /* storage blocked */ } }
  const btn = document.createElement('button'); btn.className = 'mcbtn'; btn.type = 'button'; btn.id = 'shaderBtn';
  btn.addEventListener('click', () => { SFX.uiClick(); setOn(!Shaders.on); });
  const menu = document.querySelector('#pause .menu'); if (menu) menu.appendChild(btn);
  setOn(Shaders.on);
  Shaders.set = setOn;
  on('key', e => { if (e.code === 'KeyO') { setOn(!Shaders.on); chat('Shaders: ' + (Shaders.on ? 'ON' : 'OFF')); return true; } return false; });
})();
