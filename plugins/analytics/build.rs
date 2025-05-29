const COMMANDS: &[&str] = &["event", "set_disabled", "is_disabled", "get_queue_size", "flush_queue", "clear_queue"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
