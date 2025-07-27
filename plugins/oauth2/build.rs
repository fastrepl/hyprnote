const COMMANDS: &[&str] = &["get_base_url"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
