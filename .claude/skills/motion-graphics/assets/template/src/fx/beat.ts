import { createContext, useContext } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";

// Beat times (seconds, absolute) and this scene's start (seconds), provided by Launch.tsx.
export const BeatCtx = createContext<{ beats: number[]; sceneStart: number }>({ beats: [], sceneStart: 0 });

/** 0..1 pulse that spikes on every music beat and decays: use it for subtle scale/glow bumps. */
export const useBeat = (every = 1, decay = 0.18): number => {
  const { beats, sceneStart } = useContext(BeatCtx);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (!beats.length) return 0;
  const now = sceneStart + frame / fps;
  let last = -1;
  for (let i = 0; i < beats.length; i += every) {
    if (beats[i] <= now) last = beats[i];
    else break;
  }
  if (last < 0) return 0;
  return Math.exp(-(now - last) / decay);
};
