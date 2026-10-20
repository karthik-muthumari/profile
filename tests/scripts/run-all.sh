#!/usr/bin/env bash
# Full QA matrix. For every base-path mode: isolated build -> check-paths -> check-export -> negative controls -> curl probes
# -> e2e (round 1) -> e2e-round2 -> e2e-hero (Chromium + WebKit if installed) -> artifact-detect.   Logs -> tests/evidence/<mode>/
#   modes:  root = ''   |   sub = /my-profile   |   prof = /profile  (the real GitHub Pages URL https://karthik-muthumari.github.io/profile/)
#   QA_MODES="prof" tests/scripts/run-all.sh        run a subset;   QA_WORK=dir  isolated build dir;   QA_QUICK=1  fewer viewports
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"; T="$ROOT/tests"; WORK="${QA_WORK:-${TMPDIR:-/tmp}/qa-work}"; EV="$T/evidence"; mkdir -p "$EV"
MODES="${QA_MODES:-root sub prof}"
QUICK=""; [ "${QA_QUICK:-}" = 1 ] && QUICK="--quick"
rc=0
PIDS=""; trap 'for p in $PIDS; do kill $p 2>/dev/null; done' EXIT

# WebKit available? (npx playwright install webkit)
HAVE_WK=0; ( cd "$T" && node -e "const {webkit}=require('playwright-core');process.exit(require('fs').existsSync(webkit.executablePath())?0:1)" ) 2>/dev/null && HAVE_WK=1

# negative controls of the browser-level checks (no build needed)
node "$T/scripts/negative-controls-r2.mjs" > "$EV/negative-controls-r2.txt" 2>&1 || rc=1
node "$T/scripts/negative-controls-artifacts.mjs" > "$EV/negative-controls-artifacts.txt" 2>&1 || rc=1
echo "== neg-controls(r2): $(tail -1 "$EV/negative-controls-r2.txt") | neg-controls(artifacts): $(tail -1 "$EV/negative-controls-artifacts.txt")"

for mode in $MODES; do
  case $mode in root) BASE=""; PORT=4173;; sub) BASE="/my-profile"; PORT=4174;; prof) BASE="/profile"; PORT=4175;; *) echo "unknown mode $mode"; rc=1; continue;; esac
  L="$EV/$mode"; mkdir -p "$L"; S="$T/screenshots/$mode"; mkdir -p "$S"
  "$T/scripts/build-isolated.sh" "$WORK/$mode" "$BASE" > "$L/build.txt" 2>&1 || { echo "BUILD FAIL ($mode)"; rc=1; continue; }
  OUT="$WORK/$mode/out"
  node "$T/scripts/check-paths.mjs" "$OUT" --base "$BASE" > "$L/check-paths.txt" 2>&1 || rc=1
  node "$T/scripts/check-export.mjs" "$OUT" --base "$BASE" > "$L/check-export.txt" 2>&1 || rc=1
  node "$T/scripts/negative-controls.mjs" "$OUT" --base "$BASE" > "$L/negative-controls.txt" 2>&1 || rc=1
  QUIET=1 node "$T/scripts/serve.mjs" "$OUT" $PORT --base "$BASE" > /dev/null 2>&1 & SP=$!; PIDS="$PIDS $SP"
  sleep 1
  { for u in "$BASE/" "/_next/static/" "$BASE/blog/" "$BASE/nope/" "$BASE/404.html"; do printf "%s %s\n" "$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT$u")" "$u"; done
    echo "no-JS SSR check, occurrences of 'Karthik' in /: $(curl -s "http://127.0.0.1:$PORT$BASE/" | grep -c Karthik)"; } > "$L/curl-probes.txt"
  O="http://127.0.0.1:$PORT"
  node "$T/scripts/e2e.mjs" "$O" --base "$BASE" --out "$S" > "$L/e2e.txt" 2>&1 || rc=1
  node "$T/scripts/e2e-round2.mjs" "$O" --base "$BASE" --out "$S/round2" > "$L/e2e-round2.txt" 2>&1 || rc=1
  node "$T/scripts/e2e-hero.mjs" "$O$BASE" --engine chromium --out "$S/round2" $QUICK > "$L/e2e-hero-chromium.txt" 2>&1 || rc=1
  if [ $HAVE_WK = 1 ]; then node "$T/scripts/e2e-hero.mjs" "$O$BASE" --engine webkit --out "$S/round2" $QUICK > "$L/e2e-hero-webkit.txt" 2>&1 || rc=1; else echo "WebKit not installed (npx playwright install webkit) - skipped" > "$L/e2e-hero-webkit.txt"; fi
  node "$T/scripts/artifact-detect.mjs" "$O$BASE" --label "$mode" --out "$L/artifacts" > "$L/artifact-detect.txt" 2>&1 || rc=1
  kill $SP 2>/dev/null
  echo "== $mode: $(tail -1 "$L/check-paths.txt") | $(tail -1 "$L/check-export.txt") | $(tail -1 "$L/negative-controls.txt") | $(tail -1 "$L/e2e.txt")"
  echo "   round2: $(tail -1 "$L/e2e-round2.txt") | hero-CR: $(tail -1 "$L/e2e-hero-chromium.txt") | hero-WK: $(tail -1 "$L/e2e-hero-webkit.txt") | artifacts: $(tail -1 "$L/artifact-detect.txt")"
done
exit $rc
