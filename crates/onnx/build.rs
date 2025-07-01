fn main() {
    // Force debug runtime on Windows MSVC
    #[cfg(all(target_os = "windows", target_env = "msvc"))]
    {
        println!("cargo:rustc-link-arg=/nodefaultlib:msvcrt");
        println!("cargo:rustc-link-arg=/defaultlib:msvcrtd");
    }

    // https://ort.pyke.io/perf/execution-providers#coreml
    #[cfg(target_os = "macos")]
    println!("cargo:rustc-link-arg=-fapple-link-rtlib");
}
