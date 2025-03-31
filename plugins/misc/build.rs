const COMMANDS: &[&str] = &["get_fingerprint", "opinionated_md_to_html"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
