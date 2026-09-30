#!/usr/bin/env python3
"""Download REAL logos of other brands (integrations, partners, customers, press).

Sources, in order (first hit wins):
  icon style     : Simple Icons (official brand color) -> Wikidata icon (P2910) -> Wikidata logo (P154) -> site icons
  wordmark style : Wikidata logo (P154) -> Simple Icons -> site icons
Every file is saved under public/logos/, recorded in public/logos/logos.json and credits.json,
and shown on public/logos/preview.png so you can check each one by eye.

Usage:
  python logos.py --project DIR "Slack" "Notion" "Google Drive=drive.google.com" [--style icon|wordmark]
  ("Name=domain" gives a domain to fall back on for the site's own icon)
"""
import argparse
import html
import json
import os
import re
import subprocess
import sys
import time
import unicodedata
import urllib.parse

import requests

sys.path.insert(0, os.path.dirname(__file__))
from _common import write_json  # noqa: E402

UA = {"User-Agent": "motion-graphics-skill/1.0 (Claude skill; logo lookup; https://github.com/anthropics/skills)"}
SI_DATA = "https://cdn.jsdelivr.net/npm/simple-icons@latest/data/simple-icons.json"
SI_ICON = "https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/{slug}.svg"
_last = [0.0]


def get(url, **kw):
    wiki = "wikidata" in url or "wikimedia" in url or "wikipedia" in url
    for attempt in range(5):
        if wiki:  # be polite to Wikimedia: at most ~1 request/second
            wait = 1.0 - (time.time() - _last[0])
            if wait > 0:
                time.sleep(wait)
            _last[0] = time.time()
        r = requests.get(url, headers=UA, timeout=30, **kw)
        if r.status_code != 429:
            return r
        time.sleep(min(30, float(r.headers.get("Retry-After", 0) or 0) or 2 ** (attempt + 1)))
    return r


def si_slug(title):
    s = title.lower().replace("+", "plus").replace(".", "dot").replace("&", "and").replace("đ", "d").replace("ħ", "h").replace("ı", "i").replace("ĸ", "k").replace("ŀ", "l").replace("ł", "l").replace("ß", "ss").replace("ŧ", "t")
    s = unicodedata.normalize("NFD", s)
    return re.sub(r"[^a-z0-9]", "", s)


_si = None


def simple_icons():
    global _si
    if _si is None:
        try:
            data = get(SI_DATA).json()
            data = data.get("icons", data) if isinstance(data, dict) else data
            _si = {}
            for d in data:
                slug = d.get("slug") or si_slug(d["title"])
                for n in [d["title"], *(d.get("aliases", {}).get("aka", []) if isinstance(d.get("aliases"), dict) else [])]:
                    _si[n.lower()] = (slug, d.get("hex", "000000"), d["title"])
        except Exception as e:  # noqa: BLE001
            print("simple-icons unavailable:", e)
            _si = {}
    return _si


def from_simple_icons(name):
    hit = simple_icons().get(name.lower())
    if not hit:
        return None
    slug, hexc, title = hit
    r = get(SI_ICON.format(slug=slug))
    if not r.ok:
        return None
    svg = r.text.replace("<svg ", f'<svg fill="#{hexc}" ', 1)
    return {"data": svg.encode(), "ext": "svg", "source": f"Simple Icons ({title})", "license": "CC0 icon data; brand marks remain trademarks of their owners",
            "color": f"#{hexc}"}


def wikidata_file(name, prop):
    r = get("https://www.wikidata.org/w/api.php", params={"action": "wbsearchentities", "search": name, "language": "en", "type": "item", "limit": 6, "format": "json"})
    if not r.ok:
        return None
    results = r.json().get("search", [])
    good = re.compile(r"software|company|app|service|platform|brand|website|organi[sz]ation|business|manufacturer|product|tool|network|bank|airline|startup|corporation", re.I)
    results.sort(key=lambda x: 0 if good.search(x.get("description", "")) else 1)
    for ent in results[:4]:
        c = get("https://www.wikidata.org/w/api.php", params={"action": "wbgetclaims", "entity": ent["id"], "property": prop, "format": "json"})
        claims = c.json().get("claims", {}).get(prop, []) if c.ok else []
        if claims:
            fn = claims[0]["mainsnak"].get("datavalue", {}).get("value")
            if fn:
                return fn, ent
    return None


