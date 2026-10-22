import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Bars } from "../components/Bars";
import { Camera } from "../components/Camera";
import { KineticText } from "../components/KineticText";
import { Rig, SceneShell } from "../components/SceneShell";
import { C, COPY, FONT, T } from "../config";
import { enter, rise } from "../lib/motion";

const N = 56;

// Scene 1 · Flatline (hook): identical bars on a metronome. Deliberately robotic.
export const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const t = T.hook;
  const len = T.scenes.hook[1] - T.scenes.hook[0];

  // Every bar shares one height: a stiff two-step pulse on the beat.
  const phase = (frame % (t.beat * 2)) / t.beat;
  const step = phase < 1 ? Math.min(1, phase * 4) : Math.max(0, 1 - (phase - 1) * 4);
  const shared = 0.3 + 0.22 * step;
  const heights = Array.from({ length: N }, (_, i) => shared * Math.min(1, Math.max(0, enter(frame, t.barsIn + i))));

  const chip = enter(frame, 0);
  const readout = enter(frame, 14);

  return (
    <SceneShell>
      <Camera keys={[{ f: 0, s: 1 }, { f: len, s: 1.06 }]}>
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 56, flexDirection: "column" }}>
          <div
            style={{
              ...rise(chip, 20),
              fontFamily: FONT.mono,
              fontSize: 22,
              letterSpacing: "0.18em",
              color: C.muted,
              padding: "10px 20px",
              border: `1.5px solid ${C.line}`,
              borderRadius: 999,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <span style={{ width: 10, height: 10, borderRadius: 5, background: C.dim }} />
            {COPY.hook.chip}
          </div>
          <Rig w={1240} h={220}>
            <Bars heights={heights} colors={C.dim} width={1240} height={220} gap={0.5} />
          </Rig>
          <KineticText lines={COPY.hook.lines} start={t.words} size={92} accent={{ "this.": C.muted }} />
        </AbsoluteFill>
      </Camera>
      <div
        style={{
          ...rise(readout, 12),
          position: "absolute",
          top: "6%",
          right: "5%",
          fontFamily: FONT.mono,
          fontSize: 20,
          lineHeight: 1.7,
          color: C.dim,
          textAlign: "right",
        }}
      >
        {COPY.hook.readout.map((l) => (
          <div key={l} style={{ whiteSpace: "pre" }}>
            {l}
          </div>
        ))}
      </div>
    </SceneShell>
  );
};
