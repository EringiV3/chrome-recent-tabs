#!/usr/bin/env bash
# Resize store screenshots to Chrome Web Store required 1280x800.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/store-assets/source"
OUT="$ROOT/store-assets"
ASSETS_DIR="${ASSETS_DIR:-$HOME/.cursor/projects/Users-kodai-repos-recent-tabs-chrome-devtool/assets}"

mkdir -p "$SRC" "$OUT"

copy_if_exists() {
  local dest_name="$1"
  local src_name="$2"
  local src_path="$ASSETS_DIR/$src_name"
  if [[ -f "$src_path" ]]; then
    cp "$src_path" "$SRC/$dest_name"
  elif [[ ! -f "$SRC/$dest_name" ]]; then
    echo "Warning: missing source screenshot $src_name" >&2
  fi
}

copy_if_exists "01-settings-popup.png" "__________2026-05-21_13.24.43-fc953737-ed38-4976-8938-36eb3b356cc9.png"
copy_if_exists "02-shortcuts.png" "__________2026-05-21_13.25.10-59646634-e52d-44cf-9268-a4aa9e48c7ec.png"
copy_if_exists "03-switcher-horizontal.png" "__________2026-05-21_13.26.19-d093bfcc-69ce-4b47-a9ce-90748d2904f0.png"
copy_if_exists "04-switcher-vertical.png" "__________2026-05-21_13.27.16-3b1bc977-70b6-4706-b8f1-4fce53a1a412.png"

for file in "$SRC"/*.png; do
  [[ -f "$file" ]] || continue
  base="$(basename "$file" .png)"
  tmp="$OUT/.tmp-$base.png"
  final="$OUT/$base-1280x800.png"

  cp "$file" "$tmp"
  sips -Z 1280 "$tmp" >/dev/null
  sips -p 800 1280 --padColor 0e0e11 "$tmp" >/dev/null
  mv "$tmp" "$final"
  echo "Created $final"
done
