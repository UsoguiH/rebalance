"""Collect Unsplash candidates for every style (one search per style).

Needs an Unsplash Access Key in UNSPLASH_KEY. Respects the hourly rate limit by
sleeping until it resets. Writes unsplash.json and thumbs/<id>/uNN.jpg.

usage: UNSPLASH_KEY=... python3 find_unsplash.py <out_dir> [style_id ...]
"""
import json, os, sys, time, urllib.parse, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
API = "https://api.unsplash.com"


def search(q):
    url = API + "/search/photos?" + urllib.parse.urlencode({"query": q, "per_page": 30, "content_filter": "high"})
    while True:
        req = urllib.request.Request(url, headers={
            "Authorization": "Client-ID " + os.environ["UNSPLASH_KEY"], "Accept-Version": "v1"})
        try:
            with urllib.request.urlopen(req, timeout=40) as r:
                left = int(r.headers.get("X-Ratelimit-Remaining", "1"))
                data = json.loads(r.read())
            return data.get("results", []), left
        except urllib.error.HTTPError as e:
            if e.code in (403, 429):  # hourly limit used up
                print("  rate limited, waiting 5 min", file=sys.stderr)
                time.sleep(300)
                continue
            raise


def thumb(raw, w):
    return raw + ("&" if "?" in raw else "?") + urllib.parse.urlencode({"w": w, "q": 75, "fm": "jpg", "fit": "max"})


def main():
    out_dir = sys.argv[1]
    only = set(sys.argv[2:])
    styles = json.load(open(os.path.join(HERE, "styles.json")))
    path = os.path.join(out_dir, "unsplash.json")
    got = json.load(open(path)) if os.path.exists(path) else {}
    queries = json.load(open(os.path.join(HERE, "unsplash_queries.json")))
    redo = {"crew-cut", "butch-cut", "flat-top", "fringe", "box-braids", "shag", "burst-fade"}
    jobs = [(sid, queries.get(sid, q)) for kind in ("beard", "hair") for sid, _n, q, _c in styles[kind]]
    jobs.sort(key=lambda j: j[0] in redo)  # new styles first, re-searches last
    for sid, q in jobs:
        if (only and sid not in only) or (not only and sid in got and sid not in redo):
            continue
        results, left = search(q)
        tdir = os.path.join(out_dir, "thumbs", sid)
        os.makedirs(tdir, exist_ok=True)
        for f in os.listdir(tdir):
            if f.startswith("u"):
                os.remove(os.path.join(tdir, f))
        kept = []
        for r in results:
            try:
                data = urllib.request.urlopen(urllib.request.Request(thumb(r["urls"]["raw"], 300)), timeout=40).read()
            except Exception:
                continue
            open(os.path.join(tdir, "u%02d.jpg" % len(kept)), "wb").write(data)
            kept.append({
                "src": "unsplash", "id": r["id"], "raw": r["urls"]["raw"],
                "alt": r.get("alt_description") or "", "w": r["width"], "h": r["height"],
                "author": r["user"]["name"], "author_url": r["user"]["links"]["html"],
                "page": r["links"]["html"], "download_location": r["links"]["download_location"],
            })
        got[sid] = kept
        json.dump(got, open(path, "w"), indent=1)
        redo.discard(sid)
        print("done", sid, len(kept), "left", left, file=sys.stderr)


if __name__ == "__main__":
    main()
