import * as THREE from 'three';
import { windUniforms } from './util.js';

// ماء الواحة: a stylised pond. Colour runs from turquoise shallows to deep
// teal by depth; drifting ripple bands, sun glints, a foam ring at the shore
// and little wave lines rolling in. Lambert-based so palms cast shadows on it.

export function createWater(ctx, groundH, shore) {
  const { P, scene, LAYOUT } = ctx;
  const { oasis } = LAYOUT;
  const R = shore.max + 1.5;
  const seg = ctx.mobile ? 44 : 64;
  const plane = new THREE.PlaneGeometry(R * 2, R * 2, seg, seg).rotateX(-Math.PI / 2).toNonIndexed();
  const p = plane.attributes.position;
  const pos = [], depth = [];
  for (let i = 0; i < p.count; i += 3) {
    const tri = [];
    let any = false;
    for (let k = 0; k < 3; k++) {
      const x = p.getX(i + k) + oasis.x, z = p.getZ(i + k) + oasis.z;
      const d = oasis.water - groundH(x, z);
      if (d > -0.05) any = true;
      tri.push([x, z, d]);
    }
    if (!any) continue;
    for (const [x, z, d] of tri) { pos.push(x, oasis.water, z); depth.push(d); }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('depth', new THREE.Float32BufferAttribute(depth, 1));
  geo.computeVertexNormals();

  const uniforms = {
    uTime: windUniforms.uTime,
    uShallow: { value: new THREE.Color(P.water) },
    uDeep: { value: new THREE.Color(P.waterDeep) },
    uFoam: { value: new THREE.Color(P.waterFoam) },
    uCenter: { value: new THREE.Vector2(oasis.x, oasis.z) },
  };
  const material = new THREE.MeshLambertMaterial({ color: '#ffffff' });
  material.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = 'attribute float depth;\nvarying float vDepth;\nvarying vec3 vW;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vDepth = depth;
      vW = (modelMatrix * vec4(transformed, 1.0)).xyz;`);
    sh.fragmentShader = /* glsl */`
      uniform float uTime;
      uniform vec3 uShallow, uDeep, uFoam;
      uniform vec2 uCenter;
      varying float vDepth;
      varying vec3 vW;
    ` + sh.fragmentShader
      .replace('#include <color_fragment>', /* glsl */`#include <color_fragment>
      float t = uTime;
      float dd = clamp(vDepth / 1.3, 0.0, 1.0);
      vec3 wc = mix(uShallow * 1.08, uDeep, smoothstep(0.05, 1.0, dd));
      vec2 q = vW.xz;
      float w1 = sin(q.x * 1.1 + t * 0.9 + sin(q.y * 0.6 + t * 0.5) * 1.6);
      float w2 = sin(q.y * 1.3 - t * 0.7 + sin(q.x * 0.8 - t * 0.4) * 1.4);
      float rip = w1 * w2;
      wc = mix(wc, uShallow * 1.3, smoothstep(0.55, 0.9, rip) * 0.35);
      wc = mix(wc, uDeep * 0.85, smoothstep(-0.6, -0.9, rip) * 0.25);
      // Wave lines rolling toward the shore.
      float ring = fract(vDepth * 2.2 + t * 0.28);
      float line = smoothstep(0.0, 0.05, ring) * (1.0 - smoothstep(0.07, 0.14, ring));
      float nearShore = 1.0 - smoothstep(0.15, 0.75, vDepth);
      wc = mix(wc, uFoam, line * nearShore * 0.55);
      // Foam ring hugging the sand, wobbling.
      vec2 rel = q - uCenter;
      float ang = atan(rel.y, rel.x);
      float edge = 0.1 + 0.05 * sin(ang * 7.0 + t * 1.6) + 0.03 * sin(ang * 13.0 - t * 2.3);
      float foam = 1.0 - smoothstep(edge - 0.03, edge + 0.02, vDepth);
      wc = mix(wc, uFoam, foam);
      diffuseColor.rgb = wc;`)
      .replace('#include <emissivemap_fragment>', /* glsl */`#include <emissivemap_fragment>
      {
        vec2 r1 = mat2(0.8, -0.6, 0.6, 0.8) * vW.xz;
        float g = sin(r1.x * 3.3 + uTime * 1.9 + sin(vW.z * 1.7 + uTime) * 2.0) * sin(r1.y * 2.9 - uTime * 1.4 + sin(vW.x * 1.3) * 2.0);
        float glint = pow(max(g, 0.0), 30.0) * smoothstep(0.25, 0.85, rip) * (1.0 - foam) * smoothstep(0.1, 0.5, vDepth);
        totalEmissiveRadiance += vec3(1.0, 0.95, 0.8) * glint * 1.4 + uShallow * 0.12;
      }`);
  };
  material.customProgramCacheKey = () => 'qarya-water';

  const mesh = new THREE.Mesh(geo, material);
  mesh.receiveShadow = true;
  mesh.name = 'oasis-water';
  scene.add(mesh);
  return mesh;
}
