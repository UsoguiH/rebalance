import { Config } from "@remotion/cli/config";
import fs from "node:fs";
import path from "node:path";

// Use an already-installed Chromium when one exists (CI / cloud boxes); otherwise
// Remotion downloads its own headless shell on first render.
const findBrowser = (): string | null => {
  if (process.env.REMOTION_BROWSER && fs.existsSync(process.env.REMOTION_BROWSER)) return process.env.REMOTION_BROWSER;
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (root && fs.existsSync(root)) {
    for (const dir of fs.readdirSync(root).filter((d) => d.startsWith("chromium_headless_shell")).sort().reverse()) {
      for (const sub of ["chrome-linux/headless_shell", "chrome-headless-shell-linux64/chrome-headless-shell"]) {
        const p = path.join(root, dir, sub);
        if (fs.existsSync(p)) return p;
      }
    }
  }
  return null;
};
const browser = findBrowser();
if (browser) Config.setBrowserExecutable(browser);
Config.setChromiumOpenGlRenderer("angle");
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(92);
