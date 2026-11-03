"""Cut the 10 poses out of the reference sheet as transparent PNG sprites.

    python3 -I mascot/tools/extract.py SHEET.png mascot/art/

The sheet's paper is one flat colour, so the background is flood-filled from every
pixel that matches it, the soft drop shadows under the feet are removed (the page
draws live shadows that react to jumps), and edge pixels get a soft alpha with the
paper colour taken back out of them, so nothing has a cream fringe on any background.
"""
import sys, json, os
from collections import deque
from PIL import Image

src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
im = Image.open(src).convert('RGB')
W, H = im.size
px = im.load()
BG = (250, 237, 221)
SHADOW = (208, 208, 213)

def d2(a, b):
    return (a[0]-b[0])**2 + (a[1]-b[1])**2 + (a[2]-b[2])**2

def on_shadow_line(c):
    # is c a blend of paper and shadow grey? returns blend amount or None
    v = [SHADOW[i]-BG[i] for i in range(3)]
    w = [c[i]-BG[i] for i in range(3)]
    vv = sum(x*x for x in v)
    k = sum(w[i]*v[i] for i in range(3)) / vv
    if k < -0.1 or k > 1.25: return None
    r = sum((w[i]-k*v[i])**2 for i in range(3))
    return k if r < 60 else None

# 1. background = paper reached from the sheet's border. Paper-coloured pixels INSIDE a figure
#    (the open books' pages are the same cream as the paper) stay. Soft grey shadows are
#    passable, so gaps between a cane and a leg drain out through the shadow below them.
def passable(c):
    return d2(c, BG) < 150 or (on_shadow_line(c) is not None and d2(c, BG) < 3600)
bg = bytearray(W*H)
q = deque()
for x in range(W):
    for y in (0, H-1):
        bg[y*W+x] = 1; q.append((x, y))
for y in range(H):
    for x in (0, W-1):
        bg[y*W+x] = 1; q.append((x, y))
while q:
    x, y = q.popleft()
    for nx, ny in ((x+1,y),(x-1,y),(x,y+1),(x,y-1)):
        if 0 <= nx < W and 0 <= ny < H and not bg[ny*W+nx] and passable(px[nx, ny]):
            bg[ny*W+nx] = 1; q.append((nx, ny))

# 2. foreground components
lab = [0]*(W*H)
comps = []
for y in range(H):
    for x in range(W):
        i = y*W+x
        if bg[i] or lab[i]: continue
        n = len(comps)+1
        lab[i] = n; q = deque([(x, y)]); pts = []
        while q:
            cx, cy = q.popleft(); pts.append((cx, cy))
            for nx, ny in ((cx+1,cy),(cx-1,cy),(cx,cy+1),(cx,cy-1)):
                j = ny*W+nx
                if 0 <= nx < W and 0 <= ny < H and not bg[j] and not lab[j]:
                    lab[j] = n; q.append((nx, ny))
        xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
        comps.append(dict(id=n, n=len(pts), box=[min(xs), min(ys), max(xs), max(ys)], pts=pts))

# 3. shadows: wide flat components made only of paper/grey blends
def is_shadow(c):
    x0, y0, x1, y1 = c['box']
    if (y1-y0) > 40 or (x1-x0) < 60: return False
    good = sum(1 for (x, y) in c['pts'][::3] if on_shadow_line(px[x, y]) is not None)
    return good > 0.85 * len(c['pts'][::3])

big = [c for c in comps if c['n'] > 3000 and not is_shadow(c)]
shadows = [c for c in comps if is_shadow(c)]
# most shadows touch the shoes, so they arrive glued to a figure: peel them off the bottom band
for f in big:
    y1 = f['box'][3]
    sp = [(x, y) for (x, y) in f['pts'] if y > y1 - 46 and on_shadow_line(px[x, y]) is not None and d2(px[x, y], BG) > 30]
    if len(sp) > 400:
        spset = set(sp)
        f['pts'] = [p for p in f['pts'] if p not in spset]
        for (x, y) in sp: bg[y*W+x] = 1
        xs = [p[0] for p in sp]; ys = [p[1] for p in sp]
        shadows.append(dict(n=len(sp), box=[min(xs), min(ys), max(xs), max(ys)], pts=sp))
        xs = [p[0] for p in f['pts']]; ys = [p[1] for p in f['pts']]
        f['box'] = [min(xs), min(ys), max(xs), max(ys)]
print('figures', len(big), 'shadows', len(shadows))
# 4. small pieces (sparks, stick tips) go to the nearest figure; specks are dropped
def dist_box(c, f):
    x0, y0, x1, y1 = c['box']; X0, Y0, X1, Y1 = f['box']
    dx = max(X0-x1, x0-X1, 0); dy = max(Y0-y1, y0-Y1, 0)
    return (dx*dx+dy*dy) ** 0.5
for f in big: f['parts'] = [f]
for c in comps:
    if c in big or c in shadows or c['n'] < 12: continue
    f = min(big, key=lambda f: dist_box(c, f))
    if dist_box(c, f) < 60: f['parts'].append(c)

