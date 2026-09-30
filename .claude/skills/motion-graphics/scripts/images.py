#!/usr/bin/env python3
"""Download REAL photos (people, places, objects) with licenses you can use commercially.

Sources: Unsplash (UNSPLASH_ACCESS_KEY), Pexels (PEXELS_API_KEY), then Openverse
(CC0 / CC BY / CC BY-SA from Flickr, Wikimedia, Rawpixel..., no key needed).
Also --url to grab a specific image (e.g. a press photo the user linked).
Writes public/images/<slug>-N.jpg, credits.json entries and public/images/preview.jpg.

Usage:
  python images.py --project DIR --query "developer working late laptop" --count 4 [--orientation landscape|portrait]
  python images.py --project DIR --url https://example.com/press/hero.jpg --name hero
"""
import argparse
import io
import json
import os
import re
import sys

import requests
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(__file__))
from _common import write_json  # noqa: E402

UA = {"User-Agent": "motion-graphics-skill/1.0 (Claude skill; image search)"}


def unsplash(q, n, orient):
    key = os.environ.get("UNSPLASH_ACCESS_KEY")
    if not key:
        return []
    r = requests.get("https://api.unsplash.com/search/photos", params={"query": q, "per_page": n * 2, "orientation": orient},
                     headers={"Authorization": f"Client-ID {key}"}, timeout=30)
    if not r.ok:
        return []
    return [{"url": p["urls"]["raw"] + "&w=2400&q=85&fm=jpg", "w": p["width"], "h": p["height"],
             "credit": f"Photo by {p['user']['name']} on Unsplash", "source": p["links"]["html"], "license": "Unsplash License",
             "ping": p["links"].get("download_location"), "key": key} for p in r.json().get("results", [])]


def pexels(q, n, orient):
    key = os.environ.get("PEXELS_API_KEY")
    if not key:
        return []
    r = requests.get("https://api.pexels.com/v1/search", params={"query": q, "per_page": n * 2, "orientation": orient},
                     headers={"Authorization": key}, timeout=30)
    if not r.ok:
        return []
    return [{"url": p["src"]["large2x"], "w": p["width"], "h": p["height"], "credit": f"Photo by {p['photographer']} on Pexels",
             "source": p["url"], "license": "Pexels License"} for p in r.json().get("photos", [])]


def openverse(q, n, orient):
    # CC0 / BY / public domain only (ND forbids cropping/grading; SA would bind the whole video)
    params = {"q": q, "license": "cc0,by,pdm", "page_size": min(20, n * 5), "mature": "false"}
    if orient in ("landscape", "portrait"):
        params["aspect_ratio"] = "wide" if orient == "landscape" else "tall"
    r = requests.get("https://api.openverse.org/v1/images/", params=params, headers=UA, timeout=30)
    if not r.ok:
        return []
    out = []
    for p in r.json().get("results", []):
        w, h = p.get("width") or 0, p.get("height") or 0
        if w and w < 1400:
            continue
        lic = f"CC {p['license'].upper()} {p.get('license_version', '')}".strip() if p["license"] not in ("cc0", "pdm") else p["license"].upper()
        out.append({"url": p["url"], "w": w, "h": h, "credit": f"\"{p.get('title') or 'Untitled'}\" by {p.get('creator') or 'unknown'} ({lic})",
                    "source": p.get("foreign_landing_url") or p["url"], "license": lic, "license_url": p.get("license_url")})
    return out


