#!/usr/bin/env bash
# Waits until CI has published results for a commit to the ci-results branch,
# then prints the summary and the list of log files.
#
# Usage: scripts/ci-wait.sh [commit]     (default: HEAD)
# Read a log afterwards with:
#   git show origin/ci-results:runs/<run>-<sha>/<job>/<file>
set -euo pipefail

sha=$(git rev-parse "${1:-HEAD}")
deadline=$((SECONDS + ${CI_WAIT_SECONDS:-2400}))

while ((SECONDS < deadline)); do
  if git fetch -q origin ci-results 2>/dev/null; then
    dir=$(git ls-tree --name-only origin/ci-results runs/ 2>/dev/null | grep -- "-${sha}$" | sort -t- -k1,1n | tail -n 1 || true)
    if [[ -n "$dir" ]]; then
      echo "== $dir"
      git show "origin/ci-results:$dir/summary.txt"
      echo
      echo "== files"
      git ls-tree -r --name-only origin/ci-results "$dir/" | sed "s|^$dir/||"
      exit 0
    fi
  fi
  sleep 30
done

echo "No CI results for $sha yet."
exit 1
