#!/usr/bin/env python3
"""Turn credits.json into credits.md (asset list + lines to paste into the video description).
Usage: python credits.py --project DIR"""
import argparse
import json
import os

ap = argparse.ArgumentParser()
ap.add_argument("--project", required=True)
a = ap.parse_args()
p = os.path.join(a.project, "credits.json")
items = json.load(open(p)) if os.path.exists(p) else []
lines = ["# Credits and licences", "", "| File | What | Source | Licence |", "|---|---|---|---|"]
for c in items:
    lines.append(f"| {c.get('file', '')} | {c.get('what', '')} | {c.get('credit') or c.get('source', '')} | {c.get('license', '')} |")
need = [c for c in items if str(c.get("license", "")).upper().startswith("CC BY")]
lines += ["", "## Paste into the video description", ""]
lines += [f"- {c.get('credit') or c.get('what')} ({c.get('source', '')})" for c in need] or ["(nothing requires attribution)"]
lines += ["", "Brand names and logos belong to their owners.", ""]
open(os.path.join(a.project, "credits.md"), "w").write("\n".join(lines))
print("\n".join(lines))
