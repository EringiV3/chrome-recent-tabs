#!/usr/bin/env bash
# Build and create a Chrome Web Store upload ZIP.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

npm run build

VERSION="$(node -p "require('./manifest.json').version")"
ZIP="recent-tabs-switcher-v${VERSION}.zip"

rm -f "$ZIP"
zip -r "$ZIP" \
  manifest.json \
  content.css \
  options.html \
  popup.html \
  icons/ \
  dist/ \
  -x '*/.*'

echo "Created $ZIP ($(du -h "$ZIP" | cut -f1))"
