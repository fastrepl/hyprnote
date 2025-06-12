#!/bin/bash

# Start the patch monitor in background
./fix_cmake.sh &
PATCH_PID=$!

# Function to cleanup
cleanup() {
    echo "Cleaning up..."
    kill $PATCH_PID 2>/dev/null
    exit
}

# Set trap to cleanup on exit
trap cleanup EXIT INT TERM

# Run the build
GGML_NATIVE=OFF CMAKE_C_FLAGS="-mcpu=apple-m1" CMAKE_CXX_FLAGS="-mcpu=apple-m1" CC=clang CXX=clang++ CFLAGS="-mcpu=apple-m1" CXXFLAGS="-mcpu=apple-m1" CARGO_BUILD_TARGET=aarch64-apple-darwin pnpm exec turbo -F @hypr/desktop tauri:dev 