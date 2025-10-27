const COMMANDS: &[&str] = &[
    "list_applications",
    "show_notification",
    "start_detect_notification",
    "stop_detect_notification",
    "start_event_notification",
    "stop_event_notification",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
