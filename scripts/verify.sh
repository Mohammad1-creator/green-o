#!/usr/bin/env bash
# Everything CI's "checks" job runs, locally, stopping at the first failure.
# Run before every push:  bash scripts/verify.sh
set -euo pipefail

run() {
  echo "== $*"
  "$@" > /tmp/verify-step.log 2>&1 || {
    tail -n 40 /tmp/verify-step.log
    echo "FAILED: $*"
    exit 1
  }
}

run npm run lint
run npm run typecheck
run npm run format:check
run npm test
run npm run build
run npm run check:secrets
echo "All checks passed."
