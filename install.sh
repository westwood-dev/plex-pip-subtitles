#!/usr/bin/env bash
# Build and install PiP Subtitles for Plex.
#
#   ./install.sh           build, sign (if needed) and open the .xpi in Firefox
#   ./install.sh --build   only build dist/plex-pip-subtitles-<version>.zip (for AMO upload)
#   ./install.sh --run     load it temporarily in a fresh Firefox via web-ext (no signing)
#
# Release Firefox only installs signed add-ons permanently. Signing uses
# AMO's unlisted channel through web-ext and needs API credentials from
# https://addons.mozilla.org/developers/addon/api/key/ :
#   export WEB_EXT_API_KEY=user:12345:67   WEB_EXT_API_SECRET=...
# A signed .xpi for the current version in dist/ is reused, so bump
# "version" in src/manifest.json before signing a new build.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC="$HERE/src"
DIST="$HERE/dist"
MODE=install

case "${1:-}" in
  "") ;;
  --build) MODE=build ;;
  --run) MODE=run ;;
  -h|--help) sed -n '2,13p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
  *) echo "Unknown option: $1" >&2; exit 1 ;;
esac

VERSION="$(sed -n 's/^ *"version": *"\([^"]*\)".*/\1/p' "$SRC/manifest.json" | head -1)"
[[ -n "$VERSION" ]] || { echo "Couldn't read version from src/manifest.json" >&2; exit 1; }
mkdir -p "$DIST"

if [[ $MODE == run ]]; then
  exec npx --yes web-ext run --source-dir "$SRC" --url https://app.plex.tv
fi

ZIP="$DIST/plex-pip-subtitles-$VERSION.zip"
rm -f "$ZIP"
cp "$HERE/LICENSE" "$SRC/LICENSE"
trap 'rm -f "$SRC/LICENSE"' EXIT
(cd "$SRC" && zip -qrX "$ZIP" . -x '.*' -x '*/.*')
echo "Built $ZIP"
[[ $MODE == build ]] && exit 0

XPI="$(ls -t "$DIST"/*-"$VERSION".xpi 2>/dev/null | head -1 || true)"
if [[ -z "$XPI" ]]; then
  if [[ -z "${WEB_EXT_API_KEY:-}" || -z "${WEB_EXT_API_SECRET:-}" ]]; then
    cat >&2 <<EOF
No signed .xpi for v$VERSION in dist/, and WEB_EXT_API_KEY / WEB_EXT_API_SECRET
aren't set, so it can't be signed. Either:
  - set them and re-run (see the header of this script), or
  - run ./install.sh --run to try it temporarily, or
  - load src/manifest.json from about:debugging#/runtime/this-firefox.
EOF
    exit 1
  fi
  echo "Signing v$VERSION on AMO (unlisted channel)…"
  npx --yes web-ext sign --channel=unlisted --source-dir "$SRC" --artifacts-dir "$DIST"
  XPI="$(ls -t "$DIST"/*-"$VERSION".xpi | head -1)"
fi

echo "Opening $XPI in Firefox — confirm the install prompt there."
case "$(uname -s)" in
  Darwin) open -a Firefox "$XPI" ;;
  *) firefox "$XPI" & ;;
esac
