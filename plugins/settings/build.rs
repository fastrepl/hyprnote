const COMMANDS: &[&str] = &["base", "obsidian_vaults", "path", "load", "save"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
