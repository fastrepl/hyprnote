const COMMANDS: &[&str] = &["execute_local", "execute_cloud"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
