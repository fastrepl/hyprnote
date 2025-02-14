const COMMANDS: &[&str] = &["start_session", "stop_session"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
