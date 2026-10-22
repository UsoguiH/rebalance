import React, { useEffect, useState } from "react";
import { AbsoluteFill, Audio, Sequence, cancelRender, continueRender, delayRender, staticFile } from "remotion";
import "@fontsource/onest/400.css";
import "@fontsource/onest/500.css";
import "@fontsource/onest/600.css";
import "@fontsource/geist-mono/400.css";
import "@fontsource/geist-mono/500.css";
import { Background } from "./components/Background";
import { T } from "./config";
import { Fix } from "./scenes/Fix";
import { Hook } from "./scenes/Hook";
import { Logo } from "./scenes/Logo";
import { Payoff } from "./scenes/Payoff";
import { Problem } from "./scenes/Problem";

const SCENES: [keyof typeof T.scenes, React.FC][] = [
  ["hook", Hook],
  ["problem", Problem],
  ["fix", Fix],
  ["payoff", Payoff],
  ["logo", Logo],
];

// Fonts must be loaded before frame 0 renders. A fallback font is a bug.
const useFonts = () => {
  const [handle] = useState(() => delayRender("Loading fonts"));
  useEffect(() => {
    Promise.all(
      ["400 40px Onest", "500 40px Onest", "600 40px Onest", "400 20px 'Geist Mono'", "500 20px 'Geist Mono'"].map((f) =>
        document.fonts.load(f),
      ),
    )
      .then(() => document.fonts.ready)
      .then(() => continueRender(handle))
      .catch((err) => cancelRender(err));
  }, [handle]);
};

export const FishAudioLaunch: React.FC = () => {
  useFonts();
  return (
    <AbsoluteFill>
      <Background />
      {SCENES.map(([key, Scene]) => {
        const [from, to] = T.scenes[key];
        return (
          <Sequence key={key} name={key} from={from} durationInFrames={to - from}>
            <Scene />
          </Sequence>
        );
      })}
      <Audio src={staticFile("soundtrack.wav")} />
    </AbsoluteFill>
  );
};
