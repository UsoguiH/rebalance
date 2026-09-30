// Find a Chromium binary and load playwright-core from the video project's node_modules.
import { execSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";

export function loadPlaywright(projectDir) {
  const require = createRequire(path.join(path.resolve(projectDir), "package.json"));
  try {
    return require("playwright-core");
  } catch {
    throw new Error(`playwright-core not found in ${projectDir}/node_modules. Run: cd ${projectDir} && npm install`);
  }
}

function globFirst(root, dirPrefix, subs) {
  if (!root || !fs.existsSync(root)) return null;
  for (const d of fs.readdirSync(root).filter((x) => x.startsWith(dirPrefix)).sort().reverse()) {
    for (const s of subs) {
      const p = path.join(root, d, s);
      if (fs.existsSync(p)) return p;
    }
  }
  return null;
}

export function findChrome(projectDir) {
  const env = process.env.CHROME_PATH || process.env.REMOTION_BROWSER;
  if (env && fs.existsSync(env)) return env;
  const pw = [process.env.PLAYWRIGHT_BROWSERS_PATH, path.join(os.homedir(), ".cache", "ms-playwright"),
    path.join(os.homedir(), "Library", "Caches", "ms-playwright"), path.join(os.homedir(), "AppData", "Local", "ms-playwright")];
  for (const root of pw) {
    const hit = globFirst(root, "chromium-", ["chrome-linux/chrome", "chrome-linux64/chrome", "chrome-mac/Chromium.app/Contents/MacOS/Chromium",
      "chrome-mac-arm64/Chromium.app/Contents/MacOS/Chromium", "chrome-win/chrome.exe", "chrome-win64/chrome.exe"])
      || globFirst(root, "chromium_headless_shell", ["chrome-linux/headless_shell", "chrome-headless-shell-linux64/chrome-headless-shell"]);
    if (hit) return hit;
  }
  const system = ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"];
  for (const p of system) if (fs.existsSync(p)) return p;
  // Remotion's own headless shell (downloaded by `npx remotion browser ensure`)
  const rem = path.join(path.resolve(projectDir), "node_modules", ".remotion", "chrome-headless-shell");
  const find = (dir) => {
    if (!fs.existsSync(dir)) return null;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { const r = find(p); if (r) return r; }
      else if (/^chrome-headless-shell(\.exe)?$/.test(e.name)) return p;
    }
    return null;
  };
  let hit = find(rem);
  if (!hit) {
    try { execSync("npx remotion browser ensure", { cwd: projectDir, stdio: "inherit" }); } catch { /* ignore */ }
    hit = find(rem);
  }
  if (!hit) throw new Error("No Chromium found. Install Google Chrome or run `npx remotion browser ensure` in the project.");
  return hit;
}

export async function launch(projectDir) {
  const { chromium } = loadPlaywright(projectDir);
  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  return chromium.launch({ executablePath: findChrome(projectDir), proxy: proxy ? { server: proxy } : undefined });
}

export function args(argv = process.argv.slice(2)) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const k = a.slice(2);
      const v = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : true;
      out[k] = v;
    } else out._.push(a);
  }
  return out;
}
