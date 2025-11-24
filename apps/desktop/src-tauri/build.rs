fn main() {
    #[cfg(target_os = "macos")]
    println!("cargo:rustc-link-arg=-fapple-link-rtlib");

    #[cfg(debug_assertions)]
    {
        use std::path::PathBuf;

        let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));

        let dylib_name = if cfg!(target_os = "linux") {
            "libonnxruntime.so"
        } else if cfg!(target_os = "macos") {
            "libonnxruntime.dylib"
        } else {
            ""
        };

        if !dylib_name.is_empty() {
            let dylib_path = manifest_dir.join("resources").join(dylib_name);
            println!("cargo:rustc-env=ORT_DYLIB_PATH={}", dylib_path.display());
        }
    }

    tauri_build::build()
}
