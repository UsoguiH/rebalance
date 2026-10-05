#!/bin/sh
# Restart the local dev server (demo payments) on :3000, tracked by a pid file.
cd "$(dirname "$0")/.." || exit 1
[ -f /tmp/azeema-dev.pid ] && kill "$(cat /tmp/azeema-dev.pid)" 2>/dev/null && sleep 1
fuser -k 3000/tcp >/dev/null 2>&1; sleep 1
DEMO_MODE=1 PORT=3000 RENDER_TOKEN=devtoken setsid node --disable-warning=ExperimentalWarning server.js > /tmp/azeema-dev.log 2>&1 &
echo $! > /tmp/azeema-dev.pid
sleep 2; cat /tmp/azeema-dev.log
