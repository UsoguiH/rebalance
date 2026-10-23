"""Build the slaace-style font: every lowercase letter, the digits and common
punctuation, written to font.data.js.

s, l, a, c and e are the letterforms traced from the original logo and are kept
exactly. Every other glyph is put together from the same parts: the squircle
bowls and counters measured on c and e, 33-unit stems, 24-unit horizontal
strokes, the leaf top and flared foot of the l, the arch and spur of the a and
the spur tail of the s. Shapes are combined with shapely, then fitted with
smooth cubic Beziers that keep the spur tips and slit points sharp.

Units: the x-height is 106, the baseline is y = 0 and y grows downward (SVG).

    python3 font/build_font.py ../motion.data.js ../font.data.js
"""
import json, os, subprocess, sys
import numpy as np
from shapely import affinity
from shapely.geometry import Polygon, MultiPolygon, box
from shapely.ops import unary_union

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'tools'))
from geom import parse_path, rings_to_shape, superellipse
from bezier_fit import fit_closed

XH, ASC, DESC, FIG = 106, 138, 44, 134   # x-height, ascender, descender, figure height
ST, HT = 33, 25                          # stem width, horizontal stroke
N = 2.6                                  # squircle exponent of the bowls


# ---------------------------------------------------------------- primitives
def sq(cx, cy, rx, ry, n=N, steps=360):
    return Polygon(superellipse(cx, cy, rx, ry, n, steps))


def rrect(x0, y0, x1, y1, r=3.0):
    """Rectangle with slightly softened corners, like the traced stems."""
    b = box(x0, y0, x1, y1)
    return b.buffer(-r, join_style=1).buffer(r, join_style=1) if r > 0 else b


def P(*pts):
    return Polygon(pts).buffer(0)


def bez(p0, p1, p2, t):
    t = t[:, None]
    return (1 - t) ** 2 * np.array(p0) + 2 * (1 - t) * t * np.array(p1) + t ** 2 * np.array(p2)


def horn(p0, p1, p2, w0, power=0.85, side=0.0):
    """A tapering spur: a stroke along the quadratic curve p0-p1-p2 whose width
    falls from w0 at p0 to a point at p2. side shifts the stroke to one side of
    the curve (-1 left edge on the curve, +1 right edge on the curve)."""
    t = np.linspace(0, 1, 60)
    c = bez(p0, p1, p2, t)
    d = np.gradient(c, axis=0)
    nrm = np.stack([-d[:, 1], d[:, 0]], 1)
    nrm /= np.linalg.norm(nrm, axis=1)[:, None] + 1e-9
    w = w0 * (1 - t) ** power / 2
    left = c + nrm * (w * (1 + side))[:, None]
    right = c - nrm * (w * (1 - side))[:, None]
    return Polygon(np.r_[left, right[::-1]]).buffer(0)


def stroke(pts, w):
    """Straight segments of width w with flat ends (for diagonals)."""
    from shapely.geometry import LineString
    return LineString(pts).buffer(w / 2, cap_style=2, join_style=2, mitre_limit=3)


def move(g, dx=0, dy=0): return affinity.translate(g, dx, dy)
def mirror(g, cx): return affinity.scale(g, -1, 1, origin=(cx, 0))
def vflip(g, cy): return affinity.scale(g, 1, -1, origin=(0, cy))
def rot180(g, cx, cy): return affinity.rotate(g, 180, origin=(cx, cy))
def sx(g, f, ox=0): return affinity.scale(g, f, 1, origin=(ox, 0))
def sy(g, f, oy=0): return affinity.scale(g, 1, f, origin=(0, oy))
def clip(g, x0, y0, x1, y1): return g.intersection(box(x0, y0, x1, y1))
def U(*gs): return unary_union([g for g in gs if g is not None and not g.is_empty])
def width(g): return g.bounds[2] - g.bounds[0]


def normalize(g):
    """Shift so the ink starts at x = 0."""
    return move(g, -g.bounds[0])


# ------------------------------------------------------------ original parts
def load_originals(motion_js):
    js = ("global.window={};require(%r);"
          "console.log(JSON.stringify(window.SLAACE_MOTION.glyphs))") % os.path.abspath(motion_js)
    G = json.loads(subprocess.check_output(['node', '-e', js]))
    return G, {k: rings_to_shape(parse_path(v['d'], 16)).buffer(0) for k, v in G['letters'].items()}


