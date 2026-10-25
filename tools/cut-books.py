# Cuts the book trophies out of league/src/books.jpg for the league promotion
# animation: python3 tools/cut-books.py (needs Pillow and numpy).
# Writes league/img/{blue,red,locked,green}.png with transparent backgrounds.
# green.png is the red book recolored to emerald; its pedestal is left as is.
import os
import numpy as np
from PIL import Image, ImageDraw

ROOT = os.path.join(os.path.dirname(__file__), '..')
SRC = os.path.join(ROOT, 'league', 'src', 'books.jpg')
OUT = os.path.join(ROOT, 'league', 'img')
BG = np.array([254, 253, 249], float)
PAD = 6

src = Image.open(SRC).convert('RGB')
px = np.asarray(src).astype(float)

# Background = everything flood-filled from the border; the trophies all have
# a darker outline, so the fill stops at it.
fill = src.copy()
ImageDraw.floodfill(fill, (0, 0), (255, 0, 255), thresh=14)
bg = np.all(np.asarray(fill) == [255, 0, 255], axis=2)

# Soft edge: background pixels near the outline get alpha by color distance
dist = np.abs(px - BG).max(axis=2)
alpha = np.where(bg, np.clip((dist - 3) / 22, 0, 1), 1.0)

# Un-blend the background out of the semi-transparent edge pixels
a = np.maximum(alpha, 1e-3)[..., None]
rgb = np.clip((px - BG * (1 - a)) / a, 0, 255)

# Split into the three trophies by column runs of opaque pixels
cols = (alpha > 0.5).sum(axis=0) > 2
runs, start = [], None
for x, on in enumerate(list(cols) + [False]):
    if on and start is None:
        start = x
    elif not on and start is not None:
        if x - start > 20:
            runs.append((start, x))
        start = None
assert len(runs) == 3, runs


def crop(x0, x1):
    rows = np.where((alpha[:, x0:x1] > 0.5).sum(axis=1) > 2)[0]
    y0, y1 = rows.min() - PAD, rows.max() + 1 + PAD
    x0, x1 = x0 - PAD, x1 + PAD
    return rgb[y0:y1, x0:x1].copy(), alpha[y0:y1, x0:x1].copy()


def save(name, c, al):
    im = np.dstack([c, al[..., None] * 255]).round().astype(np.uint8)
    Image.fromarray(im, 'RGBA').save(os.path.join(OUT, name + '.png'), optimize=True)
    print(name, im.shape[1], 'x', im.shape[0])


def emerald(c):
    # Map the red/crimson family (book and knob) onto lime-emerald greens;
    # the pale blue pedestal has a different hue and low saturation, so it stays.
    r, g, b = c[..., 0] / 255, c[..., 1] / 255, c[..., 2] / 255
    mx, mn = np.maximum(np.maximum(r, g), b), np.minimum(np.minimum(r, g), b)
    d = mx - mn
    s = np.where(mx > 0, d / np.maximum(mx, 1e-6), 0)
    h = np.zeros_like(mx)
    m = d > 1e-6
    rm, gm, bm = m & (mx == r), m & (mx == g) & (mx != r), m & (mx == b) & (mx != r) & (mx != g)
    h[rm] = ((g - b)[rm] / d[rm]) % 6
    h[gm] = (b - r)[gm] / d[gm] + 2
    h[bm] = (r - g)[bm] / d[bm] + 4
    h *= 60
    rel = ((h + 180) % 360) - 180          # signed distance from pure red
    redish = (np.abs(rel) < 50) & (s > 0.12)
    nh = 90 + (1 - mx) * 28 + rel * 0.1    # bright faces lime, dark rims grass green
    ns = np.clip(s * 1.05 + 0.04, 0, 1)
    nv = np.clip(mx * 0.86 + 0.06, 0, 1)
    # hsv -> rgb
    hh = (nh % 360) / 60
    i = np.floor(hh).astype(int) % 6
    f = hh - np.floor(hh)
    p, q, t = nv * (1 - ns), nv * (1 - ns * f), nv * (1 - ns * (1 - f))
    sel = [(nv, t, p), (q, nv, p), (p, nv, t), (p, q, nv), (t, p, nv), (nv, p, q)]
    out = c.copy() / 255
    for k, (R, G, B) in enumerate(sel):
        w = redish & (i == k)
        out[..., 0][w], out[..., 1][w], out[..., 2][w] = R[w], G[w], B[w]
    return out * 255


os.makedirs(OUT, exist_ok=True)
(blue, blue_a), (red, red_a), (locked, locked_a) = [crop(*r) for r in runs]
save('blue', blue, blue_a)
save('red', red, red_a)
save('locked', locked, locked_a)
save('green', emerald(red), red_a)
