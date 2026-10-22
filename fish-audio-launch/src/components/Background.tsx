import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { C, T } from "../config";

// Global backdrop under every scene: warm black, two soft light pools with a
// light parallax drift, a fine grain, and a teal glow that arrives with the product.
export const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const fixStart = T.scenes.fix[0];
  const glow = interpolate(frame, [fixStart - 20, fixStart + 40], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const px = Math.sin(frame / 240) * 60;
  const py = Math.cos(frame / 300) * 40;
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(60% 55% at ${30 + px / 20}% ${25 + py / 20}%, rgba(244,238,235,0.07), transparent 70%)`,
        }}
      />
      <AbsoluteFill
        style={{
          opacity: glow,
          background: `radial-gradient(55% 60% at ${70 - px / 25}% ${75 - py / 25}%, rgba(0,137,168,0.22), transparent 70%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: "radial-gradient(120% 120% at 50% 50%, transparent 55%, rgba(0,0,0,0.55) 100%)",
        }}
      />
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, opacity: 0.06, mixBlendMode: "screen" }}>
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={(frame % 6) + 1} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
    </AbsoluteFill>
  );
};
