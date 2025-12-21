const COMMANDS: &[&str] = &[
    "set_dock_icon",
    "reset_dock_icon",
    "get_available_icons",
    "is_christmas_season",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
