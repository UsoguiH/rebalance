import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Camera } from "../components/Camera";
import { FishLogo } from "../components/FishLogo";
import { Rig, SceneShell } from "../components/SceneShell";
import { C, COPY, EASE, FONT, T } from "../config";
import { drift, enter, lerp, rise } from "../lib/motion";

// Scene 5 · Logo + CTA.
export const Logo: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const tall = height > width;
  const t = T.logo;
  const wipe = lerp(frame, [t.wordmark, t.wordmark + 30], [0, 1], EASE.out);
  const d = drift(frame, 1, 3);

  return (
    <SceneShell exit={false}>
      <Camera keys={[{ f: 0, s: 1 }, { f: 300, s: 1.05 }]}>
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 44 }}>
          <div
            style={{
              ...rise(enter(frame, t.badge), 18),
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 24px",
              borderRadius: 999,
              border: `1.5px solid ${C.teal}`,
              background: "rgba(0,137,168,0.12)",
              color: C.cream,
              fontFamily: FONT.sans,
              fontSize: 26,
              fontWeight: 500,
            }}
          >
            <span style={{ width: 10, height: 10, borderRadius: 5, background: C.tealGlow, boxShadow: `0 0 14px ${C.tealGlow}` }} />
            {COPY.logo.badge}
          </div>
          <Rig w={tall ? 800 : 1200} h={tall ? 420 : 180}>
            <div
              style={{
                display: "flex",
                flexDirection: tall ? "column" : "row",
                alignItems: "center",
                justifyContent: "center",
                gap: tall ? 40 : 56,
                width: "100%",
                height: "100%",
                transform: `translate(${d.x}px, ${d.y}px)`,
              }}
            >
              <FishLogo size={tall ? 440 : 380} start={t.bars} />
              <div
                style={{
                  fontFamily: FONT.sans,
                  fontSize: 140,
                  fontWeight: 600,
                  letterSpacing: "-0.045em",
                  color: C.cream,
                  whiteSpace: "nowrap",
                  clipPath: `inset(-10% ${(1 - wipe) * 100}% -10% 0)`,
                  transform: `translateX(${(1 - wipe) * -40}px)`,
                }}
              >
                {COPY.logo.wordmark}
              </div>
            </div>
          </Rig>
          <div style={{ ...rise(enter(frame, t.tagline), 24), fontFamily: FONT.sans, fontSize: 44, color: C.muted, letterSpacing: "-0.02em" }}>
            {COPY.logo.tagline}
          </div>
          <div
            style={{
              ...rise(enter(frame, t.cta), 24),
              display: "flex",
              alignItems: "center",
              gap: 18,
              padding: "20px 36px",
              borderRadius: 999,
              background: C.cream,
              color: C.ink,
              fontFamily: FONT.sans,
              fontSize: 32,
              fontWeight: 600,
            }}
          >
            {COPY.logo.cta}
            <span style={{ width: 2, height: 30, background: "rgba(15,14,13,0.2)" }} />
            <span style={{ fontWeight: 500 }}>{COPY.logo.url}</span>
            <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={C.ink} strokeWidth={2.6} strokeLinecap="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </div>
        </AbsoluteFill>
      </Camera>
    </SceneShell>
  );
};
