const COMMANDS: &[&str] = &["base", "obsidian_vaults", "sanitize"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
