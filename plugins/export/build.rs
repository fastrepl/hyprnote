const COMMANDS: &[&str] = &["export_tiptap_json_to_md"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
