// world-layout.js - shared static layout constants (zones, plateaus). No DOM, no three.
export const WORLD_RADIUS = 140;      // soft wall used by physics
export const GROUND_RADIUS = 240;     // rendered ground disc
export const LANDMARK_OFFSET = 15;    // landmark centre is this far behind the pad (away from spawn)
export const PAD_R = 6.5;

export const ZONE_DEFS = [
  { id: 'about',      x: 10,  z: 44,  color: '#ffb347', title: 'عنّي',    platY: 0.5 },
  { id: 'projects',   x: -46, z: 24,  color: '#3fd0c9', title: 'أعمالي',  platY: 0.0 },
  { id: 'skills',     x: -58, z: -34, color: '#7be495', title: 'مهاراتي', platY: -0.6 },
  { id: 'experience', x: 14,  z: -62, color: '#ff7a59', title: 'خبراتي',  platY: 1.0 },
  { id: 'contact',    x: 58,  z: -14, color: '#d98cff', title: 'تواصل معي', platY: 0.4 },
];

export const SPAWN = { x: 0, z: 0, y: 0, plateauInner: 15, plateauOuter: 30 };
export const GATE = { x: 0, z: 13 };

/** derived per-zone geometry: outward dir, landmark centre, yaw (local +Z faces spawn) and platform centre. */
export function zoneLayout(def) {
  const d = Math.hypot(def.x, def.z);
  const ox = def.x / d, oz = def.z / d;
  return {
    ox, oz,
    lx: def.x + ox * LANDMARK_OFFSET,
    lz: def.z + oz * LANDMARK_OFFSET,
    yaw: Math.atan2(-ox, -oz),
    cx: def.x + ox * 7, cz: def.z + oz * 7,     // platform centre
    inner: 19, outer: 34,
  };
}