def save(img_bytes, path):
    im = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    if im.width > 2600:
        im = im.resize((2600, int(im.height * 2600 / im.width)), Image.LANCZOS)
    im.save(path, quality=90)
    return im.size


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--project", required=True)
    ap.add_argument("--query")
    ap.add_argument("--count", type=int, default=4)
    ap.add_argument("--orientation", default="landscape")
    ap.add_argument("--url")
    ap.add_argument("--name")
    a = ap.parse_args()

    out = os.path.join(a.project, "public", "images")
    os.makedirs(out, exist_ok=True)
    credits_path = os.path.join(a.project, "credits.json")
    credits = json.load(open(credits_path)) if os.path.exists(credits_path) else []
    saved = []

    if a.url:
        r = requests.get(a.url, headers=UA, timeout=60)
        r.raise_for_status()
        name = a.name or re.sub(r"[^a-z0-9]+", "-", a.url.split("/")[-1].split("?")[0].lower()).strip("-")[:40]
        path = os.path.join(out, f"{name}.jpg")
        save(r.content, path)
        saved.append(path)
        credits.append({"file": f"images/{name}.jpg", "what": "image", "source": a.url, "license": "provided/linked by user — confirm rights"})
    else:
        slug = re.sub(r"[^a-z0-9]+", "-", a.query.lower()).strip("-")[:40]
        pool = unsplash(a.query, a.count, a.orientation) + pexels(a.query, a.count, a.orientation) + openverse(a.query, a.count, a.orientation)
        if not pool:
            sys.exit("No images found. Try a simpler query, or set UNSPLASH_ACCESS_KEY / PEXELS_API_KEY for better stock photos.")
        i, seen, small = 0, set(), []
        for p in pool:
            if i >= a.count:
                break
            if p["credit"] in seen:  # same photo listed twice
                continue
            seen.add(p["credit"])
            try:
                r = requests.get(p["url"], headers=UA, timeout=60)
                if not r.ok or "image" not in r.headers.get("content-type", "image"):
                    continue
                if Image.open(io.BytesIO(r.content)).width < 1400:  # too small for a full-screen shot; keep as a last resort
                    small.append((p, r.content))
                    continue
                i += 1
                rel = f"images/{slug}-{i}.jpg"
                size = save(r.content, os.path.join(out, f"{slug}-{i}.jpg"))
                saved.append(os.path.join(out, f"{slug}-{i}.jpg"))
                if p.get("ping"):  # Unsplash API guideline: register the download
                    requests.get(p["ping"], headers={"Authorization": f"Client-ID {p['key']}"}, timeout=10)
                credits = [c for c in credits if c.get("file") != rel] + [{"file": rel, "what": a.query, "credit": p["credit"], "source": p["source"], "license": p["license"]}]
                print(f"ok public/{rel} {size[0]}x{size[1]}  {p['credit'][:80]}")
            except Exception as e:  # noqa: BLE001
                print("skip:", e)
        for p, data in small[: max(0, a.count - i)]:
            i += 1
            rel = f"images/{slug}-{i}.jpg"
            size = save(data, os.path.join(out, f"{slug}-{i}.jpg"))
            saved.append(os.path.join(out, f"{slug}-{i}.jpg"))
            credits = [c for c in credits if c.get("file") != rel] + [{"file": rel, "what": a.query, "credit": p["credit"], "source": p["source"], "license": p["license"]}]
            print(f"ok public/{rel} {size[0]}x{size[1]} (small: use inside a card/device, not full screen)  {p['credit'][:60]}")
    write_json(credits_path, credits)

    if saved:  # contact sheet to check the pictures by eye
        thumbs = [Image.open(s).convert("RGB") for s in saved]
        tw = 480
        th = [int(t.height * tw / t.width) for t in thumbs]
        sheet = Image.new("RGB", (tw * min(4, len(thumbs)) + 10 * 5, (max(th) + 30) * ((len(thumbs) + 3) // 4) + 10), (20, 20, 20))
        d = ImageDraw.Draw(sheet)
        for k, (t, h) in enumerate(zip(thumbs, th)):
            x, y = 10 + (k % 4) * (tw + 10), 10 + (k // 4) * (max(th) + 30)
            sheet.paste(t.resize((tw, h)), (x, y))
            d.text((x, y + h + 4), os.path.basename(saved[k]), fill=(255, 220, 90))
        sheet.save(os.path.join(out, "preview.jpg"), quality=80)
        print(f"Check them: {os.path.join(out, 'preview.jpg')}")


if __name__ == "__main__":
    main()
