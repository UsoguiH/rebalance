import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Bars } from "../components/Bars";
import { Camera } from "../components/Camera";
import { Counter } from "../components/Counter";
import { KineticText } from "../components/KineticText";
import { C, COPY, FONT, T } from "../config";
import { SceneShell } from "../components/SceneShell";
import { breathe, enter, smoothNoise } from "../lib/motion";

const ACCENTS = [C.tealGlow, C.whisper, C.sob, C.laugh];

// Scene 4 · Doesn't sound like AI (payoff).
export const Payoff: React.FC = () => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();
  const t = T.payoff;
  const cols = width >= 1600 ? 4 : 2;
  const cardW = cols === 4 ? 400 : (Math.min(width * 0.92, 900) - 24) / 2;

  return (
    <SceneShell>
      <Camera keys={[{ f: 0, s: 1.08 }, { f: 220, s: 1 }]}>
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 64 }}>
          <KineticText lines={COPY.payoff.headline} start={t.words} size={cols === 4 ? 86 : 72} maxWidth={width * 0.9} accent={{ "doesn't": C.tealGlow }} />
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, ${cardW}px)`, gap: 24 }}>
            {COPY.payoff.stats.map((stat, i) => {
              const p = enter(frame, t.cards + i * 4);
              const accent = ACCENTS[i];
              return (
                <div
                  key={stat.label}
                  style={{
                    opacity: Math.min(1, Math.max(0, p * 1.4)),
                    transform: `translateY(${(1 - p) * 60}px) scale(${(0.9 + 0.1 * p) * breathe(frame, i, 0.012)})`,
                    background: C.bgRaised,
                    border: `1.5px solid ${C.line}`,
                    borderRadius: 28,
                    padding: "30px 32px 34px",
                    boxSizing: "border-box",
                    height: 270,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    fontFamily: FONT.sans,
                  }}
                >
                  <Bars
                    heights={Array.from({ length: 16 }, (_, k) => 0.25 + 0.75 * smoothNoise(k * 0.6 + frame / 14, i + 3))}
                    colors={accent}
                    width={150}
                    height={40}
                    gap={0.45}
                    minHeight={4}
                  />
                  <div>
                    <div style={{ fontSize: cols === 4 ? 64 : 60, fontWeight: 600, color: C.cream, letterSpacing: "-0.04em", lineHeight: 1 }}>
                      <Counter to={stat.value} start={t.counters + i * 4} suffix={stat.suffix} />
                    </div>
                    <div style={{ marginTop: 14, fontSize: 25, color: C.muted, fontWeight: 400 }}>{stat.label}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </AbsoluteFill>
      </Camera>
    </SceneShell>
  );
};
