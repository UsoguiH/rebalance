import React from "react";
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useVideoConfig } from "remotion";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { Background } from "./components/Background";
import { Captions, type AbsCue } from "./components/Captions";
import { ease } from "./motion";
import { resolveScene } from "./scenes";
import { ThemeProvider, useTheme } from "./theme";
import { presentation } from "./transitions";
import type { Scene, VideoSpec } from "./types";

/** Frame math shared by the renderer and calculateMetadata. */
export const timeline = (spec: VideoSpec, fps: number) => {
  const durs = spec.scenes.map((s) => Math.max(1, Math.round(s.duration * fps)));
  const trans = spec.scenes.map((s, i) => {
    if (i === spec.scenes.length - 1 || s.transition?.type === "none") return 0;
    const want = Math.round((s.transition?.duration ?? 0.5) * fps);
    return Math.max(0, Math.min(want, Math.floor(durs[i] / 2), Math.floor(durs[i + 1] / 2)));
  });
  const starts: number[] = [];
  let t = 0;
  durs.forEach((d, i) => { starts.push(t); t += d - trans[i]; });
  const total = starts[starts.length - 1] + durs[durs.length - 1];
  return { durs, trans, starts, total };
};

const SceneView: React.FC<{ scene: Scene; durationInFrames: number }> = ({ scene, durationInFrames }) => {
  const t = useTheme();
  const Comp = resolveScene(scene.type, scene.component);
  return (
    <AbsoluteFill style={{ direction: t.dir }}>
      <Background variant={scene.background ?? "brand"} />
      {Comp ? <Comp scene={scene} props={scene.props ?? {}} durationInFrames={durationInFrames} /> : (
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", color: "red", fontSize: 40 }}>Unknown scene type: {scene.type} {scene.component}</AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

export const Launch: React.FC<{ spec: VideoSpec }> = ({ spec }) => {
  const { fps } = useVideoConfig();
  const { durs, trans, starts, total } = timeline(spec, fps);
  const voiced = spec.scenes.map((s, i) => ({ s, i })).filter(({ s }) => s.voice);
  const voiceIv = voiced.map(({ s, i }) => {
    const a = starts[i] + Math.round((s.voiceDelay ?? 0.3) * fps);
    return [a, a + Math.round((s.voiceDuration ?? s.duration) * fps)];
  });
  const base = spec.audio?.musicVolume ?? 0.55;
  const duck = spec.audio?.duckTo ?? 0.22;
  const fadeOut = Math.round((spec.audio?.fadeOut ?? 1.5) * fps);
  const musicVolume = (f: number) => {
    let d = 1;
    for (const [a, b] of voiceIv) {
      if (f >= a - 8 && f <= b + 14) d = Math.min(d, interpolate(f, [a - 8, a, b, b + 14], [1, duck / base, duck / base, 1]));
    }
    const fin = interpolate(f, [0, 10], [0, 1], { extrapolateRight: "clamp" });
    const fout = interpolate(f, [total - fadeOut, total], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    return base * d * fin * fout;
  };
  const cues: AbsCue[] = spec.captions
    ? voiced.flatMap(({ s, i }) => (s.captions ?? []).map((c) => {
        const off = starts[i] / fps + (s.voiceDelay ?? 0.3);
        return { text: c.text, start: off + c.start, end: off + c.end };
      }))
    : [];

  return (
    <ThemeProvider brand={spec.brand}>
      <AbsoluteFill style={{ background: spec.brand.colors.bg }}>
        <TransitionSeries>
          {spec.scenes.flatMap((scene, i) => {
            const nodes = [
              <TransitionSeries.Sequence key={`s${i}`} durationInFrames={durs[i]}>
                <SceneView scene={scene} durationInFrames={durs[i]} />
              </TransitionSeries.Sequence>,
            ];
            if (trans[i] > 0) {
              nodes.push(
                <TransitionSeries.Transition key={`t${i}`} presentation={presentation(scene.transition)}
                  timing={linearTiming({ durationInFrames: trans[i], easing: ease.inOut })} />,
              );
            }
            return nodes;
          })}
        </TransitionSeries>

        {spec.audio?.music && (
          <Audio src={staticFile(spec.audio.music)} volume={musicVolume}
            trimBefore={Math.round((spec.audio.musicTrimBefore ?? 0) * fps)} />
        )}
        {voiced.map(({ s, i }) => (
          <Sequence key={`vo${i}`} from={starts[i] + Math.round((s.voiceDelay ?? 0.3) * fps)} layout="none">
            <Audio src={staticFile(s.voice!)} volume={1} />
          </Sequence>
        ))}
        {spec.scenes.flatMap((s, i) => (s.sfx ?? []).map((x, k) => (
          <Sequence key={`fx${i}-${k}`} from={Math.max(0, starts[i] + Math.round(x.at * fps))} layout="none">
            <Audio src={staticFile(`sfx/${x.name}.wav`)} volume={x.volume ?? 0.5} />
          </Sequence>
        )))}
        {spec.autoWhoosh && trans.map((tr, i) => tr > 0 && (
          <Sequence key={`wh${i}`} from={Math.max(0, starts[i] + durs[i] - tr - Math.round(0.12 * fps))} layout="none">
            <Audio src={staticFile("sfx/whoosh.wav")} volume={0.35} />
          </Sequence>
        ))}
        {spec.scenes.flatMap((s, i) => s.type === "cursor" ? ((s.props?.cursor ?? []) as any[]).filter((c) => c.click).map((c, k) => (
          <Sequence key={`ck${i}-${k}`} from={starts[i] + Math.round(c.t * fps)} layout="none">
            <Audio src={staticFile("sfx/click.wav")} volume={0.5} />
          </Sequence>
        )) : [])}
        {cues.length > 0 && <Captions cues={cues} />}
      </AbsoluteFill>
    </ThemeProvider>
  );
};
