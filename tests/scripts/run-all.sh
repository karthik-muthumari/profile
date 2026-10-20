#!/usr/bin/env bash
# Full QA matrix: isolated build + gates + e2e for root and /my-profile. Logs -> tests/evidence/
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"; T="$ROOT/tests"; WORK="${QA_WORK:-${TMPDIR:-/tmp}/qa-work}"; EV="$T/evidence"; mkdir -p "$EV"
rc=0
for mode in root sub; do
  if [ $mode = root ]; then BASE=""; PORT=4173; else BASE="/my-profile"; PORT=4174; fi
  L="$EV/$mode"; mkdir -p "$L"
  "$T/scripts/build-isolated.sh" "$WORK/$mode" "$BASE" > "$L/build.txt" 2>&1 || { echo "BUILD FAIL ($mode)"; rc=1; continue; }
  OUT="$WORK/$mode/out"
  node "$T/scripts/check-paths.mjs" "$OUT" --base "$BASE" > "$L/check-paths.txt" 2>&1 || rc=1
  node "$T/scripts/check-export.mjs" "$OUT" --base "$BASE" > "$L/check-export.txt" 2>&1 || rc=1
  node "$T/scripts/negative-controls.mjs" "$OUT" --base "$BASE" > "$L/negative-controls.txt" 2>&1 || rc=1
  QUIET=1 node "$T/scripts/serve.mjs" "$OUT" $PORT --base "$BASE" > /dev/null 2>&1 & SP=$!
  sleep 1
  { for u in "$BASE/" "/_next/static/" "$BASE/blog/" "$BASE/nope/" "$BASE/404.html"; do printf "%s %s\n" "$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT$u")" "$u"; done
    echo "no-JS SSR check, occurrences of 'Karthik' in /: $(curl -s "http://127.0.0.1:$PORT$BASE/" | grep -c Karthik)"; } > "$L/curl-probes.txt"
  node "$T/scripts/e2e.mjs" "http://127.0.0.1:$PORT" --base "$BASE" --out "$T/screenshots/$mode" > "$L/e2e.txt" 2>&1 || rc=1
  kill $SP 2>/dev/null
  echo "== $mode: $(tail -1 "$L/check-paths.txt") | $(tail -1 "$L/check-export.txt") | $(tail -1 "$L/negative-controls.txt") | $(tail -1 "$L/e2e.txt")"
done
exit $rc
