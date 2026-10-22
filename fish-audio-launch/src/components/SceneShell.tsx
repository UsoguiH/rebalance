import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { exitAt } from "../lib/motion";

// Shared scene exit: fast (~60% of an entrance), ease-in, slight scale-down.
export const SceneShell: React.FC<{ children: React.ReactNode; exit?: boolean }> = ({ children, exit = true }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const e = exit ? exitAt(frame, durationInFrames) : 0;
  return (
    <AbsoluteFill style={{ opacity: 1 - e, transform: `scale(${1 - 0.05 * e})`, filter: e > 0 ? `blur(${e * 8}px)` : undefined }}>
      {children}
    </AbsoluteFill>
  );
};

// Fits a fixed-size rig (designed for the 16:9 master) into narrower canvases,
// leaving room for camera pushes inside the 5% safe zone.
export const rigScale = (width: number, height: number, w: number, h: number, maxFrac = 0.84) =>
  Math.min(1, (width * maxFrac) / w, (height * 0.9) / h);

export const Rig: React.FC<{ w: number; h: number; maxFrac?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({
  w,
  h,
  maxFrac = 0.84,
  children,
  style,
}) => {
  const { width, height } = useVideoConfig();
  const s = rigScale(width, height, w, h, maxFrac);
  return (
    <div style={{ width: w * s, height: h * s, position: "relative", flexShrink: 0, ...style }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: w, height: h, transform: `scale(${s})`, transformOrigin: "0 0" }}>
        {children}
      </div>
    </div>
  );
};
