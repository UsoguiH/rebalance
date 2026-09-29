// لوحة الألوان المشتركة: every module picks its colours from here so the
// whole village reads as one piece. Warm sand, sun-baked mud brick, deep
// palm greens, turquoise water, and a few saturated accents for the souq.

export const P = {
  // sand & ground
  sandLight: '#f3d7a4',
  sand: '#e6bd7f',
  sandDeep: '#cf9a5c',
  sandShadow: '#a8703f',
  path: '#d9a86a',

  // mud brick (طين) & plaster
  mudLight: '#e9c08c',
  mud: '#c98e57',
  mudDark: '#9a6238',
  plaster: '#f4e4c6',
  wood: '#7a4a2a',
  woodLight: '#a8703f',

  // plants
  palmLeaf: '#4f8a3b',
  palmLeafDark: '#2f5f2c',
  palmTrunk: '#8a5a34',
  shrub: '#7f9a45',
  date: '#8e2f1e',

  // water
  water: '#3fb3b0',
  waterDeep: '#1f7f8c',
  waterFoam: '#e8fbf4',

  // rock
  rock: '#b98a64',
  rockDark: '#8a6146',

  // souq accents
  red: '#c43b2e',
  crimson: '#9e1f35',
  orange: '#e8742a',
  saffron: '#f0b12e',
  teal: '#1f8a8a',
  indigo: '#2e3f7f',
  cream: '#fbf0dc',
  brass: '#d8a336',
  ink: '#2a1a12',

  // camel
  camel: '#c8905a',
  camelLight: '#e8c79a',
  camelDark: '#8d5b35',

  // sky
  skyTop: '#6fa8d6',
  skyHorizon: '#f7dcae',
  fog: '#f0cf9c',
  sun: '#fff1cf',
};

// Hex string → THREE.Color friendly number.
export const hex = (s) => parseInt(s.slice(1), 16);
