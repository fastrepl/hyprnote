fn main() {
    let schema = schemars::schema_for!(owhisper_config::Config);
    let out_content = serde_json::to_string_pretty(&schema).unwrap();
    let out_path = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../schema.json");
    std::fs::write(out_path, out_content).unwrap();
}
