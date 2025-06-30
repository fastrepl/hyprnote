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

            // Add additional debug runtime link arguments
            println!("cargo::rustc-link-arg-bins=/defaultlib:msvcrtd");
        }
    }
}
