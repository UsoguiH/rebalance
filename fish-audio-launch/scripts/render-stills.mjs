// Renders a still at each scene's key frames and at every scene boundary,
// so overlaps and layout bugs show up before the full render.
// Usage: node scripts/render-stills.mjs [compositionId] [frame ...]
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { mkdirSync } from "node:fs";
import path from "node:path";

const [id = "FishAudioLaunch", ...frameArgs] = process.argv.slice(2);
const frames = frameArgs.length
  ? frameArgs.map(Number)
  : [60, 120, 236, 300, 440, 560, 640, 700, 760, 830, 890, 960, 1060, 1136, 1200, 1300, 1496, 1560, 1640, 1799];

const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const browserExecutable = process.env.REMOTION_BROWSER ?? null;
const composition = await selectComposition({ serveUrl, id, browserExecutable });
mkdirSync("out/stills", { recursive: true });
for (const frame of frames) {
  const output = `out/stills/${id}-${String(frame).padStart(4, "0")}.png`;
  await renderStill({ serveUrl, composition, frame, output, browserExecutable });
  console.log(output);
}
