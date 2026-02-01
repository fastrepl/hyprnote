fn main() {
    println!("cargo:rustc-env=BUNDLE_IDENTIFIER={}", bundle_identifier());

    #[cfg(target_os = "macos")]
    println!("cargo:rustc-link-arg=-fapple-link-rtlib");

    #[cfg(debug_assertions)]
    set_ort_dylib_path();

    tauri_build::build()
}

fn bundle_identifier() -> String {
    #[cfg(debug_assertions)]
    return std::env::var("BUNDLE_IDENTIFIER").unwrap_or_else(|_| "com.hyprnote.dev".to_string());
    #[cfg(not(debug_assertions))]
    return std::env::var("BUNDLE_IDENTIFIER").expect("BUNDLE_IDENTIFIER must be set");
}

#[cfg(debug_assertions)]
fn set_ort_dylib_path() {
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
