const COMMANDS: &[&str] = &[
    "set_quit_handler",
    "reset_quit_handler",
    "list_installed_applications",
    "list_mic_using_applications",
    "set_respect_do_not_disturb",
    "set_ignored_bundle_ids",
    "list_default_ignored_bundle_ids",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
