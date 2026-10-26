# Cut the flat character into rig layers. All layers keep the source's 1156x928 frame, so pivots are source pixels.
import json, numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as nd
import sys
SRC, OUT = sys.argv[1], sys.argv[2]
im = np.asarray(Image.open(SRC).convert('RGB')).astype(int)[:928]
H, W, _ = im.shape
r, g, b = im[..., 0], im[..., 1], im[..., 2]
mx, mn = im.max(2), im.min(2)
sat = (mx - mn) / np.maximum(mx, 1)
yy, xx = np.mgrid[0:H, 0:W]
BG = np.array([251, 237, 224])

# background: flood fill from the border with a tolerance
cand = np.abs(im - BG).max(2) <= 14
lab, _ = nd.label(cand)
border = set(np.unique(np.r_[lab[0], lab[-1], lab[:, 0], lab[:, -1]])) - {0}
bg = np.isin(lab, list(border))
fg = ~bg & (yy > 9) & (xx > 3) & (xx < W - 4)   # the screenshot's border line is not him
# the floor shadow: light neutral grey pill under the feet
shadow = fg & (yy > 890) & (sat < 0.06) & (mx > 190)
fg_body = fg & ~shadow

def box(x0, y0, x1, y1): return (xx >= x0) & (xx < x1) & (yy >= y0) & (yy < y1)
def grow(m, n): return nd.binary_dilation(m, iterations=n)
def biggest(m):
    l, n = nd.label(m)
    if n == 0: return m
    s = nd.sum(m, l, range(1, n + 1)); return l == (np.argmax(s) + 1)
def fill_from_ring(img, m, ring=4):
    """Fill masked pixels with the median colour of the ring just outside them."""
    rr = grow(m, ring) & ~m
    img[m] = np.median(img[rr], axis=0).astype(int)
    return img

info = {}
base = im.copy()

# ---- eyes: the white blobs, with the pupils inside filled in
eyes = []
for name, bx in [('L', (500, 280, 600, 365)), ('R', (608, 292, 705, 380))]:
    white = box(*bx) & (mn > 225)
    e = biggest(nd.binary_opening(white, iterations=1))
    # the pupil touches the lid, so close the white into its convex hull
    from scipy.spatial import ConvexHull
    from PIL import ImageDraw
    pts = np.c_[np.nonzero(e)[1], np.nonzero(e)[0]]
    hull = pts[ConvexHull(pts).vertices]
    hm = Image.new('L', (W, H), 0); ImageDraw.Draw(hm).polygon([tuple(map(int, q)) for q in hull], fill=255)
    hullm = np.asarray(hm) > 0
    dark = box(*bx) & (mx < 110) & grow(hullm, 26) & (yy > hull[:, 1].min() - 8) & (yy < hull[:, 1].max() + 2)
    e = nd.binary_fill_holes(nd.binary_closing(hullm | dark, iterations=2))
    pupil = biggest(e & (mx < 95))
    py, px = np.nonzero(pupil); ey, ex = np.nonzero(e)
    pr = np.sqrt(pupil.sum() / np.pi)
    lidc = np.median(im[grow(e, 3) & ~grow(e, 1) & (yy < ey.min() + (ey.max() - ey.min()) * 0.35) & (sat > 0.15)], axis=0)
    cheekc = np.median(im[grow(e, 4) & ~grow(e, 2) & (yy > ey.max() - 2) & (sat > 0.15)], axis=0)
    eyes.append(dict(name=name, x0=int(ex.min()), y0=int(ey.min()), x1=int(ex.max()) + 1, y1=int(ey.max()) + 1,
                     px=float(px.mean()), py=float(py.mean()), pr=float(pr), lid=lidc.astype(int).tolist(), cheek=cheekc.astype(int).tolist(),
                     white=np.median(im[e & (mn > 225)], axis=0).astype(int).tolist()))
    m = np.zeros((H, W, 4), np.uint8); m[e] = [255, 255, 255, 255]
    Image.fromarray(m).save(f'{OUT}/eye{name}.png')
    base[e] = eyes[-1]['white']                       # pupils are redrawn live
info['eyes'] = eyes

# ---- mouth: everything red or teeth-white inside the goatee
mb = box(548, 382, 640, 448)
mouth = mb & ((((r - g) > 40) & (r > 60) & (sat > 0.5)) | (mn > 200))
mouth = nd.binary_fill_holes(nd.binary_closing(nd.binary_opening(mouth, iterations=1), iterations=3))
my, mxs = np.nonzero(mouth)
skin_ring = grow(mouth, 6) & ~grow(mouth, 2) & (sat > 0.25) & (mx > 170)
skin = np.median(im[skin_ring], axis=0).astype(int)
fillm = grow(mouth, 3) & mb & ~((sat < 0.4) & (mx < 170))
base[fillm] = skin
info['mouth'] = dict(x0=int(mxs.min()), x1=int(mxs.max()) + 1, top=int(my.min()), bottom=int(my.max()) + 1, skin=skin.tolist())

