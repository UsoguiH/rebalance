// قرية الواحة — the village: mud-brick houses, the gate, the souq, my house,
// the skills tent, the post tower, the well plaza and a pile of knockable
// props. Static pieces are merged per area (one draw call each); fabric,
// lantern glass and sign faces each share one mesh.
import { Kit, Labels, makeXBuilder, fabricMaterial, glowMaterial } from './village/kit.js';
import { house, wall, watchtower, gate } from './village/houses.js';
import { stall, home, tent, skillSign, postTower, plaza, oasisBits } from './village/landmarks.js';
import { createProps } from './village/props.js';

export function createVillage(ctx) {
  const { THREE, P, content, scene, physics, heightAt, Builder, LAYOUT } = ctx;
  const zone = (id) => content.zones.find((z) => z.id === id);
  const { spots } = content;

  const uTime = { value: 0 };
  const chunks = {};
  const chunk = (name) => (chunks[name] ||= new Builder());
  const B = {
    stat: chunk('core'),
    fab: makeXBuilder(Builder, 'aFlap', 3),
    glow: makeXBuilder(Builder, 'aPhase', 1),
  };
  const root = new Kit(B, physics);
  const labels = new Labels();
  const props = createProps(ctx);

  // Ground height under a footprint (lowest corner, so nothing floats).
  const groundUnder = (x, z, r = 0) => {
    if (!r) return heightAt(x, z);
    let m = Infinity;
    for (const [dx, dz] of [[0, 0], [r, r], [-r, r], [r, -r], [-r, -r]]) m = Math.min(m, heightAt(x + dx, z + dz));
    return m;
  };
  const place = (name, x, z, ry = 0, r = 2) => root.into(chunk(name)).at(x, groundUnder(x, z, r), z, ry);

  // ---------------------------------------------------------------- houses
  // [x, z, rotY, spec, chunk]
  const HOUSES = [
    [-9, 7.5, Math.PI / 2, { w: 5, d: 6, floors: 2, style: 'tri', seed: 1 }, 'west'],
    [-16.5, 6.5, Math.PI, { w: 5, d: 5, floors: 1, style: 'step', seed: 2, upper: { w: 2.6, d: 2.4, x: 0.9, z: -0.9 } }, 'west'],
    [-31, -7, Math.PI / 2, { w: 7, d: 5, floors: 2, style: 'step', seed: 3 }, 'west'],
    [-30, 6, Math.PI / 2, { w: 5, d: 5, floors: 1, style: 'tri', seed: 4, upper: { w: 2.4, d: 2.6, x: -0.8, z: 0.8 } }, 'west'],
    [-12, -20, 0, { w: 7, d: 5, floors: 2, style: 'step', seed: 5, doorX: 1.2 }, 'north'],
    [-22, -19.5, 0, { w: 5, d: 5, floors: 1, style: 'tri', seed: 6, upper: { w: 2.5, d: 2.4, x: -1, z: -1 } }, 'north'],
    [-9, -30, Math.PI / 2, { w: 5, d: 5, floors: 2, style: 'tri', seed: 7 }, 'north'],
    [12, -22.5, -Math.PI / 2, { w: 6, d: 6, floors: 2, style: 'tri', seed: 8, doorX: -1 }, 'north'],
    [10, 4, Math.PI, { w: 6, d: 5, floors: 1, style: 'step', seed: 9, upper: { w: 2.8, d: 2.4, x: 1.2, z: 0.9 } }, 'east'],
    [17.5, 5, 0, { w: 5, d: 5, floors: 1, style: 'tri', seed: 10 }, 'east'],
  ];
  for (const [x, z, ry, s, c] of HOUSES) house(place(c, x, z, ry, 3), P, s);

  // ---------------------------------------------------------------- gate + walls
  const g = spots.gate;
  gate(place('gate', g.x, g.z, 0, 3), P, labels);
  const wk = root.into(chunk('gate'));
  const gy = heightAt(g.x, g.z);
  wall(wk.at(0, gy - 0.05, 0), P, [g.x - 6.2, g.z - 0.1], [g.x - 11.2, g.z - 0.5]);
  wall(wk.at(0, gy - 0.05, 0), P, [g.x + 6.2, g.z - 0.1], [g.x + 11.0, g.z - 0.3]);
  watchtower(place('gate', g.x - 12.9, g.z - 0.6, 0, 1.5), P, { r: 1.9, h: 8.2, seed: 12 });
  watchtower(place('gate', g.x + 12.2, g.z - 0.4, 0, 1.2), P, { r: 1.3, h: 5.2, seed: 13 });
  // low yard walls
  const yw = root.into(chunk('west'));
  wall(yw.at(0, heightAt(-24.5, 9.2) - 0.05, 0), P, [-27.6, 9.2], [-21.2, 9.2], 1.5, 0.45);
  wall(yw.at(0, heightAt(-17.5, -19.5) - 0.05, 0), P, [-19.4, -19.8], [-15.6, -19.8], 1.6, 0.45);
  wall(root.into(chunk('east')).at(0, heightAt(24, 3) - 0.05, 0), P, [21.5, 1.8], [26.5, 1.8], 1.4, 0.45);

  // ---------------------------------------------------------------- souq
  content.zones.filter((z) => z.section === 'project').forEach((z) => {
    const ry = Math.atan2(z.x - z.landmark.x, z.z - z.landmark.z); // face the zone
    stall(place('west', z.landmark.x, z.landmark.z, ry, 2), P, labels, content.projects[z.project], z.project, props);
  });
  // a few props at the ends of the market lane
  for (const [t, x, z] of [['crate', -18.2, -0.4], ['basket', -17.3, -0.2], ['pot', -18.6, -13.8], ['crate', -17.4, -14.2]]) props.add(t, x, z, 0.4);

  // ---------------------------------------------------------------- my house
  const ab = zone('about');
  home(place('east', ab.landmark.x, ab.landmark.z - 2.2, 0, 4), P, labels);
  // (door faces +z = south = the zone)

  // ---------------------------------------------------------------- skills tent
  const sk = zone('skills');
  tent(place('north', sk.landmark.x, sk.landmark.z - 1, 0, 4), P, props);
  const skills = content.skills;
  const half = Math.ceil(skills.length / 2);
  skills.forEach((s, i) => {
    const left = i < half;
    const j = left ? i : i - half;
    const x = sk.x + (left ? -3.6 : 3.6);
    const z = sk.z + 9.5 - j * (8 / Math.max(1, half - 1));
    skillSign(place('north', x, z, left ? 0.18 : -0.18, 0), P, labels, s, i);
  });

  // ---------------------------------------------------------------- post tower
  const ct = zone('contact');
  const try_ = Math.atan2(ct.x - ct.landmark.x, ct.z - ct.landmark.z);
  postTower(place('east', ct.landmark.x + 1, ct.landmark.z, try_, 2), P, labels, props);

  // ---------------------------------------------------------------- plaza + well
  const w = spots.well;
  const bucket = plaza(place('plaza', w.x, w.z, 0, 0), P, heightAt, w.x, w.z, Builder, props);
  scene.add(bucket);

  // ---------------------------------------------------------------- oasis
  oasisBits(root.into(chunk('oasis')), P, heightAt, zone('oasis'), LAYOUT.oasis, labels);

  // ---------------------------------------------------------------- playground: a pyramid of pots to bowl over
  const pg = spots.playground;
  {
    const T = props.types.pot;
    const base = heightAt(pg.x, pg.z);
    for (let row = 0; row < 4; row++) {
      for (let i = 0; i < 4 - row; i++) {
        const x = pg.x + (i - (3 - row) / 2) * (T.r * 2 + 0.03);
        props.add('pot', x, pg.z - 1, 0, base + T.h / 2 + 0.01 + row * (T.h + 0.005));
      }
    }
    const C = props.types.crate;
    for (let row = 0; row < 3; row++) {
      for (let i = 0; i < 3 - row; i++) {
        const x = pg.x + 3.6 + (i - (2 - row) / 2) * (C.w + 0.02);
        props.add('crate', x, pg.z - 0.4, 0, heightAt(x, pg.z - 0.4) + C.h / 2 + 0.02 + row * (C.h + 0.005));
      }
    }
    // a runway rug pointing at the stack
    const rk = place('gate', pg.x, pg.z + 3.2, 0, 0);
    rk.box([1.6, 0.04, 6], P.red, { position: [0, 0.04, 0] });
    for (let i = 0; i < 6; i++) rk.box([1.6, 0.045, 0.14], i % 2 ? P.saffron : P.cream, { position: [0, 0.045, -2.6 + i * 1.04] });
    // two pots and a basket by the gate
    props.add('pot', g.x - 3.5, g.z + 1.8);
    props.add('basket', g.x + 3.6, g.z + 1.9);
  }

  // ---------------------------------------------------------------- build meshes
  const meshes = [];
  for (const [name, b] of Object.entries(chunks)) {
    const m = b.build();
    m.name = 'village-' + name;
    scene.add(m);
    meshes.push(m);
  }
  const fabric = B.fab.build({ material: fabricMaterial(uTime) });
  fabric.name = 'village-fabric';
  const glow = B.glow.build({ castShadow: false, receiveShadow: false, material: glowMaterial(uTime) });
  glow.name = 'village-glow';
  const signs = labels.build();
  scene.add(fabric, glow, signs);
  props.build(scene);

  return {
    update(dt, t) {
      uTime.value = t;
      bucket.rotation.z = Math.sin(t * 1.1) * 0.06;
      bucket.rotation.x = Math.sin(t * 0.8 + 1) * 0.04;
      props.update();
    },
    props,
  };
}
