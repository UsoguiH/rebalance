"""Turn the picked candidates into the app's style list.

picks.json maps style id -> candidate key, or [key, crop], where key is
"u3" (Unsplash), "c3" (Wikimedia Commons) or "3" (Openverse), optionally
prefixed with another style id ("waves:u14") to borrow its candidate.

Unsplash photos are hotlinked, as the Unsplash API terms require: the app gets
imgix URLs cropped around the face (crop overrides it, e.g. "focalpoint&fp-y=.3"),
and each pick is reported to Unsplash's download endpoint. Other sources are
cropped locally into assets/styles/<id>.jpg.

Writes js/styles.js and credits.html.
usage: UNSPLASH_KEY=... python3 build_assets.py <cands_dir>
"""
import html, json, os, sys, time, urllib.request
from PIL import Image, ImageOps
from find_candidates import get

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
W, H = 600, 800
UTM = "utm_source=try_a_new_look&utm_medium=referral"
LICENSE_NAMES = {"by": "CC BY", "by-sa": "CC BY-SA", "cc0": "CC0", "pdm": "Public Domain Mark"}


def load(d, name):
    p = os.path.join(d, name)
    return json.load(open(p)) if os.path.exists(p) else {}


def crop_local(im, fx=0.5, fy=0.4):
    im = ImageOps.exif_transpose(im).convert("RGB")
    w, h = im.size
    cw = min(w, h * 3 / 4)
    ch = cw * 4 / 3
    x = min(max(fx * w - cw / 2, 0), w - cw)
    y = min(max(fy * h - ch / 2, 0), h - ch)
    return im.crop((round(x), round(y), round(x + cw), round(y + ch))).resize((W, H), Image.LANCZOS)


def imgix(raw, w, h, crop):
    sep = "&" if "?" in raw else "?"
    return raw + sep + "w=%d&h=%d&fit=crop&crop=%s&q=80&fm=jpg" % (w, h, crop)


def track_download(c):
    """Unsplash asks apps to hit download_location when a photo is used."""
    key = os.environ.get("UNSPLASH_KEY")
    if not key or c.get("tracked"):
        return
    req = urllib.request.Request(c["download_location"], headers={"Authorization": "Client-ID " + key, "Accept-Version": "v1"})
    try:
        urllib.request.urlopen(req, timeout=30).read()
        c["tracked"] = True
    except Exception as e:
        print("  could not report download for", c["id"], e, file=sys.stderr)


def license_label(c):
    lic = c.get("license") or ""
    name = LICENSE_NAMES.get(lic, lic)
    if c.get("license_version") and lic in ("by", "by-sa"):
        name += " " + c["license_version"]
    return name


def main():
    d = sys.argv[1]
    styles = json.load(open(os.path.join(HERE, "styles.json")))
    desc = json.load(open(os.path.join(HERE, "descriptions.json")))
    picks = json.load(open(os.path.join(HERE, "picks.json")))
    ov, cm, us = load(d, "candidates.json"), load(d, "commons.json"), load(d, "unsplash.json")
    out_dir = os.path.join(ROOT, "assets", "styles")
    os.makedirs(out_dir, exist_ok=True)
    data, missing, used_local = [], [], set()
    for kind in ("hair", "beard"):
        for sid, name, _q, _cat in styles[kind]:
            p = picks.get(sid)
            if p is None:
                missing.append(sid)
                continue
            key, crop = (p + ["faces"])[:2] if isinstance(p, list) else (p, "faces")
            key = str(key)
            src_sid, key = key.split(":") if ":" in key else (sid, key)  # "other-style:u3" borrows a candidate
            item = {"id": sid, "kind": kind, "name": name, "desc": desc[sid]}
            if key[0] == "u":
                c = us[src_sid][int(key[1:])]
                item["img"] = imgix(c["raw"], 480, 640, crop)
                item["ref"] = imgix(c["raw"], 768, 1024, crop)
                item["credit"] = {"author": c["author"], "license": "Unsplash License",
                                  "licenseUrl": "https://unsplash.com/license?" + UTM,
                                  "authorUrl": c["author_url"] + "?" + UTM, "source": c["page"] + "?" + UTM}
                track_download(c)
            else:
                if key[0] == "c":
                    c = cm[src_sid][int(key[1:])]
                    src = os.path.join(d, "big", sid + ".jpg")
                    if not os.path.exists(src):
                        os.makedirs(os.path.dirname(src), exist_ok=True)
                        raw = get((c.get("thumb") or c["url"]).replace("/330px-", "/960px-"), tries=3) or get(c["url"], tries=3)
                        open(src, "wb").write(raw)
                        time.sleep(2)
                else:
                    c = ov[src_sid][int(key)]
                    src = os.path.join(d, "thumbs", src_sid, "%02d.jpg" % int(key))
                crop_local(Image.open(src)).save(os.path.join(out_dir, sid + ".jpg"), quality=80, optimize=True, progressive=True)
                used_local.add(sid + ".jpg")
                item["img"] = item["ref"] = "assets/styles/%s.jpg" % sid
                item["credit"] = {"author": c["author"], "license": license_label(c),
                                  "licenseUrl": c.get("license_url"), "source": c.get("page") or c["url"]}
            data.append(item)
    json.dump(us, open(os.path.join(d, "unsplash.json"), "w"), indent=1)  # remembers tracked downloads
    for f in os.listdir(out_dir):
        if f not in used_local:
            os.remove(os.path.join(out_dir, f))

    with open(os.path.join(ROOT, "js", "styles.js"), "w") as f:
        f.write("/* Generated by tools/build_assets.py. Real reference photos; see credits.html. */\n")
        f.write("window.STYLES = " + json.dumps(data, indent=1, ensure_ascii=False) + ";\n")

    rows = []
    for s in data:
        c = s["credit"]
        lic = html.escape(c["license"])
        if c.get("licenseUrl"):
            lic = '<a href="%s">%s</a>' % (html.escape(c["licenseUrl"]), lic)
        who = html.escape(c["author"])
        if c.get("authorUrl"):
            who = '<a href="%s">%s</a>' % (html.escape(c["authorUrl"]), who)
        where = "Unsplash" if "unsplash.com" in c["source"] else "source"
        rows.append('<li><img src="%s" alt="" loading="lazy"><div><b>%s</b><span>%s</span><span>Photo by %s on <a href="%s">%s</a> · %s</span></div></li>' % (
            html.escape(s["img"]), html.escape(s["name"]), "Haircut" if s["kind"] == "hair" else "Beard",
            who, html.escape(c["source"]), where, lic))
    page = open(os.path.join(HERE, "credits.template.html")).read().replace("<!--ROWS-->", "\n".join(rows))
    open(os.path.join(ROOT, "credits.html"), "w").write(page)
    print(len(data), "styles built; missing:", missing)


if __name__ == "__main__":
    main()
