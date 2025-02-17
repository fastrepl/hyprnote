const COMMANDS: &[&str] = &["stop_server", "load_model", "unload_model"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
