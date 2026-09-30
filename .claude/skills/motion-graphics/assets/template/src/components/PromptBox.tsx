import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { pop } from "../motion";
import { useTheme } from "../theme";

/** A chat/search input that types itself out (the "Describe what you want…" moment). */
export const PromptBox: React.FC<{
  text: string;
  placeholder?: string;
  start?: number; // seconds when typing starts
  cps?: number; // characters per second
  width?: number;
  button?: string; // label of the send button
  pressAt?: number; // seconds when the button gets pressed
}> = ({ text, placeholder = "", start = 0.4, cps = 28, width = 900, button = "Send", pressAt }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = useTheme();
  const u = t.u;
  const s = pop(frame, fps, 0, { damping: 15 });
  const n = Math.max(0, Math.floor((frame / fps - start) * cps));
  const shown = text.slice(0, n);
  const caret = Math.floor(frame / (fps * 0.5)) % 2 === 0 || (n > 0 && n < text.length);
  const pressed = pressAt !== undefined && frame / fps >= pressAt;
  const ready = n >= text.length;
  return (
    <div style={{
      width: width * u, borderRadius: 26 * u, background: "#fff", padding: `${28 * u}px ${30 * u}px ${22 * u}px`,
      boxShadow: `0 ${30 * u}px ${80 * u}px rgba(0,0,0,0.14), 0 0 0 ${1 * u}px rgba(0,0,0,0.06)`,
      transform: `scale(${0.9 + 0.1 * s})`, opacity: Math.min(1, s * 1.4), direction: t.dir,
    }}>
      <div style={{ fontFamily: t.fonts.body, fontSize: 34 * u, lineHeight: 1.35, minHeight: 92 * u, color: shown ? "#1a1a1a" : "#9a9a9a" }}>
        {shown || placeholder}
        {caret && <span style={{ display: "inline-block", width: 3 * u, height: 36 * u, background: t.colors.accent, marginInlineStart: 3 * u, verticalAlign: "middle" }} />}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 * u }}>
        <div style={{
          fontFamily: t.fonts.body, fontWeight: 600, fontSize: 26 * u, color: "#fff", padding: `${12 * u}px ${26 * u}px`,
          borderRadius: 14 * u, background: t.colors.accent, opacity: ready ? 1 : 0.45,
          transform: `scale(${pressed && frame / fps - pressAt! < 0.15 ? 0.94 : 1})`,
        }}>{button}</div>
      </div>
    </div>
  );
};
