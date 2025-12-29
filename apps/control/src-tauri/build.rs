fn main() {
    let manifest_dir = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    assert_eq!(manifest_dir.file_name().unwrap(), "src-tauri");

    let build_dir = manifest_dir.parent().unwrap().join("dist");

    if !build_dir.exists() {
        std::fs::create_dir(&build_dir).ok();
    }

    tauri_build::build();
}
