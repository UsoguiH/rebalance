#!/usr/bin/env python3
"""
Trace a flat-colour logo animation (an MP4/WebM/GIF) into frame-exact vector
frames that play back as SVG.

Every pixel of a flat-colour motion graphic is the background plus some amount
of each ink colour, so each frame is split into one opacity map per ink by
least squares. Each map is cleaned, the opacity levels its shapes actually use
are found, and the shapes at each level are traced with sub-pixel marching
squares. Levels are stacked bottom to top so normal alpha compositing in the
browser rebuilds the frame:

    background -> ink 1 levels -> ink 2 levels -> ...

The last ink paints on top (for slaace: green below, cream above).

Usage:
    python3 trace_video.py slaace.mp4 out.js --name SLAACE \
        --bg 022713 --ink 18C76B --ink CDE4B1 --detail 916,307,933,324

Needs ffmpeg, numpy, scipy and scikit-image.
"""
import argparse
import json
import os
import subprocess
import tempfile

import numpy as np
from PIL import Image
from scipy import ndimage
from skimage import measure

from bezier_fit import fit_closed

UP = 2  # trace on a 2x upsampled map for smoother sub-pixel edges


def hex_rgb(h):
    h = h.lstrip('#')
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], float)


def extract(video, tmp):
    subprocess.run(['ffmpeg', '-v', 'error', '-i', video, os.path.join(tmp, '%04d.png')], check=True)
    names = sorted(n for n in os.listdir(tmp) if n.endswith('.png'))
    return [np.asarray(Image.open(os.path.join(tmp, n)).convert('RGB')).astype(float) for n in names]


def fps_of(video):
    out = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries',
                          'stream=r_frame_rate', '-of', 'csv=p=0', video], capture_output=True, text=True).stdout
    a, b = out.strip().split('/')
    return float(a) / float(b)


def decompose(img, bg, inks):
    """Linear opacities (one per ink) for every pixel, clamped to [0, 1]."""
    B = np.stack([c - bg for c in inks], 1)          # 3 x K
    P = np.linalg.pinv(B)                             # K x 3
    a = (img - bg) @ P.T                              # H x W x K
    return np.clip(a, 0, 1)


def painter(lin):
    """Convert linear opacities to the alpha each layer needs when painted in
    order (ink 0 first, last ink on top): a_k' = a_k / (1 - sum of inks above)."""
    out = np.zeros_like(lin)
    above = np.zeros(lin.shape[:2])
    for k in range(lin.shape[2] - 1, -1, -1):
        cover = 1 - above
        with np.errstate(divide='ignore', invalid='ignore'):
            out[..., k] = np.where(cover > 0.04, lin[..., k] / cover, 0)
        above = np.clip(above + lin[..., k], 0, 1)
    return np.clip(out, 0, 1)


def levels_in(alpha, bins=100, min_px=12, min_blob=20):
    """Opacity levels that shapes actually fill (their flat interiors, not their
    soft edges): peaks of the opacity histogram of flat pixels."""
    # interior = low local variation, at least two pixels in from any edge
    gy, gx = np.gradient(alpha)
    grad = ndimage.maximum_filter(np.hypot(gx, gy), size=5)
    flat = ndimage.binary_erosion((grad < 0.03) & (alpha > 0.06), iterations=1)
    vals = alpha[flat]
    if vals.size == 0:
        return []
    hist = np.bincount(np.minimum((vals * bins).astype(int), bins), minlength=bins + 1).astype(float)
    sm = ndimage.gaussian_filter1d(hist, 1.0)
    out = []
    for k in range(1, bins + 1):
        left = sm[k - 1]
        right = sm[k + 1] if k < bins else -1
        if sm[k] >= left and sm[k] > right and hist[max(0, k - 2):k + 3].sum() >= min_px:
            lo, hi = max(0, k - 2), min(bins, k + 2)
            w = hist[lo:hi + 1]
            centre = (np.arange(lo, hi + 1) + 0.5) / bins
            v = float((w * centre).sum() / w.sum())
            # a real shape at this opacity is a solid blob, not a scatter of edge pixels
            blob, n = ndimage.label(flat & (np.abs(alpha - v) < 0.035))
            need = min_blob * (3 if v < 0.15 else 1)   # faint levels are where codec noise lives
            if n and np.bincount(blob.ravel())[1:].max() >= need:
                out.append(v)
    out = sorted(set(round(v, 3) for v in out))
    if out and out[-1] > 0.93:
        out[-1] = 1.0
    return out


