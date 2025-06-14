# mac-arm-build-issues Guide

This guide addresses common build issues encountered when setting up the development environment for Hyprnote.

## Issue 1: Intel Homebrew/CMake on Apple Silicon

### Symptoms
- Build errors related to `whisper-rs-sys`
- System architecture mismatch (arm64 system with x86 tools)

### Diagnosis
```bash
$ uname -m
arm64

$ which brew
/usr/local/bin/brew  # Intel(x86) version

$ which cmake
/usr/local/bin/cmake  # Intel(x86) version
```

### Solution
1. Install ARM Homebrew:
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

2. Update PATH in `.zshrc`:
```bash
echo 'export PATH="/opt/homebrew/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

3. Reinstall cmake for ARM:
```bash
brew install cmake
```

## Issue 2: dotprod Build Error

### Symptoms
Error message indicating missing 'dotprod' target feature:
```
error: always_inline function 'vdotq_s32' requires target feature 'dotprod',
but would be inlined into function 'ggml_vec_dot_q4_0_q8_0' that is compiled without support for 'dotprod'
```

### Solution
1. Disable dotprod optimizations:
```bash
export GGML_NO_ACCELERATE=1
export GGML_NO_METAL=1
export GGML_CPU_DISABLE_DOTPROD=1
```

2. If issues persist, disable all CPU optimizations:
```bash
export GGML_NO_CPU_OPTIMIZATION=1
export WHISPER_NO_CPU_OPTIMIZATION=1
```

3. Clean and rebuild:
```bash
cargo clean
CARGO_BUILD_TARGET=aarch64-apple-darwin pnpm exec turbo -F @hypr/desktop tauri:dev
```

## Issue 3: Rust/CMake Optimization Flag Conflict

### Solution
1. Set up environment variables:
```bash
export CC=clang
export CXX=clang++
export CFLAGS="-mcpu=native -O2"
export CXXFLAGS="-mcpu=native -O2"
export CMAKE_C_FLAGS="-mcpu=native"
export CMAKE_CXX_FLAGS="-mcpu=native"
export RUSTFLAGS="-C target-cpu=native"
```

2. Clean build:
```bash
cd apps/desktop/src-tauri
cargo clean
cd ../..
rm -rf node_modules/.cache
CARGO_BUILD_TARGET=aarch64-apple-darwin pnpm exec turbo -F @hypr/desktop tauri:dev
```

## Additional Notes
- Always ensure you're using the correct architecture-specific build target
- Keep your development tools (Homebrew, CMake, etc.) up to date
- When in doubt, perform a clean build after making environment changes 