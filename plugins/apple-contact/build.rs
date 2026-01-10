const COMMANDS: &[&str] = &["import"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
