# Makes the locked look of the rank badges for the league animation:
#   python3 tools/lock-ranks.py   (needs Pillow and numpy)
# Reads league/img/ranks/rank-<key>.png and writes rank-<key>-grey.png (the
# badge in light greys) and rank-<key>-locked.png (the grey badge with the
# site's padlock in the middle: white body, dark keyhole, soft drop shadow,
# like the locked tiers on the leaderboard). The animation draws the padlock
# itself on the grey badge that unlocks, so it can spring open.
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

DIR = os.path.join(os.path.dirname(__file__), '..', 'league', 'img', 'ranks')
SS = 8   # supersampling for the padlock


def padlock(size):
    # LOCK_SVG from the site, viewBox 0 0 24 24
    n = size * SS
    u = n / 24
    im = Image.new('RGBA', (n, n), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    w = round(2.4 * u)
    d.arc([7.5 * u, 3.5 * u, 16.5 * u, 12.5 * u], 180, 360, fill='white', width=w)
    d.line([7.5 * u, 8 * u, 7.5 * u, 10.5 * u], fill='white', width=w)
    d.line([16.5 * u, 8 * u, 16.5 * u, 10.5 * u], fill='white', width=w)
    for x in (7.5, 16.5):
        d.ellipse([x * u - w / 2, 10.5 * u - w / 2, x * u + w / 2, 10.5 * u + w / 2], fill='white')
    d.rounded_rectangle([4.7 * u, 10 * u, 19.3 * u, 21 * u], radius=3.4 * u, fill='white')
    d.ellipse([10.3 * u, 13 * u, 13.7 * u, 16.4 * u], fill='#4B4B4B')
    d.rounded_rectangle([11 * u, 15.4 * u, 13 * u, 18.8 * u], radius=1 * u, fill='#4B4B4B')
    return im.resize((size, size), Image.LANCZOS)


for key in ('bronze', 'silver', 'gold', 'diamond', 'champion'):
    src = Image.open(os.path.join(DIR, 'rank-%s.png' % key)).convert('RGBA')
    a = np.asarray(src).astype(float)
    lum = a[..., 0] * 0.299 + a[..., 1] * 0.587 + a[..., 2] * 0.114
    lo, hi = np.percentile(lum[a[..., 3] > 128], [2, 98])
    grey = 176 + np.clip((lum - lo) / max(hi - lo, 1), 0, 1) * 66
    out = np.dstack([grey, grey, grey + 2, a[..., 3]]).clip(0, 255).astype(np.uint8)
    im = Image.fromarray(out, 'RGBA')
    im.save(os.path.join(DIR, 'rank-%s-grey.png' % key), optimize=True)

    size = round(src.width * 0.36)
    lock = padlock(size)
    x, y = (src.width - size) // 2, round(src.height * 0.48 - size / 2)
    shadow = Image.new('RGBA', im.size, (0, 0, 0, 0))
    sh = Image.new('RGBA', lock.size, (0, 0, 0, 115))
    shadow.paste(sh, (x, y + 2), lock)
    im.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(2)))
    im.alpha_composite(lock, (x, y))
    im.save(os.path.join(DIR, 'rank-%s-locked.png' % key), optimize=True)
    print('rank-%s-locked.png' % key, im.size)
