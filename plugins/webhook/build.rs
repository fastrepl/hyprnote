const COMMANDS: &[&str] = &["todo"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
