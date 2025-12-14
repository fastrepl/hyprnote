const COMMANDS: &[&str] = &["get_pending_update"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
