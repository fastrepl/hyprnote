#!/bin/bash

# Function to patch CMakeLists.txt files
patch_cmake_file() {
    local file="$1"
    if [[ -f "$file" ]]; then
        echo "Patching $file for Apple Silicon..."
        
        # Replace the problematic ARM feature detection logic
        sed -i '' 's/if (GGML_NATIVE)/if (GGML_NATIVE AND NOT APPLE)/' "$file"
        
        # Add Apple Silicon specific handling
        sed -i '' '/if (CMAKE_OSX_ARCHITECTURES.*STREQUAL "arm64"/a\
        # Apple Silicon fix - skip native optimization\
        if (APPLE AND CMAKE_SYSTEM_PROCESSOR MATCHES "^(aarch64|arm64|ARM64)$")\
            message(STATUS "Apple Silicon detected - using safe flags")\
            list(APPEND ARCH_FLAGS -mcpu=apple-m1)\
        elif (GGML_NATIVE)
' "$file"
        
        echo "Patched $file successfully"
    fi
}

# Monitor for CMakeLists.txt files and patch them
while true; do
    # Find all CMakeLists.txt files in whisper-rs build directories
    find src-tauri/target -name "whisper-rs-sys-*" -type d 2>/dev/null | while read -r dir; do
        if [[ -d "$dir" ]]; then
            find "$dir" -name "CMakeLists.txt" -path "*/ggml-cpu/*" | while read -r cmake_file; do
                if [[ -f "$cmake_file" ]] && ! grep -q "Apple Silicon fix" "$cmake_file"; then
                    patch_cmake_file "$cmake_file"
                fi
            done
        fi
    done
    sleep 1
done 