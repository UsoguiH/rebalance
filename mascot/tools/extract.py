"""Cut the 10 poses out of the reference sheet as transparent PNG sprites.

    python3 -I mascot/tools/extract.py SHEET.png mascot/art/ [SCALE ORIGINAL.png]

SHEET is the reference sheet, or the 2x sharpened copy from upscale.py (then SCALE=2 and
ORIGINAL is the untouched sheet: its figure mask is ORed in, because the upscaler can blur
a thin paper-coloured channel into a figure, e.g. pose 8's open-book pages).
Crops always use the boxes in mascot/art/boxes.json (in original-sheet pixels, times
SCALE), so the rig points in js/poses.js stay valid at any resolution.

The sheet's paper is one flat colour, so:
  1. background = paper (and the soft grey drop shadows) flood-filled from the border.
     Paper-coloured pixels inside a figure (the open books' pages) stay.
  2. edges get a soft alpha: each edge pixel is projected between the paper colour and
     the colour just inside the figure, and the paper is taken back out of it, so there
     is no cream fringe on any background.
  3. pose 6's three yellow spark strokes are lifted off; the page redraws them live.
Needs numpy, scipy, Pillow.
"""
import sys, os, json
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

src, out = sys.argv[1], sys.argv[2]
S = float(sys.argv[3]) if len(sys.argv) > 3 else 1.0
os.makedirs(out, exist_ok=True)
boxes = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'art', 'boxes.json')))

im = np.asarray(Image.open(src).convert('RGB')).astype(np.float32)
H, W, _ = im.shape
border = np.concatenate([im[0], im[-1], im[:, 0], im[:, -1]])
BG = np.median(border, axis=0)
SHADOW = np.array([213.0, 214, 217])
print('paper', BG)

d2 = ((im - BG) ** 2).sum(-1)
v = SHADOW - BG
k = ((im - BG) * v).sum(-1) / (v * v).sum()
resid = (((im - BG) - k[..., None] * v) ** 2).sum(-1)
shadowish = (k > -0.1) & (k < 1.25) & (resid < 60) & (d2 < 3600)
passable = (d2 < 150) | shadowish

def figure_mask(img):
    d = ((img - BG) ** 2).sum(-1)
    kk = ((img - BG) * v).sum(-1) / (v * v).sum()
    rr = (((img - BG) - kk[..., None] * v) ** 2).sum(-1)
    pas = (d < 150) | ((kk > -0.1) & (kk < 1.25) & (rr < 60) & (d < 3600))
    lb, _ = ndi.label(pas)
    el = np.unique(np.concatenate([lb[0], lb[-1], lb[:, 0], lb[:, -1]]))
    return ~np.isin(lb, el[el > 0])

fg = figure_mask(im)
if len(sys.argv) > 4:
    orig = np.asarray(Image.open(sys.argv[4]).convert('RGB')).astype(np.float32)
    f1 = figure_mask(orig)
    up = np.repeat(np.repeat(f1, int(S), 0), int(S), 1)[:H, :W]
    fg |= ndi.binary_erosion(up, iterations=int(2 * S))
# drop specks (antialias crumbs left in the paper)
fl, fn = ndi.label(fg)
sizes = ndi.sum(np.ones_like(fl), fl, index=np.arange(1, fn + 1))
small = np.isin(fl, np.where(sizes < 14 * S * S)[0] + 1)
fg &= ~small

# matte: pixels within ~2.5 px of the paper are projected between paper and the colour inside
depth = ndi.distance_transform_edt(fg)
inner = (depth >= 3.5 * S).astype(np.float32)
r = int(round(3 * S))
num = np.stack([ndi.uniform_filter(im[..., c] * inner, 2 * r + 1) for c in range(3)], -1)
den = ndi.uniform_filter(inner, 2 * r + 1)[..., None]
ref = np.where(den > 1e-3, num / np.maximum(den, 1e-3), im)
vv = ((ref - BG) ** 2).sum(-1)
proj = ((im - BG) * (ref - BG)).sum(-1) / np.maximum(vv, 1e-3)
alpha = np.where(fg, 1.0, 0.0)
band = fg & (depth <= 2.5 * S)
alpha = np.where(band & (vv > 120), np.clip(proj, 0, 1), alpha)
alpha = np.where(band & (vv <= 120) & (depth <= 1.5 * S), 0.6, alpha)
a3 = np.maximum(alpha, 1e-3)[..., None]
col = np.clip((im - (1 - alpha[..., None]) * BG) / a3, 0, 255)
rgba = np.dstack([col, alpha * 255]).round().astype(np.uint8)
rgba[alpha < 0.03] = 0

meta = []
for b in boxes:
    x0, y0, w, h = [int(round(t * S)) for t in b['box']]
    crop = rgba[y0:y0 + h, x0:x0 + w].copy()
    # open books: the pages are paper-coloured, so seal them inside the book's own rectangle
    PAGES = {'pose08.png': (50, 165, 230, 215), 'pose06.png': (150, 180, 335, 232)}
    if b['file'] in PAGES:
        px0, py0, px1, py1 = [int(t * S) for t in PAGES[b['file']]]
        a = crop[py0:py1, px0:px1, 3] > 0
        sealed = ndi.binary_fill_holes(ndi.binary_closing(a, iterations=int(6 * S)))
        add = sealed & ~a
        src_px = im[y0 + py0:y0 + py1, x0 + px0:x0 + px1]
        region = crop[py0:py1, px0:px1]
        region[add, :3] = src_px[add].round().astype(np.uint8)
        region[add, 3] = 255
        # semi-transparent pixels inside the seal become solid too
        inner_soft = sealed & a & (region[..., 3] < 255) & ndi.binary_erosion(sealed, iterations=int(2 * S))
        region[inner_soft, :3] = src_px[inner_soft].round().astype(np.uint8)
        region[inner_soft, 3] = 255
    if b['file'] == 'pose06.png':
        # lift the yellow spark strokes (left of the pointer)
        sub = crop[int(100 * S):int(210 * S), 0:int(60 * S)]
        c = sub.astype(np.int32)
        yellow = (c[..., 3] > 10) & (c[..., 0] > 180) & (c[..., 1] > 120) & (c[..., 2] < 170) & (c[..., 0] - c[..., 2] > 60)
        yellow = ndi.binary_dilation(yellow, iterations=int(2 * S)) & (c[..., 3] > 0) & ~((c[..., 0] < 90) & (c[..., 1] < 90))
        sub[yellow] = 0
    Image.fromarray(crop, 'RGBA').save(os.path.join(out, b['file']))
    meta.append(dict(file=b['file'], scale=S, box=b['box']))
    print(b['file'], crop.shape[1], 'x', crop.shape[0])
json.dump(meta, open(os.path.join(out, 'poses.json'), 'w'), indent=1)
