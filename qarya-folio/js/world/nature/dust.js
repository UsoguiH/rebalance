import * as THREE from 'three';

// الرمل المتطاير: fine motes drifting around the camera target, and low
// sand puffs skimming the dunes. Both wrap in a box around the player and
// follow the gusting wind.

function pointsMaterial(color) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uScale: { value: 400 }, uOpacity: { value: 1 } },
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */`
      attribute float aSize;
      attribute float aAlpha;
      uniform float uScale;
      varying float vAlpha;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = aSize * uScale / -mv.z;
        vAlpha = aAlpha * smoothstep(1.0, 4.0, -mv.z);
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uColor;
      uniform float uOpacity;
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float a = (1.0 - smoothstep(0.2, 1.0, d)) * vAlpha * uOpacity;
        if (a < 0.004) discard;
        gl_FragColor = vec4(uColor, a);
        #include <colorspace_fragment>
      }`,
  });
}

export function createDust(ctx, groundH) {
  const { scene, mobile } = ctx;
  const R = Math.random;

  // Fine motes.
  const nM = mobile ? 220 : 560;
  const BX = 56, BY = 14;
  const mPos = new Float32Array(nM * 3), mSize = new Float32Array(nM), mAlpha = new Float32Array(nM), mSeed = new Float32Array(nM);
  for (let i = 0; i < nM; i++) {
    mPos[i * 3] = (R() - 0.5) * BX; mPos[i * 3 + 1] = R() * BY - 1; mPos[i * 3 + 2] = (R() - 0.5) * BX;
    mSize[i] = 0.05 + R() * 0.09;
    mAlpha[i] = 0.35 + R() * 0.5;
    mSeed[i] = R() * 100;
  }
  const mGeo = new THREE.BufferGeometry();
  const mAttr = new THREE.BufferAttribute(new Float32Array(nM * 3), 3).setUsage(THREE.DynamicDrawUsage);
  mGeo.setAttribute('position', mAttr);
  mGeo.setAttribute('aSize', new THREE.BufferAttribute(mSize, 1));
  mGeo.setAttribute('aAlpha', new THREE.BufferAttribute(mAlpha, 1));
  const motesMat = pointsMaterial('#fff0cf');
  const motes = new THREE.Points(mGeo, motesMat);
  motes.frustumCulled = false;
  motes.renderOrder = 5;
  scene.add(motes);

  // Ground puffs: soft blobs that grow and fade as they skim along.
  const nP = mobile ? 34 : 80;
  const BP = 50;
  const puffs = [];
  const pGeo = new THREE.BufferGeometry();
  const pAttr = new THREE.BufferAttribute(new Float32Array(nP * 3), 3).setUsage(THREE.DynamicDrawUsage);
  const pSize = new THREE.BufferAttribute(new Float32Array(nP), 1).setUsage(THREE.DynamicDrawUsage);
  const pAlpha = new THREE.BufferAttribute(new Float32Array(nP), 1).setUsage(THREE.DynamicDrawUsage);
  pGeo.setAttribute('position', pAttr);
  pGeo.setAttribute('aSize', pSize);
  pGeo.setAttribute('aAlpha', pAlpha);
  const puffMat = pointsMaterial('#ecc996');
  const puffPoints = new THREE.Points(pGeo, puffMat);
  puffPoints.frustumCulled = false;
  puffPoints.renderOrder = 4;
  scene.add(puffPoints);
  for (let i = 0; i < nP; i++) puffs.push({ x: 0, y: 0, z: 0, life: 0, max: 1, size: 1, dead: true, lift: 0 });

  const center = new THREE.Vector3();
  let spawnAcc = 0;

  function spawn(p, wind, anywhere) {
    const dx = wind.dir.x, dz = wind.dir.y;
    // Upwind half of the box, or anywhere at the start.
    let x = (R() - 0.5) * BP, z = (R() - 0.5) * BP;
    if (!anywhere) {
      const along = -BP * 0.5 * (0.3 + R() * 0.7);
      const side = (R() - 0.5) * BP;
      x = dx * along - dz * side; z = dz * along + dx * side;
    }
    p.x = center.x + x; p.z = center.z + z;
    p.max = 3 + R() * 4; p.life = 0; p.dead = false;
    p.size = 1.2 + R() * 2.2; p.lift = 0.1 + R() * 0.5;
    p.speed = 0.7 + R() * 0.6;
    p.y = groundH(p.x, p.z) + 0.3;
  }

  return {
    update(dt, t, wind) {
      const target = ctx.rig && ctx.rig.intro < 0.999 ? ctx.rig.target : ctx.player ? ctx.player.position : null;
      if (target) center.copy(target);
      const cam = ctx.camera;
      if (cam) {
        const k = ctx.renderer.domElement.height / (2 * Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2));
        motesMat.uniforms.uScale.value = k;
        puffMat.uniforms.uScale.value = k;
      }
      const g = wind.gust;
      const sp = 1.2 + wind.strength * 1.5 + g * 5.5;
      const wx = wind.dir.x * sp, wz = wind.dir.y * sp;

      // Motes: advect with wind + a little swirl, wrap around the centre.
      const a = mAttr.array;
      for (let i = 0; i < nM; i++) {
        const s = mSeed[i];
        let x = mPos[i * 3] + (wx + Math.sin(t * 0.7 + s) * 0.6) * dt;
        let y = mPos[i * 3 + 1] + (Math.sin(t * 0.9 + s * 1.3) * 0.35 + g * 0.3) * dt;
        let z = mPos[i * 3 + 2] + (wz + Math.cos(t * 0.6 + s * 0.7) * 0.6) * dt;
        // Wrap relative to the (moving) centre.
        const rx = x - center.x, rz = z - center.z;
        if (rx > BX / 2) x -= BX; else if (rx < -BX / 2) x += BX;
        if (rz > BX / 2) z -= BX; else if (rz < -BX / 2) z += BX;
        const ry = y - center.y;
        if (ry > BY) y -= BY + 1; else if (ry < -1) y += BY + 1;
        mPos[i * 3] = x; mPos[i * 3 + 1] = y; mPos[i * 3 + 2] = z;
        a[i * 3] = x; a[i * 3 + 1] = y; a[i * 3 + 2] = z;
      }
      mAttr.needsUpdate = true;
      motesMat.uniforms.uOpacity.value = 0.55 + g * 0.45;

      // Puffs.
      spawnAcc += dt * (1.5 + g * 16) * (mobile ? 0.5 : 1);
      const pa = pAttr.array;
      for (let i = 0; i < nP; i++) {
        const p = puffs[i];
        if (p.dead) {
          if (spawnAcc >= 1) { spawnAcc -= 1; spawn(p, wind, t < 0.5); } else { pAlpha.array[i] = 0; continue; }
        }
        p.life += dt;
        const k = p.life / p.max;
        if (k >= 1 || Math.hypot(p.x - center.x, p.z - center.z) > BP * 0.75) { p.dead = true; pAlpha.array[i] = 0; continue; }
        p.x += wx * 1.5 * p.speed * dt;
        p.z += wz * 1.5 * p.speed * dt;
        const gh = groundH(p.x, p.z);
        p.y += (gh + 0.25 + p.lift * k * 2 - p.y) * Math.min(1, dt * 3);
        pa[i * 3] = p.x; pa[i * 3 + 1] = p.y; pa[i * 3 + 2] = p.z;
        pSize.array[i] = p.size * (0.5 + k * 1.2);
        pAlpha.array[i] = Math.sin(Math.PI * k) * (0.18 + g * 0.22);
      }
      spawnAcc = Math.min(spawnAcc, 3);
      pAttr.needsUpdate = true; pSize.needsUpdate = true; pAlpha.needsUpdate = true;
    },
  };
}
