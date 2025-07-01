use std::env;
use std::process::Command;

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

            // Force all child processes to use debug runtime
            println!("cargo::rustc-env=CFLAGS=/MDd /D_DEBUG /Od");
            println!("cargo::rustc-env=CXXFLAGS=/MDd /D_DEBUG /Od");

            // Target-specific flags for cc crate
            println!("cargo::rustc-env=CC_x86_64-pc-windows-msvc=cl");
            println!("cargo::rustc-env=CXX_x86_64-pc-windows-msvc=cl");
            println!("cargo::rustc-env=CFLAGS_x86_64-pc-windows-msvc=/MDd /D_DEBUG /Od");
            println!("cargo::rustc-env=CXXFLAGS_x86_64-pc-windows-msvc=/MDd /D_DEBUG /Od");
            println!("cargo::rustc-env=CFLAGS_x86_64_pc_windows_msvc=/MDd /D_DEBUG /Od");
            println!("cargo::rustc-env=CXXFLAGS_x86_64_pc_windows_msvc=/MDd /D_DEBUG /Od");

            // Additional target flags
            println!("cargo::rustc-env=TARGET_CFLAGS=/MDd /D_DEBUG /Od");
            println!("cargo::rustc-env=TARGET_CXXFLAGS=/MDd /D_DEBUG /Od");

            // Force CMake to use debug runtime
            println!("cargo::rustc-env=CMAKE_CXX_FLAGS=/MDd /D_DEBUG");
            println!("cargo::rustc-env=CMAKE_C_FLAGS=/MDd /D_DEBUG");
            println!("cargo::rustc-env=CMAKE_CXX_FLAGS_DEBUG=/MDd /D_DEBUG /Od /Zi");
            println!("cargo::rustc-env=CMAKE_C_FLAGS_DEBUG=/MDd /D_DEBUG /Od /Zi");
            println!("cargo::rustc-env=CMAKE_CXX_FLAGS_RELEASE=/MDd /D_DEBUG /O2");
            println!("cargo::rustc-env=CMAKE_C_FLAGS_RELEASE=/MDd /D_DEBUG /O2");
            println!("cargo::rustc-env=CMAKE_MSVC_RUNTIME_LIBRARY=MultiThreadedDebugDLL");
            println!("cargo::rustc-env=CMAKE_BUILD_TYPE=Debug");

            // Global debug configuration
            println!("cargo::rustc-env=DEBUG=1");
            println!("cargo::rustc-env=NDEBUG=");
            println!("cargo::rustc-env=_DEBUG=1");
            println!("cargo::rustc-env=MSVC_RUNTIME=dynamic-debug");
            println!("cargo::rustc-env=MSVC_DEBUG=1");

            // For whisper.cpp specifically
            println!("cargo::rustc-env=WHISPER_CFLAGS=/MDd /D_DEBUG");
            println!("cargo::rustc-env=WHISPER_CXXFLAGS=/MDd /D_DEBUG");

            // Pass to dependencies
            println!("cargo::rerun-if-env-changed=CFLAGS");
            println!("cargo::rerun-if-env-changed=CXXFLAGS");

            // Additional debug runtime link arguments
            println!("cargo::rustc-link-arg-bins=/defaultlib:msvcrtd");
        }
    }
}
