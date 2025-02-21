const COMMANDS: &[&str] = &["get_timeline", "subscribe", "start_session", "stop_session"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
