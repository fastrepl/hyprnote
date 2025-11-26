const COMMANDS: &[&str] = &["run_batch", "parse_subtitle"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
