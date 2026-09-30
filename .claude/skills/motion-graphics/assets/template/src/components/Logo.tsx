import React from "react";
import { Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ease, pop, prog } from "../motion";
import { useTheme } from "../theme";

/** Brand logo that reveals with a spring, de-blur and a light sweep. */
export const Logo: React.FC<{
  src?: string;
  height?: number; // px at 1080 short side
  delay?: number; // frames
  sweep?: boolean;
  onDark?: boolean;
}> = ({ src, height = 120, delay = 0, sweep = true, onDark = false }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = useTheme();
  const file = src ?? (onDark ? t.logoDark ?? t.logo : t.logo);
  const s = pop(frame, fps, delay, { damping: 13, stiffness: 120 });
  const p = prog(frame, delay, 18);
  const sw = prog(frame, delay + 10, 26, ease.inOut);
  const h = height * t.u;
  if (!file) {
    // No logo file: set the brand name as a wordmark.
    return (
      <div style={{ fontFamily: t.fonts.display, fontWeight: 800, fontSize: h * 0.8, color: onDark ? "#fff" : t.colors.fg,
        transform: `scale(${0.7 + 0.3 * s})`, opacity: p, filter: `blur(${(1 - p) * 12}px)`, letterSpacing: "-0.03em" }}>
        {t.name}
      </div>
    );
  }
  return (
    <div style={{ position: "relative", transform: `scale(${0.7 + 0.3 * s})`, opacity: p, filter: `blur(${(1 - p) * 12 * t.u}px)` }}>
      <Img src={/^https?:/.test(file) ? file : staticFile(file)}
        style={{ height: h, width: "auto", display: "block", filter: t.logoInvert && !src ? "brightness(0)" : undefined }} />
      {sweep && (
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none", mixBlendMode: "overlay",
          background: `linear-gradient(105deg, transparent ${sw * 140 - 40}%, rgba(255,255,255,0.9) ${sw * 140 - 20}%, transparent ${sw * 140}%)`,
          WebkitMaskImage: `url(${/^https?:/.test(file) ? file : staticFile(file)})`, WebkitMaskSize: "contain", WebkitMaskRepeat: "no-repeat",
        }} />
      )}
    </div>
  );
};
