const COMMANDS: &[&str] = &["get_servers", "set_servers"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
