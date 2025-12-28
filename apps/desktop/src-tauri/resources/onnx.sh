#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

curl -L https://github.com/microsoft/onnxruntime/releases/download/v1.22.0/onnxruntime-osx-arm64-1.22.0.tgz \
  | tar xz && mv onnxruntime-osx-arm64-1.22.0/lib/libonnxruntime.1.22.0.dylib "$SCRIPT_DIR/libonnxruntime.dylib"

curl -L https://github.com/microsoft/onnxruntime/releases/download/v1.22.0/onnxruntime-linux-x64-1.22.0.tgz \
  | tar xz && mv onnxruntime-linux-x64-1.22.0/lib/libonnxruntime.so.1.22.0 "$SCRIPT_DIR/libonnxruntime.so"

rm -rf onnxruntime-osx-arm64-1.22.0 onnxruntime-linux-x64-1.22.0
