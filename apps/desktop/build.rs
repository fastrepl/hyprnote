fn main() {
    // Set environment variables to prevent Apple Silicon mcpu issues
    if cfg!(target_arch = "aarch64") && cfg!(target_os = "macos") {
        println!("cargo:rustc-env=GGML_NATIVE=OFF");
        println!("cargo:rustc-env=CMAKE_C_FLAGS=-mcpu=apple-m1");
        println!("cargo:rustc-env=CMAKE_CXX_FLAGS=-mcpu=apple-m1");
        println!("cargo:rustc-env=CC=clang");
        println!("cargo:rustc-env=CXX=clang++");
        println!("cargo:rustc-env=CFLAGS=-mcpu=apple-m1");
        println!("cargo:rustc-env=CXXFLAGS=-mcpu=apple-m1");

        // Also set them as actual environment variables
        std::env::set_var("GGML_NATIVE", "OFF");
        std::env::set_var("CMAKE_C_FLAGS", "-mcpu=apple-m1");
        std::env::set_var("CMAKE_CXX_FLAGS", "-mcpu=apple-m1");
        std::env::set_var("CC", "clang");
        std::env::set_var("CXX", "clang++");
        std::env::set_var("CFLAGS", "-mcpu=apple-m1");
        std::env::set_var("CXXFLAGS", "-mcpu=apple-m1");

        println!("cargo:warning=Setting Apple Silicon build flags");
    }
} 