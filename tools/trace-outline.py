# Traces the outline of the unlocked trophy art for the ink-style animation:
#   python3 tools/trace-outline.py   (needs Pillow and numpy)
# Writes league/shapes.js with each outline as evenly spaced points, as
# fractions of the image width and height, going clockwise from the top.
import os
import json
import numpy as np
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), '..')
SOURCES = {'ranks': 'league/img/ranks/rank-diamond.png', 'books': 'league/img/green.png'}
N = 160


def trace(mask):
    # Moore-neighbour boundary trace of the largest blob, starting at its top
    h, w = mask.shape
    ys, xs = np.nonzero(mask)
    i = np.argmin(ys * w + xs)
    start = (int(ys[i]), int(xs[i]))
    dirs = [(-1, 0), (-1, 1), (0, 1), (1, 1), (1, 0), (1, -1), (0, -1), (-1, -1)]
    pts, cur, back = [start], start, 6
    for _ in range(w * h):
        for k in range(8):
            d = (back + 1 + k) % 8
            ny, nx = cur[0] + dirs[d][0], cur[1] + dirs[d][1]
            if 0 <= ny < h and 0 <= nx < w and mask[ny, nx]:
                back = (d + 4) % 8
                cur = (ny, nx)
                break
        if cur == start:
            break
        pts.append(cur)
    return np.array([[x, y] for y, x in pts], float)


def resample(pts, n):
    seg = np.r_[0, np.cumsum(np.hypot(*np.diff(np.r_[pts, pts[:1]], axis=0).T))]
    t = np.linspace(0, seg[-1], n, endpoint=False)
    closed = np.r_[pts, pts[:1]]
    return np.c_[np.interp(t, seg, closed[:, 0]), np.interp(t, seg, closed[:, 1])]


def smooth(pts, k=2):
    out = pts.copy()
    for _ in range(k):
        out = (np.roll(out, 1, 0) + 2 * out + np.roll(out, -1, 0)) / 4
    return out


shapes = {}
for name, path in SOURCES.items():
    im = Image.open(os.path.join(ROOT, path)).convert('RGBA')
    a = np.asarray(im)[..., 3] > 128
    pts = smooth(resample(trace(a), N))
    w, h = im.size
    shapes[name] = [[round(x / w, 4), round(y / h, 4)] for x, y in pts]
    print(name, len(pts), 'points')

with open(os.path.join(ROOT, 'league', 'shapes.js'), 'w') as f:
    f.write('// Outlines of the unlocked trophies for the ink style, traced by\n'
            '// tools/trace-outline.py: points as fractions of the image size.\n'
            'window.LEAGUE_SHAPES = ' + json.dumps(shapes, separators=(',', ':')) + ';\n')
