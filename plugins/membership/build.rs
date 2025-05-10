const COMMANDS: &[&str] = &["refresh"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
