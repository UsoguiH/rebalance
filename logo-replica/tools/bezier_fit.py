"""
Fit smooth cubic Bezier curves to a traced contour, keeping real corners sharp.

Corners are found from the turning angle; between corners the points are
lightly smoothed and fitted with Philip Schneider's algorithm ("An Algorithm
for Automatically Fitting Digitized Curves", Graphics Gems, 1990).
"""
import numpy as np
from scipy import ndimage


def _bez(ctrl, t):
    t = t[:, None]
    mt = 1 - t
    return (mt ** 3) * ctrl[0] + 3 * (mt ** 2) * t * ctrl[1] + 3 * mt * (t ** 2) * ctrl[2] + (t ** 3) * ctrl[3]


def _bez_d1(ctrl, t):
    t = t[:, None]
    mt = 1 - t
    return 3 * (mt ** 2) * (ctrl[1] - ctrl[0]) + 6 * mt * t * (ctrl[2] - ctrl[1]) + 3 * (t ** 2) * (ctrl[3] - ctrl[2])


def _bez_d2(ctrl, t):
    t = t[:, None]
    return 6 * (1 - t) * (ctrl[2] - 2 * ctrl[1] + ctrl[0]) + 6 * t * (ctrl[3] - 2 * ctrl[2] + ctrl[1])


def _unit(v):
    n = np.linalg.norm(v)
    return v / n if n > 1e-9 else v


def _chord_params(pts):
    d = np.r_[0, np.cumsum(np.linalg.norm(np.diff(pts, axis=0), axis=1))]
    return d / d[-1] if d[-1] > 0 else np.linspace(0, 1, len(pts))


def _generate(pts, u, t1, t2):
    p0, p3 = pts[0], pts[-1]
    a1 = t1[None, :] * (3 * (1 - u) ** 2 * u)[:, None]
    a2 = t2[None, :] * (3 * (1 - u) * u ** 2)[:, None]
    c = np.array([[np.sum(a1 * a1), np.sum(a1 * a2)], [np.sum(a1 * a2), np.sum(a2 * a2)]])
    base = _bez(np.array([p0, p0, p3, p3]), u)
    tmp = pts - base
    x = np.array([np.sum(a1 * tmp), np.sum(a2 * tmp)])
    det = c[0, 0] * c[1, 1] - c[0, 1] * c[1, 0]
    seg = np.linalg.norm(p3 - p0)
    if abs(det) > 1e-12:
        al = (x[0] * c[1, 1] - x[1] * c[0, 1]) / det
        ar = (c[0, 0] * x[1] - c[1, 0] * x[0]) / det
    else:
        al = ar = seg / 3
    if al < 1e-6 * seg or ar < 1e-6 * seg or al > seg * 2 or ar > seg * 2:
        al = ar = seg / 3
    return np.array([p0, p0 + t1 * al, p3 + t2 * ar, p3])


def _reparam(ctrl, pts, u):
    q = _bez(ctrl, u) - pts
    d1 = _bez_d1(ctrl, u)
    d2 = _bez_d2(ctrl, u)
    num = np.sum(q * d1, axis=1)
    den = np.sum(d1 * d1, axis=1) + np.sum(q * d2, axis=1)
    with np.errstate(divide='ignore', invalid='ignore'):
        nu = np.where(np.abs(den) > 1e-12, u - num / den, u)
    nu = np.clip(nu, 0, 1)
    return nu if np.all(np.diff(nu) >= 0) else u


def _fit(pts, t1, t2, err, out, depth=0):
    if len(pts) == 2:
        dist = np.linalg.norm(pts[1] - pts[0]) / 3
        out.append(np.array([pts[0], pts[0] + t1 * dist, pts[1] + t2 * dist, pts[1]]))
        return
    u = _chord_params(pts)
    ctrl = _generate(pts, u, t1, t2)
    dd = np.sum((_bez(ctrl, u) - pts) ** 2, axis=1)
    split = int(np.argmax(dd))
    if dd[split] < err * err:
        out.append(ctrl)
        return
    if dd[split] < (4 * err) ** 2:
        for _ in range(12):
            u = _reparam(ctrl, pts, u)
            ctrl = _generate(pts, u, t1, t2)
            dd = np.sum((_bez(ctrl, u) - pts) ** 2, axis=1)
            split = int(np.argmax(dd))
            if dd[split] < err * err:
                out.append(ctrl)
                return
    if depth > 24 or len(pts) < 4:
        out.append(ctrl)
        return
    split = min(max(split, 1), len(pts) - 2)
    tc = _unit(pts[split - 1] - pts[split + 1])
    _fit(pts[:split + 1], t1, tc, err, out, depth + 1)
    _fit(pts[split:], -tc, t2, err, out, depth + 1)


def _corners(pts, k, angle_deg):
    n = len(pts)
    idx = np.arange(n)
    a = pts[(idx - k) % n]
    b = pts[(idx + k) % n]
    v1 = pts - a
    v2 = b - pts
    cos = np.sum(v1 * v2, axis=1) / (np.linalg.norm(v1, axis=1) * np.linalg.norm(v2, axis=1) + 1e-9)
    ang = np.degrees(np.arccos(np.clip(cos, -1, 1)))
    cand = []
    for i in range(n):
        if ang[i] < angle_deg:
            continue
        win = [(i + j) % n for j in range(-k, k + 1)]
        if ang[i] >= max(ang[w] for w in win):
            if not cand or (i - cand[-1]) > k:
                cand.append(i)
    if len(cand) >= 2 and (cand[0] + n - cand[-1]) <= k:
        cand.pop()
    return cand


def fit_closed(pts, err=0.35, smooth=2.0, corner_k=3, corner_angle=48):
    """pts: (N, 2) closed contour (first point may repeat at the end).
    Returns a list of 4x2 control-point arrays forming a closed loop."""
    pts = np.asarray(pts, float)
    if np.allclose(pts[0], pts[-1]):
        pts = pts[:-1]
    n = len(pts)
    if n < 6:
        return []
    cs = _corners(pts, corner_k, corner_angle)
    if not cs:
        # no corner: smooth the whole loop and start anywhere
        sm = ndimage.gaussian_filter1d(pts, smooth, axis=0, mode='wrap')
        loop = np.vstack([sm, sm[:1]])
        t = _unit(sm[1] - sm[-1])
        out = []
        _fit(loop, t, -t, err, out)
        return out
    out = []
    for j, c0 in enumerate(cs):
        c1 = cs[(j + 1) % len(cs)]
        seg = pts[np.arange(c0, c0 + ((c1 - c0) % n or n) + 1) % n]
        if len(seg) > 4 and smooth > 0:
            inner = ndimage.gaussian_filter1d(seg, smooth, axis=0, mode='nearest')
            inner[0], inner[-1] = seg[0], seg[-1]
            seg = inner
        if len(seg) < 2:
            continue
        m = min(3, len(seg) - 1)
        t1 = _unit(seg[m] - seg[0])
        t2 = _unit(seg[-1 - m] - seg[-1])
        _fit(seg, t1, t2, err, out)
    return out
