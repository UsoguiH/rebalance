// Resolve Playwright from the project, NODE_PATH, or the global npm root.
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
const require = createRequire(import.meta.url);
function load() {
  try { return require('playwright'); } catch {}
  for (const root of ['/opt/node-tools/node_modules', safe(() => execSync('npm root -g').toString().trim())]) {
    if (!root) continue;
    try { return createRequire(root + '/')('playwright'); } catch {}
  }
  throw new Error('Playwright not found. Run `npm i -D playwright && npx playwright install chromium`.');
}
function safe(f) { try { return f(); } catch { return null; } }
export const { chromium } = load();
