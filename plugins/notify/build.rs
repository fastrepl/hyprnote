const COMMANDS: &[&str] = &["start", "stop"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
