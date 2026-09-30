import React from "react";
import { Composition } from "remotion";
import { Launch, timeline } from "./Launch";
import type { VideoSpec } from "./types";
import specJson from "./video.json";

const spec = specJson as unknown as VideoSpec;

// "Launch" uses the size in video.json; the others re-flow the same storyboard for each platform.
const FORMATS: { id: string; w?: number; h?: number }[] = [
  { id: "Launch" },
  { id: "Launch-16x9", w: 1920, h: 1080 },
  { id: "Launch-9x16", w: 1080, h: 1920 },
  { id: "Launch-1x1", w: 1080, h: 1080 },
  { id: "Launch-4x5", w: 1080, h: 1350 },
];

export const Root: React.FC = () => {
  const fps = spec.meta.fps ?? 30;
  return (
    <>
      {FORMATS.map((f) => (
        <React.Fragment key={f.id}>
        <Composition
          id={f.id}
          component={Launch}
          fps={fps}
          width={f.w ?? spec.meta.width}
          height={f.h ?? spec.meta.height}
          durationInFrames={timeline(spec, fps).total}
          defaultProps={{ spec }}
          calculateMetadata={({ props }) => ({ durationInFrames: timeline(props.spec as VideoSpec, fps).total })}
        />
        </React.Fragment>
      ))}
    </>
  );
};
