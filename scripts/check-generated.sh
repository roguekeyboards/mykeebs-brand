#!/usr/bin/env bash
set -euo pipefail

npm run --silent gen

# dist/'s images aren't compared here: their bytes can vary with the zlib doing the
# compressing. The tests compare them pixel by pixel instead.
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
