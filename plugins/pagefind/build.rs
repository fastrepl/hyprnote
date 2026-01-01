const COMMANDS: &[&str] = &["search", "index"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
