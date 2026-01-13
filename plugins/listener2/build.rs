const COMMANDS: &[&str] = &[
    "run_batch",
    "parse_subtitle",
    "export_to_vtt",
    "is_supported_languages",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
