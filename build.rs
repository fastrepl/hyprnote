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

            // For ONNX Runtime
            println!("cargo::rustc-env=ORT_USE_CUDA=OFF");
            println!("cargo::rustc-env=ORT_BUILD_SHARED_LIB=OFF");

            // Pass to dependencies
            println!("cargo::rerun-if-env-changed=CFLAGS");
            println!("cargo::rerun-if-env-changed=CXXFLAGS");

            // Additional debug runtime link arguments
            println!("cargo::rustc-link-arg-bins=/defaultlib:msvcrtd");
        }
    }
}
