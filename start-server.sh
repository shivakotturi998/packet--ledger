#!/bin/bash
# Pocket Ledger - open via localhost so notifications + service worker work.
# Browsers block notifications on file:// — use this instead of double-click.
cd "$(dirname "$0")"
PORT=8080
echo "Opening Pocket Ledger at http://localhost:$PORT/index.html"
echo "Keep this window open. Press Ctrl+C to stop."
if command -v xdg-open >/dev/null 2>&1; then
  (sleep 1 && xdg-open "http://localhost:$PORT/index.html") &
fi
python3 -m http.server $PORT
