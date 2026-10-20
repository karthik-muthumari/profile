#!/usr/bin/env bash
# Build the site in an isolated copy of the repo so QA builds never race with a developer's `out/`.
#   tests/scripts/build-isolated.sh <workdir> [base-path]     -> <workdir>/out
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
WORK="$1"; BASE="${2:-}"
rm -rf "$WORK"; mkdir -p "$WORK"
rsync -a --exclude node_modules --exclude .next --exclude out --exclude pics --exclude tests --exclude .git "$ROOT/" "$WORK/"
ln -s "$ROOT/node_modules" "$WORK/node_modules"
cd "$WORK"
NEXT_PUBLIC_BASE_PATH="$BASE" npx next build > build.log 2>&1 || { tail -40 build.log; exit 1; }
touch out/.nojekyll
echo "built $WORK/out (base='$BASE')"
