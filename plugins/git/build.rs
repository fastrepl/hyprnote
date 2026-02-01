const COMMANDS: &[&str] = &["init", "add", "commit", "status"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
