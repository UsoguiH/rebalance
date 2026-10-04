// Per-role palettes.  lit/mid/shade/deep are multipliers on the builder's base colour
// (applied in display space), so the builder's hex stays the "mid-light" local colour.
const D = {
  lit: [1.0, 1.0, 1.0], mid: [0.82, 0.82, 0.86], shade: [0.55, 0.53, 0.68], deep: [0.40, 0.38, 0.52],
  ink: [0.07, 0.05, 0.08], specCol: [1, 1, 1], rimCol: [1.0, 0.66, 0.34],
  spec: 0.0, shin: 40, bump: 0.0, hatch: 1.0, pitch: 5.5, angle: 0.95, strand: 0.0,
  rim: 0.5, metal: false, flatCol: false, outline: 2.4, litT: 0.30,
};

export const ROLES = {
  // white suit: warm white -> pale lavender-grey in shadow, crumpled ink folds
  suit: { ...D, lit: [0.99, 0.99, 1.0], mid: [0.84, 0.83, 0.90], shade: [0.57, 0.55, 0.72], deep: [0.46, 0.43, 0.60],
          spec: 0.0, bump: 0.9, hatch: 1.0, pitch: 5.4, litT: 0.38, angle: 1.15, rim: 0.65, outline: 2.8 },
  // dark maroon undershirt
  shirt: { ...D, lit: [1.15, 1.1, 1.1], mid: [0.9, 0.85, 0.9], shade: [0.58, 0.5, 0.6], deep: [0.42, 0.34, 0.42],
           bump: 0.35, hatch: 1.0, pitch: 4.8, angle: 1.1, rim: 0.3, outline: 2.4, ink: [0.05, 0.015, 0.03] },
  // warm peach skin, ink hatching on jaw / cheeks / neck
  skin: { ...D, lit: [1.04, 1.01, 0.96], mid: [0.96, 0.82, 0.74], shade: [0.80, 0.56, 0.50], deep: [0.62, 0.38, 0.36],
          spec: 0.35, shin: 60, specCol: [1.0, 0.95, 0.82], bump: 0.05, hatch: 0.85, pitch: 4.4, angle: 1.2, rim: 0.45,
          outline: 2.0, ink: [0.14, 0.06, 0.05], litT: 0.22 },
  // white/silver hair with dense strand ink
  hair: { ...D, lit: [1.0, 1.0, 1.01], mid: [0.95, 0.96, 0.98], shade: [0.80, 0.83, 0.92], deep: [0.64, 0.68, 0.80],
          strand: 0.10, hatch: 0.5, pitch: 3.3, angle: 1.45, rim: 0.7, outline: 0.7, ink: [0.13, 0.14, 0.22],
          spec: 0.35, shin: 70 },
  // gold: custom yellow/orange gradient ramp
  gold: { ...D, metal: true, lit: [1, 1, 1], mid: [1, 1, 1], shade: [0.7, 0.45, 0.3], deep: [0.4, 0.2, 0.1],
          hatch: 0.55, pitch: 4.8, angle: 1.15, rim: 0.25, rimCol: [1.0, 0.9, 0.5], outline: 2.2, ink: [0.14, 0.05, 0.01],
          spec: 0.0 },
  // brown lace-up boot leather
  leather: { ...D, lit: [1.38, 1.15, 0.98], mid: [1.0, 0.9, 0.85], shade: [0.55, 0.40, 0.40], deep: [0.30, 0.20, 0.22],
             spec: 0.45, shin: 30, specCol: [1.0, 0.82, 0.62], bump: 0.15, hatch: 1.0, pitch: 4.4, angle: 1.0,
             rim: 0.4, outline: 2.8, ink: [0.07, 0.025, 0.02] },
  // throne frame: painted gold derived from the base colour
  throne: { ...D, metal: true, lit: [1.4, 1.3, 1.0], mid: [1.0, 0.95, 0.85], shade: [0.72, 0.5, 0.35], deep: [0.4, 0.2, 0.12],
            hatch: 0.8, pitch: 5.0, angle: 1.15, rim: 0.3, rimCol: [1.0, 0.85, 0.45], outline: 2.8, ink: [0.14, 0.05, 0.01] },
  // red velvet cushions
  velvet: { ...D, lit: [1.3, 1.25, 1.2], mid: [1.0, 1.0, 1.0], shade: [0.58, 0.55, 0.62], deep: [0.38, 0.35, 0.42],
            bump: 0.3, hatch: 1.0, pitch: 5.0, angle: 1.45, rim: 0.4, outline: 2.2, ink: [0.07, 0.01, 0.03] },
  // eyes: nearly flat, tiny highlight
  eye: { ...D, lit: [1.0, 1.0, 1.0], mid: [0.97, 0.95, 0.97], shade: [0.82, 0.78, 0.84], deep: [0.7, 0.66, 0.72],
         spec: 0.9, shin: 120, hatch: 0.0, rim: 0.0, outline: 0.9, flatCol: true, litT: 0.2 },
};

export function resolveRole(role, opts = {}) {
  const r = { ...ROLES[role] };
  if (typeof opts.hatch === 'number') r.hatch = opts.hatch;
  if (typeof opts.bump === 'number') r.bump = opts.bump;
  if (typeof opts.spec === 'number') r.spec = opts.spec;
  if (typeof opts.shininess === 'number') r.shin = opts.shininess;
  return r;
}
