#!/usr/bin/env bash
set -euo pipefail

go run ./gen

# dist/'s images aren't compared here: rasterizing can differ by a shade on a
# pixel or two between CPU architectures, so a Mac-generated PNG never matches
# a CI-generated one byte for byte. internal/assets' tests compare them pixel
# by pixel within a tolerance instead. Its text files (SVG, CSS) are
# deterministic.
if ! git diff --exit-code --stat -- 'dist/*.svg' 'dist/*.css'; then
  echo
  echo "dist/ is out of date - run mise run gen and commit the result." >&2
  exit 1
fi

added=$(git ls-files --others --exclude-standard -- dist)
removed=$(git diff --name-only --diff-filter=D -- dist)
if [ -n "$added$removed" ]; then
  echo "dist/ gained or lost files - run mise run gen and commit the result:" >&2
  printf '%s\n' "$added" "$removed" | sed '/^$/d' >&2
  exit 1
fi