def from_wikidata(name, prop):
    hit = wikidata_file(name, prop)
    if not hit:
        return None
    fn, ent = hit
    url = "https://commons.wikimedia.org/wiki/Special:FilePath/" + urllib.parse.quote(fn.replace(" ", "_"))
    r = get(url, allow_redirects=True)
    if not r.ok:
        return None
    ext = fn.rsplit(".", 1)[-1].lower()
    return {"data": r.content, "ext": ext, "source": f"Wikimedia Commons: File:{fn} (Wikidata {ent['id']}: {ent.get('description', '')})",
            "license": f"see https://commons.wikimedia.org/wiki/File:{urllib.parse.quote(fn.replace(' ', '_'))} (logos are usually trademarked / PD-textlogo)"}


def from_site(domain):
    if not domain:
        return None
    for url in (f"https://{domain}/apple-touch-icon.png", f"https://www.google.com/s2/favicons?domain={domain}&sz=256",
                f"https://icons.duckduckgo.com/ip3/{domain}.ico"):
        try:
            r = get(url)
            if r.ok and len(r.content) > 400 and "image" in r.headers.get("content-type", ""):
                ext = "png" if "png" in r.headers["content-type"] else "ico"
                return {"data": r.content, "ext": ext, "source": url, "license": "site icon; trademark of its owner"}
        except requests.RequestException:
            pass
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("names", nargs="+")
    ap.add_argument("--project", required=True)
    ap.add_argument("--style", choices=["icon", "wordmark"], default="icon")
    a = ap.parse_args()

    out = os.path.join(a.project, "public", "logos")
    os.makedirs(out, exist_ok=True)
    manifest_path = os.path.join(out, "logos.json")
    manifest = json.load(open(manifest_path)) if os.path.exists(manifest_path) else {}
    credits_path = os.path.join(a.project, "credits.json")
    credits = json.load(open(credits_path)) if os.path.exists(credits_path) else []

    for raw in a.names:
        name, _, domain = raw.partition("=")
        name = name.strip()
        order = ([lambda: from_simple_icons(name), lambda: from_wikidata(name, "P2910"), lambda: from_wikidata(name, "P154")]
                 if a.style == "icon" else [lambda: from_wikidata(name, "P154"), lambda: from_simple_icons(name)])
        order.append(lambda: from_site(domain.strip() or None))
        got = None
        for fn in order:
            try:
                got = fn()
            except Exception as e:  # noqa: BLE001
                print(f"  {name}: source error {e}")
            if got:
                break
        if not got:
            print(f"!! {name}: no logo found (try 'Name=domain.com' or fetch it from the brand's press kit)")
            continue
        slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
        path = os.path.join(out, f"{slug}.{got['ext']}")
        open(path, "wb").write(got["data"])
        rel = f"logos/{slug}.{got['ext']}"
        manifest[name] = {"file": rel, "source": got["source"], "color": got.get("color")}
        credits = [c for c in credits if c.get("file") != rel] + [{"file": rel, "what": f"{name} logo", "source": got["source"], "license": got["license"]}]
        print(f"ok {name:<22} -> public/{rel}   ({got['source'][:70]})")

    write_json(manifest_path, manifest)
    write_json(credits_path, credits)

    tiles = "".join(
        f'<div class=t><div class=a><img src="{os.path.abspath(os.path.join(a.project, "public", v["file"]))}"></div>'
        f'<div class=b><img src="{os.path.abspath(os.path.join(a.project, "public", v["file"]))}"></div><div class=c>{html.escape(k)}<br>{html.escape(v["source"][:60])}</div></div>'
        for k, v in manifest.items())
    page = ("<!doctype html><meta charset=utf-8><style>body{margin:0;padding:20px;font:13px system-ui;background:#f6f6f6;width:1560px}"
            ".t{display:inline-block;width:240px;margin:6px;border:1px solid #ddd;border-radius:10px;overflow:hidden;background:#fff;vertical-align:top}"
            ".a,.b{height:110px;display:flex;align-items:center;justify-content:center}.b{background:#111}img{max-width:70%;max-height:80px}"
            ".c{padding:6px 8px;font-size:11px;color:#555}</style><h2>Logos</h2>" + tiles)
    hp = os.path.join(out, "preview.html")
    open(hp, "w").write(page)
    try:
        subprocess.run(["node", os.path.join(os.path.dirname(__file__), "snap.mjs"), "--project", a.project, "--html", hp,
                        "--out", os.path.join(out, "preview.png")], check=True, capture_output=True, timeout=120)
        print(f"Check them: {os.path.join(out, 'preview.png')}")
    except Exception as e:  # noqa: BLE001
        print("preview not rendered:", e)


if __name__ == "__main__":
    main()
