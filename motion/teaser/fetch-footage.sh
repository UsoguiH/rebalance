#!/bin/sh
# Download the real-life stock clips the teaser cuts between.
# All clips are from Mixkit (https://mixkit.co) under the Mixkit Stock Video
# Free License: free for commercial and personal projects, no attribution
# required, but the clips may not be redistributed on their own, so they are
# fetched here instead of being committed.
set -e
cd "$(dirname "$0")"
mkdir -p footage
get() { # id resolution
  [ -s "footage/$1.mp4" ] || curl -fsSL -o "footage/$1.mp4" "https://assets.mixkit.co/videos/$1/$1-$2.mp4"
}
get 26920 720   # top aerial shot of the city life at night
get 4401 1080   # crowds of people cross a street junction
get 22142 720   # reading a newspaper on the train
get 4908 1080   # person working while scrolling on social networks
get 1808 1080   # close-up shot of a person typing on a laptop
get 30386 720   # zoom-out shot of buildings and skyscrapers in NYC
echo "footage ready in $(pwd)/footage"
