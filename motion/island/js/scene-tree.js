'use strict';
// 4.13 – 6.00s: the agent's working tree (Island's own source) writes itself. Letters drop into
// place, new folders flash mint then settle to periwinkle, new files flash
// cyan → pink → grey, and the view scrolls to follow.

// World space = screen space at frame 171, when the camera stops.
const TREE_X = { 0: 77, 1: 121, 2: 151 };
const TREE = [
  // name, depth, folder?, world y (row centre), first-letter frame, frames per letter, flashes colour?
  // the repo's real layout: src/Island.Lab/{Mascot, Island, Render}
  ['Island.Lab', 0, true, -141, 123.5, 0.55],
  ['Mascot', 1, true, -105, 130, 1.2],
  ['BloubEngine.cs', 2, false, -61, 139.5, 0.4, true],
  ['BloubFace.cs', 2, false, -23, 147.5, 0.3],
  ['BloubGaze.cs', 2, false, 18, 152, 0.3],
  ['Island', 1, true, 61, 146, 0.65],
  ['AgentTeam.cs', 2, false, 106, 151.5, 0.3, true],
  ['ClaudeSessions.cs', 2, false, 144, 156.5, 0.3],
  ['Render', 1, true, 197, 154.5, 0.65],
  ['FrameRenderer.cs', 2, false, 243, 158.5, 0.3, true],
  ['Gpu.cs', 2, false, 280, 164.5, 0.8],
];
// connector lines: [x, y0, y1, elbowTo, grow-from frame, grow-to frame]
const TREE_LINES = [
  [70, -127, 194, 95, 132, 151],
  [139, -90, -10, null, 138, 151],
  [133, 75, 156, null, 152, 158],
  [139, 211, 292, null, 158, 166],
];
// camera: world → screen translation by frame
const TREE_CAM = [
  [F(125), [10, 216]], [F(131), [12, 212], E.lin], [F(141), [13, 184], E.lin], [F(145), [13, 172], E.lin],
  [F(147), [12, 150], E.inQ], [F(149), [8, 116], E.lin], [F(151), [5, 73], E.lin], [F(155), [5, 40], E.outQ],
  [F(161), [5, 14], E.outQ], [F(171), [0, 0], E.outQ], [F(180), [-2, -4], E.lin],
];

const FOLDER_SIZE = 25.5, FILE_SIZE = 21.5;
let treeFont = { folder: FOLDER_SIZE, file: FILE_SIZE };
function fitTreeFont(ctx) {
  // "storefront" is 84 px wide and "ProductGrid.tsx" 116 px at frame 171
  treeFont.folder = FOLDER_SIZE * 84 / measure(ctx, 'storefront', FOLDER_SIZE, 'Inter', 400, -0.045);
  treeFont.file = FILE_SIZE * 116 / measure(ctx, 'ProductGrid.tsx', FILE_SIZE, 'Inter', 400, -0.045);
}

function folderIcon(ctx, x, y, col, a) {
  ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = rgb(col);
  ctx.beginPath();
  ctx.moveTo(x, y - 9); ctx.lineTo(x + 12, y - 9); ctx.lineTo(x + 15, y - 6.5); ctx.lineTo(x + 34, y - 6.5);
  ctx.lineTo(x + 34, y + 13); ctx.lineTo(x, y + 13); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(x, y - 4, 34, 2);
  ctx.restore();
}
function fileIcon(ctx, x, y, col, a) {
  ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = rgb(col);
  ctx.beginPath(); ctx.moveTo(x, y - 13); ctx.lineTo(x + 14, y - 13); ctx.lineTo(x + 21, y - 6); ctx.lineTo(x + 21, y + 14); ctx.lineTo(x, y + 14); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.06)'; ctx.beginPath(); ctx.moveTo(x + 14, y - 13); ctx.lineTo(x + 14, y - 6); ctx.lineTo(x + 21, y - 6); ctx.closePath(); ctx.fill();
  ctx.restore();
}

function treeItem(ctx, t, [name, depth, folder, y, f0, per, flash], seed) {
  const t0 = F(f0);
  if (t < t0 - 0.01) return;
  const ix = TREE_X[depth] + (depth === 1 && name === 'Render' ? 6 : 0) + (depth === 2 && y > 200 ? 7 : 0);
  const tx = ix + (folder ? (depth === 0 ? 42 : 40) : 34);
  // icon
  const ia = seg(t, t0 + F(3) - F(1), t0 + F(5) - F(1));
  if (folder) {
    const col = mix([150, 240, 205], [168, 176, 255], seg(t, t0 + 0.25, t0 + 0.45));
    folderIcon(ctx, ix, y, col, ia);
  } else {
    fileIcon(ctx, ix, y, [222, 220, 236], ia * 0.95);
  }
  // letters
  const size = folder ? treeFont.folder : treeFont.file;
  const r = mulberry32(seed * 97 + 3);
  let x = tx;
  const done = t0 + F(1 + name.length * per);
  for (let i = 0; i < name.length; i++) {
    const ti = t0 + F(1 + i * per);
    const w = measure(ctx, name[i], size, 'Inter', 400, -0.045);
    const k = seg(t, ti, ti + F(6));
    if (k > 0) {
      const dy = (1 - E.outC(k)) * (4 + r() * 8) * (r() < 0.5 ? 1 : 0.6);
      let col;
      if (folder) col = [30, 28, 44];
      else {
        const age = t - done;
        if (!flash) col = [112, 108, 132];
        else col = age < -F(3) ? [110, 220, 225] : age < F(1) ? [214, 110, 190] : mix([214, 110, 190], [112, 108, 132], seg(age, F(1), F(3)));
      }
      text(ctx, name[i], x, y + size * 0.36 + dy, { size, color: col, alpha: E.outQ(k), tracking: -0.045 });
    } else r(), r();
    x += w;
  }
}

function sceneTree(ctx, t) {
  if (t < F(127)) scenePrompt(ctx, t); else studioBG(ctx);
  const [cx, cy] = kf(t, TREE_CAM);
  const fade = kf(t, [[F(174), 1], [F(176), 0.55], [F(178), 0.4], [F(181), 0.25], [F(183), 0]]);
  ctx.save();
  ctx.globalAlpha = fade;
  ctx.translate(cx, cy);
  for (const [x, y0, y1, elbow, a, b] of TREE_LINES) {
    const k = E.ioQ(seg(t, F(a), F(b)));
    if (k <= 0) continue;
    const yy = lerp(y0, y1, k);
    const fresh = 1 - seg(t, F(b), F(b + 8));
    ctx.strokeStyle = rgb(mix([186, 182, 214], [120, 225, 230], fresh * 0.8));
    ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, yy);
    if (elbow && k >= 1) ctx.lineTo(lerp(x, elbow, seg(t, F(b), F(b + 2))), yy);
    ctx.stroke();
  }
  TREE.forEach((it, i) => treeItem(ctx, t, it, i));
  ctx.restore();
}
