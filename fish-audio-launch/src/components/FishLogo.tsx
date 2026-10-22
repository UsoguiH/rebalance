import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { C } from "../config";
import { enter } from "../lib/motion";

// The Fish Audio mark: a fish drawn with waveform bars (from fish.audio's logo SVG).
// "tail" bars are the grey reflection under the body.
const BARS: { x: number; y: number; h: number; tail?: boolean }[] = [
  { x: 38.1, y: 200, h: 19.4 },
  { x: 71, y: 202.7, h: 30.7 },
  { x: 103.9, y: 198.4, h: 77.4 },
  { x: 136.9, y: 192, h: 20 },
  { x: 136.9, y: 245.4, h: 58.3 },
  { x: 168.6, y: 235.1, h: 100.8 },
  { x: 200.6, y: 222.4, h: 102.2 },
  { x: 232.6, y: 204.1, h: 115.8 },
  { x: 264.5, y: 190.2, h: 120.1 },
  { x: 297.1, y: 181.9, h: 107.1 },
  { x: 297.1, y: 299.3, h: 21.4, tail: true },
  { x: 328.9, y: 177, h: 87.8 },
  { x: 328.9, y: 276.4, h: 46, tail: true },
  { x: 360.9, y: 175, h: 86.6 },
  { x: 360.9, y: 270.7, h: 51.6, tail: true },
  { x: 392.9, y: 178.1, h: 75.4 },
  { x: 392.9, y: 264.3, h: 52.1, tail: true },
  { x: 424.7, y: 185.2, h: 60.2 },
  { x: 424.7, y: 256.6, h: 47.4, tail: true },
  { x: 456.7, y: 204.1, h: 38 },
  { x: 456.7, y: 249.9, h: 27.1, tail: true },
];

// Crop of the 512 viewBox that holds the mark.
const VB = { x: 30, y: 168, w: 452, h: 176 };

export const FishLogo: React.FC<{ size: number; start: number; color?: string; tailColor?: string; live?: boolean }> = ({
  size,
  start,
  color = C.cream,
  tailColor = C.dim,
  live = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const k = size / VB.w;
  return (
    <svg width={size} height={VB.h * k} viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`} style={{ overflow: "visible" }}>
      {BARS.map((b, i) => {
        // Build left to right, 2 frames apart, each bar growing from its centre.
        const order = Math.round((b.x - 38) / 32.8);
        const p = enter(frame, start + order * 2 + (b.tail ? 3 : 0), fps);
        // Once built, the bars keep breathing like a live waveform.
        const pulse = live ? 1 + 0.08 * Math.sin((frame - start) / 9 + i * 0.9) * Math.min(1, Math.max(0, (frame - start - 50) / 30)) : 1;
        const h = Math.max(0.01, b.h * p * pulse);
        const cy = b.y + b.h / 2;
        return (
          <rect
            key={i}
            x={b.x}
            y={cy - h / 2}
            width={16}
            height={h}
            rx={8}
            fill={b.tail ? tailColor : color}
            opacity={Math.min(1, Math.max(0, p * 1.5))}
          />
        );
      })}
    </svg>
  );
};
