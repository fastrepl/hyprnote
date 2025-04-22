const COMMANDS: &[&str] = &["get_api_base", "get_api_key"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
