"""Collect candidates from Wikimedia Commons categories, slowly and politely.

For each style it finds the best matching categories (namespace 14 search plus
the category named in styles.json), lists their photos and saves 330px
previews next to the Openverse ones (ids prefixed "c").

usage: python3 find_commons.py <out_dir> [style_id ...]
"""
import json, os, sys, time, urllib.parse
import find_candidates as fc

API = "https://commons.wikimedia.org/w/api.php?"
PAUSE = float(os.environ.get("PAUSE", "2.5"))


def api(**params):
    params.update(format="json", maxlag=5)
    time.sleep(PAUSE)
    raw = fc.get(API + urllib.parse.urlencode(params), tries=3)
    return json.loads(raw) if raw else {}


def search_categories(q):
    d = api(action="query", list="search", srnamespace=14, srsearch=q, srlimit=3)
    return [r["title"] for r in d.get("query", {}).get("search", [])]


def files_with_info(cat, n=20):
    """Members of a category with their image info, in a single request."""
    d = api(action="query", generator="categorymembers", gcmtitle=cat, gcmtype="file", gcmlimit=n,
            prop="imageinfo", iiprop="url|extmetadata|mime|size", iiurlwidth=330)
    return parse(d)


def parse(d):
    out = []
    for p in d.get("query", {}).get("pages", {}).values():
        ii = (p.get("imageinfo") or [{}])[0]
        if ii.get("mime") not in ("image/jpeg", "image/png"):
            continue
        if min(ii.get("width", 0), ii.get("height", 0)) < 500:
            continue
        m = ii.get("extmetadata", {})
        lic = (m.get("LicenseShortName", {}).get("value") or "")
        words = lic.lower().replace("-", " ").split()
        if not any(k in lic.lower() for k in ("cc by", "cc0", "public domain", "pd")) or "nc" in words or "nd" in words:
            continue
        out.append({
            "src": "commons", "title": p["title"], "url": ii["url"], "thumb": ii.get("thumburl"),
            "width": ii.get("width"), "height": ii.get("height"),
            "page": ii.get("descriptionurl"),
            "author": fc.strip_tags(m.get("Artist", {}).get("value")) or "Unknown",
            "license": lic, "license_url": m.get("LicenseUrl", {}).get("value"),
        })
    return out


def main():
    out_dir = sys.argv[1]
    only = set(sys.argv[2:])
    styles = json.load(open(os.path.join(fc.HERE, "styles.json")))
    path = os.path.join(out_dir, "commons.json")
    got = json.load(open(path)) if os.path.exists(path) else {}
    for kind, rows in styles.items():
        for sid, name, q, cat in rows:
            if (only and sid not in only) or (not only and sid in got):
                continue
            items = files_with_info("Category:" + cat)
            if len(items) < 6:
                for c in search_categories(name)[:2]:
                    if c != "Category:" + cat:
                        items += files_with_info(c)
            seen, uniq = set(), []
            for c in items:
                if c["url"] not in seen:
                    seen.add(c["url"]); uniq.append(c)
            items = uniq[:20]
            tdir = os.path.join(out_dir, "thumbs", sid)
            os.makedirs(tdir, exist_ok=True)
            kept = []
            for c in items:
                time.sleep(0.8)
                data = fc.get(c["thumb"] or c["url"], tries=2)
                if not data or len(data) < 3000:
                    continue
                open(os.path.join(tdir, "c%02d.jpg" % len(kept)), "wb").write(data)
                kept.append(c)
            got[sid] = kept
            json.dump(got, open(path, "w"), indent=1)
            print("done", sid, len(kept), file=sys.stderr)


if __name__ == "__main__":
    main()
