const COMMANDS: &[&str] = &["event", "set_properties", "set_disabled", "is_disabled"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
