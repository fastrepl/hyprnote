use std::env;

fn main() {
    // Force debug runtime for all dependencies on Windows MSVC
    if env::var("TARGET").map_or(false, |s| s.contains("windows-msvc")) {
        // Always use debug runtime in debug builds
        if env::var("PROFILE").map_or(false, |p| p == "debug")
            || env::var("CXXFLAGS").map_or(false, |s| s.contains("/MDd"))
        {
            // Don't link the default CRT
            println!("cargo::rustc-link-arg=/nodefaultlib:msvcrt");
            // Link the debug CRT instead
            println!("cargo::rustc-link-arg=/defaultlib:msvcrtd");

            // Set environment variables for C/C++ compilation
            println!("cargo::rustc-env=CFLAGS=/MDd");
            println!("cargo::rustc-env=CXXFLAGS=/MDd");

            // Force CMake to use debug runtime
            println!("cargo::rustc-env=CMAKE_CXX_FLAGS=/MDd");
            println!("cargo::rustc-env=CMAKE_C_FLAGS=/MDd");
            println!("cargo::rustc-env=CMAKE_CXX_FLAGS_DEBUG=/MDd /Od /Zi");
            println!("cargo::rustc-env=CMAKE_C_FLAGS_DEBUG=/MDd /Od /Zi");
            println!("cargo::rustc-env=CMAKE_CXX_FLAGS_RELEASE=/MDd /O2");
            println!("cargo::rustc-env=CMAKE_C_FLAGS_RELEASE=/MDd /O2");
            println!("cargo::rustc-env=CMAKE_MSVC_RUNTIME_LIBRARY=MultiThreadedDebugDLL");
            println!("cargo::rustc-env=CMAKE_BUILD_TYPE=Debug");

            // For whisper.cpp specifically
            println!("cargo::rustc-env=WHISPER_CFLAGS=/MDd");
            println!("cargo::rustc-env=WHISPER_CXXFLAGS=/MDd");

            // For ONNX Runtime - comprehensive settings
            println!("cargo::rustc-env=ORT_USE_CUDA=OFF");
            println!("cargo::rustc-env=ORT_BUILD_SHARED_LIB=OFF");
            println!("cargo::rustc-env=ORT_STRATEGY=compile");
            println!("cargo::rustc-env=ORT_DEBUG=1");
            println!("cargo::rustc-env=ORT_PREFER_DYNAMIC_LINK=ON");
            println!("cargo::rustc-env=ORT_CMAKE_EXTRA_ARGS=-DCMAKE_MSVC_RUNTIME_LIBRARY=MultiThreadedDebugDLL -DCMAKE_CXX_FLAGS=/MDd -DCMAKE_C_FLAGS=/MDd");

            // Force compilation from source
            println!("cargo::rustc-env=ORT_LIB_LOCATION=");
            println!("cargo::rustc-env=ORT_INCLUDE_DIR=");

            // Pass to dependencies
            println!("cargo::rerun-if-env-changed=CFLAGS");
            println!("cargo::rerun-if-env-changed=CXXFLAGS");
            println!("cargo::rerun-if-env-changed=ORT_STRATEGY");

            // Additional debug runtime link arguments
            println!("cargo::rustc-link-arg-bins=/defaultlib:msvcrtd");
        }
    }
}
