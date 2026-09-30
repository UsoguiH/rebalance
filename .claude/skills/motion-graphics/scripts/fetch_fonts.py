#!/usr/bin/env python3
"""Download Google Fonts into the project so renders never depend on the network.

Writes public/fonts/*.woff2 and src/fonts.generated.ts (read by src/fonts.ts).

Usage:
  python fetch_fonts.py --project DIR "Inter" "Instrument Serif" "IBM Plex Sans Arabic"
  python fetch_fonts.py --project DIR --from-spec      # fonts named in src/video.json
"""
import argparse
import json
import os
import re
import sys

import requests

sys.path.insert(0, os.path.dirname(__file__))
from _common import read_json  # noqa: E402

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) "
      "Chrome/128.0 Safari/537.36")
KEEP_SUBSETS = {"latin", "latin-ext", "arabic"}
WEIGHTS = "300;400;500;600;700;800"


def css_for(family):
    fam = family.replace(" ", "+")
    for query in (f"family={fam}:ital,wght@0,{WEIGHTS.replace(';', ';0,')};1,400", f"family={fam}:wght@{WEIGHTS}", f"family={fam}"):
        r = requests.get(f"https://fonts.googleapis.com/css2?{query}&display=swap", headers={"User-Agent": UA}, timeout=30)
        if r.ok and "@font-face" in r.text:
            return r.text
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("families", nargs="*")
    ap.add_argument("--project", required=True)
    ap.add_argument("--from-spec", action="store_true")
    a = ap.parse_args()

    families = list(a.families)
    if a.from_spec:
        spec = read_json(os.path.join(a.project, "src", "video.json"))
        b = spec.get("brand", {})
        families += [f for f in (b.get("font"), b.get("displayFont")) if f]
        families.append("IBM Plex Sans Arabic" if b.get("rtl") else "Inter")  # fallback family
    families = list(dict.fromkeys(families))

    out_dir = os.path.join(a.project, "public", "fonts")
    os.makedirs(out_dir, exist_ok=True)
    gen_path = os.path.join(a.project, "src", "fonts.generated.ts")
    entries = []
    if os.path.exists(gen_path):  # keep fonts fetched earlier
        m = re.search(r"=\s*(\[.*\]);", open(gen_path, encoding="utf-8").read(), re.S)
        if m:
            entries = [e for e in json.loads(m.group(1)) if e["family"] not in families]

    for fam in families:
        css = css_for(fam)
        if not css:
            print(f"!! {fam}: not found on Google Fonts (put the brand's own .woff2 in public/fonts/{fam}.woff2)")
            continue
        n = 0
        for subset, block in re.findall(r"/\*\s*([\w-]+)\s*\*/\s*(@font-face\s*{[^}]*})", css):
            if subset not in KEEP_SUBSETS:
                continue
            url = re.search(r"url\((https://[^)]+)\)", block).group(1)
            weight = re.search(r"font-weight:\s*(\d+)", block).group(1)
            style = re.search(r"font-style:\s*(\w+)", block).group(1)
            ur = re.search(r"unicode-range:\s*([^;]+);", block)
            fname = f"{fam.lower().replace(' ', '-')}-{weight}-{style}-{subset}.woff2"
            path = os.path.join(out_dir, fname)
            if not os.path.exists(path):
                r = requests.get(url, headers={"User-Agent": UA}, timeout=60)
                r.raise_for_status()
                open(path, "wb").write(r.content)
            entries.append({"family": fam, "weight": weight, "style": style, "file": f"fonts/{fname}",
                            "unicodeRange": ur.group(1).strip() if ur else None})
            n += 1
        print(f"ok {fam}: {n} files")

    with open(gen_path, "w", encoding="utf-8") as f:
        f.write("// Written by scripts/fetch_fonts.py. Fonts stored in public/fonts so rendering works offline.\n")
        f.write("export const LOCAL_FONTS: { family: string; weight: string; style: string; file: string; unicodeRange: string | null }[] = ")
        f.write(json.dumps(entries, indent=1) + ";\n")
    print(f"Wrote {gen_path} ({len(entries)} font files)")


if __name__ == "__main__":
    main()
