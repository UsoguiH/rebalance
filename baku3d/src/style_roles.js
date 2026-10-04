// Per-role palettes.  lit/mid/shade/deep are multipliers on the builder's base colour
// (applied in display space), so the builder's hex stays the "lit" local colour.
const D = {
  lit: [1.0, 1.0, 1.0], mid: [0.86, 0.86, 0.9], shade: [0.62, 0.62, 0.69], deep: [0.46, 0.46, 0.53],
  ink: [0.06, 0.05, 0.07], specCol: [1, 1, 1], rimCol: [1.0, 0.80, 0.42],
  spec: 0.0, shin: 40, bump: 0.0, hatch: 1.0, pitch: 5.0, angle: 1.15, strand: 0.0,
  rim: 0.6, metal: false, flatCol: false, outline: 2.0, litT: 0.22, midT: -0.05, solid: 0.0,
};

export const ROLES = {
  // white suit: clean white lit side, neutral cool-grey (slightly lavender) shadow, crisp strokes only in shadow
  suit: { ...D, lit: [0.995, 0.995, 1.0], mid: [0.88, 0.88, 0.91], shade: [0.64, 0.64, 0.71], deep: [0.46, 0.46, 0.54],
          bump: 0.7, hatch: 1.0, pitch: 5.0, angle: 1.15, rim: 0.6, outline: 2.3, litT: 0.20, midT: -0.10, solid: 1.0 },
  // dark maroon undershirt
  shirt: { ...D, lit: [1.15, 1.1, 1.1], mid: [0.85, 0.8, 0.85], shade: [0.55, 0.48, 0.56], deep: [0.38, 0.3, 0.38],
           bump: 0.3, hatch: 0.9, pitch: 4.4, angle: 1.1, rim: 0.3, outline: 2.0, ink: [0.05, 0.015, 0.03], solid: 1.0 },
  // warm peach skin: two-tone cel + warm orange mid-shadow, fine hatching only in the real shadow side
  skin: { ...D, lit: [1.03, 1.01, 0.98], mid: [0.98, 0.78, 0.62], shade: [0.86, 0.58, 0.46], deep: [0.66, 0.40, 0.34],
          spec: 0.3, shin: 60, specCol: [1.0, 0.95, 0.82], bump: 0.0, hatch: 0.55, pitch: 3.4, angle: 1.2, rim: 0.7,
          outline: 1.2, ink: [0.16, 0.07, 0.05], litT: 0.18, midT: -0.22, solid: 0.5 },
  // white/silver hair with ink strands
  hair: { ...D, lit: [1.0, 1.0, 1.01], mid: [0.95, 0.96, 0.98], shade: [0.80, 0.83, 0.92], deep: [0.64, 0.68, 0.80],
          strand: 0.10, hatch: 0.5, pitch: 3.3, angle: 1.45, rim: 0.8, outline: 0.7, ink: [0.13, 0.14, 0.22],
          spec: 0.35, shin: 70, midT: -0.1 },
  // gold: yellow -> brown gradient ramp, glossy white-yellow highlights
  gold: { ...D, metal: true, lit: [1, 1, 1], mid: [1, 1, 1], shade: [0.7, 0.45, 0.3], deep: [0.4, 0.2, 0.1],
          hatch: 0.6, pitch: 4.4, angle: 1.15, rim: 0.2, rimCol: [1.0, 0.9, 0.5], outline: 1.9, ink: [0.12, 0.05, 0.01],
          spec: 0.0, solid: 0.7 },
  // brown lace-up boot leather
  leather: { ...D, lit: [1.3, 1.1, 0.96], mid: [0.95, 0.85, 0.8], shade: [0.55, 0.4, 0.4], deep: [0.3, 0.2, 0.22],
             spec: 0.4, shin: 30, specCol: [1.0, 0.82, 0.62], bump: 0.15, hatch: 1.0, pitch: 4.2, angle: 1.0,
             rim: 0.5, outline: 2.3, ink: [0.07, 0.025, 0.02], solid: 1.0, midT: -0.05 },
  // throne frame: painted gold derived from the base colour
  throne: { ...D, metal: true, lit: [1.4, 1.3, 1.0], mid: [1.0, 0.95, 0.85], shade: [0.72, 0.5, 0.35], deep: [0.4, 0.2, 0.12],
            hatch: 0.8, pitch: 5.0, angle: 1.15, rim: 0.3, rimCol: [1.0, 0.85, 0.45], outline: 2.2, ink: [0.12, 0.05, 0.01], solid: 0.8 },
  // red velvet cushions
  velvet: { ...D, lit: [1.2, 1.15, 1.1], mid: [0.9, 0.85, 0.9], shade: [0.6, 0.52, 0.6], deep: [0.4, 0.34, 0.4],
            bump: 0.25, hatch: 0.9, pitch: 5.0, angle: 1.45, rim: 0.4, outline: 2.0, ink: [0.07, 0.01, 0.03], solid: 1.0 },
  // eyes / ink decals: flat, tiny highlight
  eye: { ...D, lit: [1.0, 1.0, 1.0], mid: [0.97, 0.95, 0.97], shade: [0.82, 0.78, 0.84], deep: [0.7, 0.66, 0.72],
         spec: 0.9, shin: 120, hatch: 0.0, rim: 0.0, outline: 0.0, flatCol: true, litT: 0.2 },
};

export function resolveRole(role, opts = {}) {
  const r = { ...ROLES[role] };
  if (typeof opts.hatch === 'number') r.hatch = opts.hatch;
  if (typeof opts.bump === 'number') r.bump = opts.bump;
  if (typeof opts.spec === 'number') r.spec = opts.spec;
  if (typeof opts.shininess === 'number') r.shin = opts.shininess;
  return r;
}
