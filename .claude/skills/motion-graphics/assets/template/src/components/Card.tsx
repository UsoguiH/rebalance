import React from "react";
import { Media } from "./Media";
import { useTheme } from "../theme";

/** A screenshot floating as a rounded card with layered shadow (the "UI card" look). */
export const Card: React.FC<{
  src: string;
  width: number; // px at 1080 short side
  aspect?: number; // width / height, default 16/10
  radius?: number;
  glow?: boolean;
  style?: React.CSSProperties;
  objectPosition?: string;
}> = ({ src, width, aspect = 1.6, radius = 22, glow = false, style, objectPosition = "50% 0%" }) => {
  const t = useTheme();
  const u = t.u;
  return (
    <div style={{
      width: width * u, height: (width / aspect) * u, borderRadius: radius * u, overflow: "hidden", background: "#fff",
      boxShadow: [
        `0 ${2 * u}px ${4 * u}px rgba(0,0,0,0.06)`,
        `0 ${24 * u}px ${60 * u}px rgba(0,0,0,0.18)`,
        `0 0 0 ${1 * u}px rgba(0,0,0,0.06)`,
        glow ? `0 0 ${80 * u}px ${t.colors.accent}66` : "",
      ].filter(Boolean).join(", "),
      ...style,
    }}>
      <Media src={src} style={{ objectPosition }} />
    </div>
  );
};
