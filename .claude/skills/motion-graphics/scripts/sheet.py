#!/usr/bin/env python3
"""Labelled contact sheet from image files. Usage: sheet.py --out sheet.jpg img1 "label 1" img2 "label 2" ..."""
import argparse
import os
import sys

from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(__file__))
from analyze_reference import font  # noqa: E402

ap = argparse.ArgumentParser()
ap.add_argument("--out", required=True)
ap.add_argument("--cols", type=int, default=3)
ap.add_argument("pairs", nargs="+")
a = ap.parse_args()
items = list(zip(a.pairs[0::2], a.pairs[1::2]))
ims = [Image.open(p).convert("RGB") for p, _ in items]
tw = 560
ths = [int(im.height * tw / im.width) for im in ims]
th = max(ths)
cols = min(a.cols, len(ims))
rows = (len(ims) + cols - 1) // cols
lab = 26
sheet = Image.new("RGB", (cols * (tw + 8) + 8, rows * (th + lab + 8) + 8), (18, 18, 18))
d = ImageDraw.Draw(sheet)
f = font(16)
for k, (im, (_, label)) in enumerate(zip(ims, items)):
    x = 8 + (k % cols) * (tw + 8)
    y = 8 + (k // cols) * (th + lab + 8)
    d.text((x + 2, y + 4), label, fill=(255, 220, 90), font=f)
    sheet.paste(im.resize((tw, ths[k])), (x, y + lab))
sheet.save(a.out, quality=85)
