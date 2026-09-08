#!/usr/bin/env bash

set -euo pipefail

[[ -z "${ONBOARDING:-}" ]] || {
  echo "Reset QA permissions while the app is closed with reset-native-qa-permissions.sh dev, then launch without ONBOARDING. See the skill's Start from onboarding steps for the data reset." >&2
  exit 2
}

[[ $# -eq 1 ]] || {
  echo "Usage: $0 <app-bundle>" >&2
  exit 2
}

qa_bundle_dir="$1"
qa_open_executable="${ANARLOG_QA_OPEN_EXECUTABLE:-/usr/bin/open}"
qa_open_args=(
  -W
  --env AUDIO_SYNC_PROBE=1
  --env LISTENER_DEBUG=1
  --env NO_AEC=
  --env ONBOARDING=
)

exec "$qa_open_executable" "${qa_open_args[@]}" "$qa_bundle_dir"
