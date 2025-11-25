const COMMANDS: &[&str] = &["ping", "get_available_deep_links"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
