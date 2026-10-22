import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { EASE } from "../config";

export type CameraKey = { f: number; s?: number; x?: number; y?: number };

const track = (frame: number, keys: CameraKey[], prop: "s" | "x" | "y", fallback: number) => {
  const pts = keys.filter((k) => k[prop] !== undefined);
  if (pts.length === 0) return fallback;
  if (pts.length === 1) return pts[0][prop] as number;
  return interpolate(
    frame,
    pts.map((k) => k.f),
    pts.map((k) => k[prop] as number),
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE.inOut },
  );
};

// One camera per scene. Keyframed moves use an easy ease; on top of that the
// camera always has a micro-push so the shot never fully stops.
export const Camera: React.FC<{ keys?: CameraKey[]; push?: number; children: React.ReactNode }> = ({
  keys = [],
  push = 0.015,
  children,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const s = track(frame, keys, "s", 1) * (1 + (push * frame) / durationInFrames);
  const x = track(frame, keys, "x", 0);
  const y = track(frame, keys, "y", 0);
  return (
    <AbsoluteFill style={{ transform: `translate(${x}px, ${y}px) scale(${s})`, transformOrigin: "50% 50%" }}>
      {children}
    </AbsoluteFill>
  );
};
