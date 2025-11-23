#!/usr/bin/env bash
set -euo pipefail

sudo apt update
sudo apt-get install -y \
  libwebkit2gtk-4.1-dev \
  build-essential \
  curl \
  wget \
  file \
  libxdo-dev \
  libssl-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  libgtk-3-dev \
  libgtk-4-dev \
  libasound2-dev \
  libpulse-dev \
  libgraphene-1.0-dev \
  pkg-config \
  patchelf
