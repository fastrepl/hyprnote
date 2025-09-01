const COMMANDS: &[&str] = &["hi"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
