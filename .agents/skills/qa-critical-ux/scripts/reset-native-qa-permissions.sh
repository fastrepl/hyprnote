#!/usr/bin/env bash

set -euo pipefail

[[ $# -eq 1 && ( "$1" == "dev" || "$1" == "staging" ) ]] || {
  echo "Usage: $0 <dev|staging>" >&2
  exit 2
}

[[ "$(uname -s)" == "Darwin" ]] || {
  echo "Native QA permission reset requires macOS." >&2
  exit 1
}

qa_channel="$1"
qa_bundle_id="com.hyprnote.$qa_channel"
qa_process_status=0
pgrep -x "anarlog-$qa_channel" >/dev/null || qa_process_status=$?
case "$qa_process_status" in
  0)
    echo "Quit Anarlog $qa_channel before resetting permissions." >&2
    exit 1
    ;;
  1) ;;
  *)
    echo "Could not determine whether Anarlog $qa_channel is running." >&2
    exit 1
    ;;
esac

# Reset before LaunchServices starts the process that will request permission.
for qa_service in Microphone AudioCapture ScreenCapture Accessibility Calendar Reminders; do
  tccutil reset "$qa_service" "$qa_bundle_id"
done

echo "Permissions reset for $qa_bundle_id. Launch normally, without --onboarding or ONBOARDING."
