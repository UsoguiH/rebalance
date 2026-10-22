import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Bars } from "../components/Bars";
import { Camera } from "../components/Camera";
import { Counter } from "../components/Counter";
import { Cursor } from "../components/Cursor";
import { KineticText } from "../components/KineticText";
import { Rig, SceneShell, rigScale } from "../components/SceneShell";
import { C, COPY, FONT, T } from "../config";
import { enter, press, rise } from "../lib/motion";

const RIG = { w: 1560, h: 560 };
const CARD = { x: 0, y: 70, w: 820, h: 420 };
const BTN = { x: 48, y: 306, w: 270, h: 74 };
const STACK = { x: 920, y: 70, w: 640 };

const flat = (n: number, h: number) => Array.from({ length: n }, () => h);

// Scene 2 · Regenerate loop (problem): same line, same flat read, again and again.
export const Problem: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const t = T.problem;
  // Pan as far as the safe zone allows (none on narrow cutdowns).
  const pan = Math.max(0, (width - RIG.w * rigScale(width, height, RIG.w, RIG.h)) / 2 - width * 0.05);
  const [c1, c2, c3] = t.clicks;
  const btnX = CARD.x + BTN.x + BTN.w / 2;
  const btnY = CARD.y + BTN.y + BTN.h / 2;

  const card = enter(frame, 0);
  const clicksSoFar = t.clicks.filter((c) => frame >= c).length;
  const btnScale = t.clicks.reduce((s, c) => s * press(frame, c), 1);

  return (
    <SceneShell>
      <Camera keys={[{ f: 0, x: pan }, { f: 300, x: -pan }]}>
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 36 }}>
          <Rig w={RIG.w} h={RIG.h}>
            {/* Script card */}
            <div
              style={{
                ...rise(card, 50),
                position: "absolute",
                left: CARD.x,
                top: CARD.y,
                width: CARD.w,
                height: CARD.h,
                background: C.bgRaised,
                border: `1.5px solid ${C.line}`,
                borderRadius: 28,
                padding: "40px 48px",
                boxSizing: "border-box",
                fontFamily: FONT.sans,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: FONT.mono, fontSize: 20, color: C.dim, letterSpacing: "0.12em" }}>
                <span>SCRIPT</span>
                <span>VOICE · DEFAULT</span>
              </div>
              <div style={{ marginTop: 34, fontSize: 50, fontWeight: 500, color: C.cream, letterSpacing: "-0.02em", lineHeight: 1.15 }}>
                “{COPY.problem.line}”
              </div>
              <div
                style={{
                  position: "absolute",
                  left: BTN.x,
                  top: BTN.y,
                  width: BTN.w,
                  height: BTN.h,
                  borderRadius: 999,
                  background: C.cream,
                  color: C.ink,
                  fontSize: 28,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 12,
                  transform: `scale(${btnScale})`,
                }}
              >
                <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={C.ink} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a9 9 0 1 1-2.64-6.36" />
                  <path d="M21 3v6h-6" />
                </svg>
                {COPY.problem.button}
              </div>
              <div style={{ position: "absolute", left: BTN.x + BTN.w + 40, top: BTN.y + 17 }}>
                <Bars heights={flat(26, 0.45)} colors={C.dim} width={360} height={40} gap={0.5} />
              </div>
            </div>

            {/* Takes counter */}
            <div
              style={{
                ...rise(enter(frame, c1), 20),
                position: "absolute",
                left: STACK.x,
                top: -10,
                width: STACK.w,
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                fontFamily: FONT.mono,
                color: C.muted,
              }}
            >
              <span style={{ fontSize: 20, letterSpacing: "0.14em" }}>{COPY.problem.counterLabel.toUpperCase()}</span>
              <span style={{ fontSize: 56, color: C.cream, fontFamily: FONT.sans, fontWeight: 600 }}>
                {frame < t.counterStart ? (
                  clicksSoFar
                ) : (
                  <Counter from={COPY.problem.counterFrom} to={COPY.problem.counterTo} start={t.counterStart} />
                )}
              </span>
            </div>

            {/* Take stack: one card drops per click, with overshoot. */}
            {COPY.problem.takes.map((label, i) => {
              const p = enter(frame, t.clicks[i] + 4);
              return (
                <div
                  key={label}
                  style={{
                    position: "absolute",
                    left: STACK.x,
                    top: STACK.y + 20 + i * 136,
                    width: STACK.w,
                    height: 116,
                    opacity: Math.min(1, Math.max(0, p * 2)),
                    transform: `translateY(${(1 - p) * -70}px) rotate(${(1 - p) * (i % 2 ? 3 : -3)}deg)`,
                    background: C.bgRaised,
                    border: `1.5px solid ${C.line}`,
                    borderRadius: 22,
                    padding: "0 32px",
                    boxSizing: "border-box",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 24,
                    fontFamily: FONT.sans,
                  }}
                >
                  <div style={{ fontSize: 30, fontWeight: 500, color: C.cream, width: 240, whiteSpace: "nowrap" }}>{label}</div>
                  <Bars heights={flat(16, 0.45)} colors={C.dim} width={150} height={36} gap={0.5} />
                  <div style={{ fontFamily: FONT.mono, fontSize: 17, color: C.dim, letterSpacing: "0.08em", whiteSpace: "nowrap" }}>NO EMOTION</div>
                </div>
              );
            })}

            <Cursor
              appear={22}
              hide={300}
              clicks={t.clicks}
              stops={[
                { f: 22, x: 660, y: 600 },
                { f: c1 - 6, x: btnX, y: btnY },
                { f: c2 - 6, x: btnX + 6, y: btnY + 4 },
                { f: c3 - 6, x: btnX - 4, y: btnY - 2 },
                { f: 250, x: STACK.x + 380, y: STACK.y + 330 },
              ]}
            />
          </Rig>
          <KineticText lines={COPY.problem.headline} start={t.headline} size={76} accent={{ "47": C.muted }} />
        </AbsoluteFill>
      </Camera>
    </SceneShell>
  );
};
