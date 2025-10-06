const COMMANDS: &[&str] = &["render"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
