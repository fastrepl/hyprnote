const COMMANDS: &[&str] = &[
    "get_event_notification",
    "set_event_notification",
    "get_detect_notification",
    "set_detect_notification",
    "open_notification_settings",
    "request_notification_permission",
    "check_notification_permission",
    "start_detect_notification",
    "stop_detect_notification",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