# ---- eyebrows: dark bars above the glasses, moved live
brows = []
for name, bx in [('L', (508, 234, 598, 274)), ('R', (612, 246, 696, 288))]:
    m = biggest(box(*bx) & (mx < 100))
    m = nd.binary_closing(m, iterations=2)
    bm = grow(m, 1)
    lay = np.zeros((H, W, 4), np.uint8); lay[bm, :3] = im[bm]; lay[bm, 3] = 255
    a = Image.fromarray(lay); a.save(f'{OUT}/brow{name}.png')
    fh = box(int(bx[0]) + 10, int(bx[1]) - 12, int(bx[2]) - 10, int(bx[1]) - 2) & (sat > 0.33) & (mx > 200)
    base[grow(bm, 3)] = np.median(im[fh], axis=0).astype(int)
    ys, xs = np.nonzero(bm)
    brows.append(dict(name=name, cx=float(xs.mean()), cy=float(ys.mean())))
info['brows'] = brows

# ---- book: wipe "EGYPT عربي", the new title is drawn live
bb = box(640, 580, 770, 668)
purple = bb & ((b - g) > 60)
txt = bb & (mn > 170) & grow(purple, 6)
txt = grow(txt, 2) & ~(mn > 170) | txt
cover = nd.binary_fill_holes(nd.binary_closing(purple, iterations=8))
txt = grow(txt, 1) & bb & cover
base[txt] = np.median(im[purple & ~grow(txt, 2)], axis=0).astype(int)
info['book'] = dict(cx=705, cy=623, purple=np.median(im[purple], axis=0).astype(int).tolist())

# ---- head: hair, face, ears, beard. Pivot under the chin.
head = fg_body & (yy <= 468) & (xx >= 440)
beard_low = fg_body & box(505, 468, 705, 505) & (sat < 0.22) & (mn < 200)
head = head | beard_low
head = nd.binary_fill_holes(head) & fg_body
info['head'] = dict(px=603, py=488)

# ---- arm with the pointer: the forearm, hand and stick hinge at the elbow, the sleeve at the shoulder
forearm = fg_body & (xx < 448) & (yy < 590) & ~(mn > 205)
forearm = biggest(nd.binary_opening(forearm, iterations=1)) | (fg_body & (yy < 470) & (xx < 400))
sleeve = fg_body & ~forearm & (xx < 494) & (yy > 470) & (yy < 650)
info['forearm'] = dict(px=404, py=582)
info['upperarm'] = dict(px=492, py=545)

def layer(mask, img=base):
    a = np.zeros((H, W, 4), np.uint8); a[mask, :3] = img[mask]; a[mask, 3] = 255
    return Image.fromarray(a).filter(ImageFilter.SMOOTH_MORE) if False else Image.fromarray(a)

layer(head).save(f'{OUT}/head.png')
layer(forearm).save(f'{OUT}/forearm.png')
layer(sleeve).save(f'{OUT}/upperarm.png')
# body: everything else; under the beard the collar shows, so the cut is filled with shirt white
body = fg_body & ~head & ~forearm & ~sleeve
under = head & (yy > 455) & (xx > 535) & (xx < 675)
bimg = base.copy(); bimg[under] = [244, 243, 241]
body_m = body | under
# keep a sliver of the sleeve on the body so a rotated arm never opens a gap at the shoulder
body_m |= sleeve & (xx > 478)
layer(body_m, bimg).save(f'{OUT}/body.png')
layer(shadow, im).save(f'{OUT}/shadow.png')
info['size'] = [W, H]
info['skin'] = skin.tolist()
json.dump(info, open(f'{OUT}/rig.json', 'w'), indent=1)
# debug: tint each layer
dbg = im.copy().astype(float)
for m, c in [(head, (255, 0, 0)), (forearm, (0, 160, 255)), (sleeve, (0, 255, 0)), (shadow, (255, 0, 255))]:
    dbg[m] = dbg[m] * 0.55 + np.array(c) * 0.45
for e in eyes: dbg[int(e['py']), int(e['px'])] = (0, 255, 0)
Image.fromarray(dbg.astype(np.uint8)).save(f'{OUT}/debug.png')
Image.fromarray(base.astype(np.uint8)).save(f'{OUT}/base_clean.png')
print(json.dumps(info))