def path_d(contours, ox, oy, scale, err, pad):
    """Contours are in index space of the padded, upsampled map. With
    grid_mode zoom, index j sits at source pixel (j - pad + 0.5) / scale,
    measured from the crop's top-left pixel edge. Each loop is fitted with
    smooth cubic Beziers (corners kept) and written with relative commands."""
    parts = []
    for c in contours:
        if len(c) < 8:
            continue
        xy = np.stack([(c[:, 1] - pad + 0.5) / scale + ox, (c[:, 0] - pad + 0.5) / scale + oy], 1)
        segs = fit_closed(xy, err=err)
        if len(segs) < 2:
            continue
        x0, y0 = round(segs[0][0][0], 1), round(segs[0][0][1], 1)
        out = [f'M{x0:g} {y0:g}c']
        px, py = x0, y0
        for b in segs:
            q = [(round(v[0], 1), round(v[1], 1)) for v in b[1:]]
            out.append(' '.join(f'{round(x - px, 1):g} {round(y - py, 1):g}' for x, y in q) + ' ')
            px, py = q[-1]
        parts.append(''.join(out).rstrip() + 'z')
    return ''.join(parts).replace(' -', '-')


def trace_layer(alpha, box, tol, blur):
    """Trace one ink. Each separate shape gets its own opacity levels, so a
    solid shape is one outline even when a faded shape shares the frame."""
    y0, y1, x0, x1 = box
    a = alpha[y0:y1, x0:x1]
    big = ndimage.zoom(a, UP, order=3, grid_mode=True, mode='nearest')
    big = ndimage.gaussian_filter(big, blur * UP)
    big = np.pad(big, 2)
    shapes, _ = ndimage.label(ndimage.binary_dilation(a > 0.05, iterations=2))
    out = []
    for lab, sl in enumerate(ndimage.find_objects(shapes), start=1):
        if sl is None:
            continue
        mask = shapes == lab
        lv = levels_in(np.where(mask, ndimage.gaussian_filter(a, 0.7), 0))
        if lv:
            # a thin stroke joined to wider shapes has no interior of its own: if the
            # group's brightest core sits clearly above its top level, add that level
            vals = a[mask]
            top = np.percentile(vals, 97)
            if top > lv[-1] + 0.08:
                core = vals[vals > max(lv[-1] + 0.04, 0.75 * top)]
                if core.size >= 8:
                    v = float(np.median(core))
                    lv.append(1.0 if v > 0.93 else round(v, 3))
        if not lv:
            # thin shapes (the wave, slivers) have no wide interior: use their peak opacity
            vals = a[mask]
            vals = vals[vals > 0.1]
            if vals.size < 8:
                continue
            core = vals[vals > 0.75 * np.percentile(vals, 97)]   # the stroke's core, not its soft edge
            v = float(np.median(core))
            lv = [1.0 if v > 0.93 else round(v, 3)]
        # the shape's own region of the upsampled map (others zeroed)
        m_big = ndimage.zoom(mask.astype(float), UP, order=0, grid_mode=True, mode='nearest') > 0.5
        m_big = np.pad(m_big, 2)
        sub = np.where(m_big, big, 0)
        ys, xs = sl
        yb0, yb1 = max(0, ys.start * UP), min(sub.shape[0], ys.stop * UP + 4 + 2)
        xb0, xb1 = max(0, xs.start * UP), min(sub.shape[1], xs.stop * UP + 4 + 2)
        win = np.pad(sub[yb0:yb1, xb0:xb1], 1)
        prev = 0.0
        for v in lv:
            cs = measure.find_contours(win, (prev + v) / 2)
            cs = [c + np.array([yb0 - 1, xb0 - 1]) for c in cs]
            d = path_d(cs, x0, y0, UP, tol, 2)
            if d:
                op = (v - prev) / (1 - prev) if prev < 1 else 1
                out.append([round(op, 3), d])
            prev = v
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('video')
    ap.add_argument('out')
    ap.add_argument('--name', default='LOGO')
    ap.add_argument('--bg', required=True)
    ap.add_argument('--ink', action='append', required=True, help='bottom to top')
    ap.add_argument('--tol', type=float, default=0.3, help='curve-fit tolerance, in source pixels')
    ap.add_argument('--pad', type=int, default=24)
    ap.add_argument('--same', type=float, default=0.004, help='mean opacity change below which a frame repeats the last one')
    ap.add_argument('--blur', type=float, default=0.5, help='edge smoothing, in source pixels')
    ap.add_argument('--detail', help='x0,y0,x1,y1 of a mark too fine to trace (e.g. a registered sign). '
                                     'It is left out of the trace and its per-frame opacity is recorded instead.')
    ap.add_argument('--detail-ink', type=int, default=-1, help='which ink the detail uses (default: top ink)')
    args = ap.parse_args()

    bg = hex_rgb(args.bg)
    inks = [hex_rgb(h) for h in args.ink]
    with tempfile.TemporaryDirectory() as tmp:
        frames = extract(args.video, tmp)
    H, W = frames[0].shape[:2]
    alphas = [painter(decompose(f, bg, inks)) for f in frames]

    detail = None
    if args.detail:
        dx0, dy0, dx1, dy1 = [int(v) for v in args.detail.split(',')]
        k = args.detail_ink % len(inks)
        cov = np.array([a[dy0:dy1, dx0:dx1, k].sum() for a in alphas])
        floor, peak = cov.min(), cov.max()
        rng = (peak - floor) or 1
        detail = {'box': [dx0, dy0, dx1, dy1], 'ink': k,
                  'opacity': [round(float(np.clip((c - floor) / rng, 0, 1)), 3) for c in cov]}
        for a in alphas:
            a[dy0:dy1, dx0:dx1, :] = 0

    # one crop box for the whole clip
    any_ink = np.zeros((H, W), bool)
    for a in alphas:
        any_ink |= a.max(2) > 0.05
    ys, xs = np.nonzero(any_ink)
    box = (max(0, ys.min() - args.pad), min(H, ys.max() + args.pad),
           max(0, xs.min() - args.pad), min(W, xs.max() + args.pad))

    # Frames that differ only by compression noise form one group. The group is
    # traced once from its average, which also cancels most of that noise.
    y0, y1, x0, x1 = box
    groups = []
    for i, a in enumerate(alphas):
        crop = a[y0:y1, x0:x1]
        if groups and np.abs(crop - groups[-1]['first']).mean() < args.same:
            groups[-1]['members'].append(i)
        else:
            groups.append({'first': crop, 'members': [i]})
    uniq, seq = [], []
    for g in groups:
        mean = np.mean([alphas[i] for i in g['members']], axis=0)
        fr = [trace_layer(mean[..., k], box, args.tol, args.blur) for k in range(len(inks))]
        uniq.append(fr)
        seq += [len(uniq) - 1] * len(g['members'])
        m = g['members']
        print(f'frames {m[0] + 1}-{m[-1] + 1}: ' + ', '.join(f'ink{k} {len(l)} levels' for k, l in enumerate(fr)))

    data = {
        'width': W, 'height': H, 'fps': fps_of(args.video),
        'viewBox': [int(box[2]), int(box[0]), int(box[3] - box[2]), int(box[1] - box[0])],
        'background': '#' + args.bg.lstrip('#').upper(),
        'inks': ['#' + h.lstrip('#').upper() for h in args.ink],
        'frames': uniq,
        'sequence': seq,
    }
    if detail:
        data['detail'] = detail
    with open(args.out, 'w') as fh:
        fh.write(f'/* Generated by tools/trace_video.py from {os.path.basename(args.video)}. */\n')
        fh.write(f'window.{args.name} = ')
        json.dump(data, fh, separators=(',', ':'))
        fh.write(';\n')
    print('wrote', args.out, os.path.getsize(args.out) // 1024, 'KB')


if __name__ == '__main__':
    main()
