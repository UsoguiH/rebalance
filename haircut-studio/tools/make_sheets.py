"""Draw numbered contact sheets of the candidate photos so a person can pick
one per style. usage: python3 make_sheets.py <cands_dir> [per_row] [styles_per_sheet]"""
import json, os, sys
from PIL import Image, ImageDraw, ImageFont, ImageOps

HERE = os.path.dirname(os.path.abspath(__file__))


def font(size):
    for p in ("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
              "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf"):
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def main():
    d = sys.argv[1]
    per_row = int(sys.argv[2]) if len(sys.argv) > 2 else 12
    per_sheet = int(sys.argv[3]) if len(sys.argv) > 3 else 5
    only = set(sys.argv[4].split(",")) if len(sys.argv) > 4 else None
    styles = json.load(open(os.path.join(HERE, "styles.json")))
    order = [r[0] for k in ("hair", "beard") for r in styles[k]]
    ov = json.load(open(os.path.join(d, "candidates.json")))
    cm_path = os.path.join(d, "commons.json")
    cm = json.load(open(cm_path)) if os.path.exists(cm_path) else {}
    # every candidate gets a key: "3" for Openverse, "c3" for Commons
    cands = {}
    for sid in order:
        keys = ["c%d" % i for i in range(len(cm.get(sid, [])))] + [str(i) for i in range(len(ov.get(sid, [])))]
        if keys:
            cands[sid] = keys
    order = [s for s in order if s in cands and (not only or s in only)]
    tw, th, lab = 130, 173, 30
    f_big, f_small = font(22), font(18)
    os.makedirs(os.path.join(d, "sheets"), exist_ok=True)
    for si in range(0, len(order), per_sheet):
        group = order[si:si + per_sheet]
        rows = []
        for sid in group:
            n = len(cands[sid])
            for start in range(0, max(n, 1), per_row):
                rows.append((sid, start, min(n, start + per_row)))
        sheet = Image.new("RGB", (per_row * (tw + 4) + 4, len(rows) * (th + lab + 6)), "white")
        g = ImageDraw.Draw(sheet)
        y = 0
        for sid, a, b in rows:
            g.text((6, y + 4), sid, fill="black", font=f_small)
            for i in range(a, b):
                x = 4 + (i - a) * (tw + 4)
                key = cands[sid][i]
                fn = ("c%02d.jpg" % int(key[1:])) if key.startswith("c") else ("%02d.jpg" % int(key))
                try:
                    im = Image.open(os.path.join(d, "thumbs", sid, fn)).convert("RGB")
                    im = ImageOps.fit(im, (tw, th), centering=(0.5, 0.35))
                    sheet.paste(im, (x, y + lab))
                except Exception:
                    g.rectangle((x, y + lab, x + tw, y + lab + th), fill="#ccc")
                g.rectangle((x, y + lab, x + 16 + 13 * len(key), y + lab + 26), fill="black" if key[0] != "c" else "#c2410c")
                g.text((x + 3, y + lab + 1), key, fill="white", font=f_big)
            y += th + lab + 6
        sheet.save(os.path.join(d, "sheets", "sheet_%02d.jpg" % (si // per_sheet)), quality=85)
    print(len(order), "styles")


if __name__ == "__main__":
    main()
