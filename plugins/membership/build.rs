const COMMANDS: &[&str] = &["refresh", "get_subscription"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
