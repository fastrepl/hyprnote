const COMMANDS: &[&str] = &["check"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
