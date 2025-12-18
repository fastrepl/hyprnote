const COMMANDS: &[&str] = &["get_pending_update", "install_from_cached"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
