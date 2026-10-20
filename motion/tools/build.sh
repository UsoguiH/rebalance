#!/usr/bin/env bash
# One shot from a voice take to the finished film:
#   motion/tools/build.sh motion/acme                     (the take already in audio/)
#   motion/tools/build.sh motion/acme ~/Downloads/take.mp3
#   motion/tools/build.sh motion/acme --preview           (no voice yet: music only)
# Aligns the take onto the beats (align.py), mixes it over the original music at the
# original film's levels (mix.js), renders the piece with its soundtrack (render.js)
# to motion/renders/<slug>.mp4, and prints the soundtrack's loudness.
# Python is $MOTION_PY if set, else motion/.venv, else python3 (it needs faster-whisper).
set -euo pipefail
piece=${1:?usage: build.sh motion/<piece> [take]}
take=${2:-}
here=$(cd "$(dirname "$0")" && pwd)
motion=$(cd "$here/.." && pwd)
piece=$(cd "$piece" && pwd)
slug=$(basename "$piece")
py=${MOTION_PY:-}
if [ -z "$py" ]; then
  if [ -x "$motion/.venv/bin/python" ]; then py="$motion/.venv/bin/python"; else py=python3; fi
fi

if [ "$take" = "--preview" ]; then
  echo "preview: music only, words on the template's own rhythm"
  printf '// When each on-screen word is spoken, in piece seconds. Written by tools/align.py\n// from the voice take; empty until there is one.\nM.TIMING = {};\n' > "$piece/timing.js"
  node -e 'const f=process.argv[1],m=JSON.parse(require("fs").readFileSync(f));m.voice.segments=[];require("fs").writeFileSync(f,JSON.stringify(m,null,2)+"\n")' "$piece/audio/mix.json"
else
  "$py" "$here/align.py" --piece "$piece" ${take:+--take "$take"}
fi
node "$here/mix.js" --piece "$piece"
mkdir -p "$motion/renders"
rm -rf "$motion/frames/$slug"
(cd "$motion" && node tools/render.js --page "$slug/index.html" --out "frames/$slug" --audio "$slug/audio/soundtrack.mp3" --mp4 "renders/$slug.mp4")
rm -rf "$motion/frames/$slug"
ffmpeg -hide_banner -i "$motion/renders/$slug.mp4" -af ebur128 -f null - 2>&1 | grep -E '^\s+I:' | tail -1 | sed 's/^ */loudness: /'
