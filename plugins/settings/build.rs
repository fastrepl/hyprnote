const COMMANDS: &[&str] = &[
    "settings_base",
    "content_base",
    "change_content_base",
    "obsidian_vaults",
    "path",
    "load",
    "save",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
