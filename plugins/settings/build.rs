const COMMANDS: &[&str] = &["load", "save"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
