const COMMANDS: &[&str] = &[
    "set_quit_handler",
    "reset_quit_handler",
    "list_installed_applications",
    "list_mic_using_applications",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
