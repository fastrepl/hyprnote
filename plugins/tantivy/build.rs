const COMMANDS: &[&str] = &["search", "reindex"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
