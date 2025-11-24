#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

curl -L https://github.com/microsoft/onnxruntime/releases/download/v1.23.1/onnxruntime-osx-arm64-1.23.1.tgz \
  | tar xz && mv onnxruntime-osx-arm64-1.23.1/lib/libonnxruntime.1.23.1.dylib "$SCRIPT_DIR/libonnxruntime.dylib"

curl -L https://github.com/microsoft/onnxruntime/releases/download/v1.23.1/onnxruntime-linux-x64-1.23.1.tgz \
  | tar xz && mv onnxruntime-linux-x64-1.23.1/lib/libonnxruntime.so.1.23.1 "$SCRIPT_DIR/libonnxruntime.so"
