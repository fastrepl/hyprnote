const COMMANDS: &[&str] = &["start_session", "stop_session", "get_session_status"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
