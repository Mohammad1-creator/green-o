#!/usr/bin/env bash
# On a failed CI job, turns the tail of each log in ci-logs/ into an error
# annotation. Annotations are readable through the public API without signing
# in, which makes failures debuggable from anywhere.
set -uo pipefail

dir=${1:-ci-logs}
count=0
for log in "$dir"/*.log; do
  [[ -f "$log" ]] || continue
  ((count >= 9)) && break
  body=$(tail -n "${LINES_PER_LOG:-60}" "$log" | node scripts/ci/redact.mjs | cut -c1-300)
  [[ -n "$body" ]] || continue
  # Workflow commands need %, CR and LF escaped.
  body=${body//'%'/'%25'}
  body=${body//$'\r'/'%0D'}
  body=${body//$'\n'/'%0A'}
  echo "::error title=$(basename "$log")::${body:0:3500}"
  count=$((count + 1))
done
