import { interpolate, spring } from "remotion";
import { EASE, ENTER, EXIT, T } from "../config";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const lerp = (
  frame: number,
  input: [number, number],
  output: [number, number],
  easing: (t: number) => number = EASE.inOut,
) => interpolate(frame, input, output, { ...clamp, easing });

// Entrance progress 0 → 1 with a slight overshoot (spring, damping ~14).
export const enter = (frame: number, start: number, fps = T.fps, dur = ENTER) =>
  spring({
    frame: frame - start,
    fps,
    config: { damping: 14, stiffness: 160, mass: 0.9 },
    durationInFrames: dur,
  });

// Exit progress 0 → 1 over the last EXIT frames of a scene, ease-in.
export const exitAt = (frame: number, sceneLength: number, dur = EXIT) =>
  interpolate(frame, [sceneLength - dur, sceneLength], [0, 1], { ...clamp, easing: EASE.in });

// Standard entrance style: rise + fade, with optional exit applied on top.
export const rise = (p: number, distance = 40) => ({
  opacity: Math.min(1, Math.max(0, p)),
  transform: `translateY(${(1 - p) * distance}px)`,
});

// Click press: scale 1 → 0.96 → 1 over 8 frames.
export const press = (frame: number, at: number, depth = 0.04) => {
  const t = frame - at;
  if (t < 0 || t > 8) return 1;
  return 1 - depth * Math.sin((Math.PI * t) / 8);
};

// Nothing ever fully stops: a slow, deterministic drift for holding elements.
export const drift = (frame: number, seed = 0, amp = 4) => ({
  x: Math.sin(frame / 70 + seed * 1.7) * amp,
  y: Math.cos(frame / 83 + seed * 2.3) * amp,
});

export const breathe = (frame: number, seed = 0, amt = 0.02) =>
  1 + amt * (0.5 + 0.5 * Math.sin(frame / 60 + seed));

// Deterministic hash noise in [0, 1).
export const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

export const smoothNoise = (x: number, seed = 0) => {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return hash(i + seed * 101) * (1 - u) + hash(i + 1 + seed * 101) * u;
};
