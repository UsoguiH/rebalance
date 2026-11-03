"""Split the reference sheet into animation layers. The character pixels are the original
art, untouched; we only cut them into parts at their pivots.

    python3 -I teacher/tools/build_layers.py teacher/art/sheet.png teacher/img

For every pose: body.png (everything), head.png, and optional parts (hand, armL, armR,
crown, sparks), plus layers.json with crop boxes, pivots and detected eyes.
"""
import json, sys
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as nd

SRC, OUT = sys.argv[1], sys.argv[2]
im = np.asarray(Image.open(SRC).convert('RGB')).astype(float)
H, W, _ = im.shape

# ── 1. background removal (flood from the border; soft, colour-decontaminated edges)
border = np.concatenate([im[0], im[-1], im[:, 0], im[:, -1]])
bg = np.median(border, axis=0)
d = np.sqrt(((im - bg) ** 2).sum(-1))
mx, mn = im.max(-1), im.min(-1)
yy = np.arange(H)[:, None] * np.ones((1, W))
shadowzone = ((yy > 468) & (yy < 512)) | (yy > 905)
shadow = shadowzone & ((mx - mn) < 18) & (im.mean(-1) > 190)
cand = (d < 26) | shadow
lab, n = nd.label(cand)
edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
isbg = np.isin(lab, list(edge))
sizes = nd.sum(cand, lab, range(1, n + 1))
for i, s in enumerate(sizes):  # enclosed gaps (between legs, under arms)
    L = i + 1
    if L not in edge and s > 400 and np.median(d[lab == L]) <= 12:
        isbg[lab == L] = True
fg = ~isbg
near = fg & nd.binary_dilation(isbg, iterations=2)
alpha = fg.astype(float)
dist_bg = np.where(shadow, 60, d)
alpha[near] = np.clip((dist_bg[near] - 6) / 40, 0, 1)
a3 = np.maximum(alpha, 1e-3)[..., None]
col = np.where(near[..., None], np.clip((im - (1 - a3) * bg) / a3, 0, 255), im)
RGBA = np.dstack([col, alpha * 255]).astype(np.uint8)

# ── 2. the ten poses: crop boxes found from the art, then hand-placed cuts (crop coords)
POSES = {
  'idle':       dict(cell=0, neck=(102, 196), head=[(10,0),(205,0),(205,170),(150,202),(60,202),(10,170)]),
  'wave':       dict(cell=1, neck=(150, 200), head=[(85,0),(272,0),(272,150),(250,172),(195,206),(118,206),(95,172),(85,120)],
                     parts={'hand': dict(poly=[(0,96),(84,96),(84,150),(72,196),(40,204),(0,172)], pivot=(56,192))}),
  'jump':       dict(cell=2, neck=(150, 238), head=[(70,38),(236,38),(240,150),(222,200),(170,244),(90,244),(72,190),(68,70)],
                     parts={'armL': dict(poly=[(0,0),(98,0),(98,40),(68,70),(68,160),(58,204),(25,192),(0,150)], pivot=(70,196)),
                            'armR': dict(poly=[(236,56),(336,56),(336,176),(266,216),(242,204),(240,150)], pivot=(244,206))}),
  'proud':      dict(cell=3, neck=(92, 196), head=[(8,0),(188,0),(188,150),(166,170),(132,202),(55,202),(8,160)]),
  'determined': dict(cell=4, neck=(142, 196), head=[(52,0),(238,0),(238,160),(186,202),(95,202),(52,160)]),
  'teach':      dict(cell=5, neck=(212, 192), head=[(150,0),(334,0),(334,140),(302,170),(242,196),(176,196),(150,166)],
                     parts={'pointer': dict(poly=[(0,84),(72,84),(126,142),(138,172),(142,240),(96,236),(60,206),(48,160),(44,118),(0,118)], pivot=(146,214)),
                            'sparks': dict(poly=[(0,118),(44,118),(44,196),(0,196)], pivot=(40,150), color='gold')}),
  'oops':       dict(cell=6, neck=(132, 192), head=[(70,0),(252,0),(252,140),(216,165),(176,196),(106,196),(76,166)],
                     parts={'hand': dict(poly=[(0,120),(90,120),(90,176),(76,216),(55,232),(18,226),(0,190)], pivot=(60,214))}),
  'read':       dict(cell=7, neck=(128, 186), head=[(58,0),(242,0),(242,150),(202,186),(110,186),(58,150)], head_behind=True),
  'sleep':      dict(cell=8, neck=(140, 178), head=[(76,0),(268,0),(268,160),(222,172),(160,192),(100,172),(76,130)]),
  'champion':   dict(cell=9, neck=(106, 200), head=[(44,14),(200,14),(205,80),(203,150),(186,186),(140,212),(70,212),(44,170)],
                     parts={'book': dict(poly=[(200,72),(306,72),(306,186),(242,216),(206,204),(200,150)], pivot=(214,204)),
                            'crown': dict(poly=[(126,0),(230,0),(230,64),(206,74),(164,70),(126,46)], pivot=(178,62), color='gold')}),
}

