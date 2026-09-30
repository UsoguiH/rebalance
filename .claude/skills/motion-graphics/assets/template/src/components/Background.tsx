import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { alpha, onColor, useTheme } from "../theme";

type Variant = "brand" | "dark" | "gradient" | "grid" | "accent" | "none";

/** Scene backdrop: flat brand color with soft light, animated gradient blobs, dot grid, or dark. */
export const Background: React.FC<{ variant?: Variant; grain?: boolean }> = ({ variant = "brand", grain = true }) => {
  const t = useTheme();
  const frame = useCurrentFrame();
  if (variant === "none") return null;
  const c = t.colors;
  const base = variant === "dark" ? c.dark! : variant === "accent" ? c.accent : c.bg;
  const drift = (i: number) => Math.sin(frame / 90 + i * 2.1) * 6;
  const darkBase = onColor(base) === "#ffffff"; // light text needed = dark background
  return (
    <AbsoluteFill style={{ background: base, overflow: "hidden" }}>
      {variant === "gradient" && (
        <>
          {(t.gradient?.slice(0, 3) ?? [c.accent, c.accent2 ?? c.accent, c.accent]).map((col, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                width: "70%",
                aspectRatio: "1",
                left: `${[-10, 45, 20][i] + drift(i)}%`,
                top: `${[-20, 30, 60][i] + drift(i + 3)}%`,
                borderRadius: "50%",
                background: alpha(col, [0.35, 0.25, 0.2][i]),
                filter: `blur(${160 * t.u}px)`,
              }}
            />
          ))}
        </>
      )}
      {variant === "grid" && (
        <AbsoluteFill
          style={{
            backgroundImage: `radial-gradient(${alpha(onColor(base), 0.12)} ${1.4 * t.u}px, transparent ${1.6 * t.u}px)`,
            backgroundSize: `${36 * t.u}px ${36 * t.u}px`,
            backgroundPosition: `0 ${-frame * 0.3}px`,
            maskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)",
          }}
        />
      )}
      {(variant === "brand" || variant === "dark") && (
        <AbsoluteFill
          style={{
            background: `radial-gradient(ellipse at 50% 35%, ${alpha(darkBase ? c.accent : "#ffffff", darkBase ? 0.16 : 0.55)}, transparent 65%)`,
          }}
        />
      )}
      {grain && (
        <AbsoluteFill style={{ opacity: darkBase ? 0.09 : 0.05, mixBlendMode: "overlay" }}>
          <svg width="100%" height="100%">
            <filter id="grain">
              <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={frame % 7} />
            </filter>
            <rect width="100%" height="100%" filter="url(#grain)" />
          </svg>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
