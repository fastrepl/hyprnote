const COMMANDS: &[&str] = &["start_detection", "stop_detection"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
