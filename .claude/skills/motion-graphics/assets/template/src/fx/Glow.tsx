import React from "react";
import { useCurrentFrame } from "remotion";
import { useTheme } from "../theme";

/**
 * The "AI glow": a slowly rotating multi-colour light running around a rounded box, with a soft
 * halo outside (Apple-Intelligence / Siri-edge look). Wrap any card, prompt box or device screen.
 */
export const GlowBorder: React.FC<{
  radius: number; // px (already scaled)
  width?: number; // ring thickness in px
  colors?: string[];
  intensity?: number; // 0-1, fade it in/out from the parent
  speed?: number; // turns per second
  halo?: number; // halo blur in px
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ radius, width, colors, intensity = 1, speed = 0.35, halo, children, style }) => {
  const t = useTheme();
  const frame = useCurrentFrame();
  const ang = (frame / 30) * 360 * speed;
  const cols = colors ?? (t.gradient ? [...t.gradient, t.gradient[0]] : [t.colors.accent, t.colors.accent2 ?? "#F2B45A", "#FF7AB6", "#7AA7FF", t.colors.accent]);
  const grad = `conic-gradient(from ${ang}deg, ${cols.join(", ")})`;
  const w = width ?? 3 * t.u;
  return (
    <div style={{ position: "relative", borderRadius: radius, ...style }}>
      <div style={{ position: "absolute", inset: -w * 4, borderRadius: radius + w * 4, background: grad, filter: `blur(${halo ?? 36 * t.u}px)`, opacity: 0.55 * intensity }} />
      <div style={{ position: "absolute", inset: -w, borderRadius: radius + w, background: grad, opacity: intensity }} />
      <div style={{ position: "relative", borderRadius: radius, overflow: "hidden" }}>{children}</div>
    </div>
  );
};

/** A glossy light reflection sweeping across glass (device screens, cards, logos). */
export const Sheen: React.FC<{ progress: number; strength?: number; angle?: number }> = ({ progress, strength = 0.55, angle = 115 }) => {
  const p = progress * 160 - 30;
  return (
    <div style={{
      position: "absolute", inset: 0, pointerEvents: "none", mixBlendMode: "screen",
      background: `linear-gradient(${angle}deg, transparent ${p - 18}%, rgba(255,255,255,${strength}) ${p}%, transparent ${p + 14}%)`,
    }} />
  );
};

/** Soft coloured light blooming across a light frame (the light-theme answer to lens flares). */
export const LightLeak: React.FC<{ progress: number; color?: string; from?: "left" | "right" }> = ({ progress, color, from = "left" }) => {
  const t = useTheme();
  const c = color ?? t.colors.accent;
  const x = from === "left" ? -30 + progress * 160 : 130 - progress * 160;
  const o = Math.sin(Math.min(1, Math.max(0, progress)) * Math.PI);
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden", opacity: o * 0.8, mixBlendMode: "multiply" }}>
      <div style={{ position: "absolute", top: "-30%", left: `${x}%`, width: "60%", height: "160%", transform: "rotate(18deg)",
        background: `radial-gradient(ellipse at center, ${c}55, ${c}22 40%, transparent 70%)`, filter: `blur(${60 * t.u}px)` }} />
    </div>
  );
};
