// world.js - original procedural Arabian desert world. See ARCHITECTURE.md for the interface.
import * as THREE from 'three';
import { mulberry32, smoothstep, clamp } from './world-util.js';
import { ZONE_DEFS, WORLD_RADIUS, PAD_R, zoneLayout } from './world-layout.js';
import { createHeightField, buildTerrain } from './world-terrain.js';
import { createSky, sampleKeys, makeSample, sunDirection } from './world-sky.js';
import { createZones } from './world-zones.js';
import { createDecor } from './world-decor.js';
import { createProps } from './world-props.js';

export const DEFAULT_TOD = 0.455; // golden hour

export function createWorld({ quality = 'med' } = {}) {
  if (!['low', 'med', 'high'].includes(quality)) quality = 'med';
  const group = new THREE.Group(); group.name = 'world';
  const rng = mulberry32(20240607);
  const uniforms = {
    uTime: { value: 0 }, uNight: { value: 0 }, uPlayer: { value: new THREE.Vector3() }, uPx: { value: 1.5 },
  };
  const disposables = [];
  const { heightAt } = createHeightField(7);
  const terrain = buildTerrain({ heightAt, quality, uniforms });
  group.add(terrain.mesh);

  const sky = createSky({ quality, uniforms, rng });
  group.add(sky.group);

  // ---- lights
  const sun = new THREE.DirectionalLight(0xffffff, 3);
  const shadowsOn = true;
  const shadowSize = quality === 'low' ? 1024 : 2048;
  const shadowHalf = { low: 34, med: 42, high: 52 }[quality];
  sun.castShadow = shadowsOn;
  sun.shadow.mapSize.set(shadowSize, shadowSize);
  const sc = sun.shadow.camera; sc.left = -shadowHalf; sc.right = shadowHalf; sc.top = shadowHalf; sc.bottom = -shadowHalf; sc.near = 1; sc.far = 320;
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.09;
  const hemi = new THREE.HemisphereLight(0xa0d0e0, 0xc08a60, 1);
  group.add(sun, sun.target, hemi);
  const fog = new THREE.Fog(0xf0b07e, 35, 250);
  const skyColor = new THREE.Color(0xf0b07e);

  const ctx = { quality, uniforms, rng, heightAt, meshY: terrain.meshY, group, colliders: [], sun, glowMats: [], texRedraws: [], anims: [], disposables };
  const zonesMod = createZones(ctx);
  const decor = createDecor(ctx, zonesMod);
  const propsMod = createProps(ctx, zonesMod, decor);
  group.add(zonesMod.group, decor.group);
  for (const m of propsMod.props) group.add(m.mesh);

  // ---- time of day
  let tod = DEFAULT_TOD;
  const samp = makeSample();
  const sunDir = new THREE.Vector3(), moonDir = new THREE.Vector3(), lightDir = new THREE.Vector3();
  const lastPlayer = new THREE.Vector3();
  function setTimeOfDay(t01) {
    tod = ((t01 % 1) + 1) % 1;
    const st = sky.setTOD(tod);
    sampleKeys(tod, samp);
    sunDirection(tod, sunDir); moonDir.copy(sunDir).multiplyScalar(-1);
    const sunW = samp.sunI * smoothstep(-0.12, 0.06, sunDir.y), moonW = samp.moonI * 0.75;
    lightDir.copy(sunDir).multiplyScalar(sunW).addScaledVector(moonDir, moonW);
    if (lightDir.lengthSq() < 1e-6) lightDir.copy(sunDir);
    lightDir.normalize();
    if (lightDir.y < 0.12) { lightDir.y = 0.12; lightDir.normalize(); } // never light from below the ground
    sun.color.copy(samp.sunC).multiplyScalar(sunW).add(new THREE.Color(0x9db4ff).multiplyScalar(moonW * 0.9));
    const tot = sunW + moonW;
    if (tot > 0.0001) sun.color.multiplyScalar(1 / tot);
    sun.intensity = sunW + moonW * 0.8;
    hemi.color.copy(samp.hemiS); hemi.groundColor.copy(samp.hemiG); hemi.intensity = samp.hemiI;
    fog.color.copy(samp.hor).lerp(samp.fog, 0.0);
    skyColor.copy(fog.color);
    world.fog.color.copy(fog.color);
    const night = st.night;
    zonesMod.setNight(night, tod);
    decor.setNight(night, tod);
    positionShadow(lastPlayer, true);
  }

  // shadow camera follows the player with texel snapping
  const _r = new THREE.Vector3(), _u = new THREE.Vector3(), _f = new THREE.Vector3(), _c = new THREE.Vector3();
  function positionShadow(p, force) {
    _f.copy(lightDir);                                   // from target toward light
    _r.crossVectors(new THREE.Vector3(0, 1, 0), _f).normalize();
    _u.crossVectors(_f, _r).normalize();
    const texel = (shadowHalf * 2) / shadowSize;
    const a = Math.round(p.dot(_r) / texel) * texel;
    const b = Math.round(p.dot(_u) / texel) * texel;
    const c = p.dot(_f);
    _c.set(0, 0, 0).addScaledVector(_r, a).addScaledVector(_u, b).addScaledVector(_f, c);
    sun.target.position.copy(_c);
    sun.position.copy(_c).addScaledVector(lightDir, 150);
    sun.target.updateMatrixWorld(); sun.updateMatrixWorld();
  }

  function update(dt, time, playerPos) {
    const p = playerPos || lastPlayer;
    lastPlayer.set(p.x || 0, p.y || 0, p.z || 0);
    uniforms.uTime.value = time;
    uniforms.uPlayer.value.copy(lastPlayer);
    sky.update(dt, time, lastPlayer);
    zonesMod.update(dt, time, lastPlayer, camPos);
    decor.update(dt, time, lastPlayer);
    positionShadow(lastPlayer);
  }
  const camPos = new THREE.Vector3();

  function applyTo(scene) {
    scene.background = skyColor;
    scene.fog = fog;
    if (group.parent !== scene) scene.add(group);
  }
  function configureRenderer(renderer) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    uniforms.uPx.value = Math.min(renderer.getPixelRatio(), 2);
  }
  function dispose() {
    group.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
      for (const m of ms) { for (const k in m) { const v = m[k]; if (v && v.isTexture) v.dispose(); } if (m.uniforms) for (const k in m.uniforms) { const v = m.uniforms[k].value; if (v && v.isTexture) v.dispose(); } m.dispose(); }
    });
    sun.shadow.map?.dispose();
    zonesMod.dispose?.(); decor.dispose?.();
    group.removeFromParent();
  }

  const world = {
    group, heightAt, meshY: terrain.meshY,
    colliders: ctx.colliders,
    zones: zonesMod.zones,
    props: propsMod.props,
    spawn: { x: 0, z: 0, heading: 0 },
    worldRadius: WORLD_RADIUS,
    lights: { sun, hemi },
    fog, skyColor,
    quality,
    get timeOfDay() { return tod; },
    update, setTimeOfDay, applyTo, configureRenderer, dispose,
    stamp: (x, z, h, s) => decor.stamp(x, z, h, s),
    zoneAt(x, z) { for (const zn of world.zones) if (Math.hypot(x - zn.x, z - zn.z) <= zn.r) return zn; return null; },
    setViewInfo({ pixelRatio, height, fov } = {}) { if (pixelRatio) uniforms.uPx.value = pixelRatio; },
    refreshSigns: () => zonesMod.refreshSigns(),
    stats: { terrainTris: terrain.tris },
  };
  setTimeOfDay(DEFAULT_TOD);
  return world;
}
