fn main() {
    let target_os = std::env::var("CARGO_CFG_TARGET_OS").unwrap();

    match target_os.as_str() {
        "macos" => {
            println!("cargo:rustc-cfg=feature=\"macos-default\"");
        }
        "windows" => {
            println!("cargo:rustc-cfg=feature=\"windows-default\"");
        }
        _ => {}
    }

    tauri_build::build()
}
