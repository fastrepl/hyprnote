const COMMANDS: &[&str] = &["base"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
