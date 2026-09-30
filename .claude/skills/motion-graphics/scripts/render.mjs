#!/usr/bin/env node
// Render the Remotion project.
//   --stills            two frames per scene + the middle of every transition -> renders/stills/*.png + renders/stills/sheet.jpg
//   --frames 12,90,300  specific frames
//   --video             full video -> renders/<comp>.mp4 (then prints loudness)
// Options: --project DIR (default .), --comp Launch|Launch-9x16|Launch-1x1|Launch-4x5|Launch-16x9, --scale 0.5 (draft), --crf 18
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { args } from "./_browser.mjs";

const a = args();
const project = path.resolve(a.project || ".");
const require = createRequire(path.join(project, "package.json"));
const { bundle } = require("@remotion/bundler");
const { renderMedia, renderStill, selectComposition } = require("@remotion/renderer");
const comp = a.comp || "Launch";
const scale = Number(a.scale || 1);
const outDir = path.join(project, "renders");
fs.mkdirSync(outDir, { recursive: true });

// Prefer an existing headless shell (fast, no download); otherwise Remotion fetches its own.
function headlessShell() {
  if (process.env.REMOTION_BROWSER && fs.existsSync(process.env.REMOTION_BROWSER)) return process.env.REMOTION_BROWSER;
  for (const root of [process.env.PLAYWRIGHT_BROWSERS_PATH, path.join(os.homedir(), ".cache", "ms-playwright")]) {
    if (!root || !fs.existsSync(root)) continue;
    for (const d of fs.readdirSync(root).filter((x) => x.startsWith("chromium_headless_shell")).sort().reverse()) {
      for (const s of ["chrome-linux/headless_shell", "chrome-headless-shell-linux64/chrome-headless-shell", "chrome-headless-shell-mac-arm64/chrome-headless-shell", "chrome-headless-shell-mac-x64/chrome-headless-shell"]) {
        const p = path.join(root, d, s);
        if (fs.existsSync(p)) return p;
      }
    }
  }
  return null;
}
const browserExecutable = headlessShell();
const spec = JSON.parse(fs.readFileSync(path.join(project, "src", "video.json"), "utf8"));

console.log("Bundling…");
const serveUrl = await bundle({ entryPoint: path.join(project, "src", "index.ts"), publicDir: path.join(project, "public") });
const composition = await selectComposition({ serveUrl, id: comp, inputProps: {}, browserExecutable });
const fps = composition.fps;

// Same frame math as src/Launch.tsx timeline()
const durs = spec.scenes.map((s) => Math.max(1, Math.round(s.duration * fps)));
const trans = spec.scenes.map((s, i) => {
  if (i === spec.scenes.length - 1 || s.transition?.type === "none") return 0;
  const want = Math.round((s.transition?.duration ?? 0.5) * fps);
  return Math.max(0, Math.min(want, Math.floor(durs[i] / 2), Math.floor(durs[i + 1] / 2)));
});
const starts = [];
let acc = 0;
durs.forEach((d, i) => { starts.push(acc); acc += d - trans[i]; });

if (a.stills || a.frames) {
  const dir = path.join(outDir, "stills");
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  let frames = [];
  if (a.frames && a.frames !== true) {
    frames = String(a.frames).split(",").map((f) => ({ f: Number(f), label: `frame ${f}` }));
  } else {
    spec.scenes.forEach((s, i) => {
      frames.push({ f: starts[i] + Math.round(durs[i] * 0.35), label: `${i + 1} ${s.id} (${s.type}) 35%` });
      frames.push({ f: starts[i] + Math.round(durs[i] * 0.8), label: `${i + 1} ${s.id} (${s.type}) 80%` });
      if (trans[i] > 0) frames.push({ f: starts[i] + durs[i] - Math.round(trans[i] / 2), label: `${i + 1}→${i + 2} ${s.transition?.type ?? "fade"}` });
    });
  }
  const files = [];
  for (const [k, fr] of frames.entries()) {
    const file = path.join(dir, `${String(k + 1).padStart(2, "0")}-f${fr.f}.png`);
    await renderStill({ composition, serveUrl, output: file, frame: Math.min(fr.f, composition.durationInFrames - 1), scale: Math.min(scale, 0.5), browserExecutable });
    files.push({ file, label: `${fr.label} · f${fr.f} · ${(fr.f / fps).toFixed(2)}s` });
    process.stdout.write(`\rstill ${k + 1}/${frames.length}`);
  }
  console.log();
  const sheet = path.join(dir, "sheet.jpg");
  execFileSync("python3", [path.join(path.dirname(new URL(import.meta.url).pathname), "sheet.py"), "--out", sheet,
    ...files.flatMap((x) => [x.file, x.label])], { stdio: "inherit" });
  console.log(`Look at ${sheet} (individual frames in ${dir})`);
}

if (a.video) {
  const out = path.join(outDir, `${comp}${scale !== 1 ? `-draft` : ""}.mp4`);
  const t0 = Date.now();
  let lastPct = -1;
  await renderMedia({
    composition, serveUrl, codec: "h264", outputLocation: out, scale, crf: Number(a.crf || 18), audioCodec: "aac",
    browserExecutable, imageFormat: "jpeg", jpegQuality: 92,
    onProgress: ({ progress }) => {
      const pct = Math.floor(progress * 20) * 5;
      if (pct !== lastPct) { lastPct = pct; console.log(`rendering ${pct}%`); }
    },
  });
  console.log(`\nRendered ${out} (${composition.durationInFrames} frames, ${(composition.durationInFrames / fps).toFixed(1)}s) in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  if (!a["no-normalize"]) {
    // Bring the mix to streaming loudness (-14 LUFS, true peak -1.5 dBTP); the picture is copied untouched.
    execFileSync("python3", [path.join(path.dirname(new URL(import.meta.url).pathname), "loudnorm.py"), out], { stdio: "inherit" });
  }
  try {
    const py = `import sys; sys.path.insert(0, ${JSON.stringify(path.dirname(new URL(import.meta.url).pathname))});
from _common import ffmpeg_bin; import subprocess, re
r = subprocess.run([ffmpeg_bin(), "-hide_banner", "-nostats", "-i", ${JSON.stringify(out)}, "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True)
i = re.findall(r"I:\\s+(-?[\\d.]+) LUFS", r.stderr); p = re.findall(r"Peak:\\s+(-?[\\d.]+) dBFS", r.stderr)
print(f"Loudness {i[-1] if i else '?'} LUFS (web target -14 to -16), true peak {p[-1] if p else '?'} dBFS (keep below -1)")`;
    execFileSync("python3", ["-c", py], { stdio: "inherit" });
  } catch { /* loudness check is best effort */ }
}
