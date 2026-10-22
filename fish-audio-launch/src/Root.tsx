import React from "react";
import { Composition } from "remotion";
import { T } from "./config";
import { FishAudioLaunch } from "./Video";

// Every scene is laid out from the canvas centre, so the same timeline renders as cutdowns.
const FORMATS = [
  { id: "FishAudioLaunch", width: 1920, height: 1080 },
  { id: "FishAudioLaunchSquare", width: 1080, height: 1080 },
  { id: "FishAudioLaunchVertical", width: 1080, height: 1920 },
];

export const Root: React.FC = () => (
  <>
    {FORMATS.map((f) => (
      <Composition
        key={f.id}
        id={f.id}
        component={FishAudioLaunch}
        durationInFrames={T.total}
        fps={T.fps}
        width={f.width}
        height={f.height}
      />
    ))}
  </>
);
