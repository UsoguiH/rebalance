#!/usr/bin/env python3
"""Get reference videos (YouTube, X/Twitter, Vimeo, Instagram, TikTok, direct .mp4, or local files)
and run the frame-by-frame study on each.

Output per video: <out>/<name>.mp4 and <out>/study/<name>/ (report.md, analysis.json, timeline.png, sheets/*.jpg)
plus <out>/references.json listing what worked and what did not.

Usage:
  python fetch_reference.py --out DIR URL_OR_FILE [URL_OR_FILE ...] [--cookies cookies.txt | --cookies-from-browser chrome] [--transcribe]

If a site refuses (YouTube "sign in to confirm you're not a bot", Vimeo "logged-in only"), the script prints
the title and the fixes; the same video is often also posted on X, Vimeo, Behance or the maker's site.
"""
import argparse
import json
import os
import re
import shutil
import subprocess
import sys

sys.path.insert(0, os.path.dirname(__file__))
from _common import ffmpeg_bin, write_json  # noqa: E402


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")[:50] or "ref"


def title_of(url):
    try:
        import requests

        if "youtu" in url:
            r = requests.get("https://www.youtube.com/oembed", params={"url": url, "format": "json"}, timeout=20)
            if r.ok:
                d = r.json()
                return f"{d['title']} | {d['author_name']}"
        if "vimeo.com" in url:
            r = requests.get("https://vimeo.com/api/oembed.json", params={"url": url}, timeout=20)
            if r.ok:
                d = r.json()
                return f"{d['title']} | {d.get('author_name', '')}"
    except Exception:  # noqa: BLE001
        pass
    return None


def yt_title(url):
    r = subprocess.run([sys.executable, "-m", "yt_dlp", "--no-warnings", "--skip-download", "--print", "%(title)s", url],
                       capture_output=True, text=True, timeout=120)
    return r.stdout.strip().splitlines()[0][:80] if r.returncode == 0 and r.stdout.strip() else None


def download(url, out_dir, cookies=None, browser=None):
    try:
        import yt_dlp  # noqa: F401
    except ImportError:
        subprocess.run([sys.executable, "-m", "pip", "install", "-q", "yt-dlp"], check=False)
    ff_dir = ffmpeg_bin()  # yt-dlp accepts the binary path (bundled ffmpeg has a versioned filename)
    tmpl = os.path.join(out_dir, "%(extractor_key)s-%(id)s.%(ext)s")
    base = [sys.executable, "-m", "yt_dlp", "--no-warnings", "--no-playlist", "--ffmpeg-location", ff_dir,
            "-f", "bv*[height<=1080][ext=mp4]+ba[ext=m4a]/bv*[height<=1080]+ba/b[height<=1080]/b",
            "--merge-output-format", "mp4", "-o", tmpl, "--print", "after_move:filepath"]
    if cookies:
        base += ["--cookies", cookies]
    if browser:
        base += ["--cookies-from-browser", browser]
    attempts = [[]]
    if "youtu" in url:
        attempts += [["--extractor-args", "youtube:player_client=web_safari,mweb"], ["--extractor-args", "youtube:player_client=tv_simply"]]
    err = ""
    for extra in attempts:
        r = subprocess.run(base + extra + [url], capture_output=True, text=True)
        path = (r.stdout.strip().splitlines() or [""])[-1]
        if path and os.path.exists(path):
            return path, None
        err = (r.stderr or r.stdout)[-600:]
    return None, err


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("items", nargs="+")
    ap.add_argument("--out", required=True)
    ap.add_argument("--cookies")
    ap.add_argument("--cookies-from-browser")
    ap.add_argument("--transcribe", action="store_true")
    ap.add_argument("--no-study", action="store_true")
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    results = []
    for item in a.items:
        entry = {"input": item}
        if os.path.exists(item):
            name = slug(os.path.splitext(os.path.basename(item))[0])
            path = os.path.join(a.out, name + os.path.splitext(item)[1])
            if os.path.abspath(item) != os.path.abspath(path):
                shutil.copy(item, path)
        else:
            entry["title"] = title_of(item) or yt_title(item)
            path, err = download(item, a.out, a.cookies, a.cookies_from_browser)
            if not path:
                entry["error"] = err.strip().splitlines()[-1] if err else "download failed"
                print(f"\n!! Could not download {item}\n   title: {entry.get('title')}\n   reason: {entry['error']}")
                print("   Fixes, easiest first:\n"
                      "   1. Search the web for the title: the same video is often on X/Twitter, Vimeo, Behance, LinkedIn or the maker's site.\n"
                      "   2. Ask the user for the .mp4 file (or to download it on their own computer: yt-dlp URL).\n"
                      "   3. Pass a cookies.txt exported from a logged-in browser: --cookies cookies.txt (or --cookies-from-browser chrome on their machine).")
                results.append(entry)
                continue
            name = slug(entry.get("title") or os.path.splitext(os.path.basename(path))[0])
            new = os.path.join(a.out, name + ".mp4")
            if path != new:
                os.replace(path, new)
            path = new
        entry["file"] = path
        if not a.no_study:
            study = os.path.join(a.out, "study", name)
            cmd = [sys.executable, os.path.join(os.path.dirname(__file__), "analyze_reference.py"), path, "--out", study]
            if a.transcribe:
                cmd.append("--transcribe")
            subprocess.run(cmd, check=False)
            entry["study"] = study
        results.append(entry)
    write_json(os.path.join(a.out, "references.json"), results)
    ok = [r for r in results if "file" in r]
    print(f"\n{len(ok)}/{len(results)} references ready. Summary: {os.path.join(a.out, 'references.json')}")
    for r in ok:
        if "study" in r:
            print(f"  read {r['study']}/report.md, then look at timeline.png and every sheets/*.jpg")


if __name__ == "__main__":
    main()
