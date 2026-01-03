const COMMANDS: &[&str] = &[
    "export_json",
    "export_json_batch",
    "export_tiptap_json_to_md",
    "export_tiptap_json_to_md_batch",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
