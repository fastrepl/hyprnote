#!/usr/bin/env bash

if [ -z "${BASH_VERSION:-}" ]; then
  echo "Error: this script must be run with bash, not sh." >&2
  echo "Try: bash \"$0\"" >&2
  exit 1
fi

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ "$OSTYPE" == "linux-gnu"* ]]; then
  bash "$SCRIPT_DIR/setup-linux-tauri.sh"
  bash "$SCRIPT_DIR/setup-linux-others.sh"
  bash "$SCRIPT_DIR/setup-devtools.sh"
elif [[ "$OSTYPE" == "darwin"* ]]; then
  echo "Error: macOS is not supported by this script"
  exit 1
else
  echo "Error: Unsupported OS: $OSTYPE"
  exit 1
fi