# shadow pixels: background that is visibly grey
shadowpx = [(x, y) for y in range(0, H, 1) for x in range(0, W, 2) if bg[y*W+x] and d2(px[x, y], BG) > 500 and on_shadow_line(px[x, y]) is not None]

# order: rows top→bottom, then left→right
big.sort(key=lambda f: (0 if f['box'][1] < H/2 - 60 else 1, f['box'][0]))
meta = []
for k, f in enumerate(big):
    allpts = [p for part in f['parts'] for p in part['pts']]
    xs = [p[0] for p in allpts]; ys = [p[1] for p in allpts]
    pad = 6
    x0, y0, x1, y1 = min(xs)-pad, min(ys)-pad, max(xs)+pad, max(ys)+pad
    w, h = x1-x0+1, y1-y0+1
    o = Image.new('RGBA', (w, h), (0, 0, 0, 0)); op = o.load()
    mine = set(allpts)
    # depth: steps from the background, up to 4
    depth = {}
    frontier = [p for p in allpts if any(0 <= nx < W and 0 <= ny < H and bg[ny*W+nx] for nx, ny in ((p[0]+1,p[1]),(p[0]-1,p[1]),(p[0],p[1]+1),(p[0],p[1]-1)))]
    for p in frontier: depth[p] = 1
    for dd in (2, 3, 4):
        nxt = []
        for (x, y) in frontier:
            for p2 in ((x+1,y),(x-1,y),(x,y+1),(x,y-1)):
                if p2 in mine and p2 not in depth:
                    depth[p2] = dd; nxt.append(p2)
        frontier = nxt
    for (x, y) in allpts:
        c = px[x, y]
        a = 1.0
        dp = depth.get((x, y), 9)
        if dp <= 2:
            # the colour just inside the edge, then where c sits between paper and it
            acc = [0, 0, 0]; n = 0
            for dx in (-3, -2, -1, 0, 1, 2, 3):
                for dy in (-3, -2, -1, 0, 1, 2, 3):
                    p2 = (x+dx, y+dy)
                    if depth.get(p2, 9 if p2 in mine else 0) >= 3:
                        q2 = px[p2]; acc[0] += q2[0]; acc[1] += q2[1]; acc[2] += q2[2]; n += 1
            if n:
                ref = [v / n for v in acc]
                v = [ref[i]-BG[i] for i in range(3)]; wv = [c[i]-BG[i] for i in range(3)]
                vv = sum(t*t for t in v)
                if vv > 120:
                    a = max(0.0, min(1.0, sum(wv[i]*v[i] for i in range(3)) / vv))
                else:
                    a = 1.0 if dp == 2 else 0.6
            else:
                a = 0.5
        if a <= 0.03: continue
        col = [max(0, min(255, round((c[i] - (1-a)*BG[i]) / a))) for i in range(3)]
        op[x-x0, y-y0] = (col[0], col[1], col[2], round(a*255))
    # the lowest opaque row is where the soles touch the floor (jump: none; floor from shadow)
    # the floor: the middle of this figure's drop shadow (grey paper below the figure)
    shp = [(sx, sy) for (sx, sy) in shadowpx if x0 - 40 <= sx <= x1 + 40 and y1 - 70 <= sy <= y1 + 60]
    sys_ = sorted(sy for _, sy in shp); sxs = sorted(sx for sx, _ in shp)
    sh = dict(box=[sxs[0], sys_[0], sxs[-1], sys_[-1]])
    floor = (sh['box'][1] + sh['box'][3]) / 2
    name = f'pose{k+1:02d}.png'
    o.save(os.path.join(out, name))
    meta.append(dict(file=name, sheet=[x0, y0, w, h], floorY=round(floor - y0, 1), shadowW=sh['box'][2]-sh['box'][0], shadowCx=round((sh['box'][0]+sh['box'][2])/2 - x0, 1)))
    print(name, meta[-1])
json.dump(meta, open(os.path.join(out, 'poses.json'), 'w'), indent=1)

# 5. pose 6: lift the three yellow spark strokes off the drawing; the page redraws them
#    (same colour, width and place, measured here) so they can pop with each pointer tap.
import math
im6 = Image.open(os.path.join(out, 'pose06.png')).convert('RGBA'); p6 = im6.load(); W6, H6 = im6.size
def yellow(c): return c[3] > 20 and c[0] > 180 and c[1] > 120 and c[2] < 170 and c[0] - c[2] > 60
seen = set()
for y in range(100, 210):
    for x in range(0, 60):
        if (x, y) in seen or not yellow(p6[x, y]): continue
        qq = deque([(x, y)]); seen.add((x, y)); pts = []
        while qq:
            a, b = qq.popleft(); pts.append((a, b))
            for n in ((a+1,b),(a-1,b),(a,b+1),(a,b-1),(a+1,b+1),(a-1,b-1),(a+1,b-1),(a-1,b+1)):
                if 0 <= n[0] < W6 and 0 <= n[1] < H6 and n not in seen and p6[n][3] > 10 and (yellow(p6[n]) or p6[n][3] < 200):
                    seen.add(n); qq.append(n)
        if len(pts) > 15:
            for pnt in pts: p6[pnt] = (0, 0, 0, 0)
im6.save(os.path.join(out, 'pose06.png'))
