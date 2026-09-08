#!/usr/bin/env bash
set -euo pipefail

candidate_sha="${1:?Expected candidate SHA}"
if [[ ! "$candidate_sha" =~ ^[0-9a-f]{40}$ ]]; then
  echo "Candidate must be a full lowercase commit SHA" >&2
  exit 1
fi
if [[ "$(git rev-parse HEAD)" != "$candidate_sha" || "${GITHUB_SHA:-$candidate_sha}" != "$candidate_sha" ]]; then
  echo "Checkout and workflow must match the candidate SHA" >&2
  exit 1
fi
if ! git merge-base --is-ancestor "$candidate_sha" origin/main; then
  echo "Candidate must be merged into main" >&2
  exit 1
fi
