import { Easing, interpolate, spring } from "remotion";

// Curves that read as "designed" rather than linear. out = fast start, soft landing.
export const ease = {
  out: Easing.bezier(0.16, 1, 0.3, 1),
  inOut: Easing.bezier(0.65, 0, 0.35, 1),
  in: Easing.bezier(0.7, 0, 0.84, 0),
  back: Easing.bezier(0.34, 1.56, 0.64, 1),
};

/** 0→1 progress between start and start+dur frames, clamped. */
export const prog = (frame: number, start: number, dur: number, easing = ease.out) =>
  interpolate(frame, [start, start + Math.max(1, dur)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing,
  });

/** Springy 0→1 (overshoots slightly) starting at `delay` frames. */
export const pop = (frame: number, fps: number, delay = 0, config: Record<string, number> = {}) =>
  spring({ frame: frame - delay, fps, config: { damping: 14, stiffness: 170, mass: 0.7, ...config } });

/** 1 while on screen, easing to 0 over the last `len` frames of a scene. */
export const exitFade = (frame: number, durationInFrames: number, len = 10) =>
  1 - prog(frame, durationInFrames - len, len, ease.in);

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Deterministic pseudo-random in [0,1) so renders are repeatable. */
export const rand = (seed: number) => {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

/** Interpolate through keyframes [{t, ...values}] (t in frames) with inOut easing. */
export function keyframes<T extends Record<string, number>>(frame: number, keys: (T & { t: number })[]): T {
  if (keys.length === 0) return {} as T;
  if (frame <= keys[0].t) return keys[0];
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (frame <= b.t) {
      const p = prog(frame, a.t, b.t - a.t, ease.inOut);
      const out: Record<string, number> = {};
      for (const k of Object.keys(b)) {
        if (k === "t") continue;
        const av = (a as any)[k] ?? (b as any)[k];
        out[k] = lerp(av, (b as any)[k], p);
      }
      return { ...a, ...out } as T;
    }
  }
  return keys[keys.length - 1];
}
