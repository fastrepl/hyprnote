const COMMANDS: &[&str] = &["build_index", "get_bundle_path", "clear_index"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
