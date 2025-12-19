const COMMANDS: &[&str] = &["export"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
