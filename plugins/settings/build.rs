const COMMANDS: &[&str] = &["path", "load", "save"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