# ------------------------------------------------------------------- glyphs
def build(O):
    s, l, a, c, e = (O[k] for k in 'slace')
    g = {}

    # Shared parts.
    def bowl(x0=0, w=103, cy=-53, ry=53, cw=32, ct=26):
        """o-shaped bowl: outer squircle minus counter (stroke cw at the sides,
        ct at top and bottom)."""
        cx = x0 + w / 2
        return sq(cx, cy, w / 2, ry).difference(sq(cx, cy - 0.5, w / 2 - cw, ry - ct, 2.4))

    def counter(x0=0, w=103, cy=-53, ry=53, cw=32, ct=26):
        cx = x0 + w / 2
        return sq(cx, cy - 0.5, w / 2 - cw, ry - ct, 2.4)

    def outer(x0=0, w=103, cy=-53, ry=53):
        return sq(x0 + w / 2, cy, w / 2, ry)

    def arch(x0, w=97, top=-XH, bottom=0, cw=ST, ct=28, notch=False):
        """n-shaped arch: two stems joined by a squircle top. The counter is
        rounded at the top right and runs to a point into the left stem, as the
        counters of the traced letters do."""
        cx = x0 + w / 2
        h = bottom - top
        body = U(clip(sq(cx, top + h / 2, w / 2, h / 2, 2.9), x0, top, x0 + w, top + h / 2),
                 rrect(x0, top + h / 2 - 1, x0 + w, bottom, 2.5))
        ix0, ix1 = x0 + cw, x0 + w - cw
        icx, irx = (ix0 + ix1) / 2, (ix1 - ix0) / 2
        iry = 30
        icy = top + ct + iry
        hole = U(clip(sq(icx, icy, irx, iry, 2.4), ix0, top, ix1, icy), box(ix0, icy - 0.5, ix1, bottom + 5))
        if notch:
            hole = U(hole, horn((ix0 + 4, icy + 4), (ix0 - 1, icy - 10), (ix0 - 2, top + ct - 2), 12, side=-0.6))
        return body.difference(hole)

    l_top = clip(l, -5, -ASC - 5, 60, -XH + 8)          # leaf
    l_stem = clip(l, -5, -XH + 6, 60, 5)                 # stem with flared foot
    s_tail = clip(s, -5, -44, 110, 5)                    # bottom stroke, spur at the left
    a_arch = clip(a, -5, -XH - 5, 63, -54)               # top stroke, spur at the left

    # Originals.
    g.update(s=s, l=l, a=a, c=c, e=e)

    # o: the c's bowl closed.
    g['o'] = bowl()

    # n, m, h, u: two stems joined by a squircle arch.
    g['n'] = arch(0, 101)
    g['m'] = U(arch(0, 95), arch(95 - ST, 95))
    g['h'] = U(l, arch(19, 101))
    g['u'] = rot180(arch(0, 101), 50.5, -XH / 2)

    # r: a stem with the c's upper terminal, which ends in a spur pointing down.
    g['r'] = U(rrect(0, -XH + 4, ST, 0, 2.5), clip(move(c, -9), 16, -XH - 2, 110, -63),
               clip(sq(ST, -XH + 32, ST, 32, 2.9), 0, -XH, ST, -XH + 32))

    # b, d, p, q: the o bowl joined to a stem.
    def bowl_on(stem_x0, x0=0, w=100):
        return U(outer(x0, w), rrect(stem_x0, -XH + 20, stem_x0 + ST, 0, 2.5)).difference(counter(x0, w, cw=33))
    g['d'] = U(bowl_on(100 - ST), move(l, 100 - 51))
    g['b'] = U(bowl_on(19, 19, 100), l)
    g['q'] = U(bowl_on(100 - ST), rrect(100 - ST, -60, 100, DESC, 2.5))
    g['p'] = mirror(g['q'], 50)

    # g, y: a bowl lifted off the baseline, a stem, and the s's spur tail
    # hanging below the baseline.
    lift = lambda geom: sy(geom, 0.9, -XH)
    tail = sy(s_tail, 0.8, 0)
    hang = lambda f=1.0: move(sx(tail, f, 0), 0, DESC + 4).difference(box(-50, -60, 200, DESC - 30))
    g['g'] = U(lift(bowl_on(100 - ST)), rrect(100 - ST, -60, 100, DESC - 8, 0), hang(0.97))
    g['y'] = U(lift(clip(g['u'], -1, -XH - 2, 101 - ST + 1, 1)), rrect(101 - ST, -XH, 101, DESC - 8, 0), hang(0.98))

    # i, j: the l's stem and foot, with a squircle dot.
    stem_i = move(l_stem, -19)
    dot = lambda cx: sq(cx, -ASC + 15, 17.5, 16, 2.4)
    g['i'] = U(clip(stem_i, -5, -XH, 60, 5), dot(16.5))
    jt = move(sx(sy(s_tail, 0.8, 0), 0.62, 0), 0, DESC + 4).difference(box(-50, -60, 200, DESC - 30))
    jx = width(jt) - ST
    g['j'] = U(rrect(jx, -XH, jx + ST, DESC - 8, 0), jt, dot(jx + 16.5))

    # t: a shorter l with a crossbar; f: the l mirrored, with a crossbar.
    t_body = sy(l, (ASC - 12) / ASC, 0)
    g['t'] = U(t_body, rrect(6, -XH, 86, -XH + HT - 1, 4))
    f_body = mirror(l, 27.85)
    fx = f_body.bounds[0]
    g['f'] = U(move(f_body, 14 - fx), rrect(0, -XH, 82, -XH + HT - 1, 4))

    # k: the l with an arm and a leg.
    arm = P((48, -46), (84, -XH), (120, -XH), (48, -10))
    leg = P((64, -58), (90, -72), (122, 0), (84, 0))
    g['k'] = U(l, arm, leg)

    # v, w, x, z: straight diagonals with pointed counters.
    g['v'] = P((0, -XH), (35, -XH), (52, -36), (69, -XH), (104, -XH), (71, 0), (33, 0)).buffer(-1.5).buffer(1.5)
    g['w'] = P((0, -XH), (33, -XH), (48, -38), (63, -XH), (95, -XH), (110, -38), (125, -XH), (158, -XH),
               (126, 0), (95, 0), (79, -60), (63, 0), (32, 0)).buffer(-1.5).buffer(1.5)
    g['x'] = U(P((0, -XH), (37, -XH), (104, 0), (67, 0)), P((67, -XH), (104, -XH), (37, 0), (0, 0))).buffer(-1.5).buffer(1.5)
    g['z'] = U(rrect(2, -XH, 98, -XH + HT, 3), rrect(0, -HT, 100, 0, 3),
               P((60, -XH + HT - 2), (98, -XH + HT - 2), (40, -HT + 2), (2, -HT + 2)))

    # ------------------------------------------------------------- figures
    rise = FIG - XH
    a_spur = U(clip(a, -5, -XH - 5, 50, -64), clip(a, -5, -70, 12, -54))   # the a's arch and spur
    g['0'] = bowl(0, 100, -FIG / 2, FIG / 2, 32, 26)
    g['1'] = U(clip(l, -5, -ASC - 5, 60, -40), rrect(19, -60, 51, 0, 2.5))
    two_top = U(clip(bowl(0, 100, -FIG + 46, 46, 32, 27), 46, -FIG - 1, 101, -FIG + 46),
                move(sy(a_spur, 0.8, -XH), 0, -rise))
    g['2'] = U(two_top, P((67, -FIG + 44), (100, -FIG + 46), (38, -HT + 1), (2, -HT + 1)),
               rrect(0, -HT, 102, 0, 3))
    g['3'] = U(clip(bowl(4, 94, -FIG + 33, 33, 31, 22), 46, -FIG - 1, 101, -FIG + 70),
               move(sy(a_spur, 0.78, -XH), 4, -rise),
               clip(bowl(0, 102, -38, 38, 33, 24), 46, -80, 103, 1),
               clip(sy(s_tail, 0.9, 0), -2, -60, 52, 1))
    five = clip(bowl(0, 100, -44, 44, 33, 25), 12, -90, 103, 1).difference(box(0, -62, 46, 2))
    g['5'] = U(rrect(12, -FIG, 98, -FIG + HT, 3), rrect(12, -FIG, 12 + ST, -66, 2.5), five,
               clip(s_tail, -2, -60, 52, 1))
    g['9'] = U(bowl(0, 100, -FIG + 42, 42, 32, 25), rrect(100 - ST, -FIG + 42, 100, -30, 0),
               clip(bowl(0, 100, -40, 40, 33, 24), 50, -50, 103, 1),
               clip(sy(s_tail, 0.8, 0), -2, -60, 52, 1))
    g['6'] = rot180(g['9'], 50, -FIG / 2)
    g['4'] = U(P((0, -46), (60, -FIG), (66, -FIG + 30), (34, -48)).buffer(0),
               rrect(0, -48, 104, -24, 2.5), rrect(60, -FIG, 93, 0, 2.5))
    g['7'] = U(rrect(0, -FIG, 102, -FIG + HT, 3), P((66, -FIG + 4), (102, -FIG + 4), (54, 0), (18, 0)))
    g['8'] = U(bowl(4, 92, -FIG + 34, 34, 30, 22), bowl(0, 100, -40, 40, 32, 24))

    # ---------------------------------------------------------- punctuation
    pdot = lambda cx, cy=-16: sq(cx, cy, 17, 16, 2.4)
    g['.'] = pdot(17)
    g[','] = U(pdot(17), horn((28, -6), (26, 14), (6, 26), 18, side=0.3))
    g[':'] = U(pdot(17), pdot(17, -XH + 16))
    g[';'] = U(g[','], pdot(17, -XH + 16))
    g['!'] = U(stem_taper(-FIG, -38), pdot(17))
    g['?'] = U(two_top, P((66, -FIG + 44), (100, -FIG + 46), (64, -40), (32, -40)), move(pdot(17), 31))
    g['-'] = rrect(0, -58, 62, -34, 4)
    g["'"] = U(clip(l, -5, -ASC - 5, 60, -92), rrect(19, -100, 51, -88, 0))
    return g


