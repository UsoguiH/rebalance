import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { pop } from "../motion";
import { useTheme } from "../theme";

export type AbsCue = { text: string; start: number; end: number }; // absolute seconds in the video

/** Subtitles for the voice-over: one short phrase at a time, in a soft pill near the bottom. */
export const Captions: React.FC<{ cues: AbsCue[] }> = ({ cues }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = useTheme();
  const now = frame / fps;
  const cue = cues.find((c) => now >= c.start && now < c.end + 0.05);
  if (!cue) return null;
  const s = pop(frame, fps, Math.round(cue.start * fps), { damping: 18, stiffness: 220 });
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: t.H * (t.portrait ? 0.2 : 0.07), pointerEvents: "none" }}>
      <div style={{
        direction: t.dir, maxWidth: t.W * 0.8, textAlign: "center", fontFamily: t.fonts.body, fontWeight: 600,
        fontSize: (t.portrait ? 46 : 38) * t.u, lineHeight: 1.25, color: "#111", background: "rgba(255,255,255,0.94)",
        boxShadow: `0 ${8 * t.u}px ${24 * t.u}px rgba(0,0,0,0.12), 0 0 0 ${1 * t.u}px rgba(0,0,0,0.06)`,
        padding: `${10 * t.u}px ${22 * t.u}px`, borderRadius: 14 * t.u, transform: `translateY(${(1 - s) * 12}px)`, opacity: Math.min(1, s * 1.5),
        backdropFilter: "blur(8px)",
      }}>
        {cue.text}
      </div>
    </AbsoluteFill>
  );
};
