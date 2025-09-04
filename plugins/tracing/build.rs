const COMMANDS: &[&str] = &["logs_dir"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
