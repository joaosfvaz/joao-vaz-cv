#!/bin/sh
# Prints cv/index.html, the condensed one-page CV, to joao-vaz-cv.pdf,
# the file behind "Download CV". The page is made for paper (cv.css), so
# the PDF is that page, on one A4 page.
#
# Run it after any change to the CV's content, then commit the PDF:
#   sh make-cv.sh
# It serves this folder on its own port while Chrome prints, then stops.
set -e
cd "$(dirname "$0")"
PORT=4620
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
PROFILE="$(mktemp -d)"

python3 dev-server.py "$PORT" >/dev/null 2>&1 &
SERVER=$!
trap 'kill "$SERVER" 2>/dev/null; wait "$SERVER" 2>/dev/null || true; rm -rf "$PROFILE"' EXIT
sleep 1

"$CHROME" --headless=new --disable-gpu --no-pdf-header-footer \
  --user-data-dir="$PROFILE" --virtual-time-budget=8000 \
  --print-to-pdf="joao-vaz-cv.pdf" "http://localhost:$PORT/cv/" >/dev/null 2>&1

echo "joao-vaz-cv.pdf: $(du -k joao-vaz-cv.pdf | cut -f1) KB"
