#!/usr/bin/env zsh
# Open the live tests (test/live.html) in the browser.
# They load real URIs with the app's own code, so they need the network; see the comment in test/live.html.
# Usage: zsh scripts/test-live.zsh   (Ctrl-C stops the local server)
set -euo pipefail
cd "${0:A:h}/.."
port=8765
( sleep 1; open "http://localhost:$port/test/live.html" ) &
exec python3 -m http.server $port --bind 127.0.0.1
