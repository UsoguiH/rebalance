#!/usr/bin/env bash
# Create a new launch-video project from the template and install everything it needs.
# Usage: bash new_project.sh <project-dir>
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE="$HERE/../assets/template"
DEST="${1:?usage: new_project.sh <project-dir>}"

mkdir -p "$DEST"
# copy the template without node_modules / renders
(cd "$TEMPLATE" && tar --exclude=./node_modules --exclude=./renders --exclude='./public/fonts/*.woff2' -cf - .) | (cd "$DEST" && tar -xf -)
printf '// Written by scripts/fetch_fonts.py. Fonts stored in public/fonts so rendering works offline.\nexport const LOCAL_FONTS: { family: string; weight: string; style: string; file: string; unicodeRange: string | null }[] = [];\n' > "$DEST/src/fonts.generated.ts"
mkdir -p "$DEST"/public/{brand,shots,logos,images,vo,music,sfx,fonts,ref} "$DEST/renders"

echo "• Node packages (Remotion, Playwright core)…"
(cd "$DEST" && npm install --no-audit --no-fund --loglevel=error)

echo "• Python packages…"
python3 - <<'EOF' || true
import importlib, subprocess, sys
need = {"numpy": "numpy", "PIL": "pillow", "requests": "requests", "edge_tts": "edge-tts", "yt_dlp": "yt-dlp", "imageio_ffmpeg": "imageio-ffmpeg"}
missing = [pkg for mod, pkg in need.items() if importlib.util.find_spec(mod) is None]
if missing:
    print("  installing", " ".join(missing))
    r = subprocess.run([sys.executable, "-m", "pip", "install", "-q", *missing])
    if r.returncode:
        subprocess.run([sys.executable, "-m", "pip", "install", "-q", "--user", *missing])
EOF

echo "• Fonts…"
python3 "$HERE/fetch_fonts.py" --project "$DEST" --from-spec | tail -1

echo
echo "Project ready: $DEST"
for k in ELEVENLABS_API_KEY OPENAI_API_KEY UNSPLASH_ACCESS_KEY PEXELS_API_KEY; do
  if [ -n "${!k:-}" ]; then echo "  ✓ $k set"; else echo "  · $k not set (optional)"; fi
done
command -v ffmpeg >/dev/null && echo "  ✓ ffmpeg on PATH" || echo "  · using bundled ffmpeg (imageio-ffmpeg)"
