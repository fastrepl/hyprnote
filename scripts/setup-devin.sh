#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=========================================="
echo "Hyprnote Development Environment Setup"
echo "=========================================="
echo ""

# Detect OS
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
  echo "Detected Linux environment"
  echo ""
  
  # Install Tauri prerequisites
  echo "Step 1/3: Installing Tauri prerequisites..."
  bash "$SCRIPT_DIR/setup-linux-tauri.sh"
  echo ""
  
  # Install other Linux dependencies
  echo "Step 2/3: Installing other Linux dependencies..."
  bash "$SCRIPT_DIR/setup-linux-others.sh"
  echo ""
  
  # Install development tools
  echo "Step 3/3: Installing development tools..."
  bash "$SCRIPT_DIR/setup-devtools.sh"
  echo ""
  
  echo "=========================================="
  echo "Setup completed successfully!"
  echo "=========================================="
  echo ""
  echo "Note: You may need to restart your shell or run:"
  echo "  export PATH=\"\$HOME/.dprint/bin:\$PATH\""
  echo "to use dprint immediately."
  
elif [[ "$OSTYPE" == "darwin"* ]]; then
  echo "macOS detected. This script is currently designed for Linux environments."
  echo "For macOS setup, please refer to the project documentation."
  exit 1
else
  echo "Unsupported OS: $OSTYPE"
  echo "This script is currently designed for Linux environments."
  exit 1
fi
