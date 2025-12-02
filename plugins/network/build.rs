const COMMANDS: &[&str] = &["is_online"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