def stem_taper(top, bottom):
    return P((0, top), (ST + 1, top), (ST - 6, bottom), (7, bottom)).buffer(-2).buffer(2)


# --------------------------------------------------------------- output
def resample(ring, step=0.8):
    pts = np.asarray(ring.coords)
    seg = np.linalg.norm(np.diff(pts, axis=0), axis=1)
    s = np.r_[0, np.cumsum(seg)]
    t = np.arange(0, s[-1], step)
    return np.stack([np.interp(t, s, pts[:, 0]), np.interp(t, s, pts[:, 1])], 1)


def to_path(geom):
    polys = list(geom.geoms) if isinstance(geom, MultiPolygon) else [geom]
    out = []
    for p in polys:
        if p.area < 4:
            continue
        for ring in [p.exterior, *p.interiors]:
            segs = fit_closed(resample(ring), err=0.3, smooth=1.2, corner_k=3, corner_angle=40)
            if not segs:
                continue
            x, y = segs[0][0]
            d = [f'M{x:.1f} {y:.1f}c']
            for b in segs:
                d.append(' '.join(f'{v:.1f}' for v in (b[1:] - b[0]).ravel()))
            d[-1] += 'z'
            out.append(d[0] + ' '.join(d[1:]))
    return ''.join(out).replace(' -', '-')


