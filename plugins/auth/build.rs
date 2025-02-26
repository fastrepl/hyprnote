const COMMANDS: &[&str] = &["start_oauth_server", "cancel_oauth_server"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
