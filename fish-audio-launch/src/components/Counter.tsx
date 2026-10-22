import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { EASE } from "../config";

// Counts over ~1 s (60 frames), ease-out. Never jumps to the final value in one frame.
export const Counter: React.FC<{
  from?: number;
  to: number;
  start: number;
  dur?: number;
  suffix?: string;
  style?: React.CSSProperties;
}> = ({ from = 0, to, start, dur = 60, suffix = "", style }) => {
  const frame = useCurrentFrame();
  const v = interpolate(frame, [start, start + dur], [from, to], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE.out,
  });
  return (
    <span style={{ fontVariantNumeric: "tabular-nums", ...style }}>
      {Math.round(v).toLocaleString("en-US")}
      {suffix}
    </span>
  );
};
