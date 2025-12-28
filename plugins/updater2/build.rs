const COMMANDS: &[&str] = &["check", "download", "install"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
