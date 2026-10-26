"""Collect openly licensed candidate photos for every style.

Searches Openverse (Flickr etc., commercial + modification licenses only) and
Wikimedia Commons, then writes candidates.json and small thumbnails so a person
can pick the best real example for each style with make_sheets.py.

usage: python3 find_candidates.py <out_dir> [style_id ...]
"""
import json, os, sys, time, urllib.parse, urllib.request, re, html

UA = "HaircutStudio/1.0 (https://github.com/usoguih/rebalance; reference photo curation)"
HERE = os.path.dirname(os.path.abspath(__file__))
OK_LICENSES = {"by", "by-sa", "cc0", "pdm"}


def get(url, tries=4):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=40) as r:
                return r.read()
        except Exception as e:
            code = getattr(e, "code", None)
            if i == tries - 1:
                break
            wait = 45 if code == 429 else 4 * (i + 1)
            print("  retry", code or e, urllib.parse.urlparse(url).netloc, "in", wait, file=sys.stderr)
            time.sleep(wait)
    return None


def strip_tags(s):
    return html.unescape(re.sub(r"<[^>]+>", "", s or "")).strip()


def openverse(q, n=20):
    url = "https://api.openverse.org/v1/images/?" + urllib.parse.urlencode({
        "q": q, "page_size": n, "license_type": "commercial,modification",
        "mature": "false"})
    raw = get(url)
    if not raw:
        return []
    out = []
    for r in json.loads(raw).get("results", []):
        if r.get("license") not in OK_LICENSES:
            continue
        out.append({
            "src": "openverse", "title": r.get("title") or "",
            "url": r["url"], "page": r.get("foreign_landing_url"),
            "author": r.get("creator") or "Unknown",
            "license": r["license"], "license_version": r.get("license_version"),
            "license_url": r.get("license_url"),
        })
    return out


def commons_info(titles):
    if not titles:
        return []
    url = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode({
        "action": "query", "format": "json", "prop": "imageinfo",
        "iiprop": "url|extmetadata|mime", "iiurlwidth": 900,
        "titles": "|".join(titles[:50])})
    raw = get(url)
    if not raw:
        return []
    out = []
    for p in json.loads(raw).get("query", {}).get("pages", {}).values():
        ii = (p.get("imageinfo") or [{}])[0]
        if ii.get("mime") not in ("image/jpeg", "image/png", "image/webp"):
            continue
        m = ii.get("extmetadata", {})
        lic = (m.get("LicenseShortName", {}).get("value") or "").lower()
        if not any(k in lic for k in ("cc by", "cc0", "public domain", "pd")):
            continue
        if "nc" in lic.split() or "-nc" in lic or "nd" in lic.split() or "-nd" in lic:
            continue
        out.append({
            "src": "commons", "title": p["title"], "url": ii.get("thumburl") or ii["url"],
            "page": ii.get("descriptionurl"),
            "author": strip_tags(m.get("Artist", {}).get("value")) or "Unknown",
            "license": m.get("LicenseShortName", {}).get("value"),
            "license_url": m.get("LicenseUrl", {}).get("value"),
        })
    return out


def commons(q, cat, n=10):
    titles = []
    url = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode({
        "action": "query", "format": "json", "list": "categorymembers",
        "cmtitle": "Category:" + cat, "cmtype": "file", "cmlimit": n})
    raw = get(url)
    if raw:
        titles += [m["title"] for m in json.loads(raw).get("query", {}).get("categorymembers", [])]
    url = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode({
        "action": "query", "format": "json", "list": "search", "srnamespace": 6,
        "srsearch": q + " filetype:bitmap", "srlimit": n})
    raw = get(url)
    if raw:
        titles += [m["title"] for m in json.loads(raw).get("query", {}).get("search", [])]
    seen, uniq = set(), []
    for t in titles:
        if t not in seen:
            seen.add(t); uniq.append(t)
    return commons_info(uniq)


def fetch_style(out_dir, sid, q, cat):
    items = []
    words = q.split()
    for qq in dict.fromkeys([q, " ".join(words[:3]), " ".join(words[:2])]):
        if len(items) >= 12:
            break
        seen = {c["url"] for c in items}
        items += [c for c in openverse(qq, 20) if c["url"] not in seen]
        time.sleep(3)
    if len(items) < 6 and os.environ.get("USE_COMMONS"):
        items += commons(q, cat)
    tdir = os.path.join(out_dir, "thumbs", sid)
    os.makedirs(tdir, exist_ok=True)
    kept = []
    for c in items:
        time.sleep(1.2 if c["src"] == "commons" else 0.2)
        data = get(c["url"], tries=1)  # skip throttled hosts instead of waiting
        if not data or len(data) < 3000:
            continue
        open(os.path.join(tdir, "%02d.jpg" % len(kept)), "wb").write(data)
        kept.append(c)
    return kept


def main():
    from concurrent.futures import ThreadPoolExecutor
    import threading
    out_dir = sys.argv[1]
    only = set(sys.argv[2:])
    styles = json.load(open(os.path.join(HERE, "styles.json")))
    path = os.path.join(out_dir, "candidates.json")
    cands = json.load(open(path)) if os.path.exists(path) else {}
    lock = threading.Lock()
    todo = [(sid, q, cat) for kind, rows in styles.items() for sid, _n, q, cat in rows
            if ((sid in only) if only else (sid not in cands))]

    def run(job):
        sid, q, cat = job
        kept = fetch_style(out_dir, sid, q, cat)
        with lock:
            cands[sid] = kept
            json.dump(cands, open(path, "w"), indent=1)
            print("done", sid, len(kept), file=sys.stderr)

    with ThreadPoolExecutor(int(os.environ.get("WORKERS", "5"))) as ex:
        list(ex.map(run, todo))


if __name__ == "__main__":
    main()
