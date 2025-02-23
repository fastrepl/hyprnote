const COMMANDS: &[&str] = &["fetch"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
