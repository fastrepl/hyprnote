const COMMANDS: &[&str] = &[
    "start_detection",
    "stop_detection",
    "list_installed_applications",
    "list_mic_using_applications",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
