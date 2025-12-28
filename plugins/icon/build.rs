const COMMANDS: &[&str] = &["set_dock_icon", "reset_dock_icon"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