solid = nd.binary_opening(alpha > 0.5, iterations=1)
lab2, n2 = nd.label(solid)
objs = nd.find_objects(lab2)
sz = nd.sum(solid, lab2, range(1, n2 + 1))
cells = {}
for i, sl in enumerate(objs):
    if sz[i] < 30: continue
    cy, cx = (sl[0].start + sl[0].stop) / 2, (sl[1].start + sl[1].stop) / 2
    k = (0 if cy < 512 else 5) + min(4, int(cx // (W / 5)))
    cells.setdefault(k, []).append(sl)
box = {}
for k, sls in cells.items():
    y0 = max(0, min(s[0].start for s in sls) - 6); y1 = min(H, max(s[0].stop for s in sls) + 6)
    x0 = max(0, min(s[1].start for s in sls) - 6); x1 = min(W, max(s[1].stop for s in sls) + 6)
    box[k] = (x0, y0, x1, y1)

def polymask(poly, w, h, grow_down=0):
    m = Image.new('L', (w, h), 0)
    ImageDraw.Draw(m).polygon([(x, y) for x, y in poly], fill=255)
    return np.asarray(m) > 0

def save(arr, path):
    Image.fromarray(arr).save(path, optimize=True)

meta = {}
for name, cfg in POSES.items():
    x0, y0, x1, y1 = box[cfg['cell']]
    crop = RGBA[y0:y1, x0:x1].copy()
    h, w = crop.shape[:2]
    a = crop[..., 3].astype(float)
    taken = np.zeros((h, w), bool)
    layers = {}
    # parts first (they win over the head where polygons meet)
    for pname, p in cfg.get('parts', {}).items():
        m = polymask(p['poly'], w, h)
        if p.get('color') == 'gold':
            r, g, b = crop[..., 0].astype(int), crop[..., 1].astype(int), crop[..., 2].astype(int)
            gold = (r > 170) & (g > 110) & (b < 140) & (r - b > 90)
            m = m & nd.binary_dilation(gold, iterations=1)
        m = m & ~taken
        # overlap ring: only around the pivot (the cut line), so nothing else is dragged along
        yy_, xx_ = np.mgrid[0:h, 0:w]
        disk = (xx_ - p['pivot'][0]) ** 2 + (yy_ - p['pivot'][1]) ** 2 < 34 ** 2
        ring = (nd.binary_dilation(m, iterations=7) & disk & ~m & ~taken) if p.get('color') != 'gold' else np.zeros_like(m)
        layers[pname] = dict(mask=m | ring, core=m, pivot=p['pivot'])
        taken |= m
    head = polymask(cfg['head'], w, h) & ~taken
    # the body keeps an overlap band under the head, so a turning head never opens a seam
    band = polymask([(x, y - (14 if y > cfg['neck'][1] - 30 else 0)) for x, y in cfg['head']], w, h) & ~taken
    body_alpha = a.copy()
    body_alpha[band] = 0
    for pname, L in layers.items():
        body_alpha[L['core']] = 0
    out = {}
    def emit(mask_or_alpha, key, is_alpha=False):
        layer = crop.copy()
        layer[..., 3] = (mask_or_alpha if is_alpha else (a * mask_or_alpha)).astype(np.uint8)
        save(layer, f'{OUT}/{name}-{key}.png')
    # crown: paint the hair back under it in the head layer
    hcrop = crop.copy()
    if 'crown' in layers:
        cm = nd.binary_dilation(layers['crown']['mask'], iterations=2)
        hair = (crop[..., :3].max(-1) < 80) & (a > 200)
        hairfill = nd.binary_closing(hair, structure=np.ones((3, 3)), iterations=12) & cm
        hcrop[cm, 3] = 0
        hcrop[hairfill, :3] = (30, 30, 30); hcrop[hairfill, 3] = 255
        body_alpha[cm] = 0
        body_alpha[hairfill & band] = 0
    # stray specks (edges of parts that poked outside their polygon) belong to the nearest part
    bl, bn = nd.label(body_alpha > 20)
    if bn:
        bs = nd.sum(np.ones_like(bl), bl, range(1, bn + 1))
        specks = np.isin(bl, [i + 1 for i, v in enumerate(bs) if v < 220])
        for L in layers.values():
            grab = specks & nd.binary_dilation(L['core'], iterations=14)
            L['mask'] = L['mask'] | grab
            specks &= ~grab
        grab = specks & nd.binary_dilation(head, iterations=14)
        head = head | grab
        body_alpha[grab | (np.isin(bl, [i + 1 for i, v in enumerate(bs) if v < 220]))] = 0
    hl = hcrop.copy(); hl[..., 3] = (hcrop[..., 3].astype(float) * head).astype(np.uint8)
    emit(body_alpha, 'body', True)
    parts = {}
    for pname, L in layers.items():
        emit(L['mask'], pname)
        parts[pname] = dict(pivot=L['pivot'])
    # eyes: round white blobs in the face with a dark pupil inside
    eyes = []
    holes = []
    region = head & (np.arange(h)[:, None] < cfg['neck'][1] - 40)
    rgb = crop[..., :3].astype(int)
    white = region & (rgb.min(-1) > 225) & ((rgb.max(-1) - rgb.min(-1)) < 22)
    wl, wn = nd.label(white)
    for i in range(1, wn + 1):
        ys, xs = np.nonzero(wl == i)
        if len(ys) < 120: continue
        bx0, bx1, by0, by1 = xs.min(), xs.max(), ys.min(), ys.max()
        ew, eh = bx1 - bx0 + 1, by1 - by0 + 1
        if not (0.7 < ew / eh < 1.4) or ew > 48: continue
        sub = rgb[by0:by1 + 1, bx0:bx1 + 1]
        dark = sub.max(-1) < 70
        if dark.sum() < 30: continue
        py, px = np.nonzero(dark)
        pr = np.sqrt(dark.sum() / np.pi)
        pc = rgb[by0 + py, bx0 + px].mean(0)
        ecx, ecy, er = (bx0 + bx1) / 2, (by0 + by1) / 2, max(ew, eh) / 2
        yy2, xx2 = np.mgrid[0:h, 0:w]
        rr = np.sqrt((xx2 - ecx) ** 2 + (yy2 - ecy) ** 2)
        ringpx = rgb[(rr > er + 3) & (rr < er + 10) & head]
        orange = ringpx[(ringpx[:, 0] > 200) & (ringpx[:, 1] > 120) & (ringpx[:, 1] < 200) & (ringpx[:, 2] < 150)]
        sk = np.median(orange, axis=0) if len(orange) else np.array([250, 170, 115])
        # punch the eye out of the head layer (white + pupil, not the glasses frame over it):
        # the live eye is drawn underneath, so the original glasses stay on top
        sat = rgb.max(-1) - rgb.min(-1)
        hole = (rr < er + 0.5) & (sat < 30)
        hole = nd.binary_dilation(hole, iterations=1) & (rr < er + 1.5) & (sat < 45)
        holes.append(hole)
        eyes.append(dict(cx=float((bx0 + bx1) / 2), cy=float((by0 + by1) / 2), r=float(max(ew, eh) / 2),
                         px=float(bx0 + px.mean()), py=float(by0 + py.mean()), pr=float(pr),
                         pupil='#%02x%02x%02x' % tuple(int(v) for v in pc), skin='#%02x%02x%02x' % tuple(int(v) for v in sk)))
    if len(eyes) >= 2:
        for hole in holes: hl[hole, 3] = 0
    save(hl, f'{OUT}/{name}-head.png')
    eyes.sort(key=lambda e: e['cx'])
    ys_, xs_ = np.nonzero(body_alpha > 128)
    fy = int(ys_.max()); low = ys_ > fy - 22
    meta[name] = dict(foot=(float(xs_[low].mean()), fy), w=w, h=h, neck=cfg['neck'], headBehind=cfg.get('head_behind', False), parts=parts, eyes=eyes[:2] if len(eyes) >= 2 else [])
    print(name, w, h, 'eyes', [(round(e['cx']), round(e['cy']), round(e['r'])) for e in eyes])
json.dump(meta, open(f'{OUT}/layers.json', 'w'), indent=1)
