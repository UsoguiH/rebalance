# Cut one pose from the character sheet into rig layers, from a spec of polygons (in crop pixels).
# python3 -I cut_pose.py SHEET SPEC.json OUTDIR
# Every layer keeps the upscaled crop's frame, so pivots are plain pixels in rig.json.
import json, sys, numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as nd
from scipy.spatial import ConvexHull
sheet, spec_path, out = sys.argv[1:4]
spec = json.load(open(spec_path))
K = spec.get('scale', 3)
crop = Image.open(sheet).convert('RGB').crop(tuple(spec['crop']))
big = crop.resize((crop.width * K, crop.height * K), Image.LANCZOS)
im = np.asarray(big).astype(int); H, W, _ = im.shape
mx, mn = im.max(2), im.min(2); sat = (mx - mn) / np.maximum(mx, 1)
yy, xx = np.mgrid[0:H, 0:W]
bgc = np.median(np.r_[im[:4].reshape(-1, 3), im[:, :4].reshape(-1, 3)], axis=0)
cand = np.abs(im - bgc).max(2) <= spec.get('bgTol', 16)
lab, _ = nd.label(cand)
border = set(np.unique(np.r_[lab[0], lab[-1], lab[:, 0], lab[:, -1]])) - {0}
sizes = nd.sum(cand, lab, range(1, lab.max() + 1))
enclosed = [i + 1 for i, v in enumerate(sizes) if v > 1500 * K * K / 9]   # background trapped between limbs and props
fg = ~np.isin(lab, list(border) + enclosed)
fg = nd.binary_opening(fg, iterations=1)
shadow = fg & (yy > spec['shadowY'] * K) & (sat < 0.12) & (mx > 170)
fg &= ~shadow
def poly(pts):
    m = Image.new('L', (W, H), 0); ImageDraw.Draw(m).polygon([(x * K, y * K) for x, y in pts], fill=255)
    return np.asarray(m) > 0
def grow(m, n): return nd.binary_dilation(m, iterations=n)
def fill_nearest(img, hole, avoid):
    """Fill a hole with a smooth blend of the good pixels around it (normalised Gaussian), so it continues
    the skin's gradient: no flat patch, no streaks. `avoid` pixels (frame, beard, hair) are never sources."""
    src = (~(hole | avoid)).astype(float)
    sig = 5 * K
    w = nd.gaussian_filter(src, sig)
    out = np.stack([nd.gaussian_filter(img[..., c] * src, sig) for c in range(3)], -1) / np.maximum(w, 1e-6)[..., None]
    img[hole] = np.clip(out[hole], 0, 255).astype(int)
def layer(m, img, clean=True):
    """A layer from a mask. Its edge pixels were blended with whatever was next to them in the drawing,
    which shows as a halo once the part moves; so the edge takes the colour of the layer's own inside and
    fades out with alpha instead."""
    a = np.zeros((H, W, 4), np.uint8)
    if not clean or m.sum() < 50:
        a[m, :3] = img[m]; a[m, 3] = 255; return Image.fromarray(a)
    inner = nd.binary_erosion(m, iterations=max(1, K - 1))
    if inner.sum() < 20: inner = m
    _, (iy, ix) = nd.distance_transform_edt(~inner, return_indices=True)
    col = img.copy(); edge = m & ~inner; col[edge] = img[iy[edge], ix[edge]]
    d = nd.distance_transform_edt(m)
    alpha = np.clip(d / (K * 0.9), 0, 1)
    a[m, :3] = col[m]; a[..., 3] = (alpha * 255 * m).astype(np.uint8)
    return Image.fromarray(a)
rig = {'size': [W, H], 'K': K, 'parts': {}, 'bg': bgc.astype(int).tolist()}
base = im.copy()
taken = np.zeros((H, W), bool)
masks = {}
for p in spec['parts']:                                   # in priority order: earlier parts win shared pixels
    m = fg & poly(p['poly']) & ~taken
    if p.get('keepColor') == 'dark':                     # a brow: the one dark bar in its box, nothing scattered
        m &= mx < 120
        l, n = nd.label(m)
        if n: m = l == (np.argmax(nd.sum(m, l, range(1, n + 1))) + 1)
        m = nd.binary_fill_holes(m)
    for bx in p.get('leaveDark', []):                     # dark pixels here (hair behind a prop) stay with the next part
        x0, y0, x1, y1 = [v * K for v in bx]
        m &= ~((xx >= x0) & (xx < x1) & (yy >= y0) & (yy < y1) & (mx < 95) & (sat < 0.4))
    if 'dropWhiteBelow' in p:                             # sleeve and collar white never travel with the head
        m &= ~((yy > p['dropWhiteBelow'] * K) & (mn > 200) & (sat < 0.1))
    masks[p['name']] = m; taken |= m
body = fg & ~taken
masks['body'] = body

