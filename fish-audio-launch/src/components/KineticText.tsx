import React from "react";
import { useCurrentFrame } from "remotion";
import { C, FONT } from "../config";
import { enter } from "../lib/motion";

// Headline that builds word by word, each word 4 frames after the previous one.
export const KineticText: React.FC<{
  lines: string[][];
  start: number;
  size?: number;
  color?: string;
  weight?: number;
  stagger?: number;
  accent?: Record<string, string>;
  maxWidth?: number;
}> = ({ lines, start, size = 84, color = C.cream, weight = 600, stagger = 4, accent = {}, maxWidth }) => {
  const frame = useCurrentFrame();
  let i = 0;
  return (
    <div
      style={{
        fontFamily: FONT.sans,
        fontSize: size,
        fontWeight: weight,
        lineHeight: 1.08,
        letterSpacing: "-0.03em",
        color,
        textAlign: "center",
        maxWidth,
      }}
    >
      {lines.map((line, li) => (
        <div key={li} style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", columnGap: size * 0.26 }}>
          {line.map((word) => {
            const p = enter(frame, start + i++ * stagger);
            return (
              <span key={word + li} style={{ display: "inline-block", overflow: "hidden", paddingBottom: size * 0.12 }}>
                <span
                  style={{
                    display: "inline-block",
                    opacity: Math.min(1, Math.max(0, p * 1.4)),
                    transform: `translateY(${(1 - p) * size * 0.9}px)`,
                    color: accent[word] ?? color,
                  }}
                >
                  {word}
                </span>
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};
