fn main() {
    #[cfg(debug_assertions)]
    {
        let schema = schemars::schema_for!(owhisper_config::Config);
        let out_content = serde_json::to_string_pretty(&schema).unwrap();
        let out_path = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../schema.json");
        std::fs::write(out_path, out_content).unwrap();
    }

    {
        let target_os = std::env::var("CARGO_CFG_TARGET_OS").unwrap();

        match target_os.as_str() {
            "macos" => {
                println!("cargo:rustc-cfg=feature=\"macos-default\"");
            }
            "linux" => {
                println!("cargo:rustc-cfg=feature=\"linux-default\"");
            }
            _ => {}
        }
    }
}
