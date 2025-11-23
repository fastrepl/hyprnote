#!/usr/bin/env bash

if [ -z "${BASH_VERSION:-}" ]; then
  echo "Error: this script must be run with bash, not sh." >&2
  echo "Try: bash \"$0\"" >&2
  exit 1
fi

set -euo pipefail

sudo apt update
sudo apt-get install -y \
  libgtk-3-dev \
  libgtk-4-dev \
  libasound2-dev \
  libpulse-dev \
  libgraphene-1.0-dev \
  pkg-config \
  patchelf