def profiles(geom, y0=-ASC - 8, y1=DESC + 8, step=4):
    """Left and right ink edges per horizontal band, for automatic spacing."""
    L, R = [], []
    for y in np.arange(y0, y1, step):
        band = geom.intersection(box(-500, y, 500, y + step))
        if band.is_empty or band.area < 1:
            L.append(None); R.append(None)
        else:
            b = band.bounds
            L.append(round(b[0], 1)); R.append(round(b[2], 1))
    return L, R


def main(motion_js, out_js):
    G, O = load_originals(motion_js)
    glyphs = build(O)
    data = {}
    for ch, geom in glyphs.items():
        if ch in G['letters']:
            v = G['letters'][ch]
            d, geom_n = v['d'], geom
        else:
            geom_n = normalize(geom.buffer(0))
            d = to_path(geom_n)
        x0, y0, x1, y1 = geom_n.bounds
        L, R = profiles(geom_n)
        data[ch] = {'d': d, 'w': round(x1, 1), 't': round(y0, 1), 'b': round(y1, 1), 'pl': L, 'pr': R}
    meta = {'xh': XH, 'asc': ASC, 'desc': DESC, 'fig': FIG, 'band': [-ASC - 8, 4], 'glyphs': data}
    with open(out_js, 'w') as f:
        f.write('/* Slaace-style font: s, l, a, c, e traced from the original logo; the other\n'
                '   glyphs built from their parts by font/build_font.py. x-height 106, baseline 0,\n'
                '   y down. pl/pr: left and right ink edges per 4-unit band, for spacing. */\n')
        f.write('window.SLAACE_FONT = ' + json.dumps(meta, separators=(',', ':')) + ';\n')
    print(len(data), 'glyphs ->', out_js)


if __name__ == '__main__':
    main(*sys.argv[1:3])
