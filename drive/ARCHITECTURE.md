# رحلة الصحراء — Arabic 3D driving-style portfolio (camel + rider)

An original interactive portfolio: the visitor rides a camel across a desert world and
rides into glowing "zones" (About, Projects, Skills, Experience, Contact) to open Arabic
(RTL) content panels. Works on desktop (keyboard / gamepad) and phones (touch joystick).
All assets are procedural (geometry in code, sound synthesized with WebAudio): no scraped
models, textures or audio. Inspired by the *genre* of 3D "drive around my portfolio" sites.

## Conventions (ALL modules must follow)
- ES modules, no build step. Import three as `import * as THREE from 'three'` (import map in
  index.html maps `three` -> `./vendor/three.module.js`; vendor/three.core.js sits beside it).
- Units: metres. Y up. Ground height comes from `world.heightAt(x, z)`.
- Heading `h` (radians): forward vector = `(sin h, cos h)` on the XZ plane. Models face +Z at h=0.
  `root.rotation.y = h`.
- Zone ids (fixed): `about`, `projects`, `skills`, `experience`, `contact`.
- World spawn at (0,0). Zones are on a ring/loop ~35-70 m from spawn; world radius ~140 m (soft wall).
- Modules must run in a plain browser (no node APIs) and unit-testable parts must not touch the DOM
  unless the file is DOM-oriented (ui.js / controls.js).
- Performance: budget ~150 draw calls, < 300k triangles, InstancedMesh for repeated objects.
  Mobile-friendly: cap pixel ratio elsewhere; expose `quality` ('low'|'med'|'high') where it matters.
- Do NOT edit files you don't own. Your report must document any interface deviation.

## Shared "ride state" (produced by physics.js, consumed by camel.js / audio.js / camera / ui)
```
state = {
  x, y, z,            // position of camel's ground contact (y = heightAt)
  heading,            // radians
  speed,              // signed forward speed m/s
  vx, vz,             // world velocity
  steer,              // -1..1 smoothed steering (positive = turn right/clockwise seen from above)
  throttle,           // -1..1 smoothed
  sprint,             // bool  – galloping boost active
  sprintEnergy,       // 0..1  – stamina bar
  braking,            // bool
  slip,               // 0..1  – lateral skid amount (dust / sound)
  gaitPhase,          // 0..1 repeating cycle, advances with distance travelled
  gait,               // 'idle'|'walk'|'trot'|'gallop'
  pitch, roll,        // body tilt from terrain slope (radians)
  grounded,           // bool
  lastBump,           // {t, strength 0..1, nx, nz} | null
}
```
Input (produced by controls in ui.js, consumed by physics):
`{ throttle:-1..1, steer:-1..1, sprint:bool, brake:bool, call:bool /*camel roar*/, reset:bool }`
steer > 0 turns right.

## Module interfaces
- `js/physics.js` (owner: physics agent)
  `export class RideController { constructor({heightAt, colliders, worldRadius}); state; update(dt, input); reset(x,z,h); on(evt, fn) }`
  events: `'bump' {strength,x,z}`, `'sprintStart'`, `'sprintEnd'`, `'call'`.
  `export class PropSystem { constructor({heightAt}); add({x,z,r,mass,type}) -> id; bodies[]; update(dt, ride: RideController) }`
  each body: `{id,type,x,y,z,vx,vz,vy,r,mass,yaw,spin}`; main syncs meshes from `bodies`.
  colliders: `{type:'circle',x,z,r}` or `{type:'box',x,z,hx,hz,rot}` (static).
- `js/camel.js` (owner: camel agent)
  `export function createCamelRider(): { root:THREE.Group, update(dt, state, time), setQuality(q), dispose() }`
  (root origin = ground contact; main sets root.position/rotation from state.)
- `js/world.js` (owner: world agent)
  `export function createWorld({quality}) -> { scene objects added to returned `group`, heightAt(x,z), colliders[], zones:[{id,x,z,r,color}], props:[{type,x,z,r,mass,mesh}], update(dt,time,playerPos), setTimeOfDay(t01), lights:{sun,...}, skyColor, dispose() }`
  It also owns fog/background/lighting objects (put them in `group` / set via returned `applyTo(scene)`).
- `js/audio.js` (owner: audio agent)
  `export class GameAudio { async unlock(); update(dt, state); play(name, opts); setMuted(b); setMusic(b); get muted }`
  names: `click`,`zoneEnter`,`zoneLeave`,`bump`,`call`,`sprint`,`collect`,`panelOpen`,`panelClose`.
  Engine-equivalent = camel hoofbeats (from gaitPhase/gait/speed), sand shuffle, breathing, wind ambience, plus
  an optional soft oud/qanun-style generative music loop in a maqam (Hijaz/Nahawand) that can be toggled.
- `js/content.js`, `js/ui.js`, `css/style.css`, `index.html` bits (owner: ui agent) — see its brief.
  `export const content = { ar:{...}, en:{...} }`; `export class UI { ... }`; `export function createInput(domElement) -> { read():input, dispose() }`.
