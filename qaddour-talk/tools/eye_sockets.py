# The whole eye socket: the white plus the heavy brown lid above it, so lids can open wider than drawn.
import numpy as np, json
from PIL import Image, ImageDraw
from scipy import ndimage as nd
from scipy.spatial import ConvexHull
im = np.asarray(Image.open('/root/.claude/uploads/60802e58-4166-5944-8da6-da8c884a8049/7589a367-image.jpg').convert('RGB')).astype(int)[:928]
H, W, _ = im.shape
mx, mn = im.max(2), im.min(2); sat = (mx - mn) / np.maximum(mx, 1)
yy, xx = np.mgrid[0:H, 0:W]
rig = json.load(open('layers/rig.json'))
out = {}
dbg = im.copy().astype(float)
for e in rig['eyes']:
    white = np.asarray(Image.open(f"layers/eye{e['name']}.png"))[..., 3] > 0
    x0, y0, x1, y1 = e['x0'], e['y0'], e['x1'], e['y1']
    box = (xx >= x0 - 6) & (xx < x1 + 6) & (yy >= y0 - 30) & (yy < y1)
    lid = box & (sat > 0.25) & (mx < 215) & (mx > 120) & ~white
    lid = nd.binary_opening(lid, iterations=1)
    l, n = nd.label(lid | white); keep = l == l[int(e['py']), int(e['px'])]
    pts = np.c_[np.nonzero(keep)[1], np.nonzero(keep)[0]]
    hull = pts[ConvexHull(pts).vertices]
    m = Image.new('L', (W, H), 0); ImageDraw.Draw(m).polygon([tuple(map(int, q)) for q in hull], fill=255)
    sock = np.asarray(m) > 0
    # the drawn lid edge: top of the white in each column, fitted with a line
    cols = range(x0 + 4, x1 - 4); tops = []
    for x in cols:
        ys = np.nonzero(white[:, x])[0]
        if len(ys): tops.append((x, ys.min()))
    tx, ty = np.array(tops).T
    b, a = np.polyfit(tx, ty, 1)
    ys, xs = np.nonzero(sock)
    out[e['name']] = dict(sx0=int(xs.min()), sy0=int(ys.min()), sx1=int(xs.max()) + 1, sy1=int(ys.max()) + 1, edgeA=float(a), edgeB=float(b))
    s = np.zeros((H, W, 4), np.uint8); s[sock] = 255
    Image.fromarray(s).save(f"layers/sock{e['name']}.png")
    g = nd.binary_dilation(sock, iterations=2); s = np.zeros((H, W, 4), np.uint8); s[g] = 255
    Image.fromarray(s).save(f"layers/sock{e['name']}g.png")
    dbg[sock & ~white] = dbg[sock & ~white] * 0.4 + np.array([0, 255, 0]) * 0.6
json.dump(out, open('layers/sockets.json', 'w'), indent=1)
Image.fromarray(dbg.astype(np.uint8)).crop((490, 260, 710, 390)).resize((880, 520)).save('layers/sock_dbg.png')
print(out)
