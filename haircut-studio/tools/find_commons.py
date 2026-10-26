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


def categories(q, cat):
    found = ["Category:" + cat]
    d = api(action="query", list="search", srnamespace=14, srsearch=q, srlimit=4)
    found += [r["title"] for r in d.get("query", {}).get("search", [])]
    return list(dict.fromkeys(found))


def files_in(cat, n):
    d = api(action="query", list="categorymembers", cmtitle=cat, cmtype="file", cmlimit=n)
    return [m["title"] for m in d.get("query", {}).get("categorymembers", [])]


def info(titles):
    out = []
    for i in range(0, len(titles), 40):
        d = api(action="query", prop="imageinfo", iiprop="url|extmetadata|mime|size",
                iiurlwidth=330, titles="|".join(titles[i:i + 40]))
        for p in d.get("query", {}).get("pages", {}).values():
            ii = (p.get("imageinfo") or [{}])[0]
            if ii.get("mime") not in ("image/jpeg", "image/png"):
                continue
            if min(ii.get("width", 0), ii.get("height", 0)) < 500:
                continue
            m = ii.get("extmetadata", {})
            lic = (m.get("LicenseShortName", {}).get("value") or "")
            low = lic.lower()
            if not any(k in low for k in ("cc by", "cc0", "public domain", "pd")) or "nc" in low.replace("-", " ").split() or "nd" in low.replace("-", " ").split():
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
            titles = []
            for c in categories(q, cat):
                titles += files_in(c, 14)
                if len(titles) >= 24:
                    break
            items = info(list(dict.fromkeys(titles))[:24])
            tdir = os.path.join(out_dir, "thumbs", sid)
            os.makedirs(tdir, exist_ok=True)
            kept = []
            for c in items:
                time.sleep(PAUSE)
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
