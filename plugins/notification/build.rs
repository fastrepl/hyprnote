const COMMANDS: &[&str] = &[
    "list_applications",
    "show_notification",
    "get_event_notification",
    "set_event_notification",
    "get_detect_notification",
    "set_detect_notification",
    "start_detect_notification",
    "stop_detect_notification",
    "start_event_notification",
    "stop_event_notification",
    "get_ignored_platforms",
    "set_ignored_platforms",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
