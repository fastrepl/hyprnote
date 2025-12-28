const COMMANDS: &[&str] = &["get_item", "set_item", "remove_item", "clear"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
