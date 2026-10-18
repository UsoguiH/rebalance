#!/bin/sh
# Downloads "Reign" by Kevin MacLeod (incompetech.com), CC BY 4.0.
set -e
cd "$(dirname "$0")"
mkdir -p audio/music
curl -fsSL -o audio/music/Reign.mp3 "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Reign.mp3"
