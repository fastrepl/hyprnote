const COMMANDS: &[&str] = &["logs_dir", "do_log"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
