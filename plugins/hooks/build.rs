const COMMANDS: &[&str] = &["after_listening_stopped"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
