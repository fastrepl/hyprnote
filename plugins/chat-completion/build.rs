const COMMANDS: &[&str] = &["enhance", "create_title"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
