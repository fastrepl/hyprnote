#!/usr/bin/env bash
set -euo pipefail

# Setup script for desktop E2E tests
# See https://v2.tauri.app/develop/tests/webdriver/#linux
# for recommended WebDriver setup instructions

# Exit if not running on Linux
if [[ "$(uname -s)" != "Linux" ]]; then
  echo "Error: This script only supports Linux. Current OS: $(uname -s)"
  exit 1
fi

echo "Setting up desktop E2E test environment..."

# Install tauri-driver if not already installed
if ! command -v tauri-driver >/dev/null 2>&1; then
  echo "Installing tauri-driver..."
  cargo install tauri-driver --locked
else
  echo "tauri-driver already installed"
fi

# Install WebKitWebDriver if not already installed
if ! command -v WebKitWebDriver >/dev/null 2>&1; then
  echo "Installing WebKitWebDriver..."
  sudo apt-get update
  sudo apt-get install -y webkit2gtk-driver
else
  echo "WebKitWebDriver already installed"
fi

echo "Desktop E2E test environment setup complete"
