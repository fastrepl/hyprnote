const COMMANDS: &[&str] = &["set_dock_icon", "reset_dock_icon", "get_icon"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
