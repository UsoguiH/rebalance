import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

export type CursorStop = { f: number; x: number; y: number };

// Arc travel: quadratic bezier with the control point pushed 15% of the
// distance off the straight line, eased with a soft spring so it settles with
// a tiny overshoot, like a real hand.
const travelFrames = (dist: number) => Math.round(Math.min(40, Math.max(20, dist / 22)));

export const cursorPosition = (frame: number, stops: CursorStop[], fps: number) => {
  let pos = { x: stops[0].x, y: stops[0].y };
  for (let i = 1; i < stops.length; i++) {
    const a = stops[i - 1];
    const b = stops[i];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.hypot(dx, dy);
    const dur = travelFrames(dist);
    const start = b.f - dur;
    if (frame < start) break;
    const p = spring({
      frame: frame - start,
      fps,
      config: { damping: 15, stiffness: 120, mass: 0.8 },
      durationInFrames: dur,
    });
    const side = i % 2 === 0 ? 1 : -1;
    const cx = (a.x + b.x) / 2 + (-dy / (dist || 1)) * dist * 0.15 * side;
    const cy = (a.y + b.y) / 2 + (dx / (dist || 1)) * dist * 0.15 * side;
    const q = 1 - p;
    pos = {
      x: q * q * a.x + 2 * q * p * cx + p * p * b.x,
      y: q * q * a.y + 2 * q * p * cy + p * p * b.y,
    };
  }
  return pos;
};

export const Cursor: React.FC<{ stops: CursorStop[]; clicks: number[]; appear?: number; hide?: number }> = ({
  stops,
  clicks,
  appear = stops[0].f,
  hide = Infinity,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { x, y } = cursorPosition(frame, stops, fps);
  const opacity =
    interpolate(frame, [appear, appear + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) *
    interpolate(frame, [hide, hide + 10], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const last = clicks.filter((c) => c <= frame).pop();
  const since = last === undefined ? 99 : frame - last;
  const pressScale = since <= 8 ? 1 - 0.18 * Math.sin((Math.PI * since) / 8) : 1;
  const ripple = since <= 24 ? since / 24 : 1;

  return (
    <div style={{ position: "absolute", left: x, top: y, opacity, pointerEvents: "none", zIndex: 50 }}>
      {since <= 24 && (
        <div
          style={{
            position: "absolute",
            left: -40 * ripple,
            top: -40 * ripple,
            width: 80 * ripple,
            height: 80 * ripple,
            borderRadius: "50%",
            border: "3px solid rgba(60,195,223,0.9)",
            opacity: 1 - ripple,
          }}
        />
      )}
      <svg
        width={40}
        height={48}
        viewBox="0 0 20 24"
        style={{ transform: `scale(${pressScale})`, transformOrigin: "2px 2px", filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.35))" }}
      >
        <path d="M2 1.5 L2 19 L6.6 14.8 L9.6 21.6 L12.6 20.3 L9.7 13.6 L16 13.4 Z" fill="#0f0e0d" stroke="#ffffff" strokeWidth={1.5} strokeLinejoin="round" />
      </svg>
    </div>
  );
};
