// The 9:16 "Final vs. Viewport" plate: black card with two rounded 16:9 windows, title and footer.
import { makeCanvas, text, measure, rr, C } from './draw2d.js';
import { shieldIcon, COPY } from './textures.js';

export const VERSUS = { w: 1080, h: 1920, panel: { x: 26, w: 1028, h: 578 }, topY: 197, bottomY: 926 };

export function versusPlate() {
  const { w, h, panel, topY, bottomY } = VERSUS;
  const c = makeCanvas(w, h), g = c.getContext('2d');
  g.fillStyle = '#0b0a0f'; g.fillRect(0, 0, w, h);
  // punch the two windows out so the film shows through from underneath
  g.globalCompositeOperation = 'destination-out';
  for (const y of [topY, bottomY]) { rr(g, panel.x, y, panel.w, panel.h, 16); g.fill(); }
  g.globalCompositeOperation = 'source-over';
  text(g, 'Final vs. Viewport', w / 2, 872, { size: 64, weight: 700, color: '#ff3f8e', align: 'center', ls: -1 });
  g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 2; rr(g, 26, 1532, 1028, 330, 16); g.stroke();
  text(g, 'Open source · runs on-prem', w / 2, 1592, { size: 25, weight: 500, color: 'rgba(255,255,255,.42)', align: 'center', family: 'Inter' });
  const rw = text(g, COPY.repo, w / 2, 1630, { size: 30, weight: 700, color: 'rgba(255,255,255,.62)', align: 'center' });
  g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(w / 2 - rw / 2, 1637, rw, 2.5);
  const tags = 'Auth · ABAC · Taint tracking · Approvals · DLP · Audit', o = { size: 25, weight: 600, family: 'Inter' };
  const tw = measure(g, tags, o);
  g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(w / 2 - tw / 2 - 10, 1668, tw + 20, 36);
  text(g, tags, w / 2, 1695, { ...o, color: 'rgba(255,255,255,.88)', align: 'center' });
  ['A zero-trust control plane between your employees’', 'AI assistants and your internal systems.'].forEach((s, i) =>
    text(g, s, w / 2, 1742 + i * 30, { size: 22, weight: 400, color: 'rgba(255,255,255,.34)', align: 'center', family: 'Inter' }));
  for (let i = 0; i < 3; i++) shieldIcon(g, w / 2 - 50 + i * 50, 1826, 15, 'rgba(255,255,255,.4)', '#0b0a0f');
  return c;
}