# eyes: white blobs inside the head, pupils inside them; the whites are cleaned so pupils can be redrawn
eyes = []
for i, bx in enumerate(spec.get('eyes', [])):
    x0, y0, x1, y1 = [v * K for v in bx]
    box = (xx >= x0) & (xx < x1) & (yy >= y0) & (yy < y1)
    white = box & (mn > 222)
    l, n = nd.label(white); s = nd.sum(white, l, range(1, n + 1)); white = l == (np.argmax(s) + 1)
    pts = np.c_[np.nonzero(white)[1], np.nonzero(white)[0]]; hull = pts[ConvexHull(pts).vertices]
    hm = Image.new('L', (W, H), 0); ImageDraw.Draw(hm).polygon([tuple(map(int, q)) for q in hull], fill=255)
    e = nd.binary_fill_holes(np.asarray(hm) > 0)
    dark = e & (mx < 110); py, px = np.nonzero(dark)
    pr = np.sqrt(dark.sum() / np.pi)
    ring = grow(e, 6) & ~grow(e, 3) & (sat > 0.28) & (mx > 190)
    skin = np.median(im[ring], axis=0).astype(int).tolist() if ring.sum() > 20 else spec.get('skin', [238, 183, 140])
    wcol = np.median(im[e & (mn > 225)], axis=0).astype(int).tolist()
    ey, ex = np.nonzero(e)
    eyes.append(dict(x0=int(ex.min()), y0=int(ey.min()), x1=int(ex.max()) + 1, y1=int(ey.max()) + 1, px=float(px.mean()), py=float(py.mean()), pr=float(pr), skin=skin, white=wcol))
    base[e] = wcol
    for nm, g in (('', 0), ('g', 2)):
        mm = grow(e, g) if g else e
        a = np.zeros((H, W, 4), np.uint8); a[mm] = 255; Image.fromarray(a).save(f'{out}/eye{i}{nm}.png')
rig['eyes'] = eyes

# a mouth that can open and close: its own layer, cut from the head, the hole filled with skin
if 'mouth' in spec:
    x0, y0, x1, y1 = [v * K for v in spec['mouth']]
    box = (xx >= x0) & (xx < x1) & (yy >= y0) & (yy < y1)
    mm = box & ((((im[..., 0] - im[..., 1]) > 45) & (sat > 0.45)) | (mn > 215))
    mm = nd.binary_fill_holes(nd.binary_closing(nd.binary_opening(mm, iterations=1), iterations=3))
    mm = grow(mm, 2) & box & ~((sat < 0.35) & (mx < 150))
    layer(mm, im).save(f'{out}/mouth.png')
    ys, xs = np.nonzero(mm)
    rig['mouth'] = dict(cx=float(xs.mean()), top=int(ys.min()), bottom=int(ys.max()))
    fill_nearest(base, grow(mm, 3) & ~((sat < 0.35) & (mx < 150)), (sat < 0.3) | (mx < 150))      # continue the skin around it, not the beard

# a part cut out of its parent (a brow out of the head) leaves a hole there, filled with the skin around it
holes = {}
for p in spec['parts']:
    if 'holeIn' in p:
        m = masks[p['name']]; hole = grow(m, 4) & fg
        holes.setdefault(p['holeIn'], []).append(hole)
for p in spec['parts']:
    nm = p['name']; m = masks[nm].copy()
    img = base.copy()
    for hole in holes.get(nm, []):
        fill_nearest(img, hole, (sat < 0.38) | (mx < 190)); m |= hole   # bare skin only, not the glasses' frame
    layer(m, img).save(f'{out}/{nm}.png')
    rig['parts'][nm] = {k: [v[0] * K, v[1] * K] if k == 'pivot' else v for k, v in p.items() if k in ('pivot', 'parent')}
# the body keeps a sliver under each moving part so a turn never opens a gap
bimg = base.copy()
for p in spec['parts']:
    if 'under' in p:
        u = fg & poly(p['under']) & masks[p['name']]
        body |= u
        if 'underFill' in p: bimg[u] = p['underFill']
# behind every part that moves, the body continues with its own nearest colour for a band, so a turn
# reveals more vest or shirt instead of background or a seam
moving = np.zeros((H, W), bool)
for p in spec['parts']:
    if p.get('parent') == 'body': moving |= masks[p['name']]
dist, (iy, ix) = nd.distance_transform_edt(~body, return_indices=True)
band = moving & (dist <= spec.get('band', 12) * K) & ~body
bimg[band] = bimg[iy[band], ix[band]]
body = body | band
layer(body, bimg).save(f'{out}/body.png')
layer(shadow, im, clean=False).save(f'{out}/shadow.png')
ys, xs = np.nonzero(shadow)
rig['shadow'] = dict(cx=float(xs.mean()), cy=float(ys.mean())) if len(xs) else None
json.dump(rig, open(f'{out}/rig.json', 'w'), indent=1)
dbg = im.astype(float)
cols = [(255, 0, 0), (0, 160, 255), (0, 220, 0), (255, 0, 255), (255, 160, 0), (0, 255, 255)]
for i, p in enumerate(spec['parts']):
    m = masks[p['name']]; dbg[m] = dbg[m] * .5 + np.array(cols[i % 6]) * .5
for e in eyes: dbg[int(e['py']) - 2:int(e['py']) + 2, int(e['px']) - 2:int(e['px']) + 2] = (0, 255, 0)
Image.fromarray(dbg.astype(np.uint8)).save(f'{out}/debug.png')
print(json.dumps({k: rig[k] for k in ('eyes',)})[:400])
